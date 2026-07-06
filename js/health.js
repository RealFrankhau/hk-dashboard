/* ============================================================
   health.js — Hospital A&E Waiting Times (醫院管理局)
   香港城市儀表板 v2
   ============================================================ */

'use strict';

const AED_URL = 'https://www.ha.org.hk/opendata/aed/aedwtdata2-tc.json';

let aedSortAsc = true;
let aedMiniSortAsc = false;
let aedMiniType = 't45p50'; // 't45p50' or 't3p50' — default to T45

/* ── Hospital region map ─────────────────────────────────────── */
const HOSP_REGION = {
  // 港島
  '\u746a\u9e97\u91ab\u9662': '\u6e2f\u5cf6', // 瑪麗醫院

  // 九龍
  '\u5ee3\u83ef\u91ab\u9662': '\u4e5d\u9f8d', // 廣華醫院
  '\u660e\u611b\u91ab\u9662': '\u4e5d\u9f8d', // 明愛醫院
  '\u57fa\u7763\u6559\u806f\u5408\u91ab\u9662': '\u4e5d\u9f8d', // 基督教聯合醫院

  // 新界
  '\u5a01\u723e\u65af\u89aa\u738b\u91ab\u9662': '\u65b0\u754c', // 威爾斯親王醫院
  '\u4ec1\u6fdf\u91ab\u9662': '\u65b0\u754c', // 仁濟醫院
  '\u5c6f\u9580\u91ab\u9662': '\u65b0\u754c', // 屯門醫院
  '\u535a\u611b\u91ab\u9662': '\u65b0\u754c', // 博愛醫院
  '\u5929\u6c34\u570d\u91ab\u9662': '\u65b0\u754c', // 天水圍醫院
  '\u5c07\u8ecd\u6fb3\u91ab\u9662': '\u65b0\u754c', // 將軍澳醫院
  '\u96c5\u9e97\u6c0f\u4f55\u5999\u9f61\u90a3\u6253\u7d20\u91ab\u9662': '\u65b0\u754c', // 雅麗氏何妙齡那打素醫院
  '\u9577\u6d32\u91ab\u9662': '\u65b0\u754c', // 長洲醫院

  // 其他
  '\u746a\u5564\u83ef\u91ab\u9662': '\u54fb\u53e6', // 瑪嘉烈醫院
  '\u4f0a\u5229\u6c99\u4f2f\u90a3\u91ab\u9662': '\u54fb\u53e6', // 伊利沙伯醫院
  '\u5317\u5927\u5d61\u5c71\u91ab\u9662': '\u54fb\u53e6', // 北大嶼山醫院
  '\u6771\u5340\u5c2b\u5fb7\u592b\u4eba\u90a3\u6253\u7d20\u91ab\u9662': '\u54fb\u53e6', // 東區尤德夫人那打素醫院
  '\u5314\u5340\u91ab\u9662': '\u54fb\u53e6', // 北區醫院
  '\u5f8b\u6566\u6cbb\u53ca\u9127\u8fdc\u5805\u91ab\u9662': '\u54fb\u53e6', // 律敦治醫院
};;

/* ── Wait time string → minutes (for colour coding) ─────────── */
function parseWaitMins(str) {
  if (!str || str === '--') return null;
  // "24 分鐘" → 24
  const minsMatch = str.match(/(\d+(?:\.\d+)?)\s*分/);
  if (minsMatch) return parseFloat(minsMatch[1]);
  // "1 小時" → 60, "1.5 小時" → 90
  const hrsMatch = str.match(/(\d+(?:\.\d+)?)\s*小時/);
  if (hrsMatch) return parseFloat(hrsMatch[1]) * 60;
  // "少於 15 分鐘"
  const ltMatch = str.match(/少於\s*(\d+)/);
  if (ltMatch) return parseInt(ltMatch[1], 10);
  return null;
}

function aedWaitClass(str) {
  const mins = parseWaitMins(str);
  if (mins === null) return 'tag-muted';
  if (mins <= 30) return 'tag-green';
  if (mins <= 60) return 'tag-yellow';
  return 'tag-red';
}

/* ── Fetch & render ──────────────────────────────────────────── */
async function fetchAED() {
  const fullEl  = document.getElementById('h-aed-full');
  const updEl   = document.getElementById('h-aed-upd');
  const miniEl  = document.getElementById('h-aed-content');
  const healthMiniEl = document.getElementById('h-aed-content-health-mini');

  if (fullEl) fullEl.innerHTML = skelHtml(3);
  if (miniEl) miniEl.innerHTML = skelHtml(3);
  // healthMiniEl skeleton is cleared inside the handler below

  try {
    const res = await fetch(AED_URL);
    if (!res.ok) throw new Error('AED HTTP ' + res.status);
    const d = await res.json();

    const list = d.waitTime || [];
    const upd  = d.updateTime || '';

    if (updEl) {
      const rtFn = typeof window.relativeTime === 'function' ? window.relativeTime : function(s) { return s; };
      updEl.textContent = upd ? rtFn(upd) : '';
    }

    // Home mini — show 10 hospitals with longest wait times
    if (miniEl && list.length) {
      const sortedList = [...list].sort((a, b) => {
        const timeA = parseWaitMins(a.t45p50) || 0;
        const timeB = parseWaitMins(b.t45p50) || 0;
        return timeB - timeA;
      });
      miniEl.innerHTML = sortedList.slice(0, 10).map(h => renderAedRow(h)).join('');
    }

    // Health page mini — also show 5 hospitals with longest wait times
    if (healthMiniEl && list.length) {
      // Clear skeleton HTML first
      healthMiniEl.innerHTML = '';
      
      // 1. Handle the sort button separately from the list content
      let btn = document.getElementById('aed-mini-sort-btn');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'aed-mini-sort-btn';
        btn.className = 'btn-sort';
        btn.textContent = '⇅ 排序';
        btn.style.cssText = 'margin-bottom:var(--sp-3);display:block;width:fit-content;margin-left:auto;';
        
        btn.onclick = (e) => {
          e.preventDefault();
          aedMiniSortAsc = !aedMiniSortAsc;
          fetchAED();
        };
        
        healthMiniEl.appendChild(btn);
        
        const container = document.createElement('div');
        container.id = 'aed-mini-list-container';
        healthMiniEl.appendChild(container);
      } else {
        // Re-append button and container to the cleared element
        const container = document.getElementById('aed-mini-list-container');
        healthMiniEl.appendChild(btn);
        if (container) healthMiniEl.appendChild(container);
      }

      // Wire up the dropdown selector (only once)
      const sel = document.getElementById('aed-mini-type-select');
      if (sel && !sel.dataset.wired) {
        sel.dataset.wired = '1';
        sel.value = aedMiniType;
        sel.onchange = (e) => {
          aedMiniType = e.target.value;
          // Update the card title to reflect the selected type
          const titleEl = healthMiniEl.closest('.card').querySelector('.card-title');
          if (titleEl) {
            titleEl.textContent = aedMiniType === 't3p50'
              ? '全港公立醫院急症室等候時間 - T3 甲類急症（緊急）已排序'
              : '全港公立醫院急症室等候時間 - T45 乙丙類急症（半緊急/非緊急）已排序';
          }
          fetchAED();
        };
      }

      const sortedList = [...list].sort((a, b) => {
        const timeA = parseWaitMins(a[aedMiniType]) || 0;
        const timeB = parseWaitMins(b[aedMiniType]) || 0;
        return aedMiniSortAsc ? timeA - timeB : timeB - timeA;
      });
      
      const listCont = document.getElementById('aed-mini-list-container');
      if (listCont) {
        listCont.innerHTML = sortedList.slice(0, 18).map(h => renderAedRow(h, aedMiniType)).join('');
      }
    }

    // Full page — all hospitals grouped by region
    if (fullEl && list.length) {
      const grouped = {};
      list.forEach(function(h) {
        const reg = HOSP_REGION[h.hospName] || '其他';
        if (!grouped[reg]) grouped[reg] = [];
        grouped[reg].push(h);
      });

      let html = '';
      const order = ['港島', '九龍', '新界', '其他'];
      
      // Define the desired order of hospitals within each region
      const hospitalOrder = {
        '港島': ['瑪麗醫院'],
        '九龍': ['廣華醫院', '明愛醫院', '基督教聯合醫院'],
        '新界': ['威爾斯親王醫院', '仁濟醫院', '屯門醫院', '博愛醫院', '天水圍醫院', '將軍澳醫院', '雅麗氏何妙齡那打素醫院', '長洲醫院'],
        '其他': ['瑪嘉烈醫院', '伊利沙伯醫院', '北大嶼山醫院', '東區尤德夫人那打素醫院', '北區醫院', '律敦治醫院']
      };

      for (const reg of order) {
        if (!grouped[reg]) continue;
        
        // Sort hospitals in this region based on the defined order
        const regionHospitals = grouped[reg].sort((a, b) => {
          const orderList = hospitalOrder[reg] || [];
          const indexA = orderList.indexOf(a.hospName);
          const indexB = orderList.indexOf(b.hospName);
          
          let result = 0;
          // If both are in the list, sort by list index
          if (indexA !== -1 && indexB !== -1) result = indexA - indexB;
          // If only one is in the list, put it first
          else if (indexA !== -1) result = -1;
          else if (indexB !== -1) result = 1;
          // Otherwise, maintain original order (or alphabetical)
          else result = a.hospName.localeCompare(b.hospName);

          return aedSortAsc ? -result : result;
        });

        html += '<div style="grid-column:1/-1;font-size:var(--text-xs);font-weight:700;color:var(--primary);margin:var(--sp-2) 0 4px;text-transform:uppercase;letter-spacing:.05em">' + reg + '</div>';
        html += regionHospitals.map(h => renderAedCard(h)).join('');
      }
      
      fullEl.innerHTML = html;
    }

     if (!list.length) {
       if (fullEl) fullEl.innerHTML = '<div style="color:var(--text-faint)">暫無急症室等候資料</div>';
       if (miniEl) miniEl.innerHTML = '<div style="color:var(--text-faint)">暫無資料</div>';
       if (healthMiniEl) healthMiniEl.innerHTML = '<div style="color:var(--text-faint)">暫無資料</div>';
     }
   } catch (e) {
     console.error('AED fetch error:', e);
     const errMsg = '<div class="row-item"><span style="color:var(--error)">無法載入急症室等候資料</span></div>';
     if (fullEl) fullEl.innerHTML = errMsg;
     if (miniEl) miniEl.innerHTML = errMsg;
     if (healthMiniEl) healthMiniEl.innerHTML = errMsg;
   }
 }

/* ── Row renderer (home mini) ────────────────────────────────── */
function renderAedRow(h, type) {
  const field = type || 't45p50';
  const val = h[field] || '--';
  const cls = aedWaitClass(val);
  return '<div class="row-item">' +
    '<span class="row-name" style="font-size:var(--text-xs)">' + h.hospName + '</span>' +
    '<span class="tag ' + cls + '" style="font-size:10px">' + (val !== '--' ? val : '—') + '</span>' +
    '</div>';
}

/* ── Card renderer (full page) ───────────────────────────────── */
function renderAedCard(h) {
  const t3  = h.t3p50  || '--';
  const t45 = h.t45p50 || '--';
  const t2  = h.t2wt   || '';

  const clsT3  = aedWaitClass(t3);
  const clsT45 = aedWaitClass(t45);

  const t2Row = t2 ? '<div style="font-size:10px;color:var(--text-faint)">乙類 T2: ' + t2 + '</div>' : '';

  return '<div style="background:var(--surface-2);border-radius:var(--r-lg);padding:var(--sp-3);display:flex;flex-direction:column;gap:6px;border:1px solid var(--border)">' +
    '<div style="font-weight:600;font-size:var(--text-sm)">' + h.hospName + '</div>' +
    t2Row +
    '<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">' +
      '<div style="flex:1;min-width:80px">' +
        '<div style="font-size:10px;color:var(--text-faint);margin-bottom:2px">甲類 T3 (中位數)</div>' +
        '<span class="tag ' + clsT3 + '">' + (t3 !== '--' ? t3 : '—') + '</span>' +
      '</div>' +
      '<div style="flex:1;min-width:80px">' +
        '<div style="font-size:10px;color:var(--text-faint);margin-bottom:2px">乙丙類 T45 (中位數)</div>' +
        '<span class="tag ' + clsT45 + '">' + (t45 !== '--' ? t45 : '—') + '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ── Public API ──────────────────────────────────────────────── */
window.Health = {
  fetchAED: fetchAED,
  refresh: fetchAED
};
