let S;
const T = 40, CW = 24, CH = 15;
const ROOMS = {
  '0,0': { n: '왕국 입구', m: [
    '########################', '#......................#', '#......................#', '#......................#', '#......................#',
    '#.............====.....#', '#......................#', '#......====............#', '#......................#', '#......................#',
    '#.......................', '#.B.....................', '#.......................', '########################', '########################'] },
  '1,0': { n: '잊혀진 갈림길', m: [
    '########################', '#......................#', '#......................#', '#..........f...........#', '#.....########.........#',
    '#......................#', '#..===.............===.#', '#......................#', '#........######........#', '#......................#',
    '........................', '........................', '....c............c......', '##########....##########', '##########....##########'] },
  '2,0': { n: '거짓 기사의 투기장', boss: 'fk', m: [
    '########################', '#......................#', '#......................#', '#......................#', '#......................#',
    '#......................#', '#..===............===..#', '#......................#', '#......................#', '#......................#',
    '.......................G', '.......................G', '.......................G', '########################', '########################'] },
  '3,0': { n: '날개의 사당', m: [
    '########################', '#......................#', '#......................#', '#......................#', '#......................#',
    '#......................#', '#..............######..#', '#......................#', '#.........====.........#', '#......................#',
    '.......................#', '.......................#', '........B..........W...#', '########################', '########################'] },
  '1,1': { n: '버섯 동굴', m: [
    '##########....##########', '#......................#', '#......===.............g', '#......................g', '#..........===.........g',
    '#.................######', '#..............===.....#', '#.........===..........#', '#......................#', '#.....===..............#',
    '#.........h............#', '#......................#', '#..c............c......#', '########################', '########################'] },
  '2,1': { n: '가시 협곡', m: [
    '########################', '#......................#', '........#..............#', '........#.......f......#', '........#..............#',
    '#########......====....#', '#......................#', '#......................#', '#..M..........====.....#', '#.====...#.............#',
    '#........#..............', '#........#...=====......', '#^^^^^^^^#^^^^^^^^^.....', '########################', '########################'] },
  '3,1': { n: '호넷의 둥지', boss: 'hornet', m: [
    '########################', '#......................#', '#......................#', '#......................#', '#......................#',
    '#......................#', '#...===..........===...#', '#......................#', '#......................#', '#......................#',
    '.......................#', '.......................#', '.......................#', '##########GGGG##########', '##########....##########'] },
  '3,2': { n: '깊은 둥지', m: [
    '##########....##########', '#......................#', '#......................#', '#.........====.........#', '#......................#',
    '#..====..........====..#', '#......................#', '#.........====.........#', '#......................#', '#......................#',
    '.......................#', '.......................#', '......B..........P.....#', '########################', '########################'] },
  '2,2': { n: '심연의 가장자리', m: [
    '########################', '#......................#', '#......................#', '#.........f............#', '#......................#',
    '#......................#', '#.........N............#', '#........###...........#', '#......................#', '#......................#',
    '...........==...........', '........................', '....s..............h....', '#######^^^^^^^^^^#######', '########################'] },
  '1,2': { n: '공허의 왕좌', boss: 'king', m: [
    '########################', '#......................#', '#......................#', '#......................#', '#......................#',
    '#......................#', '#....===........===....#', '#......................#', '#......................#', '#......................#',
    '#.......................', '#.......................', '#.......................', '########################', '########################'] },
};
const BOSSN = { fk: '거짓 기사', hornet: '호넷', king: '공허의 왕' };
GAME({
  title: '공허의 기사', w: 960, h: 600, bg: '#0a0f1a', controls: 'dpad+ab', aLabel: '점프', bLabel: '베기',
  help: '←→ 이동 · Space/Z 점프 (벽에 붙어 점프 = 벽점프)\nX/K 못 베기 (↑/↓ + 베기 = 위/아래 베기, 아래 베기로 적·가시 위 튕기기)\nC/L 대시 · Q 꾹 = 회복 (소울 33) · E = 영혼탄 (습득 후)\n화면 우하단 버튼 터치로도 대시/회복/영혼탄 · 🪑 의자 = 저장\n벌레 왕국을 탐험해 세 보스를 쓰러뜨려라',
  init(g) {
    S = { room: '0,0', masks: 5, maxM: 5, soul: 0, geo: 0, has: { dash: true, wall: true, double: false, spell: false }, nail: 1, bosses: {}, taken: {}, bench: { room: '0,0', x: 100, y: 12 * T }, lives: 4, visited: {}, msg: null, deaths: 0 };
    enter(g, '0,0', 100, 12 * T - 34, null);
  },
  update(g, dt) {
    if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
    if (S.dead) { S.dead -= dt; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`영혼이 흩어졌다... 격파 보스 ${Object.keys(S.bosses).length}/3`); S.masks = S.maxM; S.geo = Math.floor(S.geo / 2); enter(g, S.bench.room, S.bench.x, S.bench.y - 34, null); } return; }
    if (S.won) { S.won -= dt; if (S.won <= 0) return g.win(`공허의 왕을 봉인했다! 지오 ${S.geo} · 사망 ${S.deaths}`); return; }
    player(g, dt);
    if (S.dead) return;
    enemies(g, dt);
    if (S.boss) boss(g, dt);
    shots(g, dt);
    pickups(g, dt);
    transitions(g);
    g.info = `${ROOMS[S.room].n} · 🪙${S.geo} · 남은 목숨 ${S.lives}`;
  },
  draw(g, c) { drawAll(g, c); },
});
function tile(x, y) { const r = ROOMS[S.room].m; return r[y]?.[x] ?? '#'; }
function solid(x, y) {
  if (x < 0 || x >= CW || y < 0 || y >= CH) return false;
  const t = tile(x, y);
  if (t === '#') return true;
  if (t === 'G') return !S.bosses[ROOMS[S.room].boss];
  if (t === 'g') return !S.has.double;
  if (S.fight && t !== '#' && (x === 0 || x === CW - 1 || y === 0 || y === CH - 1)) return true;
  return false;
}
function enter(g, room, x, y, dir) {
  S.room = room; S.visited[room] = true;
  const R = ROOMS[room];
  const P = S.p || {};
  S.p = Object.assign({ w: 22, h: 34, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buf: 0, jumps: 1, dashT: 0, dashCd: 0, canDash: true, wall: 0, lock: 0, inv: 0, atkT: 0, atkCd: 0, atkDir: 'f', focus: 0, safe: null, anim: 0, hurtT: 0 }, { face: P.face || 1 });
  const p = S.p; p.x = x; p.y = y;
  if (dir === 'up') p.vy = -680;
  S.ens = []; S.eb = []; S.ps = []; S.items = []; S.fx = []; S.boss = null; S.fight = false;
  R.m.forEach((row, ty) => [...row].forEach((ch, tx) => {
    const px = tx * T, py = ty * T;
    if ('cfhs'.includes(ch)) S.ens.push(mkE(ch, px, py));
    if ('WPMN'.includes(ch) && !S.taken[room + ch]) S.items.push({ k: ch, x: px + 20, y: py + 20 });
    if (ch === 'B') S.benchPos = { x: px + 20, y: py + 40 };
    if (ch === 'X') S.bossSpawn = { x: px, y: py };
  }));
  if (!R.m.some((r) => r.includes('B'))) S.benchPos = null;
  S.roomT = 0; S.title = R.n; S.titleT = S.visited[room + '_t'] ? 0 : 2; S.visited[room + '_t'] = true;
  p.safe = { x: p.x, y: p.y };
}
function mkE(k, x, y) {
  const e = { k, x: x + 4, y: y + 6, w: 32, h: 34, vx: 0, vy: 0, hp: 2, t: Math.random() * 2, flash: 0, face: -1, kb: 0 };
  if (k === 'c') { e.vx = -60; e.hp = 2; }
  if (k === 'f') { e.hp = 2; e.fly = true; }
  if (k === 'h') { e.hp = 3; }
  if (k === 's') { e.hp = 3; }
  return e;
}
function move(o, dt) {
  o.hitL = o.hitR = false; o.ground = false;
  o.x += o.vx * dt;
  const y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = tx * T - o.w - 0.01; o.hitR = true; break; } }
  else if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) { o.x = (tx + 1) * T; o.hitL = true; break; } }
  const pb = o.y + o.h;
  o.y += o.vy * dt;
  const x0 = Math.floor((o.x + 1) / T), x1 = Math.floor((o.x + o.w - 1) / T);
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = x0; x <= x1; x++) if (solid(x, ty) || (tile(x, ty) === '=' && pb <= ty * T + 2 && !o.dropT)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; break; } }
  else if (o.vy < 0) { const ty = Math.floor(o.y / T); for (let x = x0; x <= x1; x++) if (solid(x, ty)) { o.y = (ty + 1) * T; o.vy = 0; break; } }
}
function touchWall(o, side) { const tx = side > 0 ? Math.floor((o.x + o.w + 2) / T) : Math.floor((o.x - 2) / T); const y0 = Math.floor((o.y + 4) / T), y1 = Math.floor((o.y + o.h - 4) / T); for (let y = y0; y <= y1; y++) if (solid(tx, y)) return true; return false; }
function btn(g, i) { return g.mouse.clicked && g.inRect(g.W - 250 + i * 82, g.H - 66, 74, 54); }
function player(g, dt) {
  const P = S.p;
  P.inv -= dt; P.atkCd -= dt; P.dashCd -= dt; P.lock -= dt; P.hurtT -= dt; S.roomT += dt; S.titleT -= dt;
  const dir = g.right - g.left;
  if (P.dashT > 0) {
    P.dashT -= dt; P.vx = P.face * 760; P.vy = 0; move(P, dt);
    S.fx.push({ x: P.x + 11, y: P.y + 17, t: 0.2, ghost: true, f: P.face });
    if (P.dashT <= 0) P.vx = P.face * 200;
    return hazards(g);
  }
  // 회복 (집중)
  const focusKey = g.key('KeyQ') || (S.focusTouch > 0);
  if (S.focusTouch > 0) S.focusTouch -= dt;
  if (btn(g, 1)) S.focusTouch = 1.0;
  if (focusKey && P.ground && S.soul >= 33 && S.masks < S.maxM) {
    P.focus += dt; P.vx = 0;
    if (Math.random() < 0.5) S.fx.push({ x: P.x + 11 + U.rand(-30, 30), y: P.y + 40, t: 0.5, soul: true });
    if (P.focus >= 0.9) { P.focus = 0; S.soul -= 33; S.masks++; g.sfx.power(); g.burst(P.x + 11, P.y + 17, ['#fff', '#e0f2fe'], 20, 200); }
    P.vy = Math.min(P.vy + 1800 * dt, 900); move(P, dt); return;
  } else P.focus = 0;
  if (P.lock <= 0 && P.hurtT <= 0) { P.vx = dir * 260; if (dir) P.face = dir; }
  else if (P.hurtT > 0) P.vx *= Math.pow(0.1, dt);
  // 벽 슬라이드
  P.wall = 0;
  if (!P.ground && S.has.wall && dir && touchWall(P, dir) && P.vy > -100) { P.wall = dir; P.vy = Math.min(P.vy, 130); P.jumps = S.has.double ? 1 : 0; P.canDash = true; }
  P.coyote = P.ground ? 0.1 : P.coyote - dt;
  P.buf = g.pressed('a') ? 0.12 : P.buf - dt;
  if (P.buf > 0) {
    if (P.coyote > 0) { P.vy = -640; P.buf = 0; P.coyote = 0; g.sfx.jump(); }
    else if (P.wall) { P.vy = -600; P.vx = -P.wall * 380; P.face = -P.wall; P.lock = 0.16; P.buf = 0; P.wall = 0; g.sfx.jump(); S.fx.push({ x: P.x + 11, y: P.y + 17, t: 0.3, ring: true }); }
    else if (P.jumps > 0 && S.has.double) { P.vy = -580; P.jumps--; P.buf = 0; g.sfx.tone(700, 0.15, 'triangle', 0.05, 1100); S.fx.push({ x: P.x + 11, y: P.y + 30, t: 0.35, wings: true }); }
  }
  if (!g.a && P.vy < -200) P.vy = -200;
  if (P.ground) { P.jumps = S.has.double ? 1 : 0; P.canDash = true; }
  // 대시
  if ((g.keyp('KeyC') || g.keyp('KeyL') || btn(g, 0)) && P.dashCd <= 0 && P.canDash && S.has.dash) { P.dashT = 0.17; P.dashCd = 0.45; P.canDash = P.ground; if (dir) P.face = dir; g.sfx.tone(300, 0.12, 'sawtooth', 0.04, 120); return; }
  // 영혼탄
  if ((g.keyp('KeyE') || btn(g, 2)) && S.has.spell && S.soul >= 33) { S.soul -= 33; S.ps.push({ x: P.x + 11, y: P.y + 16, vx: P.face * 700, r: 18, dmg: 3, hits: new Set(), t: 0 }); P.vx = -P.face * 120; g.sfx.tone(200, 0.35, 'sawtooth', 0.07, 600); g.shake(3, 0.1); }
  // 베기
  if (g.pressed('b') && P.atkCd <= 0) {
    P.atkCd = 0.32; P.atkT = 0.14; P.atkDir = g.up ? 'u' : (g.down && !P.ground) ? 'd' : 'f'; P.hitSet = new Set();
    g.sfx.tone(900, 0.06, 'square', 0.03, 300);
  }
  if (P.atkT > 0) { P.atkT -= dt; slash(g); }
  P.dropT = g.down && g.pressed('a') ? 0.2 : Math.max(0, (P.dropT || 0) - dt);
  P.vy = Math.min(P.vy + 1800 * dt, P.wall ? 130 : 900);
  move(P, dt);
  P.anim += Math.abs(P.vx) * dt;
  if (P.ground && !hazardAt(P)) P.safe = { x: P.x, y: P.y };
  hazards(g);
  if (S.benchPos && Math.abs(P.x + 11 - S.benchPos.x) < 30 && Math.abs(P.y + 34 - S.benchPos.y) < 10 && (S.bench.room !== S.room || S.masks < S.maxM)) {
    S.bench = { room: S.room, x: S.benchPos.x - 11, y: S.benchPos.y }; S.masks = S.maxM; g.sfx.power(); msg('🪑 의자에서 쉬었다 — 체력 회복, 저장 완료'); g.burst(S.benchPos.x, S.benchPos.y - 30, ['#fde68a', '#fff'], 16, 120);
  }
  // 보스 시작
  const R = ROOMS[S.room];
  if (R.boss && !S.bosses[R.boss] && !S.boss && S.roomT > 0.3 && P.x > 4 * T && P.x < 20 * T) startBoss(g, R.boss);
}
function hazardAt(P) { const x0 = Math.floor((P.x + 3) / T), x1 = Math.floor((P.x + P.w - 3) / T), y0 = Math.floor((P.y + 6) / T), y1 = Math.floor((P.y + P.h - 1) / T); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tile(x, y) === '^') return true; return false; }
function hazards(g) {
  const P = S.p;
  if (hazardAt(P) && P.inv <= 0) { hurt(g, 1, P.x + 11); if (!S.dead) { P.x = P.safe.x; P.y = P.safe.y; P.vx = P.vy = 0; P.hurtT = 0; } }
}
function slashBox() {
  const P = S.p;
  if (P.atkDir === 'u') return { x: P.x - 18, y: P.y - 58, w: 58, h: 62 };
  if (P.atkDir === 'd') return { x: P.x - 18, y: P.y + P.h - 6, w: 58, h: 60 };
  return { x: P.face > 0 ? P.x + P.w : P.x - 70, y: P.y - 6, w: 70, h: 44 };
}
function slash(g) {
  const P = S.p, B = slashBox(), dmg = S.nail;
  let pogo = false;
  for (const e of S.ens) if (!e.dead && !P.hitSet.has(e) && U.rectHit(B, e)) { P.hitSet.add(e); hitE(g, e, dmg); pogo = true; if (P.atkDir === 'f') P.vx = -P.face * 200, P.lock = 0.08; }
  if (S.boss && !P.hitSet.has(S.boss) && S.boss.hp > 0 && U.rectHit(B, S.boss)) { P.hitSet.add(S.boss); hitBoss(g, dmg); pogo = true; if (P.atkDir === 'f') { P.vx = -P.face * 260; P.lock = 0.1; } }
  for (const b of S.eb) if (!b.dead && b.parry && U.circRect(b, B)) { b.dead = true; g.sfx.tone(1500, 0.08, 'square', 0.05); pogo = true; }
  if (P.atkDir === 'd') { const x0 = Math.floor(B.x / T), x1 = Math.floor((B.x + B.w) / T), y0 = Math.floor(B.y / T), y1 = Math.floor((B.y + B.h) / T); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tile(x, y) === '^') pogo = true; }
  if (pogo && P.atkDir === 'd' && !P.pogoDone) { P.vy = -560; P.jumps = S.has.double ? 1 : 0; P.canDash = true; P.pogoDone = true; g.sfx.bounce(); }
  if (P.atkT <= 0.02) P.pogoDone = false;
}
function hitE(g, e, dmg) {
  e.hp -= dmg; e.flash = 0.15; e.kb = 0.15; e.kbx = Math.sign(e.x - S.p.x) * 260;
  S.soul = Math.min(99, S.soul + 11); g.sfx.hit(); g.shake(2, 0.08);
  g.burst(e.x + e.w / 2, e.y + e.h / 2, ['#fff', '#cbd5e1'], 8, 200, 0.3);
  if (e.hp <= 0) { e.dead = true; g.add(50); g.burst(e.x + e.w / 2, e.y + e.h / 2, ['#f97316', '#fde68a', '#fff'], 16, 240); for (let i = 0; i < U.randi(2, 5); i++) S.items.push({ k: 'geo', x: e.x + e.w / 2, y: e.y + 10, vx: U.rand(-150, 150), vy: U.rand(-400, -200) }); }
}
function hurt(g, n, fromX) {
  const P = S.p;
  if (P.inv > 0 || S.dead || S.won) return;
  S.masks -= n; P.inv = 1.3; P.hurtT = 0.25; P.vx = (P.x + 11 < fromX ? -1 : 1) * 300; P.vy = -300; P.focus = 0; P.dashT = 0;
  g.sfx.hit(); g.shake(8, 0.3); S.hitFlash = 0.15;
  if (S.masks <= 0) { S.dead = 2.2; S.deaths++; g.sfx.lose(); g.burst(P.x + 11, P.y + 17, ['#000', '#fff', '#64748b'], 40, 300, 1, 5); S.fight = false; }
}
function enemies(g, dt) {
  const P = S.p;
  for (const e of S.ens) {
    if (e.dead) continue;
    e.t += dt; e.flash -= dt;
    const toP = P.x < e.x ? -1 : 1;
    if (e.kb > 0) { e.kb -= dt; e.vx = e.kbx; if (e.fly) { e.x += e.vx * dt; } else { e.vy = Math.min(e.vy + 1800 * dt, 900); move(e, dt); } if (e.kb <= 0) e.vx = e.k === 'c' ? 60 * toP : 0; continue; }
    if (e.k === 'c') { e.vy = Math.min(e.vy + 1800 * dt, 900); const v = e.vx || -60; e.vx = v; move(e, dt); if (e.hitL || e.hitR) e.vx = -v; if (e.ground) { const ax = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / T), by = Math.floor((e.y + e.h + 4) / T); if (!solid(ax, by) && tile(ax, by) !== '=') e.vx = -e.vx; } e.face = Math.sign(e.vx); }
    if (e.k === 'f') { const d = U.dist(e.x, e.y, P.x, P.y); if (d < 360) { const a = Math.atan2(P.y - e.y, P.x - e.x); e.vx += Math.cos(a) * 300 * dt; e.vy += Math.sin(a) * 300 * dt; } e.vy += Math.sin(e.t * 3) * 20 * dt; e.vx *= 0.98; e.vy *= 0.98; const sp = Math.hypot(e.vx, e.vy); if (sp > 140) { e.vx *= 140 / sp; e.vy *= 140 / sp; } move(e, dt); e.face = Math.sign(e.vx) || -1; }
    if (e.k === 'h') { e.vy = Math.min(e.vy + 1800 * dt, 900); if (e.ground) { e.vx = 0; if (e.t > 1.4 && Math.abs(P.x - e.x) < 420) { e.t = 0; e.vy = -620; e.vx = toP * 200; } } move(e, dt); e.face = toP; }
    if (e.k === 's') { e.vy = Math.min(e.vy + 1800 * dt, 900); e.vx = 0; move(e, dt); e.face = toP; if (e.t > 2.4 && Math.abs(P.x - e.x) < 600) { e.t = 0; const dx = P.x - e.x; S.eb.push({ x: e.x + 16, y: e.y, vx: dx / 1.1, vy: -560, grav: 1000, r: 10, e: '🟠' }); g.sfx.pop(); } }
    if (U.rectHit(P, e)) hurt(g, 1, e.x + e.w / 2);
  }
  S.ens = S.ens.filter((e) => !e.dead);
}
function shots(g, dt) {
  const P = S.p;
  for (const s of S.ps) { s.x += s.vx * dt; s.t += dt; if (s.x < -40 || s.x > g.W + 40) s.dead = true; for (const e of S.ens) if (!e.dead && !s.hits.has(e) && U.circRect(s, e)) { s.hits.add(e); hitE(g, e, s.dmg); } if (S.boss && !s.hits.has(S.boss) && U.circRect(s, S.boss)) { s.hits.add(S.boss); hitBoss(g, s.dmg, true); } S.fx.push({ x: s.x, y: s.y, t: 0.25, soul: true }); }
  S.ps = S.ps.filter((s) => !s.dead);
  for (const b of S.eb) {
    if (b.grav) b.vy += b.grav * dt;
    if (b.home) { const a = Math.atan2(P.y + 17 - b.y, P.x + 11 - b.x); b.vx += Math.cos(a) * 500 * dt; b.vy += Math.sin(a) * 500 * dt; const sp = Math.hypot(b.vx, b.vy); if (sp > 230) { b.vx *= 230 / sp; b.vy *= 230 / sp; } }
    if (b.boomer) { b.vx -= b.dir * 900 * dt; if (Math.abs(b.x - b.ox) < 20 && b.t > 0.5) b.dead = true; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.t = (b.t || 0) + dt;
    if (b.pillar) { b.life -= dt; if (b.life <= 0) b.dead = true; if (b.life < 0.55 && b.life > 0 && Math.abs(P.x + 11 - b.x) < 26) hurt(g, 1, b.x); continue; }
    if (b.wave) { b.life -= dt; if (b.life <= 0) b.dead = true; }
    if (b.x < -60 || b.x > g.W + 60 || b.y > g.H + 40 || b.t > 7) b.dead = true;
    if (!b.boomer && !b.wave && b.grav && solid(Math.floor(b.x / T), Math.floor((b.y + b.r) / T))) { b.dead = true; g.burst(b.x, b.y, '#fb923c', 8, 120, 0.3); }
    if (!b.dead && U.circRect(b, P)) { hurt(g, 1, b.x); if (!b.boomer && !b.wave) b.dead = true; }
  }
  S.eb = S.eb.filter((b) => !b.dead);
  S.fx = S.fx.filter((f) => (f.t -= dt) > 0);
  S.hitFlash = (S.hitFlash || 0) - dt;
}
function pickups(g, dt) {
  const P = S.p;
  for (const it of S.items) {
    if (it.k === 'geo') { it.vy += 1300 * dt; it.x += it.vx * dt; it.y += it.vy * dt; const ty = Math.floor((it.y + 8) / T), tx = Math.floor(it.x / T); if (it.vy > 0 && (solid(tx, ty) || tile(tx, ty) === '=')) { it.y = ty * T - 8; it.vy *= -0.4; it.vx *= 0.7; } if (U.dist(it.x, it.y, P.x + 11, P.y + 17) < 30) { it.got = true; S.geo++; g.score += 10; g.sfx.coin(); } continue; }
    if (U.dist(it.x, it.y, P.x + 11, P.y + 17) < 34) {
      it.got = true; S.taken[S.room + it.k] = true; g.sfx.win(); g.shake(4, 0.3); g.add(500);
      if (it.k === 'W') { S.has.double = true; msg('🦋 군주의 날개 획득! 공중에서 한 번 더 점프 — 날개 문이 열린다'); }
      if (it.k === 'P') { S.has.spell = true; msg('👻 복수의 영혼 습득! E키로 영혼탄 발사 (소울 33)'); }
      if (it.k === 'M') { S.maxM++; S.masks = S.maxM; msg('🎭 가면 조각! 최대 체력 +1'); }
      if (it.k === 'N') { S.nail = 2; msg('🗡️ 못 강화! 공격력 2배'); }
    }
  }
  S.items = S.items.filter((i) => !i.got);
}
function msg(t) { S.msg = { t: 4, s: t }; }
function transitions(g) {
  const P = S.p, [cx, cy] = S.room.split(',').map(Number);
  let nk = null, nx = P.x, ny = P.y, dir = null;
  if (P.x + P.w < 0) { nk = `${cx - 1},${cy}`; nx = g.W - P.w - 6; }
  else if (P.x > g.W) { nk = `${cx + 1},${cy}`; nx = 6; }
  else if (P.y > g.H) { nk = `${cx},${cy + 1}`; ny = 2; }
  else if (P.y + P.h < 0) { nk = `${cx},${cy - 1}`; ny = g.H - P.h - 4; dir = 'up'; }
  if (!nk) return;
  if (!ROOMS[nk]) { P.x = U.clamp(P.x, 0, g.W - P.w); if (P.y > g.H) { hurt(g, 1, P.x); P.x = P.safe.x; P.y = P.safe.y; } return; }
  const vx = P.vx, vy = P.vy;
  enter(g, nk, nx, ny, dir);
  S.p.vx = vx; if (dir !== 'up') S.p.vy = Math.max(0, vy);
}
// ---------- 보스 ----------
function startBoss(g, k) {
  S.fight = true;
  const sp = S.bossSpawn || { x: 600, y: 400 };
  const hp = { fk: 30, hornet: 34, king: 50 }[k];
  S.boss = { k, x: sp.x, y: 100, w: k === 'fk' ? 80 : 40, h: k === 'fk' ? 90 : 60, vx: 0, vy: 0, hp, max: hp, t: 1.6, st: 'intro', face: -1, flash: 0, n: 0 };
  g.sfx.tone(70, 1.2, 'sawtooth', 0.09, 40); g.shake(6, 0.8); msg(`⚔️ ${BOSSN[k]}`);
}
function hitBoss(g, dmg, spell) {
  const B = S.boss; if (!B || B.hp <= 0) return;
  B.hp -= dmg; B.flash = 0.12; if (!spell) S.soul = Math.min(99, S.soul + 11);
  g.sfx.hit(); g.shake(3, 0.1); g.burst(B.x + B.w / 2, B.y + B.h / 2, ['#fff', '#e2e8f0'], 10, 240, 0.3);
  if (B.k === 'fk' && B.hp > 0 && B.hp % 10 === 0 && !B.stag) { B.st = 'stagger'; B.t = 2.2; B.stag = true; }
  if (B.hp <= 0) {
    S.bosses[B.k] = true; S.fight = false; S.eb = [];
    g.add({ fk: 3000, hornet: 5000, king: 10000 }[B.k], B.x, B.y); g.sfx.explode(); g.shake(12, 0.8);
    g.burst(B.x + B.w / 2, B.y + B.h / 2, ['#fff', '#000', '#94a3b8', '#fde68a'], 60, 400, 1.2, 6);
    for (let i = 0; i < 25; i++) S.items.push({ k: 'geo', x: B.x + B.w / 2, y: B.y + 10, vx: U.rand(-250, 250), vy: U.rand(-600, -200) });
    msg(B.k === 'king' ? '공허가 잠잠해졌다...' : `${BOSSN[B.k]} 격파! 길이 열렸다`);
    if (B.k === 'king') S.won = 3;
    S.boss = null;
  }
}
function boss(g, dt) {
  const B = S.boss, P = S.p;
  B.t -= dt; B.flash -= dt;
  const toP = P.x + 11 < B.x + B.w / 2 ? -1 : 1, cx = B.x + B.w / 2, enr = B.hp < B.max / 2 ? 1.3 : 1;
  const grav = () => { B.vy = Math.min(B.vy + 1800 * dt, 900); move(B, dt); };
  if (B.st === 'intro') { grav(); if (B.t <= 0) { B.st = 'idle'; B.t = 0.6; } return touchBoss(g); }
  if (B.st === 'stagger') { grav(); B.vx = 0; if (B.t <= 0) { B.st = 'idle'; B.t = 0.4; B.stag = false; } return; }
  if (B.k === 'fk') {
    grav();
    if (B.st === 'idle') { B.vx = 0; B.face = toP; if (B.t <= 0) { const r = Math.random(); if (r < 0.4) { B.st = 'leap'; B.vy = -820; B.vx = (P.x - B.x) * 0.9; B.t = 3; } else if (r < 0.75) { B.st = 'swing'; B.t = 0.9; } else { B.st = 'charge'; B.t = 1.0; } } }
    else if (B.st === 'leap') { if (B.ground && B.vy === 0) { B.st = 'idle'; B.t = 0.9 / enr; B.vx = 0; g.shake(10, 0.3); g.sfx.explode(); for (const d of [-1, 1]) S.eb.push({ x: cx, y: 12 * T + 20, vx: d * 420, vy: 0, r: 20, wave: true, life: 1.6, e: '💥' }); } }
    else if (B.st === 'swing') { B.vx = 0; if (B.t < 0.45 && !B.did) { B.did = true; g.sfx.explode(); g.shake(6, 0.2); S.fx.push({ x: cx + B.face * 70, y: B.y + 60, t: 0.25, mace: true }); if (Math.abs(P.x + 11 - (cx + B.face * 70)) < 80 && Math.abs(P.y + 17 - (B.y + 60)) < 70) hurt(g, 1, cx); } if (B.t <= 0) { B.st = 'idle'; B.t = 0.7 / enr; B.did = false; } }
    else if (B.st === 'charge') { B.vx = B.face * 360 * enr; if (B.hitL || B.hitR || B.t <= 0) { B.st = 'idle'; B.t = 0.8; B.vx = 0; if (B.hitL || B.hitR) { g.shake(8, 0.3); g.sfx.explode(); for (let i = 0; i < 4; i++) S.eb.push({ x: U.rand(60, 900), y: -20, vx: 0, vy: 0, grav: 900, r: 14, e: '🪨' }); } } }
  }
  if (B.k === 'hornet') {
    if (B.st === 'idle') { grav(); B.vx = 0; B.face = toP; if (B.t <= 0) { const r = Math.random(); if (r < 0.3) { B.st = 'lunge'; B.t = 0.35; } else if (r < 0.55) { B.st = 'throw'; B.t = 0.4; } else if (r < 0.8) { B.st = 'jump'; B.vy = -760; B.vx = toP * 160; B.t = 2; } else { B.st = 'spin'; B.t = 1.2; } } }
    else if (B.st === 'lunge') { if (B.t > 0.2) { B.vx = 0; } else { B.vx = B.face * 720 * enr; } grav(); if (B.t <= -0.35 || B.hitL || B.hitR) { B.st = 'idle'; B.t = 0.5 / enr; } }
    else if (B.st === 'throw') { grav(); if (B.t <= 0 && !B.did) { B.did = true; S.eb.push({ x: cx, y: B.y + 30, ox: cx, vx: B.face * 760, vy: 0, dir: B.face, r: 14, boomer: true, e: '🪡', t: 0 }); g.sfx.shoot(); } if (B.t <= -0.9) { B.st = 'idle'; B.t = 0.4; B.did = false; } }
    else if (B.st === 'jump') { grav(); if (B.vy > -100 && !B.did) { B.did = true; B.st = 'dive'; const a = Math.atan2(P.y - B.y, P.x - B.x); B.dvx = Math.cos(a) * 640; B.dvy = Math.max(200, Math.sin(a) * 640); B.t = 0.25; } }
    else if (B.st === 'dive') { if (B.t > 0) { B.vx = 0; B.vy = 0; } else { B.vx = B.dvx * enr; B.vy = B.dvy * enr; move(B, dt); } if (B.t <= 0 && (B.ground || B.hitL || B.hitR || B.t < -1)) { B.st = 'idle'; B.t = 0.6; B.did = false; } }
    else if (B.st === 'spin') { grav(); B.vx = 0; if (B.t < 0.9 && B.t > 0.2 && U.dist(cx, B.y + 30, P.x + 11, P.y + 17) < 110) hurt(g, 1, cx); if (B.t <= 0) { B.st = 'idle'; B.t = 0.5; } }
  }
  if (B.k === 'king') {
    if (B.st === 'idle') { grav(); B.vx = 0; B.face = toP; if (B.t <= 0) { const r = Math.random(); B.n++; if (r < 0.28) { B.st = 'dash'; B.t = 0.45; } else if (r < 0.5) { B.st = 'pillars'; B.t = 1.4; } else if (r < 0.72) { B.st = 'orbs'; B.t = 1.2; } else { B.st = 'slam'; B.vy = -900; B.vx = (P.x - B.x) * 1.0; B.t = 3; } } }
    else if (B.st === 'dash') { if (B.t > 0.15) B.vx = 0; else B.vx = B.face * 800 * enr; grav(); if (B.t <= -0.4 || B.hitL || B.hitR) { B.st = 'idle'; B.t = 0.45 / enr; } }
    else if (B.st === 'pillars') { grav(); B.vx = 0; if (!B.did) { B.did = true; const n = enr > 1 ? 5 : 3; for (let i = 0; i < n; i++) g.later(() => { if (S.boss) { S.eb.push({ x: U.clamp(S.p.x + 11 + U.rand(-60, 60), 40, 920), y: 260, vx: 0, vy: 0, r: 1, pillar: true, life: 1.1 }); g.sfx.tone(120, 0.3, 'sawtooth', 0.05); } }, i * 0.35); } if (B.t <= 0) { B.st = 'idle'; B.t = 0.6; B.did = false; } }
    else if (B.st === 'orbs') { grav(); B.vx = 0; if (!B.did) { B.did = true; for (let i = 0; i < (enr > 1 ? 4 : 3); i++) { const a = -Math.PI / 2 + (i - 1) * 0.7; S.eb.push({ x: cx, y: B.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 13, home: true, e: '🟣', parry: true }); } g.sfx.tone(300, 0.4, 'sine', 0.06, 100); } if (B.t <= 0) { B.st = 'idle'; B.t = 0.8; B.did = false; } }
    else if (B.st === 'slam') { grav(); if (B.ground && B.vy === 0 && B.t < 2.9) { B.st = 'idle'; B.t = 0.7 / enr; B.vx = 0; g.shake(12, 0.3); g.sfx.explode(); for (const d of [-1, 1]) S.eb.push({ x: cx, y: 12 * T + 20, vx: d * 460, vy: 0, r: 20, wave: true, life: 1.6, e: '🌑' }); } }
  }
  B.x = U.clamp(B.x, T, g.W - T - B.w);
  touchBoss(g);
}
function touchBoss(g) { const B = S.boss, P = S.p; if (B && U.rectHit(P, B) && B.st !== 'stagger') hurt(g, 1, B.x + B.w / 2); }
// ---------- 그리기 ----------
function drawAll(g, c) {
  const R = ROOMS[S.room], [cx, cy] = S.room.split(',').map(Number);
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, cy === 2 ? '#05070d' : cy === 1 ? '#0b1420' : '#101a2a'); grd.addColorStop(1, cy === 2 ? '#141026' : '#1b2a3a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 18; i++) { const x = (i * 211 + cx * 97) % g.W, y = (i * 137 + cy * 53) % g.H; g.circle(x, y + Math.sin(g.time + i) * 6, 2, 'rgba(186,230,253,.25)'); }
  for (let i = 0; i < 6; i++) { const x = (i * 180 + cx * 60) % 1000 - 20; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(x, g.H); c.quadraticCurveTo(x + 40, 200 + (i % 3) * 60, x + 20, 0); c.lineTo(x + 60, 0); c.quadraticCurveTo(x + 80, 260, x + 90, g.H); c.fill(); }
  // 타일
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const t = R.m[y][x], px = x * T, py = y * T;
    if (t === '#' || (S.fight && t === '.' && (x === 0 || x === CW - 1 || y === 0 || y === CH - 1))) { g.rect(px, py, T, T, '#1e293b'); if (tile(x, y - 1) !== '#') { g.rect(px, py, T, 6, '#475569'); g.circle(px + 10, py + 3, 4, '#64748b'); } if (tile(x + 1, y) !== '#' || tile(x - 1, y) !== '#') g.rect(px + (tile(x + 1, y) !== '#' ? T - 4 : 0), py, 4, T, '#334155'); }
    else if (t === '=') { g.rect(px, py, T, 10, '#64748b'); g.rect(px + 4, py + 10, 4, 8, '#334155'); g.rect(px + 32, py + 10, 4, 8, '#334155'); }
    else if (t === '^') { for (let k = 0; k < 4; k++) g.poly([[px + k * 10, py + T], [px + k * 10 + 5, py + 10], [px + k * 10 + 10, py + T]], '#e2e8f0', '#475569', 1); }
    else if (t === 'G' && solid(x, y)) { g.rect(px + 6, py, T - 12, T, '#57534e'); for (let k = 0; k < 4; k++) g.rect(px + 6, py + k * 10, T - 12, 3, '#a8a29e'); }
    else if (t === 'g' && solid(x, y)) { g.rect(px, py, T, T, 'rgba(147,197,253,.25)'); g.emoji('🦋', px + 20, py + 20, 22); }
    else if (t === 'B') { g.rrect(px - 6, py + 18, 52, 10, 3, '#a16207'); g.rect(px - 2, py + 28, 5, 12, '#78350f'); g.rect(px + 37, py + 28, 5, 12, '#78350f'); g.rect(px - 6, py + 2, 6, 18, '#a16207'); }
    else if (t === 'P' && !S.taken[S.room + 'P']) {}
  }
  for (const it of S.items) {
    if (it.k === 'geo') { g.circle(it.x, it.y, 7, '#e5e7eb'); g.circle(it.x - 2, it.y - 2, 3, '#fff'); continue; }
    const glow = 20 + Math.sin(g.time * 4) * 6; g.circle(it.x, it.y, glow, 'rgba(255,255,255,.15)');
    g.emoji({ W: '🦋', P: '👻', M: '🎭', N: '🗡️' }[it.k], it.x, it.y + Math.sin(g.time * 3) * 4, 34);
  }
  for (const e of S.ens) {
    c.save(); c.translate(e.x + e.w / 2, e.y + e.h / 2); if (e.face > 0) c.scale(-1, 1); if (e.flash > 0) c.globalAlpha = 0.5;
    g.emoji({ c: '🐛', f: '🪰', h: '🦗', s: '🕷️' }[e.k], 0, 0, 38); c.restore();
  }
  if (S.boss) drawBoss(g, c);
  for (const b of S.eb) {
    if (b.pillar) { const a = b.life > 0.55 ? 0.25 : 0.9; c.globalAlpha = a; g.rect(b.x - 20, 0, 40, 520, b.life > 0.55 ? '#a78bfa' : '#1e1b4b'); g.rect(b.x - 8, 0, 16, 520, b.life > 0.55 ? 'transparent' : '#c4b5fd'); c.globalAlpha = 1; continue; }
    if (b.wave) { g.emoji(b.e, b.x, b.y - 10, 44); continue; }
    c.save(); c.translate(b.x, b.y); if (b.boomer) { c.rotate(Math.atan2(b.vy, b.vx) + 0.8); } g.emoji(b.e || '🟠', 0, 0, b.r * 2.4); c.restore();
  }
  for (const s of S.ps) { g.circle(s.x, s.y, 20, 'rgba(255,255,255,.35)'); g.emoji('👻', s.x, s.y, 36); }
  for (const f of S.fx) {
    if (f.ghost) { c.globalAlpha = f.t * 2; g.rrect(f.x - 12, f.y - 17, 24, 34, 8, '#94a3b8'); c.globalAlpha = 1; }
    if (f.ring) g.ring(f.x, f.y, 30 * (1 - f.t / 0.3) + 6, 'rgba(255,255,255,.6)', 2);
    if (f.wings) { c.globalAlpha = f.t * 2.5; g.emoji('🦋', f.x, f.y, 44); c.globalAlpha = 1; }
    if (f.soul) g.circle(f.x, f.y - (0.5 - f.t) * 60, 3, 'rgba(255,255,255,.7)');
    if (f.mace) g.circle(f.x, f.y, 60, `rgba(250,204,21,${f.t * 2})`);
  }
  drawPlayer(g, c);
  if (S.hitFlash > 0) { c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, 0, g.W, g.H); }
  // HUD
  g.circle(52, 52, 34, '#0f172a'); c.save(); c.beginPath(); c.arc(52, 52, 30, 0, Math.PI * 2); c.clip(); g.rect(22, 82 - 60 * S.soul / 99, 60, 60, '#e2e8f0'); c.restore(); g.ring(52, 52, 34, '#cbd5e1', 3);
  for (let i = 0; i < S.maxM; i++) g.emoji(i < S.masks ? '🤍' : '🖤', 104 + i * 30, 36, 24);
  g.text(`🪙 ${S.geo}`, 104, 70, 18, '#e5e7eb', 'left');
  // 미니맵
  const mx0 = g.W - 140, my0 = 14;
  g.rrect(mx0 - 8, my0 - 6, 132, 82, 6, 'rgba(0,0,0,.5)');
  for (const k in ROOMS) { if (!S.visited[k]) continue; const [x, y] = k.split(',').map(Number); g.rect(mx0 + x * 30, my0 + y * 24, 26, 20, k === S.room ? '#e2e8f0' : '#475569'); if (ROOMS[k].boss && !S.bosses[ROOMS[k].boss]) g.circle(mx0 + x * 30 + 13, my0 + y * 24 + 10, 4, '#ef4444'); }
  // 터치 버튼
  const labels = ['대시', '회복', '영혼탄'];
  for (let i = 0; i < 3; i++) { const ok = i === 0 ? S.has.dash : i === 1 ? S.soul >= 33 : S.has.spell && S.soul >= 33; g.rrect(g.W - 250 + i * 82, g.H - 66, 74, 54, 10, ok ? 'rgba(148,163,184,.35)' : 'rgba(30,41,59,.4)', 'rgba(255,255,255,.3)'); g.text(labels[i], g.W - 213 + i * 82, g.H - 39, 16, ok ? '#fff' : '#64748b'); }
  if (S.boss) { g.text(BOSSN[S.boss.k], g.W / 2, g.H - 50, 18, '#e2e8f0'); g.rect(g.W / 2 - 200, g.H - 34, 400, 10, '#1e293b'); g.rect(g.W / 2 - 200, g.H - 34, 400 * Math.max(0, S.boss.hp) / S.boss.max, 10, '#e2e8f0'); }
  if (S.titleT > 0) { c.globalAlpha = Math.min(1, S.titleT); g.text(S.title, g.W / 2, 150, 40, '#e2e8f0'); g.line(g.W / 2 - 160, 180, g.W / 2 + 160, 180, '#94a3b8', 2); c.globalAlpha = 1; }
  if (S.msg) { c.globalAlpha = Math.min(1, S.msg.t); g.rrect(g.W / 2 - 330, 200, 660, 50, 10, 'rgba(0,0,0,.7)', '#94a3b8'); g.text(S.msg.s, g.W / 2, 225, 19, '#fff'); c.globalAlpha = 1; }
  if (S.dead) { c.fillStyle = `rgba(0,0,0,${Math.min(0.8, (2.2 - S.dead))})`; c.fillRect(0, 0, g.W, g.H); g.text('쓰러졌다...', g.W / 2, g.H / 2, 40, '#94a3b8'); }
  if (S.won) { c.fillStyle = `rgba(255,255,255,${Math.min(0.7, (3 - S.won) * 0.4)})`; c.fillRect(0, 0, g.W, g.H); }
}
function drawPlayer(g, c) {
  const P = S.p;
  if (S.dead) return;
  if (P.inv > 0 && Math.floor(g.time * 14) % 2) return;
  c.save(); c.translate(P.x + 11, P.y + P.h); c.scale(P.face, 1);
  const run = P.ground && Math.abs(P.vx) > 20, ph = Math.sin(P.anim / 9) * 4;
  // 망토
  const sway = P.ground ? (run ? -6 : 0) : P.vy < 0 ? -2 : 4;
  g.poly([[-9, -26], [9, -26], [12 + sway * 0.3, 0], [-16 + sway, 2]], '#334155');
  g.rect(-5 + (run ? ph : 0), -6, 4, 6, '#0f172a'); g.rect(2 - (run ? ph : 0), -6, 4, 6, '#0f172a');
  // 머리 (흰 가면)
  g.circle(0, -34, 11, '#f8fafc');
  g.poly([[-7, -42], [-10, -58], [-3, -44]], '#f8fafc'); g.poly([[7, -42], [10, -58], [3, -44]], '#f8fafc');
  g.rrect(-6, -38, 4, 8, 2, '#0f172a'); g.rrect(2, -38, 4, 8, 2, '#0f172a');
  if (P.wall) g.rect(8, -24, 4, 16, '#94a3b8');
  c.restore();
  if (P.focus > 0) g.ring(P.x + 11, P.y + 17, 40 - P.focus * 30, 'rgba(255,255,255,.7)', 3);
  if (P.atkT > 0) {
    const B = slashBox();
    c.save(); c.globalAlpha = 0.8; c.strokeStyle = '#f8fafc'; c.lineWidth = 6; c.beginPath();
    if (P.atkDir === 'f') c.arc(P.x + 11, P.y + 17, 58, P.face > 0 ? -1.1 : Math.PI - 1.1 + 0.2, P.face > 0 ? 1.1 : Math.PI + 1.1);
    else if (P.atkDir === 'u') c.arc(P.x + 11, P.y + 10, 52, Math.PI + 0.4, -0.4);
    else c.arc(P.x + 11, P.y + 24, 52, 0.4, Math.PI - 0.4);
    c.stroke(); c.restore();
  }
}
function drawBoss(g, c) {
  const B = S.boss, cx = B.x + B.w / 2;
  if (B.flash > 0 && Math.floor(g.time * 30) % 2) c.globalAlpha = 0.5;
  c.save(); c.translate(cx, B.y + B.h); c.scale(B.face, 1);
  if (B.k === 'fk') {
    g.rrect(-36, -80, 72, 70, 14, '#a8a29e', '#44403c', 3); g.circle(0, -84, 26, '#d6d3d1'); g.rect(-20, -90, 40, 10, '#292524'); g.rect(-30, -10, 22, 10, '#57534e'); g.rect(8, -10, 22, 10, '#57534e');
    const sw = B.st === 'swing' ? (B.t < 0.45 ? 1.4 : -1.2) : -0.6; c.save(); c.translate(30, -60); c.rotate(sw); g.rect(0, -6, 70, 12, '#57534e'); g.circle(74, 0, 22, '#78716c'); c.restore();
    if (B.st === 'stagger') g.emoji('💫', 0, -120, 34);
  } else if (B.k === 'hornet') {
    g.poly([[-20, -40], [20, -40], [26, 0], [-26, 0]], '#b91c1c'); g.circle(0, -48, 13, '#f8fafc'); g.poly([[-8, -58], [-4, -72], [0, -58]], '#f8fafc'); g.poly([[8, -58], [4, -72], [0, -58]], '#f8fafc'); g.rect(-6, -52, 4, 6, '#0f172a'); g.rect(3, -52, 4, 6, '#0f172a');
    if (B.st === 'lunge' || B.st === 'dive') g.line(10, -30, 60, -30, '#e2e8f0', 4);
    if (B.st === 'spin' && B.t < 0.9 && B.t > 0.2) { for (let i = 0; i < 8; i++) { const a = g.time * 10 + i * 0.785; g.line(0, -30, Math.cos(a) * 100, -30 + Math.sin(a) * 100, 'rgba(255,255,255,.6)', 2); } }
  } else if (B.k === 'king') {
    g.poly([[-24, -50], [24, -50], [32, 0], [-32, 0]], '#0f172a'); g.circle(0, -58, 16, '#e2e8f0'); g.poly([[-10, -70], [-18, -100], [-4, -72]], '#e2e8f0'); g.poly([[10, -70], [18, -100], [4, -72]], '#e2e8f0'); g.rect(-7, -64, 5, 9, '#000'); g.rect(3, -64, 5, 9, '#000');
    g.line(16, -34, 66, -54, '#cbd5e1', 5); g.emoji('👑', 0, -86, 22);
    if (B.hp < B.max / 2) g.ring(0, -40, 50 + Math.sin(g.time * 8) * 4, 'rgba(167,139,250,.6)', 3);
  }
  c.restore(); c.globalAlpha = 1;
}
