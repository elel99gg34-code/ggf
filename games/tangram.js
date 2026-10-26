let S;
const TU = 32, TCX = 300, TCY = 345;
const TPIECES = [
  { n: 'L', pts: [[0, 0], [4, 0], [2, 2]], col: '#ef4444' },
  { n: 'L', pts: [[0, 0], [4, 0], [2, 2]], col: '#3b82f6' },
  { n: 'M', pts: [[0, 0], [2, 0], [0, 2]], col: '#22c55e' },
  { n: 'Q', pts: [[1, 0], [2, 1], [1, 2], [0, 1]], col: '#eab308' },
  { n: 'P', pts: [[0, 0], [2, 0], [3, 1], [1, 1]], col: '#a855f7' },
  { n: 'S', pts: [[0, 0], [2, 0], [1, 1]], col: '#f97316' },
  { n: 'S', pts: [[0, 0], [2, 0], [1, 1]], col: '#14b8a6' },
];
const TTRAY = [[700, 120], [870, 120], [690, 250], [790, 250], [890, 255], [700, 360], [820, 360]];
const TDF = [
  { n: '쉬움', outline: true, compact: 3, base: 300 },
  { n: '보통', outline: false, compact: 3, base: 700 },
  { n: '어려움', outline: false, compact: 1, base: 1200 },
  { n: '전문가', outline: false, compact: 0.3, base: 1800 },
];
GAME({
  title: '탱그램', w: 960, h: 680, bg: '#f1f5f9', controls: 'none',
  help: '7개의 조각을 모두 써서 왼쪽 회색 실루엣을 빈틈·겹침 없이 채워요\n드래그: 이동 (격자에 딱 붙어요) · 클릭: 45° 회전 · 우클릭: 반대로 회전\nQ/E: 선택 조각 회전 · T: 평행사변형 뒤집기 · 💡 힌트: 조각 하나의 자리 공개\n쉬움은 조각 경계선이 보여요',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse;
    if (!S.done) S.time += dt;
    if (m.clicked) {
      TDF.forEach((d, k) => { if (g.inRect(620 + k * 82, 440, 76, 38)) { S.diff = k; g.save('diff', k); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
      if (g.inRect(620, 490, 100, 44)) rotSel(g, -1);
      if (g.inRect(728, 490, 100, 44)) rotSel(g, 1);
      if (g.inRect(836, 490, 100, 44)) flipSel(g);
      if (g.inRect(620, 542, 154, 44)) hint(g);
      if (g.inRect(782, 542, 154, 44)) { resetPieces(); g.sfx.drop(); }
      if (g.inRect(620, 594, 316, 48)) { newPuzzle(g); g.sfx.click(); }
    }
    if (S.done) { if (g.pressed('a')) newPuzzle(g); return; }
    if (m.clicked || m.rclick) {
      const k = pick(m.x, m.y);
      if (k >= 0) {
        S.sel = k; S.order.splice(S.order.indexOf(k), 1); S.order.push(k);
        if (m.rclick) { rotSel(g, -1); }
        else { const p = S.pc[k]; S.drag = { k, ox: m.x - p.x, oy: m.y - p.y, sx: m.x, sy: m.y, moved: false }; }
      }
    }
    if (S.drag) {
      const d = S.drag, p = S.pc[d.k];
      if (Math.hypot(m.x - d.sx, m.y - d.sy) > 5) d.moved = true;
      if (d.moved) { p.x = U.clamp(m.x - d.ox, 10, 950); p.y = U.clamp(m.y - d.oy, 50, 670); }
      if (!m.down) { S.drag = null; if (!d.moved) rotSel(g, 1); else { snapPiece(p); g.sfx.tone(320, 0.05, 'triangle', 0.06); checkDone(g); } }
    }
    if (g.keyp('KeyQ')) rotSel(g, -1);
    if (g.keyp('KeyE')) rotSel(g, 1);
    if (g.keyp('KeyT')) flipSel(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `${TDF[S.diff].n} · 실루엣 ${S.solvedCnt + 1} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    g.rrect(30, 60, 540, 580, 18, '#e2e8f0');
    // 실루엣
    for (const pl of S.target) g.poly(pl.v.map(([x, y]) => [S.tx + x * TU, S.ty + y * TU]), S.done ? '#fbbf24' : '#334155', S.done ? '#fbbf24' : '#334155', 1.5);
    if (TDF[S.diff].outline || S.done) for (const pl of S.target) g.poly(pl.v.map(([x, y]) => [S.tx + x * TU, S.ty + y * TU]), null, 'rgba(255,255,255,.35)', 1.5);
    c.setLineDash([6, 4]);
    for (const k of S.revealed) g.poly(S.target[k].v.map(([x, y]) => [S.tx + x * TU, S.ty + y * TU]), 'rgba(250,204,21,.25)', '#facc15', 2.5);
    c.setLineDash([]);
    if (!S.done) for (const k of S.order) {
      const p = S.pc[k], v = verts(p);
      g.poly(v.map(([x, y]) => [x + 3, y + 4]), 'rgba(0,0,0,.18)');
      g.poly(v, TPIECES[k].col, k === S.sel ? '#0f172a' : 'rgba(255,255,255,.8)', k === S.sel ? 3 : 2);
    }
    g.text('탱그램', 780, 40, 30, '#0f172a');
    g.text(`실루엣 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, 300, 34, 16, '#475569');
    g.text(S.shapeName, 300, 84, 18, '#334155');
    TDF.forEach((d, k) => g.button(620 + k * 82, 440, 76, 38, d.n, S.diff === k ? '#0f766e' : '#64748b', 15));
    g.button(620, 490, 100, 44, '⟲ 45°', '#334155', 17);
    g.button(728, 490, 100, 44, '⟳ 45°', '#334155', 17);
    g.button(836, 490, 100, 44, '⇋ 뒤집기', '#334155', 16);
    g.button(620, 542, 154, 44, `💡 힌트 (${S.hints})`, '#ca8a04', 16);
    g.button(782, 542, 154, 44, '↺ 조각 되돌리기', '#64748b', 15);
    g.button(620, 594, 316, 48, S.done ? '다음 실루엣 ▶' : '🔄 새 실루엣', S.done ? '#15803d' : '#7c2d12', 19);
    g.text(`덮은 칸 ${Math.round(S.cover * 100)}%`, 300, 620, 16, S.cover > 0.99 ? '#15803d' : '#475569');
    if (S.done) {
      g.rrect(140, 100, 320, 70, 14, 'rgba(21,128,61,.92)', '#fff', 3);
      g.text(`🎉 완성! +${S.gain}점`, 300, 135, 26, '#fff');
    }
  },
});
function rotPt(x, y, r, flip) { if (flip) x = -x; const a = r * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
function centroid(pts) { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; }
function verts(p) {
  const base = TPIECES[p.i].pts, [cx, cy] = centroid(base);
  return base.map(([x, y]) => { const [a, b] = rotPt(x - cx, y - cy, p.rot, p.flip); return [p.x + a * TU, p.y + b * TU]; });
}
function inPoly(px, py, v) {
  let ins = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) { const [xi, yi] = v[i], [xj, yj] = v[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins; }
  return ins;
}
function pick(x, y) { for (let k = S.order.length - 1; k >= 0; k--) if (inPoly(x, y, verts(S.pc[S.order[k]]))) return S.order[k]; return -1; }
const TQC = [[0.5, 0.2], [0.8, 0.5], [0.5, 0.8], [0.2, 0.5]];
function variants(i) {
  const out = [], base = TPIECES[i].pts;
  for (const flip of TPIECES[i].n === 'P' ? [false, true] : [false]) for (let k = 0; k < 4; k++) {
    let v = base.map(([x, y]) => rotPt(x, y, k * 2, flip).map((t) => Math.round(t)));
    const mx = Math.min(...v.map((p) => p[0])), my = Math.min(...v.map((p) => p[1]));
    v = v.map(([x, y]) => [x - mx, y - my]);
    const W = Math.max(...v.map((p) => p[0])), H = Math.max(...v.map((p) => p[1])), q = [];
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) for (let t = 0; t < 4; t++) if (inPoly(cx + TQC[t][0], cy + TQC[t][1], v)) q.push([cx, cy, t]);
    out.push({ v, q, k, flip });
  }
  return out;
}
function qNb(cx, cy, t) {
  const r = [[cx, cy, (t + 1) % 4], [cx, cy, (t + 3) % 4]];
  if (t === 0) r.push([cx, cy - 1, 2]); if (t === 1) r.push([cx + 1, cy, 3]); if (t === 2) r.push([cx, cy + 1, 0]); if (t === 3) r.push([cx - 1, cy, 1]);
  return r;
}
function genTarget(D) {
  const VAR = TPIECES.map((_, i) => variants(i));
  for (let att = 0; att < 30; att++) {
    const occ = new Set(), placed = [];
    const order = [0, 1, ...U.shuffle([2, 3, 4, 5, 6])];
    if (Math.random() < 0.5) order.splice(1, 1), order.splice(U.randi(1, 6), 0, 1);
    let bb = null, ok = true;
    for (const i of order) {
      if (!placed.length) { const v = U.choice(VAR[i]); for (const [cx, cy, t] of v.q) occ.add(cx + ',' + cy + ',' + t); placed.push({ i, v, dx: 0, dy: 0 }); bb = [0, 0, Math.max(...v.v.map((p) => p[0])), Math.max(...v.v.map((p) => p[1]))]; continue; }
      let best = null;
      for (let tr = 0; tr < 260; tr++) {
        const v = U.choice(VAR[i]), dx = U.randi(bb[0] - 4, bb[2] + 1), dy = U.randi(bb[1] - 4, bb[3] + 1);
        let bad = false, contact = 0;
        for (const [cx, cy, t] of v.q) { if (occ.has(cx + dx + ',' + (cy + dy) + ',' + t)) { bad = true; break; } }
        if (bad) continue;
        for (const [cx, cy, t] of v.q) for (const [a, b, u] of qNb(cx + dx, cy + dy, t)) if (occ.has(a + ',' + b + ',' + u)) contact++;
        if (contact < 2) continue;
        const W = Math.max(...v.v.map((p) => p[0])), H = Math.max(...v.v.map((p) => p[1]));
        const nb = [Math.min(bb[0], dx), Math.min(bb[1], dy), Math.max(bb[2], dx + W), Math.max(bb[3], dy + H)];
        if (nb[2] - nb[0] > 13 || nb[3] - nb[1] > 13) continue;
        const area = (nb[2] - nb[0]) * (nb[3] - nb[1]);
        const sc = contact * D.compact - area * 0.15 * D.compact + Math.random() * 6;
        if (!best || sc > best.sc) best = { sc, v, dx, dy, nb };
      }
      if (!best) { ok = false; break; }
      for (const [cx, cy, t] of best.v.q) occ.add(cx + best.dx + ',' + (cy + best.dy) + ',' + t);
      placed.push({ i, v: best.v, dx: best.dx, dy: best.dy }); bb = best.nb;
    }
    if (!ok || occ.size !== 64) continue;
    return { placed, bb, occ };
  }
  return null;
}
function newPuzzle(g) {
  const D = TDF[S.diff]; let T = null; while (!T) T = genTarget(D);
  const target = T.placed.map((pl) => ({ i: pl.i, v: pl.v.v.map(([x, y]) => [x + pl.dx, y + pl.dy]), rot: pl.v.k * 2, flip: pl.v.flip }));
  const [x0, y0, x1, y1] = T.bb;
  Object.assign(S, { target, occ: T.occ, bb: T.bb, tx: Math.round(TCX - ((x0 + x1) / 2) * TU), ty: Math.round(TCY - ((y0 + y1) / 2) * TU), time: 0, hints: 0, revealed: [], done: false, drag: null, sel: -1, cover: 0, shapeName: `수수께끼 실루엣 #${S.solvedCnt + 1}` });
  resetPieces();
}
function resetPieces() {
  S.pc = TPIECES.map((P, i) => ({ i, x: TTRAY[i][0], y: TTRAY[i][1], rot: S.diff >= 2 ? U.randi(0, 3) * 2 : 0, flip: false }));
  S.order = [0, 1, 2, 3, 4, 5, 6]; S.done = false; S.cover = 0;
}
function snapPiece(p) {
  if (p.rot % 2) return;
  const v = verts(p)[0];
  const sx = Math.round((v[0] - S.tx) / TU) * TU + S.tx - v[0], sy = Math.round((v[1] - S.ty) / TU) * TU + S.ty - v[1];
  p.x += sx; p.y += sy;
}
function rotSel(g, d) { if (S.sel < 0 || S.done) return; const p = S.pc[S.sel]; p.rot = (p.rot + d + 8) % 8; snapPiece(p); g.sfx.move(); checkDone(g); }
function flipSel(g) { if (S.sel < 0 || S.done) return; const p = S.pc[S.sel]; p.flip = !p.flip; snapPiece(p); g.sfx.move(); checkDone(g); }
function checkDone(g) {
  // 실루엣 쿼터 삼각형 중심이 정확히 한 조각에 덮이는지 확인
  const vs = S.pc.map(verts);
  let cov = 0, ok = S.pc.every((p) => p.rot % 2 === 0);
  for (const key of S.occ) {
    const [cx, cy, t] = key.split(',').map(Number), px = S.tx + (cx + TQC[t][0]) * TU, py = S.ty + (cy + TQC[t][1]) * TU;
    let k = 0; for (const v of vs) if (inPoly(px, py, v)) k++;
    if (k === 1) cov++; else ok = false;
  }
  S.cover = cov / 64;
  if (!ok || cov !== 64) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(TDF[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.5 - S.hints * 150));
  g.add(S.gain, TCX, TCY); g.sfx.win(); g.shake(5, 0.3);
  for (let k = 0; k < 9; k++) g.later(() => g.burst(TCX + U.rand(-170, 170), TCY + U.rand(-170, 170), ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'], 24, 260, 1), k * 0.1);
}
function sameShape(a, b) { return a.length === b.length && a.every(([x, y]) => b.some(([u, w]) => Math.abs(x - u) < 2 && Math.abs(y - w) < 2)); }
function hint(g) {
  if (S.done) return;
  const tv = (k) => S.target[k].v.map(([x, y]) => [S.tx + x * TU, S.ty + y * TU]);
  // 아직 맞지 않은 목표 조각 하나 선택
  const used = new Set();
  const unmatched = S.target.map((_, k) => k).filter((k) => { const j = S.pc.findIndex((p, pi) => !used.has(pi) && TPIECES[p.i].n === TPIECES[S.target[k].i].n && sameShape(verts(p), tv(k))); if (j >= 0) { used.add(j); return false; } return true; });
  if (!unmatched.length) return;
  const k = unmatched.find((q) => !S.revealed.includes(q)) ?? unmatched[0];
  if (!S.revealed.includes(k)) S.revealed.push(k);
  const tp = S.target[k], pi = S.pc.findIndex((p, j) => !used.has(j) && TPIECES[p.i].n === TPIECES[tp.i].n);
  if (pi >= 0) {
    const p = S.pc[pi], [cx, cy] = centroid(tp.v);
    p.rot = tp.rot; p.flip = tp.flip; p.x = S.tx + cx * TU; p.y = S.ty + cy * TU;
    if (!sameShape(verts(p), tv(k))) { p.flip = !p.flip; }
    S.order.splice(S.order.indexOf(pi), 1); S.order.push(pi); S.sel = pi;
    g.burst(p.x, p.y, '#facc15', 16, 150, 0.6);
  }
  S.hints++; g.sfx.power(); checkDone(g);
}
