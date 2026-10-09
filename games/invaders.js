let S;
const AL = ['👾', '👽', '🤖', '👻', '🐙'];
GAME({
  title: '우주 침략자', w: 800, h: 720, bg: '#02030a', controls: 'lr+ab', aLabel: '🔥',
  help: '←→ 이동 · Space 발사\n방어막 뒤에 숨어서 공격을 피하세요\n🛸 UFO를 맞히면 보너스 점수\n웨이브마다 적이 더 낮게, 더 빨리!',
  init(g) {
    S = { x: 400, lives: 3, wave: 0, shots: [], bombs: [], cool: 0, inv: 0, stars: Array.from({ length: 80 }, () => ({ x: U.rand(800), y: U.rand(720), s: U.rand(0.5, 2) })) };
    newWave();
  },
  update(g, dt) {
    S.x = U.clamp(S.x + (g.right - g.left) * 380 * dt, 30, g.W - 30);
    S.cool -= dt; S.inv -= dt;
    if ((g.a || g.mouse.down) && S.cool <= 0 && S.shots.length < 3) { S.shots.push({ x: S.x, y: 650 }); S.cool = 0.32; g.sfx.shoot(); }
    if (g.mouse.down) S.x += U.clamp(g.mouse.x - S.x, -400 * dt, 400 * dt);
    S.stars.forEach((s) => { s.y += s.s * 20 * dt; if (s.y > 720) s.y = 0; });
    const alive = S.aliens.filter((a) => !a.dead);
    if (!alive.length) { g.add(500 * S.wave, 400, 300); g.sfx.win(); return newWave(); }
    // 행군
    S.stepT -= dt;
    const interval = Math.max(0.04, 0.6 * (alive.length / 55) - S.wave * 0.02);
    if (S.stepT <= 0) {
      S.stepT = interval; S.frameA = !S.frameA;
      g.sfx.tone([110, 98, 87, 82][S.beat++ % 4], 0.08, 'square', 0.05);
      const minX = Math.min(...alive.map((a) => a.x)), maxX = Math.max(...alive.map((a) => a.x));
      if ((S.dir > 0 && maxX + 40 > g.W) || (S.dir < 0 && minX - 40 < 0)) { S.dir *= -1; S.aliens.forEach((a) => (a.y += 22)); }
      else S.aliens.forEach((a) => (a.x += S.dir * 12));
    }
    if (Math.random() < dt * (1.2 + S.wave * 0.4)) {
      const cols = {};
      alive.forEach((a) => { if (!cols[a.c] || cols[a.c].y < a.y) cols[a.c] = a; });
      const sh = U.choice(Object.values(cols));
      S.bombs.push({ x: sh.x, y: sh.y + 16, v: 240 + S.wave * 20, zig: Math.random() < 0.3 });
    }
    if (!S.ufo && Math.random() < dt * 0.08) S.ufo = { x: -40, d: 1 };
    if (S.ufo) { S.ufo.x += 150 * dt; if (S.ufo.x > g.W + 40) S.ufo = null; if (S.ufo && g.frame % 12 === 0) g.sfx.tone(800 + Math.sin(g.time * 20) * 200, 0.05, 'sine', 0.03); }
    for (const s of S.shots) {
      s.y -= 650 * dt;
      for (const a of alive) if (!a.dead && Math.abs(s.x - a.x) < 20 && Math.abs(s.y - a.y) < 16) {
        a.dead = s.dead = true; g.add((5 - a.r) * 10 + 10, a.x, a.y); g.sfx.hit(); g.burst(a.x, a.y, U.hsl(a.r * 60 + 100), 18); break;
      }
      if (S.ufo && Math.abs(s.x - S.ufo.x) < 30 && Math.abs(s.y - 70) < 16) { const p = U.choice([100, 150, 300]); g.add(p, S.ufo.x, 70); g.burst(S.ufo.x, 70, '#f43f5e', 40, 300); g.sfx.explode(); S.ufo = null; s.dead = true; }
      if (hitShield(s.x, s.y)) s.dead = true;
      for (const b of S.bombs) if (Math.abs(b.x - s.x) < 8 && Math.abs(b.y - s.y) < 12) { b.dead = s.dead = true; g.burst(s.x, s.y, '#fff', 6); }
    }
    for (const b of S.bombs) {
      b.y += b.v * dt; if (b.zig) b.x += Math.sin(b.y / 15) * 2;
      if (hitShield(b.x, b.y)) b.dead = true;
      if (S.inv <= 0 && Math.abs(b.x - S.x) < 24 && b.y > 640 && b.y < 672) {
        b.dead = true; S.lives--; S.inv = 2; g.shake(12); g.sfx.explode(); g.burst(S.x, 655, ['#22c55e', '#fff', '#fde047'], 50, 300, 1);
        if (S.lives <= 0) return g.over(`웨이브 ${S.wave}`);
      }
    }
    if (alive.some((a) => a.y > 620)) return g.over('침략당했다!');
    S.shots = S.shots.filter((s) => !s.dead && s.y > 0);
    S.bombs = S.bombs.filter((b) => !b.dead && b.y < g.H);
    g.info = `웨이브 ${S.wave} · ❤️${S.lives}`;
  },
  draw(g, c) {
    S.stars.forEach((s) => g.rect(s.x, s.y, s.s, s.s, '#8890c0'));
    for (const a of S.aliens) if (!a.dead) g.emoji(AL[a.r], a.x, a.y + (S.frameA ? 2 : -2), 30);
    if (S.ufo) g.emoji('🛸', S.ufo.x, 70, 40);
    for (const sh of S.shield) if (sh.hp > 0) g.rect(sh.x, sh.y, 8, 8, `rgba(34,197,94,${sh.hp / 3})`);
    S.shots.forEach((s) => { g.rect(s.x - 2, s.y - 10, 4, 16, '#fde047'); });
    S.bombs.forEach((b) => g.rect(b.x - 3, b.y - 8, 6, 14, b.zig ? '#f472b6' : '#f87171'));
    if (S.inv <= 0 || Math.floor(g.time * 10) % 2) {
      g.poly([[S.x, 636], [S.x + 24, 668], [S.x - 24, 668]], '#22c55e');
      g.rect(S.x - 3, 628, 6, 12, '#86efac');
    }
    g.rect(0, 680, g.W, 2, '#22c55e');
    for (let i = 0; i < S.lives; i++) g.poly([[30 + i * 40, 692], [44 + i * 40, 712], [16 + i * 40, 712]], '#22c55e');
    if (S.banner > 0) { S.banner -= 1 / 60; g.text(`WAVE ${S.wave}`, g.W / 2, 360, 64, `rgba(255,255,255,${Math.min(1, S.banner)})`); }
  },
});
function newWave() {
  S.wave++;
  S.aliens = [];
  const top = 120 + Math.min(S.wave - 1, 6) * 18;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) S.aliens.push({ x: 110 + c * 52, y: top + r * 46, r, c, dead: false });
  S.dir = 1; S.stepT = 0.5; S.beat = 0; S.bombs = []; S.shots = []; S.banner = 2;
  if (S.wave === 1 || S.wave % 3 === 1) {
    S.shield = [];
    for (let k = 0; k < 4; k++) for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) {
      if (y === 4 && x > 2 && x < 6) continue;
      if (y === 0 && (x === 0 || x === 8)) continue;
      S.shield.push({ x: 110 + k * 170 + x * 8, y: 560 + y * 8, hp: 3 });
    }
  }
}
function hitShield(x, y) {
  for (const s of S.shield) if (s.hp > 0 && x > s.x - 2 && x < s.x + 10 && y > s.y && y < s.y + 8) { s.hp--; return true; }
  return false;
}
