(function () {
  var root = document.documentElement;
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var langBtn = document.querySelector('.lang-toggle');
  if (langBtn) langBtn.addEventListener('click', function () {
    var en = !root.classList.contains('lang-en');
    root.classList.toggle('lang-en', en);
    root.lang = en ? 'en' : 'zh-CN';
    store('wz-lang', en ? 'en' : 'zh');
  });

  var themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('wz-theme', next);
  });

  var grid = document.querySelector('.grid');
  if (!grid) return;
  grid.querySelectorAll('.card-media').forEach(function (m) {
    var tag = m.querySelector('.see-more');
    if (!tag) return;
    m.addEventListener('mousemove', function (e) {
      var r = m.getBoundingClientRect();
      tag.style.transform = 'translate(' + (e.clientX - r.left + 12) + 'px,' + (e.clientY - r.top + 12) + 'px)';
    });
  });
  var views = document.querySelectorAll('.opt[data-view]');
  views.forEach(function (b) {
    b.addEventListener('click', function () {
      grid.setAttribute('data-view', b.getAttribute('data-view'));
      views.forEach(function (c) { c.classList.toggle('is-on', c === b); });
    });
  });
  var filters = document.querySelectorAll('.opt[data-filter]');
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      filters.forEach(function (c) { c.classList.toggle('is-on', c === b); });
      grid.querySelectorAll('.card').forEach(function (card) {
        card.hidden = f !== 'all' && card.getAttribute('data-tags').split(' ').indexOf(f) < 0;
      });
    });
  });
})();
