/* ============================================================
   holidays.js — 公眾假期 Public Holidays
   香港城市儀表板 v4
   ============================================================ */

'use strict';

const Holidays = (function() {

  const API_URL = 'https://www.1823.gov.hk/common/ical/tc.json';

  // Static fallback data (2024-2027) from data.gov.hk / 1823.gov.hk
  // Used when the live API is blocked by CORS in browser context
  const STATIC_HOLIDAYS = [
{"date":"20240101","name":"一月一日"},{"date":"20240210","name":"農曆年初一"},{"date":"20240212","name":"農曆年初三"},{"date":"20240213","name":"農曆年初四"},{"date":"20240329","name":"耶穌受難節"},{"date":"20240330","name":"耶穌受難節翌日"},{"date":"20240401","name":"復活節星期一"},{"date":"20240404","name":"清明節"},{"date":"20240501","name":"勞動節"},{"date":"20240515","name":"佛誕"},{"date":"20240610","name":"端午節"},{"date":"20240701","name":"香港特別行政區成立紀念日"},{"date":"20240918","name":"中秋節翌日"},{"date":"20241001","name":"國慶日"},{"date":"20241011","name":"重陽節"},{"date":"20241225","name":"聖誕節"},{"date":"20241226","name":"聖誕節後第一個周日"},{"date":"20250101","name":"一月一日"},{"date":"20250129","name":"農曆年初一"},{"date":"20250130","name":"農曆年初二"},{"date":"20250131","name":"農曆年初三"},{"date":"20250404","name":"清明節"},{"date":"20250418","name":"耶穌受難節"},{"date":"20250419","name":"耶穌受難節翌日"},{"date":"20250421","name":"復活節星期一"},{"date":"20250501","name":"勞動節"},{"date":"20250505","name":"佛誕"},{"date":"20250531","name":"端午節"},{"date":"20250701","name":"香港特別行政區成立紀念日"},{"date":"20251001","name":"國慶日"},{"date":"20251007","name":"中秋節翌日"},{"date":"20251029","name":"重陽節"},{"date":"20251225","name":"聖誕節"},{"date":"20251226","name":"聖誕節後第一個周日"},{"date":"20260101","name":"一月一日"},{"date":"20260217","name":"農曆年初一"},{"date":"20260218","name":"農曆年初二"},{"date":"20260219","name":"農曆年初三"},{"date":"20260403","name":"耶穌受難節"},{"date":"20260404","name":"耶穌受難節翌日"},{"date":"20260406","name":"清明節翌日"},{"date":"20260407","name":"復活節星期一翌日"},{"date":"20260501","name":"勞動節"},{"date":"20260525","name":"佛誕翌日"},{"date":"20260619","name":"端午節"},{"date":"20260701","name":"香港特別行政區成立紀念日"},{"date":"20260926","name":"中秋節翌日"},{"date":"20261001","name":"國慶日"},{"date":"20261019","name":"重陽節翌日"},{"date":"20261225","name":"聖誕節"},{"date":"20261226","name":"聖誕節後第一個周日"},{"date":"20270101","name":"一月一日"},{"date":"20270206","name":"農曆年初一"},{"date":"20270208","name":"農曆年初三"},{"date":"20270209","name":"農曆年初四"},{"date":"20270326","name":"耶穌受難節"},{"date":"20270327","name":"耶穌受難節翌日"},{"date":"20270329","name":"復活節星期一"},{"date":"20270405","name":"清明節"},{"date":"20270501","name":"勞動節"},{"date":"20270513","name":"佛誕"},{"date":"20270609","name":"端午節"},{"date":"20270701","name":"香港特別行政區成立紀念日"},{"date":"20270919","name":"中秋節翌日"},{"date":"20271001","name":"國慶日"},{"date":"20271008","name":"重陽節"},{"date":"20271225","name":"聖誕節"},{"date":"20271227","name":"聖誕節後第一個周日"}];

  const DAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
  const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  let _allHolidays = []; // [{date: Date, name: string, dateStr: string}]
  let _activeYear = new Date().getFullYear();

  /* ── Parse dtstart value ──────────────────────────────────── */
  function parseDtstart(dtstart) {
    // dtstart can be: "20260101" or ["20260101", {value:"DATE"}]
    if (!dtstart) return null;
    let raw = dtstart;
    if (Array.isArray(dtstart)) {
      raw = dtstart[0];
    } else if (typeof dtstart === 'object' && dtstart.val) {
      raw = dtstart.val;
    }
    raw = String(raw).replace(/[^0-9]/g, '').slice(0, 8);
    if (raw.length !== 8) return null;
    const y = parseInt(raw.slice(0, 4));
    const m = parseInt(raw.slice(4, 6)) - 1;
    const d = parseInt(raw.slice(6, 8));
    return new Date(y, m, d);
  }

  /* ── Parse summary (holiday name) ────────────────────────── */
  function parseSummary(summary) {
    if (!summary) return '假期';
    if (Array.isArray(summary)) return String(summary[0] || '假期');
    return String(summary);
  }

  /* ── Date string YYYYMMDD ─────────────────────────────────── */
  function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  /* ── Format date for display ──────────────────────────────── */
  function fmtDate(d) {
    const y = d.getFullYear();
    const m = MONTHS_ZH[d.getMonth()];
    const day = d.getDate();
    const dow = DAYS_ZH[d.getDay()];
    const dowEn = DAYS_EN[d.getDay()];
    return { full: `${y}年${m}${day}日 (${dow})`, short: `${m}${day}日`, dow, dowEn, y, m, day };
  }

  /* ── Count days until a future date ──────────────────────── */
  function daysUntil(targetDate) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    return Math.round((target - today) / 86400000);
  }

  /* ── Render countdown + upcoming section ──────────────────── */
  function renderUpcoming(holidays) {
    const today = new Date();
    const todayStr = toDateStr(today);

    // Find today's holiday
    const todayHol = holidays.find(h => toDateStr(h.date) === todayStr);

    // Find upcoming (future or today)
    const upcoming = holidays
      .filter(h => daysUntil(h.date) >= 0)
      .slice(0, 5);

    // Next holiday (strictly future)
    const next = holidays.find(h => daysUntil(h.date) > 0);

    // Render today banner
    const todayBanner = document.getElementById('hol-today-banner');
    if (todayBanner) {
      if (todayHol) {
        todayBanner.innerHTML = `
          <div class="warn-strip" style="background:var(--success-bg);border-color:var(--success);color:var(--success)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div>
              <div style="font-weight:700;font-size:var(--text-base)">今天是公眾假期！</div>
              <div style="font-size:var(--text-sm)">${escHtml(todayHol.name)}</div>
            </div>
          </div>
        `;
        todayBanner.style.display = '';
      } else {
        todayBanner.style.display = 'none';
      }
    }

    // Render countdown
    const countdownEl = document.getElementById('hol-countdown');
    if (countdownEl) {
      if (next) {
        const days = daysUntil(next.date);
        const fmt = fmtDate(next.date);
        countdownEl.innerHTML = `
          <div style="text-align:center;padding:var(--sp-4);width:100%">
            <div style="font-size:var(--text-xs);color:var(--text-faint);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--sp-2)">距下個假期 Next Holiday</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-3xl);font-weight:700;color:var(--primary);line-height:1">${days}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--sp-1)">天 days</div>
            <div style="margin-top:var(--sp-3);font-weight:600;font-size:var(--text-base)">${escHtml(next.name)}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">${fmt.full}</div>
          </div>
        `;
      } else {
        countdownEl.innerHTML = `<div style="color:var(--text-faint);text-align:center;padding:var(--sp-4)">暫無假期數據</div>`;
      }
    }

    // Render upcoming list
    const upcomingEl = document.getElementById('hol-upcoming');
    if (upcomingEl) {
      if (!upcoming.length) {
        upcomingEl.innerHTML = `<div class="row-item"><span class="row-val" style="color:var(--text-faint)">暫無即將來臨的假期</span></div>`;
        return;
      }
      upcomingEl.innerHTML = upcoming.map(h => {
        const fmt = fmtDate(h.date);
        const days = daysUntil(h.date);
        const isToday = days === 0;
        const tagClass = isToday ? 'tag-green' : (days <= 7 ? 'tag-yellow' : 'tag-blue');
        const tagText = isToday ? '今天' : `${days} 天後`;
        return `
          <div class="row-item">
            <div style="display:flex;flex-direction:column;gap:2px">
              <span class="row-name">${escHtml(h.name)}</span>
              <span class="row-sub">${fmt.full}</span>
            </div>
            <span class="tag ${tagClass}">${tagText}</span>
          </div>
        `;
      }).join('');
    }
  }

  /* ── Render year tab buttons ──────────────────────────────── */
  function renderYearTabs(years) {
    const tabsEl = document.getElementById('hol-year-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = years.map(y => `
      <button
        id="hol-tab-${y}"
        onclick="Holidays.showYear(${y})"
        style="
          padding:var(--sp-2) var(--sp-4);
          border-radius:var(--r-md);
          font-size:var(--text-sm);
          font-weight:600;
          border:1px solid var(--border);
          background:${y === _activeYear ? 'var(--primary-lt)' : 'var(--surface-2)'};
          color:${y === _activeYear ? 'var(--primary)' : 'var(--text-muted)'};
          transition:all 0.15s ease;
          cursor:pointer
        "
      >${y}</button>
    `).join('');
  }

  /* ── Update active tab styling ────────────────────────────── */
  function updateTabStyles(years) {
    years.forEach(y => {
      const btn = document.getElementById(`hol-tab-${y}`);
      if (!btn) return;
      btn.style.background = y === _activeYear ? 'var(--primary-lt)' : 'var(--surface-2)';
      btn.style.color = y === _activeYear ? 'var(--primary)' : 'var(--text-muted)';
    });
  }

  /* ── Render full year holiday list ───────────────────────── */
  function renderYearList(year) {
    const listEl = document.getElementById('hol-year-list');
    if (!listEl) return;

    const yearHols = _allHolidays.filter(h => h.date.getFullYear() === year);
    if (!yearHols.length) {
      listEl.innerHTML = `<div style="color:var(--text-faint);padding:var(--sp-4)">${year} 年無假期數據</div>`;
      return;
    }

    const today = new Date();
    const todayStr = toDateStr(today);

    listEl.innerHTML = yearHols.map((h, i) => {
      const fmt = fmtDate(h.date);
      const isToday = toDateStr(h.date) === todayStr;
      const isPast = daysUntil(h.date) < 0;
      const bg = isToday ? 'var(--success-bg)' : 'var(--surface-2)';
      const border = isToday ? '1px solid var(--success)' : '1px solid var(--divider)';
      const opacity = isPast ? '0.55' : '1';
      return `
        <div class="row-item" style="background:${bg};border:${border};opacity:${opacity}">
          <div style="display:flex;flex-direction:column;gap:2px">
            <span class="row-name">${escHtml(h.name)}</span>
            <span class="row-sub" style="font-family:var(--font-mono)">
              ${fmt.full}
            </span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="tag tag-muted" style="font-size:10px">
              假期 #${i + 1}
            </span>
            ${isToday ? `<span class="tag tag-green" style="font-size:10px">今天</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Summary
    const summEl = document.getElementById('hol-year-summary');
    if (summEl) {
      summEl.textContent = `${year} 年共 ${yearHols.length} 個公眾假期`;
    }
  }

  /* ── Public: show a specific year ─────────────────────────── */
  function showYear(year) {
    _activeYear = year;
    const years = [...new Set(_allHolidays.map(h => h.date.getFullYear()))].sort();
    updateTabStyles(years);
    renderYearList(year);
  }

  /* ── HTML escape ──────────────────────────────────────────── */
  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Parse static holiday array [{date,name}] ─────────────── */
  function parseStaticHolidays(arr) {
    return arr.map(h => {
      const raw = String(h.date);
      const y = parseInt(raw.slice(0, 4));
      const m = parseInt(raw.slice(4, 6)) - 1;
      const d = parseInt(raw.slice(6, 8));
      const date = new Date(y, m, d);
      return { date, name: h.name };
    }).filter(h => !isNaN(h.date.getTime())).sort((a, b) => a.date - b.date);
  }


  /* ── Solar terms 二十四節氣 ────────────────────────────────── */
  const SOLAR_TERMS_2025 = [
    { name:'小寒', en:'Minor Cold',        date: new Date(2025, 0, 5)  },
    { name:'大寒', en:'Major Cold',        date: new Date(2025, 0, 20) },
    { name:'立春', en:'Start of Spring',   date: new Date(2025, 1, 3)  },
    { name:'雨水', en:'Rain Water',        date: new Date(2025, 1, 18) },
    { name:'驚蟄', en:'Awakening of Insects', date: new Date(2025, 2, 5) },
    { name:'春分', en:'Spring Equinox',    date: new Date(2025, 2, 20) },
    { name:'清明', en:'Clear and Bright',  date: new Date(2025, 3, 4)  },
    { name:'穀雨', en:'Grain Rain',        date: new Date(2025, 3, 20) },
    { name:'立夏', en:'Start of Summer',   date: new Date(2025, 4, 5)  },
    { name:'小滿', en:'Grain Buds',        date: new Date(2025, 4, 21) },
    { name:'芒種', en:'Grain in Ear',      date: new Date(2025, 5, 5)  },
    { name:'夏至', en:'Summer Solstice',   date: new Date(2025, 5, 21) },
    { name:'小暑', en:'Minor Heat',        date: new Date(2025, 6, 7)  },
    { name:'大暑', en:'Major Heat',        date: new Date(2025, 6, 22) },
    { name:'立秋', en:'Start of Autumn',   date: new Date(2025, 7, 7)  },
    { name:'處暑', en:'End of Heat',       date: new Date(2025, 7, 22) },
    { name:'白露', en:'White Dew',         date: new Date(2025, 8, 7)  },
    { name:'秋分', en:'Autumnal Equinox',  date: new Date(2025, 8, 22) },
    { name:'寒露', en:'Cold Dew',          date: new Date(2025, 9, 8)  },
    { name:'霜降', en:'Frost Descent',  date: new Date(2025, 9, 23) },
    { name:'立冬', en:'Start of Winter',   date: new Date(2025, 10, 7) },
    { name:'小雪', en:'Minor Snow',        date: new Date(2025, 10, 22)},
    { name:'大雪', en:'Major Snow',        date: new Date(2025, 11, 7) },
    { name:'冬至', en:'Winter Solstice',   date: new Date(2025, 11, 21)},
  ];

  const SOLAR_TERMS_2026 = [
    { name:'小寒', en:'Minor Cold',        date: new Date(2026, 0, 5)  },
    { name:'大寒', en:'Major Cold',        date: new Date(2026, 0, 20) },
    { name:'立春', en:'Start of Spring',   date: new Date(2026, 1, 4)  },
    { name:'雨水', en:'Rain Water',        date: new Date(2026, 1, 19) },
    { name:'驚蟄', en:'Awakening of Insects', date: new Date(2026, 2, 6) },
    { name:'春分', en:'Spring Equinox',    date: new Date(2026, 2, 20) },
    { name:'清明', en:'Clear and Bright',  date: new Date(2026, 3, 5)  },
    { name:'穀雨', en:'Grain Rain',        date: new Date(2026, 3, 20) },
    { name:'立夏', en:'Start of Summer',   date: new Date(2026, 4, 5)  },
    { name:'小滿', en:'Grain Buds',        date: new Date(2026, 4, 21) },
    { name:'芒種', en:'Grain in Ear',      date: new Date(2026, 5, 6)  },
    { name:'夏至', en:'Summer Solstice',   date: new Date(2026, 5, 21) },
    { name:'小暑', en:'Minor Heat',        date: new Date(2026, 6, 7)  },
    { name:'大暑', en:'Major Heat',        date: new Date(2026, 6, 23) },
    { name:'立秋', en:'Start of Autumn',   date: new Date(2026, 7, 7)  },
    { name:'處暑', en:'End of Heat',       date: new Date(2026, 7, 23) },
    { name:'白露', en:'White Dew',         date: new Date(2026, 8, 8)  },
    { name:'秋分', en:'Autumnal Equinox',  date: new Date(2026, 8, 23) },
    { name:'寒露', en:'Cold Dew',          date: new Date(2026, 9, 8)  },
    { name:'霜降', en:'Frost Descent',  date: new Date(2026, 9, 23) },
    { name:'立冬', en:'Start of Winter',   date: new Date(2026, 10, 7) },
    { name:'小雪', en:'Minor Snow',        date: new Date(2026, 10, 22)},
    { name:'大雪', en:'Major Snow',        date: new Date(2026, 11, 7) },
    { name:'冬至', en:'Winter Solstice',   date: new Date(2026, 11, 22)},
  ];

    const SOLAR_TERMS_2027 = [
    { name:'小寒', en:'Minor Cold',        date: new Date(2027, 0, 5)  },
    { name:'大寒', en:'Major Cold',        date: new Date(2027, 0, 20) },
    { name:'立春', en:'Start of Spring',   date: new Date(2027, 1, 4)  },
    { name:'雨水', en:'Rain Water',        date: new Date(2027, 1, 19) },
    { name:'驚蟄', en:'Awakening of Insects', date: new Date(2027, 2, 6) },
    { name:'春分', en:'Spring Equinox',    date: new Date(2027, 2, 21) },
    { name:'清明', en:'Clear and Bright',  date: new Date(2027, 3, 5)  },
    { name:'穀雨', en:'Grain Rain',        date: new Date(2027, 3, 20) },
    { name:'立夏', en:'Start of Summer',   date: new Date(2027, 4, 6)  },
    { name:'小滿', en:'Grain Buds',        date: new Date(2027, 4, 21) },
    { name:'芒種', en:'Grain in Ear',      date: new Date(2027, 5, 6)  },
    { name:'夏至', en:'Summer Solstice',   date: new Date(2027, 5, 21) },
    { name:'小暑', en:'Minor Heat',        date: new Date(2027, 6, 7)  },
    { name:'大暑', en:'Major Heat',        date: new Date(2027, 6, 23) },
    { name:'立秋', en:'Start of Autumn',   date: new Date(2027, 7, 8)  },
    { name:'處暑', en:'End of Heat',       date: new Date(2027, 7, 23) },
    { name:'白露', en:'White Dew',         date: new Date(2027, 8, 8)  },
    { name:'秋分', en:'Autumnal Equinox',  date: new Date(2027, 8, 23) },
    { name:'寒露', en:'Cold Dew',          date: new Date(2027, 9, 8)  },
    { name:'霜降', en:'Frost Descent',  date: new Date(2027, 9, 23) },
    { name:'立冬', en:'Start of Winter',   date: new Date(2027, 10, 7) },
    { name:'小雪', en:'Minor Snow',        date: new Date(2027, 10, 22)},
    { name:'大雪', en:'Major Snow',        date: new Date(2027, 11, 7) },
    { name:'冬至', en:'Winter Solstice',   date: new Date(2027, 11, 22)},
  ];

    const SOLAR_TERMS_2028 = [
    { name:'小寒', en:'Minor Cold',        date: new Date(2028, 0, 6)  },
    { name:'大寒', en:'Major Cold',        date: new Date(2028, 0, 20) },
    { name:'立春', en:'Start of Spring',   date: new Date(2028, 1, 4)  },
    { name:'雨水', en:'Rain Water',        date: new Date(2028, 1, 19) },
    { name:'驚蟄', en:'Awakening of Insects', date: new Date(2028, 2, 5) },
    { name:'春分', en:'Spring Equinox',    date: new Date(2028, 2, 20) },
    { name:'清明', en:'Clear and Bright',  date: new Date(2028, 3, 4)  },
    { name:'穀雨', en:'Grain Rain',        date: new Date(2028, 3, 19) },
    { name:'立夏', en:'Start of Summer',   date: new Date(2028, 4, 5)  },
    { name:'小滿', en:'Grain Buds',        date: new Date(2028, 4, 20) },
    { name:'芒種', en:'Grain in Ear',      date: new Date(2028, 5, 5)  },
    { name:'夏至', en:'Summer Solstice',   date: new Date(2028, 5, 21) },
    { name:'小暑', en:'Minor Heat',        date: new Date(2028, 6, 6)  },
    { name:'大暑', en:'Major Heat',        date: new Date(2028, 6, 22) },
    { name:'立秋', en:'Start of Autumn',   date: new Date(2028, 7, 7)  },
    { name:'處暑', en:'End of Heat',       date: new Date(2028, 7, 22) },
    { name:'白露', en:'White Dew',         date: new Date(2028, 8, 7)  },
    { name:'秋分', en:'Autumnal Equinox',  date: new Date(2028, 8, 22) },
    { name:'寒露', en:'Cold Dew',          date: new Date(2028, 9, 8)  },
    { name:'霜降', en:'Frost Descent',  date: new Date(2028, 9, 23) },
    { name:'立冬', en:'Start of Winter',   date: new Date(2028, 10, 7) },
    { name:'小雪', en:'Minor Snow',        date: new Date(2028, 10, 22)},
    { name:'大雪', en:'Major Snow',        date: new Date(2028, 11, 6) },
    { name:'冬至', en:'Winter Solstice',   date: new Date(2028, 11, 21)},
  ];

  function getAllSolarTerms() {
    return [...SOLAR_TERMS_2025, ...SOLAR_TERMS_2026, ...SOLAR_TERMS_2027, ...SOLAR_TERMS_2028].sort((a, b) => a.date - b.date);
  }

  /* ── Render solar terms section ─────────────────────────── */
  function renderSolarTerms() {
    const el = document.getElementById('hol-solar-terms');
    if (!el) return;

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const all   = getAllSolarTerms();

    // Find current (most recent past or today)
    const past = all.filter(t => t.date <= today);
    const current = past.length > 0 ? past[past.length - 1] : null;

    // Find next upcoming
    const next = all.find(t => t.date > today);

    if (!current && !next) {
      el.innerHTML = `<div style="color:var(--text-faint);font-size:var(--text-xs)">節氣數據不可用</div>`;
      return;
    }

    const nextDays = next ? Math.round((next.date - today) / 86400000) : null;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-4)">
        ${current ? `
          <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);
                      border-left:3px solid var(--teal)">
            <div style="font-size:var(--text-xs);color:var(--text-faint);margin-bottom:var(--sp-2)">
              當前節氣 Current Term
            </div>
            <div style="font-family:'WDXL Lubrifont TC',sans-serif;font-size:var(--text-3xl);font-weight:100;
                        color:var(--teal)">${current.name}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--sp-1)">
              ${current.en}
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-faint);margin-top:var(--sp-1);
                        font-family:var(--font-mono)">
              ${current.date.getFullYear()}年${current.date.getMonth()+1}月${current.date.getDate()}日
            </div>
          </div>
        ` : '<div></div>'}
        ${next ? `
          <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);
                      border-left:3px solid var(--primary)">
            <div style="font-size:var(--text-xs);color:var(--text-faint);margin-bottom:var(--sp-2)">
              下個節氣 Next Term
            </div>
            <div style="font-family:'WDXL Lubrifont TC',sans-serif;font-size:var(--text-3xl);font-weight:100;
                        color:var(--primary)">${next.name}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--sp-1)">
              ${next.en}
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-faint);margin-top:var(--sp-1);
                        font-family:var(--font-mono)">
              ${next.date.getFullYear()}年${next.date.getMonth()+1}月${next.date.getDate()}日
              · 還有 <span style="color:var(--primary);font-weight:700">${nextDays}</span> 天
            </div>
          </div>
        ` : '<div></div>'}
      </div>

      <!-- All upcoming solar terms list -->
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-faint);
                  text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--sp-2)">
        2026年的二十四節氣
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2)">
        ${SOLAR_TERMS_2026.map(t => {
          const isToday = t.date.getTime() === today.getTime();
          const isPast  = t.date < today;
          const isNext  = next && t.date.getTime() === next.date.getTime();
          const bg = isToday ? 'var(--success-bg)' : isNext ? 'var(--primary-lt)' : isPast ? 'var(--surface-2)' : 'var(--surface-2)';
          const color = isToday ? 'var(--success)' : isNext ? 'var(--primary)' : isPast ? 'var(--text-faint)' : 'var(--text)';
          const opacity = isPast && !isToday ? '0.5' : '1';
          const mm = String(t.date.getMonth()+1).padStart(2,'0');
          const dd = String(t.date.getDate()).padStart(2,'0');
          return `
            <div style="padding:var(--sp-2) var(--sp-3);background:${bg};border-radius:var(--r-md);
                        opacity:${opacity};text-align:center;min-width:56px">
              <div style="font-size:12px;font-weight:700;color:${color}">${t.name}</div>
              <div style="font-size:9px;color:var(--text-faint);font-family:var(--font-mono)">${mm}/${dd}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* ── Main fetch + render ──────────────────────────────────── */
  async function refresh() {
    const listEl = document.getElementById('hol-year-list');
    if (!listEl) return;
    listEl.innerHTML = `<div class="skel skel-p" style="margin-bottom:8px"></div><div class="skel skel-p" style="margin-bottom:8px;width:70%"></div>`;

    let loaded = false;

    // Try live API first (works when served from same origin / CORS-enabled host)
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const events = data?.vcalendar?.[0]?.vevent || [];
      if (events.length > 0) {
        _allHolidays = events
          .map(ev => {
            const date = parseDtstart(ev.dtstart);
            const name = parseSummary(ev.summary);
            if (!date) return null;
            return { date, name };
          })
          .filter(Boolean)
          .sort((a, b) => a.date - b.date);
        loaded = true;
      }
    } catch(e) {
      console.warn('[Holidays] Live API blocked (CORS), using static data:', e.message);
    }

    // Fall back to static embedded data
    if (!loaded) {
      _allHolidays = parseStaticHolidays(STATIC_HOLIDAYS);
      // Show a notice
      const notice = document.getElementById('hol-data-notice');
      if (notice) {
        notice.innerHTML = `<div style="font-size:var(--text-xs);color:var(--text-faint);padding:var(--sp-2) 0">
          數據來源：香港1823 (2024–2027年公眾假期)
        </div>`;
      }
    }

    const years = [...new Set(_allHolidays.map(h => h.date.getFullYear()))].sort();

    // Set active year to current or nearest available
    const curYear = new Date().getFullYear();
    if (years.includes(curYear)) _activeYear = curYear;
    else if (years.length) _activeYear = years[years.length - 1];

    renderYearTabs(years);
    renderUpcoming(_allHolidays);
    renderYearList(_activeYear);
    renderSolarTerms();
  }

  return { refresh, showYear };
})();
