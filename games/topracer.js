let S;
const TRACKS = [
  [[200, 500], [200, 200], [400, 120], [700, 160], [900, 120], [1100, 250], [1050, 450], [800, 480], [700, 650], [900, 800], [700, 900], [350, 850], [250, 700]],
  [[150, 300], [400, 150], [650, 300], [900, 150], [1150, 300], [1150, 700], [900, 850], [700, 650], [500, 850], [250, 800], [150, 600]],
];
const RW = 70;
GAME({
  title: '서킷 레이싱', w: 1000, h: 680, bg: '#2f5d27', controls: 'dpad+ab', aLabel: '🚀', bLabel: '🛑',
  help: '↑ 가속 · ↓ 후진/브레이크 · ←→ 조향\nSpace = 니트로 부스트 (게이지 충전식) · 드리프트로 코너를 공략!\n잔디로 나가면 감속 · AI 3대와 3바퀴 레이스\n순위가 높을수록 점수 UP · 트랙 2개 연속 레이스',
  init(g) { S = { track: 0, total: 0 }; load(); },
  update(g, dt) {
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.lastBeep) { S.lastBeep = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 880 : 440); } return; }
    if (S.done) return;
    S.time += dt;
    const me = S.cars[0];
    drive(me, g.up, g.down || g.b, (g.right - g.left), g.a && me.nitro > 0, dt);
    if (g.a && me.nitro > 0) { me.nitro -= dt * 0.5; if (g.frame % 2 === 0) g.burst(me.x - Math.cos(me.a) * 18, me.y - Math.sin(me.a) * 18, ['#60a5fa', '#fff'], 2, 80, 0.3); } else me.nitro = Math.min(1, me.nitro + dt * 0.08);
    for (const c of S.cars.slice(1)) ai(c, dt);
    for (const a of S.cars) for (const b of S.cars) if (a !== b) { const d = U.dist(a.x, a.y, b.x, b.y); if (d < 26 && d > 0) { const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d, push = (26 - d) / 2; a.x += nx * push; a.y += ny * push; a.vx += nx * 40; a.vy += ny * 40; if (a === me && g.frame % 6 === 0) g.sfx.hit(); } }
    for (const c of S.cars) progress(g, c);
    S.cars.forEach((c) => (c.score = c.lap * 10000 + c.wp * 100 - U.dist(c.x, c.y, ...S.path[(c.wp + 1) % S.path.length]) / 10));
    const order = [...S.cars].sort((a, b) => b.score - a.score);
    S.rank = order.indexOf(me) + 1;
    if (me.lap >= 3 && !S.done) {
      S.done = true; const pts = [3000, 2000, 1000, 500][S.rank - 1] + Math.max(0, 3000 - Math.floor(S.time * 20));
      g.add(pts); g.sfx.win(); S.msg = `${S.rank}위로 완주! +${pts}`;
      g.later(() => { S.track++; if (S.track >= TRACKS.length) { if (S.rank <= 3) g.win(`모든 레이스 완주!`); else g.over('레이스 종료'); } else load(); }, 3);
    }
    g.info = `랩 ${Math.min(3, me.lap + 1)}/3 · ${S.rank}위 · ${S.time.toFixed(1)}s`;
  },
  draw(g, c) {
    const me = S.cars[0], z = 1.15;
    c.save(); c.translate(g.W / 2, g.H / 2); c.scale(z, z); c.translate(-me.x, -me.y);
    for (let x = -200; x < 1400; x += 80) for (let y = -200; y < 1100; y += 80) g.rect(x, y, 80, 80, ((x + y) / 80) % 2 ? '#356b2c' : '#2f5d27');
    c.lineCap = 'round'; c.lineJoin = 'round';
    const pathLine = () => { c.beginPath(); S.path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
    pathLine(); c.strokeStyle = '#e5e7eb'; c.lineWidth = RW * 2 + 16; c.stroke();
    c.setLineDash([20, 20]); pathLine(); c.strokeStyle = '#dc2626'; c.lineWidth = RW * 2 + 16; c.stroke(); c.setLineDash([]);
    pathLine(); c.strokeStyle = '#4b5563'; c.lineWidth = RW * 2; c.stroke();
    c.setLineDash([24, 26]); pathLine(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.stroke(); c.setLineDash([]);
    const [sx, sy] = S.path[0], [nx, ny] = S.path[1], a = Math.atan2(ny - sy, nx - sx);
    c.save(); c.translate(sx, sy); c.rotate(a); for (let i = -RW; i < RW; i += 10) for (let j = 0; j < 2; j++) g.rect(j * 10 - 10, i, 10, 10, (i / 10 + j) % 2 ? '#fff' : '#111'); c.restore();
    for (const sk of S.skids) { c.globalAlpha = sk.t / 3 * 0.4; g.rect(sk.x - 2, sk.y - 2, 4, 4, '#111'); }
    c.globalAlpha = 1;
    for (const t of S.trees) g.emoji(t[2], t[0], t[1], 40);
    for (const car of S.cars) {
      c.save(); c.translate(car.x, car.y); c.rotate(car.a);
      g.rrect(-17, -10, 34, 20, 6, car.col, '#111', 2); g.rect(2, -8, 8, 16, 'rgba(147,197,253,.9)'); g.rect(-15, -12, 8, 4, '#111'); g.rect(-15, 8, 8, 4, '#111'); g.rect(8, -12, 6, 4, '#111'); g.rect(8, 8, 6, 4, '#111');
      c.restore();
      if (car !== me) g.text(car.name, car.x, car.y - 22, 11, '#fff');
    }
    c.restore();
    g.rrect(10, 10, 220, 92, 10, 'rgba(0,0,0,.55)');
    g.text(`${S.rank}위 / 4`, 22, 32, 24, '#fde047', 'left'); g.text(`랩 ${Math.min(3, me.lap + 1)} / 3`, 22, 60, 18, '#fff', 'left');
    g.text(`${Math.round(Math.hypot(me.vx, me.vy) * 0.6)} km/h`, 140, 60, 16, '#cbd5e1', 'left');
    g.rect(22, 80, 196, 10, '#1e293b'); g.rect(22, 80, 196 * me.nitro, 10, '#60a5fa'); g.text('NITRO', 222, 85, 10, '#93c5fd', 'right');
    // 미니맵
    const ms = 0.14; c.save(); c.translate(g.W - 190, g.H - 150); g.rrect(-10, -10, 190, 145, 8, 'rgba(0,0,0,.5)');
    c.beginPath(); S.path.forEach(([x, y], i) => (i ? c.lineTo(x * ms, y * ms) : c.moveTo(x * ms, y * ms))); c.closePath(); c.strokeStyle = '#9ca3af'; c.lineWidth = 4; c.stroke();
    S.cars.forEach((car) => g.circle(car.x * ms, car.y * ms, car === me ? 4 : 3, car.col)); c.restore();
    if (S.count > 0) g.text(Math.ceil(S.count), g.W / 2, g.H / 2 - 60, 90, '#fff');
    if (S.done) g.text(S.msg, g.W / 2, g.H / 2 - 60, 40, '#fde047');
  },
});
function catmull(pts, seg) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    for (let t = 0; t < 1; t += 1 / seg) { const t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
  }
  return out;
}
function load() {
  S.path = catmull(TRACKS[S.track], 12);
  const [x0, y0] = S.path[0], [x1, y1] = S.path[2], a = Math.atan2(y1 - y0, x1 - x0);
  const cols = ['#3b82f6', '#ef4444', '#f59e0b', '#a855f7'], names = ['나', '번개', '질풍', '폭주'];
  S.cars = [0, 1, 2, 3].map((i) => { const back = 30 + Math.floor(i / 2) * 40, side = (i % 2 ? 1 : -1) * 22; return { i, name: names[i], x: x0 - Math.cos(a) * back - Math.sin(a) * side, y: y0 - Math.sin(a) * back + Math.cos(a) * side, a, vx: 0, vy: 0, lap: -1, wp: S.path.length - 3, col: cols[i], nitro: 1, skill: 0.9 + i * 0.035 + S.track * 0.03, offs: U.rand(-25, 25) }; });
  S.count = 3.5; S.lastBeep = 4; S.time = 0; S.done = false; S.skids = []; S.rank = 4;
  S.trees = [];
  for (let k = 0; k < 120; k++) { const x = U.rand(-150, 1350), y = U.rand(-150, 1050); if (nearest(x, y).d > RW + 50) S.trees.push([x, y, U.choice(['🌳', '🌲', '🪨', '🌳'])]); }
}
function nearest(x, y) { let best = 1e9, bi = 0; for (let i = 0; i < S.path.length; i++) { const d = (S.path[i][0] - x) ** 2 + (S.path[i][1] - y) ** 2; if (d < best) { best = d; bi = i; } } return { d: Math.sqrt(best), i: bi }; }
function drive(c, gas, brake, steer, boost, dt) {
  const off = nearest(c.x, c.y).d > RW;
  const fx = Math.cos(c.a), fy = Math.sin(c.a);
  const fwd = c.vx * fx + c.vy * fy, side = -c.vx * fy + c.vy * fx;
  const acc = gas ? (boost ? 620 : 380) : brake ? (fwd > 0 ? -600 : -200) : 0;
  let nf = fwd + acc * dt, ns = side * Math.pow(0.02, dt);
  nf *= Math.pow(off ? 0.35 : 0.75, dt);
  nf = U.clamp(nf, -120, (boost ? 460 : 340) * (off ? 0.5 : 1) * (c.i ? c.skill : 1));
  c.a += steer * dt * 3.2 * U.clamp(nf / 160, -1, 1);
  if (Math.abs(ns) > 60 && Math.random() < 0.6) S.skids.push({ x: c.x, y: c.y, t: 3 });
  c.vx = Math.cos(c.a) * nf - Math.sin(c.a) * ns; c.vy = Math.sin(c.a) * nf + Math.cos(c.a) * ns;
  c.x += c.vx * dt; c.y += c.vy * dt;
  S.skids = S.skids.filter((s) => (s.t -= dt / 4) > 0); if (S.skids.length > 300) S.skids.shift();
}
function ai(c, dt) {
  const n = nearest(c.x, c.y);
  const look = S.path[(n.i + 7) % S.path.length], look2 = S.path[(n.i + 14) % S.path.length];
  const tx = look[0] + Math.sin(c.offs) * 10, ty = look[1];
  let da = Math.atan2(ty - c.y, tx - c.x) - c.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  let turn = Math.atan2(look2[1] - look[1], look2[0] - look[0]) - Math.atan2(look[1] - c.y, look[0] - c.x); turn = Math.abs(((turn + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const speed = Math.hypot(c.vx, c.vy);
  drive(c, speed < 340 - turn * 160, turn > 0.9 && speed > 220, U.clamp(da * 2.5, -1, 1), Math.random() < 0.02 && c.nitro > 0.5, dt);
}
function progress(g, c) {
  const n = nearest(c.x, c.y).i, L = S.path.length;
  const ahead = (n - c.wp + L) % L;
  if (ahead > 0 && ahead < 20) {
    if (c.wp > L - 20 && n < 20) { c.lap++; if (c === S.cars[0] && c.lap > 0 && c.lap < 3) { g.sfx.coin(); g.float(g.W / 2, 160, `랩 ${c.lap + 1} / 3`, '#fff', 30); } }
    c.wp = n;
  }
}
