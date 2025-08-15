/**
 * Smart Allocation for Seat (Seat page)
 * - Adds a "Tambah (Smart Allocation)" button on seat.html
 * - Modal step 1: input seat data (email, jenis, mulai, durasi hari)
 * - Modal step 2: list eligible team accounts (kapasitas & masa berlaku cukup)
 * - On "Gabung", will POST to /api/seats and then navigate to seat-team.html?teamId=...
 */
(function(){
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function fmtDateLocalISO(d){
    const pad=n=>String(n).padStart(2,'0');
    const yyyy=d.getFullYear();
    const mm=pad(d.getMonth()+1);
    const dd=pad(d.getDate());
    const hh=pad(d.getHours());
    const mi=pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
  function formatDate(d){
    const dt=new Date(d);
    return dt.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  function ceilDays(ms){ return Math.ceil(ms/86400000); }

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

  async function fetchTeams(){
    const r = await fetch('/api/teams');
    if(!r.ok) throw new Error('Gagal memuat data team');
    return r.json();
  }
  async function createSeat(payload){
    const r = await fetch('/api/seats', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    if(!r.ok){
      let errText='Gagal membuat seat';
      try{ const e = await r.json(); errText = e.error||errText; }catch(_){}
      throw new Error(errText);
    }
    return r.json();
  }
  function teamExpiry(team){
    const created = new Date(team.created_at).getTime();
    const expire = created + (Number(team.durasi_hari)||0)*86400000;
    return new Date(expire);
  }
  function buildFormModal(){
    const now = new Date();
    const modal = el('div', {class:'modal fade', id:'smartFormModal', tabIndex:'-1', 'aria-labelledby':'smartFormTitle', 'aria-hidden':'true'},
      el('div',{class:'modal-dialog modal-lg modal-dialog-centered'},
        el('div',{class:'modal-content'},[
          el('div',{class:'modal-header'},[
            el('h5',{class:'modal-title', id:'smartFormTitle'},'Tambah (Smart Allocation)'),
            el('button',{type:'button', class:'btn-close', 'data-bs-dismiss':'modal', 'aria-label':'Close'})
          ]),
          el('div',{class:'modal-body'},[
            el('form',{id:'smartForm', class:'needs-validation', novalidate:''},[
              el('div',{class:'row g-3'},[
                el('div',{class:'col-md-6'},[
                  el('label',{class:'form-label', for:'smartEmail'}, 'Email Member'),
                  el('input',{type:'email', class:'form-control', id:'smartEmail', placeholder:'email@domain.com', required:''})
                ]),
                el('div',{class:'col-md-6'},[
                  el('label',{class:'form-label', for:'smartJenis'}, 'Tipe Seat'),
                  (function(){
                    const s=el('select',{class:'form-select', id:'smartJenis'},[
                      el('option',{value:'privat'},'Privat'),
                      el('option',{value:'sharing'},'Sharing')
                    ]);
                    return s;
                  })()
                ]),
                el('div',{class:'col-md-4'},[
                  el('label',{class:'form-label', for:'smartDur'}, 'Durasi'),
                  el('div',{class:'input-group'},[
                    el('input',{type:'number', min:'1', value:'1', class:'form-control', id:'smartDur', required:''}),
                    el('span',{class:'input-group-text'},'hari')
                  ])
                ]),
                el('div',{class:'col-md-8'},[
                  el('label',{class:'form-label', for:'smartStart'}, 'Mulai'),
                  el('div',{class:'input-group'},[
                    el('input',{type:'datetime-local', class:'form-control', id:'smartStart', value:fmtDateLocalISO(now)}),
                    el('button',{type:'button', class:'btn btn-outline-secondary', id:'smartNow'}, 'Sekarang')
                  ])
                ])
              ])
            ])
          ]),
          el('div',{class:'modal-footer'},[
            el('button',{type:'button', class:'btn btn-secondary', 'data-bs-dismiss':'modal'}, 'Batal'),
            el('button',{type:'button', class:'btn btn-success', id:'smartFormNext'}, 'Selesai')
          ])
        ])
      )
    );
    document.body.appendChild(modal);
    const modalObj = new bootstrap.Modal(modal);
    modal.querySelector('#smartNow').addEventListener('click',()=>{
      modal.querySelector('#smartStart').value = fmtDateLocalISO(new Date());
    });
    modal.querySelector('#smartFormNext').addEventListener('click', async ()=>{
      const email = modal.querySelector('#smartEmail').value.trim();
      const jenis = modal.querySelector('#smartJenis').value;
      const dur = parseInt(modal.querySelector('#smartDur').value,10) || 0;
      const startStr = modal.querySelector('#smartStart').value;
      if(!email){ alert('Email wajib diisi'); return; }
      if(!startStr){ alert('Tanggal mulai wajib diisi'); return; }
      if(dur<1){ alert('Durasi minimal 1 hari'); return; }
      const start = new Date(startStr);
      const end = new Date(start.getTime()+dur*86400000);
      if(end<=start){ alert('Durasi tidak valid'); return; }
      try{
        const resp = await fetch('/api/teams');
        if(!resp.ok) throw new Error('Gagal memuat data team');
        const teams = await resp.json();
        const candidates = teams.map(t=>{
          const capacity = t.seats_capacity ?? t.seat_maks ?? 0;
          const used = t.seats_used ?? 0;
          const free = Math.max(0, capacity - used);
          const exp = teamExpiry(t);
          const daysLeftFromStart = Math.ceil((exp.getTime() - start.getTime())/86400000);
          const can = free>0 && exp.getTime() >= end.getTime();
          return { team:t, free, exp, daysLeftFromStart, can };
        }).filter(c=>c.can)
          .sort((a,b)=> a.daysLeftFromStart - b.daysLeftFromStart || (a.free - b.free));
        showPickModal({email, jenis, start, end, dur, candidates});
        modalObj.hide();
      }catch(e){
        alert(e.message||'Terjadi kesalahan');
      }
    });
    return { open: ()=> modalObj.show() };
  }

  function showPickModal(state){
    let modal = document.getElementById('smartPickModal');
    if(!modal){
      const el = (tag,attrs={},children=[])=>{
        const e=document.createElement(tag);
        Object.entries(attrs).forEach(([k,v])=>{
          if(k==='class') e.className=v;
          else if(v!==undefined && v!==null) e.setAttribute(k,v);
        });
        (Array.isArray(children)?children:[children]).forEach(c=>{
          if(typeof c==='string') e.appendChild(document.createTextNode(c));
          else e.appendChild(c);
        });
        return e;
      };
      modal = el('div',{class:'modal fade', id:'smartPickModal', tabIndex:'-1', 'aria-labelledby':'smartPickTitle', 'aria-hidden':'true'},
        el('div',{class:'modal-dialog modal-lg modal-dialog-centered'},
          el('div',{class:'modal-content'},[
            el('div',{class:'modal-header'},[
              el('h5',{class:'modal-title', id:'smartPickTitle'},'Pilih Akun Team'),
              el('button',{type:'button', class:'btn-close', 'data-bs-dismiss':'modal', 'aria-label':'Close'})
            ]),
            el('div',{class:'modal-body'},[
              el('div',{id:'smartPickSummary', class:'mb-3 small text-muted'}),
              el('div',{id:'smartPickList', class:'list-group'})
            ]),
            el('div',{class:'modal-footer'},[
              el('button',{type:'button', class:'btn btn-secondary', 'data-bs-dismiss':'modal'}, 'Batal')
            ])
          ])
        )
      );
      document.body.appendChild(modal);
    }
    const list = modal.querySelector('#smartPickList');
    const summary = modal.querySelector('#smartPickSummary');
    list.innerHTML='';
    const f = d => new Date(d).toLocaleString();
    summary.innerHTML = `Email: <strong>${state.email}</strong> · Tipe: <strong>${state.jenis}</strong> · Mulai: <strong>${f(state.start)}</strong> · Durasi: <strong>${state.dur} hari</strong> · Berakhir: <strong>${f(state.end)}</strong>`;
    if(!state.candidates.length){
      list.appendChild(document.createElement('div')).outerHTML = '<div class="alert alert-warning mb-0" role="alert">Tidak ada akun team yang bisa mencukupi durasi & kapasitas yang diminta. Tambahkan akun team baru atau kurangi durasi.</div>';
    }else{
      state.candidates.forEach(c=>{
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
        item.innerHTML = `<div>
            <div class="fw-bold">${c.team.nama||('Team #'+c.team.id)}</div>
            <div class="small text-muted">
              Sisa slot: ${c.free} / ${(c.team.seats_capacity ?? c.team.seat_maks ?? 0)} ·
              Masa berlaku: ${f(c.exp)} ·
              Sisa durasi dari mulai: ${c.daysLeftFromStart} hari
            </div>
          </div>
          <div><button type="button" class="btn btn-sm btn-success" data-team="${c.team.id}">Gabung</button></div>`;
        list.appendChild(item);
      });
    }
    const modalObj = bootstrap.Modal.getOrCreateInstance(modal);
    modalObj.show();
    list.querySelectorAll('button[data-team]').forEach(btn=>{
      btn.addEventListener('click', async ev=>{
        const teamId = Number(ev.currentTarget.getAttribute('data-team'));
        try{
          const payload = {
            team_id: teamId,
            email: state.email,
            jenis: state.jenis,
            mulai: state.start.toISOString(),
            berakhir: state.end.toISOString()
          };
          await createSeat(payload);
          showToast('Sukses', 'Seat berhasil ditambahkan');
          modalObj.hide();
          window.location.href = `seat-team.html?teamId=${teamId}`;
        }catch(e){
          showToast('Gagal', e.message||'Gagal menambahkan seat', false);
        }
      });
    });
  }

  function injectToolbar(){
    const cardsRow = document.getElementById('teamCards');
    if(!cardsRow) return;
    if(document.getElementById('btnSmartAlloc')) return;
    const bar = document.createElement('div');
    bar.className = 'd-flex justify-content-end align-items-center mb-3 gap-2';
    const btn = document.createElement('button');
    btn.id='btnSmartAlloc';
    btn.type='button';
    btn.className='btn btn-success';
    btn.textContent='Tambah (Smart Allocation)';
    bar.appendChild(btn);
    cardsRow.parentElement.insertBefore(bar, cardsRow);
    const form = buildFormModal();
    btn.addEventListener('click', ()=> form.open());
  }

  function showToast(title, msg, success=true){
    let toast = document.getElementById('smartToast');
    if(!toast){
      const container = document.createElement('div');
      container.className='toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex='1080';
      toast = document.createElement('div');
      toast.id='smartToast';
      toast.className='toast align-items-center text-bg-success border-0';
      toast.setAttribute('role','status');
      toast.setAttribute('aria-live','polite');
      toast.setAttribute('aria-atomic','true');
      toast.innerHTML = '<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>';
      container.appendChild(toast);
      document.body.appendChild(container);
    }
    toast.classList.remove('text-bg-success','text-bg-danger');
    toast.classList.add(success?'text-bg-success':'text-bg-danger');
    toast.querySelector('.toast-body').textContent = `${title}: ${msg}`;
    const t = bootstrap.Toast.getOrCreateInstance(toast, {delay: 3000});
    t.show();
  }

  onReady(()=>{
    if(!/\/seat\.html(\?|$)/.test(location.pathname)) return;
    injectToolbar();
  });
})();