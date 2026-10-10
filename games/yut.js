let S;
const BX = 70, BY = 70, BS = 560, END = 99;
const RES = { '-1': '빽도', 1: '도', 2: '개', 3: '걸', 4: '윷', 5: '모' };
const NODES = (() => {
  const P = {}, L = BX, R = BX + BS, T = BY, B = BY + BS;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const c0 = [R, B], c5 = [R, T], c10 = [L, T], c15 = [L, B], C = [(L + R) / 2, (T + B) / 2];
  P[0] = c0; for (let i = 1; i < 5; i++) P[i] = lerp(c0, c5, i / 5); P[5] = c5; for (let i = 1; i < 5; i++) P[5 + i] = lerp(c5, c10, i / 5); P[10] = c10;
  for (let i = 1; i < 5; i++) P[10 + i] = lerp(c10, c15, i / 5); P[15] = c15; for (let i = 1; i < 5; i++) P[15 + i] = lerp(c15, c0, i / 5);
  P[20] = lerp(c5, C, 1 / 3); P[21] = lerp(c5, C, 2 / 3); P[22] = C; P[23] = lerp(C, c15, 1 / 3); P[24] = lerp(C, c15, 2 / 3);
  P[25] = lerp(c10, C, 1 / 3); P[26] = lerp(c10, C, 2 / 3); P[27] = lerp(C, c0, 1 / 3); P[28] = lerp(C, c0, 2 / 3);
  return P;
})();
const A = [20, 21, 22, 23, 24, 15, 16, 17, 18, 19, END], Bp = [25, 26, 22, 27, 28, 0, END];
const BACK = { 20: 5, 21: 20, 22: 21, 23: 22, 24: 23, 25: 10, 26: 25, 27: 22, 28: 27 };
function pathFrom(n) {
  if (n === -1) return [...Array.from({ length: 19 }, (_, i) => i + 1), 0, END];
  if (n === 0) return [END];
  if (n === 5) return A;
  if (n === 10) return Bp;
  if (n === 22) return [27, 28, 0, END];
  let i = A.indexOf(n); if (i >= 0 && n !== 15) return A.slice(i + 1);
  i = Bp.indexOf(n); if (i >= 0) return Bp.slice(i + 1);
  return [...Array.from({ length: 19 - n }, (_, k) => n + 1 + k), 0, END];
}
const COL = ['#2563eb', '#dc2626'], TOK = ['🐎', '🐂'];
GAME({
  title: '윷놀이', w: 1000, h: 720, bg: '#3b2412', controls: 'none',
  help: '🎋 윷 던지기 → 나온 결과(도·개·걸·윷·모·빽도)로 말을 이동\n윷·모가 나오거나 상대 말을 잡으면 한 번 더!\n모서리·한가운데(방)에 멈추면 지름길로 들어가요 · 같은 편 말은 업어서 함께 이동\n말 4개를 먼저 모두 내보내면 승리',
  init(g) { S = { pcs: [0, 1].map((o) => Array.from({ length: 4 }, () => ({ o, n: -1, done: false }))), turn: 0, phase: 'throw', res: [], sel: 0, anim: 0, throwT: 0, sticks: [0, 0, 0, 0], msg: '', aiT: 0, extra: 0, done: false }; },
  update(g, dt) {
    if (S.done) return;
    if (S.throwT > 0) { S.throwT -= dt; S.sticks = S.sticks.map(() => Math.random() < 0.5 ? 1 : 0); if (S.throwT <= 0) settleThrow(g); return; }
    if (S.turn === 1) { S.aiT -= dt; if (S.aiT <= 0) aiStep(g); return; }
    if (S.phase === 'throw' && (g.clickIn(700, 560, 260, 70) || g.pressed('a'))) startThrow(g);
    if (S.phase === 'move') {
      S.res.forEach((r, i) => { if (g.clickIn(700 + i * 64, 400, 58, 48)) { S.sel = i; g.sfx.click(); } });
      if (!g.mouse.clicked) return;
      const r = S.res[S.sel];
      // 대기 말 클릭
      if (g.inRect(700, 470, 260, 60)) { const p = S.pcs[0].find((p) => p.n === -1 && !p.done); if (p && canMove(p, r)) return doMove(g, p, r); }
      for (const p of S.pcs[0]) if (!p.done && p.n >= 0) { const [x, y] = NODES[p.n]; if (U.dist(g.mouse.x, g.mouse.y, x, y) < 30 && canMove(p, r)) return doMove(g, p, r); }
    }
  },
  draw(g, c) {
    g.rrect(BX - 40, BY - 40, BS + 80, BS + 80, 20, '#f5deb3', '#8b5a2b', 6);
    c.lineWidth = 3; c.strokeStyle = '#8b5a2b';
    c.strokeRect(BX, BY, BS, BS); g.line(BX, BY, BX + BS, BY + BS, '#8b5a2b', 3); g.line(BX + BS, BY, BX, BY + BS, '#8b5a2b', 3);
    for (const k in NODES) { const [x, y] = NODES[k], big = [0, 5, 10, 15, 22].includes(+k); g.circle(x, y, big ? 24 : 15, big ? '#d97706' : '#fde68a'); g.ring(x, y, big ? 24 : 15, '#8b5a2b', 2); }
    g.text('출발', NODES[0][0], NODES[0][1] + 42, 15, '#5b3a14');
    // 이동 미리보기
    if (S.turn === 0 && S.phase === 'move') {
      const r = S.res[S.sel];
      for (const p of S.pcs[0]) if (!p.done && canMove(p, r)) { const t = target(p, r); if (t !== END && t !== null) { const [x, y] = NODES[t]; g.ring(x, y, 28, 'rgba(37,99,235,.7)', 4); } }
    }
    // 말
    const groups = {};
    for (const side of S.pcs) for (const p of side) if (!p.done && p.n >= 0) (groups[p.o + ':' + p.n] = groups[p.o + ':' + p.n] || []).push(p);
    for (const k in groups) { const ps = groups[k], [x, y] = NODES[ps[0].n]; g.circle(x, y, 22, COL[ps[0].o]); g.emoji(TOK[ps[0].o], x, y - 2, 30); if (ps.length > 1) { g.circle(x + 16, y - 16, 11, '#fff'); g.text('×' + ps.length, x + 16, y - 15, 12, '#111'); } }
    // 사이드 패널
    g.text('🎋 윷놀이', 830, 50, 32, '#fde68a');
    [0, 1].forEach((o) => { const home = S.pcs[o].filter((p) => p.n === -1 && !p.done).length, done = S.pcs[o].filter((p) => p.done).length; g.text(`${o ? 'AI' : '나'} ${TOK[o]}  대기 ${home} · 완주 ${done}/4`, 830, 110 + o * 36, 18, o === S.turn ? '#fde047' : '#fef3c7'); });
    for (let i = 0; i < 4; i++) { const x = 735 + i * 60; c.save(); c.translate(x, 260); c.rotate(S.throwT > 0 ? Math.random() - 0.5 : (i - 1.5) * 0.08); g.rrect(-16, -60, 32, 120, 14, S.sticks[i] ? '#fef3c7' : '#92400e', '#5b3a14', 2); if (!S.sticks[i]) for (let k = 0; k < 3; k++) g.text('✕', 0, -30 + k * 30, 14, '#fde68a'); if (i === 3 && S.sticks[i]) g.text('빽', 0, 0, 14, '#b91c1c'); c.restore(); }
    if (S.msg) g.text(S.msg, 830, 355, 26, '#fde047');
    if (S.res.length) { g.text(S.turn === 0 ? '사용할 결과 선택:' : 'AI 결과:', 700, 385, 14, '#e7d3a7', 'left'); S.res.forEach((r, i) => g.button(700 + i * 64, 400, 58, 48, RES[r], i === S.sel && S.turn === 0 ? '#b45309' : '#5b3a14', 16)); }
    if (S.turn === 0 && S.phase === 'move') { const home = S.pcs[0].filter((p) => p.n === -1 && !p.done).length; if (home) g.button(700, 470, 260, 60, `🐎 새 말 내보내기 (대기 ${home})`, '#1d4ed8', 17); g.text('또는 판 위의 내 말을 클릭', 830, 545, 14, '#e7d3a7'); }
    if (S.turn === 0 && S.phase === 'throw') g.button(700, 560, 260, 70, '🎋 윷 던지기!', '#16a34a', 24);
    if (S.turn === 1) g.text('AI 차례...', 830, 600, 20, '#fca5a5');
  },
});
function target(p, r) {
  if (r < 0) { if (p.n === -1) return null; if (p.n === 0) return 19; return BACK[p.n] ?? (p.n - 1 < 0 ? 19 : p.n - 1); }
  const path = pathFrom(p.n); return path[Math.min(r, path.length) - 1];
}
function canMove(p, r) { return !p.done && r !== undefined && target(p, r) !== null; }
function anyMove(o, r) { return S.pcs[o].some((p) => canMove(p, r)); }
function startThrow(g) { S.throwT = 0.6; g.sfx.noise(0.3, 0.08); S.msg = ''; }
function settleThrow(g) {
  const flat = S.sticks.reduce((a, b) => a + b, 0);
  let r = flat === 0 ? 5 : flat; if (flat === 1 && S.sticks[3]) r = -1;
  S.res.push(r); S.msg = RES[r] + (r >= 4 ? '! 한 번 더' : '');
  r >= 4 ? g.sfx.win() : g.sfx.tone(300 + r * 80, 0.1, 'triangle', 0.08);
  if (r >= 4) { S.phase = 'throw'; if (S.turn === 1) S.aiT = 0.8; return; }
  S.phase = 'move'; S.sel = 0;
  checkStuck(g);
  if (S.turn === 1) S.aiT = 0.8;
}
function checkStuck(g) {
  S.res = S.res.filter((r) => anyMove(S.turn, r) || false);
  if (!S.res.length) { S.msg += ' (이동 불가)'; endTurn(g); }
}
function doMove(g, p, r) {
  const t = target(p, r), from = p.n, o = p.o;
  const stack = from === -1 ? [p] : S.pcs[o].filter((q) => !q.done && q.n === from);
  S.res.splice(S.res.indexOf(r), 1); S.sel = 0;
  let capt = false;
  if (t === END) { stack.forEach((q) => { q.done = true; q.n = -2; }); g.sfx.coin(); if (o === 0) g.add(200 * stack.length); }
  else {
    const enemy = S.pcs[1 - o].filter((q) => !q.done && q.n === t);
    if (enemy.length) { enemy.forEach((q) => (q.n = -1)); capt = true; g.sfx.explode(); g.shake(8); S.msg = '잡았다! 한 번 더'; if (o === 0) g.add(150 * enemy.length); }
    stack.forEach((q) => (q.n = t)); if (!capt) g.sfx.tone(500, 0.06, 'square', 0.05);
    const mine = S.pcs[o].filter((q) => !q.done && q.n === t).length; if (mine > stack.length) S.msg = '업었다!';
  }
  if (S.pcs[o].every((q) => q.done)) { S.done = true; if (o === 0) { g.add(3000); g.later(() => g.win('말 4개 모두 완주! 승리'), 1); } else g.later(() => g.over('AI가 먼저 완주했다'), 1); return; }
  if (capt) { S.phase = 'throw'; if (o === 1) S.aiT = 0.8; return; }
  if (S.res.length) { checkStuck(g); if (S.turn === 1) S.aiT = 0.7; return; }
  if (S.phase === 'move') endTurn(g);
}
function endTurn(g) { S.res = []; S.turn = 1 - S.turn; S.phase = 'throw'; S.aiT = 1; }
function aiStep(g) {
  if (S.phase === 'throw') return startThrow(g);
  let best = null, bs = -1e9;
  for (const r of S.res) for (const p of S.pcs[1]) {
    if (!canMove(p, r)) continue;
    const t = target(p, r); let s = 0;
    if (t === END) s += 100;
    else {
      if (S.pcs[0].some((q) => !q.done && q.n === t)) s += 80;
      if ([5, 10, 22].includes(t)) s += 25;
      if (S.pcs[1].some((q) => q !== p && !q.done && q.n === t)) s += 15;
      const danger = S.pcs[0].some((q) => !q.done && q.n >= 0 && [1, 2, 3, 4, 5].some((k) => pathFrom(q.n)[k - 1] === t));
      if (danger) s -= 30;
      s += (p.n === -1 ? 5 : 10) + r;
    }
    s += Math.random() * 4;
    if (s > bs) { bs = s; best = [p, r]; }
  }
  if (!best) return endTurn(g);
  doMove(g, best[0], best[1]);
  S.aiT = 0.8;
}
