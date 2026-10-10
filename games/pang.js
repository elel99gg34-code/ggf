let S;
const W = 960, H = 640, FLOOR = 590;
const BCOL = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
const BG = ['🗻', '🏯', '🗽', '🕌', '🏰', '🌋', '🗼', '🏛️'];
GAME({
  title: '슈퍼 팡', w: W, h: H, bg: '#1e3a5f', controls: 'lr+ab', aLabel: '🔱',
  help: '←→ 이동 · Space 작살 발사 (위로 쭉 뻗어요)\n풍선을 맞히면 작은 풍선 2개로 쪼개져요 · 가장 작은 풍선까지 터뜨려라!\n아이템: 🔱 더블 작살 · 🧲 고정 작살 · ⏰ 시간 정지 · 🛡️ 방패 · 💣 다이너마이트\n풍선에 닿으면 목숨 감소 · 스테이지가 오를수록 풍선이 많아져요',
  init(g) { S = { stage: 0, lives: 3 }; load(g); },
  update(g, dt) {
    const P = S.p;
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) load(g); return; }
    if (S.hurt > 0) { S.hurt -= dt; if (S.hurt <= 0) { if (S.lives < 0) return g.over(`스테이지 ${S.stage}`); reset(); } return; }
    S.time -= dt; if (S.time <= 0) { S.time = 0; return hit(g); }
    P.vx = (g.right - g.left) * 260; P.x = U.clamp(P.x + P.vx * dt, 20, W - 20); if (P.vx) P.face = Math.sign(P.vx);
    const maxH = S.weapon === 'double' ? 2 : 1;
    if (g.pressed('a') && S.harp.filter((h) => !h.dead).length < maxH) { S.harp.push({ x: P.x, top: FLOOR - 50, stick: 0 }); g.sfx.tone(700, 0.1, 'sawtooth', 0.04, 1500); }
    for (const h of S.harp) { if (h.stick > 0) { h.stick -= dt; if (h.stick <= 0) h.dead = true; continue; } h.top -= 700 * dt; if (h.top <= 0) { h.top = 0; if (S.weapon === 'stick') h.stick = 2.5; else h.dead = true; } }
    S.freeze -= dt; S.shield -= dt;
    if (S.freeze <= 0) for (const b of S.balls) {
      b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y > FLOOR - b.r) { b.y = FLOOR - b.r; b.vy = -Math.sqrt(2 * 600 * (FLOOR - b.r - (90 + (3 - b.s) * 90))); }
      for (const pl of S.plats) if (b.x > pl.x - b.r && b.x < pl.x + pl.w + b.r && b.y + b.r > pl.y && b.y - b.r < pl.y + pl.h) { if (b.vy > 0 && b.y < pl.y) { b.y = pl.y - b.r; b.vy = -Math.abs(b.vy); } else if (b.vy < 0 && b.y > pl.y + pl.h) { b.y = pl.y + pl.h + b.r; b.vy = Math.abs(b.vy); } else b.vx = -b.vx; }
    }
    for (const h of S.harp) if (!h.dead) for (const b of S.balls) if (!b.dead && Math.abs(b.x - h.x) < b.r + 3 && b.y + b.r > h.top) { h.dead = true; pop(g, b); break; }
    S.harp = S.harp.filter((h) => !h.dead); S.balls = S.balls.filter((b) => !b.dead);
    for (const b of S.balls) if (U.dist(b.x, b.y, P.x, FLOOR - 30) < b.r + 18) { if (S.shield > 0) { S.shield = 0; pop(g, b); g.sfx.hit(); } else return hit(g); }
    for (const it of S.items) { it.y = Math.min(FLOOR - 16, it.y + 200 * dt); it.t -= dt; if (Math.abs(it.x - P.x) < 30 && it.y > FLOOR - 70) { it.t = 0; useItem(g, it.k); } }
    S.items = S.items.filter((i) => i.t > 0);
    if (!S.balls.length && !S.clear) { const bonus = Math.ceil(S.time) * 20; g.add(1000 + bonus); g.sfx.win(); S.clear = 2.2; S.msg = `STAGE CLEAR! 시간 보너스 +${bonus}`; }
    g.info = `스테이지 ${S.stage} · ❤️${Math.max(0, S.lives)} · ⏱️${Math.ceil(S.time)}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, `hsl(${S.stage * 45},50%,55%)`); grd.addColorStop(1, `hsl(${S.stage * 45 + 30},40%,25%)`); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.5; g.emoji(BG[(S.stage - 1) % BG.length], W / 2, 330, 380); c.globalAlpha = 1;
    g.rect(0, FLOOR, W, H - FLOOR, '#78350f'); g.rect(0, FLOOR, W, 6, '#a16207');
    for (const pl of S.plats) { g.rect(pl.x, pl.y, pl.w, pl.h, '#94a3b8'); g.stroke(pl.x, pl.y, pl.w, pl.h, '#475569', 2); }
    for (const h of S.harp) { for (let y = h.top; y < FLOOR - 40; y += 14) g.line(h.x + Math.sin(y / 6) * 3, y, h.x - Math.sin(y / 6) * 3, y + 14, '#e5e7eb', 2); g.poly([[h.x, h.top - 10], [h.x - 6, h.top + 4], [h.x + 6, h.top + 4]], h.stick > 0 ? '#fde047' : '#e5e7eb'); }
    for (const b of S.balls) { g.circle(b.x, b.y, b.r, BCOL[b.c]); g.circle(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 'rgba(255,255,255,.55)'); if (S.freeze > 0) g.ring(b.x, b.y, b.r + 3, '#bae6fd', 2); }
    for (const it of S.items) g.emoji(it.k, it.x, it.y, 32);
    const P = S.p;
    if (!(S.hurt > 0) || Math.floor(g.time * 10) % 2) { c.save(); c.translate(P.x, FLOOR - 30); c.scale(-P.face, 1); g.emoji('🧑‍🚀', 0, 0, 52); c.restore(); }
    if (S.shield > 0) g.ring(P.x, FLOOR - 30, 34, '#60a5fa', 3);
    g.text(`⏱️ ${Math.ceil(S.time)}`, W - 20, 30, 22, S.time < 15 ? '#fca5a5' : '#fff', 'right');
    g.text(`❤️×${Math.max(0, S.lives)}  ${S.weapon === 'double' ? '🔱' : S.weapon === 'stick' ? '🧲' : ''}`, 20, 30, 20, '#fff', 'left');
    if (S.clear > 0) g.text(S.msg, W / 2, 260, 32, '#fde047');
    if (S.hurt > 0) g.text('앗!', W / 2, 260, 50, '#fca5a5');
  },
});
function load(g) {
  S.stage++; S.clear = 0;
  const n = Math.min(4, 1 + Math.floor((S.stage - 1) / 2)), size = Math.min(3, 1 + Math.floor((S.stage + 1) / 3));
  S.initBalls = Array.from({ length: n }, (_, i) => ({ s: size - (i > 1 ? 1 : 0), x: 150 + i * 220, dir: i % 2 ? -1 : 1 }));
  S.plats = S.stage % 3 === 0 ? [{ x: 250, y: 330, w: 140, h: 20 }, { x: 570, y: 330, w: 140, h: 20 }] : S.stage % 3 === 2 ? [{ x: 400, y: 280, w: 160, h: 20 }] : [];
  S.time = 60 + size * 20; S.weapon = 'single'; reset();
}
function reset() { S.p = { x: W / 2, vx: 0, face: 1 }; S.harp = []; S.items = []; S.freeze = 0; S.shield = 0; S.hurt = 0; S.balls = S.initBalls.map((b, i) => mk(Math.max(0, b.s), b.x, 150, b.dir * 110, i)); }
function mk(s, x, y, vx, c) { return { s, r: [10, 18, 30, 46][s], x, y, vx, vy: 0, c: c % BCOL.length }; }
function pop(g, b) {
  b.dead = true; g.add([200, 100, 70, 50][b.s], b.x, b.y); g.sfx.pop(); g.burst(b.x, b.y, BCOL[b.c], 12 + b.s * 4, 220);
  if (b.s > 0) for (const d of [-1, 1]) S.balls.push({ ...mk(b.s - 1, b.x, b.y, d * 110, b.c), vy: -350 });
  if (Math.random() < 0.13) S.items.push({ x: b.x, y: b.y, k: U.choice(['🔱', '🧲', '⏰', '🛡️', '💣']), t: 8 });
}
function useItem(g, k) {
  g.sfx.power(); g.add(100);
  if (k === '🔱') S.weapon = 'double'; if (k === '🧲') S.weapon = 'stick'; if (k === '⏰') S.freeze = 5; if (k === '🛡️') S.shield = 99;
  if (k === '💣') { const bs = S.balls.slice(); for (const b of bs) if (b.s > 0) { b.dead = true; for (let s = b.s - 1; s >= 0 && s >= b.s - 1; s--) for (const d of [-1, 1]) S.balls.push({ ...mk(0, b.x + d * 20, b.y, d * 110, b.c), vy: -300 }); } S.balls = S.balls.filter((b) => !b.dead); g.sfx.explode(); }
}
function hit(g) { S.lives--; S.hurt = 1.6; g.sfx.lose(); g.shake(10); }
