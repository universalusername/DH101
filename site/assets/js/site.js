/* Site JS: build sidebar from JSON and render markdown files with marked.js */

async function loadFileList(){
  try{
    const res = await fetch('data/files.json');
    const files = await res.json();
    buildNav(files);
  }catch(e){
    console.error('Could not load files.json', e);
    document.getElementById('nav').innerHTML = '<p class="error">Could not load navigation data.</p>';
  }
}

function buildNav(files){
  const nav = document.getElementById('nav');
  nav.innerHTML='';

  const order = ['pages','makes','reflections','ai-log','assets'];
  order.forEach(key => {
    if(!files[key]) return;
    const section = document.createElement('section');
    section.className='nav-section';
    const h = document.createElement('h3');
    h.textContent = key.replace('-',' ').replace(/\b\w/g, c=>c.toUpperCase());
    section.appendChild(h);
    const ul = document.createElement('ul');
    files[key].forEach(f => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = f;
      a.addEventListener('click', (e) => { e.preventDefault(); loadMarkdown(`${key}/${f}`) });
      li.appendChild(a);
      ul.appendChild(li);
    });
    section.appendChild(ul);
    nav.appendChild(section);
  });

  // also add README / LICENSE
  const misc = document.createElement('section'); misc.className='nav-section';
  const mh = document.createElement('h3'); mh.textContent='Repository'; misc.appendChild(mh);
  const mul = document.createElement('ul');
  ['README.md','LICENSE'].forEach(f=>{
    const li=document.createElement('li'); const a=document.createElement('a'); a.href='#'; a.textContent=f;
    a.addEventListener('click', (e)=>{e.preventDefault(); loadMarkdown(f)});
    li.appendChild(a); mul.appendChild(li);
  });
  misc.appendChild(mul); nav.appendChild(misc);
}

async function loadMarkdown(path){
  const page = document.getElementById('page');
  page.innerHTML = '<p>Loading...</p>';
  try{
    const res = await fetch('../' + path);
    if(!res.ok) throw new Error('Not found');
    const text = await res.text();
    page.innerHTML = marked.parse(text);
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){
    page.innerHTML = `<p>Could not load <strong>${path}</strong>. Make sure you are serving this site over HTTP (e.g., GitHub Pages or a local static server).</p>`;
  }
}

// nav toggle (frog) — collapses on desktop, slides in on small screens
const toggle = document.getElementById('nav-toggle');
const sidebar = document.getElementById('sidebar');
toggle?.addEventListener('click', ()=>{
  if(window.innerWidth < 900){
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    toggle.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
  }
});

// ensure mobile-open sidebars are closed when resizing up
window.addEventListener('resize', ()=>{ if(window.innerWidth >= 900) sidebar.classList.remove('open') });

loadFileList();
