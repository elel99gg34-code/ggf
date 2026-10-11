let S;
const TH_N = 4, TH_C = 120, TH_GAP = 12, TH_X = 190, TH_Y = 130;
GAME({
  title: '쓰리즈', w: 900, h: 760, bg: '#e6f4f1', controls: 'dpad', noRKey: false,
  help: '←→↑↓ (또는 스와이프/드래그)로 모든 타일을 한 칸씩 밀어요\n1 + 2 = 3 · 3부터는 같은 숫자끼리만 합쳐져요 (3+3=6, 6+6=12 ...)\n밀릴 때마다 반대쪽 가장자리에서 새 타일이 들어와요 (오른쪽 위 "다음" 참고)\n더 이상 움직일 수 없으면 끝! 큰 숫자일수록 점수가 기하급수적으로 커져요',
  init(g) {
    S = { b: [], next: 0, deck: [], moves: 0, maxT: 3, msg: '', msgT: 0, drag: null, dead: 0, best: g.load('maxTile', 3), id: 0, hintT: 0 };
    for (let i = 0; i < TH_N * TH_N; i++) S.b.push(null);
    const cells = U.shuffle([...Array(16).keys()]).slice(0, 9);
    for (const k of cells) S.b[k] = tile(drawCard());
    S.next = drawCard();
    g.score = boardScore();
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    for (const t of S.b) if (t) { t.ox *= Math.pow(0.0001, dt); t.oy *= Math.pow(0.0001, dt); if (Math.abs(t.ox) < 0.01) t.ox = 0; if (Math.abs(t.oy) < 0.01) t.oy = 0; t.pop = Math.max(0, t.pop - dt * 3); t.born = Math.min(1, t.born + dt * 5); }
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) end(g); return; }
    let dir = null;
    if (g.pressed('left')) dir = [-1, 0];
    else if (g.pressed('right')) dir = [1, 0];
    else if (g.pressed('up')) dir = [0, -1];
    else if (g.pressed('down')) dir = [0, 1];
    // 마우스 드래그 (스와이프는 엔진이 pressed로 변환)
    if (g.swiped && S.dragFired) { dir = null; S.dragFired = false; }
    if (g.mouse.clicked) { S.drag = { x: g.mouse.x, y: g.mouse.y }; S.dragFired = false; }
    if (S.drag && !g.mouse.down) S.drag = null;
    if (S.drag && g.mouse.down && !dir) {
      const dx = g.mouse.x - S.drag.x, dy = g.mouse.y - S.drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 60) { dir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; S.drag = null; S.dragFired = true; }
    }
    if (dir) move(g, dir[0], dir[1]);
    g.info = `최대 타일 ${S.maxT} · 이동 ${S.moves}`;
  },
  draw(g, c) {
    g.text('쓰리즈', TH_X, 50, 40, '#0f766e', 'left');
    g.text(`최고 타일 기록 ${S.best}`, TH_X, 88, 16, '#5b7f7a', 'left');
    // 다음 타일
    g.text('다음', 640, 40, 16, '#5b7f7a');
    const nx = 610, ny = 55;
    if (S.next >= 6) { g.rrect(nx, ny, 60, 60, 10, '#fff', '#cbd5e1', 2); g.text('+', nx + 30, ny + 30, 34, '#64748b'); }
    else drawTile(g, nx, ny, 60, 80, { v: S.next, pop: 0, born: 1 }, true);
    // 보드
    const BW = TH_N * TH_C + (TH_N + 1) * TH_GAP;
    g.rrect(TH_X - TH_GAP, TH_Y - TH_GAP, BW, BW, 22, '#bbd9d3');
    for (let r = 0; r < TH_N; r++) for (let q = 0; q < TH_N; q++) g.rrect(TH_X + q * (TH_C + TH_GAP), TH_Y + r * (TH_C + TH_GAP), TH_C, TH_C, 14, '#cbe6e0');
    for (let i = 0; i < 16; i++) {
      const t = S.b[i]; if (!t) continue;
      const q = i % 4, r = (i / 4) | 0;
      const x = TH_X + (q + t.ox) * (TH_C + TH_GAP), y = TH_Y + (r + t.oy) * (TH_C + TH_GAP);
      drawTile(g, x, y, TH_C, TH_C * 1.0, t);
    }
    // 점수표
    g.text('타일 점수: 3=3 · 6=9 · 12=27 · 24=81 · 48=243 · 96=729 · 192=2187 ...', 450, 715, 14, '#5b7f7a');
    g.text('합칠 수 있는 쌍:  1+2  ·  3+3  ·  6+6  ·  12+12 ...', 450, 740, 14, '#5b7f7a');
    if (S.msgT > 0) {
      c.globalAlpha = Math.min(1, S.msgT);
      g.rrect(250, 360, 400, 80, 18, 'rgba(15,118,110,.92)');
      g.text(S.msg, 450, 400, 30, '#fff');
      c.globalAlpha = 1;
    }
    if (S.dead > 0) { g.rrect(250, 360, 400, 80, 18, 'rgba(127,29,29,.92)'); g.text('움직일 수 없어요!', 450, 400, 30, '#fff'); }
  },
});
function tile(v) { return { v, ox: 0, oy: 0, pop: 0, born: 0, id: S.id++ }; }
function drawCard() {
  // 보너스 타일
  if (S.maxT >= 48 && Math.random() < 1 / 21) {
    const opts = []; for (let v = 6; v <= S.maxT / 8; v *= 2) opts.push(v);
    if (opts.length) return U.choice(opts);
  }
  if (!S.deck.length) S.deck = U.shuffle([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
  return S.deck.pop();
}
function canMerge(a, b) { return (a + b === 3 && a * b === 2) || (a === b && a >= 3); }
function tileScore(v) { if (v < 3) return 0; return Math.pow(3, Math.log2(v / 3) + 1); }
function boardScore() { let s = 0; for (const t of S.b) if (t) s += tileScore(t.v); return s; }
function idx(q, r) { return r * 4 + q; }
function lineCells(k, dx, dy) {
  // 이동 방향으로 앞쪽부터 셀 인덱스 목록
  const out = [];
  for (let i = 0; i < 4; i++) {
    if (dx === -1) out.push(idx(i, k)); else if (dx === 1) out.push(idx(3 - i, k));
    else if (dy === -1) out.push(idx(k, i)); else out.push(idx(k, 3 - i));
  }
  return out;
}
function move(g, dx, dy) {
  const moved = [];
  let merged = 0, mergedMax = 0;
  for (let k = 0; k < 4; k++) {
    const cs = lineCells(k, dx, dy);
    let start = -1;
    for (let i = 1; i < 4; i++) {
      const a = S.b[cs[i - 1]], b = S.b[cs[i]];
      if (!b) continue;
      if (!a || canMerge(a.v, b.v)) { start = i; break; }
    }
    if (start < 0) continue;
    moved.push(k);
    const a = S.b[cs[start - 1]], b = S.b[cs[start]];
    if (a) { a.v += b.v; a.pop = 1; a.ox = 0; a.oy = 0; merged++; mergedMax = Math.max(mergedMax, a.v); const p = cellPx(cs[start - 1]); g.burst(p.x, p.y, colorOf(a.v)[0], 10, 180, 0.5, 5); }
    else { S.b[cs[start - 1]] = b; b.ox = -dx; b.oy = -dy; }
    for (let i = start + 1; i < 4; i++) { const t = S.b[cs[i]]; S.b[cs[i - 1]] = t; if (t) { t.ox = -dx; t.oy = -dy; } }
    S.b[cs[3]] = null;
  }
  if (!moved.length) { g.sfx.beep(140, 0.05); g.shake(2, 0.1); return; }
  S.moves++;
  // 새 타일 투입
  const k = U.choice(moved), cs = lineCells(k, dx, dy), t = tile(S.next);
  S.b[cs[3]] = t; t.ox = dx; t.oy = dy;
  S.next = drawCard();
  g.sfx.tone(merged ? 520 + Math.log2(Math.max(3, mergedMax)) * 40 : 330, 0.07, 'triangle', 0.07);
  for (const tt of S.b) if (tt && tt.v > S.maxT) {
    S.maxT = tt.v;
    if (S.maxT >= 12) { S.msg = `${S.maxT} 달성!`; S.msgT = 1.5; g.sfx.power(); g.shake(4, 0.2); const p = cellPx(S.b.indexOf(tt)); g.burst(p.x, p.y, ['#fde047', '#f472b6', '#fff'], 30, 300, 0.9, 5); }
    if (S.maxT > S.best) { S.best = S.maxT; g.save('maxTile', S.best); }
  }
  g.score = boardScore();
  if (!canMove()) S.dead = 1.4;
}
function canMove() {
  for (let i = 0; i < 16; i++) if (!S.b[i]) return true;
  for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    const v = S.b[idx(q, r)].v;
    if (q < 3 && canMerge(v, S.b[idx(q + 1, r)].v)) return true;
    if (r < 3 && canMerge(v, S.b[idx(q, r + 1)].v)) return true;
  }
  return false;
}
function cellPx(i) { return { x: TH_X + (i % 4) * (TH_C + TH_GAP) + TH_C / 2, y: TH_Y + ((i / 4) | 0) * (TH_C + TH_GAP) + TH_C / 2 }; }
function colorOf(v) {
  if (v === 1) return ['#66ccff', '#3b9ad9', '#fff'];
  if (v === 2) return ['#ff6680', '#d9425d', '#fff'];
  if (v >= 384) return ['#fff7d6', '#e8b923', '#b45309'];
  return ['#ffffff', '#f2c94c', '#111'];
}
function drawTile(g, x, y, w, h, t, small) {
  const s = 1 + t.pop * 0.12 - (1 - t.born) * 0.3, cw = w * s, ch = h * s;
  const cx = x + w / 2, cy = y + h / 2, x0 = cx - cw / 2, y0 = cy - ch / 2;
  const [f, sh, tc] = colorOf(t.v);
  g.rrect(x0, y0 + 6 * s, cw, ch - 2, 14, t.v >= 3 ? '#f2c94c' : sh);
  g.rrect(x0, y0, cw, ch - 8 * s, 14, f);
  const str = String(t.v), fs = (small ? 30 : 56) * s * (str.length >= 4 ? 0.62 : str.length === 3 ? 0.78 : 1);
  g.text(str, cx, cy - 4 * s, fs, tc);
  if (!small && t.v >= 3) g.text(['', '', '', '쓰리', '', '', '식스'][t.v] || '', cx, cy + ch * 0.32, 12, '#94a3b8');
}
function end(g) {
  g.score = boardScore();
  let mx = 0; for (const t of S.b) if (t) mx = Math.max(mx, t.v);
  g.over(`최대 타일 ${mx} · ${S.moves}번 이동`);
}
