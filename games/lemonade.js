let S;
const DAYS = 30, GOALM = 300000, DAYLEN = 42;
const WX = [
  { k: 'heat', n: '폭염', e: '🔥', t: [34, 38], base: 72, sky: ['#fb923c', '#fde68a'] },
  { k: 'sun', n: '맑음', e: '☀️', t: [27, 33], base: 60, sky: ['#38bdf8', '#bae6fd'] },
  { k: 'part', n: '구름 조금', e: '🌤️', t: [22, 27], base: 46, sky: ['#60a5fa', '#dbeafe'] },
  { k: 'cloud', n: '흐림', e: '☁️', t: [17, 22], base: 30, sky: ['#94a3b8', '#e2e8f0'] },
  { k: 'rain', n: '비', e: '🌧️', t: [13, 18], base: 15, sky: ['#475569', '#94a3b8'] },
];
const ITEMS = [
  { k: 'lemon', n: '레몬', e: '🍋', packs: [[12, 2400], [30, 5600], [80, 13600]] },
  { k: 'sugar', n: '설탕(컵)', e: '🍬', packs: [[10, 1000], [30, 2600], [80, 6200]] },
  { k: 'ice', n: '얼음', e: '🧊', packs: [[100, 1000], [250, 2200], [600, 4800]] },
  { k: 'cup', n: '종이컵', e: '🥤', packs: [[50, 1000], [150, 2600], [400, 6000]] },
];
const UPS = [
  { k: 'juicer', n: '착즙기', e: '🧃', cost: 15000, d: '피처당 8컵 → 12컵' },
  { k: 'icebox', n: '아이스박스', e: '🧊', cost: 10000, d: '밤새 얼음 60% 보존' },
  { k: 'fridge', n: '냉장고', e: '❄️', cost: 12000, d: '레몬 보관 4일 → 10일' },
  { k: 'parasol', n: '파라솔', e: '⛱️', cost: 8000, d: '맑은 날 손님 +20%, 비 피해 감소' },
  { k: 'radio', n: '라디오', e: '📻', cost: 6000, d: '줄 서는 인내심 +70%' },
  { k: 'staff', n: '알바생 고용', e: '🧑‍🍳', cost: 15000, d: '판매 속도 2배 (일당 3,000원)' },
  { k: 'sign', n: '네온 간판', e: '🪧', cost: 22000, d: '지나가던 손님 관심 +30%' },
  { k: 'truck', n: '푸드트럭', e: '🚚', cost: 90000, d: '번화가 진출! 유동 인구 +70%' },
];
const PEOPLE = ['🧑', '👩', '👨', '🧒', '👧', '👦', '👵', '👴', '🧑‍💼', '👩‍🦰', '🧔', '👱'];
const EVENTS = [
  { t: '🎉 근처에서 축제가 열려요! 손님 +50%', f: (d) => { d.mult *= 1.5; } },
  { t: '🚧 도로 공사로 유동 인구 -30%', f: (d) => { d.mult *= 0.7; } },
  { t: '🐜 개미가 설탕 4컵을 먹어버렸어요!', f: () => { S.inv.sugar = Math.max(0, S.inv.sugar - 4); } },
  { t: '📺 지역 방송에 소개! 인기 +8', f: () => { S.pop = Math.min(100, S.pop + 8); } },
  { t: '🍋 레몬 풍작! 레몬 가격 -30%', f: () => { S.prices.lemon *= 0.7; } },
  { t: '🍋 레몬 흉작… 레몬 가격 +40%', f: () => { S.prices.lemon *= 1.4; } },
  { t: '🏃 마라톤 대회 코스! 목마른 손님 +40%', f: (d) => { d.mult *= 1.4; d.thirst = 1.2; } },
  { t: '🥤 길 건너에 경쟁 가게 등장 (손님 -20%)', f: (d) => { d.mult *= 0.8; } },
];
GAME({
  title: '레모네이드 가게', w: 960, h: 600, bg: '#fef9c3', controls: 'none',
  help: '아침: 재료를 사고 레시피(레몬·설탕·얼음)와 가격을 정하기\n더운 날엔 얼음을 많이, 손님 반응(😋/🤢)과 한마디를 보고 조정!\n장사 중에도 가격 조정 가능 · Space 배속 · 레몬은 며칠 지나면 상해요\n업그레이드: 착즙기·아이스박스·냉장고·파라솔·알바생·간판·푸드트럭\n30일 동안 30만원을 모으면 성공! (매일 자동 저장)',
  init(g) {
    S = null;
    const sv = g.load('run', null);
    if (sv && sv.v === 3) S = Object.assign(sv, { phase: 'prep', walkers: [], drops: [] });
    if (!S) newGame();
    S.g = g; S.tab = 0;
    if (!S.fc) morning();
    g.score = Math.max(0, Math.floor(S.money));
  },
  update(g, dt) {
    S.g = g;
    if (S.phase === 'prep') prepInput(g);
    else if (S.phase === 'sell') sellUpdate(g, dt);
    else if (S.phase === 'report') { if (g.mouse.clicked && g.inRect(380, 520, 200, 50) || g.keyp('Enter') || g.keyp('Space')) nextDay(g); }
    g.score = Math.max(0, Math.floor(S.money));
    g.info = `${S.day}/${DAYS}일 · 💰${won(S.money)} · 인기 ${Math.round(S.pop)}`;
  },
  draw(g, c) {
    if (S.phase === 'prep') drawPrep(g, c);
    else { drawStreet(g, c); if (S.phase === 'report') drawReport(g); }
  },
});
function won(n) { return Math.round(n).toLocaleString() + '원'; }
function newGame() {
  S = { v: 3, day: 1, money: 20000, pop: 10, inv: { lemon: [], sugar: 0, ice: 0, cup: 0 }, rec: { l: 4, s: 4, i: 3, p: 1000 }, up: {}, prices: {}, ad: 0, fc: null, log: [], hist: [], phase: 'prep', walkers: [], drops: [], total: 0 };
}
function lemons() { return S.inv.lemon.reduce((a, b) => a + b.n, 0); }
function useLemons(n) { while (n > 0 && S.inv.lemon.length) { const b = S.inv.lemon[0], k = Math.min(n, b.n); b.n -= k; n -= k; if (!b.n) S.inv.lemon.shift(); } }
function morning() {
  const r = Math.random(), wi = r < 0.1 ? 0 : r < 0.36 ? 1 : r < 0.62 ? 2 : r < 0.84 ? 3 : 4;
  S.fc = wi;
  let ai = wi; if (Math.random() < 0.22) ai = U.clamp(wi + (Math.random() < 0.5 ? -1 : 1), 0, 4);
  S.actual = ai; S.temp = U.randi(WX[ai].t[0], WX[ai].t[1]);
  for (const it of ITEMS) S.prices[it.k] = U.rand(0.85, 1.2);
  S.ev = null; S.dmod = { mult: 1, thirst: 1 };
  if (S.day > 1 && Math.random() < 0.35) { const e = U.choice(EVENTS); S.ev = e.t; e.f(S.dmod); }
  S.ad = 0;
}
function packCost(it, j) { return Math.round(it.packs[j][1] * S.prices[it.k] / 100) * 100; }
function cupsPer() { return S.up.juicer ? 12 : 8; }
function unitCost() {
  const L = 13600 / 80 * S.prices.lemon, SU = 6200 / 80 * S.prices.sugar, I = 4800 / 600 * S.prices.ice, C = 6000 / 400 * S.prices.cup;
  return Math.round((S.rec.l * L + S.rec.s * SU) / cupsPer() + S.rec.i * I + C);
}
/* ---------- 아침 준비 ---------- */
const RECR = [['l', '🍋 레몬 / 피처', 1, 10, 1], ['s', '🍬 설탕 / 피처', 0, 10, 1], ['i', '🧊 얼음 / 컵', 0, 8, 1], ['p', '💵 가격 / 컵', 100, 6000, 100]];
function prepInput(g) {
  const m = g.mouse;
  if (g.keyp('Enter')) { startDay(g); return; }
  if (!m.clicked) return;
  // 시장
  ITEMS.forEach((it, i) => it.packs.forEach((p, j) => {
    if (!g.inRect(130 + j * 92, 118 + i * 74, 86, 46)) return;
    const cost = packCost(it, j);
    if (S.money < cost) { g.float(240, 118 + i * 74, '돈이 부족해요', '#dc2626', 18); g.sfx.beep(160, 0.12); return; }
    S.money -= cost;
    if (it.k === 'lemon') S.inv.lemon.push({ n: p[0], d: 0 }); else S.inv[it.k] += p[0];
    g.sfx.coin(); g.burst(173 + j * 92, 140 + i * 74, ['#facc15', '#fff'], 10, 120, 0.4);
  }));
  // 레시피
  RECR.forEach(([k, , lo, hi, st], i) => {
    const y = 128 + i * 62;
    if (g.inRect(438, y, 40, 40)) { S.rec[k] = Math.max(lo, S.rec[k] - st * (k === 'p' && S.rec.p > 2000 ? 5 : 1)); g.sfx.click(); }
    if (g.inRect(578, y, 40, 40)) { S.rec[k] = Math.min(hi, S.rec[k] + st * (k === 'p' && S.rec.p >= 2000 ? 5 : 1)); g.sfx.click(); }
  });
  // 광고
  [[0, '없음', 0], [1, '전단지', 1500], [2, 'SNS 광고', 6000]].forEach(([k, , c], i) => { if (g.inRect(420 + i * 74, 434, 68, 40)) { S.ad = k; g.sfx.click(); void c; } });
  // 업그레이드
  UPS.forEach((u, i) => {
    if (!g.inRect(660, 112 + i * 52, 288, 46)) return;
    if (S.up[u.k]) return;
    if (S.money < u.cost) { g.float(800, 128 + i * 52, '돈이 부족해요', '#dc2626', 16); g.sfx.beep(160, 0.12); return; }
    S.money -= u.cost; S.up[u.k] = true; g.sfx.power(); g.burst(800, 135 + i * 52, ['#facc15', '#22c55e', '#fff'], 26, 220, 0.7);
  });
  if (g.inRect(380, 510, 200, 60)) startDay(g);
  if (g.inRect(20, 540, 120, 40)) { if (S.confirmNew) { g.save('run', null); newGame(); S.g = g; morning(); g.sfx.drop(); } else { S.confirmNew = 1; g.later(() => (S.confirmNew = 0), 2.5); } }
}
function adCost() { return [0, 1500, 6000][S.ad]; }
function startDay(g) {
  if (lemons() < S.rec.l || S.inv.sugar < S.rec.s || S.inv.cup < 1 || S.inv.ice < S.rec.i) { if (!S.warned) { S.warned = 1; g.float(480, 490, '⚠️ 재료가 부족해요! 그래도 시작하려면 한 번 더', '#dc2626', 18); g.sfx.beep(200, 0.12); g.later(() => (S.warned = 0), 3); return; } }
  S.warned = 0;
  const ac = adCost() + (S.up.staff ? 3000 : 0);
  if (S.money < ac) { g.float(480, 490, '광고비/일당이 부족해요', '#dc2626', 18); g.sfx.beep(160, 0.12); S.ad = 0; return; }
  S.money -= ac;
  const W = WX[S.actual];
  let traffic = W.base * (0.6 + S.pop / 60) * S.dmod.mult;
  if (S.up.parasol && S.actual <= 1) traffic *= 1.2;
  if (S.up.truck) traffic *= 1.7;
  traffic *= [1, 1.2, 1.5][S.ad];
  S.phase = 'sell'; S.clock = 0; S.spd = 1;
  S.d = { traffic, spawnAcc: 0, sold: 0, rev: 0, seen: 0, came: 0, happy: 0, meh: 0, bad: 0, cm: {}, startMoney: S.money + ac, ac, pitcher: 0, served: 0, soldOut: '' };
  S.walkers = []; S.drops = []; S.queue = []; S.serveT = 0;
  g.sfx.power();
}
/* ---------- 장사 ---------- */
function sellUpdate(g, dt) {
  const m = g.mouse;
  if (g.keyp('Space') || (m.clicked && g.inRect(860, 12, 88, 34))) { S.spd = S.spd === 1 ? 3 : 1; g.sfx.click(); }
  if (m.clicked && g.inRect(700, 548, 40, 40)) { S.rec.p = Math.max(100, S.rec.p - 100); g.sfx.click(); }
  if (m.clicked && g.inRect(840, 548, 40, 40)) { S.rec.p = Math.min(6000, S.rec.p + 100); g.sfx.click(); }
  if (g.pressed('left')) S.rec.p = Math.max(100, S.rec.p - 100);
  if (g.pressed('right')) S.rec.p = Math.min(6000, S.rec.p + 100);
  const steps = S.spd;
  for (let k = 0; k < steps; k++) simStep(g, dt);
}
function simStep(g, dt) {
  const d = S.d, W = WX[S.actual];
  S.clock += dt;
  if (S.clock < DAYLEN) {
    d.spawnAcc += dt * d.traffic / DAYLEN * (1 + 0.4 * Math.sin(S.clock / DAYLEN * Math.PI));
    while (d.spawnAcc >= 1) { d.spawnAcc--; spawnWalker(); }
  }
  // 비
  if (S.actual === 4 && Math.random() < 0.8) S.drops.push({ x: U.rand(0, 960), y: -10, v: U.rand(500, 700) });
  for (const r of S.drops) r.y += r.v * dt;
  S.drops = S.drops.filter((r) => r.y < 440);
  const front = 480, qx = (i) => front - 60 - i * 34;
  for (const w of S.walkers) {
    w.bub = Math.max(0, w.bub - dt);
    if (w.st === 'walk') {
      w.x += w.vx * dt;
      if (w.want && Math.abs(w.x - 470) < 70 && S.queue.length < 8) { w.st = 'queue'; S.queue.push(w); d.came++; }
      else if (w.want && S.queue.length >= 8 && Math.abs(w.x - front) < 40 && !w.told) { w.told = 1; w.want = false; say(w, '😩', '줄이 너무 길어요'); }
    } else if (w.st === 'queue') {
      const i = S.queue.indexOf(w), tx = qx(i);
      w.x += U.clamp(tx - w.x, -90 * dt, 90 * dt);
      w.pat -= dt;
      if (w.pat <= 0 && i > 0) { S.queue.splice(i, 1); w.st = 'walk'; w.want = false; say(w, '😤', '너무 오래 기다려요'); w.vx = 80; }
    } else if (w.st === 'leave') { w.x += w.vx * dt; }
  }
  // 판매
  if (S.queue.length && Math.abs(S.queue[0].x - qx(0)) < 4) {
    S.serveT += dt;
    const need = S.up.staff ? 0.6 : 1.25;
    if (S.serveT >= need) { S.serveT = 0; serve(g, S.queue.shift()); }
  } else S.serveT = 0;
  S.walkers = S.walkers.filter((w) => w.x > -60 && w.x < 1020);
  if (S.clock >= DAYLEN && !S.walkers.some((w) => w.st === 'queue')) endDay(g);
  else if (S.clock >= DAYLEN + 6) { for (const w of S.queue) { w.st = 'leave'; w.vx = 90; } S.queue = []; endDay(g); }
  void W;
}
function spawnWalker() {
  const W = WX[S.actual], dir = Math.random() < 0.5 ? 1 : -1;
  S.d.seen++;
  let interest = 0.35 + S.pop / 220 + (S.temp - 20) * 0.012;
  if (S.up.sign) interest += 0.12;
  if (S.actual === 4 && !S.up.parasol) interest -= 0.12;
  const want = Math.random() < U.clamp(interest, 0.05, 0.92) && S.clock < DAYLEN;
  S.walkers.push({
    x: dir > 0 ? -40 : 1000, vx: dir * U.rand(60, 95), e: U.choice(PEOPLE), want, st: 'walk', bub: 0, txt: '', em: '',
    pat: (9 + Math.random() * 5) * (S.up.radio ? 1.7 : 1), max: U.rand(0.7, 1.4) * (550 + Math.max(0, S.temp - 12) * 62) * (0.8 + S.pop / 220) * S.dmod.thirst * (S.up.truck ? 1.15 : 1),
    il: U.rand(3, 5.5), is: U.rand(2.8, 5.5), ii: U.clamp((S.temp - 12) / 4.5, 0, 6) + U.rand(-1, 1), bob: Math.random() * 6,
  });
  void W;
}
function say(w, em, txt) { w.em = em; w.txt = txt; w.bub = 2.2; if (txt) S.d.cm[txt] = (S.d.cm[txt] || 0) + 1; }
function serve(g, w) {
  const d = S.d, r = S.rec;
  w.st = 'leave'; w.vx = (w.vx > 0 ? 1 : -1) * 85 || 85;
  if (r.p > w.max) { say(w, '💸', '너무 비싸요'); g.sfx.tone(200, 0.1, 'triangle', 0.04); return; }
  // 재료 확인
  if (d.pitcher <= 0) {
    if (lemons() < r.l || S.inv.sugar < r.s) { d.soldOut = lemons() < r.l ? '레몬' : '설탕'; say(w, '😢', '품절이래요'); return; }
    useLemons(r.l); S.inv.sugar -= r.s; d.pitcher = cupsPer(); g.sfx.tone(300, 0.2, 'sine', 0.05, 500);
  }
  if (S.inv.cup < 1) { d.soldOut = '컵'; say(w, '😢', '품절이래요'); return; }
  if (S.inv.ice < r.i) { d.soldOut = '얼음'; say(w, '😢', '품절이래요'); return; }
  S.inv.cup--; S.inv.ice -= r.i; d.pitcher--;
  S.money += r.p; d.rev += r.p; d.sold++; S.total++;
  g.sfx.coin(); g.float(480, 300, '+' + r.p, '#16a34a', 16);
  // 맛 평가
  const dl = r.l - w.il, ds = r.s - w.is, di = r.i - w.ii;
  let q = 1 - (Math.abs(dl) * 0.11 + Math.abs(ds) * 0.11 + Math.abs(di) * 0.09);
  if (r.l + r.s < 5) q -= 0.15;
  const val = q - Math.max(0, (r.p / w.max) - 0.75) * 0.6;
  const issues = [[dl - ds > 1.6 ? 1 : 0, '너무 셔요'], [ds - dl > 1.6 ? 1 : 0, '너무 달아요'], [r.l + r.s < 5 ? 1 : 0, '밍밍해요'], [di < -1.6 ? 1 : 0, '미지근해요'], [di > 1.8 ? 1 : 0, '너무 차가워요']].filter((x) => x[0]);
  if (val > 0.72) { d.happy++; say(w, '😋', U.choice(['최고예요!', '또 올게요!', '완벽해요!'])); S.pop = Math.min(100, S.pop + 0.25); }
  else if (val > 0.45) { d.meh++; say(w, '😐', issues.length ? issues[0][1] : '그럭저럭'); S.pop = Math.min(100, S.pop + 0.05); }
  else { d.bad++; say(w, '🤢', issues.length ? U.choice(issues)[1] : '별로예요'); S.pop = Math.max(0, S.pop - 0.45); }
}
function endDay(g) {
  const d = S.d;
  S.phase = 'report';
  const spoil = [];
  const lim = S.up.fridge ? 10 : 4;
  for (const b of S.inv.lemon) b.d++;
  const rot = S.inv.lemon.filter((b) => b.d > lim).reduce((a, b) => a + b.n, 0);
  S.inv.lemon = S.inv.lemon.filter((b) => b.d <= lim);
  if (rot) spoil.push(`🍋 레몬 ${rot}개가 상했어요`);
  const melt = S.up.icebox ? Math.floor(S.inv.ice * 0.4) : S.inv.ice;
  if (melt) spoil.push(`🧊 얼음 ${melt}개가 녹았어요`);
  S.inv.ice -= melt;
  d.spoil = spoil;
  S.lastCm = Object.entries(d.cm).sort((a, b) => b[1] - a[1]);
  d.profit = S.money - d.startMoney;
  S.hist.push(Math.round(d.profit));
  g.sfx.win();
  if (d.profit > 0) g.burst(480, 300, ['#facc15', '#22c55e'], 40, 300, 1);
}
function nextDay(g) {
  if (S.day >= DAYS) return finish(g);
  S.day++;
  morning();
  S.phase = 'prep';
  saveGame();
  // 파산 체크: 재료도 돈도 없음
  const minCost = 1000 + packCost(ITEMS[0], 0);
  if (S.money < minCost && lemons() < S.rec.l && S.inv.cup < 1) { g.save('run', null); g.over(`💸 ${S.day}일차에 파산했어요… 총 ${S.total}잔 판매`); }
}
function finish(g) {
  g.save('run', null);
  g.score = Math.max(0, Math.floor(S.money));
  const st = g.load('stats', { best: 0 }); st.best = Math.max(st.best, S.money); g.save('stats', st);
  if (S.money >= GOALM) g.win(`🍋 레모네이드 재벌! ${won(S.money)} · 총 ${S.total.toLocaleString()}잔`);
  else g.over(`30일 장사 끝 · ${won(S.money)} (목표 ${won(GOALM)}) · 총 ${S.total}잔`);
}
function saveGame() { const o = {}; for (const k in S) if (!['g', 'walkers', 'drops', 'queue', 'd'].includes(k)) o[k] = S[k]; S.g.save('run', o); }
/* ---------- 그리기 ---------- */
function drawPrep(g, c) {
  const W = WX[S.fc];
  const gr = c.createLinearGradient(0, 0, 0, 600); gr.addColorStop(0, '#fef3c7'); gr.addColorStop(1, '#fde68a'); c.fillStyle = gr; c.fillRect(0, 0, 960, 600);
  g.rrect(12, 10, 936, 64, 14, '#fff', '#f59e0b', 2);
  g.text(`☀️ ${S.day}일차 아침`, 30, 42, 24, '#92400e', 'left');
  g.emoji(W.e, 250, 42, 40);
  g.text(`일기예보: ${W.n} ${W.t[0]}~${W.t[1]}°C`, 280, 34, 17, '#1f2937', 'left');
  g.text(S.ev || '오늘은 평범한 하루가 될 것 같아요', 280, 56, 13, S.ev ? '#b91c1c' : '#6b7280', 'left');
  g.text('💰 ' + won(S.money), 930, 32, 22, '#15803d', 'right');
  g.text(`인기 ${'★'.repeat(Math.ceil(S.pop / 20)) || '☆'} (${Math.round(S.pop)})`, 930, 56, 13, '#b45309', 'right');
  // 시장
  g.rrect(12, 84, 398, 310, 14, '#fffbeb', '#fcd34d', 2);
  g.text('🛒 재료 시장', 24, 102, 16, '#92400e', 'left');
  ITEMS.forEach((it, i) => {
    const y = 118 + i * 74, have = it.k === 'lemon' ? lemons() : S.inv[it.k];
    g.emoji(it.e, 40, y + 18, 30);
    g.text(it.n, 64, y + 12, 14, '#1f2937', 'left');
    g.text('보유 ' + have, 64, y + 32, 13, have ? '#15803d' : '#dc2626', 'left');
    if (it.k === 'lemon' && S.inv.lemon.length) { const old = S.inv.lemon[0].d, lim = S.up.fridge ? 10 : 4; g.text(`가장 오래된 것 ${old}/${lim}일`, 64, y + 50, 10, old >= lim ? '#dc2626' : '#78716c', 'left'); }
    it.packs.forEach((p, j) => {
      const x = 130 + j * 92, cost = packCost(it, j), ok = S.money >= cost;
      g.rrect(x, y, 86, 46, 9, g.inRect(x, y, 86, 46) ? '#fde68a' : '#fef3c7', ok ? '#f59e0b' : '#e5e7eb', 2);
      g.text('×' + p[0], x + 43, y + 15, 15, '#1f2937');
      g.text(won(cost), x + 43, y + 33, 12, ok ? '#b45309' : '#9ca3af');
    });
  });
  // 레시피
  g.rrect(420, 84, 230, 310, 14, '#fffbeb', '#fcd34d', 2);
  g.text('🧪 레시피 & 가격', 432, 102, 16, '#92400e', 'left');
  RECR.forEach(([k, n], i) => {
    const y = 128 + i * 62;
    g.text(n, 438, y - 6, 12, '#78350f', 'left');
    g.button(438, y, 40, 40, '−', '#f59e0b', 22);
    g.text(k === 'p' ? S.rec.p.toLocaleString() + '원' : String(S.rec[k]), 528, y + 20, 20, '#1f2937');
    g.button(578, y, 40, 40, '+', '#f59e0b', 22);
  });
  const uc = unitCost();
  g.text(`예상 원가 ≈ ${uc.toLocaleString()}원/컵`, 535, 372, 12, '#57534e');
  g.text(`예상 마진 ${(S.rec.p - uc).toLocaleString()}원`, 535, 386, 12, S.rec.p > uc ? '#15803d' : '#dc2626');
  // 광고
  g.rrect(420, 404, 230, 80, 14, '#fffbeb', '#fcd34d', 2);
  g.text('📣 오늘 홍보', 432, 420, 14, '#92400e', 'left');
  [['없음', 0], ['전단지', 1500], ['SNS', 6000]].forEach(([n, cst], i) => { const on = S.ad === i; g.rrect(426 + i * 74, 434, 68, 40, 8, on ? '#f59e0b' : '#fef3c7', '#f59e0b', 2); g.text(n, 460 + i * 74, 447, 13, on ? '#fff' : '#78350f'); g.text(cst ? cst.toLocaleString() : '-', 460 + i * 74, 463, 10, on ? '#fff' : '#a16207'); });
  // 업그레이드
  g.rrect(656, 84, 296, 444, 14, '#fffbeb', '#fcd34d', 2);
  g.text('⭐ 가게 업그레이드', 668, 102, 16, '#92400e', 'left');
  UPS.forEach((u, i) => {
    const y = 112 + i * 52, own = S.up[u.k], ok = S.money >= u.cost;
    g.rrect(660, y, 288, 46, 9, own ? '#dcfce7' : g.inRect(660, y, 288, 46) ? '#fde68a' : '#fff', own ? '#22c55e' : '#fcd34d', 2);
    g.emoji(u.e, 684, y + 23, 26);
    g.text(u.n, 704, y + 14, 14, '#1f2937', 'left');
    g.text(u.d, 704, y + 33, 11, '#57534e', 'left');
    g.text(own ? '✓' : (u.cost / 1000) + '천', 940, y + 23, 13, own ? '#16a34a' : ok ? '#b45309' : '#9ca3af', 'right');
  });
  // 어제 반응
  g.rrect(12, 404, 398, 124, 14, '#fff', '#fcd34d', 2);
  g.text('📝 어제 손님들의 한마디', 24, 420, 14, '#92400e', 'left');
  const cm = S.lastCm || [];
  if (!cm.length) g.text(S.day === 1 ? '첫 장사! 날씨를 보고 레시피를 정해보세요.' : '특별한 의견이 없었어요.', 24, 448, 13, '#6b7280', 'left');
  cm.slice(0, 4).forEach(([t, n], i) => g.text(`"${t}" ×${n}`, 24 + (i % 2) * 190, 448 + Math.floor(i / 2) * 24, 14, '#374151', 'left'));
  if (S.hist.length) {
    const h = S.hist.slice(-14), mx = Math.max(1, ...h.map(Math.abs));
    h.forEach((v, i) => { const bh = Math.abs(v) / mx * 22; g.rect(24 + i * 26, v >= 0 ? 510 - bh : 510, 18, bh, v >= 0 ? '#22c55e' : '#ef4444'); });
    g.text('최근 수익', 400, 500, 11, '#78716c', 'right');
  }
  g.button(380, 510, 200, 60, '🍋 장사 시작!', '#16a34a', 22);
  g.button(20, 540, 120, 40, S.confirmNew ? '정말 처음부터?' : '새 게임', S.confirmNew ? '#b91c1c' : '#78716c', 13);
  g.text(`목표: ${DAYS}일 안에 ${won(GOALM)}`, 930, 556, 14, '#92400e', 'right');
  g.text(`(Enter로 시작)`, 930, 578, 11, '#a16207', 'right');
}
function drawStreet(g, c) {
  const W = WX[S.actual], k = U.clamp(S.clock / DAYLEN, 0, 1);
  const gr = c.createLinearGradient(0, 0, 0, 330); gr.addColorStop(0, W.sky[0]); gr.addColorStop(1, W.sky[1]); c.fillStyle = gr; c.fillRect(0, 0, 960, 330);
  if (S.actual <= 2) g.emoji('☀️', 80 + k * 800, 170 - Math.sin(k * Math.PI) * 70, 54);
  if (S.actual >= 2) for (let i = 0; i < 4; i++) g.emoji('☁️', ((i * 280 + g.time * 12) % 1160) - 100, 60 + (i % 2) * 40, 60);
  // 건물
  for (let i = 0; i < 9; i++) { const x = i * 112 - 10, h = 90 + ((i * 53) % 70); g.rect(x, 330 - h, 100, h, ['#e7c9a9', '#cbd5e1', '#fca5a5', '#bfdbfe'][i % 4]); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) g.rect(x + 12 + q * 28, 340 - h + r * 26, 16, 16, 'rgba(255,255,255,.55)'); }
  if (S.up.truck) g.emoji('🏙️', 860, 250, 90);
  g.rect(0, 330, 960, 110, '#d6d3d1'); for (let i = 0; i < 24; i++) g.rect(i * 40, 330, 2, 110, '#a8a29e');
  g.rect(0, 440, 960, 160, '#57534e'); for (let i = 0; i < 12; i++) g.rect(i * 90 + 20, 515, 50, 6, '#facc15');
  // 가판대
  if (S.up.truck) { g.rrect(500, 270, 190, 110, 14, '#facc15', '#a16207', 3); g.rect(520, 290, 90, 40, '#bae6fd'); g.circle(530, 384, 18, '#1f2937'); g.circle(660, 384, 18, '#1f2937'); }
  else {
    if (S.up.parasol) { g.poly([[490, 230], [640, 230], [565, 190]], '#ef4444'); g.line(565, 230, 565, 300, '#78716c', 4); }
    g.rrect(500, 290, 130, 80, 8, '#fef08a', '#a16207', 3); g.rect(500, 290, 130, 16, '#f59e0b');
  }
  g.emoji('🍋', 535, 330, 30); g.emoji('🥤', 580, 330, 28);
  if (S.up.sign) { const on = Math.sin(g.time * 6) > -0.3; g.rrect(510, 246, 110, 30, 8, '#1f2937', on ? '#f472b6' : '#7c3aed', 3); g.text('LEMONADE', 565, 261, 14, on ? '#f9a8d4' : '#c4b5fd'); }
  if (S.up.radio) g.emoji('📻', 614, 282, 20);
  if (S.up.staff) g.emoji('🧑‍🍳', 520, 290, 28);
  g.emoji('🧑', 600, 290, 30);
  // 가격판
  g.rrect(640, 320, 70, 40, 6, '#fff', '#a16207', 2); g.text(S.rec.p.toLocaleString(), 675, 340, 15, '#b91c1c');
  // 사람
  const list = S.walkers.slice().sort((a, b) => (a.st === 'queue') - (b.st === 'queue'));
  for (const w of list) {
    const y = (w.st === 'queue' ? 382 : 412) + Math.abs(Math.sin(g.time * 8 + w.bob)) * -4;
    g.emoji(w.e, w.x, y, 38);
    if (S.actual === 4 && w.st !== 'queue') g.emoji('☂️', w.x, y - 30, 26);
    if (w.bub > 0) {
      c.globalAlpha = Math.min(1, w.bub * 2);
      const tw = w.txt ? w.txt.length * 12 + 30 : 30;
      g.rrect(w.x - tw / 2, y - 66, tw, 26, 10, '#fff', '#d6d3d1', 1);
      g.emoji(w.em, w.x - tw / 2 + 14, y - 53, 16); if (w.txt) g.text(w.txt, w.x + 8, y - 53, 11, '#374151');
      c.globalAlpha = 1;
    }
    if (w.st === 'queue' && w.pat < 4) g.emoji('💢', w.x + 14, y - 24, 14);
  }
  // 비
  if (S.actual === 4) { c.strokeStyle = 'rgba(191,219,254,.7)'; c.lineWidth = 1.5; c.beginPath(); for (const r of S.drops) { c.moveTo(r.x, r.y); c.lineTo(r.x - 3, r.y + 12); } c.stroke(); }
  // HUD
  const d = S.d;
  g.rrect(10, 10, 940, 44, 12, 'rgba(255,255,255,.88)');
  const hh = 9 + Math.floor(k * 9), mm = Math.floor((k * 9 % 1) * 60);
  g.text(`🕘 ${hh}:${String(mm).padStart(2, '0')}`, 24, 32, 18, '#1f2937', 'left');
  g.emoji(W.e, 140, 32, 26); g.text(`${S.temp}°C`, 160, 32, 16, '#1f2937', 'left');
  g.text(`판매 ${d.sold}잔`, 230, 32, 16, '#15803d', 'left');
  g.text(`💰 ${won(S.money)}`, 340, 32, 16, '#15803d', 'left');
  g.text(`🍋${lemons()} 🍬${S.inv.sugar} 🧊${S.inv.ice} 🥤${S.inv.cup}`, 500, 32, 15, '#374151', 'left');
  g.text(`피처 ${d.pitcher}/${cupsPer()}`, 740, 32, 14, '#a16207', 'left');
  g.button(860, 12, 88, 34, S.spd === 1 ? '▶ 1x' : '▶▶ 3x', S.spd === 1 ? '#16a34a' : '#ea580c', 15);
  g.rect(10, 56, 940 * k, 4, '#f59e0b');
  if (d.soldOut) g.text(`⚠️ ${d.soldOut} 품절!`, 480, 80, 20, '#dc2626');
  // 가격 조정
  g.rrect(560, 542, 380, 52, 12, 'rgba(255,255,255,.9)');
  g.text('가격 조정 (←→)', 580, 568, 14, '#374151', 'left');
  g.button(700, 548, 40, 40, '−', '#f59e0b', 22); g.text(S.rec.p.toLocaleString() + '원', 790, 568, 18, '#b91c1c'); g.button(840, 548, 40, 40, '+', '#f59e0b', 22);
  g.text(`😋${d.happy} 😐${d.meh} 🤢${d.bad}`, 20, 568, 18, '#fff', 'left');
}
function drawReport(g) {
  const d = S.d;
  g.rect(0, 0, 960, 600, 'rgba(0,0,0,.5)');
  g.rrect(230, 60, 500, 520, 18, '#fffbeb', '#f59e0b', 4);
  g.text(`📊 ${S.day}일차 결산`, 480, 96, 26, '#92400e');
  const rows = [
    ['지나간 사람', d.seen + '명'], ['가게에 온 손님', d.came + '명'], ['판매', d.sold + '잔'], ['매출', won(d.rev)],
    ['광고·일당', '-' + won(d.ac)], ['순이익 (재료 구입 제외)', (d.profit >= 0 ? '+' : '') + won(d.profit)],
    ['만족도', d.sold ? `😋${d.happy}  😐${d.meh}  🤢${d.bad}` : '-'], ['인기도', Math.round(S.pop) + ' / 100'],
  ];
  rows.forEach(([a, b], i) => { g.text(a, 270, 136 + i * 32, 16, '#57534e', 'left'); g.text(b, 690, 136 + i * 32, 17, i === 5 ? (d.profit >= 0 ? '#15803d' : '#dc2626') : '#1f2937', 'right'); });
  let y = 400;
  for (const s of d.spoil) { g.text(s, 480, y, 14, '#b91c1c'); y += 22; }
  const top = (S.lastCm || []).slice(0, 3).map(([t, n]) => `"${t}" ×${n}`).join('  ');
  if (top) g.text(top, 480, y + 6, 14, '#374151');
  g.text(S.day >= DAYS ? '마지막 날이 끝났어요!' : `내일 일기예보는 아침에 확인!`, 480, 492, 13, '#a16207');
  g.button(380, 520, 200, 50, S.day >= DAYS ? '최종 결과 ▶' : '다음 날 ▶', '#16a34a', 20);
}
