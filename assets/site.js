(function () {
  var root = document.documentElement;
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // first-visit counter, like the Framer preloader
  if (root.classList.contains('is-loading')) {
    var num = document.querySelector('.loader span'), t0 = performance.now(), D = 900;
    var tick = function (now) {
      var k = Math.min(1, (now - t0) / D);
      if (num) num.textContent = Math.round(100 * (1 - Math.pow(1 - k, 3)));
      if (k < 1) return requestAnimationFrame(tick);
      root.classList.add('loader-out');
      setTimeout(function () { root.classList.remove('is-loading', 'loader-out'); }, 460);
      try { sessionStorage.setItem('wz-loaded', '1'); } catch (e) {}
    };
    requestAnimationFrame(tick);
  }

  // custom cursor (dot -> SEE MORE label over project images)
  var cur = document.querySelector('.cursor');
  if (cur && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.classList.add('has-cursor');
    document.addEventListener('mousemove', function (e) {
      cur.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      cur.classList.add('is-on');
      cur.classList.toggle('is-label', !!(e.target.closest && e.target.closest('.card-media')));
    });
    document.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); });
  }

  // Embedded demos follow the page language: set it on load, then tell them when it changes.
  var embeds = document.querySelectorAll('iframe[data-lang-src]');
  function pageLang() { return root.classList.contains('lang-en') ? 'en' : 'zh'; }
  embeds.forEach(function (f) { f.src = f.getAttribute('data-lang-src').replace('{lang}', pageLang()); });
  function tellEmbeds() {
    embeds.forEach(function (f) {
      try { f.contentWindow.postMessage({ type: 'wh-lang', lang: pageLang() }, location.origin); } catch (e) {}
    });
  }

  var langBtn = document.querySelector('.lang-toggle');
  if (langBtn) langBtn.addEventListener('click', function () {
    var en = !root.classList.contains('lang-en');
    root.classList.toggle('lang-en', en);
    root.lang = en ? 'en' : 'zh-Hans-CN';
    store('wz-lang', en ? 'en' : 'zh');
    tellEmbeds();
  });

  var themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('wz-theme', next);
  });

  var grid = document.querySelector('.grid');
  if (!grid) return;
  // list view: floating preview of the hovered project, right-aligned, eased toward the cursor
  var prev = document.createElement('img');
  prev.className = 'list-preview'; prev.alt = '';
  grid.appendChild(prev);
  var ty = 0, cy = 0, raf = 0;
  var step = function () {
    cy += (ty - cy) * 0.2;
    prev.style.transform = 'translateY(' + cy.toFixed(1) + 'px)';
    raf = Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  grid.addEventListener('mousemove', function (e) {
    if (grid.getAttribute('data-view') !== 'list') return;
    var card = e.target.closest && e.target.closest('.card');
    if (!card) { prev.classList.remove('is-on'); return; }
    var src = card.querySelector('.card-media img').getAttribute('src');
    if (prev.getAttribute('src') !== src) prev.setAttribute('src', src);
    var g = grid.getBoundingClientRect();
    ty = e.clientY - g.top - 114.5;
    if (!prev.classList.contains('is-on')) { cy = ty; prev.classList.add('is-on'); }
    if (!raf) raf = requestAnimationFrame(step);
  });
  grid.addEventListener('mouseleave', function () { prev.classList.remove('is-on'); });

  var more = document.querySelector('.load-more');
  var views = document.querySelectorAll('.opt[data-view]');
  views.forEach(function (b) {
    b.addEventListener('click', function () {
      grid.setAttribute('data-view', b.getAttribute('data-view'));
      if (more) more.hidden = b.getAttribute('data-view') === 'list' || grid.classList.contains('expanded') || !grid.querySelector('.is-more');
      views.forEach(function (c) { c.classList.toggle('is-on', c === b); });
    });
  });
  if (more) {
    if (!grid.querySelector('.is-more')) more.hidden = true;
    more.addEventListener('click', function () {
      grid.classList.add('expanded', 'show-all');
      more.hidden = true;
    });
  }
  var filters = document.querySelectorAll('.opt[data-filter]');
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      filters.forEach(function (c) { c.classList.toggle('is-on', c === b); });
      grid.querySelectorAll('.card').forEach(function (card) {
        card.hidden = f !== 'all' && card.getAttribute('data-tags').split(' ').indexOf(f) < 0;
      });
      grid.classList.toggle('show-all', f !== 'all' || grid.classList.contains('expanded'));
      if (more) more.hidden = f !== 'all' || grid.classList.contains('expanded');
    });
  });
})();
