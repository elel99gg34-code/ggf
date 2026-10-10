let S;
const TRACK = [[200, 600], [180, 300], [320, 140], [600, 160], [760, 320], [1000, 260], [1240, 140], [1460, 260], [1420, 560], [1180, 700], [900, 640], [700, 820], [420, 860], [240, 780]];
const RW = 85, CAR = ['🏎️', '🚓', '🚕', '🚙', '🚗'], CN = ['나', '마리', '루이', '쿠파', '피치'], CC = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#ec4899'];
const ITEMS = ['🍌', '🐢', '🍄', '⚡', '⭐'];
GAME({
  title: '카트 레이싱', w: 1000, h: 680, bg: '#4d7c0f', controls: 'dpad+ab', aLabel: '🎁', bLabel: '💨',
  help: '↑ 가속 · ↓ 브레이크 · ←→ 조향 · Shift/X 드리프트(코너 후 미니터보!)\n❓ 아이템 박스를 먹고 Space로 사용: 🍌 바나나 · 🐢 등껍질 · 🍄 부스터 · ⚡ 번개 · ⭐ 무적\nAI 4대와 3바퀴 레이스 · 순위가 높을수록 고득점\n잔디로 나가면 감속돼요',
  init(g) { S = { cup: 0, pts: 0 }; race(); },
  update(g, dt) {
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.cb) { S.cb = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 880 : 440); } return; }
    if (S.done) return;
    S.time += dt;
    const me = S.cars[0];
    drive(g, me, g.up, g.down, g.right - g.left, g.b, dt);
    if (g.pressed('a') && me.item) useItem(g, me);
    for (const c of S.cars.slice(1)) ai(g, c, dt);
    for (const a of S.cars) for (const b of S.cars) if (a !== b) { const d = U.dist(a.x, a.y, b.x, b.y); if (d < 30 && d > 0) { const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d; a.x += nx * (30 - d) / 2; a.y += ny * (30 - d) / 2; if (b.star > 0 && a.star <= 0) spin(a); } }
    for (const bx of S.boxes) { bx.t -= dt; if (bx.t > 0) continue; for (const c of S.cars) if (!c.item && U.dist(c.x, c.y, bx.x, bx.y) < 30) { bx.t = 4; c.item = pickItem(c); if (c === me) g.sfx.power(); } }
    for (const h of S.haz) {
      if (h.k === '🐢') { const t = h.target; if (t) { const a = U.angle(h.x, h.y, t.x, t.y); h.vx += Math.cos(a) * 900 * dt; h.vy += Math.sin(a) * 900 * dt; const s = Math.hypot(h.vx, h.vy); h.vx *= 520 / s; h.vy *= 520 / s; } h.x += h.vx * dt; h.y += h.vy * dt; h.life -= dt; }
      for (const c of S.cars) if (U.dist(c.x, c.y, h.x, h.y) < 26 && h.owner !== c && h.life > 0) { h.life = 0; if (c.star <= 0) { spin(c); if (c === me) g.sfx.hit(); } }
    }
    S.haz = S.haz.filter((h) => h.life > 0);
    for (const c of S.cars) progress(g, c);
    const order = [...S.cars].sort((a, b) => b.prog - a.prog);
    S.rank = order.indexOf(me) + 1;
    if (me.lap >= 3) { S.done = true; const pts = [10, 7, 5, 3, 1][S.rank - 1]; S.pts += pts; g.add([3000, 2000, 1200, 600, 200][S.rank - 1]); g.sfx.win(); S.msg = `${S.rank}위로 완주! (+${pts}점)`; g.later(() => { S.cup++; if (S.cup >= 3) { S.pts >= 20 ? g.win(`그랑프리 종합 ${S.pts}점!`) : g.over(`그랑프리 종합 ${S.pts}점`); } else race(); }, 3); }
    g.info = `레이스 ${S.cup + 1}/3 · 랩 ${Math.min(3, me.lap + 1)}/3 · ${S.rank}위`;
  },
  draw(g, c) {
    const me = S.cars[0], z = 1.1;
    c.save(); c.translate(500, 360); c.scale(z, z); c.rotate(-me.a - Math.PI / 2); c.translate(-me.x, -me.y);
    for (let x = -400; x < 1900; x += 100) for (let y = -300; y < 1300; y += 100) g.rect(x, y, 100, 100, ((x + y) / 100) % 2 ? '#65a30d' : '#4d7c0f');
    c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => { c.beginPath(); S.path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
    path(); c.strokeStyle = '#facc15'; c.lineWidth = RW * 2 + 20; c.stroke();
    c.setLineDash([18, 18]); path(); c.strokeStyle = '#dc2626'; c.stroke(); c.setLineDash([]);
    path(); c.strokeStyle = '#6b7280'; c.lineWidth = RW * 2; c.stroke();
    const [sx, sy] = S.path[0], [nx, ny] = S.path[3], a0 = Math.atan2(ny - sy, nx - sx);
    c.save(); c.translate(sx, sy); c.rotate(a0); for (let i = -RW; i < RW; i += 12) for (let j = 0; j < 2; j++) g.rect(j * 12 - 12, i, 12, 12, (i / 12 + j) % 2 ? '#fff' : '#111'); c.restore();
    for (const bx of S.boxes) if (bx.t <= 0) { c.save(); c.translate(bx.x, bx.y); c.rotate(g.time * 2); g.rrect(-14, -14, 28, 28, 6, `hsla(${g.time * 200 % 360},90%,60%,.85)`, '#fff', 2); g.text('?', 0, 1, 18, '#fff'); c.restore(); }
    for (const h of S.haz) g.emoji(h.k, h.x, h.y, 28);
    S.cars.forEach((car, i) => { c.save(); c.translate(car.x, car.y); c.rotate(car.a + (car.spin > 0 ? car.spin * 20 : 0) + Math.PI); if (car.star > 0) { c.shadowBlur = 20; c.shadowColor = '#fde047'; } g.emoji(CAR[i], 0, 0, 44); c.shadowBlur = 0; c.restore(); if (car.boost > 0) g.burst(car.x - Math.cos(car.a) * 20, car.y - Math.sin(car.a) * 20, ['#f97316', '#fde047'], 1, 60, 0.3); if (i) { c.save(); c.translate(car.x, car.y - 30); c.rotate(me.a + Math.PI / 2); g.text(CN[i], 0, 0, 11, '#fff'); c.restore(); } });
    c.restore();
    g.rrect(10, 10, 180, 90, 12, 'rgba(0,0,0,.55)'); g.text(`${S.rank}위`, 100, 42, 34, '#fde047'); g.text(`랩 ${Math.min(3, me.lap + 1)}/3`, 100, 80, 18, '#fff');
    g.rrect(890, 10, 100, 100, 16, 'rgba(0,0,0,.55)', '#fff', 3); if (me.item) g.emoji(me.item, 940, 60, 60); else g.text('아이템', 940, 60, 14, '#94a3b8');
    if (me.drift) g.text(me.driftT > 1 ? '🔥 미니터보 준비!' : '드리프트...', 500, 640, 18, me.driftT > 1 ? '#f97316' : '#fff');
    if (S.count > 0) g.text(Math.ceil(S.count), 500, 300, 100, '#fff');
    if (S.done) g.text(S.msg, 500, 300, 40, '#fde047');
  },
});
function catmull(pts, seg) { const out = []; for (let i = 0; i < pts.length; i++) { const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length]; for (let t = 0; t < 1; t += 1 / seg) { const t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); } } return out; }
function race() {
  const tr = TRACK.map(([x, y]) => (S.cup % 2 ? [1700 - x, y] : [x, y]));
  S.path = catmull(S.cup === 2 ? tr.slice().reverse() : tr, 10);
  const [x0, y0] = S.path[0], [x1, y1] = S.path[2], a = Math.atan2(y1 - y0, x1 - x0);
  S.cars = CN.map((n, i) => { const back = 40 + Math.floor(i / 2) * 45, side = (i % 2 ? 1 : -1) * 28; return { i, x: x0 - Math.cos(a) * back - Math.sin(a) * side, y: y0 - Math.sin(a) * back + Math.cos(a) * side, a, sp: 0, lap: -1, wp: S.path.length - 4, prog: 0, item: null, spin: 0, boost: 0, star: 0, slow: 0, drift: false, driftT: 0, skill: 0.88 + i * 0.03 + S.cup * 0.03, off: U.rand(-30, 30), it: 0 }; });
  S.boxes = []; for (let k = 8; k < S.path.length; k += 28) for (const o of [-45, 0, 45]) { const [px, py] = S.path[k], [qx, qy] = S.path[(k + 1) % S.path.length], an = Math.atan2(qy - py, qx - px); S.boxes.push({ x: px - Math.sin(an) * o, y: py + Math.cos(an) * o, t: 0 }); }
  S.haz = []; S.count = 3.5; S.cb = 4; S.done = false; S.time = 0; S.rank = 5;
}
function near(x, y) { let b = 1e9, bi = 0; for (let i = 0; i < S.path.length; i++) { const d = (S.path[i][0] - x) ** 2 + (S.path[i][1] - y) ** 2; if (d < b) { b = d; bi = i; } } return { d: Math.sqrt(b), i: bi }; }
function drive(g, c, gas, brk, steer, drift, dt) {
  c.spin -= dt; c.boost -= dt; c.star -= dt; c.slow -= dt;
  if (c.spin > 0) { c.sp *= Math.pow(0.1, dt); return move(c, dt); }
  const off = near(c.x, c.y).d > RW;
  const max = (c.boost > 0 || c.star > 0 ? 470 : 340) * (off && c.star <= 0 ? 0.45 : 1) * (c.slow > 0 ? 0.55 : 1) * (c.i ? c.skill : 1);
  if (gas) c.sp += 420 * dt; else if (brk) c.sp -= 600 * dt; else c.sp -= 200 * dt;
  if (c.boost > 0) c.sp = Math.max(c.sp, max);
  c.sp = U.clamp(c.sp, -100, max);
  if (drift && Math.abs(steer) && c.sp > 150 && !c.drift) { c.drift = true; c.driftT = 0; c.dDir = Math.sign(steer); }
  if (c.drift) { c.driftT += dt; if (!drift || c.sp < 100) { if (c.driftT > 1) { c.boost = 0.9; if (c === S.cars[0]) g.sfx.power(); } c.drift = false; } }
  c.a += (steer * 2.4 + (c.drift ? c.dDir * 1.1 : 0)) * dt * U.clamp(c.sp / 200, -1, 1);
  move(c, dt);
}
function move(c, dt) { const da = c.drift ? c.dDir * 0.35 : 0; c.x += Math.cos(c.a - da) * c.sp * dt; c.y += Math.sin(c.a - da) * c.sp * dt; }
function ai(g, c, dt) {
  const n = near(c.x, c.y), look = S.path[(n.i + 9) % S.path.length], tx = look[0] + Math.cos(c.off) * 15, ty = look[1] + Math.sin(c.off) * 15;
  let da = Math.atan2(ty - c.y, tx - c.x) - c.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  drive(g, c, true, false, U.clamp(da * 2.2, -1, 1), false, dt);
  if (c.item) { c.it += dt; if (c.it > U.rand(1, 4)) { useItem(g, c); c.it = 0; } }
}
function pickItem(c) { const r = S.cars.indexOf(c) === 0 ? S.rank : [...S.cars].sort((a, b) => b.prog - a.prog).indexOf(c) + 1; const pool = r <= 1 ? ['🍌', '🍌', '🐢'] : r >= 4 ? ['🍄', '⭐', '⚡', '🐢'] : ['🍌', '🐢', '🍄', '🍄']; return U.choice(pool); }
function useItem(g, c) {
  const k = c.item; c.item = null;
  if (k === '🍌') S.haz.push({ k, x: c.x - Math.cos(c.a) * 35, y: c.y - Math.sin(c.a) * 35, life: 30, owner: c });
  if (k === '🐢') { const order = [...S.cars].sort((a, b) => b.prog - a.prog), ahead = order[order.indexOf(c) - 1]; S.haz.push({ k, x: c.x + Math.cos(c.a) * 35, y: c.y + Math.sin(c.a) * 35, vx: Math.cos(c.a) * 520, vy: Math.sin(c.a) * 520, life: 4, owner: c, target: ahead }); }
  if (k === '🍄') c.boost = 1.4;
  if (k === '⭐') c.star = 6;
  if (k === '⚡') { for (const o of S.cars) if (o !== c && o.star <= 0) { o.slow = 3; o.sp *= 0.5; } if (c === S.cars[0] || true) g.sfx.tone(1500, 0.3, 'sawtooth', 0.05, 100); }
  if (c === S.cars[0]) g.sfx.shoot();
}
function spin(c) { c.spin = 1; c.item = c.item; }
function progress(g, c) {
  const n = near(c.x, c.y).i, L = S.path.length, ahead = (n - c.wp + L) % L;
  if (ahead > 0 && ahead < 25) { if (c.wp > L - 25 && n < 25) { c.lap++; if (c === S.cars[0] && c.lap > 0 && c.lap < 3) { g.float(500, 200, c.lap === 2 ? '🏁 마지막 바퀴!' : `랩 ${c.lap + 1}`, '#fde047', 34); g.sfx.coin(); } } c.wp = n; }
  c.prog = c.lap * L + c.wp;
}
