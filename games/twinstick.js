let S;
const ET = {
  chaser: { c: '#f472b6', r: 12, hp: 1, sp: 130, pts: 50, shape: 4 },
  wander: { c: '#a78bfa', r: 13, hp: 1, sp: 90, pts: 25, shape: 3 },
  tank: { c: '#fb923c', r: 22, hp: 8, sp: 55, pts: 200, shape: 6 },
  splitter: { c: '#4ade80', r: 16, hp: 2, sp: 100, pts: 100, shape: 5 },
  shooter: { c: '#facc15', r: 14, hp: 3, sp: 70, pts: 150, shape: 8 },
  dasher: { c: '#22d3ee', r: 11, hp: 1, sp: 60, pts: 120, shape: 3 },
};
GAME({
  title: '네온 아레나', w: 1000, h: 700, bg: '#04040c', controls: 'dpad+ab', aLabel: '💣',
  help: 'WASD 이동 · 마우스 조준, 클릭 유지 = 사격 (IJKL 키로도 조준 · 터치는 자동 조준)\nSpace = 💣 폭탄 (화면 전체 공격, 3개)\n아이템: 🔱 확산탄 · ⚡ 연사 · 🛡️ 방어막 · 💣 폭탄\n배수(×)는 피격 없이 처치할수록 증가!',
  init(g) {
    S = { p: { x: 500, y: 350, inv: 2 }, bullets: [], foes: [], eb: [], items: [], wave: 0, lives: 3, bombs: 3, cool: 0, mult: 1, kills: 0, spread: 0, rapid: 0, shield: 0, waveT: 0, grid: [] };
    nextWave(g);
  },
  update(g, dt) {
    const P = S.p, touch = matchMedia('(pointer: coarse)').matches;
    const mx = g.right - g.left, my = g.down - g.up, ml = Math.hypot(mx, my) || 1;
    P.x = U.clamp(P.x + (mx / ml) * 300 * dt, 15, g.W - 15); P.y = U.clamp(P.y + (my / ml) * 300 * dt, 15, g.H - 15);
    P.inv -= dt; S.cool -= dt; S.spread -= dt; S.rapid -= dt; S.shield -= dt;
    let aim = null;
    if (g.mouse.down && !touch) aim = U.angle(P.x, P.y, g.mouse.x, g.mouse.y);
    if (touch || g.key('KeyI') || g.key('KeyJ') || g.key('KeyK') || g.key('KeyL')) {
      const ax = g.key('KeyL') - g.key('KeyJ'), ay = g.key('KeyK') - g.key('KeyI');
      if (ax || ay) aim = Math.atan2(ay, ax);
      else if (touch && S.foes.length) { const n = S.foes.reduce((a, b) => (U.dist(a.x, a.y, P.x, P.y) < U.dist(b.x, b.y, P.x, P.y) ? a : b)); aim = U.angle(P.x, P.y, n.x, n.y); }
    }
    if (aim !== null && S.cool <= 0) {
      S.cool = S.rapid > 0 ? 0.05 : 0.11;
      const n = S.spread > 0 ? 5 : 2;
      for (let i = 0; i < n; i++) { const a = aim + (S.spread > 0 ? (i - 2) * 0.12 : (i - 0.5) * 0.05); S.bullets.push({ x: P.x, y: P.y, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900 }); }
      if (g.frame % 3 === 0) g.sfx.tone(700, 0.03, 'square', 0.015);
    }
    S.aim = aim ?? S.aim ?? 0;
    if ((g.keyp('Space') || (g.pressed('a') && !g.keyp('KeyJ') && !g.keyp('KeyZ') && !g.keyp('Enter'))) && S.bombs > 0) {
      S.bombs--; g.sfx.explode(); g.shake(16, 0.5); S.flash = 0.4;
      S.foes.forEach((f) => kill(g, f, true)); S.eb = [];
    }
    for (const b of S.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0 || b.y < 0 || b.x > g.W || b.y > g.H) { b.dead = true; continue; }
      for (const f of S.foes) if (!f.dead && U.dist(b.x, b.y, f.x, f.y) < f.r + 4) { b.dead = true; f.hp--; f.flash = 0.06; f.x += b.vx * 0.01; f.y += b.vy * 0.01; if (f.hp <= 0) kill(g, f); break; }
    }
    for (const f of S.foes) {
      const T = ET[f.t], a = U.angle(f.x, f.y, P.x, P.y);
      f.flash -= dt; f.age += dt;
      if (f.spawn > 0) { f.spawn -= dt; continue; }
      if (f.t === 'wander') { f.a += U.rand(-3, 3) * dt; f.x += Math.cos(f.a) * T.sp * dt; f.y += Math.sin(f.a) * T.sp * dt; }
      else if (f.t === 'dasher') { f.dt -= dt; if (f.dt <= 0) { f.dt = 1.6; f.da = a; f.dash = 0.35; } if (f.dash > 0) { f.dash -= dt; f.x += Math.cos(f.da) * 650 * dt; f.y += Math.sin(f.da) * 650 * dt; } else { f.x += Math.cos(a) * T.sp * dt; f.y += Math.sin(a) * T.sp * dt; } }
      else if (f.t === 'shooter') { const d = U.dist(f.x, f.y, P.x, P.y); const k = d > 260 ? 1 : -0.6; f.x += Math.cos(a) * T.sp * k * dt; f.y += Math.sin(a) * T.sp * k * dt; f.st -= dt; if (f.st <= 0) { f.st = 1.8; S.eb.push({ x: f.x, y: f.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 }); } }
      else { f.x += Math.cos(a) * T.sp * (1 + S.wave * 0.03) * dt; f.y += Math.sin(a) * T.sp * (1 + S.wave * 0.03) * dt; }
      if (f.x < f.r || f.x > g.W - f.r) f.a = Math.PI - f.a; if (f.y < f.r || f.y > g.H - f.r) f.a = -f.a;
      f.x = U.clamp(f.x, f.r, g.W - f.r); f.y = U.clamp(f.y, f.r, g.H - f.r);
      if (U.dist(f.x, f.y, P.x, P.y) < f.r + 10) hitPlayer(g, f);
    }
    for (const b of S.eb) { b.x += b.vx * dt; b.y += b.vy * dt; if (U.dist(b.x, b.y, P.x, P.y) < 12) { b.dead = true; hitPlayer(g); } if (b.x < 0 || b.y < 0 || b.x > g.W || b.y > g.H) b.dead = true; }
    for (const it of S.items) { it.t -= dt; if (U.dist(it.x, it.y, P.x, P.y) < 26) { it.got = true; g.sfx.power(); ({ '🔱': () => (S.spread = 10), '⚡': () => (S.rapid = 10), '🛡️': () => (S.shield = 8), '💣': () => S.bombs++ })[it.k](); g.float(it.x, it.y, it.k, '#fff', 30); } }
    S.bullets = S.bullets.filter((b) => !b.dead); S.foes = S.foes.filter((f) => !f.dead); S.eb = S.eb.filter((b) => !b.dead); S.items = S.items.filter((i) => !i.got && i.t > 0);
    S.waveT -= dt;
    if (S.pending.length && S.waveT <= 0) { S.waveT = Math.max(0.15, 0.7 - S.wave * 0.03); spawnFoe(g, S.pending.shift()); }
    if (!S.pending.length && !S.foes.length) { g.add(1000 * S.wave); g.sfx.win(); nextWave(g); }
    if (S.flash > 0) S.flash -= dt;
    g.info = `웨이브 ${S.wave} · ❤️${S.lives} · 💣${S.bombs} · ×${S.mult}`;
  },
  draw(g, c) {
    for (let x = 0; x <= g.W; x += 50) g.line(x, 0, x, g.H, '#0d1030', 1);
    for (let y = 0; y <= g.H; y += 50) g.line(0, y, g.W, y, '#0d1030', 1);
    c.globalCompositeOperation = 'lighter';
    for (const f of S.foes) {
      const T = ET[f.t];
      c.globalAlpha = f.spawn > 0 ? 0.3 + Math.sin(g.time * 30) * 0.2 : 1;
      c.save(); c.translate(f.x, f.y); c.rotate(f.age * (f.t === 'tank' ? 0.5 : 2));
      const pts = []; for (let i = 0; i < T.shape; i++) { const a = (i / T.shape) * Math.PI * 2, r = f.t === 'shooter' && i % 2 ? T.r * 0.5 : T.r; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      c.shadowBlur = 14; c.shadowColor = T.c;
      g.poly(pts, f.flash > 0 ? '#fff' : 'rgba(0,0,0,.3)', T.c, 3);
      c.restore();
    }
    c.globalAlpha = 1; c.shadowBlur = 8;
    for (const b of S.bullets) { c.shadowColor = '#fde047'; g.line(b.x, b.y, b.x - b.vx * 0.02, b.y - b.vy * 0.02, '#fef9c3', 3); }
    for (const b of S.eb) { c.shadowColor = '#f87171'; g.circle(b.x, b.y, 5, '#f87171'); }
    c.shadowBlur = 0; c.globalCompositeOperation = 'source-over';
    for (const it of S.items) { c.globalAlpha = it.t < 2 ? 0.5 + Math.sin(g.time * 20) * 0.5 : 1; g.emoji(it.k, it.x, it.y, 30); c.globalAlpha = 1; }
    const P = S.p;
    if (P.inv <= 0 || Math.floor(g.time * 12) % 2) {
      c.save(); c.translate(P.x, P.y); c.rotate(S.aim); c.shadowBlur = 20; c.shadowColor = '#fff';
      g.poly([[16, 0], [-10, -11], [-5, 0], [-10, 11]], '#0b1020', '#fff', 3); c.restore();
    }
    if (S.shield > 0) g.ring(P.x, P.y, 26, `rgba(96,165,250,${0.5 + Math.sin(g.time * 10) * 0.3})`, 3);
    if (!matchMedia('(pointer: coarse)').matches) g.ring(g.mouse.x, g.mouse.y, 10, 'rgba(255,255,255,.6)', 2);
    if (S.flash > 0) { c.fillStyle = `rgba(255,255,255,${S.flash})`; c.fillRect(0, 0, g.W, g.H); }
    if (S.banner > 0) { S.banner -= 1 / 60; g.text(`WAVE ${S.wave}`, g.W / 2, g.H / 2, 60, `rgba(255,255,255,${Math.min(1, S.banner)})`); }
  },
});
function spawnFoe(g, t) {
  let x, y;
  do { x = U.rand(40, g.W - 40); y = U.rand(40, g.H - 40); } while (U.dist(x, y, S.p.x, S.p.y) < 220);
  S.foes.push({ t, x, y, hp: ET[t].hp + Math.floor(S.wave / 6), r: ET[t].r, a: U.rand(6), age: 0, spawn: 0.6, flash: 0, dt: U.rand(1, 2), dash: 0, st: U.rand(1, 2) });
}
function nextWave(g) {
  S.wave++; S.banner = 1.8;
  const pool = ['wander', 'chaser', ...(S.wave >= 2 ? ['splitter'] : []), ...(S.wave >= 3 ? ['dasher'] : []), ...(S.wave >= 4 ? ['shooter'] : []), ...(S.wave >= 5 ? ['tank'] : [])];
  S.pending = Array.from({ length: 6 + S.wave * 4 }, () => U.choice(pool));
  S.waveT = 1.5;
}
function kill(g, f, bomb) {
  if (f.dead) return;
  f.dead = true; S.kills++;
  const pts = ET[f.t].pts * S.mult;
  g.add(pts); if (!bomb) g.float(f.x, f.y, '+' + pts, ET[f.t].c, 16);
  if (S.kills % 15 === 0 && S.mult < 10) { S.mult++; g.float(f.x, f.y - 20, `×${S.mult}!`, '#fde047', 26); }
  g.burst(f.x, f.y, ET[f.t].c, 18, 260); g.sfx.tone(200 + Math.random() * 100, 0.1, 'square', 0.04, 60);
  if (f.t === 'splitter' && !bomb) for (let i = 0; i < 3; i++) S.foes.push({ t: 'chaser', x: f.x + U.rand(-10, 10), y: f.y + U.rand(-10, 10), hp: 1, r: 9, a: 0, age: 0, spawn: 0, flash: 0 });
  if (Math.random() < 0.05) S.items.push({ x: f.x, y: f.y, k: U.choice(['🔱', '⚡', '🛡️', '💣']), t: 8 });
}
function hitPlayer(g, f) {
  const P = S.p;
  if (P.inv > 0) return;
  if (S.shield > 0) { if (f) kill(g, f); return; }
  S.lives--; S.mult = 1; P.inv = 2.5; g.sfx.explode(); g.shake(14); g.burst(P.x, P.y, ['#fff', '#60a5fa'], 50, 350);
  S.foes.forEach((o) => { if (U.dist(o.x, o.y, P.x, P.y) < 150) kill(g, o, true); }); S.eb = [];
  if (S.lives <= 0) g.over(`웨이브 ${S.wave} · 처치 ${S.kills}`);
}
