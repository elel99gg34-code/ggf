let S;
// 비나이로 (Takuzu): 각 줄에 0과 1이 같은 개수, 같은 숫자 3연속 금지, 같은 줄 중복 금지
const BN_DIFF = [
  { n: 6, name: '쉬움', extra: 0.25, uniq: false, col: '#22c55e' },
  { n: 8, name: '보통', extra: 0.1, uniq: false, col: '#3b82f6' },
  { n: 10, name: '어려움', extra: 0, uniq: true, col: '#f97316' },
  { n: 12, name: '전문가', extra: 0, uniq: true, col: '#dc2626' },
];
const BN_SET = 5; // 한 세트 퍼즐 수
const BN_PAT = {}; // n -> 유효 줄 패턴(bitmask) 목록
const BN_PX = 340, BN_PY = 340, BN_AREA = 600;
GAME({
  title: '비나이로', w: 960, h: 680, bg: '#eef2f7', controls: 'none',
  help: '빈 칸을 클릭: 빈칸 → 0 → 1 → 빈칸 (우클릭은 반대 순서)\n규칙: ① 같은 숫자가 3개 연속 금지 ② 각 줄의 0과 1 개수는 같음 ③ 똑같은 행/열은 2개 이상 금지\n방향키로 커서 이동 · 0/1 키로 입력 · Space 순환 · Backspace 지우기\nU 또는 X = 되돌리기 · H = 힌트 · 한 세트 5문제를 풀면 클리어!',
  init(g) {
    S = { mode: 'select', d: 1, cur: [0, 0], solved: 0, hover: -1, flash: [], msg: '', msgT: 0, stats: g.load('stats', [0, 0, 0, 0]) };
  },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    for (const f of S.flash) f.t -= dt;
    S.flash = S.flash.filter((f) => f.t > 0);
    if (S.mode === 'select') {
      BN_DIFF.forEach((d, i) => { if (g.clickIn(280, 200 + i * 100, 400, 80)) { S.d = i; S.solved = 0; newBoard(g); g.sfx.click(); } });
      for (let i = 0; i < 4; i++) if (g.keyp('Digit' + (i + 1))) { S.d = i; S.solved = 0; newBoard(g); }
      g.info = '난이도를 고르세요';
      return;
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        if (S.solved >= BN_SET) return g.win(`${BN_DIFF[S.d].name} 세트 ${BN_SET}문제 완료!`);
        newBoard(g);
      }
      return;
    }
    S.time += dt;
    const n = S.n, cs = S.cs, ox = S.ox, oy = S.oy;
    const cx = Math.floor((m.x - ox) / cs), cy = Math.floor((m.y - oy) / cs);
    const inB = m.x >= ox && m.y >= oy && cx < n && cy < n;
    if (inB && (m.clicked || m.rclick)) { S.cur = [cx, cy]; cycle(g, cx, cy, m.rclick ? -1 : 1); }
    if (m.clicked) {
      if (g.inRect(700, 330, 230, 50)) undo(g);
      if (g.inRect(700, 390, 230, 50)) hint(g);
      if (g.inRect(700, 450, 230, 50)) { check(g, true); }
      if (g.inRect(700, 510, 230, 50)) { pushUndo(); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!S.given[y][x]) S.grid[y][x] = -1; g.sfx.drop(); }
      if (g.inRect(700, 590, 110, 44)) { S.mode = 'select'; g.sfx.click(); }
      if (g.inRect(820, 590, 110, 44)) { g.add(-50); newBoard(g); }
    }
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) { S.cur = [(S.cur[0] + D[k][0] + n) % n, (S.cur[1] + D[k][1] + n) % n]; g.sfx.tone(700, 0.02, 'sine', 0.03); }
    const [kx, ky] = S.cur;
    if (g.keyp('Digit0') || g.keyp('Numpad0')) setCell(g, kx, ky, 0);
    if (g.keyp('Digit1') || g.keyp('Numpad1')) setCell(g, kx, ky, 1);
    if (g.keyp('Space') || g.keyp('Enter')) cycle(g, kx, ky, 1);
    if (g.keyp('Backspace') || g.keyp('Delete')) setCell(g, kx, ky, -1);
    if (g.keyp('KeyU') || g.pressed('b')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    const filled = S.grid.reduce((a, r) => a + r.filter((v) => v >= 0).length, 0);
    g.info = `${BN_DIFF[S.d].name} ${n}×${n} · 퍼즐 ${S.solved + 1}/${BN_SET} · ${Math.round((filled / (n * n)) * 100)}% · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('0️⃣ 비나이로', 480, 80, 48, '#1e293b');
      g.text('0과 1로 판을 채우세요 — 3연속 금지 · 개수 균형 · 중복 줄 금지', 480, 140, 18, '#475569', 'center', '600');
      BN_DIFF.forEach((d, i) => {
        g.button(280, 200 + i * 100, 400, 80, `${i + 1}. ${d.name}  (${d.n}×${d.n})`, d.col, 26);
        g.text(`해결 ${S.stats[i] || 0}개`, 700, 240 + i * 100, 16, '#64748b', 'left', '600');
      });
      return;
    }
    const n = S.n, cs = S.cs, ox = S.ox, oy = S.oy;
    g.rrect(ox - 10, oy - 10, cs * n + 20, cs * n + 20, 14, '#1e293b');
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = S.grid[y][x], px = ox + x * cs, py = oy + y * cs, giv = S.given[y][x];
      let bg = '#f8fafc';
      if (v === 0) bg = giv ? '#1d4ed8' : '#60a5fa';
      if (v === 1) bg = giv ? '#c2410c' : '#fb923c';
      g.rrect(px + 2, py + 2, cs - 4, cs - 4, 6, bg);
      if (S.err[y][x]) g.rrect(px + 2, py + 2, cs - 4, cs - 4, 6, null, '#ef4444', 4);
      if (v >= 0) g.text(String(v), px + cs / 2, py + cs / 2 + 2, cs * 0.5, giv ? '#fff' : '#fffbeb', 'center', giv ? 'bold' : '600');
      if (giv) g.circle(px + cs - 9, py + 9, 3, 'rgba(255,255,255,.7)');
    }
    for (const f of S.flash) g.rrect(ox + f.x * cs + 1, oy + f.y * cs + 1, cs - 2, cs - 2, 6, null, f.c, 4 * Math.min(1, f.t * 2) + 1);
    // 커서
    g.rrect(ox + S.cur[0] * cs, oy + S.cur[1] * cs, cs, cs, 8, null, '#facc15', 3);
    // 줄 개수 표시
    for (let i = 0; i < n; i++) {
      const r = count(S.grid[i]), col = S.grid.map((row) => row[i]), cc = count(col);
      g.text(`${r[0]}·${r[1]}`, ox + n * cs + 30, oy + i * cs + cs / 2, 12, r[0] > n / 2 || r[1] > n / 2 ? '#dc2626' : '#64748b', 'center', '600');
      g.text(`${cc[0]}·${cc[1]}`, ox + i * cs + cs / 2, oy + n * cs + 22, 12, cc[0] > n / 2 || cc[1] > n / 2 ? '#dc2626' : '#64748b', 'center', '600');
    }
    // 패널
    g.rrect(690, 20, 250, 640, 16, '#fff', '#cbd5e1');
    g.text('비나이로', 815, 55, 28, '#1e293b');
    g.text(`${BN_DIFF[S.d].name} · ${n}×${n}`, 815, 92, 18, BN_DIFF[S.d].col);
    g.text(`퍼즐 ${S.solved + 1} / ${BN_SET}`, 815, 125, 18, '#334155');
    g.text(`⏱️ ${U.fmtTime(S.time)}   💡 ${S.hintsUsed}`, 815, 157, 18, '#334155', 'center', '600');
    const rules = ['① 같은 숫자 3연속 ✕', '② 각 줄 0과 1 개수 같게', '③ 같은 모양 줄 ✕'];
    rules.forEach((r, i) => g.text(r, 710, 205 + i * 30, 15, '#475569', 'left', '600'));
    g.text('0 / 1 키, 클릭으로 입력', 815, 300, 13, '#94a3b8', 'center', '600');
    g.button(700, 330, 230, 50, `↶ 되돌리기 (${S.undo.length})`, '#64748b', 18);
    g.button(700, 390, 230, 50, '💡 힌트', '#16a34a', 18);
    g.button(700, 450, 230, 50, '✔ 검사', '#2563eb', 18);
    g.button(700, 510, 230, 50, '🧹 모두 지우기', '#94a3b8', 18);
    g.button(700, 590, 110, 44, '난이도', '#475569', 16);
    g.button(820, 590, 110, 44, '새 퍼즐', '#475569', 16);
    if (S.msgT > 0) { g.rrect(ox, 8, n * cs, 0, 0); g.rrect(170, 300, 340, 60, 14, 'rgba(15,23,42,.85)'); g.text(S.msg, 340, 330, 20, '#fff'); }
    if (S.clear > 0) {
      c.globalAlpha = Math.min(1, (1.8 - S.clear) * 3);
      g.rrect(140, 270, 400, 120, 20, 'rgba(22,163,74,.92)');
      g.text('🎉 완성!', 340, 310, 36, '#fff');
      g.text(`+${S.lastPts}점`, 340, 355, 22, '#fef9c3');
      c.globalAlpha = 1;
    }
  },
});

function patterns(n) {
  if (BN_PAT[n]) return BN_PAT[n];
  const out = [];
  for (let p = 0; p < 1 << n; p++) {
    let ones = 0, ok = true;
    for (let i = 0; i < n; i++) {
      const b = (p >> i) & 1; ones += b;
      if (i >= 2 && b === ((p >> (i - 1)) & 1) && b === ((p >> (i - 2)) & 1)) { ok = false; break; }
    }
    if (ok && ones === n / 2) out.push(p);
  }
  return (BN_PAT[n] = out);
}
// 전체 정답 생성 (행 단위 백트래킹)
function genSolution(n) {
  const pats = patterns(n);
  for (let tries = 0; tries < 50; tries++) {
    const rows = [], used = new Set();
    let nodes = 0;
    const colOk = () => {
      const k = rows.length;
      for (let x = 0; x < n; x++) {
        let ones = 0;
        for (let y = 0; y < k; y++) ones += (rows[y] >> x) & 1;
        if (ones > n / 2 || k - ones > n / 2) return false;
        if (k >= 3) { const a = (rows[k - 1] >> x) & 1, b = (rows[k - 2] >> x) & 1, c = (rows[k - 3] >> x) & 1; if (a === b && b === c) return false; }
      }
      return true;
    };
    const rec = () => {
      if (++nodes > 20000) return false;
      if (rows.length === n) {
        const cols = new Set();
        for (let x = 0; x < n; x++) { let v = 0; for (let y = 0; y < n; y++) v |= ((rows[y] >> x) & 1) << y; cols.add(v); }
        return cols.size === n;
      }
      const cand = U.shuffle(pats.slice());
      for (const p of cand) {
        if (used.has(p)) continue;
        rows.push(p); used.add(p);
        if (colOk() && rec()) return true;
        rows.pop(); used.delete(p);
      }
      return false;
    };
    if (rec()) return rows.map((r) => Array.from({ length: n }, (_, x) => (r >> x) & 1));
  }
  return null;
}
// 논리 풀이기: 각 줄마다 가능한 패턴을 걸러 모든 후보가 일치하는 칸을 확정
function lineMasks(grid, n, isRow, i) {
  let known = 0, val = 0;
  for (let k = 0; k < n; k++) {
    const v = isRow ? grid[i][k] : grid[k][i];
    if (v >= 0) { known |= 1 << k; if (v) val |= 1 << k; }
  }
  return [known, val];
}
function logicStep(grid, n, uniq, onlyOne) {
  const pats = patterns(n), full = (1 << n) - 1;
  let changed = false;
  for (let dir = 0; dir < 2; dir++) {
    const isRow = dir === 0;
    const done = [];
    if (uniq) for (let i = 0; i < n; i++) { const [k, v] = lineMasks(grid, n, isRow, i); if (k === full) done.push(v); }
    for (let i = 0; i < n; i++) {
      const [known, val] = lineMasks(grid, n, isRow, i);
      if (known === full) continue;
      let andP = full, andN = full, cnt = 0;
      for (const p of pats) {
        if (((p ^ val) & known) !== 0) continue;
        if (uniq && done.includes(p)) continue;
        andP &= p; andN &= ~p & full; cnt++;
      }
      if (!cnt) return -1; // 모순
      const fix = (andP | andN) & ~known;
      if (fix) {
        for (let k = 0; k < n; k++) if (fix & (1 << k)) {
          const v = (andP >> k) & 1;
          if (isRow) grid[i][k] = v; else grid[k][i] = v;
          if (onlyOne) return isRow ? { x: k, y: i, v } : { x: i, y: k, v };
        }
        changed = true;
      }
    }
  }
  return changed ? 1 : 0;
}
function logicSolve(grid, n, uniq) {
  const g2 = grid.map((r) => r.slice());
  for (let it = 0; it < 200; it++) { const r = logicStep(g2, n, uniq, false); if (r <= 0) break; }
  return g2.every((r) => r.every((v) => v >= 0)) ? g2 : null;
}
function newBoard(g) {
  const D = BN_DIFF[S.d], n = D.n;
  const sol = genSolution(n);
  const puz = sol.map((r) => r.slice());
  const cells = U.shuffle(Array.from({ length: n * n }, (_, i) => i));
  const removed = [];
  for (const id of cells) {
    const x = id % n, y = (id / n) | 0, keep = puz[y][x];
    puz[y][x] = -1;
    if (!logicSolve(puz, n, D.uniq)) puz[y][x] = keep; else removed.push(id);
  }
  // 쉬운 난이도는 일부 칸 되돌려 주기
  const back = Math.floor(removed.length * D.extra);
  U.shuffle(removed).slice(0, back).forEach((id) => { puz[(id / n) | 0][id % n] = sol[(id / n) | 0][id % n]; });
  S.mode = 'play'; S.n = n; S.sol = sol; S.grid = puz;
  S.given = puz.map((r) => r.map((v) => v >= 0));
  S.err = U.grid(n, n, false); S.undo = []; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.cur = [0, 0];
  S.cs = Math.floor(Math.min(56, (BN_AREA - 40) / n)); S.ox = BN_PX - (S.cs * n) / 2; S.oy = BN_PY - (S.cs * n) / 2 - 10;
  g.sfx.tone(440, 0.08, 'triangle', 0.06);
}
function count(line) { let a = 0, b = 0; for (const v of line) { if (v === 0) a++; if (v === 1) b++; } return [a, b]; }
function pushUndo() { S.undo.push(S.grid.map((r) => r.slice())); if (S.undo.length > 300) S.undo.shift(); }
function undo(g) { if (!S.undo.length) return; S.grid = S.undo.pop(); g.sfx.tone(300, 0.05, 'sine', 0.05); check(g, false); }
function cycle(g, x, y, dir) {
  const v = S.grid[y][x];
  const nv = dir > 0 ? (v === -1 ? 0 : v === 0 ? 1 : -1) : (v === -1 ? 1 : v === 1 ? 0 : -1);
  setCell(g, x, y, nv);
}
function setCell(g, x, y, v) {
  if (S.given[y][x]) { g.sfx.beep(180, 0.06); S.flash.push({ x, y, t: 0.4, c: '#94a3b8' }); return; }
  if (S.grid[y][x] === v) return;
  pushUndo();
  S.grid[y][x] = v;
  g.sfx.tone(v === 1 ? 620 : v === 0 ? 480 : 300, 0.05, 'triangle', 0.05);
  check(g, false);
  if (S.grid.every((r) => r.every((c) => c >= 0)) && !S.err.some((r) => r.some(Boolean))) solvedNow(g);
}
// 규칙 위반 표시
function check(g, verbose) {
  const n = S.n, G = S.grid, E = U.grid(n, n, false);
  let bad = 0;
  for (let dir = 0; dir < 2; dir++) {
    const get = (i, k) => (dir ? G[k][i] : G[i][k]);
    const mark = (i, k) => { if (dir) E[k][i] = true; else E[i][k] = true; bad++; };
    const seen = {};
    for (let i = 0; i < n; i++) {
      let z = 0, o = 0, full = true, key = '';
      for (let k = 0; k < n; k++) {
        const v = get(i, k); key += v;
        if (v === 0) z++; else if (v === 1) o++; else full = false;
        if (k >= 2 && v >= 0 && v === get(i, k - 1) && v === get(i, k - 2)) { mark(i, k); mark(i, k - 1); mark(i, k - 2); }
      }
      if (z > n / 2 || o > n / 2) for (let k = 0; k < n; k++) if (get(i, k) === (z > n / 2 ? 0 : 1)) mark(i, k);
      if (full) { if (seen[key] !== undefined) { for (let k = 0; k < n; k++) { mark(i, k); mark(seen[key], k); } } else seen[key] = i; }
    }
  }
  S.err = E;
  if (verbose) {
    let wrong = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (G[y][x] >= 0 && G[y][x] !== S.sol[y][x]) wrong++;
    if (bad) { say('규칙 위반이 있어요 (빨간 칸)'); g.sfx.hit(); g.shake(4); }
    else if (wrong) { say(`규칙은 지켰지만 ${wrong}칸이 막다른 길이에요`); g.sfx.beep(250, 0.1); }
    else { say('지금까지 모두 맞아요! 👍'); g.sfx.coin(); }
  }
  return bad;
}
function say(t) { S.msg = t; S.msgT = 2; }
function hint(g) {
  const n = S.n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (S.grid[y][x] >= 0 && S.grid[y][x] !== S.sol[y][x]) { S.flash.push({ x, y, t: 1.5, c: '#ef4444' }); S.cur = [x, y]; say('이 칸이 틀렸어요'); g.sfx.hit(); S.hintsUsed++; return; }
  }
  const tmp = S.grid.map((r) => r.slice());
  let r = logicStep(tmp, n, BN_DIFF[S.d].uniq, true);
  if (!r || typeof r !== 'object') r = logicStep(tmp, n, true, true);
  if (!r || typeof r !== 'object') {
    const empt = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (S.grid[y][x] < 0) empt.push({ x, y, v: S.sol[y][x] });
    if (!empt.length) return;
    r = U.choice(empt);
  }
  S.hintsUsed++;
  pushUndo();
  S.grid[r.y][r.x] = r.v; S.cur = [r.x, r.y];
  S.flash.push({ x: r.x, y: r.y, t: 1.5, c: '#22c55e' });
  say(`(${r.x + 1}, ${r.y + 1}) 칸은 ${r.v}!`);
  g.sfx.power();
  check(g, false);
  if (S.grid.every((row) => row.every((c) => c >= 0)) && !S.err.some((row) => row.some(Boolean))) solvedNow(g);
}
function solvedNow(g) {
  const n = S.n;
  const pts = Math.max(100, n * n * 10 * (S.d + 1) - Math.floor(S.time) * 2 - S.hintsUsed * 60);
  S.lastPts = pts;
  g.add(pts);
  S.solved++;
  S.stats[S.d] = (S.stats[S.d] || 0) + 1; g.save('stats', S.stats);
  S.clear = 1.8;
  g.sfx.win(); g.shake(4);
  for (let i = 0; i < 6; i++) g.burst(S.ox + Math.random() * n * S.cs, S.oy + Math.random() * n * S.cs, ['#60a5fa', '#fb923c', '#facc15', '#fff'], 20, 260, 1);
}
