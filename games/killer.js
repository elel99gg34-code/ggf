let S;
const KCS = 64, KOX = 28, KOY = 44;
const KDIFF = [
  { n: '쉬움', giv: 24, cmax: 3, base: 800 },
  { n: '보통', giv: 10, cmax: 4, base: 1500 },
  { n: '어려움', giv: 3, cmax: 5, base: 2500 },
  { n: '전문가', giv: 0, cmax: 6, base: 4000 },
];
const KTINT = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#ddd6fe', '#fed7aa', '#a5f3fc'];
// 사용 마스크별 k개 숫자의 최소/최대 합 (캐이지 합 가능성 판정)
const KMIN = [], KMAX = [];
for (let m = 0; m < 512; m++) {
  const av = []; for (let d = 1; d <= 9; d++) if (!(m & (1 << (d - 1)))) av.push(d);
  const mn = [0], mx = [0];
  for (let k = 1; k <= 9; k++) { mn.push(k <= av.length ? mn[k - 1] + av[k - 1] : 999); mx.push(k <= av.length ? mx[k - 1] + av[av.length - k] : -1); }
  KMIN.push(mn); KMAX.push(mx);
}
const KPX = 650, KPY = 200;
GAME({
  title: '킬러 스도쿠', w: 960, h: 680, bg: '#f5efe3', controls: 'none',
  help: '각 행·열·3×3 상자에 1~9가 한 번씩 · 점선 케이지 안 숫자의 합 = 왼쪽 위 작은 숫자\n케이지 안에서는 숫자가 겹치면 안 돼요\n칸 클릭 → 숫자 버튼 / 키보드 1~9 · 방향키 이동 · 0/Del 지우기\nN 메모 모드 · U 되돌리기 · H 힌트 · C 검사',
  init(g) {
    S = { diff: g.load('diff', 1), solvedCnt: 0, streak: 0 };
    newPuzzle(g);
  },
  update(g, dt) {
    const m = g.mouse;
    if (S.done) {
      S.doneT += dt;
      if (g.clickIn(KPX, 560, 280, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); }
      return;
    }
    S.time += dt;
    if (S.flash > 0) S.flash -= dt;
    if (m.clicked) {
      const cx = Math.floor((m.x - KOX) / KCS), cy = Math.floor((m.y - KOY) / KCS);
      if (cx >= 0 && cy >= 0 && cx < 9 && cy < 9) { S.sel = cy * 9 + cx; g.sfx.click(); }
      for (let i = 0; i < 9; i++) if (g.inRect(KPX + (i % 3) * 94, KPY + Math.floor(i / 3) * 74, 86, 66)) input(g, i + 1);
      if (g.inRect(KPX, KPY + 226, 136, 50)) { S.memo = !S.memo; g.sfx.click(); }
      if (g.inRect(KPX + 144, KPY + 226, 136, 50)) input(g, 0);
      if (g.inRect(KPX, KPY + 284, 136, 50)) undo(g);
      if (g.inRect(KPX + 144, KPY + 284, 136, 50)) hint(g);
      if (g.inRect(KPX, KPY + 342, 136, 50)) check(g);
      if (g.inRect(KPX + 144, KPY + 342, 136, 50)) { newPuzzle(g); g.sfx.click(); }
      KDIFF.forEach((d, i) => { if (g.inRect(KPX + i * 71, 110, 66, 40)) { S.diff = i; g.save('diff', i); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
    }
    for (let i = 1; i <= 9; i++) if (g.keyp('Digit' + i) || g.keyp('Numpad' + i)) input(g, i);
    if (g.keyp('Backspace') || g.keyp('Delete') || g.keyp('Digit0') || g.keyp('Numpad0')) input(g, 0);
    if (g.keyp('KeyN') || g.keyp('KeyM')) { S.memo = !S.memo; g.sfx.click(); }
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyC')) check(g);
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) { const x = S.sel % 9, y = (S.sel / 9) | 0; S.sel = ((y + D[k][1] + 9) % 9) * 9 + (x + D[k][0] + 9) % 9; }
    g.info = `${KDIFF[S.diff].n} · ⏱️${U.fmtTime(S.time)} · 💡${S.hints}`;
  },
  draw(g, c) {
    const sel = S.sel, sv = S.cur[sel], sr = (sel / 9) | 0, sc = sel % 9;
    for (let i = 0; i < 81; i++) {
      const x = i % 9, y = (i / 9) | 0, px = KOX + x * KCS, py = KOY + y * KCS;
      let bg = KTINT[S.col[S.cageOf[i]]];
      g.rect(px, py, KCS, KCS, bg);
      if (i === sel) g.rect(px, py, KCS, KCS, 'rgba(37,99,235,.45)');
      else if (y === sr || x === sc || box(i) === box(sel)) g.rect(px, py, KCS, KCS, 'rgba(37,99,235,.10)');
      if (sv && S.cur[i] === sv && i !== sel) g.rect(px, py, KCS, KCS, 'rgba(37,99,235,.25)');
      if (S.flash > 0 && S.wrong[i]) g.rect(px, py, KCS, KCS, `rgba(239,68,68,${Math.min(0.6, S.flash)})`);
      if (S.hintCell === i && S.hintT > g.time) g.rect(px, py, KCS, KCS, 'rgba(250,204,21,.6)');
    }
    // 케이지 점선
    c.setLineDash([5, 4]);
    for (let i = 0; i < 81; i++) {
      const x = i % 9, y = (i / 9) | 0, px = KOX + x * KCS, py = KOY + y * KCS, k = S.cageOf[i], I = 5;
      const same = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < 9 && ny < 9 && S.cageOf[ny * 9 + nx] === k; };
      const col = '#57534e';
      if (!same(0, -1)) g.line(px + (same(-1, 0) ? 0 : I), py + I, px + KCS - (same(1, 0) ? 0 : I), py + I, col, 1.6);
      if (!same(0, 1)) g.line(px + (same(-1, 0) ? 0 : I), py + KCS - I, px + KCS - (same(1, 0) ? 0 : I), py + KCS - I, col, 1.6);
      if (!same(-1, 0)) g.line(px + I, py + (same(0, -1) ? 0 : I), px + I, py + KCS - (same(0, 1) ? 0 : I), col, 1.6);
      if (!same(1, 0)) g.line(px + KCS - I, py + (same(0, -1) ? 0 : I), px + KCS - I, py + KCS - (same(0, 1) ? 0 : I), col, 1.6);
    }
    c.setLineDash([]);
    for (const cg of S.cages) {
      const i = cg.cells[0], px = KOX + (i % 9) * KCS, py = KOY + ((i / 9) | 0) * KCS;
      const bad = S.badCage[cg.id];
      g.rect(px + 3, py + 3, cg.sum >= 10 ? 21 : 13, 14, KTINT[S.col[cg.id]]);
      g.text(String(cg.sum), px + 5, py + 10, 12, bad ? '#dc2626' : '#1c1917', 'left');
    }
    for (let i = 0; i <= 9; i++) {
      const w = i % 3 === 0 ? 3 : 1;
      g.line(KOX + i * KCS, KOY, KOX + i * KCS, KOY + 9 * KCS, i % 3 === 0 ? '#1c1917' : 'rgba(28,25,23,.3)', w);
      g.line(KOX, KOY + i * KCS, KOX + 9 * KCS, KOY + i * KCS, i % 3 === 0 ? '#1c1917' : 'rgba(28,25,23,.3)', w);
    }
    for (let i = 0; i < 81; i++) {
      const px = KOX + (i % 9) * KCS, py = KOY + ((i / 9) | 0) * KCS, v = S.cur[i];
      if (v) g.text(String(v), px + KCS / 2 + 2, py + KCS / 2 + 4, 32, S.giv[i] ? '#1c1917' : S.bad[i] ? '#dc2626' : '#1d4ed8', 'center', S.giv[i] ? 'bold' : '600');
      else if (S.notes[i]) for (let d = 1; d <= 9; d++) if (S.notes[i] & (1 << d)) g.text(String(d), px + 16 + ((d - 1) % 3) * 16, py + 22 + Math.floor((d - 1) / 3) * 15, 12, '#57534e', 'center', '600');
    }
    // 패널
    g.text('킬러 스도쿠', KPX + 140, 40, 30, '#1c1917');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, KPX + 140, 80, 16, '#57534e');
    KDIFF.forEach((d, i) => g.button(KPX + i * 71, 110, 66, 40, d.n, S.diff === i ? '#b45309' : '#78716c', 15));
    const cg = S.cages[S.cageOf[sel]];
    g.text(`선택 케이지: 합 ${cg.sum} / ${cg.cells.length}칸 · 조합 ${combos(cg.sum, cg.cells.length)}가지`, KPX + 140, 172, 14, '#57534e');
    for (let i = 0; i < 9; i++) {
      const cnt = S.cur.filter((v) => v === i + 1).length;
      g.button(KPX + (i % 3) * 94, KPY + Math.floor(i / 3) * 74, 86, 66, String(i + 1), cnt >= 9 ? '#a8a29e' : S.memo ? '#0f766e' : '#1e3a8a', 28);
      g.text(String(9 - cnt), KPX + (i % 3) * 94 + 76, KPY + Math.floor(i / 3) * 74 + 12, 11, '#e7e5e4');
    }
    g.button(KPX, KPY + 226, 136, 50, S.memo ? '✏️ 메모 ON' : '✏️ 메모', S.memo ? '#0f766e' : '#57534e', 17);
    g.button(KPX + 144, KPY + 226, 136, 50, '⌫ 지우기', '#57534e', 17);
    g.button(KPX, KPY + 284, 136, 50, '↶ 되돌리기', '#57534e', 17);
    g.button(KPX + 144, KPY + 284, 136, 50, '💡 힌트', '#ca8a04', 17);
    g.button(KPX, KPY + 342, 136, 50, '✔ 검사', '#15803d', 17);
    g.button(KPX + 144, KPY + 342, 136, 50, '🔄 새 퍼즐', '#7c2d12', 17);
    g.text(`채운 칸 ${S.cur.filter((v) => v).length} / 81`, KPX + 140, 610, 16, '#57534e');
    if (S.done) {
      g.rrect(KPX - 10, 440, 300, 186, 14, 'rgba(21,128,61,.95)', '#fff', 3);
      g.text('🎉 완성!', KPX + 140, 478, 32, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, KPX + 140, 522, 18, '#dcfce7');
      g.button(KPX, 560, 280, 56, '다음 퍼즐 ▶', '#166534', 22);
    }
  },
});
function box(i) { return ((((i / 9) | 0) / 3) | 0) * 3 + (((i % 9) / 3) | 0); }
function nbrs(i) { const x = i % 9, y = (i / 9) | 0, r = []; if (x > 0) r.push(i - 1); if (x < 8) r.push(i + 1); if (y > 0) r.push(i - 9); if (y < 8) r.push(i + 9); return r; }
function combos(sum, k) {
  let n = 0;
  for (let m = 0; m < 512; m++) { let c = 0, s = 0; for (let d = 0; d < 9; d++) if (m & (1 << d)) { c++; s += d + 1; } if (c === k && s === sum) n++; }
  return n;
}
function kFill() {
  const b = new Array(81).fill(0), R = new Array(9).fill(0), C = new Array(9).fill(0), B = new Array(9).fill(0);
  const rec = (i) => {
    if (i === 81) return true;
    const r = (i / 9) | 0, c = i % 9, bx = box(i);
    for (const d of U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      const bit = 1 << d;
      if ((R[r] | C[c] | B[bx]) & bit) continue;
      b[i] = d; R[r] |= bit; C[c] |= bit; B[bx] |= bit;
      if (rec(i + 1)) return true;
      R[r] &= ~bit; C[c] &= ~bit; B[bx] &= ~bit;
    }
    b[i] = 0; return false;
  };
  rec(0); return b;
}
function kCages(sol, cmax) {
  const cage = new Array(81).fill(-1); let cages = [];
  for (const s of U.shuffle([...Array(81).keys()])) {
    if (cage[s] >= 0) continue;
    const id = cages.length, cells = [s]; cage[s] = id; let mask = 1 << sol[s];
    const target = Math.random() < 0.15 ? 2 : U.randi(2, cmax);
    while (cells.length < target) {
      const cand = [];
      for (const c of cells) for (const nb of nbrs(c)) if (cage[nb] < 0 && !(mask & (1 << sol[nb])) && !cand.includes(nb)) cand.push(nb);
      if (!cand.length) break;
      const nb = U.choice(cand); cage[nb] = id; cells.push(nb); mask |= 1 << sol[nb];
    }
    cages.push({ cells });
  }
  for (const cg of cages) if (cg.cells.length === 1) {
    const c = cg.cells[0];
    const opts = nbrs(c).map((nb) => cages[cage[nb]]).filter((o) => o !== cg && o.cells.length > 0 && o.cells.length <= cmax && !o.cells.some((x) => sol[x] === sol[c]));
    if (opts.length) { const o = U.choice(opts); o.cells.push(c); cage[c] = cages.indexOf(o); cg.cells = []; }
  }
  cages = cages.filter((cg) => cg.cells.length);
  cages.forEach((cg, i) => { cg.id = i; cg.cells.sort((a, b) => a - b); cg.sum = cg.cells.reduce((a, c) => a + sol[c], 0); for (const c of cg.cells) cage[c] = i; });
  return { cages, cage };
}
function kSolve(cages, cageOf, giv, budget) {
  const b = giv.slice(), R = new Array(9).fill(0), C = new Array(9).fill(0), B = new Array(9).fill(0);
  const cs = cages.map((cg) => cg.sum), cn = cages.map((cg) => cg.cells.length), cu = cages.map(() => 0);
  for (let i = 0; i < 81; i++) if (b[i]) { const bit = 1 << b[i], k = cageOf[i]; R[(i / 9) | 0] |= bit; C[i % 9] |= bit; B[box(i)] |= bit; cs[k] -= b[i]; cn[k]--; cu[k] |= bit; }
  let count = 0, nodes = 0; const sols = [];
  const cand = (i) => {
    const k = cageOf[i]; let m = ~(R[(i / 9) | 0] | C[i % 9] | B[box(i)] | cu[k]) & 0x3fe, out = 0;
    const left = cn[k] - 1;
    for (let d = 1; d <= 9; d++) if (m & (1 << d)) {
      const rem = cs[k] - d, um = (cu[k] | (1 << d)) >> 1;
      if (left === 0 ? rem === 0 : rem >= KMIN[um][left] && rem <= KMAX[um][left]) out |= 1 << d;
    }
    return out;
  };
  const rec = () => {
    if (++nodes > budget) return;
    let best = -1, bm = 0, bc = 10;
    for (let i = 0; i < 81; i++) if (!b[i]) {
      const mm = cand(i); let cnt = 0; for (let t = mm; t; t &= t - 1) cnt++;
      if (!cnt) return;
      if (cnt < bc) { bc = cnt; best = i; bm = mm; if (cnt === 1) break; }
    }
    if (best < 0) { count++; sols.push(b.slice()); return; }
    const k = cageOf[best], r = (best / 9) | 0, c = best % 9, bx = box(best);
    for (let d = 1; d <= 9; d++) if (bm & (1 << d)) {
      const bit = 1 << d;
      b[best] = d; R[r] |= bit; C[c] |= bit; B[bx] |= bit; cs[k] -= d; cn[k]--; cu[k] |= bit;
      rec();
      b[best] = 0; R[r] &= ~bit; C[c] &= ~bit; B[bx] &= ~bit; cs[k] += d; cn[k]++; cu[k] &= ~bit;
      if (count >= 2 || nodes > budget) return;
    }
  };
  rec();
  return { count, sols, aborted: nodes > budget };
}
function newPuzzle(g) {
  const D = KDIFF[S.diff];
  const sol = kFill();
  const { cages, cage } = kCages(sol, D.cmax);
  const giv = new Array(81).fill(0);
  for (const i of U.shuffle([...Array(81).keys()]).slice(0, D.giv)) giv[i] = sol[i];
  const t0 = performance.now();
  for (let it = 0; it < 60; it++) {
    const r = kSolve(cages, cage, giv, 25000);
    if (r.count === 1 && !r.aborted) break;
    if (r.count >= 2) { const a = r.sols[0], b2 = r.sols[1]; const diff = []; for (let i = 0; i < 81; i++) if (a[i] !== b2[i]) diff.push(i); const i = U.choice(diff); giv[i] = sol[i]; }
    else { const em = []; for (let i = 0; i < 81; i++) if (!giv[i]) em.push(i); const i = U.choice(em); giv[i] = sol[i]; }
    if (performance.now() - t0 > 2500) { for (let i = 0; i < 81; i++) if (!giv[i] && Math.random() < 0.15) giv[i] = sol[i]; }
  }
  // 케이지 색칠 (인접 케이지 다른 색)
  const col = cages.map(() => -1);
  for (const cg of cages) {
    const used = new Set();
    for (const c of cg.cells) for (const nb of nbrs(c)) if (cage[nb] !== cg.id && col[cage[nb]] >= 0) used.add(col[cage[nb]]);
    let k = 0; while (used.has(k)) k++; col[cg.id] = k % KTINT.length;
  }
  Object.assign(S, { sol, cages, cageOf: cage, col, giv: giv.map((v) => v > 0), cur: giv.slice(), notes: new Array(81).fill(0), sel: 40, memo: false, hist: [], time: 0, hints: 0, checks: 0, flash: 0, wrong: [], done: false, doneT: 0, hintCell: -1, hintT: 0 });
  evalBad();
}
function snap() { S.hist.push({ cur: S.cur.slice(), notes: S.notes.slice() }); if (S.hist.length > 300) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h.cur; S.notes = h.notes; evalBad(); g.sfx.move(); }
function input(g, d) {
  const i = S.sel; if (S.giv[i]) { g.sfx.hit(); return; }
  if (d === 0) { if (!S.cur[i] && !S.notes[i]) return; snap(); S.cur[i] = 0; S.notes[i] = 0; g.sfx.drop(); evalBad(); return; }
  snap();
  if (S.memo) { if (S.cur[i]) return; S.notes[i] ^= 1 << d; g.sfx.tone(700, 0.04, 'sine', 0.05); return; }
  if (S.cur[i] === d) { S.cur[i] = 0; evalBad(); return; }
  S.cur[i] = d; S.notes[i] = 0;
  const r = (i / 9) | 0, c = i % 9, bx = box(i);
  for (let j = 0; j < 81; j++) if (((j / 9) | 0) === r || j % 9 === c || box(j) === bx || S.cageOf[j] === S.cageOf[i]) S.notes[j] &= ~(1 << d);
  g.sfx.tone(440 + d * 40, 0.06, 'triangle', 0.06);
  evalBad();
  if (S.bad[i]) g.shake(3, 0.15);
  // 케이지/행 완성 효과
  const cg = S.cages[S.cageOf[i]];
  if (cg.cells.every((c2) => S.cur[c2]) && !S.badCage[cg.id]) { const px = KOX + (i % 9) * KCS + 32, py = KOY + ((i / 9) | 0) * KCS + 32; g.burst(px, py, ['#22c55e', '#facc15'], 10, 140, 0.5); }
  checkDone(g);
}
function evalBad() {
  S.bad = new Array(81).fill(false); S.badCage = S.cages.map(() => false);
  for (let i = 0; i < 81; i++) {
    const v = S.cur[i]; if (!v) continue;
    for (let j = i + 1; j < 81; j++) if (S.cur[j] === v && (((j / 9) | 0) === ((i / 9) | 0) || j % 9 === i % 9 || box(j) === box(i) || S.cageOf[i] === S.cageOf[j])) { S.bad[i] = S.bad[j] = true; }
  }
  for (const cg of S.cages) {
    let s = 0, full = true; for (const c of cg.cells) { s += S.cur[c]; if (!S.cur[c]) full = false; }
    if (s > cg.sum || (full && s !== cg.sum)) S.badCage[cg.id] = true;
  }
}
function checkDone(g) {
  if (S.cur.some((v) => !v) || S.bad.some((b) => b) || S.badCage.some((b) => b)) return;
  S.done = true; S.solvedCnt++; S.streak++;
  const D = KDIFF[S.diff];
  S.gain = Math.max(100, Math.round(D.base * (1 + S.streak * 0.1) - S.time * 1.5 - S.hints * 150 - S.checks * 50));
  g.add(S.gain, KOX + 288, KOY + 288);
  g.sfx.win(); g.shake(6, 0.3);
  for (let k = 0; k < 8; k++) g.later(() => g.burst(U.rand(60, 580), U.rand(60, 580), ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899'], 26, 260, 1), k * 0.12);
  const bt = g.load('best' + S.diff, 0); if (!bt || S.time < bt) g.save('best' + S.diff, Math.round(S.time));
}
function hint(g) {
  let i = -1;
  const wrong = []; for (let j = 0; j < 81; j++) if (S.cur[j] && S.cur[j] !== S.sol[j]) wrong.push(j);
  if (wrong.length) i = wrong[0];
  else if (!S.cur[S.sel]) i = S.sel;
  else { const em = []; for (let j = 0; j < 81; j++) if (!S.cur[j]) em.push(j); if (!em.length) return; i = U.choice(em); }
  snap(); S.cur[i] = S.sol[i]; S.notes[i] = 0; S.hints++; S.sel = i; S.hintCell = i; S.hintT = g.time + 1.2;
  g.sfx.power(); evalBad(); checkDone(g);
}
function check(g) {
  S.wrong = S.cur.map((v, i) => v && v !== S.sol[i]); S.checks++;
  const n = S.wrong.filter((x) => x).length; S.flash = 2;
  if (n) { g.sfx.hit(); g.shake(4); g.float(KOX + 288, KOY + 280, `틀린 칸 ${n}개`, '#f87171', 28); } else { g.sfx.coin(); g.float(KOX + 288, KOY + 280, '지금까지 모두 정답!', '#4ade80', 28); }
}
