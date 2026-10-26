let S;
const T = 40, ROWS = 15;
const WORLDS = [
  { n: '월드 1 · 버섯 초원', sky: ['#5c94fc', '#a8d0ff'], ground: '#c84c0c', top: '#00a800', deco: '☁️', hill: 'rgba(0,140,0,.35)' },
  { n: '월드 2 · 지하 동굴', sky: ['#000', '#101830'], ground: '#0060a0', top: '#3cbcfc', deco: null, hill: 'rgba(40,80,160,.3)', under: true },
  { n: '월드 3 · 구름 위 숲', sky: ['#78c8ff', '#e0f4ff'], ground: '#a05a20', top: '#60d060', deco: '☁️', hill: 'rgba(255,255,255,.5)', sky2: true },
  { n: '월드 4 · 쿠파의 요새', sky: ['#1a0000', '#3a0a0a'], ground: '#707070', top: '#a0a0a0', deco: null, hill: 'rgba(80,0,0,.4)', castle: true },
  { n: '월드 5 · 사막 피라미드', sky: ['#fca044', '#fde0a8'], ground: '#b06010', top: '#f0b060', deco: '🌵', hill: 'rgba(200,120,40,.4)' },
  { n: '월드 6 · 얼음 나라', sky: ['#9cd4ff', '#ffffff'], ground: '#6ab0e0', top: '#ffffff', deco: '⛄', hill: 'rgba(200,230,255,.6)', ice: true },
  { n: '월드 7 · 파이프 정글', sky: ['#0c2c3c', '#3c8c6c'], ground: '#406020', top: '#80c040', deco: '🌴', hill: 'rgba(0,80,40,.4)' },
  { n: '월드 8 · 마왕 성', sky: ['#000', '#400010'], ground: '#505050', top: '#909090', deco: null, hill: 'rgba(120,0,0,.4)', castle: true },
];
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
GAME({
  title: '슈퍼 브라더스', w: 960, h: 600, bg: '#5c94fc', controls: 'lr+ab', aLabel: '점프', bLabel: '대시/불',
  help: '←→ 이동 · Space/Z/↑ 점프 (꾹 = 높이)\nX/Shift 꾹 = 달리기 · 🌼 상태에서 X = 파이어볼\n❓블록을 머리로 치면 🍄 버섯 / 🌼 꽃 / ⭐ 무적 / 🟢 1UP\n적은 밟아서! 🐢 등껍질은 차서 날리기\n🚩 깃발 높이 잡을수록 보너스 · 4/8월드 성에서는 🪓 도끼로 다리를 끊어라',
  init(g) { S = { w: 0, lives: 3, coins: 0, pw: 0 }; load(g); },
  update(g, dt) {
    const P = S.p;
    if (S.intro > 0) { S.intro -= dt; return; }
    if (S.clear) return clearSeq(g, dt);
    if (S.dead) { S.dead -= dt; P.vy += 1500 * dt; P.y += P.vy * dt; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`${WORLDS[S.w].n} · 코인 ${S.coins}`); S.pw = 0; load(g); } return; }
    if (S.grow > 0) { S.grow -= dt; return; }
    S.time -= dt * 2.5; if (S.time <= 0) return die(g);
    const run = g.b, dir = g.right - g.left;
    const max = run ? 340 : 210, acc = P.ground ? (WORLDS[S.w].ice ? 600 : 1400) : 900;
    if (dir) { P.vx += dir * acc * dt; P.face = dir; if (P.ground && Math.sign(P.vx) !== dir && Math.abs(P.vx) > 120) P.skid = 0.1; }
    else if (P.ground) P.vx *= Math.pow(WORLDS[S.w].ice ? 0.3 : 0.0004, dt);
    P.vx = U.clamp(P.vx, -max, max);
    P.coyote = P.ground ? 0.08 : P.coyote - dt;
    P.buf = (g.pressed('a') || g.pressed('up')) ? 0.12 : P.buf - dt;
    if (P.buf > 0 && P.coyote > 0) { P.vy = -640 - Math.abs(P.vx) * 0.22; P.buf = 0; P.coyote = 0; g.sfx.jump(); }
    if (!(g.a || g.up) && P.vy < -220) P.vy = -220;
    P.vy = Math.min(P.vy + 1750 * dt, 900);
    P.h = S.pw ? 70 : 36;
    ridePlat(P, dt);
    collide(g, P, dt, true);
    if (P.x < S.cam) { P.x = S.cam; P.vx = Math.max(0, P.vx); }
    if (P.y > g.H + 40) return die(g);
    P.inv -= dt; S.star -= dt; P.anim += Math.abs(P.vx) * dt;
    if (S.pw === 2 && g.pressed('b') && S.fire.length < 2) { S.fire.push({ x: P.x + P.w / 2, y: P.y + 24, vx: P.face * 520, vy: 150, w: 14, h: 14 }); g.sfx.shoot(); }
    updFire(g, dt); updPlats(g, dt); updEnemies(g, dt); updItems(g, dt); updHazards(g, dt);
    for (const c of S.coinsOn) if (!c.got && U.rectHit(P, { x: c.x * T + 8, y: c.y * T + 4, w: 24, h: 32 })) { c.got = true; coin(g); }
    S.pops = S.pops.filter((p) => (p.t -= dt) > 0);
    S.bumps = S.bumps.filter((b) => (b.t -= dt) > 0);
    S.debris = S.debris.filter((d) => { d.vy += 1500 * dt; d.x += d.vx * dt; d.y += d.vy * dt; return d.y < g.H + 50; });
    if (!S.castle && P.x + P.w > S.flagX * T + 14) {
      const h = U.clamp(13 * T - P.y, 0, 9 * T), pts = h > 8 * T ? 5000 : h > 6 * T ? 2000 : h > 4 * T ? 800 : h > 2 * T ? 400 : 100;
      g.add(pts, P.x - S.cam, P.y); g.sfx.win(); S.clear = { t: 0, kind: 'flag', flagY: P.y }; P.x = S.flagX * T; P.vx = 0;
    }
    if (S.castle && S.axe && U.rectHit(P, { x: S.axe.x * T, y: S.axe.y * T, w: T, h: T })) { S.clear = { t: 0, kind: 'axe' }; g.sfx.power(); P.vx = 0; }
    S.cam = U.clamp(Math.max(S.cam, P.x - 400), 0, S.W * T - g.W);
    g.info = `${WORLDS[S.w].n} · ❤️${S.lives} · 🪙${S.coins} · ⏱️${Math.ceil(S.time)}`;
  },
  draw(g, c) { drawAll(g, c); },
});
function load(g) {
  const w = S.w, W0 = WORLDS[w], R = rng(w * 13 + 7), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const W = 190 + w * 12;
  const M = Array.from({ length: ROWS }, () => Array(W).fill(' '));
  S.coinsOn = []; S.ens = []; S.q = {}; S.plats = []; S.bars = []; S.cannons = [];
  const ground = (x, top = 13) => { for (let y = top; y < ROWS; y++) M[y][x] = '#'; };
  const en = (type, x, y, o = {}) => S.ens.push(Object.assign({ type, x: x * T + 3, y: y * T - 36, w: 34, h: 36, vx: -60 - w * 6, vy: 0, dead: false, t: 0 }, o));
  const pipe = (x, h, plant) => { for (let y = 13 - h; y < 13; y++) { M[y][x] = y === 13 - h ? 'P' : 'p'; M[y][x + 1] = y === 13 - h ? 'Q' : 'q'; } if (plant) S.ens.push({ type: 'plant', x: x * T + 20 - 16, y: (13 - h) * T, by: (13 - h) * T, w: 32, h: 40, vx: 0, vy: 0, t: R() * 3, out: 0 }); };
  const qb = (x, y, item) => { M[y][x] = '?'; if (item) S.q[x + ',' + y] = item; };
  if (W0.under || W0.castle) for (let x = 0; x < W; x++) M[0][x] = '#';
  for (let x = 0; x < 14; x++) ground(x);
  let x = 14; const D = w;
  while (x < W - (W0.castle ? 44 : 30)) {
    const f = R();
    if (f < 0.13) { // 구멍
      const gw = ri(2, Math.min(5, 3 + Math.floor(D / 3))); if (W0.castle) { for (let k = 0; k < gw; k++) { M[14][x + k] = 'L'; } } x += gw; if (W0.sky2 || D >= 3) { const pw = 3; S.plats.push({ x: (x - gw) * T, y: 9 * T, w: pw * T, h: 14, ox: (x - gw) * T, oy: 9 * T, ax: R() < 0.5 ? 0 : 60, ay: R() < 0.5 ? 70 : 0, ph: R() * 6, sp: 1 + R() }); } for (let k = 0; k < 2; k++) ground(x + k); x += 2;
    } else if (f < 0.26) { // 파이프
      for (let k = 0; k < 6; k++) ground(x + k); pipe(x + 2, ri(2, 4), D >= 1 && R() < 0.6); if (R() < 0.5) en('goomba', x + 5, 13); x += 6;
    } else if (f < 0.46) { // 블록 + 적
      const w2 = ri(6, 10); for (let k = 0; k < w2; k++) ground(x + k);
      const bx = x + 1, bw = ri(3, 5);
      for (let k = 0; k < bw; k++) { if (R() < 0.38) qb(bx + k, 9, R() < 0.35 ? 'power' : R() < 0.08 ? 'star' : R() < 0.05 ? 'life' : null); else { M[9][bx + k] = 'B'; if (R() < 0.08) S.q[(bx + k) + ',9'] = 'multi'; } }
      if (R() < 0.45) { for (let k = 1; k < bw - 1; k++) M[5][bx + k] = R() < 0.3 ? '?' : 'B'; for (let k = 1; k < bw - 1; k++) S.coinsOn.push({ x: bx + k, y: 4 }); }
      for (let k = 0; k < 1 + (D > 2) + (D > 5); k++) { const r = R(); en(r < 0.3 + D * 0.05 ? (D >= 2 && R() < 0.4 ? 'para' : 'koopa') : 'goomba', x + ri(2, w2 - 1), 13); }
      x += w2;
    } else if (f < 0.58) { // 계단
      const h = ri(3, 4 + Math.min(2, Math.floor(D / 2))); for (let k = 0; k < h * 2 + 2; k++) ground(x + k);
      for (let i = 0; i < h; i++) for (let y = 12 - i; y < 13; y++) { M[y][x + i] = 'S'; M[y][x + h * 2 + 1 - i] = 'S'; }
      if (R() < 0.5 || D >= 4) { M[13][x + h] = W0.castle ? 'L' : ' '; M[14][x + h] = W0.castle ? 'L' : ' '; M[13][x + h + 1] = W0.castle ? 'L' : ' '; M[14][x + h + 1] = W0.castle ? 'L' : ' '; }
      x += h * 2 + 2;
    } else if (f < 0.68) { // 코인 아치 + 적
      const w2 = ri(7, 10); for (let k = 0; k < w2; k++) ground(x + k);
      for (let i = 0; i < 6; i++) S.coinsOn.push({ x: x + 1 + i, y: 10 - Math.round(Math.sin((i / 5) * Math.PI) * 3) });
      en(R() < 0.5 ? 'goomba' : 'koopa', x + w2 - 2, 13); if (D >= 4) en('bro', x + w2 - 4, 13, { vx: 0, w: 34, h: 40, hp: 1 });
      x += w2;
    } else if (f < 0.78 && (W0.castle || D >= 3)) { // 파이어바
      const w2 = 8; for (let k = 0; k < w2; k++) ground(x + k); M[9][x + 4] = 'U'; S.bars.push({ cx: (x + 4) * T + 20, cy: 9 * T + 20, a: R() * 6, sp: (R() < 0.5 ? 1 : -1) * (1.6 + D * 0.08), n: 5 + (D > 5) }); x += w2;
    } else if (f < 0.88 && D >= 2) { // 대포
      const w2 = 8; for (let k = 0; k < w2; k++) ground(x + k); M[12][x + 5] = 'C'; M[11][x + 5] = 'C'; S.cannons.push({ x: x + 5, y: 11, t: R() * 3 }); en('goomba', x + 2, 13); x += w2;
    } else { // 평지 무리
      const w2 = ri(6, 9); for (let k = 0; k < w2; k++) ground(x + k);
      const n = 1 + Math.floor(D / 3); for (let i = 0; i < n; i++) en('goomba', x + 2 + i, 13);
      if (R() < 0.4) { M[9][x + 2] = 'B'; qb(x + 3, 9, 'power'); M[9][x + 4] = 'B'; }
      x += w2;
    }
  }
  S.castle = !!W0.castle;
  if (S.castle) {
    for (let k = 0; k < 8; k++) ground(x + k, k < 2 ? 12 : k < 4 ? 11 : 10); x += 8;
    const bx = x; for (let k = 0; k < 16; k++) { M[10][x + k] = 'b'; M[14][x + k] = 'L'; } x += 16;
    for (let k = 0; k < 14; k++) ground(x + k, 10); for (let y = 1; y < 6; y++) M[y][bx + 15] = ' ';
    S.axe = { x: x + 1, y: 9 }; S.bridge = { x0: bx, x1: bx + 15 };
    S.ens.push({ type: 'bowser', x: (bx + 11) * T, y: 10 * T - 80, w: 70, h: 80, vx: -50, vy: 0, t: 0, hp: 5 + (w === 7 ? 3 : 0), dead: false, face: -1 });
    S.flagX = W + 10; x += 14;
    for (; x < W; x++) ground(x, 10);
  } else {
    for (; x < W; x++) ground(x);
    const sx = W - 28; for (let i = 0; i < 8; i++) for (let y = 12 - i; y < 13; y++) M[y][sx + i] = 'S';
    for (let y = 5; y < 13; y++) M[y][sx + 8] = 'S';
    S.flagX = sx + 11; S.axe = null;
  }
  S.map = M; S.W = W;
  S.p = { x: 80, y: 13 * T - 40, w: 28, h: 36, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buf: 0, inv: 0, anim: 0, skid: 0 };
  if (S.pw) { S.p.h = 70; S.p.y -= 34; }
  S.cam = 0; S.items = []; S.fire = []; S.pops = []; S.bumps = []; S.debris = []; S.eb = []; S.time = 400; S.dead = 0; S.clear = null; S.intro = 1.8; S.star = 0; S.grow = 0;
}
function solid(x, y) { const t = S.map[y]?.[x]; return !!t && '#B?USPpQqCb'.includes(t); }
function collide(g, o, dt, isP) {
  o.hitWall = false; o.ground = o.onPlat || false;
  o.x += o.vx * dt;
  const y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = tx * T - o.w - 0.01; o.vx = 0; o.hitWall = true; break; } }
  else if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = (tx + 1) * T; o.vx = 0; o.hitWall = true; break; } }
  o.y += o.vy * dt;
  const xa = Math.floor((o.x + 3) / T), xb = Math.floor((o.x + o.w - 3) / T);
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = xa; x <= xb; x++) if (solid(x, ty)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; break; } }
  else if (o.vy < 0) {
    const ty = Math.floor(o.y / T), cx = Math.floor((o.x + o.w / 2) / T);
    for (const x of [cx, xa, xb]) if (solid(x, ty)) { o.y = (ty + 1) * T; o.vy = 0; if (isP) bump(g, x, ty); break; }
  }
  if (isP) { const ty = Math.floor((o.y + o.h - 2) / T); if (S.map[ty]?.[xa] === 'L' || S.map[ty]?.[xb] === 'L') die(g); }
}
function ridePlat(P, dt) {
  P.onPlat = false;
  for (const p of S.plats) {
    if (P.vy >= 0 && P.x + P.w > p.x && P.x < p.x + p.w && P.y + P.h <= p.y + 8 && P.y + P.h + P.vy * dt >= p.y - 2) { P.y = p.y - P.h; P.vy = 0; P.onPlat = true; P.x += p.dx || 0; P.y += Math.min(0, p.dy || 0); }
  }
}
function updPlats(g, dt) {
  for (const p of S.plats) { p.ph += dt * p.sp; const nx = p.ox + Math.sin(p.ph) * p.ax * 2, ny = p.oy + Math.sin(p.ph) * p.ay * 2; p.dx = nx - p.x; p.dy = ny - p.y; p.x = nx; p.y = ny; }
}
function bump(g, x, y) {
  const t = S.map[y][x];
  S.bumps.push({ x, y, t: 0.15 });
  for (const e of S.ens) if (!e.dead && e.type !== 'bowser' && Math.abs(e.x + e.w / 2 - (x * T + 20)) < T && Math.abs(e.y + e.h - y * T) < 8) kill(g, e);
  for (const c of S.coinsOn) if (!c.got && c.x === x && c.y === y - 1) { c.got = true; coin(g); }
  const key = x + ',' + y, k = S.q[key];
  if (t === '?' || (t === 'B' && k === 'multi')) {
    if (k === 'multi') { S.mc = (S.mc || 0) + 1; coin(g); S.pops.push({ x: x * T + 20, y: y * T, t: 0.5 }); if (S.mc >= 8) { S.map[y][x] = 'U'; delete S.q[key]; S.mc = 0; } return; }
    S.map[y][x] = 'U';
    if (k === 'power') { S.items.push({ k: S.pw ? 'f' : 'm', x: x * T + 4, y: y * T, w: 32, h: 32, vx: 110, vy: 0, rise: 0.8 }); g.sfx.power(); }
    else if (k === 'star') { S.items.push({ k: 's', x: x * T + 4, y: y * T, w: 32, h: 32, vx: 160, vy: 0, rise: 0.8 }); g.sfx.power(); }
    else if (k === 'life') { S.items.push({ k: 'l', x: x * T + 4, y: y * T, w: 32, h: 32, vx: 130, vy: 0, rise: 0.8 }); g.sfx.power(); }
    else { coin(g); S.pops.push({ x: x * T + 20, y: y * T, t: 0.5 }); }
  } else if (t === 'B') {
    if (S.pw) { S.map[y][x] = ' '; g.sfx.explode(); g.add(50); for (let i = 0; i < 4; i++) S.debris.push({ x: x * T + 20, y: y * T + 20, vx: (i % 2 ? 1 : -1) * 120, vy: i < 2 ? -600 : -400 }); }
    else g.sfx.bounce();
  } else g.sfx.bounce();
}
function coin(g) { S.coins++; g.add(200); g.sfx.coin(); if (S.coins % 100 === 0) { S.lives++; g.sfx.power(); g.float(g.W / 2, 100, '1UP!', '#4ade80'); } }
function updFire(g, dt) {
  for (const f of S.fire) {
    f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
    const ty = Math.floor((f.y + 14) / T), tx = Math.floor((f.x + 7) / T);
    if (solid(tx, ty) && f.vy > 0) { f.vy = -380; f.y = ty * T - 14; }
    if (solid(Math.floor((f.x + (f.vx > 0 ? 14 : 0)) / T), Math.floor((f.y + 7) / T))) { f.dead = true; g.burst(f.x - S.cam, f.y, '#f97316', 6, 120); }
    for (const e of S.ens) if (!e.dead && !(e.type === 'plant' && e.out < 0.3) && U.rectHit(f, e)) { f.dead = true; if (e.type === 'bowser') { e.hp--; e.flash = 0.2; g.sfx.hit(); if (e.hp <= 0) { kill(g, e); g.add(5000, e.x - S.cam, e.y); } } else kill(g, e); break; }
  }
  S.fire = S.fire.filter((f) => !f.dead && Math.abs(f.x - S.p.x) < 700 && f.y < g.H);
}
function updEnemies(g, dt) {
  const P = S.p;
  for (const e of S.ens) {
    if (e.dead) { e.dt = (e.dt || 0) - dt; if (!e.flat) { e.vy += 1500 * dt; e.y += e.vy * dt; } continue; }
    if (Math.abs(e.x - P.x) > 1000 && e.type !== 'bowser') continue;
    e.t += dt; e.flash = (e.flash || 0) - dt;
    if (e.type === 'plant') {
      const near = Math.abs(P.x + P.w / 2 - (e.x + 16)) < 60;
      const cyc = e.t % 4; const want = cyc < 2 && !(near && e.out < 0.05) ? 1 : 0;
      e.out = U.clamp(e.out + (want ? 1 : -1) * dt * 1.5, 0, 1); e.y = e.by - e.out * 44;
      if (S.w >= 5 && e.out === 1 && !e.shot) { e.shot = true; const a = Math.atan2(P.y - e.y, P.x - e.x); S.eb.push({ x: e.x + 16, y: e.y + 10, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 9, fire: true }); }
      if (e.out < 0.1) e.shot = false;
      if (e.out > 0.3 && U.rectHit(P, { x: e.x + 4, y: e.y, w: 24, h: e.out * 44 })) { if (S.star > 0) kill(g, e); else hurt(g); }
      continue;
    }
    if (e.type === 'bowser') { bowserAI(g, e, dt); continue; }
    if (e.type === 'para') { e.vy = Math.min(e.vy + 1200 * dt, 700); const v0 = e.vx; collide(g, e, dt, false); if (e.hitWall) e.vx = -v0; if (e.ground) e.vy = -560; }
    else if (e.type === 'bro') {
      e.vy = Math.min(e.vy + 1750 * dt, 900); e.vx = Math.sin(e.t * 1.5) * 60; collide(g, e, dt, false);
      if (e.ground && Math.random() < dt * 0.4) e.vy = -760;
      if (e.t % 1.4 < dt && Math.abs(P.x - e.x) < 600) { S.eb.push({ x: e.x + 17, y: e.y, vx: (P.x < e.x ? -1 : 1) * U.rand(120, 220), vy: -620, grav: 1500, r: 10, hammer: true }); }
      e.face = P.x < e.x ? -1 : 1;
    } else {
      e.vy = Math.min(e.vy + 1750 * dt, 900); const v0 = e.vx; collide(g, e, dt, false); if (e.hitWall) e.vx = -v0;
      if (e.type === 'koopa' && !e.shell && e.ground) { const ax = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / T), by = Math.floor((e.y + e.h + 4) / T); if (!solid(ax, by)) e.vx = -e.vx; }
    }
    if (e.y > g.H + 100) e.dead = true;
    if (e.shell && e.vx) for (const o of S.ens) if (o !== e && !o.dead && o.type !== 'bowser' && U.rectHit(e, o)) { kill(g, o); S.combo = (S.combo || 0) + 1; }
    if (U.rectHit(P, e) && !e.dead) {
      if (S.star > 0) { kill(g, e); continue; }
      if (P.inv > 0) continue;
      if (P.vy > 0 && P.y + P.h - e.y < 24) {
        P.vy = (g.a || g.up) ? -620 : -400; g.sfx.bounce(); S.stomp = (S.stomp || 0) + 1;
        const pts = [100, 200, 400, 800, 1000, 2000, 4000][Math.min(6, S.stomp - 1)];
        if (e.type === 'para') { e.type = 'koopa'; g.add(pts, e.x - S.cam, e.y); }
        else if (e.type === 'koopa' && !e.shell) { e.shell = true; e.vx = 0; e.h = 30; e.y += 6; g.add(pts, e.x - S.cam, e.y); }
        else if (e.shell && !e.vx) { e.vx = (P.x < e.x ? 1 : -1) * 560; }
        else if (e.shell) { e.vx = 0; }
        else { e.dead = true; e.flat = true; e.dt = 0.5; g.add(pts, e.x - S.cam, e.y); }
      } else if (e.shell && !e.vx) { e.vx = (P.x < e.x ? 1 : -1) * 560; e.x += Math.sign(e.vx) * 12; P.inv = 0.2; g.sfx.hit(); }
      else hurt(g);
    }
  }
  if (P.ground) S.stomp = 0;
  S.ens = S.ens.filter((e) => !(e.dead && e.dt < -1.5));
}
function bowserAI(g, e, dt) {
  const P = S.p;
  if (Math.abs(e.x - P.x) > 900) return;
  e.face = P.x < e.x ? -1 : 1;
  e.vy = Math.min(e.vy + 1500 * dt, 900);
  const lo = S.bridge.x0 * T + 120, hi = (S.bridge.x1 - 1) * T - e.w;
  if (e.x < lo) e.vx = 50; if (e.x > hi) e.vx = -50;
  if (e.ground && Math.random() < dt * 0.6) e.vy = -560;
  collide(g, e, dt, false);
  if (e.t > 2.2) {
    e.t = 0; const y = P.y + U.rand(-10, 30);
    S.eb.push({ x: e.x, y: e.y + 26, vx: -260, vy: (y - e.y - 26) * 0.3, r: 14, flame: true }); g.sfx.tone(120, 0.4, 'sawtooth', 0.08, 60);
    if (S.w === 7) for (let i = 0; i < 3; i++) g.later(() => { if (!e.dead) S.eb.push({ x: e.x + 20, y: e.y, vx: -U.rand(100, 300), vy: -650, grav: 1500, r: 10, hammer: true }); }, 0.6 + i * 0.25);
  }
  if (U.rectHit(P, e) && !e.dead) { if (S.star > 0 && false) {} hurt(g); }
}
function updHazards(g, dt) {
  const P = S.p;
  for (const b of S.bars) { b.a += b.sp * dt; for (let i = 0; i < b.n; i++) { const x = b.cx + Math.cos(b.a) * i * 18, y = b.cy + Math.sin(b.a) * i * 18; if (U.circRect({ x, y, r: 8 }, P)) hurt(g); } }
  for (const cn of S.cannons) { cn.t += dt; if (cn.t > 3.5 && Math.abs(cn.x * T - P.x) < 700 && Math.abs(cn.x * T - P.x) > 80) { cn.t = 0; const d = P.x < cn.x * T ? -1 : 1; S.ens.push({ type: 'bill', x: cn.x * T + d * 30, y: cn.y * T + 4, w: 38, h: 30, vx: d * 230, vy: 0, t: 0, fly: true }); g.sfx.explode(); } }
  for (const e of S.ens) if (e.type === 'bill' && !e.dead) { e.x += e.vx * dt; e.vy = 0; if (Math.abs(e.x - P.x) > 1100) e.dead = true; }
  for (const b of S.eb) {
    if (b.grav) b.vy += b.grav * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > g.H + 50 || Math.abs(b.x - P.x) > 1100) b.dead = true;
    if (!b.dead && U.circRect(b, P)) { if (S.star > 0) b.dead = true; else hurt(g); }
  }
  S.eb = S.eb.filter((b) => !b.dead);
}
function updItems(g, dt) {
  const P = S.p;
  for (const it of S.items) {
    if (it.rise > 0) { it.rise -= dt; it.y -= 40 * dt; continue; }
    if (it.k !== 'f') { it.vy = Math.min((it.vy || 0) + 1600 * dt, 900); const v0 = it.vx; collide(g, it, dt, false); if (it.hitWall) it.vx = -v0; if (it.k === 's' && it.ground) it.vy = -600; }
    if (U.rectHit(P, it)) {
      it.got = true; g.sfx.power();
      if (it.k === 'l') { S.lives++; g.float(it.x - S.cam, it.y, '1UP!', '#4ade80'); continue; }
      g.add(1000, it.x - S.cam, it.y);
      if (it.k === 's') { S.star = 10; continue; }
      if (it.k === 'm') { if (!S.pw) { S.pw = 1; P.y -= 34; S.grow = 0.5; } }
      else { if (!S.pw) P.y -= 34; S.pw = 2; S.grow = 0.5; }
    }
  }
  S.items = S.items.filter((i) => !i.got && i.y < g.H);
}
function kill(g, e) { if (e.dead) return; e.dead = true; e.vy = -400; e.dt = 0; g.add(e.type === 'bro' ? 1000 : 200, e.x - S.cam, e.y); g.sfx.hit(); g.burst(e.x + 17 - S.cam, e.y + 18, ['#fff', '#facc15'], 8, 150); }
function hurt(g) {
  const P = S.p;
  if (P.inv > 0 || S.star > 0 || S.dead) return;
  if (S.pw) { S.pw = 0; P.inv = 2; P.y += 34; P.h = 36; g.sfx.hit(); g.shake(4, 0.2); return; }
  die(g);
}
function die(g) { if (S.dead) return; S.dead = 2.6; S.p.vy = -650; g.sfx.lose(); }
function clearSeq(g, dt) {
  const C = S.clear, P = S.p;
  C.t += dt;
  if (C.kind === 'flag') {
    if (P.y + P.h < 12 * T) P.y += 260 * dt; else if (C.t > 1.2) { P.x += 160 * dt; P.anim += 160 * dt; }
    if (C.t > 1.2 && S.time > 0) { const d = Math.min(S.time, dt * 200); S.time -= d; g.score += Math.round(d) * 50; if (g.frame % 4 === 0) g.sfx.beep(1200, 0.02); }
    if (C.t > 4.5) next(g);
  } else {
    if (!C.cut && C.t > 0.4) { C.cut = true; for (let x = S.bridge.x0; x <= S.bridge.x1; x++) g.later(() => { S.map[10][x] = ' '; g.sfx.drop(); }, (S.bridge.x1 - x) * 0.05); }
    const bw = S.ens.find((e) => e.type === 'bowser' && !e.dead);
    if (bw && C.t > 1.3) { bw.vy += 1500 * dt; bw.y += bw.vy * dt; if (bw.y > g.H) { bw.dead = true; g.add(5000); g.sfx.explode(); } }
    if (C.t > 1 && S.time > 0) { const d = Math.min(S.time, dt * 200); S.time -= d; g.score += Math.round(d) * 50; }
    if (C.t > 4) next(g);
  }
}
function next(g) {
  S.w++;
  if (S.w >= WORLDS.length) return g.win(`8개 월드 정복! 코인 ${S.coins} · 목숨 ${S.lives}`);
  g.add(1000); load(g);
}
// -------- 그리기 --------
function drawAll(g, c) {
  const th = WORLDS[S.w];
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  if (th.deco) for (let i = 0; i < 8; i++) { const x = ((i * 380 - S.cam * 0.3) % 3040 + 3040) % 3040 - 200; g.emoji(th.deco, x, th.deco === '☁️' ? 70 + (i % 3) * 45 : 470, th.deco === '☁️' ? 60 : 56); }
  for (let i = 0; i < 6; i++) { const x = ((i * 600 - S.cam * 0.5) % 3600 + 3600) % 3600 - 300; c.fillStyle = th.hill; c.beginPath(); c.ellipse(x, 13 * T, 190, 120, 0, Math.PI, 0); c.fill(); }
  if (th.castle) for (let i = 0; i < 10; i++) { const x = ((i * 200 - S.cam * 0.2) % 2000 + 2000) % 2000; g.rect(x, 0, 60, g.H, 'rgba(0,0,0,.15)'); }
  c.save(); c.translate(-Math.round(S.cam), 0);
  const x0 = Math.floor(S.cam / T), x1 = Math.min(S.W - 1, x0 + 25);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const t = S.map[y][x]; if (t === ' ') continue;
    const bp = S.bumps.find((b) => b.x === x && b.y === y), px = x * T, py = y * T - (bp ? Math.sin((1 - bp.t / 0.15) * Math.PI) * 10 : 0);
    if (t === '#') { g.rect(px, py, T, T, th.ground); if (S.map[y - 1]?.[x] !== '#') g.rect(px, py, T, 8, th.top); g.stroke(px, py, T, T, 'rgba(0,0,0,.2)', 1); }
    else if (t === 'B') { g.rect(px, py, T, T, th.under ? '#1e6aa8' : '#b45309'); g.line(px, py + 20, px + T, py + 20, '#451a03', 2); g.line(px + 20, py, px + 20, py + 20, '#451a03', 2); g.line(px + 10, py + 20, px + 10, py + T, '#451a03', 2); g.line(px + 30, py + 20, px + 30, py + T, '#451a03', 2); g.stroke(px, py, T, T, '#451a03', 2); }
    else if (t === '?') { g.rect(px, py, T, T, '#f59e0b'); g.stroke(px + 2, py + 2, T - 4, T - 4, '#92400e', 2); g.text('?', px + 20, py + 22, 24, Math.floor(g.time * 3) % 2 ? '#fff' : '#fde68a'); }
    else if (t === 'U') { g.rect(px, py, T, T, '#92400e'); g.stroke(px + 2, py + 2, T - 4, T - 4, '#451a03', 2); for (const [a, b] of [[6, 6], [30, 6], [6, 30], [30, 30]]) g.circle(px + a + 2, py + b + 2, 2, '#451a03'); }
    else if (t === 'S') { g.rect(px, py, T, T, th.castle ? '#525252' : '#a16207'); g.stroke(px + 2, py + 2, T - 4, T - 4, 'rgba(0,0,0,.35)', 2); g.line(px + 4, py + 4, px + T - 4, py + 4, 'rgba(255,255,255,.3)', 2); }
    else if (t === 'P' || t === 'Q') { if (t === 'P') { g.rect(px - 4, py, 2 * T + 8, T, '#16a34a'); g.rect(px + 4, py + 4, 10, T - 8, '#86efac'); g.stroke(px - 4, py, 2 * T + 8, T, '#14532d', 3); } }
    else if (t === 'p' || t === 'q') { if (t === 'p') { g.rect(px, py, 2 * T, T, '#16a34a'); g.rect(px + 8, py, 10, T, '#86efac'); g.line(px, py, px, py + T, '#14532d', 3); g.line(px + 2 * T, py, px + 2 * T, py + T, '#14532d', 3); } }
    else if (t === 'C') { g.rect(px + 4, py, T - 8, T, '#1f2937'); if (S.map[y - 1]?.[x] !== 'C') { g.rrect(px, py, T, 22, 6, '#111827'); g.emoji('💀', px + 20, py + 11, 16); } }
    else if (t === 'L') { const wv = Math.sin(g.time * 4 + x) * 3; g.rect(px, py + 8 + wv, T, T, '#dc2626'); g.rect(px, py + 8 + wv, T, 6, '#f97316'); }
    else if (t === 'b') { g.rect(px, py, T, 14, '#a16207'); g.line(px, py + 14, px + T, py + 14, '#451a03', 2); g.line(px + 20, py + 14, px + 20, py + 24, '#78350f', 3); }
  }
  for (const p of S.plats) { g.rrect(p.x, p.y, p.w, p.h, 6, '#f8fafc', '#94a3b8'); for (let k = 0; k < p.w; k += 20) g.circle(p.x + k + 10, p.y + 7, 3, '#cbd5e1'); }
  for (const co of S.coinsOn) if (!co.got) { const w = Math.abs(Math.sin(g.time * 4 + co.x)) * 20 + 4; g.rrect(co.x * T + 20 - w / 2, co.y * T + 6, w, 28, w / 2, '#facc15', '#a16207'); }
  if (!S.castle) {
    const fx = S.flagX * T; g.rect(fx + 16, 4 * T, 6, 9 * T, '#d1d5db'); g.circle(fx + 19, 4 * T, 9, '#22c55e');
    const fy = S.clear && S.clear.kind === 'flag' ? Math.min(12 * T - 30, 4 * T + 10 + S.clear.t * 300) : 4 * T + 10;
    g.poly([[fx + 16, fy], [fx - 34, fy + 18], [fx + 16, fy + 36]], '#ef4444'); g.emoji('⭐', fx - 2, fy + 18, 16);
    g.emoji('🏰', fx + 230, 13 * T - 80, 160);
  } else if (S.axe) { g.emoji('🪓', S.axe.x * T + 20, S.axe.y * T + 20, 40 + Math.sin(g.time * 6) * 4); g.emoji('👸', S.axe.x * T + 200, 10 * T - 30, 50); }
  for (const b of S.bars) { g.rect(b.cx - 20, b.cy - 20, 40, 40, '#92400e'); for (let i = 0; i < b.n; i++) { const x = b.cx + Math.cos(b.a) * i * 18, y = b.cy + Math.sin(b.a) * i * 18; g.circle(x, y, 9, '#f97316'); g.circle(x, y, 5, '#fde047'); } }
  for (const it of S.items) g.emoji({ m: '🍄', f: '🌼', s: '⭐', l: '🟢' }[it.k], it.x + 16, it.y + 16, 34);
  for (const p of S.pops) g.emoji('🪙', p.x, p.y - (0.5 - p.t) * 140, 28);
  for (const d of S.debris) g.rect(d.x - 7, d.y - 7, 14, 14, '#b45309');
  for (const e of S.ens) {
    if (e.x < S.cam - 100 || e.x > S.cam + g.W + 100) continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.type === 'plant') { if (e.out > 0.02) { c.save(); c.beginPath(); c.rect(e.x - 20, e.by - 60, 80, 60); c.clip(); g.rect(cx - 3, e.y + 24, 6, 40, '#15803d'); g.emoji('🌺', cx, e.y + 16, 40); c.restore(); } continue; }
    c.save(); c.translate(cx, cy);
    if (e.flat) c.scale(1.2, 0.35); if (e.dead && !e.flat) c.scale(1, -1);
    if ((e.vx > 0 || e.face > 0) && !e.shell) c.scale(-1, 1);
    if (e.type === 'bowser') { if (e.flash > 0) c.globalAlpha = 0.5; g.emoji('🐲', 0, 0, 92); g.emoji('👑', 4, -44, 30); }
    else if (e.type === 'bill') { g.rrect(-19, -15, 38, 30, 15, '#111827'); g.circle(-8, -3, 5, '#fff'); g.circle(-8, -3, 2, '#000'); }
    else if (e.type === 'bro') { g.emoji('🐢', 0, 4, 40); g.emoji('⛑️', 0, -18, 22); g.emoji('🔨', -16, -16, 20); }
    else if (e.shell) g.emoji('🐚', 0, 0, 34);
    else if (e.type === 'para') { g.emoji('🐢', 0, 0, 38); g.emoji('🪽', 12, -12, 22); }
    else g.emoji(e.type === 'koopa' ? '🐢' : '🍄‍🟫', 0, 0, 38);
    c.restore();
  }
  for (const b of S.eb) { if (b.hammer) { c.save(); c.translate(b.x, b.y); c.rotate(g.time * 14); g.emoji('🔨', 0, 0, 24); c.restore(); } else if (b.flame) g.emoji('🔥', b.x, b.y, 38); else g.emoji('🔥', b.x, b.y, 20); }
  for (const f of S.fire) g.emoji('🔥', f.x + 7, f.y + 7, 22);
  drawPlayer(g, c);
  c.restore();
  g.text(`🪙 ×${S.coins}`, 70, 26, 20, '#fff'); g.text(`⏱️ ${Math.ceil(S.time)}`, g.W - 70, 26, 20, '#fff');
  if (S.star > 0) g.text('⭐ 무적 ' + Math.ceil(S.star), g.W / 2, 26, 20, '#fde047');
  if (S.intro > 0) { c.fillStyle = '#000'; c.globalAlpha = Math.min(1, S.intro); c.fillRect(0, 0, g.W, g.H); c.globalAlpha = 1; g.text(th.n, g.W / 2, g.H / 2 - 30, 42, '#fff'); g.text(`🧑 × ${S.lives}`, g.W / 2, g.H / 2 + 30, 28, '#fff'); }
  if (S.clear && S.clear.kind === 'axe' && S.clear.t > 2) g.text('공주를 구했다! 다음 월드로', g.W / 2, 160, 34, '#fde047');
}
function drawPlayer(g, c) {
  const P = S.p;
  if (S.clear && S.clear.kind === 'flag' && S.clear.t > 3.4) return;
  if (P.inv > 0 && Math.floor(g.time * 14) % 2) return;
  const big = S.pw > 0, cx = P.x + P.w / 2, by = P.y + P.h;
  const hat = S.pw === 2 ? '#fff' : '#e11d48', shirt = S.pw === 2 ? '#e11d48' : '#e11d48', over = S.pw === 2 ? '#fff' : '#1d4ed8';
  c.save(); c.translate(cx, by); c.scale(P.face, 1);
  if (S.dead) c.scale(1, -1), c.translate(0, P.h);
  const sc = big ? 1.85 : 1; c.scale(sc, sc);
  if (S.star > 0) c.filter = `hue-rotate(${(g.time * 900) % 360}deg) saturate(2)`;
  const run = P.ground && Math.abs(P.vx) > 20, ph = Math.sin(P.anim / 9);
  const la = run ? ph * 5 : 0, air = !P.ground;
  g.rect(-9 + la, -8, 7, 8, '#7c2d12'); g.rect(2 - la, -8, 7, 8, '#7c2d12');
  if (air) { g.rect(-11, -10, 8, 6, '#7c2d12'); }
  g.rrect(-9, -20, 18, 13, 3, over); g.rect(-9, -24, 18, 6, shirt);
  g.rect(air ? 7 : 8, air ? -34 : -23, 5, air ? 12 : 9, shirt); g.circle(air ? 10 : 10, air ? -35 : -13, 3, '#fff');
  g.circle(1, -29, 7, '#fcd9b6'); g.rect(-8, -37, 16, 5, hat); g.rect(0, -34, 10, 3, hat);
  g.rect(3, -30, 2, 3, '#111'); g.rect(1, -26, 7, 2, '#3f1d0b');
  c.filter = 'none';
  c.restore();
}
