let S;
const FC = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
GAME({
  title: '컬러 플러드', w: 760, h: 800, bg: '#0f172a', controls: 'none',
  help: '아래 색 버튼(또는 1~6 키)을 눌러 왼쪽 위 영역의 색을 바꿔요\n같은 색의 이웃 칸들이 영역에 합쳐져요\n제한 횟수 안에 판 전체를 한 색으로!\n남은 횟수가 많을수록 고득점 · 단계마다 판이 커짐',
  init(g) { S = { lvl: 0 }; next(); },
  update(g, dt) {
    S.wave = Math.max(0, S.wave - dt * 2);
    if (S.done > 0) { S.done -= dt; if (S.done <= 0) { if (S.fail) return g.over(`레벨 ${S.lvl}`); next(); } return; }
    let pick = -1;
    for (let i = 0; i < 6; i++) { if (g.keyp('Digit' + (i + 1))) pick = i; if (g.clickIn(70 + i * 105, 700, 90, 70)) pick = i; }
    if (g.mouse.clicked && pick < 0) { const cs = 600 / S.n, x = Math.floor((g.mouse.x - 80) / cs), y = Math.floor((g.mouse.y - 80) / cs); if (x >= 0 && y >= 0 && x < S.n && y < S.n) pick = S.b[y][x]; }
    if (pick >= 0 && pick !== S.b[0][0]) {
      S.moves++; fill(pick); S.wave = 1; g.sfx.tone(300 + pick * 60, 0.08, 'triangle', 0.06);
      if (S.b.every((r) => r.every((v) => v === pick))) { const pts = 300 + (S.max - S.moves) * 100 + S.n * 20; g.add(pts); g.sfx.win(); S.done = 1.5; S.msg = `완성! +${pts}`; }
      else if (S.moves >= S.max) { S.fail = true; S.done = 1.5; S.msg = '횟수 초과!'; g.sfx.lose(); }
    }
    g.info = `레벨 ${S.lvl} · ${S.moves}/${S.max}`;
  },
  draw(g, c) {
    g.text(`레벨 ${S.lvl} · ${S.n}×${S.n}`, 80, 40, 24, '#fff', 'left');
    g.text(`${S.moves} / ${S.max}`, 680, 40, 30, S.max - S.moves <= 3 ? '#f87171' : '#fde047', 'right');
    const cs = 600 / S.n;
    for (let y = 0; y < S.n; y++) for (let x = 0; x < S.n; x++) g.rect(80 + x * cs, 80 + y * cs, cs + 0.5, cs + 0.5, FC[S.b[y][x]]);
    if (S.wave > 0) { c.globalAlpha = S.wave * 0.3; for (const k of S.region) { const x = k % S.n, y = Math.floor(k / S.n); g.rect(80 + x * cs, 80 + y * cs, cs, cs, '#fff'); } c.globalAlpha = 1; }
    g.stroke(80, 80, 600, 600, '#fff', 3);
    for (let i = 0; i < 6; i++) g.rrect(70 + i * 105, 700, 90, 70, 14, FC[i], i === S.b[0][0] ? '#fff' : 'rgba(0,0,0,.3)', i === S.b[0][0] ? 5 : 2) || g.text(i + 1, 115 + i * 105, 735, 22, 'rgba(255,255,255,.8)');
    if (S.done > 0) g.text(S.msg, 380, 380, 52, '#fff');
  },
});
function region() { const n = S.n, c0 = S.b[0][0], seen = new Set([0]), st = [0]; while (st.length) { const k = st.pop(), x = k % n, y = Math.floor(k / n); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, kk = b * n + a; if (a >= 0 && b >= 0 && a < n && b < n && !seen.has(kk) && S.b[b][a] === c0) { seen.add(kk); st.push(kk); } } } return seen; }
function fill(c) { for (const k of region()) S.b[Math.floor(k / S.n)][k % S.n] = c; S.region = region(); }
function next() { S.lvl++; S.n = Math.min(22, 8 + S.lvl * 2); S.b = U.grid(S.n, S.n, () => U.randi(6)); S.moves = 0; S.max = Math.floor(S.n * 1.75) + 1; S.done = 0; S.fail = false; S.region = region(); S.wave = 0; }
