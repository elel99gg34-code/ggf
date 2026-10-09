let S;
const CS = 70, OX = 40, OY = 70;
GAME({
  title: '얼티밋 틱택토', w: 1000, h: 740, bg: '#0f172a', controls: 'none',
  help: '9개의 작은 판으로 이루어진 큰 틱택토!\n내가 둔 칸의 위치 = 상대가 다음에 둘 작은 판\n작은 판을 이기면 그 판은 내 것 (보내진 판이 끝났으면 아무 데나)\n큰 판에서 3개를 일렬로 먼저 차지하면 승리 · ❌ 나 vs ⭕ AI',
  init(g) { S = { b: U.grid(9, 9, 0), big: Array(9).fill(0), next: -1, turn: 1, end: false, think: 0, last: null }; },
  update(g, dt) {
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) { const [B, c] = aiMove(); play(g, B, c); } return; }
    if (!g.mouse.clicked) return;
    const gx = Math.floor((g.mouse.x - OX) / CS), gy = Math.floor((g.mouse.y - OY) / CS);
    if (gx < 0 || gy < 0 || gx > 8 || gy > 8) return;
    const B = Math.floor(gy / 3) * 3 + Math.floor(gx / 3), c = (gy % 3) * 3 + (gx % 3);
    if (legal(S).some(([b, cc]) => b === B && cc === c)) play(g, B, c); else g.sfx.hit();
  },
  draw(g, c) {
    const allowed = new Set(legal(S).map(([b]) => b));
    for (let B = 0; B < 9; B++) {
      const bx = OX + (B % 3) * CS * 3, by = OY + Math.floor(B / 3) * CS * 3;
      g.rrect(bx + 4, by + 4, CS * 3 - 8, CS * 3 - 8, 10, !S.end && S.turn === 1 && allowed.has(B) ? 'rgba(250,204,21,.18)' : 'rgba(255,255,255,.04)');
      for (let i = 1; i < 3; i++) { g.line(bx + i * CS, by + 12, bx + i * CS, by + CS * 3 - 12, '#475569', 2); g.line(bx + 12, by + i * CS, bx + CS * 3 - 12, by + i * CS, '#475569', 2); }
      for (let k = 0; k < 9; k++) { const v = S.b[B][k], x = bx + (k % 3) * CS + CS / 2, y = by + Math.floor(k / 3) * CS + CS / 2; if (v) mark(g, x, y, v, 20, S.last && S.last[0] === B && S.last[1] === k); }
      if (S.big[B]) { g.ctx.fillStyle = 'rgba(15,23,42,.7)'; g.ctx.fillRect(bx + 4, by + 4, CS * 3 - 8, CS * 3 - 8); if (S.big[B] === 2) g.text('무', bx + CS * 1.5, by + CS * 1.5, 50, '#64748b'); else mark(g, bx + CS * 1.5, by + CS * 1.5, S.big[B], 70); }
    }
    for (let i = 1; i < 3; i++) { g.line(OX + i * CS * 3, OY, OX + i * CS * 3, OY + CS * 9, '#e2e8f0', 5); g.line(OX, OY + i * CS * 3, OX + CS * 9, OY + i * CS * 3, '#e2e8f0', 5); }
    g.text('❌ 얼티밋 틱택토', 840, 80, 26, '#fff');
    g.text(S.end ? S.msg : S.turn === 1 ? '당신 차례 (❌)' : 'AI 생각 중... (⭕)', 840, 140, 20, S.end ? '#fde047' : '#cbd5e1');
    g.text('큰 판 현황', 840, 220, 16, '#94a3b8');
    for (let B = 0; B < 9; B++) { const x = 780 + (B % 3) * 40, y = 250 + Math.floor(B / 3) * 40; g.rect(x, y, 36, 36, '#1e293b'); if (S.big[B] === 1 || S.big[B] === -1) mark(g, x + 18, y + 18, S.big[B], 11); }
  },
});
function mark(g, x, y, v, r, hl) { if (v === 1) { g.line(x - r, y - r, x + r, y + r, hl ? '#fca5a5' : '#ef4444', r / 3.5); g.line(x + r, y - r, x - r, y + r, hl ? '#fca5a5' : '#ef4444', r / 3.5); } else g.ring(x, y, r, hl ? '#93c5fd' : '#3b82f6', r / 3.5); }
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function winner(a) { for (const [x, y, z] of LINES) if ((a[x] === 1 || a[x] === -1) && a[x] === a[y] && a[x] === a[z]) return a[x]; return 0; }
function legal(st) {
  const out = [], boards = st.next >= 0 && !st.big[st.next] ? [st.next] : [...Array(9).keys()].filter((B) => !st.big[B]);
  for (const B of boards) for (let c = 0; c < 9; c++) if (!st.b[B][c]) out.push([B, c]);
  return out;
}
function apply(st, B, c, v) {
  const b = st.b.map((r) => r.slice()), big = st.big.slice();
  b[B][c] = v; const w = winner(b[B]); if (w) big[B] = w; else if (b[B].every((x) => x)) big[B] = 2;
  return { b, big, next: c, turn: -v };
}
function evalS(st) {
  const w = winner(st.big); if (w) return w * -1e5;
  let s = 0; const BW = [3, 2, 3, 2, 4, 2, 3, 2, 3];
  for (let B = 0; B < 9; B++) { if (st.big[B] === -1) s += 100 * BW[B]; else if (st.big[B] === 1) s -= 100 * BW[B]; else if (!st.big[B]) for (const L of LINES) { const vs = L.map((k) => st.b[B][k]); const a = vs.filter((v) => v === -1).length, h = vs.filter((v) => v === 1).length; if (a && !h) s += a * a * 2; if (h && !a) s -= h * h * 2; } }
  for (const L of LINES) { const vs = L.map((k) => st.big[k]); const a = vs.filter((v) => v === -1).length, h = vs.filter((v) => v === 1).length; if (a && !h && !vs.includes(2)) s += a * a * 60; if (h && !a && !vs.includes(2)) s -= h * h * 60; }
  return s;
}
function mm(st, d, a, be) {
  const w = winner(st.big); if (w) return w * -1e6 * (d + 1);
  const ms = legal(st); if (!ms.length) return 0;
  if (!d) return evalS(st);
  const side = st.turn;
  let best = side === -1 ? -1e9 : 1e9;
  for (const [B, c] of ms) { const v = mm(apply(st, B, c, side), d - 1, a, be); if (side === -1) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); be = Math.min(be, v); } if (a >= be) break; }
  return best;
}
function aiMove() {
  const ms = U.shuffle(legal(S)); const d = ms.length > 20 ? 3 : 4;
  let best = ms[0], bv = -1e9;
  for (const [B, c] of ms) { const v = mm(apply(S, B, c, -1), d, -1e9, 1e9); if (v > bv) { bv = v; best = [B, c]; } }
  return best;
}
function play(g, B, c) {
  const v = S.turn, ns = apply(S, B, c, v);
  const wonSmall = !S.big[B] && ns.big[B] === v;
  Object.assign(S, ns); S.last = [B, c];
  g.sfx.tone(v > 0 ? 500 : 350, 0.05, 'triangle', 0.07);
  if (wonSmall) { v > 0 ? (g.sfx.coin(), g.add(200)) : g.sfx.hit(); }
  const w = winner(S.big);
  if (w || !legal(S).length) {
    S.end = true;
    if (w === 1) { S.msg = '🏆 승리!'; g.add(3000); g.later(() => g.win('얼티밋 틱택토 승리!'), 1.2); }
    else if (w === -1) { S.msg = 'AI 승리...'; g.later(() => g.over('AI가 큰 판을 차지했다'), 1.2); }
    else { const me = S.big.filter((x) => x === 1).length, ai = S.big.filter((x) => x === -1).length; S.msg = `무승부 (${me}:${ai})`; g.add(me * 200); g.later(() => g.over(S.msg), 1.2); }
    return;
  }
  if (S.turn === -1) S.think = 0.4;
}
