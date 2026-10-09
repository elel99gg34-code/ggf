let S;
GAME({
  title: '라이트 아웃', w: 640, h: 760, bg: '#0b0b14', controls: 'none',
  help: '전구를 클릭하면 자신과 상하좌우가 함께 반전돼요\n모든 불을 끄면 스테이지 클리어!\n스테이지가 오를수록 판이 커지고 복잡해짐 (최대 7×7)\n💡 힌트: 위에서부터 한 줄씩 아래로 "불 끌어내리기"',
  init(g) { S = { stage: 0 }; next(); },
  update(g, dt) {
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { if (S.stage >= 15) return g.win('15 스테이지 모두 클리어!'); next(); } return; }
    S.t += dt;
    if (g.mouse.clicked) { const n = S.n, cs = 560 / n, x = Math.floor((g.mouse.x - 40) / cs), y = Math.floor((g.mouse.y - 170) / cs); if (x >= 0 && y >= 0 && x < n && y < n) { press(x, y); S.moves++; g.sfx.tone(S.b[y][x] ? 700 : 350, 0.06, 'sine', 0.06); if (S.b.every((r) => r.every((v) => !v))) { const pts = Math.max(100, n * n * 30 - Math.max(0, S.moves - S.par) * 20); g.add(pts); g.sfx.win(); S.clear = 1.4; } } }
    if (g.clickIn(470, 90, 140, 44)) { S.b = S.start.map((r) => r.slice()); S.moves = 0; g.sfx.click(); }
    g.info = `스테이지 ${S.stage} · ${S.n}×${S.n} · 클릭 ${S.moves}`;
  },
  draw(g, c) {
    g.text(`스테이지 ${S.stage}`, 40, 60, 34, '#fde047', 'left'); g.text(`최소 약 ${S.par}번 · 현재 ${S.moves}번`, 40, 110, 18, '#94a3b8', 'left');
    g.button(470, 90, 140, 44, '⟲ 처음부터', '#334155', 16);
    const n = S.n, cs = 560 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const on = S.b[y][x], px = 40 + x * cs, py = 170 + y * cs;
      if (on) { c.shadowBlur = 30; c.shadowColor = '#fde047'; }
      g.rrect(px + 5, py + 5, cs - 10, cs - 10, 14, on ? '#facc15' : '#1f2937', on ? '#fef08a' : '#374151', 2);
      c.shadowBlur = 0;
      if (on) g.emoji('💡', px + cs / 2, py + cs / 2, cs * 0.45);
    }
    if (S.clear > 0) g.text('✨ 완료!', 320, 450, 60, '#fff');
  },
});
function press(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (S.b[b] && S.b[b][a] !== undefined) S.b[b][a] ^= 1; } }
function next() {
  S.stage++; S.n = Math.min(7, 3 + Math.floor((S.stage - 1) / 3));
  S.b = U.grid(S.n, S.n, 0);
  const k = Math.min(S.n * S.n - 2, 2 + S.stage);
  const cells = U.shuffle([...Array(S.n * S.n).keys()]).slice(0, k);
  cells.forEach((i) => press(i % S.n, Math.floor(i / S.n)));
  if (S.b.every((r) => r.every((v) => !v))) press(0, 0);
  S.par = k; S.moves = 0; S.clear = 0; S.t = 0; S.start = S.b.map((r) => r.slice());
}
