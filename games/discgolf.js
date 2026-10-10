'use strict';
let S;
const DG_DISCS = [
  { n: '드라이버', v: 520, fade: 1.1, col: '#e53935', acc: 1.4 },
  { n: '미드레인지', v: 400, fade: 0.6, col: '#fb8c00', acc: 1 },
  { n: '퍼터', v: 290, fade: 0.25, col: '#43a047', acc: 0.6 },
];
const DG_SHAPE = ['하이저 ↰', '플랫 ↑', '앤하이저 ↱'];
const DG_HOLES = 9;

GAME({
  title: '디스크 골프', w: 960, h: 600, bg: '#2e7d32', controls: 'dpad+ab', aLabel: '던지기', bLabel: '디스크',
  help: '마우스/←→ 조준 · Space/클릭 꾹 = 파워 게이지, 놓으면 던지기 (빨간 구간 = 흔들림)\n↑↓ 커브 선택 (하이저: 왼쪽으로 휨 · 앤하이저: 오른쪽으로 휨)\n1/2/3 또는 Shift/X: 드라이버·미드레인지·퍼터 (드라이버는 멀리 가지만 끝에 왼쪽으로 꺾임)\n🌲나무에 맞으면 떨어짐 · 💧물/OB = 1타 벌타 · 바람 방향 확인!\n바스켓에 천천히 날아가야 체인에 걸림 · 9홀 코스, 파보다 적게!',
  init(g) { S = { hole: 0, card: [], total: 0, msg: '', msgT: 0, t: 0 }; loadHole(g); },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    const H = S.H;
    if (S.phase === 'aim') aimInput(g, dt);
    else if (S.phase === 'fly') { for (let i = 0; i < 2; i++) if (S.phase === 'fly') fly(g, dt / 2); }
    else if (S.phase === 'done') { S.wait -= dt; if (S.wait <= 0 || (S.wait < 1.5 && (g.pressed('a') || g.mouse.clicked))) { S.hole++; if (S.hole >= DG_HOLES) return finish(g); loadHole(g); } }
    else if (S.phase === 'pen') { S.wait -= dt; if (S.wait <= 0) { S.phase = 'aim'; S.disc = { x: S.lie.x, y: S.lie.y }; autoDisc(); } }
    const rel = S.total - S.card.reduce((a, c) => a + c.par, 0);
    g.info = `${S.hole + 1}번 홀 · 파 ${H.par} · ${S.strokes}타 · 합계 ${rel > 0 ? '+' : ''}${rel}`;
  },
  draw(g, c) {
    const H = S.H;
    g.rect(0, 0, 960, 600, '#1b5e20');
    c.save(); c.translate(H.ox, H.oy); c.scale(H.z, H.z);
    c.fillStyle = '#388e3c';
    c.beginPath(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#4caf50'; c.lineWidth = 680; c.moveTo(H.pts[0][0], H.pts[0][1]); for (const p of H.pts) c.lineTo(p[0], p[1]); c.stroke();
    c.beginPath(); c.strokeStyle = '#66bb6a'; c.lineWidth = 170; c.moveTo(H.pts[0][0], H.pts[0][1]); for (const p of H.pts) c.lineTo(p[0], p[1]); c.stroke();
    c.restore();
    for (const w of H.water) { const [x, y] = W2S(w.x, w.y); g.circle(x, y, w.r * H.z, '#29b6f6'); g.ring(x, y, w.r * H.z, '#b3e5fc', 3); for (let i = 0; i < 3; i++) g.line(x - 20 + Math.sin(S.t + i) * 8, y - 10 + i * 10, x + 10 + Math.sin(S.t + i) * 8, y - 10 + i * 10, 'rgba(255,255,255,.4)', 2); }
    const [tx, ty] = W2S(H.tee.x, H.tee.y);
    g.rrect(tx - 18, ty - 12, 36, 24, 4, '#9e9e9e', '#616161', 2); g.text('티', tx, ty, 11, '#fff');
    const [bx, by] = W2S(H.bk.x, H.bk.y);
    g.ring(bx, by, 100 * H.z, 'rgba(255,255,255,.25)', 1.5);
    g.circle(bx + 3, by + 4, 12, 'rgba(0,0,0,.25)'); g.circle(bx, by, 12, '#cfd8dc'); g.ring(bx, by, 12, '#ffeb3b', 3); g.circle(bx, by, 4, '#455a64');
    g.line(bx, by - 30, bx, by - 6, '#455a64', 3); g.poly([[bx, by - 30], [bx + 16, by - 25], [bx, by - 20]], '#ff5252');
    for (const t of H.trees) { const [x, y] = W2S(t.x, t.y); g.circle(x + 4, y + 5, t.r * H.z, 'rgba(0,0,0,.25)'); g.emoji(t.e, x, y - 4, t.r * H.z * 2.6); }
    for (const p of S.trail) { const [x, y] = W2S(p[0], p[1]); g.circle(x, y, 2, 'rgba(255,255,255,.5)'); }
    if (S.phase === 'aim') drawAim(g, c);
    const D = S.disc;
    if (D) { const [x, y] = W2S(D.x, D.y); const hz = S.phase === 'fly' ? Math.sin(Math.min(1, S.ft / Math.max(0.5, S.fT)) * Math.PI) * 14 : 0; g.circle(x + hz * 0.4, y + hz * 0.6, 6, 'rgba(0,0,0,.35)'); g.circle(x, y - hz, 7 + hz * 0.15, DG_DISCS[S.dsel].col); g.ring(x, y - hz, 7 + hz * 0.15, '#fff', 1.5); }
    drawHUD(g, c);
    if (S.msgT > 0) g.text(S.msg, 480, 140, 34, S.msgC);
    if (S.phase === 'done') drawCard(g);
  },
});

function W2S(x, y) { const H = S.H; return [H.ox + x * H.z, H.oy + y * H.z]; }
function flash(m, c, t) { S.msg = m; S.msgC = c || '#fff'; S.msgT = t || 1.6; }
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; const t = l2 ? U.clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
function pathDist(H, x, y) { let m = 1e9; for (let i = 0; i < H.pts.length - 1; i++) m = Math.min(m, segDist(x, y, H.pts[i][0], H.pts[i][1], H.pts[i + 1][0], H.pts[i + 1][1])); return m; }

function loadHole(g) {
  const i = S.hole, r = rng(i * 7 + 3);
  const pars = [3, 3, 4, 3, 4, 5, 3, 4, 5], par = pars[i];
  const len = par === 3 ? 420 + r() * 180 : par === 4 ? 720 + r() * 180 : 1050 + r() * 200;
  const bend = (r() - 0.5) * 1.4 * (par > 3 ? 1 : 0.5);
  const segs = par === 5 ? 3 : 2;
  const pts = [[0, 0]]; let ang = (r() - 0.5) * 0.6, x = 0, y = 0;
  for (let k = 0; k < segs; k++) { x += Math.cos(ang) * len / segs; y += Math.sin(ang) * len / segs; pts.push([x, y]); ang += bend * (k % 2 ? -0.6 : 1); }
  const minX = Math.min(...pts.map((p) => p[0])) - 160, maxX = Math.max(...pts.map((p) => p[0])) + 160;
  const minY = Math.min(...pts.map((p) => p[1])) - 160, maxY = Math.max(...pts.map((p) => p[1])) + 160;
  const z = Math.min(900 / (maxX - minX), 470 / (maxY - minY), 1.25);
  const H = { par, pts, z, ox: 480 - ((minX + maxX) / 2) * z, oy: 330 - ((minY + maxY) / 2) * z, tee: { x: 0, y: 0 }, bk: { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] }, trees: [], water: [], wind: { x: (r() - 0.5) * (30 + i * 8), y: (r() - 0.5) * (30 + i * 8) } };
  const nT = 18 + i * 4;
  for (let k = 0; k < nT * 3 && H.trees.length < nT; k++) {
    const tx = minX + r() * (maxX - minX), ty = minY + r() * (maxY - minY), d = pathDist(H, tx, ty);
    const inFair = d < 85;
    if (Math.hypot(tx, ty) < 70 || Math.hypot(tx - H.bk.x, ty - H.bk.y) < 60) continue;
    if (inFair && r() > 0.25 + i * 0.03) continue;
    if (d > 330) continue;
    H.trees.push({ x: tx, y: ty, r: 13 + r() * 9, e: r() < 0.7 ? '🌳' : '🌲' });
  }
  if (i % 3 !== 0) { const k = 0.35 + r() * 0.3, seg = Math.floor(k * (pts.length - 1)); const f = k * (pts.length - 1) - seg; const a = pts[seg], b = pts[Math.min(seg + 1, pts.length - 1)]; H.water.push({ x: U.lerp(a[0], b[0], f) + (r() - 0.5) * 90, y: U.lerp(a[1], b[1], f) + (r() - 0.5) * 90, r: 45 + r() * 35 }); }
  if (i >= 5) H.water.push({ x: H.bk.x + (r() - 0.5) * 220, y: H.bk.y + (r() < 0.5 ? -1 : 1) * (110 + r() * 40), r: 50 });
  H.trees = H.trees.filter((t) => !H.water.some((w) => Math.hypot(t.x - w.x, t.y - w.y) < w.r + t.r));
  S.H = H; S.strokes = 0; S.lie = { x: 0, y: 0 }; S.disc = { x: 0, y: 0 }; S.trail = []; S.phase = 'aim'; S.pow = 0; S.charging = false; S.shape = 1;
  S.aim = Math.atan2(pts[1][1], pts[1][0]); S.dsel = 0; autoDisc();
  flash(`${i + 1}번 홀 · 파 ${par} · ${Math.round(len / 8)}m`, '#fff', 2);
}
function autoDisc() { const d = Math.hypot(S.H.bk.x - S.lie.x, S.H.bk.y - S.lie.y); S.dsel = d < 170 ? 2 : d < 330 ? 1 : 0; if (d < 330) S.aim = Math.atan2(S.H.bk.y - S.lie.y, S.H.bk.x - S.lie.x); S.preview = null; }

function aimInput(g, dt) {
  const m = g.mouse;
  if (m.moved && !S.charging) { const [x, y] = W2S(S.lie.x, S.lie.y); if (U.dist(m.x, m.y, x, y) > 20 && m.y > 70 && m.y < 540) S.aim = Math.atan2(m.y - y, m.x - x); S.preview = null; }
  if (g.left) { S.aim -= 1.1 * dt; S.preview = null; } if (g.right) { S.aim += 1.1 * dt; S.preview = null; }
  if (g.pressed('up')) { S.shape = Math.max(0, S.shape - 1); S.preview = null; g.sfx.click(); }
  if (g.pressed('down')) { S.shape = Math.min(2, S.shape + 1); S.preview = null; g.sfx.click(); }
  for (let k = 0; k < 3; k++) if (g.keyp('Digit' + (k + 1))) { S.dsel = k; S.preview = null; g.sfx.click(); }
  if (g.pressed('b')) { S.dsel = (S.dsel + 1) % 3; S.preview = null; g.sfx.click(); }
  for (let k = 0; k < 3; k++) if (g.clickIn(20 + k * 92, 548, 86, 40)) { S.dsel = k; S.preview = null; g.sfx.click(); return; }
  if (g.clickIn(300, 548, 110, 40)) { S.shape = (S.shape + 1) % 3; S.preview = null; g.sfx.click(); return; }
  if ((g.pressed('a') || (m.clicked && m.y < 540)) && !S.charging) { S.charging = true; S.pow = 0; S.powDir = 1; }
  if (S.charging) {
    S.pow += S.powDir * dt * 0.95;
    if (S.pow >= 1.08) { S.pow = 1.08; S.powDir = -1; } if (S.pow <= 0) { S.pow = 0; S.powDir = 1; }
    if (!g.held('a') && !m.down) { S.charging = false; throwDisc(g); }
  }
}
function mkFlight(x, y, ang, pow, dsel, shape) { const d = DG_DISCS[dsel], v0 = Math.max(60, d.v * Math.min(1, pow)); return { x, y, vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0, v0, d, shape: shape - 1 }; }
function flightStep(f, dt, wind) {
  const v = Math.hypot(f.vx, f.vy); if (v < 1) return 0;
  const r = v / f.v0;
  const lat = f.shape * 110 * r * (f.shape < 0 ? 1 : 1) - f.d.fade * 150 * (1 - r) * (1 - r);
  const rot = (lat / v) * dt;
  const c = Math.cos(rot), s = Math.sin(rot); const nvx = f.vx * c - f.vy * s, nvy = f.vx * s + f.vy * c;
  const ns = Math.max(0, v - (60 + 0.9 * v) * dt);
  f.vx = nvx / v * ns; f.vy = nvy / v * ns;
  f.x += f.vx * dt + (wind ? wind.x * dt * r : 0); f.y += f.vy * dt + (wind ? wind.y * dt * r : 0);
  return ns;
}
function throwDisc(g) {
  let pow = S.pow, ang = S.aim;
  const d = DG_DISCS[S.dsel];
  if (pow > 1) { ang += U.rand(-0.18, 0.18) * d.acc; pow = 1; flash('흔들렸다!', '#ffab91', 1); }
  ang += U.rand(-0.015, 0.015) * d.acc;
  S.F = mkFlight(S.lie.x, S.lie.y, ang, pow, S.dsel, S.shape);
  S.strokes++; S.phase = 'fly'; S.ft = 0; S.fT = 0.6 + pow * 2; S.trail = []; S.prevLie = { x: S.lie.x, y: S.lie.y }; S.hitTree = 0;
  S.ignore = S.H.trees.filter((t) => Math.hypot(S.lie.x - t.x, S.lie.y - t.y) < t.r + 12);
  g.sfx.tone(500, 0.2, 'sine', 0.06, 900);
}
function fly(g, dt) {
  const F = S.F, H = S.H;
  S.ft += dt;
  const v = flightStep(F, dt, H.wind);
  S.disc = { x: F.x, y: F.y };
  if (Math.floor(S.ft * 30) !== Math.floor((S.ft - dt) * 30)) S.trail.push([F.x, F.y]);
  for (const t of H.trees) {
    if (S.ignore.includes(t)) continue;
    if (Math.hypot(F.x - t.x, F.y - t.y) < t.r + 4 && S.hitTree <= 0) {
      const a = Math.atan2(F.y - t.y, F.x - t.x) + U.rand(-0.8, 0.8); const sp = Math.hypot(F.vx, F.vy) * 0.18;
      F.vx = Math.cos(a) * sp; F.vy = Math.sin(a) * sp; F.v0 = Math.max(F.v0 * 0.3, 1); S.hitTree = 0.2;
      g.sfx.tone(110, 0.12, 'square', 0.1); g.burst(...W2S(F.x, F.y), ['#2e7d32', '#81c784', '#795548'], 10, 120, 0.5); g.shake(3, 0.12); flash('나무 맞음!', '#ffcc80', 0.9);
    }
  }
  S.hitTree -= dt;
  const db = Math.hypot(F.x - H.bk.x, F.y - H.bk.y);
  if (db < 15) {
    if (v < 270) return holed(g);
    const a = U.rand(0, Math.PI * 2); F.vx = Math.cos(a) * 30; F.vy = Math.sin(a) * 30; F.v0 = 40; F.x = H.bk.x + Math.cos(a) * 18; F.y = H.bk.y + Math.sin(a) * 18;
    g.sfx.tone(900, 0.2, 'triangle', 0.08); flash('체인 아웃! 너무 빨라', '#ffcc80', 1.2);
  }
  if (v < 8) land(g);
}
function land(g) {
  const H = S.H, F = S.F;
  const inWater = H.water.some((w) => Math.hypot(F.x - w.x, F.y - w.y) < w.r);
  const ob = pathDist(H, F.x, F.y) > 360;
  if (inWater || ob) {
    S.strokes++; S.phase = 'pen'; S.wait = 1.3; S.lie = S.prevLie;
    flash(inWater ? '풍덩! 💧 +1 벌타' : 'OB! +1 벌타', '#4fc3f7', 1.3); g.sfx[inWater ? 'drop' : 'hit']();
    if (inWater) g.burst(...W2S(F.x, F.y), ['#29b6f6', '#fff'], 20, 150, 0.6);
    return;
  }
  S.lie = { x: F.x, y: F.y }; S.phase = 'aim';
  const d = Math.hypot(F.x - H.bk.x, F.y - H.bk.y);
  if (d < 26) { S.strokes++; flash('탭 인!', '#fff'); return holed(g, true); }
  g.sfx.drop(); autoDisc();
  flash(`남은 거리 ${Math.round(d / 8)}m`, '#fff', 1);
}
function holed(g, tap) {
  const H = S.H, diff = S.strokes - H.par;
  const names = { '-3': '알바트로스!', '-2': '이글!', '-1': '버디!', 0: '파', 1: '보기', 2: '더블 보기', 3: '트리플 보기' };
  const nm = S.strokes === 1 ? '홀인원!!! 🎯' : names[diff] || `+${diff}`;
  if (!tap) { g.sfx.tone(1400, 0.4, 'triangle', 0.06); g.sfx.tone(1700, 0.4, 'triangle', 0.05, null, 0.05); }
  g.later(() => g.sfx[diff <= 0 ? 'win' : 'coin'](), 0.3);
  g.burst(...W2S(H.bk.x, H.bk.y), ['#ffeb3b', '#fff', '#ff5252'], diff < 0 ? 50 : 20, 260, 0.9);
  S.disc = { x: H.bk.x, y: H.bk.y };
  const pts = Math.max(0, (H.par - S.strokes + 3) * 100) + (S.strokes === 1 ? 2000 : 0);
  g.add(pts);
  S.card.push({ par: H.par, s: S.strokes }); S.total += S.strokes;
  flash(nm, diff < 0 ? '#ffeb3b' : '#fff', 2.5);
  S.phase = 'done'; S.wait = 3.5;
}
function finish(g) {
  const par = S.card.reduce((a, c) => a + c.par, 0), rel = S.total - par;
  if (rel <= 0) g.add(1000 - rel * 200);
  g.win(`9홀 ${S.total}타 (${rel > 0 ? '+' : ''}${rel}) 🥏`);
}

function drawAim(g, c) {
  const [x, y] = W2S(S.lie.x, S.lie.y), H = S.H;
  if (!S.preview) {
    const f = mkFlight(S.lie.x, S.lie.y, S.aim, 1, S.dsel, S.shape), pts = [];
    for (let i = 0; i < 400; i++) { if (flightStep(f, 1 / 60, null) < 8) break; if (i % 3 === 0) pts.push([f.x, f.y]); }
    S.preview = pts;
  }
  c.setLineDash([4, 8]); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y);
  for (const p of S.preview) { const q = W2S(p[0], p[1]); c.lineTo(q[0], q[1]); } c.stroke(); c.setLineDash([]);
  if (S.charging) {
    const k = Math.floor(Math.min(1, S.pow) * S.preview.length * 0.85);
    const p = S.preview[Math.max(0, Math.min(S.preview.length - 1, k))]; if (p) { const q = W2S(p[0], p[1]); g.ring(q[0], q[1], 8, '#ffeb3b', 2); }
  }
  g.emoji('🧍', x - 12, y - 10, 26);
  g.line(x, y, x + Math.cos(S.aim) * 40, y + Math.sin(S.aim) * 40, '#fff', 3);
  void H;
}
function drawHUD(g, c) {
  const H = S.H;
  g.rrect(10, 8, 330, 58, 10, 'rgba(0,0,0,.5)');
  g.text(`${S.hole + 1}번 홀 · 파 ${H.par}`, 22, 26, 18, '#fff', 'left');
  g.text(`${S.strokes}타`, 330, 26, 18, '#ffeb3b', 'right');
  const d = Math.hypot(H.bk.x - S.lie.x, H.bk.y - S.lie.y);
  g.text(`바스켓까지 ${Math.round(d / 8)}m`, 22, 50, 14, '#b3e5fc', 'left');
  const rel = S.total - S.card.reduce((a, cc) => a + cc.par, 0);
  g.text(`합계 ${rel > 0 ? '+' : ''}${rel}`, 330, 50, 14, '#fff', 'right');
  g.rrect(860, 8, 90, 90, 10, 'rgba(0,0,0,.5)');
  g.text('바람', 905, 22, 12, '#fff');
  const wm = Math.hypot(H.wind.x, H.wind.y), wa = Math.atan2(H.wind.y, H.wind.x);
  c.save(); c.translate(905, 58); c.rotate(wa); g.line(-22, 0, 22, 0, '#4fc3f7', 4); g.poly([[24, 0], [12, -8], [12, 8]], '#4fc3f7'); c.restore();
  g.text(`${(wm / 10).toFixed(1)} m/s`, 905, 90, 12, '#fff');
  for (let k = 0; k < 3; k++) { const dd = DG_DISCS[k]; g.rrect(20 + k * 92, 548, 86, 40, 8, S.dsel === k ? dd.col : 'rgba(0,0,0,.45)', '#fff', S.dsel === k ? 2 : 1); g.text(`${k + 1} ${dd.n}`, 63 + k * 92, 568, 13, '#fff'); }
  g.rrect(300, 548, 110, 40, 8, 'rgba(0,0,0,.45)', '#fff', 1); g.text(DG_SHAPE[S.shape], 355, 568, 14, '#fff');
  if (S.phase === 'aim') {
    g.rrect(440, 552, 300, 32, 8, 'rgba(0,0,0,.5)');
    g.rect(450, 560, 260, 16, '#37474f'); g.rect(450 + 260 * 0.926, 560, 260 * 0.074, 16, '#c62828');
    g.rect(450, 560, 260 * Math.min(1.08, S.pow) / 1.08, 16, S.pow > 1 ? '#ff5252' : '#ffeb3b');
    g.text('파워', 725, 568, 13, '#fff', 'left');
  }
  for (let i = 0; i < DG_HOLES; i++) { const cc = S.card[i], x = 520 + i * 34; g.rrect(x - 15, 12, 30, 40, 5, i === S.hole ? 'rgba(255,235,59,.35)' : 'rgba(0,0,0,.4)'); g.text(String(i + 1), x, 22, 10, '#ccc'); if (cc) { const df = cc.s - cc.par; g.text(String(cc.s), x, 40, 15, df < 0 ? '#ffeb3b' : df === 0 ? '#fff' : '#ff8a80'); } }
}
function drawCard(g) {
  const cc = S.card[S.card.length - 1];
  g.rrect(330, 230, 300, 130, 14, 'rgba(0,0,0,.7)', '#fff', 2);
  g.text(`${S.hole + 1}번 홀 완료`, 480, 260, 22, '#fff');
  g.text(`${cc.s}타 / 파 ${cc.par}`, 480, 300, 28, cc.s < cc.par ? '#ffeb3b' : '#fff');
  g.text(S.hole + 1 >= DG_HOLES ? '클릭: 결과 보기' : '클릭: 다음 홀', 480, 338, 14, '#b0bec5');
}
