let S;
const SEG = 200, RW = 2000, CAMH = 1000, DEPTH = 0.84, DRAW = 220, LANES = 3;
GAME({
  title: '아웃런 레이서', w: 1024, h: 640, bg: '#000', controls: 'dpad', noAutoPause: false,
  help: '↑ 가속 · ↓ 브레이크 · ←→ 핸들\n도로 밖은 감속! 커브에서는 원심력에 밀려나요\n🏁 체크포인트를 통과하면 시간 연장\n다른 차를 추월할수록 점수 UP · 시간이 0이 되면 끝',
  init(g) {
    S = { pos: 0, px: 0, speed: 0, segs: [], cars: [], time: 45, dist: 0, passed: 0, stage: 1, hit: 0 };
    build();
  },
  update(g, dt) {
    const maxS = SEG * 60, accel = maxS / 5;
    const seg = findSeg(S.pos + 400);
    const dx = dt * 2 * (S.speed / maxS);
    if (g.left) S.px -= dx; if (g.right) S.px += dx;
    S.px -= dx * (S.speed / maxS) * seg.curve * 0.32;
    if (g.up) S.speed += accel * dt; else if (g.down) S.speed -= maxS * dt; else S.speed -= (accel / 3) * dt;
    if ((S.px < -1 || S.px > 1) && S.speed > maxS / 4) S.speed -= maxS * 1.6 * dt;
    S.px = U.clamp(S.px, -2.2, 2.2);
    S.speed = U.clamp(S.speed, 0, maxS);
    S.hit -= dt;
    // 사이드 오브젝트 충돌
    if (S.px < -1 || S.px > 1) for (const sp of seg.sprites) { if (Math.abs(S.px - sp.off) < 0.3) { S.speed = maxS / 6; S.pos = Math.floor(S.pos / SEG) * SEG - SEG * 2; g.sfx.hit(); g.shake(10); break; } }
    S.pos += S.speed * dt; const total = S.segs.length * SEG;
    while (S.pos >= total) S.pos -= total; while (S.pos < 0) S.pos += total;
    S.dist += S.speed * dt;
    for (const c of S.cars) {
      const before = c.z;
      c.z += c.speed * dt; while (c.z >= total) c.z -= total;
      const rel = ((c.z - S.pos) % total + total) % total;
      if (rel < 500 && rel > 0 && Math.abs(S.px - c.off) < 0.42 && S.speed > c.speed && S.hit <= 0) { S.speed = c.speed * 0.5; S.hit = 0.6; g.sfx.hit(); g.shake(8); }
      const relPrev = ((before - (S.pos - S.speed * dt)) % total + total) % total;
      if (relPrev < total / 2 && rel > total / 2 && !c.counted) { S.passed++; g.add(100, g.W / 2, 300); c.counted = true; }
      if (rel < total / 2 && rel > 2000) c.counted = false;
      // AI 차량 차선 회피
      if (c.cool <= 0 && rel < 3000) { c.off += (Math.random() - 0.5) * 0.2; c.off = U.clamp(c.off, -0.8, 0.8); c.cool = 1; } c.cool = (c.cool || 0) - dt;
    }
    // 체크포인트
    const cp = Math.floor(S.dist / (SEG * 900));
    if (cp > S.cp) { S.cp = cp; S.time += 30; S.stage++; g.sfx.win(); g.float(g.W / 2, 200, '🏁 체크포인트! +30초', '#fde047', 34); }
    S.time -= dt;
    g.score = Math.floor(S.dist / 100) + S.passed * 100;
    if (S.time <= 0) { S.time = 0; return g.over(`${(S.dist / 10000).toFixed(1)}km · 추월 ${S.passed}대`); }
    if (g.frame % 4 === 0 && S.speed > 100) g.sfx.tone(60 + (S.speed / maxS) * 140, 0.08, 'sawtooth', 0.012);
    g.info = `⏱️ ${Math.ceil(S.time)} · 스테이지 ${S.stage} · 추월 ${S.passed}`;
  },
  draw(g, c) {
    const W = g.W, H = g.H;
    const sky = c.createLinearGradient(0, 0, 0, H / 2); const th = (S.stage - 1) % 4;
    const SK = [['#1e3a8a', '#f472b6'], ['#0c4a6e', '#fde68a'], ['#1e1b4b', '#c026d3'], ['#7c2d12', '#fdba74']][th];
    sky.addColorStop(0, SK[0]); sky.addColorStop(1, SK[1]); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const base = findSeg(S.pos), bidx = base.i;
    const curveOff = -((S.pos % SEG) / SEG) * base.curve;
    g.circle(W / 2 - S.px * 40 - bidx * 0.3 % 2000 + 200, H / 2 - 120, 70, 'rgba(253,224,71,.85)');
    for (let i = 0; i < 6; i++) { const mx = ((i * 300 - (bidx * 2 + S.px * 30)) % 1800 + 1800) % 1800 - 300; g.poly([[mx, H / 2 + 20], [mx + 180, H / 2 - 90 - (i % 3) * 30], [mx + 360, H / 2 + 20]], ['#312e81', '#164e63', '#4c1d95', '#7c2d12'][th]); }
    const total = S.segs.length * SEG;
    const camY = CAMH + U.lerp(base.p1.y, base.p2.y, (S.pos % SEG) / SEG);
    let maxy = H, x = 0, ddx = curveOff;
    const vis = [];
    for (let n = 0; n < DRAW; n++) {
      const s = S.segs[(bidx + n) % S.segs.length], loop = bidx + n >= S.segs.length ? total : 0;
      const p1 = project(s.p1, S.px * RW - x, camY, S.pos - loop, W, H), p2 = project(s.p2, S.px * RW - x - ddx, camY, S.pos - loop, W, H);
      x += ddx; ddx += s.curve;
      s.clip = maxy; s.sp1 = p1; s.sp2 = p2;
      vis.push(s);
      if (p1.cz <= DEPTH || p2.y >= p1.y || p2.y >= maxy) continue;
      const fog = Math.min(1, n / DRAW);
      const alt = Math.floor(s.i / 3) % 2;
      c.fillStyle = alt ? '#15803d' : '#16a34a'; c.fillRect(0, p2.y, W, p1.y - p2.y + 2);
      poly(c, p1.x - p1.w * 1.15, p1.y, p1.x + p1.w * 1.15, p2.x + p2.w * 1.15, p2.y, p2.x - p2.w * 1.15, alt ? '#e5e7eb' : '#dc2626');
      poly(c, p1.x - p1.w, p1.y, p1.x + p1.w, p2.x + p2.w, p2.y, p2.x - p2.w, alt ? '#52525b' : '#57575f');
      if (alt) for (let l = 1; l < LANES; l++) { const k = -1 + (2 * l) / LANES; poly(c, p1.x + p1.w * k - p1.w * 0.02, p1.y, p1.x + p1.w * k + p1.w * 0.02, p2.x + p2.w * k + p2.w * 0.02, p2.y, p2.x + p2.w * k - p2.w * 0.02, '#f8fafc'); }
      if (s.check) poly(c, p1.x - p1.w, p1.y, p1.x + p1.w, p2.x + p2.w, p2.y, p2.x - p2.w, Math.floor(s.i) % 2 ? '#fff' : '#111');
      if (fog > 0.4) { c.fillStyle = `rgba(200,200,230,${(fog - 0.4) * 0.6})`; c.fillRect(0, p2.y, W, p1.y - p2.y + 1); }
      maxy = p2.y;
    }
    for (let n = vis.length - 1; n > 0; n--) {
      const s = vis[n], p = s.sp1; if (!p || p.cz <= DEPTH) continue;
      for (const sp of s.sprites) { const sx = p.x + p.w * sp.off, sz = Math.min(700, p.w * sp.size * 1.3); if (sz > 3 && p.y - sz * 0.6 < s.clip) g.emoji(sp.e, sx, p.y - sz * 0.42, sz); }
      for (const car of S.cars) { const ci = Math.floor(car.z / SEG) % S.segs.length; if (ci !== s.i) continue; const sz = Math.min(420, p.w * 0.6); if (sz > 3 && p.y - sz * 0.4 < s.clip + 10) { c.save(); c.translate(p.x + p.w * car.off, p.y - sz * 0.36); c.scale(-1, 1); g.emoji(car.e, 0, 0, sz); c.restore(); } }
    }
    const bounce = S.speed > 0 ? Math.sin(g.time * 30) * 2 : 0;
    c.save(); c.translate(W / 2, H - 95 + bounce); c.scale(-1, 1);
    if (g.left) c.rotate(0.08); if (g.right) c.rotate(-0.08);
    g.emoji('🏎️', 0, 0, 150); c.restore();
    const kmh = Math.round((S.speed / (SEG * 60)) * 300);
    g.rrect(20, H - 90, 200, 70, 14, 'rgba(0,0,0,.55)');
    g.text(kmh, 120, H - 62, 40, '#fde047'); g.text('km/h', 120, H - 32, 14, '#fff');
    g.text(Math.ceil(S.time), W / 2, 50, 56, S.time < 10 ? '#f87171' : '#fff');
    g.text(`${(S.dist / 10000).toFixed(2)} km`, W - 20, 40, 22, '#fff', 'right');
  },
});
function project(p, cx, cy, cz, W, H) {
  const tz = p.z - cz, scale = DEPTH / Math.max(0.0001, tz);
  return { x: Math.round(W / 2 + scale * (p.x - cx) * W / 2), y: Math.round(H / 2 - scale * (p.y - cy) * H / 2), w: Math.round(scale * RW * W / 2), scale: scale * W / 2 / RW * 1, cz: tz };
}
function poly(c, x1, y1, x2, x3, y3, x4, col) { y1 += 1.5; c.fillStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y1); c.lineTo(x3, y3); c.lineTo(x4, y3); c.closePath(); c.fill(); }
function findSeg(z) { return S.segs[Math.floor(z / SEG) % S.segs.length]; }
function build() {
  const segs = [];
  const lastY = () => (segs.length ? segs[segs.length - 1].p2.y : 0);
  const add = (curve, y) => { const n = segs.length; segs.push({ i: n, p1: { x: 0, y: lastY(), z: n * SEG }, p2: { x: 0, y, z: (n + 1) * SEG }, curve, sprites: [] }); };
  const road = (enter, hold, leave, curve, hill) => {
    const sy = lastY(), ey = sy + hill * SEG, tot = enter + hold + leave;
    const ease = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);
    for (let i = 0; i < enter; i++) add(ease(0, curve, i / enter), ease(sy, ey, i / tot));
    for (let i = 0; i < hold; i++) add(curve, ease(sy, ey, (enter + i) / tot));
    for (let i = 0; i < leave; i++) add(ease(curve, 0, i / leave), ease(sy, ey, (enter + hold + i) / tot));
  };
  road(50, 50, 50, 0, 0);
  for (let k = 0; k < 40; k++) { const r = Math.random(); road(U.randi(20, 50), U.randi(20, 80), U.randi(20, 50), r < 0.3 ? 0 : U.choice([-1, 1]) * U.rand(1, 6), U.choice([0, 0, 20, -20, 40, -40, 60])); }
  road(50, 50, 50, 0, -lastY() / SEG);
  const SP = ['🌴', '🌴', '🌳', '🌲', '🏠', '🪨', '🌵', '🏢', '🎄', '🗿'];
  for (const s of segs) {
    if (s.i % 900 === 0 && s.i) for (let k = 0; k < 4; k++) segs[s.i + k] && (segs[s.i + k].check = true);
    if (s.i > 20 && Math.random() < 0.5) { const side = U.choice([-1, 1]); s.sprites.push({ e: SP[Math.floor(s.i / 400) % 4 * 2 + U.randi(0, 1)] || '🌴', off: side * U.rand(1.3, 3), size: U.rand(0.5, 0.8) }); }
    if (s.i % 60 === 0) s.sprites.push({ e: '🪧', off: -1.25, size: 0.4 });
  }
  S.segs = segs;
  const CE = ['🚗', '🚙', '🚕', '🚓', '🚌', '🚚', '🏎️'];
  for (let i = 0; i < 70; i++) S.cars.push({ z: U.rand(SEG * 50, segs.length * SEG), off: U.choice([-0.66, 0, 0.66]) + U.rand(-0.1, 0.1), speed: SEG * U.rand(15, 40), e: U.choice(CE), counted: false, cool: 0 });
  S.cp = 0;
}
