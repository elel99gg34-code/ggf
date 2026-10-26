let S;
// 물길 잇기 (파이프 드림): 물이 흘러나오기 전에 파이프를 놓아 길게 이어라
const PP_C = 10, PP_R = 7, PP_CS = 64, PP_OX = 250, PP_OY = 120;
// 방향: 0=N 1=E 2=S 3=W, 비트마스크 1,2,4,8
const PP_DX = [0, 1, 0, -1], PP_DY = [-1, 0, 1, 0];
const PP_TYPES = [
  { m: 2 | 8, w: 3 }, // ─
  { m: 1 | 4, w: 3 }, // │
  { m: 1 | 2, w: 2 }, // └
  { m: 2 | 4, w: 2 }, // ┌
  { m: 4 | 8, w: 2 }, // ┐
  { m: 1 | 8, w: 2 }, // ┘
  { m: 15, w: 1 }, // ┼
];
GAME({
  title: '물길 잇기', w: 960, h: 680, bg: '#14532d', controls: 'dpad+ab', aLabel: '놓기', bLabel: '빨리',
  help: '왼쪽 대기열 맨 아래 파이프를 판에 클릭해서 놓아요 (방향키+Space도 가능)\n💧 카운트다운이 끝나면 시작점에서 물이 흘러요 — 물이 새기 전에 길을 이으세요!\n목표 길이 이상 흐르면 다음 레벨, 모자라면 게임 오버\n아직 물이 안 찬 파이프는 덮어쓸 수 있어요(-50점) · ┼ 십자를 두 번 지나면 보너스\nX/Shift 또는 ⏩ 버튼 = 빨리 흘리기(점수 2배)',
  init(g) {
    S = { level: 1 };
    newLevel(g);
  },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.between > 0) {
      S.between -= dt;
      if (S.between <= 0) { S.level++; newLevel(g); }
      return;
    }
    if (S.ending) {
      S.ending -= dt;
      if (S.ending <= 0) {
        S.ending = 0;
        if (S.flowed >= S.need) {
          const bonus = (S.flowed - S.need) * 40 + S.level * 100;
          g.add(bonus); S.lastBonus = bonus;
          let unused = 0;
          for (let y = 0; y < PP_R; y++) for (let x = 0; x < PP_C; x++) { const c = S.grid[y][x]; if (c && c.t >= 0 && !c.flow && !c.start) unused++; }
          if (unused) g.add(-unused * 20);
          S.lastUnused = unused;
          S.between = 2.6; g.sfx.win();
          if (S.level >= 12) return g.win(`12레벨 모두 통과!`);
        } else return g.over(`레벨 ${S.level} · ${S.flowed}/${S.need}칸`);
      }
      return;
    }
    // 입력
    const cx = Math.floor((m.x - PP_OX) / PP_CS), cy = Math.floor((m.y - PP_OY) / PP_CS);
    if (m.clicked && cx >= 0 && cy >= 0 && cx < PP_C && cy < PP_R) { S.cur = [cx, cy]; place(g, cx, cy); }
    if (m.clicked && g.inRect(40, 590, 170, 56)) fast(g);
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) S.cur = [(S.cur[0] + D[k][0] + PP_C) % PP_C, (S.cur[1] + D[k][1] + PP_R) % PP_R];
    if (g.pressed('a')) place(g, S.cur[0], S.cur[1]);
    if (g.pressed('b')) fast(g);
    if (S.cool > 0) S.cool -= dt;
    // 물 흐름
    const spd = S.fast ? 7 : 1;
    if (S.countdown > 0) {
      S.countdown -= dt * spd;
      if (S.countdown <= 0) { g.sfx.tone(200, 0.4, 'sine', 0.06, 500); say('💧 물이 흐르기 시작해요!'); }
    } else {
      S.prog += (dt * spd) / S.cellTime;
      if (S.prog >= 1) { S.prog = 0; advance(g); }
      const hc = S.grid[S.head.y][S.head.x], lf = hc.fill[hc.fill.length - 1];
      if (lf && !S.ending) lf.p = S.prog;
    }
    g.info = `레벨 ${S.level} · 목표 ${S.flowed}/${S.need} · ${S.countdown > 0 ? '⏳' + Math.ceil(S.countdown) + 's' : '💧 흐르는 중'}`;
  },
  draw(g, c) {
    // 판
    g.rrect(PP_OX - 12, PP_OY - 12, PP_C * PP_CS + 24, PP_R * PP_CS + 24, 14, '#365314', '#1a2e05', 4);
    for (let y = 0; y < PP_R; y++) for (let x = 0; x < PP_C; x++) {
      const px = PP_OX + x * PP_CS, py = PP_OY + y * PP_CS;
      g.rect(px + 1, py + 1, PP_CS - 2, PP_CS - 2, (x + y) % 2 ? '#a3a3a3' : '#b5b5b5');
      const cell = S.grid[y][x];
      if (!cell) continue;
      if (cell.rock) { g.emoji('🪨', px + PP_CS / 2, py + PP_CS / 2, 44); continue; }
      drawPipe(g, px, py, cell);
    }
    // 커서 + 미리보기
    const [kx, ky] = S.cur;
    const hov = g.mouse.x >= PP_OX && g.mouse.y >= PP_OY && g.mouse.x < PP_OX + PP_C * PP_CS && g.mouse.y < PP_OY + PP_R * PP_CS;
    const [qx, qy] = hov ? [Math.floor((g.mouse.x - PP_OX) / PP_CS), Math.floor((g.mouse.y - PP_OY) / PP_CS)] : [kx, ky];
    if (!S.ending && !S.between) {
      c.globalAlpha = 0.45;
      if (canPlace(qx, qy)) drawPipe(g, PP_OX + qx * PP_CS, PP_OY + qy * PP_CS, { t: S.queue[0], fill: [] });
      c.globalAlpha = 1;
      g.stroke(PP_OX + qx * PP_CS + 2, PP_OY + qy * PP_CS + 2, PP_CS - 4, PP_CS - 4, canPlace(qx, qy) ? '#fde047' : '#ef4444', 3);
    }
    // 대기열
    g.rrect(40, 120, 170, 450, 14, '#1a2e05', '#365314', 3);
    g.text('다음 파이프', 125, 100, 18, '#d9f99d');
    for (let i = 0; i < S.queue.length; i++) {
      const y = 480 - i * 80;
      g.rrect(85, y, 80, 70, 10, i === 0 ? '#facc15' : '#4d7c0f');
      drawPipe(g, 93, y + 3, { t: S.queue[i], fill: [] }, 64 / PP_CS);
    }
    g.text('▲ 다음  ·  ▼ 지금', 125, 560, 12, '#a3e635', 'center', '600');
    g.button(40, 590, 170, 56, S.fast ? '⏩ 빨리 중!' : '⏩ 빨리 흘리기', S.fast ? '#b91c1c' : '#2563eb', 17);
    // 상단 HUD
    g.text(`레벨 ${S.level}`, PP_OX, 50, 30, '#f7fee7', 'left');
    const need = Math.min(1, S.flowed / S.need);
    g.rrect(PP_OX + 140, 35, 300, 28, 10, '#1a2e05');
    g.rrect(PP_OX + 140, 35, Math.max(14, 300 * need), 28, 10, S.flowed >= S.need ? '#22c55e' : '#38bdf8');
    g.text(`목표 ${S.flowed} / ${S.need}`, PP_OX + 290, 50, 16, '#fff');
    if (S.countdown > 0) {
      g.text(`⏳ ${S.countdown.toFixed(1)}초`, 860, 50, 26, S.countdown < 5 ? '#fca5a5' : '#fef08a', 'right');
      g.rrect(PP_OX + 460, 40, 180 * Math.min(1, S.countdown / S.cd0), 18, 6, '#fde047');
    } else g.text('💧 흐르는 중', 860, 50, 24, '#7dd3fc', 'right');
    g.text(`칸당 ${S.cellTime.toFixed(1)}초`, 860, 85, 14, '#bef264', 'right', '600');
    if (S.msgT > 0) { g.rrect(PP_OX + 120, PP_OY + PP_R * PP_CS + 22, 400, 44, 12, 'rgba(0,0,0,.6)'); g.text(S.msg, PP_OX + 320, PP_OY + PP_R * PP_CS + 44, 17, '#fff'); }
    if (S.between > 0) {
      g.rrect(PP_OX + 120, 250, 400, 170, 20, 'rgba(20,83,45,.95)', '#a3e635', 3);
      g.text(`🎉 레벨 ${S.level} 통과!`, PP_OX + 320, 290, 30, '#fff');
      g.text(`흐른 길이 ${S.flowed}칸 · 보너스 +${S.lastBonus}`, PP_OX + 320, 335, 18, '#d9f99d');
      if (S.lastUnused) g.text(`안 쓴 파이프 ${S.lastUnused}개 -${S.lastUnused * 20}`, PP_OX + 320, 365, 16, '#fca5a5');
      g.text('다음 레벨: 더 빠르게!', PP_OX + 320, 395, 16, '#fde68a');
    }
  },
});

function drawPipe(g, px, py, cell, sc = 1) {
  const s = PP_CS * sc, cx = px + s / 2, cy = py + s / 2;
  const m = cell.start ? 1 << cell.dir : PP_TYPES[cell.t].m;
  const ctx = g.ctx;
  const w = s * 0.34;
  ctx.lineCap = 'butt';
  for (let d = 0; d < 4; d++) if (m & (1 << d)) {
    g.line(cx, cy, cx + PP_DX[d] * s / 2, cy + PP_DY[d] * s / 2, '#57534e', w + 6);
  }
  for (let d = 0; d < 4; d++) if (m & (1 << d)) g.line(cx, cy, cx + PP_DX[d] * s / 2, cy + PP_DY[d] * s / 2, '#d6d3d1', w);
  if (m !== 15 || cell.start) g.circle(cx, cy, w / 2 + 3, cell.start ? '#0369a1' : '#a8a29e');
  // 물
  for (const f of cell.fill || []) {
    const [a, b] = f.path, p = f.p;
    const ax = cx + PP_DX[a] * s / 2, ay = cy + PP_DY[a] * s / 2, bx = cx + PP_DX[b] * s / 2, by = cy + PP_DY[b] * s / 2;
    const ww = w * 0.6;
    if (a < 0) { g.line(cx, cy, cx + (bx - cx) * p, cy + (by - cy) * p, '#38bdf8', ww); continue; }
    if (p <= 0.5) g.line(ax, ay, ax + (cx - ax) * p * 2, ay + (cy - ay) * p * 2, '#38bdf8', ww);
    else { g.line(ax, ay, cx, cy, '#38bdf8', ww); g.line(cx, cy, cx + (bx - cx) * (p - 0.5) * 2, cy + (by - cy) * (p - 0.5) * 2, '#38bdf8', ww); g.circle(cx, cy, ww / 2, '#38bdf8'); }
  }
  if (cell.start) g.emoji('💧', cx, cy, s * 0.4);
}
function newLevel(g) {
  const L = S.level;
  S.grid = U.grid(PP_C, PP_R, null);
  // 시작점: 가장자리에서 조금 떨어진 곳
  let sx, sy, dir;
  do {
    sx = U.randi(1, PP_C - 2); sy = U.randi(1, PP_R - 2); dir = U.randi(0, 3);
  } while (sx + PP_DX[dir] * 2 < 0 || sx + PP_DX[dir] * 2 >= PP_C || sy + PP_DY[dir] * 2 < 0 || sy + PP_DY[dir] * 2 >= PP_R);
  S.grid[sy][sx] = { start: true, dir, fill: [], flow: true };
  // 바위
  const rocks = Math.min(10, Math.max(0, L - 1) + (L > 4 ? 2 : 0));
  for (let i = 0; i < rocks; i++) {
    const x = U.randi(0, PP_C - 1), y = U.randi(0, PP_R - 1);
    if (S.grid[y][x] || (Math.abs(x - sx) + Math.abs(y - sy) < 3)) continue;
    S.grid[y][x] = { rock: true };
  }
  S.queue = []; for (let i = 0; i < 5; i++) S.queue.push(randPiece());
  S.head = { x: sx, y: sy, out: dir, enter: -1 };
  S.grid[sy][sx].fill.push({ path: [-1, dir], p: 0 });
  S.need = Math.min(30, 8 + L * 2);
  S.cd0 = S.countdown = Math.max(8, 26 - L * 1.5);
  S.cellTime = Math.max(0.7, 2.6 - L * 0.17);
  S.prog = 0; S.flowed = 0; S.fast = false; S.ending = 0; S.between = 0; S.cool = 0;
  S.cur = [sx, sy]; S.msg = `레벨 ${L} — ${S.need}칸 이상 흘려 보내요!`; S.msgT = 2.5;
}
function randPiece() {
  const tot = PP_TYPES.reduce((a, t) => a + t.w, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < PP_TYPES.length; i++) { r -= PP_TYPES[i].w; if (r < 0) return i; }
  return 0;
}
function canPlace(x, y) {
  if (x < 0 || y < 0 || x >= PP_C || y >= PP_R) return false;
  const c = S.grid[y][x];
  return !c || (!c.rock && !c.start && !c.flow);
}
function place(g, x, y) {
  if (S.ending || S.between || S.cool > 0) return;
  if (!canPlace(x, y)) { g.sfx.beep(150, 0.06); return; }
  const old = S.grid[y][x];
  if (old) {
    g.add(-50, PP_OX + x * PP_CS + 32, PP_OY + y * PP_CS + 20);
    g.burst(PP_OX + x * PP_CS + 32, PP_OY + y * PP_CS + 32, ['#a8a29e', '#57534e', '#f97316'], 16, 200, 0.5, 4);
    g.sfx.explode(); g.shake(4); S.cool = 0.35;
  } else g.sfx.drop();
  S.grid[y][x] = { t: S.queue.shift(), fill: [], flow: false, uses: 0 };
  S.queue.push(randPiece());
}
function fast(g) {
  if (S.fast || S.ending) return;
  S.fast = true; g.sfx.power(); say('⏩ 빨리 흘리기! 점수 2배');
}
// 물이 한 칸을 다 채움 → 다음 칸으로
function advance(g) {
  const h = S.head;
  const cur = S.grid[h.y][h.x];
  const f = cur.fill[cur.fill.length - 1];
  if (f) f.p = 1;
  const nx = h.x + PP_DX[h.out], ny = h.y + PP_DY[h.out];
  const enter = (h.out + 2) % 4;
  const nc = nx >= 0 && ny >= 0 && nx < PP_C && ny < PP_R ? S.grid[ny][nx] : null;
  if (!nc || nc.rock || nc.start || !(PP_TYPES[nc.t].m & (1 << enter)) || (nc.flow && PP_TYPES[nc.t].m !== 15) || (nc.fill || []).some((q) => q.path[0] === enter || q.path[1] === enter)) {
    // 새어 나옴
    S.ending = 1.4;
    const px = PP_OX + h.x * PP_CS + PP_CS / 2 + PP_DX[h.out] * PP_CS / 2, py = PP_OY + h.y * PP_CS + PP_CS / 2 + PP_DY[h.out] * PP_CS / 2;
    g.burst(px, py, ['#38bdf8', '#7dd3fc', '#fff'], 40, 260, 1.2, 4);
    g.sfx.noise(0.8, 0.12); g.shake(5);
    say(S.flowed >= S.need ? '물이 넘쳤어요 — 목표 달성!' : '💦 물이 샜어요!');
    return;
  }
  let out;
  const m = PP_TYPES[nc.t].m;
  if (m === 15) out = (enter + 2) % 4;
  else for (let d = 0; d < 4; d++) if (d !== enter && m & (1 << d)) out = d;
  if (nc.flow) { // 십자 두 번째 통과
    const b = S.fast ? 1000 : 500;
    g.add(b, PP_OX + nx * PP_CS + 32, PP_OY + ny * PP_CS); g.sfx.coin();
    say('┼ 십자 교차 보너스!');
  }
  nc.flow = true;
  nc.fill.push({ path: [enter, out], p: 0 });
  S.head = { x: nx, y: ny, out };
  S.flowed++;
  const pts = S.fast ? 100 : 50;
  g.add(pts, PP_OX + nx * PP_CS + 32, PP_OY + ny * PP_CS + 10);
  g.sfx.tone(300 + S.flowed * 15, 0.06, 'sine', 0.05);
  if (S.flowed === S.need) { g.sfx.power(); say('✅ 목표 달성! 계속 이으면 보너스'); g.burst(PP_OX + nx * PP_CS + 32, PP_OY + ny * PP_CS + 32, '#22c55e', 20, 200, 0.8); }
}
function say(t) { S.msg = t; S.msgT = 2.2; }
