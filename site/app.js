// Load manifest, build menu, and render markdown files from repo
async function loadManifest() {
  const url = new URL('manifest.json', location.href);
  url.searchParams.set('_t', Date.now().toString());
  const res = await fetch(url.href, { cache: 'no-store' });
  return res.json();
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

function setMenuOpen(isOpen) {
  document.body.classList.toggle('menu-open', Boolean(isOpen));
  const toggle = document.getElementById('menu-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
  }
}

function closeMenu() {
  setMenuOpen(false);
}

function toggleMenu() {
  const isOpen = document.body.classList.contains('menu-open');
  setMenuOpen(!isOpen);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function placeholderDataUrl(label) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">' +
    '<rect width="100%" height="100%" fill="%23f3f4f6"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,Arial,sans-serif" font-size="28" fill="%23666">' +
    escapeHtml(String(label)).replace(/&/g,'%26') +
    '</text></svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function extractWeekLabel(path) {
  const m = String(path).match(/week\s*(\d+)/i) || String(path).match(/week(\d+)/i);
  if (m) return 'Week ' + Number(m[1]);
  return String(path).replace('../', '');
}

function normalizePath(path) {
  const p = String(path || '').trim().replace(/\\/g, '/');
  if (!p) return p;
  if (/^(https?:)?\/\//i.test(p)) return p;
  if (p.startsWith('/')) return '.' + p;
  return p;
}

function normalizeEntry(entry) {
  if (typeof entry === 'string') {
    return {
      path: normalizePath(entry),
      label: extractWeekLabel(entry),
      description: ''
    };
  }
  return {
    path: normalizePath(entry.path),
    label: entry.label || extractWeekLabel(entry.path || ''),
    description: entry.description || ''
  };
}

function buildPathCandidates(path) {
  const normalized = normalizePath(path);
  const candidates = [];
  const add = (p) => {
    if (!p || candidates.includes(p)) return;
    candidates.push(p);
  };

  add(normalized);
  add(String(normalized).replace(/^\.\//, ''));
  if (String(normalized).startsWith('../')) {
    add(String(normalized).replace(/^(\.\.\/)+/, ''));
  } else {
    add('../' + String(normalized).replace(/^\.\//, ''));
  }
  return candidates;
}

function buildGithubRawCandidates(url) {
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
}

async function fetchFirstAvailable(path) {
  const pathCandidates = buildPathCandidates(path);
  const urlCandidates = [];

  pathCandidates.forEach(p => {
    const u = new URL(p, location.href);
    u.searchParams.set('_t', Date.now().toString());
    urlCandidates.push(u.href);
    buildGithubRawCandidates(u).forEach(raw => {
      if (!urlCandidates.includes(raw)) urlCandidates.push(raw);
    });
  });

  let lastError = null;
  for (const href of urlCandidates) {
    try {
      const res = await fetch(href, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        return { text, href };
      }
      lastError = new Error('Not found: ' + path);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Not found: ' + path);
}

async function loadMarkdown(path) {
  try {
    const normalizedPath = normalizePath(path);
    // Check if loading the home/README page
    const isHomePage = normalizedPath.toLowerCase().endsWith('readme.md');
    if (isHomePage) {
      document.body.classList.add('home-view');
    } else {
      document.body.classList.remove('home-view');
    }
    
    // Resolve the markdown path relative to the site index so browsers
    // produce a proper absolute URL (handles spaces and ../ segments).
    const loaded = await fetchFirstAvailable(normalizedPath);
    let text = loaded.text;
    // compute base directory from the successful markdown URL so relative links/images resolve
    const baseUrl = new URL('.', loaded.href).href;

    // If the whole file is wrapped in a code fence like ```markdown ... ```
    // unwrap it so the content renders as markdown.
    if (/^```[\s\S]*```\s*$/.test(text)) {
      const m = text.match(/^```[^\n]*\n([\s\S]*?)\n```\s*$/);
      if (m) text = m[1];
    }

    // Preprocess markdown text to convert Windows absolute paths to relative filenames
    // Example: C:\Users\sarah\...\week05.gif  -> week05.gif
    text = text.replace(/(["'\(])([A-Za-z]:\\[^\)"']+)(["'\)])/g, (m, lead, p, trail) => {
      const parts = p.split(/[/\\\\]/);
      const filename = parts.pop();
      return lead + filename + trail;
    });

    // Render markdown to HTML, then fix image `src` attributes in the DOM so
    // relative links resolve against the markdown file's directory.
    const htmlRaw = marked.parse(text);
    const temp = document.createElement('div');
    temp.innerHTML = htmlRaw;
    temp.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src') || '';
      // normalize backslashes
      src = src.replace(/\\/g, '/');
      // leave absolute URLs alone
      if (/^(https?:)?\/\//i.test(src) || src.startsWith('/')) return;
      // resolve relative path against the markdown file's directory
      // Use the URL constructor to produce a correct absolute URL
      // (this handles spaces and ../ segments reliably).
      const resolved = new URL(src, baseUrl).href;
      img.src = resolved;
    });
    setContent(temp.innerHTML);
  } catch (err) {
    setContent('<p>Error loading file: ' + err.message + '</p>');
  }
}

function loadAsset(path) {
  const ext = path.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','svg','webp'].includes(ext)) {
    const assetUrl = new URL(path, location.href);
    assetUrl.searchParams.set('_t', Date.now().toString());
    setContent('<div class="asset-view"><img src="' + assetUrl.href + '" alt="" /></div>');
    return;
  }
  // fallback: try to fetch and display as text
  const assetUrl = new URL(path, location.href);
  assetUrl.searchParams.set('_t', Date.now().toString());
  fetch(assetUrl.href, { cache: 'no-store' }).then(r => r.text()).then(txt => setContent('<pre>' + txt.replace(/</g,'&lt;') + '</pre>'))
    .catch(e => setContent('<p>Error loading asset: ' + e.message + '</p>'));
}

function buildMenu(manifest) {
  const ul = document.querySelector('#menu ul');
  Object.keys(manifest).forEach(folder => {
    const files = manifest[folder] || [];
    
    // Special handling for single-file folders: load directly
    if (files.length === 1) {
      const entry = normalizeEntry(files[0]);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = folder;
      a.dataset.path = entry.path;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        loadMarkdown(entry.path);
        closeMenu();
      });
      li.appendChild(a);
      ul.appendChild(li);
      return;
    }
    
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = folder;
    a.dataset.folder = folder;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showFolderPage(manifest, folder);
      closeMenu();
    });
    li.appendChild(a);
    ul.appendChild(li);
  });
}

function showFolderPage(manifest, folder) {
  const files = manifest[folder] || [];
  const folderName = String(folder || '').trim().toLowerCase();
  const entries = files.map(normalizeEntry)
    .filter(item => item.path && item.path.toLowerCase().endsWith('.md'));

  if (folderName === 'makes') {
    if (entries.length === 0) {
      setContent('<p>No markdown pages listed for this folder.</p>');
      return;
    }

    // Inject lightweight styles for the makes grid (only once)
    if (!document.getElementById('makes-grid-styles')) {
      const s = document.createElement('style');
      s.id = 'makes-grid-styles';
      s.textContent = `
        .makes-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;padding:18px}
        .make-card{display:block;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);background:var(--card-bg,#fff);color:inherit;text-decoration:none}
        .make-thumb{height:160px;overflow:hidden;background:#111;display:flex;align-items:center;justify-content:center}
        .make-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .make-info{padding:12px}
        .make-info h3{margin:0 0 8px;font-size:1.05rem}
        .make-info p{margin:0;color:var(--muted,#666);font-size:.95rem}
      `;
      document.head.appendChild(s);
    }

    const cards = entries.map(item => {
      const thumbCandidate = String(item.path).replace(/\.md$/i, '.gif');
      const thumbUrl = new URL(thumbCandidate, location.href).href;
      const safeLabel = (escapeHtml(item.label) || '').replace(/'/g, "\\'");
      return '<a class="make-card" href="#" data-path="' + escapeHtml(item.path) + '">' +
        '<div class="make-thumb"><img src="' + escapeHtml(thumbUrl) + '" alt="' + escapeHtml(item.label) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=placeholderDataUrl(\'' + safeLabel + '\')" /></div>' +
        '<div class="make-info"><h3>' + escapeHtml(item.label) + '</h3><p>' + escapeHtml(item.description || '') + '</p></div>' +
      '</a>';
    }).join('');

    setContent('<section class="makes-grid">' + cards + '</section>');
    document.querySelectorAll('.make-card').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        loadMarkdown(a.dataset.path);
        closeMenu();
      });
    });
    return;
  }

  if (entries.length === 0) {
    setContent('<p>No markdown pages listed for this folder.</p>');
    return;
  }
  const list = document.createElement('ul');
  entries.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = item.label || item.path.replace('../','');
    a.dataset.path = item.path;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadMarkdown(item.path);
      closeMenu();
    });
    li.appendChild(a);
    if (item.description) {
      const desc = document.createElement('div');
      desc.className = 'list-item-desc';
      desc.textContent = item.description;
      li.appendChild(desc);
    }
    list.appendChild(li);
  });
  setContent('');
  document.getElementById('content').appendChild(list);
}

document.addEventListener('DOMContentLoaded', async () => {
  const manifest = await loadManifest();
  buildMenu(manifest);
  setMenuOpen(false);
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      toggleMenu();
    });
  }
  // Home header (README)
  document.getElementById('home-header').addEventListener('click', () => {
    loadMarkdown('../README.md');
    closeMenu();
  });
  // Initially load README
  loadMarkdown('../README.md');
});
