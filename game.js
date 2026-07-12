/* ============================================================
   INFINITE CHOCO INC.
   A pixel-art incremental game about the legendary
   "infinite chocolate" trick. Cut. Rearrange. Profit.
   ============================================================ */
'use strict';

/* ============================================================
   1. UTILS
   ============================================================ */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);

function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return '' + n;
  const units = ['K', 'M', 'B', 'T', 'Qa'];
  let u = -1;
  let x = n;
  while (x >= 1000 && u < units.length - 1) { x /= 1000; u++; }
  return (x >= 100 ? Math.floor(x) : x.toFixed(1).replace(/\.0$/, '')) + units[u];
}

function fmtTime(s) {
  s = Math.floor(s);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
}

/* ============================================================
   2. AUDIO — tiny WebAudio synth, no assets
   ============================================================ */
const Snd = {
  ac: null,
  vol: 0.32,
  init() {
    if (this.ac) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ac.destination);
    } catch (e) { /* no audio */ }
  },
  resume() { if (this.ac && this.ac.state === 'suspended') this.ac.resume(); },
  tone(freq, dur, type = 'square', vol = 1, slide = 0, delay = 0) {
    if (!this.ac || S.muted) return;
    const t0 = this.ac.currentTime + delay;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol * 0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 1, freq = 1200, delay = 0) {
    if (!this.ac || S.muted) return;
    const t0 = this.ac.currentTime + delay;
    const len = Math.max(1, (dur * this.ac.sampleRate) | 0);
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const f = this.ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol * 0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }
};

const sfx = {
  click:   () => Snd.tone(880, 0.04, 'square', 0.35),
  scratch: () => Snd.noise(0.05, 0.35, rnd(1800, 2600)),
  snap:    () => { Snd.noise(0.09, 0.8, 900); Snd.tone(140, 0.1, 'square', 0.7, -60); },
  swap:    () => { Snd.tone(320, 0.12, 'sine', 0.6, 240); Snd.noise(0.1, 0.25, 600, 0.02); },
  pop:     () => Snd.tone(520, 0.09, 'sine', 0.8, 420),
  collect: () => { Snd.tone(660, 0.05, 'square', 0.5); Snd.tone(990, 0.08, 'square', 0.5, 0, 0.05); },
  magic:   () => { for (let i = 0; i < 5; i++) Snd.tone(600 + i * 180, 0.09, 'triangle', 0.4, 60, i * 0.045); },
  coin:    () => { Snd.tone(988, 0.06, 'square', 0.5); Snd.tone(1319, 0.14, 'square', 0.5, 0, 0.06); },
  ding:    () => Snd.tone(1568, 0.25, 'triangle', 0.6),
  fwoosh:  () => Snd.noise(0.35, 0.5, 400),
  bubble:  () => { for (let i = 0; i < 3; i++) Snd.tone(rnd(180, 420), 0.08, 'sine', 0.35, 80, i * 0.07); },
  wrap:    () => { Snd.noise(0.12, 0.4, 2200); Snd.tone(740, 0.1, 'triangle', 0.4, 0, 0.1); },
  buzz:    () => Snd.tone(120, 0.28, 'sawtooth', 0.55, -35),
  bell:    () => { Snd.tone(1760, 0.22, 'triangle', 0.45); Snd.tone(2217, 0.3, 'triangle', 0.3, 0, 0.03); },
  powerup: () => [392, 523, 659].forEach((f, i) => Snd.tone(f, 0.09, 'square', 0.45, 0, i * 0.06)),
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => Snd.tone(f, 0.14, 'square', 0.45, 0, i * 0.09)),
  win:     () => [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => Snd.tone(f, 0.16, 'square', 0.5, 0, i * 0.11)),
  denied:  () => Snd.tone(180, 0.1, 'square', 0.4, -40)
};

/* ============================================================
   3. GAME DATA — flavors, upgrades, milestones
   ============================================================ */
const FLAVORS = [
  { id: 'milk',    name: 'MILK',    mult: 1,   cost: 0,      c: { base: '#8a5a2b', light: '#a9743d', dark: '#5c3317', slab: '#452511' } },
  { id: 'dark',    name: 'DARK',    mult: 1.8, cost: 40,     c: { base: '#4d2e17', light: '#6a4526', dark: '#2f1a0b', slab: '#221106' } },
  { id: 'white',   name: 'WHITE',   mult: 3,   cost: 220,    c: { base: '#e8d5ae', light: '#f7ecd2', dark: '#c4a878', slab: '#a8894f' } },
  { id: 'ruby',    name: 'RUBY',    mult: 5.5, cost: 1100,   c: { base: '#d4708c', light: '#e895ab', dark: '#a84e68', slab: '#7c3448' } },
  { id: 'caramel', name: 'CARAMEL', mult: 10,  cost: 5500,   c: { base: '#c98a3d', light: '#e0a95e', dark: '#9c6524', slab: '#71470f' } },
  { id: 'mint',    name: 'MINT',    mult: 18,  cost: 26000,  c: { base: '#6fc493', light: '#93dcb2', dark: '#4a9c6d', slab: '#2f6b47' } },
  { id: 'gold',    name: 'GOLDEN',  mult: 40,  cost: 150000, c: { base: '#e3b341', light: '#f7d976', dark: '#b8862a', slab: '#8a6316' } }
];
const FLAV = {};
FLAVORS.forEach(f => FLAV[f.id] = f);

const PRICE = { piece: 3, bar: 20, box: 58 };
const MELT_PIECES = 4, PACK_BARS = 2;
const MELT_TIME = 8, PACK_TIME = 7;
const BOT_TIME = 6;

const UPS = [
  { id: 'knife',     name: 'SHARPER KNIFE',  base: 10,   mult: 1.55, max: 12, d: l => `Cutting is 25% faster per level. Now: ${Math.round(cutSpeedMult() * 100)}%` },
  { id: 'hands',     name: 'MAGIC HANDS',    base: 90,   mult: 5,    max: 2,  d: l => l === 0 ? 'Lv1: the trick rearranges itself. Lv2: extra pieces auto-collect.' : (l === 1 ? 'Lv2: extra pieces fly to stock on their own.' : 'Fully automatic sleight of hand.') },
  { id: 'gold',      name: 'GOLDEN KNIFE',   base: 160,  mult: 1.9,  max: 10, d: l => `+12% chance of a BONUS piece per trick. Now: +${l * 12}%` },
  { id: 'bot',       name: 'CHOCO-BOT',      base: 45,   mult: 1.5,  max: 30, d: l => `A robot that does the trick for you. Each bot: 1 trick / ${botInterval().toFixed(1)}s. Owned: ${l}` },
  { id: 'botspd',    name: 'BOT OVERCLOCK',  base: 400,  mult: 2.05, max: 10, d: l => `Bots work 15% faster per level.` },
  { id: 'meltspd',   name: 'HOTTER FURNACE', base: 60,   mult: 1.7,  max: 10, d: l => `Melting is 12% faster per level. Now: ${meltDur().toFixed(1)}s` },
  { id: 'meltbatch', name: 'BIGGER VAT',     base: 200,  mult: 2.2,  max: 8,  d: l => `Melt +1 batch at once. Now: up to ${(l + 1) * MELT_PIECES} pieces > ${l + 1} bars` },
  { id: 'automelt',  name: 'MELTER HELPER',  base: 450,  mult: 1,    max: 1,  d: l => l ? 'Pippa the mouse runs the melter for you.' : 'Hire a helper who starts the melter automatically.' },
  { id: 'packspd',   name: 'SWIFT WRAPPER',  base: 75,   mult: 1.7,  max: 10, d: l => `Wrapping is 12% faster per level. Now: ${packDur().toFixed(1)}s` },
  { id: 'packbatch', name: 'WIDE WRAPPER',   base: 280,  mult: 2.2,  max: 6,  d: l => `Wrap +1 gift box at once. Now: up to ${l + 1} boxes per run` },
  { id: 'autopack',  name: 'WRAPPER HELPER', base: 700,  mult: 1,    max: 1,  d: l => l ? 'Benny the rabbit wraps boxes for you.' : 'Hire a helper who wraps gift boxes automatically.' },
  { id: 'cashier',   name: 'CASHIER',        base: 1400, mult: 1,    max: 1,  d: l => l ? 'Nadia the fox rings up orders she can fill.' : 'Hire a cashier who auto-serves customers when stock is ready.' },
  { id: 'market',    name: 'MARKETING',      base: 50,   mult: 1.6,  max: 15, d: l => `Customers arrive 12% more often per level.` },
  { id: 'comfy',     name: 'COZY SHOP',      base: 90,   mult: 1.8,  max: 8,  d: l => `Customers wait 20% longer per level.` },
  { id: 'charm',     name: 'CHARMING SMILE', base: 110,  mult: 1.85, max: 10, d: l => `Tips are 12% bigger per level.` }
];

const MILESTONES = [
  { id: 'm1',  t: 'FIRST CUT',           r: 5,    c: () => S.stats.tricks >= 1 },
  { id: 'm2',  t: 'FIRST SALE',          r: 10,   c: () => S.stats.served >= 1 },
  { id: 'm3',  t: 'FIRST BAR',           r: 10,   c: () => S.stats.barsMade >= 1 },
  { id: 'm4',  t: 'PIECE COLLECTOR',     r: 15,   c: () => S.stats.piecesMade >= 25 },
  { id: 'm5',  t: 'GIFT WRAPPED',        r: 25,   c: () => S.stats.boxesMade >= 1 },
  { id: 'm6',  t: 'FIRST $100',          r: 20,   c: () => S.stats.earned >= 100 },
  { id: 'm7',  t: 'FLAVOR PIONEER',      r: 50,   c: () => S.flavors.length >= 2 },
  { id: 'm8',  t: '25 HAPPY CUSTOMERS',  r: 50,   c: () => S.stats.served >= 25 },
  { id: 'm9',  t: 'FIRST $1,000',        r: 100,  c: () => S.stats.earned >= 1000 },
  { id: 'm10', t: '100 TRICKS DONE',     r: 150,  c: () => S.stats.tricks >= 100 },
  { id: 'm11', t: 'FIRST $10,000',       r: 500,  c: () => S.stats.earned >= 10000 },
  { id: 'm12', t: 'EVERY FLAVOR KNOWN',  r: 5000, c: () => S.flavors.length >= FLAVORS.length },
  { id: 'm13', t: 'FIRST $100,000',      r: 2000, c: () => S.stats.earned >= 100000 },
  { id: 'm14', t: 'CHOCOLATE MOGUL',     r: 0,    c: () => S.stats.earned >= 1000000, win: true }
];

/* ============================================================
   4. STATE + SAVE
   ============================================================ */
const SAVE_KEY = 'infchoco.v1';

function defaultState() {
  const bars = {}, boxes = {};
  FLAVORS.forEach(f => { bars[f.id] = 0; boxes[f.id] = 0; });
  return {
    v: 1,
    money: 0,
    pieces: 0,
    bars, boxes,
    ups: {},
    flavors: ['milk'],
    melter: { flavor: 'milk', run: 0, t: 0, dur: 0, runFlavor: 'milk' },
    packer: { flavor: 'milk', run: 0, t: 0, dur: 0, runFlavor: 'milk' },
    rep: 3,
    stats: { tricks: 0, piecesMade: 0, barsMade: 0, boxesMade: 0, served: 0, lost: 0, earned: 0, time: 0 },
    tut: 0,
    intro: false,
    winSeen: false,
    mile: {},
    muted: false,
    last: Date.now()
  };
}

let S = defaultState();
let resetting = false; // blocks the beforeunload save from resurrecting a wiped save

function save() {
  if (resetting) return;
  try {
    S.last = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    const ind = document.getElementById('save-ind');
    ind.textContent = '● saved';
    setTimeout(() => { ind.textContent = ''; }, 1200);
  } catch (e) { /* storage unavailable */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    const def = defaultState();
    // shallow merge with defaults, one nested level for objects
    for (const k in def) {
      if (d[k] === undefined) continue;
      if (typeof def[k] === 'object' && def[k] !== null && !Array.isArray(def[k])) {
        S[k] = Object.assign({}, def[k], d[k]);
      } else {
        S[k] = d[k];
      }
    }
    // sanitize: drop any unknown flavor ids, always keep milk
    if (!Array.isArray(S.flavors)) S.flavors = ['milk'];
    S.flavors = S.flavors.filter(f => FLAV[f]);
    if (!S.flavors.includes('milk')) S.flavors.unshift('milk');
    // machines must reference a flavor the player actually owns
    if (!FLAV[S.melter.flavor] || !S.flavors.includes(S.melter.flavor)) S.melter.flavor = 'milk';
    if (!FLAV[S.packer.flavor] || !S.flavors.includes(S.packer.flavor)) S.packer.flavor = 'milk';
    if (!FLAV[S.melter.runFlavor]) S.melter.runFlavor = S.melter.flavor;
    if (!FLAV[S.packer.runFlavor]) S.packer.runFlavor = S.packer.flavor;
    // coerce numeric fields so a type-corrupt save can't NaN/string-concat
    S.money = num(S.money);
    S.pieces = num(S.pieces);
    FLAVORS.forEach(f => {
      S.bars[f.id] = num(S.bars[f.id]);
      S.boxes[f.id] = num(S.boxes[f.id]);
    });
    S.rep = clamp(num(S.rep, 3), 0.5, 5);
    return true;
  } catch (e) { return false; }
}

/* coerce anything to a finite non-negative number (fallback default) */
function num(v, def = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

const lvl = id => S.ups[id] || 0;
const upCost = u => Math.floor(u.base * Math.pow(u.mult, lvl(u.id)));

/* derived values */
const cutSpeedMult = () => 1 + 0.25 * lvl('knife');
const goldChance = () => 0.12 * lvl('gold');
const botInterval = () => BOT_TIME / Math.pow(1.15, lvl('botspd'));
const meltDur = () => MELT_TIME * Math.pow(0.88, lvl('meltspd'));
const packDur = () => PACK_TIME * Math.pow(0.88, lvl('packspd'));
const meltBatchMax = () => 1 + lvl('meltbatch');
const packBatchMax = () => 1 + lvl('packbatch');
const tipMult = () => 1 + 0.12 * lvl('charm');
const patienceMult = () => 1 + 0.2 * lvl('comfy');

function trickYield() {
  let n = 1;
  const c = goldChance();
  n += Math.floor(c);
  if (Math.random() < c % 1) n++;
  return n;
}

function barPrice(fl) { return PRICE.bar * FLAV[fl].mult; }
function boxPrice(fl) { return PRICE.box * FLAV[fl].mult; }

/* ============================================================
   5. PIXEL SPRITES — everything drawn in code
   ============================================================ */
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

/* one chocolate square tile, size 22, on 24 grid */
function drawChocSquare(x, px, py, c, sz = 22) {
  x.fillStyle = c.base; x.fillRect(px, py, sz, sz);
  x.fillStyle = c.light;
  x.fillRect(px, py, sz, 2); x.fillRect(px, py, 2, sz);
  x.fillStyle = c.dark;
  x.fillRect(px, py + sz - 2, sz, 2); x.fillRect(px + sz - 2, py, 2, sz);
  x.fillStyle = c.light;
  x.fillRect(px + 4, py + 4, 3, 3);
}

/* the full 6x4 bar image (148 x 100 incl. 2px slab border) */
const barImgCache = {};
function barImg(flavId) {
  if (barImgCache[flavId]) return barImgCache[flavId];
  const c = FLAV[flavId].c;
  const [cv, x] = mkCanvas(148, 100);
  x.fillStyle = c.slab; x.fillRect(0, 0, 148, 100);
  for (let r = 0; r < 4; r++)
    for (let col = 0; col < 6; col++)
      drawChocSquare(x, 3 + col * 24, 3 + r * 24, c);
  barImgCache[flavId] = cv;
  return cv;
}

/* a single loose piece, 16x16 */
const pieceImgCache = {};
function pieceImg(flavId) {
  if (pieceImgCache[flavId]) return pieceImgCache[flavId];
  const c = FLAV[flavId].c;
  const [cv, x] = mkCanvas(16, 16);
  x.fillStyle = c.slab; x.fillRect(0, 0, 16, 16);
  drawChocSquare(x, 1, 1, c, 14);
  pieceImgCache[flavId] = cv;
  return cv;
}

/* mini bar icon 16x10 */
const barIconCache = {};
function barIcon(flavId) {
  if (barIconCache[flavId]) return barIconCache[flavId];
  const c = FLAV[flavId].c;
  const [cv, x] = mkCanvas(16, 10);
  x.fillStyle = c.slab; x.fillRect(0, 0, 16, 10);
  x.fillStyle = c.base;
  for (let i = 0; i < 3; i++) { x.fillRect(1 + i * 5, 1, 4, 3); x.fillRect(1 + i * 5, 5, 4, 4); }
  x.fillStyle = c.light;
  for (let i = 0; i < 3; i++) x.fillRect(1 + i * 5, 1, 4, 1);
  barIconCache[flavId] = cv;
  return cv;
}

/* gift box icon 14x12 */
const boxIconCache = {};
function boxIcon(flavId) {
  if (boxIconCache[flavId]) return boxIconCache[flavId];
  const c = FLAV[flavId].c;
  const [cv, x] = mkCanvas(14, 12);
  x.fillStyle = c.base; x.fillRect(0, 2, 14, 10);
  x.fillStyle = c.dark; x.fillRect(0, 2, 14, 2);
  x.fillStyle = c.light; x.fillRect(0, 4, 14, 1);
  x.fillStyle = '#f0b64a'; x.fillRect(6, 0, 2, 12);
  x.fillStyle = '#ffd97a'; x.fillRect(4, 0, 2, 3); x.fillRect(8, 0, 2, 3);
  boxIconCache[flavId] = cv;
  return cv;
}

/* knife sprite 26x10, blade pointing right */
const knifeImg = (() => {
  const [cv, x] = mkCanvas(26, 10);
  x.fillStyle = '#c8d0d8'; x.fillRect(0, 3, 16, 4);
  x.fillStyle = '#eef2f6'; x.fillRect(0, 6, 15, 1);
  x.fillStyle = '#98a2ac'; x.fillRect(0, 3, 15, 1);
  x.fillStyle = '#f0b64a'; x.fillRect(16, 2, 2, 6);
  x.fillStyle = '#6b4226'; x.fillRect(18, 2, 8, 6);
  x.fillStyle = '#8a5a35'; x.fillRect(18, 2, 8, 2);
  x.fillStyle = '#4a2c15'; x.fillRect(18, 6, 8, 2);
  return cv;
})();

/* coin 8x8 */
const coinImg = (() => {
  const [cv, x] = mkCanvas(8, 8);
  x.fillStyle = '#b8860b'; x.fillRect(1, 0, 6, 8); x.fillRect(0, 1, 8, 6);
  x.fillStyle = '#f0b64a'; x.fillRect(1, 1, 6, 6);
  x.fillStyle = '#ffd97a'; x.fillRect(2, 1, 2, 2); x.fillRect(1, 2, 1, 2);
  x.fillStyle = '#b8860b'; x.fillRect(3, 2, 2, 4);
  return cv;
})();

/* ============================================================
   custom pixel-art ICONS for the upgrade panel (24x24 each)
   ============================================================ */
const ICON_DRAW = {
  knife(x) {
    x.fillStyle = '#c8d0d8'; x.fillRect(3, 14, 12, 4); x.fillRect(4, 12, 10, 2);
    x.fillStyle = '#eef2f6'; x.fillRect(4, 16, 10, 1);
    x.fillStyle = '#6b4226'; x.fillRect(13, 15, 8, 5); x.fillStyle = '#8a5a35'; x.fillRect(13, 15, 8, 2);
    x.fillStyle = '#fff'; x.fillRect(15, 4, 2, 2); x.fillRect(14, 6, 1, 1); // sparkle
  },
  gold(x) {
    x.fillStyle = '#e3b341'; x.fillRect(3, 14, 12, 4); x.fillRect(4, 12, 10, 2);
    x.fillStyle = '#ffd97a'; x.fillRect(4, 16, 10, 1);
    x.fillStyle = '#6b4226'; x.fillRect(13, 15, 8, 5);
    x.fillStyle = '#ffd97a'; x.fillRect(6, 4, 2, 2); x.fillRect(16, 6, 2, 2); x.fillStyle = '#fff'; x.fillRect(6, 4, 1, 1);
  },
  hands(x) {
    x.fillStyle = '#f4efe8'; x.fillRect(7, 10, 10, 9); x.fillRect(6, 8, 3, 6); x.fillRect(9, 6, 2, 5); x.fillRect(12, 6, 2, 5); x.fillRect(15, 8, 2, 5);
    x.fillStyle = '#d8cbb4'; x.fillRect(7, 17, 10, 2);
    x.fillStyle = '#ffd97a'; x.fillRect(3, 4, 2, 2); x.fillRect(18, 5, 2, 2); x.fillStyle = '#fff'; x.fillRect(4, 10, 1, 1);
  },
  bot(x) {
    x.fillStyle = '#788492'; x.fillRect(10, 2, 2, 3);
    x.fillStyle = '#f05050'; x.fillRect(10, 1, 2, 1);
    x.fillStyle = '#9aa6b2'; x.fillRect(5, 5, 12, 10);
    x.fillStyle = '#3ce0f0'; x.fillRect(8, 8, 6, 3);
    x.fillStyle = '#788492'; x.fillRect(6, 15, 10, 5);
    x.fillStyle = '#f0b64a'; x.fillRect(9, 16, 4, 2);
  },
  botspd(x) { ICON_DRAW.bot(x); x.fillStyle = '#ffd97a'; x.fillRect(18, 6, 4, 3); x.fillRect(16, 9, 4, 3); x.fillRect(18, 12, 3, 3); },
  meltspd(x) {
    x.fillStyle = '#c94f3d'; x.fillRect(9, 4, 5, 16); x.fillRect(7, 9, 9, 11); x.fillRect(6, 13, 12, 7);
    x.fillStyle = '#f0803c'; x.fillRect(9, 9, 6, 10);
    x.fillStyle = '#ffd97a'; x.fillRect(10, 13, 4, 6);
  },
  meltbatch(x) {
    x.fillStyle = '#5a6470'; x.fillRect(4, 8, 16, 12); x.fillStyle = '#788492'; x.fillRect(4, 8, 16, 2);
    x.fillStyle = '#8a5a2b'; x.fillRect(6, 10, 12, 6); x.fillStyle = '#a9743d'; x.fillRect(6, 10, 12, 1);
    x.fillStyle = '#788492'; x.fillRect(2, 12, 3, 2); x.fillRect(19, 12, 3, 2); // handles
  },
  automelt(x) { ICON_DRAW.gearBg(x, '#f0803c'); x.fillStyle = '#c94f3d'; x.fillRect(10, 8, 4, 8); x.fillStyle = '#ffd97a'; x.fillRect(11, 12, 2, 4); },
  packspd(x) {
    x.fillStyle = '#c94f8a'; x.fillRect(9, 9, 6, 8); // knot
    x.fillStyle = '#e87ab0'; x.fillRect(3, 6, 7, 6); x.fillRect(14, 6, 7, 6); // loops
    x.fillStyle = '#c94f8a'; x.fillRect(5, 8, 3, 2); x.fillRect(16, 8, 3, 2);
    x.fillStyle = '#fff'; x.fillRect(11, 11, 2, 2);
  },
  packbatch(x) {
    for (let i = 0; i < 2; i++) { const bx = 4 + i * 9; x.fillStyle = '#b5476f'; x.fillRect(bx, 12, 8, 8); x.fillStyle = '#ffd97a'; x.fillRect(bx + 3, 12, 2, 8); x.fillStyle = '#e8c0d2'; x.fillRect(bx, 15, 8, 1); }
    x.fillStyle = '#6fa8dc'; x.fillRect(8, 4, 8, 8); x.fillStyle = '#ffd97a'; x.fillRect(11, 4, 2, 8);
  },
  autopack(x) { ICON_DRAW.gearBg(x, '#c94f8a'); x.fillStyle = '#b5476f'; x.fillRect(8, 8, 8, 8); x.fillStyle = '#ffd97a'; x.fillRect(11, 8, 2, 8); },
  market(x) {
    x.fillStyle = '#f0b64a'; x.fillRect(4, 8, 5, 8); x.fillRect(8, 6, 8, 12); // megaphone
    x.fillStyle = '#ffd97a'; x.fillRect(8, 6, 3, 12);
    x.fillStyle = '#6fd8f0'; x.fillRect(17, 5, 2, 2); x.fillRect(19, 8, 2, 2); x.fillRect(17, 12, 2, 2); // sound
  },
  comfy(x) {
    x.fillStyle = '#b04a4a'; x.fillRect(4, 6, 4, 12); x.fillRect(16, 6, 4, 12); x.fillRect(4, 12, 16, 6);
    x.fillStyle = '#c96a5a'; x.fillRect(8, 8, 8, 5); // cushion
    x.fillStyle = '#8a3838'; x.fillRect(4, 18, 3, 3); x.fillRect(17, 18, 3, 3);
  },
  charm(x) {
    x.fillStyle = '#f0b64a'; x.fillRect(5, 4, 14, 14); x.fillStyle = '#ffd97a'; x.fillRect(6, 5, 12, 3);
    x.fillStyle = '#3a241a'; x.fillRect(8, 8, 2, 2); x.fillRect(14, 8, 2, 2);
    x.fillStyle = '#c94f3d'; x.fillRect(8, 13, 8, 2); x.fillRect(9, 14, 6, 1);
    x.fillStyle = '#e5604f'; x.fillRect(16, 3, 4, 4); // little heart
  },
  cashier(x) {
    x.fillStyle = '#9a734e'; x.fillRect(7, 3, 10, 8); x.fillStyle = '#c2a582'; x.fillRect(9, 7, 6, 4); // bear head+muzzle
    x.fillStyle = '#20141c'; x.fillRect(9, 6, 2, 2); x.fillRect(13, 6, 2, 2);
    x.fillStyle = '#f0ead6'; x.fillRect(6, 12, 12, 8); x.fillStyle = '#3f7d6e'; x.fillRect(6, 12, 12, 2);
    x.fillStyle = '#f0b64a'; x.fillRect(2, 2, 3, 3); // coin
  },
  gearBg(x, tint) {
    x.fillStyle = '#788492';
    x.fillRect(9, 2, 6, 20); x.fillRect(2, 9, 20, 6);
    x.fillRect(4, 4, 6, 6); x.fillRect(14, 4, 6, 6); x.fillRect(4, 14, 6, 6); x.fillRect(14, 14, 6, 6);
    x.fillStyle = '#9aa6b2'; x.fillRect(6, 6, 12, 12);
    x.fillStyle = tint || '#5a6470'; x.fillRect(8, 8, 8, 8);
  }
};
const iconCache = {};
function upIconURL(id) {
  if (iconCache[id]) return iconCache[id];
  const [cv, x] = mkCanvas(24, 24);
  (ICON_DRAW[id] || ICON_DRAW.charm)(x);
  const url = cv.toDataURL();
  iconCache[id] = url;
  return url;
}

/* ---- Zootopia-style animal townsfolk: each customer is a species in clothes ---- */
const ANIMALS = [
  { id: 'fox',    fur: '#e2833a', dark: '#c96a24', belly: '#f6ead2', nose: '#2a1a14', ear: 'point',      tail: 'bushy' },
  { id: 'rabbit', fur: '#cfc7be', dark: '#a9a199', belly: '#f4efe8', nose: '#d38b93', ear: 'long',       tail: 'puff' },
  { id: 'bear',   fur: '#9a734e', dark: '#7a5636', belly: '#c2a582', nose: '#2a1a14', ear: 'round',      tail: 'none' },
  { id: 'cat',    fur: '#9298a6', dark: '#727888', belly: '#d9dde6', nose: '#d38b93', ear: 'point',      tail: 'thin', whisk: true },
  { id: 'panda',  fur: '#eef0f0', dark: '#c9cccc', belly: '#ffffff', nose: '#20242a', ear: 'roundblack', tail: 'none', patch: true },
  { id: 'pig',    fur: '#e89aa6', dark: '#d07f8c', belly: '#f6d6dc', nose: '#c06a78', ear: 'floppy',     tail: 'curl', pigsnout: true },
  { id: 'frog',   fur: '#7ec46a', dark: '#5fa84e', belly: '#dcecc4', nose: '#3a6a2a', ear: 'none',       tail: 'none', topeyes: true },
  { id: 'mouse',  fur: '#b3abb5', dark: '#948c96', belly: '#e3dde5', nose: '#d38b93', ear: 'biground',   tail: 'thin' },
];
const SHIRTS = ['#4a78b0', '#b04a4a', '#4aa06a', '#b08a3a', '#7a4ab0', '#b0648c', '#3f9b8e', '#c9722e'];

const custCache = {};
function custImg(look, frame) {
  const a = ANIMALS[look.species] || ANIMALS[0];
  const key = [look.species, look.shirt, look.granny ? 1 : 0, look.vip ? 1 : 0, frame].join('|');
  if (custCache[key]) return custCache[key];
  const [cv, x] = mkCanvas(16, 24);
  const shirt = look.vip ? '#20222c' : SHIRTS[look.shirt % SHIRTS.length];

  // ---- tail (behind body, right side) ----
  if (a.tail === 'bushy') { x.fillStyle = a.dark; x.fillRect(12, 12, 4, 7); x.fillStyle = a.belly; x.fillRect(14, 16, 2, 3); }
  else if (a.tail === 'puff') { x.fillStyle = a.belly; x.fillRect(13, 15, 3, 3); x.fillStyle = a.dark; x.fillRect(13, 15, 1, 1); }
  else if (a.tail === 'thin') { x.fillStyle = a.fur; x.fillRect(13, 12, 2, 8); }
  else if (a.tail === 'curl') { x.fillStyle = a.dark; x.fillRect(13, 14, 2, 1); x.fillRect(14, 13, 1, 2); x.fillRect(13, 12, 1, 1); }

  // ---- ears (behind/around head) ----
  x.fillStyle = a.fur;
  if (a.ear === 'point') { x.fillRect(3, 0, 3, 4); x.fillRect(10, 0, 3, 4); x.fillStyle = a.dark; x.fillRect(3, 0, 3, 1); x.fillRect(10, 0, 3, 1); }
  else if (a.ear === 'long') { x.fillRect(4, 0, 2, 5); x.fillRect(10, 0, 2, 5); x.fillStyle = a.belly; x.fillRect(4, 1, 1, 3); x.fillRect(10, 1, 1, 3); }
  else if (a.ear === 'round') { x.fillRect(3, 0, 3, 3); x.fillRect(10, 0, 3, 3); x.fillStyle = a.dark; x.fillRect(4, 1, 1, 1); x.fillRect(11, 1, 1, 1); }
  else if (a.ear === 'roundblack') { x.fillStyle = a.nose; x.fillRect(2, 0, 4, 4); x.fillRect(10, 0, 4, 4); }
  else if (a.ear === 'floppy') { x.fillRect(2, 3, 3, 4); x.fillRect(11, 3, 3, 4); x.fillStyle = a.dark; x.fillRect(2, 6, 3, 1); x.fillRect(11, 6, 3, 1); }
  else if (a.ear === 'biground') { x.fillRect(1, 0, 5, 5); x.fillRect(10, 0, 5, 5); x.fillStyle = a.belly; x.fillRect(2, 1, 3, 3); x.fillRect(11, 1, 3, 3); }

  // ---- head + muzzle ----
  x.fillStyle = a.fur; x.fillRect(4, 2, 8, 8);
  x.fillStyle = a.dark; x.fillRect(4, 9, 8, 1);            // jaw shade
  // muzzle / belly patch on the face
  x.fillStyle = a.belly;
  if (a.pigsnout) { x.fillRect(6, 6, 4, 4); }
  else if (a.topeyes) { x.fillRect(5, 7, 6, 2); }          // frog wide mouth area
  else { x.fillRect(5, 6, 6, 4); }
  // panda eye patches
  if (a.patch) { x.fillStyle = a.nose; x.fillRect(4, 4, 3, 3); x.fillRect(9, 4, 3, 3); }

  // ---- eyes ----
  if (a.topeyes) {                                          // frog: eyes bulge on top of head
    x.fillStyle = a.fur; x.fillRect(4, 0, 3, 3); x.fillRect(9, 0, 3, 3);
    x.fillStyle = '#fff'; x.fillRect(5, 1, 2, 2); x.fillRect(10, 1, 2, 2);
    x.fillStyle = '#20141c'; x.fillRect(6, 1, 1, 1); x.fillRect(11, 1, 1, 1);
  } else if (a.patch) {
    x.fillStyle = '#fff'; x.fillRect(5, 5, 1, 1); x.fillRect(10, 5, 1, 1);
    x.fillStyle = '#20141c'; x.fillRect(5, 5, 1, 1); x.fillRect(10, 5, 1, 1);
  } else {
    x.fillStyle = '#fff'; x.fillRect(5, 4, 2, 2); x.fillRect(9, 4, 2, 2);
    x.fillStyle = '#20141c'; x.fillRect(6, 5, 1, 1); x.fillRect(9, 5, 1, 1);
  }
  // ---- nose ----
  x.fillStyle = a.nose;
  if (a.pigsnout) { x.fillRect(6, 7, 4, 3); x.fillStyle = a.dark; x.fillRect(7, 8, 1, 1); x.fillRect(9, 8, 1, 1); }
  else { x.fillRect(7, 6, 2, 2); }
  // whiskers (cat)
  if (a.whisk) { x.fillStyle = a.dark; x.fillRect(1, 7, 3, 1); x.fillRect(12, 7, 3, 1); }

  // ---- body / clothes ----
  x.fillStyle = shirt;
  if (look.granny) { x.fillRect(4, 10, 8, 4); x.fillRect(3, 14, 10, 5); }
  else x.fillRect(4, 10, 8, 8);
  if (look.vip) {                                           // tuxedo front + bowtie + buttons
    x.fillStyle = '#f4f0e6'; x.fillRect(7, 10, 2, 8);
    x.fillStyle = '#c94f3d'; x.fillRect(6, 10, 4, 2);
    x.fillStyle = '#ffd97a'; x.fillRect(7, 14, 1, 1); x.fillRect(7, 16, 1, 1);
  } else {                                                  // collar hint
    x.fillStyle = a.belly; x.fillRect(7, 10, 2, 2);
  }
  // arms (fur, sleeves are shirt colored)
  x.fillStyle = shirt; x.fillRect(2, 11, 2, 4); x.fillRect(12, 11, 2, 4);
  x.fillStyle = a.fur; x.fillRect(2, 15, 2, 2); x.fillRect(12, 15, 2, 2);

  // ---- accessories ----
  if (look.vip) {                                           // top hat
    x.fillStyle = '#15161c'; x.fillRect(3, 0, 10, 2); x.fillRect(4, -3, 8, 4);
    x.fillStyle = '#4a4d5a'; x.fillRect(4, 0, 8, 1);
  }
  if (look.granny) {                                        // glasses + grey shawl trim
    x.fillStyle = '#4a4a52';
    x.fillRect(4, 3, 3, 1); x.fillRect(9, 3, 3, 1); x.fillRect(4, 6, 3, 1); x.fillRect(9, 6, 3, 1);
    x.fillRect(4, 4, 1, 2); x.fillRect(6, 4, 1, 2); x.fillRect(9, 4, 1, 2); x.fillRect(11, 4, 1, 2);
    x.fillStyle = '#c9b6d6'; x.fillRect(3, 13, 10, 1);
  }

  // ---- legs / paws (2 walk frames) ----
  x.fillStyle = a.dark;
  const legTop = look.granny ? 19 : 18;
  if (frame === 0) {
    x.fillRect(5, legTop, 3, 24 - legTop); x.fillRect(9, legTop, 3, 24 - legTop);
  } else {
    x.fillRect(4, legTop, 3, 23 - legTop); x.fillRect(10, legTop, 3, 24 - legTop);
  }
  // paw tips
  x.fillStyle = a.fur === '#eef0f0' ? a.dark : a.belly;
  if (frame === 0) { x.fillRect(5, 22, 3, 1); x.fillRect(9, 22, 3, 1); }
  else { x.fillRect(4, 21, 3, 1); x.fillRect(10, 22, 3, 1); }
  custCache[key] = cv;
  return cv;
}

/* choco-bot 14x18, 2 frames */
const botCache = {};
function botImg(frame) {
  if (botCache[frame]) return botCache[frame];
  const [cv, x] = mkCanvas(20, 18);
  // head
  x.fillStyle = '#9aa6b2'; x.fillRect(4, 2, 10, 6);
  x.fillStyle = '#c8d0d8'; x.fillRect(4, 2, 10, 2);
  x.fillStyle = '#3ce0f0'; x.fillRect(7, 4, 4, 2); // eye
  x.fillStyle = '#788492'; x.fillRect(8, 0, 2, 2); // antenna
  x.fillStyle = '#f05050'; x.fillRect(8, 0, 2, 1);
  // body
  x.fillStyle = '#788492'; x.fillRect(3, 8, 12, 7);
  x.fillStyle = '#9aa6b2'; x.fillRect(3, 8, 12, 2);
  x.fillStyle = '#f0b64a'; x.fillRect(7, 10, 4, 3); // belly light
  // treads
  x.fillStyle = '#3a4048'; x.fillRect(2, 15, 14, 3);
  x.fillStyle = '#20242a'; x.fillRect(3, 16, 2, 1); x.fillRect(7, 16, 2, 1); x.fillRect(11, 16, 2, 1);
  // knife arm
  x.fillStyle = '#788492';
  if (frame === 0) { x.fillRect(15, 9, 2, 3); x.fillStyle = '#c8d0d8'; x.fillRect(16, 6, 2, 5); }
  else { x.fillRect(15, 11, 3, 2); x.fillStyle = '#c8d0d8'; x.fillRect(17, 11, 2, 6); }
  botCache[frame] = cv;
  return cv;
}

/* ============================================================
   6. CANVAS SCENE — layout constants
   ============================================================ */
const W = 640, H = 360;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* bar geometry */
const SQ = 24;
const BX = 44, BY = 214, BW = 144, BH = 96;
/* the classic trick cuts */
const CUT1 = { x1: BX, y1: BY + 42, x2: BX + BW, y2: BY + 66 };
const CUT2 = { x1: BX + 48, y1: BY, x2: BX + 48, y2: BY + 50 };
/* piece polygons (in canvas coords) */
const POLY_TOP    = [[BX, BY], [BX + BW, BY], [BX + BW, BY + 66], [BX, BY + 42]];
const POLY_BOTTOM = [[BX, BY + 42], [BX + BW, BY + 66], [BX + BW, BY + BH], [BX, BY + BH]];
const POLY_TL     = [[BX, BY], [BX + 48, BY], [BX + 48, BY + 50], [BX, BY + 42]];
const POLY_TR     = [[BX + 48, BY], [BX + BW, BY], [BX + BW, BY + 66], [BX + 48, BY + 50]];

/* scene anchor points */
const MELTER = { x: 244, y: 128, w: 64, h: 126 };
const PACKER = { x: 320, y: 132, w: 62, h: 122 };
const COUNTER = { x: 398, y: 226, w: 102, h: 96 };
const SHELF = { x: 396, y: 60, w: 168, h: 92 };
const DOOR = { x: 604, y: 58, w: 34, h: 118 };
const QUEUE_X = [524, 566, 606];
const FEET_Y = 322;
const EXTRA_LAND = { x1: 196, x2: 226, y1: 296, y2: 318 };

/* ============================================================
   7. TRICK STATE MACHINE
   ============================================================ */
const trick = {
  stage: 'cut1',        // cut1 | cut2 | arrange | magic
  progress: 0,
  cutting: false,
  knife: { x: CUT1.x1, y: CUT1.y1, on: false, ang: 0 },
  lastT: 0,             // param along the cut line
  magicT: 0,
  autoArrangeT: 0,
  pendingPieces: 0,
  spawnQ: [],           // delayed extra piece spawns
  flashT: 0,
  scratchCool: 0
};

function activeCutLine() {
  if (trick.stage === 'cut1') return CUT1;
  if (trick.stage === 'cut2') return CUT2;
  return null;
}

/* project point onto the active cut line: returns {t, d} */
function projectOnLine(line, px, py) {
  const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
  const len2 = dx * dx + dy * dy;
  let t = ((px - line.x1) * dx + (py - line.y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = line.x1 + dx * t, cy = line.y1 + dy * t;
  const d = Math.hypot(px - cx, py - cy);
  return { t, d, cx, cy };
}

function cutInput(px, py, isMove) {
  const line = activeCutLine();
  if (!line) return;
  const p = projectOnLine(line, px, py);
  if (p.d > 16) { trick.knife.on = false; return; }
  trick.knife.on = true;
  trick.knife.x = p.cx; trick.knife.y = p.cy;
  trick.knife.ang = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
  if (isMove && trick.cutting) {
    // sawing: distance traveled along the line counts in both directions
    const delta = Math.abs(p.t - trick.lastT);
    if (delta > 0 && delta < 0.4) {
      trick.progress = clamp(trick.progress + delta * 0.55 * cutSpeedMult(), 0, 1);
      if (trick.scratchCool <= 0) { sfx.scratch(); trick.scratchCool = 0.07; }
      spawnCrumbs(p.cx, p.cy, 1);
    }
  }
  trick.lastT = p.t;
}

function completeCut() {
  sfx.snap();
  shake(2.5, 0.18);
  spawnCrumbs(trick.knife.x, trick.knife.y, 8);
  if (trick.stage === 'cut1') {
    trick.stage = 'cut2';
    trick.progress = 0;
    if (S.tut === 0) advanceTut(1);
  } else if (trick.stage === 'cut2') {
    trick.stage = 'arrange';
    trick.progress = 0;
    trick.autoArrangeT = 0;
    if (S.tut === 1) advanceTut(2);
  }
  trick.cutting = false;
  trick.knife.on = false;
  trick.lastT = 0; // fresh line next stage — don't carry sawing distance across
}

function startMagic() {
  if (trick.stage !== 'arrange') return;
  trick.stage = 'magic';
  trick.magicT = 0;
  trick.pendingPieces = trickYield();
  sfx.swap();
  if (S.tut === 2) advanceTut(3);
}

function finishMagic() {
  trick.stage = 'cut1';
  trick.progress = 0;
  trick.flashT = 0.001; // flash handled in draw
  S.stats.tricks++;
  if (Math.random() < 0.2) {
    addFloater(BX + BW / 2, BY - 12, 'STILL 24 SQUARES?!', '#ffd97a');
  }
}

function updateTrick(dt) {
  trick.scratchCool -= dt;
  if (trick.flashT > 0) { trick.flashT += dt; if (trick.flashT > 0.3) trick.flashT = 0; }

  if (trick.stage === 'cut1' || trick.stage === 'cut2') {
    // hold-to-saw assist (only while an on-line cut is actually in progress)
    if (trick.cutting && trick.knife.on) {
      trick.progress = clamp(trick.progress + dt * 0.22 * cutSpeedMult(), 0, 1);
    }
    if (trick.progress >= 1) completeCut();
  } else if (trick.stage === 'arrange') {
    if (lvl('hands') >= 1) {
      trick.autoArrangeT += dt;
      if (trick.autoArrangeT > 0.35) startMagic();
    }
  } else if (trick.stage === 'magic') {
    const prev = trick.magicT;
    trick.magicT += dt;
    // pop the extra piece(s) at t=0.42
    if (prev < 0.42 && trick.magicT >= 0.42) {
      sfx.pop(); sfx.magic();
      shake(2.5, 0.18);
      for (let i = 0; i < trick.pendingPieces; i++) {
        trick.spawnQ.push(0.42 + i * 0.12);
      }
      magicBurst(BX + 120, BY + 10);
    }
    if (trick.magicT >= 1.15) finishMagic();
  }
  // delayed extra piece spawns
  for (let i = trick.spawnQ.length - 1; i >= 0; i--) {
    if (trick.magicT >= trick.spawnQ[i] || trick.stage !== 'magic') {
      spawnExtraPiece();
      trick.spawnQ.splice(i, 1);
    }
  }
}

/* piece draw offsets for the current trick stage */
function pieceOffsets() {
  const off = { top: [0, 0], bottom: [0, 0], tl: [0, 0], tr: [0, 0] };
  const st = trick.stage;
  if (st === 'cut2' || st === 'arrange') off.bottom = [2, 4];
  if (st === 'arrange') off.tr = [3, -3];
  if (st === 'magic') {
    const t = trick.magicT;
    off.bottom = [2, 4];
    if (t < 0.35) {
      const k = easeInOut(t / 0.35);
      off.tl = [96 * k, 18 * k];
      off.tr = [3 - 51 * k, -3 - 5 * k];
    } else if (t < 0.6) {
      off.tl = [96 + rnd(-1, 1), 18];
      off.tr = [-48 + rnd(-1, 1), -8];
    } else if (t < 0.95) {
      const k = easeOut((t - 0.6) / 0.35);
      off.tl = [lerp(96, 0, k), lerp(18, 0, k)];
      off.tr = [lerp(-48, 0, k), lerp(-8, 0, k)];
      off.bottom = [lerp(2, 0, k), lerp(4, 0, k)];
    } else {
      off.tl = off.tr = off.bottom = [0, 0];
    }
  }
  return off;
}

/* ============================================================
   8. LOOSE EXTRA PIECES on the table
   ============================================================ */
const extras = []; // {x,y,vx,vy,landY,state,t,bounced}

function spawnExtraPiece() {
  extras.push({
    x: BX + 118 + rnd(-6, 6), y: BY + 4,
    vx: rnd(55, 110), vy: rnd(-190, -140),
    landY: rnd(EXTRA_LAND.y1, EXTRA_LAND.y2),
    state: 'fly', t: 0, bounced: false
  });
}

function collectExtra(e) {
  e.state = 'collect';
  e.t = 0;
  S.pieces++;
  S.stats.piecesMade++;
  sfx.collect();
  bumpHud('hud-pieces');
  addFloater(e.x, e.y - 10, '+1', '#d8a86c');
  if (S.tut === 3) advanceTut(4);
}

function updateExtras(dt) {
  for (let i = extras.length - 1; i >= 0; i--) {
    const e = extras[i];
    e.t += dt;
    if (e.state === 'fly') {
      e.vy += 480 * dt;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x > EXTRA_LAND.x2) { e.x = EXTRA_LAND.x2; e.vx *= -0.4; }
      if (e.y >= e.landY && e.vy > 0) {
        if (!e.bounced) { e.bounced = true; e.vy *= -0.42; e.vx *= 0.5; Snd.tone(300, 0.05, 'sine', 0.3); }
        else { e.state = 'idle'; e.y = e.landY; e.t = 0; }
      }
    } else if (e.state === 'idle') {
      if (Math.random() < dt * 2) sparkleBurst(e.x + rnd(-4, 4), e.y - rnd(2, 8), 1);
      if (lvl('hands') >= 2 && e.t > 0.5) collectExtra(e);
      else if (e.t > 20) collectExtra(e); // don't strand pieces forever
    } else if (e.state === 'collect') {
      // fly up to the HUD
      e.x += (80 - e.x) * dt * 6;
      e.y += (-20 - e.y) * dt * 6;
      if (e.y < -8 || e.t > 1) extras.splice(i, 1);
    }
  }
  // keep the table tidy: auto-collect the oldest if piling up
  const idle = extras.filter(e => e.state === 'idle');
  if (idle.length > 8) collectExtra(idle[0]);
}

/* ============================================================
   9. BOTS
   ============================================================ */
let botAcc = 0;
let botAnimT = 0;

function updateBots(dt) {
  const n = lvl('bot');
  if (n <= 0) return;
  botAnimT += dt;
  botAcc += dt * (n / botInterval());
  let made = 0;
  while (botAcc >= 1 && made < 40) {
    botAcc -= 1;
    const y = trickYield();
    S.pieces += y;
    S.stats.piecesMade += y;
    S.stats.tricks++;
    made += y;
  }
  if (botAcc >= 1) { // huge bot counts: settle the remainder in bulk
    const cycles = Math.floor(botAcc);
    botAcc -= cycles;
    const avg = Math.round(cycles * (1 + goldChance()));
    S.pieces += avg; S.stats.piecesMade += avg; S.stats.tricks += cycles;
  }
  if (made > 0) addFloater(30, 300, '+' + made, '#9adcf0', 0.5);
}

/* ============================================================
   10. MACHINES — melter & packager
   ============================================================ */
let autoCool = 0;

function startMelt() {
  const m = S.melter;
  if (m.run > 0) return false;
  const b = Math.min(meltBatchMax(), Math.floor(S.pieces / MELT_PIECES));
  if (b < 1) { sfx.denied(); return false; }
  S.pieces -= b * MELT_PIECES;
  m.run = b; m.t = 0; m.dur = meltDur(); m.runFlavor = m.flavor;
  sfx.fwoosh();
  if (S.tut === 4) advanceTut(5);
  uiDirty = true;
  return true;
}

function startPack(overrideFlavor) {
  const p = S.packer;
  if (p.run > 0) return false;
  // auto-pack may wrap a different flavor without changing the player's choice
  const useFlavor = (overrideFlavor && FLAV[overrideFlavor]) ? overrideFlavor : p.flavor;
  const b = Math.min(packBatchMax(), Math.floor((S.bars[useFlavor] || 0) / PACK_BARS));
  if (b < 1) { if (!overrideFlavor) sfx.denied(); return false; }
  S.bars[useFlavor] -= b * PACK_BARS;
  p.run = b; p.t = 0; p.dur = packDur(); p.runFlavor = useFlavor;
  sfx.wrap();
  uiDirty = true;
  return true;
}

function updateMachines(dt) {
  const m = S.melter, p = S.packer;
  if (m.run > 0) {
    m.t += dt;
    if (Math.random() < dt * 6) spawnSteam(MELTER.x + rnd(10, 50), MELTER.y + 4);
    if (m.t >= m.dur) {
      S.bars[m.runFlavor] = (S.bars[m.runFlavor] || 0) + m.run;
      S.stats.barsMade += m.run;
      addFloater(MELTER.x + 32, MELTER.y - 6, `+${m.run} ${FLAV[m.runFlavor].name} BAR${m.run > 1 ? 'S' : ''}`, FLAV[m.runFlavor].c.light);
      sfx.bubble(); sfx.ding();
      spawnSteam(MELTER.x + 32, MELTER.y, 6);
      m.run = 0;
      uiDirty = true;
    }
  }
  if (p.run > 0) {
    p.t += dt;
    if (p.t >= p.dur) {
      S.boxes[p.runFlavor] = (S.boxes[p.runFlavor] || 0) + p.run;
      S.stats.boxesMade += p.run;
      addFloater(PACKER.x + 30, PACKER.y - 6, `+${p.run} GIFT BOX${p.run > 1 ? 'ES' : ''}`, '#f0b64a');
      sfx.wrap(); sfx.ding();
      p.run = 0;
      uiDirty = true;
    }
  }
  // autos
  autoCool -= dt;
  if (autoCool <= 0) {
    autoCool = 0.4;
    if (lvl('automelt') && m.run === 0 && S.pieces >= MELT_PIECES) startMelt();
    if (lvl('autopack') && p.run === 0) {
      if ((S.bars[p.flavor] || 0) >= PACK_BARS) startPack();
      else {
        // pack the flavor with the most bars, WITHOUT changing the player's selection
        let best = null, bn = PACK_BARS - 1;
        for (const f of S.flavors) if ((S.bars[f] || 0) > bn) { bn = S.bars[f]; best = f; }
        if (best) startPack(best);
      }
    }
  }
}

/* ============================================================
   11. CUSTOMERS
   ============================================================ */
const customers = [];
let spawnTimer = 4;
let firstCustomer = true;
let serveStreak = 0;

function customersUnlocked() { return S.tut >= 5 || S.stats.served > 0; }

function spawnInterval() {
  const base = 13 / (1 + 0.12 * lvl('market'));
  const repF = 1.3 - S.rep * 0.12;
  return clamp(base * repF * rnd(0.7, 1.3), 2.5, 30);
}

function makeRequest(granny) {
  // first ever customer teaches the full chain: they want 1 milk bar
  if (firstCustomer && S.stats.served === 0) {
    return { type: 'bar', flavor: 'milk', qty: 1 };
  }
  const types = [['piece', 5]];
  if (S.stats.barsMade > 0) types.push(['bar', 4]);
  if (S.stats.boxesMade > 0) types.push(['box', 3]);
  let tot = 0; types.forEach(t => tot += t[1]);
  let roll = rnd(tot), type = 'piece';
  for (const [ty, w] of types) { roll -= w; if (roll <= 0) { type = ty; break; } }

  let flavor = 'milk';
  if (type !== 'piece') {
    const stockKey = type === 'bar' ? S.bars : S.boxes;
    const inStock = S.flavors.filter(f => stockKey[f] > 0);
    if (inStock.length && Math.random() < 0.65) {
      // weight by stock
      let sTot = 0; inStock.forEach(f => sTot += stockKey[f]);
      let r = rnd(sTot);
      flavor = inStock[0];
      for (const f of inStock) { r -= stockKey[f]; if (r <= 0) { flavor = f; break; } }
    } else {
      flavor = S.flavors[rndi(0, S.flavors.length - 1)];
    }
  }
  let qty = type === 'piece' ? rndi(3, 8) : type === 'bar' ? rndi(1, 3) : rndi(1, 2);
  if (granny) qty = Math.min(qty * 2, type === 'piece' ? 12 : 5);
  return { type, flavor, qty };
}

function spawnCustomer() {
  if (customers.length >= 3) return;
  const granny = S.rep > 3 && Math.random() < 0.1;
  // VIP: rare, well-dressed, impatient but tips huge — only once the shop has a name
  const vip = !granny && S.rep > 3.2 && S.stats.served > 8 && Math.random() < 0.09;
  const look = {
    species: rndi(0, ANIMALS.length - 1),
    shirt: rndi(0, SHIRTS.length - 1),
    granny, vip
  };
  const req = makeRequest(granny);
  if (firstCustomer) firstCustomer = false;
  const baseP = req.type === 'piece' ? 30 : req.type === 'bar' ? 42 : 55;
  const patience = baseP * patienceMult() * (granny ? 1.5 : 1) * (vip ? 0.7 : 1) * (S.stats.served === 0 ? 2 : 1);
  const slot = customers.length;
  customers.push({
    x: 650, slot,
    state: 'in', t: 0, walkT: rnd(10),
    look, req,
    patience, patienceMax: patience,
    shakeT: 0, deniedCool: 0
  });
  doorAnim = 1;
  sfx.bell();
}

function slotX(i) { return QUEUE_X[i]; }

function stockFor(req) {
  if (req.type === 'piece') return S.pieces;
  if (req.type === 'bar') return S.bars[req.flavor] || 0;
  return S.boxes[req.flavor] || 0;
}

function requestValue(c) {
  const r = c.req;
  const unit = r.type === 'piece' ? PRICE.piece : r.type === 'bar' ? barPrice(r.flavor) : boxPrice(r.flavor);
  return unit * r.qty;
}

function serveCustomer(c) {
  const r = c.req;
  if (stockFor(r) < r.qty) {
    if (c.deniedCool <= 0) {
      c.shakeT = 0.4; c.deniedCool = 0.8;
      sfx.denied();
      addFloater(c.x, FEET_Y - 60, `NEED ${r.qty - stockFor(r)} MORE!`, '#e5604f');
    }
    return;
  }
  if (r.type === 'piece') S.pieces -= r.qty;
  else if (r.type === 'bar') S.bars[r.flavor] -= r.qty;
  else S.boxes[r.flavor] -= r.qty;

  // serve streak: consecutive happy serves stack a growing tip bonus
  serveStreak++;
  const streakBonus = 1 + Math.min(serveStreak - 1, 10) * 0.05;   // up to +50%
  const speedFrac = c.patience / c.patienceMax;
  const base = requestValue(c);
  const tip = base * (0.1 + 0.35 * speedFrac) * (0.7 + S.rep * 0.14) * tipMult();
  const roleMult = c.look.vip ? 3 : (c.look.granny ? 2 : 1);
  const total = Math.max(1, Math.round((base + tip) * roleMult * streakBonus));
  S.money += total;
  S.stats.earned += total;
  S.stats.served++;
  S.rep = clamp(S.rep + 0.03 + r.qty * 0.004 + (c.look.vip ? 0.08 : 0), 0.5, 5);

  c.state = 'happy'; c.t = 0;
  sfx.coin();
  if (c.look.vip) { sfx.powerup(); confettiBurst(); }
  bumpHud('hud-money');
  addFloater(c.x, FEET_Y - 66, '+$' + fmt(total), c.look.vip ? '#ffe6a0' : '#ffd97a');
  if (c.look.vip) addFloater(c.x, FEET_Y - 82, 'VIP!', '#ffd97a', 0.9);
  else if (tip > base * 0.3) addFloater(c.x, FEET_Y - 80, 'TIP!', '#7ed67e', 0.8);
  if (serveStreak >= 3) addFloater(c.x + 18, FEET_Y - 94, 'COMBO x' + serveStreak, '#6fd8f0', 0.9);
  for (let i = 0; i < Math.min(8, 2 + Math.floor(total / 10)); i++) {
    particles.push({
      type: 'coin', x: c.x + rnd(-8, 8), y: FEET_Y - 40,
      tx: COUNTER.x + 26, ty: COUNTER.y - 6,
      t: 0, life: rnd(0.4, 0.65), delay: i * 0.05
    });
  }
  registerAnim = 0.35;
  if (S.tut === 5) advanceTut(6);
  uiDirty = true;
}

let cashierCool = 0;
function updateCustomers(dt) {
  if (customersUnlocked() && !document.hidden) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = spawnInterval();
      spawnCustomer();
    }
  }
  // Cashier employee: automatically serves the front waiting customer she can fill
  if (lvl('cashier')) {
    cashierCool -= dt;
    if (cashierCool <= 0) {
      const c = customers.find(c2 => c2.state === 'wait' && stockFor(c2.req) >= c2.req.qty);
      if (c) { serveCustomer(c); cashierCool = 1.1; }
      else cashierCool = 0.4;
    }
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i];
    c.t += dt;
    c.walkT += dt;
    c.deniedCool -= dt;
    if (c.shakeT > 0) c.shakeT -= dt;
    const tx = slotX(c.slot);
    if (c.state === 'in') {
      c.x += (tx - c.x) * clamp(dt * 3, 0, 1);
      if (Math.abs(c.x - tx) < 2) { c.x = tx; c.state = 'wait'; }
    } else if (c.state === 'wait') {
      c.x += (tx - c.x) * clamp(dt * 3, 0, 1);
      c.patience -= dt;
      if (c.patience <= 0) {
        c.state = 'angry'; c.t = 0;
        S.rep = clamp(S.rep - 0.2, 0.5, 5);
        S.stats.lost++;
        serveStreak = 0;   // a walked-out customer breaks the combo
        sfx.buzz();
        addFloater(c.x, FEET_Y - 66, 'HMPH!', '#e5604f');
      }
    } else if (c.state === 'happy') {
      if (c.t > 0.55) { c.x += 130 * dt; if (c.x > 660) removeCustomer(i); }
    } else if (c.state === 'angry') {
      if (c.t > 0.5) { c.x += 180 * dt; if (c.x > 660) removeCustomer(i); }
    }
  }
}

function removeCustomer(i) {
  customers.splice(i, 1);
  customers.forEach((c, j) => { c.slot = j; });
  doorAnim = 1;
}

/* ============================================================
   12. PARTICLES / FLOATERS / SHAKE
   ============================================================ */
const particles = [];
const floaters = [];
let shakeMag = 0, shakeT = 0, shakeDur = 0;
let doorAnim = 0;
let registerAnim = 0;

function shake(mag, dur) { shakeMag = mag; shakeT = dur; shakeDur = dur; }

function spawnCrumbs(x, y, n) {
  const c = FLAV.milk.c;
  for (let i = 0; i < n; i++) {
    if (particles.length > 320) return;
    particles.push({
      type: 'crumb', x: x + rnd(-3, 3), y: y + rnd(-2, 2),
      vx: rnd(-40, 40), vy: rnd(-80, -20), g: 300,
      t: 0, life: rnd(0.4, 0.8),
      color: Math.random() < 0.5 ? c.base : c.dark, size: rndi(1, 2)
    });
  }
}

/* the money-shot: an expanding golden ring + spinning stars where the
   impossible extra piece appears */
function magicBurst(x, y) {
  particles.push({ type: 'ring', x, y, t: 0, life: 0.45, r0: 4, r1: 46, color: '#ffd97a' });
  particles.push({ type: 'ring', x, y, t: 0, life: 0.6, r0: 2, r1: 34, color: '#fff6d8' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    particles.push({
      type: 'star', x, y,
      vx: Math.cos(a) * rnd(40, 80), vy: Math.sin(a) * rnd(40, 80) - 20, g: 60,
      t: 0, life: rnd(0.5, 0.85), spin: rnd(-8, 8), size: rndi(3, 4),
      color: i % 2 ? '#ffd97a' : '#fff'
    });
  }
  sparkleBurst(x, y, 12);
}

function sparkleBurst(x, y, n) {
  for (let i = 0; i < n; i++) {
    if (particles.length > 320) return;
    particles.push({
      type: 'spark', x: x + rnd(-6, 6), y: y + rnd(-6, 6),
      vx: rnd(-30, 30), vy: rnd(-50, 10), g: 40,
      t: 0, life: rnd(0.3, 0.7),
      color: Math.random() < 0.5 ? '#ffd97a' : '#ffffff', size: 1
    });
  }
}

function spawnSteam(x, y, n = 1) {
  for (let i = 0; i < n; i++) {
    if (particles.length > 320) return;
    particles.push({
      type: 'steam', x: x + rnd(-4, 4), y,
      vx: rnd(-8, 8), vy: rnd(-35, -20), g: 0,
      t: 0, life: rnd(0.8, 1.6), size: rndi(2, 4)
    });
  }
}

function confettiBurst() {
  const cols = ['#f0b64a', '#e5604f', '#7ed67e', '#6fa8dc', '#d4708c', '#fff'];
  for (let i = 0; i < 60; i++) {
    if (particles.length > 380) return;
    particles.push({
      type: 'confetti', x: rnd(0, W), y: -rnd(0, 40),
      vx: rnd(-25, 25), vy: rnd(30, 90), g: 30,
      t: 0, life: rnd(1.5, 3),
      color: cols[rndi(0, cols.length - 1)], size: rndi(2, 3)
    });
  }
}

function addFloater(x, y, txt, color, life = 1.1) {
  floaters.push({ x, y, txt, color, t: 0, life });
}

function updateFx(dt) {
  if (shakeT > 0) shakeT -= dt;
  if (doorAnim > 0) doorAnim -= dt * 1.6;
  if (registerAnim > 0) registerAnim -= dt;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.delay && p.delay > 0) { p.delay -= dt; continue; }
    p.t += dt;
    if (p.t >= p.life) { particles.splice(i, 1); continue; }
    if (p.type === 'coin') {
      const k = easeInOut(p.t / p.life);
      p.dx = lerp(p.x, p.tx, k); p.dy = lerp(p.y, p.ty, k) - Math.sin(k * Math.PI) * 26;
    } else if (p.type === 'ring') {
      // stationary expanding ring — no physics
    } else {
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    f.y -= 22 * dt;
    if (f.t >= f.life) floaters.splice(i, 1);
  }
}

/* ============================================================
   13. TUTORIAL
   ============================================================ */
const TUT_MSGS = [
  'DRAG THE KNIFE ALONG THE DOTTED LINE!',
  'GREAT! ONE MORE CUT...',
  'NOW CLICK THE BAR FOR THE MAGIC TRICK',
  'AN EXTRA PIECE?! CLICK IT TO GRAB IT',
  'STOCK 4 PIECES, THEN HIT MELT (PANEL BELOW)',
  'A CUSTOMER! CLICK THEM WHEN YOU HAVE THEIR ORDER'
];

function advanceTut(step) {
  if (S.tut >= step) return;
  S.tut = step;
  sfx.click();
  if (step === 5) { spawnTimer = 1.2; }
  if (step === 6) toast('TUTORIAL DONE — THE SHOP IS YOURS!', false);
  uiDirty = true;
}

/* ============================================================
   14. MILESTONES & WIN
   ============================================================ */
let mileCool = 0;
function updateMilestones(dt) {
  mileCool -= dt;
  if (mileCool > 0) return;
  mileCool = 0.5;
  for (const m of MILESTONES) {
    if (S.mile[m.id]) continue;
    let ok = false;
    try { ok = m.c(); } catch (e) { ok = false; }
    if (!ok) continue;
    S.mile[m.id] = true;
    if (m.r > 0) { S.money += m.r; S.stats.earned += m.r; }
    toast('🏆 ' + m.t + (m.r ? '  +$' + m.r : ''));
    confettiBurst();
    if (m.win && !S.winSeen) {
      S.winSeen = true;
      sfx.win();
      showOverlay('🏆 CHOCOLATE MOGUL 🏆',
        `You made <span class="gold">$1,000,000</span> selling chocolate that<br>geometrically should not exist.<br><br>` +
        `Somewhere, a math teacher just felt<br>a great disturbance.<br><br>` +
        `<span class="dim">The shop stays open. The bar remains infinite.</span>`,
        'KEEP SLICING');
    } else {
      sfx.fanfare();
    }
  }
}

/* ============================================================
   15. TOASTS & OVERLAY
   ============================================================ */
function toast(msg, gold = true) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (gold ? '' : ' plain');
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 4000);
}

function showOverlay(title, bodyHTML, btnLabel, onClose) {
  const ov = document.getElementById('overlay');
  document.getElementById('overlay-title').innerHTML = title;
  document.getElementById('overlay-body').innerHTML = bodyHTML;
  const btn = document.getElementById('overlay-btn');
  btn.textContent = btnLabel || 'OK';
  ov.classList.remove('hidden');
  btn.onclick = () => {
    Snd.init(); Snd.resume();
    sfx.click();
    ov.classList.add('hidden');
    if (onClose) onClose();
  };
}

/* ============================================================
   16. OFFLINE PROGRESS
   ============================================================ */
/* simulate `dt` seconds of unattended progress; returns what was gained */
function offlineGains(dt) {
  const gains = { pieces: 0, bars: 0, boxes: 0 };
  // bots
  const n = lvl('bot');
  if (n > 0) {
    const cycles = Math.floor(dt / botInterval()) * n;
    const made = Math.floor(cycles * (1 + goldChance()));
    gains.pieces += made;
    S.pieces += made;
    S.stats.piecesMade += made;
    S.stats.tricks += cycles;
  }
  // finish active machine runs
  const m = S.melter, p = S.packer;
  if (m.run > 0 && m.t + dt >= m.dur) {
    S.bars[m.runFlavor] += m.run; S.stats.barsMade += m.run; gains.bars += m.run; m.run = 0;
  } else if (m.run > 0) {
    m.t += dt;
  }
  if (p.run > 0 && p.t + dt >= p.dur) {
    S.boxes[p.runFlavor] += p.run; S.stats.boxesMade += p.run; gains.boxes += p.run; p.run = 0;
  } else if (p.run > 0) {
    p.t += dt;
  }
  // auto machines churn through what's available
  if (lvl('automelt')) {
    const runs = Math.min(Math.floor(dt / meltDur()), Math.floor(S.pieces / MELT_PIECES) + 1);
    for (let i = 0; i < runs; i++) {
      const b = Math.min(meltBatchMax(), Math.floor(S.pieces / MELT_PIECES));
      if (b < 1) break;
      S.pieces -= b * MELT_PIECES;
      S.bars[m.flavor] += b; S.stats.barsMade += b; gains.bars += b;
    }
  }
  if (lvl('autopack')) {
    const runs = Math.min(Math.floor(dt / packDur()), 500);
    for (let i = 0; i < runs; i++) {
      const b = Math.min(packBatchMax(), Math.floor(S.bars[p.flavor] / PACK_BARS));
      if (b < 1) break;
      S.bars[p.flavor] -= b * PACK_BARS;
      S.boxes[p.flavor] += b; S.stats.boxesMade += b; gains.boxes += b;
    }
  }
  gains.any = gains.pieces > 0 || gains.bars > 0 || gains.boxes > 0;
  if (gains.any) uiDirty = true;
  return gains;
}

function applyOffline() {
  const dt = clamp((Date.now() - (S.last || Date.now())) / 1000, 0, 4 * 3600);
  if (dt < 90) return;
  const gains = offlineGains(dt);
  if (gains.any) {
    const parts = [];
    if (gains.pieces) parts.push(`<span class="gold">+${fmt(gains.pieces)}</span> pieces`);
    if (gains.bars) parts.push(`<span class="gold">+${fmt(gains.bars)}</span> bars`);
    if (gains.boxes) parts.push(`<span class="gold">+${fmt(gains.boxes)}</span> gift boxes`);
    showOverlay('WELCOME BACK!',
      `Your crew kept working for <span class="gold">${fmtTime(dt)}</span>:<br><br>${parts.join('<br>')}`,
      'BACK TO WORK');
  }
}

/* ============================================================
   17. INPUT
   ============================================================ */
const pointer = { x: 0, y: 0, down: false };

function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height)
  };
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function customerAt(px, py) {
  for (const c of customers) {
    if (c.state !== 'wait') continue;
    // hit box spans the sprite AND the raised request bubble for this queue slot,
    // so clicking either serves the customer
    const top = FEET_Y - 96 - c.slot * 20;
    if (px > c.x - 30 && px < c.x + 30 && py > top && py < FEET_Y + 4) return c;
  }
  return null;
}

function extraAt(px, py) {
  for (const e of extras) {
    if (e.state !== 'idle' && e.state !== 'fly') continue;
    if (Math.hypot(px - e.x, py - e.y) < 16) return e;
  }
  return null;
}

function inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

/* machine click rects, extended upward to include the hanging MELT/WRAP signs */
const MELTER_HIT = { x: MELTER.x, y: MELTER.y - 20, w: MELTER.w, h: MELTER.h + 20 };
const PACKER_HIT = { x: PACKER.x, y: PACKER.y - 22, w: PACKER.w, h: PACKER.h + 22 };
function machineAt(px, py) {
  if (inRect(px, py, MELTER_HIT)) return 'melt';
  if (inRect(px, py, PACKER_HIT)) return 'pack';
  return null;
}
function inBarZone(px, py) {
  return px > BX - 10 && px < BX + BW + 10 && py > BY - 10 && py < BY + BH + 10;
}

cv.addEventListener('pointerdown', e => {
  Snd.init(); Snd.resume();
  const p = canvasPos(e);
  pointer.x = p.x; pointer.y = p.y; pointer.down = true;
  cv.setPointerCapture(e.pointerId);

  // 1. loose extra pieces
  const ex = extraAt(p.x, p.y);
  if (ex) { collectExtra(ex); return; }
  // 2. customers
  const cust = customerAt(p.x, p.y);
  if (cust) { serveCustomer(cust); return; }
  // 3. machines (rect includes the hanging sign the tutorial arrow points at)
  const mach = machineAt(p.x, p.y);
  if (mach === 'melt') { startMelt(); return; }
  if (mach === 'pack') { startPack(); return; }
  // 4. arrange stage: click the bar
  if (trick.stage === 'arrange' && inBarZone(p.x, p.y)) {
    startMagic();
    return;
  }
  // 5. cutting
  const line = activeCutLine();
  if (line) {
    const pr = projectOnLine(line, p.x, p.y);
    if (pr.d < 16) {
      trick.cutting = true;
      trick.lastT = pr.t;
      cutInput(p.x, p.y, false);
    }
  }
});

cv.addEventListener('pointermove', e => {
  const p = canvasPos(e);
  pointer.x = p.x; pointer.y = p.y;
  if (activeCutLine()) cutInput(p.x, p.y, true);
  // cursor styling
  let cur = '';
  if (extraAt(p.x, p.y) || customerAt(p.x, p.y) || machineAt(p.x, p.y)) cur = 'cur-hand';
  else if (trick.stage === 'arrange' && inBarZone(p.x, p.y)) cur = 'cur-hand';
  else if (activeCutLine() && projectOnLine(activeCutLine(), p.x, p.y).d < 16) cur = 'cur-knife';
  cv.className = cur;
});

function endPointer() {
  pointer.down = false;
  trick.cutting = false;
  trick.knife.on = false;
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
cv.addEventListener('lostpointercapture', endPointer);
// a hidden tab can swallow pointerup; releasing on blur avoids a stuck press
window.addEventListener('blur', endPointer);

/* ============================================================
   18. RENDERING
   ============================================================ */
/* a little pixel price tag: "$" swoosh on a cream label */
function priceTag(g, x, y) {
  g.fillStyle = '#f7ead0'; g.fillRect(x, y, 9, 6);
  g.fillStyle = '#c94f3d'; g.fillRect(x + 1, y + 1, 7, 1);
  g.fillStyle = '#8a2e22'; g.fillRect(x + 3, y + 2, 3, 3);
}

/* LEFT WALL: a stocked convenience-store display cabinet (pure decor) */
function drawStoreCabinet(g) {
  const X = 14, Y = 52, Wd = 158, Ht = 108;
  // cabinet carcass + back panel
  g.fillStyle = '#3a2416'; g.fillRect(X - 3, Y - 3, Wd + 6, Ht + 8);
  g.fillStyle = '#26527a'; g.fillRect(X, Y, Wd, Ht);           // painted back
  g.fillStyle = '#2e6390'; for (let i = 0; i < Wd; i += 8) g.fillRect(X + i, Y, 1, Ht);
  // top valance + sign
  g.fillStyle = '#8a2e22'; g.fillRect(X - 4, Y - 12, Wd + 8, 12);
  g.fillStyle = '#a53a2c'; g.fillRect(X - 4, Y - 12, Wd + 8, 3);
  g.fillStyle = '#ffd97a'; g.font = '8px "PS2P", monospace'; g.textBaseline = 'top';
  g.fillText('SWEETS', X + 44, Y - 11);
  const shelfY = [Y + 30, Y + 66, Y + 102];
  // three glass shelves
  for (const sy of shelfY) {
    g.fillStyle = 'rgba(180,220,240,0.18)'; g.fillRect(X, sy - 24, Wd, 24);
    g.fillStyle = '#6b4a2c'; g.fillRect(X, sy, Wd, 4);
    g.fillStyle = '#8a6440'; g.fillRect(X, sy, Wd, 1);
  }
  // --- shelf 1: candy jars ---
  const jarCols = ['#d4708c', '#6fc493', '#e3b341', '#c98a3d', '#8a5a2b'];
  for (let i = 0; i < 5; i++) {
    const jx = X + 8 + i * 30, jy = shelfY[0] - 22;
    g.fillStyle = 'rgba(230,245,252,0.9)'; g.fillRect(jx, jy, 20, 22);
    g.fillStyle = jarCols[i]; g.fillRect(jx + 2, jy + 8, 16, 12);
    // candy dots inside
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(jx + 4, jy + 10, 2, 2); g.fillRect(jx + 9, jy + 13, 2, 2); g.fillRect(jx + 13, jy + 10, 2, 2);
    g.fillStyle = '#8aa4b0'; g.fillRect(jx, jy, 20, 3);           // lid
    g.fillStyle = '#eef6fa'; g.fillRect(jx + 2, jy + 4, 3, 14);   // glass glint
    if (i % 2 === 0) priceTag(g, jx + 5, shelfY[0] - 9);
  }
  // --- shelf 2: chocolate bars standing + boxes ---
  const barCols = ['#8a5a2b', '#4d2e17', '#e8d5ae', '#c98a3d'];
  for (let i = 0; i < 6; i++) {
    const bx = X + 8 + i * 15, by = shelfY[1] - 22;
    const c = barCols[i % barCols.length];
    g.fillStyle = '#c9a24a'; g.fillRect(bx, by, 12, 22);         // foil wrapper
    g.fillStyle = c; g.fillRect(bx + 1, by + 5, 10, 13);         // label window
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(bx + 1, by, 10, 2);
  }
  priceTag(g, X + 100, shelfY[1] - 9);
  // gift boxes on the right of shelf 2
  for (let i = 0; i < 2; i++) {
    const gx = X + 120 + i * 20, gy = shelfY[1] - 18;
    g.fillStyle = '#b5476f'; g.fillRect(gx, gy, 16, 16);
    g.fillStyle = '#e8c0d2'; g.fillRect(gx, gy + 6, 16, 2); g.fillRect(gx + 6, gy, 2, 16);
    g.fillStyle = '#ffd97a'; g.fillRect(gx + 5, gy - 2, 6, 3);
  }
  // --- shelf 3: bottles + a SALE sign ---
  const botCols = ['#a5522c', '#6fa8dc', '#7ed67e', '#e3b341', '#d4708c'];
  for (let i = 0; i < 5; i++) {
    const px = X + 8 + i * 22, py = shelfY[2] - 22;
    g.fillStyle = botCols[i]; g.fillRect(px + 3, py + 4, 8, 18);
    g.fillStyle = '#3a2416'; g.fillRect(px + 5, py, 4, 5);        // neck
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(px + 4, py + 6, 2, 12);
    g.fillStyle = '#f7ead0'; g.fillRect(px + 4, py + 12, 6, 4);   // label
  }
  g.fillStyle = '#c94f3d'; g.fillRect(X + 120, shelfY[2] - 20, 30, 16);
  g.fillStyle = '#ffd97a'; g.fillRect(X + 120, shelfY[2] - 20, 30, 2);
  g.fillStyle = '#fff'; g.font = '8px "PS2P", monospace';
  g.fillText('SALE', X + 122, shelfY[2] - 16);
  // potted plant beside the cabinet (cosmetic)
  g.fillStyle = '#7a4a24'; g.fillRect(X + 66, Y + Ht + 2, 22, 12);
  g.fillStyle = '#8f5a2c'; g.fillRect(X + 66, Y + Ht + 2, 22, 2);
  g.fillStyle = '#3f8a4d'; g.fillRect(X + 70, Y + Ht - 8, 14, 10);
  g.fillStyle = '#4fa85e'; g.fillRect(X + 72, Y + Ht - 12, 4, 6); g.fillRect(X + 78, Y + Ht - 10, 4, 5);
}

/* static background, drawn once */
const [bgCv, bg] = mkCanvas(W, H);
function buildBG() {
  // wall
  bg.fillStyle = '#7a4a2e'; bg.fillRect(0, 0, W, 172);
  bg.fillStyle = '#6d4128';
  for (let y = 0; y < 172; y += 24) bg.fillRect(0, y, W, 2);
  for (let x = 0; x < W; x += 48) for (let y = 0; y < 172; y += 24) bg.fillRect(x + (y % 48 ? 24 : 0), y, 2, 24);
  // baseboard
  bg.fillStyle = '#4a2c18'; bg.fillRect(0, 164, W, 8);
  bg.fillStyle = '#5d3820'; bg.fillRect(0, 164, W, 2);
  // floor: long horizontal planks, darker than the wall
  bg.fillStyle = '#96683a'; bg.fillRect(0, 172, W, H - 172);
  bg.fillStyle = '#7f5730';
  for (let y = 172; y < H; y += 16) bg.fillRect(0, y, W, 2);
  bg.fillStyle = '#8d5f34';
  for (let y = 176, i = 0; y < H; y += 16, i++)
    for (let x = 8 + (i % 3) * 22; x < W; x += 90) bg.fillRect(x, y, 26, 1);

  // hanging shop sign, centered above the window
  bg.fillStyle = '#4a2c18'; bg.fillRect(236, 2, 2, 8); bg.fillRect(348, 2, 2, 8);
  bg.fillStyle = '#3a2416'; bg.fillRect(222, 8, 142, 18);
  bg.fillStyle = '#55371f'; bg.fillRect(224, 10, 138, 14);
  bg.fillStyle = '#f0b64a';
  bg.font = '8px "PS2P", monospace'; bg.textBaseline = 'top';
  bg.fillText('CHOCO & CO', 244, 13);

  // window frame
  bg.fillStyle = '#4a2c18'; bg.fillRect(248, 30, 92, 78);
  bg.fillStyle = '#2a1a0e'; bg.fillRect(252, 34, 84, 70);
  // (sky drawn dynamically)

  // ---- LEFT WALL: convenience-store display cabinet (cosmetic) ----
  drawStoreCabinet(bg);

  // cutting table
  bg.fillStyle = '#8a5c33'; bg.fillRect(20, 196, 212, 140);
  bg.fillStyle = '#9c6c3d'; bg.fillRect(20, 196, 212, 6);
  bg.fillStyle = '#734b28'; bg.fillRect(20, 328, 212, 8);
  bg.fillStyle = '#5d3b20'; bg.fillRect(24, 202, 204, 2);
  // board under the bar
  bg.fillStyle = '#c9b18d'; bg.fillRect(36, 206, 160, 112);
  bg.fillStyle = '#b89f7c'; bg.fillRect(36, 206, 160, 3); bg.fillRect(36, 315, 160, 3);

  // counter
  bg.fillStyle = '#8a5c33'; bg.fillRect(COUNTER.x, COUNTER.y, COUNTER.w, 12);
  bg.fillStyle = '#9c6c3d'; bg.fillRect(COUNTER.x, COUNTER.y, COUNTER.w, 4);
  bg.fillStyle = '#734b28'; bg.fillRect(COUNTER.x + 4, COUNTER.y + 12, COUNTER.w - 8, 84);
  bg.fillStyle = '#5d3b20';
  bg.fillRect(COUNTER.x + 12, COUNTER.y + 20, COUNTER.w - 24, 2);
  bg.fillRect(COUNTER.x + 12, COUNTER.y + 50, COUNTER.w - 24, 2);

  // shelf above counter (goods display)
  bg.fillStyle = '#55371f';
  bg.fillRect(SHELF.x, SHELF.y + 34, SHELF.w, 6);
  bg.fillRect(SHELF.x, SHELF.y + 84, SHELF.w, 6);
  bg.fillStyle = '#3a2416';
  bg.fillRect(SHELF.x + 4, SHELF.y + 40, 4, 6); bg.fillRect(SHELF.x + SHELF.w - 8, SHELF.y + 40, 4, 6);
  bg.fillRect(SHELF.x + 4, SHELF.y + 90, 4, 6); bg.fillRect(SHELF.x + SHELF.w - 8, SHELF.y + 90, 4, 6);

  // door frame
  bg.fillStyle = '#4a2c18'; bg.fillRect(DOOR.x - 4, DOOR.y - 4, DOOR.w + 8, DOOR.h + 8);
  bg.fillStyle = '#2a1a0e'; bg.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  // welcome mat
  bg.fillStyle = '#a83232'; bg.fillRect(DOOR.x - 8, 178, 50, 14);
  bg.fillStyle = '#8a2828'; bg.fillRect(DOOR.x - 6, 180, 46, 10);
}

/* vignette overlay, prebuilt */
const [vigCv, vg] = mkCanvas(W, H);
function buildVignette() {
  const g = vg.createRadialGradient(W / 2, H / 2, H / 2.2, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,0,0.42)');
  vg.fillStyle = g; vg.fillRect(0, 0, W, H);
}

function drawPoly(x, poly, ox, oy) {
  x.beginPath();
  x.moveTo(poly[0][0] + ox, poly[0][1] + oy);
  for (let i = 1; i < poly.length; i++) x.lineTo(poly[i][0] + ox, poly[i][1] + oy);
  x.closePath();
}

/* draw one bar piece: clip polygon, draw bar image offset */
function drawPiece(poly, ox, oy) {
  ctx.save();
  drawPoly(ctx, poly, ox, oy);
  ctx.clip();
  ctx.drawImage(barImg('milk'), BX - 2 + ox, BY - 2 + oy);
  ctx.restore();
  // outline the piece subtly
  ctx.save();
  drawPoly(ctx, poly, ox, oy);
  ctx.strokeStyle = 'rgba(30,14,4,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawCutLine(line, progress, time) {
  // remaining (uncut) part is dashed; cut part is a dark crack
  const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
  const px = line.x1 + dx * progress, py = line.y1 + dy * progress;
  // crack
  if (progress > 0) {
    ctx.strokeStyle = '#2a1206';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(line.x1, line.y1); ctx.lineTo(px, py); ctx.stroke();
  }
  // dashed guide
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.lineDashOffset = -time * 14;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(line.x2, line.y2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // glow dot at cut point
  const pulse = 2 + Math.sin(time * 6) * 1;
  ctx.fillStyle = '#ffd97a';
  ctx.fillRect(px - pulse / 2, py - pulse / 2, pulse, pulse);
}

function drawKnife() {
  const line = activeCutLine();
  if (!line) return;
  const k = trick.knife;
  ctx.save();
  const bob = trick.cutting ? rnd(-1, 1) : Math.sin(nowT * 3) * 2;
  // idle ghost sits a little way along the line
  const gx = line.x1 + (line.x2 - line.x1) * 0.12;
  const gy = line.y1 + (line.y2 - line.y1) * 0.12;
  const ang = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
  ctx.translate(k.on ? k.x : gx, (k.on ? k.y : gy) - 14 + bob);
  ctx.rotate((k.on ? k.ang : ang) + Math.PI / 3.2);
  ctx.drawImage(knifeImg, -4, -4);
  ctx.restore();
}

function drawBar(time) {
  // shadow
  ctx.fillStyle = 'rgba(40,18,4,0.35)';
  ctx.fillRect(BX - 4, BY + BH - 2, BW + 10, 8);

  const st = trick.stage;
  if (st === 'cut1' && trick.progress === 0 || trick.flashT > 0) {
    // whole bar
    ctx.drawImage(barImg('milk'), BX - 2, BY - 2);
  } else if (st === 'cut1') {
    drawPiece(POLY_TOP, 0, 0);
    drawPiece(POLY_BOTTOM, 0, 0);
  } else {
    const off = pieceOffsets();
    drawPiece(POLY_BOTTOM, off.bottom[0], off.bottom[1]);
    if (st === 'cut2') {
      drawPiece(POLY_TOP, 0, 0);
    } else {
      drawPiece(POLY_TL, off.tl[0], off.tl[1]);
      drawPiece(POLY_TR, off.tr[0], off.tr[1]);
    }
  }

  // cut guide lines
  if (st === 'cut1') drawCutLine(CUT1, trick.progress, time);
  if (st === 'cut2') {
    // show the finished first cut as a crack
    ctx.strokeStyle = '#2a1206'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CUT1.x1, CUT1.y1); ctx.lineTo(CUT1.x2, CUT1.y2); ctx.stroke();
    drawCutLine(CUT2, trick.progress, time);
  }
  if (st === 'arrange') {
    // pulse highlight on the two top pieces
    const a = 0.25 + Math.sin(time * 5) * 0.15;
    ctx.fillStyle = `rgba(255,217,122,${a})`;
    drawPoly(ctx, POLY_TL, 0, 0); ctx.fill();
    drawPoly(ctx, POLY_TR, 3, -3); ctx.fill();
  }
  // magic flash
  if (trick.flashT > 0) {
    const a = 1 - trick.flashT / 0.3;
    ctx.fillStyle = `rgba(255,255,240,${a * 0.85})`;
    ctx.fillRect(BX - 6, BY - 6, BW + 12, BH + 12);
  }
  drawKnife();
}

function drawWindowSky(time) {
  ctx.save();
  ctx.beginPath(); ctx.rect(252, 34, 84, 70); ctx.clip();
  ctx.fillStyle = '#7ec0e8'; ctx.fillRect(252, 34, 84, 70);
  ctx.fillStyle = '#9ed4f2'; ctx.fillRect(252, 34, 84, 18);
  // sun
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(312, 42, 12, 12);
  ctx.fillStyle = '#fff2c0'; ctx.fillRect(314, 44, 8, 8);
  // clouds
  const cx1 = 252 + ((time * 4) % 130) - 30;
  const cx2 = 252 + ((time * 2.6 + 60) % 130) - 30;
  ctx.fillStyle = '#f4fbff';
  ctx.fillRect(cx1, 52, 26, 8); ctx.fillRect(cx1 + 5, 48, 14, 6);
  ctx.fillRect(cx2, 78, 20, 7); ctx.fillRect(cx2 + 4, 74, 11, 5);
  ctx.restore();
  // cross frame
  ctx.fillStyle = '#4a2c18';
  ctx.fillRect(290, 34, 4, 70); ctx.fillRect(252, 66, 84, 4);
}

function drawMelter(time) {
  const m = S.melter;
  const active = m.run > 0;
  const fl = FLAV[active ? m.runFlavor : m.flavor];
  // legs
  ctx.fillStyle = '#3a4048'; ctx.fillRect(MELTER.x + 6, MELTER.y + 96, 8, 30); ctx.fillRect(MELTER.x + 50, MELTER.y + 96, 8, 30);
  // body
  ctx.fillStyle = '#788492'; ctx.fillRect(MELTER.x, MELTER.y + 18, MELTER.w, 84);
  ctx.fillStyle = '#9aa6b2'; ctx.fillRect(MELTER.x, MELTER.y + 18, MELTER.w, 6);
  ctx.fillStyle = '#5a6470'; ctx.fillRect(MELTER.x, MELTER.y + 96, MELTER.w, 6);
  // rivets
  ctx.fillStyle = '#4a525c';
  for (let i = 0; i < 4; i++) { ctx.fillRect(MELTER.x + 4 + i * 18, MELTER.y + 22, 2, 2); ctx.fillRect(MELTER.x + 4 + i * 18, MELTER.y + 90, 2, 2); }
  // chimney
  ctx.fillStyle = '#5a6470'; ctx.fillRect(MELTER.x + 22, MELTER.y, 20, 20);
  ctx.fillStyle = '#3a4048'; ctx.fillRect(MELTER.x + 20, MELTER.y, 24, 4);
  // round pressure gauge with a wobbling needle
  const gx = MELTER.x + 50, gy = MELTER.y + 26;
  ctx.fillStyle = '#e8e0cc'; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a4048'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.stroke();
  const na = -2.2 + (active ? 1.6 + Math.sin(time * 8) * 0.3 : 0.3);
  ctx.strokeStyle = '#c94f3d'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * 4, gy + Math.sin(na) * 4); ctx.stroke();
  // window with liquid
  ctx.fillStyle = '#20242a'; ctx.fillRect(MELTER.x + 10, MELTER.y + 34, 44, 40);
  const fillH = active ? (m.t / m.dur) * 36 : (S.pieces >= MELT_PIECES ? 8 : 3);
  ctx.fillStyle = fl.c.base;
  ctx.fillRect(MELTER.x + 12, MELTER.y + 72 - fillH, 40, fillH);
  ctx.fillStyle = fl.c.light;
  ctx.fillRect(MELTER.x + 12, MELTER.y + 72 - fillH, 40, 2);
  if (active) {
    // bubbles
    for (let i = 0; i < 3; i++) {
      const bx2 = MELTER.x + 16 + ((i * 13 + time * 30) % 36);
      const by2 = MELTER.y + 72 - rnd(2, fillH);
      ctx.fillStyle = fl.c.light;
      ctx.fillRect(bx2, by2, 2, 2);
    }
    // fire glow
    const g = 0.5 + Math.sin(time * 9) * 0.3;
    ctx.fillStyle = `rgba(240,120,40,${g})`;
    ctx.fillRect(MELTER.x + 14, MELTER.y + 104, 36, 14);
    ctx.fillStyle = `rgba(255,220,90,${g})`;
    ctx.fillRect(MELTER.x + 22, MELTER.y + 108, 20, 10);
  }
  // progress LED strip
  if (active) {
    const p = m.t / m.dur;
    ctx.fillStyle = '#20242a'; ctx.fillRect(MELTER.x + 8, MELTER.y + 80, 48, 6);
    ctx.fillStyle = '#7ed67e'; ctx.fillRect(MELTER.x + 9, MELTER.y + 81, 46 * p, 4);
  }
  // hanging wall sign
  ctx.fillStyle = '#3a2416'; ctx.fillRect(MELTER.x + 8, MELTER.y - 18, 48, 14);
  ctx.fillStyle = '#55371f'; ctx.fillRect(MELTER.x + 10, MELTER.y - 16, 44, 10);
  ctx.fillStyle = '#f0b64a';
  ctx.font = '8px "PS2P", monospace';
  ctx.fillText('MELT', MELTER.x + 16, MELTER.y - 15);
}

function drawPacker(time) {
  const p = S.packer;
  const active = p.run > 0;
  // legs
  ctx.fillStyle = '#5a4668'; ctx.fillRect(PACKER.x + 6, PACKER.y + 92, 8, 30); ctx.fillRect(PACKER.x + 48, PACKER.y + 92, 8, 30);
  // body
  ctx.fillStyle = '#8a68a0'; ctx.fillRect(PACKER.x, PACKER.y + 14, PACKER.w, 84);
  ctx.fillStyle = '#a888bc'; ctx.fillRect(PACKER.x, PACKER.y + 14, PACKER.w, 6);
  ctx.fillStyle = '#6a5080'; ctx.fillRect(PACKER.x, PACKER.y + 92, PACKER.w, 6);
  // hopper
  ctx.fillStyle = '#6a5080'; ctx.fillRect(PACKER.x + 14, PACKER.y, 34, 16);
  ctx.fillStyle = '#584070'; ctx.fillRect(PACKER.x + 18, PACKER.y + 4, 26, 12);
  // ribbon spool that spins while wrapping
  const sx2 = PACKER.x + 8, sy2 = PACKER.y + 30;
  ctx.fillStyle = '#c94f8a'; ctx.beginPath(); ctx.arc(sx2, sy2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e87ab0'; ctx.beginPath(); ctx.arc(sx2, sy2, 3, 0, Math.PI * 2); ctx.fill();
  const spin = active ? time * 9 : time * 1.2;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(sx2 + Math.cos(spin) * 6, sy2 + Math.sin(spin) * 6); ctx.stroke();
  ctx.strokeStyle = '#f0b64a'; ctx.beginPath(); ctx.moveTo(sx2 + 7, sy2); ctx.lineTo(sx2 + 16, sy2 + 4); ctx.stroke(); // ribbon feed
  // stamp arm
  const stampY = active ? Math.abs(Math.sin(time * 8)) * 10 : 0;
  ctx.fillStyle = '#c8d0d8'; ctx.fillRect(PACKER.x + 24, PACKER.y + 26 + stampY, 14, 8);
  ctx.fillStyle = '#98a2ac'; ctx.fillRect(PACKER.x + 28, PACKER.y + 18, 6, 8 + stampY);
  // output window
  ctx.fillStyle = '#20242a'; ctx.fillRect(PACKER.x + 10, PACKER.y + 44, 42, 28);
  if (active) {
    const k = p.t / p.dur;
    const bo = boxIcon(p.runFlavor);
    ctx.drawImage(bo, PACKER.x + 24, PACKER.y + 64 - k * 14, 14, 12);
    ctx.fillStyle = '#20242a'; ctx.fillRect(PACKER.x + 8, PACKER.y + 78, 46, 6);
    ctx.fillStyle = '#f0b64a'; ctx.fillRect(PACKER.x + 9, PACKER.y + 79, 44 * k, 4);
  } else {
    ctx.drawImage(boxIcon(p.flavor), PACKER.x + 24, PACKER.y + 54, 14, 12);
  }
  // hanging wall sign
  ctx.fillStyle = '#3a2416'; ctx.fillRect(PACKER.x + 7, PACKER.y - 20, 48, 14);
  ctx.fillStyle = '#55371f'; ctx.fillRect(PACKER.x + 9, PACKER.y - 18, 44, 10);
  ctx.fillStyle = '#f0b64a';
  ctx.font = '8px "PS2P", monospace';
  ctx.fillText('WRAP', PACKER.x + 15, PACKER.y - 17);
}

function drawShelfGoods() {
  // top plank: bars, bottom plank: boxes; up to 5 each, favorite flavors first
  let bx2 = SHELF.x + 8;
  for (const f of S.flavors) {
    const n = Math.min(4, S.bars[f] || 0);
    for (let i = 0; i < n; i++) {
      if (bx2 > SHELF.x + SHELF.w - 18) break;
      ctx.drawImage(barIcon(f), bx2, SHELF.y + 22, 16, 10);
      bx2 += 12;
    }
    if (n) bx2 += 8;
  }
  let ox = SHELF.x + 8;
  for (const f of S.flavors) {
    const n = Math.min(4, S.boxes[f] || 0);
    for (let i = 0; i < n; i++) {
      if (ox > SHELF.x + SHELF.w - 18) break;
      ctx.drawImage(boxIcon(f), ox, SHELF.y + 70, 14, 12);
      ox += 11;
    }
    if (n) ox += 8;
  }
}

function drawRegister() {
  const rx = COUNTER.x + 12, ry = COUNTER.y - 26;
  ctx.fillStyle = '#4a525c'; ctx.fillRect(rx, ry, 32, 26);
  ctx.fillStyle = '#5a6470'; ctx.fillRect(rx, ry, 32, 4);
  ctx.fillStyle = registerAnim > 0 ? '#9df09d' : '#3ce080';
  ctx.fillRect(rx + 4, ry + 6, 24, 8);
  ctx.fillStyle = '#20242a';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(rx + 6 + i * 8, ry + 17 + j * 4, 5, 2);
  if (registerAnim > 0) { // drawer pops
    ctx.fillStyle = '#38404a'; ctx.fillRect(rx - 2, ry + 22, 36, 6);
    ctx.fillStyle = '#f0b64a'; ctx.fillRect(rx + 4, ry + 23, 6, 3); ctx.fillRect(rx + 14, ry + 23, 6, 3);
  }
}

/* employee helpers that appear at their stations once hired */
const WORKER_MOUSE = { species: 7, shirt: 6, granny: false, vip: false };  // Pippa @ melter
const WORKER_RABBIT = { species: 1, shirt: 2, granny: false, vip: false }; // Benny @ wrapper
function drawStationWorker(time, look, cx, feet, seed) {
  const bob = Math.sin(time * 3 + seed) * 1;
  const frame = Math.floor(time * 4 + seed) % 2;
  ctx.fillStyle = 'rgba(30,12,2,0.3)'; ctx.fillRect(cx - 9, feet - 1, 18, 3);
  ctx.drawImage(custImg(look, frame), cx - 10, feet - 30 + bob, 20, 30);
}
function drawStationWorkers(time) {
  if (lvl('automelt')) drawStationWorker(time, WORKER_MOUSE, MELTER.x - 4, 252, 1.3);
  if (lvl('autopack')) drawStationWorker(time, WORKER_RABBIT, PACKER.x + PACKER.w + 8, 252, 2.7);
}

/* the shopkeeper standing behind the counter — waves on a sale, bobs idle */
let keeperBlink = 0;
function drawShopkeeper(time) {
  const sx = COUNTER.x + COUNTER.w - 34;       // right side of the counter
  const bob = Math.sin(time * 2) * 1;
  const hy = 184 + bob;                         // head top
  const waving = registerAnim > 0 || customers.some(c => c.state === 'wait');
  // slight blink cycle
  keeperBlink = (Math.floor(time * 0.7) % 6 === 0) ? 1 : 0;
  const torsoBottom = COUNTER.y;                // meet the counter top so he reads as "behind" it
  const th = Math.max(18, torsoBottom - (hy + 12));
  // back arm (resting)
  ctx.fillStyle = '#9a734e'; ctx.fillRect(sx - 12, hy + 16, 3, 12);
  // torso / apron
  ctx.fillStyle = '#3f7d6e'; ctx.fillRect(sx - 10, hy + 12, 20, th);   // shirt
  ctx.fillStyle = '#f0ead6'; ctx.fillRect(sx - 7, hy + 16, 14, th - 4);// apron
  ctx.fillStyle = '#cdbfa0'; ctx.fillRect(sx - 7, hy + 16, 14, 1);
  ctx.fillStyle = '#c98a3d'; ctx.fillRect(sx - 2, hy + 22, 4, 4);      // apron pocket badge
  // collar
  ctx.fillStyle = '#356558'; ctx.fillRect(sx - 6, hy + 10, 12, 3);
  // ---- bear head ----
  ctx.fillStyle = '#9a734e'; ctx.fillRect(sx - 8, hy - 2, 5, 5); ctx.fillRect(sx + 3, hy - 2, 5, 5);   // round ears
  ctx.fillStyle = '#7a5636'; ctx.fillRect(sx - 7, hy - 1, 2, 2); ctx.fillRect(sx + 4, hy - 1, 2, 2);   // inner ear
  ctx.fillStyle = '#9a734e'; ctx.fillRect(sx - 6, hy, 12, 10);
  ctx.fillStyle = '#7a5636'; ctx.fillRect(sx - 6, hy + 8, 12, 2);      // jaw shade
  ctx.fillStyle = '#c2a582'; ctx.fillRect(sx - 3, hy + 5, 6, 5);       // muzzle
  ctx.fillStyle = '#2a1a14'; ctx.fillRect(sx - 1, hy + 6, 2, 2);       // nose
  // clerk cap
  ctx.fillStyle = '#f7f2e6'; ctx.fillRect(sx - 7, hy - 4, 14, 4);
  ctx.fillStyle = '#c94f3d'; ctx.fillRect(sx - 7, hy - 1, 14, 1);
  // eyes
  ctx.fillStyle = '#20141c';
  if (keeperBlink) { ctx.fillRect(sx - 4, hy + 4, 3, 1); ctx.fillRect(sx + 1, hy + 4, 3, 1); }
  else { ctx.fillRect(sx - 3, hy + 3, 2, 2); ctx.fillRect(sx + 1, hy + 3, 2, 2); }
  ctx.fillStyle = '#8a5638'; ctx.fillRect(sx - 2, hy + 9, 4, 1);       // smile
  // waving front paw
  ctx.fillStyle = '#9a734e';
  if (waving) {
    const w = Math.sin(time * 10) * 3;
    ctx.fillRect(sx + 9, hy + 4 + w, 3, 10);
    ctx.fillRect(sx + 9, hy + 2 + w, 4, 4);   // hand up
  } else {
    ctx.fillRect(sx + 9, hy + 16, 3, 12);
  }
}

function drawDoor() {
  // swinging door panel
  const open = clamp(doorAnim, 0, 1);
  const w = DOOR.w * (1 - open * 0.7);
  ctx.fillStyle = '#8a5c33';
  ctx.fillRect(DOOR.x, DOOR.y, w, DOOR.h);
  ctx.fillStyle = '#734b28';
  ctx.fillRect(DOOR.x + 2, DOOR.y + 4, Math.max(0, w - 6), DOOR.h - 8);
  if (w > 10) {
    ctx.fillStyle = '#f0b64a';
    ctx.fillRect(DOOR.x + w - 8, DOOR.y + 56, 3, 6);
  }
  // bell
  const jingle = doorAnim > 0 ? Math.sin(nowT * 25) * 2 : 0;
  ctx.fillStyle = '#f0b64a';
  ctx.fillRect(DOOR.x + 12 + jingle, DOOR.y - 10, 6, 6);
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(DOOR.x + 14 + jingle, DOOR.y - 4, 2, 2);
}

function drawCustomer(c) {
  const walking = c.state === 'in' || c.state === 'happy' || c.state === 'angry';
  const frame = walking ? (Math.floor(c.walkT * 8) % 2) : 0;
  const bob = c.state === 'wait' ? Math.sin(c.walkT * 2.4) * 1.5 : 0;
  let jy = 0;
  if (c.state === 'happy' && c.t < 0.55) jy = -Math.abs(Math.sin(c.t * 12)) * 8;
  const shx = c.shakeT > 0 || (c.state === 'angry' && c.t < 0.5) ? rnd(-1.5, 1.5) : 0;
  const img = custImg(c.look, frame);
  // shadow
  ctx.fillStyle = 'rgba(30,12,2,0.3)';
  ctx.fillRect(c.x - 12, FEET_Y - 2, 24, 4);
  // VIP golden aura
  if (c.look.vip) {
    const a = 0.25 + Math.sin(nowT * 4) * 0.12;
    ctx.fillStyle = `rgba(255,217,122,${a})`;
    ctx.fillRect(c.x - 15 + shx, FEET_Y - 52 + bob + jy, 30, 52);
  }
  ctx.drawImage(img, c.x - 16 + shx, FEET_Y - 48 + bob + jy, 32, 48);

  // a happy customer walks off carrying a little shopping bag
  if (c.state === 'happy') {
    const bagx = c.x + 12 + shx, bagy = FEET_Y - 26 + jy;
    ctx.fillStyle = '#c98a3d'; ctx.fillRect(bagx, bagy, 8, 9);
    ctx.fillStyle = '#a9743d'; ctx.fillRect(bagx, bagy, 8, 2);
    ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bagx + 1.5, bagy); ctx.lineTo(bagx + 3, bagy - 3); ctx.lineTo(bagx + 5, bagy - 3); ctx.lineTo(bagx + 6.5, bagy); ctx.stroke();
  }

  // emotion marks
  if (c.state === 'happy') drawHeart(c.x - 4, FEET_Y - 64 + jy, '#e5604f');
  if (c.state === 'angry') {
    ctx.fillStyle = '#e5604f';
    ctx.font = '8px "PS2P", monospace';
    ctx.fillText('!!', c.x - 6, FEET_Y - 64);
  }

  // request bubble (staggered per queue slot so they never overlap)
  if (c.state === 'wait') {
    const bw2 = 58, bh2 = 34;
    let bxp = c.x - bw2 / 2;
    bxp = clamp(bxp, 4, W - bw2 - 4);
    const byp = FEET_Y - 48 - bh2 - 12 - c.slot * 20 + bob;
    const can = stockFor(c.req) >= c.req.qty;
    const urgent = c.patience / c.patienceMax < 0.25;
    // bubble body
    ctx.fillStyle = urgent && Math.floor(nowT * 4) % 2 ? '#ffd9d3' : '#fdf6e8';
    ctx.fillRect(bxp + shx, byp, bw2, bh2);
    ctx.strokeStyle = can ? '#3f9b56' : '#3a2416';
    ctx.lineWidth = 2;
    ctx.strokeRect(bxp + shx + 1, byp + 1, bw2 - 2, bh2 - 2);
    // tail reaches down to the head
    ctx.fillStyle = '#fdf6e8';
    ctx.fillRect(c.x - 3 + shx, byp + bh2, 6, 5 + c.slot * 20);
    // icon
    const r = c.req;
    let icon = r.type === 'piece' ? pieceImg('milk') : r.type === 'bar' ? barIcon(r.flavor) : boxIcon(r.flavor);
    const iw = r.type === 'piece' ? 14 : 16, ih = r.type === 'piece' ? 14 : (r.type === 'bar' ? 10 : 12);
    ctx.drawImage(icon, bxp + 6 + shx, byp + 6 + (14 - ih) / 2, iw, ih);
    // qty
    ctx.fillStyle = can ? '#2c6e3c' : '#5a4632';
    ctx.font = '8px "PS2P", monospace';
    ctx.fillText('x' + r.qty, bxp + 26 + shx, byp + 9);
    // flavor tag
    if (r.type !== 'piece') {
      ctx.fillStyle = FLAV[r.flavor].c.base;
      ctx.fillRect(bxp + 44 + shx, byp + 7, 8, 8);
      ctx.strokeStyle = FLAV[r.flavor].c.dark;
      ctx.strokeRect(bxp + 44.5 + shx, byp + 7.5, 7, 7);
    }
    // patience bar
    const pw = (bw2 - 10) * clamp(c.patience / c.patienceMax, 0, 1);
    ctx.fillStyle = '#d8cbb4'; ctx.fillRect(bxp + 5 + shx, byp + bh2 - 8, bw2 - 10, 4);
    ctx.fillStyle = c.patience / c.patienceMax > 0.5 ? '#7ed67e' : (c.patience / c.patienceMax > 0.25 ? '#f0b64a' : '#e5604f');
    ctx.fillRect(bxp + 5 + shx, byp + bh2 - 8, pw, 4);
  }
}

function drawHeart(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 3, 3); ctx.fillRect(x + 4, y, 3, 3);
  ctx.fillRect(x, y + 2, 7, 3);
  ctx.fillRect(x + 1, y + 5, 5, 1);
  ctx.fillRect(x + 2, y + 6, 3, 1);
  ctx.fillRect(x + 3, y + 7, 1, 1);
}

function drawBot(time) {
  const n = lvl('bot');
  if (n <= 0) return;
  const frame = Math.floor(botAnimT * 5) % 2;
  ctx.drawImage(botImg(frame), 6, 318, 30, 27);
  // mini bar the bot works on
  ctx.fillStyle = FLAV.milk.c.base; ctx.fillRect(36, 336, 18, 8);
  ctx.fillStyle = FLAV.milk.c.dark; ctx.fillRect(36, 342, 18, 2);
  if (n > 1) {
    ctx.fillStyle = '#ffd97a';
    ctx.font = '8px "PS2P", monospace';
    ctx.fillText('x' + n, 12, 306);
  }
}

function drawExtras() {
  for (const e of extras) {
    if (e.state === 'idle') {
      ctx.fillStyle = 'rgba(30,12,2,0.3)';
      ctx.fillRect(e.x - 7, e.landY + 6, 14, 3);
    }
    const bob = e.state === 'idle' ? Math.sin(nowT * 3 + e.landY) * 1.5 : 0;
    ctx.drawImage(pieceImg('milk'), e.x - 8, e.y - 8 + bob, 16, 16);
    if (e.state === 'idle') {
      // glint
      const a = 0.4 + Math.sin(nowT * 5 + e.x) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(e.x - 5, e.y - 5 + bob, 2, 2);
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    if (p.delay && p.delay > 0) continue;
    const k = p.t / p.life;
    if (p.type === 'coin') {
      if (p.dx === undefined) continue;
      ctx.drawImage(coinImg, p.dx - 4, p.dy - 4);
    } else if (p.type === 'steam') {
      ctx.fillStyle = `rgba(235,235,235,${0.5 * (1 - k)})`;
      const s = p.size + k * 3;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    } else if (p.type === 'spark') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - k;
      ctx.fillRect(p.x - 1, p.y, 3, 1);
      ctx.fillRect(p.x, p.y - 1, 1, 3);
      ctx.globalAlpha = 1;
    } else if (p.type === 'ring') {
      const r = lerp(p.r0, p.r1, easeOut(k));
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'star') {
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.t * p.spin);
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(-s, -1, s * 2, 2);   // 4-point pixel star
      ctx.fillRect(-1, -s, 2, s * 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
}

function drawFloaters() {
  ctx.font = '8px "PS2P", monospace';
  for (const f of floaters) {
    const a = 1 - Math.pow(f.t / f.life, 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#1a0c04';
    ctx.fillText(f.txt, f.x - f.txt.length * 4 + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x - f.txt.length * 4, f.y);
    ctx.globalAlpha = 1;
  }
}

function drawTutorial(time) {
  if (S.tut > 5) return;
  const msg = TUT_MSGS[S.tut];
  if (!msg) return;
  // bottom strip
  ctx.fillStyle = 'rgba(15,7,2,0.82)';
  ctx.fillRect(0, H - 20, W, 20);
  ctx.fillStyle = '#ffd97a';
  ctx.font = '8px "PS2P", monospace';
  const tw = msg.length * 8;
  ctx.fillText(msg, (W - tw) / 2, H - 14);

  // bouncing arrow at the point of interest
  let ax = null, ay = null, down = true;
  if (S.tut === 0) { ax = CUT1.x1 + 24; ay = CUT1.y1 - 26; }
  else if (S.tut === 1) { ax = CUT2.x1; ay = CUT2.y1 - 22; }
  else if (S.tut === 2) { ax = BX + BW / 2; ay = BY - 24; }
  else if (S.tut === 3) { const e = extras.find(e2 => e2.state === 'idle'); if (e) { ax = e.x; ay = e.y - 26; } }
  else if (S.tut === 4) { ax = MELTER.x + MELTER.w / 2; ay = MELTER.y - 20; }
  else if (S.tut === 5) { const c = customers[0]; if (c) { ax = c.x; ay = FEET_Y - 104; } }
  if (ax !== null) {
    const bob = Math.sin(time * 6) * 4;
    ctx.fillStyle = '#ffd97a';
    const ty = ay + bob;
    ctx.beginPath();
    if (down) { ctx.moveTo(ax - 6, ty); ctx.lineTo(ax + 6, ty); ctx.lineTo(ax, ty + 9); }
    ctx.closePath(); ctx.fill();
    ctx.fillRect(ax - 2, ty - 8, 4, 8);
  }
}

let nowT = 0;
function draw(time) {
  nowT = time;
  ctx.save();
  if (shakeT > 0) {
    const k = shakeT / shakeDur;
    ctx.translate(rnd(-1, 1) * shakeMag * k, rnd(-1, 1) * shakeMag * k);
  }
  ctx.drawImage(bgCv, 0, 0);
  drawWindowSky(time);
  drawMelter(time);
  drawPacker(time);
  drawStationWorkers(time);
  drawShelfGoods();
  drawShopkeeper(time);
  drawDoor();
  drawRegister();
  for (const c of customers) drawCustomer(c);
  drawBar(time);
  drawBot(time);
  drawExtras();
  drawParticles();
  drawFloaters();
  ctx.restore();
  ctx.drawImage(vigCv, 0, 0);
  drawTutorial(time);
}

/* ============================================================
   19. HTML UI
   ============================================================ */
let uiDirty = true;
let uiTimer = 0;
const $ = id => document.getElementById(id);
const upEls = {};   // id -> {card, lvEl, btn, descEl}
const flEls = {};

function bumpHud(id) {
  const el = $(id);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function buildChips(elId, machine) {
  const box = $(elId);
  box.innerHTML = '';
  for (const fid of S.flavors) {
    const f = FLAV[fid];
    const b = document.createElement('button');
    b.className = 'chip' + (machine.flavor === fid ? ' sel' : '');
    b.innerHTML = `<span class="dot" style="background:${f.c.base}"></span>${f.name}`;
    b.onclick = () => { machine.flavor = fid; sfx.click(); buildAllChips(); uiDirty = true; };
    box.appendChild(b);
  }
}
function buildAllChips() {
  buildChips('melter-flavors', S.melter);
  buildChips('packer-flavors', S.packer);
}

function upTier(l, max) {
  if (max <= 1) return l ? { n: 'ON', cls: 't-max' } : { n: '—', cls: 't-0' };
  if (l >= max) return { n: 'MAX', cls: 't-max' };
  const frac = l / max;
  if (l === 0) return { n: 'I', cls: 't-0' };
  if (frac < 0.34) return { n: 'I', cls: 't-1' };
  if (frac < 0.67) return { n: 'II', cls: 't-2' };
  return { n: 'III', cls: 't-3' };
}

function buildUpgrades() {
  const box = $('tab-upgrades');
  box.innerHTML = '';
  for (const u of UPS) {
    const card = document.createElement('div');
    card.className = 'up-card t-0';
    card.innerHTML =
      `<div class="up-ico"><img src="${upIconURL(u.icon || u.id)}" alt=""><span class="up-tier"></span></div>` +
      `<div class="up-mid"><div class="up-name"></div><div class="up-desc"></div></div>` +
      `<button class="pxbtn up-buy"></button>`;
    const btn = card.querySelector('.up-buy');
    btn.onclick = () => buyUpgrade(u);
    card.addEventListener('animationend', () => card.classList.remove('bought'));
    box.appendChild(card);
    upEls[u.id] = { card, name: card.querySelector('.up-name'), desc: card.querySelector('.up-desc'), btn, tier: card.querySelector('.up-tier') };
  }
}

function buyUpgrade(u) {
  const l = lvl(u.id);
  if (l >= u.max) return;
  const cost = upCost(u);
  if (S.money < cost) { sfx.denied(); return; }
  S.money -= cost;
  S.ups[u.id] = l + 1;
  sfx.powerup();
  const els = upEls[u.id];
  if (els) { els.card.classList.remove('bought'); void els.card.offsetWidth; els.card.classList.add('bought'); }
  bumpHud('hud-money');
  addFloater(BX + BW / 2, BY - 20, u.name + '!', '#7ed67e');
  sparkleBurst(BX + BW / 2, BY - 10, 6);
  uiDirty = true;
  updateUI(true);
}

const barIconURLCache = {};
function barIconURL(flavId) {
  if (barIconURLCache[flavId]) return barIconURLCache[flavId];
  const url = barIcon(flavId).toDataURL();
  barIconURLCache[flavId] = url;
  return url;
}

function buildFlavorTab() {
  const box = $('tab-flavors');
  box.innerHTML = '<div class="fl-shelf-label">🍫 FLAVOR SHELF — unlock richer recipes, sell for more</div>';
  for (const f of FLAVORS) {
    const card = document.createElement('div');
    card.className = 'fl-card';
    card.innerHTML =
      `<span class="fl-ico" style="background:${f.c.slab}"><img src="${barIconURL(f.id)}" alt=""></span>` +
      `<div class="fl-name" style="color:${f.c.light}">${f.name}</div>` +
      `<div class="fl-desc">${f.cost === 0 ? 'Your trusty original — the base recipe.' :
        `Sells <b>${f.mult}×</b> · Bar $${fmt(PRICE.bar * f.mult)} · Box $${fmt(PRICE.box * f.mult)}`}</div>` +
      `<button class="pxbtn gold"></button>`;
    const btn = card.querySelector('.pxbtn');
    btn.onclick = () => unlockFlavor(f);
    box.appendChild(card);
    flEls[f.id] = { card, btn };
  }
}

function unlockFlavor(f) {
  if (S.flavors.includes(f.id)) return;
  if (S.money < f.cost) { sfx.denied(); return; }
  S.money -= f.cost;
  S.flavors.push(f.id);
  sfx.fanfare();
  toast('NEW FLAVOR: ' + f.name + ' CHOCOLATE!');
  confettiBurst();
  buildAllChips();
  uiDirty = true;
  updateUI(true);
}

function starStr(rep) {
  const full = Math.round(clamp(rep, 0, 5));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

let lastStockHTML = '';
function updateUI(force) {
  uiTimer = 0;
  // HUD
  $('money-val').textContent = fmt(S.money);
  $('pieces-val').textContent = fmt(S.pieces);
  $('rep-stars').textContent = starStr(S.rep);

  // melter
  const m = S.melter;
  const mBatch = Math.min(meltBatchMax(), Math.max(1, Math.floor(S.pieces / MELT_PIECES)));
  const mBtn = $('btn-melt');
  if (m.run > 0) {
    $('melter-bar').style.width = (m.t / m.dur * 100) + '%';
    $('melter-txt').textContent = `MELTING ${m.run * MELT_PIECES}pc > ${m.run} ${FLAV[m.runFlavor].name}`;
    mBtn.disabled = true;
    mBtn.textContent = 'MELTING...';
  } else {
    $('melter-bar').style.width = '0%';
    $('melter-txt').textContent = 'IDLE';
    mBtn.disabled = S.pieces < MELT_PIECES;
    mBtn.textContent = `MELT ${mBatch * MELT_PIECES} > ${mBatch} BAR${mBatch > 1 ? 'S' : ''}`;
  }
  mBtn.classList.toggle('ready', !mBtn.disabled);
  $('melter-info').textContent = `${FLAV[m.flavor].name} bar: $${fmt(barPrice(m.flavor))} • takes ${meltDur().toFixed(1)}s`;
  $('melter-auto').classList.toggle('hidden', !lvl('automelt'));

  // packer
  const p = S.packer;
  const pBatch = Math.min(packBatchMax(), Math.max(1, Math.floor((S.bars[p.flavor] || 0) / PACK_BARS)));
  const pBtn = $('btn-pack');
  if (p.run > 0) {
    $('packer-bar').style.width = (p.t / p.dur * 100) + '%';
    $('packer-txt').textContent = `WRAPPING ${p.run} BOX${p.run > 1 ? 'ES' : ''}`;
    pBtn.disabled = true;
    pBtn.textContent = 'WRAPPING...';
  } else {
    $('packer-bar').style.width = '0%';
    $('packer-txt').textContent = 'IDLE';
    pBtn.disabled = (S.bars[p.flavor] || 0) < PACK_BARS;
    pBtn.textContent = `WRAP ${pBatch * PACK_BARS} > ${pBatch} BOX${pBatch > 1 ? 'ES' : ''}`;
  }
  pBtn.classList.toggle('ready', !pBtn.disabled);
  $('packer-info').textContent = `${FLAV[p.flavor].name} box: $${fmt(boxPrice(p.flavor))} • takes ${packDur().toFixed(1)}s`;
  $('packer-auto').classList.toggle('hidden', !lvl('autopack'));

  // stock — rebuilt whenever the displayed numbers change (pieces update via
  // bots/collect without touching uiDirty), skipped when identical to avoid churn
  {
    const rows = [`<div class="stock-row stock-head"><span></span><span>FLAVOR</span><span class="ct">BARS</span><span class="ct">BOXES</span></div>`];
    rows.push(`<div class="stock-row"><span class="dot" style="background:#8a5a2b"></span><span class="nm">PIECES · $${PRICE.piece}</span><span class="ct" style="grid-column:3/5"><b>${fmt(S.pieces)}</b></span></div>`);
    for (const fid of S.flavors) {
      const f = FLAV[fid];
      rows.push(`<div class="stock-row"><span class="dot" style="background:${f.c.base}"></span><span class="nm">${f.name}</span><span class="ct"><b>${fmt(S.bars[fid] || 0)}</b></span><span class="ct"><b>${fmt(S.boxes[fid] || 0)}</b></span></div>`);
    }
    const html = rows.join('');
    if (html !== lastStockHTML) { $('stock-list').innerHTML = html; lastStockHTML = html; }
  }

  // upgrades
  for (const u of UPS) {
    const els = upEls[u.id];
    if (!els) continue;
    const l = lvl(u.id);
    els.name.innerHTML = `${u.name} <span class="lv">Lv${l}${u.max > 1 ? '/' + u.max : ''}</span>`;
    els.desc.textContent = u.d(l);
    const t = upTier(l, u.max);
    els.tier.textContent = t.n;
    els.card.classList.remove('t-0', 't-1', 't-2', 't-3', 't-max', 'maxed', 'affordable');
    els.card.classList.add(t.cls);
    if (l >= u.max) {
      els.card.classList.add('maxed');
    } else {
      const cost = upCost(u);
      els.btn.textContent = '$' + fmt(cost);
      const afford = S.money >= cost;
      els.btn.disabled = !afford;
      if (afford) els.card.classList.add('affordable');
    }
  }

  // flavors
  for (const f of FLAVORS) {
    const els = flEls[f.id];
    if (!els) continue;
    if (S.flavors.includes(f.id)) els.card.classList.add('owned');
    else {
      els.btn.textContent = '$' + fmt(f.cost);
      els.btn.disabled = S.money < f.cost;
    }
  }

  // stats tab (only when visible)
  const statsPane = $('tab-stats');
  if (statsPane.classList.contains('active')) {
    const st = S.stats;
    statsPane.innerHTML =
      `<h3>THE LEDGER</h3>` +
      `Tricks performed: <b>${fmt(st.tricks)}</b><br>` +
      `Pieces conjured: <b>${fmt(st.piecesMade)}</b><br>` +
      `Bars melted: <b>${fmt(st.barsMade)}</b><br>` +
      `Gift boxes wrapped: <b>${fmt(st.boxesMade)}</b><br>` +
      `<h3>THE SHOP</h3>` +
      `Customers served: <b>${fmt(st.served)}</b><br>` +
      `Customers lost: <b>${fmt(st.lost)}</b><br>` +
      `Reputation: <b>${S.rep.toFixed(2)} / 5</b><br>` +
      `Total earned: <b>$${fmt(st.earned)}</b><br>` +
      `<h3>THE TRUTH</h3>` +
      `Time played: <b>${fmtTime(st.time)}</b><br>` +
      `Squares that should exist: <b>24</b><br>` +
      `Squares that DO exist: <b>${fmt(24 + st.piecesMade)}</b><br>` +
      `<span style="color:#6b543c">Physics filed a complaint. It was ignored.</span>`;
  }
  uiDirty = false;
}

/* tabs */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('tab-' + btn.dataset.tab).classList.add('active');
    sfx.click();
    updateUI(true);
  });
});

/* machine buttons */
$('btn-melt').addEventListener('click', () => { Snd.init(); Snd.resume(); startMelt(); updateUI(true); });
$('btn-pack').addEventListener('click', () => { Snd.init(); Snd.resume(); startPack(); updateUI(true); });

/* mute */
$('btn-mute').addEventListener('click', () => {
  S.muted = !S.muted;
  $('btn-mute').textContent = S.muted ? '♪ OFF' : '♪ ON';
  if (!S.muted) { Snd.init(); Snd.resume(); sfx.click(); }
});

/* reset with confirm */
let resetArmed = false, resetTimer = null;
$('btn-reset').addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    $('btn-reset').textContent = 'SURE?';
    $('btn-reset').classList.add('confirm');
    resetTimer = setTimeout(() => {
      resetArmed = false;
      $('btn-reset').textContent = 'RESET';
      $('btn-reset').classList.remove('confirm');
    }, 2500);
  } else {
    clearTimeout(resetTimer);
    resetting = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    location.reload();
  }
});

/* ============================================================
   20. MAIN LOOP
   ============================================================ */
let lastFrame = 0;
let saveTimer = 0;

function frame(ts) {
  const t = ts / 1000;
  let dt = t - lastFrame;
  lastFrame = t;
  if (dt > 0.1) dt = 0.1;
  if (dt < 0) dt = 0;

  S.stats.time += dt;
  updateTrick(dt);
  updateExtras(dt);
  updateBots(dt);
  updateMachines(dt);
  updateCustomers(dt);
  updateFx(dt);
  updateMilestones(dt);

  draw(t);

  uiTimer += dt;
  if (uiTimer > 0.12) updateUI();

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); }

  requestAnimationFrame(frame);
}

/* ============================================================
   21. BOOT
   ============================================================ */
function boot() {
  const had = load();
  buildBG();
  buildVignette();
  buildAllChips();
  buildUpgrades();
  buildFlavorTab();
  $('btn-mute').textContent = S.muted ? '♪ OFF' : '♪ ON';

  if (!S.intro) {
    S.intro = true;
    showOverlay('INFINITE CHOCO INC.',
      `You found it. The <span class="gold">LEGENDARY TRICK</span> from<br>the old internet videos:<br><br>` +
      `cut a chocolate bar <i>just right</i>, slide the<br>pieces around... and it comes back<br>` +
      `together with <span class="gold">ONE PIECE LEFT OVER.</span><br><br>` +
      `Infinite chocolate. Infinite profit.<br><br>` +
      `<span class="dim">The laws of geometry called.<br>You let it go to voicemail.</span>`,
      'OPEN THE SHOP');
  } else if (had) {
    applyOffline();
  }

  updateUI(true);
  requestAnimationFrame(ts => { lastFrame = ts / 1000; requestAnimationFrame(frame); });
}

window.addEventListener('beforeunload', () => {
  // While hidden the loop is paused, so state hasn't changed since the hide-time
  // save. Re-saving here would stamp S.last=now and erase the hidden window from
  // next boot's offline credit — so leave that save (with its hide-time baseline)
  // intact and let applyOffline() pick up the elapsed time.
  if (!document.hidden) save();
});

/* the loop pauses while the tab is hidden — catch up on return */
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    save();
  } else if (hiddenAt) {
    const away = clamp((Date.now() - hiddenAt) / 1000, 0, 4 * 3600);
    hiddenAt = 0;
    if (away > 15) {
      const g = offlineGains(away);
      if (g.any) {
        const parts = [];
        if (g.pieces) parts.push('+' + fmt(g.pieces) + ' PIECES');
        if (g.bars) parts.push('+' + fmt(g.bars) + ' BARS');
        if (g.boxes) parts.push('+' + fmt(g.boxes) + ' BOXES');
        toast('WHILE YOU WERE AWAY: ' + parts.join(', '), false);
      }
    }
  }
});

/* debug / test hooks */
window.GAME = {
  get S() { return S; },
  fmt,
  save,
  custImg, ANIMALS,
  cutLine: activeCutLine,
  trick,
  customers,
  extras,
  startMelt, startPack, spawnCustomer,
  doTrick() { // instantly resolve a full manual trick
    const n = trickYield();
    S.pieces += n; S.stats.piecesMade += n; S.stats.tricks++;
    uiDirty = true;
    return n;
  },
  give(n) { S.money += n; S.stats.earned += n; uiDirty = true; },
  serveFirst() { const c = customers.find(c2 => c2.state === 'wait'); if (c) serveCustomer(c); },
  advanceTut,
  reset() { resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); },
  offlineGains, applyOffline
};

/* wait for the pixel font so canvas text renders crisp */
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('8px "PS2P"'),
    document.fonts.load('10px "PS2P"')
  ]).catch(() => {}).finally(boot);
} else {
  boot();
}
