let S;
const MAP = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];
const T = 22, MW = 28, MH = 31, OY = 10;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const GC = ['#ff3b3b', '#ffb8ff', '#00ffff', '#ffb852'];
const FRUITS = ['🍒', '🍓', '🍊', '🍎', '🍈', '🍇', '🔔', '🔑'];
const wall = (x, y) => { if (x < 0 || x >= MW) return false; const c = (MAP[y] || '')[x]; return c === '#' || c === '-' || c === undefined; };
GAME({
  title: '미로 먹보', w: MW * T, h: MH * T + 50, bg: '#000', controls: 'dpad',
  help: '방향키/WASD/스와이프로 이동 (미리 입력 가능)\n점 10 · 파워쿠키 50 · 겁먹은 유령 200→400→800→1600\n과일 보너스는 레벨마다 바뀜\n유령마다 추적 성격이 달라요!',
  init(g) {
    S = { level: 1, lives: 3 };
    newLevel(g, true);
  },
  update(g, dt) {
    if (S.pause > 0) { S.pause -= dt; return; }
    if (S.dying) {
      S.dying -= dt;
      if (S.dying <= 0) { S.lives--; if (S.lives < 0) return g.over(`레벨 ${S.level}`); resetPos(); S.pause = 1.5; }
      return;
    }
    for (const k in DIRS) if (g.pressed(k) || g.held(k)) { if (g.pressed(k) || !S.want) S.want = DIRS[k]; }
    const P = S.pac;
    // 반대 방향 즉시 전환
    if (S.want && P.dir && S.want[0] === -P.dir[0] && S.want[1] === -P.dir[1] && P.t > 0) { P.tx += P.dir[0]; P.ty += P.dir[1]; P.dir = S.want; P.t = 1 - P.t; }
    move(P, (S.fright > 0 ? 9.2 : 8.4) + S.level * 0.15, dt, (e) => {
      eat(g, e.tx, e.ty);
      if (S.want && !wall(e.tx + S.want[0], e.ty + S.want[1])) return S.want;
      if (e.dir && !wall(e.tx + e.dir[0], e.ty + e.dir[1])) return e.dir;
      return null;
    });
    if (S.fright > 0) { S.fright -= dt; if (S.fright <= 0) S.ghosts.forEach((gh) => gh.mode === 'fright' && (gh.mode = 'norm')); }
    else S.modeT += dt;
    const scatter = (S.modeT % 27) < 7 && S.modeT < 80;
    for (const gh of S.ghosts) {
      if (gh.house) { gh.release -= dt; if (gh.release <= 0 && (S.dotsEaten >= gh.need || gh.release < -6)) { gh.house = false; gh.tx = 13; gh.ty = 11; gh.t = 0; gh.dir = [-1, 0]; } continue; }
      const sp = gh.mode === 'eyes' ? 16 : gh.mode === 'fright' ? 5 : (gh.ty === 14 && (gh.tx < 6 || gh.tx > 21) ? 4.5 : 7.6 + S.level * 0.2);
      move(gh, sp, dt, (e) => ghostDir(e, scatter));
      if (gh.mode === 'eyes' && gh.tx === 13 && gh.ty === 11) gh.mode = 'norm';
      const px = P.tx + (P.dir ? P.dir[0] * P.t : 0), py = P.ty + (P.dir ? P.dir[1] * P.t : 0);
      const gx = gh.tx + (gh.dir ? gh.dir[0] * gh.t : 0), gy = gh.ty + (gh.dir ? gh.dir[1] * gh.t : 0);
      if (Math.abs(px - gx) < 0.6 && Math.abs(py - gy) < 0.6) {
        if (gh.mode === 'fright') {
          const pts = 200 * Math.pow(2, S.chain++); g.add(pts, gx * T + T / 2, gy * T + OY); g.sfx.power(); gh.mode = 'eyes'; S.pause = 0.4;
        } else if (gh.mode === 'norm') { S.dying = 1.6; g.sfx.lose(); g.shake(6); return; }
      }
    }
    if (S.fruit) { S.fruit.t -= dt; if (S.fruit.t <= 0) S.fruit = null; }
    if (S.fruit && P.tx === 13 && P.ty === 17) { const v = [100, 300, 500, 700, 1000, 2000, 3000, 5000][Math.min(7, S.level - 1)]; g.add(v, 13.5 * T, 17 * T + OY); g.sfx.coin(); S.fruit = null; }
    if (S.dotsLeft === 0) { g.sfx.win(); S.level++; newLevel(g); }
    g.info = `레벨 ${S.level} · ❤️${S.lives}`;
  },
  draw(g, c) {
    c.save(); c.translate(0, OY);
    const flash = S.dotsLeft === 0;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const ch = MAP[y][x];
      if (ch === '#') {
        g.rect(x * T, y * T, T, T, '#0a1240');
        const W = (a, b) => (MAP[b] || '')[a] === '#';
        if (!W(x, y - 1)) g.line(x * T, y * T + 1, x * T + T, y * T + 1, '#3b5bff', 3);
        if (!W(x, y + 1)) g.line(x * T, y * T + T - 1, x * T + T, y * T + T - 1, '#3b5bff', 3);
        if (!W(x - 1, y) && x > 0) g.line(x * T + 1, y * T, x * T + 1, y * T + T, '#3b5bff', 3);
        if (!W(x + 1, y) && x < MW - 1) g.line(x * T + T - 1, y * T, x * T + T - 1, y * T + T, '#3b5bff', 3);
      } else if (ch === '-') g.rect(x * T, y * T + T / 2 - 2, T, 4, '#ffb8ff');
      const d = S.dots[y][x];
      if (d === 1) g.circle(x * T + T / 2, y * T + T / 2, 2.6, '#ffd7b0');
      if (d === 2 && Math.floor(g.time * 4) % 2) g.circle(x * T + T / 2, y * T + T / 2, 7, '#ffd7b0');
    }
    if (S.fruit) g.emoji(FRUITS[Math.min(7, S.level - 1)], 13.5 * T, 17 * T + T / 2, 22);
    const P = S.pac, px = (P.tx + (P.dir ? P.dir[0] * P.t : 0)) * T + T / 2, py = (P.ty + (P.dir ? P.dir[1] * P.t : 0)) * T + T / 2;
    const ang = P.dir ? Math.atan2(P.dir[1], P.dir[0]) : 0;
    let mouth = S.dying ? Math.min(Math.PI, (1.6 - S.dying) * 2.5) : Math.abs(Math.sin(g.time * 14)) * 0.8;
    c.fillStyle = '#ffe600'; c.beginPath(); c.moveTo(px, py); c.arc(px, py, T * 0.65, ang + mouth / 2, ang + Math.PI * 2 - mouth / 2); c.closePath(); c.fill();
    if (!S.dying) for (const gh of S.ghosts) drawGhost(g, gh);
    if (S.pause > 0 && S.ready) g.text('READY!', 14 * T, 17 * T + T / 2, 24, '#ffe600');
    c.restore();
    for (let i = 0; i < S.lives; i++) g.emoji('🟡', 20 + i * 28, g.H - 22, 20);
    for (let i = 0; i < Math.min(S.level, 8); i++) g.emoji(FRUITS[i], g.W - 20 - i * 28, g.H - 22, 20);
  },
});
function drawGhost(g, gh) {
  const c = g.ctx, x = (gh.tx + (gh.dir ? gh.dir[0] * gh.t : 0)) * T + T / 2, y = (gh.ty + (gh.dir ? gh.dir[1] * gh.t : 0)) * T + T / 2 + (gh.house ? Math.sin(g.time * 6 + gh.i) * 3 : 0);
  const r = T * 0.7;
  if (gh.mode !== 'eyes') {
    const blink = gh.mode === 'fright' && S.fright < 2 && Math.floor(g.time * 6) % 2;
    c.fillStyle = gh.mode === 'fright' ? (blink ? '#fff' : '#2121ff') : GC[gh.i];
    c.beginPath(); c.arc(x, y - 2, r, Math.PI, 0); c.lineTo(x + r, y + r);
    for (let i = 0; i < 4; i++) c.lineTo(x + r - (i + 0.5) * (r / 2), y + r - (i % 2 ? 0 : 5) + Math.sin(g.time * 15) * 1.5);
    c.lineTo(x - r, y + r); c.closePath(); c.fill();
    if (gh.mode === 'fright') { g.rect(x - 6, y - 4, 3, 3, '#ffb8ae'); g.rect(x + 3, y - 4, 3, 3, '#ffb8ae'); return; }
  }
  const d = gh.dir || [0, 0];
  [-5, 5].forEach((o) => { g.circle(x + o, y - 4, 4.5, '#fff'); g.circle(x + o + d[0] * 2, y - 4 + d[1] * 2, 2.3, '#1d3cff'); });
}
function move(e, speed, dt, choose) {
  if (!e.dir) { e.dir = choose(e); e.t = 0; if (!e.dir) return; }
  e.t += speed * dt;
  let guard = 0;
  while (e.t >= 1 && guard++ < 4) {
    e.t -= 1; e.tx += e.dir[0]; e.ty += e.dir[1];
    if (e.tx < 0) e.tx = MW - 1; if (e.tx >= MW) e.tx = 0;
    const nd = choose(e);
    if (!nd) { e.t = 0; e.dir = null; return; }
    e.dir = nd;
  }
  if (e.dir && wall(e.tx + e.dir[0], e.ty + e.dir[1]) && !(e.mode === 'eyes')) { e.t = 0; }
}
function ghostDir(e, scatter) {
  const P = S.pac;
  let tx, ty;
  if (e.mode === 'eyes') { tx = 13; ty = 11; }
  else if (scatter) { [tx, ty] = [[25, -3], [2, -3], [27, 32], [0, 32]][e.i]; }
  else {
    const pd = P.dir || [0, 0];
    if (e.i === 0) { tx = P.tx; ty = P.ty; }
    else if (e.i === 1) { tx = P.tx + pd[0] * 4; ty = P.ty + pd[1] * 4; }
    else if (e.i === 2) { const b = S.ghosts[0]; tx = 2 * (P.tx + pd[0] * 2) - b.tx; ty = 2 * (P.ty + pd[1] * 2) - b.ty; }
    else { const d = U.dist(e.tx, e.ty, P.tx, P.ty); if (d > 8) { tx = P.tx; ty = P.ty; } else { tx = 0; ty = 32; } }
  }
  const opts = Object.values(DIRS).filter(([dx, dy]) => {
    if (e.dir && dx === -e.dir[0] && dy === -e.dir[1]) return false;
    const nx = e.tx + dx, ny = e.ty + dy;
    return !wall(nx, ny) && !(ny === 11 && (nx === 12 || nx === 15) && dy < 0 && e.mode !== 'eyes' && false);
  });
  if (!opts.length) return e.dir ? [-e.dir[0], -e.dir[1]] : null;
  if (e.mode === 'fright') return U.choice(opts);
  opts.sort((a, b) => U.dist(e.tx + a[0], e.ty + a[1], tx, ty) - U.dist(e.tx + b[0], e.ty + b[1], tx, ty));
  return opts[0];
}
function eat(g, x, y) {
  const d = S.dots[y] && S.dots[y][x];
  if (!d) return;
  S.dots[y][x] = 0; S.dotsLeft--; S.dotsEaten++;
  if (d === 1) { g.add(10); if (S.dotsEaten % 2) g.sfx.tone(440, 0.05, 'triangle', 0.04); else g.sfx.tone(520, 0.05, 'triangle', 0.04); }
  else {
    g.add(50); S.fright = Math.max(1.5, 7 - S.level * 0.6); S.chain = 0; g.sfx.power();
    S.ghosts.forEach((gh) => { if (!gh.house && gh.mode !== 'eyes') { gh.mode = 'fright'; if (gh.dir) { if (gh.t > 0) { gh.tx += gh.dir[0]; gh.ty += gh.dir[1]; gh.t = 1 - gh.t; } gh.dir = [-gh.dir[0], -gh.dir[1]]; } } });
  }
  if (S.dotsEaten === 70 || S.dotsEaten === 170) S.fruit = { t: 9 };
}
function resetPos() {
  S.pac = { tx: 13, ty: 23, t: 0, dir: [-1, 0] };
  S.want = [-1, 0];
  S.ghosts = [0, 1, 2, 3].map((i) => ({ i, tx: i === 0 ? 13 : 11 + i, ty: i === 0 ? 11 : 14, t: 0, dir: i === 0 ? [-1, 0] : null, house: i !== 0, release: i * 3, need: [0, 0, 30, 60][i], mode: 'norm' }));
  S.fright = 0; S.modeT = 0; S.ready = true;
}
function newLevel(g, first) {
  S.dots = MAP.map((r) => [...r].map((ch) => (ch === '.' ? 1 : ch === 'o' ? 2 : 0)));
  S.dotsLeft = S.dots.flat().filter(Boolean).length; S.dotsEaten = 0; S.fruit = null;
  resetPos();
  S.pause = first ? 2 : 1.5;
}
