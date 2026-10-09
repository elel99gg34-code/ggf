let S;
GAME({
  title: '두들 점프', w: 480, h: 760, bg: '#fdf6e3', controls: 'lr+ab', aLabel: '🔫',
  help: '←→ 또는 마우스로 좌우 이동 (화면 끝은 반대편으로 연결)\n발판을 밟으면 자동 점프\n🌀 스프링 · 🚁 프로펠러 · 🟫 부서지는 발판 · 🟦 움직이는 발판\n👾 몬스터는 위에서 밟거나 Space로 쏘기',
  init(g) {
    S = { x: 240, y: 600, vy: -900, cam: 0, plats: [], mons: [], shots: [], top: 760, fly: 0, face: 1, maxH: 0, useMouse: false };
    S.plats.push({ x: 200, y: 700, w: 80, t: 'n' });
    while (S.top > -800) gen();
  },
  update(g, dt) {
    if (g.mouse.moved) S.useMouse = true; if (g.left || g.right) S.useMouse = false;
    let vx = (g.right - g.left) * 420;
    if (S.useMouse) vx = U.clamp((g.mouse.x - S.x) * 8, -600, 600);
    g.mouse.moved = false;
    if (vx) S.face = vx > 0 ? 1 : -1;
    S.x += vx * dt; if (S.x < -20) S.x = 500; if (S.x > 500) S.x = -20;
    if (S.fly > 0) { S.fly -= dt; S.vy = -800; } else S.vy += 1500 * dt;
    const py = S.y; S.y += S.vy * dt;
    if ((g.pressed('a') || g.pressed('up')) && S.shots.length < 3) { S.shots.push({ x: S.x, y: S.y - 30 }); g.sfx.shoot(); }
    for (const p of S.plats) {
      if (p.t === 'm') { p.x += p.v * dt; if (p.x < 0 || p.x + p.w > 480) p.v *= -1; }
      if (p.broken) { p.fall = (p.fall || 0) + 600 * dt; continue; }
      if (S.vy > 0 && py <= p.y && S.y >= p.y && S.x > p.x - 14 && S.x < p.x + p.w + 14) {
        if (p.t === 'b') { p.broken = true; g.sfx.drop(); continue; }
        S.y = p.y; S.vy = -820; g.sfx.jump();
        if (p.item === 's') { S.vy = -1500; g.sfx.power(); p.item = null; }
        if (p.item === 'p') { S.fly = 2.5; g.sfx.power(); p.item = null; }
        if (p.t === 'v') { p.broken = true; }
      }
    }
    for (const m of S.mons) {
      m.x += Math.sin(g.time * 2 + m.ph) * 60 * dt;
      if (m.dead) { m.y += 600 * dt; continue; }
      if (Math.abs(S.x - m.x) < 34 && Math.abs(S.y - 20 - m.y) < 34) {
        if (S.vy > 0 && S.y - 20 < m.y) { m.dead = true; S.vy = -1000; g.add(100, m.x, m.y); g.sfx.hit(); }
        else if (S.fly <= 0) { g.sfx.lose(); S.dead = true; }
      }
    }
    for (const s of S.shots) { s.y -= 900 * dt; for (const m of S.mons) if (!m.dead && U.dist(s.x, s.y, m.x, m.y) < 30) { m.dead = true; s.dead = true; g.add(150, m.x, m.y); g.sfx.explode(); g.burst(m.x, m.y, '#a855f7', 20); } }
    S.shots = S.shots.filter((s) => !s.dead && s.y > S.cam - 50);
    const targetCam = S.y - 330;
    if (targetCam < S.cam) S.cam = targetCam;
    const h = Math.floor((600 - S.y) / 10);
    if (h > S.maxH) { S.maxH = h; g.score = h; }
    while (S.top > S.cam - 300) gen();
    S.plats = S.plats.filter((p) => p.y < S.cam + 900); S.mons = S.mons.filter((m) => m.y < S.cam + 900);
    if (S.y > S.cam + 800 || S.dead) { g.sfx.lose(); g.over(`높이 ${S.maxH}m`); }
  },
  draw(g, c) {
    for (let y = -((-S.cam) % 30); y < g.H; y += 30) g.line(0, y, g.W, y, '#ece3c7', 1);
    for (let x = 0; x < g.W; x += 30) g.line(x, 0, x, g.H, '#ece3c7', 1);
    c.save(); c.translate(0, -S.cam);
    for (const p of S.plats) {
      const y = p.y + (p.fall || 0);
      const col = { n: '#6abf3b', m: '#3b82f6', b: '#92400e', v: '#f5f5f5' }[p.t];
      g.rrect(p.x, y, p.w, 14, 7, col, '#333', 2);
      if (p.t === 'b') g.line(p.x + p.w / 2 - 6, y + 2, p.x + p.w / 2 + 4, y + 12, '#333', 2);
      if (p.item === 's') g.emoji('🌀', p.x + p.w / 2, y - 12, 22);
      if (p.item === 'p') g.emoji('🚁', p.x + p.w / 2, y - 16, 26);
    }
    for (const m of S.mons) g.emoji(m.e, m.x, m.y, 50);
    S.shots.forEach((s) => g.circle(s.x, s.y, 6, '#111'));
    c.save(); c.translate(S.x, S.y - 26); c.scale(S.face, 1);
    if (S.fly > 0) g.emoji('🚁', 0, -30, 28);
    g.emoji('🦘', 0, 0, 52); c.restore();
    c.restore();
    g.text(S.maxH + 'm', 20, 30, 26, '#333', 'left');
  },
});
function gen() {
  const h = (760 - S.top) / 10;
  const gap = U.clamp(55 + h * 0.04, 55, 150);
  S.top -= U.rand(gap * 0.7, gap);
  const r = Math.random();
  const t = h > 150 && r < 0.18 ? 'm' : h > 80 && r < 0.3 ? 'b' : h > 300 && r < 0.38 ? 'v' : 'n';
  const p = { x: U.rand(0, 400), y: S.top, w: 76, t, v: U.choice([-1, 1]) * U.rand(60, 140) };
  if (t === 'n' && Math.random() < 0.08) p.item = 's';
  else if (t === 'n' && Math.random() < 0.02) p.item = 'p';
  S.plats.push(p);
  if (t === 'b') { S.top -= 20; S.plats.push({ x: U.rand(0, 400), y: S.top, w: 76, t: 'n' }); }
  if (h > 100 && Math.random() < 0.035) S.mons.push({ x: U.rand(60, 420), y: S.top - 60, ph: U.rand(6), e: U.choice(['👾', '👹', '🦇', '🐙']) });
}
