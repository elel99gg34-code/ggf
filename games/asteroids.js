let S;
GAME({
  title: '소행성 지대', w: 960, h: 640, bg: '#03040b', controls: 'dpad+ab', aLabel: '🔥', bLabel: '⤴',
  help: '←→ 회전 · ↑ 추진 · Space 발사\nShift/X 하이퍼스페이스 (랜덤 순간이동)\n큰 운석은 쪼개져요 · 🛸 UFO 조심\n10000점마다 목숨 +1',
  init(g) {
    S = { ship: { x: 480, y: 320, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2 }, shots: [], rocks: [], lives: 3, level: 0, cool: 0, ufo: null, ushots: [], nextLife: 10000, thrust: false };
    nextLevel();
  },
  update(g, dt) {
    const s = S.ship, W = g.W, H = g.H;
    const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };
    if (s.dead) { s.dead -= dt; if (s.dead <= 0) { s.dead = 0; Object.assign(s, { x: 480, y: 320, vx: 0, vy: 0, inv: 2.5 }); } }
    else {
      s.a += (g.right - g.left) * 4.5 * dt;
      S.thrust = g.up;
      if (g.up) { s.vx += Math.cos(s.a) * 380 * dt; s.vy += Math.sin(s.a) * 380 * dt; if (g.frame % 3 === 0) g.burst(s.x - Math.cos(s.a) * 14, s.y - Math.sin(s.a) * 14, ['#f97316', '#fde047'], 2, 80, 0.3); }
      s.vx *= Math.pow(0.6, dt); s.vy *= Math.pow(0.6, dt);
      s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
      s.inv -= dt; S.cool -= dt;
      if (g.pressed('a') && S.shots.length < 6) { S.shots.push({ x: s.x + Math.cos(s.a) * 16, y: s.y + Math.sin(s.a) * 16, vx: s.vx + Math.cos(s.a) * 650, vy: s.vy + Math.sin(s.a) * 650, life: 0.9 }); g.sfx.shoot(); }
      if (g.pressed('b')) { s.x = U.rand(W); s.y = U.rand(H); s.vx = s.vy = 0; g.sfx.power(); g.burst(s.x, s.y, '#7dd3fc', 20); }
    }
    for (const b of S.shots) { b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt; }
    for (const r of S.rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); }
    for (const b of S.shots) for (const r of S.rocks) if (!r.dead && b.life > 0 && U.dist(b.x, b.y, r.x, r.y) < r.r) { b.life = 0; breakRock(g, r); }
    if (!s.dead && s.inv <= 0) for (const r of S.rocks) if (!r.dead && U.dist(s.x, s.y, r.x, r.y) < r.r + 10) { die(g); break; }
    // UFO
    if (!S.ufo && Math.random() < dt * (0.04 + S.level * 0.01)) S.ufo = { x: 0, y: U.rand(60, H - 60), vx: U.choice([-1, 1]) * 120, small: S.level > 2 && Math.random() < 0.5, t: 1 };
    if (S.ufo) {
      const u = S.ufo; u.x += u.vx * dt; u.y += Math.sin(g.time * 2) * 60 * dt; u.t -= dt;
      if (u.t <= 0 && !s.dead) { u.t = u.small ? 0.8 : 1.4; const a = u.small ? U.angle(u.x, u.y, s.x, s.y) + U.rand(-0.2, 0.2) : U.rand(Math.PI * 2); S.ushots.push({ x: u.x, y: u.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 1.6 }); g.sfx.tone(300, 0.08, 'sawtooth', 0.04); }
      if (u.x < -60 || u.x > W + 60) S.ufo = null;
      else for (const b of S.shots) if (b.life > 0 && U.dist(b.x, b.y, u.x, u.y) < (u.small ? 14 : 22)) { b.life = 0; g.add(u.small ? 1000 : 200, u.x, u.y); g.burst(u.x, u.y, '#a78bfa', 40, 300); g.sfx.explode(); S.ufo = null; break; }
      if (S.ufo && !s.dead && s.inv <= 0 && U.dist(s.x, s.y, u.x, u.y) < 26) die(g);
    }
    for (const b of S.ushots) { b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt; if (!s.dead && s.inv <= 0 && U.dist(b.x, b.y, s.x, s.y) < 12) { b.life = 0; die(g); } }
    S.shots = S.shots.filter((b) => b.life > 0); S.ushots = S.ushots.filter((b) => b.life > 0);
    S.rocks = S.rocks.filter((r) => !r.dead);
    if (!S.rocks.length) nextLevel();
    if (g.score >= S.nextLife) { S.lives++; S.nextLife += 10000; g.sfx.power(); g.float(480, 300, '+1 목숨!', '#4ade80', 30); }
    g.info = `레벨 ${S.level} · ❤️${S.lives}`;
  },
  draw(g, c) {
    c.lineJoin = 'round';
    for (const r of S.rocks) {
      c.save(); c.translate(r.x, r.y); c.rotate(r.rot);
      g.poly(r.pts.map((p, i) => [Math.cos((i / r.pts.length) * 6.283) * r.r * p, Math.sin((i / r.pts.length) * 6.283) * r.r * p]), '#141826', '#cbd5e1', 2);
      c.restore();
    }
    const s = S.ship;
    if (!s.dead && (s.inv <= 0 || Math.floor(g.time * 10) % 2)) {
      c.save(); c.translate(s.x, s.y); c.rotate(s.a);
      if (S.thrust) g.poly([[-10, -5], [-22 - Math.random() * 10, 0], [-10, 5]], '#f97316');
      g.poly([[16, 0], [-12, -11], [-7, 0], [-12, 11]], '#0b1020', '#7dd3fc', 2.5);
      c.restore();
    }
    S.shots.forEach((b) => g.circle(b.x, b.y, 2.5, '#fde047'));
    S.ushots.forEach((b) => g.circle(b.x, b.y, 3, '#f472b6'));
    if (S.ufo) g.emoji('🛸', S.ufo.x, S.ufo.y, S.ufo.small ? 24 : 42);
    for (let i = 0; i < S.lives; i++) { c.save(); c.translate(24 + i * 26, 24); c.rotate(-Math.PI / 2); g.poly([[10, 0], [-8, -7], [-5, 0], [-8, 7]], null, '#7dd3fc', 2); c.restore(); }
  },
});
function rock(x, y, size) {
  const r = [0, 16, 32, 56][size], sp = [0, 140, 90, 55][size] * (1 + S.level * 0.08), a = U.rand(Math.PI * 2);
  return { x, y, r, size, vx: Math.cos(a) * sp * U.rand(0.5, 1), vy: Math.sin(a) * sp * U.rand(0.5, 1), rot: 0, vr: U.rand(-1, 1), pts: Array.from({ length: 11 }, () => U.rand(0.72, 1.1)) };
}
function nextLevel() {
  S.level++;
  for (let i = 0; i < 3 + S.level; i++) {
    let x, y;
    do { x = U.rand(960); y = U.rand(640); } while (U.dist(x, y, S.ship.x, S.ship.y) < 200);
    S.rocks.push(rock(x, y, 3));
  }
  S.ship.inv = 2;
}
function breakRock(g, r) {
  r.dead = true;
  g.add([0, 100, 50, 20][r.size], r.x, r.y);
  g.burst(r.x, r.y, '#cbd5e1', r.size * 8, 200);
  g.sfx.explode(); g.shake(r.size * 2);
  if (r.size > 1) for (let i = 0; i < 2; i++) S.rocks.push(rock(r.x, r.y, r.size - 1));
}
function die(g) {
  const s = S.ship;
  g.burst(s.x, s.y, ['#7dd3fc', '#fff', '#f97316'], 60, 350, 1.2); g.sfx.explode(); g.shake(14);
  S.lives--; s.dead = 2;
  if (S.lives < 0) { S.lives = 0; g.over(`레벨 ${S.level}`); }
}
