/* IPLY — clickable prototype. Hash-routed single page, state in localStorage. */
(function () {
  'use strict';
  const D = window.IPLY_DATA, I = window.ICONS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  if (qs.get('frame') === '1' || qs.get('embed') === '1') document.body.classList.add('embed');

  /* ------------------------------------------------------------------ state */
  const KEY = 'iply-proto-v2';
  const fresh = () => ({
    logged: false, user: { name: 'Luna Nash', email: '', age: '18+', fandoms: ['Hollow Knight', 'Genshin Impact'] },
    votes: {}, saves: {}, pre: {}, cart: [], comments: {}, extraIdeas: [], ideaDelta: {},
    proposals: JSON.parse(JSON.stringify(D.PROPOSALS)), read: {}, notifs: [], queue: {}, draft: null, seenGuide: false
  });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = fresh(); }
  const mem = {}; // big data-URL images that may not fit localStorage
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S, (k, v) => (typeof v === 'string' && v.startsWith('data:') && v.length > 2000 ? 'mem:' + memKey(v) : v))); } catch (e) { /* quota: keep in memory */ }
  }
  function memKey(v) { const k = 'm' + v.length + '_' + v.slice(-24).replace(/[^a-z0-9]/gi, ''); mem[k] = v; return k; }
  const src = (v) => (v && v.startsWith('mem:') ? (mem[v.slice(4)] || 'img/p-tee.webp') : v);

  /* ------------------------------------------------------------------ data helpers */
  const ipById = (id) => D.IPS.find((x) => x.id === id) || D.IPS[0];
  const creator = (id) => D.CREATORS[id] || D.CREATORS['luna-nash'];
  function allIdeas() { return D.IDEAS.concat(S.extraIdeas).map((x) => Object.assign({}, x, S.ideaDelta[x.id] || {})); }
  const idea = (id) => allIdeas().find((x) => x.id === id);
  const prop = (id) => S.proposals.find((x) => x.id === id);
  const money = (p) => (p.length > 1 ? `$${p[0].toFixed(2)}~${p[1].toFixed(2)}` : `$${p[0].toFixed(2)}`);
  const votes = (x) => x.votes + (S.votes[x.id] ? 1 : 0);
  const pres = (x) => x.pre + (S.pre[x.id] ? 1 : 0);
  const ncom = (x) => x.comments + ((S.comments[x.id] || []).length);
  const pct = (a, b) => Math.max(0, Math.min(100, Math.round((a / b) * 100)));
  const STATUS = { validating: 'Validating', review: 'Under Review', launched: 'Launched', draft: 'Draft', precheck: 'Pre Check', rejected: 'Rejected', authorized: 'Authorized' };
  const stTag = (s) => `<span class="status s-${s}">${STATUS[s] || s}</span>`;
  const unread = () => allNotifs().filter((n) => n.unread && !S.read[n.id]).length;
  const allNotifs = () => S.notifs.concat(D.NOTIFS);
  const isApparel = (cat) => /hoodie|t-shirt|tee|cap|socks/i.test(cat || '');
  function notify(type, t, link) { S.notifs.unshift({ id: 'u' + Date.now(), type, t, d: 'Just now', link, unread: true }); }

  /* ------------------------------------------------------------------ router */
  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, q] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(q || ''), path };
  }
  const go = (h) => { location.hash = h; };
  let lastPath = '';

  function render() {
    const r = parse();
    const [a, b] = r.parts;
    let html, chrome = 'app';
    closePop();
    switch (a) {
      case undefined: chrome = 'guest'; html = pLanding(); break;
      case 'owners': chrome = 'owner'; html = pOwners(); break;
      case 'signup': chrome = 'none'; html = pSignup(+b || 1, r.q); break;
      case 'login': chrome = 'none'; html = pLogin(); break;
      case 'ideas': html = pIdeas(r.q); break;
      case 'idea': html = pIdea(b); break;
      case 'create': html = pCreate(+b || (S.draft && S.draft.step) || 1, r.q); break;
      case 'proposals': html = pProposals(r.q); break;
      case 'proposal': html = pProposal(b); break;
      case 'open-ip': html = b ? pIP(b) : pOpenIP(r.q); break;
      case 'activity': html = pActivity(r.q); break;
      case 'authorize': html = pAuthorize(r.q); break;
      case 'saved': html = pSaved(); break;
      case 'contact': chrome = S.logged ? 'app' : 'guest'; html = pContact(); break;
      case 'guidelines': chrome = S.logged ? 'app' : 'guest'; html = pGuidelines(); break;
      default: html = `<div class="wrap empty"><h3>Page not found</h3><a class="btn btn-primary" href="#/">Back home</a></div>`;
    }
    const app = $('#app');
    app.innerHTML = (chrome === 'none' ? '' : header(chrome, a)) + `<main class="page" id="main">${html}</main>` + (chrome === 'none' ? '' : footer()) + guideFab();
    document.title = titleFor(a) + ' · IPLY prototype';
    const sec = r.q.get('s');
    if (sec && $('#' + sec)) setTimeout(() => $('#' + sec).scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    else if (r.path !== lastPath) window.scrollTo(0, 0);
    lastPath = r.path;
    after(a, b, r);
  }
  function titleFor(a) { return ({ undefined: 'Make fan ideas official', owners: 'For IP owners', signup: 'Create account', login: 'Log in', ideas: 'Ideas', idea: 'Idea', create: 'Create proposal', proposals: 'My proposals', proposal: 'Proposal', 'open-ip': 'Open IP', activity: 'Activity', authorize: 'Authorize', saved: 'Picked ideas', contact: 'Contact', guidelines: 'Guidelines' })[a] || 'IPLY'; }

  /* ------------------------------------------------------------------ chrome */
  function header(kind, a) {
    if (kind !== 'app' && !S.logged) {
      const owner = kind === 'owner';
      return `<header class="hdr"><div class="wrap">
        <a class="logo" href="#/" aria-label="IPLY home"><img src="img/logo.svg" alt="IPLY — Make fan ideas official"></a>
        <nav class="nav" id="nav"><a href="#/" class="${!owner && a !== 'contact' ? 'on' : ''}">Fans</a><a href="#/owners" class="${owner ? 'on' : ''}">IP Owners</a><a href="#/contact" class="${a === 'contact' ? 'on' : ''}">Contact Us</a></nav>
        <div class="hdr-r hdr-guest">
          ${owner ? `<a class="btn btn-line btn-sm" href="#/login?as=owner">Log in</a><button class="btn btn-primary btn-sm" data-act="owner-join">Join as an IP Owner</button>`
                  : `<a class="btn btn-line btn-sm" href="#/signup">Sign up</a><a class="btn btn-primary btn-sm" href="#/login">Log in</a>`}
          <button class="ic-btn burger" data-act="burger" aria-label="Menu">${I('menu')}</button>
        </div></div></header>`;
    }
    const nav = [['ideas', 'Ideas'], ['open-ip', 'Open IP'], ['activity', 'Activity'], ['authorize', 'Authorize'], ['contact', 'Contact Us']];
    const cartN = S.cart.reduce((s, c) => s + c.qty, 0) + Object.keys(S.pre).length;
    const un = unread();
    return `<header class="hdr"><div class="wrap">
      <a class="logo" href="#/ideas" aria-label="IPLY ideas"><img src="img/logo.svg" alt="IPLY — Make fan ideas official"></a>
      <nav class="nav" id="nav">${nav.map(([k, l]) => `<a href="#/${k}" class="${a === k || (k === 'ideas' && a === 'idea') || (k === 'open-ip' && a === 'open-ip') ? 'on' : ''}">${l}</a>`).join('')}</nav>
      <div class="hdr-r">
        <button class="ic-btn hide-m" data-act="pop" data-pop="saved" aria-label="Picked ideas">${I('like')}${Object.keys(S.votes).length ? `<span class="badge">${Object.keys(S.votes).length}</span>` : ''}</button>
        <button class="ic-btn" data-act="cart" aria-label="Cart and pre-orders">${I('bag')}${cartN ? `<span class="badge">${cartN}</span>` : ''}</button>
        <button class="ic-btn hide-m" data-act="pop" data-pop="msgs" aria-label="Messages">${I('chat')}<span class="badge">2</span></button>
        <button class="ic-btn" data-act="pop" data-pop="notifs" aria-label="Notifications">${I('bell')}${un ? `<span class="badge">${un}</span>` : ''}</button>
        <button class="av-btn" data-act="pop" data-pop="me" aria-label="Account menu"><img class="avatar" src="img/av-user.webp" alt=""></button>
        <button class="ic-btn burger" data-act="burger" aria-label="Menu">${I('menu')}</button>
      </div></div></header>`;
  }

  function footer() {
    const col = (h, items) => `<div><h5>${h}</h5>${items.map(([l, href]) => `<a class="fl" href="${href}">${l}</a>`).join('')}</div>`;
    return `<footer class="ftr"><div class="wrap">
      <div><a class="logo" href="#/"><img src="img/logo-white.svg" alt="IPLY"></a><p>A creator-first platform for turning fan merch concepts into licensing-ready proposals.</p>
        <div class="social">${['fb', 'tw', 'yt', 'ig', 'pin', 'wa'].map((k) => `<span aria-hidden="true">${I(k)}</span>`).join('')}</div></div>
      ${col('Platform', [['Open IPs', '#/open-ip'], ['Idea Pool', '#/ideas'], ['How It Works', '#/?s=how'], ['Marketplace', '#/ideas?status=launched'], ['Start Proposal', '#/create/1']])}
      ${col('For Creators', [['Submission Guidelines', '#/guidelines?s=submission'], ['Proposal Tips', '#/guidelines?s=tips'], ['Copyright Risk Guide', '#/guidelines?s=copyright'], ['Product Categories', '#/guidelines?s=categories'], ['Creator Dashboard', '#/proposals']])}
      ${col('For IP Owners', [['Register Your IP', '#/owners'], ['Review Proposals', '#/authorize?tab=queue'], ['Brand Guidelines', '#/guidelines?s=brand'], ['Licensing Settings', '#/authorize'], ['Contact Partnership Team', '#/contact']])}
      ${col('Legal', [['Terms of Service', '#/guidelines?s=legal'], ['Privacy Policy', '#/guidelines?s=legal'], ['IP Policy', '#/guidelines?s=legal'], ['Licensing FAQ', '#/guidelines?s=faq'], ['Report Infringement', '#/contact']])}
      <div class="proto-note"><span>Concept prototype · IXDS 708 · SCAD. IP names and logos are illustrative only; no affiliation with the rights holders.</span><span>Design: Wei Zhao, Dingrui Yu, Xiaohe Yu</span></div>
    </div></footer>`;
  }

  function guideFab() {
    return `<button class="guide-fab" data-act="guide"><i></i>Prototype guide</button>`;
  }

  /* ------------------------------------------------------------------ cards */
  function card(x, opt = {}) {
    const ip = ipById(x.ip), cr = creator(x.creator);
    const prog = x.status === 'validating' ? `<div class="prog" title="${pres(x)} / ${x.goal} pre-order intents"><i style="width:${pct(pres(x), x.goal)}%"></i></div>` : '';
    return `<article class="pcard">
      <a href="#/idea/${x.id}" class="ph" aria-label="${esc(x.title)}"><img src="${src(x.thumb || x.img)}" alt="" loading="lazy">${opt.noStatus ? '' : `<span class="st">${stTag(x.status)}</span>`}</a>
      <a href="#/idea/${x.id}" class="body"><div class="t">${esc(opt.full ? x.title : x.short || x.title)}</div><div class="by">by ${esc(cr.name)}</div><div class="pr">${money([x.price[0]])}</div>${prog}</a>
      <div class="meta">
        <a href="#/idea/${x.id}?s=comments" title="Comments"><span>${I('comment')}${ncom(x)}</span></a>
        <button data-act="vote" data-id="${x.id}" class="${S.votes[x.id] ? 'on' : ''}" title="Pick this idea" aria-pressed="${!!S.votes[x.id]}">${I('like')}${votes(x)}</button>
        <span title="Pre-order intents">${I('pre')}${pres(x)}</span>
      </div></article>`;
  }

  /* ------------------------------------------------------------------ pages: landing (creator) */
  function pLanding() {
    const cats = [['Collectible Figures', 'Plastic / mixed materials / premium paper, metal', 'cat-figures'], ['Apparel', 'T-shirts / hoodies / sweatshirts / caps / beanies', 'cat-apparel'], ['Keychains & Charms', 'Acrylic / PVC rubber / metal / epoxy coating', 'cat-keychains'], ['Enamel Pins', 'Zinc alloy / iron, soft enamel, hard enamel, metal plating', 'cat-pins'], ['Plush', 'Soft plush fabric / cotton stuffing', 'cat-plush'], ['Art Prints & Posters', 'Matte paper / glossy paper / textured art paper', 'cat-prints'], ['Stickers', 'Vinyl / waterproof coating / matte / glossy laminate', 'cat-stickers'], ['Acrylic Stands', 'Clear acrylic / UV print / detachable acrylic base', 'cat-acrylic']];
    const openIps = ['genshin', 'squid-game', 'spy-family', 'hollow-knight', 'stranger-things'].map(ipById);
    const start = S.logged ? '#/create/1' : '#/signup?next=create';
    return `
    <section class="peach">
      <div class="l-hero"><div class="wrap">
        <div>
          <span class="pill">Welcome To iPly</span>
          <h1>Turn<br>fan ideas into<br><span class="o">official<br>merch.</span></h1>
          <p class="lead">Submit product concepts for the IPs you love, gather support from fans, and get a chance to be reviewed for official licensing.</p>
          <div class="cta"><a class="btn btn-primary" href="${start}">Start Your Proposal</a><a class="btn btn-line" href="#/open-ip">Explore Open IPs</a></div>
          <div class="social-proof"><img src="img/lc-avatars-a.webp" alt=""><span><b>2K+</b> creators use iPly</span></div>
          <p class="quote">“No production experience required. Start with an idea, sketch, or mockup.”</p>
        </div>
        <div class="art"><img src="img/lc-hero.webp" alt="Hollow Knight collector box concept"></div>
      </div></div>
      <div class="wrap steps4">
        ${[['Turn Ideas into Proposals', 'Transform your fan merch idea into a clear product concept that IP owners can actually review.'], ['Test Fan Demand', 'Use votes, saves, comments, and purchase interest to see whether fans really want your product.'], ['Reach IP Owners', 'Bring promising concepts into a structured review path instead of trying to contact rights holders on your own.'], ['Get Permission', 'Move beyond unofficial fan art by working toward approved, legal fan merchandise.']].map(([h, p], i) => `<div class="sbox"><div class="num">0${i + 1}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}
      </div>
    </section>
    <section class="sec sec-o"><div class="wrap">
      <span class="pill on-dark">Join the iPly Creation Journey</span>
      <h2 class="h-big">Great fan ideas<br>often stop too early.</h2>
      <div class="cards3">
        ${[['You know what fans actually want.', '72% of fans we surveyed have made or shared fan designs', 'You understand the jokes, aesthetics, characters, and emotional details that generic merch often misses.', 'lc-problem-1'], ['But ideas stay unofficial.', '832K Etsy listings removed over IP issues in 2024', 'Many fan concepts remain as sketches, posts, or fan art because licensing is hard to access.', 'lc-problem-2'], ['Production feels out of reach.', '85% would turn their design into licensed merch', 'Creators usually do not have the supply chain, budget, or brand connection to turn ideas into real products.', 'lc-problem-3']].map(([h, stat, p, img]) => `<article class="pcard2"><img src="img/${img}.webp" alt="" loading="lazy"><div class="b"><h3>${h}</h3><div class="mem">${I('trend', 'style="width:16px;height:16px;color:#E95B3A"')}<span>${stat}</span></div><p>${p}</p></div></article>`).join('')}
      </div>
      <p class="xs" style="opacity:.75;margin-top:18px">Survey figures are preliminary signals from a team-run fan survey (sample size not recorded). Etsy figure: Etsy 2024 Transparency Report.</p>
    </div></section>
    <section class="sec sec-k" id="how"><div class="wrap">
      <h2 class="h-big" style="text-align:center;margin-bottom:0">Let’s see how it works</h2>
      <div class="how">
        ${[['Choose an IP', 'Browse available IP campaigns and select the fandom you want to design for.'], ['Submit a merch proposal', 'Upload your product mockup, artwork file, and basic production details.'], ['Validate fan demand', 'Fans vote, save, comment, and show purchase interest before production.'], ['Get IP owner approval', 'High-performing designs are reviewed for licensing, brand fit, and feasibility.'], ['Launch licensed merch', 'Approved designs move toward pilot production as official licensed merchandise.']].map(([h, p], i) => `<div class="step"><div class="n">0${i + 1}</div><h4>${h}</h4><p>${p}</p></div>`).join('')}
      </div>
    </div></section>
    <section class="sec peach"><div class="wrap types">
      <div><span class="pill">Submission Types</span><h2 class="h-big" style="font-size:36px">What can<br>you submit</h2><p class="muted" style="margin:-14px 0 22px">From figures to apparel, posters to lifestyle goods — submit your best ideas in the categories below.</p><a class="btn btn-line btn-sm" href="${start}">Start Uploading Your Ideas</a></div>
      <div class="hscroll">${cats.map(([h, p, img]) => `<a class="tcard" href="#/guidelines?s=categories"><img src="img/${img}.webp" alt="" loading="lazy"><div class="b"><h4>${h}</h4><p>${p}</p></div></a>`).join('')}</div>
    </div>
    <div class="wrap" style="margin-top:80px"><div class="types" style="grid-template-columns:1fr 330px">
      <div class="hscroll">${openIps.map((ip) => `<a class="ipcard" href="#/open-ip/${ip.id}"><img src="${ip.cover}" alt="" loading="lazy"><div class="b"><h4>${ip.name}</h4><span class="tag">${ip.type}</span><p class="small muted" style="margin:12px 0 4px">Open until ${ip.open}</p><span class="small o">View more details +</span></div></a>`).join('')}</div>
      <div><span class="pill">Open IP Programs</span><h2 class="h-big" style="font-size:36px">IPs looking for creators’ ideas</h2><p class="muted" style="margin:-14px 0 22px">These IP owners are currently accepting proposals. Click to view details and start your submission.</p><a class="btn btn-line btn-sm" href="#/open-ip">Explore all Open IPs</a></div>
    </div></div></section>
    <section class="sec sec-k"><div class="wrap campaign">
      <div><span class="pill on-dark" style="border-color:var(--primary);color:var(--primary)">Example Campaign</span><h2 class="h-big">Real ideas,<br>real impact.</h2><p style="color:#ccc;max-width:360px">Flora Z.’s collector drop went from a sketch to IP owner review in 26 days — with 3,421 fans saying they would buy it before a single unit was made.</p><a class="btn btn-line btn-sm" style="border-color:#fff;color:#fff;margin-top:12px" href="#/ideas?ip=hollow-knight">View More Campaigns</a></div>
      <a class="camp-card" href="#/ideas?ip=hollow-knight"><img src="img/lc-campaign.webp" alt="Hollow Knight collector drop" loading="lazy">
        <div class="ov"><div><h3 style="font-family:Georgia,serif;font-weight:400;font-size:26px;letter-spacing:.04em">HOLLOW<br>KNIGHT</h3><b style="font-size:13px;letter-spacing:.06em">COLLECTOR DROP</b><p class="xs" style="color:#bbb;margin-top:14px">Creator: Flora Z.</p></div>
        <div class="camp-stats"><div><b>${I('users')}12,842</b><small>Total saves</small></div><div><b>${I('heart')}3,421</b><small>Pre-order interests</small></div><div><b>${I('shield')}Under Review</b><small>IP owner review</small></div></div></div></a>
    </div></section>
    <section class="sec sec-o cta-band"><div class="wrap">
      <span class="pill on-dark">Join the iPly Creation Journey</span>
      <h2>Ready to turn your idea into something fans can support?</h2>
      <p>Share fan-made product ideas, validate demand through the community, and connect with IP holders through a creator-driven licensing platform.</p>
      <form class="mail" data-form="mail"><input type="email" name="email" placeholder="Enter Your E-mail" aria-label="E-mail"><button class="btn btn-white">Sign Up</button></form>
      <p class="small" style="margin-top:14px">or <a href="#/owners" style="text-decoration:underline">Join as an IP Owner</a></p>
    </div></section>`;
  }

  /* ------------------------------------------------------------------ pages: owner landing */
  function pOwners() {
    return `
    <section class="peach o-hero" style="padding:40px 0 80px"><div class="wrap">
      <div>
        <span class="pill">Welcome To iPly</span>
        <h1>Discover<br>what your<br>fans <span class="o">really<br>want</span></h1>
        <p class="muted">Discover fan-backed ideas before production.<br>Use real demand signals to choose what to license.</p>
        <div class="o-steps">${[['Sign up', 'to create your IP owner profile'], ['Submit IP & proof', 'Share IP details and ownership documents'], ['Get approved', 'by our team in 1 business day']].map(([b, s], i) => `<div><div class="num ${i ? '' : 'f'}">${i + 1}</div><b>${b}</b><small>${s}</small></div>`).join('')}</div>
        <div style="display:flex;gap:14px"><button class="btn btn-primary btn-sm" data-act="owner-join">Join as an IP Owner</button><button class="btn btn-line btn-sm" data-act="owner-req">View Requirements</button></div>
      </div>
      <div class="imgs"><img src="img/lo-hero.webp" alt="IP owner reviewing fan demand dashboard"><img src="img/land-hero2.webp" alt="" loading="lazy"></div>
    </div></section>
    <section class="sec" style="background:#fff"><div class="wrap benef">
      ${[['Validate demand before production', 'See what fans actually want before spending time and budget on manufacturing.'], ['Discover high-potential product ideas', 'Access creator-submitted concepts that match your IP, audience, and fandom culture.'], ['Reduce merchandise risk', 'Use saves, votes, and pre-order interest to avoid low-performing product launches.'], ['Save internal development time', 'Skip months of trend research and early ideation by reviewing fan-backed concepts directly.']].map(([h, p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join('')}
    </div></section>
    <section class="sec" style="background:#fff;padding-top:20px"><div class="wrap">
      <h2 class="h-big" style="text-align:center">How it works</h2>
      <div class="how light">${[['Verify Your IP Ownership', 'Submit ownership or authorization documents and complete our verification process.'], ['Receive Creator Submissions', 'Verified creators submit original product concepts inspired by your IP.'], ['Review Fan Demand Signals', 'Track votes, saves, pre-order intent, and community engagement in real time.'], ['Approve Products for Licensing', 'Select validated concepts for official collaboration, licensing, and production.']].map(([h, p], i) => `<div class="step"><div class="n">0${i + 1}</div><h4>${h}</h4><p>${p}</p></div>`).join('')}</div>
    </div></section>
    <section class="sec peach"><div class="wrap insights">
      <div><span class="pill">For IP Owners</span><h2 class="h-big" style="font-size:38px"><span class="o">Real-time</span><br>fandom demand insights</h2><p class="muted">Understand what your audience wants so you can act faster and stay ahead of the market.</p><button class="btn btn-primary btn-sm" data-act="owner-join" style="margin-top:12px">Join as an IP Owner</button></div>
      <div class="icard"><h4>Top requested categories</h4>${donut()}</div>
      <div class="icard"><h4>Save-to-preorder</h4><b style="font-family:var(--head);font-size:34px">71%</b><div class="xs" style="color:var(--green)">▲ 9% <span class="muted">vs last 30 days</span></div>${spark()}</div>
    </div></section>
    <section class="sec" style="background:#fff"><div class="wrap">
      <div class="trust">
        ${[['Pre-screened submissions', 'Every concept passes a copyright and quality pre-check before it reaches you.', 'lo-trust-board'], ['Structured approval workflow', 'IP owners maintain final review authority on all products.', 'lo-trust-laptop'], ['Verified ownership system', 'Only verified IP owners can approve licensed production opportunities.', 'lo-trust-cert']].map(([h, p, img]) => `<div class="tc"><img src="img/${img}.webp" alt="" loading="lazy"><div class="b"><h4>${h}</h4><p>${p}</p><button class="small o" data-act="trust" data-h="${esc(h)}">View more details +</button></div></div>`).join('')}
        <div><span class="pill">Trust &amp; Control</span><h2 class="h-big" style="font-size:36px">Built for licensing collaboration</h2><p class="muted small">Designed to protect IP quality, approval control, and brand integrity.</p></div>
      </div>
      <div class="badges-row">${[['shield', 'Ownership verification'], ['file', 'Brand guideline checks'], ['box', 'Product safety testing with accredited labs'], ['link', 'Contracts & royalty tracking']].map(([i, t]) => `<div>${I(i)}${t}</div>`).join('')}</div>
    </div></section>
    <section class="sec sec-o cta-band"><div class="wrap">
      <span class="pill on-dark">Become an iPly Partner</span>
      <h2>Ready to discover what your fans want next?</h2>
      <p>Join iPly to validate fan demand, review creator concepts, and turn high-potential ideas into licensed merchandise opportunities.</p>
      <form class="mail" data-form="owner-mail"><input type="email" name="email" placeholder="Enter Your E-mail" aria-label="E-mail"><button class="btn btn-white">Sign Up</button></form>
    </div></section>`;
  }
  function donut() {
    const data = [['Figures', 42, '#E95B3A'], ['Apparel', 28, '#F6D7C6'], ['Accessories', 12, '#F7E79B'], ['Enamel Pins', 10, '#FBE9E4'], ['Other', 8, '#C9C9CE']];
    let acc = 0; const R = 15.915;
    const segs = data.map(([n, v, c], i) => { const s = `<circle data-seg="${i}" r="${R}" cx="21" cy="21" fill="transparent" stroke="${c}" stroke-width="7" stroke-dasharray="${v} ${100 - v}" stroke-dashoffset="${25 - acc}" style="transition:stroke-width .15s;cursor:pointer"></circle>`; acc += v; return s; }).join('');
    return `<div class="donut-wrap"><svg viewBox="0 0 42 42" width="150" height="150" role="img" aria-label="Top requested categories donut chart">${segs}<text id="dn-v" x="21" y="23.5" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="7">42%</text></svg>
      <div class="legend">${data.map(([n, v, c], i) => `<div data-seg="${i}" class="${i ? '' : 'on'}"><i style="background:${c}"></i>${n}<span>${v}%</span></div>`).join('')}</div></div>`;
  }
  function spark() {
    const pts = [8, 10, 9, 12, 11, 14, 13, 18, 16, 21, 19, 26, 22, 30];
    const w = 220, h = 90, mx = 32;
    const xy = pts.map((v, i) => [Math.round((i / (pts.length - 1)) * w), Math.round(h - (v / mx) * h)]);
    const line = xy.map((p) => p.join(',')).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="110" preserveAspectRatio="none" style="margin-top:18px" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E95B3A" stop-opacity=".45"/><stop offset="1" stop-color="#E95B3A" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${line} ${w},${h}" fill="url(#sg)"/><polyline points="${line}" fill="none" stroke="#E95B3A" stroke-width="2"/></svg>`;
  }

  /* ------------------------------------------------------------------ pages: signup / login */
  function authShell(step, inner, bg, ill) {
    return `<div class="auth"><div class="auth-l" style="background:${bg}"><img class="ill" src="${ill}" alt=""><img class="alogo" src="img/logo.svg" alt="IPLY"></div>
      <div class="auth-r"><div class="auth-top"><button data-act="auth-back">${I('back')}Back</button><span>${step}</span></div><div class="auth-body">${inner}</div></div></div>`;
  }
  function pSignup(step, q) {
    if (step === 1) {
      const em = q.get('email') || '';
      return authShell('STEP 01/03', `<h1>Create Your Account!</h1><p class="sub">We use your information to support a safe and trusted creator community.</p>
        <form data-form="signup" novalidate>
          <div class="field"><label for="f-name">Full name*</label><input class="inp" id="f-name" name="name" value="Luna Nash" autocomplete="name"></div>
          <div class="field"><label for="f-email">Email address*</label><input class="inp" id="f-email" name="email" type="email" value="${esc(em)}" placeholder="Enter email address" autocomplete="email"></div>
          <div class="field"><label for="f-pw">Create password*</label><div class="pw"><input class="inp" id="f-pw" name="pw" type="password" placeholder="Enter password" autocomplete="new-password"><button type="button" data-act="pw">Show</button></div><div class="xs muted" style="margin-top:6px">At least 8 characters.</div></div>
          <label class="check" style="margin:6px 0 28px"><input type="checkbox" name="terms" checked> I agree to the <a class="link" href="#/guidelines?s=legal" target="_blank">Terms &amp; Conditions</a></label>
          <button class="btn btn-primary btn-block btn-sq">Create Account</button>
          <div class="or">Or</div>
          <button type="button" class="google" data-act="google">${I.google}Continue with Google</button>
          <p class="small muted" style="text-align:center;margin-top:18px">Already have an account? <a class="link" href="#/login">Log in</a></p>
        </form>`, '#EA5B3C', 'img/onb1-illus.webp');
    }
    if (step === 2) {
      const a = S.user.age;
      return authShell('STEP 02/03', `<h1 style="margin-bottom:40px">Which age group are you in?</h1>
        <div role="radiogroup" aria-label="Age group">
        ${[['Under 18', 'child'], ['18+', 'adult']].map(([v, ic]) => `<button class="opt ${a === v ? 'on' : ''}" role="radio" aria-checked="${a === v}" data-act="age" data-v="${v}">${I(ic)}${v}<span class="rad"></span></button>`).join('')}
        </div>
        <p class="xs muted" style="margin:-4px 0 28px">${a === 'Under 18' ? 'Under-18 accounts can browse, vote and comment. Submitting proposals and pre-orders need a guardian’s approval.' : 'We ask so we can show age-appropriate IPs and keep pre-orders safe.'}</p>
        <button class="btn btn-primary btn-block btn-sq" data-act="go" data-href="#/signup/3">Continue</button>`, '#FFC6B9', 'img/onb2-illus.webp');
    }
    const f = S.user.fandoms;
    const extra = f.filter((x) => !D.FANDOMS.includes(x));
    return authShell('STEP 03/03', `<h1>Add your own fandom</h1><p class="small muted" style="margin-top:8px">Pick at least one — we’ll show you open IP programs and ideas for these first.</p>
      <div class="fchips">${D.FANDOMS.concat(extra).map((n) => `<button class="fchip ${f.includes(n) ? 'on' : ''}" data-act="fandom" data-v="${esc(n)}" aria-pressed="${f.includes(n)}">${esc(n)}</button>`).join('')}
        <form class="fchip add" data-form="fandom" style="display:flex;align-items:center"><span>+&nbsp;</span><input name="f" placeholder="Add your fandom" aria-label="Add your fandom"></form></div>
      <button class="btn ${f.length ? 'btn-primary' : 'btn-grey'} btn-block btn-sq" data-act="signup-done" ${f.length ? '' : 'disabled'}>Done</button>`, '#FFC6B9', 'img/onb3-illus.webp');
  }
  function pLogin() {
    const owner = parse().q.get('as') === 'owner';
    return authShell('', `<h1>Welcome back!</h1><p class="sub">Log in to keep track of your proposals and picks.</p>
      <form data-form="login" novalidate>
        <div class="field"><label for="l-email">Email address*</label><input class="inp" id="l-email" name="email" type="email" value="luna@example.com"></div>
        <div class="field"><label for="l-pw">Password*</label><div class="pw"><input class="inp" id="l-pw" name="pw" type="password" value="password123"><button type="button" data-act="pw">Show</button></div></div>
        <button class="btn btn-primary btn-block btn-sq" style="margin-top:12px">${owner ? 'Log in to IP Owner Portal' : 'Log in'}</button>
        <div class="or">Or</div>
        <button type="button" class="google" data-act="google-login">${I.google}Continue with Google</button>
        <p class="small muted" style="text-align:center;margin-top:18px">New here? <a class="link" href="#/signup">Create an account</a></p>
        <p class="xs muted" style="text-align:center">Prototype: demo credentials are pre-filled.</p>
      </form>`, '#EA5B3C', 'img/onb1-illus.webp');
  }

  /* ------------------------------------------------------------------ pages: ideas */
  function pIdeas(q) {
    const term = (q.get('q') || '').toLowerCase(), ipf = q.get('ip') || '', cat = q.get('cat') || '', st = q.get('status') || '', sort = q.get('sort') || 'default', cr = q.get('creator') || '', open = q.get('f') === '1' || ipf || cat || st || cr;
    let list = allIdeas().filter((x) => (!term || (x.title + ' ' + ipById(x.ip).name + ' ' + creator(x.creator).name + ' ' + x.cat).toLowerCase().includes(term)) && (!ipf || x.ip === ipf) && (!cat || x.cat === cat) && (!st || x.status === st) && (!cr || x.creator === cr));
    const sorters = { trending: (a, b) => votes(b) - votes(a), closest: (a, b) => (pres(b) / b.goal) - (pres(a) / a.goal), newest: (a, b) => (b.daysLeft || 0) - (a.daysLeft || 0), price: (a, b) => a.price[0] - b.price[0] };
    if (sort === 'default') { /* design order */ } else list.sort(sorters[sort] || sorters.trending);
    const cats = [...new Set(allIdeas().map((x) => x.cat))].sort();
    const setQ = (k, v) => { const n = new URLSearchParams(q); v ? n.set(k, v) : n.delete(k); return '#/ideas?' + n.toString(); };
    return `<div class="peach" style="padding-top:10px;min-height:100vh"><div class="wrap">
      <form class="search-row" data-form="search"><label class="search">${I('search')}<input name="q" value="${esc(q.get('q') || '')}" placeholder="IP / Creator" aria-label="Search by IP or creator"></label><button class="btn btn-primary">Search</button><button type="button" class="filter-btn ${open ? 'on' : ''}" data-act="go" data-href="${setQ('f', open ? '' : '1')}" aria-label="Filters" aria-expanded="${!!open}">${I('sliders')}</button></form>
      ${open ? `<div class="filters">
        <label for="fi-ip">IP</label><select id="fi-ip" data-q="ip"><option value="">All IPs</option>${D.IPS.map((ip) => `<option value="${ip.id}" ${ipf === ip.id ? 'selected' : ''}>${ip.name}</option>`).join('')}</select>
        <label for="fi-cat">Category</label><select id="fi-cat" data-q="cat"><option value="">All</option>${cats.map((c) => `<option ${cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <label for="fi-sort">Sort</label><select id="fi-sort" data-q="sort">${[['default', 'Featured'], ['trending', 'Most picked'], ['closest', 'Closest to goal'], ['newest', 'Most time left'], ['price', 'Price: low to high']].map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="chips" style="margin-left:auto">${[['', 'All'], ['validating', 'Validating'], ['review', 'Under Review'], ['launched', 'Launched']].map(([v, l]) => `<a class="chip round ${st === v ? 'on' : ''}" style="display:inline-flex;align-items:center" href="${setQ('status', v)}">${l}</a>`).join('')}</div>
      </div>` : ''}
      ${term || ipf || cat || st || cr ? `<p class="small muted" style="margin:-10px 0 18px">${list.length} idea${list.length === 1 ? '' : 's'} ${cr ? 'by ' + esc(creator(cr).name) : ''} · <a class="link" href="#/ideas">Clear filters</a></p>` : ''}
      ${list.length ? `<div class="grid4">${list.map((x) => card(x)).join('')}</div>` : `<div class="empty"><h3>No ideas match “${esc(q.get('q') || '')}”</h3><p>Try another IP or creator — or be the first to propose it.</p><a class="btn btn-primary" href="#/create/1">Create a proposal</a></div>`}
    </div></div>`;
  }

  /* ------------------------------------------------------------------ pages: idea detail */
  let detailState = {};
  function pIdea(id) {
    const x = idea(id);
    if (!x) return `<div class="wrap empty"><h3>Idea not found</h3><a class="btn btn-primary" href="#/ideas">Back to Ideas</a></div>`;
    const ip = ipById(x.ip), cr = creator(x.creator);
    const ds = detailState[id] || (detailState[id] = { v: 0, img: 0, size: 'S' });
    const gallery = x.gallery || [x.img];
    const mainImg = x.variants ? (ds.img === 0 ? x.variants[ds.v].img : gallery[ds.img]) : src(gallery[ds.img] || x.img);
    const p = pres(x), goal = x.goal;
    const picked = !!S.votes[id], preed = !!S.pre[id];
    const rank = Math.max(1, Math.round(100 - (allIdeas().filter((o) => votes(o) < votes(x)).length / allIdeas().length) * 100));
    const cta2 = x.status === 'launched' ? `<button class="btn btn-grey" data-act="add-cart" data-id="${id}">Add to cart</button>`
      : (x.status === 'review' || x.status === 'authorized') ? `<button class="btn btn-grey" data-act="notify-me" data-id="${id}">${preed ? 'Pre-order held ✓' : 'Notify me at launch'}</button>`
      : `<button class="btn btn-grey" data-act="preorder" data-id="${id}">${preed ? 'Pre-order intent ✓' : 'Join pre-order'}</button>`;
    const val = x.status === 'launched'
      ? `<div class="valbox"><div class="top"><b>Officially licensed · in stock</b><span>${p} fans backed this before launch</span></div><div class="bar"><i style="width:100%;background:var(--green)"></i></div><div class="hint">Licensed by ${esc(ip.owner)}. Creator earns ${ip.royalty}% of every sale.</div></div>`
      : x.status === 'authorized'
        ? `<div class="valbox"><div class="top"><b>Approved by the IP owner</b><span>${p} / ${goal}</span></div><div class="bar"><i style="width:100%;background:var(--green)"></i></div><div class="hint">Licensed and heading into a pilot production run. Pre-order holders are charged when it ships.</div></div>`
      : x.status === 'review'
        ? `<div class="valbox"><div class="top"><b>Goal reached · with the IP owner</b><span>${p} / ${goal}</span></div><div class="bar"><i style="width:100%"></i></div><div class="hint">The IP owner is reviewing brand fit and feasibility. Pre-orders are held — you are only charged if it’s approved.</div></div>`
        : `<div class="valbox"><div class="top"><b>${p} / ${goal} pre-order intents</b><span>${x.daysLeft} days left</span></div><div class="bar"><i style="width:${pct(p, goal)}%"></i></div><div class="hint">${goal - p > 0 ? `${goal - p} more to unlock IP owner review. ` : 'Goal reached! '}No charge until the IP owner approves and production starts.</div></div>`;
    const dicons = { Material: 'leaf', Dimensions: 'ruler', 'IP fits': 'shield', 'Creator notes': 'brush' };
    const det = x.detail || { Material: `Proposed as a ${x.cat.toLowerCase()} — final materials are confirmed with the IP owner’s licensed manufacturer.`, Dimensions: 'Standard size for this category. Exact specs are set during production planning.', 'IP fits': `Designed for ${ip.name}. ${ip.tone}`, 'Creator notes': x.desc };
    const comments = (S.comments[id] || []).concat(D.COMMENTS[id] || seedComments(x, ip));
    const more = allIdeas().filter((o) => o.id !== id && (o.ip === x.ip || o.creator === x.creator)).slice(0, 4);
    return `<div class="peach" style="padding-bottom:10px"><div class="wrap">
      <form class="search-row" data-form="search" style="margin-top:8px"><label class="search">${I('search')}<input name="q" placeholder="IP / Creator" aria-label="Search"></label><button class="btn btn-primary">Search</button><a class="filter-btn" href="#/ideas?f=1" aria-label="Filters">${I('sliders')}</a></form>
      <button class="back" data-act="back" style="margin-top:0">${I('back')}Back</button>
      <section class="detail-card">
        <div>
          <div class="gal-main"><img src="${mainImg}" alt="${esc(x.title)}"></div>
          <div class="gal-th">${(x.variants ? [x.variants[ds.v].img].concat(gallery.slice(1)) : gallery).map((g, i) => `<button class="${ds.img === i ? 'on' : ''}" data-act="gal" data-id="${id}" data-i="${i}" aria-label="Image ${i + 1}"><img src="${src(g)}" alt=""></button>`).join('')}</div>
        </div>
        <div class="d-info">
          ${stTag(x.status)}
          <h1>${esc(x.title)}</h1><div class="by">by <a href="#/ideas?creator=${x.creator}">${esc(cr.name)}</a> · <a href="#/open-ip/${ip.id}">${esc(ip.name)}</a></div>
          <div class="price">${money(x.price)}</div>
          <h5>Description</h5><p class="desc">${esc(x.desc)}</p>
          ${x.variants ? `<h5>Choose color</h5><div class="xs muted">${x.variants[ds.v].c}</div><div class="swatches">${x.variants.map((v, i) => `<button class="${ds.v === i ? 'on' : ''}" data-act="color" data-id="${id}" data-i="${i}" aria-label="${v.c}" title="${v.c}"><img src="${v.img}" alt=""></button>`).join('')}</div>` : ''}
          ${isApparel(x.cat) ? `<h5>Size</h5><div class="sizes" role="radiogroup">${['S', 'M', 'L', 'XL'].map((s) => `<label><input type="radio" name="size" value="${s}" ${ds.size === s ? 'checked' : ''} data-act="size" data-id="${id}">${s}</label>`).join('')}<button class="sg" data-act="size-guide">Size Guide</button></div>` : ''}
          <div class="d-cta"><button class="btn ${picked ? 'btn-line-o' : 'btn-primary'}" data-act="vote" data-id="${id}" aria-pressed="${picked}">${picked ? 'Picked ✓' : 'Pick this idea'}</button>${cta2}</div>
          ${val}
          <div class="trio">
            <button data-act="ip-info" data-ip="${ip.id}">${I('heart')}<b>IP Clearance Available</b><small>${ip.open === 'Closed' ? 'Program closed' : 'Ready to license'}</small></button>
            <div>${I('shield')}<b>Community Favorite</b><small>Top ${rank}% of ideas</small></div>
            <button data-act="remix" data-id="${id}">${I('swap')}<b>Open For Creator Remix</b><small>Build on this idea</small></button>
          </div>
        </div>
      </section>
      <section class="d2">
        <div class="panel"><h3>Product Detail</h3>${Object.entries(det).map(([k, v]) => `<div class="acc"><button data-act="acc" aria-expanded="false"><span class="ico">${I(dicons[k] || 'info')}</span><span><b>${k}</b><p>${esc(v)}</p></span><span class="chev">${I('down')}</span></button></div>`).join('')}</div>
        <div class="panel"><h3>About Creator</h3>
          <div class="creator"><img src="${cr.avatar}" alt=""><div><b>${esc(cr.name)}</b><p>${esc(cr.bio)}</p><a class="btn btn-line btn-xs" style="border-width:1px" href="#/ideas?creator=${x.creator}">View profile</a></div></div>
          <h5 style="margin:0 0 10px;font-size:13px">Creator Impact</h5>
          <div class="impact"><div>${I('box')}<b>${cr.inProduction}</b><small>In Production</small></div><div>${I('users')}<b>${cr.validating}</b><small>In Validation</small></div><div>${I('grid')}<b>${cr.published}</b><small>Published Ideas</small></div><div>${I('link')}<div class="logos"><img src="img/ip-hollow-knight.webp" alt=""><img src="img/ip-stranger-things.webp" alt=""><img src="img/ip-squid-game.webp" alt=""></div><small>Partnered IPs</small></div></div>
          <div class="quote-box">${esc(cr.bio)}</div>
        </div>
      </section>
      ${more.length ? `<div class="row-h"><h2>You May Also Like</h2><a href="#/ideas?ip=${x.ip}">View All ${I('next', 'style="width:16px;height:16px"')}</a></div><div class="grid4">${more.map((o) => card(o)).join('')}</div>` : ''}
      <div class="row-h" id="comments"><h2>Comments <span class="muted" style="font-size:16px;font-weight:500">${ncom(x)}</span></h2><button class="link" data-act="all-comments" style="color:#888;font-size:16px;font-weight:400">${detailState[id].allC ? 'Show less' : 'View All'} ${I('next', 'style="width:16px;height:16px;vertical-align:-3px"')}</button></div>
      <form class="cbox" data-form="comment" data-id="${id}"><img src="img/av-user.webp" alt=""><div class="f"><label class="sr" for="c-in">Comment</label><textarea id="c-in" name="t" placeholder="What are your thoughts on this idea?" maxlength="400"></textarea>
        <div class="acts"><div class="ctags" role="group" aria-label="Comment type">${['Love it', 'Suggestion', 'Would buy'].map((t, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-act="ctag" data-v="${t}">${t}</button>`).join('')}<button type="button" class="on" style="pointer-events:none">${esc(ip.name)}</button></div><button class="btn btn-primary btn-sm">Post comment</button></div></div></form>
      <div class="comments">${(detailState[id].allC ? comments : comments.slice(0, 4)).map((c) => `<div class="cm"><img src="${c.a}" alt=""><div><b>${esc(c.u)}</b><p>${esc(c.t)}</p>${c.tag ? `<span class="ct">${esc(c.tag)}</span>` : ''}</div></div>`).join('')}</div>
    </div></div>`;
  }

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

  /* ------------------------------------------------------------------ pages: create proposal */
  const STEPS = ['Choose IP', 'Product Type', 'Upload', 'Audience', 'Publish'];
  function blankDraft() { return { id: 'd' + Date.now(), ip: '', type: '', format: 'Product Concept', dirs: [], images: [], caption: '', desc: '', url: '', imgType: '', srcLink: '', original: false, title: '', fans: ['Collectors'], age: 'All ages', price: 28, goal: 0, days: 30, regions: ['North America'], step: 1, agree1: false, agree2: false, pre: null }; }
  function D_() { if (!S.draft) S.draft = blankDraft(); return S.draft; }
  function stepOk(n, d) {
    if (n === 1) return !!d.ip;
    if (n === 2) return !!d.type && !!d.format;
    if (n === 3) return d.images.length > 0 && d.original;
    if (n === 4) return d.title.trim().length >= 3;
    return true;
  }
  function pCreate(step, q) {
    const d = D_();
    if (q.get('ip') && !d.ip) d.ip = q.get('ip');
    if (q.get('type') && !d.type) d.type = q.get('type');
    for (let i = 1; i < step; i++) if (!stepOk(i, d)) { step = i; break; }
    d.step = step; save();
    const pubOk = step !== 5 || !!(d.pre && !Object.values(d.pre).some((x) => x.r === 'run' || x.r === 'fail') && d.agree1 && d.agree2);
    const ok = step === 5 ? pubOk : stepOk(step, d);
    const stepper = `<div class="stepper">${STEPS.map((s, i) => { const n = i + 1; const reach = n < step || (n === step); const done = n < step; return `<button class="${n === step ? 'on' : ''} ${done ? 'done' : ''}" ${done || n === step ? `data-act="go" data-href="#/create/${n}"` : 'disabled'} aria-current="${n === step ? 'step' : 'false'}"><span class="c">${done ? I('check', 'style="width:18px;height:18px"') : n}</span>${s}</button>`; }).join('')}</div>`;
    const foot = (label = 'Continue') => `<div class="cp-foot">${step > 1 ? `<button class="btn btn-grey" data-act="go" data-href="#/create/${step - 1}">Back</button>` : ''}<span class="sp"></span><button class="btn btn-grey" data-act="save-draft">Save Draft</button><button class="btn btn-primary ${ok ? '' : 'is-disabled'}" data-act="${step === 5 ? 'publish' : 'step-next'}" ${ok ? '' : 'aria-disabled="true"'}>${label}</button></div>`;
    let body = '';
    const ip = d.ip ? ipById(d.ip) : null;
    if (step === 1) {
      const order = ['hollow-knight', 'arcane', 'omori', 'squid-game', 'genshin', 'spy-family', 'animal-crossing', 'stranger-things'];
      body = `<h2>Choose The IP You Want To Create For</h2><p class="lead">Select an IP from our library to build your proposal. Each IP has its own community, guidelines, and opportunities.</p>
        <h4>Select an IP</h4><div class="ip-grid" style="margin-top:14px" role="radiogroup" aria-label="IP">${order.map((k) => { const x = ipById(k); const closed = x.open === 'Closed'; return `<button class="ipsel ${d.ip === k ? 'on' : ''} ${closed ? 'dis' : ''}" role="radio" aria-checked="${d.ip === k}" data-act="pick-ip" data-v="${k}" ${closed ? 'data-closed="1"' : ''} aria-label="${x.name}"><img src="${x.logo}" alt=""><span class="ck">${I('check', 'style="width:14px;height:14px"')}</span>${closed ? '<span class="closed">Program closed</span>' : ''}</button>`; }).join('')}</div>
        <div class="tipsrow"><div>${ip ? `<div class="info">${I('info')}<span><b>${ip.name}</b> · ${ip.type} · Open until ${ip.open}<br><span class="muted">Creator royalty ${ip.royalty}% · Validation goal from ${ip.minGoal} pre-order intents · ${ip.proposals} proposals so far</span></span></div>` : `<div class="info">${I('info')}<span>Select an IP from our library to build your proposal. Each IP has its own community, guidelines, and opportunities.</span></div>`}</div>
          <div class="tips"><b>Submission Tips</b><ul><li>Choose the IP that best fits your concept and target fans.</li><li>Review the IP’s Creator Guidelines before you continue.</li><li>Clear IP alignment helps reviewers understand your proposal more easily.</li></ul><a href="#/guidelines?s=submission" target="_blank">View IP &amp; Submission Guidelines <span>→</span></a></div></div>`;
    } else if (step === 2) {
      body = `<h2>What Are You Creating?</h2><p class="lead">Select the type of product and format${ip ? ` for <b>${ip.name}</b>` : ''}.</p>
        <h4>Choose Product Type</h4><p class="hsub">Select the type of merchandise you want to create. Greyed-out types aren’t open for this IP yet.</p>
        <div class="types-grid">${D.PRODUCT_TYPES.map((t) => { const open = !ip || ip.cats.includes(t.n); return `<button class="ptype ${d.type === t.n ? 'on' : ''} ${open ? '' : 'dis'}" data-act="pick-type" data-v="${t.n}" ${open ? '' : 'aria-disabled="true" title="Not open for this IP"'} aria-pressed="${d.type === t.n}">${t.i ? `<img src="${t.i}" alt="">` : I(t.n === 'Phone Case' ? 'phone' : 'poster', 'stroke-width="1.1"')}${t.n}</button>`; }).join('')}</div>
        <div class="info warm" style="margin-top:22px">${I('info')}<span>Not sure which one fits? View examples in our <a class="link" href="#/guidelines?s=categories" target="_blank">Submission Guidelines</a>.</span></div>
        <div class="divider"></div>
        <h4>Choose Creation Format</h4><p class="hsub">Select the format that best matches your idea.</p>
        <div class="chips">${D.FORMATS.map((f) => `<button class="chip ${d.format === f ? 'on' : ''}" data-act="pick-format" data-v="${f}" aria-pressed="${d.format === f}">${f}</button>`).join('')}</div>
        <div class="divider"></div>
        <h4>Select Design Direction <span class="muted" style="font-weight:400">· ${d.dirs.length}/3 selected</span></h4><p class="hsub">Choose up to three styles or vibes that best represent your concept.</p>
        <div class="chips">${D.DIRECTIONS.map((f) => `<button class="chip ${d.dirs.includes(f) ? 'on' : ''}" data-act="pick-dir" data-v="${f}" aria-pressed="${d.dirs.includes(f)}">${f}</button>`).join('')}</div>`;
    } else if (step === 3) {
      const slots = ['Main image', 'Detail Image', 'Mockup image', 'Lifestyle image', 'Add more'];
      body = `<h2>Upload Your Concept Images</h2><p class="lead">Show your idea with clear visuals, mockups, or references.</p>
        <div class="up-grid"><div>
          <label class="drop" id="drop" for="file-in">${I('upload')}<b>Image Caption</b><p>Drag and drop your file here, or browse from your device.<br>Recommended: JPG, PNG, or WEBP under 10MB.</p><span class="btn btn-line-o btn-sm" style="min-width:200px">Browse Files</span></label>
          <input type="file" id="file-in" accept="image/png,image/jpeg,image/webp" multiple hidden>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px"><h4>Uploaded Images <span class="muted" style="font-weight:400;font-size:11px">${d.images.length}/10</span></h4><button class="link small" data-act="sample-imgs">Use sample images</button></div>
          <div class="thumbs">${slots.map((s, i) => d.images[i] ? `<div class="thumb" style="border-style:solid"><img src="${src(d.images[i])}" alt="">${i === 0 ? '<span class="cover">Cover</span>' : ''}<button class="x" data-act="rm-img" data-i="${i}" aria-label="Remove image">×</button></div>` : `<label class="thumb" for="file-in">${I('image')}${s.replace(' ', '<br>')}</label>`).join('')}</div>
          <div class="info warm" style="width:auto">${I('info')}<span>The first image you upload will be used as your proposal cover.</span></div>
        </div><div>
          <div class="fld"><label for="u-cap">Image Caption</label><input class="in" id="u-cap" data-bind="caption" value="${esc(d.caption)}" placeholder="Add a short note for this visual"></div>
          <div class="fld"><label for="u-desc">Description</label><textarea id="u-desc" data-bind="desc" placeholder="Describe what this image shows. Is it a sketch, mockup, render, or final visual?">${esc(d.desc)}</textarea></div>
          <div class="fld"><label for="u-url">Import from URL</label><input class="in" id="u-url" data-bind="url" value="${esc(d.url)}" placeholder="Example: https://www.behance.net/your-project"></div>
          <div class="fld"><label for="u-type">Image Type</label><select id="u-type" data-bind="imgType"><option value="">Select image type</option>${['Sketch', 'Mockup', '3D render', 'Final visual', 'Reference'].map((o) => `<option ${d.imgType === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fld"><label for="u-src">Source or Reference Link</label><input class="in" id="u-src" data-bind="srcLink" value="${esc(d.srcLink)}" placeholder="Add a Figma, portfolio, Pinterest, or reference link"><div class="ex">Example: https://www.behance.net/your-project</div></div>
          <div class="fld"><label>Originality Check</label><label class="radio"><input type="checkbox" data-bind="original" ${d.original ? 'checked' : ''}> I confirm this visual is my own work or clearly marked as a reference.</label></div>
        </div></div>
        ${!ok ? `<p class="xs muted" style="margin-top:6px">To continue: add at least one image and confirm originality.</p>` : ''}`;
    } else if (step === 4) {
      if (!d.goal) d.goal = ip ? ip.minGoal : 300;
      const est = Math.round(d.goal * d.price * 0.62);
      body = `<h2>Who Is It For?</h2><p class="lead">Tell fans and the IP owner who this product is for, and set the demand goal that unlocks IP owner review.</p>
        <div class="aud-grid">
          <div class="fld"><label for="a-title">Proposal title*</label><input class="in" id="a-title" data-bind="title" value="${esc(d.title)}" placeholder="e.g. Hallownest Moon Hoodie" maxlength="60"><div class="ex">Short and specific: IP + motif + product.</div></div>
          <div class="fld"><label>Age rating</label><div class="seg">${['All ages', '13+', '18+'].map((v) => `<button class="${d.age === v ? 'on' : ''}" data-act="set" data-k="age" data-v="${v}">${v}</button>`).join('')}</div></div>
          <div class="fld"><label>Target fans</label><div class="chips">${['Collectors', 'Casual fans', 'Lore fans', 'Cosplayers', 'Gift buyers', 'Convention-goers'].map((v) => `<button class="chip ${d.fans.includes(v) ? 'on' : ''}" data-act="toggle" data-k="fans" data-v="${v}">${v}</button>`).join('')}</div></div>
          <div class="fld"><label>Regions</label><div class="chips">${['North America', 'Europe', 'East Asia', 'Global'].map((v) => `<button class="chip ${d.regions.includes(v) ? 'on' : ''}" data-act="toggle" data-k="regions" data-v="${v}">${v}</button>`).join('')}</div></div>
          <div class="fld"><label for="a-price">Suggested retail price · <span class="o">$${d.price}</span></label><input type="range" class="range" id="a-price" min="4" max="120" step="1" value="${d.price}" data-bind="price"><div class="ex" style="margin-left:0">Similar ${esc(d.type || 'products')} on iPly sell for $${Math.max(4, d.price - 8)}–$${d.price + 10}.</div></div>
          <div class="fld"><label>Validation goal (pre-order intents)</label><div class="seg">${[ip ? ip.minGoal : 150, 300, 500, 1000].filter((v, i, a) => a.indexOf(v) === i).map((v) => `<button class="${d.goal === v ? 'on' : ''}" data-act="set" data-k="goal" data-v="${v}" data-num="1">${v}</button>`).join('')}</div><div class="ex" style="margin-left:0">${ip ? ip.name + ' requires at least ' + ip.minGoal + '.' : ''}</div></div>
          <div class="fld"><label>Campaign length</label><div class="seg">${[14, 30, 45].map((v) => `<button class="${d.days === v ? 'on' : ''}" data-act="set" data-k="days" data-v="${v}" data-num="1">${v} days</button>`).join('')}</div></div>
          <div class="est">If you reach <b>${d.goal}</b> intents in ${d.days} days, your proposal goes to ${ip ? esc(ip.owner) : 'the IP owner'} for review.<br><span class="muted">Projected first-run revenue ≈ $${est.toLocaleString()} · your royalty ≈ $${Math.round(est * ((ip ? ip.royalty : 8) / 100)).toLocaleString()} (${ip ? ip.royalty : 8}%, demo estimate)</span></div>
        </div>`;
    } else {
      const r = d.pre;
      const row = (k, it) => `<div class="pc ${it.r}"><span class="ic">${I(it.r === 'pass' ? 'check' : it.r === 'run' ? 'spin' : it.r === 'warn' ? 'alert' : 'x')}</span><b>${k}</b><small>${esc(it.n)}</small></div>`;
      body = `<h2>Review &amp; Publish</h2><p class="lead">Check your proposal, pass the automatic pre-check, and publish it to the community for validation.</p>
        <div class="review"><div><div class="cov"><img src="${src(d.images[0]) || 'img/p-tee.webp'}" alt=""></div><p class="xs muted" style="margin-top:8px">${d.images.length} image${d.images.length === 1 ? '' : 's'} · cover shown</p></div>
        <div><dl class="kv">
          <dt>Title</dt><dd>${esc(d.title)}<button data-act="go" data-href="#/create/4">Edit</button></dd>
          <dt>IP</dt><dd>${esc(ip ? ip.name : '')}<button data-act="go" data-href="#/create/1">Edit</button></dd>
          <dt>Product</dt><dd>${esc(d.type)} · ${esc(d.format)}<button data-act="go" data-href="#/create/2">Edit</button></dd>
          <dt>Direction</dt><dd>${esc(d.dirs.join(', ') || '—')}</dd>
          <dt>Audience</dt><dd>${esc(d.fans.join(', '))} · ${d.age} · ${esc(d.regions.join(', '))}</dd>
          <dt>Price · Goal</dt><dd>$${d.price} · ${d.goal} intents in ${d.days} days<button data-act="go" data-href="#/create/4">Edit</button></dd>
        </dl>
        <h4>Risk &amp; Quality Pre-Check</h4>
        ${r ? `<div class="pc-list">${Object.entries(r).map(([k, it]) => row(k, it)).join('')}</div>` : `<div class="pc-list"><div class="pc run"><span class="ic">${I('spin')}</span><b>Starting pre-check…</b></div></div>`}
        <label class="check small" style="margin:10px 0"><input type="checkbox" data-bind="agree1" ${d.agree1 ? 'checked' : ''}> I agree to the iPly Creator Terms and the ${esc(ip ? ip.name : '')} creator guidelines.</label>
        <label class="check small"><input type="checkbox" data-bind="agree2" ${d.agree2 ? 'checked' : ''}> I understand the IP owner may request changes, and if licensed I earn ${ip ? ip.royalty : 8}% of net sales.</label>
        </div></div>`;
      if (!r) setTimeout(runPrecheck, 60);
    }
    return `<div class="wrap"><button class="back" data-act="go" data-href="#/proposals">${I('back')}Back</button>
      <div class="cp-head"><h1>Create Proposal</h1><p>Turn your fan merch idea into a licensing-ready concept.</p></div>${stepper}
      <section class="cp-card">${body}${step === 5 ? foot('Publish proposal') : foot()}</section></div>`;
  }
  function runPrecheck() {
    const d = S.draft; if (!d || d.pre) return;
    const ip = ipById(d.ip);
    const final = {
      'Copyright risk': d.dirs.includes('Meme-inspired') ? { r: 'warn', n: 'Meme formats may use third-party images — double-check sources.' } : { r: 'pass', n: 'No official logos or third-party artwork detected.' },
      'Image quality': d.images.length >= 2 ? { r: 'pass', n: `${d.images.length} images, cover looks sharp.` } : { r: 'warn', n: 'Only 1 image — a mockup or lifestyle shot lifts pick rate ~2×.' },
      'Production feasibility': { r: 'pass', n: `${d.type} at $${d.price} is within the typical cost range.` },
      'IP guideline match': ip.cats.includes(d.type) ? { r: 'pass', n: `“${d.type}” is open for ${ip.name}.` } : { r: 'fail', n: `“${d.type}” isn’t open for ${ip.name}.` }
    };
    d.pre = {}; Object.keys(final).forEach((k) => { d.pre[k] = { r: 'run', n: 'Checking…' }; });
    if (parse().parts[0] === 'create') render();
    Object.keys(final).forEach((k, i) => setTimeout(() => { if (!S.draft || S.draft !== d) return; d.pre[k] = final[k]; save(); if (parse().parts[0] === 'create' && parse().parts[1] === '5') render(); }, 500 + i * 450));
  }

  /* ------------------------------------------------------------------ pages: proposals */
  const PSTAT = [['all', 'All', 'grid', '#F1F1F1', '#666'], ['draft', 'Drafts', 'edit', '#F1F1F1', '#666'], ['precheck', 'Pre Check', 'file', '#FFF3C4', '#E0A800'], ['validating', 'Validating', 'users', '#FFF3C4', '#E0A800'], ['review', 'Under Review', 'clock', '#FFE9E1', '#E95B3A'], ['rejected', 'Rejected', 'broken', '#FDECEC', '#E5484D'], ['authorized', 'Authorized', 'shield', '#E8F6E9', '#2E8B3A'], ['launched', 'Launched', 'box', '#E8F6E9', '#2E8B3A']];
  function track(p) { const col = { validating: 'y', precheck: 'b', review: 'o', authorized: 'g', launched: 'g', rejected: 'r', draft: 'k' }[p.status]; return `<div class="track ${col}" aria-label="Stage ${p.stage + 1} of 8">${Array.from({ length: 8 }, (_, i) => `<i class="${i <= p.stage ? 'f' : ''}"></i>`).join('')}</div>`; }
  function actionFor(p) {
    return ({ validating: ['Share', 'share'], precheck: ['View Pre-check', 'open'], review: ['View Feedback', 'feedback'], rejected: ['View Feedback', 'feedback'], authorized: ['View License', 'license'], launched: ['View Product', 'product'], draft: ['Continue Editing', 'continue'] })[p.status];
  }
  function pProposals(q) {
    const f = q.get('status') || 'all';
    const list = S.proposals.filter((p) => f === 'all' || p.status === f);
    const count = (k) => (k === 'all' ? S.proposals.length : S.proposals.filter((p) => p.status === k).length);
    return `<div class="wrap">
      <div class="mp-head"><div><h1>My Proposals</h1><p>Track your ideas, community support, and licensing progress in one place.</p></div><button class="btn btn-primary" data-act="new-proposal">Create New Proposal</button></div>
      <h4 style="font-family:var(--body);font-size:13px">Overview</h4>
      <div class="ov">${PSTAT.map(([k, l, ic, bg, fg]) => `<a class="ovc ${f === k ? 'on' : ''}" href="#/proposals?status=${k}"><span class="ib" style="background:${bg};color:${fg}">${I(ic)}</span><b>${count(k)}</b><small>${l}</small></a>`).join('')}</div>
      <h4 style="font-family:var(--body);font-size:13px;margin-bottom:12px">Filter by Status</h4>
      <div class="chips" style="margin-bottom:22px">${PSTAT.map(([k, l]) => `<a class="chip round ${f === k ? 'on' : ''}" style="display:inline-flex;align-items:center" href="#/proposals?status=${k}">${l}</a>`).join('')}</div>
      <div class="plist">${list.length ? list.map((p) => { const ip = ipById(p.ip); const [al, aa] = actionFor(p); const pub = idea(p.id); return `<div class="prow">
        <a class="im" href="#/proposal/${p.id}"><img src="${src(p.img)}" alt="" loading="lazy"></a>
        <div><h3><a href="#/proposal/${p.id}">${esc(p.title)}</a>${pub ? `<a href="#/idea/${p.id}" title="Open public idea page" aria-label="Open public idea page">${I('ext')}</a>` : ''}</h3>
          <div class="kvs"><div><b>IP:</b> ${esc(ip.name)}</div><div><b>Category:</b> ${esc(p.cat)}</div></div>
          <div class="nums"><span title="Comments">${I('comment')}${p.c + ((S.comments[p.id] || []).length)}</span><span title="Picks">${I('like')}${p.v + (S.votes[p.id] ? 1 : 0)}</span><span title="Pre-order intents">${I('pre')}${p.p}${p.status === 'validating' ? `<small class="muted">/${p.goal}</small>` : ''}</span></div>
          <div class="upd"><b>Last updated:</b> ${p.updated}</div></div>
        <div class="r">${stTag(p.status)}<span class="lbl">Process</span>${track(p)}<button class="btn btn-line btn-sm" style="border-width:1px;border-color:#ccc" data-act="p-${aa}" data-id="${p.id}">${al}</button></div>
      </div>`; }).join('') : `<div class="empty"><h3>No proposals here yet</h3><p>${f === 'rejected' ? 'Nothing rejected — nice.' : 'Start one in under five minutes.'}</p><button class="btn btn-primary" data-act="new-proposal">Create New Proposal</button></div>`}</div>
    </div>`;
  }
  function pProposal(id) {
    const p = prop(id);
    if (!p) return `<div class="wrap empty"><h3>Proposal not found</h3><a class="btn btn-primary" href="#/proposals">My Proposals</a></div>`;
    const ip = ipById(p.ip);
    const steps = [['Draft', 'Idea saved'], ['Pre-check', 'Copyright, quality, feasibility, IP fit'], ['Validating', `Fans pick, comment and pre-order (goal ${p.goal})`], ['Goal reached', 'Unlocks IP owner review'], ['Under review', `${ip.owner} checks brand fit and feasibility`], ['Authorized', 'License terms signed'], ['In production', 'Pilot run with the licensed manufacturer'], ['Launched', 'Sold as official merch · royalties paid monthly']];
    const [al, aa] = actionFor(p);
    return `<div class="wrap"><button class="back" data-act="go" data-href="#/proposals">${I('back')}My Proposals</button>
      <div class="pd" style="margin-top:14px">
        <div><div class="cov"><img src="${src(p.img)}" alt=""></div>
          <div class="stats3"><div><b>${p.c}</b><small>Comments</small></div><div><b>${p.v}</b><small>Picks</small></div><div><b>${p.p}</b><small>of ${p.goal} intents</small></div></div>
          <div style="display:grid;gap:10px"><button class="btn btn-primary" data-act="p-${aa}" data-id="${p.id}">${al}</button>${idea(p.id) ? `<a class="btn btn-line" href="#/idea/${p.id}">Open public page</a>` : ''}</div></div>
        <div>
          ${stTag(p.status)}<h1 style="font-size:30px;margin:10px 0 6px">${esc(p.title)}</h1><p class="muted">${esc(ip.name)} · ${esc(p.cat)} · Last updated ${p.updated}</p>
          ${(p.feedback || []).map((f) => `<div class="fb"><small>${esc(f.from)} · ${f.date}</small>${esc(f.text)}</div>`).join('')}
          ${p.status === 'rejected' ? `<button class="btn btn-primary btn-sm" data-act="resubmit" data-id="${p.id}" style="margin-bottom:22px">Revise &amp; resubmit</button>` : ''}
          ${p.precheck ? `<h4 style="margin:18px 0 6px">Pre-check</h4><div class="pc-list">${p.precheck.map((c) => `<div class="pc ${c.r === 'running' ? 'run' : c.r}"><span class="ic">${I(c.r === 'pass' ? 'check' : 'spin')}</span><b>${c.k}</b><small>${esc(c.n)}</small></div>`).join('')}</div>` : ''}
          ${p.license ? `<h4 style="margin:18px 0 10px">License</h4><div class="lic">${Object.entries(p.license).map(([k, v]) => `<div class="panel" style="padding:14px"><small class="muted" style="text-transform:capitalize">${k}</small><div style="font-weight:600">${esc(v)}</div></div>`).join('')}</div>` : ''}
          <h4 style="margin:26px 0 14px">Progress</h4>
          <ol class="timeline">${steps.map(([h, s], i) => `<li class="${i < p.stage || (i === p.stage && (p.status === 'launched')) ? 'done' : i === p.stage ? (p.status === 'rejected' ? 'bad' : 'cur') : ''}"><span class="d">${i < p.stage || p.status === 'launched' ? '✓' : i === p.stage && p.status === 'rejected' ? '×' : i + 1}</span><div><b>${i === p.stage && p.status === 'rejected' ? 'Not approved' : h}</b><p>${s}</p></div></li>`).join('')}</ol>
        </div></div></div>`;
  }

  /* ------------------------------------------------------------------ pages: open ip */
  function pOpenIP(q) {
    const t = q.get('type') || '';
    const list = D.IPS.filter((x) => !t || x.type === t);
    return `<div class="peach" style="padding-bottom:20px"><div class="wrap">
      <div class="ip-hero"><div><span class="pill">Open IP Programs</span><h1 style="margin-top:12px">IPs looking for creators’ ideas</h1><p class="muted">These IP owners are currently accepting proposals. Each program lists what’s open, the royalty, and the demand goal.</p></div>
        <div class="chips">${['', 'Games', 'Indie Games', 'Animation', 'TV Series'].map((v) => `<a class="chip round ${t === v ? 'on' : ''}" style="display:inline-flex;align-items:center" href="#/open-ip${v ? '?type=' + encodeURIComponent(v) : ''}">${v || 'All'}</a>`).join('')}</div></div>
      <div class="ipg">${list.map((ip) => `<a class="ipcard" href="#/open-ip/${ip.id}"><img src="${ip.cover}" alt="" loading="lazy"><div class="b"><h4>${ip.name}</h4><span class="tag">${ip.type}</span>${ip.open === 'Closed' ? ' <span class="status s-rejected">Closed</span>' : ''}<div class="meta"><span>${ip.open === 'Closed' ? 'Not accepting proposals' : 'Open until ' + ip.open}</span><span>${ip.royalty}% royalty</span></div><span class="small o" style="display:block;margin-top:10px">View more details +</span></div></a>`).join('')}</div>
    </div></div>`;
  }
  function pIP(id) {
    const ip = ipById(id);
    const ideas = allIdeas().filter((x) => x.ip === id);
    const closed = ip.open === 'Closed';
    return `<div class="wrap"><button class="back" data-act="go" data-href="#/open-ip">${I('back')}Open IP</button>
      <div class="ipd"><div class="cov"><img src="${ip.cover}" alt=""></div>
      <div><span class="tag">${ip.type}</span> ${closed ? '<span class="status s-rejected">Closed</span>' : '<span class="status s-launched">Accepting proposals</span>'}
        <h1 style="font-size:36px;margin:12px 0 6px">${ip.name}</h1><p class="muted">Program run by ${esc(ip.owner)} · ${closed ? 'Closed' : 'Open until ' + ip.open} · ${ip.proposals} proposals</p>
        <div class="stats3"><div><b>${ip.royalty}%</b><small>Creator royalty</small></div><div><b>${ip.minGoal}</b><small>Min. validation goal</small></div><div><b>${ip.cats.length}</b><small>Open categories</small></div></div>
        <h4 style="margin-bottom:10px">Open categories</h4><div class="chips">${ip.cats.map((c) => `<span class="chip" style="display:inline-flex;align-items:center">${c}</span>`).join('')}</div>
        <div class="gl"><div class="panel"><h4 style="margin-bottom:10px">Tone &amp; style</h4><p class="small" style="margin:0 0 10px">${esc(ip.tone)}</p></div><div class="panel"><h4 style="margin-bottom:10px">Please avoid</h4><ul>${ip.dont.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
        ${closed ? `<button class="btn btn-grey" data-act="toast" data-msg="We’ll email you when ${esc(ip.name)} reopens.">Notify me when it reopens</button>` : `<button class="btn btn-primary" data-act="start-ip" data-ip="${ip.id}">Start a proposal for ${ip.name}</button>`}
      </div></div>
      ${ideas.length ? `<div class="row-h"><h2>Ideas for ${ip.name}</h2><a href="#/ideas?ip=${ip.id}">View All ${I('next', 'style="width:16px;height:16px"')}</a></div><div class="grid4">${ideas.slice(0, 8).map((x) => card(x)).join('')}</div>` : `<div class="empty"><h3>No ideas yet</h3><p>Be the first creator to propose merch for ${ip.name}.</p></div>`}
    </div>`;
  }

  /* ------------------------------------------------------------------ pages: activity */
  const NICON = { review: ['clock', '#FFE9E1', '#E95B3A'], milestone: ['trend', '#FFF3C4', '#C99A00'], comment: ['comment', '#EEF1FF', '#4D5BD6'], precheck: ['file', '#EEF1FF', '#4D5BD6'], license: ['shield', '#E8F6E9', '#2E8B3A'], rejected: ['broken', '#FDECEC', '#E5484D'], sale: ['box', '#E8F6E9', '#2E8B3A'], published: ['sparkle', '#FFE9E1', '#E95B3A'] };
  function pActivity(q) {
    const t = q.get('tab') || 'all';
    const groups = { all: null, comments: ['comment'], milestones: ['milestone', 'sale', 'published'], reviews: ['review', 'license', 'rejected', 'precheck'] };
    const list = allNotifs().filter((n) => !groups[t] || groups[t].includes(n.type));
    return `<div class="wrap"><div class="mp-head"><div><h1>Activity</h1><p>Comments, demand milestones and review decisions on your proposals.</p></div><button class="btn btn-line btn-sm" data-act="read-all">Mark all as read</button></div>
      <div class="tabs" role="tablist">${[['all', 'All'], ['comments', 'Comments'], ['milestones', 'Milestones'], ['reviews', 'Reviews']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? 'on' : ''}" data-act="go" data-href="#/activity?tab=${k}">${l}</button>`).join('')}</div>
      <div class="feed">${list.length ? list.map(fItem).join('') : '<div class="empty">Nothing here yet.</div>'}</div></div>`;
  }
  function fItem(n) { const [ic, bg, fg] = NICON[n.type] || NICON.comment; return `<a class="fi" href="${n.link}" data-act="read" data-id="${n.id}"><span class="ib" style="background:${bg};color:${fg}">${I(ic)}</span><span class="tx">${esc(n.t)}<small>${n.d}</small></span>${n.unread && !S.read[n.id] ? '<span class="unread" aria-label="unread"></span>' : ''}</a>`; }

  /* ------------------------------------------------------------------ pages: authorize */
  function pAuthorize(q) {
    const t = q.get('tab') || 'licenses';
    let body;
    if (t === 'queue') {
      body = `<div class="role-banner">${I('shield')}<span><b>IP owner portal (preview).</b> This is what a verified IP owner sees: proposals that reached their demand goal, ranked by fit.</span></div>
        <div class="feed">${D.QUEUE.map((qi) => { const x = idea(qi.id); const done = S.queue[qi.id]; const ip = ipById(x.ip); return `<div class="qrow"><img src="${src(x.img)}" alt=""><div><h4>${esc(x.title)}</h4><p class="small muted" style="margin:4px 0">${esc(creator(qi.creator).name)} · ${esc(ip.name)} · ${esc(x.cat)}</p><p class="xs muted" style="margin:0">${esc(qi.note)}</p></div>
          <div><small class="muted">Demand</small><div style="font-weight:700">${pres(x)} / ${x.goal}</div><div class="meter"><i style="width:${pct(pres(x), x.goal)}%"></i></div></div>
          <div><small class="muted">Brand fit · Risk</small><div style="font-weight:700">${qi.fit}/100 · ${qi.risk}</div><div class="meter"><i style="width:${qi.fit}%;background:var(--primary)"></i></div></div>
          <div class="acts">${done ? `<span class="status ${done === 'approved' ? 's-authorized' : done === 'declined' ? 's-rejected' : 's-review'}" style="justify-self:start">${done === 'approved' ? 'Approved' : done === 'declined' ? 'Declined' : 'Revision requested'}</span><button class="link small" data-act="q-undo" data-id="${qi.id}" style="justify-self:start">Undo</button>` : `<button class="btn btn-primary btn-xs" data-act="q-decide" data-v="approved" data-id="${qi.id}">Approve &amp; license</button><button class="btn btn-line btn-xs" style="border-width:1px" data-act="q-decide" data-v="revision" data-id="${qi.id}">Request revision</button><button class="btn btn-grey btn-xs" data-act="q-decide" data-v="declined" data-id="${qi.id}">Decline</button>`}</div></div>`; }).join('')}</div>`;
    } else {
      const lic = S.proposals.filter((p) => p.license);
      const waiting = S.proposals.filter((p) => p.status === 'review');
      body = `<h3 style="margin:6px 0 14px">Active licenses</h3>${lic.length ? `<div class="feed">${lic.map((p) => `<a class="fi" href="#/proposal/${p.id}"><img src="${src(p.img)}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover"><span class="tx"><b>${esc(p.title)}</b><small>${esc(ipById(p.ip).name)} · ${esc(p.license.royalty)} · ${esc(p.license.term)} · ${esc(p.license.territory)}</small></span>${stTag(p.status)}</a>`).join('')}</div>` : '<div class="empty">No licenses yet.</div>'}
        <h3 style="margin:30px 0 14px">Awaiting IP owner decision</h3>${waiting.length ? `<div class="feed">${waiting.map((p) => `<a class="fi" href="#/proposal/${p.id}"><img src="${src(p.img)}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover"><span class="tx"><b>${esc(p.title)}</b><small>${esc(ipById(p.ip).name)} · ${p.p}/${p.goal} intents · submitted ${p.updated}</small></span>${stTag(p.status)}</a>`).join('')}</div>` : '<div class="empty">Nothing waiting.</div>'}`;
    }
    return `<div class="wrap"><div class="mp-head"><div><h1>Authorize</h1><p>Licensing status for creators — and a preview of the IP owner review portal.</p></div></div>
      <div class="tabs" role="tablist"><button role="tab" class="${t === 'licenses' ? 'on' : ''}" aria-selected="${t === 'licenses'}" data-act="go" data-href="#/authorize">My licenses</button><button role="tab" class="${t === 'queue' ? 'on' : ''}" aria-selected="${t === 'queue'}" data-act="go" data-href="#/authorize?tab=queue">Review queue · IP owner view</button></div>${body}</div>`;
  }

  /* ------------------------------------------------------------------ pages: saved / contact / guidelines */
  function pSaved() {
    const list = allIdeas().filter((x) => S.votes[x.id]);
    return `<div class="peach" style="min-height:70vh;padding-bottom:20px"><div class="wrap"><div class="mp-head"><div><h1>Picked ideas</h1><p>Ideas you picked. Picks count as votes for the creator.</p></div><a class="btn btn-line btn-sm" href="#/ideas">Browse Ideas</a></div>
      ${list.length ? `<div class="grid4">${list.map((x) => card(x)).join('')}</div>` : `<div class="empty">${I('like', 'style="width:40px;height:40px;margin:0 auto 12px;color:#E95B3A"')}<h3>No picks yet</h3><p>Tap the thumbs-up on any idea to support it.</p></div>`}</div></div>`;
  }
  function pContact() {
    return `<div class="wrap" style="max-width:760px"><div class="mp-head"><div><h1>Contact Us</h1><p>Questions about proposals, licensing, or partnering as an IP owner? We reply within 2 business days.</p></div></div>
      <form class="cp-card" data-form="contact" novalidate>
        <div class="aud-grid"><div class="fld"><label for="c-n">Name</label><input class="in" id="c-n" name="n" value="${S.logged ? esc(S.user.name) : ''}" required></div><div class="fld"><label for="c-e">Email</label><input class="in" id="c-e" name="e" type="email" required></div></div>
        <div class="fld"><label>I am a…</label><div class="seg">${['Creator', 'Fan', 'IP owner', 'Press'].map((v, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-act="seg">${v}</button>`).join('')}</div></div>
        <div class="fld"><label for="c-m">Message</label><textarea id="c-m" name="m" style="height:140px" required></textarea></div>
        <button class="btn btn-primary">Send message</button></form></div>`;
  }
  function pGuidelines() {
    const sec = (id, h, body) => `<section id="${id}" class="panel" style="margin-bottom:20px;scroll-margin-top:96px"><h3>${h}</h3>${body}</section>`;
    return `<div class="wrap" style="max-width:900px"><div class="mp-head"><div><h1>Creator &amp; IP Guidelines</h1><p>Everything you need before you submit — and what IP owners agree to.</p></div><a class="btn btn-primary btn-sm" href="#/create/1">Start a proposal</a></div>
      ${sec('submission', 'Submission Guidelines', '<ul><li>One product per proposal. Collections can be grouped later as a campaign.</li><li>Show at least one clear visual; mockups and lifestyle shots perform ~2× better.</li><li>Pick an IP program that is open and a category that program accepts.</li><li>Your proposal passes an automatic pre-check before it goes public.</li></ul>')}
      ${sec('tips', 'Proposal Tips', '<ul><li>Lead with a specific moment or motif fans recognise, not the logo.</li><li>Write the title as IP + motif + product.</li><li>Answer comments early — active creators reach goal 40% faster (demo figure).</li></ul>')}
      ${sec('copyright', 'Copyright Risk Guide', '<ul><li>Never trace official art or use screenshots as artwork.</li><li>Mark reference images as references.</li><li>Official logos are reserved for the IP owner’s final packaging.</li></ul>')}
      ${sec('categories', 'Product Categories', `<div class="chips">${D.PRODUCT_TYPES.map((t) => `<span class="chip" style="display:inline-flex;align-items:center">${t.n}</span>`).join('')}</div><p class="small muted">Each IP chooses which categories it opens. See <a class="link" href="#/open-ip">Open IP</a>.</p>`)}
      ${sec('brand', 'Brand Guidelines (for IP owners)', '<ul><li>Set tone, do’s and don’ts per IP — creators see them before submitting.</li><li>Choose open categories, royalty and the minimum validation goal.</li><li>Approve, request a revision, or decline — every decision includes written feedback.</li></ul>')}
      ${sec('faq', 'Licensing FAQ', '<p class="small"><b>When am I charged for a pre-order?</b> Only after the IP owner approves and production starts.<br><br><b>Who owns the design?</b> You keep your original artwork; the IP owner licenses the product for a set term and territory.<br><br><b>How are royalties paid?</b> Monthly, as a % of net sales set by each IP program.</p>')}
      ${sec('legal', 'Terms, Privacy &amp; IP Policy', '<p class="small muted">This is a student concept prototype. IP names and logos are illustrative only; there is no affiliation with the rights holders. No real accounts, payments or personal data are collected — everything stays in your browser.</p>')}
    </div>`;
  }

  /* ------------------------------------------------------------------ overlays */
  function modal(html, cls = '') {
    closeModal();
    const el = document.createElement('div');
    el.className = 'scrim'; el.id = 'scrim';
    el.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true"><button class="x" data-act="close" aria-label="Close">${I('x')}</button>${html}</div>`;
    document.body.appendChild(el);
    const f = el.querySelector('input,textarea,button:not(.x)'); if (f) f.focus();
  }
  function closeModal() { const m = $('#scrim'); if (m) m.remove(); const d = $('#drawer'); if (d) d.remove(); }
  function toast(msg) {
    let w = $('#toasts'); if (!w) { w = document.createElement('div'); w.id = 'toasts'; w.className = 'toasts'; w.setAttribute('role', 'status'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = I('check') + esc(msg); w.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function closePop() { const p = $('#pop'); if (p) p.remove(); const g = $('#guide'); if (g && g.dataset.keep !== '1') g.remove(); }
  function pop(kind, btn) {
    const ex = $('#pop'); if (ex && ex.dataset.k === kind) { ex.remove(); return; }
    closePop();
    const el = document.createElement('div'); el.className = 'pop'; el.id = 'pop'; el.dataset.k = kind;
    if (kind === 'notifs') {
      el.innerHTML = `<h4>Notifications <button class="small o" data-act="read-all">Mark all read</button></h4>${allNotifs().slice(0, 5).map((n) => `<a class="pop-item" href="${n.link}" data-act="read" data-id="${n.id}"><span class="dot ${n.unread && !S.read[n.id] ? '' : 'read'}"></span><span><span class="small">${esc(n.t)}</span><br><span class="xs muted">${n.d}</span></span></a>`).join('')}<a class="pop-foot" href="#/activity">See all activity</a>`;
    } else if (kind === 'msgs') {
      el.innerHTML = `<h4>Messages</h4>${[['IP review team', 'img/av-c2.webp', 'Quick question about the hood seam placement…', 'review'], ['Nova Land', 'img/av-nova.webp', 'Love your pin! Want to co-create a set?', 'nova']].map(([n, a, t, id]) => `<button class="pop-item" style="width:100%;text-align:left" data-act="thread" data-id="${id}"><img src="${a}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover"><span><b class="small">${n}</b><br><span class="xs muted">${t}</span></span></button>`).join('')}`;
    } else if (kind === 'saved') {
      const l = allIdeas().filter((x) => S.votes[x.id]);
      el.innerHTML = `<h4>Picked ideas</h4>${l.length ? l.slice(0, 4).map((x) => `<a class="pop-item" href="#/idea/${x.id}"><img src="${src(x.thumb || x.img)}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover"><span><b class="small">${esc(x.title)}</b><br><span class="xs muted">${votes(x)} picks · ${STATUS[x.status]}</span></span></a>`).join('') : '<p class="small muted" style="padding:0 12px">No picks yet — tap 👍 on any idea.</p>'}<a class="pop-foot" href="#/saved">View all picks</a>`;
    } else if (kind === 'me') {
      el.style.width = '260px';
      el.innerHTML = `<div style="display:flex;gap:12px;align-items:center;padding:10px 12px"><img class="avatar" src="img/av-user.webp" alt=""><div><b>${esc(S.user.name)}</b><div class="xs muted">Creator · ${S.user.fandoms.slice(0, 2).map(esc).join(', ')}</div></div></div>
        <div class="menu"><hr><a href="#/proposals">${I('grid')}My Proposals</a><a href="#/saved">${I('like')}Picked ideas</a><a href="#/authorize?tab=queue">${I('shield')}IP owner view</a><a href="#/guidelines">${I('file')}Guidelines</a><hr><button data-act="logout">${I('logout')}Log out</button></div>`;
    }
    $('.hdr').appendChild(el);
  }
  function cartDrawer() {
    closeModal();
    const el = document.createElement('div'); el.id = 'drawer';
    const items = S.cart.map((c) => ({ c, x: idea(c.id) })).filter((o) => o.x);
    const pre = Object.entries(S.pre).map(([id, o]) => ({ o, x: idea(id) })).filter((o) => o.x);
    const total = items.reduce((s, { c, x }) => s + c.qty * x.price[0], 0);
    el.innerHTML = `<div class="scrim" data-act="close" style="display:block"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Cart"><div class="dh"><h3 style="font-size:20px">Your bag</h3><button class="ic-btn" data-act="close" aria-label="Close">${I('x')}</button></div>
      <div class="db"><h4 style="margin:10px 0 0;font-size:13px">Licensed products</h4>${items.length ? items.map(({ c, x }) => `<div class="ci"><img src="${src(x.img)}" alt=""><div><b>${esc(x.title)}</b><small>${esc(c.opt || '')}</small><div class="qty"><button data-act="qty" data-id="${x.id}" data-d="-1" aria-label="Decrease">−</button>${c.qty}<button data-act="qty" data-id="${x.id}" data-d="1" aria-label="Increase">+</button></div></div><b>$${(c.qty * x.price[0]).toFixed(2)}</b></div>`).join('') : '<p class="small muted">Only launched (officially licensed) products can be bought.</p>'}
        <h4 style="margin:24px 0 0;font-size:13px">Pre-order intents <span class="muted" style="font-weight:400">· no charge yet</span></h4>${pre.length ? pre.map(({ o, x }) => `<div class="ci"><img src="${src(x.img)}" alt=""><div><b>${esc(x.title)}</b><small>${esc(o.opt || '')} · ${STATUS[x.status]}</small><small>${pres(x)}/${x.goal} intents</small></div><button class="link xs" data-act="un-pre" data-id="${x.id}">Cancel</button></div>`).join('') : '<p class="small muted">Back an idea in validation to see it here.</p>'}</div>
      <div class="df"><div style="display:flex;justify-content:space-between;margin-bottom:14px"><span>Subtotal</span><b>$${total.toFixed(2)}</b></div><button class="btn btn-primary btn-block ${items.length ? '' : 'is-disabled'}" data-act="checkout">Checkout</button></div></aside>`;
    el.firstElementChild.style.cssText = 'position:fixed;inset:0;background:rgba(17,20,27,.45);z-index:80';
    document.body.appendChild(el);
  }
  function guidePanel() {
    const g = $('#guide'); if (g) { g.remove(); return; }
    const el = document.createElement('div'); el.className = 'guide'; el.id = 'guide'; el.dataset.keep = '1';
    const flows = [['#/signup', 'Sign up as a creator (3 steps)'], ['#/ideas', 'Browse Ideas, pick & search'], ['#/idea/extra-thick-hoodie', 'Back an idea: colour, pre-order, comment'], ['#/create/1', 'Create a proposal (5 steps + pre-check)'], ['#/proposals', 'Track proposals & feedback'], ['#/authorize?tab=queue', 'IP owner: approve a proposal'], ['#/owners', 'IP owner landing page']];
    el.innerHTML = `<h4>IPLY · clickable prototype</h4><p>Built from the Figma hi-fi. Everything below is clickable; data stays in this browser.</p>${flows.map(([h, t], i) => `<a href="${h}" data-act="guide-go" data-href="${h}"><span>${i + 1}</span>${t}</a>`).join('')}
      <div class="ft"><button data-act="whatsnew">What’s added vs. Figma</button><button data-act="reset">Reset demo</button></div>`;
    document.body.appendChild(el);
  }

  /* ------------------------------------------------------------------ actions */
  function requireLogin(next) {
    if (S.logged) return true;
    modal(`<h3>Join iPly to continue</h3><p class="muted">Create a free account to pick ideas, comment, pre-order and submit proposals.</p><div class="acts"><button class="btn btn-line btn-sm" data-act="demo-login" data-next="${esc(next || '')}">Use demo account</button><a class="btn btn-primary btn-sm" href="#/signup">Sign up</a></div>`);
    return false;
  }
  const A = {
    go: (el) => go(el.dataset.href.replace(/^#/, '')),
    back: () => (history.length > 1 ? history.back() : go('/ideas')),
    burger: () => $('#nav').classList.toggle('open'),
    close: () => closeModal(),
    toast: (el) => toast(el.dataset.msg),
    pop: (el) => { if (!S.logged) return requireLogin(); pop(el.dataset.pop, el); },
    cart: () => (S.logged ? cartDrawer() : requireLogin()),
    guide: () => guidePanel(),
    'guide-go': () => { const g = $('#guide'); if (g) g.remove(); },
    reset: () => { if (!confirm('Reset all demo data (picks, comments, proposals)?')) return; localStorage.removeItem(KEY); S = fresh(); detailState = {}; $('#guide') && $('#guide').remove(); go('/'); render(); toast('Demo reset'); },
    whatsnew: () => { $('#guide') && $('#guide').remove(); modal(`<h3>Added beyond the Figma file</h3><p class="small muted">Gaps found while building — filled so every click leads somewhere.</p><ul class="small" style="padding-left:18px;line-height:1.7">
      <li><b>Create Proposal steps 4 &amp; 5</b> (Audience, Publish) — only steps 1–3 existed.</li>
      <li><b>Risk &amp; Quality Pre-Check UI</b> — a core feature with no screen.</li>
      <li><b>Validation progress</b> on cards and detail page (intents / goal / days left, “no charge until approved”).</li>
      <li><b>IP owner review queue</b> (Authorize) — approve / request revision / decline closes the loop back to the creator.</li>
      <li><b>Open IP</b>, <b>Activity</b>, cart / pre-order bag, notifications, messages, login, guidelines pages.</li>
      <li><b>Proposal detail</b> with 8-step timeline, feedback, license terms; rejected state with “Revise &amp; resubmit”.</li>
      <li><b>Data fixes</b>: overview counts now match the list (17 vs 7 in Figma); hoodie mislabelled as Stranger Things; identical 96/312/312 stats; socks priced like a hoodie; duplicate “Genshin Impact” chip.</li>
      <li><b>Copy fixes</b>: Lorem ipsum on the creator landing page; “164+ Members” ×3 replaced with research stats; real certification logos replaced with neutral trust badges.</li>
      <li>Product types not open for the chosen IP are disabled (IP matching); closed IP programs can’t be selected.</li>
      <li>Under-18 path on onboarding; empty states; keyboard focus; responsive layout down to phone width.</li></ul>`); },
    logout: () => { S.logged = false; save(); go('/'); toast('Logged out'); },
    'demo-login': (el) => { S.logged = true; save(); closeModal(); toast('Logged in as Luna Nash (demo)'); el.dataset.next ? go(el.dataset.next) : render(); },
    'owner-join': () => modal(`<h3>Join as an IP Owner</h3><p class="muted small">Step 1 of 3 · we verify ownership within 1 business day.</p><form data-form="owner" novalidate><div class="fld"><label for="o-co">Company / studio</label><input class="in" id="o-co" name="co" required placeholder="e.g. Pixel Grove Studio"></div><div class="fld"><label for="o-ip">IP name</label><input class="in" id="o-ip" name="ip" required placeholder="e.g. Whisperwood"></div><div class="fld"><label for="o-em">Work email</label><input class="in" id="o-em" name="em" type="email" required></div><div class="fld"><label>Ownership proof</label><label class="radio"><input type="checkbox" name="proof"> I can provide trademark or license documents</label></div><div class="acts"><button type="button" class="btn btn-grey btn-sm" data-act="close">Cancel</button><button class="btn btn-primary btn-sm">Submit for verification</button></div></form>`),
    'owner-req': () => modal(`<h3>Requirements for IP owners</h3><ul class="small" style="padding-left:18px;line-height:1.8"><li>Proof of ownership or exclusive licensing rights (trademark registration or license agreement).</li><li>A brand guideline document or a short do / don’t list.</li><li>Which product categories you want to open, and a royalty rate (typically 6–12%).</li><li>A named reviewer who can approve proposals within 10 business days.</li></ul><div class="acts"><button class="btn btn-primary btn-sm" data-act="owner-join">Join as an IP Owner</button></div>`),
    trust: (el) => modal(`<h3>${esc(el.dataset.h)}</h3><p class="small">Every proposal passes an automatic pre-check (copyright risk, image quality, production feasibility, IP guideline match). Only proposals that reach their demand goal enter your queue, and nothing is produced without your written approval and signed license terms.</p>`),
    pw: (el) => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'Show' : 'Hide'; },
    google: () => { S.user.email = 'luna.nash@gmail.com'; save(); go('/signup/2'); toast('Connected with Google (demo)'); },
    'google-login': () => { S.logged = true; save(); go('/ideas'); toast('Welcome back, Luna'); },
    'auth-back': () => { const r = parse(); const n = +r.parts[1] || 1; if (r.parts[0] === 'signup' && n > 1) go('/signup/' + (n - 1)); else go('/'); },
    age: (el) => { S.user.age = el.dataset.v; save(); render(); },
    fandom: (el) => { const v = el.dataset.v, f = S.user.fandoms; const i = f.indexOf(v); i >= 0 ? f.splice(i, 1) : f.push(v); save(); render(); },
    'signup-done': () => { S.logged = true; save(); const next = sessionStorage.getItem('iply-next'); sessionStorage.removeItem('iply-next'); go(next === 'create' ? '/create/1' : '/ideas'); toast(`Welcome to iPly, ${S.user.name.split(' ')[0]}!`); },
    vote: (el) => { if (!requireLogin()) return; const id = el.dataset.id; S.votes[id] ? delete S.votes[id] : (S.votes[id] = 1); save(); render(); toast(S.votes[id] ? 'Picked! The creator sees your support.' : 'Pick removed'); },
    preorder: (el) => {
      if (!requireLogin()) return; const id = el.dataset.id, x = idea(id);
      if (S.pre[id]) { delete S.pre[id]; save(); render(); return toast('Pre-order intent cancelled'); }
      const ds = detailState[id] || {}; const opt = [x.variants ? x.variants[ds.v || 0].c : '', isApparel(x.cat) ? 'Size ' + (ds.size || 'S') : ''].filter(Boolean).join(' · ');
      modal(`<h3>Join the pre-order</h3><p class="small muted">${esc(x.title)}${opt ? ' · ' + esc(opt) : ''}</p><div class="valbox"><div class="top"><b>${pres(x) + 1} / ${x.goal} after you</b><span>${x.daysLeft} days left</span></div><div class="bar"><i style="width:${pct(pres(x) + 1, x.goal)}%"></i></div></div><ul class="small" style="padding-left:18px;line-height:1.7;margin-top:16px"><li><b>No charge now.</b> You pay ${money([x.price[0]])} only if the IP owner approves and production starts.</li><li>You can cancel any time before production.</li><li>We’ll email you at each step: goal reached → approved → shipping.</li></ul><div class="acts"><button class="btn btn-grey btn-sm" data-act="close">Not now</button><button class="btn btn-primary btn-sm" data-act="pre-confirm" data-id="${id}" data-opt="${esc(opt)}">Confirm pre-order intent</button></div>`);
    },
    'pre-confirm': (el) => { const id = el.dataset.id, x = idea(id); S.pre[id] = { opt: el.dataset.opt }; if (pres(x) === x.goal) notify('milestone', `${x.title} reached its goal of ${x.goal}!`, '#/idea/' + id); save(); closeModal(); render(); toast('You’re in! No charge until it’s approved.'); },
    'un-pre': (el) => { delete S.pre[el.dataset.id]; save(); cartDrawer(); render(); },
    'notify-me': (el) => { if (!requireLogin()) return; const id = el.dataset.id; S.pre[id] = S.pre[id] || { opt: 'Notify at launch' }; save(); render(); toast('We’ll let you know when it launches.'); },
    'add-cart': (el) => { if (!requireLogin()) return; const id = el.dataset.id, x = idea(id), ds = detailState[id] || {}; const opt = [x.variants ? x.variants[ds.v || 0].c : '', isApparel(x.cat) ? 'Size ' + (ds.size || 'S') : ''].filter(Boolean).join(' · '); const c = S.cart.find((c) => c.id === id && c.opt === opt); c ? c.qty++ : S.cart.push({ id, qty: 1, opt }); save(); render(); cartDrawer(); },
    qty: (el) => { const c = S.cart.find((c) => c.id === el.dataset.id); if (!c) return; c.qty += +el.dataset.d; if (c.qty <= 0) S.cart.splice(S.cart.indexOf(c), 1); save(); cartDrawer(); render(); cartDrawer(); },
    checkout: () => { closeModal(); modal(`<h3>Order placed (demo)</h3><p class="small">In the real product this goes to a licensed checkout. ${(S.cart.length)} item(s) — the creator earns a royalty on each one.</p><div class="acts"><button class="btn btn-primary btn-sm" data-act="close">Done</button></div>`); S.cart = []; save(); render(); },
    color: (el) => { const ds = detailState[el.dataset.id]; ds.v = +el.dataset.i; ds.img = 0; render(); },
    gal: (el) => { detailState[el.dataset.id].img = +el.dataset.i; render(); },
    size: (el) => { detailState[el.dataset.id].size = el.value; },
    'size-guide': () => modal(`<h3>Size Guide</h3><table class="small" style="width:100%;border-collapse:collapse;margin-top:10px">${[['', 'S', 'M', 'L', 'XL'], ['Chest (cm)', '104', '112', '120', '128'], ['Length (cm)', '68', '71', '74', '77'], ['Sleeve (cm)', '60', '62', '64', '66']].map((r, i) => `<tr>${r.map((c) => `<${i ? 'td' : 'th'} style="padding:8px;border-bottom:1px solid #eee;text-align:left">${c}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table><p class="xs muted">Relaxed unisex fit. Final specs confirmed by the licensed manufacturer.</p>`),
    'ip-info': (el) => { const ip = ipById(el.dataset.ip); modal(`<h3>${esc(ip.name)} · IP clearance</h3><p class="small">${esc(ip.owner)} runs an open program on iPly. Proposals that reach ${ip.minGoal}+ pre-order intents go to their review team.</p><div class="stats3"><div><b>${ip.royalty}%</b><small>Creator royalty</small></div><div><b>${ip.minGoal}</b><small>Min. goal</small></div><div><b>${ip.open === 'Closed' ? '—' : ip.open.split(',')[0]}</b><small>Open until</small></div></div><div class="acts"><a class="btn btn-primary btn-sm" href="#/open-ip/${ip.id}" data-act="close-nav">View program</a></div>`); },
    'close-nav': (el, ev) => { closeModal(); },
    remix: (el) => { if (!requireLogin()) return; const x = idea(el.dataset.id); const t = D.PRODUCT_TYPES.find((p) => p.n === x.cat || (x.cat === 'T-Shirt' && p.n === 'T-Shirt')); S.draft = Object.assign(blankDraft(), { ip: x.ip, type: t && ipById(x.ip).cats.includes(t.n) ? t.n : '', srcLink: location.href.split('#')[0] + '#/idea/' + x.id, desc: 'Remix of “' + x.title + '” by ' + creator(x.creator).name + '.' }); save(); go('/create/' + (S.draft.type ? 3 : 2)); toast('Remix started — credit to the original creator is added automatically.'); },
    acc: (el) => { const a = el.parentElement; a.classList.toggle('open'); el.setAttribute('aria-expanded', a.classList.contains('open')); },
    'all-comments': () => { const id = parse().parts[1]; detailState[id].allC = !detailState[id].allC; render(); },
    ctag: (el) => { $$('.ctags [data-act="ctag"]').forEach((b) => b.classList.toggle('on', b === el)); },
    seg: (el) => { $$('button', el.parentElement).forEach((b) => b.classList.toggle('on', b === el)); },
    read: (el) => { S.read[el.dataset.id] = 1; save(); },
    'read-all': () => { allNotifs().forEach((n) => { S.read[n.id] = 1; }); save(); closePop(); render(); toast('All caught up'); },
    thread: (el) => { closePop(); const who = el.dataset.id === 'review' ? ['IP review team', 'img/av-c2.webp', 'Hi Luna — demand on Hallownest Moon Hoodie looks great. Could the kingdom silhouette sit ~2 cm lower so it clears the hood seam?'] : ['Nova Land', 'img/av-nova.webp', 'Love your Wanderer pin! Want to co-create a Hollow Knight set together?']; modal(`<h3>${who[0]}</h3><div id="thr" style="display:grid;gap:10px;margin:14px 0"><div class="cm" style="box-shadow:none;background:#F7F5F2"><img src="${who[1]}" alt=""><div><p style="margin:0">${who[2]}</p></div></div></div><form data-form="reply" style="display:flex;gap:10px"><input class="inp" name="t" placeholder="Write a reply…" style="height:44px"><button class="btn btn-primary btn-sm">Send</button></form>`); },
    // create proposal
    'pick-ip': (el) => { if (el.dataset.closed) return toast('Animal Crossing isn’t accepting proposals right now.'); const d = D_(); if (d.ip !== el.dataset.v) { d.ip = el.dataset.v; if (d.type && !ipById(d.ip).cats.includes(d.type)) d.type = ''; d.goal = 0; d.pre = null; } save(); render(); },
    'pick-type': (el) => { if (el.getAttribute('aria-disabled')) return toast(`${el.dataset.v} isn’t open for ${ipById(D_().ip).name} yet.`); D_().type = el.dataset.v; D_().pre = null; save(); render(); },
    'pick-format': (el) => { D_().format = el.dataset.v; save(); render(); },
    'pick-dir': (el) => { const d = D_(), v = el.dataset.v, i = d.dirs.indexOf(v); if (i >= 0) d.dirs.splice(i, 1); else if (d.dirs.length >= 3) return toast('Pick up to three directions'); else d.dirs.push(v); d.pre = null; save(); render(); },
    'sample-imgs': () => { const d = D_(); const map = { Hoodie: ['img/hoodie-cream.webp', 'img/hoodie-model-cream.webp'], 'T-Shirt': ['img/p-tee.webp', 'img/cat-apparel.webp'], 'Tote Bag': ['img/pr-paimon-tote.webp'], 'Plush Toy': ['img/p-plush.webp', 'img/cat-plush.webp'], Mug: ['img/p-mug.webp', 'img/pr-forest-mug.webp'], Bottle: ['img/p-bottle.webp'], Poster: ['img/p-art-print.webp', 'img/cat-prints.webp'], 'Blind Box': ['img/p-collector-box.webp', 'img/p-figurine.webp'] }; (map[d.type] || ['img/p-stickers.webp', 'img/cat-stickers.webp']).forEach((s) => { if (!d.images.includes(s) && d.images.length < 10) d.images.push(s); }); if (!d.imgType) d.imgType = 'Mockup'; d.pre = null; save(); render(); },
    'rm-img': (el) => { D_().images.splice(+el.dataset.i, 1); D_().pre = null; save(); render(); },
    set: (el) => { const d = D_(); d[el.dataset.k] = el.dataset.num ? +el.dataset.v : el.dataset.v; save(); render(); },
    toggle: (el) => { const a = D_()[el.dataset.k], v = el.dataset.v, i = a.indexOf(v); i >= 0 ? (a.length > 1 && a.splice(i, 1)) : a.push(v); save(); render(); },
    'step-next': (el) => { const d = D_(); if (!stepOk(d.step, d)) return toast(['', 'Choose an IP to continue', 'Choose a product type', 'Add an image and confirm originality', 'Add a proposal title (3+ characters)'][d.step]); go('/create/' + (d.step + 1)); },
    'save-draft': () => { if (!requireLogin()) return; const d = D_(); upsertDraft(d); save(); toast('Draft saved to My Proposals'); },
    publish: () => {
      const d = D_(), ip = ipById(d.ip);
      if (!d.pre || Object.values(d.pre).some((x) => x.r === 'run')) return toast('Pre-check is still running…');
      if (Object.values(d.pre).some((x) => x.r === 'fail')) return toast('Fix the failed check before publishing');
      if (!d.agree1 || !d.agree2) return toast('Please accept both agreements');
      const id = (d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proposal') + '-' + Date.now().toString(36).slice(-4);
      const img = d.images[0];
      S.proposals = S.proposals.filter((p) => p.id !== d.id);
      S.proposals.unshift({ id, title: d.title, ip: d.ip, cat: d.type, img, status: 'validating', stage: 2, c: 0, v: 0, p: 0, goal: d.goal, updated: 'Just now' });
      S.extraIdeas.unshift({ id, title: d.title, short: d.type, ip: d.ip, cat: d.type, creator: 'luna-nash', price: [d.price], img, gallery: d.images.slice(0, 4), comments: 0, votes: 0, pre: 0, goal: d.goal, status: 'validating', daysLeft: d.days, desc: d.desc || `${d.format} · ${d.dirs.join(', ')}` });
      notify('published', `“${d.title}” is live for validation · goal ${d.goal} intents`, '#/proposal/' + id);
      S.draft = null; save();
      go('/proposal/' + id);
      setTimeout(() => modal(`<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:var(--green-bg);color:#2E8B3A;display:grid;place-items:center;margin:0 auto 14px">${I('check', 'style="width:30px;height:30px"')}</div><h3 style="padding:0">Your proposal is live!</h3><p class="small muted">Fans can now pick, comment and pre-order. Reach ${d.goal} intents in ${d.days} days to unlock ${esc(ip.owner)}’s review.</p><div class="acts" style="justify-content:center"><button class="btn btn-line btn-sm" data-act="p-share" data-id="${id}">Share</button><a class="btn btn-primary btn-sm" href="#/idea/${id}" data-act="close-nav">View public page</a></div></div>`), 80);
    },
    'new-proposal': () => { if (!requireLogin('/create/1')) return; S.draft = blankDraft(); save(); go('/create/1'); },
    'start-ip': (el) => { if (!requireLogin()) return; S.draft = Object.assign(blankDraft(), { ip: el.dataset.ip }); save(); go('/create/2'); },
    // proposals
    'p-share': (el) => { const url = location.href.split('#')[0] + '#/idea/' + el.dataset.id; (navigator.clipboard ? navigator.clipboard.writeText(url).catch(() => {}) : Promise.resolve()).then(() => toast('Link copied — share it with your fandom')); },
    'p-open': (el) => go('/proposal/' + el.dataset.id),
    'p-feedback': (el) => { const p = prop(el.dataset.id); modal(`<h3>Feedback · ${esc(p.title)}</h3>${(p.feedback || [{ from: 'iPly', date: '', text: 'No feedback yet.' }]).map((f) => `<div class="fb"><small>${esc(f.from)} · ${f.date}</small>${esc(f.text)}</div>`).join('')}<div class="acts">${p.status === 'rejected' ? `<button class="btn btn-primary btn-sm" data-act="resubmit" data-id="${p.id}">Revise &amp; resubmit</button>` : `<button class="btn btn-line btn-sm" data-act="thread" data-id="review">Reply to reviewer</button>`}<a class="btn btn-grey btn-sm" href="#/proposal/${p.id}" data-act="close-nav">Open proposal</a></div>`); },
    'p-license': (el) => { const p = prop(el.dataset.id); modal(`<h3>License · ${esc(p.title)}</h3><div class="lic" style="grid-template-columns:1fr 1fr;margin-top:12px">${Object.entries(p.license).map(([k, v]) => `<div class="panel" style="padding:14px"><small class="muted" style="text-transform:capitalize">${k}</small><div style="font-weight:600">${esc(v)}</div></div>`).join('')}</div><p class="xs muted" style="margin-top:12px">Licensed by ${esc(ipById(p.ip).owner)}. Demo terms.</p>`); },
    'p-product': (el) => go('/idea/' + el.dataset.id),
    'p-continue': (el) => { const p = prop(el.dataset.id); S.draft = Object.assign(blankDraft(), p.draft || {}, { id: p.id, title: p.title }); save(); go('/create/' + (S.draft.step || 1)); },
    resubmit: (el) => { const p = prop(el.dataset.id); closeModal(); S.draft = Object.assign(blankDraft(), { ip: p.ip, type: D.PRODUCT_TYPES.some((t) => t.n === p.cat) ? p.cat : 'Bottle', title: p.title + ' (v2)', images: [p.img], original: true, desc: 'Revised after IP owner feedback.' }); save(); go('/create/2'); toast('Revision started with your original details'); },
    // authorize
    'q-decide': (el) => {
      const id = el.dataset.id, v = el.dataset.v, x = idea(id);
      const label = { approved: 'Approve & license', revision: 'Request revision', declined: 'Decline' }[v];
      modal(`<h3>${label}</h3><p class="small muted">${esc(x.title)} · ${esc(creator(D.QUEUE.find((q) => q.id === id).creator).name)}</p><form data-form="decide" data-id="${id}" data-v="${v}"><div class="fld"><label for="q-note">Message to the creator ${v === 'approved' ? '(optional)' : '(required)'}</label><textarea id="q-note" name="note" style="height:100px" ${v === 'approved' ? '' : 'required'} placeholder="${v === 'approved' ? 'Congrats! Terms attached.' : 'What should change, and why?'}"></textarea></div>${v === 'approved' ? `<div class="aud-grid"><div class="fld"><label>Royalty</label><input class="in" name="roy" value="${ipById(x.ip).royalty}% of net sales"></div><div class="fld"><label>Pilot run</label><input class="in" name="run" value="300 units"></div></div>` : ''}<div class="acts"><button type="button" class="btn btn-grey btn-sm" data-act="close">Cancel</button><button class="btn btn-primary btn-sm">${label}</button></div></form>`);
    },
    'q-undo': (el) => { const id = el.dataset.id; delete S.queue[id]; const p = prop(id); if (p) { const o = D.PROPOSALS.find((q) => q.id === id); Object.assign(p, JSON.parse(JSON.stringify(o))); } if (S.ideaDelta[id]) delete S.ideaDelta[id]; save(); render(); }
  };
  function upsertDraft(d) {
    const ex = prop(d.id);
    const rec = { id: d.id, title: d.title || 'Untitled proposal', ip: d.ip || 'hollow-knight', cat: d.type || '—', img: d.images[0] || 'img/pt-tshirt.webp', status: 'draft', stage: 0, c: 0, v: 0, p: 0, goal: d.goal || 300, updated: 'Just now', draft: JSON.parse(JSON.stringify(d)) };
    if (ex) Object.assign(ex, rec); else S.proposals.unshift(rec);
  }

  /* ------------------------------------------------------------------ forms */
  const F = {
    search: (f) => { const q = f.q.value.trim(); go('/ideas' + (q ? '?q=' + encodeURIComponent(q) : '')); },
    mail: (f) => { go('/signup?email=' + encodeURIComponent(f.email.value.trim())); },
    'owner-mail': () => A['owner-join'](),
    signup: (f) => {
      let ok = true; $$('.ferr', f).forEach((e) => e.remove()); $$('.inp', f).forEach((e) => e.classList.remove('err'));
      const err = (el, m) => { ok = false; el.classList.add('err'); el.closest('.field').insertAdjacentHTML('beforeend', `<div class="ferr">${m}</div>`); };
      if (f.name.value.trim().length < 2) err(f.name, 'Please enter your full name.');
      if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) err(f.email, 'Enter a valid email address.');
      if (f.pw.value.length < 8) err(f.pw, 'Use at least 8 characters.');
      if (!f.terms.checked) { ok = false; toast('Please accept the Terms & Conditions'); }
      if (!ok) return;
      S.user.name = f.name.value.trim(); S.user.email = f.email.value.trim(); save(); go('/signup/2');
    },
    login: () => { S.logged = true; save(); const owner = parse().q.get('as') === 'owner'; go(owner ? '/authorize?tab=queue' : '/ideas'); toast('Welcome back, ' + S.user.name.split(' ')[0]); },
    fandom: (f) => { const v = f.f.value.trim(); if (v && !S.user.fandoms.includes(v)) S.user.fandoms.push(v); save(); render(); },
    comment: (f) => {
      if (!requireLogin()) return; const t = f.t.value.trim(); if (!t) return toast('Write something first');
      const id = f.dataset.id; const tag = ($('.ctags .on[data-act="ctag"]') || {}).dataset; (S.comments[id] = S.comments[id] || []).unshift({ u: '@' + S.user.name.toLowerCase().replace(/\s+/g, ''), a: 'img/av-user.webp', t, tag: tag ? tag.v : '' });
      save(); render(); setTimeout(() => $('#comments') && $('#comments').scrollIntoView({ block: 'start' }), 10); toast('Comment posted');
    },
    contact: (f) => { if (!f.e.value.trim() || !f.m.value.trim()) return toast('Please add your email and a message'); f.reset(); toast('Thanks! We’ll reply within 2 business days.'); },
    owner: (f) => { if (!f.co.value.trim() || !f.ip.value.trim() || !/^\S+@\S+\.\S+$/.test(f.em.value)) return toast('Please fill in company, IP and a valid email'); closeModal(); S.logged = true; save(); modal(`<h3>Submitted for verification</h3><p class="small">We’ll verify <b>${esc(f.ip.value)}</b> within 1 business day. Meanwhile, preview how the review queue works.</p><div class="acts"><a class="btn btn-primary btn-sm" href="#/authorize?tab=queue" data-act="close-nav">Preview review queue</a></div>`); },
    reply: (f) => { const t = f.t.value.trim(); if (!t) return; $('#thr').insertAdjacentHTML('beforeend', `<div class="cm" style="box-shadow:none;background:#FFF0E9;margin-left:40px"><img src="img/av-user.webp" alt=""><div><p style="margin:0">${esc(t)}</p></div></div>`); f.reset(); },
    decide: (f) => {
      const id = f.dataset.id, v = f.dataset.v, note = f.note.value.trim();
      if (v !== 'approved' && !note) return toast('Add a short reason for the creator');
      S.queue[id] = v;
      const p = prop(id), x = idea(id);
      const msg = note || 'Approved — congratulations! License terms attached.';
      if (v === 'approved') { S.ideaDelta[id] = { status: 'authorized' }; if (p) Object.assign(p, { status: 'authorized', stage: 5, updated: 'Just now', license: { term: '24 months', royalty: f.roy ? f.roy.value : '8% of net sales', territory: 'North America', run: f.run ? 'Pilot run of ' + f.run.value : 'Pilot run' }, feedback: [{ from: ipById(x.ip).owner, date: 'Just now', text: msg }].concat(p.feedback || []) }); notify('license', `${x.title} was approved by the IP owner 🎉`, '#/proposal/' + id); }
      else if (v === 'declined') { if (p) Object.assign(p, { status: 'rejected', updated: 'Just now', feedback: [{ from: ipById(x.ip).owner, date: 'Just now', text: msg }] }); notify('rejected', `${x.title} was not approved — see feedback`, '#/proposal/' + id); }
      else { if (p) Object.assign(p, { feedback: [{ from: ipById(x.ip).owner, date: 'Just now', text: 'Revision requested: ' + msg }].concat(p.feedback || []), updated: 'Just now' }); notify('review', `Revision requested on ${x.title}`, '#/proposal/' + id); }
      save(); closeModal(); render();
      toast(p ? 'Decision sent — Luna will see it in My Proposals' : 'Decision sent to the creator');
    }
  };

  /* ------------------------------------------------------------------ events */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) {
      if (!ev.target.closest('#pop,.ic-btn,.av-btn')) closePop();
      if (!ev.target.closest('#guide,.guide-fab')) { const g = $('#guide'); if (g) g.remove(); }
      if (ev.target.closest('a[href^="#"]') && ev.target.closest('#scrim')) closeModal();
      if (ev.target.id === 'scrim') closeModal();
      return;
    }
    const act = el.dataset.act;
    if (act === 'close-nav' || act === 'read' || act === 'guide-go') { A[act] && A[act](el, ev); if (act === 'close-nav') closeModal(); return; }
    if (el.tagName === 'A' && !el.dataset.href) { /* let normal links work */ }
    else ev.preventDefault();
    if (A[act]) A[act](el, ev);
  });
  document.addEventListener('mousedown', (ev) => { if (ev.target.id === 'scrim') closeModal(); });
  document.addEventListener('submit', (ev) => { const f = ev.target.closest('[data-form]'); if (!f) return; ev.preventDefault(); F[f.dataset.form] && F[f.dataset.form](f); });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.q) { const r = parse(); r.q.set(t.dataset.q, t.value); if (!t.value) r.q.delete(t.dataset.q); r.q.set('f', '1'); go('/ideas?' + r.q.toString()); }
    if (t.dataset.bind) { const d = D_(); const k = t.dataset.bind; d[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; if (k === 'original' || k === 'agree1' || k === 'agree2' || k === 'price' || k === 'imgType') { save(); render(); } else save(); }
    if (t.id === 'file-in') readFiles(t.files);
  });
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.bind && t.type !== 'checkbox') {
      const d = D_(); d[t.dataset.bind] = t.type === 'range' ? +t.value : t.value; save();
      if (t.dataset.bind === 'title') { const b = $('[data-act="step-next"]'); if (b) { const ok = stepOk(4, d); b.classList.toggle('is-disabled', !ok); } }
      if (t.type === 'range') { const lab = t.previousElementSibling; if (lab) lab.innerHTML = `Suggested retail price · <span class="o">$${t.value}</span>`; }
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { closeModal(); closePop(); const g = $('#guide'); if (g) g.remove(); }
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && ev.target.matches('#c-in')) ev.target.form.requestSubmit();
  });
  // drag & drop for uploads
  document.addEventListener('dragover', (ev) => { const d = ev.target.closest('#drop'); if (d) { ev.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', (ev) => { const d = ev.target.closest('#drop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', (ev) => { const d = ev.target.closest('#drop'); if (d) { ev.preventDefault(); readFiles(ev.dataTransfer.files); } });
  function readFiles(files) {
    const d = D_(); const list = Array.from(files || []).filter((f) => /image\/(png|jpe?g|webp)/.test(f.type));
    if (!list.length) return toast('Use JPG, PNG or WEBP images');
    let left = list.length;
    list.forEach((f) => {
      if (f.size > 10 * 1024 * 1024) { toast(f.name + ' is over 10MB'); if (!--left) { save(); render(); } return; }
      const r = new FileReader();
      r.onload = () => { downscale(r.result, (u) => { if (d.images.length < 10) d.images.push(u); d.pre = null; if (!--left) { save(); render(); toast('Image added'); } }); };
      r.readAsDataURL(f);
    });
  }
  function downscale(url, cb) { const im = new Image(); im.onload = () => { const m = 900, s = Math.min(1, m / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.82)); }; im.onerror = () => cb(url); im.src = url; }

  function after(a, b, r) {
    if (a === 'signup' && r.q.get('next')) sessionStorage.setItem('iply-next', r.q.get('next'));
    // donut hover
    $$('[data-seg]').forEach((s) => s.addEventListener('mouseenter', () => {
      const i = s.dataset.seg, v = [42, 28, 12, 10, 8][i];
      $$('.legend [data-seg]').forEach((l) => l.classList.toggle('on', l.dataset.seg === i));
      $$('circle[data-seg]').forEach((c) => c.setAttribute('stroke-width', c.dataset.seg === i ? '9' : '7'));
      const t = $('#dn-v'); if (t) t.textContent = v + '%';
    }));
    const hdr = $('.hdr'); if (hdr) hdr.classList.toggle('scrolled', scrollY > 4);
  }
  window.addEventListener('scroll', () => { const h = $('.hdr'); if (h) h.classList.toggle('scrolled', scrollY > 4); }, { passive: true });
  window.addEventListener('hashchange', render);

  // deep-link helpers for the portfolio embed: ?start=ideas etc.
  const start = qs.get('start');
  if (start && !location.hash) location.replace('#/' + start);
  if (qs.get('demo') === '1' && !S.logged) { S.logged = true; save(); }
  render();
})();
