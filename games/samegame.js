let S;
const SG_COLS = 16, SG_ROWS = 11, SG_CELL = 50, SG_X = 50, SG_Y = 100;
const SG_PAL = [
  ['#ef4444', '#fca5a5', '#991b1b', '🍓'],
  ['#3b82f6', '#93c5fd', '#1e3a8a', '💧'],
  ['#22c55e', '#86efac', '#14532d', '🍀'],
  ['#eab308', '#fde68a', '#854d0e', '⭐'],
  ['#a855f7', '#d8b4fe', '#581c87', '🍇'],
  ['#f97316', '#fdba74', '#9a3412', '🍊'],
];
GAME({
  title: '같은 색 지우기', w: 900, h: 680, bg: '#0f172a', controls: 'dpad+ab', aLabel: '지우기', bLabel: '되돌리기',
  help: '같은 색 블록이 2개 이상 이어진 덩어리를 클릭하면 한 번에 사라져요\n많이 모아서 지울수록 점수가 폭증! (n-2)² × 10\n블록은 아래로 떨어지고, 빈 열은 왼쪽으로 당겨져요\n스테이지 목표 점수를 넘기고 더 지울 수 없으면 다음 스테이지\n전부 지우면 대박 보너스 · ←→↑↓ 커서 이동, Space 지우기, X 되돌리기(3회)',
  init(g) {
    S = { stage: 1, total: 0, undo: 3, cur: { x: 0, y: 0 }, hover: null, msg: '', msgT: 0, endT: 0, combo: 0 };
    g.score = 0;
    newStage(g);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    // 블록 애니메이션
    for (let x = 0; x < S.grid.length; x++) {
      const col = S.grid[x];
      for (let y = 0; y < col.length; y++) {
        const b = col[y];
        b.px += (x - b.px) * Math.min(1, dt * 14);
        b.vy += 40 * dt; b.py -= b.vy * dt;
        if (b.py <= y) { b.py = y; b.vy = 0; }
        b.pop = Math.max(0, b.pop - dt * 4);
      }
    }
    if (S.endT > 0) {
      S.endT -= dt;
      if (S.endT <= 0) finishStage(g);
      return;
    }
    // 마우스 호버
    if (g.mouse.moved) {
      const c = cellAt(g.mouse.x, g.mouse.y);
      if (c) { S.cur.x = c.x; S.cur.y = c.y; }
    }
    if (g.pressed('left')) S.cur.x = Math.max(0, S.cur.x - 1);
    if (g.pressed('right')) S.cur.x = Math.min(SG_COLS - 1, S.cur.x + 1);
    if (g.pressed('up')) S.cur.y = Math.min(SG_ROWS - 1, S.cur.y + 1);
    if (g.pressed('down')) S.cur.y = Math.max(0, S.cur.y - 1);
    S.hover = groupAt(S.cur.x, S.cur.y);
    if (!S.stuck && S.msgT > 50) S.msgT = 0;
    if (S.hover && S.hover.length < 2) S.hover = null;
    if (g.pressed('b') || g.clickIn(700, 25, 150, 46)) { doUndo(g); return; }
    let act = g.pressed('a');
    if (g.mouse.clicked) {
      const c = cellAt(g.mouse.x, g.mouse.y);
      if (c) { S.cur.x = c.x; S.cur.y = c.y; S.hover = groupAt(c.x, c.y); act = true; }
    }
    if (S.stuck && act && !hasMoves()) { S.stuck = false; return g.over(`스테이지 ${S.stage}: 목표 ${S.target}점 미달 (${S.stageScore}점)`); }
    if (act && S.hover && S.hover.length >= 2) removeGroup(g, S.hover);
    else if (act && g.mouse.clicked && cellAt(g.mouse.x, g.mouse.y)) { g.sfx.beep(180, 0.05); }
    g.info = `스테이지 ${S.stage} · 목표 ${S.stageScore}/${S.target}`;
  },
  draw(g, c) {
    // 상단 HUD
    g.rrect(20, 18, 860, 62, 14, '#1e293b');
    g.text(`STAGE ${S.stage}`, 40, 38, 22, '#facc15', 'left');
    g.text(`색 ${S.colors}가지`, 40, 62, 14, '#94a3b8', 'left');
    const pr = Math.min(1, S.stageScore / S.target);
    g.rrect(180, 34, 360, 22, 11, '#0f172a');
    g.rrect(180, 34, Math.max(22, 360 * pr), 22, 11, pr >= 1 ? '#22c55e' : '#38bdf8');
    g.text(`${S.stageScore} / ${S.target}`, 360, 46, 14, '#fff');
    g.text(pr >= 1 ? '목표 달성! 계속 지워서 보너스를!' : '목표 점수', 360, 68, 12, pr >= 1 ? '#86efac' : '#94a3b8');
    g.text(`남은 블록 ${S.left}`, 620, 46, 16, '#e2e8f0');
    g.button(700, 25, 150, 46, `↶ 되돌리기 ${S.undo}`, S.undo > 0 && S.hist.length ? '#475569' : '#334155', 16);
    // 보드
    g.rrect(SG_X - 10, SG_Y - 10, SG_COLS * SG_CELL + 20, SG_ROWS * SG_CELL + 20, 14, '#020617', '#334155', 2);
    const hs = new Set(S.hover ? S.hover.map((p) => p.x * 100 + p.y) : []);
    for (let x = 0; x < S.grid.length; x++) {
      const col = S.grid[x];
      for (let y = 0; y < col.length; y++) {
        const b = col[y], p = SG_PAL[b.c];
        const px = SG_X + b.px * SG_CELL, py = SG_Y + (SG_ROWS - 1 - b.py) * SG_CELL;
        const hl = hs.has(x * 100 + y);
        const s = hl ? 1 + Math.sin(g.time * 12) * 0.04 : 1, ins = 3 + (1 - s) * 20;
        g.rrect(px + ins, py + ins, SG_CELL - ins * 2, SG_CELL - ins * 2, 10, hl ? p[1] : p[0], hl ? '#fff' : p[2], hl ? 3 : 2);
        g.rrect(px + 8, py + 7, SG_CELL - 16, 10, 5, 'rgba(255,255,255,.28)');
        g.emoji(p[3], px + SG_CELL / 2, py + SG_CELL / 2 + 3, 22);
      }
    }
    // 커서
    const cx = SG_X + S.cur.x * SG_CELL, cy = SG_Y + (SG_ROWS - 1 - S.cur.y) * SG_CELL;
    g.rrect(cx + 1, cy + 1, SG_CELL - 2, SG_CELL - 2, 10, null, 'rgba(255,255,255,.7)', 2);
    if (S.hover) {
      const n = S.hover.length, pts = pointsFor(n);
      const tx = U.clamp(g.mouse.x || cx, 120, 780);
      g.rrect(tx - 80, 655 - 18, 160, 32, 10, 'rgba(0,0,0,.7)');
      g.text(`${n}개 → +${pts}`, tx, 655, 16, '#fde047');
    }
    if (S.msgT > 0) {
      c.globalAlpha = Math.min(1, S.msgT);
      g.rrect(110, 300, 680, 80, 18, 'rgba(15,23,42,.9)', '#facc15', 3);
      g.text(S.msg, 450, 340, S.msg.length > 22 ? 20 : 28, '#facc15');
      c.globalAlpha = 1;
    }
  },
});

function newStage(g) {
  S.colors = Math.min(6, 3 + Math.floor((S.stage + 1) / 2));
  S.target = 500 + S.stage * 300;
  S.stageScore = 0;
  S.hist = [];
  S.grid = [];
  for (let x = 0; x < SG_COLS; x++) {
    const col = [];
    for (let y = 0; y < SG_ROWS; y++) col.push({ c: U.randi(0, S.colors - 1), px: x, py: y + SG_ROWS + x * 0.6 + y * 0.3, vy: 0, pop: 0 });
    S.grid.push(col);
  }
  // 몇 개 블록은 이웃 색 복사해 덩어리를 키움(재미)
  for (let k = 0; k < 30; k++) {
    const x = U.randi(1, SG_COLS - 1), y = U.randi(0, SG_ROWS - 1);
    S.grid[x][y].c = S.grid[x - 1][y].c;
  }
  S.left = SG_COLS * SG_ROWS;
  S.msg = `STAGE ${S.stage}`; S.msgT = 1.6;
  S.undo = Math.max(S.undo, 1);
}
function cellAt(mx, my) {
  const x = Math.floor((mx - SG_X) / SG_CELL), r = Math.floor((my - SG_Y) / SG_CELL);
  if (x < 0 || x >= SG_COLS || r < 0 || r >= SG_ROWS) return null;
  return { x, y: SG_ROWS - 1 - r };
}
function groupAt(x, y) {
  const col = S.grid[x];
  if (!col || !col[y]) return null;
  const c = col[y].c, seen = new Set([x * 100 + y]), out = [], st = [[x, y]];
  while (st.length) {
    const [a, b] = st.pop();
    out.push({ x: a, y: b });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = a + dx, ny = b + dy, k = nx * 100 + ny;
      if (seen.has(k) || !S.grid[nx] || !S.grid[nx][ny] || S.grid[nx][ny].c !== c) continue;
      seen.add(k); st.push([nx, ny]);
    }
  }
  return out;
}
function pointsFor(n) { return Math.max(0, (n - 2) * (n - 2)) * 10 + n * 5; }
function snapshot() { return { grid: S.grid.map((col) => col.map((b) => b.c)), ss: S.stageScore, score: S.scoreNow, left: S.left }; }
function removeGroup(g, grp) {
  S.scoreNow = g.score;
  S.hist.push(snapshot());
  if (S.hist.length > 20) S.hist.shift();
  const pts = pointsFor(grp.length), col0 = S.grid[grp[0].x][grp[0].y].c, p = SG_PAL[col0];
  let sx = 0, sy = 0;
  for (const q of grp) {
    const b = S.grid[q.x][q.y];
    const px = SG_X + q.x * SG_CELL + SG_CELL / 2, py = SG_Y + (SG_ROWS - 1 - q.y) * SG_CELL + SG_CELL / 2;
    sx += px; sy += py;
    g.burst(px, py, [p[0], p[1], '#fff'], 5, 160, 0.5, 4);
    b.dead = true;
  }
  sx /= grp.length; sy /= grp.length;
  for (let x = 0; x < S.grid.length; x++) S.grid[x] = S.grid[x].filter((b) => !b.dead);
  S.grid = S.grid.filter((col) => col.length);
  while (S.grid.length < SG_COLS) S.grid.push([]);
  S.left -= grp.length;
  S.stageScore += pts;
  g.add(pts, sx, sy);
  const n = grp.length;
  g.sfx.tone(300 + Math.min(n, 30) * 25, 0.12, 'triangle', 0.1);
  if (n >= 8) { g.shake(Math.min(12, n / 2), 0.3); g.sfx.pop(); }
  if (n >= 15) { g.float(450, 300, n >= 25 ? '엄청난 연쇄!!' : '대량 제거!', '#fde047', 40); g.sfx.power(); }
  if (!hasMoves()) S.endT = 0.9;
}
function hasMoves() {
  for (let x = 0; x < S.grid.length; x++) for (let y = 0; y < S.grid[x].length; y++) {
    const c = S.grid[x][y].c;
    if (S.grid[x][y + 1] && S.grid[x][y + 1].c === c) return true;
    if (S.grid[x + 1] && S.grid[x + 1][y] && S.grid[x + 1][y].c === c) return true;
  }
  return false;
}
function doUndo(g) {
  if (S.undo <= 0 || !S.hist.length) { g.sfx.beep(150, 0.08); return; }
  const h = S.hist.pop();
  S.undo--;
  S.grid = h.grid.map((col, x) => col.map((c, y) => ({ c, px: x, py: y, vy: 0, pop: 0 })));
  S.stageScore = h.ss; g.score = h.score; S.left = h.left; S.endT = 0; S.stuck = false;
  g.sfx.tone(500, 0.1, 'sine', 0.08, 300);
}
function finishStage(g) {
  let bonus = 0;
  if (S.left === 0) { bonus = 1000 * S.stage; S.msg = `완벽 클리어! +${bonus}`; g.sfx.win(); g.burst(450, 340, ['#facc15', '#f472b6', '#38bdf8', '#fff'], 80, 500, 1.4, 5); g.shake(10); }
  else if (S.left < 20) { bonus = (20 - S.left) * 40; S.msg = `잔여 보너스 +${bonus}`; }
  if (bonus) { g.add(bonus); S.stageScore += bonus; }
  if (S.stageScore >= S.target) {
    S.stage++;
    S.undo = Math.min(5, S.undo + 1);
    g.sfx.coin();
    const m = S.msg;
    newStage(g);
    S.msg = (bonus ? m + ' · ' : '') + `STAGE ${S.stage}`; S.msgT = 2;
  } else {
    if (S.undo > 0 && S.hist.length) { S.msg = '더 지울 수 없어요! X 되돌리기 / 클릭하면 종료'; S.msgT = 99; S.endT = 0; S.stuck = true; return; }
    g.over(`스테이지 ${S.stage}: 목표 ${S.target}점 미달 (${S.stageScore}점)`);
  }
}
