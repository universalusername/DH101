DH101 — Forest-themed site

Quick start:

- Serve this folder with a local static server so markdown files can be fetched and rendered. Example (Windows PowerShell):

  python -m http.server 8000

- Open http://localhost:8000/index.html

Notes:
- The background photo is from Unsplash ("the sun is shining through the trees in the forest" by Joshua Earle). If you prefer a different image, replace the URL in `assets/css/forest.css` (the `background-image` value).
- The site uses `marked.js` (via CDN) to render repository markdown files in the main pane. For best results, host on GitHub Pages or another static server.

Attribution:
- Background: Joshua Earle — https://unsplash.com/photos/the-sun-is-shining-through-the-trees-in-the-forest-8H95uffbu-g
