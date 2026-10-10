let S;
// 누리카베: 숫자 = 그 숫자를 포함한 섬의 칸 수. 바다(검은 칸)는 모두 연결, 2×2 바다 금지, 섬끼리는 맞닿지 않음
const NK_DIFF = [
  { w: 5, h: 5, name: '쉬움', col: '#22c55e', maxIsl: 4, reveal: 0.35 },
  { w: 7, h: 7, name: '보통', col: '#3b82f6', maxIsl: 6, reveal: 0.15 },
  { w: 9, h: 9, name: '어려움', col: '#f97316', maxIsl: 8, reveal: 0.05 },
  { w: 12, h: 10, name: '전문가', col: '#dc2626', maxIsl: 9, reveal: 0 },
];
const NK_SET = 5;
// 칸 상태: 0=미정, 1=바다, 2=섬(점)
GAME({
  title: '누리카베', w: 960, h: 680, bg: '#e0f2fe', controls: 'none',
  help: '좌클릭: 미정 → 바다(🌊) → 섬(•) → 미정 · 우클릭: 섬 점 찍기\n드래그로 같은 상태를 연속으로 칠할 수 있어요\n규칙: 숫자 = 섬의 크기, 섬마다 숫자 하나 · 섬끼리 가로세로로 맞닿으면 ✕\n바다는 하나로 연결 · 바다 2×2 덩어리 금지\nU/X 되돌리기 · H 힌트 · 방향키+Space 입력도 가능',
  init(g) { S = { mode: 'select', d: 0, solved: 0, flash: [], msg: '', msgT: 0, cur: [0, 0], stats: g.load('stats', [0, 0, 0, 0]) }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    for (const f of S.flash) f.t -= dt;
    S.flash = S.flash.filter((f) => f.t > 0);
    if (S.mode === 'select') {
      NK_DIFF.forEach((d, i) => { if (g.clickIn(280, 200 + i * 100, 400, 80) || g.keyp('Digit' + (i + 1))) { S.d = i; S.solved = 0; newBoard(g); g.sfx.click(); } });
      g.info = '난이도를 고르세요';
      return;
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) { if (S.solved >= NK_SET) return g.win(`${NK_DIFF[S.d].name} ${NK_SET}문제 완료!`); newBoard(g); }
      return;
    }
    S.time += dt;
    const { W, H, cs, ox, oy } = S;
    const cx = Math.floor((m.x - ox) / cs), cy = Math.floor((m.y - oy) / cs);
    const inB = m.x >= ox && m.y >= oy && cx < W && cy < H;
    if (inB && (m.clicked || m.rclick)) {
      S.cur = [cx, cy];
      if (S.clue[cy][cx]) { g.sfx.beep(200, 0.05); }
      else {
        pushUndo();
        const v = S.grid[cy][cx];
        S.paint = m.rclick ? (v === 2 ? 0 : 2) : (v + 1) % 3;
        S.grid[cy][cx] = S.paint; S.dragging = !m.rclick;
        g.sfx.tone([300, 220, 520][S.paint], 0.05, 'triangle', 0.05);
        afterChange(g);
      }
    } else if (S.dragging && m.down && inB && !S.clue[cy][cx] && S.grid[cy][cx] !== S.paint) {
      S.grid[cy][cx] = S.paint; g.sfx.tone(260 + S.paint * 80, 0.03, 'sine', 0.03); afterChange(g);
    }
    if (!m.down) S.dragging = false;
    if (m.clicked) {
      if (g.inRect(700, 330, 230, 50)) undo(g);
      if (g.inRect(700, 390, 230, 50)) hint(g);
      if (g.inRect(700, 450, 230, 50)) check(g, true);
      if (g.inRect(700, 510, 230, 50)) { pushUndo(); S.grid = S.grid.map((r) => r.map(() => 0)); afterChange(g); }
      if (g.inRect(700, 590, 110, 44)) S.mode = 'select';
      if (g.inRect(820, 590, 110, 44)) { g.add(-50); newBoard(g); }
    }
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) S.cur = [(S.cur[0] + D[k][0] + W) % W, (S.cur[1] + D[k][1] + H) % H];
    const [kx, ky] = S.cur;
    if ((g.keyp('Space') || g.keyp('Enter')) && !S.clue[ky][kx]) { pushUndo(); S.grid[ky][kx] = (S.grid[ky][kx] + 1) % 3; g.sfx.click(); afterChange(g); }
    if (g.keyp('KeyU') || g.pressed('b')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `${NK_DIFF[S.d].name} ${W}×${H} · 퍼즐 ${S.solved + 1}/${NK_SET} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🏝️ 누리카베', 480, 80, 48, '#0c4a6e');
      g.text('숫자 크기의 섬을 만들고, 나머지는 하나로 이어진 바다로!', 480, 140, 18, '#0369a1', 'center', '600');
      NK_DIFF.forEach((d, i) => {
        g.button(280, 200 + i * 100, 400, 80, `${i + 1}. ${d.name}  (${d.w}×${d.h})`, d.col, 26);
        g.text(`해결 ${S.stats[i] || 0}개`, 700, 240 + i * 100, 16, '#475569', 'left', '600');
      });
      return;
    }
    const { W, H, cs, ox, oy } = S;
    g.rrect(ox - 8, oy - 8, W * cs + 16, H * cs + 16, 12, '#0f172a');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = ox + x * cs, py = oy + y * cs, v = S.grid[y][x], cl = S.clue[y][x];
      if (cl) {
        g.rect(px + 1, py + 1, cs - 2, cs - 2, '#fef3c7');
        g.circle(px + cs / 2, py + cs / 2, cs * 0.36, S.islErr[y][x] ? '#fecaca' : '#fde68a');
        g.text(String(cl), px + cs / 2, py + cs / 2 + 2, cs * 0.45, S.islErr[y][x] ? '#b91c1c' : '#78350f');
      } else if (v === 1) {
        g.rect(px + 1, py + 1, cs - 2, cs - 2, S.poolErr[y][x] ? '#7f1d1d' : '#1e3a8a');
        const t = g.time * 2 + x * 0.7 + y * 0.4;
        g.line(px + cs * 0.2, py + cs * 0.55 + Math.sin(t) * 2, px + cs * 0.8, py + cs * 0.55 + Math.sin(t + 1) * 2, 'rgba(147,197,253,.5)', 2);
      } else if (v === 2) {
        g.rect(px + 1, py + 1, cs - 2, cs - 2, S.islErr[y][x] ? '#fee2e2' : '#fef9c3');
        g.circle(px + cs / 2, py + cs / 2, Math.max(3, cs * 0.09), '#a16207');
      } else g.rect(px + 1, py + 1, cs - 2, cs - 2, '#f8fafc');
    }
    for (const f of S.flash) g.stroke(ox + f.x * cs + 2, oy + f.y * cs + 2, cs - 4, cs - 4, f.c, 4);
    g.stroke(ox + S.cur[0] * cs + 1, oy + S.cur[1] * cs + 1, cs - 2, cs - 2, '#f59e0b', 3);
    g.rrect(690, 20, 250, 640, 16, '#fff', '#bae6fd');
    g.text('누리카베', 815, 55, 28, '#0c4a6e');
    g.text(`${NK_DIFF[S.d].name} · ${W}×${H}`, 815, 92, 18, NK_DIFF[S.d].col);
    g.text(`퍼즐 ${S.solved + 1} / ${NK_SET}`, 815, 125, 18, '#334155');
    g.text(`⏱️ ${U.fmtTime(S.time)}   💡 ${S.hintsUsed}`, 815, 157, 18, '#334155', 'center', '600');
    ['① 숫자 = 섬 크기', '② 섬 하나에 숫자 하나', '③ 바다는 모두 연결', '④ 2×2 바다 금지'].forEach((r, i) => g.text(r, 710, 198 + i * 28, 15, '#475569', 'left', '600'));
    g.button(700, 330, 230, 50, `↶ 되돌리기 (${S.undo.length})`, '#64748b', 18);
    g.button(700, 390, 230, 50, '💡 힌트', '#16a34a', 18);
    g.button(700, 450, 230, 50, '✔ 검사', '#2563eb', 18);
    g.button(700, 510, 230, 50, '🧹 모두 지우기', '#94a3b8', 18);
    g.button(700, 590, 110, 44, '난이도', '#475569', 16);
    g.button(820, 590, 110, 44, '새 퍼즐', '#475569', 16);
    if (S.msgT > 0) { g.rrect(140, 610, 400, 50, 14, 'rgba(15,23,42,.88)'); g.text(S.msg, 340, 636, 18, '#fff'); }
    if (S.clear > 0) {
      g.rrect(140, 270, 400, 120, 20, 'rgba(14,116,144,.93)');
      g.text('🏝️ 완성!', 340, 310, 36, '#fff');
      g.text(`+${S.lastPts}점`, 340, 355, 22, '#fef9c3');
    }
  },
});

const NK_N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 섬/바다 배치 생성: 바다 연결 유지하며 2×2 바다를 섬으로 깨뜨림
function genLayout(W, H, maxIsl) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const id = U.grid(W, H, -1); // -1 바다, k 섬 번호
    const sizes = [];
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const seaConnected = () => {
      let start = null, total = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (id[y][x] < 0) { total++; if (!start) start = [x, y]; }
      if (!start) return false;
      const seen = new Set([start[1] * W + start[0]]), st = [start];
      while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of NK_N4) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && id[ny][nx] < 0 && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); st.push([nx, ny]); } } }
      return seen.size === total;
    };
    const tryCell = (x, y) => {
      if (id[y][x] >= 0) return false;
      const adj = new Set();
      for (const [dx, dy] of NK_N4) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && id[ny][nx] >= 0) adj.add(id[ny][nx]); }
      if (adj.size > 1) return false;
      let k;
      if (adj.size === 1) { k = [...adj][0]; if (sizes[k] >= maxIsl) return false; }
      else k = sizes.length;
      id[y][x] = k;
      if (!seaConnected()) { id[y][x] = -1; return false; }
      if (k === sizes.length) sizes.push(1); else sizes[k]++;
      return true;
    };
    let guard = 0;
    while (guard++ < 2000) {
      const pools = [];
      for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) if (id[y][x] < 0 && id[y][x + 1] < 0 && id[y + 1][x] < 0 && id[y + 1][x + 1] < 0) pools.push([x, y]);
      if (!pools.length) break;
      const [px, py] = U.choice(pools);
      const cand = U.shuffle([[px, py], [px + 1, py], [px, py + 1], [px + 1, py + 1]]);
      // 기존 섬을 키우는 쪽을 선호해 큰 섬이 생기게
      cand.sort((a, b) => adjIsland(id, a, W, H) - adjIsland(id, b, W, H));
      let ok = false;
      for (const [x, y] of cand) if (tryCell(x, y)) { ok = true; break; }
      if (!ok) break;
    }
    // 섬 성장(랜덤): 너무 단조롭지 않게
    for (let i = 0; i < W * H; i++) {
      const x = U.randi(0, W - 1), y = U.randi(0, H - 1);
      if (id[y][x] < 0 && adjIsland(id, [x, y], W, H) === -1 && Math.random() < 0.35) tryCell(x, y);
    }
    let pool = false;
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) if (id[y][x] < 0 && id[y][x + 1] < 0 && id[y + 1][x] < 0 && id[y + 1][x + 1] < 0) pool = true;
    if (pool || sizes.length < 2) continue;
    const seaCount = id.flat().filter((v) => v < 0).length;
    if (seaCount < W * H * 0.35) continue;
    return { id, sizes };
  }
  return null;
}
function adjIsland(id, [x, y], W, H) {
  for (const [dx, dy] of NK_N4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && id[ny][nx] >= 0) return -1; }
  return 0;
}
function newBoard(g) {
  const D = NK_DIFF[S.d];
  let L = null;
  while (!L) L = genLayout(D.w, D.h, D.maxIsl);
  const W = D.w, H = D.h;
  S.W = W; S.H = H; S.sol = L.id.map((r) => r.map((v) => (v < 0 ? 1 : 2)));
  S.clue = U.grid(W, H, 0);
  const cellsOf = L.sizes.map(() => []);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.id[y][x] >= 0) cellsOf[L.id[y][x]].push([x, y]);
  cellsOf.forEach((cs, k) => { const [x, y] = U.choice(cs); S.clue[y][x] = L.sizes[k]; });
  S.grid = U.grid(W, H, 0);
  // 쉬운 난이도: 일부 바다 칸 미리 공개
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!S.clue[y][x] && S.sol[y][x] === 1 && Math.random() < D.reveal) S.grid[y][x] = 1;
  S.fixed = S.grid.map((r) => r.map((v) => v > 0));
  S.mode = 'play'; S.undo = []; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.cur = [0, 0];
  S.cs = Math.floor(Math.min(64, 600 / Math.max(W, H)));
  S.ox = 340 - (W * S.cs) / 2; S.oy = 330 - (H * S.cs) / 2;
  S.islErr = U.grid(W, H, false); S.poolErr = U.grid(W, H, false);
  g.sfx.tone(440, 0.08, 'triangle', 0.06);
}
function pushUndo() { S.undo.push(S.grid.map((r) => r.slice())); if (S.undo.length > 300) S.undo.shift(); }
function undo(g) { if (!S.undo.length) return; S.grid = S.undo.pop(); g.sfx.tone(300, 0.05, 'sine', 0.05); afterChange(g, true); }
function say(t) { S.msg = t; S.msgT = 2.2; }
// 규칙 판정. 반환: {ok, poolErr, islErr, seaOk}
function evaluate() {
  const { W, H } = S, G = S.grid;
  const land = (x, y) => S.clue[y][x] > 0 || G[y][x] !== 1; // 바다로 칠하지 않은 칸 = 섬 후보
  const poolErr = U.grid(W, H, false), islErr = U.grid(W, H, false);
  let ok = true;
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    if (G[y][x] === 1 && G[y][x + 1] === 1 && G[y + 1][x] === 1 && G[y + 1][x + 1] === 1 && !S.clue[y][x] && !S.clue[y][x + 1] && !S.clue[y + 1][x] && !S.clue[y + 1][x + 1]) {
      poolErr[y][x] = poolErr[y][x + 1] = poolErr[y + 1][x] = poolErr[y + 1][x + 1] = true; ok = false;
    }
  }
  // 섬 덩어리 (확정 섬 = 숫자 또는 점)
  const seen = U.grid(W, H, false);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen[y][x] || !(S.clue[y][x] || G[y][x] === 2)) continue;
    const comp = [], st = [[x, y]]; seen[y][x] = true;
    let clues = 0, num = 0, openEdge = false;
    while (st.length) {
      const [cx, cy] = st.pop(); comp.push([cx, cy]);
      if (S.clue[cy][cx]) { clues++; num = S.clue[cy][cx]; }
      for (const [dx, dy] of NK_N4) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!seen[ny][nx] && (S.clue[ny][nx] || G[ny][nx] === 2)) { seen[ny][nx] = true; st.push([nx, ny]); }
        else if (G[ny][nx] === 0 && !S.clue[ny][nx]) openEdge = true;
      }
    }
    let bad = clues > 1 || (clues === 1 && comp.length > num) || (clues === 0 && !openEdge) || (clues === 1 && !openEdge && comp.length < num);
    if (bad) { ok = false; for (const [a, b] of comp) islErr[b][a] = true; }
  }
  // 완전 판정: 미정 칸 = 섬으로 간주
  const seen2 = U.grid(W, H, false);
  let full = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen2[y][x] || !land(x, y)) continue;
    const st = [[x, y]]; seen2[y][x] = true; let clues = 0, num = 0, size = 0;
    while (st.length) {
      const [cx, cy] = st.pop(); size++;
      if (S.clue[cy][cx]) { clues++; num = S.clue[cy][cx]; }
      for (const [dx, dy] of NK_N4) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen2[ny][nx] && land(nx, ny)) { seen2[ny][nx] = true; st.push([nx, ny]); } }
    }
    if (clues !== 1 || size !== num) full = false;
  }
  // 바다 연결
  let sea = [], start = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G[y][x] === 1 && !S.clue[y][x]) { sea.push(1); if (!start) start = [x, y]; }
  let seaOk = true;
  if (start) {
    const s3 = new Set([start[1] * W + start[0]]), st = [start];
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of NK_N4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && G[ny][nx] === 1 && !S.clue[ny][nx] && !s3.has(ny * W + nx)) { s3.add(ny * W + nx); st.push([nx, ny]); } } }
    seaOk = s3.size === sea.length;
  } else seaOk = false;
  return { ok, poolErr, islErr, solved: ok && full && seaOk, seaOk };
}
function afterChange(g, silent) {
  const r = evaluate();
  S.poolErr = r.poolErr; S.islErr = r.islErr;
  if (r.solved) solvedNow(g);
}
function check(g) {
  const r = evaluate();
  S.poolErr = r.poolErr; S.islErr = r.islErr;
  let wrong = 0;
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (!S.clue[y][x] && S.grid[y][x] && S.grid[y][x] !== S.sol[y][x]) wrong++;
  if (!r.ok) { say('규칙 위반이 있어요 (빨간 칸)'); g.sfx.hit(); g.shake(4); }
  else if (!r.seaOk && S.grid.flat().every((v, i) => v || S.clue[(i / S.W) | 0][i % S.W])) { say('바다가 끊어져 있어요'); g.sfx.hit(); }
  else if (wrong) { say(`위반은 없지만 ${wrong}칸이 정답과 달라요`); g.sfx.beep(260, 0.1); }
  else { say('지금까지 모두 맞아요! 👍'); g.sfx.coin(); }
}
function hint(g) {
  const { W, H } = S;
  const wrong = [], empty = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (S.clue[y][x]) continue;
    if (S.grid[y][x] && S.grid[y][x] !== S.sol[y][x]) wrong.push([x, y]);
    else if (!S.grid[y][x]) empty.push([x, y]);
  }
  S.hintsUsed++;
  if (wrong.length) { const [x, y] = wrong[0]; S.flash.push({ x, y, t: 1.6, c: '#ef4444' }); S.cur = [x, y]; say('이 칸이 틀렸어요'); g.sfx.hit(); return; }
  if (!empty.length) return;
  // 숫자/바다 근처의 칸을 우선 공개
  empty.sort((a, b) => nearScore(b) - nearScore(a));
  const [x, y] = empty[0];
  pushUndo(); S.grid[y][x] = S.sol[y][x]; S.cur = [x, y];
  S.flash.push({ x, y, t: 1.6, c: '#22c55e' });
  say(S.sol[y][x] === 1 ? '이 칸은 바다예요' : '이 칸은 섬이에요');
  g.sfx.power(); afterChange(g);
}
function nearScore([x, y]) {
  let s = Math.random() * 0.5;
  for (const [dx, dy] of NK_N4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H && (S.clue[ny][nx] || S.grid[ny][nx])) s += 1; }
  return s;
}
function solvedNow(g) {
  const pts = Math.max(100, S.W * S.H * 12 * (S.d + 1) - Math.floor(S.time) * 2 - S.hintsUsed * 60);
  S.lastPts = pts; g.add(pts); S.solved++;
  S.stats[S.d] = (S.stats[S.d] || 0) + 1; g.save('stats', S.stats);
  S.clear = 1.8; g.sfx.win(); g.shake(4);
  for (let i = 0; i < 6; i++) g.burst(S.ox + Math.random() * S.W * S.cs, S.oy + Math.random() * S.H * S.cs, ['#38bdf8', '#fde68a', '#22c55e', '#fff'], 20, 260, 1);
}
