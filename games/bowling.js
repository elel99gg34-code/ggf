let S;
const LX = 330, LW = 240, TOP = 60, BOT = 860, BR = 15, PR = 9;
GAME({
  title: '볼링', w: 900, h: 900, bg: '#1c1917', controls: 'none',
  help: '1) 좌우로 움직이는 공 위치에서 클릭\n2) 흔들리는 방향 화살표에서 클릭\n3) 파워 게이지에서 클릭 → 굴러갑니다!\n10프레임 정식 점수 계산 (스트라이크 X · 스페어 /)',
  init(g) { S = { frame: 0, roll: 0, frames: [], phase: 'pos', t: 0, ball: null, pins: [], msg: '', wait: 0 }; rackPins(); resetBall(); },
  update(g, dt) {
    S.t += dt;
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) afterRoll(g); return; }
    const click = g.mouse.clicked || g.pressed('a');
    if (S.phase === 'pos') { S.bx = LX + LW / 2 + Math.sin(S.t * 2) * (LW / 2 - BR - 4); if (click) { S.phase = 'aim'; S.t = 0; g.sfx.click(); } }
    else if (S.phase === 'aim') { S.ang = Math.sin(S.t * 2.5) * 0.12; if (click) { S.phase = 'pow'; S.t = 0; g.sfx.click(); } }
    else if (S.phase === 'pow') { S.pow = (Math.sin(S.t * 3 - Math.PI / 2) + 1) / 2; if (click) { S.phase = 'roll'; S.ball = { x: S.bx, y: BOT - 30, vx: Math.sin(S.ang) * (300 + S.pow * 600) + U.rand(-40, 40), vy: -Math.cos(S.ang) * (300 + S.pow * 600), hook: -S.ang * 160, gutter: false }; g.sfx.tone(90, 0.8, 'triangle', 0.06); } }
    else if (S.phase === 'roll') {
      const sub = 6;
      for (let i = 0; i < sub; i++) physics(g, dt / sub);
      const b = S.ball;
      const still = S.pins.every((p) => Math.hypot(p.vx, p.vy) < 5);
      if ((b.y < TOP - 40 || b.done) && still) { S.ball.done = true; S.wait = 0.8; }
    }
    g.info = `프레임 ${Math.min(10, S.frame + 1)} · ${S.roll + 1}구`;
  },
  draw(g, c) {
    g.rect(LX - 40, 0, LW + 80, 900, '#292524');
    g.rect(LX - 30, 0, 26, 900, '#44403c'); g.rect(LX + LW + 4, 0, 26, 900, '#44403c');
    const grd = c.createLinearGradient(LX, 0, LX + LW, 0); grd.addColorStop(0, '#d6a86b'); grd.addColorStop(0.5, '#f0cf9c'); grd.addColorStop(1, '#d6a86b'); c.fillStyle = grd; c.fillRect(LX, 0, LW, 900);
    for (let x = LX; x < LX + LW; x += 16) g.line(x, 0, x, 900, 'rgba(120,80,40,.25)', 1);
    for (let i = 0; i < 7; i++) g.poly([[LX + 30 + i * 30, 640], [LX + 24 + i * 30, 660], [LX + 36 + i * 30, 660]], '#7c2d12');
    g.line(LX, BOT, LX + LW, BOT, '#7c2d12', 3);
    for (const p of S.pins) { if (p.down && (p.x < LX || p.x > LX + LW || p.y < TOP - 30)) continue; c.globalAlpha = p.down ? 0.5 : 1; g.circle(p.x, p.y, PR, '#fafafa'); g.ring(p.x, p.y, PR, '#dc2626', 2); g.circle(p.x, p.y, 3, '#dc2626'); c.globalAlpha = 1; }
    const b = S.ball, bx = b ? b.x : S.bx, by = b ? b.y : BOT - 30;
    g.circle(bx, by, BR, '#1d4ed8'); g.circle(bx - 4, by - 5, 3, '#93c5fd'); g.circle(bx + 3, by - 6, 2.5, '#0f172a'); g.circle(bx + 6, by - 1, 2.5, '#0f172a');
    if (S.phase === 'aim' || S.phase === 'pow') { const a = S.ang || 0; g.line(S.bx, BOT - 30, S.bx + Math.sin(a) * 260, BOT - 30 - Math.cos(a) * 260, 'rgba(239,68,68,.8)', 4); }
    if (S.phase === 'pow') { g.rrect(LX + LW + 50, 500, 30, 340, 8, '#1e293b'); g.rect(LX + LW + 54, 836 - 332 * S.pow, 22, 332 * S.pow, S.pow > 0.8 ? '#ef4444' : '#22c55e'); }
    const hint = { pos: '① 위치를 정하세요 (클릭)', aim: '② 방향을 정하세요 (클릭)', pow: '③ 파워! (클릭)' }[S.phase];
    if (hint) g.text(hint, LX + LW / 2, 880, 18, '#fde047');
    drawCard(g);
    if (S.wait > 0 && S.msg) g.text(S.msg, LX + LW / 2, 400, 52, '#fde047');
  },
});
function rackPins() {
  S.pins = [];
  const cx = LX + LW / 2, y0 = 140, dx = 28, dy = 26;
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) S.pins.push({ x: cx + (i - r / 2) * dx, y: y0 - r * dy + 60, vx: 0, vy: 0, down: false, ox: 0, oy: 0 });
  S.pins.forEach((p) => { p.ox = p.x; p.oy = p.y; });
}
function resetBall() { S.ball = null; S.phase = 'pos'; S.t = U.rand(3); }
function physics(g, dt) {
  const b = S.ball;
  if (!b.gutter) { b.vx += b.hook * dt * (b.y < 500 ? 1.5 : 0.3); b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < LX + BR - 4 || b.x > LX + LW - BR + 4) { b.gutter = true; b.x = b.x < LX + LW / 2 ? LX - 17 : LX + LW + 17; g.sfx.drop(); } }
  else b.y += b.vy * dt;
  const objs = [b.gutter ? null : { o: b, r: BR, m: 2.4 }, ...S.pins.map((p) => ({ o: p, r: PR, m: 1 }))].filter(Boolean);
  for (const p of S.pins) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.25, dt); p.vy *= Math.pow(0.25, dt); if (!p.down && (Math.hypot(p.x - p.ox, p.y - p.oy) > 6)) { p.down = true; } if (p.x < LX - 10 || p.x > LX + LW + 10) { p.down = true; p.vx *= 0.3; } }
  for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
    const A = objs[i], B = objs[j], dx = B.o.x - A.o.x, dy = B.o.y - A.o.y, d = Math.hypot(dx, dy), md = A.r + B.r;
    if (d < md && d > 0) {
      const nx = dx / d, ny = dy / d, ov = md - d, tm = A.m + B.m;
      A.o.x -= nx * ov * (B.m / tm); A.o.y -= ny * ov * (B.m / tm); B.o.x += nx * ov * (A.m / tm); B.o.y += ny * ov * (A.m / tm);
      const rv = (A.o.vx - B.o.vx) * nx + (A.o.vy - B.o.vy) * ny;
      if (rv > 0) { const j2 = (1.7 * rv) / tm * U.rand(0.75, 1.1); const jt = U.rand(-0.25, 0.25) * rv; B.o.vx += -ny * jt; B.o.vy += nx * jt; A.o.vx -= j2 * B.m * nx; A.o.vy -= j2 * B.m * ny; B.o.vx += j2 * A.m * nx; B.o.vy += j2 * A.m * ny; if (rv > 60) g.sfx.tone(700 + Math.random() * 400, 0.04, 'square', 0.03); }
    }
  }
}
function afterRoll(g) {
  const knocked = S.pins.filter((p) => p.down).length;
  const f = S.frames[S.frame] || (S.frames[S.frame] = []);
  f.push(knocked);
  const last = S.frame === 9;
  let clearRack = false, nextFrame = false;
  if (!last) {
    if (S.roll === 0 && knocked === 10) { S.msg = 'STRIKE!'; g.sfx.win(); g.shake(10); nextFrame = true; }
    else if (S.roll === 1) { S.msg = f[0] + f[1] === 10 ? 'SPARE!' : `${knocked}개`; if (f[0] + f[1] === 10) g.sfx.power(); nextFrame = true; }
    else { S.msg = `${knocked}개`; }
  } else {
    const tot = f.reduce((a, b) => a + b, 0);
    if (knocked === 10 && (S.roll === 0 || (S.roll === 1 && f[0] === 10) || S.roll === 2)) { S.msg = 'STRIKE!'; g.sfx.win(); clearRack = true; }
    else if (S.roll === 1 && f[0] !== 10 && f[0] + f[1] === 10) { S.msg = 'SPARE!'; g.sfx.power(); clearRack = true; }
    else S.msg = `${knocked}개`;
    if ((S.roll === 1 && f[0] + f[1] < 10) || S.roll === 2) nextFrame = true;
  }
  g.score = total();
  if (nextFrame) {
    S.frame++; S.roll = 0;
    if (S.frame >= 10) { S.wait = 0; return g.win(`최종 점수 ${total()}점`); }
    rackPins();
  } else {
    S.roll++;
    if (clearRack) { rackPins(); }
    else { S.pins = S.pins.filter((p) => !p.down); S.pins.forEach((p) => { p.vx = p.vy = 0; p.ox = p.x; p.oy = p.y; }); }
  }
  resetBall();
}
function total() {
  const rolls = S.frames.flat(); let sc = 0, i = 0;
  for (let f = 0; f < 10 && i < rolls.length; f++) {
    if (rolls[i] === 10) { sc += 10 + (rolls[i + 1] || 0) + (rolls[i + 2] || 0); i++; }
    else if ((rolls[i] || 0) + (rolls[i + 1] || 0) === 10) { sc += 10 + (rolls[i + 2] || 0); i += 2; }
    else { sc += (rolls[i] || 0) + (rolls[i + 1] || 0); i += 2; }
  }
  return sc;
}
function drawCard(g) {
  const x0 = 20, y0 = 20;
  g.rrect(x0 - 8, y0 - 8, 290, 140 + 0, 10, 'rgba(0,0,0,.5)');
  g.text('🎳 스코어', x0, y0 + 6, 16, '#fff', 'left');
  for (let f = 0; f < 10; f++) {
    const x = x0 + (f % 5) * 55, y = y0 + 22 + Math.floor(f / 5) * 56;
    g.rect(x, y, 52, 50, f === S.frame ? '#1e3a8a' : '#292524'); g.stroke(x, y, 52, 50, '#57534e', 1);
    const fr = S.frames[f] || [];
    const marks = fr.map((v, i) => (v === 10 && (i === 0 || f === 9) ? 'X' : i > 0 && fr[i - 1] + v === 10 && fr[i - 1] !== 10 ? '/' : v === 0 ? '-' : v));
    g.text(marks.join(' '), x + 26, y + 14, 13, '#fde047');
    g.text(f + 1, x + 4, y + 8, 9, '#a8a29e', 'left');
  }
  g.text(`합계 ${total()}`, x0 + 280, y0 + 6, 16, '#fde047', 'right');
}
