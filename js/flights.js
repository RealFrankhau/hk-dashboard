/* ============================================================
   flights.js — Real-time Flight Information
   Hong Kong International Airport (HKIA)
   香港國際機場實時航班資訊
   ============================================================
   Data source: HKIA REST API proxied via /hkia-flights
   Endpoint:    /flightinfo-rest/rest/flights?span=1&date=...&lang=...&cargo=...&arrival=...
   Refresh:     every 5 minutes
   ============================================================ */

'use strict';

const FLIGHTS_PER_PAGE = 15;
const HKIA_PROXY = '/hkia-flights';

/* ── Airline name mapping (IATA → display name) ────────────── */
const AIRLINE_NAMES = {
  // Major Hong Kong carriers
  'CPA': '國泰航空 Cathay Pacific',
  'HKE': '香港快運 HK Express',
  'CRK': '香港航空 Hong Kong Airlines',
  'HDA': '香港航空 Hong Kong Airlines',
  // Mainland China
  'CCA': '中國國際航空 Air China',
  'CES': '中國東方航空 China Eastern',
  'CSN': '中國南方航空 China Southern',
  'HXA': '海南航空 Hainan Airlines',
  'CBJ': '深圳航空 Shenzhen Airlines',
  'CXA': '廈門航空 Xiamen Airlines',
  'CSC': '四川航空 Sichuan Airlines',
  'CGZ': '浙江長龍航空 Loong Air',
  'CHB': '山東航空 Shandong Airlines',
  // Taiwan
  'CAL': '中華航空 China Airlines',
  'EVA': '長榮航空 EVA Air',
  'TTW': '台灣虎航 Tigerair Taiwan',
  'SJX': '星宇航空 STARLUX',
  // Macau
  'AMU': '澳門航空 Air Macau',
  // Japan
  'ANA': '全日空 All Nippon Airways',
  'JAL': '日本航空 Japan Airlines',
  'JJP': '捷星日本 Jetstar Japan',
  'APJ': '樂桃航空 Peach Aviation',
  // Korea
  'AAR': '韓亞航空 Asiana Airlines',
  'KAL': '大韓航空 Korean Air',
  'JNA': '真航空 Jin Air',
  'TWB': '德威航空 Tway Air',
  // Southeast Asia
  'SIA': '新加坡航空 Singapore Airlines',
  'TGW': '酷航 Scoot',
  'MAS': '馬來西亞航空 Malaysia Airlines',
  'MXD': '馬印航空 Malindo Air',
  'THA': '泰國國際航空 Thai Airways',
  'AIQ': '泰國亞航 Thai AirAsia',
  'FDX': '泰國飛鳥航空 Nok Air',
  'CBI': '嘉魯達印尼航空 Garuda Indonesia',
  'AIA': '印尼亞航 Indonesia AirAsia',
  'PAL': '菲律賓航空 Philippine Airlines',
  'CEB': '宿霧太平洋航空 Cebu Pacific',
  'APG': '菲律賓亞航 AirAsia Philippines',
  'VJC': '越捷航空 VietJet Air',
  'HVN': '越南航空 Vietnam Airlines',
  'BAV': '緬甸航空 Myanmar Airways',
  'MLI': '緬甸國際航空 Myanmar National Airlines',
  // South Asia
  'AIC': '印度航空 Air India',
  'IGO': 'IndiGo',
  'SVA': '沙特阿拉伯航空 Saudi Arabian Airlines',
  'UAE': '阿聯酋航空 Emirates',
  'ETD': '阿提哈德航空 Etihad Airways',
  'QTR': '卡塔爾航空 Qatar Airways',
  'OMA': '阿曼航空 Oman Air',
  // Europe
  'BAW': '英國航空 British Airways',
  'AFR': '法國航空 Air France',
  'KLM': '荷蘭皇家航空 KLM',
  'DLH': '漢莎航空 Lufthansa',
  'AUA': '奥地利航空 Austrian Airlines',
  'SWR': '瑞士國際航空 Swiss',
  'ITY': '意大利航空 ITA Airways',
  'IBE': '西班牙國家航空 Iberia',
  'TAP': '葡萄牙航空 TAP Portugal',
  'SAS': '北歐航空 SAS',
  'FIN': '芬蘭航空 Finnair',
  // Americas
  'UAL': '聯合航空 United Airlines',
  'AAL': '美國航空 American Airlines',
  'DAL': '達美航空 Delta Air Lines',
  'ACA': '加拿大航空 Air Canada',
  // Australia / NZ
  'QFA': '澳洲航空 Qantas',
  'VOZ': '維珍澳洲航空 Virgin Australia',
  'ANZ': '新西蘭航空 Air New Zealand',
  // Cargo
  'CLX': 'Cargolux',
  'FDX': 'FedEx',
  'UPS': 'UPS Airlines',
  'GEC': 'Lufthansa Cargo',
  'MPH': 'Martinair',
  // Additional airlines (added for HKIA coverage)
  'HGB': '香港航空 Hong Kong Airlines',
  'CSH': '上海航空 Shanghai Airlines',
  'CSZ': '深圳航空 Shenzhen Airlines',
  'CHH': '華夏航空 Joy Air',
  'CQH': '春秋航空 Spring Airlines',
  'CDC': '中州航空 Central Airlines',
  'DKH': '東海航空 Donghai Airlines',
  'MDA': '華信航空 Mandarin Airlines',
  'ESR': '樂桃航空 Peach Aviation',
  'JJA': '真航空 Jin Air',
  'ASV': 'Air Seoul',
  'THT': '法屬波利尼西亞航空 Air Tahiti Nui',
  'AXM': '印尼亞航 Indonesia AirAsia',
  'BKP': '曼谷航空 Bangkok Airways',
  'VIR': '維珍航空 Virgin Atlantic',
  'ALK': '斯里蘭卡航空 SriLankan Airlines',
  'QDA': '卡塔爾航空 Qatar Airways',
  'GFA': '海灣航空 Gulf Air',
  'DAH': '阿爾及利亞航空 Air Algerie',
  'FJI': '斐濟航空 Fiji Airways',
  'THY': '土耳其航空 Turkish Airlines',
  'HHN': '長龍航空 Loong Air',
  'AZA': '意大利航空 ITA Airways',
  'CDG': '中國國際航空 Air China',
  'SPQ': 'Sprint Air',
  'TBA': '包機 Charter',
  'JBU': '捷藍航空 JetBlue',
  'ASL': '阿拉斯加航空 Alaska Airlines',
  'LAN': 'LATAM航空 LATAM Airlines',
  'MGL': '蒙古航空 MIAT Mongolian',
  'WJA': '西捷航空 WestJet',
  'FFM': 'Firefly',
  'ETH': '衣索比亞航空 Ethiopian Airlines',
  // Generic fallbacks
  'ZZZ': '其他 Other',
};

/* ── IATA city/airport code → Chinese city names ──────────── */
const CITY_NAMES = {
  // Hong Kong
  'HKG': '香港',
  // Mainland China
  'PEK': '北京', 'PKX': '北京大興', 'SHA': '上海虹橋', 'PVG': '上海浦東',
  'CAN': '廣州', 'SZX': '深圳', 'CTU': '成都', 'CKG': '重慶',
  'XIY': '西安', 'HGH': '杭州', 'HFE': '合肥', 'NKG': '南京',
  'WUH': '武漢', 'CSX': '長沙', 'NNG': '南寧', 'KMG': '昆明',
  'HAK': '海口', 'SYX': '三亞', 'XMN': '廈門', 'FOC': '福州',
  'DLC': '大連', 'SHE': '瀋陽', 'TSN': '天津', 'TNA': '濟南',
  'QNG': '泉州', 'CGO': '鄭州', 'LJG': '麗江', 'LUM': '芒市',
  'ZHA': '湛江', 'HYN': '台州', 'WNZ': '溫州', 'JHG': '西雙版納',
  'DLU': '大理', 'BHY': '北海', 'NGB': '寧波', 'YNT': '煙台',
  'TPE': '台北', 'TSA': '台北松山', 'KHH': '高雄', 'TNN': '台南',
  'MFM': '澳門',
  // Japan
  'NRT': '東京成田', 'HND': '東京羽田', 'KIX': '大阪關西', 'ITM': '大阪伊丹',
  'NGO': '名古屋', 'FUK': '福岡', 'CTS': '札幌', 'OKA': '沖繩',
  'KOJ': '鹿兒島', 'KIJ': '新潟', 'SDJ': '仙台', 'HKD': '函館',
  'KMJ': '熊本', 'OIT': '大分', 'HIJ': '廣島', 'TAK': '高松',
  'MYJ': '松山', 'TKS': '德島', 'ISG': '石垣', 'MMY': '宮古',
  // Korea
  'ICN': '首爾仁川', 'GMP': '首爾金浦', 'PUS': '釜山', 'CJU': '濟州',
  'TAE': '大邱', 'KWJ': '光州',
  // Southeast Asia
  'SIN': '新加坡', 'KUL': '吉隆坡', 'PEN': '檳城', 'BKI': '亞庇',
  'BKK': '曼谷', 'DMK': '曼谷廊曼', 'HKT': '布吉', 'CNX': '清邁',
  'USM': '蘇梅', 'KBV': '甲米', 'UTP': '烏塔保',
  'CGK': '雅加達', 'DPS': '峇里', 'SUB': '泗水', 'KNO': '棉蘭',
  'MNL': '馬尼拉', 'CEB': '宿霧', 'DVO': '達沃', 'KLO': '長灘島',
  'HAN': '河內', 'SGN': '胡志明市', 'DAD': '峴港', 'PQC': '富國島',
  // South Asia & Middle East
  'BOM': '孟買', 'DEL': '新德里', 'BLR': '班加羅爾', 'MAA': '清奈',
  'CMB': '可倫坡', 'DAC': '達卡', 'KTM': '加德滿都',
  'DXB': '杜拜', 'AUH': '阿布扎比', 'DOH': '多哈', 'RUH': '利雅德',
  'JED': '吉達', 'IKA': '德黑蘭', 'KWI': '科威特', 'BAH': '巴林',
  'MCT': '馬斯喀特', 'TLV': '特拉維夫',
  // Europe
  'LHR': '倫敦希斯路', 'LGW': '倫敦格域', 'MAN': '曼徹斯特',
  'CDG': '巴黎', 'ORY': '巴黎奧利', 'NCE': '尼斯', 'MRS': '馬賽',
  'AMS': '阿姆斯特丹', 'FRA': '法蘭克福', 'MUC': '慕尼黑', 'DUS': '杜塞爾多夫',
  'BER': '柏林', 'HAM': '漢堡', 'ZRH': '蘇黎世', 'GVA': '日內瓦',
  'VIE': '維也納', 'BRU': '布魯塞爾', 'CPH': '哥本哈根', 'ARN': '斯德哥爾摩',
  'OSL': '奧斯陸', 'HEL': '赫爾辛基', 'TLL': '塔林',
  'FCO': '羅馬', 'MXP': '米蘭', 'VCE': '威尼斯', 'NAP': '那不勒斯',
  'MAD': '馬德里', 'BCN': '巴塞隆拿', 'LIS': '里斯本', 'OPO': '波圖',
  'DUB': '都柏林', 'KEF': '雷克雅未克', 'IST': '伊斯坦堡',
  // Africa
  'JNB': '約翰內斯堡', 'CPT': '開普敦', 'NBO': '內羅畢', 'LOS': '拉各斯',
  'CAI': '開羅', 'CMN': '卡薩布蘭卡', 'ADD': '阿迪斯阿貝巴',
  // Americas
  'LAX': '洛杉磯', 'JFK': '紐約甘迺迪', 'EWR': '紐華克', 'SFO': '三藩市',
  'ORD': '芝加哥', 'SEA': '西雅圖', 'YVR': '溫哥華', 'YYZ': '多倫多',
  'HNL': '檀香山', 'MEX': '墨西哥城', 'PTY': '巴拿馬城',
  // Australia / NZ / Pacific
  'SYD': '悉尼', 'MEL': '墨爾本', 'BNE': '布里斯班', 'PER': '珀斯',
  'ADL': '阿德萊德', 'CNS': '開恩茲',
  'AKL': '奧克蘭', 'WLG': '威靈頓', 'CHC': '基督城',
};

/* ── Cached data + render state ───────────────────────────── */
const _state = {
  departures: { raw: [], filtered: [], page: 0, loading: false, error: null, lastUpdated: null },
  arrivals:   { raw: [], filtered: [], page: 0, loading: false, error: null, lastUpdated: null },
};

/* ══ HELPERS ═══════════════════════════════════════════════ */

function airlineName(code) {
  if (!code) return '—';
  return AIRLINE_NAMES[code] || `${code}`;
}

function cityName(code) {
  if (!code) return '—';
  return CITY_NAMES[code] || code;
}

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return Number.MAX_SAFE_INTEGER;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

function pickTodayList(apiResponse) {
  if (!Array.isArray(apiResponse)) return [];
  const today = getTodayDateStr();
  const slot = apiResponse.find(d => d && d.date === today);
  if (slot && Array.isArray(slot.list)) return slot.list;
  // Fallback: most recent date
  if (apiResponse.length > 0 && Array.isArray(apiResponse[0].list)) {
    return apiResponse[0].list;
  }
  return [];
}

function sortByTime(flights) {
  return flights.slice().sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

function statusToTag(status) {
  if (!status) return { tag: 'tag-muted', label: '—' };
  const s = status.toLowerCase();
  if (s.includes('cancelled') || s.includes('canceled')) return { tag: 'tag-red', label: status };
  if (s.includes('delayed') || s.includes('late')) return { tag: 'tag-yellow', label: status };
  if (s.includes('boarding') || s.includes('final call')) return { tag: 'tag-blue', label: status };
  if (s.includes('departed') || s.includes('dep ') || s.includes('left gate') || s.includes('airborne') || s.includes('arrived') || s.includes('landed')) return { tag: 'tag-green', label: status };
  if (s.includes('at gate') || s.includes('gate closed') || s.includes('check-in')) return { tag: 'tag-blue', label: status };
  if (s.includes('on time') || s.includes('scheduled')) return { tag: 'tag-green', label: status };
  return { tag: 'tag-muted', label: status };
}

function formatFlightNumbers(flights) {
  if (!flights || !Array.isArray(flights) || flights.length === 0) return '—';
  return flights.map(f => f.no).filter(Boolean).join(' / ');
}

function formatCodeshareTooltip(flights) {
  if (!flights || !Array.isArray(flights) || flights.length <= 1) return '';
  return flights.slice(1).map(f => `${f.no} (${airlineName(f.airline)})`).join(', ');
}

/* ══ FETCH ══════════════════════════════════════════════════ */

async function fetchFlights(isArrival) {
  const state = isArrival ? _state.arrivals : _state.departures;
  state.loading = true;
  state.error = null;

  try {
    const params = new URLSearchParams({
      span: '1',
      date: getTodayDateStr(),
      lang: 'en',
      cargo: 'false',
      arrival: String(isArrival),
    });
    const url = `${HKIA_PROXY}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = sortByTime(pickTodayList(data));
    state.raw = list;
    state.filtered = list;
    state.page = 0;
    state.lastUpdated = new Date();
  } catch (err) {
    state.error = err.message || 'Unknown error';
    console.error(`[Flights] ${isArrival ? 'Arrivals' : 'Departures'} fetch failed:`, err);
  } finally {
    state.loading = false;
  }
}

async function fetchAll() {
  await Promise.allSettled([fetchFlights(false), fetchFlights(true)]);
  renderDepartures();
  renderArrivals();
}

/* ══ RENDER: skeletons / errors ════════════════════════════ */

function renderSkeleton(isArrival) {
  return `
    <div class="skel" style="height:24px;width:30%;margin-bottom:12px"></div>
    <div class="skel" style="height:14px;width:100%;margin-bottom:6px"></div>
    <div class="skel" style="height:14px;width:100%;margin-bottom:6px"></div>
    <div class="skel" style="height:14px;width:100%;margin-bottom:6px"></div>
    <div class="skel" style="height:14px;width:90%;margin-bottom:6px"></div>
  `;
}

function renderError(isArrival, msg) {
  const label = isArrival ? '抵港航班' : '離港航班';
  return `
    <div style="padding:var(--sp-5);text-align:center;color:var(--text-faint)">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin:0 auto var(--sp-3);opacity:.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted)">${label}暫時無法載入</div>
      <div style="font-size:var(--text-xs);margin-top:var(--sp-1)">${msg}</div>
    </div>
  `;
}

/* ══ RENDER: header & pagination ═══════════════════════════ */

function renderHead(isArrival) {
  const state = isArrival ? _state.arrivals : _state.departures;
  const total = state.filtered.length;
  const start = total === 0 ? 0 : state.page * FLIGHTS_PER_PAGE + 1;
  const end = Math.min((state.page + 1) * FLIGHTS_PER_PAGE, total);
  const totalPages = Math.max(1, Math.ceil(total / FLIGHTS_PER_PAGE));
  const updatedStr = state.lastUpdated
    ? `更新：${state.lastUpdated.toLocaleTimeString('zh-HK', { hour12: false })}`
    : '';
  const titleZh = isArrival ? '抵港航班' : '離港航班';
  const titleEn = isArrival ? 'Arrival Flights' : 'Departure Flights';

  return `
    <div class="card-head">
      <div>
        <div class="card-title">${titleZh} · <span style="font-weight:500;color:var(--text-muted);font-size:var(--text-sm)">${titleEn}</span></div>
        <div class="card-sub">${updatedStr} · 共 ${total} 班次 Total ${total} flights</div>
      </div>
      <div style="display:flex;align-items:center;gap:var(--sp-2)">
        <span class="card-badge badge-live">● 5分鐘</span>
        <span class="card-badge badge-source">HKIA</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);font-size:var(--text-xs);color:var(--text-muted)">
      <span>顯示 ${start}–${end} 共 ${total} 筆</span>
      <div style="display:flex;gap:var(--sp-2)">
        <button onclick="Flights.goPage(${isArrival}, ${state.page - 1})" ${state.page === 0 ? 'disabled' : ''}
          style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:4px 10px;font-size:var(--text-xs);font-weight:600;cursor:${state.page === 0 ? 'not-allowed' : 'pointer'};opacity:${state.page === 0 ? '.4' : '1'};color:var(--text)">
          ‹ 上一頁
        </button>
        <span style="display:inline-flex;align-items:center;padding:0 var(--sp-2);font-weight:600">${state.page + 1} / ${totalPages}</span>
        <button onclick="Flights.goPage(${isArrival}, ${state.page + 1})" ${state.page >= totalPages - 1 ? 'disabled' : ''}
          style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:4px 10px;font-size:var(--text-xs);font-weight:600;cursor:${state.page >= totalPages - 1 ? 'not-allowed' : 'pointer'};opacity:${state.page >= totalPages - 1 ? '.4' : '1'};color:var(--text)">
          下一頁 ›
        </button>
      </div>
    </div>
  `;
}

/* ══ RENDER: departure row ═════════════════════════════════ */

function renderDepartureRow(f) {
  const status = statusToTag(f.status);
  const flight = f.flight && f.flight[0] ? f.flight[0] : null;
  const tooltip = formatCodeshareTooltip(f.flight);
  const destCities = (f.destination || []).map(cityName).join(' / ') || '—';
  const destCodes = (f.destination || []).join(', ');

  return `
    <tr>
      <td class="ft-time"><span class="ft-time-val">${f.time || '—'}</span></td>
      <td class="ft-dest">
        <div class="ft-dest-name">${destCities}</div>
        <div class="ft-dest-code">${destCodes}</div>
      </td>
      <td class="ft-airline">${airlineName(flight ? flight.airline : null)}</td>
      <td class="ft-flight" ${tooltip ? `title="代碼共享：${tooltip}"` : ''}>
        ${formatFlightNumbers(f.flight)}
      </td>
      <td class="ft-center">${f.terminal || '—'}</td>
      <td class="ft-center">${f.aisle ? f.aisle + '行' : '—'}</td>
      <td class="ft-center">${f.gate || '—'}</td>
      <td class="ft-status"><span class="tag ${status.tag}">${status.label}</span></td>
    </tr>
  `;
}

/* ══ RENDER: arrival row ═══════════════════════════════════ */

function renderArrivalRow(f) {
  const status = statusToTag(f.status);
  const flight = f.flight && f.flight[0] ? f.flight[0] : null;
  const tooltip = formatCodeshareTooltip(f.flight);
  const originCities = (f.origin || []).map(cityName).join(' / ') || '—';
  const originCodes = (f.origin || []).join(', ');

  return `
    <tr>
      <td class="ft-time"><span class="ft-time-val">${f.time || '—'}</span></td>
      <td class="ft-airline">${airlineName(flight ? flight.airline : null)}</td>
      <td class="ft-flight" ${tooltip ? `title="代碼共享：${tooltip}"` : ''}>
        ${formatFlightNumbers(f.flight)}
      </td>
      <td class="ft-dest">
        <div class="ft-dest-name">${originCities}</div>
        <div class="ft-dest-code">${originCodes}</div>
      </td>
      <td class="ft-center">${f.hall || '—'}</td>
      <td class="ft-center">${f.baggage || '—'}</td>
      <td class="ft-status"><span class="tag ${status.tag}">${status.label}</span></td>
    </tr>
  `;
}

/* ══ RENDER: full table ═══════════════════════════════════ */

function renderDepartures() {
  const cont = document.getElementById('flights-departure-content');
  if (!cont) return;

  if (_state.departures.loading && _state.departures.raw.length === 0) {
    cont.innerHTML = renderHead(false) + renderSkeleton(false);
    return;
  }
  if (_state.departures.error && _state.departures.raw.length === 0) {
    cont.innerHTML = renderHead(false) + renderError(false, _state.departures.error);
    return;
  }
  if (_state.departures.filtered.length === 0) {
    cont.innerHTML = renderHead(false) + `
      <div style="padding:var(--sp-6);text-align:center;color:var(--text-faint)">
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted)">今日暫無離港航班資料</div>
        <div style="font-size:var(--text-xs);margin-top:var(--sp-1)">No departure data available</div>
      </div>
    `;
    return;
  }

  const start = _state.departures.page * FLIGHTS_PER_PAGE;
  const slice = _state.departures.filtered.slice(start, start + FLIGHTS_PER_PAGE);

  cont.innerHTML = `
    ${renderHead(false)}
    <div class="ft-table-wrap">
      <table class="ft-table">
        <thead>
          <tr>
            <th>時間 Time</th>
            <th>目的地 Destination</th>
            <th>航空公司 Airline</th>
            <th>航班 Flight</th>
            <th>客運大樓 Terminal</th>
            <th>登機區 Aisle</th>
            <th>登機閘口 Gate</th>
            <th>狀態 Status</th>
          </tr>
        </thead>
        <tbody>
          ${slice.map(renderDepartureRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderArrivals() {
  const cont = document.getElementById('flights-arrival-content');
  if (!cont) return;

  if (_state.arrivals.loading && _state.arrivals.raw.length === 0) {
    cont.innerHTML = renderHead(true) + renderSkeleton(true);
    return;
  }
  if (_state.arrivals.error && _state.arrivals.raw.length === 0) {
    cont.innerHTML = renderHead(true) + renderError(true, _state.arrivals.error);
    return;
  }
  if (_state.arrivals.filtered.length === 0) {
    cont.innerHTML = renderHead(true) + `
      <div style="padding:var(--sp-6);text-align:center;color:var(--text-faint)">
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted)">今日暫無抵港航班資料</div>
        <div style="font-size:var(--text-xs);margin-top:var(--sp-1)">No arrival data available</div>
      </div>
    `;
    return;
  }

  const start = _state.arrivals.page * FLIGHTS_PER_PAGE;
  const slice = _state.arrivals.filtered.slice(start, start + FLIGHTS_PER_PAGE);

  cont.innerHTML = `
    ${renderHead(true)}
    <div class="ft-table-wrap">
      <table class="ft-table">
        <thead>
          <tr>
            <th>時間 Time</th>
            <th>航空公司 Airline</th>
            <th>航班 Flight</th>
            <th>出發地 Origin</th>
            <th>接機大堂 Hall</th>
            <th>行李輸送帶 Belt</th>
            <th>狀態 Status</th>
          </tr>
        </thead>
        <tbody>
          ${slice.map(renderArrivalRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ══ PAGE NAVIGATION ══════════════════════════════════════ */

function goPage(isArrival, page) {
  const state = isArrival ? _state.arrivals : _state.departures;
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / FLIGHTS_PER_PAGE));
  if (page < 0 || page >= totalPages) return;
  state.page = page;
  if (isArrival) renderArrivals();
  else renderDepartures();
  // Scroll to top of card on pagination
  const cont = document.getElementById(isArrival ? 'flights-arrival-content' : 'flights-departure-content');
  if (cont) cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══ INJECT STYLES ═════════════════════════════════════════ */

(function injectStyles() {
  if (document.getElementById('flights-styles')) return;
  const s = document.createElement('style');
  s.id = 'flights-styles';
  s.textContent = `
    .ft-table-wrap {
      overflow-x: auto;
      border: 1px solid var(--divider);
      border-radius: var(--r-md);
      background: var(--surface-2);
      -webkit-overflow-scrolling: touch;
    }
    .ft-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
      min-width: 720px;
    }
    .ft-table thead th {
      text-align: left;
      padding: var(--sp-3) var(--sp-3);
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .04em;
      background: var(--surface-3);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      white-space: nowrap;
    }
    .ft-table tbody tr {
      transition: background 0.12s;
    }
    .ft-table tbody tr:hover {
      background: var(--surface-3);
    }
    .ft-table tbody tr:not(:last-child) td {
      border-bottom: 1px solid var(--divider);
    }
    .ft-table td {
      padding: var(--sp-3);
      vertical-align: middle;
      color: var(--text);
    }
    .ft-time {
      white-space: nowrap;
      width: 80px;
    }
    .ft-time-val {
      font-family: var(--font-mono);
      font-size: var(--text-base);
      font-weight: 700;
      color: var(--text);
    }
    .ft-dest-name {
      font-weight: 600;
      color: var(--text);
      line-height: 1.2;
    }
    .ft-dest-code {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-faint);
      margin-top: 2px;
      letter-spacing: .04em;
    }
    .ft-airline {
      font-size: var(--text-sm);
      color: var(--text);
      max-width: 200px;
    }
    .ft-flight {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--text);
      white-space: nowrap;
      cursor: help;
    }
    .ft-center {
      text-align: center;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }
    .ft-status {
      white-space: nowrap;
      min-width: 130px;
    }
    .ft-status .tag {
      display: inline-block;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 700px) {
      .ft-table { font-size: var(--text-xs); min-width: 600px; }
      .ft-table td { padding: var(--sp-2); }
      .ft-time-val { font-size: var(--text-sm); }
      .ft-dest-name { font-size: var(--text-sm); }
    }
  `;
  document.head.appendChild(s);
})();

/* ══ EXPORTS ═══════════════════════════════════════════════ */

window.Flights = {
  refresh: fetchAll,
  goPage: goPage,
  fetchDepartures: () => fetchFlights(false).then(renderDepartures),
  fetchArrivals: () => fetchFlights(true).then(renderArrivals),
  // Test helpers (debug)
  _state: _state,
};
