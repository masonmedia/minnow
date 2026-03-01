import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3100;
let clients = [];

fs.watch(__dirname, { recursive: true }, (event, filename) => {
  if (filename && !filename.startsWith('.') && !filename.includes('node_modules')) {
    console.log(`\x1b[36m%s\x1b[0m`, `Change detected: ${filename}. Reloading...`);
    clients.forEach(res => {
      res.write('data: reload\n\n');
    });
    clients = []; 
  }
});

http.createServer((req, res) => {
  if (req.url === '/live-reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    return clients.push(res);
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // CHECK: If requesting a specific file (has extension), return 404
        // This includes /pages/*.html, /components/*.html, /data/*.json, etc.
        if (ext) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        
        // SPA FALLBACK: Only for pretty URLs (no extension)
        fs.readFile(path.join(__dirname, 'index.html'), (err, indexContent) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(injectLiveReload(indexContent.toString()), 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
      const output = (ext === '.html' || !ext) 
        ? injectLiveReload(content.toString()) 
        : content;
      res.end(output, 'utf-8');
    }
  });
}).listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `Mini-Dev-Server running at http://localhost:${PORT}`);
  console.log(`- Pretty URLs enabled (SPA Fallback)`);
  console.log(`- Live Reload enabled`);
});

function injectLiveReload(html) {
  const script = `
    <script>
      const source = new EventSource('/live-reload');
      source.onmessage = (e) => {
        if (e.data === 'reload') {
          console.log('File change detected, reloading...');
          location.reload();
        }
      };
      source.onerror = () => {
        setTimeout(() => location.reload(), 500);
      };
    </script>
  `;
  return html.replace('</body>', `${script}</body>`);
}