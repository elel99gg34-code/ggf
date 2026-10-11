let S;
const BGS = 600, BOX = 24, BOY = 40, BPX = 660;
const BD = [
  { n: '쉬움', size: 5, k: 1, base: 250 },
  { n: '보통', size: 6, k: 1, base: 500 },
  { n: '어려움', size: 8, k: 1, base: 1100 },
  { n: '전문가', size: 10, k: 2, base: 2400 },
];
const BCOL = ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f9a8d4', '#d9f99d', '#a5b4fc', '#fcd34d', '#5eead4'];
GAME({
  title: '스타 배틀', w: 960, h: 680, bg: '#0f172a', controls: 'none',
  help: '각 행·열·색깔 영역마다 별 ⭐을 정해진 개수만큼 (쉬움~어려움 1개, 전문가 2개)\n별끼리는 대각선 포함 닿으면 안 돼요\n클릭: 별 → 점 → 빈칸 · 우클릭: 점 표시 · 드래그로 점 칠하기\nU 되돌리기 · H 힌트 · G 자동 점',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse, n = S.n, cs = S.cs;
    if (S.done) { if (g.clickIn(BPX, 560, 270, 56) || g.pressed('a')) { newPuzzle(g); g.sfx.click(); } return; }
    S.time += dt;
    const cx = Math.floor((m.x - BOX) / cs), cy = Math.floor((m.y - BOY) / cs), inB = cx >= 0 && cy >= 0 && cx < n && cy < n, i = cy * n + cx;
    if ((m.clicked || m.rclick) && inB) {
      snap();
      const v = m.rclick || S.dmode ? (S.cur[i] === 2 ? 0 : 2) : (S.cur[i] + 1) % 3;
      S.cur[i] = v; S.paint = m.clicked && v !== 1 ? { v } : null; S.last = i;
      const px = BOX + cx * cs + cs / 2, py = BOY + cy * cs + cs / 2;
      if (v === 1) { g.sfx.tone(660, 0.08, 'sine', 0.06, 1320); g.burst(px, py, ['#fde047', '#fff'], 10, 130, 0.4); } else g.sfx.click();
      evalState();
      if (v === 1 && S.st.bad[i]) { g.sfx.hit(); g.shake(3, 0.15); }
      checkDone(g);
    } else if (m.clicked) {
      if (g.inRect(BPX, 230, 270, 48)) { S.dmode = !S.dmode; g.sfx.click(); }
      if (g.inRect(BPX, 286, 131, 48)) undo(g);
      if (g.inRect(BPX + 139, 286, 131, 48)) hint(g);
      if (g.inRect(BPX, 342, 131, 48)) autoDot(g);
      if (g.inRect(BPX + 139, 342, 131, 48)) { newPuzzle(g); g.sfx.click(); }
      BD.forEach((d, k) => { if (g.inRect(BPX + k * 69, 110, 64, 40)) { S.diff = k; g.save('diff', k); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
    }
    if (S.paint && m.down && inB && i !== S.last && S.cur[i] !== 1) { if (S.cur[i] !== S.paint.v) { S.cur[i] = S.paint.v; g.sfx.tone(300, 0.03, 'triangle', 0.04); evalState(); } S.last = i; }
    if (!m.down) S.paint = null;
    if (g.keyp('KeyU') || (g.keyp('KeyZ') && (g.key('ControlLeft') || g.key('MetaLeft')))) undo(g);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyG')) autoDot(g);
    g.info = `${BD[S.diff].n} · ${S.k}★ · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    const n = S.n, cs = S.cs, st = S.st;
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, px = BOX + x * cs, py = BOY + y * cs;
      g.rect(px, py, cs, cs, BCOL[S.reg[i] % BCOL.length]);
      if (st.regFull[S.reg[i]]) g.rect(px, py, cs, cs, 'rgba(255,255,255,.35)');
      g.stroke(px, py, cs, cs, 'rgba(15,23,42,.25)', 1);
      const v = S.cur[i];
      if (v === 1) { if (st.bad[i]) g.circle(px + cs / 2, py + cs / 2, cs * 0.42, 'rgba(220,38,38,.6)'); g.emoji('⭐', px + cs / 2, py + cs / 2, cs * 0.7); }
      else if (v === 2) g.circle(px + cs / 2, py + cs / 2, cs * 0.07, '#334155');
      if (S.hintCell === i && S.hintT > g.time) g.ring(px + cs / 2, py + cs / 2, cs * 0.46, '#f97316', 4);
    }
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, px = BOX + x * cs, py = BOY + y * cs;
      if (x < n - 1 && S.reg[i + 1] !== S.reg[i]) g.line(px + cs, py, px + cs, py + cs, '#0f172a', 4);
      if (y < n - 1 && S.reg[i + n] !== S.reg[i]) g.line(px, py + cs, px + cs, py + cs, '#0f172a', 4);
    }
    g.stroke(BOX, BOY, n * cs, n * cs, '#0f172a', 5);
    for (let k = 0; k < n; k++) {
      if (st.rowC[k] > S.k) g.rect(BOX - 10, BOY + k * cs + 4, 6, cs - 8, '#ef4444'); else if (st.rowC[k] === S.k) g.rect(BOX - 10, BOY + k * cs + 4, 6, cs - 8, '#4ade80');
      if (st.colC[k] > S.k) g.rect(BOX + k * cs + 4, BOY - 10, cs - 8, 6, '#ef4444'); else if (st.colC[k] === S.k) g.rect(BOX + k * cs + 4, BOY - 10, cs - 8, 6, '#4ade80');
    }
    g.text('스타 배틀', BPX + 135, 40, 30, '#fde68a');
    g.text(`퍼즐 ${S.solvedCnt + 1} · 연속 ${S.streak} · ⏱️ ${U.fmtTime(S.time)}`, BPX + 135, 80, 16, '#94a3b8');
    BD.forEach((d, k) => g.button(BPX + k * 69, 110, 64, 40, d.n, S.diff === k ? '#ca8a04' : '#334155', 14));
    g.text(`${n}×${n} · 줄/영역마다 별 ${S.k}개 · ⭐ ${st.stars}/${n * S.k}`, BPX + 135, 180, 16, '#fde68a');
    g.button(BPX, 230, 270, 48, S.dmode ? '• 점 모드' : '⭐ 별 모드', S.dmode ? '#475569' : '#a16207', 18);
    g.button(BPX, 286, 131, 48, '↶ 되돌리기', '#334155', 16);
    g.button(BPX + 139, 286, 131, 48, '💡 힌트', '#a16207', 16);
    g.button(BPX, 342, 131, 48, '• 자동 점', '#334155', 16);
    g.button(BPX + 139, 342, 131, 48, '🔄 새 퍼즐', '#7c2d12', 16);
    if (st.anyBad) g.text('⚠️ 규칙 위반이 있어요', BPX + 135, 412, 15, '#fca5a5');
    if (S.done) {
      g.rrect(BPX - 10, 440, 290, 186, 14, 'rgba(30,64,175,.95)', '#fff', 3);
      g.text('🌟 별자리 완성!', BPX + 135, 478, 28, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, BPX + 135, 522, 18, '#dbeafe');
      g.button(BPX, 560, 270, 56, '다음 퍼즐 ▶', '#1e3a8a', 22);
    }
  },
});
function rowCombos(n, k) {
  const out = [];
  const rec = (start, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let c = start; c < n; c++) { if (cur.length && c - cur[cur.length - 1] < 2) continue; cur.push(c); rec(c + 1, cur); cur.pop(); } };
  rec(0, []); return out;
}
function bSolve(n, k, reg, budget, firstOnly, shuffle) {
  let combos = rowCombos(n, k); const colC = new Array(n).fill(0), regC = new Array(n).fill(0), rows = [];
  const regLast = new Array(n).fill(0); for (let i = 0; i < n * n; i++) regLast[reg[i]] = Math.max(regLast[reg[i]], (i / n) | 0);
  let count = 0, nodes = 0; const sols = [];
  const rec = (r) => {
    if (++nodes > budget) return;
    if (r === n) { count++; const b = new Array(n * n).fill(0); rows.forEach((cs, y) => cs.forEach((x) => (b[y * n + x] = 1))); sols.push(b); return; }
    const prev = r ? rows[r - 1] : [];
    const list = shuffle ? U.shuffle(combos.slice()) : combos;
    for (const cb of list) {
      let ok = true;
      for (const c of cb) { if (colC[c] >= k || regC[reg[r * n + c]] >= k) { ok = false; break; } for (const p of prev) if (Math.abs(p - c) <= 1) { ok = false; break; } if (!ok) break; }
      if (!ok) continue;
      if (cb.length === 2 && reg[r * n + cb[0]] === reg[r * n + cb[1]] && regC[reg[r * n + cb[0]]] + 2 > k) continue;
      for (const c of cb) { colC[c]++; regC[reg[r * n + c]]++; }
      let ok2 = true;
      for (let q = 0; q < n; q++) if (regLast[q] === r && regC[q] !== k) { ok2 = false; break; }
      if (ok2) for (let c = 0; c < n; c++) if (k - colC[c] > Math.ceil((n - 1 - r) / 2)) { ok2 = false; break; }
      if (ok2) { rows.push(cb); rec(r + 1); rows.pop(); }
      for (const c of cb) { colC[c]--; regC[reg[r * n + c]]--; }
      if (count >= (firstOnly ? 1 : 2) || nodes > budget) return;
    }
  };
  rec(0); return { count, sols, aborted: nodes > budget };
}
function bNb4(n, i) { const x = i % n, y = (i / n) | 0, r = []; if (x > 0) r.push(i - 1); if (x < n - 1) r.push(i + 1); if (y > 0) r.push(i - n); if (y < n - 1) r.push(i + n); return r; }
function bNb8(n, i) { const x = i % n, y = (i / n) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n) r.push(b * n + a); } return r; }
function growRegions(n, seeds) {
  const reg = new Array(n * n).fill(-1); seeds.forEach((s, q) => (reg[s] = q));
  let left = n * n - seeds.length;
  while (left > 0) {
    const fr = [];
    for (let i = 0; i < n * n; i++) if (reg[i] < 0) for (const j of bNb4(n, i)) if (reg[j] >= 0) { fr.push([i, reg[j]]); }
    const [i, q] = U.choice(fr); reg[i] = q; left--;
  }
  return reg;
}
function connectedWithout(n, reg, q, skip) {
  const cells = []; for (let i = 0; i < n * n; i++) if (reg[i] === q && i !== skip) cells.push(i);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), st = [cells[0]];
  while (st.length) { const i = st.pop(); for (const j of bNb4(n, i)) if (j !== skip && reg[j] === q && !seen.has(j)) { seen.add(j); st.push(j); } }
  return seen.size === cells.length;
}
function genOne(D) {
  const n = D.size, k = D.k;
  const sol = bSolve(n, k, new Array(n * n).fill(0).map((_, i) => i % n), 1e9, true, true);
  // 위 호출은 영역 = 열 로 두고 해 하나 생성 (열당 k, 행당 k)
  const star = sol.sols[0];
  const stars = []; for (let i = 0; i < n * n; i++) if (star[i]) stars.push(i);
  let reg;
  if (k === 1) reg = growRegions(n, stars);
  else {
    for (let t = 0; t < 200; t++) {
      const r0 = growRegions(n, stars), m = stars.length;
      const adj = Array.from({ length: m }, () => new Set());
      for (let i = 0; i < n * n; i++) for (const j of bNb4(n, i)) if (r0[i] !== r0[j]) adj[r0[i]].add(r0[j]);
      const mate = new Array(m).fill(-1);
      const rec = () => { const a = mate.indexOf(-1); if (a < 0) return true; for (const b of U.shuffle([...adj[a]])) if (mate[b] < 0 && b !== a) { mate[a] = b; mate[b] = a; if (rec()) return true; mate[a] = mate[b] = -1; } return false; };
      if (!rec()) continue;
      const id = new Array(m).fill(-1); let q = 0; for (let a = 0; a < m; a++) if (id[a] < 0) { id[a] = id[mate[a]] = q++; }
      reg = r0.map((r) => id[r]); break;
    }
  }
  return { n, k, star, reg };
}
function newPuzzle(g) {
  const D = BD[S.diff], t0 = performance.now();
  let P = genOne(D), uniq = false;
  while (P.reg === undefined) P = genOne(D);
  for (let it = 0; it < 400 && performance.now() - t0 < 1500; it++) {
    const r = bSolve(P.n, P.k, P.reg, 40000, false, false);
    if (r.count === 1 && !r.aborted) { uniq = true; break; }
    if (r.aborted) { P = genOne(D); while (P.reg === undefined) P = genOne(D); continue; }
    const alt = r.sols.find((s) => s.some((v, i) => v !== P.star[i]));
    const cand = []; for (let i = 0; i < P.n * P.n; i++) if (alt[i] && !P.star[i]) cand.push(i);
    let moved = false;
    for (const c of U.shuffle(cand)) {
      const q = P.reg[c], others = [...new Set(bNb4(P.n, c).map((j) => P.reg[j]).filter((o) => o !== q))];
      if (!others.length || !connectedWithout(P.n, P.reg, q, c)) continue;
      P.reg[c] = U.choice(others); moved = true; break;
    }
    if (!moved) { P = genOne(D); while (P.reg === undefined) P = genOne(D); }
  }
  Object.assign(S, { n: P.n, k: P.k, cs: Math.floor(BGS / P.n), reg: P.reg, sol: P.star, cur: new Array(P.n * P.n).fill(0), hist: [], time: 0, hints: 0, done: false, dmode: false, paint: null, hintCell: -1, hintT: 0, uniq });
  evalState();
}
function evalState() {
  const n = S.n, N = n * n, rowC = new Array(n).fill(0), colC = new Array(n).fill(0), regC = new Array(n).fill(0), bad = new Array(N).fill(false);
  let stars = 0;
  for (let i = 0; i < N; i++) if (S.cur[i] === 1) { stars++; rowC[(i / n) | 0]++; colC[i % n]++; regC[S.reg[i]]++; }
  let anyBad = false;
  for (let i = 0; i < N; i++) if (S.cur[i] === 1) {
    if (bNb8(n, i).some((j) => S.cur[j] === 1) || rowC[(i / n) | 0] > S.k || colC[i % n] > S.k || regC[S.reg[i]] > S.k) { bad[i] = true; anyBad = true; }
  }
  S.st = { rowC, colC, regC, bad, stars, anyBad, regFull: regC.map((v) => v === S.k) };
}
function snap() { S.hist.push(S.cur.slice()); if (S.hist.length > 400) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.cur = h; evalState(); g.sfx.move(); }
function autoDot(g) {
  const n = S.n; snap(); let c = 0;
  for (let i = 0; i < n * n; i++) {
    if (S.cur[i]) continue;
    if (bNb8(n, i).some((j) => S.cur[j] === 1) || S.st.rowC[(i / n) | 0] >= S.k || S.st.colC[i % n] >= S.k || S.st.regC[S.reg[i]] >= S.k) { S.cur[i] = 2; c++; }
  }
  if (!c) { S.hist.pop(); g.sfx.beep(220, 0.1); return; }
  g.sfx.power(); evalState();
}
function checkDone(g) {
  const st = S.st, n = S.n;
  if (st.anyBad || st.stars !== n * S.k) return;
  for (let k = 0; k < n; k++) if (st.rowC[k] !== S.k || st.colC[k] !== S.k || st.regC[k] !== S.k) return;
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(50, Math.round(BD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.2 - S.hints * 80));
  g.add(S.gain, BOX + 300, BOY + 300); g.sfx.win(); g.shake(5, 0.3);
  for (let i = 0; i < n * n; i++) if (S.cur[i] === 1) g.later(() => g.burst(BOX + (i % n) * S.cs + S.cs / 2, BOY + ((i / n) | 0) * S.cs + S.cs / 2, ['#fde047', '#fff', '#fbbf24'], 22, 220, 0.9), Math.random() * 0.8);
}
function hint(g) {
  const N = S.n * S.n; let i = -1;
  for (let j = 0; j < N; j++) if (S.cur[j] === 1 && !S.sol[j]) { i = j; break; }
  snap();
  if (i >= 0) S.cur[i] = 2;
  else { const c = []; for (let j = 0; j < N; j++) if (S.sol[j] && S.cur[j] !== 1) c.push(j); if (!c.length) { S.hist.pop(); return; } i = U.choice(c); S.cur[i] = 1; }
  S.hints++; S.hintCell = i; S.hintT = g.time + 1.5; g.sfx.power(); evalState(); checkDone(g);
}
