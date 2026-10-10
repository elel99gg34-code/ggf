'use strict';
let S;
const BL = { X0: 90, Y0: 110, X1: 870, Y1: 500, R: 11, GOAL: 10, DT: 1 / 120 };
const BL_COL = ['#fafafa', '#fdd835', '#e53935'];

GAME({
  title: '3쿠션 당구', w: 960, h: 600, bg: '#3e2723', controls: 'dpad+ab', aLabel: '샷', bLabel: '미세',
  help: '마우스로 조준 → 꾹 눌러 뒤로 당겼다 놓으면 샷 (당긴 거리 = 힘)\n키보드: ←→ 조준 (Shift/X 누르면 미세) · Space 꾹 = 파워 → 놓으면 샷\n↑↓ = 밀어치기/끌어치기 · Q/E = 왼쪽/오른쪽 회전(잉글리시) · 우하단 공 그림 클릭도 가능\n규칙: 내 공(흰색)이 두 공을 모두 맞히되, 두 번째 공 전에 쿠션 3번 이상!\n성공하면 1점 + 계속 · 실패하면 상대 차례 · 10점 먼저 내면 승리',
  init(g) {
    S = { sc: [0, 0], turn: 0, phase: 'aim', aim: 0, pow: 0, powDir: 1, charging: false, drag: null, sx: 0, sy: 0, t: 0, msg: '', msgT: 0, run: 0, inning: 1, best: 0, ai: null, path: null, pathKey: '' };
    S.balls = [mkB(0, 270, 305), mkB(1, 270, 240), mkB(2, 690, 305)];
    S.aim = 0;
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    if (S.phase === 'aim') {
      if (S.turn === 0) humanAim(g, dt); else aiTurn(g);
    } else if (S.phase === 'roll') {
      const n = Math.round(dt / BL.DT);
      for (let i = 0; i < n; i++) { const ev = step(S.balls, BL.DT, S.shot); if (ev) sfxEv(g, ev); }
      if (S.balls.every((b) => b.vx === 0 && b.vy === 0)) judge(g);
    } else if (S.phase === 'judge') {
      S.wait -= dt; if (S.wait <= 0) { S.phase = 'aim'; S.ai = null; S.charging = false; S.pow = 0; if (S.turn === 0) { const c = S.balls[0], o = S.balls[2]; S.aim = Math.atan2(o.y - c.y, o.x - c.x); } }
    }
    g.info = `나 ${S.sc[0]} : ${S.sc[1]} AI · ${S.inning}이닝 · ${S.turn === 0 ? '내 차례' : 'AI 차례'}`;
  },
  draw(g, c) {
    drawTable(g, c);
    for (const b of S.balls) drawBall(g, c, b);
    if (S.phase === 'aim' && S.turn === 0) drawGuide(g, c);
    if (S.phase === 'roll' && S.shot) {
      const sh = S.shot;
      g.rrect(380, 530, 200, 50, 10, 'rgba(0,0,0,.5)');
      g.text(`쿠션 ${sh.cush}${sh.hit2 ? '' : ''}`, 430, 555, 18, sh.cush >= 3 ? '#76ff03' : '#fff');
      g.text(`${sh.hitList.length >= 1 ? '●' : '○'} ${sh.hitList.length >= 2 ? '●' : '○'}`, 530, 555, 20, '#ffeb3b');
    }
    drawPanel(g, c);
    if (S.msgT > 0) g.text(S.msg, 480, 305, 40, S.msgC);
  },
});

function mkB(i, x, y) { return { i, x, y, vx: 0, vy: 0 }; }
function flash(m, c, t) { S.msg = m; S.msgC = c || '#fff'; S.msgT = t || 1.5; }

function humanAim(g, dt) {
  const cb = S.balls[0];
  const fine = g.b ? 0.15 : 1;
  if (g.left) S.aim -= 1.4 * fine * dt;
  if (g.right) S.aim += 1.4 * fine * dt;
  if (g.pressed('up')) S.sy = Math.min(1, S.sy + 0.25);
  if (g.pressed('down')) S.sy = Math.max(-1, S.sy - 0.25);
  if (g.keyp('KeyQ')) S.sx = Math.max(-1, S.sx - 0.25);
  if (g.keyp('KeyE')) S.sx = Math.min(1, S.sx + 0.25);
  const m = g.mouse;
  if (m.clicked && U.dist(m.x, m.y, 880, 548) < 40) { S.sx = U.clamp((m.x - 880) / 32, -1, 1); S.sy = U.clamp(-(m.y - 548) / 32, -1, 1); S.sx = Math.round(S.sx * 4) / 4; S.sy = Math.round(S.sy * 4) / 4; g.sfx.click(); return; }
  if (m.clicked && m.y > 60 && !(U.dist(m.x, m.y, 880, 548) < 50)) { S.drag = { x: m.x, y: m.y }; }
  if (S.drag) {
    if (m.down) { const d = U.dist(m.x, m.y, S.drag.x, S.drag.y); S.pow = U.clamp(d / 220, 0, 1); }
    else { if (S.pow > 0.03) shoot(g, S.aim, S.pow, S.sx, S.sy); S.drag = null; S.pow = 0; return; }
  } else if (m.moved && m.y > 60) {
    S.aim = Math.atan2(m.y - cb.y, m.x - cb.x);
  }
  if (g.pressed('a') && !S.drag) { S.charging = true; S.pow = 0; S.powDir = 1; }
  if (S.charging) {
    S.pow += S.powDir * dt * 0.7; if (S.pow > 1) { S.pow = 1; S.powDir = -1; } if (S.pow < 0) { S.pow = 0; S.powDir = 1; }
    if (!g.held('a')) { S.charging = false; shoot(g, S.aim, Math.max(0.05, S.pow), S.sx, S.sy); }
  }
}
function shoot(g, ang, pow, sx, sy) {
  const cb = S.balls[S.turn], v = 180 + pow * 1250;
  cb.vx = Math.cos(ang) * v; cb.vy = Math.sin(ang) * v;
  S.shot = mkShot(S.turn, sx, sy);
  S.phase = 'roll'; S.lastAim = ang;
  g.sfx.tone(260 + pow * 200, 0.06, 'square', 0.08 + pow * 0.05);
}
function mkShot(cue, sx, sy) { return { cue, sx, sy, cush: 0, hitList: [], cushAtHit2: -1, follow: true }; }

function step(balls, dt, sh) {
  let ev = null;
  for (const b of balls) {
    if (b.vx === 0 && b.vy === 0) continue;
    const sp = Math.hypot(b.vx, b.vy), ns = sp - (55 + sp * 0.32) * dt;
    if (ns <= 4) { b.vx = b.vy = 0; continue; }
    b.vx *= ns / sp; b.vy *= ns / sp;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const isCue = sh && b.i === sh.cue;
    let hitC = false;
    if (b.x < BL.X0 + BL.R) { b.x = BL.X0 + BL.R; b.vx = Math.abs(b.vx) * 0.78; if (isCue) b.vy += sh.sx * Math.abs(b.vx) * 0.32; hitC = true; }
    else if (b.x > BL.X1 - BL.R) { b.x = BL.X1 - BL.R; b.vx = -Math.abs(b.vx) * 0.78; if (isCue) b.vy -= sh.sx * Math.abs(b.vx) * 0.32; hitC = true; }
    if (b.y < BL.Y0 + BL.R) { b.y = BL.Y0 + BL.R; b.vy = Math.abs(b.vy) * 0.78; if (isCue) b.vx -= sh.sx * Math.abs(b.vy) * 0.32; hitC = true; }
    else if (b.y > BL.Y1 - BL.R) { b.y = BL.Y1 - BL.R; b.vy = -Math.abs(b.vy) * 0.78; if (isCue) b.vx += sh.sx * Math.abs(b.vy) * 0.32; hitC = true; }
    if (hitC) { if (isCue) { sh.cush++; sh.sx *= 0.6; } ev = ev || { k: 'c', v: sp }; }
  }
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, md = BL.R * 2;
    if (d2 >= md * md || d2 === 0) continue;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = md - d;
    a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv >= 0) continue;
    const pre = sh ? balls[sh.cue] : null, pv = pre ? Math.hypot(pre.vx, pre.vy) : 0, pdx = pre && pv ? pre.vx / pv : 0, pdy = pre && pv ? pre.vy / pv : 0;
    const jn = -rv * 0.96;
    a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
    ev = { k: 'b', v: -rv };
    if (sh && (a.i === sh.cue || b.i === sh.cue)) {
      const other = a.i === sh.cue ? b.i : a.i;
      if (!sh.hitList.includes(other)) { sh.hitList.push(other); if (sh.hitList.length === 2) sh.cushAtHit2 = sh.cush; }
      if (sh.follow && sh.sy) { sh.follow = false; pre.vx += pdx * sh.sy * pv * 0.42; pre.vy += pdy * sh.sy * pv * 0.42; }
    }
  }
  return ev;
}
function sfxEv(g, ev) {
  if (ev.k === 'b') g.sfx.tone(1200, 0.04, 'sine', Math.min(0.15, ev.v / 4000));
  else g.sfx.tone(140, 0.05, 'triangle', Math.min(0.1, ev.v / 6000));
}
function valid(sh) { return sh.hitList.length === 2 && sh.cushAtHit2 >= 3; }
function judge(g) {
  const sh = S.shot, ok = valid(sh);
  S.phase = 'judge'; S.wait = 1.3;
  if (ok) {
    S.sc[sh.cue]++; S.run++;
    if (sh.cue === 0) { g.add(100 * S.run, 480, 300); g.sfx.coin(); g.burst(S.balls[0].x, S.balls[0].y, ['#ffeb3b', '#fff'], 24, 220, 0.7); flash(S.run > 1 ? `득점! ${S.run}연속` : '득점! 3쿠션 성공', '#ffeb3b'); }
    else { g.sfx.tone(300, 0.15, 'triangle', 0.08); flash('AI 득점', '#ffcc80'); }
    if (S.sc[sh.cue] >= BL.GOAL) {
      S.phase = 'end';
      if (sh.cue === 0) { g.add(1000 + (BL.GOAL - S.sc[1]) * 100); g.later(() => g.win(`${S.sc[0]} : ${S.sc[1]} 승리! (${S.inning}이닝) 🎱`), 1); }
      else g.later(() => g.over(`${S.sc[0]} : ${S.sc[1]} 패배`), 1);
    }
  } else {
    let why = '실패';
    if (sh.hitList.length < 2) why = sh.hitList.length ? '한 공만 맞음' : '공을 못 맞춤';
    else why = `쿠션 부족 (${sh.cushAtHit2}번)`;
    flash(sh.cue === 0 ? `${why} — 턴 넘김` : `AI 실패: ${why}`, sh.cue === 0 ? '#ff8a80' : '#b2ff59');
    if (sh.cue === 1) S.inning++;
    S.turn = 1 - sh.cue; S.run = 0;
    if (sh.cue === 0) g.sfx.drop();
  }
}

function cloneBalls() { return S.balls.map((b) => ({ i: b.i, x: b.x, y: b.y, vx: 0, vy: 0 })); }
function simShot(cue, ang, pow, sx, sy, maxT) {
  const bs = cloneBalls(), cb = bs[cue], v = 180 + pow * 1250;
  cb.vx = Math.cos(ang) * v; cb.vy = Math.sin(ang) * v;
  const sh = mkShot(cue, sx, sy), dt = 1 / 120;
  for (let t = 0; t < (maxT || 9); t += dt) {
    step(bs, dt, sh);
    if (sh.hitList.length === 2) break;
    if (bs.every((b) => b.vx === 0 && b.vy === 0)) break;
  }
  return sh;
}
function aiTurn(g) {
  if (!S.ai) S.ai = { n: 0, cands: [], best: null, think: 0 };
  const A = S.ai, cue = 1;
  A.think += 1 / 60;
  const N = 2400;
  for (let k = 0; k < 60 && A.n < N && A.cands.length < 30; k++, A.n++) {
    const ang = Math.random() * Math.PI * 2, pow = U.rand(0.5, 1), sx = U.choice([-1, -0.5, 0, 0.5, 1]), sy = U.choice([-0.5, 0, 0.5]);
    const sh = simShot(cue, ang, pow, sx, sy);
    if (valid(sh)) A.cands.push([ang, pow, sx, sy]);
  }
  if ((A.n >= N || A.cands.length >= 30) && !A.best) {
    let best = null, bs = -1;
    for (const cnd of A.cands.slice(0, 14)) {
      let s = 0; for (const d of [-0.006, -0.003, 0.003, 0.006]) if (valid(simShot(cue, cnd[0] + d, cnd[1], cnd[2], cnd[3]))) s++;
      if (s > bs) { bs = s; best = cnd; }
    }
    if (!best) { const c0 = S.balls[1], r = S.balls[2]; best = [Math.atan2(r.y - c0.y, r.x - c0.x) + U.rand(-0.1, 0.1), 0.5, 0, 0]; }
    A.best = best;
  }
  if (A.best && A.think > 1.2) {
    const lvl = Math.min(1, (S.sc[0] + S.inning * 0.3) / 12);
    const err = 0.02 - lvl * 0.01;
    const [ang, pow, sx, sy] = A.best;
    S.aiAim = ang;
    if (A.think > 1.8) { shoot(g, ang + U.rand(-err, err), pow * U.rand(0.97, 1.03), sx, sy); }
  }
}

function drawTable(g, c) {
  g.rrect(BL.X0 - 46, BL.Y0 - 46, BL.X1 - BL.X0 + 92, BL.Y1 - BL.Y0 + 92, 20, '#5d4037', '#3e2723', 4);
  g.rect(BL.X0 - 18, BL.Y0 - 18, BL.X1 - BL.X0 + 36, BL.Y1 - BL.Y0 + 36, '#0d47a1');
  const fl = c.createRadialGradient(480, 305, 50, 480, 305, 500); fl.addColorStop(0, '#1e88e5'); fl.addColorStop(1, '#1565c0');
  c.fillStyle = fl; c.fillRect(BL.X0, BL.Y0, BL.X1 - BL.X0, BL.Y1 - BL.Y0);
  for (let i = 1; i < 8; i++) { const x = BL.X0 + (BL.X1 - BL.X0) * i / 8; g.circle(x, BL.Y0 - 32, 3, '#fff'); g.circle(x, BL.Y1 + 32, 3, '#fff'); }
  for (let i = 1; i < 4; i++) { const y = BL.Y0 + (BL.Y1 - BL.Y0) * i / 4; g.circle(BL.X0 - 32, y, 3, '#fff'); g.circle(BL.X1 + 32, y, 3, '#fff'); }
}
function drawBall(g, c, b) {
  g.circle(b.x + 3, b.y + 4, BL.R, 'rgba(0,0,0,.35)');
  g.circle(b.x, b.y, BL.R, BL_COL[b.i]);
  if (b.i === 1) g.circle(b.x, b.y, 3, '#c62828');
  g.circle(b.x - 3.5, b.y - 3.5, 3.5, 'rgba(255,255,255,.75)');
  if (S.phase === 'aim' && b.i === S.turn) g.ring(b.x, b.y, BL.R + 5 + Math.sin(S.t * 5) * 2, 'rgba(255,255,255,.6)', 2);
}
function drawGuide(g, c) {
  const cb = S.balls[0];
  const key = S.aim.toFixed(4) + S.sx + S.sy;
  if (S.pathKey !== key) {
    S.pathKey = key;
    const bs = cloneBalls(), b = bs[0], v = 900; b.vx = Math.cos(S.aim) * v; b.vy = Math.sin(S.aim) * v;
    const sh = mkShot(0, S.sx, S.sy); const pts = [[b.x, b.y]]; let len = 0, firstHit = null;
    for (let t = 0; t < 5 && len < 1100; t += 1 / 120) {
      const px = b.x, py = b.y; step(bs, 1 / 120, sh); len += Math.hypot(b.x - px, b.y - py);
      if (!firstHit && sh.hitList.length) firstHit = [b.x, b.y];
      if (t % 0.02 < 1 / 120) pts.push([b.x, b.y]);
      if (b.vx === 0 && b.vy === 0) break;
    }
    S.path = pts; S.firstHit = firstHit;
  }
  c.setLineDash([5, 7]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath();
  S.path.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.setLineDash([]);
  if (S.firstHit) g.ring(S.firstHit[0], S.firstHit[1], BL.R, 'rgba(255,255,255,.7)', 1.5);
  const back = 24 + S.pow * 90 + (S.charging || S.drag ? 0 : Math.sin(S.t * 3) * 3);
  const ax = Math.cos(S.aim), ay = Math.sin(S.aim);
  c.lineCap = 'round';
  g.line(cb.x - ax * back, cb.y - ay * back, cb.x - ax * (back + 330), cb.y - ay * (back + 330), '#8d6e63', 8);
  g.line(cb.x - ax * back, cb.y - ay * back, cb.x - ax * (back + 14), cb.y - ay * (back + 14), '#e3f2fd', 8);
  g.line(cb.x - ax * (back + 250), cb.y - ay * (back + 250), cb.x - ax * (back + 330), cb.y - ay * (back + 330), '#212121', 10);
}
function drawPanel(g, c) {
  g.rrect(20, 8, 240, 50, 10, 'rgba(0,0,0,.5)', S.turn === 0 ? '#fff' : null);
  g.circle(44, 33, 11, BL_COL[0]); g.text(`나  ${S.sc[0]}`, 64, 33, 24, '#fff', 'left');
  for (let i = 0; i < BL.GOAL; i++) g.circle(150 + i * 10, 33, 3.5, i < S.sc[0] ? '#ffeb3b' : 'rgba(255,255,255,.2)');
  g.rrect(700, 8, 240, 50, 10, 'rgba(0,0,0,.5)', S.turn === 1 ? '#fdd835' : null);
  g.circle(724, 33, 11, BL_COL[1]); g.text(`AI  ${S.sc[1]}`, 744, 33, 24, '#fff', 'left');
  for (let i = 0; i < BL.GOAL; i++) g.circle(830 + i * 10, 33, 3.5, i < S.sc[1] ? '#ffeb3b' : 'rgba(255,255,255,.2)');
  g.text(`${S.inning}이닝`, 480, 24, 16, '#ffcc80'); g.text(S.turn === 0 ? '내 차례' : 'AI 생각 중…', 480, 46, 16, S.turn === 0 ? '#fff' : '#fdd835');
  g.circle(880, 548, 32, '#fafafa'); g.ring(880, 548, 32, '#9e9e9e', 2);
  g.line(848, 548, 912, 548, 'rgba(0,0,0,.15)', 1); g.line(880, 516, 880, 580, 'rgba(0,0,0,.15)', 1);
  g.circle(880 + S.sx * 26, 548 - S.sy * 26, 6, '#e53935');
  g.text('회전', 820, 548, 14, '#ffcc80', 'right');
  if (S.turn === 0 && S.phase === 'aim') {
    g.rect(30, 540, 200, 14, 'rgba(255,255,255,.2)'); g.rect(30, 540, 200 * S.pow, 14, S.pow > 0.8 ? '#ff5252' : '#ffeb3b');
    g.text('파워', 30, 568, 13, '#ffcc80', 'left');
    const sl = (S.sy > 0 ? '밀어치기 ' : S.sy < 0 ? '끌어치기 ' : '') + (S.sx < 0 ? '왼쪽 회전' : S.sx > 0 ? '오른쪽 회전' : '');
    g.text(sl, 240, 568, 13, '#fff', 'left');
  }
}
