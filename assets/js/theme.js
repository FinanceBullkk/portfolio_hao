/**
 * Nav theme switch.
 *
 * The blocking snippet in each page's <head> has already put the
 * `dark` class on <html> before first paint, so this file only has
 * to handle clicks and OS-level changes. Keeping the first-paint
 * decision inline is what avoids a flash of the wrong theme.
 */
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme-toggle');

  function read() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function syncLabel() {
    if (!btn) return;
    var dark = root.classList.contains('dark');
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
  }

  if (btn) {
    btn.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      syncLabel();
    });
    syncLabel();
  }

  // Follow the OS, but only until the visitor has picked a side.
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var onMediaChange = function (e) {
    if (read()) return;
    root.classList.toggle('dark', e.matches);
    syncLabel();
  };
  if (media.addEventListener) media.addEventListener('change', onMediaChange);
  else if (media.addListener) media.addListener(onMediaChange);
})();
