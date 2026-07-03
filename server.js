/* ============================================================
   server.js — Local dev server with HKO API proxy
   HK City Dashboard
   ============================================================
   Usage:
     npm install
     node server.js
   Then open http://localhost:3000
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 3000;
const HKO_HOST = 'www.weather.gov.hk';

// ── MIME types ──────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.xml':  'application/xml; charset=utf-8',
};

// ── Serve static files ──────────────────────────────────────
function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}

// ── Proxy HKO API ───────────────────────────────────────────
function proxyHko(res, hkoPath) {
  const options = {
    hostname: HKO_HOST,
    path: hkoPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      });
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy Error: ' + err.message);
  });

  proxyReq.end();
}

// ── Request handler ─────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── HKO API proxy route ──
  if (pathname.startsWith('/hko-proxy/')) {
    const hkoPath = pathname.replace('/hko-proxy', '');
    console.log(`[proxy] ${HKO_HOST}${hkoPath}`);
    proxyHko(res, hkoPath);
    return;
  }

  // ── Serve static files ──
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n  🌐 HK City Dashboard`);
  console.log(`  ─────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  HKO API: http://localhost:${PORT}/hko-proxy/\n`);
});