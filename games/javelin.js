'use strict';
let S;
const TF = { PX: 34, LANE0: 290, LH: 58, EV: ['100m 달리기', '멀리뛰기', '창던지기', '110m 허들'], KEY: ['dash', 'lj', 'jv', 'hurdle'] };
const TF_AI = [{ n: '번개 볼트', e: '🔴', s: 0.97 }, { n: '치타 김', e: '🟢', s: 0.93 }, { n: '로켓 박', e: '🟡', s: 0.89 }];
const TF_MEDAL = [5, 3, 2, 1];

GAME({
  title: '육상 경기 대회', w: 960, h: 540, bg: '#2a6f3a', controls: 'lr+ab', aLabel: '점프/던지기', bLabel: '달리기',
  help: '달리기: ← → 를 번갈아 연타! (Shift/X + ← 도 OK) — 빠를수록 가속\n멀리뛰기: 연타로 달려서 발판 직전에 Space 꾹 → 각도 올라감 → 놓기 (약 40°)\n창던지기: 연타로 달려 파울라인 전에 Space 꾹 → 놓기 (약 38°)\n허들: 연타로 달리며 허들 앞에서 Space 점프\n4종목 순위 점수 합계로 메달 결정 · 출발 신호 전 연타 = 부정출발!',
  init(g) {
    S = { ev: 0, pts: [0, 0, 0, 0], perf: [], phase: 'intro', t: 0, msg: '', msgT: 0, falses: 0, table: null };
    setupEvent(g);
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt; S.pt += dt;
    const E = TF.KEY[S.ev];
    if (S.phase === 'intro') { if (S.pt > 0.8 && (g.pressed('a') || g.mouse.clicked)) startReady(g); return hud(g); }
    if (S.phase === 'ready') {
      const runKey = g.pressed('left') || g.pressed('right') || g.pressed('b');
      if (E === 'dash' || E === 'hurdle') {
        if (runKey && S.pt < S.goAt) { S.falses++; g.sfx.hit(); if (S.falses >= 2) { flash('부정 출발 2회 — 실격!', '#ff5252', 2); S.me.time = 99; S.me.done = true; S.phase = 'run'; S.pt = 0; return; } flash('부정 출발! 한 번 더하면 실격', '#ff5252', 1.8); S.pt = 0; S.goAt = U.rand(1.6, 2.8); S.beeps = 0; return; }
        const stage = S.pt < S.goAt * 0.45 ? 0 : S.pt < S.goAt ? 1 : 2;
        if (stage > S.beeps) { S.beeps = stage; g.sfx.beep(stage === 2 ? 880 : 440, stage === 2 ? 0.35 : 0.15); if (stage === 2) { S.phase = 'run'; S.pt = 0; flash('GO!', '#fff', 0.8); } }
      } else if (S.pt > 1) { S.phase = 'run'; S.pt = 0; }
      return hud(g);
    }
    if (S.phase === 'run') { runInput(g, dt); if (E === 'dash' || E === 'hurdle') updRace(g, dt, E); else updField(g, dt, E); }
    else if (S.phase === 'flight') updFlight(g, dt, E);
    else if (S.phase === 'between') { if (S.pt > 1.6 && (g.pressed('a') || g.mouse.clicked || S.pt > 3.5)) { S.attempt++; resetAttempt(); S.phase = 'ready'; S.pt = 0; } }
    else if (S.phase === 'result') { if (S.pt > 1.2 && (g.pressed('a') || g.mouse.clicked)) { S.ev++; if (S.ev >= 4) return finish(g); setupEvent(g); } }
    for (const p of S.dust) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
    S.dust = S.dust.filter((p) => p.t > 0);
    hud(g);
  },
  draw(g, c) {
    const E = TF.KEY[S.ev];
    drawStadium(g, c, E);
    if (E === 'dash' || E === 'hurdle') for (const r of S.racers) drawRunner(g, c, r);
    else drawFieldAthlete(g, c, E);
    for (const p of S.dust) g.circle(p.x - S.cam, p.y, 3, `rgba(220,200,160,${p.t * 2})`);
    g.rrect(10, 8, 360, 52, 10, 'rgba(0,0,0,.55)');
    g.text(`종목 ${S.ev + 1}/4 · ${TF.EV[S.ev]}`, 22, 25, 17, '#fff', 'left');
    if (E === 'dash' || E === 'hurdle') g.text(`⏱ ${S.phase === 'run' || S.me.done ? (S.me.done ? S.me.time : S.raceT).toFixed(2) : '0.00'}초`, 22, 47, 15, '#ffeb3b', 'left');
    else g.text(`시기 ${S.attempt + 1}/2 · 최고 ${S.me.best > 0 ? S.me.best.toFixed(2) + 'm' : '-'}`, 22, 47, 15, '#ffeb3b', 'left');
    g.rect(390, 20, 200, 16, 'rgba(0,0,0,.5)'); g.rect(390, 20, 200 * U.clamp(S.me.v / 12, 0, 1), 16, S.me.v > 10 ? '#76ff03' : '#ffca28');
    g.text('스피드', 600, 28, 13, '#fff', 'left');
    g.rrect(700, 8, 250, 52, 10, 'rgba(0,0,0,.55)');
    const names = ['나 🔵', ...TF_AI.map((a) => a.n + ' ' + a.e)];
    names.forEach((n, i) => g.text(`${n} ${S.pts[i]}`, 712 + (i % 2) * 124, 22 + Math.floor(i / 2) * 22, 12, i === 0 ? '#80d8ff' : '#fff', 'left'));
    if (S.phase === 'intro') drawIntro(g);
    if (S.phase === 'ready' && (E === 'dash' || E === 'hurdle')) g.text(['제자리에…', '차렷…', 'GO!'][S.beeps || 0], 480, 140, 44, '#fff');
    if (S.angling) drawAngle(g, c);
    if (S.phase === 'result') drawTable(g);
    if (S.msgT > 0) g.text(S.msg, 480, 190, 34, S.msgC);
  },
});

function hud(g) { g.info = `${TF.EV[S.ev]} · 순위점수 ${S.pts[0]}`; }
function flash(m, c, t) { S.msg = m; S.msgC = c || '#fff'; S.msgT = t || 1.5; }
function setupEvent(g) {
  S.phase = 'intro'; S.pt = 0; S.falses = 0; S.attempt = 0; S.dust = [];
  S.me = { x: 0, v: 0, last: null, best: 0, time: 0, done: false, ai: false, lane: 3, jump: 0, y: 0, stumble: 0, marks: [] };
  S.racers = [S.me, ...TF_AI.map((a, i) => ({ x: 0, v: 0, time: 0, done: false, ai: true, lane: i, sk: a.s * U.rand(0.97, 1.03), jump: 0, y: 0, stumble: 0, info: a }))];
  const E = TF.KEY[S.ev];
  S.hurdles = []; if (E === 'hurdle') for (let k = 0; k < 10; k++) S.hurdles.push(13.72 + k * 9.14);
  S.hitH = S.racers.map(() => new Set());
  S.fieldAI = TF_AI.map((a) => { const sk = a.s * U.rand(0.95, 1.04); return E === 'lj' ? Math.max(0, 8.4 * sk + U.rand(-0.4, 0.3)) : E === 'jv' ? Math.max(0, 84 * sk + U.rand(-6, 4)) : 0; });
  resetAttempt();
}
function resetAttempt() { Object.assign(S.me, { x: 0, v: 0, last: null, jump: 0, y: 0, stumble: 0, done: false }); S.raceT = 0; S.angling = false; S.ang = 0; S.fl = null; S.cam = -200; S.beeps = 0; S.goAt = U.rand(1.6, 2.8); }
function startReady(g) { S.phase = 'ready'; S.pt = 0; S.beeps = 0; g.sfx.click(); }

function runInput(g, dt) {
  const m = S.me;
  if (m.done || S.angling || m.locked) return;
  let k = null;
  if (g.pressed('left')) k = 'L'; else if (g.pressed('right')) k = 'R'; else if (g.pressed('b')) k = m.last === 'L' ? 'R' : 'L';
  if (k) {
    if (k !== m.last) m.v += 0.7; else m.v += 0.12;
    m.last = k;
    if (Math.random() < 0.4) S.dust.push({ x: m.x * TF.PX - 10, y: laneY(m.lane) + 22, vx: -60, vy: -30, t: 0.4 });
  }
}
function laneY(l) { return TF.LANE0 + l * TF.LH; }
function updRace(g, dt, E) {
  S.raceT += dt;
  const len = E === 'dash' ? 100 : 110;
  for (let i = 0; i < S.racers.length; i++) {
    const r = S.racers[i];
    if (r.done) { r.v *= Math.pow(0.3, dt); r.x += r.v * dt; continue; }
    if (r.ai) {
      const vmax = (E === 'dash' ? 11.6 : 10.8) * r.sk;
      r.v = vmax * (1 - Math.exp(-S.raceT / 1.1)) * (r.stumble > 0 ? 0.55 : 1);
      if (E === 'hurdle') for (const h of S.hurdles) if (h - r.x > 1.6 && h - r.x < 1.9 && r.jump <= 0) { r.jump = 0.48; r.badJump = Math.random() > r.sk * 0.95; }
    } else {
      r.v -= r.v * 0.55 * dt; r.v = Math.min(12, r.v); if (r.stumble > 0) r.v *= Math.pow(0.4, dt);
      if (E === 'hurdle' && g.pressed('a') && r.jump <= 0) { r.jump = 0.48; g.sfx.jump(); }
    }
    r.stumble -= dt;
    if (r.jump > 0) { r.jump -= dt; r.y = Math.sin((1 - r.jump / 0.48) * Math.PI) * 30; } else r.y = 0;
    r.x += r.v * dt;
    if (E === 'hurdle') for (const h of S.hurdles) {
      if (Math.abs(r.x - h) < 0.35 && !S.hitH[i].has(h)) {
        const clear = r.jump > 0 && r.y > 16 && !r.badJump;
        if (!clear) { S.hitH[i].add(h); r.stumble = 0.6; if (!r.ai) { g.sfx.hit(); g.shake(4, 0.2); flash('허들 걸림!', '#ff8a80', 0.8); r.v *= 0.6; } }
        else if (!r.ai) { S.hitH[i].add(h); g.sfx.tone(700, 0.04, 'sine', 0.04); }
        else S.hitH[i].add(h);
      }
    }
    if (r.x >= len) { r.done = true; r.time = Math.round(S.raceT * 100) / 100; if (!r.ai) { g.sfx.power(); flash(`골인! ${r.time.toFixed(2)}초`, '#ffeb3b', 2); } }
  }
  const fx = S.me.time >= 99 ? Math.max(...S.racers.map((r) => r.x)) : S.me.x;
  S.cam = U.lerp(S.cam, fx * TF.PX - 300, 0.2);
  if (S.racers.every((r) => r.done) || S.raceT > 40) {
    for (const r of S.racers) if (!r.done) { r.done = true; r.time = 99; }
    finishEvent(g, S.racers.map((r) => r.time), true);
  }
}
function updField(g, dt, E) {
  const m = S.me, line = E === 'lj' ? 40 : 30;
  if (!S.angling) { m.v -= m.v * 0.5 * dt; m.v = Math.min(12, m.v); m.x += m.v * dt; }
  S.cam = U.lerp(S.cam, m.x * TF.PX - 300, 0.2);
  if (!S.angling && (g.pressed('a') || g.mouse.clicked) && m.x > 3) { S.angling = true; S.ang = 0; S.takeX = m.x; S.relV = m.v; g.sfx.tone(400, 0.1, 'triangle', 0.05); }
  if (S.angling) {
    S.ang = Math.min(85, S.ang + 75 * dt);
    if ((!g.held('a') && !g.mouse.down) || S.ang >= 85) release(g, E, line);
  }
  if (!S.angling && m.x > line + 0.2) { foul(g, '파울! 라인을 넘었다'); }
}
function release(g, E, line) {
  const m = S.me; S.angling = false; m.locked = false;
  const foulT = S.takeX > line;
  const th = S.ang * Math.PI / 180;
  if (foulT) return foul(g, '파울! 발판을 밟고 넘음');
  let d, v = S.relV;
  if (E === 'lj') { d = (v * v * Math.sin(2 * th)) / 9.8 * 0.6 - (line - S.takeX); d = Math.max(0.5, d); S.fl = { k: 'lj', x0: S.takeX, d, t: 0, T: 0.9, th }; }
  else { const rv = v * 0.9 + 18.5; d = (rv * rv * Math.sin(2 * th)) / 9.8 * (S.ang > 40 ? 1 - (S.ang - 40) * 0.012 : 1) - (line - S.takeX); d = Math.max(3, d); S.fl = { k: 'jv', x0: S.takeX, d, t: 0, T: 1.2 + d / 60, th }; }
  S.phase = 'flight'; S.pt = 0; g.sfx[E === 'lj' ? 'jump' : 'shoot']();
}
function foul(g, why) { S.angling = false; g.sfx.lose(); flash(why, '#ff5252', 1.8); S.me.v = 0; S.me.marks.push('X'); endAttempt(g, 0); }
function updFlight(g, dt, E) {
  const F = S.fl; F.t += dt;
  const m = S.me; m.v *= Math.pow(0.2, dt);
  if (E === 'lj') { m.x = F.x0 + F.d * Math.min(1, F.t / F.T); m.y = Math.sin(Math.min(1, F.t / F.T) * Math.PI) * 60; S.cam = U.lerp(S.cam, m.x * TF.PX - 300, 0.2); }
  else { F.jx = F.x0 + F.d * Math.min(1, F.t / F.T); S.cam = U.lerp(S.cam, F.x0 * TF.PX + (F.jx - F.x0) * TF.PX * 0.25 - 420, 0.12); }
  if (F.t >= F.T) {
    const d = Math.round(F.d * 100) / 100;
    if (E === 'lj') { m.y = 0; for (let i = 0; i < 16; i++) S.dust.push({ x: m.x * TF.PX, y: laneY(3) + 20, vx: U.rand(-120, 120), vy: U.rand(-120, -20), t: 0.5 }); }
    g.sfx.drop(); g.shake(3, 0.15);
    flash(`${d.toFixed(2)}m!`, '#ffeb3b', 1.8); m.marks.push(d.toFixed(2));
    endAttempt(g, d);
  }
}
function endAttempt(g, d) {
  const m = S.me; m.best = Math.max(m.best, d);
  if (S.attempt >= 1) { S.phase = 'result'; S.pt = 0; finishEvent(g, [m.best, ...S.fieldAI], false); }
  else { S.phase = 'between'; S.pt = 0; }
}
function finishEvent(g, vals, lowerBetter) {
  const order = vals.map((v, i) => i).sort((a, b) => (lowerBetter ? vals[a] - vals[b] : vals[b] - vals[a]));
  const place = []; order.forEach((idx, rank) => (place[idx] = rank));
  for (let i = 0; i < 4; i++) S.pts[i] += TF_MEDAL[place[i]];
  const E = TF.KEY[S.ev], mv = vals[0];
  let perf = 0;
  if (E === 'dash') perf = Math.max(0, (16 - mv)) * 250;
  else if (E === 'hurdle') perf = Math.max(0, (20 - mv)) * 200;
  else if (E === 'lj') perf = mv * 120;
  else perf = mv * 12;
  perf = Math.round(perf) + [600, 300, 150, 0][place[0]];
  g.add(perf);
  S.table = { vals, place, unit: lowerBetter ? '초' : 'm', perf };
  S.phase = 'result'; S.pt = 0;
  if (place[0] === 0) { g.sfx.win(); g.burst(480, 200, ['#ffd700', '#fff', '#ff5252'], 40, 300, 1); } else g.sfx.coin();
}
function finish(g) {
  const order = [0, 1, 2, 3].sort((a, b) => S.pts[b] - S.pts[a] || (a === 0 ? -1 : b === 0 ? 1 : 0));
  const rank = order.indexOf(0);
  const medal = ['🥇 금메달', '🥈 은메달', '🥉 동메달', '4위'][rank];
  if (rank === 0) { g.add(2000); g.win(`${medal}! 순위점수 ${S.pts[0]}`); }
  else { g.add([0, 800, 400, 0][rank]); g.over(`${medal} · 순위점수 ${S.pts[0]} (1위 ${S.pts[order[0]]})`); }
}

function drawStadium(g, c, E) {
  const sky = c.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#1e3c72'); sky.addColorStop(1, '#5b86e5');
  c.fillStyle = sky; c.fillRect(0, 0, 960, 200);
  g.rect(0, 120, 960, 140, '#37474f');
  for (let i = 0; i < 80; i++) { const x = ((i * 23 - S.cam * 0.3) % 960 + 960) % 960, y = 135 + (i * 37) % 110; g.circle(x, y, 6, ['#ef5350', '#fff176', '#64b5f6', '#81c784', '#ffb74d'][i % 5]); }
  g.rect(0, 255, 960, 10, '#eceff1');
  g.rect(0, 265, 960, 275, '#c0392b');
  for (let l = 0; l <= 4; l++) g.line(0, laneY(l) - 25, 960, laneY(l) - 25, '#fff', 2);
  const step = 10 * TF.PX;
  for (let x = Math.floor(S.cam / step) * step; x < S.cam + 960 + step; x += step) { const sx = x - S.cam; if (x >= 0) { g.line(sx, 265, sx, 275, '#fff', 2); g.text(`${Math.round(x / TF.PX)}`, sx, 282, 10, 'rgba(255,255,255,.6)'); } }
  if (E === 'dash' || E === 'hurdle') {
    const len = E === 'dash' ? 100 : 110, fx = len * TF.PX - S.cam;
    for (let y = 265; y < 540; y += 12) g.rect(fx, y, 8, 6, (y / 12) % 2 ? '#000' : '#fff');
    g.line(-S.cam, 265, -S.cam, 540, '#fff', 4);
    if (E === 'hurdle') for (const h of S.hurdles) for (let l = 0; l < 4; l++) { const hx = h * TF.PX - S.cam, hy = laneY(l) + 22; if (hx < -20 || hx > 980) continue; const down = S.hitH[l === 3 ? 0 : l + 1].has(h); if (down) g.line(hx - 4, hy, hx + 14, hy - 6, '#fff', 4); else { g.line(hx, hy, hx, hy - 30, '#455a64', 3); g.rect(hx - 3, hy - 32, 8, 8, '#fff'); g.rect(hx - 3, hy - 32, 8, 3, '#000'); } }
  } else {
    const line = E === 'lj' ? 40 : 30, lx = line * TF.PX - S.cam;
    if (E === 'lj') { g.rect(lx - 8, 265, 16, 275, '#fff'); g.rect(lx + 2 * TF.PX - 0, 265 + 40, 10 * TF.PX, 220, '#e6c88f'); for (let m = 5; m <= 9; m++) { const mx = (line + m) * TF.PX - S.cam; g.line(mx, 300, mx, 310, '#5d4037', 2); g.text(`${m}m`, mx, 296, 11, '#fff'); } }
    else { g.rect(0, 265, 960, 275, '#43a047'); g.rect(-S.cam, 400, line * TF.PX, 60, '#c0392b'); g.line(lx, 395, lx, 465, '#fff', 5); }
  }
}
function drawRunner(g, c, r) {
  const x = r.x * TF.PX - S.cam, y = laneY(r.lane);
  if (x < -60 || x > 1020) return;
  g.circle(x, y + 22, 14, 'rgba(0,0,0,.25)');
  c.save(); c.translate(x, y - r.y); c.scale(-1, 1);
  if (r.stumble > 0) c.rotate(-0.4);
  const bob = r.v > 1 ? Math.abs(Math.sin(S.t * (6 + r.v))) * 4 : 0;
  g.emoji('🏃', 0, -bob, 46);
  c.restore();
  g.text(r.ai ? r.info.e : '🔵', x, y - 34 - r.y, 14);
  if (r.done) g.text(r.time >= 99 ? '실격' : r.time.toFixed(2), x + 40, y - 20, 13, '#fff');
}
function drawFieldAthlete(g, c, E) {
  const m = S.me, y = laneY(3) - 40;
  const x = m.x * TF.PX - S.cam;
  c.save(); c.translate(x, y - (m.y || 0)); c.scale(-1, 1);
  const bob = m.v > 1 && S.phase === 'run' ? Math.abs(Math.sin(S.t * (6 + m.v))) * 4 : 0;
  g.emoji(S.phase === 'flight' && E === 'lj' ? '🤸' : '🏃', 0, -bob, 56);
  c.restore();
  if (E === 'jv') {
    if (S.phase !== 'flight' && S.phase !== 'result' && S.phase !== 'between') { c.save(); c.translate(x + 6, y - 30); c.rotate(-(S.angling ? S.ang : 10) * Math.PI / 180); g.line(-40, 0, 40, 0, '#eceff1', 3); g.poly([[40, -2], [50, 0], [40, 2]], '#b0bec5'); c.restore(); }
    else if (S.fl) {
      const F = S.fl, p = Math.min(1, F.t / F.T), jx = (F.x0 + (F.d) * p);
      const sx = F.x0 * TF.PX - S.cam + (jx - F.x0) * TF.PX * 0.25, sy = y - 30 - Math.sin(p * Math.PI) * (40 + F.d * 2.2);
      const ang = Math.atan2(-Math.cos(p * Math.PI) * (40 + F.d * 2.2) * Math.PI, F.d * TF.PX * 0.25);
      c.save(); c.translate(sx, sy); c.rotate(-ang); g.line(-30, 0, 30, 0, '#eceff1', 3); g.poly([[30, -2], [40, 0], [30, 2]], '#b0bec5'); c.restore();
      for (let mm = 10; mm <= 100; mm += 10) { const mx = F.x0 * TF.PX - S.cam + mm * TF.PX * 0.25; g.line(mx, 470, mx, 480, '#fff', 2); g.text(`${mm}m`, mx, 492, 11, '#fff'); }
      for (let k = 0; k < 3; k++) { const ax = F.x0 * TF.PX - S.cam + S.fieldAI[k] * TF.PX * 0.25; g.text(TF_AI[k].e, ax, 460, 14); }
      if (m.best > 0) g.text('🔵', F.x0 * TF.PX - S.cam + m.best * TF.PX * 0.25, 460, 14);
    }
  } else if (E === 'lj') {
    for (let k = 0; k < 3; k++) { const ax = (40 + S.fieldAI[k]) * TF.PX - S.cam; g.text(TF_AI[k].e, ax, 430, 14); g.line(ax, 440, ax, 455, '#fff', 2); }
    if (m.best > 0) { const ax = (40 + m.best) * TF.PX - S.cam; g.text('🔵', ax, 430, 14); }
  }
  const tips = { lj: '← → 연타로 달리고, 흰 발판 직전에 Space 꾹 → 놓기', jv: '← → 연타로 달리고, 흰 라인 전에 Space 꾹 → 놓기' };
  if (S.phase === 'run' && !S.angling) g.text(tips[E], 480, 520, 16, '#fff');
  if (S.phase === 'between') g.text(`2차 시기 준비… (Space)`, 480, 230, 24, '#fff');
  g.text(`기록: ${m.marks.join('  /  ') || '-'}`, 940, 80, 15, '#fff', 'right');
}
function drawAngle(g, c) {
  const cx = 480, cy = 230, R = 70;
  g.rrect(cx - 90, cy - 90, 180, 110, 12, 'rgba(0,0,0,.55)');
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.arc(cx - 60, cy, R, -Math.PI / 2, 0); c.stroke();
  const best = TF.KEY[S.ev] === 'lj' ? 40 : 38, ba = best * Math.PI / 180;
  g.line(cx - 60, cy, cx - 60 + Math.cos(ba) * R, cy - Math.sin(ba) * R, 'rgba(118,255,3,.6)', 6);
  const a = S.ang * Math.PI / 180;
  g.line(cx - 60, cy, cx - 60 + Math.cos(a) * R, cy - Math.sin(a) * R, '#ffeb3b', 4);
  g.text(`${Math.round(S.ang)}°`, cx + 40, cy - 30, 28, '#ffeb3b');
}
function drawIntro(g) {
  g.rrect(230, 150, 500, 220, 16, 'rgba(0,0,0,.75)', '#fff', 2);
  g.text(`종목 ${S.ev + 1}: ${TF.EV[S.ev]}`, 480, 190, 30, '#ffeb3b');
  const tx = { dash: ['← → 를 번갈아 빠르게 연타!', '"GO!" 전에 누르면 부정 출발'], lj: ['연타로 도움닫기 → 발판 직전 Space 꾹', '각도 약 40°에서 놓기 · 2번의 시기'], jv: ['연타로 도움닫기 → 라인 전 Space 꾹', '각도 약 38°에서 놓기 · 2번의 시기'], hurdle: ['← → 연타 + 허들 앞에서 Space 점프', '허들에 걸리면 감속! 10개의 허들'] }[TF.KEY[S.ev]];
  g.text(tx[0], 480, 245, 20, '#fff'); g.text(tx[1], 480, 280, 18, '#b3e5fc');
  g.text('Space / 클릭으로 시작', 480, 335, 18, '#ffeb3b');
}
function drawTable(g) {
  const T = S.table;
  g.rrect(250, 130, 460, 260, 16, 'rgba(0,0,0,.8)', '#ffd700', 2);
  g.text(`${TF.EV[S.ev]} 결과`, 480, 160, 26, '#ffd700');
  const names = ['나 🔵', ...TF_AI.map((a) => `${a.n} ${a.e}`)];
  const order = [0, 1, 2, 3].sort((a, b) => T.place[a] - T.place[b]);
  order.forEach((i, r) => {
    const y = 200 + r * 36, v = T.vals[i];
    g.text(['🥇', '🥈', '🥉', '4'][r], 290, y, 22, '#fff');
    g.text(names[i], 320, y, 18, i === 0 ? '#80d8ff' : '#fff', 'left');
    g.text(v >= 99 ? '실격' : v <= 0 ? '파울' : `${v.toFixed(2)}${T.unit}`, 600, y, 18, '#fff', 'right');
    g.text(`+${TF_MEDAL[r]}`, 680, y, 16, '#ffeb3b', 'right');
  });
  g.text(`성적 점수 +${T.perf} · Space로 계속`, 480, 365, 16, '#b0bec5');
}
