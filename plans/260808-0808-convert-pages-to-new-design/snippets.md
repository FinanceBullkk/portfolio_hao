# Snippets — exact blocks to copy in phases 2–6

Copy these **character for character**. Do not reformat, reorder, or "improve" them.

---

## BLOCK A — stylesheet links

Every converted page must have exactly these stylesheet lines, in this order.
The IBM Plex `<link>` line is **deleted**, not replaced.

```html
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/home.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
```

If the page already links extra mock CSS (`tms.css`, `certificate-pipeline-mocks.css`,
`certificate-pipeline-flow-demo.css`, `registration-mocks.css`), keep those lines and put them
**after** the three above. Do not delete them.

`about.html` additionally keeps `assets/css/about.css` last.

---

## BLOCK B — theme init script

Already present on all 5 pages as the last line before `</head>`. **Do not touch it.**
Shown here only so you can confirm it is still there:

```html
  <script>try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}</script>
```

---

## BLOCK C — page opening + nav

This replaces BOTH the old `<nav class="subnav">…</nav>` block AND the
`<div class="container">` line that follows it.

> ⚠ **Trap: `<div class="container">` appears TWICE.**
> The first one is *inside* the `<nav class="subnav">`. The second one, after `</nav>`, is the
> page wrapper. You must replace the whole span from `<nav class="subnav">` through the
> **second** one. Match the entire literal block printed in the phase file — do not search for
> `<div class="container">` on its own, or you will replace the wrong one and leave the old
> subnav links stranded on the page.
>
> After the edit, `grep -c 'class="container"' PAGE.html` must return **0**.

```html
  <main class="container-sm">

    <aside class="nav-container">
      <div class="nav-sticky">
        <nav class="nav-bar" id="nav">
          <div class="nav">
            <a href="index.html">home</a>
            <a href="about.html">about</a>
          </div>
          <button type="button" class="theme-toggle" aria-label="Switch to dark mode" title="Dark mode">
            <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>
          </button>
        </nav>
      </div>
    </aside>

    <section>
```

### On `about.html` only

Add `class="active" aria-current="page"` to the **about** link:

```html
            <a href="index.html">home</a>
            <a href="about.html" class="active" aria-current="page">about</a>
```

### On the 4 case-study pages

Leave both links plain — no `active`, no `aria-current`. Case studies have no nav entry of their
own. This is correct and matches the reference site.

---

## BLOCK D — footer + page close

This replaces the old `<footer class="site-footer …">…</footer>`, the `</div>` that closed the
old `.container`, and nothing else.

```html
    </section>

    <footer class="home-footer">
      <ul>
        <li>
          <a href="index.html" class="u-link">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z" fill="currentColor"></path></svg>
            <span>all projects</span>
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener noreferrer" class="u-link">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z" fill="currentColor"></path></svg>
            <span>linkedin</span>
          </a>
        </li>
      </ul>
      <p>© 2026 Nguyen Huynh Anh Hao</p>
    </footer>

  </main>
```

Note the closing tag is `</main>`, not `</div>`. BLOCK C opened a `<main>`.

---

## BLOCK E — scripts at end of body

Keep whatever script tags the page already had, and add `theme.js` **first**:

```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/reveal.js"></script>
```

If the page also had `flow-demo.js`, keep it last:

```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/reveal.js"></script>
  <script src="assets/js/flow-demo.js"></script>
```

---

## Structural check after any page edit

Tag counts must balance. Run this and confirm the two numbers in each pair are equal:

```bash
grep -o '<main' PAGE.html | wc -l ; grep -o '</main>' PAGE.html | wc -l
grep -o '<section' PAGE.html | wc -l ; grep -o '</section>' PAGE.html | wc -l
grep -o '<div' PAGE.html | wc -l ; grep -o '</div>' PAGE.html | wc -l
```

If `<div>` and `</div>` do not match, you deleted one `</div>` too many or too few when
replacing the old `.container` wrapper. Fix it before moving on.
