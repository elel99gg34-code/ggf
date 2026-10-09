let S;
const C = 7, R = 6, CS = 92, OX = 60, OY = 140;
GAME({
  title: '사목 (커넥트4)', w: 900, h: 740, bg: '#0f172a', controls: 'lr+ab',
  help: '열을 클릭(또는 ←→ + Space)하면 칩이 떨어져요\n가로·세로·대각선으로 4개를 먼저 이으면 승리!\n🔴 나 vs 🟡 AI (수읽기 미니맥스)\n승리할수록 다음 판 AI가 더 강해져요',
  init(g) { S = { b: U.grid(C, R, 0), turn: 1, col: 3, drop: null, end: false, think: 0, wins: S?.wins ?? 0, lvl: S?.lvl ?? 4 }; },
  update(g, dt) {
    if (S.drop) { const d = S.drop; d.vy += 3000 * dt; d.y += d.vy * dt; const ty = OY + d.r * CS + CS / 2; if (d.y >= ty) { d.y = ty; S.b[d.r][d.c] = d.v; S.drop = null; g.sfx.tone(200 + d.r * 30, 0.06, 'square', 0.06); after(g, d.c, d.r, d.v); } return; }
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) drop(g, aiCol(), -1); return; }
    if (g.pressed('left')) S.col = Math.max(0, S.col - 1); if (g.pressed('right')) S.col = Math.min(C - 1, S.col + 1);
    const mc = Math.floor((g.mouse.x - OX) / CS); if (g.mouse.moved && mc >= 0 && mc < C) S.col = mc; g.mouse.moved = false;
    if ((g.mouse.clicked && mc >= 0 && mc < C) || g.pressed('a') || g.pressed('down')) drop(g, g.mouse.clicked ? mc : S.col, 1);
  },
  draw(g, c) {
    g.text(`🔴 사목 · AI 레벨 ${S.lvl - 3}`, 450, 40, 28, '#fff');
    g.text(S.end ? S.msg : S.turn === 1 ? '당신 차례' : 'AI 생각 중...', 450, 80, 20, S.end ? '#fde047' : '#cbd5e1');
    if (!S.end && S.turn === 1 && !S.drop) g.circle(OX + S.col * CS + CS / 2, OY - 30, 36, 'rgba(239,68,68,.7)');
    if (S.drop) g.circle(OX + S.drop.c * CS + CS / 2, S.drop.y, 38, S.drop.v > 0 ? '#ef4444' : '#facc15');
    c.fillStyle = '#1d4ed8'; c.beginPath(); c.rect(OX - 10, OY - 10, C * CS + 20, R * CS + 20);
    for (let r = 0; r < R; r++) for (let cc = 0; cc < C; cc++) { c.moveTo(OX + cc * CS + CS / 2 + 38, OY + r * CS + CS / 2); c.arc(OX + cc * CS + CS / 2, OY + r * CS + CS / 2, 38, 0, Math.PI * 2, true); }
    c.fill('evenodd');
    for (let r = 0; r < R; r++) for (let cc = 0; cc < C; cc++) { const v = S.b[r][cc]; if (v) { const x = OX + cc * CS + CS / 2, y = OY + r * CS + CS / 2; g.circle(x, y, 38, v > 0 ? '#ef4444' : '#facc15'); g.ring(x, y, 28, v > 0 ? '#b91c1c' : '#ca8a04', 3); } }
    if (S.winLine) for (const [r, cc] of S.winLine) g.ring(OX + cc * CS + CS / 2, OY + r * CS + CS / 2, 40, '#fff', 5);
  },
});
function drop(g, col, v) { let r = R - 1; while (r >= 0 && S.b[r][col]) r--; if (r < 0) return g.sfx.hit(); S.drop = { c: col, r, v, y: OY - 30, vy: 0 }; S.turn = 0; }
function winAt(b, r, c, v) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const line = [[r, c]]; for (const s of [1, -1]) { let k = 1; while (b[r + dr * k * s]?.[c + dc * k * s] === v) { line.push([r + dr * k * s, c + dc * k * s]); k++; } } if (line.length >= 4) return line; }
  return null;
}
function after(g, c, r, v) {
  const w = winAt(S.b, r, c, v);
  if (w) { S.winLine = w; S.end = true; if (v > 0) { S.wins++; S.lvl = Math.min(7, S.lvl + 1); S.msg = '🏆 승리!'; g.add(1000 * (S.lvl - 3)); g.later(() => g.win(`AI 레벨 ${S.lvl - 4} 격파!`), 1.2); } else { S.msg = '패배...'; g.later(() => g.over('AI가 4개를 연결했다'), 1.2); } return; }
  if (S.b[0].every((x) => x)) { S.end = true; S.msg = '무승부'; g.add(300); g.later(() => g.over('무승부'), 1); return; }
  S.turn = -v; if (S.turn === -1) S.think = 0.3;
}
function scoreWin(b) { let s = 0; const lines = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const cells = []; for (let k = 0; k < 4; k++) { const v = b[r + dr * k]?.[c + dc * k]; if (v === undefined) break; cells.push(v); } if (cells.length < 4) continue; const a = cells.filter((v) => v === -1).length, h = cells.filter((v) => v === 1).length; if (a && h) continue; if (a === 3) s += 5; else if (a === 2) s += 2; if (h === 3) s -= 6; else if (h === 2) s -= 2; } for (let r = 0; r < R; r++) s += b[r][3] === -1 ? 3 : b[r][3] === 1 ? -3 : 0; return s; }
function mm(b, d, a, be, side) {
  const cols = [3, 2, 4, 1, 5, 0, 6].filter((c) => !b[0][c]);
  if (!cols.length) return 0;
  if (!d) return scoreWin(b);
  let best = side < 0 ? -1e9 : 1e9;
  for (const c of cols) {
    let r = R - 1; while (b[r][c]) r--; b[r][c] = side;
    let v; if (winAt(b, r, c, side)) v = side < 0 ? 1e6 + d : -1e6 - d; else v = mm(b, d - 1, a, be, -side);
    b[r][c] = 0;
    if (side < 0) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); be = Math.min(be, v); }
    if (a >= be) break;
  }
  return best;
}
function aiCol() {
  const b = S.b.map((r) => r.slice());
  let best = 3, bv = -1e9;
  for (const c of U.shuffle([0, 1, 2, 3, 4, 5, 6]).filter((c) => !b[0][c])) { let r = R - 1; while (b[r][c]) r--; b[r][c] = -1; const v = winAt(b, r, c, -1) ? 1e7 : mm(b, S.lvl, -1e9, 1e9, 1); b[r][c] = 0; if (v > bv) { bv = v; best = c; } }
  return best;
}
