/* ============================================================
   cors-proxy/server.js — CORS Anywhere proxy for HK Dashboard
   ============================================================
   Deploy to Render:
   1. Push this folder to a GitHub repo
   2. On Render.com → New Web Service → connect your repo
   3. Set:
      - Start Command: node server.js
   4. Deploy — Render gives you a URL like:
      https://hk-cors-proxy.onrender.com
   ============================================================ */

const cors_proxy = require('cors-anywhere');

const host = '0.0.0.0';
const port = process.env.PORT || 8080;

cors_proxy.createServer({
  // Allow requests that include an Origin or X-Requested-With header
  requireHeader: ['origin', 'x-requested-with'],
  // Don't forward cookies to the target
  removeHeaders: ['cookie', 'cookie2'],
  // Keep same-origin redirects working
  redirectSameOrigin: true,
  // Set a helpful User-Agent
  setHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
}).listen(port, host, () => {
  console.log(`CORS Anywhere proxy running on ${host}:${port}`);
  console.log(`Usage: ${host === '0.0.0.0' ? 'http://localhost:' + port : host + ':' + port}/https://target-api.com/path`);
});