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
    const res = await fetch(encodeURI(path));
    if (!res.ok) throw new Error('Not found: ' + path);
    const text = await res.text();
    const html = marked.parse(text);
    setContent(html);
  } catch (err) {
    setContent('<p>Error loading file: ' + err.message + '</p>');
  }
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
  if (files.length === 0) {
    setContent('<p>No files listed for this folder.</p>');
    return;
  }
  const list = document.createElement('ul');
  files.forEach(p => {
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
