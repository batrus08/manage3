/**
 * Dashboard "Kosong" metric fix:
 * Ensures the "Kosong" card reflects actual remaining slots across teams
 * by using /api/teams (seats_used and seats_capacity).
 */
(function(){
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  async function recalcEmpty(){
    const emptyEl = document.getElementById('metric-empty');
    if(!emptyEl) return;
    try{
      const r = await fetch('/api/teams');
      if(!r.ok) throw new Error('Gagal memuat data team');
      const teams = await r.json();
      const totalCap = teams.reduce((a,t)=> a + (t.seats_capacity ?? t.seat_maks ?? 0), 0);
      const used = teams.reduce((a,t)=> a + (t.seats_used ?? 0), 0);
      const empty = Math.max(0, totalCap - used);
      emptyEl.textContent = String(empty);
      emptyEl.dataset.synced = 'true';
      emptyEl.setAttribute('title', `Kapasitas: ${totalCap}, Terpakai: ${used}, Kosong: ${empty}`);
    }catch(e){
      console.error('Gagal memperbarui metrik Kosong', e);
    }
  }
  onReady(()=>{
    if(!/\/index\.html(\?|$)|\/$/.test(location.pathname)) return;
    recalcEmpty();
  });
})();