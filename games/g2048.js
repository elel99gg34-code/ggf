let S;
const N = 4, TS = 120, GAP = 14, OX = 34, OY = 150;
const TC = { 2: ['#eee4da', '#776e65'], 4: ['#ede0c8', '#776e65'], 8: ['#f2b179', '#fff'], 16: ['#f59563', '#fff'], 32: ['#f67c5f', '#fff'], 64: ['#f65e3b', '#fff'], 128: ['#edcf72', '#fff'], 256: ['#edcc61', '#fff'], 512: ['#edc850', '#fff'], 1024: ['#edc53f', '#fff'], 2048: ['#edc22e', '#fff'] };
GAME({
  title: '2048', w: 600, h: 720, bg: '#faf8ef', controls: 'dpad', noRKey: false,
  help: '방향키/WASD/스와이프로 모든 타일을 밀기\n같은 숫자가 부딪히면 합쳐져요!\nU 또는 ↶ 버튼 = 되돌리기 (3회)\n2048을 만들면 승리, 계속 진행도 가능',
  init(g) { S = { grid: U.grid(N, N, 0), tiles: [], id: 0, anim: 0, undo: [], undos: 3, won: false, best: 0 }; add(); add(); },
  update(g, dt) {
    S.anim = Math.max(0, S.anim - dt);
    for (const t of S.tiles) { t.dx += (t.x - t.dx) * Math.min(1, dt * 18); t.dy += (t.y - t.dy) * Math.min(1, dt * 18); t.pop = Math.max(0, t.pop - dt * 4); t.born = Math.min(1, t.born + dt * 6); }
    S.tiles = S.tiles.filter((t) => !t.dead || Math.abs(t.dx - t.x) + Math.abs(t.dy - t.y) > 0.05);
    if (g.keyp('KeyU') || g.clickIn(470, 70, 96, 50)) doUndo(g);
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) { move(g, ...D[k]); break; }
  },
  draw(g, c) {
    g.text('2048', 34, 60, 64, '#776e65', 'left');
    g.rrect(300, 70, 160, 50, 8, '#bbada0'); g.text(`최대 ${S.best}`, 380, 95, 18, '#fff');
    g.button(470, 70, 96, 50, `↶ ${S.undos}`, S.undos ? '#8f7a66' : '#cdc1b4', 20);
    g.rrect(OX - GAP, OY - GAP, N * TS + (N + 1) * GAP - GAP + GAP, N * TS + (N + 1) * GAP, 12, '#bbada0');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g.rrect(OX + x * (TS + GAP), OY + y * (TS + GAP), TS, TS, 8, 'rgba(238,228,218,.35)');
    const list = [...S.tiles].sort((a, b) => (a.dead ? 0 : 1) - (b.dead ? 0 : 1));
    for (const t of list) {
      const [bg, fg] = TC[t.v] || ['#3c3a32', '#fff'];
      const s = (t.born < 1 ? t.born : 1) * (1 + Math.sin(t.pop * Math.PI) * 0.12);
      const cx = OX + t.dx * (TS + GAP) + TS / 2, cy = OY + t.dy * (TS + GAP) + TS / 2, w = TS * s;
      g.rrect(cx - w / 2, cy - w / 2, w, w, 8, bg);
      if (t.v >= 128) { c.shadowBlur = 20; c.shadowColor = bg; g.rrect(cx - w / 2, cy - w / 2, w, w, 8, bg); c.shadowBlur = 0; }
      g.text(t.v, cx, cy + 2, (t.v < 100 ? 52 : t.v < 1000 ? 44 : 34) * s, fg);
    }
    g.text('방향키 / 스와이프', 300, 700, 16, '#bbada0');
  },
});
function add() {
  const free = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!S.grid[y][x]) free.push([x, y]);
  if (!free.length) return;
  const [x, y] = U.choice(free), v = Math.random() < 0.9 ? 2 : 4;
  const t = { id: S.id++, v, x, y, dx: x, dy: y, pop: 0, born: 0 };
  S.grid[y][x] = t; S.tiles.push(t);
}
function snapshot() { return { g: S.grid.map((r) => r.map((t) => (t ? t.v : 0))) }; }
function doUndo(g) {
  if (!S.undos || !S.undo.length) return g.sfx.hit();
  const s = S.undo.pop(); S.undos--; g.score = s.score;
  S.tiles = []; S.grid = U.grid(N, N, 0);
  s.g.forEach((r, y) => r.forEach((v, x) => { if (v) { const t = { id: S.id++, v, x, y, dx: x, dy: y, pop: 0, born: 1 }; S.grid[y][x] = t; S.tiles.push(t); } }));
  g.sfx.click();
}
function move(g, dx, dy) {
  const snap = { ...snapshot(), score: g.score };
  let moved = false, gained = 0;
  const xs = [...Array(N).keys()], ys = [...Array(N).keys()];
  if (dx > 0) xs.reverse(); if (dy > 0) ys.reverse();
  const merged = new Set();
  for (const y of ys) for (const x of xs) {
    const t = S.grid[y][x]; if (!t) continue;
    let nx = x, ny = y;
    while (true) {
      const tx = nx + dx, ty = ny + dy;
      if (tx < 0 || ty < 0 || tx >= N || ty >= N) break;
      const o = S.grid[ty][tx];
      if (!o) { nx = tx; ny = ty; continue; }
      if (o.v === t.v && !merged.has(o)) { S.grid[y][x] = null; t.x = tx; t.y = ty; t.dead = true; o.v *= 2; o.pop = 1; merged.add(o); gained += o.v; moved = true; if (o.v > S.best) S.best = o.v; if (o.v === 2048 && !S.won) { S.won = true; g.sfx.win(); g.float(300, 400, '🎉 2048 달성!', '#edc22e', 44); g.add(5000); } }
      break;
    }
    if (!t.dead && (nx !== x || ny !== y)) { S.grid[y][x] = null; S.grid[ny][nx] = t; t.x = nx; t.y = ny; moved = true; }
  }
  if (!moved) return;
  S.undo.push(snap); if (S.undo.length > 10) S.undo.shift();
  g.add(gained);
  gained ? g.sfx.tone(300 + Math.log2(gained) * 40, 0.08, 'triangle', 0.06) : g.sfx.move();
  add();
  if (!canMove()) g.later(() => g.over(`최대 타일 ${S.best}`), 0.5);
}
function canMove() {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = S.grid[y][x]; if (!t) return true; if (x < N - 1 && S.grid[y][x + 1] && S.grid[y][x + 1].v === t.v) return true; if (y < N - 1 && S.grid[y + 1][x] && S.grid[y + 1][x].v === t.v) return true; }
  return false;
}
