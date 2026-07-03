/* ============================================================
   typhoon.js — Tropical Cyclone Track Map (Leaflet + HKO XML)
   香港城市儀表板 v2
   ============================================================ */

'use strict';

/* ── Fetch helper ──────────────────────────────────────────── */
// Strategy:
//   1. Try the local dev server proxy (http://localhost:3000/hko-proxy/...)
//      — works when the dashboard is served via the local Node.js server.
//   2. Fall back to direct fetch — works when served from a real HTTP
//      server with proper CORS headers, or when the HKO API adds them.
//   3. Fall back to a CORS proxy as last resort.

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

function toHkoProxyUrl(url) {
  // Convert http:// to https:// for HKO URLs
  const safe = url.replace(/^http:\/\//i, 'https://');
  // Extract the path from the HKO URL
  const hkoUrl = new URL(safe);
  return `http://localhost:3000/hko-proxy${hkoUrl.pathname}${hkoUrl.search}`;
}

async function fetchWithFallback(url) {
  // 1. Try local dev server proxy
  try {
    const proxyUrl = toHkoProxyUrl(url);
    const res = await fetch(proxyUrl, { mode: 'cors' });
    if (res.ok) return res;
  } catch (_) { /* fall through */ }

  // 2. Try direct fetch (works when served from a real HTTP server)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) return res;
  } catch (_) { /* fall through */ }

  // 3. Try external CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url));
      if (res.ok) return res;
    } catch (_) { /* try next */ }
  }

  throw new Error('Failed to fetch: ' + url);
}

const TC_LIST_URL = 'https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml';

/* ── Parse HKO TC track XML ────────────────────────────────── */
function parseTcTrackXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const getTagText = (parent, tag) => {
    const el = parent.querySelector(tag);
    return el ? el.textContent.trim() : '';
  };

  // Bulletin info
  const bulletinTime = getTagText(doc, 'BulletinTime');

  // TC name
  const tcName = getTagText(doc, 'TropicalCycloneName');

  // Past positions
  const pastEntries = doc.querySelectorAll('PastInformation');
  const pastPositions = [];
  pastEntries.forEach(entry => {
    const latStr = getTagText(entry, 'Latitude');
    const lonStr = getTagText(entry, 'Longitude');
    const lat = parseCoord(latStr);
    const lon = parseCoord(lonStr);
    if (lat != null && lon != null) {
      pastPositions.push({
        index: parseInt(getTagText(entry, 'Index'), 10),
        lat, lon,
        intensity: getTagText(entry, 'Intensity'),
        wind: getTagText(entry, 'MaximumWind'),
        time: getTagText(entry, 'Time'),
      });
    }
  });

  // Analysis (current position)
  const analysis = doc.querySelector('AnalysisInformation');
  let currentPos = null;
  if (analysis) {
    const latStr = getTagText(analysis, 'Latitude');
    const lonStr = getTagText(analysis, 'Longitude');
    const lat = parseCoord(latStr);
    const lon = parseCoord(lonStr);
    if (lat != null && lon != null) {
      currentPos = {
        lat, lon,
        intensity: getTagText(analysis, 'Intensity'),
        wind: getTagText(analysis, 'MaximumWind'),
        time: getTagText(analysis, 'Time'),
        pressure: getTagText(analysis, 'Pressure'),
        movement: getTagText(analysis, 'Movement'),
        speed: getTagText(analysis, 'Speed'),
      };
    }
  }

  // Forecast positions
  const forecastEntries = doc.querySelectorAll('ForecastInformation');
  const forecastPositions = [];
  forecastEntries.forEach(entry => {
    const latStr = getTagText(entry, 'Latitude');
    const lonStr = getTagText(entry, 'Longitude');
    const lat = parseCoord(latStr);
    const lon = parseCoord(lonStr);
    if (lat != null && lon != null) {
      forecastPositions.push({
        index: parseInt(getTagText(entry, 'Index'), 10),
        lat, lon,
        intensity: getTagText(entry, 'Intensity'),
        wind: getTagText(entry, 'MaximumWind'),
        time: getTagText(entry, 'Time'),
      });
    }
  });

  // Potential Track Area polygon (if exists)
  const areaEntries = doc.querySelectorAll('PotentialTrackArea > Location');
  const polygonCoords = [];
  areaEntries.forEach(entry => {
    const latStr = getTagText(entry, 'Latitude');
    const lonStr = getTagText(entry, 'Longitude');
    const lat = parseCoord(latStr);
    const lon = parseCoord(lonStr);
    if (lat != null && lon != null) {
      polygonCoords.push([lat, lon]);
    }
  });

  return {
    bulletinTime,
    tcName,
    pastPositions,
    currentPos,
    forecastPositions,
    polygonCoords,
  };
}

/* ── Parse coordinate like "14.00N" or "118.10E" ──────────── */
function parseCoord(str) {
  if (!str) return null;
  const m = str.match(/^([\d.]+)([NSEW])$/);
  if (!m) return null;
  let val = parseFloat(m[1]);
  if (isNaN(val)) return null;
  if (m[2] === 'S' || m[2] === 'W') val = -val;
  return val;
}

/* ── Intensity color mapping ───────────────────────────────── */
function getIntensityColor(intensity) {
  const map = {
    'Super Typhoon': '#dc2626',
    'Severe Typhoon': '#ea580c',
    'Typhoon': '#f59e0b',
    'Severe Tropical Storm': '#84cc16',
    'Tropical Storm': '#22d3ee',
    'Tropical Depression': '#60a5fa',
    'Low Pressure Area': '#94a3b8',
  };
  return map[intensity] || '#94a3b8';
}

/* ── Format time for display ───────────────────────────────── */
function formatTcTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('zh-HK', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: 'Asia/Hong_Kong',
    });
  } catch (e) {
    return isoStr;
  }
}

/* ── Main fetch + render ───────────────────────────────────── */
async function fetchTyphoonData() {
  const mapEl = document.getElementById('typhoon-map');
  const infoEl = document.getElementById('typhoon-info-table');
  const statusEl = document.getElementById('typhoon-status');
  if (!mapEl) return;

  // Show loading
  if (statusEl) statusEl.textContent = '正在載入熱帶氣旋資料…';

  try {
    // 1. Fetch TC list
    const listRes = await fetchWithFallback(TC_LIST_URL);
    if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
    const listXml = await listRes.text();
    const listDoc = new DOMParser().parseFromString(listXml, 'text/xml');

    const tcEntries = listDoc.querySelectorAll('TropicalCyclone');
    if (!tcEntries.length) {
      if (statusEl) statusEl.textContent = '目前沒有活躍的熱帶氣旋 No active tropical cyclones';
      if (mapEl) mapEl.innerHTML = '';
      if (infoEl) infoEl.innerHTML = '';
      return;
    }

    // Use the first TC (most recent/active)
    const tc = tcEntries[0];
    const tcId = tc.querySelector('TropicalCycloneID')?.textContent?.trim() || '';
    const tcCnName = tc.querySelector('TropicalCycloneChineseName')?.textContent?.trim() || '';
    const tcEnName = tc.querySelector('TropicalCycloneEnglishName')?.textContent?.trim() || '';
    const tcUrl = tc.querySelector('TropicalCycloneURL')?.textContent?.trim() || '';

    if (!tcUrl) {
      if (statusEl) statusEl.textContent = '無法取得熱帶氣旋路徑資料';
      return;
    }

    // 2. Fetch individual track XML
    const trackRes = await fetchWithFallback(tcUrl);
    if (!trackRes.ok) throw new Error(`HTTP ${trackRes.status}`);
    const trackXml = await trackRes.text();
    const data = parseTcTrackXml(trackXml);

    if (!data.currentPos && !data.pastPositions.length) {
      if (statusEl) statusEl.textContent = '暫無路徑資料';
      return;
    }

    // 3. Render map
    renderTyphoonMap(data, tcCnName, tcEnName, tcId);

    // 4. Render info table
    renderTyphoonInfo(data, tcCnName, tcEnName, tcId);

    if (statusEl) statusEl.textContent = `更新時間：${data.bulletinTime ? formatTcTime(data.bulletinTime) : '--'} · 資料來源：香港天文台`;

  } catch (e) {
    console.error('Typhoon fetch error:', e);
    if (statusEl) statusEl.textContent = '無法載入熱帶氣旋資料';
    if (mapEl) mapEl.innerHTML = '';
    if (infoEl) infoEl.innerHTML = '';
  }
}

/* ── Render Leaflet map ────────────────────────────────────── */
let typhoonMapInstance = null;

function renderTyphoonMap(data, cnName, enName, tcId) {
  const mapEl = document.getElementById('typhoon-map');
  if (!mapEl) return;

  // Destroy previous map instance
  if (typhoonMapInstance) {
    typhoonMapInstance.remove();
    typhoonMapInstance = null;
  }

  // Clear container
  mapEl.innerHTML = '';

  // Determine bounds to fit all points
  const allPoints = [];
  data.pastPositions.forEach(p => allPoints.push([p.lat, p.lon]));
  if (data.currentPos) allPoints.push([data.currentPos.lat, data.currentPos.lon]);
  data.forecastPositions.forEach(p => allPoints.push([p.lat, p.lon]));

  if (!allPoints.length) {
    mapEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-faint)">暫無路徑資料</div>';
    return;
  }

  // Initialize map
  const map = L.map(mapEl, {
    zoomControl: true,
    attributionControl: false,
  });

  // Add dark tile layer (matches dashboard theme)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
  }).addTo(map);

  // Fit bounds with padding
  const bounds = L.latLngBounds(allPoints);
  map.fitBounds(bounds, { padding: [40, 40] });

  // ── 1. Potential Track Area polygon (if exists) ──
  if (data.polygonCoords.length >= 3) {
    L.polygon(data.polygonCoords, {
      color: '#f59e0b',
      weight: 1,
      fillColor: '#f59e0b',
      fillOpacity: 0.12,
      dashArray: '6 4',
    }).addTo(map).bindPopup('可能移動範圍<br>Potential Track Area');
  }

  // ── 2. Past track (red polyline) ──
  const pastLatLngs = [];
  data.pastPositions.forEach(p => pastLatLngs.push([p.lat, p.lon]));
  if (data.currentPos) pastLatLngs.push([data.currentPos.lat, data.currentPos.lon]);

  if (pastLatLngs.length >= 2) {
    L.polyline(pastLatLngs, {
      color: '#ef4444',
      weight: 3,
      opacity: 0.8,
    }).addTo(map);
  }

  // ── 3. Past position markers (red dots) ──
  data.pastPositions.forEach(p => {
    const timeStr = formatTcTime(p.time);
    const popup = `
      <div style="font-size:12px;line-height:1.6">
        <strong>過去位置 Past</strong><br>
        ${timeStr}<br>
        ${p.lat.toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'}, ${p.lon.toFixed(2)}°${p.lon >= 0 ? 'E' : 'W'}<br>
        ${p.intensity}<br>
        風速 Wind: ${p.wind}
      </div>`;
    L.circleMarker([p.lat, p.lon], {
      radius: 5,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.9,
      weight: 1,
    }).addTo(map).bindPopup(popup);
  });

  // ── 4. Current position (larger marker with label) ──
  if (data.currentPos) {
    const cp = data.currentPos;
    const timeStr = formatTcTime(cp.time);
    const popup = `
      <div style="font-size:12px;line-height:1.6">
        <strong>${cnName} ${enName}</strong><br>
        <strong>現時位置 Current</strong><br>
        ${timeStr}<br>
        ${cp.lat.toFixed(2)}°${cp.lat >= 0 ? 'N' : 'S'}, ${cp.lon.toFixed(2)}°${cp.lon >= 0 ? 'E' : 'W'}<br>
        ${cp.intensity}<br>
        風速 Wind: ${cp.wind}<br>
        ${cp.pressure ? '氣壓 Pressure: ' + cp.pressure + '<br>' : ''}
        ${cp.movement ? '移動方向 Movement: ' + cp.movement + '<br>' : ''}
        ${cp.speed ? '移動速度 Speed: ' + cp.speed : ''}
      </div>`;

    L.circleMarker([cp.lat, cp.lon], {
      radius: 8,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map).bindPopup(popup);

    // Add a pulsing icon label
    const icon = L.divIcon({
      className: 'tc-current-label',
      html: `<div style="
        background:var(--primary,#ef4444);
        color:white;
        padding:2px 8px;
        border-radius:4px;
        font-size:11px;
        font-weight:700;
        white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      ">${enName}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, -12],
    });
    L.marker([cp.lat, cp.lon], { icon }).addTo(map);
  }

  // ── 5. Forecast track (dashed red polyline) ──
  const forecastLatLngs = [];
  if (data.currentPos) forecastLatLngs.push([data.currentPos.lat, data.currentPos.lon]);
  data.forecastPositions.forEach(p => forecastLatLngs.push([p.lat, p.lon]));

  if (forecastLatLngs.length >= 2) {
    L.polyline(forecastLatLngs, {
      color: '#ef4444',
      weight: 2,
      opacity: 0.6,
      dashArray: '8 6',
    }).addTo(map);
  }

  // ── 6. Forecast position markers (white dots with time labels) ──
  // Key forecast points: 12h (index ~21), 24h, 36h (index ~45), 48h, 72h (index ~69)
  const keyForecastIndices = [21, 45, 69];
  data.forecastPositions.forEach(p => {
    const isKey = keyForecastIndices.includes(p.index);
    const radius = isKey ? 6 : 4;

    const timeStr = p.time ? formatTcTime(p.time) : '';
    const popup = `
      <div style="font-size:12px;line-height:1.6">
        <strong>預測 Forecast (${p.index}h)</strong><br>
        ${timeStr}<br>
        ${p.lat.toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'}, ${p.lon.toFixed(2)}°${p.lon >= 0 ? 'E' : 'W'}<br>
        ${p.intensity || '--'}<br>
        ${p.wind ? '風速 Wind: ' + p.wind : ''}
      </div>`;

    L.circleMarker([p.lat, p.lon], {
      radius,
      color: '#ffffff',
      fillColor: isKey ? '#fbbf24' : '#ffffff',
      fillOpacity: 0.9,
      weight: 1.5,
    }).addTo(map).bindPopup(popup);

    // Add time label for key forecast points
    if (isKey && p.time) {
      const labelIcon = L.divIcon({
        className: 'tc-fc-label',
        html: `<div style="
          color:white;
          font-size:10px;
          font-weight:600;
          text-shadow:0 1px 3px rgba(0,0,0,0.8);
          white-space:nowrap;
        ">${p.index}h</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 10],
      });
      L.marker([p.lat, p.lon], { icon: labelIcon }).addTo(map);
    }
  });

  // ── 7. Legend ──
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'tc-legend');
    div.style.cssText = `
      background:rgba(15,23,42,0.9);
      color:white;
      padding:8px 12px;
      border-radius:6px;
      font-size:11px;
      line-height:1.8;
      border:1px solid rgba(255,255,255,0.1);
    `;
    div.innerHTML = `
      <div><span style="display:inline-block;width:12px;height:3px;background:#ef4444;margin-right:6px;vertical-align:middle"></span> 過去路徑 Past Track</div>
      <div><span style="display:inline-block;width:12px;height:2px;background:#ef4444;border-top:2px dashed #ef4444;margin-right:6px;vertical-align:middle"></span> 預測路徑 Forecast Track</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#ef4444;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 過去位置 Past Position</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#fbbf24;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 預測位置 Forecast Position</div>
      ${data.polygonCoords.length >= 3 ? '<div><span style="display:inline-block;width:12px;height:3px;background:#f59e0b;margin-right:6px;vertical-align:middle"></span> 可能移動範圍 Potential Track Area</div>' : ''}
    `;
    return div;
  };
  legend.addTo(map);

  // Force map to recalculate size after render
  setTimeout(() => map.invalidateSize(), 100);

  typhoonMapInstance = map;
}

/* ── Render info table ─────────────────────────────────────── */
function renderTyphoonInfo(data, cnName, enName, tcId) {
  const el = document.getElementById('typhoon-info-table');
  if (!el) return;

  const cp = data.currentPos;
  if (!cp) {
    el.innerHTML = '<div style="color:var(--text-faint);text-align:center;padding:var(--sp-4)">暫無詳細資料</div>';
    return;
  }

  // Build forecast summary rows (12h, 24h, 36h, 48h, 72h)
  const forecastMap = {};
  data.forecastPositions.forEach(p => {
    forecastMap[p.index] = p;
  });

  const keyHours = [12, 24, 36, 48, 72];
  const forecastRows = keyHours.map(h => {
    const f = forecastMap[h];
    if (!f) return null;
    return `
      <tr>
        <td>+${h}h</td>
        <td>${f.lat.toFixed(1)}°${f.lat >= 0 ? 'N' : 'S'}</td>
        <td>${f.lon.toFixed(1)}°${f.lon >= 0 ? 'E' : 'W'}</td>
        <td>${f.intensity || '--'}</td>
        <td>${f.wind || '--'}</td>
      </tr>`;
  }).filter(Boolean).join('');

  el.innerHTML = `
    <table class="tc-info-table" style="
      width:100%;
      border-collapse:collapse;
      font-size:var(--text-sm);
      color:var(--text);
    ">
      <thead>
        <tr style="border-bottom:2px solid var(--border)">
          <th colspan="6" style="text-align:left;padding:var(--sp-2) var(--sp-3);font-size:var(--text-base)">
            ${cnName} ${enName} (${tcId})
          </th>
        </tr>
        <tr style="border-bottom:1px solid var(--border);color:var(--text-faint);font-weight:600">
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">時段</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">緯度</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">經度</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">強度</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">風速</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">時間</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--border);background:var(--surface-2)">
          <td style="padding:var(--sp-2) var(--sp-3);font-weight:700;color:var(--primary)">現時</td>
          <td style="padding:var(--sp-2) var(--sp-3)">${cp.lat.toFixed(1)}°${cp.lat >= 0 ? 'N' : 'S'}</td>
          <td style="padding:var(--sp-2) var(--sp-3)">${cp.lon.toFixed(1)}°${cp.lon >= 0 ? 'E' : 'W'}</td>
          <td style="padding:var(--sp-2) var(--sp-3)">${cp.intensity || '--'}</td>
          <td style="padding:var(--sp-2) var(--sp-3)">${cp.wind || '--'}</td>
          <td style="padding:var(--sp-2) var(--sp-3)">${cp.time ? formatTcTime(cp.time) : '--'}</td>
        </tr>
        ${forecastRows}
      </tbody>
    </table>
  `;
}

/* ── Public API ─────────────────────────────────────────────── */
window.Typhoon = {
  refresh: fetchTyphoonData,
};