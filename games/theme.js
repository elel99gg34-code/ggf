let S;
const COLS = 22, ROWS = 17, TS = 32, OX = 8, OY = 52, PX = 724, N = COLS * ROWS, DAYLEN = 60;
const GATE = 16 * COLS + 10;
const GE = ['🧒', '👦', '👧', '🧑', '👩', '👨', '👵', '👴', '👱', '🧔', '👩‍🦰', '🧑‍🦱'];
const RIDES = [
  { k: 'carousel', n: '회전목마', e: '🎠', w: 2, h: 2, cost: 600, cap: 8, dur: 6, exc: 3, int: 1, price: 3, up: 20, col: '#9d174d', an: 'bob' },
  { k: 'cups', n: '회전컵', e: '☕', w: 2, h: 2, cost: 900, cap: 8, dur: 6, exc: 4, int: 3, price: 4, up: 25, col: '#6d28d9', an: 'spin' },
  { k: 'bumper', n: '범퍼카', e: '🚗', w: 3, h: 2, cost: 1300, cap: 8, dur: 7, exc: 5, int: 3, price: 5, up: 30, col: '#991b1b', an: 'shake' },
  { k: 'wheel', n: '관람차', e: '🎡', w: 3, h: 3, cost: 1800, cap: 16, dur: 12, exc: 5, int: 1, price: 5, up: 35, col: '#1e40af', an: 'spin' },
  { k: 'ghost', n: '귀신의 집', e: '👻', w: 2, h: 2, cost: 2000, cap: 6, dur: 8, exc: 6, int: 4, price: 6, up: 35, col: '#1f2937', an: 'bob' },
  { k: 'train', n: '미니기차', e: '🚂', w: 4, h: 2, cost: 2200, cap: 16, dur: 10, exc: 4, int: 1, price: 4, up: 30, col: '#065f46', an: 'slide' },
  { k: 'viking', n: '바이킹', e: '⛵', w: 3, h: 2, cost: 2800, cap: 12, dur: 8, exc: 7, int: 6, price: 7, up: 45, col: '#92400e', an: 'swing' },
  { k: 'slide', n: '워터슬라이드', e: '🌊', w: 3, h: 3, cost: 3800, cap: 10, dur: 8, exc: 8, int: 5, price: 8, up: 55, col: '#155e75', an: 'bob' },
  { k: 'drop', n: '자이로드롭', e: '🗼', w: 2, h: 2, cost: 4500, cap: 10, dur: 7, exc: 8, int: 9, price: 9, up: 60, col: '#86198f', an: 'drop' },
  { k: 'coaster', n: '롤러코스터', e: '🎢', w: 4, h: 3, cost: 7000, cap: 16, dur: 10, exc: 10, int: 8, price: 12, up: 90, col: '#9f1239', an: 'swing' },
];
const STALLS = [
  { k: 'burger', n: '햄버거 가게', e: '🍔', cost: 300, need: 'hunger', amt: 70, price: 4, up: 10, lit: 1 },
  { k: 'drink', n: '음료 가게', e: '🥤', cost: 250, need: 'thirst', amt: 70, price: 3, up: 8, lit: 1 },
  { k: 'ice', n: '아이스크림', e: '🍦', cost: 350, need: 'thirst', amt: 40, need2: 'hunger', amt2: 30, price: 4, up: 10, lit: 1, joy: 5 },
  { k: 'cotton', n: '솜사탕', e: '🍭', cost: 350, need: 'hunger', amt: 35, price: 3, up: 8, lit: 1, joy: 6 },
  { k: 'toilet', n: '화장실', e: '🚻', cost: 200, need: 'toilet', amt: 100, price: 0, up: 12 },
  { k: 'gift', n: '기념품점', e: '🎈', cost: 450, need: 'gift', price: 6, up: 12, joy: 14 },
  { k: 'atm', n: 'ATM', e: '🏧', cost: 500, need: 'cash', price: 0, up: 10 },
];
const DECOS = [
  { k: 'tree', n: '나무', e: '🌳', cost: 30, beauty: 3 }, { k: 'flower', n: '꽃밭', e: '🌷', cost: 20, beauty: 2 },
  { k: 'fountain', n: '분수', e: '⛲', cost: 250, beauty: 8 }, { k: 'lamp', n: '가로등', e: '🏮', cost: 60, beauty: 3 },
  { k: 'bench', n: '벤치', e: '🪑', cost: 40, beauty: 1, bench: 1 }, { k: 'bin', n: '쓰레기통', e: '🗑️', cost: 50, bin: 1 },
];
const STAFF = [{ k: 'jan', n: '청소부', e: '🧹', sal: 60 }, { k: 'mech', n: '정비공', e: '🔧', sal: 90 }, { k: 'clown', n: '광대', e: '🤡', sal: 70 }];
const RES = [{ n: '없음', c: 0, p: 0 }, { n: '소액', c: 100, p: 1 }, { n: '보통', c: 250, p: 2.5 }, { n: '최대', c: 500, p: 4.5 }];
const GOALS = [
  { d: '손님 30명 입장시키기', f: () => S.admitted >= 30, r: 1000 },
  { d: '놀이기구 4개 운영', f: () => countRides() >= 4, r: 1500 },
  { d: '공원 평점 60 달성', f: () => S.rating >= 60, r: 2000 },
  { d: '동시 손님 60명', f: () => S.guests.length >= 60, r: 2500 },
  { d: '하루 순이익 +2500', f: () => S.lastProfit >= 2500, r: 3000 },
  { d: '롤러코스터 건설', f: () => S.blds.some((b) => b.d.k === 'coaster'), r: 4000 },
  { d: '평점 80 + 동시 손님 120명', f: () => S.rating >= 80 && S.guests.length >= 120, r: 0 },
];
const TOOLS = [{ kind: 'sel', e: '👆', n: '선택' }, { kind: 'path', e: '🟫', n: '길', cost: 10 }, { kind: 'demo', e: '💥', n: '철거' }]
  .concat(RIDES.map((d) => ({ kind: 'ride', d, e: d.e, n: d.n, cost: d.cost })), STALLS.map((d) => ({ kind: 'stall', d, e: d.e, n: d.n, cost: d.cost })), DECOS.map((d) => ({ kind: 'deco', d, e: d.e, n: d.n, cost: d.cost })));
const PREV = new Int16Array(N), QU = new Int16Array(N);

GAME({
  title: '놀이공원 타이쿤', w: 960, h: 600, bg: '#0c1a10', controls: 'none',
  help: '오른쪽 패널에서 도구 선택 → 맵 클릭(길은 드래그)으로 배치 · 우클릭 선택 해제\n놀이기구·매점은 반드시 길에 붙여 지어야 손님이 이용해요\n건물 클릭 → 요금 조정·수리·운영/중지·철거 · 관리 탭: 입장료·직원·연구·광고\n1/2/3 속도 · Space 일시정지 · 하루가 끝나면 급여·유지비 정산 & 자동 저장\n목표를 하나씩 달성해 최고의 놀이공원을 만드세요! (3일 연속 적자 잔고면 파산)',
  init(g) {
    newPark();
    const sv = g.load('park', null);
    if (sv && sv.v === 1) { try { loadPark(sv); } catch (e) { newPark(); } }
    S.g = g;
  },
  update(g, dt) {
    S.g = g;
    if (g.keyp('Digit1')) { S.speed = 1; S.paused = false; }
    if (g.keyp('Digit2')) { S.speed = 2; S.paused = false; }
    if (g.keyp('Digit3')) { S.speed = 3; S.paused = false; }
    if (g.keyp('Space')) S.paused = !S.paused;
    if (g.keyp('KeyQ') || g.mouse.rclick) { S.tool = TOOLS[0]; }
    const m = g.mouse;
    let used = false;
    if (m.clicked) used = uiClick(g);
    const hc = Math.floor((m.x - OX) / TS), hr = Math.floor((m.y - OY) / TS);
    S.hover = hc >= 0 && hr >= 0 && hc < COLS && hr < ROWS && m.x < OX + COLS * TS ? hr * COLS + hc : -1;
    if (m.clicked) S.drag = !used && S.hover >= 0;
    if (!m.down) S.drag = false;
    if (S.hover >= 0 && !used) {
      if ((S.tool.kind === 'path' || S.tool.kind === 'demo') && m.down && S.drag) dragTool(g);
      else if (m.clicked) mapClick(g);
    }
    if (!S.paused) { let t = dt * S.speed; while (t > 0.0001) { const s = Math.min(0.05, t); sim(g, s); t -= s; if (g.ended) return; } }
    for (const t of S.toasts) t.t -= dt;
    S.toasts = S.toasts.filter((t) => t.t > 0);
    g.score = Math.round(S.income);
    g.info = `${S.day}일차 · 💰${Math.floor(S.money).toLocaleString()} · 👥${S.guests.length} · ⭐${S.rating}`;
  },
  draw(g, c) {
    S.ui = [];
    drawMap(g, c);
    drawTop(g);
    drawPanel(g);
  },
});

function newPark() {
  S = { money: 5000, day: 1, dayT: 0, speed: 1, paused: false, tool: TOOLS[0], tab: 0, sel: null, ui: [], toasts: [], hover: -1, drag: false,
    path: new Uint8Array(N), occ: new Array(N).fill(null), litter: new Uint8Array(N), vom: new Uint8Array(N), beauty: new Float32Array(N),
    blds: [], guests: [], staff: [], nid: 1, pathVer: 1, fee: 10, rating: 50, admitted: 0, income: 0, todayIn: 0, todayOut: 0, lastProfit: 0, hist: [],
    spawnT: 2, rateT: 0, goal: 0, unlocked: 3, resLv: 1, resP: 0, mkt: 0, debt: 0, confirm: 0, staffN: [0, 0, 0] };
  // 초기 길: 입구에서 위로 + 가로
  for (let r = 10; r <= 16; r++) S.path[r * COLS + 10] = 1;
  for (let c = 4; c <= 17; c++) S.path[10 * COLS + c] = 1;
  for (let i = 0; i < 26; i++) {
    const r = U.randi(0, ROWS - 2), c = U.randi(0, COLS - 1), id = r * COLS + c;
    if (!S.path[id] && !S.occ[id] && Math.abs(r - 10) > 1) place({ kind: 'deco', d: DECOS[Math.random() < 0.7 ? 0 : 1] }, r, c, true);
  }
}
function savePark() {
  const g = S.g; if (!g) return;
  let p = ''; for (let i = 0; i < N; i++) p += S.path[i];
  g.save('park', { v: 1, money: S.money, day: S.day, fee: S.fee, admitted: S.admitted, income: S.income, hist: S.hist, lastProfit: S.lastProfit, goal: S.goal, unlocked: S.unlocked, resLv: S.resLv, resP: S.resP, mkt: S.mkt, debt: S.debt, staffN: S.staffN, rating: S.rating, path: p,
    blds: S.blds.map((b) => ({ t: b.type, k: b.d.k, r: b.r, c: b.c, price: b.price, open: b.open, rel: b.rel, total: b.total, inc: b.inc })) });
}
function loadPark(sv) {
  S.blds = []; S.occ.fill(null);
  Object.assign(S, { money: sv.money, day: sv.day, fee: sv.fee, admitted: sv.admitted, income: sv.income, hist: sv.hist || [], lastProfit: sv.lastProfit || 0, goal: sv.goal, unlocked: sv.unlocked, resLv: sv.resLv, resP: sv.resP, mkt: sv.mkt || 0, debt: sv.debt || 0, rating: sv.rating || 50 });
  for (let i = 0; i < N; i++) S.path[i] = sv.path[i] === '1' ? 1 : 0;
  for (const o of sv.blds) {
    const list = o.t === 'ride' ? RIDES : o.t === 'stall' ? STALLS : DECOS;
    const d = list.find((x) => x.k === o.k); if (!d) continue;
    const b = place({ kind: o.t, d }, o.r, o.c, true);
    if (b) { b.price = o.price; b.open = o.open; b.rel = o.rel; b.total = o.total || 0; b.inc = o.inc || 0; }
  }
  S.staffN = [0, 0, 0];
  (sv.staffN || [0, 0, 0]).forEach((n, i) => { for (let k = 0; k < n; k++) hire(i); });
  S.pathVer++;
}
function toast(s, col) { S.toasts.push({ s, col: col || '#fff', t: 4 }); if (S.toasts.length > 5) S.toasts.shift(); }
function countRides() { let n = 0; for (const b of S.blds) if (b.type === 'ride') n++; return n; }
function tc(i) { return [OX + (i % COLS) * TS + TS / 2, OY + ((i / COLS) | 0) * TS + TS / 2]; }

function canPlace(t, r, c) {
  const w = t.d && t.d.w || 1, h = t.d && t.d.h || 1;
  for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) {
    if (y < 0 || x < 0 || y >= ROWS || x >= COLS) return false;
    const i = y * COLS + x;
    if (S.path[i] || S.occ[i] || i === GATE) return false;
  }
  return true;
}
function place(t, r, c, free) {
  if (!canPlace(t, r, c)) return null;
  const d = t.d, w = d.w || 1, h = d.h || 1;
  const b = { id: S.nid++, type: t.kind, d, r, c, w, h, price: d.price || 0, open: true, rel: 100, broken: false, queue: [], riders: [], run: 0, load: 0, anim: 0, total: 0, inc: 0, accV: -1, acc: [] };
  for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) S.occ[y * COLS + x] = b;
  S.blds.push(b);
  if (!free) { S.money -= d.cost; S.todayOut += d.cost; }
  if (t.kind === 'deco') calcBeauty();
  return b;
}
function removeB(b, refund) {
  for (let y = b.r; y < b.r + b.h; y++) for (let x = b.c; x < b.c + b.w; x++) S.occ[y * COLS + x] = null;
  S.blds.splice(S.blds.indexOf(b), 1);
  b.dead = true;
  for (const q of b.queue.concat(b.riders)) { q.st = 'walk'; q.target = null; q.path = []; q.pi = 0; }
  if (refund) S.money += Math.floor(b.d.cost * 0.5);
  if (S.sel === b) S.sel = null;
  if (b.type === 'deco') calcBeauty();
}
function calcBeauty() {
  S.beauty.fill(0);
  for (const b of S.blds) if (b.type === 'deco' && b.d.beauty) {
    for (let y = b.r - 2; y <= b.r + 2; y++) for (let x = b.c - 2; x <= b.c + 2; x++) if (y >= 0 && x >= 0 && y < ROWS && x < COLS) S.beauty[y * COLS + x] += b.d.beauty / (1 + Math.abs(y - b.r) + Math.abs(x - b.c));
  }
}
function access(b) {
  if (b.accV === S.pathVer) return b.acc;
  const a = [];
  for (let y = b.r - 1; y <= b.r + b.h; y++) for (let x = b.c - 1; x <= b.c + b.w; x++) {
    if (y < 0 || x < 0 || y >= ROWS || x >= COLS) continue;
    const inX = x >= b.c && x < b.c + b.w, inY = y >= b.r && y < b.r + b.h;
    if (inX === inY) continue; // 모서리/내부 제외
    if (S.path[y * COLS + x]) a.push(y * COLS + x);
  }
  b.acc = a; b.accV = S.pathVer;
  return a;
}
function route(from, goal) {
  PREV.fill(-2);
  let h = 0, t = 0;
  QU[t++] = from; PREV[from] = -1;
  while (h < t) {
    const cur = QU[h++];
    if (goal(cur)) { const p = []; let x = cur; while (x !== -1) { p.push(x); x = PREV[x]; } return p.reverse(); }
    const r = (cur / COLS) | 0, c = cur % COLS;
    if (r > 0) nb(cur - COLS); if (r < ROWS - 1) nb(cur + COLS); if (c > 0) nb(cur - 1); if (c < COLS - 1) nb(cur + 1);
    function nb(n) { if (S.path[n] && PREV[n] === -2) { PREV[n] = cur; QU[t++] = n; } }
  }
  return null;
}
function routeTo(from, b) { const a = access(b); if (!a.length) return null; return route(from, (i) => a.indexOf(i) >= 0); }
function wander(o) {
  const p = [o.tile]; let cur = o.tile, prev = -1;
  for (let k = 0, n = U.randi(3, 8); k < n; k++) {
    const r = (cur / COLS) | 0, c = cur % COLS, opts = [];
    if (r > 0 && S.path[cur - COLS]) opts.push(cur - COLS); if (r < ROWS - 1 && S.path[cur + COLS]) opts.push(cur + COLS);
    if (c > 0 && S.path[cur - 1]) opts.push(cur - 1); if (c < COLS - 1 && S.path[cur + 1]) opts.push(cur + 1);
    const o2 = opts.length > 1 ? opts.filter((x) => x !== prev) : opts;
    if (!o2.length) break;
    prev = cur; cur = U.choice(o2); p.push(cur);
  }
  o.path = p; o.pi = 0;
}
function walk(o, dt, sp) {
  if (o.pi >= o.path.length) return true;
  const t = o.path[o.pi], tx = OX + (t % COLS) * TS + TS / 2 + o.ox, ty = OY + ((t / COLS) | 0) * TS + TS / 2 + o.oy;
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy), st = sp * dt;
  if (dx < -0.5) o.fl = true; else if (dx > 0.5) o.fl = false;
  if (d <= st) { o.x = tx; o.y = ty; o.tile = t; o.pi++; return o.pi >= o.path.length; }
  o.x += (dx / d) * st; o.y += (dy / d) * st;
  return false;
}
function think(q, e) { if (q.th !== e || q.thT <= 0) { q.th = e; q.thT = 2.5; } }

/* ---------- 시뮬레이션 ---------- */
function sim(g, dt) {
  S.dayT += dt;
  if (S.dayT >= DAYLEN) { endDay(g); if (g.ended) return; }
  S.spawnT -= dt;
  if (S.spawnT <= 0) { S.spawnT = spawnInterval(); spawnGuest(); }
  for (const b of S.blds) if (b.type === 'ride') rideTick(g, b, dt);
  for (let i = S.guests.length - 1; i >= 0; i--) if (guestTick(g, S.guests[i], dt)) S.guests.splice(i, 1);
  for (const s of S.staff) staffTick(g, s, dt);
  S.rateT -= dt;
  if (S.rateT <= 0) { S.rateT = 1; calcRating(); checkGoal(g); }
}
function parkValue() { return 6 + countRides() * 3 + S.rating / 8; }
function spawnInterval() {
  const rides = countRides();
  let iv = 7 - S.rating / 18 - Math.min(3.5, rides * 0.45);
  const v = parkValue(); if (S.fee > v) iv *= 1 + (S.fee - v) / 6;
  if (S.mkt > 0) iv /= 1.7;
  const t = S.dayT / DAYLEN; if (t > 0.8) iv *= 3;
  return Math.max(0.45, iv) * U.rand(0.7, 1.3);
}
function spawnGuest() {
  const cap = Math.min(180, 30 + countRides() * 14);
  if (S.guests.length >= cap || !S.path[GATE]) return;
  const money = U.randi(25, 80);
  if (S.fee > money * 0.6) return;
  const [x, y] = tc(GATE);
  const q = { e: U.choice(GE), x, y: y + 10, tile: GATE, path: [], pi: 0, ox: U.rand(-8, 8), oy: U.rand(-8, 8), st: 'walk', happy: U.rand(55, 80), hunger: U.rand(0, 40), thirst: U.rand(0, 40), toilet: U.rand(0, 30), energy: U.rand(70, 100),
    money: money - S.fee, tol: U.randi(2, 9), nausea: 0, target: null, waitT: 0, decT: 0, th: null, thT: 0, time: 0, stay: U.rand(110, 220), rides: 0, last: null, trash: 0, sick: 0, sp: U.rand(34, 46), leaving: false, fl: false, balloon: false };
  const v = parkValue(); if (S.fee > v) q.happy -= (S.fee - v) * 1.5;
  S.money += S.fee; S.todayIn += S.fee; S.income += S.fee; S.admitted++;
  S.guests.push(q);
}
function guestTick(g, q, dt) {
  q.hunger = Math.min(100, q.hunger + 0.55 * dt); q.thirst = Math.min(100, q.thirst + 0.7 * dt); q.toilet = Math.min(100, q.toilet + 0.4 * dt);
  q.energy = Math.max(0, q.energy - 0.22 * dt); q.time += dt; q.nausea = Math.max(0, q.nausea - 1.2 * dt);
  if (q.thT > 0) q.thT -= dt;
  let dh = -0.05;
  if (q.hunger > 85) { dh -= 0.25; think(q, '🍔'); } if (q.thirst > 85) { dh -= 0.25; think(q, '🥤'); }
  if (q.toilet > 90) { dh -= 0.4; think(q, '🚽'); } if (q.energy < 15) { dh -= 0.2; think(q, '😴'); }
  if (q.st === 'walk') {
    const l = S.litter[q.tile] + S.vom[q.tile] * 3;
    if (l > 2) { dh -= 0.35; think(q, '🤢'); }
    dh += Math.min(0.4, S.beauty[q.tile] * 0.03);
    for (const s of S.staff) if (s.k === 'clown' && Math.abs(s.x - q.x) < 60 && Math.abs(s.y - q.y) < 60) { dh += 0.8; break; }
  }
  q.happy = U.clamp(q.happy + dh * dt, 0, 100);
  if (q.st === 'ride') return false;
  if (q.st === 'queue') {
    q.waitT += dt;
    const b = q.target;
    if (!b || b.dead || b.broken || !b.open || q.waitT > 32) { if (b) { const i = b.queue.indexOf(q); if (i >= 0) b.queue.splice(i, 1); } q.st = 'walk'; q.target = null; q.happy -= 8; think(q, '😤'); }
    return false;
  }
  if (q.st === 'sit') { q.sitT -= dt; q.energy = Math.min(100, q.energy + 14 * dt); if (q.sitT <= 0) q.st = 'walk'; return false; }
  if (q.trash > 0) { q.trash -= dt; if (q.trash <= 0) dropTrash(q); }
  if (q.sick > 0) { q.sick -= dt; if (q.sick <= 0) { S.vom[q.tile] = Math.min(3, S.vom[q.tile] + 1); think(q, '🤮'); q.happy -= 6; } }
  if (!q.leaving && (q.happy < 12 || q.energy < 4 || q.time > q.stay || (q.money < 2 && q.time > 50))) { q.leaving = true; q.path = []; q.pi = 0; q.target = null; think(q, q.happy < 12 ? '😠' : '👋'); }
  if (!S.path[q.tile]) { const [x, y] = tc(GATE); q.tile = GATE; q.x = x; q.y = y; q.path = []; q.pi = 0; }
  if (q.pi < q.path.length && !S.path[q.path[q.pi]]) { q.path = []; q.pi = 0; q.target = null; }
  if (q.pi < q.path.length) { walk(q, dt, q.sp * (q.energy < 20 ? 0.7 : 1)); return false; }
  if (q.leaving) {
    if (q.tile === GATE) return true;
    const p = route(q.tile, (i) => i === GATE);
    if (!p) return true;
    q.path = p; q.pi = 0; return false;
  }
  if (q.target) { arrive(g, q); return false; }
  q.decT -= dt;
  if (q.decT <= 0) { decide(q); q.decT = U.rand(0.4, 1.4); }
  return false;
}
function dropTrash(q) {
  const r = (q.tile / COLS) | 0, c = q.tile % COLS;
  for (const b of S.blds) if (b.d.bin && Math.abs(b.r - r) + Math.abs(b.c - c) <= 3) return;
  S.litter[q.tile] = Math.min(9, S.litter[q.tile] + 1);
}
function nearest(q, pred) {
  const r = (q.tile / COLS) | 0, c = q.tile % COLS;
  let best = null, bd = 1e9;
  for (const b of S.blds) if (pred(b) && b.open && !b.broken && access(b).length) { const d = Math.abs(b.r - r) + Math.abs(b.c - c) + U.rand(0, 3); if (d < bd) { bd = d; best = b; } }
  return best;
}
function decide(q) {
  let tgt = null;
  if (q.toilet > 70) { tgt = nearest(q, (b) => b.d.need === 'toilet'); if (!tgt) { think(q, '🚽'); q.happy -= 2; } }
  if (!tgt && q.money < 5 && q.time < q.stay * 0.7) tgt = nearest(q, (b) => b.d.need === 'cash');
  if (!tgt && q.hunger > 60 && q.money >= 3) { tgt = nearest(q, (b) => b.type === 'stall' && (b.d.need === 'hunger' || b.d.need2 === 'hunger')); if (!tgt) { think(q, '🍔'); q.happy -= 2; } }
  if (!tgt && q.thirst > 60 && q.money >= 2) { tgt = nearest(q, (b) => b.type === 'stall' && (b.d.need === 'thirst' || b.d.need2 === 'thirst')); if (!tgt) { think(q, '🥤'); q.happy -= 2; } }
  if (!tgt && q.energy < 35) tgt = nearest(q, (b) => b.d.bench);
  if (!tgt && Math.random() < 0.85) tgt = pickRide(q);
  if (!tgt && !q.balloon && q.money > 10 && Math.random() < 0.25) tgt = nearest(q, (b) => b.d.need === 'gift');
  if (tgt) {
    const p = routeTo(q.tile, tgt);
    if (p) { q.target = tgt; q.path = p; q.pi = 0; return; }
    think(q, '🤔'); q.happy -= 1;
  }
  wander(q);
}
function pickRide(q) {
  let tot = 0; const c = [];
  for (const b of S.blds) {
    if (b.type !== 'ride' || !b.open || b.broken || b === q.last || !access(b).length) continue;
    if (b.d.int > q.tol + 1) continue;
    const val = b.d.exc * 1.4 + 2;
    if (b.price > q.money) continue;
    if (b.price > val * 1.7) { if (Math.random() < 0.2) { think(q, '💸'); q.happy -= 1; } continue; }
    const w = Math.max(0.2, b.d.exc + 2 - b.queue.length * 0.25 - Math.max(0, b.price - val));
    c.push([b, w]); tot += w;
  }
  if (!c.length) { if (Math.random() < 0.3) think(q, '🥱'); return null; }
  let r = Math.random() * tot;
  for (const [b, w] of c) { if ((r -= w) <= 0) return b; }
  return c[c.length - 1][0];
}
function arrive(g, q) {
  const b = q.target;
  if (b.dead || !b.open || b.broken) { q.target = null; think(q, '😠'); q.happy -= 4; return; }
  if (b.type === 'ride') { q.st = 'queue'; q.waitT = 0; b.queue.push(q); return; }
  q.target = null;
  if (b.type === 'deco') { if (b.d.bench) { q.st = 'sit'; q.sitT = 4; think(q, '😌'); } return; }
  const d = b.d;
  if (d.need === 'cash') { q.money += U.randi(20, 40); think(q, '💵'); return; }
  if (b.price > q.money) { think(q, '💸'); q.happy -= 3; return; }
  if (b.price > (d.need === 'gift' ? 12 : 8)) { think(q, '💸'); q.happy -= 2; if (Math.random() < 0.6) return; }
  q.money -= b.price; S.money += b.price; S.todayIn += b.price; S.income += b.price; b.inc += b.price; b.total++;
  if (d.need === 'hunger' || d.need === 'thirst' || d.need === 'toilet') q[d.need] = Math.max(0, q[d.need] - d.amt);
  if (d.need2) q[d.need2] = Math.max(0, q[d.need2] - d.amt2);
  if (d.need === 'thirst') q.toilet = Math.min(100, q.toilet + 15);
  if (d.joy) q.happy = Math.min(100, q.happy + d.joy);
  if (d.need === 'gift') { q.balloon = true; think(q, '🥰'); } else think(q, '😋');
  if (d.lit) q.trash = U.rand(3, 9);
  if (b.price > 0) g.float(q.x, q.y - 14, '+' + b.price, '#fde047', 12);
}
function rideTick(g, b, dt) {
  b.anim += dt;
  if (b.broken) return;
  if (b.run > 0) {
    b.run -= dt;
    if (b.run <= 0) finishRide(g, b);
    return;
  }
  if (b.queue.length && b.open) { b.load += dt; if (b.load > 2.5 || b.queue.length >= b.d.cap) startRide(g, b); } else b.load = 0;
}
function startRide(g, b) {
  b.load = 0;
  const n = Math.min(b.d.cap, b.queue.length);
  b.riders = b.queue.splice(0, n);
  let paid = 0;
  b.riders = b.riders.filter((q) => {
    if (q.money < b.price) { q.st = 'walk'; q.target = null; think(q, '💸'); return false; }
    q.money -= b.price; paid += b.price; q.st = 'ride'; return true;
  });
  if (!b.riders.length) return;
  S.money += paid; S.todayIn += paid; S.income += paid; b.inc += paid; b.total += b.riders.length;
  b.run = b.d.dur; b.anim = 0;
  if (paid) { const [x, y] = tc(b.r * COLS + b.c); g.float(x + (b.w - 1) * TS / 2, y - 6, '+' + paid, '#fde047', 14); }
}
function finishRide(g, b) {
  const a = access(b);
  for (const q of b.riders) {
    q.st = 'walk'; q.target = null; q.last = b; q.rides++; q.path = []; q.pi = 0;
    const t = a.length ? U.choice(a) : GATE; q.tile = t; const [x, y] = tc(t); q.x = x + q.ox; q.y = y + q.oy;
    const fit = q.tol >= b.d.int ? 1 : 0.45;
    q.happy = Math.min(100, q.happy + (b.d.exc * 3 + 6) * fit * (0.6 + b.rel / 250));
    q.nausea += b.d.int * 5;
    if (q.nausea > 55 && Math.random() < 0.35) q.sick = U.rand(1, 4);
    think(q, fit === 1 ? (b.d.exc >= 7 ? '🤩' : '😄') : '😵');
    q.energy = Math.max(0, q.energy - 3);
  }
  b.riders = [];
  b.rel = Math.max(10, b.rel - U.rand(0.8, 2.6));
  if (Math.random() * 100 > b.rel + 55) {
    b.broken = true;
    for (const q of b.queue) { q.st = 'walk'; q.target = null; think(q, '😠'); q.happy -= 6; }
    b.queue = [];
    toast(`🔧 ${b.d.n} 고장! 클릭해서 수리하거나 정비공을 고용하세요`, '#fca5a5');
    g.sfx.hit();
  }
}
function hire(i) {
  const [x, y] = tc(GATE);
  S.staff.push({ k: STAFF[i].k, e: STAFF[i].e, x, y, tile: GATE, path: [], pi: 0, ox: 0, oy: -4, work: 0, task: null, fl: false });
  S.staffN[i]++;
}
function fire(i) {
  const idx = S.staff.findIndex((s) => s.k === STAFF[i].k);
  if (idx >= 0) { const s = S.staff[idx]; if (s.task && s.task.mech === s) s.task.mech = null; S.staff.splice(idx, 1); S.staffN[i]--; }
}
function staffTick(g, s, dt) {
  if (!S.path[s.tile]) { const [x, y] = tc(GATE); s.tile = GATE; s.x = x; s.y = y; s.path = []; s.pi = 0; }
  if (s.work > 0) {
    s.work -= dt;
    if (s.work <= 0) {
      if (s.k === 'jan') { S.litter[s.tile] = 0; S.vom[s.tile] = 0; }
      if (s.k === 'mech' && s.task) { const b = s.task; if (!b.dead) { if (b.broken) toast(`✅ ${b.d.n} 수리 완료`, '#86efac'); b.broken = false; b.rel = Math.min(100, b.rel + 45); } b.mech = null; s.task = null; }
    }
    return;
  }
  if (s.pi < s.path.length) {
    if (!S.path[s.path[s.pi]]) { s.path = []; s.pi = 0; }
    else { walk(s, dt, 52); return; }
  }
  if (s.k === 'jan') {
    if (S.litter[s.tile] || S.vom[s.tile]) { s.work = 0.7; return; }
    const p = route(s.tile, (i) => (S.litter[i] > 0 || S.vom[i] > 0) && !S.staff.some((o) => o !== s && o.k === 'jan' && o.path[o.path.length - 1] === i));
    if (p && p.length < 30) { s.path = p; s.pi = 0; } else wander(s);
  } else if (s.k === 'mech') {
    if (s.task) {
      const b = s.task;
      if (b.dead) { s.task = null; return; }
      if (access(b).indexOf(s.tile) >= 0) { s.work = b.broken ? 3 : 1.5; return; }
      const p = routeTo(s.tile, b); if (p) { s.path = p; s.pi = 0; } else { b.mech = null; s.task = null; wander(s); }
      return;
    }
    const b = S.blds.find((b) => b.type === 'ride' && !b.mech && (b.broken || b.rel < 65) && access(b).length);
    if (b) { b.mech = s; s.task = b; } else wander(s);
  } else wander(s);
}
function calcRating() {
  let hs = 0; for (const q of S.guests) hs += q.happy;
  const avg = S.guests.length ? hs / S.guests.length : 60;
  let lit = 0; for (let i = 0; i < N; i++) lit += S.litter[i] + S.vom[i] * 3;
  let beauty = 0, rides = 0, broken = 0, stalls = 0, types = new Set();
  for (const b of S.blds) { if (b.type === 'deco') beauty += b.d.beauty || 0; if (b.type === 'ride') { rides++; types.add(b.d.k); if (b.broken) broken++; } if (b.type === 'stall') stalls++; }
  S.rating = Math.round(U.clamp(avg * 0.55 + Math.min(18, types.size * 2.2 + rides * 0.6) + Math.min(14, beauty * 0.12) + Math.min(9, stalls * 1.5) - lit * 0.35 - broken * 4, 0, 100));
}
function checkGoal(g) {
  const G = GOALS[S.goal]; if (!G) return;
  if (G.f()) {
    if (S.goal === GOALS.length - 1) { g.score = Math.round(S.income) + 20000; g.save('park', null); g.win(`${S.day}일 만에 최고의 놀이공원 완성! 누적 손님 ${S.admitted}명`); return; }
    S.money += G.r; S.goal++;
    toast(`🏆 목표 달성: ${G.d} (+${G.r}💰)`, '#fde047'); g.sfx.win(); g.burst(480, 300, ['#fde047', '#f472b6', '#60a5fa'], 40, 300);
  }
}
function endDay(g) {
  S.dayT = 0;
  let sal = 0; STAFF.forEach((s, i) => (sal += s.sal * S.staffN[i]));
  let up = 0; for (const b of S.blds) if (b.type !== 'deco') up += b.d.up;
  const rc = RES[S.resLv].c;
  S.money -= sal + up + rc; S.todayOut += sal + up + rc;
  const profit = Math.round(S.todayIn - S.todayOut);
  S.lastProfit = profit; S.hist.push(profit); if (S.hist.length > 10) S.hist.shift();
  toast(`📅 ${S.day}일차 결산: 수입 ${Math.round(S.todayIn)} · 지출 ${Math.round(S.todayOut)} → ${profit >= 0 ? '+' : ''}${profit}`, profit >= 0 ? '#86efac' : '#fca5a5');
  S.todayIn = 0; S.todayOut = 0;
  if (S.unlocked < RIDES.length) {
    S.resP += RES[S.resLv].p;
    const need = 2 + (S.unlocked - 3) * 1.6;
    if (S.resP >= need) { S.resP = 0; const d = RIDES[S.unlocked++]; toast(`🔬 연구 완료! 새 놀이기구 ${d.e} ${d.n} 해금`, '#93c5fd'); g.sfx.power(); }
  }
  if (S.mkt > 0) { S.mkt--; if (!S.mkt) toast('📣 광고 캠페인 종료'); }
  if (S.money < 0) {
    S.debt++;
    toast(`⚠️ 잔고 적자 ${S.debt}/3일 — 계속되면 파산!`, '#f87171'); g.sfx.lose();
    if (S.debt >= 3) { g.save('park', null); g.over(`파산했습니다… ${S.day}일차, 누적 손님 ${S.admitted}명`); return; }
  } else S.debt = 0;
  S.day++;
  savePark();
}

/* ---------- 입력 ---------- */
function uiClick(g) {
  for (let i = S.ui.length - 1; i >= 0; i--) { const b = S.ui[i]; if (g.inRect(b.x, b.y, b.w, b.h)) { b.fn(); g.sfx.click(); return true; } }
  return g.mouse.x >= PX - 4 || g.mouse.y < OY;
}
function dragTool(g) {
  const i = S.hover;
  if (S.tool.kind === 'path') {
    if (S.path[i] || S.occ[i]) return;
    if (S.money < 10) { if (S.g.frame % 30 === 0) toast('💰 돈이 부족해요', '#fca5a5'); return; }
    S.path[i] = 1; S.money -= 10; S.todayOut += 10; S.pathVer++; g.sfx.tone(300, 0.03, 'triangle', 0.04);
  } else {
    const b = S.occ[i];
    if (b) { if (b.type !== 'deco' || g.mouse.clicked) { removeB(b, b.type !== 'deco'); g.sfx.explode(); const [x, y] = tc(i); g.burst(x, y, '#a3a3a3', 10, 150); } else { removeB(b, false); g.sfx.drop(); } }
    else if (S.path[i] && i !== GATE) { S.path[i] = 0; S.litter[i] = 0; S.vom[i] = 0; S.pathVer++; g.sfx.drop(); }
  }
}
function mapClick(g) {
  const i = S.hover, r = (i / COLS) | 0, c = i % COLS, t = S.tool;
  if (t.kind === 'sel') { S.sel = S.occ[i] && S.occ[i].type !== 'deco' ? S.occ[i] : null; return; }
  if (t.kind === 'ride' || t.kind === 'stall' || t.kind === 'deco') {
    const w = t.d.w || 1, h = t.d.h || 1, r0 = r - ((h - 1) >> 1), c0 = c - ((w - 1) >> 1);
    if (S.money < t.d.cost) { toast('💰 돈이 부족해요', '#fca5a5'); g.sfx.hit(); return; }
    if (!canPlace(t, r0, c0)) { g.sfx.hit(); return; }
    const b = place(t, r0, c0, false);
    g.sfx.drop(); const [x, y] = tc(r0 * COLS + c0); g.burst(x + (w - 1) * TS / 2, y + (h - 1) * TS / 2, ['#fde047', '#fff'], 14, 160);
    if (t.kind !== 'deco' && !access(b).length) toast('⚠️ 길과 연결되지 않았어요! 입구 쪽 길에 붙여 주세요', '#fcd34d');
  }
}

/* ---------- 그리기 ---------- */
function B(g, x, y, w, h, label, col, fn, o) {
  o = o || {};
  const hov = !o.dis && g.inRect(x, y, w, h);
  g.rrect(x, y, w, h, 7, o.dis ? '#1f2530' : o.on ? '#b45309' : hov ? '#3b4a63' : col || '#26324a', o.on ? '#fde68a' : 'rgba(255,255,255,.15)', 1.5);
  if (label) g.text(label, x + w / 2, y + h / 2 + 1, o.size || 14, o.dis ? '#5b6472' : '#fff');
  if (!o.dis && fn) S.ui.push({ x, y, w, h, fn });
}
function drawMap(g, c) {
  g.rect(OX, OY, COLS * TS, ROWS * TS, '#3f7d2c');
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
    const i = r * COLS + col, x = OX + col * TS, y = OY + r * TS;
    if ((r + col) % 2) g.rect(x, y, TS, TS, '#468a31');
    if (S.path[i]) {
      g.rect(x, y, TS, TS, '#b9a07a'); g.rect(x + 2, y + 2, TS - 4, TS - 4, '#d8c39b');
      if (S.litter[i]) for (let k = 0; k < Math.min(5, S.litter[i]); k++) g.rect(x + 5 + ((k * 7 + i) % 20), y + 6 + ((k * 11 + i * 3) % 18), 4, 3, ['#ef4444', '#fff', '#3b82f6'][k % 3]);
      if (S.vom[i]) g.circle(x + 16, y + 18, 5 + S.vom[i] * 2, '#a3b14a');
    }
  }
  const [gx, gy] = tc(GATE);
  g.rrect(gx - 30, gy - 14, 60, 16, 4, '#dc2626'); g.text('🎪 입구', gx, gy - 6, 11, '#fff');
  for (const b of S.blds) drawB(g, c, b);
  // 미리보기
  if (S.hover >= 0) {
    const r = (S.hover / COLS) | 0, col = S.hover % COLS, t = S.tool;
    if (t.d) {
      const w = t.d.w || 1, h = t.d.h || 1, r0 = r - ((h - 1) >> 1), c0 = col - ((w - 1) >> 1), ok = canPlace(t, r0, c0) && S.money >= t.d.cost;
      c.globalAlpha = 0.45; g.rect(OX + c0 * TS, OY + r0 * TS, w * TS, h * TS, ok ? '#22c55e' : '#ef4444'); g.emoji(t.d.e, OX + (c0 + w / 2) * TS, OY + (r0 + h / 2) * TS, Math.min(w, h) * TS * 0.75); c.globalAlpha = 1;
    } else if (t.kind !== 'sel') g.stroke(OX + col * TS, OY + r * TS, TS, TS, t.kind === 'demo' ? '#ef4444' : '#fde047', 2);
    else if (S.occ[S.hover] && S.occ[S.hover].type !== 'deco') { const b = S.occ[S.hover]; g.stroke(OX + b.c * TS, OY + b.r * TS, b.w * TS, b.h * TS, '#fff', 2); }
  }
  if (S.sel && !S.sel.dead) { const b = S.sel; g.stroke(OX + b.c * TS - 2, OY + b.r * TS - 2, b.w * TS + 4, b.h * TS + 4, '#fde047', 3); }
  for (const s of S.staff) { g.emoji(s.e, s.x, s.y - 4, 18); if (s.work > 0) g.emoji(s.k === 'jan' ? '✨' : '🛠️', s.x + 8, s.y - 16, 12); }
  for (const q of S.guests) {
    if (q.st === 'ride') continue;
    const bob = q.st === 'walk' && q.pi < q.path.length ? Math.abs(Math.sin(g.time * 10 + q.ox)) * 2 : 0;
    if (q.balloon) { g.line(q.x + 5, q.y - 6, q.x + 7, q.y - 18, '#ddd', 1); g.emoji('🎈', q.x + 7, q.y - 22, 11); }
    g.emoji(q.e, q.x, q.y - 4 - bob, 16);
    if (q.thT > 0 && q.th) { g.circle(q.x + 9, q.y - 20, 8, 'rgba(255,255,255,.85)'); g.emoji(q.th, q.x + 9, q.y - 20, 11); }
  }
  // 낮/밤
  const t = S.dayT / DAYLEN, dark = t > 0.78 ? (t - 0.78) / 0.22 * 0.42 : 0;
  if (dark > 0) {
    c.fillStyle = `rgba(10,15,50,${dark})`; c.fillRect(OX, OY, COLS * TS, ROWS * TS);
    c.globalAlpha = dark * 1.6;
    for (const b of S.blds) if (b.d.k === 'lamp' || (b.type === 'ride' && b.run > 0)) { const [x, y] = tc(b.r * COLS + b.c); g.circle(x + (b.w - 1) * TS / 2, y + (b.h - 1) * TS / 2, b.d.k === 'lamp' ? 34 : 20 + b.w * 8, 'rgba(253,224,71,.18)'); }
    c.globalAlpha = 1;
  }
  // 토스트
  let ty = OY + ROWS * TS - 18;
  for (let k = S.toasts.length - 1; k >= 0; k--) {
    const o = S.toasts[k]; c.globalAlpha = Math.min(1, o.t);
    c.font = 'bold 13px sans-serif'; const w = c.measureText(o.s).width + 20;
    g.rrect(OX + 8, ty - 11, w, 22, 6, 'rgba(0,0,0,.7)'); g.text(o.s, OX + 18, ty, 13, o.col, 'left'); ty -= 26;
  }
  c.globalAlpha = 1;
  if (S.paused) { g.rrect(OX + COLS * TS / 2 - 70, OY + 10, 140, 30, 8, 'rgba(0,0,0,.6)'); g.text('⏸ 일시정지', OX + COLS * TS / 2, OY + 25, 16, '#fde047'); }
}
function drawB(g, c, b) {
  const x = OX + b.c * TS, y = OY + b.r * TS, w = b.w * TS, h = b.h * TS, cx = x + w / 2, cy = y + h / 2;
  if (b.type === 'deco') {
    if (b.d.k === 'fountain') { g.circle(cx, cy, 13, '#38bdf8'); g.circle(cx, cy - 4 + Math.sin(g.time * 6) * 2, 4, '#e0f2fe'); }
    g.emoji(b.d.e, cx, cy, b.d.k === 'flower' ? 22 : 26); return;
  }
  if (b.type === 'stall') {
    g.rrect(x + 2, y + 4, w - 4, h - 6, 4, '#fef3c7', '#92400e', 1.5);
    for (let k = 0; k < 4; k++) g.rect(x + 2 + k * 7, y + 2, 7, 6, k % 2 ? '#ef4444' : '#fff');
    g.emoji(b.d.e, cx, cy + 3, 20);
    if (!b.open) g.emoji('⛔', x + 26, y + 6, 12);
    return;
  }
  g.rrect(x + 2, y + 2, w - 4, h - 4, 8, b.d.col, b.broken ? '#ef4444' : 'rgba(0,0,0,.4)', 2);
  c.save(); c.globalAlpha = 0.25; g.rrect(x + 6, y + 6, w - 12, h - 12, 6, '#fff'); c.restore();
  const sz = Math.min(w, h) * 0.78, run = b.run > 0, t = b.anim;
  c.save(); c.translate(cx, cy);
  if (run) {
    const an = b.d.an;
    if (an === 'spin') c.rotate(t * 2.5);
    else if (an === 'swing') c.rotate(Math.sin(t * 3) * 0.6);
    else if (an === 'drop') c.translate(0, Math.abs(Math.sin(t * 1.6)) * -h * 0.25);
    else if (an === 'shake') c.translate(Math.sin(t * 23) * 3, Math.cos(t * 17) * 2);
    else if (an === 'slide') c.translate(Math.sin(t * 1.5) * (w * 0.25), 0);
    else c.translate(0, Math.sin(t * 6) * 3);
  }
  g.emoji(b.d.e, 0, 0, sz);
  c.restore();
  if (b.broken) { g.emoji('🔧', x + w - 12, y + 12, 18 + Math.sin(g.time * 8) * 3); if (g.frame % 20 === 0) g.burst(cx, y + 6, '#9ca3af', 2, 30, 0.8, 4); }
  if (!b.open) g.emoji('⛔', x + 12, y + 12, 16);
  if (b.queue.length) { g.rrect(x + 2, y + h - 16, 34, 14, 4, 'rgba(0,0,0,.65)'); g.text('👥' + b.queue.length, x + 19, y + h - 9, 10, '#fff'); }
  if (b.rel < 60 && !b.broken) g.rect(x + 4, y + 3, (w - 8) * b.rel / 100, 3, b.rel < 35 ? '#ef4444' : '#f59e0b');
}
function drawTop(g) {
  g.rect(0, 0, 960, 48, '#13222f'); g.rect(0, 47, 960, 1, '#2d4a5f');
  g.text('💰 ' + Math.floor(S.money).toLocaleString(), 14, 16, 18, S.money < 0 ? '#f87171' : '#fde047', 'left');
  g.text('👥 ' + S.guests.length + '명 (누적 ' + S.admitted + ')', 14, 36, 12, '#cbd5e1', 'left');
  g.text('⭐ 평점', 200, 16, 13, '#e2e8f0', 'left');
  g.rrect(250, 9, 110, 14, 5, '#1e293b'); g.rrect(250, 9, 110 * S.rating / 100, 14, 5, S.rating >= 70 ? '#22c55e' : S.rating >= 45 ? '#eab308' : '#ef4444'); g.text(S.rating, 305, 16, 11, '#fff');
  g.text(`📅 ${S.day}일차`, 200, 36, 13, '#e2e8f0', 'left');
  g.rrect(275, 31, 85, 10, 4, '#1e293b'); g.rrect(275, 31, 85 * S.dayT / DAYLEN, 10, 4, '#60a5fa');
  const G = GOALS[S.goal];
  g.text('🎯 목표 ' + (S.goal + 1) + '/' + GOALS.length, 378, 16, 12, '#fcd34d', 'left');
  g.text(G ? G.d + (G.r ? ` (+${G.r})` : ' → 승리!') : '', 378, 34, 13, '#fff', 'left');
  B(g, 600, 10, 34, 28, '⏸', '#26324a', () => (S.paused = !S.paused), { on: S.paused, size: 13 });
  [1, 2, 3].forEach((s, k) => B(g, 638 + k * 38, 10, 34, 28, '▶'.repeat(s), '#26324a', () => { S.speed = s; S.paused = false; }, { on: !S.paused && S.speed === s, size: 10 }));
  if (S.mkt > 0) g.text('📣 광고 ' + S.mkt + '일', 760, 24, 12, '#f9a8d4', 'left');
  g.text(S.hist.length ? '어제 ' + (S.lastProfit >= 0 ? '+' : '') + S.lastProfit : '', 950, 24, 12, S.lastProfit >= 0 ? '#86efac' : '#fca5a5', 'right');
}
function drawPanel(g) {
  g.rect(PX - 4, OY, 960 - PX + 4, 600 - OY, '#111c27');
  B(g, PX, OY + 4, 112, 28, '🏗️ 건설', '#1e2a3d', () => (S.tab = 0), { on: S.tab === 0 });
  B(g, PX + 116, OY + 4, 112, 28, '📋 관리', '#1e2a3d', () => (S.tab = 1), { on: S.tab === 1 });
  if (S.tab === 0) {
    TOOLS.forEach((t, i) => {
      const x = PX + (i % 4) * 57, y = OY + 38 + Math.floor(i / 4) * 47;
      const locked = t.kind === 'ride' && RIDES.indexOf(t.d) >= S.unlocked;
      B(g, x, y, 53, 43, '', '#1e2a3d', () => { S.tool = t; S.sel = null; }, { on: S.tool === t, dis: locked });
      g.emoji(locked ? '🔒' : t.e, x + 26, y + 17, 22);
      if (t.cost && !locked) g.text(t.cost, x + 26, y + 36, 10, S.money >= t.cost ? '#fde047' : '#f87171');
    });
    const iy = OY + 38 + 7 * 47 + 2;
    g.rrect(PX, iy, 228, 600 - iy - 6, 8, '#1a2636');
    if (S.sel && !S.sel.dead) drawInspect(g, S.sel, iy);
    else {
      const t = S.tool, d = t.d;
      g.text(t.e + ' ' + t.n, PX + 10, iy + 16, 15, '#fff', 'left');
      const L = [];
      if (t.kind === 'sel') L.push('건물을 클릭하면 정보·요금 조정', '우클릭/Q: 언제든 선택 도구로');
      if (t.kind === 'path') L.push('드래그해서 길 깔기 (칸당 10)', '모든 시설은 길과 이어져야 해요');
      if (t.kind === 'demo') L.push('드래그로 길/장식 철거', '건물 철거 시 50% 환불');
      if (t.kind === 'ride') L.push(`크기 ${d.w}×${d.h} · 정원 ${d.cap}명 · ${d.dur}초`, `재미 ${'★'.repeat(Math.ceil(d.exc / 2))} · 강도 ${d.int}/9`, `유지비 ${d.up}/일 · 기본요금 ${d.price}`);
      if (t.kind === 'stall') L.push(d.need === 'cash' ? '손님이 현금을 인출해요' : d.need === 'gift' ? '풍선을 사면 행복도 +' : d.need === 'toilet' ? '급한 손님의 구세주' : '배고픔/목마름 해결', `유지비 ${d.up}/일 · 기본가 ${d.price}`, d.lit ? '쓰레기가 생겨요 → 쓰레기통!' : '');
      if (t.kind === 'deco') L.push(d.bin ? '주변 3칸 쓰레기를 막아줘요' : d.bench ? '지친 손님이 쉬어가요' : `주변 길의 아름다움 +${d.beauty}`, '평점과 행복도에 도움');
      L.forEach((s, k) => g.text(s, PX + 10, iy + 40 + k * 18, 12, '#cbd5e1', 'left'));
    }
  } else drawManage(g);
}
function drawInspect(g, b, iy) {
  const d = b.d, x = PX + 10;
  g.text(d.e + ' ' + d.n, x, iy + 14, 15, '#fff', 'left');
  g.text(b.broken ? '🔴 고장' : !b.open ? '⛔ 중지' : b.run > 0 ? '🟢 운행 중' : '🟡 대기', PX + 218, iy + 14, 12, '#fff', 'right');
  if (b.type === 'ride') {
    g.text(`대기 ${b.queue.length}명 · 누적 ${b.total}명 · 신뢰도 ${Math.round(b.rel)}%`, x, iy + 34, 11, '#cbd5e1', 'left');
  } else g.text(`판매 ${b.total}회`, x, iy + 34, 11, '#cbd5e1', 'left');
  g.text(`총 수입 ${b.inc} · 유지비 ${d.up}/일`, x, iy + 50, 11, '#cbd5e1', 'left');
  g.text('요금', x, iy + 72, 13, '#fff', 'left');
  B(g, PX + 50, iy + 60, 30, 24, '−', '#334155', () => (b.price = Math.max(0, b.price - 1)));
  g.text(b.price, PX + 100, iy + 72, 16, '#fde047');
  B(g, PX + 120, iy + 60, 30, 24, '+', '#334155', () => (b.price = Math.min(30, b.price + 1)));
  if (b.type === 'ride') g.text(b.price > (d.exc * 1.4 + 2) * 1.7 ? '비쌈!' : b.price > d.exc * 1.4 + 2 ? '약간 비쌈' : '적당', PX + 160, iy + 72, 11, '#94a3b8', 'left');
  const by = iy + 92;
  if (b.type === 'ride') B(g, x, by, 66, 26, b.broken ? '수리 150' : '점검 60', b.broken ? '#b91c1c' : '#334155', () => {
    const cost = b.broken ? 150 : 60; if (S.money < cost) return toast('💰 돈이 부족해요', '#fca5a5');
    S.money -= cost; S.todayOut += cost; b.broken = false; b.rel = 100; S.g.sfx.power();
  }, { size: 12 });
  B(g, x + 70, by, 66, 26, b.open ? '운영 중지' : '운영 재개', '#334155', () => { b.open = !b.open; if (!b.open) { for (const q of b.queue) { q.st = 'walk'; q.target = null; } b.queue = []; } }, { size: 12 });
  B(g, x + 140, by, 68, 26, '철거', '#7f1d1d', () => { removeB(b, true); S.g.sfx.explode(); }, { size: 12 });
}
function drawManage(g) {
  const x = PX + 8; let y = OY + 48;
  g.text('🎟️ 입장료', x, y, 14, '#fff', 'left');
  B(g, PX + 100, y - 12, 28, 24, '−', '#334155', () => (S.fee = Math.max(0, S.fee - 1)));
  g.text(S.fee, PX + 148, y, 16, '#fde047');
  B(g, PX + 168, y - 12, 28, 24, '+', '#334155', () => (S.fee = Math.min(60, S.fee + 1)));
  y += 20; g.text(`적정 입장료 약 ${Math.round(parkValue())}`, x, y, 11, '#94a3b8', 'left');
  y += 24;
  B(g, x, y - 12, 212, 28, S.mkt > 0 ? `📣 광고 중 (${S.mkt}일 남음)` : '📣 광고 캠페인 (500 · 3일)', '#4c1d95', () => {
    if (S.money < 500) return toast('💰 돈이 부족해요', '#fca5a5');
    S.money -= 500; S.todayOut += 500; S.mkt = 3; toast('📣 광고 시작! 3일간 손님 증가', '#f9a8d4');
  }, { dis: S.mkt > 0, size: 13 });
  y += 30; g.text('🔬 연구 투자 (일일 비용)', x, y, 13, '#fff', 'left'); y += 18;
  RES.forEach((r, i) => B(g, x + i * 54, y - 10, 50, 22, r.c ? r.c + '' : '0', '#1e3a5f', () => (S.resLv = i), { on: S.resLv === i, size: 11 }));
  y += 22;
  if (S.unlocked < RIDES.length) {
    const need = 2 + (S.unlocked - 3) * 1.6, nd = RIDES[S.unlocked];
    g.rrect(x, y - 6, 212, 12, 4, '#1e293b'); g.rrect(x, y - 6, 212 * Math.min(1, S.resP / need), 12, 4, '#3b82f6');
    g.text(`다음: ${nd.e} ${nd.n}`, x + 106, y, 10, '#fff');
  } else g.text('모든 놀이기구 해금 완료!', x, y, 11, '#86efac', 'left');
  y += 22; g.text('👷 직원 (일일 급여)', x, y, 13, '#fff', 'left'); y += 6;
  STAFF.forEach((s, i) => {
    y += 26;
    g.text(`${s.e} ${s.n} ${S.staffN[i]}명`, x, y, 13, '#e2e8f0', 'left'); g.text(s.sal + '/일', x + 110, y, 11, '#94a3b8', 'left');
    B(g, PX + 160, y - 11, 28, 22, '−', '#334155', () => fire(i), { dis: !S.staffN[i] });
    B(g, PX + 192, y - 11, 28, 22, '+', '#334155', () => { if (S.staff.length < 20) hire(i); });
  });
  y += 26; g.text('📊 일일 순이익', x, y, 13, '#fff', 'left'); y += 10;
  const mx = Math.max(100, ...S.hist.map((v) => Math.abs(v)));
  g.rect(x, y + 30, 212, 1, '#475569');
  S.hist.forEach((v, i) => { const h = (Math.abs(v) / mx) * 28; g.rect(x + 2 + i * 21, v >= 0 ? y + 30 - h : y + 30, 17, h, v >= 0 ? '#22c55e' : '#ef4444'); });
  y += 72;
  B(g, x, Math.min(y, 566), 212, 26, S.confirm > 0 ? '정말? 한 번 더 클릭' : '🗑️ 새 공원 시작 (저장 삭제)', '#3f1d1d', () => {
    if (S.confirm > 0) { S.g.save('park', null); const g2 = S.g; newPark(); S.g = g2; toast('🎪 새 공원을 시작합니다'); } else { S.confirm = 1; S.g.later(() => { if (S) S.confirm = 0; }, 3); }
  }, { size: 12 });
}
