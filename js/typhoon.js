/* ============================================================
   typhoon.js — Tropical Cyclone Track Map (Leaflet + HKO XML)
   香港城市儀表板 v4 — 全面改進版
   ============================================================ */

'use strict';

/* ── Constants ──────────────────────────────────────────────── */
const TC_LIST_URL = 'https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml';
const HK_COORDS = { lat: 22.3193, lon: 114.1694 };
const CACHE_PREFIX = 'hk_tc_';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/* ── Fetch helper with caching ──────────────────────────────── */
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch (_) { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) { /* quota exceeded — ignore */ }
}

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

function toHkoProxyUrl(url) {
  const safe = url.replace(/^http:\/\//i, 'https://');
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

  // 2. Try direct fetch
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

/* ── Great-circle distance & bearing ────────────────────────── */
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

function bearingToText(brng) {
  const dirs = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  const idx = Math.round(brng / 45) % 8;
  return dirs[idx];
}

function formatDistance(distKm) {
  if (distKm < 100) return `${Math.round(distKm)} 公里`;
  return `${Math.round(distKm / 10) * 10} 公里`;
}

function formatDistanceBearing(lat, lon) {
  const dist = calcDistance(HK_COORDS.lat, HK_COORDS.lon, lat, lon);
  const brng = calcBearing(HK_COORDS.lat, HK_COORDS.lon, lat, lon);
  const dir = bearingToText(brng);
  return `距離香港以${dir}約 ${formatDistance(dist)}`;
}

/* ── Parse HKO TC track XML ────────────────────────────────── */
function parseTcTrackXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const getTagText = (parent, tag) => {
    const el = parent.querySelector(tag);
    return el ? el.textContent.trim() : '';
  };

  const bulletinTime = getTagText(doc, 'BulletinTime');
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

  // Potential Track Area polygon
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
    bulletinTime, tcName,
    pastPositions, currentPos,
    forecastPositions, polygonCoords,
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

/* ── Intensity color mapping (user-specified) ──────────────── */
function getIntensityColor(intensity) {
  const map = {
    'Super Typhoon':       '#a855f7', // 紫
    'Severe Typhoon':      '#ec4899', // 粉紅
    'Typhoon':             '#ef4444', // 紅
    'Severe Tropical Storm': '#3b82f6', // 藍
    'Tropical Storm':      '#22c55e', // 綠
    'Tropical Depression': '#333333', // 黑
    'Low Pressure Area':   '#94a3b8',
  };
  return map[intensity] || '#94a3b8';
}

/* ── Intensity Chinese name mapping ────────────────────────── */
function getIntensityChinese(intensity) {
  const map = {
    'Super Typhoon':        '超強颱風',
    'Severe Typhoon':       '強颱風',
    'Typhoon':              '颱風',
    'Severe Tropical Storm': '強烈熱帶風暴',
    'Tropical Storm':       '熱帶風暴',
    'Tropical Depression':  '熱帶低氣壓',
    'Low Pressure Area':    '低壓區',
  };
  return map[intensity] || intensity;
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

/* ── Show/hide empty state ─────────────────────────────────── */
function showEmptyState(visible) {
  const emptyEl = document.getElementById('typhoon-empty');
  const mapEl = document.getElementById('typhoon-map');
  const infoEl = document.getElementById('typhoon-info-table');
  const statusEl = document.getElementById('typhoon-status');
  const selectorEl = document.getElementById('tc-selector');
  if (emptyEl) emptyEl.style.display = visible ? 'block' : 'none';
  if (mapEl) mapEl.style.display = visible ? 'none' : 'block';
  if (infoEl) infoEl.style.display = visible ? 'none' : 'block';
  if (selectorEl) selectorEl.style.display = 'none';
  if (statusEl) statusEl.textContent = visible ? '' : statusEl.textContent;
}

/* ── Main fetch + render ───────────────────────────────────── */
async function fetchTyphoonData() {
  const mapEl = document.getElementById('typhoon-map');
  const infoEl = document.getElementById('typhoon-info-table');
  const statusEl = document.getElementById('typhoon-status');
  const selectorEl = document.getElementById('tc-selector');
  if (!mapEl) return;

  // Try loading from cache first
  const cachedList = cacheGet('tc_list');
  if (cachedList && cachedList.entries.length > 0) {
    // Show cached data immediately while fetching fresh
    loadTcFromList(cachedList.entries, cachedList.selectedIndex || 0);
  }

  if (statusEl) statusEl.textContent = '正在載入熱帶氣旋資料…';

  try {
    // 1. Fetch TC list
    const listRes = await fetchWithFallback(TC_LIST_URL);
    if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
    const listXml = await listRes.text();
    const listDoc = new DOMParser().parseFromString(listXml, 'text/xml');

    const tcEntries = listDoc.querySelectorAll('TropicalCyclone');
    const entries = [];

    tcEntries.forEach(tc => {
      const id = tc.querySelector('TropicalCycloneID')?.textContent?.trim() || '';
      const cn = tc.querySelector('TropicalCycloneChineseName')?.textContent?.trim() || '';
      const en = tc.querySelector('TropicalCycloneEnglishName')?.textContent?.trim() || '';
      const url = tc.querySelector('TropicalCycloneURL')?.textContent?.trim() || '';
      if (id && url) entries.push({ id, cn, en, url });
    });

    // Cache the list
    cacheSet('tc_list', { entries, selectedIndex: 0 });

    if (!entries.length) {
      showEmptyState(true);
      if (statusEl) statusEl.textContent = '目前沒有活躍的熱帶氣旋 No active tropical cyclones';
      return;
    }

    // Build dropdown
    selectorEl.innerHTML = entries.map((e, i) =>
      `<option value="${i}">${e.cn} ${e.en} (${e.id})</option>`
    ).join('');
    selectorEl.style.display = 'inline-block';
    selectorEl.onchange = () => {
      const idx = parseInt(selectorEl.value, 10);
      loadTcFromList(entries, idx);
    };

    // Load first TC
    await loadTcFromList(entries, 0);

  } catch (e) {
    console.error('Typhoon fetch error:', e);
    // If we have cached data, don't show error
    if (!cachedList) {
      if (statusEl) statusEl.textContent = '無法載入熱帶氣旋資料';
      showEmptyState(true);
    }
  }
}

/* ── Load a specific TC from the entries list ──────────────── */
async function loadTcFromList(entries, index) {
  const mapEl = document.getElementById('typhoon-map');
  const infoEl = document.getElementById('typhoon-info-table');
  const statusEl = document.getElementById('typhoon-status');
  const selectorEl = document.getElementById('tc-selector');

  const tc = entries[index];
  if (!tc) return;

  // Update dropdown selection
  if (selectorEl) selectorEl.value = index;

  showEmptyState(false);

  if (statusEl) statusEl.textContent = `正在載入 ${tc.cn} ${tc.en} 的路徑資料…`;

  try {
    // Check cache for this TC's track data
    const cacheKey = 'track_' + tc.id;
    let data = cacheGet(cacheKey);

    if (!data) {
      const trackRes = await fetchWithFallback(tc.url);
      if (!trackRes.ok) throw new Error(`HTTP ${trackRes.status}`);
      const trackXml = await trackRes.text();
      data = parseTcTrackXml(trackXml);
      cacheSet(cacheKey, data);
    }

    if (!data.currentPos && !data.pastPositions.length) {
      if (statusEl) statusEl.textContent = `${tc.cn} ${tc.en} — 暫無路徑資料`;
      return;
    }

    renderTyphoonMap(data, tc.cn, tc.en, tc.id);
    renderTyphoonInfo(data, tc.cn, tc.en, tc.id);

    if (statusEl) {
      statusEl.textContent = `更新時間：${data.bulletinTime ? formatTcTime(data.bulletinTime) : '--'} · 資料來源：香港天文台`;
    }

  } catch (e) {
    console.error(`Error loading TC ${tc.id}:`, e);
    if (statusEl) statusEl.textContent = `無法載入 ${tc.cn} ${tc.en} 的路徑資料`;
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

  mapEl.innerHTML = '';

  // Collect all points for bounds
  const allPoints = [];
  data.pastPositions.forEach(p => allPoints.push([p.lat, p.lon]));
  if (data.currentPos) allPoints.push([data.currentPos.lat, data.currentPos.lon]);
  data.forecastPositions.forEach(p => allPoints.push([p.lat, p.lon]));

  if (!allPoints.length) {
    mapEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-faint)">暫無路徑資料</div>';
    return;
  }

  // Initialize map with CartoDB light tiles
  const map = L.map(mapEl, {
    zoomControl: true,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
  }).addTo(map);

  const bounds = L.latLngBounds(allPoints);
  map.fitBounds(bounds, { padding: [40, 40] });

  // ── 1. Potential Track Area polygon ──
  if (data.polygonCoords.length >= 3) {
    L.polygon(data.polygonCoords, {
      color: '#f59e0b',
      weight: 1,
      fillColor: '#f59e0b',
      fillOpacity: 0.12,
      dashArray: '6 4',
    }).addTo(map).bindPopup('可能移動範圍<br>Potential Track Area');
  }

  // ── 2. HK Concentric Rings (200/400/600/800 km) ──
  const hkCenter = [HK_COORDS.lat, HK_COORDS.lon];
  const rings = [
    { radius: 800000, color: '#2563eb', label: '800km' },  // tag-blue
    { radius: 600000, color: '#16a34a', label: '600km' },  // tag-green
    { radius: 400000, color: '#b45309', label: '400km' },  // tag-yellow
    { radius: 200000, color: '#dc2626', label: '200km' },  // tag-red
  ];
  rings.forEach(r => {
    L.circle(hkCenter, {
      radius: r.radius,
      color: r.color,
      weight: 1,
      fill: false,
      opacity: 0.6,
    }).addTo(map);
  });

  // ── 3. Past track — black solid line ──
  const pastLatLngs = [];
  data.pastPositions.forEach(p => pastLatLngs.push([p.lat, p.lon]));
  if (data.currentPos) pastLatLngs.push([data.currentPos.lat, data.currentPos.lon]);

  if (pastLatLngs.length >= 2) {
    L.polyline(pastLatLngs, {
      color: '#222222',
      weight: 3,
      opacity: 0.8,
    }).addTo(map);
  }

  // ── 4. Past position markers (dark dots) ──
  data.pastPositions.forEach(p => {
    const timeStr = formatTcTime(p.time);
    const popup = `
      <div style="font-size:12px;line-height:1.6">
        <strong>過去位置 Past</strong><br>
        ${timeStr}<br>
        ${p.lat.toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'}, ${p.lon.toFixed(2)}°${p.lon >= 0 ? 'E' : 'W'}<br>
        ${getIntensityChinese(p.intensity)}<br>
        風速 Wind: ${p.wind}
      </div>`;
    L.circleMarker([p.lat, p.lon], {
      radius: 5,
      color: '#444444',
      fillColor: '#444444',
      fillOpacity: 0.9,
      weight: 1,
    }).addTo(map).bindPopup(popup);
  });

  // ── 5. Current position (larger marker with label) ──
  if (data.currentPos) {
    const cp = data.currentPos;
    const timeStr = formatTcTime(cp.time);
    const popup = `
      <div style="font-size:12px;line-height:1.6">
        <strong>${cnName} ${enName}</strong><br>
        <strong>現時位置 Current</strong><br>
        ${timeStr}<br>
        ${cp.lat.toFixed(2)}°${cp.lat >= 0 ? 'N' : 'S'}, ${cp.lon.toFixed(2)}°${cp.lon >= 0 ? 'E' : 'W'}<br>
        ${getIntensityChinese(cp.intensity)}<br>
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
        color:black;
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

  // ── 6. Forecast track — segmented by intensity color ──
  const forecastSegments = [];
  if (data.currentPos) {
    forecastSegments.push({ lat: data.currentPos.lat, lon: data.currentPos.lon, intensity: data.currentPos.intensity });
  }
  data.forecastPositions.forEach(p => {
    forecastSegments.push({ lat: p.lat, lon: p.lon, intensity: p.intensity });
  });

  if (forecastSegments.length >= 2) {
    for (let i = 0; i < forecastSegments.length - 1; i++) {
      const segColor = getIntensityColor(forecastSegments[i + 1].intensity);
      L.polyline([
        [forecastSegments[i].lat, forecastSegments[i].lon],
        [forecastSegments[i + 1].lat, forecastSegments[i + 1].lon],
      ], {
        color: segColor,
        weight: 3,
        opacity: 0.7,
        dashArray: '6 4',
      }).addTo(map);
    }
  }

  // ── 7. Forecast position markers (colored by intensity with time labels) ──
  // Key forecast points: 12h (index ~21), 24h, 36h (index ~45), 48h, 72h (index ~69)
  const keyForecastIndices = [21, 45, 69];
  data.forecastPositions.forEach(p => {
    const isKey = keyForecastIndices.includes(p.index);
    const radius = isKey ? 7 : 5;
    const fcColor = getIntensityColor(p.intensity);

    const timeStr = p.time ? formatTcTime(p.time) : '';
    const popup = `
      <div style="font-size:12px;line-height:1.6">
        <strong>預測 Forecast (${p.index}h)</strong><br>
        ${timeStr}<br>
        ${p.lat.toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'}, ${p.lon.toFixed(2)}°${p.lon >= 0 ? 'E' : 'W'}<br>
        ${getIntensityChinese(p.intensity) || '--'}<br>
        ${p.wind ? '風速 Wind: ' + p.wind : ''}
      </div>`;

    L.circleMarker([p.lat, p.lon], {
      radius,
      color: fcColor,
      fillColor: fcColor,
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map).bindPopup(popup);

    // Add time label for key forecast points
    if (isKey && p.time) {
      const labelIcon = L.divIcon({
        className: 'tc-fc-label',
        html: `<div style="
          color:#333;
          font-size:10px;
          font-weight:700;
          text-shadow:0 0 3px rgba(255,255,255,0.9);
          white-space:nowrap;
        ">${p.index}h</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 10],
      });
      L.marker([p.lat, p.lon], { icon: labelIcon }).addTo(map);
    }
  });

  // ── 8. Legend ──
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'tc-legend');
    div.style.cssText = `
      background:rgba(255,255,255,0.95);
      color:#333;
      padding:8px 12px;
      border-radius:6px;
      font-size:11px;
      line-height:1.8;
      border:1px solid rgba(0,0,0,0.15);
      box-shadow:0 2px 8px rgba(0,0,0,0.1);
    `;
    div.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px">圖例 Legend</div>
      <div><span style="display:inline-block;width:12px;height:3px;background:#222;margin-right:6px;vertical-align:middle"></span> 過去路徑 Past Track</div>
      <div><span style="display:inline-block;width:12px;height:3px;background:#ef4444;margin-right:6px;vertical-align:middle"></span> 預測路徑 Forecast Track</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#444;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 過去位置 Past Position</div>
      <div style="margin-top:4px;font-weight:600">與香港距離 Distance from HK</div>
      <div><span style="display:inline-block;width:12px;height:1px;border-top:1px solid #dc2626;margin-right:6px;vertical-align:middle"></span> 200 公里範圍</div>
      <div><span style="display:inline-block;width:12px;height:1px;border-top:1px solid #b45309;margin-right:6px;vertical-align:middle"></span> 400 公里範圍</div>
      <div><span style="display:inline-block;width:12px;height:1px;border-top:1px solid #16a34a;margin-right:6px;vertical-align:middle"></span> 600 公里範圍</div>
      <div><span style="display:inline-block;width:12px;height:1px;border-top:1px solid #2563eb;margin-right:6px;vertical-align:middle"></span> 800 公里範圍</div>
      <div style="margin-top:4px;font-weight:600">強度 Intensity</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#333;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 熱帶低氣壓</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 熱帶風暴</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#3b82f6;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 強烈熱帶風暴</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#ef4444;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 颱風</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#ec4899;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 強颱風</div>
      <div><span style="display:inline-block;width:8px;height:8px;background:#a855f7;border-radius:50%;margin-right:6px;vertical-align:middle"></span> 超強颱風</div>
      ${data.polygonCoords.length >= 3 ? '<div style="margin-top:4px"><span style="display:inline-block;width:12px;height:3px;background:#f59e0b;margin-right:6px;vertical-align:middle"></span> 可能移動範圍</div>' : ''}
    `;
    return div;
  };
  legend.addTo(map);

  // Force map to recalculate size after render
  setTimeout(() => map.invalidateSize(), 100);

  typhoonMapInstance = map;
}

/* ── Render info table (with pressure & distance) ──────────── */
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
    const distText = formatDistanceBearing(f.lat, f.lon);
    return `
      <tr>
        <td data-label="時段">&nbsp;&nbsp;&nbsp;&nbsp;+${h}h</td>
        <td data-label="緯度">&nbsp;&nbsp;&nbsp;&nbsp;${f.lat.toFixed(1)}°${f.lat >= 0 ? 'N' : 'S'}</td>
        <td data-label="經度">&nbsp;&nbsp;&nbsp;&nbsp;${f.lon.toFixed(1)}°${f.lon >= 0 ? 'E' : 'W'}</td>
        <td data-label="強度">&nbsp;&nbsp;&nbsp;&nbsp;${getIntensityChinese(f.intensity) || '--'}</td>
        <td data-label="風速">&nbsp;&nbsp;&nbsp;&nbsp;${f.wind || '--'}</td>
        <td data-label="氣壓">&nbsp;&nbsp;&nbsp;&nbsp;--</td>
        <td data-label="距港距離" style="font-size:14px">&nbsp;&nbsp;&nbsp;&nbsp;${distText}</td>
        <td data-label="時間">&nbsp;&nbsp;&nbsp;&nbsp;${f.time ? formatTcTime(f.time) : '--'}</td>
      </tr>`;
  }).filter(Boolean).join('');

  const currentDistText = formatDistanceBearing(cp.lat, cp.lon);

  el.innerHTML = `
    <table class="tc-info-table" style="
      width:100%;
      border-collapse:collapse;
      font-size:var(--text-sm);
      color:var(--text);
    ">
      <thead>
        <tr style="border-bottom:2px solid var(--border)">
          <th colspan="8" style="text-align:left;padding:var(--sp-2) var(--sp-3);font-size:var(--text-base)">
            ${cnName} ${enName} (${tcId})
          </th>
        </tr>
        <tr style="border-bottom:1px solid var(--border);color:var(--text-faint);font-weight:600">
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">時段</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">緯度</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">經度</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">強度</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">風速</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">氣壓</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">距港距離</th>
          <th style="padding:var(--sp-2) var(--sp-3);text-align:left">時間</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--border);background:var(--surface-2)">
          <td data-label="時段" style="padding:var(--sp-2) var(--sp-3);font-weight:700;color:var(--primary)">現時</td>
          <td data-label="緯度" style="padding:var(--sp-2) var(--sp-3)">${cp.lat.toFixed(1)}°${cp.lat >= 0 ? 'N' : 'S'}</td>
          <td data-label="經度" style="padding:var(--sp-2) var(--sp-3)">${cp.lon.toFixed(1)}°${cp.lon >= 0 ? 'E' : 'W'}</td>
          <td data-label="強度" style="padding:var(--sp-2) var(--sp-3)">${getIntensityChinese(cp.intensity) || '--'}</td>
          <td data-label="風速" style="padding:var(--sp-2) var(--sp-3)">${cp.wind || '--'}</td>
          <td data-label="氣壓" style="padding:var(--sp-2) var(--sp-3)">${cp.pressure || '--'}</td>
          <td data-label="距港距離" style="padding:var(--sp-2) var(--sp-3);font-size:14px">${currentDistText}</td>
          <td data-label="時間" style="padding:var(--sp-2) var(--sp-3)">${cp.time ? formatTcTime(cp.time) : '--'}</td>
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