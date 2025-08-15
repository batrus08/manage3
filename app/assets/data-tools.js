/**
 * Data Tools: Export & Import (applies on all pages)
 * Requires: Bootstrap (for modal & toast)
 * Server endpoints: GET /api/export, POST /api/import?mode=replace|merge, GET /api/state
 */
(function(){
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function ensureUI(){
    const nav = document.querySelector('#header nav .navbar-nav');
    if(!nav || document.getElementById('navDataExport')) return;
    const liExp = document.createElement('li');
    liExp.className='nav-item';
    liExp.innerHTML = '<a id="navDataExport" class="nav-link" href="#">Export</a>';
    const liImp = document.createElement('li');
    liImp.className='nav-item';
    liImp.innerHTML = '<a id="navDataImport" class="nav-link" href="#">Import</a>';
    nav.appendChild(liExp);
    nav.appendChild(liImp);
  }
  function buildImportModal(){
    if(document.getElementById('importModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
<div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importTitle" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="importTitle">Import Data</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">File JSON</label>
          <input type="file" id="importFile" class="form-control" accept="application/json,.json">
          <div class="form-text">Gunakan file hasil Export (backup-*.json).</div>
        </div>
        <div class="mb-2">
          <label class="form-label">Mode Import</label>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="importMode" id="impReplace" value="replace" checked>
            <label class="form-check-label" for="impReplace">Replace (ganti seluruh data)</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="importMode" id="impMerge" value="merge">
            <label class="form-check-label" for="impMerge">Merge (gabungkan, hindari duplikasi)</label>
          </div>
        </div>
        <div class="alert alert-warning small mb-0">
          <strong>Peringatan:</strong> Mode <em>Replace</em> akan mengganti seluruh data yang ada saat ini.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
        <button type="button" id="btnDoImport" class="btn btn-primary">Import</button>
      </div>
    </div>
  </div>
</div>`;
    document.body.appendChild(wrap.firstElementChild);
  }
  function showToast(msg, success=true){
    let toast = document.getElementById('dataToolsToast');
    if(!toast){
      const container = document.createElement('div');
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex='1080';
      toast = document.createElement('div');
      toast.id='dataToolsToast';
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
    toast.querySelector('.toast-body').textContent = msg;
    const t = bootstrap.Toast.getOrCreateInstance(toast, {delay: 3500});
    t.show();
  }
  function bindHandlers(){
    const exp = document.getElementById('navDataExport');
    const imp = document.getElementById('navDataImport');
    if(exp && !exp.dataset.bound){
      exp.dataset.bound = '1';
      exp.addEventListener('click', (e)=>{
        e.preventDefault();
        window.location.href = '/api/export';
      });
    }
    if(imp && !imp.dataset.bound){
      imp.dataset.bound = '1';
      imp.addEventListener('click', (e)=>{
        e.preventDefault();
        const modalEl = document.getElementById('importModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      });
    }
    const btnDo = document.getElementById('btnDoImport');
    if(btnDo && !btnDo.dataset.bound){
      btnDo.dataset.bound='1';
      btnDo.addEventListener('click', async ()=>{
        const fileInput = document.getElementById('importFile');
        const mode = document.getElementById('impMerge').checked ? 'merge':'replace';
        const file = fileInput.files && fileInput.files[0];
        if(!file){ showToast('Pilih file .json terlebih dahulu', false); return; }
        try{
          const text = await file.text();
          const json = JSON.parse(text);
          const r = await fetch('/api/import?mode='+mode, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(json)});
          const output = await r.json().catch(()=>({}));
          if(!r.ok){ throw new Error(output.error||'Gagal import'); }
          showToast('Import sukses ('+mode+')');
          setTimeout(()=> location.reload(), 1000);
        }catch(err){
          showToast('Import gagal: '+(err.message||err), false);
        }
      });
    }
  }
  function init(){
    ensureUI();
    buildImportModal();
    bindHandlers();
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('partials:loaded', init);
})();