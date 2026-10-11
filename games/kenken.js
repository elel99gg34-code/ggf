let S;
const KGS = 576, KOX = 28, KOY = 44, KPX = 650, KPY = 200;
const KKD = [
  { n: '4×4', size: 4, cmax: 3, base: 400 },
  { n: '5×5', size: 5, cmax: 3, base: 800 },
  { n: '6×6', size: 6, cmax: 4, base: 1500 },
  { n: '7×7', size: 7, cmax: 4, base: 2600 },
];
const KKCOL = ['#fef3c7', '#dbeafe', '#dcfce7', '#fee2e2', '#ede9fe', '#ffedd5', '#cffafe'];
GAME({
  title: '켄켄', w: 960, h: 680, bg: '#ecfeff', controls: 'none',
  help: 'N×N 칸에 1~N을 행·열마다 한 번씩 (라틴 방진)\n굵은 선 케이지의 숫자들을 표시된 연산(+ − × ÷)으로 계산하면 목표값!\n−, ÷는 큰 수에서 작은 수로 계산 · 칸 클릭 → 숫자 입력\n방향키 이동 · N 메모 · U 되돌리기 · H 힌트 · C 검사',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse, n = S.n;
    if (S.done) { if (g.clickIn(KPX, 560, 280, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt; if (S.flash > 0) S.flash -= dt;
    if (m.clicked) {
      const cx = Math.floor((m.x - KOX) / S.cs), cy = Math.floor((m.y - KOY) / S.cs);
      if (cx >= 0 && cy >= 0 && cx < n && cy < n) { S.sel = cy * n + cx; g.sfx.click(); }
      for (let i = 0; i < n; i++) if (g.inRect(KPX + (i % 3) * 94, KPY + Math.floor(i / 3) * 74, 86, 66)) input(g, i + 1);
      const by = KPY + 3 * 74 + 4;
      if (g.inRect(KPX, by, 136, 50)) { S.memo = !S.memo; g.sfx.click(); }
      if (g.inRect(KPX + 144, by, 136, 50)) input(g, 0);
      if (g.inRect(KPX, by + 58, 136, 50)) undo(g);
      if (g.inRect(KPX + 144, by + 58, 136, 50)) hint(g);
      if (g.inRect(KPX, by + 116, 136, 50)) check(g);
      if (g.inRect(KPX + 144, by + 116, 136, 50)) { newPuzzle(g); g.sfx.click(); }
      KKD.forEach((d, i) => { if (g.inRect(KPX + i * 71, 110, 66, 40)) { S.diff = i; g.save('diff', i); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
    }
    for (let i = 1; i <= n; i++) if (g.keyp('Digit' + i) || g.keyp('Numpad' + i)) input(g, i);
    if (g.keyp('Backspace') || g.keyp('Delete') || g.keyp('Digit0') || g.keyp('Numpad0')) input(g, 0);
    if (g.keyp('KeyN') || g.keyp('KeyM')) { S.memo = !S.memo; g.sfx.click(); }
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyC')) check(g);
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) { const x = S.sel % n, y = (S.sel / n) | 0; S.sel = ((y + D[k][1] + n) % n) * n + (x + D[k][0] + n) % n; }
    g.info = `${KKD[S.diff].n} · ⏱️${U.fmtTime(S.time)} · 💡${S.hints}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, sel = S.sel, sv = S.cur[sel];
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, px = KOX + x * cs, py = KOY + y * cs;
      g.rect(px, py, cs, cs, KKCOL[S.col[S.cageOf[i]]]);
      if (i === sel) g.rect(px, py, cs, cs, 'rgba(8,145,178,.45)');
      else if (x === sel % n || y === ((sel / n) | 0)) g.rect(px, py, cs, cs, 'rgba(8,145,178,.12)');
      if (sv && S.cur[i] === sv && i !== sel) g.rect(px, py, cs, cs, 'rgba(8,145,178,.25)');
      if (S.flash > 0 && S.wrong[i]) g.rect(px, py, cs, cs, `rgba(239,68,68,${Math.min(0.6, S.flash)})`);
      if (S.badCage[S.cageOf[i]]) g.rect(px, py, cs, cs, 'rgba(239,68,68,.12)');
      g.stroke(px, py, cs, cs, 'rgba(15,23,42,.25)', 1);
    }
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, px = KOX + x * cs, py = KOY + y * cs, k = S.cageOf[i];
      if (x === n - 1 || S.cageOf[i + 1] !== k) g.line(px + cs, py, px + cs, py + cs, '#0f172a', 3.5);
      if (y === n - 1 || S.cageOf[i + n] !== k) g.line(px, py + cs, px + cs, py + cs, '#0f172a', 3.5);
      if (x === 0) g.line(px, py, px, py + cs, '#0f172a', 3.5);
      if (y === 0) g.line(px, py, px + cs, py, '#0f172a', 3.5);
    }
    const fs = Math.round(cs * 0.2);
    for (const cg of S.cages) {
      const i = cg.cells[0];
      g.text(cg.t + (cg.cells.length > 1 ? cg.op : ''), KOX + (i % n) * cs + 7, KOY + ((i / n) | 0) * cs + fs * 0.75 + 4, fs, S.badCage[cg.id] ? '#dc2626' : '#0f172a', 'left');
    }
    for (let i = 0; i < n * n; i++) {
      const px = KOX + (i % n) * cs, py = KOY + ((i / n) | 0) * cs, v = S.cur[i];
      if (v) g.text(String(v), px + cs / 2, py + cs / 2 + cs * 0.08, cs * 0.45, S.fixed[i] ? '#0f172a' : S.bad[i] ? '#dc2626' : '#0e7490', 'center', S.fixed[i] ? 'bold' : '600');
      else if (S.notes[i]) for (let d = 1; d <= n; d++) if (S.notes[i] & (1 << d)) g.text(String(d), px + cs * 0.3 + ((d - 1) % 3) * cs * 0.2, py + cs * 0.45 + Math.floor((d - 1) / 3) * cs * 0.18, Math.max(11, cs * 0.14), '#475569', 'center', '600');
    }
    g.text('켄켄', KPX + 140, 40, 30, '#0f172a');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, KPX + 140, 80, 16, '#475569');
    KKD.forEach((d, i) => g.button(KPX + i * 71, 110, 66, 40, d.n, S.diff === i ? '#0e7490' : '#64748b', 15));
    const cg = S.cages[S.cageOf[sel]];
    g.text(`선택 케이지: ${cg.t}${cg.cells.length > 1 ? cg.op : ''} (${cg.cells.length}칸)`, KPX + 140, 172, 15, '#475569');
    for (let i = 0; i < n; i++) g.button(KPX + (i % 3) * 94, KPY + Math.floor(i / 3) * 74, 86, 66, String(i + 1), S.memo ? '#0f766e' : '#155e75', 28);
    const by = KPY + 3 * 74 + 4;
    g.button(KPX, by, 136, 50, S.memo ? '✏️ 메모 ON' : '✏️ 메모', S.memo ? '#0f766e' : '#475569', 17);
    g.button(KPX + 144, by, 136, 50, '⌫ 지우기', '#475569', 17);
    g.button(KPX, by + 58, 136, 50, '↶ 되돌리기', '#475569', 17);
    g.button(KPX + 144, by + 58, 136, 50, '💡 힌트', '#ca8a04', 17);
    g.button(KPX, by + 116, 136, 50, '✔ 검사', '#15803d', 17);
    g.button(KPX + 144, by + 116, 136, 50, '🔄 새 퍼즐', '#7c2d12', 17);
    if (S.done) {
      g.rrect(KPX - 10, 440, 300, 186, 14, 'rgba(21,128,61,.95)', '#fff', 3);
      g.text('🎉 완성!', KPX + 140, 478, 32, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, KPX + 140, 522, 18, '#dcfce7');
      g.button(KPX, 560, 280, 56, '다음 퍼즐 ▶', '#166534', 22);
    }
  },
});
function kkNb(i, n) { const x = i % n, y = (i / n) | 0, r = []; if (x > 0) r.push(i - 1); if (x < n - 1) r.push(i + 1); if (y > 0) r.push(i - n); if (y < n - 1) r.push(i + n); return r; }
function latin(n) {
  const b = new Array(n * n).fill(0), R = new Array(n).fill(0), C = new Array(n).fill(0);
  const rec = (i) => {
    if (i === n * n) return true;
    const r = (i / n) | 0, c = i % n;
    for (const d of U.shuffle([...Array(n)].map((_, k) => k + 1))) {
      const bit = 1 << d; if ((R[r] | C[c]) & bit) continue;
      b[i] = d; R[r] |= bit; C[c] |= bit;
      if (rec(i + 1)) return true;
      R[r] &= ~bit; C[c] &= ~bit;
    }
    b[i] = 0; return false;
  };
  rec(0); return b;
}
function cageOk(cg, vals, n) {
  // vals: 채워진 값 배열 (0 = 빈칸). 부분 가능성 판정
  const f = vals.filter((v) => v), full = f.length === vals.length, t = cg.t;
  if (cg.cells.length === 1) return !full || f[0] === t;
  if (cg.op === '+') { const s = f.reduce((a, b) => a + b, 0), left = vals.length - f.length; return full ? s === t : s + left <= t && s + left * n >= t; }
  if (cg.op === '×') { const p = f.reduce((a, b) => a * b, 1); return full ? p === t : t % p === 0; }
  if (!full) return true;
  const [a, b] = f, hi = Math.max(a, b), lo = Math.min(a, b);
  return cg.op === '−' ? hi - lo === t : hi === lo * t;
}
function kkSolve(n, cages, cageOf, giv, budget) {
  const N = n * n, b = giv.slice(), R = new Array(n).fill(0), C = new Array(n).fill(0);
  for (let i = 0; i < N; i++) if (b[i]) { R[(i / n) | 0] |= 1 << b[i]; C[i % n] |= 1 << b[i]; }
  let count = 0, nodes = 0; const sols = [];
  const full = ((1 << (n + 1)) - 2);
  const cand = (i) => {
    let m = ~(R[(i / n) | 0] | C[i % n]) & full, out = 0; const cg = cages[cageOf[i]];
    for (let d = 1; d <= n; d++) if (m & (1 << d)) { b[i] = d; if (cageOk(cg, cg.cells.map((c) => b[c]), n)) out |= 1 << d; b[i] = 0; }
    return out;
  };
  const rec = () => {
    if (++nodes > budget) return;
    let best = -1, bm = 0, bc = 99;
    for (let i = 0; i < N; i++) if (!b[i]) { const mm = cand(i); let k = 0; for (let t = mm; t; t &= t - 1) k++; if (!k) return; if (k < bc) { bc = k; best = i; bm = mm; if (k === 1) break; } }
    if (best < 0) { count++; sols.push(b.slice()); return; }
    const r = (best / n) | 0, c = best % n;
    for (let d = 1; d <= n; d++) if (bm & (1 << d)) {
      b[best] = d; R[r] |= 1 << d; C[c] |= 1 << d;
      rec();
      b[best] = 0; R[r] &= ~(1 << d); C[c] &= ~(1 << d);
      if (count >= 2 || nodes > budget) return;
    }
  };
  rec(); return { count, sols, aborted: nodes > budget };
}
function newPuzzle(g) {
  const D = KKD[S.diff], n = D.size, N = n * n;
  const sol = latin(n), cage = new Array(N).fill(-1), cages = [];
  for (const s of U.shuffle([...Array(N).keys()])) {
    if (cage[s] >= 0) continue;
    const id = cages.length, cells = [s]; cage[s] = id;
    const target = Math.random() < 0.12 ? 1 : U.randi(2, D.cmax);
    while (cells.length < target) {
      const cand = []; for (const c of cells) for (const nb of kkNb(c, n)) if (cage[nb] < 0 && !cand.includes(nb)) cand.push(nb);
      if (!cand.length) break; const nb = U.choice(cand); cage[nb] = id; cells.push(nb);
    }
    cells.sort((a, b) => a - b);
    const v = cells.map((c) => sol[c]); let op = '+', t;
    if (cells.length === 1) { op = ''; t = v[0]; }
    else if (cells.length === 2) {
      const hi = Math.max(...v), lo = Math.min(...v), r = Math.random();
      if (hi % lo === 0 && r < 0.55) { op = '÷'; t = hi / lo; } else if (r < 0.7) { op = '−'; t = hi - lo; } else if (r < 0.85) { op = '×'; t = hi * lo; } else t = hi + lo;
    } else { const p = v.reduce((a, b) => a * b, 1); if (Math.random() < 0.45 && p <= 400) { op = '×'; t = p; } else t = v.reduce((a, b) => a + b, 0); }
    cages.push({ id, cells, op, t });
  }
  const giv = new Array(N).fill(0);
  for (let it = 0; it < 40; it++) {
    const r = kkSolve(n, cages, cage, giv, 20000);
    if (r.count === 1 && !r.aborted) break;
    let i;
    if (r.count >= 2) { const d = []; for (let j = 0; j < N; j++) if (r.sols[0][j] !== r.sols[1][j]) d.push(j); i = U.choice(d); }
    else { const em = []; for (let j = 0; j < N; j++) if (!giv[j]) em.push(j); i = U.choice(em); }
    giv[i] = sol[i];
  }
  const col = cages.map(() => -1);
  for (const cg of cages) { const used = new Set(); for (const c of cg.cells) for (const nb of kkNb(c, n)) if (cage[nb] !== cg.id && col[cage[nb]] >= 0) used.add(col[cage[nb]]); let k = 0; while (used.has(k)) k++; col[cg.id] = k % KKCOL.length; }
  Object.assign(S, { n, cs: Math.floor(KGS / n), sol, cages, cageOf: cage, col, fixed: giv.map((v) => v > 0), cur: giv.slice(), notes: new Array(N).fill(0), sel: 0, memo: false, hist: [], time: 0, hints: 0, checks: 0, flash: 0, wrong: [], done: false });
  evalBad();
}
function snap() { S.hist.push({ cur: S.cur.slice(), notes: S.notes.slice() }); if (S.hist.length > 300) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h.cur; S.notes = h.notes; evalBad(); g.sfx.move(); }
function input(g, d) {
  const i = S.sel, n = S.n; if (S.fixed[i]) { g.sfx.hit(); return; }
  if (d === 0) { if (!S.cur[i] && !S.notes[i]) return; snap(); S.cur[i] = 0; S.notes[i] = 0; g.sfx.drop(); evalBad(); return; }
  snap();
  if (S.memo) { if (!S.cur[i]) { S.notes[i] ^= 1 << d; g.sfx.tone(700, 0.04, 'sine', 0.05); } return; }
  if (S.cur[i] === d) { S.cur[i] = 0; evalBad(); return; }
  S.cur[i] = d; S.notes[i] = 0;
  for (let j = 0; j < n * n; j++) if (((j / n) | 0) === ((i / n) | 0) || j % n === i % n) S.notes[j] &= ~(1 << d);
  g.sfx.tone(440 + d * 50, 0.06, 'triangle', 0.06);
  evalBad();
  if (S.bad[i] || S.badCage[S.cageOf[i]]) g.shake(3, 0.15);
  const cg = S.cages[S.cageOf[i]];
  if (cg.cells.every((c) => S.cur[c]) && !S.badCage[cg.id]) g.burst(KOX + (i % n) * S.cs + S.cs / 2, KOY + ((i / n) | 0) * S.cs + S.cs / 2, ['#22c55e', '#06b6d4'], 12, 150, 0.5);
  checkDone(g);
}
function evalBad() {
  const n = S.n, N = n * n; S.bad = new Array(N).fill(false);
  for (let i = 0; i < N; i++) if (S.cur[i]) for (let j = i + 1; j < N; j++) if (S.cur[j] === S.cur[i] && (((j / n) | 0) === ((i / n) | 0) || j % n === i % n)) S.bad[i] = S.bad[j] = true;
  S.badCage = S.cages.map((cg) => !cageOk(cg, cg.cells.map((c) => S.cur[c]), n));
}
function checkDone(g) {
  if (S.cur.some((v) => !v) || S.bad.some((b) => b) || S.badCage.some((b) => b)) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(KKD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 100 - S.checks * 40));
  g.add(S.gain, KOX + KGS / 2, KOY + KGS / 2); g.sfx.win(); g.shake(6, 0.3);
  for (let k = 0; k < 8; k++) g.later(() => g.burst(U.rand(60, 580), U.rand(60, 580), ['#06b6d4', '#22c55e', '#facc15', '#ec4899'], 26, 260, 1), k * 0.12);
}
function hint(g) {
  const N = S.n * S.n; let i = -1;
  for (let j = 0; j < N; j++) if (S.cur[j] && S.cur[j] !== S.sol[j]) { i = j; break; }
  if (i < 0) { if (!S.cur[S.sel]) i = S.sel; else { const em = []; for (let j = 0; j < N; j++) if (!S.cur[j]) em.push(j); if (!em.length) return; i = U.choice(em); } }
  snap(); S.cur[i] = S.sol[i]; S.notes[i] = 0; S.hints++; S.sel = i; g.sfx.power(); evalBad();
  g.burst(KOX + (i % S.n) * S.cs + S.cs / 2, KOY + ((i / S.n) | 0) * S.cs + S.cs / 2, '#facc15', 16, 160, 0.6);
  checkDone(g);
}
function check(g) {
  S.wrong = S.cur.map((v, i) => v && v !== S.sol[i]); S.checks++; S.flash = 2;
  const k = S.wrong.filter((x) => x).length;
  if (k) { g.sfx.hit(); g.shake(4); g.float(KOX + 288, KOY + 280, `틀린 칸 ${k}개`, '#f87171', 28); } else { g.sfx.coin(); g.float(KOX + 288, KOY + 280, '지금까지 모두 정답!', '#4ade80', 28); }
}
