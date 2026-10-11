'use strict';
let S;
const PY_W = 6, PY_H = 13, PY_C = 40;
const PY_COL = [null, '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#94a3b8'];
const PY_FACE = [null, '😡', '😊', '😌', '😆', '😎', '😶'];
const PY_CP = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
const PY_GB = [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10];
const PY_CB = [0, 0, 3, 6, 12, 24];
const PY_DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const PY_AI = [
  { name: '슬라임', step: 0.28, think: 0.6, colors: 3, want: 1, err: 0.3 },
  { name: '해골병사', step: 0.2, think: 0.45, colors: 4, want: 2, err: 0.18 },
  { name: '마녀', step: 0.14, think: 0.3, colors: 4, want: 3, err: 0.1 },
  { name: '드래곤', step: 0.09, think: 0.2, colors: 4, want: 3, err: 0.04 },
  { name: '마왕', step: 0.06, think: 0.12, colors: 4, want: 4, err: 0 },
];
GAME({
  title: '뿌요 연쇄', w: 960, h: 640, bg: '#1e1b4b', controls: 'dpad+ab', aLabel: '⤓', bLabel: '↺',
  help: '←→ 이동 · ↓ 빨리 내리기 · Space 즉시 낙하\n↑/X 시계 회전 · Shift/Q 반시계 회전 (양옆 막히면 180° 퀵턴)\n같은 색 4개 이상 이어지면 펑! 연쇄할수록 방해뿌요 대량 공격\n상대 공격은 내 연쇄로 상쇄 · 가운데 3번째 칸이 막히면 패배 · 5명의 AI를 이겨라',
  init(g) { S = { stage: 0, total: 0 }; startMatch(g); },
  update(g, dt) {
    if (S.pause > 0) { S.pause -= dt; if (S.pause <= 0 && S.after) { const f = S.after; S.after = null; f(); } return; }
    S.time += dt;
    playerInput(g, dt);
    for (const b of [S.me, S.ai]) stepBoard(g, b, dt);
    if (S.done) return;
    aiUpdate(g, dt);
    for (const a of S.shots) { a.t += dt * 1.5; }
    S.shots = S.shots.filter((a) => a.t < 1);
    S.grav = Math.max(0.12, 0.7 - S.time * 0.004);
    g.info = `${S.stage + 1}/5 · VS ${PY_AI[S.stage].name}`;
  },
  draw(g, c) {
    drawBoard(g, c, S.me, 110, 90, false);
    drawBoard(g, c, S.ai, 610, 90, true);
    g.text(`ROUND ${S.stage + 1}`, 480, 70, 22, '#fde047');
    g.emoji(['🟢', '💀', '🧙', '🐉', '😈'][S.stage], 480, 160, 70);
    g.text(PY_AI[S.stage].name, 480, 215, 18, '#fca5a5');
    g.text('최대 연쇄', 480, 300, 14, '#c4b5fd');
    g.text(`${S.me.maxChain}`, 480, 330, 30, '#fff');
    g.text(`AI ${S.ai.maxChain}`, 480, 365, 14, '#a5b4fc');
    g.text(`시간 ${U.fmtTime(S.time)}`, 480, 400, 14, '#a5b4fc');
    for (const a of S.shots) { const k = U.clamp(a.t, 0, 1); g.emoji('⚪', U.lerp(a.sx, a.tx, k), U.lerp(a.sy, a.ty, k) - Math.sin(k * Math.PI) * 150, 26 + a.n); }
    if (S.banner) { g.rrect(250, 260, 460, 110, 16, 'rgba(15,10,40,.92)', '#fde047', 3); g.text(S.banner, 480, 300, 34, '#fde047'); g.text(S.banner2 || '', 480, 340, 16, '#e2e8f0'); }
  },
});
function newBoard(colors) {
  return { grid: U.grid(PY_W, PY_H, 0), cur: null, queue: [], phase: 'spawn', t: 0, fall: 0, lock: 0, chain: 0, pending: 0, leftover: 0, maxChain: 0, anim: [], hide: new Set(), pop: [], score: 0, dead: false, msg: '', msgT: 0, colors, plan: null, think: 0, act: 0 };
}
function startMatch(g) {
  const st = PY_AI[S.stage];
  const seq = [];
  const colors = st.colors;
  for (let i = 0; i < 400; i++) seq.push([U.randi(1, colors), U.randi(1, colors)]);
  S.me = newBoard(colors); S.ai = newBoard(colors);
  S.me.seq = seq; S.ai.seq = seq; S.me.si = 0; S.ai.si = 0;
  S.time = 0; S.done = false; S.shots = []; S.grav = 0.7; S.das = 0; S.dasDir = 0;
  S.banner = `ROUND ${S.stage + 1}`; S.banner2 = `VS ${st.name}`; S.pause = 1.5; S.after = () => (S.banner = '');
}
function nextPair(b, k) { const p = b.seq[(b.si + k) % b.seq.length]; return p; }
function spawn(g, b) {
  const p = nextPair(b, 0); b.si++;
  b.cur = { x: 2, y: 1, r: 0, a: p[0], c: p[1] };
  b.fall = 0; b.lock = 0; b.plan = null; b.phase = 'play';
  if (b.grid[1][2]) lose(g, b);
}
function childPos(cu, r) { const d = PY_DIR[r === undefined ? cu.r : r]; return [cu.x + d[0], cu.y + d[1]]; }
function free(b, x, y) { return x >= 0 && x < PY_W && y < PY_H && (y < 0 || !b.grid[y][x]); }
function fitsAt(b, x, y, r) { const d = PY_DIR[r]; return free(b, x, y) && free(b, x + d[0], y + d[1]); }
function move(b, dx, dy) { const c = b.cur; if (fitsAt(b, c.x + dx, c.y + dy, c.r)) { c.x += dx; c.y += dy; return true; } return false; }
function rotate(b, dir) {
  const c = b.cur, nr = (c.r + dir + 4) % 4;
  if (fitsAt(b, c.x, c.y, nr)) { c.r = nr; return true; }
  const d = PY_DIR[nr];
  if (fitsAt(b, c.x - d[0], c.y - d[1], nr)) { c.x -= d[0]; c.y -= d[1]; c.r = nr; return true; }
  const fr = (c.r + 2) % 4; const fd = PY_DIR[fr];
  if (fitsAt(b, c.x, c.y, fr)) { c.r = fr; return true; }
  if (fitsAt(b, c.x - fd[0], c.y - fd[1], fr)) { c.x -= fd[0]; c.y -= fd[1]; c.r = fr; return true; }
  return false;
}
function lose(g, b) {
  b.dead = true; S.done = true; g.shake(12, 0.5);
  if (b === S.me) { g.sfx.lose(); S.banner = '패배…'; S.banner2 = `${PY_AI[S.stage].name}의 승리`; S.pause = 2; S.after = () => g.over(`${S.stage + 1}라운드 패배 · 최대 ${S.me.maxChain}연쇄`); }
  else {
    g.sfx.win(); g.add(2000 * (S.stage + 1), 720, 300); g.burst(720, 330, PY_COL.slice(1, 5), 60, 400, 1.2);
    S.banner = '승리! 🎉'; S.banner2 = S.stage < 4 ? '다음 상대 등장!' : '마왕을 쓰러뜨렸다!'; S.pause = 2.2;
    S.after = () => { if (S.stage >= 4) return g.win(`전설의 뿌요 마스터! 최대 ${S.me.maxChain}연쇄`); S.stage++; startMatch(g); };
  }
}
function playerInput(g, dt) {
  const b = S.me; if (!b.cur || b.phase !== 'play' || S.done) return;
  const dir = (g.held('right') ? 1 : 0) - (g.held('left') ? 1 : 0);
  if (g.pressed('left') || g.swiped === 'left') { move(b, -1, 0) && g.sfx.tone(320, 0.02, 'sine', 0.04); S.dasDir = -1; S.das = 0; }
  else if (g.pressed('right') || g.swiped === 'right') { move(b, 1, 0) && g.sfx.tone(320, 0.02, 'sine', 0.04); S.dasDir = 1; S.das = 0; }
  else if (dir && dir === S.dasDir) { S.das += dt; if (S.das > 0.18) { S.das -= 0.05; move(b, dir, 0); } }
  else { S.dasDir = dir; S.das = 0; }
  if (g.pressed('up') || g.keyp('KeyX') || (g.mouse.clicked && !g.swiped)) { if (rotate(b, 1)) g.sfx.tone(520, 0.03, 'triangle', 0.05); }
  if ((g.pressed('b') && !g.keyp('KeyX')) || g.keyp('KeyQ')) { if (rotate(b, -1)) g.sfx.tone(480, 0.03, 'triangle', 0.05); }
  if (g.held('down')) b.fall += dt * 14;
  if (g.pressed('a') || g.swiped === 'down') { while (move(b, 0, 1)) g.score += 1; place(g, b); }
}
function aiUpdate(g, dt) {
  const b = S.ai, st = PY_AI[S.stage];
  if (!b.cur || b.phase !== 'play') return;
  if (!b.plan) { b.think += dt; if (b.think < st.think) return; b.think = 0; b.plan = aiPlan(b, st); b.act = 0; return; }
  b.act += dt; if (b.act < st.step) return; b.act = 0;
  const c = b.cur, p = b.plan;
  if (c.r !== p.r) { if (!rotate(b, p.r === 3 && c.r === 0 ? -1 : 1)) p.r = c.r; }
  else if (c.x < p.x) { if (!move(b, 1, 0)) p.x = c.x; }
  else if (c.x > p.x) { if (!move(b, -1, 0)) p.x = c.x; }
  else { while (move(b, 0, 1)); place(g, b); }
}
function stepBoard(g, b, dt) {
  if (b.dead || S.done) return;
  b.msgT -= dt;
  if (b.phase === 'spawn') { spawn(g, b); return; }
  if (b.phase === 'play') {
    b.fall += dt / S.grav;
    while (b.fall >= 1) { b.fall -= 1; if (!move(b, 0, 1)) { b.fall = 0; break; } }
    if (!fitsAt(b, b.cur.x, b.cur.y + 1, b.cur.r)) { b.lock += dt; if (b.lock > 0.35) place(g, b); } else b.lock = 0;
    return;
  }
  b.t -= dt;
  if (b.t > 0) return;
  if (b.phase === 'drop') { b.anim = []; b.hide.clear(); resolve(g, b); return; }
  if (b.phase === 'pop') { for (const [x, y] of b.pop) b.grid[y][x] = 0; b.pop = []; startDrop(g, b, 'after'); return; }
  if (b.phase === 'garbage') { b.anim = []; b.hide.clear(); b.phase = 'spawn'; }
}
function place(g, b) {
  const c = b.cur; const [cx, cy] = childPos(c);
  if (c.y >= 0) b.grid[c.y][c.x] = c.a;
  if (cy >= 0) b.grid[cy][cx] = c.c;
  b.cur = null; b.chain = 0;
  if (b === S.me) g.sfx.tone(200, 0.05, 'sine', 0.06);
  startDrop(g, b);
}
function applyGravity(grid, anims) {
  let moved = 0;
  for (let x = 0; x < PY_W; x++) {
    let w = PY_H - 1;
    for (let y = PY_H - 1; y >= 0; y--) if (grid[y][x]) {
      if (y !== w) { grid[w][x] = grid[y][x]; grid[y][x] = 0; if (anims) anims.push({ x, from: y, to: w, c: grid[w][x] }); moved = Math.max(moved, w - y); }
      w--;
    }
  }
  return moved;
}
function startDrop(g, b) {
  b.anim = [];
  const m = applyGravity(b.grid, b.anim);
  b.hide = new Set(b.anim.map((a) => a.to * 10 + a.x));
  b.phase = 'drop'; b.t = m ? 0.05 + m * 0.035 : 0.01; b.tt = b.t;
}
function findGroups(grid) {
  const seen = U.grid(PY_W, PY_H, false), groups = [];
  for (let y = 1; y < PY_H; y++) for (let x = 0; x < PY_W; x++) {
    const v = grid[y][x]; if (!v || v === 6 || seen[y][x]) continue;
    const st = [[x, y]], grp = []; seen[y][x] = true;
    while (st.length) { const [px, py] = st.pop(); grp.push([px, py]); for (const [dx, dy] of PY_DIR) { const nx = px + dx, ny = py + dy; if (nx >= 0 && nx < PY_W && ny >= 1 && ny < PY_H && !seen[ny][nx] && grid[ny][nx] === v) { seen[ny][nx] = true; st.push([nx, ny]); } } }
    groups.push({ v, cells: grp });
  }
  return groups;
}
function chainStep(grid, chain) {
  const groups = findGroups(grid).filter((gr) => gr.cells.length >= 4);
  if (!groups.length) return null;
  const pop = [], colors = new Set(); let n = 0, gb = 0;
  for (const gr of groups) { n += gr.cells.length; colors.add(gr.v); gb += PY_GB[Math.min(11, gr.cells.length)]; for (const c of gr.cells) pop.push(c); }
  const extra = [];
  for (const [x, y] of pop) for (const [dx, dy] of PY_DIR) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < PY_W && ny >= 0 && ny < PY_H && grid[ny][nx] === 6) extra.push([nx, ny]); }
  const mult = Math.max(1, Math.min(999, PY_CP[Math.min(PY_CP.length - 1, chain - 1)] + PY_CB[colors.size] + gb));
  return { pop: pop.concat(extra), score: 10 * n * mult, n };
}
function resolve(g, b) {
  const res = chainStep(b.grid, b.chain + 1);
  if (res) {
    b.chain++; b.maxChain = Math.max(b.maxChain, b.chain);
    b.pop = res.pop; b.phase = 'pop'; b.t = 0.45;
    const ox = b === S.me ? 110 : 610;
    b.msg = `${b.chain} 연쇄!`; b.msgT = 1;
    if (b === S.me) {
      g.add(res.score, ox + 120, 300); g.sfx.tone(380 + b.chain * 90, 0.18, 'square', 0.07, 700 + b.chain * 120);
      if (b.chain >= 3) g.shake(3 + b.chain * 2, 0.3);
    } else g.sfx.tone(260 + b.chain * 50, 0.1, 'triangle', 0.04);
    for (const [x, y] of res.pop) g.burst(ox + x * PY_C + 20, 90 + (y - 1) * PY_C + 20, PY_COL[b.grid[y][x]] || '#fff', 6, 200, 0.5);
    // garbage
    const tot = res.score + b.leftover; let nuis = Math.floor(tot / 70); b.leftover = tot % 70;
    const cancel = Math.min(nuis, b.pending); b.pending -= cancel; nuis -= cancel;
    if (nuis > 0) {
      const o = b === S.me ? S.ai : S.me; o.pending += nuis;
      S.shots.push({ sx: ox + 120, sy: 300, tx: (b === S.me ? 610 : 110) + 120, ty: 100, t: 0, n: Math.min(30, nuis) });
    }
    return;
  }
  b.chain = 0;
  // fall garbage
  if (b.pending > 0) {
    const n = Math.min(30, b.pending); b.pending -= n;
    const cols = U.shuffle([0, 1, 2, 3, 4, 5]);
    for (let i = 0; i < n; i++) {
      const x = i < Math.floor(n / 6) * 6 ? i % 6 : cols[i % 6];
      let y = PY_H - 1; while (y >= 0 && b.grid[y][x]) y--;
      if (y >= 0) b.grid[y][x] = 6;
    }
    if (b === S.me) { g.sfx.hit(); g.shake(4 + n / 3, 0.3); }
    b.phase = 'garbage'; b.t = 0.35;
    return;
  }
  b.phase = 'spawn';
}
/* AI */
function simulate(grid) {
  let chain = 0, score = 0;
  for (;;) { applyGravity(grid); const r = chainStep(grid, chain + 1); if (!r) break; chain++; score += r.score; for (const [x, y] of r.pop) grid[y][x] = 0; }
  return { chain, score };
}
function potential(grid) {
  let s = 0;
  for (const gr of findGroups(grid)) { const l = gr.cells.length; s += l === 2 ? 1 : l === 3 ? 3 : 0; }
  let hpen = 0;
  for (let x = 0; x < PY_W; x++) { let h = 0; for (let y = 0; y < PY_H; y++) if (grid[y][x]) { h = PY_H - y; break; } hpen += h * h * (x === 2 ? 0.4 : 0.15); }
  return s - hpen * 0.2;
}
function aiPlan(b, st) {
  let best = null;
  const c = b.cur;
  let danger = 0; for (let x = 0; x < PY_W; x++) if (b.grid[3][x]) danger++;
  for (let r = 0; r < 4; r++) for (let x = 0; x < PY_W; x++) {
    const d = PY_DIR[r]; const cx = x + d[0];
    if (cx < 0 || cx >= PY_W) continue;
    if (!fitsAt(b, x, 1, r)) continue;
    const grid = b.grid.map((row) => row.slice());
    let y = 1; while (fitsAt({ grid }, x, y + 1, r)) y++;
    grid[y][x] = c.a; if (y + d[1] >= 0) grid[y + d[1]][cx] = c.c;
    const sim = simulate(grid);
    let sc = potential(grid);
    if (sim.chain) {
      if (sim.chain >= st.want || danger || b.pending > 6) sc += sim.score / 40 + sim.chain * 30;
      else sc -= 8;
    }
    if (grid[1][2]) sc -= 1000;
    sc += Math.random() * st.err * 20;
    if (!best || sc > best.sc) best = { x, r, sc };
  }
  return best || { x: c.x, r: c.r };
}
/* draw */
function puyo(g, x, y, v, s, t) {
  if (!v) return;
  const r = 18 * (s || 1);
  if (v === 6) { g.circle(x, y, r, '#cbd5e1'); g.circle(x - 5, y - 6, r * 0.3, '#fff'); g.text('•_•', x, y + 3, 10, '#475569'); return; }
  g.circle(x, y + 2, r, 'rgba(0,0,0,.25)');
  g.circle(x, y, r, PY_COL[v]);
  g.circle(x - r * 0.35, y - r * 0.4, r * 0.28, 'rgba(255,255,255,.55)');
  const blink = Math.sin(t * 2 + x * 0.1) > 0.97;
  g.circle(x - 6, y - 1, 4, '#fff'); g.circle(x + 6, y - 1, 4, '#fff');
  if (!blink) { g.circle(x - 6, y, 2, '#111'); g.circle(x + 6, y, 2, '#111'); }
}
function drawBoard(g, c, b, ox, oy, isAI) {
  const W = PY_W * PY_C, H = (PY_H - 1) * PY_C;
  g.rrect(ox - 8, oy - 8, W + 16, H + 16, 12, '#0f0a2e', isAI ? '#f472b6' : '#38bdf8', 4);
  g.ring(ox + 2 * PY_C + 20, oy + 20, 16, 'rgba(248,113,113,.5)', 2);
  g.line(ox + 2 * PY_C + 8, oy + 8, ox + 2 * PY_C + 32, oy + 32, 'rgba(248,113,113,.5)', 2);
  const popOn = b.phase === 'pop' && Math.floor(b.t * 16) % 2 === 0;
  const popSet = new Set(b.pop.map(([x, y]) => y * 10 + x));
  for (let y = 1; y < PY_H; y++) for (let x = 0; x < PY_W; x++) {
    const v = b.grid[y][x]; if (!v || b.hide.has(y * 10 + x)) continue;
    if (popSet.has(y * 10 + x)) { if (popOn) puyo(g, ox + x * PY_C + 20, oy + (y - 1) * PY_C + 20, v, 1.1, g.time); else g.circle(ox + x * PY_C + 20, oy + (y - 1) * PY_C + 20, 18, '#fff'); continue; }
    puyo(g, ox + x * PY_C + 20, oy + (y - 1) * PY_C + 20, v, 1, g.time);
  }
  if (b.phase === 'drop' && b.anim.length) {
    const k = 1 - Math.max(0, b.t) / b.tt;
    for (const a of b.anim) { const yy = U.lerp(a.from, a.to, k * k); if (yy >= 1) puyo(g, ox + a.x * PY_C + 20, oy + (yy - 1) * PY_C + 20, a.c, 1, g.time); }
  }
  if (b.cur && !b.dead) {
    const cu = b.cur, [cx, cy] = childPos(cu);
    // ghost
    let gy = cu.y; while (fitsAt(b, cu.x, gy + 1, cu.r)) gy++;
    const d = PY_DIR[cu.r];
    g.ring(ox + cu.x * PY_C + 20, oy + (gy - 1) * PY_C + 20, 8, PY_COL[cu.a], 2);
    g.ring(ox + (cu.x + d[0]) * PY_C + 20, oy + (gy + d[1] - 1) * PY_C + 20, 8, PY_COL[cu.c], 2);
    const fy = Math.min(b.fall, 0.99) * (fitsAt(b, cu.x, cu.y + 1, cu.r) ? 1 : 0);
    if (cu.y >= 1) { g.ring(ox + cu.x * PY_C + 20, oy + (cu.y - 1 + fy) * PY_C + 20, 20, '#fff', 2); puyo(g, ox + cu.x * PY_C + 20, oy + (cu.y - 1 + fy) * PY_C + 20, cu.a, 1, g.time); }
    if (cy >= 1) puyo(g, ox + cx * PY_C + 20, oy + (cy - 1 + fy) * PY_C + 20, cu.c, 1, g.time);
  }
  // next
  const nx = isAI ? ox - 50 : ox + W + 50;
  g.text('NEXT', nx, oy + 10, 13, '#c4b5fd');
  for (let k = 0; k < 2; k++) { const p = nextPair(b, k), s = k ? 0.7 : 1, yy = oy + 50 + k * 100; puyo(g, nx, yy + 36 * s, p[0], s, 0); puyo(g, nx, yy, p[1], s, 0); }
  // pending
  let p = b.pending, px = ox;
  const icons = [[720, '👑'], [360, '🌙'], [180, '⭐'], [30, '🪨'], [6, '⚪'], [1, '·']];
  for (const [n, e] of icons) while (p >= n && px < ox + W) { g.emoji(e, px + 14, oy - 26, n >= 30 ? 26 : n >= 6 ? 22 : 14); px += n >= 6 ? 30 : 14; p -= n; }
  if (b.msgT > 0) g.text(b.msg, ox + W / 2, oy + H / 2 - 60, 36, '#fde047');
  g.text(isAI ? PY_AI[S.stage].name : '나', ox + W / 2, oy + H + 26, 16, isAI ? '#f9a8d4' : '#7dd3fc');
  if (b.dead) { g.rect(ox, oy, W, H, 'rgba(0,0,0,.5)'); g.text(isAI ? 'K.O.!' : '패배', ox + W / 2, oy + H / 2, 44, '#f87171'); }
}
