'use strict';
let S;
const VW = 960, VH = 600, RW = 95, LAPS = 3, CAMY = 0.66;
const TRACKS = [
  { n: '네온 링', col: '#22d3ee', col2: '#a855f7', bg: '#0b1026', pts: [[0, 0], [700, -100], [1200, 200], [1300, 700], [900, 1000], [300, 900], [-200, 600], [-300, 200]] },
  { n: '토성 고리 서킷', col: '#f59e0b', col2: '#ef4444', bg: '#120a1f', pts: [[0, 0], [600, -250], [1100, -100], [1000, 400], [1500, 600], [1600, 1100], [1000, 1300], [500, 1000], [100, 1200], [-300, 800], [-200, 300]] },
  { n: '블랙홀 나선', col: '#4ade80', col2: '#22d3ee', bg: '#030712', pts: [[0, 0], [500, -300], [1100, -200], [1400, 300], [1000, 600], [600, 450], [400, 800], [900, 1100], [1500, 1000], [1700, 1500], [800, 1700], [0, 1400], [-200, 700]] },
  { n: '은하 그랑프리', col: '#f472b6', col2: '#fde047', bg: '#0f0720', pts: [[0, 0], [400, -350], [1000, -400], [1500, -100], [1300, 400], [1700, 800], [1500, 1300], [900, 1200], [700, 1600], [100, 1500], [-300, 1100], [100, 700], [-300, 400]] },
];
const RIV = [{ n: '오리온', c: '#38bdf8' }, { n: '베가', c: '#facc15' }, { n: '시리우스', c: '#f97316' }, { n: '안드로메다', c: '#a3e635' }, { n: '노바', c: '#e879f9' }];
const WEAP = ['🚀', '💣', '⚡', '🛡️', '⏩'];
const WN = { '🚀': '유도 미사일', '💣': '플라즈마 지뢰', '⚡': 'EMP 충격파', '🛡️': '실드', '⏩': '터보' };
GAME({
  title: '우주 레이스', w: VW, h: VH, bg: '#0b1026', controls: 'dpad+ab', aLabel: '무기', bLabel: '에어브레이크',
  help: '↑ 추진 · ↓ 감속 · ←→ 조향 · Shift/X 에어브레이크(급선회)\n➤ 부스트 패드를 밟으면 가속 · ◆ 무기 패드로 무기 획득 → Space 발사\n🚀 유도 미사일 · 💣 지뢰 · ⚡ EMP · 🛡️ 실드 · ⏩ 터보\n벽·무기에 맞으면 에너지 감소 · 출발선 옆 ⚡충전 구역에서 회복 · 에너지 0 = 탈락\n3랩 레이스 · 3위 안에 들어야 다음 트랙 (4개 트랙)',
  init(g) { S = { ti: 0, pts: 0 }; loadTrack(g); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.res) { S.res.t -= dt; if (S.res.t < 2.5 && (g.pressed('a') || g.mouse.clicked || S.res.t <= 0)) next(g); return; }
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.cb) { S.cb = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 990 : 495, 0.12); } return; }
    S.t += dt;
    const me = S.me;
    if (me.alive) { const ms = g.mouse.down ? U.clamp((g.mouse.x - VW / 2) / 150, -1, 1) : 0; me.in = { gas: g.up || g.mouse.down, brk: g.down, steer: ((g.right ? 1 : 0) - (g.left ? 1 : 0)) || ms, air: g.b, fire: g.pressed('a') }; }
    for (const s of S.ships) if (s !== me && s.alive) ai(s, dt);
    for (const s of S.ships) ship(g, s, dt);
    // 충돌 (함선끼리)
    for (let i = 0; i < S.ships.length; i++) for (let j = i + 1; j < S.ships.length; j++) {
      const a = S.ships[i], b = S.ships[j]; if (!a.alive || !b.alive) continue;
      const d = U.dist(a.x, a.y, b.x, b.y);
      if (d < 30 && d > 0) { const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d, p = (30 - d) / 2; a.x += nx * p; a.y += ny * p; b.x -= nx * p; b.y -= ny * p; const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv < 0) { a.vx -= rv * nx * 0.7; a.vy -= rv * ny * 0.7; b.vx += rv * nx * 0.7; b.vy += rv * ny * 0.7; } if ((a === me || b === me) && rv < -80) { g.sfx.hit(); g.shake(3, 0.1); } }
    }
    projectiles(g, dt);
    for (const s of S.ships) progress(g, s);
    const ord = S.ships.filter((s) => s.alive || s.fin).sort((a, b) => (b.fin ? 1e6 - b.fin : b.prog) - (a.fin ? 1e6 - a.fin : a.prog));
    S.rank = ord.indexOf(me) + 1;
    if (!me.alive && !S.res) { S.res = { pos: 0, t: 5, dead: true }; g.sfx.lose(); }
    if (me.fin && !S.res) finish(g);
    if (!S.fin1 && S.ships.some((s) => s.fin)) S.fin1 = true;
    let da = (me.a + Math.PI / 2) - S.camA; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI; S.camA += da * Math.min(1, dt * 4);
    g.info = `${TRACKS[S.ti].n} · 랩 ${Math.min(LAPS, me.lap + 1)}/${LAPS} · ${S.rank}위 · 에너지 ${Math.ceil(me.hp)}`;
  },
  draw(g, c) {
    const T = TRACKS[S.ti], me = S.me;
    g.rect(0, 0, VW, VH, T.bg);
    // 별 배경 (시차)
    for (let i = 0; i < 120; i++) { const x = ((i * 397 - me.x * 0.08 * (1 + (i % 3))) % VW + VW) % VW, y = ((i * 211 - me.y * 0.08 * (1 + (i % 3))) % VH + VH) % VH; g.rect(x, y, 1 + (i % 3), 1 + (i % 3), i % 7 === 0 ? T.col : 'rgba(255,255,255,.7)'); }
    g.emoji('🪐', VW - 140 - me.x * 0.02, 120 - me.y * 0.02, 90);
    c.save(); c.translate(VW / 2, VH * CAMY); c.rotate(-S.camA); c.translate(-me.x, -me.y);
    // 트랙
    c.lineCap = c.lineJoin = 'round';
    c.shadowBlur = 18; c.shadowColor = T.col;
    c.strokeStyle = T.col; c.lineWidth = RW * 2 + 10; c.stroke(S.p2d);
    c.shadowBlur = 0;
    c.strokeStyle = '#111827'; c.lineWidth = RW * 2; c.stroke(S.p2d);
    c.strokeStyle = 'rgba(148,163,184,.08)'; c.lineWidth = RW * 2 - 30; c.stroke(S.p2d);
    c.setLineDash([40, 60]); c.lineDashOffset = -g.time * 120; c.strokeStyle = T.col2; c.globalAlpha = 0.35; c.lineWidth = 3; c.stroke(S.p2d); c.setLineDash([]); c.globalAlpha = 1;
    // 충전 구역
    for (const z of S.charge) { c.save(); c.translate(z.x, z.y); c.rotate(z.a); c.globalAlpha = 0.25 + 0.15 * Math.sin(g.time * 6); g.rect(-60, -RW, 120, 40, '#22c55e'); c.globalAlpha = 1; g.text('⚡ 충전', 0, -RW + 20, 14, '#bbf7d0'); c.restore(); }
    // 출발선
    { const [sx, sy] = S.path[0]; c.save(); c.translate(sx, sy); c.rotate(S.tan[0]); for (let i = -RW; i < RW; i += 12) for (let j = 0; j < 2; j++) g.rect(j * 12 - 12, i, 12, 12, (i / 12 + j) % 2 ? '#fff' : T.col); c.restore(); }
    // 패드
    for (const p of S.pads) { c.save(); c.translate(p.x, p.y); c.rotate(p.a); if (p.k === 'boost') { for (let k = 0; k < 3; k++) { c.globalAlpha = 0.4 + 0.6 * ((Math.floor(g.time * 8) + k) % 3 === 0 ? 1 : 0.3); g.poly([[-24 + k * 16, -20], [-10 + k * 16, 0], [-24 + k * 16, 20], [-30 + k * 16, 20], [-16 + k * 16, 0], [-30 + k * 16, -20]], '#38bdf8'); } c.globalAlpha = 1; } else if (p.cd <= 0) { c.rotate(g.time * 2); g.poly([[0, -18], [18, 0], [0, 18], [-18, 0]], 'rgba(244,114,182,.35)', '#f472b6', 3); g.text('?', 0, 1, 16, '#fff'); } c.restore(); }
    // 지뢰/미사일
    for (const m of S.mines) { g.circle(m.x, m.y, 10 + Math.sin(g.time * 10) * 2, 'rgba(239,68,68,.35)'); g.circle(m.x, m.y, 6, '#ef4444'); }
    for (const p of S.proj) { c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy, p.vx)); g.poly([[10, 0], [-8, -4], [-8, 4]], '#fde047'); g.circle(-10, 0, 4 + Math.random() * 2, '#f97316'); c.restore(); }
    for (const e of S.emps) g.ring(e.x, e.y, e.r, `rgba(56,189,248,${Math.max(0, 1 - e.r / 260)})`, 6);
    for (const s of S.ships) drawShip(g, c, s);
    c.restore();
    hud(g, c);
  },
});
function catmull(pts, seg) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    const n = Math.max(4, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / seg));
    for (let s = 0; s < n; s++) { const t = s / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
  }
  return out;
}
function loadTrack(g) {
  const T = TRACKS[S.ti];
  S.path = catmull(T.pts, 14);
  const N = S.path.length;
  S.tan = S.path.map((p, i) => { const q = S.path[(i + 1) % N]; return Math.atan2(q[1] - p[1], q[0] - p[0]); });
  S.p2d = new Path2D(); S.path.forEach(([x, y], i) => (i ? S.p2d.lineTo(x, y) : S.p2d.moveTo(x, y))); S.p2d.closePath();
  S.pads = [];
  const lat = (i, o) => [S.path[i][0] - Math.sin(S.tan[i]) * o, S.path[i][1] + Math.cos(S.tan[i]) * o];
  for (let k = 1; k < 9; k++) { const i = Math.floor((N * k) / 9); const [x, y] = lat(i, ((k % 3) - 1) * 45); S.pads.push({ k: k % 2 ? 'boost' : 'weap', x, y, a: S.tan[i], cd: 0 }); if (k % 2 === 0) { const [x2, y2] = lat(i, ((k % 3) - 1) * 45 + (k % 3 === 2 ? -60 : 60)); S.pads.push({ k: 'weap', x: x2, y: y2, a: S.tan[i], cd: 0 }); } }
  S.charge = []; for (let i = N - 30; i < N - 6; i += 8) { const [x, y] = lat(i, 0); S.charge.push({ x, y, a: S.tan[i], i }); }
  S.chargeIdx = [N - 34, N - 4];
  const [x0, y0] = S.path[0], a0 = S.tan[0];
  const mk = (slot, col, name) => { const back = 50 + Math.floor(slot / 2) * 50, side = (slot % 2 ? 1 : -1) * 38; return { col, name, x: x0 - Math.cos(a0) * back - Math.sin(a0) * side, y: y0 - Math.sin(a0) * back + Math.cos(a0) * side, a: a0, vx: 0, vy: 0, hp: 100, alive: true, lap: -1, wp: N - 4, prog: 0, fin: 0, boost: 0, shield: 0, slow: 0, weap: null, wt: 0, skill: 1, off: U.rand(-35, 35), in: { gas: false, brk: false, steer: 0, air: false, fire: false }, flick: 0 }; };
  S.ships = [mk(5, '#ef4444', '나')];
  RIV.forEach((r, k) => { const s = mk(k, r.c, r.n); s.skill = 0.86 + S.ti * 0.035 + k * 0.022; S.ships.push(s); });
  S.me = S.ships[0];
  Object.assign(S, { count: 3.5, cb: 4, t: 0, rank: 6, res: null, proj: [], mines: [], emps: [], camA: a0 + Math.PI / 2, finN: 0, msg: '', msgT: 0, fin1: false });
}
function near(s) { const N = S.path.length; let b = 1e12, bi = s.wp; for (let k = -40; k <= 40; k++) { const i = (s.wp + k + N) % N, d = (S.path[i][0] - s.x) ** 2 + (S.path[i][1] - s.y) ** 2; if (d < b) { b = d; bi = i; } } return { i: bi, d: Math.sqrt(b) }; }
function ship(g, s, dt) {
  if (!s.alive) { s.vx *= 0.97; s.vy *= 0.97; s.x += s.vx * dt; s.y += s.vy * dt; return; }
  const me = s === S.me, I = s.in;
  s.boost -= dt; s.shield -= dt; s.slow -= dt; s.flick -= dt;
  if (s.fin) I.gas = true;
  const fx = Math.cos(s.a), fy = Math.sin(s.a);
  const top = (430 * s.skill + (s.boost > 0 ? 240 : 0)) * (s.slow > 0 ? 0.6 : 1), sp = Math.hypot(s.vx, s.vy);
  s.a += I.steer * (I.air ? 3.6 : 2.4) * dt;
  let ax = 0, ay = 0;
  if (I.gas) { ax += fx * 460; ay += fy * 460; }
  if (I.brk) { s.vx *= Math.pow(0.3, dt); s.vy *= Math.pow(0.3, dt); }
  if (s.boost > 0) { ax += fx * 600; ay += fy * 600; }
  s.vx += ax * dt; s.vy += ay * dt;
  // 반중력 관성: 진행방향으로 서서히 정렬
  const vf = s.vx * fx + s.vy * fy, rx = -fy, ry = fx; let vr = s.vx * rx + s.vy * ry;
  vr *= Math.exp(-(I.air ? 1.6 : 3.2) * dt);
  s.vx = fx * vf + rx * vr; s.vy = fy * vf + ry * vr;
  const sp2 = Math.hypot(s.vx, s.vy);
  if (sp2 > top) { s.vx *= top / sp2; s.vy *= top / sp2; }
  s.vx *= Math.pow(0.85, dt); s.vy *= Math.pow(0.85, dt);
  s.x += s.vx * dt; s.y += s.vy * dt;
  if (me && I.gas && g.frame % 2 === 0) { const p = scr(s.x - fx * 18, s.y - fy * 18); g.burst(p[0], p[1], s.boost > 0 ? ['#38bdf8', '#e0f2fe'] : ['#f97316', '#fde047'], 1, 60, 0.25, 3); }
  // 벽
  const n = near(s); s.wp2 = n.i;
  if (n.d > RW - 14) {
    const [px, py] = S.path[n.i], nx = (s.x - px) / n.d, ny = (s.y - py) / n.d;
    s.x = px + nx * (RW - 14); s.y = py + ny * (RW - 14);
    const vn = s.vx * nx + s.vy * ny;
    if (vn > 0) { s.vx -= vn * nx * 1.6; s.vy -= vn * ny * 1.6; s.vx *= 0.82; s.vy *= 0.82; if (vn > 60) { hurt(g, s, vn * 0.025, null); if (me) { g.sfx.hit(); g.shake(Math.min(8, vn / 40), 0.15); const p = scr(s.x, s.y); g.burst(p[0], p[1], [TRACKS[S.ti].col, '#fff'], 10, 200, 0.35, 3); } } }
  }
  // 패드
  for (const p of S.pads) {
    if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 > 1000) continue;
    if (p.k === 'boost' && s.boost < 0.5) { s.boost = 1.1; if (me) { g.sfx.power(); g.float(VW / 2, VH * CAMY - 70, '부스트!', '#38bdf8', 20); } }
    if (p.k === 'weap' && p.cd <= 0 && !s.weap) { s.weap = U.choice(WEAP); p.cd = 3; if (me) { g.sfx.coin(); flash(`${s.weap} ${WN[s.weap]} 획득!`, '#f472b6'); } }
  }
  for (const p of S.pads) if (p.cd > 0) p.cd -= dt / S.ships.length;
  // 충전 구역
  const N = S.path.length, i = n.i;
  if (i >= S.chargeIdx[0] && i <= S.chargeIdx[1] && n.d < RW) { const before = s.hp; s.hp = Math.min(100, s.hp + 18 * dt); if (me && s.hp > before && g.frame % 10 === 0) g.sfx.tone(800 + s.hp * 4, 0.04, 'sine', 0.03); }
  // 무기
  if (I.fire && s.weap && !s.fin) fire(g, s);
}
function fire(g, s) {
  const w = s.weap; s.weap = null;
  const me = s === S.me, fx = Math.cos(s.a), fy = Math.sin(s.a);
  if (w === '🚀') { const ahead = S.ships.filter((o) => o !== s && o.alive && !o.fin && o.prog > s.prog && o.prog - s.prog < 120).sort((a, b) => a.prog - b.prog)[0]; S.proj.push({ x: s.x + fx * 24, y: s.y + fy * 24, vx: fx * 700 + s.vx * 0.5, vy: fy * 700 + s.vy * 0.5, owner: s, tgt: ahead || null, life: 3 }); if (me) g.sfx.shoot(); }
  if (w === '💣') { S.mines.push({ x: s.x - fx * 30, y: s.y - fy * 30, owner: s, life: 25 }); if (me) g.sfx.drop(); }
  if (w === '⚡') { S.emps.push({ x: s.x, y: s.y, r: 10, owner: s, hit: new Set() }); if (me) g.sfx.tone(1400, 0.4, 'sawtooth', 0.05, 80); }
  if (w === '🛡️') { s.shield = 6; if (me) g.sfx.power(); }
  if (w === '⏩') { s.boost = 2.4; if (me) g.sfx.power(); }
}
function projectiles(g, dt) {
  for (const p of S.proj) {
    p.life -= dt;
    if (p.tgt && p.tgt.alive) { const a = U.angle(p.x, p.y, p.tgt.x, p.tgt.y), sp = Math.hypot(p.vx, p.vy); p.vx += Math.cos(a) * 2400 * dt; p.vy += Math.sin(a) * 2400 * dt; const k = Math.max(760, sp) / Math.hypot(p.vx, p.vy); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    for (const s of S.ships) if (s !== p.owner && s.alive && (s.x - p.x) ** 2 + (s.y - p.y) ** 2 < 500) { p.life = 0; explodeAt(g, p.x, p.y); hurt(g, s, 22, p.owner); s.vx *= 0.3; s.vy *= 0.3; s.flick = 0.8; }
  }
  S.proj = S.proj.filter((p) => p.life > 0);
  for (const m of S.mines) { m.life -= dt; for (const s of S.ships) if (s.alive && (s !== m.owner || m.life < 23) && (s.x - m.x) ** 2 + (s.y - m.y) ** 2 < 400) { m.life = 0; explodeAt(g, m.x, m.y); hurt(g, s, 18, m.owner); s.vx *= 0.4; s.vy *= 0.4; s.flick = 0.8; } }
  S.mines = S.mines.filter((m) => m.life > 0);
  for (const e of S.emps) { e.r += 520 * dt; for (const s of S.ships) if (s !== e.owner && s.alive && !e.hit.has(s) && U.dist(s.x, s.y, e.x, e.y) < e.r) { e.hit.add(s); hurt(g, s, 10, e.owner); s.slow = 2; } }
  S.emps = S.emps.filter((e) => e.r < 260);
}
function explodeAt(g, x, y) { const p = scr(x, y); g.burst(p[0], p[1], ['#f97316', '#fde047', '#ef4444', '#fff'], 22, 260, 0.5, 4); if (U.dist(x, y, S.me.x, S.me.y) < 500) { g.sfx.explode(); g.shake(4, 0.2); } }
function hurt(g, s, d, by) {
  if (s.shield > 0 || !s.alive) return;
  s.hp -= d;
  if (by === S.me && d >= 10) { g.add(Math.round(d * 10)); flash(`${s.name} 명중!`, '#fde047'); }
  if (s === S.me && d >= 10) flash(`피격! 에너지 -${Math.round(d)}`, '#ef4444');
  if (s.hp <= 0) { s.hp = 0; s.alive = false; const p = scr(s.x, s.y); g.burst(p[0], p[1], [s.col, '#fff', '#f97316'], 40, 320, 0.9, 5); g.sfx.explode(); if (by === S.me) { g.add(800); flash(`💥 ${s.name} 격추!`, '#f472b6'); } else if (s !== S.me) flash(`${s.name} 탈락`, '#cbd5e1'); }
}
function ai(s, dt) {
  const N = S.path.length, i = s.wp2 !== undefined ? s.wp2 : s.wp;
  const la = (i + 9) % N, look = S.path[la];
  const tx = look[0] - Math.sin(S.tan[la]) * s.off, ty = look[1] + Math.cos(S.tan[la]) * s.off;
  let da = Math.atan2(ty - s.y, tx - s.x) - s.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  let curv = S.tan[(i + 20) % N] - S.tan[i]; curv = ((curv + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const sp = Math.hypot(s.vx, s.vy), me = S.me;
  const rub = me.prog - s.prog > 50 ? 1.07 : s.prog - me.prog > 70 ? 0.93 : 1;
  const want = 430 * s.skill * rub * (1 - Math.min(0.4, Math.abs(curv) * 0.35));
  s.wt -= dt;
  let fireNow = false;
  if (s.weap && s.wt <= 0) { s.wt = U.rand(0.8, 2.5); if (s.weap === '🚀') fireNow = S.ships.some((o) => o !== s && o.alive && o.prog > s.prog && o.prog - s.prog < 60); else if (s.weap === '💣') fireNow = S.ships.some((o) => o !== s && o.alive && o.prog < s.prog && s.prog - o.prog < 30); else if (s.weap === '🛡️') fireNow = s.hp < 70 || S.proj.length > 0; else fireNow = Math.random() < 0.5; }
  s.in = { gas: sp < want, brk: sp > want + 80, steer: U.clamp(da * 2.6, -1, 1), air: Math.abs(curv) > 1 && sp > 300, fire: fireNow };
  if (s.hp < 35 && i > S.chargeIdx[0] - 60) s.off = U.lerp(s.off, 0, dt);
}
function progress(g, s) {
  const N = S.path.length, n = s.wp2 !== undefined ? s.wp2 : near(s).i, ahead = (n - s.wp + N) % N;
  if (ahead > 0 && ahead < 40) {
    if (s.wp > N - 40 && n < 40) {
      s.lap++;
      if (s.lap >= LAPS && !s.fin) s.fin = ++S.finN;
      if (s === S.me && s.lap > 0 && s.lap < LAPS) { g.float(VW / 2, 150, s.lap === LAPS - 1 ? '🏁 파이널 랩!' : `랩 ${s.lap + 1}`, '#fde047', 32); g.sfx.coin(); g.add(200); }
    }
    s.wp = n;
  }
  s.prog = s.lap * N + s.wp;
}
function finish(g) {
  const pos = S.me.fin;
  const pts = [10, 7, 5, 3, 2, 1][pos - 1] || 0;
  S.pts += pts;
  g.add([3000, 2000, 1200, 500, 300, 100][pos - 1] + Math.round(S.me.hp) * 10);
  S.res = { pos, pts, t: 6 };
  pos <= 3 ? g.sfx.win() : g.sfx.lose();
  if (pos === 1) g.burst(VW / 2, 200, ['#22d3ee', '#f472b6', '#fde047', '#fff'], 60, 400, 1.2, 5);
}
function next(g) {
  const R = S.res;
  if (R.dead) return g.over(`${TRACKS[S.ti].n}에서 기체 파괴`);
  if (R.pos > 3) return g.over(`${TRACKS[S.ti].n} ${R.pos}위 — 탈락`);
  S.ti++;
  if (S.ti >= TRACKS.length) return g.win(`🌌 은하 챔피언! ${S.pts}점`);
  loadTrack(g);
}
function scr(x, y) { const dx = x - S.me.x, dy = y - S.me.y, ca = Math.cos(-S.camA), sa = Math.sin(-S.camA); return [VW / 2 + dx * ca - dy * sa, VH * CAMY + dx * sa + dy * ca]; }
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 1.6; }
function drawShip(g, c, s) {
  if (!s.alive) { c.globalAlpha = 0.4; }
  if (s.flick > 0 && Math.floor(s.flick * 20) % 2) { c.globalAlpha = 0.3; }
  c.save(); c.translate(s.x, s.y); c.rotate(s.a);
  c.shadowBlur = 14; c.shadowColor = s.col;
  g.poly([[22, 0], [-12, -14], [-6, -5], [-14, -4], [-14, 4], [-6, 5], [-12, 14]], s.col, '#fff', 1.5);
  c.shadowBlur = 0;
  g.poly([[12, 0], [-2, -5], [-2, 5]], '#0f172a');
  if (s.alive && s.in.gas) { const f = 8 + Math.random() * 8 + (s.boost > 0 ? 12 : 0); g.poly([[-14, -3], [-14 - f, 0], [-14, 3]], s.boost > 0 ? '#38bdf8' : '#f97316'); }
  c.restore();
  if (s.shield > 0) g.ring(s.x, s.y, 26, `rgba(125,211,252,${0.5 + 0.3 * Math.sin(g.time * 12)})`, 3);
  if (s.slow > 0) g.ring(s.x, s.y, 20, 'rgba(250,204,21,.6)', 2);
  c.globalAlpha = 1;
  if (s !== S.me && s.alive) { c.save(); c.translate(s.x, s.y); c.rotate(S.camA); g.text(s.name, 0, -26, 11, '#e2e8f0'); g.rect(-14, -18, 28, 3, '#334155'); g.rect(-14, -18, 28 * s.hp / 100, 3, s.hp > 40 ? '#22c55e' : '#ef4444'); c.restore(); }
}
function hud(g, c) {
  const me = S.me, T = TRACKS[S.ti];
  g.rrect(12, 12, 170, 86, 14, 'rgba(0,0,0,.6)', T.col, 2);
  g.text(`${S.rank}위`, 97, 42, 32, S.rank === 1 ? '#fde047' : '#fff'); g.text(`랩 ${Math.max(1, Math.min(LAPS, me.lap + 1))}/${LAPS}`, 97, 78, 16, '#cbd5e1');
  g.rrect(VW - 220, VH - 108, 208, 96, 14, 'rgba(0,0,0,.6)', T.col, 2);
  g.text(Math.round(Math.hypot(me.vx, me.vy) * 2.2) + ' km/h', VW - 116, VH - 84, 22, '#fff');
  g.text('에너지', VW - 186, VH - 52, 12, '#94a3b8'); g.rect(VW - 156, VH - 59, 130, 14, '#334155'); g.rect(VW - 156, VH - 59, 130 * me.hp / 100, 14, me.hp > 50 ? '#22c55e' : me.hp > 25 ? '#f59e0b' : (g.frame % 20 < 10 ? '#ef4444' : '#7f1d1d'));
  g.text(me.shield > 0 ? `🛡️ ${me.shield.toFixed(1)}s` : me.slow > 0 ? '⚡ EMP 감속!' : '', VW - 116, VH - 28, 14, '#7dd3fc');
  g.rrect(VW - 104, 12, 92, 92, 16, 'rgba(0,0,0,.6)', me.weap ? '#f472b6' : '#475569', 3);
  if (me.weap) { g.emoji(me.weap, VW - 58, 50, 46); g.text('Space', VW - 58, 90, 11, '#f9a8d4'); } else g.text('무기 없음', VW - 58, 58, 12, '#64748b');
  if (me.hp < 30 && me.alive) g.text('⚠ 에너지 부족! 출발선 옆 충전 구역으로', VW / 2, 110, 18, '#ef4444');
  // 순위표
  const ord = S.ships.slice().sort((a, b) => (b.fin ? 1e6 - b.fin : b.alive ? b.prog : -1) - (a.fin ? 1e6 - a.fin : a.alive ? a.prog : -1));
  ord.forEach((s, i) => { g.rect(12, 112 + i * 22, 6, 16, s.col); g.text(`${i + 1}. ${s.name}${s.alive ? '' : ' ✕'}`, 24, 120 + i * 22, 13, s === me ? '#fde047' : s.alive ? '#e2e8f0' : '#64748b', 'left'); });
  if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 150, 24, S.msgC); c.globalAlpha = 1; }
  if (S.count > 0) { g.text(Math.ceil(S.count), VW / 2, VH / 2 - 60, 100, T.col); g.text(T.n, VW / 2, VH / 2 + 20, 28, '#fff'); }
  if (S.res) {
    const R = S.res;
    g.rrect(280, 160, 400, 240, 20, 'rgba(15,23,42,.94)', T.col, 3);
    if (R.dead) { g.text('💥 기체 파괴!', VW / 2, 230, 36, '#ef4444'); g.text('에너지가 바닥났어요', VW / 2, 290, 18, '#cbd5e1'); }
    else { g.text(`${R.pos}위 골인!`, VW / 2, 220, 38, R.pos <= 3 ? '#fde047' : '#ef4444'); g.text(`챔피언십 +${R.pts} (총 ${S.pts})`, VW / 2, 280, 20, '#22d3ee'); g.text(R.pos <= 3 ? 'Space: 다음 트랙' : '3위 밖 — 탈락', VW / 2, 340, 16, '#94a3b8'); }
  }
}
