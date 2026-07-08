# HK Dashboard CORS Proxy

A [CORS Anywhere](https://github.com/Rob--W/cors-anywhere) proxy for the HK City Dashboard, deployed on Render.

## Deploy to Render

1. Push this folder to a GitHub repository
2. Go to [Render.com](https://render.com) and sign up (free tier)
3. Click **New +** → **Web Service**
4. Connect your GitHub repo
5. Configure:
   - **Name**: `hk-cors-proxy` (or any name you like)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
6. Click **Create Web Service**
7. Wait for deploy to finish (2-3 minutes)
8. Render gives you a URL like: `https://hk-cors-proxy.onrender.com`

## Usage

Once deployed, use the proxy URL as a prefix for any API request:

```
https://hk-cors-proxy.onrender.com/https://www.hongkongairport.com/flightinfo-rest/rest/flights?span=1&date=2026-07-08&lang=en&cargo=false&arrival=false
```

## Update your dashboard

In `js/flights.js` and `js/typhoon.js`, set:

```js
const CORS_PROXY_BASE = 'https://hk-cors-proxy.onrender.com';
```