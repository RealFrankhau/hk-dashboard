/* ============================================================
   tides.js — 潮汐數據 + 天氣預測文字
   香港城市儀表板 v3
   資料來源：香港天文台 HKO
   ============================================================ */

'use strict';

const Tides = (function() {

  /* ── Tide stations ──────────────────────────────────────────── */
  const STATIONS = [
    { code: 'CLK', name: '赤鱲角 (東) Chek Lap Kok (E)' },
    { code: 'CCH', name: '長洲 Cheung Chau' },
    { code: 'CMW', name: '芝麻灣 Chi Ma Wan' },
    { code: 'KLW', name: '高流灣 Ko Lau Wan' },
    { code: 'KCT', name: '葵涌 Kwai Chung' },
    { code: 'LOP', name: '樂安排 Lok On Pai' },
    { code: 'MWC', name: '馬灣 Ma Wan' },
    { code: 'QUB', name: '鰂魚涌 Quarry Bay' },
    { code: 'SPW', name: '石壁 Shek Pik' },
    { code: 'TAO', name: '大澳 Tai O' },
    { code: 'TMW', name: '大廟灣 Tai Miu Wan' },
    { code: 'TPK', name: '大埔滘 Tai Po Kau' },
    { code: 'TBT', name: '尖鼻咀 Tsim Bei Tsui' },
    { code: 'WAG', name: '橫瀾島 Waglan Island' }
    
  ];

  let _currentStation = 'MWC';

  /* ── Fetch current month tide data ──────────────────────────── */
  async function fetchTideData(station) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=HHOT&station=${station}&year=${year}&month=${month}&rformat=json`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Tide API HTTP ${r.status}`);
    return r.json();
  }

  /* ── Fetch local weather forecast text ──────────────────────── */
  async function fetchForecastText() {
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=tc`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`FLW API HTTP ${r.status}`);
    return r.json();
  }

  /* ── Fetch earthquake data ───────────────────────────────────── */
  async function fetchEarthquake() {
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/earthquake.php?dataType=qem&lang=tc`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Earthquake API HTTP ${r.status}`);
    return r.json();
  }

  /* ── Fetch felt earthquake data ─────────────────────────────── */
  async function fetchFeltEarthquake() {
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/earthquake.php?dataType=feltearthquake&lang=tc`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Felt Earthquake API HTTP ${r.status}`);
    return r.json();
  }

  /* ── Parse tide JSON → today's hours ───────────────────────── */
  function parseTideToday(json) {
    const fields = json.fields; // ["MM","DD","01","02",...,"24"]
    const data   = json.data;   // [["04","01","1.06","0.74",...], ...]
    if (!fields || !data) return null;

    const now = new Date();
    const todayMM = String(now.getMonth() + 1).padStart(2, '0');
    const todayDD = String(now.getDate()).padStart(2, '0');

    const row = data.find(r => r[0] === todayMM && r[1] === todayDD);
    if (!row) return null;

    const hours = [];
    for (let h = 1; h <= 24; h++) {
      const idx = fields.indexOf(String(h).padStart(2, '0'));
      if (idx !== -1 && row[idx] !== undefined) {
        hours.push({ hour: h, height: parseFloat(row[idx]) });
      }
    }
    return hours;
  }

  /* ── Get magnitude display class ───────────────────────────── */
  function magClass(mag) {
    const m = parseFloat(mag);
    if (m >= 6.0) return 'tag-red';
    if (m >= 5.0) return 'tag-yellow';
    if (m >= 4.0) return 'tag-blue';
    return 'tag-green';
  }

  /* ── Render tide chart ───────────────────────────────────────── */
  function renderTideChart(hours, container) {
    if (!hours || !hours.length) {
      container.innerHTML = `<div style="color:var(--text-faint);font-size:var(--text-xs)">暫無今日潮汐數據</div>`;
      return;
    }

    const now = new Date();
    const currentHour = now.getHours() + 1; // hours array is 1-indexed

    const heights = hours.map(h => h.height);
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    const range = max - min || 0.1;

    const W = 600, H = 160, PAD = 30;
    const xStep = (W - 2 * PAD) / (hours.length - 1);

    // Build SVG path
    const points = hours.map((h, i) => {
      const x = PAD + i * xStep;
      const y = H - PAD - ((h.height - min) / range) * (H - 2 * PAD);
      return `${x},${y}`;
    });
    const pathD = `M ${points.join(' L ')}`;

    // Area fill
    const areaD = `M ${PAD},${H - PAD} L ${points.join(' L ')} L ${PAD + (hours.length - 1) * xStep},${H - PAD} Z`;

    // Current hour marker
    const cIdx = hours.findIndex(h => h.hour === currentHour);
    const cX = cIdx >= 0 ? PAD + cIdx * xStep : -100;
    const cY = cIdx >= 0 ? H - PAD - ((hours[cIdx].height - min) / range) * (H - 2 * PAD) : 0;

    // X-axis labels (every 3 hours)
    const xLabels = hours.filter(h => h.hour % 3 === 0).map(h => {
      const idx = hours.indexOf(h);
      const x = PAD + idx * xStep;
      return `<text x="${x}" y="${H - 8}" text-anchor="middle" style="font-size:9px;fill:var(--text-faint)">${h.hour}時</text>`;
    });

    // Y-axis labels
    const yLevels = [min, (min + max) / 2, max];
    const yLabels = yLevels.map(lv => {
      const y = H - PAD - ((lv - min) / range) * (H - 2 * PAD);
      return `<text x="${PAD - 4}" y="${y + 4}" text-anchor="end" style="font-size:9px;fill:var(--text-faint)">${lv.toFixed(2)}m</text>`;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;overflow:visible" role="img" aria-label="潮汐圖">
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--info)" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="var(--info)" stop-opacity="0.03"/>
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        ${yLevels.map(lv => {
          const y = H - PAD - ((lv - min) / range) * (H - 2 * PAD);
          return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4,4"/>`;
        }).join('')}
        <!-- Area fill -->
        <path d="${areaD}" fill="url(#tideGrad)"/>
        <!-- Line -->
        <path d="${pathD}" fill="none" stroke="var(--info)" stroke-width="2" stroke-linejoin="round"/>
        <!-- Current hour dot -->
        ${cIdx >= 0 ? `
          <circle cx="${cX}" cy="${cY}" r="5" fill="var(--primary)" stroke="var(--surface)" stroke-width="2"/>
          <text x="${cX}" y="${cY - 10}" text-anchor="middle" style="font-size:10px;fill:var(--primary);font-weight:700">${hours[cIdx].height.toFixed(2)}m</text>
        ` : ''}
        <!-- X axis labels -->
        ${xLabels.join('')}
        <!-- Y axis labels -->
        ${yLabels.join('')}
        <!-- Baseline -->
        <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--border)" stroke-width="1"/>
      </svg>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-top:var(--sp-3)">
        ${hours.map(h => {
          const isCurrent = h.hour === currentHour;
          const isHigh = h.height === max;
          const isLow = h.height === min;
          return `<div style="text-align:center;padding:4px 8px;border-radius:var(--r-md);background:${isCurrent ? 'var(--primary-lt)' : 'var(--surface-2)'};border:1px solid ${isCurrent ? 'var(--primary)' : 'transparent'}">
            <div style="font-size:9px;color:var(--text-faint)">${h.hour}時</div>
            <div style="font-size:11px;font-weight:${isCurrent ? '700' : '400'};color:${isHigh ? 'var(--info)' : isLow ? 'var(--teal)' : 'var(--text)'}">
              ${h.height.toFixed(2)}
              ${isHigh ? '▲' : isLow ? '▼' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  /* ── Render earthquake info ──────────────────────────────────── */
  function renderEarthquake(qem, felt, container) {
    let html = '';

    // Quick earthquake messages
    if (qem && qem.latitude) {
      const mClass = magClass(qem.mag);
      html += `
        <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);border-left:3px solid var(--warning);margin-bottom:var(--sp-3)">
          <div style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap">
            <div>
              <div style="font-size:var(--text-xs);color:var(--text-faint);margin-bottom:4px">最近地震 Latest Earthquake</div>
              <div style="font-size:var(--text-sm);font-weight:600">${qem.region || qem.region_en || '地區不詳'}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">${qem.ptime || ''}</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-faint)">強度</div>
              <span class="tag ${mClass}" style="font-size:16px;font-weight:700;padding:4px 12px">M${parseFloat(qem.mag || 0).toFixed(1)}</span>
            </div>
            <div style="text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-faint)">深度</div>
              <div style="font-size:var(--text-sm);font-weight:600">${qem.depth ? qem.depth + ' km' : '—'}</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-faint)">座標</div>
              <div style="font-size:var(--text-xs);font-family:var(--font-mono)">${parseFloat(qem.latitude || 0).toFixed(2)}°N<br>${parseFloat(qem.longitude || 0).toFixed(2)}°E</div>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `<div class="row-item"><span style="color:var(--text-faint);font-size:var(--text-xs)">暫無最新地震數據</span></div>`;
    }

    // Felt earthquakes
    const feltList = Array.isArray(felt) ? felt : (felt && felt.latitude ? [felt] : []);
    if (feltList.length > 0) {
      html += `
        <div style="margin-top:var(--sp-3)">
          <div style="font-size:var(--text-xs);color:var(--warning);font-weight:600;margin-bottom:var(--sp-2)">⚠ 香港有感地震</div>
          ${feltList.map(f => `
            <div class="row-item">
              <span class="row-name">${f.ptime || ''}</span>
              <span class="row-val">M${parseFloat(f.mag || 0).toFixed(1)} · ${f.region || ''}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      html += `<div style="font-size:var(--text-xs);color:var(--text-faint);margin-top:var(--sp-2)">近期香港無有感地震 No felt earthquake recently</div>`;
    }

    container.innerHTML = html;
  }

  /* ── Render local forecast text ─────────────────────────────── */
  function renderForecastText(flw, container) {
    if (!flw) { container.innerHTML = ''; return; }
    const { generalSituation, forecastDesc, outlook } = flw;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
        ${generalSituation ? `
          <div>
            <div style="font-size:var(--text-xs);color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--sp-2)">天氣概況 General Situation</div>
            <div style="font-size:var(--text-sm);line-height:1.7;color:var(--text-muted)">${generalSituation}</div>
          </div>
        ` : ''}
        ${forecastDesc ? `
          <div>
            <div style="font-size:var(--text-xs);color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--sp-2)">天氣預測 Forecast</div>
            <div style="font-size:var(--text-sm);line-height:1.7;color:var(--text-muted)">${forecastDesc}</div>
          </div>
        ` : ''}
        ${outlook ? `
          <div>
            <div style="font-size:var(--text-xs);color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--sp-2)">展望 Outlook</div>
            <div style="font-size:var(--text-sm);line-height:1.7;color:var(--text-muted)">${outlook}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /* ── Change station ──────────────────────────────────────────── */
  async function changeStation() {
    const sel = document.getElementById('tide-station');
    if (sel) _currentStation = sel.value;
    await loadTideData();
  }

  /* ── Load tide data for current station ────────────────────── */
  async function loadTideData() {
    const cont = document.getElementById('tide-chart');
    const stationName = document.getElementById('tide-station-name');
    if (!cont) return;

    const station = STATIONS.find(s => s.code === _currentStation) || STATIONS[0];
    if (stationName) stationName.textContent = station.name;

    cont.innerHTML = `<div class="skel" style="height:160px;border-radius:var(--r-lg)"></div>`;
    try {
      const data = await fetchTideData(_currentStation);
      const hours = parseTideToday(data);
      renderTideChart(hours, cont);
    } catch (e) {
      cont.innerHTML = `<div style="color:var(--error);font-size:var(--text-xs)">潮汐數據載入失敗：${e.message}</div>`;
    }
  }

  /* ── Main refresh ────────────────────────────────────────────── */
  async function refresh() {
    // Load all in parallel
    await Promise.allSettled([
      loadTideData(),
      loadForecastText(),
      loadEarthquake(),
    ]);
  }

  async function loadForecastText() {
    const cont = document.getElementById('tide-forecast-text');
    if (!cont) return;
    cont.innerHTML = `<div class="skel skel-p"></div><div class="skel skel-p" style="margin-top:8px"></div>`;
    try {
      const data = await fetchForecastText();
      renderForecastText(data, cont);
    } catch (e) {
      cont.innerHTML = `<div style="color:var(--error);font-size:var(--text-xs)">載入失敗：${e.message}</div>`;
    }
  }

  async function loadEarthquake() {
    const cont = document.getElementById('eq-content');
    if (!cont) return;
    cont.innerHTML = `<div class="skel skel-p"></div>`;
    try {
      const [qemData, feltData] = await Promise.allSettled([
        fetchEarthquake(),
        fetchFeltEarthquake(),
      ]);
      const qem  = qemData.status  === 'fulfilled' ? qemData.value  : null;
      const felt = feltData.status === 'fulfilled' ? feltData.value : null;
      renderEarthquake(qem, felt, cont);
    } catch (e) {
      cont.innerHTML = `<div style="color:var(--error);font-size:var(--text-xs)">地震數據載入失敗：${e.message}</div>`;
    }
  }

  return { refresh, changeStation, getStations: () => STATIONS };
})();
