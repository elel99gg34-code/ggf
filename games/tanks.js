let S;
const LEVELS = [
  ['####################', '#..................#', '#..................#', '#...####....####...#', '#..................#', '#.P..............E.#', '#..................#', '#...####....####...#', '#..................#', '#..................#', '####################'],
  ['####################', '#.....#......#....E#', '#.....#......#.....#', '#..P..#..##..#.....#', '#.........#........#', '#.........#........#', '#..###.........###.#', '#.......#..........#', '#.....E.#....#....E#', '#.......#....#.....#', '####################'],
  ['####################', '#E.......##.......E#', '#..###........###..#', '#..#............#..#', '#.....#..##..#.....#', '#......P.....#.....#', '#.....#..##..#.....#', '#..#............#..#', '#..###........###..#', '#E.......##.......E#', '####################'],
  ['####################', '#P....#...E...#....#', '#.....#.......#..E.#', '#..####..###..####.#', '#..................#', '###..#...###...#..##', '#.....#.......#....#', '#.E..####...####...#', '#..........#.....E.#', '#....#.....#.......#', '####################'],
];
GAME({
  title: '탱크 대전', w: 960, h: 528, bg: '#2b2a24', controls: 'dpad+ab', aLabel: '💥', bLabel: '💣',
  help: 'WASD/방향키 이동 · 마우스 조준 · 클릭/Space 발사 (최대 5발)\n포탄은 벽에 1번 튕겨요 (자기 포탄도 조심!)\nX/Shift = 지뢰 설치 (2개)\n적 탱크 종류: 🟫 느림 · 🟩 이동형 · 🟥 빠른 포탄 · 🟪 연사',
  init(g) { S = { lvl: 0, lives: 3 }; load(); },
  update(g, dt) {
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0 && S.next) { S.next(); S.next = null; } return; }
    const P = S.tanks[0], touch = matchMedia('(pointer: coarse)').matches;
    if (P.alive) {
      const mx = g.right - g.left, my = g.down - g.up;
      if (mx || my) { const ta = Math.atan2(my, mx); let d = ((ta - P.body + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (Math.abs(d) > Math.PI / 2) d = ((ta + Math.PI - P.body + Math.PI * 3) % (Math.PI * 2)) - Math.PI; P.body += U.clamp(d, -6 * dt, 6 * dt); const sp = Math.cos(ta - P.body) > 0 ? 1 : -1; moveTank(P, Math.cos(P.body) * 140 * sp * dt, Math.sin(P.body) * 140 * sp * dt); }
      if (touch) { const t = S.tanks.find((t) => t.alive && t !== P); if (t) P.aim = U.angle(P.x, P.y, t.x, t.y); }
      else P.aim = U.angle(P.x, P.y, g.mouse.x, g.mouse.y);
      if (g.mouse.clicked || g.pressed('a')) fire(g, P);
      if (g.pressed('b') && S.mines.filter((m) => m.o === P).length < 2) { S.mines.push({ x: P.x, y: P.y, o: P, t: 8, arm: 1 }); g.sfx.click(); }
    }
    for (const t of S.tanks) if (t.alive && t.ai) ai(g, t, dt);
    for (const b of S.shells) {
      const steps = 3;
      for (let i = 0; i < steps; i++) {
        b.x += (b.vx * dt) / steps;
        if (wall(b.x, b.y)) { b.x -= (b.vx * dt) / steps; b.vx *= -1; b.bounce--; g.sfx.bounce(); }
        b.y += (b.vy * dt) / steps;
        if (wall(b.x, b.y)) { b.y -= (b.vy * dt) / steps; b.vy *= -1; b.bounce--; g.sfx.bounce(); }
      }
      if (b.bounce < 0) b.dead = true;
      b.age += dt;
      for (const t of S.tanks) if (t.alive && (t !== b.o || b.age > 0.15) && U.dist(b.x, b.y, t.x, t.y) < 18) { b.dead = true; boom(g, t); }
      for (const o of S.shells) if (o !== b && !o.dead && U.dist(b.x, b.y, o.x, o.y) < 8) { o.dead = b.dead = true; g.burst(b.x, b.y, '#fff', 8); }
    }
    S.shells = S.shells.filter((b) => !b.dead);
    for (const m of S.mines) {
      m.t -= dt; m.arm -= dt;
      if (m.t <= 0 || (m.arm <= 0 && S.tanks.some((t) => t.alive && U.dist(t.x, t.y, m.x, m.y) < 30)) || S.shells.some((b) => U.dist(b.x, b.y, m.x, m.y) < 14)) {
        m.dead = true; g.sfx.explode(); g.shake(10); g.burst(m.x, m.y, ['#f97316', '#fde047'], 40, 300);
        for (const t of S.tanks) if (t.alive && U.dist(t.x, t.y, m.x, m.y) < 70) boom(g, t);
        for (let y = 0; y < 11; y++) for (let x = 0; x < 20; x++) if (S.map[y][x] === 'B' && U.dist(x * 48 + 24, y * 48 + 24, m.x, m.y) < 70) S.map[y][x] = '.';
      }
    }
    S.mines = S.mines.filter((m) => !m.dead);
    S.tracks = S.tracks.filter((t) => (t.t -= dt) > 0);
    if (!P.alive) { S.lives--; S.wait = 2; S.next = () => { if (S.lives < 0) g.over(`미션 ${S.lvl + 1}`); else load(); }; return; }
    if (S.tanks.every((t) => t === P || !t.alive)) { g.add(1000 * (S.lvl + 1)); g.sfx.win(); S.wait = 2; S.msg = '미션 클리어!'; S.next = () => { S.lvl++; load(); }; }
    g.info = `미션 ${S.lvl + 1} · ❤️${Math.max(0, S.lives)} · 적 ${S.tanks.filter((t) => t.ai && t.alive).length}`;
  },
  draw(g, c) {
    for (let y = 0; y < 11; y++) for (let x = 0; x < 20; x++) {
      const v = S.map[y][x], px = x * 48, py = y * 48;
      g.rect(px, py, 48, 48, (x + y) % 2 ? '#d6c8a0' : '#cfc096');
      if (v === '#') { g.rect(px, py, 48, 48, '#6b5b3e'); g.rect(px + 3, py + 3, 42, 42, '#8b7650'); }
      if (v === 'B') { g.rect(px + 2, py + 2, 44, 44, '#a16207'); g.stroke(px + 6, py + 6, 36, 36, '#713f12', 2); }
    }
    for (const t of S.tracks) { c.globalAlpha = t.t / 4 * 0.4; c.save(); c.translate(t.x, t.y); c.rotate(t.a); g.rect(-3, -14, 6, 6, '#6b5b3e'); g.rect(-3, 8, 6, 6, '#6b5b3e'); c.restore(); }
    c.globalAlpha = 1;
    for (const m of S.mines) { g.circle(m.x, m.y, 10, '#facc15'); g.circle(m.x, m.y, 4, m.arm <= 0 && Math.floor(g.time * 6) % 2 ? '#ef4444' : '#7f1d1d'); }
    for (const t of S.tanks) {
      if (!t.alive) { g.text('✕', t.x, t.y, 36, 'rgba(0,0,0,.35)'); continue; }
      c.save(); c.translate(t.x, t.y); c.rotate(t.body);
      g.rect(-20, -18, 40, 8, '#1f2937'); g.rect(-20, 10, 40, 8, '#1f2937');
      g.rrect(-17, -13, 34, 26, 4, t.col, 'rgba(0,0,0,.4)');
      c.rotate(t.aim - t.body);
      g.rect(0, -4, 28, 8, '#111'); g.circle(0, 0, 10, t.col); g.ring(0, 0, 10, 'rgba(0,0,0,.4)', 2);
      c.restore();
    }
    for (const b of S.shells) { g.circle(b.x, b.y, 5, '#111'); g.circle(b.x, b.y, 3, b.fast ? '#f87171' : '#fff'); }
    const P = S.tanks[0];
    if (P.alive && !matchMedia('(pointer: coarse)').matches) { c.setLineDash([6, 8]); g.line(P.x, P.y, g.mouse.x, g.mouse.y, 'rgba(37,99,235,.35)', 2); c.setLineDash([]); g.ring(g.mouse.x, g.mouse.y, 10, '#2563eb', 2); }
    if (S.wait > 0 && S.msg) g.text(S.msg, g.W / 2, g.H / 2, 44, '#111');
  },
});
const ETYPES = [
  { col: '#92400e', sp: 0, rate: 2.5, fast: false, bounce: 1 }, { col: '#15803d', sp: 60, rate: 2, fast: false, bounce: 1 },
  { col: '#b91c1c', sp: 40, rate: 2.2, fast: true, bounce: 0 }, { col: '#7e22ce', sp: 70, rate: 0.8, fast: false, bounce: 1 },
];
function load() {
  const L = LEVELS[S.lvl % LEVELS.length], loop = Math.floor(S.lvl / LEVELS.length);
  S.map = L.map((r) => [...r].map((ch) => (ch === '#' ? '#' : '.')));
  for (let i = 0; i < 6 + S.lvl * 2; i++) { const x = U.randi(2, 17), y = U.randi(1, 9); if (S.map[y][x] === '.' && L[y][x] === '.') S.map[y][x] = 'B'; }
  S.tanks = []; S.shells = []; S.mines = []; S.tracks = []; S.wait = 1; S.msg = `미션 ${S.lvl + 1}`;
  L.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'P') S.tanks.unshift({ x: x * 48 + 24, y: y * 48 + 24, body: 0, aim: 0, col: '#2563eb', alive: true, cool: 0 });
    if (ch === 'E') { const ty = ETYPES[Math.min(3, U.randi(0, Math.min(3, S.lvl)))]; S.tanks.push({ x: x * 48 + 24, y: y * 48 + 24, body: Math.PI, aim: Math.PI, ...ty, rate: ty.rate / (1 + loop * 0.3), alive: true, ai: true, cool: U.rand(1, 2), dir: U.rand(6), turn: 0 }); }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((ch === 'P' || ch === 'E') && S.map[y + dy]?.[x + dx] === 'B') S.map[y + dy][x + dx] = '.';
  }));
}
function wall(x, y) { const v = S.map[Math.floor(y / 48)]?.[Math.floor(x / 48)]; return v === '#' || v === 'B' || v === undefined; }
function moveTank(t, dx, dy) {
  const r = 17;
  const ok = (x, y) => !wall(x - r, y - r) && !wall(x + r, y - r) && !wall(x - r, y + r) && !wall(x + r, y + r) && !S.tanks.some((o) => o !== t && o.alive && U.dist(o.x, o.y, x, y) < 36);
  if (ok(t.x + dx, t.y)) t.x += dx; if (ok(t.x, t.y + dy)) t.y += dy;
  if (Math.random() < 0.15) S.tracks.push({ x: t.x, y: t.y, a: t.body, t: 4 });
}
function fire(g, t) {
  if (S.shells.filter((b) => b.o === t).length >= (t.ai ? 2 : 5) || t.cool > 0) return;
  const sp = t.fast ? 420 : 250;
  const x = t.x + Math.cos(t.aim) * 30, y = t.y + Math.sin(t.aim) * 30;
  if (wall(x, y)) return;
  S.shells.push({ x, y, vx: Math.cos(t.aim) * sp, vy: Math.sin(t.aim) * sp, bounce: t.ai ? t.bounce : 1, o: t, age: 0, fast: t.fast });
  t.cool = t.ai ? t.rate : 0.15;
  g.sfx.shoot();
}
function los(ax, ay, bx, by) { const d = U.dist(ax, ay, bx, by), n = Math.ceil(d / 12); for (let i = 1; i < n; i++) if (wall(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false; return true; }
function ai(g, t, dt) {
  const P = S.tanks[0];
  t.cool -= dt;
  if (!P.alive) return;
  const seen = los(t.x, t.y, P.x, P.y);
  let target = U.angle(t.x, t.y, P.x, P.y);
  if (!seen && t.bounce > 0) {
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; if (simulate(t, a)) { target = a; t.bank = true; break; } }
  }
  const d = ((target - t.aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  t.aim += U.clamp(d, -2.5 * dt, 2.5 * dt);
  if (Math.abs(d) < 0.08 && (seen || t.bank) && t.cool <= 0) { fire(g, t); t.bank = false; }
  if (t.sp) {
    t.turn -= dt;
    if (t.turn <= 0) { t.turn = U.rand(1, 2.5); t.dir = Math.random() < 0.5 ? U.angle(t.x, t.y, P.x, P.y) + U.rand(-1.2, 1.2) : U.rand(Math.PI * 2); }
    for (const b of S.shells) if (b.o !== t && U.dist(b.x, b.y, t.x, t.y) < 120) t.dir = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    const ox = t.x, oy = t.y;
    t.body += U.clamp(((t.dir - t.body + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -4 * dt, 4 * dt);
    moveTank(t, Math.cos(t.body) * t.sp * dt, Math.sin(t.body) * t.sp * dt);
    if (ox === t.x && oy === t.y) t.turn = 0;
  }
}
function simulate(t, a) {
  let x = t.x + Math.cos(a) * 30, y = t.y + Math.sin(a) * 30, vx = Math.cos(a) * 12, vy = Math.sin(a) * 12, b = 1;
  const P = S.tanks[0];
  for (let i = 0; i < 120; i++) {
    x += vx; if (wall(x, y)) { x -= vx; vx = -vx; b--; }
    y += vy; if (wall(x, y)) { y -= vy; vy = -vy; b--; }
    if (b < 0) return false;
    if (U.dist(x, y, t.x, t.y) < 20 && i > 3) return false;
    if (U.dist(x, y, P.x, P.y) < 16) return b < 1;
  }
  return false;
}
function boom(g, t) {
  if (!t.alive) return;
  t.alive = false; g.sfx.explode(); g.shake(10); g.burst(t.x, t.y, ['#f97316', '#fde047', '#444'], 50, 300, 1);
  if (t.ai) g.add(300, t.x, t.y);
}
