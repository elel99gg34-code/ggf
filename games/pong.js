let S;
GAME({
  title: '네온 퐁', w: 900, h: 600, bg: '#05050f', controls: 'dpad',
  help: '↑↓ / W S 또는 마우스로 패들 이동\n패들 가장자리로 치면 각도가 커져요\n랠리가 길수록 공이 빨라짐\n먼저 11점 내면 승리 (점수 = 득점×100 + 랠리 보너스)',
  init(g) {
    S = { p: 250, ai: 250, ph: 100, me: 0, cpu: 0, ball: null, rally: 0, trail: [], serveT: 1, aiSkill: 0.85, useMouse: false };
    serve(1);
  },
  update(g, dt) {
    if (g.mouse.moved) S.useMouse = true;
    if (g.up || g.down) S.useMouse = false;
    if (S.useMouse) S.p += (g.mouse.y - S.ph / 2 - S.p) * Math.min(1, dt * 18);
    else S.p += (g.down - g.up) * 600 * dt;
    g.mouse.moved = false;
    S.p = U.clamp(S.p, 0, g.H - S.ph);
    const b = S.ball;
    // AI: 공 도착 위치 예측 (약간의 오차)
    let target = g.H / 2;
    if (b.vx > 0) {
      let t = (g.W - 40 - b.x) / b.vx, py = b.y + b.vy * t;
      while (py < 0 || py > g.H) py = py < 0 ? -py : 2 * g.H - py;
      target = py + S.err;
    }
    const aiSpeed = 380 + S.me * 25;
    S.ai += U.clamp(target - (S.ai + S.ph / 2), -aiSpeed * dt, aiSpeed * dt);
    S.ai = U.clamp(S.ai, 0, g.H - S.ph);
    if (S.serveT > 0) { S.serveT -= dt; return; }
    S.trail.push({ x: b.x, y: b.y }); if (S.trail.length > 14) S.trail.shift();
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < 10 || b.y > g.H - 10) { b.vy *= -1; b.y = U.clamp(b.y, 10, g.H - 10); g.sfx.bounce(); }
    const hitPad = (px, py, dir) => {
      if ((dir < 0 ? b.vx < 0 && b.x - 10 < px + 14 && b.x > px : b.vx > 0 && b.x + 10 > px && b.x < px + 14) && b.y > py - 10 && b.y < py + S.ph + 10) {
        const t = (b.y - (py + S.ph / 2)) / (S.ph / 2);
        const sp = Math.min(1300, Math.hypot(b.vx, b.vy) * 1.06);
        const a = t * 1.0;
        b.vx = Math.cos(a) * sp * -dir; b.vy = Math.sin(a) * sp;
        S.rally++; g.sfx.tone(dir < 0 ? 520 : 400, 0.06, 'square', 0.06);
        g.burst(b.x, b.y, dir < 0 ? '#22d3ee' : '#f472b6', 10, 200);
        if (dir < 0) { g.add(5 * S.rally); } else S.err = U.rand(-60, 60) * (1 - S.aiSkill + S.rally * 0.02);
        return true;
      }
    };
    hitPad(26, S.p, -1) || hitPad(g.W - 40, S.ai, 1);
    if (b.x < -20) { S.cpu++; g.sfx.hit(); g.shake(6); point(g, -1); }
    if (b.x > g.W + 20) { S.me++; g.sfx.coin(); g.add(100, g.W - 80, b.y); g.burst(g.W - 10, b.y, '#f472b6', 40, 400); point(g, 1); }
    g.info = `${S.me} : ${S.cpu}`;
  },
  draw(g, c) {
    for (let y = 10; y < g.H; y += 30) g.rect(g.W / 2 - 2, y, 4, 16, '#1e2140');
    g.text(S.me, g.W / 2 - 80, 60, 64, '#22d3ee'); g.text(S.cpu, g.W / 2 + 80, 60, 64, '#f472b6');
    c.shadowBlur = 20;
    c.shadowColor = '#22d3ee'; g.rrect(26, S.p, 14, S.ph, 6, '#22d3ee');
    c.shadowColor = '#f472b6'; g.rrect(g.W - 40, S.ai, 14, S.ph, 6, '#f472b6');
    c.shadowBlur = 0;
    S.trail.forEach((t, i) => g.circle(t.x, t.y, 10 * (i / S.trail.length), `rgba(255,255,255,${(i / S.trail.length) * 0.3})`));
    c.shadowBlur = 25; c.shadowColor = '#fff'; g.circle(S.ball.x, S.ball.y, 10, '#fff'); c.shadowBlur = 0;
    if (S.rally > 3) g.text(`랠리 ${S.rally}`, g.W / 2, g.H - 30, 20, '#fde047');
    if (S.serveT > 0) g.text(Math.ceil(S.serveT), g.W / 2, g.H / 2, 60, 'rgba(255,255,255,.5)');
  },
});
function serve(dir) {
  const a = U.rand(-0.5, 0.5);
  S.ball = { x: 450, y: 300, vx: Math.cos(a) * 420 * dir, vy: Math.sin(a) * 420 };
  S.serveT = 1; S.rally = 0; S.trail = []; S.err = U.rand(-40, 40);
}
function point(g, who) {
  if (S.me >= 11) { g.add(S.me * 100 - S.cpu * 50 > 0 ? 500 : 0); return g.win(`${S.me} : ${S.cpu} 승리!`); }
  if (S.cpu >= 11) return g.over(`${S.me} : ${S.cpu} 패배`);
  serve(who > 0 ? -1 : 1);
}
