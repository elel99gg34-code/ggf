let S;
// 레이저 반사: 거울을 돌리고 놓아 모든 레이저가 목표에 닿게
const LZ_C = 10, LZ_R = 8, LZ_CS = 66, LZ_OX = 30, LZ_OY = 60, LZ_LEVELS = 15;
const LZ_DX = [0, 1, 0, -1], LZ_DY = [-1, 0, 1, 0];
const LZ_COL = ['#ef4444', '#22c55e', '#3b82f6', '#eab308'];
// '/' : N→E, E→N, S→W, W→S   '\' : N→W, W→N, S→E, E→S
const LZ_REF = { '/': [1, 0, 3, 2], '\\': [3, 2, 1, 0] };
GAME({
  title: '레이저 반사', w: 960, h: 680, bg: '#020617', controls: 'none',
  help: '거울을 클릭하면 / ↔ \\ 방향이 바뀌어요 (🔒 잠긴 거울은 고정)\n보관함에 거울이 있으면 빈 칸을 클릭해 놓을 수 있어요 · 놓은 거울은 클릭=회전, 우클릭=회수\n모든 🎯 목표에 같은 색 레이저를 맞히면 클리어! 💣 폭탄에 닿으면 안 돼요\nU = 되돌리기 · H = 힌트 · 적은 조작으로 풀수록 고득점',
  init(g) { S = { mode: 'select', lvl: 0, unlocked: g.load('unlocked', 1), stars: g.load('stars', {}), msg: '', msgT: 0 }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'select') {
      for (let i = 0; i < LZ_LEVELS; i++) {
        const x = 130 + (i % 5) * 145, y = 200 + Math.floor(i / 5) * 130;
        if (i < S.unlocked && g.clickIn(x, y, 125, 110)) { S.lvl = i; loadLevel(g); g.sfx.click(); }
      }
      g.info = '레벨을 고르세요';
      return;
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        S.lvl++;
        if (S.lvl >= LZ_LEVELS) return g.win('모든 레이저 퍼즐 정복!');
        S.unlocked = Math.max(S.unlocked, S.lvl + 1); g.save('unlocked', S.unlocked);
        loadLevel(g);
      }
      return;
    }
    S.time += dt;
    const cx = Math.floor((m.x - LZ_OX) / LZ_CS), cy = Math.floor((m.y - LZ_OY) / LZ_CS);
    const inB = m.x >= LZ_OX && m.y >= LZ_OY && cx < LZ_C && cy < LZ_R;
    if (inB && m.clicked) clickCell(g, cx, cy, false);
    if (inB && m.rclick) clickCell(g, cx, cy, true);
    if (m.clicked) {
      if (g.inRect(720, 360, 220, 50)) undo(g);
      if (g.inRect(720, 420, 220, 50)) hint(g);
      if (g.inRect(720, 480, 220, 50)) { pushUndo(); S.cells = S.startCells.map((r) => r.map((c) => (c ? { ...c } : null))); S.inv = S.startInv; retrace(g); }
      if (g.inRect(720, 600, 105, 44)) S.mode = 'select';
      if (g.inRect(835, 600, 105, 44)) { g.add(-100); S.clear = 0.01; }
    }
    if (g.keyp('KeyU') || g.pressed('b')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `레벨 ${S.lvl + 1}/${LZ_LEVELS} · 목표 ${S.hit}/${S.targets} · 조작 ${S.ops} · 보관함 ${S.inv}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🔦 레이저 반사', 480, 80, 46, '#e0f2fe');
      g.text('거울을 돌려 레이저를 목표에 맞히세요', 480, 135, 18, '#7dd3fc', 'center', '600');
      for (let i = 0; i < LZ_LEVELS; i++) {
        const x = 130 + (i % 5) * 145, y = 200 + Math.floor(i / 5) * 130, open = i < S.unlocked;
        g.rrect(x, y, 125, 110, 14, open ? (g.inRect(x, y, 125, 110) ? '#0e7490' : '#164e63') : '#0b1324', open ? '#22d3ee' : '#1e293b');
        g.text(open ? String(i + 1) : '🔒', x + 62, y + 45, 32, open ? '#ecfeff' : '#334155');
        const st = S.stars[i] || 0;
        if (st) g.text('⭐'.repeat(st), x + 62, y + 88, 15);
      }
      return;
    }
    // 판
    g.rrect(LZ_OX - 8, LZ_OY - 8, LZ_C * LZ_CS + 16, LZ_R * LZ_CS + 16, 12, '#0f172a', '#1e3a5f', 2);
    for (let y = 0; y < LZ_R; y++) for (let x = 0; x < LZ_C; x++) {
      const px = LZ_OX + x * LZ_CS, py = LZ_OY + y * LZ_CS;
      g.rect(px + 1, py + 1, LZ_CS - 2, LZ_CS - 2, (x + y) % 2 ? '#0b1222' : '#0d1528');
    }
    // 레이저
    c.lineCap = 'round';
    for (const b of S.beams) {
      const col = LZ_COL[b.col];
      for (const [w, a] of [[14, 0.12], [8, 0.25], [3, 1]]) {
        c.globalAlpha = a * (0.85 + Math.sin(g.time * 12) * 0.15);
        c.strokeStyle = a === 1 ? '#fff' : col; c.lineWidth = w; c.beginPath();
        b.pts.forEach(([x, y], i) => { const px = LZ_OX + x * LZ_CS, py = LZ_OY + y * LZ_CS; i ? c.lineTo(px, py) : c.moveTo(px, py); });
        c.stroke();
      }
      c.globalAlpha = 1;
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
      b.pts.forEach(([x, y], i) => { const px = LZ_OX + x * LZ_CS, py = LZ_OY + y * LZ_CS; i ? c.lineTo(px, py) : c.moveTo(px, py); });
      c.stroke();
    }
    // 오브젝트
    for (let y = 0; y < LZ_R; y++) for (let x = 0; x < LZ_C; x++) {
      const o = S.cells[y][x];
      if (!o) continue;
      const px = LZ_OX + x * LZ_CS + LZ_CS / 2, py = LZ_OY + y * LZ_CS + LZ_CS / 2, h = LZ_CS * 0.38;
      if (o.k === 'm') {
        const d = o.v === '/' ? 1 : -1;
        if (S.hintCell && S.hintCell[0] === x && S.hintCell[1] === y && S.hintT > 0) g.circle(px, py, LZ_CS * 0.46, 'rgba(74,222,128,.35)');
        g.circle(px, py, LZ_CS * 0.42, o.lock ? '#1e293b' : o.placed ? '#3b0764' : '#172554');
        g.line(px - h, py + h * d, px + h, py - h * d, '#94a3b8', 9);
        g.line(px - h, py + h * d, px + h, py - h * d, o.lock ? '#cbd5e1' : '#e0f2fe', 5);
        if (o.lock) g.text('🔒', px + h, py + h, 12);
        else g.ring(px, py, LZ_CS * 0.42, o.placed ? '#c084fc' : '#38bdf8', 2);
      } else if (o.k === 'src') {
        g.rrect(px - h, py - h, h * 2, h * 2, 8, '#334155', LZ_COL[o.col], 3);
        g.poly([[px + LZ_DX[o.d] * h * 1.2, py + LZ_DY[o.d] * h * 1.2], [px + LZ_DY[o.d] * h * 0.6, py - LZ_DX[o.d] * h * 0.6], [px - LZ_DY[o.d] * h * 0.6, py + LZ_DX[o.d] * h * 0.6]], LZ_COL[o.col]);
      } else if (o.k === 'tgt') {
        const on = S.hitSet.has(x + ',' + y);
        g.circle(px, py, h * 1.05, on ? LZ_COL[o.col] : '#1e293b');
        g.ring(px, py, h * 1.05, LZ_COL[o.col], 3);
        g.ring(px, py, h * 0.6, LZ_COL[o.col], 3);
        g.circle(px, py, h * 0.25, on ? '#fff' : LZ_COL[o.col]);
        if (on) g.ring(px, py, h * (1.2 + (g.time * 2) % 0.6), LZ_COL[o.col], 2);
      } else if (o.k === 'wall') {
        g.rrect(px - LZ_CS / 2 + 4, py - LZ_CS / 2 + 4, LZ_CS - 8, LZ_CS - 8, 6, '#475569', '#64748b');
        g.line(px - 20, py - 6, px + 20, py - 6, '#334155', 3); g.line(px - 20, py + 10, px + 20, py + 10, '#334155', 3);
      } else if (o.k === 'bomb') {
        g.emoji(S.boom.has(x + ',' + y) && Math.floor(g.time * 8) % 2 ? '💥' : '💣', px, py, 40);
      }
    }
    // 패널
    g.rrect(705, 20, 245, 640, 16, '#0f172a', '#1e3a5f');
    g.text('레이저 반사', 827, 58, 26, '#e0f2fe');
    g.text(`레벨 ${S.lvl + 1} / ${LZ_LEVELS}`, 827, 95, 18, '#22d3ee');
    g.text(`🎯 ${S.hit} / ${S.targets}`, 827, 145, 30, S.hit === S.targets ? '#4ade80' : '#f8fafc');
    if (S.boom.size) g.text('💣 폭탄에 닿았어요!', 827, 185, 17, '#f87171');
    g.text(`조작 ${S.ops}  (기준 ${S.par})`, 827, 215, 17, '#94a3b8', 'center', '600');
    g.text(`⏱️ ${U.fmtTime(S.time)}  💡${S.hintsUsed}`, 827, 243, 16, '#94a3b8', 'center', '600');
    g.rrect(725, 270, 205, 70, 12, '#1e1b4b', '#7c3aed');
    g.text('보관함 거울', 827, 290, 14, '#c4b5fd', 'center', '600');
    for (let i = 0; i < S.inv; i++) { const ix = 827 - (S.inv - 1) * 15 + i * 30; g.line(ix - 9, 328, ix + 9, 310, '#e9d5ff', 4); }
    if (!S.inv) g.text('없음', 827, 318, 15, '#6d28d9');
    g.button(720, 360, 220, 50, `↶ 되돌리기 (${S.undo.length})`, '#334155', 17);
    g.button(720, 420, 220, 50, '💡 힌트', '#15803d', 17);
    g.button(720, 480, 220, 50, '⟲ 처음부터', '#475569', 17);
    g.button(720, 600, 105, 44, '레벨', '#1e293b', 15);
    g.button(835, 600, 105, 44, '건너뛰기', '#1e293b', 15);
    if (S.msgT > 0) { g.rrect(170, 608, 380, 46, 12, 'rgba(15,23,42,.92)', '#334155'); g.text(S.msg, 360, 631, 17, '#fff'); }
    if (S.clear > 0) {
      g.rrect(160, 240, 400, 150, 20, 'rgba(2,6,23,.92)', '#22d3ee', 3);
      g.text('⚡ 모든 목표 명중!', 360, 282, 30, '#ecfeff');
      g.text('⭐'.repeat(S.lastStars) + '☆'.repeat(3 - S.lastStars), 360, 325, 26, '#facc15');
      g.text(`+${S.lastPts}점`, 360, 362, 20, '#fde68a');
    }
  },
});

function genLevel(L) {
  const nSrc = L < 4 ? 1 : L < 9 ? 2 : 3;
  const turns = Math.min(6, 2 + Math.floor(L / 2));
  for (let att = 0; att < 500; att++) {
    const cells = U.grid(LZ_C, LZ_R, null);
    const used = U.grid(LZ_C, LZ_R, 0); // 1 = 경로(직진), 2 = 점유
    const sol = [];
    let ok = true;
    for (let s = 0; s < nSrc && ok; s++) {
      let built = false;
      for (let t2 = 0; t2 < 80 && !built; t2++) {
        let x = U.randi(0, LZ_C - 1), y = U.randi(0, LZ_R - 1), d = U.randi(0, 3);
        if (used[y][x]) continue;
        const path = [[x, y]], mirrors = [];
        const occ = new Set([x + ',' + y]);
        let fail = false;
        const myTurns = turns - (s > 0 ? 1 : 0);
        for (let k = 0; k <= myTurns && !fail; k++) {
          const len = U.randi(1, 4);
          for (let i = 0; i < len; i++) {
            x += LZ_DX[d]; y += LZ_DY[d];
            if (x < 0 || y < 0 || x >= LZ_C || y >= LZ_R || used[y][x] === 2 || occ.has(x + ',' + y)) { fail = true; break; }
            path.push([x, y]); occ.add(x + ',' + y);
          }
          if (fail) break;
          if (k < myTurns) {
            const nd = (d + (Math.random() < 0.5 ? 1 : 3)) % 4;
            if (used[y][x]) { fail = true; break; }
            const v = LZ_REF['/'][d] === nd ? '/' : '\\';
            mirrors.push({ x, y, v });
            d = nd;
          }
        }
        if (fail) continue;
        const [tx, ty] = path[path.length - 1];
        if (used[ty][tx] || mirrors.some((mm) => mm.x === tx && mm.y === ty)) continue;
        // 확정
        const [sx, sy] = path[0];
        const sd = (() => { const [ax, ay] = path[1]; return LZ_DX.findIndex((dx, i) => dx === ax - sx && LZ_DY[i] === ay - sy); })();
        cells[sy][sx] = { k: 'src', d: sd, col: s };
        cells[ty][tx] = { k: 'tgt', col: s };
        used[sy][sx] = used[ty][tx] = 2;
        for (const mm of mirrors) { cells[mm.y][mm.x] = { k: 'm', v: mm.v }; used[mm.y][mm.x] = 2; sol.push(mm); }
        for (const [px, py] of path) if (!used[py][px]) used[py][px] = 1;
        built = true;
      }
      if (!built) ok = false;
    }
    if (!ok) continue;
    // 장애물/함정/미끼 거울
    const free = [];
    for (let y = 0; y < LZ_R; y++) for (let x = 0; x < LZ_C; x++) if (!used[y][x]) free.push([x, y]);
    U.shuffle(free);
    const nDecoy = Math.min(free.length, 2 + Math.floor(L * 0.8)), nWall = 2 + (L % 4), nBomb = L >= 2 ? Math.min(5, 1 + Math.floor(L / 3)) : 0;
    let fi = 0;
    for (let i = 0; i < nDecoy && fi < free.length; i++, fi++) { const [x, y] = free[fi]; cells[y][x] = { k: 'm', v: Math.random() < 0.5 ? '/' : '\\' }; }
    for (let i = 0; i < nWall && fi < free.length; i++, fi++) { const [x, y] = free[fi]; cells[y][x] = { k: 'wall' }; }
    for (let i = 0; i < nBomb && fi < free.length; i++, fi++) { const [x, y] = free[fi]; cells[y][x] = { k: 'bomb' }; }
    // 해답 검증
    const tr = trace(cells);
    if (tr.hit !== nSrc || tr.boom.size) continue;
    // 잠긴 거울: 해답 거울 일부를 잠금 (힌트 역할)
    const lockN = Math.max(0, Math.floor(sol.length * (L < 3 ? 0.4 : 0.15)));
    U.shuffle(sol).slice(0, lockN).forEach((mm) => (cells[mm.y][mm.x].lock = true));
    // 보관함으로 빼기
    let inv = 0;
    if (L >= 4) {
      const cand = sol.filter((mm) => !cells[mm.y][mm.x].lock);
      const nInv = Math.min(cand.length, 1 + Math.floor((L - 4) / 3));
      U.shuffle(cand).slice(0, nInv).forEach((mm) => { cells[mm.y][mm.x] = null; inv++; });
    }
    // 섞기
    let par = inv;
    for (let y = 0; y < LZ_R; y++) for (let x = 0; x < LZ_C; x++) {
      const o = cells[y][x];
      if (o && o.k === 'm' && !o.lock && Math.random() < 0.75) { o.v = o.v === '/' ? '\\' : '/'; }
    }
    for (const mm of sol) { const o = cells[mm.y][mm.x]; if (o && o.k === 'm' && o.v !== mm.v) par++; }
    if (trace(cells).hit === nSrc && inv === 0) continue; // 이미 풀린 상태 방지
    const free2 = sol.filter((mm) => cells[mm.y][mm.x] && !cells[mm.y][mm.x].lock).length + inv;
    if (par < Math.min(free2, 2 + Math.floor(L / 2)) && att < 450) continue;
    return { cells, sol, inv, par: Math.max(1, par), targets: nSrc };
  }
  return null;
}
// 레이저 추적
function trace(cells) {
  const beams = [], hitSet = new Set(), boom = new Set();
  let hit = 0;
  for (let y = 0; y < LZ_R; y++) for (let x = 0; x < LZ_C; x++) {
    const o = cells[y][x];
    if (!o || o.k !== 'src') continue;
    let cx = x, cy = y, d = o.d;
    const pts = [[cx + 0.5, cy + 0.5]];
    for (let step = 0; step < 300; step++) {
      cx += LZ_DX[d]; cy += LZ_DY[d];
      if (cx < 0 || cy < 0 || cx >= LZ_C || cy >= LZ_R) { pts.push([cx + 0.5 - LZ_DX[d] * 0.5, cy + 0.5 - LZ_DY[d] * 0.5]); break; }
      const c = cells[cy][cx];
      if (!c) continue;
      if (c.k === 'm') { pts.push([cx + 0.5, cy + 0.5]); d = LZ_REF[c.v][d]; continue; }
      if (c.k === 'tgt') { pts.push([cx + 0.5, cy + 0.5]); if (c.col === o.col && !hitSet.has(cx + ',' + cy)) { hitSet.add(cx + ',' + cy); hit++; } break; }
      if (c.k === 'bomb') { pts.push([cx + 0.5, cy + 0.5]); boom.add(cx + ',' + cy); break; }
      pts.push([cx + 0.5 - LZ_DX[d] * 0.5, cy + 0.5 - LZ_DY[d] * 0.5]); break; // 벽, 다른 발사기
    }
    beams.push({ pts, col: o.col });
  }
  return { beams, hit, hitSet, boom };
}
function loadLevel(g) {
  let lv = null;
  while (!lv) lv = genLevel(S.lvl);
  S.cells = lv.cells; S.sol = lv.sol; S.inv = lv.inv; S.startInv = lv.inv; S.par = lv.par; S.targets = lv.targets;
  S.startCells = S.cells.map((r) => r.map((c) => (c ? { ...c } : null)));
  S.mode = 'play'; S.undo = []; S.ops = 0; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.hintCell = null;
  retrace(g, true);
  g.sfx.tone(523, 0.1, 'sawtooth', 0.04);
  if (S.inv) say(`보관함에 거울 ${S.inv}개! 빈 칸에 놓아 보세요`);
}
function retrace(g, quiet) {
  const prevHit = S.hit || 0, prevBoom = S.boom ? S.boom.size : 0;
  const t = trace(S.cells);
  S.beams = t.beams; S.hit = t.hit; S.hitSet = t.hitSet; S.boom = t.boom;
  if (quiet) return;
  if (t.boom.size > prevBoom) { g.sfx.explode(); g.shake(6); }
  else if (t.hit > prevHit) g.sfx.tone(880, 0.12, 'triangle', 0.07);
  if (t.hit === S.targets && !t.boom.size) win(g);
}
function pushUndo() { S.undo.push({ cells: S.cells.map((r) => r.map((c) => (c ? { ...c } : null))), inv: S.inv }); if (S.undo.length > 200) S.undo.shift(); }
function undo(g) {
  const u = S.undo.pop();
  if (!u) return;
  S.cells = u.cells; S.inv = u.inv; S.ops++;
  g.sfx.tone(300, 0.05, 'sine', 0.05); retrace(g, true);
}
function clickCell(g, x, y, right) {
  const o = S.cells[y][x];
  if (!o) {
    if (right) return;
    if (S.inv <= 0) { g.sfx.beep(150, 0.05); say('보관함에 거울이 없어요'); return; }
    pushUndo(); S.cells[y][x] = { k: 'm', v: '/', placed: true }; S.inv--; S.ops++;
    g.sfx.drop(); retrace(g); return;
  }
  if (o.k !== 'm') return;
  if (o.lock) { g.sfx.beep(160, 0.05); say('🔒 잠긴 거울이에요'); return; }
  pushUndo();
  if (right && o.placed) { S.cells[y][x] = null; S.inv++; g.sfx.pop(); }
  else { o.v = o.v === '/' ? '\\' : '/'; g.sfx.tone(600, 0.04, 'square', 0.03); }
  S.ops++;
  g.burst(LZ_OX + x * LZ_CS + LZ_CS / 2, LZ_OY + y * LZ_CS + LZ_CS / 2, '#7dd3fc', 6, 90, 0.3);
  retrace(g);
}
function hint(g) {
  // 1) 해답 위치에 없는 놓은 거울 → 회수 안내  2) 방향이 틀린 해답 거울 고치기  3) 보관함 거울을 정답 칸에 놓기
  for (let y = 0; y < LZ_R; y++) for (let x = 0; x < LZ_C; x++) {
    const o = S.cells[y][x];
    if (o && o.placed && !S.sol.some((m) => m.x === x && m.y === y)) { pushUndo(); S.cells[y][x] = null; S.inv++; return hintDone(g, x, y, '잘못 놓인 거울을 회수했어요'); }
  }
  for (const m of S.sol) {
    const o = S.cells[m.y][m.x];
    if (o && o.k === 'm' && o.v !== m.v) { pushUndo(); o.v = m.v; return hintDone(g, m.x, m.y, '이 거울의 방향을 바꿨어요'); }
  }
  for (const m of S.sol) {
    if (!S.cells[m.y][m.x] && S.inv > 0) { pushUndo(); S.cells[m.y][m.x] = { k: 'm', v: m.v, placed: true }; S.inv--; return hintDone(g, m.x, m.y, '보관함 거울을 놓았어요'); }
  }
  say('해답 거울은 모두 맞아요 — 다른 길을 막고 있는 건 없나요?');
}
function hintDone(g, x, y, t) {
  S.hintsUsed++; S.ops++; S.hintCell = [x, y]; S.hintT = 2;
  const tick = () => { S.hintT -= 0.1; if (S.hintT > 0) g.later(tick, 0.1); };
  g.later(tick, 0.1);
  say('💡 ' + t); g.sfx.power(); retrace(g);
}
function say(t) { S.msg = t; S.msgT = 2.4; }
function win(g) {
  if (S.clear > 0) return;
  const st = S.ops <= S.par ? 3 : S.ops <= S.par * 2 ? 2 : 1;
  S.lastStars = Math.max(1, st - (S.hintsUsed ? 1 : 0));
  S.lastPts = Math.max(50, 200 + S.lvl * 50 + S.lastStars * 100 - S.hintsUsed * 60 - Math.floor(S.time / 3));
  g.add(S.lastPts);
  if (S.lastStars > (S.stars[S.lvl] || 0)) { S.stars[S.lvl] = S.lastStars; g.save('stars', S.stars); }
  S.clear = 2.2; g.sfx.win(); g.shake(4);
  S.hitSet.forEach((k) => { const [x, y] = k.split(',').map(Number); g.burst(LZ_OX + x * LZ_CS + LZ_CS / 2, LZ_OY + y * LZ_CS + LZ_CS / 2, ['#fff', '#22d3ee', '#facc15'], 30, 260, 0.9); });
}
