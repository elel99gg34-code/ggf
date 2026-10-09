let S;
const N = 15, CS = 44, OX = 40, OY = 40;
GAME({
  title: '오목', w: 1000, h: 740, bg: '#3f2a14', controls: 'none',
  help: '흑돌(나)이 먼저 · 교차점을 클릭해서 돌 놓기\n가로·세로·대각선으로 5개를 먼저 이으면 승리!\nAI는 공격과 수비를 모두 계산해요 (3·4 위협 주의)\n↶ 무르기 가능 · 난이도 선택',
  init(g) { S = { b: U.grid(N, N, 0), turn: 1, hist: [], end: false, think: 0, lvl: S?.lvl ?? 1, win: null }; },
  update(g, dt) {
    for (let i = 0; i < 3; i++) if (g.clickIn(760 + i * 75, 560, 70, 40)) { S.lvl = i; g.sfx.click(); }
    if (g.clickIn(760, 620, 220, 44) && S.hist.length >= 2 && !S.end) { for (let k = 0; k < 2; k++) { const [x, y] = S.hist.pop(); S.b[y][x] = 0; } S.turn = 1; g.sfx.click(); return; }
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) { const [x, y] = aiPick(); place(g, x, y); } return; }
    if (!g.mouse.clicked) return;
    const x = Math.round((g.mouse.x - OX - CS / 2) / CS), y = Math.round((g.mouse.y - OY - CS / 2) / CS);
    if (x < 0 || y < 0 || x >= N || y >= N || S.b[y][x]) return;
    place(g, x, y);
  },
  draw(g, c) {
    g.rrect(OX - 10, OY - 10, CS * N + 20, CS * N + 20, 8, '#dcb35c');
    for (let i = 0; i < N; i++) { g.line(OX + CS / 2, OY + CS / 2 + i * CS, OX + CS / 2 + (N - 1) * CS, OY + CS / 2 + i * CS, '#5c3d12', 1.2); g.line(OX + CS / 2 + i * CS, OY + CS / 2, OX + CS / 2 + i * CS, OY + CS / 2 + (N - 1) * CS, '#5c3d12', 1.2); }
    for (const [x, y] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) g.circle(OX + CS / 2 + x * CS, OY + CS / 2 + y * CS, 4, '#5c3d12');
    const last = S.hist[S.hist.length - 1];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = S.b[y][x]; if (!v) continue;
      const px = OX + CS / 2 + x * CS, py = OY + CS / 2 + y * CS;
      g.circle(px + 2, py + 3, 19, 'rgba(0,0,0,.35)');
      const grd = c.createRadialGradient(px - 6, py - 6, 2, px, py, 20); grd.addColorStop(0, v > 0 ? '#555' : '#fff'); grd.addColorStop(1, v > 0 ? '#000' : '#d6d3d1'); c.fillStyle = grd; c.beginPath(); c.arc(px, py, 19, 0, 7); c.fill();
      if (last && last[0] === x && last[1] === y) g.circle(px, py, 5, '#ef4444');
    }
    if (S.win) { const [[x1, y1], [x2, y2]] = S.win; g.line(OX + CS / 2 + x1 * CS, OY + CS / 2 + y1 * CS, OX + CS / 2 + x2 * CS, OY + CS / 2 + y2 * CS, '#ef4444', 6); }
    if (!S.end && S.turn === 1) { const x = Math.round((g.mouse.x - OX - CS / 2) / CS), y = Math.round((g.mouse.y - OY - CS / 2) / CS); if (x >= 0 && y >= 0 && x < N && y < N && !S.b[y][x]) { c.globalAlpha = 0.4; g.circle(OX + CS / 2 + x * CS, OY + CS / 2 + y * CS, 19, '#000'); c.globalAlpha = 1; } }
    g.text('⚫ 오목', 870, 70, 32, '#fff');
    g.text(S.end ? S.msg : S.turn === 1 ? '당신 차례 (흑)' : 'AI 생각 중...', 870, 130, 20, S.end ? '#fde047' : '#fef3c7');
    g.text(`수: ${S.hist.length}`, 870, 180, 18, '#fde68a');
    g.text('AI 난이도', 870, 540, 16, '#fde68a');
    ['쉬움', '보통', '어려움'].forEach((n, i) => g.button(760 + i * 75, 560, 70, 40, n, S.lvl === i ? '#b45309' : '#57381a', 15));
    g.button(760, 620, 220, 44, '↶ 무르기', '#57381a', 16);
  },
});
function place(g, x, y) {
  S.b[y][x] = S.turn; S.hist.push([x, y]); g.sfx.tone(S.turn > 0 ? 300 : 420, 0.05, 'triangle', 0.1);
  const w = five(x, y, S.turn);
  if (w) { S.win = w; S.end = true; if (S.turn > 0) { S.msg = '🏆 오목 완성! 승리'; g.add(Math.max(500, 3000 - S.hist.length * 20) * (S.lvl + 1)); g.later(() => g.win(S.msg), 1.2); } else { S.msg = 'AI 오목... 패배'; g.later(() => g.over(S.msg), 1.2); } return; }
  if (S.hist.length >= N * N) { S.end = true; S.msg = '무승부'; g.later(() => g.over('무승부'), 1); return; }
  S.turn = -S.turn; if (S.turn === -1) S.think = 0.35;
}
function five(x, y, v) {
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let a = 0, b = 0;
    while (S.b[y + (a + 1) * dy]?.[x + (a + 1) * dx] === v) a++;
    while (S.b[y - (b + 1) * dy]?.[x - (b + 1) * dx] === v) b++;
    if (a + b + 1 >= 5) return [[x - b * dx, y - b * dy], [x + a * dx, y + a * dy]];
  }
  return null;
}
function lineScore(x, y, v) {
  let total = 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let cnt = 1, open = 0;
    let k = 1; while (S.b[y + k * dy]?.[x + k * dx] === v) { cnt++; k++; } if (S.b[y + k * dy]?.[x + k * dx] === 0) open++;
    k = 1; while (S.b[y - k * dy]?.[x - k * dx] === v) { cnt++; k++; } if (S.b[y - k * dy]?.[x - k * dx] === 0) open++;
    if (cnt >= 5) total += 1e7;
    else if (cnt === 4) total += open === 2 ? 1e6 : open === 1 ? 1e5 : 0;
    else if (cnt === 3) total += open === 2 ? 5e4 : open === 1 ? 1e3 : 0;
    else if (cnt === 2) total += open === 2 ? 500 : open === 1 ? 50 : 0;
    else total += open * 5;
  }
  return total;
}
function aiPick() {
  if (!S.hist.length) return [7, 7];
  const cand = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (S.b[y][x]) continue;
    let near = false; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (S.b[y + dy]?.[x + dx]) { near = true; break; }
    if (!near) continue;
    const atk = lineScore(x, y, -1), def = lineScore(x, y, 1);
    const w = [0.6, 0.9, 1.1][S.lvl];
    let sc = atk * 1.1 + def * w + (7 - Math.max(Math.abs(x - 7), Math.abs(y - 7)));
    if (S.lvl === 0) sc *= U.rand(0.5, 1.5);
    cand.push([sc, x, y]);
  }
  cand.sort((a, b) => b[0] - a[0]);
  if (S.lvl === 2 && cand.length > 1) {
    // 상위 후보에 대해 1수 앞 읽기: 상대 최선 응수 점수를 뺌
    let best = cand[0], bv = -Infinity;
    for (const c of cand.slice(0, 8)) {
      const [, x, y] = c; S.b[y][x] = -1;
      if (five(x, y, -1)) { S.b[y][x] = 0; return [x, y]; }
      let opp = 0; for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) if (!S.b[yy][xx]) { let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (S.b[yy + dy]?.[xx + dx]) near = true; if (near) opp = Math.max(opp, lineScore(xx, yy, 1)); }
      S.b[y][x] = 0;
      const v = c[0] - opp * 0.8; if (v > bv) { bv = v; best = c; }
    }
    return [best[1], best[2]];
  }
  return [cand[0][1], cand[0][2]];
}
