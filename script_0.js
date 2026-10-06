
(function(){
  function call(name,...args){
    try{
      if(typeof window[name]==='function') return window[name](...args);
    }catch(err){ console.error('ATLANT/ASMAN action '+name+' failed',err); alert('Ошибка: '+(err&&err.message?err.message:'не удалось выполнить действие')); }
  }
  document.addEventListener('click',function(e){
    const el=e.target && e.target.closest ? e.target.closest('button,[data-action],.employee-card,.month-link') : null;
    if(!el) return;

    /* Navigation is handled here independently of inline onclick. */
    if(el.matches('#nav button')){
      const id=el.id||'';
      if(id.indexOf('n_')===0){
        e.preventDefault(); e.stopImmediatePropagation();
        call('go',id.slice(2));
        return;
      }
    }

    const action=el.getAttribute('data-action');
    if(action){
      e.preventDefault(); e.stopImmediatePropagation();
      call(action,el.getAttribute('data-arg')||undefined);
      return;
    }

    if(el.classList.contains('payout-submit')) return;

    if(el.classList.contains('new-report-btn')){
      e.preventDefault(); e.stopImmediatePropagation();
      call('newReport',el.getAttribute('data-store')||undefined);
      return;
    }

    /* Critical owner actions that were reported as dead. */
    const txt=(el.textContent||'').trim().replace(/\s+/g,' ');
    if(/^\+?\s*Выдать зарплату/.test(txt) && !el.closest('#modal')){
      e.preventDefault(); e.stopImmediatePropagation(); call('newPayout'); return;
    }
    if(el.classList.contains('employee-card')){
      if(e.target.closest && e.target.closest('button,a,input,select,textarea')) return;
      const name=el.querySelector('.big')?.textContent?.trim();
      const store=el.querySelector('.muted')?.textContent?.split(" · ")[0]?.trim()||"";
      const y=el.getAttribute('data-year') || (window.salaryYear || new Date().getFullYear());
      if(name){e.preventDefault();e.stopImmediatePropagation();call('employeeYearDetail',name,Number(y),store);return;}
    }
  },true);

  /* Expose the modal helpers used by inline controls. */
  window.closeModal=window.closeModal||function(){const m=document.getElementById('modal');if(m)m.style.display='none'};
  window.showModal=window.showModal||function(t,b){const a=document.getElementById('modalTitle'),c=document.getElementById('modalBody'),m=document.getElementById('modal');if(a)a.textContent=t;if(c)c.innerHTML=b;if(m)m.style.display='grid'};
})();
