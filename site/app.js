// Load manifest, build menu, and render markdown files from repo
async function loadManifest() {
  const res = await fetch('manifest.json');
  return res.json();
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
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
  // Only show markdown pages in the folder menu; images and other assets
  // should be embedded inside the markdown files themselves.
  const mdFiles = files.filter(p => p.toLowerCase().endsWith('.md'));
  if (mdFiles.length === 0) {
    setContent('<p>No markdown pages listed for this folder.</p>');
    return;
  }
  const list = document.createElement('ul');
  mdFiles.forEach(p => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = p.replace('../','');
    a.dataset.path = p;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadMarkdown(p);
    });
    li.appendChild(a);
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
