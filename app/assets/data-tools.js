/**
 * Data Tools helper.
 *
 * This stub removes previously injected Export & Import menu items
 * from the main navigation bar.
 */
(function(){
  function removeMenu(){
    const exp = document.getElementById('navDataExport');
    const imp = document.getElementById('navDataImport');
    if(exp) exp.remove();
    if(imp) imp.remove();
  }

  document.addEventListener('DOMContentLoaded', removeMenu);
  document.addEventListener('partials:loaded', removeMenu);
})();

