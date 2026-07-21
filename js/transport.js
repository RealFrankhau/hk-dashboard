/* ============================================================
   transport.js — MTR, Light Rail schedule fetching
   香港城市儀表板 v2
   ============================================================ */

'use strict';

const MTR_API  = 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php';
const LRT_API  = 'https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule';

/* ── MTR station data: line|sta|lineName|staName ────────────── */
const MTR_STATIONS = [
  {line:'KTL',sta:'WHA',lineName:'觀塘綫',staName:'黃埔'},
  {line:'KTL',sta:'HOM',lineName:'觀塘綫',staName:'何文田'},
  {line:'KTL',sta:'YMT',lineName:'觀塘綫',staName:'油麻地'},
  {line:'KTL',sta:'MOK',lineName:'觀塘綫',staName:'旺角'},
  {line:'KTL',sta:'PRE',lineName:'觀塘綫',staName:'太子'},
  {line:'KTL',sta:'SKM',lineName:'觀塘綫',staName:'石硤尾'},
  {line:'KTL',sta:'KOT',lineName:'觀塘綫',staName:'九龍塘'},
  {line:'KTL',sta:'LOF',lineName:'觀塘綫',staName:'樂富'},
  {line:'KTL',sta:'WTS',lineName:'觀塘綫',staName:'黃大仙'},
  {line:'KTL',sta:'DIH',lineName:'觀塘綫',staName:'鑽石山'},
  {line:'KTL',sta:'CHH',lineName:'觀塘綫',staName:'彩虹'},
  {line:'KTL',sta:'KOB',lineName:'觀塘綫',staName:'九龍灣'},
  {line:'KTL',sta:'NTK',lineName:'觀塘綫',staName:'牛頭角'},
  {line:'KTL',sta:'KWT',lineName:'觀塘綫',staName:'觀塘'},
  {line:'KTL',sta:'LAT',lineName:'觀塘綫',staName:'藍田'},
  {line:'KTL',sta:'YAT',lineName:'觀塘綫',staName:'油塘'},
  {line:'KTL',sta:'TIK',lineName:'觀塘綫',staName:'調景嶺'},
  {line:'TWL',sta:'CEN',lineName:'荃灣綫',staName:'中環'},
  {line:'TWL',sta:'ADM',lineName:'荃灣綫',staName:'金鐘'},
  {line:'TWL',sta:'TST',lineName:'荃灣綫',staName:'尖沙咀'},
  {line:'TWL',sta:'JOR',lineName:'荃灣綫',staName:'佐敦'},
  {line:'TWL',sta:'YMT',lineName:'荃灣綫',staName:'油麻地'},
  {line:'TWL',sta:'MOK',lineName:'荃灣綫',staName:'旺角'},
  {line:'TWL',sta:'PRE',lineName:'荃灣綫',staName:'太子'},
  {line:'TWL',sta:'SSP',lineName:'荃灣綫',staName:'深水埗'},
  {line:'TWL',sta:'CSW',lineName:'荃灣綫',staName:'長沙灣'},
  {line:'TWL',sta:'LCK',lineName:'荃灣綫',staName:'荔枝角'},
  {line:'TWL',sta:'MEF',lineName:'荃灣綫',staName:'美孚'},
  {line:'TWL',sta:'LAK',lineName:'荃灣綫',staName:'荔景'},
  {line:'TWL',sta:'KWF',lineName:'荃灣綫',staName:'葵芳'},
  {line:'TWL',sta:'KWH',lineName:'荃灣綫',staName:'葵興'},
  {line:'TWL',sta:'TWH',lineName:'荃灣綫',staName:'大窩口'},
  {line:'TWL',sta:'TSW',lineName:'荃灣綫',staName:'荃灣'},
  {line:'ISL',sta:'KET',lineName:'港島綫',staName:'堅尼地城'},
  {line:'ISL',sta:'HKU',lineName:'港島綫',staName:'香港大學'},
  {line:'ISL',sta:'SYP',lineName:'港島綫',staName:'西營盤'},
  {line:'ISL',sta:'SHW',lineName:'港島綫',staName:'上環'},
  {line:'ISL',sta:'CEN',lineName:'港島綫',staName:'中環'},
  {line:'ISL',sta:'ADM',lineName:'港島綫',staName:'金鐘'},
  {line:'ISL',sta:'WAC',lineName:'港島綫',staName:'灣仔'},
  {line:'ISL',sta:'CAB',lineName:'港島綫',staName:'銅鑼灣'},
  {line:'ISL',sta:'TIH',lineName:'港島綫',staName:'天后'},
  {line:'ISL',sta:'FOH',lineName:'港島綫',staName:'炮台山'},
  {line:'ISL',sta:'NOP',lineName:'港島綫',staName:'北角'},
  {line:'ISL',sta:'QUB',lineName:'港島綫',staName:'鰂魚涌'},
  {line:'ISL',sta:'TAK',lineName:'港島綫',staName:'太古'},
  {line:'ISL',sta:'SWH',lineName:'港島綫',staName:'西灣河'},
  {line:'ISL',sta:'SKW',lineName:'港島綫',staName:'筲箕灣'},
  {line:'ISL',sta:'HFC',lineName:'港島綫',staName:'杏花邨'},
  {line:'ISL',sta:'CHW',lineName:'港島綫',staName:'柴灣'},
  {line:'EAL',sta:'ADM',lineName:'東鐵綫',staName:'金鐘'},
  {line:'EAL',sta:'EXC',lineName:'東鐵綫',staName:'會展'},
  {line:'EAL',sta:'HUH',lineName:'東鐵綫',staName:'紅磡'},
  {line:'EAL',sta:'MKK',lineName:'東鐵綫',staName:'旺角東'},
  {line:'EAL',sta:'KOT',lineName:'東鐵綫',staName:'九龍塘'},
  {line:'EAL',sta:'TAW',lineName:'東鐵綫',staName:'大圍'},
  {line:'EAL',sta:'SHT',lineName:'東鐵綫',staName:'沙田'},
  {line:'EAL',sta:'FOT',lineName:'東鐵綫',staName:'火炭'},
  {line:'EAL',sta:'RAC',lineName:'東鐵綫',staName:'馬場'},
  {line:'EAL',sta:'UNI',lineName:'東鐵綫',staName:'大學'},
  {line:'EAL',sta:'TAP',lineName:'東鐵綫',staName:'大埔墟'},
  {line:'EAL',sta:'TWO',lineName:'東鐵綫',staName:'太和'},
  {line:'EAL',sta:'FAN',lineName:'東鐵綫',staName:'粉嶺'},
  {line:'EAL',sta:'SHS',lineName:'東鐵綫',staName:'上水'},
  {line:'EAL',sta:'LOW',lineName:'東鐵綫',staName:'羅湖'},
  {line:'EAL',sta:'LMC',lineName:'東鐵綫',staName:'落馬洲'},
  {line:'TKL',sta:'NOP',lineName:'將軍澳綫',staName:'北角'},
  {line:'TKL',sta:'QUB',lineName:'將軍澳綫',staName:'鰂魚涌'},
  {line:'TKL',sta:'YAT',lineName:'將軍澳綫',staName:'油塘'},
  {line:'TKL',sta:'TIK',lineName:'將軍澳綫',staName:'調景嶺'},
  {line:'TKL',sta:'TKO',lineName:'將軍澳綫',staName:'將軍澳'},
  {line:'TKL',sta:'LHP',lineName:'將軍澳綫',staName:'康城'},
  {line:'TKL',sta:'HAH',lineName:'將軍澳綫',staName:'坑口'},
  {line:'TKL',sta:'POA',lineName:'將軍澳綫',staName:'寶琳'},
  {line:'TCL',sta:'HOK',lineName:'東涌綫',staName:'香港'},
  {line:'TCL',sta:'KOW',lineName:'東涌綫',staName:'九龍'},
  {line:'TCL',sta:'OLY',lineName:'東涌綫',staName:'奧運'},
  {line:'TCL',sta:'NAC',lineName:'東涌綫',staName:'南昌'},
  {line:'TCL',sta:'LAK',lineName:'東涌綫',staName:'荔景'},
  {line:'TCL',sta:'TSY',lineName:'東涌綫',staName:'青衣'},
  {line:'TCL',sta:'SUN',lineName:'東涌綫',staName:'欣澳'},
  {line:'TCL',sta:'TUC',lineName:'東涌綫',staName:'東涌'},
  {line:'AEL',sta:'HOK',lineName:'機場快綫',staName:'香港'},
  {line:'AEL',sta:'KOW',lineName:'機場快綫',staName:'九龍'},
  {line:'AEL',sta:'TSY',lineName:'機場快綫',staName:'青衣'},
  {line:'AEL',sta:'AIR',lineName:'機場快綫',staName:'機場'},
  {line:'AEL',sta:'AWE',lineName:'機場快綫',staName:'博覽館'},
  {line:'TML',sta:'TUM',lineName:'屯馬綫',staName:'屯門'},
  {line:'TML',sta:'SIH',lineName:'屯馬綫',staName:'兆康'},
  {line:'TML',sta:'TIS',lineName:'屯馬綫',staName:'天水圍'},
  {line:'TML',sta:'LOP',lineName:'屯馬綫',staName:'朗屏'},
  {line:'TML',sta:'YUL',lineName:'屯馬綫',staName:'元朗'},
  {line:'TML',sta:'KSR',lineName:'屯馬綫',staName:'錦上路'},
  {line:'TML',sta:'TWW',lineName:'屯馬綫',staName:'荃灣西'},
  {line:'TML',sta:'MEF',lineName:'屯馬綫',staName:'美孚'},
  {line:'TML',sta:'NAC',lineName:'屯馬綫',staName:'南昌'},
  {line:'TML',sta:'AUS',lineName:'屯馬綫',staName:'柯士甸'},
  {line:'TML',sta:'ETS',lineName:'屯馬綫',staName:'尖東'},
  {line:'TML',sta:'HUH',lineName:'屯馬綫',staName:'紅磡'},
  {line:'TML',sta:'HOM',lineName:'屯馬綫',staName:'何文田'},
  {line:'TML',sta:'TKW',lineName:'屯馬綫',staName:'土瓜灣'},
  {line:'TML',sta:'SUW',lineName:'屯馬綫',staName:'宋皇臺'},
  {line:'TML',sta:'KAT',lineName:'屯馬綫',staName:'啟德'},
  {line:'TML',sta:'DIH',lineName:'屯馬綫',staName:'鑽石山'},
  {line:'TML',sta:'HIK',lineName:'屯馬綫',staName:'顯徑'},
  {line:'TML',sta:'TAW',lineName:'屯馬綫',staName:'大圍'},
  {line:'TML',sta:'CKT',lineName:'屯馬綫',staName:'車公廟'},
  {line:'TML',sta:'STW',lineName:'屯馬綫',staName:'沙田圍'},
  {line:'TML',sta:'CIO',lineName:'屯馬綫',staName:'第一城'},
  {line:'TML',sta:'SHM',lineName:'屯馬綫',staName:'石門'},
  {line:'TML',sta:'TSH',lineName:'屯馬綫',staName:'大水坑'},
  {line:'TML',sta:'HEO',lineName:'屯馬綫',staName:'恆安'},
  {line:'TML',sta:'MOS',lineName:'屯馬綫',staName:'馬鞍山'},
  {line:'TML',sta:'WKS',lineName:'屯馬綫',staName:'烏溪沙'},
  {line:'SIL',sta:'ADM',lineName:'南港島綫',staName:'金鐘'},
  {line:'SIL',sta:'OCP',lineName:'南港島綫',staName:'海洋公園'},
  {line:'SIL',sta:'WCH',lineName:'南港島綫',staName:'黃竹坑'},
  {line:'SIL',sta:'LET',lineName:'南港島綫',staName:'利東'},
  {line:'SIL',sta:'SOH',lineName:'南港島綫',staName:'海怡半島'},
  {line:'DRL',sta:'SUN',lineName:'迪士尼綫',staName:'欣澳'},
  {line:'DRL',sta:'DIS',lineName:'迪士尼綫',staName:'迪士尼'},
];

/* ── Direction label map ─────────────────────────────────────── */
const DIR_LABEL = { UP: '上行', DOWN: '下行', UT: '上行', DT: '下行' };

/* ── Format ETA chip (same style as bus ETA) ────────────────── */
function fmtEtaChip(mins, timeStr) {
  const m = parseInt(mins, 10);
  if (isNaN(m)) {
    return `<span class="tag tag-muted" style="font-size:12px">—</span>`;
  }
  if (m <= 0) {
    return `<div class="eta-chip eta-now">即將抵達</div>`;
  }
  if (m <= 3) {
    return `<div class="eta-chip eta-soon"><span class="eta-min">${m}</span><span class="eta-unit">分</span>${timeStr ? `<span class="eta-time">${timeStr}</span>` : ''}</div>`;
  }
  return `<div class="eta-chip eta-ok"><span class="eta-min">${m}</span><span class="eta-unit">分</span>${timeStr ? `<span class="eta-time">${timeStr}</span>` : ''}</div>`;
}

//      /* ── Inject ETA chip styles (shared with bus.js) ────────────── */
//      (function injectEtaStyles() {
//        if (document.getElementById('transport-eta-styles')) return;
//        const s = document.createElement('style');
//        s.id = 'transport-eta-styles';
//        s.textContent = `
//          .eta-chip { display:inline-flex; align-items:baseline; gap:2px; border-radius:8px; padding:4px 10px; font-weight:700; }
//          .eta-now  { background:rgba(239,68,68,.15); color:#f87171; font-size:12px; }
//          .eta-soon { background:rgba(234,179,8,.15); color:#fbbf24; }
//          .eta-ok   { background:rgba(34,197,94,.12); color:#4ade80; }
//          .eta-min  { font-size:18px; line-height:1; font-family:var(--font-mono); }
//          .eta-unit { font-size:10px; color:inherit; opacity:.8; margin-left:1px; }
//          .eta-time { font-size:11px; color:inherit; opacity:.7; margin-left:6px; font-family:var(--font-mono); }
//        `;
//        document.head.appendChild(s);
//      })();

/* ── MTR station code → Chinese name ────────────────────────── */
const STA_NAMES = {
ADM: '金鐘', AIR: '機場', AUS: '柯士甸', AWE: '博覽館', CAB: '銅鑼灣', CEN: '中環', 
CHH: '彩虹', CHW: '柴灣', CIO: '第一城', CKT: '車公廟', CSW: '長沙灣', DIH: '鑽石山', 
DIS: '迪士尼', ETS: '尖東', EXC: '會展', FAN: '粉嶺', FOH: '炮台山', FOT: '火炭', 
HAH: '坑口', HEO: '恆安', HIK: '顯徑', HKU: '香港大學', HOK: '香港', HOM: '何文田', 
HUH: '紅磡', JOR: '佐敦', KAT: '啟德', KET: '堅尼地城', KOB: '九龍灣', KOT: '九龍塘', 
KOW: '九龍', KSR: '錦上路', KWF: '葵芳', KWH: '葵興', KWT: '觀塘', LAK: '荔景', 
LAT: '藍田', LCK: '荔枝角', LET: '利東', LHP: '康城', LMC: '落馬洲', LOF: '樂富', 
LOP: '朗屏', LOW: '羅湖', MEF: '美孚', MKK: '旺角東', MOK: '旺角', MOS: '馬鞍山', 
NAC: '南昌', NOP: '北角', NTK: '牛頭', OCP: '海洋公園', OLY: '奧運', POA: '寶琳', 
PRE: '太子', QUB: '鰂魚涌', RAC: '馬場 (只在賽馬日營運)', SHM: '石門', SHS: '上水', 
SHT: '沙田', SHW: '上環', SIH: '兆康', SKM: '石硤尾', SKW: '筲箕灣', SOH: '海怡半島', 
SSP: '深水埗', STW: '沙田圍', SUN: '欣澳', SUW: '宋皇臺', SWH: '西灣河', SYP: '西營盤', 
TAK: '太古', TAP: '大埔墟', TAW: '大圍', TIH: '天后', TIK: '調景嶺', TIS: '天水圍', 
TKO: '將軍澳', TKW: '土瓜灣', TSH: '大水坑', TST: '尖沙咀', TSW: '荃灣', TSY: '青衣', 
TUC: '東涌', TWH: '大窩口', TUM: '屯門', TWO: '太和', TWW: '荃灣西', UNI: '大學', 
WAC: '灣仔', WCH: '黃竹坑', WHA: '黃埔', WKS: '烏溪沙', WTS: '黃大仙', YAT: '油塘', 
YMT: '油麻地', YUL: '元朗'
};

function staName(code) {
  return STA_NAMES[code] || code;
}

function getStationLabel(line, sta) {
  const item = MTR_STATIONS.find(s => s.line === line && s.sta === sta);
  return item ? `${item.lineName} — ${item.staName}` : `${line} — ${sta}`;
}

function getUniqueMTRLines() {
  const lines = {};
  MTR_STATIONS.forEach(s => {
    if (!lines[s.line]) lines[s.line] = s.lineName;
  });
  return Object.entries(lines).sort((a, b) => a[1].localeCompare(b[1], 'zh-HK'));
}

let _mtrInitialized = false;
let _mtrLastLine = '';

function populateMTRSelects(forceDefaults) {
  const lineSel = document.getElementById('t-mtr-line-main');
  const staSel = document.getElementById('t-mtr-sta-main');
  if (!lineSel || !staSel) return;
  const lines = getUniqueMTRLines();
  // Only rebuild line options if they haven't been populated yet
  if (!lineSel.options.length) {
    lineSel.innerHTML = lines.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
  }
  if (forceDefaults && !_mtrInitialized) {
    // First entry: force 東涌線 (TCL) / 青衣 (TSY)
    lineSel.value = 'TCL';
    _mtrLastLine = 'TCL';
    rebuildStationSelect('TCL', 'TSY');
    _mtrInitialized = true;
  } else {
    // Subsequent calls: preserve user's selection
    const curLine = lineSel.value || 'TCL';
    // Only rebuild station options if the line actually changed
    if (curLine !== _mtrLastLine) {
      rebuildStationSelect(curLine);
    }
    _mtrLastLine = curLine;
  }
}

function rebuildStationSelect(line, forceSta) {
  const staSel = document.getElementById('t-mtr-sta-main');
  if (!staSel) return;
  const stations = MTR_STATIONS.filter(s => s.line === line);
  if (!stations.length) {
    staSel.innerHTML = '';
    return;
  }
  staSel.innerHTML = stations.map(s => `<option value="${s.sta}">${s.staName}</option>`).join('');
  if (forceSta && stations.some(s => s.sta === forceSta)) {
    staSel.value = forceSta;
  } else if (!stations.some(s => s.sta === staSel.value)) {
    staSel.value = stations[0].sta;
  }
}

window.updateMTRStationSelect = function(line) {
  rebuildStationSelect(line);
};

function getSelectedMTRFromMain() {
  const lineSel = document.getElementById('t-mtr-line-main');
  const staSel = document.getElementById('t-mtr-sta-main');
  if (!lineSel || !staSel) return null;
  return { line: lineSel.value, sta: staSel.value };
}

window.fetchMTRMain = async function() {
  const selected = getSelectedMTRFromMain();
  if (!selected) return;
  _mtrLastLine = selected.line;
  await fetchMTR(selected.line, selected.sta, 't-mtr');
};

/* ── MTR ──────────────────────────────────────────────────────── */
async function fetchMTR(line, sta, targetId, subtitleId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = skelHtml(2);
  try {
    const url = MTR_API + '?line=' + encodeURIComponent(line) + '&sta=' + encodeURIComponent(sta);
    const res = await fetch(url);
    if (!res.ok) throw new Error('MTR HTTP ' + res.status);
    const d = await res.json();

    if (d.status === 0 || d.status === '0') {
      el.innerHTML = '<div class="row-item"><span style="color:var(--text-faint)">暫停服務或無班次資料</span></div>';
      return;
    }

    const key = line + '-' + sta;
    const schedData = d.data && d.data[key];
    if (!schedData) {
      el.innerHTML = '<div class="row-item"><span style="color:var(--text-faint)">查無此站資料</span></div>';
      return;
    }

    let html = '';
    for (const dir of ['UP', 'DOWN']) {
      const trains = schedData[dir] || [];
      if (!trains.length) continue;
      const label = DIR_LABEL[dir] || dir;
      html += '<div style="margin-bottom:var(--sp-2)"><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">' + label + '</div>';
      html += trains.slice(0, 4).map(function(t) {
        const mins = t.ttnt || '--';
        const destCode = t.dest || '';
        const dest = staName(destCode);
        const platform = t.plat ? '月台 ' + t.plat : '';
        const timeStr = t.time ? t.time.substring(11, 16) : '';
        const minsNum = parseInt(mins, 10);
        const cls = isNaN(minsNum) ? 'tag-muted' : minsNum <= 2 ? 'tag-green' : minsNum <= 5 ? 'tag-yellow' : 'tag-blue';
        const platSpan = platform ? ' <span style="color:var(--text-faint);font-size:10px">' + platform + '</span>' : '';
        return '<div class="row-item">' +
          '<span class="row-name">' + dest + platSpan + '</span>' +
          '<span class="tag ' + cls + '">' + (mins !== '--' ? mins + ' 分鐘' : '—') + (timeStr ? ' ' + timeStr : '') + '</span>' +
          '</div>';
      }).join('');
      html += '</div>';
    }
    el.innerHTML = html || '<div class="row-item"><span style="color:var(--text-faint)">暫無班次</span></div>';

    if (subtitleId) {
      const sub = document.getElementById(subtitleId);
      if (sub) sub.textContent = '更新: ' + new Date().toLocaleTimeString('zh-HK', { hour12: false });
    }
  } catch (e) {
    console.error('MTR fetch error:', e);
    if (el) el.innerHTML = '<div class="row-item"><span style="color:var(--error)">無法連接港鐵服務</span></div>';
  }
}

/* ── Default MTR (home + transport page) ─────────────────────── */
async function fetchDefaultMTR(forceDefaults) {
  populateMTRSelects(forceDefaults);
  const selected = getSelectedMTRFromMain();
  const line = selected && selected.line ? selected.line : 'TCL';
  const sta = selected && selected.sta ? selected.sta : 'TSY';
  await Promise.all([
    fetchMTR(line, sta, 't-mtr'),
    fetchMTR('TCL', 'TSY', 'h-mtr-content')
  ]);
  const homeSub = document.getElementById('h-mtr-subtitle');
  if (homeSub) homeSub.textContent = getStationLabel('TCL', 'TSY');
}

/* ── Custom MTR query (from select) ──────────────────────────── */
window.fetchMTRCustom = async function() {
  const sel = document.getElementById('t-mtr-line');
  if (!sel) return;
  const val = sel.value;
  const parts = val.split('|');
  const line = parts[0];
  const sta = parts[1];
  if (!line || !sta) return;
  await fetchMTR(line, sta, 't-mtr-custom');
};

/* ── Light Rail ──────────────────────────────────────────────── */
async function fetchLRT(staId, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = skelHtml(2);
  try {
    const url = LRT_API + '?station_id=' + encodeURIComponent(staId);
    const res = await fetch(url);
    if (!res.ok) throw new Error('LRT HTTP ' + res.status);
    const d = await res.json();

    const platforms = d.platform_list || [];
    if (!platforms.length) {
      el.innerHTML = '<div class="row-item"><span style="color:var(--text-faint)">暫無班次資料</span></div>';
      return;
    }

    let html = '';
    for (const plat of platforms) {
      const platNo = plat.platform_id || plat.platformNo || '?';
      const routes = plat.route_list || [];
      if (!routes.length) continue;
      html += '<div style="margin-bottom:var(--sp-2)"><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">月台 ' + platNo + '</div>';
      // LRT API only provides minutes (time_ch) — calculate HH:MM arrival from system_time + minutes
      const sysTimeStr = d.system_time || '';
      const sysTime = sysTimeStr ? new Date(sysTimeStr.replace(' ', 'T')) : new Date();
      html += routes.slice(0, 4).map(function(r) {
        const routeNo = r.route_no || r.routeNo || '--';
        const dest = r.dest_ch || r.destCh || r.dest || '';
        const trainLenRaw = r.train_length != null ? r.train_length : (r.trainLength != null ? r.trainLength : null);
        const trainLen = (trainLenRaw != null && !isNaN(parseInt(trainLenRaw, 10)) && parseInt(trainLenRaw, 10) > 0)
          ? parseInt(trainLenRaw, 10)
          : 1;
        // Visualize train_length as repeated tram icons (max 5 to avoid overflow)
        const iconsToShow = Math.min(trainLen, 5);
        const trainLenIcons = '🚈'.repeat(iconsToShow) + (trainLen > 5 ? '+' : '');
        const timeCh = r.time_ch || r.timeCh || '--';
        const minsMatch = timeCh.match(/(\d+)/);
        const mins = minsMatch ? parseInt(minsMatch[1], 10) : null;
        // Compute predicted arrival time HH:MM
        let arrivalTime = '';
        if (mins !== null && !isNaN(sysTime.getTime())) {
          const arr = new Date(sysTime.getTime() + mins * 60000);
          arrivalTime = arr.toLocaleTimeString('zh-HK', { hour:'2-digit', minute:'2-digit', hour12:false });
        }
        const cls = mins === null ? 'tag-blue' : mins <= 2 ? 'tag-green' : mins <= 5 ? 'tag-yellow' : 'tag-blue';
        const displayText = mins !== null ? mins + ' 分鐘' + (arrivalTime ? ' ' + arrivalTime : '') : timeCh;
        return '<div class="row-item">' +
          '<span class="row-name" style="display:flex;align-items:center;gap:var(--sp-3)">' +
            '<span style="font-weight:700;color:var(--primary)">' + routeNo + '</span>' +
            '<span>' + dest + '</span>' +
            '<span style="font-size:var(--text-base);letter-spacing:1px" title="' + trainLen + ' 卡">' + trainLenIcons + '</span>' +
          '</span>' +
          '<span class="tag ' + cls + '">' + displayText + '</span>' +
          '</div>';
      }).join('');
      html += '</div>';
    }
    el.innerHTML = html || '<div class="row-item"><span style="color:var(--text-faint)">暫無班次</span></div>';
  } catch (e) {
    console.error('LRT fetch error:', e);
    if (el) el.innerHTML = '<div class="row-item"><span style="color:var(--error)">無法連接輕鐵服務</span></div>';
  }
}

/* ── Default LRT ─────────────────────────────────────────────── */
async function fetchDefaultLRT() {
  const sel = document.getElementById('t-lrt-sta-main');
  const stationId = sel ? sel.value : '001';
  await fetchLRT(stationId, 't-lrt');
}

/* ── Main LRT query (top card) ─────────────────────────────────── */
window.fetchLRTMain = async function() {
  const sel = document.getElementById('t-lrt-sta-main');
  if (!sel) return;
  await fetchLRT(sel.value, 't-lrt');
};

/* ── Custom LRT query (from select) ─────────────────────────────────────────────── */
window.fetchLRTCustom = async function() {
  const sel = document.getElementById('t-lrt-sta-custom');
  if (!sel) return;
  await fetchLRT(sel.value, 't-lrt-custom');
};

/* ── MTR Service Status ──────────────────────────────────────── */
// Lines to check: line code | representative station
const MTR_STATUS_LINES = [
  { line: 'KTL', sta: 'PRE', label: '觀塘綫' },
  { line: 'TWL', sta: 'PRE', label: '荃灣綫' },
  { line: 'ISL', sta: 'CEN', label: '港島綫' },
  { line: 'EAL', sta: 'HUH', label: '東鐵綫' },
  { line: 'TKL', sta: 'TKO', label: '將軍澳綫' },
  { line: 'TCL', sta: 'TSY', label: '東涌綫' },
  { line: 'AEL', sta: 'TSY', label: '機場快綫' },
  { line: 'TML', sta: 'NAC', label: '屯馬線' },
  { line: 'SIL', sta: 'OCP', label: '南港島綫' },
  { line: 'DRL', sta: 'SUN', label: '迪士尼綫' },
];

async function fetchMTRLineStatus(line, sta) {
  try {
    const url = MTR_API + '?line=' + encodeURIComponent(line) + '&sta=' + encodeURIComponent(sta);
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    return {
      status: d.status,
      message: d.message || d.url || ''
    };
  } catch (e) {
    return { status: -1, message: '無法連接' };
  }
}

async function renderMTRStatus() {
  const el = document.getElementById('t-mtr-status');
  if (!el) return;
  el.innerHTML = skelHtml(1);

  const results = await Promise.all(
    MTR_STATUS_LINES.map(async function(info) {
      const r = await fetchMTRLineStatus(info.line, info.sta);
      return { label: info.label, line: info.line, ...r };
          })
  );

  el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:var(--sp-2)">' +
    results.map(function(r) {
      if (r.status === 1 || r.status === '1') {
        return '<div class="row-item" style="flex-direction:column;align-items:flex-start;gap:4px;min-width:110px;flex:1">' +
          '<span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:600">' + r.label + '</span>' +
          '<span class="tag tag-green" style="font-size:11px">✓ 正常</span>' +
          '</div>';
      } else if (r.status === 0 || r.status === '0') {
        const msg = r.message ? '<div style="font-size:10px;color:var(--error);margin-top:2px;line-height:1.4">' + r.message + '</div>' : '';
        return '<div class="row-item" style="flex-direction:column;align-items:flex-start;gap:4px;min-width:110px;flex:1;border-color:var(--error)">' +
          '<span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:600">' + r.label + '</span>' +
          '<span class="tag tag-red" style="font-size:11px">⚠ 服務受阻</span>' +
          msg +
          '</div>';
      } else {
        return '<div class="row-item" style="flex-direction:column;align-items:flex-start;gap:4px;min-width:110px;flex:1">' +
          '<span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:600">' + r.label + '</span>' +
          '<span class="tag tag-muted" style="font-size:11px">— 未知</span>' +
          '</div>';
      }
    }).join('') +
  '</div>';
}

/* ── Public API ──────────────────────────────────────────────── */
window.Transport = {
  fetchDefaultMTR: fetchDefaultMTR,
  fetchDefaultLRT: fetchDefaultLRT,
  renderMTRStatus: renderMTRStatus,
  refresh: async function(forceDefaults) {
    await Promise.all([fetchDefaultMTR(forceDefaults), fetchDefaultLRT(), renderMTRStatus()]);
  }
};
