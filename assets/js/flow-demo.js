// Auto-advancing step carousel for the "Watch the flow" demo,
// with prev/next buttons, clickable dots, and hover-to-pause.
(function () {
  var demo = document.querySelector('.flow-demo');
  if (!demo) return;
  var panels = demo.querySelectorAll('.flow-demo-panel');
  var dots = demo.querySelectorAll('.flow-demo-dots .dot');
  var idx = 0, timer = null, DELAY = 4000;

  function show(i) {
    idx = (i + panels.length) % panels.length;
    panels.forEach(function (p, k) { p.classList.toggle('active', k === idx); });
    dots.forEach(function (d, k) { d.classList.toggle('active', k === idx); });
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() { stop(); timer = setInterval(function () { show(idx + 1); }, DELAY); }

  demo.querySelectorAll('.flow-demo-nav').forEach(function (btn) {
    btn.addEventListener('click', function () { show(idx + Number(btn.dataset.dir)); start(); });
  });
  dots.forEach(function (d, k) {
    d.addEventListener('click', function () { show(k); start(); });
  });
  demo.addEventListener('mouseenter', stop);
  demo.addEventListener('mouseleave', start);

  show(0);
  start();
})();
