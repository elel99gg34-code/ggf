let S;
const T = 40, ROWS = 15;
const WEAPONS = [
  { id: 'P', n: '록 버스터', e: '🔵', c: '#2a7bff', c2: '#5ee1ff', cost: 0 },
  { id: 'F', n: '파이어 스톰', e: '🔥', c: '#e2452b', c2: '#ffb347', cost: 2 },
  { id: 'I', n: '아이스 슬래셔', e: '❄️', c: '#38bdf8', c2: '#e0f7ff', cost: 2 },
  { id: 'E', n: '썬더 빔', e: '⚡', c: '#d4a106', c2: '#fff59d', cost: 2 },
  { id: 'C', n: '롤링 커터', e: '✂️', c: '#9ca3af', c2: '#f3f4f6', cost: 1 },
  { id: 'B', n: '하이퍼 봄', e: '💣', c: '#16a34a', c2: '#bef264', cost: 2 },
  { id: 'L', n: '리프 실드', e: '🍃', c: '#65a30d', c2: '#d9f99d', cost: 3 },
];
const BOSSES = [
  { k: 'F', n: '파이어맨', e: '🔥', weak: 'I', sky: ['#3a0b0b', '#8a2a0a'], ground: '#5a2a1a', top: '#ff7a3a' },
  { k: 'I', n: '아이스맨', e: '❄️', weak: 'E', sky: ['#0b1e3a', '#5fa8d8'], ground: '#a7d3f0', top: '#ffffff' },
  { k: 'E', n: '엘렉맨', e: '⚡', weak: 'C', sky: ['#120a2a', '#3a2a6a'], ground: '#4a4a5a', top: '#ffd400' },
  { k: 'C', n: '커트맨', e: '✂️', weak: 'B', sky: ['#1a2a1a', '#6a8a5a'], ground: '#7a6a5a', top: '#c8b89a' },
  { k: 'B', n: '봄맨', e: '💣', weak: 'L', sky: ['#1a1a0a', '#7a6a2a'], ground: '#3a5a3a', top: '#9adf6a' },
  { k: 'L', n: '우드맨', e: '🍃', weak: 'F', sky: ['#0a2a12', '#2f7a3f'], ground: '#5a3a1a', top: '#3fbf3f' },
];
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
GAME({
  title: '록 버스터', w: 960, h: 600, bg: '#0b1020', controls: 'dpad+ab', aLabel: '점프', bLabel: '발사',
  help: '←→ 이동 · Space/Z 점프 (꾹 = 높이)\nX/Shift 발사 · 버스터는 꾹 눌러 차지샷\n↓ 또는 Q/E · 숫자키 무기 전환 (무기 에너지 소모)\n보스마다 약점 무기가 있다! 6보스를 모두 쓰러뜨려라',
  init(g) {
    S = { mode: 'select', cur: 0, cleared: [], owned: ['P'], energy: {}, lives: 3, wi: 0, msg: 0 };
    for (const w of WEAPONS) S.energy[w.id] = 28;
  },
  update(g, dt) {
    if (S.mode === 'select') return selectUpdate(g);
    if (S.mode === 'get') { S.getT -= dt; if (S.getT < 0 && (g.pressed('a') || g.pressed('b') || g.mouse.clicked || S.getT < -4)) afterGet(g); return; }
    play(g, dt);
  },
  draw(g, c) {
    if (S.mode === 'select') return selectDraw(g, c);
    if (S.mode === 'get') return getDraw(g, c);
    drawPlay(g, c);
  },
});
function wep() { return WEAPONS.find((w) => w.id === S.owned[S.wi]); }
function selectUpdate(g) {
  if (g.pressed('left')) { S.cur = (S.cur + 5) % 6; g.sfx.move(); }
  if (g.pressed('right')) { S.cur = (S.cur + 1) % 6; g.sfx.move(); }
  if (g.pressed('up') || g.pressed('down')) { S.cur = (S.cur + 3) % 6; g.sfx.move(); }
  for (let i = 0; i < 6; i++) { const r = cell(i); if (g.mouse.moved && g.inRect(r.x, r.y, r.w, r.h)) S.cur = i; if (g.clickIn(r.x, r.y, r.w, r.h)) { S.cur = i; return startStage(g, i); } }
  if (g.pressed('a')) startStage(g, S.cur);
  g.info = `남은 목숨 ${S.lives} · 격파 ${S.cleared.length}/6`;
}
function cell(i) { return { x: 150 + (i % 3) * 230, y: 150 + Math.floor(i / 3) * 210, w: 200, h: 180 }; }
function selectDraw(g, c) {
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#0b1a3a'); grd.addColorStop(1, '#1b0b3a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 40; i++) g.circle((i * 137 + g.time * 20) % g.W, (i * 89) % g.H, 1.5, 'rgba(255,255,255,.5)');
  g.text('STAGE SELECT', g.W / 2, 60, 46, '#5ee1ff'); g.text('보스를 고르세요 (방향키 + Space / 클릭)', g.W / 2, 108, 18, '#cbd5e1', 'center', 'normal');
  for (let i = 0; i < 6; i++) {
    const r = cell(i), b = BOSSES[i], done = S.cleared.includes(i), sel = S.cur === i;
    g.rrect(r.x, r.y, r.w, r.h, 14, done ? '#1f2937' : '#111c33', sel ? (Math.floor(g.time * 6) % 2 ? '#fff' : '#5ee1ff') : '#334155', sel ? 5 : 2);
    c.globalAlpha = done ? 0.35 : 1;
    g.emoji('🤖', r.x + r.w / 2, r.y + 78, 82); g.emoji(b.e, r.x + r.w / 2 + 40, r.y + 40, 40);
    c.globalAlpha = 1;
    g.text(b.n, r.x + r.w / 2, r.y + 150, 22, done ? '#64748b' : '#fff');
    if (done) g.text('CLEAR', r.x + r.w / 2, r.y + 85, 34, '#facc15');
  }
  g.text('보유 무기: ' + S.owned.map((id) => WEAPONS.find((w) => w.id === id).e).join(' '), g.W / 2, 565, 22, '#e2e8f0');
}
function startStage(g, i) {
  if (S.cleared.includes(i)) { g.sfx.beep(200, 0.1); return; }
  g.sfx.power(); S.stage = i; S.mode = 'play'; S.check = 0; buildStage(i); spawnPlayer();
}
function afterGet(g) {
  if (S.cleared.length >= 6) return g.win(`6보스 전원 격파! 목숨 ${S.lives} 남음`);
  S.mode = 'select'; S.cur = [0, 1, 2, 3, 4, 5].find((i) => !S.cleared.includes(i)) ?? 0;
}
function getDraw(g, c) {
  const b = BOSSES[S.stage], w = WEAPONS.find((x) => x.id === b.k);
  c.fillStyle = '#05070f'; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 12; i++) g.rect(0, i * 50 + ((g.time * 120) % 50), g.W, 3, 'rgba(94,225,255,.15)');
  g.text('WEAPON GET!', g.W / 2, 130, 52, w.c2);
  g.emoji('🤖', g.W / 2 - 80, 300, 120); g.emoji(w.e, g.W / 2 + 80, 300, 100);
  g.text(`${w.n} 획득!`, g.W / 2, 430, 34, '#fff');
  const weakOf = BOSSES.find((x) => x.weak === w.id);
  g.text(`힌트: ${weakOf.n}에게 효과가 크다`, g.W / 2, 480, 20, '#94a3b8', 'center', 'normal');
  if (S.getT < 0) g.text('Space 를 눌러 계속', g.W / 2, 540, 20, Math.floor(g.time * 3) % 2 ? '#fff' : '#64748b');
}
function buildStage(i) {
  const R = rng(i * 31 + 5), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const W = 150;
  const M = Array.from({ length: ROWS }, () => Array(W).fill(' '));
  S.ens = []; S.yoku = [];
  const ground = (x, top = 13) => { for (let y = top; y < ROWS; y++) M[y][x] = '#'; };
  const en = (type, x, y) => S.ens.push(mkEnemy(type, x * T + 4, y * T));
  for (let x = 0; x < 12; x++) ground(x);
  let x = 12; const diff = S.cleared.length;
  S.mid = 0;
  while (x < 112) {
    if (!S.mid && x > 58) { S.mid = x; for (let k = 0; k < 4; k++) ground(x + k); x += 4; continue; }
    const f = R();
    if (f < 0.17) { const w = ri(6, 9); for (let k = 0; k < w; k++) ground(x + k); en('met', x + ri(2, w - 2), 12); if (R() < 0.5) en('bee', x + w, 5); x += w; }
    else if (f < 0.32) { const w = ri(3, 5); for (let k = 0; k < w; k++) if (k % 3 === 1) M[ri(9, 11)][x + k] = 'S'; x += w; for (let k = 0; k < 3; k++) ground(x + k); x += 3; }
    else if (f < 0.46) { const h = ri(2, 4); for (let k = 0; k < 8; k++) ground(x + k, k < 4 ? 13 - Math.min(k, h) : 13 - h); en(R() < 0.5 ? 'cannon' : 'met', x + 5, 13 - h - 1); x += 8; for (let k = 0; k < 3; k++) ground(x + k, 11); x += 3; }
    else if (f < 0.58) { const w = ri(6, 8); for (let k = 0; k < w; k++) { ground(x + k, 14); M[13][x + k] = '^'; } for (let k = 1; k < w - 1; k += 2) M[10][x + k] = 'S'; en('bee', x + 4, 4); x += w; for (let k = 0; k < 3; k++) ground(x + k); x += 3; }
    else if (f < 0.7 && diff >= 1) { const w = 9; const base = S.yoku.length; for (let k = 0; k < 4; k++) S.yoku.push({ tx: x + 1 + k * 2, ty: 11 - (k % 2) * 2, ph: (k % 2), grp: base }); x += w; for (let k = 0; k < 3; k++) ground(x + k); x += 3; }
    else if (f < 0.82) { const w = ri(7, 10); for (let k = 0; k < w; k++) ground(x + k); en('hopper', x + 3, 12); if (diff >= 2) en('walker', x + w - 2, 12); x += w; }
    else { const w = ri(6, 9); for (let k = 0; k < w; k++) ground(x + k); M[9][x + 2] = 'S'; M[9][x + 3] = 'S'; en('cannon', x + 3, 8); en('walker', x + w - 2, 12); x += w; }
  }
  for (; x < 124; x++) ground(x);
  S.arenaX = 124;
  for (let k = 124; k < 148; k++) ground(k);
  for (let y = 0; y < 13; y++) { M[y][124] = y >= 10 ? 'D' : '#'; M[y][147] = '#'; }
  for (let k = 148; k < W; k++) for (let y = 0; y < ROWS; y++) M[y][k] = '#';
  M[10][128] = 'S'; M[10][129] = 'S'; M[10][142] = 'S'; M[10][143] = 'S';
  S.map = M; S.W = W; S.ensInit = null;
}
function mkEnemy(type, x, y) {
  const base = { type, x, y, w: 32, h: 32, vx: 0, vy: 0, t: Math.random() * 2, hp: 1, freeze: 0, fly: false, flash: 0 };
  if (type === 'met') { base.hp = 1; base.y = y + 8; base.h = 24; }
  if (type === 'bee') { base.hp = 1; base.fly = true; base.y0 = y; }
  if (type === 'cannon') { base.hp = 4; base.y = y; }
  if (type === 'hopper') { base.hp = 2; }
  if (type === 'walker') { base.hp = 3; base.vx = -70; base.h = 38; base.y = y - 6; }
  return base;
}
function spawnPlayer() {
  const sx = S.check === 2 ? (S.arenaX - 4) * T : S.check === 1 ? (S.mid + 1) * T : 80;
  S.p = { x: sx, y: 13 * T - 36 - 200, w: 26, h: 36, vx: 0, vy: 0, face: 1, ground: false, hp: 28, inv: 0, charge: 0, shootT: 0, hurtT: 0, anim: 0 };
  S.pb = []; S.eb = []; S.drops = []; S.boss = null; S.bossFill = 0; S.dead = 0; S.locked = false; S.shield = null; S.expl = [];
  S.cam = Math.max(0, sx - 300); S.ready = 1.6;
  if (S.check === 2) S.cam = Math.min(S.cam, (S.arenaX - 24) * T + 40);
  S.map.forEach((row) => { if (row[124] === 'X') row[124] = 'D'; });
  for (let y = 10; y < 13; y++) S.map[y][124] = 'D';
  if (!S.ensInit) S.ensInit = S.ens.map((e) => ({ ...e }));
  S.ens = S.ensInit.map((e) => ({ ...e }));
}
function solid(tx, ty) {
  if (tx < 0) return true;
  const t = S.map[ty]?.[tx];
  if (t === '#' || t === 'S' || t === 'X') return true;
  if (S.yokuOn && S.yokuOn.has(tx + ',' + ty)) return true;
  return false;
}
function move(o, dt) {
  o.hitWall = false; o.ground = false;
  o.x += o.vx * dt;
  let y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = tx * T - o.w - 0.01; o.hitWall = true; break; } }
  else if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = (tx + 1) * T; o.hitWall = true; break; } }
  o.y += o.vy * dt;
  const x0 = Math.floor((o.x + 2) / T), x1 = Math.floor((o.x + o.w - 2) / T);
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = x0; x <= x1; x++) if (solid(x, ty)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; break; } }
  else if (o.vy < 0) { const ty = Math.floor(o.y / T); for (let x = x0; x <= x1; x++) if (solid(x, ty)) { o.y = (ty + 1) * T; o.vy = 0; break; } }
}
function play(g, dt) {
  const P = S.p;
  // 출현 블록
  const cyc = g.time % 3;
  S.yokuOn = new Set();
  for (const y of S.yoku) { const on = y.ph ? cyc >= 1.5 : cyc < 1.5; if (on || (cyc % 1.5) > 1.3) { y.on = on; } if (on) S.yokuOn.add(y.tx + ',' + y.ty); y.on = on; }
  if (S.ready > 0) { S.ready -= dt; }
  if (S.dead) {
    S.dead -= dt;
    if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`${BOSSES[S.stage].n} 스테이지에서 전멸 · 격파 ${S.cleared.length}`); spawnPlayer(); }
    return;
  }
  if (S.win) { S.win -= dt; if (S.win <= 0) { S.mode = 'get'; S.getT = 1.2; S.cleared.push(S.stage); S.owned.push(BOSSES[S.stage].k); S.ensInit = null; for (const w of WEAPONS) S.energy[w.id] = 28; g.sfx.win(); } return; }
  // 이동
  const dir = g.right - g.left;
  P.hurtT -= dt; P.inv -= dt;
  if (P.hurtT > 0) { P.vx = -P.face * 80; }
  else { P.vx = dir * 200; if (dir) P.face = dir; }
  if (S.ready <= 0 && P.hurtT <= 0) {
    if (g.pressed('a') && P.ground) { P.vy = -650; g.sfx.jump(); }
    if (!g.a && P.vy < -150) P.vy = -150;
    // 무기 전환
    let sw = 0; if (g.pressed('down') || g.keyp('KeyE')) sw = 1; if (g.keyp('KeyQ')) sw = -1;
    for (let i = 1; i <= 7; i++) if (g.keyp('Digit' + i) && S.owned[i - 1]) { S.wi = i - 1; sw = 0; g.sfx.click(); S.charge = 0; }
    if (sw) { S.wi = (S.wi + sw + S.owned.length) % S.owned.length; g.sfx.click(); P.charge = 0; S.shield = null; }
    shootLogic(g, dt);
  }
  P.vy = Math.min(P.vy + 1800 * dt, 850);
  move(P, dt);
  P.anim += Math.abs(P.vx) * dt;
  const lo = S.cam, hi = S.locked ? S.cam + g.W - P.w : S.W * T;
  P.x = U.clamp(P.x, lo, hi);
  if (P.y > g.H + 40) return die(g);
  // 가시
  const fx0 = Math.floor((P.x + 4) / T), fx1 = Math.floor((P.x + P.w - 4) / T), fy = Math.floor((P.y + P.h + 1) / T);
  if (P.ground && (S.map[fy]?.[fx0] === '^' || S.map[fy]?.[fx1] === '^') || S.map[Math.floor((P.y + P.h - 4) / T)]?.[fx0] === '^') { if (P.inv <= 0) return die(g); }
  // 체크포인트
  if (S.check < 1 && P.x > S.mid * T) { S.check = 1; g.float(P.x - S.cam, P.y - 20, 'CHECK!', '#5ee1ff'); }
  // 보스방
  if (!S.locked && P.x > (S.arenaX + 1) * T + 4) {
    S.locked = true; S.check = 2; for (let y = 10; y < 13; y++) S.map[y][S.arenaX] = 'X';
    S.boss = mkBoss(S.stage); S.bossFill = 0; g.sfx.tone(120, 0.6, 'square', 0.08, 60); S.ens = [];
  }
  const targetCam = S.locked ? S.arenaX * T : U.clamp(P.x - 420, 0, (S.arenaX - 24) * T + 40);
  S.cam = S.locked ? U.lerp(S.cam, targetCam, Math.min(1, dt * 4)) : targetCam;
  if (S.locked && Math.abs(S.cam - targetCam) < 1) S.cam = targetCam;
  updShots(g, dt);
  updEnemies(g, dt);
  if (S.boss) updBoss(g, dt);
  updEB(g, dt);
  for (const d of S.drops) { d.vy = Math.min(d.vy + 1500 * dt, 700); move(d, dt); d.life -= dt; if (U.rectHit(P, d)) { d.got = true; pickup(g, d); } }
  S.drops = S.drops.filter((d) => !d.got && d.life > 0 && d.y < g.H);
  for (const e of S.expl) e.t -= dt; S.expl = S.expl.filter((e) => e.t > 0);
  const w = wep();
  g.info = `${BOSSES[S.stage].n} 스테이지 · ❤️×${S.lives} · ${w.e} ${w.n}${w.cost ? ' ' + S.energy[w.id] : ''}`;
}
function shootLogic(g, dt) {
  const P = S.p, w = wep();
  P.shootT -= dt;
  if (w.id === 'P') {
    if (g.pressed('b')) { fire(g, 0); P.charge = 0.001; }
    else if (g.b && P.charge > 0) { P.charge += dt; if (P.charge > 0.5 && Math.floor(P.charge * 20) % 4 === 0) g.sfx.tone(300 + P.charge * 300, 0.03, 'square', 0.03); }
    if (!g.b && P.charge > 0) { if (P.charge > 1.2) fire(g, 2); else if (P.charge > 0.5) fire(g, 1); P.charge = 0; }
    return;
  }
  if (!g.pressed('b')) return;
  if (w.id === 'L' && S.shield) { S.shield.go = P.face; g.sfx.shoot(); return; }
  if (S.energy[w.id] < w.cost) { g.sfx.beep(150, 0.08); return; }
  const cx = P.x + P.w / 2 + P.face * 20, cy = P.y + 16;
  if (w.id === 'F' && S.pb.length < 6) { S.energy.F -= w.cost; for (const a of [-0.25, 0, 0.25]) S.pb.push({ w: 'F', x: cx, y: cy, vx: Math.cos(a) * 420 * P.face, vy: Math.sin(a) * 420, r: 11, dmg: 2, life: 1 }); g.sfx.tone(200, 0.15, 'sawtooth', 0.06, 500); }
  if (w.id === 'I' && S.pb.length < 3) { S.energy.I -= w.cost; S.pb.push({ w: 'I', x: cx, y: cy, vx: 520 * P.face, vy: 0, r: 12, dmg: 2, pierce: true, life: 1.5 }); g.sfx.tone(900, 0.1, 'triangle', 0.06, 1400); }
  if (w.id === 'E' && S.pb.length < 3) { S.energy.E -= w.cost; for (const [vx, vy] of [[700 * P.face, 0], [0, -700], [0, 700]]) S.pb.push({ w: 'E', x: P.x + P.w / 2, y: cy, vx, vy, r: 12, dmg: 2, pierce: true, life: 0.9 }); g.sfx.tone(1200, 0.12, 'square', 0.05, 200); }
  if (w.id === 'C' && !S.pb.some((b) => b.w === 'C')) { S.energy.C -= w.cost; S.pb.push({ w: 'C', x: cx, y: cy, vx: 600 * P.face, vy: 0, r: 13, dmg: 2, pierce: true, life: 3, t: 0 }); g.sfx.shoot(); }
  if (w.id === 'B' && S.pb.filter((b) => b.w === 'B').length < 2) { S.energy.B -= w.cost; S.pb.push({ w: 'B', x: cx, y: cy - 6, vx: 300 * P.face, vy: -420, r: 10, dmg: 0, life: 3 }); g.sfx.drop(); }
  if (w.id === 'L' && !S.shield) { S.energy.L -= w.cost; S.shield = { a: 0, go: 0, x: 0, y: 0 }; g.sfx.power(); }
}
function fire(g, lv) {
  const P = S.p;
  if (lv === 0 && S.pb.filter((b) => b.w === 'P').length >= 3) return;
  S.pb.push({ w: 'P', lv, x: P.x + P.w / 2 + P.face * 22, y: P.y + 16, vx: 600 * P.face, vy: 0, r: lv === 2 ? 18 : lv === 1 ? 10 : 6, dmg: lv === 2 ? 3 : lv === 1 ? 2 : 1, pierce: lv === 2, life: 2 });
  P.shootT = 0.25;
  lv === 2 ? g.sfx.tone(300, 0.25, 'sawtooth', 0.09, 900) : g.sfx.shoot();
}
function updShots(g, dt) {
  const P = S.p;
  if (S.shield) {
    const sh = S.shield; sh.a += dt * 8;
    if (sh.go) { sh.x += sh.go * 560 * dt; if (Math.abs(sh.x) > 700) S.shield = null; } else { sh.x = 0; }
    if (S.shield) {
      const cx = P.x + P.w / 2 + sh.x, cy = P.y + P.h / 2;
      for (let i = 0; i < 4; i++) {
        const lx = cx + Math.cos(sh.a + i * 1.57) * 34, ly = cy + Math.sin(sh.a + i * 1.57) * 34;
        const hit = { x: lx, y: ly, r: 12 };
        for (const e of S.ens) if (!e.dead && U.circRect(hit, e)) damageEnemy(g, e, 3, 'L');
        if (S.boss && U.circRect(hit, S.boss)) { damageBoss(g, 'L', 1); if (!sh.go) S.shield = null; break; }
        for (const b of S.eb) if (U.dist(lx, ly, b.x, b.y) < b.r + 12) b.dead = true;
      }
    }
  }
  for (const b of S.pb) {
    b.life -= dt;
    if (b.w === 'C') { b.t += dt; const tx = P.x + P.w / 2, ty = P.y + P.h / 2; if (b.t > 0.35) { const a = Math.atan2(ty - b.y, tx - b.x); b.vx += Math.cos(a) * 2400 * dt; b.vy += Math.sin(a) * 2400 * dt; const s = Math.hypot(b.vx, b.vy); if (s > 620) { b.vx *= 620 / s; b.vy *= 620 / s; } if (U.dist(b.x, b.y, tx, ty) < 24) b.dead = true; } }
    if (b.w === 'B') { b.vy += 1300 * dt; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.w === 'B' && (solid(Math.floor(b.x / T), Math.floor((b.y + b.r) / T)) || b.life <= 0)) { explode(g, b.x, b.y); b.dead = true; continue; }
    if (b.x < S.cam - 40 || b.x > S.cam + g.W + 40 || b.y < -40 || b.y > g.H + 40 || b.life <= 0) { b.dead = true; continue; }
    for (const e of S.ens) {
      if (e.dead || b.dead || (b.hitSet && b.hitSet.has(e))) continue;
      if (U.circRect(b, e)) {
        if (b.w === 'B') { explode(g, b.x, b.y); b.dead = true; break; }
        if (e.type === 'met' && !e.open) { b.vx = -b.vx * 0.6; b.vy = -400; b.deflect = true; g.sfx.tone(1500, 0.05, 'square', 0.04); continue; }
        if (b.deflect) continue;
        damageEnemy(g, e, b.dmg, b.w);
        if (b.w === 'I') e.freeze = 2.5;
        if (b.pierce) (b.hitSet || (b.hitSet = new Set())).add(e); else b.dead = true;
      }
    }
    const B = S.boss;
    if (B && !b.dead && !b.deflect && B.hp > 0 && U.circRect(b, B)) {
      if (b.w === 'B') { explode(g, b.x, b.y); b.dead = true; }
      else if (B.inv > 0) { if (!b.pierce) { b.vx = -b.vx * 0.5; b.vy = -350; b.deflect = true; } }
      else { damageBoss(g, b.w, b.dmg); if (b.w !== 'C' || true) b.dead = !b.pierce || b.w === 'C'; }
    }
  }
  S.pb = S.pb.filter((b) => !b.dead);
}
function explode(g, x, y) {
  S.expl.push({ x, y, t: 0.35 }); g.sfx.explode(); g.shake(6, 0.2); g.burst(x - S.cam, y, ['#bef264', '#facc15', '#fff'], 20, 260);
  for (const e of S.ens) if (!e.dead && U.circRect({ x, y, r: 64 }, e)) damageEnemy(g, e, 3, 'B');
  if (S.boss && S.boss.inv <= 0 && U.circRect({ x, y, r: 64 }, S.boss)) damageBoss(g, 'B', 2);
}
function damageEnemy(g, e, dmg, w) {
  e.hp -= dmg; e.flash = 0.1; g.sfx.hit();
  if (e.hp <= 0) {
    e.dead = true; const pts = { met: 200, bee: 150, cannon: 400, hopper: 250, walker: 300 }[e.type] || 100;
    g.add(pts, e.x + e.w / 2 - S.cam, e.y); g.burst(e.x + e.w / 2 - S.cam, e.y + e.h / 2, ['#fff', '#5ee1ff', '#facc15'], 14, 200);
    const r = Math.random();
    const k = r < 0.03 ? 'up' : r < 0.11 ? 'bigH' : r < 0.26 ? 'smH' : r < 0.36 ? 'en' : null;
    if (k) S.drops.push({ k, x: e.x + 4, y: e.y, w: 24, h: 24, vx: 0, vy: -300, life: 8 });
  }
}
function pickup(g, d) {
  const P = S.p;
  if (d.k === 'smH') P.hp = Math.min(28, P.hp + 4);
  if (d.k === 'bigH') P.hp = Math.min(28, P.hp + 10);
  if (d.k === 'en') { const w = wep().id === 'P' ? S.owned.reduce((m, id) => (S.energy[id] < S.energy[m] ? id : m), S.owned[0]) : wep().id; S.energy[w] = Math.min(28, S.energy[w] + 7); }
  if (d.k === 'up') { S.lives++; g.float(d.x - S.cam, d.y - 10, '1UP!', '#4ade80'); }
  g.sfx.coin(); g.add(50);
}
function updEnemies(g, dt) {
  const P = S.p;
  for (const e of S.ens) {
    if (e.dead) continue;
    if (e.x < S.cam - 200 || e.x > S.cam + g.W + 100) continue;
    e.flash -= dt;
    if (e.freeze > 0) { e.freeze -= dt; if (!e.fly) { e.vy = Math.min(e.vy + 1800 * dt, 800); e.vx = 0; move(e, dt); } }
    else {
      e.t += dt;
      const toP = Math.sign(P.x - e.x) || 1;
      if (e.type === 'met') {
        const cyc = e.t % 3; e.open = cyc > 1.8;
        if (e.open && !e.shot && Math.abs(P.x - e.x) < 500) { e.shot = true; for (const a of [-0.35, 0, 0.35]) S.eb.push({ x: e.x + 16, y: e.y + 10, vx: Math.cos(a) * 260 * toP, vy: Math.sin(a) * 260, r: 6, dmg: 3 }); g.sfx.beep(600, 0.05); }
        if (!e.open) e.shot = false;
        e.vy = Math.min(e.vy + 1800 * dt, 800); e.vx = 0; move(e, dt);
      } else if (e.type === 'bee') {
        if (Math.abs(P.x - e.x) < 520) { e.x += toP * 110 * dt; e.y = e.y0 + Math.sin(e.t * 3) * 40 + Math.min(150, Math.max(-150, P.y - e.y0)) * 0.6; }
      } else if (e.type === 'cannon') {
        e.vy = Math.min(e.vy + 1800 * dt, 800); e.vx = 0; move(e, dt);
        if (e.t > 2.2 && Math.abs(P.x - e.x) < 560) { e.t = 0; const a = Math.atan2(P.y + 18 - e.y, P.x - e.x); S.eb.push({ x: e.x + 16, y: e.y + 10, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 8, dmg: 4 }); g.sfx.beep(300, 0.08); }
      } else if (e.type === 'hopper') {
        e.vy = Math.min(e.vy + 1800 * dt, 800);
        if (e.ground && e.t > 1.3 && Math.abs(P.x - e.x) < 500) { e.t = 0; e.vy = -620; e.vx = toP * 160; }
        if (e.ground && e.t > 0.05 && e.vy === 0) e.vx = 0;
        move(e, dt);
      } else if (e.type === 'walker') {
        e.vy = Math.min(e.vy + 1800 * dt, 800);
        const v0 = e.vx; move(e, dt); if (e.hitWall) e.vx = -v0;
        if (e.ground) { const ahead = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / T), below = Math.floor((e.y + e.h + 4) / T); if (!solid(ahead, below)) e.vx = -e.vx; }
      }
    }
    if (e.y > g.H + 50) e.dead = true;
    if (U.rectHit(P, e)) hurt(g, e.type === 'walker' ? 5 : 3);
  }
}
function updEB(g, dt) {
  const P = S.p;
  for (const b of S.eb) {
    if (b.grav) b.vy += b.grav * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.t = (b.t || 0) + dt;
    if (b.bomb && b.vy > 0 && solid(Math.floor(b.x / T), Math.floor((b.y + b.r) / T))) { b.dead = true; S.expl.push({ x: b.x, y: b.y, t: 0.35, enemy: true }); g.sfx.explode(); g.shake(5, 0.15); if (U.dist(b.x, b.y, P.x + P.w / 2, P.y + P.h / 2) < 70) hurt(g, 4); continue; }
    if (b.ground) { b.y = 13 * T - b.r; }
    if (b.boomer) { if (b.t > 0.8) { const B = S.boss; if (!B) { b.dead = true; continue; } const a = Math.atan2(B.y + 20 - b.y, B.x + B.w / 2 - b.x); b.vx = Math.cos(a) * 480; b.vy = Math.sin(a) * 480; if (U.dist(b.x, b.y, B.x + B.w / 2, B.y + 20) < 30) b.dead = true; } }
    if (b.x < S.cam - 60 || b.x > S.cam + g.W + 60 || b.y > g.H + 60 || b.y < -300 || b.t > 8) b.dead = true;
    if (!b.dead && U.circRect(b, P)) { hurt(g, b.dmg); if (!b.keep) b.dead = true; }
  }
  S.eb = S.eb.filter((b) => !b.dead);
}
function hurt(g, dmg) {
  const P = S.p;
  if (P.inv > 0 || S.dead || S.win) return;
  P.hp -= dmg; P.inv = 1.2; P.hurtT = 0.35; P.vy = -250; P.charge = 0; g.sfx.hit(); g.shake(5, 0.2);
  if (P.hp <= 0) die(g);
}
function die(g) {
  if (S.dead) return;
  S.dead = 2.6; S.p.hp = 0; g.sfx.lose(); g.shake(8, 0.4);
  const x = S.p.x + S.p.w / 2 - S.cam, y = Math.min(g.H - 20, S.p.y + 18);
  S.deathX = x; S.deathY = y;
}
// ---------------- 보스 ----------------
function mkBoss(i) {
  return { k: BOSSES[i].k, x: (S.arenaX + 18) * T, y: 13 * T - 56 - 300, w: 46, h: 56, vx: 0, vy: 0, hp: 28, inv: 0, t: 2.6, face: -1, act: null, n: 0, ground: false, flash: 0 };
}
function updBoss(g, dt) {
  const B = S.boss, P = S.p;
  if (S.bossFill < 28) { S.bossFill = Math.min(28, S.bossFill + dt * 22); if (Math.floor(S.bossFill) % 2) g.sfx.beep(880, 0.02); }
  if (B.hp <= 0) return;
  B.inv -= dt; B.flash -= dt;
  B.vy = Math.min(B.vy + 1600 * dt, 900);
  move(B, dt);
  B.x = U.clamp(B.x, S.arenaX * T + T, (S.arenaX + 23) * T - B.w);
  if (B.ground && !B.act) { B.vx = 0; B.face = P.x < B.x ? -1 : 1; }
  if (S.bossFill < 28) return;
  const toP = P.x < B.x ? -1 : 1, bx = B.x + B.w / 2, by = B.y + B.h / 2;
  const hard = 1 + S.cleared.length * 0.12;
  B.t -= dt * hard;
  if (B.k === 'F') {
    if (B.t <= 0 && B.ground) {
      if (Math.random() < 0.45) { B.vy = -720; B.vx = toP * 220; B.t = 1.1; }
      else { B.t = 1.4; for (let i = 0; i < 2; i++) g.later(() => { if (!S.boss || S.boss.hp <= 0) return; S.eb.push({ x: S.boss.x + S.boss.w / 2, y: 13 * T - 18, vx: (P.x < S.boss.x ? -1 : 1) * 340, vy: 0, r: 18, dmg: 4, ground: true, fire: true, keep: true }); g.sfx.tone(150, 0.2, 'sawtooth', 0.07, 400); }, i * 0.45); }
    }
  } else if (B.k === 'I') {
    if (B.t <= 0 && B.ground) { B.vy = -[480, 640, 820][B.n % 3]; B.n++; B.shot = false; B.t = 1.0; B.vx = toP * 40; }
    if (!B.ground && !B.shot && B.vy > -60) { B.shot = true; for (const dy of [-1, 0, 1]) S.eb.push({ x: bx, y: by + dy * 14, vx: toP * 420, vy: dy * 30, r: 9, dmg: 4, ice: true }); g.sfx.tone(1300, 0.08, 'triangle', 0.06); }
  } else if (B.k === 'E') {
    if (B.t <= 0 && B.ground) { B.vy = -780; B.vx = toP * 260; B.shot = false; B.t = 0.9; }
    if (!B.ground && !B.shot && B.vy > -80) { B.shot = true; const a = Math.atan2(P.y + 18 - by, P.x + 13 - bx); for (const d of [-0.35, 0, 0.35]) S.eb.push({ x: bx, y: by, vx: Math.cos(a + d) * 460, vy: Math.sin(a + d) * 460, r: 11, dmg: 4, elec: true }); g.sfx.tone(1600, 0.15, 'square', 0.06, 300); }
  } else if (B.k === 'C') {
    if (B.t <= 0 && B.ground) {
      if (!S.eb.some((b) => b.boomer)) { const a = Math.atan2(P.y + 18 - by, P.x - bx); S.eb.push({ x: bx, y: by - 10, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 14, dmg: 4, boomer: true, keep: true }); g.sfx.shoot(); B.t = 0.7; }
      else { B.vy = -620; B.vx = toP * 190; B.t = 0.8; }
    }
  } else if (B.k === 'B') {
    if (B.t <= 0 && B.ground) {
      B.n++;
      if (B.n % 3 === 0) { B.vy = -700; B.vx = -toP * 230; B.t = 1.0; }
      else { const tt = 1.0, gr = 1200; const dx = P.x + 13 - bx + U.rand(-40, 40); S.eb.push({ x: bx, y: B.y, vx: dx / tt, vy: -0.5 * gr * tt + (13 * T - B.y) / tt * 0.4, grav: gr, r: 12, dmg: 4, bomb: true }); g.sfx.drop(); B.t = 0.9; }
    }
  } else if (B.k === 'L') {
    if (B.t <= 0 && B.ground) {
      if (!B.leaf) { B.leaf = 1.5; g.sfx.power(); for (let i = 0; i < 4; i++) S.eb.push({ x: S.arenaX * T + 80 + i * 220 + U.rand(-50, 50), y: -20, vx: 0, vy: 90, r: 12, dmg: 3, leaf: true, ph: i }); B.t = 99; }
    }
    if (B.leaf) { B.leaf -= dt; if (B.leaf <= 0) { B.leaf = 0; B.vx = toP * 330; B.vy = -300; B.rush = 1.2; B.t = 2.2; S.eb.push({ x: bx, y: by, vx: toP * 380, vy: 0, r: 30, dmg: 4, shield: true }); g.sfx.shoot(); } }
    if (B.rush) { B.rush -= dt; if (B.rush <= 0 || B.hitWall) { B.rush = 0; B.vx = 0; } }
    for (const b of S.eb) if (b.leaf) b.vx = Math.cos(g.time * 3 + b.ph) * 90;
  }
  if (B.ground && B.k !== 'L' && B.vy === 0 && B.t > 0) B.vx = 0;
  if (U.rectHit(P, B)) hurt(g, 4);
}
function damageBoss(g, w, dmg) {
  const B = S.boss;
  if (!B || B.hp <= 0 || B.inv > 0 || S.bossFill < 28) return;
  const weak = BOSSES[S.stage].weak === w;
  const d = weak ? 4 + (w === 'C' ? 0 : 0) : w === BOSSES[S.stage].k ? 0 : dmg === 3 ? 3 : w === 'P' ? dmg : 1;
  if (d === 0) { g.float(B.x - S.cam + 23, B.y - 10, '무효!', '#94a3b8'); g.sfx.beep(200, 0.05); B.inv = 0.3; return; }
  B.hp -= d; B.inv = weak ? 0.6 : 0.45; B.flash = 0.45; g.sfx.hit(); g.shake(weak ? 8 : 3, 0.15);
  if (weak) { g.float(B.x - S.cam + 23, B.y - 20, '약점!', '#facc15', 28); B.vx = 0; B.t = Math.max(B.t, 0.6); }
  g.burst(B.x + 23 - S.cam, B.y + 28, ['#fff', '#facc15'], 10, 220);
  if (B.hp <= 0) {
    B.hp = 0; S.win = 4; S.eb = []; g.add(5000 + S.p.hp * 100, B.x - S.cam, B.y); g.sfx.explode(); g.shake(12, 0.6);
    for (let i = 0; i < 4; i++) g.later(() => { g.burst(B.x + 23 - S.cam, B.y + 28, ['#5ee1ff', '#fff', '#a78bfa'], 30, 160 + i * 120, 1.2, 5); g.sfx.explode(); }, i * 0.25);
  }
}
// ---------------- 그리기 ----------------
function drawPlay(g, c) {
  const th = BOSSES[S.stage];
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 7; i++) { const x = ((i * 260 - S.cam * 0.25) % 1820 + 1820) % 1820 - 200; c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x, 220 + (i % 3) * 50, 120, 400); c.fillStyle = 'rgba(255,255,255,.06)'; for (let k = 0; k < 6; k++) c.fillRect(x + 16 + (k % 3) * 32, 250 + (i % 3) * 50 + Math.floor(k / 3) * 50, 16, 20); }
  c.save(); c.translate(-Math.round(S.cam), 0);
  const x0 = Math.max(0, Math.floor(S.cam / T)), x1 = Math.min(S.W - 1, x0 + 25);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
    const t = S.map[y][x], px = x * T, py = y * T;
    if (t === '#') { g.rect(px, py, T, T, th.ground); if (S.map[y - 1]?.[x] !== '#') g.rect(px, py, T, 6, th.top); g.stroke(px + 1, py + 1, T - 2, T - 2, 'rgba(0,0,0,.25)', 2); }
    else if (t === 'S') { g.rect(px, py, T, T, '#64748b'); g.rect(px + 3, py + 3, T - 6, 6, '#94a3b8'); g.stroke(px, py, T, T, '#1e293b', 2); }
    else if (t === '^') { g.poly([[px, py + T], [px + 10, py + 8], [px + 20, py + T], [px + 30, py + 8], [px + 40, py + T]], '#e5e7eb', '#6b7280'); }
    else if (t === 'D' || t === 'X') { g.rect(px + 6, py, T - 12, T, t === 'X' ? '#475569' : '#334155'); for (let k = 0; k < 4; k++) g.rect(px + 6, py + k * 10, T - 12, 3, '#94a3b8'); }
  }
  const cyc = g.time % 3;
  for (const y of S.yoku) { const on = y.ph ? cyc >= 1.5 : cyc < 1.5; const warn = !on && ((y.ph ? cyc >= 1.1 && cyc < 1.5 : cyc >= 2.6)); if (on || warn) { c.globalAlpha = on ? 1 : 0.35; g.rrect(y.tx * T, y.ty * T, T, T, 6, '#22d3ee', '#0e7490', 3); g.rect(y.tx * T + 8, y.ty * T + 8, 8, 8, '#cffafe'); c.globalAlpha = 1; } }
  for (const d of S.drops) { if (d.life < 2 && Math.floor(g.time * 10) % 2) continue; g.emoji(d.k === 'up' ? '🤖' : d.k === 'en' ? '🔋' : '❤️', d.x + 12, d.y + 12, d.k === 'bigH' ? 30 : 22); }
  for (const e of S.ens) {
    if (e.dead || e.x < S.cam - 60 || e.x > S.cam + g.W + 60) continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.flash > 0) c.globalAlpha = 0.5;
    if (e.type === 'met') { g.emoji('⛑️', cx, cy - (e.open ? 6 : 0), 34); if (e.open) g.emoji('👀', cx, cy + 6, 16); }
    else if (e.type === 'bee') g.emoji('🐝', cx, cy, 34);
    else if (e.type === 'cannon') { g.rrect(e.x, e.y + 6, e.w, e.h - 6, 6, '#475569', '#0f172a'); const a = Math.atan2(S.p.y - e.y, S.p.x - e.x); g.line(cx, cy, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, '#0f172a', 8); g.circle(cx, cy, 8, '#ef4444'); }
    else if (e.type === 'hopper') g.emoji('🐸', cx, cy, 36);
    else if (e.type === 'walker') g.emoji('👾', cx, cy, 38);
    c.globalAlpha = 1;
    if (e.freeze > 0) { c.globalAlpha = 0.5; g.rrect(e.x - 3, e.y - 3, e.w + 6, e.h + 6, 6, '#bae6fd'); c.globalAlpha = 1; }
  }
  if (S.boss) drawBoss(g, c);
  for (const e of S.expl) { g.circle(e.x, e.y, 64 * (1 - e.t / 0.35) + 10, `rgba(255,${e.enemy ? 120 : 230},80,${e.t * 2})`); }
  for (const b of S.eb) {
    if (b.fire) { g.emoji('🔥', b.x, b.y - 6, 44); }
    else if (b.ice) g.emoji('❄️', b.x, b.y, 24);
    else if (b.elec) g.emoji('⚡', b.x, b.y, 28);
    else if (b.boomer) { c.save(); c.translate(b.x, b.y); c.rotate(g.time * 18); g.emoji('✂️', 0, 0, 32); c.restore(); }
    else if (b.bomb) g.emoji('💣', b.x, b.y, 26);
    else if (b.leaf) g.emoji('🍂', b.x, b.y, 28);
    else if (b.shield) { for (let i = 0; i < 4; i++) g.emoji('🍃', b.x + Math.cos(g.time * 9 + i * 1.57) * 26, b.y + Math.sin(g.time * 9 + i * 1.57) * 26, 24); }
    else { g.circle(b.x, b.y, b.r, '#fde047'); g.circle(b.x, b.y, b.r * 0.5, '#fff'); }
  }
  for (const b of S.pb) {
    if (b.w === 'P') { const col = b.lv === 2 ? '#5ee1ff' : b.lv === 1 ? '#a5f3fc' : '#fef08a'; if (b.lv === 2) { g.circle(b.x - b.vx * 0.03, b.y, b.r * 0.8, 'rgba(94,225,255,.35)'); } g.circle(b.x, b.y, b.r, col); g.circle(b.x, b.y, b.r * 0.5, '#fff'); }
    else if (b.w === 'F') g.emoji('🔥', b.x, b.y, 26);
    else if (b.w === 'I') g.emoji('❄️', b.x, b.y, 28);
    else if (b.w === 'E') { g.line(b.x - Math.sign(b.vx) * 26, b.y - Math.sign(b.vy) * 26, b.x, b.y, '#fde047', 7); g.line(b.x - Math.sign(b.vx) * 26, b.y - Math.sign(b.vy) * 26, b.x, b.y, '#fff', 3); }
    else if (b.w === 'C') { c.save(); c.translate(b.x, b.y); c.rotate(g.time * 20); g.emoji('✂️', 0, 0, 28); c.restore(); }
    else if (b.w === 'B') g.emoji('💣', b.x, b.y, 24);
  }
  if (S.shield) { const P = S.p; for (let i = 0; i < 4; i++) g.emoji('🍃', P.x + P.w / 2 + S.shield.x + Math.cos(S.shield.a + i * 1.57) * 34, P.y + P.h / 2 + Math.sin(S.shield.a + i * 1.57) * 34, 24); }
  if (!S.dead) drawPlayer(g, c);
  c.restore();
  if (S.dead) { const t = 2.6 - S.dead; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = t * 220; g.circle(S.deathX + Math.cos(a) * r, S.deathY + Math.sin(a) * r, 10, '#5ee1ff'); g.circle(S.deathX + Math.cos(a) * r * 0.5, S.deathY + Math.sin(a) * r * 0.5, 7, '#a5f3fc'); } }
  // HUD
  bar(g, 22, 50, S.p.hp, '#fde68a');
  const w = wep(); if (w.cost) bar(g, 46, 50, S.energy[w.id], w.c2);
  if (S.boss) bar(g, g.W - 46, 50, Math.min(S.boss.hp, S.bossFill), '#f87171');
  for (let i = 0; i < S.owned.length; i++) { const ww = WEAPONS.find((x) => x.id === S.owned[i]); const sel = i === S.wi; g.rrect(80 + i * 46, 14, 40, 40, 8, sel ? 'rgba(94,225,255,.35)' : 'rgba(0,0,0,.4)', sel ? '#5ee1ff' : 'rgba(255,255,255,.2)', 2); g.emoji(ww.e, 100 + i * 46, 34, 24); g.text(String(i + 1), 86 + i * 46, 20, 10, '#fff'); }
  if (S.ready > 0) { if (Math.floor(S.ready * 5) % 2) g.text('READY', g.W / 2, g.H / 2 - 40, 48, '#fff'); }
  if (S.win > 0 && S.win < 2.5) g.text('BOSS DEFEATED!', g.W / 2, g.H / 2 - 80, 44, '#facc15');
}
function bar(g, x, y, v, col) {
  g.rect(x - 2, y - 2, 18, 28 * 6 + 4, '#000');
  for (let i = 0; i < 28; i++) { const yy = y + (27 - i) * 6; g.rect(x, yy, 14, 4, i < v ? col : '#333'); }
}
function drawPlayer(g, c) {
  const P = S.p;
  if (P.inv > 0 && Math.floor(g.time * 20) % 2) return;
  const w = wep(), col = w.c, col2 = w.c2;
  const cx = P.x + P.w / 2, by = P.y + P.h;
  c.save(); c.translate(cx, by); c.scale(P.face, 1);
  const run = P.ground && Math.abs(P.vx) > 10, ph = Math.sin(P.anim / 14);
  // 다리
  if (!P.ground) { g.rect(-11, -14, 9, 12, col); g.rect(3, -16, 9, 10, col); g.rect(-13, -4, 12, 6, col); g.rect(4, -8, 12, 6, col); }
  else { const a = run ? ph * 7 : 0; g.rect(-11 + a, -14, 9, 10, col); g.rect(3 - a, -14, 9, 10, col); g.rect(-13 + a, -5, 13, 5, col); g.rect(2 - a, -5, 13, 5, col); }
  // 몸
  g.rrect(-11, -28, 22, 16, 4, col2); g.rect(-9, -16, 18, 4, col);
  // 팔/버스터
  const shooting = P.shootT > 0 || g.b;
  if (shooting) { g.rrect(6, -27, 18, 10, 4, col); g.circle(24, -22, 4, '#111'); } else { g.rect(9, -27, 7, 14, col); g.circle(12, -12, 4, col2); }
  g.rect(-16, -27, 7, 13, col);
  // 머리
  g.circle(0, -38, 12, col); g.rect(-6, -40, 14, 10, '#fcd9b6'); g.rect(3, -38, 3, 4, '#111'); g.rect(-2, -48, 6, 4, col2);
  if (P.charge > 0.5) { const lvl = P.charge > 1.2 ? 2 : 1; c.globalAlpha = 0.5 + 0.3 * Math.sin(g.time * 40); g.ring(0, -20, 26 + Math.sin(g.time * 30) * 3, lvl === 2 ? '#5ee1ff' : '#fef08a', 3); c.globalAlpha = 1; }
  c.restore();
}
function drawBoss(g, c) {
  const B = S.boss, th = BOSSES[S.stage];
  if (B.hp <= 0 && S.win) { if (S.win < 3.5) return; }
  if (B.flash > 0 && Math.floor(g.time * 25) % 2) return;
  const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
  c.save(); c.translate(cx, cy); c.scale(B.face, 1);
  const col = WEAPONS.find((w) => w.id === B.k).c;
  g.rrect(-20, -6, 40, 30, 8, col, '#000', 2);
  g.rect(-18, 22, 14, 6, '#222'); g.rect(4, 22, 14, 6, '#222');
  g.circle(0, -16, 18, col); g.rect(-8, -20, 20, 14, '#fcd9b6'); g.rect(6, -18, 4, 5, '#111');
  c.restore();
  g.emoji(th.e, cx, B.y - 6, 30);
  if (B.leaf) for (let i = 0; i < 4; i++) g.emoji('🍃', cx + Math.cos(g.time * 9 + i * 1.57) * 40, cy + Math.sin(g.time * 9 + i * 1.57) * 40, 26);
  if (S.bossFill < 28) g.text(th.n, cx, B.y - 40, 22, '#fff');
}
