let S;
GAME({
  title: '동굴 헬리콥터', w: 900, h: 560, bg: '#0b1208', controls: 'none',
  help: '클릭/Space 를 누르고 있으면 상승, 떼면 하강\n동굴은 점점 좁아지고 구불구불해져요\n🪙 코인 +50 · 가운데 장애물 조심!',
  init(g) {
    S = { y: 280, vy: 0, cave: [], dist: 0, sp: 300, smoke: [], coins: [], blocks: [], gap: 380, mid: 280, ph: 0, started: false };
    for (let x = 0; x <= 920; x += 20) S.cave.push({ x, top: 90, bot: 470 });
  },
  update(g, dt) {
    const hold = g.a || g.up || g.mouse.down;
    if (!S.started) { if (hold) S.started = true; else return; }
    S.vy += (hold ? -1300 : 1100) * dt; S.vy = U.clamp(S.vy, -420, 480);
    S.y += S.vy * dt;
    S.sp = 300 + S.dist / 40;
    const dx = S.sp * dt; S.dist += dx;
    g.score = Math.floor(S.dist / 10) + (S.bonus || 0);
    for (const c of S.cave) c.x -= dx;
    for (const o of S.blocks) o.x -= dx;
    for (const o of S.coins) o.x -= dx;
    S.smoke.forEach((s) => { s.x -= dx; s.life -= dt; });
    if (g.frame % 3 === 0) S.smoke.push({ x: 160, y: S.y + 6, life: 0.6 });
    S.smoke = S.smoke.filter((s) => s.life > 0);
    while (S.cave[0].x < -20) S.cave.shift();
    while (S.cave[S.cave.length - 1].x < 940) {
      const l = S.cave[S.cave.length - 1];
      S.ph += 0.08 + Math.min(0.12, S.dist / 80000);
      S.gap = Math.max(170, 380 - S.dist / 150);
      S.mid = U.clamp(S.mid + Math.sin(S.ph) * 14 + U.rand(-8, 8), S.gap / 2 + 20, 540 - S.gap / 2);
      S.cave.push({ x: l.x + 20, top: S.mid - S.gap / 2, bot: S.mid + S.gap / 2 });
      if (Math.random() < 0.035) S.blocks.push({ x: l.x + 20, y: S.mid + U.rand(-S.gap / 3, S.gap / 3) - 40, h: 80 });
      else if (Math.random() < 0.05) S.coins.push({ x: l.x + 20, y: S.mid + U.rand(-S.gap / 3, S.gap / 3) });
    }
    S.blocks = S.blocks.filter((o) => o.x > -40); S.coins = S.coins.filter((o) => o.x > -40 && !o.got);
    const seg = S.cave.find((c) => c.x <= 150 && c.x + 20 > 150) || S.cave[0];
    const hb = { x: 120, y: S.y - 12, w: 60, h: 24 };
    if (S.y - 12 < seg.top || S.y + 12 > seg.bot || S.blocks.some((o) => U.rectHit(hb, { x: o.x, y: o.y, w: 24, h: o.h }))) {
      g.sfx.explode(); g.shake(12); g.burst(150, S.y, ['#f97316', '#fde047', '#666'], 50, 300, 1);
      return g.over(`${Math.floor(S.dist / 10)}m 비행`);
    }
    for (const o of S.coins) if (U.dist(150, S.y, o.x, o.y) < 30) { o.got = true; S.bonus = (S.bonus || 0) + 50; g.float(o.x, o.y, '+50', '#fde047'); g.sfx.coin(); }
  },
  draw(g, c) {
    c.fillStyle = '#3f6212';
    c.beginPath(); c.moveTo(0, 0); S.cave.forEach((s) => c.lineTo(s.x, s.top)); c.lineTo(g.W + 40, 0); c.fill();
    c.beginPath(); c.moveTo(0, g.H); S.cave.forEach((s) => c.lineTo(s.x, s.bot)); c.lineTo(g.W + 40, g.H); c.fill();
    c.strokeStyle = '#84cc16'; c.lineWidth = 3;
    c.beginPath(); S.cave.forEach((s, i) => (i ? c.lineTo(s.x, s.top) : c.moveTo(s.x, s.top))); c.stroke();
    c.beginPath(); S.cave.forEach((s, i) => (i ? c.lineTo(s.x, s.bot) : c.moveTo(s.x, s.bot))); c.stroke();
    S.blocks.forEach((o) => g.rrect(o.x, o.y, 24, o.h, 4, '#65a30d', '#a3e635'));
    S.coins.forEach((o) => g.emoji('🪙', o.x, o.y, 26));
    S.smoke.forEach((s) => g.circle(s.x, s.y, 10 * (1 - s.life) + 3, `rgba(200,200,200,${s.life * 0.5})`));
    c.save(); c.translate(150, S.y); c.rotate(U.clamp(S.vy / 1500, -0.3, 0.3)); c.scale(-1, 1); g.emoji('🚁', 0, 0, 52); c.restore();
    if (!S.started) g.text('누르고 있으면 상승!', 450, 280, 30, '#fff');
    g.text(Math.floor(S.dist / 10) + 'm', 880, 30, 24, '#fff', 'right');
  },
});
