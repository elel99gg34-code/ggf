let S;
const N = 8, CS = 76, OX = 36, OY = 110;
const GEMS = ['💎', '❤️', '⭐', '🍀', '🔷', '🔮'];
const GC = ['#67e8f9', '#f87171', '#facc15', '#4ade80', '#60a5fa', '#c084fc'];
GAME({
  title: '보석 맞추기', w: 680, h: 760, bg: '#1e1b4b', controls: 'none',
  help: '인접한 보석 두 개를 클릭(또는 드래그)해서 자리 바꾸기\n같은 보석 3개 이상 일렬 → 터짐!\n4개 = ⚡ 줄 폭탄 · L/T자 = 💥 폭탄 · 5개 = 🌈 같은 색 전부\n30번 이동 안에 최대 점수! 연쇄 콤보로 배수 UP',
  init(g) { S = { b: null, sel: null, moves: 30, combo: 0, busy: 0, swap: null, drag: null }; do { fillBoard(); } while (findMatches().length || !hasMove()); },
  update(g, dt) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = S.b[y][x]; if (!c) continue; c.oy = Math.max(0, c.oy - dt * 900); c.ox = c.ox * Math.pow(0.0001, dt); c.pop = Math.max(0, (c.pop || 0) - dt * 3); }
    if (S.busy > 0) { S.busy -= dt; if (S.busy <= 0) step(g); return; }
    const m = g.mouse, cx = Math.floor((m.x - OX) / CS), cy = Math.floor((m.y - OY) / CS), inB = cx >= 0 && cy >= 0 && cx < N && cy < N;
    if (S.moves <= 0) return;
    if (m.clicked && inB) { if (S.sel && Math.abs(S.sel[0] - cx) + Math.abs(S.sel[1] - cy) === 1) { trySwap(g, S.sel, [cx, cy]); S.sel = null; } else { S.sel = [cx, cy]; S.drag = [cx, cy]; g.sfx.click(); } }
    if (m.down && S.drag && inB && (cx !== S.drag[0] || cy !== S.drag[1])) { const dx = Math.sign(cx - S.drag[0]), dy = Math.sign(cy - S.drag[1]); if (!dx || !dy) { trySwap(g, S.drag, [S.drag[0] + (Math.abs(cx - S.drag[0]) >= Math.abs(cy - S.drag[1]) ? dx : 0), S.drag[1] + (Math.abs(cx - S.drag[0]) >= Math.abs(cy - S.drag[1]) ? 0 : dy)]); S.sel = null; } S.drag = null; }
    if (m.released) S.drag = null;
    g.info = `남은 이동 ${S.moves}`;
  },
  draw(g, c) {
    g.text('💎 보석 맞추기', 36, 40, 28, '#fff', 'left');
    g.rrect(440, 20, 200, 64, 12, '#312e81'); g.text('남은 이동', 540, 40, 14, '#c7d2fe'); g.text(S.moves, 540, 66, 30, S.moves <= 5 ? '#f87171' : '#fde047');
    g.rrect(OX - 10, OY - 10, N * CS + 20, N * CS + 20, 16, '#312e81');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g.rrect(OX + x * CS + 2, OY + y * CS + 2, CS - 4, CS - 4, 10, (x + y) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.1)');
    c.save(); c.beginPath(); c.rect(OX - 10, OY - 10, N * CS + 20, N * CS + 20); c.clip();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cl = S.b[y][x]; if (!cl) continue;
      const px = OX + x * CS + CS / 2 + (cl.sx || 0), py = OY + y * CS + CS / 2 - cl.oy + (cl.sy || 0);
      const sel = S.sel && S.sel[0] === x && S.sel[1] === y;
      const s = (cl.dying ? Math.max(0, cl.dying) * 2 : 1) * (1 + (cl.pop || 0) * 0.3) * (sel ? 1.1 + Math.sin(g.time * 10) * 0.05 : 1);
      if (sel) g.ring(px, py, CS * 0.46, '#fff', 3);
      if (cl.sp === 'rainbow') { g.emoji('🌈', px, py, 56 * s); continue; }
      g.emoji(GEMS[cl.t], px, py, 54 * s);
      if (cl.sp === 'line') { g.rrect(px - 26, py - 4, 52, 8, 4, 'rgba(255,255,255,.85)'); g.emoji('⚡', px + 18, py - 18, 20); }
      if (cl.sp === 'bomb') { g.ring(px, py, 30, GC[cl.t], 4); g.emoji('💥', px + 18, py - 18, 20); }
    }
    c.restore();
    if (S.combo > 1 && S.busy > 0) g.text(`${S.combo} 콤보! ×${S.combo}`, 340, 735, 26, '#fde047');
  },
});
function gem(t) { return { t: t ?? U.randi(GEMS.length), oy: 0, ox: 0, sp: null }; }
function fillBoard() { S.b = U.grid(N, N, () => gem()); }
function at(x, y) { return S.b[y]?.[x]; }
function findMatches() {
  const groups = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; ) { const c = at(x, y); if (!c || c.sp === 'rainbow') { x++; continue; } let e = x + 1; while (e < N && at(e, y) && at(e, y).t === c.t && at(e, y).sp !== 'rainbow') e++; if (e - x >= 3) groups.push({ cells: Array.from({ length: e - x }, (_, i) => [x + i, y]), dir: 'h' }); x = e; }
  for (let x = 0; x < N; x++) for (let y = 0; y < N; ) { const c = at(x, y); if (!c || c.sp === 'rainbow') { y++; continue; } let e = y + 1; while (e < N && at(x, e) && at(x, e).t === c.t && at(x, e).sp !== 'rainbow') e++; if (e - y >= 3) groups.push({ cells: Array.from({ length: e - y }, (_, i) => [x, y + i]), dir: 'v' }); y = e; }
  return groups;
}
function trySwap(g, a, b) {
  const A = at(...a), B = at(...b);
  S.b[a[1]][a[0]] = B; S.b[b[1]][b[0]] = A;
  if (A.sp === 'rainbow' || B.sp === 'rainbow') { S.moves--; S.combo = 0; S.pending = { rainbow: A.sp === 'rainbow' ? [b, B.t, A] : [a, A.t, B] }; S.busy = 0.15; g.sfx.power(); return; }
  if (!findMatches().length) { S.b[a[1]][a[0]] = A; S.b[b[1]][b[0]] = B; g.sfx.hit(); A.ox = 0; return; }
  S.moves--; S.combo = 0; S.lastSwap = [a, b]; S.busy = 0.12; g.sfx.move();
}
function step(g) {
  if (S.pending && S.pending.rainbow) {
    const [pos, t, rb] = S.pending.rainbow; S.pending = null;
    const kill = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = at(x, y); if (c === rb || (c && c.t === t)) kill.add(x + ',' + y); }
    return clearSet(g, kill, 3);
  }
  const groups = findMatches();
  if (!groups.length) {
    S.combo = 0; S.lastSwap = null;
    if (!hasMove()) { g.float(340, 400, '섞는 중...', '#fff', 30); do { fillBoard(); } while (findMatches().length || !hasMove()); for (const r of S.b) for (const c of r) c.oy = 600; S.busy = 0.6; }
    if (S.moves <= 0) g.later(() => g.over(`최종 점수 ${g.score}`), 0.6);
    return;
  }
  S.combo++;
  const kill = new Set(), make = [];
  const count = {};
  groups.forEach((gr) => gr.cells.forEach(([x, y]) => (count[x + ',' + y] = (count[x + ',' + y] || 0) + 1)));
  for (const gr of groups) {
    gr.cells.forEach(([x, y]) => kill.add(x + ',' + y));
    const pivot = (S.lastSwap && gr.cells.find(([x, y]) => S.lastSwap.some(([a, b]) => a === x && b === y))) || gr.cells[Math.floor(gr.cells.length / 2)];
    const t = at(...gr.cells[0]).t;
    const cross = gr.cells.find(([x, y]) => count[x + ',' + y] > 1);
    if (gr.cells.length >= 5) make.push([pivot, 'rainbow', t]);
    else if (cross) make.push([cross, 'bomb', t]);
    else if (gr.cells.length === 4) make.push([pivot, 'line', t, gr.dir]);
  }
  clearSet(g, kill, 1, make);
}
function clearSet(g, kill, mult, make = []) {
  // 특수 보석 연쇄
  const queue = [...kill];
  while (queue.length) {
    const k = queue.pop(), [x, y] = k.split(',').map(Number), c = at(x, y); if (!c) continue;
    const add = (a, b) => { if (a >= 0 && b >= 0 && a < N && b < N && !kill.has(a + ',' + b)) { kill.add(a + ',' + b); queue.push(a + ',' + b); } };
    if (c.sp === 'line') { for (let i = 0; i < N; i++) { add(i, y); add(x, i); } g.sfx.tone(1200, 0.15, 'sawtooth', 0.04, 300); }
    if (c.sp === 'bomb') { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) add(x + dx, y + dy); g.sfx.explode(); g.shake(6); }
  }
  const pts = kill.size * 20 * S.combo * mult;
  g.add(pts);
  let sx = 0, sy = 0;
  for (const k of kill) { const [x, y] = k.split(',').map(Number), c = at(x, y); if (!c) continue; sx += x; sy += y; g.burst(OX + x * CS + CS / 2, OY + y * CS + CS / 2, GC[c.t], 8, 200, 0.5); S.b[y][x] = null; }
  g.float(OX + (sx / kill.size) * CS + CS / 2, OY + (sy / kill.size) * CS, '+' + pts, '#fde047', 24);
  for (const [[x, y], sp, t] of make) { const ng = gem(t); ng.sp = sp; ng.pop = 1; S.b[y][x] = ng; }
  g.sfx.tone(400 + S.combo * 80, 0.1, 'triangle', 0.07);
  // 낙하
  for (let x = 0; x < N; x++) {
    let w = N - 1;
    for (let y = N - 1; y >= 0; y--) if (S.b[y][x]) { const c = S.b[y][x]; if (w !== y) { c.oy += (w - y) * CS; S.b[w][x] = c; S.b[y][x] = null; } w--; }
    for (let y = w; y >= 0; y--) { const c = gem(); c.oy = (w + 1) * CS + 40; S.b[y][x] = c; }
  }
  S.busy = 0.38;
}
function hasMove() {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (at(x, y).sp === 'rainbow') return true;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (nx >= N || ny >= N) continue; const a = S.b[y][x], b = S.b[ny][nx]; S.b[y][x] = b; S.b[ny][nx] = a; const ok = findMatches().length > 0; S.b[y][x] = a; S.b[ny][nx] = b; if (ok) return true; }
  }
  return false;
}
