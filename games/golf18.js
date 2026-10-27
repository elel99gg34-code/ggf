'use strict';
let S;
const PARS = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 4, 5, 4];
const CLUBS = [
  { n: '드라이버', k: 'DR', d: 255, roll: 24, h: 0.13 },
  { n: '3번 우드', k: '3W', d: 225, roll: 18, h: 0.15 },
  { n: '5번 아이언', k: '5I', d: 185, roll: 12, h: 0.18 },
  { n: '7번 아이언', k: '7I', d: 160, roll: 9, h: 0.21 },
  { n: '9번 아이언', k: '9I', d: 135, roll: 6, h: 0.25 },
  { n: '피칭 웨지', k: 'PW', d: 110, roll: 4, h: 0.28 },
  { n: '샌드 웨지', k: 'SW', d: 80, roll: 2, h: 0.32 },
  { n: '퍼터', k: 'PT', d: 30, roll: 0, h: 0 },
];
const VW = 720, VH = 640;
GAME({
  title: '골프 투어', w: 960, h: 640, bg: '#14532d', controls: 'dpad+ab', aLabel: '스윙', bLabel: '클럽',
  help: '마우스/←→: 방향 조준 · ↑↓ 또는 X: 클럽 변경\n스윙: 클릭/Space 3번 — ①시작 ②파워 결정 ③정확도(흰 선에 맞춰서)\n바람(우측 나침반)·라이(러프/벙커는 거리 감소)를 고려하라\n그린 위: 마우스로 방향, 꾹 눌러 힘 모으고 떼면 퍼팅 (경사 화살표 주의!)\n물/OB는 1벌타 · 18홀 파 72 라운드',
  init(g) {
    S = { hole: 0, seed: (Math.random() * 1e9) | 0, card: [], total: 0, msg: '', msgT: 0, phase: 'aim' };
    loadHole(g, 0);
  },
  update(g, dt) {
    S.msgT -= dt;
    const H = S.H;
    if (S.phase === 'card') {
      if (g.pressed('a') || g.mouse.clicked) { if (S.hole >= 17) return finish(g); S.hole++; loadHole(g, S.hole); g.sfx.click(); }
      return;
    }
    if (S.phase === 'holed') { S.t -= dt; if (S.t <= 0) S.phase = 'card'; return; }
    if (S.phase === 'aim') aimUpd(g, dt);
    else if (S.phase === 'swing') swingUpd(g, dt);
    else if (S.phase === 'fly') flyUpd(g, dt);
    else if (S.phase === 'roll') rollUpd(g, dt);
    else if (S.phase === 'putt') puttUpd(g, dt);
    else if (S.phase === 'proll') prollUpd(g, dt);
    else if (S.phase === 'wait') { S.t -= dt; if (S.t <= 0) S.after(); }
    g.info = `${S.hole + 1}번 홀 · 파${H.par} · ${H.strokes}타`;
  },
  draw(g, c) {
    if (S.view === 'green') drawGreen(g, c); else drawCourse(g, c);
    drawPanel(g, c);
    if (S.phase === 'card') drawCard(g, c);
    if (S.msgT > 0) { g.rrect(VW / 2 - 200, 40, 400, 56, 14, 'rgba(0,0,0,.7)'); g.text(S.msg, VW / 2, 68, 26, S.msgC || '#fde047'); }
  },
});
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function say(m, c = '#fde047', t = 1.8) { S.msg = m; S.msgC = c; S.msgT = t; }
function loadHole(g, i) {
  const R = rng(S.seed + i * 7919), r = (a, b) => a + R() * (b - a), par = PARS[i];
  const len = par === 3 ? r(135, 205) : par === 4 ? r(330, 445) : r(480, 555);
  const pts = [[0, 0]];
  if (par === 3) pts.push([r(-15, 15), len]);
  else {
    const dog = r(-45, 45);
    pts.push([r(-10, 10), len * 0.25], [dog * 0.6, len * 0.5]);
    pts.push([dog, len * 0.75], [dog + r(-25, 25), len]);
  }
  const gc = pts[pts.length - 1];
  const H = { par, len: Math.round(len), pts, fw: par === 3 ? 0 : r(28, 40), green: { x: gc[0], y: gc[1], r: r(13, 18) }, bunkers: [], water: [], trees: [], strokes: 0, slope: { x: r(-0.5, 0.5), y: r(-0.5, 0.5) } };
  H.pin = { x: gc[0] + r(-0.5, 0.5) * H.green.r * 0.9, y: gc[1] + r(-0.5, 0.5) * H.green.r * 0.9 };
  for (let k = 0; k < 2 + (R() * 2 | 0); k++) { const a = r(0, Math.PI * 2), d = H.green.r + r(3, 7); H.bunkers.push({ x: gc[0] + Math.cos(a) * d, y: gc[1] + Math.sin(a) * d, r: r(4, 7) }); }
  if (par > 3) for (let k = 0; k < 2; k++) { const p = pathAt(H, r(0.45, 0.8)); const s = R() < 0.5 ? -1 : 1; H.bunkers.push({ x: p[0] + s * (H.fw / 2 + r(-4, 4)), y: p[1], r: r(5, 9) }); }
  if (R() < 0.75) {
    const t = par === 3 ? r(0.35, 0.7) : r(0.3, 0.85), p = pathAt(H, t), cross = R() < 0.4;
    H.water.push(cross ? { x: p[0], y: p[1], rx: H.fw / 2 + 25, ry: r(8, 14) } : { x: p[0] + (R() < 0.5 ? -1 : 1) * (H.fw / 2 + r(15, 30)), y: p[1], rx: r(14, 24), ry: r(18, 34) });
  }
  for (let k = 0; k < 46; k++) {
    const t = r(0.05, 1.05), p = pathAt(H, Math.min(1, t)), s = R() < 0.5 ? -1 : 1, off = Math.max(H.fw, 20) / 2 + r(16, 60);
    const tr = { x: p[0] + s * off, y: p[1] + (t > 1 ? (t - 1) * 120 : 0), r: r(3.5, 6.5) };
    if (U.dist(tr.x, tr.y, gc[0], gc[1]) > H.green.r + 10 && !inWater(H, tr.x, tr.y)) H.trees.push(tr);
  }
  S.H = H;
  S.ball = { x: 0, y: 0 }; S.prev = { x: 0, y: 0 };
  S.wind = { a: Math.random() * Math.PI * 2, s: Math.round(Math.random() * (4 + i * 0.6)) };
  S.sc = Math.min(2.8, 560 / (len + 50));
  S.view = 'course'; S.phase = 'aim';
  autoClub(); aimAtPin();
  say(`${i + 1}번 홀 · 파 ${par} · ${H.len}야드`, '#fff', 2);
}
function pathAt(H, t) {
  const P = H.pts, n = P.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  return [U.lerp(P[i][0], P[i + 1][0], u), U.lerp(P[i][1], P[i + 1][1], u)];
}
function distPath(H, x, y) {
  let md = 1e9;
  for (let i = 0; i < H.pts.length - 1; i++) {
    const [ax, ay] = H.pts[i], [bx, by] = H.pts[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = U.clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    md = Math.min(md, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return md;
}
function inWater(H, x, y) { return H.water.some((w) => ((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 < 1); }
function terr(x, y) {
  const H = S.H;
  if (inWater(H, x, y)) return 'water';
  if (U.dist(x, y, H.green.x, H.green.y) < H.green.r) return 'green';
  if (H.bunkers.some((b) => U.dist(x, y, b.x, b.y) < b.r)) return 'sand';
  const dp = distPath(H, x, y);
  if (dp > 85 || y < -25 || y > H.green.y + 45) return 'ob';
  if (Math.hypot(x, y) < 6) return 'tee';
  if (U.dist(x, y, H.green.x, H.green.y) < H.green.r + 3) return 'fringe';
  if (H.fw && dp < H.fw / 2 && y > 25) return 'fairway';
  return 'rough';
}
const LIE = { tee: ['티', 1], fairway: ['페어웨이', 1], rough: ['러프', 0.82], sand: ['벙커', 0.6], green: ['그린', 1], fringe: ['프린지', 0.95] };
function pinDist() { return U.dist(S.ball.x, S.ball.y, S.H.pin.x, S.H.pin.y); }
function autoClub() {
  const t = terr(S.ball.x, S.ball.y);
  if (t === 'green') { S.club = 7; return; }
  const d = pinDist() / (LIE[t] ? LIE[t][1] : 1);
  S.club = 6;
  for (let i = 0; i < 7; i++) if (CLUBS[i].d * 0.97 <= d + 5) { S.club = i; break; }
  if (S.club === 0 && t !== 'tee') S.club = 1;
  if (t === 'sand' && d < 90) S.club = 6;
}
function aimAtPin() { S.aim = Math.atan2(S.H.pin.x - S.ball.x, S.H.pin.y - S.ball.y); }
function W2S(x, y) { return [VW / 2 + x * S.sc - S.camX * S.sc, VH - 40 - y * S.sc]; }
function S2W(sx, sy) { return [(sx - VW / 2) / S.sc + S.camX, (VH - 40 - sy) / S.sc]; }
function aimUpd(g, dt) {
  const onGreen = terr(S.ball.x, S.ball.y) === 'green';
  if (onGreen) { S.view = 'green'; S.phase = 'putt'; S.club = 7; S.pc = -1; aimAtPin(); return; }
  S.view = 'course';
  if (g.pressed('up')) { S.club = Math.max(0, S.club - 1); g.sfx.click(); }
  if (g.pressed('down') || g.pressed('b')) { S.club = (S.club + 1) % 7; g.sfx.click(); }
  S.aim += (g.right - g.left) * 0.8 * dt;
  if (g.mouse.moved && g.mouse.x < VW) { const [wx, wy] = S2W(g.mouse.x, g.mouse.y); S.aim = Math.atan2(wx - S.ball.x, wy - S.ball.y); }
  if (g.clickIn(VW + 20, 300, 100, 34)) { S.club = Math.max(0, S.club - 1); return; }
  if (g.clickIn(VW + 130, 300, 100, 34)) { S.club = Math.min(6, S.club + 1); return; }
  if (g.pressed('a') || (g.mouse.clicked && g.mouse.x < VW)) { S.phase = 'swing'; S.sw = { st: 1, v: 0, dir: 1, pw: 0, acc: 0 }; g.sfx.tone(300, 0.05, 'sine', 0.05); }
}
function swingUpd(g, dt) {
  const w = S.sw, press = g.pressed('a') || (g.mouse.clicked && g.mouse.x < VW);
  if (w.st === 1) {
    w.v += w.dir * dt * 1.05;
    if (w.v >= 1.1) { w.v = 1.1; w.dir = -1; }
    if (press) { w.pw = Math.max(0.05, w.v); w.st = 2; w.v = w.pw; g.sfx.tone(500, 0.05, 'sine', 0.05); return; }
    if (w.v <= 0 && w.dir < 0) { S.phase = 'aim'; return; }
  } else {
    w.v -= dt * 1.5;
    if (press || w.v <= -0.18) { w.acc = U.clamp(w.v / 0.12, -1.5, 1.5); if (w.v <= -0.18) w.acc = -1.5; hit(g); }
  }
}
function hit(g) {
  const H = S.H, C = CLUBS[S.club], w = S.sw, lie = terr(S.ball.x, S.ball.y);
  let lm = LIE[lie] ? LIE[lie][1] : 1;
  if (lie === 'sand' && S.club === 6) lm = 0.9;
  if (lie === 'sand' && S.club <= 1) lm = 0.35;
  let e = w.acc + (w.pw > 1 ? U.rand(-1, 1) * (w.pw - 1) * 8 : 0);
  if (lie === 'rough') e += U.rand(-0.25, 0.25);
  const D = C.d * Math.min(1.1, w.pw) * lm * U.rand(0.97, 1.03);
  const dir = S.aim + e * 0.05;
  const curve = e * D * 0.09;
  const wx = Math.sin(S.wind.a) * S.wind.s, wy = Math.cos(S.wind.a) * S.wind.s, ft = 1.2 + D / 170;
  const windK = 0.55 * (1 + C.h * 2) * ft;
  const lx = S.ball.x + Math.sin(dir) * D + Math.cos(dir) * curve + wx * windK, ly = S.ball.y + Math.cos(dir) * D - Math.sin(dir) * curve + wy * windK;
  S.prev = { x: S.ball.x, y: S.ball.y };
  S.fl = { sx: S.ball.x, sy: S.ball.y, ex: lx, ey: ly, cx: S.ball.x + Math.sin(dir) * D * 0.5 + wx * windK * 0.3, cy: S.ball.y + Math.cos(dir) * D * 0.5 + wy * windK * 0.3, t: 0, T: ft, h: D * C.h * 1.6, dir: Math.atan2(lx - S.ball.x, ly - S.ball.y), D };
  H.strokes++;
  S.phase = 'fly';
  g.sfx.tone(Math.abs(w.acc) < 0.25 ? 1400 : 700, 0.08, 'square', 0.08, 200); g.sfx.noise(0.05, 0.15);
  if (Math.abs(w.acc) < 0.2 && w.pw > 0.9) g.float(VW / 2, 120, '나이스 샷!', '#86efac', 22);
  else if (Math.abs(e) > 0.8) g.float(VW / 2, 120, e > 0 ? '슬라이스!' : '훅!', '#fca5a5', 22);
}
function flyUpd(g, dt) {
  const f = S.fl; f.t += dt / f.T;
  const t = Math.min(1, f.t), u = 1 - t;
  S.ball.x = u * u * f.sx + 2 * u * t * f.cx + t * t * f.ex; S.ball.y = u * u * f.sy + 2 * u * t * f.cy + t * t * f.ey;
  S.ball.z = Math.sin(t * Math.PI) * f.h;
  if (t >= 1) {
    S.ball.z = 0;
    const tr = terr(S.ball.x, S.ball.y);
    if (S.H.trees.some((q) => U.dist(q.x, q.y, S.ball.x, S.ball.y) < q.r + 1)) { g.sfx.tone(200, 0.1, 'triangle', 0.06); say('나무에 맞았다!', '#fca5a5'); g.burst(...W2S(S.ball.x, S.ball.y), '#22c55e', 10, 120); return settle(g); }
    if (tr === 'water' || tr === 'ob') return penalty(g, tr);
    if (tr === 'sand') { g.sfx.tone(120, 0.15, 'triangle', 0.05); g.burst(...W2S(S.ball.x, S.ball.y), '#fde68a', 14, 100); return settle(g); }
    const C = CLUBS[S.club], mult = tr === 'green' ? 0.7 : tr === 'rough' ? 0.3 : 1;
    S.rl = { d: C.roll * mult * U.rand(0.8, 1.2), dir: f.dir, v: 0 };
    S.rl.v = Math.sqrt(2 * 14 * S.rl.d);
    S.phase = 'roll'; g.sfx.drop();
  }
}
function rollUpd(g, dt) {
  const r = S.rl;
  const tr0 = terr(S.ball.x, S.ball.y);
  const fr = tr0 === 'rough' ? 40 : tr0 === 'green' ? 9 : 14;
  r.v = Math.max(0, r.v - fr * dt);
  S.ball.x += Math.sin(r.dir) * r.v * dt; S.ball.y += Math.cos(r.dir) * r.v * dt;
  const tr = terr(S.ball.x, S.ball.y);
  if (U.dist(S.ball.x, S.ball.y, S.H.pin.x, S.H.pin.y) < 0.35 && r.v < 9) return holed(g);
  if (tr === 'water' || tr === 'ob') return penalty(g, tr);
  if (tr === 'sand') r.v = 0;
  if (r.v <= 0) settle(g);
}
function settle(g) {
  const t = terr(S.ball.x, S.ball.y);
  if (S.H.strokes >= 10) { say('최대 타수 — 픽업', '#fca5a5'); return endHole(g, 10); }
  S.phase = 'wait'; S.t = 0.7;
  S.after = () => { S.phase = 'aim'; autoClub(); aimAtPin(); };
  if (t === 'green') say('온 그린!', '#86efac', 1.2);
}
function penalty(g, tr) {
  S.H.strokes++;
  say(tr === 'water' ? '💦 해저드! 1벌타' : 'OB! 1벌타', '#93c5fd');
  g.sfx.tone(200, 0.3, 'sine', 0.06, 80);
  g.burst(...W2S(S.ball.x, S.ball.y), tr === 'water' ? '#60a5fa' : '#fff', 20, 160);
  S.phase = 'wait'; S.t = 1.2;
  S.after = () => {
    if (tr === 'water') {
      // 해저드 앞(직전 위치 방향)으로 드롭
      let x = S.ball.x, y = S.ball.y; const a = Math.atan2(S.prev.x - x, S.prev.y - y);
      for (let k = 0; k < 200 && (terr(x, y) === 'water' || terr(x, y) === 'ob'); k++) { x += Math.sin(a) * 1.5; y += Math.cos(a) * 1.5; }
      S.ball.x = x + Math.sin(a) * 2; S.ball.y = y + Math.cos(a) * 2;
    } else { S.ball.x = S.prev.x; S.ball.y = S.prev.y; }
    if (S.H.strokes >= 10) return endHole(g, 10);
    S.phase = 'aim'; autoClub(); aimAtPin();
  };
}
/* ---------- 퍼팅 ---------- */
const GS = 15;
function G2S(x, y) { return [VW / 2 + (x - S.H.green.x) * GS, VH / 2 - (y - S.H.green.y) * GS]; }
function puttUpd(g, dt) {
  S.aim += (g.right - g.left) * 0.5 * dt;
  if (g.mouse.moved && g.mouse.x < VW) { const x = (g.mouse.x - VW / 2) / GS + S.H.green.x, y = -(g.mouse.y - VH / 2) / GS + S.H.green.y; S.aim = Math.atan2(x - S.ball.x, y - S.ball.y); }
  const holding = g.held('a') || (g.mouse.down && g.mouse.x < VW);
  if (holding) { if (S.pc < 0) { S.pc = 0; S.pcd = 1; } S.pc += S.pcd * dt * 0.75; if (S.pc >= 1) { S.pc = 1; S.pcd = -1; } if (S.pc <= 0) { S.pc = 0; S.pcd = 1; } }
  else if (S.pc > 0.01) {
    const v = 1.5 + S.pc * 15;
    S.pr = { vx: Math.sin(S.aim) * v, vy: Math.cos(S.aim) * v };
    S.prev = { x: S.ball.x, y: S.ball.y };
    S.H.strokes++; S.phase = 'proll'; S.pc = -1;
    g.sfx.tone(600, 0.05, 'sine', 0.08);
  } else S.pc = -1;
}
function prollUpd(g, dt) {
  const p = S.pr, H = S.H;
  for (let k = 0; k < 4; k++) {
    const h = dt / 4, sp = Math.hypot(p.vx, p.vy);
    if (sp > 0) { const dec = Math.min(sp, 3.2 * h); p.vx -= (p.vx / sp) * dec; p.vy -= (p.vy / sp) * dec; }
    if (sp > 0.05 || Math.hypot(H.slope.x, H.slope.y) > 0.45) { p.vx += H.slope.x * h; p.vy += H.slope.y * h; }
    S.ball.x += p.vx * h; S.ball.y += p.vy * h;
    const d = U.dist(S.ball.x, S.ball.y, H.pin.x, H.pin.y), sp2 = Math.hypot(p.vx, p.vy);
    if (d < 0.22) {
      if (sp2 < 5.5) return holed(g);
      const a = Math.atan2(S.ball.y - H.pin.y, S.ball.x - H.pin.x); p.vx += Math.cos(a) * 1.5; p.vy += Math.sin(a) * 1.5; p.vx *= 0.7; p.vy *= 0.7;
      g.sfx.tone(900, 0.04, 'square', 0.05); g.float(...G2S(H.pin.x, H.pin.y), '립아웃!', '#fca5a5', 16);
    }
  }
  if (Math.hypot(p.vx, p.vy) < 0.06) {
    const t = terr(S.ball.x, S.ball.y);
    if (t === 'water' || t === 'ob') return penalty(g, t);
    if (S.H.strokes >= 10) return endHole(g, 10);
    S.phase = t === 'green' ? 'putt' : 'aim'; S.pc = -1; if (t !== 'green') { S.view = 'course'; autoClub(); } aimAtPin();
  }
}
function holed(g) {
  const H = S.H, n = H.strokes;
  g.sfx.tone(800, 0.08, 'sine', 0.08); g.sfx.tone(600, 0.1, 'sine', 0.08, null, 0.1);
  endHole(g, n);
}
const NAMES = { '-4': '콘도르!!', '-3': '알바트로스!!', '-2': '이글!', '-1': '버디!', 0: '파', 1: '보기', 2: '더블 보기', 3: '트리플 보기' };
function endHole(g, n) {
  const H = S.H, rel = n - H.par;
  S.card.push({ par: H.par, s: n });
  S.total += rel;
  let pts = rel <= -3 ? 1000 : rel === -2 ? 600 : rel === -1 ? 300 : rel === 0 ? 150 : rel === 1 ? 50 : 0;
  if (n === 1) { pts += 2000; say('⛳ 홀인원!!!', '#fde047', 2.5); g.burst(VW / 2, VH / 2, ['#fde047', '#fff', '#22c55e'], 80, 450, 1.3, 5); }
  else say(NAMES[rel] || `+${rel}`, rel < 0 ? '#86efac' : rel === 0 ? '#fff' : '#fca5a5', 2);
  if (pts) g.add(pts, VW / 2, VH / 2 - 60);
  if (rel < 0) g.sfx.win();
  S.phase = 'holed'; S.t = 2;
}
function finish(g) {
  const tot = S.card.reduce((a, c) => a + c.s, 0), rel = S.total;
  const msg = `18홀 ${tot}타 (${rel > 0 ? '+' : ''}${rel === 0 ? 'E' : rel})`;
  if (rel <= 0) { g.add(3000 + -rel * 300); g.win('언더파 라운드! ' + msg); } else g.over(msg);
}
/* ---------- 그리기 ---------- */
function drawCourse(g, c) {
  const H = S.H;
  S.camX = U.lerp(S.camX || 0, (H.green.x + 0) / 2 * 0.6, 0.1);
  g.rect(0, 0, VW, VH, '#1f5f2a');
  // OB 경계 (러프)
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); H.pts.forEach((p, i) => { const [x, y] = W2S(p[0], p[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.strokeStyle = '#3f8f3a'; c.lineWidth = 170 * S.sc; c.stroke();
  if (H.fw) {
    c.beginPath(); H.pts.forEach((p, i) => { const q = i === 0 ? [p[0], 28] : p; const [x, y] = W2S(q[0], q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.strokeStyle = '#65c35a'; c.lineWidth = H.fw * S.sc; c.stroke();
    c.save(); c.setLineDash([6, 10]); c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = H.fw * S.sc * 0.6; c.stroke(); c.restore();
  }
  for (const w of H.water) { const [x, y] = W2S(w.x, w.y); c.beginPath(); c.ellipse(x, y, w.rx * S.sc, w.ry * S.sc, 0, 0, Math.PI * 2); c.fillStyle = '#2563eb'; c.fill(); c.strokeStyle = '#93c5fd'; c.lineWidth = 2; c.stroke(); }
  const [gx, gy] = W2S(H.green.x, H.green.y);
  g.circle(gx, gy, (H.green.r + 3) * S.sc, '#55b34a'); g.circle(gx, gy, H.green.r * S.sc, '#86e07a');
  for (const b of H.bunkers) { const [x, y] = W2S(b.x, b.y); g.circle(x, y, b.r * S.sc, '#f3e1a6'); g.ring(x, y, b.r * S.sc, '#d4b86a', 1); }
  const [tx, ty] = W2S(0, 0); g.rrect(tx - 6 * S.sc, ty - 4 * S.sc, 12 * S.sc, 8 * S.sc, 3, '#7bd16d');
  for (const t of H.trees) { const [x, y] = W2S(t.x, t.y); g.circle(x + 2, y + 3, t.r * S.sc, 'rgba(0,0,0,.25)'); g.circle(x, y, t.r * S.sc, '#14532d'); g.circle(x - t.r * S.sc * 0.3, y - t.r * S.sc * 0.3, t.r * S.sc * 0.5, '#166534'); }
  const [px, py] = W2S(H.pin.x, H.pin.y);
  g.circle(px, py, 3, '#111'); g.line(px, py, px, py - 26, '#fff', 2); g.poly([[px, py - 26], [px + 14, py - 21], [px, py - 16]], '#ef4444');
  // 조준선
  if (S.phase === 'aim' || S.phase === 'swing') {
    const C = CLUBS[S.club], lie = terr(S.ball.x, S.ball.y), lm = LIE[lie] ? LIE[lie][1] : 1, D = C.d * lm;
    const [bx, by] = W2S(S.ball.x, S.ball.y), [ex, ey] = W2S(S.ball.x + Math.sin(S.aim) * D, S.ball.y + Math.cos(S.aim) * D);
    c.save(); c.setLineDash([5, 7]); g.line(bx, by, ex, ey, 'rgba(255,255,255,.8)', 2); c.restore();
    g.ring(ex, ey, Math.max(8, D * 0.06 * S.sc), 'rgba(255,255,255,.85)', 2); g.ring(ex, ey, 3, '#fff', 2);
  }
  const [bx, by] = W2S(S.ball.x, S.ball.y), z = S.ball.z || 0;
  g.circle(bx + z * 0.15, by + z * 0.1, 4, 'rgba(0,0,0,.35)');
  g.circle(bx, by - z * S.sc * 0.6, 4 + z * 0.06, '#fff'); g.ring(bx, by - z * S.sc * 0.6, 4 + z * 0.06, '#333', 1);
  if (S.phase === 'swing') drawMeter(g);
}
function drawMeter(g) {
  const w = S.sw, x0 = 110, x1 = 610, y = 590, zero = x0 + 70, k = (x1 - zero) / 1.1;
  g.rrect(x0 - 10, y - 22, x1 - x0 + 20, 44, 10, 'rgba(0,0,0,.7)');
  const gr = g.ctx.createLinearGradient(zero, 0, x1, 0); gr.addColorStop(0, '#22c55e'); gr.addColorStop(0.85, '#facc15'); gr.addColorStop(1, '#ef4444');
  g.rrect(zero, y - 10, x1 - zero, 20, 6, gr);
  g.rect(x0, y - 10, zero - x0, 20, '#334155');
  g.rect(zero - 0.12 * k, y - 12, 0.24 * k, 24, 'rgba(255,255,255,.25)');
  g.line(zero, y - 16, zero, y + 16, '#fff', 3);
  g.line(zero + k, y - 14, zero + k, y + 14, '#fff', 1);
  if (w.st === 2) g.line(zero + w.pw * k, y - 16, zero + w.pw * k, y + 16, '#f97316', 4);
  const mx = zero + w.v * k; g.poly([[mx, y - 12], [mx - 6, y - 22], [mx + 6, y - 22]], '#fff'); g.line(mx, y - 12, mx, y + 12, '#fff', 2);
  g.text(w.st === 1 ? '파워를 정하세요' : '흰 선에서 멈추기!', (x0 + x1) / 2, y - 34, 15, '#fff');
}
function drawGreen(g, c) {
  const H = S.H;
  g.rect(0, 0, VW, VH, '#3f8f3a');
  const [gx, gy] = G2S(H.green.x, H.green.y);
  g.circle(gx, gy, (H.green.r + 3) * GS, '#55b34a'); g.circle(gx, gy, H.green.r * GS, '#86e07a');
  for (const b of H.bunkers) { const [x, y] = G2S(b.x, b.y); g.circle(x, y, b.r * GS, '#f3e1a6'); }
  // 경사 화살표
  const sl = H.slope, sm = Math.hypot(sl.x, sl.y), a = Math.atan2(-sl.y, sl.x);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x = gx + i * 55 + ((g.time * 20 * sm) % 20) * Math.cos(a), y = gy + j * 55 + ((g.time * 20 * sm) % 20) * Math.sin(a);
    if (Math.hypot(x - gx, y - gy) > H.green.r * GS - 10) continue;
    c.save(); c.translate(x, y); c.rotate(a); g.line(-8, 0, 8, 0, 'rgba(255,255,255,.35)', 2); g.poly([[10, 0], [4, -4], [4, 4]], 'rgba(255,255,255,.35)'); c.restore();
  }
  const [px, py] = G2S(H.pin.x, H.pin.y);
  g.circle(px, py, 0.22 * GS + 2, '#0a0a0a');
  g.line(px, py, px, py - 60, '#fff', 3); g.poly([[px, py - 60], [px + 26, py - 52], [px, py - 44]], '#ef4444');
  const [bx, by] = G2S(S.ball.x, S.ball.y);
  if (S.phase === 'putt') {
    const L = 40 + Math.max(0, S.pc) * 160;
    c.save(); c.setLineDash([6, 6]); g.line(bx, by, bx + Math.sin(S.aim) * L, by - Math.cos(S.aim) * L, 'rgba(255,255,255,.8)', 2); c.restore();
    if (S.pc >= 0) {
      g.rrect(VW / 2 - 150, 590, 300, 22, 8, 'rgba(0,0,0,.6)');
      g.rrect(VW / 2 - 148, 592, 296 * S.pc, 18, 7, U.hsl(120 - S.pc * 120, 85, 55));
      g.text(`${Math.round(((1.5 + S.pc * 15) ** 2 / 6.4))}야드`, VW / 2, 572, 14, '#fff');
    } else g.text('꾹 눌러 힘 모으기 → 떼면 퍼팅', VW / 2, 600, 16, '#fff');
  }
  g.circle(bx + 2, by + 2, 6, 'rgba(0,0,0,.3)'); g.circle(bx, by, 6, '#fff'); g.ring(bx, by, 6, '#333', 1);
  g.text(`홀까지 ${pinDist().toFixed(1)}야드 · 경사 ${sm < 0.15 ? '평탄' : sm < 0.35 ? '약간' : '심함'}`, VW / 2, 24, 16, '#fff');
}
function drawPanel(g, c) {
  const H = S.H, x = VW;
  g.rect(x, 0, 240, VH, '#0f2a1c');
  g.text(`${S.hole + 1}번 홀`, x + 120, 30, 26, '#fde047');
  g.text(`파 ${H.par} · ${H.len}야드`, x + 120, 60, 16, '#d1fae5');
  g.text(`이번 홀 ${H.strokes}타`, x + 120, 90, 18, '#fff');
  g.text(`스코어 ${S.total > 0 ? '+' : ''}${S.total === 0 ? 'E' : S.total}`, x + 120, 118, 18, S.total < 0 ? '#86efac' : S.total > 0 ? '#fca5a5' : '#fff');
  // 바람
  const cx = x + 120, cy = 190;
  g.circle(cx, cy, 42, 'rgba(255,255,255,.08)'); g.ring(cx, cy, 42, 'rgba(255,255,255,.3)', 2);
  g.text('N', cx, cy - 52, 11, '#94a3b8');
  const wa = S.wind.a, L = 12 + S.wind.s * 1.8;
  c.save(); c.translate(cx, cy); c.rotate(wa); g.line(0, L, 0, -L, '#38bdf8', 4); g.poly([[0, -L - 8], [-7, -L + 2], [7, -L + 2]], '#38bdf8'); c.restore();
  g.text(`바람 ${S.wind.s} mph`, cx, cy + 58, 15, '#bae6fd');
  const lie = terr(S.ball.x, S.ball.y);
  g.text(`라이: ${LIE[lie] ? LIE[lie][0] : '-'}`, cx, 278, 15, lie === 'sand' || lie === 'rough' ? '#fde68a' : '#d1fae5');
  const C = CLUBS[S.club];
  g.button(x + 20, 300, 100, 34, '▲ 클럽', '#166534', 14); g.button(x + 130, 300, 100, 34, '클럽 ▼', '#166534', 14);
  g.rrect(x + 20, 345, 210, 70, 10, 'rgba(255,255,255,.07)');
  g.text(C.n, cx, 368, 20, '#fff');
  g.text(S.club === 7 ? '그린 위' : `최대 ${Math.round(C.d * (LIE[lie] ? LIE[lie][1] : 1))}야드`, cx, 396, 14, '#a7f3d0');
  g.text(`핀까지 ${Math.round(pinDist())}야드`, cx, 440, 18, '#fde047');
  // 미니 스코어
  let y = 480;
  g.text('스코어카드', cx, y, 14, '#86efac');
  for (let i = 0; i < 18; i++) {
    const r = Math.floor(i / 9), col = i % 9, xx = x + 22 + col * 23, yy = y + 22 + r * 46;
    g.text(i + 1 + '', xx, yy, 10, '#64748b');
    const cd = S.card[i];
    if (cd) { const d = cd.s - cd.par; if (d < 0) g.ring(xx, yy + 18, 9, '#86efac', 2); if (d > 0) g.stroke(xx - 9, yy + 9, 18, 18, '#fca5a5', 2); g.text(cd.s + '', xx, yy + 18, 12, '#fff'); }
    else g.text(PARS[i] + '', xx, yy + 18, 11, '#475569');
  }
}
function drawCard(g, c) {
  g.rrect(80, 160, 560, 300, 18, 'rgba(0,0,0,.85)', '#fde047', 3);
  const cd = S.card[S.card.length - 1], rel = cd.s - cd.par;
  g.text(`${S.hole + 1}번 홀 완료`, 360, 200, 26, '#fde047');
  g.text(`${cd.s}타 (파 ${cd.par}) — ${NAMES[rel] || (rel > 0 ? '+' + rel : rel)}`, 360, 250, 24, rel < 0 ? '#86efac' : rel > 0 ? '#fca5a5' : '#fff');
  g.text(`누적 ${S.total > 0 ? '+' : ''}${S.total === 0 ? 'E' : S.total}`, 360, 300, 22, '#fff');
  g.text(S.hole >= 17 ? '클릭/Space: 라운드 종료' : '클릭/Space: 다음 홀 ▶', 360, 400, 18, '#a7f3d0');
}
