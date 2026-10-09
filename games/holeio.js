let S;
const WS = 2400;
const OBJ = [['🧍', 8, 1], ['🚶', 8, 1], ['🐕', 8, 1], ['🌳', 14, 3], ['🚲', 12, 2], ['🛵', 13, 3], ['🚗', 20, 6], ['🚕', 20, 6], ['🚌', 30, 12], ['🚒', 30, 12], ['🏠', 40, 25], ['🏪', 48, 35], ['🏫', 60, 55], ['🏥', 66, 70], ['🏢', 80, 100], ['🏬', 90, 130], ['🗼', 110, 200], ['🏟️', 130, 300]];
GAME({
  title: '블랙홀', w: 1000, h: 680, bg: '#4b5563', controls: 'dpad',
  help: '마우스 방향 / 방향키로 구멍을 이동\n구멍보다 작은 물체는 빨려 들어가요 → 구멍이 커짐!\n다른 구멍도 나보다 작으면 삼킬 수 있어요 (내가 먹힐 수도!)\n제한시간 2분 · 마지막에 가장 큰 구멍이 승리',
  init(g) {
    S = { objs: [], holes: [], t: 120, falling: [], cam: { x: WS / 2, y: WS / 2, z: 1 } };
    for (let bx = 0; bx < WS; bx += 300) for (let by = 0; by < WS; by += 300) {
      const big = U.choice(OBJ.slice(10)); S.objs.push(mk(big, bx + 150 + U.rand(-30, 30), by + 150 + U.rand(-30, 30)));
      for (let i = 0; i < 4; i++) { const o = U.choice(OBJ.slice(3, 10)); S.objs.push(mk(o, bx + U.rand(20, 280), by + U.choice([20, 280]) + U.rand(-10, 10))); }
      for (let i = 0; i < 8; i++) { const o = U.choice(OBJ.slice(0, 5)); S.objs.push(mk(o, bx + U.rand(10, 290), by + U.rand(10, 290))); }
    }
    const NAMES = ['나', '블랙홀', '심연', '빨대'], COLS = ['#111827', '#7c3aed', '#dc2626', '#0891b2'];
    for (let i = 0; i < 4; i++) S.holes.push({ i, name: NAMES[i], col: COLS[i], x: i ? U.rand(300, WS - 300) : WS / 2, y: i ? U.rand(300, WS - 300) : WS / 2, r: 22, size: 22, alive: true, tx: 0, ty: 0, think: 0, score: 0 });
  },
  update(g, dt) {
    S.t -= dt;
    const me = S.holes[0];
    if (me.alive) {
      let mx = g.right - g.left, my = g.down - g.up;
      if (!mx && !my && (g.mouse.down || !matchMedia('(pointer: coarse)').matches)) { const dx = g.mouse.x - g.W / 2, dy = g.mouse.y - g.H / 2, d = Math.hypot(dx, dy); if (d > 20) { mx = dx / d * Math.min(1, d / 120); my = dy / d * Math.min(1, d / 120); } }
      const sp = 220 + me.r * 0.6;
      me.x = U.clamp(me.x + mx * sp * dt, me.r, WS - me.r); me.y = U.clamp(me.y + my * sp * dt, me.r, WS - me.r);
    }
    for (const h of S.holes) if (h.i && h.alive) botMove(h, dt);
    for (const h of S.holes) {
      if (!h.alive) continue;
      h.r += (h.size - h.r) * Math.min(1, dt * 4);
      for (const o of S.objs) {
        if (o.dead) continue;
        const d = U.dist(o.x, o.y, h.x, h.y);
        if (d < h.r - o.s * 0.3 && o.s < h.r * 0.95) { o.dead = true; S.falling.push({ ...o, hole: h, t: 0.5 }); h.size = Math.sqrt(h.size * h.size + o.v * 18); h.score += o.v; if (h.i === 0) { g.add(o.v * 10); g.sfx.tone(300 + Math.min(800, o.v * 10), 0.06, 'sine', 0.05, 80); } }
        else if (d < h.r + o.s * 0.5 && o.s < h.r * 0.95) { const a = U.angle(o.x, o.y, h.x, h.y); o.x += Math.cos(a) * 60 * dt; o.y += Math.sin(a) * 60 * dt; o.wob = 1; }
      }
      for (const o of S.holes) if (o !== h && o.alive && h.r > o.r * 1.3 && U.dist(h.x, h.y, o.x, o.y) < h.r - o.r * 0.5) { o.alive = false; h.size = Math.sqrt(h.size * h.size + o.size * o.size); h.score += o.score; if (h.i === 0) { g.add(1000); g.sfx.explode(); g.float(g.W / 2, g.H / 2 - 80, `${o.name} 삼킴!`, '#fde047', 28); } if (o.i === 0) g.sfx.lose(); }
    }
    S.falling = S.falling.filter((f) => (f.t -= dt) > 0);
    S.objs = S.objs.filter((o) => !o.dead);
    if (Math.random() < dt * 3) { const o = U.choice(OBJ.slice(0, 8)); S.objs.push(mk(o, U.rand(WS), U.rand(WS))); }
    for (const o of S.objs) if (o.v <= 6 && o.walk !== undefined) { o.x += Math.cos(o.walk) * 20 * dt; o.y += Math.sin(o.walk) * 20 * dt; if (Math.random() < dt * 0.3) o.walk = U.rand(6.28); }
    if (!me.alive) return g.over(`${Math.round(me.size)}m 크기에서 삼켜짐`);
    S.cam.x += (me.x - S.cam.x) * Math.min(1, dt * 6); S.cam.y += (me.y - S.cam.y) * Math.min(1, dt * 6);
    const tz = U.clamp(1.4 - me.r / 250, 0.35, 1.2); S.cam.z += (tz - S.cam.z) * dt * 1.5;
    const rank = S.holes.filter((h) => h.alive).sort((a, b) => b.size - a.size);
    S.rank = rank;
    if (S.t <= 0) { const won = rank[0] === me; g.add(won ? 5000 : 0); return won ? g.win(`1위! 최종 크기 ${Math.round(me.size)}m`) : g.over(`${rank.indexOf(me) + 1}위 · 크기 ${Math.round(me.size)}m`); }
    g.info = `⏱️ ${U.fmtTime(S.t)} · 크기 ${Math.round(me.size)}m · ${rank.indexOf(me) + 1}위`;
  },
  draw(g, c) {
    const z = S.cam.z;
    c.save(); c.translate(g.W / 2, g.H / 2); c.scale(z, z); c.translate(-S.cam.x, -S.cam.y);
    g.rect(0, 0, WS, WS, '#9ca3af');
    for (let bx = 0; bx < WS; bx += 300) for (let by = 0; by < WS; by += 300) { g.rect(bx + 30, by + 30, 240, 240, (bx / 300 + by / 300) % 3 ? '#a3c585' : '#b5d39a'); }
    for (let x = 0; x <= WS; x += 300) for (let y = 0; y < WS; y += 40) g.rect(x - 2, y, 4, 20, '#f9fafb');
    for (const h of S.holes) if (h.alive) { g.circle(h.x, h.y, h.r + 4, 'rgba(0,0,0,.25)'); const grd = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r); grd.addColorStop(0, '#000'); grd.addColorStop(0.8, '#0a0a0a'); grd.addColorStop(1, h.col); c.fillStyle = grd; c.beginPath(); c.arc(h.x, h.y, h.r, 0, 7); c.fill(); g.ring(h.x, h.y, h.r, h.col, 4); }
    for (const f of S.falling) { const k = f.t / 0.5; c.globalAlpha = k; g.emoji(f.e, U.lerp(f.hole.x, f.x, k), U.lerp(f.hole.y, f.y, k), f.s * 1.6 * k); c.globalAlpha = 1; }
    const vx0 = S.cam.x - g.W / 2 / z - 150, vx1 = S.cam.x + g.W / 2 / z + 150, vy0 = S.cam.y - g.H / 2 / z - 150, vy1 = S.cam.y + g.H / 2 / z + 150;
    const vis = S.objs.filter((o) => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1).sort((a, b) => a.y - b.y);
    for (const o of vis) g.emoji(o.e, o.x + (o.wob ? Math.sin(g.time * 40) * 2 : 0), o.y - o.s * 0.3, o.s * 1.6), (o.wob = 0);
    for (const h of S.holes) if (h.alive) g.text(h.name, h.x, h.y - h.r - 14, 16 / z, '#fff');
    c.restore();
    g.text(U.fmtTime(Math.max(0, S.t)), g.W / 2, 34, 32, S.t < 15 ? '#f87171' : '#fff');
    if (S.rank) { g.rrect(g.W - 180, 10, 170, 30 + S.rank.length * 22, 10, 'rgba(0,0,0,.5)'); S.rank.forEach((h, i) => g.text(`${i + 1}. ${h.name}  ${Math.round(h.size)}m`, g.W - 168, 30 + i * 22, 15, h.i === 0 ? '#fde047' : '#e5e7eb', 'left')); }
  },
});
function mk([e, s, v], x, y) { return { e, s, v, x, y, walk: v <= 2 ? U.rand(6.28) : undefined }; }
function botMove(h, dt) {
  h.think -= dt;
  if (h.think <= 0) {
    h.think = U.rand(0.5, 1.2);
    let best = null, bs = -1;
    for (let k = 0; k < 60; k++) { const o = S.objs[(Math.random() * S.objs.length) | 0]; if (!o || o.s >= h.r * 0.95) continue; const d = U.dist(o.x, o.y, h.x, h.y); const sc = o.v / (d + 100); if (sc > bs) { bs = sc; best = o; } }
    for (const o of S.holes) if (o !== h && o.alive) { const d = U.dist(o.x, o.y, h.x, h.y); if (o.r > h.r * 1.2 && d < 400) { h.tx = h.x + (h.x - o.x); h.ty = h.y + (h.y - o.y); return; } if (S.t < 100 && h.r > o.r * 1.4 && d < 450) { best = o; break; } }
    if (best) { h.tx = best.x; h.ty = best.y; } else { h.tx = U.rand(WS); h.ty = U.rand(WS); }
  }
  const a = U.angle(h.x, h.y, h.tx, h.ty), d = U.dist(h.x, h.y, h.tx, h.ty), sp = (200 + h.r * 0.6) * 0.75;
  if (d > 5) { h.x = U.clamp(h.x + Math.cos(a) * sp * dt, h.r, WS - h.r); h.y = U.clamp(h.y + Math.sin(a) * sp * dt, h.r, WS - h.r); }
}
