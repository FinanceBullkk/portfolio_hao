/* ============================================================
   Staggered scroll reveal — upgrades the existing [data-reveal]
   system with per-card stagger inside grids/lists.
   Cards inside a [data-reveal-group] stagger individually.
   ============================================================ */

// Marks direct children of [data-reveal-group] for individual stagger
(function () {
  document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
    var children = Array.prototype.slice.call(group.children);
    children.forEach(function (child, i) {
      child.setAttribute('data-reveal', '');
      child.style.transitionDelay = (i * 0.08) + 's';
    });
  });

  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!els.length) return;

  function reveal(el) {
    el.classList.add('is-visible');
  }

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < (window.innerHeight || 800) * 0.92 && r.bottom > 0;
  }

  // Stagger for top-level [data-reveal] elements NOT inside a group
  els.forEach(function (el) {
    if (!el.parentElement.closest('[data-reveal-group]') && !el.dataset.delaySet) {
      el.dataset.delaySet = '1';
    }
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
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) {
      if (!el.classList.contains('is-visible')) io.observe(el);
    });
  } else {
    els.forEach(reveal);
  }

  // Safety net
  setTimeout(function () { els.forEach(reveal); }, 1200);
})();
