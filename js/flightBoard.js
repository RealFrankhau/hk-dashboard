/* ============================================================
   flightBoard.js — Airport Flight Information Display Board
   航班資訊顯示牌 (搜尋 + 顯示面板)
   ============================================================
   Depends on: flights.js (window.Flights._state)
   Design: Mimics airport flight information display board
   ============================================================ */

'use strict';

/* ── State ──────────────────────────────────────────────── */
const _fbState = {
  departures: { results: [], lang: 'zh', timer: null },
  arrivals:   { results: [], lang: 'zh', timer: null },
};

/* ── Helpers (reuse flights.js logic) ──────────────────── */

function fbAirlineNameZh(code) {
  if (typeof airlineNameZh === 'function') return airlineNameZh(code);
  return code || '—';
}
function fbAirlineNameEn(code) {
  if (typeof airlineNameEn === 'function') return airlineNameEn(code);
  return code || '—';
}
function fbCityName(code) {
  if (typeof cityName === 'function') return cityName(code);
  return code || '—';
}
function fbCityNameEn(code) {
  if (typeof cityNameEn === 'function') return cityNameEn(code);
  return code || '—';
}
function fbStatusToTag(status) {
  if (typeof statusToTag === 'function') return statusToTag(status);
  return { tag: 'tag-muted', label: status || '—' };
}

function cjkWrap(text) {
  if (!text) return '';
  return String(text).replace(/([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+)/g,
    '<span class="fb-cjk">$1</span>');
}

function getRouteCode(isArrival, primary) {
  if (!primary) return 'HKG-HKG';
  const dest = (primary.destination || [])[0] || 'HKG';
  const orig = (primary.origin || [])[0] || 'HKG';
  return isArrival ? `${orig}-${dest}` : `HKG-${dest}`;
}

function charToIcon(char) {
  const c = String(char);
  if (/[A-Za-z]/.test(c)) return `assets/icons/airport_${c.toLowerCase()}.png`;
  if (c === '-') return 'assets/icons/airport_dash.png';
  if (c === '~') return 'assets/icons/airport_swing.png';
  if (c === '·') return 'assets/icons/airport_dot.png';
  return null;
}

function renderRouteIcons(code) {
  if (!code) return '';
  const chars = String(code).split('');
  return chars.map(ch => {
    const src = charToIcon(ch);
    if (!src) return ch;
    return `<img src="${src}" alt="${ch}" style="width:30px;height:30px;vertical-align:middle;display:inline-block;margin:0 1px">`;
  }).join('');
}

/* ── Search flights by flight number ───────────────────── */
function searchFlights(isArrival, query) {
  const raw = isArrival
    ? (window.Flights?._state?.arrivals?.raw || [])
    : (window.Flights?._state?.departures?.raw || []);
  if (!query || !query.trim()) return [];
  const q = query.trim().toUpperCase();
  return raw.filter(f => {
    if (!Array.isArray(f.flight)) return false;
    return f.flight.some(fn => fn && fn.no && fn.no.toUpperCase().includes(q));
  });
}

/* ── Build display board HTML ──────────────────────────── */
function buildBoardHTML(isArrival, results, lang) {
  const isZh = lang === 'zh';

  if (!results || results.length === 0) {
    return buildEmptyBoard(isArrival, lang);
  }

  const primary = results[0];
  const extra = results.slice(1);

  const flightNums = (primary.flight || []).map(f => f.no).filter(Boolean);
  const flightNumPrimary = flightNums[0] || '—';
  const flightNumSecondary = flightNums.slice(1).join(', ') || '';
  const time = primary.time || '—';
  const status = fbStatusToTag(primary.status);

  const gateOrBelt = isArrival
    ? (primary.baggage || '—')
    : (primary.gate || '—');

  let routeLine1, routeLine2;
  if (isArrival) {
    const origins = (primary.origin || []).map(c => isZh ? fbCityName(c) : fbCityNameEn(c)).join(' / ') || '—';
    routeLine1 = origins;
    routeLine2 = isZh ? '往香港' : 'to Hong Kong';
  } else {
    const dests = (primary.destination || []).map(c => isZh ? fbCityName(c) : fbCityNameEn(c)).join(' / ') || '—';
    routeLine1 = isZh ? '香港至' : 'Hong Kong to';
    routeLine2 = dests;
  }

  const label = isArrival
    ? (isZh ? '抵港航班' : 'Arrival Flights')
    : (isZh ? '離港航班' : 'Departure Flights');

  let extraHtml = '';
  if (extra.length > 0) {
    const extraLines = extra.map(f => {
      const fn = f.flight?.map(x => x.no).filter(Boolean).join(', ') || '—';
      const t = f.time || '—';
      return `<div class="fb-marquee-item"><span class="fb-marquee-flight">${fn}</span><span class="fb-marquee-time">${t}</span></div>`;
    }).join('');
    extraHtml = `<div class="fb-marquee-wrap"><div class="fb-marquee-inner">${extraLines}${extraLines}</div></div>`;
  }

  return `
    <div class="fb-board">
      <div class="fb-header">
        <span class="fb-header-label">${cjkWrap(isArrival ? (isZh ? '行李帶' : 'Belt') : (isZh ? '閘口' : 'Gate'))}</span>
        <span class="fb-header-val">${gateOrBelt}</span>
      </div>
      <div class="fb-body">
        <div class="fb-body-left">
          <div class="fb-flight-num">${flightNumPrimary}</div>
          ${flightNumSecondary ? `<div class="fb-flight-num-sub">${flightNumSecondary}</div>` : ''}
          ${extraHtml}
        </div>
        <div class="fb-body-right">
          <div class="fb-time">${time}</div>
        </div>
      </div>
      <div class="fb-route">
        <div class="fb-route-left">
          <div class="fb-route-line1">${cjkWrap(routeLine1)}</div>
          <div class="fb-route-line2">${cjkWrap(routeLine2)}</div>
        </div>
        <div class="fb-route-right">
          <span class="tag ${status.tag}" style="font-family:var(--font-mono);font-weight:700">${status.label}</span>
        </div>
      </div>
      <div class="fb-footer-label">
        <span>${cjkWrap(label)}</span>
      </div>
      <div class="fb-footer-hkg">
        ${renderRouteIcons(getRouteCode(isArrival, primary))}
      </div>
    </div>
  `;
}

/* ── Empty board (no results) ──────────────────────────── */
function buildEmptyBoard(isArrival, lang) {
  const isZh = lang === 'zh';
  const label = isArrival
    ? (isZh ? '抵港航班' : 'Arrival Flights')
    : (isZh ? '離港航班' : 'Departure Flights');

  return `
    <div class="fb-board">
      <div class="fb-header fb-header-empty">
        <span class="fb-header-label">${cjkWrap(isArrival ? (isZh ? '行李帶' : 'Belt') : (isZh ? '閘口' : 'Gate'))}</span>
        <span class="fb-header-val">—</span>
      </div>
      <div class="fb-body fb-body-empty">
        <div class="fb-empty-msg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>${cjkWrap(isZh ? '輸入航班編號搜尋' : 'Search by flight number')}</span>
        </div>
      </div>
      <div class="fb-route fb-route-empty">
        <div class="fb-route-left">
          <div class="fb-route-line1">—</div>
          <div class="fb-route-line2">—</div>
        </div>
        <div class="fb-route-right">—</div>
      </div>
      <div class="fb-footer-label">
        <span>${cjkWrap(label)}</span>
      </div>
      <div class="fb-footer-hkg">
        ${renderRouteIcons(isArrival ? 'HKG' : 'HKG')}
      </div>
    </div>
  `;
}

/* ── Render board into container ───────────────────────── */
function renderBoard(isArrival) {
  const contId = isArrival ? 'flight-board-arrival' : 'flight-board-departure';
  const cont = document.getElementById(contId);
  if (!cont) return;

  const state = isArrival ? _fbState.arrivals : _fbState.departures;
  cont.innerHTML = buildBoardHTML(isArrival, state.results, state.lang);
}

/* ── Perform search + render ───────────────────────────── */
function doSearch(isArrival) {
  const inputId = isArrival ? 'fb-search-arrival' : 'fb-search-departure';
  const input = document.getElementById(inputId);
  if (!input) return;

  const state = isArrival ? _fbState.arrivals : _fbState.departures;
  state.results = searchFlights(isArrival, input.value);
  renderBoard(isArrival);
}

/* ── Toggle language (zh ↔ en) ─────────────────────────── */
function toggleLang(isArrival) {
  const state = isArrival ? _fbState.arrivals : _fbState.departures;
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  renderBoard(isArrival);
}

function startLangCycle(isArrival) {
  const state = isArrival ? _fbState.arrivals : _fbState.departures;
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => toggleLang(isArrival), 10000);
}

/* ── Auto-format flight number input ──────────────────── */
// After 2 letters, auto-insert a space before the first digit
// e.g. "CI" -> "CI ", "CI9" -> "CI 9", "CI 921" stays "CI 921"
function attachFlightNumAutoFormat(input) {
  if (!input) return;
  input.addEventListener('input', (e) => {
    const original = input.value;
    // Strip everything except letters, digits, and spaces
    let cleaned = original.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    // Collapse multiple spaces to one
    cleaned = cleaned.replace(/ {2,}/g, ' ');

    // Find position: after 2 letters, insert a space if not already present
    const m = cleaned.match(/^([A-Z]{2})(\d.*)$/);
    if (m) {
      cleaned = m[1] + ' ' + m[2];
    }
    // Also handle case where user typed e.g. "CI921" with no space yet
    const m2 = cleaned.match(/^([A-Z]{2})(\d.*)$/);
    if (m2) {
      cleaned = m2[1] + ' ' + m2[2];
    }

    if (cleaned !== original) {
      const caret = input.selectionStart;
      input.value = cleaned;
      try { input.setSelectionRange(cleaned.length, cleaned.length); } catch (_) {}
    }
  });
}

/* ── Init a single board ───────────────────────────────── */
function initBoard(isArrival) {
  const inputId = isArrival ? 'fb-search-arrival' : 'fb-search-departure';
  const input = document.getElementById(inputId);
  if (!input) return;

  // Search on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(isArrival);
    }
  });

  // Auto-format: 2 letters then space then digits
  attachFlightNumAutoFormat(input);

  // Search button
  const btnId = isArrival ? 'fb-search-btn-arrival' : 'fb-search-btn-departure';
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.addEventListener('click', () => doSearch(isArrival));
  }

  // Initial empty render
  const state = isArrival ? _fbState.arrivals : _fbState.departures;
  state.lang = 'zh';
  renderBoard(isArrival);
  startLangCycle(isArrival);
}

/* ══ PUBLIC API ══════════════════════════════════════════ */

window.FlightBoard = {
  /** Call after Flights.refresh() completes to re-apply search */
  refresh() {
    doSearch(false);
    doSearch(true);
  },

  /** Full init (call once on page load) */
  init() {
    initBoard(false); // departure
    initBoard(true);  // arrival
  },
};

/* ══ INJECT STYLES ═══════════════════════════════════════ */

(function injectStyles() {
  if (document.getElementById('flightboard-styles')) return;
  const s = document.createElement('style');
  s.id = 'flightboard-styles';
  s.textContent = `
    /* ── Board container ── */
    .fb-board-wrap {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      min-width: 0;
      max-width: 100%;
    }
    .fb-cards-row {
      /* Used by index.html as a 2-col row inside dash-grid.
         On mobile, stack to 1 column. */
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-5);
    }
    @media (max-width: 700px) {
      .fb-cards-row {
        grid-template-columns: 1fr;
      }
    }
    .fb-search-row {
      display: flex;
      gap: var(--sp-2);
    }
    .fb-search-row input {
      flex: 1;
      min-width: 0;
      padding: var(--sp-2) var(--sp-3);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--surface-2);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      font-weight: 400;
      outline: none;
      transition: border-color 0.15s;
    }
    .fb-search-row input:focus {
      border-color: var(--primary);
    }
    .fb-search-row input::placeholder {
      color: var(--text-faint);
      font-family: var(--font-body);
    }
    .fb-search-row button {
      padding: var(--sp-2) var(--sp-3);
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: var(--r-md);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    .fb-search-row button:hover {
      opacity: 0.85;
    }

    /* ── The display board ── */
    .fb-board {
      border: 2px solid #1e3a5f;
      border-radius: 6px;
      overflow: hidden;
      font-family: var(--font-mono);
      font-weight: 700;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    }
    .fb-cjk { font-family: var(--font-body); }

    /* Header (blue) — Gate / Belt */
    .fb-header {
      background: #1a3a6b;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 14px;
      font-size: var(--text-sm);
      letter-spacing: 0.05em;
    }
    .fb-header-empty {
      opacity: 0.6;
    }
    .fb-header-label {
      font-weight: 400;
      opacity: 0.8;
      text-transform: uppercase;
      font-size: var(--text-xs);
    }
    .fb-header-val {
      font-size: var(--text-lg);
      font-weight: 700;
      letter-spacing: 0.1em;
    }

    /* Body (white) — Flight + Time */
    .fb-body {
      background: #f5f5f5;
      color: #111;
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      min-height: 72px;
      padding: 8px 14px;
      gap: var(--sp-3);
    }
    .fb-body-empty {
      justify-content: center;
      align-items: center;
      min-height: 72px;
    }
    .fb-empty-msg {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      color: #999;
      font-weight: 400;
      font-size: var(--text-sm);
    }
    .fb-body-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    }
    .fb-body-right {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .fb-flight-num {
      font-size: var(--text-lg);
      font-weight: 700;
      color: #111;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fb-flight-num-sub {
      font-size: var(--text-xs);
      font-weight: 600;
      color: #444;
      line-height: 1.2;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fb-time {
      font-size: var(--text-xl);
      font-weight: 700;
      color: #111;
      letter-spacing: 0.05em;
    }

    /* ── Marquee for extra flights ── */
    .fb-marquee-wrap {
      overflow: hidden;
      height: 20px;
      margin-top: 2px;
      position: relative;
    }
    .fb-marquee-inner {
      display: flex;
      flex-direction: column;
      animation: fb-marquee-scroll 8s linear infinite;
    }
    .fb-marquee-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 20px;
      font-size: var(--text-xs);
      color: #333;
      padding: 0 2px;
    }
    .fb-marquee-flight {
      font-weight: 700;
    }
    .fb-marquee-time {
      font-weight: 600;
      margin-left: var(--sp-3);
    }
    @keyframes fb-marquee-scroll {
      0% { transform: translateY(0); }
      100% { transform: translateY(-50%); }
    }

    /* Route section (red) */
    .fb-route {
      background: #b22222;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 14px;
      min-height: 44px;
    }
    .fb-route-empty {
      opacity: 0.6;
    }
    .fb-route-left {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .fb-route-line1 {
      font-size: var(--text-sm);
      font-weight: 400;
      opacity: 0.85;
      line-height: 1.2;
    }
    .fb-route-line2 {
      font-size: var(--text-base);
      font-weight: 700;
      line-height: 1.2;
    }
    .fb-route-right {
      flex-shrink: 0;
      text-align: right;
    }
    .fb-route-right .tag {
      font-size: var(--text-xs);
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 3px;
      background: rgba(255,255,255,0.2);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.3);
    }

    /* Footer label (blue) */
    .fb-footer-label {
      background: #1a3a6b;
      color: #fff;
      text-align: center;
      padding: 4px 14px;
      font-size: var(--text-xs);
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* HKG footer (dark) */
    .fb-footer-hkg {
      background: #0d1b2e;
      color: #fff;
      text-align: center;
      padding: 6px 14px;
      font-size: var(--text-base);
      font-weight: 700;
      letter-spacing: 0.3em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .fb-footer-hkg img {
      width: 30px;
      height: 30px;
      display: inline-block;
    }

    /* ── Dark theme overrides ── */
    [data-theme="dark"] .fb-body {
      background: #e8e8e8;
      color: #111;
    }
    [data-theme="dark"] .fb-flight-num,
    [data-theme="dark"] .fb-time {
      color: #111;
    }
    [data-theme="dark"] .fb-marquee-item {
      color: #333;
    }
    [data-theme="dark"] .fb-empty-msg {
      color: #999;
    }

    /* ── Responsive ── */
    @media (max-width: 700px) {
      .fb-header-val {
        font-size: var(--text-base);
      }
      .fb-flight-num {
        font-size: var(--text-base);
      }
      .fb-time {
        font-size: var(--text-lg);
      }
      .fb-route-line2 {
        font-size: var(--text-xs);
      }
    }
  `;
  document.head.appendChild(s);
})();