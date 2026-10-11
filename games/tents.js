let S;
const TGS = 560, TOX = 64, TOY = 76, TPX = 670;
const TD = [
  { n: '쉬움', size: 6, base: 300 },
  { n: '보통', size: 8, base: 700 },
  { n: '어려움', size: 10, base: 1300 },
  { n: '전문가', size: 12, base: 2200 },
];
GAME({
  title: '텐트와 나무', w: 960, h: 680, bg: '#14532d', controls: 'none',
  help: '나무 🌳마다 상하좌우로 붙은 텐트 ⛺를 정확히 하나씩 짝지어요\n텐트끼리는 대각선 포함 닿으면 안 돼요 · 줄 옆 숫자 = 그 줄의 텐트 수\n클릭: 텐트 → 잔디 → 빈칸 · 우클릭: 잔디 · 드래그로 연속 칠하기\nU 되돌리기 · H 힌트 · G 자동 잔디',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse, n = S.n, cs = S.cs;
    if (S.done) { if (g.clickIn(TPX, 560, 260, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt;
    const cx = Math.floor((m.x - TOX) / cs), cy = Math.floor((m.y - TOY) / cs), inB = cx >= 0 && cy >= 0 && cx < n && cy < n, i = cy * n + cx;
    if ((m.clicked || m.rclick) && inB && !S.tree[i]) {
      snap();
      let v;
      if (m.rclick || S.gmode) v = S.cur[i] === 2 ? 0 : 2; else v = (S.cur[i] + 1) % 3;
      S.cur[i] = v; S.paint = m.clicked && v !== 1 ? { v } : null; S.last = i;
      feedback(g, i); evalState(); checkDone(g);
    } else if (m.clicked && !inB) {
      if (g.inRect(TPX, 230, 260, 48)) { S.gmode = !S.gmode; g.sfx.click(); }
      if (g.inRect(TPX, 286, 126, 48)) undo(g);
      if (g.inRect(TPX + 134, 286, 126, 48)) hint(g);
      if (g.inRect(TPX, 342, 126, 48)) autoGrass(g);
      if (g.inRect(TPX + 134, 342, 126, 48)) { newPuzzle(g); g.sfx.click(); }
      TD.forEach((d, k) => { if (g.inRect(TPX + k * 66, 110, 62, 40)) { S.diff = k; g.save('diff', k); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
    }
    if (S.paint && m.down && inB && i !== S.last && !S.tree[i] && S.cur[i] !== 1) { if (S.cur[i] !== S.paint.v) { S.cur[i] = S.paint.v; g.sfx.tone(300, 0.03, 'triangle', 0.04); evalState(); } S.last = i; }
    if (!m.down) S.paint = null;
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyG')) autoGrass(g);
    g.info = `${TD[S.diff].n} · ⏱️${U.fmtTime(S.time)} · 💡${S.hints}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, st = S.st;
    g.rrect(TOX - 8, TOY - 8, n * cs + 16, n * cs + 16, 10, '#166534');
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, px = TOX + x * cs, py = TOY + y * cs, v = S.cur[i];
      g.rect(px, py, cs, cs, S.tree[i] ? '#bbf7d0' : v === 2 ? '#4ade80' : v === 1 ? (st.badTent[i] ? '#fca5a5' : '#fef3c7') : '#f5f5dc');
      g.stroke(px, py, cs, cs, '#15803d', 1);
      if (S.tree[i]) { g.emoji('🌳', px + cs / 2, py + cs / 2, cs * 0.72); if (st.lonely[i]) g.ring(px + cs / 2, py + cs / 2, cs * 0.44, '#dc2626', 2); }
      else if (v === 1) g.emoji('⛺', px + cs / 2, py + cs / 2, cs * 0.66);
      else if (v === 2) { g.line(px + cs * 0.4, py + cs * 0.65, px + cs * 0.45, py + cs * 0.4, '#15803d', 2); g.line(px + cs * 0.55, py + cs * 0.65, px + cs * 0.58, py + cs * 0.38, '#15803d', 2); }
      if (S.hintCell === i && S.hintT > g.time) g.ring(px + cs / 2, py + cs / 2, cs * 0.47, '#f97316', 4);
    }
    for (let k = 0; k < n; k++) {
      const rc = st.rowC[k], cc = st.colC[k];
      g.text(String(S.rowN[k]), TOX - 26, TOY + k * cs + cs / 2, Math.min(26, cs * 0.5), rc > S.rowN[k] ? '#f87171' : rc === S.rowN[k] ? '#86efac' : '#fff');
      g.text(String(S.colN[k]), TOX + k * cs + cs / 2, TOY - 26, Math.min(26, cs * 0.5), cc > S.colN[k] ? '#f87171' : cc === S.colN[k] ? '#86efac' : '#fff');
    }
    g.text('텐트와 나무', TPX + 130, 40, 28, '#dcfce7');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, TPX + 130, 80, 15, '#bbf7d0');
    TD.forEach((d, k) => g.button(TPX + k * 66, 110, 62, 40, d.n, S.diff === k ? '#ca8a04' : '#166534', 14));
    g.text(`⛺ ${st.tents} / ${S.trees}   🌳 짝 ${st.matched} / ${S.trees}`, TPX + 130, 180, 18, '#fef9c3');
    g.button(TPX, 230, 260, 48, S.gmode ? '🌱 잔디 모드' : '⛺ 텐트 모드', S.gmode ? '#15803d' : '#a16207', 18);
    g.button(TPX, 286, 126, 48, '↶ 되돌리기', '#14532d', 16);
    g.button(TPX + 134, 286, 126, 48, '💡 힌트', '#a16207', 16);
    g.button(TPX, 342, 126, 48, '🌱 자동 잔디', '#14532d', 15);
    g.button(TPX + 134, 342, 126, 48, '🔄 새 퍼즐', '#7c2d12', 16);
    if (st.touch) g.text('⚠️ 텐트끼리 닿아 있어요', TPX + 130, 412, 15, '#fca5a5');
    if (S.done) {
      g.rrect(TPX - 10, 440, 280, 186, 14, 'rgba(202,138,4,.95)', '#fff', 3);
      g.text('🏕️ 캠핑장 완성!', TPX + 130, 478, 26, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, TPX + 130, 522, 18, '#fef9c3');
      g.button(TPX, 560, 260, 56, '다음 퍼즐 ▶', '#713f12', 22);
    }
  },
});
function tNb4(n, i) { const x = i % n, y = (i / n) | 0, r = []; if (x > 0) r.push(i - 1); if (x < n - 1) r.push(i + 1); if (y > 0) r.push(i - n); if (y < n - 1) r.push(i + n); return r; }
function tNb8(n, i) { const x = i % n, y = (i / n) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n) r.push(b * n + a); } return r; }
function newPuzzle(g) {
  const n = TD[S.diff].size, N = n * n, target = Math.round(N * 0.2);
  let best = null;
  for (let att = 0; att < 20; att++) {
    const tent = new Array(N).fill(false), tree = new Array(N).fill(false); let k = 0;
    for (const i of U.shuffle([...Array(N).keys()])) {
      if (k >= target) break;
      if (tree[i] || tent[i] || tNb8(n, i).some((j) => tent[j])) continue;
      const spots = tNb4(n, i).filter((j) => !tree[j] && !tent[j]);
      if (!spots.length) continue;
      // 나무가 다른 텐트 옆이 아니면 더 자연스러움 → 랜덤
      tent[i] = true; tree[U.choice(spots)] = true; k++;
    }
    if (!best || k > best.k) best = { tent, tree, k };
    if (k >= target) break;
  }
  const { tent, tree } = best;
  const rowN = [], colN = [];
  for (let y = 0; y < n; y++) { let a = 0, b = 0; for (let x = 0; x < n; x++) { if (tent[y * n + x]) a++; if (tent[x * n + y]) b++; } rowN.push(a); colN.push(b); }
  Object.assign(S, { n, cs: Math.floor(TGS / n), sol: tent, tree, trees: best.k, rowN, colN, cur: new Array(N).fill(0), hist: [], time: 0, hints: 0, done: false, gmode: false, paint: null, hintCell: -1, hintT: 0 });
  evalState();
}
function matching() {
  // 텐트-나무 이분 매칭 (증가 경로)
  const n = S.n, N = n * n, tents = [], matchT = new Map(), matchTree = new Map();
  for (let i = 0; i < N; i++) if (S.cur[i] === 1) tents.push(i);
  const tryT = (t, seen) => {
    for (const j of tNb4(n, t)) if (S.tree[j] && !seen.has(j)) {
      seen.add(j);
      if (!matchTree.has(j) || tryT(matchTree.get(j), seen)) { matchTree.set(j, t); matchT.set(t, j); return true; }
    }
    return false;
  };
  let m = 0; for (const t of tents) if (tryT(t, new Set())) m++;
  return { m, matchT, matchTree, tents };
}
function evalState() {
  const n = S.n, N = n * n, rowC = new Array(n).fill(0), colC = new Array(n).fill(0), badTent = new Array(N).fill(false), lonely = new Array(N).fill(false);
  let tents = 0, touch = false;
  for (let i = 0; i < N; i++) if (S.cur[i] === 1) {
    tents++; rowC[(i / n) | 0]++; colC[i % n]++;
    if (tNb8(n, i).some((j) => S.cur[j] === 1)) { badTent[i] = true; touch = true; }
    if (!tNb4(n, i).some((j) => S.tree[j])) badTent[i] = true;
  }
  for (let i = 0; i < N; i++) if (S.tree[i] && tNb4(n, i).every((j) => S.cur[j] === 2 || S.tree[j])) lonely[i] = true;
  const mt = matching();
  S.st = { rowC, colC, badTent, lonely, tents, touch, matched: mt.m };
}
function feedback(g, i) {
  const px = TOX + (i % S.n) * S.cs + S.cs / 2, py = TOY + ((i / S.n) | 0) * S.cs + S.cs / 2;
  if (S.cur[i] === 1) { g.sfx.tone(520, 0.07, 'triangle', 0.06, 780); g.burst(px, py, ['#fde68a', '#f97316'], 8, 110, 0.35); }
  else if (S.cur[i] === 2) g.sfx.tone(300, 0.04, 'triangle', 0.05);
  else g.sfx.click();
}
function snap() { S.hist.push(S.cur.slice()); if (S.hist.length > 400) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h; evalState(); g.sfx.move(); }
function autoGrass(g) {
  const n = S.n, N = n * n; snap(); let k = 0;
  for (let i = 0; i < N; i++) {
    if (S.tree[i] || S.cur[i]) continue;
    const y = (i / n) | 0, x = i % n;
    if (S.st.rowC[y] >= S.rowN[y] || S.st.colC[x] >= S.colN[x] || !tNb4(n, i).some((j) => S.tree[j]) || tNb8(n, i).some((j) => S.cur[j] === 1)) { S.cur[i] = 2; k++; }
  }
  if (!k) { S.hist.pop(); g.sfx.beep(220, 0.1); return; }
  g.sfx.power(); evalState();
}
function checkDone(g) {
  const st = S.st, n = S.n;
  if (st.tents !== S.trees || st.touch || st.matched !== S.trees) return;
  for (let k = 0; k < n; k++) if (st.rowC[k] !== S.rowN[k] || st.colC[k] !== S.colN[k]) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(TD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 100));
  for (let i = 0; i < n * n; i++) if (!S.tree[i] && S.cur[i] !== 1) S.cur[i] = 2;
  g.add(S.gain, TOX + TGS / 2, TOY + TGS / 2); g.sfx.win(); g.shake(5, 0.3);
  for (let k = 0; k < 8; k++) g.later(() => g.burst(U.rand(80, 600), U.rand(80, 600), ['#86efac', '#fde047', '#f97316', '#fff'], 26, 260, 1), k * 0.12);
}
function hint(g) {
  const N = S.n * S.n; let i = -1;
  for (let j = 0; j < N; j++) if (S.cur[j] === 1 && !S.sol[j]) { i = j; break; }
  snap();
  if (i >= 0) S.cur[i] = 2;
  else {
    const c = []; for (let j = 0; j < N; j++) if (S.sol[j] && S.cur[j] !== 1) c.push(j);
    if (!c.length) { S.hist.pop(); return; } i = U.choice(c); S.cur[i] = 1;
  }
  S.hints++; S.hintCell = i; S.hintT = g.time + 1.5; g.sfx.power(); evalState(); checkDone(g);
}
