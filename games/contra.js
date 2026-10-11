let S;
const T = 40, ROWS = 15;
const GUNS = {
  N: { n: '기본총', e: '🔫', c: '#fde047', rate: 0.22 },
  M: { n: '머신건', e: 'Ⓜ️', c: '#fb923c', rate: 0.08 },
  S: { n: '스프레드', e: '🌟', c: '#f87171', rate: 0.3 },
  L: { n: '레이저', e: '⚡', c: '#60a5fa', rate: 0.45 },
  F: { n: '화염탄', e: '🔥', c: '#f97316', rate: 0.28 },
};
const STAGES = [
  { n: '1 정글 침투', sky: ['#0f3b2e', '#4a8b5c'], ground: '#4a3a1e', top: '#3fae4a', boss: '방어 요새' },
  { n: '2 적 기지', sky: ['#1b1f2a', '#4b5163'], ground: '#3b4252', top: '#94a3b8', boss: '강철 전차' },
  { n: '3 외계 둥지', sky: ['#2a0b2a', '#6b1b4b'], ground: '#5b1b3b', top: '#e879f9', boss: '외계 심장' },
];
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
GAME({
  title: '런앤건 특공대', w: 960, h: 600, bg: '#0f3b2e', controls: 'dpad+ab', aLabel: '점프', bLabel: '사격',
  help: '←→ 이동 · ↑↓ 조준 (8방향) · ↓ 엎드리기\nSpace/Z 점프 (↓+점프 = 다리 아래로) · X/Shift 사격 (꾹 = 연사)\nQ/E 또는 1~5 무기 교체 (화면 상단 아이콘 클릭도 OK)\n🎁 날아가는 캡슐/센서 상자를 쏴서 무기 획득: M 머신건 · S 스프레드 · L 레이저 · F 화염 · B 방어막\n한 방이면 죽는다! 죽으면 들고 있던 무기를 잃음',
  init(g) { S = { lvl: 0, lives: 4, guns: ['N'], gi: 0, nextLife: 20000, kills: 0 }; load(g); },
  update(g, dt) {
    const P = S.p;
    S.intro -= dt;
    if (S.clear) { S.clear -= dt; P.vx = 0; if (S.clear <= 0) { S.lvl++; if (S.lvl >= STAGES.length) return g.win(`전 스테이지 돌파! 처치 ${S.kills}`); load(g); } return; }
    if (S.dead) { S.dead -= dt; P.vy += 1400 * dt; P.x += P.vx * dt; P.y += Math.min(P.y + P.vy * dt, 13 * T - 20) - P.y; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`${STAGES[S.lvl].n} · 처치 ${S.kills}`); respawn(); } updWorld(g, dt); return; }
    // 무기 교체
    let sw = 0; if (g.keyp('KeyE')) sw = 1; if (g.keyp('KeyQ')) sw = -1;
    if (sw) { S.gi = (S.gi + sw + S.guns.length) % S.guns.length; g.sfx.click(); }
    for (let i = 1; i <= 5; i++) if (g.keyp('Digit' + i) && S.guns[i - 1]) { S.gi = i - 1; g.sfx.click(); }
    for (let i = 0; i < S.guns.length; i++) if (g.clickIn(14 + i * 52, 12, 46, 46)) { S.gi = i; g.sfx.click(); }
    // 이동/조준
    const dir = g.right - g.left;
    P.prone = P.ground && g.down && !dir;
    if (dir) P.face = dir;
    P.vx = P.prone ? 0 : dir * 220;
    if (g.pressed('a') && P.ground) {
      if (g.down && onBridge(P)) { P.drop = 0.25; P.y += 4; }
      else { P.vy = -700; P.spin = true; g.sfx.jump(); }
    }
    P.drop = Math.max(0, (P.drop || 0) - dt);
    P.vy = Math.min(P.vy + 1700 * dt, 900);
    move(P, dt, true);
    if (P.ground) P.spin = false;
    P.x = U.clamp(P.x, S.cam, S.cam + g.W - P.w);
    P.h = P.prone ? 20 : 44;
    if (P.prone && P.hPrev !== 20) P.y += 24; if (!P.prone && P.hPrev === 20) P.y -= 24; P.hPrev = P.h;
    if (P.y > g.H + 30) { P.inv = 0; P.barrier = 0; killP(g); return; }
    let ax = P.face, ay = 0;
    if (g.up) { ay = -1; ax = dir ? dir : 0; }
    else if (g.down && (!P.ground || dir)) { ay = 1; ax = dir || (P.ground ? P.face : 0); }
    if (!ax && !ay) ax = P.face;
    const al = Math.hypot(ax, ay); P.ax = ax / al; P.ay = ay / al;
    P.fireT -= dt;
    if (g.b && P.fireT <= 0) shoot(g);
    P.inv -= dt; P.barrier -= dt;
    // 카메라
    const lockX = S.bossX * T - g.W + T * 2;
    if (!S.locked) { S.cam = Math.max(S.cam, Math.min(P.x - 380, lockX)); if (S.cam >= lockX) { S.locked = true; startBoss(g); } }
    updWorld(g, dt);
    if (g.score >= S.nextLife) { S.nextLife += 20000; S.lives++; g.sfx.power(); g.float(P.x - S.cam, P.y - 30, '1UP!', '#4ade80'); }
    const gun = GUNS[S.guns[S.gi]];
    g.info = `${STAGES[S.lvl].n} · 👤×${S.lives} · ${gun.e} ${gun.n}${P.barrier > 0 ? ' · 🛡️' + Math.ceil(P.barrier) : ''}`;
  },
  draw(g, c) { drawAll(g, c); },
});
function load(g) {
  const R = rng(S.lvl * 17 + 3), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const W = 170;
  const M = Array.from({ length: ROWS }, () => Array(W).fill(' '));
  S.ens = []; S.boxes = [];
  const ground = (x, top = 13) => { for (let y = top; y < ROWS; y++) M[y][x] = '#'; };
  const en = (type, x, y, o = {}) => S.ens.push(Object.assign(mk(type, x * T, y * T), o));
  for (let x = 0; x < 14; x++) ground(x);
  let x = 14;
  while (x < 140) {
    const f = R();
    if (f < 0.18) { const w = ri(7, 10); for (let k = 0; k < w; k++) ground(x + k); for (let k = 2; k < w - 1; k++) M[9][x + k] = '='; en('rifle', x + 4, 8); en('runner', x + w, 12); x += w; }
    else if (f < 0.32) { const w = ri(4, 6); for (let k = 0; k < w; k++) M[10][x + k] = '='; if (R() < 0.5) S.boxes.push({ x: (x + 2) * T, y: 9 * T, hp: 6, open: 0 }); x += w; for (let k = 0; k < 3; k++) ground(x + k); x += 3; }
    else if (f < 0.46) { const h = ri(2, 3); for (let k = 0; k < 9; k++) ground(x + k, k < 3 ? 13 : 13 - h); en('turret', x + 5, 13 - h - 1); en('runner', x + 8, 13 - h - 1); x += 9; for (let k = 0; k < 3; k++) ground(x + k, 13 - h); x += 3; for (let k = 0; k < 2; k++) ground(x + k); x += 2; }
    else if (f < 0.6) { const w = ri(8, 11); for (let k = 0; k < w; k++) ground(x + k); S.boxes.push({ x: (x + 3) * T, y: 12 * T, hp: 6, open: 0 }); en('rifle', x + w - 2, 12); if (S.lvl) en('drone', x + w, 4); x += w; }
    else if (f < 0.75) { const w = ri(8, 10); for (let k = 0; k < w; k++) ground(x + k); for (let k = 1; k < 4; k++) M[10][x + k] = '='; for (let k = 4; k < 8; k++) M[7][x + k] = '='; en('sniper', x + 6, 6); en('runner', x + w, 12); if (S.lvl === 2) en('bug', x + w - 1, 12); x += w; }
    else { const w = ri(6, 9); for (let k = 0; k < w; k++) ground(x + k); en('runner', x + w - 1, 12); en('runner', x + w + 2, 12); if (S.lvl >= 1) en(S.lvl === 2 ? 'bug' : 'drone', x + w, S.lvl === 2 ? 12 : 3); x += w; }
  }
  for (; x < W; x++) ground(x);
  S.bossX = 160; S.map = M; S.W = W; S.cam = 0; S.locked = false; S.boss = null;
  S.pb = []; S.eb = []; S.items = []; S.caps = []; S.capT = 6; S.spawnT = 3; S.clear = 0; S.intro = 2;
  S.p = { x: 100, y: 200, w: 26, h: 44, hPrev: 44, vx: 0, vy: 0, face: 1, ax: 1, ay: 0, ground: false, fireT: 0, inv: 2, barrier: 0, spin: false, anim: 0 };
  S.dead = 0;
}
function respawn() {
  const P = S.p;
  Object.assign(P, { x: S.cam + 120, y: 0, vx: 0, vy: 0, inv: 2.5, spin: true, h: 44, hPrev: 44 });
  if (S.guns[S.gi] !== 'N') { S.guns.splice(S.gi, 1); S.gi = 0; }
}
function mk(type, x, y) {
  const e = { type, x, y, w: 28, h: 44, vx: 0, vy: 0, hp: 1, t: Math.random() * 1.5, face: -1, flash: 0 };
  if (type === 'runner') { e.vx = -150; e.y = y - 4; }
  if (type === 'rifle') { e.y = y - 4; e.hp = 2; }
  if (type === 'sniper') { e.y = y - 4; e.hp = 2; }
  if (type === 'turret') { e.w = 36; e.h = 36; e.hp = 8; e.y = y + 4; e.fixed = true; }
  if (type === 'drone') { e.w = 34; e.h = 28; e.hp = 2; e.fly = true; e.y0 = y; }
  if (type === 'bug') { e.w = 34; e.h = 28; e.hp = 2; e.y = y + 12; }
  return e;
}
function onBridge(P) { const ty = Math.floor((P.y + P.h + 2) / T); const a = S.map[ty]?.[Math.floor((P.x + 4) / T)], b = S.map[ty]?.[Math.floor((P.x + P.w - 4) / T)]; return (a === '=' || a === ' ' || a === undefined) && (b === '=' || b === ' ' || b === undefined) && (a === '=' || b === '='); }
function solidAt(tx, ty, fromAbove, o) {
  const t = S.map[ty]?.[tx];
  if (t === '#') return true;
  if (t === '=' && fromAbove && !(o.drop > 0)) return true;
  return false;
}
function move(o, dt) {
  o.hitWall = false; o.ground = false;
  o.x += o.vx * dt;
  const y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (S.map[y]?.[tx] === '#') { o.x = tx * T - o.w - 0.01; o.hitWall = true; break; } }
  else if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (S.map[y]?.[tx] === '#') { o.x = (tx + 1) * T; o.hitWall = true; break; } }
  const prevB = o.y + o.h;
  o.y += o.vy * dt;
  const x0 = Math.floor((o.x + 3) / T), x1 = Math.floor((o.x + o.w - 3) / T);
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = x0; x <= x1; x++) if (solidAt(x, ty, prevB <= ty * T + 1, o)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; break; } }
  else if (o.vy < 0) { const ty = Math.floor(o.y / T); for (let x = x0; x <= x1; x++) if (S.map[ty]?.[x] === '#') { o.y = (ty + 1) * T; o.vy = 0; break; } }
}
function shoot(g) {
  const P = S.p, k = S.guns[S.gi], gun = GUNS[k];
  P.fireT = gun.rate;
  const ox = P.x + P.w / 2 + P.ax * 22, oy = (P.prone ? P.y + 8 : P.y + 16) + P.ay * 18;
  const a = Math.atan2(P.ay, P.ax);
  const add = (ang, sp, o) => S.pb.push(Object.assign({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5, dmg: 1, k, life: 1.4 }, o));
  if (S.pb.length > 40) return;
  if (k === 'N') { add(a, 640); g.sfx.shoot(); }
  if (k === 'M') { add(a + U.rand(-0.04, 0.04), 700); g.sfx.tone(700, 0.04, 'square', 0.04); }
  if (k === 'S') { for (const d of [-0.32, -0.16, 0, 0.16, 0.32]) add(a + d, 600, { r: 7 }); g.sfx.tone(400, 0.08, 'square', 0.05, 200); }
  if (k === 'L') { S.pb = S.pb.filter((b) => b.k !== 'L'); add(a, 1100, { r: 8, dmg: 4, pierce: true, len: 90, ang: a }); g.sfx.tone(1400, 0.2, 'sawtooth', 0.05, 300); }
  if (k === 'F') { add(a, 420, { r: 11, dmg: 2, spiral: 0, bx: ox, by: oy, ang: a }); g.sfx.tone(160, 0.12, 'sawtooth', 0.06, 90); }
}
function updWorld(g, dt) {
  const P = S.p;
  // 플레이어 탄
  for (const b of S.pb) {
    b.life -= dt;
    if (b.k === 'F') { b.spiral += dt * 14; b.bx += b.vx * dt; b.by += b.vy * dt; const px = -Math.sin(b.ang), py = Math.cos(b.ang); b.x = b.bx + px * Math.sin(b.spiral) * 26; b.y = b.by + py * Math.sin(b.spiral) * 26; }
    else { b.x += b.vx * dt; b.y += b.vy * dt; }
    if (b.x < S.cam - 50 || b.x > S.cam + g.W + 50 || b.y < -50 || b.y > g.H + 50 || b.life <= 0) { b.dead = true; continue; }
    if (S.map[Math.floor(b.y / T)]?.[Math.floor(b.x / T)] === '#' && b.k !== 'L') { b.dead = true; g.burst(b.x - S.cam, b.y, '#fde047', 4, 100, 0.2); continue; }
    for (const e of S.ens) {
      if (e.dead || b.dead || (b.hits && b.hits.has(e))) continue;
      if (e.x > S.cam + g.W + 20 || e.x < S.cam - 60) continue;
      if (U.circRect(b, e)) { hitEnemy(g, e, b.dmg); if (b.pierce) (b.hits || (b.hits = new Set())).add(e); else b.dead = true; }
    }
    for (const bx of S.boxes) if (!b.dead && !bx.done && bx.open > 0.5 && U.circRect(b, { x: bx.x, y: bx.y, w: 40, h: 40 })) { bx.hp -= b.dmg; b.dead = !b.pierce; g.sfx.hit(); if (bx.hp <= 0) { bx.done = true; dropItem(g, bx.x + 20, bx.y); g.add(500, bx.x - S.cam, bx.y); g.burst(bx.x + 20 - S.cam, bx.y + 20, ['#94a3b8', '#facc15'], 16, 200); g.sfx.explode(); } }
    for (const c of S.caps) if (!b.dead && !c.dead && U.dist(b.x, b.y, c.x, c.y) < 24) { c.dead = true; b.dead = !b.pierce; dropItem(g, c.x, c.y); g.sfx.explode(); g.burst(c.x - S.cam, c.y, ['#fff', '#f87171'], 14, 200); }
    if (S.boss && !b.dead) bossHitTest(g, b);
  }
  S.pb = S.pb.filter((b) => !b.dead);
  // 센서 상자
  for (const bx of S.boxes) { if (bx.done) continue; const d = Math.abs(bx.x - P.x); bx.open = U.clamp(bx.open + (d < 420 ? dt : -dt) * (Math.sin(g.time * 1.5 + bx.x) > -0.3 ? 1 : -1), 0, 1); }
  // 날아가는 캡슐
  if (!S.locked) { S.capT -= dt; if (S.capT <= 0) { S.capT = U.rand(9, 14); S.caps.push({ x: S.cam - 30, y: 150, y0: U.rand(100, 220), t: 0 }); } }
  for (const c of S.caps) { c.t += dt; c.x += 190 * dt; c.y = c.y0 + Math.sin(c.t * 3) * 50; if (c.x > S.cam + g.W + 60) c.dead = true; }
  S.caps = S.caps.filter((c) => !c.dead);
  // 아이템
  for (const it of S.items) {
    it.vy = Math.min(it.vy + 900 * dt, 500); it.x += it.vx * dt; it.y += it.vy * dt;
    const ty = Math.floor((it.y + 14) / T), tx = Math.floor(it.x / T);
    if (it.vy > 0 && (S.map[ty]?.[tx] === '#' || S.map[ty]?.[tx] === '=')) { it.y = ty * T - 14; it.vy = it.bounce-- > 0 ? -300 : 0; it.vx *= 0.6; }
    if (it.y > g.H) it.dead = true;
    if (!S.dead && U.circRect({ x: it.x, y: it.y, r: 16 }, P)) {
      it.dead = true; g.sfx.power(); g.add(1000, it.x - S.cam, it.y - 20);
      if (it.k === 'B') { P.barrier = 10; g.float(it.x - S.cam, it.y - 40, '방어막!', '#60a5fa'); }
      else { if (!S.guns.includes(it.k)) S.guns.push(it.k); S.gi = S.guns.indexOf(it.k); g.float(it.x - S.cam, it.y - 40, GUNS[it.k].n + '!', GUNS[it.k].c); }
    }
  }
  S.items = S.items.filter((i) => !i.dead);
  updEnemies(g, dt);
  if (S.locked && !S.clear) {
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.ens.filter((e) => !e.dead).length < 6) { S.spawnT = U.rand(2.2, 3.5) - S.lvl * 0.3; S.ens.push(mk(S.lvl === 2 ? 'bug' : 'runner', S.cam + (Math.random() < 0.5 ? -30 : g.W - 260), 12 * T)); }
  } else if (!S.locked) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) { S.spawnT = U.rand(2.5, 4.5) - S.lvl * 0.4; const ex = S.cam + g.W + 20, tx = Math.floor(ex / T); for (let y = 2; y < ROWS; y++) if (S.map[y]?.[tx] === '#' || S.map[y]?.[tx] === '=') { S.ens.push(mk(S.lvl === 2 && Math.random() < 0.4 ? 'bug' : 'runner', ex, (y - 1) * T)); break; } }
  }
  if (S.boss) updBoss(g, dt);
  // 적 탄
  for (const b of S.eb) {
    if (b.grav) b.vy += b.grav * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < S.cam - 60 || b.x > S.cam + g.W + 60 || b.y > g.H + 40 || b.y < -200) b.dead = true;
    if (b.grav && S.map[Math.floor(b.y / T)]?.[Math.floor(b.x / T)] === '#') { b.dead = true; g.burst(b.x - S.cam, b.y, ['#f97316', '#fde047'], 12, 160); g.sfx.explode(); if (U.dist(b.x, b.y, P.x + 13, P.y + P.h / 2) < 50) killP(g); }
    if (!b.dead && U.circRect(b, P)) { b.dead = true; killP(g); }
  }
  S.eb = S.eb.filter((b) => !b.dead);
}
function dropItem(g, x, y) {
  const pool = ['M', 'S', 'L', 'F', 'S', 'B'];
  S.items.push({ k: U.choice(pool), x, y, vx: 60, vy: -400, bounce: 2 });
}
function hitEnemy(g, e, dmg) {
  e.hp -= dmg; e.flash = 0.08; g.sfx.hit();
  if (e.hp <= 0) {
    e.dead = true; S.kills++;
    const pts = { runner: 100, rifle: 200, sniper: 300, turret: 600, drone: 300, bug: 250 }[e.type];
    g.add(pts, e.x + e.w / 2 - S.cam, e.y);
    g.burst(e.x + e.w / 2 - S.cam, e.y + e.h / 2, e.type === 'bug' ? ['#a3e635', '#e879f9'] : ['#ef4444', '#facc15', '#fff'], 14, 220);
    if (e.type === 'turret') { g.sfx.explode(); g.shake(4, 0.15); }
  }
}
function killP(g) {
  const P = S.p;
  if (S.dead || P.inv > 0 || S.clear) return;
  if (P.barrier > 0) return;
  S.dead = 2; P.vx = -P.face * 120; P.vy = -500; g.sfx.lose(); g.shake(8, 0.3);
  g.burst(P.x + 13 - S.cam, P.y + 20, ['#ef4444', '#fff'], 20, 260);
}
function aimShot(e, sp, ox, oy, spread = 0) {
  const P = S.p, a = Math.atan2(P.y + P.h / 2 - oy, P.x + 13 - ox) + spread;
  S.eb.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 });
}
function updEnemies(g, dt) {
  const P = S.p;
  for (const e of S.ens) {
    if (e.dead) continue;
    if (e.x > S.cam + g.W + 80) continue;
    if (e.x < S.cam - 200) { e.dead = true; continue; }
    e.t += dt; e.flash -= dt;
    const toP = P.x < e.x ? -1 : 1, onScr = e.x < S.cam + g.W - 10;
    if (e.type === 'runner') {
      e.vy = Math.min(e.vy + 1700 * dt, 900); move(e, dt); e.face = Math.sign(e.vx);
      if (e.hitWall) { e.vy = -500; }
      if (e.ground && Math.random() < dt * 0.5 && onScr) e.vy = -560;
      if (e.y > g.H) e.dead = true;
    } else if (e.type === 'rifle' || e.type === 'sniper') {
      e.vy = Math.min(e.vy + 1700 * dt, 900); e.vx = 0; move(e, dt); e.face = toP;
      if (onScr && e.t > (e.type === 'sniper' ? 1.8 : 2.4) - S.lvl * 0.3) { e.t = 0; aimShot(e, e.type === 'sniper' ? 330 : 260, e.x + 14 + toP * 16, e.y + 16); g.sfx.beep(500, 0.04); }
    } else if (e.type === 'turret') {
      e.ang = Math.atan2(P.y + 20 - e.y - 18, P.x + 13 - e.x - 18);
      if (onScr && e.t > 2.0 - S.lvl * 0.3) { e.t = 0; for (let i = 0; i < 2 + S.lvl; i++) g.later(() => { if (!e.dead) aimShot(e, 300, e.x + 18 + Math.cos(e.ang) * 22, e.y + 18 + Math.sin(e.ang) * 22); }, i * 0.18); g.sfx.beep(300, 0.06); }
    } else if (e.type === 'drone') {
      if (onScr) { e.x += (toP * 90 - 40) * dt; e.y = e.y0 + Math.sin(e.t * 2) * 60; if (e.t > 2.6) { e.t = 0; S.eb.push({ x: e.x + 17, y: e.y + 26, vx: 0, vy: 120, grav: 500, r: 7 }); } }
    } else if (e.type === 'bug') {
      e.vy = Math.min(e.vy + 1700 * dt, 900); move(e, dt);
      if (e.ground) { e.vx = 0; if (onScr && e.t > 1) { e.t = 0; e.vy = -520; e.vx = toP * U.rand(180, 300); } }
      if (e.y > g.H) e.dead = true;
    }
    if (!e.dead && U.rectHit(P, e) && !e.fixed) { if (P.barrier > 0) hitEnemy(g, e, 99); else killP(g); }
  }
  S.ens = S.ens.filter((e) => !e.dead || false);
}
// ---------- 보스 ----------
function startBoss(g) {
  const bx = S.bossX * T;
  g.sfx.tone(90, 1, 'sawtooth', 0.08, 50); g.shake(6, 0.8);
  if (S.lvl === 0) S.boss = { k: 0, parts: [{ n: 'turret', x: bx - 40, y: 6 * T, w: 40, h: 40, hp: 30, max: 30, t: 0 }, { n: 'turret', x: bx - 40, y: 9 * T, w: 40, h: 40, hp: 30, max: 30, t: 1 }, { n: 'core', x: bx - 30, y: 11 * T - 4, w: 50, h: 70, hp: 70, max: 70, t: 0 }] };
  if (S.lvl === 1) S.boss = { k: 1, parts: [{ n: 'tank', x: bx - 140, y: 13 * T - 130, w: 210, h: 130, hp: 200, max: 200, t: 0, vx: -60 }] };
  if (S.lvl === 2) S.boss = { k: 2, parts: [{ n: 'heart', x: bx - 150, y: 5 * T, w: 130, h: 150, hp: 260, max: 260, t: 0 }, { n: 'mouth', x: bx - 220, y: 2 * T, w: 60, h: 50, hp: 40, max: 40, t: 0 }, { n: 'mouth', x: bx - 220, y: 10 * T, w: 60, h: 50, hp: 40, max: 40, t: 1 }], arms: [0, Math.PI] };
  S.boss.intro = 1.5;
}
function bossHitTest(g, b) {
  for (const p of S.boss.parts) {
    if (p.hp <= 0 || (b.hits && b.hits.has(p))) continue;
    if (p.n === 'core' && S.boss.parts.some((q) => q.n === 'turret' && q.hp > 0) && false) continue;
    if (U.circRect(b, p)) {
      p.hp -= b.dmg; p.flash = 0.06; g.sfx.hit();
      if (b.pierce) (b.hits || (b.hits = new Set())).add(p); else b.dead = true;
      if (p.hp <= 0) { g.add(p.n === 'turret' || p.n === 'mouth' ? 2000 : 0, p.x - S.cam, p.y); g.sfx.explode(); g.shake(8, 0.3); g.burst(p.x + p.w / 2 - S.cam, p.y + p.h / 2, ['#f97316', '#fde047', '#fff'], 30, 300, 0.9, 5); }
      const main = S.boss.parts.find((q) => q.n === 'core' || q.n === 'tank' || q.n === 'heart');
      if (main.hp <= 0 && !S.clear) bossDown(g);
      return;
    }
  }
}
function bossDown(g) {
  S.clear = 4.5; S.eb = []; S.ens.forEach((e) => (e.dead = true));
  g.add(10000 + S.lvl * 5000, g.W / 2, 200); g.sfx.win();
  const B = S.boss;
  for (let i = 0; i < 8; i++) g.later(() => { const p = U.choice(B.parts); g.burst(p.x + U.rand(0, p.w) - S.cam, p.y + U.rand(0, p.h), ['#f97316', '#fde047', '#fff', '#ef4444'], 26, 280, 1, 5); g.sfx.explode(); g.shake(10, 0.3); }, i * 0.3);
  B.dying = true;
}
function updBoss(g, dt) {
  const B = S.boss, P = S.p;
  if (B.dying) return;
  if (B.intro > 0) { B.intro -= dt; return; }
  const hard = 1 + S.lvl * 0.25;
  for (const p of B.parts) {
    if (p.hp <= 0) continue;
    p.t += dt * hard; p.flash = (p.flash || 0) - dt;
    if (p.n === 'turret') { if (p.t > 1.6) { p.t = 0; for (const s of [-0.2, 0, 0.2]) aimShot(p, 280, p.x, p.y + 20, s); g.sfx.beep(260, 0.07); } }
    if (p.n === 'core') { if (p.t > 3.5) { p.t = 0; for (let i = 0; i < 3; i++) S.eb.push({ x: p.x, y: p.y + 20, vx: -U.rand(200, 420), vy: -U.rand(250, 550), grav: 700, r: 9, bomb: true }); g.sfx.drop(); } }
    if (p.n === 'tank') {
      p.x += p.vx * dt * hard; const lo = S.cam + 420, hi = S.bossX * T - p.w;
      if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx); } if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx); }
      if (p.t > 2.2) { p.t = 0; const dx = P.x - (p.x + 20); for (let i = 0; i < 2; i++) S.eb.push({ x: p.x + 10, y: p.y + 20, vx: dx / 1.2 + i * 60 - 30, vy: -620, grav: 900, r: 10, bomb: true }); g.sfx.explode(); g.shake(4, 0.15); }
      if ((p.t > 1 && p.t < 1.4) && Math.floor(p.t * 20) % 2 === 0) { S.eb.push({ x: p.x, y: p.y + 95, vx: -380, vy: U.rand(-30, 30), r: 5 }); }
      if (U.rectHit(P, p)) killP(g);
    }
    if (p.n === 'heart') {
      p.pulse = 1 + Math.sin(g.time * 6) * 0.06;
      if (p.t > 2.6) { p.t = 0; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 9) * Math.PI; S.eb.push({ x: p.x + 30, y: p.y + 75, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 8 }); } g.sfx.tone(80, 0.3, 'sawtooth', 0.08, 40); }
    }
    if (p.n === 'mouth') { if (p.t > 3) { p.t = 0; const e = mk('bug', p.x, p.y + 20); e.vx = -250; e.vy = -300; S.ens.push(e); g.sfx.pop(); } }
  }
  if (B.k === 2) {
    const h = B.parts[0];
    for (let i = 0; i < 2; i++) {
      B.arms[i] += dt * (1.2 + S.lvl * 0.1) * (i ? -1 : 1);
      const ox = h.x + 20, oy = h.y + 75;
      for (let s = 1; s <= 6; s++) { const ang = Math.PI + Math.sin(B.arms[i] + s * 0.4) * 0.9 + (i ? 0.5 : -0.5); const x = ox + Math.cos(ang) * s * 34, y = oy + Math.sin(ang) * s * 34; if (U.dist(x, y, P.x + 13, P.y + P.h / 2) < 26) killP(g); }
    }
  }
}
// ---------- 그리기 ----------
function drawAll(g, c) {
  const th = STAGES[S.lvl];
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 9; i++) {
    const x = ((i * 230 - S.cam * 0.3) % 2070 + 2070) % 2070 - 200;
    if (S.lvl === 0) { g.rect(x + 40, 200, 14, 400, 'rgba(20,50,20,.6)'); g.emoji('🌴', x + 47, 200, 120); }
    else if (S.lvl === 1) { g.rect(x, 260 + (i % 3) * 40, 150, 400, 'rgba(0,0,0,.25)'); g.rect(x + 20, 280 + (i % 3) * 40, 20, 10, 'rgba(250,204,21,.4)'); }
    else { g.circle(x + 60, 520, 90 + (i % 3) * 20, 'rgba(232,121,249,.1)'); g.circle(x + 60, 300, 6, 'rgba(255,255,255,.15)'); }
  }
  c.save(); c.translate(-Math.round(S.cam), 0);
  const x0 = Math.floor(S.cam / T), x1 = Math.min(S.W - 1, x0 + 25);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const t = S.map[y][x], px = x * T, py = y * T;
    if (t === '#') { g.rect(px, py, T, T, th.ground); if (S.map[y - 1]?.[x] !== '#') { g.rect(px, py, T, 8, th.top); if (S.lvl === 0) g.emoji('🌿', px + 20, py - 4, 18); } g.stroke(px + 1, py + 1, T - 2, T - 2, 'rgba(0,0,0,.2)', 1); }
    else if (t === '=') { g.rect(px, py, T, 10, S.lvl === 1 ? '#64748b' : '#8b5a2b'); g.line(px, py + 10, px + T, py + 10, 'rgba(0,0,0,.4)', 2); g.line(px + 20, py + 10, px + 20, py + 24, 'rgba(0,0,0,.3)', 3); }
  }
  for (const bx of S.boxes) { if (bx.done) { g.rect(bx.x, bx.y + 20, 40, 20, '#374151'); continue; } g.rrect(bx.x, bx.y, 40, 40, 4, '#475569', '#1e293b'); const o = bx.open; g.rect(bx.x + 6, bx.y + 6, 28, 28, '#111827'); if (o > 0.5) { g.circle(bx.x + 20, bx.y + 20, 10, Math.floor(g.time * 6) % 2 ? '#ef4444' : '#f87171'); g.text('?', bx.x + 20, bx.y + 21, 14, '#fff'); } else { g.rect(bx.x + 6, bx.y + 6, 28, 28 * (1 - o), '#64748b'); } }
  for (const cp of S.caps) { g.emoji('🎁', cp.x, cp.y, 34); g.emoji('🪽', cp.x - 20, cp.y - 6 + Math.sin(g.time * 20) * 4, 18); }
  for (const it of S.items) { g.circle(it.x, it.y, 17, '#1e293b'); g.ring(it.x, it.y, 17, it.k === 'B' ? '#60a5fa' : GUNS[it.k].c, 3); g.text(it.k, it.x, it.y + 1, 18, '#fff'); }
  for (const e of S.ens) {
    if (e.dead || e.x > S.cam + g.W + 40) continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.flash > 0) c.globalAlpha = 0.5;
    if (e.type === 'runner' || e.type === 'rifle' || e.type === 'sniper') drawSoldier(g, c, e.x, e.y, e.face, e.type === 'runner' ? '#b91c1c' : e.type === 'sniper' ? '#6b21a8' : '#a16207', e.type === 'runner' ? g.time * 12 + e.x : 0, false);
    else if (e.type === 'turret') { g.rrect(e.x, e.y, e.w, e.h, 6, '#4b5563', '#111'); g.line(cx, cy, cx + Math.cos(e.ang || 3) * 26, cy + Math.sin(e.ang || 3) * 26, '#111', 9); g.circle(cx, cy, 9, '#ef4444'); }
    else if (e.type === 'drone') { g.emoji('🛸', cx, cy, 40); }
    else if (e.type === 'bug') { c.save(); c.translate(cx, cy); if (e.vx > 0) c.scale(-1, 1); g.emoji('🦂', 0, 0, 38); c.restore(); }
    c.globalAlpha = 1;
  }
  if (S.boss) drawBoss(g, c);
  for (const b of S.eb) { if (b.bomb) { g.circle(b.x, b.y, b.r, '#374151'); g.circle(b.x - 3, b.y - 3, 3, '#ef4444'); } else { g.circle(b.x, b.y, b.r, '#fff'); g.circle(b.x, b.y, b.r * 0.5, '#ef4444'); } }
  for (const b of S.pb) {
    if (b.k === 'L') { const l = b.len; g.line(b.x - Math.cos(b.ang) * l, b.y - Math.sin(b.ang) * l, b.x, b.y, '#60a5fa', 9); g.line(b.x - Math.cos(b.ang) * l, b.y - Math.sin(b.ang) * l, b.x, b.y, '#e0f2fe', 3); }
    else if (b.k === 'F') { g.circle(b.x, b.y, b.r, '#f97316'); g.circle(b.x, b.y, b.r * 0.55, '#fde047'); }
    else { g.circle(b.x, b.y, b.r, GUNS[b.k].c); g.circle(b.x, b.y, b.r * 0.45, '#fff'); }
  }
  drawPlayer(g, c);
  c.restore();
  // HUD
  for (let i = 0; i < S.guns.length; i++) { const k = S.guns[i], sel = i === S.gi; g.rrect(14 + i * 52, 12, 46, 46, 8, sel ? 'rgba(250,204,21,.3)' : 'rgba(0,0,0,.45)', sel ? '#facc15' : 'rgba(255,255,255,.25)', 2); g.text(k, 37 + i * 52, 30, 22, GUNS[k].c); g.text(String(i + 1), 22 + i * 52, 20, 10, '#fff'); g.text(GUNS[k].n, 37 + i * 52, 49, 9, '#e5e7eb', 'center', 'normal'); }
  for (let i = 0; i < Math.min(8, S.lives); i++) g.emoji('🎖️', g.W - 24 - i * 26, 28, 22);
  if (S.boss && !S.boss.dying) { const main = S.boss.parts.find((q) => q.n === 'core' || q.n === 'tank' || q.n === 'heart'); g.text(STAGES[S.lvl].boss, g.W / 2, 70, 20, '#fecaca'); g.rect(g.W / 2 - 200, 84, 400, 12, '#000'); g.rect(g.W / 2 - 200, 84, 400 * Math.max(0, main.hp) / main.max, 12, '#ef4444'); }
  if (S.intro > 0) { g.text('STAGE ' + STAGES[S.lvl].n, g.W / 2, g.H / 2 - 60, 44, '#fff'); }
  if (S.boss && S.boss.intro > 0 && Math.floor(g.time * 6) % 2) g.text('⚠ WARNING ⚠', g.W / 2, g.H / 2 - 100, 50, '#ef4444');
  if (S.clear && S.clear < 3) g.text('STAGE CLEAR!', g.W / 2, g.H / 2 - 60, 50, '#facc15');
}
function drawSoldier(g, c, x, y, face, col, run, prone) {
  c.save(); c.translate(x + 14, y + 44); c.scale(face || 1, 1);
  const a = run ? Math.sin(run) * 7 : 0;
  g.rect(-8 + a, -16, 7, 16, '#1f2937'); g.rect(2 - a, -16, 7, 16, '#1f2937');
  g.rrect(-9, -34, 18, 20, 4, col);
  g.circle(0, -39, 8, '#fcd9b6'); g.rect(-9, -47, 18, 6, col);
  g.rect(4, -30, 16, 5, '#111');
  c.restore();
}
function drawPlayer(g, c) {
  const P = S.p;
  if (S.dead) { c.save(); c.translate(P.x + 13, P.y + 20); c.rotate(-P.face * (2 - S.dead) * 5); g.rrect(-10, -20, 20, 40, 5, '#2563eb'); g.circle(0, -24, 8, '#fcd9b6'); c.restore(); return; }
  if (P.inv > 0 && Math.floor(g.time * 16) % 2) return;
  if (P.barrier > 0) g.circle(P.x + 13, P.y + P.h / 2, 34, `rgba(96,165,250,${0.25 + Math.sin(g.time * 12) * 0.1})`);
  const cx = P.x + 13;
  if (P.spin && !P.ground) { c.save(); c.translate(cx, P.y + 22); c.rotate(g.time * 18 * P.face); g.circle(0, 0, 15, '#2563eb'); g.circle(6, -6, 6, '#fcd9b6'); g.rect(-12, -3, 10, 6, '#dc2626'); c.restore(); return; }
  if (P.prone) { c.save(); c.translate(cx, P.y + 20); c.scale(P.face, 1); g.rrect(-24, -14, 40, 12, 4, '#2563eb'); g.circle(20, -10, 8, '#fcd9b6'); g.rect(14, -18, 14, 4, '#dc2626'); g.rect(24, -8, 22, 5, '#111'); c.restore(); return; }
  c.save(); c.translate(cx, P.y + P.h); c.scale(P.face, 1);
  const a = P.ground && Math.abs(P.vx) > 0 ? Math.sin(g.time * 14) * 7 : 0;
  g.rect(-8 + a, -18, 8, 18, '#1e3a8a'); g.rect(1 - a, -18, 8, 18, '#1e3a8a');
  g.rrect(-10, -36, 20, 20, 4, '#fcd9b6'); g.rect(-10, -24, 20, 6, '#2563eb');
  g.circle(0, -41, 8, '#fcd9b6'); g.rect(-9, -46, 18, 5, '#dc2626'); g.rect(-14, -44, 6, 3, '#dc2626');
  c.restore();
  const ang = Math.atan2(P.ay, P.ax);
  g.line(cx, P.y + 16, cx + Math.cos(ang) * 26, P.y + 16 + Math.sin(ang) * 26, '#111', 6);
  g.line(cx, P.y + 16, cx + Math.cos(ang) * 12, P.y + 16 + Math.sin(ang) * 12, '#fcd9b6', 5);
}
function drawBoss(g, c) {
  const B = S.boss;
  for (const p of B.parts) {
    const fl = p.flash > 0;
    if (p.hp <= 0) { g.rect(p.x, p.y + p.h - 16, p.w, 16, '#1f2937'); continue; }
    if (p.n === 'turret') { g.rrect(p.x, p.y, p.w, p.h, 6, fl ? '#fff' : '#57534e', '#111'); const a = Math.atan2(S.p.y - p.y, S.p.x - p.x); g.line(p.x + 20, p.y + 20, p.x + 20 + Math.cos(a) * 30, p.y + 20 + Math.sin(a) * 30, '#111', 10); g.circle(p.x + 20, p.y + 20, 8, '#f59e0b'); }
    if (p.n === 'core') { g.rect(p.x + 10, 2 * T, 200, 11 * T, '#44403c'); for (let i = 0; i < 6; i++) g.rect(p.x + 10, 2 * T + i * 70, 200, 4, '#292524'); g.rrect(p.x, p.y, p.w, p.h, 8, '#1c1917', '#facc15', 3); g.circle(p.x + 25, p.y + 35, 18 + Math.sin(g.time * 8) * 3, fl ? '#fff' : '#ef4444'); }
    if (p.n === 'tank') { c.save(); if (fl) c.globalAlpha = 0.6; g.rrect(p.x, p.y + 60, p.w, 50, 10, '#4d7c0f', '#1a2e05', 3); g.rrect(p.x + 40, p.y + 20, 120, 46, 10, '#65a30d', '#1a2e05', 3); g.rect(p.x - 50, p.y + 34, 90, 14, '#365314'); for (let i = 0; i < 6; i++) g.circle(p.x + 18 + i * 35, p.y + 116, 14, '#1f2937'); g.rect(p.x - 10, p.y + 88, 20, 10, '#111'); g.emoji('💀', p.x + 100, p.y + 42, 28); c.restore(); }
    if (p.n === 'heart') { c.save(); c.translate(p.x + p.w / 2, p.y + p.h / 2); c.scale(p.pulse || 1, p.pulse || 1); g.circle(0, 0, 76, fl ? '#fff' : '#9d174d'); g.circle(-10, -6, 54, '#be185d'); g.circle(-20, -10, 20, '#f9a8d4'); c.restore(); g.emoji('👁️', p.x + 30, p.y + 75, 40); }
    if (p.n === 'mouth') { g.circle(p.x + 30, p.y + 25, 30, fl ? '#fff' : '#86198f'); g.emoji('👄', p.x + 30, p.y + 25, 36); }
  }
  if (B.k === 2 && !B.dying) { const h = B.parts[0]; for (let i = 0; i < 2; i++) { const ox = h.x + 20, oy = h.y + 75; for (let s = 1; s <= 6; s++) { const ang = Math.PI + Math.sin(B.arms[i] + s * 0.4) * 0.9 + (i ? 0.5 : -0.5); g.circle(ox + Math.cos(ang) * s * 34, oy + Math.sin(ang) * s * 34, 16 - s, s === 6 ? '#f0abfc' : '#a21caf'); } } }
}
