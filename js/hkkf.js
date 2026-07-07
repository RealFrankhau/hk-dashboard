/* ============================================================
   hkkf.js — Hong Kong and Kowloon Ferry ETA
   香港城市儀表板
   ============================================================ */

'use strict';

const HKKF = (function() {

  const BASE = 'https://www.hkkfeta.com/opendata';
  const DIRECTIONS = ['inbound', 'outbound'];
  let _routes = [];

  function escHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(value) {
    if (!value) return '未提供';
    if (/^\d{2}:\d{2}/.test(String(value))) return String(value).slice(0, 5);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function minutesUntil(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return Math.round((d - new Date()) / 60000);
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  function parseCsvLine(line) {
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map(v => v.replace(/^\uFEFF/, '').trim());
  }

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
      const cells = parseCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
      return obj;
    });
  }

  function routeLabel(route, direction) {
    if (direction === 'inbound') {
      return `${route.destination_tc} → ${route.origin_tc}`;
    }
    return `${route.origin_tc} → ${route.destination_tc}`;
  }

  async function fetchRoutes() {
    const payload = await fetchJson(`${BASE}/route/`);
    _routes = Array.isArray(payload.data) ? payload.data : [];
    return _routes;
  }

  async function fetchEta(route, direction) {
    try {
      const payload = await fetchJson(`${BASE}/eta/${route.route_id}/${direction}`);
      return {
        route,
        direction,
        items: Array.isArray(payload.data) ? payload.data : [],
        generated: payload.generated_timestamp || '',
      };
    } catch (e) {
      return { route, direction, items: [], error: e.message };
    }
  }

  async function fetchFareSummary(routeId) {
    try {
      const rows = parseCsv(await fetchText(`${BASE}/fare_table/${routeId}`));
      const adult = rows.find(row => Object.values(row)[0]?.toLowerCase().includes('adult'));
      if (!adult) return '';
      const values = Object.values(adult);
      return `成人 ${values[1] || '—'} / 假日 ${values[2] || values[1] || '—'}`;
    } catch {
      return '';
    }
  }

  async function renderRoutes(routes) {
    const el = document.getElementById('hkkf-routes');
    if (!el) return;
    const fareSummaries = await Promise.all(routes.map(r => fetchFareSummary(r.route_id)));
    el.innerHTML = routes.map((route, index) => `
      <div class="row-item" style="display:block;padding:var(--sp-4)">
        <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:flex-start">
          <div>
            <div style="font-size:var(--text-base);font-weight:700;color:var(--text)">${escHtml(route.route_name_tc)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">${escHtml(route.route_name_en)} · Route ${escHtml(route.route_id)}</div>
          </div>
          <span class="tag tag-blue">${escHtml(fareSummaries[index] || '收費表')}</span>
        </div>
      </div>
    `).join('');
  }

  function renderEta(results) {
    const el = document.getElementById('hkkf-eta-list');
    if (!el) return;
    el.innerHTML = results.map(result => {
      const route = result.route;
      const title = routeLabel(route, result.direction);
      if (result.error) {
        return `<div class="row-item" style="display:block;border-color:var(--error)"><strong>${escHtml(title)}</strong><div style="font-size:var(--text-xs);color:var(--error);margin-top:var(--sp-2)">${escHtml(result.error)}</div></div>`;
      }
      if (!result.items.length) {
        return `<div class="row-item" style="display:block"><strong>${escHtml(title)}</strong><div style="font-size:var(--text-xs);color:var(--text-faint);margin-top:var(--sp-2)">暫無行駛中班次</div></div>`;
      }
      return result.items.map(item => {
        const mins = minutesUntil(item.ETA);
        const cls = mins === null ? 'tag-muted' : mins <= 5 ? 'tag-yellow' : 'tag-green';
        const minsText = mins === null ? '' : mins <= 0 ? '即將到達' : `${mins} 分`;
        return `
          <div class="row-item" style="display:block;padding:var(--sp-4)">
            <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:flex-start;margin-bottom:var(--sp-3)">
              <div>
                <div style="font-size:var(--text-base);font-weight:700;color:var(--text)">${escHtml(title)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted)">開航 ${escHtml(formatTime(item.session_time))}</div>
              </div>
              <span class="tag ${cls}">${escHtml(minsText || 'ETA')}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2)">
              <span class="tag tag-muted">ETA ${escHtml(formatTime(item.ETA))}</span>
              <span class="tag tag-blue">Route ${escHtml(item.route_id)}</span>
              <span class="tag tag-muted">${escHtml(item.direction)}</span>
            </div>
          </div>
        `;
      }).join('');
    }).join('');
  }

  function renderSummary(routes, etaResults) {
    const el = document.getElementById('hkkf-summary');
    if (!el) return;
    const sailings = etaResults.reduce((sum, r) => sum + r.items.length, 0);
    const generated = etaResults.map(r => r.generated).filter(Boolean).sort().pop() || '';
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--sp-4)">
        <div><div class="big-num" style="font-size:var(--text-2xl);color:var(--primary)">${routes.length}</div><div style="font-size:var(--text-xs);color:var(--text-faint)">航線</div></div>
        <div><div class="big-num" style="font-size:var(--text-2xl);color:var(--success)">${sailings}</div><div style="font-size:var(--text-xs);color:var(--text-faint)">ETA 班次</div></div>
        <div><div class="big-num" style="font-size:var(--text-2xl);color:var(--teal)">${etaResults.length}</div><div style="font-size:var(--text-xs);color:var(--text-faint)">方向查詢</div></div>
      </div>
      <div style="margin-top:var(--sp-3);font-size:var(--text-xs);color:var(--text-faint)">API 產生時間：${escHtml(generated || '未提供')}</div>
    `;
  }

  async function refresh() {
    const etaEl = document.getElementById('hkkf-eta-list');
    const routesEl = document.getElementById('hkkf-routes');
    const updated = document.getElementById('hkkf-updated');
    if (!etaEl) return;
    etaEl.innerHTML = `<div class="skel skel-p"></div><div class="skel skel-p" style="margin-top:8px;width:70%"></div>`;
    if (routesEl) routesEl.innerHTML = `<div class="skel skel-p"></div>`;
    try {
      const routes = await fetchRoutes();
      const etaResults = await Promise.all(routes.flatMap(route => DIRECTIONS.map(direction => fetchEta(route, direction))));
      renderSummary(routes, etaResults);
      await renderRoutes(routes);
      renderEta(etaResults);
      if (updated) updated.textContent = `最後更新：${new Date().toLocaleTimeString('zh-HK', { hour12: false })}`;
    } catch (e) {
      etaEl.innerHTML = `<div class="row-item" style="color:var(--error)">港九小輪載入失敗：${escHtml(e.message)}</div>`;
      if (updated) updated.textContent = '載入失敗';
    }
  }

  return { refresh };
})();
