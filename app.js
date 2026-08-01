(function () {
  // Upgrade hero poster to the animated WebP, unless the visitor prefers reduced motion.
  // No-op on pages without a hero (e.g. resume).
  var hero = document.querySelector('.hero-r');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hero && hero.dataset.anim && !reduce) {
    var pre = new Image();
    pre.onload = function () { hero.src = hero.dataset.anim; };
    pre.src = hero.dataset.anim;
  }
})();

(function () {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  els.forEach(function (el) { io.observe(el); });
})();

(function () {
  // Mobile: nav pill stays hidden (see the CSS media query in styles.css)
  // until the visitor's first interaction, then reveals permanently. Scoped
  // to .nav-shell--reveal (homepage only) — other pages' nav is visible from
  // the start. No-op on desktop widths, since the CSS there never hides it
  // in the first place. Listens for touchstart as well as scroll — a tap
  // that doesn't happen to produce a native scroll event (e.g. a short
  // page, or a tap before any scrolling) would otherwise leave the nav
  // stuck hidden.
  var navShell = document.querySelector('.nav-shell--reveal');
  if (!navShell) return;
  var reveal = function () {
    navShell.classList.add('is-visible');
    window.removeEventListener('scroll', reveal);
    window.removeEventListener('touchstart', reveal);
    window.removeEventListener('pointerdown', reveal);
  };
  window.addEventListener('scroll', reveal, { passive: true });
  window.addEventListener('touchstart', reveal, { passive: true });
  window.addEventListener('pointerdown', reveal, { passive: true });
})();

(function () {
  // Projects catalog filtering (no-op on pages without filters)
  var filters = document.querySelectorAll('.proj-filter');
  if (!filters.length) return;
  var cards = document.querySelectorAll('.case[data-discipline]');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.dataset.filter;
      filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      cards.forEach(function (c) {
        var show = (val === 'all') || (c.dataset.discipline === val);
        c.classList.toggle('is-hidden', !show);
        if (show) { c.classList.add('in'); }
      });
    });
  });
})();
