// Load manifest, build menu, and render markdown files from repo
let homeMarkup = '';
let appManifest = {};

// Configure marked to allow HTML in markdown
marked.setOptions({ 
  pedantic: false,
  gfm: true,
  breaks: true 
});
const renderer = new marked.Renderer();
const originalHtml = renderer.html.bind(renderer);
renderer.html = (token) => typeof token === 'string' ? token : (token.text || '');
marked.setOptions({ renderer });

async function loadManifest() {
  const url = new URL('manifest.json', location.href);
  url.searchParams.set('_t', Date.now().toString());
  const res = await fetch(url.href, { cache: 'no-store' });
  return res.json();
}

function setContent(nodeOrHtml) {
  const el = document.getElementById('content');
  if (typeof nodeOrHtml === 'string') {
    el.innerHTML = nodeOrHtml;
  } else if (nodeOrHtml instanceof Node) {
    el.innerHTML = '';
    el.appendChild(nodeOrHtml);
  } else {
    el.innerHTML = '';
  }
}

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function showHome() {
  if (homeMarkup) setContent(homeMarkup);
  scrollToTop();
  closeMenu();
}

function normalizeEntries(entries) {
  return (entries || []).map((item, index) => {
    if (typeof item === 'string') {
      return { path: normalizePath(item), label: item, description: '', index };
    }
    return {
      path: normalizePath(item.path || ''),
      label: item.label || item.path || 'Untitled',
      description: item.description || '',
      index
    };
  }).filter(item => item.path && item.path.toLowerCase().endsWith('.md'));
}

function getSectionEntries(manifest, sectionName) {
  return normalizeEntries(manifest[sectionName] || []);
}

function buildSectionCard(entry, options = {}) {
  const card = document.createElement('a');
  card.href = '#';
  card.className = options.className || 'section-card';
  card.dataset.path = entry.path;

  const badge = document.createElement('span');
  badge.className = 'section-card-badge';
  badge.textContent = options.badge || 'Open';

  const label = document.createElement('h3');
  label.textContent = entry.label;

  const description = document.createElement('p');
  description.textContent = entry.description || options.fallbackDescription || 'Open the page to read more.';

  card.appendChild(badge);
  card.appendChild(label);
  card.appendChild(description);

  if (options.meta) {
    const meta = document.createElement('div');
    meta.className = 'section-card-meta';
    meta.textContent = options.meta;
    card.appendChild(meta);
  }

  card.addEventListener('click', (event) => {
    event.preventDefault();
    loadMarkdown(entry.path);
    closeMenu();
  });

  return card;
}

function buildHomeMarkup(manifest) {
  const page = document.createElement('section');
  page.className = 'home-panel home-panel--home';

  const hero = document.createElement('div');
  hero.className = 'home-hero';
  hero.innerHTML = `
    <h2>Human-Made in the Age of AI</h2>
    <p class="home-summary">In a world shaped by algorithms and automation, authenticity matters more than ever. These projects explore what it means to create as a human: bringing together experience, emotion, curiosity, and intention in ways AI can only imitate. While technology can generate and replicate, meaningful work comes from perspective, values, and the desire to question, interpret, and connect. This space is a collection of makes that reflect that human process.</p>
    <div class="home-actions">
      <button class="primary-action" type="button" data-home-action="go-makes">Start Exploring</button>
    </div>
  `;

  const embed = document.createElement('div');
  embed.className = 'home-embed';
  embed.innerHTML = `
    <div class="sketchfab-embed-wrapper">
      <iframe
        title="Cat in a Box"
        frameborder="0"
        allowfullscreen
        mozallowfullscreen="true"
        webkitallowfullscreen="true"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        xr-spatial-tracking
        execution-while-out-of-view
        execution-while-not-rendered
        web-share
        src="https://sketchfab.com/models/726067b21dcc439895aec9c3d2410881/embed?autostart=1&camera=0&transparent=1&ui_hint=0"></iframe>
    </div>
  `;

  page.appendChild(hero);
  page.appendChild(embed);

  return page;
}

function buildMakePreviewSvg(item) {
  const label = String(item.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const theme = String(item.theme || item.accent || 'paper');
  const visuals = {
    selfie: `
      <rect x="0" y="0" width="1200" height="800" fill="#fde9e2"/>
      <circle cx="960" cy="170" r="120" fill="#ff5b78" opacity="0.18"/>
      <rect x="170" y="90" width="460" height="620" rx="56" fill="#242b3b"/>
      <rect x="198" y="130" width="404" height="530" rx="38" fill="#fef5f0"/>
      <circle cx="400" cy="302" r="94" fill="#ffd8bf"/>
      <path d="M320 316C352 348 448 348 480 316" fill="none" stroke="#7a442f" stroke-width="16" stroke-linecap="round"/>
      <circle cx="366" cy="292" r="12" fill="#2f2f2f"/>
      <circle cx="434" cy="292" r="12" fill="#2f2f2f"/>
      <path d="M336 244C352 224 382 214 400 214C418 214 448 224 464 244" fill="none" stroke="#2f2f2f" stroke-width="10" stroke-linecap="round"/>
      <rect x="286" y="430" width="228" height="170" rx="32" fill="#00b4d8" opacity="0.84"/>
      <rect x="770" y="170" width="320" height="78" rx="22" fill="#ffffff" opacity="0.9"/>
      <rect x="770" y="278" width="260" height="62" rx="20" fill="#ffffff" opacity="0.75"/>
    `,
    gif: `
      <rect x="0" y="0" width="1200" height="800" fill="#131a2d"/>
      <rect x="130" y="130" width="940" height="500" rx="34" fill="#1f2942" stroke="#00b4d8" stroke-width="8"/>
      <rect x="200" y="220" width="800" height="320" rx="24" fill="#0b101c"/>
      <rect x="240" y="258" width="160" height="244" rx="14" fill="#ff5b78" opacity="0.8"/>
      <rect x="430" y="258" width="160" height="244" rx="14" fill="#ffd166" opacity="0.8"/>
      <rect x="620" y="258" width="160" height="244" rx="14" fill="#06d6a0" opacity="0.8"/>
      <rect x="810" y="258" width="160" height="244" rx="14" fill="#00b4d8" opacity="0.8"/>
      <path d="M500 165C620 128 760 170 820 260" fill="none" stroke="#fef5f0" stroke-width="12" stroke-linecap="round"/>
      <polygon points="822,238 860,280 802,278" fill="#fef5f0"/>
      <path d="M700 592C576 634 438 596 374 510" fill="none" stroke="#fef5f0" stroke-width="12" stroke-linecap="round"/>
      <polygon points="372,532 334,490 392,494" fill="#fef5f0"/>
    `,
    text: `
      <rect x="0" y="0" width="1200" height="800" fill="#f6efe2"/>
      <rect x="190" y="110" width="560" height="580" rx="24" fill="#fffdf8" stroke="#d8cbb8" stroke-width="7"/>
      <rect x="260" y="190" width="420" height="20" rx="8" fill="#2d3748" opacity="0.85"/>
      <rect x="260" y="238" width="380" height="16" rx="7" fill="#4a5568" opacity="0.76"/>
      <rect x="260" y="278" width="430" height="16" rx="7" fill="#4a5568" opacity="0.7"/>
      <rect x="260" y="318" width="350" height="16" rx="7" fill="#4a5568" opacity="0.64"/>
      <rect x="260" y="358" width="420" height="16" rx="7" fill="#4a5568" opacity="0.58"/>
      <rect x="260" y="398" width="390" height="16" rx="7" fill="#4a5568" opacity="0.52"/>
      <circle cx="860" cy="350" r="130" fill="#dff5fb"/>
      <circle cx="860" cy="350" r="88" fill="none" stroke="#00b4d8" stroke-width="16"/>
      <rect x="930" y="430" width="120" height="24" rx="12" transform="rotate(40 930 430)" fill="#00b4d8"/>
    `,
    map: `
      <defs>
        <!-- Ocean gradient -->
        <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#8fd3ff"/>
          <stop offset="100%" stop-color="#5db8ff"/>
        </linearGradient>

        <!-- Land texture -->
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
        </filter>

        <!-- Soft shadow -->
        <filter id="shadow">
          <feDropShadow dx="0" dy="5" stdDeviation="5" flood-opacity="0.25"/>
        </filter>
      </defs>

      <!-- Ocean -->
      <rect x="0" y="0" width="1200" height="800" fill="url(#ocean)"/>

      <!-- Water current lines -->
      <path d="M60 120C260 90 460 150 660 120S1060 80 1160 130"
            stroke="#d8f7ff" stroke-width="18" opacity="0.25" fill="none"/>

      <path d="M40 300C220 250 420 340 620 300S980 250 1160 320"
            stroke="#d8f7ff" stroke-width="22" opacity="0.22" fill="none"/>

      <path d="M80 560C280 520 520 620 720 570S1020 520 1140 600"
            stroke="#d8f7ff" stroke-width="20" opacity="0.2" fill="none"/>

      <!-- Island 1 -->
      <path d="
        M126 146
        L176 114
        L238 120
        L292 150
        L328 202
        L322 248
        L286 282
        L228 296
        L172 286
        L126 252
        L106 204
        L112 170
        Z"
        fill="#c7d97f"
        stroke="#2f3d1f"
        stroke-width="7"
        stroke-linejoin="round"
        filter="url(#shadow)"/>

      <!-- Mountains -->
      <path d="M180 210L214 164L248 210Z"
            fill="#7d8666"
            stroke="#49513d"
            stroke-width="4"/>

      <path d="M226 230L262 184L296 230Z"
            fill="#687254"
            stroke="#49513d"
            stroke-width="4"/>

      <!-- Forest dots -->
      <circle cx="170" cy="240" r="8" fill="#356b3d"/>
      <circle cx="196" cy="258" r="8" fill="#356b3d"/>
      <circle cx="220" cy="246" r="8" fill="#356b3d"/>
      <circle cx="248" cy="262" r="8" fill="#356b3d"/>

      <!-- Island 2 -->
      <path d="
        M382 90
        L450 74
        L518 100
        L566 156
        L574 226
        L540 286
        L478 320
        L410 314
        L358 274
        L330 212
        L340 144
        Z"
        fill="#d9c38b"
        stroke="#4e3f22"
        stroke-width="7"
        filter="url(#shadow)"/>

      <!-- Desert dunes -->
      <path d="M390 214C430 194 474 194 518 214"
            stroke="#c7aa64"
            stroke-width="6"
            fill="none"
            opacity="0.8"/>

      <path d="M376 246C426 228 480 232 530 250"
            stroke="#c7aa64"
            stroke-width="6"
            fill="none"
            opacity="0.7"/>

      <!-- River -->
      <path d="M468 92C450 166 458 218 486 302"
            stroke="#6cc9ff"
            stroke-width="12"
            fill="none"
            stroke-linecap="round"/>

      <!-- Main continent -->
      <path d="
        M592 130
        L664 108
        L748 122
        L830 174
        L882 248
        L896 334
        L866 410
        L800 466
        L712 490
        L628 474
        L566 426
        L528 350
        L520 260
        L546 188
        Z"
        fill="#8dbb73"
        stroke="#2f4a2a"
        stroke-width="8"
        filter="url(#shadow)"/>

      <!-- Mountains -->
      <path d="M640 260L694 188L746 260Z"
            fill="#6f7566"
            stroke="#49513d"
            stroke-width="5"/>

      <path d="M708 278L766 198L820 278Z"
            fill="#5f6558"
            stroke="#49513d"
            stroke-width="5"/>

      <!-- Forest -->
      <circle cx="630" cy="360" r="10" fill="#2d6b39"/>
      <circle cx="660" cy="382" r="10" fill="#2d6b39"/>
      <circle cx="694" cy="368" r="10" fill="#2d6b39"/>
      <circle cx="724" cy="392" r="10" fill="#2d6b39"/>
      <circle cx="756" cy="370" r="10" fill="#2d6b39"/>

      <!-- Lake -->
      <ellipse cx="760" cy="332" rx="42" ry="28"
              fill="#5cbcff"
              opacity="0.9"/>

      <!-- Small island -->
      <path d="
        M930 420
        L972 398
        L1018 414
        L1032 456
        L1008 494
        L962 506
        L922 480
        L914 442
        Z"
        fill="#b7cf77"
        stroke="#334222"
        stroke-width="6"
        filter="url(#shadow)"/>

      <!-- Compass -->
      <g transform="translate(1030 120)">
        <circle r="48" fill="#ffffffcc" stroke="#222" stroke-width="5"/>
        <path d="M0-34L10 0L0 34L-10 0Z"
              fill="#222"/>
        <path d="M-34 0L0-10L34 0L0 10Z"
              fill="#777"/>
        <text x="0" y="-58"
              font-size="24"
              font-family="serif"
              text-anchor="middle"
              fill="#111">N</text>
      </g>

      <!-- Decorative border -->
      <rect x="34" y="34" width="1132" height="732"
            rx="12"
            fill="none"
            stroke="#1e1e1e"
            stroke-width="10"/>

      <rect x="52" y="52" width="1096" height="696"
            rx="8"
            fill="none"
            stroke="#ffffff55"
            stroke-width="3"/>
    `,
    game: `
      <rect x="0" y="0" width="1200" height="800" fill="#0d1321"/>
      <rect x="160" y="120" width="880" height="520" rx="40" fill="#1c2436" stroke="#ff5b78" stroke-width="10"/>
      <rect x="220" y="180" width="760" height="360" rx="24" fill="#05070d"/>
      <rect x="270" y="225" width="260" height="40" rx="12" fill="#00b4d8" opacity="0.9"/>
      <rect x="270" y="290" width="430" height="26" rx="10" fill="#fef5f0" opacity="0.9"/>
      <rect x="270" y="338" width="380" height="26" rx="10" fill="#fef5f0" opacity="0.7"/>
      <rect x="270" y="386" width="460" height="26" rx="10" fill="#fef5f0" opacity="0.55"/>
      <rect x="220" y="552" width="170" height="48" rx="16" fill="#ff5b78"/>
      <rect x="420" y="552" width="170" height="48" rx="16" fill="#ffffff" opacity="0.9"/>
      <rect x="620" y="552" width="170" height="48" rx="16" fill="#00b4d8"/>
      <rect x="820" y="552" width="120" height="48" rx="16" fill="#ffc107"/>
    `,
    paper: `
      <rect x="0" y="0" width="1200" height="800" fill="#f9f4ec"/>
      <rect x="110" y="100" width="980" height="600" rx="28" fill="#ffffff" stroke="#e6d8c6" stroke-width="8"/>
      <rect x="190" y="170" width="260" height="300" rx="20" fill="#f0efe8" stroke="#d6c7b2" stroke-width="4"/>
      <rect x="540" y="170" width="540" height="110" rx="18" fill="#f7dccf"/>
      <rect x="540" y="310" width="540" height="70" rx="18" fill="#dff5fb"/>
      <rect x="540" y="400" width="540" height="70" rx="18" fill="#fef5f0"/>
      <rect x="540" y="490" width="540" height="70" rx="18" fill="#fff1b8"/>
      <rect x="190" y="520" width="260" height="120" rx="18" fill="#ff5b78" opacity="0.12"/>
    `,
    neon: `
      <rect x="0" y="0" width="1200" height="800" fill="#fef5f0"/>
      <circle cx="210" cy="210" r="130" fill="#ff5b78" opacity="0.18"/>
      <circle cx="980" cy="190" r="140" fill="#00b4d8" opacity="0.16"/>
      <circle cx="920" cy="620" r="160" fill="#ffc107" opacity="0.12"/>
      <path d="M170 570C250 460 330 620 410 520S560 610 650 500S810 640 920 510S1070 610 1120 540" fill="none" stroke="#ff5b78" stroke-width="18" stroke-linecap="round"/>
      <path d="M150 640H1050" stroke="#1a1a1a" stroke-width="10" opacity="0.18"/>
    `,
    network: `
      <rect x="0" y="0" width="1200" height="800" fill="#0f172a"/>
      <path d="M180 210L410 140L610 260L830 170L1030 260" stroke="#38bdf8" stroke-width="8" fill="none"/>
      <path d="M180 210L290 430L520 520L760 470L1030 260" stroke="#fb7185" stroke-width="8" fill="none"/>
      <path d="M290 430L410 140" stroke="#facc15" stroke-width="7"/>
      <path d="M520 520L610 260" stroke="#22d3ee" stroke-width="7"/>
      <path d="M760 470L830 170" stroke="#f9a8d4" stroke-width="7"/>
      <circle cx="180" cy="210" r="34" fill="#0ea5e9"/>
      <circle cx="410" cy="140" r="34" fill="#22c55e"/>
      <circle cx="610" cy="260" r="34" fill="#f59e0b"/>
      <circle cx="830" cy="170" r="34" fill="#ef4444"/>
      <circle cx="1030" cy="260" r="34" fill="#a78bfa"/>
      <circle cx="290" cy="430" r="30" fill="#06b6d4"/>
      <circle cx="520" cy="520" r="30" fill="#f43f5e"/>
      <circle cx="760" cy="470" r="30" fill="#84cc16"/>
      <rect x="760" y="560" width="330" height="120" rx="24" fill="rgba(255,255,255,0.9)"/>
    `,
    bot: `
      <rect x="0" y="0" width="1200" height="800" fill="#f5f9ff"/>
      <circle cx="210" cy="170" r="100" fill="#c7f9ff"/>
      <circle cx="980" cy="620" r="140" fill="#ffe0ef"/>
      <rect x="340" y="170" width="520" height="360" rx="56" fill="#1f2937"/>
      <rect x="380" y="220" width="440" height="230" rx="34" fill="#f8fafc"/>
      <circle cx="510" cy="334" r="38" fill="#0ea5e9"/>
      <circle cx="690" cy="334" r="38" fill="#0ea5e9"/>
      <rect x="530" y="424" width="140" height="24" rx="12" fill="#22c55e"/>
      <rect x="572" y="118" width="56" height="52" rx="18" fill="#1f2937"/>
      <circle cx="600" cy="92" r="28" fill="#ef4444"/>
      <rect x="190" y="340" width="130" height="92" rx="22" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
      <rect x="880" y="280" width="180" height="114" rx="22" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
    `,
    play: `
      <rect x="0" y="0" width="1200" height="800" fill="#101014"/>
      <rect x="170" y="140" width="860" height="520" rx="46" fill="#1f2432" stroke="#3b4254" stroke-width="8"/>
      <rect x="300" y="320" width="600" height="220" rx="110" fill="#2f374b"/>
      <circle cx="440" cy="430" r="72" fill="#111827"/>
      <rect x="404" y="418" width="72" height="24" rx="12" fill="#f8fafc"/>
      <rect x="428" y="394" width="24" height="72" rx="12" fill="#f8fafc"/>
      <circle cx="760" cy="398" r="26" fill="#f43f5e"/>
      <circle cx="816" cy="430" r="26" fill="#22d3ee"/>
      <circle cx="760" cy="462" r="26" fill="#facc15"/>
      <circle cx="704" cy="430" r="26" fill="#4ade80"/>
      <rect x="520" y="402" width="160" height="56" rx="20" fill="#111827"/>
      <rect x="560" y="418" width="36" height="24" rx="8" fill="#cbd5e1"/>
      <rect x="604" y="418" width="36" height="24" rx="8" fill="#cbd5e1"/>
      <rect x="420" y="210" width="360" height="78" rx="24" fill="#0ea5e9" opacity="0.9"/>
    `,
    visualization: `
      <rect x="0" y="0" width="1200" height="800" fill="#eefbf4"/>
      <rect x="140" y="120" width="920" height="560" rx="34" fill="#ffffff" stroke="#d2e9db" stroke-width="6"/>
      <line x1="240" y1="560" x2="940" y2="560" stroke="#334155" stroke-width="8"/>
      <line x1="240" y1="560" x2="240" y2="220" stroke="#334155" stroke-width="8"/>
      <rect x="300" y="430" width="86" height="130" rx="10" fill="#38bdf8"/>
      <rect x="430" y="360" width="86" height="200" rx="10" fill="#22c55e"/>
      <rect x="560" y="300" width="86" height="260" rx="10" fill="#f59e0b"/>
      <rect x="690" y="260" width="86" height="300" rx="10" fill="#ef4444"/>
      <rect x="820" y="220" width="86" height="340" rx="10" fill="#8b5cf6"/>
      <path d="M300 390C420 330 540 340 650 280S840 240 906 210" fill="none" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>
      <circle cx="906" cy="210" r="18" fill="#10b981"/>
    `,
    museum: `
      <rect x="0" y="0" width="1200" height="800" fill="#f8f1e8"/>
      <rect x="60" y="640" width="1080" height="110" fill="#d8c4aa"/>
      <rect x="220" y="280" width="760" height="340" rx="16" fill="#fff8ef" stroke="#c7b093" stroke-width="8"/>
      <polygon points="180,280 1020,280 600,120" fill="#e8d7c1" stroke="#c7b093" stroke-width="8"/>
      <rect x="560" y="470" width="80" height="150" fill="#d9c0a2"/>
      <rect x="300" y="350" width="70" height="270" fill="#e7d4bd"/>
      <rect x="430" y="350" width="70" height="270" fill="#e7d4bd"/>
      <rect x="700" y="350" width="70" height="270" fill="#e7d4bd"/>
      <rect x="830" y="350" width="70" height="270" fill="#e7d4bd"/>
      <rect x="280" y="300" width="640" height="30" fill="#c9b092"/>
      <circle cx="250" cy="230" r="22" fill="#ffd166" opacity="0.65"/>
      <circle cx="950" cy="210" r="30" fill="#00b4d8" opacity="0.45"/>
    `
  };
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${label} preview">
      <defs>
        <linearGradient id="glow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.85)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0.25)"/>
        </linearGradient>
      </defs>
      ${visuals[theme] || visuals.paper}
      <rect x="24" y="24" width="1152" height="752" rx="36" fill="none" stroke="url(#glow)" stroke-width="2"/>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function setMenuOpen(isOpen) {
  document.body.classList.toggle('menu-open', Boolean(isOpen));
  const toggle = document.getElementById('menu-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
}

function closeMenu() { setMenuOpen(false); }
function toggleMenu() { setMenuOpen(!document.body.classList.contains('menu-open')); }

function normalizePath(path) {
  const p = String(path || '').trim().replace(/\\/g, '/');
  if (!p) return p;
  if (/^(https?:)?\/\//i.test(p)) return p;
  if (p.startsWith('/')) return '.' + p;
  return p;
}

function buildPathCandidates(path) {
  const normalized = normalizePath(path);
  const candidates = [];
  const add = (p) => { if (!p || candidates.includes(p)) return; candidates.push(p); };
  add(normalized);
  add(String(normalized).replace(/^\.\//, ''));
  if (String(normalized).startsWith('../')) add(String(normalized).replace(/^((\.\.\/)+)/, ''));
  else add('../' + String(normalized).replace(/^\.\//, ''));
  return candidates;
}

function buildGithubRawCandidates(url) {
  try {
    if (!/\.github\.io$/i.test(location.hostname)) return [];
    const currentParts = location.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const repo = currentParts[0];
    const owner = location.hostname.split('.')[0];
    if (!owner || !repo) return [];
    const targetParts = decodeURIComponent(url.pathname).replace(/^\/+/, '').split('/').filter(Boolean);
    if (targetParts.length === 0) return [];
    const repoRelativeParts = targetParts[0] === repo ? targetParts.slice(1) : targetParts;
    if (repoRelativeParts.length === 0) return [];
    const repoRelativePath = repoRelativeParts.map(encodeURIComponent).join('/');
    return [
      'https://raw.githubusercontent.com/' + owner + '/' + repo + '/main/' + repoRelativePath,
      'https://raw.githubusercontent.com/' + owner + '/' + repo + '/master/' + repoRelativePath
    ];
  } catch (e) { return []; }
}

async function fetchFirstAvailable(path) {
  const pathCandidates = buildPathCandidates(path);
  const urlCandidates = [];
  pathCandidates.forEach(p => {
    const u = new URL(p, location.href); u.searchParams.set('_t', Date.now().toString()); urlCandidates.push(u.href);
    buildGithubRawCandidates(u).forEach(raw => { if (!urlCandidates.includes(raw)) urlCandidates.push(raw); });
  });
  let lastError = null;
  for (const href of urlCandidates) {
    try { const res = await fetch(href, { cache: 'no-store' }); if (res.ok) { const text = await res.text(); return { text, href }; } lastError = new Error('Not found: ' + path); } catch (err) { lastError = err; }
  }
  throw lastError || new Error('Not found: ' + path);
}

async function loadMarkdown(path) {
  try {
    const normalizedPath = normalizePath(path);
    const isHomePage = normalizedPath.toLowerCase().endsWith('readme.md');
    document.body.classList.toggle('home-view', isHomePage);
    const loaded = await fetchFirstAvailable(normalizedPath);
    let text = loaded.text;
    const baseUrl = new URL('.', loaded.href).href;
    if (/^```[\s\S]*```\s*$/.test(text)) {
      const m = text.match(/^```[^\n]*\n([\s\S]*?)\n```\s*$/); if (m) text = m[1];
    }
    text = text.replace(/(["'\(])([A-Za-z]:\\[^\)"']+)(["'\)])/g, (m, lead, p, trail) => { const parts = p.split(/[\/\\\\]/); return lead + parts.pop() + trail; });
    const htmlRaw = marked.parse(text);
    const temp = document.createElement('div'); temp.innerHTML = htmlRaw;
    temp.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src') || ''; src = src.replace(/\\/g, '/'); if (/^(https?:)?\/\//i.test(src)) return; if (src.startsWith('/')) src = '.' + src; const resolved = new URL(src, baseUrl).href; img.setAttribute('src', resolved + (resolved.includes('?') ? '&' : '?') + '_t=' + Date.now());
    });
    setContent(''); const contentEl = document.getElementById('content'); while (temp.firstChild) contentEl.appendChild(temp.firstChild);
    scrollToTop();
  } catch (err) { setContent('<p>Error loading file: ' + err.message + '</p>'); }
}

function loadAsset(path) {
  const ext = path.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','svg','webp'].includes(ext)) {
    const assetUrl = new URL(path, location.href); assetUrl.searchParams.set('_t', Date.now().toString()); setContent('<div class="asset-view"><img src="' + assetUrl.href + '" alt="" /></div>'); return;
  }
  const assetUrl = new URL(path, location.href); assetUrl.searchParams.set('_t', Date.now().toString()); fetch(assetUrl.href, { cache: 'no-store' }).then(r => r.text()).then(txt => setContent('<pre>' + txt.replace(/</g,'&lt;') + '</pre>')).catch(e => setContent('<p>Error loading asset: ' + e.message + '</p>'));
}

function buildMenu(manifest) {
  const ul = document.querySelector('#menu ul'); ul.innerHTML = ''; Object.keys(manifest).forEach(folder => {
    if (folder === 'About Me' || folder === 'Markdown Guide') return;
    const files = manifest[folder] || [];
    const label = folder === 'Reflections' ? 'Reflections' : folder;
    if (files.length === 1) {
      const entryPath = typeof files[0] === 'string' ? normalizePath(files[0]) : normalizePath(files[0].path || '');
      const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = label; a.dataset.path = entryPath; a.addEventListener('click', e => { e.preventDefault(); loadMarkdown(a.dataset.path); closeMenu(); }); li.appendChild(a); ul.appendChild(li); return;
    }
    const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = label; a.dataset.folder = folder; a.addEventListener('click', e => { e.preventDefault(); showFolderPage(manifest, folder); closeMenu(); }); li.appendChild(a); ul.appendChild(li);
  });
}

function showFolderPage(manifest, folder) {
  const files = manifest[folder] || [];
  const folderName = String(folder || '').trim().toLowerCase();
  if (folderName === 'makes') {
    const page = document.createElement('section');
    page.className = 'makes-page';

    const intro = document.createElement('div');
    intro.className = 'makes-intro';
    intro.innerHTML = '<h2>AI Artifacts Showcase</h2><p class="makes-intro-copy">Explore different facets of AI through my various projects.</p>';
    page.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'makes-grid';

    const makesTitles = ['Selfie', 'GIF', 'Text', 'Map', 'Network', 'Bot', 'Play', 'Visualization', 'Museum'];
    const cardTypes = ['neon', 'game', 'paper', 'map', 'neon', 'game', 'paper', 'neon', 'paper'];
    const previewThemes = ['selfie', 'gif', 'text', 'map', 'network', 'bot', 'play', 'visualization', 'museum'];
    const makeDescriptions = [
      'AI-generated portraits remixed with human imperfections',
      'Looping surveillance imagery exploring constant observation',
      'Analyzing literary patterns through Voyant and ChatGPT',
      'Mapping the hidden costs of AI infrastructure globally',
      'Visualizing the AI supply chain and labor exploitation',
      'Exploring AI personality generation and creative autonomy',
      'An interactive experience about content moderation and agency',
      'Visualizing the carbon footprint of AI training and use',
      'A museum exhibit from 2099 showing the cost of AI expansion'
    ];
    const makeTags = [
      ['Identity', 'Remix', 'Portrait'],
      ['Surveillance', 'Loop', 'Motion'],
      ['Analysis', 'Text', 'Patterns'],
      ['Infrastructure', 'Mapping', 'Systems'],
      ['Supply Chain', 'Power', 'Networks'],
      ['Character', 'Generation', 'Dialogue'],
      ['Interactive', 'Choice', 'Game'],
      ['Environment', 'Data', 'Ecology'],
      ['Futures', 'Climate', 'Speculation']
    ];
    
    const makesFolders = getSectionEntries(manifest, 'Makes').map((item, index) => ({
      ...item,
      title: makesTitles[index] || item.label,
      cardType: cardTypes[index] || 'neon',
      previewTheme: previewThemes[index] || 'paper',
      description: makeDescriptions[index] || 'Click to explore',
      tags: makeTags[index] || ['Make'],
      path: item.path
    }));

    makesFolders.forEach(item => {
      const card = document.createElement('article');
      card.className = `make-card make-card--${item.cardType}`;
      card.dataset.make = String(item.title || '').toLowerCase().replace(/\s+/g, '-');

      const preview = document.createElement('div');
      preview.className = `make-preview make-preview--${item.cardType}`;
      const svgDataUrl = buildMakePreviewSvg({ label: item.label, title: item.title, accent: item.cardType, theme: item.previewTheme });
      preview.innerHTML = `<img src="${svgDataUrl}" alt="${item.title}" />`;
      card.appendChild(preview);

      const info = document.createElement('div');
      info.className = 'make-info';

      const title = document.createElement('h3');
      title.textContent = item.title;
      info.appendChild(title);

      const summary = document.createElement('p');
      summary.className = 'make-summary';
      summary.textContent = item.description;
      info.appendChild(summary);

      const tags = document.createElement('div');
      tags.className = 'make-tags';
      item.tags.forEach(tagText => {
        const tag = document.createElement('span');
        tag.className = 'make-tag';
        tag.textContent = tagText;
        tags.appendChild(tag);
      });
      info.appendChild(tags);

      card.appendChild(info);

      card.addEventListener('click', () => {
        loadMarkdown(item.path);
      });

      grid.appendChild(card);
    });

    page.appendChild(grid);
    setContent(page);
    scrollToTop();
    return;
  }
  if (folderName === 'reflections') {
    const page = document.createElement('section');
    page.className = 'reflection-page';

    const intro = document.createElement('div');
    intro.className = 'makes-intro';
    intro.innerHTML = '<h2>Facets of AI - Thoughts and Reflections</h2><p class="makes-intro-copy">As AI becomes more and more integrated into daily life, it is important to consider its full impact.</p>';
    page.appendChild(intro);

    const entries = getSectionEntries(manifest, 'Reflections');
    const list = document.createElement('div');
    list.className = 'reflection-grid';

    entries.forEach((entry, index) => {
      const card = document.createElement('a');
      card.href = '#';
      card.className = 'reflection-card';
      card.dataset.path = entry.path;
      card.innerHTML = `
        <h3>${entry.label}</h3>
        <p>${entry.description || 'Open the reflection to read more.'}</p>
        <div class="section-card-meta">Read reflection</div>
      `;
      card.addEventListener('click', (event) => {
        event.preventDefault();
        loadMarkdown(entry.path);
        closeMenu();
      });
      list.appendChild(card);
    });

    page.appendChild(list);
    setContent(page);
    scrollToTop();
    return;
  }
  const entries = files.map(f => typeof f === 'string' ? { path: normalizePath(f), label: f } : { path: normalizePath(f.path || ''), label: f.label || f.path, description: f.description || '' }).filter(i => i.path && i.path.toLowerCase().endsWith('.md'));
  if (entries.length === 0) { setContent('<p>No markdown pages listed for this folder.</p>'); scrollToTop(); return; }
  const list = document.createElement('ul'); entries.forEach(item => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = item.label || item.path; a.dataset.path = item.path; a.addEventListener('click', e => { e.preventDefault(); loadMarkdown(item.path); closeMenu(); }); li.appendChild(a); if (item.description) { const desc = document.createElement('div'); desc.className = 'list-item-desc'; desc.textContent = item.description; li.appendChild(desc); } list.appendChild(li); }); setContent(''); document.getElementById('content').appendChild(list); scrollToTop();
}

document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');
  try { appManifest = await loadManifest(); } catch (e) { console.warn('Failed to load manifest', e); }
  homeMarkup = buildHomeMarkup(appManifest);
  buildMenu(appManifest);
  setMenuOpen(false);
  const menuToggle = document.getElementById('menu-toggle'); if (menuToggle) menuToggle.addEventListener('click', () => toggleMenu());
  const homeHeader = document.getElementById('home-header'); if (homeHeader) homeHeader.addEventListener('click', showHome);
  document.querySelectorAll('[data-header-action="go-about"]').forEach((button) => {
    button.addEventListener('click', () => loadMarkdown('./Pages/about.md'));
  });
  if (content) {
    content.addEventListener('click', (event) => {
      const button = event.target.closest('[data-home-action]');
      if (!button) return;
      const action = button.getAttribute('data-home-action');
      if (action === 'go-makes') { showFolderPage(appManifest, 'Makes'); closeMenu(); return; }
    });
  }
  document.addEventListener('click', (event) => {
    if (!document.body.classList.contains('menu-open')) return;
    if (event.target.closest('#menu')) return;
    if (event.target.closest('button')) return;
    closeMenu();
  });
  showHome();
  scrollToTop();
});
