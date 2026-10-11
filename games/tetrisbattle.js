'use strict';
let S;
const TB_W = 10, TB_H = 20, TB_C = 26;
const TB_COL = { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#22c55e', Z: '#ef4444', J: '#3b82f6', L: '#f97316', G: '#64748b' };
const TB_SH = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const TB_KICK = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0], [0, 1]];
const TB_STAGES = [
  { name: '루키 봇', step: 0.32, think: 0.5, grav: 0.8, err: 0.25 },
  { name: '견습 봇', step: 0.22, think: 0.35, grav: 0.7, err: 0.15 },
  { name: '숙련 봇', step: 0.15, think: 0.25, grav: 0.6, err: 0.08 },
  { name: '고수 봇', step: 0.1, think: 0.16, grav: 0.5, err: 0.04 },
  { name: '마스터 봇', step: 0.065, think: 0.1, grav: 0.4, err: 0.0 },
  { name: '챔피언 봇', step: 0.045, think: 0.06, grav: 0.32, err: 0.0 },
];
const TB_ATK = [0, 0, 1, 2, 4];
GAME({
  title: '블록 배틀', w: 960, h: 640, bg: '#0f172a', controls: 'dpad+ab', aLabel: '⤓', bLabel: '홀드',
  help: '←→ 이동 · ↓ 소프트드롭 · ↑/X 회전 · Q 반대회전\nSpace 하드드롭 · Shift/C 홀드\n2줄=1 · 3줄=2 · 4줄=4 쓰레기줄 공격 (+콤보, 연속 테트리스 보너스)\n줄을 지우면 들어올 쓰레기줄을 상쇄! 6단계 AI를 모두 이겨라',
  init(g) { S = { stage: 0, wins: 0, totalLines: 0 }; startMatch(g); },
  update(g, dt) {
    if (S.pause > 0) { S.pause -= dt; if (S.pause <= 0 && S.after) { const f = S.after; S.after = null; f(); } return; }
    playerInput(g, dt);
    stepBoard(g, S.me, dt, false);
    if (S.done) return;
    aiUpdate(g, dt);
    stepBoard(g, S.ai, dt, true);
    for (const b of [S.me, S.ai]) { b.flash = Math.max(0, b.flash - dt); b.msgT -= dt; }
    S.time += dt;
    for (const a of S.atk) { a.t += dt * 1.6; const k = U.clamp(a.t, 0, 1); a.x = U.lerp(a.sx, a.tx, k); a.y = U.lerp(a.sy, a.ty, k) - Math.sin(k * Math.PI) * 120; }
    S.atk = S.atk.filter((a) => a.t < 1);
    // speed up over time
    S.grav = Math.max(0.08, TB_STAGES[S.stage].grav - S.time * 0.004);
    g.info = `${S.stage + 1}단계 · ${TB_STAGES[S.stage].name}`;
  },
  draw(g, c) {
    drawBoard(g, c, S.me, 70, 70, '나', false);
    drawBoard(g, c, S.ai, 630, 70, TB_STAGES[S.stage].name, true);
    // center
    g.text(`STAGE ${S.stage + 1}/6`, 480, 60, 22, '#fde047');
    g.text('VS', 480, 300, 48, '#f472b6');
    g.text(`줄 ${S.me.lines}`, 480, 360, 16, '#cbd5e1');
    g.text(`보낸 공격 ${S.me.sent}`, 480, 385, 16, '#cbd5e1');
    g.text(`AI 공격 ${S.ai.sent}`, 480, 410, 16, '#94a3b8');
    g.text(`시간 ${U.fmtTime(S.time)}`, 480, 440, 14, '#94a3b8');
    for (const a of S.atk) { g.circle(a.x, a.y, 7, a.c); }
    if (S.banner) { g.rrect(250, 260, 460, 110, 16, 'rgba(2,6,23,.9)', '#fde047', 3); g.text(S.banner, 480, 300, 34, '#fde047'); g.text(S.banner2 || '', 480, 340, 16, '#e2e8f0'); }
  },
});
function newBoard() {
  return { grid: Array.from({ length: TB_H + 2 }, () => Array(TB_W).fill(null)), bag: [], next: [], hold: null, canHold: true, cur: null, fall: 0, lock: 0, lockMoves: 0, pending: [], combo: -1, b2b: false, lines: 0, sent: 0, dead: false, flash: 0, msg: '', msgT: 0, plan: null, think: 0, act: 0 };
}
function startMatch(g) {
  S.me = newBoard(); S.ai = newBoard(); S.time = 0; S.atk = []; S.banner = ''; S.pause = 0; S.done = false; S.das = 0; S.arr = 0; S.dasDir = 0;
  S.seedBag = [];
  for (const b of [S.me, S.ai]) { fillNext(b); spawn(g, b); }
  S.grav = TB_STAGES[S.stage].grav;
  S.banner = `STAGE ${S.stage + 1}`; S.banner2 = `VS ${TB_STAGES[S.stage].name}`; S.pause = 1.4; S.after = () => { S.banner = ''; };
}
function fillNext(b) {
  while (b.next.length < 6) {
    if (!b.bag.length) b.bag = U.shuffle(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
    b.next.push(b.bag.pop());
  }
}
function cellsOf(t, r) {
  if (t === 'O') r = 0;
  const sh = TB_SH[t], n = t === 'I' ? 4 : t === 'O' ? 4 : 3;
  return sh.map(([x, y]) => {
    let a = x, bb = y;
    for (let i = 0; i < r; i++) { const nx = n - 1 - bb, ny = a; a = nx; bb = ny; }
    return [a, bb];
  });
}
function fits(b, t, r, px, py) {
  for (const [x, y] of cellsOf(t, r)) {
    const gx = px + x, gy = py + y;
    if (gx < 0 || gx >= TB_W || gy >= TB_H + 2) return false;
    if (gy >= 0 && b.grid[gy][gx]) return false;
  }
  return true;
}
function spawn(g, b, t) {
  if (!t) { t = b.next.shift(); fillNext(b); }
  b.cur = { t, r: 0, x: 3, y: 1 };
  b.fall = 0; b.lock = 0; b.lockMoves = 0; b.plan = null;
  if (!fits(b, t, 0, 3, 1)) { b.cur.y = 0; if (!fits(b, t, 0, 3, 0)) lose(g, b); }
}
function lose(g, b) {
  b.dead = true; S.done = true;
  g.shake(12, 0.5);
  if (b === S.me) {
    g.sfx.lose();
    S.banner = '패배…'; S.banner2 = `${TB_STAGES[S.stage].name}에게 졌어요`; S.pause = 2;
    S.after = () => g.over(`${S.stage + 1}단계에서 패배 · 총 ${S.totalLines + S.me.lines}줄`);
  } else {
    g.sfx.win(); g.add(1000 * (S.stage + 1), 760, 300);
    g.burst(760, 300, ['#fde047', '#22d3ee', '#f472b6'], 60, 400, 1.2);
    S.banner = '승리! 🎉'; S.banner2 = S.stage < 5 ? '다음 상대가 기다립니다' : '모든 봇을 격파!'; S.pause = 2.2;
    S.totalLines += S.me.lines;
    S.after = () => { if (S.stage >= 5) return g.win(`챔피언! 총 ${S.totalLines}줄`); S.stage++; startMatch(g); };
  }
}
function tryMove(b, dx, dy, dr) {
  const c = b.cur;
  if (!dr) { if (fits(b, c.t, c.r, c.x + dx, c.y + dy)) { c.x += dx; c.y += dy; return true; } return false; }
  const nr = (c.r + dr + 4) % 4;
  for (const [kx, ky] of (c.t === 'I' ? TB_KICK.concat([[-2, 0], [2, 0]]) : TB_KICK)) if (fits(b, c.t, nr, c.x + kx, c.y + ky)) { c.x += kx; c.y += ky; c.r = nr; return true; }
  return false;
}
function onGround(b) { return !fits(b, b.cur.t, b.cur.r, b.cur.x, b.cur.y + 1); }
function moved(b) { if (onGround(b) && b.lockMoves < 15) { b.lock = 0; b.lockMoves++; } }
function playerInput(g, dt) {
  const b = S.me; if (b.dead || S.done) return;
  const dir = (g.held('right') ? 1 : 0) - (g.held('left') ? 1 : 0);
  if (g.pressed('left')) { if (tryMove(b, -1, 0)) { g.sfx.tone(300, 0.02, 'square', 0.03); moved(b); } S.dasDir = -1; S.das = 0; }
  else if (g.pressed('right')) { if (tryMove(b, 1, 0)) { g.sfx.tone(300, 0.02, 'square', 0.03); moved(b); } S.dasDir = 1; S.das = 0; }
  else if (dir && dir === S.dasDir) {
    S.das += dt;
    if (S.das > 0.16) { S.arr += dt; while (S.arr > 0.04) { S.arr -= 0.04; if (tryMove(b, dir, 0)) moved(b); } }
  } else { S.dasDir = dir; S.das = 0; S.arr = 0; }
  if (g.pressed('up') || g.keyp('KeyX')) { if (tryMove(b, 0, 0, 1)) { g.sfx.tone(500, 0.03, 'triangle', 0.04); moved(b); } }
  if (g.keyp('KeyQ')) { if (tryMove(b, 0, 0, -1)) { g.sfx.tone(450, 0.03, 'triangle', 0.04); moved(b); } }
  if ((g.pressed('b') && !g.keyp('KeyX')) || g.keyp('KeyC')) doHold(g, b);
  if (g.held('down')) { b.fall += dt * 18; }
  if (g.pressed('a') || g.swiped === 'down') { hardDrop(g, b); }
  if (g.mouse.clicked && !g.swiped) { /* tap: rotate */ if (g.mouse.x < 330 && g.mouse.y < 600) { if (tryMove(b, 0, 0, 1)) moved(b); } }
}
function doHold(g, b) {
  if (!b.canHold) return;
  const t = b.cur.t;
  if (b.hold) { const h = b.hold; b.hold = t; spawn(g, b, h); } else { b.hold = t; spawn(g, b); }
  b.canHold = false; g.sfx.click();
}
function hardDrop(g, b) {
  let n = 0; while (tryMove(b, 0, 1)) n++;
  if (b === S.me) { g.score += n; g.sfx.drop(); g.shake(2, 0.08); }
  lockPiece(g, b);
}
function stepBoard(g, b, dt, isAI) {
  if (b.dead || S.done || !b.cur) return;
  b.fall += dt / S.grav;
  while (b.fall >= 1) { b.fall -= 1; if (!tryMove(b, 0, 1)) { b.fall = 0; break; } else if (!isAI && g.held('down')) g.score += 1; }
  if (onGround(b)) { b.lock += dt; if (b.lock > 0.5) lockPiece(g, b); } else b.lock = 0;
}
function lockPiece(g, b) {
  const c = b.cur;
  let topOut = true;
  for (const [x, y] of cellsOf(c.t, c.r)) { const gy = c.y + y; if (gy >= 2) topOut = false; if (gy >= 0) b.grid[gy][c.x + x] = c.t; }
  const isT = c.t === 'T' && tSpin(b, c);
  b.cur = null; b.canHold = true;
  // clear
  const full = [];
  for (let y = 0; y < TB_H + 2; y++) if (b.grid[y].every((v) => v)) full.push(y);
  const ox = b === S.me ? 70 : 630;
  if (full.length) {
    for (const y of full) { b.grid.splice(y, 1); b.grid.unshift(Array(TB_W).fill(null)); }
    b.combo++; b.lines += full.length;
    let atk = TB_ATK[full.length];
    const big = full.length === 4 || (isT && full.length >= 1);
    if (isT) atk = full.length * 2;
    if (big && b.b2b) atk += 1;
    b.b2b = big;
    atk += [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5][Math.min(11, b.combo)];
    if (b.grid.every((r) => r.every((v) => !v))) { atk += 6; b.msg = 'PERFECT CLEAR!'; b.msgT = 1.5; }
    else { b.msg = (isT ? 'T-스핀 ' : '') + ['', '싱글', '더블', '트리플', '테트리스!'][full.length] + (b.combo > 0 ? ` ${b.combo}콤보` : ''); b.msgT = 1.2; }
    b.flash = 0.15;
    // cancel
    while (atk > 0 && b.pending.length) { const take = Math.min(atk, b.pending[0].n); b.pending[0].n -= take; atk -= take; if (!b.pending[0].n) b.pending.shift(); }
    if (atk > 0) {
      const o = b === S.me ? S.ai : S.me;
      o.pending.push({ n: atk, hole: U.randi(0, TB_W - 1), t: 0.6 });
      b.sent += atk;
      const tx = b === S.me ? 760 : 200;
      for (let i = 0; i < atk; i++) S.atk.push({ sx: ox + 130, sy: 300, x: ox + 130, y: 300, tx, ty: 520 - i * 10, t: -i * 0.05, c: b === S.me ? '#22d3ee' : '#f87171' });
    }
    if (b === S.me) {
      const pts = [0, 100, 300, 500, 800][full.length] * (isT ? 2 : 1) * (S.stage + 1) + Math.max(0, b.combo) * 50;
      g.add(pts, 200, 300);
      g.sfx.tone(400 + full.length * 120, 0.15, 'square', 0.07, 900);
      if (full.length === 4) { g.shake(8, 0.3); g.sfx.explode(); }
      for (const y of full) g.burst(ox + 130, 70 + (y - 2) * TB_C, ['#fff', TB_COL[c.t]], 14, 260, 0.6);
    } else g.sfx.tone(200, 0.05, 'sine', 0.03);
  } else {
    b.combo = -1;
    // receive garbage
    let got = 0;
    while (b.pending.length && got < 8) {
      const p = b.pending[0];
      const n = Math.min(p.n, 8 - got);
      for (let i = 0; i < n; i++) {
        const row = Array(TB_W).fill('G'); row[p.hole] = null;
        b.grid.shift(); b.grid.push(row);
      }
      got += n; p.n -= n; if (!p.n) b.pending.shift();
    }
    if (got && b.grid[0].some((v) => v)) { lose(g, b); return; }
    if (got) { if (b === S.me) { g.shake(6, 0.25); g.sfx.hit(); } }
    if (b === S.me) g.sfx.tone(150, 0.03, 'sine', 0.04);
  }
  if (topOut && !full.length) { lose(g, b); return; }
  spawn(g, b);
}
function tSpin(b, c) {
  let n = 0;
  for (const [dx, dy] of [[0, 0], [2, 0], [0, 2], [2, 2]]) { const x = c.x + dx, y = c.y + dy; if (x < 0 || x >= TB_W || y >= TB_H + 2 || (y >= 0 && b.grid[y][x])) n++; }
  return n >= 3;
}
/* ===== AI ===== */
function evalGrid(grid) {
  let agg = 0, holes = 0, bump = 0, prev = -1, maxH = 0, wells = 0;
  const hs = [];
  for (let x = 0; x < TB_W; x++) {
    let h = 0;
    for (let y = 0; y < TB_H + 2; y++) if (grid[y][x]) { h = TB_H + 2 - y; break; }
    hs.push(h); agg += h; maxH = Math.max(maxH, h);
    let seen = false;
    for (let y = 0; y < TB_H + 2; y++) { if (grid[y][x]) seen = true; else if (seen) holes++; }
  }
  for (let x = 0; x < TB_W; x++) {
    if (x) bump += Math.abs(hs[x] - hs[x - 1]);
    const l = x ? hs[x - 1] : 99, r = x < TB_W - 1 ? hs[x + 1] : 99;
    const w = Math.min(l, r) - hs[x]; if (w > 2) wells += w - 2;
  }
  return -0.51 * agg - 0.36 * holes * 2 - 0.18 * bump - 0.2 * wells - (maxH > 14 ? (maxH - 14) * 2 : 0);
}
function bestPlacement(b, t) {
  let best = null;
  for (let r = 0; r < 4; r++) {
    for (let x = -2; x < TB_W; x++) {
      if (!fits(b, t, r, x, 0) && !fits(b, t, r, x, 1)) continue;
      let y = fits(b, t, r, x, 0) ? 0 : 1;
      while (fits(b, t, r, x, y + 1)) y++;
      if (!fits(b, t, r, x, y)) continue;
      const grid = b.grid.map((row) => row.slice());
      for (const [cx, cy] of cellsOf(t, r)) if (y + cy >= 0) grid[y + cy][x + cx] = t;
      let lines = 0;
      for (let yy = TB_H + 1; yy >= 0; yy--) if (grid[yy].every((v) => v)) { grid.splice(yy, 1); grid.unshift(Array(TB_W).fill(null)); lines++; yy++; }
      let sc = evalGrid(grid) + [0, 0.3, 1.2, 2.4, 6][lines] * (b.pending.length ? 1.6 : 1);
      if (sc > (best ? best.sc : -1e9)) best = { r, x, sc };
    }
  }
  return best;
}
function aiUpdate(g, dt) {
  const b = S.ai, st = TB_STAGES[S.stage];
  if (b.dead || !b.cur) return;
  if (!b.plan) {
    b.think += dt; if (b.think < st.think) return;
    b.think = 0;
    let p = bestPlacement(b, b.cur.t);
    const ht = b.hold || b.next[0];
    if (b.canHold) { const q = bestPlacement(b, ht); if (q && (!p || q.sc > p.sc + 0.5)) { doHold(g, b); return; } }
    if (!p) p = { r: 0, x: 3 };
    if (Math.random() < st.err) { p.x = U.clamp(p.x + U.choice([-1, 1]), -1, TB_W - 2); }
    b.plan = p; b.act = 0;
    return;
  }
  b.act += dt;
  if (b.act < st.step) return;
  b.act = 0;
  const c = b.cur, p = b.plan;
  if (c.r !== p.r) { if (!tryMove(b, 0, 0, 1)) b.plan.r = c.r; }
  else if (c.x < p.x) { if (!tryMove(b, 1, 0)) p.x = c.x; }
  else if (c.x > p.x) { if (!tryMove(b, -1, 0)) p.x = c.x; }
  else hardDrop(g, b);
}
/* ===== draw ===== */
function drawCell(g, x, y, t, a) {
  const col = TB_COL[t];
  g.ctx.globalAlpha = a || 1;
  g.rrect(x + 1, y + 1, TB_C - 2, TB_C - 2, 4, col);
  g.rect(x + 3, y + 3, TB_C - 6, 4, 'rgba(255,255,255,.35)');
  g.ctx.globalAlpha = 1;
}
function drawMini(g, t, cx, cy, s) {
  if (!t) return;
  const cells = cellsOf(t, 0);
  let mx = 0, my = 0; for (const [x, y] of cells) { mx += x; my += y; } mx /= 4; my /= 4;
  for (const [x, y] of cells) g.rrect(cx + (x - mx - 0.5) * s, cy + (y - my - 0.5) * s, s - 2, s - 2, 3, TB_COL[t]);
}
function drawBoard(g, c, b, ox, oy, name, isAI) {
  const W = TB_W * TB_C, H = TB_H * TB_C;
  g.rrect(ox - 6, oy - 6, W + 12, H + 12, 8, b.flash > 0 ? '#334155' : '#020617', isAI ? '#f87171' : '#38bdf8', 3);
  for (let x = 1; x < TB_W; x++) g.line(ox + x * TB_C, oy, ox + x * TB_C, oy + H, 'rgba(148,163,184,.07)', 1);
  for (let y = 0; y < TB_H; y++) for (let x = 0; x < TB_W; x++) { const v = b.grid[y + 2][x]; if (v) drawCell(g, ox + x * TB_C, oy + y * TB_C, v, b.dead ? 0.4 : 1); }
  if (b.cur && !b.dead) {
    const cc = b.cur;
    let gy = cc.y; while (fits(b, cc.t, cc.r, cc.x, gy + 1)) gy++;
    for (const [x, y] of cellsOf(cc.t, cc.r)) { const yy = gy + y - 2; if (yy >= 0) g.rrect(ox + (cc.x + x) * TB_C + 2, oy + yy * TB_C + 2, TB_C - 4, TB_C - 4, 4, null, TB_COL[cc.t], 2); }
    for (const [x, y] of cellsOf(cc.t, cc.r)) { const yy = cc.y + y - 2; if (yy >= 0) drawCell(g, ox + (cc.x + x) * TB_C, oy + yy * TB_C, cc.t); }
  }
  // garbage meter
  let pend = 0; for (const p of b.pending) pend += p.n;
  const mx = isAI ? ox + W + 10 : ox - 18;
  g.rect(mx, oy, 8, H, '#1e293b');
  const ph = Math.min(H, pend * TB_C); g.rect(mx, oy + H - ph, 8, ph, pend >= 4 ? '#ef4444' : '#f59e0b');
  // side panels
  const sx = isAI ? ox - 70 : ox + W + 16;
  g.text('다음', sx + 27, oy + 8, 13, '#94a3b8');
  for (let i = 0; i < 5; i++) drawMini(g, b.next[i], sx + 27, oy + 40 + i * 52, i ? 12 : 15);
  g.text('홀드', sx + 27, oy + 310, 13, '#94a3b8');
  g.rrect(sx, oy + 325, 54, 50, 6, '#1e293b'); drawMini(g, b.hold, sx + 27, oy + 350, 12);
  g.text(name, ox + W / 2, oy - 22, 18, isAI ? '#fca5a5' : '#7dd3fc');
  if (b.msgT > 0) { g.ctx.globalAlpha = Math.min(1, b.msgT * 2); g.text(b.msg, ox + W / 2, oy + H / 2 - 40, 26, '#fde047'); g.ctx.globalAlpha = 1; }
  if (b.combo > 0) g.text(`${b.combo} COMBO`, ox + W / 2, oy + H + 24, 16, '#f472b6');
  if (b.b2b) g.text('B2B', ox + W / 2 + 90, oy + H + 24, 13, '#fde047');
  if (b.dead) g.text(isAI ? 'K.O.' : 'GAME OVER', ox + W / 2, oy + H / 2, 40, '#f87171');
}
