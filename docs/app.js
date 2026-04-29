// Load manifest, build menu, and render markdown files from repo
let homeMarkup = '';

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

function showHome() {
  if (homeMarkup) setContent(homeMarkup);
  closeMenu();
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
    const files = manifest[folder] || [];
    if (files.length === 1) {
      const entryPath = typeof files[0] === 'string' ? normalizePath(files[0]) : normalizePath(files[0].path || '');
      const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = folder; a.dataset.path = entryPath; a.addEventListener('click', e => { e.preventDefault(); loadMarkdown(a.dataset.path); closeMenu(); }); li.appendChild(a); ul.appendChild(li); return;
    }
    const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = folder; a.dataset.folder = folder; a.addEventListener('click', e => { e.preventDefault(); showFolderPage(manifest, folder); closeMenu(); }); li.appendChild(a); ul.appendChild(li);
  });
}

function showFolderPage(manifest, folder) {
  const files = manifest[folder] || [];
  const folderName = String(folder || '').trim().toLowerCase();
  if (folderName === 'makes') {
    const makesFolders = [ { path: './Makes/make4.md', label: 'Make 4' }, { path: './Makes/make6.md', label: 'Make 6' }, { path: './Makes/make9.md', label: 'Make 9' }, { path: './Makes/make12.md', label: 'Make 12' } ];
    const list = document.createElement('ul'); list.className = 'makes-folder-list'; makesFolders.forEach(f => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = f.label; a.dataset.path = f.path; a.addEventListener('click', e => { e.preventDefault(); loadMarkdown(f.path); closeMenu(); }); li.appendChild(a); list.appendChild(li); }); setContent(''); document.getElementById('content').appendChild(list); return;
  }
  const entries = files.map(f => typeof f === 'string' ? { path: normalizePath(f), label: f } : { path: normalizePath(f.path || ''), label: f.label || f.path, description: f.description || '' }).filter(i => i.path && i.path.toLowerCase().endsWith('.md'));
  if (entries.length === 0) { setContent('<p>No markdown pages listed for this folder.</p>'); return; }
  const list = document.createElement('ul'); entries.forEach(item => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#'; a.textContent = item.label || item.path; a.dataset.path = item.path; a.addEventListener('click', e => { e.preventDefault(); loadMarkdown(item.path); closeMenu(); }); li.appendChild(a); if (item.description) { const desc = document.createElement('div'); desc.className = 'list-item-desc'; desc.textContent = item.description; li.appendChild(desc); } list.appendChild(li); }); setContent(''); document.getElementById('content').appendChild(list);
}

document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content'); homeMarkup = content ? content.innerHTML : '';
  let manifest = {};
  try { manifest = await loadManifest(); } catch (e) { console.warn('Failed to load manifest', e); }
  buildMenu(manifest);
  setMenuOpen(false);
  const menuToggle = document.getElementById('menu-toggle'); if (menuToggle) menuToggle.addEventListener('click', () => toggleMenu());
  const homeHeader = document.getElementById('home-header'); if (homeHeader) homeHeader.addEventListener('click', showHome);
  if (content) {
    content.addEventListener('click', (event) => {
      const button = event.target.closest('[data-home-action]');
      if (!button) return;
      const action = button.getAttribute('data-home-action');
      if (action === 'open-menu') { setMenuOpen(true); return; }
      if (action === 'go-about') { loadMarkdown('./Pages/about.md'); }
    });
  }
  showHome();
});
