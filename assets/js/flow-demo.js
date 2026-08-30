// Keyboard-safe, manual workflow tour. The visitor controls the pace so a
// long case study never changes underneath a focused control.
(function () {
  var demo = document.querySelector('.flow-demo');
  if (!demo) return;

  var panels = Array.prototype.slice.call(demo.querySelectorAll('.flow-demo-panel'));
  var dots = Array.prototype.slice.call(demo.querySelectorAll('.flow-demo-dots .dot'));
  var idx = 0;

  function show(next) {
    if (!panels.length) return;
    idx = (next + panels.length) % panels.length;
    panels.forEach(function (panel, panelIndex) {
      var active = panelIndex === idx;
      panel.classList.toggle('active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.inert = !active;
    });
    dots.forEach(function (dot, dotIndex) {
      var active = dotIndex === idx;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-current', active ? 'step' : 'false');
      dot.setAttribute('aria-pressed', String(active));
    });
  }

  demo.querySelectorAll('.flow-demo-nav').forEach(function (button) {
    button.addEventListener('click', function () {
      show(idx + Number(button.dataset.dir || 0));
    });
  });
  dots.forEach(function (dot, dotIndex) {
    dot.addEventListener('click', function () { show(dotIndex); });
  });
  show(0);
})();
