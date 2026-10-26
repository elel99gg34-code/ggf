let S;
const LGS2 = 580, LOX2 = 44, LOY2 = 56, LPX2 = 670;
const SD = [
  { n: '쉬움', size: 5, show: 0.85, base: 300 },
  { n: '보통', size: 7, show: 0.7, base: 700 },
  { n: '어려움', size: 9, show: 0.6, base: 1400 },
  { n: '전문가', size: 10, show: 0.5, base: 2300 },
];
GAME({
  title: '슬리더 링크', w: 960, h: 680, bg: '#faf7f0', controls: 'none',
  help: '점과 점 사이에 선을 그어 끊기지 않는 고리 하나를 만들어요\n칸의 숫자 = 그 칸을 둘러싼 4변 중 선이 지나는 수 · 고리는 갈라지거나 교차하면 안 돼요\n변 클릭: 선 긋기/지우기 · 우클릭(또는 ✕ 모드): ✕ 표시 · 드래그로 연속 그리기\nU 되돌리기 · H 힌트 · M 모드 전환',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse;
    if (S.done) { if (g.clickIn(LPX2, 560, 260, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt;
    const e = edgeAt(m.x, m.y, 0.36);
    if ((m.clicked || m.rclick) && e >= 0) {
      snap();
      const v = m.rclick || S.xmode ? (S.cur[e] === 2 ? 0 : 2) : (S.cur[e] === 1 ? 0 : 1);
      S.cur[e] = v; S.paint = m.clicked ? v : null; S.lastE = e;
      v === 1 ? g.sfx.tone(520, 0.04, 'triangle', 0.05) : g.sfx.click();
      evalState(); checkDone(g);
    } else if (m.clicked) {
      if (g.inRect(LPX2, 230, 260, 48)) { S.xmode = !S.xmode; g.sfx.click(); }
      if (g.inRect(LPX2, 286, 126, 48)) undo(g);
      if (g.inRect(LPX2 + 134, 286, 126, 48)) hint(g);
      if (g.inRect(LPX2, 342, 126, 48)) clearAll(g);
      if (g.inRect(LPX2 + 134, 342, 126, 48)) { newPuzzle(g); g.sfx.click(); }
      SD.forEach((d, k) => { if (g.inRect(LPX2 + k * 66, 110, 62, 40)) { S.diff = k; g.save('diff', k); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
    }
    if (S.paint !== null && m.down) {
      const e2 = edgeAt(m.x, m.y, 0.22);
      if (e2 >= 0 && e2 !== S.lastE) { S.lastE = e2; if (S.cur[e2] !== S.paint) { S.cur[e2] = S.paint; g.sfx.tone(560, 0.03, 'triangle', 0.04); evalState(); checkDone(g); } }
    }
    if (!m.down) S.paint = null;
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyM')) S.xmode = !S.xmode;
    g.info = `${SD[S.diff].n} · ${S.n}×${S.n} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, st = S.st;
    if (S.done) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (st.inside[y * n + x]) g.rect(LOX2 + x * cs, LOY2 + y * cs, cs, cs, 'rgba(251,191,36,.35)');
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const k = S.clue[y * n + x]; if (k < 0) continue;
      const have = st.cellCnt[y * n + x];
      g.text(String(k), LOX2 + x * cs + cs / 2, LOY2 + y * cs + cs / 2 + 2, cs * 0.5, have > k ? '#dc2626' : have === k ? '#a8a29e' : '#292524');
    }
    for (let e = 0; e < S.ne; e++) {
      const [x1, y1, x2, y2] = S.ep[e], v = S.cur[e];
      const ax = LOX2 + x1 * cs, ay = LOY2 + y1 * cs, bx = LOX2 + x2 * cs, by = LOY2 + y2 * cs;
      if (v === 1) { c.lineCap = 'round'; g.line(ax, ay, bx, by, S.done ? '#d97706' : st.badE[e] ? '#dc2626' : '#1e3a8a', Math.max(4, cs * 0.1)); }
      else if (v === 2) { const mx = (ax + bx) / 2, my = (ay + by) / 2, r = cs * 0.08; g.line(mx - r, my - r, mx + r, my + r, '#ef4444', 2); g.line(mx - r, my + r, mx + r, my - r, '#ef4444', 2); }
      if (S.hintE === e && S.hintT > g.time) g.line(ax, ay, bx, by, 'rgba(249,115,22,.6)', cs * 0.25);
    }
    c.lineCap = 'butt';
    const he = edgeAt(g.mouse.x, g.mouse.y, 0.36);
    if (he >= 0 && !S.done) { const [x1, y1, x2, y2] = S.ep[he]; g.line(LOX2 + x1 * cs, LOY2 + y1 * cs, LOX2 + x2 * cs, LOY2 + y2 * cs, 'rgba(30,58,138,.18)', 6); }
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) g.circle(LOX2 + x * cs, LOY2 + y * cs, Math.max(3, cs * 0.06), st.badV[y * (n + 1) + x] ? '#dc2626' : '#292524');
    g.text('슬리더 링크', LPX2 + 130, 40, 30, '#292524');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, LPX2 + 130, 80, 15, '#78716c');
    SD.forEach((d, k) => g.button(LPX2 + k * 66, 110, 62, 40, d.n, S.diff === k ? '#1e3a8a' : '#78716c', 14));
    g.text(`선 ${st.lines}개 · 고리 조각 ${st.parts}개`, LPX2 + 130, 180, 17, '#44403c');
    g.button(LPX2, 230, 260, 48, S.xmode ? '✕ 표시 모드 (M)' : '✏️ 선 모드 (M)', S.xmode ? '#b91c1c' : '#1e3a8a', 18);
    g.button(LPX2, 286, 126, 48, '↶ 되돌리기', '#57534e', 16);
    g.button(LPX2 + 134, 286, 126, 48, '💡 힌트', '#ca8a04', 16);
    g.button(LPX2, 342, 126, 48, '🧹 모두 지우기', '#57534e', 15);
    g.button(LPX2 + 134, 342, 126, 48, '🔄 새 퍼즐', '#7c2d12', 16);
    if (st.branch) g.text('⚠️ 선이 갈라졌어요 (빨간 점)', LPX2 + 130, 412, 15, '#dc2626');
    if (S.done) {
      g.rrect(LPX2 - 10, 440, 280, 186, 14, 'rgba(30,58,138,.95)', '#fff', 3);
      g.text('➰ 고리 완성!', LPX2 + 130, 478, 28, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, LPX2 + 130, 522, 18, '#dbeafe');
      g.button(LPX2, 560, 260, 56, '다음 퍼즐 ▶', '#1e40af', 22);
    }
  },
});
function blobOk(n, inS) {
  const N = n * n, cells = []; for (let i = 0; i < N; i++) if (inS[i]) cells.push(i);
  if (!cells.length) return false;
  const nb = (i) => { const x = i % n, y = (i / n) | 0, r = []; if (x > 0) r.push(i - 1); if (x < n - 1) r.push(i + 1); if (y > 0) r.push(i - n); if (y < n - 1) r.push(i + n); return r; };
  let seen = new Set([cells[0]]), st = [cells[0]];
  while (st.length) { const i = st.pop(); for (const j of nb(i)) if (inS[j] && !seen.has(j)) { seen.add(j); st.push(j); } }
  if (seen.size !== cells.length) return false;
  const out = N - cells.length; seen = new Set(); st = [];
  for (let i = 0; i < N; i++) { const x = i % n, y = (i / n) | 0; if (!inS[i] && (x === 0 || y === 0 || x === n - 1 || y === n - 1)) { seen.add(i); st.push(i); } }
  while (st.length) { const i = st.pop(); for (const j of nb(i)) if (!inS[j] && !seen.has(j)) { seen.add(j); st.push(j); } }
  if (seen.size !== out) return false;
  for (let y = 1; y < n; y++) for (let x = 1; x < n; x++) {
    const a = inS[(y - 1) * n + x - 1], b = inS[(y - 1) * n + x], c = inS[y * n + x - 1], d = inS[y * n + x];
    if (a === d && b === c && a !== b) return false;
  }
  return true;
}
function newPuzzle(g) {
  const D = SD[S.diff], n = D.size, N = n * n;
  let inS;
  for (let att = 0; att < 20; att++) {
    inS = new Array(N).fill(false); inS[U.randi(0, N - 1)] = true;
    const target = Math.round(N * U.rand(0.42, 0.58)); let size = 1, tries = 0;
    while (size < target && tries++ < N * 30) {
      const i = U.randi(0, N - 1); if (inS[i]) continue;
      const x = i % n, y = (i / n) | 0;
      const k = (x > 0 && inS[i - 1] ? 1 : 0) + (x < n - 1 && inS[i + 1] ? 1 : 0) + (y > 0 && inS[i - n] ? 1 : 0) + (y < n - 1 && inS[i + n] ? 1 : 0);
      if (!k || (k >= 2 && Math.random() < 0.75)) continue;
      inS[i] = true; if (blobOk(n, inS)) size++; else inS[i] = false;
    }
    if (size >= target * 0.8) break;
  }
  // 변 목록: 가로 (n+1)*n, 세로 n*(n+1)
  const ep = [], HN = (n + 1) * n;
  for (let y = 0; y <= n; y++) for (let x = 0; x < n; x++) ep.push([x, y, x + 1, y]);
  for (let y = 0; y < n; y++) for (let x = 0; x <= n; x++) ep.push([x, y, x, y + 1]);
  const at = (x, y) => x >= 0 && y >= 0 && x < n && y < n && inS[y * n + x];
  const sol = ep.map(([x1, y1, x2, y2], e) => e < HN ? at(x1, y1 - 1) !== at(x1, y1) : at(x1 - 1, y1) !== at(x1, y1));
  const cellE = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cellE.push([y * n + x, (y + 1) * n + x, HN + y * (n + 1) + x, HN + y * (n + 1) + x + 1]);
  const clue = cellE.map((es) => es.filter((e) => sol[e]).length);
  for (let i = 0; i < N; i++) if (Math.random() > D.show) clue[i] = -1;
  const vE = Array.from({ length: (n + 1) * (n + 1) }, () => []);
  ep.forEach(([x1, y1, x2, y2], e) => { vE[y1 * (n + 1) + x1].push(e); vE[y2 * (n + 1) + x2].push(e); });
  Object.assign(S, { n, cs: Math.floor(LGS2 / n), ep, ne: ep.length, HN, sol, clue, cellE, vE, cur: new Array(ep.length).fill(0), hist: [], time: 0, hints: 0, done: false, xmode: false, paint: null, lastE: -1, hintE: -1, hintT: 0 });
  evalState();
}
function edgeAt(mx, my, th) {
  const n = S.n, fx = (mx - LOX2) / S.cs, fy = (my - LOY2) / S.cs;
  if (fx < -0.4 || fy < -0.4 || fx > n + 0.4 || fy > n + 0.4) return -1;
  let best = -1, bd = th;
  const hy = Math.round(fy), hx = Math.floor(fx);
  if (hx >= 0 && hx < n && hy >= 0 && hy <= n) { const d = Math.abs(fy - hy); if (d < bd) { bd = d; best = hy * n + hx; } }
  const vx = Math.round(fx), vy = Math.floor(fy);
  if (vy >= 0 && vy < n && vx >= 0 && vx <= n) { const d = Math.abs(fx - vx); if (d < bd) { bd = d; best = S.HN + vy * (n + 1) + vx; } }
  return best;
}
function evalState() {
  const n = S.n, N = n * n, cellCnt = S.cellE.map((es) => es.filter((e) => S.cur[e] === 1).length);
  const badV = S.vE.map((es) => es.filter((e) => S.cur[e] === 1).length > 2);
  const badE = new Array(S.ne).fill(false);
  let lines = 0, branch = false;
  S.ep.forEach(([x1, y1, x2, y2], e) => { if (S.cur[e] === 1) { lines++; if (badV[y1 * (n + 1) + x1] || badV[y2 * (n + 1) + x2]) { badE[e] = true; branch = true; } } });
  // 연결 조각 수
  const seen = new Uint8Array(S.ne); let parts = 0;
  for (let e = 0; e < S.ne; e++) if (S.cur[e] === 1 && !seen[e]) {
    parts++; const st = [e]; seen[e] = 1;
    while (st.length) { const f = st.pop(), [x1, y1, x2, y2] = S.ep[f]; for (const v of [y1 * (n + 1) + x1, y2 * (n + 1) + x2]) for (const h of S.vE[v]) if (S.cur[h] === 1 && !seen[h]) { seen[h] = 1; st.push(h); } }
  }
  const inside = new Array(N).fill(false);
  for (let y = 0; y < n; y++) { let par = false; for (let x = 0; x < n; x++) { if (S.cur[S.HN + y * (n + 1) + x] === 1) par = !par; inside[y * n + x] = par; } }
  S.st = { cellCnt, badV, badE, lines, branch, parts, inside };
}
function snap() { S.hist.push(S.cur.slice()); if (S.hist.length > 500) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h; evalState(); g.sfx.move(); }
function clearAll(g) { if (!S.cur.some((v) => v)) return; snap(); S.cur.fill(0); evalState(); g.sfx.drop(); }
function checkDone(g) {
  const st = S.st; if (!st.lines || st.parts !== 1 || st.branch) return;
  for (const es of S.vE) { const d = es.filter((e) => S.cur[e] === 1).length; if (d !== 0 && d !== 2) return; }
  for (let i = 0; i < S.n * S.n; i++) if (S.clue[i] >= 0 && st.cellCnt[i] !== S.clue[i]) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(SD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 60));
  g.add(S.gain, LOX2 + 290, LOY2 + 290); g.sfx.win(); g.shake(5, 0.3);
  let k = 0;
  S.ep.forEach(([x1, y1, x2, y2], e) => { if (S.cur[e] === 1 && k++ % 2 === 0) g.later(() => g.burst(LOX2 + (x1 + x2) / 2 * S.cs, LOY2 + (y1 + y2) / 2 * S.cs, ['#fbbf24', '#3b82f6', '#fff'], 6, 140, 0.7), k * 0.015); });
}
function hint(g) {
  let e = -1;
  for (let f = 0; f < S.ne; f++) if (S.cur[f] === 1 && !S.sol[f]) { e = f; break; }
  snap();
  if (e >= 0) S.cur[e] = 2;
  else {
    const c = []; for (let f = 0; f < S.ne; f++) if (S.sol[f] && S.cur[f] !== 1) c.push(f);
    if (!c.length) { S.hist.pop(); return; } e = U.choice(c); S.cur[e] = 1;
  }
  S.hints++; S.hintE = e; S.hintT = g.time + 1.5; g.sfx.power(); evalState(); checkDone(g);
}
