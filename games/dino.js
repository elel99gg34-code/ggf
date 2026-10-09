let S;
GAME({
  title: '공룡 달리기', w: 900, h: 400, bg: '#f7f7f7', controls: 'none',
  help: 'Space/↑/클릭 = 점프 (꾹 누르면 더 높이)\n↓ = 숙이기 / 공중에서 빠른 낙하\n점점 빨라지고, 700점부터 밤이 찾아와요\n🦕 100점마다 효과음!',
  init(g) { S = { y: 0, vy: 0, duck: false, obs: [], sp: 420, dist: 0, t: 1, clouds: [], night: 0, gx: 0, legs: 0, started: false }; },
  update(g, dt) {
    const jumpHeld = g.a || g.up || g.mouse.down;
    if (!S.started) { if (g.pressed('a') || g.pressed('up') || g.mouse.clicked) S.started = true; else return; }
    S.sp = Math.min(1100, S.sp + 9 * dt);
    S.dist += S.sp * dt / 10;
    const sc = Math.floor(S.dist);
    if (Math.floor(sc / 100) > Math.floor(g.score / 100) && sc > 0) { g.sfx.coin(); S.flash = 1; }
    g.score = sc;
    const target = Math.floor(sc / 700) % 2 ? 1 : 0;
    S.night += (target - S.night) * dt * 1.5;
    const ground = S.y === 0;
    if (ground && (g.pressed('a') || g.pressed('up') || g.mouse.clicked)) { S.vy = -720; g.sfx.jump(); }
    S.duck = g.down && ground;
    S.vy += (jumpHeld && S.vy < 0 ? 1700 : 3400) * dt + (g.down && !ground ? 6000 * dt : 0);
    S.y = Math.min(0, S.y + S.vy * dt); if (S.y === 0) S.vy = 0;
    S.legs += dt * S.sp / 40;
    S.gx = (S.gx + S.sp * dt) % 900;
    S.t -= dt;
    if (S.t <= 0) {
      const bird = sc > 300 && Math.random() < 0.3;
      if (bird) S.obs.push({ x: 960, w: 46, h: 30, bird: true, y: U.choice([30, 75, 110]) });
      else { const n = U.choice([1, 1, 2, 3]), big = Math.random() < 0.5; S.obs.push({ x: 960, w: (big ? 26 : 18) * n, h: big ? 52 : 36, n, big }); }
      S.t = U.rand(0.6, 1.4) * (600 / S.sp) + 0.35;
    }
    for (const o of S.obs) o.x -= S.sp * dt * (o.bird ? 1.1 : 1);
    S.obs = S.obs.filter((o) => o.x > -100);
    if (Math.random() < dt * 0.5) S.clouds.push({ x: 950, y: U.rand(40, 160) });
    S.clouds.forEach((c) => (c.x -= S.sp * 0.15 * dt)); S.clouds = S.clouds.filter((c) => c.x > -100);
    const dh = S.duck ? 30 : 50, dw = S.duck ? 58 : 40;
    const d = { x: 84, y: 330 + S.y - dh, w: dw - 10, h: dh - 6 };
    for (const o of S.obs) {
      const r = o.bird ? { x: o.x + 6, y: 330 - o.y - o.h + 6, w: o.w - 12, h: o.h - 14 } : { x: o.x + 4, y: 330 - o.h + 4, w: o.w - 8, h: o.h };
      if (U.rectHit(d, r)) { S.hit = true; g.shake(6); g.sfx.hit(); return g.over(`${sc}m 달렸다!`); }
    }
  },
  draw(g, c) {
    const n = S.night, fg = n > 0.5 ? '#e5e5e5' : '#535353';
    const lerpc = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * n)).join(',')})`;
    g.rect(0, 0, g.W, g.H, lerpc([247, 247, 247], [32, 33, 36]));
    if (n > 0.3) { c.globalAlpha = n; g.emoji('🌙', 760, 70, 40); for (let i = 0; i < 12; i++) g.rect((i * 211) % 900, (i * 53) % 200, 2, 2, '#fff'); c.globalAlpha = 1; }
    S.clouds.forEach((cl) => g.emoji('☁️', cl.x, cl.y, 40));
    g.rect(0, 330, g.W, 2, fg);
    for (let x = -S.gx; x < g.W; x += 70) { g.rect(x + 10, 340, 6, 2, fg); g.rect(x + 40, 350, 3, 2, fg); }
    for (const o of S.obs) {
      if (o.bird) { c.save(); c.translate(o.x + o.w / 2, 330 - o.y - o.h / 2); c.scale(-1, 1); g.emoji('🦅', 0, Math.sin(g.time * 15) * 3, 40); c.restore(); }
      else for (let i = 0; i < o.n; i++) g.emoji('🌵', o.x + (o.w / o.n) * (i + 0.5), 330 - o.h / 2 + 2, o.big ? 54 : 38);
    }
    c.save(); c.translate(104, 330 + S.y - (S.duck ? 14 : 24)); c.scale(-1, 1);
    if (S.duck) c.scale(1.3, 0.7);
    g.emoji('🦖', 0, S.y === 0 ? Math.abs(Math.sin(S.legs)) * -3 : 0, 52);
    c.restore();
    if (!S.started) g.text('Space / 탭으로 시작', 450, 200, 26, fg);
    if (S.flash > 0) { S.flash -= 1 / 60; }
    g.text(String(Math.floor(S.dist)).padStart(5, '0'), 880, 30, 22, S.flash > 0 && Math.floor(S.flash * 8) % 2 ? 'transparent' : fg, 'right');
  },
});
