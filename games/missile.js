let S;
GAME({
  title: '미사일 커맨드', w: 900, h: 640, bg: '#05010f', controls: 'none',
  help: '화면을 클릭하면 가장 가까운 기지에서 요격 미사일 발사\n1/2/3 키(또는 A·S·D)로 발사 기지 지정 가능\n폭발 반경에 들어온 적 미사일은 모두 파괴\n웨이브 종료 시 남은 도시·탄약 보너스',
  init(g) {
    S = { wave: 0, cities: [130, 210, 290, 610, 690, 770].map((x) => ({ x, alive: true })), bases: [45, 450, 855].map((x) => ({ x, ammo: 10, alive: true })), mis: [], ints: [], exps: [], spawnLeft: 0, t: 0, bonusT: 0 };
    nextWave();
  },
  update(g, dt) {
    if (S.bonusT > 0) { S.bonusT -= dt; if (S.bonusT <= 0) nextWave(); return; }
    let base = -1;
    if (g.keyp('Digit1') || g.keyp('KeyA')) base = 0; if (g.keyp('Digit2') || g.keyp('KeyS')) base = 1; if (g.keyp('Digit3') || g.keyp('KeyD')) base = 2;
    if (g.mouse.clicked || base >= 0) {
      const tx = g.mouse.x, ty = Math.min(g.mouse.y, 560);
      let cand = S.bases.map((b, i) => ({ b, i })).filter((o) => o.b.alive && o.b.ammo > 0);
      if (base >= 0) cand = cand.filter((o) => o.i === base);
      cand.sort((a, b) => Math.abs(a.b.x - tx) - Math.abs(b.b.x - tx));
      if (cand.length) {
        const b = cand[0].b; b.ammo--;
        S.ints.push({ x: b.x, y: 580, sx: b.x, sy: 580, tx, ty, sp: cand[0].i === 1 ? 900 : 650 }); g.sfx.shoot();
      }
    }
    S.t -= dt;
    if (S.spawnLeft > 0 && S.t <= 0) {
      S.t = Math.max(0.25, 1.6 - S.wave * 0.12) * U.rand(0.5, 1.2);
      const n = Math.min(S.spawnLeft, U.randi(1, 3));
      for (let i = 0; i < n; i++) spawn(U.rand(20, 880), -10);
      S.spawnLeft -= n;
    }
    for (const m of S.ints) {
      const a = U.angle(m.x, m.y, m.tx, m.ty), d = U.dist(m.x, m.y, m.tx, m.ty);
      if (d < m.sp * dt) { m.dead = true; boom(g, m.tx, m.ty, 'p'); } else { m.x += Math.cos(a) * m.sp * dt; m.y += Math.sin(a) * m.sp * dt; }
    }
    for (const m of S.mis) {
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.split && m.y > m.split) { m.split = 0; for (let i = 0; i < 2; i++) spawn(m.x, m.y, m); }
      if (m.y >= 580) { m.dead = true; boom(g, m.x, 585, 'e'); hitGround(g, m.x); }
    }
    for (const e of S.exps) {
      e.t += dt; e.r = Math.sin(Math.min(1, e.t / 1.2) * Math.PI) * e.max;
      if (e.t > 1.2) e.dead = true;
      if (e.kind === 'p') for (const m of S.mis) if (!m.dead && U.dist(m.x, m.y, e.x, e.y) < e.r) {
        m.dead = true; g.add(m.bomb ? 100 : 25, m.x, m.y); boom(g, m.x, m.y, 'p', 0.8);
      }
    }
    S.mis = S.mis.filter((m) => !m.dead); S.ints = S.ints.filter((m) => !m.dead); S.exps = S.exps.filter((e) => !e.dead);
    if (!S.cities.some((c) => c.alive)) return g.over(`웨이브 ${S.wave}`);
    if (S.spawnLeft === 0 && !S.mis.length && !S.exps.length) {
      const c = S.cities.filter((c) => c.alive).length, a = S.bases.reduce((s, b) => s + (b.alive ? b.ammo : 0), 0);
      const bonus = (c * 100 + a * 5) * Math.min(6, Math.ceil(S.wave / 2));
      g.add(bonus); g.float(450, 300, `보너스 +${bonus}`, '#fde047', 34); g.sfx.win();
      S.bonusT = 2.5;
      if (S.wave % 4 === 0) { const dead = S.cities.find((c) => !c.alive); if (dead) { dead.alive = true; g.float(dead.x, 540, '도시 재건!', '#4ade80'); } }
    }
    g.info = `웨이브 ${S.wave} · 🏙️${S.cities.filter((c) => c.alive).length}`;
  },
  draw(g, c) {
    for (let i = 0; i < 60; i++) g.rect((i * 137) % 900, (i * 89) % 500, 1.5, 1.5, '#6b6b9a');
    g.rect(0, 590, g.W, 50, '#a16207');
    for (const b of S.bases) {
      g.poly([[b.x - 40, 590], [b.x - 20, 565], [b.x + 20, 565], [b.x + 40, 590]], b.alive ? '#ca8a04' : '#57534e');
      if (b.alive) for (let i = 0; i < b.ammo; i++) g.rect(b.x - 18 + (i % 5) * 8, 600 + Math.floor(i / 5) * 10, 4, 7, '#93c5fd');
    }
    for (const ct of S.cities) g.emoji(ct.alive ? '🏙️' : '🔥', ct.x, 570, 34);
    for (const m of S.mis) { g.line(m.sx, m.sy, m.x, m.y, m.bomb ? '#f472b6' : '#ef4444', 2); g.circle(m.x, m.y, 3, '#fff'); }
    for (const m of S.ints) { g.line(m.sx, m.sy, m.x, m.y, '#60a5fa', 2); g.text('✕', m.tx, m.ty, 14, '#93c5fd'); }
    for (const e of S.exps) { g.circle(e.x, e.y, e.r, `hsla(${(g.time * 900) % 360},90%,65%,.85)`); }
    g.line(g.mouse.x - 10, g.mouse.y, g.mouse.x + 10, g.mouse.y, '#fff', 1); g.line(g.mouse.x, g.mouse.y - 10, g.mouse.x, g.mouse.y + 10, '#fff', 1);
    if (S.bonusT > 0) g.text(`WAVE ${S.wave + 1} 준비`, 450, 250, 44, '#fff');
  },
});
function spawn(x, y, parent) {
  const targets = [...S.cities.filter((c) => c.alive), ...S.bases.filter((b) => b.alive)];
  const t = targets.length ? U.choice(targets) : { x: 450 };
  const sp = 35 + S.wave * 9 + U.rand(10);
  const a = U.angle(x, y, t.x + U.rand(-10, 10), 585);
  S.mis.push({ x, y, sx: x, sy: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, split: !parent && S.wave >= 3 && Math.random() < 0.2 ? U.rand(150, 350) : 0, bomb: !parent && S.wave >= 5 && Math.random() < 0.15 });
  if (S.mis[S.mis.length - 1].bomb) { const m = S.mis[S.mis.length - 1]; m.vx *= 1.6; m.vy *= 1.6; }
}
function boom(g, x, y, kind, s = 1) { S.exps.push({ x, y, t: 0, r: 0, max: (kind === 'p' ? 55 : 35) * s, kind }); g.sfx.explode(); }
function hitGround(g, x) {
  for (const c of S.cities) if (c.alive && Math.abs(c.x - x) < 35) { c.alive = false; g.shake(10); g.burst(c.x, 570, ['#f97316', '#fde047'], 30); }
  for (const b of S.bases) if (b.alive && Math.abs(b.x - x) < 40) { b.alive = false; b.ammo = 0; g.shake(10); }
}
function nextWave() {
  S.wave++;
  S.spawnLeft = 8 + S.wave * 3; S.t = 1;
  S.bases.forEach((b) => { b.alive = true; b.ammo = 10; });
}
