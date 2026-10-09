let S;
const N = 6, GAP = 100, OX = 110, OY = 110;
GAME({
  title: '점과 상자', w: 900, h: 740, bg: '#fefce8', controls: 'none',
  help: '두 점 사이의 선을 클릭해서 긋기\n상자의 4번째 선을 그으면 그 상자는 내 것 + 한 번 더!\n상대에게 3번째 선을 넘겨주지 않도록 조심\n상자를 더 많이 차지하면 승리 · 🟦 나 vs 🟥 AI',
  init(g) { S = { h: U.grid(N - 1, N, 0), v: U.grid(N, N - 1, 0), box: U.grid(N - 1, N - 1, 0), turn: 1, think: 0, end: false, sc: [0, 0], last: null }; },
  update(g, dt) {
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) { const m = aiPick(); move(g, ...m); } return; }
    const hv = hover(g.mouse.x, g.mouse.y); S.hover = hv;
    if (g.mouse.clicked && hv) move(g, ...hv);
  },
  draw(g, c) {
    for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) { const o = S.box[y][x]; if (o) { g.rect(OX + x * GAP + 6, OY + y * GAP + 6, GAP - 12, GAP - 12, o > 0 ? '#bfdbfe' : '#fecaca'); g.text(o > 0 ? '나' : 'AI', OX + x * GAP + GAP / 2, OY + y * GAP + GAP / 2, 26, o > 0 ? '#1d4ed8' : '#b91c1c'); } }
    const ln = (t, x, y, col, w) => { const [x1, y1, x2, y2] = t === 'h' ? [x, y, x + 1, y] : [x, y, x, y + 1]; g.line(OX + x1 * GAP, OY + y1 * GAP, OX + x2 * GAP, OY + y2 * GAP, col, w); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N - 1; x++) if (S.h[y][x]) ln('h', x, y, S.h[y][x] > 0 ? '#2563eb' : '#dc2626', 8);
    for (let y = 0; y < N - 1; y++) for (let x = 0; x < N; x++) if (S.v[y][x]) ln('v', x, y, S.v[y][x] > 0 ? '#2563eb' : '#dc2626', 8);
    if (S.hover && S.turn === 1) ln(S.hover[0], S.hover[1], S.hover[2], 'rgba(37,99,235,.35)', 8);
    if (S.last) { c.globalAlpha = 0.5 + Math.sin(g.time * 8) * 0.3; ln(S.last[0], S.last[1], S.last[2], '#fde047', 4); c.globalAlpha = 1; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g.circle(OX + x * GAP, OY + y * GAP, 9, '#1c1917');
    g.text('✏️ 점과 상자', 780, 120, 26, '#1c1917');
    g.text(`🟦 나 ${S.sc[0]}`, 780, 200, 26, '#1d4ed8'); g.text(`🟥 AI ${S.sc[1]}`, 780, 250, 26, '#b91c1c');
    g.text(S.end ? S.msg : S.turn === 1 ? '당신 차례' : 'AI 차례...', 780, 330, 20, '#44403c');
  },
});
function hover(mx, my) {
  const fx = (mx - OX) / GAP, fy = (my - OY) / GAP; let best = null, bd = 0.22;
  for (let y = 0; y < N; y++) for (let x = 0; x < N - 1; x++) if (!S.h[y][x]) { const d = Math.abs(fy - y) + Math.max(0, Math.abs(fx - x - 0.5) - 0.5); if (d < bd) { bd = d; best = ['h', x, y]; } }
  for (let y = 0; y < N - 1; y++) for (let x = 0; x < N; x++) if (!S.v[y][x]) { const d = Math.abs(fx - x) + Math.max(0, Math.abs(fy - y - 0.5) - 0.5); if (d < bd) { bd = d; best = ['v', x, y]; } }
  return best;
}
function sides(st, x, y) { return (st.h[y][x] ? 1 : 0) + (st.h[y + 1][x] ? 1 : 0) + (st.v[y][x] ? 1 : 0) + (st.v[y][x + 1] ? 1 : 0); }
function adjBoxes(t, x, y) { const r = []; if (t === 'h') { if (y > 0) r.push([x, y - 1]); if (y < N - 1) r.push([x, y]); } else { if (x > 0) r.push([x - 1, y]); if (x < N - 1) r.push([x, y]); } return r; }
function move(g, t, x, y) {
  (t === 'h' ? S.h : S.v)[y][x] = S.turn; S.last = [t, x, y];
  let got = 0;
  for (const [bx, by] of adjBoxes(t, x, y)) if (!S.box[by][bx] && sides(S, bx, by) === 4) { S.box[by][bx] = S.turn; got++; S.sc[S.turn > 0 ? 0 : 1]++; }
  if (got) { S.turn > 0 ? (g.sfx.coin(), g.add(100 * got)) : g.sfx.hit(); } else { g.sfx.tone(400, 0.04, 'triangle', 0.05); S.turn = -S.turn; }
  const total = (N - 1) * (N - 1);
  if (S.sc[0] + S.sc[1] === total) { S.end = true; const [a, b] = S.sc; if (a > b) { S.msg = `🏆 ${a} : ${b} 승리!`; g.add(1000); g.later(() => g.win(S.msg), 1); } else { S.msg = a === b ? `무승부 ${a}:${b}` : `${a} : ${b} 패배`; g.later(() => g.over(S.msg), 1); } return; }
  if (S.turn === -1) S.think = got ? 0.3 : 0.5;
}
function allMoves() { const r = []; for (let y = 0; y < N; y++) for (let x = 0; x < N - 1; x++) if (!S.h[y][x]) r.push(['h', x, y]); for (let y = 0; y < N - 1; y++) for (let x = 0; x < N; x++) if (!S.v[y][x]) r.push(['v', x, y]); return r; }
function aiPick() {
  const ms = U.shuffle(allMoves());
  const completes = ms.find(([t, x, y]) => adjBoxes(t, x, y).some(([bx, by]) => !S.box[by][bx] && sides(S, bx, by) === 3));
  if (completes) return completes;
  const safe = ms.filter(([t, x, y]) => adjBoxes(t, x, y).every(([bx, by]) => sides(S, bx, by) < 2));
  if (safe.length) return safe[0];
  // 상대에게 넘겨줄 상자 수가 가장 적은 수
  let best = ms[0], bc = 1e9;
  for (const m of ms) { const c = chainCost(m); if (c < bc) { bc = c; best = m; } }
  return best;
}
function chainCost([t, x, y]) {
  const h = S.h.map((r) => r.slice()), v = S.v.map((r) => r.slice()), st = { h, v };
  (t === 'h' ? h : v)[y][x] = 1;
  let n = 0, changed = true; const taken = new Set();
  while (changed) { changed = false; for (let by = 0; by < N - 1; by++) for (let bx = 0; bx < N - 1; bx++) { const k = bx + ',' + by; if (!S.box[by][bx] && !taken.has(k) && sides(st, bx, by) === 3) { taken.add(k); n++; if (!h[by][bx]) h[by][bx] = 1; else if (!h[by + 1][bx]) h[by + 1][bx] = 1; else if (!v[by][bx]) v[by][bx] = 1; else v[by][bx + 1] = 1; changed = true; } } }
  return n;
}
