let S;
const STEP = 16;
const ACTS = [
  { n: '그린 힐 존 1막', sky: ['#3c8cff', '#bfe3ff'], g1: '#c0682a', g2: '#8a4a1a', top: '#2fbf3f', water: '#2a6cdf', boss: false },
  { n: '그린 힐 존 2막', sky: ['#4c7cef', '#ffd9a8'], g1: '#c0682a', g2: '#8a4a1a', top: '#2fbf3f', water: '#2a6cdf', boss: true },
  { n: '마블 캐니언 1막', sky: ['#5a1a6a', '#ff9a5a'], g1: '#7a5aa0', g2: '#5a3a80', top: '#e0a0ff', water: '#5a1a1a', boss: false },
  { n: '마블 캐니언 2막', sky: ['#1a0a3a', '#ff6a4a'], g1: '#7a5aa0', g2: '#5a3a80', top: '#e0a0ff', water: '#5a1a1a', boss: true },
];
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
GAME({
  title: '음속 고슴도치', w: 960, h: 600, bg: '#3c8cff', controls: 'dpad+ab', aLabel: '점프', bLabel: '스핀',
  help: '←→ 가속 (속도가 붙으면 비탈길·루프를 질주!)\nSpace/Z 점프 (점프 중엔 몸통 박치기)\n달리는 중 ↓ = 구르기 · 멈춘 채 ↓ + 점프 연타 → ↓ 떼기 = 스핀 대시 (X도 차지)\n💍 링이 있으면 맞아도 버틴다 · 100개마다 1UP\n📺 모니터: 링/방어막/신발/무적 · 🚩 골 표지판까지 달려라',
  init(g) { S = { act: 0, lives: 3, rings: 0, total: 0 }; load(g); },
  update(g, dt) {
    const P = S.p;
    S.intro -= dt;
    if (S.goal) return goalSeq(g, dt);
    if (S.dead) { S.dead -= dt; P.vy += 1500 * dt; P.y += P.vy * dt; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`${ACTS[S.act].n} · 총 링 ${S.total}`); respawn(g); } return; }
    S.time += dt;
    P.inv -= dt; P.shoes -= dt; P.star -= dt;
    physics(g, dt);
    if (P.y > g.H + 60) return die(g);
    updObjects(g, dt);
    if (S.boss) updBoss(g, dt);
    const look = U.clamp(P.vx * 0.25, -150, 260);
    S.camT = U.lerp(S.camT, P.x - 380 + look, Math.min(1, dt * 5));
    S.cam = Math.max(0, S.bossLock ? Math.max(S.cam, Math.min(S.camT, S.bossLock)) : S.camT);
    if (S.boss && S.cam >= S.bossLock - 2) { S.cam = S.bossLock; if (P.x < S.cam) { P.x = S.cam; if (P.gs < 0) P.gs = 0; if (P.vx < 0) P.vx = 0; } }
    if (S.boss) P.x = Math.min(P.x, S.bossLock + g.W - 30);
    if (!S.boss && P.x > S.goalX) { S.goal = { t: 0 }; g.sfx.win(); }
    g.info = `${ACTS[S.act].n} · 💍${S.rings} · ❤️${S.lives} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) { drawAll(g, c); },
});
function load(g) {
  const a = S.act, R = rng(a * 11 + 4), rf = (x, y) => x + R() * (y - x), ri = (x, y) => Math.floor(rf(x, y + 1));
  const LEN = 900 + a * 80;
  const G = new Float32Array(LEN).fill(NaN);
  S.loops = []; S.rings_ = []; S.ens = []; S.springs = []; S.boosts = []; S.spikes = []; S.mons = []; S.plats = []; S.posts = [];
  let i = 0, y = 450;
  const flat = (n, yy) => { for (let k = 0; k < n && i < LEN; k++) G[i++] = yy; };
  const slope = (n, y0, y1) => { for (let k = 0; k < n && i < LEN; k++) { const t = k / n; G[i++] = y0 + (y1 - y0) * (0.5 - Math.cos(t * Math.PI) / 2); } };
  const ringLine = (x0, y0, n, dx = 40, dy = 0) => { for (let k = 0; k < n; k++) S.rings_.push({ x: x0 + k * dx, y: y0 + k * dy }); };
  flat(40, y); ringLine(300, y - 50, 5);
  let lastPost = 0;
  while (i < LEN - 80) {
    const x = i * STEP, f = R();
    if (x - lastPost > 3500) { S.posts.push({ x: x + 40, y, on: false }); lastPost = x; flat(10, y); continue; }
    if (f < 0.16) { // 언덕
      const ny = U.clamp(y + rf(-160, 160), 300, 520), n = ri(20, 40); slope(n, y, ny); ringLine(x + 60, Math.min(y, ny) - 70, 4, 50); y = ny;
      if (R() < 0.5) S.ens.push(mkE(R() < 0.6 ? 'bug' : 'crab', i * STEP - 80));
    } else if (f < 0.28) { // 루프
      const ny = U.clamp(y - 60, 320, 500); slope(16, y, Math.max(ny, 470)); y = Math.max(ny, 470);
      flat(10, y); const lx = i * STEP; flat(14, y); S.loops.push({ x: lx, y, r: 120 });
      for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; S.rings_.push({ x: lx + Math.sin(t) * 90, y: y - 120 + Math.cos(t) * 90 }); }
      S.boosts.push({ x: lx - 140, y }); flat(10, y);
    } else if (f < 0.4) { // 구멍 + 점프대
      flat(8, y); S.springs.push({ x: i * STEP - 50, y, p: 0 }); const gap = ri(8, 14); for (let k = 0; k < gap; k++) i++;
      ringLine(i * STEP - gap * STEP + 20, y - 200, Math.floor(gap / 2), 40, 0);
      if (R() < 0.5) S.plats.push({ x: i * STEP - gap * STEP / 2 - 60, y: y - 140, w: 120, ox: i * STEP - gap * STEP / 2 - 60, ax: 0, ay: 0 });
      flat(14, y);
    } else if (f < 0.5) { // 내리막 램프 → 낭떠러지 점프
      const top = Math.max(300, y - 120); slope(24, y, top); flat(4, top); G[i - 1] = top; const ny = Math.min(520, top + 160); y = ny; for (let k = 0; k < 18; k++) G[i++] = ny; S.rings_.push({ x: i * STEP - 300, y: top - 80 }, { x: i * STEP - 260, y: top - 90 }, { x: i * STEP - 220, y: top - 80 });
      S.ens.push(mkE('buzz', i * STEP - 100, top - 150));
    } else if (f < 0.6) { // 가시 + 적
      flat(30, y); S.spikes.push({ x: i * STEP - 300, y, w: 64 }); if (a >= 1) S.spikes.push({ x: i * STEP - 160, y, w: 48 });
      S.ens.push(mkE('bug', i * STEP - 60)); S.mons.push({ x: i * STEP - 400, y, k: U.choice(['ring', 'ring', 'shield', 'shoes', 'star', 'life']), dead: false });
      ringLine(i * STEP - 330, y - 120, 4, 30);
    } else if (f < 0.72) { // 발판 구간
      flat(10, y); const n = ri(3, 5); const gx = i * STEP;
      for (let k = 0; k < n; k++) S.plats.push({ x: gx + k * 200, y: y - 30 - (k % 2) * 70, w: 110, ox: gx + k * 200, ax: a >= 2 && k % 2 ? 60 : 0, ay: a >= 1 && k % 2 === 0 ? 40 : 0, ph: k });
      i += Math.ceil((n * 200) / STEP); flat(12, y); ringLine(gx + 20, y - 100, n * 4, 50);
      S.ens.push(mkE('buzz', gx + 300, y - 220));
    } else if (f < 0.84) { // 부스터 직선
      flat(50, y); S.boosts.push({ x: i * STEP - 760, y }); S.ens.push(mkE('crab', i * STEP - 200)); ringLine(i * STEP - 700, y - 40, 10, 50);
      if (R() < 0.6) S.mons.push({ x: i * STEP - 120, y, k: U.choice(['ring', 'shield', 'shoes']), dead: false });
    } else { // 물결 언덕
      for (let k = 0; k < 60 && i < LEN; k++) G[i++] = y + Math.sin(k / 60 * Math.PI * 3) * 60;
      S.ens.push(mkE('bug', i * STEP - 400)); S.ens.push(mkE('bug', i * STEP - 200)); S.springs.push({ x: i * STEP - 500, y: G[i - 31], p: 0 });
    }
  }
  while (i < LEN) G[i++] = y;
  S.G = G; S.LEN = LEN;
  S.ens.forEach((e) => { if (!e.fly) e.y = gy(e.x) - e.h; });
  S.springs.forEach((s) => (s.y = gy(s.x)));
  S.goalX = (LEN - 50) * STEP; S.boss = null; S.bossLock = 0;
  if (ACTS[a].boss) { S.bossLock = (LEN - 70) * STEP; const y0 = isNaN(G[LEN - 100]) ? 470 : G[LEN - 100]; for (let k = LEN - 100; k < LEN - 72; k++) G[k] = y0 + (470 - y0) * ((k - LEN + 100) / 28); for (let k = LEN - 72; k < LEN; k++) G[k] = 470; S.goalX = 1e9; const cut = S.bossLock - 300; for (const key of ['loops', 'springs', 'boosts', 'spikes', 'mons', 'plats', 'ens']) S[key] = S[key].filter((o) => o.x < cut); }
  S.start = { x: 120, y: G[7] };
  S.time = 0; S.rings = 0; S.scat = []; S.eb = []; S.goal = null; S.intro = 2;
  respawn(g, true);
}
function mkE(type, x, y) { return { type, x, y: y || 0, w: 40, h: 34, vx: type === 'bug' ? -70 : 0, t: Math.random() * 2, dead: false, fly: type === 'buzz', y0: y, dir: -1 }; }
function respawn(g, fresh) {
  const st = S.posts.filter((p) => p.on).pop() || S.start;
  S.p = { x: st.x, y: gy(st.x) - 20, vx: 0, vy: 0, gs: 0, ground: true, ang: 0, roll: false, charge: 0, inv: 0, shield: false, shoes: 0, star: 0, loop: null, face: 1, spinA: 0, plat: null };
  if (!fresh) { S.rings = 0; S.boss = null; S.eb = []; }
  S.cam = Math.max(0, st.x - 380); S.camT = S.cam; S.dead = 0;
}
function gy(x) { const i = x / STEP, i0 = Math.floor(i), t = i - i0; const a = S.G[i0], b = S.G[i0 + 1]; if (isNaN(a) || isNaN(b) || a === undefined || b === undefined) return isNaN(a) || a === undefined ? NaN : a; return a + (b - a) * t; }
function gang(x) { const a = gy(x - 8), b = gy(x + 8); if (isNaN(a) || isNaN(b)) return 0; return Math.atan2(b - a, 16); }
function physics(g, dt) {
  const P = S.p, dir = g.right - g.left;
  const top = P.shoes > 0 ? 900 : 620, accel = P.shoes > 0 ? 900 : 560;
  if (P.loop) return loopPhys(g, dt);
  if (P.ground) {
    const prevX = P.x;
    const th = P.plat ? 0 : gang(P.x);
    P.ang = th;
    // 스핀 대시
    if (g.down && Math.abs(P.gs) < 60 && !P.roll) {
      P.crouch = true; P.gs = 0;
      if (g.pressed('a') || g.pressed('b')) { P.charge = Math.min(P.charge + 260, 1000); g.sfx.tone(300 + P.charge * 0.5, 0.12, 'sawtooth', 0.05, 900); }
      P.charge *= Math.pow(0.6, dt);
    } else if (P.crouch && !g.down) {
      P.crouch = false; if (P.charge > 0) { P.gs = P.face * (750 + P.charge * 0.6); P.roll = true; g.sfx.tone(900, 0.25, 'square', 0.06, 200); P.charge = 0; }
    } else P.crouch = g.down && Math.abs(P.gs) < 60;
    if (!P.crouch) {
      if (g.down && Math.abs(P.gs) > 120 && !P.roll) { P.roll = true; g.sfx.tone(500, 0.1, 'square', 0.04); }
      if (P.roll) { P.gs -= Math.sign(P.gs) * 120 * dt; if (dir && Math.sign(dir) !== Math.sign(P.gs)) P.gs += dir * 400 * dt; if (Math.abs(P.gs) < 60) P.roll = false; }
      else if (dir) { if (Math.sign(P.gs) === -dir && Math.abs(P.gs) > 50) P.gs += dir * 1800 * dt; else if (Math.abs(P.gs) < top) P.gs += dir * accel * dt; P.face = dir; }
      else P.gs -= Math.sign(P.gs) * Math.min(Math.abs(P.gs), 500 * dt);
      P.gs += Math.sin(th) * (P.roll ? 1500 : 1000) * dt;
      P.gs = U.clamp(P.gs, -1500, 1500);
    }
    if (P.gs) P.face = Math.sign(P.gs) || P.face;
    if ((g.pressed('a') || (g.pressed('b') && !P.crouch)) && !P.crouch) {
      const nx = Math.sin(th), ny = -Math.cos(th);
      P.vx = P.gs * Math.cos(th) + nx * 650; P.vy = P.gs * Math.sin(th) + ny * 650;
      P.ground = false; P.jump = true; P.plat = null; g.sfx.jump(); return;
    }
    let nx = P.x + P.gs * Math.cos(th) * dt;
    if (P.plat) {
      const p = P.plat; nx += p.dx || 0; P.x = nx; P.y = p.y;
      if (P.x < p.x - 8 || P.x > p.x + p.w + 8) { P.ground = false; P.plat = null; P.vx = P.gs; P.vy = 0; }
      return;
    }
    const ny = gy(nx);
    if (isNaN(ny)) { P.ground = false; P.vx = P.gs * Math.cos(th); P.vy = P.gs * Math.sin(th); P.x = nx; return; }
    if (ny - P.y > 26 && Math.abs(P.gs) > 150) { P.ground = false; P.vx = P.gs * Math.cos(th); P.vy = P.gs * Math.sin(th); P.x = nx; return; }
    if (P.y - ny > 30) { P.gs = 0; return; }
    P.x = nx; P.y = ny;
    // 루프 진입
    for (const L of S.loops) if (prevX < L.x && P.x >= L.x && P.gs > 0) { P.loop = { L, th: 0, v: P.gs }; P.x = L.x; P.y = L.y; return; }
  } else {
    if (dir) { P.vx += dir * 600 * dt; P.face = dir; }
    P.vx = U.clamp(P.vx, -1500, 1500);
    if (!(g.a || g.b) && P.jump && P.vy < -300) P.vy = -300;
    P.vy = Math.min(P.vy + 1500 * dt, 1100);
    const oy = P.y;
    P.x += P.vx * dt; P.y += P.vy * dt;
    P.ang *= Math.pow(0.02, dt);
    if (P.vy >= 0) {
      for (const p of S.plats) if (P.x > p.x - 6 && P.x < p.x + p.w + 6 && oy <= p.y + 2 && P.y >= p.y - 1) { P.y = p.y; P.ground = true; P.plat = p; P.gs = P.vx; P.jump = false; P.roll = false; return; }
      const gyy = gy(P.x);
      if (!isNaN(gyy) && P.y >= gyy && oy <= gyy + 30) { const th = gang(P.x); P.y = gyy; P.ground = true; P.jump = false; P.roll = g.down && Math.abs(P.vx) > 200; P.gs = P.vx * Math.cos(th) + P.vy * Math.sin(th); P.ang = th; P.plat = null; }
      else if (!isNaN(gyy) && P.y > gyy + 30 && oy > gyy + 30) { /* 벽 아래로 떨어진 경우: 밀어내기 */ P.x -= P.vx * dt; P.vx = 0; }
    }
  }
}
function loopPhys(g, dt) {
  const P = S.p, Lp = P.loop, L = Lp.L, r = L.r, dir = g.right - g.left;
  Lp.v += (-Math.sin(Lp.th) * 1100 + dir * 300 * (Lp.v >= 0 ? 1 : -1) * 0.5) * dt;
  Lp.th += (Lp.v / r) * dt;
  const cx = L.x, cy = L.y - r;
  P.x = cx + Math.sin(Lp.th) * r; P.y = cy + Math.cos(Lp.th) * r;
  P.ang = -Lp.th; P.face = 1;
  const need = (Lp.v * Lp.v) / r + Math.cos(Lp.th) * 1100;
  if (Math.cos(Lp.th) < 0.2 && need < 0 && Lp.th > 0.5) {
    const tx = Math.cos(Lp.th), ty = -Math.sin(Lp.th);
    P.vx = tx * Lp.v; P.vy = ty * Lp.v; P.ground = false; P.loop = null; P.jump = false; P.x += 2; return;
  }
  if (g.pressed('a')) { const tx = Math.cos(Lp.th), ty = -Math.sin(Lp.th); P.vx = tx * Lp.v - Math.sin(Lp.th) * 500; P.vy = ty * Lp.v - Math.cos(Lp.th) * 500; P.ground = false; P.loop = null; P.jump = true; g.sfx.jump(); return; }
  if (Lp.th >= Math.PI * 2) { P.loop = null; P.x = L.x + 2; P.y = L.y; P.gs = Lp.v; P.ground = true; g.add(100, P.x - S.cam, P.y - 60); }
  else if (Lp.th <= 0) { P.loop = null; P.x = L.x - 2; P.y = L.y; P.gs = Lp.v; P.ground = true; }
}
function attacking() { const P = S.p; return P.jump || P.roll || P.star > 0 || P.loop || (!P.ground && P.spin); }
function hurt(g, x) {
  const P = S.p;
  if (P.inv > 0 || P.star > 0) return;
  if (P.shield) { P.shield = false; P.inv = 1.5; g.sfx.hit(); bounceBack(x); return; }
  if (S.rings > 0) {
    const n = Math.min(S.rings, 24);
    for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (k % 2 ? 1 : -1) * (Math.floor(k / 2) * 0.25 + 0.15), sp = k < 12 ? 420 : 260; S.scat.push({ x: P.x, y: P.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 }); }
    S.rings = 0; P.inv = 2; g.sfx.tone(1400, 0.5, 'triangle', 0.08, 300); g.shake(5, 0.2); bounceBack(x); return;
  }
  die(g);
}
function bounceBack(x) { const P = S.p; P.loop = null; P.ground = false; P.plat = null; P.vx = (P.x < x ? -1 : 1) * 260; P.vy = -480; P.jump = false; P.roll = false; }
function die(g) { if (S.dead) return; const P = S.p; S.dead = 2.4; P.vy = -700; P.loop = null; g.sfx.lose(); g.shake(6, 0.3); }
function getRing(g, n = 1) { S.rings += n; S.total += n; g.score += 10 * n; g.sfx.tone(1800, 0.06, 'triangle', 0.05, 2400); if (Math.floor((S.rings - n) / 100) < Math.floor(S.rings / 100)) { S.lives++; g.sfx.power(); g.float(g.W / 2, 120, '1UP!', '#4ade80'); } }
function updObjects(g, dt) {
  const P = S.p, px = P.x, py = P.y - 22, pbox = { x: px - 16, y: P.y - 40, w: 32, h: 40 };
  const vis = (x) => x > S.cam - 100 && x < S.cam + g.W + 100;
  for (const r of S.rings_) if (!r.got && vis(r.x) && Math.abs(r.x - px) < 30 && Math.abs(r.y - py) < 34) { r.got = true; getRing(g); S.spark = S.spark || []; g.burst(r.x - S.cam, r.y, '#fde047', 5, 120, 0.3); }
  for (const s of S.scat) { s.t += dt; s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; const gg = gy(s.x); if (!isNaN(gg) && s.y > gg - 8 && s.vy > 0) { s.y = gg - 8; s.vy *= -0.7; } if (s.t > 0.6 && Math.abs(s.x - px) < 30 && Math.abs(s.y - py) < 34) { s.got = true; getRing(g); } }
  S.scat = S.scat.filter((s) => !s.got && s.t < 4 && s.y < g.H + 50);
  for (const s of S.springs) { s.p = Math.max(0, s.p - dt * 4); if (vis(s.x) && Math.abs(s.x - px) < 26 && Math.abs(P.y - s.y) < 22 && !(P.vy < 0 && !P.ground)) { P.ground = false; P.plat = null; P.loop = null; P.vy = -1150; P.vx = (P.ground ? P.gs : P.vx) || P.vx; P.jump = false; P.spin = true; s.p = 1; g.sfx.bounce(); P.y = s.y - 24; } }
  if (P.ground) P.spin = false;
  for (const b of S.boosts) if (vis(b.x) && P.ground && Math.abs(b.x - px) < 30 && Math.abs(P.y - b.y) < 20) { if (P.gs < 1100) { P.gs = 1100; g.sfx.tone(600, 0.2, 'square', 0.05, 1500); } }
  for (const sp of S.spikes) if (vis(sp.x) && px > sp.x - 10 && px < sp.x + sp.w + 10 && P.y > sp.y - 28 && P.y <= sp.y + 4) hurt(g, sp.x + sp.w / 2);
  for (const pt of S.posts) if (!pt.on && Math.abs(pt.x - px) < 30) { pt.on = true; g.sfx.coin(); g.float(pt.x - S.cam, pt.y - 100, 'CHECK!', '#60a5fa'); }
  for (const p of S.plats) { p.ph = (p.ph || 0) + dt; const nx = p.ox + Math.sin(p.ph * 1.5) * p.ax * 1.5; p.dx = nx - p.x; p.x = nx; if (p.ay) { if (p.oy === undefined) p.oy = p.y; p.y = p.oy + Math.sin(p.ph * 1.5) * p.ay; } }
  for (const m of S.mons) {
    if (m.dead || !vis(m.x)) continue;
    if (U.rectHit(pbox, { x: m.x - 20, y: m.y - 44, w: 40, h: 44 })) {
      if (attacking() || (P.vy > 0 && !P.ground)) { m.dead = true; if (!P.ground) P.vy = -450; g.sfx.explode(); g.burst(m.x - S.cam, m.y - 22, ['#fff', '#94a3b8'], 14, 200);
        if (m.k === 'ring') getRing(g, 10); if (m.k === 'shield') P.shield = true; if (m.k === 'shoes') P.shoes = 15; if (m.k === 'star') P.star = 15; if (m.k === 'life') { S.lives++; g.sfx.power(); }
        g.float(m.x - S.cam, m.y - 70, { ring: '+10 💍', shield: '방어막', shoes: '스피드 업!', star: '무적!', life: '1UP' }[m.k], '#fde047');
      } else if (P.ground) { if (px < m.x) { P.x = m.x - 36; P.gs = Math.min(0, P.gs); } else { P.x = m.x + 36; P.gs = Math.max(0, P.gs); } }
    }
  }
  for (const e of S.ens) {
    if (e.dead || !vis(e.x)) continue;
    e.t += dt;
    if (e.type === 'bug') { e.x += e.vx * dt; const gg = gy(e.x + e.w / 2); if (isNaN(gg) || Math.abs(gg - e.h - e.y) > 30) { e.vx = -e.vx; e.x += e.vx * dt * 2; } else e.y = gg - e.h; }
    if (e.type === 'crab') { e.x += Math.sin(e.t) * 40 * dt; const gg = gy(e.x + e.w / 2); if (!isNaN(gg)) e.y = gg - e.h; if (e.t > 3) { e.t = 0; for (const d of [-1, 1]) S.eb.push({ x: e.x + 20, y: e.y, vx: d * 160, vy: -500, r: 7 }); g.sfx.beep(500, 0.05); } }
    if (e.type === 'buzz') { e.x += -60 * dt; e.y = e.y0 + Math.sin(e.t * 2) * 20; if (e.t > 2.5 && Math.abs(e.x - px) < 400) { e.t = 0; const a = Math.atan2(P.y - 20 - e.y, px - e.x); S.eb.push({ x: e.x + 20, y: e.y + 30, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 7, nog: true }); } }
    if (U.rectHit(pbox, e)) {
      if (attacking()) { e.dead = true; S.chain = (S.chain || 0) + 1; g.add(100 * Math.min(10, S.chain), e.x - S.cam, e.y); g.sfx.explode(); g.burst(e.x + 20 - S.cam, e.y + 17, ['#fff', '#fde047', '#60a5fa'], 14, 220); S.critters = S.critters || []; S.critters.push({ x: e.x + 20, y: e.y, vx: U.rand(-100, 100), vy: -300, t: 0, e: U.choice(['🐰', '🐦', '🐿️']) }); if (!P.ground) { P.vy = Math.min(P.vy, -420); } }
      else hurt(g, e.x + 20);
    }
  }
  if (P.ground) S.chain = 0;
  if (S.critters) { for (const c of S.critters) { c.t += dt; c.vy += 800 * dt; c.x += c.vx * dt; c.y += c.vy * dt; const gg = gy(c.x); if (!isNaN(gg) && c.y > gg - 12) { c.y = gg - 12; c.vy = -320; } } S.critters = S.critters.filter((c) => c.t < 4); }
  for (const b of S.eb) { if (!b.nog) b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.t = (b.t || 0) + dt; if (b.y > g.H + 30 || b.t > 5) b.dead = true; if (!b.dead && Math.hypot(b.x - px, b.y - py) < b.r + 18) { b.dead = true; hurt(g, b.x); } }
  S.eb = S.eb.filter((b) => !b.dead);
  // 보스 시작
  if (S.bossLock && !S.boss && !S.bossDone && P.x > S.bossLock + 200) { S.boss = { x: S.bossLock + 700, y: 200, hp: 8, inv: 0, t: 0, st: 'hover', dir: -1 }; g.sfx.tone(100, 0.8, 'sawtooth', 0.08, 50); }
}
function updBoss(g, dt) {
  const B = S.boss, P = S.p;
  if (B.dying) { B.dying -= dt; B.y += 60 * dt; if (Math.random() < 0.3) g.burst(B.x - S.cam + U.rand(-40, 40), B.y + U.rand(-30, 30), ['#f97316', '#fff'], 6, 160); if (B.dying <= 0) { S.boss = null; S.bossDone = true; S.goalX = S.bossLock + 760; S.goalSign = S.goalX; } return; }
  B.t += dt; B.inv -= dt;
  const L = S.bossLock + 120, Rr = S.bossLock + g.W - 120, hard = 1 + S.act * 0.15;
  if (B.st === 'hover') { B.x += B.dir * 170 * hard * dt; B.y = U.lerp(B.y, 190 + Math.sin(B.t * 3) * 20, dt * 3); if (B.x < L) B.dir = 1; if (B.x > Rr) B.dir = -1; if (B.t > 3.2 / hard) { B.t = 0; B.st = Math.random() < 0.5 ? 'swoop' : 'bomb'; B.tx = P.x; } }
  else if (B.st === 'swoop') { const ty = 400; B.x = U.lerp(B.x, B.tx, dt * 2); B.y = U.lerp(B.y, ty, dt * 2.2); if (B.t > 1.6) { B.st = 'hover'; B.t = 0; } }
  else if (B.st === 'bomb') { if (B.t % 0.45 < dt) { S.eb.push({ x: B.x, y: B.y + 40, vx: U.rand(-60, 60), vy: 0, r: 12, bomb: true }); g.sfx.drop(); } B.x += B.dir * 120 * dt; if (B.x < L) B.dir = 1; if (B.x > Rr) B.dir = -1; if (B.t > 2.2) { B.st = 'hover'; B.t = 0; } }
  if (Math.hypot(B.x - P.x, B.y - (P.y - 20)) < 60) {
    if (attacking() && B.inv <= 0) { B.hp--; B.inv = 1; g.sfx.hit(); g.shake(6, 0.2); g.add(500, B.x - S.cam, B.y - 40); P.vx = (P.x < B.x ? -1 : 1) * 300; P.vy = -500; P.ground = false; P.plat = null; P.jump = true; if (B.hp <= 0) { B.dying = 2.5; g.add(5000, B.x - S.cam, B.y); g.sfx.explode(); g.shake(10, 0.6); } }
    else if (B.inv <= 0.5) hurt(g, B.x);
  }
}
function goalSeq(g, dt) {
  const G = S.goal, P = S.p;
  G.t += dt;
  if (P.ground) { P.gs *= Math.pow(0.1, dt); P.x += P.gs * dt; const yy = gy(P.x); if (!isNaN(yy)) P.y = yy; } else { P.vy += 1500 * dt; P.x += P.vx * dt; P.y += P.vy * dt; const yy = gy(P.x); if (!isNaN(yy) && P.y >= yy) { P.y = yy; P.ground = true; P.gs = P.vx; } }
  if (!G.bonus && G.t > 1.5) { G.bonus = true; G.tb = S.time < 30 ? 50000 : S.time < 45 ? 10000 : S.time < 60 ? 5000 : S.time < 90 ? 4000 : S.time < 120 ? 3000 : S.time < 180 ? 1000 : 500; G.rb = S.rings * 100; g.score += G.tb + G.rb; g.sfx.coin(); }
  if (G.t > 5) { S.act++; if (S.act >= ACTS.length) return g.win(`모든 존 클리어! 총 링 ${S.total}`); S.bossDone = false; S.goalSign = 0; load(g); }
}
// ---------- 그리기 ----------
function drawAll(g, c) {
  const A = ACTS[S.act];
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, A.sky[0]); grd.addColorStop(1, A.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 6; i++) { const x = ((i * 300 - S.cam * 0.1) % 1800 + 1800) % 1800 - 150; g.emoji('☁️', x, 60 + (i % 3) * 35, 54); }
  for (let i = 0; i < 8; i++) { const x = ((i * 260 - S.cam * 0.3) % 2080 + 2080) % 2080 - 200; c.fillStyle = 'rgba(30,90,60,.45)'; c.beginPath(); c.moveTo(x, 470); c.lineTo(x + 120, 300 + (i % 3) * 40); c.lineTo(x + 240, 470); c.fill(); }
  g.rect(0, 470, g.W, 130, A.water); for (let i = 0; i < 12; i++) g.rect(((i * 90 - S.cam * 0.5) % 1080 + 1080) % 1080 - 60, 480 + (i % 4) * 25, 50, 3, 'rgba(255,255,255,.35)');
  c.save(); c.translate(-Math.round(S.cam), 0);
  // 지형
  const i0 = Math.max(0, Math.floor(S.cam / STEP) - 1), i1 = Math.min(S.LEN - 2, i0 + Math.ceil(g.W / STEP) + 2);
  for (let i = i0; i <= i1; i++) {
    const a = S.G[i], b = S.G[i + 1]; if (isNaN(a) || isNaN(b)) continue;
    const x = i * STEP;
    c.fillStyle = Math.floor(i / 4) % 2 ? A.g1 : A.g2; c.beginPath(); c.moveTo(x, a); c.lineTo(x + STEP + 0.5, b); c.lineTo(x + STEP + 0.5, g.H); c.lineTo(x, g.H); c.fill();
    const band = Math.floor(i / 4) % 2 ? A.g2 : A.g1; c.fillStyle = band; c.fillRect(x, Math.max(a, b) + 60, STEP + 0.5, 50); c.fillRect(x, Math.max(a, b) + 170, STEP + 0.5, 50);
  }
  c.strokeStyle = A.top; c.lineWidth = 10; c.lineJoin = 'round'; c.beginPath(); let pen = false;
  for (let i = i0; i <= i1 + 1; i++) { const a = S.G[i]; if (isNaN(a)) { pen = false; continue; } if (!pen) { c.moveTo(i * STEP, a + 4); pen = true; } else c.lineTo(i * STEP, a + 4); }
  c.stroke();
  // 루프
  for (const L of S.loops) { if (L.x < S.cam - 200 || L.x > S.cam + g.W + 200) continue; c.strokeStyle = A.g2; c.lineWidth = 26; c.beginPath(); c.arc(L.x, L.y - L.r, L.r + 13, 0, Math.PI * 2); c.stroke(); c.strokeStyle = A.top; c.lineWidth = 8; c.beginPath(); c.arc(L.x, L.y - L.r, L.r + 2, 0, Math.PI * 2); c.stroke(); c.strokeStyle = A.g1; c.setLineDash([16, 16]); c.lineWidth = 14; c.beginPath(); c.arc(L.x, L.y - L.r, L.r + 16, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
  for (const p of S.plats) { if (p.x < S.cam - 200 || p.x > S.cam + g.W + 100) continue; g.rrect(p.x, p.y, p.w, 22, 6, A.g1, '#000', 2); g.rect(p.x, p.y, p.w, 6, A.top); }
  for (const s of S.springs) { const h = 14 + s.p * 14; g.rect(s.x - 14, s.y - h, 28, h, '#9ca3af'); g.rrect(s.x - 20, s.y - h - 8, 40, 10, 3, '#ef4444', '#7f1d1d'); }
  for (const b of S.boosts) { const ph = Math.floor(g.time * 8) % 2; g.rrect(b.x - 30, b.y - 8, 60, 10, 4, '#facc15', '#a16207'); g.text('▶▶', b.x, b.y - 3, 12, ph ? '#ef4444' : '#7f1d1d'); }
  for (const sp of S.spikes) { for (let k = 0; k < sp.w; k += 16) g.poly([[sp.x + k, sp.y], [sp.x + k + 8, sp.y - 22], [sp.x + k + 16, sp.y]], '#e5e7eb', '#4b5563', 1); }
  for (const pt of S.posts) { g.rect(pt.x - 3, pt.y - 70, 6, 70, '#1d4ed8'); g.circle(pt.x, pt.y - 74, 9, pt.on ? '#ef4444' : '#60a5fa'); }
  for (const m of S.mons) { if (m.dead) { g.rect(m.x - 18, m.y - 10, 36, 10, '#374151'); continue; } g.rrect(m.x - 20, m.y - 44, 40, 44, 6, '#d1d5db', '#4b5563'); g.rect(m.x - 14, m.y - 38, 28, 24, '#111827'); g.emoji({ ring: '💍', shield: '🛡️', shoes: '👟', star: '⭐', life: '🦔' }[m.k], m.x, m.y - 26, 20); }
  const rs = Math.abs(Math.sin(g.time * 5));
  for (const r of S.rings_) { if (r.got || r.x < S.cam - 30 || r.x > S.cam + g.W + 30) continue; c.strokeStyle = '#facc15'; c.lineWidth = 4; c.beginPath(); c.ellipse(r.x, r.y, 3 + rs * 8, 11, 0, 0, Math.PI * 2); c.stroke(); }
  for (const s of S.scat) { if (s.t > 3 && Math.floor(g.time * 12) % 2) continue; c.strokeStyle = '#facc15'; c.lineWidth = 3; c.beginPath(); c.ellipse(s.x, s.y, 9, 9, 0, 0, Math.PI * 2); c.stroke(); }
  for (const e of S.ens) { if (e.dead || e.x < S.cam - 60 || e.x > S.cam + g.W + 60) continue; c.save(); c.translate(e.x + 20, e.y + 17); if (e.vx > 0) c.scale(-1, 1); g.emoji(e.type === 'bug' ? '🐞' : e.type === 'crab' ? '🦀' : '🐝', 0, 0, 40); c.restore(); }
  if (S.critters) for (const cr of S.critters) g.emoji(cr.e, cr.x, cr.y, 22);
  for (const b of S.eb) { if (b.bomb) g.emoji('💣', b.x, b.y, 26); else { g.circle(b.x, b.y, b.r, '#f97316'); g.circle(b.x, b.y, b.r * 0.5, '#fff'); } }
  if (S.boss) { const B = S.boss; if (!(B.inv > 0 && Math.floor(g.time * 20) % 2)) { g.circle(B.x, B.y + 6, 44, '#9ca3af'); g.rect(B.x - 44, B.y + 4, 88, 10, '#4b5563'); g.circle(B.x, B.y - 18, 26, 'rgba(186,230,253,.6)'); g.emoji('🥸', B.x, B.y - 18, 36); g.emoji('🔥', B.x, B.y + 56 + Math.sin(g.time * 30) * 3, 24); } }
  const gx = S.goalSign || (S.goalX < 1e8 ? S.goalX : 0);
  if (gx) { const gyy = gy(gx) || 470; g.rect(gx - 3, gyy - 90, 6, 90, '#6b7280'); c.save(); c.translate(gx, gyy - 110); c.scale(S.goal ? Math.cos(S.goal.t * 12 * Math.max(0, 1 - S.goal.t / 2)) : 1, 1); g.circle(0, 0, 30, '#fde047'); g.emoji(S.goal && S.goal.t > 2 ? '🦔' : '🥸', 0, 0, 36); c.restore(); }
  drawPlayer(g, c);
  c.restore();
  // HUD
  g.text(`💍 ${S.rings}`, 20, 26, 26, S.rings === 0 && Math.floor(g.time * 3) % 2 ? '#ef4444' : '#fde047', 'left');
  g.text(`⏱️ ${U.fmtTime(S.time)}`, 20, 58, 20, '#fff', 'left');
  const spd = Math.abs(S.p.loop ? S.p.loop.v : S.p.ground ? S.p.gs : S.p.vx);
  g.rect(g.W - 220, 18, 200, 14, 'rgba(0,0,0,.4)'); g.rect(g.W - 220, 18, Math.min(200, spd / 7.5), 14, spd > 900 ? '#ef4444' : spd > 600 ? '#facc15' : '#60a5fa'); g.text('SPEED', g.W - 120, 46, 14, '#fff');
  if (S.p.shoes > 0) g.text('👟 ' + Math.ceil(S.p.shoes), g.W - 280, 26, 18, '#fff');
  if (S.p.star > 0) g.text('⭐ ' + Math.ceil(S.p.star), g.W - 330, 26, 18, '#fff');
  if (S.boss) { g.text('닥터 에그', g.W / 2, 26, 18, '#fff'); for (let k = 0; k < 8; k++) g.rect(g.W / 2 - 80 + k * 20, 40, 16, 10, k < S.boss.hp ? '#ef4444' : '#374151'); }
  if (S.intro > 0) { g.rrect(g.W / 2 - 260, 200, 520, 120, 16, 'rgba(0,0,40,.75)', '#fde047', 4); g.text(A.n, g.W / 2, 245, 40, '#fff'); g.text('GO!', g.W / 2, 290, 26, '#fde047'); }
  if (S.goal && S.goal.bonus) { g.rrect(g.W / 2 - 220, 180, 440, 170, 16, 'rgba(0,0,40,.8)', '#fde047', 3); g.text('ACT CLEAR!', g.W / 2, 215, 38, '#fde047'); g.text(`타임 보너스  ${S.goal.tb}`, g.W / 2, 268, 22, '#fff'); g.text(`링 보너스  ${S.goal.rb}`, g.W / 2, 308, 22, '#fff'); }
}
function drawPlayer(g, c) {
  const P = S.p;
  if (P.inv > 0 && Math.floor(g.time * 16) % 2 && !S.dead) return;
  const spinning = P.jump || P.roll || P.spin || (P.crouch && P.charge > 0);
  c.save(); c.translate(P.x, P.y);
  if (S.dead) { g.emoji('😵', 0, -24, 46); c.restore(); return; }
  c.rotate(P.ground || P.loop ? P.ang : 0);
  if (P.star > 0) for (let k = 0; k < 5; k++) { const a = g.time * 8 + k * 1.26; g.emoji('✨', Math.cos(a) * 34, -24 + Math.sin(a) * 34, 16); }
  if (P.shield) g.circle(0, -24, 34, `rgba(96,165,250,${0.25 + Math.sin(g.time * 10) * 0.1})`);
  if (spinning) {
    c.save(); c.translate(0, -20); c.rotate(g.time * 28 * P.face);
    g.circle(0, 0, 20, '#1d4ed8'); for (let k = 0; k < 4; k++) { const a = k * 1.57; g.poly([[Math.cos(a) * 12, Math.sin(a) * 12], [Math.cos(a + 0.6) * 24, Math.sin(a + 0.6) * 24], [Math.cos(a + 0.9) * 12, Math.sin(a + 0.9) * 12]], '#2563eb'); }
    g.circle(6, 4, 6, '#fcd9b6'); c.restore();
    if (P.crouch && P.charge > 0) for (let k = 0; k < 3; k++) g.circle(-P.face * (24 + k * 10), -6 + Math.random() * 6, 5 - k, 'rgba(255,255,255,.7)');
  } else {
    c.scale(P.face, 1);
    const sp = Math.abs(P.loop ? P.loop.v : P.gs), run = sp > 30, fast = sp > 650, ph = g.time * (8 + sp / 40);
    if (fast) { for (let k = 0; k < 2; k++) { c.strokeStyle = '#ef4444'; c.lineWidth = 6; c.beginPath(); c.arc(4 + k * 6, -6, 9, 0, Math.PI * 2); c.stroke(); } }
    else { const a = run ? Math.sin(ph) * 9 : 0; g.rect(-6 + a, -14, 6, 12, '#2563eb'); g.rect(2 - a, -14, 6, 12, '#2563eb'); g.rrect(-10 + a, -4, 14, 6, 3, '#dc2626'); g.rrect(-2 - a, -4, 14, 6, 3, '#dc2626'); }
    g.circle(0, -24, 14, '#2563eb'); g.poly([[-10, -36], [-30, -32], [-12, -26], [-30, -20], [-12, -16], [-26, -8], [-6, -12]], '#2563eb');
    g.circle(6, -20, 8, '#fcd9b6'); g.circle(5, -30, 7, '#fff'); g.circle(8, -30, 3, '#065f46'); g.circle(15, -22, 3, '#111');
    g.circle(-2, -14, 6, '#fcd9b6');
  }
  c.restore();
}
