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
  const title = String(item.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const theme = String(item.accent || 'paper');
  const visuals = {
    map: `
      <rect x="0" y="0" width="1200" height="800" fill="#dff5fb"/>
      <path d="M0 120H1200" stroke="rgba(255,255,255,0.45)" stroke-width="16"/>
      <path d="M0 260H1200" stroke="rgba(255,255,255,0.35)" stroke-width="10"/>
      <path d="M0 420H1200" stroke="rgba(255,255,255,0.3)" stroke-width="14"/>
      <path d="M0 590H1200" stroke="rgba(255,255,255,0.28)" stroke-width="12"/>
      <path d="M120 140C240 80 340 220 450 160S670 240 820 150S1010 220 1130 130" fill="none" stroke="#ff5b78" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M160 680C280 560 380 740 500 620S720 760 860 620S1030 690 1120 580" fill="none" stroke="#00b4d8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
      <circle cx="250" cy="250" r="56" fill="#ffffff" opacity="0.9"/>
      <circle cx="250" cy="250" r="22" fill="#ff5b78"/>
      <circle cx="900" cy="520" r="62" fill="#ffffff" opacity="0.9"/>
      <circle cx="900" cy="520" r="24" fill="#00b4d8"/>
      <path d="M0 0L1200 800" stroke="rgba(255,255,255,0.3)" stroke-width="6"/>
      <path d="M1200 0L0 800" stroke="rgba(255,255,255,0.22)" stroke-width="6"/>
      <rect x="820" y="80" width="300" height="148" rx="28" fill="rgba(255,255,255,0.85)"/>
      <text x="970" y="145" text-anchor="middle" font-family="Space Grotesk, Arial, sans-serif" font-size="46" font-weight="700" fill="#1a1a1a">${label}</text>
      <text x="970" y="186" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="22" fill="#6b7280">${title}</text>
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
      <text x="600" y="710" text-anchor="middle" font-family="Space Grotesk, Arial, sans-serif" font-size="40" font-weight="700" fill="#fef5f0">${label}</text>
      <text x="600" y="754" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="22" fill="#b7c4d6">${title}</text>
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
      <text x="600" y="690" text-anchor="middle" font-family="Space Grotesk, Arial, sans-serif" font-size="44" font-weight="700" fill="#1a1a1a">${label}</text>
      <text x="600" y="734" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="22" fill="#6b7280">${title}</text>
    `,
    neon: `
      <rect x="0" y="0" width="1200" height="800" fill="#fef5f0"/>
      <circle cx="210" cy="210" r="130" fill="#ff5b78" opacity="0.18"/>
      <circle cx="980" cy="190" r="140" fill="#00b4d8" opacity="0.16"/>
      <circle cx="920" cy="620" r="160" fill="#ffc107" opacity="0.12"/>
      <path d="M170 570C250 460 330 620 410 520S560 610 650 500S810 640 920 510S1070 610 1120 540" fill="none" stroke="#ff5b78" stroke-width="18" stroke-linecap="round"/>
      <path d="M150 640H1050" stroke="#1a1a1a" stroke-width="10" opacity="0.18"/>
      <text x="600" y="260" text-anchor="middle" font-family="Space Grotesk, Arial, sans-serif" font-size="60" font-weight="700" fill="#1a1a1a">${label}</text>
      <text x="600" y="320" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="26" fill="#6b7280">${title}</text>
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
    intro.innerHTML = '<p class="eyebrow">Makes</p><h2>Current artifacts.</h2><p class="makes-intro-copy">Each make gets its own card so the page reads like a gallery of completed pieces, not a file list.</p>';
    page.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'makes-grid';

    const makesTitles = ['Selfie', 'GIF', 'Text', 'Map', 'Network', 'Bot', 'Play', 'Visualization', 'Museum'];
    const cardTypes = ['neon', 'game', 'paper', 'map', 'neon', 'game', 'paper', 'neon', 'paper'];
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
      description: makeDescriptions[index] || 'Click to explore',
      tags: makeTags[index] || ['Make'],
      path: item.path
    }));

    makesFolders.forEach(item => {
      const card = document.createElement('article');
      card.className = `make-card make-card--${item.cardType}`;

      const preview = document.createElement('div');
      preview.className = `make-preview make-preview--${item.cardType}`;
      const svgDataUrl = buildMakePreviewSvg({ label: item.label, title: item.title, accent: item.cardType });
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
    intro.innerHTML = '<p class="eyebrow">Reflections</p><h2>Weekly reflection trail.</h2><p class="makes-intro-copy">These entries are arranged as a sequence so the semester reads like a progression of ideas instead of isolated pages.</p>';
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
        <span class="section-card-badge">Week ${index + 1}</span>
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
