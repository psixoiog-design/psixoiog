
const employees={ATLANT:["Владислав","Вадим","Жига","Александр","Султан"],ASMAN:["Умид","Дима"]};

const importedRateHistory=[
 {employee:"Вадим",store:"ATLANT",date:"2026-01-01",pct:3,fixed:500},
 {employee:"Вадим",store:"ATLANT",date:"2026-02-20",pct:3,fixed:0},
 {employee:"Вадим",store:"ATLANT",date:"2026-02-23",pct:3,fixed:500},
 {employee:"Султан",store:"ASMAN",date:"2026-06-21",pct:2,fixed:500},
 {employee:"Александр",store:"ATLANT",date:"2026-07-04",pct:2,fixed:0},
 {employee:"Владислав",store:"ATLANT",date:"2026-07-11",pct:2,fixed:0},
 {employee:"Вадим",store:"ATLANT",date:"2026-07-04",pct:2,fixed:500},
 {employee:"Александр",store:"ATLANT",date:"2026-07-04",pct:2,fixed:0},
 {employee:"Вадим",store:"ATLANT",date:"2026-07-13",pct:3,fixed:0},
 {employee:"Султан",store:"ASMAN",date:"2026-07-20",pct:3,fixed:500},
 {employee:"Владислав",store:"ATLANT",date:"2026-07-21",pct:2,fixed:1000},
 {employee:"Александр",store:"ATLANT",date:"2026-07-23",pct:2,fixed:1000},
 {employee:"Умид",store:"ASMAN",date:"2026-07-25",pct:2,fixed:500},
 {employee:"Дима",store:"ASMAN",date:"2026-07-29",pct:2,fixed:500},
 {employee:"Султан",store:"ATLANT",date:"2026-07-31",pct:2,fixed:1000},
 {employee:"Умид",store:"ASMAN",date:"2026-08-03",pct:3,fixed:0},
 {employee:"Дима",store:"ASMAN",date:"2026-08-03",pct:3,fixed:0},
 {employee:"Жига",store:"ATLANT",date:"2026-07-31",pct:2,fixed:0},
 {employee:"Умид",store:"ASMAN",date:"2026-08-17",pct:3,fixed:500},
 {employee:"Дима",store:"ASMAN",date:"2026-08-17",pct:3,fixed:500}
];

let db=(()=>{  const empty={reports:[],fines:[],payouts:[],rates:[],otherRevenue:[]};  try{    const raw=localStorage.getItem("atl_as_v1");    if(!raw)return empty;    const parsed=JSON.parse(raw);    return parsed&&typeof parsed==="object"?{...empty,...parsed}:empty;  }catch(err){    console.warn("ATLANT/ASMAN: повреждённые локальные данные, начинаем с безопасной структуры.",err);    return empty;  }})();if(!Array.isArray(db.reports))db.reports=[];if(!Array.isArray(db.fines))db.fines=[];if(!Array.isArray(db.payouts))db.payouts=[];if(!Array.isArray(db.rates))db.rates=[];if(!Array.isArray(db.otherRevenue))db.otherRevenue=[];if(!db.rates.length){db.rates=importedRateHistory.map(x=>({...x}));}else if(!db.rates.some(x=>x.employee==="Жига")){db.rates=[...importedRateHistory,...db.rates];}db.reports=db.reports.filter(r=>r&&typeof r==="object").map(r=>({...r,staff:Array.isArray(r.staff)?r.staff:[],photo:r.photo??null,photos:Array.isArray(r.photos)?r.photos.slice(0,3):(r.photo?[r.photo]:[]),revenue:Number.isFinite(Number(r.revenue))?Number(r.revenue):r.revenue,terminal:Number.isFinite(Number(r.terminal))?Number(r.terminal):0,payout:Number.isFinite(Number(r.payout))?Number(r.payout):0}));try{localStorage.setItem("atl_as_v1",JSON.stringify(db))}catch(err){console.warn("ATLANT/ASMAN: localStorage недоступен",err)}
let role="";
let salaryYear=new Date().getFullYear();

// v1.19 data model: active/archived staff, payout audit trail and login audit.
if(!Array.isArray(db.staff)) db.staff=[{name:"Владислав",store:"ATLANT"},{name:"Вадим",store:"ATLANT"},{name:"Жига",store:"ATLANT"},{name:"Александр",store:"ATLANT"},{name:"Султан",store:"ATLANT"},{name:"Умид",store:"ASMAN"},{name:"Дима",store:"ASMAN"}];
if(!Array.isArray(db.deletedStaff)) db.deletedStaff=[];
if(!Array.isArray(db.audit)) db.audit=[];
if(!Array.isArray(db.payoutHistory)) db.payoutHistory=[];
if(!db.accountSecurity || typeof db.accountSecurity!=="object") db.accountSecurity={};
["owner","atlant","asman"].forEach(a=>{if(!db.accountSecurity[a]||typeof db.accountSecurity[a]!=="object")db.accountSecurity[a]={failedAttempts:0,locked:false,lockedAt:null,unlockedAt:null}});
if(!db.authCredentials || typeof db.authCredentials!=="object") db.authCredentials={};
const defaultCredentialHashes={owner:"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",atlant:"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",asman:"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"};
[{id:"owner",username:"owner"},{id:"atlant",username:"atlant"},{id:"asman",username:"asman"}].forEach(a=>{if(!db.authCredentials[a.id]||typeof db.authCredentials[a.id]!=="object")db.authCredentials[a.id]={username:a.username,passwordHash:defaultCredentialHashes[a.id]};});
if(!db.settings || typeof db.settings!=="object") db.settings={};

db.payouts=db.payouts.map(p=>({...p,voided:!!p.voided}));
const findEmployeeStore=(name)=>{const a=db.staff.filter(x=>x.name===name),d=db.deletedStaff.filter(x=>x.name===name);return a.length===1?a[0].store:(d.length===1?d[0].store:"")};
db.payouts=db.payouts.map(p=>({...p,store:p.store||findEmployeeStore(p.employee)}));
db.fines=db.fines.map(f=>({...f,voided:!!f.voided,store:f.store||findEmployeeStore(f.employee)}));
// Normalize legacy rate records that did not store the employee's shop.
// If the employee belongs to exactly one shop, bind the historical rate to that shop.
db.rates=db.rates.map(r=>({...r,store:r.store||findEmployeeStore(r.employee)}));
const rateKey=x=>[x.employee,x.store||"",x.date,x.pct,x.fixed].join("|");
const existingRateKeys=new Set(db.rates.map(rateKey));
for(const seed of importedRateHistory){if(!existingRateKeys.has(rateKey(seed))){db.rates.push({...seed,id:Date.now()+Math.random()});existingRateKeys.add(rateKey(seed));}}

const money=n=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(n||0);

// Photo handling: the file input itself is not stored in localStorage. We convert
// the selected image to a data URL first, then save that data URL in the report.
// This fixes the previous 1.20 bug where previewNewPhotoV13() called a missing
// compressImage() function, so r_preview.dataset.data stayed empty.
function compressImage(file, callback){
  if(!file || !file.type || !file.type.startsWith("image/")){
    alert("Выбери файл изображения (JPG, PNG, WEBP и т.п.)");
    return;
  }
  const reader=new FileReader();
  reader.onerror=()=>alert("Не удалось прочитать фотографию. Попробуй выбрать её ещё раз.");
  reader.onload=()=>{
    const src=reader.result;
    const img=new Image();
    img.onload=()=>{
      try{
        const maxSide=1800;
        const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
        const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
        const h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
        const canvas=document.createElement("canvas");
        canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext("2d");
        if(!ctx){ callback(src); return; }
        ctx.drawImage(img,0,0,w,h);
        callback(canvas.toDataURL("image/jpeg",0.82));
      }catch(err){
        console.warn("ATLANT/ASMAN: не удалось сжать фото, сохраняем оригинал",err);
        callback(src);
      }
    };
    img.onerror=()=>callback(src);
    img.src=src;
  };
  reader.readAsDataURL(file);
}

const save=()=>{try{localStorage.setItem("atl_as_v1",JSON.stringify(db));return true}catch(err){console.error("ATLANT/ASMAN: не удалось сохранить данные",err);alert("Браузер запретил локальное сохранение данных. Откройте сайт в обычном браузере и разрешите хранение данных.");return false}};
const stores=()=>role==="owner"?["ATLANT","ASMAN"]:[role==="atlant"?"ATLANT":"ASMAN"];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

const clientContext=()=>({userAgent:navigator.userAgent||"",platform:navigator.platform||"",language:navigator.language||"",screen:(screen&&screen.width&&screen.height)?`${screen.width}x${screen.height}`:""});
function auditSafeValue(v,depth=0){if(depth>4)return "[nested]";if(Array.isArray(v)){if(v.length>20)return `[array:${v.length}]`;return v.map(x=>auditSafeValue(x,depth+1));}if(v&&typeof v==="object"){const o={};for(const [k,x] of Object.entries(v)){if(k==="photo"||k==="photos"){const arr=Array.isArray(x)?x:(x?[x]:[]);o[k]=`[${arr.length} photo${arr.length===1?"":"s"}]`;continue;}o[k]=auditSafeValue(x,depth+1);}return o;}if(typeof v==="string"&&v.length>2000)return `[text:${v.length} chars]`;return v;}
function auditEvent(type,details={},auditRole=role||""){db.audit.push({id:Date.now()+Math.random(),at:new Date().toISOString(),type,role:auditRole,details:{...auditSafeValue(details),client:clientContext()}});save();}
function logAudit(type,details={}){auditEvent(type,details,role);}
function accountLabel(a){return a==="owner"?"Владелец":a==="atlant"?"ATLANT — сотрудник":"ASMAN — сотрудник"}
async function hashPassword(value){
 const data=new TextEncoder().encode(String(value));
 const digest=await crypto.subtle.digest("SHA-256",data);
 return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function findAccountByUsername(username){
 const u=String(username||"").trim().toLowerCase();
 return ["owner","atlant","asman"].find(a=>String(db.authCredentials?.[a]?.username||"").trim().toLowerCase()===u)||"";
}
let pendingOwnerChallenge=null;
let pendingOwnerEmailId=null;
async function postJson(url,body){
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let d={};try{d=await r.json()}catch{};if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;
}
function showOtpBox(message='Код отправлен на почту.'){
 document.getElementById('otpBox').style.display='block';
 document.getElementById('otpCode').value='';
 document.getElementById('otpStatus').textContent=message;
 setTimeout(()=>document.getElementById('otpCode')?.focus(),50);
}
async function showEmailStatus(){
 try{
  const r=await fetch('/api/email-status',{cache:'no-store'}); const d=await r.json();
  const x=d.lastSend;
  if(!x)return alert('После запуска сервера письмо ещё не отправлялось.');
  alert(`Resend: HTTP ${x.status}\nEmail ID: ${x.id||'не вернулся'}\nОтправитель: ${x.sender}\nПолучатель: ${x.recipientMasked}\nВремя: ${x.sentAt}`);
 }catch(e){alert('Не удалось получить статус: '+(e.message||e));}
}

async function sendOwnerCode(recovery=false){
 try{
  const username=document.getElementById('username').value.trim();
  if(recovery && findAccountByUsername(username)!=='owner') return alert('Для восстановления укажи логин владельца.');
  const d=await postJson('/api/auth/send-owner-code',{account:'owner',reason:recovery?'recovery':'login'});
  pendingOwnerChallenge=d.challengeId;pendingOwnerEmailId=d.emailId||null;showOtpBox(recovery?'Код восстановления отправлен на почту владельца.':'Код отправлен на почту владельца.');
 }catch(err){
  const m=String(err.message||err);if(m==='OWNER_EMAIL_NOT_CONFIGURED')return alert('Почта владельца ещё не настроена на сервере.');
  if(m.startsWith('OTP_COOLDOWN:'))return alert(`Новый код можно запросить через ${m.split(':')[1]} сек.`);
  if(m.startsWith('RESEND_'))return alert('Не удалось отправить письмо. Проверь настройки Resend и адрес отправителя.');
  alert('Не удалось отправить код: '+m);
 }
}
async function verifyOwnerOtp(){
 const code=document.getElementById('otpCode').value.trim();
 if(!pendingOwnerChallenge)return alert('Сначала запроси код.');
 if(!/^\d{6}$/.test(code))return alert('Введи 6-значный код.');
 try{
  const d=await postJson('/api/auth/verify-owner-code',{account:'owner',challengeId:pendingOwnerChallenge,code});
  if(!d.ok)throw new Error(d.error||'OTP_INVALID');
  const account='owner',sec=db.accountSecurity[account]||(db.accountSecurity[account]={failedAttempts:0,locked:false,lockedAt:null});
  sec.failedAttempts=0;sec.locked=false;sec.lockedAt=null;sec.unlockedAt=new Date().toISOString();
  role='owner';save();auditEvent('login_2fa_verified',{account,username:db.authCredentials[account].username,method:'email_otp'},role);
  document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='block';
  document.getElementById('otpBox').style.display='none';document.getElementById('ownerRecoveryBtn').style.display='none';pendingOwnerChallenge=null;buildNav();go('dashboard');
 }catch(err){
  const m=String(err.message||err);
  if(m==='OTP_EXPIRED')return alert('Код истёк. Запроси новый.');
  if(m==='OTP_TOO_MANY_ATTEMPTS')return alert('Слишком много неправильных кодов. Запроси новый код.');
  if(m==='OTP_INVALID')return alert('Неверный код.');
  alert('Не удалось подтвердить код: '+m);
 }
}
async function doLogin(){
 const username=document.getElementById('username').value.trim(), pass=document.getElementById('pass').value;
 const account=findAccountByUsername(username);
 document.getElementById('ownerRecoveryBtn').style.display='none';
 if(!account){auditEvent('login_failed',{username,reason:'unknown_username'},'');document.getElementById('pass').value='';return alert('Неверный логин или пароль.');}
 const sec=db.accountSecurity[account]||(db.accountSecurity[account]={failedAttempts:0,locked:false,lockedAt:null});
 if(sec.locked){
  auditEvent('login_blocked',{account,username,reason:'account_locked',failedAttempts:sec.failedAttempts},'');
  if(account==='owner')document.getElementById('ownerRecoveryBtn').style.display='block';
  return alert(account==='owner'?'Аккаунт владельца заблокирован. Можно восстановить доступ кодом с почты.':'Аккаунт заблокирован. Разблокировать его может только владелец.');
 }
 const hash=await hashPassword(pass);
 if(hash!==db.authCredentials[account].passwordHash){
   sec.failedAttempts=Number(sec.failedAttempts||0)+1;
   const willLock=sec.failedAttempts>=3;if(willLock){sec.locked=true;sec.lockedAt=new Date().toISOString();}
   auditEvent('login_failed',{account,username,attempt:sec.failedAttempts,remaining:Math.max(0,3-sec.failedAttempts),locked:willLock},'');save();document.getElementById('pass').value='';
   if(willLock && account==='owner')document.getElementById('ownerRecoveryBtn').style.display='block';
   return alert(willLock?'Неверный пароль. Аккаунт заблокирован после 3-й неправильной попытки.':'Неверный пароль. Осталось попыток до блокировки: '+(3-sec.failedAttempts));
 }
 if(account==='owner'){
   try{await sendOwnerCode(false);auditEvent('login_password_verified',{account,username},'');}
   catch(err){return;}
   return;
 }
 sec.failedAttempts=0;role=account;auditEvent('login',{account:role,username},role);document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='block';buildNav();go('dashboard');
}

function changeCredentials(account){
 if(role!=="owner")return;
 const current=db.authCredentials[account]||{};
 const label=accountLabel(account);
 const username=prompt(`Новый логин для: ${label}`,current.username||"");
 if(username===null)return;
 const u=username.trim();
 if(u.length<3)return alert("Логин должен содержать минимум 3 символа.");
 const duplicate=["owner","atlant","asman"].some(a=>a!==account&&String(db.authCredentials[a]?.username||"").toLowerCase()===u.toLowerCase());
 if(duplicate)return alert("Такой логин уже используется другим аккаунтом.");
 const pass=prompt(`Новый пароль для: ${label}\nМинимум 8 символов.`,"");
 if(pass===null)return;
 if(pass.length<8)return alert("Пароль должен содержать минимум 8 символов.");
 db.authCredentials[account]={username:u,passwordHash:""};
 hashPassword(pass).then(hash=>{db.authCredentials[account].passwordHash=hash;save();logAudit("credentials_changed",{account,newUsername:u});security();alert("Логин и пароль сохранены.");});
}
function unlockAccount(account){if(role!=="owner")return;const sec=db.accountSecurity[account];if(!sec)return;const before={...sec};sec.failedAttempts=0;sec.locked=false;sec.lockedAt=null;sec.unlockedAt=new Date().toISOString();save();logAudit("account_unlocked",{account,old:before,new:{...sec}});security();}
function doLogout(){if(role)logAudit("logout",{account:role});role="";document.getElementById("appShell").style.display="none";document.getElementById("loginScreen").style.display="grid";document.getElementById("pass").value=""}
function buildNav(){}
function previewEditPhoto(e){const f=e.target.files[0];if(!f)return;compressImage(f,data=>{const im=document.getElementById("e_preview");im.src=data;im.style.display="block";im.dataset.data=data})}
function saveEdit(id){
 const r=db.reports.find(x=>x.id===id),g=id2=>document.getElementById(id2);if(!r)return;
 r.date=g("e_date").value;r.store=g("e_store").value;r.revenue=+g("e_rev").value||0;r.terminal=+g("e_term").value||0;r.payout=+g("e_pay").value||0;r.trans=+g("e_trans").value||0;r.taken=g("e_taken").value;r.comment=g("e_comment").value;
 r.photo=g("e_preview").dataset.data||r.photo||null;
 if(!r.photo)return alert("У отчёта должна быть фотография");
 save();closeModal();reports();
}
function deleteReport(id){if(role!=="owner")return;if(!confirm("Удалить этот отчёт? Он останется в удалённых."))return;const r=db.reports.find(x=>x.id===id);if(!r)return;const before={...r};r.deleted=true;r.deletedAt=new Date().toISOString();r.deletedBy=role;if(!save()){Object.assign(r,before);return;}logAudit("report_delete",{reportId:id,old:before,new:{...r}});closeModal();reports()}

function getRate(employee,date){
 const arr=db.rates.filter(x=>x.employee===employee&&(!x.store||employees[x.store]?.includes(employee))).filter(x=>x.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
 return arr.length?arr[arr.length-1]:{pct:0,fixed:0};
}
function salary(){
 const r=db.reports.filter(x=>stores().includes(x.store)), all=[...new Set(stores().flatMap(s=>employees[s]))];
 document.getElementById("content").innerHTML=`
 <div class="card"><table><tr><th>Сотрудник</th><th>Дней</th><th>Выручка смен</th><th>Начислено</th><th>Оплачено</th><th>Остаток</th></tr>
 ${all.map(e=>{let q=r.filter(x=>x.staff.includes(e)),earned=q.reduce((s,x)=>{let z=getRate(e,x.date);return s+x.revenue*z.pct/100+z.fixed},0),paid=db.payouts.filter(p=>p.employee===e).reduce((s,p)=>s+p.amount,0);return`<tr><td><strong>${esc(e)}</strong></td><td>${q.length}</td><td>${money(q.reduce((s,x)=>s+x.revenue,0))}</td><td>${money(earned)}</td><td>${money(paid)}</td><td>${money(earned-paid)}</td></tr>`}).join("")}</table></div>`;
}

function revenue(){
 const r=db.reports.filter(x=>stores().includes(x.store));
 document.getElementById("content").innerHTML=`<div class="grid"><div class="card kpi"><div class="muted">ATLANT</div><div class="num">${money(r.filter(x=>x.store==="ATLANT").reduce((s,x)=>s+x.revenue,0))}</div></div><div class="card kpi"><div class="muted">ASMAN</div><div class="num">${money(r.filter(x=>x.store==="ASMAN").reduce((s,x)=>s+x.revenue,0))}</div></div><div class="card kpi"><div class="muted">Терминал</div><div class="num">${money(r.reduce((s,x)=>s+x.terminal,0))}</div></div><div class="card kpi"><div class="muted">Переводы</div><div class="num">${money(r.reduce((s,x)=>s+x.trans,0))}</div></div></div>`;
}

function fines(){
 document.getElementById("content").innerHTML=`<div class="toolbar"><button class="primary" onclick="newFine()">+ Добавить штраф</button></div><div class="card">${db.fines.length?`<table><tr><th>Дата</th><th>Сотрудник</th><th>Причина</th><th>Сумма</th></tr>${db.fines.map(f=>`<tr><td>${esc(f.date)}</td><td>${esc(f.employee)}</td><td>${esc(f.reason)}</td><td>${money(f.amount)}</td></tr>`).join("")}</table>`:`<div class="empty">Штрафов пока нет.</div>`}</div>`;
}
function newFine(){const ss=stores();showModal("Добавить штраф",`<label>Дата</label><input id="fd" class="field" type="date" required value="${new Date().toISOString().slice(0,10)}"><label>Магазин</label><select id="fs" class="field" onchange="renderFineEmployees()">${ss.map(s=>`<option>${s}</option>`).join("")}</select><label>Сотрудник</label><select id="fe" class="field"></select><label>Причина</label><input id="fr" class="field"><label>Сумма</label><input id="fa" class="field" type="number" min="0" step="1"><button class="primary full" onclick="saveFine()">Сохранить</button>`);renderFineEmployees()}
function renderFineEmployees(){const s=document.getElementById("fs")?.value;const el=document.getElementById("fe");if(!el)return;el.innerHTML=(s?(employees[s]||[]):[]).map(e=>`<option value="${esc(e)}">${esc(e)}</option>`).join("")}
function saveFine(){if(role!=="owner")return alert("Нет доступа");const g=id=>document.getElementById(id),date=g("fd")?.value||"",store=g("fs")?.value||"",employee=g("fe")?.value||"",reason=(g("fr")?.value||"").trim(),amount=Number(g("fa")?.value);if(!stores().includes(store)||!isValidDateString(date))return alert("Укажи корректные магазин и дату");if(!getStaffRecord(employee,store))return alert("Сотрудник не найден в выбранном магазине");if(!reason)return alert("Укажи причину штрафа");if(!Number.isFinite(amount)||amount<=0)return alert("Укажи корректную сумму штрафа");const fine={id:String(Date.now())+Math.random(),date,store,employee,reason,amount,createdAt:new Date().toISOString(),createdBy:role,voided:false};db.fines.push(fine);if(!save()){db.fines.pop();return;}logAudit("fine_create",{new:{...fine}});closeModal();fines()}

function rates(){
 const all=[...new Set(["ATLANT","ASMAN"].flatMap(s=>employees[s]))];
 document.getElementById("content").innerHTML=`<div class="toolbar"><button class="primary" onclick="newRate()">+ Добавить новую ставку</button></div>
 
 <div class="card"><table><tr><th>Сотрудник</th><th>Магазин</th><th>Действует с</th><th>%</th><th>Фикс / день</th><th></th></tr>
 ${db.rates.map((x,i)=>({x,i})).sort((a,b)=>String(b.x.date).localeCompare(String(a.x.date))).map(({x,i})=>`<tr><td><strong>${esc(x.employee)}</strong></td><td>${esc(x.store||"")}</td><td>${esc(x.date)}</td><td>${x.pct}%</td><td>${money(x.fixed)}</td><td><button class="secondary" onclick="editRate(${i})">Изменить</button></td></tr>`).join("")}</table></div>`;
}
function newRate(){rateForm(null,"Добавить новую ставку")}
function editRate(index){rateForm(index,"Изменить ставку")}
function rateForm(index,titleText){
 const r=index===null?{employee:employees.ATLANT[0],store:"ATLANT",date:new Date().toISOString().slice(0,10),pct:0,fixed:0}:db.rates[index];
 showModal(titleText,`<div class="row"><div><label>Сотрудник</label><select id="q_emp" class="field">${[...new Set(["ATLANT","ASMAN"].flatMap(s=>employees[s]))].map(e=>`<option ${e===r.employee?"selected":""}>${esc(e)}</option>`).join("")}</select></div><div><label>Магазин</label><select id="q_store" class="field"><option ${r.store==="ATLANT"?"selected":""}>ATLANT</option><option ${r.store==="ASMAN"?"selected":""}>ASMAN</option></select></div></div>
 <div class="row"><div><label>Дата начала действия</label><input id="q_date" class="field" type="date" required value="${r.date}"></div><div><label>Процент</label><input id="q_pct" class="field" type="number" step="0.1" value="${r.pct}"></div></div>
 <label>Фиксированная сумма за рабочий день</label><input id="q_fixed" class="field" type="number" step="1" value="${r.fixed}">
 
 <button class="primary full" onclick="saveRate(${index===null?"null":index})">Сохранить ставку</button>`);
}
function saveRate(index){
 const g=id=>document.getElementById(id), obj={employee:g("q_emp")?.value||"",store:g("q_store")?.value||"",date:g("q_date")?.value||"",pct:Number(g("q_pct")?.value),fixed:Number(g("q_fixed")?.value)};
 if(!isValidDateString(obj.date))return alert("Укажи корректную дату начала");
 if(!getStaffRecord(obj.employee,obj.store))return alert("Сотрудник не найден в выбранном магазине");
 if(!Number.isFinite(obj.pct)||obj.pct<0||obj.pct>100)return alert("Процент должен быть от 0 до 100");
 if(!Number.isFinite(obj.fixed)||obj.fixed<0)return alert("Фиксированная сумма не может быть отрицательной");
 const duplicate=db.rates.some((r,i)=>i!==index&&r.employee===obj.employee&&r.store===obj.store&&r.date===obj.date);
 if(duplicate)return alert("На эту дату у сотрудника уже есть ставка");
 const before=index===null?null:{...db.rates[index]};
 if(index===null)db.rates.push({...obj,id:String(Date.now())+Math.random()});else db.rates[index]={...db.rates[index],...obj};
 if(!save()){if(index===null)db.rates.pop();else db.rates[index]=before;return;}
 logAudit(index===null?"rate_create":"rate_edit",{employee:obj.employee,store:obj.store,date:obj.date,pct:obj.pct,fixed:obj.fixed});
 closeModal();rates();
}

function security(){document.getElementById("content").innerHTML=`<div class="card"><h3>Безопасность</h3><p class="muted">Тестовый режим: данные хранятся локально в браузере.</p></div>`}
function backup(){document.getElementById("content").innerHTML=`<div class="toolbar"><button class="primary" onclick="exportData()">Экспорт JSON</button><button class="secondary" onclick="document.getElementById('importFile').click()">Импорт JSON</button><input id="importFile" type="file" accept=".json" hidden onchange="importData(event)"></div>`}
function exportData(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="ATLANT_ASMAN_backup.json";a.click()}
function importData(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{db=JSON.parse(r.result);save();alert("Импорт выполнен");backup()}catch{alert("Ошибка файла")}};r.readAsText(f)}
function showModal(t,b){document.getElementById("modalTitle").textContent=t;document.getElementById("modalBody").innerHTML=b;document.getElementById("modal").style.display="grid"}
function closeModal(){document.getElementById("modal").style.display="none"}

(function(){
const initialStaff=[{name:"Владислав",store:"ATLANT"},{name:"Вадим",store:"ATLANT"},{name:"Жига",store:"ATLANT"},{name:"Александр",store:"ATLANT"},{name:"Султан",store:"ATLANT"},{name:"Умид",store:"ASMAN"},{name:"Дима",store:"ASMAN"}];
if(!Array.isArray(db.staff))db.staff=initialStaff.map(x=>({...x}));if(!Array.isArray(db.payouts))db.payouts=[];db.reports.forEach(r=>{if(!r.id)r.id=Date.now()+Math.random();if(!Array.isArray(r.transfers))r.transfers=[]});save();
const staffFor=s=>db.staff.filter(x=>x.store===s).map(x=>x.name),
 allStaff=()=>db.staff.slice(),
 allPeople=()=>[...db.staff.map(x=>({...x,active:true})),...db.deletedStaff.map(x=>({...x,active:false}))],
 months=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
 pad=n=>String(n).padStart(2,"0"),ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()),daysInMonth=(y,m)=>new Date(y,m+1,0).getDate(),monthName=m=>months[m],
 // Current reports are always the latest non-deleted version for each store/date.
 // All historical versions remain in db.reports, but only this derived view is used
 // for current revenue, dashboard totals and other aggregate figures.
 activeReports=()=>latestReports(db.reports.filter(r=>stores().includes(r.store)&&reportCalcSafe(r))),
 isValidDateString=v=>{if(typeof v!=="string"||!/^(\d{4})-(\d{2})-(\d{2})$/.test(v))return false;const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/),y=+m[1],mo=+m[2],d=+m[3];if(y<1900||y>2200||mo<1||mo>12||d<1||d>31)return false;const dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d},
 getYears=()=>{const s=new Set([new Date().getFullYear()]);[...db.reports,...db.payouts,...db.rates,...db.fines].forEach(x=>{if(isValidDateString(x?.date))s.add(Number(x.date.slice(0,4)))});return[...s].sort((a,b)=>b-a)},
 getStaffRecord=(name,store)=>db.staff.find(x=>x.name===name&&x.store===store)||db.deletedStaff.find(x=>x.name===name&&x.store===store),
 reportTimestamp=x=>{const n=v=>{if(v===null||v===undefined||v==="")return NaN;const z=Number(v);return Number.isFinite(z)?z:NaN};const u=n(x?.updatedAt);if(Number.isFinite(u))return u;const ud=Date.parse(String(x?.updatedAt||""));if(Number.isFinite(ud))return ud;const c=n(x?.createdAt);if(Number.isFinite(c))return c;const cd=Date.parse(String(x?.createdAt||""));if(Number.isFinite(cd))return cd;const id=n(x?.id);return Number.isFinite(id)?id:0},
 latestReport=(store,date)=>{const a=db.reports.filter(r=>r.store===store&&r.date===date&&!r.deleted&&reportCalcSafe(r)).sort((a,b)=>reportTimestamp(a)-reportTimestamp(b));return a[a.length-1]||null},
 latestReports=(arr)=>{
 const m=new Map();
 (arr||[]).filter(x=>x&&!x.deleted&&x.date&&x.store).forEach(x=>{
   const key=x.store+"|"+x.date, prev=m.get(key);
   if(!prev||reportTimestamp(x)>=reportTimestamp(prev))m.set(key,x);
 });
 return [...m.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
},
 reportCalcSafe=r=>!!r&&!r.legacyInvalid&&r.store&&(r.store==="ATLANT"||r.store==="ASMAN")&&isValidDateString(r.date)&&Number.isFinite(Number(r.revenue))&&Number(r.revenue)>=0,
 employeeBookedOtherStore=(store,date,staff,excludeId=null)=>{const set=new Set(staff||[]);return db.reports.find(r=>!r.deleted&&!r.legacyInvalid&&r.id!==excludeId&&r.store&&r.store!==store&&r.date===date&&Array.isArray(r.staff)&&r.staff.some(n=>set.has(n)))||null},
 rateFor=(name,date,store)=>{const sameStore=db.rates.filter(x=>x.employee===name&&x.store===store&&x.date<=date);const legacy=db.rates.filter(x=>x.employee===name&&!x.store&&x.date<=date&&new Set([...(db.staff||[]),...(db.deletedStaff||[])].filter(s=>s&&s.name===name).map(s=>s.store)).size===1);const arr=(sameStore.length?sameStore:legacy).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return arr.length?arr[arr.length-1]:{pct:0,fixed:0}},
 otherRevenueFor=(name,store,date)=>{const a=db.otherRevenue.filter(x=>x.employee===name&&x.store===store&&x.date===date);return a.length?a[a.length-1]:null},
 dayGross=(name,report)=>{if(!report||!Array.isArray(report.staff)||!report.staff.includes(name))return 0;const z=rateFor(name,report.date,report.store),manual=otherRevenueFor(name,report.store,report.date),base=manual&&Number.isFinite(Number(manual.amount))?Number(manual.amount):(Number(report.revenue)||0);return Math.max(0,base*(Number(z.pct)||0)/100+(Number(z.fixed)||0))},
 grossReportFor=(name,store,date)=>dayGross(name,latestReport(store,date)),
 fineAmount=(name,date,store)=>{const storesForName=new Set([...(db.staff||[]),...(db.deletedStaff||[])].filter(s=>s&&s.name===name).map(s=>s.store));return db.fines.filter(f=>f.employee===name&&f.date===date&&!f.voided&&((f.store&&f.store===store)||(!f.store&&storesForName.size===1&&storesForName.has(store)))).reduce((a,f)=>a+(Number(f.amount)||0),0)},
 payoutAmount=(name,from,to,store)=>db.payouts.filter(p=>p.employee===name&&!p.voided&&(!store||((p.store&&p.store===store)||(!p.store&&legacyStoreIsUnambiguous(name,store))))&&(!from||p.date>=from)&&(!to||p.date<=to)).reduce((a,p)=>a+(Number(p.amount)||0),0),
 // Rebuild salary day-by-day. Unused fine remainder is carried to the next WORKING day, including across weekends/months.
 salarySchedule=(name,store,from,to)=>{
 if(!isValidDateString(from)||!isValidDateString(to)||from>to)return [];
 const relevant=[...db.fines.filter(f=>f.employee===name&&!f.voided&&isValidDateString(f.date)),...db.reports.filter(r=>r.store===store&&!r.deleted&&isValidDateString(r.date)).map(r=>({date:r.date})),...db.rates.filter(r=>r.employee===name&&((r.store&&r.store===store)||(!r.store&&legacyStoreIsUnambiguous(name,store)))&&isValidDateString(r.date)).map(r=>({date:r.date}))].map(x=>x.date).sort();
 const startDate=relevant.length&&relevant[0]<from?relevant[0]:from;
 const out=[];let carry=0;let d=new Date(startDate+"T00:00:00");const end=new Date(to+"T00:00:00");
 if(Number.isNaN(d.getTime())||Number.isNaN(end.getTime()))return [];
 let guard=0;
 while(d<=end&&guard++<10000){const date=ymd(d),r=latestReport(store,date),worked=!!(r&&r.staff.includes(name)),gross=worked?dayGross(name,r):0;carry+=fineAmount(name,date,store);let deduction=0,net=0;if(worked){deduction=Math.min(gross,carry);net=gross-deduction;carry-=deduction;}if(date>=from){const manual=worked?otherRevenueFor(name,store,date):null;const salaryRevenue=worked?(manual?Number(manual.amount)||0:(Number(r.revenue)||0)):0;out.push({date,worked,gross,deduction,net,carryEnd:carry,report:r,rate:worked?rateFor(name,date,store):null,salaryRevenue,manualRevenue:manual});}d.setDate(d.getDate()+1)}return out},
 salaryRange=(name,store,from,to)=>{const sch=salarySchedule(name,store,from,to);return {schedule:sch,accrued:sch.reduce((a,x)=>a+x.net,0),worked:sch.filter(x=>x.worked).length,off:sch.filter(x=>!x.worked).length,carry:sch.length?sch[sch.length-1].carryEnd:0}},
 // Single source of truth for every salary screen: accrual, payouts and balance.
 salarySummary=(name,store,from,to)=>{const q=salaryRange(name,store,from,to),paid=payoutAmount(name,from,to,store);return {...q,paid,balance:q.accrued-paid}},
 activePayoutsFor=(name,from,to,store)=>db.payouts.filter(p=>p.employee===name&&!p.voided&&(!store||((p.store&&p.store===store)||(!p.store&&legacyStoreIsUnambiguous(name,store))))&&(!from||p.date>=from)&&(!to||p.date<=to)),
 buildNav=function(){let a=[["dashboard","▦","Дашборд"],["reports","▤","Отчёты"]];if(role==="owner")a=[["dashboard","▦","Дашборд"],["reports","▤","Отчёты"],["salary","₽","Зарплата"],["zpdaily","▤","ЗП по дням"],["totals","Σ","Итоги"],["deletedreports","🗑","Удалённые отчёты"],["revenue","◈","Выручка"],["fines","!","Штрафы"],["rates","%","Ставки"],["security","⌁","Безопасность"],["ai","🤖","ATLANT/ASMAN AI"],["backup","↥","Резервная копия"]];document.getElementById("nav").innerHTML=a.map(x=>`<button id="n_${x[0]}" onclick="go('${x[0]}')">${x[1]} <span>${x[2]}</span></button>`).join("")},
 go=function(p){const ownerOnly=new Set(["salary","zpdaily","totals","deletedreports","revenue","fines","rates","security","ai","backup"]);if(ownerOnly.has(p)&&role!=="owner"){alert("Нет доступа");return;}document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));document.getElementById("n_"+p)?.classList.add("active");const t={dashboard:"Дашборд",reports:"Отчёты смен",salary:"Зарплата",zpdaily:"ЗП по дням",totals:"Итоги",deletedreports:"Удалённые отчёты",revenue:"Выручка",fines:"Штрафы",rates:"Ставки",security:"Безопасность",ai:"ATLANT/ASMAN AI",backup:"Резервная копия"};document.getElementById("title").textContent=t[p]||p;document.getElementById("who").textContent=role==="owner"?"Владелец":role==="atlant"?"ATLANT":"ASMAN";const c=document.getElementById("content");c.classList.remove("page-transition");void c.offsetWidth;if(typeof window[p]==="function")window[p]();c.classList.add("page-transition")},
 dashboard=function(){const r=activeReports(),allowed=stores(),a=allowed.includes("ATLANT")?r.filter(x=>x.store==="ATLANT").reduce((s,x)=>s+x.revenue,0):0,b=allowed.includes("ASMAN")?r.filter(x=>x.store==="ASMAN").reduce((s,x)=>s+x.revenue,0):0,visible=r.filter(x=>allowed.includes(x.store)),dates=[...new Set(visible.map(x=>x.date))].sort().reverse();document.getElementById("content").innerHTML=`<div class="grid">${allowed.map(s=>`<div class="card kpi"><div class="muted">${s}</div><div class="num">${money(s==="ATLANT"?a:b)}</div></div>`).join("")}<div class="card kpi"><div class="muted">Общая выручка</div><div class="num">${money(a+b)}</div></div><div class="card kpi"><div class="muted">Отчётов</div><div class="num">${visible.length}</div></div></div><div class="stores">${allowed.map(s=>`<div class="store click-card" onclick="openStoreReports('${s}')"><div class="store-head"><h2>${s}</h2><span class="pill">${visible.filter(x=>x.store===s).length} отчётов</span></div><div class="muted" style="margin-top:7px">Открыть только отчёты ${s}</div></div>`).join("")}</div><div class="card" style="margin-top:15px"><div class="section-title">Сравнение отчётов по дням</div>${dates.length?`<div style="overflow:auto"><table class="compare-table"><tr><th>Дата</th>${allowed.map(s=>`<th>${s}</th>`).join("")}</tr>${dates.map(d=>`<tr><td><strong>${d}</strong></td>${allowed.map(s=>{const q=latestReport(s,d);return`<td>${q?money(q.revenue):"—"}</td>`}).join("")}</tr>`).join("")}</table></div>`:`<div class="empty">Отчётов пока нет.</div>`}</div>`},
 reports=function(){const allowed=stores();document.getElementById("content").innerHTML=`<div class="stores">${allowed.map(s=>{const rs=db.reports.filter(x=>x.store===s&&!x.deleted).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));return`<div class="store"><div class="store-head"><h2>Отчёты ${s}</h2><span class="pill">${rs.length}</span></div><div class="toolbar" style="margin-top:12px"><button type="button" class="primary new-report-btn" data-store="${s}">+ Новый отчёт ${s}</button></div>${rs.length?rs.map(x=>`<div class="store-report" onclick="viewReportById(event,${x.id})"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${x.date}</strong><strong>${money(x.revenue)}</strong></div><div class="muted" style="margin-top:5px">Автор: <strong>${esc(x.author||"—")}</strong> · ${x.staff.map(esc).join(", ")} · ${x.photo?"📷 Фото":"без фото"} ${x.legacyInvalid?'<span class="pill">СТАРЫЙ НЕКОРРЕКТНЫЙ</span>':''}</div></div>`).join(""):`<div class="empty">Отчётов пока нет.</div>`}</div>`}).join("")}</div>`},
 openStoreReports=function(s){if(!stores().includes(s))return alert("Нет доступа к этому магазину");document.getElementById("content").innerHTML=`<div class="toolbar"><button class="secondary" onclick="reports()">← Назад</button><button type="button" class="primary new-report-btn" data-store="${s}">+ Новый отчёт ${s}</button></div><div class="card"><div class="section-title">Отчёты ${s}</div>${db.reports.filter(x=>x.store===s&&!x.deleted).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<div class="store-report" onclick="viewReportById(event,${x.id})"><strong>${x.date}</strong> — ${money(x.revenue)}<div class="muted">Автор: <strong>${esc(x.author||"—")}</strong> · ${x.staff.join(", ")}</div></div>`).join("")||'<div class="empty">Нет отчётов.</div>'}</div>`},
 viewReportById=function(e,id){if(e)e.stopPropagation();const r=db.reports.find(x=>x.id===id);if(r&&!r.deleted&&stores().includes(r.store))viewReportObj(r)},
 viewReportObj=function(r){if(role!=="owner"&&!stores().includes(r.store))return alert("Нет доступа к этому отчёту");const trs=Array.isArray(r.transfers)?r.transfers:[];showModal("Детализация отчёта",`<div class="toolbar"><span class="pill">${esc(r.store)}</span><span class="detail-date">${esc(r.date)}</span></div><div class="detail-grid"><div class="detail-item"><div class="muted">Автор</div><div class="v">${esc(r.author||"—")}</div></div><div class="detail-item"><div class="muted">Сотрудники</div><div class="v">${r.staff.map(esc).join(", ")}</div></div><div class="detail-item"><div class="muted">Выручка</div><div class="v">${money(r.revenue)}</div></div><div class="detail-item"><div class="muted">Терминал</div><div class="v">${money(r.terminal)}</div></div><div class="detail-item"><div class="muted">Выплата</div><div class="v">${money(r.payout)}</div></div><div class="detail-item"><div class="muted">Забрал выплату</div><div class="v">${esc(r.taken||"—")}</div></div></div><div class="card" style="margin-top:10px;padding:14px"><strong>Переводы</strong>${trs.length?trs.map((t,i)=>`<div style="margin-top:8px"><span class="pill">№${i+1}</span> ${money(t.amount)} — ${esc(t.recipient||"")} · ${esc(t.bank||"")}</div>`).join(""):`<div class="muted" style="margin-top:8px">Переводов нет.</div>`}</div><div class="detail-item" style="margin-top:10px"><div class="muted">Комментарий</div><div class="v">${esc(r.comment||"—")}</div></div>${(r.photos|| (r.photo?[r.photo]:[])).length?`<div class="photo-gallery">${(r.photos|| (r.photo?[r.photo]:[])).slice(0,3).map((p,i)=>`<img class="detail-photo photo-zoomable" onclick="openPhotoViewer(this.src)" src="${p}" alt="Фото отчёта ${i+1}">`).join("")}</div>`:``}${role==="owner"?`<div class="toolbar" style="margin-top:14px"><button class="secondary" onclick="editReportV13(${r.id})">Редактировать</button><button class="danger-btn" onclick="deleteReportV13(${r.id})">Удалить</button></div>`:""}`)},
 newReport=function(preStore){const ss=stores(),selected=preStore&&ss.includes(preStore)?preStore:ss[0],transferRows=[1,2,3].map(i=>`<div class="transfer-label">Перевод ${i}</div><div class="transfer-grid"><input id="tr_amt_${i}" class="field" type="number" placeholder="Сумма"><input id="tr_name_${i}" class="field" placeholder="Получатель"><input id="tr_bank_${i}" class="field" placeholder="Банк"></div>`).join("");showModal("Новый отчёт смены",`<div class="row"><div><label>Дата</label><input id="r_date" class="field" type="date" required value="${ymd(new Date())}"></div><div><label>Магазин</label><select id="r_store" class="field" onchange="renderStaffV13()">${ss.map(s=>`<option ${s===selected?"selected":""}>${s}</option>`).join("")}</select></div></div><label>Сотрудники на смене</label><div class="author-block"><div id="staffChecksV13" class="checks"></div><label>Автор</label><select id="r_author" class="field"></select></div><div><label>Выручка</label><input id="r_rev" class="field" type="number"></div><div><label>Терминал</label><input id="r_term" class="field" type="number"></div><div><label>Выплата</label><input id="r_payout" class="field" type="number"></div><div><label>Кто забрал выплату</label><input id="r_taken" class="field"></div><label>Переводы</label>${transferRows}<label>Комментарий</label><textarea id="r_comment" class="field" rows="3"></textarea><label>Фотографии отчёта <span style="color:#ff7e98">*</span></label><div class="photo-box"><input id="r_photo" class="field" type="file" accept="image/*" multiple onchange="previewNewPhotoV13(event)"><div class="mini" style="margin-top:6px">Можно прикрепить максимум 3 фотографии.</div><div id="r_previews" class="photo-previews"></div></div><button class="primary full" onclick="saveReportV13()">Сохранить отчёт</button>`);renderStaffV13()},
 renderStaffV13=function(){const s=document.getElementById("r_store").value,names=staffFor(s);document.getElementById("staffChecksV13").innerHTML=names.map(e=>`<label class="check"><input type="checkbox" value="${esc(e)}"> ${esc(e)}</label>`).join("");document.getElementById("r_author").innerHTML=names.map(e=>`<option value="${esc(e)}">${esc(e)}</option>`).join("")},

 validateDateValue=function(v,label="Дата") {
   const x=String(v||"").trim();
   if(!/^\d{4}-\d{2}-\d{2}$/.test(x)) return alert(`${label}: укажи корректную дату.`),false;
   const [yy,mm,dd]=x.split("-").map(Number);
   const d=new Date(Date.UTC(yy,mm-1,dd));
   if(d.getUTCFullYear()!==yy||d.getUTCMonth()!==mm-1||d.getUTCDate()!==dd) return alert(`${label}: дата указана некорректно.`),false;
   return true;
 },
 finiteNumberValue=function(v,label,allowNegative=false){
   const raw=String(v??"").trim();
   if(raw==="") return 0;
   const n=Number(raw);
   if(!Number.isFinite(n)) return alert(`${label}: введи корректное число.`),null;
   if(!allowNegative&&n<0) return alert(`${label}: сумма не может быть отрицательной.`),null;
   return n;
 },
 saveReportV13=async function(){
 const g=id=>document.getElementById(id), staff=[...document.querySelectorAll("#staffChecksV13 input:checked")].map(x=>x.value);
 if(!staff.length)return alert("Выбери хотя бы одного сотрудника");
 const store=g("r_store")?.value||"",date=g("r_date")?.value||"";
 if(!validateDateValue(date,"Дата отчёта"))return;
 if(!store||!stores().includes(store))return alert("Выбери корректный магазин");
 const sameDay=db.reports.filter(r=>!r.deleted&&!r.legacyInvalid&&r.store===store&&r.date===date).length;
 if(sameDay>=3)return alert("Для одного магазина и одной даты можно сохранить максимум 3 версии отчёта.");
 const files=[...(g("r_photo")?.files||[])];
 if(files.length>3)return alert("Можно прикрепить максимум 3 фотографии");
 if(files.some(f=>!String(f.type||"").startsWith("image/")))return alert("Можно прикреплять только изображения");
 if(files.some(f=>Number(f.size)>15*1024*1024))return alert("Каждая фотография должна быть не больше 15 МБ");
 const conflict=employeeBookedOtherStore(store,date,staff);
 if(conflict)return alert(`Сотрудник ${conflict.staff.find(n=>staff.includes(n))} уже указан в отчёте магазина ${conflict.store} на эту дату. Один сотрудник не может работать в двух магазинах в один день.`);
 const photos=[];
 for(const file of files){photos.push(await new Promise(resolve=>compressImage(file,resolve)));}
 if(!photos.length)return alert("Фотография отчёта обязательна — сначала выбери фотографию");
 const photo=photos[0];
 const transfers=[];
 for(let i=1;i<=3;i++){const raw=g("tr_amt_"+i).value.trim(),n=raw===""?0:Number(raw);if(raw!==""&&(!Number.isFinite(n)||n<0))return alert(`Перевод ${i}: укажи корректную неотрицательную сумму`);}
 [1,2,3].forEach(i=>{
   const amount=Number(g("tr_amt_"+i).value)||0,name=g("tr_name_"+i).value.trim(),bank=g("tr_bank_"+i).value.trim();
   if(amount||name||bank)transfers.push({amount,recipient:name,bank});
 });
 const revenue=finiteNumberValue(g("r_rev").value,"Выручка"); if(revenue===null)return;
 const terminal=finiteNumberValue(g("r_term").value,"Терминал"); if(terminal===null)return;
 const payout=finiteNumberValue(g("r_payout").value,"Выплата",false); if(payout===null)return;
 const author=g("r_author").value||""; if(!author||!staff.includes(author))return alert("Выбери автора из сотрудников на смене");
 const obj={id:Date.now()+Math.random(),createdAt:Date.now(),date,store,author,staff,revenue,terminal,payout,taken:g("r_taken").value,transfers,trans:transfers.reduce((s,x)=>s+x.amount,0),comment:g("r_comment").value,photo,photos,deleted:false};
 db.reports.push(obj);
 if(!save()){db.reports.pop();return;}
 logAudit("report_create",{reportId:obj.id,new:{...obj}});
 closeModal();reports();
}, renderEditStaffV13=function(){const store=document.getElementById("er_store")?.value||"";const box=document.getElementById("editStaffChecks");const author=document.getElementById("er_author");if(!box||!author)return;const checked=[...box.querySelectorAll("input:checked")].map(x=>x.value);const names=[...new Set([...staffFor(store),...checked.filter(n=>!!getStaffRecord(n,store))])];box.innerHTML=names.map(e=>`<label class="check"><input type="checkbox" value="${esc(e)}" ${checked.includes(e)?"checked":""}> ${esc(e)}${db.staff.some(x=>x.name===e&&x.store===store)?"":" (удалён)"}</label>`).join("");const oldAuthor=author.value;author.innerHTML=names.map(e=>`<option value="${esc(e)}">${esc(e)}${db.staff.some(x=>x.name===e&&x.store===store)?"":" (удалён)"}</option>`).join("");if(names.includes(oldAuthor))author.value=oldAuthor;else if(names.length)author.value=names[0];},
 editReportV13=function(id){if(role!=="owner")return;const r=db.reports.find(x=>x.id===id);if(!r)return;const trs=Array.isArray(r.transfers)?r.transfers:[],rows=[1,2,3].map(i=>{const t=trs[i-1]||{};return`<div class="transfer-label">Перевод ${i}</div><div class="transfer-grid"><input id="etr_amt_${i}" class="field" type="number" value="${t.amount||""}" placeholder="Сумма"><input id="etr_name_${i}" class="field" value="${esc(t.recipient||"")}" placeholder="Имя"><input id="etr_bank_${i}" class="field" value="${esc(t.bank||"")}" placeholder="Банк"></div>`}).join("");showModal("Редактировать отчёт",`<div class="row"><div><label>Дата</label><input id="er_date" class="field" type="date" required value="${r.date}"></div><div><label>Магазин</label><select id="er_store" class="field" onchange="renderEditStaffV13()">${stores().map(s=>`<option ${s===r.store?"selected":""}>${s}</option>`).join("")}</select></div></div><label>Сотрудники на смене</label><div id="editStaffChecks" class="checks">${[...new Set([...staffFor(r.store),...(r.staff||[]).filter(e=>!!getStaffRecord(e,r.store))])].map(e=>`<label class="check"><input type="checkbox" value="${esc(e)}" ${r.staff.includes(e)?"checked":""}> ${esc(e)}${db.staff.some(x=>x.name===e&&x.store===r.store)?"":" (удалён)"}</label>`).join("")}</div><label>Автор</label><select id="er_author" class="field">${[...new Set([...staffFor(r.store),...(r.author?[r.author]:[]).filter(e=>!!getStaffRecord(e,r.store))])].map(e=>`<option value="${esc(e)}" ${e===(r.author||"")?"selected":""}>${esc(e)}${db.staff.some(x=>x.name===e&&x.store===r.store)?"":" (удалён)"}</option>`).join("")}</select><label>Выручка</label><input id="er_rev" class="field" type="number" value="${r.revenue}"><div class="row"><div><label>Терминал</label><input id="er_term" class="field" type="number" value="${r.terminal}"></div><div><label>Выплата</label><input id="er_pay" class="field" type="number" value="${r.payout}"></div></div><label>Кто забрал</label><input id="er_taken" class="field" value="${esc(r.taken||"")}"><label>Переводы</label>${rows}<label>Комментарий</label><textarea id="er_comment" class="field">${esc(r.comment||"")}</textarea><label>Фотографии</label><div class="photo-box"><input id="er_photo" class="field" type="file" accept="image/*" multiple onchange="previewEditPhotoV13(event)"><div class="mini" style="margin-top:6px">Можно хранить максимум 3 фотографии. Если новые не выбраны, старые сохраняются.</div><div id="er_previews" class="photo-previews">${(r.photos|| (r.photo?[r.photo]:[])).map((p,i)=>`<img class="photo-preview" style="display:block" src="${p}" alt="Фото ${i+1}">`).join("")}</div></div><button class="primary full" onclick="saveEditV13(${id})">Сохранить изменения</button>`);},
 saveEditV13=async function(id){if(role!=="owner")return alert("Нет доступа");const r=db.reports.find(x=>x.id===id);const g=x=>document.getElementById(x);if(!r)return;const before=JSON.parse(JSON.stringify(r));const newDate=g("er_date")?.value||"",newStore=g("er_store")?.value||"",staff=[...document.querySelectorAll("#editStaffChecks input:checked")].map(x=>x.value),newAuthor=g("er_author")?.value||"";if(!validateDateValue(newDate,"Дата отчёта"))return;if(!stores().includes(newStore))return alert("Выбран недоступный магазин");if(!staff.length)return alert("Выбери хотя бы одного сотрудника");const allowedStaff=[...new Set([...staffFor(newStore),...db.deletedStaff.filter(x=>x.store===newStore).map(x=>x.name)])];if(staff.some(x=>!allowedStaff.includes(x)))return alert("Сотрудники не соответствуют выбранному магазину");if(!newAuthor||!staff.includes(newAuthor))return alert("Автор должен быть выбран из сотрудников на смене");const sameDay=db.reports.filter(x=>x.id!==id&&!x.deleted&&!x.legacyInvalid&&x.store===newStore&&x.date===newDate).length;if(sameDay>=3)return alert("Для одного магазина и одной даты можно сохранить максимум 3 активные версии отчёта.");const conflict=employeeBookedOtherStore(newStore,newDate,staff,id);if(conflict)return alert(`Сотрудник ${conflict.staff.find(n=>staff.includes(n))} уже указан в отчёте магазина ${conflict.store} на эту дату. Один сотрудник не может работать в двух магазинах в один день.`);const transfers=[];for(let i=1;i<=3;i++){const raw=(g("etr_amt_"+i)?.value||"").trim(),amount=raw===""?0:Number(raw),name=(g("etr_name_"+i)?.value||"").trim(),bank=(g("etr_bank_"+i)?.value||"").trim();if(raw!==""&&(!Number.isFinite(amount)||amount<0))return alert(`Перевод ${i}: укажи корректную неотрицательную сумму`);if(amount||name||bank)transfers.push({amount,recipient:name,bank});}const files=[...(g("er_photo")?.files||[])];if(files.length>3)return alert("Можно прикрепить максимум 3 фотографии");if(files.some(f=>!String(f.type||"").startsWith("image/")))return alert("Можно прикреплять только изображения");if(files.some(f=>Number(f.size)>15*1024*1024))return alert("Каждая фотография должна быть не больше 15 МБ");let photos=Array.isArray(r.photos)?r.photos:(r.photo?[r.photo]:[]);if(files.length){photos=[];for(const file of files){const data=await new Promise(resolve=>compressImage(file,resolve));if(!data)return;photos.push(data);}}const revenue=finiteNumberValue(g("er_rev").value,"Выручка");if(revenue===null)return;const terminal=finiteNumberValue(g("er_term").value,"Терминал");if(terminal===null)return;const payout=finiteNumberValue(g("er_pay").value,"Выплата",false);if(payout===null)return;r.date=newDate;r.store=newStore;r.staff=staff;r.author=newAuthor;r.revenue=revenue;r.terminal=terminal;r.payout=payout;r.taken=g("er_taken").value;r.transfers=transfers;r.trans=transfers.reduce((s,x)=>s+x.amount,0);r.comment=g("er_comment").value;r.photos=photos.slice(0,3);r.photo=r.photos[0]||null;r.updatedAt=Date.now();if(!save()){db.reports[db.reports.findIndex(x=>x.id===id)]=before;return;}logAudit("report_edit",{reportId:id,old:before,new:{...r}});closeModal();reports()},
 deleteReportV13=function(id){if(role!=="owner")return;if(!confirm("Удалить отчёт? Он будет исключён из расчётов, но останется в удалённых для истории."))return;const r=db.reports.find(x=>x.id===id);if(!r)return;const before={...r};r.deleted=true;r.deletedAt=new Date().toISOString();r.deletedBy=role;if(!save()){Object.assign(r,before);return;}logAudit("report_delete",{reportId:id,old:before,new:{...r}});closeModal();reports()},
 openDeletedReports=function(){if(role!=="owner")return;deletedreports()},
 previewNewPhotoV13=function(e){const files=[...e.target.files];if(files.length>3){e.target.value="";return alert("Можно прикрепить максимум 3 фотографии")}const box=document.getElementById("r_previews");if(!box)return;box.innerHTML="";files.forEach(f=>compressImage(f,data=>{const im=document.createElement("img");im.className="photo-preview";im.style.display="block";im.src=data;box.appendChild(im)}))},
 previewEditPhotoV13=function(e){const files=[...e.target.files];if(files.length>3){e.target.value="";return alert("Можно прикрепить максимум 3 фотографии")}const box=document.getElementById("er_previews");if(!box)return;box.innerHTML="";files.forEach(f=>compressImage(f,data=>{const im=document.createElement("img");im.className="photo-preview";im.style.display="block";im.src=data;box.appendChild(im)}))},
 salary=function(){if(role!=="owner")return alert("Нет доступа");const y=Number(window.salaryYear||getYears()[0]),from=y+"-01-01",to=y+"-12-31",people=allPeople().filter(s=>stores().includes(s.store)),current=activeReports(),rows=months.map((m,i)=>{const f=y+"-"+pad(i+1)+"-01",t=y+"-"+pad(i+1)+"-"+pad(daysInMonth(y,i));const atl=current.filter(r=>r.store==="ATLANT"&&r.date>=f&&r.date<=t).reduce((a,r)=>a+r.revenue,0),asm=current.filter(r=>r.store==="ASMAN"&&r.date>=f&&r.date<=t).reduce((a,r)=>a+r.revenue,0),ac=people.reduce((a,s)=>a+salaryRange(s.name,s.store,f,t).accrued,0),pa=people.reduce((a,s)=>a+payoutAmount(s.name,f,t,s.store),0);return`<tr><td class="month-link" onclick="salaryMonthDetail(${y},${i})">${m}</td><td>${money(atl)}</td><td>${money(asm)}</td><td>${money(ac)}</td><td>${money(pa)}</td><td>${money(ac-pa)}</td></tr>`}).join("");document.getElementById("content").innerHTML=`<div class="toolbar"><select class="field" style="width:auto" onchange="salaryYear=this.value;salary()">${getYears().map(x=>`<option ${x===y?"selected":""}>${x}</option>`).join("")}</select><button type="button" class="primary" data-action="newPayout">+ Выдать зарплату</button><button type="button" class="secondary" data-action="manageStaff">Сотрудники</button></div><div class="card"><div class="section-title">Зарплата по годам и месяцам — ${y}</div><div style="overflow:auto"><table class="month-table"><tr><th>Месяц</th><th>ATLANT выручка</th><th>ASMAN выручка</th><th>Начислено</th><th>Выдано</th><th>Остаток</th></tr>${rows}</table></div></div><div class="card" style="margin-top:15px"><div class="section-title">Активные сотрудники — зарплата по дням</div><div class="employee-grid">${people.filter(s=>s.active).map(s=>{const q=salarySummary(s.name,s.store,from,to);return`<div class="card employee-card" data-year="${y}" onclick="employeeYearDetail('${esc(s.name)}',${y},'${esc(s.store)}')"><div class="muted">${s.store}</div><div class="big">${esc(s.name)}</div><div class="meta">Начислено: ${money(q.accrued)} · Выдано: ${money(q.paid)} · Остаток: ${money(q.balance)}</div></div>`}).join("")}</div></div><div class="card" style="margin-top:15px"><div class="section-title">Удалённые сотрудники</div>${people.filter(s=>!s.active).length?`<div class="employee-grid">${people.filter(s=>!s.active).map(s=>`<div class="card employee-card"><div class="muted">${s.store} · УДАЛЁН</div><div class="big">${esc(s.name)}</div><div class="meta">История сохранена</div><div class="toolbar"><button class="secondary" onclick="employeeYearDetail('${esc(s.name)}',${y},'${esc(s.store)}')">Смотреть</button><button class="primary" onclick="restoreStaff('${esc(s.name)}','${esc(s.store)}')">Вернуть</button></div></div>`).join("")}</div>`:`<div class="empty">Удалённых сотрудников нет.</div>`}</div></div><div class="card" style="margin-top:15px"><div class="section-title">История выдачи зарплаты</div>${db.payouts.length?`<table><tr><th>Дата</th><th>Сотрудник</th><th>Сумма</th><th>Комментарий</th><th>Статус</th><th></th></tr>${db.payouts.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(p=>`<tr><td>${p.date}</td><td>${esc(p.employee)}</td><td>${money(p.amount)}</td><td>${esc(p.note||"")}</td><td>${p.voided?"Исправлена/отменена":"Активна"}</td><td>${!p.voided?`<button class="secondary" onclick="editPayout('${p.id}')">Исправить</button><button class="danger-btn" onclick="voidPayout('${p.id}')">Отменить</button>`:""}</td></tr>`).join("")}</table>`:`<div class="empty">Выдач пока нет.</div>`}</div>`},
 salaryMonthDetail=function(y,m){if(role!=="owner")return alert("Нет доступа");const from=y+"-"+pad(m+1)+"-01",to=y+"-"+pad(m+1)+"-"+pad(daysInMonth(y,m)),people=allPeople().filter(s=>stores().includes(s.store));showModal(monthName(m)+" "+y,`<table><tr><th>Сотрудник</th><th>Рабочих дней</th><th>Выходных</th><th>Начислено</th><th>Выдано</th><th>Остаток</th></tr>${people.map(s=>{const q=salarySummary(s.name,s.store,from,to);return`<tr><td><span class="month-link" onclick="employeeMonthDetail('${esc(s.name)}','${esc(s.store)}',${y},${m})">${esc(s.name)}</span></td><td>${q.worked}</td><td>${q.off}</td><td>${money(q.accrued)}</td><td>${money(q.paid)}</td><td>${money(q.balance)}</td></tr>`}).join("")}</table>`)},
 employeeYearDetail=function(name,y,store){if(role!=="owner")return alert("Нет доступа");y=Number(y);const s=getStaffRecord(name,store)||getStaffRecord(name,stores()[0]);if(!s)return;const from=y+"-01-01",to=y+"-12-31",q=salarySummary(name,s.store,from,to),years=getYears();const rows=months.map((m,i)=>{const f=y+"-"+pad(i+1)+"-01",t=y+"-"+pad(i+1)+"-"+pad(daysInMonth(y,i)),z=salarySummary(name,s.store,f,t);return`<tr><td class="month-link" onclick="employeeMonthDetail('${esc(name)}','${esc(s.store)}',${y},${i})">${months[i]}</td><td>${z.worked}</td><td>${z.off}</td><td>${money(z.accrued)}</td><td>${money(z.paid)}</td><td>${money(z.balance)}</td></tr>`}).join("");showModal(`${esc(name)} — зарплата`, `<div class="toolbar"><label style="margin:0">Год</label><select class="field year-select" onchange="employeeYearDetail('${esc(name)}',this.value,'${esc(s.store)}')">${years.map(v=>`<option ${+v===y?"selected":""}>${v}</option>`).join("")}</select></div><div class="salary-summary"><div class="detail-item"><div class="muted">Начислено</div><div class="v">${money(q.accrued)}</div></div><div class="detail-item"><div class="muted">Выдано</div><div class="v">${money(q.paid)}</div></div><div class="detail-item"><div class="muted">Остаток</div><div class="v">${money(q.balance)}</div></div></div><div class="detail-grid"><div class="detail-item"><div class="muted">Сотрудник</div><div class="v">${esc(name)}</div></div><div class="detail-item"><div class="muted">Магазин</div><div class="v">${esc(s.store)}</div></div></div><div class="card" style="margin-top:12px"><table><tr><th>Месяц</th><th>Рабочих</th><th>Выходных</th><th>Начислено</th><th>Выдано</th><th>Остаток</th></tr>${rows}</table></div>`)},
 employeeMonthDetail=function(name,store,y,m){if(role!=="owner")return alert("Нет доступа");const from=y+"-"+pad(m+1)+"-01",to=y+"-"+pad(m+1)+"-"+pad(daysInMonth(y,m)),q=salarySummary(name,store,from,to);const rows=q.schedule.map(x=>{const manual=x.manualRevenue;return`<tr><td>${x.date}</td><td class="${x.worked?"day-work":"day-off"}">${x.worked?"РАБОТА":"ВЫХОДНОЙ"}</td><td>${x.worked?money(x.report.revenue):"—"}</td><td>${x.worked?money(x.salaryRevenue):"—"}</td><td>${x.rate?x.rate.pct+"% + "+money(x.rate.fixed):"—"}</td><td>${x.worked?money(x.gross):"0 ₽"}</td><td>${money(fineAmount(name,x.date,store))}</td><td>${money(x.deduction)}</td><td>${money(x.net)}</td><td>${money(payoutAmount(name,x.date,x.date,store))}</td><td>${x.worked?`<button class="secondary" onclick="setOtherRevenue('${esc(name)}','${esc(store)}','${x.date}')">${manual?"Изменить":"Другая выручка"}</button>${manual?`<div class="mini" style="margin-top:5px">${esc(manual.note||"")}</div><button class="danger-btn" style="margin-top:5px" onclick="clearOtherRevenue('${esc(name)}','${esc(store)}','${x.date}')">Сбросить</button>`:""}`:"—"}</td></tr>`}).join("");showModal(`${esc(name)} — ${monthName(m)} ${y}`,`<div class="salary-summary"><div class="detail-item"><div class="muted">Начислено</div><div class="v">${money(q.accrued)}</div></div><div class="detail-item"><div class="muted">Выдано</div><div class="v">${money(q.paid)}</div></div><div class="detail-item"><div class="muted">Остаток</div><div class="v">${money(q.balance)}</div></div></div><div style="overflow:auto"><table><tr><th>Дата</th><th>Статус</th><th>Общая выручка</th><th>Выручка для зарплаты</th><th>Ставка</th><th>До штрафа</th><th>Штраф</th><th>Удержано</th><th>К начислению</th><th>Выдано</th><th>Корректировка</th></tr>${rows}</table></div>`)},
 setOtherRevenue=function(name,store,date){if(role!=="owner")return alert("Нет доступа");const current=otherRevenueFor(name,store,date),report=latestReport(store,date);if(!report||!report.staff.includes(name))return alert("В этот день сотрудник не указан в последнем активном отчёте.");showModal("Другая выручка",`<label>Сотрудник</label><input class="field" value="${esc(name)}" disabled><label>Дата</label><input class="field" value="${esc(date)}" disabled><label>Выручка для зарплаты</label><input id="or_amount" class="field" type="number" min="0" step="1" value="${current?Number(current.amount):""}" placeholder="Например, 50000"><label>Комментарий</label><input id="or_note" class="field" value="${esc(current?.note||"")}" placeholder="Например: пришёл с обеда"><button class="primary full" onclick="saveOtherRevenue('${esc(name)}','${esc(store)}','${date}')">Сохранить</button>`)},
 saveOtherRevenue=function(name,store,date){if(role!=="owner")return alert("Нет доступа");const amount=Number(document.getElementById("or_amount")?.value);const note=(document.getElementById("or_note")?.value||"").trim();if(!stores().includes(store)||!isValidDateString(date))return alert("Некорректный магазин или дата");const report=latestReport(store,date);if(!report||!Array.isArray(report.staff)||!report.staff.includes(name))return alert("Сотрудник не указан в последнем активном отчёте за эту дату");if(!Number.isFinite(amount)||amount<0)return alert("Укажи корректную сумму");const idx=db.otherRevenue.findIndex(x=>x.employee===name&&x.store===store&&x.date===date);const obj={id:idx>=0?db.otherRevenue[idx].id:String(Date.now())+Math.random(),employee:name,store,date,amount,note,createdAt:idx>=0?(db.otherRevenue[idx].createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:role};const before=idx>=0?{...db.otherRevenue[idx]}:null;if(idx>=0)db.otherRevenue[idx]=obj;else db.otherRevenue.push(obj);if(!save()){if(idx>=0)db.otherRevenue[idx]=before;else db.otherRevenue.pop();return;}logAudit("other_revenue_change",{old:before,new:{...obj}});closeModal();employeeMonthDetail(name,store,Number(date.slice(0,4)),Number(date.slice(5,7))-1)},
 clearOtherRevenue=function(name,store,date){if(role!=="owner")return;const idx=db.otherRevenue.findIndex(x=>x.employee===name&&x.store===store&&x.date===date);if(idx<0)return;if(!confirm("Сбросить другую выручку? Зарплата снова будет считаться от общей выручки магазина."))return;const old={...db.otherRevenue[idx]};db.otherRevenue.splice(idx,1);if(!save()){db.otherRevenue.splice(idx,0,old);return;}logAudit("other_revenue_clear",{old});employeeMonthDetail(name,store,Number(date.slice(0,4)),Number(date.slice(5,7))-1)},
 newPayout=function(){if(role!=="owner")return alert("Нет доступа");showModal("Выдать зарплату",`<label>Сотрудник</label><select id="p_emp" class="field">${allPeople().map(s=>`<option value="${esc(s.name)}" data-store="${esc(s.store)}">${esc(s.name)} — ${s.store}${s.active?"":" (удалён)"}</option>`).join("")}</select><label>Дата выдачи</label><input id="p_date" class="field" type="date" required value="${ymd(new Date())}"><label>Сумма</label><input id="p_amount" class="field" type="number" min="0" step="1" placeholder="Например, 20000"><label>Причина / комментарий</label><input id="p_note" class="field" placeholder="Например: аванс, выдача за месяц"><button type="button" class="primary full payout-submit" onclick="savePayout()">Выдать зарплату</button>`)},
 savePayout=function(){if(role!=="owner")return alert("Нет доступа");const g=id=>document.getElementById(id),employee=g("p_emp")?.value||"",opt=g("p_emp")?.selectedOptions?.[0],store=opt?.dataset.store||"",date=g("p_date")?.value||"",amount=Number(g("p_amount")?.value)||0,note=(g("p_note")?.value||"").trim();if(!employee||!store||!employeeExistsInStore(employee,store)||!validateDateValue(date,"Дата выдачи")||!Number.isFinite(amount)||amount<=0)return alert("Заполни сотрудника, его магазин, корректную дату и сумму");if(!getStaffRecord(employee,store))return alert("Сотрудник не найден в выбранном магазине");const payout={id:String(Date.now())+Math.random(),employee,store,date,amount,note,createdAt:new Date().toISOString(),createdBy:role,voided:false};db.payouts.push(payout);db.payoutHistory.push({type:"created",payoutId:payout.id,at:new Date().toISOString(),by:role,snapshot:{...payout}});if(!save()){db.payouts.pop();db.payoutHistory.pop();return;}logAudit("payout_create",{new:{...payout}});closeModal();salary()},
 editPayout=function(id){if(role!=="owner")return;const p=db.payouts.find(x=>String(x.id)===String(id)&&!x.voided);if(!p)return;showModal("Исправить выдачу зарплаты",`<label>Сотрудник</label><input class="field" value="${esc(p.employee)}" disabled><label>Дата</label><input id="ep_date" class="field" type="date" required value="${p.date}"><label>Новая сумма</label><input id="ep_amount" class="field" type="number" value="${p.amount}"><label>Причина / комментарий</label><input id="ep_note" class="field" value="${esc(p.note||"")}"><button class="primary full" onclick="savePayoutEdit('${p.id}')">Сохранить исправление</button>`)},
 savePayoutEdit=function(id){if(role!=="owner")return alert("Нет доступа");const p=db.payouts.find(x=>String(x.id)===String(id)&&!x.voided);if(!p)return;const oldPayout={...p};const date=document.getElementById("ep_date").value,amount=Number(document.getElementById("ep_amount").value)||0,note=document.getElementById("ep_note").value.trim();if(!validateDateValue(date,"Дата выдачи")||!Number.isFinite(amount)||amount<=0)return alert("Укажи корректную дату и сумму");p.voided=true;p.voidedAt=new Date().toISOString();p.voidedBy=role;p.replacedBy=String(Date.now())+Math.random();const replacement={id:p.replacedBy,employee:p.employee,store:p.store||findEmployeeStore(p.employee),date,amount,note,createdAt:new Date().toISOString(),createdBy:role,voided:false,replaces:p.id};db.payouts.push(replacement);db.payoutHistory.push({type:"edited",payoutId:p.id,replacementId:replacement.id,at:new Date().toISOString(),by:role,old:{...p},new:{...replacement}});if(!save()){Object.assign(p,oldPayout);db.payouts.pop();db.payoutHistory.pop();return;}logAudit("payout_edit",{payoutId:p.id,replacementId:replacement.id});closeModal();salary()},
 voidPayout=function(id){if(role!=="owner")return;const p=db.payouts.find(x=>String(x.id)===String(id)&&!x.voided);if(!p)return;if(!confirm("Отменить выдачу? Она останется в истории, но перестанет участвовать в расчётах."))return;const beforePayout={...p};p.voided=true;p.voidedAt=new Date().toISOString();p.voidedBy=role;db.payoutHistory.push({type:"voided",payoutId:p.id,at:new Date().toISOString(),by:role,snapshot:{...p}});if(!save()){Object.assign(p,beforePayout);db.payoutHistory.pop();return;}logAudit("payout_void",{payoutId:p.id});salary()},
 manageStaff=function(){if(role!=="owner")return alert("Нет доступа");const active=allStaff(),deleted=db.deletedStaff;showModal("Сотрудники",`<div class="toolbar"><button class="primary" onclick="addStaff()">+ Добавить сотрудника</button></div><h3>Активные</h3><table><tr><th>Имя</th><th>Магазин</th><th></th></tr>${active.map((s,i)=>`<tr><td>${esc(s.name)}</td><td>${s.store}</td><td><button class="danger-btn" onclick="removeStaff(${i})">Уволить</button></td></tr>`).join("")}</table><h3 style="margin-top:20px">Удалённые</h3>${deleted.length?`<table><tr><th>Имя</th><th>Магазин</th><th>Удалён</th><th></th></tr>${deleted.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.store}</td><td>${esc(s.deletedAt||"")}</td><td><button class="secondary" onclick="restoreStaff('${esc(s.name)}','${esc(s.store)}')">Вернуть</button></td></tr>`).join("")}</table>`:`<div class="empty">Удалённых сотрудников нет.</div>`}`)},
 addStaff=function(){if(role!=="owner")return alert("Нет доступа");showModal("Добавить сотрудника",`<label>Имя</label><input id="ns_name" class="field"><label>Магазин</label><select id="ns_store" class="field"><option>ATLANT</option><option>ASMAN</option></select><button class="primary full" onclick="saveStaff()">Добавить</button>`)},
 saveStaff=function(){if(role!=="owner")return alert("Нет доступа");const n=document.getElementById("ns_name").value.trim(),s=document.getElementById("ns_store").value;if(!n)return alert("Укажи имя");if(db.staff.some(x=>x.name===n&&x.store===s))return alert("Такой сотрудник уже есть");if(db.deletedStaff.some(x=>x.name===n&&x.store===s))return alert("Такой сотрудник уже есть в удалённых. Используй восстановление, чтобы вернуть его.");const staff={name:n,store:s,createdAt:new Date().toISOString()};db.staff.push(staff);if(!save()){db.staff.pop();return;}logAudit("staff_created",{new:{...staff}});closeModal();salary()},
 removeStaff=function(i){if(role!=="owner")return;const s=db.staff[i];if(!s)return;if(!confirm("Уволить сотрудника? Все старые данные и отчёты сохранятся."))return;const before={...s};db.staff.splice(i,1);const archived={...s,deletedAt:ymd(new Date()),deletedBy:role};db.deletedStaff.push(archived);if(!save()){db.deletedStaff.pop();db.staff.splice(i,0,s);return;}logAudit("staff_deleted",{old:before,new:{...archived}});manageStaff()},
 restoreStaff=function(name,store){if(role!=="owner")return;const i=db.deletedStaff.findIndex(x=>x.name===name&&x.store===store);if(i<0)return;const s=db.deletedStaff[i];if(db.staff.some(x=>x.name===name&&x.store===store))return alert("Нельзя вернуть: такой сотрудник уже активен в этом магазине.");const before={...s};db.deletedStaff.splice(i,1);delete s.deletedAt;delete s.deletedBy;db.staff.push(s);if(!save()){db.staff.pop();db.deletedStaff.splice(i,0,s);return;}logAudit("staff_restored",{old:before,new:{...s}});closeModal();salary()},
 zpdaily=function(){if(role!=="owner")return alert("Нет доступа");const dates=[...new Set(db.reports.filter(r=>!r.deleted&&stores().includes(r.store)&&isValidDateString(r.date)).map(r=>r.date))].sort().reverse(),people=allStaff().filter(s=>stores().includes(s.store));document.getElementById("content").innerHTML=`<div class="card old-style"><div style="overflow:auto"><table><thead><tr><th>Дата</th><th>ИТОГО</th>${people.map(s=>`<th>${esc(s.name)}<br><span class="muted">${esc(s.store)}</span></th>`).join("")}</tr></thead><tbody>${dates.length?dates.map(date=>{let total=0;const vals=people.map(s=>{const sch=salarySchedule(s.name,s.store,date,date)[0];const sal=sch?Number(sch.net)||0:0;total+=sal;return sal});return`<tr><td>${date}</td><td class="day-money">${money(total)}</td>${vals.map(v=>`<td>${v?money(v):"0"}</td>`).join("")}</tr>`}).join(""):`<tr><td colspan="${people.length+2}" class="empty">Нет данных</td></tr>`}</tbody></table></div></div>`},
 totals=function(){if(role!=="owner")return alert("Нет доступа");
 const years=getYears(), year=Number(window.totalsYear)||Number(new Date().getFullYear());
 const current=years.includes(year)?year:years[0]||new Date().getFullYear();
 const rowsMonths=months.map((name,m)=>({name,m,from:`${current}-${pad(m+1)}-01`,to:`${current}-${pad(m+1)}-${pad(daysInMonth(current,m))}`}));
 const ar=activeReports();
 const revenueFor=(store,from,to)=>ar.filter(x=>x.store===store&&x.date>=from&&x.date<=to).reduce((a,x)=>a+(Number(x.revenue)||0),0);
 const storesFor=stores();
 const revRows=storesFor.map(store=>{
   const vals=rowsMonths.map(x=>revenueFor(store,x.from,x.to));
   return {store,vals,total:vals.reduce((a,v)=>a+v,0)};
 });
 const revTotal=rowsMonths.map((x,i)=>revRows.reduce((a,r)=>a+r.vals[i],0));
 const revGrand=revTotal.reduce((a,v)=>a+v,0);
 const people=allPeople().filter(s=>storesFor.includes(s.store));
 const peopleRows=people.map(person=>{
   const vals=rowsMonths.map(x=>salarySummary(person.name,person.store,x.from,x.to).accrued);
   return {...person,vals,total:vals.reduce((a,v)=>a+v,0)};
 });
 const salaryTotal=rowsMonths.map((x,i)=>peopleRows.reduce((a,r)=>a+r.vals[i],0));
 const salaryGrand=salaryTotal.reduce((a,v)=>a+v,0);
 window.totalsYear=current;
 document.getElementById("content").innerHTML=`
 <div class="toolbar">
   <label style="margin:0">Год</label>
   <select class="field" style="max-width:180px" onchange="window.totalsYear=Number(this.value);totals()">${years.map(y=>`<option value="${y}" ${y===current?"selected":""}>${y}</option>`).join("")}</select>
 </div>
 
 <div class="card old-style">
   <div class="section-title">Выручка по магазинам</div>
   <div style="overflow:auto"><table class="totals-table"><thead><tr><th>Магазин</th>${rowsMonths.map(x=>`<th>${x.name}</th>`).join("")}<th>Итого</th></tr></thead><tbody>
     ${revRows.map(r=>`<tr class="store-row"><td>${r.store}</td>${r.vals.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(r.total)}</td></tr>`).join("")}
     <tr class="total-row"><td>ИТОГО</td>${revTotal.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(revGrand)}</td></tr>
   </tbody></table></div>
 </div>
 <div class="card old-style" style="margin-top:15px">
   <div class="section-title">ЗП сотрудникам</div>
   <div style="overflow:auto"><table class="totals-table"><thead><tr><th>Сотрудник</th>${rowsMonths.map(x=>`<th>${x.name}</th>`).join("")}<th>Итого</th></tr></thead><tbody>
     ${peopleRows.map(r=>`<tr class="employee-row ${r.active===false?"deleted-row":""}"><td>${esc(r.name)}${r.active===false?" <span class=\"muted\">(удалён)</span>":""}</td>${r.vals.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(r.total)}</td></tr>`).join("")}
     <tr class="total-row"><td>ИТОГО</td>${salaryTotal.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(salaryGrand)}</td></tr>
   </tbody></table></div>
 </div>`;
 },
 deletedreports=function(){if(role!=="owner")return alert("Нет доступа");
 const rows=db.reports.filter(r=>r.deleted).slice().sort((a,b)=>String(b.deletedAt||"").localeCompare(String(a.deletedAt||"")));
 document.getElementById("content").innerHTML=`<div class="card old-style"><div class="section-title">Удалённые отчёты</div>${rows.length?`<div style="overflow:auto"><table><tr><th>Дата</th><th>Магазин</th><th>Автор</th><th>Выручка</th><th>Удалён</th><th>Действия</th></tr>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.store)}</td><td>${esc(r.author||"—")}</td><td>${money(r.revenue)}</td><td>${esc(r.deletedAt||"—")}</td><td><button class="secondary" onclick="viewDeletedReport(${r.id})">Открыть</button><button class="primary" onclick="restoreReport(${r.id})">Восстановить</button></td></tr>`).join("")}</table></div>`:`<div class="empty">Удалённых отчётов нет.</div>`}</div>`;
},
viewDeletedReport=function(id){if(role!=="owner")return;const r=db.reports.find(x=>x.id===id&&x.deleted);if(!r)return;showModal("Удалённый отчёт",`<div class="toolbar"><span class="pill">${esc(r.store)}</span><span class="detail-date">${esc(r.date)}</span></div><div class="detail-grid"><div class="detail-item"><div class="muted">Автор</div><div class="v">${esc(r.author||"—")}</div></div><div class="detail-item"><div class="muted">Сотрудники</div><div class="v">${r.staff.map(esc).join(", ")}</div></div><div class="detail-item"><div class="muted">Выручка</div><div class="v">${money(r.revenue)}</div></div><div class="detail-item"><div class="muted">Удалён</div><div class="v">${esc(r.deletedAt||"—")}</div></div></div>${(r.photos|| (r.photo?[r.photo]:[])).length?`<div class="photo-gallery">${(r.photos|| (r.photo?[r.photo]:[])).slice(0,3).map((p,i)=>`<img class="detail-photo photo-zoomable" onclick="openPhotoViewer(this.src)" src="${p}" alt="Фото отчёта ${i+1}">`).join("")}</div>`:``}<div class="toolbar" style="margin-top:14px"><button class="primary" onclick="restoreReport(${r.id})">Восстановить отчёт</button></div>` )},
restoreReport=function(id){if(role!=="owner")return;const r=db.reports.find(x=>x.id===id&&x.deleted);if(!r)return;if(!reportCalcSafe(r))return alert("Нельзя восстановить отчёт: в нём некорректная дата, магазин или отрицательная/некорректная выручка.");const activeSameDay=db.reports.filter(x=>x.id!==id&&!x.deleted&&!x.legacyInvalid&&x.store===r.store&&x.date===r.date).length;if(activeSameDay>=3)return alert("Нельзя восстановить отчёт: для этого магазина и этой даты уже есть 3 активные версии.");const conflict=employeeBookedOtherStore(r.store,r.date,r.staff||[],id);if(conflict)return alert(`Нельзя восстановить отчёт: сотрудник ${conflict.staff.find(n=>(r.staff||[]).includes(n))} уже указан в магазине ${conflict.store} на эту дату.`);if(!confirm("Восстановить этот отчёт? Он снова будет участвовать в расчётах."))return;const before={...r};r.deleted=false;r.restoredAt=new Date().toISOString();r.restoredBy=role;if(!save()){Object.assign(r,before);return;}logAudit("report_restore",{reportId:id,old:before,new:{...r}});closeModal();deletedreports()},
revenue=function(){if(role!=="owner")return alert("Нет доступа");const r=activeReports(),dates=[...new Set(r.map(x=>x.date))].sort().reverse();document.getElementById("content").innerHTML=`<div class="grid"><div class="card kpi"><div class="muted">Общая выручка</div><div class="num">${money(r.reduce((a,x)=>a+x.revenue,0))}</div></div><div class="card kpi"><div class="muted">ATLANT</div><div class="num">${stores().includes("ATLANT")?money(r.filter(x=>x.store==="ATLANT").reduce((a,x)=>a+x.revenue,0)):"—"}</div></div><div class="card kpi"><div class="muted">ASMAN</div><div class="num">${stores().includes("ASMAN")?money(r.filter(x=>x.store==="ASMAN").reduce((a,x)=>a+x.revenue,0)):"—"}</div></div></div><div class="card" style="margin-top:15px"><div class="section-title">Выручка по дням</div><table><tr><th>Дата</th><th>ATLANT</th><th>ASMAN</th><th>Итого</th></tr>${dates.map(d=>{const a=latestReport("ATLANT",d),s=latestReport("ASMAN",d),av=stores().includes("ATLANT")&&a?a.revenue:0,sv=stores().includes("ASMAN")&&s?s.revenue:0;return`<tr><td>${d}</td><td>${stores().includes("ATLANT")?(a?money(av):"—"):"—"}</td><td>${stores().includes("ASMAN")?(s?money(sv):"—"):"—"}</td><td>${money(av+sv)}</td></tr>`}).join("")}</table></div>`},
 fines=function(){if(role!=="owner")return alert("Нет доступа");document.getElementById("content").innerHTML=`<div class="toolbar"><button class="primary" onclick="newFine()">+ Добавить штраф</button></div><div class="card">${db.fines.length?`<table><tr><th>Дата</th><th>Сотрудник</th><th>Причина</th><th>Сумма</th></tr>${db.fines.filter(f=>!f.voided).map(f=>`<tr><td>${f.date}</td><td>${esc(f.employee)}</td><td>${esc(f.reason)}</td><td>${money(f.amount)}</td></tr>`).join("")}</table>`:`<div class="empty">Штрафов пока нет.</div>`}</div>`},
 newFine=function(){if(role!=="owner")return alert("Нет доступа");showModal("Добавить штраф",`<label>Дата</label><input id="fd" class="field" type="date" required value="${ymd(new Date())}"><label>Сотрудник</label><select id="fe" class="field">${allPeople().map(s=>`<option value="${esc(s.name)}" data-store="${esc(s.store)}">${esc(s.name)} — ${esc(s.store)}</option>`).join("")}</select><label>Причина</label><input id="fr" class="field"><label>Сумма</label><input id="fa" class="field" type="number"><button class="primary full" onclick="saveFine()">Сохранить</button>`)},
 saveFine=function(){if(role!=="owner")return alert("Нет доступа");const g=id=>document.getElementById(id),amount=Number(g("fa").value)||0;if(!validateDateValue(g("fd")?.value,"Дата штрафа"))return;if(!Number.isFinite(amount)||amount<=0)return alert("Укажи сумму штрафа");const opt=g("fe").selectedOptions[0],store=opt?.dataset.store||findEmployeeStore(g("fe").value),employee=g("fe").value,reason=g("fr").value.trim();if(!employeeExistsInStore(employee,store))return alert("Сотрудник и магазин штрафа не совпадают");if(!reason)return alert("Укажи причину штрафа");const fine={id:Date.now()+Math.random(),date:g("fd").value,employee,store,reason,amount,voided:false};db.fines.push(fine);if(!save()){db.fines.pop();return;}logAudit("fine_create",{new:{...fine}});closeModal();fines()},
 rates=function(){if(role!=="owner")return alert("Нет доступа");const people=allPeople().filter(s=>stores().includes(s.store));const rows=db.rates.map((x,i)=>({x,i})).filter(({x})=>people.some(s=>s.name===x.employee&&s.store===x.store)).sort((a,b)=>String(b.x.date).localeCompare(String(a.x.date))).map(({x,i})=>`<tr><td><strong>${esc(x.employee)}</strong></td><td>${esc(x.store||"")}</td><td>${esc(x.date)}</td><td>${x.pct}%</td><td>${money(x.fixed)}</td><td><button class="secondary" onclick="editRate(${i})">Изменить</button></td></tr>`).join("");document.getElementById("content").innerHTML=`<div class="toolbar"><button class="primary" onclick="newRate()">+ Добавить новую ставку</button></div><div class="card"><table><tr><th>Сотрудник</th><th>Магазин</th><th>Действует с</th><th>%</th><th>Фикс / день</th><th></th></tr>${rows}</table></div>`},
 newRate=function(){if(role!=="owner")return alert("Нет доступа");rateForm(null,"Добавить новую ставку")},editRate=function(index){if(role!=="owner")return alert("Нет доступа");const visible=db.rates.filter(x=>stores().includes(x.store)).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));const r=visible[index];if(!r)return;rateForm(db.rates.indexOf(r),"Изменить ставку")},
 rateForm=function(index,titleText){const r=index===null?{employee:allStaff()[0]?.name||"",store:allStaff()[0]?.store||"ATLANT",date:ymd(new Date()),pct:0,fixed:0}:db.rates[index];showModal(titleText,`<div class="row"><div><label>Сотрудник</label><select id="q_emp" class="field">${allPeople().map(s=>`<option value="${esc(s.name)}" data-store="${s.store}" ${s.name===r.employee&&s.store===r.store?"selected":""}>${esc(s.name)} — ${s.store}</option>`).join("")}</select></div><div><label>Магазин</label><select id="q_store" class="field"><option ${r.store==="ATLANT"?"selected":""}>ATLANT</option><option ${r.store==="ASMAN"?"selected":""}>ASMAN</option></select></div></div><div class="row"><div><label>Дата начала действия</label><input id="q_date" class="field" type="date" required value="${r.date}"></div><div><label>Процент</label><input id="q_pct" class="field" type="number" step="0.1" value="${r.pct}"></div></div><label>Фиксированная сумма за рабочий день</label><input id="q_fixed" class="field" type="number" value="${r.fixed}"><button class="primary full" onclick="saveRate(${index===null?"null":index})">Сохранить ставку и пересчитать</button>`)},
 saveRate=function(index){if(role!=="owner")return alert("Нет доступа");const g=id=>document.getElementById(id),obj={employee:g("q_emp").value,store:g("q_store").value,date:g("q_date").value,pct:Number(g("q_pct").value)||0,fixed:Number(g("q_fixed").value)||0};if(!validateDateValue(obj.date,"Дата начала действия"))return;if(!((obj.store==="ATLANT")||(obj.store==="ASMAN")))return alert("Выбери корректный магазин");const staffRecord=getStaffRecord(obj.employee,obj.store);if(!staffRecord)return alert("Сотрудник не относится к выбранному магазину");const empStore=getStaffRecord(obj.employee,obj.store);if(!empStore)return alert("Сотрудник не относится к выбранному магазину");if(!Number.isFinite(obj.pct)||obj.pct<0||obj.pct>100||!Number.isFinite(obj.fixed)||obj.fixed<0)return alert("Укажи ставку: процент от 0 до 100 и неотрицательную фиксированную сумму");if(obj.pct>100)return alert("Процент ставки не может быть больше 100%");const beforeRates=db.rates.map(x=>({...x}));if(index===null){const same=db.rates.findIndex(x=>x.employee===obj.employee&&x.store===obj.store&&x.date===obj.date);if(same>=0)db.rates[same]={...db.rates[same],...obj};else db.rates.push({...obj,id:Date.now()+Math.random()});}else{if(!db.rates[index])return alert("Ставка не найдена");db.rates[index]={...db.rates[index],...obj};}if(!save()){db.rates=beforeRates;return;}logAudit("rate_change",{employee:obj.employee,store:obj.store,date:obj.date});closeModal();salary()},
 security=function(){if(role!=="owner")return;const rows=["owner","atlant","asman"].map(a=>{const s=db.accountSecurity[a]||{};return`<tr><td><strong>${accountLabel(a)}</strong></td><td>${s.locked?"🔒 Заблокирован":"Активен"}</td><td>${Number(s.failedAttempts||0)}</td><td>${s.lockedAt||"—"}</td><td>${s.locked?`<button class="primary" onclick="unlockAccount('${a}')">Разблокировать</button>`:"—"}</td></tr>`}).join("");document.getElementById("content").innerHTML=`<div class="card"><h3>Почтовая защита</h3><p class="muted">Почтовый код отправляется сервером. API-ключ Resend не хранится в браузере. Для работы реальной отправки при запуске start.bat должны быть заданы OWNER_EMAIL и RESEND_API_KEY.</p></div><div class="card"><h3>Состояние аккаунтов</h3><table><tr><th>Аккаунт</th><th>Статус</th><th>Ошибок</th><th>Заблокирован</th><th></th></tr>${rows}</table></div><div class="card" style="margin-top:15px"><h3>Логины аккаунтов</h3><table><tr><th>Аккаунт</th><th>Логин</th><th></th></tr>${["owner","atlant","asman"].map(a=>`<tr><td>${accountLabel(a)}</td><td>${esc(db.authCredentials[a]?.username||"—")}</td><td><button class="secondary" onclick="changeCredentials('${a}')">Изменить логин/пароль</button></td></tr>`).join("")}</table></div><div class="card" style="margin-top:15px"><h3>Полный журнал действий</h3>${db.audit.length?`<div style="overflow:auto"><table><tr><th>Время</th><th>Действие</th><th>Роль</th><th>Подробности</th></tr>${db.audit.slice().reverse().map(a=>`<tr><td>${esc(a.at)}</td><td>${esc(a.type)}</td><td>${esc(a.role)}</td><td><pre style="white-space:pre-wrap;margin:0">${esc(JSON.stringify(a.details||{},null,2))}</pre></td></tr>`).join("")}</table></div>`:`<div class="empty">Событий пока нет.</div>`}</div>`},
 backup=function(){if(role!=="owner")return alert("Нет доступа");document.getElementById("content").innerHTML=`<div class="toolbar"><button class="primary" onclick="exportData()">Экспорт всех данных</button><button class="secondary" onclick="document.getElementById('importFile').click()">Импорт данных</button><input id="importFile" type="file" accept=".json" hidden onchange="importData(event)"></div>`},
 exportData=function(){if(role!=="owner")return alert("Нет доступа");const exportDb=JSON.parse(JSON.stringify(db));exportDb.reports=(exportDb.reports||[]).map(r=>{if(!reportCalcSafe(r)&&!r.deleted)r.legacyInvalid=true;return r});const payload={format:"ATLANT_ASMAN_FULL_BACKUP",version:"1.50.4",exportedAt:new Date().toISOString(),data:exportDb};const blob=new Blob([JSON.stringify(payload)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ATLANT_ASMAN_FULL_BACKUP.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},
 validateBackupData=function(safe){
 if(!Array.isArray(safe.staff)||!Array.isArray(safe.deletedStaff)||!Array.isArray(safe.reports)||!Array.isArray(safe.fines)||!Array.isArray(safe.payouts)||!Array.isArray(safe.rates)||!Array.isArray(safe.otherRevenue)||!Array.isArray(safe.audit)||!Array.isArray(safe.payoutHistory))return "Нарушена структура резервной копии";
 const activeNames=new Set(), deletedNames=new Set(), allEmployeeKeys=new Set();
 for(const s of [...safe.staff,...safe.deletedStaff]){if(!s||typeof s.name!=="string"||!s.name.trim()||!((s.store==="ATLANT")||(s.store==="ASMAN")))return "Обнаружен сотрудник с некорректным именем или магазином";const key=s.name.trim()+"|"+s.store;const set=s.deletedAt?deletedNames:activeNames;if(set.has(key)||allEmployeeKeys.has(key))return "В резервной копии найден дубликат сотрудника: "+s.name+" — "+s.store;set.add(key);allEmployeeKeys.add(key);}for(const key of activeNames){if(deletedNames.has(key))return "Сотрудник одновременно числится активным и удалённым: "+key.split("|")[0]+" — "+key.split("|")[1];}
 const personExists=(name,store)=>!!name&&((safe.staff.some(s=>s.name===name&&s.store===store))||(safe.deletedStaff.some(s=>s.name===name&&s.store===store)));
 const pairStore=(name,store)=>personExists(name,store);
 for(const r of safe.reports){if(!r||typeof r!=="object")return "Обнаружен повреждённый отчёт";const invalid=!isValidDateString(r.date)||!((r.store==="ATLANT")||(r.store==="ASMAN"))||!Number.isFinite(Number(r.revenue))||Number(r.revenue)<0; if(invalid&&!r.deleted&&!r.legacyInvalid)return `Обнаружен новый отчёт с некорректной датой, магазином или отрицательной/некорректной выручкой: ${r?.date||"—"}`; if(!Array.isArray(r.staff)||!r.staff.length)return "Обнаружен отчёт без сотрудников"; if(new Set(r.staff).size!==r.staff.length)return "В отчёте обнаружен один и тот же сотрудник несколько раз"; if(!invalid&&r.staff.some(n=>!personExists(n,r.store)))return "Обнаружен отчёт с сотрудником не из этого магазина"; if(!invalid&&(!r.author||!r.staff.includes(r.author)||!personExists(r.author,r.store)))return "Обнаружен отчёт с некорректным автором"; if(!r.id)return "Обнаружен отчёт без ID"; const trs=Array.isArray(r.transfers)?r.transfers:[]; if(trs.length>3)return "В отчёте больше 3 переводов"; for(const t of trs){if(!t||!Number.isFinite(Number(t.amount))||Number(t.amount)<0)return "В отчёте обнаружен некорректный перевод";}}
 const ids=new Set();for(const r of safe.reports){const k=String(r.id);if(ids.has(k))return "В резервной копии найдены два отчёта с одинаковым ID";ids.add(k)}
 const payoutIds=new Set();for(const p of safe.payouts){if(!p||!isValidDateString(p.date)||!Number.isFinite(Number(p.amount))||Number(p.amount)<=0||!p.employee||!p.store||!((p.store==="ATLANT")||(p.store==="ASMAN"))||!personExists(p.employee,p.store))return "Обнаружена некорректная выплата";const k=String(p.id||"");if(!k||payoutIds.has(k))return "В резервной копии найдена выплата с отсутствующим или дублирующимся ID";payoutIds.add(k)}
 const fineIds=new Set();for(const f of safe.fines){if(!f||!isValidDateString(f.date)||!Number.isFinite(Number(f.amount))||Number(f.amount)<=0||!f.employee||!f.store||!((f.store==="ATLANT")||(f.store==="ASMAN"))||!personExists(f.employee,f.store))return "Обнаружен некорректный штраф";const k=String(f.id||"");if(!k||fineIds.has(k))return "В резервной копии найден штраф с отсутствующим или дублирующимся ID";fineIds.add(k);}
 const rateKeys=new Set();for(const r of safe.rates){if(!r||!isValidDateString(r.date)||!r.employee||!((r.store==="ATLANT")||(r.store==="ASMAN"))||!Number.isFinite(Number(r.pct))||Number(r.pct)<0||Number(r.pct)>100||!Number.isFinite(Number(r.fixed))||Number(r.fixed)<0)return "Обнаружена некорректная ставка";if(!personExists(r.employee,r.store))return "Ставка привязана к сотруднику другого магазина или к несуществующему сотруднику";const k=r.employee+"|"+r.store+"|"+r.date;if(rateKeys.has(k))return "В резервной копии найдены две ставки одного сотрудника на одну дату";rateKeys.add(k);}
 const otherKeys=new Set();for(const o of safe.otherRevenue){if(!o||!isValidDateString(o.date)||!o.employee||!((o.store==="ATLANT")||(o.store==="ASMAN"))||!Number.isFinite(Number(o.amount))||Number(o.amount)<0||!personExists(o.employee,o.store))return "Обнаружена некорректная запись «Другая выручка»";const k=o.employee+"|"+o.store+"|"+o.date;if(otherKeys.has(k))return "В резервной копии найдены две записи «Другой выручки» на одну дату";otherKeys.add(k);}
 const dayCounts=new Map();for(const r of safe.reports.filter(r=>!r.deleted&&!r.legacyInvalid&&reportCalcSafe(r))){const key=r.store+"|"+r.date;const n=(dayCounts.get(key)||0)+1;if(n>3)return `Обнаружено больше 3 активных версий отчёта за ${r.store} ${r.date}`;dayCounts.set(key,n);const conflict=safe.reports.find(x=>!x.deleted&&!x.legacyInvalid&&reportCalcSafe(x)&&x.id!==r.id&&x.store!==r.store&&x.date===r.date&&Array.isArray(x.staff)&&x.staff.some(nm=>r.staff.includes(nm)));if(conflict)return `Сотрудник указан одновременно в двух магазинах за ${r.date}`;}
 return ""},
 importData=function(e){if(role!=="owner")return alert("Нет доступа");const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const raw=JSON.parse(rd.result),incoming=raw.data||raw;if(!incoming||typeof incoming!=="object"||!Array.isArray(incoming.reports))throw new Error("Неверный формат резервной копии");const safe={...incoming,reports:Array.isArray(incoming.reports)?incoming.reports:[],fines:Array.isArray(incoming.fines)?incoming.fines:[],payouts:Array.isArray(incoming.payouts)?incoming.payouts:[],rates:Array.isArray(incoming.rates)?incoming.rates:[],otherRevenue:Array.isArray(incoming.otherRevenue)?incoming.otherRevenue:[],staff:Array.isArray(incoming.staff)?incoming.staff:[],deletedStaff:Array.isArray(incoming.deletedStaff)?incoming.deletedStaff:[],audit:Array.isArray(incoming.audit)?incoming.audit:[],payoutHistory:Array.isArray(incoming.payoutHistory)?incoming.payoutHistory:[],settings:(incoming.settings&&typeof incoming.settings==="object")?incoming.settings:{}};safe.reports=safe.reports.filter(r=>r&&typeof r==="object").map(r=>({...r,staff:Array.isArray(r.staff)?r.staff:[],photo:r.photo||((Array.isArray(r.photos)&&r.photos[0])||null),photos:Array.isArray(r.photos)?r.photos.slice(0,3):(r.photo?[r.photo]:[]),legacyInvalid:!!r.legacyInvalid}));const inferIncomingStore=name=>{const a=safe.staff.filter(x=>x.name===name),d=safe.deletedStaff.filter(x=>x.name===name);return a.length===1?a[0].store:(d.length===1?d[0].store:"")};safe.payouts=safe.payouts.map(p=>({...p,voided:!!p.voided,store:p.store||inferIncomingStore(p.employee)}));safe.fines=safe.fines.map(f=>({...f,voided:!!f.voided,store:f.store||inferIncomingStore(f.employee)}));safe.payouts=safe.payouts.map(p=>({...p,amount:Number(p.amount)}));safe.fines=safe.fines.map(f=>({...f,amount:Number(f.amount)}));safe.rates=safe.rates.map(r=>({...r,pct:Number(r.pct),fixed:Number(r.fixed)}));safe.reports=safe.reports.map(r=>({...r,revenue:Number(r.revenue),terminal:Number(r.terminal)||0,payout:Number(r.payout)||0}));const backupError=validateBackupData(safe);if(backupError)return alert("Импорт отклонён: "+backupError);const count={reports:safe.reports.length,staff:safe.staff.length,deletedStaff:safe.deletedStaff.length,payouts:safe.payouts.length,fines:safe.fines.length,rates:safe.rates.length,photos:safe.reports.reduce((n,r)=>n+(Array.isArray(r.photos)?Math.min(3,r.photos.length):(r.photo?1:0)),0),audit:safe.audit.length,payoutHistory:safe.payoutHistory.length,otherRevenue:Array.isArray(safe.otherRevenue)?safe.otherRevenue.length:0};if(confirm(`Найдено в резервной копии:
Отчётов: ${count.reports}
Активных сотрудников: ${count.staff}
Удалённых сотрудников: ${count.deletedStaff}
Выплат: ${count.payouts}
Штрафов: ${count.fines}
Ставок: ${count.rates}
Фотографий: ${count.photos}
Журнал действий: ${count.audit}
История выплат: ${count.payoutHistory}
Другая выручка: ${count.otherRevenue}

Импортировать и заменить текущие данные?`)){const oldDb=db;db=safe;if(!save()){db=oldDb;return;}alert("Импорт выполнен. Все данные восстановлены.");location.reload()}}catch(err){alert("Ошибка импорта: "+err.message)}finally{e.target.value=""}};rd.readAsText(f)}, managePayoutHistory=function(){},
 showDeletedReports=function(){deletedreports()};
let photoZoomLevel=1;function openPhotoViewer(src){const v=document.getElementById("photoViewer"),im=document.getElementById("photoViewerImg");if(!v||!im)return;im.src=src;photoZoomLevel=1;im.style.transform="scale(1)";v.style.display="flex"}function closePhotoViewer(){const v=document.getElementById("photoViewer");if(v)v.style.display="none"}function photoZoom(delta){photoZoomLevel=Math.min(4,Math.max(.5,photoZoomLevel+delta));const im=document.getElementById("photoViewerImg");if(im)im.style.transform=`scale(${photoZoomLevel})`}function photoReset(){photoZoomLevel=1;const im=document.getElementById("photoViewerImg");if(im)im.style.transform="scale(1)"}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePhotoViewer();if(e.key==="+")photoZoom(.2);if(e.key==="-")photoZoom(-.2)});

document.addEventListener("wheel",e=>{const v=document.getElementById("photoViewer");if(v&&v.style.display==="flex"){e.preventDefault();photoZoom(e.deltaY<0?.2:-.2)}},{passive:false});


/* v1.45: owner-only GigaChat AI assistant. The browser never receives the GigaChat API key.
   The local Node proxy reads GIGACHAT_API_KEY from the process environment and calls
   GigaChat server-side. */
let aiMessages=[];
const aiStoreSnapshot=()=>{
  if(role!=="owner")return null;
  const reports=activeReports().map(r=>({id:r.id,date:r.date,store:r.store,revenue:Number(r.revenue)||0,terminal:Number(r.terminal)||0,payout:Number(r.payout)||0,staff:Array.isArray(r.staff)?r.staff:[],author:r.author||"",transfers:(Array.isArray(r.transfers)?r.transfers:[]).map(t=>({amount:Number(t.amount)||0,recipient:t.recipient||"",bank:t.bank||""})),comment:r.comment||""}));
  const people=allPeople().filter(x=>stores().includes(x.store)).map(x=>({name:x.name,store:x.store,active:!!x.active}));
  const rates=(Array.isArray(db.rates)?db.rates:[]).map(x=>({employee:x.employee,store:x.store,date:x.date,pct:Number(x.pct)||0,fixed:Number(x.fixed)||0}));
  const fines=(Array.isArray(db.fines)?db.fines:[]).filter(x=>!x.voided).map(x=>({employee:x.employee,store:x.store,date:x.date,amount:Number(x.amount)||0,note:x.note||""}));
  const payouts=(Array.isArray(db.payouts)?db.payouts:[]).filter(x=>!x.voided).map(x=>({employee:x.employee,store:x.store,date:x.date,amount:Number(x.amount)||0,note:x.note||""}));
  const otherRevenue=(Array.isArray(db.otherRevenue)?db.otherRevenue:[]).map(x=>({employee:x.employee,store:x.store,date:x.date,amount:Number(x.amount)||0,note:x.note||""}));
  const salary=[];
  for(const p of people){
    const years=getYears();
    for(const y of years){
      const q=salarySummary(p.name,p.store,`${y}-01-01`,`${y}-12-31`);
      salary.push({employee:p.name,store:p.store,year:y,accrued:Math.round(q.accrued),paid:Math.round(q.paid),balance:Math.round(q.balance),worked:q.worked});
    }
  }
  return {reports,people,rates,fines,payouts,otherRevenue,salary,generatedAt:new Date().toISOString()};
};
const aiAsk=async(question,quickMode=false)=>{
  if(role!=="owner")return alert("Нет доступа");
  question=String(question||"").trim();
  if(!question)return;
  const box=document.getElementById("aiMessages");
  aiMessages.push({role:"user",text:question});
  if(box)box.innerHTML=aiMessages.map(m=>`<div class="ai-msg ${m.role==='user'?'user':'ai'}">${esc(m.text)}</div>`).join("");
  if(box)box.scrollTop=box.scrollHeight;
  const status=document.getElementById("aiStatus"); if(status)status.textContent="ИИ анализирует данные…";
  const btn=document.getElementById("aiSend"); if(btn)btn.disabled=true;
  try{
    const payload={question,snapshot:aiStoreSnapshot(),history:aiMessages.slice(-10).map(x=>({role:x.role,text:x.text})),quickMode:!!quickMode};
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||`Ошибка ИИ (${res.status})`);
    const answer=String(data.answer||"Нет ответа");
    aiMessages.push({role:"ai",text:answer});
    if(box)box.innerHTML=aiMessages.map(m=>`<div class="ai-msg ${m.role==='user'?'user':'ai'}">${esc(m.text)}</div>`).join("");
    if(box)box.scrollTop=box.scrollHeight;
    if(status)status.textContent=`GigaChat · ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`;
    logAudit("ai_query",{question,quickMode:true});
  }catch(err){
    aiMessages.push({role:"ai",text:"Не удалось получить ответ: "+(err.message||err)});
    if(box)box.innerHTML=aiMessages.map(m=>`<div class="ai-msg ${m.role==='user'?'user':'ai'}">${esc(m.text)}</div>`).join("");
    if(status)status.textContent="Ошибка подключения к ИИ";
  }finally{if(btn)btn.disabled=false;if(box)box.scrollTop=box.scrollHeight;}
};
const aiQuick=prompt=>aiAsk(prompt,true);
ai=function(){
  if(role!=="owner")return alert("Нет доступа");
  if(!aiMessages.length)aiMessages=[{role:"ai",text:"Я готов анализировать данные ATLANT и ASMAN. Я не изменяю отчёты, зарплаты или выплаты — только анализирую данные, которые уже рассчитала программа."}];
  document.getElementById("content").innerHTML=`<div class="ai-wrap"><div class="card ai-chat"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><div class="section-title">🤖 ATLANT / ASMAN AI</div><div class="ai-status" id="aiStatus">GigaChat AI · только владелец</div></div><span class="ai-badge">ТОЛЬКО ЧТЕНИЕ</span></div><div class="ai-actions"><button class="secondary" onclick="aiQuick('Проведи полный анализ бизнеса ATLANT и ASMAN за все доступные периоды. Найди сильные стороны, проблемы, резкие изменения и дай конкретные выводы.')">🔍 Полный анализ</button><button class="secondary" onclick="aiQuick('Сравни ATLANT и ASMAN по выручке, зарплатам и динамике. Покажи, где показатели лучше и хуже.')">⚖️ Сравнить магазины</button><button class="secondary" onclick="aiQuick('Найди подозрительные или необычные данные в отчётах, выплатах, штрафах, ставках и других доходах. Ничего не меняй.')">🚨 Найти аномалии</button><button class="secondary" onclick="aiQuick('Сделай краткую финансовую сводку владельцу по текущим данным.')">📊 Сводка</button></div><div id="aiMessages" class="ai-messages"></div><div class="ai-input"><textarea id="aiQuestion" class="field" placeholder="Например: почему в сентябре упала выручка ATLANT?"></textarea><button id="aiSend" class="primary" onclick="aiAsk(document.getElementById('aiQuestion').value);document.getElementById('aiQuestion').value=''">Отправить</button></div></div><div><div class="card"><div class="section-title">Что умеет</div><div class="ai-list"><div class="ai-note">📈 Анализ выручки</div><div class="ai-note">₽ Зарплаты и выплаты</div><div class="ai-note">🏪 Сравнение ATLANT / ASMAN</div><div class="ai-note">🚨 Поиск аномалий</div><div class="ai-note">🧾 Анализ отчётов</div><div class="ai-note">💬 Ответы обычным языком</div></div></div><div class="card" style="margin-top:15px"><div class="section-title">Безопасность</div><div class="muted">API-ключ GigaChat не хранится в HTML и не отправляется браузеру. ИИ получает только данные, необходимые для анализа, без фотографий, паролей и секретов.</div></div></div></div>`;
  const box=document.getElementById("aiMessages");box.innerHTML=aiMessages.map(m=>`<div class="ai-msg ${m.role==='user'?'user':'ai'}">${esc(m.text)}</div>`).join("");box.scrollTop=box.scrollHeight;
};

/* v1.25: the application functions below are intentionally kept in one local scope
   for shared salary helpers, but every function used by inline HTML controls or
   the global navigation must be exposed on window. v1.19 forgot this and left
   the post-login screen empty because go() was not global. */
Object.assign(window,{
  buildNav,go,dashboard,reports,openStoreReports,viewReportById,viewReportObj,newReport,
  renderStaffV13,renderEditStaffV13,saveReportV13,editReportV13,saveEditV13,deleteReportV13,openDeletedReports,totals,
  previewNewPhotoV13,previewEditPhotoV13,salary,salaryMonthDetail,employeeYearDetail,setOtherRevenue,saveOtherRevenue,clearOtherRevenue,
  employeeMonthDetail,newPayout,savePayout,editPayout,savePayoutEdit,voidPayout,
  manageStaff,addStaff,saveStaff,removeStaff,restoreStaff,zpdaily,revenue,fines,newFine,
  saveFine,rates,newRate,editRate,rateForm,saveRate,security,backup,exportData,importData,
  managePayoutHistory,showDeletedReports,deletedreports,viewDeletedReport,restoreReport,unlockAccount,ai,aiAsk,aiQuick
});

})();
