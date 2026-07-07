/* ============================================================
   sunferry.js — Sun Ferry ETA
   香港城市儀表板
   ============================================================ */

'use strict';

const SunFerry = (function() {

  const API_BASE = 'https://www.sunferry.com.hk/eta/';
  const COMPANY_SITE = 'https://www.sunferry.com.hk/';

  const ROUTES = [
    { code: 'CECC', nameTc: '中環 - 長洲', nameEn: 'Central - Cheung Chau' },
    { code: 'CCCE', nameTc: '長洲 - 中環', nameEn: 'Cheung Chau - Central' },
    { code: 'CEMW', nameTc: '中環 - 梅窩', nameEn: 'Central - Mui Wo' },
    { code: 'MWCE', nameTc: '梅窩 - 中環', nameEn: 'Mui Wo - Central' },
    { code: 'NPHH', nameTc: '北角 - 紅磡', nameEn: 'North Point - Hung Hom' },
    { code: 'HHNP', nameTc: '紅磡 - 北角', nameEn: 'Hung Hom - North Point' },
    { code: 'NPKC', nameTc: '北角 - 九龍城', nameEn: 'North Point - Kowloon City' },
    { code: 'KCNP', nameTc: '九龍城 - 北角', nameEn: 'Kowloon City - North Point' },
    { code: 'IIPECMUW', nameTc: '橫水渡：坪洲 - 梅窩', nameEn: 'Peng Chau - Mui Wo' },
    { code: 'IIMUWPEC', nameTc: '橫水渡：梅窩 - 坪洲', nameEn: 'Mui Wo - Peng Chau' },
    { code: 'IIMUWCMW', nameTc: '橫水渡：梅窩 - 芝麻灣', nameEn: 'Mui Wo - Chi Ma Wan' },
    { code: 'IICMWMUW', nameTc: '橫水渡：芝麻灣 - 梅窩', nameEn: 'Chi Ma Wan - Mui Wo' },
    { code: 'IICMWCHC', nameTc: '橫水渡：芝麻灣 - 長洲', nameEn: 'Chi Ma Wan - Cheung Chau' },
    { code: 'IICHCCMW', nameTc: '橫水渡：長洲 - 芝麻灣', nameEn: 'Cheung Chau - Chi Ma Wan' },
    { code: 'IICHCMUW', nameTc: '橫水渡：長洲 - 梅窩', nameEn: 'Cheung Chau - Mui Wo' },
    { code: 'IIMUWCHC', nameTc: '橫水渡：梅窩 - 長洲', nameEn: 'Mui Wo - Cheung Chau' },
  ];

  let _lastPayloads = [];
  let _selectedRoute = 'all';
  let _loading = false;

  function escHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function routeMeta(code) {
    return ROUTES.find(r => r.code === code) || { code, nameTc: code, nameEn: code };
  }

  function requestCodes() {
    return _selectedRoute === 'all' ? ROUTES.map(r => r.code) : [_selectedRoute];
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatTime(value) {
    if (!value) return '未提供';
    const str = String(value);
    if (/^\d{2}:\d{2}$/.test(str)) return str;
    const date = new Date(str);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return str;
  }

  function formatTimestamp(value) {
    if (!value) return '未提供';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-HK', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  function etaStatus(item) {
    if (item.eta) return { cls: 'tag-green', text: '有 ETA' };
    if (item.rmk_tc || item.rmk_en || item.rmk_sc) return { cls: 'tag-yellow', text: '有備註' };
    return { cls: 'tag-muted', text: '未提供 ETA' };
  }

  function locationText(item) {
    if (!item.lat || !item.lng) return '未提供位置';
    return `${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}`;
  }

  async function fetchRoute(code) {
    const res = await fetch(`${API_BASE}?route=${encodeURIComponent(code)}`, {
      headers: { accept: 'application/json' },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body?.message || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return {
      requestedCode: code,
      generatedTimestamp: body?.generated_timestamp || '',
      version: body?.version || '',
      data: Array.isArray(body?.data) ? body.data : [],
    };
  }

  async function fetchSelectedRoutes() {
    const codes = requestCodes();
    const results = await Promise.allSettled(codes.map(fetchRoute));
    return results.map((result, index) => {
      const code = codes[index];
      if (result.status === 'fulfilled') return result.value;
      return {
        requestedCode: code,
        generatedTimestamp: '',
        version: '',
        data: [],
        error: result.reason?.message || String(result.reason),
      };
    });
  }

  function renderRouteOptions() {
    const select = document.getElementById('sunferry-route');
    if (!select) return;
    select.innerHTML = [
      '<option value="all">全部航線 All Routes</option>',
      ...ROUTES.map(route =>
        `<option value="${escHtml(route.code)}">${escHtml(route.nameTc)} · ${escHtml(route.code)}</option>`
      ),
    ].join('');
    select.value = _selectedRoute;
  }

  function renderSummary(payloads) {
    const cont = document.getElementById('sunferry-summary');
    if (!cont) return;

    const trips = payloads.flatMap(payload => payload.data || []);
    const routeCount = payloads.filter(payload => !payload.error).length;
    const etaCount = trips.filter(item => item.eta).length;
    const vesselCount = trips.filter(item => item.vesselcode).length;
    const generated = payloads.map(p => p.generatedTimestamp).filter(Boolean).sort().pop() || '';

    cont.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--sp-4)">
        <div>
          <div class="big-num" style="font-size:var(--text-2xl);color:var(--primary)">${routeCount}</div>
          <div style="font-size:var(--text-xs);color:var(--text-faint)">已載入航線</div>
        </div>
        <div>
          <div class="big-num" style="font-size:var(--text-2xl);color:var(--success)">${trips.length}</div>
          <div style="font-size:var(--text-xs);color:var(--text-faint)">下一班資料</div>
        </div>
        <div>
          <div class="big-num" style="font-size:var(--text-2xl);color:var(--teal)">${etaCount}</div>
          <div style="font-size:var(--text-xs);color:var(--text-faint)">提供 ETA</div>
        </div>
        <div>
          <div class="big-num" style="font-size:var(--text-2xl);color:var(--text-muted)">${vesselCount}</div>
          <div style="font-size:var(--text-xs);color:var(--text-faint)">提供船隻代碼</div>
        </div>
      </div>
      <div style="margin-top:var(--sp-3);font-size:var(--text-xs);color:var(--text-faint)">
        API 產生時間：${escHtml(formatTimestamp(generated))}
      </div>
    `;
  }

  function renderTripCard(item, fallbackRouteCode) {
    const requestedMeta = routeMeta(fallbackRouteCode);
    const status = etaStatus(item);
    const routeTc = item.route_tc || requestedMeta.nameTc;
    const routeEn = item.route_en || requestedMeta.nameEn;
    const actualRouteCode = item.routecode || fallbackRouteCode;
    const remark = item.rmk_tc || item.rmk_en || item.rmk_sc || '';

    return `
      <div class="row-item" style="display:block;padding:var(--sp-4);background:var(--surface-2)">
        <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:flex-start;margin-bottom:var(--sp-3)">
          <div style="min-width:0">
            <div style="font-size:var(--text-base);font-weight:700;color:var(--text);line-height:1.35">${escHtml(routeTc)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);line-height:1.5">${escHtml(routeEn)}</div>
          </div>
          <span class="tag ${status.cls}" style="white-space:nowrap">${escHtml(status.text)}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3);margin-bottom:var(--sp-3)">
          <div>
            <div style="font-size:10px;color:var(--text-faint);text-transform:uppercase;font-weight:700">Departure</div>
            <div class="row-val" style="font-size:var(--text-lg)">${escHtml(formatTime(item.depart_time))}</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text-faint);text-transform:uppercase;font-weight:700">ETA</div>
            <div class="row-val" style="font-size:var(--text-lg);color:${item.eta ? 'var(--success)' : 'var(--text-muted)'}">${escHtml(formatTime(item.eta))}</div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:${remark ? 'var(--sp-3)' : '0'}">
          <span class="tag tag-blue" style="font-family:var(--font-mono)">${escHtml(actualRouteCode)}</span>
          <span class="tag tag-muted">船隻 ${escHtml(item.vesselcode || '未提供')}</span>
          <span class="tag tag-muted">${escHtml(locationText(item))}</span>
        </div>

        ${remark ? `
          <div style="padding:var(--sp-3);background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--r-md);font-size:var(--text-xs);color:var(--text-muted);line-height:1.6">
            ${escHtml(remark)}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderRouteGroup(payload) {
    const meta = routeMeta(payload.requestedCode);
    if (payload.error) {
      return `
        <div class="row-item" style="display:block;padding:var(--sp-4);border-color:var(--error);background:var(--surface-2)">
          <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:center">
            <div>
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--text)">${escHtml(meta.nameTc)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-faint)">${escHtml(meta.code)} · ${escHtml(meta.nameEn)}</div>
            </div>
            <span class="tag tag-red">載入失敗</span>
          </div>
          <div style="margin-top:var(--sp-3);font-size:var(--text-xs);color:var(--error)">${escHtml(payload.error)}</div>
        </div>
      `;
    }

    if (!payload.data.length) {
      return `
        <div class="row-item" style="display:block;padding:var(--sp-4);background:var(--surface-2)">
          <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:center">
            <div>
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--text)">${escHtml(meta.nameTc)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-faint)">${escHtml(meta.code)} · ${escHtml(meta.nameEn)}</div>
            </div>
            <span class="tag tag-muted">無資料</span>
          </div>
        </div>
      `;
    }

    return payload.data.map(item => renderTripCard(item, payload.requestedCode)).join('');
  }

  function renderList(payloads) {
    const cont = document.getElementById('sunferry-list');
    if (!cont) return;
    cont.innerHTML = payloads.map(renderRouteGroup).join('');
  }

  function setLoadingState(isLoading) {
    _loading = isLoading;
    const btn = document.getElementById('sunferry-refresh-btn');
    if (btn) {
      btn.disabled = isLoading;
      btn.textContent = isLoading ? '載入中…' : '重新載入';
      btn.style.opacity = isLoading ? '0.7' : '1';
    }
  }

  function renderSkeleton() {
    const cont = document.getElementById('sunferry-list');
    if (!cont) return;
    cont.innerHTML = `
      <div class="skel" style="height:142px;border-radius:var(--r-lg)"></div>
      <div class="skel" style="height:142px;border-radius:var(--r-lg)"></div>
      <div class="skel" style="height:142px;border-radius:var(--r-lg)"></div>
      <div class="skel" style="height:142px;border-radius:var(--r-lg)"></div>
    `;
  }

  async function refresh() {
    if (_loading) return;
    const cont = document.getElementById('sunferry-list');
    if (!cont) return;

    renderRouteOptions();
    renderSkeleton();
    setText('sunferry-updated', '更新中…');
    setLoadingState(true);

    try {
      _lastPayloads = await fetchSelectedRoutes();
      renderSummary(_lastPayloads);
      renderList(_lastPayloads);
      setText('sunferry-updated', `最後更新：${new Date().toLocaleTimeString('zh-HK', { hour12: false })}`);
    } catch (e) {
      cont.innerHTML = `
        <div class="row-item" style="display:block;padding:var(--sp-6);text-align:center;border-color:var(--error);background:var(--surface-2)">
          <div style="color:var(--error);font-size:var(--text-sm);font-weight:700;margin-bottom:var(--sp-2)">輪船 ETA 載入失敗</div>
          <div style="color:var(--text-faint);font-size:var(--text-xs);margin-bottom:var(--sp-3)">${escHtml(e.message)}</div>
          <a href="${COMPANY_SITE}" target="_blank" rel="noopener" style="font-size:var(--text-sm);color:var(--primary)">前往 Sun Ferry 官網 →</a>
        </div>
      `;
      setText('sunferry-updated', '載入失敗');
    } finally {
      setLoadingState(false);
    }
  }

  function changeRoute(value) {
    _selectedRoute = ROUTES.some(r => r.code === value) ? value : 'all';
    refresh();
  }

  return { refresh, changeRoute };
})();
