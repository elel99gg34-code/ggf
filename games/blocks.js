let S;
const BW = 10, BH = 20, CS = 30, OX = 170, OY = 20;
const SHAPES = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const COL = { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#22c55e', Z: '#ef4444', J: '#3b82f6', L: '#f97316' };
function cellsO(p) {
  const size = p.k === 'I' ? 4 : 3;
  return SHAPES[p.k].map(([x, y]) => {
    if (p.k !== 'O') for (let i = 0; i < p.r; i++) [x, y] = [size - 1 - y, x];
    return [x + p.x, y + p.y];
  });
}
function fits(p) { return cellsO(p).every(([x, y]) => x >= 0 && x < BW && y < BH && (y < 0 || !S.board[y][x])); }
function bag() { return U.shuffle(Object.keys(SHAPES)); }
function nextPiece() {
  while (S.queue.length < 7) S.queue.push(...bag());
  const k = S.queue.shift();
  return { k, r: 0, x: 3, y: k === 'I' ? -1 : 0 };
}
GAME({
  title: '블록 낙하', w: 640, h: 640, bg: '#0a0c1c', controls: 'dpad+ab', aLabel: '⤓', bLabel: 'H',
  help: '←→ 이동 · ↓ 소프트드롭 · Space 하드드롭\n↑/X 회전 · Z 반대 회전 · C/Shift 홀드\n여러 줄 동시 삭제와 콤보로 고득점!\n10줄마다 레벨업 (속도 증가)',
  init(g) {
    S = { board: U.grid(BW, BH, null), queue: [], hold: null, canHold: true, lines: 0, level: 1, t: 0, lock: 0, das: 0, clearing: null, combo: -1, b2b: false, moves: 0 };
    S.cur = nextPiece();
  },
  update(g, dt) {
    if (S.clearing) {
      S.clearing.t -= dt;
      if (S.clearing.t <= 0) {
        for (const y of S.clearing.rows) { S.board.splice(y, 1); S.board.unshift(Array(BW).fill(null)); }
        S.clearing = null;
        spawn(g);
      }
      return;
    }
    const p = S.cur;
    const tryMove = (dx, dy, dr = 0) => {
      const n = { ...p, x: p.x + dx, y: p.y + dy, r: (p.r + dr + 4) % 4 };
      if (fits(n)) { Object.assign(p, n); return true; }
      return false;
    };
    const rot = (d) => {
      for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, 1]]) if (tryMove(kx, ky, d)) { g.sfx.move(); S.lock = Math.min(S.lock, 0.3); S.lastRot = true; return; }
    };
    if (g.pressed('left')) { tryMove(-1, 0) && g.sfx.move(); S.das = -0.17; S.lastRot = false; }
    if (g.pressed('right')) { tryMove(1, 0) && g.sfx.move(); S.das = -0.17; S.lastRot = false; }
    if (g.left || g.right) { S.das += dt; while (S.das > 0.045) { S.das -= 0.045; tryMove(g.left ? -1 : 1, 0); } }
    if (g.pressed('up') || g.keyp('KeyX')) rot(1);
    if (g.keyp('KeyZ')) rot(-1);
    if (g.keyp('KeyC') || g.keyp('ShiftLeft') || g.keyp('ShiftRight') || (g.pressed('b') && !g.keyp('KeyX'))) {
      if (S.canHold) {
        const k = p.k;
        if (S.hold) { S.cur = { k: S.hold, r: 0, x: 3, y: S.hold === 'I' ? -1 : 0 }; } else S.cur = nextPiece();
        S.hold = k; S.canHold = false; g.sfx.click();
      }
      return;
    }
    if (g.pressed('a') && !g.keyp('KeyZ')) {
      let n = 0;
      while (tryMove(0, 1)) n++;
      g.add(n * 2); g.shake(4, 0.1); g.sfx.drop();
      return lockPiece(g);
    }
    const grav = Math.max(0.03, 0.8 * Math.pow(0.82, S.level - 1));
    S.t += dt * (g.down ? 12 : 1);
    if (g.down && g.frame % 3 === 0) {}
    while (S.t >= grav) {
      S.t -= grav;
      if (tryMove(0, 1)) { if (g.down) g.add(1); S.lock = 0; S.lastRot = false; }
    }
    const grounded = !fits({ ...p, y: p.y + 1 });
    if (grounded) { S.lock += dt; if (S.lock > 0.5) lockPiece(g); }
    g.info = `Lv ${S.level} · ${S.lines}줄`;
  },
  draw(g, c) {
    g.rrect(OX - 6, OY - 6, BW * CS + 12, BH * CS + 12, 8, '#141838', '#3a4180', 3);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      g.rect(OX + x * CS, OY + y * CS, CS - 1, CS - 1, '#0e1130');
      const v = S.board[y][x];
      if (v) block(g, OX + x * CS, OY + y * CS, COL[v], S.clearing && S.clearing.rows.includes(y) ? Math.sin(g.time * 40) * 0.5 + 0.5 : 1);
    }
    if (!S.clearing && S.cur) {
      const gh = { ...S.cur };
      while (fits({ ...gh, y: gh.y + 1 })) gh.y++;
      cellsO(gh).forEach(([x, y]) => y >= 0 && g.rrect(OX + x * CS + 2, OY + y * CS + 2, CS - 5, CS - 5, 4, null, COL[S.cur.k], 2));
      cellsO(S.cur).forEach(([x, y]) => y >= 0 && block(g, OX + x * CS, OY + y * CS, COL[S.cur.k], 1));
    }
    g.text('HOLD', 80, 40, 20, '#9aa3e0');
    g.rrect(20, 60, 120, 90, 10, '#141838');
    if (S.hold) mini(g, S.hold, 80, 105, S.canHold ? 1 : 0.35);
    g.text('NEXT', OX + BW * CS + 70, 40, 20, '#9aa3e0');
    g.rrect(OX + BW * CS + 15, 60, 110, 290, 10, '#141838');
    S.queue.slice(0, 4).forEach((k, i) => mini(g, k, OX + BW * CS + 70, 100 + i * 70, 1));
    const sx = 80;
    [['점수', g.score], ['레벨', S.level], ['라인', S.lines]].forEach(([l, v], i) => {
      g.text(l, sx, 220 + i * 80, 16, '#9aa3e0');
      g.text(Number(v).toLocaleString(), sx, 248 + i * 80, 26, '#fff');
    });
    if (S.msg && S.msg.t > 0) {
      S.msg.t -= 1 / 60;
      g.text(S.msg.s, OX + BW * CS / 2, OY + 200, 34, `rgba(255,230,120,${Math.min(1, S.msg.t)})`);
    }
  },
});
function block(g, x, y, col, a) {
  g.ctx.globalAlpha = a;
  g.rrect(x + 1, y + 1, CS - 3, CS - 3, 5, col);
  g.rect(x + 4, y + 4, CS - 12, 4, 'rgba(255,255,255,.35)');
  g.ctx.globalAlpha = 1;
}
function mini(g, k, cx, cy, a) {
  const cs = 18, sh = SHAPES[k];
  const minx = Math.min(...sh.map((s) => s[0])), maxx = Math.max(...sh.map((s) => s[0])), miny = Math.min(...sh.map((s) => s[1])), maxy = Math.max(...sh.map((s) => s[1]));
  const ox = cx - ((maxx - minx + 1) * cs) / 2, oy = cy - ((maxy - miny + 1) * cs) / 2;
  g.ctx.globalAlpha = a;
  sh.forEach(([x, y]) => g.rrect(ox + (x - minx) * cs, oy + (y - miny) * cs, cs - 2, cs - 2, 3, COL[k]));
  g.ctx.globalAlpha = 1;
}
function isTSpin() {
  const p = S.cur;
  if (p.k !== 'T' || !S.lastRot) return false;
  let n = 0;
  for (const [dx, dy] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
    const x = p.x + dx, y = p.y + dy;
    if (x < 0 || x >= BW || y >= BH || (y >= 0 && S.board[y][x])) n++;
  }
  return n >= 3;
}
function lockPiece(g) {
  const tspin = isTSpin();
  let top = false;
  cellsO(S.cur).forEach(([x, y]) => { if (y < 0) top = true; else S.board[y][x] = S.cur.k; });
  if (top) { g.shake(12); return g.over(`${S.lines}줄 · 레벨 ${S.level}`); }
  const rows = [];
  for (let y = 0; y < BH; y++) if (S.board[y].every((v) => v)) rows.push(y);
  if (rows.length) {
    S.combo++;
    const base = tspin ? [400, 800, 1200, 1600][rows.length - 1] : [100, 300, 500, 800][rows.length - 1];
    const hard = tspin || rows.length === 4;
    let pts = base * S.level * (hard && S.b2b ? 1.5 : 1) + 50 * S.combo * S.level;
    S.b2b = hard;
    g.add(Math.round(pts));
    S.lines += rows.length;
    const nl = Math.floor(S.lines / 10) + 1;
    if (nl > S.level) { S.level = nl; g.sfx.win(); }
    const name = (tspin ? 'T-SPIN ' : '') + ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'][rows.length];
    S.msg = { s: name + (S.combo > 0 ? ` ×${S.combo + 1}` : ''), t: 1.4 };
    rows.forEach((y) => { for (let x = 0; x < BW; x++) g.burst(OX + x * CS + 15, OY + y * CS + 15, COL[S.board[y][x]], 4, 200); });
    rows.length >= 4 ? (g.sfx.power(), g.shake(10)) : g.sfx.coin();
    S.clearing = { rows, t: 0.25 };
    if (S.board.every((r, y) => rows.includes(y) || r.every((v) => !v))) { g.add(2000 * S.level); S.msg.s = 'PERFECT CLEAR!'; }
  } else { S.combo = -1; if (tspin) { g.add(100 * S.level); S.msg = { s: 'T-SPIN', t: 1 }; } spawn(g); }
}
function spawn(g) {
  S.cur = nextPiece();
  S.canHold = true; S.lock = 0; S.t = 0; S.lastRot = false;
  if (!fits(S.cur)) { g.shake(12); g.over(`${S.lines}줄 · 레벨 ${S.level}`); }
}
