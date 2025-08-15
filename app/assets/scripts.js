/*!
    * Start Bootstrap - SB Admin v7.0.7 (https://startbootstrap.com/template/sb-admin)
    * Copyright 2013-2023 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-sb-admin/blob/master/LICENSE)
    */
    // 
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Toggle the side navigation
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        // Uncomment Below to persist sidebar toggle between refreshes
        // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        //     document.body.classList.toggle('sb-sidenav-toggled');
        // }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

});

function formatDate(date){
  return new Intl.DateTimeFormat('id-ID').format(new Date(date));
}
const rtf=new Intl.RelativeTimeFormat('id-ID',{numeric:'auto'});
function relativeTime(target){
  const diff=(new Date(target)-new Date())/1000;
  const units=[['day',86400],['hour',3600],['minute',60]];
  for(const [unit,sec] of units){
    if(Math.abs(diff)>=sec || unit==='minute'){
      return rtf.format(Math.round(diff/sec),unit);
    }
  }
}
class RelativeTicker{
  constructor(){
    this.update();
    setInterval(()=>this.update(),30000);
  }
  update(){
    document.querySelectorAll('[data-reltime]').forEach(el=>{
      el.textContent=relativeTime(el.getAttribute('data-reltime'));
    });
  }
}
