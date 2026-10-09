let S;
GAME({
  title: '플래피 버드', w: 480, h: 720, bg: '#4ec0ca', controls: 'none',
  help: '클릭 / 탭 / Space 로 날갯짓\n파이프 사이를 통과할 때마다 +1\n🪙 코인 +5 · 10점마다 파이프가 움직이기 시작!\n🥉10 🥈25 🥇50 🏆100',
  init(g) {
    S = { y: 340, vy: 0, pipes: [], t: 1.2, gx: 0, dead: false, coins: [], clouds: Array.from({ length: 6 }, () => ({ x: U.rand(480), y: U.rand(40, 300), s: U.rand(0.6, 1.4) })), passed: 0, started: false };
  },
  update(g, dt) {
    const flap = g.pressed('a') || g.pressed('up') || g.mouse.clicked;
    if (!S.started) { S.y = 340 + Math.sin(g.time * 4) * 10; if (flap) S.started = true; else return; }
    if (S.dead) { S.vy += 1800 * dt; S.y = Math.min(S.y + S.vy * dt, 640); return; }
    if (flap) { S.vy = -480; g.sfx.jump(); }
    S.vy = Math.min(S.vy + 1500 * dt, 800);
    S.y += S.vy * dt;
    const sp = 170 + Math.min(S.passed, 60) * 1.5;
    S.gx = (S.gx + sp * dt) % 48;
    S.clouds.forEach((c) => { c.x -= sp * 0.2 * c.s * dt; if (c.x < -100) c.x = 560; });
    S.t -= dt;
    if (S.t <= 0) {
      S.t = 1.45;
      const gap = Math.max(150, 200 - S.passed * 1.2);
      const top = U.rand(80, 560 - gap);
      const p = { x: 520, top, gap, moving: S.passed >= 10 && Math.random() < 0.5, ph: U.rand(6), base: top };
      S.pipes.push(p);
      if (Math.random() < 0.4) S.coins.push({ x: 520 + 160, y: U.rand(150, 500) });
    }
    for (const p of S.pipes) {
      p.x -= sp * dt;
      if (p.moving) p.top = U.clamp(p.base + Math.sin(g.time * 2 + p.ph) * 60, 60, 600 - p.gap);
      if (!p.scored && p.x + 40 < 120) { p.scored = true; S.passed++; g.add(1); g.sfx.coin(); }
      if (120 + 17 > p.x && 120 - 17 < p.x + 80 && (S.y - 13 < p.top || S.y + 13 > p.top + p.gap)) return crash(g);
    }
    for (const c of S.coins) { c.x -= sp * dt; if (!c.got && U.dist(120, S.y, c.x, c.y) < 30) { c.got = true; g.add(5, c.x, c.y); g.sfx.power(); g.burst(c.x, c.y, '#fde047', 14); } }
    S.pipes = S.pipes.filter((p) => p.x > -100); S.coins = S.coins.filter((c) => c.x > -40 && !c.got);
    if (S.y > 630 || S.y < -40) crash(g);
  },
  draw(g, c) {
    S.clouds.forEach((cl) => { g.circle(cl.x, cl.y, 30 * cl.s, '#e8f8fa'); g.circle(cl.x + 30 * cl.s, cl.y + 6, 24 * cl.s, '#e8f8fa'); g.circle(cl.x - 28 * cl.s, cl.y + 8, 20 * cl.s, '#e8f8fa'); });
    for (let i = 0; i < 10; i++) g.rect(i * 60 - (g.time * 20) % 60, 560 - (i % 3) * 20, 50, 100, '#7ed0a0');
    for (const p of S.pipes) {
      const col = p.moving ? '#e0703a' : '#73bf2e';
      g.rect(p.x, 0, 80, p.top, col); g.rect(p.x - 5, p.top - 30, 90, 30, col);
      g.rect(p.x, p.top + p.gap, 80, 720, col); g.rect(p.x - 5, p.top + p.gap, 90, 30, col);
      g.rect(p.x + 8, 0, 10, p.top - 30, 'rgba(255,255,255,.25)'); g.rect(p.x + 8, p.top + p.gap + 30, 10, 720, 'rgba(255,255,255,.25)');
      g.stroke(p.x - 5, p.top - 30, 90, 30, '#2d4d14', 3); g.stroke(p.x - 5, p.top + p.gap, 90, 30, '#2d4d14', 3);
    }
    S.coins.forEach((co) => g.emoji('🪙', co.x, co.y + Math.sin(g.time * 5) * 4, 28));
    g.rect(0, 640, g.W, 80, '#ded895'); g.rect(0, 640, g.W, 14, '#73bf2e');
    for (let x = -S.gx; x < g.W; x += 48) g.poly([[x, 654], [x + 24, 654], [x + 12, 640]], '#5a9a24');
    c.save(); c.translate(120, S.y); c.rotate(U.clamp(S.vy / 900, -0.5, 1.3));
    g.emoji('🐤', 0, 0, 40); c.restore();
    g.text(S.passed, g.W / 2, 90, 72, '#fff');
    c.lineWidth = 3; c.strokeStyle = '#333'; c.strokeText(S.passed, g.W / 2, 90);
    if (!S.started) g.text('탭해서 시작!', g.W / 2, 450, 30, '#fff');
  },
});
function crash(g) {
  if (S.dead) return;
  S.dead = true; S.vy = -300; g.sfx.hit(); g.shake(10);
  const medal = S.passed >= 100 ? '🏆' : S.passed >= 50 ? '🥇' : S.passed >= 25 ? '🥈' : S.passed >= 10 ? '🥉' : '';
  g.later(() => g.over(`${medal} 통과한 파이프 ${S.passed}개`), 0.6);
}
