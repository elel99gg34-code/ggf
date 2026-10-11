'use strict';
let S;
const VW = 960, VH = 560, GRAV = 1000, WR = 17, MAXV = 470, LIVES = 6;
const LEVELS = [
  { n: '초원 연습장', f: ['flat', 'hill', 'bumps', 'ramp', 'hill', 'flat'], sky: ['#38bdf8', '#e0f2fe'], dirt: '#92400e', top: '#65a30d' },
  { n: '언덕 너머', f: ['flat', 'hill', 'steep', 'jump', 'bumps', 'hill', 'jump'], sky: ['#0ea5e9', '#fef9c3'], dirt: '#78350f', top: '#4d7c0f' },
  { n: '통나무 숲', f: ['flat', 'logs', 'jump', 'stairs', 'hill', 'logs', 'steep', 'jump'], sky: ['#15803d', '#bbf7d0'], dirt: '#713f12', top: '#166534' },
  { n: '채석장', f: ['flat', 'stairs', 'jump', 'steep', 'bumps', 'drop', 'jump', 'stairs'], sky: ['#a8a29e', '#f5f5f4'], dirt: '#57534e', top: '#a8a29e' },
  { n: '협곡 점프', f: ['flat', 'jump', 'jump', 'steep', 'drop', 'jump', 'logs', 'bigjump'], sky: ['#ea580c', '#fed7aa'], dirt: '#9a3412', top: '#c2410c' },
  { n: '눈 덮인 고개', f: ['flat', 'steep', 'bumps', 'jump', 'stairs', 'steep', 'drop', 'bigjump', 'hill'], sky: ['#94a3b8', '#f8fafc'], dirt: '#64748b', top: '#f1f5f9' },
  { n: '화산 지대', f: ['flat', 'bigjump', 'logs', 'steep', 'jump', 'stairs', 'drop', 'bigjump', 'bumps', 'jump'], sky: ['#450a0a', '#f97316'], dirt: '#292524', top: '#dc2626' },
  { n: '익스트림 파이널', f: ['flat', 'jump', 'steep', 'bigjump', 'stairs', 'logs', 'drop', 'jump', 'steep', 'bigjump', 'hill'], sky: ['#1e1b4b', '#7c3aed'], dirt: '#1e1b4b', top: '#a78bfa' },
];
GAME({
  title: '모토 익스트림', w: VW, h: VH, bg: '#38bdf8', controls: 'dpad', particleGravity: 300,
  help: '↑ 가속 · ↓ 브레이크\n← 뒤로 기울이기(윌리) · → 앞으로 기울이기\n공중에서 기울여 바퀴로 착지! 머리가 땅에 닿으면 크래시\n공중 회전(플립) 성공 시 보너스 · 🚩 체크포인트에서 재시작\n8개 코스 · 빠를수록 고득점 · 라이프 6개',
  init(g) { S = { lv: 0, lives: LIVES, total: 0 }; loadLevel(g); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.clear) { S.clear -= dt; if (S.clear <= 0) { S.lv++; if (S.lv >= LEVELS.length) return g.win(`전 코스 완주! 총 ${S.total.toLocaleString()}점`); loadLevel(g); } return; }
    if (S.crash) { S.crash -= dt; for (const p of S.pts) { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; const gy = groundY(p.x); if (p.y > gy - 6) { p.y = gy - 6; p.vy *= -0.3; p.vx *= 0.8; } } if (S.crash <= 0) { if (S.lives <= 0) return g.over(`${LEVELS[S.lv].n}에서 라이프 소진`); respawn(); } camera(dt); return; }
    if (S.ready > 0) { S.ready -= dt; camera(dt); return; }
    S.t += dt;
    const sub = 4, h = dt / sub;
    for (let k = 0; k < sub && !S.crash; k++) step(g, h);
    if (S.crash) return;
    const [R, F, H] = S.pts;
    // 회전 추적
    const ang = Math.atan2(F.y - R.y, F.x - R.x);
    let da = ang - S.lastAng; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    S.lastAng = ang;
    if (!R.on && !F.on) { S.air += dt; S.rot += da; }
    else {
      if (S.air > 0.35) {
        const flips = Math.floor(Math.abs(S.rot) / (Math.PI * 2) + 0.15);
        if (flips > 0) { const b = flips * 600; S.bonus += b; g.add(b); flash(`${S.rot < 0 ? '백플립' : '프론트플립'} x${flips}! +${b}`, '#f472b6'); g.sfx.power(); g.burst(sx(R.x), sy(R.y), ['#f472b6', '#fde047', '#fff'], 20, 260, 0.6, 4); }
        else if (S.air > 1) { S.bonus += 100; g.add(100); flash(`빅 에어 +100`, '#fde047'); }
        if (S.air > 0.6) { g.shake(3, 0.1); g.sfx.drop(); g.burst(sx(R.x), sy(R.y + WR), ['#a16207', '#78350f'], 8, 140, 0.5, 4); }
      }
      S.air = 0; S.rot = 0;
    }
    // 체크포인트 & 골
    for (const cp of S.cps) if (!cp.got && R.x > cp.x) { cp.got = true; S.spawn = cp; g.sfx.coin(); flash('🚩 체크포인트', '#22c55e'); }
    if (R.x > S.finish) finishLevel(g);
    // 엔진음/배기
    S.eng -= dt;
    if (S.eng <= 0) { S.eng = 0.08; const v = Math.hypot(R.vx, R.vy); g.sfx.tone(70 + v * 0.35 + (g.up ? 60 : 0), 0.07, 'sawtooth', g.up ? 0.02 : 0.008); }
    if (g.up && R.on && g.frame % 3 === 0) g.burst(sx(R.x - 14), sy(R.y), 'rgba(168,162,158,.7)', 1, 50, 0.5, 5);
    camera(dt);
    g.info = `코스 ${S.lv + 1}/${LEVELS.length} · ${U.fmtTime(S.t)} · ❤️ ${S.lives}`;
  },
  draw(g, c) {
    const L = LEVELS[S.lv];
    const sky = c.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, L.sky[0]); sky.addColorStop(1, L.sky[1]);
    c.fillStyle = sky; c.fillRect(0, 0, VW, VH);
    mount(c, S.cx * 0.15, 330, 120, 'rgba(255,255,255,.25)', 0.004);
    mount(c, S.cx * 0.35, 390, 90, 'rgba(0,0,0,.15)', 0.008);
    // 지형
    c.save(); c.translate(-S.cx + VW / 2, -S.cy + VH / 2);
    const x0 = S.cx - VW / 2 - 50, x1 = S.cx + VW / 2 + 50;
    let i0 = idxAt(x0); i0 = Math.max(0, i0 - 1);
    c.beginPath(); c.moveTo(S.ter[i0][0], S.cy + VH);
    let i = i0;
    for (; i < S.ter.length && S.ter[Math.max(0, i - 1)][0] < x1; i++) c.lineTo(S.ter[i][0], S.ter[i][1]);
    c.lineTo(S.ter[i - 1][0], S.cy + VH); c.closePath();
    c.fillStyle = L.dirt; c.fill();
    c.strokeStyle = L.top; c.lineWidth = 8; c.lineJoin = 'round'; c.beginPath();
    for (let j = i0; j < i; j++) j === i0 ? c.moveTo(S.ter[j][0], S.ter[j][1]) : c.lineTo(S.ter[j][0], S.ter[j][1]);
    c.stroke();
    for (const lg of S.logs) if (lg.x > x0 && lg.x < x1) { g.circle(lg.x, lg.y, lg.r, '#78350f'); g.ring(lg.x, lg.y, lg.r * 0.6, '#a16207', 3); }
    for (const cp of S.cps) if (cp.x > x0 && cp.x < x1) { g.line(cp.x, groundY(cp.x), cp.x, groundY(cp.x) - 70, '#e5e7eb', 4); g.emoji(cp.got ? '🚩' : '🏳️', cp.x + 14, groundY(cp.x) - 64, 30); }
    if (S.finish > x0 && S.finish < x1 + 100) { const fy = groundY(S.finish); for (let k = 0; k < 8; k++) for (let m = 0; m < 2; m++) g.rect(S.finish - 8 + m * 8, fy - 120 + k * 8, 8, 8, (k + m) % 2 ? '#111' : '#fff'); g.emoji('🏁', S.finish, fy - 140, 44); }
    for (const sg of S.signs) if (sg.x > x0 && sg.x < x1) g.emoji(sg.e, sg.x, groundY(sg.x) - 22, 30);
    drawBike(g, c);
    c.restore();
    // HUD
    g.rrect(12, 12, 230, 74, 12, 'rgba(0,0,0,.45)');
    g.text(LEVELS[S.lv].n, 127, 34, 18, '#fff'); g.text(`⏱ ${S.t.toFixed(1)}s  목표 ${S.par}s`, 127, 62, 15, S.t > S.par ? '#fca5a5' : '#bbf7d0');
    g.rrect(VW - 242, 12, 230, 74, 12, 'rgba(0,0,0,.45)');
    g.text('❤️'.repeat(Math.max(0, S.lives)), VW - 127, 34, 16, '#fff'); g.text(`실수 ${S.faults} · 보너스 ${S.bonus}`, VW - 127, 62, 15, '#fde047');
    const prog = U.clamp((S.pts[0].x - S.startX) / (S.finish - S.startX), 0, 1);
    g.rect(260, 20, VW - 520, 8, 'rgba(0,0,0,.4)'); g.rect(260, 20, (VW - 520) * prog, 8, '#22c55e'); g.emoji('🏍️', 260 + (VW - 520) * prog, 22, 20);
    if (S.air > 0.3) g.text(`공중 ${S.air.toFixed(1)}s · ${Math.round(Math.abs(S.rot) * 57)}°`, VW / 2, 60, 18, '#fff');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 120, 28, S.msgC); c.globalAlpha = 1; }
    if (S.ready > 0) { g.text(LEVELS[S.lv].n, VW / 2, VH / 2 - 40, 40, '#fff'); g.text('↑ 가속 · ←→ 기울이기', VW / 2, VH / 2 + 10, 20, '#fde047'); }
    if (S.crash) g.text('💥 크래시!', VW / 2, VH / 2 - 60, 46, '#ef4444');
    if (S.clear) { g.rrect(VW / 2 - 200, VH / 2 - 100, 400, 190, 18, 'rgba(0,0,0,.75)', '#fde047', 3); g.text('🏁 코스 완주!', VW / 2, VH / 2 - 60, 34, '#fde047'); g.text(S.res, VW / 2, VH / 2 - 10, 17, '#fff'); g.text(`+${S.gain}점`, VW / 2, VH / 2 + 40, 28, '#22c55e'); }
  },
});
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function loadLevel(g) {
  const L = LEVELS[S.lv], R = rng(1234 + S.lv * 99);
  const pts = []; let x = -400, y = 400;
  const add = (dx, dy) => { x += dx; y += dy; pts.push([x, y]); };
  pts.push([x, y]);
  S.logs = []; S.signs = []; const cps = [];
  add(700, 0);
  for (const f of L.f) {
    const d = 1 + S.lv * 0.12;
    if (f === 'flat') add(300 + R() * 200, 0);
    if (f === 'hill') { const hh = 60 + R() * 90 * d, len = 500 + R() * 300; for (let k = 1; k <= 16; k++) { const t = k / 16; pts.push([x + len * t, y - Math.sin(t * Math.PI) * hh]); } x += len; }
    if (f === 'bumps') { const nb = 4 + S.lv, bh = 16 + 4 * d; for (let k = 1; k <= nb * 8; k++) pts.push([x + k * 16, y - (0.5 - 0.5 * Math.cos((k / 8) * Math.PI * 2)) * (bh + R() * 4)]); x += nb * 128; pts[pts.length - 1][1] = y; add(100, 0); }
    if (f === 'ramp') { S.signs.push({ x: x - 60, e: '⚠️' }); add(220, -90); add(40, 0); add(240, 90); add(150, 0); }
    if (f === 'steep') { const hh = 150 + 50 * d; add(120, 0); add(200, -hh * 0.5); add(140, -hh * 0.5); add(120, 0); add(260, hh); add(100, 0); }
    if (f === 'jump' || f === 'bigjump') {
      const big = f === 'bigjump', hh = (big ? 120 : 80) * Math.min(1.5, d), gap = (big ? 300 : 180) + R() * 60 * d;
      S.signs.push({ x: x - 50, e: '🔥' });
      add(80, 0);
      for (let k = 1; k <= 6; k++) { const t = k / 6; pts.push([x + 200 * t, y - hh * t * t]); } x += 200; y -= hh;
      add(0, 900); add(gap, 0); add(0, -900 + hh * 0.4);
      add(200, hh * 0.6); add(200, 0);
    }
    if (f === 'drop') { add(150, 0); add(0, 0); add(4, 140 + 30 * d); add(80, 30); add(200, 0); }
    if (f === 'stairs') { for (let s = 0; s < 4 + Math.floor(S.lv / 2); s++) { add(0.1, -22); add(70, 0); } add(150, 0); for (let s = 0; s < 3; s++) { add(0.1, 30); add(60, 0); } add(150, 0); }
    if (f === 'logs') { for (let b = 0; b < 3 + Math.floor(S.lv / 2); b++) { add(150 + R() * 80, 0); const lr = 14 + R() * 8; S.logs.push({ x: x + lr, y: y - lr * 0.6, r: lr }); add(lr * 2, 0); } add(120, 0); }
    cps.push({ x: x - 40, got: false });
  }
  add(500, 0); S.finish = x - 250; add(800, 0);
  // y 정렬 위해 너무 깊은 구덩이 아래 위치 기억
  S.ter = pts;
  S.baseY = -1e9; for (let k = 0; k < pts.length; k++) { const pit = (k > 0 && pts[k][1] - pts[k - 1][1] > 800) || (k + 1 < pts.length && pts[k][1] - pts[k + 1][1] > 400); if (!pit) S.baseY = Math.max(S.baseY, pts[k][1]); }
  cps.pop();
  S.cps = cps.filter((c, i) => i % 2 === 1);
  S.startX = -100;
  S.spawn = { x: -100 };
  Object.assign(S, { t: 0, faults: 0, bonus: 0, clear: 0, crash: 0, msg: '', msgT: 0, eng: 0, cx: 0, cy: 300 });
  S.par = Math.round((S.finish - S.startX) / 260 + 5);
  respawn();
  S.cx = S.pts[0].x + 150; S.cy = S.pts[0].y - 60;
}
function respawn() {
  const x = S.spawn.x, y = groundY(x) - WR - 2;
  S.pts = [
    { x: x, y: y, vx: 0, vy: 0, ox: 0, oy: 0, on: false, r: WR, rot: 0 },
    { x: x + 58, y: groundY(x + 58) - WR - 2, vx: 0, vy: 0, ox: 0, oy: 0, on: false, r: WR, rot: 0 },
    { x: x + 22, y: y - 54, vx: 0, vy: 0, ox: 0, oy: 0, on: false, r: 9 },
  ];
  const [R, F, H] = S.pts;
  S.cons = [[R, F, U.dist(R.x, R.y, F.x, F.y)], [R, H, U.dist(R.x, R.y, H.x, H.y)], [F, H, U.dist(F.x, F.y, H.x, H.y)]];
  S.air = 0; S.rot = 0; S.lastAng = Math.atan2(F.y - R.y, F.x - R.x); S.ready = 0.8; S.crash = 0;
}
function idxAt(x) { let lo = 0, hi = S.ter.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (S.ter[m][0] < x) lo = m + 1; else hi = m; } return lo; }
function groundY(x) {
  const i = Math.max(1, idxAt(x)); const a = S.ter[i - 1], b = S.ter[i];
  if (!b) return a[1];
  if (b[0] - a[0] < 0.001) return Math.min(a[1], b[1]);
  return U.lerp(a[1], b[1], U.clamp((x - a[0]) / (b[0] - a[0]), 0, 1));
}
function collide(p) {
  p.on = false;
  let i0 = Math.max(1, idxAt(p.x - p.r - 2)); const i1 = Math.min(S.ter.length - 1, idxAt(p.x + p.r + 2) + 1);
  for (let i = i0; i <= i1; i++) push(p, S.ter[i - 1][0], S.ter[i - 1][1], S.ter[i][0], S.ter[i][1]);
  for (const lg of S.logs) { const d = U.dist(p.x, p.y, lg.x, lg.y), m = p.r + lg.r; if (d < m && d > 0) { const nx = (p.x - lg.x) / d, ny = (p.y - lg.y) / d; p.x += nx * (m - d); p.y += ny * (m - d); p.on = true; p.nx = nx; p.ny = ny; } }
}
function push(p, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-6;
  const t = U.clamp(((p.x - ax) * dx + (p.y - ay) * dy) / l2, 0, 1), qx = ax + dx * t, qy = ay + dy * t;
  const ex = p.x - qx, ey = p.y - qy, d = Math.hypot(ex, ey);
  if (d < p.r) {
    let nx, ny;
    if (d > 0.001) { nx = ex / d; ny = ey / d; } else { const l = Math.sqrt(l2); nx = dy / l; ny = -dx / l; }
    p.x += nx * (p.r - d); p.y += ny * (p.r - d);
    p.on = true; p.nx = nx; p.ny = ny;
  }
}
function step(g, h) {
  const [R, F, H] = S.pts;
  const ax = F.x - R.x, ay = F.y - R.y, al = Math.hypot(ax, ay), ux = ax / al, uy = ay / al, nx = uy, ny = -ux;
  const lean = (g.left ? 1 : 0) - (g.right ? 1 : 0);
  // 기울이기 (뒤로=앞바퀴 위로)
  const LF = (R.on || F.on) ? 420 : 620;
  F.vx += nx * lean * LF * h; F.vy += ny * lean * LF * h;
  R.vx -= nx * lean * LF * h; R.vy -= ny * lean * LF * h;
  for (const p of S.pts) {
    p.vy += GRAV * h;
    if (p !== H && p.on) {
      const tx = -p.ny, ty = p.nx, vt = p.vx * tx + p.vy * ty;
      if (p === R && g.up && vt < MAXV) { p.vx += tx * 1150 * h; p.vy += ty * 1150 * h; }
      if (g.down) { const k = Math.min(1, 6 * h); p.vx -= tx * vt * k; p.vy -= ty * vt * k; }
      else { const k = 0.25 * h; p.vx -= tx * vt * k; p.vy -= ty * vt * k; }
    }
    p.ox = p.x; p.oy = p.y; p.x += p.vx * h; p.y += p.vy * h;
  }
  for (let it = 0; it < 4; it++) {
    for (const [a, b, len] of S.cons) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - len) / d / 2; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
    collide(R); collide(F);
  }
  for (const p of S.pts) { p.vx = (p.x - p.ox) / h; p.vy = (p.y - p.oy) / h; }
  R.rot += (R.vx) * h / WR; F.rot += (F.vx) * h / WR;
  // 머리 충돌
  const hp = { x: H.x, y: H.y, r: 11, on: false };
  collide(hp);
  if (hp.on || R.y > S.baseY + 500) crash(g);
}
function crash(g) {
  if (S.crash) return;
  S.crash = 1.6; S.lives--; S.faults++;
  g.sfx.explode(); g.shake(10, 0.4);
  const H = S.pts[2];
  g.burst(sx(H.x), sy(H.y), ['#ef4444', '#f97316', '#fde047', '#fff'], 30, 320, 0.8, 5);
  for (const p of S.pts) { p.vx = p.vx * 0.6 + U.rand(-150, 150); p.vy = p.vy * 0.5 - U.rand(150, 350); }
}
function finishLevel(g) {
  const tb = Math.max(0, Math.round((S.par - S.t) * 100)), base = 2000 + S.lv * 500, fp = S.faults * 300;
  S.gain = Math.max(500, base + tb - fp);
  S.total += S.gain + S.bonus;
  S.res = `기록 ${S.t.toFixed(2)}s · 시간보너스 ${tb} · 실수 -${fp}`;
  g.add(S.gain); S.clear = 3.5; g.sfx.win();
  g.burst(VW / 2, VH / 2, ['#fde047', '#22c55e', '#38bdf8', '#f472b6'], 50, 380, 1, 5);
  if (S.t < S.par && S.faults === 0) S.lives = Math.min(LIVES, S.lives + 1);
}
function camera(dt) {
  const R = S.pts[0];
  S.cx = U.lerp(S.cx, R.x + 150 + R.vx * 0.25, Math.min(1, dt * 4));
  S.cy = U.lerp(S.cy, Math.min(R.y, S.baseY + 120) - 40, Math.min(1, dt * 3));
}
function sx(x) { return x - S.cx + VW / 2; }
function sy(y) { return y - S.cy + VH / 2; }
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 2; }
function mount(c, off, y, amp, col, f) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 20) c.lineTo(x, y - amp * Math.abs(Math.sin((x + off) * f) + 0.4 * Math.sin((x + off) * f * 2.7)));
  c.lineTo(VW, VH); c.closePath(); c.fill();
}
function wheel(g, c, p) {
  g.circle(p.x, p.y, WR, '#111827'); g.ring(p.x, p.y, WR - 4, '#6b7280', 2);
  c.strokeStyle = '#9ca3af'; c.lineWidth = 1.5; c.beginPath();
  for (let k = 0; k < 3; k++) { const a = p.rot + (k * Math.PI) / 3; c.moveTo(p.x + Math.cos(a) * (WR - 5), p.y + Math.sin(a) * (WR - 5)); c.lineTo(p.x - Math.cos(a) * (WR - 5), p.y - Math.sin(a) * (WR - 5)); }
  c.stroke(); g.circle(p.x, p.y, 3, '#e5e7eb');
}
function drawBike(g, c) {
  const [R, F, H] = S.pts;
  if (S.crash) { wheel(g, c, R); wheel(g, c, F); g.circle(H.x, H.y, 10, '#dc2626'); return; }
  const ux = (F.x - R.x) / 58, uy = (F.y - R.y) / 58, nx = uy, ny = -ux;
  wheel(g, c, R); wheel(g, c, F);
  const seat = [R.x + ux * 20 + nx * 26, R.y + uy * 20 + ny * 26], tank = [R.x + ux * 40 + nx * 30, R.y + uy * 40 + ny * 30], bar = [F.x - ux * 6 + nx * 40, F.y - uy * 6 + ny * 40];
  g.line(R.x, R.y, seat[0], seat[1], '#374151', 5);
  g.line(F.x, F.y, bar[0], bar[1], '#9ca3af', 4);
  g.poly([[R.x + ux * 8 + nx * 18, R.y + uy * 8 + ny * 18], seat, tank, [F.x - ux * 12 + nx * 22, F.y - uy * 12 + ny * 22], [R.x + ux * 30 + nx * 10, R.y + uy * 30 + ny * 10]], '#f97316', '#7c2d12', 2);
  // 라이더
  const hip = [seat[0] - ux * 2 + nx * 4, seat[1] - uy * 2 + ny * 4];
  g.line(hip[0], hip[1], H.x, H.y + 8, '#1d4ed8', 7);
  g.line(H.x, H.y + 10, bar[0], bar[1], '#1d4ed8', 4);
  g.line(hip[0], hip[1], tank[0] + nx * -14, tank[1] + ny * -14, '#1e3a8a', 6);
  g.circle(H.x, H.y, 10, '#fde047'); g.circle(H.x + ux * 4, H.y + uy * 4, 5, '#0f172a');
}
