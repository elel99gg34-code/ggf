let S;
const WW = 4200, WH = 3000;
const GOODS = [
  { n: '럼주', e: '🥃', p: 24 }, { n: '설탕', e: '🍬', p: 34 }, { n: '담배', e: '🍂', p: 48 },
  { n: '향신료', e: '🌶️', p: 75 }, { n: '비단', e: '🧵', p: 115 }, { n: '보석', e: '💎', p: 230 },
];
const PORTS = [
  { n: '포트 로열', x: 900, y: 2250, e: '🏰', ia: 2.4, make: [0, 1], want: [4, 3], navy: 1 },
  { n: '토르투가', x: 2150, y: 640, e: '🏴‍☠️', ia: -1.6, make: [0, 2], want: [5, 1], haven: 1 },
  { n: '하바나', x: 640, y: 760, e: '🏛️', ia: -2.4, make: [2, 1], want: [3, 4], navy: 1 },
  { n: '나소', x: 3300, y: 560, e: '🏘️', ia: -0.8, make: [3], want: [0, 2] },
  { n: '카르타헤나', x: 2450, y: 2600, e: '⛪', ia: 1.5, make: [5, 4], want: [0, 1], navy: 1 },
  { n: '산후안', x: 3720, y: 1800, e: '🏯', ia: 0.3, make: [4, 3], want: [2, 5] },
  { n: '마라카이보', x: 1650, y: 1550, e: '🛖', ia: 3.4, make: [1, 5], want: [4, 0] },
];
const HULLS = [
  { n: '슬루프', hp: 100, sp: 150, gun: 3, cargo: 30, crew: 20, price: 0, len: 44 },
  { n: '브리건틴', hp: 170, sp: 145, gun: 5, cargo: 50, crew: 35, price: 3500, len: 52 },
  { n: '프리깃', hp: 260, sp: 140, gun: 7, cargo: 70, crew: 55, price: 9000, len: 60 },
  { n: '갤리온', hp: 380, sp: 118, gun: 9, cargo: 150, crew: 80, price: 16000, len: 70 },
  { n: '전열함', hp: 540, sp: 125, gun: 13, cargo: 100, crew: 110, price: 32000, len: 80 },
];
const UPG = [
  { k: 'hull', n: '강화 선체', e: '🪵', d: '최대 내구 +15%', cost: [800, 2000, 4500] },
  { k: 'gun', n: '청동 대포', e: '💣', d: '포탄 피해 +20%', cost: [1000, 2500, 5000] },
  { k: 'sail', n: '비단 돛', e: '🪁', d: '속도 +8%', cost: [700, 1800, 4000] },
  { k: 'reload', n: '숙련 포수', e: '🎯', d: '장전 속도 +15%', cost: [900, 2200, 4800] },
  { k: 'range', n: '장포신', e: '🔭', d: '사거리 +15%', cost: [1500, 4000] },
];
const FOE = {
  merchant: { n: '상선', hp: 90, sp: 95, gun: 2, dmg: 6, sail: '#f5f5f4', gold: [150, 400], xp: 35, crew: 14, bounty: 40, len: 50 },
  pirate: { n: '해적선', hp: 130, sp: 128, gun: 4, dmg: 8, sail: '#292524', gold: [220, 520], xp: 60, crew: 24, bounty: 0, len: 48 },
  navy: { n: '해군 함선', hp: 200, sp: 132, gun: 6, dmg: 9, sail: '#2563eb', gold: [300, 700], xp: 90, crew: 40, bounty: 70, len: 58 },
  hunter: { n: '현상금 사냥꾼', hp: 260, sp: 145, gun: 7, dmg: 10, sail: '#991b1b', gold: [600, 1100], xp: 140, crew: 50, bounty: 0, len: 60 },
  admiral: { n: '제독 블랙우드', hp: 1500, sp: 118, gun: 16, dmg: 12, sail: '#fbbf24', gold: [9000, 9000], xp: 1500, crew: 160, bounty: 0, len: 92, boss: 1 },
};
const RANKS = ['견습 선원', '갑판장', '갑판장', '선장', '선장', '사략선장', '사략선장', '해적 두목', '해적 두목', '공포의 해적', '공포의 해적', '전설의 해적'];
const KZ = { x: 3650, y: 2650, r: 330 };
GAME({
  title: '해적 항해', w: 1000, h: 640, bg: '#0c4a6e', controls: 'dpad+ab', aLabel: '좌현', bLabel: '우현', noRKey: true,
  help: '←→ 키 조타 · ↑ 돛 올리기 / ↓ 돛 내리기 (바람을 등지면 빨라요)\nZ/Space 좌현 포격 · X/Shift 우현 포격 (마우스: 바다 클릭 = 그쪽 현측 포격)\n항구에 들어가면 시장·조선소·선술집 이용 (←→ 탭, ↑↓ 선택, Z 실행, X 판매)\n싸게 사서 비싸게 팔고, 상선을 약탈하고, 약해진 배에 부딪히면 백병전!\n현상금이 높으면 해군 항구 입항 거부 · Lv8에 해군 제독 출현 → 격침하면 전설!\n🌀 남동쪽 마의 해역엔 크라켄이... · 항구에 들르면 자동 저장',
  init(g) {
    S = { g, mode: 'title', t: 0, sel: 0, foes: [], balls: [], loot: [], fx: [], wake: [], msgs: [], cam: { x: 0, y: 0 }, wind: U.rand(0, 6.28), windT: 0, spawnT: 2, kraken: null };
    buildWorld();
    S.saved = g.load('career', null);
    if (!S.saved) S.sel = 1;
  },
  update(g, dt) {
    S.t += dt;
    if (S.mode === 'title') return titleUpd(g);
    if (S.mode === 'port') return portUpd(g, dt);
    if (S.mode === 'board') { S.board.t -= dt; if (S.board.t <= 0) S.mode = 'sea'; return; }
    seaUpd(g, dt);
  },
  draw(g, c) {
    if (S.mode === 'title') return titleDraw(g, c);
    drawSea(g, c);
    drawHUD(g, c);
    if (S.mode === 'port') portDraw(g, c);
    if (S.mode === 'board') boardDraw(g, c);
  },
});
// ---------- 유틸 ----------
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function note(s, col = '#fde047') { S.msgs.unshift({ s, col, t: 5 }); if (S.msgs.length > 5) S.msgs.pop(); }
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function sx(x) { return x - S.cam.x; }
function sy(y) { return y - S.cam.y; }
function buildWorld() {
  const R = rng(7);
  S.islands = [];
  const mk = (x, y, r) => { const blobs = []; for (let i = 0; i < 5; i++) { const a = R() * 6.28, d = R() * r * 0.5; blobs.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: r * (0.55 + R() * 0.35) }); } blobs.push({ x, y, r: r * 0.8 }); const palms = []; for (let i = 0; i < 4 + r / 30; i++) { const b = blobs[Math.floor(R() * blobs.length)], a = R() * 6.28, d = R() * b.r * 0.7; palms.push([b.x + Math.cos(a) * d, b.y + Math.sin(a) * d]); } S.islands.push({ x, y, r, blobs, palms }); };
  for (const P of PORTS) mk(P.x + Math.cos(P.ia) * 150, P.y + Math.sin(P.ia) * 150, 120);
  S.wild = [];
  for (const [x, y, r] of [[1300, 500, 110], [2900, 1200, 140], [1100, 1300, 90], [2300, 1800, 120], [3300, 2500, 100], [600, 1700, 100], [1700, 2650, 110], [3900, 900, 90], [2700, 300, 70], [400, 2700, 80]]) { mk(x, y, r); S.wild.push(S.islands[S.islands.length - 1]); }
  S.ports = PORTS.map((P, i) => ({ ...P, i, mult: GOODS.map((G, gi) => (P.make.includes(gi) ? 0.6 : P.want.includes(gi) ? 1.55 : 1) * (0.9 + R() * 0.2)), drift: GOODS.map(() => 1) }));
}
function onLand(x, y, pad = 0) {
  for (const I of S.islands) { if (Math.abs(x - I.x) > I.r + 200 || Math.abs(y - I.y) > I.r + 200) continue; for (const b of I.blobs) { const d = Math.hypot(x - b.x, y - b.y); if (d < b.r + pad) return b; } }
  return null;
}
function newCareer() {
  return { x: PORTS[1].x, y: PORTS[1].y + 0, a: Math.PI / 2, v: 0, sail: 0, type: 0, upg: {}, hull: 100, crew: 16, gold: 700, cargo: [0, 0, 0, 0, 0, 0], cost: [0, 0, 0, 0, 0, 0], xp: 0, lv: 1, bounty: 0, kills: 0, quest: null, admiral: 0, kraken: 0, portLock: 1, rl: 0, rr: 0, inv: 0, day: 1, trade: 0, sunk: { merchant: 0, pirate: 0, navy: 0, hunter: 0 } };
}
function pst() {
  const P = S.p, H = HULLS[P.type], u = (k) => P.upg[k] || 0, cr = Math.min(1, P.crew / (H.crew * 0.6));
  return { max: Math.round(H.hp * (1 + 0.15 * u('hull')) * (1 + 0.05 * (P.lv - 1))), sp: H.sp * (1 + 0.08 * u('sail')) * (0.7 + 0.3 * cr), gun: H.gun, dmg: 10 * (1 + 0.2 * u('gun')) * (1 + 0.04 * (P.lv - 1)), reload: (3.0 / (1 + 0.15 * u('reload'))) * (1.6 - 0.6 * cr), range: 330 * (1 + 0.15 * u('range')), cargo: H.cargo, crewMax: H.crew, len: H.len };
}
function cargoUsed() { const P = S.p; return P.cargo.reduce((a, b) => a + b, 0) + (P.quest && P.quest.t === 'deliver' ? P.quest.qty : 0); }
function needXp(lv) { return Math.floor(180 * Math.pow(lv, 1.55)); }
function gainXp(g, n) {
  const P = S.p; P.xp += n; g.score += n;
  while (P.lv < 12 && P.xp >= needXp(P.lv)) {
    P.xp -= needXp(P.lv); P.lv++;
    const st = pst(); P.hull = Math.min(st.max, P.hull + st.max * 0.3);
    note(`⭐ 레벨 업! Lv${P.lv} — ${RANKS[P.lv - 1]}`, '#4ade80'); g.sfx.power();
    g.float(g.W / 2, g.H / 2 - 80, `Lv ${P.lv} ${RANKS[P.lv - 1]}`, '#4ade80', 34);
  }
}
function price(port, gi) { return Math.max(4, Math.round(GOODS[gi].p * port.mult[gi] * port.drift[gi] * (1 + 0.08 * Math.sin(S.t * 0.05 + gi * 2 + port.i)))); }
function sellPrice(port, gi) { return Math.round(price(port, gi) * 0.88); }
function doSave(g) {
  const P = S.p;
  g.save('career', { ...P, cargo: [...P.cargo], cost: [...P.cost], upg: { ...P.upg }, sunk: { ...P.sunk }, score: g.score, drift: S.ports.map((p) => p.drift) });
}
// ---------- 타이틀 ----------
function titleBtns() { return S.saved ? [[350, 330, 300, 60, `⚓ 이어하기 (Lv${S.saved.lv} · 💰${S.saved.gold})`], [350, 410, 300, 60, '🆕 새 항해 시작']] : [[350, 370, 300, 60, '🆕 새 항해 시작']]; }
function titleUpd(g) {
  const B = titleBtns();
  if (g.pressed('up') || g.pressed('down')) { S.sel = (S.sel + 1) % B.length; g.sfx.click(); }
  let pick = -1;
  B.forEach((b, i) => { if (g.clickIn(b[0], b[1], b[2], b[3])) pick = i; });
  if (g.pressed('a')) pick = S.sel % B.length;
  if (pick < 0) return;
  const cont = S.saved && pick === 0;
  S.p = newCareer();
  if (cont) { const sv = S.saved; Object.assign(S.p, sv); S.p.cargo = [...sv.cargo]; S.p.cost = [...sv.cost]; g.score = sv.score || 0; if (sv.drift) S.ports.forEach((p, i) => (p.drift = sv.drift[i] || p.drift)); S.p.v = 0; S.p.sail = 0; }
  else { S.p.hull = pst().max; g.save('career', null); note('🏴‍☠️ 토르투가에서 첫 항해를 시작합니다!'); note('싸게 사서 비싸게 팔거나, 상선을 습격해 보세요', '#bae6fd'); }
  const port = S.ports[S.p.portLock >= 0 ? S.p.portLock : 1];
  enterPort(g, port, true);
  g.sfx.coin();
}
function titleDraw(g, c) {
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#0c1e3a'); grd.addColorStop(1, '#0e5a8a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 12; i++) { const y = 470 + i * 14; g.line(0, y + Math.sin(S.t + i) * 4, g.W, y + Math.cos(S.t * 1.3 + i) * 4, 'rgba(255,255,255,.08)', 2); }
  c.save(); c.translate(500, 230 + Math.sin(S.t * 1.5) * 6); c.rotate(Math.sin(S.t) * 0.05); drawShip(g, c, 0, 0, -Math.PI / 2 + 0.0001, 120, '#292524', '#7c4a1e', '#111'); c.restore();
  g.text('🏴‍☠️ 해적 항해', 500, 90, 54, '#fde047');
  g.text('무역과 해전으로 카리브의 전설이 되어라', 500, 140, 20, '#bae6fd', 'center', 'normal');
  titleBtns().forEach((b, i) => { g.rrect(b[0], b[1], b[2], b[3], 14, i === S.sel ? '#b45309' : '#1e3a5f', i === S.sel ? '#fde047' : '#38bdf8', 3); g.text(b[4], b[0] + b[2] / 2, b[1] + b[3] / 2, 20, '#fff'); });
  g.text('↑↓ 선택 · Space 결정', 500, 520, 15, '#7dd3fc');
}
// ---------- 바다 ----------
function seaUpd(g, dt) {
  const P = S.p, st = pst();
  S.windT -= dt; if (S.windT <= 0) { S.windT = U.rand(20, 40); S.windTarget = S.wind + U.rand(-1.2, 1.2); }
  if (S.windTarget !== undefined) S.wind += angDiff(S.wind, S.windTarget) * dt * 0.1;
  if (P.sinking) { P.sinking -= dt; if (P.sinking <= 0) { g.over(`${RANKS[P.lv - 1]} Lv${P.lv} · 격침 ${P.kills}척 · 💰${P.gold}\n(마지막 항구에서 이어할 수 있어요)`); } return; }
  // 조작
  if (g.pressed('up')) { P.sail = Math.min(3, P.sail + 1); g.sfx.tone(300 + P.sail * 80, 0.08, 'triangle', 0.05); }
  if (g.pressed('down')) { P.sail = Math.max(0, P.sail - 1); g.sfx.tone(300 + P.sail * 80, 0.08, 'triangle', 0.05); }
  const turn = (g.right - g.left) * (0.9 + 0.6 * Math.min(1, P.v / 60)) * dt * (P.sail === 0 ? 0.7 : 1);
  P.a += turn;
  const wf = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(angDiff(P.a, S.wind)));
  const target = st.sp * [0, 0.35, 0.7, 1][P.sail] * wf;
  P.v += (target - P.v) * dt * 0.8;
  let nx = P.x + Math.cos(P.a) * P.v * dt, ny = P.y + Math.sin(P.a) * P.v * dt;
  const hitB = onLand(nx, ny, 16);
  if (hitB) { const a = Math.atan2(ny - hitB.y, nx - hitB.x); nx = hitB.x + Math.cos(a) * (hitB.r + 17); ny = hitB.y + Math.sin(a) * (hitB.r + 17); if (P.v > 50) { damageP(g, P.v * 0.08, '좌초!'); } P.v *= 0.3; }
  P.x = U.clamp(nx, 30, WW - 30); P.y = U.clamp(ny, 30, WH - 30);
  if (g.frame % 4 === 0 && P.v > 20) { S.wake.push({ x: P.x - Math.cos(P.a) * st.len / 2, y: P.y - Math.sin(P.a) * st.len / 2, t: 1.6 }); }
  // 포격
  P.rl -= dt; P.rr -= dt; P.inv -= dt;
  let side = 0;
  if (g.pressed('a')) side = -1;
  if (g.pressed('b')) side = 1;
  if (g.mouse.clicked) { const wx = g.mouse.x + S.cam.x, wy = g.mouse.y + S.cam.y; side = angDiff(P.a, Math.atan2(wy - P.y, wx - P.x)) < 0 ? -1 : 1; }
  if (side) fireP(g, side, st);
  // 항구
  S.ports.forEach((port) => {
    const d = U.dist(P.x, P.y, port.x, port.y);
    if (P.portLock === port.i && d > 170) P.portLock = -1;
    if (d < 75 && P.portLock !== port.i) {
      if (port.navy && P.bounty >= 300) { P.portLock = port.i; note(`🚫 ${port.n}: 현상금 수배자는 입항 금지! (현상금 300 미만 필요)`, '#f87171'); fort(g, port); }
      else enterPort(g, port);
    }
  });
  // 보물
  if (P.quest && P.quest.t === 'map' && U.dist(P.x, P.y, P.quest.x, P.quest.y) < 70) {
    const r = P.quest.reward; P.gold += r; gainXp(g, 250); note(`💰 보물 발견! ${r} 골드!`, '#fde047'); g.sfx.win(); g.burst(sx(P.x), sy(P.y), ['#fde047', '#facc15', '#fff'], 50, 300, 1); P.quest = null;
  }
  // 현상금 감소
  if (P.bounty > 0) P.bounty = Math.max(0, P.bounty - dt * 0.35);
  // 스폰
  S.spawnT -= dt;
  if (S.spawnT <= 0) { S.spawnT = U.rand(3, 6); if (S.foes.filter((f) => !f.boss).length < 7 + Math.min(4, P.lv / 2)) spawnFoe(g); }
  if (P.lv >= 8 && !P.admiral && !S.foes.some((f) => f.k === 'admiral')) {
    const H = S.ports[2];
    S.foes.push(mkFoe('admiral', H.x + 300, H.y + 300)); S.foes.push(mkFoe('navy', H.x + 380, H.y + 260)); S.foes.push(mkFoe('navy', H.x + 260, H.y + 380));
    S.foes.forEach((f) => f.k !== 'merchant' && (f.aggro = true));
    note('⚠️ 해군 제독 블랙우드가 하바나 앞바다에 나타났다!', '#f87171'); g.sfx.tone(90, 1.2, 'sawtooth', 0.08); g.shake(6, 0.6);
  }
  // 크라켄
  if (!P.kraken && !S.kraken && U.dist(P.x, P.y, KZ.x, KZ.y) < KZ.r) { S.kraken = { x: KZ.x, y: KZ.y, hp: 1300 + P.lv * 120, max: 1300 + P.lv * 120, t: 2, tent: [], flash: 0 }; note('🐙 바다가 요동친다... 크라켄이다!', '#c084fc'); g.shake(10, 1); g.sfx.tone(60, 1.5, 'sawtooth', 0.1, 30); }
  if (S.kraken) krakenUpd(g, dt);
  foesUpd(g, dt);
  ballsUpd(g, dt);
  // 전리품
  for (const L of S.loot) {
    L.t -= dt;
    if (U.dist(L.x, L.y, P.x, P.y) < 40) {
      L.t = 0; P.gold += L.gold; let txt = `+${L.gold}💰`;
      if (L.gi >= 0) { const room = st.cargo - cargoUsed(), q = Math.min(room, L.q); if (q > 0) { P.cargo[L.gi] += q; txt += ` ${GOODS[L.gi].e}×${q}`; } }
      g.float(sx(L.x), sy(L.y) - 20, txt, '#fde047', 18); g.sfx.coin();
    }
  }
  S.loot = S.loot.filter((l) => l.t > 0);
  S.wake.forEach((w) => (w.t -= dt)); S.wake = S.wake.filter((w) => w.t > 0);
  S.fx.forEach((f) => (f.t -= dt)); S.fx = S.fx.filter((f) => f.t > 0);
  S.msgs.forEach((m) => (m.t -= dt)); S.msgs = S.msgs.filter((m) => m.t > 0);
  if (g.frame % 600 === 0) P.day++;
  S.cam.x = U.clamp(P.x - g.W / 2, 0, WW - g.W); S.cam.y = U.clamp(P.y - g.H / 2, 0, WH - g.H);
  g.info = `${RANKS[P.lv - 1]} · 💰${P.gold} · 현상금 ${Math.round(P.bounty)}`;
}
function fireP(g, side, st) {
  const P = S.p;
  if ((side < 0 ? P.rl : P.rr) > 0) { g.sfx.beep(150, 0.05); return; }
  if (side < 0) P.rl = st.reload; else P.rr = st.reload;
  broadside(g, P, side, st.gun, st.dmg, st.range, 'p');
  g.shake(3, 0.15);
}
function broadside(g, sh, side, guns, dmg, range, owner) {
  const len = sh.len || pst().len, dir = sh.a + side * Math.PI / 2, vx = Math.cos(sh.a) * sh.v, vy = Math.sin(sh.a) * sh.v;
  for (let i = 0; i < guns; i++) {
    const off = guns > 1 ? (i / (guns - 1) - 0.5) * len * 0.7 : 0;
    g.later(() => {
      if (sh.hp !== undefined && sh.hp <= 0) return;
      const bx = sh.x + Math.cos(sh.a) * off + Math.cos(dir) * 12, by = sh.y + Math.sin(sh.a) * off + Math.sin(dir) * 12, d = dir + U.rand(-0.07, 0.07), spd = 430;
      S.balls.push({ x: bx, y: by, vx: Math.cos(d) * spd + vx, vy: Math.sin(d) * spd + vy, life: range / spd, dmg: dmg * U.rand(0.85, 1.15), o: owner });
      S.fx.push({ k: 'smoke', x: bx, y: by, t: 0.6 });
    }, i * 0.05);
  }
  if (owner === 'p' || U.dist(sh.x, sh.y, S.p.x, S.p.y) < 700) g.sfx.tone(owner === 'p' ? 110 : 90, 0.25, 'sawtooth', owner === 'p' ? 0.07 : 0.04, 40);
}
function damageP(g, d, why) {
  const P = S.p;
  P.hull -= d;
  if (Math.random() < 0.35) P.crew = Math.max(0, P.crew - 1);
  g.shake(Math.min(10, 3 + d / 4), 0.2);
  if (why) note(why, '#f87171');
  if (P.hull <= 0 && !P.sinking) { P.hull = 0; P.sinking = 2; g.sfx.explode(); note('💀 배가 침몰한다...', '#f87171'); }
}
function mkFoe(k, x, y) {
  const F = FOE[k], L = S.p.lv, sc = 1 + 0.16 * (L - 1);
  return { k, x, y, a: U.rand(0, 6.28), v: 40, hp: F.hp * (F.boss ? 1 : sc), max: F.hp * (F.boss ? 1 : sc), dmg: F.dmg * (F.boss ? 1 : 1 + 0.08 * (L - 1)), sp: F.sp, len: F.len, gun: F.gun, rl: 2, rr: 2, crew: Math.round(F.crew * (F.boss ? 1 : sc)), aggro: k === 'pirate' || k === 'hunter' || F.boss, dest: U.randi(0, PORTS.length - 1), sink: 0, flash: 0, boss: F.boss };
}
function spawnFoe(g) {
  const P = S.p;
  let k = 'merchant'; const r = Math.random();
  if (r < 0.4) k = 'merchant'; else if (r < 0.7) k = 'pirate'; else k = 'navy';
  if (P.bounty >= 250 && Math.random() < 0.35) k = 'hunter';
  for (let tries = 0; tries < 20; tries++) {
    const a = U.rand(0, 6.28), d = U.rand(750, 1100), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (x < 60 || y < 60 || x > WW - 60 || y > WH - 60 || onLand(x, y, 60) || U.dist(x, y, KZ.x, KZ.y) < KZ.r + 100) continue;
    const f = mkFoe(k, x, y);
    if (k === 'navy' && P.bounty >= 100) f.aggro = true;
    S.foes.push(f); return;
  }
}
function steer(f, want, dt, rate = 1.1) {
  // 섬 회피
  const la = f.x + Math.cos(f.a) * 110, lb = f.y + Math.sin(f.a) * 110, b = onLand(la, lb, 30);
  if (b) { const side = angDiff(f.a, Math.atan2(b.y - f.y, b.x - f.x)) > 0 ? -1 : 1; want = f.a + side * 1.4; }
  if (f.x < 120) want = 0; if (f.x > WW - 120) want = Math.PI; if (f.y < 120) want = Math.PI / 2; if (f.y > WH - 120) want = -Math.PI / 2;
  const d = angDiff(f.a, want); f.a += U.clamp(d, -rate * dt, rate * dt);
}
function foesUpd(g, dt) {
  const P = S.p;
  for (const f of S.foes) {
    f.flash -= dt;
    if (f.sink > 0) { f.sink -= dt; f.v *= 0.97; if (f.sink <= 0) f.dead = true; continue; }
    const dP = U.dist(f.x, f.y, P.x, P.y), aP = Math.atan2(P.y - f.y, P.x - f.x);
    let want = f.a, spd = f.sp * 0.6;
    if (f.k === 'merchant') {
      const D = S.ports[f.dest];
      if (f.scared && dP < 600) { want = aP + Math.PI; spd = f.sp; }
      else { want = Math.atan2(D.y - f.y, D.x - f.x); if (U.dist(f.x, f.y, D.x, D.y) < 140) f.dead = true; }
    } else if (f.aggro && dP < 1100 && !P.sinking) {
      if (dP > 300) { want = aP; spd = f.sp; }
      else { const s = angDiff(f.a, aP) > 0 ? 1 : -1; want = aP - s * Math.PI / 2 + (dP < 170 ? -s * 0.5 : 0); spd = f.sp * 0.8; }
    } else { f.wt = (f.wt || 0) - dt; if (f.wt <= 0) { f.wt = U.rand(3, 7); f.wa = f.a + U.rand(-1, 1); } want = f.wa ?? f.a; }
    steer(f, want, dt, f.boss ? 0.7 : 1.1);
    f.v += (spd - f.v) * dt * 0.6;
    let nx = f.x + Math.cos(f.a) * f.v * dt, ny = f.y + Math.sin(f.a) * f.v * dt;
    const b = onLand(nx, ny, 14); if (b) { const a = Math.atan2(ny - b.y, nx - b.x); nx = b.x + Math.cos(a) * (b.r + 15); ny = b.y + Math.sin(a) * (b.r + 15); f.v *= 0.5; }
    f.x = nx; f.y = ny;
    if (dP > 2200 && !f.boss) f.dead = true;
    // 포격
    f.rl -= dt; f.rr -= dt;
    const hostile = f.aggro || (f.k === 'merchant' && f.scared);
    if (hostile && dP < 330 && !P.sinking) {
      const rel = angDiff(f.a, aP), side = rel > 0 ? 1 : -1;
      if (Math.abs(Math.abs(rel) - Math.PI / 2) < 0.38) {
        if (side < 0 && f.rl <= 0) { f.rl = U.rand(2.6, 3.8) * (f.boss ? 0.8 : 1); broadside(g, f, -1, f.gun, f.dmg, 340, 'e'); }
        if (side > 0 && f.rr <= 0) { f.rr = U.rand(2.6, 3.8) * (f.boss ? 0.8 : 1); broadside(g, f, 1, f.gun, f.dmg, 340, 'e'); }
      }
    }
    // 충돌 / 백병전
    const st = pst();
    if (dP < (f.len + st.len) * 0.42) {
      if (f.hp < f.max * 0.35 && !f.boss) return boarding(g, f);
      const push = ((f.len + st.len) * 0.42 - dP) / 2;
      P.x -= Math.cos(aP) * push; P.y -= Math.sin(aP) * push; f.x += Math.cos(aP) * push; f.y += Math.sin(aP) * push;
      if (P.inv <= 0) { P.inv = 0.8; damageP(g, 4); f.hp -= 4; g.sfx.hit(); }
    }
  }
  S.foes = S.foes.filter((f) => !f.dead);
}
function hitShip(x, y, sh) {
  const dx = x - sh.x, dy = y - sh.y, c = Math.cos(-sh.a), s = Math.sin(-sh.a), lx = dx * c - dy * s, ly = dx * s + dy * c, L = sh.len / 2, W = sh.len * 0.2;
  return (lx * lx) / (L * L) + (ly * ly) / (W * W) < 1.15;
}
function ballsUpd(g, dt) {
  const P = S.p, st = pst();
  for (const b of S.balls) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (onLand(b.x, b.y)) { b.life = 0; S.fx.push({ k: 'dust', x: b.x, y: b.y, t: 0.4 }); continue; }
    if (b.o === 'p') {
      for (const f of S.foes) if (f.sink <= 0 && hitShip(b.x, b.y, f)) { b.life = 0; hurtFoe(g, f, b.dmg); break; }
      if (b.life > 0 && S.kraken) {
        const K = S.kraken;
        if (U.dist(b.x, b.y, K.x, K.y) < 70) { b.life = 0; hurtKraken(g, b.dmg); }
        else for (const t of K.tent) if (t.up > 0 && U.dist(b.x, b.y, t.x, t.y) < 36) { b.life = 0; hurtKraken(g, b.dmg * 0.8); t.hp -= b.dmg; if (t.hp <= 0) t.up = Math.min(t.up, 0.2); break; }
      }
    } else if (!P.sinking && hitShip(b.x, b.y, { x: P.x, y: P.y, a: P.a, len: st.len })) {
      b.life = 0; damageP(g, b.dmg); g.sfx.hit(); S.fx.push({ k: 'boom', x: b.x, y: b.y, t: 0.35 });
    }
    if (b.life <= 0 && !b.done) { b.done = true; S.fx.push({ k: 'splash', x: b.x, y: b.y, t: 0.5 }); }
  }
  S.balls = S.balls.filter((b) => b.life > 0);
}
function hurtFoe(g, f, d) {
  const P = S.p;
  f.hp -= d; f.flash = 0.1;
  S.fx.push({ k: 'boom', x: f.x + U.rand(-10, 10), y: f.y + U.rand(-10, 10), t: 0.35 });
  g.float(sx(f.x), sy(f.y) - 30, Math.round(d), '#fff', 14);
  if (f.k === 'merchant') f.scared = true;
  if (f.k === 'navy') { f.aggro = true; S.foes.forEach((o) => o.k === 'navy' && U.dist(o.x, o.y, f.x, f.y) < 900 && (o.aggro = true)); }
  f.aggro = f.aggro || f.k !== 'merchant';
  g.sfx.tone(160, 0.12, 'square', 0.05, 60);
  if (f.hp <= 0) sinkFoe(g, f, false);
}
function sinkFoe(g, f, boarded) {
  const P = S.p, F = FOE[f.k];
  f.sink = 2; f.hp = 0;
  P.kills++; P.sunk[f.k] = (P.sunk[f.k] || 0) + 1;
  P.bounty += F.bounty;
  const gold = Math.round(U.randi(F.gold[0], F.gold[1]) * (1 + 0.1 * (P.lv - 1)) * (boarded ? 1.8 : 1));
  const nL = f.boss ? 6 : 2;
  for (let i = 0; i < nL; i++) S.loot.push({ x: f.x + U.rand(-30, 30), y: f.y + U.rand(-30, 30), gold: Math.round(gold / nL), gi: f.k === 'merchant' || Math.random() < 0.4 ? U.randi(0, f.k === 'merchant' ? 5 : 3) : -1, q: U.randi(3, f.k === 'merchant' ? 12 : 6), t: 40 });
  gainXp(g, Math.round(F.xp * (1 + 0.1 * (P.lv - 1))));
  g.sfx.explode(); g.shake(f.boss ? 14 : 6, f.boss ? 1 : 0.3);
  g.burst(sx(f.x), sy(f.y), ['#f97316', '#fde047', '#78350f', '#fff'], f.boss ? 80 : 30, 260, 0.9, 4);
  note(`${boarded ? '⚔️ 나포' : '💥 격침'}: ${F.n}${F.bounty ? ` (현상금 +${F.bounty})` : ''}`, '#fdba74');
  const Q = P.quest;
  if (Q && Q.t === 'hunt' && Q.k === f.k) { Q.got++; if (Q.got >= Q.n) { P.gold += Q.reward; gainXp(g, Q.xp); note(`📜 의뢰 완료! +${Q.reward} 골드`, '#4ade80'); g.sfx.win(); P.quest = null; } }
  if (f.k === 'admiral') { P.admiral = 1; g.later(() => { g.add(20000); doSave(g); g.win(`제독 블랙우드 격침! 당신은 이제 카리브의 전설이다.\nLv${P.lv} · 격침 ${P.kills}척 · 💰${P.gold}`); }, 2.5); note('👑 제독의 기함이 가라앉는다!', '#fde047'); }
}
function boarding(g, f) {
  const P = S.p, st = pst();
  const my = P.crew * U.rand(0.7, 1.3) * (1 + 0.05 * P.lv), en = f.crew * U.rand(0.6, 1.1) * (f.hp / f.max + 0.5);
  const win = my > en;
  const loss = Math.max(1, Math.round(f.crew * (win ? U.rand(0.15, 0.4) : U.rand(0.4, 0.7))));
  P.crew = Math.max(0, P.crew - loss);
  S.mode = 'board'; S.board = { t: 2.2, win, loss, n: FOE[f.k].n, my: Math.round(my), en: Math.round(en) };
  g.sfx.tone(400, 0.1, 'square', 0.06); g.later(() => g.sfx.tone(600, 0.1, 'square', 0.06), 0.15); g.later(() => (win ? g.sfx.win() : g.sfx.lose()), 1.2);
  if (win) { sinkFoe(g, f, true); P.crew = Math.min(st.crewMax, P.crew + Math.round(f.crew * 0.2)); }
  else { f.hp = f.max * 0.5; const a = Math.atan2(P.y - f.y, P.x - f.x); P.x += Math.cos(a) * 60; P.y += Math.sin(a) * 60; P.v = 0; }
}
function boardDraw(g, c) {
  const B = S.board;
  g.rect(0, 0, g.W, g.H, 'rgba(0,0,0,.55)');
  g.rrect(280, 200, 440, 220, 20, '#1c1917', '#fde047', 3);
  g.text('⚔️ 백병전!', 500, 240, 34, '#fde047');
  g.emoji('🏴‍☠️', 400 + Math.sin(S.t * 20) * 8, 300, 50); g.emoji('⚔️', 500, 300, 40); g.emoji(B.n === '상선' ? '🧑‍✈️' : '💂', 600 - Math.sin(S.t * 20) * 8, 300, 50);
  g.text(`우리 전력 ${B.my} vs 적 ${B.en}`, 500, 350, 17, '#e7e5e4');
  if (B.t < 1.3) g.text(B.win ? `승리! ${B.n} 나포 (선원 -${B.loss})` : `격퇴당했다... (선원 -${B.loss})`, 500, 388, 20, B.win ? '#4ade80' : '#f87171');
}
function fort(g, port) {
  const P = S.p;
  for (let i = 0; i < 4; i++) g.later(() => { const a = Math.atan2(P.y - port.y, P.x - port.x) + U.rand(-0.1, 0.1); S.balls.push({ x: port.x, y: port.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 1, dmg: 8, o: 'e' }); g.sfx.tone(80, 0.2, 'sawtooth', 0.05, 40); }, i * 0.3);
}
// ---------- 크라켄 ----------
function krakenUpd(g, dt) {
  const K = S.kraken, P = S.p;
  K.flash -= dt;
  if (K.dying) { K.dying -= dt; if (K.dying <= 0) S.kraken = null; return; }
  if (U.dist(P.x, P.y, K.x, K.y) > KZ.r + 500) { K.hp = Math.min(K.max, K.hp + dt * 40); }
  K.t -= dt;
  if (K.t <= 0 && U.dist(P.x, P.y, K.x, K.y) < KZ.r + 400) {
    K.t = Math.max(1.2, 2.6 - (1 - K.hp / K.max) * 1.2);
    const lead = 0.9, tx = P.x + Math.cos(P.a) * P.v * lead + U.rand(-30, 30), ty = P.y + Math.sin(P.a) * P.v * lead + U.rand(-30, 30);
    K.tent.push({ x: tx, y: ty, warn: 1.0, up: 0, hp: 60, hit: false });
  }
  for (const t of K.tent) {
    if (t.warn > 0) { t.warn -= dt; if (t.warn <= 0) { t.up = 2.2; g.sfx.tone(70, 0.3, 'sawtooth', 0.08, 40); S.fx.push({ k: 'splash', x: t.x, y: t.y, t: 0.5 }); if (U.dist(t.x, t.y, P.x, P.y) < 55) damageP(g, 18 + P.lv * 2, '🐙 촉수 강타!'); } }
    else { t.up -= dt; if (!t.hit && t.up > 0 && U.dist(t.x, t.y, P.x, P.y) < 40 && P.inv <= 0) { P.inv = 1; damageP(g, 8); P.v *= 0.3; } }
  }
  K.tent = K.tent.filter((t) => t.warn > 0 || t.up > 0);
  // 소용돌이 끌림
  const d = U.dist(P.x, P.y, K.x, K.y);
  if (d < KZ.r) { const a = Math.atan2(K.y - P.y, K.x - P.x); P.x += Math.cos(a + 1.2) * 25 * dt; P.y += Math.sin(a + 1.2) * 25 * dt; }
  if (d < 85 && P.inv <= 0) { P.inv = 1; damageP(g, 15, '크라켄의 부리!'); }
}
function hurtKraken(g, d) {
  const K = S.kraken, P = S.p;
  if (K.dying) return;
  K.hp -= d; K.flash = 0.1; g.float(sx(K.x) + U.rand(-30, 30), sy(K.y) - 60, Math.round(d), '#e9d5ff', 15); g.sfx.tone(120, 0.1, 'square', 0.05, 50);
  if (K.hp <= 0) {
    K.dying = 2; K.tent = []; P.kraken = 1;
    for (let i = 0; i < 6; i++) S.loot.push({ x: K.x + U.rand(-60, 60), y: K.y + U.rand(-60, 60), gold: 1000, gi: 5, q: 4, t: 60 });
    gainXp(g, 1200); g.sfx.explode(); g.shake(16, 1.2); note('🐙 크라켄을 쓰러뜨렸다! 바다에 보물이 떠오른다', '#e9d5ff');
    g.burst(sx(K.x), sy(K.y), ['#a855f7', '#e9d5ff', '#1e1b4b'], 90, 340, 1.2, 5);
  }
}
// ---------- 항구 ----------
function enterPort(g, port, silent) {
  const P = S.p;
  S.mode = 'port'; S.port = port; S.tab = 0; S.row = 0; P.v = 0; P.sail = 0; P.portLock = port.i;
  const ia = Math.atan2(port.y - (port.y + Math.sin(port.ia)), port.x - (port.x + Math.cos(port.ia)));
  P.x = port.x - Math.cos(port.ia) * 20; P.y = port.y - Math.sin(port.ia) * 20; P.a = ia;
  S.foes = S.foes.filter((f) => U.dist(f.x, f.y, port.x, port.y) > 500 || f.boss);
  S.balls = [];
  // 의뢰 생성
  if (!S.portQuest || S.portQuest.port !== port.i) S.portQuest = mkQuest(port);
  // 배달 완료
  const Q = P.quest;
  if (Q && Q.t === 'deliver' && Q.to === port.i) { P.gold += Q.reward; gainXp(g, Q.xp); note(`📦 배달 완료! +${Q.reward} 골드`, '#4ade80'); g.sfx.win(); P.quest = null; }
  for (const p2 of S.ports) p2.drift = p2.drift.map((d) => U.lerp(d, 1, 0.15));
  if (!silent) { g.sfx.coin(); note(`⚓ ${port.n} 입항 · 자동 저장됨`, '#bae6fd'); }
  S.cam.x = U.clamp(P.x - g.W / 2, 0, WW - g.W); S.cam.y = U.clamp(P.y - g.H / 2, 0, WH - g.H);
  doSave(g);
}
function mkQuest(port) {
  const P = S.p, r = Math.random(), L = P.lv;
  if (r < 0.4) { const ks = ['pirate', 'pirate', 'merchant', 'navy']; const k = ks[U.randi(0, L < 3 ? 1 : 3)]; const n = U.randi(2, 4); return { port: port.i, t: 'hunt', k, n, got: 0, reward: n * (180 + L * 60) * (k === 'navy' ? 1.6 : 1) | 0, xp: n * 40, txt: `${FOE[k].n} ${n}척 격침` }; }
  if (r < 0.75) { let to; do { to = U.randi(0, PORTS.length - 1); } while (to === port.i); const dist = U.dist(port.x, port.y, PORTS[to].x, PORTS[to].y); const qty = U.randi(8, 18); return { port: port.i, t: 'deliver', to, qty, reward: Math.round(dist * 0.35 + qty * 25 + L * 80), xp: 80 + L * 10, txt: `${PORTS[to].n}로 화물 ${qty}상자 배달` }; }
  const I = U.choice(S.wild), a = U.rand(0, 6.28);
  return { port: port.i, t: 'map', cost: 300 + L * 80, x: I.x + Math.cos(a) * (I.r + 40), y: I.y + Math.sin(a) * (I.r + 40), reward: U.randi(1200, 2200) + L * 300, txt: '보물 지도 구매 (섬 해안의 ✖ 표시)' };
}
function portRows() {
  if (S.tab === 0) return GOODS.length;
  if (S.tab === 1) return 1 + HULLS.length + UPG.length;
  if (S.tab === 2) return 5;
  return 1;
}
const PX = 110, PY = 70, PWD = 780, PHT = 500;
function rowY(i) { return PY + 110 + i * (S.tab === 1 ? 32 : 46); }
function portUpd(g, dt) {
  const P = S.p, port = S.port;
  S.msgs.forEach((m) => (m.t -= dt * 0.3)); S.msgs = S.msgs.filter((m) => m.t > 0);
  for (let i = 0; i < 4; i++) { if (g.keyp('Digit' + (i + 1)) || g.clickIn(PX + 20 + i * 150, PY + 50, 140, 36)) { S.tab = i; S.row = 0; g.sfx.click(); } }
  if (g.pressed('left')) { S.tab = (S.tab + 3) % 4; S.row = 0; g.sfx.click(); }
  if (g.pressed('right')) { S.tab = (S.tab + 1) % 4; S.row = 0; g.sfx.click(); }
  const n = portRows();
  if (g.pressed('up')) S.row = (S.row + n - 1) % n;
  if (g.pressed('down')) S.row = (S.row + 1) % n;
  let act = 0;
  if (g.pressed('a')) act = 1;
  if (g.pressed('b')) act = 2;
  const st = pst();
  if (S.tab === 0) {
    for (let i = 0; i < GOODS.length; i++) {
      const y = rowY(i);
      if (g.clickIn(PX + 470, y - 16, 70, 32)) { S.row = i; act = 1; }
      if (g.clickIn(PX + 545, y - 16, 70, 32)) { S.row = i; act = 3; }
      if (g.clickIn(PX + 620, y - 16, 70, 32)) { S.row = i; act = 2; }
      if (g.clickIn(PX + 695, y - 16, 70, 32)) { S.row = i; act = 4; }
    }
    if (act) {
      const gi = S.row, pr = price(port, gi);
      if (act === 1 || act === 3) {
        let q = act === 3 ? 10 : 1; q = Math.min(q, Math.floor(P.gold / pr), st.cargo - cargoUsed());
        if (q <= 0) { g.sfx.beep(160, 0.1); note(P.gold < pr ? '골드가 부족해요' : '화물칸이 가득 찼어요', '#f87171'); return; }
        P.cost[gi] = (P.cost[gi] * P.cargo[gi] + pr * q) / (P.cargo[gi] + q); P.cargo[gi] += q; P.gold -= pr * q; port.drift[gi] *= Math.pow(1.012, q); g.sfx.coin();
      } else {
        let q = act === 4 ? P.cargo[gi] : Math.min(1, P.cargo[gi]);
        if (q <= 0) { g.sfx.beep(160, 0.1); return; }
        const sp = sellPrice(port, gi), profit = (sp - P.cost[gi]) * q;
        P.gold += sp * q; P.cargo[gi] -= q; port.drift[gi] *= Math.pow(0.988, q); if (!P.cargo[gi]) P.cost[gi] = 0;
        P.trade += Math.max(0, profit);
        if (profit > 0) { gainXp(g, Math.round(profit / 8)); g.float(PX + 430, rowY(gi), `+${Math.round(profit)} 이익`, '#4ade80', 16); }
        g.sfx.coin();
      }
    }
  } else if (S.tab === 1) {
    for (let i = 0; i < n; i++) if (g.clickIn(PX + 600, rowY(i) - 14, 150, 28)) { S.row = i; act = 1; }
    if (act === 1) {
      const r = S.row;
      if (r === 0) { const cost = Math.ceil((st.max - P.hull) * 2); if (cost <= 0) return; const pay = Math.min(cost, P.gold); P.hull = Math.min(st.max, P.hull + pay / 2); P.gold -= pay; g.sfx.power(); }
      else if (r <= HULLS.length) {
        const ti = r - 1, H = HULLS[ti], trade = Math.round(HULLS[P.type].price * 0.5), cost = H.price - trade;
        if (ti === P.type || ti < P.type) { g.sfx.beep(160, 0.1); note('더 좋은 배만 살 수 있어요', '#f87171'); return; }
        if (P.gold < cost) { g.sfx.beep(160, 0.1); note('골드가 부족해요', '#f87171'); return; }
        P.gold -= cost; P.type = ti; P.hull = pst().max; g.sfx.win(); note(`🚢 새 배 ${H.n} 구입!`, '#4ade80'); gainXp(g, 100);
        while (cargoUsed() > pst().cargo) { const gi = P.cargo.findIndex((q) => q > 0); if (gi < 0) break; P.cargo[gi]--; }
      } else {
        const U2 = UPG[r - 1 - HULLS.length], lv = P.upg[U2.k] || 0;
        if (lv >= U2.cost.length) { g.sfx.beep(160, 0.1); return; }
        if (P.gold < U2.cost[lv]) { g.sfx.beep(160, 0.1); note('골드가 부족해요', '#f87171'); return; }
        P.gold -= U2.cost[lv]; P.upg[U2.k] = lv + 1; if (U2.k === 'hull') P.hull = pst().max; g.sfx.power(); note(`${U2.e} ${U2.n} Lv${lv + 1}`, '#4ade80');
      }
    }
  } else if (S.tab === 2) {
    for (let i = 0; i < 5; i++) if (g.clickIn(PX + 560, rowY(i) - 18, 190, 36)) { S.row = i; act = 1; }
    if (act === 1) {
      const r = S.row, cost1 = 12 + P.lv * 2;
      if (r === 0 || r === 1) { let q = Math.min(r === 0 ? 1 : st.crewMax - P.crew, st.crewMax - P.crew, Math.floor(P.gold / cost1)); if (q <= 0) { g.sfx.beep(160, 0.1); return; } P.crew += q; P.gold -= q * cost1; g.sfx.coin(); }
      if (r === 2) {
        const Q = S.portQuest;
        if (!Q || P.quest) { g.sfx.beep(160, 0.1); note(P.quest ? '이미 진행 중인 의뢰가 있어요' : '의뢰가 없어요', '#f87171'); return; }
        if (Q.t === 'map') { if (P.gold < Q.cost) { g.sfx.beep(160, 0.1); note('골드가 부족해요', '#f87171'); return; } P.gold -= Q.cost; }
        if (Q.t === 'deliver' && st.cargo - cargoUsed() < Q.qty) { g.sfx.beep(160, 0.1); note('화물칸이 부족해요', '#f87171'); return; }
        P.quest = Q; S.portQuest = null; g.sfx.power(); note('📜 의뢰 수락: ' + Q.txt, '#bae6fd');
      }
      if (r === 3) { if (port.navy || P.bounty < 1) { g.sfx.beep(160, 0.1); return; } const c = Math.round(P.bounty * 6); if (P.gold < c) { g.sfx.beep(160, 0.1); note('골드가 부족해요', '#f87171'); return; } P.gold -= c; P.bounty = 0; g.sfx.coin(); note('🕵️ 뇌물로 현상금을 지웠다', '#4ade80'); }
      if (r === 4 && P.quest) { P.quest = null; g.sfx.drop(); note('의뢰를 포기했어요', '#fca5a5'); }
    }
  } else {
    if (act === 1 || g.clickIn(PX + PWD / 2 - 120, PY + 300, 240, 60)) { leavePort(g); return; }
  }
  if (g.clickIn(PX + PWD - 140, PY + 12, 125, 32)) leavePort(g);
}
function leavePort(g) {
  S.mode = 'sea'; S.p.sail = 1; S.p.v = 30; g.sfx.tone(200, 0.4, 'triangle', 0.06, 400); doSave(g);
}
function portDraw(g, c) {
  const P = S.p, port = S.port, st = pst();
  g.rect(0, 0, g.W, g.H, 'rgba(2,6,23,.6)');
  g.rrect(PX, PY, PWD, PHT, 18, '#3b2a1a', '#d4a373', 4);
  g.rrect(PX + 6, PY + 6, PWD - 12, PHT - 12, 14, '#f5e6c8');
  g.emoji(port.e, PX + 36, PY + 28, 30); g.text(port.n, PX + 62, PY + 28, 24, '#3b2a1a', 'left');
  g.text(`💰 ${P.gold}   📦 ${cargoUsed()}/${st.cargo}   👥 ${P.crew}/${st.crewMax}   🛠️ ${Math.round(P.hull)}/${st.max}`, PX + 250, PY + 28, 15, '#3b2a1a', 'left');
  g.rrect(PX + PWD - 140, PY + 12, 125, 32, 8, '#0369a1'); g.text('⛵ 출항', PX + PWD - 77, PY + 28, 16, '#fff');
  ['🏪 시장', '⚒️ 조선소', '🍺 선술집', '⛵ 출항'].forEach((t, i) => { g.rrect(PX + 20 + i * 150, PY + 50, 140, 36, 10, S.tab === i ? '#92400e' : '#d6c3a0', S.tab === i ? '#fde047' : '#a8956f', 2); g.text(`${i + 1} ${t}`, PX + 90 + i * 150, PY + 68, 16, S.tab === i ? '#fff' : '#3b2a1a'); });
  const ink = '#3b2a1a';
  if (S.tab === 0) {
    g.text('상품', PX + 40, PY + 98, 13, '#7c5c3b', 'left'); g.text('시세(구입/판매)', PX + 210, PY + 98, 13, '#7c5c3b', 'left'); g.text('보유 · 평균가', PX + 340, PY + 98, 13, '#7c5c3b', 'left');
    GOODS.forEach((G, i) => {
      const y = rowY(i), pr = price(port, i), sp = sellPrice(port, i), rel = pr / G.p;
      if (S.row === i) g.rrect(PX + 20, y - 21, PWD - 40, 42, 8, 'rgba(146,64,14,.15)', '#b45309', 2);
      g.emoji(G.e, PX + 45, y, 26); g.text(G.n, PX + 70, y, 17, ink, 'left');
      g.text(`${pr} / ${sp}`, PX + 210, y, 17, rel < 0.8 ? '#15803d' : rel > 1.25 ? '#b91c1c' : ink, 'left');
      g.text(rel < 0.8 ? '싸다!' : rel > 1.25 ? '비싸다!' : '', PX + 300, y, 12, rel < 0.8 ? '#15803d' : '#b91c1c', 'left');
      g.text(`${P.cargo[i]}개` + (P.cargo[i] ? ` · ${Math.round(P.cost[i])}` : ''), PX + 340, y, 15, ink, 'left');
      [['사기', '#15803d'], ['×10', '#166534'], ['팔기', '#b45309'], ['전부', '#92400e']].forEach(([t, col], k) => { g.rrect(PX + 470 + k * 75, y - 16, 70, 32, 8, col); g.text(t, PX + 505 + k * 75, y, 14, '#fff'); });
    });
    g.text('Z 사기 · X 팔기 · 같은 물건을 많이 사고팔면 시세가 변해요', PX + PWD / 2, PY + PHT - 22, 13, '#7c5c3b');
  } else if (S.tab === 1) {
    const rows = [[`🛠️ 수리 (${Math.round(P.hull)}/${st.max})`, `${Math.ceil((st.max - P.hull) * 2)}💰`]];
    HULLS.forEach((H, i) => { const own = i === P.type, cost = H.price - Math.round(HULLS[P.type].price * 0.5); rows.push([`🚢 ${H.n} · 내구${H.hp} 대포${H.gun} 화물${H.cargo} 선원${H.crew}`, own ? '보유 중' : i < P.type ? '-' : `${cost}💰`]); });
    UPG.forEach((u) => { const lv = P.upg[u.k] || 0; rows.push([`${u.e} ${u.n} Lv${lv}/${u.cost.length} · ${u.d}`, lv >= u.cost.length ? 'MAX' : `${u.cost[lv]}💰`]); });
    rows.forEach((r, i) => { const y = rowY(i); if (S.row === i) g.rrect(PX + 20, y - 15, PWD - 40, 30, 6, 'rgba(146,64,14,.15)', '#b45309', 2); g.text(r[0], PX + 36, y, 15, ink, 'left', i === P.type + 1 ? 'bold' : 'normal'); g.rrect(PX + 600, y - 14, 150, 28, 7, r[1] === '보유 중' || r[1] === 'MAX' || r[1] === '-' ? '#a8a29e' : '#15803d'); g.text(r[1], PX + 675, y, 14, '#fff'); });
    g.text('새 배를 사면 기존 배 가격의 50%를 보상받아요', PX + PWD / 2, PY + PHT - 22, 13, '#7c5c3b');
  } else if (S.tab === 2) {
    const Q = S.portQuest, cost1 = 12 + P.lv * 2;
    const rows = [['👤 선원 1명 고용', `${cost1}💰`], ['👥 선원 가득 고용', `${(st.crewMax - P.crew) * cost1}💰`],
      ['📜 의뢰: ' + (Q ? Q.txt + (Q.reward && Q.t !== 'map' ? ` (보상 ${Q.reward})` : '') : '없음'), Q ? (Q.t === 'map' ? `${Q.cost}💰` : '수락') : '-'],
      ['🕵️ 현상금 지우기 (해군 없는 항구만)', port.navy ? '불가' : `${Math.round(P.bounty * 6)}💰`], ['❌ 현재 의뢰 포기', P.quest ? '포기' : '-']];
    rows.forEach((r, i) => { const y = rowY(i); if (S.row === i) g.rrect(PX + 20, y - 21, PWD - 40, 42, 8, 'rgba(146,64,14,.15)', '#b45309', 2); g.text(r[0], PX + 36, y, 16, ink, 'left'); g.rrect(PX + 560, y - 18, 190, 36, 8, r[1] === '-' || r[1] === '불가' ? '#a8a29e' : '#15803d'); g.text(r[1], PX + 655, y, 15, '#fff'); });
    // 소문
    let best = null;
    for (const p2 of S.ports) if (p2 !== port) for (let gi = 0; gi < GOODS.length; gi++) { const r = price(p2, gi) / GOODS[gi].p; if (!best || r > best.r) best = { r, p2, gi }; }
    g.rrect(PX + 20, PY + 360, PWD - 40, 70, 10, '#e7d3a8');
    g.text(`🗣️ 소문: "${best.p2.n}에서 ${GOODS[best.gi].n} 값이 금값이래!"`, PX + 40, PY + 382, 15, ink, 'left');
    g.text(`📌 진행 중: ${P.quest ? P.quest.txt + (P.quest.t === 'hunt' ? ` (${P.quest.got}/${P.quest.n})` : '') : '없음'}`, PX + 40, PY + 410, 15, '#7c2d12', 'left');
  } else {
    g.text(`${RANKS[P.lv - 1]} · Lv ${P.lv}`, PX + PWD / 2, PY + 140, 28, ink);
    g.rect(PX + 240, PY + 175, 300, 14, '#d6c3a0'); g.rect(PX + 240, PY + 175, (300 * P.xp) / needXp(P.lv), 14, '#b45309');
    g.text(`명성 ${P.xp}/${needXp(P.lv)} · 격침 ${P.kills}척 · 무역 이익 ${Math.round(P.trade)} · ${P.day}일째`, PX + PWD / 2, PY + 210, 15, '#7c5c3b');
    g.text(`현상금 ${Math.round(P.bounty)} ${P.bounty >= 300 ? '— 해군 항구 입항 불가!' : ''}`, PX + PWD / 2, PY + 245, 16, P.bounty >= 300 ? '#b91c1c' : ink);
    g.rrect(PX + PWD / 2 - 120, PY + 300, 240, 60, 14, '#0369a1', '#fde047', 3); g.text('⛵ 출항! (Space)', PX + PWD / 2, PY + 330, 22, '#fff');
    g.text(P.lv >= 8 ? (P.admiral ? '👑 전설 달성!' : '⚠️ 제독 블랙우드가 하바나 근해에 있다!') : `Lv8이 되면 해군 제독이 당신을 잡으러 온다`, PX + PWD / 2, PY + 400, 15, '#7c2d12');
  }
  if (S.msgs[0]) g.text(S.msgs[0].s, PX + PWD / 2, PY + PHT + 22, 16, S.msgs[0].col);
}
// ---------- 그리기 ----------
function drawShip(g, c, x, y, a, len, sail, hull, flag, flash) {
  const w = len * 0.36;
  c.save(); c.translate(x, y); c.rotate(a);
  g.poly([[len / 2 + 4, 0], [len / 4, -w / 2], [-len / 2, -w / 2 + 2], [-len / 2, w / 2 - 2], [len / 4, w / 2]], 'rgba(0,0,0,.25)');
  g.poly([[len / 2, 0], [len / 4, -w / 2], [-len / 2, -w / 2], [-len / 2, w / 2], [len / 4, w / 2]], flash ? '#fff' : hull, '#3b1f0b', 2);
  g.poly([[len / 2 - 8, 0], [len / 4 - 2, -w / 2 + 4], [-len / 2 + 4, -w / 2 + 4], [-len / 2 + 4, w / 2 - 4], [len / 4 - 2, w / 2 - 4]], '#b07a45');
  const m = len > 62 ? [-0.25, 0.05, 0.3] : [-0.15, 0.2];
  for (const k of m) { const mx = k * len; c.fillStyle = sail; c.beginPath(); c.ellipse(mx, 0, 6, w * 0.85, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke(); g.circle(mx, 0, 2.5, '#3b1f0b'); }
  g.poly([[-len / 2 - 2, 0], [-len / 2 - 14, -5], [-len / 2 - 14, 5]], flag);
  c.restore();
}
function drawSea(g, c) {
  const cx = S.cam.x, cy = S.cam.y, P = S.p;
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#0b4f7d'); grd.addColorStop(1, '#0a3d63'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  // 파도
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.beginPath();
  const gs = 90, x0 = Math.floor(cx / gs) * gs, y0 = Math.floor(cy / gs) * gs;
  for (let x = x0; x < cx + g.W + gs; x += gs) for (let y = y0; y < cy + g.H + gs; y += gs) { const h = ((x * 7 + y * 13) % 5) * 12, ox = x - cx + h + Math.sin(S.t + y * 0.01) * 10, oy = y - cy + h * 0.6; c.moveTo(ox, oy); c.quadraticCurveTo(ox + 9, oy - 5, ox + 18, oy); }
  c.stroke();
  // 마의 해역
  if (Math.abs(KZ.x - cx - g.W / 2) < KZ.r + g.W) {
    for (let i = 0; i < 5; i++) g.ring(sx(KZ.x), sy(KZ.y), KZ.r * (0.25 + i * 0.18), `rgba(88,28,135,${0.3 - i * 0.05})`, 8);
    c.save(); c.translate(sx(KZ.x), sy(KZ.y)); c.rotate(S.t * 0.5); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); g.line(30, 0, KZ.r * 0.9, 40, 'rgba(192,132,252,.18)', 6); } c.restore();
  }
  // 항적
  for (const w of S.wake) { c.globalAlpha = w.t / 1.6 * 0.5; g.ring(sx(w.x), sy(w.y), 6 + (1.6 - w.t) * 14, '#e0f2fe', 2); } c.globalAlpha = 1;
  // 섬
  for (const I of S.islands) {
    if (I.x + I.r + 60 < cx || I.x - I.r - 60 > cx + g.W || I.y + I.r + 60 < cy || I.y - I.r - 60 > cy + g.H) continue;
    for (const b of I.blobs) g.circle(sx(b.x), sy(b.y), b.r + 22, 'rgba(125,211,252,.35)');
    for (const b of I.blobs) g.circle(sx(b.x), sy(b.y), b.r + 6, '#e9d8a6');
    for (const b of I.blobs) g.circle(sx(b.x), sy(b.y), b.r - 6, '#3f8f3a');
    for (const b of I.blobs) g.circle(sx(b.x) - b.r * 0.2, sy(b.y) - b.r * 0.2, b.r * 0.45, '#4ea845');
    for (const [px, py] of I.palms) g.emoji('🌴', sx(px), sy(py), 26);
  }
  for (const port of S.ports) {
    const x = sx(port.x), y = sy(port.y);
    if (x < -150 || x > g.W + 150 || y < -150 || y > g.H + 150) continue;
    const ix = x + Math.cos(port.ia) * 70, iy = y + Math.sin(port.ia) * 70;
    g.line(x, y, ix, iy, '#7c4a1e', 12);
    g.emoji(port.e, ix + Math.cos(port.ia) * 20, iy + Math.sin(port.ia) * 20, 44);
    g.ring(x, y, 75, 'rgba(253,224,71,.35)', 2);
    g.text(port.n, ix, iy - 50, 15, '#fff'); if (port.navy) g.text('⚓해군', ix, iy - 34, 11, '#93c5fd');
  }
  // 보물 표시
  if (P.quest && P.quest.t === 'map') { const x = sx(P.quest.x), y = sy(P.quest.y); g.text('✖', x, y, 30 + Math.sin(S.t * 5) * 3, '#dc2626'); }
  for (const L of S.loot) g.emoji(L.gi >= 0 ? '📦' : '💰', sx(L.x), sy(L.y) + Math.sin(S.t * 3 + L.x) * 3, 24);
  // 크라켄
  if (S.kraken) {
    const K = S.kraken, kx = sx(K.x), ky = sy(K.y);
    for (const t of K.tent) {
      if (t.warn > 0) { g.ring(sx(t.x), sy(t.y), 50, `rgba(239,68,68,${0.4 + 0.4 * Math.sin(S.t * 20)})`, 3); g.circle(sx(t.x), sy(t.y), 50 * (1 - t.warn), 'rgba(239,68,68,.2)'); }
      else { c.save(); c.translate(sx(t.x), sy(t.y)); c.rotate(Math.sin(S.t * 4 + t.x) * 0.3); g.emoji('🦑', 0, -10, 60 * Math.min(1, t.up * 3)); c.restore(); }
    }
    c.save(); if (K.dying) { c.globalAlpha = K.dying / 2; } if (K.flash > 0) c.filter = 'brightness(2.5)';
    g.emoji('🐙', kx, ky + Math.sin(S.t * 2) * 6, 130); c.restore();
    g.rect(kx - 80, ky - 90, 160, 9, '#3b0764'); g.rect(kx - 80, ky - 90, (160 * Math.max(0, K.hp)) / K.max, 9, '#c084fc'); g.text('크라켄', kx, ky - 104, 14, '#e9d5ff');
  }
  // 적
  for (const f of S.foes) {
    const x = sx(f.x), y = sy(f.y);
    if (x < -120 || x > g.W + 120 || y < -120 || y > g.H + 120) continue;
    c.save(); if (f.sink > 0) c.globalAlpha = f.sink / 2;
    drawShip(g, c, x, y, f.a + (f.sink > 0 ? (2 - f.sink) * 0.4 : 0), f.len * (f.sink > 0 ? 0.7 + f.sink * 0.15 : 1), FOE[f.k].sail, f.boss ? '#5b3a1a' : '#7c4a1e', f.k === 'navy' || f.boss ? '#1d4ed8' : f.k === 'pirate' ? '#111' : f.k === 'hunter' ? '#dc2626' : '#e5e7eb', f.flash > 0);
    c.restore();
    if (f.sink > 0) continue;
    const bw = f.boss ? 110 : 54;
    g.rect(x - bw / 2, y - f.len * 0.5 - 14, bw, 6, '#450a0a'); g.rect(x - bw / 2, y - f.len * 0.5 - 14, (bw * f.hp) / f.max, 6, f.hp < f.max * 0.35 && !f.boss ? '#facc15' : '#ef4444');
    g.text(FOE[f.k].n + (f.aggro && f.k !== 'merchant' ? ' ⚔️' : ''), x, y - f.len * 0.5 - 26, 12, f.aggro ? '#fca5a5' : '#e0f2fe');
    if (f.hp < f.max * 0.35 && !f.boss) g.text('백병전 가능!', x, y + f.len * 0.5 + 10, 11, '#fde047');
  }
  // 플레이어
  const st = pst();
  c.save(); if (P.sinking) c.globalAlpha = Math.max(0, P.sinking / 2); if (P.inv > 0 && Math.floor(S.t * 20) % 2) c.globalAlpha = 0.6;
  drawShip(g, c, sx(P.x), sy(P.y), P.a, st.len, P.sail ? '#f8fafc' : '#cbd5e1', '#8b5a2b', '#111');
  c.restore();
  if (!P.sinking) g.emoji('🏴‍☠️', sx(P.x) - Math.cos(P.a) * st.len * 0.5, sy(P.y) - Math.sin(P.a) * st.len * 0.5 - 18, 18);
  // 사거리 가이드
  const rg = st.range;
  [-1, 1].forEach((s) => { const ready = (s < 0 ? P.rl : P.rr) <= 0, d = P.a + (s * Math.PI) / 2; g.line(sx(P.x) + Math.cos(d) * 24, sy(P.y) + Math.sin(d) * 24, sx(P.x) + Math.cos(d) * (ready ? 60 : 36), sy(P.y) + Math.sin(d) * (ready ? 60 : 36), ready ? 'rgba(253,224,71,.6)' : 'rgba(255,255,255,.2)', 3); });
  // 포탄/효과
  for (const b of S.balls) { g.circle(sx(b.x), sy(b.y) + 2, 4, 'rgba(0,0,0,.3)'); g.circle(sx(b.x), sy(b.y), 4, b.o === 'p' ? '#111' : '#3f0d0d'); }
  for (const f of S.fx) {
    const x = sx(f.x), y = sy(f.y);
    if (f.k === 'splash') { c.globalAlpha = f.t * 2; g.ring(x, y, 4 + (0.5 - f.t) * 30, '#e0f2fe', 2); c.globalAlpha = 1; }
    if (f.k === 'boom') { c.globalAlpha = f.t * 2.8; g.circle(x, y, 14 + (0.35 - f.t) * 40, '#f97316'); g.circle(x, y, 8, '#fde047'); c.globalAlpha = 1; }
    if (f.k === 'smoke') { c.globalAlpha = f.t; g.circle(x, y, 6 + (0.6 - f.t) * 20, '#e5e7eb'); c.globalAlpha = 1; }
    if (f.k === 'dust') { c.globalAlpha = f.t * 2; g.circle(x, y, 10, '#d6c3a0'); c.globalAlpha = 1; }
  }
  // 밤
  const night = Math.max(0, Math.sin((S.t / 120) * Math.PI * 2) * 0.35);
  if (night > 0.02) g.rect(0, 0, g.W, g.H, `rgba(2,6,40,${night})`);
}
function drawHUD(g, c) {
  const P = S.p, st = pst();
  g.rrect(10, 10, 270, 118, 12, 'rgba(15,23,42,.75)');
  g.text(`🏴‍☠️ ${RANKS[P.lv - 1]} Lv${P.lv}`, 22, 28, 16, '#fde047', 'left');
  g.rect(22, 42, 246, 6, '#334155'); g.rect(22, 42, (246 * P.xp) / needXp(P.lv), 6, '#facc15');
  g.text('선체', 22, 62, 13, '#cbd5e1', 'left'); g.rect(60, 55, 208, 14, '#450a0a'); g.rect(60, 55, (208 * Math.max(0, P.hull)) / st.max, 14, P.hull < st.max * 0.3 ? '#ef4444' : '#22c55e'); g.text(`${Math.round(P.hull)}/${st.max}`, 164, 62, 11, '#fff');
  g.text(`💰${P.gold}  👥${P.crew}/${st.crewMax}  📦${cargoUsed()}/${st.cargo}`, 22, 86, 14, '#e2e8f0', 'left');
  g.text(`⛵ 돛 ${['■ 정지', '▮ 1단', '▮▮ 2단', '▮▮▮ 전속'][P.sail]} · ${Math.round(P.v)}노트`, 22, 108, 13, '#93c5fd', 'left');
  // 장전
  [['좌현 Z', P.rl], ['우현 X', P.rr]].forEach(([t, r], i) => { const x = 300 + i * 110; g.rrect(x, 10, 100, 26, 8, 'rgba(15,23,42,.75)'); const k = r <= 0 ? 1 : 1 - r / st.reload; g.rect(x + 4, 30, 92 * k, 3, r <= 0 ? '#facc15' : '#64748b'); g.text(r <= 0 ? `💣 ${t}` : `장전 ${t}`, x + 50, 21, 12, r <= 0 ? '#fde047' : '#94a3b8'); });
  // 현상금
  if (P.bounty > 1) { g.rrect(300, 42, 210, 24, 8, 'rgba(127,29,29,.75)'); g.text(`🎯 현상금 ${Math.round(P.bounty)}${P.bounty >= 100 ? ' · 해군 추격 중' : ''}`, 405, 54, 12, '#fecaca'); }
  // 의뢰
  if (P.quest) { const Q = P.quest; g.rrect(300, P.bounty > 1 ? 72 : 42, 300, 24, 8, 'rgba(15,23,42,.75)'); g.text(`📜 ${Q.txt}${Q.t === 'hunt' ? ` ${Q.got}/${Q.n}` : ''}`, 450, (P.bounty > 1 ? 72 : 42) + 12, 12, '#bae6fd'); }
  // 바람
  const wx = g.W - 50, wy = 50;
  g.circle(wx, wy, 36, 'rgba(15,23,42,.75)'); g.ring(wx, wy, 36, '#64748b', 2);
  g.text('N', wx, wy - 26, 10, '#94a3b8');
  c.save(); c.translate(wx, wy); c.rotate(S.wind); g.poly([[24, 0], [8, -8], [8, 8]], '#38bdf8'); g.line(-22, 0, 10, 0, '#38bdf8', 3); c.restore();
  c.save(); c.translate(wx, wy); c.rotate(P.a); g.line(0, 0, 18, 0, '#fde047', 2); c.restore();
  g.text('바람', wx, wy + 46, 11, '#7dd3fc');
  // 미니맵
  const mw = 200, mh = (mw * WH) / WW, mx = g.W - mw - 10, my = g.H - mh - 10, k = mw / WW;
  g.rrect(mx - 4, my - 4, mw + 8, mh + 8, 8, 'rgba(15,23,42,.8)');
  g.rect(mx, my, mw, mh, '#0c4a6e');
  for (const I of S.islands) g.circle(mx + I.x * k, my + I.y * k, I.r * k + 1, '#4d7c0f');
  for (const port of S.ports) g.circle(mx + port.x * k, my + port.y * k, 3, port.navy ? '#60a5fa' : port.haven ? '#111' : '#fde047');
  g.circle(mx + KZ.x * k, my + KZ.y * k, KZ.r * k, 'rgba(168,85,247,.4)');
  for (const f of S.foes) if (f.boss || U.dist(f.x, f.y, P.x, P.y) < 1200) g.rect(mx + f.x * k - 1.5, my + f.y * k - 1.5, f.boss ? 5 : 3, f.boss ? 5 : 3, f.boss ? '#fbbf24' : f.aggro ? '#ef4444' : '#e5e7eb');
  if (P.quest && P.quest.t === 'map') g.text('✖', mx + P.quest.x * k, my + P.quest.y * k, 10, '#dc2626');
  if (P.quest && P.quest.t === 'deliver') { const T = PORTS[P.quest.to]; g.ring(mx + T.x * k, my + T.y * k, 6, '#4ade80', 2); }
  g.circle(mx + P.x * k, my + P.y * k, 3.5, '#fff');
  g.ring(mx + P.x * k, my + P.y * k, 6, '#fff', 1);
  // 메시지
  S.msgs.forEach((m, i) => { c.globalAlpha = Math.min(1, m.t); g.text(m.s, 20, g.H - 24 - i * 22, 15, m.col, 'left'); }); c.globalAlpha = 1;
}
