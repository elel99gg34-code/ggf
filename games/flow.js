let S;
// 플로우: 같은 색 점끼리 선으로 잇고 판 전체를 채운다
const FL_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#f97316', '#06b6d4', '#a855f7', '#ec4899', '#84cc16', '#92400e', '#64748b', '#14b8a6', '#f0abfc', '#1e40af', '#fde68a', '#be123c'];
const FL_PACKS = [
  { name: '입문', sizes: [5, 5, 5, 6], col: '#22c55e' },
  { name: '보통', sizes: [6, 7, 7, 7], col: '#3b82f6' },
  { name: '어려움', sizes: [8, 8, 9, 9], col: '#f97316' },
  { name: '마스터', sizes: [10, 10, 11, 12], col: '#dc2626' },
];
const FL_PER = 6; // 팩당 레벨 수
const FL_N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
GAME({
  title: '플로우 연결', w: 960, h: 680, bg: '#0b1020', controls: 'dpad+ab', aLabel: '선택', bLabel: '취소',
  help: '같은 색 점에서 드래그해 같은 색 점까지 선을 이어요\n선끼리는 교차할 수 없고, 다른 선을 지나가면 그 선이 잘려요\n모든 색을 잇고 판의 모든 칸을 채우면 클리어!\n키보드: 방향키로 커서 · Space로 선 잡기/놓기 · U/X 되돌리기 · H 힌트',
  init(g) { S = { mode: 'select', pack: 0, lvl: 0, msg: '', msgT: 0, cleared: g.load('cleared', {}), sparks: [] }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'select') {
      FL_PACKS.forEach((p, i) => { if (g.clickIn(240, 190 + i * 105, 480, 85) || g.keyp('Digit' + (i + 1))) { S.pack = i; S.lvl = 0; newLevel(g); g.sfx.click(); } });
      g.info = '팩을 고르세요';
      return;
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        S.lvl++;
        if (S.lvl >= FL_PER) return g.win(`${FL_PACKS[S.pack].name} 팩 ${FL_PER}레벨 완료!`);
        newLevel(g);
      }
      return;
    }
    S.time += dt;
    const { n, cs, ox, oy } = S;
    const cx = Math.floor((m.x - ox) / cs), cy = Math.floor((m.y - oy) / cs);
    const inB = m.x >= ox && m.y >= oy && cx < n && cy < n;
    if (m.clicked && inB) startDrag(g, cx, cy);
    if (m.down && S.drag !== null && inB) extendTo(g, cx, cy);
    if (!m.down && S.drag !== null && S.dragMouse) endDrag(g);
    // 키보드 조작
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) {
      const nx = U.clamp(S.cur[0] + D[k][0], 0, n - 1), ny = U.clamp(S.cur[1] + D[k][1], 0, n - 1);
      S.cur = [nx, ny];
      if (S.drag !== null && !S.dragMouse) extendTo(g, nx, ny);
    }
    if (g.pressed('a')) {
      if (S.drag === null) { startDrag(g, S.cur[0], S.cur[1]); if (S.drag !== null) S.dragMouse = false; }
      else endDrag(g);
    }
    if (g.keyp('KeyU') || (g.pressed('b') && S.drag === null)) undo(g);
    else if (g.pressed('b') && S.drag !== null) endDrag(g);
    if (g.keyp('KeyH')) hint(g);
    if (m.clicked) {
      if (g.inRect(712, 300, 220, 50)) undo(g);
      if (g.inRect(712, 360, 220, 50)) hint(g);
      if (g.inRect(712, 420, 220, 50)) { pushUndo(); S.paths = S.paths.map(() => []); g.sfx.drop(); }
      if (g.inRect(712, 500, 105, 44)) { S.mode = 'select'; }
      if (g.inRect(827, 500, 105, 44)) { g.add(-30); S.lvl++; if (S.lvl >= FL_PER) S.lvl = 0; newLevel(g); }
    }
    for (const s of S.sparks) s.t += dt;
    S.sparks = S.sparks.filter((s) => s.t < 0.6);
    const done = S.paths.filter((p, i) => connected(i)).length;
    g.info = `${FL_PACKS[S.pack].name} ${S.lvl + 1}/${FL_PER} · ${n}×${n} · 연결 ${done}/${S.k} · 채움 ${fillPct()}% · 이동 ${S.moves}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🔗 플로우 연결', 480, 80, 48, '#f8fafc');
      g.text('같은 색 점을 잇고, 판의 모든 칸을 선으로 채우세요', 480, 135, 18, '#94a3b8', 'center', '600');
      FL_PACKS.forEach((p, i) => {
        g.button(240, 190 + i * 105, 480, 85, `${i + 1}. ${p.name}  (${p.sizes[0]}×${p.sizes[0]} ~ ${p.sizes[3]}×${p.sizes[3]})`, p.col, 24);
        g.text(`클리어 ${S.cleared[i] || 0}`, 740, 232 + i * 105, 16, '#94a3b8', 'left', '600');
      });
      return;
    }
    const { n, cs, ox, oy } = S;
    g.rrect(ox - 6, oy - 6, n * cs + 12, n * cs + 12, 10, '#111827');
    // 채워진 칸 배경
    for (let i = 0; i < S.k; i++) for (const [x, y] of S.paths[i]) g.rect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2, FL_COLORS[i] + '33');
    for (let i = 0; i <= n; i++) { g.line(ox + i * cs, oy, ox + i * cs, oy + n * cs, '#334155', 1); g.line(ox, oy + i * cs, ox + n * cs, oy + i * cs, '#334155', 1); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < S.k; i++) {
      const p = S.paths[i];
      if (p.length < 2) continue;
      c.strokeStyle = FL_COLORS[i]; c.lineWidth = cs * 0.34; c.beginPath();
      p.forEach(([x, y], j) => { const px = ox + x * cs + cs / 2, py = oy + y * cs + cs / 2; j ? c.lineTo(px, py) : c.moveTo(px, py); });
      c.stroke();
    }
    for (let i = 0; i < S.k; i++) for (const [x, y] of S.ends[i]) {
      const px = ox + x * cs + cs / 2, py = oy + y * cs + cs / 2, con = connected(i);
      if (con) g.circle(px, py, cs * 0.42 + Math.sin(g.time * 4 + i) * 1.5, FL_COLORS[i] + '55');
      g.circle(px, py, cs * 0.34, FL_COLORS[i]);
      g.circle(px - cs * 0.1, py - cs * 0.1, cs * 0.08, 'rgba(255,255,255,.45)');
    }
    for (const s of S.sparks) g.ring(s.x, s.y, cs * 0.3 + s.t * 60, `rgba(255,255,255,${1 - s.t / 0.6})`, 3);
    g.stroke(ox + S.cur[0] * cs + 2, oy + S.cur[1] * cs + 2, cs - 4, cs - 4, S.drag !== null ? FL_COLORS[S.drag] : '#e2e8f0', 2);
    // 패널
    g.rrect(700, 20, 245, 640, 16, '#111827', '#1f2937');
    g.text('플로우 연결', 822, 58, 28, '#f8fafc');
    g.text(`${FL_PACKS[S.pack].name} · 레벨 ${S.lvl + 1}/${FL_PER}`, 822, 96, 18, FL_PACKS[S.pack].col);
    const done = S.paths.filter((p, i) => connected(i)).length;
    g.text(`연결 ${done} / ${S.k}`, 822, 135, 20, '#e2e8f0');
    g.text(`채움 ${fillPct()}%`, 822, 168, 20, '#e2e8f0');
    g.text(`이동 ${S.moves} (최소 ${S.k})`, 822, 201, 17, '#94a3b8', 'center', '600');
    g.text(`⏱️ ${U.fmtTime(S.time)}  💡${S.hintsUsed}`, 822, 232, 17, '#94a3b8', 'center', '600');
    for (let i = 0; i < S.k; i++) g.circle(722 + (i % 10) * 21, 262 + Math.floor(i / 10) * 21, 8, connected(i) ? FL_COLORS[i] : FL_COLORS[i] + '44');
    g.button(712, 300, 220, 50, `↶ 되돌리기 (${S.undo.length})`, '#475569', 18);
    g.button(712, 360, 220, 50, '💡 힌트 (한 색 공개)', '#15803d', 17);
    g.button(712, 420, 220, 50, '🧹 모두 지우기', '#334155', 18);
    g.button(712, 500, 105, 44, '팩 선택', '#334155', 15);
    g.button(827, 500, 105, 44, '건너뛰기', '#334155', 15);
    g.text('★ 완벽: 이동 수 = 색 수', 822, 580, 14, '#64748b', 'center', '600');
    if (S.msgT > 0) { g.rrect(150, 610, 400, 48, 12, 'rgba(15,23,42,.92)', '#334155'); g.text(S.msg, 350, 634, 18, '#fff'); }
    if (S.clear > 0) {
      g.rrect(150, 260, 400, 140, 20, 'rgba(15,23,42,.92)', '#22c55e', 3);
      g.text(S.perfect ? '⭐ 완벽한 연결!' : '✅ 레벨 클리어!', 350, 305, 32, '#fff');
      g.text(`+${S.lastPts}점`, 350, 355, 24, '#fde68a');
    }
  },
});

// 해밀턴 경로(지그재그) + backbite 변형 → 조각으로 잘라 퍼즐 생성
function genPuzzle(n) {
  for (let att = 0; att < 60; att++) {
    let path = [];
    for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) path.push([y % 2 ? n - 1 - i : i, y]);
    const idx = U.grid(n, n, 0);
    const reindex = () => path.forEach(([x, y], i) => (idx[y][x] = i));
    reindex();
    for (let it = 0; it < n * n * 30; it++) {
      // backbite: 끝점에서 이웃을 골라 경로 뒤집기
      if (Math.random() < 0.5) path.reverse(), reindex();
      const [ex, ey] = path[path.length - 1];
      const [dx, dy] = U.choice(FL_N4);
      const nx = ex + dx, ny = ey + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = idx[ny][nx];
      if (j === path.length - 2) continue;
      const tail = path.splice(j + 1).reverse();
      path = path.concat(tail);
      for (let q = j + 1; q < path.length; q++) idx[path[q][1]][path[q][0]] = q;
    }
    // 조각 나누기
    const target = Math.max(3, Math.round(n * (0.9 + Math.random() * 0.4)));
    const segs = [];
    let i = 0;
    while (i < path.length) {
      const remain = path.length - i;
      const avg = path.length / target;
      let len = Math.max(3, Math.round(avg * (0.5 + Math.random())));
      if (remain - len < 3) len = remain;
      segs.push(path.slice(i, i + len));
      i += len;
    }
    if (segs.some((s) => s.length < 3) || segs.length > FL_COLORS.length || segs.length < 3) continue;
    // 끝점이 붙어 있는 너무 쉬운 조각 줄이기
    const trivial = segs.filter((s) => Math.abs(s[0][0] - s[s.length - 1][0]) + Math.abs(s[0][1] - s[s.length - 1][1]) === 1).length;
    if (trivial > 1) continue;
    return U.shuffle(segs);
  }
  return null;
}
function newLevel(g) {
  const n = FL_PACKS[S.pack].sizes[Math.min(3, Math.floor((S.lvl * 4) / FL_PER))];
  let segs = null;
  while (!segs) segs = genPuzzle(n);
  S.mode = 'play'; S.n = n; S.k = segs.length; S.sol = segs;
  S.ends = segs.map((s) => [s[0], s[s.length - 1]]);
  S.endAt = U.grid(n, n, -1);
  S.ends.forEach((e, i) => e.forEach(([x, y]) => (S.endAt[y][x] = i)));
  S.paths = segs.map(() => []);
  S.undo = []; S.drag = null; S.moves = 0; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.cur = [0, 0]; S.lastColor = -1;
  S.cs = Math.floor(Math.min(80, 620 / n)); S.ox = 350 - (n * S.cs) / 2; S.oy = 340 - (n * S.cs) / 2;
  g.sfx.tone(523, 0.08, 'triangle', 0.06);
}
function owner(x, y) {
  for (let i = 0; i < S.k; i++) for (const [a, b] of S.paths[i]) if (a === x && b === y) return i;
  return -1;
}
function connected(i) {
  const p = S.paths[i];
  if (p.length < 2) return false;
  const a = p[0], b = p[p.length - 1];
  return S.endAt[a[1]][a[0]] === i && S.endAt[b[1]][b[0]] === i && (a[0] !== b[0] || a[1] !== b[1]);
}
function fillPct() {
  let f = 0;
  for (let i = 0; i < S.k; i++) f += S.paths[i].length;
  for (let i = 0; i < S.k; i++) if (S.paths[i].length === 0) f += 2;
  return Math.min(100, Math.round((f / (S.n * S.n)) * 100));
}
function pushUndo() { S.undo.push(S.paths.map((p) => p.map((c) => c.slice()))); if (S.undo.length > 200) S.undo.shift(); }
function undo(g) { if (!S.undo.length) return; S.paths = S.undo.pop(); S.drag = null; g.sfx.tone(300, 0.05, 'sine', 0.05); }
function say(t) { S.msg = t; S.msgT = 2; }
function startDrag(g, x, y) {
  const e = S.endAt[y][x], o = owner(x, y);
  if (e < 0 && o < 0) return;
  pushUndo();
  S.dragMouse = true;
  if (e >= 0) { S.drag = e; S.paths[e] = [[x, y]]; }
  else {
    S.drag = o;
    const p = S.paths[o], j = p.findIndex(([a, b]) => a === x && b === y);
    S.paths[o] = p.slice(0, j + 1);
  }
  S.dragStartLen = S.paths[S.drag].length;
  g.sfx.tone(400 + S.drag * 30, 0.05, 'sine', 0.06);
}
function extendTo(g, x, y) {
  const i = S.drag, p = S.paths[i];
  const last = p[p.length - 1];
  if (last[0] === x && last[1] === y) return;
  if (Math.abs(last[0] - x) + Math.abs(last[1] - y) !== 1) {
    // 마우스가 빠르게 움직이면 직선 보간
    if (last[0] === x || last[1] === y) {
      const sx = Math.sign(x - last[0]), sy = Math.sign(y - last[1]);
      let cx = last[0], cy = last[1];
      while (cx !== x || cy !== y) { cx += sx; cy += sy; if (!stepTo(g, i, cx, cy)) break; }
    }
    return;
  }
  stepTo(g, i, x, y);
}
function stepTo(g, i, x, y) {
  const p = S.paths[i];
  const last = p[p.length - 1];
  // 이미 끝까지 연결되었으면 더 이상 늘리지 않음 (되돌아가기만 허용)
  const back = p.findIndex(([a, b]) => a === x && b === y);
  if (back >= 0) { S.paths[i] = p.slice(0, back + 1); g.sfx.tone(300, 0.03, 'sine', 0.03); return true; }
  if (connected(i)) return false;
  const e = S.endAt[y][x];
  if (e >= 0 && e !== i) return false;
  if (e === i && p.length && S.endAt[p[0][1]][p[0][0]] === i && p[0][0] === x && p[0][1] === y) return false;
  const o = owner(x, y);
  if (o >= 0 && o !== i) {
    const q = S.paths[o], j = q.findIndex(([a, b]) => a === x && b === y);
    S.paths[o] = q.slice(0, j);
    g.sfx.tone(180, 0.05, 'sawtooth', 0.04);
  }
  p.push([x, y]);
  S.cur = [x, y];
  if (connected(i)) {
    g.sfx.tone(660, 0.08, 'triangle', 0.07); g.sfx.tone(880, 0.1, 'triangle', 0.06, null, 0.07);
    S.sparks.push({ x: S.ox + x * S.cs + S.cs / 2, y: S.oy + y * S.cs + S.cs / 2, t: 0 });
    g.burst(S.ox + x * S.cs + S.cs / 2, S.oy + y * S.cs + S.cs / 2, FL_COLORS[i], 14, 160, 0.5);
  } else g.sfx.tone(440 + p.length * 12, 0.025, 'sine', 0.025);
  void last;
  return true;
}
function endDrag(g) {
  const i = S.drag;
  S.drag = null;
  const p = S.paths[i];
  if (p.length === S.dragStartLen && S.undo.length) { S.undo.pop(); return; }
  if (i !== S.lastColor) { S.moves++; S.lastColor = i; }
  if (p.length === 1) S.paths[i] = [];
  checkWin(g);
}
function checkWin(g) {
  let filled = 0;
  for (let i = 0; i < S.k; i++) { if (!connected(i)) return; filled += S.paths[i].length; }
  if (filled < S.n * S.n) { say('모두 이었지만 빈 칸이 남았어요!'); g.sfx.beep(300, 0.1); return; }
  S.perfect = S.moves <= S.k && !S.hintsUsed;
  const pts = Math.max(100, S.n * S.n * 8 + (S.perfect ? 300 : 0) - Math.max(0, S.moves - S.k) * 15 - S.hintsUsed * 80);
  S.lastPts = pts; g.add(pts); S.clear = 1.8;
  S.cleared[S.pack] = (S.cleared[S.pack] || 0) + 1; g.save('cleared', S.cleared);
  g.sfx.win(); g.shake(4);
  for (let i = 0; i < S.k; i++) { const [x, y] = S.ends[i][0]; g.burst(S.ox + x * S.cs + S.cs / 2, S.oy + y * S.cs + S.cs / 2, FL_COLORS[i], 16, 240, 0.9); }
}
function hint(g) {
  // 정답과 다른 색 하나를 정답 경로로 공개
  const cand = [];
  for (let i = 0; i < S.k; i++) {
    const s = S.sol[i], p = S.paths[i];
    const same = p.length === s.length && (p.every((c, j) => c[0] === s[j][0] && c[1] === s[j][1]) || p.every((c, j) => c[0] === s[s.length - 1 - j][0] && c[1] === s[s.length - 1 - j][1]));
    if (!same) cand.push(i);
  }
  if (!cand.length) return;
  const i = cand[0];
  pushUndo();
  for (const [x, y] of S.sol[i]) {
    const o = owner(x, y);
    if (o >= 0 && o !== i) { const q = S.paths[o], j = q.findIndex(([a, b]) => a === x && b === y); S.paths[o] = q.slice(0, j); }
  }
  S.paths[i] = S.sol[i].map((c) => c.slice());
  S.hintsUsed++; S.moves++;
  say('한 색의 정답 경로를 공개했어요');
  g.sfx.power();
  checkWin(g);
}
