// Load manifest, build menu, and render markdown files from repo
let homeMarkup = '';

async function loadManifest() {
  const url = new URL('manifest.json', location.href);
  url.searchParams.set('_t', Date.now().toString());
  const res = await fetch(url.href, { cache: 'no-store' });
  return res.json();
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

function showHome() {
  if (homeMarkup) {
    setContent(homeMarkup);
  }
  closeMenu();
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
    const htmlRaw = marked.parse(text);
    const temp = document.createElement('div');
    temp.innerHTML = htmlRaw;

    // Preload images while still in a detached fragment to avoid DOM
    // normalization and race conditions. For each image, show a lightweight
    // placeholder, preload the cache-busted URL, then swap the src on the
    // original node once loaded.
    Array.from(temp.querySelectorAll('img')).forEach(img => {
      try {
        let src = img.getAttribute('src') || '';
        src = src.replace(/\\/g, '/');
        if (/^(https?:)?\/\//i.test(src)) return;
        if (src.startsWith('/')) src = '.' + src;

        const resolved = new URL(src, baseUrl).href;
        const sep = resolved.includes('?') ? '&' : '?';
        const preloadSrc = resolved + sep + '_cb=' + Date.now();

        // Start loading the actual asset URL (cache-busted) but keep it hidden
        // until it's fully decoded by the browser to avoid showing a broken
        // frame. The element is still in the detached fragment; once appended
        // it will continue loading.
        img.setAttribute('src', preloadSrc);
        img.style.visibility = 'hidden';
      } catch (e) {
        // ignore per-image errors
      }
    });

    // Insert into the live content element
    setContent('');
    const contentEl = document.getElementById('content');
    while (temp.firstChild) {
      contentEl.appendChild(temp.firstChild);
    }
    // After insertion, reveal images that successfully loaded; for any
    // image that hasn't decoded, attempt a manual reload with a fresh
    // cache-buster and reveal if successful.
    setTimeout(() => {
      Array.from(document.querySelectorAll('#content img')).forEach(img => {
        try {
          if (img.naturalWidth > 0) {
            img.style.visibility = '';
            return;
          }
          const cur = img.getAttribute('src') || img.src || '';
          const sep = cur.includes('?') ? '&' : '?';
          const testSrc = cur + sep + '_cbr=' + Date.now();
          const tester = new Image();
          tester.onload = () => { try { img.setAttribute('src', testSrc); img.style.visibility = ''; } catch (e) {} };
          tester.onerror = () => { /* leave hidden */, img.style.visibility = ''; };
          tester.src = testSrc;
        } catch (e) {
          try { img.style.visibility = ''; } catch (_) {}
        }
      });
    }, 250);
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
      src = src.replace(/\\/g, '/');
      if (/^(https?:)?\/\//i.test(src)) return;
      if (src.startsWith('/')) src = '.' + src;
      // Resolve relative path against the markdown file's directory and
      // append a timestamp query parameter to avoid cached/truncated responses.
      const assetUrl = new URL(src, baseUrl);
      // Some environments may normalize hrefs and drop synthetic params,
      // so append a cache-busting query string explicitly to force a fresh fetch.
      const sep = assetUrl.search ? '&' : '?';
      img.setAttribute('src', assetUrl.href + sep + '_cb=' + Date.now());
    });
    // Insert the DOM nodes directly into the content element rather than
    // serializing `innerHTML`. This preserves any attributes we set on the
    // elements (for example cache-busting query params on image `src`).
    setContent('');
    const contentEl = document.getElementById('content');
    while (temp.firstChild) {
      contentEl.appendChild(temp.firstChild);
    }
    // Replace inline images with fresh Image() instances that include a
    // cache-busting query param. Creating and inserting a new Image forces
    // the browser to fetch the resource again and avoids partial/truncated
    // responses that some clients may cache.
    // Stabilize image loading by preloading images and swapping in the
    // real src after the image fully loads. We keep the original <img>
    // node (so any anchors or surrounding markup remain) and only update
    // its `src` once the preload completes. While loading, we show a
    // placeholder SVG so layout remains stable.
    Array.from(document.querySelectorAll('#content img')).forEach(orig => {
      try {
        const cur = orig.getAttribute('src') || orig.src || '';
        if (!cur) return;
        // skip remote images on other origins
        if (/^(https?:)?\/\//i.test(cur) && !cur.startsWith(location.origin)) return;
        if (cur.includes('_cb=') || cur.includes('_t=')) return;

        // Show lightweight placeholder while we preload the real image
        const placeholder = placeholderDataUrl('Loading…');
        orig.setAttribute('src', placeholder);

        const sep = cur.includes('?') ? '&' : '?';
        const preloadSrc = cur + sep + '_cb=' + Date.now();
        const pre = new Image();
        pre.onload = () => {
          try {
            orig.setAttribute('src', preloadSrc);
          } catch (e) { /* ignore */ }
        };
        pre.onerror = () => {
          // on error, try fetching original URL without params once
          const fallback = new Image();
          fallback.onload = () => { try { orig.setAttribute('src', cur); } catch (e) {} };
          fallback.onerror = () => { /* leave placeholder */ };
          fallback.src = cur;
        };
        pre.src = preloadSrc;
      } catch (e) {
        // ignore per-image errors
      }
    });
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
    // Render four links to the Makes subfolders (Make4, Make6, Make9, Make12)
    const makesFolders = [
      { path: './Makes/make4.md', label: 'Make 4' },
      { path: './Makes/make6.md', label: 'Make 6' },
      { path: './Makes/make9.md', label: 'Make 9' },
      { path: './Makes/make12.md', label: 'Make 12' }
    ];

    const list = document.createElement('ul');
    list.className = 'makes-folder-list';
    makesFolders.forEach(f => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = f.label;
      a.dataset.path = f.path;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        loadMarkdown(f.path);
        closeMenu();
      });
      li.appendChild(a);
      list.appendChild(li);
    });

    setContent('');
    document.getElementById('content').appendChild(list);
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
  const content = document.getElementById('content');
  homeMarkup = content ? content.innerHTML : '';
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
  document.getElementById('home-header').addEventListener('click', showHome);
  if (content) {
    content.addEventListener('click', (event) => {
      const button = event.target.closest('[data-home-action]');
      if (!button) return;
      const action = button.getAttribute('data-home-action');
      if (action === 'open-menu') {
        setMenuOpen(true);
        return;
      }
      if (action === 'go-about') {
        loadMarkdown('./Pages/about.md');
      }
    });
  }
  // Start on the clean home state already defined in the HTML.
  showHome();
});
