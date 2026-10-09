let S;
const N = 10, CS = 52, OX = 50, OY = 100;
const SH = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]];
const PC = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa', '#f472b6'];
GAME({
  title: '블록 퍼즐', w: 620, h: 900, bg: '#1e1b4b', controls: 'none',
  help: '아래 블록 3개를 드래그해서 판에 놓으세요\n가로 또는 세로 한 줄이 꽉 차면 사라져요 (동시에 여러 줄 = 콤보!)\n블록은 회전할 수 없어요\n더 이상 놓을 곳이 없으면 게임 오버',
  init(g) { S = { b: U.grid(N, N, null), hand: [], drag: null, combo: 0, clearing: [] }; deal(); },
  update(g, dt) {
    S.clearing = S.clearing.filter((c) => (c.t -= dt) > 0);
    const m = g.mouse;
    if (m.clicked && !S.drag) S.hand.forEach((p, i) => { if (p && g.inRect(slotX(i) - 80, 690, 160, 170)) S.drag = { i, ox: 0, oy: 0 }; });
    if (S.drag) {
      const p = S.hand[S.drag.i], gx = Math.round((m.x - OX - (pw(p) * CS) / 2) / CS), gy = Math.round((m.y - 110 - OY - (ph(p) * CS) / 2) / CS);
      S.ghost = fits(p, gx, gy) ? [gx, gy] : null;
      if (m.released) {
        if (S.ghost) place(g, p, ...S.ghost); else g.sfx.click();
        S.drag = null; S.ghost = null;
      }
    }
    g.info = `콤보 ${S.combo}`;
  },
  draw(g, c) {
    g.text(g.score.toLocaleString(), 310, 50, 40, '#fde047');
    g.rrect(OX - 8, OY - 8, N * CS + 16, N * CS + 16, 12, '#312e81');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = S.b[y][x]; cell(g, OX + x * CS, OY + y * CS, v === null ? 'rgba(255,255,255,.06)' : PC[v], v !== null); }
    for (const cl of S.clearing) { c.globalAlpha = cl.t * 2; cell(g, OX + cl.x * CS, OY + cl.y * CS, '#fff', true); c.globalAlpha = 1; }
    if (S.drag && S.ghost) { const p = S.hand[S.drag.i]; c.globalAlpha = 0.35; for (const [x, y] of p.s) cell(g, OX + (S.ghost[0] + x) * CS, OY + (S.ghost[1] + y) * CS, PC[p.c], true); c.globalAlpha = 1; }
    S.hand.forEach((p, i) => {
      if (!p) return;
      if (S.drag && S.drag.i === i) { const m = g.mouse; for (const [x, y] of p.s) cell(g, m.x - (pw(p) * CS) / 2 + x * CS, m.y - 110 - (ph(p) * CS) / 2 + y * CS, PC[p.c], true); return; }
      const s = 26, ok = canPlace(p);
      c.globalAlpha = ok ? 1 : 0.35;
      for (const [x, y] of p.s) cell(g, slotX(i) - (pw(p) * s) / 2 + x * s, 775 - (ph(p) * s) / 2 + y * s, PC[p.c], true, s);
      c.globalAlpha = 1;
    });
  },
});
function cell(g, x, y, col, solid, s = CS) { g.rrect(x + 2, y + 2, s - 4, s - 4, s * 0.15, col); if (solid) g.rect(x + 5, y + 5, s - 10, (s - 10) * 0.25, 'rgba(255,255,255,.25)'); }
function slotX(i) { return 110 + i * 200; }
function pw(p) { return Math.max(...p.s.map((q) => q[0])) + 1; }
function ph(p) { return Math.max(...p.s.map((q) => q[1])) + 1; }
function fits(p, gx, gy) { return p.s.every(([x, y]) => { const a = gx + x, b = gy + y; return a >= 0 && b >= 0 && a < N && b < N && S.b[b][a] === null; }); }
function canPlace(p) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(p, x, y)) return true; return false; }
function deal() { S.hand = [0, 1, 2].map(() => ({ s: U.choice(SH), c: U.randi(PC.length) })); }
function place(g, p, gx, gy) {
  for (const [x, y] of p.s) S.b[gy + y][gx + x] = p.c;
  g.add(p.s.length); g.sfx.drop();
  S.hand[S.drag.i] = null;
  const rows = [], cols = [];
  for (let i = 0; i < N; i++) { if (S.b[i].every((v) => v !== null)) rows.push(i); if (S.b.every((r) => r[i] !== null)) cols.push(i); }
  const lines = rows.length + cols.length;
  if (lines) {
    S.combo++;
    const pts = lines * 10 * lines * (1 + S.combo * 0.5) * N / 10 * 10;
    for (const r of rows) for (let x = 0; x < N; x++) { S.clearing.push({ x, y: r, t: 0.4 }); S.b[r][x] = null; }
    for (const cc of cols) for (let y = 0; y < N; y++) { S.clearing.push({ x: cc, y, t: 0.4 }); S.b[y][cc] = null; }
    g.add(Math.round(pts)); g.float(310, 360, (lines > 1 ? `${lines}줄! ` : '') + `+${Math.round(pts)}` + (S.combo > 1 ? ` 콤보×${S.combo}` : ''), '#fde047', 30);
    lines > 1 ? g.sfx.win() : g.sfx.coin(); g.shake(lines * 3);
  } else S.combo = 0;
  if (S.hand.every((h) => !h)) deal();
  if (!S.hand.some((h) => h && canPlace(h))) g.later(() => g.over('더 이상 놓을 곳이 없어요'), 0.6);
}
