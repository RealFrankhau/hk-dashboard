/* ============================================================
   flights.js — Real-time Flight Information
   Hong Kong International Airport (HKIA)
   香港國際機場實時航班資訊
   ============================================================
   Data source: HKIA REST API (proxied via Cloudflare Worker to bypass CORS)
   Endpoint:    /flightinfo-rest/rest/flights?span=1&date=...&lang=...&cargo=...&arrival=...
   Refresh:     every 5 minutes
   ============================================================ */

'use strict';

const FLIGHTS_PER_PAGE = 10;
// CORS_PROXY_BASE is defined in core.js
const HKIA_API_BASE   = 'https://www.hongkongairport.com/flightinfo-rest/rest/flights';

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

/* ── IATA city/airport code → Chinese and English city names ──────────── */
const CITY_NAMES = {
  // Hong Kong
  'HKG': { zh: '香港', en: 'Hong Kong' },
  // Mainland China
  'PEK': { zh: '北京', en: 'Beijing' }, 'PKX': { zh: '北京大興', en: 'Beijing Daxing' }, 'SHA': { zh: '上海虹橋', en: 'Shanghai Hongqiao' }, 'PVG': { zh: '上海浦東', en: 'Shanghai Pudong' },
  'CAN': { zh: '廣州', en: 'Guangzhou' }, 'SZX': { zh: '深圳', en: 'Shenzhen' }, 'CTU': { zh: '成都', en: 'Chengdu' }, 'CKG': { zh: '重慶', en: 'Chongqing' },
  'XIY': { zh: '西安', en: 'Xian' }, 'HGH': { zh: '杭州', en: 'Hangzhou' }, 'HFE': { zh: '合肥', en: 'Hefei' }, 'NKG': { zh: '南京', en: 'Nanjing' },
  'WUH': { zh: '武漢', en: 'Wuhan' }, 'CSX': { zh: '長沙', en: 'Changsha' }, 'NNG': { zh: '南寧', en: 'Nanning' }, 'KMG': { zh: '昆明', en: 'Kunming' },
  'HAK': { zh: '海口', en: 'Haikou' }, 'SYX': { zh: '三亞', en: 'Sanya' }, 'XMN': { zh: '廈門', en: 'Xiamen' }, 'FOC': { zh: '福州', en: 'Fuzhou' },
  'DLC': { zh: '大連', en: 'Dalian' }, 'SHE': { zh: '瀋陽', en: 'Shenyang' }, 'TSN': { zh: '天津', en: 'Tianjin' }, 'TNA': { zh: '濟南', en: 'Jinan' },
  'QNG': { zh: '泉州', en: 'Quanzhou' }, 'CGO': { zh: '鄭州', en: 'Zhengzhou' }, 'LJG': { zh: '麗江', en: 'Lijiang' }, 'LUM': { zh: '芒市', en: 'Mangshi' },
  'ZHA': { zh: '湛江', en: 'Zhanjiang' }, 'HYN': { zh: '台州', en: 'Taizhou' }, 'WNZ': { zh: '溫州', en: 'Wenzhou' }, 'JHG': { zh: '西雙版納', en: 'Xishuangbanna' },
  'DLU': { zh: '大理', en: 'Dali' }, 'BHY': { zh: '北海', en: 'Beihai' }, 'NGB': { zh: '寧波', en: 'Ningbo' }, 'YNT': { zh: '煙台', en: 'Yantai' },
  'TPE': { zh: '台北', en: 'Taipei' }, 'TSA': { zh: '台北松山', en: 'Taipei Songshan' }, 'KHH': { zh: '高雄', en: 'Kaohsiung' }, 'TNN': { zh: '台南', en: 'Tainan' },
  'MFM': { zh: '澳門', en: 'Macau' }, 'TFU': { zh: '成都天府', en: 'Chengdu Tianfu' },
  // Japan
  'NRT': { zh: '東京成田', en: 'Tokyo Narita' }, 'HND': { zh: '東京羽田', en: 'Tokyo Haneda' }, 'KIX': { zh: '大阪關西', en: 'Osaka Kansai' }, 'ITM': { zh: '大阪伊丹', en: 'Osaka Itami' },
  'NGO': { zh: '名古屋', en: 'Nagoya' }, 'FUK': { zh: '福岡', en: 'Fukuoka' }, 'CTS': { zh: '札幌', en: 'Sapporo' }, 'OKA': { zh: '沖繩', en: 'Okinawa' },
  'KOJ': { zh: '鹿兒島', en: 'Kagoshima' }, 'KIJ': { zh: '新潟', en: 'Niigata' }, 'SDJ': { zh: '仙台', en: 'Sendai' }, 'HKD': { zh: '函館', en: 'Hakodate' },
  'KMJ': { zh: '熊本', en: 'Kumamoto' }, 'OIT': { zh: '大分', en: 'Oita' }, 'HIJ': { zh: '廣島', en: 'Hiroshima' }, 'TAK': { zh: '高松', en: 'Takamatsu' },
  'MYJ': { zh: '松山', en: 'Matsuyama' }, 'TKS': { zh: '德島', en: 'Tokushima' }, 'ISG': { zh: '石垣', en: 'Ishigaki' }, 'MMY': { zh: '宮古', en: 'Miyako' },
  // Korea
  'ICN': { zh: '首爾仁川', en: 'Seoul Incheon' }, 'GMP': { zh: '首爾金浦', en: 'Seoul Gimpo' }, 'PUS': { zh: '釜山', en: 'Busan' }, 'CJU': { zh: '濟州', en: 'Jeju' },
  'TAE': { zh: '大邱', en: 'Daegu' }, 'KWJ': { zh: '光州', en: 'Gwangju' },
  // Southeast Asia
  'SIN': { zh: '新加坡', en: 'Singapore' }, 'KUL': { zh: '吉隆坡', en: 'Kuala Lumpur' }, 'PEN': { zh: '檳城', en: 'Penang' }, 'BKI': { zh: '亞庇', en: 'Kota Kinabalu' },
  'BKK': { zh: '曼谷', en: 'Bangkok' }, 'DMK': { zh: '曼谷廊曼', en: 'Bangkok Don Mueang' }, 'HKT': { zh: '布吉', en: 'Phuket' }, 'CNX': { zh: '清邁', en: 'Chiang Mai' },
  'USM': { zh: '蘇梅', en: 'Koh Samui' }, 'KBV': { zh: '甲米', en: 'Krabi' }, 'UTP': { zh: '烏塔保', en: 'Udon Thani' },
  'CGK': { zh: '雅加達', en: 'Jakarta' }, 'DPS': { zh: '峇里', en: 'Denpasar' }, 'SUB': { zh: '泗水', en: 'Surabaya' }, 'KNO': { zh: '棉蘭', en: 'Medan' },
  'MNL': { zh: '馬尼拉', en: 'Manila' }, 'CEB': { zh: '宿霧', en: 'Cebu' }, 'DVO': { zh: '達沃', en: 'Davao' }, 'KLO': { zh: '長灘島', en: 'Coron' },
  'HAN': { zh: '河內', en: 'Hanoi' }, 'SGN': { zh: '胡志明市', en: 'Ho Chi Minh City' }, 'DAD': { zh: '峴港', en: 'Da Nang' }, 'PQC': { zh: '富國島', en: 'Phuket' },
  // South Asia & Middle East
  'BOM': { zh: '孟買', en: 'Mumbai' }, 'DEL': { zh: '新德里', en: 'New Delhi' }, 'BLR': { zh: '班加羅爾', en: 'Bengaluru' }, 'MAA': { zh: '清奈', en: 'Chennai' },
  'CMB': { zh: '可倫坡', en: 'Colombo' }, 'DAC': { zh: '達卡', en: 'Dhaka' }, 'KTM': { zh: '加德滿都', en: 'Kathmandu' },
  'DXB': { zh: '杜拜', en: 'Dubai' }, 'AUH': { zh: '阿布扎比', en: 'Abu Dhabi' }, 'DOH': { zh: '多哈', en: 'Doha' }, 'RUH': { zh: '利雅德', en: 'Riyadh' },
  'JED': { zh: '吉達', en: 'Jeddah' }, 'IKA': { zh: '德黑蘭', en: 'Tehran' }, 'KWI': { zh: '科威特', en: 'Kuwait City' }, 'BAH': { zh: '巴林', en: 'Manama' },
  'MCT': { zh: '馬斯喀特', en: 'Muscat' }, 'TLV': { zh: '特拉維夫', en: 'Tel Aviv' },
  // Europe
  'LHR': { zh: '倫敦希斯路', en: 'London Heathrow' }, 'LGW': { zh: '倫敦格域', en: 'London Gatwick' }, 'MAN': { zh: '曼徹斯特', en: 'Manchester' },
  'CDG': { zh: '巴黎', en: 'Paris Charles de Gaulle' }, 'ORY': { zh: '巴黎奧利', en: 'Paris Orly' }, 'NCE': { zh: '尼斯', en: 'Nice' }, 'MRS': { zh: '馬賽', en: 'Marseille' },
  'AMS': { zh: '阿姆斯特丹', en: 'Amsterdam' }, 'FRA': { zh: '法蘭克福', en: 'Frankfurt' }, 'MUC': { zh: '慕尼黑', en: 'Munich' }, 'DUS': { zh: '杜塞爾多夫', en: 'Düsseldorf' },
  'BER': { zh: '柏林', en: 'Berlin' }, 'HAM': { zh: '漢堡', en: 'Hamburg' }, 'ZRH': { zh: '蘇黎世', en: 'Zurich' }, 'GVA': { zh: '日內瓦', en: 'Geneva' },
  'VIE': { zh: '維也納', en: 'Vienna' }, 'BRU': { zh: '布魯塞爾', en: 'Brussels' }, 'CPH': { zh: '哥本哈根', en: 'Copenhagen' }, 'ARN': { zh: '斯德哥爾摩', en: 'Stockholm' },
  'OSL': { zh: '奧斯陸', en: 'Oslo' }, 'HEL': { zh: '赫爾辛基', en: 'Helsinki' }, 'TLL': { zh: '塔林', en: 'Tallinn' },
  'FCO': { zh: '羅馬', en: 'Rome Fiumicino' }, 'MXP': { zh: '米蘭', en: 'Milan Malpensa' }, 'VCE': { zh: '威尼斯', en: 'Venice' }, 'NAP': { zh: '那不勒斯', en: 'Naples' },
  'MAD': { zh: '馬德里', en: 'Madrid' }, 'BCN': { zh: '巴塞隆拿', en: 'Barcelona' }, 'LIS': { zh: '里斯本', en: 'Lisbon' }, 'OPO': { zh: '波圖', en: 'Porto' },
  'DUB': { zh: '都柏林', en: 'Dublin' }, 'KEF': { zh: '雷克雅未克', en: 'Reykjavik' }, 'IST': { zh: '伊斯坦堡', en: 'Istanbul' },
  // Africa
  'JNB': { zh: '約翰內斯堡', en: 'Johannesburg' }, 'CPT': { zh: '開普敦', en: 'Cape Town' }, 'NBO': { zh: '內羅畢', en: 'Nairobi' }, 'LOS': { zh: '拉各斯', en: 'Lagos' },
  'CAI': { zh: '開羅', en: 'Cairo' }, 'CMN': { zh: '卡薩布蘭卡', en: 'Casablanca' }, 'ADD': { zh: '阿迪斯阿貝巴', en: 'Addis Ababa' },
  // Americas
  'LAX': { zh: '洛杉磯', en: 'Los Angeles' }, 'JFK': { zh: '紐約甘迺迪', en: 'New York JFK' }, 'EWR': { zh: '紐華克', en: 'Newark' }, 'SFO': { zh: '三藩市', en: 'San Francisco' },
  'ORD': { zh: '芝加哥', en: 'Chicago' }, 'SEA': { zh: '西雅圖', en: 'Seattle' }, 'YVR': { zh: '溫哥華', en: 'Vancouver' }, 'YYZ': { zh: '多倫多', en: 'Toronto' },
  'HNL': { zh: '檀香山', en: 'Honolulu' }, 'MEX': { zh: '墨西哥城', en: 'Mexico City' }, 'PTY': { zh: '巴拿馬城', en: 'Panama City' },
  // Australia / NZ / Pacific
  'SYD': { zh: '悉尼', en: 'Sydney' }, 'MEL': { zh: '墨爾本', en: 'Melbourne' }, 'BNE': { zh: '布里斯班', en: 'Brisbane' }, 'PER': { zh: '珀斯', en: 'Perth' },
  'ADL': { zh: '阿德萊德', en: 'Adelaide' }, 'CNS': { zh: '開恩茲', en: 'Cairns' },
  'AKL': { zh: '奧克蘭', en: 'Auckland' }, 'WLG': { zh: '威靈頓', en: 'Wellington' }, 'CHC': { zh: '基督城', en: 'Christchurch' },
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
  const entry = CITY_NAMES[code];
  if (typeof entry === 'object' && entry !== null) {
    return entry.zh || entry.en || code;
  }
  return entry || code;
}

function cityNameEn(code) {
  if (!code) return '—';
  const entry = CITY_NAMES[code];
  if (typeof entry === 'object' && entry !== null) {
    return entry.en || entry.zh || code;
  }
  return entry || code;
}

function airlineNameZh(code) {
  if (!code) return '—';
  const fullName = AIRLINE_NAMES[code] || code;
  // Extract Chinese part (everything before the first space)
  const match = fullName.match(/^([^\s]+)/);
  return match ? match[1] : fullName;
}

function airlineNameEn(code) {
  if (!code) return '—';
  const fullName = AIRLINE_NAMES[code] || code;
  // Extract English part (everything after the first space)
  const match = fullName.match(/^\S+\s+(.+)$/);
  return match ? match[1] : fullName;
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
  return flights.map(f => f.no).filter(Boolean).join('<br>');
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
    const targetUrl = `${HKIA_API_BASE}?${params.toString()}`;
    const url = `${CORS_PROXY_BASE}${encodeURIComponent(targetUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = sortByTime(pickTodayList(data));
    state.raw = list;
    // Filter to show only flights from current time onwards
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    state.filtered = list.filter(f => timeToMinutes(f.time) >= currentMinutes);
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
        <div class="card-title">${titleZh} ${titleEn}</div>
        <div class="card-sub">${updatedStr} · 共 ${total} 班次 Total ${total} flights</div>
      </div>
      <div style="display:flex;align-items:center;gap:var(--sp-2)">
        <span class="card-badge badge-live">● 實時</span>
        <span class="card-badge badge-source">HKIA</span>
        <button onclick="Flights.refresh()" aria-label="重新載入航班資料"
          style="background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:var(--r-md);padding:var(--sp-2) var(--sp-3);font-size:var(--text-xs);font-weight:700;cursor:pointer">重新載入</button>
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
  const destCitiesEn = (f.destination || []).map(cityNameEn).join(' / ') || '—';
  const destCodes = (f.destination || []).join(', ');

  return `
    <tr>
      <td class="ft-time"><span class="ft-time-val">${f.time || '—'}</span></td>
      <td class="ft-dest">
        <div class="ft-dest-name">${destCities}</div>
        <div class="ft-dest-name-en">${destCitiesEn}</div>
        <div class="ft-dest-code">${destCodes}</div>
      </td>
      <td class="ft-airline">
        <div class="ft-airline-zh">${airlineNameZh(flight ? flight.airline : null)}</div>
        <div class="ft-airline-en">${airlineNameEn(flight ? flight.airline : null)}</div>
      </td>
      <td class="ft-flight" ${tooltip ? `title="代碼共享：${tooltip}"` : ''}>
        ${formatFlightNumbers(f.flight)}
      </td>
      <td class="ft-center" style="font-family:var(--font-mono);font-weight:700">${f.terminal || '—'}</td>
      <td class="ft-center" style="font-family:var(--font-mono);font-weight:700">${f.aisle ? f.aisle + '&nbsp;行' : '—'}</td>
      <td class="ft-center" style="font-family:var(--font-mono);font-weight:700">${f.gate ? `<span class="tag tag-yellow">${f.gate}</span>` : '—'}</td>
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
  const originCitiesEn = (f.origin || []).map(cityNameEn).join(' / ') || '—';
  const originCodes = (f.origin || []).join(', ');

  return `
    <tr>
      <td class="ft-time"><span class="ft-time-val">${f.time || '—'}</span></td>
      <td class="ft-airline">
        <div class="ft-airline-zh">${airlineNameZh(flight ? flight.airline : null)}</div>
        <div class="ft-airline-en">${airlineNameEn(flight ? flight.airline : null)}</div>
      </td>
      <td class="ft-flight" ${tooltip ? `title="代碼共享：${tooltip}"` : ''}>
        ${formatFlightNumbers(f.flight)}
      </td>
      <td class="ft-dest">
        <div class="ft-dest-name">${originCities}</div>
        <div class="ft-dest-name-en">${originCitiesEn}</div>
        <div class="ft-dest-code">${originCodes}</div>
      </td>
      <td class="ft-center" style="font-family:var(--font-mono);font-weight:700">${f.hall || '—'}</td>
      <td class="ft-center" style="font-family:var(--font-mono);font-weight:700">${f.baggage ? `<span class="tag tag-yellow">${f.baggage}</span>` : '—'}</td>
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
            <th>登機行段 Check-in Aisle</th>
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
    .ft-dest-name-en {
      font-size: var(--text-xs);
      color: var(--text-muted);
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
    .ft-airline-zh {
      font-weight: 600;
      color: var(--text);
      line-height: 1.2;
    }
    .ft-airline-en {
      font-size: var(--text-xs);
      color: var(--text-muted);
      line-height: 1.2;
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
