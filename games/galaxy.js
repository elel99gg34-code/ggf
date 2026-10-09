let S;
GAME({
  title: '갤럭시 워즈', w: 720, h: 800, bg: '#000008', controls: 'lr+ab', aLabel: '🔥',
  help: '←→ 이동 · Space 발사 (최대 2발 동시)\n편대에서 급강하하는 적을 노려라 (급강하 중 격추 시 2배)\n👑 보스는 2방 · 스테이지 클리어 보너스\n3스테이지마다 보너스 챌린지 스테이지!',
  init(g) {
    S = { x: 360, lives: 3, stage: 0, shots: [], eb: [], foes: [], inv: 0, stars: Array.from({ length: 120 }, () => ({ x: U.rand(720), y: U.rand(800), v: U.rand(40, 200), c: U.choice(['#fff', '#7dd3fc', '#fca5a5', '#fde68a']) })), dead: 0, banner: 0 };
    nextStage(g);
  },
  update(g, dt) {
    S.stars.forEach((s) => { s.y += s.v * dt; if (s.y > 800) { s.y = 0; s.x = U.rand(720); } });
    S.banner -= dt;
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) { if (S.lives < 0) return g.over(`스테이지 ${S.stage}`); S.inv = 2; S.x = 360; } }
    else {
      S.x = U.clamp(S.x + (g.right - g.left) * 400 * dt, 24, 696);
      if (g.mouse.down) S.x += U.clamp(g.mouse.x - S.x, -400 * dt, 400 * dt);
      if ((g.pressed('a') || g.mouse.clicked) && S.shots.length < 2) { S.shots.push({ x: S.x, y: 720 }); g.sfx.shoot(); }
    }
    S.inv -= dt;
    const sway = Math.sin(g.time * 1.2) * 30, breathe = 1 + Math.sin(g.time * 2) * 0.04;
    S.diveT -= dt;
    const inForm = S.foes.filter((f) => f.state === 'form');
    if (S.diveT <= 0 && inForm.length && !S.challenge) {
      S.diveT = Math.max(0.6, 2.4 - S.stage * 0.2);
      const f = U.choice(inForm); f.state = 'dive'; f.t = 0; f.sx = f.x; f.sy = f.y; f.dir = f.x < 360 ? -1 : 1; g.sfx.tone(600, 0.3, 'sine', 0.04, 200);
    }
    for (const f of S.foes) {
      const fx = 360 + (f.gx - 360) * breathe + sway, fy = 110 + (f.gy - 110) * breathe;
      f.t += dt;
      if (f.state === 'enter') {
        const t = Math.max(0, f.t - f.delay);
        if (t <= 0) { f.x = -100; f.y = -100; continue; }
        const k = Math.min(1, t / 1.6);
        const px = f.side < 0 ? -40 + 300 * k : 760 - 300 * k, py = 600 * Math.sin(k * Math.PI) * 0.6 + 50 * k;
        if (k < 1) { const a = k * Math.PI * 2 * f.side; f.x = px + Math.sin(a) * 80; f.y = py - Math.cos(a) * 80 + 80; }
        else { f.x += (fx - f.x) * Math.min(1, dt * 5); f.y += (fy - f.y) * Math.min(1, dt * 5); if (U.dist(f.x, f.y, fx, fy) < 3) { f.state = S.challenge ? 'leave' : 'form'; f.t = 0; } }
      } else if (f.state === 'form') { f.x = fx; f.y = fy; }
      else if (f.state === 'dive') {
        const t = f.t;
        f.x = f.sx + f.dir * Math.sin(t * 2.5) * 140 + (S.x - f.sx) * Math.min(1, t / 2.5);
        f.y = f.sy + t * (220 + S.stage * 15);
        if (Math.random() < dt * 1.5 && f.y < 600) S.eb.push({ x: f.x, y: f.y, vx: (S.x - f.x) * 0.4, vy: 380 });
        if (f.y > 840) { f.state = 'return'; f.y = -40; f.x = fx; }
      } else if (f.state === 'return') { f.x += (fx - f.x) * Math.min(1, dt * 3); f.y += (fy - f.y) * Math.min(1, dt * 3); if (U.dist(f.x, f.y, fx, fy) < 4) f.state = 'form'; }
      else if (f.state === 'leave') { f.y -= 300 * dt; f.x += f.side * 200 * dt; if (f.y < -60) f.gone = true; }
      if (!S.dead && S.inv <= 0 && f.state !== 'enter' && U.dist(f.x, f.y, S.x, 740) < 26) { f.dead = true; die(g); }
    }
    for (const s of S.shots) {
      s.y -= 800 * dt;
      for (const f of S.foes) if (!f.dead && Math.abs(s.x - f.x) < 20 && Math.abs(s.y - f.y) < 18) {
        s.dead = true; f.hp--;
        if (f.hp <= 0) {
          f.dead = true;
          const base = f.boss ? 150 : f.row < 3 ? 80 : 50;
          const pts = f.state === 'dive' ? base * 2 : S.challenge ? 100 : base;
          g.add(pts, f.x, f.y); g.burst(f.x, f.y, ['#fde047', '#f97316', '#fff'], 22); g.sfx.explode();
          if (S.challenge) S.hits++;
        } else { g.sfx.hit(); f.hurt = 0.2; }
        break;
      }
    }
    for (const b of S.eb) { b.x += b.vx * dt; b.y += b.vy * dt; if (!S.dead && S.inv <= 0 && Math.abs(b.x - S.x) < 14 && Math.abs(b.y - 740) < 18) { b.dead = true; die(g); } }
    S.shots = S.shots.filter((s) => !s.dead && s.y > 0); S.eb = S.eb.filter((b) => !b.dead && b.y < 820);
    S.foes = S.foes.filter((f) => !f.dead && !f.gone);
    if (!S.foes.length) {
      if (S.challenge) { const bonus = S.hits * 100 + (S.hits === S.total ? 10000 : 0); g.add(bonus); g.float(360, 400, S.hits === S.total ? 'PERFECT! +10000' : `명중 ${S.hits}/${S.total}`, '#fde047', 36); }
      else g.add(500 * S.stage);
      g.sfx.win(); nextStage(g);
    }
    g.info = `스테이지 ${S.stage} · ❤️${Math.max(0, S.lives)}`;
  },
  draw(g, c) {
    S.stars.forEach((s) => g.rect(s.x, s.y, 2, 2, s.c));
    for (const f of S.foes) {
      c.save(); c.translate(f.x, f.y);
      if (f.state === 'dive') c.rotate(Math.sin(f.t * 5) * 0.4);
      g.emoji(f.boss ? (f.hp > 1 ? '👑' : '😡') : f.row < 3 ? '🦋' : '🐝', 0, 0, f.boss ? 34 : 30);
      c.restore();
    }
    S.shots.forEach((s) => { g.rect(s.x - 2, s.y - 12, 4, 16, '#fde047'); });
    S.eb.forEach((b) => g.circle(b.x, b.y, 4, '#f87171'));
    if (!S.dead && (S.inv <= 0 || Math.floor(g.time * 10) % 2)) {
      g.poly([[S.x, 714], [S.x + 22, 760], [S.x, 750], [S.x - 22, 760]], '#e5e7eb', '#60a5fa', 2);
      g.rect(S.x - 2, 706, 4, 14, '#f87171');
      g.circle(S.x, 764, 4 + Math.random() * 3, '#f97316');
    }
    for (let i = 0; i < Math.max(0, S.lives); i++) g.poly([[24 + i * 30, 776], [36 + i * 30, 794], [12 + i * 30, 794]], '#e5e7eb');
    if (S.banner > 0) g.text(S.challenge ? '★ 챌린지 스테이지 ★' : `STAGE ${S.stage}`, 360, 400, 44, S.challenge ? '#fde047' : '#fff');
  },
});
function nextStage(g) {
  S.stage++;
  S.challenge = S.stage % 3 === 0;
  S.foes = []; S.eb = []; S.banner = 2.2; S.diveT = 3; S.hits = 0;
  if (S.challenge) {
    for (let i = 0; i < 24; i++) S.foes.push({ gx: 120 + (i % 8) * 70, gy: 200 + Math.floor(i / 8) * 60, row: 3, hp: 1, state: 'enter', t: 0, delay: 2 + Math.floor(i / 4) * 0.7 + (i % 4) * 0.15, side: Math.floor(i / 4) % 2 ? 1 : -1, x: -100, y: -100 });
    S.total = 24;
  } else {
    let k = 0;
    for (let r = 0; r < 5; r++) {
      const n = r === 0 ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const gx = 360 + (i - (n - 1) / 2) * 62, gy = 110 + r * 52;
        S.foes.push({ gx, gy, row: r, boss: r === 0, hp: r === 0 ? 2 : 1, state: 'enter', t: 0, delay: 1.5 + Math.floor(k / 4) * 0.55 + (k % 4) * 0.12, side: Math.floor(k / 4) % 2 ? 1 : -1, x: -100, y: -100 });
        k++;
      }
    }
  }
}
function die(g) {
  S.lives--; S.dead = 2; g.sfx.explode(); g.shake(14); g.burst(S.x, 740, ['#fff', '#60a5fa', '#f97316'], 60, 350, 1.2);
  S.eb = [];
}
