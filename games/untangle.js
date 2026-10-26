let S;
// 선 풀기 (플래너리티): 점을 끌어 옮겨 교차하는 선이 하나도 없게 만들어라
const UT_LEVELS = [4, 5, 6, 7, 8, 9, 10, 11]; // 직선 수 → 점 수 = n(n-1)/2
const UT_AX = 20, UT_AY = 20, UT_AW = 680, UT_AH = 640;
GAME({
  title: '선 풀기', w: 960, h: 680, bg: '#0c0a1d', controls: 'none',
  help: '점을 드래그해서 옮겨요\n빨간 선 = 다른 선과 교차 중 · 모든 선이 초록색이 되면 클리어!\n💡 힌트: 가장 많이 엉킨 점을 가장 좋은 자리로 옮겨 줘요\nU = 되돌리기 · H = 힌트 · 빠를수록 고득점',
  init(g) { S = { mode: 'select', lvl: 0, unlocked: g.load('unlocked', 1), bestT: g.load('bestT', {}), msg: '', msgT: 0 }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'select') {
      UT_LEVELS.forEach((k, i) => {
        const x = 110 + (i % 4) * 190, y = 200 + Math.floor(i / 4) * 170;
        if (i < S.unlocked && g.clickIn(x, y, 170, 140)) { S.lvl = i; loadLevel(g); g.sfx.click(); }
      });
      g.info = '레벨을 고르세요';
      return;
    }
    // 점 애니메이션 (힌트/정답 이동)
    let moving = false;
    for (const v of S.v) if (v.tx !== undefined) {
      v.x += (v.tx - v.x) * Math.min(1, dt * 8); v.y += (v.ty - v.y) * Math.min(1, dt * 8);
      if (Math.hypot(v.tx - v.x, v.ty - v.y) < 0.5) { v.x = v.tx; v.y = v.ty; v.tx = undefined; }
      moving = true;
    }
    if (moving) { countCross(); if (!S.v.some((v) => v.tx !== undefined)) checkWin(g); }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        S.lvl++;
        if (S.lvl >= UT_LEVELS.length) return g.win('모든 그래프를 풀었어요!');
        S.unlocked = Math.max(S.unlocked, S.lvl + 1); g.save('unlocked', S.unlocked);
        loadLevel(g);
      }
      return;
    }
    S.time += dt;
    if (m.clicked) {
      let best = -1, bd = 26;
      S.v.forEach((v, i) => { const d = Math.hypot(v.x - m.x, v.y - m.y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { pushUndo(); S.drag = best; S.dox = S.v[best].x - m.x; S.doy = S.v[best].y - m.y; g.sfx.tone(520, 0.04, 'sine', 0.05); }
      if (g.inRect(730, 380, 210, 50)) undo(g);
      if (g.inRect(730, 440, 210, 50)) hint(g);
      if (g.inRect(730, 500, 210, 50)) { pushUndo(); scatter(); countCross(); g.sfx.drop(); }
      if (g.inRect(730, 600, 100, 44)) S.mode = 'select';
      if (g.inRect(840, 600, 100, 44)) { S.gaveUp = true; S.v.forEach((v, i) => { v.tx = S.sol[i][0]; v.ty = S.sol[i][1]; }); say('정답 배치 — 이 판은 점수 없음'); }
    }
    if (S.drag !== null && m.down) {
      const v = S.v[S.drag];
      v.x = U.clamp(m.x + S.dox, UT_AX + 10, UT_AX + UT_AW - 10); v.y = U.clamp(m.y + S.doy, UT_AY + 10, UT_AY + UT_AH - 10);
      const before = S.cross;
      countCross();
      if (S.cross < before) g.sfx.tone(400 + (S.total - S.cross) * 6, 0.03, 'triangle', 0.03);
    }
    if (S.drag !== null && !m.down) {
      const v = S.v[S.drag], u = S.undo[S.undo.length - 1];
      if (u && Math.hypot(u[S.drag][0] - v.x, u[S.drag][1] - v.y) < 2) S.undo.pop(); else S.moves++;
      S.drag = null; checkWin(g);
    }
    if (g.keyp('KeyU') || g.pressed('b')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `레벨 ${S.lvl + 1}/${UT_LEVELS.length} · 교차 ${S.cross} · 이동 ${S.moves} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🕸️ 선 풀기', 480, 80, 46, '#ede9fe');
      g.text('점을 옮겨 서로 교차하는 선을 모두 없애세요', 480, 135, 18, '#a78bfa', 'center', '600');
      UT_LEVELS.forEach((k, i) => {
        const x = 110 + (i % 4) * 190, y = 200 + Math.floor(i / 4) * 170, open = i < S.unlocked;
        g.rrect(x, y, 170, 140, 16, open ? (g.inRect(x, y, 170, 140) ? '#5b21b6' : '#4c1d95') : '#1e1b3a', open ? '#a78bfa' : '#2e2a55');
        g.text(open ? String(i + 1) : '🔒', x + 85, y + 45, 34, open ? '#fff' : '#3f3a6b');
        g.text(`점 ${(k * (k - 1)) / 2}개`, x + 85, y + 90, 16, open ? '#ddd6fe' : '#3f3a6b', 'center', '600');
        if (S.bestT[i]) g.text(`최고 ${U.fmtTime(S.bestT[i])}`, x + 85, y + 117, 13, '#facc15', 'center', '600');
      });
      return;
    }
    g.rrect(UT_AX, UT_AY, UT_AW, UT_AH, 18, '#13102b', '#2e2a55', 2);
    const done = S.cross === 0;
    for (let i = 0; i < S.e.length; i++) {
      const [a, b] = S.e[i], A = S.v[a], B = S.v[b];
      const bad = S.ecross[i] > 0;
      const hl = S.drag !== null && (a === S.drag || b === S.drag);
      g.line(A.x, A.y, B.x, B.y, done ? '#4ade80' : bad ? (hl ? '#fb7185' : '#e11d48') : hl ? '#a5f3fc' : '#22c55e', hl ? 4 : 3);
    }
    S.v.forEach((v, i) => {
      const d = i === S.drag, hintV = i === S.hintV && S.hintT > 0;
      if (hintV) g.ring(v.x, v.y, 22 + Math.sin(g.time * 10) * 3, '#facc15', 3);
      g.circle(v.x, v.y + 2, d ? 15 : 12, 'rgba(0,0,0,.5)');
      g.circle(v.x, v.y, d ? 15 : 12, d ? '#fde047' : S.vcross[i] ? '#f472b6' : '#c4b5fd');
      g.circle(v.x - 3, v.y - 3, 4, 'rgba(255,255,255,.6)');
    });
    if (S.hintT > 0) S.hintT -= 1 / 60;
    // 패널
    g.rrect(715, 20, 235, 640, 16, '#13102b', '#2e2a55');
    g.text('선 풀기', 832, 58, 28, '#ede9fe');
    g.text(`레벨 ${S.lvl + 1} / ${UT_LEVELS.length}`, 832, 96, 18, '#a78bfa');
    g.text(`점 ${S.v.length} · 선 ${S.e.length}`, 832, 125, 16, '#8b5cf6', 'center', '600');
    g.text(`교차 ${S.cross}`, 832, 180, 38, done ? '#4ade80' : '#fb7185');
    const prog = S.total ? 1 - S.cross / S.total : 1;
    g.rrect(740, 215, 185, 18, 9, '#2e2a55'); g.rrect(740, 215, Math.max(18, 185 * prog), 18, 9, '#8b5cf6');
    g.text(`⏱️ ${U.fmtTime(S.time)}`, 832, 265, 20, '#ddd6fe');
    g.text(`이동 ${S.moves} · 💡 ${S.hintsUsed}`, 832, 295, 16, '#a78bfa', 'center', '600');
    if (S.bestT[S.lvl]) g.text(`최고 기록 ${U.fmtTime(S.bestT[S.lvl])}`, 832, 325, 15, '#facc15', 'center', '600');
    g.button(730, 380, 210, 50, `↶ 되돌리기 (${S.undo.length})`, '#4c1d95', 17);
    g.button(730, 440, 210, 50, '💡 힌트', '#15803d', 17);
    g.button(730, 500, 210, 50, '🔀 다시 섞기', '#475569', 17);
    g.button(730, 600, 100, 44, '레벨', '#2e2a55', 15);
    g.button(840, 600, 100, 44, '정답 보기', '#2e2a55', 14);
    if (S.msgT > 0) { g.rrect(160, 600, 400, 46, 12, 'rgba(19,16,43,.95)', '#5b21b6'); g.text(S.msg, 360, 623, 17, '#fff'); }
    if (S.clear > 0) {
      g.rrect(160, 250, 400, 140, 20, 'rgba(19,16,43,.94)', '#4ade80', 3);
      g.text(S.gaveUp ? '정답을 확인했어요' : '✨ 모두 풀렸어요!', 360, 292, 30, '#fff');
      g.text(S.gaveUp ? '점수 없음' : `${U.fmtTime(S.time)} · +${S.lastPts}점`, 360, 342, 20, '#fde68a');
    }
  },
});

// 무작위 직선 배치의 교점 = 점, 같은 직선 위 이웃 교점끼리 = 선 → 항상 평면 그래프
function genGraph(k) {
  for (let att = 0; att < 100; att++) {
    const lines = [];
    for (let i = 0; i < k; i++) {
      const a = Math.random() * Math.PI, px = Math.random(), py = Math.random();
      lines.push({ px, py, dx: Math.cos(a), dy: Math.sin(a) });
    }
    const V = [], onLine = lines.map(() => []);
    let bad = false;
    for (let i = 0; i < k && !bad; i++) for (let j = i + 1; j < k; j++) {
      const A = lines[i], B = lines[j];
      const den = A.dx * B.dy - A.dy * B.dx;
      if (Math.abs(den) < 0.08) { bad = true; break; }
      const t = ((B.px - A.px) * B.dy - (B.py - A.py) * B.dx) / den;
      const s = ((B.px - A.px) * A.dy - (B.py - A.py) * A.dx) / den;
      const id = V.length;
      V.push([A.px + A.dx * t, A.py + A.dy * t]);
      onLine[i].push([t, id]); onLine[j].push([s, id]);
    }
    if (bad) continue;
    const E = [], seen = new Set();
    for (const L of onLine) {
      L.sort((a, b) => a[0] - b[0]);
      for (let q = 1; q < L.length; q++) {
        const a = L[q - 1][1], b = L[q][1], key = Math.min(a, b) + ',' + Math.max(a, b);
        if (!seen.has(key)) { seen.add(key); E.push([a, b]); }
      }
    }
    // 정답 좌표를 화면 영역에 맞추기 (순위 기반으로 퍼뜨려 너무 뭉치지 않게 — 순서 보존 변환은 평면성을 해칠 수 있어 아핀 변환 사용)
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const [x, y] of V) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const sc = Math.min((UT_AW - 80) / (maxx - minx || 1), (UT_AH - 80) / (maxy - miny || 1));
    const sol = V.map(([x, y]) => [UT_AX + UT_AW / 2 + (x - (minx + maxx) / 2) * sc, UT_AY + UT_AH / 2 + (y - (miny + maxy) / 2) * sc]);
    // 점들이 너무 가까우면 다시
    let minD = 1e9;
    for (let i = 0; i < sol.length; i++) for (let j = i + 1; j < sol.length; j++) minD = Math.min(minD, Math.hypot(sol[i][0] - sol[j][0], sol[i][1] - sol[j][1]));
    if (minD < 14 && att < 90) continue;
    return { n: V.length, E, sol };
  }
  return null;
}
function scatter() {
  // 원 위에 무작위 순서로 배치 → 많이 엉킴
  const order = U.shuffle(S.v.map((_, i) => i));
  const R = Math.min(UT_AW, UT_AH) / 2 - 40, cx = UT_AX + UT_AW / 2, cy = UT_AY + UT_AH / 2;
  order.forEach((vi, k) => { const a = (k / order.length) * Math.PI * 2; S.v[vi].x = cx + Math.cos(a) * R; S.v[vi].y = cy + Math.sin(a) * R; S.v[vi].tx = undefined; });
}
function loadLevel(g) {
  const k = UT_LEVELS[S.lvl];
  let G = null;
  while (!G) G = genGraph(k);
  S.v = G.sol.map(() => ({ x: 0, y: 0 }));
  S.e = G.E; S.sol = G.sol;
  S.adj = S.v.map(() => []);
  S.e.forEach(([a, b], i) => { S.adj[a].push(i); S.adj[b].push(i); });
  let tries = 0;
  do { scatter(); countCross(); } while (S.cross < S.e.length / 2 && tries++ < 20);
  S.total = S.cross;
  S.mode = 'play'; S.undo = []; S.moves = 0; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.drag = null; S.gaveUp = false; S.hintV = -1; S.hintT = 0;
  g.sfx.tone(440, 0.08, 'triangle', 0.06);
}
function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
function crosses(i, j) {
  const [a, b] = S.e[i], [c, d] = S.e[j];
  if (a === c || a === d || b === c || b === d) return false;
  const A = S.v[a], B = S.v[b], C = S.v[c], D = S.v[d];
  return segX(A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y);
}
function countCross() {
  const n = S.e.length;
  S.ecross = new Array(n).fill(0);
  S.vcross = new Array(S.v.length).fill(0);
  let tot = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (crosses(i, j)) { tot++; S.ecross[i]++; S.ecross[j]++; }
  S.e.forEach(([a, b], i) => { if (S.ecross[i]) { S.vcross[a] += S.ecross[i]; S.vcross[b] += S.ecross[i]; } });
  S.cross = tot;
  return tot;
}
function crossOfVertex(vi) {
  let t = 0;
  for (const i of S.adj[vi]) for (let j = 0; j < S.e.length; j++) if (j !== i && crosses(i, j)) t++;
  return t;
}
function pushUndo() { S.undo.push(S.v.map((v) => [v.tx ?? v.x, v.ty ?? v.y])); if (S.undo.length > 200) S.undo.shift(); }
function undo(g) {
  const u = S.undo.pop();
  if (!u) return;
  u.forEach(([x, y], i) => { S.v[i].tx = x; S.v[i].ty = y; });
  S.moves++; g.sfx.tone(300, 0.05, 'sine', 0.05);
}
function say(t) { S.msg = t; S.msgT = 2.4; }
function bestSpot(vi) {
  const v = S.v[vi], ox = v.x, oy = v.y;
  const base = crossOfVertex(vi);
  let bx = ox, by = oy, best = base;
  const cand = [];
  for (let gx = 0; gx < 17; gx++) for (let gy = 0; gy < 16; gy++) cand.push([UT_AX + 30 + gx * ((UT_AW - 60) / 16), UT_AY + 30 + gy * ((UT_AH - 60) / 15)]);
  // 이웃 점들의 무게중심 근처도 후보
  const nb = S.adj[vi].map((ei) => { const [a, b] = S.e[ei]; return a === vi ? b : a; });
  const mx = nb.reduce((s, i) => s + S.v[i].x, 0) / nb.length, my = nb.reduce((s, i) => s + S.v[i].y, 0) / nb.length;
  for (let r = 0; r < 30; r++) cand.push([mx + U.rand(-40, 40), my + U.rand(-40, 40)]);
  for (const [x, y] of cand) {
    if (S.v.some((o, i) => i !== vi && Math.hypot(o.x - x, o.y - y) < 18)) continue;
    v.x = x; v.y = y;
    const c = crossOfVertex(vi);
    if (c < best) { best = c; bx = x; by = y; }
  }
  v.x = ox; v.y = oy;
  return { gain: base - best, x: bx, y: by };
}
function hint(g) {
  if (S.cross === 0) return;
  // 엉킨 점들을 교차 많은 순으로 살펴, 격자 후보 위치 중 교차가 가장 많이 줄어드는 곳으로 옮긴다
  const order = S.v.map((_, i) => i).filter((i) => S.vcross[i] > 0).sort((a, b) => S.vcross[b] - S.vcross[a]).slice(0, 8);
  let pick = null;
  for (const vi of order) { const r = bestSpot(vi); if (r.gain > 0 && (!pick || r.gain > pick.gain)) pick = { vi, ...r }; }
  pushUndo();
  S.hintsUsed++; S.moves++;
  let vi;
  if (pick) { vi = pick.vi; S.v[vi].tx = pick.x; S.v[vi].ty = pick.y; say(`💡 점 하나를 옮겨 교차 ${pick.gain}개 줄였어요`); }
  else {
    // 막다른 상태: 아직 정답 자리가 아닌 점 하나를 정답 위치로
    vi = order[0];
    const off = S.v.map((v, i) => i).filter((i) => Math.hypot(S.v[i].x - S.sol[i][0], S.v[i].y - S.sol[i][1]) > 3);
    if (off.length) vi = off.sort((a, b) => S.vcross[b] - S.vcross[a])[0];
    S.v[vi].tx = S.sol[vi][0]; S.v[vi].ty = S.sol[vi][1]; say('💡 이 점을 정답 위치로 옮겼어요');
  }
  S.hintV = vi; S.hintT = 1.5;
  g.sfx.power();
}
function checkWin(g) {
  if (S.clear > 0 || S.cross > 0) return;
  if (S.v.some((v) => v.tx !== undefined)) return;
  S.clear = 2.4;
  if (!S.gaveUp) {
    const n = S.v.length;
    S.lastPts = Math.max(50, n * 40 - Math.floor(S.time) * 2 - S.hintsUsed * 60 + (S.lvl + 1) * 100);
    g.add(S.lastPts);
    if (!S.bestT[S.lvl] || S.time < S.bestT[S.lvl]) { S.bestT[S.lvl] = Math.ceil(S.time); g.save('bestT', S.bestT); }
  }
  g.sfx.win(); g.shake(4);
  for (let i = 0; i < S.v.length; i += 2) g.burst(S.v[i].x, S.v[i].y, ['#4ade80', '#c4b5fd', '#fde047'], 8, 180, 0.8);
}
