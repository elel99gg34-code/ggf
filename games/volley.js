let S;
const W = 1000, H = 600, GROUND = 540, NETX = 500, NETH = 150, SR = 46, BR = 22;
GAME({
  title: '슬라임 배구', w: W, h: H, bg: '#7dd3fc', controls: 'dpad+ab', aLabel: '💥',
  help: '←→ 이동 · ↑ 점프 (또는 WASD)\n공중에서 Space/Z = 스파이크! (방향키와 함께 누르면 방향 조절)\n공이 내 쪽 바닥에 떨어지면 실점\n15점 선취 승리 · 그 시절 피카츄 배구 감성!',
  init(g) { S = { p: [mk(250, '#facc15', '😺'), mk(750, '#f87171', '😼')], ball: null, sc: [0, 0], serve: 0, wait: 1.2, msg: '', trail: [] }; resetBall(); },
  update(g, dt) {
    const [me, ai] = S.p;
    if (S.wait > 0) { S.wait -= dt; return; }
    control(me, g.right - g.left, g.pressed('up') || g.keyp('KeyW'), g.pressed('a') || g.pressed('b'), g.up ? -1 : g.down ? 1 : 0, dt, 0);
    aiCtl(ai, dt);
    const b = S.ball;
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      const h = dt / sub;
      b.vy += 1100 * h; b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vx * h * 0.03;
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); } if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
      if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); }
      // 네트
      if (Math.abs(b.x - NETX) < BR + 6 && b.y > GROUND - NETH) {
        if (b.y < GROUND - NETH + 10 && b.vy > 0) { b.vy = -Math.abs(b.vy) * 0.7; b.y = GROUND - NETH - BR + 4; }
        else { b.vx = (b.x < NETX ? -1 : 1) * Math.abs(b.vx) * 0.8; b.x = NETX + (b.x < NETX ? -1 : 1) * (BR + 6); }
      }
      for (const [k, s] of S.p.entries()) {
        const dx = b.x - s.x, dy = b.y - (s.y), d = Math.hypot(dx, dy);
        if (d < SR + BR && dy < 10) {
          const nx = dx / d, ny = dy / d;
          b.x = s.x + nx * (SR + BR); b.y = s.y + ny * (SR + BR);
          const rv = (b.vx - s.vx) * nx + (b.vy - s.vy) * ny;
          if (rv < 0) { b.vx -= 1.9 * rv * nx; b.vy -= 1.9 * rv * ny; b.vx += s.vx * 0.3; b.vy = Math.min(b.vy, -520); }
          if (s.spike > 0 && s.y < GROUND - 20) { const dir = k === 0 ? 1 : -1; b.vx = dir * (720 + Math.random() * 120) * (s.spikeDir === -1 ? 0.6 : 1); b.vy = s.spikeDir === -1 ? -300 : s.spikeDir === 1 ? 650 : 380; s.spike = 0; g.sfx.explode(); g.shake(8); S.flash = 0.15; g.burst(b.x, b.y, ['#fde047', '#fff'], 20, 300); }
          else g.sfx.tone(k ? 380 : 480, 0.05, 'square', 0.05);
          const sp = Math.hypot(b.vx, b.vy); if (sp > 1300) { b.vx *= 1300 / sp; b.vy *= 1300 / sp; }
        }
      }
      if (b.y > GROUND - BR) { b.y = GROUND - BR; return point(g, b.x < NETX ? 1 : 0); }
    }
    S.trail.push({ x: b.x, y: b.y }); if (S.trail.length > 8) S.trail.shift();
    S.flash = Math.max(0, (S.flash || 0) - dt);
    g.info = `${S.sc[0]} : ${S.sc[1]}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#38bdf8'); grd.addColorStop(1, '#bae6fd'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    g.emoji('☀️', 880, 80, 80); g.emoji('☁️', 200, 90, 70); g.emoji('☁️', 600, 60, 50);
    g.rect(0, GROUND, W, H - GROUND, '#fbbf24'); g.rect(0, GROUND, W, 6, '#d97706');
    for (let x = 0; x < W; x += 50) g.circle(x + 20, GROUND + 30, 3, '#d97706');
    g.rect(NETX - 5, GROUND - NETH, 10, NETH, '#f8fafc'); g.rect(NETX - 8, GROUND - NETH - 6, 16, 10, '#ef4444');
    for (const s of S.p) {
      c.save(); c.scale(1, 0.22); g.circle(s.x, (GROUND + 8) / 0.22, SR * (1 - (GROUND - s.y) / 500), 'rgba(0,0,0,.25)'); c.restore();
      c.fillStyle = s.col; c.beginPath(); c.arc(s.x, s.y, SR, Math.PI, 0); c.closePath(); c.fill();
      const ex = s.x + (s === S.p[0] ? 14 : -14);
      g.circle(ex, s.y - 22, 10, '#fff'); g.circle(ex + U.clamp((S.ball.x - ex) / 60, -4, 4), s.y - 22 + U.clamp((S.ball.y - s.y) / 60, -4, 4), 5, '#111');
      if (s.spike > 0) g.emoji('⚡', s.x, s.y - 60, 30);
    }
    S.trail.forEach((t, i) => g.circle(t.x, t.y, BR * (i / S.trail.length), `rgba(255,255,255,${(i / S.trail.length) * 0.4})`));
    const b = S.ball;
    c.save(); c.translate(b.x, b.y); c.rotate(b.rot); g.emoji('🏐', 0, 0, BR * 2.3); c.restore();
    c.save(); c.scale(1, 0.22); g.circle(b.x, (GROUND + 8) / 0.22, 16, 'rgba(0,0,0,.18)'); c.restore();
    g.text(S.sc[0], 250, 60, 64, '#fff'); g.text(S.sc[1], 750, 60, 64, '#fff');
    if (S.flash > 0) { c.fillStyle = `rgba(255,255,255,${S.flash * 3})`; c.fillRect(0, 0, W, H); }
    if (S.wait > 0 && S.msg) g.text(S.msg, W / 2, 220, 48, '#fff');
  },
});
function mk(x, col, e) { return { x, y: GROUND, vx: 0, vy: 0, col, e, spike: 0, spikeDir: 0, home: x }; }
function control(s, dir, jump, spike, sdir, dt, side) {
  const minX = side === 0 ? SR : NETX + SR + 6, maxX = side === 0 ? NETX - SR - 6 : W - SR;
  s.vx = dir * 420;
  s.x = U.clamp(s.x + s.vx * dt, minX, maxX);
  const ground = s.y >= GROUND;
  if (jump && ground) s.vy = -720;
  s.vy += 1700 * dt; s.y += s.vy * dt;
  if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; }
  if (spike && !ground) { s.spike = 0.25; s.spikeDir = sdir; }
  s.spike = Math.max(0, s.spike - dt);
}
function aiCtl(s, dt) {
  const b = S.ball;
  // 낙하 지점 예측
  let px = b.x, py = b.y, vx = b.vx, vy = b.vy;
  for (let i = 0; i < 200 && py < GROUND - SR - 10; i++) { vy += 1100 / 60; px += vx / 60; py += vy / 60; if (px < BR || px > W - BR) vx = -vx; }
  const lvl = Math.min(1, 0.65 + (S.sc[0] + S.sc[1]) * 0.015 + S.sc[0] * 0.01);
  let tx = px > NETX ? px + 14 : 750;
  if (b.x > NETX && Math.abs(b.vx) < 30 && b.vy > 0) tx = b.x + 12;
  const dir = Math.abs(tx - s.x) > 10 ? Math.sign(tx - s.x) * lvl : 0;
  const near = Math.abs(b.x - s.x) < 90 && b.y < s.y - 60 && b.y > s.y - 240 && b.x > NETX && b.vy > -100;
  const spike = near && s.y < GROUND - 40 && b.y < s.y - 30 && Math.random() < 0.5 * lvl;
  control(s, dir, near && Math.random() < 0.09 * lvl * 4 && b.x > NETX + 50, spike, Math.random() < 0.5 ? 1 : 0, dt, 1);
}
function resetBall() { const sv = S.serve; S.ball = { x: sv === 0 ? 250 : 750, y: 150, vx: 0, vy: 0, rot: 0 }; S.p[0].x = 250; S.p[1].x = 750; S.p.forEach((s) => { s.y = GROUND; s.vy = 0; }); S.trail = []; }
function point(g, w) {
  S.sc[w]++; S.serve = w; g.shake(10); g.burst(S.ball.x, GROUND, '#fde68a', 30, 300);
  if (w === 0) { g.add(100); g.sfx.coin(); S.msg = '득점!'; } else { g.sfx.hit(); S.msg = '실점...'; }
  if (S.sc[0] >= 15) { g.add(3000 - S.sc[1] * 100); return g.win(`${S.sc[0]} : ${S.sc[1]} 승리!`); }
  if (S.sc[1] >= 15) return g.over(`${S.sc[0]} : ${S.sc[1]} 패배`);
  S.wait = 1.4; resetBall();
}
