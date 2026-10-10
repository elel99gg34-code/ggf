let S;
const CS = 64, OX = 60, OY = 50;
const VAL = { R: 13, C: 7, H: 5, E: 3, A: 3, P: 2, K: 1000 };
const NAME = { R: ['車', '車'], C: ['包', '包'], H: ['馬', '馬'], E: ['象', '象'], A: ['士', '士'], P: ['兵', '卒'], K: ['漢', '楚'] };
GAME({
  title: '장기', w: 1000, h: 740, bg: '#2b1d0e', controls: 'none',
  help: '나는 초(아래, 파랑) · AI는 한(위, 빨강)\n말을 클릭 → 이동 가능한 점 클릭 (궁성 대각선 이동 지원)\n포는 다른 말 하나를 넘어서 이동·잡기 (포끼리는 불가)\n상대 궁을 외통수로 몰면 승리! · 장군이면 반드시 피해야 해요',
  init(g) {
    S = { b: U.grid(9, 10, null), turn: 1, sel: null, moves: [], end: false, think: 0, last: null, lvl: S?.lvl ?? 1, hist: [] };
    const back = ['R', 'H', 'E', 'A', null, 'A', 'E', 'H', 'R'];
    back.forEach((p, x) => { if (p) { S.b[0][x] = { t: p, s: -1 }; S.b[9][x] = { t: p, s: 1 }; } });
    S.b[1][4] = { t: 'K', s: -1 }; S.b[8][4] = { t: 'K', s: 1 };
    for (const x of [1, 7]) { S.b[2][x] = { t: 'C', s: -1 }; S.b[7][x] = { t: 'C', s: 1 }; }
    for (const x of [0, 2, 4, 6, 8]) { S.b[3][x] = { t: 'P', s: -1 }; S.b[6][x] = { t: 'P', s: 1 }; }
    S.moves = legal(S.b, 1);
  },
  update(g, dt) {
    for (let i = 0; i < 3; i++) if (g.clickIn(760 + i * 75, 560, 70, 40)) { S.lvl = i; g.sfx.click(); }
    if (g.clickIn(760, 620, 220, 44) && S.hist.length >= 2 && !S.end) { S.b = S.hist[S.hist.length - 2]; S.hist.length -= 2; S.turn = 1; S.moves = legal(S.b, 1); S.sel = null; g.sfx.click(); return; }
    if (S.end) return;
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) ai(g); return; }
    if (!g.mouse.clicked) return;
    const x = Math.round((g.mouse.x - OX) / CS), y = Math.round((g.mouse.y - OY) / CS);
    if (x < 0 || y < 0 || x > 8 || y > 9) return;
    if (S.sel) { const m = S.moves.find((m) => m.fx === S.sel[0] && m.fy === S.sel[1] && m.tx === x && m.ty === y); if (m) return play(g, m); }
    const p = S.b[y][x];
    if (p && p.s === 1 && S.moves.some((m) => m.fx === x && m.fy === y)) { S.sel = [x, y]; g.sfx.click(); } else S.sel = null;
  },
  draw(g, c) {
    g.rrect(OX - 40, OY - 36, CS * 8 + 80, CS * 9 + 72, 10, '#e6b973', '#8a5a24', 4);
    for (let i = 0; i < 10; i++) g.line(OX, OY + i * CS, OX + 8 * CS, OY + i * CS, '#5b3a14', 1.5);
    for (let i = 0; i < 9; i++) g.line(OX + i * CS, OY, OX + i * CS, OY + 9 * CS, '#5b3a14', 1.5);
    for (const [y0] of [[0], [7]]) { g.line(OX + 3 * CS, OY + y0 * CS, OX + 5 * CS, OY + (y0 + 2) * CS, '#5b3a14', 1.5); g.line(OX + 5 * CS, OY + y0 * CS, OX + 3 * CS, OY + (y0 + 2) * CS, '#5b3a14', 1.5); }
    if (S.last) for (const [x, y] of [[S.last.fx, S.last.fy], [S.last.tx, S.last.ty]]) g.ring(OX + x * CS, OY + y * CS, 30, 'rgba(234,88,12,.7)', 3);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
      const p = S.b[y][x]; if (!p) continue;
      const px = OX + x * CS, py = OY + y * CS, r = p.t === 'K' ? 30 : p.t === 'P' || p.t === 'A' ? 22 : 26;
      const sel = S.sel && S.sel[0] === x && S.sel[1] === y;
      g.ctx.save(); g.ctx.translate(px, py);
      g.poly(Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4 + Math.PI / 8) * r, Math.sin(i * Math.PI / 4 + Math.PI / 8) * r]), sel ? '#fde68a' : '#fef3c7', p.s > 0 ? '#1d4ed8' : '#b91c1c', 3);
      g.ctx.restore();
      g.text(NAME[p.t][p.s > 0 ? 1 : 0], px, py + 1, r * 1.05, p.s > 0 ? '#1d4ed8' : '#b91c1c', 'center', 'bold');
    }
    if (S.sel) for (const m of S.moves.filter((m) => m.fx === S.sel[0] && m.fy === S.sel[1])) g.circle(OX + m.tx * CS, OY + m.ty * CS, S.b[m.ty][m.tx] ? 32 : 9, S.b[m.ty][m.tx] ? 'rgba(220,38,38,.35)' : 'rgba(22,163,74,.75)');
    g.text('장기', 870, 70, 34, '#fde68a');
    g.text(S.end ? S.msg : S.turn === 1 ? '초(나) 차례' : '한(AI) 생각 중...', 870, 130, 20, S.end ? '#fde047' : '#fef3c7');
    if (S.check && !S.end) g.text('장군!', 870, 175, 30, '#f87171');
    const mat = (s) => { let v = 0; for (const row of S.b) for (const p of row) if (p && p.s === s && p.t !== 'K') v += VAL[p.t]; return v; };
    g.text(`기물 점수  초 ${mat(1)} : 한 ${mat(-1)}`, 870, 230, 15, '#d6a86b');
    g.text('AI 수읽기', 870, 540, 15, '#d6a86b');
    ['쉬움', '보통', '어려움'].forEach((n, i) => g.button(760 + i * 75, 560, 70, 40, n, S.lvl === i ? '#b45309' : '#4a3216', 15));
    g.button(760, 620, 220, 44, '↶ 한 수 무르기', '#4a3216', 16);
  },
});
const inPal = (x, y) => x >= 3 && x <= 5 && ((y >= 0 && y <= 2) || (y >= 7 && y <= 9));
const palDiag = (x, y) => inPal(x, y) && ((x === 4 && (y === 1 || y === 8)) || ((x === 3 || x === 5) && (y === 0 || y === 2 || y === 7 || y === 9)));
function diagSteps(x, y) { // 궁성 대각선 인접점
  if (!palDiag(x, y)) return [];
  const cy = y <= 2 ? 1 : 8, r = [];
  if (x === 4 && y === cy) for (const dx of [-1, 1]) for (const dy of [-1, 1]) r.push([dx, dy]);
  else r.push([4 - x, cy - y]);
  return r;
}
function gen(b, s) {
  const out = [];
  const at = (x, y) => (x >= 0 && y >= 0 && x < 9 && y < 10 ? b[y][x] : undefined);
  const add = (fx, fy, tx, ty) => { const q = at(tx, ty); if (q === undefined) return; if (q && q.s === s) return; out.push({ fx, fy, tx, ty }); };
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    const p = b[y][x]; if (!p || p.s !== s) continue;
    const t = p.t;
    if (t === 'K' || t === 'A') { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], ...diagSteps(x, y)]) if (inPal(x + dx, y + dy) && (y <= 2) === (y + dy <= 2)) add(x, y, x + dx, y + dy); }
    else if (t === 'P') { const f = -s; const dirs = [[0, f], [1, 0], [-1, 0]]; for (const [dx, dy] of diagSteps(x, y)) if (dy === f) dirs.push([dx, dy]); for (const [dx, dy] of dirs) add(x, y, x + dx, y + dy); }
    else if (t === 'H') { for (const [ox, oy, dx, dy] of [[0, -1, 1, -2], [0, -1, -1, -2], [0, 1, 1, 2], [0, 1, -1, 2], [1, 0, 2, 1], [1, 0, 2, -1], [-1, 0, -2, 1], [-1, 0, -2, -1]]) if (at(x + ox, y + oy) === null) add(x, y, x + dx, y + dy); }
    else if (t === 'E') { for (const [ox, oy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) for (const sd of [-1, 1]) { const ax = ox || sd, ay = oy || sd; const m1 = [x + ox, y + oy], m2 = [x + ox + ax, y + oy + ay], d = [x + ox + 2 * ax, y + oy + 2 * ay]; if (at(...m1) === null && at(...m2) === null) add(x, y, ...d); } }
    else if (t === 'R' || t === 'C') {
      const rays = [[1, 0], [-1, 0], [0, 1], [0, -1]].map((d) => ({ d, pal: false }));
      for (const d of diagSteps(x, y)) rays.push({ d, pal: true });
      for (const { d: [dx, dy], pal } of rays) {
        let nx = x + dx, ny = y + dy, jumped = false;
        while (true) {
          const q = at(nx, ny); if (q === undefined) break; if (pal && !inPal(nx, ny)) break;
          if (t === 'R') { if (q) { if (q.s !== s) out.push({ fx: x, fy: y, tx: nx, ty: ny }); break; } out.push({ fx: x, fy: y, tx: nx, ty: ny }); }
          else { if (!jumped) { if (q) { if (q.t === 'C') break; jumped = true; } } else { if (q) { if (q.s !== s && q.t !== 'C') out.push({ fx: x, fy: y, tx: nx, ty: ny }); break; } out.push({ fx: x, fy: y, tx: nx, ty: ny }); } }
          if (pal && !palDiag(nx + dx, ny + dy)) break;
          nx += dx; ny += dy;
        }
      }
    }
  }
  return out;
}
function apply(b, m) { const nb = b.map((r) => r.slice()); nb[m.ty][m.tx] = nb[m.fy][m.fx]; nb[m.fy][m.fx] = null; return nb; }
function kingAt(b, s) { for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) { const p = b[y][x]; if (p && p.t === 'K' && p.s === s) return [x, y]; } return null; }
function inCheck(b, s) { const k = kingAt(b, s); if (!k) return true; return gen(b, -s).some((m) => m.tx === k[0] && m.ty === k[1]); }
function legal(b, s) { return gen(b, s).filter((m) => !inCheck(apply(b, m), s)); }
function evalB(b) { let v = 0; for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) { const p = b[y][x]; if (!p) continue; let w = VAL[p.t]; if (p.t === 'P') w += (p.s > 0 ? 9 - y : y) > 4 ? 0.6 : 0; if (p.t === 'H' || p.t === 'C') w += 0.2 - Math.abs(x - 4) * 0.04; v += p.s * w; } return v; }
function mm(b, d, a, be, s) {
  const ms = gen(b, s);
  if (!d) return evalB(b);
  ms.sort((m1, m2) => (b[m2.ty][m2.tx] ? VAL[b[m2.ty][m2.tx].t] : 0) - (b[m1.ty][m1.tx] ? VAL[b[m1.ty][m1.tx].t] : 0));
  let best = s > 0 ? -1e9 : 1e9, any = false;
  for (const m of ms) {
    const cap = b[m.ty][m.tx]; if (cap && cap.t === 'K') return s * 1e5;
    const nb = apply(b, m); any = true;
    const v = mm(nb, d - 1, a, be, -s);
    if (s > 0) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); be = Math.min(be, v); }
    if (a >= be) break;
  }
  return any ? best : -s * 1e5;
}
function ai(g) {
  const ms = U.shuffle(legal(S.b, -1));
  if (!ms.length) return;
  const d = [1, 2, 3][S.lvl];
  let best = ms[0], bv = 1e9;
  for (const m of ms) { let v = mm(apply(S.b, m), d - 1, -1e9, 1e9, 1); if (S.lvl === 0) v += U.rand(-1.5, 1.5); if (v < bv) { bv = v; best = m; } }
  play(g, best);
}
function play(g, m) {
  const cap = S.b[m.ty][m.tx];
  S.hist.push(S.b); S.b = apply(S.b, m); S.last = m; S.sel = null;
  cap ? g.sfx.hit() : g.sfx.tone(260, 0.06, 'triangle', 0.1);
  if (cap && S.turn === 1) g.add(VAL[cap.t] * 20);
  S.turn = -S.turn; S.moves = legal(S.b, S.turn); S.check = inCheck(S.b, S.turn);
  if (S.check) g.sfx.beep(880, 0.2);
  if (!S.moves.length) { S.end = true; if (S.turn === -1) { S.msg = '외통수! 초의 승리'; g.add(3000 * (S.lvl + 1)); g.later(() => g.win(S.msg), 1.2); } else { S.msg = '외통수... 패배'; g.later(() => g.over(S.msg), 1.2); } return; }
  if (S.turn === -1) S.think = 0.35;
}
