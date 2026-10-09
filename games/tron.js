let S;
const T = 8, GW = 110, GH = 80;
const COLS = ['#22d3ee', '#f472b6', '#fde047', '#4ade80'];
GAME({
  title: '라이트 사이클', w: GW * T, h: GH * T, bg: '#02040a', controls: 'dpad+ab', aLabel: '⚡',
  help: '방향키/WASD/스와이프로 방향 전환\nSpace 꾹 = 부스트 (게이지 소모)\n벽이나 궤적에 닿으면 탈락\n라운드 승리마다 +500, 5라운드 먼저 이기면 승리',
  init(g) { S = { wins: [0, 0, 0, 0], round: 0 }; newRound(); },
  update(g, dt) {
    if (S.wait > 0) { S.wait -= dt; return; }
    const me = S.bikes[0];
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const k in D) if (g.pressed(k)) { const [x, y] = D[k]; if (x !== -me.dx || y !== -me.dy) me.q.push([x, y]); }
    me.boosting = g.a && me.boost > 0;
    if (me.boosting) me.boost = Math.max(0, me.boost - dt * 0.6); else me.boost = Math.min(1, me.boost + dt * 0.12);
    S.t += dt;
    const step = 0.03;
    while (S.t >= step) {
      S.t -= step; S.tick++;
      for (const b of S.bikes) {
        if (!b.alive) continue;
        const moves = b === me ? (me.boosting ? 2 : S.tick % 2 === 0 ? 1 : 0) : S.tick % 2 === 0 ? 1 : 0;
        for (let m = 0; m < moves; m++) {
          if (b === me) { if (me.q.length) { const [x, y] = me.q.shift(); if (x !== -me.dx || y !== -me.dy) { me.dx = x; me.dy = y; } } }
          else ai(b);
          b.x += b.dx; b.y += b.dy;
          if (b.x < 0 || b.y < 0 || b.x >= GW || b.y >= GH || S.grid[b.y][b.x]) { crash(g, b); break; }
          S.grid[b.y][b.x] = b.i + 1;
        }
      }
      if (!me.alive) { g.later(() => g.over(`라운드 ${S.round} · 승리 ${S.wins[0]}회`), 1); S.wait = 99; return; }
      const alive = S.bikes.filter((b) => b.alive);
      if (alive.length === 1) {
        S.wins[0]++; g.add(500 + S.round * 100); g.sfx.win();
        if (S.wins[0] >= 5) { S.wait = 99; return g.win('5라운드 승리! 그리드의 지배자'); }
        newRound(); return;
      }
    }
    if (S.tick % 10 === 0) g.add(1);
    g.info = `라운드 ${S.round} · 🏆${S.wins[0]}`;
  },
  draw(g, c) {
    for (let x = 0; x <= GW; x += 10) g.line(x * T, 0, x * T, g.H, '#0b1830', 1);
    for (let y = 0; y <= GH; y += 10) g.line(0, y * T, g.W, y * T, '#0b1830', 1);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const v = S.grid[y][x]; if (v) g.rect(x * T + 1, y * T + 1, T - 2, T - 2, COLS[v - 1]); }
    c.shadowBlur = 16;
    for (const b of S.bikes) if (b.alive) { c.shadowColor = COLS[b.i]; g.rect(b.x * T - 3, b.y * T - 3, T + 6, T + 6, '#fff'); }
    c.shadowBlur = 0;
    const me = S.bikes[0];
    g.rect(10, g.H - 20, 160, 10, '#1e293b'); g.rect(10, g.H - 20, 160 * me.boost, 10, '#22d3ee');
    g.text('BOOST', 180, g.H - 15, 12, '#22d3ee', 'left');
    if (S.wait > 0 && S.wait < 10) g.text(S.wait > 0.5 ? `ROUND ${S.round}` : 'GO!', g.W / 2, g.H / 2, 56, '#fff');
  },
});
function newRound() {
  S.round++;
  S.grid = U.grid(GW, GH, 0);
  S.bikes = [
    { i: 0, x: 20, y: 40, dx: 1, dy: 0 }, { i: 1, x: 90, y: 40, dx: -1, dy: 0 }, { i: 2, x: 55, y: 10, dx: 0, dy: 1 }, { i: 3, x: 55, y: 70, dx: 0, dy: -1 },
  ].map((b) => ({ ...b, alive: true, q: [], boost: 1, smart: 0.7 + S.round * 0.06 }));
  S.bikes.forEach((b) => (S.grid[b.y][b.x] = b.i + 1));
  S.wait = 1.6; S.t = 0; S.tick = 0;
}
function free(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH && !S.grid[y][x]; }
function space(x, y, lim = 120) {
  const seen = new Set([x + ',' + y]), q = [[x, y]]; let n = 0;
  while (q.length && n < lim) { const [cx, cy] = q.shift(); n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny; if (!seen.has(k) && free(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
  return n;
}
function ai(b) {
  const opts = [[b.dx, b.dy], [b.dy, -b.dx], [-b.dy, b.dx]].filter(([dx, dy]) => free(b.x + dx, b.y + dy));
  if (!opts.length) return;
  const me = S.bikes[0];
  let best = null, bs = -1e9;
  for (const [dx, dy] of opts) {
    let s = space(b.x + dx, b.y + dy) * 10;
    let run = 0; while (run < 20 && free(b.x + dx * (run + 1), b.y + dy * (run + 1))) run++;
    s += run * 2;
    if (Math.random() < b.smart && me.alive) s -= U.dist(b.x + dx, b.y + dy, me.x + me.dx * 6, me.y + me.dy * 6) * 0.8;
    if (dx === b.dx && dy === b.dy) s += 6;
    s += U.rand(8);
    if (s > bs) { bs = s; best = [dx, dy]; }
  }
  [b.dx, b.dy] = best;
}
function crash(g, b) {
  b.alive = false; g.sfx.explode(); g.burst(b.x * T, b.y * T, COLS[b.i], 40, 300);
  if (b.i === 0) g.shake(12); else g.add(200, b.x * T, b.y * T);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (S.grid[y][x] === b.i + 1) S.grid[y][x] = 0;
}
