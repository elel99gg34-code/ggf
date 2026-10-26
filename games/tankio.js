let S;
const TS = 48, GW = 20, GH = 13;
const TT = {
  player: { col: '#2563eb', sp: 120, bsp: 300, bounce: 1, max: 5, cd: 0.25, mines: 2, n: '나' },
  brown: { col: '#92400e', sp: 0, bsp: 220, bounce: 1, max: 1, cd: 2.4, mines: 0, acc: 0.25, pts: 100, n: '갈색' },
  grey: { col: '#6b7280', sp: 55, bsp: 240, bounce: 1, max: 1, cd: 2, mines: 0, acc: 0.18, pts: 150, n: '회색' },
  teal: { col: '#0d9488', sp: 50, bsp: 480, bounce: 0, max: 1, cd: 1.6, mines: 0, acc: 0.1, pts: 200, n: '청록', rocket: true },
  yellow: { col: '#eab308', sp: 110, bsp: 240, bounce: 1, max: 1, cd: 2.2, mines: 3, acc: 0.2, pts: 200, n: '노랑' },
  pink: { col: '#ec4899', sp: 60, bsp: 260, bounce: 1, max: 3, cd: 0.6, mines: 0, acc: 0.15, pts: 250, n: '분홍' },
  green: { col: '#16a34a', sp: 0, bsp: 420, bounce: 2, max: 2, cd: 1.4, mines: 0, acc: 0.03, pts: 300, n: '초록', rocket: true, trick: true },
  purple: { col: '#7c3aed', sp: 120, bsp: 300, bounce: 1, max: 5, cd: 0.5, mines: 2, acc: 0.08, pts: 350, n: '보라', trick: true },
  white: { col: '#e5e7eb', sp: 80, bsp: 280, bounce: 1, max: 5, cd: 0.8, mines: 2, acc: 0.1, pts: 400, n: '투명', invis: true, trick: true },
  black: { col: '#111827', sp: 150, bsp: 500, bounce: 0, max: 2, cd: 0.7, mines: 2, acc: 0.05, pts: 500, n: '검정', rocket: true },
};
const LV = [
  ['brown'], ['brown', 'brown'], ['grey', 'brown'], ['grey', 'grey', 'brown'], ['teal', 'grey'],
  ['teal', 'teal', 'grey'], ['yellow', 'grey', 'brown'], ['yellow', 'yellow', 'teal'], ['pink', 'grey', 'grey'], ['pink', 'pink', 'teal'],
  ['green', 'grey', 'yellow'], ['green', 'green', 'pink'], ['purple', 'teal', 'grey'], ['purple', 'purple', 'yellow'], ['white', 'grey', 'pink'],
  ['white', 'white', 'green'], ['black', 'teal', 'teal'], ['black', 'purple', 'pink', 'yellow'], ['white', 'black', 'green', 'purple'], ['black', 'black', 'white', 'purple', 'green'],
];
GAME({
  title: '탱크 아레나', w: 960, h: 624, bg: '#c8a46a', controls: 'dpad+ab', aLabel: '발사', bLabel: '지뢰',
  help: 'WASD/방향키 이동 · 마우스로 포탑 조준 · 클릭/Space 발사\n오른쪽 클릭 또는 X/Shift: 지뢰 설치 (최대 2개, 근처 적에 반응)\n키보드 조준: Q/E 포탑 회전 (마우스 안 쓸 때)\n포탄은 벽에 1번 튕깁니다(도탄) · 포탄끼리 부딪히면 상쇄\n밝은 나무 블록은 지뢰로 파괴 가능 · 20단계 모든 적 탱크 격파!',
  init(g) {
    S = { lv: 0, lives: 3, kills: 0, phase: 'intro', pt: 2.5, tanks: [], bul: [], mines: [], marks: [], map: null, aimMouse: true, ta: 0, killBy: {} };
    load(g);
  },
  update(g, dt) {
    S.pt -= dt;
    if (S.phase === 'intro') { if (S.pt <= 0) S.phase = 'play'; return; }
    if (S.phase === 'clear') { if (S.pt <= 0) { S.lv++; if (S.lv >= LV.length) { g.add(S.lives * 5000); return g.win(`20단계 정복! 격파 ${S.kills}대`); } if (S.lv % 5 === 0) { S.lives++; g.float(480, 260, '보너스 탱크 +1', '#4ade80', 28); } load(g); } return; }
    if (S.phase === 'dead') { if (S.pt <= 0) { if (S.lives <= 0) return g.over(`${S.lv + 1}단계에서 전멸 · 격파 ${S.kills}대`); load(g); } updBullets(g, dt); return; }
    const P = S.tanks[0];
    if (P.alive) {
      let mx = g.right - g.left, my = g.down - g.up;
      if (mx || my) { const m = Math.hypot(mx, my); moveTank(P, (mx / m) * TT.player.sp, (my / m) * TT.player.sp, dt); const ta = Math.atan2(my, mx); P.body = turnTo(P.body, ta, dt * 10); mark(P); }
      if (g.mouse.moved) S.aimMouse = true;
      if (g.key('KeyQ') || g.key('KeyE')) { S.aimMouse = false; P.tur += (g.key('KeyE') ? 1 : -1) * 3 * dt; }
      if (S.aimMouse) P.tur = Math.atan2(g.mouse.y - P.y, g.mouse.x - P.x);
      P.cd -= dt;
      if ((g.pressed('a') || g.mouse.clicked) && P.cd <= 0) shoot(g, P);
      if (g.pressed('b') || g.mouse.rclick) layMine(g, P);
    }
    for (let i = 1; i < S.tanks.length; i++) if (S.tanks[i].alive) ai(g, S.tanks[i], dt);
    updBullets(g, dt);
    // 지뢰
    for (const m of S.mines) {
      m.t -= dt;
      if (m.arm > 0) m.arm -= dt;
      else for (const t of S.tanks) if (t.alive && U.dist(t.x, t.y, m.x, m.y) < 40 && (t !== m.owner || m.t < 7)) m.t = Math.min(m.t, 0.4);
      if (m.t <= 0) boom(g, m);
    }
    S.mines = S.mines.filter((m) => !m.done);
    if (S.marks.length > 400) S.marks.splice(0, S.marks.length - 400);
    if (!P.alive && S.phase === 'play') { S.phase = 'dead'; S.pt = 2.5; S.lives--; }
    else if (S.tanks.slice(1).every((t) => !t.alive) && S.phase === 'play') { S.phase = 'clear'; S.pt = 2.5; g.add(1000 * (S.lv + 1), 480, 300); g.sfx.win(); }
    g.info = `단계 ${S.lv + 1}/20 · 남은 적 ${S.tanks.slice(1).filter((t) => t.alive).length} · 🛡️×${S.lives}`;
  },
  draw(g, c) {
    g.rect(0, 0, 960, 624, '#d6b27a');
    for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) if ((x + y) % 2) g.rect(x * TS, y * TS, TS, TS, 'rgba(0,0,0,.025)');
    for (const m of S.marks) { c.globalAlpha = 0.18; c.save(); c.translate(m.x, m.y); c.rotate(m.a); g.rect(-6, -11, 12, 3, '#5b4321'); g.rect(-6, 8, 12, 3, '#5b4321'); c.restore(); }
    c.globalAlpha = 1;
    for (const m of S.mines) { g.circle(m.x, m.y, 11, '#facc15'); g.circle(m.x, m.y, 5, m.t < 1.5 && Math.floor(g.time * 10) % 2 ? '#ef4444' : '#78350f'); if (m.t < 0.4) g.ring(m.x, m.y, 60, 'rgba(239,68,68,.6)', 3); }
    // 벽
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const v = S.map[y][x]; if (!v) continue;
      const px = x * TS, py = y * TS;
      if (v === 1) { g.rect(px, py + 6, TS, TS - 6, '#7c5a2c'); g.rect(px, py, TS, TS - 8, '#a07642'); g.stroke(px + 1, py + 1, TS - 2, TS - 10, '#8a6434', 2); }
      else { g.rect(px, py + 6, TS, TS - 6, '#b08850'); g.rect(px, py, TS, TS - 8, '#e8c58c'); for (let k = 8; k < TS - 8; k += 10) g.line(px + 4, py + k, px + TS - 4, py + k, 'rgba(120,80,30,.3)', 1); }
    }
    for (const t of S.tanks) if (t.alive) drawTank(g, c, t);
    for (const t of S.tanks) if (!t.alive) { g.text('✕', t.x, t.y, 34, 'rgba(0,0,0,.35)'); }
    for (const b of S.bul) { c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx)); g.rrect(-7, -3.5, 14, 7, 3, '#f8fafc', '#1f2937', 1); if (b.rocket) g.poly([[-7, -3], [-16 - Math.random() * 6, 0], [-7, 3]], '#f97316'); c.restore(); }
    const P = S.tanks[0];
    if (P && P.alive && S.aimMouse) { c.setLineDash([4, 8]); g.line(P.x, P.y, g.mouse.x, g.mouse.y, 'rgba(30,64,175,.3)', 2); c.setLineDash([]); g.ring(g.mouse.x, g.mouse.y, 10, '#1e40af', 2); }
    if (S.phase === 'intro') { g.rrect(280, 210, 400, 200, 16, 'rgba(127,29,29,.92)', '#fde68a', 3); g.text(`MISSION ${S.lv + 1}`, 480, 250, 36, '#fde68a'); g.text(`적 탱크: ${S.tanks.length - 1}대`, 480, 295, 20, '#fff'); g.text(LV[S.lv].map((k) => TT[k].n).join(' · '), 480, 330, 16, '#fecaca'); g.text(`남은 탱크 ×${S.lives}`, 480, 370, 18, '#fde68a'); }
    if (S.phase === 'clear') g.text('미션 클리어!', 480, 300, 46, '#16a34a');
    if (S.phase === 'dead') g.text(S.lives > 0 ? '격파당했다!' : '게임 오버', 480, 300, 46, '#b91c1c');
  },
});
function rng(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function load(g) {
  const r = rng(S.lv * 7 + 3);
  const m = U.grid(GW, GH, 0);
  for (let x = 0; x < GW; x++) { m[0][x] = m[GH - 1][x] = 1; }
  for (let y = 0; y < GH; y++) { m[y][0] = m[y][GW - 1] = 1; }
  const n = 6 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const w = 1 + Math.floor(r() * 4), h = w > 1 ? 1 : 1 + Math.floor(r() * 4);
    const x = 3 + Math.floor(r() * (GW / 2 - 4)), y = 2 + Math.floor(r() * (GH - 4 - h));
    const v = r() < 0.3 ? 2 : 1;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { if (y + dy < GH - 1) { m[y + dy][x + dx] = v; m[GH - 1 - (y + dy)][GW - 1 - (x + dx)] = v; } }
  }
  // 스폰 영역 비우기
  for (let y = 4; y <= 8; y++) for (let x = 1; x <= 3; x++) m[y][x] = 0;
  S.map = m; S.bul = []; S.mines = []; S.marks = [];
  S.tanks = [mkTank('player', 2 * TS, 6.5 * TS)];
  S.tanks[0].body = 0; S.tanks[0].tur = 0;
  const spots = [];
  for (let y = 1; y < GH - 1; y++) for (let x = GW / 2 + 2; x < GW - 1; x++) if (!m[y][x] && !m[y - 1][x] && !m[y + 1][x] && !m[y][x - 1] && !m[y][x + 1]) spots.push([x, y]);
  for (let y = 1; y < GH - 1; y++) for (let x = GW / 2 + 2; x < GW - 1; x++) if (!m[y][x] && !spots.length) spots.push([x, y]);
  const used = [];
  for (const k of LV[S.lv]) {
    let best = null, bd = -1;
    for (let tries = 0; tries < 30; tries++) { const s = spots[Math.floor(r() * spots.length)]; const d = Math.min(999, ...used.map((u) => Math.hypot(u[0] - s[0], u[1] - s[1]))); if (d > bd) { bd = d; best = s; } }
    used.push(best);
    const t = mkTank(k, (best[0] + 0.5) * TS, (best[1] + 0.5) * TS); t.body = Math.PI; t.tur = Math.PI; S.tanks.push(t);
  }
  S.phase = 'intro'; S.pt = 2.2;
  g.sfx.tone(392, 0.15, 'square', 0.05); g.sfx.tone(523, 0.3, 'square', 0.05, null, 0.18);
}
function mkTank(k, x, y) { return { k, T: TT[k], x, y, body: 0, tur: 0, cd: U.rand(1, 2), alive: true, mt: 0, wx: x, wy: y, think: U.rand(0.2, 1), dodge: 0, mineCd: U.rand(3, 8), aimT: 0, plan: null }; }
function solid(px, py) { const x = Math.floor(px / TS), y = Math.floor(py / TS); if (x < 0 || y < 0 || x >= GW || y >= GH) return 1; return S.map[y][x]; }
function hitWall(x, y, r) { return solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r); }
function moveTank(t, vx, vy, dt) {
  let moved = false;
  const nx = t.x + vx * dt; if (!hitWall(nx, t.y, 17) && !tankAt(t, nx, t.y)) { t.x = nx; moved = true; }
  const ny = t.y + vy * dt; if (!hitWall(t.x, ny, 17) && !tankAt(t, t.x, ny)) { t.y = ny; moved = true; }
  return moved;
}
function tankAt(self, x, y) { for (const o of S.tanks) if (o !== self && o.alive && Math.abs(o.x - x) < 34 && Math.abs(o.y - y) < 34) return true; return false; }
function turnTo(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + U.clamp(d, -k, k); }
function mark(t) { t.mt += 1; if (t.mt % 6 === 0) S.marks.push({ x: t.x, y: t.y, a: t.body }); }
function shoot(g, t) {
  const T = t.T;
  if (S.bul.filter((b) => b.owner === t).length >= T.max) return;
  const bx = t.x + Math.cos(t.tur) * 26, by = t.y + Math.sin(t.tur) * 26;
  if (solid(bx, by)) return;
  t.cd = T.cd;
  S.bul.push({ x: bx, y: by, vx: Math.cos(t.tur) * T.bsp, vy: Math.sin(t.tur) * T.bsp, b: T.bounce, owner: t, rocket: T.rocket, age: 0 });
  g.sfx.tone(T.rocket ? 300 : 180, 0.1, T.rocket ? 'sawtooth' : 'square', 0.05, 60);
  g.burst(bx, by, '#9ca3af', 5, 80, 0.3, 4);
}
function layMine(g, t) {
  if (S.mines.filter((m) => m.owner === t).length >= Math.max(1, t.T.mines)) return;
  S.mines.push({ x: t.x, y: t.y, t: 8, arm: 1, owner: t });
  g.sfx.drop();
}
function boom(g, m) {
  if (m.done) return;
  m.done = true;
  g.burst(m.x, m.y, ['#f97316', '#fde047', '#7c2d12', '#fff'], 40, 300, 0.8, 5); g.shake(8, 0.3); g.sfx.explode();
  for (const t of S.tanks) if (t.alive && U.dist(t.x, t.y, m.x, m.y) < 70) destroy(g, t, m.owner);
  for (const b of S.bul) if (U.dist(b.x, b.y, m.x, m.y) < 70) b.dead = true;
  for (const o of S.mines) if (!o.done && U.dist(o.x, o.y, m.x, m.y) < 70) o.t = 0.1;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (S.map[y][x] === 2 && U.dist((x + 0.5) * TS, (y + 0.5) * TS, m.x, m.y) < 80) { S.map[y][x] = 0; g.burst((x + 0.5) * TS, (y + 0.5) * TS, '#e8c58c', 12, 200, 0.6, 5); }
}
function updBullets(g, dt) {
  for (const b of S.bul) {
    if (b.dead) continue;
    b.age += dt;
    const steps = 3;
    for (let i = 0; i < steps && !b.dead; i++) {
      const nx = b.x + (b.vx * dt) / steps, ny = b.y + (b.vy * dt) / steps;
      if (solid(nx, ny)) {
        const hx = solid(nx, b.y), hy = solid(b.x, ny);
        if (b.b <= 0) { b.dead = true; g.burst(b.x, b.y, '#9ca3af', 6, 100, 0.3); g.sfx.tone(400, 0.04, 'square', 0.03); break; }
        b.b--;
        if (hx) b.vx *= -1; if (hy) b.vy *= -1; if (!hx && !hy) { b.vx *= -1; b.vy *= -1; }
        g.sfx.tone(900, 0.03, 'triangle', 0.03);
      } else { b.x = nx; b.y = ny; }
    }
    for (const t of S.tanks) if (t.alive && Math.abs(t.x - b.x) < 18 && Math.abs(t.y - b.y) < 18 && (t !== b.owner || b.age > 0.15)) { b.dead = true; destroy(g, t, b.owner); break; }
    for (const o of S.bul) if (o !== b && !o.dead && Math.abs(o.x - b.x) < 8 && Math.abs(o.y - b.y) < 8) { o.dead = b.dead = true; g.burst(b.x, b.y, '#fff', 8, 120, 0.3); g.sfx.pop(); }
    for (const m of S.mines) if (!m.done && U.dist(m.x, m.y, b.x, b.y) < 12) { b.dead = true; boom(g, m); }
  }
  S.bul = S.bul.filter((b) => !b.dead);
}
function destroy(g, t, by) {
  if (!t.alive) return;
  t.alive = false;
  g.burst(t.x, t.y, ['#f97316', '#fde047', '#1f2937', t.T.col], 36, 280, 0.9, 5); g.shake(t.k === 'player' ? 14 : 7, 0.4); g.sfx.explode();
  if (t.k !== 'player' && by && by.k === 'player') { S.kills++; g.add(t.T.pts * (1 + Math.floor(S.lv / 5)), t.x, t.y - 26); }
}
function clearLine(x0, y0, x1, y1) { const d = U.dist(x0, y0, x1, y1), n = Math.ceil(d / 12); for (let i = 1; i < n; i++) { const x = U.lerp(x0, x1, i / n), y = U.lerp(y0, y1, i / n); if (solid(x, y)) return false; } return true; }
function simulate(t, a, bounces, tgt) {
  let x = t.x + Math.cos(a) * 26, y = t.y + Math.sin(a) * 26, vx = Math.cos(a) * 10, vy = Math.sin(a) * 10, b = bounces;
  for (let i = 0; i < 160; i++) {
    const nx = x + vx, ny = y + vy;
    if (solid(nx, ny)) { if (b-- <= 0) return false; const hx = solid(nx, y), hy = solid(x, ny); if (hx) vx = -vx; if (hy) vy = -vy; if (!hx && !hy) { vx = -vx; vy = -vy; } continue; }
    x = nx; y = ny;
    if (Math.abs(x - tgt.x) < 16 && Math.abs(y - tgt.y) < 16) return true;
    for (const o of S.tanks) if (o.alive && o !== tgt && o.k !== 'player' && (o !== t || i > 6) && Math.abs(o.x - x) < 20 && Math.abs(o.y - y) < 20) return false;
  }
  return false;
}
function ai(g, t, dt) {
  const T = t.T, P = S.tanks[0];
  t.cd -= dt; t.think -= dt; t.dodge -= dt; t.mineCd -= dt;
  // 탄 회피
  let dvx = 0, dvy = 0;
  if (T.sp > 0) for (const b of S.bul) {
    const rx = t.x - b.x, ry = t.y - b.y, d = Math.hypot(rx, ry);
    if (d < 140) { const sp = Math.hypot(b.vx, b.vy), dot = (rx * b.vx + ry * b.vy) / (d * sp); if (dot > 0.85) { const px = -b.vy / sp, py = b.vx / sp, s = px * rx + py * ry >= 0 ? 1 : -1; dvx += px * s; dvy += py * s; } }
  }
  if (T.sp > 0) for (const m of S.mines) if (U.dist(m.x, m.y, t.x, t.y) < 90) { dvx += (t.x - m.x) / 90; dvy += (t.y - m.y) / 90; }
  if (T.sp > 0) {
    if (dvx || dvy) { const m = Math.hypot(dvx, dvy); moveTank(t, (dvx / m) * T.sp * 1.4, (dvy / m) * T.sp * 1.4, dt); t.body = turnTo(t.body, Math.atan2(dvy, dvx), dt * 8); }
    else {
      if (t.think <= 0 || U.dist(t.x, t.y, t.wx, t.wy) < 10) {
        t.think = U.rand(1.5, 3);
        for (let k = 0; k < 10; k++) { const a = U.rand(Math.PI * 2), r = U.rand(60, 220), wx = t.x + Math.cos(a) * r, wy = t.y + Math.sin(a) * r; if (!hitWall(wx, wy, 20) && clearLine(t.x, t.y, wx, wy)) { t.wx = wx; t.wy = wy; break; } }
      }
      const a = Math.atan2(t.wy - t.y, t.wx - t.x);
      t.body = turnTo(t.body, a, dt * 6);
      if (!moveTank(t, Math.cos(t.body) * T.sp, Math.sin(t.body) * T.sp, dt)) t.think = 0;
    }
    mark(t);
    if (T.mines && t.mineCd <= 0) { t.mineCd = U.rand(5, 10); if (U.dist(t.x, t.y, P.x, P.y) > 120) layMine(g, t); }
  }
  if (!P.alive) return;
  // 조준
  t.aimT -= dt;
  if (t.aimT <= 0) {
    t.aimT = 0.4;
    t.plan = null;
    if (clearLine(t.x, t.y, P.x, P.y)) {
      const d = U.dist(t.x, t.y, P.x, P.y), lead = d / T.bsp;
      const px = P.x + (P.x - (P.lx || P.x)) / 0.4 * lead * (T.acc < 0.12 ? 1 : 0), py = P.y + (P.y - (P.ly || P.y)) / 0.4 * lead * (T.acc < 0.12 ? 1 : 0);
      t.plan = Math.atan2(py - t.y, px - t.x) + U.rand(-T.acc, T.acc);
    } else if (T.bounce > 0 && (T.trick || Math.random() < 0.4)) {
      const base = U.rand(Math.PI * 2);
      for (let i = 0; i < 48; i++) { const a = base + (i / 48) * Math.PI * 2; if (simulate(t, a, T.bounce, P)) { t.plan = a + U.rand(-T.acc, T.acc) * 0.3; break; } }
    }
    if (t === S.tanks[1]) { P.lx = P.x; P.ly = P.y; }
  }
  const want = t.plan !== null ? t.plan : t.tur + Math.sin(g.time + t.x) * 0.02;
  t.tur = turnTo(t.tur, want, dt * 3);
  if (t.plan !== null && t.cd <= 0 && Math.abs(turnTo(t.tur, want, 9) - t.tur) < 0.08) { shoot(g, t); t.plan = null; t.aimT = 0.2; }
}
function drawTank(g, c, t) {
  if (t.T.invis && t.k !== 'player') { c.globalAlpha = 0.07; }
  c.save(); c.translate(t.x, t.y);
  g.circle(2, 4, 20, 'rgba(0,0,0,.2)');
  c.save(); c.rotate(t.body);
  g.rrect(-18, -17, 36, 7, 2, '#1f2937'); g.rrect(-18, 10, 36, 7, 2, '#1f2937');
  for (let i = -16; i < 18; i += 6) { const o = ((t.mt * 1.5) % 6); g.rect(i + o - 2, -17, 2, 7, '#4b5563'); g.rect(i + o - 2, 10, 2, 7, '#4b5563'); }
  g.rrect(-16, -12, 32, 24, 4, t.T.col, 'rgba(0,0,0,.4)', 2);
  c.restore();
  c.rotate(t.tur);
  g.rect(4, -3.5, 22, 7, '#374151'); g.rect(4, -2.5, 22, 5, t.T.col);
  g.circle(0, 0, 10, t.T.col); g.ring(0, 0, 10, 'rgba(0,0,0,.4)', 2);
  c.restore();
  c.globalAlpha = 1;
}
