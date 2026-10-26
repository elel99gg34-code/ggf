'use strict';
let S;
const VW = 720, VH = 640, PY = 500, CW = 30, CH = 52;
const STAGES = [
  { n: '초원 하이웨이', len: 22000, grass: ['#4d7c0f', '#3f6212'], road: '#4b5563', deco: ['🌳', '🌲', '🏡', '🌻'], w: [340, 260], curve: 90, traffic: 1 },
  { n: '해안 다리', len: 26000, grass: ['#0369a1', '#075985'], road: '#57534e', deco: ['⛵', '🐬', '🌊', '🏝️'], w: [300, 200], curve: 120, traffic: 1.25, water: true },
  { n: '숲속 산길', len: 30000, grass: ['#14532d', '#166534'], road: '#44403c', deco: ['🌲', '🌲', '🍄', '🦌'], w: [280, 180], curve: 170, traffic: 1.45 },
  { n: '사막 랠리', len: 34000, grass: ['#d97706', '#b45309'], road: '#78716c', deco: ['🌵', '🪨', '🐪', '🏜️'], w: [300, 170], curve: 200, traffic: 1.7 },
];
const TYPES = {
  yellow: { c: '#facc15', sp: [260, 330], w: CW, h: CH, pts: 50 },
  blue: { c: '#3b82f6', sp: [280, 360], w: CW, h: CH, pts: 70 },
  red: { c: '#ef4444', sp: [300, 380], w: CW, h: CH, pts: 100 },
  truck: { c: '#e5e7eb', sp: [200, 250], w: 38, h: 92, pts: 120 },
  fuel: { c: 'rainbow', sp: [240, 280], w: CW, h: CH, pts: 0 },
};
GAME({
  title: '로드 파이터', w: VW, h: VH, bg: '#3f6212', controls: 'dpad+ab', aLabel: '가속', bLabel: '하이기어',
  help: '↑/Space 가속 · ↓ 브레이크 · ←→ 핸들\nShift/X 누르고 있으면 하이기어 (최고속도↑ 가속↓)\n⛽ 연료는 계속 줄어요! 무지개 차 🌈를 들이받으면 연료 +15\n노란 차는 직진 · 파란 차는 차선 변경 · 빨간 차는 끼어들기 · 🛢️ 오일은 스핀\n도로 밖으로 나가면 폭발 (연료 손실) · 스테이지 4개 완주가 목표',
  init(g) { S = { st: 0, fuel: 100, msg: '', msgT: 0 }; loadStage(g); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.clear > 0) { S.clear -= dt; if (S.fuel > 0 && S.clear < 2.5) { const f = Math.min(S.fuel, dt * 40); S.fuel -= f; g.add(Math.round(f * 20)); S.fuelBank += f; if (g.frame % 3 === 0) g.sfx.beep(900, 0.03); } if (S.clear <= 0) { S.st++; if (S.st >= STAGES.length) return g.win(`🏁 전 스테이지 완주!`); S.fuel = Math.min(100, S.fuelBank * 0.6 + 45); loadStage(g); } return; }
    if (S.ready > 0) { S.ready -= dt; if (Math.ceil(S.ready) !== S.rb) { S.rb = Math.ceil(S.ready); g.sfx.beep(S.ready < 0.05 ? 880 : 440, 0.1); } return; }
    const P = S.p, St = STAGES[S.st];
    S.t += dt;
    // 연료
    S.fuel -= dt * (0.32 + P.sp * 0.0011);
    if (S.fuel <= 0) { S.fuel = 0; P.sp = Math.max(0, P.sp - 300 * dt); if (P.sp <= 0) { g.sfx.lose(); return g.over(`연료 바닥! ${St.n} ${Math.round((S.d / St.len) * 100)}% 지점`); } }
    if (S.fuel < 20 && !S.lowWarn) { S.lowWarn = true; flash('⛽ 연료 부족!', '#ef4444'); g.sfx.beep(200, 0.4); }
    if (S.fuel > 25) S.lowWarn = false;
    if (P.boom > 0) { P.boom -= dt; if (P.boom <= 0) respawn(g); return tick(g, dt); }
    const high = g.b, gas = (g.up || g.a || (g.mouse.down && g.mouse.y < PY)) && S.fuel > 0;
    const top = high ? 640 : 380, acc = high ? (P.sp < 300 ? 160 : 300) : 420;
    if (P.spin > 0) { P.spin -= dt; P.sp -= 180 * dt; P.ang += dt * 14 * P.spinDir; P.x += P.spinDir * 90 * dt; }
    else {
      P.ang = U.lerp(P.ang, 0, Math.min(1, dt * 10));
      if (gas) P.sp += acc * dt * (P.sp > top ? -1 : 1); else if (g.down) P.sp -= 600 * dt; else P.sp -= 100 * dt;
      const st = ((g.right ? 1 : 0) - (g.left ? 1 : 0)) || (g.mouse.down ? U.clamp((g.mouse.x - P.x) / 40, -1, 1) : 0);
      P.x += st * (170 + P.sp * 0.25) * dt;
      P.lean = st;
    }
    P.sp = U.clamp(P.sp, 0, 680);
    S.d += P.sp * dt;
    // 도로 밖
    const cx = center(S.d), hw = width(S.d) / 2;
    if (Math.abs(P.x - cx) > hw - CW / 2) {
      if (P.sp > 120 || P.spin > 0) return explode(g, '도로 이탈!');
      P.x = cx + Math.sign(P.x - cx) * (hw - CW / 2); P.sp *= 0.5;
    }
    // 오일
    for (const o of S.oils) if (!o.hit && Math.abs(o.d - S.d) < 24 && Math.abs(o.x - P.x) < 26 && P.spin <= 0) { o.hit = true; spin(g, Math.random() < 0.5 ? -1 : 1, '오일! 스핀'); }
    // 교통
    tick(g, dt);
    for (const e of S.cars) {
      if (e.dead) continue;
      const T = TYPES[e.t];
      if (Math.abs(e.d - S.d) < (T.h + CH) / 2 - 4 && Math.abs(e.x - P.x) < (T.w + CW) / 2 - 3) {
        if (e.t === 'fuel') { e.dead = true; S.fuel = Math.min(100, S.fuel + 15); g.sfx.power(); flash('⛽ 연료 +15', '#22c55e'); g.add(200, P.x, PY - 40); g.burst(P.x, PY - 30, ['#f87171', '#facc15', '#4ade80', '#60a5fa', '#c084fc'], 24, 220, 0.6, 4); continue; }
        // 충돌
        g.sfx.hit(); g.shake(6, 0.25);
        const dir = P.x < e.x ? -1 : 1;
        e.x -= dir * 20; e.bump = 0.5;
        if (e.d > S.d) { P.sp = Math.min(P.sp, e.sp * 0.7); S.d = e.d - (TYPES[e.t].h + CH) / 2 - 2; }
        if (e.t === 'truck' && P.sp > 250) return explode(g, '트럭과 충돌!');
        spin(g, dir, '충돌! 스핀');
      }
      if (!e.passed && e.d < S.d - CH && e.t !== 'fuel') { e.passed = true; S.passed++; g.add(TYPES[e.t].pts); }
    }
    if (P.sp > 200 && g.frame % 3 === 0) g.burst(P.x + U.rand(-8, 8), PY + CH / 2, 'rgba(203,213,225,.6)', 1, 40, 0.3, 4);
    S.eng -= dt; if (S.eng <= 0) { S.eng = 0.07; g.sfx.tone(60 + P.sp * (high ? 0.25 : 0.45) % 220, 0.06, 'square', 0.01); }
    if (S.d >= St.len) { S.clear = 4; S.fuelBank = 0; g.sfx.win(); g.add(3000 + S.st * 1000); flash(`🏁 ${St.n} 클리어!`, '#fde047'); }
    g.info = `스테이지 ${S.st + 1}/4 · ${Math.round(P.sp * 0.62)}km/h · ⛽ ${Math.ceil(S.fuel)}`;
  },
  draw(g, c) {
    const St = STAGES[S.st];
    g.rect(0, 0, VW, VH, St.grass[0]);
    // 도로 스트립
    for (let y = 0; y < VH; y += 8) {
      const d = S.d + (PY - y), cx = center(d), hw = width(d) / 2, band = Math.floor(d / 80) % 2;
      g.rect(0, y, VW, 8, St.grass[band]);
      if (St.water) { g.rect(cx - hw - 26, y, 26, 8, '#a8a29e'); g.rect(cx + hw, y, 26, 8, '#a8a29e'); }
      g.rect(cx - hw - 8, y, 8, 8, band ? '#ef4444' : '#f8fafc'); g.rect(cx + hw, y, 8, 8, band ? '#ef4444' : '#f8fafc');
      g.rect(cx - hw, y, hw * 2, 8, St.road);
      if (Math.floor(d / 40) % 2 === 0) { const lanes = Math.max(2, Math.round(hw * 2 / 80)); for (let k = 1; k < lanes; k++) g.rect(cx - hw + (hw * 2 * k) / lanes - 2, y, 4, 8, 'rgba(255,255,255,.55)'); }
    }
    // 결승선
    const fy = PY - (St.len - S.d);
    if (fy > -20 && fy < VH) { const cx = center(St.len), hw = width(St.len) / 2; for (let x = cx - hw; x < cx + hw; x += 16) { g.rect(x, fy - 16, 16, 16, Math.floor((x - cx) / 16) % 2 ? '#111' : '#fff'); g.rect(x, fy, 16, 16, Math.floor((x - cx) / 16) % 2 ? '#fff' : '#111'); } }
    for (const dd of S.deco) { const y = PY - (dd.d - S.d); if (y > -30 && y < VH + 30) { const cx = center(dd.d), hw = width(dd.d) / 2; g.emoji(dd.e, cx + dd.side * (hw + 40 + dd.o), y, 30); } }
    for (const o of S.oils) { const y = PY - (o.d - S.d); if (y > -30 && y < VH + 30) { c.fillStyle = 'rgba(17,17,17,.85)'; c.beginPath(); c.ellipse(o.x, y, 20, 12, 0, 0, 7); c.fill(); g.circle(o.x - 5, y - 3, 4, 'rgba(147,51,234,.5)'); } }
    for (const e of S.cars) { if (e.dead) continue; const y = PY - (e.d - S.d); if (y > -100 && y < VH + 100) drawCar(g, c, e.x, y, TYPES[e.t], e.t === 'fuel' ? 'rainbow' : TYPES[e.t].c, e.bump > 0 ? Math.sin(g.time * 40) * 0.2 : e.lean * 0.12, g); }
    const P = S.p;
    if (P.boom > 0) { g.emoji('💥', P.x, PY, 70 + Math.sin(g.time * 20) * 6); }
    else drawCar(g, c, P.x, PY, { w: CW, h: CH }, '#f8fafc', P.ang + P.lean * 0.12, g, true);
    // HUD
    g.rrect(10, 10, 210, 90, 12, 'rgba(0,0,0,.55)');
    g.text(St.n, 115, 30, 15, '#fde047');
    g.text('⛽', 30, 60, 22); g.rect(50, 52, 155, 16, '#334155'); g.rect(50, 52, 155 * S.fuel / 100, 16, S.fuel < 20 ? (g.frame % 20 < 10 ? '#ef4444' : '#7f1d1d') : S.fuel < 40 ? '#f59e0b' : '#22c55e');
    g.text(`추월 ${S.passed}`, 115, 86, 14, '#e2e8f0');
    g.rrect(VW - 160, 10, 150, 90, 12, 'rgba(0,0,0,.55)');
    g.text(Math.round(P.sp * 0.62), VW - 85, 42, 32, '#fff'); g.text('km/h', VW - 85, 66, 12, '#94a3b8');
    g.text(g.b ? '하이기어 H' : '로우기어 L', VW - 85, 86, 14, g.b ? '#f472b6' : '#38bdf8');
    // 진행
    g.rect(VW - 22, 120, 10, 400, 'rgba(0,0,0,.4)'); const pr = Math.min(1, S.d / St.len); g.rect(VW - 22, 520 - 400 * pr, 10, 400 * pr, '#fde047'); g.emoji('🏁', VW - 17, 108, 16);
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 150, 26, S.msgC); c.globalAlpha = 1; }
    if (S.ready > 0) { g.rrect(VW / 2 - 200, 200, 400, 130, 16, 'rgba(0,0,0,.7)'); g.text(`STAGE ${S.st + 1}`, VW / 2, 240, 36, '#fde047'); g.text(St.n, VW / 2, 290, 22, '#fff'); }
    if (S.clear > 0) { g.rrect(VW / 2 - 200, 200, 400, 150, 16, 'rgba(0,0,0,.75)', '#fde047', 3); g.text('🏁 스테이지 클리어!', VW / 2, 245, 30, '#fde047'); g.text(`남은 연료 → 보너스 점수`, VW / 2, 290, 18, '#fff'); g.text(`⛽ ${Math.ceil(S.fuel)}`, VW / 2, 322, 22, '#22c55e'); }
  },
});
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function center(d) { const St = STAGES[S.st]; return VW / 2 - 20 + Math.sin(d * 0.00045 + S.st) * St.curve * 0.6 + Math.sin(d * 0.0011) * St.curve * 0.4; }
function width(d) { const St = STAGES[S.st], k = 0.5 + 0.5 * Math.sin(d * 0.00031 + S.st * 2); let w = U.lerp(St.w[1], St.w[0], k); if (St.water && Math.floor(d / 3000) % 3 === 1) w = St.w[1] * 0.9; return w; }
function loadStage(g) {
  const St = STAGES[S.st], R = rng(9 + S.st * 13);
  S.d = 0; S.t = 0; S.passed = S.passed || 0;
  S.p = { x: center(0), sp: 0, spin: 0, spinDir: 1, ang: 0, lean: 0, boom: 0 };
  S.cars = []; S.oils = []; S.deco = [];
  for (let d = 600; d < St.len; d += 260 / St.traffic + R() * 260) {
    const r = R(), t = r < 0.4 ? 'yellow' : r < 0.65 ? 'blue' : r < 0.82 ? (S.st > 0 ? 'red' : 'yellow') : r < 0.92 ? 'truck' : 'blue';
    S.cars.push(mkCar(t, d, R));
  }
  for (let d = 2500; d < St.len; d += 3200 + R() * 1500) S.cars.push(mkCar('fuel', d, R));
  for (let d = 3000; d < St.len - 500; d += 2200 / (0.6 + S.st * 0.3) + R() * 1500) S.oils.push({ d, x: center(d) + (R() - 0.5) * width(d) * 0.6, hit: false });
  for (let d = -200; d < St.len + 800; d += 110) S.deco.push({ d, side: R() < 0.5 ? -1 : 1, o: R() * 80, e: St.deco[Math.floor(R() * St.deco.length)] });
  Object.assign(S, { ready: 3.2, rb: 4, clear: 0, eng: 0, lowWarn: false, msg: '', msgT: 0 });
}
function mkCar(t, d, R) {
  const T = TYPES[t], hw = width(d) / 2 - T.w / 2 - 6;
  return { t, d, x: center(d) + (R() * 2 - 1) * hw, off: 0, sp: U.lerp(T.sp[0], T.sp[1], R()) * (1 + S.st * 0.04), dead: false, passed: false, bump: 0, lean: 0, tx: null, act: false };
}
function tick(g, dt) {
  const P = S.p;
  for (const e of S.cars) {
    if (e.dead) continue;
    const rel = e.d - S.d;
    if (rel > 1200 || rel < -900) { if (rel < -900) e.dead = true; continue; }
    const T = TYPES[e.t];
    e.bump -= dt;
    e.d += e.sp * dt;
    const cx = center(e.d), hw = width(e.d) / 2 - T.w / 2 - 6;
    // 행동
    if (e.t === 'blue' && !e.act && rel < 260 && rel > 40) { e.act = true; e.tx = U.clamp(P.x + (Math.random() < 0.5 ? -60 : 60), cx - hw, cx + hw); }
    if (e.t === 'red' && rel < 200 && rel > -20) { e.tx = P.x; }
    if (e.tx !== null) { const dx = e.tx - e.x, mv = (e.t === 'red' ? 120 : 90) * dt; e.lean = Math.sign(dx); e.x += U.clamp(dx, -mv, mv); if (Math.abs(dx) < 2) { e.lean = 0; if (e.t === 'blue') e.tx = null; } }
    if (e.t === 'fuel') e.x += Math.sin(g.time * 2 + e.d) * 30 * dt;
    // 도로 따라가기
    e.x = U.clamp(e.x, cx - hw, cx + hw);
    // 앞차 감속
    for (const o of S.cars) if (o !== e && !o.dead && o.d > e.d && o.d - e.d < 90 && Math.abs(o.x - e.x) < 34 && o.sp < e.sp) e.sp = o.sp;
  }
}
function spin(g, dir, why) {
  const P = S.p;
  if (P.spin > 0) return;
  P.spin = 1.1; P.spinDir = dir; flash(why, '#f97316'); g.sfx.tone(500, 0.6, 'sawtooth', 0.04, 120);
}
function explode(g, why) {
  const P = S.p;
  P.boom = 1.6; P.sp = 0; P.spin = 0;
  S.fuel = Math.max(0, S.fuel - 8);
  flash(`💥 ${why} 연료 -8`, '#ef4444');
  g.sfx.explode(); g.shake(12, 0.5);
  g.burst(P.x, PY, ['#f97316', '#ef4444', '#fde047', '#111'], 40, 300, 0.8, 5);
}
function respawn(g) {
  const P = S.p;
  P.x = center(S.d); P.ang = 0; P.spin = 0; P.sp = 0;
  for (const e of S.cars) if (!e.dead && Math.abs(e.d - S.d) < 120) e.d = S.d + 300;
}
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 1.8; }
const RAINBOW = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
function drawCar(g, c, x, y, T, col, ang, gg, me) {
  const w = T.w, h = T.h;
  c.save(); c.translate(x, y); c.rotate(ang || 0);
  g.rrect(-w / 2 + 3, -h / 2 + 4, w, h, 6, 'rgba(0,0,0,.3)');
  c.fillStyle = '#111'; c.fillRect(-w / 2 - 3, -h / 2 + 8, 5, 12); c.fillRect(w / 2 - 2, -h / 2 + 8, 5, 12); c.fillRect(-w / 2 - 3, h / 2 - 20, 5, 12); c.fillRect(w / 2 - 2, h / 2 - 20, 5, 12);
  if (col === 'rainbow') { for (let i = 0; i < 6; i++) g.rect(-w / 2, -h / 2 + (h / 6) * i, w, h / 6 + 1, RAINBOW[(i + Math.floor(g.time * 8)) % 6]); g.stroke(-w / 2, -h / 2, w, h, '#fff', 2); }
  else g.rrect(-w / 2, -h / 2, w, h, 6, col, 'rgba(0,0,0,.4)', 1.5);
  if (h > 80) { g.rect(-w / 2 + 3, -h / 2 + 22, w - 6, h - 26, '#9ca3af'); g.rrect(-w / 2 + 3, -h / 2 + 3, w - 6, 16, 3, '#1e3a8a'); }
  else { g.rrect(-w / 2 + 4, -h / 2 + 10, w - 8, 12, 3, '#0f172a'); g.rrect(-w / 2 + 4, h / 2 - 16, w - 8, 9, 3, '#0f172a'); }
  if (me) { g.rect(-3, -h / 2, 6, h, '#e11d48'); g.rect(-w / 2 + 3, -h / 2, 5, 3, '#fef08a'); g.rect(w / 2 - 8, -h / 2, 5, 3, '#fef08a'); }
  c.restore();
}
