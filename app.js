/* ============================================================
   OneBudget — expense tracker
   UI/UX: the One UI 9 design system from the Gitly source.
   Local-first: no account needed. Optional GitHub backup/sync.
   ============================================================ */

'use strict';

/* ---------- storage ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('ob:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ob:' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('ob:' + k); } catch (e) {} },
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const ESCMAP = { '&': '&' + 'amp;', '<': '&' + 'lt;', '>': '&' + 'gt;', '"': '&' + 'quot;', "'": '&' + '#39;' };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ESCMAP[c]); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function toast(msg, action) {
  const box = $('#toasts');
  const live = box.querySelectorAll('.toast');
  if (live.length >= 2) { live[0].remove(); }          // never stack more than two
  const t = document.createElement('div');
  t.className = 'toast';
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  let timer;
  if (action && action.label) {
    t.classList.add('hasact');
    const b = document.createElement('button');
    b.className = 'toastact';
    b.textContent = action.label;
    b.onclick = () => { clearTimeout(timer); t.remove(); try { action.fn(); } catch (e) { } };
    t.appendChild(b);
  }
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  timer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); },
    action && action.label ? 6500 : 2600);
}
function focusLater(sel) { setTimeout(() => { const el = $(sel); if (el) el.focus(); }, 120); }
function spinner(sm) { return '<div class="spinwrap' + (sm ? ' sm' : '') + '"><div class="spinner"></div></div>'; }
function copyText(t) {
  if (window.OneBudget && OneBudget.copy) { OneBudget.copy(t); return; }
  try { navigator.clipboard.writeText(t); } catch (e) {}
}

/* ---------- dates ---------- */
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseYmd = s => { const p = String(s).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); };
const todayYmd = () => ymd(new Date());
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const mkey = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1);
const monthOf = s => String(s).slice(0, 7);
const daysInMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function monthLabel(d) { return MON[d.getMonth()] + ' ' + d.getFullYear(); }
function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; }
function fmtDay(iso) {
  const d = parseYmd(iso), t = todayYmd();
  if (iso === t) return 'Today';
  if (iso === ymd(addDays(new Date(), -1))) return 'Yesterday';
  return DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MON3[d.getMonth()];
}
function fmtDayLong(iso) { const d = parseYmd(iso); return DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
function daysUntil(iso) { if (!iso) return null; return Math.round((parseYmd(iso) - parseYmd(todayYmd())) / 86400000); }
function dueLabel(iso) {
  const n = daysUntil(iso);
  if (n == null) return '';
  if (n < 0) return Math.abs(n) + 'd overdue';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n <= 31) return 'Due in ' + n + 'd';
  return 'Due ' + fmtDay(iso);
}
function tAgo(ms) {
  if (!ms) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ---------- money ---------- */
function money(n, hideSign) {
  const st = DB.settings;
  const v = Number(n) || 0, neg = v < 0, abs = Math.abs(v), frac = abs % 1 !== 0;
  let s;
  try { s = new Intl.NumberFormat(st.locale || 'en-IN', { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 }).format(abs); }
  catch (e) { s = String(Math.round(abs)); }
  return (neg && !hideSign ? '-' : '') + (st.currency || '₹') + s;
}
function moneyShort(n) {
  const sym = DB.settings.currency || '₹', abs = Math.abs(Number(n) || 0);
  if (abs >= 1e7) return sym + (abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'Cr';
  if (abs >= 1e5) return sym + (abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1).replace(/\.0$/, '') + 'L';
  if (abs >= 1e3) return sym + (abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return sym + Math.round(abs);
}
function pct(n) { return (Math.round(n * 10) / 10) + '%'; }

/* ---------- icons ---------- */
const ICON = {
  utensils: '<path d="M7 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M9 12v9"/><path d="M16 3c-1.5 2-2 4-2 6.5 0 1.4.7 2.5 2 2.5s2-1.1 2-2.5C18 7 17.5 5 16 3z"/><path d="M16 12v9"/>',
  basket: '<path d="M4 9h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 9z"/><path d="M8 9 9.5 4M16 9 14.5 4"/>',
  car: '<path d="M5 16v3M19 16v3"/><path d="M4 16h16v-3.5a3 3 0 0 0-.6-1.8l-1.7-2.3A3 3 0 0 0 15.3 7H8.7a3 3 0 0 0-2.4 1.4L4.6 10.7A3 3 0 0 0 4 12.5V16z"/><circle cx="7.5" cy="13" r="1"/><circle cx="16.5" cy="13" r="1"/>',
  bag: '<path d="M5 8h14l1 12H4L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  bolt: '<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  heart: '<path d="M12 20.5S3.5 15 3.5 9.4A4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 8.5 3c0 5.6-8.5 11.1-8.5 11.1z"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5 16 12l-6 3.5v-7z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 6 .5 4-4.5a2 2 0 0 1 2.8 2.8l-4.5 4 .5 6L11.8 20l-2.5-7.5z"/>',
  repeat: '<path d="M4 9a5 5 0 0 1 5-5h9"/><path d="M15 1.5 18 4l-3 2.5"/><path d="M20 15a5 5 0 0 1-5 5H6"/><path d="M9 22.5 6 20l3-2.5"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12h18"/>',
  chart: '<line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="15"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12"/><path d="M12 9S10.5 4 8 4a2 2 0 0 0 0 5h4zM12 9s1.5-5 4-5a2 2 0 0 1 0 5h-4z"/>',
  bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 20h18"/>',
  wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1"/><rect x="3" y="7.5" width="18" height="12" rx="2.5"/><circle cx="16.5" cy="13.5" r="1.2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tag: '<path d="M4 4h7l9 9-7 7-9-9V4z"/><circle cx="8" cy="8" r="1.4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="21" y2="21"/>',
  bookmark: '<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-5.2L5 21V4.5a1 1 0 0 1 1-1z"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M6.5 7 7.5 20h9L17.5 7"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14.5 5.5 18.5 9.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 5.5A2.5 2.5 0 0 0 13.5 3H6.5A2.5 2.5 0 0 0 4 5.5v7A2.5 2.5 0 0 0 6.5 15"/>',
  download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.2 4.5 4.5 0 0 0 7 18z"/>',
  check: '<polyline points="5 13 10 18 19 7"/>',
  x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  chevR: '<polyline points="9 5 16 12 9 19"/>',
  chevL: '<polyline points="15 5 8 12 15 19"/>',
  chevD: '<polyline points="5 9 12 16 19 9"/>',
  up: '<path d="M12 20V5"/><path d="M6 11l6-6 6 6"/>',
  down: '<path d="M12 4v15"/><path d="M6 13l6 6 6-6"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.7 1.7 0 0 1 0 3.4h-4M9.5 12.9h4.5a1.7 1.7 0 0 1 0 3.4h-4.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  flag: '<path d="M6 3v18"/><path d="M6 4h11l-2 3.5L17 11H6z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/>',
  bell: '<path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9a6 6 0 0 0-6-6z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.2 2"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  percent: '<circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M19 5 5 19"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  list: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  github: '<path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.6-.2.6-.5v-1.7c-2.6.6-3.2-1.2-3.2-1.2-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1 2.8.8.1-.6.3-1 .6-1.3-2.1-.2-4.3-1-4.3-4.6 0-1 .4-1.9 1-2.5-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.6.6.6 1 1.5 1 2.5 0 3.6-2.2 4.4-4.3 4.6.4.4.7 1 .7 2v2.8c0 .3.1.6.6.5A9.5 9.5 0 0 0 12 2.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>',
  camera: '<path d="M4 8.5h3l1.4-2.2A1 1 0 0 1 9.2 6h5.6a1 1 0 0 1 .8.3L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.2"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3M9 21h6"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/><path d="M6 14.5h4"/>',
  piggy: '<path d="M5 11a6 6 0 0 1 6-6h3.5a5.5 5.5 0 0 1 5.5 5.5c0 2-1 3.6-2.5 4.6V18a1 1 0 0 1-1 1h-1v1.5h-3V20H9.5v1.5h-3V19A6 6 0 0 1 5 14z"/><circle cx="15" cy="11" r="1"/><path d="M8 6.5 7 4.5"/>',
};
function ico(name, cls) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' + (ICON[name] || ICON.dots) + '</svg>';
}

/* ---------- defaults ---------- */
const DEFAULT_CATS = [
  { id: 'food', name: 'Food & Dining', icon: 'utensils', color: '#F59E0B', kind: 'exp' },
  { id: 'grocery', name: 'Groceries', icon: 'basket', color: '#12B76A', kind: 'exp' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#1B6EF3', kind: 'exp' },
  { id: 'shopping', name: 'Shopping', icon: 'bag', color: '#EC4899', kind: 'exp' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'bolt', color: '#8B5CF6', kind: 'exp' },
  { id: 'rent', name: 'Rent & Home', icon: 'home', color: '#0EA5E9', kind: 'exp' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#EF4444', kind: 'exp' },
  { id: 'fun', name: 'Entertainment', icon: 'play', color: '#A855F7', kind: 'exp' },
  { id: 'edu', name: 'Education', icon: 'book', color: '#14B8A6', kind: 'exp' },
  { id: 'travel', name: 'Travel', icon: 'plane', color: '#6366F1', kind: 'exp' },
  { id: 'subs', name: 'Subscriptions', icon: 'repeat', color: '#F97316', kind: 'exp' },
  { id: 'savings', name: 'Savings', icon: 'piggy', color: '#0E9F5A', kind: 'exp' },
  { id: 'otherexp', name: 'Other', icon: 'dots', color: '#8A8A8A', kind: 'exp' },
  { id: 'salary', name: 'Salary', icon: 'briefcase', color: '#12B76A', kind: 'inc' },
  { id: 'business', name: 'Business', icon: 'chart', color: '#0EA5E9', kind: 'inc' },
  { id: 'gift', name: 'Gifts', icon: 'gift', color: '#EC4899', kind: 'inc' },
  { id: 'interest', name: 'Interest', icon: 'bank', color: '#8B5CF6', kind: 'inc' },
  { id: 'otherinc', name: 'Other', icon: 'dots', color: '#8A8A8A', kind: 'inc' },
];
const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: 'Cash', icon: 'coin', color: '#12B76A', opening: 0 },
  { id: 'bank', name: 'Bank account', icon: 'bank', color: '#1B6EF3', opening: 0 },
  { id: 'card', name: 'Credit card', icon: 'card', color: '#8B5CF6', opening: 0 },
  { id: 'upi', name: 'UPI', icon: 'phone', color: '#F59E0B', opening: 0 },
];
const CAT_COLORS = ['#1B6EF3', '#12B76A', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6', '#F97316', '#6366F1', '#A855F7', '#0E9F5A', '#8A8A8A'];
const CAT_ICONS = ['utensils', 'basket', 'car', 'bag', 'bolt', 'home', 'heart', 'play', 'book', 'plane', 'repeat', 'gift', 'briefcase', 'chart', 'bank', 'coin', 'wallet', 'piggy', 'tag', 'target', 'phone', 'spark', 'dots'];
const ACC_ICONS = ['coin', 'bank', 'card', 'wallet', 'phone', 'briefcase', 'piggy', 'home', 'tag'];
const FREQS = [['monthly', 'Monthly'], ['weekly', 'Weekly'], ['yearly', 'Yearly']];
const CURRENCIES = [
  { symbol: '₹', code: 'INR', locale: 'en-IN', name: 'Indian Rupee' },
  { symbol: '$', code: 'USD', locale: 'en-US', name: 'US Dollar' },
  { symbol: '€', code: 'EUR', locale: 'de-DE', name: 'Euro' },
  { symbol: '£', code: 'GBP', locale: 'en-GB', name: 'British Pound' },
  { symbol: '¥', code: 'JPY', locale: 'ja-JP', name: 'Japanese Yen' },
  { symbol: 'AED', code: 'AED', locale: 'en-AE', name: 'UAE Dirham' },
  { symbol: 'S$', code: 'SGD', locale: 'en-SG', name: 'Singapore Dollar' },
  { symbol: 'A$', code: 'AUD', locale: 'en-AU', name: 'Australian Dollar' },
  { symbol: 'C$', code: 'CAD', locale: 'en-CA', name: 'Canadian Dollar' },
  { symbol: 'R$', code: 'BRL', locale: 'pt-BR', name: 'Brazilian Real' },
  { symbol: '₦', code: 'NGN', locale: 'en-NG', name: 'Nigerian Naira' },
  { symbol: 'zł', code: 'PLN', locale: 'pl-PL', name: 'Polish Zloty' },
];

/* ============================================================
   DATA
   ============================================================ */
function freshDB() {
  return {
    v: 2, tx: [],
    cats: DEFAULT_CATS.map(c => ({ ...c })),
    accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a })),
    recurring: [], goals: [], alerts: {}, templates: [],
    settings: {
      currency: '₹', locale: 'en-IN', code: 'INR',
      theme: 'auto', accent: 'blue', glow: true, reduceMotion: false,
      materialIcons: false, materialSeed: 0, oneHand: false,
    },
    sync: { token: '', login: '', avatar: '', gistId: '', lastSync: 0 },
    onboarded: false,
  };
}
let DB = LS.get('db', null);
if (!DB || !Array.isArray(DB.tx)) DB = freshDB();
function migrate() {
  const f = freshDB();
  if (!DB.settings) DB.settings = f.settings;
  ['currency', 'locale', 'code', 'theme', 'accent', 'glow', 'reduceMotion', 'materialIcons', 'materialSeed', 'oneHand'].forEach(k => {
    if (DB.settings[k] === undefined) DB.settings[k] = f.settings[k];
  });
  if (!Array.isArray(DB.templates)) DB.templates = [];
  if (!Array.isArray(DB.cats) || !DB.cats.length) DB.cats = f.cats;
  if (!DB.cats.some(c => c.id === 'savings')) DB.cats.push({ id: 'savings', name: 'Savings', icon: 'piggy', color: '#0E9F5A', kind: 'exp' });
  if (!Array.isArray(DB.accounts) || !DB.accounts.length) DB.accounts = f.accounts;
  if (!Array.isArray(DB.recurring)) DB.recurring = [];
  if (!Array.isArray(DB.goals)) DB.goals = [];
  if (!DB.alerts || typeof DB.alerts !== 'object') DB.alerts = {};
  if (!DB.sync) DB.sync = f.sync;
  // older transactions stored a free-text "method" — map it onto an account
  const byName = {};
  DB.accounts.forEach(a => { byName[a.name.toLowerCase()] = a.id; });
  byName['net banking'] = byName['bank account'] || 'bank';
  byName['wallet'] = byName['cash'] || 'cash';
  DB.tx.forEach(t => { if (!t.acc && t.method) { const k = String(t.method).toLowerCase(); if (byName[k]) t.acc = byName[k]; } });
}
migrate();
let LASTSAVE = 0;
function save() {
  LS.set('db', DB);
  idbPut('db', DB);
  LASTSAVE = Date.now();
  if (!SNAP_TICK) { SNAP_TICK = setTimeout(() => { SNAP_TICK = null; snapshot(); }, 8000); }
}
let SNAP_TICK = null;

function cat(id) { return DB.cats.find(c => c.id === id) || { id, name: 'Uncategorised', icon: 'dots', color: '#8A8A8A', kind: 'exp' }; }
function catsOf(kind) { return DB.cats.filter(c => c.kind === kind || c.kind === 'both'); }
function acct(id) { return DB.accounts.find(a => a.id === id) || null; }

/* ============================================================
   COMPUTATIONS
   ============================================================ */
function txOfMonth(key) { return DB.tx.filter(t => monthOf(t.date) === key); }
function sumType(list, type) { return list.filter(t => t.type === type).reduce((a, t) => a + (+t.amt || 0), 0); }
function byCat(list, type) {
  const m = {};
  list.filter(t => t.type === type).forEach(t => { m[t.cat] = (m[t.cat] || 0) + (+t.amt || 0); });
  return m;
}
function sortedCats(list, type) { return Object.entries(byCat(list, type)).sort((a, b) => b[1] - a[1]); }

function monthStats(key) {
  const list = txOfMonth(key);
  const spent = sumType(list, 'exp'), income = sumType(list, 'inc');
  const d = parseYmd(key + '-01');
  const isCurrent = key === mkey(new Date());
  const days = isCurrent ? new Date().getDate() : daysInMonth(d);
  const dim = daysInMonth(d);
  return { key, spent, income, net: income - spent, count: list.length, days, dim, isCurrent, daily: days ? spent / days : 0 };
}
function savingsRate(st) { return st.income > 0 ? clamp((st.income - st.spent) / st.income * 100, -999, 100) : 0; }

function lastNMonths(n) {
  const out = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = addMonths(now, -i), k = mkey(d), ms = monthStats(k);
    out.push({ key: k, label: MON3[d.getMonth()], full: monthLabel(d), spent: ms.spent, income: ms.income, net: ms.net, count: ms.count });
  }
  return out;
}
function dailySeries(key) {
  const d = parseYmd(key + '-01'), dim = daysInMonth(d), list = txOfMonth(key), out = [];
  for (let i = 1; i <= dim; i++) {
    const iso = key + '-' + pad2(i);
    out.push({ day: i, iso, spent: list.filter(t => t.type === 'exp' && t.date === iso).reduce((a, t) => a + (+t.amt || 0), 0) });
  }
  return out;
}
function cumulativeSeries(key) {
  const ds = dailySeries(key), out = [];
  let run = 0;
  ds.forEach(d => { run += d.spent; out.push(run); });
  return out;
}
function dailyLast(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const iso = ymd(addDays(new Date(), -i));
    out.push(DB.tx.filter(t => t.type === 'exp' && t.date === iso).reduce((a, t) => a + (+t.amt || 0), 0));
  }
  return out;
}
function weekSeries(key) {
  const d = parseYmd(key + '-01'), dim = daysInMonth(d), list = txOfMonth(key).filter(t => t.type === 'exp');
  const weeks = Math.ceil(dim / 7), out = [];
  for (let w = 0; w < weeks; w++) {
    const from = w * 7 + 1, to = Math.min(dim, from + 6);
    const v = list.filter(t => { const dd = +t.date.slice(8, 10); return dd >= from && dd <= to; }).reduce((a, t) => a + (+t.amt || 0), 0);
    out.push({ label: 'W' + (w + 1), value: v, from, to });
  }
  return out;
}
function dowStats(days) {
  const sums = [0, 0, 0, 0, 0, 0, 0], counts = [0, 0, 0, 0, 0, 0, 0];
  const from = ymd(addDays(new Date(), -(days - 1)));
  DB.tx.filter(t => t.type === 'exp' && t.date >= from).forEach(t => { const w = parseYmd(t.date).getDay(); sums[w] += (+t.amt || 0); });
  // count occurrences of each weekday in the window
  for (let i = 0; i < days; i++) counts[addDays(new Date(), -i).getDay()]++;
  return sums.map((s, i) => ({ dow: i, avg: counts[i] ? s / counts[i] : 0, total: s }));
}
function accountBalances() {
  return DB.accounts.map(a => {
    const t = DB.tx.filter(x => x.acc === a.id);
    const income = sumType(t, 'inc'), spent = sumType(t, 'exp');
    const monthSpent = sumType(t.filter(x => monthOf(x.date) === VIEWMONTH), 'exp');
    return { ...a, income, spent, monthSpent, balance: (+a.opening || 0) + income - spent, count: t.length };
  });
}
function accountSplit(key) {
  const m = {};
  txOfMonth(key).filter(t => t.type === 'exp').forEach(t => { const k = t.acc || 'none'; m[k] = (m[k] || 0) + (+t.amt || 0); });
  return m;
}
function topNotes(key, n) {
  const m = {};
  txOfMonth(key).filter(t => t.type === 'exp' && (t.note || '').trim()).forEach(t => {
    const k = t.note.trim(); if (!m[k]) m[k] = { total: 0, count: 0, cat: t.cat }; m[k].total += (+t.amt || 0); m[k].count++;
  });
  return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, n || 6);
}
/* recurring */
function monthlyEquiv(r) { const v = +r.amt || 0; return r.freq === 'weekly' ? v * 4.333 : r.freq === 'yearly' ? v / 12 : v; }
function recurringMonthlyTotal() { return DB.recurring.filter(r => r.active).reduce((a, r) => a + monthlyEquiv(r), 0); }
function upcomingBills(n) {
  return DB.recurring.filter(r => r.active).slice().sort((a, b) => String(a.nextDue || '9999').localeCompare(String(b.nextDue || '9999'))).slice(0, n || 3);
}
function advanceDue(r) {
  const d = parseYmd(r.nextDue || todayYmd());
  if (r.freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (r.freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return ymd(d);
}
/* goals */
function goalInfo(g) {
  const target = +g.target || 0, saved = +g.saved || 0;
  const pct = target > 0 ? clamp((saved / target) * 100, 0, 100) : 0;
  const left = Math.max(0, target - saved);
  // months to go, at the average monthly saving of the last 3 months
  let eta = null;
  const recent = lastNMonths(3);
  const avgSave = recent.reduce((a, m) => a + Math.max(0, m.net), 0) / (recent.length || 1);
  if (avgSave > 0 && left > 0) eta = Math.ceil(left / avgSave);
  return { target, saved, pct, left, eta, done: target > 0 && saved >= target };
}
/* ============================================================
   CHARTS
   ============================================================ */
function sparkline(values, color, h) {
  const W = 100, H = h || 26, n = values.length;
  if (n < 2) return '';
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (n - 1)) * W, H - (v / max) * (H - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
  const c = color || 'var(--accent)';
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path class="sparkfill" d="' + area + '" fill="' + c + '"/>' +
    '<path d="' + d + '" stroke="' + c + '"/></svg>';
}
function lineChart(opts) {
  const series = opts.series || [];
  const W = 320, H = opts.h || 130, top = 12, bottom = 16, right = 6;
  const all = series.reduce((a, s) => a.concat(s.values), []);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const span = Math.max(1, max - min);
  const n = Math.max(1, ...series.map(s => s.values.length));
  const px = i => (n <= 1 ? 0 : (i / (n - 1)) * (W - right));
  const py = v => H - bottom - ((v - min) / span) * (H - bottom - top);
  let grid = '';
  for (let k = 0; k <= 3; k++) {
    const y = top + (k / 3) * (H - bottom - top);
    grid += '<line class="lc-grid" x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) + '"/>';
  }
  let body = '';
  series.forEach((s, si) => {
    if (!s.values.length) return;
    const pts = s.values.map((v, i) => [px(i), py(v)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    if (s.fill) body += '<path class="lc-fill" d="' + d + ' L' + px(s.values.length - 1).toFixed(1) + ' ' + (H - bottom) + ' L' + px(0).toFixed(1) + ' ' + (H - bottom) + ' Z" fill="' + s.color + '"/>';
    body += '<path class="lc-line' + (s.dash ? ' dash' : '') + '" d="' + d + '" stroke="' + s.color + '"/>';
    if (!s.dash && pts.length) {
      const last = pts[pts.length - 1];
      body += '<circle class="lc-dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.6" fill="' + s.color + '"/>';
    }
  });
  let labels = '';
  if (opts.labels && opts.labels.length) {
    labels = '<div class="xlabels">' + opts.labels.map(l => '<span>' + esc(l) + '</span>').join('') + '</div>';
  }
  let legend = '';
  if (series.length > 1) {
    legend = '<div class="chartlegend">' + series.map(s =>
      '<div><i class="' + (s.dash ? 'dash' : '') + '" style="background:' + s.color + '"></i>' + esc(s.name) + '</div>').join('') + '</div>';
  }
  return '<svg class="linechart" viewBox="0 0 ' + W + ' ' + H + '">' + grid + body + '</svg>' + labels + legend;
}
function barChart(series, opts) {
  opts = opts || {};
  const max = Math.max(1, ...series.map(s => s.value));
  const dense = series.length > 8;
  return '<div class="chart">' + series.map(s =>
    '<div class="chartcol ' + (s.cur ? 'cur' : '') + '" title="' + esc(money(s.value)) + '">' +
    '<b>' + (s.value && (!dense || s.cur || s.value === max) ? esc(moneyShort(s.value)) : '') + '</b>' +
    '<span class="chartbar" style="height:' + Math.max(3, Math.round((s.value / max) * 96)) + 'px"></span>' +
    '<i>' + esc(s.label || '') + '</i></div>').join('') + '</div>';
}
function donutHtml(entries, centerTop, centerSub) {
  const total = entries.reduce((a, e) => a + e.value, 0);
  if (!total) return '';
  let acc = 0;
  const stops = entries.map(e => { const from = acc; acc += (e.value / total) * 100; return e.color + ' ' + from.toFixed(2) + '% ' + acc.toFixed(2) + '%'; }).join(',');
  return '<div class="donutrow"><div class="donut" style="background:conic-gradient(' + stops + ')">' +
    '<div class="dmid"><b class="num">' + esc(centerTop) + '</b><span>' + esc(centerSub) + '</span></div></div>' +
    '<div class="legend">' + entries.slice(0, 6).map(e =>
      '<div class="legrow"><i style="background:' + e.color + '"></i><span>' + esc(e.name) + '</span>' +
      '<b class="num">' + esc(moneyShort(e.value)) + '</b><em>' + Math.round((e.value / total) * 100) + '%</em></div>').join('') +
    '</div></div>';
}
function hbarList(entries, opts) {
  opts = opts || {};
  const max = Math.max(1, ...entries.map(e => e.value));
  const total = entries.reduce((a, e) => a + e.value, 0);
  return entries.map(e =>
    '<div class="barow"><div class="barline"><span class="bname"><i style="background:' + e.color + '"></i><span>' + esc(e.name) + '</span></span>' +
    '<b class="num">' + esc(money(e.value)) + '</b></div>' +
    '<div class="bartrack"><i style="width:' + Math.max(2, Math.round((e.value / max) * 100)) + '%;background:' + e.color + '"></i></div>' +
    (opts.showPct !== false ? '<div class="pcttxt">' + (total ? Math.round((e.value / total) * 100) + '% of spending' : '') + (e.sub ? ' · ' + esc(e.sub) : '') + '</div>' : '') +
    '</div>').join('');
}
function monthHeatmap(key) {
  const d = parseYmd(key + '-01'), dim = daysInMonth(d);
  const byDay = {};
  txOfMonth(key).filter(t => t.type === 'exp').forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (+t.amt || 0); });
  const max = Math.max(1, ...Object.values(byDay));
  const lvl = v => v <= 0 ? 0 : clamp(Math.ceil((v / max) * 5), 1, 5);
  const cells = [];
  for (let i = 0; i < d.getDay(); i++) cells.push(null);
  for (let day = 1; day <= dim; day++) {
    const iso = key + '-' + pad2(day);
    cells.push({ day, iso, v: byDay[iso] || 0 });
  }
  while (cells.length % 7) cells.push(null);
  const today = todayYmd();
  let html = '<div class="heatdow">' + DOW1.map(x => '<span>' + x + '</span>').join('') + '</div><div class="heatgrid">';
  html += cells.map(c => c
    ? '<div class="heatcellv l' + lvl(c.v) + (c.iso === today ? ' today' : '') + '" title="' + esc(fmtDayLong(c.iso) + ' · ' + money(c.v)) + '">' + c.day + '</div>'
    : '<div class="heatcellv empty"></div>').join('');
  html += '</div><div class="heatscale">less ' + [1, 2, 3, 4, 5].map(l => '<i class="l' + l + '" style="opacity:' + (0.22 + l * 0.156) + '"></i>').join('') + ' more</div>';
  return html;
}
function stripHeatmap(weeks) {
  const byDay = {};
  DB.tx.filter(t => t.type === 'exp').forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (+t.amt || 0); });
  const vals = Object.values(byDay), max = Math.max(1, ...vals);
  const lvl = v => v <= 0 ? 0 : clamp(Math.ceil((v / max) * 4), 1, 4);
  const end = new Date(); const endWeek = addDays(weekStart(end), 6);
  const cols = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const ws = addDays(weekStart(end), -7 * w);
    const col = [];
    for (let i = 0; i < 7; i++) {
      const dt = addDays(ws, i);
      if (dt > endWeek || dt > end) { col.push('<span class="stripcell" style="opacity:0"></span>'); continue; }
      const iso = ymd(dt);
      const v = byDay[iso] || 0;
      col.push('<span class="stripcell l' + lvl(v) + '" title="' + esc(fmtDayLong(iso) + ' · ' + money(v)) + '"></span>');
    }
    cols.push('<div class="stripcol">' + col.join('') + '</div>');
  }
  return '<div class="stripwrap">' + cols.join('') + '</div>' +
    '<div class="xlabels" style="margin-top:8px"><span>' + esc(weeks + ' weeks ago') + '</span><span>today</span></div>';
}
function dowBars(days) {
  const st = dowStats(days || 90);
  const max = Math.max(1, ...st.map(s => s.avg));
  const busiest = st.reduce((a, s) => s.avg > a.avg ? s : a, st[0]);
  return '<div class="dowbars">' + st.map(s =>
    '<div class="dowbar ' + (s === busiest ? 'busy' : '') + '" title="' + esc(DOW[s.dow] + ' · avg ' + money(s.avg)) + '">' +
    '<b>' + (s.avg ? esc(moneyShort(s.avg)) : '') + '</b>' +
    '<span style="height:' + Math.max(4, Math.round((s.avg / max) * 70)) + 'px"></span>' +
    '<i>' + DOW[s.dow][0] + '</i></div>').join('') + '</div>';
}
function deltaChip(now, prev, invert) {
  if (!prev) return '<span class="trendchip flat">new</span>';
  const d = ((now - prev) / prev) * 100;
  if (Math.abs(d) < 0.5) return '<span class="trendchip flat">flat</span>';
  const good = invert ? d < 0 : d > 0;
  return '<span class="trendchip ' + (good ? 'down' : 'up') + '">' + ico(d > 0 ? 'up' : 'down') + Math.abs(Math.round(d)) + '%</span>';
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme() {
  const st = DB.settings;
  let t = st.theme;
  if (t === 'auto') t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.body.classList.toggle('dark', t === 'dark');
  document.body.classList.toggle('pitch', t === 'pitch');
  document.body.classList.toggle('reducemotion', !!st.reduceMotion);
  document.body.classList.toggle('onehand', !!st.oneHand);
  const root = document.documentElement;
  if (st.accent === 'custom' && st.accentHex) {
    const hex = st.accentHex;
    root.setAttribute('data-accent', 'custom');
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accentD', shadeHex(hex, -0.22));
    root.style.setProperty('--glow', hexA(hex, .42));
    root.style.setProperty('--glow2', hexA(hex, .14));
    root.style.setProperty('--accentText', contrastText(hex));
  } else {
    root.setAttribute('data-accent', st.accent || 'blue');
    ['--accent', '--accentD', '--glow', '--glow2', '--accentText'].forEach(v => root.style.removeProperty(v));
  }
  document.documentElement.setAttribute('data-glow', st.glow === false ? 'off' : 'on');
  document.body.classList.toggle('navglow', st.glow !== false);
  const dark = t === 'dark' || t === 'pitch';
  const bg = t === 'pitch' ? '#000000' : dark ? '#161719' : '#F2F2F2';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = bg;
  if (window.OneBudget && OneBudget.theme) { try { OneBudget.theme(bg, !dark); } catch (e) {} }
  setTimeout(pushWidget, 60);
}

/* ============================================================
   SHEETS
   ============================================================ */
let SHEET_ONCLOSE = null;
function sheet(html, onClose) {
  const s = $('#sheet');
  const wasOpen = !s.hidden;
  /* Split off the trailing action block (or the entry keypad) so it is pinned
     to the bottom of the panel: always fully visible and always in the thumb
     zone, no matter how long the form above it is. */
  let body = html, actions = '';
  const cut = Math.max(html.lastIndexOf('<div class="rowgap">'), html.lastIndexOf('<div class="qpad">'));
  if (cut > 0 && html.length - cut < 1600) {
    body = html.slice(0, cut);
    actions = html.slice(cut);
  }
  /* one-hand mode: if a panel has nothing pinned at the bottom, pin a Close
     there, so nothing ever needs the top of the screen to get out of */
  if (!actions && DB.settings && DB.settings.oneHand) {
    actions = '<div class="rowgap"><button class="btn ghost btnblock" onclick="closeSheet()">Close</button></div>';
  }
  s.innerHTML = '<div class="sheetcard">' +
      '<div class="sheetgrab"><i></i></div>' +
      '<div class="sheet-body">' + body + '</div>' +
      (actions ? '<div class="sheet-actions">' + actions + '</div>' : '') +
    '</div>';
  s.hidden = false;
  /* the slide-up plays when a panel opens, never when its contents are
     refreshed underneath the user (that looked like the app reloading) */
  if (wasOpen) { const c = s.querySelector('.sheetcard'); if (c) c.style.animation = 'none'; }
  document.body.classList.add('sheetopen');
  SHEET_ONCLOSE = onClose || null;
  wireSheetDrag();
}
/* pull the panel down from its handle (or its title bar) to dismiss */
function wireSheetDrag() {
  const card = $('#sheet .sheetcard');
  if (!card) return;
  const grab = card.querySelector('.sheetgrab');
  const head = card.querySelector('.sheethead');
  let y0 = null, dy = 0;
  const start = e => { y0 = e.touches[0].clientY; dy = 0; card.style.transition = 'none'; };
  const move = e => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    card.style.transform = 'translateY(' + dy + 'px)';
    if (e.cancelable) e.preventDefault();
  };
  const end = () => {
    if (y0 == null) return;
    card.style.transition = '';
    card.style.transform = '';
    const dismissed = dy > 90;
    y0 = null;
    if (dismissed) closeSheet();
  };
  [grab, head].forEach(el => {
    if (!el) return;
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  });
}
function closeSheet() {
  const s = $('#sheet');
  s.hidden = true; s.innerHTML = '';
  document.body.classList.remove('sheetopen');
  const cb = SHEET_ONCLOSE; SHEET_ONCLOSE = null;
  if (cb) cb();
}
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
function sheetHead(title, right) {
  return '<div class="sheethead"><b>' + esc(title) + '</b><div class="inline">' + (right || '') +
    '<button class="iconbtn" onclick="closeSheet()">' + ico('x') + '</button></div></div>';
}

/* ---------- month picker ---------- */
function monthPicker(curKey, onPick) {
  let year = +curKey.slice(0, 4);
  const curMonth = +curKey.slice(5, 7) - 1;
  const paint = () => {
    const grid = $('#mpgrid'), y = $('#mpyear');
    if (!grid) return;
    y.textContent = year;
    grid.innerHTML = MON.map((m, i) => '<button class="segb mpmonth ' + (i === curMonth && year === +curKey.slice(0, 4) ? 'on' : '') + '" data-m="' + i + '">' + m.slice(0, 3) + '</button>').join('');
    grid.querySelectorAll('.mpmonth').forEach(b => b.onclick = () => { onPick(year + '-' + pad2(+b.dataset.m + 1)); closeSheet(); });
  };
  sheet(sheetHead('Jump to month') +
    '<div class="mnav" style="margin-top:4px"><button class="iconbtn" id="mpPrev">' + ico('chevL') + '</button><b id="mpyear"></b><button class="iconbtn" id="mpNext">' + ico('chevR') + '</button></div>' +
    '<div class="seg" id="mpgrid" style="flex-wrap:wrap;background:transparent;padding:0;gap:8px"></div>' +
    '<div class="rowgap"><button class="btn ghost btnblock" id="mpToday">Go to this month</button></div>');
  $('#mpPrev').onclick = () => { year--; paint(); };
  $('#mpNext').onclick = () => { year++; paint(); };
  $('#mpToday').onclick = () => { onPick(mkey(new Date())); closeSheet(); };
  paint();
}


/* ============================================================
   IN-APP PICKERS
   The phone's own date dialog and option menu are white system
   components that clash badly with the app, so both are replaced
   with panels drawn from the same design system.
   ============================================================ */
function datePickerSheet(iso, onPick, opts) {
  opts = opts || {};
  const start = iso ? parseYmd(iso) : new Date();
  let year = start.getFullYear(), month = start.getMonth();
  let sel = iso ? ymd(start) : todayYmd();

  const paint = () => {
    const first = new Date(year, month, 1);
    const dim = daysInMonth(first);
    const lead = first.getDay();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    const todayIso = todayYmd();
    const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const grid = cells.map(d => {
      if (d == null) return '<div class="dpcell mute"></div>';
      const thisIso = year + '-' + pad2(month + 1) + '-' + pad2(d);
      const cls = 'dpcell' + (thisIso === todayIso ? ' today' : '') + (thisIso === sel ? ' sel' : '');
      return '<button class="' + cls + '" data-d="' + d + '">' + d + '</button>';
    }).join('');
    sheet(sheetHead(opts.title || 'Pick a date') +
      '<div class="mnav" style="margin-top:4px">' +
        '<button class="iconbtn" id="dpPrev">' + ico('chevL') + '</button>' +
        '<b id="dpLabel">' + esc(monthLabel(first)) + '</b>' +
        '<button class="iconbtn" id="dpNext">' + ico('chevR') + '</button>' +
      '</div>' +
      '<div class="dpdow">' + dow.map(x => '<span>' + x + '</span>').join('') + '</div>' +
      '<div class="dpgrid" id="dpGrid">' + grid + '</div>' +
      '<p class="hint" id="dpPicked" style="text-align:center">' + esc(fmtDayLong(sel)) + '</p>' +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="dpDone">Use this date</button>' +
        '<button class="btn ghost btnblock" id="dpToday">Today</button>' +
        (opts.allowClear ? '<button class="btn ghost btnblock" id="dpClear">Clear</button>' : '') +
      '</div>');
    $('#dpPrev').onclick = () => { month--; if (month < 0) { month = 11; year--; } paint(); };
    $('#dpNext').onclick = () => { month++; if (month > 11) { month = 0; year++; } paint(); };
    $('#dpGrid').querySelectorAll('.dpcell[data-d]').forEach(b => b.onclick = () => {
      sel = year + '-' + pad2(month + 1) + '-' + pad2(+b.dataset.d);
      paint();
    });
    $('#dpDone').onclick = () => { closeSheet(); onPick(sel); };
    $('#dpToday').onclick = () => { sel = todayYmd(); const t = parseYmd(sel); year = t.getFullYear(); month = t.getMonth(); paint(); };
    const cl = $('#dpClear');
    if (cl) cl.onclick = () => { closeSheet(); onPick(''); };
  };
  paint();
}
function optionSheet(title, options, current, onPick) {
  sheet(sheetHead(title) +
    '<div class="card list" style="padding:6px 0">' + options.map(o =>
      '<div class="lrow" data-v="' + esc(o[0]) + '"><div class="lmain"><div class="ltitle">' + esc(o[1]) + '</div>' +
      (o[2] ? '<div class="lsub">' + esc(o[2]) + '</div>' : '') + '</div>' +
      (String(o[0]) === String(current) ? '<span class="rval" style="color:var(--accent)">' + ico('check') + '</span>' : '') +
      '</div>').join('') + '</div>');
  $$('#sheet .lrow').forEach(r => r.onclick = () => { closeSheet(); onPick(r.dataset.v); });
}

/* ---------- add / edit transaction — compact, thumb-first ---------- */
let TXDRAFT = null, QEDITOR = null, VOICEHEARD = '', VOICEHEARD_FROM = '', BILLTEXT = '';
function fmtAmtInput(s) {
  s = String(s == null ? '' : s);
  const parts = s.split('.');
  let whole = '';
  try { whole = new Intl.NumberFormat(DB.settings.locale || 'en-IN').format(+parts[0] || 0); }
  catch (e) { whole = parts[0] || '0'; }
  return whole + (s.indexOf('.') >= 0 ? '.' + (parts[1] || '') : '');
}
function txSheet(id, presetType, presetDate, draft) {
  const editing = id ? DB.tx.find(t => t.id === id) : null;
  const t = editing || { id: '', type: presetType || 'exp', amt: '', cat: '', note: '', date: presetDate || todayYmd(), acc: (DB.accounts[0] || {}).id || '', time: '' };
  VOICEHEARD = '';
  if (!editing && draft) {
    if (draft.type) t.type = draft.type;
    if (draft.amt != null && draft.amt !== '') t.amt = String(draft.amt);
    if (draft.cat) t.cat = draft.cat;
    if (draft.date) t.date = draft.date;
    if (draft.note) t.note = draft.note;
    if (draft.acc) t.acc = draft.acc;
    VOICEHEARD = draft.heard || '';
    VOICEHEARD_FROM = draft.billText ? 'bill' : 'voice';
    BILLTEXT = draft.billText || '';
  }
  if (!t.cat) { const l = catsOf(t.type); t.cat = l.length ? l[0].id : ''; }
  if (!t.acc) t.acc = (DB.accounts[0] || {}).id || '';
  TXDRAFT = { ...t };
  QEDITOR = null;

  const paint = () => {
    const d = TXDRAFT;
    const list = catsOf(d.type);
    if (!list.some(c => c.id === d.cat)) d.cat = list.length ? list[0].id : '';
    const sym = DB.settings.currency || '₹';
    const a = acct(d.acc);
    const dateLbl = d.date === todayYmd() ? 'Today' : (d.date === ymd(addDays(new Date(), -1)) ? 'Yesterday' : fmtDay(d.date));
    const noteLbl = (d.note || '').trim();

    sheet(
      sheetHead(editing ? 'Edit transaction' : 'Add transaction',
        '<button class="iconbtn" id="txCam">' + ico('camera') + '</button>' +
        '<button class="iconbtn" id="txMic">' + ico('mic') + '</button>' +
        '<button class="iconbtn" id="txTmpl" title="Save as template">' + ico('bookmark') + '</button>' +
        (editing ? '<button class="iconbtn" id="txDel">' + ico('trash') + '</button>' : '')) +
      (VOICEHEARD ? '<div class="heard" id="heardRow">' + ico(VOICEHEARD_FROM === 'bill' ? 'camera' : 'mic') + '<span>' + esc(VOICEHEARD) + '</span>' +
        (BILLTEXT ? '<button class="linkbtn" id="seeBill">Text</button>' : '') + '</div>' : '') +
      '<div class="qtype" id="tog">' +
        '<button data-t="exp" class="' + (d.type === 'exp' ? 'on' : '') + '">' + ico('down') + 'Expense</button>' +
        '<button data-t="inc" class="' + (d.type === 'inc' ? 'on inc' : '') + '">' + ico('up') + 'Income</button>' +
      '</div>' +
      '<div class="qamount"><span class="cur">' + esc(sym) + '</span>' +
        '<span class="qval' + (d.amt ? '' : ' dim') + '" id="qval">' + esc(d.amt ? fmtAmtInput(d.amt) : '0') + '</span></div>' +
      '<div class="qcats" id="qcats">' + list.map(c =>
        '<button class="qcat ' + (c.id === d.cat ? 'on' : '') + '" data-c="' + c.id + '">' +
        '<span class="catico">' + ico(c.icon) + '</span><span>' + esc(c.name) + '</span></button>').join('') + '</div>' +
      '<div class="qchips" id="qchips">' +
        '<button class="qchip ' + (QEDITOR === 'date' ? 'on' : '') + '" data-e="date">' + ico('calendar') + esc(dateLbl) + '</button>' +
        '<button class="qchip ' + (QEDITOR === 'acc' ? 'on' : '') + '" data-e="acc">' + ico(a ? a.icon : 'wallet') + esc(a ? a.name : 'Account') + '</button>' +
        '<button class="qchip ' + (QEDITOR === 'note' ? 'on' : '') + '" data-e="note">' + ico('edit') + esc(noteLbl ? noteLbl.slice(0, 20) : 'Note') + '</button>' +
      '</div>' +

      (QEDITOR === 'acc' ? '<div class="qinline"><div class="pillrow" id="qiAcc" style="margin:0">' + DB.accounts.map(x =>
        '<button class="chip ' + (x.id === d.acc ? 'on' : '') + '" data-a="' + x.id + '">' + esc(x.name) + '</button>').join('') + '</div></div>' : '') +
      (QEDITOR === 'note' ? '<div class="qinline"><input id="qiNote" class="fld" placeholder="What was it for?" value="' + esc(d.note) + '" maxlength="120" autocomplete="off"></div>' : '') +
      '<div class="qpad"><div class="qkeys" id="qkeys">' +
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '00'].map(k =>
          '<button class="qkey" data-k="' + k + '">' + k + '</button>').join('') +
      '</div><div class="qacts">' +
        '<button class="qkey del" id="qDel">' + ico('x') + '</button>' +
        '<button class="qkey ok" id="qOk">' + ico('check') + '</button>' +
      '</div></div>'
    );

    const q = s => $('#sheet').querySelector(s);
    q('#tog').querySelectorAll('button').forEach(b => b.onclick = () => { TXDRAFT.type = b.dataset.t; QEDITOR = null; paint(); });
    q('#qcats').querySelectorAll('.qcat').forEach(b => b.onclick = () => {
      TXDRAFT.cat = b.dataset.c;
      q('#qcats').querySelectorAll('.qcat').forEach(x => x.classList.toggle('on', x.dataset.c === TXDRAFT.cat));
    });
    q('#qchips').querySelectorAll('.qchip').forEach(b => b.onclick = () => {
      const kind = b.dataset.e;
      if (kind === 'date') { datePickerSheet(d.date, v => { TXDRAFT.date = v || todayYmd(); paint(); }, { title: 'Date of this entry' }); return; }
      QEDITOR = (QEDITOR === kind ? null : kind); paint();
    });
    q('#qkeys').querySelectorAll('.qkey').forEach(b => b.onclick = () => pressKey(b.dataset.k));
    /* every button in this panel glows as it is pressed */
    $('#sheet').querySelectorAll('.qkey, .qcat, .qchip, .qtype button').forEach(k =>
      k.addEventListener('pointerdown', () => glowPress(k), { passive: true }));
    q('#txMic').onclick = () => { closeSheet(); setTimeout(voiceSheet, 220); };
    q('#txTmpl').onclick = () => {
      const v = parseFloat(String(TXDRAFT.amt).replace(/,/g, ''));
      if (!v || v <= 0) { toast('Enter an amount first'); return; }
      DB.templates.push({ id: uid(), type: TXDRAFT.type, cat: TXDRAFT.cat, amt: Math.round(v * 100) / 100, note: (TXDRAFT.note || '').trim(), acc: TXDRAFT.acc || '' });
      save(); toast('Saved as a template');
    };
    q('#txCam').onclick = () => { closeSheet(); setTimeout(photoSheet, 220); };
    const sb = q('#seeBill');
    if (sb) sb.onclick = () => sheet(sheetHead('Text read from the bill') +
      '<div class="filepre" style="max-height:52vh;white-space:pre-wrap">' + esc(BILLTEXT) + '</div>' +
      '<div class="rowgap"><button class="btn primary btnblock" onclick="closeSheet()">Done</button></div>');
    q('#qDel').onclick = () => pressKey('del');
    q('#qOk').onclick = () => saveTx();
    if (editing) q('#txDel').onclick = () => deleteTx(id, true);
    const ai = q('#qiAcc'); if (ai) ai.querySelectorAll('.chip').forEach(b => b.onclick = () => { TXDRAFT.acc = b.dataset.a; QEDITOR = null; paint(); });
    const sel = q('#qcats .qcat.on');
    if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { } }
    const ni = q('#qiNote');
    if (ni) {
      ni.oninput = e => {
        TXDRAFT.note = e.target.value;
        const nc = $('#sheet').querySelector('#qchips [data-e="note"]');
        if (nc) { const v = (TXDRAFT.note || '').trim(); nc.innerHTML = ico('edit') + esc(v ? v.slice(0, 20) : 'Note'); }
      };
      setTimeout(() => ni.focus(), 60);
    }
  };

  /* looks like the same thing twice — ask before it lands */
  function duplicateSheet(near, rec, v) {
    sheet(sheetHead('Looks like a duplicate') +
      '<div class="card" style="background:var(--chip);margin:0 0 12px"><p class="hint" style="margin:0">' +
      'You already logged <b>' + esc(near.note || cat(near.cat).name) + '</b> for <b>' + esc(money(near.amt)) +
      '</b> on ' + esc(fmtDay(near.date)) + '. Add this one as well?</p></div>' +
      '<div class="card list" style="padding:6px 0">' + txRowHtml(near) + '</div>' +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="dupYes">Add it anyway</button>' +
        '<button class="btn ghost btnblock" id="dupNo">No, cancel</button>' +
      '</div>');
    $('#dupYes').onclick = () => { closeSheet(); setTimeout(() => saveTx(true), 200); };
    $('#dupNo').onclick = () => { closeSheet(); setTimeout(() => txSheet(null, TXDRAFT.type, TXDRAFT.date), 200); };
  }

  function pressKey(k) {
    let v = String(TXDRAFT.amt || '');
    if (k === 'del') { v = v.slice(0, -1); }
    else if (k === '00') { v = (v || '0') + '00'; }
    else if (k === '.') { if (v.indexOf('.') >= 0) return; v = (v || '0') + '.'; }
    else {
      if (v.indexOf('.') >= 0 && v.split('.')[1].length >= 2) return;
      if (v.replace('.', '').length >= 9) return;
      v = (v === '0' ? '' : v) + k;
    }
    TXDRAFT.amt = v;
    const val = $('#sheet').querySelector('#qval');
    if (val) { val.textContent = v ? fmtAmtInput(v) : '0'; val.classList.toggle('dim', !v); }
    else paint();
  }

  function saveTx(force) {
    const v = parseFloat(String(TXDRAFT.amt).replace(/,/g, ''));
    if (!v || v <= 0) { toast('Enter an amount'); return; }
    if (!TXDRAFT.cat) { toast('Pick a category'); return; }
    const rec = {
      id: id || uid(), type: TXDRAFT.type, amt: Math.round(v * 100) / 100,
      cat: TXDRAFT.cat, note: (TXDRAFT.note || '').trim(), acc: TXDRAFT.acc || '',
      date: TXDRAFT.date || todayYmd(), time: editing ? editing.time : new Date().toTimeString().slice(0, 5),
      updated: Date.now(),
    };
    if (!id && !force) {
      const near = DB.tx.find(x => x.type === rec.type && x.cat === rec.cat &&
        Math.abs((+x.amt || 0) - rec.amt) < 0.01 &&
        Math.abs((parseYmd(x.date) - parseYmd(rec.date)) / 86400000) <= 2);
      if (near) { duplicateSheet(near, rec, v); return; }
    }
    if (id) { const i = DB.tx.findIndex(x => x.id === id); DB.tx[i] = rec; }
    else DB.tx.push(rec);
    save(); closeSheet();
    toast(id ? 'Updated' : (rec.type === 'exp' ? 'Expense added' : 'Income added'));
    if (!navigator.onLine) setTimeout(() => toast('Saved on this device — works offline'), 900);
    pushWidget(); queueSync(); route();
  }

  paint();
}

/* ---------- transaction detail ---------- */
function txDetail(id) {
  const t = DB.tx.find(x => x.id === id);
  if (!t) return;
  const c = cat(t.cat), a = acct(t.acc);
  sheet(
    sheetHead('Transaction') +
    '<div class="sumcard" style="margin:0 0 8px;background:var(--chip)">' +
      '<div class="inline" style="gap:16px">' +
        '<span class="catico" style="width:52px;height:52px;background:var(--card);color:' + c.color + '">' + ico(c.icon) + '</span>' +
        '<div style="flex:1;min-width:0"><div class="txtitle" style="font-size:16px">' + esc(c.name) + '</div>' +
        '<div class="txsub">' + esc(fmtDayLong(t.date)) + (t.time ? ' · ' + esc(t.time) : '') + '</div></div>' +
        '<div class="amt big ' + (t.type === 'inc' ? 'inc' : 'exp') + '">' + (t.type === 'inc' ? '+' : '-') + esc(money(t.amt, true)) + '</div>' +
      '</div>' +
      (t.note ? '<div class="hint" style="margin:14px 2px 0;font-size:13.5px;color:var(--text)">' + esc(t.note) + '</div>' : '') +
      (a ? '<div class="pillrow" style="margin-top:12px"><span class="chip">' + esc(a.name) + '</span></div>' : '') +
    '</div>' +
    '<div class="rowgap"><div class="btnrow">' +
      '<button class="btn primary" id="dtEdit">Edit</button>' +
      '<button class="btn danger" id="dtDel">Delete</button>' +
    '</div></div>'
  );
  $('#dtEdit').onclick = () => { closeSheet(); setTimeout(() => txSheet(id), 180); };
  $('#dtDel').onclick = () => { closeSheet(); deleteTx(id, false); };
}

/* deleting is always undoable */
function deleteTx(id, alsoClose) {
  const i = DB.tx.findIndex(x => x.id === id);
  if (i < 0) return;
  const removed = DB.tx.splice(i, 1)[0];
  save();
  if (alsoClose) closeSheet();
  queueSync(); route();
  toast('Deleted ' + (removed.note || cat(removed.cat).name), {
    label: 'Undo',
    fn: () => { DB.tx.splice(i, 0, removed); save(); queueSync(); route(); toast('Put back'); },
  });
}

/* ---------- month recap ---------- */
/* ---------- accounts ---------- */
function accountSheet(id) {
  const editing = id ? acct(id) : null;
  const d = editing ? { ...editing } : { id: '', name: '', icon: 'wallet', color: CAT_COLORS[0], opening: 0 };
  const paint = () => {
    const info = editing ? accountBalances().find(a => a.id === editing.id) : null;
    sheet(
      sheetHead(editing ? 'Edit account' : 'New account') +
      (info ? '<div class="sumcard" style="background:var(--chip);margin:0 0 14px"><div class="sumlabel">Current balance</div>' +
        '<div class="amt-hero num" style="font-size:28px;margin-top:4px;color:' + (info.balance < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(info.balance)) + '</div>' +
        '<div class="sumsub">' + esc(money(info.income)) + ' in · ' + esc(money(info.spent)) + ' out · ' + info.count + ' entries</div></div>' : '') +
      '<label class="fldlabel">Name</label><input id="acName" class="fld" placeholder="e.g. HDFC Savings" value="' + esc(d.name) + '" maxlength="26">' +
      '<label class="fldlabel" style="margin-top:12px">Opening balance</label>' +
      '<div class="amountbox"><span class="cur">' + esc(DB.settings.currency || '₹') + '</span>' +
        '<input id="acOpen" type="number" inputmode="decimal" step="0.01" placeholder="0" value="' + (d.opening || '') + '"></div>' +
      '<p class="hint">What was in this account before you started tracking? Balances are worked out from this plus everything you record.</p>' +
      '<label class="fldlabel" style="margin-top:12px">Icon</label>' +
      '<div class="catgrid" id="acIcons" style="grid-template-columns:repeat(6,1fr)">' + ACC_ICONS.map(n =>
        '<button class="catcell ' + (n === d.icon ? 'on' : '') + '" data-i="' + n + '" style="min-height:0;padding:9px 4px"><span class="catico" style="width:32px;height:32px">' + ico(n) + '</span></button>').join('') + '</div>' +
      '<label class="fldlabel" style="margin-top:12px">Colour</label>' +
      '<div class="accentrow" id="acColors" style="margin-top:6px">' + CAT_COLORS.map(c =>
        '<button class="accentdot ' + (c === d.color ? 'on' : '') + '" data-col="' + c + '" style="background:' + c + ';width:32px;height:32px"></button>').join('') + '</div>' +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="acSave">' + (editing ? 'Save account' : 'Add account') + '</button>' +
        (editing && DB.tx.filter(t => t.acc === editing.id).length === 0 && DB.accounts.length > 1 ? '<button class="btn danger btnblock" id="acDel">Delete account</button>' : '') +
      '</div>'
    );
    $('#acIcons').querySelectorAll('.catcell').forEach(b => b.onclick = () => { d.icon = b.dataset.i; paint(); });
    $('#acColors').querySelectorAll('.accentdot').forEach(b => b.onclick = () => { d.color = b.dataset.col; paint(); });
    $('#acName').oninput = e => { d.name = e.target.value; };
    $('#acOpen').oninput = e => { d.opening = parseFloat(e.target.value) || 0; };
    const del = $('#acDel');
    if (del) del.onclick = () => { DB.accounts = DB.accounts.filter(a => a.id !== editing.id); save(); closeSheet(); toast('Account deleted'); queueSync(); route(); };
    $('#acSave').onclick = () => {
      const name = (d.name || '').trim();
      if (!name) { toast('Enter a name'); return; }
      if (editing) { const i = DB.accounts.findIndex(a => a.id === editing.id); DB.accounts[i] = { ...DB.accounts[i], name, icon: d.icon, color: d.color, opening: +d.opening || 0 }; }
      else DB.accounts.push({ id: 'a' + uid(), name, icon: d.icon, color: d.color, opening: +d.opening || 0 });
      save(); closeSheet(); toast(editing ? 'Account saved' : 'Account added'); queueSync(); route();
    };
    if (!editing) focusLater('#acName');
  };
  paint();
}

/* ---------- recurring bills ---------- */
function recurringSheet(id) {
  const editing = id ? DB.recurring.find(r => r.id === id) : null;
  const d = editing ? { ...editing } : { id: '', name: '', amt: '', cat: catsOf('exp')[0].id, acc: (DB.accounts[0] || {}).id || '', freq: 'monthly', nextDue: ymd(addDays(new Date(), 7)), active: true };
  const paint = () => {
    const list = catsOf('exp');
    if (!list.some(c => c.id === d.cat)) d.cat = list[0].id;
    sheet(
      sheetHead(editing ? 'Edit recurring bill' : 'New recurring bill') +
      '<label class="fldlabel">Name</label><input id="rcName" class="fld" placeholder="e.g. Netflix, Rent, Internet" value="' + esc(d.name) + '" maxlength="40">' +
      '<label class="fldlabel" style="margin-top:12px">Amount</label>' +
      '<div class="amountbox"><span class="cur">' + esc(DB.settings.currency || '₹') + '</span>' +
        '<input id="rcAmt" type="number" inputmode="decimal" min="0" placeholder="0" value="' + (d.amt || '') + '"></div>' +
      '<div class="field-row" style="display:flex;gap:12px;margin-top:16px">' +
        '<div style="flex:1"><label class="fldlabel">Repeats</label>' +
          '<button class="pickrow" id="rcFreq"><span>' + esc(freqLabel(d.freq)) + '</span>' + ico('chevD') + '</button></div>' +
        '<div style="flex:1"><label class="fldlabel">Next due</label>' +
          '<button class="pickrow" id="rcDue"><span>' + esc(fmtDay(d.nextDue)) + '</span>' + ico('calendar') + '</button></div>' +
      '</div>' +
      '<label class="fldlabel" style="margin-top:16px">Category</label>' +
      '<div class="qcats" id="rcCats">' + list.map(c =>
        '<button class="qcat ' + (c.id === d.cat ? 'on' : '') + '" data-c="' + c.id + '">' +
        '<span class="catico">' + ico(c.icon) + '</span><span>' + esc(c.name) + '</span></button>').join('') + '</div>' +
      '<label class="fldlabel" style="margin-top:16px">Paid from</label>' +
      '<div class="pillrow" id="rcAcc">' + DB.accounts.map(a =>
        '<button class="chip ' + (a.id === d.acc ? 'on' : '') + '" data-a="' + a.id + '">' + esc(a.name) + '</button>').join('') + '</div>' +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="rcSave">' + (editing ? 'Save bill' : 'Add recurring bill') + '</button>' +
        (editing ? '<button class="btn ghost btnblock" id="rcPaid">Mark this one as paid</button>' : '') +
        (editing ? '<button class="btn danger btnblock" id="rcDel">Delete</button>' : '') +
      '</div>'
    );
    $('#rcName').oninput = e => { d.name = e.target.value; };
    $('#rcAmt').oninput = e => { d.amt = e.target.value; };
    $('#rcFreq').onclick = () => optionSheet('Repeats', FREQS.map(f => [f[0], f[1]]), d.freq, v => { d.freq = v; paint(); });
    $('#rcDue').onclick = () => datePickerSheet(d.nextDue, v => { d.nextDue = v || todayYmd(); paint(); }, { title: 'Next due date' });
    $('#rcCats').querySelectorAll('.qcat').forEach(b => b.onclick = () => { d.cat = b.dataset.c; paint(); });
    const selc = $('#rcCats').querySelector('.qcat.on');
    if (selc && selc.scrollIntoView) { try { selc.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { } }
    $('#rcAcc').querySelectorAll('.chip').forEach(b => b.onclick = () => { d.acc = b.dataset.a; paint(); });
    if (editing) {
      $('#rcDel').onclick = () => { DB.recurring = DB.recurring.filter(r => r.id !== editing.id); save(); closeSheet(); toast('Recurring bill deleted'); queueSync(); route(); };
      $('#rcPaid').onclick = () => { closeSheet(); markPaid(editing.id); };
    }
    $('#rcSave').onclick = () => {
      const name = (d.name || '').trim(), v = parseFloat(d.amt);
      if (!name) { toast('Enter a name'); return; }
      if (!v || v <= 0) { toast('Enter an amount'); return; }
      const rec = { id: editing ? editing.id : uid(), name, amt: Math.round(v * 100) / 100, cat: d.cat, acc: d.acc, freq: d.freq, nextDue: d.nextDue, active: editing ? editing.active !== false : true };
      if (editing) { const i = DB.recurring.findIndex(r => r.id === editing.id); DB.recurring[i] = rec; }
      else DB.recurring.push(rec);
      save(); closeSheet(); toast(editing ? 'Bill saved' : 'Recurring bill added'); queueSync(); route();
    };
    if (!editing) focusLater('#rcName');
  };
  paint();
}
function markPaid(id) {
  const r = DB.recurring.find(x => x.id === id);
  if (!r) return;
  DB.tx.push({ id: uid(), type: 'exp', amt: +r.amt || 0, cat: r.cat, note: r.name, acc: r.acc, date: todayYmd(), time: new Date().toTimeString().slice(0, 5), updated: Date.now() });
  r.nextDue = advanceDue(r);
  save(); toast(r.name + ' recorded · next due ' + fmtDay(r.nextDue)); pushWidget(); queueSync(); route();
}

/* ---------- goals ---------- */
function goalSheet(id) {
  const editing = id ? DB.goals.find(g => g.id === id) : null;
  const d = editing ? { ...editing } : { id: '', name: '', target: '', saved: 0, color: '#12B76A', icon: 'target', deadline: '' };
  const paint = () => {
    const info = editing ? goalInfo(editing) : null;
    sheet(
      sheetHead(editing ? 'Edit goal' : 'New savings goal') +
      (info ? '<div class="sumcard" style="background:var(--chip);margin:0 0 14px"><div class="sumlabel">Progress' +
        '<span class="trendchip ' + (info.done ? 'down' : 'flat') + '">' + Math.round(info.pct) + '%</span></div>' +
        '<div class="amt-hero num" style="font-size:26px;margin-top:4px">' + esc(money(info.saved)) + '</div>' +
        '<div class="sumsub">of ' + esc(money(info.target)) + (info.eta && !info.done ? ' · about ' + info.eta + ' months to go' : info.done ? ' · goal reached' : '') + '</div></div>' : '') +
      '<label class="fldlabel">Goal name</label><input id="glName" class="fld" placeholder="e.g. Emergency fund, New phone" value="' + esc(d.name) + '" maxlength="40">' +
      '<label class="fldlabel" style="margin-top:16px">Target amount</label>' +
      '<div class="amountbox"><span class="cur">' + esc(DB.settings.currency || '₹') + '</span>' +
        '<input id="glTarget" type="number" inputmode="decimal" min="0" placeholder="0" value="' + (d.target || '') + '"></div>' +
      (!editing ? '<label class="fldlabel" style="margin-top:16px">Already saved</label>' +
        '<div class="amountbox"><span class="cur">' + esc(DB.settings.currency || '₹') + '</span>' +
        '<input id="glSaved" type="number" inputmode="decimal" min="0" placeholder="0" value="' + (d.saved || '') + '"></div>' : '') +
      '<label class="fldlabel" style="margin-top:12px">Target date (optional)</label>' +
      '<button class="pickrow" id="glDeadline"><span>' + (d.deadline ? esc(fmtDay(d.deadline)) : 'No target date') + '</span>' + ico('calendar') + '</button>' +
      '<label class="fldlabel" style="margin-top:12px">Icon</label>' +
      '<div class="catgrid" id="glIcons" style="grid-template-columns:repeat(6,1fr)">' + ['target', 'piggy', 'home', 'car', 'plane', 'gift', 'heart', 'book', 'phone', 'bank', 'spark', 'wallet'].map(n =>
        '<button class="catcell ' + (n === d.icon ? 'on' : '') + '" data-i="' + n + '" style="min-height:0;padding:9px 4px"><span class="catico" style="width:32px;height:32px">' + ico(n) + '</span></button>').join('') + '</div>' +
      '<label class="fldlabel" style="margin-top:12px">Colour</label>' +
      '<div class="accentrow" id="glColors" style="margin-top:6px">' + CAT_COLORS.map(c =>
        '<button class="accentdot ' + (c === d.color ? 'on' : '') + '" data-col="' + c + '" style="background:' + c + ';width:32px;height:32px"></button>').join('') + '</div>' +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="glSave">' + (editing ? 'Save goal' : 'Create goal') + '</button>' +
        (editing ? '<button class="btn danger btnblock" id="glDel">Delete goal</button>' : '') +
      '</div>'
    );
    $('#glName').oninput = e => { d.name = e.target.value; };
    $('#glTarget').oninput = e => { d.target = e.target.value; };
    const sv = $('#glSaved'); if (sv) sv.oninput = e => { d.saved = parseFloat(e.target.value) || 0; };
    $('#glDeadline').onclick = () => datePickerSheet(d.deadline || todayYmd(), v => { d.deadline = v || ''; paint(); }, { title: 'Target date', allowClear: true });
    $('#glIcons').querySelectorAll('.catcell').forEach(b => b.onclick = () => { d.icon = b.dataset.i; paint(); });
    $('#glColors').querySelectorAll('.accentdot').forEach(b => b.onclick = () => { d.color = b.dataset.col; paint(); });
    if (editing) $('#glDel').onclick = () => { DB.goals = DB.goals.filter(g => g.id !== editing.id); save(); closeSheet(); toast('Goal deleted'); queueSync(); route(); };
    $('#glSave').onclick = () => {
      const name = (d.name || '').trim(), target = parseFloat(d.target);
      if (!name) { toast('Enter a name'); return; }
      if (!target || target <= 0) { toast('Enter a target amount'); return; }
      const rec = { id: editing ? editing.id : uid(), name, target: Math.round(target * 100) / 100, saved: editing ? +editing.saved || 0 : (+d.saved || 0), color: d.color, icon: d.icon, deadline: d.deadline || '' };
      if (editing) { const i = DB.goals.findIndex(g => g.id === editing.id); DB.goals[i] = rec; }
      else DB.goals.push(rec);
      save(); closeSheet(); toast(editing ? 'Goal saved' : 'Goal created'); queueSync(); route();
    };
    if (!editing) focusLater('#glName');
  };
  paint();
}
function contributeSheet(id) {
  const g = DB.goals.find(x => x.id === id);
  if (!g) return;
  const info = goalInfo(g);
  sheet(
    sheetHead('Add to ' + g.name) +
    '<div class="sumcard" style="background:var(--chip);margin:0 0 14px"><div class="sumlabel">Still to save</div>' +
      '<div class="amt-hero num" style="font-size:26px;margin-top:4px">' + esc(money(info.left)) + '</div>' +
      '<div class="sumsub">' + esc(money(info.saved)) + ' of ' + esc(money(info.target)) + ' saved</div></div>' +
    '<label class="fldlabel">Amount to add</label>' +
    '<div class="amountbox"><span class="cur">' + esc(DB.settings.currency || '₹') + '</span>' +
      '<input id="ctAmt" type="number" inputmode="decimal" min="0" placeholder="0"></div>' +
    '<div class="pillrow">' + [500, 1000, 2500, 5000].map(v => '<button class="chip" data-v="' + v + '">+' + esc(moneyShort(v)) + '</button>').join('') + '</div>' +
    '<div class="lrow" style="padding:14px 4px"><div class="lmain"><div class="ltitle">Record as a transaction</div>' +
      '<div class="lsub">Counts it under the Savings category</div></div>' +
      '<button class="switch on" id="ctRec"></button></div>' +
    '<div class="rowgap"><button class="btn primary btnblock" id="ctGo">Add to goal</button></div>'
  );
  let record = true;
  $('#ctRec').onclick = () => { record = !record; $('#ctRec').classList.toggle('on', record); };
  $('#sheet').querySelectorAll('.pillrow .chip').forEach(b => b.onclick = () => { $('#ctAmt').value = b.dataset.v; });
  $('#ctGo').onclick = () => {
    const v = parseFloat($('#ctAmt').value);
    if (!v || v <= 0) { toast('Enter an amount'); return; }
    g.saved = Math.round(((+g.saved || 0) + v) * 100) / 100;
    if (record) {
      DB.tx.push({ id: uid(), type: 'exp', amt: v, cat: 'savings', note: g.name, acc: (DB.accounts[0] || {}).id || '', date: todayYmd(), time: new Date().toTimeString().slice(0, 5), updated: Date.now() });
    }
    save(); closeSheet(); pushWidget();
    const info2 = goalInfo(g);
    toast(info2.done ? 'Goal reached — well done!' : money(v) + ' added to ' + g.name);
    queueSync(); route();
  };
  focusLater('#ctAmt');
}

/* ---------- currency ---------- */
function currencySheet() {
  const st = DB.settings;
  sheet(
    sheetHead('Currency') +
    '<div class="card list" style="padding:6px 0">' + CURRENCIES.map(c =>
      '<div class="lrow" data-c="' + c.code + '"><div class="lmain"><div class="ltitle">' + esc(c.symbol + '  ' + c.code) + '</div>' +
      '<div class="lsub">' + esc(c.name) + '</div></div>' +
      (st.code === c.code ? '<span class="rval" style="color:var(--accent)">' + ico('check') + '</span>' : '') + '</div>').join('') + '</div>' +
    '<label class="fldlabel">Or a custom symbol</label>' +
    '<input id="curSym" class="fld" placeholder="Symbol e.g. \u20B9" value="' + esc(st.currency) + '" maxlength="4">' +
    '<div class="rowgap"><button class="btn primary btnblock" id="curSave">Use this symbol</button>' +
    '<button class="btn ghost btnblock" onclick="closeSheet()">Cancel</button></div>'
  );
  $('#sheet').querySelectorAll('.lrow').forEach(r => r.onclick = () => {
    const c = CURRENCIES.find(x => x.code === r.dataset.c);
    DB.settings.currency = c.symbol; DB.settings.code = c.code; DB.settings.locale = c.locale;
    save(); closeSheet(); toast('Currency set to ' + c.code); route();
  });
  $('#curSave').onclick = () => {
    const s = $('#curSym').value.trim();
    if (!s) { toast('Enter a symbol'); return; }
    DB.settings.currency = s; DB.settings.code = 'CUSTOM';
    save(); closeSheet(); toast('Currency updated'); route();
  };
}

/* ---------- categories ---------- */
function catEditSheet(catId) {
  const editing = catId ? cat(catId) : null;
  const d = editing ? { ...editing } : { id: '', name: '', icon: 'tag', color: CAT_COLORS[0], kind: 'exp' };
  const paint = () => {
    const used = editing ? DB.tx.filter(t => t.cat === editing.id).length : 0;
    sheet(
      sheetHead(editing ? 'Edit category' : 'New category') +
      '<label class="fldlabel">Name</label><input id="ctName" class="fld" placeholder="e.g. Pet care" value="' + esc(d.name) + '" maxlength="28">' +
      '<label class="fldlabel" style="margin-top:16px">Type</label>' +
      '<div class="typetog" id="ctKind">' +
        '<button data-k="exp" class="' + (d.kind === 'exp' ? 'on' : '') + '">Expense</button>' +
        '<button data-k="inc" class="' + (d.kind === 'inc' ? 'on inc' : '') + '">Income</button></div>' +
      '<label class="fldlabel">Icon</label>' +
      '<div class="catgrid" id="ctIcons">' + CAT_ICONS.map(n =>
        '<button class="catcell ' + (n === d.icon ? 'on' : '') + '" data-i="' + n + '"><span class="catico">' + ico(n) + '</span></button>').join('') + '</div>' +
      '<label class="fldlabel" style="margin-top:12px">Colour</label>' +
      '<div class="accentrow" id="ctColors" style="margin-top:6px">' + CAT_COLORS.map(c =>
        '<button class="accentdot ' + (c === d.color ? 'on' : '') + '" data-col="' + c + '" style="background:' + c + ';width:32px;height:32px"></button>').join('') + '</div>' +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="ctSave">' + (editing ? 'Save category' : 'Add category') + '</button>' +
        (editing && used === 0 ? '<button class="btn danger btnblock" id="ctDel">Delete category</button>' : '') +
      '</div>' +
      (editing && used > 0 ? '<p class="hint">This category has ' + used + ' transactions, so it cannot be deleted.</p>' : '')
    );
    $('#ctKind').querySelectorAll('button').forEach(b => b.onclick = () => { d.kind = b.dataset.k; paint(); });
    $('#ctIcons').querySelectorAll('.catcell').forEach(b => b.onclick = () => { d.icon = b.dataset.i; paint(); });
    $('#ctColors').querySelectorAll('.accentdot').forEach(b => b.onclick = () => { d.color = b.dataset.col; paint(); });
    const nm = $('#ctName'); nm.oninput = () => { d.name = nm.value; };
    if (editing && used === 0) $('#ctDel').onclick = () => {
      DB.cats = DB.cats.filter(c => c.id !== editing.id);
      save(); closeSheet(); toast('Category deleted'); queueSync(); route();
    };
    $('#ctSave').onclick = () => {
      const name = (d.name || '').trim();
      if (!name) { toast('Enter a name'); return; }
      if (editing) { const i = DB.cats.findIndex(c => c.id === editing.id); DB.cats[i] = { ...DB.cats[i], name, icon: d.icon, color: d.color, kind: d.kind }; }
      else DB.cats.push({ id: 'c' + uid(), name, icon: d.icon, color: d.color, kind: d.kind });
      save(); closeSheet(); toast(editing ? 'Category saved' : 'Category added'); queueSync(); route();
    };
    setTimeout(() => { if (!editing) nm.focus(); }, 120);
  };
  paint();
}

/* deleting is always undoable */
function deleteTx(id, alsoClose) {
  const i = DB.tx.findIndex(x => x.id === id);
  if (i < 0) return;
  const removed = DB.tx.splice(i, 1)[0];
  save();
  if (alsoClose) closeSheet();
  queueSync(); route();
  toast('Deleted ' + (removed.note || cat(removed.cat).name), {
    label: 'Undo',
    fn: () => { DB.tx.splice(i, 0, removed); save(); queueSync(); route(); toast('Put back'); },
  });
}

/* ---------- month recap ---------- */
function recapSheet() {
  const key = VIEWMONTH, st = monthStats(key);
  const prevKey = mkey(addMonths(parseYmd(key + '-01'), -1));
  const prev = monthStats(prevKey);
  const cats = sortedCats(txOfMonth(key), 'exp');
  const biggest = txOfMonth(key).filter(t => t.type === 'exp').sort((a, c) => c.amt - a.amt)[0];
  const cum = cumulativeSeries(key);
  const lines = [
    monthLabel(parseYmd(key + '-01')) + ' in review',
    '',
    'Spent: ' + money(st.spent),
    'Income: ' + money(st.income),
    'Saved: ' + money(st.net) + (st.income > 0 ? ' (' + Math.round(savingsRate(st)) + '% savings rate)' : ''),
    'Transactions: ' + st.count,
    'Average per day: ' + money(st.daily),
    cats.length ? 'Top category: ' + cat(cats[0][0]).name + ' (' + money(cats[0][1]) + ')' : '',
    biggest ? 'Biggest expense: ' + money(biggest.amt) + (biggest.note ? ' — ' + biggest.note : '') : '',
    prev.spent > 0 ? 'vs ' + MON3[parseYmd(prevKey + '-01').getMonth()] + ': ' + (st.spent >= prev.spent ? '+' : '') + Math.round(((st.spent - prev.spent) / prev.spent) * 100) + '%' : '',
  ].filter(Boolean).join('\n');

  sheet(sheetHead('Month in review') +
    '<div class="sumcard" style="margin:0 0 14px"><div class="sumlabel">Spent in ' + esc(monthLabel(parseYmd(key + '-01'))) + '</div>' +
      '<div class="amt-hero num" style="margin-top:4px">' + esc(money(st.spent)) + '</div>' +
      '<div class="sumsub">' + st.count + ' transactions · ' + esc(money(st.daily)) + ' a day</div>' +
      '<div class="chartwrap">' + lineChart({ series: [{ name: 'Cumulative', color: 'var(--accent)', values: cum, fill: true }], h: 110, labels: ['1', '10', '20', String(st.dim)] }) + '</div>' +
    '</div>' +
    '<div class="card"><div class="datarow"><span>Income</span><b class="num">' + esc(money(st.income)) + '</b></div>' +
      '<div class="datarow"><span>Saved</span><b class="num" style="color:' + (st.net >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + esc(money(st.net)) + '</b></div>' +
      '<div class="datarow"><span>Savings rate</span><b class="num">' + Math.round(savingsRate(st)) + '%</b></div>' +
      '<div class="datarow"><span>Average per day</span><b class="num">' + esc(money(st.daily)) + '</b></div>' +
      (cats.length ? '<div class="datarow"><span>Top category</span><b>' + esc(cat(cats[0][0]).name) + '</b></div>' : '') +
      (biggest ? '<div class="datarow"><span>Biggest expense</span><b class="num">' + esc(money(biggest.amt)) + '</b></div>' : '') +
      (prev.spent > 0 ? '<div class="datarow"><span>vs ' + esc(MON3[parseYmd(prevKey + '-01').getMonth()]) + '</span><b>' + deltaChip(st.spent, prev.spent, true) + '</b></div>' : '') +
    '</div>' +
    (cats.length ? '<div class="card"><div class="sumlabel">By category</div><div class="chartwrap">' + hbarList(cats.slice(0, 6).map(([id, v]) => ({ name: cat(id).name, value: v, color: cat(id).color })), { showPct: false }) + '</div></div>' : '') +
    '<div class="rowgap"><button class="btn ghost btnblock" id="rcCopy">Copy summary</button></div>');
  $('#rcCopy').onclick = () => { copyText(lines); toast('Summary copied'); };
}

/* ============================================================
   VIEWS
   ============================================================ */
let VIEWMONTH = mkey(new Date());
let TXFILTER = 'all', TXSEARCH = '', TXSCOPE = 'month';
let STATSSEC = 'overview';

function head(title, sub) {
  $('#bigTitle').textContent = title;
  $('#bigSub').textContent = sub || '';
  $('#appbarTitle').textContent = title;
}
function monthNav() {
  const d = parseYmd(VIEWMONTH + '-01');
  const isNow = VIEWMONTH === mkey(new Date());
  return '<div class="mnav"><button class="iconbtn" id="mPrev">' + ico('chevL') + '</button>' +
    '<button class="mnavlbl" id="mLabel">' + esc(monthLabel(d)) + ' ' + ico('chevD') + '</button>' +
    '<button class="iconbtn" id="mNext">' + ico('chevR') + '</button></div>' +
    (!isNow ? '<button class="morebtn" id="mToday" style="margin-top:-4px">Back to this month</button>' : '');
}
function wireMonthNav() {
  const p = $('#mPrev'), n = $('#mNext'), l = $('#mLabel'), t = $('#mToday');
  if (p) p.onclick = () => { VIEWMONTH = mkey(addMonths(parseYmd(VIEWMONTH + '-01'), -1)); route(); };
  if (n) n.onclick = () => { VIEWMONTH = mkey(addMonths(parseYmd(VIEWMONTH + '-01'), 1)); route(); };
  if (l) l.onclick = () => monthPicker(VIEWMONTH, k => { VIEWMONTH = k; route(); });
  if (t) t.onclick = () => { VIEWMONTH = mkey(new Date()); route(); };
}
function hexA(hex, a) {
  const h = String(hex || '#8A8A8A').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  if (isNaN(n)) return 'rgba(138,138,138,' + a + ')';
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function catBarRows(cats, limit) {
  const max = Math.max(1, ...cats.map(c => c[1]));
  const total = cats.reduce((a, c) => a + c[1], 0);
  return cats.slice(0, limit).map(([id, v]) => {
    const c = cat(id);
    return '<div class="barow tap" data-more="cat" data-arg="' + id + '">' +
      '<div class="barline"><span class="bname"><i style="background:' + c.color + '"></i><span>' + esc(c.name) + '</span></span>' +
      '<b class="num">' + esc(money(v)) + '</b><span class="barchev">' + ico('chevR') + '</span></div>' +
      '<div class="bartrack"><i style="width:' + Math.max(2, Math.round((v / max) * 100)) + '%;background:' + c.color + '"></i></div>' +
      '<div class="pcttxt">' + (total ? Math.round((v / total) * 100) + '% of spending' : '') + '</div></div>';
  }).join('');
}
function catIconHtml(c, size) {
  const sz = size ? ';width:' + size + 'px;height:' + size + 'px' : '';
  if (materialOn()) {
    return '<span class="catico mico" style="color:' + c.color + sz + '">' + mIconInner(c.icon, c.color, c.id) + '</span>';
  }
  return '<span class="catico" style="background:' + hexA(c.color, .14) + ';color:' + c.color + sz + '">' + ico(c.icon) + '</span>';
}

/* ---------- HOME ---------- */
function renderHome() {
  const b = monthStats(VIEWMONTH);
  const prevKey = mkey(addMonths(parseYmd(VIEWMONTH + '-01'), -1));
  const prev = monthStats(prevKey);
  const isThisMonth = VIEWMONTH === mkey(new Date());
  head(isThisMonth ? 'This month' : monthLabel(parseYmd(VIEWMONTH + '-01')), '');

  const todaySpent = DB.tx.filter(t => t.type === 'exp' && t.date === todayYmd()).reduce((a, t) => a + (+t.amt || 0), 0);
  const last14 = dailyLast(14);
  const recent = DB.tx.slice().sort((a, c) => (c.date + (c.time || '')) < (a.date + (a.time || '')) ? -1 : 1).slice(0, 6);
  const cats = sortedCats(txOfMonth(VIEWMONTH), 'exp');
  const paceNow = cumulativeSeries(VIEWMONTH);
  const pacePrev = cumulativeSeries(prevKey);
  const up = upcomingBills(3);

  let html = monthNav();

  /* offline note — entries still save locally */
  if (navigator.onLine === false) {
    html += '<div class="offlinechip">' + ico('cloud') + 'Offline — everything you add is saved on this device</div>';
  }

  /* summary */
  html += '<div class="sumcard tap" data-more="month">' +
    '<div class="sumlabel">Spent this month' + deltaChip(b.spent, prev.spent, true) + '</div>' +
    '<div class="amt-hero num" style="margin-top:6px">' + esc(money(b.spent)) + '</div>' +
    '<div class="sumsub">' + b.count + ' transaction' + (b.count === 1 ? '' : 's') + (b.income ? ' · income ' + esc(money(b.income)) : '') + '</div>';
  html += '</div>';

  /* KPI tiles with sparklines */
  html += '<div class="kpis">' +
    '<div class="kpi tap" data-more="today"><div class="klabel">' + ico('calendar') + 'Today</div><div class="kval num">' + esc(money(todaySpent)) + '</div>' +
      '<div class="kspark">' + sparkline(last14) + '</div></div>' +
    '<div class="kpi tap" data-more="avg"><div class="klabel">' + ico('trend') + 'Avg per day</div><div class="kval num">' + esc(money(b.daily)) + '</div>' +
      '<div class="ksub">' + (prev.spent ? 'vs ' + esc(money(prev.daily)) + ' last month' : 'this month so far') + '</div></div>' +
    '<div class="kpi tap" data-more="saved"><div class="klabel">' + ico('piggy') + 'Saved</div><div class="kval num" style="color:' + (b.net >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + esc(money(b.net)) + '</div>' +
      '<div class="ksub">' + Math.round(savingsRate(b)) + '% savings rate</div></div>' +
    '<div class="kpi tap" data-more="entries"><div class="klabel">' + ico('layers') + 'Entries</div><div class="kval num">' + b.count + '</div>' +
      '<div class="ksub">' + (prev.count ? 'vs ' + prev.count + ' last month' : 'this month') + '</div></div>' +
    '</div>';

  html += updateCardHtml();

  /* net worth — what everything adds up to */
  const nw = netWorthNow();
  if (nw.bal.length) {
    const nwSeries = netWorthSeries(6);
    const nwDelta = nw.total - (nwSeries.length ? nwSeries[0].value : 0);
    html += '<div class="card tap nwcard" data-more="networth">' +
      '<div class="cardhead"><div class="sumlabel">' + ico('wallet') + 'Net worth</div>' +
      '<span class="linkbtn">Details</span></div>' +
      '<div class="amt-hero num" style="font-size:32px;margin-top:2px;color:' + (nw.total < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(nw.total)) + '</div>' +
      '<div class="inline" style="gap:10px;margin-top:8px;flex-wrap:wrap">' +
        deltaChip(nw.total, nwSeries.length ? nwSeries[0].value : nw.total) +
        '<span class="chip">' + esc(nw.bal.length + (nw.bal.length === 1 ? ' account' : ' accounts')) + '</span>' +
        '<span class="chip">' + esc('assets ' + moneyShort(nw.assets)) + '</span>' +
      '</div>' +
      '<div class="chartwrap" style="margin-top:12px">' + lineChart({ series: [{ name: 'Net worth', color: 'var(--accent)', values: nwSeries.map(s => s.value), fill: true }], labels: nwSeries.map(s => s.label), money: true }) + '</div>' +
    '</div>';
  }

  /* quick add — the categories you reach for most */
  const freq = {};
  DB.tx.forEach(t => { freq[t.cat] = (freq[t.cat] || 0) + 1; });
  const quick = Object.entries(freq).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([id]) => cat(id));
  html += '<div class="sect">Quick add</div><div class="qadd" id="qadd">' +
    '<button class="qaddbtn lead" id="qaddOpen">' + ico('plus') + '<span>Quick add</span></button>' +
    quick.map(c => '<button class="qaddbtn" data-qc="' + c.id + '">' + catIconHtml(c) + '<span>' + esc(c.name) + '</span></button>').join('') +
    '</div>';

  /* pace vs last month */
  if (paceNow.length > 1 && (b.spent || prev.spent)) {
    const maxLen = Math.max(paceNow.length, pacePrev.length);
    html += '<div class="card tap" data-more="pace"><div class="cardhead"><div class="sumlabel">' + ico('trend') + 'Spending pace</div>' +
      '<span class="linkbtn">Details</span></div>' +
      '<div class="chartwrap">' + lineChart({ series: [
        { name: 'This month', color: 'var(--accent)', values: paceNow, fill: true },
        { name: MON3[parseYmd(prevKey + '-01').getMonth()], color: 'var(--text2)', values: pacePrev, dash: true },
      ], h: 120, labels: ['1', String(Math.round(maxLen / 2)), String(maxLen)] }) + '</div></div>';
  }

  /* upcoming bills */
  if (up.length) {
    html += '<div class="sect" style="display:flex;align-items:center;justify-content:space-between">Upcoming bills' +
      '<button class="linkbtn" data-more="bills">All subscriptions</button></div><div class="card list">' + up.map(r => {
      const c = cat(r.cat), n = daysUntil(r.nextDue);
      return '<div class="recrow" data-rec="' + r.id + '">' + catIconHtml(c) +
        '<div class="recmain"><div class="rectop">' + esc(r.name) + '</div>' +
        '<div class="recsub">' + esc(c.name) + ' · ' + esc(freqLabel(r.freq)) + '</div></div>' +
        '<div class="recamt"><span class="amt num">' + esc(money(r.amt)) + '</span>' +
        '<span class="duechip ' + (n != null && n < 0 ? 'today' : n != null && n <= 3 ? 'soon' : '') + '">' + esc(dueLabel(r.nextDue)) + '</span></div></div>';
    }).join('') + '</div>';
  }

  /* goals */
  if (DB.goals.length) {
    html += '<div class="sect" style="display:flex;align-items:center;justify-content:space-between">Savings goals' +
      '<button class="linkbtn" data-go="#/goals">Manage</button></div><div class="card list">' + DB.goals.map(g => {
      const i = goalInfo(g);
      return '<div class="goalcard" data-goal="' + g.id + '">' +
        '<div class="goalring" style="--p:' + i.pct + ';--gc:' + g.color + '"><b>' + Math.round(i.pct) + '%</b></div>' +
        '<div class="goalmain"><div class="goaltop"><span>' + esc(g.name) + '</span><b class="num">' + esc(money(i.saved)) + '</b></div>' +
        '<div class="goalsub">' + (i.done ? 'Goal reached' : esc(money(i.left)) + ' to go' + (i.eta ? ' · ~' + i.eta + ' months' : '')) + '</div></div>' +
        '<span class="rval">' + ico('chevR') + '</span></div>';
    }).join('') + '</div>';
  }

  /* wallets */
  const wallets = accountBalances().filter(a => a.count || +a.opening);
  if (wallets.length) {
    html += '<div class="sect" style="display:flex;align-items:center;justify-content:space-between">Accounts' +
      '<button class="linkbtn" data-more="accounts">Breakdown</button></div><div class="card list">' + wallets.map(a =>
      '<div class="walletrow" data-acc="' + a.id + '">' + catIconHtml(a) +
      '<div class="walletmain"><div class="wallettop">' + esc(a.name) + '</div>' +
      '<div class="walletsub">' + esc(money(a.monthSpent)) + ' spent this month</div></div>' +
      '<span class="walletbal num" style="color:' + (a.balance < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(a.balance)) + '</span></div>').join('') + '</div>';
  }

  /* where it went */
  if (cats.length) {
    html += '<div class="card"><div class="cardhead"><div class="sumlabel">Where it went</div>' +
      '<button class="linkbtn" id="toStats">Full breakdown</button></div><div class="chartwrap">' +
      catBarRows(cats, 5) +
      '</div></div>';
  }

  /* repeat the last entry in one tap */
  const allSorted = DB.tx.slice().sort((a, c) => (c.date + (c.time || '')) < (a.date + (a.time || '')) ? -1 : 1);
  const lastTx = allSorted.length ? allSorted[0] : null;
  if (lastTx) {
    html += '<button class="morebtn" id="repeatLast">' + ico('copy') + '  Repeat ' +
      esc(lastTx.note || cat(lastTx.cat).name) + ' · ' + esc(money(lastTx.amt)) + '</button>';
  }

  /* recent */
  html += '<div class="sect">Recent</div>';
  if (!recent.length) {
    html += '<div class="card"><div class="emptystate"><span class="catico">' + ico('wallet') + '</span>' +
      '<b>No transactions yet</b><p>Add your first expense with the + button, or load sample data to see how OneBudget works.</p>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="empAdd">Add an expense</button>' +
      '<button class="btn ghost btnblock" id="empSample">Load sample data</button></div></div></div>';
  } else {
    html += '<div class="card list">' + recent.map(t => txRowHtml(t)).join('') + '</div>' +
      '<button class="morebtn" id="toTx">View all transactions</button>';
  }

  $('#view').innerHTML = html;
  wireMonthNav();
  const ea = $('#empAdd'); if (ea) ea.onclick = () => txSheet(null, 'exp');
  const es = $('#empSample'); if (es) es.onclick = loadSample;
  const ts = $('#toStats'); if (ts) ts.onclick = () => { STATSSEC = 'categories'; go('#/stats'); };
  const tt = $('#toTx'); if (tt) tt.onclick = () => go('#/tx');
  const tr = $('#toTrends'); if (tr) tr.onclick = () => { STATSSEC = 'trends'; go('#/stats'); };
  wireTxRows();
  const qo = $('#qaddOpen'); if (qo) qo.onclick = quickAddSheet;
  wireUpdateCard();
  $$('#view [data-qc]').forEach(b => b.onclick = () => {
    const c = cat(b.dataset.qc);
    txSheet(null, c.kind === 'inc' ? 'inc' : 'exp', todayYmd(), { cat: c.id });
  });
  const rl = $('#repeatLast');
  if (rl) rl.onclick = () => {
    const copy = { ...lastTx, id: uid(), date: todayYmd(), time: new Date().toTimeString().slice(0, 5), updated: Date.now() };
    DB.tx.push(copy);
    save(); pushWidget(); queueSync(); route();
    toast('Added ' + money(copy.amt) + ' · ' + cat(copy.cat).name);
    if (navigator.onLine === false) setTimeout(() => toast('Saved on this device — works offline'), 900);
  };
  $$('#view [data-rec]').forEach(r => r.onclick = () => recurringSheet(r.dataset.rec));
  $$('#view [data-goal]').forEach(r => r.onclick = () => contributeSheet(r.dataset.goal));
  $$('#view [data-acc]').forEach(r => r.onclick = () => accountSheet(r.dataset.acc));
}

function freqLabel(f) { return f === 'weekly' ? 'Weekly' : f === 'yearly' ? 'Yearly' : 'Monthly'; }
function txRowHtml(t) {
  const c = cat(t.cat), a = acct(t.acc);
  return '<div class="txrow" data-tx="' + t.id + '">' + catIconHtml(c) +
    '<div class="txmain"><div class="txtitle">' + esc(t.note || c.name) + '</div>' +
    '<div class="txsub">' + esc(c.name) + ' · ' + esc(fmtDay(t.date)) + (a ? ' · ' + esc(a.name) : '') + '</div></div>' +
    '<div class="txamt"><span class="amt ' + (t.type === 'inc' ? 'inc' : 'exp') + ' num">' + (t.type === 'inc' ? '+' : '-') + esc(money(t.amt, true)) + '</span></div></div>';
}
function wireTxRows() { $$('#view .txrow').forEach(r => r.onclick = () => txDetail(r.dataset.tx)); }

/* ---------- ACTIVITY ---------- */
function renderTx() {
  head('Activity', '');
  let html = monthNav();

  html += '<div class="searchbar">' + ico('search') +
    '<input id="txSearch" placeholder="Search notes and categories" value="' + esc(TXSEARCH) + '"></div>';
  html += '<div class="seg" id="txFilter">' +
    ['all|All', 'exp|Expenses', 'inc|Income'].map(o => {
      const [v, l] = o.split('|');
      return '<button class="segb ' + (TXFILTER === v ? 'on' : '') + '" data-f="' + v + '">' + l + '</button>';
    }).join('') + '</div>';

  html += '<div id="txResults">' + txResultsHtml() + '</div>';

  $('#view').innerHTML = html;
  wireMonthNav();
  const s = $('#txSearch');
  /* typing only refreshes the list below the field: the field itself, its
     caret and the keyboard are left completely alone */
  s.oninput = () => { TXSEARCH = s.value; updateTxResults(); };
  $('#txFilter').querySelectorAll('.segb').forEach(b => b.onclick = () => { TXFILTER = b.dataset.f; renderTx(); });
  wireTxResults();
}

/* the stats, the scope switch and the list — everything that depends on the
   search text, and nothing that does not */
function txResultsHtml() {
  let list, scopeLabel;
  if (TXSCOPE === 'all') {
    list = DB.tx.slice(); scopeLabel = 'all months';
  } else {
    list = txOfMonth(VIEWMONTH); scopeLabel = monthLabel(parseYmd(VIEWMONTH + '-01'));
  }
  if (TXFILTER !== 'all') list = list.filter(t => t.type === TXFILTER);
  if (TXSEARCH.trim()) {
    const q = TXSEARCH.trim().toLowerCase();
    list = list.filter(t => {
      const a = acct(t.acc);
      return (t.note || '').toLowerCase().includes(q) ||
             cat(t.cat).name.toLowerCase().includes(q) ||
             (a && a.name.toLowerCase().includes(q));
    });
  }
  list.sort((a, c) => (c.date + (c.time || '')) < (a.date + (a.time || '')) ? -1 : 1);

  const spent = sumType(list, 'exp'), income = sumType(list, 'inc');
  let html = '<div class="qstats">' +
    '<div class="qstat"><b class="num">' + esc(moneyShort(spent)) + '</b><span>Spent</span></div>' +
    '<div class="qstat"><b class="num">' + esc(moneyShort(income)) + '</b><span>Income</span></div>' +
    '<div class="qstat"><b class="num">' + list.length + '</b><span>Entries</span></div>' +
    '</div>';

  html += '<div class="seg sm compact" id="txScope">' +
    ['month|This month', 'all|All months'].map(o => {
      const [v, l] = o.split('|');
      return '<button class="segb ' + (TXSCOPE === v ? 'on' : '') + '" data-s="' + v + '">' + l + '</button>';
    }).join('') + '</div>';

  if (!list.length) {
    html += '<div class="card"><div class="emptystate"><span class="catico">' + ico('search') + '</span>' +
      '<b>' + (TXSEARCH || TXFILTER !== 'all' ? 'Nothing matches' : 'No transactions') + '</b>' +
      '<p>' + (TXSEARCH || TXFILTER !== 'all' ? 'Try a different search, filter or month.' : 'Tap + to add one, or move to another month.') + '</p></div></div>';
  } else {
    const byDay = {};
    list.forEach(t => { (byDay[t.date] = byDay[t.date] || []).push(t); });
    html += Object.keys(byDay).sort().reverse().map(day => {
      const items = byDay[day], dayTotal = sumType(items, 'exp'), dayInc = sumType(items, 'inc');
      return '<div class="dayhead"><b>' + esc(fmtDay(day)) + '</b><span class="num">' +
        (dayTotal ? '- ' + esc(money(dayTotal, true)) : '') + (dayInc ? ' \u00b7 +' + esc(money(dayInc, true)) : '') + '</span></div>' +
        '<div class="card list">' + items.map(t => txRowHtml(t)).join('') + '</div>';
    }).join('');
  }
  return html;
}
function updateTxResults() {
  const box = $('#txResults');
  if (!box) { renderTx(); return; }
  box.classList.add('noanim');   // no re-entry animation while typing
  box.innerHTML = txResultsHtml();
  wireTxResults();
}
function wireTxResults() {
  const box = $('#txResults');
  if (!box) return;
  const sc = $('#txScope');
  if (sc) sc.querySelectorAll('.segb').forEach(b => b.onclick = () => { TXSCOPE = b.dataset.s; updateTxResults(); });
  box.querySelectorAll('[data-tx]').forEach(r => r.onclick = () => txDetail(r.dataset.tx));
}

/* ---------- BUDGETS ---------- */
/* ---------- INSIGHTS ---------- */
function renderStats() {
  head('Insights', '');
  const key = VIEWMONTH, st = monthStats(key);
  const prevKey = mkey(addMonths(parseYmd(key + '-01'), -1));
  const prev = monthStats(prevKey);

  let html = '<div class="seg subseg" id="stSec">' +
    [['overview', 'Overview'], ['trends', 'Trends'], ['categories', 'Categories'], ['compare', 'Compare']].map(o =>
      '<button class="segb ' + (STATSSEC === o[0] ? 'on' : '') + '" data-s="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';

  if (STATSSEC === 'overview') {
    html += '<div class="kpis">' +
      '<div class="kpi"><div class="klabel">' + ico('down') + 'Spent</div><div class="kval num">' + esc(money(st.spent)) + '</div>' +
        '<div class="kspark">' + sparkline(dailySeries(key).map(d => d.spent)) + '</div></div>' +
      '<div class="kpi"><div class="klabel">' + ico('up') + 'Income</div><div class="kval num">' + esc(money(st.income)) + '</div>' +
        '<div class="ksub">' + (st.income ? Math.round(savingsRate(st)) + '% saved' : 'none recorded') + '</div></div>' +
      '<div class="kpi"><div class="klabel">' + ico('trend') + 'Avg per day</div><div class="kval num">' + esc(money(st.daily)) + '</div>' +
        '<div class="ksub">' + deltaChip(st.daily, prev.daily, true) + '</div></div>' +
      '<div class="kpi"><div class="klabel">' + ico('layers') + 'Transactions</div><div class="kval num">' + st.count + '</div>' +
        '<div class="ksub">' + (prev.count ? 'vs ' + prev.count + ' last month' : 'this month') + '</div></div>' +
      '</div>';

    /* week-by-week */
    const wk = weekSeries(key);
    if (wk.some(w => w.value)) {
      html += '<div class="card"><div class="sumlabel">' + ico('calendar') + 'Week by week</div><div class="chartwrap">' +
        barChart(wk.map(w => ({ label: w.label, value: w.value }))) + '</div></div>';
    }
    /* heatmap */
    html += '<div class="card"><div class="cardhead"><div class="sumlabel">' + ico('grid') + 'Spending calendar</div>' +
      '<span class="trendchip flat">' + esc(moneyShort(st.spent)) + '</span></div>' + monthHeatmap(key) + '</div>';

    /* day of week */
    html += '<div class="card"><div class="sumlabel">' + ico('chart') + 'Which days you spend on</div>' +
      '<div class="sumsub">Average spend per day, last 90 days</div>' + dowBars(90) + '</div>';

    /* payment split */
    const split = accountSplit(key);
    const entries = Object.entries(split).map(([id, v]) => {
      const a = acct(id);
      return { name: a ? a.name : 'Unassigned', value: v, color: a ? a.color : '#8A8A8A' };
    }).sort((x, y) => y.value - x.value);
    if (entries.length) {
      html += '<div class="card tap" data-more="accounts"><div class="sumlabel">' + ico('wallet') + 'Where it was paid from</div>' + donutHtml(entries, moneyShort(st.spent), 'total') + '</div>';
    }

    /* top notes */
    const notes = topNotes(key, 6);
    if (notes.length) {
      html += '<div class="card"><div class="sumlabel">' + ico('list') + 'Most frequent items</div><div class="chartwrap">' +
        hbarList(notes.map(n => ({ name: n.name, value: n.total, color: cat(n.cat).color, sub: n.count + '×' }))) + '</div></div>';
    }

    /* biggest */
    const big = txOfMonth(key).filter(t => t.type === 'exp').sort((a, c) => c.amt - a.amt).slice(0, 5);
    if (big.length) {
      html += '<div class="card"><div class="sumlabel">' + ico('spark') + 'Biggest expenses</div>' +
        big.map(t => '<div class="datarow"><span>' + esc((t.note || cat(t.cat).name).slice(0, 24)) + '</span><b class="num">' + esc(money(t.amt)) + '</b></div>').join('') +
        '</div>';
    }
  }

  if (STATSSEC === 'trends') {
    const months = lastNMonths(12);
    html += '<div class="card"><div class="cardhead"><div class="sumlabel">' + ico('trend') + 'Spending over 12 months</div>' +
      '<span class="trendchip ' + (st.spent >= prev.spent ? 'up' : 'down') + '">' + esc(moneyShort(months.reduce((a, m) => a + m.spent, 0))) + '</span></div>' +
      '<div class="chartwrap">' + lineChart({ series: [{ name: 'Spent', color: 'var(--accent)', values: months.map(m => m.spent), fill: true }], h: 130, labels: [months[0].label, months[5].label, months[11].label] }) + '</div>' +
      '<div class="chartwrap">' + barChart(months.map(m => ({ label: m.label, value: m.spent, cur: m.key === mkey(new Date()) }))) + '</div></div>';

    html += '<div class="card"><div class="sumlabel">' + ico('layers') + 'Income vs spending</div>' +
      '<div class="chartwrap">' + lineChart({ series: [
        { name: 'Spending', color: 'var(--accent)', values: months.map(m => m.spent) },
        { name: 'Income', color: 'var(--ok)', values: months.map(m => m.income) },
      ], h: 140, labels: [months[0].label, months[5].label, months[11].label] }) + '</div></div>';

    html += '<div class="card"><div class="cardhead"><div class="sumlabel">' + ico('trend') + 'Pace this month</div>' +
      '<span class="trendchip flat">' + esc(moneyShort(st.spent)) + '</span></div>' +
      '<div class="sumsub">Cumulative spend against ' + esc(MON3[parseYmd(prevKey + '-01').getMonth()]) + '</div>' +
      '<div class="chartwrap">' + lineChart({ series: [
        { name: 'This month', color: 'var(--accent)', values: cumulativeSeries(key), fill: true },
        { name: MON3[parseYmd(prevKey + '-01').getMonth()], color: 'var(--text2)', values: cumulativeSeries(prevKey), dash: true },
      ], h: 130, labels: ['1', '10', '20', String(st.dim)] }) + '</div></div>';

    html += '<div class="card"><div class="sumlabel">' + ico('grid') + 'Last 12 weeks</div>' + stripHeatmap(12) + '</div>';

    const netMonths = months.map(m => ({ label: m.label, value: Math.max(0, m.net), cur: m.key === mkey(new Date()) }));
    html += '<div class="card"><div class="sumlabel">' + ico('piggy') + 'Saved per month</div><div class="chartwrap">' + barChart(netMonths) + '</div></div>';
  }

  if (STATSSEC === 'categories') {
    const cats = sortedCats(txOfMonth(key), 'exp');
    if (!cats.length) {
      html += '<div class="card"><div class="emptystate"><span class="catico">' + ico('chart') + '</span><b>Nothing to chart yet</b><p>Add a few expenses and this page fills with category breakdowns and trends.</p></div></div>';
    } else {
      const total = cats.reduce((a, c) => a + c[1], 0);
      html += '<div class="card"><div class="sumlabel">' + ico('layers') + 'Split · ' + esc(monthLabel(parseYmd(key + '-01'))) + '</div>' +
        donutHtml(cats.map(([id, v]) => ({ name: cat(id).name, value: v, color: cat(id).color })), moneyShort(total), cats.length + ' categories') + '</div>';

      html += '<div class="card"><div class="sumlabel">' + ico('chart') + 'All categories</div><div class="chartwrap">' +
        catBarRows(cats, cats.length) + '</div></div>';

      html += '<div class="card"><div class="sumlabel">' + ico('trend') + 'Category trends</div>' +
        '<div class="sumsub">Last 6 months, per category</div><div class="chartwrap">' +
        cats.slice(0, 6).map(([id]) => {
          const c = cat(id);
          const hist = lastNMonths(6).map(m => txOfMonth(m.key).filter(t => t.type === 'exp' && t.cat === id).reduce((a, t) => a + (+t.amt || 0), 0));
          const sum = hist.reduce((a, v) => a + v, 0);
          return '<div class="barow"><div class="barline"><span class="bname"><i style="background:' + c.color + '"></i><span>' + esc(c.name) + '</span></span>' +
            '<b class="num">' + esc(money(sum)) + '</b></div>' +
            '<div style="height:34px">' + sparkline(hist, c.color, 34) + '</div></div>';
        }).join('') + '</div></div>';

    }
  }

  if (STATSSEC === 'compare') {
    if (!st.count && !prev.count) {
      html += '<div class="card"><div class="emptystate"><span class="catico">' + ico('layers') + '</span>' +
        '<b>Nothing to compare yet</b><p>Once you have a month of spending, this page compares it with the month before and the same month last year.</p></div></div>';
      $('#view').innerHTML = html;
      $('#stSec').querySelectorAll('.segb').forEach(b => b.onclick = () => { STATSSEC = b.dataset.s; renderStats(); });
      return;
    }
    const y = new Date().getFullYear();
    const sameLastYear = key.slice(0, 4) + '-01';
    const prevYear = monthStats(sameLastYear);
    const cats = sortedCats(txOfMonth(key), 'exp');
    const prevCats = byCat(txOfMonth(prevKey), 'exp');
    const big = txOfMonth(key).filter(t => t.type === 'exp').sort((a, c) => c.amt - a.amt)[0];

    html += '<div class="card"><div class="cmphead"><span class="cname">Metric</span><span class="cval">This</span><span class="cdelta">Change</span></div>' +
      cmpRow('Spent', money(st.spent), deltaChip(st.spent, prev.spent, true)) +
      cmpRow('Income', money(st.income), deltaChip(st.income, prev.income)) +
      cmpRow('Saved', money(st.net), deltaChip(st.net, prev.net)) +
      cmpRow('Avg per day', money(st.daily), deltaChip(st.daily, prev.daily, true)) +
      cmpRow('Transactions', String(st.count), deltaChip(st.count, prev.count, true)) +
      cmpRow('Savings rate', Math.round(savingsRate(st)) + '%', '<span class="trendchip flat">' + Math.round(savingsRate(prev)) + '% last</span>') +
      '</div>';

    html += '<div class="card"><div class="sumlabel">' + ico('calendar') + 'Same month last year</div>' +
      '<div class="cmphead" style="margin-top:12px"><span class="cname">Metric</span><span class="cval">This month</span><span class="cdelta">Change</span></div>' +
      cmpRow('Spent', money(st.spent), deltaChip(st.spent, prevYear.spent, true)) +
      cmpRow('Income', money(st.income), deltaChip(st.income, prevYear.income)) +
      '</div>';

    if (cats.length) {
      html += '<div class="card"><div class="sumlabel">' + ico('layers') + 'Category movement</div>' +
        '<div class="cmphead" style="margin-top:12px"><span class="cname">Category</span><span class="cval">This month</span><span class="cdelta">Change</span></div>' +
        cats.slice(0, 8).map(([id, v]) => cmpRow(cat(id).name, money(v), deltaChip(v, prevCats[id] || 0, true))).join('') +
        '</div>';
    }

    const note = [];
    if (prev.spent > 0) {
      const d = Math.round(((st.spent - prev.spent) / prev.spent) * 100);
      note.push(d >= 0 ? 'You are spending ' + d + '% more than last month.' : 'You are spending ' + Math.abs(d) + '% less than last month.');
    }
    if (cats.length) note.push(cat(cats[0][0]).name + ' is your biggest category at ' + money(cats[0][1]) + '.');
    if (big) note.push('Your single biggest expense was ' + money(big.amt) + (big.note ? ' (' + big.note + ')' : '') + '.');
    const wb2 = dowStats(90); const busiest = wb2.reduce((a, s) => s.avg > a.avg ? s : a, wb2[0]);
    if (busiest && busiest.avg > 0) note.push('You spend the most on ' + DOW[busiest.dow] + 's on average.');
    if (st.income > 0) note.push('You saved ' + Math.round(savingsRate(st)) + '% of your income this month.');
    if (note.length) {
      html += '<div class="card"><div class="sumlabel">' + ico('spark') + 'What this says</div>' +
        note.map(n => '<div class="datarow"><span style="text-align:left;line-height:1.5">' + esc(n) + '</span></div>').join('') + '</div>';
    }
  }

  $('#view').innerHTML = html;
  $('#stSec').querySelectorAll('.segb').forEach(b => b.onclick = () => { STATSSEC = b.dataset.s; renderStats(); });
  $$('#view [data-goal]').forEach(r => r.onclick = () => contributeSheet(r.dataset.goal));
}
function cmpRow(name, val, delta) {
  return '<div class="cmprow"><span class="cname">' + esc(name) + '</span><span class="cval num">' + esc(val) + '</span><span class="cdelta">' + delta + '</span></div>';
}

/* ---------- SETTINGS ---------- */
function renderSettings() {
  head('Settings', '');
  const st = DB.settings;
  const synced = !!DB.sync.login;
  let html = '';

  html += '<div class="sect">Appearance</div><div class="card setcard">' +
    '<div class="lrow" id="rowTheme"><div class="lmain"><div class="ltitle">Theme</div>' +
    '<div class="lsub">' + (st.theme === 'auto' ? 'Follows your phone' : st.theme === 'dark' ? 'Dark' : st.theme === 'pitch' ? 'Pitch black' : 'Light') + '</div></div>' +
    '<span class="rval">' + (st.theme === 'dark' || st.theme === 'pitch' ? ico('moon') : st.theme === 'auto' ? ico('phone') : ico('sun')) + ico('chevR') + '</span></div>' +
    '<div class="lrow" style="display:block"><div class="ltitle" style="margin-bottom:9px">Accent colour</div>' +
    '<div class="accentrow" id="accRow" style="margin-top:0">' +
      Object.keys(ACCENT_PRESETS).map(k =>
        '<button class="accentdot ' + (st.accent === k ? 'on' : '') + '" data-a="' + k + '" style="background:' + ACCENT_PRESETS[k] + '"></button>').join('') +
      '<button class="accentdot customdot ' + (st.accent === 'custom' ? 'on' : '') + '" data-a="custom"' +
        (st.accent === 'custom' && st.accentHex ? ' style="background:' + esc(st.accentHex) + '"' : '') +
        ' title="Custom colour"></button>' +
    '</div>' +
    '<button class="lrow" id="rowCustom" style="width:100%;padding:11px 16px;border-radius:0">' +
      '<div class="lmain"><div class="ltitle">Custom colour</div>' +
      '<div class="lsub">' + (st.accent === 'custom' && st.accentHex ? esc(st.accentHex) + ' · hex code' : 'Pick any hex colour') + '</div></div>' +
      '<span class="rval">' + ico('chevR') + '</span></button>' +
    '</div>' +
    '<div class="lrow"><div class="lmain"><div class="ltitle">Glow effects</div><div class="lsub">Glow on cards and the nav bar</div></div>' +
    '<button class="switch ' + (st.glow !== false ? 'on' : '') + '" id="swGlow"></button></div>' +
    '<div class="lrow"><div class="lmain"><div class="ltitle">Reduce motion</div><div class="lsub">Turn off animations</div></div>' +
    '<button class="switch ' + (st.reduceMotion ? 'on' : '') + '" id="swMotion"></button></div>' +
    '<div class="lrow"><div class="lmain"><div class="ltitle">One-hand mode</div>' +
    '<div class="lsub">' + (st.oneHand ? 'Everything tighter, actions at the bottom' : 'Comfortable spacing') + '</div></div>' +
    '<button class="switch ' + (st.oneHand ? 'on' : '') + '" id="swOneHand"></button></div>' +
    '<div class="lrow"><div class="lmain"><div class="ltitle">Material icons</div>' +
    '<div class="lsub">' + (st.materialIcons ? 'Icons sit in organic shapes that morph' : 'Round chips instead of shapes') + '</div></div>' +
    '<button class="switch ' + (st.materialIcons ? 'on' : '') + '" id="swMat"></button></div>' +
    (st.materialIcons ? '<button class="lrow" id="rowShuffle" style="width:100%;border-radius:0">' +
      '<div class="lmain"><div class="ltitle">Shuffle shapes</div><div class="lsub">Give every category a different shape</div></div>' +
      '<span class="rval">' + ico('refresh') + '</span></button>' : '') +
    '</div>';

  html += '<div class="sect">Money</div><div class="card setcard">' +
    '<div class="lrow" id="rowCur"><div class="lmain"><div class="ltitle">Currency</div><div class="lsub">' + esc((st.code || '') + ' · ' + st.currency) + '</div></div>' +
    '<span class="rval"><b style="font-size:15px">' + esc(st.currency) + '</b>' + ico('chevR') + '</span></div>' +
    '</div>';

  html += '<div class="sect">Trackers</div><div class="card setcard">' +
    '<div class="lrow" data-go="#/cats"><div class="lmain"><div class="ltitle">Categories</div>' +
    '<div class="lsub">' + DB.cats.filter(c => c.kind === 'exp').length + ' expense · ' + DB.cats.filter(c => c.kind === 'inc').length + ' income</div></div>' +
    '<span class="rval">' + ico('chevR') + '</span></div>' +
    '<div class="lrow" data-go="#/accounts"><div class="lmain"><div class="ltitle">Accounts</div>' +
    '<div class="lsub">' + DB.accounts.length + ' accounts · balances</div></div><span class="rval">' + ico('chevR') + '</span></div>' +
    '<div class="lrow" data-go="#/goals"><div class="lmain"><div class="ltitle">Savings goals</div>' +
    '<div class="lsub">' + DB.goals.length + ' goals</div></div><span class="rval">' + ico('chevR') + '</span></div>' +
    '</div>';

  html += '<div class="sect">Backup &amp; sync</div><div class="card">' +
    (synced
      ? '<button class="synccard" id="rowSync"><span class="avatar">' + (DB.sync.avatar ? '<img src="' + esc(DB.sync.avatar) + '" alt="">' : esc((DB.sync.login || '?')[0].toUpperCase())) + '</span>' +
        '<div style="flex:1;min-width:0"><div class="sname">' + esc(DB.sync.login) + '</div>' +
        '<div class="smeta">' + (DB.sync.lastSync ? 'Last backup ' + esc(tAgo(DB.sync.lastSync)) : 'Not backed up yet') + '</div></div>' +
        '<span class="rval">' + ico('chevR') + '</span></button>' +
        '<button class="btn primary btnblock" id="syncNow" style="margin-top:10px">Sync now</button>'
      : '<div class="emptystate" style="padding:16px 10px 14px"><span class="catico">' + ico('cloud') + '</span>' +
        '<b>Using OneBudget without an account</b>' +
        '<p>Everything is stored on this phone and works offline. Sign in only if you want a private backup on GitHub that you can restore on another device.</p>' +
        '<div class="rowgap"><button class="btn primary btnblock" id="doSignIn">Set up backup</button></div></div>') +
    '</div>';

  html += '<div class="sect">Templates</div><div class="card setcard">' +
    '<div class="lrow" id="rowTpl"><div class="lmain"><div class="ltitle">Saved templates</div>' +
    '<div class="lsub">' + (DB.templates.length ? DB.templates.length + ' saved · one tap to reuse' : 'Save a frequent entry from the keypad') + '</div></div>' +
    '<span class="rval">' + ico('chevR') + '</span></div></div>';

  html += '<div class="sect">Today &amp; AI</div><div class="card setcard">' +
    '<div class="lrow" id="rowAi"><div class="lmain"><div class="ltitle">AI assistant</div>' +
    '<div class="lsub">' + (DB.settings.ai && DB.settings.ai.url && DB.settings.ai.key ? 'using your own model' : 'on-device summary · works offline') + '</div></div>' +
    '<span class="rval">' + ico('chevR') + '</span></div>' +
    '<div class="lrow" data-go="#/recurring"><div class="lmain"><div class="ltitle">Recurring bills</div>' +
    '<div class="lsub">' + DB.recurring.length + ' bills · ' + esc(money(recurringMonthlyTotal())) + '/mo</div></div>' +
    '<span class="rval">' + ico('chevR') + '</span></div>' +
    '</div>';

  html += '<div class="sect">About</div><div class="card setcard">' +
    '<div class="lrow" id="rowUpd"><div class="lmain"><div class="ltitle">OneBudget ' + esc('v' + APPV) + '</div>' +
    '<div class="lsub">' + (UPD_FOUND ? 'an update is available' : (DB.settings.updCheckedAt ? 'up to date · checked ' + esc(tAgo(DB.settings.updCheckedAt)) : 'check for a newer build on GitHub')) + '</div></div>' +
    '<span class="rval">' + (UPD_FOUND ? '<span class="chip" style="background:var(--accent);color:var(--accentText,#fff)">Update</span>' : '') + ico('chevR') + '</span></div>' +
    '</div>';

  html += '<div class="sect">Offline</div><div class="card setcard">' +
    '<div class="lrow"><div class="lmain"><div class="ltitle">Everything is on this device</div>' +
    '<div class="lsub">' + esc(storageLabel()) + ' · ' + (PERSISTED ? 'kept even when storage runs low' : 'local storage') + '</div></div>' +
    '<span class="rval"><span class="saveddot"></span>' + (navigator.onLine === false ? 'Offline' : 'Local') + '</span></div>' +
    '<div class="lrow" id="rowRestore"><div class="lmain"><div class="ltitle">Restore an earlier copy</div>' +
    '<div class="lsub">Daily snapshots, kept offline</div></div>' +
    '<span class="rval">' + ico('chevR') + '</span></div>' +
    '</div>';

  html += '<div class="sect">Your data</div><div class="card setcard">' +
    '<div class="lrow"><div class="lmain"><div class="ltitle">On-device storage</div>' +
    '<div class="lsub">' + (navigator.onLine === false ? 'Offline — new entries still save here' : 'Saved on this phone · last saved ' + (LASTSAVE ? esc(tAgo(LASTSAVE)) : 'just now')) + '</div></div>' +
    '<span class="rval"><span class="saveddot"></span>' + (navigator.onLine === false ? 'Offline' : 'Local') + '</span></div>' +
    '<div class="lrow" data-go="#/data"><div class="lmain"><div class="ltitle">Export &amp; import</div>' +
    '<div class="lsub">JSON backup or a CSV of every transaction</div></div><span class="rval">' + ico('chevR') + '</span></div>' +
    '<div class="lrow" id="rowRecap"><div class="lmain"><div class="ltitle">Month in review</div>' +
    '<div class="lsub">A summary you can copy and share</div></div><span class="rval">' + ico('chevR') + '</span></div>' +
    '<div class="lrow" id="rowSample"><div class="lmain"><div class="ltitle">Load sample data</div>' +
    '<div class="lsub">Fill the app with examples</div></div><span class="rval">' + ico('chevR') + '</span></div>' +
    '<div class="lrow" id="rowWipe"><div class="lmain"><div class="ltitle" style="color:var(--danger)">Erase all data</div>' +
    '<div class="lsub">Delete all transactions and categories</div></div><span class="rval">' + ico('chevR') + '</span></div>' +
    '</div>';

  html += '<div class="about">OneBudget · local-first expense tracker<br>One UI design system · no account required</div>';

  $('#view').innerHTML = html;
  $('#rowTheme').onclick = themeSheet;
  $('#rowCur').onclick = currencySheet;
  $('#rowRecap').onclick = recapSheet;
  $('#accRow').querySelectorAll('.accentdot').forEach(b => b.onclick = () => {
    if (b.dataset.a === 'custom') { customColorSheet(); return; }
    DB.settings.accent = b.dataset.a; save(); applyTheme(); renderSettings();
  });
  $('#rowCustom').onclick = customColorSheet;
  $('#rowAi').onclick = aiSheet;
  $('#rowRestore').onclick = restoreSheet;
  $('#rowUpd').onclick = async () => { if (!UPD_FOUND && !UPD_CHECKED) await checkUpdate(true); updatesSheet(UPD_FOUND); };
  $('#rowTpl').onclick = templatesSheet;
  $('#swGlow').onclick = () => { DB.settings.glow = !(DB.settings.glow !== false); save(); applyTheme(); renderSettings(); };
  $('#swMotion').onclick = () => { DB.settings.reduceMotion = !DB.settings.reduceMotion; save(); applyTheme(); renderSettings(); };
  $('#swOneHand').onclick = () => {
    DB.settings.oneHand = !DB.settings.oneHand;
    save(); applyTheme(); renderSettings();
    toast(DB.settings.oneHand ? 'One-hand mode on' : 'One-hand mode off');
  };
  $('#swMat').onclick = () => {
    DB.settings.materialIcons = !DB.settings.materialIcons;
    if (DB.settings.materialIcons && DB.settings.materialSeed == null) DB.settings.materialSeed = Math.floor(Math.random() * 100000);
    save(); renderSettings();
    toast(DB.settings.materialIcons ? 'Material icons on' : 'Back to round chips');
  };
  const rsh = $('#rowShuffle'); if (rsh) rsh.onclick = shuffleShapes;
  const si = $('#doSignIn'); if (si) si.onclick = syncSheet;
  const rs = $('#rowSync'); if (rs) rs.onclick = syncSheet;
  const sn = $('#syncNow'); if (sn) sn.onclick = () => syncPush(false);
  const so = $('#swSyncOn'); if (so) so.onclick = syncSheet;
  $('#rowSample').onclick = loadSample;
  $('#rowWipe').onclick = () => {
    sheet(sheetHead('Erase all data') +
      '<p class="hint" style="font-size:14px;color:var(--text)">This deletes every transaction, goal, recurring bill and custom category on this device. It cannot be undone.</p>' +
      '<div class="rowgap"><button class="btn danger btnblock" id="wipeYes">Erase everything</button>' +
      '<button class="btn ghost btnblock" onclick="closeSheet()">Cancel</button></div>');
    $('#wipeYes').onclick = () => {
      const sync = DB.sync;
      DB = freshDB(); DB.sync = sync; save();
      closeSheet(); toast('All data erased'); queueSync(); route();
    };
  };
}
function customColorSheet() {
  const st = DB.settings;
  let hex = (st.accent === 'custom' && st.accentHex) ? st.accentHex : accentHex();
  const paint = () => {
    const ok = !!hexToRgb(hex);
    sheet(sheetHead('Custom accent colour') +
      '<div class="ccprev" style="background:' + (ok ? hex : '#888') + ';color:' + contrastText(hex) + '">' +
        '<span>Preview</span><b>' + esc(hex.toUpperCase()) + '</b></div>' +
      '<label class="fldlabel" style="margin-top:16px">Pick a colour</label>' +
      '<input type="color" id="ccPick" value="' + (ok ? hex : '#1B6EF3') + '" class="ccpick">' +
      '<label class="fldlabel" style="margin-top:16px">Or type a hex code</label>' +
      '<div class="inline"><input id="ccHex" class="fld" placeholder="#1B6EF3" value="' + esc(hex) + '" maxlength="7" spellcheck="false" autocomplete="off">' +
      '<button class="btn ghost" id="ccUse" style="min-width:88px">Use</button></div>' +
      '<div class="sect" style="margin:20px 6px 8px">Suggestions</div>' +
      '<div class="accentrow" id="ccSuggest">' +
        ['#0EA5E9', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#CA8A04', '#059669', '#0D9488', '#4F46E5', '#334155']
          .map(c => '<button class="accentdot" data-c="' + c + '" style="background:' + c + ';width:38px;height:38px"></button>').join('') +
      '</div>' +
      '<p class="hint">Any 6-digit hex works, for example #7C3AED. Text on the accent switches between light and dark automatically so buttons stay readable.</p>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="ccApply"' + (ok ? '' : ' disabled') + '>Apply colour</button>' +
      '<button class="btn ghost btnblock" onclick="closeSheet()">Cancel</button></div>');
    const pick = $('#ccPick'), txt = $('#ccHex');
    pick.oninput = () => { hex = pick.value; const p = $('#ccprev'); if (p) { p.style.background = hex; p.style.color = contrastText(hex); p.querySelector('b').textContent = hex.toUpperCase(); } txt.value = hex; $('#ccApply').disabled = false; };
    txt.oninput = () => { const v = txt.value.trim(); if (!v.startsWith('#')) { txt.value = '#' + v.replace('#', ''); } hex = txt.value.trim(); const ok2 = !!hexToRgb(hex); const p = $('#ccprev'); if (p && ok2) { p.style.background = hex; p.style.color = contrastText(hex); p.querySelector('b').textContent = hex.toUpperCase(); } if (ok2) pick.value = hex; const a = $('#ccApply'); if (a) a.disabled = !ok2; };
    $('#ccUse').onclick = () => { const v = txt.value.trim(); if (!hexToRgb(v)) { toast('That is not a hex colour'); return; } hex = v; $('#ccApply').disabled = false; };
    $('#ccSuggest').querySelectorAll('.accentdot').forEach(b => b.onclick = () => { hex = b.dataset.c; txt.value = hex; pick.value = hex; const p = $('#ccprev'); if (p) { p.style.background = hex; p.style.color = contrastText(hex); p.querySelector('b').textContent = hex.toUpperCase(); } $('#ccApply').disabled = false; });
    $('#ccApply').onclick = () => {
      if (!hexToRgb(hex)) { toast('That is not a hex colour'); return; }
      DB.settings.accent = 'custom';
      DB.settings.accentHex = hex.toLowerCase();
      save(); applyTheme(); pushWidget(); closeSheet(); toast('Accent set to ' + hex.toUpperCase());
      if (currentRoute().render === renderSettings) renderSettings();
    };
  };
  paint();
}

function themeSheet() {
  const st = DB.settings;
  const opts = [['auto', 'Follow phone', 'phone'], ['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['pitch', 'Pitch black', 'moon']];
  sheet(sheetHead('Theme') + '<div class="card list" style="padding:6px 0">' +
    opts.map(o => '<div class="lrow" data-t="' + o[0] + '">' +
      '<span class="rval" style="margin:0;color:var(--text)">' + ico(o[2]) + '</span>' +
      '<div class="lmain"><div class="ltitle">' + o[1] + '</div></div>' +
      (st.theme === o[0] ? '<span class="rval" style="color:var(--accent)">' + ico('check') + '</span>' : '') + '</div>').join('') + '</div>');
  $('#sheet').querySelectorAll('.lrow').forEach(r => r.onclick = () => {
    DB.settings.theme = r.dataset.t; save(); applyTheme(); closeSheet(); renderSettings();
  });
}

/* ---------- manage lists ---------- */
function renderCats() {
  head('Categories', '');
  const row = c => '<div class="lrow" data-cat="' + c.id + '">' + catIconHtml(c) +
    '<div class="lmain"><div class="ltitle">' + esc(c.name) + '</div>' +
    '<div class="lsub">' + DB.tx.filter(t => t.cat === c.id).length + ' transactions' +
    '</div></div>' +
    '<span class="rval">' + ico('chevR') + '</span></div>';
  $('#view').innerHTML =
    '<div class="sect" style="margin-top:8px">Expense</div><div class="card list">' + DB.cats.filter(c => c.kind === 'exp').map(row).join('') + '</div>' +
    '<button class="morebtn" id="newCatE">Add expense category</button>' +
    '<div class="sect">Income</div><div class="card list">' + DB.cats.filter(c => c.kind === 'inc').map(row).join('') + '</div>' +
    '<button class="morebtn" id="newCatI">Add income category</button>';
  $$('#view [data-cat]').forEach(r => r.onclick = () => catEditSheet(r.dataset.cat));
  $('#newCatE').onclick = () => catEditSheet(null);
  $('#newCatI').onclick = () => { catEditSheet(null); const b = $$('#ctKind button')[1]; if (b) b.click(); };
}
function renderAccounts() {
  head('Accounts', '');
  const list = accountBalances();
  $('#view').innerHTML =
    '<p class="hint" style="margin:2px 4px 10px">Balances start from each account\u2019s opening balance and follow every transaction you record.</p>' +
    '<div class="card list">' + list.map(a =>
      '<div class="walletrow" data-acc="' + a.id + '">' + catIconHtml(a) +
      '<div class="walletmain"><div class="wallettop">' + esc(a.name) + '</div>' +
      '<div class="walletsub">' + esc(money(a.income)) + ' in · ' + esc(money(a.spent)) + ' out · ' + a.count + ' entries</div></div>' +
      '<span class="walletbal num" style="color:' + (a.balance < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(a.balance)) + '</span></div>').join('') + '</div>' +
    (list.length ? '<div class="card"><div class="sumlabel">' + ico('layers') + 'Where money sits</div>' + donutHtml(
      list.filter(a => a.balance > 0).map(a => ({ name: a.name, value: a.balance, color: a.color })),
      moneyShort(list.reduce((s, a) => s + Math.max(0, a.balance), 0)), 'total') + '</div>' : '') +
    '<button class="morebtn" id="newAcc">Add an account</button>';
  $$('#view [data-acc]').forEach(r => r.onclick = () => accountSheet(r.dataset.acc));
  $('#newAcc').onclick = () => accountSheet(null);
}
function renderBills() {
  head('Recurring bills', '');
  const monthly = recurringMonthlyTotal();
  const sorted = DB.recurring.slice().sort((a, c) => String(a.nextDue || '').localeCompare(String(c.nextDue || '')));
  $('#view').innerHTML =
    (sorted.length
      ? '<div class="sumcard"><div class="sumlabel">Monthly cost of subscriptions and bills</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(monthly)) + '</div>' +
        '<div class="sumsub">' + esc(money(monthly * 12)) + ' a year · ' + sorted.filter(r => r.active).length + ' active bills</div>' +
        '<div class="chartwrap">' + hbarList(sorted.filter(r => r.active).slice(0, 6).map(r => ({ name: r.name, value: monthlyEquiv(r), color: cat(r.cat).color })), { showPct: false }) + '</div></div>'
      : '<div class="card"><div class="emptystate"><span class="catico">' + ico('repeat') + '</span><b>No recurring bills</b>' +
        '<p>Rent, subscriptions, EMIs, insurance — add them once and OneBudget keeps track of the total and what is due next.</p></div></div>') +
    (sorted.length ? '<div class="card list">' + sorted.map(r => {
      const c = cat(r.cat), n = daysUntil(r.nextDue);
      return '<div class="recrow" data-rec="' + r.id + '">' + catIconHtml(c) +
        '<div class="recmain"><div class="rectop">' + esc(r.name) + '</div>' +
        '<div class="recsub">' + esc(c.name) + ' · ' + esc(freqLabel(r.freq)) + ' · ' + esc(money(monthlyEquiv(r))) + '/mo' + '</div></div>' +
        '<div class="recamt"><span class="amt num">' + esc(money(r.amt)) + '</span>' +
        '<span class="duechip ' + (r.active === false ? 'paused' : n != null && n < 0 ? 'today' : n != null && n <= 3 ? 'soon' : '') + '">' +
        (r.active === false ? 'Paused' : esc(dueLabel(r.nextDue))) + '</span></div></div>';
    }).join('') + '</div>' : '') +
    '<button class="morebtn" id="newRec">Add a recurring bill</button>';
  $$('#view [data-rec]').forEach(r => r.onclick = () => recurringSheet(r.dataset.rec));
  $('#newRec').onclick = () => recurringSheet(null);
}
function renderGoals() {
  head('Savings goals', '');
  const totalTarget = DB.goals.reduce((a, g) => a + (+g.target || 0), 0);
  const totalSaved = DB.goals.reduce((a, g) => a + (+g.saved || 0), 0);
  $('#view').innerHTML =
    (DB.goals.length
      ? '<div class="sumcard"><div class="sumlabel">Across ' + DB.goals.length + ' goals</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(totalSaved)) + '</div>' +
        '<div class="sumsub">of ' + esc(money(totalTarget)) + ' targeted · ' + (totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0) + '% there</div></div>' +
        '<div class="card list">' + DB.goals.map(g => {
          const i = goalInfo(g);
          return '<div class="goalcard" data-goal="' + g.id + '">' +
            '<div class="goalring" style="--p:' + i.pct + ';--gc:' + g.color + '"><b>' + Math.round(i.pct) + '%</b></div>' +
            '<div class="goalmain"><div class="goaltop"><span>' + esc(g.name) + '</span><b class="num">' + esc(money(i.saved)) + '</b></div>' +
            '<div class="goalsub">' + (i.done ? 'Goal reached' : esc(money(i.left)) + ' to go' + (i.eta ? ' · ~' + i.eta + ' months' : '') + (g.deadline ? ' · by ' + esc(fmtDay(g.deadline)) : '')) + '</div></div>' +
            '<span class="rval">' + ico('chevR') + '</span></div>';
        }).join('') + '</div>'
      : '<div class="card"><div class="emptystate"><span class="catico">' + ico('piggy') + '</span><b>No savings goals yet</b>' +
        '<p>Give your savings a purpose. Set a target and add to it whenever you put money aside.</p></div></div>') +
    '<button class="morebtn" id="newGoal">Create a goal</button>';
  $$('#view [data-goal]').forEach(r => r.onclick = () => contributeSheet(r.dataset.goal));
  $('#newGoal').onclick = () => goalSheet(null);
}

/* ---------- data ---------- */
function renderData() {
  head('Export & import', '');
  const json = exportJSON();
  $('#view').innerHTML =
    '<div class="card"><div class="sumlabel">' + ico('download') + 'Backup (JSON)</div>' +
    '<p class="hint" style="margin:12px 2px 14px">Everything — transactions, goals, bills, accounts, categories and settings.</p>' +
    '<div class="rowgap"><button class="btn primary btnblock" id="expFile">Save backup file</button>' +
    '<button class="btn ghost btnblock" id="expCopy">Copy JSON</button>' +
    '<button class="btn ghost btnblock" id="expShow">Show JSON</button></div></div>' +
    '<div class="card"><div class="sumlabel">' + ico('list') + 'Transactions (CSV)</div>' +
    '<p class="hint" style="margin:12px 2px 14px">A spreadsheet of every transaction — opens in Excel, Sheets or Numbers.</p>' +
    '<div class="rowgap"><button class="btn ghost btnblock" id="expCsv">Save CSV file</button>' +
    '<button class="btn ghost btnblock" id="expCsvCopy">Copy CSV</button></div></div>' +
    '<div class="card"><div class="sumlabel">' + ico('upload') + 'Restore</div>' +
    '<p class="hint" style="margin:12px 2px 14px">Paste a backup below, or pick a .json file. Restoring replaces everything currently in the app.</p>' +
    '<textarea class="jsonbox" id="impText" placeholder="Paste backup JSON here"></textarea>' +
    '<div class="rowgap"><button class="btn primary btnblock" id="impRun">Restore from text</button>' +
    '<label class="btn ghost btnblock" style="margin:0">Pick a .json file<input type="file" id="impFile" accept=".json,application/json" hidden></label></div></div>' +
    '<p class="about">Transactions: ' + DB.tx.length + ' · Categories: ' + DB.cats.length + ' · Accounts: ' + DB.accounts.length + ' · Bills: ' + DB.recurring.length + ' · Goals: ' + DB.goals.length + '</p>';

  const save = (name, content, mime) => {
    if (window.OneBudget && OneBudget.saveFile) { OneBudget.saveFile(name, content); toast('Saved to Downloads'); }
    else {
      const blob = new Blob([content], { type: mime || 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      toast('Saved ' + name);
    }
  };
  $('#expFile').onclick = () => save('onebudget-backup-' + todayYmd() + '.json', json, 'application/json');
  $('#expCopy').onclick = () => { copyText(json); toast('JSON copied'); };
  $('#expShow').onclick = () => sheet(sheetHead('Backup JSON') + '<textarea class="jsonbox" style="min-height:300px" readonly>' + esc(json) + '</textarea>');
  $('#expCsv').onclick = () => save('onebudget-transactions-' + todayYmd() + '.csv', exportCSV(), 'text/csv');
  $('#expCsvCopy').onclick = () => { copyText(exportCSV()); toast('CSV copied'); };
  $('#impRun').onclick = () => importJSON($('#impText').value);
  $('#impFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => importJSON(String(r.result));
    r.readAsText(f);
  };
}
function exportCSVRows(set) {
  const head = ['Date', 'Time', 'Type', 'Category', 'Note', 'Amount', 'Account'];
  const rows = set.map(t =>
    [t.date, t.time || '', t.type === 'inc' ? 'Income' : 'Expense', cat(t.cat).name, (t.note || '').replace(/"/g, '""'), (+t.amt || 0).toFixed(2), (acct(t.acc) || {}).name || '']
      .map(v => /[",\n]/.test(String(v)) ? '"' + v + '"' : v).join(','));
  return head.join(',') + '\n' + rows.join('\n');
}
function exportCSV() {
  return exportCSVRows(DB.tx.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))));
}
function exportJSON() {
  const clean = { ...DB, sync: { ...DB.sync, token: '' } };
  return JSON.stringify(clean, null, 1);
}
function importJSON(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { toast('That is not valid JSON'); return; }
  if (!obj || !Array.isArray(obj.tx)) { toast('This does not look like a OneBudget backup'); return; }
  sheet(sheetHead('Restore backup') +
    '<p class="hint" style="font-size:14px;color:var(--text)">This backup has <b>' + obj.tx.length + ' transactions</b> and <b>' +
    (obj.cats ? obj.cats.length : 0) + ' categories</b>. Restoring replaces everything currently in the app.</p>' +
    '<div class="rowgap"><button class="btn primary btnblock" id="impYes">Restore now</button>' +
    '<button class="btn ghost btnblock" onclick="closeSheet()">Cancel</button></div>');
  $('#impYes').onclick = () => {
    const sync = DB.sync, fresh = freshDB();
    DB = { ...fresh, ...obj,
      sync: { ...fresh.sync, ...(obj.sync || {}), token: sync.token || (obj.sync || {}).token || '', gistId: sync.gistId || (obj.sync || {}).gistId || '' },
      settings: { ...fresh.settings, ...(obj.settings || {}) },
    };
    if (!Array.isArray(DB.cats) || !DB.cats.length) DB.cats = fresh.cats;
    if (!Array.isArray(DB.accounts) || !DB.accounts.length) DB.accounts = fresh.accounts;
    if (!Array.isArray(DB.recurring)) DB.recurring = [];
    if (!Array.isArray(DB.goals)) DB.goals = [];
    save(); applyTheme(); closeSheet(); toast('Backup restored'); queueSync(); route();
  };
}

/* ---------- sync ---------- */

/* ============================================================
   APP UPDATES (GitHub releases)
   Same approach as Gitly: read the releases on the repo, and
   treat a release as newer if its version beats this build's OR
   if it was published after this build was installed. That second
   rule means a release counts even when the version was not bumped.
   The repo is public, so this needs no sign-in.
   ============================================================ */
const UPD_REPO = 'BonkerUnkilBonki/OneBudget';
const APPV = (window.OneBudget && OneBudget.appVersion ? String(OneBudget.appVersion() || '') : '') || '1.0';
const INSTALLED_AT = (window.OneBudget && OneBudget.appInstallTime ? Number(OneBudget.appInstallTime() || 0) : 0);
let UPD_FOUND = null, UPD_CHECKED = false, UPD_BUSY = false;

/* v2.60, vStable 2.60 and plain 2.60 all yield 2.60 */
function releaseVersion(rel) {
  const src = [rel && rel.tag_name, rel && rel.name].filter(Boolean).join(' ');
  const m = String(src).match(/(\d+(?:\.\d+)*)/);
  return m ? m[1] : '';
}
function newerVersion(a, b) {
  const pa = String(a).replace(/^v/, '').split('.'), pb = String(b).replace(/^v/, '').split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
/* the public API, no token — the repo is public */
async function ghPublic(path) {
  const r = await fetch('https://api.github.com' + path, {
    headers: { 'Accept': 'application/vnd.github+json' },
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
/* newest published, non-draft release; falls back to tags so this
   works even before the first release is cut */
async function latestPublishedRelease() {
  try {
    const list = await ghPublic('/repos/' + UPD_REPO + '/releases?per_page=30');
    if (Array.isArray(list)) {
      const pub = list.filter(r => r && r.id && !r.draft && r.published_at);
      pub.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
      if (pub.length) return pub[0];
    }
  } catch (e) { /* fall through to tags */ }
  const tags = await ghPublic('/repos/' + UPD_REPO + '/tags?per_page=30');
  if (Array.isArray(tags) && tags.length) {
    return { id: 'tag:' + tags[0].name, tag_name: tags[0].name, name: tags[0].name, published_at: '', isTag: true };
  }
  return null;
}
function updateIsNewer(rel) {
  if (!rel) return false;
  const published = Date.parse(rel.published_at || '') || 0;
  const tagv = releaseVersion(rel);
  const versionNewer = !!tagv && newerVersion(tagv, APPV);
  const dateNewer = !!(published && INSTALLED_AT && published > INSTALLED_AT);
  return versionNewer || dateNewer;
}
async function checkUpdate(silent) {
  if (UPD_BUSY) return null;
  if (navigator.onLine === false) { if (!silent) toast('Offline — cannot check right now'); return null; }
  UPD_BUSY = true;
  try {
    const rel = await latestPublishedRelease();
    UPD_CHECKED = true;
    DB.settings.updCheckedAt = Date.now();
    if (rel && updateIsNewer(rel)) {
      UPD_FOUND = rel;
      save();
      if (!silent) { updatesSheet(rel); }
      else if (currentRoute() && currentRoute().render === renderHome) route();
      return rel;
    }
    UPD_FOUND = null;
    save();
    if (!silent) toast('You are on the latest version');
    return null;
  } catch (e) {
    if (!silent) toast('Could not reach GitHub');
    return null;
  } finally {
    UPD_BUSY = false;
  }
}
function updDismiss() {
  if (UPD_FOUND) DB.settings.updDismissed = UPD_FOUND.id;
  save();
  route();
}
function updLabel(rel) { return (rel && (rel.name || rel.tag_name)) || 'latest release'; }

/* the sheet: what you have, what is out, and the way to get it */
function updatesSheet(rel) {
  rel = rel || UPD_FOUND;
  const newer = updateIsNewer(rel);
  const asset = rel && ((rel.assets || []).find(a => /\.apk$/i.test(a.name || '')));
  const relUrl = rel && rel.html_url ? rel.html_url : 'https://github.com/' + UPD_REPO + '/releases';
  const body = rel && rel.body ? String(rel.body) : '';
  sheet(sheetHead('Updates') +
    (rel && newer
      ? '<div class="sumcard" style="margin:0 0 10px">' +
          '<div class="sumlabel">' + ico('up') + 'Update available</div>' +
          '<div class="amt-hero num" style="font-size:26px;margin-top:2px;color:var(--accent)">' + esc(updLabel(rel)) + '</div>' +
          '<div class="sumsub">' + (rel.published_at ? esc(fmtDay(String(rel.published_at).slice(0, 10))) : 'tag on GitHub') +
            (asset ? ' · ' + (Math.round((asset.size || 0) / 104857.6) / 10) + ' MB' : '') + '</div>' +
        '</div>'
      : rel
        ? '<div class="card"><div class="sumlabel">' + ico('check') + 'You are up to date</div>' +
          '<div class="ltitle" style="font-size:15px;margin-top:6px">' + esc(updLabel(rel)) + '</div>' +
          '<div class="lsub">' + (rel.published_at ? 'published ' + esc(fmtDay(String(rel.published_at).slice(0, 10))) : 'the newest tag on GitHub') + '</div></div>'
        : '<div class="card"><div class="emptystate" style="padding:18px 10px 14px"><b>Nothing published yet</b>' +
          '<p>No releases or tags on ' + esc(UPD_REPO) + ' yet. Publish one on GitHub and it will appear here.</p></div></div>') +
    (rel && rel.body ? '<div class="card"><div class="sumlabel">' + ico('layers') + 'What is new</div>' +
      '<p class="hint" style="margin-top:8px;max-height:24vh;overflow:auto;white-space:pre-wrap">' + esc(String(rel.body).slice(0, 1200)) + '</p></div>' : '') +
    '<div class="card setcard" style="margin-top:0">' +
      '<div class="lrow"><div class="lmain"><div class="ltitle">Installed</div>' +
      '<div class="lsub">' + (DB.settings.updCheckedAt ? 'checked ' + esc(tAgo(DB.settings.updCheckedAt)) : 'not checked yet') + '</div></div>' +
      '<span class="rval"><b style="font-size:14px">' + esc('v' + APPV) + '</b></span></div>' +
    '</div>' +
    '<div class="rowgap">' +
      (newer && asset ? '<button class="btn primary btnblock" id="updGet">Download and install</button>' : '') +
      '<button class="btn ' + (newer && asset ? 'ghost' : 'primary') + ' btnblock" id="updOpen">Open on GitHub</button>' +
      '<button class="btn ghost btnblock" id="updAgain">Check again</button>' +
    '</div>');
  const g = $('#updGet');
  if (g) g.onclick = () => {
    if (window.OneBudget && OneBudget.download) { closeSheet(); OneBudget.download(asset.browser_download_url, asset.name); toast('Downloading ' + updLabel(rel)); }
    else { closeSheet(); location.href = relUrl; }
  };
  $('#updOpen').onclick = () => {
    if (window.OneBudget && OneBudget.openUrl) OneBudget.openUrl(relUrl);
    else location.href = relUrl;
  };
  $('#updAgain').onclick = async () => { toast('Checking…'); await checkUpdate(false); };
}
/* the little "update available" card, shown on Home until dismissed */
function updateCardHtml() {
  if (!UPD_FOUND || DB.settings.updDismissed === UPD_FOUND.id) return '';
  return '<div class="card updcard"><div class="cardhead"><div class="sumlabel">' + ico('up') + 'Update available · ' + esc(updLabel(UPD_FOUND)) + '</div>' +
    '<button class="linkbtn" id="updLater">Later</button></div>' +
    '<p class="hint" style="margin:6px 0 0">A newer OneBudget is on GitHub.</p>' +
    '<div class="rowgap"><button class="btn primary btnblock" id="updSee">See what is new</button></div></div>';
}
function wireUpdateCard() {
  const s = $('#updSee'); if (s) s.onclick = () => updatesSheet(UPD_FOUND);
  const l = $('#updLater'); if (l) l.onclick = updDismiss;
}

function syncSheet() {
  const s = DB.sync;
  if (s.login) {
    sheet(sheetHead('Backup & sync') +
      '<div class="synccard" style="padding:6px 4px 16px"><span class="avatar">' +
        (s.avatar ? '<img src="' + esc(s.avatar) + '" alt="">' : esc((s.login || '?')[0].toUpperCase())) + '</span>' +
        '<div style="flex:1;min-width:0"><div class="sname">' + esc(s.login) + '</div>' +
        '<div class="smeta">' + (s.lastSync ? 'Last backup ' + esc(tAgo(s.lastSync)) : 'Not backed up yet') + '</div></div></div>' +
      '<p class="hint" style="margin:0 4px 14px">Your data is stored in a <b>secret Gist</b> on your GitHub account. Nothing is shared publicly.</p>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="syPush">Back up now</button>' +
      '<button class="btn ghost btnblock" id="syPull">Restore from backup</button>' +
      '<button class="btn danger btnblock" id="syOut">Disconnect</button></div>');
    $('#syPush').onclick = () => syncPush(false);
    $('#syPull').onclick = syncRestore;
    $('#syOut').onclick = () => {
      DB.sync = { token: '', login: '', avatar: '', gistId: DB.sync.gistId, lastSync: 0 };
      save(); closeSheet(); toast('Disconnected'); renderSettings();
    };
    return;
  }
  const canDevice = !!(window.OneBudget && OneBudget.oauthStart);
  const clientId = (window.OB_CONFIG && OB_CONFIG.GITHUB_CLIENT_ID) || '';
  sheet(sheetHead('Set up backup') +
    '<p class="hint" style="margin:0 4px 16px;font-size:14px;color:var(--text)">Backing up is optional — OneBudget works completely without it. ' +
    'Sign in with GitHub to keep a private copy of your data and restore it on another device.</p>' +
    (canDevice && clientId ? '<button class="btn primary btnblock" id="syDevice" style="display:flex;align-items:center;justify-content:center;gap:10px">' + ico('github') + 'Continue with GitHub</button>' : '') +
    '<label class="fldlabel" style="margin-top:18px">GitHub personal access token</label>' +
    '<input id="syToken" class="fld" type="password" placeholder="ghp_… or github_pat_…" autocomplete="off" spellcheck="false">' +
    '<p class="hint">A token with the <b>gist</b> scope is enough. It is stored only on this device.</p>' +
    '<div class="rowgap"><button class="btn primary btnblock" id="syGo">Sign in with token</button>' +
    '<a class="btn ghost btnblock" style="text-decoration:none" href="https://github.com/settings/tokens/new?scopes=gist&description=OneBudget">Create a token</a></div>');
  $('#syGo').onclick = () => {
    const t = $('#syToken').value.trim();
    if (!t) { toast('Paste a token first'); return; }
    finishSignIn(t);
  };
  const dv = $('#syDevice'); if (dv) dv.onclick = deviceSignIn;
}
async function gh(path, opts) {
  const o = opts || {};
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'OneBudget' };
  if (DB.sync.token) headers['Authorization'] = 'Bearer ' + DB.sync.token;
  if (o.body) headers['Content-Type'] = 'application/json';
  const r = await fetch('https://api.github.com' + path, { method: o.method || 'GET', headers, body: o.body });
  if (!r.ok) { let m = 'HTTP ' + r.status; try { const j = await r.json(); m = j.message || m; } catch (e) {} throw new Error(m); }
  return r.status === 204 ? null : r.json();
}
async function finishSignIn(token) {
  const prev = DB.sync.token;
  DB.sync.token = token;
  try {
    const u = await gh('/user');
    DB.sync.login = u.login; DB.sync.avatar = u.avatar_url || '';
    save(); closeSheet(); toast('Signed in as ' + u.login); renderSettings();
    setTimeout(() => syncPush(true), 400);
  } catch (e) { DB.sync.token = prev; toast('Sign-in failed: ' + e.message); }
}
let DEVICE_TIMER = null;
function deviceSignIn() {
  if (!(window.OneBudget && OneBudget.oauthStart)) { toast('One-tap sign-in is only available in the app'); return; }
  const clientId = (window.OB_CONFIG && OB_CONFIG.GITHUB_CLIENT_ID) || '';
  sheet(sheetHead('Sign in with GitHub') + '<div id="devBody">' + spinner() + '</div>');
  window.__oauthStart = (ok, resp) => {
    if (!ok) { $('#devBody').innerHTML = '<p class="hint">Could not start sign-in: ' + esc(resp) + '</p>'; return; }
    const d = typeof resp === 'string' ? JSON.parse(resp) : resp;
    if (d.error) { $('#devBody').innerHTML = '<p class="hint">' + esc(d.error_description || d.error) + '</p>'; return; }
    $('#devBody').innerHTML =
      '<p class="hint" style="font-size:14px;color:var(--text);margin:0 4px 14px">Enter this code at <b>github.com/login/device</b>:</p>' +
      '<div class="amountbox" style="justify-content:center"><span class="num" style="font-size:26px;font-weight:700;letter-spacing:3px">' + esc(d.user_code) + '</span></div>' +
      '<div class="rowgap"><button class="btn ghost btnblock" id="devCopy">Copy code</button>' +
      '<a class="btn primary btnblock" style="text-decoration:none;display:flex" href="https://github.com/login/device">Open github.com/login/device</a>' +
      '<div class="syncstat" id="devWait">Waiting for approval…</div></div>';
    copyText(d.user_code);
    $('#devCopy').onclick = () => { copyText(d.user_code); toast('Code copied'); };
    const poll = () => {
      window.__oauthPoll = (ok2, resp2) => {
        if (!ok2) return;
        let p; try { p = typeof resp2 === 'string' ? JSON.parse(resp2) : resp2; } catch (e) { return; }
        if (p.access_token) { clearInterval(DEVICE_TIMER); finishSignIn(p.access_token); return; }
        if (p.error === 'authorization_pending' || p.error === 'slow_down') return;
        if (p.error) { clearInterval(DEVICE_TIMER); const w = $('#devWait'); if (w) w.textContent = p.error_description || p.error; }
      };
      OneBudget.oauthPoll(clientId, d.device_code);
    };
    poll();
    DEVICE_TIMER = setInterval(poll, Math.max(5, d.interval || 5) * 1000);
  };
  OneBudget.oauthStart(clientId, 'gist');
}
const GIST_FILE = 'onebudget-backup.json';
let SYNC_T = null;
function queueSync() {
  if (!DB.sync.login || !DB.sync.token) return;
  clearTimeout(SYNC_T);
  SYNC_T = setTimeout(() => syncPush(true), 2500);
}
async function syncPush(silent) {
  if (!DB.sync.token) { if (!silent) toast('Sign in first'); return; }
  const content = JSON.stringify({ ...DB, sync: { ...DB.sync, token: '' } });
  try {
    if (!silent) toast('Backing up…');
    const files = {}; files[GIST_FILE] = { content };
    let res;
    if (DB.sync.gistId) res = await gh('/gists/' + DB.sync.gistId, { method: 'PATCH', body: JSON.stringify({ files }) });
    else res = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'OneBudget backup', public: false, files }) });
    if (res && res.id) DB.sync.gistId = res.id;
    DB.sync.lastSync = Date.now(); save();
    if (!silent) toast('Backed up');
    if (!$('#view')) return;
    if (currentRoute().render === renderSettings) renderSettings();
  } catch (e) { if (!silent) toast('Backup failed: ' + e.message); }
}
async function syncRestore() {
  if (!DB.sync.token) { toast('Sign in first'); return; }
  try {
    let gid = DB.sync.gistId;
    if (!gid) {
      const list = await gh('/gists?per_page=100');
      const found = (list || []).find(g => g.files && g.files[GIST_FILE]);
      if (found) gid = found.id;
    }
    if (!gid) { toast('No backup found on this account'); return; }
    const g = await gh('/gists/' + gid);
    const f = g.files && g.files[GIST_FILE];
    if (!f) { toast('Backup file missing in the gist'); return; }
    let content = f.content;
    if (f.truncated && f.raw_url) content = await (await fetch(f.raw_url)).text();
    DB.sync.gistId = gid;
    importJSON(content);
  } catch (e) { toast('Restore failed: ' + e.message); }
}

/* ---------- sample data ---------- */
function loadSample() {
  const now = new Date(), mk = mkey(now);
  const cats = ['food', 'grocery', 'transport', 'shopping', 'bills', 'fun', 'subs', 'health', 'travel'];
  const notes = {
    food: ['Lunch at office', 'Filter coffee', 'Dinner with friends', 'Swiggy order', 'Chai and samosa'],
    grocery: ['Big Basket order', 'Weekly vegetables', 'Milk and eggs', 'Blinkit run'],
    transport: ['Uber to office', 'Metro recharge', 'Petrol', 'Auto fare'],
    shopping: ['T-shirt', 'Running shoes', 'Phone case', 'Amazon order'],
    bills: ['Electricity bill', 'Broadband', 'Mobile recharge'],
    fun: ['Movie tickets', 'Concert', 'Weekend brunch'],
    subs: ['Netflix', 'iCloud storage', 'Gym membership'],
    health: ['Pharmacy', 'Doctor visit', 'Lab test'],
    travel: ['Train tickets', 'Hotel booking'],
  };
  const accs = DB.accounts.map(a => a.id);
  const out = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const dim = daysInMonth(now);
  for (let d = 1; d <= Math.min(now.getDate(), dim); d++) {
    const date = mk + '-' + pad2(d);
    const n = rnd() < .55 ? 1 : rnd() < .8 ? 2 : 0;
    for (let k = 0; k < n; k++) {
      const c = cats[Math.floor(rnd() * (cats.length - 1))];
      const base = c === 'grocery' ? 1200 : c === 'food' ? 320 : c === 'transport' ? 180 : c === 'shopping' ? 1500 : c === 'bills' ? 900 : 400;
      out.push({ id: uid(), type: 'exp', cat: c, amt: Math.round((base * (0.5 + rnd())) / 10) * 10,
        note: notes[c][Math.floor(rnd() * notes[c].length)], date,
        acc: accs[Math.floor(rnd() * accs.length)], time: pad2(8 + Math.floor(rnd() * 12)) + ':' + pad2(Math.floor(rnd() * 60)), updated: Date.now() });
    }
  }
  out.push({ id: uid(), type: 'inc', cat: 'salary', amt: 85000, note: 'Monthly salary', date: mk + '-01', acc: 'bank', time: '10:00', updated: Date.now() });
  for (let back = 1; back <= 5; back++) {
    const d0 = addMonths(now, -back), pk = mkey(d0), pdim = daysInMonth(d0);
    for (let d = 1; d <= pdim; d += 2) {
      const c = cats[Math.floor(rnd() * (cats.length - 1))];
      out.push({ id: uid(), type: 'exp', cat: c, amt: Math.round((300 + rnd() * 1400) / 10) * 10,
        note: notes[c][Math.floor(rnd() * notes[c].length)], date: pk + '-' + pad2(d),
        acc: accs[Math.floor(rnd() * accs.length)], time: '18:30', updated: Date.now() });
    }
    out.push({ id: uid(), type: 'inc', cat: 'salary', amt: 85000, note: 'Monthly salary', date: pk + '-01', acc: 'bank', time: '10:00', updated: Date.now() });
  }
  DB.tx = out;
  if (!DB.accounts.find(a => a.id === 'bank')) DB.accounts.push({ ...DEFAULT_ACCOUNTS[1] });
  const bank = DB.accounts.find(a => a.id === 'bank'); if (bank) bank.opening = 45000;
  const cash = DB.accounts.find(a => a.id === 'cash'); if (cash) cash.opening = 2000;
  if (!DB.recurring.length) {
    DB.recurring = [
      { id: uid(), name: 'Rent', amt: 18000, cat: 'rent', acc: 'bank', freq: 'monthly', nextDue: ymd(addDays(now, 3)), active: true },
      { id: uid(), name: 'Netflix', amt: 649, cat: 'subs', acc: 'card', freq: 'monthly', nextDue: ymd(addDays(now, 6)), active: true },
      { id: uid(), name: 'Broadband', amt: 999, cat: 'bills', acc: 'upi', freq: 'monthly', nextDue: ymd(addDays(now, 9)), active: true },
      { id: uid(), name: 'Gym membership', amt: 1500, cat: 'subs', acc: 'card', freq: 'monthly', nextDue: ymd(addDays(now, 14)), active: true },
      { id: uid(), name: 'Term insurance', amt: 12000, cat: 'health', acc: 'bank', freq: 'yearly', nextDue: ymd(addDays(now, 40)), active: true },
    ];
  }
  if (!DB.goals.length) {
    DB.goals = [
      { id: uid(), name: 'Emergency fund', target: 200000, saved: 62000, color: '#12B76A', icon: 'target', deadline: '' },
      { id: uid(), name: 'Japan trip', target: 150000, saved: 34000, color: '#6366F1', icon: 'plane', deadline: '' },
    ];
  }
  DB.onboarded = true;
  save(); applyTheme(); toast('Sample data loaded'); queueSync(); route();
}


/* ============================================================
   HOME-SCREEN WIDGET — push a small summary to the native side
   ============================================================ */
const ACCENT_PRESETS = { blue: '#1B6EF3', purple: '#8B5CF6', green: '#12B76A', pink: '#EC4899',
                         amber: '#F59E0B', teal: '#14B8A6', red: '#EF4444', indigo: '#6366F1' };
function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return null;
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function shadeHex(hex, f) {
  const c = hexToRgb(hex); if (!c) return hex;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  const mix = v => Math.round((t - v) * p + v);
  return '#' + [mix(c.r), mix(c.g), mix(c.b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function contrastText(hex) {
  const c = hexToRgb(hex); if (!c) return '#ffffff';
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  return lum > 0.62 ? '#101010' : '#ffffff';
}
function accentHex() {
  const st = DB.settings;
  if (st.accent === 'custom' && st.accentHex) return st.accentHex;
  return ACCENT_PRESETS[st.accent] || '#1B6EF3';
}
function isDarkTheme() {
  const t = DB.settings.theme;
  if (t === 'dark' || t === 'pitch') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function widgetSummary() {
  const key = mkey(new Date());
  const st = monthStats(key);
  const today = DB.tx.filter(t => t.type === 'exp' && t.date === todayYmd()).reduce((a, t) => a + (+t.amt || 0), 0);
  const todayCount = DB.tx.filter(t => t.date === todayYmd()).length;
  const cats = sortedCats(txOfMonth(key), 'exp');
  /* the four categories this user reaches for most, for the quick-add widget */
  const freq = {};
  DB.tx.forEach(t => { freq[t.cat] = (freq[t.cat] || 0) + 1; });
  const quick = Object.entries(freq).sort((a, c) => c[1] - a[1]).slice(0, 4)
    .map(([id]) => ({ id: id, name: cat(id).name, icon: cat(id).icon, color: cat(id).color }));
  /* last seven days, for the chart in the month widget */
  const series = dailyLast(7).map(v => Math.round(v));
  /* --- for the week, donut and trend widgets --- */
  const daySum = iso => DB.tx.filter(t => t.type === 'exp' && t.date === iso).reduce((a, t) => a + (+t.amt || 0), 0);
  let week = 0, lastWeek = 0;
  for (let i = 0; i < 7; i++) week += daySum(ymd(addDays(new Date(), -i)));
  for (let i = 7; i < 14; i++) lastWeek += daySum(ymd(addDays(new Date(), -i)));
  const cats5 = cats.slice(0, 5).map(([id, v]) => ({ name: cat(id).name, amt: Math.round(v), color: cat(id).color }));
  const dim = daysInMonth(new Date()), dom = new Date().getDate();
  const prevKey = mkey(addMonths(parseYmd(key + '-01'), -1));
  const paceNow = [], pacePrev = [];
  let runA = 0, runB = 0;
  for (let d = 1; d <= dim; d++) {
    runA += daySum(key + '-' + pad2(d));
    runB += daySum(prevKey + '-' + pad2(d));
    paceNow.push(Math.round(runA));
    pacePrev.push(Math.round(runB));
  }
  /* --- for the year, heatmap, weekday, compare and ring widgets --- */
  const yr = new Date().getFullYear();
  const months12 = [];
  let yearTotal = 0;
  for (let m = 0; m < 12; m++) {
    const mk2 = yr + '-' + pad2(m + 1);
    const v = DB.tx.filter(t => t.type === 'exp' && monthOf(t.date) === mk2).reduce((a, t) => a + (+t.amt || 0), 0);
    months12.push(Math.round(v)); yearTotal += v;
  }
  let bestMonth = 0;
  months12.forEach((v, i) => { if (v > months12[bestMonth]) bestMonth = i; });
  const dimN = daysInMonth(new Date());
  const heat = [];
  for (let d = 1; d <= dimN; d++) heat.push(Math.round(daySum(key + '-' + pad2(d))));
  const heatLead = new Date(yr, new Date().getMonth(), 1).getDay();
  const wdSum = [0, 0, 0, 0, 0, 0, 0], wdN = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 56; i++) {
    const dt = addDays(new Date(), -i), ix = dt.getDay();
    wdSum[ix] += daySum(ymd(dt)); wdN[ix]++;
  }
  const weekday = [1, 2, 3, 4, 5, 6, 0].map(i => Math.round(wdSum[i] / Math.max(1, wdN[i])));
  const prevMonthTotal = Math.round(DB.tx.filter(t => t.type === 'exp' && monthOf(t.date) === prevKey).reduce((a, t) => a + (+t.amt || 0), 0));
  const recent = DB.tx.slice()
    .sort((a, c) => (c.date + (c.time || '')) < (a.date + (a.time || '')) ? -1 : 1)
    .slice(0, 3)
    .map(t => ({ note: (t.note || cat(t.cat).name).slice(0, 24), amt: Math.round(t.amt), type: t.type }));
  const nwS = netWorthSeries(6);
  const bills = upcomingBills(3).map(r => {
    let days = -1;
    if (r.nextDue) days = Math.round((parseYmd(r.nextDue) - new Date()) / 86400000);
    return { name: String(r.name || 'Bill').slice(0, 20), amt: Math.round(+r.amt || 0), days: days };
  });
  return {
    recent: recent,
    netWorth: Math.round(netWorthNow().total),
    nwSeries: nwS.map(x => x.value), nwLabels: nwS.map(x => x.label),
    series14: dailyLast(14).map(v => Math.round(v)),
    bills: bills, billsMonth: Math.round(recurringMonthlyTotal()),
    topCat: cats5.length ? cats5[0] : null,
    months12: months12, year: yr, yearTotal: Math.round(yearTotal), bestMonth: bestMonth,
    heat: heat, heatDim: dimN, heatLead: heatLead, weekday: weekday,
    prevMonth: prevMonthTotal,
    week: Math.round(week), lastWeek: Math.round(lastWeek),
    cats5: cats5, dim: dim, dom: dom,
    pace: paceNow.slice(0, dom), pacePrev: pacePrev.slice(0, dom),
    month: Math.round(st.spent), today: Math.round(today), count: st.count,
    todayCount: todayCount,
    income: Math.round(st.income), saved: Math.round(st.net),
    top: cats.length ? cat(cats[0][0]).name : '',
    topAmt: cats.length ? Math.round(cats[0][1]) : 0,
    top3: cats.slice(0, 3).map(([id, v]) => ({ name: cat(id).name, amt: Math.round(v) })),
    quick: quick, series: series, avg: Math.round(st.daily),
    sym: DB.settings.currency || '\u20B9',
    label: monthLabel(new Date()),
    dark: isDarkTheme(),
    accent: accentHex(),
    updated: Date.now(),
  };
}
function pushWidget() {
  if (!(window.OneBudget && OneBudget.widgetSync)) return;
  try { OneBudget.widgetSync(JSON.stringify(widgetSummary())); } catch (e) {}
}


/* ============================================================
   TAP A CARD FOR MORE
   Every summary card opens a panel with the full numbers and
   the actions that belong to it — all buttons pinned at the
   bottom of the sheet, so they stay in the thumb zone.
   ============================================================ */
function miniStatRow(label, value, color) {
  return '<div class="datarow"><span>' + esc(label) + '</span><b class="num"' + (color ? ' style="color:' + color + '"' : '') + '>' + esc(value) + '</b></div>';
}
function txListCard(list, emptyText) {
  if (!list.length) return '<div class="card"><div class="emptystate" style="padding:22px 12px"><b>' + esc(emptyText || 'Nothing here') + '</b></div></div>';
  return '<div class="card list">' + list.slice(0, 8).map(t => txRowHtml(t)).join('') + '</div>';
}
function wireSheetTxRows() {
  $$('#sheet .txrow').forEach(r => r.onclick = () => { const id = r.dataset.tx; closeSheet(); setTimeout(() => txDetail(id), 180); });
}

function moreSheet(kind, arg) {
  const key = VIEWMONTH;
  const st = monthStats(key);
  const prevKey = mkey(addMonths(parseYmd(key + '-01'), -1));
  const prev = monthStats(prevKey);
  const list = txOfMonth(key);

  /* ---------- whole month ---------- */
  if (kind === 'month') {
    const cats = sortedCats(list, 'exp');
    const big = list.filter(t => t.type === 'exp').sort((a, c) => c.amt - a.amt)[0];
    const days = dailySeries(key);
    const busiest = days.slice().sort((a, c) => c.spent - a.spent)[0];
    sheet(sheetHead(monthLabel(parseYmd(key + '-01'))) +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">Spent' + deltaChip(st.spent, prev.spent, true) + '</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(st.spent)) + '</div>' +
        '<div class="sumsub">' + st.count + ' entries · ' + esc(money(st.daily)) + ' a day</div>' +
        '<div class="chartwrap">' + lineChart({ series: [{ name: 'Daily', color: 'var(--accent)', values: days.map(d => d.spent), fill: true }], h: 96, labels: ['1', String(Math.round(st.dim / 2)), String(st.dim)] }) + '</div>' +
      '</div>' +
      '<div class="card">' +
        miniStatRow('Income', money(st.income)) +
        miniStatRow('Saved', money(st.net), st.net >= 0 ? 'var(--ok)' : 'var(--danger)') +
        miniStatRow('Savings rate', Math.round(savingsRate(st)) + '%') +
        miniStatRow('Average per day', money(st.daily)) +
        (busiest ? miniStatRow('Busiest day', fmtDay(busiest.iso) + ' · ' + money(busiest.spent)) : '') +
        (big ? miniStatRow('Biggest expense', money(big.amt) + (big.note ? ' · ' + big.note : '')) : '') +
        (cats.length ? miniStatRow('Top category', cat(cats[0][0]).name + ' · ' + money(cats[0][1])) : '') +
        miniStatRow('vs ' + MON3[parseYmd(prevKey + '-01').getMonth()], (prev.spent ? (st.spent >= prev.spent ? '+' : '') + Math.round(((st.spent - prev.spent) / prev.spent) * 100) + '%' : '—')) +
      '</div>' +
      (cats.length ? '<div class="card"><div class="sumlabel">Where it went</div><div class="chartwrap">' +
        hbarList(cats.slice(0, 6).map(([id, v]) => ({ name: cat(id).name, value: v, color: cat(id).color }))) + '</div></div>' : '') +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="mmAll">See all transactions</button>' +
        '<button class="btn ghost btnblock" id="mmRecap">Month in review</button>' +
        '<button class="btn ghost btnblock" id="mmCsv">Export this month as CSV</button>' +
      '</div>');
    $('#mmAll').onclick = () => { closeSheet(); go('#/tx'); };
    $('#mmRecap').onclick = () => { closeSheet(); setTimeout(recapSheet, 180); };
    $('#mmCsv').onclick = () => {
      const rows = list.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      const csv = exportCSVRows(rows);
      const name = 'onebudget-' + key + '.csv';
      if (window.OneBudget && OneBudget.saveFile) { OneBudget.saveFile(name, csv); toast('Saved to Downloads'); }
      else { const b = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Saved ' + name); }
    };
    return;
  }

  /* ---------- today ---------- */
  if (kind === 'today') {
    const today = DB.tx.filter(t => t.date === todayYmd());
    const spent = sumType(today, 'exp'), inc = sumType(today, 'inc');
    sheet(sheetHead('Today · ' + fmtDayLong(todayYmd())) +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">Spent today</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(spent)) + '</div>' +
        '<div class="sumsub">' + today.length + ' entr' + (today.length === 1 ? 'y' : 'ies') + (inc ? ' · income ' + esc(money(inc)) : '') + '</div>' +
      '</div>' +
      '<div class="card">' +
        miniStatRow('Average per day this month', money(st.daily)) +
        miniStatRow('Today vs average', spent > st.daily ? 'above by ' + money(spent - st.daily) : 'below by ' + money(st.daily - spent)) +
        miniStatRow('This week', money(DB.tx.filter(t => t.type === 'exp' && t.date >= ymd(weekStart(new Date())) && t.date <= todayYmd()).reduce((a, t) => a + (+t.amt || 0), 0))) +
      '</div>' +
      '<div class="sect" style="margin-top:16px">Today\'s entries</div>' + txListCard(today, 'Nothing recorded yet today') +
      '<div class="rowgap"><button class="btn primary btnblock" id="tdAdd">Add an expense for today</button></div>');
    $('#tdAdd').onclick = () => { closeSheet(); setTimeout(() => txSheet(null, 'exp', todayYmd()), 180); };
    wireSheetTxRows();
    return;
  }

  /* ---------- average per day ---------- */
  if (kind === 'avg') {
    const last = dailyLast(14);
    const best = Math.max(...last), worst = Math.min(...last);
    sheet(sheetHead('Daily average') +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">This month</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(st.daily)) + '</div>' +
        '<div class="sumsub">' + (prev.daily ? 'last month ' + esc(money(prev.daily)) : 'no data for last month') + '</div>' +
      '</div>' +
      '<div class="card"><div class="sumlabel">' + ico('calendar') + 'Last 14 days</div>' +
        '<div class="chartwrap">' + barChart(dailyLast(14).map((v, i) => ({ label: i === 13 ? 'today' : '', value: v, cur: i === 13 }))) + '</div>' +
      '</div>' +
      '<div class="card">' +
        miniStatRow('Highest day', money(best)) +
        miniStatRow('Lowest day', money(worst)) +
        miniStatRow('Days with spending', last.filter(v => v > 0).length + ' of 14') +
        miniStatRow('Projected month total', money(st.daily * st.dim)) +
      '</div>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="avIns">Open insights</button></div>');
    $('#avIns').onclick = () => { closeSheet(); STATSSEC = 'trends'; go('#/stats'); };
    return;
  }

  /* ---------- saved ---------- */
  if (kind === 'saved') {
    const months = lastNMonths(6);
    sheet(sheetHead('Saved') +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">Saved this month</div>' +
        '<div class="amt-hero num" style="margin-top:4px;color:' + (st.net >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + esc(money(st.net)) + '</div>' +
        '<div class="sumsub">' + Math.round(savingsRate(st)) + '% of ' + esc(money(st.income)) + ' income</div>' +
      '</div>' +
      '<div class="card"><div class="sumlabel">Income vs spending</div>' +
        '<div class="chartwrap">' + lineChart({ series: [
          { name: 'Income', color: 'var(--ok)', values: months.map(m => m.income) },
          { name: 'Spending', color: 'var(--accent)', values: months.map(m => m.spent) },
        ], h: 120, labels: [months[0].label, months[5].label] }) + '</div></div>' +
      '<div class="card">' + months.map(m => miniStatRow(m.full, money(m.net), m.net >= 0 ? 'var(--ok)' : 'var(--danger)')).join('') + '</div>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="svGoals">Savings goals</button></div>');
    $('#svGoals').onclick = () => { closeSheet(); go('#/goals'); };
    return;
  }

  /* ---------- entries ---------- */
  if (kind === 'entries') {
    sheet(sheetHead(st.count + ' entries · ' + monthLabel(parseYmd(key + '-01'))) +
      '<div class="card">' +
        miniStatRow('Expenses', money(st.spent)) +
        miniStatRow('Income', money(st.income)) +
        miniStatRow('Expense entries', String(list.filter(t => t.type === 'exp').length)) +
        miniStatRow('Income entries', String(list.filter(t => t.type === 'inc').length)) +
        miniStatRow('Busiest day', (() => { const b = {}; list.forEach(t => { b[t.date] = (b[t.date] || 0) + 1; }); const top = Object.entries(b).sort((x, y) => y[1] - x[1])[0]; return top ? fmtDay(top[0]) + ' · ' + top[1] + ' entries' : '—'; })()) +
      '</div>' +
      '<div class="sect" style="margin-top:16px">Latest</div>' + txListCard(list.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))), 'No entries this month') +
      '<div class="rowgap"><button class="btn primary btnblock" id="enAll">All transactions</button></div>');
    $('#enAll').onclick = () => { closeSheet(); go('#/tx'); };
    wireSheetTxRows();
    return;
  }

  /* ---------- one category ---------- */
  if (kind === 'cat') {
    const c = cat(arg);
    const inCat = list.filter(t => t.type === 'exp' && t.cat === arg);
    const spent = inCat.reduce((a, t) => a + (+t.amt || 0), 0);
    const prevSpent = txOfMonth(prevKey).filter(t => t.type === 'exp' && t.cat === arg).reduce((a, t) => a + (+t.amt || 0), 0);
    const hist = lastNMonths(6).map(m => txOfMonth(m.key).filter(t => t.type === 'exp' && t.cat === arg).reduce((a, t) => a + (+t.amt || 0), 0));
    const big = inCat.slice().sort((a, b) => b.amt - a.amt)[0];
    const share = st.spent > 0 ? Math.round((spent / st.spent) * 100) : 0;
    sheet(sheetHead(c.name) +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">Spent this month' + deltaChip(spent, prevSpent, true) + '</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(spent)) + '</div>' +
        '<div class="sumsub">' + share + '% of everything you spent · ' + inCat.length + ' entries</div>' +
        '<div class="chartwrap">' + sparkline(hist, c.color, 42) + '</div>' +
        '<div class="xlabels" style="margin-top:4px"><span>6 months ago</span><span>this month</span></div>' +
      '</div>' +
      '<div class="card">' +
        miniStatRow('Last month', money(prevSpent)) +
        miniStatRow('Average per entry', money(inCat.length ? spent / inCat.length : 0)) +
        miniStatRow('Average per month (6m)', money(hist.reduce((a, v) => a + v, 0) / 6)) +
        (big ? miniStatRow('Biggest', money(big.amt) + (big.note ? ' · ' + big.note : '')) : '') +
      '</div>' +
      '<div class="sect" style="margin-top:16px">Recent in ' + esc(c.name) + '</div>' + txListCard(inCat.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))), 'Nothing here this month') +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="cdAdd">Add to ' + esc(c.name) + '</button>' +
        '<button class="btn ghost btnblock" id="cdAll">Show in Activity</button>' +
      '</div>');
    $('#cdAdd').onclick = () => { closeSheet(); setTimeout(() => txSheet(null, 'exp', todayYmd(), { cat: c.id }), 180); };
    $('#cdAll').onclick = () => { closeSheet(); TXSEARCH = c.name; TXSCOPE = 'month'; go('#/tx'); };
    wireSheetTxRows();
    return;
  }

  /* ---------- pace ---------- */
  if (kind === 'pace') {
    sheet(sheetHead('Spending pace') +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">' + esc(monthLabel(parseYmd(key + '-01'))) + ' so far</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(st.spent)) + '</div>' +
        '<div class="sumsub">' + esc(MON3[parseYmd(prevKey + '-01').getMonth()]) + ' ended at ' + esc(money(prev.spent)) + '</div>' +
      '</div>' +
      '<div class="card"><div class="sumlabel">Cumulative, day by day</div>' +
        '<div class="chartwrap">' + lineChart({ series: [
          { name: 'This month', color: 'var(--accent)', values: cumulativeSeries(key), fill: true },
          { name: MON3[parseYmd(prevKey + '-01').getMonth()], color: 'var(--text2)', values: cumulativeSeries(prevKey), dash: true },
        ], h: 140, labels: ['1', '10', '20', String(st.dim)] }) + '</div></div>' +
      '<div class="card">' +
        miniStatRow('Spent by this day last month', money(prev.spent * (st.days / prev.dim))) +
        miniStatRow('Difference', (st.spent >= prev.spent * (st.days / prev.dim) ? 'ahead by ' : 'behind by ') + money(Math.abs(st.spent - prev.spent * (st.days / prev.dim)))) +
        miniStatRow('Days left in month', String(Math.max(0, st.dim - st.days))) +
      '</div>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="pcTrends">Open trends</button></div>');
    $('#pcTrends').onclick = () => { closeSheet(); STATSSEC = 'trends'; go('#/stats'); };
    return;
  }

  /* ---------- subscriptions ---------- */
  if (kind === 'bills') {
    const monthly = recurringMonthlyTotal();
    const sorted = DB.recurring.slice().sort((a, b) => String(a.nextDue || '').localeCompare(String(b.nextDue || '')));
    sheet(sheetHead('Subscriptions') +
      '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
        '<div class="sumlabel">Monthly cost</div>' +
        '<div class="amt-hero num" style="margin-top:4px">' + esc(money(monthly)) + '</div>' +
        '<div class="sumsub">' + esc(money(monthly * 12)) + ' a year · ' + DB.recurring.filter(r => r.active).length + ' active</div>' +
      '</div>' +
      (sorted.length ? '<div class="card list">' + sorted.map(r => {
        const c = cat(r.cat), n = daysUntil(r.nextDue);
        return '<div class="recrow" data-rec="' + r.id + '">' + catIconHtml(c) +
          '<div class="recmain"><div class="rectop">' + esc(r.name) + '</div>' +
          '<div class="recsub">' + esc(freqLabel(r.freq)) + ' · ' + esc(money(monthlyEquiv(r))) + '/mo</div></div>' +
          '<div class="recamt"><span class="amt num">' + esc(money(r.amt)) + '</span>' +
          '<span class="duechip ' + (n != null && n <= 3 ? 'soon' : '') + '">' + esc(dueLabel(r.nextDue)) + '</span></div></div>';
      }).join('') + '</div>' : '<div class="card"><div class="emptystate" style="padding:24px 12px"><b>No recurring bills yet</b></div></div>') +
      '<div class="rowgap">' +
        '<button class="btn primary btnblock" id="bsManage">Manage bills</button>' +
        '<button class="btn ghost btnblock" id="bsAdd">Add a recurring bill</button>' +
      '</div>');
    $$('#sheet [data-rec]').forEach(r => r.onclick = () => { closeSheet(); setTimeout(() => recurringSheet(r.dataset.rec), 180); });
    $('#bsManage').onclick = () => { closeSheet(); go('#/recurring'); };
    $('#bsAdd').onclick = () => { closeSheet(); setTimeout(() => recurringSheet(null), 180); };
    return;
  }

  /* ---------- AI assistant ---------- */
  if (kind === 'ai') { aiSheet(); return; }

  
/* ---------- net worth ---------- */
  if (kind === 'networth') { netWorthSheet(); return; }

  /* ---------- where the money is ---------- */
  if (kind === 'accounts') {
    const wallets = accountBalances();
    const split = accountSplit(key);
    const entries = Object.entries(split).map(([id, v]) => { const a = acct(id); return { name: a ? a.name : 'Unassigned', value: v, color: a ? a.color : '#8A8A8A' }; }).sort((x, y) => y.value - x.value);
    sheet(sheetHead('Accounts') +
      (entries.length ? '<div class="card"><div class="sumlabel">Paid from this month</div>' + donutHtml(entries, moneyShort(st.spent), 'total') + '</div>' : '') +
      '<div class="card list">' + wallets.map(a =>
        '<div class="walletrow" data-acc="' + a.id + '">' + catIconHtml(a) +
        '<div class="walletmain"><div class="wallettop">' + esc(a.name) + '</div>' +
        '<div class="walletsub">' + esc(money(a.monthSpent)) + ' spent this month</div></div>' +
        '<span class="walletbal num" style="color:' + (a.balance < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(a.balance)) + '</span></div>').join('') + '</div>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="acManage">Manage accounts</button></div>');
    $$('#sheet [data-acc]').forEach(r => r.onclick = () => { closeSheet(); setTimeout(() => accountSheet(r.dataset.acc), 180); });
    $('#acManage').onclick = () => { closeSheet(); go('#/accounts'); };
    return;
  }
}

/* ============================================================
   ROUTER
   ============================================================ */
const ROUTES = [
  { re: /^#\/home$/, tab: 0, title: 'Home', render: renderHome },
  { re: /^#\/tx$/, tab: 1, title: 'Activity', render: renderTx },
  { re: /^#\/today$/, tab: 2, title: 'Today', render: renderToday },
  { re: /^#\/recurring$/, tab: -1, title: 'Recurring bills', render: renderBills, back: '#/settings' },
  { re: /^#\/stats$/, tab: 3, title: 'Insights', render: renderStats },
  { re: /^#\/settings$/, tab: -1, title: 'Settings', render: renderSettings },
  { re: /^#\/cats$/, tab: -1, title: 'Categories', render: renderCats, back: '#/settings' },
  { re: /^#\/accounts$/, tab: -1, title: 'Accounts', render: renderAccounts, back: '#/settings' },
  { re: /^#\/goals$/, tab: -1, title: 'Savings goals', render: renderGoals, back: '#/settings' },
  { re: /^#\/data$/, tab: -1, title: 'Export & import', render: renderData, back: '#/settings' },
];
function currentRoute() {
  const h = location.hash || '#/home';
  return ROUTES.find(r => r.re.test(h)) || ROUTES[0];
}
function route() {
  const r = currentRoute();
  $$('#navbar .navbtn').forEach(b => b.classList.toggle('active', +b.dataset.tab === r.tab));
  const showBack = !!r.back;
  $('#backBig').hidden = !showBack; $('#backApp').hidden = !showBack;
  if (showBack) { $('#backBig').onclick = $('#backApp').onclick = () => { location.hash = r.back; }; }
  const fab = $('#fab');
  fab.hidden = !(r.tab >= 0);
  fab.onclick = e => { e.stopPropagation(); toggleFabStack(); };
  const stack = $('#fabstack');
  if (stack) { stack.hidden = !(r.tab >= 0); stack.classList.remove('open'); }
  fab.classList.remove('open');
  r.render();
  $('#scroller').scrollTop = 0;
}
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

/* Android back gesture and the hardware button both land here. Return true
   when the app handled it, false to let Android leave the app. */
window.__onBack = function () {
  try {
    if (document.body.classList.contains('sheetopen')) { closeSheet(); return true; }
    const st = document.getElementById('fabstack');
    if (st && st.classList.contains('open')) { toggleFabStack(false); return true; }
    if (location.hash && location.hash !== '#/home') { location.hash = '#/home'; return true; }
  } catch (e) {}
  return false;
};

/* ---------- the add button opens a small labelled stack ---------- */
function toggleFabStack(force) {
  const s = $('#fabstack'), f = $('#fab');
  if (!s || !f) return;
  const open = force != null ? force : !s.classList.contains('open');
  s.classList.toggle('open', open);
  f.classList.toggle('open', open);
}
function wireFabStack() {
  const s = $('#fabstack');
  if (!s) return;
  s.querySelectorAll('.fabopt').forEach(b => b.onclick = () => {
    toggleFabStack(false);
    const k = b.dataset.fab;
    if (k === 'speak') voiceSheet();
    else if (k === 'scan') photoSheet();
    else txSheet(null, 'exp', todayYmd());
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.fabopt') && !e.target.closest('#fab')) toggleFabStack(false);
  const m = e.target.closest('[data-more]');
  if (m && !e.target.closest('[data-tx]')) { e.preventDefault(); moreSheet(m.dataset.more, m.dataset.arg); return; }
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); go(g.dataset.go); }
});
window.addEventListener('hashchange', route);
window.addEventListener('online', () => { toast('Back online'); route(); });
window.addEventListener('offline', () => { toast('Offline — entries still save on this device'); route(); });

let lastY = 0;
$('#scroller').addEventListener('scroll', () => {
  const y = $('#scroller').scrollTop, nav = $('#navbar');
  if (y > lastY + 8 && y > 90) nav.classList.add('hide');
  else if (y < lastY - 8) nav.classList.remove('hide');
  $('#appbar').classList.toggle('on', y > 46);
  lastY = y;
}, { passive: true });

/* ============================================================
   BOOT
   ============================================================ */

/* ============================================================
   OFFLINE STORAGE
   Everything lives on the device. localStorage is the fast copy
   the app reads on every launch; IndexedDB is the durable mirror
   and holds a rolling set of daily snapshots, so a bad edit or a
   cleared browser store can always be recovered. Nothing here
   talks to a network.
   ============================================================ */
let IDB = null, PERSISTED = false, STORAGE_BYTES = 0, SNAPCOUNT = 0;

function idbOpen() {
  return new Promise(res => {
    try {
      if (!window.indexedDB) return res(null);
      const r = indexedDB.open('onebudget', 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore('kv'); } catch (e) { } };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
}
function idbPut(k, v) {
  try { if (!IDB) return; const tx = IDB.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); } catch (e) { }
}
function idbGet(k) {
  return new Promise(res => {
    try {
      if (!IDB) return res(null);
      const q = IDB.transaction('kv', 'readonly').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result == null ? null : q.result);
      q.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}

/* one snapshot a day, five kept */
async function snapshot() {
  try {
    const key = todayYmd();
    const snaps = (await idbGet('snaps')) || {};
    if (!snaps[key]) { snaps[key] = { at: Date.now(), db: DB }; }
    const keys = Object.keys(snaps).sort();
    while (keys.length > 5) { delete snaps[keys.shift()]; }
    SNAPCOUNT = Object.keys(snaps).length;
    idbPut('snaps', snaps);
  } catch (e) { }
}
async function listSnapshots() {
  const snaps = (await idbGet('snaps')) || {};
  return Object.keys(snaps).sort().reverse().map(k => ({ date: k, at: snaps[k].at, count: (snaps[k].db && snaps[k].db.tx ? snaps[k].db.tx.length : 0) }));
}
async function restoreSnapshot(date) {
  const snaps = (await idbGet('snaps')) || {};
  const s = snaps[date];
  if (!s || !s.db) return false;
  DB = s.db;
  LS.set('db', DB);
  idbPut('db', DB);
  return true;
}

/* run once at startup */
async function storageReady() {
  IDB = await idbOpen();
  /* ask the browser to keep this data rather than evict it under pressure */
  try { if (navigator.storage && navigator.storage.persist) PERSISTED = await navigator.storage.persist(); } catch (e) { }
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      STORAGE_BYTES = e.usage || 0;
    }
  } catch (e) { }
  /* if the fast copy is missing, fall back to the durable one */
  if (!DB) {
    const mirror = await idbGet('db');
    if (mirror && mirror.tx) { DB = mirror; LS.set('db', DB); }
  }
  if (DB) { idbPut('db', DB); snapshot(); }
}
function storageLabel() {
  const b = STORAGE_BYTES;
  if (!b) return 'on this device';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB on this device';
  return (b / 1024 / 1024).toFixed(1) + ' MB on this device';
}

function boot() {
  applyTheme();
  injectShapeCSS();
  wireFabStack();
  storageReady();
  if (navigator.onLine !== false) setTimeout(() => { try { checkUpdate(true); } catch (e) { } }, 2500);
  if (!location.hash) location.hash = '#/home';
  route();
  if (window.matchMedia) {
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (DB.settings.theme === 'auto') applyTheme(); }); } catch (e) {}
  }
  /* offline caching for the hosted web version (the APK bundles its files) */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  }
}
window.toast = toast;
window.closeSheet = closeSheet;
/* the home-screen widgets deep-link straight into the keypad */
window.__quickCat = function (id) {
  if (!id) return;
  const c = cat(id);
  txSheet(null, c.kind === 'inc' ? 'inc' : 'exp', todayYmd(), { cat: id });
};
window.__quickAdd = function () { txSheet(null, 'exp', todayYmd()); };
window.__quickPicker = function () { quickAddSheet(); };
window.__quickSpeak = function () { voiceSheet(); };
window.__quickScan = function () { photoSheet(); };
window.__go = function (h) { go(h); };
window.__updateDownloaded = function (ok, info) {
  toast(ok ? 'Downloaded ' + info + ' — confirm the install to update' : 'Download failed: ' + info);
};
/* ============================================================
   MATERIAL ICONS
   A toggle that swaps the flat round chips for organic
   Material-style shapes. Every icon takes a shape from its own
   id, so a category keeps the same shape instead of flickering,
   and the shape slowly morphs into its neighbour and back.
   ============================================================ */
const MSHAPE_N = 12, MSPT = 72;

function mPolar(fn) {
  let d = '';
  for (let i = 0; i <= MSPT; i++) {
    const t = i / MSPT * Math.PI * 2;
    const r = Math.max(4, fn(t));
    const x = 50 + r * Math.cos(t), y = 50 + r * Math.sin(t);
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d + 'Z';
}
/* superellipse: p=4 gives a squircle, p=1.3 a gem */
function mSuper(p, R) {
  return t => {
    const c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
    return R / Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p);
  };
}
/* rose curve: lobes = n, depth = k — clovers, flowers, bursts */
function mRose(R, k, n) { return t => R * (1 + k * Math.cos(n * t)); }
function mEllipse(rx, ry) { return t => (rx * ry) / Math.sqrt(Math.pow(ry * Math.cos(t), 2) + Math.pow(rx * Math.sin(t), 2)); }

const MSHAPES = [
  mPolar(t => 45),                               /* circle */
  mPolar(mSuper(4.2, 46)),                       /* squircle */
  mPolar(mEllipse(46, 33)),                      /* pill */
  mPolar(mSuper(1.35, 46)),                      /* gem */
  mPolar(mRose(37, .26, 4)),                     /* clover */
  mPolar(mRose(37, .20, 6)),                     /* flower */
  mPolar(mRose(35, .17, 8)),                     /* sunny */
  mPolar(mRose(33, .16, 12)),                    /* burst */
  mPolar(mRose(40, .11, 5)),                     /* puffy */
  mPolar(mRose(36, .13, 3)),                     /* tri-blob */
  mPolar(t => 45 * (1 + .10 * Math.cos(2 * t))), /* oval */
  mPolar(t => 42 + 5 * Math.cos(9 * t)),         /* cookie */
];

function injectShapeCSS() {
  if (document.getElementById('mshapeCSS')) return;
  const st = document.createElement('style');
  st.id = 'mshapeCSS';
  let css = '';
  for (let i = 0; i < MSHAPE_N; i++) {
    css += '@keyframes msm' + i + '{0%,100%{d:path("' + MSHAPES[i] + '")}50%{d:path("' + MSHAPES[(i + 1) % MSHAPE_N] + '")}}';
  }
  st.textContent = css;
  document.head.appendChild(st);
}
/* the shape a given thing gets — stable per id, re-rollable */
function mShapeIndex(id) {
  const s = String(id) + ':' + (DB.settings.materialSeed || 0);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h % MSHAPE_N;
}
function mIconInner(name, color, id) {
  const i = mShapeIndex(id);
  return '<svg class="mshape" viewBox="0 0 100 100" aria-hidden="true"><path class="msm" style="animation:msm' + i + ' 10s ease-in-out infinite" d="' + MSHAPES[i] +
      '" fill="' + hexA(color, .16) + '" stroke="' + hexA(color, .45) + '" stroke-width="1.5"/></svg>' +
    '<svg class="mglyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      (ICON[name] || ICON.dots) + '</svg>';
}
function materialOn() { return !!(DB.settings && DB.settings.materialIcons); }
function shuffleShapes() {
  DB.settings.materialSeed = Math.floor(Math.random() * 100000);
  save(); route(); toast('Shapes reshuffled');
}

/* a short glow flash on whatever was just pressed */
function glowPress(el) {
  if (!el) return;
  el.classList.remove('press-glow');
  void el.offsetWidth;
  el.classList.add('press-glow');
  setTimeout(() => el.classList.remove('press-glow'), 520);
}

/* ---------- saved templates ---------- */
function templatesSheet() {
  const list = DB.templates || [];
  sheet(sheetHead('Saved templates') +
    (list.length
      ? '<div class="card list" style="padding:6px 0">' + list.map(t => {
          const c = cat(t.cat);
          return '<div class="lrow"><div class="lmain"><div class="ltitle">' + esc(t.note || c.name) + '</div>' +
            '<div class="lsub">' + esc(c.name) + ' · ' + esc(money(t.amt)) + '</div></div>' +
            '<button class="iconbtn" data-deltpl="' + t.id + '">' + ico('trash') + '</button></div>';
        }).join('') + '</div>'
      : '<div class="card"><div class="emptystate" style="padding:24px 12px"><b>No templates yet</b>' +
        '<p>Open the keypad, fill in a usual expense, and tap the bookmark in the header.</p></div></div>') +
    '<div class="rowgap"><button class="btn primary btnblock" id="tplNew">Add from the keypad</button>' +
    '<button class="btn ghost btnblock" onclick="closeSheet()">Close</button></div>');
  $('#tplNew').onclick = () => { closeSheet(); setTimeout(() => txSheet(null, 'exp'), 200); };
  $$('#sheet [data-deltpl]').forEach(b => b.onclick = () => {
    const i = DB.templates.findIndex(x => x.id === b.dataset.deltpl);
    if (i < 0) return;
    const gone = DB.templates.splice(i, 1)[0];
    save(); templatesSheet();
    toast('Template removed', { label: 'Undo', fn: () => { DB.templates.splice(i, 0, gone); save(); templatesSheet(); } });
  });
}

/* ---------- offline: restore an earlier copy ---------- */
async function restoreSheet() {
  const snaps = await listSnapshots();
  sheet(sheetHead('Restore an earlier copy') +
    '<div class="card" style="background:var(--chip);margin:0 0 12px"><p class="hint" style="margin:0">' +
    'One snapshot is taken automatically each day you use the app, and they are kept on this device. ' +
    'Restoring replaces what is here now, so export a backup first if you are unsure.</p></div>' +
    (snaps.length
      ? '<div class="card list" style="padding:6px 0">' + snaps.map(s =>
          '<div class="lrow" data-snap="' + esc(s.date) + '"><div class="lmain">' +
          '<div class="ltitle">' + esc(fmtDayLong(s.date)) + '</div>' +
          '<div class="lsub">' + s.count + ' entries · saved ' + esc(tAgo(s.at)) + '</div></div>' +
          '<span class="rval">' + ico('chevR') + '</span></div>').join('') + '</div>'
      : '<div class="card"><div class="emptystate" style="padding:24px 12px"><b>No snapshots yet</b>' +
        '<p>One is taken each day you use the app.</p></div></div>') +
    '<div class="rowgap"><button class="btn ghost btnblock" onclick="closeSheet()">Close</button></div>');
  $$('#sheet [data-snap]').forEach(r => r.onclick = async () => {
    const ok = await restoreSnapshot(r.dataset.snap);
    closeSheet();
    if (ok) { toast('Restored that copy'); route(); } else toast('That copy could not be read');
  });
}

boot();

/* ============================================================
   VOICE ENTRY — speak an expense, it fills the form
   Rule-based understanding: amount (incl. k / lakh / crore and
   word numbers), category from ~180 keyword synonyms, date
   ("yesterday", "3 days ago", "last friday"), income vs expense,
   and the account if it was mentioned.
   ============================================================ */

const VOICE_CATS = {
  food: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'snacks', 'coffee', 'tea', 'chai', 'restaurant', 'cafe', 'swiggy', 'zomato', 'pizza', 'burger', 'meal', 'biryani', 'dosa', 'idli', 'hotel', 'juice', 'icecream', 'cake', 'canteen', 'tiffin', 'eat', 'samosa', 'vada', 'thali', 'beverage'],
  grocery: ['grocery', 'groceries', 'vegetable', 'vegetables', 'milk', 'eggs', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'provisions', 'ration', 'fruit', 'fruits', 'kirana', 'atta', 'rice', 'oil', 'dal', 'bread', 'curd'],
  transport: ['uber', 'ola', 'auto', 'taxi', 'cab', 'petrol', 'diesel', 'fuel', 'metro', 'bus', 'toll', 'parking', 'rapido', 'rickshaw', 'cng', 'bike', 'train ticket', 'ticket', 'travel fare'],
  shopping: ['shopping', 'clothes', 'clothing', 'shirt', 'tshirt', 'shoes', 'amazon', 'flipkart', 'myntra', 'dress', 'jeans', 'electronics', 'mobile', 'phone', 'headphones', 'watch', 'saree', 'kurta', 'cosmetics', 'makeup'],
  bills: ['electricity', 'electric', 'water bill', 'gas bill', 'broadband', 'internet', 'wifi', 'recharge', 'postpaid', 'prepaid', 'dth', 'bill', 'utility', 'cylinder', 'lpg', 'gas'],
  rent: ['rent', 'landlord', 'maintenance', 'society', 'emi', 'home loan', 'hostel'],
  health: ['medicine', 'medicines', 'doctor', 'hospital', 'clinic', 'pharmacy', 'medical', 'lab', 'test', 'dentist', 'insurance', 'tablet', 'chemist', 'checkup', 'consultation'],
  fun: ['movie', 'movies', 'cinema', 'concert', 'game', 'games', 'party', 'entertainment', 'outing', 'picnic', 'pub', 'bar', 'beer', 'drinks', 'amusement', 'tickets'],
  edu: ['book', 'books', 'course', 'tuition', 'fees', 'school', 'college', 'class', 'stationery', 'exam', 'coaching', 'pen', 'notebook'],
  travel: ['travel', 'trip', 'flight', 'vacation', 'holiday', 'tour', 'visa', 'airbnb', 'resort', 'luggage', 'sightseeing'],
  subs: ['subscription', 'subscriptions', 'netflix', 'prime', 'spotify', 'hotstar', 'icloud', 'youtube premium', 'renewal', 'membership', 'gym membership', 'annual fee'],
  savings: ['savings', 'saving', 'invest', 'investment', 'sip', 'mutual fund', 'deposit', 'emergency fund', 'stocks', 'ppf', 'gold scheme'],
};
const VOICE_INCOME = ['salary', 'received', 'receive', 'credited', 'income', 'refund', 'cashback', 'bonus', 'interest', 'freelance', 'earned', 'earning', 'payout', 'money back', 'reimbursement', 'got paid', 'return'];
const VOICE_NUM_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};
const VOICE_FILLER = ['spent', 'spend', 'paid', 'pay', 'paying', 'bought', 'buy', 'purchase', 'purchased', 'for', 'on', 'at', 'to', 'the', 'a', 'an', 'of', 'my', 'i', 'me', 'add', 'added', 'expense', 'expenses', 'rs', 'inr', 'rupees', 'rupee', 'only', 'today', 'yesterday', 'cash', 'card', 'upi', 'bank', 'account', 'cost', 'costs', 'worth', 'total', 'via', 'using', 'from', 'with', 'got', 'get'];

function parseAmount(t) {
  // digit forms first: 500, 1,250, 1.2k, 2 thousand, 3 lakh, 1 crore, 5 hundred
  let m = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lac|lakhs|crore|cr|hundred|h)?\b/);
  if (m) {
    let v = parseFloat(m[1].replace(/,/g, ''));
    const unit = m[2] || '';
    if (unit === 'k' || unit === 'thousand') v *= 1000;
    else if (unit === 'hundred' || unit === 'h') v *= 100;
    else if (unit === 'lakh' || unit === 'lac' || unit === 'lakhs' || unit === 'l') v *= 100000;
    else if (unit === 'crore' || unit === 'cr') v *= 10000000;
    return { value: Math.round(v * 100) / 100, raw: m[0].trim() };
  }
  // word forms: "two hundred", "fifty", "one thousand five hundred"
  const words = t.split(/\s+/);
  let total = 0, cur = 0, matched = [];
  for (const w of words) {
    const n = VOICE_NUM_WORDS[w];
    if (!n) continue;
    matched.push(w);
    if (n === 100) cur = (cur || 1) * 100;
    else if (n === 1000) { total += (cur || 1) * 1000; cur = 0; }
    else cur += n;
  }
  const val = total + cur;
  if (val > 0) return { value: val, raw: matched.join(' ') };
  return null;
}
function parseVoiceDate(t) {
  const d = new Date();
  let m;
  if (/\bday before yesterday\b/.test(t)) return { date: ymd(addDays(d, -2)), raw: 'day before yesterday' };
  if (/\byesterday\b|\blast night\b/.test(t)) return { date: ymd(addDays(d, -1)), raw: 'yesterday' };
  if (/\btoday\b|\bthis morning\b|\btonight\b|\bjust now\b/.test(t)) return { date: ymd(d), raw: 'today' };
  if ((m = t.match(/(\d+)\s+days?\s+ago/))) return { date: ymd(addDays(d, -Math.min(365, +m[1]))), raw: m[0] };
  if (/\blast week\b/.test(t)) return { date: ymd(addDays(d, -7)), raw: 'last week' };
  if (/\blast month\b/.test(t)) { const x = addMonths(d, -1); return { date: ymd(new Date(x.getFullYear(), x.getMonth(), Math.min(d.getDate(), daysInMonth(x)))), raw: 'last month' }; }
  const wd = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if ((m = t.match(/\b(?:last|previous)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    const want = wd.indexOf(m[1]);
    let back = (d.getDay() - want + 7) % 7; if (back === 0) back = 7;
    return { date: ymd(addDays(d, -back)), raw: m[0] };
  }
  if ((m = t.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/))) {
    const day = Math.min(31, +m[1]);
    return { date: mkey(d) + '-' + pad2(day), raw: m[0] };
  }
  return null;
}
function parseVoice(raw) {
  const out = { type: 'exp', amt: null, cat: null, date: todayYmd(), note: '', acc: null, heard: String(raw || '').trim(), matched: [] };
  if (!out.heard) return out;
  let t = ' ' + out.heard.toLowerCase()
    .replace(/[₹$€£]/g, ' ')
    .replace(/[^\w\s.,]/g, ' ')
    .replace(/(\d)[,](?=\d\d\d)/g, '$1')   // 1,250 -> 1250
    .replace(/\s+/g, ' ')
    .trim() + ' ';

  const dt = parseVoiceDate(t);
  if (dt) { out.date = dt.date; out.matched.push(dt.raw); t = t.replace(dt.raw, ' '); }

  const am = parseAmount(t);
  if (am) { out.amt = am.value; out.matched.push(am.raw); t = t.replace(am.raw, ' '); }

  if (VOICE_INCOME.some(w => t.includes(' ' + w + ' '))) { out.type = 'inc'; out.matched.push('income'); }

  // category: longest keyword that appears wins
  let best = null, bestLen = 0;
  for (const id in VOICE_CATS) {
    if (!DB.cats.some(c => c.id === id)) continue;
    for (const kw of VOICE_CATS[id]) {
      if (t.includes(' ' + kw + ' ') && kw.length > bestLen) { best = id; bestLen = kw.length; }
    }
  }
  if (best) out.cat = best;
  else if (out.type === 'inc') out.cat = DB.cats.some(c => c.id === 'otherinc') ? 'otherinc'
                                : DB.cats.some(c => c.id === 'salary') ? 'salary' : null;

  const accs = DB.accounts;
  const find = re => { const a = accs.find(x => re.test(x.name.toLowerCase())); return a ? a.id : null; };
  if (/\bcash\b/.test(t)) out.acc = find(/cash/);
  else if (/\bcredit card\b|\bcard\b/.test(t)) out.acc = find(/card/);
  else if (/\bupi\b|\bgpay\b|\bgoogle pay\b|\bphonepe\b|\bpaytm\b/.test(t)) out.acc = find(/upi/);
  else if (/\bbank\b|\bnetbanking\b|\bnet banking\b/.test(t)) out.acc = find(/bank/);

  // note: whatever is left that is not filler
  let rest = t;
  out.matched.forEach(x => { rest = rest.replace(' ' + x + ' ', ' '); });
  VOICE_FILLER.forEach(w => { rest = rest.replace(new RegExp('\\b' + w + '\\b', 'g'), ' '); });
  rest = rest.replace(/\s+/g, ' ').trim();
  if (rest.length > 1) out.note = rest.split(' ').slice(0, 6).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  if (!out.note && out.cat) out.note = cat(out.cat).name;
  return out;
}

/* ---------- listening: native bridge first, Web Speech API as fallback ---------- */
function voiceStart(onText) {
  if (window.OneBudget && OneBudget.listen) {
    window.__voice = (ok, text) => {
      delete window.__voice;
      onText(ok ? text : null, ok ? null : text);
    };
    try { OneBudget.listen(); return true; }
    catch (e) { /* fall through to the web API */ }
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onText(null, 'Voice input is not available on this device.'); return false; }
  try {
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
    r.onresult = e => onText(e.results[0][0].transcript, null);
    r.onerror = e => onText(null, e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Could not hear anything. Try again.');
    r.onend = () => {};
    r.start();
    return true;
  } catch (e) { onText(null, 'Could not start the microphone.'); return false; }
}
function voiceSheet() {
  sheet(sheetHead('Speak to add') +
    '<div class="voicewrap" id="vwrap">' +
      '<button class="micbig" id="vmic">' + ico('mic') + '</button>' +
      '<div class="vstat" id="vstat">Listening… say something like “coffee 250”</div>' +
    '</div>' +
    '<div class="vhints"><span class="chip">“spent 450 on groceries”</span>' +
      '<span class="chip">“uber 180 yesterday”</span>' +
      '<span class="chip">“salary 85000 received”</span></div>' +
    '<div class="rowgap"><button class="btn ghost btnblock" id="vcancel">Cancel</button></div>');
  const setStat = (txt, cls) => { const e = $('#vstat'); if (e) { e.textContent = txt; e.className = 'vstat' + (cls ? ' ' + cls : ''); } };
  const go = () => {
    setStat('Listening… say something like “coffee 250”');
    const started = voiceStart((text, err) => {
      if (!text) { setStat(err || 'Could not hear anything. Tap the mic to try again.', 'bad'); const m = $('#vmic'); if (m) m.classList.remove('on'); return; }
      const p = parseVoice(text);
      const m = $('#vmic'); if (m) m.classList.remove('on');
      closeSheet();
      if (p.amt == null && !p.cat) { toast('Could not work that out — opening a blank entry'); txSheet(null, p.type, p.date); return; }
      txSheet(null, p.type, p.date, p);
      setTimeout(() => toast(p.amt != null ? 'Got it — check and tap ✓' : 'Add the amount and tap ✓'), 250);
    });
    const m = $('#vmic'); if (m && started) m.classList.add('on');
  };
  $('#vmic').onclick = go;
  $('#vcancel').onclick = closeSheet;
  go();
}


/* ============================================================
   BILL SCAN — read a photo of a bill or a payment screenshot
   The OCR itself runs natively (see ocr.js); this turns the raw
   text into an entry: total, date, merchant, category, income
   or expense, and the account it was paid from.
   ============================================================ */

const BILL_TOTAL_HINTS = [
  [/grand\s*total/i, 100], [/total\s*amount/i, 95], [/amount\s*payable/i, 92],
  [/net\s*amount/i, 88], [/balance\s*due/i, 88], [/total\s*payable/i, 86],
  [/amount\s*paid/i, 84], [/\bto\s*pay\b/i, 80], [/\btotal\b/i, 72], [/\bpayable\b/i, 62],
];
const BILL_SKIP = /gst|cgst|sgst|igst|vat|tax|discount|round\s*off|change|tender|item\s*count|qty|gstin|phone|mobile/i;
const BILL_INCOME = /\b(credited|credit|received|refund|cashback|reversal|money\s+back|reimburs|deposited|paid\s+to\s+you|you\s+received|success)\b/i;
const BILL_ACC = [[/\bpaid\s*by\s*upi\b|\bupi\b|\bgpay\b|\bgoogle\s*pay\b|\bphonepe\b|\bpaytm\b/i, /upi/],
                  [/\bcredit\s*card\b|\bdebit\s*card\b|\bcard\b|\bvisa\b|\bmastercard\b|\brupay\b/i, /card/],
                  [/\bcash\b/i, /cash/],
                  [/\bneft\b|\bimps\b|\bbank\b|\bnet\s*banking\b|\baccount\b/i, /bank/]];

function parseBillAmount(text) {
  const lines = String(text || '').split(/\r?\n/);
  let best = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || BILL_SKIP.test(line)) continue;
    let score = 0;
    for (const h of BILL_TOTAL_HINTS) { if (h[0].test(line)) { score = h[1]; break; } }
    if (!score) continue;
    const nums = line.match(/(?:₹|rs\.?|inr)?\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?/gi) || [];
    let val = null;
    for (let i = nums.length - 1; i >= 0; i--) {
      const v = parseFloat(nums[i].replace(/[^0-9.]/g, ''));
      if (v > 0 && v < 1e8) { val = v; break; }
    }
    if (val == null) continue;
    if (!best || score > best.score) best = { score, value: val };
  }
  if (best) return Math.round(best.value * 100) / 100;
  // no label found: the biggest number that looks like money
  const money = String(text).match(/(?:₹|rs\.?\s*)[0-9][0-9,]*(?:\.[0-9]{1,2})?/gi) || [];
  let max = null;
  money.forEach(m => { const v = parseFloat(m.replace(/[^0-9.]/g, '')); if (v && (!max || v > max)) max = v; });
  if (max) return Math.round(max * 100) / 100;
  const dec = String(text).match(/\b[0-9][0-9,]*\.[0-9]{2}\b/g) || [];
  dec.forEach(m => { const v = parseFloat(m.replace(/,/g, '')); if (v && (!max || v > max)) max = v; });
  return max ? Math.round(max * 100) / 100 : null;
}
function parseBillDate(text) {
  const t = String(text || '');
  let m = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (m) {
    let d = +m[1], mo = +m[2], y = +m[3];
    if (y < 100) y += 2000;
    if (mo > 12 && d <= 12) { const s = d; d = mo; mo = s; }
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) return y + '-' + pad2(mo) + '-' + pad2(d);
  }
  m = t.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{2,4})?\b/i);
  if (m) {
    const mi = MON3.findIndex(x => x.toLowerCase() === m[2].toLowerCase().slice(0, 3));
    const y = m[3] ? (+m[3] < 100 ? +m[3] + 2000 : +m[3]) : new Date().getFullYear();
    if (mi >= 0) return y + '-' + pad2(mi + 1) + '-' + pad2(+m[1]);
  }
  return null;
}
const BILL_NOT_NAME = /^(payment|transaction|success|successful|receipt|invoice|tax\s*invoice|bill|upi|order|thank\s*you|paid|received|credited|debited|amount|details|status)\b/i;
function parseBillMerchant(text) {
  const src = String(text || '');
  // a payment screenshot names the other person: "received from Rahul Sharma"
  const who = src.match(/\b(?:from|to)\s+([A-Z][A-Za-z.]{1,20}(?:\s+[A-Z][A-Za-z.]{1,20})?)/);
  if (who && !BILL_NOT_NAME.test(who[1])) {
    const nm = who[1].replace(/\s+(UPI|INR|NEFT|IMPS|Ref|Reference)$/i, '').replace(/\s{2,}/g, ' ').trim();
    if (nm) return nm.slice(0, 34);
  }
  const lines = src.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const l of lines.slice(0, 7)) {
    if (BILL_NOT_NAME.test(l)) continue;
    if (/gstin|gst\s*no|invoice|bill\s*no|tax|date|tel|phone|www\.|@|http/i.test(l)) continue;
    const letters = (l.match(/[A-Za-z]/g) || []).length;
    if (letters < 3) continue;
    if (/^[^A-Za-z]*$/.test(l)) continue;
    if (/\b(road|street|nagar|layout|sector|colony|cross|main|india|bengaluru|bangalore|mumbai|delhi|pune|chennai|hyderabad)\b/i.test(l)) continue;
    if ((l.match(/[0-9]/g) || []).length > letters) continue;
    return l.replace(/\s{2,}/g, ' ').replace(/[^A-Za-z0-9 &.'\-]/g, '').trim().slice(0, 34);
  }
  return '';
}
function parseBill(rawText) {
  const text = String(rawText || '');
  const out = { type: 'exp', amt: null, cat: null, date: todayYmd(), note: '', acc: null, heard: '', billText: text };
  const lower = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';

  out.amt = parseBillAmount(text);
  const d = parseBillDate(text);
  if (d) out.date = d;
  out.note = parseBillMerchant(text);

  // income or expense: a payment-received screenshot reads as income
  const looksIncome = BILL_INCOME.test(text) && !/\bpaid\s*by\b|\bamount\s*paid\b|\bgrand\s*total\b/i.test(text);
  if (looksIncome) out.type = 'inc';

  // category from the merchant and the line items
  let best = null, bestLen = 0;
  for (const id in VOICE_CATS) {
    if (!DB.cats.some(c => c.id === id)) continue;
    for (const kw of VOICE_CATS[id]) {
      const k = ' ' + kw + ' ';
      if (lower.indexOf(k) >= 0 && kw.length > bestLen) { best = id; bestLen = kw.length; }
    }
  }
  if (best) out.cat = best;
  else if (out.type === 'inc') out.cat = DB.cats.some(c => c.id === 'otherinc') ? 'otherinc' : null;

  for (const [re, accRe] of BILL_ACC) {
    if (re.test(text)) { const a = DB.accounts.find(x => accRe.test(x.name.toLowerCase())); if (a) { out.acc = a.id; break; } }
  }
  if (!out.note && out.cat) out.note = cat(out.cat).name;

  const bits = [];
  if (out.note) bits.push(out.note);
  if (out.amt != null) bits.push(money(out.amt));
  bits.push(fmtDay(out.date));
  out.heard = bits.join(' · ');
  return out;
}

/* ---------- camera / gallery ---------- */
function billStart(source, onDone) {
  const bridge = window.OneBudget;
  if (bridge && (source === 'camera' ? bridge.scanBill : bridge.pickBill)) {
    window.__bill = (ok, payload) => {
      delete window.__bill;
      onDone(ok ? payload : null, ok ? null : payload);
    };
    try { source === 'camera' ? bridge.scanBill() : bridge.pickBill(); return true; }
    catch (e) { /* fall through */ }
  }
  // browser fallback: a plain file input
  if (source === 'gallery') {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) { onDone(null, 'No image picked'); return; }
      const r = new FileReader();
      r.onload = () => onDone(String(r.result), null);
      r.readAsDataURL(f);
    };
    inp.click();
    return true;
  }
  onDone(null, 'The camera is only available in the Android app.');
  return false;
}
function photoSheet() {
  sheet(sheetHead('Scan a bill') +
    '<div class="scanswrap" id="swrap">' +
      '<div class="scanico" id="sico">' + ico('camera') + '</div>' +
      '<div class="vstat" id="sstat">Point at a bill, receipt or a payment screenshot. The text is read on this device — nothing is uploaded.</div>' +
    '</div>' +
    '<div class="rowgap">' +
      '<button class="btn primary btnblock" id="sCam">' + ico('camera') + '  Take a photo</button>' +
      '<button class="btn ghost btnblock" id="sPick">' + ico('image') + '  Choose an image</button>' +
      '<button class="btn ghost btnblock" id="sCancel">Cancel</button>' +
    '</div>');
  const setStat = (t, cls) => { const e = $('#sstat'); if (e) { e.textContent = t; e.className = 'vstat' + (cls ? ' ' + cls : ''); } };
  const busy = () => {
    const i = $('#sico'); if (i) i.classList.add('busy');
    setStat('Reading the bill… this takes a few seconds the first time.');
    const c = $('#sCam'), p = $('#sPick'); if (c) c.disabled = true; if (p) p.disabled = true;
  };
  const handle = (dataUrl, err) => {
    if (!dataUrl) { const i = $('#sico'); if (i) i.classList.remove('busy'); setStat(err || 'Could not read that image.', 'bad'); const c = $('#sCam'), p = $('#sPick'); if (c) c.disabled = false; if (p) p.disabled = false; return; }
    busy();
    readBill(dataUrl, (ok, text) => {
      if (!ok) { const i = $('#sico'); if (i) i.classList.remove('busy'); setStat(text || 'Could not read the text in that image.', 'bad'); const c = $('#sCam'), p = $('#sPick'); if (c) c.disabled = false; if (p) p.disabled = false; return; }
      const p = parseBill(text);
      closeSheet();
      if (p.amt == null && !p.cat) { toast('Could not find an amount — opening a blank entry'); txSheet(null, p.type, p.date); return; }
      txSheet(null, p.type, p.date, p);
      setTimeout(() => toast(p.amt != null ? 'Bill read — check and tap ✓' : 'Add the amount and tap ✓'), 250);
    });
  };
  $('#sCam').onclick = () => billStart('camera', handle);
  $('#sPick').onclick = () => billStart('gallery', handle);
  $('#sCancel').onclick = closeSheet;
}
/* OCR: native hidden WebView first, in-page tesseract as a fallback */
function readBill(dataUrl, cb) {
  if (window.OneBudget && OneBudget.ocr) {
    window.__ocr = (ok, text) => { delete window.__ocr; cb(ok, text); };
    try { OneBudget.ocr(dataUrl); return; } catch (e) { }
  }
  if (typeof Tesseract === 'undefined') { cb(false, 'Reading bills is only available in the Android app.'); return; }
  (async () => {
    try {
      const w = await Tesseract.createWorker('eng', 1, {
        workerPath: 'vendor/worker.min.js', corePath: 'vendor/', langPath: 'vendor/', gzip: false,
      });
      const res = await w.recognize(dataUrl);
      cb(true, (res && res.data && res.data.text) || '');
    } catch (e) { cb(false, String((e && e.message) || e)); }
  })();
}


/* ============================================================
   ON-DEVICE INSIGHT ENGINE
   Reads today's data and writes a plain-language summary plus
   the "demographics" of the day's spending. Everything here runs
   on the phone: no network, no key, nothing uploaded. If you add
   your own model endpoint in Settings, the same facts are sent
   there instead — and if that fails it silently falls back here.
   ============================================================ */

function hourOf(t) { const h = parseInt(String(t.time || '12:00').slice(0, 2), 10); return isNaN(h) ? 12 : h; }
function dayPartOf(h) { return h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; }
const DAY_PART_LABEL = { morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'late night' };

function todayFacts() {
  const iso = todayYmd();
  const yIso = ymd(addDays(new Date(), -1));
  const tx = DB.tx.filter(t => t.date === iso);
  const exp = tx.filter(t => t.type === 'exp');
  const spent = sumType(tx, 'exp'), inc = sumType(tx, 'inc');
  const ySpent = DB.tx.filter(t => t.type === 'exp' && t.date === yIso).reduce((a, t) => a + (+t.amt || 0), 0);
  const key = mkey(new Date());
  const st = monthStats(key);
  const cats = byCat(tx, 'exp');
  const catList = Object.entries(cats).sort((a, c) => c[1] - a[1]);
  const parts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  exp.forEach(t => { parts[dayPartOf(hourOf(t))] += (+t.amt || 0); });
  const partList = Object.entries(parts).sort((a, c) => c[1] - a[1]);
  const accs = {};
  exp.forEach(t => { const k = t.acc || 'none'; accs[k] = (accs[k] || 0) + (+t.amt || 0); });
  const accList = Object.entries(accs).sort((a, c) => c[1] - a[1]);
  const hours = {};
  exp.forEach(t => { const h = hourOf(t); hours[h] = (hours[h] || 0) + (+t.amt || 0); });
  const busiestHour = Object.entries(hours).sort((a, c) => c[1] - a[1])[0];
  const biggest = exp.slice().sort((a, b) => b.amt - a.amt)[0];
  const avg = st.daily || 0;
  const dim = daysInMonth(new Date());
  const daysGone = new Date().getDate();
  return {
    iso, yIso, tx, exp, spent, inc, ySpent, avg, st, catList, parts, partList, accList,
    busiestHour: busiestHour ? { hour: +busiestHour[0], amt: busiestHour[1] } : null,
    biggest, count: tx.length, expCount: exp.length,
    ratio: avg > 0 ? spent / avg : 0,
    projection: daysGone > 0 ? (st.spent / daysGone) * dim : 0,
    streak: (() => { let n = 0; for (let i = 0; i < 60; i++) { const d = ymd(addDays(new Date(), -i)); if (DB.tx.some(t => t.date === d)) n++; else if (i > 0) break; } return n; })(),
  };
}

/* a small, readable summary written from those facts */
function localSummary(f) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const s = [];
  const catName = id => cat(id).name;

  if (!f.count) {
    s.push(greet + '. Nothing recorded yet today.');
    if (f.avg > 0) s.push('Your average day comes to ' + money(f.avg) + ', so a quiet start keeps you ahead.');
    if (f.streak > 1) s.push('You have logged something ' + f.streak + ' days running — keep the streak going.');
    return s.join(' ');
  }
  if (!f.expCount) {
    s.push(greet + '. No spending today — only income of ' + money(f.inc) + ' came in.');
    return s.join(' ');
  }

  s.push(greet + '. You have spent ' + money(f.spent) + ' today across ' + f.expCount + ' entr' + (f.expCount === 1 ? 'y' : 'ies') + '.');
  if (f.avg > 0) {
    const r = f.ratio;
    s.push(r >= 1.8 ? 'That is about ' + r.toFixed(1) + '× your usual ' + money(f.avg) + ' a day — a heavy one.'
      : r >= 1.1 ? 'That is a little above your usual ' + money(f.avg) + '.'
      : r >= 0.7 ? 'That is close to your usual ' + money(f.avg) + '.'
      : 'That is comfortably below your usual ' + money(f.avg) + '.');
  }
  if (f.catList.length) {
    const [id, v] = f.catList[0];
    const share = f.spent > 0 ? Math.round((v / f.spent) * 100) : 0;
    s.push(catName(id) + ' leads at ' + money(v) + (f.catList.length > 1 ? ' (' + share + '% of the day)' : '') + '.');
  }
  if (f.partList[0] && f.partList[0][1] > 0) {
    s.push('Most of it happened in the ' + DAY_PART_LABEL[f.partList[0][0]] + '.');
  }
  if (f.biggest && f.spent > 0 && f.biggest.amt / f.spent >= 0.4 && f.expCount > 1) {
    s.push('One entry — ' + (f.biggest.note || catName(f.biggest.cat)) + ' at ' + money(f.biggest.amt) + ' — made up ' + Math.round((f.biggest.amt / f.spent) * 100) + '% of it.');
  }
  if (f.ySpent > 0) {
    s.push(f.spent > f.ySpent ? 'Yesterday was lighter at ' + money(f.ySpent) + '.'
      : 'That is below yesterday\u2019s ' + money(f.ySpent) + '.');
  } else {
    s.push('Nothing was recorded yesterday, so this is a fresh start.');
  }
  if (f.projection > 0) s.push('At this pace ' + monthLabel(new Date()) + ' lands near ' + money(f.projection) + '.');
  return s.join(' ');
}

/* the facts, as a compact prompt for a model — used only if a key is set */
function aiPrompt(f) {
  return 'You are a friendly personal-finance assistant inside a phone expense app. '
    + 'Write a short, warm, specific summary (3-4 sentences, no bullet points, no markdown) of the user\'s spending today, '
    + 'then one practical suggestion. Use the currency symbol ' + (DB.settings.currency || '\u20B9') + '. Facts: '
    + JSON.stringify({
        today_spent: Math.round(f.spent), today_income: Math.round(f.inc), entries: f.expCount,
        daily_average: Math.round(f.avg), ratio_to_average: +f.ratio.toFixed(2),
        by_category: f.catList.map(([id, v]) => ({ category: cat(id).name, amount: Math.round(v) })),
        by_time_of_day: f.parts, by_account: f.accList.map(([id, v]) => ({ account: (acct(id) || { name: 'unassigned' }).name, amount: Math.round(v) })),
        biggest_entry: f.biggest ? { note: f.biggest.note || cat(f.biggest.cat).name, amount: Math.round(f.biggest.amt) } : null,
        yesterday_spent: Math.round(f.ySpent), month_to_date: Math.round(f.st.spent),
        projected_month: Math.round(f.projection),
      });
}

/* local first; the user's own model only if they configured one */
async function aiGenerate(f) {
  const ai = DB.settings.ai || {};
  const local = localSummary(f);
  if (!ai.url || !ai.key) return { text: local, source: 'on-device' };
  try {
    const body = {
      model: ai.model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You write short, friendly spending summaries.' },
                 { role: 'user', content: aiPrompt(f) }],
      temperature: 0.6, max_tokens: 220,
    };
    const r = await fetch(ai.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ai.key },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const text = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
    if (!text) throw new Error('empty reply');
    return { text: text.trim(), source: ai.model || 'your model' };
  } catch (e) {
    return { text: local, source: 'on-device', error: String(e.message || e) };
  }
}

/* ============================================================
   TODAY TAB
   ============================================================ */
let TODAY_AI = null;

function renderToday() {
  const f = todayFacts();
  head('Today', fmtDayLong(todayYmd()));

  let html = '';

  /* ---- the written summary ---- */
  const src = TODAY_AI ? TODAY_AI.source : 'on-device';
  html += '<div class="card aicard">' +
    '<div class="aihead">' + ico('spark') + '<b>Summary</b>' +
      '<span class="aibadge" id="aiSrc">' + esc(src === 'on-device' ? 'on-device' : 'AI') + '</span></div>' +
    '<p class="aitext" id="aiText">' + esc(TODAY_AI ? TODAY_AI.text : localSummary(f)) + '</p>' +
    '<div class="aifoot">' +
      '<button class="linkbtn" id="aiAgain">Rewrite</button>' +
      '<button class="linkbtn" data-more="ai">AI settings</button>' +
    '</div>' +
    (TODAY_AI && TODAY_AI.error ? '<p class="hint" style="margin-top:6px">Your model did not answer (' + esc(TODAY_AI.error) + '), so this was written on the device.</p>' : '') +
  '</div>';

  /* ---- today's numbers ---- */
  html += '<div class="kpis">' +
    '<div class="kpi"><div class="klabel">' + ico('down') + 'Spent today</div>' +
      '<div class="kval num">' + esc(money(f.spent)) + '</div>' +
      '<div class="ksub">' + (f.avg > 0 ? (f.ratio >= 1 ? '+' : '') + Math.round((f.ratio - 1) * 100) + '% vs usual' : 'no average yet') + '</div></div>' +
    '<div class="kpi"><div class="klabel">' + ico('layers') + 'Entries</div>' +
      '<div class="kval num">' + f.expCount + '</div>' +
      '<div class="ksub">' + (f.inc > 0 ? 'income ' + esc(moneyShort(f.inc)) : 'no income today') + '</div></div>' +
    '<div class="kpi"><div class="klabel">' + ico('spark') + 'Biggest</div>' +
      '<div class="kval num">' + esc(f.biggest ? money(f.biggest.amt) : '—') + '</div>' +
      '<div class="ksub">' + esc(f.biggest ? (f.biggest.note || cat(f.biggest.cat).name).slice(0, 18) : 'nothing yet') + '</div></div>' +
    '<div class="kpi"><div class="klabel">' + ico('trend') + 'Month pace</div>' +
      '<div class="kval num">' + esc(moneyShort(f.projection)) + '</div>' +
      '<div class="ksub">projected total</div></div>' +
    '</div>';

  if (!f.expCount) {
    html += '<div class="card"><div class="emptystate"><span class="catico">' + ico('calendar') + '</span>' +
      '<b>No spending recorded today</b><p>Add an expense by typing it, speaking it, or photographing a bill — it takes a few seconds.</p>' +
      '<div class="rowgap"><button class="btn primary btnblock" id="tdType">Type an expense</button>' +
      '<button class="btn ghost btnblock" id="tdSpeak">' + ico('mic') + '  Speak it</button>' +
      '<button class="btn ghost btnblock" id="tdScan">' + ico('camera') + '  Scan a bill</button></div></div></div>';
  } else {
    /* ---- demographics of today's spending ---- */
    html += '<div class="sect">Today&rsquo;s spending, broken down</div>';

    /* where it went */
    if (f.catList.length) {
      html += '<div class="card"><div class="sumlabel">' + ico('layers') + 'By category</div>' +
        '<div class="chartwrap">' + catBarRows(f.catList, f.catList.length) + '</div></div>';
    }

    /* when it happened */
    const total = f.spent || 1;
    const segs = ['morning', 'afternoon', 'evening', 'night'];
    const colors = { morning: '#F59E0B', afternoon: '#1B6EF3', evening: '#8B5CF6', night: '#334155' };
    html += '<div class="card"><div class="sumlabel">' + ico('clock') + 'When you spent it</div>' +
      '<div class="timebar">' + segs.map(k => {
        const w = (f.parts[k] / total) * 100;
        return w > 0 ? '<i style="width:' + w + '%;background:' + colors[k] + '"></i>' : '';
      }).join('') + '</div>' +
      '<div class="timelegend">' + segs.filter(k => f.parts[k] > 0).map(k =>
        '<div class="tlrow"><i style="background:' + colors[k] + '"></i><span>' + k[0].toUpperCase() + k.slice(1) + '</span>' +
        '<b class="num">' + esc(money(f.parts[k])) + '</b><em>' + Math.round((f.parts[k] / total) * 100) + '%</em></div>').join('') +
      '</div>' +
      (f.busiestHour ? '<div class="sumsub" style="margin-top:10px">Busiest hour: ' + esc(hourLabel(f.busiestHour.hour)) + ' · ' + esc(money(f.busiestHour.amt)) + '</div>' : '') +
      '</div>';

    /* how it was paid */
    if (f.accList.length > 1) {
      html += '<div class="card"><div class="sumlabel">' + ico('wallet') + 'How it was paid</div>' +
        donutHtml(f.accList.map(([id, v]) => { const a = acct(id); return { name: a ? a.name : 'Unassigned', value: v, color: a ? a.color : '#8A8A8A' }; }), moneyShort(f.spent), 'total') +
        '</div>';
    }

    /* the day, in order */
    const ordered = f.exp.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    html += '<div class="card"><div class="sumlabel">' + ico('list') + 'The day so far</div>' +
      '<div class="timeline">' + ordered.map(t => {
        const c = cat(t.cat);
        return '<div class="tlitem" data-tx="' + t.id + '">' +
          '<span class="tldot" style="background:' + c.color + '"></span>' +
          '<span class="tltime">' + esc(t.time || '') + '</span>' +
          '<span class="tlwhat"><b>' + esc(t.note || c.name) + '</b><em>' + esc(c.name) + '</em></span>' +
          '<b class="amt num">' + esc(money(t.amt)) + '</b></div>';
      }).join('') + '</div></div>';

    /* a couple of things worth knowing */
    const tips = todayTips(f);
    if (tips.length) {
      html += '<div class="card"><div class="sumlabel">' + ico('spark') + 'Worth knowing</div>' +
        tips.map(t => '<div class="tiprow">' + ico(t.icon) + '<span>' + t.text + '</span></div>').join('') + '</div>';
    }

    html += '<div class="rowgap">' +
      '<button class="btn primary btnblock" id="tdType">Add another expense</button>' +
      '<button class="btn ghost btnblock" id="tdSpeak">' + ico('mic') + '  Speak it</button>' +
      '<button class="btn ghost btnblock" id="tdScan">' + ico('camera') + '  Scan a bill</button>' +
    '</div>';
  }

  $('#view').innerHTML = html;
  const t1 = $('#tdType'), t2 = $('#tdSpeak'), t3 = $('#tdScan');
  if (t1) t1.onclick = () => txSheet(null, 'exp', todayYmd());
  if (t2) t2.onclick = voiceSheet;
  if (t3) t3.onclick = photoSheet;
  const ag = $('#aiAgain');
  if (ag) ag.onclick = async () => {
    const ff = todayFacts();
    TODAY_AI = null;
    const card = document.querySelector('.aicard');
    const p = $('#aiText');
    if (p) p.textContent = 'Thinking…';
    const out = await aiGenerate(ff);
    TODAY_AI = out;
    if (p) p.textContent = out.text;
    const b = $('#aiSrc'); if (b) b.textContent = out.source === 'on-device' ? 'on-device' : 'AI';
  };
  wireSheetTxRowsView();
}
function hourLabel(h) {
  const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 || 12;
  return hh + ' ' + ap + '–' + (h + 1 === 12 ? 12 : (h + 1) % 12 || 12) + ' ' + ((h + 1) >= 12 && (h + 1) < 24 ? 'PM' : h + 1 === 12 ? 'PM' : 'AM');
}
function todayTips(f) {
  const tips = [];
  const hour = new Date().getHours();
  if (f.avg > 0 && f.ratio >= 2) tips.push({ icon: 'bell', text: 'Today is already <b>' + f.ratio.toFixed(1) + '×</b> your usual day. Worth a look before you spend again.' });
  if (f.catList.length && f.spent > 0) {
    const [id, v] = f.catList[0];
    if (v / f.spent >= 0.6) tips.push({ icon: 'layers', text: '<b>' + cat(id).name + '</b> is ' + Math.round((v / f.spent) * 100) + '% of today. That is your pattern lately.' });
  }
  if (f.partList[0] && f.parts[f.partList[0][0]] > 0) {
    const part = f.partList[0][0];
    if (part === 'night') tips.push({ icon: 'clock', text: 'Most of today went out <b>late at night</b> — usually the easiest spending to trim.' });
    else tips.push({ icon: 'clock', text: 'Your spending clustered in the <b>' + DAY_PART_LABEL[part] + '</b> today.' });
  }
  const subs = DB.recurring.filter(r => r.active).length;
  if (subs) tips.push({ icon: 'repeat', text: 'You have <b>' + subs + ' recurring bills</b> running — that is ' + money(recurringMonthlyTotal()) + ' a month.' });
  if (f.streak > 2) tips.push({ icon: 'spark', text: 'Logged <b>' + f.streak + ' days in a row</b>. Streaks are what make this add up.' });
  if (hour >= 20 && f.expCount === 0) tips.push({ icon: 'check', text: 'A no-spend day so far — that is money kept.' });
  return tips.slice(0, 3);
}
function wireSheetTxRowsView() {
  $$('#view .tlitem').forEach(r => r.onclick = () => txDetail(r.dataset.tx));
}

/* ============================================================
   QUICK ADD
   One pop-up to pick what to add: the three input methods, the
   categories you use most, then every category there is.
   ============================================================ */
function quickAddSheet() {
  const freq = {};
  DB.tx.forEach(t => { freq[t.cat] = (freq[t.cat] || 0) + 1; });
  const recent = Object.entries(freq).sort((a, c) => c[1] - a[1]).slice(0, 6).map(([id]) => cat(id)).filter(Boolean);
  const all = DB.cats.slice();
  const cell = c => '<button class="qpick" data-qc="' + c.id + '">' +
    '<span class="qpickico" style="background:' + c.color + '22;color:' + c.color + '">' + ico(c.icon) + '</span>' +
    '<span class="qpickname">' + esc(c.name) + '</span></button>';

  const tpl = (DB.templates || []).slice(-6).reverse();
  sheet(sheetHead('Quick add') +
    (tpl.length ? '<div class="sect">Templates</div><div class="qgrid">' + tpl.map(t => {
      const c = cat(t.cat);
      return '<button class="qpick" data-tpl="' + t.id + '">' +
        '<span class="qpickico" style="background:' + hexA(c.color, .16) + ';color:' + c.color + '">' + ico(c.icon) + '</span>' +
        '<span class="qpickname">' + esc(t.note || c.name) + '</span>' +
        '<span class="qpickamt">' + esc(money(t.amt)) + '</span></button>';
    }).join('') + '</div>' : '') +
    '<div class="qa-methods">' +
      '<button class="qam" id="qaType">' + ico('plus') + '<span>Type it</span></button>' +
      '<button class="qam" id="qaSpeak">' + ico('mic') + '<span>Speak it</span></button>' +
      '<button class="qam" id="qaScan">' + ico('camera') + '<span>Scan a bill</span></button>' +
    '</div>' +
    (recent.length ? '<div class="sect">Frequent</div><div class="qgrid">' + recent.map(cell).join('') + '</div>' : '') +
    '<div class="sect">All categories</div><div class="qgrid">' + all.map(cell).join('') + '</div>' +
    '<div class="rowgap"><button class="btn ghost btnblock" onclick="closeSheet()">Cancel</button></div>');

  $('#qaType').onclick = () => { closeSheet(); setTimeout(() => txSheet(null, 'exp', todayYmd()), 180); };
  $('#qaSpeak').onclick = () => { closeSheet(); setTimeout(voiceSheet, 200); };
  $('#qaScan').onclick = () => { closeSheet(); setTimeout(photoSheet, 200); };
  $$('#sheet [data-qc]').forEach(b => b.onclick = () => {
    const c = cat(b.dataset.qc);
    closeSheet();
    setTimeout(() => txSheet(null, c.kind === 'inc' ? 'inc' : 'exp', todayYmd(), { cat: c.id }), 180);
  });
  $$('#sheet [data-tpl]').forEach(b => b.onclick = () => {
    const t = (DB.templates || []).find(x => x.id === b.dataset.tpl);
    if (!t) return;
    closeSheet();
    setTimeout(() => txSheet(null, t.type || 'exp', todayYmd(), { cat: t.cat, amt: t.amt, note: t.note, acc: t.acc }), 180);
  });
}



/* ---------- net worth ---------- */
function netWorthNow() {
  const bal = accountBalances();
  const total = bal.reduce((a, x) => a + x.balance, 0);
  const assets = bal.filter(x => x.balance > 0).reduce((a, x) => a + x.balance, 0);
  const debts = bal.filter(x => x.balance < 0).reduce((a, x) => a + x.balance, 0);
  return { bal, total, assets, debts };
}
/* month-end net worth for the last n months, oldest first */
function netWorthSeries(n) {
  const out = [];
  const start = addMonths(new Date(), -(n - 1));
  for (let i = 0; i < n; i++) {
    const d = addMonths(start, i);
    const upto = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    let v = 0;
    DB.accounts.forEach(a => {
      v += (+a.opening || 0);
      DB.tx.forEach(t => {
        if (t.acc !== a.id || t.date > upto) return;
        v += t.type === 'inc' ? (+t.amt || 0) : -(+t.amt || 0);
      });
    });
    out.push({ key: mkey(d), label: MON3[d.getMonth()], value: Math.round(v) });
  }
  return out;
}
function netWorthSheet() {
  const nw = netWorthNow();
  const key = mkey(new Date());
  const st = monthStats(key);
  const series = netWorthSeries(6);
  const first = series.length ? series[0].value : 0;
  const delta = nw.total - first;
  sheet(sheetHead('Net worth') +
    '<div class="sumcard" style="margin:0 0 14px">' +
      '<div class="sumlabel">' + ico('wallet') + 'Everything you hold</div>' +
      '<div class="amt-hero num" style="font-size:34px;color:' + (nw.total < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(nw.total)) + '</div>' +
      '<div class="sumsub">' + esc(monthLabel(new Date())) + ' · ' + (delta >= 0 ? '+' : '') + esc(money(delta)) + ' since ' + esc(series.length ? series[0].label : '') + '</div>' +
    '</div>' +
    '<div class="kpis">' +
      '<div class="kpi"><div class="klabel">' + ico('up') + 'Assets</div><div class="kval num" style="color:var(--ok)">' + esc(money(nw.assets)) + '</div></div>' +
      '<div class="kpi"><div class="klabel">' + ico('down') + 'Owed</div><div class="kval num" style="color:' + (nw.debts < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(Math.abs(nw.debts))) + '</div></div>' +
    '</div>' +
    '<div class="card"><div class="sumlabel">' + ico('trend') + 'Over six months</div>' +
      '<div class="chartwrap">' + lineChart({ series: [{ name: 'Net worth', color: 'var(--accent)', values: series.map(s => s.value), fill: true }], labels: series.map(s => s.label), money: true }) + '</div>' +
    '</div>' +
    '<div class="card"><div class="sumlabel">' + ico('wallet') + 'Where it sits</div>' +
      nw.bal.map(a => '<div class="datarow"><span>' + esc(a.name) + '</span><b class="num" style="color:' + (a.balance < 0 ? 'var(--danger)' : 'var(--text)') + '">' + esc(money(a.balance)) + '</b></div>').join('') +
    '</div>' +
    '<div class="card"><div class="sumlabel">' + ico('layers') + 'This month</div>' +
      miniStatRow('Money in', money(st.income), 'var(--ok)') +
      miniStatRow('Money out', money(st.spent), 'var(--danger)') +
      miniStatRow('Kept', money(st.net), st.net >= 0 ? 'var(--ok)' : 'var(--danger)') +
    '</div>' +
    '<div class="rowgap"><button class="btn primary btnblock" data-go="#/accounts">Manage accounts</button>' +
    '<button class="btn ghost btnblock" onclick="closeSheet()">Done</button></div>');
  $$('#sheet [data-go]').forEach(b => b.onclick = () => { closeSheet(); go(b.dataset.go); });
}

/* ---------- AI settings ---------- */
function aiSheet() {
  const ai = DB.settings.ai || {};
  sheet(sheetHead('AI assistant') +
    '<div class="card" style="background:var(--chip);margin:0 0 12px">' +
      '<div class="sumlabel">' + ico('spark') + 'How this works</div>' +
      '<p class="hint" style="margin-top:10px">The summary on the Today tab is written <b>on this phone</b> from your own numbers — no account, no key, and it works with no internet at all. ' +
      'If you would rather use a model of your own, paste an OpenAI-compatible endpoint below and it will be used instead. Your key is stored only on this device.</p>' +
    '</div>' +
    '<label class="fldlabel">Endpoint URL</label>' +
    '<input id="aiUrl" class="fld" placeholder="https://api.example.com/v1/chat/completions" value="' + esc(ai.url || '') + '" spellcheck="false" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:14px">Model</label>' +
    '<input id="aiModel" class="fld" placeholder="gpt-4o-mini" value="' + esc(ai.model || '') + '" spellcheck="false" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:14px">API key</label>' +
    '<input id="aiKey" class="fld" type="password" placeholder="sk-…" value="' + esc(ai.key || '') + '" spellcheck="false" autocomplete="off">' +
    '<p class="hint">Leave these empty to keep using the on-device summary. Any OpenAI-compatible chat endpoint works.</p>' +
    '<div class="rowgap">' +
      '<button class="btn primary btnblock" id="aiSave">Save</button>' +
      ((ai.url || ai.key) ? '<button class="btn ghost btnblock" id="aiOff">Turn off and use on-device</button>' : '') +
    '</div>');
  $('#aiSave').onclick = () => {
    const url = $('#aiUrl').value.trim(), key = $('#aiKey').value.trim(), model = $('#aiModel').value.trim();
    DB.settings.ai = { url: url, key: key, model: model };
    save(); closeSheet();
    TODAY_AI = null;
    toast(url && key ? 'Your model will be used for summaries' : 'Using the on-device summary');
    if (currentRoute().render === renderToday) renderToday();
  };
  const off = $('#aiOff');
  if (off) off.onclick = () => { DB.settings.ai = { url: '', key: '', model: '' }; save(); TODAY_AI = null; closeSheet(); toast('Using the on-device summary'); if (currentRoute().render === renderToday) renderToday(); };
}
