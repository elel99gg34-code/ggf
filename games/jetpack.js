let S;
GAME({
  title: '제트팩 라이더', w: 1000, h: 560, bg: '#1c1f2e', controls: 'none',
  help: '클릭/Space 누르고 있으면 제트팩 분사 (총알도 발사!)\n⚡ 레이저 · 🚀 미사일(경고 표시 후 날아옴) 을 피하세요\n🪙 코인 +1 · 🛡️ 방패 1회 보호 · 🧲 자석',
  init(g) { S = { y: 470, vy: 0, dist: 0, sp: 380, obs: [], coins: [], miss: [], items: [], bullets: [], t: 2, shield: false, magnet: 0, coinN: 0, bgx: 0 }; },
  update(g, dt) {
    const hold = g.a || g.up || g.mouse.down;
    S.vy += (hold ? -1900 : 1500) * dt; S.vy = U.clamp(S.vy, -500, 700);
    S.y = U.clamp(S.y + S.vy * dt, 40, 490); if (S.y === 490 || S.y === 40) S.vy = 0;
    if (hold && g.frame % 2 === 0) S.bullets.push({ x: 170, y: S.y + 30, vx: U.rand(-40, 40), vy: 700, life: 0.4 });
    S.sp = Math.min(900, 380 + S.dist / 30);
    const dx = S.sp * dt; S.dist += dx; S.bgx = (S.bgx + dx * 0.4) % 200;
    g.score = Math.floor(S.dist / 10) + S.coinN * 5;
    S.magnet -= dt;
    S.t -= dt;
    if (S.t <= 0) {
      const r = Math.random();
      if (r < 0.45) { const len = U.rand(120, 260), ang = U.choice([0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]); S.obs.push({ x: 1100, y: U.rand(80, 480), len, ang, spin: S.dist > 3000 && Math.random() < 0.3 ? U.rand(-1.5, 1.5) : 0 }); }
      else if (r < 0.7) { for (let i = 0; i < (S.dist > 4000 ? U.randi(1, 3) : 1); i++) S.miss.push({ x: 1200 + i * 200, y: S.y, warn: 1.4 + i * 0.4, lock: false }); }
      else { const sy = U.rand(100, 420), pat = U.randi(3); for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) S.coins.push({ x: 1050 + i * 34, y: sy + j * 34 + (pat === 1 ? Math.sin(i / 2) * 50 : pat === 2 ? i * 6 - 36 : 0) }); }
      if (Math.random() < 0.08) S.items.push({ x: 1100, y: U.rand(100, 450), k: U.choice(['🛡️', '🧲']) });
      S.t = U.rand(0.7, 1.4) * (500 / S.sp) + 0.3;
    }
    for (const o of S.obs) { o.x -= dx; o.ang += o.spin * dt; }
    for (const m of S.miss) {
      if (m.warn > 0) { m.warn -= dt; if (!m.lock) m.y += (S.y - m.y) * Math.min(1, dt * 3); if (m.warn < 0.4) m.lock = true; if (m.warn <= 0) g.sfx.tone(200, 0.3, 'sawtooth', 0.04, 600); }
      else m.x -= (S.sp + 600) * dt;
    }
    for (const c of S.coins) {
      c.x -= dx;
      if (S.magnet > 0 && U.dist(c.x, c.y, 150, S.y) < 300) { c.x += (150 - c.x) * dt * 6; c.y += (S.y - c.y) * dt * 6; }
      if (!c.got && U.dist(c.x, c.y, 150, S.y) < 32) { c.got = true; S.coinN++; g.sfx.tone(1300, 0.04, 'square', 0.03); }
    }
    for (const it of S.items) { it.x -= dx; if (!it.got && U.dist(it.x, it.y, 150, S.y) < 36) { it.got = true; g.sfx.power(); if (it.k === '🛡️') S.shield = true; else S.magnet = 10; g.float(150, S.y - 40, it.k === '🛡️' ? '방패!' : '자석!', '#7dd3fc'); } }
    S.bullets.forEach((b) => { b.x += b.vx * dt - dx * 0.3; b.y += b.vy * dt; b.life -= dt; });
    S.bullets = S.bullets.filter((b) => b.life > 0 && b.y < 520);
    S.obs = S.obs.filter((o) => o.x > -300); S.miss = S.miss.filter((m) => m.x > -100); S.coins = S.coins.filter((c) => c.x > -40 && !c.got); S.items = S.items.filter((i) => i.x > -40 && !i.got);
    const px = 150, py = S.y;
    let hit = false;
    for (const o of S.obs) {
      const ax = o.x + Math.cos(o.ang) * -o.len / 2, ay = o.y + Math.sin(o.ang) * -o.len / 2, bx = o.x + Math.cos(o.ang) * o.len / 2, by = o.y + Math.sin(o.ang) * o.len / 2;
      const t = U.clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (o.len * o.len), 0, 1);
      if (U.dist(px, py, ax + (bx - ax) * t, ay + (by - ay) * t) < 26) { hit = o; break; }
    }
    for (const m of S.miss) if (m.warn <= 0 && U.dist(px, py, m.x, m.y) < 30) hit = m;
    if (hit) {
      if (S.shield) { S.shield = false; g.sfx.explode(); g.shake(8); hit.x = -999; g.burst(px, py, '#7dd3fc', 30); }
      else { g.sfx.explode(); g.shake(14); g.burst(px, py, ['#f97316', '#fde047'], 50, 300); return g.over(`${Math.floor(S.dist / 10)}m · 🪙${S.coinN}`); }
    }
    g.info = `🪙${S.coinN}` + (S.shield ? ' 🛡️' : '') + (S.magnet > 0 ? ' 🧲' : '');
  },
  draw(g, c) {
    for (let x = -S.bgx; x < g.W; x += 200) { g.rect(x, 0, 6, g.H, '#262a3d'); g.rrect(x + 40, 120, 110, 160, 8, '#22263a'); g.rect(x + 50, 130, 90, 60, '#2c3150'); }
    g.rect(0, 520, g.W, 40, '#11131d'); g.rect(0, 0, g.W, 30, '#11131d');
    for (const o of S.obs) {
      c.save(); c.translate(o.x, o.y); c.rotate(o.ang);
      g.rect(-o.len / 2, -5, o.len, 10, `rgba(250,204,21,${0.6 + Math.sin(g.time * 30) * 0.3})`);
      c.shadowBlur = 20; c.shadowColor = '#fde047'; g.rect(-o.len / 2, -2, o.len, 4, '#fff'); c.shadowBlur = 0;
      g.circle(-o.len / 2, 0, 12, '#64748b'); g.circle(o.len / 2, 0, 12, '#64748b');
      c.restore();
    }
    for (const m of S.miss) {
      if (m.warn > 0) { if (Math.floor(g.time * (m.lock ? 16 : 6)) % 2) g.text('⚠️', g.W - 40, m.y, 34); }
      else { c.save(); c.translate(m.x, m.y); c.scale(-1, 1); g.emoji('🚀', 0, 0, 44); c.restore(); g.circle(m.x + 30, m.y, 8 + Math.random() * 6, 'rgba(249,115,22,.7)'); }
    }
    S.coins.forEach((co) => g.circle(co.x, co.y, 11, '#fbbf24') || g.circle(co.x - 3, co.y - 3, 4, '#fde68a'));
    S.items.forEach((it) => g.emoji(it.k, it.x, it.y, 38));
    S.bullets.forEach((b) => g.rect(b.x, b.y, 3, 10, '#fde047'));
    const hold = g.a || g.up || g.mouse.down;
    if (hold) for (let i = 0; i < 3; i++) g.circle(138 + U.rand(-4, 4), S.y + 26 + i * 10, 8 - i * 2, i ? '#fde047' : '#f97316');
    if (S.shield) g.ring(150, S.y, 36, `rgba(125,211,252,${0.5 + Math.sin(g.time * 8) * 0.3})`, 4);
    if (S.magnet > 0) g.ring(150, S.y, 44, 'rgba(244,114,182,.4)', 2);
    c.save(); c.translate(150, S.y); c.scale(-1, 1); g.emoji('🧑‍🚀', 0, 0, 50); c.restore();
    g.text(Math.floor(S.dist / 10) + 'm', 20, 60, 28, '#fff', 'left');
  },
});
