let S;
const T = 40, ROWS = 15;
const BLOCKS = [
  { n: '1 성문 입구', sky: ['#0b0b2a', '#3a1a4a'], wall: '#3b2f4f', brick: '#5b4a6a', top: '#8a7a9a', boss: 'bat', bn: '거대 흡혈박쥐' },
  { n: '2 지하 수로', sky: ['#04141a', '#0a3a4a'], wall: '#1f3a44', brick: '#2f5a64', top: '#5a8a94', boss: 'medusa', bn: '메두사' },
  { n: '3 왕실 회랑', sky: ['#1a0a0a', '#4a1a1a'], wall: '#4a2a2a', brick: '#6a3a3a', top: '#a06a5a', boss: 'mummy', bn: '미라 형제' },
  { n: '4 연구실', sky: ['#0a1a0a', '#1a3a1a'], wall: '#2a3a2a', brick: '#3a5a3a', top: '#6a8a6a', boss: 'franken', bn: '프랑켄 & 이고르' },
  { n: '5 시계탑', sky: ['#1a1a0a', '#4a3a1a'], wall: '#3a3020', brick: '#5a4a30', top: '#9a8a5a', boss: 'death', bn: '사신' },
  { n: '6 드라큘라의 방', sky: ['#000', '#3a0010'], wall: '#2a0a14', brick: '#4a1424', top: '#8a3a4a', boss: 'dracula', bn: '드라큘라 백작' },
];
const SUBS = { dagger: { e: '🗡️', cost: 1 }, axe: { e: '🪓', cost: 1 }, holy: { e: '💧', cost: 1 }, cross: { e: '✝️', cost: 1 }, watch: { e: '⏱️', cost: 5 } };
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
GAME({
  title: '뱀파이어 성', w: 960, h: 600, bg: '#0b0b2a', controls: 'dpad+ab', aLabel: '점프', bLabel: '채찍',
  help: '←→ 이동 · ↓ 앉기 · Space/Z 점프 (방향 고정 점프!)\nX/Shift 채찍 · ↑ + X = 서브웨폰 (하트 소모)\n🕯️ 촛불을 쳐서 ❤️ 하트 · ⛓️ 채찍 강화 · 🗡️🪓💧✝️⏱️ 서브웨폰 획득\n맞으면 뒤로 튕겨나간다 — 구덩이 조심! 6블록 끝의 드라큘라를 쓰러뜨려라',
  init(g) { S = { blk: 0, lives: 3, hearts: 5, whip: 1, sub: null, shot2: false }; load(g); },
  update(g, dt) {
    const P = S.p;
    S.intro -= dt;
    if (S.intro > 0) return;
    if (S.clear) { S.clear -= dt; if (S.clear < 2.5 && S.hearts > 0 && g.frame % 3 === 0) { S.hearts--; g.score += 100; g.sfx.beep(1200, 0.02); } if (S.clear <= 0) { S.blk++; if (S.blk >= BLOCKS.length) return g.win(`드라큘라 격파! 악마성 붕괴 · 목숨 ${S.lives}`); load(g); } return; }
    if (S.dead) { S.dead -= dt; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`${BLOCKS[S.blk].n} · ${BLOCKS[S.blk].bn}에게 패배`); S.whip = Math.max(1, S.whip - 1); S.hearts = 5; respawn(g); } return; }
    S.time -= dt; if (S.time <= 0) return die(g);
    S.freeze -= dt;
    playerUpd(g, dt);
    if (S.dead) return;
    updWeapons(g, dt);
    if (S.freeze <= 0) { updEnemies(g, dt); spawner(g, dt); if (S.boss) updBoss(g, dt); updEB(g, dt); }
    updDrops(g, dt);
    if (!S.locked && P.x > S.arenaX * T + 60) { S.locked = true; S.boss = mkBoss(g); S.ens = []; for (let y = 0; y < 13; y++) S.map[y][S.arenaX] = '#'; g.sfx.tone(80, 1, 'sawtooth', 0.09, 40); S.bossIntro = 2; }
    const tgt = S.locked ? S.arenaX * T : U.clamp(P.x - 440, 0, (S.arenaX + 1) * T - g.W);
    S.cam = S.locked ? U.lerp(S.cam, tgt, Math.min(1, dt * 4)) : tgt;
    g.info = `${BLOCKS[S.blk].n} · ❤️${S.hearts} · 👤×${S.lives} · ⏱️${Math.ceil(S.time)}`;
  },
  draw(g, c) { drawAll(g, c); },
});
function load(g) {
  const b = S.blk, R = rng(b * 23 + 9), ri = (x, y) => x + Math.floor(R() * (y - x + 1));
  const W = 150;
  const M = Array.from({ length: ROWS }, () => Array(W).fill(' '));
  S.cands = []; S.ens = []; S.spawnZones = [];
  const ground = (x, top = 13) => { for (let y = top; y < ROWS; y++) M[y][x] = '#'; };
  const cand = (x, y) => S.cands.push({ x: x * T + 20, y: y * T + 20, drop: null, hp: 1 });
  const en = (type, x, y) => S.ens.push(mkE(type, x * T, y * T));
  for (let x = 0; x < 12; x++) ground(x);
  cand(4, 10); cand(9, 10);
  let x = 12;
  while (x < 118) {
    const f = R();
    if (f < 0.18) { const w = ri(8, 12); for (let k = 0; k < w; k++) ground(x + k); cand(x + 2, 10); cand(x + w - 3, 10); S.spawnZones.push({ x0: x * T, x1: (x + w) * T, type: b === 1 ? 'fish' : 'zombie' }); x += w; }
    else if (f < 0.32) { const gap = ri(2, 3); if (b === 1) for (let k = 0; k < gap; k++) M[14][x + k] = '~'; x += gap; for (let k = 0; k < 2; k++) ground(x + k); x += 2; if (b === 1) S.ens.push(mkE('fish', (x - gap - 1) * T, 13 * T)); }
    else if (f < 0.46) { const h = ri(2, 4); for (let k = 0; k < 10; k++) ground(x + k); for (let k = 2; k < 8; k++) M[13 - h][x + k] = '='; cand(x + 4, 13 - h - 2); en(b >= 2 ? 'skel' : 'knight', x + 5, 13 - h - 1); x += 10; }
    else if (f < 0.58) { const w = ri(8, 11); for (let k = 0; k < w; k++) ground(x + k); en(R() < 0.5 ? 'knight' : 'panther', x + w - 3, 12); cand(x + 3, 10); x += w; }
    else if (f < 0.7) { const w = ri(9, 12); for (let k = 0; k < w; k++) ground(x + k); en('bat', x + 6, 6); if (b >= 1) en('bat', x + 9, 5); cand(x + 2, 10); cand(x + 7, 10); x += w; }
    else if (f < 0.82) { const w = ri(8, 10); for (let k = 0; k < w; k++) ground(x + k, k < 3 || k > w - 3 ? 13 : 11); M[10][x + 4] = 'B'; S.breakables = S.breakables || []; cand(x + 5, 9); en(b >= 1 ? 'skel' : 'zombie', x + w - 2, 12); x += w; }
    else { const w = ri(10, 13); for (let k = 0; k < w; k++) ground(x + k); S.spawnZones.push({ x0: x * T, x1: (x + w) * T, type: b >= 2 ? 'head' : 'bat' }); cand(x + 3, 10); cand(x + 8, 10); x += w; }
  }
  for (; x < 124; x++) ground(x);
  S.arenaX = 124;
  for (let k = 124; k < 148; k++) ground(k);
  for (let k = 148; k < W; k++) for (let y = 0; y < ROWS; y++) M[y][k] = '#';
  for (let y = 0; y < 13; y++) M[y][147] = '#';
  if (b === 4) { for (let k = 128; k < 132; k++) M[9][k] = '='; for (let k = 140; k < 144; k++) M[9][k] = '='; }
  cand(127, 10); cand(144, 10);
  // 드롭 결정
  const pool = ['heart', 'heart', 'heart', 'big', 'heart', 'bag', 'sub', 'whip', 'heart', 'big', 'meat'];
  S.cands.forEach((cd, i) => { cd.drop = i < 6 && S.whip < 3 && i % 3 === 1 ? 'whip' : U.choice(pool); if (cd.drop === 'sub') cd.sub = U.choice(Object.keys(SUBS)); });
  S.map = M; S.W = W;
  S.time = 300; S.locked = false; S.boss = null; S.clear = 0; S.intro = 2; S.check = 0;
  S.ensInit = S.ens.map((e) => ({ ...e }));
  respawn(g, true);
}
function respawn(g, fresh) {
  S.p = { x: S.check ? (S.arenaX - 6) * T : 80, y: 13 * T - 60, w: 24, h: 58, vx: 0, vy: 0, face: 1, ground: false, hp: 16, inv: 0, hurt: 0, whipT: -1, crouch: false, jumpDir: 0, anim: 0 };
  S.cam = Math.max(0, S.p.x - 440); S.ens = S.ensInit.map((e) => ({ ...e })); S.eb = []; S.ws = []; S.drops = []; S.dead = 0; S.freeze = 0; S.spawnT = 2;
  if (!fresh) { S.locked = false; S.boss = null; for (let y = 0; y < 13; y++) S.map[y][S.arenaX] = ' '; S.time = Math.max(S.time, 150); }
}
function mkE(type, x, y) {
  const e = { type, x, y: y - 40, w: 30, h: 40, vx: 0, vy: 0, hp: 1, t: Math.random() * 2, face: -1, flash: 0, y0: y - 40 };
  if (type === 'knight') { e.hp = 4; e.h = 56; e.y = y - 56; e.vx = -40; }
  if (type === 'skel') { e.hp = 3; e.h = 54; e.y = y - 54; }
  if (type === 'zombie') { e.hp = 1; e.h = 54; e.y = y - 54; e.vx = -70; }
  if (type === 'panther') { e.hp = 1; e.w = 46; e.h = 28; e.y = y - 28; e.sleep = true; }
  if (type === 'bat') { e.hp = 1; e.fly = true; e.w = 28; e.h = 22; e.sleep = true; }
  if (type === 'head') { e.hp = 1; e.fly = true; e.w = 30; e.h = 30; }
  if (type === 'fish') { e.hp = 2; e.h = 50; e.y = 14 * T; e.under = true; e.t = Math.random() * 3; }
  return e;
}
function solid(tx, ty) { if (tx < 0) return true; const t = S.map[ty]?.[tx]; return t === '#' || t === 'B'; }
function move(o, dt, oneway = true) {
  o.hitWall = false; o.ground = false;
  o.x += o.vx * dt;
  const y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = tx * T - o.w - 0.01; o.hitWall = true; break; } }
  else if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = (tx + 1) * T; o.hitWall = true; break; } }
  const pb = o.y + o.h;
  o.y += o.vy * dt;
  const x0 = Math.floor((o.x + 2) / T), x1 = Math.floor((o.x + o.w - 2) / T);
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = x0; x <= x1; x++) { const t = S.map[ty]?.[x]; if (solid(x, ty) || (oneway && t === '=' && pb <= ty * T + 2)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; break; } } }
  else if (o.vy < 0) { const ty = Math.floor(o.y / T); for (let x = x0; x <= x1; x++) if (solid(x, ty)) { o.y = (ty + 1) * T; o.vy = 0; break; } }
}
function playerUpd(g, dt) {
  const P = S.p;
  P.inv -= dt;
  if (P.hurt > 0) { P.hurt -= dt; P.vy = Math.min(P.vy + 1700 * dt, 900); move(P, dt); if (P.ground && P.hurt < 0.3) P.hurt = 0; }
  else {
    const whipping = P.whipT >= 0;
    if (P.ground) {
      P.crouch = g.down && !whipping ? true : (whipping ? P.crouch : false);
      const dir = g.right - g.left;
      if (!whipping && !P.crouch) { P.vx = dir * 150; if (dir) P.face = dir; } else P.vx = 0;
      if (g.pressed('a') && !whipping && !P.crouch) { P.vy = -640; P.jumpDir = g.right - g.left; P.vx = P.jumpDir * 150; g.sfx.jump(); }
    }
    P.h = P.crouch ? 40 : 58;
    if (P.crouch && P.hPrev === 58) P.y += 18; if (!P.crouch && P.hPrev === 40) P.y -= 18; P.hPrev = P.h;
    P.vy = Math.min(P.vy + 1700 * dt, 900);
    move(P, dt);
    if (P.ground && P.jumpDir !== undefined && P.vy === 0 && P.whipT < 0 && !(g.right || g.left)) P.vx = 0;
    // 채찍 / 서브웨폰
    if (g.pressed('b') && P.whipT < 0) {
      if (g.up && S.sub && S.hearts >= SUBS[S.sub].cost && S.ws.filter((w) => w.sub).length < (S.shot2 ? 2 : 1)) throwSub(g);
      else { P.whipT = 0; P.whipHit = new Set(); g.sfx.tone(200, 0.12, 'sawtooth', 0.04, 600); }
    }
    if (P.whipT >= 0) {
      P.whipT += dt;
      if (P.whipT > 0.16 && P.whipT < 0.3) whipHit(g);
      if (P.whipT > 0.38) P.whipT = -1;
    }
  }
  P.anim += Math.abs(P.vx) * dt;
  P.x = U.clamp(P.x, S.cam, S.locked ? S.cam + g.W - P.w : S.W * T);
  if (P.y > g.H + 20) return die(g);
  if (!S.check && P.x > (S.arenaX - 6) * T) S.check = 1;
}
function whipBox() { const P = S.p, L = S.whip === 1 ? 70 : 104, y = P.y + (P.crouch ? 8 : 14); return { x: P.face > 0 ? P.x + P.w : P.x - L, y, w: L, h: 16 }; }
function whipHit(g) {
  const P = S.p, B = whipBox(), dmg = S.whip === 1 ? 1 : 2;
  for (const e of S.ens) if (!e.dead && !P.whipHit.has(e) && !e.under && U.rectHit(B, e)) { P.whipHit.add(e); hitE(g, e, dmg); }
  for (const cd of S.cands) if (!cd.gone && !P.whipHit.has(cd) && U.rectHit(B, { x: cd.x - 12, y: cd.y - 20, w: 24, h: 40 })) { P.whipHit.add(cd); breakCand(g, cd); }
  for (const b of S.eb) if (!b.dead && b.whipable && U.circRect(b, B)) { b.dead = true; g.sfx.hit(); g.add(50); }
  if (S.boss && !P.whipHit.has(S.boss)) for (const part of bossParts()) if (U.rectHit(B, part) && part.hp > 0) { P.whipHit.add(S.boss); hitBoss(g, part, dmg); break; }
  // 벽 블록
  const tx0 = Math.floor(B.x / T), tx1 = Math.floor((B.x + B.w) / T), ty = Math.floor((B.y + 8) / T);
  for (let tx = tx0; tx <= tx1; tx++) if (S.map[ty]?.[tx] === 'B') { S.map[ty][tx] = ' '; g.sfx.explode(); g.burst(tx * T + 20 - S.cam, ty * T + 20, ['#78716c', '#a8a29e'], 14, 200); S.drops.push({ k: 'meat', x: tx * T + 6, y: ty * T, w: 28, h: 24, vy: -200, life: 10 }); }
}
function breakCand(g, cd) {
  cd.gone = true; g.score += 20; g.sfx.pop(); g.burst(cd.x - S.cam, cd.y, ['#fde047', '#f97316'], 8, 120, 0.4);
  if (cd.drop === 'whip' && S.whip >= 3) cd.drop = 'big';
  S.drops.push({ k: cd.drop, sub: cd.sub, x: cd.x - 12, y: cd.y - 12, w: 24, h: 24, vy: -150, life: 9 });
}
function throwSub(g) {
  const P = S.p, k = S.sub; S.hearts -= SUBS[k].cost;
  const x = P.x + P.w / 2, y = P.y + 16;
  if (k === 'dagger') S.ws.push({ sub: k, x, y, vx: P.face * 560, vy: 0, r: 10, dmg: 2 });
  if (k === 'axe') S.ws.push({ sub: k, x, y, vx: P.face * 230, vy: -720, grav: 1500, r: 14, dmg: 3, pierce: true });
  if (k === 'holy') S.ws.push({ sub: k, x, y, vx: P.face * 260, vy: -250, grav: 1500, r: 10, dmg: 0 });
  if (k === 'cross') S.ws.push({ sub: k, x, y, vx: P.face * 520, vy: 0, r: 14, dmg: 3, pierce: true, cross: true, t: 0, dir: P.face });
  if (k === 'watch') { S.freeze = 3; g.sfx.tone(1000, 0.5, 'triangle', 0.08, 200); return; }
  g.sfx.shoot();
}
function updWeapons(g, dt) {
  const P = S.p;
  for (const w of S.ws) {
    w.t = (w.t || 0) + dt;
    if (w.fire) { w.life -= dt; if (w.life <= 0) w.dead = true; for (const e of S.ens) if (!e.dead && U.circRect({ x: w.x, y: w.y - 16, r: 26 }, e) && (e.fireCd || 0) <= 0) { e.fireCd = 0.3; hitE(g, e, 1); e.stun = 0.3; } if (S.boss) for (const p of bossParts()) if (p.hp > 0 && U.circRect({ x: w.x, y: w.y - 16, r: 26 }, p) && (S.boss.fireCd || 0) <= 0) { S.boss.fireCd = 0.35; hitBoss(g, p, 1, true); } continue; }
    if (w.grav) w.vy += w.grav * dt;
    if (w.cross) { w.vx -= w.dir * 1100 * dt; if (w.t > 0.5 && Math.abs(w.x - (P.x + 12)) < 30 && Math.abs(w.y - (P.y + 20)) < 40) { w.dead = true; continue; } }
    w.x += w.vx * dt; w.y += w.vy * dt;
    if (w.sub === 'holy' && (solid(Math.floor(w.x / T), Math.floor((w.y + 8) / T)) || S.map[Math.floor((w.y + 8) / T)]?.[Math.floor(w.x / T)] === '=')) { w.fire = true; w.life = 1.4; w.y = Math.floor((w.y + 8) / T) * T; g.sfx.tone(120, 0.6, 'sawtooth', 0.05, 60); continue; }
    if (w.x < S.cam - 60 || w.x > S.cam + g.W + 60 || w.y > g.H + 40) { w.dead = true; continue; }
    if (w.dmg) {
      for (const e of S.ens) if (!e.dead && !e.under && U.circRect(w, e) && !(w.hits && w.hits.has(e))) { hitE(g, e, w.dmg); if (w.pierce) (w.hits || (w.hits = new Set())).add(e); else { w.dead = true; break; } }
      if (S.boss && !w.dead) for (const p of bossParts()) if (p.hp > 0 && U.circRect(w, p) && !(w.hits && w.hits.has(p))) { hitBoss(g, p, w.dmg); if (w.pierce) (w.hits || (w.hits = new Set())).add(p); else w.dead = true; break; }
    }
  }
  S.ws = S.ws.filter((w) => !w.dead);
}
function hitE(g, e, dmg) {
  e.hp -= dmg; e.flash = 0.12; g.sfx.hit();
  if (e.hp <= 0) { e.dead = true; const pts = { zombie: 100, bat: 200, head: 300, knight: 400, skel: 300, panther: 200, fish: 300, snake: 100, bone: 0 }[e.type] || 100; g.add(pts, e.x + e.w / 2 - S.cam, e.y); g.burst(e.x + e.w / 2 - S.cam, e.y + e.h / 2, ['#f97316', '#fde047', '#fff'], 12, 180); if (Math.random() < 0.18) S.drops.push({ k: 'heart', x: e.x, y: e.y, w: 24, h: 24, vy: -150, life: 6 }); }
}
function hurtP(g, dmg, fromX) {
  const P = S.p;
  if (P.inv > 0 || S.dead || S.clear) return;
  P.hp -= dmg; P.inv = 1.5; g.sfx.hit(); g.shake(5, 0.2);
  if (P.hp <= 0) return die(g);
  P.hurt = 0.6; P.vy = -380; P.vx = (P.x + 12 < fromX ? -1 : 1) * 140; P.whipT = -1; P.crouch = false; P.ground = false;
}
function die(g) { if (S.dead) return; S.dead = 2.5; S.p.hp = 0; g.sfx.lose(); }
function spawner(g, dt) {
  if (S.locked) return;
  const P = S.p;
  S.spawnT -= dt;
  if (S.spawnT > 0) return;
  for (const z of S.spawnZones) if (P.x > z.x0 && P.x < z.x1) {
    S.spawnT = z.type === 'head' ? 2.2 : z.type === 'bat' ? 2.8 : 1.6;
    const side = Math.random() < 0.6 ? 1 : -1, sx = side > 0 ? S.cam + g.W + 10 : S.cam - 40;
    if (z.type === 'zombie') { const e = mkE('zombie', sx, 13 * T); e.vx = -side * (70 + S.blk * 10); S.ens.push(e); }
    if (z.type === 'bat') { const e = mkE('bat', sx, P.y + 20); e.sleep = false; e.vx = -side * 120; S.ens.push(e); }
    if (z.type === 'head') { const e = mkE('head', sx, P.y + 20); e.vx = -side * 130; e.y0 = P.y; S.ens.push(e); }
    if (z.type === 'fish') { const e = mkE('fish', P.x + U.rand(-250, 250), 13 * T); S.ens.push(e); }
    return;
  }
  S.spawnT = 0.5;
}
function updEnemies(g, dt) {
  const P = S.p;
  for (const e of S.ens) {
    if (e.dead) continue;
    if (e.x < S.cam - 300 || e.x > S.cam + g.W + 200) { if (e.type === 'zombie' || e.type === 'head' || (e.type === 'bat' && !e.sleep)) { if (e.x < S.cam - 300 || e.x > S.cam + g.W + 260) e.dead = true; } continue; }
    e.t += dt; e.flash -= dt; e.fireCd = (e.fireCd || 0) - dt;
    if (e.stun > 0) { e.stun -= dt; continue; }
    const toP = P.x < e.x ? -1 : 1;
    if (e.type === 'zombie') { e.vy = Math.min(e.vy + 1700 * dt, 900); move(e, dt); if (e.hitWall) e.vx = -e.vx; e.face = Math.sign(e.vx); }
    else if (e.type === 'knight') { e.vy = Math.min(e.vy + 1700 * dt, 900); const v = e.vx; move(e, dt); if (e.hitWall) e.vx = -v; if (e.ground) { const ax = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / T), by = Math.floor((e.y + e.h + 4) / T); if (!solid(ax, by) && S.map[by]?.[ax] !== '=') e.vx = -e.vx; } if (Math.random() < dt * 0.4) e.vx = toP * 50; e.face = Math.sign(e.vx); }
    else if (e.type === 'skel') { e.vy = Math.min(e.vy + 1700 * dt, 900); e.vx = Math.sin(e.t * 1.5) * 40; move(e, dt); e.face = toP; if (e.t % 2.2 < dt && Math.abs(P.x - e.x) < 500) S.eb.push({ x: e.x + 15, y: e.y + 10, vx: toP * U.rand(120, 220), vy: -560, grav: 1300, r: 10, e: '🦴', dmg: 2, whipable: true }); }
    else if (e.type === 'panther') { e.vy = Math.min(e.vy + 1700 * dt, 900); if (e.sleep && Math.abs(P.x - e.x) < 260) { e.sleep = false; e.vx = toP * 330; e.vy = -420; g.sfx.tone(200, 0.2, 'sawtooth', 0.05); } move(e, dt); if (!e.sleep && e.ground && e.t > 0.6 && Math.random() < dt * 0.6) e.vx = toP * 330; e.face = Math.sign(e.vx) || -1; }
    else if (e.type === 'bat') { if (e.sleep) { if (Math.abs(P.x - e.x) < 300) { e.sleep = false; e.vx = toP * 150; e.y0 = P.y; } } else { e.x += e.vx * dt; e.y += ((P.y + 10 - e.y) * 1.5 + Math.sin(e.t * 6) * 60) * dt; } }
    else if (e.type === 'head') { e.x += e.vx * dt; e.y = e.y0 + Math.sin(e.t * 4) * 70; }
    else if (e.type === 'fish') {
      if (e.under) { if (e.t > 2 && Math.abs(P.x - e.x) < 400) { e.under = false; e.vy = -900; e.y = solid(Math.floor((e.x + 15) / T), 13) ? 13 * T - e.h - 1 : 14 * T; g.sfx.tone(300, 0.2, 'triangle', 0.05, 800); g.burst(e.x + 15 - S.cam, 14 * T, '#38bdf8', 12, 200); } }
      else { e.vy = Math.min(e.vy + 1700 * dt, 900); move(e, dt); if (e.ground) { e.vx = toP * 50; e.face = toP; if (e.t % 2.5 < dt) S.eb.push({ x: e.x + 15, y: e.y + 16, vx: e.face * 220, vy: 0, r: 9, e: '🔥', dmg: 2 }); } if (e.y > g.H + 40) { e.under = true; e.t = 0; e.vy = 0; e.y = 14 * T; } }
    }
    else if (e.type === 'snake') { e.vy = Math.min(e.vy + 1700 * dt, 900); const v = e.vx; move(e, dt); if (e.hitWall) e.vx = -v; }
    if (!e.under && !e.dead && U.rectHit(P, e) && !(e.type === 'bat' && e.sleep)) { hurtP(g, e.type === 'knight' ? 3 : 2, e.x + e.w / 2); if (e.type === 'bat' || e.type === 'head') e.dead = true; }
  }
  S.ens = S.ens.filter((e) => !e.dead);
}
function updEB(g, dt) {
  const P = S.p;
  for (const b of S.eb) {
    if (b.grav) b.vy += b.grav * dt;
    if (b.sickle) { const a = Math.atan2(P.y + 20 - b.y, P.x + 12 - b.x); b.vx += Math.cos(a) * 300 * dt; b.vy += Math.sin(a) * 300 * dt; const s = Math.hypot(b.vx, b.vy); if (s > 220) { b.vx *= 220 / s; b.vy *= 220 / s; } }
    b.x += b.vx * dt; b.y += b.vy * dt; b.t = (b.t || 0) + dt;
    if (b.y > g.H + 40 || b.x < S.cam - 80 || b.x > S.cam + g.W + 80 || b.t > 8) b.dead = true;
    if (!b.dead && U.circRect(b, P)) { hurtP(g, b.dmg || 2, b.x); b.dead = true; }
  }
  S.eb = S.eb.filter((b) => !b.dead);
}
function updDrops(g, dt) {
  const P = S.p;
  for (const d of S.drops) {
    d.vy = Math.min(d.vy + 900 * dt, 300); d.vx = 0; move(d, dt); d.life -= dt;
    if (U.rectHit(P, d)) {
      d.got = true;
      if (d.k === 'heart') { S.hearts++; g.sfx.coin(); }
      if (d.k === 'big') { S.hearts += 5; g.sfx.coin(); }
      if (d.k === 'bag') { g.add(500, d.x - S.cam, d.y); g.sfx.coin(); }
      if (d.k === 'meat') { P.hp = 16; g.sfx.power(); g.float(d.x - S.cam, d.y - 20, '체력 회복!', '#4ade80'); }
      if (d.k === 'whip') { S.whip = Math.min(3, S.whip + 1); S.freeze = Math.max(S.freeze, 0.6); g.sfx.power(); g.float(d.x - S.cam, d.y - 20, '채찍 강화!', '#fde047'); }
      if (d.k === 'sub') { S.sub = d.sub; g.sfx.power(); g.float(d.x - S.cam, d.y - 20, SUBS[d.sub].e + ' 획득', '#fde047'); }
      if (d.k === 'orb') { S.clear = 4; g.sfx.win(); g.add(3000 + P.hp * 100 + Math.ceil(S.time) * 10, g.W / 2, 200); }
    }
  }
  S.drops = S.drops.filter((d) => !d.got && (d.life > 0 || d.k === 'orb'));
}
// ---------- 보스 ----------
function mkBoss(g) {
  const k = BLOCKS[S.blk].boss, ax = S.arenaX * T;
  const B = { k, t: 0, parts: [] };
  const P = (o) => Object.assign({ w: 60, h: 60, vx: 0, vy: 0, hp: 16, max: 16, flash: 0, t: 0, st: 0 }, o);
  if (k === 'bat') B.parts.push(P({ x: ax + 600, y: 100, w: 90, h: 50, hp: 16, max: 16, e: '🦇', size: 110 }));
  if (k === 'medusa') B.parts.push(P({ x: ax + 700, y: 250, w: 60, h: 70, hp: 20, max: 20, e: '🐍', head: '👩‍🦰', size: 70 }));
  if (k === 'mummy') { B.parts.push(P({ x: ax + 650, y: 13 * T - 80, w: 44, h: 80, hp: 12, max: 12, e: '🧟', size: 80, walk: true })); B.parts.push(P({ x: ax + 780, y: 13 * T - 80, w: 44, h: 80, hp: 12, max: 12, e: '🧟‍♂️', size: 80, walk: true, t: 1 })); }
  if (k === 'franken') { B.parts.push(P({ x: ax + 700, y: 13 * T - 100, w: 56, h: 100, hp: 24, max: 24, e: '🧌', size: 100, walk: true })); B.parts.push(P({ x: ax + 760, y: 13 * T - 36, w: 30, h: 36, hp: 6, max: 6, e: '🧝', size: 36, walk: true, igor: true })); }
  if (k === 'death') B.parts.push(P({ x: ax + 650, y: 120, w: 70, h: 90, hp: 28, max: 28, e: '💀', size: 90, robe: true }));
  if (k === 'dracula') B.parts.push(P({ x: ax + 700, y: 13 * T - 100, w: 50, h: 100, hp: 30, max: 30, e: '🧛', size: 100, tele: true }));
  return B;
}
function bossParts() { return S.boss ? S.boss.parts : []; }
function hitBoss(g, p, dmg, silent) {
  if (p.hp <= 0 || p.flash > 0.3 || S.bossIntro > 0) return;
  if (p.tele && p.hidden) return;
  p.hp -= dmg; p.flash = 0.45; g.score += 50 * dmg; if (!silent) g.sfx.hit(); g.shake(3, 0.1);
  g.burst(p.x + p.w / 2 - S.cam, p.y + p.h / 2, ['#fff', '#fca5a5'], 8, 200);
  if (p.hp <= 0) {
    g.sfx.explode(); g.shake(8, 0.4); g.add(2000, p.x - S.cam, p.y);
    g.burst(p.x + p.w / 2 - S.cam, p.y + p.h / 2, ['#f97316', '#fde047', '#fff'], 40, 300, 1, 5);
    if (S.boss.k === 'dracula' && !S.boss.phase2) { S.boss.phase2 = true; p.hp = 40; p.max = 40; p.e = '👹'; p.size = 150; p.w = 110; p.h = 130; p.y = 13 * T - 130; p.tele = false; p.hidden = false; p.walk = true; p.t = 0; p.flash = 1.5; g.float(g.W / 2, 160, '진정한 모습을 드러냈다!', '#ef4444', 30); return; }
    if (S.boss.parts.every((q) => q.hp <= 0 || q.igor)) { S.boss.parts.forEach((q) => (q.hp = 0)); S.eb = []; S.drops.push({ k: 'orb', x: S.arenaX * T + 460, y: 200, w: 30, h: 30, vy: 0, life: 99 }); S.bossDead = true; }
  }
}
function updBoss(g, dt) {
  const B = S.boss, P = S.p, ax = S.arenaX * T, hard = 1 + S.blk * 0.1;
  if (S.bossIntro > 0) { S.bossIntro -= dt; return; }
  for (const p of B.parts) {
    if (p.hp <= 0) continue;
    p.t += dt * hard; p.flash -= dt;
    const toP = P.x + 12 < p.x + p.w / 2 ? -1 : 1, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (B.k === 'bat') {
      if (p.st === 0) { p.x += Math.sin(p.t * 1.3) * 160 * dt; p.y = 110 + Math.sin(p.t * 2.5) * 40; if (p.t > 3) { p.t = 0; p.st = Math.random() < 0.6 ? 1 : 2; p.tx = P.x; p.ty = P.y; } }
      else if (p.st === 1) { const a = Math.atan2(p.ty - cy, p.tx - cx); p.x += Math.cos(a) * 420 * dt; p.y += Math.sin(a) * 420 * dt; if (Math.hypot(p.tx - cx, p.ty - cy) < 30 || p.t > 1.5) { p.st = 0; p.t = 0; } }
      else { for (const d of [-0.3, 0, 0.3]) { const a = Math.atan2(P.y + 20 - cy, P.x + 12 - cx) + d; S.eb.push({ x: cx, y: cy, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 10, e: '🔥', dmg: 2 }); } g.sfx.tone(160, 0.3, 'sawtooth', 0.06); p.st = 0; p.t = 0; }
      p.x = U.clamp(p.x, ax + 40, ax + 860); p.y = U.clamp(p.y, 40, 480);
    }
    if (B.k === 'medusa') { p.x += (p.dir || -1) * 90 * dt; if (p.x < ax + 60) p.dir = 1; if (p.x > ax + 820) p.dir = -1; p.y = 220 + Math.sin(p.t * 2) * 110; if (p.t % 3 < dt) { const s = mkE('snake', cx, 13 * T); s.vx = toP * 160; s.w = 34; s.h = 22; s.y = 13 * T - 22; s.hp = 1; S.ens.push(s); g.sfx.pop(); } if (p.t % 4.5 < dt) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; S.eb.push({ x: cx, y: cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 9, e: '💚', dmg: 2 }); } } }
    if (B.k === 'mummy') { p.vy = Math.min(p.vy + 1700 * dt, 900); p.vx = toP * 50 * hard; move(p, dt); p.x = U.clamp(p.x, ax + 40, ax + 880); if (p.t % 2.6 < dt) S.eb.push({ x: cx, y: p.y + 30, vx: toP * 200, vy: 0, r: 12, e: '🧻', dmg: 2, whipable: true, wave: true }); }
    if (B.k === 'franken') {
      p.vy = Math.min(p.vy + 1700 * dt, 900);
      if (p.igor) { if (p.ground && p.t > 0.6) { p.t = 0; p.vy = -U.rand(400, 700); p.vx = U.rand(-200, 200); if (Math.random() < 0.5) S.eb.push({ x: cx, y: cy, vx: toP * 240, vy: -100, grav: 400, r: 9, e: '🔥', dmg: 2 }); } if (p.ground) p.vx = 0; p.hp = Math.max(p.hp, 1); }
      else { p.vx = (Math.sin(p.t * 0.7) > 0 ? 1 : -1) * 70 * hard; if (p.t % 3 < dt) { p.vy = -500; } }
      move(p, dt); p.x = U.clamp(p.x, ax + 40, ax + 880);
    }
    if (B.k === 'death') { const tx = P.x + 12 + Math.sin(p.t) * 200, ty = P.y - 140; p.x += (tx - cx) * 0.6 * dt; p.y += (ty - cy) * 0.6 * dt; p.x = U.clamp(p.x, ax + 40, ax + 860); p.y = U.clamp(p.y, 30, 400); if (p.t % 2.4 < dt) { const n = 2 + Math.floor(S.blk / 2); for (let i = 0; i < n; i++) S.eb.push({ x: cx + U.rand(-120, 120), y: cy + U.rand(-60, 60), vx: 0, vy: 0, r: 13, e: '🌙', dmg: 2, sickle: true, whipable: true }); g.sfx.tone(500, 0.2, 'triangle', 0.05, 200); } }
    if (B.k === 'dracula') {
      if (p.tele) {
        if (!p.hidden && p.t > 2.2) { p.hidden = true; p.t = 0; g.sfx.tone(900, 0.2, 'sine', 0.05, 200); }
        else if (p.hidden && p.t > 0.8) { p.hidden = false; p.t = 0; p.x = U.clamp(P.x + U.choice([-280, 280]), ax + 60, ax + 840); for (let i = 0; i < 3; i++) g.later(() => { if (p.hp > 0 && !p.hidden) { const a = Math.atan2(P.y + 20 - (p.y + 30), P.x - cx) + (i - 1) * 0.18; S.eb.push({ x: p.x + 25, y: p.y + 30, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 11, e: '🔥', dmg: 3 }); g.sfx.shoot(); } }, 0.5 + i * 0.08); }
      } else {
        p.vy = Math.min(p.vy + 1500 * dt, 900);
        if (p.ground && p.t > 1.6) { p.t = 0; p.vy = -800; p.vx = toP * 220; }
        if (p.ground && p.vy === 0) p.vx = 0;
        if (p.t % 1.8 < dt) for (let i = 0; i < 3; i++) S.eb.push({ x: cx, y: p.y + 40, vx: toP * (200 + i * 60), vy: -200 + i * 100, r: 12, e: '🔥', dmg: 3 });
        move(p, dt); p.x = U.clamp(p.x, ax + 40, ax + 920 - p.w);
      }
    }
    if (!(p.tele && p.hidden) && U.rectHit(P, p)) hurtP(g, 3, cx);
  }
  for (const b of S.eb) if (b.wave) b.y += Math.sin(b.t * 8) * 2;
}
// ---------- 그리기 ----------
function drawAll(g, c) {
  const th = BLOCKS[S.blk];
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  g.circle(780 - S.cam * 0.02, 110, 60, 'rgba(255,240,200,.75)'); g.circle(800 - S.cam * 0.02, 100, 56, th.sky[0]);
  for (let i = 0; i < 8; i++) { const x = ((i * 220 - S.cam * 0.3) % 1760 + 1760) % 1760 - 160; g.rect(x, 200 + (i % 3) * 40, 70, 400, 'rgba(0,0,0,.35)'); g.poly([[x - 6, 200 + (i % 3) * 40], [x + 35, 140 + (i % 3) * 40], [x + 76, 200 + (i % 3) * 40]], 'rgba(0,0,0,.35)'); g.rect(x + 28, 240 + (i % 3) * 40, 14, 22, 'rgba(250,204,21,.25)'); }
  // 실내 벽
  for (let i = -1; i < 9; i++) { const bx = Math.floor(S.cam / 120) * 120 + i * 120 - S.cam; g.rect(bx, 0, 116, 520, 'rgba(0,0,0,.08)'); if ((Math.floor(S.cam / 120) + i) % 4 === 0) { g.rrect(bx + 30, 120, 56, 110, 28, 'rgba(10,10,30,.6)', th.top, 2); } }
  c.save(); c.translate(-Math.round(S.cam), 0);
  const x0 = Math.max(0, Math.floor(S.cam / T)), x1 = Math.min(S.W - 1, x0 + 25);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const t = S.map[y][x], px = x * T, py = y * T;
    if (t === '#') { g.rect(px, py, T, T, th.brick); g.rect(px, py + 18, T, 3, th.wall); g.rect(px + ((y % 2) ? 18 : 0), py, 3, 18, th.wall); g.rect(px + ((y % 2) ? 0 : 18), py + 21, 3, 19, th.wall); if (S.map[y - 1]?.[x] !== '#') g.rect(px, py, T, 5, th.top); }
    else if (t === '=') { g.rect(px, py, T, 14, th.top); g.rect(px, py + 14, T, 4, th.wall); }
    else if (t === 'B') { g.rect(px, py, T, T, '#78716c'); g.stroke(px + 2, py + 2, T - 4, T - 4, '#44403c', 3); }
    else if (t === '~') { g.rect(px, py + 6 + Math.sin(g.time * 3 + x) * 3, T, T, 'rgba(56,189,248,.6)'); }
  }
  for (const cd of S.cands) { if (cd.gone || cd.x < S.cam - 40 || cd.x > S.cam + g.W + 40) continue; g.rect(cd.x - 4, cd.y, 8, 22, '#e5e7eb'); g.emoji('🔥', cd.x, cd.y - 8 + Math.sin(g.time * 12 + cd.x) * 2, 20); g.rect(cd.x - 10, cd.y + 22, 20, 4, '#a16207'); }
  for (const d of S.drops) { if (d.life < 2 && Math.floor(g.time * 10) % 2 && d.k !== 'orb') continue; const e = { heart: '❤️', big: '💖', bag: '💰', meat: '🍖', whip: '⛓️', orb: '🔮' }[d.k] || (d.sub && SUBS[d.sub].e); g.emoji(e, d.x + d.w / 2, d.y + d.h / 2, d.k === 'heart' ? 18 : d.k === 'orb' ? 40 : 28); }
  for (const e of S.ens) {
    if (e.dead || e.under || e.x < S.cam - 60 || e.x > S.cam + g.W + 60) continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.flash > 0) c.globalAlpha = 0.5;
    c.save(); c.translate(cx, cy); if (e.face > 0 || e.vx > 0) c.scale(-1, 1);
    const em = { zombie: '🧟', knight: '🛡️', skel: '☠️', panther: '🐆', bat: '🦇', head: '👻', fish: '🐟', snake: '🐍' }[e.type];
    if (e.type === 'knight') { g.rrect(-15, -28, 30, 56, 6, '#64748b', '#1e293b'); g.emoji('🪖', 0, -26, 30); g.emoji('🛡️', -14, 4, 28); g.line(10, -10, 26, -34, '#cbd5e1', 4); }
    else if (e.type === 'skel') { g.emoji('💀', 0, -16, 30); g.rect(-8, -2, 16, 26, '#e5e7eb'); g.line(-6, 0, -16, 14, '#e5e7eb', 3); g.line(6, 0, 16, 14, '#e5e7eb', 3); }
    else g.emoji(em, 0, 0, e.type === 'zombie' ? 50 : e.type === 'fish' ? 46 : e.type === 'bat' && e.sleep ? 26 : 36);
    c.restore(); c.globalAlpha = 1;
  }
  if (S.boss) for (const p of S.boss.parts) {
    if (p.hp <= 0 || (p.hidden)) continue;
    if (p.flash > 0 && Math.floor(g.time * 20) % 2) continue;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (p.robe) { g.poly([[cx - 40, cy - 10], [cx + 40, cy - 10], [cx + 50, cy + 60], [cx - 50, cy + 60]], 'rgba(30,20,50,.85)'); g.emoji('🪓', cx + 40, cy - 10, 50); }
    if (p.k === 'dracula' || p.tele) { g.poly([[cx - 36, cy - 20], [cx + 36, cy - 20], [cx + 46, cy + 50], [cx - 46, cy + 50]], '#111'); g.poly([[cx - 30, cy - 20], [cx + 30, cy - 20], [cx + 36, cy + 50], [cx - 36, cy + 50]], '#7f1d1d'); }
    g.emoji(p.e, cx, cy, p.size);
    if (p.head) g.emoji(p.head, cx, cy - 34, 40);
  }
  if (S.boss && S.bossDead) {}
  for (const b of S.eb) { c.save(); c.translate(b.x, b.y); if (b.e === '🦴' || b.sickle) c.rotate(g.time * 12); g.emoji(b.e || '🔥', 0, 0, b.r * 2.4); c.restore(); }
  for (const w of S.ws) {
    if (w.fire) { for (let i = 0; i < 3; i++) g.emoji('🔥', w.x - 18 + i * 18, w.y - 14 - Math.abs(Math.sin(g.time * 15 + i)) * 8, 30); continue; }
    c.save(); c.translate(w.x, w.y); if (w.sub !== 'dagger' && w.sub !== 'holy') c.rotate(g.time * 14); if (w.sub === 'dagger' && w.vx < 0) c.scale(-1, 1); g.emoji(SUBS[w.sub].e, 0, 0, 28); c.restore();
  }
  drawPlayer(g, c);
  c.restore();
  // HUD
  g.rrect(10, 10, 420, 62, 10, 'rgba(0,0,0,.6)');
  g.text('PLAYER', 20, 26, 13, '#fff', 'left'); for (let i = 0; i < 16; i++) g.rect(84 + i * 12, 20, 9, 13, i < S.p.hp ? '#f87171' : '#3f3f46');
  g.text('ENEMY', 20, 52, 13, '#fff', 'left');
  let bh = 16, bm = 16; if (S.boss) { bh = S.boss.parts.filter((p) => !p.igor).reduce((a, p) => a + Math.max(0, p.hp), 0); bm = S.boss.parts.filter((p) => !p.igor).reduce((a, p) => a + p.max, 0); }
  for (let i = 0; i < 16; i++) g.rect(84 + i * 12, 46, 9, 13, i < Math.ceil(bh / bm * 16) ? '#fb923c' : '#3f3f46');
  g.rrect(290, 18, 50, 46, 6, '#111', '#ef4444', 2); g.emoji(S.sub ? SUBS[S.sub].e : '', 315, 41, 30);
  g.text(`❤️ ${S.hearts}`, 360, 30, 16, '#fff', 'left'); g.text('⛓️'.repeat(S.whip), 360, 54, 12, '#fff', 'left');
  if (S.intro > 0) { c.fillStyle = '#000'; c.globalAlpha = Math.min(1, S.intro); c.fillRect(0, 0, g.W, g.H); c.globalAlpha = 1; g.text('BLOCK ' + th.n, g.W / 2, g.H / 2 - 20, 44, '#fff'); g.text(`보스: ${th.bn}`, g.W / 2, g.H / 2 + 30, 22, '#fca5a5'); }
  if (S.bossIntro > 0) g.text(th.bn, g.W / 2, 150, 40, '#ef4444');
  if (S.freeze > 0 && !S.clear) { c.fillStyle = 'rgba(147,197,253,.12)'; c.fillRect(0, 0, g.W, g.H); }
  if (S.clear) g.text('BLOCK CLEAR!', g.W / 2, 200, 50, '#facc15');
}
function drawPlayer(g, c) {
  const P = S.p;
  if (S.dead) { g.emoji('💀', P.x + 12, P.y + 40, 40); return; }
  if (P.inv > 0 && Math.floor(g.time * 16) % 2) return;
  const cx = P.x + 12, by = P.y + P.h;
  c.save(); c.translate(cx, by); c.scale(P.face, 1);
  const cr = P.crouch, run = P.ground && Math.abs(P.vx) > 10, ph = Math.sin(P.anim / 10) * 7;
  const hy = cr ? -18 : 0;
  if (!cr) { g.rect(-9 + (run ? ph : 0), -24, 8, 24, '#7c2d12'); g.rect(2 - (run ? ph : 0), -24, 8, 24, '#7c2d12'); }
  else { g.rect(-12, -10, 24, 10, '#7c2d12'); }
  g.rrect(-12, -50 - hy, 24, 28, 4, '#a16207'); g.rect(-12, -28 - hy, 24, 4, '#451a03');
  g.circle(0, -58 - hy, 9, '#f5c9a0'); g.rect(-9, -68 - hy, 18, 6, '#78350f'); g.rect(3, -60 - hy, 3, 3, '#111');
  if (P.whipT >= 0) {
    const L = S.whip === 1 ? 70 : 104, ext = P.whipT > 0.16 ? 1 : P.whipT / 0.16;
    if (ext < 1) { g.line(-6, -44 - hy, -26, -70 - hy, '#f5c9a0', 6); g.line(-26, -70 - hy, -50, -60 - hy, S.whip === 3 ? '#fbbf24' : '#92400e', 3); }
    else { g.line(6, -42 - hy, 16, -42 - hy, '#f5c9a0', 6); const wy = -42 - hy + (cr ? 4 : 0); g.line(16, wy, 16 + L, wy + 2, S.whip === 3 ? '#fbbf24' : S.whip === 2 ? '#d1d5db' : '#92400e', S.whip === 1 ? 3 : 4); if (S.whip >= 2) g.circle(16 + L, wy + 2, 6, S.whip === 3 ? '#fbbf24' : '#9ca3af'); }
  } else { g.line(6, -44 - hy, 10, -28 - hy, '#f5c9a0', 6); g.circle(12, -26 - hy, 5, '#92400e'); }
  c.restore();
}
