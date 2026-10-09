let S;
const CS = 80, OX = 40, OY = 40;
GAME({
  title: '체커', w: 1000, h: 720, bg: '#292524', controls: 'none',
  help: '내 말(빨강)을 클릭 → 대각선 칸 클릭으로 이동\n상대 말을 뛰어넘어 잡기 (잡을 수 있으면 반드시 잡아야 해요!)\n연속 점프 가능 · 끝줄에 닿으면 👑 킹 (뒤로도 이동)\n상대 말을 모두 잡거나 움직일 수 없게 하면 승리',
  init(g) { S = { b: Array(64).fill(0), turn: 1, sel: null, chain: null, think: 0, end: false }; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) { if (y < 3) S.b[y * 8 + x] = -1; if (y > 4) S.b[y * 8 + x] = 1; } S.moves = moves(S.b, 1); },
  update(g, dt) {
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) ai(g); return; }
    if (!g.mouse.clicked) return;
    const x = Math.floor((g.mouse.x - OX) / CS), y = Math.floor((g.mouse.y - OY) / CS), sq = y * 8 + x;
    if (x < 0 || y < 0 || x > 7 || y > 7) return;
    if (S.sel !== null) { const m = S.moves.find((m) => m.path[0] === S.sel && m.path[m.path.length - 1] === sq) || S.moves.find((m) => m.path[0] === S.sel && m.path[1] === sq); if (m) { play(g, m); return; } }
    if (S.b[sq] > 0 && S.moves.some((m) => m.path[0] === sq)) { S.sel = sq; g.sfx.click(); } else S.sel = null;
  },
  draw(g, c) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = y * 8 + x, px = OX + x * CS, py = OY + y * CS;
      g.rect(px, py, CS, CS, (x + y) % 2 ? '#7c2d12' : '#fde68a');
      if (S.last && S.last.includes(sq)) g.rect(px, py, CS, CS, 'rgba(250,204,21,.35)');
      if (S.sel === sq) g.rect(px, py, CS, CS, 'rgba(34,197,94,.5)');
      const v = S.b[sq];
      if (v) { const cx = px + CS / 2, cy = py + CS / 2; g.circle(cx + 2, cy + 4, 32, 'rgba(0,0,0,.4)'); g.circle(cx, cy, 32, v > 0 ? '#dc2626' : '#1c1917'); g.ring(cx, cy, 24, v > 0 ? '#fca5a5' : '#57534e', 3); if (Math.abs(v) === 2) g.emoji('👑', cx, cy, 30); }
    }
    if (S.turn === 1 && !S.end) { const from = new Set(S.moves.map((m) => m.path[0])); for (const sq of from) g.ring(OX + (sq % 8) * CS + CS / 2, OY + Math.floor(sq / 8) * CS + CS / 2, 36, 'rgba(74,222,128,.6)', 2); }
    if (S.sel !== null) for (const m of S.moves.filter((m) => m.path[0] === S.sel)) { const t = m.path[m.path.length - 1]; g.circle(OX + (t % 8) * CS + CS / 2, OY + Math.floor(t / 8) * CS + CS / 2, 12, 'rgba(34,197,94,.8)'); }
    g.text('⛀ 체커', 850, 70, 32, '#fff');
    g.text(S.end ? S.msg : S.turn === 1 ? '당신 차례 (빨강)' : 'AI 생각 중...', 850, 130, 20, S.end ? '#fde047' : '#e7e5e4');
    const me = S.b.filter((v) => v > 0).length, ai = S.b.filter((v) => v < 0).length;
    g.text(`🔴 ${me}  vs  ⚫ ${ai}`, 850, 200, 24, '#fff');
    if (S.moves.some((m) => m.cap.length) && S.turn === 1) g.text('⚠️ 잡기 필수!', 850, 260, 20, '#f87171');
  },
});
function moves(b, side) {
  const out = [], caps = [];
  for (let s = 0; s < 64; s++) {
    const v = b[s]; if (!v || Math.sign(v) !== side) continue;
    const dirs = Math.abs(v) === 2 ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : side > 0 ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]];
    const x = s % 8, y = Math.floor(s / 8);
    for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < 8 && ny < 8 && !b[ny * 8 + nx]) out.push({ path: [s, ny * 8 + nx], cap: [] }); }
    const jump = (bb, at, path, cap, king) => {
      const ax = at % 8, ay = Math.floor(at / 8); let any = false;
      const ds = king ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : dirs;
      for (const [dx, dy] of ds) { const mx = ax + dx, my = ay + dy, tx = ax + 2 * dx, ty = ay + 2 * dy; if (tx < 0 || ty < 0 || tx > 7 || ty > 7) continue; const mid = my * 8 + mx, to = ty * 8 + tx; if (bb[mid] && Math.sign(bb[mid]) === -side && !bb[to] && !cap.includes(mid)) { any = true; const nb = bb.slice(); nb[to] = nb[at]; nb[at] = 0; const prom = !king && ((side > 0 && ty === 0) || (side < 0 && ty === 7)); if (prom) caps.push({ path: [...path, to], cap: [...cap, mid] }); else jump(nb, to, [...path, to], [...cap, mid], king); } }
      if (!any && cap.length) caps.push({ path, cap });
    };
    jump(b, s, [s], [], Math.abs(v) === 2);
  }
  return caps.length ? caps : out;
}
function apply(b, m) {
  const nb = b.slice(), f = m.path[0], t = m.path[m.path.length - 1], v = nb[f];
  nb[f] = 0; m.cap.forEach((c) => (nb[c] = 0)); nb[t] = v;
  const ty = Math.floor(t / 8); if (v === 1 && ty === 0) nb[t] = 2; if (v === -1 && ty === 7) nb[t] = -2;
  return nb;
}
function evalB(b) { let s = 0; b.forEach((v, i) => { if (!v) return; const y = Math.floor(i / 8); s += v === 1 ? 100 + (7 - y) * 4 : v === -1 ? -100 - y * 4 : v * 160; if (v && (i % 8 === 0 || i % 8 === 7)) s += Math.sign(v) * 5; }); return s; }
function mm(b, d, a, be, side) {
  const ms = moves(b, side);
  if (!ms.length) return side > 0 ? -1e5 - d : 1e5 + d;
  if (!d) return evalB(b);
  if (side > 0) { let v = -1e9; for (const m of ms) { v = Math.max(v, mm(apply(b, m), d - 1, a, be, -1)); a = Math.max(a, v); if (a >= be) break; } return v; }
  let v = 1e9; for (const m of ms) { v = Math.min(v, mm(apply(b, m), d - 1, a, be, 1)); be = Math.min(be, v); if (a >= be) break; } return v;
}
function ai(g) {
  const ms = U.shuffle(moves(S.b, -1));
  let best = ms[0], bv = 1e9;
  for (const m of ms) { const v = mm(apply(S.b, m), 5, -1e9, 1e9, 1); if (v < bv) { bv = v; best = m; } }
  play(g, best);
}
function play(g, m) {
  S.b = apply(S.b, m); S.last = m.path; S.sel = null;
  m.cap.length ? (g.sfx.hit(), S.turn === 1 && g.add(100 * m.cap.length)) : g.sfx.tone(300, 0.05, 'triangle', 0.07);
  S.turn = -S.turn; S.moves = moves(S.b, S.turn);
  if (!S.moves.length) { S.end = true; if (S.turn === -1) { S.msg = '🏆 승리!'; g.add(3000); g.later(() => g.win('AI를 이겼다!'), 1); } else { S.msg = '패배...'; g.later(() => g.over('AI에게 졌다'), 1); } }
  if (S.turn === -1) S.think = 0.4;
}
