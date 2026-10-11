'use strict';
let S;
const LM_W = 16, LM_H = 10, LM_C = 40, LM_X = 160, LM_Y = 170;
const LM_SKINS = [
  { name: 'Shinin\'', bg: ['#0c1445', '#1e3a8a'], c: ['#f97316', '#e5e7eb'], bpm: 110, grav: 0.9 },
  { name: 'Lumines Groove', bg: ['#064e3b', '#065f46'], c: ['#facc15', '#22d3ee'], bpm: 120, grav: 0.8 },
  { name: 'Neon Rain', bg: ['#2e1065', '#581c87'], c: ['#f472b6', '#a3e635'], bpm: 128, grav: 0.7 },
  { name: 'Desert Moon', bg: ['#431407', '#7c2d12'], c: ['#fde68a', '#7dd3fc'], bpm: 96, grav: 0.6 },
  { name: 'Deep Ocean', bg: ['#082f49', '#0c4a6e'], c: ['#f87171', '#e0f2fe'], bpm: 136, grav: 0.5 },
  { name: 'Cherry Bomb', bg: ['#4c0519', '#881337'], c: ['#fbcfe8', '#fde047'], bpm: 140, grav: 0.42 },
  { name: 'Mainframe', bg: ['#020617', '#111827'], c: ['#4ade80', '#60a5fa'], bpm: 150, grav: 0.34 },
  { name: 'Supernova', bg: ['#1c1917', '#44403c'], c: ['#fb923c', '#c084fc'], bpm: 160, grav: 0.26 },
];
const LM_PER = 30;
GAME({
  title: '뤼미네스', w: 960, h: 620, bg: '#0c1445', controls: 'dpad+ab', aLabel: '⤓', bLabel: '↺',
  help: '←→ 이동 · ↓ 빠르게 · Space 즉시 낙하 · ↑/X 시계 회전 · Shift/Q 반시계\n같은 색 2x2 정사각형을 만들면 표시되고, 음악에 맞춰 지나가는 타임라인이 지워요\n한 번의 스윕에 4개 이상 = 4배 보너스 · 연속 스윕 콤보\n◆ 보석 블록은 연결된 같은 색 블록을 전부 지움 · 스킨 8개를 모두 통과하면 클리어!',
  init(g) {
    S = { grid: U.grid(LM_W, LM_H, 0), gem: U.grid(LM_W, LM_H, false), mark: U.grid(LM_W, LM_H, false), del: U.grid(LM_W, LM_H, false), skin: 0, squares: 0, skinSq: 0, tl: 0, tlCol: -1, sweepCount: 0, sweepSq: 0, combo: 0, t: 0, beat: 0, queue: [], cur: null, fall: 0, lock: 0, das: 0, dasDir: 0, msg: '', msgT: 0, pieces: 0, fade: 0, dead: false };
    for (let i = 0; i < 3; i++) S.queue.push(genPiece());
    spawn(g);
  },
  update(g, dt) {
    if (S.dead) return;
    S.t += dt; S.msgT -= dt; S.fade = Math.max(0, S.fade - dt);
    const sk = LM_SKINS[S.skin];
    // beat
    const bl = 60 / sk.bpm;
    S.beat += dt;
    if (S.beat >= bl) { S.beat -= bl; S.bi = (S.bi || 0) + 1; g.sfx.tone(S.bi % 2 ? 90 : 70, 0.08, 'sine', 0.07, 40); if (S.bi % 4 === 2) g.sfx.noise(0.04, 0.03); }
    // timeline: one full sweep = 8 beats
    const sweepT = bl * 8;
    S.tl += dt * (LM_W * LM_C) / sweepT;
    const col = Math.floor(S.tl / LM_C);
    if (col !== S.tlCol) { for (let c = S.tlCol + 1; c <= Math.min(col, LM_W); c++) timelineAt(g, c); S.tlCol = col; }
    if (S.tl >= LM_W * LM_C) { S.tl -= LM_W * LM_C; S.tlCol = -1; }
    if (S.cur) play(g, dt);
    g.info = `스킨 ${S.skin + 1}/8 ${sk.name} · ${S.skinSq}/${LM_PER}`;
  },
  draw(g, c) {
    const sk = LM_SKINS[S.skin];
    const gr = c.createLinearGradient(0, 0, 0, 620); gr.addColorStop(0, sk.bg[0]); gr.addColorStop(1, sk.bg[1]);
    g.rect(0, 0, 960, 620, gr);
    // pulse rings
    const pulse = 1 - S.beat / (60 / sk.bpm);
    for (let i = 0; i < 6; i++) g.ring(480, 320, 100 + i * 90 + pulse * 20, `rgba(255,255,255,${0.03 + pulse * 0.03})`, 2);
    const bw = LM_W * LM_C, bh = LM_H * LM_C;
    g.rect(LM_X, LM_Y, bw, bh, 'rgba(0,0,0,.35)');
    for (let x = 0; x <= LM_W; x++) g.line(LM_X + x * LM_C, LM_Y, LM_X + x * LM_C, LM_Y + bh, 'rgba(255,255,255,.06)', 1);
    for (let y = 0; y <= LM_H; y++) g.line(LM_X, LM_Y + y * LM_C, LM_X + bw, LM_Y + y * LM_C, 'rgba(255,255,255,.06)', 1);
    g.rect(LM_X + 7 * LM_C, LM_Y - 90, 2 * LM_C, 90, 'rgba(255,255,255,.04)');
    for (let y = 0; y < LM_H; y++) for (let x = 0; x < LM_W; x++) {
      const v = S.grid[y][x]; if (!v) continue;
      block(g, LM_X + x * LM_C, LM_Y + y * LM_C, v, S.gem[y][x], S.mark[y][x], S.del[y][x]);
    }
    // square outlines
    for (let y = 0; y < LM_H - 1; y++) for (let x = 0; x < LM_W - 1; x++) if (isSq(x, y)) g.rrect(LM_X + x * LM_C + 2, LM_Y + y * LM_C + 2, LM_C * 2 - 4, LM_C * 2 - 4, 4, null, 'rgba(255,255,255,.8)', 2);
    if (S.cur) {
      const p = S.cur;
      // ghost
      const gy0 = dropY(p, 0), gy1 = dropY(p, 1);
      g.rect(LM_X + p.x * LM_C, LM_Y + Math.max(0, gy0) * LM_C, LM_C, LM_C * 2, 'rgba(255,255,255,.06)');
      g.rect(LM_X + (p.x + 1) * LM_C, LM_Y + Math.max(0, gy1) * LM_C, LM_C, LM_C * 2, 'rgba(255,255,255,.06)');
      for (let i = 0; i < 4; i++) { const dx = i % 2, dy = i >> 1; block(g, LM_X + (p.x + dx) * LM_C, LM_Y + (p.y + dy + Math.min(0.9, S.fall)) * LM_C, p.c[i], p.gem === i, false, false); }
    }
    // timeline
    const tx = LM_X + S.tl;
    g.rect(tx - 14, LM_Y - 10, 14, bh + 10, 'rgba(255,255,255,.08)');
    g.line(tx, LM_Y - 16, tx, LM_Y + bh, '#fff', 3);
    g.rrect(tx - 22, LM_Y - 40, 44, 24, 6, '#fff');
    g.text(S.sweepSq, tx, LM_Y - 28, 16, '#111827');
    // next queue
    g.text('NEXT', 80, LM_Y - 20, 16, '#e5e7eb');
    S.queue.forEach((q, k) => { const s = k ? 0.6 : 0.85, bx = 80 - LM_C * s, by = LM_Y + 10 + k * 100; for (let i = 0; i < 4; i++) miniBlock(g, bx + (i % 2) * LM_C * s, by + (i >> 1) * LM_C * s, LM_C * s, q.c[i], q.gem === i); });
    // HUD
    g.text(sk.name, 480, 40, 26, '#fff');
    g.text(`SKIN ${S.skin + 1} / 8  ·  ${sk.bpm} BPM`, 480, 72, 14, 'rgba(255,255,255,.7)');
    g.rrect(LM_X + bw + 20, LM_Y, 120, bh, 10, 'rgba(0,0,0,.3)');
    g.text('삭제', LM_X + bw + 80, LM_Y + 30, 14, '#cbd5e1');
    g.text(S.squares, LM_X + bw + 80, LM_Y + 62, 30, '#fff');
    g.text('다음 스킨', LM_X + bw + 80, LM_Y + 110, 13, '#cbd5e1');
    g.rrect(LM_X + bw + 35, LM_Y + 125, 90, 12, 6, 'rgba(255,255,255,.15)');
    g.rrect(LM_X + bw + 35, LM_Y + 125, 90 * Math.min(1, S.skinSq / LM_PER), 12, 6, sk.c[0]);
    g.text(`콤보 ${S.combo}`, LM_X + bw + 80, LM_Y + 180, 18, S.combo > 1 ? '#fde047' : '#cbd5e1');
    g.text(`블록 ${S.pieces}`, LM_X + bw + 80, LM_Y + 220, 13, '#94a3b8');
    g.text(`시간 ${U.fmtTime(S.t)}`, LM_X + bw + 80, LM_Y + 250, 13, '#94a3b8');
    if (S.msgT > 0) g.text(S.msg, 480, LM_Y + bh / 2, 40, '#fde047');
    if (S.fade > 0) { c.globalAlpha = S.fade; g.rect(0, 0, 960, 620, '#fff'); c.globalAlpha = 1; }
  },
});
function genPiece() {
  const c = []; for (let i = 0; i < 4; i++) c.push(U.randi(1, 2));
  if (Math.random() < 0.18) { const v = U.randi(1, 2); c[0] = c[1] = c[2] = c[3] = Math.random() < 0.5 ? v : c[0]; }
  return { c, gem: Math.random() < 0.07 ? U.randi(0, 3) : -1 };
}
function spawn(g) {
  S.cur = Object.assign(S.queue.shift(), { x: 7, y: -2 });
  S.queue.push(genPiece());
  S.fall = 0; S.lock = 0;
  if (S.grid[0][7] || S.grid[0][8]) gameOver(g);
}
function gameOver(g) { S.dead = true; S.cur = null; g.shake(12, 0.5); g.over(`스킨 ${S.skin + 1} · ${S.squares}개 삭제`); }
function filled(x, y) { return x < 0 || x >= LM_W || y >= LM_H || (y >= 0 && S.grid[y][x]); }
function fits(p, x, y) { return !filled(x, y) && !filled(x, y + 1) && !filled(x + 1, y) && !filled(x + 1, y + 1); }
function dropY(p, dx) { let y = p.y; while (!filled(p.x + dx, y + 2)) y++; return y; }
function play(g, dt) {
  const p = S.cur;
  const dir = (g.held('right') ? 1 : 0) - (g.held('left') ? 1 : 0);
  const mv = (d) => { if (fits(p, p.x + d, p.y)) { p.x += d; g.sfx.tone(320, 0.02, 'sine', 0.04); } };
  if (g.pressed('left') || g.swiped === 'left') { mv(-1); S.dasDir = -1; S.das = 0; }
  else if (g.pressed('right') || g.swiped === 'right') { mv(1); S.dasDir = 1; S.das = 0; }
  else if (dir && dir === S.dasDir) { S.das += dt; if (S.das > 0.17) { S.das -= 0.05; mv(dir); } }
  else { S.dasDir = dir; S.das = 0; }
  const rot = (cw) => { const c = p.c; p.c = cw ? [c[2], c[0], c[3], c[1]] : [c[1], c[3], c[0], c[2]]; if (p.gem >= 0) p.gem = cw ? [1, 3, 0, 2][p.gem] : [2, 0, 3, 1][p.gem]; g.sfx.tone(560, 0.03, 'triangle', 0.05); };
  if (g.pressed('up') || g.keyp('KeyX') || (g.mouse.clicked && !g.swiped)) rot(true);
  if ((g.pressed('b') && !g.keyp('KeyX')) || g.keyp('KeyQ')) rot(false);
  if (g.pressed('a') || g.swiped === 'down') { while (fits(p, p.x, p.y + 1)) { p.y++; g.score += 1; } g.sfx.drop(); return land(g); }
  S.fall += dt / (g.held('down') ? 0.03 : LM_SKINS[S.skin].grav);
  while (S.fall >= 1) {
    S.fall -= 1;
    if (fits(p, p.x, p.y + 1)) p.y++;
    else { S.fall = 0; return land(g); }
  }
}
function land(g) {
  const p = S.cur; S.cur = null; S.pieces++;
  let over = false;
  for (let dx = 0; dx < 2; dx++) {
    // drop column-wise: bottom cell first
    const x = p.x + dx;
    for (let dy = 1; dy >= 0; dy--) {
      const i = dy * 2 + dx;
      let y = -1; while (y + 1 < LM_H && !S.grid[y + 1][x]) y++;
      if (y < 0) { over = true; continue; }
      S.grid[y][x] = p.c[i]; S.gem[y][x] = p.gem === i;
    }
  }
  g.sfx.tone(140, 0.06, 'sine', 0.07);
  g.burst(LM_X + (p.x + 1) * LM_C, LM_Y + (p.y + 2) * LM_C, ['#fff'], 6, 120, 0.3);
  updateMarks(g, true);
  if (over) return gameOver(g);
  spawn(g);
}
function isSq(x, y) { const v = S.grid[y][x]; return v && S.grid[y][x + 1] === v && S.grid[y + 1][x] === v && S.grid[y + 1][x + 1] === v; }
function updateMarks(g, fromLand) {
  for (let y = 0; y < LM_H; y++) for (let x = 0; x < LM_W; x++) S.mark[y][x] = false;
  for (let y = 0; y < LM_H - 1; y++) for (let x = 0; x < LM_W - 1; x++) if (isSq(x, y)) S.mark[y][x] = S.mark[y][x + 1] = S.mark[y + 1][x] = S.mark[y + 1][x + 1] = true;
  // gems: chain-mark connected cells of same color
  for (let y = 0; y < LM_H; y++) for (let x = 0; x < LM_W; x++) if (S.gem[y][x] && S.mark[y][x]) {
    const v = S.grid[y][x], st = [[x, y]], seen = new Set([y * 100 + x]);
    while (st.length) { const [px, py] = st.pop(); S.mark[py][px] = true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy; if (nx >= 0 && nx < LM_W && ny >= 0 && ny < LM_H && S.grid[ny][nx] === v && !seen.has(ny * 100 + nx)) { seen.add(ny * 100 + nx); st.push([nx, ny]); } } }
    S.gem[y][x] = false; S.chainBoost = true;
    if (fromLand) { g.sfx.power(); S.msg = '◆ 체인!'; S.msgT = 1; }
  }
}
function timelineAt(g, c) {
  let any = false;
  if (c < LM_W) for (let y = 0; y < LM_H; y++) if (S.mark[y][c] && !S.del[y][c]) { S.del[y][c] = true; any = true; }
  if (c < LM_W && any) {
    // count squares whose right column is c
    if (c > 0) for (let y = 0; y < LM_H - 1; y++) if (S.del[y][c - 1] && S.del[y][c] && S.del[y + 1][c - 1] && S.del[y + 1][c] && isSq(c - 1, y)) S.sweepSq++;
    return;
  }
  // gap or end: erase collected
  let n = 0;
  for (let y = 0; y < LM_H; y++) for (let x = 0; x < LM_W; x++) if (S.del[y][x]) n++;
  if (n) {
    for (let y = 0; y < LM_H; y++) for (let x = 0; x < LM_W; x++) if (S.del[y][x]) { g.burst(LM_X + x * LM_C + 20, LM_Y + y * LM_C + 20, LM_SKINS[S.skin].c[S.grid[y][x] - 1], 3, 160, 0.5); S.grid[y][x] = 0; S.gem[y][x] = false; S.del[y][x] = false; }
    gravity();
    updateMarks(g, false);
    g.sfx.tone(700, 0.08, 'triangle', 0.06, 1200);
  }
  if (c >= LM_W) endSweep(g);
}
function endSweep(g) {
  const q = S.sweepSq;
  if (q > 0) {
    S.combo++;
    let pts = q * 40 * (S.skin + 1);
    if (q >= 4) { pts *= 4; S.msg = `${q} 스퀘어! x4`; S.msgT = 1.3; g.shake(6, 0.3); g.sfx.explode(); }
    if (S.combo > 1) pts *= Math.min(4, 1 + (S.combo - 1) * 0.25);
    g.add(Math.round(pts), LM_X + 320, LM_Y + 200);
    S.squares += q; S.skinSq += q;
    if (S.skinSq >= LM_PER) nextSkin(g);
  } else S.combo = 0;
  S.sweepSq = 0;
  S.sweepCount++;
  // if board is empty -> all clear bonus
  if (q > 0 && S.grid.every((r) => r.every((v) => !v))) { g.add(10000, 480, 300); S.msg = 'ALL CLEAR!'; S.msgT = 2; g.sfx.win(); }
}
function nextSkin(g) {
  S.skin++; S.skinSq = 0;
  if (S.skin >= LM_SKINS.length) { S.skin = LM_SKINS.length - 1; S.dead = true; g.add(20000); return g.win(`모든 스킨 완주! ${S.squares}개 삭제`); }
  S.fade = 0.8; S.msg = `♪ ${LM_SKINS[S.skin].name}`; S.msgT = 2; g.sfx.win();
  g.add(1000 * S.skin);
}
function gravity() {
  for (let x = 0; x < LM_W; x++) {
    let w = LM_H - 1;
    for (let y = LM_H - 1; y >= 0; y--) if (S.grid[y][x]) {
      if (w !== y) { S.grid[w][x] = S.grid[y][x]; S.gem[w][x] = S.gem[y][x]; S.del[w][x] = S.del[y][x]; S.grid[y][x] = 0; S.gem[y][x] = false; S.del[y][x] = false; }
      w--;
    }
  }
}
function block(g, x, y, v, gem, mark, del) {
  const col = LM_SKINS[S.skin].c[v - 1];
  if (y < LM_Y - 2 * LM_C - 1) return;
  g.rrect(x + 2, y + 2, LM_C - 4, LM_C - 4, 6, del ? '#fff' : col);
  if (mark && !del) { g.rrect(x + 6, y + 6, LM_C - 12, LM_C - 12, 4, 'rgba(255,255,255,.35)'); }
  else g.rect(x + 6, y + 6, LM_C - 12, 5, 'rgba(255,255,255,.3)');
  if (del) g.rrect(x + 4, y + 4, LM_C - 8, LM_C - 8, 4, col);
  if (gem) { g.poly([[x + 20, y + 8], [x + 32, y + 20], [x + 20, y + 32], [x + 8, y + 20]], '#fff', '#111', 2); g.circle(x + 20, y + 20, 4, col); }
}
function miniBlock(g, x, y, s, v, gem) {
  g.rrect(x + 1, y + 1, s - 2, s - 2, 4, LM_SKINS[S.skin].c[v - 1]);
  if (gem) g.poly([[x + s / 2, y + 5], [x + s - 5, y + s / 2], [x + s / 2, y + s - 5], [x + 5, y + s / 2]], '#fff');
}
