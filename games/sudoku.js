let S;
const CS = 62, OX = 30, OY = 60;
const DIFF = [['쉬움', 38], ['보통', 47], ['어려움', 54]];
GAME({
  title: '스도쿠', w: 900, h: 680, bg: '#f8fafc', controls: 'none',
  help: '칸을 클릭하고 숫자 버튼(또는 키보드 1~9)으로 입력\n✏️ 메모 모드로 후보 숫자 적기 · 💡 힌트 3회\n실수 3번이면 게임 오버 · 방향키로 칸 이동\n각 행·열·3×3 상자에 1~9가 한 번씩!',
  init(g) { S = { d: S?.d ?? 0 }; newPuzzle(); },
  update(g, dt) {
    if (!S.done) S.time += dt;
    const m = g.mouse;
    if (m.clicked) {
      const cx = Math.floor((m.x - OX) / CS), cy = Math.floor((m.y - OY) / CS);
      if (cx >= 0 && cy >= 0 && cx < 9 && cy < 9) { S.sel = [cx, cy]; g.sfx.click(); }
      for (let i = 0; i < 9; i++) if (g.inRect(640 + (i % 3) * 78, 200 + Math.floor(i / 3) * 78, 70, 70)) input(g, i + 1);
      if (g.inRect(640, 440, 110, 52)) { S.memo = !S.memo; g.sfx.click(); }
      if (g.inRect(758, 440, 110, 52)) input(g, 0);
      if (g.inRect(640, 500, 228, 52)) hint(g);
      DIFF.forEach((d, i) => { if (g.inRect(640 + i * 78, 600, 72, 44)) { S.d = i; newPuzzle(); g.sfx.click(); } });
    }
    for (let i = 1; i <= 9; i++) if (g.keyp('Digit' + i) || g.keyp('Numpad' + i)) input(g, i);
    if (g.keyp('Backspace') || g.keyp('Delete') || g.keyp('Digit0')) input(g, 0);
    if (g.keyp('KeyN') || g.keyp('KeyM')) S.memo = !S.memo;
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k) && S.sel) S.sel = [(S.sel[0] + D[k][0] + 9) % 9, (S.sel[1] + D[k][1] + 9) % 9];
    g.info = `${DIFF[S.d][0]} · ❌${S.miss}/3 · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    const sel = S.sel, sv = sel ? S.cur[sel[1]][sel[0]] : 0;
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const px = OX + x * CS, py = OY + y * CS, v = S.cur[y][x];
      let bg = '#fff';
      if (sel && (sel[0] === x || sel[1] === y || (Math.floor(sel[0] / 3) === Math.floor(x / 3) && Math.floor(sel[1] / 3) === Math.floor(y / 3)))) bg = '#e0e7ff';
      if (sv && v === sv) bg = '#c7d2fe';
      if (sel && sel[0] === x && sel[1] === y) bg = '#a5b4fc';
      if (S.err[y][x]) bg = '#fecaca';
      g.rect(px, py, CS, CS, bg); g.stroke(px, py, CS, CS, '#cbd5e1', 1);
      if (v) g.text(v, px + CS / 2, py + CS / 2 + 2, 34, S.given[y][x] ? '#0f172a' : S.err[y][x] ? '#dc2626' : '#4f46e5', 'center', S.given[y][x] ? 'bold' : '600');
      else for (const n of S.notes[y][x]) g.text(n, px + 12 + ((n - 1) % 3) * 19, py + 12 + Math.floor((n - 1) / 3) * 19, 13, '#64748b', 'center', 'normal');
    }
    for (let i = 0; i <= 3; i++) { g.line(OX + i * CS * 3, OY, OX + i * CS * 3, OY + CS * 9, '#0f172a', 3); g.line(OX, OY + i * CS * 3, OX + CS * 9, OY + i * CS * 3, '#0f172a', 3); }
    g.text(`스도쿠 · ${DIFF[S.d][0]}`, 640, 80, 28, '#0f172a', 'left');
    g.text(`⏱️ ${U.fmtTime(S.time)}   ❌ ${S.miss}/3`, 640, 130, 20, '#334155', 'left');
    for (let i = 0; i < 9; i++) { const cnt = S.cur.flat().filter((v) => v === i + 1).length; g.button(640 + (i % 3) * 78, 200 + Math.floor(i / 3) * 78, 70, 70, String(i + 1), cnt >= 9 ? '#cbd5e1' : '#4f46e5', 30); }
    g.button(640, 440, 110, 52, S.memo ? '✏️ 메모 ON' : '✏️ 메모', S.memo ? '#f59e0b' : '#64748b', 17);
    g.button(758, 440, 110, 52, '⌫ 지우기', '#64748b', 17);
    g.button(640, 500, 228, 52, `💡 힌트 (${S.hints})`, S.hints ? '#16a34a' : '#cbd5e1', 18);
    g.text('새 게임', 640, 585, 15, '#475569', 'left');
    DIFF.forEach((d, i) => g.button(640 + i * 78, 600, 72, 44, d[0], i === S.d ? '#0f172a' : '#94a3b8', 15));
  },
});
function input(g, n) {
  if (!S.sel || S.done) return;
  const [x, y] = S.sel;
  if (S.given[y][x]) return;
  if (n === 0) { S.cur[y][x] = 0; S.notes[y][x] = []; S.err[y][x] = false; return; }
  if (S.memo) { const a = S.notes[y][x], i = a.indexOf(n); i >= 0 ? a.splice(i, 1) : a.push(n); g.sfx.click(); return; }
  S.cur[y][x] = n; S.notes[y][x] = [];
  if (S.sol[y][x] !== n) { S.err[y][x] = true; S.miss++; g.sfx.hit(); g.shake(4); if (S.miss >= 3) { S.done = true; return g.over('실수 3번!'); } }
  else {
    S.err[y][x] = false; g.sfx.tone(500 + n * 40, 0.06, 'sine', 0.06);
    for (let i = 0; i < 9; i++) { S.notes[y][i] = S.notes[y][i].filter((v) => v !== n); S.notes[i][x] = S.notes[i][x].filter((v) => v !== n); }
    if (S.cur.every((r, yy) => r.every((v, xx) => v === S.sol[yy][xx]))) { S.done = true; g.add(Math.max(1000, [3000, 6000, 10000][S.d] - Math.floor(S.time) * 3) - S.miss * 300); g.later(() => g.win(`${DIFF[S.d][0]} 클리어 · ${U.fmtTime(S.time)}`), 0.4); }
  }
}
function hint(g) {
  if (!S.hints || S.done) return;
  let tgt = S.sel && !S.given[S.sel[1]][S.sel[0]] && S.cur[S.sel[1]][S.sel[0]] !== S.sol[S.sel[1]][S.sel[0]] ? S.sel : null;
  if (!tgt) { const e = []; for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (S.cur[y][x] !== S.sol[y][x]) e.push([x, y]); if (!e.length) return; tgt = U.choice(e); }
  S.hints--; S.sel = tgt; const memo = S.memo; S.memo = false; input(g, S.sol[tgt[1]][tgt[0]]); S.memo = memo; S.given[tgt[1]][tgt[0]] = true; g.sfx.power();
}
function newPuzzle() {
  const sol = U.grid(9, 9, 0);
  const ok = (b, x, y, n) => { for (let i = 0; i < 9; i++) if (b[y][i] === n || b[i][x] === n) return false; const bx = x - (x % 3), by = y - (y % 3); for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (b[by + j][bx + i] === n) return false; return true; };
  const fill = (b, k = 0) => { if (k === 81) return true; const x = k % 9, y = Math.floor(k / 9); for (const n of U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (ok(b, x, y, n)) { b[y][x] = n; if (fill(b, k + 1)) return true; } b[y][x] = 0; return false; };
  fill(sol);
  const count = (b, lim) => { let c = 0; const rec = () => { if (c >= lim) return; for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (!b[y][x]) { for (let n = 1; n <= 9; n++) if (ok(b, x, y, n)) { b[y][x] = n; rec(); b[y][x] = 0; } return; } c++; }; rec(); return c; };
  const puz = sol.map((r) => r.slice());
  let removed = 0; const cells = U.shuffle([...Array(81).keys()]);
  for (const k of cells) { if (removed >= DIFF[S.d][1]) break; const x = k % 9, y = Math.floor(k / 9), v = puz[y][x]; puz[y][x] = 0; if (count(puz.map((r) => r.slice()), 2) !== 1) puz[y][x] = v; else removed++; }
  S.sol = sol; S.cur = puz.map((r) => r.slice()); S.given = puz.map((r) => r.map((v) => !!v)); S.notes = U.grid(9, 9, () => []); S.err = U.grid(9, 9, false);
  S.sel = null; S.memo = false; S.hints = 3; S.miss = 0; S.time = 0; S.done = false;
}
