// Load manifest, build menu, and render markdown files from repo
async function loadManifest() {
  const res = await fetch('manifest.json');
  return res.json();
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
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

async function loadMarkdown(path) {
  try {
    // Resolve the markdown path relative to the site index so browsers
    // produce a proper absolute URL (handles spaces and ../ segments).
    const mdUrl = new URL(path, location.href).href;
    const res = await fetch(mdUrl);
    if (!res.ok) throw new Error('Not found: ' + path);
    let text = await res.text();
    // compute base directory for the markdown file so relative links/images resolve
    const base = path.replace(/[^\\/]+$/, '');

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
      const resolved = new URL(base + src, location.href).href;
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
    setContent('<div class="asset-view"><img src="' + encodeURI(path) + '" alt="" /></div>');
    return;
  }
  // fallback: try to fetch and display as text
  fetch(encodeURI(path)).then(r => r.text()).then(txt => setContent('<pre>' + txt.replace(/</g,'&lt;') + '</pre>'))
    .catch(e => setContent('<p>Error loading asset: ' + e.message + '</p>'));
}

function buildMenu(manifest) {
  const ul = document.querySelector('#menu ul');
  Object.keys(manifest).forEach(folder => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = folder;
    a.dataset.folder = folder;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showFolderPage(manifest, folder);
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

    const planetTypes = ['oceanic', 'gas-giant', 'lava', 'ringed', 'crystal', 'forest'];
    const cards = entries.map((item, index) => {
      const planetType = planetTypes[index % planetTypes.length];
      return '<button class="planet-stop" data-path="' + escapeHtml(item.path) + '" style="--i:' + index + '">' +
        '<span class="planet-core" data-planet="' + planetType + '" aria-hidden="true"></span>' +
        '<span class="planet-info">' +
          '<span class="week-card-title">' + escapeHtml(item.label) + '</span>' +
          '<span class="week-card-desc">' + escapeHtml(item.description || 'Add description in manifest.json') + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    setContent('<section class="weeks-orbit">' + cards + '</section>');
    document.querySelectorAll('.planet-stop').forEach(btn => {
      btn.addEventListener('click', () => loadMarkdown(btn.dataset.path));
    });
    return;
  }

  if (folderName === 'reflections' || folderName === 'relfections') {
    if (entries.length === 0) {
      setContent('<p>No markdown pages listed for this folder.</p>');
      return;
    }

    const stopPlan = [
      { name: 'Sun', type: 'sun' },
      { name: 'Mercury', type: 'mercury' },
      { name: 'Venus', type: 'venus' },
      { name: 'Earth', type: 'earth' },
      { name: "Earth's Moon", type: 'moon' },
      { name: 'Mars', type: 'mars' },
      { name: 'Asteroid Belt', type: 'asteroid-belt' },
      { name: 'Jupiter', type: 'jupiter' },
      { name: 'Saturn', type: 'saturn' },
      { name: 'Uranus', type: 'uranus' },
      { name: 'Neptune', type: 'neptune' },
      { name: 'Pluto', type: 'pluto' },
      { name: 'Empty Space', type: 'empty-space' }
    ];

    const cards = entries.map((item, index) => {
      const stop = stopPlan[index] || {
        name: 'Deep Space',
        type: 'empty-space'
      };
      const weekLabel = item.label || ('Week ' + (index + 1));
      const subtitle = item.description || 'Add description in manifest.json';

      return '<button class="solar-stop-card" data-path="' + escapeHtml(item.path) + '">' +
        '<span class="solar-icon" data-stop="' + stop.type + '" aria-hidden="true"></span>' +
        '<span class="solar-copy">' +
          '<span class="solar-title">' + escapeHtml(weekLabel) + '</span>' +
          '<span class="solar-desc">' + escapeHtml(subtitle) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    setContent('<section class="solar-journey-map">' + cards + '</section>');
    document.querySelectorAll('.solar-stop-card').forEach(btn => {
      btn.addEventListener('click', () => loadMarkdown(btn.dataset.path));
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
  // Home link (README)
  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    loadMarkdown('../README.md');
  });
  // Initially load README
  loadMarkdown('../README.md');
});
