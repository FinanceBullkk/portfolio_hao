// Fades in [data-reveal] sections as they scroll into view.
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!els.length) return;

  function reveal(el) {
    el.classList.add('is-visible');
  }

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < (window.innerHeight || 800) * 0.92 && r.bottom > 0;
  }

  els.forEach(function (el, i) {
    el.style.transitionDelay = Math.min(i * 0.05, 0.25) + 's';
    if (inView(el)) reveal(el);
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      if (!el.classList.contains('is-visible')) io.observe(el);
    });
  } else {
    els.forEach(reveal);
  }

  // Safety net in case IntersectionObserver never fires (e.g. zero-height container).
  setTimeout(function () { els.forEach(reveal); }, 900);
})();
