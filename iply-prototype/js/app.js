/* IPLY — clickable prototype v2. Hash-routed single page; state in localStorage.
   Layout is authored in Figma pixels (1920 artboards) and scaled with CSS zoom (see setZoom). */
(function () {
  'use strict';
  const D = window.IPLY_DATA, I = window.ICONS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  const EMBED = qs.get('frame') === '1' || qs.get('embed') === '1';
  if (EMBED) document.body.classList.add('embed');
  if (qs.get('shot') === '1') document.documentElement.classList.add('shot');

  /* ------------------------------------------------------------------ ?test=P1 — usability-test session log
     Records route changes, clicks, toasts and errors with timestamps in this browser only;
     the moderator downloads it as JSON from the Prototype guide after the session. */
  const TEST = (qs.get('test') || '').replace(/[^\w-]/g, '').slice(0, 20);
  const TLOG = 'iply-test-log';
  const tlogRead = () => { try { return JSON.parse(localStorage.getItem(TLOG) || '[]'); } catch (e) { return []; } };
  const tlog = (type, d) => { if (!TEST) return; try { const L = tlogRead(); L.push(Object.assign({ p: TEST, t: Date.now(), type, route: location.hash || '#/' }, d)); localStorage.setItem(TLOG, JSON.stringify(L)); } catch (e) {} };
  if (TEST) {
    tlog('start', { w: innerWidth, h: innerHeight });
    addEventListener('hashchange', () => tlog('route', {}));
    document.addEventListener('click', (e) => { const el = e.target.closest('a,button,[data-act],input,label,select'); if (!el) return; tlog('click', { act: el.dataset.act || '', el: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || el.name || '').trim().replace(/\s+/g, ' ').slice(0, 60) }); }, true);
    addEventListener('error', (e) => tlog('error', { msg: String(e.message).slice(0, 120) }));
  }

  /* ------------------------------------------------------------------ zoom: Figma px → screen */
  function setZoom() {
    const W = document.documentElement.clientWidth || innerWidth;
    if (W === setZoom.w) return; setZoom.w = W;
    const z = W >= 700 ? Math.min(1, Math.max(0.62, W / 1920)) : W / 750;
    document.documentElement.style.setProperty('--z', z.toFixed(4));
    const vw = W / z, wrap = Math.min(1579, vw - (W < 700 ? 64 : 96));
    document.documentElement.style.setProperty('--vw', vw.toFixed(1) + 'px');
    document.documentElement.style.setProperty('--gut', ((vw - wrap) / 2).toFixed(1) + 'px');
  }
  setZoom();
  addEventListener('resize', setZoom);

  /* ------------------------------------------------------------------ state */
  const KEY = 'iply-proto-v3';
  const fresh = () => ({
    logged: false, role: 'creator', user: { name: 'Luna Nash', email: '', age: '18+', fandoms: ['Hollow Knight', 'Genshin Impact'] },
    votes: {}, pre: {}, cart: [], comments: {}, extraIdeas: [], ideaDelta: {},
    proposals: JSON.parse(JSON.stringify(D.PROPOSALS)), read: {}, notifs: [], queue: {}, draft: null,
    prefs: { email: true, milestones: true, comments: true, digest: false }, seenMsgs: false
  });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = fresh(); }
  const mem = {};
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S, (k, v) => (typeof v === 'string' && v.startsWith('data:') && v.length > 2000 ? 'mem:' + memKey(v) : v))); } catch (e) { /* quota: stays in memory */ }
  }
  function memKey(v) { const k = 'm' + v.length + '_' + v.slice(-24).replace(/[^a-z0-9]/gi, ''); mem[k] = v; return k; }
  const src = (v) => (v && v.startsWith('mem:') ? (mem[v.slice(4)] || 'img/p-tee.webp') : v);

  /* ------------------------------------------------------------------ data helpers */
  const ipById = (id) => D.IPS.find((x) => x.id === id) || D.IPS[0];
  const creator = (id) => D.CREATORS[id] || D.CREATORS['luna-nash'];
  const allIdeas = () => D.IDEAS.concat(S.extraIdeas).map((x) => Object.assign({}, x, S.ideaDelta[x.id] || {}));
  const idea = (id) => allIdeas().find((x) => x.id === id);
  const prop = (id) => S.proposals.find((x) => x.id === id);
  const money = (p) => (p.length > 1 ? `$${p[0].toFixed(2)}~${p[1].toFixed(2)}` : `$${p[0].toFixed(2)}`);
  const votes = (x) => x.votes + (S.votes[x.id] ? 1 : 0);
  const pres = (x) => x.pre + (S.pre[x.id] ? 1 : 0);
  const ncom = (x) => x.comments + (S.comments[x.id] || []).length;
  const pct = (a, b) => Math.max(0, Math.min(100, Math.round((a / b) * 100)));
  const STATUS = { validating: 'Validating', review: 'Under Review', launched: 'Launched', draft: 'Draft', precheck: 'Pre Check', rejected: 'Rejected', authorized: 'Authorized' };
  const stag = (s) => `<span class="stag ${s}">${STATUS[s] || s}</span>`;
  const allNotifs = () => S.notifs.concat(D.NOTIFS);
  const unread = () => allNotifs().filter((n) => n.unread && !S.read[n.id]).length;
  const isApparel = (cat) => /hoodie|t-shirt|tee|cap|socks/i.test(cat || '');
  const firstName = () => S.user.name.split(' ')[0];
  // "Home" depends on who you are: visitors → landing, creators → Ideas, IP owners → review queue
  const homeHref = () => (!S.logged ? '#/' : S.role === 'owner' ? '#/authorize?tab=queue' : '#/ideas');
  function notify(type, t, link) { S.notifs.unshift({ id: 'u' + Date.now(), type, t, d: 'Just now', link, unread: true }); }
  const chev = (n = 'next', a = '') => I(n, a);

  /* ------------------------------------------------------------------ router */
  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, q] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(q || ''), path };
  }
  const go = (h) => { if (('#' + h) === location.hash) render(); else location.hash = h; };
  let lastPath = '';
  const TITLES = { '': 'Make fan ideas official', owners: 'For IP owners', signup: 'Create account', login: 'Log in', ideas: 'Ideas', idea: 'Idea', create: 'Create proposal', proposals: 'My Proposals', proposal: 'Proposal', 'open-ip': 'Open IP', activity: 'Activity', authorize: 'Authorize', saved: 'Picked ideas', contact: 'Contact us', guidelines: 'Guidelines', rewards: 'My Rewards', settings: 'Settings' };

  function render() {
    const r = parse();
    const [a, b] = r.parts;
    let html, chrome = 'app', hdr = 'soft';
    closePop();
    switch (a) {
      case undefined: chrome = 'guest'; hdr = 'clear'; html = pLanding(); break;
      case 'owners': chrome = 'owner'; hdr = 'clear'; html = pOwners(); break;
      case 'signup': chrome = 'none'; html = pSignup(+b || 1, r.q); break;
      case 'login': chrome = 'none'; html = pLogin(r.q); break;
      case 'ideas': hdr = 'clear'; html = pIdeas(r.q); break;
      case 'idea': hdr = 'clear'; html = pIdea(b); break;
      case 'create': html = pCreate(+b || (S.draft && S.draft.step) || 1, r.q); break;
      case 'proposals': hdr = 'solid'; html = pProposals(r.q); break;
      case 'proposal': html = pProposal(b); break;
      case 'open-ip': hdr = b ? 'soft' : 'clear'; html = b ? pIP(b) : pOpenIP(r.q); break;
      case 'activity': html = pActivity(r.q); break;
      case 'authorize': html = pAuthorize(r.q); break;
      case 'saved': hdr = 'clear'; html = pSaved(); break;
      case 'rewards': html = pRewards(); break;
      case 'settings': html = pSettings(); break;
      case 'contact': chrome = S.logged ? 'app' : 'guest'; html = pContact(); break;
      case 'guidelines': chrome = S.logged ? 'app' : 'guest'; html = pGuidelines(); break;
      default: html = `<div class="wrap empty">${I('alert')}<h3>Page not found</h3><p>That link doesn’t lead anywhere in this prototype.</p><a class="pbtn pbtn-p" href="#/">Back home</a></div>`;
    }
    const pageCls = { ideas: 'bg-peach', idea: 'bg-peach', saved: 'bg-peach', undefined: '', owners: '' }[a] || '';
    const pull = hdr === 'clear' ? ' style="margin-top:-136px;padding-top:136px"' : '';
    $('#app').innerHTML = (chrome === 'none' ? '' : header(chrome, a, hdr)) + `<main class="page ${pageCls}" id="main"${chrome === 'none' ? '' : pull}>${html}</main>` + (chrome === 'none' ? '' : footer()) + `<button class="gfab" data-act="guide" aria-haspopup="dialog"><i></i>Prototype guide</button>`;
    document.title = (TITLES[a || ''] || 'IPLY') + ' · IPLY';
    const sec = r.q.get('s');
    if (sec && $('#' + sec)) setTimeout(() => $('#' + sec).scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    else if (r.path !== lastPath) window.scrollTo(0, 0);
    lastPath = r.path;
    after(a, b, r);
  }

  /* ------------------------------------------------------------------ chrome */
  function header(kind, a, bg) {
    const logo = `<a class="logo" href="${homeHref()}" aria-label="IPLY home"><img src="img/logo.svg" alt="IPLY — Make fan ideas official"></a>`;
    if (kind !== 'app' && !S.logged) {
      const owner = kind === 'owner';
      return `<header class="hdr ${bg}"><div class="wrap">${logo}
        <nav class="nav" id="nav" aria-label="Main"><a href="#/" class="${!owner && a !== 'contact' && a !== 'guidelines' ? 'on' : ''}">Fans</a><a href="#/owners" class="${owner ? 'on' : ''}">IP Owners</a><a href="#/contact" class="${a === 'contact' ? 'on' : ''}">Contact Us</a></nav>
        <div class="hdr-r">${owner ? `<a class="btn btn-k" href="#/login?as=owner">Log in</a><button class="btn btn-o" data-act="owner-join">Join as an IP Owner</button>` : `<a class="btn btn-k" href="#/signup">Sign up</a><a class="btn btn-o" href="#/login">Log in</a>`}
          <button class="ic burger" data-act="burger" aria-label="Menu" aria-controls="nav">${I('menu')}</button></div></div></header>`;
    }
    const nav = [['ideas', 'Ideas'], ['open-ip', 'Open IP'], ['activity', 'Activity'], ['authorize', 'Authorize'], ['contact', 'Contact Us']];
    const on = (k) => a === k || (k === 'ideas' && (a === 'idea' || a === 'saved')) || (k === 'authorize' && false);
    const bag = S.cart.length + Object.keys(S.pre).length;
    return `<header class="hdr ${bg}"><div class="wrap">${logo}
      <nav class="nav" id="nav" aria-label="Main">${nav.map(([k, l]) => `<a href="#/${k}" class="${on(k) ? 'on' : ''}" ${on(k) ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div class="hdr-r">
        <button class="ic hm" data-act="pop" data-pop="saved" aria-label="Picked ideas">${I('like')}${Object.keys(S.votes).length ? '<span class="dot"></span>' : ''}</button>
        <button class="ic" data-act="cart" aria-label="Bag and pre-orders${bag ? ', ' + bag + ' items' : ''}">${I('bag')}${bag ? '<span class="dot"></span>' : ''}</button>
        <button class="ic hm" data-act="pop" data-pop="msgs" aria-label="Messages">${I('chat')}${S.seenMsgs ? '' : '<span class="dot"></span>'}</button>
        <button class="ic" data-act="pop" data-pop="notifs" aria-label="Notifications${unread() ? ', ' + unread() + ' unread' : ''}">${I('bell')}${unread() ? '<span class="dot"></span>' : ''}</button>
        <button class="av-btn" data-act="pop" data-pop="me" aria-label="Account menu"><img class="av" src="img/av-user.webp" alt=""></button>
        <button class="ic burger" data-act="burger" aria-label="Menu" aria-controls="nav">${I('menu')}</button>
      </div></div></header>`;
  }
  function footer() {
    const col = (h, items) => `<div><h5>${h}</h5>${items.map(([l, href]) => `<a class="fl" href="${href}">${l}</a>`).join('')}</div>`;
    return `<footer class="ftr"><div class="wrap">
      <div><a class="logo" href="${homeHref()}" aria-label="IPLY home"><img src="img/logo-white.svg" alt="IPLY"></a><p class="d">A creator-first platform for turning fan merch concepts into licensing-ready proposals.</p>
        <div class="social">${[['fb', 'Facebook'], ['tw', 'Twitter'], ['yt', 'YouTube'], ['ig', 'Instagram'], ['pin', 'Pinterest'], ['wa', 'WhatsApp']].map(([k, n]) => `<a href="#/contact" aria-label="${n}">${I(k)}</a>`).join('')}</div></div>
      ${col('Platform', [['About iPly', '#/'], ['Open IPs', '#/open-ip'], ['Idea Pool', '#/ideas'], ['How It Works', '#/?s=how'], ['Marketplace', '#/ideas?status=launched&f=1'], ['Start Proposal', '#/create/1']])}
      ${col('For Creators', [['Submission Guidelines', '#/guidelines?s=submission'], ['Proposal Tips', '#/guidelines?s=tips'], ['Copyright Risk Guide', '#/guidelines?s=copyright'], ['Product Categories', '#/guidelines?s=categories'], ['Creator Dashboard', '#/proposals']])}
      ${col('For IP Owners', [['Register Your IP', '#/owners'], ['Review Proposals', '#/authorize?tab=queue'], ['Brand Guidelines', '#/guidelines?s=brand'], ['Licensing Settings', '#/authorize'], ['Contact Partnership Team', '#/contact']])}
      ${col('Legal', [['Terms of Service', '#/guidelines?s=legal'], ['Privacy Policy', '#/guidelines?s=legal'], ['IP Policy', '#/guidelines?s=legal'], ['Licensing FAQ', '#/guidelines?s=faq'], ['Report Infringement', '#/contact']])}
      <div class="proto-note"><span>Concept prototype · IXDS 708 Product Strategy &amp; Storytelling · SCAD. IP names and logos are illustrative only; no affiliation with the rights holders.</span><span>Wei Zhao · Dingrui Yu · Xiaohe Yu</span></div>
    </div></footer>`;
  }

  /* ------------------------------------------------------------------ shared pieces */
  function card(x, lg) {
    const cr = creator(x.creator), p = pres(x);
    return `<article class="pc${lg ? ' lg' : ''}">
      <a href="#/idea/${x.id}" class="ph" aria-label="${esc(x.title)}"><img src="${src(x.thumb || x.img)}" alt="" loading="lazy"><span class="st">${stag(x.status)}</span>${x.status === 'validating' ? `<span class="bar" title="${p} of ${x.goal} pre-order intents"><i style="width:${pct(p, x.goal)}%"></i></span>` : ''}</a>
      <a href="#/idea/${x.id}" class="bd"><div class="t">${esc(x.short || x.title)}</div><div class="by">by ${esc(cr.name)}</div><div class="pr">${money([x.price[0]])}</div></a>
      <div class="mt">
        <a href="#/idea/${x.id}?s=comments" aria-label="${ncom(x)} comments">${I('comment')}${ncom(x)}</a>
        <button data-act="vote" data-id="${x.id}" class="${S.votes[x.id] ? 'on' : ''}" aria-pressed="${!!S.votes[x.id]}" aria-label="Pick this idea, ${votes(x)} picks">${I('like')}${votes(x)}</button>
        <span title="Pre-order intents" aria-label="${p} pre-order intents">${I('pre')}${p}</span>
      </div></article>`;
  }
  function rail(id, items, cls = '', left = false) {
    return `<div class="rail ${left ? 'left' : ''} ${cls}" id="${id}" tabindex="0" aria-label="Carousel">${items}</div>`;
  }
  const railNav = (id, dark) => `<div class="rail-nav" style="color:${dark ? '#fff' : 'var(--ink)'}"><button data-act="rail" data-id="${id}" data-d="-1" aria-label="Previous">${I('back')}</button><button data-act="rail" data-id="${id}" data-d="1" aria-label="Next">${I('next')}</button></div>`;

  /* ------------------------------------------------------------------ LANDING — creator (Figma: Landing Page--Creator) */
  function pLanding() {
    const cats = [['Collectible Figures', 'Plastic / mixed materials / premium paper, metal', 'cat-figures'], ['Apparel', 'T-shirts / hoodies / sweatshirts / caps / beanies', 'cat-apparel'], ['Keychains & Charms', 'Acrylic / PVC rubber / metal / epoxy coating', 'cat-keychains'], ['Enamel Pins', 'Zinc alloy / iron, soft enamel, hard enamel, metal plating', 'cat-pins'], ['Plush', 'Soft plush fabric / cotton stuffing', 'cat-plush'], ['Art Prints & Posters', 'Matte paper / glossy paper / textured art paper', 'cat-prints'], ['Stickers', 'Vinyl / waterproof coating / matte / glossy laminate', 'cat-stickers'], ['Acrylic Stands', 'Clear acrylic / UV print / detachable acrylic base', 'cat-acrylic']];
    const ips = ['spy-family', 'hollow-knight', 'stranger-things', 'genshin', 'squid-game'].map(ipById);
    const start = S.logged ? '#/create/1' : '#/signup?next=create';
    return `
    <section class="lc-hero bg-peach" style="margin-top:-136px;padding-top:185px"><div class="wrap hero-g">
      <div>
        <span class="pill">Welcome To iPly</span>
        <h1 class="h-xl">Turn<br>fan ideas into<br><span class="o">official<br>merch.</span></h1>
        <p class="lead">Submit product concepts for the IPs you love, gather support from fans, and get a chance to be reviewed for official licensing.</p>
        <div class="cta-row"><a class="btn btn-o" href="${start}">Start Your Proposal</a><a class="btn btn-k" href="#/open-ip">Explore Open IPs</a></div>
        <div class="proof"><div class="stack"><img src="img/av-c0.webp" alt=""><img src="img/av-c2.webp" alt=""><img src="img/av-c3.webp" alt=""><img src="img/av-c1.webp" alt=""></div><span><b>2K+</b> Creators use iPly</span></div>
        <p class="quote">“No production experience required. Start with an idea, sketch, or mockup.”</p>
      </div>
      <img class="art" src="img/lc-hero.webp" alt="Hollow Knight collector box concept with figure and art card">
    </div>
    <div class="wrap steps4" style="margin-top:201px">
      ${[['Turn Ideas into Proposals', 'Transform your fan merch idea into a clear product concept that IP owners can actually review.'], ['Test Fan Demand', 'Use votes, saves, comments, and purchase interest to see whether fans really want your product.'], ['Reach IP Owners', 'Bring promising concepts into a structured review path instead of trying to contact rights holders on your own.'], ['Get Permission', 'Move beyond unofficial fan art by working toward approved, legal fan merchandise.']].map(([h, p], i) => `<div class="ibox rv"><div class="n">0${i + 1}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}
    </div></section>
    <section class="sec-o prob"><div class="wrap">
      <span class="pill w">Join the IPly Creation Journey</span>
      <h2 class="h-l">Great fan ideas<br>often stop too early.</h2>
      <div class="cards3">
        ${[['You know what fans actually want.', '72% of fans we surveyed have made or shared fan designs', 'You understand the jokes, aesthetics, characters, and emotional details that generic merch often misses.', 'lc-problem-1'], ['But ideas stay unofficial.', '832K Etsy listings removed over IP issues in 2024', 'Many fan concepts remain as sketches, posts, or fan art because licensing is hard to access.', 'lc-problem-2'], ['Production feels out of reach.', '85% want to see favourite fan designs become official merch', 'Creators usually do not have the supply chain, budget, or brand connection to turn ideas into real products.', 'lc-problem-3']].map(([h, st, p, img]) => `<article class="pcard rv"><img src="img/${img}.webp" alt="" loading="lazy"><div class="b"><h3>${h}</h3><div class="mem">${I('trend')}<span>${st}</span></div><p>${p}</p></div></article>`).join('')}
      </div>
      <p class="src-note">Survey figures are preliminary signals from a team-run fan survey (sample size not recorded). Etsy figure: Etsy 2024 Transparency Report.</p>
    </div></section>
    <section class="sec-k how-sec" id="how"><div class="wrap">
      <h2 class="h-l">Let’s see how it works</h2>
      <div class="how">${[['Choose an IP', 'Browse available IP campaigns and select the fandom you want to design for.'], ['Submit a merch proposal', 'Upload your product mockup, artwork file, and basic production details.'], ['Validate fan demand', 'Fans vote, save, comment, and show purchase interest before production.'], ['Get IP owner approval', 'High-performing designs are reviewed for licensing, brand fit, and feasibility.'], ['Launch licensed merch', 'Approved designs move toward pilot production as official licensed merchandise.']].map(([h, p], i) => `<div class="st rv"><div class="n">0${i + 1}</div><h4>${h}</h4><p>${p}</p></div>`).join('')}</div>
    </div></section>
    <section class="sec-w tsec"><div class="wrap split">
      <div class="copy"><span class="pill">Submission Types</span><h2 class="h-l up">What can<br>you submit</h2><p>From figures to apparel, posters to lifestyle goods — submit your best ideas in the categories below.</p><a class="btn btn-k" href="${start}">Start upload your ideas</a></div>
      ${rail('rail-types', cats.map(([h, p, img]) => `<a class="tcard" href="#/guidelines?s=categories"><img src="img/${img}.webp" alt="" loading="lazy"><div class="b"><h4>${h}</h4><p>${p}</p></div></a>`).join(''))}
    </div></section>
    <section class="bg-peach tsec"><div class="wrap split rev">
      ${rail('rail-ips', ips.map((ip) => `<a class="ipc" href="#/open-ip/${ip.id}"><img src="${ip.cover}" alt="" loading="lazy"><div class="b"><h4>${ip.name}</h4><span class="ttag">${ip.type}</span><p class="until">${ip.open === 'Closed' ? 'Not accepting proposals' : 'Open until ' + ip.open}</p><span class="vm">View more details +</span></div></a>`).join(''), '', true)}
      <div class="copy"><span class="pill">Open IP Programs</span><h2 class="h-l up">IPs looking for creators ideas</h2><p>These IP owners are currently accepting proposals. Click to view details and start your submission.</p><a class="btn btn-k" href="#/open-ip">Explore all Open IPs</a></div>
    </div>
    <div class="wrap strip" aria-label="Open IP programs">${['hollow-knight', 'arcane', 'omori', 'genshin', 'spy-family', 'stranger-things'].map((k) => `<a href="#/open-ip/${k}"><img src="img/ip-${k}.webp" alt="${ipById(k).name}" loading="lazy"></a>`).join('')}</div></section>
    <section class="sec-k"><div class="wrap camp">
      <div><span class="pill">Example Campaign</span><h2 class="h-l up" style="margin-top:18px">Real ideas,<br>real impact.</h2><p>See how creators are already turning concepts into licensed merch. Flora Z.’s collector drop went from a sketch to IP owner review in 26 days — 3,421 fans said they would buy it before a single unit was made.</p><a class="btn btn-w" href="#/ideas?ip=hollow-knight&f=1">View more campaigns</a></div>
      <a class="camp-card rv" href="#/ideas?ip=hollow-knight&f=1"><img src="img/lc-campaign.webp" alt="Hollow Knight collector drop" loading="lazy">
        <div class="ov"><div><h3>HOLLOW<br>KNIGHT</h3><div class="k">COLLECTOR DROP</div><div class="cr">Creator: Flora Z.</div></div>
        <div class="cst"><div><b>${I('users')}12,842</b><small>Total saves</small></div><div><b>${I('heart')}3,421</b><small>Pre-order interests</small></div><div><b>${I('shield')}Under Review</b><small>IP owner review</small></div></div></div></a>
    </div></section>
    <section class="sec-o cta-sec"><div class="wrap">
      <span class="pill w">Join the IPly Creation Journey</span>
      <h2 class="h-l">Ready to turn your idea into something fans can support?</h2>
      <p>Share fan-made product ideas, validate demand through the community, and connect with IP holders through a creator-driven licensing platform.</p>
      <form class="mail" data-form="mail" novalidate><label class="sr" for="cta-mail">E-mail</label><input id="cta-mail" type="email" name="email" placeholder="Enter your E-mail" autocomplete="email"><button class="btn btn-white">Sign Up</button></form>
      <div class="or-line">or<br><a href="#/owners">Join as an IP Owner</a></div>
    </div></section>`;
  }

  /* ------------------------------------------------------------------ LANDING — IP owner (Figma: Landing Page--IP Owner) */
  function pOwners() {
    const trust = [['Flexible production partnerships', 'Partner with approved manufacturers or existing supply chains.', 'lo-trust-handshake'], ['Moderated creator submissions', 'Concepts are reviewed before entering licensing consideration.', 'lo-trust-board'], ['Structured approval workflow', 'IP owners maintain final review authority on all products.', 'lo-trust-laptop'], ['Verified ownership system', 'Only verified IP owners can approve licensed production opportunities.', 'lo-trust-cert']];
    return `
    <section class="bg-peach lo-hero" style="margin-top:-136px;padding-top:185px"><div class="wrap">
      <div class="lo-top"><div>
        <span class="pill">Welcome To iPly</span>
        <h1 class="h-xl">Discover<br>what your<br>fans <span class="o">really<br>want</span></h1>
        <p class="lead">Discover fan-backed ideas before production. Use real demand signals to choose what to license.</p>
      </div><img src="img/lo-hero.webp" alt="IP owner reviewing a fan-demand dashboard"></div>
      <div class="lo-bot"><div>
        <div class="osteps">${[['Sign up', 'to create your IP owner profile.'], ['Submit IP & proof', 'Share IP details and ownership documents.'], ['Get approved', 'by our team in 5 business days.']].map(([b, s], i) => `<div class="${i ? '' : 'f'}"><div class="c">${i + 1}</div><b>${b}</b><small>${s}</small></div>`).join('')}</div>
        <div class="cta-row" style="margin-top:0"><button class="btn btn-o" data-act="owner-join">Join as an IP Owner</button><button class="btn btn-k" data-act="owner-req">View Requirements</button></div>
      </div><img src="img/lo-hero.webp" alt="" loading="lazy" style="object-position:72% 55%"></div>
    </div></section>
    <section class="sec-w"><div class="wrap benef">${[['Validate demand before production', 'See what fans actually want before spending time and budget on manufacturing.'], ['Discover high-potential product ideas', 'Access creator-submitted concepts that match your IP, audience, and fandom culture.'], ['Reduce merchandise risk', 'Use saves, votes, and preorder interest to avoid low-performing product launches.'], ['Save internal development time', 'Skip months of trend research and early ideation by reviewing fan-backed concepts directly.']].map(([h, p]) => `<div class="rv"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div></section>
    <section class="sec-w how-sec"><div class="wrap" style="padding-top:126px">
      <h2 class="h-l" style="text-align:center;text-transform:uppercase;color:#000">How it works</h2>
      <div class="how four light">${[['Verify Your IP Ownership', 'Submit ownership or authorization documents and complete our verification process.'], ['Receive Creator Submissions', 'Verified creators submit original product concepts inspired by your IP.'], ['Review Fan Demand Signals', 'Track votes, saves, preorder intent, and community engagement in real time.'], ['Approve Products for Licensing', 'Select validated concepts for official collaboration, licensing, and production.']].map(([h, p], i) => `<div class="st rv"><div class="n">0${i + 1}</div><h4>${h}</h4><p>${p}</p></div>`).join('')}</div>
    </div></section>
    <section class="bg-peach"><div class="wrap ins">
      <div><span class="pill">For IP Owners</span><h2 class="h-xl">Real-time<br><span class="o">fandom demand</span><br>insights</h2><p class="lead">Understand what your audience wants so you can act faster and stay ahead of the market.</p><button class="btn btn-o" data-act="owner-join">Join as an IP Owner</button></div>
      <div class="icard rv"><h4>Top requested categories</h4>${donut()}</div>
      <div class="icard rv"><h4>Save-to-preorder</h4><div class="big">71%</div><div class="upl"><b>▲ 9%</b> vs last 30 days</div>${spark()}</div>
    </div></section>
    <section class="sec-w"><div class="wrap trust">
      ${rail('rail-trust', trust.map(([h, p, img]) => `<div class="tcd"><img src="img/${img}.webp" alt="" loading="lazy"><div class="b"><h4>${h}</h4><p>${p}</p><button data-act="trust" data-h="${esc(h)}">View more details +</button></div></div>`).join(''), '', true)}
      <div class="copy"><span class="pill">Trust &amp; Control</span><h2 class="h-l up" style="margin-top:18px">Built for licensing collaboration</h2><p>Designed to protect IP quality, approval control, and brand integrity.</p><a class="btn btn-k" href="#/open-ip">Explore all Open IPs</a></div>
    </div>
    <div class="wrap badges">${[['shield', 'Ownership verification'], ['file', 'Brand guideline checks'], ['box', 'Accredited safety testing'], ['link', 'Contract & royalty tracking']].map(([i, t]) => `<div>${I(i)}${t}</div>`).join('')}</div></section>
    <section class="sec-o cta-sec"><div class="wrap">
      <span class="pill w">Become an IPLY Partner</span>
      <h2 class="h-l">Ready to discover what your fans want next?</h2>
      <p>Join IPLY to validate fan demand, review creator concepts, and turn high-potential ideas into licensed merchandise opportunities.</p>
      <form class="mail" data-form="owner-mail" novalidate><label class="sr" for="cta-mail2">E-mail</label><input id="cta-mail2" type="email" name="email" placeholder="Enter your E-mail" autocomplete="email"><button class="btn btn-white">Sign Up</button></form>
    </div></section>`;
  }
  function donut() {
    const data = [['Figures', 42, '#E95B3A'], ['Apparel', 28, '#F6D7C6'], ['Accessories', 12, '#F7E79B'], ['Enamel Pins', 10, '#FBE9E4'], ['Other', 8, '#C9C9CE']];
    let acc = 0;
    const segs = data.map(([, v, c], i) => { const s = `<circle data-seg="${i}" r="15.915" cx="21" cy="21" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="${v} ${100 - v}" stroke-dashoffset="${25 - acc}" style="transition:stroke-width .2s;cursor:pointer"></circle>`; acc += v; return s; }).join('');
    return `<div class="donut"><svg viewBox="0 0 42 42" width="230" height="230" role="img" aria-label="Top requested categories: Figures 42%, Apparel 28%, Accessories 12%, Enamel Pins 10%, Other 8%">${segs}<text id="dn-v" x="21" y="23.6" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="7.4" fill="#11141B">42%</text></svg>
      <div class="legend">${data.map(([n, v, c], i) => `<div data-seg="${i}" class="${i ? '' : 'on'}"><i style="background:${c}"></i>${n}<span>${v}%</span></div>`).join('')}</div></div>`;
  }
  function spark() {
    const pts = [8, 10, 9, 12, 11, 14, 13, 18, 16, 21, 19, 26, 22, 30], w = 300, h = 140, mx = 32;
    const line = pts.map((v, i) => `${Math.round((i / (pts.length - 1)) * w)},${Math.round(h - (v / mx) * h)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="190" preserveAspectRatio="none" style="margin-top:26px" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E95B3A" stop-opacity=".45"/><stop offset="1" stop-color="#E95B3A" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${line} ${w},${h}" fill="url(#sg)"/><polyline points="${line}" fill="none" stroke="#E95B3A" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* ------------------------------------------------------------------ AUTH — Onboarding 01-03 */
  function authShell(step, inner, bg, ill, mid) {
    return `<div class="auth"><div class="auth-l" style="background:${bg}"><img class="ill" src="${ill}" alt=""><a href="#/" aria-label="IPLY home"><img class="alogo" src="img/logo.svg" alt="IPLY"></a></div>
      <div class="auth-r"><div class="auth-top"><button data-act="auth-back">${I('back')}Back</button><span>${step}</span></div><div class="auth-body${mid ? ' mid' : ''}">${inner}</div></div></div>`;
  }
  function pSignup(step, q) {
    if (step === 1) {
      return authShell('STEP 01/03', `<h1>Create Your Account!</h1><p class="sub">We use your information to support a safe and trusted creator community.</p>
        <form data-form="signup" novalidate>
          <div class="fld"><label for="f-name">Full name*</label><input class="inp" id="f-name" name="name" value="${esc(S.user.name)}" autocomplete="name"></div>
          <div class="fld"><label for="f-email">Email address*</label><input class="inp" id="f-email" name="email" type="email" value="${esc(q.get('email') || S.user.email || '')}" placeholder="Enter email address" autocomplete="email"></div>
          <div class="fld"><label for="f-pw">Create password*</label><div class="pw"><input class="inp" id="f-pw" name="pw" type="password" placeholder="Enter password (8+ characters)" autocomplete="new-password" minlength="8"><button type="button" data-act="pw">Show</button></div></div>
          <label class="ck" style="margin:0 0 38px"><input type="checkbox" name="terms" checked> <span>I agree to the <a href="#/guidelines?s=legal" target="_blank">Terms &amp; Conditions</a></span></label>
          <button class="abtn p">Create Account</button>
          <div class="or">Or</div>
          <button type="button" class="abtn w" data-act="google">${I.google}Continue with Google</button>
          <p class="alt">Already have an account? <a href="#/login">Log in</a></p>
        </form>`, '#E95B3A', 'img/onb1-illus.webp');
    }
    if (step === 2) {
      const a = S.user.age;
      return authShell('STEP 02/03', `<h1 style="margin-bottom:56px">Which age group are you in?</h1>
        <div role="radiogroup" aria-label="Age group">${[['Under 18', 'child'], ['18+', 'adult']].map(([v, ic]) => `<button class="opt ${a === v ? 'on' : ''}" role="radio" aria-checked="${a === v}" data-act="age" data-v="${v}">${I(ic)}${v}<span class="rad"></span></button>`).join('')}</div>
        <p class="hint" style="margin:-8px 0 44px">${a === 'Under 18' ? 'Under-18 accounts can browse, pick and comment. Proposals and pre-orders need a guardian’s approval.' : 'We ask so we can show age-appropriate IPs and keep pre-orders safe.'}</p>
        <button class="abtn p" data-act="go" data-href="#/signup/3">Continue</button>`, '#FFC6B9', 'img/onb2-illus.webp', true);
    }
    const f = S.user.fandoms, extra = f.filter((x) => !D.FANDOMS.includes(x));
    return authShell('STEP 03/03', `<h1>Add your own fandom</h1><p class="sub2">Pick at least one — we’ll show open IP programs and ideas for these first.</p>
      <div class="ochips" role="group" aria-label="Fandoms">${D.FANDOMS.concat(extra).map((n) => `<button class="ochip ${f.includes(n) ? 'on' : ''}" data-act="fandom" data-v="${esc(n)}" aria-pressed="${f.includes(n)}">${esc(n)}</button>`).join('')}<form class="ochip add" data-form="fandom"><label class="sr" for="add-f">Add your fandom</label>+&nbsp;<input id="add-f" name="f" placeholder="Add your fandom" maxlength="30"></form></div>
      <button class="abtn ${f.length ? 'p' : 'g'}" data-act="signup-done" ${f.length ? '' : 'aria-disabled="true"'}>Done</button>`, '#FFC6B9', 'img/onb3-illus.webp', true);
  }
  function pLogin(q) {
    const owner = q.get('as') === 'owner';
    return authShell('', `<h1>Welcome back!</h1><p class="sub">${owner ? 'Log in to the IP owner portal to review fan-backed proposals.' : 'Log in to keep track of your proposals and picks.'}</p>
      <form data-form="login" novalidate>
        <div class="fld"><label for="l-email">Email address*</label><input class="inp" id="l-email" name="email" type="email" value="${owner ? 'licensing@pixelgrove.studio' : 'luna@example.com'}" autocomplete="email"></div>
        <div class="fld"><label for="l-pw">Password*</label><div class="pw"><input class="inp" id="l-pw" name="pw" type="password" value="demo-password" autocomplete="current-password"><button type="button" data-act="pw">Show</button></div><div class="hint">Prototype: demo details are pre-filled.</div></div>
        <button class="abtn p" style="margin-top:20px">${owner ? 'Log in to IP Owner Portal' : 'Log in'}</button>
        <div class="or">Or</div>
        <button type="button" class="abtn w" data-act="google-login">${I.google}Continue with Google</button>
        <p class="alt">New here? <a href="#/signup">Create an account</a></p>
      </form>`, '#E95B3A', 'img/onb1-illus.webp');
  }

  /* ------------------------------------------------------------------ IDEAS (Figma: Ideas) */
  function searchRow(val, open, setQ) {
    return `<form class="search-row" data-form="search" role="search"><label class="search">${I('search')}<span class="sr">Search by IP or creator</span><input name="q" value="${esc(val || '')}" placeholder="IP / Creator" autocomplete="off"></label><button class="sbtn">Search</button><a class="fbtn ${open ? 'on' : ''}" href="${setQ}" aria-label="Filters" aria-expanded="${!!open}">${I('sliders')}</a></form>`;
  }
  function pIdeas(q) {
    const term = (q.get('q') || '').toLowerCase(), ipf = q.get('ip') || '', cat = q.get('cat') || '', st = q.get('status') || '', sort = q.get('sort') || 'default', cr = q.get('creator') || '';
    const open = q.get('f') === '1';
    let list = allIdeas().filter((x) => (!term || (x.title + ' ' + ipById(x.ip).name + ' ' + creator(x.creator).name + ' ' + x.cat).toLowerCase().includes(term)) && (!ipf || x.ip === ipf) && (!cat || x.cat === cat) && (!st || x.status === st) && (!cr || x.creator === cr));
    const sorters = { trending: (a, b) => votes(b) - votes(a), closest: (a, b) => pres(b) / b.goal - pres(a) / a.goal, ending: (a, b) => (a.daysLeft || 99) - (b.daysLeft || 99), price: (a, b) => a.price[0] - b.price[0] };
    if (sorters[sort]) list.sort(sorters[sort]);
    const cats = [...new Set(allIdeas().map((x) => x.cat))].sort();
    const setQ = (k, v) => { const n = new URLSearchParams(q); v ? n.set(k, v) : n.delete(k); return '#/ideas?' + n.toString(); };
    const filtered = term || ipf || cat || st || cr;
    return `<div class="wrap" style="padding-bottom:120px">
      ${searchRow(q.get('q'), open, setQ('f', open ? '' : '1'))}
      ${open ? `<div class="filters">
        <label for="fi-ip">IP</label><select id="fi-ip" data-q="ip"><option value="">All IPs</option>${D.IPS.map((ip) => `<option value="${ip.id}" ${ipf === ip.id ? 'selected' : ''}>${ip.name}</option>`).join('')}</select>
        <label for="fi-cat">Category</label><select id="fi-cat" data-q="cat"><option value="">All</option>${cats.map((c) => `<option ${cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <label for="fi-sort">Sort</label><select id="fi-sort" data-q="sort">${[['default', 'Featured'], ['trending', 'Most picked'], ['closest', 'Closest to goal'], ['ending', 'Ending soon'], ['price', 'Price: low to high']].map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="chips">${[['', 'All'], ['validating', 'Validating'], ['review', 'Under Review'], ['launched', 'Launched']].map(([v, l]) => `<a class="fchip sm ${st === v ? 'on' : ''}" href="${setQ('status', v)}">${l}</a>`).join('')}</div>
      </div>` : ''}
      ${filtered ? `<p class="resline">${list.length} idea${list.length === 1 ? '' : 's'}${cr ? ' by ' + esc(creator(cr).name) : ''}${ipf ? ' for ' + esc(ipById(ipf).name) : ''} · <a href="#/ideas">Clear filters</a></p>` : ''}
      ${list.length ? `<div class="grid4">${list.map((x) => card(x)).join('')}</div>` : `<div class="empty">${I('search')}<h3>No ideas match “${esc(q.get('q') || '')}”</h3><p>Try another IP or creator — or be the first to propose it.</p><a class="pbtn pbtn-p" href="#/create/1">Create a proposal</a></div>`}
    </div>`;
  }

  /* ------------------------------------------------------------------ IDEA DETAIL (Figma: Product detail Page) */
  let ds = {};
  function seedComments(x, ip) {
    if (!x.comments) return [];
    const n = (x.short || x.cat).toLowerCase();
    return [
      { u: '@mosscloak_21', a: 'img/av-c0.webp', t: `This ${n} feels like it actually understands ${ip.name} — not just a logo slapped on.` },
      { u: '@littleknightclub', a: 'img/av-c1.webp', t: 'Love the colours. Would it come in a second colourway? I’d pre-order straight away.' },
      { u: '@dirtmouthwanderer', a: 'img/av-c2.webp', t: 'I would buy this if it became official. The details are what generic merch always misses.' },
      { u: '@greenpath.gal', a: 'img/av-c3.webp', t: `Hoping the price stays under $${x.price[0] + 5}. Picked!` }
    ].slice(0, Math.min(4, x.comments));
  }
  function pIdea(id) {
    const x = idea(id);
    if (!x) return `<div class="wrap empty">${I('alert')}<h3>Idea not found</h3><a class="pbtn pbtn-p" href="#/ideas">Back to Ideas</a></div>`;
    const ip = ipById(x.ip), cr = creator(x.creator);
    const st = ds[id] || (ds[id] = { v: 0, img: 0, size: 'S', allC: false, tag: 'Love it' });
    const gal = (x.gallery || [x.img]).slice();
    if (x.variants) gal[0] = x.variants[st.v].img;
    const main = src(gal[st.img] || gal[0]);
    const p = pres(x), goal = x.goal, picked = !!S.votes[id], held = !!S.pre[id];
    const rank = Math.max(1, Math.round(100 - (allIdeas().filter((o) => votes(o) < votes(x)).length / allIdeas().length) * 100));
    const cta2 = x.status === 'launched' ? `<button class="pbtn pbtn-g" data-act="add-cart" data-id="${id}">Add to cart</button>`
      : (x.status === 'review' || x.status === 'authorized') ? `<button class="pbtn ${held ? 'done' : 'pbtn-g'}" data-act="notify-me" data-id="${id}" aria-pressed="${held}">${held ? 'We’ll notify you ✓' : 'Notify me at launch'}</button>`
      : `<button class="pbtn ${held ? 'done' : 'pbtn-g'}" data-act="preorder" data-id="${id}" aria-pressed="${held}">${held ? 'Pre-order joined ✓' : 'Join pre-order'}</button>`;
    const vb = x.status === 'launched'
      ? `<div class="vbox"><div class="top">Officially licensed · in stock<span>${p} fans backed it before launch</span></div><div class="bar"><i class="g" style="width:100%"></i></div><p class="h">Licensed by ${esc(ip.owner)}. The creator earns ${ip.royalty}% of every sale.</p></div>`
      : x.status === 'authorized' ? `<div class="vbox"><div class="top">Approved by the IP owner<span>${p} / ${goal}</span></div><div class="bar"><i class="g" style="width:100%"></i></div><p class="h">Licensed and heading into a pilot production run. Pre-order holders are charged when it ships.</p></div>`
        : x.status === 'review' ? `<div class="vbox"><div class="top">Goal reached · with the IP owner<span>${p} / ${goal}</span></div><div class="bar"><i style="width:100%"></i></div><p class="h">The IP owner is checking brand fit and feasibility. Pre-orders are held — nobody is charged unless it’s approved.</p></div>`
          : `<div class="vbox"><div class="top">${p} / ${goal} pre-order intents<span>${x.daysLeft} days left</span></div><div class="bar"><i style="width:${pct(p, goal)}%"></i></div><p class="h">${goal - p > 0 ? `${goal - p} more to unlock IP owner review.` : 'Goal reached!'} No charge until the IP owner approves and production starts.</p></div>`;
    const dicons = { 'Why fans love it': 'heart', Material: 'leaf', Dimensions: 'ruler', 'IP fits': 'shield', 'Creator notes': 'brush' };
    const det = x.detail || { 'Why fans love it': x.desc, Material: `Proposed as a ${x.cat.toLowerCase()}; final materials are confirmed with the IP owner’s licensed manufacturer.`, Dimensions: 'Standard size for this category. Exact specs are set during production planning.', 'IP fits': `Designed for ${ip.name}. ${ip.tone}`, 'Creator notes': x.desc };
    const comments = (S.comments[id] || []).concat(D.COMMENTS[id] || seedComments(x, ip));
    const more = allIdeas().filter((o) => o.id !== id && (o.ip === x.ip || o.creator === x.creator)).slice(0, 6);
    return `<div class="wrap" style="padding-bottom:120px">
      ${searchRow('', false, '#/ideas?f=1').replace('search-row', 'search-row tight')}
      <button class="back" data-act="back">${I('back')}Back</button>
      <section class="dcard">
        <div class="dtop">
          <div>
            <div class="gmain">${stag(x.status)}<img src="${main}" alt="${esc(x.title)}${x.variants ? ', ' + x.variants[st.v].c : ''}"><button class="zoom" data-act="lightbox" data-src="${esc(main)}" aria-label="Enlarge image">${I('search')}</button></div>
            <div class="gth" role="group" aria-label="Product images">${gal.map((g, i) => `<button class="th ${st.img === i ? 'on' : ''}" data-act="gal" data-id="${id}" data-i="${i}" aria-label="Image ${i + 1}" aria-pressed="${st.img === i}"><img src="${src(g)}" alt=""></button>`).join('')}${Array.from({ length: Math.max(0, 4 - gal.length) }, () => '<span></span>').join('')}</div>
          </div>
          <div class="dinfo">
            <h1>${esc(x.title)}</h1>
            <div class="by">by <a href="#/ideas?creator=${x.creator}">${esc(cr.name)}</a> · <a href="#/open-ip/${ip.id}">${esc(ip.name)}</a></div>
            <div class="price">${money(x.price)}</div>
            <h5>Description</h5><p class="desc">${esc(x.desc)}</p>
            ${x.variants ? `<h5 class="c">Choose color</h5><div class="lbl">${x.variants[st.v].c}</div><div class="sws" role="radiogroup" aria-label="Color">${x.variants.map((v, i) => `<button class="th ${st.v === i ? 'on' : ''}" role="radio" aria-checked="${st.v === i}" data-act="color" data-id="${id}" data-i="${i}" aria-label="${v.c}" title="${v.c}"><img src="${v.img}" alt=""></button>`).join('')}</div>` : ''}
            ${isApparel(x.cat) ? `<h5 class="${x.variants ? 's' : 'c'}">Size<button class="sg" data-act="size-guide">Size Guide</button></h5><div class="sizes" role="radiogroup" aria-label="Size">${['S', 'M', 'L', 'XL'].map((s) => `<label><input type="radio" name="size" value="${s}" ${st.size === s ? 'checked' : ''} data-act="size" data-id="${id}">${s}</label>`).join('')}</div>` : ''}
            <div class="dcta"><button class="pbtn ${picked ? 'done' : 'pbtn-p'}" data-act="vote" data-id="${id}" aria-pressed="${picked}">${picked ? 'Picked ✓' : 'Pick this idea'}</button>${cta2}</div>
            <div class="trio">
              <button data-act="ip-info" data-ip="${ip.id}">${I('heart')}<b>IP clearance available</b><small>${ip.open === 'Closed' ? 'Program closed' : 'Ready to license'}</small></button>
              <div>${I('shield')}<b>Community favorite</b><small>Top ${rank}% of ideas</small></div>
              <button data-act="remix" data-id="${id}">${I('swap')}<b>Open for Creator remix</b><small>Build on this idea</small></button>
            </div>
            ${vb}
          </div>
        </div>
        <div class="dbot">
          <div class="panel"><h3>Product detail</h3>${Object.entries(det).map(([k, v], i) => `<div class="acc"><button data-act="acc" aria-expanded="false"><span class="ico">${I(dicons[k] || 'info')}</span><span><b>${k}</b><p>${esc(v)}</p></span><span class="chev">${I('down')}</span></button></div>`).join('')}</div>
          <div class="panel"><h3>About Creator</h3>
            <div class="cre"><img src="${cr.avatar}" alt=""><div><b>${esc(cr.name)}</b><p>${esc(cr.bio)}</p><a class="vbtn" href="#/ideas?creator=${x.creator}">View profile</a></div></div>
            <div class="imp-h">Creator Impact</div>
            <div class="imp"><div>${I('box')}<b>${cr.inProduction}</b><small>In Production</small></div><div>${I('users')}<b>${cr.validating}</b><small>In Validation</small></div><div>${I('grid')}<b>${cr.published}</b><small>Published Ideas</small></div><div><div class="lg"><img src="img/ip-hollow-knight.webp" alt="Hollow Knight"><img src="img/ip-stranger-things.webp" alt="Stranger Things"><img src="img/ip-squid-game.webp" alt="Squid Game"></div><small>Partnered IPs</small></div></div>
            <div class="qbox">“${esc(cr.quote || cr.bio)}”</div>
          </div>
        </div>
      </section>
      ${more.length ? `<div class="rowh"><h2>You May also like</h2><div class="rh"><a class="more" href="#/ideas?ip=${x.ip}&f=1">View all${chev()}</a></div></div>${rail('rail-more', more.map((o) => card(o, true)).join(''))}` : ''}
      <div class="rowh" id="comments" style="scroll-margin-top:160px"><h2>Comments<small>${ncom(x)}</small></h2>${comments.length > 4 ? `<button class="more" data-act="all-comments">${st.allC ? 'Show less' : 'View all'}${chev()}</button>` : ''}</div>
      <form class="cbox" data-form="comment" data-id="${id}" novalidate><img src="img/av-user.webp" alt=""><div class="f"><label class="sr" for="c-in">Your comment</label><textarea id="c-in" name="t" placeholder="What are your thoughts on this idea?" maxlength="400" data-count="1"></textarea>
        <div class="acts"><div class="ctags" role="radiogroup" aria-label="Comment type">${['Love it', 'Suggestion', 'Would buy'].map((t) => `<button type="button" class="ctag ${st.tag === t ? 'on' : ''}" role="radio" aria-checked="${st.tag === t}" data-act="ctag" data-id="${id}" data-v="${t}">${t}</button>`).join('')}<span class="ctag" style="pointer-events:none">${esc(ip.name)}</span></div><div class="send"><span class="ccount" id="ccount">0/400</span><button class="pbtn pbtn-p sm">Post comment</button></div></div></div></form>
      ${comments.length ? rail('rail-cm', (st.allC ? comments : comments.slice(0, 4)).map((c) => `<div class="cm ${c.mine ? 'nw' : ''}"><img src="${c.a}" alt=""><div><b>${esc(c.u)}</b><p>${esc(c.t)}</p>${c.tag ? `<span class="ct">${esc(c.tag)}</span>` : ''}</div></div>`).join(''), 'cms') : `<p class="t-sf20" style="margin-top:28px">No comments yet — be the first to share feedback.</p>`}
    </div>`;
  }

  /* ------------------------------------------------------------------ CREATE PROPOSAL (Figma: Proposal submission Page 1-3; steps 4-5 added) */
  const STEPS = ['Choose IP', 'Product Type', 'Upload', 'Audience & Price', 'Publish'];
  const blankDraft = () => ({ id: 'd' + Date.now(), ip: '', type: '', format: 'Product Concept', dirs: [], images: [], caption: '', desc: '', url: '', imgType: '', srcLink: '', original: false, title: '', fans: ['Collectors'], age: 'All ages', price: 28, goal: 0, days: 30, regions: ['North America'], step: 1, agree1: false, agree2: false, pre: null });
  const Dr = () => S.draft || (S.draft = blankDraft());
  function stepOk(n, d) {
    if (n === 1) return !!d.ip;
    if (n === 2) return !!d.type && !!d.format;
    if (n === 3) return d.images.length > 0 && d.original;
    if (n === 4) return d.title.trim().length >= 3;
    return !!(d.pre && !Object.values(d.pre).some((c) => c.r === 'run' || c.r === 'fail') && d.agree1 && d.agree2);
  }
  const NEED = ['', 'Choose an IP to continue.', 'Choose a product type to continue.', 'Add at least one image and confirm originality.', 'Add a proposal title (3+ characters).', 'Wait for the pre-check and accept both agreements.'];
  function pCreate(step, q) {
    const d = Dr();
    if (q.get('ip') && !d.ip) d.ip = q.get('ip');
    for (let i = 1; i < step; i++) if (!stepOk(i, d)) { step = i; break; }
    step = Math.min(5, Math.max(1, step)); d.step = step; save();
    const ok = stepOk(step, d), ip = d.ip ? ipById(d.ip) : null;
    const stepper = `<div class="stepper" role="list"><span class="fill" style="width:${(step - 1) * 20}%"></span>${STEPS.map((s, i) => { const n = i + 1, done = n < step; return `<button role="listitem" class="${n === step ? 'on' : ''} ${done ? 'done' : ''}" ${done ? `data-act="go" data-href="#/create/${n}"` : 'disabled'} ${n === step ? 'aria-current="step"' : ''}><span class="c">${done ? I('check') : n}</span>${s}</button>`; }).join('')}</div>`;
    const foot = `<div class="cpf">${step > 1 ? `<button class="pbtn pbtn-g" data-act="go" data-href="#/create/${step - 1}">Back</button>` : ''}${ok ? '<span class="sp"></span>' : `<span class="why" role="status">${NEED[step]}</span>`}<button class="pbtn pbtn-g" data-act="save-draft">Save Draft</button><button class="pbtn pbtn-p ${ok ? '' : 'is-off'}" data-act="${step === 5 ? 'publish' : 'step-next'}" ${ok ? '' : 'aria-disabled="true"'}>${step === 5 ? 'Publish proposal' : 'Continue'}</button></div>`;
    let body = '';
    if (step === 1) {
      const order = ['hollow-knight', 'arcane', 'omori', 'squid-game', 'genshin', 'spy-family', 'animal-crossing', 'stranger-things'];
      body = `<h2>Choose the IP you want to create for</h2><p class="lead2">Select an IP from our library to build your proposal. Each IP has its own community, guidelines, and opportunities.</p>
        <h4 style="margin-top:32px">Select an IP</h4>
        <div class="ipg" role="radiogroup" aria-label="IP">${order.map((k) => { const x = ipById(k), closed = x.open === 'Closed'; return `<button class="ipt ${d.ip === k ? 'on' : ''} ${closed ? 'dis' : ''}" role="radio" aria-checked="${d.ip === k}" ${closed ? 'aria-disabled="true"' : ''} data-act="pick-ip" data-v="${k}" aria-label="${x.name}${closed ? ' (program closed)' : ''}"><img src="${x.logo}" alt=""><span class="ck2">${I('check')}</span>${closed ? '<span class="closed">Program closed</span>' : ''}</button>`; }).join('')}</div>
        <div class="tipsrow"><div class="ibx">${I('info')}<span>${ip ? `<b>${ip.name}</b> · ${ip.type} · open until ${ip.open}. Creator royalty ${ip.royalty}% · validation goal from ${ip.minGoal} pre-order intents · ${ip.proposals} proposals so far.` : 'Select an IP from our library to build your proposal. Each IP has its own community, guidelines, and opportunities.'}</span></div>
          <div class="tips"><h4>Submission Tips</h4><ul>${['Choose the IP that best fits your concept and target fans.', 'Review the IP’s Creator Guidelines before you continue.', 'Clear IP alignment helps reviewers understand your proposal more easily.'].map((t) => `<li>${I('star')}<span>${t}</span></li>`).join('')}</ul><a href="#/guidelines?s=submission" target="_blank">View IP &amp; Submission Guidelines ${I('next')}</a></div></div>`;
    } else if (step === 2) {
      body = `<h2>What are you creating?</h2><p class="lead2">Select the type of product and format${ip ? ` for <b>${ip.name}</b>` : ''}.</p>
        <h4 style="margin-top:56px">Choose Product Type</h4><p class="hs">Select the type of merchandise you want to create. Types ${ip ? ip.name : 'this IP'} hasn’t opened yet are greyed out.</p>
        <div class="ptg" role="radiogroup" aria-label="Product type">${D.PRODUCT_TYPES.map((t) => { const open = !ip || ip.cats.includes(t.n); return `<button class="ptt ${d.type === t.n ? 'on' : ''} ${open ? '' : 'dis'}" role="radio" aria-checked="${d.type === t.n}" ${open ? '' : 'aria-disabled="true"'} data-act="pick-type" data-v="${t.n}">${t.i ? `<img src="${t.i}" alt="">` : I(t.n === 'Phone Case' ? 'phone' : 'poster')}${t.n}${open ? '' : '<span class="no">Not open</span>'}</button>`; }).join('')}</div>
        <div class="ibx warm" style="margin-top:40px">${I('info')}<span>Not sure which one fits? View examples in our <a href="#/guidelines?s=categories" target="_blank">Submission Guidelines</a>.</span></div>
        <div class="divl"></div>
        <h4>Choose Creation Format</h4><p class="hs">Select the format that best matches your idea.</p>
        <div class="tchips" role="radiogroup" aria-label="Creation format">${D.FORMATS.map((f) => `<button class="tchip ${d.format === f ? 'on' : ''}" role="radio" aria-checked="${d.format === f}" data-act="pick-format" data-v="${f}">${f}</button>`).join('')}</div>
        <div class="divl"></div>
        <h4>Select Design Direction <span style="font-weight:400;color:var(--t5)">· ${d.dirs.length}/3 selected</span></h4><p class="hs">Choose up to three styles or vibes that best represent your concept.</p>
        <div class="tchips" role="group" aria-label="Design direction">${D.DIRECTIONS.map((f) => `<button class="tchip ${d.dirs.includes(f) ? 'on' : ''}" aria-pressed="${d.dirs.includes(f)}" data-act="pick-dir" data-v="${f}">${f}</button>`).join('')}</div>`;
    } else if (step === 3) {
      const slots = ['Main image', 'Detail Image', 'Mockup image', 'Lifestyle image', 'Add more'];
      body = `<h2>Upload your Concept images</h2><p class="lead2">Show your idea with clear visuals, mockups, or references.</p>
        <div class="upg"><div>
          <label class="drop" id="drop" for="file-in">${I('upload')}<b>Image Caption</b><p>Drag and drop your file here, or browse from your device.<br>Recommended: JPG, PNG, or WEBP under 10MB.</p><span class="pbtn pbtn-ol">Browse Files</span></label>
          <input type="file" id="file-in" accept="image/png,image/jpeg,image/webp" multiple hidden>
          <div class="uph"><h4>Uploaded Images<span>${d.images.length}/10</span></h4><button data-act="sample-imgs">Use sample images</button></div>
          <div class="slots">${slots.map((s, i) => d.images[i] ? `<div class="slot has"><img src="${src(d.images[i])}" alt="${s}">${i === 0 ? '<span class="cov">Cover</span>' : ''}<button class="x" data-act="rm-img" data-i="${i}" aria-label="Remove ${s}">×</button></div>` : `<label class="slot" for="file-in">${I('image')}<span>${s}</span></label>`).join('')}</div>
          ${d.images.length > 5 ? `<p class="hs">+${d.images.length - 5} more image${d.images.length - 5 > 1 ? 's' : ''}</p>` : ''}
          <div class="ibx warm">${I('info')}<span>The first image you upload will be used as your proposal cover.</span></div>
        </div><div>
          <div class="ff"><label for="u-cap">Image Caption</label><input class="in" id="u-cap" data-bind="caption" value="${esc(d.caption)}" placeholder="Add a short note for this visual" maxlength="80"></div>
          <div class="ff"><label for="u-desc">Description</label><textarea id="u-desc" data-bind="desc" placeholder="Describe what this image shows. Is it a sketch, mockup, render, or final visual?" maxlength="600">${esc(d.desc)}</textarea></div>
          <div class="ff"><label for="u-url">Import from URL</label><input class="in" id="u-url" data-bind="url" value="${esc(d.url)}" placeholder="Example: https://www.behance.net/your-project" inputmode="url"></div>
          <div class="ff"><label for="u-type">Image Type</label><select id="u-type" data-bind="imgType"><option value="">Select image type</option>${['Sketch', 'Mockup', '3D render', 'Final visual', 'Reference'].map((o) => `<option ${d.imgType === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="ff"><label for="u-src">Source or Reference Link</label><input class="in" id="u-src" data-bind="srcLink" value="${esc(d.srcLink)}" placeholder="Add a Figma, portfolio, Pinterest, or reference link" inputmode="url"><div class="ex">Example: https://www.behance.net/your-project</div></div>
          <div class="ff"><span class="lb">Originality Check</span><label class="radio"><input type="checkbox" data-bind="original" ${d.original ? 'checked' : ''}> I confirm this visual is my own work or clearly marked as a reference.</label></div>
        </div></div>`;
    } else if (step === 4) {
      if (!d.goal) d.goal = ip ? ip.minGoal : 300;
      const roy = ip ? ip.royalty : 8, est = Math.round(d.goal * d.price * 0.62);
      body = `<h2>Who is it for, and at what price?</h2><p class="lead2">Tell fans and the IP owner who this product is for, suggest a retail price, and set the demand goal that unlocks IP owner review.</p>
        <div class="aud">
          <div class="ff"><label for="a-title">Proposal title*</label><input class="in" id="a-title" data-bind="title" value="${esc(d.title)}" placeholder="e.g. Hallownest Moon Hoodie" maxlength="60"><div class="ex">Short and specific: IP + motif + product.</div></div>
          <div class="ff"><span class="lb">Age rating</span><div class="seg" role="radiogroup">${['All ages', '13+', '18+'].map((v) => `<button role="radio" aria-checked="${d.age === v}" class="${d.age === v ? 'on' : ''}" data-act="set" data-k="age" data-v="${v}">${v}</button>`).join('')}</div></div>
          <div class="ff"><span class="lb">Target fans</span><div class="tchips" style="margin-top:0;gap:16px">${['Collectors', 'Casual fans', 'Lore fans', 'Cosplayers', 'Gift buyers', 'Convention-goers'].map((v) => `<button class="tchip ${d.fans.includes(v) ? 'on' : ''}" aria-pressed="${d.fans.includes(v)}" data-act="toggle" data-k="fans" data-v="${v}">${v}</button>`).join('')}</div></div>
          <div class="ff"><span class="lb">Regions</span><div class="tchips" style="margin-top:0;gap:16px">${['North America', 'Europe', 'East Asia', 'Global'].map((v) => `<button class="tchip ${d.regions.includes(v) ? 'on' : ''}" aria-pressed="${d.regions.includes(v)}" data-act="toggle" data-k="regions" data-v="${v}">${v}</button>`).join('')}</div></div>
          <div class="ff"><label for="a-price">Suggested retail price · <span class="o" id="price-v">$${d.price}</span></label><input type="range" class="range" id="a-price" min="4" max="120" step="1" value="${d.price}" data-bind="price"><div class="ex" style="margin-left:0">Similar ${esc(d.type || 'products')} on iPly sell for $${Math.max(4, d.price - 8)}–$${d.price + 10}.</div></div>
          <div class="ff"><span class="lb">Validation goal (pre-order intents)</span><div class="seg" role="radiogroup">${[ip ? ip.minGoal : 150, 300, 500, 1000].filter((v, i, a) => a.indexOf(v) === i).map((v) => `<button role="radio" aria-checked="${d.goal === v}" class="${d.goal === v ? 'on' : ''}" data-act="set" data-k="goal" data-v="${v}" data-num="1">${v}</button>`).join('')}</div>${ip ? `<div class="ex" style="margin-left:0">${ip.name} requires at least ${ip.minGoal}.</div>` : ''}</div>
          <div class="ff"><span class="lb">Campaign length</span><div class="seg" role="radiogroup">${[14, 30, 45].map((v) => `<button role="radio" aria-checked="${d.days === v}" class="${d.days === v ? 'on' : ''}" data-act="set" data-k="days" data-v="${v}" data-num="1">${v} days</button>`).join('')}</div></div>
          <div class="est"><div class="k">${roy}%</div><p>If you reach <b>${d.goal}</b> pre-order intents in ${d.days} days, your proposal goes to ${ip ? esc(ip.owner) : 'the IP owner'} for review. If licensed, you earn ${roy}% of net sales.<small>First pilot run ≈ $${est.toLocaleString()} in sales → your royalty ≈ $${Math.round(est * roy / 100).toLocaleString()} (demo estimate).</small></p></div>
        </div>`;
    } else {
      const r = d.pre;
      const row = (k, c) => `<div class="pck ${c.r}"><span class="i">${I(c.r === 'pass' ? 'check' : c.r === 'run' ? 'spin' : c.r === 'warn' ? 'alert' : 'x')}</span><b>${k}</b><small>${esc(c.n)}</small></div>`;
      body = `<h2>Review &amp; publish</h2><p class="lead2">Check your proposal, pass the automatic pre-check, and publish it to the community for validation.</p>
        <div class="rev"><div><div class="cov"><img src="${src(d.images[0]) || 'img/pt-tshirt.webp'}" alt="Proposal cover"></div>${d.images.length > 1 ? `<div class="thumbs">${d.images.slice(1, 6).map((m) => `<img src="${src(m)}" alt="">`).join('')}</div>` : ''}</div>
        <div><dl class="kv">
          <dt>Title</dt><dd>${esc(d.title)}<button data-act="go" data-href="#/create/4">Edit</button></dd>
          <dt>IP</dt><dd>${esc(ip ? ip.name : '')}<button data-act="go" data-href="#/create/1">Edit</button></dd>
          <dt>Product</dt><dd>${esc(d.type)} · ${esc(d.format)}<button data-act="go" data-href="#/create/2">Edit</button></dd>
          <dt>Direction</dt><dd>${esc(d.dirs.join(', ') || '—')}</dd>
          <dt>Images</dt><dd>${d.images.length} · ${esc(d.imgType || 'type not set')}<button data-act="go" data-href="#/create/3">Edit</button></dd>
          <dt>Audience</dt><dd>${esc(d.fans.join(', '))} · ${d.age} · ${esc(d.regions.join(', '))}</dd>
          <dt>Price · Goal</dt><dd>$${d.price} · ${d.goal} intents in ${d.days} days<button data-act="go" data-href="#/create/4">Edit</button></dd>
        </dl>
        <h4>Risk &amp; Quality Pre-Check</h4>
        <div class="pcl" aria-live="polite">${r ? Object.entries(r).map(([k, c]) => row(k, c)).join('') : row('Starting pre-check…', { r: 'run', n: '' })}</div>
        ${r && Object.values(r).some((c) => c.r === 'fail') ? `<div class="ibx" style="margin-bottom:24px">${I('alert')}<span>Fix the failed check before publishing — <a href="#/create/2">change the product type</a>.</span></div>` : ''}
        <div class="agree"><label class="ck"><input type="checkbox" data-bind="agree1" ${d.agree1 ? 'checked' : ''}> <span>I agree to the iPly Creator Terms and the ${esc(ip ? ip.name : '')} creator guidelines.</span></label>
        <label class="ck"><input type="checkbox" data-bind="agree2" ${d.agree2 ? 'checked' : ''}> <span>I understand the IP owner may request changes, and if licensed I earn ${ip ? ip.royalty : 8}% of net sales.</span></label></div>
        </div></div>`;
      if (!r) setTimeout(runPrecheck, 80);
    }
    return `<div class="wrap cp-top"><button class="back" data-act="go" data-href="#/proposals">${I('back')}Back</button>
      <div class="cp-head"><h1>Create Proposal</h1><p>Turn your fan merch idea into a licensing-ready concept.</p></div>${stepper}
      <section class="cpc" aria-labelledby="cp-h">${body.replace('<h2>', '<h2 id="cp-h">')}${foot}</section></div>`;
  }
  function runPrecheck() {
    const d = S.draft; if (!d || d.pre) return;
    const ip = ipById(d.ip);
    const final = {
      'Copyright risk': d.dirs.includes('Meme-inspired') ? { r: 'warn', n: 'Meme formats often reuse third-party images — double-check your sources.' } : { r: 'pass', n: 'No official logos or third-party artwork detected.' },
      'Image quality': d.images.length >= 2 ? { r: 'pass', n: `${d.images.length} images; cover is sharp enough for print preview.` } : { r: 'warn', n: 'Only 1 image — adding a mockup or lifestyle shot roughly doubles picks.' },
      'Production feasibility': { r: 'pass', n: `${d.type} at $${d.price} sits in the typical cost range.` },
      'IP guideline match': ip.cats.includes(d.type) ? { r: 'pass', n: `“${d.type}” is open for ${ip.name}.` } : { r: 'fail', n: `“${d.type}” isn’t open for ${ip.name}.` }
    };
    d.pre = {}; Object.keys(final).forEach((k) => { d.pre[k] = { r: 'run', n: 'Checking…' }; });
    const onStep5 = () => parse().parts[0] === 'create' && (+parse().parts[1] || d.step) === 5;
    if (onStep5()) render();
    Object.keys(final).forEach((k, i) => setTimeout(() => { if (S.draft !== d) return; d.pre[k] = final[k]; save(); if (onStep5()) render(); }, 520 + i * 460));
  }

  /* ------------------------------------------------------------------ MY PROPOSALS (Figma: My Proposal Page) */
  const PSTAT = [['all', 'All', 'grid', '#F5F5F5', '#484848'], ['draft', 'Drafts', 'edit', '#F5F5F5', '#484848'], ['precheck', 'Pre Check', 'file', '#FFF8D6', '#E0A800'], ['validating', 'Validating', 'users', '#FFF8D6', '#E0A800'], ['review', 'Under Review', 'clock', '#FFF2EC', '#E95B3A'], ['rejected', 'Rejected', 'broken', '#FFF2EC', '#E95B3A'], ['authorized', 'Authorized', 'shield', '#EAF5E9', '#2E7D32'], ['launched', 'Launched', 'box', '#EAF5E9', '#2E7D32']];
  const sq = (p) => `<div class="sq sq-${{ validating: 'y', precheck: 'b', review: 'o', authorized: 'g', launched: 'g', rejected: 'r', draft: 'k' }[p.status]}" role="img" aria-label="Stage ${p.stage + 1} of 8">${Array.from({ length: 8 }, (_, i) => `<i class="${i <= p.stage ? 'f' : ''}"></i>`).join('')}</div>`;
  const actionFor = (p) => ({ validating: ['Share', 'share'], precheck: ['View Pre-check', 'open'], review: ['View Feedback', 'feedback'], rejected: ['View Feedback', 'feedback'], authorized: ['View License', 'license'], launched: ['View Product', 'product'], draft: ['Continue Editing', 'continue'] })[p.status];
  function pProposals(q) {
    const f = q.get('status') || 'all';
    const list = S.proposals.filter((p) => f === 'all' || p.status === f);
    const count = (k) => (k === 'all' ? S.proposals.length : S.proposals.filter((p) => p.status === k).length);
    return `<div class="wrap">
      <div class="mph"><div><h1>My Proposals</h1><p>Track your ideas, community support, and licensing progress in one place.</p></div><button class="pbtn pbtn-p" data-act="new-proposal">Create New Proposal</button></div>
      <div class="lab">Overview</div>
      <div class="ovg">${PSTAT.map(([k, l, ic, bg, fg]) => `<a class="ovc ${f === k ? 'on' : ''}" href="#/proposals?status=${k}" aria-label="${l}: ${count(k)}"><span class="ib" style="background:${bg};color:${fg}">${I(ic)}</span><b>${count(k)}</b><small>${l}</small></a>`).join('')}</div>
      <div class="lab">Filter by Status</div>
      <div class="chips">${PSTAT.map(([k, l]) => `<a class="fchip ${f === k ? 'on' : ''}" href="#/proposals?status=${k}" ${f === k ? 'aria-current="true"' : ''}>${l}</a>`).join('')}</div>
      <div class="plist">${list.length ? list.map((p) => { const ip = ipById(p.ip), [al, aa] = actionFor(p), pub = idea(p.id); return `<div class="prow">
        <a class="im" href="#/proposal/${p.id}" aria-label="${esc(p.title)}"><img src="${src(p.img)}" alt="" loading="lazy"></a>
        <div><h3><a href="#/proposal/${p.id}">${esc(p.title)}</a>${pub ? `<a class="ext" href="#/idea/${p.id}" title="Open public idea page" aria-label="Open public idea page">${I('ext')}</a>` : ''}</h3>
          <div class="kvs"><div><b>IP:</b>${esc(ip.name)}</div><div><b>Category:</b>${esc(p.cat)}</div></div>
          <div class="nums"><span aria-label="Comments">${I('comment')}${p.c + (S.comments[p.id] || []).length}</span><span aria-label="Picks">${I('like')}${p.v + (S.votes[p.id] ? 1 : 0)}</span><span aria-label="Pre-order intents">${I('pre')}${p.p + (S.pre[p.id] ? 1 : 0)}${p.status === 'validating' ? `<small>/${p.goal}</small>` : ''}</span></div>
          <div class="upd">Last updated: ${p.updated}</div></div>
        <span class="vl"></span>
        <div class="r">${stag(p.status)}<span class="pl">Process</span>${sq(p)}<button class="pbtn pbtn-s" data-act="p-${aa}" data-id="${p.id}">${al}</button></div>
      </div>`; }).join('') : `<div class="empty">${I('file')}<h3>No ${f === 'all' ? '' : STATUS[f].toLowerCase() + ' '}proposals</h3><p>${f === 'rejected' ? 'Nothing rejected — nice.' : 'Start one in under five minutes.'}</p><button class="pbtn pbtn-p" data-act="new-proposal">Create New Proposal</button></div>`}</div>
    </div>`;
  }
  function pProposal(id) {
    const p = prop(id);
    if (!p) return `<div class="wrap empty">${I('alert')}<h3>Proposal not found</h3><a class="pbtn pbtn-p" href="#/proposals">My Proposals</a></div>`;
    const ip = ipById(p.ip), [al, aa] = actionFor(p);
    const steps = [['Draft', 'Idea saved privately.'], ['Pre-check', 'Copyright risk, image quality, feasibility and IP fit.'], ['Validating', `Fans pick, comment and pre-order · goal ${p.goal}.`], ['Goal reached', 'Unlocks IP owner review.'], ['Under review', `${ip.owner} checks brand fit and feasibility.`], ['Authorized', 'License terms signed.'], ['In production', 'Pilot run with the licensed manufacturer.'], ['Launched', 'Sold as official merch · royalties paid monthly.']];
    const cls = (i) => (p.status === 'launched' || i < p.stage ? 'done' : i === p.stage ? (p.status === 'rejected' ? 'bad' : 'cur') : '');
    return `<div class="wrap"><div style="padding-top:32px"><button class="back" data-act="go" data-href="#/proposals">${I('back')}My Proposals</button></div>
      <div class="pdg">
        <div><div class="cov"><img src="${src(p.img)}" alt=""></div>
          <div class="st3"><div><b>${p.c + (S.comments[p.id] || []).length}</b><small>Comments</small></div><div><b>${p.v}</b><small>Picks</small></div><div><b>${p.p}</b><small>of ${p.goal} intents</small></div></div>
          <div class="actv"><button class="pbtn pbtn-p" data-act="p-${aa}" data-id="${p.id}">${al}</button>${idea(p.id) ? `<a class="pbtn pbtn-s" href="#/idea/${p.id}">Open public page</a>` : ''}</div></div>
        <div>
          ${stag(p.status)}<h1>${esc(p.title)}</h1><p class="sub">${esc(ip.name)} · ${esc(p.cat)} · Last updated ${p.updated}</p>
          ${(p.feedback || []).map((f) => `<div class="fb"><small>${esc(f.from)} · ${f.date}</small>${esc(f.text)}</div>`).join('')}
          ${p.status === 'rejected' ? `<button class="pbtn pbtn-p" data-act="resubmit" data-id="${p.id}" style="margin-top:24px">Revise &amp; resubmit</button>` : ''}
          ${p.precheck ? `<h4>Pre-check</h4><div class="pcl">${p.precheck.map((c) => `<div class="pck ${c.r === 'running' ? 'run' : c.r}"><span class="i">${I(c.r === 'pass' ? 'check' : 'spin')}</span><b>${c.k}</b><small>${esc(c.n)}</small></div>`).join('')}</div>` : ''}
          ${p.license ? `<h4>License</h4><div class="lic">${Object.entries(p.license).map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
          <h4>Progress</h4>
          <ol class="tl">${steps.map(([h, s], i) => `<li class="${cls(i)}"><span class="d">${cls(i) === 'done' ? '✓' : cls(i) === 'bad' ? '×' : i + 1}</span><div><b>${cls(i) === 'bad' ? 'Not approved' : h}</b><p>${s}</p></div></li>`).join('')}</ol>
        </div></div></div>`;
  }

  /* ------------------------------------------------------------------ OPEN IP */
  function pOpenIP(q) {
    const t = q.get('type') || '';
    const list = D.IPS.filter((x) => !t || x.type === t);
    return `<div class="bg-peach" style="margin-top:-136px;padding-top:136px"><div class="wrap">
      <div class="ph1"><div><span class="pill">Open IP Programs</span><h1>IPs looking for creators ideas</h1><p>These IP owners are currently accepting proposals. Each program lists what’s open, the royalty, and the demand goal.</p></div>
        <div class="chips" style="gap:14px">${['', 'Games', 'Indie Games', 'Animation', 'TV Series'].map((v) => `<a class="fchip sm ${t === v ? 'on' : ''}" href="#/open-ip${v ? '?type=' + encodeURIComponent(v) : ''}">${v || 'All'}</a>`).join('')}</div></div>
      <div class="ipcg">${list.map((ip) => `<a class="ipc" href="#/open-ip/${ip.id}"><img src="${ip.cover}" alt="" loading="lazy"><div class="b"><h4>${ip.name}</h4><span class="ttag">${ip.type}</span><div class="meta"><span>${ip.open === 'Closed' ? 'Not accepting proposals' : 'Open until ' + ip.open}</span><span><b>${ip.royalty}%</b> creator royalty</span></div><span class="vm">View more details +</span></div></a>`).join('')}</div>
    </div></div>`;
  }
  function pIP(id) {
    const ip = ipById(id), ideas = allIdeas().filter((x) => x.ip === id), closed = ip.open === 'Closed';
    return `<div class="wrap" style="padding-bottom:120px"><div style="padding-top:32px"><button class="back" data-act="go" data-href="#/open-ip">${I('back')}Open IP</button></div>
      <div class="ipd"><div class="cov"><img src="${ip.cover}" alt=""></div>
      <div><span class="ttag">${ip.type}</span> ${closed ? stag('rejected').replace('Rejected', 'Closed') : '<span class="stag launched">Accepting proposals</span>'}
        <h1>${ip.name}</h1><p class="sub">Program run by ${esc(ip.owner)} · ${closed ? 'closed' : 'open until ' + ip.open} · ${ip.proposals} proposals</p>
        <div class="st3"><div><b>${ip.royalty}%</b><small>Creator royalty</small></div><div><b>${ip.minGoal}</b><small>Min. validation goal</small></div><div><b>${ip.cats.length}</b><small>Open categories</small></div></div>
        <h4>Open categories</h4><div class="tchips" style="margin-top:0;gap:14px">${ip.cats.map((c) => `<span class="tchip" style="cursor:default">${c}</span>`).join('')}</div>
        <div class="gl2"><div class="panel"><h4>Tone &amp; style</h4><p>${esc(ip.tone)}</p></div><div class="panel"><h4>Please avoid</h4><ul>${ip.dont.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
        ${closed ? `<button class="pbtn pbtn-g" data-act="toast" data-msg="We’ll email you when ${esc(ip.name)} reopens.">Notify me when it reopens</button>` : `<button class="pbtn pbtn-p" data-act="start-ip" data-ip="${ip.id}">Start a proposal for ${ip.name}</button>`}
      </div></div>
      ${ideas.length ? `<div class="rowh"><h2>Ideas for ${ip.name}</h2><a class="more" href="#/ideas?ip=${ip.id}&f=1">View all${chev()}</a></div><div class="grid4">${ideas.slice(0, 8).map((x) => card(x)).join('')}</div>` : `<div class="empty">${I('sparkle')}<h3>No ideas yet</h3><p>Be the first creator to propose merch for ${ip.name}.</p></div>`}
    </div>`;
  }

  /* ------------------------------------------------------------------ ACTIVITY */
  const NICON = { review: ['clock', '#FFF2EC', '#E95B3A'], milestone: ['trend', '#FFF8D6', '#C99A00'], comment: ['comment', '#EEF1FF', '#4D5BD6'], precheck: ['file', '#EEF1FF', '#4D5BD6'], license: ['shield', '#EAF5E9', '#2E7D32'], rejected: ['broken', '#FDECEC', '#B42318'], sale: ['box', '#EAF5E9', '#2E7D32'], published: ['sparkle', '#FFF2EC', '#E95B3A'] };
  const fItem = (n) => { const [ic, bg, fg] = NICON[n.type] || NICON.comment; return `<a class="fi" href="${n.link}" data-act="read" data-id="${n.id}"><span class="ib" style="background:${bg};color:${fg}">${I(ic)}</span><span class="tx">${esc(n.t)}<small>${n.d}</small></span>${n.unread && !S.read[n.id] ? '<span class="ud" aria-label="unread"></span>' : ''}</a>`; };
  function pActivity(q) {
    const t = q.get('tab') || 'all';
    const groups = { all: null, comments: ['comment'], milestones: ['milestone', 'sale', 'published'], reviews: ['review', 'license', 'rejected', 'precheck'] };
    const list = allNotifs().filter((n) => !groups[t] || groups[t].includes(n.type));
    return `<div class="wrap"><div class="mph"><div><h1>Activity</h1><p>Comments, demand milestones and review decisions on your proposals.</p></div>${unread() ? '<button class="pbtn pbtn-s" style="width:auto;min-width:260px" data-act="read-all">Mark all as read</button>' : ''}</div>
      <div class="tabs" role="tablist" style="margin-top:40px">${[['all', 'All'], ['comments', 'Comments'], ['milestones', 'Milestones'], ['reviews', 'Reviews']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? 'on' : ''}" data-act="go" data-href="#/activity?tab=${k}">${l}</button>`).join('')}</div>
      <div class="feed">${list.length ? list.map(fItem).join('') : `<div class="empty">${I('bell')}<h3>Nothing here yet</h3></div>`}</div></div>`;
  }

  /* ------------------------------------------------------------------ AUTHORIZE (creator licenses + IP owner review queue) */
  function pAuthorize(q) {
    const t = q.get('tab') || (S.role === 'owner' ? 'queue' : 'licenses');
    let body;
    if (t === 'queue') {
      body = `<div class="role">${I('shield')}<span><b>IP owner portal (preview).</b> This is what a verified IP owner sees: proposals that reached their demand goal, ranked by brand fit. Decisions go straight back to the creator.</span></div>
        <div class="feed">${D.QUEUE.map((qi) => { const x = idea(qi.id), done = S.queue[qi.id], ip = ipById(x.ip); return `<div class="qrow"><img src="${src(x.img)}" alt=""><div><h4>${esc(x.title)}</h4><p class="s">${esc(creator(qi.creator).name)} · ${esc(ip.name)} · ${esc(x.cat)}</p><p class="s">${esc(qi.note)}</p></div>
          <div><div class="k">Demand</div><div class="v">${pres(x)} / ${x.goal}</div><div class="meter"><i style="width:${pct(pres(x), x.goal)}%"></i></div></div>
          <div><div class="k">Brand fit · Risk</div><div class="v">${qi.fit}/100 · ${qi.risk}</div><div class="meter"><i class="o" style="width:${qi.fit}%"></i></div></div>
          <div class="qacts">${done ? `<span class="stag ${done === 'approved' ? 'authorized' : done === 'declined' ? 'rejected' : 'review'}" style="justify-self:start">${done === 'approved' ? 'Approved' : done === 'declined' ? 'Declined' : 'Revision requested'}</span><button class="lnk2" data-act="q-undo" data-id="${qi.id}">Undo decision</button>` : `<button class="pbtn pbtn-p" data-act="q-decide" data-v="approved" data-id="${qi.id}">Approve &amp; license</button><button class="pbtn pbtn-s" data-act="q-decide" data-v="revision" data-id="${qi.id}">Request revision</button><button class="pbtn pbtn-g" data-act="q-decide" data-v="declined" data-id="${qi.id}">Decline</button>`}</div></div>`; }).join('')}</div>`;
    } else {
      const lic = S.proposals.filter((p) => p.license), waiting = S.proposals.filter((p) => p.status === 'review');
      const row = (p, sub) => `<a class="fi" href="#/proposal/${p.id}"><img src="${src(p.img)}" alt=""><span class="tx"><b>${esc(p.title)}</b><small>${sub}</small></span>${stag(p.status)}</a>`;
      body = `<div class="lab" style="margin-top:0">Active licenses</div>${lic.length ? `<div class="feed" style="margin-bottom:56px">${lic.map((p) => row(p, `${esc(ipById(p.ip).name)} · ${esc(p.license.royalty)} · ${esc(p.license.term)} · ${esc(p.license.territory)}`)).join('')}</div>` : `<div class="empty">No licenses yet.</div>`}
        <div class="lab">Awaiting IP owner decision</div>${waiting.length ? `<div class="feed">${waiting.map((p) => row(p, `${esc(ipById(p.ip).name)} · ${p.p}/${p.goal} intents · submitted ${p.updated}`)).join('')}</div>` : `<div class="empty" style="padding:60px">Nothing waiting.</div>`}`;
    }
    return `<div class="wrap"><div class="mph"><div><h1>Authorize</h1><p>Licensing status for creators — and a preview of the IP owner review portal.</p></div></div>
      <div class="tabs" role="tablist" style="margin-top:40px"><button role="tab" class="${t === 'licenses' ? 'on' : ''}" aria-selected="${t === 'licenses'}" data-act="go" data-href="#/authorize?tab=licenses">My licenses</button><button role="tab" class="${t === 'queue' ? 'on' : ''}" aria-selected="${t === 'queue'}" data-act="go" data-href="#/authorize?tab=queue">Review queue · IP owner view</button></div>${body}</div>`;
  }

  /* ------------------------------------------------------------------ SAVED / REWARDS / SETTINGS / CONTACT / GUIDELINES */
  function pSaved() {
    const list = allIdeas().filter((x) => S.votes[x.id]);
    return `<div class="wrap" style="padding-bottom:120px"><div class="mph"><div><h1>Picked ideas</h1><p>Ideas you picked. Every pick counts as a vote for the creator.</p></div>${list.length ? '<a class="pbtn pbtn-s" style="width:auto;min-width:260px" href="#/ideas">Browse Ideas</a>' : ''}</div>
      ${list.length ? `<div class="grid4" style="margin-top:56px">${list.map((x) => card(x)).join('')}</div>` : `<div class="empty">${I('like')}<h3>No picks yet</h3><p>Tap the thumbs-up on any idea to support it.</p><a class="pbtn pbtn-p" href="#/ideas">Browse Ideas</a></div>`}</div>`;
  }
  function pRewards() {
    const lic = S.proposals.filter((p) => p.license);
    const sales = [['Arcane Chibi Figure', 'Feb 2026', 1200, 34, 7], ['Arcane Chibi Figure', 'Mar 2026', 410, 34, 7], ['Arcane Chibi Figure', 'Apr 2026', 265, 34, 7]];
    const tot = sales.reduce((s, [, , u, pr, r]) => s + u * pr * r / 100, 0);
    return `<div class="wrap" style="padding-bottom:120px"><div class="mph"><div><h1>My Rewards</h1><p>Royalties from your licensed products and creator perks.</p></div><button class="pbtn pbtn-p" data-act="toast" data-msg="Payout requested (demo) — it arrives in 3–5 business days.">Request payout</button></div>
      <div class="st3" style="margin-top:48px"><div><b>$${tot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b><small>Royalties earned</small></div><div><b>${lic.length}</b><small>Active licenses</small></div><div><b>1,875</b><small>Units sold</small></div></div>
      <div class="lab">Royalty statements</div>
      <div class="feed">${sales.map(([t, m, u, pr, r]) => `<div class="fi"><img src="img/pr-arcane-figure.webp" alt=""><span class="tx"><b>${t}</b> · ${m}<small>${u.toLocaleString()} units × $${pr} × ${r}% royalty</small></span><b class="t-sf20" style="color:var(--ink);font-weight:700">$${(u * pr * r / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></div>`).join('')}</div>
      <p class="t-sf16">Demo figures. Royalties are paid monthly, 30 days after the sales period closes.</p></div>`;
  }
  function pSettings() {
    const pr = S.prefs;
    const tg = (k, l, d) => `<label class="ck" style="justify-content:space-between;width:100%;padding:22px 0;border-bottom:1px solid var(--line)"><span><b style="display:block;color:var(--ink);font:700 20px var(--sf)">${l}</b><span class="t-sf16">${d}</span></span><input type="checkbox" data-pref="${k}" ${pr[k] ? 'checked' : ''}></label>`;
    return `<div class="wrap" style="max-width:1100px;padding-bottom:120px"><div class="mph"><div><h1>Settings</h1><p>Profile, fandoms and notifications.</p></div></div>
      <form class="cform" data-form="profile" style="margin-top:48px" novalidate>
        <div class="two"><div class="ff"><label for="s-n">Full name</label><input class="in" id="s-n" name="n" value="${esc(S.user.name)}"></div><div class="ff"><label for="s-e">Email</label><input class="in" id="s-e" name="e" type="email" value="${esc(S.user.email || 'luna@example.com')}"></div></div>
        <div class="ff"><span class="lb">Fandoms</span><div class="tchips" style="margin-top:0;gap:14px">${D.FANDOMS.map((n) => `<button type="button" class="tchip ${S.user.fandoms.includes(n) ? 'on' : ''}" aria-pressed="${S.user.fandoms.includes(n)}" data-act="fandom" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>
        <div class="ff"><span class="lb">Notifications</span>${tg('email', 'Email updates', 'Review decisions and license offers.')}${tg('milestones', 'Demand milestones', 'When a proposal passes 25%, 50% and 100% of its goal.')}${tg('comments', 'Comments', 'New comments on your proposals.')}${tg('digest', 'Weekly digest', 'Trending ideas in your fandoms.')}</div>
        <button class="pbtn pbtn-p">Save changes</button></form></div>`;
  }
  function pContact() {
    return `<div class="wrap" style="max-width:1100px"><div class="mph"><div><h1>Contact Us</h1><p>Questions about proposals, licensing, or partnering as an IP owner? We reply within 2 business days.</p></div></div>
      <form class="cform" data-form="contact" style="margin-top:48px" novalidate>
        <div class="two"><div class="ff"><label for="c-n">Name</label><input class="in" id="c-n" name="n" value="${S.logged ? esc(S.user.name) : ''}" autocomplete="name"></div><div class="ff"><label for="c-e">Email*</label><input class="in" id="c-e" name="e" type="email" autocomplete="email"></div></div>
        <div class="ff"><span class="lb">I am a…</span><div class="seg" role="radiogroup">${['Creator', 'Fan', 'IP owner', 'Press'].map((v, i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? 'on' : ''}" data-act="seg">${v}</button>`).join('')}</div></div>
        <div class="ff"><label for="c-m">Message*</label><textarea id="c-m" name="m" style="height:200px" maxlength="1000"></textarea></div>
        <button class="pbtn pbtn-p">Send message</button></form></div>`;
  }
  function pGuidelines() {
    const sec = (id, h, b) => `<section id="${id}" class="panel"><h3>${h}</h3>${b}</section>`;
    return `<div class="wrap prose" style="max-width:1200px;padding-bottom:120px"><div class="mph"><div><h1>Creator &amp; IP Guidelines</h1><p>Everything you need before you submit — and what IP owners agree to.</p></div><a class="pbtn pbtn-p" href="#/create/1">Start a proposal</a></div><div style="height:48px"></div>
      ${sec('submission', 'Submission Guidelines', '<ul><li>One product per proposal. Collections can be grouped later as a campaign.</li><li>Show at least one clear visual; mockups and lifestyle shots perform about twice as well.</li><li>Pick an IP program that is open, and a category that program accepts.</li><li>Every proposal passes an automatic pre-check before it goes public.</li></ul>')}
      ${sec('tips', 'Proposal Tips', '<ul><li>Lead with a moment or motif fans recognise, not the logo.</li><li>Write the title as IP + motif + product.</li><li>Answer comments early — active creators reach their goal faster.</li></ul>')}
      ${sec('copyright', 'Copyright Risk Guide', '<ul><li>Never trace official art or use screenshots as artwork.</li><li>Mark reference images as references.</li><li>Official logos are reserved for the IP owner’s final packaging.</li></ul>')}
      ${sec('categories', 'Product Categories', `<div class="tchips" style="margin-top:0;gap:14px">${D.PRODUCT_TYPES.map((t) => `<span class="tchip" style="cursor:default">${t.n}</span>`).join('')}</div><p style="margin-top:20px">Each IP chooses which categories it opens. See <a class="o" href="#/open-ip">Open IP</a>.</p>`)}
      ${sec('brand', 'Brand Guidelines (for IP owners)', '<ul><li>Set tone, do’s and don’ts per IP — creators see them before submitting.</li><li>Choose open categories, royalty and the minimum validation goal.</li><li>Approve, request a revision, or decline — every decision includes written feedback.</li></ul>')}
      ${sec('faq', 'Licensing FAQ', '<p><b>When am I charged for a pre-order?</b> Only after the IP owner approves and production starts.</p><p><b>Who owns the design?</b> You keep your original artwork; the IP owner licenses the product for a set term and territory.</p><p><b>How are royalties paid?</b> Monthly, as a percentage of net sales set by each IP program.</p>')}
      ${sec('legal', 'Terms, Privacy &amp; IP Policy', '<p>This is a student concept prototype. IP names and logos are illustrative only; there is no affiliation with the rights holders. No real accounts, payments or personal data are collected — everything stays in your browser.</p>')}
    </div>`;
  }

  /* ------------------------------------------------------------------ overlays */
  function modal(html, cls = '') {
    closeModal();
    const el = document.createElement('div');
    el.className = 'scrim' + (cls === 'lightbox' ? ' lightbox' : ''); el.id = 'scrim';
    el.innerHTML = cls === 'lightbox' ? html : `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="m-h"><button class="x" data-act="close" aria-label="Close">${I('x')}</button>${html.replace('<h3>', '<h3 id="m-h">')}</div>`;
    document.body.appendChild(el);
    lastFocus = document.activeElement;
    const f = el.querySelector('input,textarea,.mb.p,button:not(.x)'); if (f) f.focus();
  }
  let lastFocus = null;
  function closeModal() { const m = $('#scrim'); if (m) m.remove(); const d = $('#drawer'); if (d) d.remove(); if (lastFocus && lastFocus.isConnected) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} } lastFocus = null; }
  function toast(msg) {
    tlog('toast', { msg: String(msg).slice(0, 120) });
    let w = $('#toasts'); if (!w) { w = document.createElement('div'); w.id = 'toasts'; w.className = 'toasts'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = I('check') + '<span>' + esc(msg) + '</span>'; w.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }
  function closePop() { const p = $('#pop'); if (p) p.remove(); $$('.ic.open').forEach((b) => b.classList.remove('open')); }
  function pop(kind, btn) {
    const ex = $('#pop'); if (ex && ex.dataset.k === kind) return closePop();
    closePop(); btn.classList.add('open');
    const el = document.createElement('div'); el.className = 'pop' + (kind === 'me' ? ' menu' : ''); el.id = 'pop'; el.dataset.k = kind; el.setAttribute('role', 'dialog');
    if (kind === 'notifs') {
      el.innerHTML = `<h4>Notifications${unread() ? '<button data-act="read-all">Mark all read</button>' : ''}</h4>${allNotifs().slice(0, 5).map((n) => `<a class="pi" href="${n.link}" data-act="read" data-id="${n.id}"><span class="d ${n.unread && !S.read[n.id] ? '' : 'r'}"></span><span>${esc(n.t)}<small>${n.d}</small></span></a>`).join('')}<a class="pop-f" href="#/activity">See all activity</a>`;
    } else if (kind === 'msgs') {
      S.seenMsgs = true; save();
      el.innerHTML = `<h4>Messages</h4>${[['IP review team', 'img/av-c2.webp', 'Quick question about the hood seam placement…', 'review'], ['Nova Land', 'img/av-nova.webp', 'Love your pin! Want to co-create a set?', 'nova']].map(([n, a, t, id]) => `<button class="pi" data-act="thread" data-id="${id}"><img class="round" src="${a}" alt=""><span><b>${n}</b><small>${t}</small></span></button>`).join('')}`;
    } else if (kind === 'saved') {
      const l = allIdeas().filter((x) => S.votes[x.id]);
      el.innerHTML = `<h4>Picked ideas</h4>${l.length ? l.slice(0, 4).map((x) => `<a class="pi" href="#/idea/${x.id}"><img src="${src(x.thumb || x.img)}" alt=""><span><b>${esc(x.title)}</b><small>${votes(x)} picks · ${STATUS[x.status]}</small></span></a>`).join('') : '<p class="pi em">No picks yet — tap the thumbs-up on any idea.</p>'}<a class="pop-f" href="#/saved">View all picks</a>`;
    } else if (kind === 'me') {
      const it = (href, l, act) => act ? `<button class="mi" data-act="${act}">${l}${I('next')}</button>` : `<a class="mi" href="${href}">${l}${I('next')}</a>`;
      el.innerHTML = `<div class="menu-h"><img src="img/av-user.webp" alt=""><div><b>${esc(firstName())}</b><small>${S.role === 'owner' ? 'IP owner view' : 'Creator'}</small></div></div><hr>
        ${it(homeHref(), 'Home')}${it('#/proposals', 'My Proposal')}${it('#/rewards', 'My Rewards')}${it('#/settings', 'Settings')}${it('#/guidelines?s=faq', 'Help')}${it('#/', 'About iPly')}<hr>${it('', 'Switch Account', 'switch')}${it('', 'Log out', 'logout')}`;
    }
    $('.hdr .wrap').appendChild(el);
  }
  function cartDrawer() {
    closeModal();
    const items = S.cart.map((c) => ({ c, x: idea(c.id) })).filter((o) => o.x);
    const pre = Object.entries(S.pre).map(([id, o]) => ({ o, x: idea(id) })).filter((o) => o.x);
    const total = items.reduce((s, { c, x }) => s + c.qty * x.price[0], 0);
    const el = document.createElement('div'); el.id = 'drawer'; el.className = 'drawer-wrap';
    el.innerHTML = `<div class="dscrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Your bag"><div class="dh"><h3>Your bag</h3><button data-act="close" aria-label="Close">${I('x')}</button></div>
      <div class="db"><h4>Licensed products</h4>${items.length ? items.map(({ c, x }) => `<div class="ci"><img src="${src(x.img)}" alt=""><div><b>${esc(x.title)}</b><small>${esc(c.opt || '')}</small><div class="qty"><button data-act="qty" data-id="${x.id}" data-opt="${esc(c.opt)}" data-d="-1" aria-label="Decrease">−</button>${c.qty}<button data-act="qty" data-id="${x.id}" data-opt="${esc(c.opt)}" data-d="1" aria-label="Increase">+</button></div></div><b>$${(c.qty * x.price[0]).toFixed(2)}</b></div>`).join('') : '<p>Only launched, officially licensed products can be bought.</p>'}
        <h4>Pre-order intents <span>· no charge yet</span></h4>${pre.length ? pre.map(({ o, x }) => `<div class="ci"><img src="${src(x.img)}" alt=""><div><b>${esc(x.title)}</b><small>${esc(o.opt || '')} · ${STATUS[x.status]}</small><small>${pres(x)}/${x.goal} intents</small></div><button class="lnk" data-act="un-pre" data-id="${x.id}">Cancel</button></div>`).join('') : '<p>Back an idea in validation to see it here.</p>'}</div>
      <div class="df"><div class="tot"><span>Subtotal</span><b>$${total.toFixed(2)}</b></div><button class="mb p ${items.length ? '' : 'is-off'}" data-act="checkout" ${items.length ? '' : 'disabled'}>Checkout</button></div></aside>`;
    document.body.appendChild(el);
    lastFocus = document.activeElement;
    const b = el.querySelector('.dh button'); if (b) b.focus();
  }
  function guidePanel() {
    const g = $('#guide'); if (g) return g.remove();
    const el = document.createElement('div'); el.className = 'guide'; el.id = 'guide'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Prototype guide');
    const flows = [['#/signup', 'Sign up as a creator (3 steps)'], ['#/ideas', 'Browse Ideas, search & filter'], ['#/idea/extra-thick-hoodie', 'Back an idea: colour, pre-order, comment'], ['#/create/1', 'Create a proposal (5 steps + pre-check)'], ['#/proposals', 'Track proposals & feedback'], ['#/authorize?tab=queue', 'IP owner: approve a proposal'], ['#/owners', 'IP owner landing page']];
    el.innerHTML = `<h4>IPLY · clickable prototype</h4><p>Built from the Figma hi-fi (Wei_IXDS708). Everything is clickable; data stays in this browser.</p>${flows.map(([h, t], i) => `<a href="${h}" data-act="guide-go"><span>${i + 1}</span>${t}</a>`).join('')}
      <div class="ft"><button data-act="whatsnew">What’s added vs. Figma</button><button data-act="reset">Reset demo</button></div>${TEST ? `<div class="ft"><button data-act="test-dl">Download test log (${tlogRead().length})</button><button data-act="test-clear">Clear log</button></div>` : ''}`;
    document.body.appendChild(el);
  }

  /* ------------------------------------------------------------------ actions */
  function requireLogin(next) {
    if (S.logged) return true;
    modal(`<h3>Join iPly to continue</h3><p>Create a free account to pick ideas, comment, pre-order and submit proposals.</p><div class="acts"><button class="mb s" data-act="demo-login" data-next="${esc(next || '')}">Use demo account</button><a class="mb p" href="#/signup" data-act="close-nav">Sign up</a></div>`);
    return false;
  }
  const optOf = (x, st) => [x.variants ? x.variants[(st || {}).v || 0].c : '', isApparel(x.cat) ? 'Size ' + ((st || {}).size || 'S') : ''].filter(Boolean).join(' · ');
  const A = {
    go: (el) => go(el.dataset.href.replace(/^#/, '')),
    back: () => (history.length > 1 ? history.back() : go('/ideas')),
    burger: () => { const n = $('#nav'); n.classList.toggle('open'); },
    close: () => closeModal(),
    'close-nav': () => closeModal(),
    toast: (el) => toast(el.dataset.msg),
    pop: (el) => { if (!S.logged) return requireLogin(); pop(el.dataset.pop, el); },
    cart: () => (S.logged ? cartDrawer() : requireLogin()),
    guide: () => guidePanel(),
    'guide-go': () => { const g = $('#guide'); if (g) g.remove(); },
    rail: (el) => { const r = $('#' + el.dataset.id); if (!r) return; const c = r.firstElementChild; const step = c ? c.getBoundingClientRect().width + 41 : 400; r.scrollBy({ left: +el.dataset.d * step * 1.0 / (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1), behavior: 'smooth' }); },
    lightbox: (el) => modal(`<img src="${esc(el.dataset.src)}" alt=""><button class="lx" data-act="close" aria-label="Close">${I('x')}</button>`, 'lightbox'),
    'test-dl': () => { const L = tlogRead(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(L, null, 1)], { type: 'application/json' })); a.download = `iply-test-${TEST || 'log'}-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); },
    'test-clear': () => { if (!confirm('Clear the test log in this browser?')) return; try { localStorage.removeItem(TLOG); } catch (e) {} const g = $('#guide'); if (g) g.remove(); toast('Test log cleared'); },
    reset: () => { if (!confirm('Reset all demo data (picks, comments, proposals)?')) return; try { localStorage.removeItem(KEY); } catch (e) {} S = fresh(); ds = {}; const g = $('#guide'); if (g) g.remove(); go('/'); toast('Demo reset'); },
    whatsnew: () => { const g = $('#guide'); if (g) g.remove(); modal(`<h3>Added beyond the Figma file</h3><p class="mut">Gaps found while building, filled so every click leads somewhere.</p><ul>
      <li><b>Create Proposal steps 4–5</b> (Audience, Publish) — only steps 1–3 existed.</li>
      <li><b>Risk &amp; Quality Pre-Check</b> UI — a core feature with no screen.</li>
      <li><b>Validation progress</b> on cards and the detail page (intents / goal / days left, “no charge until approved”).</li>
      <li><b>IP owner review queue</b> — approve / request revision / decline flows back to the creator.</li>
      <li><b>Open IP, Activity, My Rewards, Settings</b>, bag &amp; pre-orders, notifications, messages, login, guidelines.</li>
      <li><b>Proposal detail</b> with an 8-step timeline, feedback, license terms; rejected state with “Revise &amp; resubmit”.</li>
      <li><b>Data fixes</b>: overview counts match the list (Figma: 17 vs 7 rows); hoodie labelled Stranger Things; identical 96/312/312 stats; socks priced like a hoodie; duplicate “Genshin Impact”; menu name “Evelyn” vs “Luna Nash” (now also fixed in the Figma file).</li>
      <li><b>Contrast</b>: primary orange darkened from #E95B3A to #C8411F and grey body text to #6F6F6F so all text meets WCAG AA (4.5:1); the brand orange stays in the logo and illustrations.</li>
      <li><b>Copy fixes</b>: Lorem ipsum and “164+ Members” ×3 on the creator landing page; certification logos replaced with neutral trust badges.</li>
      <li>Types not open for the chosen IP are disabled; closed programs can’t be picked; under-18 path in onboarding.</li></ul>`, 'wide'); },
    logout: () => { S.logged = false; S.role = 'creator'; save(); go('/'); toast('Logged out'); },
    switch: () => { closePop(); modal(`<h3>Switch account</h3><p>Preview the platform from another side.</p><div class="acts" style="justify-content:flex-start"><button class="mb ${S.role === 'creator' ? 'p' : 's'}" data-act="role" data-v="creator">Creator · ${esc(S.user.name)}</button><button class="mb ${S.role === 'owner' ? 'p' : 's'}" data-act="role" data-v="owner">IP owner · Pixel Grove</button></div>`); },
    role: (el) => { S.role = el.dataset.v; save(); closeModal(); go(S.role === 'owner' ? '/authorize?tab=queue' : '/ideas'); toast(S.role === 'owner' ? 'Viewing as IP owner (Pixel Grove)' : 'Viewing as creator'); },
    'demo-login': (el) => { S.logged = true; save(); closeModal(); toast('Logged in as Luna Nash (demo)'); el.dataset.next ? go(el.dataset.next) : render(); },
    'owner-join': () => modal(`<h3>Join as an IP Owner</h3><p class="mut">Step 1 of 3 · we verify ownership within 5 business days.</p><form data-form="owner" novalidate><div class="mf"><label for="o-co">Company / studio*</label><input id="o-co" name="co" placeholder="e.g. Pixel Grove Studio" autocomplete="organization"></div><div class="mf"><label for="o-ip">IP name*</label><input id="o-ip" name="ip" placeholder="e.g. Whisperwood"></div><div class="mf"><label for="o-em">Work email*</label><input id="o-em" name="em" type="email" autocomplete="email"></div><div class="mf"><label class="ck"><input type="checkbox" name="proof"> I can provide trademark or license documents</label></div><div class="acts"><button type="button" class="mb g" data-act="close">Cancel</button><button class="mb p">Submit for verification</button></div></form>`),
    'owner-req': () => modal(`<h3>Requirements for IP owners</h3><ul><li>Proof of ownership or exclusive licensing rights (trademark registration or license agreement).</li><li>A brand guideline document, or a short do / don’t list.</li><li>Which product categories to open, and a royalty rate (typically 6–12%).</li><li>A named reviewer who can decide on proposals within 10 business days.</li></ul><div class="acts"><button class="mb p" data-act="owner-join">Join as an IP Owner</button></div>`),
    trust: (el) => modal(`<h3>${esc(el.dataset.h)}</h3><p>Every proposal passes an automatic pre-check (copyright risk, image quality, production feasibility, IP guideline match). Only proposals that reach their demand goal enter your queue, and nothing is produced without your written approval and signed license terms.</p>`),
    pw: (el) => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'Show' : 'Hide'; },
    google: () => { S.user.email = 'luna.nash@gmail.com'; save(); go('/signup/2'); toast('Connected with Google (demo)'); },
    'google-login': () => { S.logged = true; save(); go('/ideas'); toast('Welcome back, ' + firstName()); },
    'auth-back': () => { const r = parse(); const n = +r.parts[1] || 1; if (r.parts[0] === 'signup' && n > 1) go('/signup/' + (n - 1)); else history.length > 1 ? history.back() : go('/'); },
    age: (el) => { S.user.age = el.dataset.v; save(); render(); },
    fandom: (el) => { const v = el.dataset.v, f = S.user.fandoms, i = f.indexOf(v); i >= 0 ? f.splice(i, 1) : f.push(v); save(); render(); },
    'signup-done': () => { if (!S.user.fandoms.length) return toast('Pick at least one fandom'); S.logged = true; save(); let next = ''; try { next = sessionStorage.getItem('iply-next') || ''; sessionStorage.removeItem('iply-next'); } catch (e) {} go(next === 'create' ? '/create/1' : '/ideas'); toast(`Welcome to iPly, ${firstName()}!`); },
    vote: (el) => { if (!requireLogin()) return; const id = el.dataset.id; S.votes[id] ? delete S.votes[id] : (S.votes[id] = 1); save(); render(); toast(S.votes[id] ? 'Picked! The creator sees your support.' : 'Pick removed'); },
    preorder: (el) => {
      if (!requireLogin()) return; const id = el.dataset.id, x = idea(id);
      if (S.pre[id]) { delete S.pre[id]; save(); render(); return toast('Pre-order intent cancelled'); }
      const opt = optOf(x, ds[id]);
      modal(`<h3>Join the pre-order</h3><p class="mut">${esc(x.title)}${opt ? ' · ' + esc(opt) : ''}</p><div class="mv"><div class="top">${pres(x) + 1} / ${x.goal} after you<span>${x.daysLeft} days left</span></div><div class="bar"><i style="width:${pct(pres(x) + 1, x.goal)}%"></i></div></div><ul><li><b>No charge now.</b> You pay ${money([x.price[0]])} only if the IP owner approves and production starts.</li><li>Cancel any time before production.</li><li>We’ll email you at each step: goal reached → approved → shipping.</li></ul><div class="acts"><button class="mb g" data-act="close">Not now</button><button class="mb p" data-act="pre-confirm" data-id="${id}" data-opt="${esc(opt)}">Confirm pre-order intent</button></div>`);
    },
    'pre-confirm': (el) => { const id = el.dataset.id, x = idea(id); S.pre[id] = { opt: el.dataset.opt }; if (pres(x) === x.goal) notify('milestone', `${x.title} reached its goal of ${x.goal}!`, '#/idea/' + id); save(); closeModal(); render(); toast('You’re in! No charge until it’s approved.'); },
    'un-pre': (el) => { delete S.pre[el.dataset.id]; save(); render(); cartDrawer(); },
    'notify-me': (el) => { if (!requireLogin()) return; const id = el.dataset.id; if (S.pre[id]) { delete S.pre[id]; save(); render(); return toast('Launch reminder removed'); } S.pre[id] = { opt: 'Launch reminder' }; save(); render(); toast('We’ll let you know when it launches.'); },
    'add-cart': (el) => { if (!requireLogin()) return; const id = el.dataset.id, x = idea(id), opt = optOf(x, ds[id]); const c = S.cart.find((c) => c.id === id && c.opt === opt); c ? c.qty++ : S.cart.push({ id, qty: 1, opt }); save(); render(); cartDrawer(); },
    qty: (el) => { const c = S.cart.find((c) => c.id === el.dataset.id && (c.opt || '') === (el.dataset.opt || '')); if (!c) return; c.qty += +el.dataset.d; if (c.qty <= 0) S.cart.splice(S.cart.indexOf(c), 1); save(); render(); cartDrawer(); },
    checkout: () => { const n = S.cart.reduce((s, c) => s + c.qty, 0); closeModal(); S.cart = []; save(); render(); modal(`<h3>Order placed (demo)</h3><p>In the real product this goes to a licensed checkout. ${n} item${n === 1 ? '' : 's'} — the creator earns a royalty on each one.</p><div class="acts"><button class="mb p" data-act="close">Done</button></div>`); },
    color: (el) => { const st = ds[el.dataset.id]; st.v = +el.dataset.i; st.img = 0; render(); },
    gal: (el) => { ds[el.dataset.id].img = +el.dataset.i; render(); },
    size: (el) => { ds[el.dataset.id].size = el.value; },
    'size-guide': () => modal(`<h3>Size Guide</h3><table class="mtable">${[['', 'S', 'M', 'L', 'XL'], ['Chest (cm)', '104', '112', '120', '128'], ['Length (cm)', '68', '71', '74', '77'], ['Sleeve (cm)', '60', '62', '64', '66']].map((r, i) => `<tr>${r.map((c) => (i ? `<td>${c}</td>` : `<th>${c}</th>`)).join('')}</tr>`).join('')}</table><p class="mut" style="margin-top:12px">Relaxed unisex fit. Final specs are confirmed by the licensed manufacturer.</p>`),
    'ip-info': (el) => { const ip = ipById(el.dataset.ip); modal(`<h3>${esc(ip.name)} · IP clearance</h3><p>${esc(ip.owner)} runs an open program on iPly. Proposals that reach ${ip.minGoal}+ pre-order intents go to their review team.</p><div class="mstats"><div><b>${ip.royalty}%</b><small>Creator royalty</small></div><div><b>${ip.minGoal}</b><small>Min. goal</small></div><div><b>${ip.open === 'Closed' ? '—' : ip.open.replace(', 2026', '')}</b><small>Open until</small></div></div><div class="acts"><a class="mb p" href="#/open-ip/${ip.id}" data-act="close-nav">View program</a></div>`); },
    remix: (el) => { if (!requireLogin()) return; const x = idea(el.dataset.id), ipx = ipById(x.ip); const t = D.PRODUCT_TYPES.find((p) => p.n === x.cat); S.draft = Object.assign(blankDraft(), { ip: x.ip, type: t && ipx.cats.includes(t.n) ? t.n : '', srcLink: location.href.split('#')[0] + '#/idea/' + x.id, desc: 'Remix of “' + x.title + '” by ' + creator(x.creator).name + '.' }); save(); go('/create/' + (S.draft.type ? 3 : 2)); toast('Remix started — the original creator is credited automatically.'); },
    acc: (el) => { const a = el.parentElement; a.classList.toggle('open'); el.setAttribute('aria-expanded', a.classList.contains('open')); },
    'all-comments': () => { const id = parse().parts[1]; ds[id].allC = !ds[id].allC; render(); setTimeout(() => $('#comments') && $('#comments').scrollIntoView({ block: 'start' }), 20); },
    ctag: (el) => { ds[el.dataset.id].tag = el.dataset.v; $$('.ctags [data-act="ctag"]').forEach((b) => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); },
    seg: (el) => { $$('button', el.parentElement).forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-checked', b === el); }); },
    read: (el) => { S.read[el.dataset.id] = 1; save(); },
    'read-all': () => { allNotifs().forEach((n) => { S.read[n.id] = 1; }); save(); closePop(); render(); toast('All caught up'); },
    thread: (el) => { closePop(); const who = el.dataset.id === 'review' ? ['IP review team', 'img/av-c2.webp', 'Hi Luna — demand on Hallownest Moon Hoodie looks great. Could the kingdom silhouette sit about 2 cm lower so it clears the hood seam?'] : ['Nova Land', 'img/av-nova.webp', 'Love your Wanderer pin! Want to co-create a Hollow Knight set together?']; modal(`<h3>${who[0]}</h3><div class="thread" id="thr"><div class="bub"><img src="${who[1]}" alt=""><p>${who[2]}</p></div></div><form class="reply" data-form="reply"><label class="sr" for="rp">Reply</label><input id="rp" name="t" placeholder="Write a reply…" autocomplete="off"><button class="mb p">Send</button></form>`); },
    // create proposal
    'pick-ip': (el) => { if (el.getAttribute('aria-disabled')) return toast(`${ipById(el.dataset.v).name} isn’t accepting proposals right now.`); const d = Dr(); if (d.ip !== el.dataset.v) { d.ip = el.dataset.v; if (d.type && !ipById(d.ip).cats.includes(d.type)) d.type = ''; d.goal = 0; d.pre = null; } save(); render(); },
    'pick-type': (el) => { if (el.getAttribute('aria-disabled')) return toast(`${el.dataset.v} isn’t open for ${ipById(Dr().ip).name} yet.`); Dr().type = el.dataset.v; Dr().pre = null; save(); render(); },
    'pick-format': (el) => { Dr().format = el.dataset.v; save(); render(); },
    'pick-dir': (el) => { const d = Dr(), v = el.dataset.v, i = d.dirs.indexOf(v); if (i >= 0) d.dirs.splice(i, 1); else if (d.dirs.length >= 3) return toast('Pick up to three directions'); else d.dirs.push(v); d.pre = null; save(); render(); },
    'sample-imgs': () => { const d = Dr(); const map = { Hoodie: ['img/hoodie-cream.webp', 'img/hoodie-model-cream.webp'], 'T-Shirt': ['img/p-tee.webp', 'img/cat-apparel.webp'], 'Tote Bag': ['img/pr-paimon-tote.webp'], 'Plush Toy': ['img/p-plush.webp', 'img/cat-plush.webp'], Mug: ['img/p-mug.webp', 'img/pr-forest-mug.webp'], Bottle: ['img/p-bottle.webp'], Poster: ['img/p-art-print.webp', 'img/cat-prints.webp'], 'Blind Box': ['img/p-collector-box.webp', 'img/p-figurine.webp'], 'Phone Case': ['img/cat-acrylic.webp'], 'Fridge Magnet': ['img/cat-stickers.webp'] }; (map[d.type] || ['img/p-stickers.webp', 'img/cat-stickers.webp']).forEach((s) => { if (!d.images.includes(s) && d.images.length < 10) d.images.push(s); }); if (!d.imgType) d.imgType = 'Mockup'; d.pre = null; save(); render(); },
    'rm-img': (el) => { Dr().images.splice(+el.dataset.i, 1); Dr().pre = null; save(); render(); },
    set: (el) => { const d = Dr(); d[el.dataset.k] = el.dataset.num ? +el.dataset.v : el.dataset.v; save(); render(); },
    toggle: (el) => { const a = Dr()[el.dataset.k], v = el.dataset.v, i = a.indexOf(v); if (i >= 0) { if (a.length > 1) a.splice(i, 1); else return toast('Keep at least one'); } else a.push(v); save(); render(); },
    'step-next': () => { const d = Dr(); if (!stepOk(d.step, d)) return toast(NEED[d.step]); go('/create/' + (d.step + 1)); },
    'save-draft': () => { if (!requireLogin()) return; upsertDraft(Dr()); save(); toast('Draft saved to My Proposals'); },
    publish: () => {
      const d = Dr(), ip = ipById(d.ip);
      if (!stepOk(5, d)) return toast(NEED[5]);
      const id = (d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proposal') + '-' + Date.now().toString(36).slice(-4);
      const img = d.images[0];
      S.proposals = S.proposals.filter((p) => p.id !== d.id);
      S.proposals.unshift({ id, title: d.title, ip: d.ip, cat: d.type, img, status: 'validating', stage: 2, c: 0, v: 0, p: 0, goal: d.goal, updated: 'Just now' });
      S.extraIdeas.unshift({ id, title: d.title, short: d.title, ip: d.ip, cat: d.type, creator: 'luna-nash', price: [d.price], img, gallery: d.images.slice(0, 5), comments: 0, votes: 0, pre: 0, goal: d.goal, status: 'validating', daysLeft: d.days, desc: d.desc || `${d.format}${d.dirs.length ? ' · ' + d.dirs.join(', ') : ''}.` });
      notify('published', `“${d.title}” is live for validation · goal ${d.goal} intents`, '#/proposal/' + id);
      S.draft = null; save(); go('/proposal/' + id);
      setTimeout(() => modal(`<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:#EAF5E9;color:#2E7D32;display:grid;place-items:center;margin:0 auto 14px">${I('check', 'style="width:30px;height:30px"')}</div><h3 style="padding:0">Your proposal is live!</h3><p>Fans can now pick, comment and pre-order. Reach ${d.goal} intents in ${d.days} days to unlock ${esc(ip.owner)}’s review.</p><div class="acts" style="justify-content:center"><button class="mb s" data-act="p-share" data-id="${id}">Copy share link</button><a class="mb p" href="#/idea/${id}" data-act="close-nav">View public page</a></div></div>`), 90);
    },
    'new-proposal': () => { if (!requireLogin('/create/1')) return; S.draft = blankDraft(); save(); go('/create/1'); },
    'start-ip': (el) => { if (!requireLogin()) return; S.draft = Object.assign(blankDraft(), { ip: el.dataset.ip }); save(); go('/create/2'); },
    'p-share': (el) => { const url = location.href.split('#')[0] + '#/idea/' + el.dataset.id; const done = () => toast('Link copied — share it with your fandom'); try { navigator.clipboard.writeText(url).then(done, done); } catch (e) { done(); } },
    'p-open': (el) => go('/proposal/' + el.dataset.id),
    'p-feedback': (el) => { const p = prop(el.dataset.id); modal(`<h3>Feedback · ${esc(p.title)}</h3>${(p.feedback || [{ from: 'iPly', date: '', text: 'No feedback yet.' }]).map((f) => `<div class="mfb"><small>${esc(f.from)}${f.date ? ' · ' + f.date : ''}</small>${esc(f.text)}</div>`).join('')}<div class="acts">${p.status === 'rejected' ? `<button class="mb p" data-act="resubmit" data-id="${p.id}">Revise &amp; resubmit</button>` : '<button class="mb s" data-act="thread" data-id="review">Reply to reviewer</button>'}<a class="mb g" href="#/proposal/${p.id}" data-act="close-nav">Open proposal</a></div>`); },
    'p-license': (el) => { const p = prop(el.dataset.id); modal(`<h3>License · ${esc(p.title)}</h3><div class="mstats" style="grid-template-columns:1fr 1fr">${Object.entries(p.license).map(([k, v]) => `<div><small style="text-transform:capitalize">${k}</small><b style="font-size:15px">${esc(v)}</b></div>`).join('')}</div><p class="mut" style="margin-top:12px">Licensed by ${esc(ipById(p.ip).owner)}. Demo terms.</p>`); },
    'p-product': (el) => go('/idea/' + el.dataset.id),
    'p-continue': (el) => { const p = prop(el.dataset.id); S.draft = Object.assign(blankDraft(), p.draft || {}, { id: p.id, title: p.title === 'Untitled proposal' ? '' : p.title }); save(); go('/create/' + (S.draft.step || 1)); },
    resubmit: (el) => { const p = prop(el.dataset.id); closeModal(); S.draft = Object.assign(blankDraft(), { ip: p.ip, type: D.PRODUCT_TYPES.some((t) => t.n === p.cat) ? p.cat : 'Bottle', title: p.title + ' (v2)', images: [p.img], original: true, desc: 'Revised after IP owner feedback.' }); save(); go('/create/2'); toast('Revision started with your original details'); },
    'q-decide': (el) => {
      const id = el.dataset.id, v = el.dataset.v, x = idea(id);
      const label = { approved: 'Approve & license', revision: 'Request revision', declined: 'Decline' }[v];
      modal(`<h3>${label}</h3><p class="mut">${esc(x.title)} · ${esc(creator(D.QUEUE.find((q) => q.id === id).creator).name)}</p><form data-form="decide" data-id="${id}" data-v="${v}" novalidate><div class="mf"><label for="q-note">Message to the creator ${v === 'approved' ? '(optional)' : '*'}</label><textarea id="q-note" name="note" placeholder="${v === 'approved' ? 'Congrats! Terms attached.' : 'What should change, and why?'}"></textarea></div>${v === 'approved' ? `<div class="mf2"><div class="mf"><label for="q-roy">Royalty</label><input id="q-roy" name="roy" value="${ipById(x.ip).royalty}% of net sales"></div><div class="mf"><label for="q-run">Pilot run</label><input id="q-run" name="run" value="300 units"></div></div>` : ''}<div class="acts"><button type="button" class="mb g" data-act="close">Cancel</button><button class="mb p">${label}</button></div></form>`);
    },
    'q-undo': (el) => { const id = el.dataset.id; delete S.queue[id]; const p = prop(id), o = D.PROPOSALS.find((q) => q.id === id); if (p && o) Object.assign(p, JSON.parse(JSON.stringify(o))); delete S.ideaDelta[id]; save(); render(); toast('Decision undone'); }
  };
  function upsertDraft(d) {
    const ex = prop(d.id);
    const rec = { id: d.id, title: d.title || 'Untitled proposal', ip: d.ip || 'hollow-knight', cat: d.type || '—', img: d.images[0] || 'img/pt-tshirt.webp', status: 'draft', stage: 0, c: 0, v: 0, p: 0, goal: d.goal || 300, updated: 'Just now', draft: JSON.parse(JSON.stringify(Object.assign({}, d, { pre: null }))) };
    if (ex) Object.assign(ex, rec); else S.proposals.unshift(rec);
  }

  /* ------------------------------------------------------------------ forms */
  const isMail = (v) => /^\S+@\S+\.\S+$/.test(String(v).trim());
  function fieldErr(f, el, m) { el.classList.add('err'); el.setAttribute('aria-invalid', 'true'); const box = el.closest('.fld,.ff,.mf') || el.parentElement; box.insertAdjacentHTML('beforeend', `<div class="ferr">${m}</div>`); }
  function clearErr(f) { $$('.ferr', f).forEach((e) => e.remove()); $$('.err', f).forEach((e) => { e.classList.remove('err'); e.removeAttribute('aria-invalid'); }); }
  const F = {
    search: (f) => { const q = f.q.value.trim(); go('/ideas' + (q ? '?q=' + encodeURIComponent(q) : '')); },
    mail: (f) => { const v = f.email.value.trim(); if (v && !isMail(v)) return toast('Enter a valid email'); go('/signup' + (v ? '?email=' + encodeURIComponent(v) : '')); },
    'owner-mail': () => A['owner-join'](),
    signup: (f) => {
      clearErr(f); let ok = true;
      if (f.name.value.trim().length < 2) { ok = false; fieldErr(f, f.name, 'Please enter your full name.'); }
      if (!isMail(f.email.value)) { ok = false; fieldErr(f, f.email, 'Enter a valid email address.'); }
      if (f.pw.value.length < 8) { ok = false; fieldErr(f, f.pw, 'Use at least 8 characters.'); }
      if (!f.terms.checked) { ok = false; toast('Please accept the Terms & Conditions'); }
      if (!ok) { const e = $('.err', f); if (e) e.focus(); return; }
      S.user.name = f.name.value.trim(); S.user.email = f.email.value.trim(); save(); go('/signup/2');
    },
    login: (f) => { clearErr(f); if (!isMail(f.email.value)) return fieldErr(f, f.email, 'Enter a valid email address.'); S.logged = true; const owner = parse().q.get('as') === 'owner'; S.role = owner ? 'owner' : 'creator'; save(); go(owner ? '/authorize?tab=queue' : '/ideas'); toast('Welcome back' + (owner ? '' : ', ' + firstName())); },
    fandom: (f) => { const v = f.f.value.trim(); if (v && !S.user.fandoms.includes(v)) S.user.fandoms.push(v); save(); render(); },
    comment: (f) => {
      if (!requireLogin()) return; const t = f.t.value.trim(); if (t.length < 2) { f.t.focus(); return toast('Write a few words first'); }
      const id = f.dataset.id;
      (S.comments[id] = S.comments[id] || []).unshift({ u: '@' + S.user.name.toLowerCase().replace(/\s+/g, ''), a: 'img/av-user.webp', t, tag: (ds[id] || {}).tag || '', mine: true });
      save(); render(); setTimeout(() => { const c = $('#comments'); if (c) c.scrollIntoView({ block: 'start' }); }, 20); toast('Comment posted');
    },
    contact: (f) => { clearErr(f); let ok = true; if (!isMail(f.e.value)) { ok = false; fieldErr(f, f.e, 'Enter a valid email.'); } if (f.m.value.trim().length < 5) { ok = false; fieldErr(f, f.m, 'Add a short message.'); } if (!ok) return; f.reset(); toast('Thanks! We’ll reply within 2 business days.'); },
    profile: (f) => { clearErr(f); if (f.n.value.trim().length < 2) return fieldErr(f, f.n, 'Please enter your name.'); if (!isMail(f.e.value)) return fieldErr(f, f.e, 'Enter a valid email.'); S.user.name = f.n.value.trim(); S.user.email = f.e.value.trim(); save(); render(); toast('Settings saved'); },
    owner: (f) => { clearErr(f); let ok = true; if (!f.co.value.trim()) { ok = false; fieldErr(f, f.co, 'Required.'); } if (!f.ip.value.trim()) { ok = false; fieldErr(f, f.ip, 'Required.'); } if (!isMail(f.em.value)) { ok = false; fieldErr(f, f.em, 'Enter a valid work email.'); } if (!ok) return; const name = f.ip.value; closeModal(); S.logged = true; S.role = 'owner'; save(); modal(`<h3>Submitted for verification</h3><p>We’ll verify <b>${esc(name)}</b> within 5 business days. Meanwhile, preview how the review queue works.</p><div class="acts"><a class="mb p" href="#/authorize?tab=queue" data-act="close-nav">Preview review queue</a></div>`); },
    reply: (f) => { const t = f.t.value.trim(); if (!t) return; $('#thr').insertAdjacentHTML('beforeend', `<div class="bub me"><img src="img/av-user.webp" alt=""><p>${esc(t)}</p></div>`); f.reset(); const th = $('#thr'); th.scrollTop = th.scrollHeight; },
    decide: (f) => {
      const id = f.dataset.id, v = f.dataset.v, note = f.note.value.trim();
      clearErr(f); if (v !== 'approved' && note.length < 3) return fieldErr(f, f.note, 'Add a short reason for the creator.');
      S.queue[id] = v;
      const p = prop(id), x = idea(id), owner = ipById(x.ip).owner;
      const msg = note || 'Approved — congratulations! License terms attached.';
      if (v === 'approved') { S.ideaDelta[id] = { status: 'authorized' }; if (p) Object.assign(p, { status: 'authorized', stage: 5, updated: 'Just now', license: { term: '24 months', royalty: f.roy ? f.roy.value : '8% of net sales', territory: 'North America', run: 'Pilot run of ' + (f.run ? f.run.value : '300 units') }, feedback: [{ from: owner, date: 'Just now', text: msg }].concat(p.feedback || []) }); notify('license', `${x.title} was approved by the IP owner`, '#/proposal/' + id); }
      else if (v === 'declined') { if (p) Object.assign(p, { status: 'rejected', updated: 'Just now', feedback: [{ from: owner, date: 'Just now', text: msg }] }); notify('rejected', `${x.title} was not approved — see feedback`, '#/proposal/' + id); }
      else { if (p) Object.assign(p, { feedback: [{ from: owner, date: 'Just now', text: 'Revision requested: ' + msg }].concat(p.feedback || []), updated: 'Just now' }); notify('review', `Revision requested on ${x.title}`, '#/proposal/' + id); }
      save(); closeModal(); render();
      toast(p ? 'Decision sent — the creator sees it in My Proposals' : 'Decision sent to the creator');
    }
  };

  /* ------------------------------------------------------------------ events */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) {
      if (!ev.target.closest('#pop')) closePop();
      if (!ev.target.closest('#guide')) { const g = $('#guide'); if (g) g.remove(); }
      if (ev.target.id === 'scrim') closeModal();
      else if (ev.target.closest('#scrim a[href^="#"]')) closeModal();
      if (!ev.target.closest('#nav,.burger')) { const n = $('#nav.open'); if (n) n.classList.remove('open'); }
      return;
    }
    const act = el.dataset.act;
    if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').startsWith('#')) { if (A[act]) A[act](el, ev); return; } // let hash links navigate
    if (el.tagName === 'INPUT') { if (A[act]) A[act](el, ev); return; }
    ev.preventDefault();
    if (el.getAttribute('aria-disabled') === 'true' && !['pick-ip', 'pick-type', 'step-next', 'publish', 'signup-done'].includes(act)) return;
    if (A[act]) A[act](el, ev);
  });
  document.addEventListener('submit', (ev) => { const f = ev.target.closest('[data-form]'); if (!f) return; ev.preventDefault(); if (F[f.dataset.form]) F[f.dataset.form](f); });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.q !== undefined) { const r = parse(); t.value ? r.q.set(t.dataset.q, t.value) : r.q.delete(t.dataset.q); r.q.set('f', '1'); go('/ideas?' + r.q.toString()); }
    if (t.dataset.pref) { S.prefs[t.dataset.pref] = t.checked; save(); toast('Preference saved'); }
    if (t.dataset.bind) { const d = Dr(), k = t.dataset.bind; d[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; save(); if (['original', 'agree1', 'agree2', 'price', 'imgType'].includes(k)) render(); }
    if (t.id === 'file-in') readFiles(t.files);
  });
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.count) { const c = $('#ccount'); if (c) c.textContent = t.value.length + '/400'; }
    if (t.dataset.bind && t.type !== 'checkbox') {
      const d = Dr(); d[t.dataset.bind] = t.type === 'range' ? +t.value : t.value; save();
      if (t.dataset.bind === 'title') { const b = $('[data-act="step-next"]'), ok = stepOk(4, d); if (b) { b.classList.toggle('is-off', !ok); ok ? b.removeAttribute('aria-disabled') : b.setAttribute('aria-disabled', 'true'); } const w = $('.cpf .why'); if (w) w.style.visibility = ok ? 'hidden' : 'visible'; }
      if (t.type === 'range') { const v = $('#price-v'); if (v) v.textContent = '$' + t.value; }
    }
    if (t.classList.contains('err')) { t.classList.remove('err'); const e = t.closest('.fld,.ff,.mf'); if (e) $$('.ferr', e).forEach((x) => x.remove()); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { closeModal(); closePop(); const g = $('#guide'); if (g) g.remove(); const n = $('#nav.open'); if (n) n.classList.remove('open'); }
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && ev.target.matches('#c-in')) ev.target.form.requestSubmit();
    if (ev.key === 'Tab' && $('#scrim .modal')) { const f = $$('#scrim .modal button, #scrim .modal a, #scrim .modal input, #scrim .modal textarea').filter((e) => !e.disabled); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); } else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); } }
  });
  document.addEventListener('dragover', (ev) => { const d = ev.target.closest('#drop'); if (d) { ev.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', (ev) => { const d = ev.target.closest('#drop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', (ev) => { const d = ev.target.closest('#drop'); if (d) { ev.preventDefault(); d.classList.remove('over'); readFiles(ev.dataTransfer.files); } });
  /* carousels: drag with the mouse to scroll (touch / trackpad scroll natively) */
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const r = e.target.closest('.rail');
    if (!r || e.button !== 0 || e.pointerType === 'touch') return;
    drag = { r, x: e.clientX, sl: r.scrollLeft, moved: false, id: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; drag.r.classList.add('drag'); try { drag.r.setPointerCapture(drag.id); } catch (er) {} }
    if (drag.moved) { e.preventDefault(); drag.r.scrollLeft = drag.sl - dx / railScale(); }
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moved) {
      d.r.classList.remove('drag');
      const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      document.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 60);
    }
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('dragstart', (e) => { if (e.target.closest('.rail')) e.preventDefault(); });
  // scrollLeft units vs screen pixels under CSS zoom (measured once per zoom level)
  let rsCache = { z: 0, k: 1 };
  function railScale() {
    const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
    if (rsCache.z === z) return rsCache.k;
    const r = $('.rail'); let k = 1;
    if (r && r.firstElementChild) { const before = r.firstElementChild.getBoundingClientRect().left, sl = r.scrollLeft; r.scrollLeft = sl + 100; const moved = before - r.firstElementChild.getBoundingClientRect().left, used = r.scrollLeft - sl; r.scrollLeft = sl; if (used > 0 && moved > 0) k = moved / used; }
    rsCache = { z, k }; return k;
  }

  function readFiles(files) {
    const d = Dr(); const list = Array.from(files || []).filter((f) => /image\/(png|jpe?g|webp)/.test(f.type));
    if (!list.length) return toast('Use JPG, PNG or WEBP images');
    let left = list.length;
    const fin = () => { if (!--left) { save(); render(); toast('Image added'); } };
    list.forEach((f) => {
      if (f.size > 10 * 1024 * 1024) { toast(f.name + ' is over 10MB'); return fin(); }
      const r = new FileReader();
      r.onload = () => downscale(r.result, (u) => { if (d.images.length < 10) d.images.push(u); d.pre = null; fin(); });
      r.onerror = fin;
      r.readAsDataURL(f);
    });
  }
  function downscale(url, cb) { const im = new Image(); im.onload = () => { const s = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.84)); }; im.onerror = () => cb(url); im.src = url; }

  let io;
  function after(a, b, r) {
    setZoom();
    if (a === 'signup' && r.q.get('next')) { try { sessionStorage.setItem('iply-next', r.q.get('next')); } catch (e) {} }
    $$('[data-seg]').forEach((s) => s.addEventListener('mouseenter', () => {
      const i = s.dataset.seg, v = [42, 28, 12, 10, 8][i];
      $$('.legend [data-seg]').forEach((l) => l.classList.toggle('on', l.dataset.seg === i));
      $$('circle[data-seg]').forEach((c) => c.setAttribute('stroke-width', c.dataset.seg === i ? '9' : '7'));
      const t = $('#dn-v'); if (t) t.textContent = v + '%';
    }));
    // scroll reveal (falls back to visible)
    const rv = $$('.rv');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) rv.forEach((e) => e.classList.add('in'));
    else { if (io) io.disconnect(); io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }); rv.forEach((e, i) => { e.style.transitionDelay = (i % 5) * 70 + 'ms'; io.observe(e); }); }
    // left-bleeding rails start scrolled to their right end (Figma shows them anchored next to the copy)
    $$('.rail.left').forEach((el) => { el.scrollLeft = el.scrollWidth; });
    onScroll();
  }
  function onScroll() { const h = $('.hdr'); if (h) h.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('hashchange', render);

  const start = qs.get('start');
  if (start && !location.hash) history.replaceState(null, '', '#/' + start);
  if (qs.get('demo') === '1' && !S.logged) { S.logged = true; save(); }
  render();
})();
