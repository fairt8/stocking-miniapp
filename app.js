/* Stocking Telegram Mini App – UI v2. Static; reads data/*.json published by the VM (app/publisher.py). */
'use strict';
const tg = window.Telegram && window.Telegram.WebApp;
const inTG = !!(tg && tg.initData);
const tgv = v => inTG && tg.isVersionAtLeast && tg.isVersionAtLeast(v);
const D = {};
// web dashboard base: same origin when served by the VM (/app/), absolute when opened from the GitHub Pages mirror
const WEB = location.hostname.endsWith('github.io') ? 'https://193-123-188-152.sslip.io/' : '../';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem('stk_' + k)) ?? d; } catch (e) { return d; } },
             set(k, v) { try { localStorage.setItem('stk_' + k, JSON.stringify(v)); } catch (e) {} } };
const TZ = 'Africa/Lagos';
const fmtT = (iso, opt) => iso ? new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }, opt || {})).format(new Date(iso)) + ' WAT' : '–';
const fmtD = iso => iso ? new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) + ' WAT' : '–';
const lagosDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const num = (v, d = 2) => v == null || isNaN(v) ? '–' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const px = v => v == null ? '–' : (Math.abs(v) >= 1000 ? num(v, 2) : Math.abs(v) >= 1 ? num(v, Math.abs(v) >= 100 ? 2 : 2) : num(v, 4));
const usd = v => v == null ? '–' : (v >= 0 ? '+$' : '−$') + num(Math.abs(v), 2);
const money = v => v == null ? '–' : (v < 0 ? '−$' : '$') + num(Math.abs(v), 2);
const usd0 = v => v == null ? '–' : (v >= 0 ? '+$' : '−$') + num(Math.abs(v), 0);
const money0 = v => v == null ? '–' : (v < 0 ? '−$' : '$') + num(Math.abs(v), 0);
const sgn = (v, d = 2, suf = '') => v == null ? '–' : (v >= 0 ? '+' : '−') + num(Math.abs(v), d) + suf;
const cls = v => v == null ? '' : v >= 0 ? 'up' : 'dn';
const ago = iso => { const m = (Date.now() - new Date(iso)) / 60000; return m < 60 ? Math.max(0, Math.round(m)) + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const short = m => m < 60 ? Math.max(0, Math.round(m)) + 'm' : m < 2880 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd';
const until = iso => { const m = (new Date(iso) - Date.now()) / 60000; return m < 60 ? 'in ' + Math.max(0, Math.round(m)) + ' min' : m < 2880 ? 'in ' + Math.floor(m / 60) + ' h ' + Math.round(m % 60) + ' m' : 'in ' + Math.round(m / 1440) + ' d'; };
const SETUP = { A: { short: 'Primary A', chip: 'PRIMARY A' }, B: { short: 'Primary B', chip: 'PRIMARY B' }, S: { short: 'Secondary', chip: 'SECONDARY' } };
const REGION_CHIPS = [['US', 'US', c => c === 'US'], ['EU', 'Europe', c => (M()[c] || {}).region === 'Europe'], ['ASIA', 'Asia', c => (M()[c] || {}).region === 'Asia-Pacific']];

/* ---------------- theme + Telegram ---------------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const bg = t === 'light' ? '#f3f5fa' : '#0a0f1c';
  const mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = bg;
  try { if (tgv('6.1')) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } if (tgv('7.10')) tg.setBottomBarColor(bg); } catch (e) {}
}
const theme = () => LS.get('theme', null) || (inTG && tg.colorScheme === 'light' ? 'light' : 'dark');
applyTheme(theme());
if (tg) {
  tg.ready(); tg.expand();
  try { if (tgv('7.7')) tg.disableVerticalSwipes(); } catch (e) {}
  tg.onEvent('themeChanged', () => { if (!LS.get('theme', null)) applyTheme(theme()); if (location.hash.startsWith('#/s/')) render(); });
}
let mainBtnHandler = null;
function mainButton(text, fn) {
  if (!inTG || !tg.MainButton) return;
  if (mainBtnHandler) tg.MainButton.offClick(mainBtnHandler);
  mainBtnHandler = null;
  if (!text) { tg.MainButton.hide(); return; }
  mainBtnHandler = fn; tg.MainButton.setText(text); tg.MainButton.onClick(fn); tg.MainButton.show();
}
function backButton(show) { if (tgv('6.1') && tg.BackButton) show ? tg.BackButton.show() : tg.BackButton.hide(); }
if (tgv('6.1') && tg.BackButton) tg.BackButton.onClick(() => { history.length > 1 ? history.back() : (location.hash = '#/home'); });

function encodeCmd(cmd) {           // "/check 7203.T" -> "check_7203_T", "/scan US UK" -> "scan_US-UK"
  const [c, ...a] = cmd.trim().replace(/^\//, '').split(/\s+/);
  const v = { subscribe: 'sub', unsubscribe: 'unsub' }[c] || c;
  const args = a.map(x => x.replace(/[^A-Za-z0-9.\-]/g, '').replace(/\./g, '_'));
  return (args.length ? v + '_' + args.join(v === 'check' ? '' : '-') : v).slice(0, 64);
}
function haptic(t) { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(t || 'light'); } catch (e) {} }
function botCmd(cmd) {
  haptic('medium');
  const bot = (D.status && D.status.bot_username) || 'StockingTradeBot';
  if (inTG && !tg.initDataUnsafe.query_id && tg.sendData) { try { tg.sendData(JSON.stringify({ cmd })); return; } catch (e) {} }
  const url = `https://t.me/${bot}?start=${encodeCmd(cmd)}`;
  if (inTG && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
}
function openExt(url) { try { if (tg && tg.openLink && inTG) return tg.openLink(url); } catch (e) {} window.open(url, '_blank', 'noopener'); }
function toast(msg) {
  if (inTG && tg.showAlert) { try { return tg.showAlert(msg); } catch (e) {} }
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2500);
}

/* ---------------- data ---------------- */
async function load() {
  const t = Date.now();
  const names = ['status', 'signals', 'pnl', 'schedule', 'backtest', 'equity', 'positions'];
  await Promise.all(names.map(n => fetch(`data/${n}.json?t=${t}`).then(r => r.ok ? r.json() : null).then(j => D[n] = j).catch(() => D[n] = null)));
  if (!D.status) throw new Error('data not published yet');
  D.sigById = new Map((D.signals || []).map(s => [String(s.id), s]));
  liveBadge();
  $('#disc').innerHTML = '⚠️ ' + esc(D.status.disclaimer) + ' Data: ' + esc(D.status.data_source) + '. Paper-trade PnL is hypothetical. Updated ' + esc(fmtT(D.status.generated_at)) + '.';
}
function lastScanIso() { return ((D.status && D.status.last_scans) || []).map(s => s.finished).filter(Boolean).sort().pop(); }
function liveBadge() {
  const el = $('#live'); if (!el || !D.status) return;
  const iso = lastScanIso(); const m = iso ? (Date.now() - new Date(iso)) / 60000 : null;
  el.className = 'live' + (m == null || m > 180 ? ' stale' : '');
  el.querySelector('span').textContent = m == null ? 'Live' : 'Live · ' + short(m);
  el.title = 'Last scan finished ' + (iso ? fmtT(iso) : '–') + ' · data published ' + fmtT(D.status.generated_at);
}
const M = () => (D.status && D.status.markets) || {};
const REGIONS = ['Americas', 'Europe', 'Asia-Pacific'];
function marketMatch(code, f) {
  if (!f || f === 'all') return true;
  if (REGIONS.includes(f)) return (M()[code] || {}).region === f;
  return code === f;
}
function marketCodes(f) { return Object.keys(M()).filter(c => marketMatch(c, f)); }
function marketOptions(sel, withRegions = true) {
  let h = `<option value="all">All markets</option>`;
  if (withRegions) h += REGIONS.map(r => `<option value="${r}" ${sel === r ? 'selected' : ''}>${r === 'Americas' ? '🌎' : r === 'Europe' ? '🌍' : '🌏'} ${r}</option>`).join('');
  return h + Object.values(M()).map(m => `<option value="${m.code}" ${sel === m.code ? 'selected' : ''}>${m.flag} ${m.code} – ${esc(m.name)}</option>`).join('');
}

/* ---------------- shared components ---------------- */
let sparkN = 0;
function spark(curve, small) {
  const ys = (curve || []).map(p => p[1]).filter(v => v != null);
  if (ys.length < 2) return '';
  const w = 600, h = 120, pad = 6; let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const Y = y => pad + (hi - y) / (hi - lo) * (h - 2 * pad);
  const pts = ys.map((y, i) => `${(i * w / (ys.length - 1)).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const col = ys[ys.length - 1] >= ys[0] ? '#22c55e' : '#f43f5e', id = 'sg' + (++sparkN);
  return `<svg class="spark${small ? ' sm' : ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" y1="${Y(ys[0]).toFixed(1)}" x2="${w}" y2="${Y(ys[0]).toFixed(1)}" class="spark-base"/><polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${id})"/>
    <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}
const tile = (lab, val, c = '', extra = '') => `<div class="tile${extra}"><span>${lab}</span><b class="${c}">${val}</b></div>`;
const changeChip = (u, p) => `<span class="chip ${cls(u)}">${u >= 0 ? '▲' : '▼'} ${usd(u)}${p != null ? ' · ' + sgn(p, 2, '%') : ''}</span>`;
function strategyCard(s, detail) {
  const kv = (k, v, c = '') => `<div class="kv"><span>${k}</span><b class="${c}">${v}</b></div>`;
  return `<div class="card strat">
    <div class="st-h"><div><h3><span class="dot" style="background:${s.color}"></span>${esc(s.short)}</h3><div class="st-d">${esc(s.desc)}</div></div>
      <span class="chip ${cls(s.change_pct)}">${sgn(s.change_pct, 2, '%')}</span></div>
    <div class="eq"><div><div class="eyebrow">Equity</div><div class="big">${money(s.equity)}</div></div>
      <div class="side"><span class="${cls(s.realized)}">${usd(s.realized)}</span> <span class="mut">realized</span><br><span class="${cls(s.unrealized)}">${usd(s.unrealized)}</span> <span class="mut">open</span></div></div>
    ${spark(s.curve, true)}
    <div class="tiles">${tile('Win rate', s.win_rate == null ? '–' : num(s.win_rate, 1) + '%', '', ' lc')}${tile('Avg R', s.avg_r == null ? '–' : sgn(s.avg_r, 2, 'R'), cls(s.avg_r), ' lc')}${tile('Max DD', num(s.max_dd_pct, 2) + '%', '', ' lc')}
      ${tile('Open', s.open, '', ' lc')}${tile('Closed', s.closed, '', ' lc')}${tile('Balance', money0(s.balance), '', ' lc')}</div>
    ${detail ? `<div style="margin-top:12px">${kv('Run', esc(s.name))}${kv('Rule', esc(s.rule))}${kv('Since', fmtD(s.since))}
      ${kv('Realized', `${usd(s.realized)} · ${sgn(s.realized_pct, 2, '%')}`, cls(s.realized))}${kv('Unrealized', `${usd(s.unrealized)} · ${sgn(s.open_r, 1, 'R')}`, cls(s.unrealized))}
      ${kv('Expectancy', s.avg_r == null ? '–' : sgn(s.avg_r, 2, 'R'), cls(s.avg_r))}${kv('Profit factor', s.profit_factor == null ? '–' : num(s.profit_factor, 2))}
      ${kv('Max DD', `${num(s.max_dd_pct, 2)}% · ${money(s.max_dd_usd)}`)}${kv('Won / lost / expired', `${s.won} / ${s.lost} / ${s.expired}`)}</div>
      <div class="note" style="margin-top:8px">Backtest: ${esc(s.backtest)}</div>` : ''}
  </div>`;
}
function prog(t) {
  const last = t.exit_price ?? t.last_price ?? t.entry, buy = t.side === 'BUY';
  const span = buy ? t.target - t.stop : t.stop - t.target;
  const f = p => span ? Math.max(0, Math.min(100, ((buy ? p - t.stop : t.stop - p) / span) * 100)) : 50;
  return { e: f(t.entry), c: f(last) };
}
function detailHref(t) {
  const id = t.signal_id ?? t.id;
  return D.sigById && D.sigById.has(String(id)) ? `#/s/${id}` : `${WEB}ticker/${encodeURIComponent(t.ticker)}`;
}
function posCard(t) {
  const p = prog(t), up = p.c >= p.e, m = M()[t.market] || {};
  const lo = Math.min(p.e, p.c), w = Math.abs(p.c - p.e), setup = t.setup || (t.side === 'SELL' ? 'S' : 'B');
  const closed = t.status && t.status !== 'open';
  const href = detailHref(t);
  return `<div class="card pos">
    <div class="pos-h"><div style="min-width:0"><div class="pos-t"><span class="tk">${esc(t.ticker)}</span><span class="tag ${t.side === 'BUY' ? 'buy' : 'sell'}">${t.side}</span>
      <span class="tag ${setup}">${SETUP[setup].chip}</span>${t.pattern ? `<span class="tag">${esc(t.pattern)}</span>` : ''}${(t.top_patterns || []).length ? '<span class="tag top">🏆 TOP</span>' : ''}
      ${closed ? `<span class="tag ${t.status === 'won' ? 'buy' : t.status === 'lost' ? 'sell' : ''}">${esc(t.status.toUpperCase())}</span>` : ''}</div>
      <div class="pos-sub">${m.flag || ''} ${esc(t.market)} · ${esc(t.currency)} · ${esc((t.name || '').slice(0, 34))}</div></div>
      <div class="pos-r"><div class="R ${cls(t.r_mult)}">${sgn(t.r_mult, 2, 'R')}</div><div class="usd ${cls(t.pnl_usd)}">${usd(t.pnl_usd)}</div></div></div>
    <div class="lv"><div><span>Entry</span><b>${px(t.entry)}</b></div><div><span>Stop</span><b class="dn">${px(t.stop)}</b></div><div><span>Target</span><b class="up">${px(t.target)}</b></div></div>
    <div class="pbar" style="--e:${p.e.toFixed(1)}%"><div class="fill ${up ? 'up' : 'dn'}" style="left:${lo.toFixed(1)}%;width:${w.toFixed(1)}%"></div><div class="tick" style="left:${p.e.toFixed(1)}%"></div><div class="knob ${up ? '' : 'dn'}" style="left:${p.c.toFixed(1)}%"></div></div>
    <div class="plab"><span>SL</span><span class="e" style="left:${Math.min(85, Math.max(15, p.e)).toFixed(1)}%">entry</span><span>TP${t.rrr ? ' ' + t.rrr + 'R' : ''}</span></div>
    <div class="row between small mut" style="margin-top:6px"><span>${closed ? (esc(t.exit_reason || t.status) + (t.closed_bar ? ' · ' + esc(t.closed_bar) : '')) : 'Last ' + px(t.last_price) + ' · ' + (t.bars_held || 0) + ' sessions'}</span><span>${sgn(t.pnl_pct, 2, '%')}</span></div>
    <div class="links"><a class="btn" href="${href}">📊 Chart &amp; details</a>${t.om_url ? `<button class="btn" data-href="${esc(t.om_url)}">📈 OpenMarket ↗</button>` : ''}</div>
  </div>`;
}

/* ---------------- Home ---------------- */
function viewHome() {
  const E = D.equity;
  if (!E) return `<div class="card empty">Equity data isn't published yet; it appears after the next publish cycle.</div>`;
  const T = E.total, open = ((D.positions || {}).open || []);
  const top = [...open].sort((a, b) => (b.r_mult || 0) - (a.r_mult || 0)).slice(0, 4);
  return `<div class="hero">
      <div class="eyebrow">Total equity · ${E.strategies.length} strategies</div>
      <div class="big">${money(T.equity)}</div>
      <div class="chips">${changeChip(T.change_usd, T.change_pct)}<span class="chip">${T.open} open</span><span class="chip acc">paper</span></div>
      ${spark(T.curve)}
      <div class="tiles">${tile('Realized', usd0(T.realized), cls(T.realized))}${tile('Unrealized', usd0(T.unrealized), cls(T.unrealized))}${tile('Start', money0(T.start))}</div>
      <div class="note" style="margin-top:10px">Start = ${money0(E.bankroll_per_strategy)} paper bankroll per strategy · every signal is a ${money0(E.notional_usd)} paper trade · win rate ${T.win_rate == null ? '–' : num(T.win_rate, 1) + '%'} over ${T.closed} closed.</div>
    </div>
    <div class="sec"><h2>Strategies</h2><a href="#/pnl">Details ›</a></div>
    <div class="g2 g3">${E.strategies.map(s => strategyCard(s)).join('')}</div>
    <div class="sec"><h2>Top positions</h2><a href="#/positions">All ${open.length} ›</a></div>
    <div class="g2">${top.length ? top.map(posCard).join('') : '<div class="card empty">No open positions.</div>'}</div>
    ${latestAlerts()}`;
}
function latestAlerts() {
  const s = [...(D.signals || [])].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 3);
  if (!s.length) return '';
  return `<div class="sec"><h2>Latest alerts</h2><a href="#/alerts">All ›</a></div><div class="g2 g3">${s.map(sigCard).join('')}</div>`;
}

/* ---------------- Positions ---------------- */
const PF = Object.assign({ seg: 'open', setup: 'all', mkt: 'all', n: 30 }, LS.get('posf', {}));
function viewPositions() {
  const P = D.positions || {}, open = P.open || [], closed = P.closed || [];
  const mf = (REGION_CHIPS.find(x => x[0] === PF.mkt) || [])[2];
  const filt = l => l.filter(t => (PF.setup === 'all' || t.setup === PF.setup) && (!mf || mf(t.market)));
  const rows = filt(PF.seg === 'open' ? open : closed);
  const tot = filt(open).reduce((x, t) => x + (t.pnl_usd || 0), 0);
  const chip = (k, v, l) => `<button class="fc ${PF[k] === v ? 'on' : ''}" data-pf="${k}" data-v="${v}">${l}</button>`;
  return `<div class="seg"><button data-pf="seg" data-v="open" class="${PF.seg === 'open' ? 'on' : ''}">Open · ${open.length}</button><button data-pf="seg" data-v="closed" class="${PF.seg === 'closed' ? 'on' : ''}">Closed · ${closed.length}</button></div>
    <div class="fbar">${chip('setup', 'all', 'All')}${chip('setup', 'A', 'Primary A')}${chip('setup', 'B', 'Primary B')}${chip('setup', 'S', 'Secondary')}<span class="vsep"></span>
      ${REGION_CHIPS.map(([k, l]) => chip('mkt', k, l)).join('')}${PF.mkt !== 'all' ? chip('mkt', 'all', '✕') : ''}<span class="tot ${cls(tot)}">${usd(tot)} open</span></div>
    ${PF.seg === 'closed' ? `<div class="note" style="margin:-4px 2px 10px">Latest ${closed.length} closed trades. Full history: PnL tab and the web dashboard.</div>` : ''}
    <div class="g2">${rows.length ? rows.slice(0, PF.n).map(posCard).join('') : '<div class="card empty">Nothing matches these filters.</div>'}</div>
    ${rows.length > PF.n ? `<button class="btn full" id="more-pos" style="margin-top:12px">Show more (${rows.length - PF.n} left)</button>` : ''}`;
}

/* ---------------- Alerts (signal feed, all previous filters) ---------------- */
const F = Object.assign({ market: 'all', tier: 'all', action: 'all', conf: 0, ck: 0, days: 7, q: '', sort: 'conf' }, LS.get('filters', {}));
function viewAlerts() {
  const now = Date.now();
  let rows = (D.signals || []).filter(s => marketMatch(s.market, F.market) && (F.action === 'all' || s.action === F.action) &&
    (F.tier === 'all' || (F.tier === 'primary' ? s.tier === 'PRIMARY' : s.setup === F.tier)) &&
    s.confidence >= F.conf && (s.checklist_pass || 0) >= F.ck && (now - new Date(s.ts)) / 864e5 <= F.days &&
    (!F.q || (s.ticker + ' ' + (s.name || '')).toLowerCase().includes(F.q.toLowerCase())));
  const pr = s => s.tier === 'PRIMARY' ? 0 : 1;
  rows.sort(F.sort === 'new' ? (a, b) => b.ts.localeCompare(a.ts) || b.confidence - a.confidence : (a, b) => pr(a) - pr(b) || b.confidence - a.confidence || b.ts.localeCompare(a.ts));
  const nb = rows.filter(r => r.action === 'BUY').length, ns = rows.length - nb;
  const chips = (k, opts) => opts.map(([v, l]) => `<button class="fc ${String(F[k]) === String(v) ? 'on' : ''}" data-f="${k}" data-v="${v}">${l}</button>`).join('');
  return `<div class="fbar">${chips('tier', [['all', 'All tiers'], ['primary', '⭐ Primary'], ['A', 'Primary A'], ['B', 'Primary B'], ['S', 'Secondary']])}<span class="vsep"></span>${chips('action', [['all', 'All'], ['BUY', 'BUY'], ['SELL', 'SELL']])}</div>
    <details class="card" ${LS.get('fopen', false) ? 'open' : ''} id="fdet"><summary class="b">Filters <span class="mut small">· ${F.days} d · conf ${F.conf || 'any'} · ${F.market === 'all' ? 'all markets' : esc(F.market)}</span></summary>
      <div class="form" style="margin-top:10px">
        <label class="f">Market / region<select id="f-market">${marketOptions(F.market)}</select></label>
        <label class="f">Search<input id="f-q" placeholder="Ticker or name" value="${esc(F.q)}"></label>
        <label class="f">Min confidence<select id="f-conf">${[0, 50, 60, 70, 80].map(v => `<option value="${v}" ${F.conf == v ? 'selected' : ''}>${v ? v + '+' : 'Any'}</option>`).join('')}</select></label>
        <label class="f">Checklist score<select id="f-ck">${[0, 4, 5, 6].map(v => `<option value="${v}" ${F.ck == v ? 'selected' : ''}>${v ? v + '/6 or better' : 'Any'}</option>`).join('')}</select></label>
        <label class="f">Period<select id="f-days">${[[1, 'Last 24 h'], [3, '3 days'], [7, '7 days'], [14, '14 days']].map(([v, l]) => `<option value="${v}" ${F.days == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f">Sort<select id="f-sort"><option value="conf" ${F.sort === 'conf' ? 'selected' : ''}>Confidence</option><option value="new" ${F.sort === 'new' ? 'selected' : ''}>Newest</option></select></label>
      </div>
      <div class="note" style="margin-top:8px">⭐ <b>Primary A</b> = BUY + wide stop (≥1.5×ATR) · ⭐ <b>Primary B</b> = other BUYs · Secondary = SELL (negative in 2022-26 backtests) · 🏆 = top pattern. Labels only.</div>
    </details>
    <div class="note" style="margin:0 2px 10px">${rows.length} signals · ${rows.filter(r => r.setup === 'A').length} A · ${rows.filter(r => r.setup === 'B').length} B · <span class="BUY">${nb} BUY</span> · <span class="SELL">${ns} SELL</span></div>
    <div class="g2">${rows.length ? rows.slice(0, 120).map(sigCard).join('') : `<div class="card empty">No signals match these filters. The checklist is strict on purpose.</div>`}</div>`;
}
function tradeChip(t) {
  if (!t) return '';
  const lab = { open: 'open', won: 'won', lost: 'lost', expired: 'expired' }[t.status] || t.status;
  return `<span class="chip ${cls(t.pnl_pct)}" style="font-size:12px;padding:2px 8px">${lab} ${sgn(t.pnl_pct, 2, '%')}</span>`;
}
const tierTag = s => s.setup ? `<span class="tag ${s.setup}">${SETUP[s.setup].chip}</span>` : '';
const topTags = s => (s.top_patterns || []).map(t => `<span class="tag top">🏆 ${esc(t)}</span>`).join(' ');
function sigCard(s) {
  return `<a class="card pos" href="#/s/${s.id}">
    <div class="pos-h"><div style="min-width:0"><div class="pos-t"><span class="tk">${esc(s.ticker)}</span><span class="tag ${s.action === 'BUY' ? 'buy' : 'sell'}">${s.action}</span>${tierTag(s)}${(s.pattern || s.candle) ? `<span class="tag">${esc(s.pattern || s.candle)}</span>` : ''}${topTags(s)}${s.candle_closed ? '' : '<span class="tag prov">provisional</span>'}</div>
      <div class="pos-sub">${s.flag} ${esc(s.market)} · ${esc(s.currency)} · ${esc((s.name || '').slice(0, 34))}</div></div>
      <div class="pos-r"><div class="R">${s.confidence}</div><div class="usd mut">conf · ${s.checklist_pass}/6</div></div></div>
    <div class="lv"><div><span>Entry</span><b>${px(s.entry)}</b></div><div><span>Stop</span><b class="dn">${px(s.stop)}</b></div><div><span>Target</span><b class="up">${px(s.target)}</b></div></div>
    <div class="row between small" style="margin-top:10px"><span class="mut">${fmtT(s.ts)}${s.stop_atr != null ? ' · stop ' + s.stop_atr + '×ATR' : ''}</span><span>RRR ${s.rrr} ${tradeChip(s.trade)}</span></div></a>`;
}

/* ---------------- signal detail ---------------- */
function viewDetail(id) {
  const s = D.sigById && D.sigById.get(String(id));
  if (!s) return `<div class="card empty">Signal not found in the published data.</div>`;
  const t = s.trade, f = s.fundamentals || {};
  return `<div class="card">
    <div class="pos-h"><div><div class="pos-t"><span class="tk" style="font-size:24px">${s.flag} ${esc(s.ticker)}</span><span class="tag ${s.action === 'BUY' ? 'buy' : 'sell'}">${s.action}</span>${tierTag(s)}${topTags(s)}</div>
      <div class="pos-sub">${esc(s.name || '')} · ${esc(s.sector || '')}</div>
      <div class="pos-sub">${esc(s.exchange)} (${s.market}) · prices in ${esc(s.currency)} · bar ${esc(s.bar_date)}${s.candle_closed ? '' : ' · <b>provisional</b> (candle not closed)'}</div></div>
      <div class="pos-r"><div class="R">${s.confidence}</div><div class="usd mut">confidence</div></div></div>
    <div class="note" style="margin-top:6px">${esc(s.setup_name || '')}</div>
    <div class="tiles">${tile('Entry', px(s.entry))}${tile('Stop', px(s.stop), 'dn')}${tile('Target', px(s.target), 'up')}${tile('RRR', s.rrr)}${tile('Checklist', s.checklist_pass + '/6')}${tile('Fund score', s.fund_score ?? '–')}</div>
    <div class="note" style="margin-top:8px">Signalled ${fmtT(s.ts)}${s.rsi != null ? ' · RSI ' + s.rsi : ''}${s.atr != null ? ' · ATR ' + px(s.atr) : ''}</div>
  </div>
  <div class="card"><div class="row between"><b>Chart</b><span class="mut small">daily · last 120 bars</span></div><div id="chart"></div>
    ${s.om_url ? `<button class="btn full" data-href="${esc(s.om_url)}" style="margin:8px 0">📈 Open ${esc(s.ticker)} in OpenMarket ↗</button>` : ''}
    <div class="note">Lines: <span style="color:#60a5fa">entry</span>, <span class="dn">stop</span>, <span class="up">target</span>, dashed grey = support/resistance, dashed amber = supply/demand zones.</div></div>
  <div class="card"><b>Paper trade</b>${t ? `
    <div class="tiles">${tile('Status', esc(t.status))}${tile('PnL %', sgn(t.pnl_pct, 2, '%'), cls(t.pnl_pct))}${tile('R', sgn(t.r_mult, 2, 'R'), cls(t.r_mult))}
    ${tile('PnL $', usd(t.pnl_usd), cls(t.pnl_usd))}${tile(t.exit_price != null ? 'Exit' : 'Last', px(t.exit_price ?? t.last_price))}${tile('Sessions', t.bars_held ?? 0)}</div>
    ${t.status === 'open' ? (() => { const p = prog({ ...s, ...t, side: s.action }), up = p.c >= p.e; return `<div class="pbar" style="--e:${p.e}%"><div class="fill ${up ? 'up' : 'dn'}" style="left:${Math.min(p.e, p.c)}%;width:${Math.abs(p.c - p.e)}%"></div><div class="tick" style="left:${p.e}%"></div><div class="knob ${up ? '' : 'dn'}" style="left:${p.c}%"></div></div><div class="plab"><span>SL</span><span>TP</span></div>`; })() : ''}
    <div class="note" style="margin-top:6px">${t.exit_reason ? esc(t.exit_reason) + ' on ' + esc(t.closed_bar) : 'Last bar ' + esc(t.last_bar || '')} · $${num(D.pnl ? D.pnl.notional_usd : 1000, 0)} notional, expires after ${D.pnl ? D.pnl.expire_days : 10} sessions</div>` : '<div class="note">No paper trade yet.</div>'}</div>
  <div class="card"><b>Zerodha Varsity checklist (${s.checklist_pass}/6)</b>
    ${(s.checklist || []).map(c => `<div class="ck"><div>${c.pass ? '✅' : '❌'}</div><div><div class="small b">${c.n}. ${esc(c.item)}</div><div class="small mut">${esc(c.detail)}</div></div></div>`).join('')}</div>
  <div class="card"><b>Why</b><ul class="small" style="padding-left:18px;margin:6px 0">${(s.reasons || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    ${s.position_note ? `<div class="note">${esc(s.position_note)}</div>` : ''}</div>
  <div class="card"><div class="row between"><b>Fundamentals</b><span class="small">${f.score ?? '–'} · ${esc(f.verdict || 'n/a')}</span></div>
    <div class="tscroll"><table><tr><th>Metric</th><th>Value</th><th>Grade</th><th>Rule</th></tr>
    ${(f.metrics || []).map(m => `<tr><td>${esc(m.metric)}</td><td>${esc(m.display)}</td><td class="${m.grade === 'buy' ? 'up' : m.grade === 'avoid' ? 'dn' : ''}">${esc(m.grade)}</td><td class="mut">${esc(m.rule || '')}</td></tr>`).join('')}</table></div>
    ${(f.notes || []).map(n => `<div class="small mut">• ${esc(n)}</div>`).join('')}</div>
  ${(s.levels || []).length ? `<div class="card"><b>Support / resistance</b><div class="small" style="margin-top:4px">${s.levels.map(l => `${px(l.price)} <span class="mut">(${l.touches}×)</span>`).join(' · ')}</div>
  ${(s.zones || []).length ? `<div class="small mut" style="margin-top:4px">Zones: ${s.zones.map(z => `${z.type} ${z.pattern} ${px(z.distal)}–${px(z.proximal)}${z.fresh ? ' (fresh)' : ''}`).join(' · ')}</div>` : ''}</div>` : ''}
  <div class="card" style="display:grid;gap:8px"><button class="btn pri full" data-cmd="/check ${esc(s.ticker)}">🔎 Live re-check ${esc(s.ticker)} in the bot</button>
    <button class="btn full" data-cmd="/scan ${s.market}">🔄 Scan ${s.flag} ${s.market} now</button><a class="btn full" href="${WEB}ticker/${encodeURIComponent(s.ticker)}">🖥 Full analysis on the web dashboard</a></div>`;
}
function css(v, d) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d; }
async function drawChart(s) {
  const el = $('#chart'); if (!el || !window.LightweightCharts) return;
  let bars;
  try { bars = await fetch('data/' + s.chart + '?t=' + Date.now()).then(r => r.ok ? r.json() : null); } catch (e) {}
  if (!bars || !bars.length) { el.innerHTML = '<div class="empty small">No chart data published for this ticker.</div>'; return; }
  const tx = css('--tx', '#e8edf7'), sep = 'rgba(127,127,127,.15)';
  const ch = LightweightCharts.createChart(el, { height: 300, width: el.clientWidth, layout: { background: { type: 'solid', color: 'transparent' }, textColor: tx, fontSize: 11 },
    grid: { vertLines: { color: sep }, horzLines: { color: sep } }, rightPriceScale: { borderColor: sep }, timeScale: { borderColor: sep }, handleScroll: true, handleScale: true });
  const c = ch.addCandlestickSeries({ upColor: '#22c55e', downColor: '#f43f5e', wickUpColor: '#22c55e', wickDownColor: '#f43f5e', borderVisible: false });
  c.setData(bars);
  const v = ch.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', color: 'rgba(127,127,127,.35)' });
  v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
  v.setData(bars.map(b => ({ time: b.time, value: b.volume })));
  const lo = Math.min(...bars.map(b => b.low)) * 0.85, hi = Math.max(...bars.map(b => b.high)) * 1.15;
  const L = (p, col, title, style, w) => p != null && c.createPriceLine({ price: p, color: col, lineWidth: w || 2, lineStyle: style || 0, axisLabelVisible: true, title });
  L(s.entry, '#60a5fa', 'entry'); L(s.stop, '#f43f5e', 'stop'); L(s.target, '#22c55e', 'target');
  (s.levels || []).filter(l => l.price > lo && l.price < hi).forEach(l => L(l.price, '#8b97ad', 'S/R ' + l.touches + '×', 2, 1));
  (s.zones || []).filter(z => z.proximal > lo && z.proximal < hi).slice(0, 4).forEach(z => L(z.proximal, '#f59e0b', z.type, 1, 1));
  if (bars.find(b => b.time === s.bar_date)) c.setMarkers([{ time: s.bar_date, position: s.action === 'BUY' ? 'belowBar' : 'aboveBar', color: s.action === 'BUY' ? '#22c55e' : '#f43f5e', shape: s.action === 'BUY' ? 'arrowUp' : 'arrowDown', text: s.action }]);
  ch.timeScale().fitContent();
  new ResizeObserver(() => ch.applyOptions({ width: el.clientWidth })).observe(el);
}

/* ---------------- PnL (server-computed numbers from pnl.json / equity.json; same as /api/pnl) ---------------- */
const P = Object.assign({ period: 'all', market: 'all' }, LS.get('pnlf', {}));
function periodStart(p) {
  const today = lagosDate(new Date());
  if (p === 'today') return today;
  const [y, m, d] = today.split('-').map(Number), dt = new Date(Date.UTC(y, m - 1, d));
  if (p === 'week') { dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); return dt.toISOString().slice(0, 10); }
  if (p === 'month') return today.slice(0, 8) + '01';
  return '0000-00-00';
}
function addStats(list) {        // combine per-market stat blocks (same fields as app/pnl.py _stats)
  const o = { closed: 0, won: 0, lost: 0, expired: 0, realized_usd: 0, sum_r: 0, open: 0, unrealized_usd: 0 };
  list.forEach(s => s && Object.keys(o).forEach(k => o[k] += s[k] || 0));
  o.win_rate = o.closed ? 100 * o.won / o.closed : null; o.avg_r = o.closed ? o.sum_r / o.closed : null;
  return o;
}
function pnlFor(period, market) {
  const all = D.pnl && D.pnl.periods && D.pnl.periods[period];
  if (!all) return null;
  if (market === 'all') return { R: { ...all.realized, open: all.open.count, unrealized_usd: all.open.unrealized_usd }, openR: all.open.unrealized_r, by_side: all.by_side, by_market: all.by_market, best: all.realized.best, worst: all.realized.worst };
  const codes = marketCodes(market), bm = all.by_market || {};
  const R = addStats(codes.map(c => bm[c]));
  const side = {};
  ['BUY', 'SELL'].forEach(sd => { const l = codes.map(c => (((D.pnl.markets || {})[c] || {})[period] || {}).by_side).filter(Boolean).map(x => x[sd]); if (l.length) side[sd] = addStats(l); });
  const by_market = {}; codes.forEach(c => { if (bm[c]) by_market[c] = bm[c]; });
  return { R, openR: null, by_side: side, by_market };
}
function viewPnl() {
  const E = D.equity, x = pnlFor(P.period, P.market);
  if (!x) return `<div class="card empty">PnL data isn't published yet.</div>`;
  const R = x.R, per = [['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['all', 'All-time']], start = periodStart(P.period);
  const gtable = (title, obj, lab) => `<div class="card"><b>${title}</b><div class="tscroll"><table><tr><th></th><th class="r">Closed</th><th class="r">Win %</th><th class="r">Avg R</th><th class="r">Realised</th><th class="r">Open</th><th class="r">Unreal.</th></tr>
    ${Object.entries(obj || {}).map(([v, s]) => `<tr><td>${lab(v)}</td><td class="r">${s.closed}</td><td class="r">${s.win_rate == null ? '–' : num(s.win_rate, 0)}</td><td class="r ${cls(s.avg_r)}">${s.avg_r == null ? '–' : sgn(s.avg_r)}</td><td class="r ${cls(s.realized_usd)}">${usd(s.realized_usd)}</td><td class="r">${s.open ?? '–'}</td><td class="r ${cls(s.unrealized_usd)}">${usd(s.unrealized_usd)}</td></tr>`).join('') || '<tr><td colspan="7" class="mut">No trades.</td></tr>'}</table></div></div>`;
  const pos = D.positions || {}, open = (pos.open || []).filter(t => marketMatch(t.market, P.market)), closed = (pos.closed || []).filter(t => marketMatch(t.market, P.market) && (t.closed_bar || '') >= start);
  const tl = (list, empty) => list.length ? `<div class="tscroll"><table><tr><th>Ticker</th><th>Side</th><th class="r">Entry→Px</th><th class="r">%</th><th class="r">R</th><th class="r">$</th></tr>${list.map(t => {
    const m = M()[t.market] || {};
    return `<tr><td>${m.flag || ''} <a href="${detailHref(t)}">${esc(t.ticker)}</a><div class="mut xs">${esc(t.status)}${t.closed_bar ? ' ' + esc(t.closed_bar) : ''}</div></td><td class="${t.side}">${t.side}</td>
    <td class="r">${px(t.entry)}→${px(t.exit_price ?? t.last_price)}<div class="mut xs">${esc(t.currency)}</div></td><td class="r ${cls(t.pnl_pct)}">${sgn(t.pnl_pct, 1)}</td><td class="r ${cls(t.r_mult)}">${sgn(t.r_mult)}</td><td class="r ${cls(t.pnl_usd)}">${usd(t.pnl_usd)}</td></tr>`; }).join('')}</table></div>` : `<div class="note">${empty}</div>`;
  const cmdMkt = P.market !== 'all' && !REGIONS.includes(P.market) ? ' ' + P.market : P.market === 'Europe' ? ' europe' : P.market === 'Asia-Pacific' ? ' asia' : '';
  return `${E ? `<div class="sec" style="margin-top:4px"><h2>Strategies · all-time</h2><span class="note">bankroll ${money0(E.bankroll_per_strategy)} each</span></div><div class="g2 g3">${E.strategies.map(s => strategyCard(s, true)).join('')}</div>` : ''}
  <div class="sec"><h2>Period breakdown</h2></div>
  <div class="seg">${per.map(([v, l]) => `<button data-p="${v}" class="${P.period === v ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div style="margin:-2px 0 12px"><select id="p-market" style="width:100%">${marketOptions(P.market)}</select></div>
  <div class="card"><div class="eyebrow">${per.find(p => p[0] === P.period)[1]} realised${P.period !== 'all' ? ' · closed since ' + start : ''}</div>
    <div class="big md ${cls(R.realized_usd)}">${usd(R.realized_usd)}</div>
    <div class="tiles">${tile('Closed', R.closed)}${tile('Win rate', R.win_rate == null ? '–' : num(R.win_rate, 1) + '%')}${tile('Avg R', R.avg_r == null ? '–' : sgn(R.avg_r), cls(R.avg_r))}
    ${tile('Won / lost', R.won + ' / ' + R.lost)}${tile('Expired', R.expired)}${tile('Total R', sgn(R.sum_r), cls(R.sum_r))}
    ${tile('Open trades', R.open)}${tile('Unrealised', usd(R.unrealized_usd), cls(R.unrealized_usd))}${tile('Open R', x.openR == null ? '–' : sgn(x.openR), cls(x.openR))}</div>
    ${x.best ? `<div class="small" style="margin-top:8px">Best <b>${esc(x.best.ticker)}</b> <span class="up">${sgn(x.best.pnl_pct, 2, '%')}</span> · worst <b>${esc(x.worst.ticker)}</b> <span class="dn">${sgn(x.worst.pnl_pct, 2, '%')}</span></div>` : ''}
    <div class="note" style="margin-top:6px">Each signal = $${num(D.pnl.notional_usd, 0)} paper trade; stop assumed first if both hit; expires after ${D.pnl.expire_days} sessions. No costs or slippage.</div></div>
  <div class="g2">${gtable('BUY vs SELL', x.by_side, v => `<span class="${v}">${v}</span>`)}${gtable('By market', x.by_market, v => `${(M()[v] || {}).flag || ''} ${v}`)}</div>
  <div class="card" style="margin-top:14px"><b>Open trades (${open.length})</b>${tl(open.slice(0, 40), 'No open trades.')}${open.length > 40 ? `<div class="note">Top 40 by R. <a href="#/positions">All positions ›</a></div>` : ''}</div>
  <div class="card"><b>Closed in period (${closed.length})</b>${tl(closed.slice(0, 60), 'No trades closed in this period (within the latest published closes).')}</div>
  <button class="btn full" data-cmd="/pnl ${P.period}${cmdMkt}">Get this PnL report in the chat</button>`;
}

/* ---------------- More ---------------- */
function viewMore() {
  const item = (href, ic, t, sub, attr = '') => `<a href="${href}" ${attr}><span class="ic">${ic}</span><span>${t}<small>${sub}</small></span><span class="chev">›</span></a>`;
  return `<div class="card menu">
    ${item('#/more/markets', '🌍', 'Markets &amp; schedule', 'Sessions, next scans, last scans, push alerts')}
    ${item('#/more/backtest', '🧪', 'Backtest', 'Walk-forward results 2022-26')}
    ${item('#/more/tiers', '⭐', 'How tiers work', 'Primary A / B, Secondary, top patterns')}
    ${item('#/more/actions', '⚡', 'Check &amp; scan', 'Live ticker check, manual scans, chat commands')}
  </div>
  <div class="card menu">
    <button id="theme2"><span class="ic">◐</span><span>Appearance<small>${theme() === 'light' ? 'Light' : 'Dark'} · tap to switch${LS.get('theme', null) ? '' : ' (following ' + (inTG ? 'Telegram' : 'default') + ')'}</small></span><span class="chev">›</span></button>
    ${LS.get('theme', null) ? `<button id="theme-auto"><span class="ic">↺</span><span>Follow ${inTG ? 'Telegram' : 'default'} theme<small>Reset the manual choice</small></span></button>` : ''}
    ${item(WEB, '🖥', 'Web dashboard', 'Full tables, filters and ticker analysis')}
    ${item(WEB + 'rules', '📜', 'Rules', 'The full trading checklist (read-only)')}
  </div>
  <div class="card note">⚠️ ${esc((D.status || {}).disclaimer || '')}<br>Bot: @${esc((D.status || {}).bot_username || 'StockingTradeBot')} · ${(D.status && D.status.counts) ? D.status.counts.signals + ' signals, ' + D.status.counts.charts + ' charts published' : ''}</div>`;
}
function viewMarkets() {
  const now = new Date().toISOString();
  const next = ((D.schedule && D.schedule.next) || []).filter(x => x.utc > now).slice(0, 12);
  const sub = LS.get('sub', []);
  return `<div class="card"><b>Next scheduled scans</b> <span class="mut small">(Lagos time, WAT)</span>
    ${next.length ? `<div class="tscroll"><table>${next.map(x => `<tr><td>${x.flag} ${x.market}</td><td>${fmtT(x.utc)}</td><td class="mut small">${esc(x.kind)}</td><td class="r small">${until(x.utc)}</td></tr>`).join('')}</table></div>` : '<div class="note">Schedule data is stale; it refreshes on the next publish.</div>'}</div>
  <div class="card"><b>Markets &amp; sessions</b> <span class="mut small">status as of last update</span>
    <div class="tscroll"><table><tr><th>Market</th><th>Status</th><th>Scan slots (Lagos)</th></tr>
    ${((D.schedule && D.schedule.markets) || []).map(m => { const st = M()[m.code] || {}; return `<tr><td>${m.flag} <b>${m.code}</b><div class="mut small">${esc(m.exchange)} · ${esc(st.currency || '')}</div></td>
      <td class="small">${st.open ? '<span class="up">OPEN</span>' : st.holiday ? 'holiday' : 'closed'}<div class="mut">${esc(st.local_time || '')}</div></td>
      <td class="small">${esc(m.day)}: ${m.lagos.join(', ')}<div class="mut">local ${m.local.join(', ')}</div></td></tr>`; }).join('')}</table></div>
    <div class="note">Hourly during each market's own session + a post-close check; weekends and exchange holidays skipped.</div></div>
  <div class="card"><b>Last scans</b><div class="tscroll"><table>${((D.status && D.status.last_scans) || []).slice().sort((a, b) => (b.finished || '').localeCompare(a.finished || '')).map(s => `<tr><td>${(M()[s.market] || {}).flag || ''} ${s.market}</td><td class="small">${s.finished ? fmtT(s.finished) : ''}</td><td class="r small">${s.n_buy}B / ${s.n_sell}S of ${s.n_eligible}</td></tr>`).join('')}</table></div></div>
  <div class="card"><b>Push alerts</b><div class="note">Choose markets, then confirm in the chat. Leave all unticked for every market.</div>
    <div class="row" style="margin:10px 0">${Object.values(M()).map(m => `<label class="fc" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" class="subm" value="${m.code}" ${sub.includes(m.code) ? 'checked' : ''} style="padding:0"> ${m.flag} ${m.code}</label>`).join('')}</div>
    <div style="display:grid;gap:8px"><button class="btn pri full" id="do-sub">🔔 Subscribe</button><button class="btn full" data-cmd="/unsubscribe">🔕 Unsubscribe</button></div></div>`;
}
function viewActions() {
  return `<div class="card"><b>🔎 Check a ticker</b><div class="note">Runs the full live analysis in the bot (Yahoo symbols: AAPL, 7203.T, BP.L, 0700.HK, RELIANCE.NS).</div>
    <div class="row nowrap" style="margin-top:10px"><input id="a-t" placeholder="Ticker" style="flex:1;text-transform:uppercase"><button class="btn pri" id="a-check">Check</button></div></div>
  <div class="card"><b>🔄 Scan now</b><div class="row nowrap" style="margin-top:10px"><select id="a-m" style="flex:1"><option value="US">🇺🇸 US</option><option value="europe">🌍 Europe</option><option value="asia">🌏 Asia-Pacific</option><option value="all">All markets</option>
    ${Object.values(M()).filter(m => m.code !== 'US').map(m => `<option value="${m.code}">${m.flag} ${m.code}</option>`).join('')}</select><button class="btn pri" id="a-scan">Scan</button></div></div>
  <div class="card" style="display:grid;gap:8px"><b>In the chat</b><button class="btn full" data-cmd="/signals">Latest signals</button><button class="btn full" data-cmd="/trades open">Open trades</button><button class="btn full" data-cmd="/status">Market status &amp; next scans</button></div>
  <div class="card note">Actions are sent to @${esc((D.status || {}).bot_username || 'StockingTradeBot')} as chat commands; the reply appears in the chat. This app is a static page: its data refreshes after each scan (at most every 10 min), so it may lag the bot by a few minutes.</div>`;
}
function viewTiers() {
  const T = (D.status && D.status.tiers) || {}, S = T.setups || {};
  const eq = {}; ((D.equity || {}).strategies || []).forEach(s => eq[s.code] = s);
  return `${Object.entries(S).map(([k, s]) => `<div class="card"><div class="row between"><b>${esc(s.name)}</b><span class="tag ${k}">${SETUP[k] ? SETUP[k].chip : k}</span></div>
      <div class="note" style="margin-top:4px">Rule: ${esc(s.rule)}</div><div class="small" style="margin-top:6px">${esc(s.backtest)}</div>
      ${eq[k] ? `<div class="tiles">${tile('Live win rate', eq[k].win_rate == null ? '–' : num(eq[k].win_rate, 1) + '%', '', ' lc')}${tile('Avg R', eq[k].avg_r == null ? '–' : sgn(eq[k].avg_r, 2, 'R'), cls(eq[k].avg_r), ' lc')}${tile('Closed', eq[k].closed, '', ' lc')}</div>` : ''}</div>`).join('')}
    <div class="card"><b>🏆 Top patterns</b><div class="note">Profit factor &gt;1.1 over 2022-26 and &gt;1 in every single year.</div>
      <div class="tscroll"><table><tr><th>Pattern</th><th class="r">PF 4y</th><th class="r">Worst yr</th><th class="r">Trades</th></tr>${Object.entries(T.top_patterns || {}).map(([n, v]) => `<tr><td>${esc(n)}</td><td class="r">${v.pf_4y}</td><td class="r">${v.worst_year_pf}</td><td class="r">${v.trades}</td></tr>`).join('')}</table></div></div>
    <div class="card note">${esc(T.note || '')}</div>`;
}
function mdToHtml(md) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  const out = []; const L = md.split('\n'); let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (/^\s*\|/.test(l)) { const t = []; while (i < L.length && /^\s*\|/.test(L[i])) t.push(L[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      out.push('<table>' + t.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r)).map((r, k) => '<tr>' + cells(r).map(c => k ? `<td>${inl(c)}</td>` : `<th>${inl(c)}</th>`).join('') + '</tr>').join('') + '</table>'); continue; }
    if (/^#{1,6}\s/.test(l)) { out.push(`<h3>${inl(l.replace(/^#+\s*/, ''))}</h3>`); i++; continue; }
    if (/^\s*[-*]\s/.test(l)) { const it = []; while (i < L.length && /^\s*[-*]\s/.test(L[i])) it.push(`<li>${inl(L[i++].replace(/^\s*[-*]\s/, ''))}</li>`); out.push('<ul>' + it.join('') + '</ul>'); continue; }
    if (/^!\[/.test(l)) { i++; continue; }
    if (l.trim()) out.push(`<p>${inl(l)}</p>`);
    i++;
  }
  return out.join('');
}
function viewBacktest() {
  const B = D.backtest;
  if (!B || !B.available) return `<div class="card empty">No backtest results published yet.</div>`;
  const row = (lab, s) => `<tr><td>${lab}</td><td class="r">${s.trades}</td><td class="r">${s.win_rate ?? '–'}%</td><td class="r ${cls(s.avg_r)}">${s.avg_r ?? '–'}</td><td class="r ${cls(s.pnl_usd)}">${usd(s.pnl_usd)}</td></tr>`;
  return `<div class="disc">Historical simulation of the current rules (read-only results). Past results don't predict future returns; see the report's bias notes.</div>
  <div class="g2">${B.windows.map(w => `<div class="card"><b>Window ${esc(w.window === 'out' ? 'last 12 months' : w.window.replace(/^out_?/, ''))}</b> <span class="mut small">${esc(w.from)} → ${esc(w.to)}</span>
    <div class="tscroll"><table><tr><th></th><th class="r">Trades</th><th class="r">Win</th><th class="r">Avg R</th><th class="r">PnL</th></tr>${row('All', w.all)}${Object.entries(w.by_side).map(([k, s]) => row(`<span class="${k}">${k}</span>`, s)).join('')}</table></div>
    ${w.benchmarks && w.benchmarks.US ? `<div class="note">Benchmark ${esc(w.benchmarks.US.index)} buy &amp; hold: <b class="${cls(w.benchmarks.US.ret_pct)}">${sgn(w.benchmarks.US.ret_pct, 2, '%')}</b></div>` : ''}
    <details><summary class="small">By market</summary><div class="tscroll"><table>${Object.entries(w.by_market).map(([k, s]) => row(((M()[k] || {}).flag || '') + ' ' + k, s)).join('')}</table></div></details></div>`).join('')}</div>
  ${B.images.map(im => `<div class="card"><img src="${im}?t=${Date.now()}" alt="equity curve" loading="lazy"></div>`).join('')}
  ${B.reports.map(r => `<div class="card md"><details><summary><b>${esc(r.name)}</b> <span class="mut small">${fmtT(r.updated)}</span></summary>${mdToHtml(r.markdown)}</details></div>`).join('')}`;
}

/* ---------------- router ---------------- */
const LEGACY = { signals: '#/alerts', markets: '#/more/markets', backtest: '#/more/backtest', actions: '#/more/actions' };
function render() {
  const h = location.hash || '#/home';
  const [, tab, arg] = h.split('/');
  if (LEGACY[tab]) { location.replace(LEGACY[tab]); return; }
  const nav = tab === 's' ? 'alerts' : (tab || 'home');
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === nav));
  const v = $('#view');
  backButton(tab === 's' || (tab === 'more' && !!arg));
  mainButton(null);
  sparkN = 0;
  try {
    if (tab === 's') {
      v.innerHTML = viewDetail(arg);
      const s = D.sigById && D.sigById.get(String(arg));
      if (s) { drawChart(s); mainButton(`Live check ${s.ticker} in bot`, () => botCmd('/check ' + s.ticker)); }
    } else if (tab === 'positions') v.innerHTML = viewPositions();
    else if (tab === 'alerts') v.innerHTML = viewAlerts();
    else if (tab === 'pnl') v.innerHTML = viewPnl();
    else if (tab === 'more') {
      const sub = { markets: viewMarkets, backtest: viewBacktest, actions: viewActions, tiers: viewTiers }[arg];
      v.innerHTML = sub ? `<a class="small" href="#/more">‹ More</a><div style="height:8px"></div>` + sub() : viewMore();
    } else v.innerHTML = viewHome();
  } catch (e) { v.innerHTML = `<div class="card dn">Render error: ${esc(e.message)}</div>`; console.error(e); }
  if (tab !== 's' && !render.keep) window.scrollTo(0, 0);
  render.keep = false;
}
function rerenderKeep() { render.keep = true; const y = window.scrollY; render(); window.scrollTo(0, y); }
async function refresh() {
  const b = $('#refresh'); b.classList.add('spin'); haptic();
  try { await load(); rerenderKeep(); } catch (e) { toast("Couldn't refresh: " + e.message); }
  b.classList.remove('spin');
}
function toggleTheme() { const t = theme() === 'light' ? 'dark' : 'light'; LS.set('theme', t); applyTheme(t); haptic(); if (location.hash.startsWith('#/s/') || location.hash.startsWith('#/more')) rerenderKeep(); }
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'theme' || b.id === 'theme2') return toggleTheme();
  if (b.id === 'theme-auto') { try { localStorage.removeItem('stk_theme'); } catch (err) {} applyTheme(theme()); return rerenderKeep(); }
  if (b.id === 'refresh') return refresh();
  if (b.dataset.cmd) return botCmd(b.dataset.cmd);
  if (b.dataset.href) { e.preventDefault(); return openExt(b.dataset.href); }
  if (b.dataset.pf) { PF[b.dataset.pf] = b.dataset.v; PF.n = 30; LS.set('posf', PF); return rerenderKeep(); }
  if (b.id === 'more-pos') { PF.n += 30; return rerenderKeep(); }
  if (b.dataset.f) { F[b.dataset.f] = b.dataset.v; LS.set('filters', F); return rerenderKeep(); }
  if (b.dataset.p) { P.period = b.dataset.p; LS.set('pnlf', P); return rerenderKeep(); }
  if (b.id === 'do-sub') { const c = [...document.querySelectorAll('.subm:checked')].map(x => x.value); LS.set('sub', c); return botCmd('/subscribe' + (c.length ? ' ' + c.join(' ') : '')); }
  if (b.id === 'a-check') { const t = ($('#a-t').value || '').trim().toUpperCase(); if (!t) return toast('Type a ticker first'); return botCmd('/check ' + t); }
  if (b.id === 'a-scan') return botCmd('/scan ' + $('#a-m').value);
});
document.addEventListener('toggle', e => { if (e.target.id === 'fdet') LS.set('fopen', e.target.open); }, true);
document.addEventListener('change', e => {
  const id = e.target.id;
  const map = { 'f-market': 'market', 'f-conf': 'conf', 'f-ck': 'ck', 'f-days': 'days', 'f-sort': 'sort' };
  if (map[id]) { F[map[id]] = ['conf', 'ck', 'days'].includes(map[id]) ? Number(e.target.value) : e.target.value; LS.set('filters', F); rerenderKeep(); }
  if (id === 'p-market') { P.market = e.target.value; LS.set('pnlf', P); rerenderKeep(); }
});
let qT; document.addEventListener('input', e => { if (e.target.id === 'f-q') { clearTimeout(qT); qT = setTimeout(() => { F.q = e.target.value; LS.set('filters', F); rerenderKeep(); const q = $('#f-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 350); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'a-t') $('#a-check').click(); });
window.addEventListener('hashchange', render);
load().then(() => {
  const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
  if (sp && /^s\d+$/.test(sp)) location.hash = '#/s/' + sp.slice(1);
  render();
}).catch(e => { $('#view').innerHTML = `<div class="card empty">Couldn't load data: ${esc(e.message)}</div>`; });
setInterval(() => load().then(() => { if (!location.hash.startsWith('#/s/') && !document.activeElement.matches('input,select')) rerenderKeep(); }).catch(() => {}), 5 * 60 * 1000);
setInterval(liveBadge, 60 * 1000);
