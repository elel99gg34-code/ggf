let S;
const QGS = 600, QOX = 24, QOY = 40, QPX = 660, QPY = 200;
const QD = [
  { n: '쉬움', size: 6, p: 0.12, base: 500 },
  { n: '보통', size: 8, p: 0.18, base: 1100 },
  { n: '어려움', size: 10, p: 0.2, base: 2000 },
  { n: '전문가', size: 12, p: 0.22, base: 3200 },
];
const QMIN = [], QMAX = [];
for (let m = 0; m < 512; m++) {
  const av = []; for (let d = 1; d <= 9; d++) if (!(m & (1 << (d - 1)))) av.push(d);
  const mn = [0], mx = [0];
  for (let k = 1; k <= 9; k++) { mn.push(k <= av.length ? mn[k - 1] + av[k - 1] : 999); mx.push(k <= av.length ? mx[k - 1] + av[av.length - k] : -1); }
  QMIN.push(mn); QMAX.push(mx);
}
GAME({
  title: '카쿠로', w: 960, h: 680, bg: '#1e1b2e', controls: 'none',
  help: '흰 칸에 1~9를 채워요 · 검은 칸의 대각선 숫자 = 오른쪽(위 숫자) / 아래쪽(아래 숫자) 연속 칸의 합\n한 줄(연속 칸) 안에서는 숫자가 겹치면 안 돼요\n칸 클릭 → 숫자 버튼 / 키보드 1~9 · 방향키 이동\nN 메모 · U 되돌리기 · H 힌트 · C 검사',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse, n = S.n;
    if (S.done) { if (g.clickIn(QPX, 560, 270, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt; if (S.flash > 0) S.flash -= dt;
    if (m.clicked) {
      const cx = Math.floor((m.x - QOX) / S.cs), cy = Math.floor((m.y - QOY) / S.cs);
      if (cx >= 0 && cy >= 0 && cx < n && cy < n && S.white[cy * n + cx]) { S.sel = cy * n + cx; g.sfx.click(); }
      for (let i = 0; i < 9; i++) if (g.inRect(QPX + (i % 3) * 92, QPY + Math.floor(i / 3) * 70, 84, 62)) input(g, i + 1);
      const by = QPY + 214;
      if (g.inRect(QPX, by, 132, 48)) { S.memo = !S.memo; g.sfx.click(); }
      if (g.inRect(QPX + 140, by, 132, 48)) input(g, 0);
      if (g.inRect(QPX, by + 56, 132, 48)) undo(g);
      if (g.inRect(QPX + 140, by + 56, 132, 48)) hint(g);
      if (g.inRect(QPX, by + 112, 132, 48)) check(g);
      if (g.inRect(QPX + 140, by + 112, 132, 48)) { newPuzzle(g); g.sfx.click(); }
      QD.forEach((d, i) => { if (g.inRect(QPX + i * 69, 110, 64, 40)) { S.diff = i; g.save('diff', i); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
    }
    for (let i = 1; i <= 9; i++) if (g.keyp('Digit' + i) || g.keyp('Numpad' + i)) input(g, i);
    if (g.keyp('Backspace') || g.keyp('Delete') || g.keyp('Digit0') || g.keyp('Numpad0')) input(g, 0);
    if (g.keyp('KeyN') || g.keyp('KeyM')) { S.memo = !S.memo; g.sfx.click(); }
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyC')) check(g);
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) {
      let x = S.sel % n, y = (S.sel / n) | 0;
      for (let s = 0; s < n; s++) { x = (x + D[k][0] + n) % n; y = (y + D[k][1] + n) % n; if (S.white[y * n + x]) { S.sel = y * n + x; break; } }
    }
    g.info = `${QD[S.diff].n} · ⏱️${U.fmtTime(S.time)} · 💡${S.hints}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, sel = S.sel, a = S.runOf[sel];
    g.rect(QOX - 4, QOY - 4, n * cs + 8, n * cs + 8, '#0b0a14');
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, px = QOX + x * cs, py = QOY + y * cs;
      if (!S.white[i]) {
        g.rect(px, py, cs, cs, '#3b3554');
        const ac = S.clueA[i], dc = S.clueD[i];
        if (ac || dc) {
          g.line(px, py, px + cs, py + cs, '#8b84b0', 1.5);
          if (ac) g.text(String(ac.sum), px + cs * 0.72, py + cs * 0.3, cs * 0.28, S.runBad[ac.id] ? '#f87171' : S.runFull[ac.id] ? '#86efac' : '#fff');
          if (dc) g.text(String(dc.sum), px + cs * 0.3, py + cs * 0.72, cs * 0.28, S.runBad[dc.id] ? '#f87171' : S.runFull[dc.id] ? '#86efac' : '#fff');
        }
        g.stroke(px, py, cs, cs, '#0b0a14', 1); continue;
      }
      let bg = '#f8fafc';
      if (S.runOf[i][0] === a[0] || S.runOf[i][1] === a[1]) bg = '#e0e7ff';
      if (i === sel) bg = '#a5b4fc';
      g.rect(px, py, cs, cs, bg);
      if (S.flash > 0 && S.wrong[i]) g.rect(px, py, cs, cs, `rgba(239,68,68,${Math.min(0.6, S.flash)})`);
      g.stroke(px, py, cs, cs, '#1e1b2e', 1);
      const v = S.cur[i];
      if (v) g.text(String(v), px + cs / 2, py + cs / 2 + cs * 0.06, cs * 0.5, S.fixed[i] ? '#111827' : S.bad[i] ? '#dc2626' : '#4338ca', 'center', S.fixed[i] ? 'bold' : '600');
      else if (S.notes[i]) for (let d = 1; d <= 9; d++) if (S.notes[i] & (1 << d)) g.text(String(d), px + cs * (0.22 + ((d - 1) % 3) * 0.28), py + cs * (0.22 + Math.floor((d - 1) / 3) * 0.28), Math.max(9, cs * 0.2), '#475569', 'center', '600');
    }
    g.text('카쿠로', QPX + 135, 40, 30, '#e0e7ff');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, QPX + 135, 80, 16, '#a5b4fc');
    QD.forEach((d, i) => g.button(QPX + i * 69, 110, 64, 40, d.n, S.diff === i ? '#6d28d9' : '#4b4569', 14));
    const ra = S.runs[a[0]], rd = S.runs[a[1]];
    g.text(`가로 ${ra.sum}/${ra.cells.length}칸 · 세로 ${rd.sum}/${rd.cells.length}칸`, QPX + 135, 165, 15, '#c4b5fd');
    for (let i = 0; i < 9; i++) g.button(QPX + (i % 3) * 92, QPY + Math.floor(i / 3) * 70, 84, 62, String(i + 1), S.memo ? '#0f766e' : '#4338ca', 26);
    const by = QPY + 214;
    g.button(QPX, by, 132, 48, S.memo ? '✏️ 메모 ON' : '✏️ 메모', S.memo ? '#0f766e' : '#4b4569', 16);
    g.button(QPX + 140, by, 132, 48, '⌫ 지우기', '#4b4569', 16);
    g.button(QPX, by + 56, 132, 48, '↶ 되돌리기', '#4b4569', 16);
    g.button(QPX + 140, by + 56, 132, 48, '💡 힌트', '#a16207', 16);
    g.button(QPX, by + 112, 132, 48, '✔ 검사', '#15803d', 16);
    g.button(QPX + 140, by + 112, 132, 48, '🔄 새 퍼즐', '#7c2d12', 16);
    if (S.done) {
      g.rrect(QPX - 10, 440, 290, 186, 14, 'rgba(21,128,61,.95)', '#fff', 3);
      g.text('🎉 완성!', QPX + 135, 478, 32, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, QPX + 135, 522, 18, '#dcfce7');
      g.button(QPX, 560, 270, 56, '다음 퍼즐 ▶', '#166534', 22);
    }
  },
});
function layout(n, p) {
  for (let att = 0; att < 400; att++) {
    const w = new Array(n * n).fill(0);
    for (let y = 1; y < n; y++) for (let x = 1; x < n; x++) w[y * n + x] = 1;
    for (let y = 1; y < n; y++) for (let x = 1; x < n; x++) if (Math.random() < p) { w[y * n + x] = 0; w[(n - y) * n + (n - x)] = 0; }
    let changed = true, guard = 0;
    while (changed && guard++ < 50) {
      changed = false;
      for (let y = 1; y < n; y++) for (let x = 1; x < n; x++) {
        const i = y * n + x; if (!w[i]) continue;
        const h = runLen(w, n, x, y, 1, 0), v = runLen(w, n, x, y, 0, 1);
        if (h === 1 || v === 1) { w[i] = 0; w[(n - y) * n + (n - x)] = 0; changed = true; }
        else if (h > 9 || v > 9) { w[i] = 0; w[(n - y) * n + (n - x)] = 0; changed = true; }
      }
    }
    const cells = []; for (let i = 0; i < n * n; i++) if (w[i]) cells.push(i);
    if (cells.length < (n - 1) * (n - 1) * 0.55) continue;
    const seen = new Set([cells[0]]), st = [cells[0]];
    while (st.length) { const i = st.pop(), x = i % n, y = (i / n) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * n + nx; if (nx >= 0 && ny >= 0 && nx < n && ny < n && w[j] && !seen.has(j)) { seen.add(j); st.push(j); } } }
    if (seen.size === cells.length) return w;
  }
  return null;
}
function runLen(w, n, x, y, dx, dy) {
  let a = x, b = y; while (a - dx >= 0 && b - dy >= 0 && w[(b - dy) * n + a - dx]) { a -= dx; b -= dy; }
  let k = 0; while (a < n && b < n && w[b * n + a]) { k++; a += dx; b += dy; }
  return k;
}
function buildRuns(w, n) {
  const runs = [], runOf = [], clueA = [], clueD = [];
  for (let i = 0; i < n * n; i++) runOf.push([-1, -1]);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x; if (w[i]) continue;
    for (const [dx, dy, k, arr] of [[1, 0, 0, clueA], [0, 1, 1, clueD]]) {
      const cells = []; let a = x + dx, b = y + dy;
      while (a < n && b < n && w[b * n + a]) { cells.push(b * n + a); a += dx; b += dy; }
      if (cells.length) { const r = { id: runs.length, cells, sum: 0 }; runs.push(r); arr[i] = r; for (const c of cells) runOf[c][k] = r.id; }
    }
  }
  return { runs, runOf, clueA, clueD };
}
function fillRuns(w, n, runs, runOf) {
  const cells = []; for (let i = 0; i < n * n; i++) if (w[i]) cells.push(i);
  const used = runs.map(() => 0), b = new Array(n * n).fill(0); let nodes = 0;
  const rec = (k) => {
    if (k === cells.length) return true;
    if (++nodes > 20000) return false;
    const i = cells[k], [ra, rd] = runOf[i];
    for (const d of U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      const bit = 1 << d; if ((used[ra] | used[rd]) & bit) continue;
      b[i] = d; used[ra] |= bit; used[rd] |= bit;
      if (rec(k + 1)) return true;
      used[ra] &= ~bit; used[rd] &= ~bit;
    }
    b[i] = 0; return false;
  };
  return rec(0) ? b : null;
}
function qSolve(n, w, runs, runOf, giv, budget) {
  const N = n * n, b = giv.slice(), rs = runs.map((r) => r.sum), rn = runs.map((r) => r.cells.length), ru = runs.map(() => 0);
  for (let i = 0; i < N; i++) if (w[i] && b[i]) for (const r of runOf[i]) { rs[r] -= b[i]; rn[r]--; ru[r] |= 1 << b[i]; }
  let count = 0, nodes = 0; const sols = [];
  const ok = (r, d) => { const rem = rs[r] - d, left = rn[r] - 1, um = (ru[r] | (1 << d)) >> 1; return left === 0 ? rem === 0 : rem >= QMIN[um][left] && rem <= QMAX[um][left]; };
  const cand = (i) => { const [a, c] = runOf[i]; const m = ~(ru[a] | ru[c]) & 0x3fe; let out = 0; for (let d = 1; d <= 9; d++) if (m & (1 << d) && ok(a, d) && ok(c, d)) out |= 1 << d; return out; };
  const rec = () => {
    if (++nodes > budget) return;
    let best = -1, bm = 0, bc = 99;
    for (let i = 0; i < N; i++) if (w[i] && !b[i]) { const mm = cand(i); let k = 0; for (let t = mm; t; t &= t - 1) k++; if (!k) return; if (k < bc) { bc = k; best = i; bm = mm; if (k === 1) break; } }
    if (best < 0) { count++; sols.push(b.slice()); return; }
    const [a, c] = runOf[best];
    for (let d = 1; d <= 9; d++) if (bm & (1 << d)) {
      const bit = 1 << d; b[best] = d;
      rs[a] -= d; rn[a]--; ru[a] |= bit; rs[c] -= d; rn[c]--; ru[c] |= bit;
      rec();
      rs[a] += d; rn[a]++; ru[a] &= ~bit; rs[c] += d; rn[c]++; ru[c] &= ~bit; b[best] = 0;
      if (count >= 2 || nodes > budget) return;
    }
  };
  rec(); return { count, sols, aborted: nodes > budget };
}
function newPuzzle(g) {
  const D = QD[S.diff], n = D.size, t0 = performance.now();
  let best = null;
  for (let k = 0; k < 12; k++) {
    const c = genOne(D, n); const gc = c.giv.filter((v) => v).length;
    if (!best || gc < best.gc) { best = c; best.gc = gc; }
    if (gc <= (S.diff < 2 ? 1 : 3) || performance.now() - t0 > 450) break;
  }
  const { w, R, sol, giv } = best;
  let sel = 0; while (!w[sel]) sel++;
  Object.assign(S, { n, cs: Math.floor(QGS / n), white: w, sol, runs: R.runs, runOf: R.runOf, clueA: R.clueA, clueD: R.clueD, fixed: giv.map((v) => v > 0), cur: giv.slice(), notes: new Array(n * n).fill(0), sel, memo: false, hist: [], time: 0, hints: 0, checks: 0, flash: 0, wrong: [], done: false });
  evalBad();
}
function genOne(D, n) {
  let w, R, sol;
  for (let t = 0; t < 30; t++) {
    w = layout(n, D.p); if (!w) continue;
    R = buildRuns(w, n); sol = fillRuns(w, n, R.runs, R.runOf); if (sol) break;
  }
  for (const r of R.runs) r.sum = r.cells.reduce((a, c) => a + sol[c], 0);
  const giv = new Array(n * n).fill(0);
  for (let it = 0; it < 80; it++) {
    const r = qSolve(n, w, R.runs, R.runOf, giv, 15000);
    if (r.count === 1 && !r.aborted) break;
    let i;
    if (r.count >= 2) { const d = []; for (let j = 0; j < n * n; j++) if (w[j] && r.sols[0][j] !== r.sols[1][j]) d.push(j); i = U.choice(d); }
    else { const em = []; for (let j = 0; j < n * n; j++) if (w[j] && !giv[j]) em.push(j); i = U.choice(em); }
    giv[i] = sol[i];
  }
  return { w, R, sol, giv };
}
function snap() { S.hist.push({ cur: S.cur.slice(), notes: S.notes.slice() }); if (S.hist.length > 300) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h.cur; S.notes = h.notes; evalBad(); g.sfx.move(); }
function input(g, d) {
  const i = S.sel; if (S.fixed[i]) { g.sfx.hit(); return; }
  if (d === 0) { if (!S.cur[i] && !S.notes[i]) return; snap(); S.cur[i] = 0; S.notes[i] = 0; g.sfx.drop(); evalBad(); return; }
  snap();
  if (S.memo) { if (!S.cur[i]) { S.notes[i] ^= 1 << d; g.sfx.tone(700, 0.04, 'sine', 0.05); } return; }
  if (S.cur[i] === d) { S.cur[i] = 0; evalBad(); return; }
  S.cur[i] = d; S.notes[i] = 0;
  for (const r of S.runOf[i]) for (const c of S.runs[r].cells) S.notes[c] &= ~(1 << d);
  g.sfx.tone(440 + d * 40, 0.06, 'triangle', 0.06);
  evalBad();
  if (S.bad[i]) g.shake(3, 0.15);
  for (const r of S.runOf[i]) if (S.runFull[r] && !S.runBad[r]) { const c = S.runs[r].cells; for (const j of c) g.burst(QOX + (j % S.n) * S.cs + S.cs / 2, QOY + ((j / S.n) | 0) * S.cs + S.cs / 2, ['#a5b4fc', '#86efac'], 4, 100, 0.4); }
  checkDone(g);
}
function evalBad() {
  const N = S.n * S.n; S.bad = new Array(N).fill(false);
  S.runBad = S.runs.map(() => false); S.runFull = S.runs.map(() => false);
  for (const r of S.runs) {
    let s = 0, full = true, m = 0;
    for (const c of r.cells) { const v = S.cur[c]; if (!v) { full = false; continue; } s += v; if (m & (1 << v)) { r.cells.forEach((c2) => { if (S.cur[c2] === v) S.bad[c2] = true; }); S.runBad[r.id] = true; } m |= 1 << v; }
    if (s > r.sum || (full && s !== r.sum)) { S.runBad[r.id] = true; if (full) r.cells.forEach((c2) => (S.bad[c2] = true)); }
    S.runFull[r.id] = full;
  }
}
function checkDone(g) {
  for (let i = 0; i < S.n * S.n; i++) if (S.white[i] && !S.cur[i]) return;
  if (S.runBad.some((b) => b)) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(QD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 120 - S.checks * 40));
  g.add(S.gain, QOX + 300, QOY + 300); g.sfx.win(); g.shake(6, 0.3);
  for (let k = 0; k < 8; k++) g.later(() => g.burst(U.rand(60, 600), U.rand(60, 600), ['#a78bfa', '#22c55e', '#facc15', '#f472b6'], 26, 260, 1), k * 0.12);
}
function hint(g) {
  const N = S.n * S.n; let i = -1;
  for (let j = 0; j < N; j++) if (S.white[j] && S.cur[j] && S.cur[j] !== S.sol[j]) { i = j; break; }
  if (i < 0) { if (!S.cur[S.sel]) i = S.sel; else { const em = []; for (let j = 0; j < N; j++) if (S.white[j] && !S.cur[j]) em.push(j); if (!em.length) return; i = U.choice(em); } }
  snap(); S.cur[i] = S.sol[i]; S.notes[i] = 0; S.hints++; S.sel = i; g.sfx.power(); evalBad();
  g.burst(QOX + (i % S.n) * S.cs + S.cs / 2, QOY + ((i / S.n) | 0) * S.cs + S.cs / 2, '#facc15', 16, 160, 0.6);
  checkDone(g);
}
function check(g) {
  S.wrong = S.cur.map((v, i) => S.white[i] && v && v !== S.sol[i]); S.checks++; S.flash = 2;
  const k = S.wrong.filter((x) => x).length;
  if (k) { g.sfx.hit(); g.shake(4); g.float(QOX + 300, QOY + 300, `틀린 칸 ${k}개`, '#f87171', 28); } else { g.sfx.coin(); g.float(QOX + 300, QOY + 300, '지금까지 모두 정답!', '#4ade80', 28); }
}
