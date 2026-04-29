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
  return String(path).replace('../', '').replace('./', '');
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
      if (/^(https?:)?\/\//i.test(src)) return;
      if (src.startsWith('/')) src = '.' + src;
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
        .makes-grid{display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-content:flex-start;justify-content:center}
        .make-card{display:block;overflow:hidden;border:1px solid #000;background:#fff;color:#111;text-decoration:none;transition:outline 0.2s ease;width:220px}
        .make-card:hover{outline:2px solid #000}
        .make-thumb{height:160px;overflow:hidden;background:#f2f2f2;display:flex;align-items:center;justify-content:center}
        .make-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .make-info{padding:12px}
        .make-info h3{margin:0 0 8px;font-size:1.05rem;color:#111}
        .make-info p{margin:0;color:#666;font-size:.95rem}
        .make4-card{cursor:pointer;background:#fff;border:1px solid #000;padding:0;width:240px;height:auto;transition:outline 0.2s ease;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .make4-card:hover{outline:2px solid #000}
        .crt-body{position:relative;width:220px;height:170px;background:linear-gradient(180deg,#EEDDBA 0%,#D1B08A 100%);border-radius:8px;padding:10px;border:3px solid #5a3b2a;box-shadow:0 8px 18px rgba(0,0,0,0.25);display:flex;flex-direction:column;align-items:center}
        .crt-antenna{position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:0;height:0;z-index:6}
        .crt-antenna-left{position:absolute;width:28px;height:3px;background:#2a2a2a;top:-6px;left:-16px;transform:rotate(-58deg);transform-origin:right center;border-radius:1.5px}
        .crt-antenna-right{position:absolute;width:28px;height:3px;background:#2a2a2a;top:-6px;right:-16px;transform:rotate(58deg);transform-origin:left center;border-radius:1.5px}
        .crt-screen-frame{position:relative;width:100%;height:62%;background:#4a3526;border-radius:6px;padding:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid #2f1f14}
        .crt-screen{width:100%;height:100%;background:transparent;border-radius:4px;overflow:hidden;position:relative;box-shadow:inset 0 0 6px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center}
        .sketchfab-embed-wrapper{width:100%;height:100%;display:block;border-radius:4px;overflow:hidden}
        .sketchfab-embed-wrapper iframe{width:100%;height:100%;border:0;display:block}
        .crt-screen::before{content:'';position:absolute;top:6%;left:8%;width:48%;height:40%;background:radial-gradient(circle at 25% 25%,rgba(255,255,255,0.25),transparent);pointer-events:none;border-radius:40%;z-index:2}
        .crt-controls{position:absolute;right:12px;top:52%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px}
        .crt-knob{width:18px;height:18px;background:radial-gradient(circle at 30% 30%,#FFD27A,#B8861B);border-radius:50%;box-shadow:0 3px 6px rgba(0,0,0,0.35),inset -1px -1px 2px rgba(0,0,0,0.3);position:relative;border:1px solid rgba(0,0,0,0.15)}
        .crt-knob::before{content:'';position:absolute;width:2px;height:6px;background:#333;top:3px;left:50%;transform:translateX(-50%);border-radius:1px}
        .crt-stand{position:relative;width:100%;height:36px;flex-shrink:0;display:flex;align-items:flex-start;justify-content:center}
        .crt-shelf{position:absolute;bottom:6px;width:140px;height:10px;background:linear-gradient(180deg,#C9A66F,#A77B45);border-radius:4px;left:50%;transform:translateX(-50%);box-shadow:0 4px 8px rgba(0,0,0,0.2)}
        .crt-leg-left{position:absolute;bottom:-2px;left:26%;width:6px;height:34px;background:linear-gradient(180deg,#2a2a2a,#111);border-radius:2px;transform:skewX(6deg)}
        .crt-leg-right{position:absolute;bottom:-2px;right:26%;width:6px;height:34px;background:linear-gradient(180deg,#2a2a2a,#111);border-radius:2px;transform:skewX(-6deg)}
        .crt-label{display:none}
        .make4-info{display:none}
        .make6-card{display:block;overflow:hidden;border:1px solid #000;background:#fff;color:#111;text-decoration:none;transition:outline 0.2s ease;width:240px}
        .make6-card:hover{outline:2px solid #000}
        .make6-card .sketchfab-embed-wrapper{background:#f2f2f2}
      `;
      document.head.appendChild(s);
    }

    const cards = entries.map(item => {
      const rawPath = String(item.path || '');
      const decodedPath = (function(p){ try { return decodeURIComponent(p); } catch(e){ return p } })(rawPath);
      const isMake4 = /make(?:%20|\s*)4/i.test(rawPath) || /make\s*4/i.test(decodedPath) || /make\s*4/i.test(String(item.label || ''));
      const isMake6 = /make(?:%20|\s*)6/i.test(rawPath) || /make\s*6/i.test(decodedPath) || /make\s*6/i.test(String(item.label || ''));
      const safeLabel = (escapeHtml(item.label) || '').replace(/'/g, "\\'");
      
      if (isMake4) {
        // Make 4: use the Sketchfab embed itself as the clickable icon (no TV wrapper)
        return '<a class="make4-card" href="#" data-path="' + escapeHtml(item.path) + '">' +
          '<div class="sketchfab-embed-wrapper">' +
            '<iframe title="Retro CRT TV" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/6bc462b233ce4c78904dfcadf5123e29/embed?autostart=1&camera=0"></iframe>' +
          '</div>' +
        '</a>';
      }
      if (isMake6) {
        // Make 6: Sketchfab Earth Globe embed as clickable icon
        return '<a class="make6-card" href="#" data-path="' + escapeHtml(item.path) + '">' +
          '<div class="sketchfab-embed-wrapper">' +
            '<iframe title="Earth Globe - Atlas" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/cd178e25a0e6436380b15fc1539a25f2/embed?autostart=1&camera=0&ui_hint=0"></iframe>' +
            '<p style="font-size:13px;font-weight:normal;margin:6px;color:#4A4A4A;text-align:center;">' +
              '<a href="https://sketchfab.com/3d-models/earth-globe-atlas-cd178e25a0e6436380b15fc1539a25f2?utm_medium=embed&utm_campaign=share-popup&utm_content=cd178e25a0e6436380b15fc1539a25f2" target="_blank" rel="nofollow" style="font-weight:bold;color:#1CAAD9;">Earth Globe - Atlas</a> by <a href="https://sketchfab.com/rjgarnicap?utm_medium=embed&utm_campaign=share-popup&utm_content=cd178e25a0e6436380b15fc1539a25f2" target="_blank" rel="nofollow" style="font-weight:bold;color:#1CAAD9;">Ricardo Garnica</a> on <a href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=cd178e25a0e6436380b15fc1539a25f2" target="_blank" rel="nofollow" style="font-weight:bold;color:#1CAAD9;">Sketchfab</a>' +
            '</p>' +
          '</div>' +
        '</a>';
      }
      
      // Regular image-based cards
      const thumbCandidate = String(item.path).replace(/\.md$/i, '.gif');
      const thumbUrl = new URL(thumbCandidate, location.href).href;
      return '<a class="make-card" href="#" data-path="' + escapeHtml(item.path) + '">' +
        '<div class="make-thumb"><img src="' + escapeHtml(thumbUrl) + '" alt="' + escapeHtml(item.label) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=placeholderDataUrl(\'' + safeLabel + '\')" /></div>' +
        '<div class="make-info"><h3>' + escapeHtml(item.label) + '</h3><p>' + escapeHtml(item.description || '') + '</p></div>' +
      '</a>';
    }).join('');

    setContent('<section class="makes-grid">' + cards + '</section>');
    document.querySelectorAll('.make-card, .make4-card, .make6-card').forEach(a => {
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
  // Home header resets the content area
  document.getElementById('home-header').addEventListener('click', () => {
    setContent('');
    closeMenu();
  });
  // Start on a blank home state
  setContent('');
});
