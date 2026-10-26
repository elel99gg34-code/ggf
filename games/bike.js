'use strict';
let S;
const VW = 960, VH = 560, GR = 1100, TIME = 75;
const PARKS = [
  { n: '동네 흙길 공원', target: 8000, sky: ['#7dd3fc', '#fef9c3'], dirt: '#a16207', top: '#ca8a04', f: ['kicker', 'flat', 'funbox', 'kicker', 'rail', 'kicker', 'drop'] },
  { n: '도심 스케이트파크', target: 18000, sky: ['#fb923c', '#fde68a'], dirt: '#6b7280', top: '#d1d5db', f: ['kicker', 'rail', 'funbox', 'bigkicker', 'rail', 'drop', 'kicker', 'bigkicker'] },
  { n: 'X게임 메가램프', target: 30000, sky: ['#312e81', '#db2777'], dirt: '#1f2937', top: '#f472b6', f: ['bigkicker', 'rail', 'mega', 'kicker', 'funbox', 'rail', 'mega', 'bigkicker'] },
];
const TRICKS = {
  none: { n: '테일휩', t: 0.45, p: 300, key: 'b' },
  up: { n: '슈퍼맨', t: 0.6, p: 450 },
  down: { n: '노핸더', t: 0.5, p: 350 },
  side: { n: '바스핀', t: 0.5, p: 400 },
};
GAME({
  title: 'BMX 스턴트', w: VW, h: VH, bg: '#7dd3fc', controls: 'dpad+ab', aLabel: '점프', bLabel: '트릭',
  help: '↑ 페달(가속) · ↓ 브레이크 · Space 점프(램프 끝에서 누르면 팝!)\n공중: ←→ 회전(백플립/프론트플립) · Shift/X 트릭 (방향키와 함께 = 다른 트릭)\nX 테일휩 · ↑+X 슈퍼맨 · ↓+X 노핸더 · ←/→+X 바스핀\n레일 위에 착지하면 그라인드! · 트릭 도중 착지 = 크래시\n바퀴가 경사와 맞게 착지해야 성공 · 연속 착지로 콤보 배수 UP\n75초 안에 목표 점수 달성 → 다음 공원',
  init(g) { S = { park: 0, total: 0 }; loadPark(g); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.end) { S.end -= dt; if (S.end <= 0) endPark(g); return; }
    if (S.ready > 0) { S.ready -= dt; return; }
    S.time -= dt;
    if (S.time <= 0) { S.time = 0; bank(g); S.end = 2.5; g.sfx.beep(220, 0.4); return; }
    const P = S.p;
    if (P.crash > 0) {
      P.crash -= dt; P.sp *= Math.pow(0.3, dt);
      if (P.crash <= 0) { P.state = 'ground'; P.rot = slopeAt(P.x); }
      P.x += P.sp * dt; P.y = groundY(P.x); camera(dt); return;
    }
    if (P.state === 'ground') ground(g, dt);
    else if (P.state === 'air') air(g, dt);
    else if (P.state === 'grind') grind(g, dt);
    // 콤보 유지 시간
    if (S.combo.n > 0 && P.state === 'ground') { S.combo.t -= dt; if (S.combo.t <= 0) bank(g); }
    if (P.x > S.endX) { P.x = 50; P.y = groundY(50); S.laps++; flash('🔁 코스 한 바퀴! +500', '#22c55e'); g.add(500); S.parkScore += 500; }
    camera(dt);
    g.info = `${PARKS[S.park].n} · ⏱ ${Math.ceil(S.time)}s · ${S.parkScore}/${PARKS[S.park].target}`;
  },
  draw(g, c) {
    const pk = PARKS[S.park];
    const sky = c.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, pk.sky[0]); sky.addColorStop(1, pk.sky[1]);
    c.fillStyle = sky; c.fillRect(0, 0, VW, VH);
    // 배경 건물
    for (let i = 0; i < 14; i++) { const w = 90, x = ((i * 130 - S.cx * 0.25) % (14 * 130) + 14 * 130) % (14 * 130) - 130, h = 80 + ((i * 53) % 120); g.rect(x, VH * 0.62 - h, w, h + 200, S.park === 2 ? 'rgba(30,27,75,.6)' : 'rgba(255,255,255,.28)'); }
    c.save(); c.translate(-S.cx + VW * 0.35, -S.cy + VH * 0.6);
    const x0 = S.cx - VW * 0.35 - 40, x1 = S.cx + VW * 0.65 + 40;
    let i0 = Math.max(0, idxAt(x0) - 1), i = i0;
    c.beginPath(); c.moveTo(S.ter[i0][0], S.cy + VH);
    for (; i < S.ter.length && S.ter[Math.max(0, i - 1)][0] < x1; i++) c.lineTo(S.ter[i][0], S.ter[i][1]);
    c.lineTo(S.ter[i - 1][0], S.cy + VH); c.closePath(); c.fillStyle = pk.dirt; c.fill();
    c.strokeStyle = pk.top; c.lineWidth = 6; c.beginPath();
    for (let j = i0; j < i; j++) j === i0 ? c.moveTo(S.ter[j][0], S.ter[j][1]) : c.lineTo(S.ter[j][0], S.ter[j][1]);
    c.stroke();
    for (const r of S.rails) if (r.x1 > x0 && r.x0 < x1) { g.line(r.x0, r.y, r.x1, r.y, '#e5e7eb', 6); g.line(r.x0, r.y + 3, r.x1, r.y + 3, '#64748b', 2); for (let x = r.x0 + 20; x < r.x1; x += 80) g.line(x, r.y, x, groundY(x), '#94a3b8', 4); }
    for (const s of S.signs) if (s.x > x0 && s.x < x1) g.emoji(s.e, s.x, groundY(s.x) - 20, 28);
    for (const f of S.fans) if (f.x > x0 && f.x < x1) g.emoji(f.e, f.x, groundY(f.x) - 14 - (S.p.state === 'air' ? Math.abs(Math.sin(g.time * 10 + f.x)) * 8 : 0), 24);
    drawRider(g, c);
    c.restore();
    // HUD
    g.rrect(12, 12, 250, 86, 14, 'rgba(0,0,0,.5)');
    g.text(pk.n, 137, 32, 15, '#fde047');
    g.text(`${S.parkScore.toLocaleString()} / ${pk.target.toLocaleString()}`, 137, 62, 22, S.parkScore >= pk.target ? '#22c55e' : '#fff');
    g.rect(30, 84, 214, 6, '#334155'); g.rect(30, 84, 214 * Math.min(1, S.parkScore / pk.target), 6, '#22c55e');
    g.rrect(VW - 142, 12, 130, 60, 14, 'rgba(0,0,0,.5)'); g.text(`⏱ ${Math.ceil(S.time)}`, VW - 77, 42, 28, S.time < 10 ? '#ef4444' : '#fff');
    if (S.combo.n > 0) {
      g.text(`${S.combo.names.slice(-4).join(' + ')}`, VW / 2, 34, 18, '#fff');
      g.text(`${S.combo.pts} × ${S.combo.n}`, VW / 2, 66, 30, '#fde047');
      if (S.p.state === 'ground') { g.rect(VW / 2 - 60, 88, 120, 6, '#334155'); g.rect(VW / 2 - 60, 88, 120 * S.combo.t / 2, 6, '#f472b6'); }
    }
    if (S.p.state === 'air') { const deg = Math.round((S.p.spin * 180) / Math.PI); if (Math.abs(deg) > 60) g.text(`${Math.abs(deg)}°`, VW * 0.35, 130, 22, '#e0f2fe'); }
    if (S.p.trick) g.text(TRICKS[S.p.trick.k].n + '!', VW * 0.35, 160, 24, '#f472b6');
    if (S.p.state === 'grind') g.text('그라인드! ' + Math.round(S.p.gpts), VW * 0.35, 160, 24, '#22d3ee');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 130, 26, S.msgC); c.globalAlpha = 1; }
    g.rrect(12, VH - 46, 150, 34, 10, 'rgba(0,0,0,.4)'); g.text(Math.round(S.p.sp * 0.1) + ' km/h', 87, VH - 29, 16, '#fff');
    if (S.ready > 0) { g.text(pk.n, VW / 2, VH / 2 - 40, 40, '#fff'); g.text(`목표 ${pk.target.toLocaleString()}점 · 75초`, VW / 2, VH / 2 + 10, 22, '#fde047'); }
    if (S.end) { g.rrect(VW / 2 - 210, VH / 2 - 90, 420, 170, 18, 'rgba(0,0,0,.75)', '#fde047', 3); g.text('⏱ 타임업!', VW / 2, VH / 2 - 50, 32, '#fde047'); g.text(`공원 점수 ${S.parkScore.toLocaleString()} / ${pk.target.toLocaleString()}`, VW / 2, VH / 2, 20, '#fff'); g.text(S.parkScore >= pk.target ? '✅ 목표 달성! 다음 공원으로' : '❌ 목표 미달', VW / 2, VH / 2 + 44, 20, S.parkScore >= pk.target ? '#22c55e' : '#ef4444'); }
  },
});
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function loadPark(g) {
  const pk = PARKS[S.park], R = rng(500 + S.park * 7);
  const pts = []; let x = -300, y = 300;
  const add = (dx, dy) => { x += dx; y += dy; pts.push([x, y]); };
  const curve = (len, h, n, ease) => { const sx = x, sy = y; for (let k = 1; k <= n; k++) { const t = k / n; pts.push([sx + len * t, sy - h * ease(t)]); } x = sx + len; y = sy - h; };
  pts.push([x, y]); add(500, 0);
  S.rails = []; S.signs = []; S.fans = [];
  for (let rep = 0; rep < 4; rep++) for (const f of pk.f) {
    if (f === 'flat') add(250 + R() * 150, 0);
    if (f === 'kicker' || f === 'bigkicker' || f === 'mega') {
      const big = f === 'bigkicker' ? 1.5 : f === 'mega' ? 2.4 : 1, h = 55 * big, gap = 200 * big + R() * 60;
      if (f === 'mega') { curve(220, -140, 10, (t) => t * t); add(80, 0); }
      add(150, 0); S.signs.push({ x: x - 40, e: big > 2 ? '🔥' : '⚠️' });
      curve(130 * Math.sqrt(big), h, 8, (t) => t * t);
      add(0.1, 0); add(30, h + 40); add(gap - 60, 0); add(30, -40);
      curve(170 * Math.sqrt(big), -h, 8, (t) => t);
      add(200, 0);
      if (f === 'mega') { curve(240, 140, 10, (t) => t * t * (3 - 2 * t)); add(100, 0); }
      for (let k = 0; k < 3; k++) S.fans.push({ x: x - gap - 100 + k * 30, e: U.choice(['🙋', '🙋‍♂️', '📸', '🤩', '👏']) });
    }
    if (f === 'funbox') { add(100, 0); curve(120, 60, 6, (t) => t); add(220, 0); curve(140, -60, 6, (t) => t); add(150, 0); }
    if (f === 'rail') { add(80, 0); curve(70, 28, 4, (t) => t * t); add(0.1, 0); add(20, 28); const rx = x + 40, ry = y - 64; S.rails.push({ x0: rx, x1: rx + 320 + R() * 120, y: ry }); add(500, 0); }
    if (f === 'drop') { add(100, 0); curve(100, 70, 5, (t) => t); add(160, 0); add(0.1, 0); add(30, 110); add(300, -40); }
  }
  add(400, 0); S.endX = x - 200; add(1000, 0);
  S.ter = pts;
  S.p = { x: 50, y: 0, sp: 120, vx: 0, vy: 0, rot: 0, spin: 0, state: 'ground', trick: null, tricks: [], crash: 0, air: 0, gpts: 0, rail: null, wheel: 0 };
  S.p.y = groundY(50);
  S.combo = { pts: 0, n: 0, t: 0, names: [] };
  Object.assign(S, { time: TIME, parkScore: 0, ready: 1.5, end: 0, cx: 50, cy: S.p.y, msg: '', msgT: 0, laps: 0 });
}
function idxAt(x) { let lo = 0, hi = S.ter.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (S.ter[m][0] < x) lo = m + 1; else hi = m; } return lo; }
function groundY(x) { const i = Math.max(1, idxAt(x)); const a = S.ter[i - 1], b = S.ter[i]; if (!b || b[0] - a[0] < 0.01) return b ? Math.max(a[1], b[1]) : a[1]; return U.lerp(a[1], b[1], U.clamp((x - a[0]) / (b[0] - a[0]), 0, 1)); }
function slopeAt(x) { return Math.atan2(groundY(x + 6) - groundY(x - 6), 12); }
function ground(g, dt) {
  const P = S.p, sl = slopeAt(P.x);
  if (g.up) P.sp += 300 * dt; if (g.down) P.sp -= 400 * dt;
  P.sp += GR * Math.sin(sl) * dt * 0.9;
  P.sp -= P.sp * 0.25 * dt;
  P.sp = U.clamp(P.sp, 40, 720);
  const nx = P.x + Math.cos(sl) * P.sp * dt;
  const ny = groundY(nx), sl2 = slopeAt(nx);
  P.wheel += P.sp * dt / 14;
  // 립에서 이륙
  if (sl2 - sl > 0.35 && P.sp > 150 || ny - P.y > 18) {
    takeoff(g, sl, g.pressed('a') || g.a ? 1 : 0);
    return;
  }
  P.x = nx; P.y = ny; P.rot = U.lerp(P.rot, sl2, Math.min(1, dt * 20));
  if (g.pressed('a')) takeoff(g, sl, 0.7);
  if (g.up && g.frame % 12 === 0) g.sfx.tone(180, 0.04, 'triangle', 0.02);
}
function takeoff(g, sl, pop) {
  const P = S.p;
  P.state = 'air'; P.vx = Math.cos(sl) * P.sp; P.vy = Math.sin(sl) * P.sp - 300 * pop;
  P.spin = 0; P.air = 0; P.tricks = []; P.trick = null; P.rot = sl;
  if (pop) { g.sfx.jump(); if (pop >= 1 && sl < -0.3) flash('팝!', '#fde047'); }
}
function air(g, dt) {
  const P = S.p;
  P.air += dt;
  P.vy += GR * 0.8 * dt;
  const oy = P.y;
  P.x += P.vx * dt; P.y += P.vy * dt;
  const rs = ((g.right ? 1 : 0) - (g.left ? 1 : 0)) * 6.5;
  P.rot += rs * dt; P.spin += rs * dt;
  // 트릭
  if (P.trick) { P.trick.t -= dt; if (P.trick.t <= 0) { const T = TRICKS[P.trick.k]; P.tricks.push(T.n); addCombo(g, T.n, T.p); P.trick = null; g.sfx.coin(); } }
  else if (g.pressed('b')) { const k = g.up ? 'up' : g.down ? 'down' : (g.left || g.right) ? 'side' : 'none'; P.trick = { k, t: TRICKS[k].t, max: TRICKS[k].t }; g.sfx.tone(700, 0.08, 'square', 0.04); }
  // 레일
  for (const r of S.rails) if (P.vy > 0 && P.x > r.x0 && P.x < r.x1 && oy <= r.y && P.y >= r.y) {
    if (P.trick) return doCrash(g, '트릭 중 레일 착지!');
    P.state = 'grind'; P.rail = r; P.y = r.y; P.gpts = 0; P.sp = Math.max(200, P.vx); finishAir(g, false); g.sfx.tone(1200, 0.2, 'sawtooth', 0.03); return;
  }
  const gy = groundY(P.x);
  if (P.y >= gy) {
    P.y = gy;
    const sl = slopeAt(P.x);
    let d = P.rot - sl; d = ((d % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    if (P.trick && P.air > 0.12) { if (P.trick.t < P.trick.max * 0.3) { const T = TRICKS[P.trick.k]; addCombo(g, T.n + '(아슬)', Math.round(T.p * 0.6)); P.trick = null; } else return doCrash(g, '트릭 도중 착지!'); }
    P.trick = null;
    if (Math.abs(d) > 0.75 && P.air > 0.15) return doCrash(g, '착지 실패!');
    P.state = 'ground'; P.rot = sl;
    P.sp = Math.max(80, P.vx * Math.cos(sl) + P.vy * Math.sin(sl));
    finishAir(g, Math.abs(d) < 0.15);
    if (P.air > 0.4) { g.sfx.drop(); g.shake(3, 0.1); const p = scr(P.x, P.y); g.burst(p[0], p[1], ['#a16207', '#fde68a'], 10, 140, 0.4, 4); }
  }
}
function finishAir(g, perfect) {
  const P = S.p;
  const flips = Math.floor(Math.abs(P.spin) / (Math.PI * 2) + 0.12);
  if (flips > 0) { const n = (P.spin < 0 ? '백플립' : '프론트플립') + (flips > 1 ? ` x${flips}` : ''); addCombo(g, n, 800 * flips * flips); }
  if (P.air > 0.9 && !flips && !P.tricks.length) addCombo(g, '빅 에어', 200);
  if (perfect && S.combo.n > 0) { S.combo.pts = Math.round(S.combo.pts * 1.25); flash('✨ 퍼펙트 랜딩!', '#22d3ee'); }
  if (S.combo.n > 0) S.combo.t = 2;
}
function grind(g, dt) {
  const P = S.p, r = P.rail;
  P.x += P.sp * dt; P.sp = Math.max(150, P.sp - 40 * dt); P.rot = 0;
  P.gpts += dt * 400;
  if (g.frame % 3 === 0) { const p = scr(P.x, P.y); g.burst(p[0], p[1], ['#fde047', '#f97316'], 2, 120, 0.25, 3); }
  if (P.x > r.x1 || g.pressed('a')) {
    addCombo(g, '그라인드', Math.round(P.gpts));
    P.state = 'air'; P.vx = P.sp; P.vy = g.pressed('a') ? -330 : -80; P.spin = 0; P.air = 0; P.tricks = []; P.rail = null;
  }
}
function addCombo(g, name, pts) {
  S.combo.pts += pts; S.combo.n++; S.combo.names.push(name); S.combo.t = 2;
  const p = scr(S.p.x, S.p.y - 60); g.float(p[0], p[1], `${name} +${pts}`, '#fde047', 20);
}
function bank(g) {
  const C = S.combo;
  if (C.n > 0) {
    const v = C.pts * C.n;
    S.parkScore += v; g.add(v);
    if (C.n >= 3) { flash(`🔥 ${C.n}연속 콤보! +${v.toLocaleString()}`, '#f472b6'); g.sfx.power(); } else g.sfx.coin();
  }
  S.combo = { pts: 0, n: 0, t: 0, names: [] };
}
function doCrash(g, why) {
  const P = S.p;
  P.state = 'crash'; P.crash = 1.4; P.trick = null; P.y = groundY(P.x); P.sp = Math.max(60, Math.abs(P.vx) * 0.4);
  if (S.combo.n > 0) flash(`💥 ${why} 콤보 ${S.combo.pts * S.combo.n} 소멸`, '#ef4444'); else flash(`💥 ${why}`, '#ef4444');
  S.combo = { pts: 0, n: 0, t: 0, names: [] };
  g.sfx.hit(); g.shake(8, 0.3);
  const p = scr(P.x, P.y); g.burst(p[0], p[1], ['#ef4444', '#a16207', '#fff'], 20, 260, 0.6, 4);
}
function endPark(g) {
  const pk = PARKS[S.park];
  S.total += S.parkScore;
  if (S.parkScore < pk.target) return g.over(`${pk.n}: ${S.parkScore.toLocaleString()}점 (목표 ${pk.target.toLocaleString()})`);
  g.add(Math.round(S.time) * 10 + 1000);
  S.park++;
  if (S.park >= PARKS.length) return g.win('🏆 BMX 레전드!');
  loadPark(g);
}
function camera(dt) { const P = S.p; S.cx = U.lerp(S.cx, P.x + 80, Math.min(1, dt * 5)); S.cy = U.lerp(S.cy, P.y, Math.min(1, dt * 3)); }
function scr(x, y) { return [x - S.cx + VW * 0.35, y - S.cy + VH * 0.6]; }
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 1.8; }
function drawRider(g, c) {
  const P = S.p;
  c.save(); c.translate(P.x, P.y);
  if (P.state === 'crash') { c.rotate(Math.sin(P.crash * 12) * 0.5 + 1.2); }
  else c.rotate(P.rot);
  c.translate(0, -14);
  const tk = P.trick ? P.trick.k : null, ph = P.trick ? 1 - P.trick.t / P.trick.max : 0, sw = Math.sin(ph * Math.PI);
  // 바퀴
  for (const wx of [-20, 20]) { g.circle(wx, 0, 13, '#111827'); g.ring(wx, 0, 10, '#9ca3af', 1.5); c.save(); c.translate(wx, 0); c.rotate(P.wheel); g.line(-10, 0, 10, 0, '#9ca3af', 1); g.line(0, -10, 0, 10, '#9ca3af', 1); c.restore(); }
  // 프레임 (테일휩이면 회전)
  c.save();
  if (tk === 'none') { c.scale(Math.cos(ph * Math.PI * 2), 1); }
  g.line(-20, 0, -2, -16, '#ef4444', 4); g.line(-2, -16, 16, -16, '#ef4444', 4); g.line(-20, 0, 2, 0, '#ef4444', 4); g.line(2, 0, -2, -16, '#ef4444', 4); g.line(16, -16, 20, 0, '#d1d5db', 3);
  g.line(16, -16, 14, -26, '#d1d5db', 3); g.line(10, -26, 18, -26, '#111', 3);
  c.restore();
  // 라이더
  const off = tk === 'up' ? sw * 20 : 0;
  c.save(); if (tk === 'side') c.rotate(sw * 0.3);
  const hip = [-4 - off * 0.8, -26 - off * 0.3], sh = [6 - off * 0.6, -44 - off * 0.2];
  g.line(-2, -16, hip[0], hip[1], '#1e3a8a', 5);
  if (tk === 'up') g.line(hip[0], hip[1], hip[0] - 22 * sw, hip[1] + 4, '#1e3a8a', 5); else g.line(hip[0], hip[1], 4, -4, '#1e3a8a', 5);
  g.line(hip[0], hip[1], sh[0], sh[1], '#16a34a', 7);
  if (tk === 'down') { g.line(sh[0], sh[1], sh[0] - 6, sh[1] - 22 * sw, '#fcd34d', 4); g.line(sh[0], sh[1], sh[0] + 10, sh[1] - 20 * sw, '#fcd34d', 4); }
  else g.line(sh[0], sh[1], 14, -26, '#fcd34d', 4);
  g.circle(sh[0] + 3, sh[1] - 9, 8, '#f97316'); g.rect(sh[0] + 2, sh[1] - 10, 9, 4, '#111');
  c.restore();
  c.restore();
}
