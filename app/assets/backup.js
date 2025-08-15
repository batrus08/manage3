/**
 * Backup & Restore (Export/Import JSON)
 * - Adds a "Backup & Restore" card on Dashboard
 * - Export: GET /api/export → download JSON
 * - Import: choose JSON → POST /api/import (replace current data)
 */
(function(){
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function el(tag,attrs={},children=[]){
    const e=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='class') e.className=v;
      else if(k.startsWith('on') && typeof v==='function'){ e.addEventListener(k.substring(2),v); }
      else if(v!==undefined && v!==null) e.setAttribute(k,v);
    });
    (Array.isArray(children)?children:[children]).forEach(c=>{
      if(c==null) return;
      if(typeof c==='string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
    return e;
  }
  function showToast(msg, ok=true){
    let toast = document.getElementById('backupToast');
    if(!toast){
      const container = el('div',{class:'toast-container position-fixed top-0 end-0 p-3', style:'z-index:1080;'});
      toast = el('div',{id:'backupToast', class:'toast align-items-center text-bg-success border-0', role:'status', 'aria-live':'polite', 'aria-atomic':'true'},
        el('div',{class:'d-flex'},[
          el('div',{class:'toast-body'},''),
          el('button',{type:'button', class:'btn-close btn-close-white me-2 m-auto','data-bs-dismiss':'toast','aria-label':'Close'})
        ])
      );
      container.appendChild(toast);
      document.body.appendChild(container);
    }
    toast.classList.remove('text-bg-success','text-bg-danger');
    toast.classList.add(ok?'text-bg-success':'text-bg-danger');
    toast.querySelector('.toast-body').textContent = msg;
    bootstrap.Toast.getOrCreateInstance(toast,{delay:3000}).show();
  }
  function ts(){ const d=new Date(); const z=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`; }
  async function doExport(){
    try{
      const r = await fetch('/api/export');
      if(!r.ok) throw new Error('Gagal mengekspor');
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-control-meowlie-${ts()}.json`; 
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
      showToast('Ekspor berhasil');
    }catch(e){
      showToast(e.message||'Ekspor gagal', false);
    }
  }
  async function doImport(file){
    try{
      const text = await file.text();
      let data;
      try{ data = JSON.parse(text); }catch(_){ throw new Error('File bukan JSON yang valid'); }
      const r = await fetch('/api/import', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data }) });
      if(!r.ok){ const err=await r.json().catch(()=>({})); throw new Error(err.error||'Impor gagal'); }
      const res = await r.json();
      showToast(`Impor berhasil (teams: ${res.teams}, seats: ${res.seats}${res.seats_dropped?`, dropped: ${res.seats_dropped}`:''})`);
      setTimeout(()=>location.reload(), 800);
    }catch(e){
      showToast(e.message||'Impor gagal', false);
    }
  }

  function injectCard(){
    const main = document.querySelector('main.container-fluid');
    if(!main || document.getElementById('backupCard')) return;
    const card = el('div',{class:'card mt-3', id:'backupCard'},
      el('div',{class:'card-body'},[
        el('div',{class:'d-flex justify-content-between align-items-center flex-wrap gap-2'},[
          el('div',{},[
            el('div',{class:'h5 mb-1'},'Backup & Restore'),
            el('div',{class:'text-muted small'},'Ekspor seluruh data (teams & seats) ke JSON. Impor untuk memulihkan (replace seluruh data).')
          ]),
          el('div',{class:'d-flex align-items-center gap-2'},[
            (function(){
              const b=el('button',{class:'btn btn-outline-primary', type:'button', id:'btnExport'},'Ekspor Data (JSON)');
              b.addEventListener('click', doExport);
              return b;
            })(),
            (function(){
              const label = el('label',{class:'btn btn-primary mb-0', for:'inputImport'},'Impor Data (JSON)');
              const input = el('input',{type:'file', id:'inputImport', accept:'.json', class:'visually-hidden'});
              input.addEventListener('change', (e)=>{
                const f=e.target.files && e.target.files[0];
                if(!f) return;
                if(!confirm('Impor akan MENIMPA data saat ini. Lanjutkan?')) { e.target.value=''; return; }
                doImport(f);
              });
              const wrap = el('div',{},[label, input]);
              return wrap;
            })()
          ])
        ])
      ])
    );
    main.appendChild(card);
  }

  onReady(()=>{
    const onDashboard = /\/index\.html(\?|$)|\/app\/?$|\/$/.test(location.pathname);
    if(onDashboard) injectCard();
  });
})();
