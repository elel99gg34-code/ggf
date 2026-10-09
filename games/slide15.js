let S;
GAME({
  title: '15 퍼즐', w: 640, h: 760, bg: '#0f172a', controls: 'dpad',
  help: '빈칸 옆의 타일을 클릭하면 밀려요 (방향키도 가능)\n1부터 15까지 순서대로 정렬하면 클리어!\n3×3 → 4×4 → 5×5 단계별 도전\n적은 이동, 빠른 시간일수록 고득점',
  init(g) { S = { n: 3, stage: 0 }; shuffle(); },
  update(g, dt) {
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { S.n++; if (S.n > 5) return g.win('5×5까지 정복!'); shuffle(); } return; }
    S.time += dt;
    for (const t of S.tiles) { t.dx += (t.x - t.dx) * Math.min(1, dt * 20); t.dy += (t.y - t.dy) * Math.min(1, dt * 20); }
    const D = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };
    for (const k in D) if (g.pressed(k)) { const [dx, dy] = D[k]; slide(g, S.ex + dx, S.ey + dy); }
    if (g.mouse.clicked) { const cs = 560 / S.n, x = Math.floor((g.mouse.x - 40) / cs), y = Math.floor((g.mouse.y - 160) / cs); if (x === S.ex || y === S.ey) slideLine(g, x, y); }
    g.info = `${S.n}×${S.n} · 이동 ${S.moves} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    g.text(`${S.n * S.n - 1} 퍼즐`, 320, 60, 40, '#fff');
    g.text(`이동 ${S.moves}   ⏱️ ${U.fmtTime(S.time)}`, 320, 110, 20, '#94a3b8');
    const cs = 560 / S.n;
    g.rrect(30, 150, 580, 580, 16, '#1e293b');
    for (const t of S.tiles) {
      const x = 40 + t.dx * cs, y = 160 + t.dy * cs, ok = t.v === t.y * S.n + t.x + 1;
      g.rrect(x + 4, y + 4, cs - 8, cs - 8, 12, ok ? '#22c55e' : `hsl(${(t.v * 360) / (S.n * S.n)},70%,55%)`);
      g.rrect(x + 4, y + 4, cs - 8, (cs - 8) / 2, 12, 'rgba(255,255,255,.12)');
      g.text(t.v, x + cs / 2, y + cs / 2 + 2, cs * 0.4, '#fff');
    }
    if (S.clear > 0) g.text('🎉 완성!', 320, 440, 64, '#fde047');
  },
});
function shuffle() {
  const n = S.n;
  S.tiles = []; for (let i = 1; i < n * n; i++) S.tiles.push({ v: i, x: (i - 1) % n, y: Math.floor((i - 1) / n), dx: 0, dy: 0 });
  S.ex = n - 1; S.ey = n - 1;
  let px = -1, py = -1;
  for (let k = 0; k < 400 * n; k++) { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [S.ex + dx, S.ey + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !(x === px && y === py)); const [x, y] = U.choice(opts); px = S.ex; py = S.ey; const t = S.tiles.find((t) => t.x === x && t.y === y); t.x = S.ex; t.y = S.ey; S.ex = x; S.ey = y; }
  S.tiles.forEach((t) => { t.dx = t.x; t.dy = t.y; });
  S.moves = 0; S.time = 0; S.clear = 0;
}
function slide(g, x, y) {
  const t = S.tiles.find((t) => t.x === x && t.y === y); if (!t) return false;
  t.x = S.ex; t.y = S.ey; S.ex = x; S.ey = y; S.moves++; g.sfx.move();
  if (S.tiles.every((t) => t.v === t.y * S.n + t.x + 1)) { const pts = Math.max(300, S.n * S.n * 200 - S.moves * 5 - Math.floor(S.time) * 3); g.add(pts); g.sfx.win(); S.clear = 1.6; }
  return true;
}
function slideLine(g, x, y) {
  if (x === S.ex && y === S.ey) return;
  const dx = Math.sign(x - S.ex), dy = Math.sign(y - S.ey);
  while ((S.ex !== x || S.ey !== y) && !S.clear) if (!slide(g, S.ex + dx, S.ey + dy)) break;
}
