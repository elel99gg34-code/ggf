let S;
const LGS = 600, LOX = 24, LOY = 40, LPX = 660;
const LD = [
  { n: '쉬움', size: 7, pb: 0.2, keep: 1, base: 300 },
  { n: '보통', size: 10, pb: 0.2, keep: 0.6, base: 800 },
  { n: '어려움', size: 12, pb: 0.19, keep: 0.25, base: 1500 },
  { n: '전문가', size: 14, pb: 0.18, keep: 0, base: 2500 },
];
const LDIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
GAME({
  title: '라이트 업', w: 960, h: 680, bg: '#111827', controls: 'none',
  help: '흰 칸에 전구 💡를 놓아 모든 흰 칸을 밝혀요 (전구 빛은 가로·세로로 벽까지 뻗어요)\n전구끼리 서로 비추면 안 돼요 · 검은 칸 숫자 = 상하좌우에 붙은 전구 수\n클릭: 전구 놓기/빼기 · 우클릭(또는 ✕ 모드): 전구 없음 표시\nU 되돌리기 · H 힌트 · M 모드 전환',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse, n = S.n;
    if (S.done) { if (g.clickIn(LPX, 560, 270, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt;
    if (m.clicked || m.rclick) {
      const cx = Math.floor((m.x - LOX) / S.cs), cy = Math.floor((m.y - LOY) / S.cs);
      if (cx >= 0 && cy >= 0 && cx < n && cy < n) act(g, cy * n + cx, m.rclick || S.xmode ? 2 : 1);
      else if (m.clicked) {
        if (g.inRect(LPX, 230, 270, 50)) { S.xmode = !S.xmode; g.sfx.click(); }
        if (g.inRect(LPX, 290, 131, 50)) undo(g);
        if (g.inRect(LPX + 139, 290, 131, 50)) hint(g);
        if (g.inRect(LPX, 350, 131, 50)) clearAll(g);
        if (g.inRect(LPX + 139, 350, 131, 50)) { newPuzzle(g); g.sfx.click(); }
        LD.forEach((d, i) => { if (g.inRect(LPX + i * 69, 110, 64, 40)) { S.diff = i; g.save('diff', i); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
      }
    }
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyM')) S.xmode = !S.xmode;
    g.info = `${LD[S.diff].n} · ⏱️${U.fmtTime(S.time)} · 💡${S.hints}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, st = S.st;
    for (let i = 0; i < n * n; i++) {
      const px = LOX + (i % n) * cs, py = LOY + ((i / n) | 0) * cs;
      if (S.black[i]) {
        g.rect(px, py, cs, cs, '#0b0f19');
        const k = S.num[i];
        if (k >= 0) { const cnt = adjLights(i); g.text(String(k), px + cs / 2, py + cs / 2 + 2, cs * 0.5, cnt > k ? '#f87171' : cnt === k ? '#4ade80' : '#f9fafb'); }
        continue;
      }
      const lit = st.lit[i] > 0, bad = S.cur[i] === 1 && st.lit[i] > 1;
      g.rect(px, py, cs, cs, bad ? '#fca5a5' : lit ? (S.done ? '#fde047' : '#fef08a') : '#e5e7eb');
      g.stroke(px, py, cs, cs, '#9ca3af', 1);
      if (S.cur[i] === 1) { g.circle(px + cs / 2, py + cs / 2, cs * 0.36, 'rgba(250,204,21,.5)'); g.emoji('💡', px + cs / 2, py + cs / 2, cs * 0.62); }
      else if (S.cur[i] === 2) g.circle(px + cs / 2, py + cs / 2, cs * 0.08, '#6b7280');
      if (S.hintCell === i && S.hintT > g.time) g.ring(px + cs / 2, py + cs / 2, cs * 0.45, '#f97316', 4);
    }
    g.stroke(LOX, LOY, n * cs, n * cs, '#374151', 3);
    g.text('라이트 업', LPX + 135, 40, 30, '#fde68a');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, LPX + 135, 80, 16, '#9ca3af');
    LD.forEach((d, i) => g.button(LPX + i * 69, 110, 64, 40, d.n, S.diff === i ? '#ca8a04' : '#374151', 14));
    const tot = S.whites, litN = st.litCount;
    g.text(`밝힌 칸 ${litN} / ${tot}`, LPX + 135, 172, 18, '#fde68a');
    g.rrect(LPX, 190, 270, 14, 7, '#374151'); g.rrect(LPX, 190, 270 * litN / tot, 14, 7, '#facc15');
    g.button(LPX, 230, 270, 50, S.xmode ? '✕ 표시 모드 (M)' : '💡 전구 모드 (M)', S.xmode ? '#7f1d1d' : '#a16207', 18);
    g.button(LPX, 290, 131, 50, '↶ 되돌리기', '#374151', 16);
    g.button(LPX + 139, 290, 131, 50, '💡 힌트', '#a16207', 16);
    g.button(LPX, 350, 131, 50, '🧹 모두 지우기', '#374151', 15);
    g.button(LPX + 139, 350, 131, 50, '🔄 새 퍼즐', '#7c2d12', 16);
    g.text(`충돌 전구 ${st.conflicts} · 숫자 위반 ${st.numBad}`, LPX + 135, 420, 15, st.conflicts || st.numBad ? '#f87171' : '#9ca3af');
    if (S.done) {
      g.rrect(LPX - 10, 440, 290, 186, 14, 'rgba(161,98,7,.95)', '#fff', 3);
      g.text('✨ 모두 밝혔다!', LPX + 135, 478, 28, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, LPX + 135, 522, 18, '#fef9c3');
      g.button(LPX, 560, 270, 56, '다음 퍼즐 ▶', '#713f12', 22);
    }
  },
});
function rays(n, black, i, fn) {
  const x0 = i % n, y0 = (i / n) | 0;
  for (const [dx, dy] of LDIR) { let x = x0 + dx, y = y0 + dy; while (x >= 0 && y >= 0 && x < n && y < n && !black[y * n + x]) { fn(y * n + x); x += dx; y += dy; } }
}
function adjOf(n, i) { const x = i % n, y = (i / n) | 0, r = []; for (const [dx, dy] of LDIR) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n) r.push(b * n + a); } return r; }
function adjLights(i) { let k = 0; for (const j of adjOf(S.n, i)) if (S.cur[j] === 1) k++; return k; }
function luSolve(n, black, num, budget) {
  const N = n * n, light = new Uint8Array(N), ban = new Uint8Array(N), lit = new Int16Array(N);
  for (let i = 0; i < N; i++) if (num[i] === 0) for (const j of adjOf(n, i)) ban[j] = 1;
  const numCells = []; for (let i = 0; i < N; i++) if (num[i] >= 0) numCells.push(i);
  let count = 0, nodes = 0; const sols = [];
  const place = (c, d) => { light[c] = d > 0 ? 1 : 0; lit[c] += d; rays(n, black, c, (j) => (lit[j] += d)); };
  const numsOk = (final) => {
    for (const i of numCells) {
      let L = 0, A = 0;
      for (const j of adjOf(n, i)) { if (black[j]) continue; if (light[j]) L++; else if (!lit[j] && !ban[j]) A++; }
      if (L > num[i] || L + A < num[i] || (final && L !== num[i])) return false;
    }
    return true;
  };
  const rec = () => {
    if (++nodes > budget || !numsOk(false)) return;
    let best = -1, bc = null;
    for (let i = 0; i < N; i++) if (!black[i] && !lit[i]) {
      const cands = []; if (!ban[i]) cands.push(i);
      rays(n, black, i, (j) => { if (!ban[j] && !lit[j]) cands.push(j); });
      if (!cands.length) return;
      if (!bc || cands.length < bc.length) { bc = cands; best = i; if (cands.length === 1) break; }
    }
    if (best < 0) { if (numsOk(true)) { count++; sols.push(Array.from(light)); } return; }
    const banned = [];
    for (const c of bc) {
      place(c, 1); rec(); place(c, -1);
      if (count >= 2 || nodes > budget) break;
      ban[c] = 1; banned.push(c);
    }
    for (const c of banned) ban[c] = 0;
  };
  rec(); return { count, sols, aborted: nodes > budget };
}
function genOne(D) {
  const n = D.size, N = n * n, black = new Array(N).fill(false);
  for (let i = 0; i < N; i++) if (Math.random() < D.pb / 2 + 0.01) { black[i] = true; black[N - 1 - i] = true; }
  const lightA = new Array(N).fill(0), lit = new Array(N).fill(false);
  for (const i of U.shuffle([...Array(N).keys()])) if (!black[i] && !lit[i]) { lightA[i] = 1; lit[i] = true; rays(n, black, i, (j) => (lit[j] = true)); }
  const num = new Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (black[i]) { let k = 0; for (const j of adjOf(n, i)) if (lightA[j]) k++; num[i] = k; }
  return { n, black, num, sol: lightA };
}
function newPuzzle(g) {
  const D = LD[S.diff], t0 = performance.now();
  let P = null, uniq = false;
  for (let t = 0; t < 40; t++) {
    P = genOne(D);
    const r = luSolve(P.n, P.black, P.num, 6000);
    if (r.count === 1 && !r.aborted) { uniq = true; break; }
    if (performance.now() - t0 > 700) break;
  }
  if (uniq) {
    // 숫자를 지워 어렵게 (해가 유일한 동안만)
    const N = P.n * P.n, order = U.shuffle([...Array(N).keys()].filter((i) => P.num[i] >= 0));
    const tries = Math.round(order.length * (1 - D.keep));
    for (let k = 0; k < tries && performance.now() - t0 < 1400; k++) {
      const i = order[k], old = P.num[i]; P.num[i] = -1;
      const r = luSolve(P.n, P.black, P.num, 4000);
      if (r.count !== 1 || r.aborted) P.num[i] = old;
    }
  }
  const N = P.n * P.n;
  Object.assign(S, { n: P.n, cs: Math.floor(LGS / P.n), black: P.black, num: P.num, sol: P.sol, cur: new Array(N).fill(0), hist: [], time: 0, hints: 0, done: false, xmode: false, hintCell: -1, hintT: 0, whites: P.black.filter((b) => !b).length, uniq });
  evalState();
}
function evalState() {
  const n = S.n, N = n * n, lit = new Array(N).fill(0);
  for (let i = 0; i < N; i++) if (S.cur[i] === 1) { lit[i]++; rays(n, S.black, i, (j) => lit[j]++); }
  let litCount = 0, conflicts = 0, numBad = 0;
  for (let i = 0; i < N; i++) {
    if (S.black[i]) { if (S.num[i] >= 0 && adjLights(i) !== S.num[i]) numBad++; continue; }
    if (lit[i]) litCount++;
    if (S.cur[i] === 1 && lit[i] > 1) conflicts++;
  }
  S.st = { lit, litCount, conflicts, numBad };
}
function snap() { S.hist.push(S.cur.slice()); if (S.hist.length > 400) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h; evalState(); g.sfx.move(); }
function clearAll(g) { if (!S.cur.some((v) => v)) return; snap(); S.cur.fill(0); evalState(); g.sfx.drop(); }
function act(g, i, kind) {
  if (S.black[i]) return;
  snap();
  if (kind === 1) S.cur[i] = S.cur[i] === 1 ? 0 : 1; else S.cur[i] = S.cur[i] === 2 ? 0 : 2;
  evalState();
  const px = LOX + (i % S.n) * S.cs + S.cs / 2, py = LOY + ((i / S.n) | 0) * S.cs + S.cs / 2;
  if (S.cur[i] === 1) { g.sfx.tone(880, 0.08, 'sine', 0.06, 1320); g.burst(px, py, ['#fde047', '#fff'], 10, 120, 0.4); if (S.st.lit[i] > 1) { g.sfx.hit(); g.shake(3, 0.15); } }
  else g.sfx.click();
  checkDone(g);
}
function checkDone(g) {
  const st = S.st; if (st.litCount < S.whites || st.conflicts || st.numBad) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(LD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 100));
  g.add(S.gain, LOX + 300, LOY + 300); g.sfx.win(); g.shake(5, 0.3);
  for (let k = 0; k < 8; k++) g.later(() => g.burst(U.rand(60, 600), U.rand(60, 600), ['#fde047', '#facc15', '#fff', '#fb923c'], 26, 260, 1), k * 0.12);
}
function hint(g) {
  const N = S.n * S.n; let i = -1;
  for (let j = 0; j < N; j++) if (S.cur[j] === 1 && !S.sol[j]) { i = j; break; }
  if (i >= 0) { snap(); S.cur[i] = 2; }
  else {
    const c = []; for (let j = 0; j < N; j++) if (S.sol[j] && S.cur[j] !== 1) c.push(j);
    if (!c.length) return; i = U.choice(c); snap(); S.cur[i] = 1;
  }
  S.hints++; S.hintCell = i; S.hintT = g.time + 1.5; g.sfx.power(); evalState(); checkDone(g);
}
