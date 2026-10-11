'use strict';
let S;
const CL_W = 6, CL_H = 13, CL_C = 42, CL_X = 354, CL_Y = 56;
const CL_COL = [null, '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316', '#ec4899'];
const CL_GEM = [null, '♦', '●', '▲', '★', '◆', '■', '♥'];
const CL_DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
GAME({
  title: '보석 기둥', w: 960, h: 640, bg: '#120a24', controls: 'dpad+ab', aLabel: '⤓', bLabel: '🔄',
  help: '←→ 이동 · ↓ 빠르게 · Space 즉시 낙하\n↑ / X / Shift 보석 순서 바꾸기 (터치: 탭)\n가로·세로·대각선으로 같은 보석 3개 이상이면 사라져요 · 연쇄 보너스!\n🌈 마법 보석: 떨어진 아래 보석과 같은 색을 전부 제거\n보석 30개마다 레벨업 · 맨 위까지 쌓이면 게임 오버',
  init(g) {
    S = { grid: U.grid(CL_W, CL_H, 0), level: 1, cleared: 0, colors: 5, phase: 'spawn', t: 0, timer: 0, pops: [], chain: 0, maxChain: 0, next: null, cur: null, das: 0, dasDir: 0, msg: '', msgT: 0, magicIn: 40, anim: [], hide: new Set(), total: 0 };
    S.next = genPiece();
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    g.info = `레벨 ${S.level} · 보석 ${S.cleared}`;
    if (S.phase === 'spawn') return spawn(g);
    if (S.phase === 'play') return play(g, dt);
    S.timer -= dt; if (S.timer > 0) return;
    if (S.phase === 'pop') { for (const [x, y] of S.pops) S.grid[y][x] = 0; S.pops = []; startFall(); }
    else if (S.phase === 'fall') { S.anim = []; S.hide.clear(); resolve(g); }
  },
  draw(g, c) {
    // bg sparkles
    for (let i = 0; i < 40; i++) { const x = (i * 197) % 960, y = (i * 113 + S.t * 10 * (1 + i % 3)) % 640; g.circle(x, y, 1 + (i % 3) * 0.5, `rgba(255,255,255,${0.15 + 0.1 * Math.sin(S.t * 3 + i)})`); }
    // pillars frame
    const bw = CL_W * CL_C, bh = CL_H * CL_C;
    g.rrect(CL_X - 16, CL_Y - 16, bw + 32, bh + 32, 8, '#3b2a14', '#d4a017', 4);
    g.rect(CL_X, CL_Y, bw, bh, '#0b0618');
    for (let x = 0; x < CL_W; x++) for (let y = 0; y < CL_H; y++) if ((x + y) % 2) g.rect(CL_X + x * CL_C, CL_Y + y * CL_C, CL_C, CL_C, 'rgba(255,255,255,.02)');
    const ps = new Set(S.pops.map(([x, y]) => y * 10 + x));
    for (let y = 0; y < CL_H; y++) for (let x = 0; x < CL_W; x++) {
      const v = S.grid[y][x]; if (!v || S.hide.has(y * 10 + x)) continue;
      if (ps.has(y * 10 + x)) { const k = Math.max(0, S.timer / 0.45); g.ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(S.t * 25)); gem(g, CL_X + x * CL_C, CL_Y + y * CL_C, v, 1 + (1 - k) * 0.3); g.ctx.globalAlpha = 1; continue; }
      gem(g, CL_X + x * CL_C, CL_Y + y * CL_C, v, 1);
    }
    if (S.phase === 'fall') { const k = 1 - Math.max(0, S.timer) / S.tt; for (const a of S.anim) gem(g, CL_X + a.x * CL_C, CL_Y + U.lerp(a.from, a.to, k * k) * CL_C, a.v, 1); }
    if (S.cur && S.phase === 'play') {
      const cu = S.cur;
      let gy = cu.y; while (free(cu.x, gy + 1)) gy++;
      for (let i = 0; i < 3; i++) { const yy = gy - 2 + i; if (yy >= 0) g.rrect(CL_X + cu.x * CL_C + 4, CL_Y + yy * CL_C + 4, CL_C - 8, CL_C - 8, 6, null, 'rgba(255,255,255,.25)', 2); }
      const fy = free(cu.x, cu.y + 1) ? Math.min(0.95, S.fall) : 0;
      for (let i = 0; i < 3; i++) { const yy = cu.y - 2 + i + fy; if (yy > -1) gem(g, CL_X + cu.x * CL_C, CL_Y + yy * CL_C, cu.j[i], 1); }
    }
    g.rect(CL_X - 16, CL_Y - 60, bw + 32, 44, '#120a24');
    // side
    g.rrect(110, 60, 180, 230, 12, '#1e1238', '#d4a017', 2);
    g.text('NEXT', 200, 84, 16, '#fcd34d');
    if (S.next) for (let i = 0; i < 3; i++) gem(g, 179, 104 + i * CL_C, S.next[i], 1);
    g.rrect(110, 310, 180, 270, 12, '#1e1238', '#d4a017', 2);
    g.text('레벨', 200, 340, 15, '#c4b5fd'); g.text(S.level, 200, 375, 36, '#fff');
    g.text('제거한 보석', 200, 420, 15, '#c4b5fd'); g.text(S.cleared, 200, 450, 26, '#fff');
    g.text(`다음 레벨까지 ${30 - S.cleared % 30}`, 200, 490, 13, '#a78bfa');
    g.text(`최대 연쇄 ${S.maxChain}`, 200, 520, 14, '#f9a8d4');
    g.text(`🌈 까지 ${Math.max(0, S.magicIn)}`, 200, 550, 13, '#93c5fd');
    g.rrect(670, 60, 200, 300, 12, '#1e1238', '#d4a017', 2);
    g.text('보석 종류', 770, 84, 15, '#fcd34d');
    for (let i = 1; i <= S.colors; i++) gem(g, 690 + ((i - 1) % 3) * 56, 110 + Math.floor((i - 1) / 3) * 56, i, 1);
    g.text('3개 이상 일렬로!', 770, 240, 14, '#e9d5ff');
    g.text('↔ ↕ ⤡ ⤢', 770, 270, 22, '#e9d5ff');
    g.text('연쇄 = 점수 x 배수', 770, 310, 13, '#c4b5fd');
    if (S.msgT > 0) g.text(S.msg, CL_X + bw / 2, CL_Y + 220, 30, '#fde047');
  },
});
function genPiece() {
  S.magicIn--;
  if (S.magicIn <= 0) { S.magicIn = 45 + U.randi(0, 20); return [8, 8, 8]; }
  return [U.randi(1, S.colors), U.randi(1, S.colors), U.randi(1, S.colors)];
}
function free(x, y) { return x >= 0 && x < CL_W && y < CL_H && (y < 0 || !S.grid[y][x]); }
function spawn(g) {
  S.cur = { x: 2, y: 0, j: S.next }; S.next = genPiece(); S.fall = 0; S.lock = 0; S.chain = 0;
  if (S.grid[0][2]) { S.phase = 'dead'; g.shake(12, 0.5); return g.over(`레벨 ${S.level} · 보석 ${S.cleared}개`); }
  S.phase = 'play';
}
function play(g, dt) {
  const cu = S.cur;
  const dir = (g.held('right') ? 1 : 0) - (g.held('left') ? 1 : 0);
  const mv = (d) => { if (free(cu.x + d, cu.y) && free(cu.x + d, cu.y - 1) && free(cu.x + d, cu.y - 2)) { cu.x += d; g.sfx.tone(300, 0.02, 'sine', 0.04); } };
  if (g.pressed('left') || g.swiped === 'left') { mv(-1); S.dasDir = -1; S.das = 0; }
  else if (g.pressed('right') || g.swiped === 'right') { mv(1); S.dasDir = 1; S.das = 0; }
  else if (dir && dir === S.dasDir) { S.das += dt; if (S.das > 0.18) { S.das -= 0.055; mv(dir); } }
  else { S.dasDir = dir; S.das = 0; }
  if (g.pressed('up') || g.pressed('b') || (g.mouse.clicked && !g.swiped)) { cu.j.unshift(cu.j.pop()); g.sfx.tone(660, 0.04, 'triangle', 0.05); }
  if (g.pressed('a') || g.swiped === 'down') { let n = 0; while (free(cu.x, cu.y + 1)) { cu.y++; n++; } g.score += n * 2; g.sfx.drop(); return land(g); }
  const sp = Math.max(0.06, 0.75 - (S.level - 1) * 0.06);
  S.fall += dt / (g.held('down') ? 0.035 : sp);
  while (S.fall >= 1) {
    S.fall -= 1;
    if (free(cu.x, cu.y + 1)) { cu.y++; if (g.held('down')) g.score += 1; }
    else { S.fall = 0; S.lock++; if (S.lock >= 1) return land(g); }
  }
}
function land(g) {
  const cu = S.cur;
  if (cu.y - 2 < 0) { for (let i = 0; i < 3; i++) if (cu.y - 2 + i >= 0) S.grid[cu.y - 2 + i][cu.x] = cu.j[i]; S.cur = null; S.phase = 'dead'; g.shake(12, 0.5); g.sfx.lose(); return g.over(`레벨 ${S.level} · 보석 ${S.cleared}개`); }
  for (let i = 0; i < 3; i++) S.grid[cu.y - 2 + i][cu.x] = cu.j[i];
  S.cur = null;
  g.sfx.tone(170, 0.05, 'sine', 0.06);
  if (cu.j[0] === 8) {
    const below = cu.y + 1 < CL_H ? S.grid[cu.y + 1][cu.x] : 0;
    S.pops = [];
    for (let i = 0; i < 3; i++) S.pops.push([cu.x, cu.y - 2 + i]);
    if (below) { for (let y = 0; y < CL_H; y++) for (let x = 0; x < CL_W; x++) if (S.grid[y][x] === below) S.pops.push([x, y]); S.msg = '🌈 마법 보석!'; S.msgT = 1.3; }
    const n = S.pops.length - 3;
    g.add(n * 30 * S.level, CL_X + 126, CL_Y + 300); addCleared(g, n);
    g.sfx.power(); g.shake(6, 0.3); g.burst(CL_X + cu.x * CL_C + 21, CL_Y + cu.y * CL_C, ['#f472b6', '#60a5fa', '#fde047', '#4ade80'], 40, 300, 1);
    S.phase = 'pop'; S.timer = 0.45;
    return;
  }
  resolve(g);
}
function resolve(g) {
  const G = S.grid, mark = new Set();
  for (let y = 0; y < CL_H; y++) for (let x = 0; x < CL_W; x++) {
    const v = G[y][x]; if (!v || v === 8) continue;
    for (const [dx, dy] of CL_DIRS) {
      const px = x - dx, py = y - dy;
      if (px >= 0 && px < CL_W && py >= 0 && py < CL_H && G[py][px] === v) continue;
      let n = 0; while (x + dx * n >= 0 && x + dx * n < CL_W && y + dy * n >= 0 && y + dy * n < CL_H && G[y + dy * n][x + dx * n] === v) n++;
      if (n >= 3) for (let k = 0; k < n; k++) mark.add((y + dy * k) * 10 + x + dx * k);
    }
  }
  if (!mark.size) {
    if (S.chain >= 2) { S.msg = `${S.chain} 연쇄!`; S.msgT = 1.2; }
    S.phase = 'spawn'; return;
  }
  S.chain++; S.maxChain = Math.max(S.maxChain, S.chain);
  S.pops = [...mark].map((k) => [k % 10, Math.floor(k / 10)]);
  const n = S.pops.length;
  const pts = n * 10 * S.level * S.chain * (n > 3 ? 1 + (n - 3) * 0.5 : 1);
  g.add(Math.round(pts), CL_X + 126, CL_Y + 260);
  addCleared(g, n);
  for (const [x, y] of S.pops) g.burst(CL_X + x * CL_C + 21, CL_Y + y * CL_C + 21, CL_COL[G[y][x]], 8, 200, 0.6);
  g.sfx.tone(440 + S.chain * 110, 0.14, 'square', 0.07, 880 + S.chain * 100);
  if (S.chain >= 2) g.shake(2 + S.chain * 2, 0.25);
  S.phase = 'pop'; S.timer = 0.45;
}
function addCleared(g, n) {
  const before = Math.floor(S.cleared / 30);
  S.cleared += n;
  if (Math.floor(S.cleared / 30) > before) {
    S.level++; S.msg = `LEVEL UP! ${S.level}`; S.msgT = 1.5; g.sfx.win();
    if (S.level >= 4) S.colors = 6;
    if (S.level >= 8) S.colors = 7;
  }
}
function startFall() {
  S.anim = []; let m = 0;
  for (let x = 0; x < CL_W; x++) {
    let w = CL_H - 1;
    for (let y = CL_H - 1; y >= 0; y--) if (S.grid[y][x]) {
      if (w !== y) { S.grid[w][x] = S.grid[y][x]; S.grid[y][x] = 0; S.anim.push({ x, from: y, to: w, v: S.grid[w][x] }); m = Math.max(m, w - y); }
      w--;
    }
  }
  S.hide = new Set(S.anim.map((a) => a.to * 10 + a.x));
  S.phase = 'fall'; S.timer = m ? 0.06 + m * 0.04 : 0.01; S.tt = S.timer;
}
function gem(g, x, y, v, s) {
  const cx = x + CL_C / 2, cy = y + CL_C / 2, r = 18 * s;
  if (v === 8) {
    const h = (S.t * 200) % 360;
    g.poly([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], `hsl(${h},90%,60%)`, '#fff', 2);
    g.text('🌈', cx, cy, 16);
    return;
  }
  const col = CL_COL[v];
  const pts = [[cx - r * 0.6, cy - r], [cx + r * 0.6, cy - r], [cx + r, cy - r * 0.2], [cx, cy + r], [cx - r, cy - r * 0.2]];
  if (v % 2) g.poly([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], col, 'rgba(255,255,255,.5)', 1.5);
  else if (v === 2 || v === 6) g.rrect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, 8 * s, col, 'rgba(255,255,255,.5)', 1.5);
  else g.poly(pts, col, 'rgba(255,255,255,.5)', 1.5);
  g.poly([[cx - r * 0.5, cy - r * 0.5], [cx, cy - r * 0.7], [cx - r * 0.1, cy - r * 0.1]], 'rgba(255,255,255,.55)');
  g.text(CL_GEM[v], cx, cy + 2, 12 * s, 'rgba(0,0,0,.35)');
}
