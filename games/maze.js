let S;
GAME({
  title: '미궁 탈출', w: 860, h: 860, bg: '#0a0a12', controls: 'dpad',
  help: '방향키/WASD/스와이프로 이동 (꾹 누르면 연속 이동)\n🚪 출구까지 제한시간 안에 도착!\n🪙 코인 +50 · ⏳ 모래시계 +10초\n레벨 4부터는 손전등 시야만 보여요 🔦',
  init(g) { S = { lvl: 0, total: 0 }; next(); },
  update(g, dt) {
    S.time -= dt;
    if (S.time <= 0) return g.over(`레벨 ${S.lvl}`);
    S.px += (S.x - S.px) * Math.min(1, dt * 20); S.py += (S.y - S.py) * Math.min(1, dt * 20);
    S.rep -= dt;
    const D = { up: [0, -1, 0], right: [1, 0, 1], down: [0, 1, 2], left: [-1, 0, 3] };
    for (const k in D) if (g.pressed(k) || (g.held(k) && S.rep <= 0)) {
      const [dx, dy, w] = D[k];
      if (!S.walls[S.y][S.x][w]) { S.x += dx; S.y += dy; S.rep = g.pressed(k) ? 0.18 : 0.07; S.steps++; }
      break;
    }
    const k = S.x + ',' + S.y;
    if (S.items[k]) { const it = S.items[k]; delete S.items[k]; if (it === '🪙') { g.add(50); g.sfx.coin(); } else { S.time += 10; g.sfx.power(); g.float(430, 400, '+10초', '#fde047', 30); } }
    if (S.x === S.n - 1 && S.y === S.n - 1) { const pts = 200 * S.lvl + Math.floor(S.time) * 10; g.add(pts); g.sfx.win(); g.float(430, 400, `탈출! +${pts}`, '#4ade80', 40); next(); }
    g.info = `레벨 ${S.lvl} · ⏱️${Math.ceil(S.time)}`;
  },
  draw(g, c) {
    const n = S.n, cs = 800 / n, ox = 30, oy = 30;
    g.rect(ox, oy, 800, 800, '#111827');
    c.lineCap = 'round';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const w = S.walls[y][x], px = ox + x * cs, py = oy + y * cs;
      if (S.trail.has(x + ',' + y)) g.rect(px + 2, py + 2, cs - 4, cs - 4, 'rgba(96,165,250,.12)');
      if (w[0]) g.line(px, py, px + cs, py, '#818cf8', 3); if (w[3]) g.line(px, py, px, py + cs, '#818cf8', 3);
      if (y === n - 1 && w[2]) g.line(px, py + cs, px + cs, py + cs, '#818cf8', 3); if (x === n - 1 && w[1]) g.line(px + cs, py, px + cs, py + cs, '#818cf8', 3);
    }
    for (const k in S.items) { const [x, y] = k.split(',').map(Number); g.emoji(S.items[k], ox + x * cs + cs / 2, oy + y * cs + cs / 2, cs * 0.6); }
    g.emoji('🚪', ox + (n - 0.5) * cs, oy + (n - 0.5) * cs, cs * 0.8);
    S.trail.add(S.x + ',' + S.y);
    const px = ox + S.px * cs + cs / 2, py = oy + S.py * cs + cs / 2;
    g.emoji('🧭', px, py, cs * 0.75);
    if (S.lvl >= 4) { const R = Math.max(120, 260 - S.lvl * 10); const grd = c.createRadialGradient(px, py, R * 0.4, px, py, R); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.97)'); c.fillStyle = grd; c.fillRect(0, 0, 860, 860); }
    g.text(`⏱️ ${Math.ceil(S.time)}`, 430, 14, 18, S.time < 10 ? '#f87171' : '#fff');
  },
});
function next() {
  S.lvl++; const n = Math.min(40, 8 + S.lvl * 3); S.n = n;
  S.walls = U.grid(n, n, () => [1, 1, 1, 1]);
  const seen = U.grid(n, n, false), st = [[0, 0]]; seen[0][0] = true;
  const D = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
  while (st.length) { const [x, y] = st[st.length - 1]; const opts = D.filter(([dx, dy]) => seen[y + dy]?.[x + dx] === false); if (!opts.length) { st.pop(); continue; } const [dx, dy, a, b] = U.choice(opts); S.walls[y][x][a] = 0; S.walls[y + dy][x + dx][b] = 0; seen[y + dy][x + dx] = true; st.push([x + dx, y + dy]); }
  for (let i = 0; i < n; i++) { const x = U.randi(1, n - 2), y = U.randi(1, n - 2), [dx, dy, a, b] = U.choice(D); S.walls[y][x][a] = 0; S.walls[y + dy][x + dx][b] = 0; }
  S.x = S.y = S.px = S.py = 0; S.steps = 0; S.rep = 0; S.trail = new Set();
  S.items = {}; for (let i = 0; i < n / 2; i++) S.items[U.randi(n) + ',' + U.randi(n)] = Math.random() < 0.75 ? '🪙' : '⏳'; delete S.items['0,0'];
  S.time = (S.time > 0 ? S.time * 0.3 : 0) + 20 + n * 2.2;
}
