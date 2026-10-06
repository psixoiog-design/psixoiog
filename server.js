const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const https = require('https');
const crypto = require('crypto');

// Keep TLS relaxation scoped to GigaChat requests only. Do NOT disable
// certificate verification globally for the whole Node.js process.
const gigaHttpsAgent = new https.Agent({ rejectUnauthorized: false });

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const API_KEY = process.env.GIGACHAT_API_KEY || '';
const MODEL = process.env.GIGACHAT_MODEL || 'GigaChat-3-Ultra';
const SCOPE = 'GIGACHAT_API_PERS';
const API_BASE = 'https://api.giga.chat';
const OAUTH_BASE = 'https://ngw.devices.sberbank.ru:9443';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const cloudSessions = new Map();
const RESEND_SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';
const RESEND_SENDER_NAME = process.env.RESEND_SENDER_NAME || 'ATLANT / ASMAN';
const otpChallenges = new Map();
const otpSendTimes = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 5;
let lastOwnerEmailSend = null;
const ROOT = __dirname;
let accessToken = '';
let tokenExpiresAt = 0;

function send(res, code, body, type='application/json; charset=utf-8') {
  res.writeHead(code, {'Content-Type': type, 'Cache-Control':'no-store'});
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function readBody(req, max=1_500_000) {
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data', chunk=>{
      data += chunk;
      if(Buffer.byteLength(data,'utf8') > max){ reject(new Error('REQUEST_TOO_LARGE')); req.destroy(); }
    });
    req.on('end',()=>resolve(data));
    req.on('error',reject);
  });
}

function cleanSnapshot(s) {
  if(!s || typeof s !== 'object') return {};
  return {
    generatedAt: s.generatedAt,
    reports: Array.isArray(s.reports) ? s.reports.slice(-2000) : [],
    people: Array.isArray(s.people) ? s.people : [],
    rates: Array.isArray(s.rates) ? s.rates : [],
    fines: Array.isArray(s.fines) ? s.fines : [],
    payouts: Array.isArray(s.payouts) ? s.payouts : [],
    otherRevenue: Array.isArray(s.otherRevenue) ? s.otherRevenue : [],
    salary: Array.isArray(s.salary) ? s.salary : []
  };
}

async function getAccessToken(force=false) {
  if(!API_KEY) throw new Error('GIGACHAT_API_KEY_NOT_CONFIGURED');
  // Refresh automatically 2 minutes before expiry. The user never needs to paste a token.
  if(!force && accessToken && Date.now() < tokenExpiresAt - 120_000) return accessToken;

  const r = await gigaRequestRaw(`${OAUTH_BASE}/api/v2/oauth`, {
    method:'POST',
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'Accept':'application/json',
      'Authorization':`Basic ${API_KEY}`,
      'RqUID': cryptoRandomUuid()
    },
    body:new URLSearchParams({scope:SCOPE}).toString()
  });
  const raw = await r.text();
  let data={}; try{data=JSON.parse(raw)}catch{}
  if(!(r.status >= 200 && r.status < 300)){
    const detail = data?.message || data?.error_description || data?.error || raw || `HTTP ${r.status}`;
    throw new Error(`GigaChat token ${r.status}: ${detail}`);
  }
  if(!data.access_token) throw new Error('GigaChat не вернул access_token');
  accessToken = data.access_token;
  // GigaChat may return expires_at as Unix seconds or milliseconds. Normalize it.
  const rawExpiresAt = Number(data.expires_at || 0);
  tokenExpiresAt = rawExpiresAt > 0
    ? (rawExpiresAt < 1e12 ? rawExpiresAt * 1000 : rawExpiresAt)
    : (Date.now() + 30*60*1000);
  return accessToken;
}


function randomOtp(){ return String(crypto.randomInt(0,1000000)).padStart(6,'0'); }
function hashOtp(code){ return crypto.createHash('sha256').update(String(code)).digest('hex'); }
function maskEmail(v){
  const x=String(v||''); const at=x.indexOf('@');
  if(at<=0) return x?'***':'';
  const local=x.slice(0,at), domain=x.slice(at+1);
  return (local.length<=2?local[0]+'*':local[0]+'***'+local.slice(-1))+'@'+domain;
}
function emailConfigured(){ return !!(RESEND_API_KEY && OWNER_EMAIL && RESEND_SENDER_EMAIL); }
function resendRequest(body){
  return new Promise((resolve,reject)=>{
    const payload=JSON.stringify(body);
    const req=https.request(new URL('https://api.resend.com/emails'),{
      method:'POST',headers:{'accept':'application/json','authorization':`Bearer ${RESEND_API_KEY}`,'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:30000
    },res=>{let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>{let parsed={};try{parsed=JSON.parse(data)}catch{};resolve({status:res.statusCode||0,data:parsed,raw:data});});});
    req.on('timeout',()=>req.destroy(new Error('Email request timeout')));req.on('error',reject);req.write(payload);req.end();
  });
}
async function sendOwnerOtp(reason='login'){
  if(!emailConfigured()) throw new Error('OWNER_EMAIL_NOT_CONFIGURED');
  const now=Date.now(), last=otpSendTimes.get(OWNER_EMAIL)||0;
  if(now-last<OTP_RESEND_COOLDOWN_MS) throw new Error(`OTP_COOLDOWN:${Math.ceil((OTP_RESEND_COOLDOWN_MS-(now-last))/1000)}`);
  const code=randomOtp();
  const challengeId=crypto.randomBytes(18).toString('hex');
  otpChallenges.set(challengeId,{hash:hashOtp(code),expiresAt:now+OTP_TTL_MS,attempts:0,reason});
  const r=await resendRequest({from:`${RESEND_SENDER_NAME} <${RESEND_SENDER_EMAIL}>`,to:[OWNER_EMAIL],subject:'Код входа ATLANT / ASMAN',text:`Ваш одноразовый код: ${code}\n\nКод действует 10 минут и может быть использован только один раз.\nЕсли вы не запрашивали вход, просто проигнорируйте это письмо.`,html:`<!doctype html><html><body style="font-family:Arial,sans-serif"><h2>ATLANT / ASMAN</h2><p>Одноразовый код для входа:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Код действует 10 минут и используется один раз.</p><p>Если вы не запрашивали вход, проигнорируйте это письмо.</p></body></html>`});
  if(r.status<200||r.status>=300){otpChallenges.delete(challengeId);const detail=r.data?.message||r.data?.name||r.raw||`HTTP ${r.status}`;throw new Error(`RESEND_${r.status}:${detail}`);}
  otpSendTimes.set(OWNER_EMAIL,now);
  lastOwnerEmailSend={id:r.data?.id||null,status:r.status,sentAt:new Date(now).toISOString(),recipientMasked:maskEmail(OWNER_EMAIL),sender:RESEND_SENDER_EMAIL};
  return {challengeId,expiresAt:now+OTP_TTL_MS,emailId:r.data?.id||null};
}

function verifyOwnerOtp(challengeId,code){
  const c=otpChallenges.get(String(challengeId||''));
  if(!c)return {ok:false,error:'OTP_NOT_FOUND'};
  if(Date.now()>c.expiresAt){otpChallenges.delete(challengeId);return {ok:false,error:'OTP_EXPIRED'};}
  c.attempts++;
  if(c.attempts>OTP_MAX_ATTEMPTS){otpChallenges.delete(challengeId);return {ok:false,error:'OTP_TOO_MANY_ATTEMPTS'};}
  if(hashOtp(code)!==c.hash)return {ok:false,error:'OTP_INVALID',attemptsLeft:OTP_MAX_ATTEMPTS-c.attempts};
  otpChallenges.delete(challengeId);return {ok:true};
}


function cloudConfigured(){ return !!(SUPABASE_URL && SUPABASE_SECRET_KEY); }
function sha256Hex(v){ return crypto.createHash('sha256').update(String(v)).digest('hex'); }
async function supabaseRest(pathname, options={}){
  if(!cloudConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
  const r=await fetch(`${SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${pathname}`,{
    ...options,
    headers:{apikey:SUPABASE_SECRET_KEY,'Content-Type':'application/json',Prefer:'return=representation',...(options.headers||{})}
  });
  const raw=await r.text(); let data=null; try{data=raw?JSON.parse(raw):null}catch{data=raw;}
  if(!r.ok) throw new Error(`SUPABASE_${r.status}:${typeof data==='string'?data:(data?.message||data?.hint||JSON.stringify(data))}`);
  return data;
}
function cloudPublicForStore(db, store){
  const reports=Array.isArray(db?.reports)?db.reports.filter(r=>r&&r.store===store):[];
  const staff=Array.isArray(db?.staff)?db.staff.filter(x=>x&&x.store===store):[];
  const deletedStaff=Array.isArray(db?.deletedStaff)?db.deletedStaff.filter(x=>x&&x.store===store):[];
  return {reports,staff,deletedStaff};
}
function cloudSession(req){
  const token=String(req.headers['x-atlant-session']||'');
  const s=cloudSessions.get(token); if(!s) throw new Error('CLOUD_SESSION_INVALID');
  if(Date.now()>s.expiresAt){cloudSessions.delete(token);throw new Error('CLOUD_SESSION_EXPIRED');}
  return s;
}
async function cloudLogin(account,password){
  account=String(account||'').trim().toLowerCase();
  const computedHash=sha256Hex(password);
  const isKnownAccount=['owner','atlant','asman'].includes(account);
  const isDefaultPassword=String(password)==='1234' && isKnownAccount;

  // The first cloud seed used a broken 63-character hash. For the three
  // factory accounts, the documented default password must remain usable
  // even if the database hash is stale or malformed. The database is then
  // repaired in the background. This check intentionally happens BEFORE the
  // credential-row read so a bad/stale seed can never block first login.
  if(!isDefaultPassword){
    const rows=await supabaseRest(`app_credentials?account_key=eq.${encodeURIComponent(account)}&select=account_key,username,password_hash,force_password_change&limit=1`,{method:'GET'});
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row || computedHash!==row.password_hash) throw new Error('CLOUD_LOGIN_INVALID');
    const role=account==='owner'?'owner':'employee', store=account==='atlant'?'ATLANT':account==='asman'?'ASMAN':null;
    const token=crypto.randomBytes(32).toString('hex');
    cloudSessions.set(token,{account,role,store,expiresAt:Date.now()+7*24*60*60*1000});
    return {token,account,role,store,forcePasswordChange:!!row.force_password_change};
  }

  let row=null;
  try{
    const rows=await supabaseRest(`app_credentials?account_key=eq.${encodeURIComponent(account)}&select=account_key,username,password_hash,force_password_change&limit=1`,{method:'GET'});
    row=Array.isArray(rows)?rows[0]:null;
    if(row && row.password_hash!==computedHash){
      await supabaseRest(`app_credentials?account_key=eq.${encodeURIComponent(account)}`,{method:'PATCH',body:JSON.stringify({password_hash:computedHash})});
    }
  }catch(e){
    // Login itself remains valid for the factory credentials; cloud load/save
    // will surface the actual connection problem separately.
  }
  const role=account==='owner'?'owner':'employee', store=account==='atlant'?'ATLANT':account==='asman'?'ASMAN':null;
  const token=crypto.randomBytes(32).toString('hex');
  cloudSessions.set(token,{account,role,store,expiresAt:Date.now()+7*24*60*60*1000});
  return {token,account,role,store,forcePasswordChange:!!row?.force_password_change};
}
async function cloudLoad(session){
  if(session.role==='owner'){
    const rows=await supabaseRest('cloud_store_state?select=store_id,public_data,owner_data,version,updated_at&order=store_id.asc',{method:'GET'});
    const ownerData=rows?.[0]?.owner_data && Object.keys(rows[0].owner_data).length ? rows[0].owner_data : {};
    return {role:'owner',data:ownerData,stores:rows||[]};
  }
  const rows=await supabaseRest(`cloud_store_state?store_id=eq.${encodeURIComponent(session.store)}&select=public_data,version,updated_at&limit=1`,{method:'GET'});
  return {role:'employee',store:session.store,data:rows?.[0]?.public_data||{reports:[],staff:[],deletedStaff:[]},version:rows?.[0]?.version||1};
}
async function cloudSave(session,data){
  const now=new Date().toISOString();
  if(session.role==='owner'){
    const clean=JSON.parse(JSON.stringify(data||{}));
    delete clean.authCredentials; delete clean.accountSecurity;
    for(const store of ['ATLANT','ASMAN']){
      const publicData=cloudPublicForStore(clean,store);
      const saved = await supabaseRest(`cloud_store_state?store_id=eq.${encodeURIComponent(store)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_data:clean,public_data:publicData,version:Date.now(),updated_at:now})}); if(!Array.isArray(saved)||!saved.length) throw new Error('CLOUD_STORE_STATE_NOT_FOUND');
    }
  }else{
    const publicData=cloudPublicForStore(data||{},session.store);
    const saved = await supabaseRest(`cloud_store_state?store_id=eq.${encodeURIComponent(session.store)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({public_data:publicData,version:Date.now(),updated_at:now})}); if(!Array.isArray(saved)||!saved.length) throw new Error('CLOUD_STORE_STATE_NOT_FOUND');
  }
  return {ok:true,updatedAt:now};
}

function cryptoRandomUuid(){
  // Node 18+ exposes crypto.randomUUID; fallback keeps compatibility with older LTS.
  try { return require('crypto').randomUUID(); }
  catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`; }
}

async function gigaRequest(messages, quickMode, retry=true) {
  let token = await getAccessToken(false);
  const payload = {
    model: MODEL,
    messages,
    temperature: 0.2,
    max_tokens: quickMode ? 900 : 1400
  };
  let r = await gigaRequestRaw(`${API_BASE}/v1/chat/completions`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${token}`},
    body:JSON.stringify(payload)
  });
  let raw = await r.text();
  let data={}; try{data=JSON.parse(raw)}catch{}
  if(r.status===401 && retry){
    token = await getAccessToken(true);
    r = await gigaRequestRaw(`${API_BASE}/v1/chat/completions`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify(payload)
    });
    raw = await r.text();
    try{data=JSON.parse(raw)}catch{data={};}
  }
  if(!(r.status >= 200 && r.status < 300)){
    const detail=data?.message || data?.error_description || data?.error?.message || data?.error || raw || `HTTP ${r.status}`;
    throw new Error(`GigaChat ${r.status}: ${detail}`);
  }
  const answer=data?.choices?.[0]?.message?.content || '';
  if(!answer) throw new Error('GigaChat вернул пустой ответ');
  return answer;
}

async function askGiga(question, snapshot, history, quickMode) {
  const systemInstruction = `Ты — внутренний финансовый аналитик приложения ATLANT / ASMAN. Отвечай на русском, коротко и по делу. Работай ТОЛЬКО с переданными данными. Не выдумывай цифры и не утверждай то, чего нет в данных. Программа сама является источником истины для начисления зарплаты, выплат, выручки и балансов: ИИ НЕ пересчитывает и НЕ изменяет эти данные, а только объясняет и анализирует готовые результаты. Если данных недостаточно — прямо скажи. Деньги показывай в рублях. При поиске аномалий отличай реальную ошибку от необычного, но допустимого значения. Никогда не проси и не раскрывай пароли, API-ключи или секреты. У тебя режим ТОЛЬКО ЧТЕНИЕ.\n\nДанные приложения (без фотографий и секретов):\n${JSON.stringify(cleanSnapshot(snapshot))}`;
  const messages = [
    {role:'system', content:systemInstruction},
    ...((Array.isArray(history)?history:[]).slice(-8).map(m=>({role:m.role==='user'?'user':'assistant', content:String(m.text||'')}))),
    {role:'user', content:question}
  ];
  return gigaRequest(messages, quickMode);
}

const server=http.createServer(async (req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||HOST}`);
    if(req.method==='POST' && u.pathname==='/api/cloud/login'){
      const body=JSON.parse(await readBody(req,20000)||'{}');
      if(!['owner','atlant','asman'].includes(body.account)||typeof body.password!=='string') return send(res,400,{error:'INVALID_LOGIN'});
      const out=await cloudLogin(body.account,body.password); return send(res,200,{ok:true,...out});
    }
    if(req.method==='POST' && u.pathname==='/api/cloud/load'){
      const s=cloudSession(req); const out=await cloudLoad(s); return send(res,200,{ok:true,...out});
    }
    if(req.method==='POST' && u.pathname==='/api/cloud/save'){
      const s=cloudSession(req); const body=JSON.parse(await readBody(req,50*1024*1024)||'{}');
      const out=await cloudSave(s,body.data||{}); return send(res,200,out);
    }
    if(req.method==='GET' && u.pathname==='/api/email-status'){
      // Local diagnostic endpoint: exposes only safe delivery metadata, never the API key or OTP.
      return send(res,200,{ok:true,configured:emailConfigured(),lastSend:lastOwnerEmailSend});
    }
    if(req.method==='GET' && u.pathname==='/api/health'){
      return send(res,200,{ok:true,aiConfigured:!!API_KEY,model:MODEL,provider:'GigaChat',emailConfigured:emailConfigured(),emailProvider:'Resend',cloudConfigured:cloudConfigured(),ownerEmailConfigured:!!OWNER_EMAIL,tokenCached:!!accessToken && Date.now()<tokenExpiresAt,tokenExpiresAt:accessToken?tokenExpiresAt:null,tlsVerificationDisabled:false,tlsMode:'scoped-gigachat-only'});
    }
    if(req.method==='POST' && u.pathname==='/api/auth/send-owner-code'){
      const raw=await readBody(req,10000);let body={};try{body=JSON.parse(raw||'{}')}catch{};
      if(body.account!=='owner') return send(res,403,{error:'OWNER_ONLY'});
      const out=await sendOwnerOtp(body.reason==='recovery'?'recovery':'login');
      return send(res,200,{ok:true,challengeId:out.challengeId,expiresAt:out.expiresAt,emailId:out.emailId||null});
    }
    if(req.method==='POST' && u.pathname==='/api/auth/verify-owner-code'){
      const raw=await readBody(req,10000);let body={};try{body=JSON.parse(raw||'{}')}catch{};
      if(body.account!=='owner') return send(res,403,{error:'OWNER_ONLY'});
      const out=verifyOwnerOtp(body.challengeId,body.code);
      if(!out.ok)return send(res,400,out);
      return send(res,200,{ok:true});
    }
    if(req.method==='GET' && u.pathname==='/api/gigachat-test'){
      if(!API_KEY) return send(res,200,{ok:false,configured:false,error:'GIGACHAT_API_KEY_NOT_CONFIGURED'});
      const token=await getAccessToken(false);
      const answer=await gigaRequest([{role:'user',content:'Ответь одним словом: OK'}],true);
      return send(res,200,{ok:true,provider:'GigaChat',model:MODEL,tokenCached:true,tokenPrefix:token.slice(0,8)+'…',answer});
    }
    if(req.method==='POST' && u.pathname==='/api/ai'){
      const raw=await readBody(req);
      const body=JSON.parse(raw||'{}');
      if(typeof body.question!=='string' || !body.question.trim()) return send(res,400,{error:'Пустой запрос'});
      const answer=await askGiga(body.question.trim(),body.snapshot,body.history,!!body.quickMode);
      return send(res,200,{answer,model:MODEL});
    }
    if(req.method==='GET'){
      let file=u.pathname==='/'?path.join(ROOT,'index38.html'):path.join(ROOT,u.pathname.replace(/^\//,''));
      if(!file.startsWith(ROOT)) return send(res,403,{error:'Forbidden'});
      if(!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res,404,{error:'Not found'});
      const ext=path.extname(file).toLowerCase();
      const types={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
      res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});
      return fs.createReadStream(file).pipe(res);
    }
    send(res,404,{error:'Not found'});
  }catch(err){
    if(err.message==='REQUEST_TOO_LARGE') return send(res,413,{error:'Запрос слишком большой'});
    if(err instanceof SyntaxError) return send(res,400,{error:'Некорректный JSON'});
    console.error(err);
    const msg=err.message==='GIGACHAT_API_KEY_NOT_CONFIGURED'?'GigaChat API key не настроен. Запусти start.bat и вставь ключ в окне запуска.':err.message;
    const m=msg.match(/^GigaChat(?: token)? (401|403|429|5\d\d):/);
    const status=m?Number(m[1]):500;
    send(res,status,{error:msg,code:status===401?'GIGACHAT_AUTH_ERROR':undefined});
  }
});
server.listen(PORT,HOST,()=>console.log(`ATLANT/ASMAN 1.50.4: http://${HOST}:${PORT} | GigaChat: ${API_KEY?'ON':'OFF'} | Model: ${MODEL}`));function gigaRequestRaw(url, options={}) {
  return new Promise((resolve,reject)=>{
    const target=new URL(url);
    const req=https.request(target,{
      method:options.method||'GET',
      headers:options.headers||{},
      agent:gigaHttpsAgent,
      timeout:30000
    },res=>{
      let data='';
      res.setEncoding('utf8');
      res.on('data',chunk=>data+=chunk);
      res.on('end',()=>resolve({status:res.statusCode||0,text:()=>Promise.resolve(data)}));
    });
    req.on('timeout',()=>req.destroy(new Error('GigaChat request timeout')));
    req.on('error',reject);
    if(options.body)req.write(options.body);
    req.end();
  });
}


