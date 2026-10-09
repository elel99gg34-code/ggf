let S;
const GW = 120, GH = 84, T = 7;
GAME({
  title: '영역 점령', w: GW * T, h: GH * T, bg: '#000', controls: 'dpad+ab', aLabel: '✏️',
  help: '방향키로 테두리 위를 이동\nSpace/Z 를 누른 채 이동하면 선을 그려요\n선을 이어 닫으면 Qix가 없는 쪽을 점령!\n그리는 선에 Qix가 닿거나 ⚡스파크에 닿으면 사망 · 75% 점령 시 클리어',
  init(g) {
    S = { level: 0, lives: 3 };
    S.img = document.createElement('canvas'); S.img.width = GW; S.img.height = GH;
    S.ictx = S.img.getContext('2d');
    newLevel();
  },
  update(g, dt) {
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) { if (S.lives < 0) return g.over(`레벨 ${S.level}`); clearTrail(); } return; }
    const P = S.p;
    const D = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    let dir = null;
    for (const [k, dx, dy] of D) if (g.held(k)) dir = [dx, dy];
    const drawing = g.a || g.mouse.down;
    S.mt += dt * (S.trail.length ? (drawing ? 32 : 0) : 45);
    while (S.mt >= 1) {
      S.mt -= 1;
      if (!dir) break;
      const nx = P.x + dir[0], ny = P.y + dir[1];
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) break;
      const v = S.grid[ny][nx];
      if (S.trail.length) {
        if (v === 2) break;
        if (v === 1) { P.x = nx; P.y = ny; close(g); break; }
        S.grid[ny][nx] = 2; S.trail.push([nx, ny]); P.x = nx; P.y = ny;
      } else {
        if (v === 1 && isEdge(nx, ny)) { P.x = nx; P.y = ny; }
        else if (v === 0 && drawing) { S.grid[ny][nx] = 2; S.trail.push([nx, ny]); P.x = nx; P.y = ny; g.sfx.tone(300, 0.03, 'triangle', 0.03); }
      }
    }
    if (!S.trail.length) S.mt = Math.min(S.mt, 1);
    // Qix 이동
    for (const q of S.qix) {
      q.t -= dt;
      if (q.t <= 0) { q.t = U.rand(0.3, 1.2); const a = U.rand(Math.PI * 2), sp = U.rand(20, 40 + S.level * 6); q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp; }
      let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
      const cell = (x, y) => S.grid[Math.floor(y)]?.[Math.floor(x)];
      if (cell(nx, q.y) === 1 || cell(nx, q.y) === undefined) { q.vx *= -1; nx = q.x; }
      if (cell(q.x, ny) === 1 || cell(q.x, ny) === undefined) { q.vy *= -1; ny = q.y; }
      q.x = nx; q.y = ny;
      q.hist.unshift([q.x, q.y, q.ang += dt * 3]); if (q.hist.length > 14) q.hist.pop();
      for (let ox = -2; ox <= 2; ox++) for (let oy = -2; oy <= 2; oy++) if (cell(q.x + ox, q.y + oy) === 2) return die(g);
      if (S.trail.length && Math.abs(q.x - P.x) < 2.5 && Math.abs(q.y - P.y) < 2.5) return die(g);
    }
    // 스파크
    for (const s of S.sparks) {
      s.t += dt * (14 + S.level * 2);
      while (s.t >= 1) {
        s.t -= 1;
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [s.x + dx, s.y + dy]).filter(([x, y]) => S.grid[y]?.[x] === 1 && isEdge(x, y) && !(x === s.px && y === s.py));
        s.px = s.x; s.py = s.y;
        if (opts.length) { const o = s.cw ? opts[0] : opts[opts.length - 1]; s.x = o[0]; s.y = o[1]; } else { s.px = null; }
      }
      if (Math.abs(s.x - P.x) <= 1 && Math.abs(s.y - P.y) <= 1) return die(g);
    }
    g.info = `레벨 ${S.level} · ${S.pct.toFixed(1)}% · ❤️${Math.max(0, S.lives)}`;
  },
  draw(g, c) {
    c.imageSmoothingEnabled = false;
    c.drawImage(S.img, 0, 0, GW * T, GH * T);
    for (const [x, y] of S.trail) g.rect(x * T, y * T, T, T, '#f87171');
    for (const q of S.qix) q.hist.forEach(([x, y, a], i) => {
      const L = 22 + Math.sin(a * 2) * 10;
      g.line((x + Math.cos(a) * L / T) * T, (y + Math.sin(a) * L / T) * T, (x - Math.cos(a) * L / T) * T, (y - Math.sin(a) * L / T) * T, `hsla(${(a * 60 + i * 15) % 360},100%,60%,${1 - i / 14})`, 3);
    });
    for (const s of S.sparks) g.emoji('⚡', s.x * T + T / 2, s.y * T + T / 2, 18);
    const P = S.p;
    if (!(S.dead > 0)) { g.circle(P.x * T + T / 2, P.y * T + T / 2, 7, '#fff'); g.circle(P.x * T + T / 2, P.y * T + T / 2, 4, '#22d3ee'); }
    g.text(`${S.pct.toFixed(1)}% / 75%`, g.W / 2, 22, 18, '#fff');
  },
});
function isEdge(x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (S.grid[y + dy]?.[x + dx] === 0) return true; return false; }
function paint() {
  const id = S.ictx.createImageData(GW, GH), d = id.data, hue = (S.level * 70) % 360;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = (y * GW + x) * 4, v = S.grid[y][x];
    if (v === 1) { const edge = isEdge(x, y); const ch = ((x >> 2) + (y >> 2)) % 2; const [r, gg, b] = hsl2rgb(hue, 0.6, edge ? 0.8 : ch ? 0.38 : 0.32); d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
    else { d[i] = 5; d[i + 1] = 5; d[i + 2] = 15; }
    d[i + 3] = 255;
  }
  S.ictx.putImageData(id, 0, 0);
}
function hsl2rgb(h, s, l) { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255]; }
function close(g) {
  for (const [x, y] of S.trail) S.grid[y][x] = 1;
  const reach = U.grid(GW, GH, false), st = [];
  for (const q of S.qix) { const x = Math.floor(q.x), y = Math.floor(q.y); if (S.grid[y][x] === 0) { reach[y][x] = true; st.push([x, y]); } }
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (S.grid[ny]?.[nx] === 0 && !reach[ny][nx]) { reach[ny][nx] = true; st.push([nx, ny]); } } }
  let gained = S.trail.length;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (S.grid[y][x] === 0 && !reach[y][x]) { S.grid[y][x] = 1; gained++; }
  S.trail = [];
  const inner = (GW - 2) * (GH - 2);
  let claimed = 0; for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) if (S.grid[y][x] === 1) claimed++;
  S.pct = (claimed / inner) * 100;
  g.add(Math.round(gained * (1 + S.level * 0.2))); g.sfx.coin(); g.burst(S.p.x * T, S.p.y * T, '#fde047', 20);
  paint();
  if (S.pct >= 75) { g.add(Math.round((S.pct - 75) * 200) + 2000); g.sfx.win(); newLevel(); }
}
function clearTrail() { for (const [x, y] of S.trail) S.grid[y][x] = 0; if (S.trail.length) { S.p.x = S.trail[0][0] - (S.startDir?.[0] || 0); } const t0 = S.trailStart; S.trail = []; if (t0) { S.p.x = t0[0]; S.p.y = t0[1]; } }
function die(g) {
  S.lives--; S.dead = 1.2; g.sfx.explode(); g.shake(10); g.burst(S.p.x * T, S.p.y * T, ['#fff', '#22d3ee'], 40);
  S.trailStart = S.trail.length ? findStart() : null;
}
function findStart() { const [x, y] = S.trail[0]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (S.grid[y + dy]?.[x + dx] === 1) return [x + dx, y + dy]; return [x, y]; }
function newLevel() {
  S.level++;
  S.grid = U.grid(GW, GH, 0);
  for (let x = 0; x < GW; x++) { S.grid[0][x] = 1; S.grid[GH - 1][x] = 1; }
  for (let y = 0; y < GH; y++) { S.grid[y][0] = 1; S.grid[y][GW - 1] = 1; }
  S.p = { x: GW >> 1, y: GH - 1 }; S.trail = []; S.mt = 0; S.pct = 0; S.dead = 0;
  S.qix = Array.from({ length: S.level >= 3 ? 2 : 1 }, () => ({ x: GW / 2 + U.rand(-10, 10), y: GH / 2, vx: 20, vy: 15, t: 0, hist: [], ang: 0 }));
  S.sparks = Array.from({ length: Math.min(4, S.level) }, (_, i) => ({ x: i % 2 ? GW - 1 : 0, y: 0, t: 0, cw: i % 2 === 0 }));
  paint();
}
