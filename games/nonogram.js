let S;
const PICS = [
  ['하트', ['0110110', '1111111', '1111111', '1111111', '0111110', '0011100', '0001000']],
  ['집', ['0001000', '0011100', '0111110', '1111111', '0100010', '0101010', '0111110']],
  ['고양이', ['1000001', '1100011', '1111111', '1011101', '1111111', '0111110', '0011100']],
  ['나무', ['0011100', '0111110', '1111111', '0111110', '0011100', '0001000', '0011100']],
  ['우산', ['0011100', '0111110', '1111111', '0001000', '0001000', '0101000', '0011000']],
  ['별', ['0001000', '0011100', '1111111', '0111110', '0011100', '0110110', '1100011']],
  ['오리', ['0110000', '1111000', '0110000', '0111111', '0111110', '0011100', '0000000']],
  ['로켓', ['0000100000', '0001110000', '0001110000', '0011111000', '0011011000', '0011111000', '0011111000', '0111111100', '1101110110', '1000100010']],
  ['스마일', ['0011111100', '0100000010', '1001001001', '1000000001', '1000000001', '1010000101', '1001111001', '0100000010', '0011111100', '0000000000']],
  ['자동차', ['0000000000', '0011111000', '0110001100', '1111111111', '1111111111', '1011111101', '0100000010', '0000000000', '0000000000', '0000000000']],
];
GAME({
  title: '노노그램', w: 900, h: 760, bg: '#f5f5f4', controls: 'none',
  help: '줄 옆의 숫자 = 그 줄에 연속으로 칠해진 칸 묶음 크기\n좌클릭 = 칠하기 · 우클릭(또는 ✕모드) = X 표시 · 드래그로 연속 입력\n틀린 칸을 칠하면 ❤️ 감소 (3개)\n10개의 그림을 완성하라!',
  init(g) { S = { idx: 0, lives: 3 }; load(); },
  update(g, dt) {
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { S.idx++; if (S.idx >= PICS.length) return g.win('모든 그림 완성!'); load(); } return; }
    S.time += dt;
    if (g.clickIn(700, 40, 160, 44)) { S.xmode = !S.xmode; g.sfx.click(); return; }
    const { cs, ox, oy, n, m } = S;
    const cx = Math.floor((g.mouse.x - ox) / cs), cy = Math.floor((g.mouse.y - oy) / cs), inB = cx >= 0 && cy >= 0 && cx < m && cy < n;
    if ((g.mouse.clicked || g.mouse.rclick) && inB) S.paint = g.mouse.rclick || S.xmode ? 2 : 1;
    if (!g.mouse.down) S.paint = 0;
    if (S.paint && inB && S.cur[cy][cx] === 0) {
      const want = S.paint;
      if (want === 1) { if (S.sol[cy][cx]) { S.cur[cy][cx] = 1; g.sfx.tone(500, 0.04, 'triangle', 0.05); } else { S.cur[cy][cx] = 3; S.lives--; g.sfx.hit(); g.shake(5); S.paint = 0; if (S.lives <= 0) return g.over(`그림 ${S.idx}개 완성`); } }
      else { S.cur[cy][cx] = 2; g.sfx.click(); }
      if (S.sol.every((r, y) => r.every((v, x) => !v || S.cur[y][x] === 1))) { const pts = Math.max(300, n * m * 20 - Math.floor(S.time) * 2); g.add(pts); g.sfx.win(); S.clear = 2; for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) if (!S.sol[y][x]) S.cur[y][x] = 0; }
    }
    g.info = `${S.idx + 1}/${PICS.length} · ${'❤️'.repeat(S.lives)}`;
  },
  draw(g, c) {
    const { cs, ox, oy, n, m } = S;
    g.text(`그림 ${S.idx + 1} / ${PICS.length}` + (S.clear > 0 ? ` — "${PICS[S.idx][0]}"` : ''), 40, 60, 28, '#1c1917', 'left');
    g.text('❤️'.repeat(S.lives) + '🤍'.repeat(3 - S.lives), 40, 100, 22, '#000', 'left');
    g.button(700, 40, 160, 44, S.xmode ? '✕ 모드' : '■ 칠하기 모드', S.xmode ? '#dc2626' : '#1c1917', 16);
    for (let y = 0; y < n; y++) { const done = S.sol[y].every((v, x) => !v || S.cur[y][x] === 1); S.rh[y].forEach((v, i, a) => g.text(v, ox - 12 - (a.length - 1 - i) * 26, oy + y * cs + cs / 2, 18, done ? '#a8a29e' : '#1c1917', 'right')); }
    for (let x = 0; x < m; x++) { const done = S.sol.every((r, y) => !r[x] || S.cur[y][x] === 1); S.ch[x].forEach((v, i, a) => g.text(v, ox + x * cs + cs / 2, oy - 14 - (a.length - 1 - i) * 24, 18, done ? '#a8a29e' : '#1c1917')); }
    for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
      const v = S.cur[y][x], px = ox + x * cs, py = oy + y * cs;
      g.rect(px, py, cs, cs, v === 1 ? (S.clear > 0 ? `hsl(${(S.idx * 40) % 360},70%,45%)` : '#1c1917') : '#fff');
      g.stroke(px, py, cs, cs, '#d6d3d1', 1);
      if (v === 2 || v === 3) { g.line(px + 8, py + 8, px + cs - 8, py + cs - 8, v === 3 ? '#dc2626' : '#a8a29e', 2); g.line(px + cs - 8, py + 8, px + 8, py + cs - 8, v === 3 ? '#dc2626' : '#a8a29e', 2); }
    }
    for (let i = 0; i <= m; i += 5) g.line(ox + i * cs, oy, ox + i * cs, oy + n * cs, '#1c1917', 2);
    for (let i = 0; i <= n; i += 5) g.line(ox, oy + i * cs, ox + m * cs, oy + i * cs, '#1c1917', 2);
    g.stroke(ox, oy, m * cs, n * cs, '#1c1917', 3);
  },
});
function hints(arr) { const r = []; let k = 0; for (const v of arr) { if (v) k++; else if (k) { r.push(k); k = 0; } } if (k) r.push(k); return r.length ? r : [0]; }
function load() {
  const P = PICS[S.idx][1];
  S.sol = P.map((r) => [...r].map(Number)); S.n = S.sol.length; S.m = S.sol[0].length;
  S.cur = U.grid(S.m, S.n, 0);
  S.rh = S.sol.map(hints); S.ch = S.sol[0].map((_, x) => hints(S.sol.map((r) => r[x])));
  const maxR = Math.max(...S.rh.map((h) => h.length)), maxC = Math.max(...S.ch.map((h) => h.length));
  S.cs = Math.floor(Math.min((860 - maxR * 26 - 40) / S.m, (600 - maxC * 24) / S.n, 64));
  S.ox = 40 + maxR * 26 + 20; S.oy = 150 + maxC * 24;
  S.time = 0; S.clear = 0; S.paint = 0;
}
