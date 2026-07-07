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
const GMB_HOST = 'data.etagmb.gov.hk';
const HKIA_HOST = 'www.hongkongairport.com';
const HKIA_PATH = '/flightinfo-rest/rest/flights';

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

// ── Proxy GMB API ──────────────────────────────────────────
function proxyGmb(res, gmbPath) {
  const options = {
    hostname: GMB_HOST,
    path: gmbPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      });
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    console.error('GMB Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy Error: ' + err.message);
  });

  proxyReq.end();
}

// ── Proxy HKIA flight API ──────────────────────────────────
function proxyHkia(res, queryString) {
  // Build the upstream path with provided query string
  // e.g. ?span=1&date=2026-07-07&lang=en&cargo=false&arrival=false
  const upstreamPath = `${HKIA_PATH}${queryString || ''}`;

  const options = {
    hostname: HKIA_HOST,
    path: upstreamPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,zh-HK;q=0.8',
      'Referer': 'https://www.hongkongairport.com/en/flights/passenger.page',
      'Origin': 'https://www.hongkongairport.com',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      });
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    console.error('HKIA Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'HKIA Proxy Error: ' + err.message }));
  });

  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'HKIA request timeout' }));
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

  // ── GMB API proxy route ──
  if (pathname.startsWith('/gmb-proxy/')) {
    const gmbPath = pathname.replace('/gmb-proxy', '');
    console.log(`[proxy] ${GMB_HOST}${gmbPath}`);
    proxyGmb(res, gmbPath);
    return;
  }

  // ── HKIA flight proxy route ──
  if (pathname.startsWith('/hkia-flights')) {
    const queryString = url.search || '';
    console.log(`[proxy] ${HKIA_HOST}${HKIA_PATH}${queryString}`);
    proxyHkia(res, queryString);
    return;
  }

  // ── Serve static files ──
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n  🌐 HK City Dashboard`);
  console.log(`  ─────────────────────`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  HKO API:  http://localhost:${PORT}/hko-proxy/`);
  console.log(`  GMB API:  http://localhost:${PORT}/gmb-proxy/`);
  console.log(`  HKIA API: http://localhost:${PORT}/hkia-flights\n`);
});