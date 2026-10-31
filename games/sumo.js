'use strict';
let S;
const CX = 450, GY = 400, RING = 250;
const RIVALS = [
  { n: '하나노야마', s: 0.8, rt: 0.42, ev: [4.5, 6.5], col: '#a16207', w: 1 },
  { n: '타카카제', s: 0.9, rt: 0.38, ev: [3.8, 5.5], col: '#0f766e', w: 1.05 },
  { n: '오쿠니시키', s: 1.0, rt: 0.34, ev: [3.2, 5], col: '#7c2d12', w: 1.15 },
  { n: '키리시마루', s: 1.08, rt: 0.31, ev: [2.8, 4.5], col: '#4338ca', w: 1.1 },
  { n: '테루노후지', s: 1.16, rt: 0.28, ev: [2.5, 4], col: '#be185d', w: 1.2 },
  { n: '하쿠류 (오제키)', s: 1.25, rt: 0.25, ev: [2.2, 3.6], col: '#b45309', w: 1.3 },
  { n: '요코즈나 쇼군', s: 1.36, rt: 0.22, ev: [2, 3.2], col: '#111827', w: 1.4 },
];
const RANKS = ['마쿠시타', '주료', '마에가시라', '고무스비', '세키와케', '오제키', '요코즈나'];
GAME({
  title: '스모', w: 900, h: 600, bg: '#1c1917', controls: 'dpad+ab', aLabel: '밀기', bLabel: '찌르기',
  help: '① 다치아이: 「!」가 뜨는 순간 Space! (먼저 누르면 부정출발)\n② 밀기: Space/Z 연타로 밀어붙여라 (스태미나 주의)\n③ 링이 겹칠 때 X/Shift = 쓰파리(강한 찌르기) → 상대 균형 붕괴\n⚠ 상대가 피하기(하타키) 예고 → 연타를 멈춰라! / 던지기 예고 → 화살표 방향키로 버티기\n상대를 원 밖으로 밀거나 균형을 무너뜨리면 승리 · 7일간 4승 이상이면 가치코시!',
  init(g) {
    S = { day: 0, rec: [], rankI: 0, msg: '', msgT: 0 };
    newBout(g);
  },
  update(g, dt) {
    S.msgT -= dt;
    const b = S.b;
    if (b.ph === 'ready') return readyUpd(g, dt);
    if (b.ph === 'fight') return fightUpd(g, dt);
    if (b.ph === 'end') { b.t -= dt; animEnd(dt); if (b.t <= 0) nextBout(g); return; }
    if (b.ph === 'between') { if (g.pressed('a') || g.clickIn(330, 470, 240, 54)) newBout(g); }
  },
  draw(g, c) { draw(g, c); },
});
function say(m, c = '#fde047', t = 1.3) { S.msg = m; S.msgC = c; S.msgT = t; }
function newBout(g) {
  const R = RIVALS[S.day];
  S.b = { ph: 'ready', t: U.rand(1.6, 3.4), sig: false, sigT: 0, falses: 0, pos: 0, v: 0, pw: 0, stam: 1, pBal: 1, cBal: 1, cpuF: 0, ev: null, evT: U.rand(...R.ev), ring: null, ringT: 1.6, lean: 0, fall: 0, winner: -1, how: '', pressed: 0, mashT: 0, grip: 0 };
  say(`${S.day + 1}일차 · VS ${R.n}`, '#fde047', 2);
  g.info = `${S.day + 1}일차 · ${wins()}승 ${S.rec.length - wins()}패`;
}
function wins() { return S.rec.filter((r) => r).length; }
function readyUpd(g, dt) {
  const b = S.b, R = RIVALS[S.day];
  if (!b.sig) {
    b.t -= dt;
    if (g.pressed('a') || g.mouse.clicked) {
      b.falses++; g.sfx.tone(180, 0.2, 'square', 0.06);
      if (b.falses >= 3) { say('부정출발 3회 — 패배', '#f87171', 2); return endBout(g, 1, '부전패'); }
      say('부정출발! (마타)', '#f87171', 1.2); b.t = U.rand(1.5, 3);
      return;
    }
    if (b.t <= 0) { b.sig = true; b.sigT = 0; g.sfx.tone(1000, 0.12, 'square', 0.07); }
    return;
  }
  b.sigT += dt;
  const cpuRT = R.rt * U.rand(0.85, 1.2);
  if (g.pressed('a') || g.mouse.clicked || b.sigT > 1.2) {
    const rt = b.sigT, diff = cpuRT - rt;
    b.v = U.clamp(diff * 900, -320, 320);
    b.pBal = diff < -0.2 ? 0.75 : 1;
    b.ph = 'fight';
    g.sfx.hit(); g.sfx.noise(0.2, 0.25); g.shake(10, 0.3);
    g.burst(CX, GY - 110, ['#fde68a', '#fff'], 30, 300);
    say(diff > 0.08 ? `완벽한 다치아이! (${Math.round(rt * 1000)}ms)` : diff > 0 ? `좋은 출발 (${Math.round(rt * 1000)}ms)` : `늦었다! (${Math.round(rt * 1000)}ms)`, diff > 0 ? '#86efac' : '#f87171', 1.4);
    if (diff > 0.08) g.add(100);
  }
}
function fightUpd(g, dt) {
  const b = S.b, R = RIVALS[S.day];
  // 플레이어 입력
  if (g.pressed('a') || (g.mouse.clicked && g.mouse.x < 700)) {
    const eff = 0.35 + b.stam * 0.65;
    b.pw += 1.0 * eff; b.stam = Math.max(0, b.stam - 0.028); b.pressed++; b.mashT = 0.35;
    g.sfx.tone(120 + Math.random() * 40, 0.04, 'triangle', 0.05);
  }
  b.mashT -= dt;
  b.pw *= Math.pow(0.12, dt);
  b.stam = Math.min(1, b.stam + dt * (b.mashT > 0 ? 0.04 : 0.22));
  // 타이밍 링
  b.ringT -= dt;
  if (!b.ring && b.ringT <= 0) b.ring = { t: 0, T: 1.1 };
  if (b.ring) {
    b.ring.t += dt;
    const k = b.ring.t / b.ring.T;
    if (g.pressed('b') || g.mouse.rclick || (g.mouse.clicked && g.mouse.x >= 700)) {
      const err = Math.abs(k - 0.8);
      if (err < 0.08) { b.v += 260; b.cBal -= 0.34; b.pw += 2; g.add(80); say('쓰파리!!', '#fde047', 0.8); g.sfx.tone(90, 0.15, 'square', 0.1, 40); g.shake(8, 0.2); g.burst(CX + b.pos + 10, GY - 120, ['#fde047', '#fff'], 20, 260); }
      else if (err < 0.18) { b.v += 120; b.cBal -= 0.12; say('찌르기', '#fde68a', 0.6); g.sfx.tone(140, 0.1, 'square', 0.07); }
      else { b.pBal -= 0.12; say('헛손질!', '#f87171', 0.6); g.sfx.tone(300, 0.1, 'sine', 0.05, 150); }
      b.ring = null; b.ringT = U.rand(1.2, 2.4);
    } else if (k > 1.1) { b.ring = null; b.ringT = U.rand(1, 2); }
  }
  // CPU 힘
  const t = g.time;
  let cf = 2.2 * R.s * (1 + Math.sin(t * 1.7) * 0.15 + Math.sin(t * 4.3) * 0.08) * (0.6 + b.cBal * 0.4);
  // 이벤트
  b.evT -= dt;
  if (!b.ev && b.evT <= 0) {
    const r = Math.random(), type = r < 0.35 ? 'surge' : r < 0.68 ? 'slap' : 'throw';
    b.ev = { type, t: 0, warn: type === 'surge' ? 0.7 : 0.95 * (1.25 - R.s * 0.3), dir: Math.random() < 0.5 ? 'left' : 'right', ok: false, done: false };
    g.sfx.tone(type === 'surge' ? 200 : 600, 0.15, 'sawtooth', 0.04);
  }
  if (b.ev) {
    const e = b.ev; e.t += dt;
    if (e.type === 'surge') { if (e.t > e.warn) cf *= 1.9; if (e.t > e.warn + 1.2) endEv(R); }
    else if (e.type === 'slap') {
      if (e.t > e.warn && !e.done) {
        e.done = true;
        if (b.mashT > 0.05 && b.pw > 1.2) { b.pBal -= 0.75; b.v -= 0; b.lean = 1; say('하타키코미! 앞으로 고꾸라진다!', '#f87171', 1.2); g.shake(8, 0.3); g.sfx.hit(); }
        else { b.cBal -= 0.3; b.v += 120; say('피하기 간파! 역습!', '#86efac', 1); g.add(120); g.sfx.coin(); }
      }
      if (e.t > e.warn + 0.4) endEv(R);
    } else if (e.type === 'throw') {
      if (!e.done && e.t <= e.warn + 0.25 && (g.pressed(e.dir))) { e.ok = true; e.done = true; b.cBal -= 0.25; say('던지기 버텼다!', '#86efac', 1); g.add(120); g.sfx.coin(); }
      else if (!e.done && (g.pressed(e.dir === 'left' ? 'right' : 'left'))) { e.done = true; b.pBal -= 0.45; say('반대 방향!', '#f87171', 0.9); g.sfx.hit(); }
      if (!e.done && e.t > e.warn + 0.25) { e.done = true; b.pBal -= 0.5; b.v -= 160; say('우와테나게!', '#f87171', 1); g.sfx.hit(); g.shake(8, 0.3); }
      if (e.t > e.warn + 0.6) endEv(R);
    }
  }
  b.cpuF = cf;
  // 물리
  const pf = b.pw * 1.05 * (0.6 + b.pBal * 0.4);
  b.v += (pf - cf) * 95 * dt;
  b.v *= Math.pow(0.25, dt);
  b.pos += b.v * dt;
  b.pBal = Math.min(1, b.pBal + dt * 0.08); b.cBal = Math.min(1, b.cBal + dt * 0.06);
  b.lean = Math.max(0, b.lean - dt * 2);
  // 판정
  if (b.pBal <= 0) return endBout(g, 1, b.ev && b.ev.type === 'slap' ? '하타키코미' : '우와테나게');
  if (b.cBal <= 0) return endBout(g, 0, '츠키오토시');
  if (CX + b.pos + 70 > CX + RING) return endBout(g, 0, b.pw > 2 ? '오시다시' : '요리키리');
  if (CX + b.pos - 70 < CX - RING) return endBout(g, 1, '요리키리');
}
function endEv(R) { const b = S.b; b.ev = null; b.evT = U.rand(...R.ev); }
function endBout(g, winner, how) {
  const b = S.b;
  b.ph = 'end'; b.winner = winner; b.how = how; b.t = 2.4; b.fall = 0;
  S.rec.push(winner === 0);
  if (winner === 0) { g.add(500 + S.day * 100); g.sfx.win(); g.burst(CX, GY - 140, ['#fde047', '#f87171', '#fff'], 50, 380, 1.1, 4); say(`승! ${how}`, '#fde047', 2.2); }
  else { g.sfx.lose(); say(`패... ${how}`, '#f87171', 2.2); }
  g.shake(10, 0.4);
}
function animEnd(dt) { const b = S.b; b.fall = Math.min(1, b.fall + dt * 2.5); b.pos += b.v * dt * 0.3; b.v *= 0.9; }
function nextBout(g) {
  S.day++;
  if (S.day >= 7) {
    const w = wins();
    if (w === 7) g.add(5000); else if (w >= 4) g.add(1000 * (w - 3));
    const msg = `${w}승 ${7 - w}패 · ${w === 7 ? '전승 우승! 요코즈나 승진!' : w >= 4 ? '가치코시! 승진' : '마케코시...'}`;
    return w >= 4 ? g.win(msg) : g.over(msg);
  }
  S.b.ph = 'between';
}
/* ---------------- 그리기 ---------------- */
function drawWrestler(g, c, x, facing, col, skin, lean, fallK, fallDir, pushing) {
  c.save();
  c.translate(x, GY - 10);
  c.rotate((lean * 0.35 + fallK * 1.3 * fallDir) * facing + facing * 0.12);
  const bob = pushing ? Math.sin(performance.now() / 50) * 2 : 0;
  // 다리
  g.rrect(-34, -40, 26, 50, 10, skin); g.rrect(8, -40, 26, 50, 10, skin);
  // 몸
  g.circle(0, -95 + bob, 62, skin);
  g.circle(facing * 14, -80 + bob, 40, 'rgba(0,0,0,.05)');
  // 마와시
  g.rrect(-58, -66 + bob, 116, 30, 8, col);
  g.rect(-10, -40 + bob, 20, 18, col);
  // 머리
  const hx = facing * 42, hy = -160 + bob;
  g.circle(hx, hy, 28, skin);
  g.circle(hx - facing * 10, hy - 24, 10, '#111'); g.rrect(hx - facing * 20 - 8, hy - 34, 18, 10, 5, '#111');
  g.circle(hx + facing * 12, hy - 4, 3.5, '#111');
  g.line(hx + facing * 6, hy + 10, hx + facing * 18, hy + 10, '#7f1d1d', 3);
  // 팔
  const ax = facing * (pushing ? 82 : 60);
  g.line(facing * 30, -120 + bob, ax, -110 + bob + (pushing ? Math.sin(performance.now() / 60) * 8 : 0), skin, 22);
  g.circle(ax, -110 + bob, 13, skin);
  c.restore();
}
function draw(g, c) {
  const b = S.b, R = RIVALS[Math.min(S.day, 6)];
  // 배경
  g.rect(0, 0, 900, 600, '#1c1917');
  g.rect(0, 0, 900, 70, '#7f1d1d');
  for (let i = 0; i < 9; i++) g.rect(i * 100 + 20, 10, 60, 50, i % 2 ? '#dc2626' : '#f5f5f4');
  for (let i = 0; i < 90; i++) { const x = (i * 97) % 900, y = 110 + ((i * 53) % 150); g.circle(x, y, 10, `hsl(${(i * 29) % 360},20%,${25 + (i % 4) * 5}%)`); }
  // 도효
  g.poly([[60, 600], [840, 600], [760, 430], [140, 430]], '#a16207');
  c.beginPath(); c.ellipse(CX, 430, 330, 60, 0, 0, Math.PI * 2); c.fillStyle = '#e7c98b'; c.fill();
  c.beginPath(); c.ellipse(CX, 430, RING + 10, 44, 0, 0, Math.PI * 2); c.strokeStyle = '#d6d3d1'; c.lineWidth = 8; c.stroke();
  c.beginPath(); c.ellipse(CX, 430, RING + 10, 44, 0, 0, Math.PI * 2); c.strokeStyle = '#78716c'; c.lineWidth = 2; c.stroke();
  g.line(CX - 40, 422, CX - 40, 438, '#fff', 4); g.line(CX + 40, 422, CX + 40, 438, '#fff', 4);
  // 위험 표시
  const pX = CX + b.pos - 45, cX = CX + b.pos + 45;
  if (b.ph === 'fight') {
    if (pX - 25 < CX - RING + 50) g.text('⚠', CX - RING, 380, 30);
    if (cX + 25 > CX + RING - 50) g.text('⚠', CX + RING, 380, 30);
  }
  // 교지
  g.circle(CX, 250, 16, '#f5d0a9'); g.rrect(CX - 22, 266, 44, 60, 10, '#7c3aed'); g.poly([[CX + 18, 270], [CX + 46, 252], [CX + 44, 282]], '#fde047');
  // 선수
  const pFall = b.ph === 'end' && b.winner === 1 ? b.fall : 0, cFall = b.ph === 'end' && b.winner === 0 ? b.fall : 0;
  const ready = b.ph === 'ready';
  const pxx = ready ? CX - 110 : pX, cxx = ready ? CX + 110 : cX;
  drawWrestler(g, c, pxx, 1, '#1d4ed8', '#f2c79a', ready ? 0.6 : b.lean + Math.min(0.6, b.pw * 0.12), pFall, b.v < 0 ? -1 : 1, b.ph === 'fight' && b.mashT > 0);
  drawWrestler(g, c, cxx, -1, R.col, '#e8b98c', ready ? 0.6 : Math.min(0.5, b.cpuF * 0.12), cFall, b.v > 0 ? -1 : 1, b.ph === 'fight');
  g.text('나', pxx, GY - 250, 16, '#93c5fd'); g.text(R.n, cxx, GY - 250, 15, '#fca5a5');
  // 다치아이 신호
  if (ready) {
    g.rrect(300, 470, 300, 60, 12, 'rgba(0,0,0,.6)');
    if (b.sig) { g.text('!', CX, 200, 90, '#ef4444'); g.text('지금! Space', CX, 500, 24, '#fde047'); }
    else g.text('시키리... 신호를 기다려라', CX, 500, 18, '#e7e5e4');
  }
  if (b.ph === 'fight') {
    // 힘 비교 바
    const pf = b.pw * 1.05 * (0.6 + b.pBal * 0.4), cf = b.cpuF, tot = pf + cf || 1;
    g.rrect(250, 540, 400, 22, 8, 'rgba(0,0,0,.6)');
    g.rrect(252, 542, 396 * (pf / tot), 18, 6, '#3b82f6'); g.rrect(252 + 396 * (pf / tot), 542, 396 * (cf / tot), 18, 6, '#ef4444');
    g.text('힘 겨루기 — Space 연타!', CX, 525, 14, '#fff');
    // 링
    if (b.ring) {
      const k = b.ring.t / b.ring.T, rx = 800, ry = 470, tr = 30, r = tr + (1 - k / 0.8) * 80;
      g.circle(rx, ry, 52, 'rgba(0,0,0,.45)');
      g.ring(rx, ry, tr, '#fde047', 4); g.ring(rx, ry, Math.max(4, r), Math.abs(k - 0.8) < 0.08 ? '#22c55e' : '#fff', 3);
      g.text('X', rx, ry, 20, '#fff');
    }
    // 이벤트 경고
    if (b.ev) {
      const e = b.ev, warn = e.t < e.warn;
      if (e.type === 'slap' && warn) { g.rrect(270, 140, 360, 56, 12, 'rgba(234,88,12,.9)'); g.text('⚠ 피하기 예고 — 연타 멈춰!', CX, 168, 22, '#fff'); }
      if (e.type === 'surge') { g.rrect(300, 140, 300, 50, 12, 'rgba(185,28,28,.85)'); g.text('💢 상대 돌진! 연타!!', CX, 165, 22, '#fff'); }
      if (e.type === 'throw' && !e.done) { g.rrect(290, 130, 320, 76, 12, 'rgba(124,58,237,.9)'); g.text('던지기! 방향키로 버텨라', CX, 152, 18, '#fff'); g.text(e.dir === 'left' ? '⬅' : '➡', CX, 186, 34, '#fde047'); }
    }
  }
  // HUD
  g.rrect(10, 80, 260, 110, 10, 'rgba(0,0,0,.65)');
  g.text(`${S.day + 1}일차 / 7일`, 20, 98, 16, '#fde047', 'left');
  g.text(`전적 ${wins()}승 ${S.rec.length - wins()}패`, 20, 122, 15, '#fff', 'left');
  S.rec.forEach((r, i) => g.text(r ? '○' : '●', 20 + i * 22, 146, 18, r ? '#fde047' : '#94a3b8', 'left'));
  const bar = (x, y, v, col, l) => { g.text(l, x, y, 12, '#cbd5e1', 'left'); g.rrect(x + 50, y - 6, 140, 12, 4, 'rgba(255,255,255,.1)'); g.rrect(x + 50, y - 6, 140 * U.clamp(v, 0, 1), 12, 4, col); };
  bar(20, 170, b.stam, '#38bdf8', '스태미나');
  g.rrect(630, 80, 260, 70, 10, 'rgba(0,0,0,.65)');
  bar(640, 102, b.pBal, '#22c55e', '내 균형'); bar(640, 128, b.cBal, '#f87171', '상대 균형');
  if (S.msgT > 0) { g.rrect(250, 210, 400, 50, 12, 'rgba(0,0,0,.7)'); g.text(S.msg, CX, 235, 22, S.msgC); }
  if (b.ph === 'between') {
    const N = RIVALS[S.day];
    g.rrect(200, 180, 500, 370, 18, 'rgba(0,0,0,.88)', '#fde047', 3);
    g.text(`${S.day}일차 종료 — ${wins()}승 ${S.rec.length - wins()}패`, CX, 230, 26, '#fde047');
    g.text(`다음 상대: ${N.n}`, CX, 300, 22, '#fff');
    g.text(`힘 ${Math.round(N.s * 100)} · 반응 ${Math.round(N.rt * 1000)}ms`, CX, 340, 16, '#cbd5e1');
    g.text(`현재 지위: ${RANKS[Math.min(6, wins())]}`, CX, 390, 18, '#86efac');
    g.button(330, 470, 240, 54, '다음 대전 ▶', '#b91c1c', 22);
  }
}
