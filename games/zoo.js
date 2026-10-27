let S;
const PX = 720, DAYLEN = 50;
const HAB = {
  grass: { n: '초원', e: '🌾', c: '#4d7c0f', c2: '#65a30d', cost: 600, deco: ['🌾', '🪨', '🌳'] },
  forest: { n: '숲', e: '🌳', c: '#14532d', c2: '#166534', cost: 900, deco: ['🌳', '🌴', '🍄'] },
  polar: { n: '극지', e: '🧊', c: '#7dd3fc', c2: '#e0f2fe', cost: 1200, deco: ['🧊', '❄️', '🏔️'] },
  water: { n: '물가', e: '💧', c: '#0369a1', c2: '#0ea5e9', cost: 1000, deco: ['🪷', '🌿', '🪨'] },
  desert: { n: '사막', e: '🏜️', c: '#b45309', c2: '#f59e0b', cost: 800, deco: ['🌵', '🪨', '🦴'] },
};
const HK = Object.keys(HAB);
const SP = [
  { k: 'rabbit', n: '토끼', e: '🐇', h: 'grass', cost: 150, ap: 2, tier: 1, social: 1, food: 0.5 },
  { k: 'goat', n: '염소', e: '🐐', h: 'grass', cost: 250, ap: 3, tier: 1, social: 1, food: 0.7 },
  { k: 'duck', n: '오리', e: '🦆', h: 'water', cost: 120, ap: 2, tier: 1, social: 1, food: 0.4 },
  { k: 'penguin', n: '펭귄', e: '🐧', h: 'polar', cost: 500, ap: 5, tier: 1, social: 1, food: 0.8 },
  { k: 'scorpion', n: '전갈', e: '🦂', h: 'desert', cost: 400, ap: 4, tier: 1, food: 0.3 },
  { k: 'monkey', n: '원숭이', e: '🐒', h: 'forest', cost: 600, ap: 6, tier: 2, social: 1, food: 0.8 },
  { k: 'flamingo', n: '플라밍고', e: '🦩', h: 'water', cost: 700, ap: 6, tier: 2, social: 1, food: 0.6 },
  { k: 'camel', n: '낙타', e: '🐫', h: 'desert', cost: 900, ap: 7, tier: 2, food: 1 },
  { k: 'zebra', n: '얼룩말', e: '🦓', h: 'grass', cost: 900, ap: 7, tier: 2, social: 1, food: 1.1 },
  { k: 'snake', n: '뱀', e: '🐍', h: 'desert', cost: 800, ap: 6, tier: 2, food: 0.4 },
  { k: 'seal', n: '물개', e: '🦭', h: 'polar', cost: 1200, ap: 9, tier: 3, social: 1, food: 1.1 },
  { k: 'kangaroo', n: '캥거루', e: '🦘', h: 'desert', cost: 1200, ap: 8, tier: 3, social: 1, food: 1 },
  { k: 'sloth', n: '나무늘보', e: '🦥', h: 'forest', cost: 1000, ap: 8, tier: 3, food: 0.4 },
  { k: 'croc', n: '악어', e: '🐊', h: 'water', cost: 1800, ap: 10, tier: 3, food: 1.3, danger: 1 },
  { k: 'giraffe', n: '기린', e: '🦒', h: 'grass', cost: 1600, ap: 10, tier: 3, social: 1, food: 1.4 },
  { k: 'hippo', n: '하마', e: '🦛', h: 'water', cost: 2400, ap: 12, tier: 4, food: 1.8 },
  { k: 'lion', n: '사자', e: '🦁', h: 'grass', cost: 2600, ap: 13, tier: 4, social: 1, food: 1.6, danger: 1 },
  { k: 'tiger', n: '호랑이', e: '🐅', h: 'forest', cost: 2800, ap: 13, tier: 4, food: 1.6, danger: 1 },
  { k: 'gorilla', n: '고릴라', e: '🦍', h: 'forest', cost: 3200, ap: 14, tier: 4, social: 1, food: 1.6 },
  { k: 'polarbear', n: '북극곰', e: '🐻‍❄️', h: 'polar', cost: 3800, ap: 15, tier: 5, food: 1.8, danger: 1 },
  { k: 'elephant', n: '코끼리', e: '🐘', h: 'grass', cost: 4200, ap: 16, tier: 5, social: 1, food: 2.2 },
  { k: 'panda', n: '판다', e: '🐼', h: 'forest', cost: 5500, ap: 20, tier: 5, food: 1.5 },
];
const SPK = {}; SP.forEach((s) => (SPK[s.k] = s));
const LCOLS = [40, 192, 380, 532], LROWS = [72, 230, 390], LW = 145, LH = 118;
const WP = [[360, 600], [360, 370], [22, 370], [22, 210], [698, 210], [698, 370], [360, 370], [360, 600]];
const SEGL = [], SEGS = [0];
for (let i = 0; i < WP.length - 1; i++) { const l = Math.hypot(WP[i + 1][0] - WP[i][0], WP[i + 1][1] - WP[i][1]); SEGL.push(l); SEGS.push(SEGS[i] + l); }
const RLEN = SEGS[SEGS.length - 1];
const STALLS = [
  { k: 'food', n: '매점', e: '🍔', cost: 400, x: 300, y: 548, price: 5, up: 15 },
  { k: 'drink', n: '음료대', e: '🥤', cost: 300, x: 420, y: 548, price: 3, up: 10 },
  { k: 'ice', n: '아이스크림', e: '🍦', cost: 500, x: 240, y: 548, price: 4, up: 12 },
  { k: 'gift', n: '기념품점', e: '🧸', cost: 900, x: 480, y: 548, price: 9, up: 20 },
];
const STAFF = [{ k: 'keeper', n: '사육사', e: '🧑‍🌾', sal: 80, d: '먹이·청소 자동' }, { k: 'vet', n: '수의사', e: '🧑‍⚕️', sal: 110, d: '아픈 동물 치료' }];
const VE = ['🧒', '👦', '👧', '🧑', '👩', '👨', '👵', '👴', '👱', '🧔', '👩‍🦰', '🧑‍🦱'];
const GOALS = [
  { d: '동물 3종 전시', f: () => speciesCount() >= 3, r: 800 },
  { d: '방문객 60명 입장', f: () => S.admitted >= 60, r: 1000 },
  { d: '아기 동물 탄생', f: () => S.births >= 1, r: 1500 },
  { d: '동물원 ⭐3 달성', f: () => S.stars >= 3, r: 2000 },
  { d: '동물 8종 전시', f: () => speciesCount() >= 8, r: 3000 },
  { d: '⭐4 + 하루 순이익 2000', f: () => S.stars >= 4 && S.lastProfit >= 2000, r: 4000 },
  { d: '⭐5 + 동물 10종 → 승리!', f: () => S.stars >= 5 && speciesCount() >= 10, r: 0 },
];
let VIEWS = [];

GAME({
  title: '동물원 경영', w: 960, h: 600, bg: '#0d1a0f', controls: 'none',
  help: '우리(구역)를 클릭 → 서식지 건설 → 서식지에 맞는 동물 구입\n먹이·청소·꾸미기로 동물을 행복하게! 행복한 동물은 관람객을 부르고 새끼를 낳아요\n불행한 동물은 탈출해요 → 탈출 동물을 클릭해서 포획!\n사육사·수의사 고용, 매점·기념품점 건설, 토지 구입으로 확장\n1/2/3 속도 · Space 일시정지 · 매일 자동 저장 · 별 5개 동물원을 만들어라!',
  init(g) {
    newZoo();
    const sv = g.load('zoo', null);
    if (sv && sv.v === 1) { try { loadZoo(sv); } catch (e) { newZoo(); } }
    S.g = g;
  },
  update(g, dt) {
    S.g = g;
    if (g.keyp('Digit1')) { S.speed = 1; S.paused = false; }
    if (g.keyp('Digit2')) { S.speed = 2; S.paused = false; }
    if (g.keyp('Digit3')) { S.speed = 3; S.paused = false; }
    if (g.keyp('Space')) S.paused = !S.paused;
    if (g.mouse.rclick) { S.sel = -1; S.selA = -1; }
    if (g.mouse.clicked && !uiClick(g)) mapClick(g);
    if (!S.paused) { let t = dt * S.speed; while (t > 0.0001) { const s = Math.min(0.05, t); sim(g, s); t -= s; if (g.ended) return; } }
    for (const t of S.toasts) t.t -= dt;
    S.toasts = S.toasts.filter((t) => t.t > 0);
    g.score = Math.round(S.income);
    g.info = `${S.day}일차 · 💰${Math.floor(S.money).toLocaleString()} · ${'⭐'.repeat(S.stars)}`;
  },
  draw(g, c) {
    S.ui = [];
    drawMap(g, c);
    drawTop(g);
    drawPanel(g, c);
  },
});

function mkLot(i) {
  const col = i % 4, row = (i / 4) | 0;
  return { i, x: LCOLS[col], y: LROWS[row], w: LW, h: LH, locked: row !== 2, hab: null, sp: null, an: [], food: 100, clean: 100, deco: 0, cap: 4, sadT: 0, inc: 0 };
}
function newZoo() {
  S = { money: 4000, day: 1, dayT: 0, speed: 1, paused: false, ui: [], toasts: [], sel: -1, selA: -1, lots: [], vis: [], esc: [], staffN: [0, 0], staff: [], stalls: [0, 0, 0, 0],
    fee: 10, rep: 40, stars: 1, admitted: 0, income: 0, todayIn: 0, todayOut: 0, lastProfit: 0, hist: [], spawnT: 2, rateT: 0, goal: 0, births: 0, mkt: 0, debt: 0, confirm: 0, land: 0, tab: 0 };
  for (let i = 0; i < 12; i++) S.lots.push(mkLot(i));
  buildViews();
}
function buildViews() {
  VIEWS = [];
  for (let j = 0; j < WP.length - 1; j++) {
    const [x1, y1] = WP[j], [x2, y2] = WP[j + 1];
    for (const L of S.lots) {
      const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
      if (y1 === y2) {
        if ((Math.abs(L.y - 20 - y1) < 26 || Math.abs(L.y + L.h + 20 - y1) < 26) && cx >= Math.min(x1, x2) && cx <= Math.max(x1, x2)) VIEWS.push({ s: SEGS[j] + Math.abs(cx - x1), lot: L.i });
      } else if ((Math.abs(L.x - 20 - x1) < 26 || Math.abs(L.x + L.w + 22 - x1) < 26) && cy >= Math.min(y1, y2) && cy <= Math.max(y1, y2)) VIEWS.push({ s: SEGS[j] + Math.abs(cy - y1), lot: L.i });
    }
  }
  VIEWS.push({ s: 48, stall: 1 }, { s: RLEN - 48, stall: 2 });
  VIEWS.sort((a, b) => a.s - b.s);
}
function saveZoo() {
  const g = S.g; if (!g) return;
  g.save('zoo', { v: 1, money: S.money, day: S.day, fee: S.fee, rep: S.rep, admitted: S.admitted, income: S.income, hist: S.hist, lastProfit: S.lastProfit, goal: S.goal, births: S.births, mkt: S.mkt, debt: S.debt, staffN: S.staffN, stalls: S.stalls, land: S.land,
    lots: S.lots.map((L) => ({ l: L.locked, h: L.hab, sp: L.sp, f: L.food, c: L.clean, d: L.deco, cap: L.cap, inc: L.inc, an: L.an.map((a) => [a.age, a.baby ? 1 : 0, Math.round(a.happy), a.sick || 0]) })) });
}
function loadZoo(sv) {
  Object.assign(S, { money: sv.money, day: sv.day, fee: sv.fee, rep: sv.rep, admitted: sv.admitted, income: sv.income, hist: sv.hist || [], lastProfit: sv.lastProfit || 0, goal: sv.goal, births: sv.births || 0, mkt: sv.mkt || 0, debt: sv.debt || 0, stalls: sv.stalls || [0, 0, 0, 0], land: sv.land || 0 });
  sv.lots.forEach((o, i) => {
    const L = S.lots[i];
    Object.assign(L, { locked: o.l, hab: o.h, sp: o.sp, food: o.f, clean: o.c, deco: o.d, cap: o.cap, inc: o.inc || 0 });
    L.an = o.an.map((a) => mkAnimal(L, a[1], a[0], a[2], a[3]));
  });
  S.staffN = [0, 0];
  (sv.staffN || [0, 0]).forEach((n, i) => { for (let k = 0; k < n; k++) hire(i); });
  calcStars();
}
function mkAnimal(L, baby, age, happy, sick) {
  return { age: age || 0, baby: !!baby, happy: happy === undefined ? 70 : happy, sick: sick || 0, x: U.rand(20, L.w - 20), y: U.rand(26, L.h - 16), tx: U.rand(20, L.w - 20), ty: U.rand(26, L.h - 16), fl: false, t: U.rand(0, 5) };
}
function toast(s, col) { S.toasts.push({ s, col: col || '#fff', t: 4.5 }); if (S.toasts.length > 5) S.toasts.shift(); }
function speciesCount() { const s = new Set(); for (const L of S.lots) if (L.sp && L.an.length) s.add(L.sp); return s.size; }
function lotAppeal(L) {
  if (!L.sp || !L.an.length) return 0;
  const sp = SPK[L.sp]; let a = 0;
  for (const an of L.an) a += sp.ap * (0.3 + an.happy / 100 * 0.9) * (an.baby ? 1.4 : 1);
  return a * (1 + L.deco * 0.1);
}
function totalAppeal() { let a = 0; for (const L of S.lots) a += lotAppeal(L); return a; }
function zooValue() { return 6 + totalAppeal() * 0.22 + S.stars * 2; }
function posAt(s) {
  s = U.clamp(s, 0, RLEN - 0.01);
  let j = 0; while (j < SEGL.length - 1 && SEGS[j + 1] < s) j++;
  const t = (s - SEGS[j]) / SEGL[j];
  return [WP[j][0] + (WP[j + 1][0] - WP[j][0]) * t, WP[j][1] + (WP[j + 1][1] - WP[j][1]) * t, WP[j + 1][0] < WP[j][0]];
}
function calcStars() {
  const pts = S.rep * 0.5 + Math.min(50, speciesCount() * 4.5 + Math.min(5, S.births * 0.3));
  S.stars = U.clamp(1 + Math.floor(pts / 20), 1, 5);
}
function hire(i) {
  S.staff.push({ k: STAFF[i].k, e: STAFF[i].e, x: 360, y: 580, tx: 360, ty: 580, lot: -1, work: 0 });
  S.staffN[i]++;
}
function fire(i) { const j = S.staff.findIndex((s) => s.k === STAFF[i].k); if (j >= 0) { S.staff.splice(j, 1); S.staffN[i]--; } }
function feedCost(L) { let c = 0; for (const a of L.an) c += SPK[L.sp].food * 6; return Math.ceil(c * (1 - L.food / 100)) + 2; }

/* ---------- 시뮬 ---------- */
function sim(g, dt) {
  S.dayT += dt;
  if (S.dayT >= DAYLEN) { endDay(g); if (g.ended) return; }
  S.spawnT -= dt;
  if (S.spawnT <= 0) { S.spawnT = spawnIv(); spawnVis(); }
  for (const L of S.lots) lotTick(g, L, dt);
  for (let i = S.vis.length - 1; i >= 0; i--) if (visTick(g, S.vis[i], dt)) S.vis.splice(i, 1);
  for (const s of S.staff) staffTick(g, s, dt);
  for (let i = S.esc.length - 1; i >= 0; i--) {
    const e = S.esc[i];
    e.t -= dt; e.s += e.dir * e.spd * dt;
    if (e.s < 0 || e.s > RLEN) { e.dir *= -1; e.s = U.clamp(e.s, 0, RLEN); }
    if (Math.random() < 0.01) e.dir *= -1;
    const [ex, ey] = posAt(e.s); e.x = ex; e.y = ey;
    for (const v of S.vis) if (!v.flee && Math.abs(v.x - ex) < 60 && Math.abs(v.y - ey) < 60) { v.flee = 1; v.sat -= 25; v.th = '😱'; v.thT = 2; }
    if (e.t <= 0) { S.esc.splice(i, 1); S.rep = Math.max(0, S.rep - 12); toast(`😭 탈출한 ${SPK[e.sp].n}을(를) 놓쳤어요… 평판 하락`, '#fca5a5'); g.sfx.lose(); }
  }
  S.rateT -= dt;
  if (S.rateT <= 0) { S.rateT = 1; calcStars(); checkGoal(g); }
}
function spawnIv() {
  const ap = totalAppeal();
  let iv = 6 - Math.min(4.5, Math.sqrt(ap) * 0.45) - S.stars * 0.3;
  const v = zooValue(); if (S.fee > v) iv *= 1 + (S.fee - v) / 5;
  if (S.mkt > 0) iv /= 1.7;
  if (S.dayT / DAYLEN > 0.8) iv *= 3;
  if (ap <= 0) iv = 12;
  return Math.max(0.5, iv) * U.rand(0.7, 1.3);
}
function spawnVis() {
  if (S.vis.length >= 110) return;
  const money = U.randi(30, 90);
  if (S.fee > money * 0.5) return;
  const v = { e: U.choice(VE), s: 0, sp: U.rand(28, 40), off: U.rand(-7, 7), st: 'walk', wt: 0, vi: 0, sat: 35, money: money - S.fee, hunger: U.rand(0, 50), thirst: U.rand(0, 50), x: 360, y: 600, th: null, thT: 0, fl: false, flee: 0, seen: 0 };
  const val = zooValue(); if (S.fee > val) v.sat -= (S.fee - val) * 2;
  S.money += S.fee; S.todayIn += S.fee; S.income += S.fee; S.admitted++;
  S.vis.push(v);
}
function visTick(g, v, dt) {
  v.hunger += 0.5 * dt; v.thirst += 0.6 * dt;
  if (v.thT > 0) v.thT -= dt;
  if (v.st === 'watch' && !v.flee) { v.wt -= dt; if (v.wt <= 0) v.st = 'walk'; }
  else {
    v.s += v.sp * dt * (v.flee ? 2.5 : 1) * (v.flee && v.s < RLEN / 2 ? -1 : 1);
    if (v.s <= 0 && v.flee) { exitVis(v); return true; }
    while (!v.flee && v.vi < VIEWS.length && v.s >= VIEWS[v.vi].s) { view(g, v, VIEWS[v.vi]); v.vi++; if (v.st === 'watch') break; }
  }
  const [x, y, fl] = posAt(v.s);
  const vert = Math.abs(posAt(v.s + 1)[0] - x) < 0.5;
  v.x = x + (vert ? v.off : 0); v.y = y + (vert ? 0 : v.off); v.fl = fl;
  if (v.s >= RLEN) { exitVis(v); return true; }
  return false;
}
function exitVis(v) {
  if (v.hunger > 80) v.sat -= 8;
  if (v.thirst > 80) v.sat -= 8;
  v.sat -= Math.max(0, 4 - v.seen) * 5;
  const h = U.clamp(v.sat, 0, 100);
  S.rep = S.rep * 0.94 + h * 0.06;
}
function view(g, v, V) {
  if (V.stall) {
    STALLS.forEach((st, i) => {
      if (!S.stalls[i] || v.money < st.price) return;
      let buy = false;
      if (st.k === 'food' && v.hunger > 45) { buy = true; v.hunger = 0; }
      if (st.k === 'drink' && v.thirst > 45) { buy = true; v.thirst = 0; }
      if (st.k === 'ice' && (v.thirst > 30 || v.hunger > 30) && Math.random() < 0.5) { buy = true; v.thirst *= 0.5; v.hunger *= 0.7; }
      if (st.k === 'gift' && V.stall === 2 && v.sat > 60 && Math.random() < 0.45) buy = true;
      if (buy) { const p = st.price + (S.stalls[i] - 1); v.money -= p; S.money += p; S.todayIn += p; S.income += p; v.sat += 4; g.float(st.x, st.y - 20, '+' + p, '#fde047', 13); }
    });
    return;
  }
  const L = S.lots[V.lot];
  if (L.locked || !L.an.length) return;
  const ap = lotAppeal(L);
  v.seen++;
  v.sat += Math.min(14, ap * 0.3) / (1 + v.seen * 0.12);
  if (L.clean < 35) { v.sat -= 4; v.th = '🤢'; v.thT = 2; }
  else if (ap > 25) { v.th = U.choice(['😍', '🤩', '📸']); v.thT = 2; }
  else if (L.an.some((a) => a.baby)) { v.th = '🥰'; v.thT = 2; }
  v.st = 'watch'; v.wt = U.clamp(1 + ap * 0.06, 1, 4);
  if (Math.random() < Math.min(0.5, ap / 60) && v.money > 3) { const d = U.randi(1, 3); v.money -= d; S.money += d; S.todayIn += d; S.income += d; L.inc += d; }
}
function lotTick(g, L, dt) {
  if (!L.sp || !L.an.length) return;
  const sp = SPK[L.sp];
  L.food = Math.max(0, L.food - L.an.length * sp.food * 0.3 * dt);
  L.clean = Math.max(0, L.clean - L.an.length * 0.22 * dt);
  let sum = 0;
  for (const a of L.an) {
    let tgt = 72 + L.deco * 9;
    if (L.food < 30) tgt -= 40 * (1 - L.food / 30) + 10;
    if (L.clean < 40) tgt -= 25 * (1 - L.clean / 40) + 5;
    if (sp.social && L.an.length < 2) tgt -= 22;
    if (L.an.length > L.cap) tgt -= 20;
    if (a.sick) tgt -= 35;
    a.happy += U.clamp(tgt - a.happy, -6 * dt, 6 * dt);
    sum += a.happy;
    // 이동
    a.t -= dt;
    if (a.t <= 0) { a.t = U.rand(1.5, 5); a.tx = U.rand(18, L.w - 18); a.ty = U.rand(28, L.h - 14); }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), spd = (a.baby ? 18 : 12) * (a.sick ? 0.4 : 1) * dt;
    if (d > 1) { a.x += (dx / d) * Math.min(spd, d); a.y += (dy / d) * Math.min(spd, d); a.fl = dx > 0; }
  }
  const avg = sum / L.an.length;
  if (avg < 25) {
    L.sadT += dt;
    if (L.sadT > 18 && Math.random() < dt * 0.08 && S.esc.length < 3) {
      L.sadT = 0;
      const a = L.an.pop();
      const s = VIEWS.find((V) => V.lot === L.i);
      S.esc.push({ sp: L.sp, lot: L.i, a, s: s ? s.s : 100, dir: Math.random() < 0.5 ? 1 : -1, spd: 70, t: 22, x: 0, y: 0 });
      toast(`🚨 ${sp.n}이(가) 탈출했어요! 빨리 클릭해서 잡으세요!`, '#f87171'); g.sfx.tone(880, 0.6, 'sawtooth', 0.06, 440); g.shake(6, 0.4);
    }
  } else L.sadT = Math.max(0, L.sadT - dt);
}
function staffTick(g, s, dt) {
  const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
  if (d > 2) { const st = Math.min(d, 70 * dt); s.x += (dx / d) * st; s.y += (dy / d) * st; return; }
  if (s.work > 0) {
    s.work -= dt;
    if (s.work <= 0 && s.lot >= 0) {
      const L = S.lots[s.lot];
      if (s.k === 'keeper' && L.sp) {
        if (L.food < 60) { const c = feedCost(L); S.money -= c; S.todayOut += c; L.food = 100; }
        if (L.clean < 60) L.clean = 100;
      }
      if (s.k === 'vet') for (const a of L.an) if (a.sick) { a.sick = 0; S.money -= 60; S.todayOut += 60; break; }
      s.lot = -1;
    }
    return;
  }
  // 새 작업 찾기
  let best = -1, bs = 0;
  for (const L of S.lots) {
    if (!L.sp || !L.an.length || S.staff.some((o) => o !== s && o.lot === L.i)) continue;
    let sc = 0;
    if (s.k === 'keeper') sc = (L.food < 60 ? 100 - L.food : 0) + (L.clean < 60 ? 100 - L.clean : 0);
    else sc = L.an.some((a) => a.sick) ? 100 : 0;
    if (sc > bs) { bs = sc; best = L.i; }
  }
  if (best >= 0) { const L = S.lots[best]; s.lot = best; s.tx = L.x + L.w / 2; s.ty = L.y + L.h - 10; s.work = 2; }
  else if (Math.random() < 0.01) { s.tx = U.choice([22, 360, 698]); s.ty = U.choice([210, 370, 560]); }
}
function checkGoal(g) {
  const G = GOALS[S.goal]; if (!G || !G.f()) return;
  if (S.goal === GOALS.length - 1) { g.score = Math.round(S.income) + 20000; g.save('zoo', null); g.win(`${S.day}일 만에 별 5개 동물원 완성! ${speciesCount()}종의 동물`); return; }
  S.money += G.r; S.goal++;
  toast(`🏆 목표 달성: ${G.d} (+${G.r}💰)`, '#fde047'); g.sfx.win(); g.burst(360, 300, ['#fde047', '#86efac', '#60a5fa'], 40, 300);
}
function endDay(g) {
  S.dayT = 0;
  let cost = 0;
  STAFF.forEach((s, i) => (cost += s.sal * S.staffN[i]));
  for (const L of S.lots) if (L.hab) cost += 15 + L.deco * 5;
  STALLS.forEach((st, i) => { if (S.stalls[i]) cost += st.up; });
  S.money -= cost; S.todayOut += cost;
  // 동물: 나이, 질병, 번식
  for (const L of S.lots) {
    if (!L.sp) continue;
    const sp = SPK[L.sp];
    for (let k = L.an.length - 1; k >= 0; k--) {
      const a = L.an[k];
      a.age++;
      if (a.baby && a.age >= 2) { a.baby = false; toast(`🐾 아기 ${sp.n}이(가) 다 자랐어요`, '#a7f3d0'); }
      if (a.sick) { a.sick++; if (a.sick >= 3) { L.an.splice(k, 1); S.rep = Math.max(0, S.rep - 10); toast(`💔 아픈 ${sp.n}이(가) 세상을 떠났어요…`, '#fca5a5'); continue; } }
      else if (Math.random() < 0.03 + (L.clean < 40 ? 0.12 : 0) + (L.food < 20 ? 0.08 : 0)) { a.sick = 1; toast(`🤒 ${sp.n}이(가) 아파요! 수의사 또는 치료 필요`, '#fcd34d'); }
    }
    const adults = L.an.filter((a) => !a.baby && !a.sick);
    const avg = L.an.reduce((s, a) => s + a.happy, 0) / Math.max(1, L.an.length);
    if (adults.length >= 2 && avg > 70 && L.food > 25 && L.an.length < L.cap && Math.random() < 0.22) {
      L.an.push(mkAnimal(L, true, 0, 85)); S.births++; S.rep = Math.min(100, S.rep + 3);
      toast(`🍼 아기 ${sp.e} ${sp.n} 탄생!`, '#f9a8d4'); g.sfx.power();
    }
  }
  const profit = Math.round(S.todayIn - S.todayOut);
  S.lastProfit = profit; S.hist.push(profit); if (S.hist.length > 10) S.hist.shift();
  toast(`📅 ${S.day}일차 결산: 수입 ${Math.round(S.todayIn)} · 지출 ${Math.round(S.todayOut)} → ${profit >= 0 ? '+' : ''}${profit}`, profit >= 0 ? '#86efac' : '#fca5a5');
  S.todayIn = 0; S.todayOut = 0;
  if (S.mkt > 0) S.mkt--;
  if (S.money < 0) {
    S.debt++; toast(`⚠️ 잔고 적자 ${S.debt}/3일 — 계속되면 파산!`, '#f87171'); g.sfx.lose();
    if (S.debt >= 3) { g.save('zoo', null); g.over(`동물원이 파산했습니다… ${S.day}일차, 누적 방문객 ${S.admitted}명`); return; }
  } else S.debt = 0;
  S.day++;
  saveZoo();
}

/* ---------- 입력 ---------- */
function uiClick(g) {
  for (let i = S.ui.length - 1; i >= 0; i--) { const b = S.ui[i]; if (g.inRect(b.x, b.y, b.w, b.h)) { b.fn(); g.sfx.click(); return true; } }
  return g.mouse.x >= PX || g.mouse.y < 52;
}
function mapClick(g) {
  const m = g.mouse;
  for (let i = S.esc.length - 1; i >= 0; i--) {
    const e = S.esc[i];
    if (Math.hypot(e.x - m.x, e.y - m.y) < 34) {
      S.esc.splice(i, 1);
      const L = S.lots[e.lot];
      e.a.happy = 55; e.a.x = L.w / 2; e.a.y = L.h / 2;
      if (L.sp === e.sp) L.an.push(e.a);
      g.add(50, e.x, e.y - 20); g.sfx.coin(); g.burst(e.x, e.y, ['#fde047', '#fff'], 20, 200);
      toast(`🎯 ${SPK[e.sp].n} 포획 성공! 우리로 돌려보냈어요`, '#86efac');
      return;
    }
  }
  for (const L of S.lots) if (g.inRect(L.x, L.y, L.w, L.h)) { S.sel = L.i; S.selA = -1; S.tab = 0; return; }
  S.sel = -1;
}
function spend(c) {
  if (S.money < c) { toast('💰 돈이 부족해요', '#fca5a5'); S.g.sfx.hit(); return false; }
  S.money -= c; S.todayOut += c; return true;
}
function landCost() { return 1500 + S.land * 900; }

/* ---------- 그리기 ---------- */
function B(g, x, y, w, h, label, col, fn, o) {
  o = o || {};
  const hov = !o.dis && g.inRect(x, y, w, h);
  g.rrect(x, y, w, h, 7, o.dis ? '#1f2530' : o.on ? '#b45309' : hov ? '#3b4a63' : col || '#26324a', o.on ? '#fde68a' : 'rgba(255,255,255,.15)', 1.5);
  if (label) g.text(label, x + w / 2, y + h / 2 + 1, o.size || 13, o.dis ? '#5b6472' : '#fff');
  if (!o.dis && fn) S.ui.push({ x, y, w, h, fn });
}
function drawMap(g, c) {
  g.rect(0, 52, PX, 548, '#3a6b2a');
  for (let i = 0; i < 40; i++) g.circle((i * 173) % PX, 60 + ((i * 97) % 540), 3, '#447a32');
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#a8916b'; c.lineWidth = 32; c.beginPath(); WP.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
  c.strokeStyle = '#d6c29a'; c.lineWidth = 26; c.stroke();
  // 광장
  g.rrect(200, 516, 320, 70, 12, '#cbb58c');
  g.rrect(318, 572, 84, 24, 6, '#b91c1c'); g.text('🦁 입구', 360, 584, 12, '#fff');
  STALLS.forEach((st, i) => {
    if (S.stalls[i]) { g.rrect(st.x - 22, st.y - 22, 44, 40, 6, '#fef3c7', '#92400e', 1.5); for (let k = 0; k < 4; k++) g.rect(st.x - 22 + k * 11, st.y - 24, 11, 7, k % 2 ? '#16a34a' : '#fff'); g.emoji(st.e, st.x, st.y, 24); if (S.stalls[i] > 1) g.text('Lv' + S.stalls[i], st.x, st.y + 24, 10, '#7c2d12'); }
    else { c.globalAlpha = 0.5; g.rrect(st.x - 22, st.y - 22, 44, 40, 6, null, '#fff', 1.5); g.emoji(st.e, st.x, st.y - 2, 18); c.globalAlpha = 1; }
  });
  for (const L of S.lots) drawLot(g, c, L);
  for (const s of S.staff) { g.emoji(s.e, s.x, s.y, 20); if (s.work > 0) g.emoji(s.k === 'vet' ? '💊' : '🧽', s.x + 10, s.y - 14, 12); }
  for (const v of S.vis) {
    g.emoji(v.e, v.x, v.y - 6, 17);
    if (v.thT > 0 && v.th) { g.circle(v.x + 10, v.y - 22, 8, 'rgba(255,255,255,.85)'); g.emoji(v.th, v.x + 10, v.y - 22, 11); }
  }
  for (const e of S.esc) {
    const p = 1 + Math.sin(g.time * 10) * 0.15;
    g.ring(e.x, e.y, 26 * p, '#ef4444', 3);
    g.emoji(SPK[e.sp].e, e.x, e.y + Math.sin(g.time * 14) * 3, 34);
    g.text(Math.ceil(e.t) + 's', e.x, e.y - 30, 12, '#fca5a5');
  }
  const t = S.dayT / DAYLEN, dark = t > 0.8 ? (t - 0.8) / 0.2 * 0.38 : 0;
  if (dark > 0) { c.fillStyle = `rgba(10,15,50,${dark})`; c.fillRect(0, 52, PX, 548); }
  let ty = 66;
  for (let k = S.toasts.length - 1; k >= 0; k--) {
    const o = S.toasts[k]; c.globalAlpha = Math.min(1, o.t);
    c.font = 'bold 13px sans-serif'; const w = c.measureText(o.s).width + 20;
    g.rrect(8, ty - 11, w, 22, 6, 'rgba(0,0,0,.75)'); g.text(o.s, 18, ty, 13, o.col, 'left'); ty += 26;
  }
  c.globalAlpha = 1;
  if (S.paused) { g.rrect(290, 60, 140, 30, 8, 'rgba(0,0,0,.6)'); g.text('⏸ 일시정지', 360, 75, 16, '#fde047'); }
}
function drawLot(g, c, L) {
  const { x, y, w, h } = L, sel = S.sel === L.i;
  if (L.locked) {
    g.rrect(x, y, w, h, 8, '#2d4a22', sel ? '#fde047' : '#1f3518', 2);
    g.emoji('🔒', x + w / 2, y + h / 2 - 10, 26); g.text('토지 ' + landCost(), x + w / 2, y + h / 2 + 20, 12, '#d9f99d');
    return;
  }
  if (!L.hab) {
    g.rrect(x, y, w, h, 8, '#4a7d34', sel ? '#fde047' : '#8b6d3f', 2);
    c.setLineDash([6, 5]); g.rrect(x + 6, y + 6, w - 12, h - 12, 6, null, 'rgba(255,255,255,.35)', 1.5); c.setLineDash([]);
    g.text('＋ 우리 짓기', x + w / 2, y + h / 2, 14, '#f0fdf4');
    return;
  }
  const H = HAB[L.hab];
  g.rrect(x, y, w, h, 8, H.c, null);
  if (L.hab === 'water') { g.circle(x + w * 0.6, y + h * 0.55, 34, H.c2); g.circle(x + w * 0.35, y + h * 0.62, 22, H.c2); }
  else if (L.hab === 'polar') { g.rrect(x + 10, y + h - 40, w - 20, 30, 10, '#38bdf8'); }
  else { for (let k = 0; k < 6; k++) g.circle(x + 15 + ((k * 53) % (w - 30)), y + 25 + ((k * 37) % (h - 40)), 8, H.c2); }
  for (let k = 0; k < L.deco; k++) g.emoji(H.deco[k], x + 18 + k * 50, y + h - 20 + (k % 2) * -60, 22);
  // 똥
  const poo = L.clean < 70 ? Math.ceil((70 - L.clean) / 18) : 0;
  for (let k = 0; k < poo; k++) g.emoji('💩', x + 25 + ((k * 41) % (w - 50)), y + 40 + ((k * 29) % (h - 50)), 13);
  if (L.food > 5) g.emoji('🥩', x + w - 16, y + h - 14, 14 * Math.max(0.5, L.food / 100) + 4);
  if (L.sp) {
    const sp = SPK[L.sp];
    for (const a of L.an) {
      c.save(); c.translate(x + a.x, y + a.y + Math.sin(g.time * 4 + a.t) * 1.5);
      if (a.fl) c.scale(-1, 1);
      g.emoji(sp.e, 0, 0, a.baby ? 18 : 30);
      c.restore();
      if (a.sick) g.emoji('🤒', x + a.x + 10, y + a.y - 14, 12);
      else if (a.happy < 30) g.emoji('💢', x + a.x + 10, y + a.y - 14, 11);
      else if (a.happy > 85) g.emoji('💕', x + a.x + 10, y + a.y - 14, 10);
    }
  }
  // 울타리
  g.rrect(x, y, w, h, 8, null, sel ? '#fde047' : '#7c5a32', sel ? 4 : 3);
  for (let k = 0; k <= w; k += 12) { g.rect(x + k - 1, y - 3, 3, 6, '#5b3f1f'); g.rect(x + k - 1, y + h - 3, 3, 6, '#5b3f1f'); }
  g.rrect(x + 4, y + 4, 74, 16, 4, 'rgba(0,0,0,.55)');
  g.text(L.sp ? `${SPK[L.sp].e}${SPK[L.sp].n} ${L.an.length}/${L.cap}` : H.e + H.n + ' (빈 우리)', x + 41, y + 12, 10, '#fff');
  if (L.sp && L.an.length) {
    const avg = L.an.reduce((s, a) => s + a.happy, 0) / L.an.length;
    g.rect(x + w - 44, y + 8, 38, 6, '#1f2937'); g.rect(x + w - 44, y + 8, 38 * avg / 100, 6, avg > 60 ? '#22c55e' : avg > 30 ? '#eab308' : '#ef4444');
    if (L.food < 25 && Math.sin(g.time * 6) > 0) g.emoji('🍖', x + w - 16, y + 26, 16);
  }
}
function drawTop(g) {
  g.rect(0, 0, 960, 52, '#13222f'); g.rect(0, 51, 960, 1, '#2d4a5f');
  g.text('💰 ' + Math.floor(S.money).toLocaleString(), 14, 16, 18, S.money < 0 ? '#f87171' : '#fde047', 'left');
  g.text(`👥 관람객 ${S.vis.length}명 (누적 ${S.admitted})`, 14, 38, 12, '#cbd5e1', 'left');
  g.text('⭐'.repeat(S.stars) + '☆'.repeat(5 - S.stars), 210, 16, 15, '#fde047', 'left');
  g.text('평판', 210, 38, 11, '#cbd5e1', 'left');
  g.rrect(240, 32, 90, 11, 4, '#1e293b'); g.rrect(240, 32, 90 * S.rep / 100, 11, 4, S.rep > 65 ? '#22c55e' : S.rep > 40 ? '#eab308' : '#ef4444');
  g.text(`📅 ${S.day}일차`, 345, 16, 13, '#e2e8f0', 'left');
  g.rrect(345, 32, 70, 10, 4, '#1e293b'); g.rrect(345, 32, 70 * S.dayT / DAYLEN, 10, 4, '#60a5fa');
  const G = GOALS[S.goal];
  g.text('🎯 목표 ' + (S.goal + 1) + '/' + GOALS.length, 430, 16, 12, '#fcd34d', 'left');
  g.text(G ? G.d + (G.r ? ` (+${G.r})` : '') : '', 430, 36, 12, '#fff', 'left');
  B(g, 790, 12, 34, 28, '⏸', '#26324a', () => (S.paused = !S.paused), { on: S.paused });
  [1, 2, 3].forEach((s, k) => B(g, 828 + k * 44, 12, 40, 28, '▶'.repeat(s), '#26324a', () => { S.speed = s; S.paused = false; }, { on: !S.paused && S.speed === s, size: 10 }));
}
function drawPanel(g, c) {
  g.rect(PX, 52, 960 - PX, 548, '#111c27');
  const x = PX + 8;
  if (S.sel >= 0) return drawLotPanel(g, S.lots[S.sel], x);
  let y = 72;
  g.text('🦁 동물원 관리', x, y, 15, '#fff', 'left');
  g.text('우리를 클릭해서 관리하세요', x, y + 20, 11, '#94a3b8', 'left');
  y += 50;
  g.text('🎟️ 입장료', x, y, 13, '#fff', 'left');
  B(g, PX + 110, y - 12, 28, 24, '−', '#334155', () => (S.fee = Math.max(0, S.fee - 1)));
  g.text(S.fee, PX + 158, y, 15, '#fde047');
  B(g, PX + 178, y - 12, 28, 24, '+', '#334155', () => (S.fee = Math.min(60, S.fee + 1)));
  y += 18; g.text(`적정 입장료 약 ${Math.round(zooValue())}`, x, y, 10, '#94a3b8', 'left');
  y += 24;
  B(g, x, y - 12, 220, 26, S.mkt > 0 ? `📣 광고 중 (${S.mkt}일)` : '📣 광고 (600 · 3일간 손님↑)', '#4c1d95', () => { if (spend(600)) { S.mkt = 3; toast('📣 광고 시작!', '#f9a8d4'); } }, { dis: S.mkt > 0, size: 12 });
  y += 28; g.text('👷 직원', x, y, 13, '#fff', 'left');
  STAFF.forEach((s, i) => {
    y += 26;
    g.text(`${s.e} ${s.n} ${S.staffN[i]}명`, x, y - 4, 12, '#e2e8f0', 'left'); g.text(`${s.d} · ${s.sal}/일`, x, y + 9, 9, '#94a3b8', 'left');
    B(g, PX + 160, y - 12, 28, 22, '−', '#334155', () => fire(i), { dis: !S.staffN[i] });
    B(g, PX + 194, y - 12, 28, 22, '+', '#334155', () => { if (S.staff.length < 10) hire(i); });
  });
  y += 30; g.text('🏪 편의시설 (광장)', x, y, 13, '#fff', 'left');
  STALLS.forEach((st, i) => {
    y += 27; const lv = S.stalls[i], cost = lv ? st.cost * lv : st.cost;
    g.text(`${st.e} ${st.n} ${lv ? 'Lv' + lv : ''}`, x, y, 12, lv ? '#e2e8f0' : '#94a3b8', 'left');
    B(g, PX + 132, y - 11, 90, 22, lv ? (lv >= 3 ? '최대' : '강화 ' + cost) : '건설 ' + cost, '#1e3a5f', () => { if (spend(cost)) { S.stalls[i]++; S.g.sfx.coin(); } }, { dis: lv >= 3, size: 11 });
  });
  y += 28; g.text('📊 일일 순이익', x, y, 12, '#fff', 'left'); y += 8;
  const mx = Math.max(100, ...S.hist.map((v) => Math.abs(v)));
  g.rect(x, y + 26, 220, 1, '#475569');
  S.hist.forEach((v, i) => { const hh = (Math.abs(v) / mx) * 24; g.rect(x + 2 + i * 22, v >= 0 ? y + 26 - hh : y + 26, 18, hh, v >= 0 ? '#22c55e' : '#ef4444'); });
  y += 62;
  g.text(`🐾 전시 ${speciesCount()}종 · 아기 탄생 ${S.births}회`, x, y, 11, '#cbd5e1', 'left');
  B(g, x, 564, 220, 26, S.confirm > 0 ? '정말? 한 번 더 클릭' : '🗑️ 새 동물원 시작', '#3f1d1d', () => {
    if (S.confirm > 0) { const g2 = S.g; g2.save('zoo', null); newZoo(); S.g = g2; toast('🦁 새 동물원을 시작합니다'); } else { S.confirm = 1; S.g.later(() => { if (S) S.confirm = 0; }, 3); }
  }, { size: 12 });
}
function bar(g, x, y, w, v, col, label) {
  g.text(label, x, y, 11, '#cbd5e1', 'left');
  g.rrect(x + 44, y - 6, w - 44, 12, 4, '#1e293b'); g.rrect(x + 44, y - 6, (w - 44) * U.clamp(v, 0, 100) / 100, 12, 4, col);
  g.text(Math.round(v), x + 44 + (w - 44) / 2, y, 9, '#fff');
}
function drawLotPanel(g, L, x) {
  let y = 70;
  B(g, PX + 196, 58, 26, 24, '✕', '#334155', () => (S.sel = -1));
  if (L.locked) {
    g.text('🔒 미개척 토지', x, y + 4, 15, '#fff', 'left');
    g.text('토지를 구입하면 새 우리를', x, y + 34, 12, '#cbd5e1', 'left'); g.text('지을 수 있어요.', x, y + 52, 12, '#cbd5e1', 'left');
    B(g, x, y + 76, 220, 32, `토지 구입 (${landCost()})`, '#166534', () => { if (spend(landCost())) { L.locked = false; S.land++; S.g.sfx.coin(); toast('🏞️ 새 토지 확보!', '#86efac'); } });
    return;
  }
  if (!L.hab) {
    g.text('🏗️ 서식지 선택', x, y + 4, 15, '#fff', 'left');
    HK.forEach((k, i) => {
      const H = HAB[k], yy = y + 30 + i * 44;
      B(g, x, yy, 220, 38, '', '#1e2a3d', () => { if (spend(H.cost)) { L.hab = k; L.food = 100; L.clean = 100; S.g.sfx.drop(); S.g.burst(L.x + L.w / 2, L.y + L.h / 2, '#fde047', 20, 200); } });
      g.emoji(H.e, x + 20, yy + 19, 22); g.text(H.n, x + 40, yy + 13, 13, '#fff', 'left');
      g.text(SP.filter((s) => s.h === k).map((s) => s.e).join(''), x + 40, yy + 28, 11, '#fff', 'left');
      g.text(H.cost, x + 212, yy + 19, 12, S.money >= H.cost ? '#fde047' : '#f87171', 'right');
    });
    return;
  }
  const H = HAB[L.hab], sp = L.sp ? SPK[L.sp] : null;
  g.text(`${H.e} ${H.n} 우리 ${sp ? '· ' + sp.n : ''}`, x, y + 2, 14, '#fff', 'left');
  y += 24;
  const avg = L.an.length ? L.an.reduce((s, a) => s + a.happy, 0) / L.an.length : 0;
  bar(g, x, y, 220, L.food, '#f59e0b', '🍖먹이'); y += 17;
  bar(g, x, y, 220, L.clean, '#38bdf8', '🧽청결'); y += 17;
  bar(g, x, y, 220, avg, avg > 60 ? '#22c55e' : '#ef4444', '😊행복'); y += 16;
  const fc = L.an.length ? feedCost(L) : 0;
  B(g, x, y, 72, 26, `🍖 ${fc}`, '#78350f', () => { if (L.an.length && spend(fc)) { L.food = 100; S.g.sfx.pop(); } }, { dis: !L.an.length || L.food > 95, size: 12 });
  B(g, x + 74, y, 72, 26, '🧽 30', '#0c4a6e', () => { if (spend(30)) { L.clean = 100; S.g.sfx.pop(); } }, { dis: L.clean > 95, size: 12 });
  const dc = 300 * (L.deco + 1);
  B(g, x + 148, y, 72, 26, L.deco >= 3 ? '꾸미기MAX' : `🌳 ${dc}`, '#14532d', () => { if (spend(dc)) { L.deco++; S.g.sfx.coin(); } }, { dis: L.deco >= 3, size: 11 });
  y += 30;
  const ec = L.cap === 4 ? 800 : 1600;
  B(g, x, y, 108, 24, L.cap >= 8 ? '확장 MAX' : `📐 확장 ${ec}`, '#334155', () => { if (spend(ec)) { L.cap += 2; S.g.sfx.coin(); } }, { dis: L.cap >= 8, size: 11 });
  g.text(`꾸미기 Lv${L.deco} · 수입 ${L.inc}`, x + 116, y + 12, 10, '#94a3b8', 'left');
  y += 32;
  g.text('동물 (클릭해서 선택)', x, y, 11, '#cbd5e1', 'left'); y += 10;
  for (let k = 0; k < L.cap; k++) {
    const bx = x + (k % 4) * 55, by = y + Math.floor(k / 4) * 44, a = L.an[k];
    B(g, bx, by, 51, 40, '', '#1e2a3d', a ? () => (S.selA = S.selA === k ? -1 : k) : null, { on: S.selA === k && !!a });
    if (a) { g.emoji(sp.e, bx + 25, by + 17, a.baby ? 16 : 24); g.rect(bx + 6, by + 33, 39 * a.happy / 100, 4, a.happy > 60 ? '#22c55e' : a.happy > 30 ? '#eab308' : '#ef4444'); if (a.sick) g.emoji('🤒', bx + 42, by + 8, 12); if (a.baby) g.text('아기', bx + 10, by + 8, 8, '#f9a8d4'); }
  }
  y += Math.ceil(L.cap / 4) * 44 + 4;
  const a = L.an[S.selA];
  if (a) {
    const val = Math.floor(sp.cost * (a.baby ? 0.7 : 0.5));
    B(g, x, y, 108, 26, `💰 판매 +${val}`, '#7f1d1d', () => { L.an.splice(S.selA, 1); S.selA = -1; S.money += val; S.todayIn += val; S.g.sfx.coin(); if (!L.an.length) L.sp = null; }, { size: 12 });
    B(g, x + 112, y, 108, 26, '💊 치료 200', '#155e75', () => { if (spend(200)) { a.sick = 0; S.g.sfx.power(); } }, { dis: !a.sick, size: 12 });
    y += 30;
  }
  g.text(sp ? `${sp.n} 추가 입양` : '동물 입양 (서식지 맞춤)', x, y + 6, 11, '#cbd5e1', 'left'); y += 16;
  const list = SP.filter((s) => s.h === L.hab && (!L.sp || s.k === L.sp));
  list.forEach((s, i) => {
    const by = y + i * 30; if (by > 568) return;
    const lock = s.tier > S.stars, full = L.an.length >= L.cap;
    B(g, x, by, 220, 27, '', '#1e2a3d', () => {
      if (spend(s.cost)) { L.sp = s.k; L.an.push(mkAnimal(L, false, 3, 60)); S.g.sfx.coin(); S.g.burst(L.x + L.w / 2, L.y + L.h / 2, ['#fde047', '#fff'], 16, 160); }
    }, { dis: lock || full });
    g.emoji(lock ? '🔒' : s.e, x + 16, by + 14, 18);
    g.text(s.n, x + 32, by + 9, 12, lock ? '#64748b' : '#fff', 'left');
    g.text(lock ? `⭐${s.tier} 필요` : `매력 ${s.ap}${s.social ? ' · 무리' : ''}`, x + 32, by + 21, 9, '#94a3b8', 'left');
    g.text(s.cost, x + 212, by + 14, 12, S.money >= s.cost ? '#fde047' : '#f87171', 'right');
  });
}
