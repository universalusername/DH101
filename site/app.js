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

function extractWeekLabel(path) {
  const m = String(path).match(/week\s*(\d+)/i) || String(path).match(/week(\d+)/i);
  if (m) return 'Week ' + Number(m[1]);
  return String(path).replace('../', '');
}

function normalizeEntry(entry) {
  if (typeof entry === 'string') {
    return {
      path: entry,
      label: extractWeekLabel(entry),
      description: ''
    };
  }
  return {
    path: entry.path,
    label: entry.label || extractWeekLabel(entry.path || ''),
    description: entry.description || ''
  };
}

function buildPathCandidates(path) {
  const candidates = [];
  const add = (p) => {
    if (!p || candidates.includes(p)) return;
    candidates.push(p);
  };

  add(path);
  add(String(path).replace(/^\.\//, ''));
  if (String(path).startsWith('../')) {
    add(String(path).replace(/^(\.\.\/)+/, ''));
  } else {
    add('../' + String(path).replace(/^\.\//, ''));
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
    // Check if loading the home/README page
    const isHomePage = path.toLowerCase().endsWith('readme.md');
    if (isHomePage) {
      document.body.classList.add('home-view');
    } else {
      document.body.classList.remove('home-view');
    }
    
    // Resolve the markdown path relative to the site index so browsers
    // produce a proper absolute URL (handles spaces and ../ segments).
    const loaded = await fetchFirstAvailable(path);
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

  if (folderName === 'makes' || folderName === 'reflections' || folderName === 'relfections') {
    if (entries.length === 0) {
      setContent('<p>No markdown pages listed for this folder.</p>');
      return;
    }

    const isMakes = folderName === 'makes';
    const iconTypes = isMakes
      ? ['oceanic', 'gas-giant', 'lava', 'ringed', 'crystal', 'forest']
      : ['black-hole', 'astronaut', 'rocket', 'rover', 'star', 'comet'];
    const cards = entries.map((item, index) => {
      const iconType = iconTypes[index % iconTypes.length];
      const iconMarkup = isMakes
        ? '<span class="planet-core planet-core--planet" data-planet="' + iconType + '" aria-hidden="true"></span>'
        : '<span class="planet-core planet-core--space-image" aria-hidden="true">' +
            '<img class="space-icon-image" src="icons/' + encodeURIComponent(iconType) + '.svg" alt="" loading="lazy" decoding="async" />' +
          '</span>';
      return '<button class="planet-stop" data-path="' + escapeHtml(item.path) + '" style="--i:' + index + '">' +
        iconMarkup +
        '<span class="planet-info">' +
          '<span class="week-card-title">' + escapeHtml(item.label) + '</span>' +
          '<span class="week-card-desc">' + escapeHtml(item.description || 'Add description in manifest.json') + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    setContent('<section class="weeks-orbit">' + cards + '</section>');
    document.querySelectorAll('.planet-stop').forEach(btn => {
      btn.addEventListener('click', () => {
        loadMarkdown(btn.dataset.path);
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
