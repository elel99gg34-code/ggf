'use strict';
let S;
const DM_W = 8, DM_H = 16, DM_C = 32, DM_X = 352, DM_Y = 92;
const DM_COL = [null, '#ef4444', '#facc15', '#3b82f6'];
const DM_DARK = [null, '#991b1b', '#a16207', '#1e3a8a'];
const DM_VIR = [null, '🦠', '👾', '🧫'];
GAME({
  title: '캡슐 박사', w: 960, h: 640, bg: '#1f2937', controls: 'dpad+ab', aLabel: '↻', bLabel: '↺',
  help: '←→ 이동 · ↓ 빠르게 내리기 · Space 즉시 낙하\n↑/X/Z 회전 · Shift/Q 반대 회전 (터치: 탭=회전, 스와이프=이동/낙하)\n같은 색 4칸을 가로·세로로 맞추면 사라져요. 바이러스를 모두 없애면 다음 레벨!\n한 번에 여러 바이러스를 잡으면 점수 대폭 UP · 입구가 막히면 게임 오버',
  init(g) { S = { level: 0, viruses: 0 }; newLevel(g); },
  update(g, dt) {
    S.t += dt;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.phase === 'intro') { S.timer -= dt; if (S.timer <= 0) { S.phase = 'spawn'; } return; }
    if (S.phase === 'clear') { S.timer -= dt; if (S.timer <= 0) { S.level++; newLevel(g); } return; }
    if (S.phase === 'spawn') { spawn(g); return; }
    if (S.phase === 'play') { play(g, dt); }
    else if (S.phase === 'pop') { S.timer -= dt; if (S.timer <= 0) { for (const [x, y] of S.pops) S.grid[y][x] = null; S.pops = []; S.phase = 'fall'; S.timer = 0.12; } }
    else if (S.phase === 'fall') { S.timer -= dt; if (S.timer <= 0) { if (fallStep()) { S.timer = 0.07; g.sfx.tone(180, 0.02, 'sine', 0.03); } else checkMatches(g); } }
    for (let i = 1; i <= 3; i++) S.bigV[i].a += dt;
    g.info = `레벨 ${S.level + 1} · 남은 바이러스 ${S.vcount}`;
  },
  draw(g, c) {
    // background tiles
    for (let y = 0; y < 640; y += 40) for (let x = 0; x < 960; x += 40) if (((x + y) / 40) % 2 === 0) g.rect(x, y, 40, 40, '#243042');
    // bottle
    const bw = DM_W * DM_C, bh = DM_H * DM_C;
    g.rrect(DM_X - 14, DM_Y - 14, bw + 28, bh + 28, 22, '#e2e8f0');
    g.rrect(DM_X + bw / 2 - 44, DM_Y - 56, 88, 50, 10, '#e2e8f0');
    g.rect(DM_X + bw / 2 - 32, DM_Y - 44, 64, 50, '#0b1020');
    g.rect(DM_X, DM_Y, bw, bh, '#0b1020');
    for (let x = 1; x < DM_W; x++) g.line(DM_X + x * DM_C, DM_Y, DM_X + x * DM_C, DM_Y + bh, 'rgba(148,163,184,.06)', 1);
    const popSet = new Set(S.pops.map(([x, y]) => y * 10 + x));
    for (let y = 0; y < DM_H; y++) for (let x = 0; x < DM_W; x++) {
      const cell = S.grid[y][x]; if (!cell) continue;
      const px = DM_X + x * DM_C, py = DM_Y + y * DM_C;
      if (popSet.has(y * 10 + x)) { g.circle(px + 16, py + 16, 14 + Math.sin(S.t * 40) * 3, '#fff'); g.circle(px + 16, py + 16, 9, DM_COL[cell.c]); continue; }
      if (cell.v) drawVirus(g, px + 16, py + 16, cell.c, 1);
      else drawHalf(g, px, py, cell.c, cell.l);
    }
    if (S.cur && S.phase === 'play') {
      const cu = S.cur;
      const [ax, ay, bx, by] = cellsOf(cu);
      let gy = 0; while (canPlace(cu.x, cu.y + gy + 1, cu.o)) gy++;
      g.ctx.globalAlpha = 0.22; drawHalf(g, DM_X + ax * DM_C, DM_Y + (ay + gy) * DM_C, cu.a, cu.o ? 'U' : 'R'); drawHalf(g, DM_X + bx * DM_C, DM_Y + (by + gy) * DM_C, cu.b, cu.o ? 'D' : 'L'); g.ctx.globalAlpha = 1;
      if (ay >= 0) drawHalf(g, DM_X + ax * DM_C, DM_Y + ay * DM_C, cu.a, cu.o ? 'U' : 'R');
      if (by >= 0) drawHalf(g, DM_X + bx * DM_C, DM_Y + by * DM_C, cu.b, cu.o ? 'D' : 'L');
    }
    // doctor + next
    g.rrect(680, 90, 220, 170, 16, '#0f172a', '#475569');
    g.emoji('👨‍⚕️', 740, 175, 70);
    g.text('NEXT', 840, 115, 14, '#94a3b8');
    drawHalf(g, 808, 140, S.next[0], 'R'); drawHalf(g, 840, 140, S.next[1], 'L');
    g.text(`레벨 ${S.level + 1}`, 790, 230, 18, '#fde047');
    // magnifier
    g.rrect(60, 300, 230, 230, 115, '#0f172a', '#94a3b8', 6);
    g.text('🔍 바이러스 관찰', 175, 285, 14, '#94a3b8');
    for (let i = 1; i <= 3; i++) {
      const bv = S.bigV[i]; const ang = bv.a * 0.6 + i * 2.09;
      const alive = S.colorLeft[i] > 0;
      const x = 175 + Math.cos(ang) * 60, y = 415 + Math.sin(ang) * 60;
      if (alive) { drawVirus(g, x, y, i, 2.2); }
      else g.text('✔', x, y, 26, '#4ade80');
    }
    // stats
    g.rrect(60, 90, 230, 170, 16, '#0f172a', '#475569');
    g.text('바이러스', 175, 120, 16, '#94a3b8');
    g.text(S.vcount, 175, 160, 44, '#f87171');
    g.text(`속도 ${['느림', '보통', '빠름', '매우빠름'][Math.min(3, Math.floor(S.level / 3))]}`, 175, 205, 14, '#cbd5e1');
    g.text(`최대 동시제거 ${S.bestCombo}`, 175, 232, 14, '#cbd5e1');
    g.rrect(680, 300, 220, 230, 16, '#0f172a', '#475569');
    g.text('점수 표', 790, 325, 15, '#94a3b8');
    ['1마리 100', '2마리 200', '3마리 400', '4마리 800', '5마리+ 1600↑'].forEach((t, i) => g.text(t, 790, 360 + i * 30, 14, '#cbd5e1'));
    if (S.msgT > 0) g.text(S.msg, DM_X + bw / 2, DM_Y + 200, 28, '#fde047');
    if (S.phase === 'intro') { g.rrect(DM_X - 20, 260, bw + 40, 100, 14, 'rgba(2,6,23,.9)', '#fde047', 3); g.text(`LEVEL ${S.level + 1}`, DM_X + bw / 2, 295, 30, '#fde047'); g.text(`바이러스 ${S.vcount}마리`, DM_X + bw / 2, 330, 16, '#e2e8f0'); }
    if (S.phase === 'clear') { g.rrect(DM_X - 20, 260, bw + 40, 100, 14, 'rgba(2,6,23,.9)', '#4ade80', 3); g.text('STAGE CLEAR!', DM_X + bw / 2, 295, 30, '#4ade80'); g.text(`보너스 +${S.clearBonus}`, DM_X + bw / 2, 330, 16, '#e2e8f0'); }
  },
});
function newLevel(g) {
  S.grid = U.grid(DM_W, DM_H, null);
  const L = S.level;
  const n = Math.min(84, (L + 1) * 4);
  const top = Math.max(5, 10 - Math.floor(L / 2)) - (L >= 14 ? 1 : 0);
  let placed = 0, guard = 0;
  while (placed < n && guard++ < 5000) {
    const x = U.randi(0, DM_W - 1), y = U.randi(top, DM_H - 1);
    if (S.grid[y][x]) continue;
    const c = (placed % 3) + 1;
    const same = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && xx < DM_W && yy >= 0 && yy < DM_H && S.grid[yy][xx] && S.grid[yy][xx].c === c; };
    if ((same(-1, 0) && same(-2, 0)) || (same(1, 0) && same(2, 0)) || (same(-1, 0) && same(1, 0)) || (same(0, -1) && same(0, -2)) || (same(0, 1) && same(0, 2)) || (same(0, -1) && same(0, 1))) continue;
    S.grid[y][x] = { c, v: true }; placed++;
  }
  S.vcount = placed;
  countColors();
  S.speed = Math.max(0.12, 0.8 - L * 0.05);
  S.cur = null; S.next = [U.randi(1, 3), U.randi(1, 3)]; S.pops = []; S.phase = 'intro'; S.timer = 1.6; S.t = 0; S.combo = 0; S.bestCombo = S.bestCombo || 0; S.msgT = 0;
  S.bigV = [null, { a: 0 }, { a: 0 }, { a: 0 }];
  S.das = 0; S.dasDir = 0; S.drops = 0;
  g.sfx.power();
}
function countColors() { S.colorLeft = [0, 0, 0, 0]; let v = 0; for (const row of S.grid) for (const c of row) if (c && c.v) { S.colorLeft[c.c]++; v++; } S.vcount = v; }
function cellsOf(cu) { return cu.o === 0 ? [cu.x, cu.y, cu.x + 1, cu.y] : [cu.x, cu.y, cu.x, cu.y - 1]; }
function emptyAt(x, y) { return x >= 0 && x < DM_W && y < DM_H && (y < 0 || !S.grid[y][x]); }
function canPlace(x, y, o) { return o === 0 ? emptyAt(x, y) && emptyAt(x + 1, y) : emptyAt(x, y) && emptyAt(x, y - 1); }
function spawn(g) {
  S.cur = { x: 3, y: 0, o: 0, a: S.next[0], b: S.next[1] };
  S.next = [U.randi(1, 3), U.randi(1, 3)];
  S.fall = 0; S.lock = 0; S.combo = 0; S.drops++;
  if (!canPlace(3, 0, 0)) { S.phase = 'dead'; g.shake(10, 0.5); return g.over(`레벨 ${S.level + 1} · 바이러스 ${S.vcount}마리 남음`); }
  S.phase = 'play';
}
function rot(dir) {
  const cu = S.cur;
  if (cu.o === 0) {
    if (canPlace(cu.x, cu.y, 1)) { cu.o = 1; if (dir > 0) { const t = cu.a; cu.a = cu.b; cu.b = t; } return true; }
    return false;
  }
  let nx = cu.x;
  if (!canPlace(nx, cu.y, 0)) { nx--; if (!canPlace(nx, cu.y, 0)) return false; }
  cu.x = nx; cu.o = 0; if (dir < 0) { const t = cu.a; cu.a = cu.b; cu.b = t; }
  return true;
}
function play(g, dt) {
  const cu = S.cur;
  const dir = (g.held('right') ? 1 : 0) - (g.held('left') ? 1 : 0);
  const mv = (d) => { if (canPlace(cu.x + d, cu.y, cu.o)) { cu.x += d; g.sfx.tone(260, 0.02, 'square', 0.03); return true; } return false; };
  if (g.pressed('left') || g.swiped === 'left') { mv(-1); S.dasDir = -1; S.das = 0; }
  else if (g.pressed('right') || g.swiped === 'right') { mv(1); S.dasDir = 1; S.das = 0; }
  else if (dir && dir === S.dasDir) { S.das += dt; if (S.das > 0.2) { S.das -= 0.06; mv(dir); } }
  else { S.dasDir = dir; S.das = 0; }
  if (g.pressed('up') || g.keyp('KeyX') || g.keyp('KeyZ') || g.keyp('KeyJ') || (g.mouse.clicked && !g.swiped)) { if (rot(1)) g.sfx.tone(520, 0.03, 'triangle', 0.05); }
  if ((g.pressed('b') && !g.keyp('KeyX')) || g.keyp('KeyQ')) { if (rot(-1)) g.sfx.tone(470, 0.03, 'triangle', 0.05); }
  if (g.keyp('Space') || g.keyp('Enter') || g.swiped === 'down') { while (canPlace(cu.x, cu.y + 1, cu.o)) cu.y++; g.sfx.drop(); return land(g); }
  S.fall += dt / (g.held('down') ? 0.04 : S.speed);
  while (S.fall >= 1) {
    S.fall -= 1;
    if (canPlace(cu.x, cu.y + 1, cu.o)) cu.y++;
    else { S.fall = 0; S.lock += 1; if (S.lock >= 1 || g.held('down')) return land(g); }
  }
}
function land(g) {
  const cu = S.cur;
  const [ax, ay, bx, by] = cellsOf(cu);
  if (ay >= 0) S.grid[ay][ax] = { c: cu.a, v: false, l: cu.o ? (by >= 0 ? 'U' : null) : 'R' };
  if (by >= 0) S.grid[by][bx] = { c: cu.b, v: false, l: cu.o ? 'D' : 'L' };
  S.cur = null; S.combo = 0; S.killed = 0;
  g.sfx.tone(150, 0.05, 'sine', 0.06);
  checkMatches(g);
}
function partner(x, y) {
  const c = S.grid[y][x]; if (!c || !c.l) return null;
  const d = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[c.l];
  return [x + d[0], y + d[1]];
}
function checkMatches(g) {
  const mark = new Set();
  const G = S.grid;
  for (let y = 0; y < DM_H; y++) for (let x = 0; x < DM_W; x++) {
    const c = G[y][x]; if (!c) continue;
    if (x === 0 || !G[y][x - 1] || G[y][x - 1].c !== c.c) { let n = 0; while (x + n < DM_W && G[y][x + n] && G[y][x + n].c === c.c) n++; if (n >= 4) for (let k = 0; k < n; k++) mark.add(y * 10 + x + k); }
    if (y === 0 || !G[y - 1][x] || G[y - 1][x].c !== c.c) { let n = 0; while (y + n < DM_H && G[y + n][x] && G[y + n][x].c === c.c) n++; if (n >= 4) for (let k = 0; k < n; k++) mark.add((y + k) * 10 + x); }
  }
  if (!mark.size) {
    if (S.killed) {
      const k = S.killed;
      const pts = 100 * Math.pow(2, Math.min(k, 6) - 1) * (1 + Math.floor(S.level / 3));
      g.add(pts, DM_X + 128, DM_Y + 260);
      S.bestCombo = Math.max(S.bestCombo, k);
      if (k >= 3) { S.msg = `${k}마리 동시 퇴치!`; S.msgT = 1.2; g.sfx.power(); }
    }
    countColors();
    if (S.vcount === 0) { S.clearBonus = 1000 * (S.level + 1); g.add(S.clearBonus); g.sfx.win(); g.burst(DM_X + 128, DM_Y + 256, DM_COL.slice(1), 70, 420, 1.3); S.phase = 'clear'; S.timer = 2.2; return; }
    S.phase = 'spawn';
    return;
  }
  S.combo++;
  S.pops = [];
  for (const k of mark) {
    const x = k % 10, y = Math.floor(k / 10);
    const c = G[y][x];
    if (c.v) { S.killed++; g.burst(DM_X + x * DM_C + 16, DM_Y + y * DM_C + 16, DM_COL[c.c], 10, 200, 0.6); }
    const p = partner(x, y);
    if (p && !mark.has(p[1] * 10 + p[0]) && G[p[1]] && G[p[1]][p[0]]) G[p[1]][p[0]].l = null;
    S.pops.push([x, y]);
  }
  g.sfx.tone(500 + S.combo * 120, 0.12, 'square', 0.07, 900);
  if (S.combo > 1) { S.msg = `${S.combo} 연쇄!`; S.msgT = 1; g.shake(3 + S.combo * 2, 0.2); }
  S.phase = 'pop'; S.timer = 0.3;
}
function fallStep() {
  const G = S.grid; let moved = false;
  for (let y = DM_H - 2; y >= 0; y--) for (let x = 0; x < DM_W; x++) {
    const c = G[y][x]; if (!c || c.v) continue;
    if (c.l === 'L' || c.l === 'D') continue; // handled by partner
    if (c.l === 'R') {
      const p = G[y][x + 1];
      if (!G[y + 1][x] && !G[y + 1][x + 1]) { G[y + 1][x] = c; G[y + 1][x + 1] = p; G[y][x] = null; G[y][x + 1] = null; moved = true; }
    } else if (c.l === 'U') {
      if (!G[y + 1][x]) { const p = G[y - 1] ? G[y - 1][x] : null; G[y + 1][x] = c; G[y][x] = p; if (y - 1 >= 0) G[y - 1][x] = null; moved = true; }
    } else if (!G[y + 1][x]) { G[y + 1][x] = c; G[y][x] = null; moved = true; }
  }
  return moved;
}
function drawHalf(g, px, py, c, l) {
  const r = 13, cx = px + 16, cy = py + 16;
  const ctx = g.ctx;
  ctx.fillStyle = DM_COL[c];
  ctx.beginPath();
  if (l === 'R') { ctx.moveTo(px + 32, py + 3); ctx.lineTo(cx, py + 3); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(px + 32, py + 29); }
  else if (l === 'L') { ctx.moveTo(px, py + 3); ctx.lineTo(cx, py + 3); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(px, py + 29); }
  else if (l === 'U') { ctx.moveTo(px + 3, py); ctx.lineTo(px + 3, cy); ctx.arc(cx, cy, r, Math.PI, 0, true); ctx.lineTo(px + 29, py); }
  else if (l === 'D') { ctx.moveTo(px + 3, py + 32); ctx.lineTo(px + 3, cy); ctx.arc(cx, cy, r, Math.PI, 0); ctx.lineTo(px + 29, py + 32); }
  else ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = DM_DARK[c]; ctx.lineWidth = 2; ctx.stroke();
  g.circle(cx - 5, cy - 5, 3, 'rgba(255,255,255,.6)');
}
function drawVirus(g, x, y, c, s) {
  const t = S.t * 4 + x * 0.05;
  const wob = Math.sin(t) * 2 * s;
  g.circle(x, y, 12 * s + wob * 0.3, DM_COL[c]);
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + t * 0.3; g.circle(x + Math.cos(a) * 13 * s, y + Math.sin(a) * 13 * s, 3 * s, DM_DARK[c]); }
  g.circle(x - 4 * s, y - 2 * s, 3.2 * s, '#fff'); g.circle(x + 4 * s, y - 2 * s, 3.2 * s, '#fff');
  g.circle(x - 4 * s, y - 2 * s + Math.sin(t) * s, 1.6 * s, '#000'); g.circle(x + 4 * s, y - 2 * s + Math.sin(t) * s, 1.6 * s, '#000');
  g.line(x - 4 * s, y + 5 * s, x + 4 * s, y + 5 * s + wob * 0.5, '#000', 1.5 * s);
}
