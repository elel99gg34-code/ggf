let S;
// 비트: 1=상 2=우 4=하 8=좌
GAME({
  title: '파이프 연결', w: 760, h: 820, bg: '#0c1222', controls: 'none',
  help: '타일을 클릭하면 시계방향 90° 회전 (우클릭 = 반시계)\n중앙 💧 수원에서 모든 파이프로 물이 흐르게 연결하세요\n끊어진 끝이 없고, 모든 타일이 물로 차면 클리어!\n단계마다 판이 커져요',
  init(g) { S = { lvl: 0 }; next(); },
  update(g, dt) {
    if (S.done > 0) { S.done -= dt; if (S.done <= 0) { if (S.lvl >= 8) return g.win('모든 단계 클리어!'); next(); } return; }
    S.time += dt;
    for (const row of S.t) for (const c of row) c.ang += (c.rot * Math.PI / 2 - c.ang) * Math.min(1, dt * 18);
    const cs = S.cs, x = Math.floor((g.mouse.x - S.ox) / cs), y = Math.floor((g.mouse.y - S.oy) / cs);
    if ((g.mouse.clicked || g.mouse.rclick) && x >= 0 && y >= 0 && x < S.n && y < S.n) {
      const c = S.t[y][x]; if (c.lock) return;
      c.rot += g.mouse.rclick ? -1 : 1; c.m = rot(c.m, g.mouse.rclick ? 3 : 1); S.moves++; g.sfx.tone(400, 0.04, 'square', 0.04);
      flow();
      if (S.wet.size === S.n * S.n) { const pts = Math.max(200, S.n * S.n * 30 - S.moves * 3 - Math.floor(S.time)); g.add(pts); g.sfx.win(); S.done = 1.6; }
    }
    g.info = `단계 ${S.lvl} · ${S.n}×${S.n} · 💧${S.wet.size}/${S.n * S.n}`;
  },
  draw(g, c) {
    g.text(`단계 ${S.lvl}`, 380, 40, 28, '#fff');
    const cs = S.cs;
    for (let y = 0; y < S.n; y++) for (let x = 0; x < S.n; x++) {
      const t = S.t[y][x], px = S.ox + x * cs, py = S.oy + y * cs, wet = S.wet.has(y * S.n + x);
      g.rrect(px + 2, py + 2, cs - 4, cs - 4, 8, '#16213a');
      c.save(); c.translate(px + cs / 2, py + cs / 2); c.rotate(t.ang - t.rot * Math.PI / 2);
      const col = wet ? '#38bdf8' : '#64748b', w = cs * 0.26;
      for (let b = 0; b < 4; b++) if (t.m & (1 << b)) { c.save(); c.rotate((b * Math.PI) / 2); g.rect(-w / 2, -cs / 2, w, cs / 2 + w / 2, col); if (wet) g.rect(-w / 6, -cs / 2, w / 3, cs / 2, '#bae6fd'); c.restore(); }
      g.circle(0, 0, w * 0.6, col);
      c.restore();
      if (x === S.sx && y === S.sy) g.emoji('💧', px + cs / 2, py + cs / 2, cs * 0.45);
      else if (bits(t.m) === 1) g.emoji(wet ? '🏠' : '🏚️', px + cs / 2, py + cs / 2, cs * 0.42);
    }
    if (S.done > 0) g.text('💦 연결 완료!', 380, 420, 52, '#fff');
  },
});
function bits(m) { return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1); }
function rot(m, k) { for (let i = 0; i < k; i++) m = ((m << 1) | (m >> 3)) & 15; return m; }
function next() {
  S.lvl++; S.n = Math.min(11, 3 + S.lvl); const n = S.n;
  S.cs = Math.floor(Math.min(680 / n, 90)); S.ox = (760 - S.cs * n) / 2; S.oy = 80 + (700 - S.cs * n) / 2;
  const M = U.grid(n, n, 0), seen = U.grid(n, n, false);
  S.sx = Math.floor(n / 2); S.sy = Math.floor(n / 2);
  const front = [[S.sx, S.sy]]; seen[S.sy][S.sx] = true;
  const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  while (front.length) {
    const i = Math.random() < 0.7 ? front.length - 1 : U.randi(front.length), [x, y] = front[i];
    let opts = D.filter(([dx, dy]) => seen[y + dy]?.[x + dx] === false);
    if (bits(M[y][x]) >= 3 && front.length > 1 && Math.random() < 0.8) opts = [];
    if (!opts.length) { front.splice(i, 1); continue; }
    const [dx, dy, b1, b2] = U.choice(opts); M[y][x] |= b1; M[y + dy][x + dx] |= b2; seen[y + dy][x + dx] = true; front.push([x + dx, y + dy]);
  }
  S.t = M.map((r) => r.map((m) => { const k = U.randi(4); return { m: rot(m, k), rot: 0, ang: 0 }; }));
  S.moves = 0; S.time = 0; S.done = 0; flow();
}
function flow() {
  const n = S.n, st = [[S.sx, S.sy]]; S.wet = new Set([S.sy * n + S.sx]);
  const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy, b1, b2] of D) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= n || b >= n) continue; if ((S.t[y][x].m & b1) && (S.t[b][a].m & b2) && !S.wet.has(b * n + a)) { S.wet.add(b * n + a); st.push([a, b]); } } }
}
