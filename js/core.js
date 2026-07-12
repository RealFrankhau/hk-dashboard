/* ============================================================
   core.js — Theme, Clock, Lunar Date, Navigation
   香港城市儀表板 v2
   ============================================================ */

'use strict';

/* ── Shared CORS Proxy (Cloudflare Worker) ────────────────── */
const CORS_PROXY_BASE = 'https://hkdashboard.frankhau.workers.dev/?url=';

/* ── Theme (URL hash + prefers-color-scheme fallback) ─── */
window._hkdbTheme = 'dark';

(function initTheme() {
  // 1. Check URL hash (#dark or #light)
  function getHashTheme() {
    var hash = window.location.hash.toLowerCase();
    if (hash === '#dark') return 'dark';
    if (hash === '#light') return 'light';
    return null;
  }

  // 2. Check system preference
  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return null;
  }

  // Determine initial theme: hash > system > default dark
  var initial = getHashTheme() || getSystemTheme() || 'dark';
  window._hkdbTheme = initial;
  document.documentElement.setAttribute('data-theme', initial);

  var btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    btn.addEventListener('click', function() {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      window._hkdbTheme = next;
      // Update URL hash without triggering page scroll
      if (history.replaceState) {
        history.replaceState(null, '', '#' + next);
      } else {
        window.location.hash = '#' + next;
      }
    });
  }

  // Also listen for hashchange (user edits URL manually)
  window.addEventListener('hashchange', function() {
    var t = getHashTheme();
    if (t && t !== document.documentElement.getAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', t);
      window._hkdbTheme = t;
    }
  });
})();

/* ── Clock ──────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const hms = document.getElementById('clockHMS');
  const date = document.getElementById('clockDate');
  if (hms) {
    hms.textContent = now.toLocaleTimeString('zh-HK', { hour12: false });
  }
  if (date) {
    const d = now.toLocaleDateString('zh-HK', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
    });
    date.textContent = d;
  }

  // Top card clock (24h HH:MM)
  const topTime = document.getElementById('h-top-time');
  if (topTime) {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    topTime.textContent = hh + ':' + mm;
  }

  // Top card date (YYYY年M月D日 (dow))
  const topDate = document.getElementById('h-top-date');
  if (topDate) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const dow = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    topDate.textContent = y + '年' + m + '月' + d + '日 (' + dow + ')';
  }
}
updateClock();
setInterval(updateClock, 1000);

/* ── Lunar Date ─────────────────────────────────────────── */
async function loadLunarDate() {
  const chip = document.getElementById('lunarChip');
  if (!chip) return;
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php?date=${y}${m}${d}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('lunar fetch failed');
    const data = await res.json();
    // API returns: { LunarYear, LunarDate, LunarMonth }  (or similar fields)
    const ly = data.LunarYear || data.lunarYear || '';
    const lm = data.LunarMonth || data.lunarMonth || '';
    const ld = data.LunarDate || data.lunarDate || '';
    if (ld) {
      chip.textContent = `農曆${ly} ${lm}${ld}`;
    } else {
      // Try alternate field structure
      const keys = Object.keys(data);
      const raw = keys.length > 0 ? Object.values(data).join(' ') : '';
      chip.textContent = raw ? `農曆 ${raw}` : '農曆';
    }
  } catch (e) {
    const chip2 = document.getElementById('lunarChip');
    if (chip2) chip2.textContent = '農曆';
  }
}
loadLunarDate();

/* ── Navigation ─────────────────────────────────────────── */
function showPage(name) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Deactivate all top nav tabs
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  // Deactivate all bottom nav items
  document.querySelectorAll('.bottom-nav-item').forEach(t => t.classList.remove('active'));
  // Show target page
  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');
  // Activate top nav tab
  const tab = document.querySelector(`.nav-tab[data-page="${name}"]`);
  if (tab) tab.classList.add('active');
  // Activate bottom nav item
  const btab = document.querySelector(`.bottom-nav-item[data-page="${name}"]`);
  if (btab) btab.classList.add('active');
  // Scroll top of page body
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Track current page globally for refresh logic
  window._currentPage = name;
  if (name === 'transport' && window.Transport && typeof window.Transport.refresh === 'function') {
    // forceDefaults=true only on first entry; subsequent refreshes preserve user's dropdown selection
    window.Transport.refresh(true);
  }
  // Scroll active tab into view in top nav
  setTimeout(() => {
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) activeTab.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  }, 50);
}

// Expose globally
window.showPage = showPage;

/* ── Skeleton helpers ────────────────────────────────────── */
window.skelHtml = (rows = 3) =>
  Array.from({ length: rows }, (_, i) =>
    `<div class="skel skel-p" style="margin-top:${i ? '6px' : '0'}"></div>`
  ).join('');

/* ── AQHI colour helper ──────────────────────────────────── */
window.aqhiClass = function(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return 'tag-muted';
  if (n <= 3)  return 'tag-green';
  if (n <= 6)  return 'tag-yellow';
  if (n <= 7)  return 'tag-red';
  return 'tag-red'; // 8–10+
};

window.aqhiLabel = function(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return '';
  if (n <= 3)  return '低';
  if (n <= 6)  return '中';
  if (n <= 7)  return '高';
  if (n <= 10) return '甚高';
  return '嚴重';
};

/* ── AED wait time colour ────────────────────────────────── */
window.aedClass = function(mins) {
  const n = parseInt(mins, 10);
  if (isNaN(n) || mins === '' || mins === null) return 'tag-muted';
  if (n <= 30) return 'tag-green';
  if (n <= 60) return 'tag-yellow';
  return 'tag-red';
};

/* ── Nav scroll arrows ────────────────────────────────────── */
function navScroll(dir) {
  const tabs = document.getElementById('nav-tabs');
  if (!tabs) return;
  tabs.scrollBy({ left: dir * 180, behavior: 'smooth' });
}
window.navScroll = navScroll;

// Show/hide arrows based on scroll position
(function initNavArrows() {
  function update() {
    const tabs = document.getElementById('nav-tabs');
    const btnL = document.getElementById('nav-scroll-left');
    const btnR = document.getElementById('nav-scroll-right');
    if (!tabs || !btnL || !btnR) return;
    const atStart = tabs.scrollLeft <= 4;
    const atEnd   = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 4;
    btnL.style.opacity = atStart ? '0.3' : '1';
    btnR.style.opacity = atEnd   ? '0.3' : '1';
  }
  document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.getElementById('nav-tabs');
    if (tabs) {
      tabs.addEventListener('scroll', update);
      setTimeout(update, 500);
    }
  });
})();

/* ── Pull-to-Refresh (mobile) ────────────────────────────── */
function initPullToRefresh() {
  let startY = 0;
  let pulling = false;
  let indicator = null;

  function getIndicator() {
    if (indicator) return indicator;
    indicator = document.createElement('div');
    indicator.id = 'ptr-indicator';
    indicator.style.cssText = [
      'position:fixed',
      'top:var(--nav-h,56px)',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:500',
      'background:var(--primary)',
      'color:white',
      'border-radius:999px',
      'padding:6px 16px',
      'font-size:13px',
      'font-weight:600',
      'display:none',
      'align-items:center',
      'gap:6px',
      'box-shadow:0 2px 12px rgba(0,0,0,.3)',
      'pointer-events:none',
    ].join(';');
    indicator.innerHTML = '<span class="ptr-arrow">\u2193</span><span class="ptr-text">\u4e0b\u62c9\u4ee5\u66f4\u65b0</span>';
    document.body.appendChild(indicator);
    return indicator;
  }

  function showPTR(releasing) {
    const el = getIndicator();
    el.style.display = 'flex';
    const arrow = el.querySelector('.ptr-arrow');
    const text = el.querySelector('.ptr-text');
    if (releasing) {
      if (arrow) arrow.textContent = '\u2191';
      if (text) text.textContent = '\u91cb\u653e\u4ee5\u66f4\u65b0';
    } else {
      if (arrow) arrow.textContent = '\u2193';
      if (text) text.textContent = '\u4e0b\u62c9\u4ee5\u66f4\u65b0';
    }
  }

  function hidePTR() {
    const el = document.getElementById('ptr-indicator');
    if (el) el.style.display = 'none';
  }

  function showRefreshing() {
    const el = getIndicator();
    el.style.display = 'flex';
    const arrow = el.querySelector('.ptr-arrow');
    const text = el.querySelector('.ptr-text');
    if (arrow) arrow.style.animation = 'ptr-spin 0.7s linear infinite';
    if (arrow) arrow.textContent = '\u21bb';
    if (text) text.textContent = '\u66f4\u65b0\u4e2d\u2026';
  }

  document.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 10 && window.scrollY === 0) {
      showPTR(dy > 60);
    } else {
      hidePTR();
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!pulling) return;
    const dy = (e.changedTouches[0] ? e.changedTouches[0].clientY : startY) - startY;
    pulling = false;
    if (dy > 60 && window.scrollY === 0) {
      showRefreshing();
      // Add spin keyframe if not present
      if (!document.getElementById('ptr-styles')) {
        const style = document.createElement('style');
        style.id = 'ptr-styles';
        style.textContent = '@keyframes ptr-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
      }
      if (typeof loadAllData === 'function') {
        loadAllData().then(function() {
          hidePTR();
        });
      } else {
        setTimeout(hidePTR, 1200);
      }
    } else {
      hidePTR();
    }
  }, { passive: true });
}

// Init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initPullToRefresh);
