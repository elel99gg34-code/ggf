let S;
const CS = 80, OX = 40, OY = 40;
const W8 = [100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, -1, -1, -1, -1, -2, 10, 5, -2, -1, -1, -1, -1, -2, 5, 5, -2, -1, -1, -1, -1, -2, 5, 10, -2, -1, -1, -1, -1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100];
GAME({
  title: '오셀로', w: 1000, h: 720, bg: '#14532d', controls: 'none',
  help: '흑(나)부터 시작 · 상대 돌을 내 돌 사이에 끼우면 뒤집혀요\n놓을 수 있는 자리가 점으로 표시돼요\n둘 곳이 없으면 자동으로 패스\n판이 다 차면 돌이 더 많은 쪽이 승리 · 모서리를 노려라!',
  init(g) { S = { b: Array(64).fill(0), turn: 1, think: 0, end: false, flips: [], lvl: S?.lvl ?? 1 }; S.b[27] = S.b[36] = -1; S.b[28] = S.b[35] = 1; S.valid = validMoves(S.b, 1); },
  update(g, dt) {
    S.flips = S.flips.filter((f) => (f.t -= dt) > 0);
    for (let i = 0; i < 3; i++) if (g.clickIn(730 + i * 85, 560, 78, 40)) { S.lvl = i; g.sfx.click(); }
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) ai(g); return; }
    if (!g.mouse.clicked) return;
    const x = Math.floor((g.mouse.x - OX) / CS), y = Math.floor((g.mouse.y - OY) / CS);
    if (x < 0 || y < 0 || x > 7 || y > 7) return;
    if (S.valid.includes(y * 8 + x)) play(g, y * 8 + x); else g.sfx.hit();
  },
  draw(g, c) {
    g.rect(OX - 10, OY - 10, CS * 8 + 20, CS * 8 + 20, '#052e16');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = y * 8 + x, px = OX + x * CS, py = OY + y * CS;
      g.rect(px + 1, py + 1, CS - 2, CS - 2, '#15803d');
      if (S.last === sq) g.rect(px + 1, py + 1, CS - 2, CS - 2, '#16a34a');
      const v = S.b[sq], fl = S.flips.find((f) => f.sq === sq);
      if (v) { const sx = fl ? Math.abs(Math.cos((1 - fl.t / 0.3) * Math.PI)) : 1, col = fl && fl.t > 0.15 ? -v : v; c.save(); c.translate(px + CS / 2, py + CS / 2); c.scale(Math.max(0.05, sx), 1); g.circle(2, 4, 32, 'rgba(0,0,0,.35)'); g.circle(0, 0, 32, col > 0 ? '#111' : '#f5f5f4'); g.circle(-8, -10, 8, col > 0 ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.8)'); c.restore(); }
      else if (S.turn === 1 && S.valid.includes(sq) && !S.end) g.circle(px + CS / 2, py + CS / 2, 8, 'rgba(0,0,0,.35)');
    }
    for (const [x, y] of [[2, 2], [6, 2], [2, 6], [6, 6]]) g.circle(OX + x * CS, OY + y * CS, 5, '#052e16');
    const bl = S.b.filter((v) => v === 1).length, wh = S.b.filter((v) => v === -1).length;
    g.text('⚪ 오셀로', 850, 70, 32, '#fff');
    g.circle(780, 160, 26, '#111'); g.text(bl, 830, 160, 34, '#fff'); g.circle(780, 230, 26, '#f5f5f4'); g.text(wh, 830, 230, 34, '#fff');
    g.text('나', 900, 160, 18, '#bbf7d0'); g.text('AI', 900, 230, 18, '#bbf7d0');
    g.text(S.end ? S.msg : S.turn === 1 ? '당신 차례 (흑)' : 'AI 생각 중...', 850, 320, 20, S.end ? '#fde047' : '#dcfce7');
    if (S.passMsg) g.text(S.passMsg, 850, 360, 16, '#fca5a5');
    g.text('AI 난이도', 850, 540, 16, '#bbf7d0');
    ['쉬움', '보통', '어려움'].forEach((n, i) => g.button(730 + i * 85, 560, 78, 40, n, S.lvl === i ? '#b45309' : '#166534', 15));
  },
});
const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];
function flipsFor(b, sq, side) {
  if (b[sq]) return [];
  const out = [];
  for (const d of DIRS) { const line = []; let s = sq; while (true) { const x = s % 8; s += d; if (s < 0 || s > 63 || Math.abs((s % 8) - x) > 1) break; if (b[s] === -side) line.push(s); else { if (b[s] === side && line.length) out.push(...line); break; } } }
  return out;
}
function validMoves(b, side) { const r = []; for (let i = 0; i < 64; i++) if (flipsFor(b, i, side).length) r.push(i); return r; }
function applyM(b, sq, side) { const nb = b.slice(), f = flipsFor(b, sq, side); nb[sq] = side; f.forEach((i) => (nb[i] = side)); return nb; }
function evalO(b) { let s = 0; for (let i = 0; i < 64; i++) s += b[i] * W8[i]; s += (validMoves(b, 1).length - validMoves(b, -1).length) * 5; return s; }
function mm(b, d, a, be, side) {
  const ms = validMoves(b, side);
  if (!d || (!ms.length && !validMoves(b, -side).length)) { if (!ms.length && !validMoves(b, -side).length) { const diff = b.reduce((s, v) => s + v, 0); return diff * 1000; } return evalO(b); }
  if (!ms.length) return mm(b, d - 1, a, be, -side);
  if (side > 0) { let v = -1e9; for (const m of ms) { v = Math.max(v, mm(applyM(b, m, 1), d - 1, a, be, -1)); a = Math.max(a, v); if (a >= be) break; } return v; }
  let v = 1e9; for (const m of ms) { v = Math.min(v, mm(applyM(b, m, -1), d - 1, a, be, 1)); be = Math.min(be, v); if (a >= be) break; } return v;
}
function ai(g) {
  const ms = U.shuffle(validMoves(S.b, -1));
  const depth = [1, 3, 5][S.lvl];
  let best = ms[0], bv = 1e9;
  for (const m of ms) { let v = mm(applyM(S.b, m, -1), depth - 1, -1e9, 1e9, 1); if (S.lvl === 0) v += U.rand(-40, 40); if (v < bv) { bv = v; best = m; } }
  play(g, best);
}
function play(g, sq) {
  const side = S.turn, f = flipsFor(S.b, sq, side);
  S.b = applyM(S.b, sq, side); S.last = sq;
  f.forEach((i, k) => S.flips.push({ sq: i, t: 0.3 + k * 0.03 }));
  g.sfx.tone(side > 0 ? 400 : 300, 0.06, 'triangle', 0.08);
  if (side > 0) g.add(f.length * 10);
  S.passMsg = '';
  let next = -side;
  if (!validMoves(S.b, next).length) { if (validMoves(S.b, side).length) { S.passMsg = (next > 0 ? '당신' : 'AI') + '은 둘 곳이 없어 패스!'; next = side; } else return finish(g); }
  S.turn = next; S.valid = validMoves(S.b, S.turn);
  if (S.turn === -1) S.think = 0.5;
}
function finish(g) {
  S.end = true; const bl = S.b.filter((v) => v === 1).length, wh = S.b.filter((v) => v === -1).length;
  if (bl > wh) { S.msg = `🏆 ${bl} : ${wh} 승리!`; g.add(bl * 50 * (S.lvl + 1)); g.later(() => g.win(S.msg), 1.2); }
  else { S.msg = bl === wh ? `무승부 ${bl} : ${wh}` : `${bl} : ${wh} 패배`; g.add(bl * 10); g.later(() => g.over(S.msg), 1.2); }
}
