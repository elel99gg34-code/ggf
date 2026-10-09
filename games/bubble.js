let S;
const R = 22, COLS = 13, W = COLS * R * 2 + R, TOPY = 60;
const BC = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
GAME({
  title: '버블 슈터', w: W + 40, h: 860, bg: '#0f172a', controls: 'lr+ab',
  help: '마우스로 조준, 클릭 = 발사 (←→ 조준 + Space도 가능)\n같은 색 3개 이상 붙으면 팡! 매달린 버블은 떨어져서 보너스\n벽에 튕겨서 쏠 수 있어요\n5발마다 천장이 내려와요 · 바닥선에 닿으면 게임 오버',
  init(g) { S = { grid: [], shot: null, next: null, cur: null, aim: -Math.PI / 2, shots: 0, rowOff: 0, level: 1, falling: [], drop: 0 }; for (let r = 0; r < 7; r++) S.grid.push(row(r)); S.cur = pick(); S.next = pick(); },
  update(g, dt) {
    const sx = (W + 40) / 2, sy = 790;
    if (g.mouse.moved || g.mouse.down) { const a = Math.atan2(g.mouse.y - sy, g.mouse.x - sx); S.aim = U.clamp(a, -Math.PI + 0.12, -0.12); }
    g.mouse.moved = false;
    S.aim = U.clamp(S.aim + (g.right - g.left) * 1.8 * dt, -Math.PI + 0.12, -0.12);
    if (!S.shot && (g.mouse.clicked || g.pressed('a'))) { S.shot = { x: sx, y: sy, vx: Math.cos(S.aim) * 1300, vy: Math.sin(S.aim) * 1300, c: S.cur }; S.cur = S.next; S.next = pick(); g.sfx.tone(500, 0.06, 'sine', 0.06, 900); }
    if (S.shot) {
      const s = S.shot;
      for (let i = 0; i < 6; i++) {
        s.x += (s.vx * dt) / 6; s.y += (s.vy * dt) / 6;
        if (s.x < 20 + R) { s.x = 20 + R; s.vx = Math.abs(s.vx); g.sfx.bounce(); } if (s.x > 20 + W - R) { s.x = 20 + W - R; s.vx = -Math.abs(s.vx); g.sfx.bounce(); }
        let hit = s.y < TOPY + S.drop + R;
        if (!hit) for (let r = 0; r < S.grid.length && !hit; r++) for (let c = 0; c < COLS; c++) if (S.grid[r][c] !== null) { const [bx, by] = pos(r, c); if (U.dist(bx, by, s.x, s.y) < R * 1.8) { hit = true; break; } }
        if (hit) { snap(g, s); S.shot = null; break; }
      }
    }
    for (const f of S.falling) { f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    S.falling = S.falling.filter((f) => f.y < 900);
    g.info = `레벨 ${S.level} · 천장 하강까지 ${5 - (S.shots % 5)}발`;
  },
  draw(g, c) {
    g.rect(20, 0, W, 860, '#1e293b');
    g.rect(20, TOPY + S.drop - 40, W, 40, '#475569');
    for (let r = 0; r < S.grid.length; r++) for (let cc = 0; cc < COLS; cc++) { const v = S.grid[r][cc]; if (v === null) continue; const [x, y] = pos(r, cc); bub(g, x, y, v); }
    g.line(20, 720, 20 + W, 720, 'rgba(239,68,68,.5)', 2);
    for (const f of S.falling) bub(g, f.x, f.y, f.c);
    const sx = (W + 40) / 2, sy = 790;
    // 조준선 (벽 반사 1회)
    c.setLineDash([4, 10]); let x = sx, y = sy, vx = Math.cos(S.aim), vy = Math.sin(S.aim); c.beginPath(); c.moveTo(x, y);
    for (let i = 0; i < 160; i++) { x += vx * 5; y += vy * 5; if (x < 20 + R || x > 20 + W - R) vx = -vx; if (y < TOPY + S.drop) break; c.lineTo(x, y); }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
    if (S.shot) bub(g, S.shot.x, S.shot.y, S.shot.c);
    bub(g, sx, sy, S.cur); g.text('다음', sx + 90, sy - 30, 14, '#94a3b8'); bub(g, sx + 90, sy, S.next, 0.7);
  },
});
function row(r) { const n = Math.min(BC.length, 3 + Math.floor((S.level || 1) / 2)); return Array.from({ length: COLS }, (_, c) => ((r + S.rowOff) % 2 && c === COLS - 1 ? null : U.randi(n))); }
function pos(r, c) { const odd = (r + S.rowOff) % 2; return [20 + R + c * R * 2 + (odd ? R : 0), TOPY + S.drop + R + r * R * 1.74]; }
function bub(g, x, y, v, s = 1) { g.circle(x, y, R * s, BC[v]); g.circle(x - 6 * s, y - 7 * s, 6 * s, 'rgba(255,255,255,.45)'); g.ring(x, y, R * s, 'rgba(0,0,0,.25)', 2); }
function colorsLeft() { const s = new Set(); S.grid.forEach((r) => r.forEach((v) => v !== null && s.add(v))); return [...s]; }
function pick() { const cl = colorsLeft(); return cl.length ? U.choice(cl) : U.randi(4); }
function nbs(r, c) { const odd = (r + S.rowOff) % 2; const d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]; return d.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && b >= 0 && b < COLS && a < S.grid.length + 1); }
function snap(g, s) {
  let best = null, bd = 1e9;
  for (let r = 0; r <= S.grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (S.grid[r] && S.grid[r][c] !== null) continue;
    if ((r + S.rowOff) % 2 && c === COLS - 1) continue;
    const [x, y] = pos(r, c), d = U.dist(x, y, s.x, s.y);
    const touching = r === 0 || nbs(r, c).some(([a, b]) => S.grid[a] && S.grid[a][b] !== null && S.grid[a][b] !== undefined);
    if (touching && d < bd) { bd = d; best = [r, c]; }
  }
  if (!best) return;
  const [r, c] = best;
  while (S.grid.length <= r) S.grid.push(Array(COLS).fill(null));
  S.grid[r][c] = s.c;
  const grp = flood(r, c, (v) => v === s.c);
  if (grp.length >= 3) {
    grp.forEach(([a, b]) => { const [x, y] = pos(a, b); g.burst(x, y, BC[S.grid[a][b]], 8, 200); S.grid[a][b] = null; });
    g.add(grp.length * 10); g.sfx.pop();
    const top = new Set(); for (let cc = 0; cc < COLS; cc++) if (S.grid[0][cc] !== null) flood(0, cc, (v) => v !== null).forEach(([a, b]) => top.add(a + ',' + b));
    let fell = 0;
    for (let a = 0; a < S.grid.length; a++) for (let b = 0; b < COLS; b++) if (S.grid[a][b] !== null && !top.has(a + ',' + b)) { const [x, y] = pos(a, b); S.falling.push({ x, y, c: S.grid[a][b], vx: U.rand(-100, 100), vy: U.rand(-200, 0) }); S.grid[a][b] = null; fell++; }
    if (fell) { g.add(fell * 30 * Math.min(fell, 10)); g.float(W / 2, 500, `${fell}개 낙하! +${fell * 30 * Math.min(fell, 10)}`, '#fde047', 28); g.sfx.coin(); }
  } else { g.sfx.drop(); S.shots++; if (S.shots % 5 === 0) { S.rowOff = (S.rowOff + 1) % 2; S.grid.unshift(row(0)); g.sfx.tone(120, 0.3, 'square', 0.05); g.shake(5); } }
  while (S.grid.length && S.grid[S.grid.length - 1].every((v) => v === null)) S.grid.pop();
  if (!S.grid.length || S.grid.every((r) => r.every((v) => v === null))) { S.level++; g.add(1000 * S.level); g.sfx.win(); g.float(W / 2, 400, `레벨 ${S.level}!`, '#4ade80', 40); S.grid = []; S.rowOff = 0; for (let k = 0; k < 6 + Math.min(4, S.level); k++) S.grid.push(row(k)); S.cur = pick(); S.next = pick(); return; }
  for (let a = 0; a < S.grid.length; a++) for (let b = 0; b < COLS; b++) if (S.grid[a][b] !== null && pos(a, b)[1] + R > 720) return g.over(`레벨 ${S.level}`);
  if (!colorsLeft().includes(S.cur)) S.cur = pick();
  if (!colorsLeft().includes(S.next)) S.next = pick();
}
function flood(r, c, pred) {
  const seen = new Set([r + ',' + c]), st = [[r, c]], out = [];
  while (st.length) { const [a, b] = st.pop(); out.push([a, b]); for (const [x, y] of nbs(a, b)) { const k = x + ',' + y; if (!seen.has(k) && S.grid[x] && S.grid[x][y] !== null && S.grid[x][y] !== undefined && pred(S.grid[x][y])) { seen.add(k); st.push([x, y]); } } }
  return out;
}
