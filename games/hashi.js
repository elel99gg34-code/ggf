let S;
const HGS = 600, HOX = 24, HOY = 40, HPX = 660;
const HD = [
  { n: '쉬움', size: 7, isl: 9, base: 300 },
  { n: '보통', size: 9, isl: 15, base: 700 },
  { n: '어려움', size: 11, isl: 22, base: 1300 },
  { n: '전문가', size: 13, isl: 32, base: 2200 },
];
const HDIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
GAME({
  title: '다리 놓기', w: 960, h: 680, bg: '#0c4a6e', controls: 'none',
  help: '섬의 숫자 = 그 섬에 연결된 다리 수 · 다리는 가로/세로 직선, 두 섬 사이 최대 2개\n다리끼리 교차할 수 없고, 모든 섬이 하나로 연결되어야 해요\n섬에서 다른 섬 방향으로 드래그 → 다리 0→1→2→0 · 다리 클릭으로도 변경\n우클릭: 다리 제거 · U 되돌리기 · H 힌트',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse;
    if (S.done) { S.doneT += dt; if (g.clickIn(HPX, 560, 270, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt;
    if (m.clicked) {
      const isl = islandAt(m.x, m.y);
      if (isl >= 0) S.drag = { from: isl, x: m.x, y: m.y };
      else {
        const e = edgeAt(m.x, m.y);
        if (e >= 0) cycle(g, e, 1);
        else {
          if (g.inRect(HPX, 286, 131, 48)) undo(g);
          if (g.inRect(HPX + 139, 286, 131, 48)) hint(g);
          if (g.inRect(HPX, 342, 131, 48)) clearAll(g);
          if (g.inRect(HPX + 139, 342, 131, 48)) { newPuzzle(g); g.sfx.click(); }
          HD.forEach((d, k) => { if (g.inRect(HPX + k * 69, 110, 64, 40)) { S.diff = k; g.save('diff', k); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
        }
      }
    }
    if (m.rclick) { const e = edgeAt(m.x, m.y); if (e >= 0 && S.cnt[e]) { snap(); S.cnt[e] = 0; g.sfx.drop(); evalState(); } }
    if (S.drag && !m.down) {
      const d = S.drag; S.drag = null;
      const dx = m.x - d.x, dy = m.y - d.y;
      if (Math.hypot(dx, dy) > S.cs * 0.35) {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
        const e = S.isl[d.from].nb[dir];
        if (e >= 0) cycle(g, e, 1); else g.sfx.beep(200, 0.08);
      } else {
        // 섬 클릭: 선택 → 이웃 섬 클릭으로 연결
        if (S.selIsl >= 0 && S.selIsl !== d.from) {
          const e = S.edges.findIndex((E) => (E.a === S.selIsl && E.b === d.from) || (E.b === S.selIsl && E.a === d.from));
          if (e >= 0) cycle(g, e, 1); else g.sfx.beep(200, 0.08);
          S.selIsl = -1;
        } else { S.selIsl = S.selIsl === d.from ? -1 : d.from; g.sfx.click(); }
      }
    }
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `${HD[S.diff].n} · 🏝️${S.isl.length} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, P = (x, y) => [HOX + x * cs + cs / 2, HOY + y * cs + cs / 2];
    g.rrect(HOX, HOY, n * cs, n * cs, 12, '#0e7490');
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g.circle(...P(x, y), 1.5, 'rgba(255,255,255,.18)');
    // 물결
    for (let k = 0; k < 6; k++) { const yy = HOY + 40 + k * 95 + Math.sin(g.time + k) * 6; g.line(HOX + 20, yy, HOX + 60, yy - 4, 'rgba(255,255,255,.08)', 3); }
    S.edges.forEach((E, e) => {
      const k = S.cnt[e]; if (!k) return;
      const A = S.isl[E.a], B = S.isl[E.b], [x1, y1] = P(A.x, A.y), [x2, y2] = P(B.x, B.y);
      const col = S.done ? '#fde047' : S.hintE === e && S.hintT > g.time ? '#fb923c' : '#a16207';
      const ox = E.h ? 0 : 5, oy = E.h ? 5 : 0;
      if (k === 1) { g.line(x1, y1, x2, y2, '#78350f', 7); g.line(x1, y1, x2, y2, col, 4); }
      else for (const s of [-1, 1]) { g.line(x1 + ox * s, y1 + oy * s, x2 + ox * s, y2 + oy * s, '#78350f', 6); g.line(x1 + ox * s, y1 + oy * s, x2 + ox * s, y2 + oy * s, col, 3); }
    });
    if (S.drag) { const [x1, y1] = P(S.isl[S.drag.from].x, S.isl[S.drag.from].y); g.line(x1, y1, g.mouse.x, g.mouse.y, 'rgba(253,224,71,.6)', 3); }
    const r = cs * 0.38;
    S.isl.forEach((I, k) => {
      const [x, y] = P(I.x, I.y), have = S.st.deg[k];
      const fill = have === I.need ? '#22c55e' : have > I.need ? '#ef4444' : '#fef3c7';
      g.circle(x, y + 2, r, 'rgba(0,0,0,.3)');
      g.circle(x, y, r, fill); g.ring(x, y, r, S.selIsl === k ? '#facc15' : '#78350f', S.selIsl === k ? 4 : 2.5);
      g.text(String(I.need), x, y + 1, r * 1.1, have === I.need ? '#fff' : '#422006');
    });
    g.text('다리 놓기', HPX + 135, 40, 30, '#e0f2fe');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, HPX + 135, 80, 16, '#bae6fd');
    HD.forEach((d, k) => g.button(HPX + k * 69, 110, 64, 40, d.n, S.diff === k ? '#ca8a04' : '#075985', 14));
    const st = S.st;
    g.text(`완성된 섬 ${st.ok} / ${S.isl.length}`, HPX + 135, 180, 18, '#e0f2fe');
    g.text(`연결 그룹 ${st.groups}개`, HPX + 135, 210, 16, st.groups === 1 ? '#86efac' : '#bae6fd');
    g.rrect(HPX, 228, 270, 12, 6, '#075985'); g.rrect(HPX, 228, 270 * st.ok / S.isl.length, 12, 6, '#22c55e');
    g.button(HPX, 286, 131, 48, '↶ 되돌리기', '#075985', 16);
    g.button(HPX + 139, 286, 131, 48, '💡 힌트', '#a16207', 16);
    g.button(HPX, 342, 131, 48, '🧹 모두 지우기', '#075985', 15);
    g.button(HPX + 139, 342, 131, 48, '🔄 새 퍼즐', '#7c2d12', 16);
    if (st.ok === S.isl.length && st.groups > 1 && !S.done) g.text('⚠️ 모든 섬이 하나로 이어져야 해요', HPX + 135, 412, 15, '#fca5a5');
    if (S.done) {
      g.rrect(HPX - 10, 440, 290, 186, 14, 'rgba(21,128,61,.95)', '#fff', 3);
      g.text('🌉 모두 연결!', HPX + 135, 478, 28, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, HPX + 135, 522, 18, '#dcfce7');
      g.button(HPX, 560, 270, 56, '다음 퍼즐 ▶', '#166534', 22);
    }
  },
});
function genHashi(D) {
  const n = D.size;
  for (let att = 0; att < 50; att++) {
    const grid = U.grid(n, n, 0); // 0 빈, 1 섬, 2 가로다리, 3 세로다리
    const isl = [], br = [];
    const sx = U.randi(0, n - 1), sy = U.randi(0, n - 1); grid[sy][sx] = 1; isl.push({ x: sx, y: sy });
    let tries = 0;
    while (isl.length < D.isl && tries++ < 3000) {
      const a = U.randi(0, isl.length - 1), A = isl[a], [dx, dy] = U.choice(HDIRS);
      const len = U.randi(2, Math.max(2, Math.min(5, n - 2)));
      const tx = A.x + dx * len, ty = A.y + dy * len;
      if (tx < 0 || ty < 0 || tx >= n || ty >= n || grid[ty][tx]) continue;
      let ok = true;
      for (let s = 1; s < len; s++) if (grid[A.y + dy * s][A.x + dx * s]) { ok = false; break; }
      if (!ok) continue;
      // 새 섬이 다른 섬과 바로 붙지 않게
      if (HDIRS.some(([ex, ey]) => { const qx = tx + ex, qy = ty + ey; return qx >= 0 && qy >= 0 && qx < n && qy < n && grid[qy][qx] === 1; })) continue;
      grid[ty][tx] = 1; isl.push({ x: tx, y: ty });
      for (let s = 1; s < len; s++) grid[A.y + dy * s][A.x + dx * s] = dx ? 2 : 3;
      br.push({ a, b: isl.length - 1, k: Math.random() < 0.4 ? 2 : 1 });
    }
    if (isl.length < D.isl * 0.8) continue;
    // 추가 연결 (고리 만들기)
    const id = (x, y) => isl.findIndex((I) => I.x === x && I.y === y);
    for (let a = 0; a < isl.length; a++) for (const [dx, dy] of HDIRS.slice(0, 2)) {
      let x = isl[a].x + dx, y = isl[a].y + dy, ok = true;
      while (x < n && y < n && grid[y][x] !== 1) { if (grid[y][x]) { ok = false; break; } x += dx; y += dy; }
      if (!ok || x >= n || y >= n) continue;
      const b = id(x, y); if (br.some((B) => (B.a === a && B.b === b) || (B.a === b && B.b === a))) continue;
      if (Math.random() < 0.3) { for (let px = isl[a].x + dx, py = isl[a].y + dy; px !== x || py !== y; px += dx, py += dy) grid[py][px] = dx ? 2 : 3; br.push({ a, b, k: Math.random() < 0.3 ? 2 : 1 }); }
    }
    return { n, isl, br };
  }
  return null;
}
function newPuzzle(g) {
  const D = HD[S.diff]; let P = null; while (!P) P = genHashi(D);
  const n = P.n, isl = P.isl.map((I) => ({ x: I.x, y: I.y, need: 0, nb: [-1, -1, -1, -1] }));
  for (const B of P.br) { isl[B.a].need += B.k; isl[B.b].need += B.k; }
  // 가능한 모든 다리 후보(이웃 섬 쌍)
  const at = new Map(); isl.forEach((I, k) => at.set(I.y * n + I.x, k));
  const edges = [];
  isl.forEach((I, a) => {
    for (const d of [0, 1]) {
      const [dx, dy] = HDIRS[d]; let x = I.x + dx, y = I.y + dy;
      while (x < n && y < n && !at.has(y * n + x)) { x += dx; y += dy; }
      if (x >= n || y >= n) continue;
      const b = at.get(y * n + x); const e = edges.length;
      edges.push({ a, b, h: d === 0, x1: Math.min(I.x, x), y1: Math.min(I.y, y), x2: Math.max(I.x, x), y2: Math.max(I.y, y) });
      isl[a].nb[d] = e; isl[b].nb[d + 2] = e;
    }
  });
  const sol = edges.map((E) => { const B = P.br.find((B) => (B.a === E.a && B.b === E.b) || (B.a === E.b && B.b === E.a)); return B ? B.k : 0; });
  Object.assign(S, { n, cs: Math.floor(HGS / n), isl, edges, sol, cnt: edges.map(() => 0), hist: [], time: 0, hints: 0, done: false, doneT: 0, drag: null, selIsl: -1, hintE: -1, hintT: 0 });
  evalState();
}
function crosses(e1, e2) {
  const A = S.edges[e1], B = S.edges[e2]; if (A.h === B.h) return false;
  const H = A.h ? A : B, V = A.h ? B : A;
  return V.x1 > H.x1 && V.x1 < H.x2 && H.y1 > V.y1 && H.y1 < V.y2;
}
function islandAt(mx, my) {
  const cs = S.cs;
  for (let k = 0; k < S.isl.length; k++) { const I = S.isl[k]; if (Math.hypot(HOX + I.x * cs + cs / 2 - mx, HOY + I.y * cs + cs / 2 - my) < cs * 0.45) return k; }
  return -1;
}
function edgeAt(mx, my) {
  const cs = S.cs, x = (mx - HOX) / cs - 0.5, y = (my - HOY) / cs - 0.5;
  let best = -1, bd = 0.35;
  S.edges.forEach((E, e) => {
    let d;
    if (E.h) d = x > E.x1 && x < E.x2 ? Math.abs(y - E.y1) : 9; else d = y > E.y1 && y < E.y2 ? Math.abs(x - E.x1) : 9;
    if (d < bd && (S.cnt[e] || d < 0.25)) { bd = d; best = e; }
  });
  return best;
}
function cycle(g, e, dir) {
  const next = (S.cnt[e] + dir + 3) % 3;
  if (next > 0 && S.cnt[e] === 0) {
    const blk = S.edges.findIndex((_, f) => S.cnt[f] && crosses(e, f));
    if (blk >= 0) { g.sfx.hit(); g.shake(3, 0.12); S.hintE = blk; S.hintT = g.time + 0.6; return; }
  }
  snap(); S.cnt[e] = next; evalState();
  const E = S.edges[e], cs = S.cs, mx = HOX + ((E.x1 + E.x2) / 2) * cs + cs / 2, my = HOY + ((E.y1 + E.y2) / 2) * cs + cs / 2;
  if (next) { g.sfx.tone(300 + next * 150, 0.08, 'triangle', 0.07); g.burst(mx, my, ['#fbbf24', '#a16207'], 6, 90, 0.3); } else g.sfx.drop();
  for (const k of [E.a, E.b]) if (S.st.deg[k] === S.isl[k].need) { const I = S.isl[k]; g.burst(HOX + I.x * cs + cs / 2, HOY + I.y * cs + cs / 2, '#86efac', 8, 100, 0.4); }
  checkDone(g);
}
function evalState() {
  const deg = S.isl.map(() => 0), par = S.isl.map((_, k) => k);
  const f = (k) => (par[k] === k ? k : (par[k] = f(par[k])));
  S.edges.forEach((E, e) => { if (S.cnt[e]) { deg[E.a] += S.cnt[e]; deg[E.b] += S.cnt[e]; par[f(E.a)] = f(E.b); } });
  const roots = new Set(S.isl.map((_, k) => f(k)));
  S.st = { deg, ok: deg.filter((d, k) => d === S.isl[k].need).length, groups: roots.size };
}
function snap() { S.hist.push(S.cnt.slice()); if (S.hist.length > 400) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cnt = h; evalState(); g.sfx.move(); }
function clearAll(g) { if (!S.cnt.some((v) => v)) return; snap(); S.cnt.fill(0); evalState(); g.sfx.drop(); }
function checkDone(g) {
  if (S.st.ok !== S.isl.length || S.st.groups !== 1) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(HD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 80));
  g.add(S.gain, HOX + 300, HOY + 300); g.sfx.win(); g.shake(5, 0.3);
  S.isl.forEach((I, k) => g.later(() => g.burst(HOX + I.x * S.cs + S.cs / 2, HOY + I.y * S.cs + S.cs / 2, ['#fde047', '#22c55e', '#fff'], 18, 200, 0.8), k * 0.05));
}
function hint(g) {
  // 해답과 다른 다리 하나를 고침 (교차하는 잘못된 다리 먼저 제거)
  const diff = []; S.edges.forEach((_, e) => { if (S.cnt[e] !== S.sol[e]) diff.push(e); });
  if (!diff.length) return;
  let e = diff.find((x) => S.cnt[x] > S.sol[x]); if (e === undefined) e = U.choice(diff);
  snap();
  if (S.sol[e] > 0) S.edges.forEach((_, f) => { if (S.cnt[f] && crosses(e, f)) S.cnt[f] = 0; });
  S.cnt[e] = S.sol[e]; S.hints++; S.hintE = e; S.hintT = g.time + 1.5; g.sfx.power(); evalState(); checkDone(g);
}
