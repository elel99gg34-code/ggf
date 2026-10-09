let S;
const PV = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const GLY = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
const CS = 80, OX = 40, OY = 40;
GAME({
  title: '체스', w: 1000, h: 720, bg: '#1c1917', controls: 'none',
  help: '말을 클릭 → 이동할 칸 클릭 (가능한 수가 표시돼요)\n캐슬링 · 앙파상 · 폰 승격(퀸) 모두 지원\n난이도 버튼으로 AI 수읽기 깊이 조절\n체크메이트로 승리! (무승부도 있어요)',
  init(g) { S = { lvl: S?.lvl ?? 1 }; reset(); },
  update(g, dt) {
    if (S.end) return;
    for (let i = 0; i < 3; i++) if (g.clickIn(730 + i * 85, 560, 78, 40)) { S.lvl = i; g.sfx.click(); }
    if (g.clickIn(730, 620, 245, 44) && S.hist.length >= 2) { S.pos = S.hist[S.hist.length - 2]; S.hist.length -= 2; S.sel = null; S.last = null; g.sfx.click(); return; }
    if (S.turn === 'b') { S.think -= dt; if (S.think <= 0) aiMove(g); return; }
    if (!g.mouse.clicked) return;
    const x = Math.floor((g.mouse.x - OX) / CS), y = Math.floor((g.mouse.y - OY) / CS);
    if (x < 0 || y < 0 || x > 7 || y > 7) return;
    const sq = y * 8 + x, p = S.pos.b[sq];
    if (S.sel !== null) { const mv = S.moves.find((m) => m.f === S.sel && m.t === sq); if (mv) { doMove(g, mv); return; } }
    if (p && isW(p)) { S.sel = sq; g.sfx.click(); } else S.sel = null;
  },
  draw(g, c) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = y * 8 + x, px = OX + x * CS, py = OY + y * CS;
      g.rect(px, py, CS, CS, (x + y) % 2 ? '#b58863' : '#f0d9b5');
      if (S.last && (S.last.f === sq || S.last.t === sq)) g.rect(px, py, CS, CS, 'rgba(250,204,21,.4)');
      if (S.sel === sq) g.rect(px, py, CS, CS, 'rgba(34,197,94,.5)');
      const kc = S.check && S.pos.b[sq] === (S.turn === 'w' ? 'K' : 'k');
      if (kc) g.rect(px, py, CS, CS, 'rgba(239,68,68,.6)');
      const p = S.pos.b[sq];
      if (p) piece(g, p, px + CS / 2, py + CS / 2 + 4);
      if (x === 0) g.text(8 - y, px + 8, py + 12, 12, (x + y) % 2 ? '#f0d9b5' : '#b58863');
      if (y === 7) g.text('abcdefgh'[x], px + CS - 8, py + CS - 10, 12, (x + y) % 2 ? '#f0d9b5' : '#b58863');
    }
    if (S.sel !== null) for (const m of S.moves.filter((m) => m.f === S.sel)) { const x = m.t % 8, y = Math.floor(m.t / 8); if (S.pos.b[m.t]) g.ring(OX + x * CS + CS / 2, OY + y * CS + CS / 2, CS * 0.45, 'rgba(0,0,0,.35)', 5); else g.circle(OX + x * CS + CS / 2, OY + y * CS + CS / 2, 12, 'rgba(0,0,0,.25)'); }
    g.text('♚ 체스', 850, 70, 32, '#fff');
    g.text(S.end ? S.endMsg : S.turn === 'w' ? '당신 차례 (백)' : 'AI 생각 중...', 850, 130, 20, S.end ? '#fde047' : '#e7e5e4');
    if (S.check && !S.end) g.text('체크!', 850, 170, 26, '#f87171');
    g.text('잡은 말', 850, 230, 16, '#a8a29e');
    const cap = (side) => { const all = 'pppppppp nnbbrrq'.replace(/ /g, ''); const cnt = {}; S.pos.b.forEach((p) => p && (cnt[p] = (cnt[p] || 0) + 1)); const init = { p: 8, n: 2, b: 2, r: 2, q: 1 }; let s = ''; for (const k of ['q', 'r', 'b', 'n', 'p']) { const key = side === 'w' ? k : k.toUpperCase(); s += GLY[key.toUpperCase()].repeat(Math.max(0, init[k] - (cnt[key] || 0))); } return s; };
    g.text(cap('w'), 850, 270, 26, '#111'); g.text(cap('b'), 850, 310, 26, '#fff');
    g.text('AI 난이도', 850, 540, 16, '#a8a29e');
    ['쉬움', '보통', '어려움'].forEach((n, i) => g.button(730 + i * 85, 560, 78, 40, n, S.lvl === i ? '#b45309' : '#44403c', 15));
    g.button(730, 620, 245, 44, '↶ 한 수 무르기', '#44403c', 16);
  },
});
const isW = (p) => p && p === p.toUpperCase();
function piece(g, p, x, y, size = 60) {
  const c = g.ctx, w = isW(p);
  g.circle(x + 2, y + 1, 33, 'rgba(0,0,0,.35)');
  g.circle(x, y - 3, 33, w ? '#fafaf9' : '#292524'); g.ring(x, y - 3, 33, w ? '#a8a29e' : '#78716c', 2);
  c.font = `${size}px "Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = w ? '#1c1917' : '#fafaf9';
  c.fillText(GLY[p.toLowerCase()], x, y);
}
function reset() {
  const b = Array(64).fill(null);
  const back = 'rnbqkbnr';
  for (let i = 0; i < 8; i++) { b[i] = back[i]; b[8 + i] = 'p'; b[48 + i] = 'P'; b[56 + i] = back[i].toUpperCase(); }
  S.pos = { b, c: { K: true, Q: true, k: true, q: true }, ep: -1 };
  S.turn = 'w'; S.sel = null; S.hist = []; S.end = false; S.last = null; S.think = 0;
  S.moves = legal(S.pos, 'w'); S.check = false;
}
function gen(pos, side) {
  const b = pos.b, out = [], my = side === 'w' ? isW : (p) => p && !isW(p);
  const add = (f, t, extra = {}) => out.push({ f, t, ...extra });
  for (let s = 0; s < 64; s++) {
    const p = b[s]; if (!p || !my(p)) continue;
    const x = s % 8, y = (s / 8) | 0, k = p.toLowerCase();
    const slide = (dirs, one) => { for (const [dx, dy] of dirs) { let nx = x + dx, ny = y + dy; while (nx >= 0 && ny >= 0 && nx < 8 && ny < 8) { const t = ny * 8 + nx, q = b[t]; if (q) { if (!my(q)) add(s, t); break; } add(s, t); if (one) break; nx += dx; ny += dy; } } };
    if (k === 'p') {
      const d = side === 'w' ? -1 : 1, sy = side === 'w' ? 6 : 1, ny = y + d;
      if (ny >= 0 && ny < 8) {
        if (!b[ny * 8 + x]) { add(s, ny * 8 + x, { promo: ny === 0 || ny === 7 }); if (y === sy && !b[(y + 2 * d) * 8 + x]) add(s, (y + 2 * d) * 8 + x, { dbl: true }); }
        for (const dx of [-1, 1]) { const nx = x + dx; if (nx < 0 || nx > 7) continue; const t = ny * 8 + nx; if (b[t] && !my(b[t])) add(s, t, { promo: ny === 0 || ny === 7 }); if (t === pos.ep) add(s, t, { ep: true }); }
      }
    } else if (k === 'n') slide([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], true);
    else if (k === 'b') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    else if (k === 'r') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    else if (k === 'q') slide([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
    else if (k === 'k') {
      slide([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], true);
      const r = side === 'w' ? 7 : 0, K = side === 'w' ? 'K' : 'k', Q = side === 'w' ? 'Q' : 'q', opp = side === 'w' ? 'b' : 'w';
      if (s === r * 8 + 4) {
        if (pos.c[K] && !b[r * 8 + 5] && !b[r * 8 + 6] && b[r * 8 + 7] && b[r * 8 + 7].toLowerCase() === 'r' && !attacked(pos, r * 8 + 4, opp) && !attacked(pos, r * 8 + 5, opp)) add(s, r * 8 + 6, { castle: 'k' });
        if (pos.c[Q] && !b[r * 8 + 3] && !b[r * 8 + 2] && !b[r * 8 + 1] && b[r * 8] && b[r * 8].toLowerCase() === 'r' && !attacked(pos, r * 8 + 4, opp) && !attacked(pos, r * 8 + 3, opp)) add(s, r * 8 + 2, { castle: 'q' });
      }
    }
  }
  return out;
}
function attacked(pos, sq, by) {
  const b = pos.b, x = sq % 8, y = (sq / 8) | 0, mine = (p) => p && (by === 'w' ? isW(p) : !isW(p));
  const pd = by === 'w' ? 1 : -1;
  for (const dx of [-1, 1]) { const nx = x + dx, ny = y + pd; if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) { const p = b[ny * 8 + nx]; if (mine(p) && p.toLowerCase() === 'p') return true; } }
  for (const [dx, dy] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) { const p = b[ny * 8 + nx]; if (mine(p) && p.toLowerCase() === 'n') return true; } }
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy, n = 1;
    while (nx >= 0 && ny >= 0 && nx < 8 && ny < 8) { const p = b[ny * 8 + nx]; if (p) { if (mine(p)) { const k = p.toLowerCase(); if (k === 'q' || (k === 'k' && n === 1) || (k === 'r' && (!dx || !dy)) || (k === 'b' && dx && dy)) return true; } break; } nx += dx; ny += dy; n++; }
  }
  return false;
}
function make(pos, m) {
  const b = pos.b.slice(), p = b[m.f], c = { ...pos.c };
  b[m.t] = p; b[m.f] = null;
  if (m.ep) b[m.t + (isW(p) ? 8 : -8)] = null;
  if (m.promo) b[m.t] = isW(p) ? 'Q' : 'q';
  if (m.castle) { const r = (m.t / 8) | 0; if (m.castle === 'k') { b[r * 8 + 5] = b[r * 8 + 7]; b[r * 8 + 7] = null; } else { b[r * 8 + 3] = b[r * 8]; b[r * 8] = null; } }
  if (p === 'K') c.K = c.Q = false; if (p === 'k') c.k = c.q = false;
  if (m.f === 63 || m.t === 63) c.K = false; if (m.f === 56 || m.t === 56) c.Q = false; if (m.f === 7 || m.t === 7) c.k = false; if (m.f === 0 || m.t === 0) c.q = false;
  return { b, c, ep: m.dbl ? (m.f + m.t) / 2 : -1 };
}
function kingSq(pos, side) { return pos.b.indexOf(side === 'w' ? 'K' : 'k'); }
function legal(pos, side) { const opp = side === 'w' ? 'b' : 'w'; return gen(pos, side).filter((m) => { const np = make(pos, m); return !attacked(np, kingSq(np, side), opp); }); }
function evalPos(pos) { let s = 0; pos.b.forEach((p, i) => { if (!p) return; const k = p.toLowerCase(), w = isW(p); s += (w ? 1 : -1) * (PV[k] + PST[k][w ? i : (7 - ((i / 8) | 0)) * 8 + (i % 8)]); }); return s; }
function search(pos, depth, alpha, beta, side) {
  const ms = legal(pos, side);
  if (!ms.length) { const opp = side === 'w' ? 'b' : 'w'; return attacked(pos, kingSq(pos, side), opp) ? (side === 'w' ? -1e6 - depth : 1e6 + depth) : 0; }
  if (depth === 0) return evalPos(pos);
  ms.sort((a, b) => (pos.b[b.t] ? PV[pos.b[b.t].toLowerCase()] : 0) - (pos.b[a.t] ? PV[pos.b[a.t].toLowerCase()] : 0));
  if (side === 'w') { let v = -1e9; for (const m of ms) { v = Math.max(v, search(make(pos, m), depth - 1, alpha, beta, 'b')); alpha = Math.max(alpha, v); if (alpha >= beta) break; } return v; }
  let v = 1e9; for (const m of ms) { v = Math.min(v, search(make(pos, m), depth - 1, alpha, beta, 'w')); beta = Math.min(beta, v); if (alpha >= beta) break; } return v;
}
function aiMove(g) {
  const ms = legal(S.pos, 'b');
  const depth = [1, 2, 3][S.lvl];
  let best = null, bv = 1e9;
  U.shuffle(ms);
  for (const m of ms) { let v = search(make(S.pos, m), depth - 1, -1e9, 1e9, 'w'); if (S.lvl === 0) v += U.rand(-60, 60); if (v < bv) { bv = v; best = m; } }
  if (best) doMove(g, best);
}
function doMove(g, m) {
  const cap = S.pos.b[m.t] || m.ep;
  S.hist.push(S.pos);
  S.pos = make(S.pos, m); S.last = m; S.sel = null;
  if (cap) g.sfx.hit(); else g.sfx.tone(300, 0.05, 'triangle', 0.08);
  if (S.turn === 'w' && cap) g.add(PV[(S.hist[S.hist.length - 1].b[m.t] || 'p').toLowerCase()] / 10);
  S.turn = S.turn === 'w' ? 'b' : 'w';
  S.moves = legal(S.pos, S.turn);
  const opp = S.turn === 'w' ? 'b' : 'w';
  S.check = attacked(S.pos, kingSq(S.pos, S.turn), opp);
  if (S.check) g.sfx.beep(880, 0.15);
  const onlyKings = S.pos.b.filter(Boolean).length === 2;
  if (!S.moves.length || onlyKings) {
    S.end = true;
    if (S.check) { if (S.turn === 'b') { S.endMsg = '체크메이트! 승리'; g.add(3000 * (S.lvl + 1)); g.later(() => g.win(S.endMsg), 1.2); } else { S.endMsg = '체크메이트... 패배'; g.later(() => g.over(S.endMsg), 1.2); } }
    else { S.endMsg = '스테일메이트 (무승부)'; g.add(500); g.later(() => g.over(S.endMsg), 1.2); }
    return;
  }
  if (S.turn === 'b') S.think = 0.35;
}
