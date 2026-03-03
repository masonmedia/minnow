// import http from 'http';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const PORT = 3100;
// let clients = [];

// fs.watch(__dirname, { recursive: true }, (event, filename) => {
//   if (filename && !filename.startsWith('.') && !filename.includes('node_modules')) {
//     console.log(`\x1b[36m%s\x1b[0m`, `Change detected: ${filename}. Reloading...`);
//     clients.forEach(res => {
//       res.write('data: reload\n\n');
//     });
//     clients = []; 
//   }
// });

// http.createServer((req, res) => {
//   if (req.url === '/live-reload') {
//     res.writeHead(200, {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive'
//     });
//     return clients.push(res);
//   }

//   let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
//   const ext = path.extname(filePath);

//   const MIME_TYPES = {
//     '.html': 'text/html',
//     '.js': 'text/javascript',
//     '.css': 'text/css',
//     '.json': 'application/json',
//     '.png': 'image/png',
//     '.jpg': 'image/jpg',
//     '.svg': 'image/svg+xml',
//   };

//   fs.readFile(filePath, (err, content) => {
//     if (err) {
//       if (err.code === 'ENOENT') {
//         // CHECK: If requesting a specific file (has extension), return 404
//         // This includes /pages/*.html, /components/*.html, /data/*.json, etc.
//         if (ext) {
//           res.writeHead(404, { 'Content-Type': 'text/plain' });
//           return res.end('404 Not Found');
//         }
        
//         // SPA FALLBACK: Only for pretty URLs (no extension)
//         fs.readFile(path.join(__dirname, 'index.html'), (err, indexContent) => {
//           res.writeHead(200, { 'Content-Type': 'text/html' });
//           res.end(injectLiveReload(indexContent.toString()), 'utf-8');
//         });
//       } else {
//         res.writeHead(500);
//         res.end(`Server Error: ${err.code}`);
//       }
//     } else {
//       res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
//       const output = (ext === '.html' || !ext) 
//         ? injectLiveReload(content.toString()) 
//         : content;
//       res.end(output, 'utf-8');
//     }
//   });
// }).listen(PORT, () => {
//   console.log(`\x1b[32m%s\x1b[0m`, `Mini-Dev-Server running at http://localhost:${PORT}`);
//   console.log(`- Pretty URLs enabled (SPA Fallback)`);
//   console.log(`- Live Reload enabled`);
// });

// function injectLiveReload(html) {
//   const script = `
//     <script>
//       const source = new EventSource('/live-reload');
//       source.onmessage = (e) => {
//         if (e.data === 'reload') {
//           console.log('File change detected, reloading...');
//           location.reload();
//         }
//       };
//       source.onerror = () => {
//         setTimeout(() => location.reload(), 500);
//       };
//     </script>
//   `;
//   return html.replace('</body>', `${script}</body>`);
// }



import { exec } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT = 3100;
let clients = [];


// ── Page manifest scanner ─────────────────────────────────────────────────────
// Scans /pages/ recursively and generates manifest.json automatically.
// Filename conventions (mirrors Nuxt):
//   pages/about.html           →  /about
//   pages/index.html           →  /
//   pages/blog/[slug].html     →  /blog/:slug
//   pages/blog/[id]/edit.html  →  /blog/:id/edit
//
// Files with nav:"..." in their first <script> block get a nav label.
// nav label can be set by adding a comment: <!-- nav: My Label -->
// Otherwise nav is inferred from the filename (title-cased, no extension).
//
// Dynamic segments ([param]) sort after static routes so static wins.

function scanPages(pagesDir) {
    const routes = [];

    function walk(dir, urlBase) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
            if (entry.name === 'manifest.json') continue;

            if (entry.isDirectory()) {
                walk(path.join(dir, entry.name), `${urlBase}/${entry.name}`);
                continue;
            }

            if (!entry.name.endsWith('.html')) continue;

            const baseName = entry.name.replace(/\.html$/, '');
            const filePath = path.join(dir, entry.name);
            const relPath  = path.relative(__dirname, filePath).replace(/\\/g, '/');

            // Convert filename to URL segment
            // [slug] → :slug, index → ''
            const segment = baseName === 'index'
                ? ''
                : baseName.replace(/\[([^\]]+)\]/g, ':$1');

            const urlPath = segment
                ? `${urlBase}/${segment}`
                : urlBase || '/';

            // Detect nav label from <!-- nav: Label --> comment in file
            let navLabel = null;
            try {
                const src = fs.readFileSync(filePath, 'utf-8');
                const navMatch = src.match(/<!--\s*nav:\s*(.+?)\s*-->/);
                if (navMatch) navLabel = navMatch[1].trim();
            } catch {}

            const route = {
                path:      urlPath,
                component: `./${relPath}`
            };

            if (navLabel) route.nav = navLabel;

            routes.push(route);
        }
    }

    walk(pagesDir, '');

    // Sort: static routes before dynamic (:param) so they match first
    routes.sort((a, b) => {
        const aDynamic = a.path.includes(':');
        const bDynamic = b.path.includes(':');
        if (aDynamic && !bDynamic) return 1;
        if (!aDynamic && bDynamic) return -1;
        return a.path.localeCompare(b.path);
    });

    // Always put / first
    const rootIdx = routes.findIndex(r => r.path === '/');
    if (rootIdx > 0) {
        const [root] = routes.splice(rootIdx, 1);
        routes.unshift(root);
    }

    return routes;
}

function buildManifest() {
    const pagesDir = path.join(__dirname, 'pages');
    const routes   = scanPages(pagesDir);
    const manifest = JSON.stringify(routes, null, 2);
    const libDir  = path.join(__dirname, 'lib');
    const outPath = path.join(libDir, 'manifest.json');
    if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(outPath, manifest, 'utf-8');
    console.log(`\x1b[32m  ✓ manifest.json — ${routes.length} routes\x1b[0m`);
    routes.forEach(r => {
        console.log(`    \x1b[90m${r.path.padEnd(30)} → ${r.component}\x1b[0m`);
    });
    console.log('');
    return routes;
}

// Build manifest at startup
buildManifest();

// Rebuild manifest when pages/ changes (new/deleted files)
fs.watch(path.join(__dirname, 'pages'), { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith('.html')) return;
    console.log(`\x1b[36m  ↻ pages/${filename} — rebuilding manifest\x1b[0m`);
    buildManifest();
});

// ── Live reload watcher ───────────────────────────────────────────────────────
fs.watch(__dirname, { recursive: true }, (event, filename) => {
    if (!filename) return;
    if (filename.startsWith('.')) return;
    if (filename.includes('node_modules')) return;
    if (filename === 'serve.js') return;

    console.log(`\x1b[36m  ↻  ${filename}\x1b[0m`);
    clients.forEach(res => res.write('data: reload\n\n'));
    clients = [];
});

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html',
    '.js':   'text/javascript',
    '.mjs':  'text/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
};

// ── Request handler ───────────────────────────────────────────────────────────
http.createServer((req, res) => {

    // SSE endpoint for live reload
    if (req.url === '/live-reload') {
        res.writeHead(200, {
            'Content-Type':  'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
        });
        clients.push(res);
        req.on('close', () => {
            clients = clients.filter(c => c !== res);
        });
        return;
    }

    // Strip query strings
    const urlPath = req.url.split('?')[0];
    const ext     = path.extname(urlPath);
    const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

    // Try to serve the file from disk first.
    // If it exists, serve it (components, assets, lib/manifest.json etc.)
    // If it doesn't exist, it's a SPA route — fall back to index.html.
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
                    if (err2) { res.writeHead(500); return res.end('index.html not found'); }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(injectLiveReload(data2.toString()), 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
            return;
        }
        const mime = MIME[ext] || 'text/html';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(ext === '.html' ? injectLiveReload(data.toString()) : data);
    });


}).listen(PORT, () => {
    const url = `http://localhost:${PORT}`;

    console.log('');
    console.log(`\x1b[32m  Mini Dev Server\x1b[0m`);
    console.log(`  \x1b[1m${url}\x1b[0m`);
    console.log('');
    console.log('  \x1b[90m✓ SPA fallback (pretty URLs)\x1b[0m');
    console.log('  \x1b[90m✓ Live reload\x1b[0m');
    console.log('  \x1b[90m✓ ES module support\x1b[0m');
    console.log('');

    exec(`open http://localhost:${PORT}`);
});

// ── Live reload injection ─────────────────────────────────────────────────────
function injectLiveReload(html) {
    const script = `
<script>
  (() => {
    const src = new EventSource('/live-reload');
    src.onmessage = (e) => { if (e.data === 'reload') location.reload(); };
    src.onerror   = () => { src.close(); setTimeout(() => location.reload(), 1000); };
  })();
</\script>`;
    return html.includes('</body>')
        ? html.replace('</body>', `${script}\n</body>`)
        : html + script;
}