'use strict';
let S;
const VW = 960, VH = 560, DIST = 400, PXM = 14;
const RF = [1.7, 1.3, 1.05, 0.88, 0.75, 0.66];
const TV5 = [0.36, 0.56, 0.74, 0.88, 1.0], TV6 = [0.32, 0.5, 0.66, 0.8, 0.92, 1.0];
const OPP = [
  { n: '동네 형', car: '#a3a3a3', acc: 5.4, mv: 56, sk: 0.55, re: 0.45 },
  { n: '배달왕 민수', car: '#f97316', acc: 6.0, mv: 60, sk: 0.65, re: 0.4 },
  { n: '튜닝샵 사장', car: '#22c55e', acc: 6.8, mv: 64, sk: 0.7, re: 0.35 },
  { n: '야간 레이서', car: '#8b5cf6', acc: 7.6, mv: 68, sk: 0.75, re: 0.3 },
  { n: '스트리트 퀸', car: '#ec4899', acc: 8.6, mv: 72, sk: 0.8, re: 0.27 },
  { n: '터보 형제', car: '#0ea5e9', acc: 9.6, mv: 76, sk: 0.85, re: 0.24 },
  { n: '미스터 니트로', car: '#eab308', acc: 10.6, mv: 80, sk: 0.9, re: 0.21, nos: 2 },
  { n: '드래그 킹', car: '#111827', acc: 11.6, mv: 84, sk: 0.95, re: 0.18, nos: 3 },
];
const UPG = [
  { k: 'eng', n: '엔진', e: '🔧', d: '가속력·최고속' },
  { k: 'gear', n: '기어박스', e: '⚙️', d: '변속 속도·6단(Lv3)' },
  { k: 'tire', n: '드래그 타이어', e: '🛞', d: '런치 허용폭·접지' },
  { k: 'nos', n: '니트로', e: '🔥', d: '니트로 용량' },
  { k: 'lite', n: '경량화', e: '🪶', d: '전체 가속' },
];
GAME({
  title: '드래그 레이스', w: VW, h: VH, bg: '#0f172a', controls: 'dpad+ab', aLabel: '시프트', bLabel: '니트로',
  help: '출발 전: ↑ 를 누르고 있으면 엔진 회전수(RPM) 상승\n🟢 신호가 켜지는 순간 Space! (RPM이 초록 구간이면 완벽한 런치, 너무 높으면 휠스핀)\n신호 전에 Space = 부정 출발 패배\n주행 중: Space 기어 변속 — 타코미터 초록 구간에서 변속하면 퍼펙트 시프트\nShift/X 니트로 · 상금으로 튜닝 숍에서 업그레이드\n8명의 라이벌을 이기면 드래그 킹! (패배 3회 = 게임오버)',
  init(g) { S = { opp: 0, cash: 500, lv: { eng: 0, gear: 0, tire: 0, nos: 0, lite: 0 }, losses: 0, mode: 'shop', best: 0, msg: '', msgT: 0 }; },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'shop') return shop(g);
    if (S.mode === 'result') { S.rt -= dt; if (S.rt < 2.5 && (g.pressed('a') || g.mouse.clicked)) afterRace(g); return; }
    const me = S.me, op = S.op;
    S.tt += dt;
    if (S.mode === 'stage') {
      // 크리스마스 트리
      const ph = S.tt;
      const lit = Math.floor((ph - 1) / 0.5);
      if (lit !== S.lit && lit >= 0 && lit < 3) { S.lit = lit; g.sfx.beep(600, 0.1); }
      if (g.up || g.held('up')) me.rpm = Math.min(1.05, me.rpm + dt * 1.6); else me.rpm = Math.max(0.12, me.rpm - dt * 1.2);
      me.rpm += (Math.random() - 0.5) * 0.01;
      if (me.rpm > 1) { me.rpm = 0.96; }
      if (S.tt > 0.8 && (g.pressed('a') || (g.mouse.clicked && g.mouse.y > 120))) { g.sfx.lose(); return result(g, false, '❌ 부정 출발!'); }
      if (ph >= S.greenAt) { S.mode = 'race'; S.go = S.tt; g.sfx.beep(1000, 0.3); }
      engineSound(g, me.rpm, dt);
      return;
    }
    // 레이스
    const t = S.tt - S.go;
    if (!me.launched) {
      if (g.up) me.rpm = Math.min(1, me.rpm + dt * 1.6); else me.rpm = Math.max(0.12, me.rpm - dt * 1.2);
      if (g.pressed('a') || g.mouse.clicked) launch(g, me, t);
    } else {
      if ((g.pressed('a') || (g.mouse.clicked && g.mouse.y > 120)) && !me.fin) shift(g, me);
    }
    me.nosOn = g.b && me.nos > 0 && me.launched && !me.fin;
    if (!op.launched && t >= op.react) launch(g, op, t);
    if (op.launched && !op.fin) { const r = op.v / tv(op, op.g); if (r >= op.shiftAt && op.g < op.G - 1 && op.sh <= 0) shift(g, op); op.nosOn = op.nos > 0 && op.g >= 2; }
    for (const c of [me, op]) phys(g, c, dt, t);
    if (me.launched) engineSound(g, me.rpm, dt);
    S.camX = U.lerp(S.camX, me.x * PXM - 420, Math.min(1, dt * 8));
    if (me.fin && op.fin) result(g, me.et + me.react <= op.et + op.react || me.finT <= op.finT, null);
    else if (me.fin && !S.waitT) S.waitT = 2.2;
    if (S.waitT) { S.waitT -= dt; if (S.waitT <= 0) { if (!op.fin) { op.fin = true; op.finT = 999; } } }
    if (op.fin && !me.fin && t > 40) { me.fin = true; me.finT = 999; }
    g.info = `상대 ${S.opp + 1}/8 · ${OPP[S.opp].n} · 패배 ${S.losses}/3`;
  },
  draw(g, c) {
    if (S.mode === 'shop') return shopDraw(g, c);
    const me = S.me, op = S.op;
    // 하늘 & 관중석
    const sky = c.createLinearGradient(0, 0, 0, 260); sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(1, '#f97316'); c.fillStyle = sky; c.fillRect(0, 0, VW, 260);
    const cx = S.camX;
    for (let i = 0; i < 12; i++) { const x = ((i * 220 - cx * 0.2) % 2640 + 2640) % 2640 - 220; g.rect(x, 120, 6, 140, '#334155'); g.circle(x + 3, 118, 8, '#fef3c7'); c.globalAlpha = 0.12; g.circle(x + 3, 118, 30, '#fef3c7'); c.globalAlpha = 1; }
    // 관중석
    g.rect(0, 190, VW, 70, '#475569');
    for (let x = -((cx * 0.6) % 28); x < VW; x += 28) { g.emoji(['🙋', '🧑', '👩', '🙌', '🧔', '📸'][Math.floor((x + cx * 0.6) / 28 + 600) % 6], x, 210 + (S.mode === 'race' ? Math.abs(Math.sin(g.time * 9 + x)) * -4 : 0), 20); g.emoji(['🧑', '🙋‍♂️', '👨', '🎉', '👧'][Math.floor((x + cx * 0.6) / 28 + 900) % 5], x + 14, 238, 20); }
    // 트랙
    g.rect(0, 260, VW, 300, '#27272a');
    g.rect(0, 262, VW, 6, '#e5e7eb'); g.rect(0, 392, VW, 4, '#facc15'); g.rect(0, 540, VW, 6, '#e5e7eb');
    for (let m = 0; m <= DIST + 60; m += 10) { const x = m * PXM - cx; if (x < -20 || x > VW + 20) continue; g.rect(x, 330, 2, 4, '#52525b'); g.rect(x, 470, 2, 4, '#52525b'); }
    for (let m = 0; m <= DIST; m += 50) { const x = m * PXM - cx; if (x < -100 || x > VW + 100) continue; g.rrect(x - 30, 150, 60, 30, 6, '#0f172a', '#facc15', 2); g.text(m === 0 ? 'START' : m === DIST ? 'FINISH' : m + 'm', x, 165, 13, '#facc15'); }
    const sx = -cx, fx = DIST * PXM - cx;
    g.rect(sx - 3, 262, 6, 280, '#fff');
    for (let y = 262; y < 540; y += 14) { g.rect(fx, y, 14, 7, '#fff'); g.rect(fx + 14, y + 7, 14, 7, '#fff'); g.rect(fx, y + 7, 14, 7, '#111'); g.rect(fx + 14, y, 14, 7, '#111'); }
    // 차량
    drawCar(g, c, op.x * PXM - cx, 360, 0.85, OPP[S.opp].car, op, g);
    drawCar(g, c, me.x * PXM - cx, 500, 1, '#dc2626', me, g);
    // 크리스마스 트리
    if (S.mode === 'stage' || (S.mode === 'race' && S.tt - S.go < 1.2)) {
      const tx = VW / 2 - 40;
      g.rrect(tx, 20, 80, 150, 10, '#111827', '#475569', 2);
      for (let i = 0; i < 3; i++) g.circle(tx + 40, 45 + i * 30, 11, S.mode === 'stage' && S.lit >= i ? '#f59e0b' : '#3f3f46');
      g.circle(tx + 40, 140, 13, S.mode === 'race' ? '#22c55e' : '#3f3f46');
    }
    // 타코미터
    tach(g, c, 110, VH - 100, me);
    g.rrect(VW - 210, VH - 130, 196, 116, 14, 'rgba(0,0,0,.7)');
    g.text(Math.round(me.v * 3.6) + ' km/h', VW - 112, VH - 104, 26, '#fff');
    g.text(`${Math.max(0, DIST - me.x).toFixed(0)}m 남음`, VW - 112, VH - 74, 15, '#cbd5e1');
    g.text('니트로', VW - 175, VH - 40, 12, '#94a3b8'); g.rect(VW - 148, VH - 47, 120, 12, '#334155'); g.rect(VW - 148, VH - 47, 120 * (me.nosMax ? me.nos / me.nosMax : 0), 12, '#38bdf8');
    g.rrect(12, 12, 240, 70, 12, 'rgba(0,0,0,.6)');
    g.text(`VS ${OPP[S.opp].n}`, 132, 34, 17, OPP[S.opp].car === '#111827' ? '#fde047' : OPP[S.opp].car);
    const t = S.mode === 'race' ? S.tt - S.go : 0;
    g.text(`⏱ ${(me.fin ? me.et : Math.max(0, t - (me.react || 0))).toFixed(3)}s`, 132, 62, 18, '#fff');
    if (S.mode === 'stage') g.text(S.tt < 1 ? '↑ 를 눌러 RPM을 초록 구간에 맞추세요' : '🟢 신호에 Space!', VW / 2, 200, 22, '#fde047');
    if (S.mode === 'race' && !me.launched) g.text('Space! 출발!', VW / 2, 200, 30, '#22c55e');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 240, 26, S.msgC); c.globalAlpha = 1; }
    if (S.mode === 'result') resultDraw(g, c);
  },
});
function tv(c, i) { return c.mv * (c.G === 6 ? TV6[i] : TV5[i]); }
function mkCar(p) {
  return { x: 0, v: 0, g: 0, G: p.G, rpm: 0.15, acc: p.acc, mv: p.mv, sh: 0, shT: p.shT, nos: p.nos, nosMax: p.nos, nosOn: false, launched: false, spin: 0, bog: 0, fin: false, et: 0, finT: 0, react: 0, shiftAt: p.shiftAt || 0.95, tire: p.tire || 0, perfect: 0 };
}
function startRace(g) {
  const L = S.lv, o = OPP[S.opp];
  S.me = mkCar({ G: L.gear >= 3 ? 6 : 5, acc: (6 + L.eng * 0.9) * Math.pow(1.04, L.lite), mv: 60 + L.eng * 3 + L.gear * 1.5, shT: 0.28 - L.gear * 0.035, nos: L.nos ? 1.2 + L.nos * 0.6 : 0, tire: L.tire });
  S.op = mkCar({ G: 5, acc: o.acc, mv: o.mv, shT: 0.22, nos: o.nos || 0, shiftAt: 0.86 + o.sk * 0.12 });
  S.op.react = o.re + Math.random() * 0.12; S.op.react0 = S.op.react;
  S.mode = 'stage'; S.tt = 0; S.lit = -1; S.greenAt = 2.5 + Math.random() * 0.8; S.camX = -420; S.waitT = 0; S.engT = 0;
}
function launch(g, c, t) {
  c.launched = true; c.react = t;
  if (c === S.me) {
    const lo = 0.55 - c.tire * 0.03, hi = 0.8 + c.tire * 0.03;
    if (c.rpm > hi) { c.spin = 1.3 - c.tire * 0.15; flash('🔥 휠스핀!', '#f97316'); g.sfx.noise(0.6, 0.06); }
    else if (c.rpm < lo) { c.bog = 0.9; flash('😓 런치 실패 (RPM 부족)', '#f97316'); }
    else if (c.rpm > 0.64 && c.rpm < 0.74) { flash(`✨ 퍼펙트 런치! 반응 ${t.toFixed(3)}s`, '#22c55e'); c.perfect++; g.add(200); }
    else flash(`굿 런치 · 반응 ${t.toFixed(3)}s`, '#bbf7d0');
    g.sfx.tone(120, 0.4, 'sawtooth', 0.06, 60);
  } else { if (Math.random() > OPP[S.opp].sk) c.spin = 0.6; }
}
function shift(g, c) {
  if (c.g >= c.G - 1 || c.sh > 0) return;
  const r = c.v / tv(c, c.g);
  c.g++; c.sh = c.shT;
  if (c === S.me) {
    if (r > 0.9 && r <= 1.0) { flash('✨ 퍼펙트 시프트!', '#22c55e'); c.sh *= 0.4; c.boost = 0.5; g.add(100); c.perfect++; g.sfx.tone(900, 0.08, 'square', 0.05); }
    else if (r < 0.75) { flash('너무 이른 변속', '#fca5a5'); g.sfx.tone(200, 0.1, 'square', 0.04); }
    else { flash('굿 시프트', '#e2e8f0'); g.sfx.tone(500, 0.06, 'square', 0.04); }
  }
}
function phys(g, c, dt, t) {
  if (c.fin) { c.v = Math.max(0, c.v - 12 * dt); c.x += c.v * dt; return; }
  if (!c.launched) return;
  const top = tv(c, c.g), r = c.v / top;
  c.rpm = U.clamp(Math.max(r, c.spin > 0 ? 0.95 : 0), 0, 1.02);
  let a = 0;
  c.sh -= dt; c.spin -= dt; c.bog -= dt; c.boost = (c.boost || 0) - dt;
  if (c.sh > 0) a = 0;
  else if (r < 1) a = c.acc * RF[c.g] * (0.72 + 0.28 * r);
  else { a = 0; if (c === S.me && g.frame % 4 === 0) { g.sfx.tone(90, 0.03, 'square', 0.04); S.limiter = true; } }
  if (c.spin > 0) a *= 0.45;
  if (c.bog > 0) a *= 0.5;
  if (c.boost > 0) a *= 1.15;
  if (c.nosOn && c.sh <= 0) { a += 4.2; c.nos = Math.max(0, c.nos - dt); if (c === S.me && g.frame % 2 === 0) g.burst(c.x * PXM - S.camX - 60, 488, ['#38bdf8', '#a5f3fc', '#fff'], 2, 140, 0.3, 4); }
  a -= 0.00035 * c.v * c.v * (60 / c.mv);
  c.v = Math.max(0, c.v + a * dt);
  c.x += c.v * dt;
  if (c === S.me && c.spin > 0 && g.frame % 2 === 0) g.burst(c.x * PXM - S.camX - 50, 515, ['#e5e7eb', '#9ca3af'], 3, 90, 0.8, 8);
  if (c.x >= DIST) { c.fin = true; c.et = t - c.react; c.finT = t; c.trap = c.v * 3.6; if (c === S.me) { g.sfx.coin(); g.shake(3, 0.2); } }
}
function engineSound(g, rpm, dt) { S.engT -= dt; if (S.engT <= 0) { S.engT = 0.05; g.sfx.tone(70 + rpm * 260, 0.05, 'sawtooth', 0.018); } }
function result(g, win, why) {
  const me = S.me, op = S.op, o = OPP[S.opp];
  S.mode = 'result'; S.rt = 6;
  S.res = { win, why, et: me.fin && me.finT < 999 ? me.et : null, oet: op.fin && op.finT < 999 ? op.et : null, react: me.react, trap: me.trap || 0, perfect: me.perfect };
  if (win) {
    const prize = 1000 + S.opp * 700;
    S.cash += prize; S.res.prize = prize;
    g.add(prize + Math.round(Math.max(0, 15 - (S.res.et || 15)) * 300) + me.perfect * 100);
    g.sfx.win(); g.burst(VW / 2, 200, ['#fde047', '#22c55e', '#fff'], 50, 380, 1, 5);
    if (S.res.et && (!S.best || S.res.et < S.best)) S.best = S.res.et;
  } else { S.losses++; S.cash += 200; S.res.prize = 200; g.sfx.lose(); }
}
function afterRace(g) {
  if (S.res.win) { S.opp++; if (S.opp >= OPP.length) return g.win(`🏁 드래그 킹 등극! 베스트 ${S.best.toFixed(3)}s`); }
  else if (S.losses >= 3) return g.over(`${OPP[S.opp].n}에게 패배 · 3패`);
  S.mode = 'shop';
}
function cost(k) { return 600 + S.lv[k] * 650; }
function shop(g) {
  UPG.forEach((u, i) => {
    const x = 40 + i * 180;
    if (g.keyp('Digit' + (i + 1)) || g.clickIn(x, 210, 165, 210)) {
      if (S.lv[u.k] < 5 && S.cash >= cost(u.k)) { S.cash -= cost(u.k); S.lv[u.k]++; g.sfx.power(); g.burst(x + 82, 300, ['#fde047', '#22c55e'], 18, 200, 0.5, 4); }
      else g.sfx.beep(150, 0.15);
    }
  });
  if (g.pressed('a') || g.clickIn(VW / 2 - 120, 460, 240, 60)) { g.sfx.click(); startRace(g); }
}
function shopDraw(g, c) {
  g.rect(0, 0, VW, VH, '#0f172a');
  const o = OPP[S.opp];
  g.text('🏁 드래그 레이스 개러지', VW / 2, 40, 30, '#fde047');
  g.text(`💰 ${S.cash.toLocaleString()} · 패배 ${S.losses}/3${S.best ? ` · 베스트 ${S.best.toFixed(3)}s` : ''}`, VW / 2, 80, 18, '#e2e8f0');
  g.rrect(VW / 2 - 260, 105, 520, 80, 14, '#1e293b', o.car === '#111827' ? '#fde047' : o.car, 3);
  g.text(`다음 상대 ${S.opp + 1}/8: ${o.n}`, VW / 2, 130, 22, '#fff');
  g.text(`예상 기록 약 ${estET(o).toFixed(1)}s · 반응속도 ${o.re.toFixed(2)}s${o.nos ? ' · 니트로 장착' : ''}`, VW / 2, 162, 15, '#94a3b8');
  UPG.forEach((u, i) => {
    const x = 40 + i * 180, lv = S.lv[u.k], ok = lv < 5 && S.cash >= cost(u.k);
    g.rrect(x, 210, 165, 210, 14, g.inRect(x, 210, 165, 210) ? '#334155' : '#1f2937', ok ? '#22c55e' : '#475569', 3);
    g.emoji(u.e, x + 82, 250, 40); g.text(`${i + 1}. ${u.n}`, x + 82, 292, 17, '#fff'); g.text(u.d, x + 82, 316, 12, '#94a3b8');
    for (let k = 0; k < 5; k++) g.rect(x + 22 + k * 25, 340, 20, 10, k < lv ? '#fde047' : '#374151');
    g.text(lv >= 5 ? 'MAX' : `💰 ${cost(u.k)}`, x + 82, 385, 17, ok ? '#22c55e' : '#94a3b8');
  });
  g.button(VW / 2 - 120, 460, 240, 60, '레이스 시작 ▶ (Space)', '#b91c1c', 20);
}
function estET(o) {
  let v = 0, x = 0, gi = 0, t = 0; const dt = 1 / 60, c = { mv: o.mv, G: 5 };
  while (x < DIST && t < 40) { const r = v / tv(c, gi); if (r > 0.95 && gi < 4) gi++; let a = r < 1 ? o.acc * RF[gi] * (0.72 + 0.28 * r) : 0; a -= 0.00035 * v * v * (60 / o.mv); v += a * dt; x += v * dt; t += dt; }
  return t;
}
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 1.6; }
function tach(g, c, x, y, me) {
  g.circle(x, y, 86, 'rgba(0,0,0,.75)'); g.ring(x, y, 86, '#475569', 3);
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, A = (r) => a0 + (a1 - a0) * U.clamp(r, 0, 1.05) / 1.05;
  c.lineWidth = 10;
  const arc = (r0, r1, col) => { c.strokeStyle = col; c.beginPath(); c.arc(x, y, 70, A(r0), A(r1)); c.stroke(); };
  arc(0, 0.9, '#334155'); arc(0.9, 1.0, '#22c55e'); arc(1.0, 1.05, '#ef4444');
  if (S.mode === 'stage' || !me.launched) arc(0.55 - me.tire * 0.03, 0.8 + me.tire * 0.03, 'rgba(34,197,94,.55)');
  for (let i = 0; i <= 10; i++) { const a = A(i / 10 * 1.05); g.line(x + Math.cos(a) * 54, y + Math.sin(a) * 54, x + Math.cos(a) * 62, y + Math.sin(a) * 62, '#e2e8f0', 2); }
  const a = A(me.rpm); g.line(x, y, x + Math.cos(a) * 66, y + Math.sin(a) * 66, '#f43f5e', 4); g.circle(x, y, 8, '#e2e8f0');
  g.text(me.launched ? `${me.g + 1}단` : 'N', x, y + 34, 22, '#fde047');
  g.text('RPM x1000', x, y + 58, 10, '#94a3b8');
  const r = me.launched ? me.v / tv(me, me.g) : 0;
  if (me.launched && r > 0.9 && me.g < me.G - 1) { g.circle(x, y - 30, 9, g.frame % 6 < 3 ? '#22c55e' : '#166534'); g.text('SHIFT!', x + 100, y - 70, 20, '#22c55e'); }
}
function drawCar(g, c, x, y, s, col, car, gg) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const wob = car.spin > 0 ? Math.sin(g.time * 50) * 1.5 : 0;
  const lift = car.launched && car.g === 0 && car.v > 2 && car.v < 20 ? -0.06 : 0;
  c.rotate(lift);
  g.rect(-110, 10, 220, 8, 'rgba(0,0,0,.35)');
  g.poly([[-100, -10 + wob], [-60, -24 + wob], [40, -26 + wob], [100, -6 + wob], [104, 6 + wob], [-104, 6 + wob]], col, '#0007', 2);
  g.poly([[-40, -24 + wob], [-20, -40 + wob], [20, -40 + wob], [36, -24 + wob]], '#0f172a');
  g.rect(-112, -34 + wob, 22, 6, col); g.rect(-104, -30 + wob, 4, 22, '#111');
  g.rect(-30, -4 + wob, 120, 3, 'rgba(255,255,255,.5)');
  for (const wx of [-66, 72]) { const r = wx < 0 ? 22 : 17; g.circle(wx, 6, r, '#111'); g.circle(wx, 6, r * 0.5, '#9ca3af'); c.save(); c.translate(wx, 6); c.rotate(car.x * 2); g.line(-r * 0.5, 0, r * 0.5, 0, '#4b5563', 2); c.restore(); }
  if (car.nosOn) { g.poly([[-104, -6], [-150 - Math.random() * 30, 0], [-104, 4]], '#38bdf8'); g.poly([[-104, -3], [-125 - Math.random() * 15, 0], [-104, 1]], '#fff'); }
  c.restore();
}
function resultDraw(g, c) {
  const R = S.res, o = OPP[S.opp];
  g.rrect(VW / 2 - 250, 70, 500, 340, 20, 'rgba(15,23,42,.95)', R.win ? '#22c55e' : '#ef4444', 3);
  g.text(R.why || (R.win ? '🏆 승리!' : '😵 패배'), VW / 2, 115, 36, R.win ? '#fde047' : '#ef4444');
  g.text(`나: ${R.et ? R.et.toFixed(3) + 's' : '-'} · 반응 ${(R.react || 0).toFixed(3)}s · ${Math.round(R.trap)}km/h`, VW / 2, 175, 18, '#fff');
  g.text(`${o.n}: ${R.oet ? R.oet.toFixed(3) + 's' : '-'}`, VW / 2, 210, 18, '#cbd5e1');
  g.text(`퍼펙트 ${R.perfect}회 · 💰 +${R.prize}`, VW / 2, 260, 20, '#22c55e');
  g.text(R.win ? (S.opp + 1 < OPP.length ? '다음 상대가 기다린다!' : '마지막 상대 격파!') : `패배 ${S.losses}/3 — 튜닝 후 재도전`, VW / 2, 310, 17, '#94a3b8');
  if (S.rt < 2.5) g.text('Space: 계속', VW / 2, 370, 16, '#e2e8f0');
}
