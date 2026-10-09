let S;
GAME({
  title: '농구 슛', w: 720, h: 900, bg: '#1e1b4b', controls: 'none', particleGravity: 600,
  help: '공을 잡고 위로 휙 던지세요 (드래그 → 놓기)\n클린 슛(림에 안 닿고) = 3점 · 그냥 골 = 2점\n연속 골 시 🔥 온파이어 (점수 2배)\n60초 · 골마다 +2초 · 20점부터 골대가 움직여요',
  init(g) { S = { time: 60, ball: null, hoop: { x: 360, y: 260, vx: 0 }, streak: 0, made: 0, drag: null, net: 0 }; newBall(); },
  update(g, dt) {
    S.time -= dt;
    if (S.time <= 0) { S.time = 0; return g.over(`${S.made}골 성공!`); }
    const hp = S.hoop;
    if (g.score >= 20) { hp.vx = hp.vx || 120; hp.x += hp.vx * dt * (1 + g.score / 100); if (hp.x < 160 || hp.x > 560) hp.vx *= -1; hp.x = U.clamp(hp.x, 160, 560); }
    const b = S.ball;
    if (b.held) {
      if (g.mouse.clicked && U.dist(g.mouse.x, g.mouse.y, b.x, b.y) < 70) S.drag = { x: g.mouse.x, y: g.mouse.y, t: g.time, pts: [] };
      if (S.drag) { S.drag.pts.push({ x: g.mouse.x, y: g.mouse.y, t: g.time }); if (S.drag.pts.length > 6) S.drag.pts.shift(); b.x = U.lerp(b.x, g.mouse.x, 0.5); b.y = U.lerp(b.y, Math.max(g.mouse.y, 600), 0.5); }
      if (S.drag && g.mouse.released) {
        const p0 = S.drag.pts[0], p1 = S.drag.pts[S.drag.pts.length - 1], dtt = Math.max(0.016, p1.t - p0.t);
        const vx = (p1.x - p0.x) / dtt, vy = (p1.y - p0.y) / dtt;
        if (vy < -300) { b.held = false; b.vx = U.clamp(vx * 0.5, -400, 400); b.vy = U.clamp(vy * 1.1, -1450, -700); b.spin = vx * 0.01; S.touched = false; S.scored = false; g.sfx.tone(250, 0.1, 'sine', 0.06); }
        else { b.x = 360; b.y = 760; }
        S.drag = null;
      }
      return;
    }
    b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt;
    b.r = U.lerp(44, 28, U.clamp((760 - b.y) / 500, 0, 1));
    const rimL = hp.x - 50, rimR = hp.x + 50, ry = hp.y;
    if (b.vy > 0) {
      for (const rx of [rimL, rimR]) { const d = U.dist(b.x, b.y, rx, ry); if (d < b.r + 4) { const nx = (b.x - rx) / d, ny = (b.y - ry) / d; b.x = rx + nx * (b.r + 4); b.y = ry + ny * (b.r + 4); const vn = b.vx * nx + b.vy * ny; b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; S.touched = true; g.sfx.tone(160, 0.06, 'square', 0.05); } }
      if (b.x > hp.x + 60 && b.x < hp.x + 80 && b.y > ry - 120 && b.y < ry + 10) { b.vx = -Math.abs(b.vx) * 0.6; S.touched = true; g.sfx.bounce(); }
      if (!S.scored && b.y > ry && b.y - b.vy * dt <= ry + 4 && b.x > rimL + 4 && b.x < rimR - 4) {
        S.scored = true; S.made++; S.streak++; S.net = 0.4;
        const base = S.touched ? 2 : 3, mult = S.streak >= 3 ? 2 : 1;
        g.add(base * mult, hp.x, ry - 40); S.time += 2;
        g.float(hp.x, ry - 80, S.touched ? (mult > 1 ? '🔥 골!' : '골!') : (mult > 1 ? '🔥 클린 슛!!' : '클린 슛!'), S.touched ? '#fff' : '#fde047', 30);
        g.sfx.coin(); g.burst(hp.x, ry + 20, ['#fde047', '#f97316'], 16, 200);
      }
    }
    S.net = Math.max(0, S.net - dt);
    if (b.y > 950 || b.x < -60 || b.x > 780) { if (!S.scored) { S.streak = 0; g.sfx.hit(); } newBall(); }
    g.info = `⏱️ ${Math.ceil(S.time)} · 🏀${S.made}` + (S.streak >= 3 ? ' 🔥' : '');
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, 900); grd.addColorStop(0, '#312e81'); grd.addColorStop(1, '#1e1b4b'); c.fillStyle = grd; c.fillRect(0, 0, 720, 900);
    for (let i = 0; i < 40; i++) g.circle((i * 97) % 720, 60 + (i * 53) % 260, 8, `hsla(${i * 40},70%,70%,.15)`);
    g.rect(0, 700, 720, 200, '#b45309'); for (let x = 0; x < 720; x += 60) g.line(x, 700, x - 40, 900, '#92400e', 2);
    const hp = S.hoop, b = S.ball;
    g.rrect(hp.x - 110, hp.y - 150, 220, 140, 6, 'rgba(255,255,255,.85)', '#dc2626', 4); g.stroke(hp.x - 40, hp.y - 70, 80, 60, '#dc2626', 3);
    g.rect(hp.x - 5, hp.y - 10, 10, 710 - hp.y, '#6b7280');
    const front = b.held || b.vy < 0 || b.y < hp.y - 20;
    const drawBall = () => { c.save(); c.translate(b.x, b.y); c.rotate(b.rot); g.circle(0, 0, b.r, '#f97316'); g.ring(0, 0, b.r, '#7c2d12', 2); g.line(-b.r, 0, b.r, 0, '#7c2d12', 2); g.line(0, -b.r, 0, b.r, '#7c2d12', 2); c.beginPath(); c.arc(-b.r * 1.3, 0, b.r, -0.7, 0.7); c.stroke(); c.beginPath(); c.arc(b.r * 1.3, 0, b.r, Math.PI - 0.7, Math.PI + 0.7); c.stroke(); c.restore(); };
    if (!front) drawBall();
    const sw = S.net > 0 ? Math.sin(S.net * 30) * 6 : 0;
    for (let i = 0; i <= 6; i++) { const x = hp.x - 50 + i * (100 / 6); g.line(x, hp.y, hp.x - 30 + i * 10 + sw, hp.y + 60, 'rgba(255,255,255,.8)', 2); }
    for (let k = 1; k <= 3; k++) g.line(hp.x - 50 + k * 7, hp.y + k * 15, hp.x + 50 - k * 7, hp.y + k * 15, 'rgba(255,255,255,.6)', 1.5);
    g.rrect(hp.x - 54, hp.y - 4, 108, 8, 4, '#ef4444');
    if (front) drawBall();
    g.text(Math.ceil(S.time), 360, 50, 48, S.time < 10 ? '#f87171' : '#fff');
    if (S.streak >= 3) g.text('🔥 ON FIRE ×2', 360, 100, 26, '#fb923c');
    if (b.held && !S.drag) g.text('👆 공을 위로 휙 던지세요', 360, 840, 20, '#fde68a');
  },
});
function newBall() { S.ball = { x: 360, y: 760, vx: 0, vy: 0, r: 44, rot: 0, spin: 0, held: true }; }
