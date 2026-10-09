let S;
const LW = 2.4, F = 520, D = 3.2, CAMY = 3.2, HOR = 230;
GAME({
  title: '지하철 질주', w: 720, h: 900, bg: '#7dd3fc', controls: 'dpad',
  help: '←→ 레인 이동 · ↑ 점프 · ↓ 슬라이딩 (스와이프도 가능)\n🚆 기차는 옆으로 피하고, 낮은 장애물은 점프, 높은 장애물은 슬라이딩!\n🪙 코인 · 🧲 자석 · ✖️2 점수 2배 · 👟 슈퍼 점프\n점점 빨라져요. 몇 미터까지 갈 수 있을까?',
  init(g) { S = { lane: 0, x: 0, y: 0, vy: 0, roll: 0, dist: 0, speed: 14, objs: [], coins: 0, spawnZ: 30, mag: 0, x2: 0, sj: 0, dead: false, t: 0, stumble: 0 }; },
  update(g, dt) {
    if (S.dead) return;
    S.t += dt;
    if (g.pressed('left') && S.lane > -1) { S.lane--; g.sfx.move(); }
    if (g.pressed('right') && S.lane < 1) { S.lane++; g.sfx.move(); }
    const ground = S.y <= 0;
    if (g.pressed('up') && ground) { S.vy = S.sj > 0 ? 17 : 12; S.roll = 0; g.sfx.jump(); }
    if (g.pressed('down')) { if (!ground) S.vy = -20; S.roll = 0.6; g.sfx.tone(200, 0.1, 'triangle', 0.05); }
    S.x += (S.lane * LW - S.x) * Math.min(1, dt * 14);
    S.vy -= 34 * dt; S.y = Math.max(0, S.y + S.vy * dt); if (S.y === 0) S.vy = Math.max(0, S.vy);
    S.roll -= dt; S.mag -= dt; S.x2 -= dt; S.sj -= dt; S.stumble -= dt;
    S.speed = Math.min(34, 14 + S.dist / 120);
    const dz = S.speed * dt;
    S.dist += dz;
    for (const o of S.objs) o.z -= dz;
    S.spawnZ -= dz;
    while (S.spawnZ < 80) { spawnRow(); }
    const pl = Math.round(S.x / LW);
    for (const o of S.objs) {
      if (o.dead) continue;
      if (o.k === 'coin' || o.k === 'pu') {
        if (S.mag > 0 && o.k === 'coin' && o.z < 12 && o.z > -1) { o.lane += (S.x / LW - o.lane) * Math.min(1, dt * 8); o.h += (S.y + 1 - o.h) * Math.min(1, dt * 8); }
        if (Math.abs(o.z) < 0.8 && Math.abs(o.lane * LW - S.x) < 1.2 && Math.abs((o.h || 1) - (S.y + 1)) < 1.6) {
          o.dead = true;
          if (o.k === 'coin') { S.coins++; g.add(S.x2 > 0 ? 20 : 10); g.sfx.tone(1300, 0.04, 'square', 0.03); }
          else { g.sfx.power(); if (o.p === '🧲') S.mag = 10; if (o.p === '✖️') S.x2 = 12; if (o.p === '👟') S.sj = 10; g.float(360, 500, o.p + '!', '#fde047', 36); }
        }
        continue;
      }
      if (o.z > 1.0 || o.z + (o.len || 1) < -0.5) continue;
      if (Math.abs(o.lane * LW - S.x) > 1.3) continue;
      let hit = false;
      if (o.k === 'train') hit = S.y < 3.6;
      if (o.k === 'low') hit = S.y < 1.1;
      if (o.k === 'high') hit = S.roll <= 0;
      if (o.k === 'train' && S.y >= 3.6) { S.y = Math.max(S.y, 3.6); if (S.vy < 0) { S.vy = 0; } }
      if (hit) {
        if (o.z > 0.4 && Math.abs(o.lane * LW - S.x) > 0.7 && S.stumble <= 0) { S.stumble = 1; S.lane = Math.round(S.x / LW) + (S.x > o.lane * LW ? 1 : -1); S.lane = U.clamp(S.lane, -1, 1); g.sfx.hit(); g.shake(6); continue; }
        S.dead = true; g.sfx.explode(); g.shake(16); g.burst(360, 700, ['#fde047', '#f97316', '#fff'], 50, 400);
        return g.later(() => g.over(`${Math.floor(S.dist)}m · 🪙${S.coins}`), 0.9);
      }
    }
    // 기차 위 착지
    const onTrain = S.objs.some((o) => o.k === 'train' && Math.abs(o.lane * LW - S.x) < 1.3 && o.z < 0.5 && o.z + o.len > 0);
    if (onTrain && S.y < 3.6 && S.y > 3.0) { S.y = 3.6; S.vy = 0; }
    if (!onTrain && S.y > 0 && S.vy === 0) S.vy = -0.1;
    S.objs = S.objs.filter((o) => o.z + (o.len || 1) > -3 && !o.dead);
    g.score = Math.floor(S.dist) * (1) + S.coins * 10;
    g.info = `${Math.floor(S.dist)}m · 🪙${S.coins}` + (S.mag > 0 ? ' 🧲' : '') + (S.x2 > 0 ? ' ✖️2' : '') + (S.sj > 0 ? ' 👟' : '');
  },
  draw(g, c) {
    const W = g.W, H = g.H;
    const P = (x, y, z) => { const s = F / (z + D); return [W / 2 + (x - S.x * 0.6) * s, HOR + (CAMY + S.y * 0.4 - y) * s, s]; };
    let grd = c.createLinearGradient(0, 0, 0, HOR); grd.addColorStop(0, '#38bdf8'); grd.addColorStop(1, '#bae6fd'); c.fillStyle = grd; c.fillRect(0, 0, W, HOR + 2);
    for (let i = 0; i < 6; i++) { const bx = ((i * 160 - S.dist * 2) % 960 + 960) % 960 - 120; g.rect(bx, HOR - 60 - (i % 3) * 40, 90, 60 + (i % 3) * 40, '#94a3b8'); }
    g.rect(0, HOR, W, H - HOR, '#57534e');
    for (let l = -1; l <= 1; l++) {
      const [x1, y1] = P(l * LW - LW / 2, 0, 0), [x2] = P(l * LW + LW / 2, 0, 0), [x3, y3] = P(l * LW + LW / 2, 0, 90), [x4] = P(l * LW - LW / 2, 0, 90);
      g.poly([[x1, y1 + 400], [x2, y1 + 400], [x3, y3], [x4, y3]], '#78716c');
      for (const rx of [-0.6, 0.6]) { const [a, b] = P(l * LW + rx, 0, -2), [cx2, d2] = P(l * LW + rx, 0, 90); g.line(a, b, cx2, d2, '#d6d3d1', 3); }
    }
    for (let z = (-S.dist % 2 + 2) % 2; z < 80; z += 2) { const [a, b, s] = P(-LW * 1.6, 0, z), [cx2] = P(LW * 1.6, 0, z); g.rect(a, b - 2, cx2 - a, Math.max(1, s * 0.12), '#44403c'); }
    const list = [...S.objs].sort((a, b) => b.z - a.z);
    for (const o of list) {
      if (o.z > 80 || o.z < -2.5) continue;
      const lx = o.lane * LW;
      if (o.k === 'train') {
        const z0 = Math.max(-1, o.z), z1 = o.z + o.len;
        const [a1, b1] = P(lx - 1.1, 3.4, z1), [a2] = P(lx + 1.1, 3.4, z1), [, b0] = P(lx, 0, z1);
        const [c1, d1, s] = P(lx - 1.1, 3.4, z0), [c2] = P(lx + 1.1, 3.4, z0), [, d0] = P(lx, 0, z0);
        g.poly([[c1, d1], [a1, b1], [a2, b1], [c2, d1]], '#b91c1c');
        g.poly([[c1, d1], [c2, d1], [c2, d0], [c1, d0]], o.col);
        g.rect(c1 + (c2 - c1) * 0.15, d1 + (d0 - d1) * 0.15, (c2 - c1) * 0.7, (d0 - d1) * 0.3, '#bae6fd');
        g.circle(c1 + (c2 - c1) * 0.2, d1 + (d0 - d1) * 0.75, s * 0.18, '#fde047'); g.circle(c1 + (c2 - c1) * 0.8, d1 + (d0 - d1) * 0.75, s * 0.18, '#fde047');
      } else if (o.k === 'low' || o.k === 'high') {
        const y0 = o.k === 'low' ? 0 : 1.6, y1 = o.k === 'low' ? 1 : 3;
        const [a, b, s] = P(lx - 1.1, y1, o.z), [a2, b2] = P(lx + 1.1, y0, o.z);
        for (let i = 0; i < 4; i++) g.rect(a + (a2 - a) * i / 4, b, (a2 - a) / 4, b2 - b, i % 2 ? '#f8fafc' : '#dc2626');
        if (o.k === 'high') { const [pa, pb] = P(lx - 1.1, 0, o.z), [pc] = P(lx + 1.1, 0, o.z); g.rect(pa, b2, s * 0.12, pb - b2, '#525252'); g.rect(pc - s * 0.12, b2, s * 0.12, pb - b2, '#525252'); }
      } else if (o.k === 'coin') { const [x, y, s] = P(o.lane * LW, o.h, o.z); const w = Math.abs(Math.sin(S.t * 5 + o.z)) * s * 0.5 + s * 0.08; g.rrect(x - w / 2, y - s * 0.3, w, s * 0.6, w / 2, '#facc15', '#a16207', 1); }
      else if (o.k === 'pu') { const [x, y, s] = P(lx, 1.2, o.z); g.circle(x, y, s * 0.6, 'rgba(255,255,255,.5)'); g.emoji(o.p, x, y, s * 0.9); }
    }
    const [px, py, ps] = P(S.x, S.y, 1.2), [gx, gy] = P(S.x, 0, 1.2);
    c.save(); c.scale(1, 0.35); g.circle(gx, gy / 0.35, ps * 0.45, 'rgba(0,0,0,.3)'); c.restore();
    c.save(); c.translate(px, py - ps * 0.75);
    if (S.roll > 0) { c.rotate(S.t * 15); g.emoji('🧑', 0, ps * 0.4, ps * 0.8); }
    else { c.scale(-1, 1); g.emoji('🏃', 0, Math.abs(Math.sin(S.t * 14)) * -6, ps * 1.3); }
    c.restore();
    if (S.stumble > 0) g.emoji('👮', px, py + 60, 70);
    g.text(Math.floor(S.dist) + 'm', W / 2, 40, 36, '#fff');
    g.text('🪙 ' + S.coins, W - 20, 40, 26, '#fde047', 'right');
  },
});
function spawnRow() {
  const z = S.spawnZ + 80;
  const lanes = U.shuffle([-1, 0, 1]);
  const diff = Math.min(1, S.dist / 3000);
  const free = lanes[0];
  for (const l of lanes.slice(1)) {
    const r = Math.random();
    if (r < 0.35 + diff * 0.2) S.objs.push({ k: 'train', lane: l, z, len: U.rand(8, 16), col: U.choice(['#e5e7eb', '#fbbf24', '#60a5fa']) });
    else if (r < 0.55 + diff * 0.15) S.objs.push({ k: U.choice(['low', 'high']), lane: l, z });
  }
  if (Math.random() < 0.3) S.objs.push({ k: U.choice(['low', 'high']), lane: free, z: z + 8 });
  for (let i = 0; i < 6; i++) S.objs.push({ k: 'coin', lane: free, z: z + i * 1.6, h: 1 });
  if (Math.random() < 0.08) S.objs.push({ k: 'pu', lane: U.choice(lanes), z: z + 12, p: U.choice(['🧲', '✖️', '👟']) });
  S.spawnZ += U.rand(16, 24) - diff * 5;
}
