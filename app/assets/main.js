async function loadPartials() {
  try {
    const [header, footer] = await Promise.all([
      fetch('partials/header.html').then(r => r.text()),
      fetch('partials/footer.html').then(r => r.text())
    ]);
    document.getElementById('header').innerHTML = header;
    document.getElementById('footer').innerHTML = footer;
    try{ document.dispatchEvent(new CustomEvent('partials:loaded')); }catch(e){}

    const nav = document.querySelector('#header nav');
    function offset() {
      const h = nav.offsetHeight;
      document.body.style.paddingTop = h + 'px';
      document.documentElement.style.scrollPaddingTop = h + 'px';
    }
    offset();
    window.addEventListener('resize', offset);

    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#header a.nav-link')
      .forEach(link => {
        if (link.getAttribute('href') === current) {
          link.classList.add('active');
        }
      });

    // Collapse the navbar after clicking a link on mobile
    const navCollapse = document.getElementById('navbarNav');
    document.querySelectorAll('#navbarNav .nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (navCollapse.classList.contains('show')) {
          new bootstrap.Collapse(navCollapse).hide();
        }
      });
    });
  } catch (err) {
    console.error('Failed loading partials', err);
  }
}
