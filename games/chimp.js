let S;
const CH_COLS = 8, CH_ROWS = 5, CH_CS = 92, CH_X = 82, CH_Y = 120;
GAME({
  title: '침팬지 테스트', w: 900, h: 640, bg: '#1c1917', controls: 'none',
  help: '화면의 숫자들을 1부터 순서대로 클릭하세요\n1을 누르는 순간 나머지 숫자는 하얀 칸으로 가려져요 — 위치를 기억!\n성공할 때마다 숫자가 하나씩 늘어나요 · 실수 3번이면 끝\n🙈 레벨: 일정 시간이 지나면 자동으로 가려져요 · 침팬지(평균 9개)를 이겨보세요!',
  init(g) {
    S = { n: 4, strikes: 0, phase: 'ready', t: 0.8, cells: [], next: 1, hidden: false, best: 0, streak: 0, res: null, peek: 0, autoHide: 0, wrongCell: null };
  },
  update(g, dt) {
    S.t -= dt;
    if (S.phase === 'ready') { if (S.t <= 0) newRound(g); return; }
    if (S.phase === 'result') {
      if (S.t <= 0) { if (S.strikes >= 3) return g.over(`최고 ${S.best}개 · ${S.best >= 9 ? '침팬지를 이겼어요! 🏆' : '침팬지 평균은 9개 🐒'}`); S.phase = 'ready'; S.t = 0.4; }
      return;
    }
    // play
    if (S.autoHide > 0 && !S.hidden) { S.autoHide -= dt; if (S.autoHide <= 0) { S.hidden = true; g.sfx.pop(); } }
    if (g.mouse.clicked) {
      const cx = Math.floor((g.mouse.x - CH_X) / CH_CS), cy = Math.floor((g.mouse.y - CH_Y) / CH_CS);
      if (cx >= 0 && cx < CH_COLS && cy >= 0 && cy < CH_ROWS) {
        const cell = S.cells.find((c) => c.x === cx && c.y === cy && !c.done);
        if (cell) hit(g, cell);
      }
    }
    g.info = `숫자 ${S.n}개 · 실수 ${S.strikes}/3 · 최고 ${S.best}`;
  },
  draw(g, c) {
    g.text('🐒 침팬지 테스트', 30, 40, 28, '#fbbf24', 'left');
    g.text(`숫자 ${S.n}개`, 450, 40, 26, '#f5f5f4');
    for (let i = 0; i < 3; i++) g.emoji(i < S.strikes ? '❌' : '⬜', 780 + i * 38, 40, 26);
    // 침팬지 비교 바
    const ratio = Math.min(1, S.best / 15);
    g.rrect(250, 72, 400, 12, 6, '#44403c');
    g.rrect(250, 72, Math.max(12, 400 * ratio), 12, 6, S.best >= 9 ? '#22c55e' : '#f59e0b');
    g.emoji('🐒', 250 + 400 * 9 / 15, 78, 26);
    g.text(`최고 ${S.best}`, 670, 78, 15, '#a8a29e', 'left', '600');
    // 그리드 바닥
    for (let y = 0; y < CH_ROWS; y++) for (let x = 0; x < CH_COLS; x++) g.rrect(CH_X + x * CH_CS + 4, CH_Y + y * CH_CS + 4, CH_CS - 8, CH_CS - 8, 12, 'rgba(255,255,255,.03)');
    if (S.phase === 'ready') { g.text(S.n > 4 ? `레벨 업! ${S.n}개` : '준비…', 450, 350, 40, '#fbbf24'); return; }
    for (const cell of S.cells) {
      const x = CH_X + cell.x * CH_CS + 4, y = CH_Y + cell.y * CH_CS + 4, s = CH_CS - 8;
      if (cell.done) { g.rrect(x, y, s, s, 12, 'rgba(34,197,94,.15)'); continue; }
      const reveal = S.phase === 'result';
      if (S.hidden && !reveal) {
        const hov = g.inRect(x, y, s, s);
        g.rrect(x, y, s, s, 12, hov ? '#fafaf9' : '#e7e5e4');
      } else {
        const wrong = S.wrongCell === cell;
        g.rrect(x, y, s, s, 12, wrong ? '#7f1d1d' : reveal ? '#292524' : '#0c0a09', wrong ? '#ef4444' : reveal ? '#78716c' : '#a8a29e', 3);
        g.text(String(cell.v), x + s / 2, y + s / 2 + 2, 44, reveal && cell.v === S.next ? '#facc15' : '#fafaf9');
      }
    }
    if (S.phase === 'result') g.text(S.res ? '성공! 🎉' : '틀렸어요!', 450, 600, 30, S.res ? '#4ade80' : '#f87171');
    else if (!S.hidden) g.text(S.autoHide > 0 ? `🙈 ${S.autoHide.toFixed(1)}초 후 가려져요!` : '1부터 클릭!', 450, 600, 22, '#d6d3d1');
  },
});
function newRound(g) {
  const all = [];
  for (let y = 0; y < CH_ROWS; y++) for (let x = 0; x < CH_COLS; x++) all.push({ x, y });
  U.shuffle(all);
  S.cells = all.slice(0, S.n).map((p, i) => ({ x: p.x, y: p.y, v: i + 1, done: false }));
  S.next = 1; S.hidden = false; S.phase = 'play'; S.wrongCell = null;
  S.autoHide = S.n >= 8 && S.n % 2 === 0 ? Math.max(1.2, 4 - (S.n - 8) * 0.3) : 0;
  S.startT = g.time;
  g.sfx.tone(520, 0.08, 'sine', 0.05);
}
function hit(g, cell) {
  if (cell.v === S.next) {
    cell.done = true; S.next++;
    if (!S.hidden) { S.hidden = true; S.autoHide = 0; }
    g.sfx.tone(400 + cell.v * 40, 0.06, 'triangle', 0.06);
    g.burst(CH_X + cell.x * CH_CS + CH_CS / 2, CH_Y + cell.y * CH_CS + CH_CS / 2, ['#fafaf9', '#facc15'], 10, 180);
    if (S.next > S.n) {
      S.best = Math.max(S.best, S.n);
      const pts = S.n * S.n * 10 + Math.max(0, Math.round((S.n * 1.2 - (g.time - S.startT)) * 15));
      g.add(pts, 450, 560);
      S.res = true; S.phase = 'result'; S.t = 1;
      g.sfx.win(); g.shake(3);
      if (S.n === 9) g.float(450, 300, '🐒 침팬지와 동급!', '#fbbf24', 36);
      if (S.n === 12) g.float(450, 300, '🧠 침팬지를 넘어섰다!', '#4ade80', 36);
      S.n = Math.min(CH_COLS * CH_ROWS, S.n + 1);
    }
  } else {
    S.strikes++; S.res = false; S.phase = 'result'; S.t = 2; S.wrongCell = cell;
    g.sfx.hit(); g.shake(8);
  }
}
