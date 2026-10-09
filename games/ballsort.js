let S;
const BC = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#78716c', '#f97316', '#14b8a6', '#84cc16'];
const CAP = 4;
GAME({
  title: '공 정렬', w: 900, h: 760, bg: '#1e1b2e', controls: 'none',
  help: '시험관을 클릭해서 맨 위 공을 집고, 다른 시험관을 클릭해 옮기기\n같은 색 위나 빈 시험관에만 놓을 수 있어요 (한 관에 4개)\n모든 시험관을 한 가지 색으로 채우면 클리어!\n↶ 되돌리기 · ➕ 빈 시험관 추가(1회)',
  init(g) { S = { lvl: 0 }; next(); },
  update(g, dt) {
    if (S.done > 0) { S.done -= dt; if (S.done <= 0) next(); return; }
    if (g.clickIn(40, 680, 140, 50)) return undo(g);
    if (g.clickIn(200, 680, 160, 50)) { if (!S.extra) { S.extra = true; S.tubes.push([]); layout(); g.sfx.power(); } return; }
    if (g.clickIn(720, 680, 140, 50)) { restart(); g.sfx.click(); return; }
    if (!g.mouse.clicked) return;
    const i = S.pos.findIndex(([x, y]) => g.inRect(x - 36, y - 20, 72, CAP * 58 + 60));
    if (i < 0) { S.sel = -1; return; }
    if (S.sel < 0) { if (S.tubes[i].length) { S.sel = i; g.sfx.click(); } return; }
    if (i === S.sel) { S.sel = -1; return; }
    const from = S.tubes[S.sel], to = S.tubes[i], top = from[from.length - 1];
    if (to.length < CAP && (!to.length || to[to.length - 1] === top)) {
      S.hist.push(S.tubes.map((t) => t.slice()));
      let n = 0; while (from.length && from[from.length - 1] === top && to.length < CAP) { to.push(from.pop()); n++; }
      S.moves++; g.sfx.tone(500, 0.06, 'sine', 0.06);
      if (to.length === CAP && to.every((b) => b === to[0])) { g.sfx.coin(); const [x, y] = S.pos[i]; g.burst(x, y, BC[to[0]], 20); }
      if (S.tubes.every((t) => !t.length || (t.length === CAP && t.every((b) => b === t[0])))) { const pts = Math.max(200, S.colors * 200 - S.moves * 5); g.add(pts); g.sfx.win(); S.done = 1.5; }
    } else g.sfx.hit();
    S.sel = -1;
    g.info = `레벨 ${S.lvl} · 이동 ${S.moves}`;
  },
  draw(g, c) {
    g.text(`레벨 ${S.lvl}`, 450, 40, 30, '#fff');
    S.tubes.forEach((t, i) => {
      const [x, y] = S.pos[i], h = CAP * 58 + 24;
      g.rrect(x - 34, y, 68, h, 30, 'rgba(255,255,255,.08)', '#c4b5fd', 3);
      t.forEach((b, k) => { let by = y + h - 40 - k * 58; if (i === S.sel && k === t.length - 1) by = y - 50; g.circle(x, by, 25, BC[b]); g.circle(x - 8, by - 9, 7, 'rgba(255,255,255,.4)'); });
      if (t.length === CAP && t.every((b) => b === t[0])) g.emoji('✅', x, y + h + 20, 22);
    });
    g.button(40, 680, 140, 50, `↶ 되돌리기`, S.hist.length ? '#6d28d9' : '#3f3a5a', 17);
    g.button(200, 680, 160, 50, S.extra ? '➕ 사용함' : '➕ 시험관 추가', S.extra ? '#3f3a5a' : '#0d9488', 17);
    g.button(720, 680, 140, 50, '⟲ 다시', '#475569', 17);
    if (S.done > 0) g.text('🎉 정렬 완료!', 450, 380, 56, '#fde047');
  },
});
function layout() { const n = S.tubes.length, perRow = Math.ceil(n / (n > 8 ? 2 : 1)); S.pos = S.tubes.map((_, i) => { const r = Math.floor(i / perRow), k = i % perRow, cnt = Math.min(perRow, n - r * perRow); return [450 - ((cnt - 1) * 92) / 2 + k * 92, n > 8 ? 90 + r * 300 : 220]; }); }
function next() {
  S.lvl++; S.colors = Math.min(12, 3 + S.lvl);
  const balls = []; for (let c = 0; c < S.colors; c++) for (let k = 0; k < CAP; k++) balls.push(c);
  do { U.shuffle(balls); } while (balls.slice(0, CAP).every((b) => b === balls[0]));
  S.start = []; for (let i = 0; i < S.colors; i++) S.start.push(balls.slice(i * CAP, i * CAP + CAP)); S.start.push([], []);
  restart();
}
function restart() { S.tubes = S.start.map((t) => t.slice()); S.hist = []; S.moves = 0; S.sel = -1; S.done = 0; S.extra = false; layout(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.tubes = h; if (S.tubes.length !== S.pos.length) layout(); g.sfx.click(); }
