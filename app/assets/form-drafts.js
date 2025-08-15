/**
 * Autosave draft for seat forms (manual & smart allocation).
 * Stores draft in localStorage and restores on next visit.
 */
(function(){
  const DRAFT_KEY_TEAM = 'draft-seat-team';
  const DRAFT_KEY_SMART = 'draft-seat-smart';

  function save(key, data){
    try{ localStorage.setItem(key, JSON.stringify(data)); }catch(e){}
  }
  function load(key){
    try{ const v = localStorage.getItem(key); return v?JSON.parse(v):null; }catch(e){ return null; }
  }
  function bindFormTeam(){
    const form = document.getElementById('seatForm');
    if(!form || form.dataset.draftBound) return;
    form.dataset.draftBound='1';
    const ids = ['seatEmail','seatType','seatDur','seatDate','seatTime'];
    const d = load(DRAFT_KEY_TEAM);
    if(d){
      ids.forEach(id=>{ if(d[id]!=null && document.getElementById(id)) document.getElementById(id).value = d[id]; });
    }
    form.addEventListener('input', ()=>{
      const out = {};
      ids.forEach(id=>{ const el=document.getElementById(id); if(el) out[id]=el.value; });
      save(DRAFT_KEY_TEAM, out);
    });
    form.addEventListener('submit', ()=>{
      try{ localStorage.removeItem(DRAFT_KEY_TEAM); }catch(e){}
    });
  }
  function bindFormSmart(){
    function tryBind(){
      const form = document.getElementById('smartForm');
      if(!form || form.dataset.draftBound) return false;
      form.dataset.draftBound='1';
      const ids = ['smartEmail','smartJenis','smartDur','smartStart'];
      const d = load(DRAFT_KEY_SMART);
      if(d){
        ids.forEach(id=>{ if(d[id]!=null && document.getElementById(id)) document.getElementById(id).value = d[id]; });
      }
      form.addEventListener('input', ()=>{
        const out = {};
        ids.forEach(id=>{ const el=document.getElementById(id); if(el) out[id]=el.value; });
        save(DRAFT_KEY_SMART, out);
      });
      document.addEventListener('click', (e)=>{
        const btn = e.target.closest('button');
        if(btn && btn.textContent && /Gabung/i.test(btn.textContent)){
          try{ localStorage.removeItem(DRAFT_KEY_SMART); }catch(_){}
        }
      }, {capture:true});
      return true;
    }
    if(!tryBind()){
      const mo = new MutationObserver(()=>{ tryBind(); });
      mo.observe(document.body, {childList:true, subtree:true});
    }
  }
  function init(){
    bindFormTeam();
    bindFormSmart();
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('partials:loaded', init);
})();