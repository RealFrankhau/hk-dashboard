/* ============================================================
   app.js — Main init, page routing, auto-refresh
   香港城市儀表板 v3 (全方位版)
   ============================================================ */

'use strict';

/* ── Offline / Online Detection ──────────────────────────────────── */
(function initOfflineDetection() {
  // Create the offline banner element
  function getOrCreateBanner() {
    let el = document.getElementById('offline-banner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'offline-banner';
    el.style.cssText = [
      'display:none',
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'z-index:9999',
      'background:linear-gradient(135deg,#78350f,#92400e)',
      'color:white',
      'padding:10px 20px',
      'text-align:center',
      'font-size:14px',
      'font-weight:600',
      'border-bottom:2px solid #f59e0b',
    ].join(';');
    el.textContent = '\u26a0 \u76ee\u524d\u6c92\u6709\u7db2\u7d61\u9023\u7dda \u00b7 \u986f\u793a\u4e0a\u6b21\u7de9\u5b58\u6578\u64da';
    // Insert before page-body or at start of body
    const pageBody = document.querySelector('.page-body');
    if (pageBody) {
      pageBody.parentNode.insertBefore(el, pageBody);
    } else if (document.body) {
      document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
  }

  function showOfflineBanner() {
    const banner = getOrCreateBanner();
    banner.style.display = 'block';
  }

  function hideOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (banner) banner.style.display = 'none';
  }

  // Check initial state after DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    getOrCreateBanner();
    if (!navigator.onLine) {
      showOfflineBanner();
    }
  });

  window.addEventListener('offline', function() {
    showOfflineBanner();
  });

  window.addEventListener('online', function() {
    hideOfflineBanner();
    // Auto-refresh all data when connection restored
    console.log('[HK Dashboard] Back online — refreshing data…');
    if (typeof loadAllData === 'function') loadAllData();
  });
})();


/* ── Bootstrap ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[HK Dashboard v4] Initialising…');

  // 1. Show home page
  showPage('home');

  // 2. Initial data load (parallel) — fire bus presets at the same time, don't wait
  loadAllData();
  initBusPresets();

  // 3. Start auto-refresh loop
  startAutoRefresh();

  console.log('[HK Dashboard v4] Ready.');
});

/* ── Load all data ─────────────────────────────────────────────── */
async function loadAllData() {
  await Promise.allSettled([
    safeRun('Weather',      () => Weather.refresh()),
    safeRun('Transport',    () => Transport.refresh()),
    safeRun('Health',       () => Health.refresh()),
//    safeRun('Environment',  () => Environment.refresh()),
    safeRun('Typhoon',      () => Typhoon.refresh()),
    safeRun('Flights',      () => Flights.refresh()),
  ]);
}

/* ── Bus preset init ──────────────────────────────────────────── */
function initBusPresets() {
  if (typeof Bus === 'undefined') return;
  // Bus.refresh() now handles rendering preset grid internally
  safeRun('Bus', () => Bus.refresh());
}

/* ── Auto-refresh ────────────────────────────────────────────── */
function startAutoRefresh() {
  // Refresh weather/health/environment every 60 seconds
  setInterval(async () => {
    await Promise.allSettled([
      safeRun('Weather',     () => Weather.refresh()),
      safeRun('Health',      () => Health.refresh()),
//      safeRun('Environment', () => Environment.refresh()),
    ]);
  }, 60000);

  // Transport-specific refresh every 30 seconds
  setInterval(async () => {
    await safeRun('Transport', () => Transport.refresh());
  }, 30000);

  // Bus presets every 30 seconds
  setInterval(async () => {
    await safeRun('Bus', () => Bus.refresh());
  }, 30000);

  // Typhoon every 1 hour
  setInterval(async () => {
    await safeRun('Typhoon', () => Typhoon.refresh());
  }, 3600000);

  // Flights every 1 minutes
  setInterval(async () => {
    await safeRun('Flights', () => Flights.refresh());
  }, 60000);
}

/* ── Safe run wrapper ────────────────────────────────────────── */
async function safeRun(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.error(`[${label}] refresh error:`, e);
  }
}

/* ── Page change hook ────────────────────────────────────────── */
const _origShowPage = window.showPage;
window.showPage = function(name) {
  _origShowPage(name);
  // Trigger immediate refresh for the newly visible page
  switch (name) {
    case 'weather':
      safeRun('Weather', () => Weather.refresh());
      safeRun('Tides', () => Tides.refresh());
      safeRun('Typhoon', () => Typhoon.refresh());
      loadWeatherForecastText();
      break;
    case 'transport':
      safeRun('Transport', () => Transport.refresh());
      break;
    case 'health':
      safeRun('Health', () => Health.refresh());
      break;
    case 'bus':
      // Only reload if presets are empty
      break;
    case 'holidays':
      // Load on first visit
      if (!window._holidaysLoaded) {
        window._holidaysLoaded = true;
        safeRun('Holidays', () => Holidays.refresh());
      }
      break;
    case 'airport':
      safeRun('Flights', () => Flights.refresh());
      break;
  }
};

/* ── Load weather forecast text for weather page ─────────────── */
async function loadWeatherForecastText() {
  const cont = document.getElementById('w-flw-content');
  if (!cont) return;
  cont.innerHTML = `<div class="skel skel-p"></div><div class="skel skel-p" style="margin-top:8px"></div>`;
  try {
    const r = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=tc');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const { generalSituation, forecastDesc, outlook } = data;
    cont.innerHTML = `
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
  } catch(e) {
    cont.innerHTML = `<div style="color:var(--error);font-size:var(--text-xs)">載入失敗：${e.message}</div>`;
  }
}

/* ── Refresh indicator in footer ─────────────────────────────── */
(function initRefreshIndicator() {
  const footer = document.querySelector('.footer-inner');
  if (!footer) return;
  const div = document.createElement('div');
  div.id = 'footer-refresh';
  div.style.cssText = 'font-size:10px;color:var(--text-faint)';
  div.textContent = `載入中…`;
  footer.appendChild(div);

  function updateIndicator() {
    const now = new Date().toLocaleTimeString('zh-HK', { hour12: false });
    const el = document.getElementById('footer-refresh');
    if (el) el.textContent = `最後更新 Last updated: ${now}`;
  }

  setTimeout(updateIndicator, 2000);
  setInterval(updateIndicator, 60000);
})();

/* ── PWA Install Prompt ──────────────────────────────────────── */
(function initPWAPrompt() {
  let _deferredPrompt = null;

  // iOS detection
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const isInStandaloneMode = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;

  // Don't show if already installed or already shown this session
  if (isInStandaloneMode) return;

  function createBanner(message, onInstall, onDismiss) {
    const existing = document.getElementById('pwa-install-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: min(420px, calc(100vw - 32px));
      width: 100%;
      animation: slideUp 0.3s ease;
    `;

    banner.innerHTML = `
      <span style="font-size:1.4rem">📱</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--text)">
          加入主屏幕 Add to Home Screen
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;line-height:1.4">
          ${message}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        ${onInstall ? `<button id="pwa-install-btn"
          style="background:var(--primary);color:white;border:none;border-radius:var(--r-md);
                 padding:6px 14px;font-size:var(--text-xs);font-weight:700;cursor:pointer">
          安裝
        </button>` : ''}
        <button id="pwa-dismiss-btn"
          style="background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border);
                 border-radius:var(--r-md);padding:6px 10px;font-size:var(--text-xs);cursor:pointer">
          ✕
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    if (onInstall) {
      document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
        onInstall();
        banner.remove();
      });
    }

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      onDismiss?.();
      banner.remove();
    });
  }

  // Android/Chrome: listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;

    if (window._pwaPromptShown) return;
    window._pwaPromptShown = true;

    // Delay slightly to not interrupt initial load
    setTimeout(() => {
      createBanner(
        '像App一樣使用 — 快速存取、離線瀏覽',
        async () => {
          if (_deferredPrompt) {
            _deferredPrompt.prompt();
            const { outcome } = await _deferredPrompt.userChoice;
            _deferredPrompt = null;
            console.log('[PWA] Install outcome:', outcome);
          }
        },
        () => { console.log('[PWA] Prompt dismissed'); }
      );
    }, 3000);
  });

  // iOS: show manual instructions (no beforeinstallprompt event)
  if (isIOS) {
    if (window._pwaPromptShown) return;

    setTimeout(() => {
      if (window._pwaPromptShown) return;
      window._pwaPromptShown = true;

      createBanner(
        '點擊 Safari 分享按鈕 → 加入主畫面',
        null, // no programmatic install on iOS
        () => { console.log('[PWA] iOS prompt dismissed'); }
      );
    }, 4000);
  }

  // Add slideUp animation if not present
  if (!document.getElementById('pwa-style')) {
    const style = document.createElement('style');
    style.id = 'pwa-style';
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
})();
