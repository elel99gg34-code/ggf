'use strict';
let S;
const CL = { L: 3000, WD: 300, HACK: 130, HOG: 2250, TEE: 2700, BACK: 2830, R: 14, HOUSE: 120, MU: 110, CURL: 9, ENDS: 8, PER: 4, K: 1.4, TOP: 112 };
const CL_COL = ['#e53935', '#fbc02d'];

GAME({
  title: '컬링', w: 960, h: 600, bg: '#cfe3ee', controls: 'dpad+ab', aLabel: '투구/스윕', bLabel: '빨리',
  help: '↑↓ 또는 마우스: 조준(빗자루 위치) · ←→: 회전(컬) 방향\nSpace/클릭 꾹: 파워 게이지 → 놓으면 투구\n스톤이 미끄러지는 동안 Space/클릭 연타 = 스위핑 (더 멀리, 덜 휨)\nShift/X: 상대 차례·정지 대기 빨리감기 · 8엔드 경기, 하우스 중심에 가까운 스톤이 득점',
  init(g) {
    S = { end: 1, sc: [0, 0], endPts: [], hammer: U.randi(0, 1), stones: [], thrown: 0, phase: 'aim', aimY: 150, spin: 1, pow: 0, powDir: 1, charging: false,
      cur: null, sweep: 0, camX: HV(), msg: '', msgT: 0, ai: null, wait: 0, endRes: null, sweepAnim: 0, hitCd: 0 };
    newEnd(g);
  },
  update(g, dt) {
    const fast = g.b ? 4 : 1;
    S.msgT -= dt; S.hitCd -= dt;
    const turn = whoThrows();
    if (S.phase === 'aim') {
      if (turn === 0) playerAim(g, dt);
      else aiThink(g);
    } else if (S.phase === 'run') {
      if (S.cur && S.cur.team === 0 && !S.cur.out) {
        if (g.pressed('a') || g.mouse.clicked) { S.sweep = Math.min(1, S.sweep + 0.28); g.sfx.noise(0.06, 0.05); S.sweepAnim = 0.2; }
        if (g.mouse.down && g.mouse.moved) { S.sweep = Math.min(1, S.sweep + 0.03); S.sweepAnim = 0.1; }
      }
      S.sweep = Math.max(0, S.sweep - dt * 0.9); S.sweepAnim -= dt;
      const steps = Math.ceil(dt * 120 * (S.cur && S.cur.team === 0 ? 1 : fast));
      for (let i = 0; i < steps; i++) {
        const hits = phys(S.stones, 1 / 120, S.cur, S.sweep);
        if (hits > 0 && S.hitCd <= 0) { g.sfx.tone(180, 0.12, 'square', 0.09, 90); g.shake(4, 0.15); g.burst(sx(S.cur.x), sy(S.cur.y), '#fff', 10, 160, 0.4); S.hitCd = 0.15; }
      }
      for (const s of S.stones) if (s.out && !s.outShown) { s.outShown = true; g.float(sx(Math.min(s.x, CL.L)), sy(U.clamp(s.y, 0, CL.WD)), '아웃!', '#ff5252', 20); }
      const c = S.cur;
      if (c) { const tx = U.clamp(c.x - 280, 0, HV()); S.camX = U.lerp(S.camX, tx, 0.15); }
      if (S.stones.every((s) => s.out || (s.vx === 0 && s.vy === 0))) {
        if (c && !c.out && c.x + CL.R < CL.HOG) { c.out = true; g.float(480, 300, '호그라인 미통과', '#ff5252', 26); g.sfx.lose(); }
        S.stones = S.stones.filter((s) => !s.out);
        S.phase = 'settle'; S.wait = 0.9;
        if (c && !c.out) { const d = Math.hypot(c.x - CL.TEE, c.y - CL.WD / 2); if (c.team === 0 && d < 20) { g.float(480, 250, '버튼 정중앙!', '#ffeb3b', 30); g.sfx.coin(); g.add(30); } }
      }
    } else if (S.phase === 'settle') {
      S.camX = U.lerp(S.camX, HV(), 0.08);
      S.wait -= dt * fast;
      if (S.wait <= 0) {
        S.thrown++;
        if (S.thrown >= CL.PER * 2) finishEnd(g); else { S.phase = 'aim'; S.cur = null; S.ai = null; prepThrow(); }
      }
    } else if (S.phase === 'endres') {
      S.wait -= dt * fast;
      if (S.wait <= 0 || (S.wait < 2.2 && (g.pressed('a') || g.mouse.clicked))) {
        if (S.end >= CL.ENDS && S.sc[0] !== S.sc[1]) return finishGame(g);
        S.end++; newEnd(g);
      }
    }
    const hammerName = S.hammer === 0 ? '나' : 'AI';
    g.info = `엔드 ${Math.min(S.end, 99)}${S.end > CL.ENDS ? '(연장)' : '/' + CL.ENDS} · 🔴나 ${S.sc[0]} : ${S.sc[1]} AI🟡 · 투구 ${Math.min(S.thrown + 1, 8)}/8 · 해머 ${hammerName}`;
  },
  draw(g, c) {
    drawSheet(g, c);
    drawMini(g, c);
    const turn = whoThrows();
    if (S.phase === 'aim' && turn === 0) drawAimUI(g, c);
    if (S.phase === 'aim' && turn === 1) g.text('AI가 작전을 생각하는 중' + '.'.repeat(1 + Math.floor(g.time * 3) % 3), 480, 560, 22, '#37474f');
    if (S.phase === 'run' && S.cur && S.cur.team === 0) {
      g.rrect(330, 548, 300, 36, 10, 'rgba(0,0,0,.45)');
      g.rect(340, 558, 200 * S.sweep, 16, '#4fc3f7'); g.stroke(340, 558, 200, 16, '#fff', 1);
      g.text('스윕! (연타)', 590, 566, 16, '#fff');
    }
    if (S.phase === 'endres' && S.endRes) {
      g.rrect(260, 220, 440, 170, 16, 'rgba(15,30,45,.88)', '#fff', 2);
      g.text(`${S.end}엔드 결과`, 480, 255, 26, '#fff');
      const r = S.endRes;
      g.text(r.team < 0 ? '블랭크 엔드 (0점)' : `${r.team === 0 ? '🔴 나' : '🟡 AI'} ${r.pts}점 득점!`, 480, 300, 30, r.team === 0 ? '#ff8a80' : r.team === 1 ? '#ffe082' : '#ccc');
      g.text(`총점 ${S.sc[0]} : ${S.sc[1]}`, 480, 345, 22, '#b3e5fc');
      g.text('클릭/Space 계속', 480, 375, 14, '#90a4ae');
    }
    drawBoard(g);
  },
});

function HV() { return CL.L - 960 / CL.K; }
function whoThrows() { const first = 1 - S.hammer; return S.thrown % 2 === 0 ? first : 1 - first; }
function newEnd(g) { S.stones = []; S.thrown = 0; S.phase = 'aim'; S.cur = null; S.ai = null; S.camX = HV(); prepThrow(); g.sfx.beep(660, 0.12); }
function prepThrow() { S.aimY = 150 + U.rand(-6, 6); S.pow = 0; S.powDir = 1; S.charging = false; S.sweep = 0; }
function sx(x) { return (x - S.camX) * CL.K; }
function sy(y) { return CL.TOP + y * CL.K; }

function playerAim(g, dt) {
  S.camX = U.lerp(S.camX, HV(), 0.1);
  if (g.held('up')) S.aimY -= 90 * dt;
  if (g.held('down')) S.aimY += 90 * dt;
  if (g.mouse.moved && g.mouse.y > CL.TOP && g.mouse.y < CL.TOP + CL.WD * CL.K && !S.charging) S.aimY = (g.mouse.y - CL.TOP) / CL.K;
  S.aimY = U.clamp(S.aimY, 20, CL.WD - 20);
  if (g.pressed('left')) { S.spin = -1; g.sfx.click(); }
  if (g.pressed('right')) { S.spin = 1; g.sfx.click(); }
  if (g.mouse.clicked && g.inRect(20, 540, 150, 46)) { S.spin = -S.spin; g.sfx.click(); return; }
  const start = g.pressed('a') || (g.mouse.clicked && g.mouse.y > CL.TOP);
  if (start && !S.charging) { S.charging = true; S.pow = 0; S.powDir = 1; }
  if (S.charging) {
    S.pow += S.powDir * dt * 0.55;
    if (S.pow >= 1) { S.pow = 1; S.powDir = -1; }
    if (S.pow <= 0) { S.pow = 0; S.powDir = 1; }
    const hold = g.held('a') || g.mouse.down;
    if (!hold) { throwStone(g, 0, aimAngle(S.aimY), powV(S.pow), S.spin); }
  }
}
function aimAngle(by) { return Math.atan2(by - CL.WD / 2, CL.TEE - CL.HACK); }
function powV(p) { const d = 1950 + p * 1150; return Math.sqrt(2 * CL.MU * d) * (p > 0.78 ? 1 + (p - 0.78) * 1.6 : 1); }
function throwStone(g, team, ang, v, spin) {
  const s = { x: CL.HACK, y: CL.WD / 2, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, team, spin, out: false };
  S.stones.push(s); S.cur = s; S.phase = 'run'; S.charging = false; S.sweep = 0; S.camX = 0;
  g.sfx.tone(120, 0.5, 'triangle', 0.08, 80);
}

function phys(st, dt, cur, sweep) {
  let hits = 0;
  for (const s of st) {
    if (s.out) continue;
    const v = Math.hypot(s.vx, s.vy);
    if (v <= 0) continue;
    const sw = s === cur ? sweep : 0;
    const a = s.spin * CL.CURL * U.clamp(1.35 - v / 560, 0.2, 1.3) * (1 - 0.55 * sw);
    let vx = s.vx + (-s.vy / v) * a * dt, vy = s.vy + (s.vx / v) * a * dt;
    const v2 = Math.hypot(vx, vy), nv = Math.max(0, v - CL.MU * (1 - 0.32 * sw) * dt);
    if (nv < 2) { s.vx = s.vy = 0; } else { s.vx = (vx / v2) * nv; s.vy = (vy / v2) * nv; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.y < CL.R || s.y > CL.WD - CL.R || s.x - CL.R > CL.BACK) { s.out = true; s.vx = s.vy = 0; }
  }
  for (let i = 0; i < st.length; i++) {
    const a = st[i]; if (a.out) continue;
    for (let j = i + 1; j < st.length; j++) {
      const b = st[j]; if (b.out) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= 4 * CL.R * CL.R || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = 2 * CL.R - d;
      a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) {
        const jn = -(1 + 0.88) * rv / 2;
        a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
        if (Math.hypot(b.vx, b.vy) > 0 && b.spin && Math.abs(rv) > 30) b.spin *= 0.3;
        if (Math.hypot(a.vx, a.vy) > 0 && a.spin && Math.abs(rv) > 30) a.spin *= 0.3;
        hits++;
      }
    }
  }
  return hits;
}

function endScore(st) {
  const list = st.filter((s) => !s.out).map((s) => ({ t: s.team, d: Math.hypot(s.x - CL.TEE, s.y - CL.WD / 2) })).filter((o) => o.d < CL.HOUSE + CL.R).sort((a, b) => a.d - b.d);
  if (!list.length) return { team: -1, pts: 0, best: list };
  const t = list[0].t; let pts = 0;
  for (const o of list) { if (o.t !== t) break; pts++; }
  return { team: t, pts, best: list };
}

function aiThink(g) {
  if (!S.ai) {
    S.ai = { tries: 0, best: null, bestV: -1e9, delay: 0.6 };
    S.camX = HV();
  }
  const A = S.ai;
  const lvl = Math.min(S.end, 8);
  const N = 70 + lvl * 6;
  for (let k = 0; k < 8 && A.tries < N; k++, A.tries++) {
    let ang, v, spin;
    if (A.best && A.tries > N * 0.65) { ang = A.best[0] + U.rand(-0.004, 0.004); v = A.best[1] * U.rand(0.985, 1.015); spin = A.best[2]; }
    else {
      spin = Math.random() < 0.5 ? -1 : 1;
      const mode = Math.random();
      const ty = CL.WD / 2 + U.rand(-70, 70) - spin * 35;
      ang = aimAngle(ty) + U.rand(-0.01, 0.01);
      if (mode < 0.55) v = powV(U.rand(0.42, 0.66));
      else if (mode < 0.75) v = powV(U.rand(0.2, 0.42));
      else v = powV(U.rand(0.8, 1));
      const op = S.stones.filter((s) => s.team === 0 && !s.out);
      if (mode > 0.75 && op.length) { const t = U.choice(op); ang = Math.atan2(t.y - CL.WD / 2, t.x - CL.HACK) + U.rand(-0.008, 0.008); spin = 0; }
    }
    const val = simEval([ang, v, spin]);
    if (val > A.bestV) { A.bestV = val; A.best = [ang, v, spin]; }
  }
  A.delay -= 1 / 60;
  if (A.tries >= N && A.delay <= 0) {
    const err = 0.03 - lvl * 0.0025;
    const [ang, v, spin] = A.best;
    throwStone(g, 1, ang + U.rand(-err, err) * 0.12, v * (1 + U.rand(-err, err) * 0.25), spin);
  }
}
function simEval(p) {
  const st = S.stones.filter((s) => !s.out).map((s) => ({ x: s.x, y: s.y, vx: 0, vy: 0, team: s.team, spin: 0, out: false }));
  const s = { x: CL.HACK, y: CL.WD / 2, vx: Math.cos(p[0]) * p[1], vy: Math.sin(p[0]) * p[1], team: 1, spin: p[2], out: false };
  st.push(s);
  for (let i = 0; i < 1600; i++) {
    phys(st, 1 / 60, null, 0);
    if (i % 20 === 0 && st.every((o) => o.out || (o.vx === 0 && o.vy === 0))) break;
  }
  if (!s.out && s.x + CL.R < CL.HOG) s.out = true;
  const r = endScore(st);
  let v = r.team === 1 ? r.pts * 100 : r.team === 0 ? -r.pts * 100 : 0;
  const mine = st.filter((o) => o.team === 1 && !o.out);
  for (const o of mine) {
    const d = Math.hypot(o.x - CL.TEE, o.y - CL.WD / 2);
    if (d < CL.HOUSE + CL.R) v += 20 - d * 0.1;
    else if (o.x > CL.HOG + 60 && o.x < CL.TEE - CL.HOUSE && Math.abs(o.y - CL.WD / 2) < 60) v += 6;
  }
  const remaining = CL.PER * 2 - S.thrown - 1;
  if (S.hammer === 1 && remaining <= 1 && r.team === -1 && S.sc[1] >= S.sc[0]) v += 40;
  return v + Math.random() * 2;
}

function finishEnd(g) {
  const r = endScore(S.stones);
  S.endRes = r;
  if (r.team >= 0) {
    S.sc[r.team] += r.pts;
    if (r.team === 0) { g.add(r.pts * 100, 480, 200); g.sfx.win(); g.burst(480, 300, ['#e53935', '#fff', '#ffeb3b'], 40, 300, 1); }
    else { g.sfx.lose(); }
    S.hammer = 1 - r.team;
  }
  S.endPts.push(r.team === 0 ? [r.pts, 0] : r.team === 1 ? [0, r.pts] : [0, 0]);
  S.phase = 'endres'; S.wait = 3.2;
}
function finishGame(g) {
  if (S.sc[0] > S.sc[1]) { g.add(500 + (S.sc[0] - S.sc[1]) * 50); g.win(`${S.sc[0]} : ${S.sc[1]} 승리! 🥌`); }
  else g.over(`${S.sc[0]} : ${S.sc[1]} 패배`);
}

function drawSheet(g, c) {
  const K = CL.K, top = CL.TOP, bot = CL.TOP + CL.WD * K;
  g.rect(0, top - 8, 960, bot - top + 16, '#8d6e63');
  const ice = c.createLinearGradient(0, top, 0, bot); ice.addColorStop(0, '#f4fbff'); ice.addColorStop(0.5, '#ffffff'); ice.addColorStop(1, '#eef7fc');
  c.fillStyle = ice; c.fillRect(0, top, 960, bot - top);
  for (let i = 0; i < 40; i++) { const x = ((i * 137 - S.camX * K) % 1100 + 1100) % 1100 - 70; g.circle(x, top + ((i * 53) % (CL.WD * K)), 1.2, 'rgba(120,160,190,.25)'); }
  const hx = sx(CL.TEE), hy = sy(CL.WD / 2);
  [[CL.HOUSE, '#1e88e5'], [80, '#fff'], [40, '#e53935'], [12, '#fff']].forEach(([r, col]) => g.circle(hx, hy, r * K, col));
  g.line(sx(CL.TEE), top, sx(CL.TEE), bot, 'rgba(0,0,0,.35)', 1.5);
  g.line(sx(-1000), hy, sx(CL.L + 100), hy, 'rgba(0,0,0,.18)', 1.2);
  g.line(sx(CL.HOG), top, sx(CL.HOG), bot, '#c62828', 4);
  g.line(sx(CL.BACK), top, sx(CL.BACK), bot, 'rgba(0,0,0,.6)', 2);
  g.rect(sx(CL.HACK - 30), hy - 14, 18 * K, 28, '#333');
  if (sx(CL.HOG) > -20 && sx(CL.HOG) < 980) g.text('호그라인', sx(CL.HOG), top - 18, 13, '#c62828');
  g.rect(sx(CL.L), top, 400, bot - top, '#8d6e63');
  for (const s of S.stones) if (!s.out) drawStone(g, sx(s.x), sy(s.y), s.team, s);
  if (S.cur && S.phase === 'run' && S.cur.team === 0 && !S.cur.out && Math.hypot(S.cur.vx, S.cur.vy) > 0) {
    const bx = sx(S.cur.x) + 40 + Math.sin(g.time * 30) * (S.sweepAnim > 0 ? 8 : 2), by = sy(S.cur.y);
    g.emoji('🧹', bx, by - 22, 28); g.emoji('🧹', bx + 6, by + 22, 28);
  }
}
function drawStone(g, x, y, team, s) {
  const r = CL.R * CL.K;
  g.circle(x + 2, y + 3, r, 'rgba(0,0,0,.25)');
  g.circle(x, y, r, '#78909c'); g.circle(x, y, r * 0.72, CL_COL[team]);
  g.ring(x, y, r, '#455a64', 2);
  const rot = s ? (s.x * 0.02 * (s.spin || 0)) : 0;
  g.line(x - Math.cos(rot) * r * 0.5, y - Math.sin(rot) * r * 0.5, x + Math.cos(rot) * r * 0.5, y + Math.sin(rot) * r * 0.5, '#333', 4);
}
function drawMini(g, c) {
  const mx = 10, my = 8, mw = 600, k = mw / CL.L, kh = 60 / CL.WD;
  g.rrect(mx - 4, my - 4, mw + 8, 68, 6, 'rgba(255,255,255,.85)', '#90a4ae', 1);
  g.circle(mx + CL.TEE * k, my + 30, CL.HOUSE * kh, '#90caf9'); g.circle(mx + CL.TEE * k, my + 30, 40 * kh, '#ef9a9a');
  g.line(mx + CL.HOG * k, my, mx + CL.HOG * k, my + 60, '#c62828', 2);
  g.stroke(mx + S.camX * k, my, (960 / CL.K) * k, 60, 'rgba(0,0,0,.35)', 1);
  for (const s of S.stones) if (!s.out) g.circle(mx + s.x * k, my + s.y * kh, 3, CL_COL[s.team]);
  const hx = 640, hy = 38;
  g.rrect(hx - 6, 4, 140, 72, 6, 'rgba(255,255,255,.85)', '#90a4ae', 1);
  const kz = 0.24;
  [[CL.HOUSE, '#1e88e5'], [80, '#fff'], [40, '#e53935'], [12, '#fff']].forEach(([r, col]) => g.circle(hx + 64, hy + 2, r * kz, col));
  for (const s of S.stones) if (!s.out && Math.abs(s.x - CL.TEE) < 260) g.circle(hx + 64 + (s.x - CL.TEE) * kz, hy + 2 + (s.y - CL.WD / 2) * kz, 3.5, CL_COL[s.team]);
}
function drawAimUI(g, c) {
  const hy = sy(S.aimY), hx = sx(CL.TEE);
  const y0 = CL.WD / 2 + (S.aimY - CL.WD / 2) * (S.camX - CL.HACK) / (CL.TEE - CL.HACK);
  c.setLineDash([8, 8]); g.line(0, sy(y0), hx, hy, 'rgba(33,33,33,.35)', 2); c.setLineDash([]);
  g.emoji('🧹', hx, hy, 40);
  const ax = hx + 70, dir = S.spin;
  c.strokeStyle = '#6a1b9a'; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, 34, dir > 0 ? -0.6 : Math.PI + 0.6, dir > 0 ? 0.9 : Math.PI - 0.9, dir < 0); c.stroke();
  g.rrect(20, 540, 150, 46, 10, '#6a1b9a', '#fff', 1);
  g.text(S.spin > 0 ? '컬 ↘ 아래로 ▶' : '◀ 컬 ↗ 위로', 95, 563, 17, '#fff');
  const left = 200, w = 520, y = 548;
  g.rrect(left - 6, y - 8, w + 12, 44, 10, 'rgba(0,0,0,.55)');
  const zones = [[0, 0.25, '#78909c', '짧음'], [0.25, 0.45, '#26a69a', '가드'], [0.45, 0.68, '#1e88e5', '하우스'], [0.68, 0.8, '#7e57c2', '뒤쪽'], [0.8, 1, '#e53935', '테이크아웃']];
  for (const [a, b, col, lb] of zones) { g.rect(left + a * w, y, (b - a) * w, 28, col); g.text(lb, left + (a + b) / 2 * w, y + 14, 13, 'rgba(255,255,255,.85)'); }
  g.rect(left + S.pow * w - 3, y - 6, 6, 40, '#ffeb3b');
  g.text(S.charging ? '놓으면 투구!' : 'Space/클릭 꾹 눌러 파워', 840, y + 14, 15, '#263238');
  drawStone(g, 60, 470, 0, null);
  g.text('내 차례', 60, 438, 16, '#c62828');
}
function drawBoard(g) {
  const x0 = 790, y0 = 6;
  g.rrect(x0, y0, 164, 70, 6, 'rgba(255,255,255,.9)', '#90a4ae', 1);
  g.text('🔴', x0 + 12, y0 + 22, 14); g.text('🟡', x0 + 12, y0 + 50, 14);
  for (let i = 0; i < CL.ENDS; i++) {
    const e = S.endPts[i], x = x0 + 30 + i * 15;
    g.text(String(i + 1), x, y0 + 8, 9, '#607d8b');
    g.text(e ? String(e[0] || '·') : '', x, y0 + 24, 12, '#c62828');
    g.text(e ? String(e[1] || '·') : '', x, y0 + 50, 12, '#f9a825');
  }
  g.text(String(S.sc[0]), x0 + 156, y0 + 24, 14, '#c62828', 'right'); g.text(String(S.sc[1]), x0 + 156, y0 + 50, 14, '#f9a825', 'right');
  let mine = 0, ai = 0;
  for (let i = S.thrown; i < CL.PER * 2; i++) { const first = 1 - S.hammer; const t = i % 2 === 0 ? first : 1 - first; if (t === 0) mine++; else ai++; }
  g.text('남은', 790, 92, 11, '#455a64', 'left');
  for (let i = 0; i < mine; i++) g.circle(826 + i * 12, 92, 5, CL_COL[0]);
  for (let i = 0; i < ai; i++) g.circle(886 + i * 12, 92, 5, CL_COL[1]);
}
