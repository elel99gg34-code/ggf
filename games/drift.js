'use strict';
let S;
const VW = 960, VH = 600, RW = 105, LAPS = 3;
const TRACKS = [
  { n: '항만 창고', bg: '#3f3f46', pts: [[300, 300], [900, 250], [1300, 350], [1400, 700], [1100, 900], [700, 760], [400, 1000], [200, 750]] },
  { n: '산악 헤어핀', bg: '#3f6212', pts: [[300, 200], [800, 150], [1000, 450], [700, 600], [1050, 800], [1500, 700], [1550, 1150], [900, 1250], [350, 1100], [500, 700], [200, 550]] },
  { n: '네온 시티', bg: '#1e1b4b', pts: [[200, 200], [1300, 200], [1300, 600], [900, 600], [900, 900], [1400, 900], [1400, 1300], [200, 1300], [200, 900], [600, 750], [200, 550]] },
  { n: '사막 서킷', bg: '#a16207', pts: [[400, 200], [1100, 300], [1600, 200], [1700, 700], [1300, 800], [1500, 1200], [800, 1300], [700, 900], [300, 1100], [150, 600]] },
  { n: '도쿄 고속도로', bg: '#0f172a', pts: [[300, 300], [700, 200], [1100, 400], [1500, 250], [1800, 600], [1500, 900], [1700, 1300], [1100, 1350], [900, 1000], [500, 1250], [200, 900], [450, 650]] },
];
const UPG = [
  { k: 'eng', n: '엔진', e: '⚙️', d: '최고속도·가속' },
  { k: 'tire', n: '타이어', e: '🛞', d: '접지력' },
  { k: 'steer', n: '스티어링', e: '🎛️', d: '조향 반응' },
  { k: 'nos', n: '니트로', e: '🔥', d: '부스트 용량' },
];
const RIV = [{ n: '케이', c: '#f97316' }, { n: '타쿠미', c: '#f8fafc' }, { n: '료스케', c: '#facc15' }];
GAME({
  title: '드리프트 킹', w: VW, h: VH, bg: '#3f3f46', controls: 'dpad+ab', aLabel: '니트로', bLabel: '사이드',
  help: '↑ 가속 · ↓ 브레이크 · ←→ 조향\nShift/X 사이드브레이크로 꼬리를 날려 드리프트! 길게·크게 미끄러질수록 콤보 배수 상승\n벽에 박으면 콤보 소멸 · 드리프트로 니트로 충전 → Space 부스트\n3랩 레이스 3위 안에 들어야 다음 이벤트 · 상금으로 차량 업그레이드',
  init(g) {
    S = { ev: 0, cash: 0, lv: { eng: 0, tire: 0, steer: 0, nos: 0 }, shop: false, msg: '', msgT: 0 };
    loadTrack(g);
  },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.shop) return shopUpdate(g);
    if (S.res) { S.res.t -= dt; if (S.res.t < 2.5 && (g.pressed('a') || g.mouse.clicked || S.res.t <= 0)) afterRace(g); return; }
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.cb) { S.cb = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 880 : 440, 0.15); } if (S.count <= 0) g.sfx.beep(880, 0.3); return; }
    S.time += dt;
    const me = S.me;
    const steer = (g.right ? 1 : 0) - (g.left ? 1 : 0);
    physics(g, me, g.up, g.down, steer, g.b, g.a && me.nos > 0, dt, true);
    for (const r of S.cars) if (r !== me) aiDrive(g, r, dt);
    // 차량 충돌
    for (let i = 0; i < S.cars.length; i++) for (let j = i + 1; j < S.cars.length; j++) {
      const a = S.cars[i], b = S.cars[j], d = U.dist(a.x, a.y, b.x, b.y);
      if (d < 34 && d > 0) {
        const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d, push = (34 - d) / 2;
        a.x += nx * push; a.y += ny * push; b.x -= nx * push; b.y -= ny * push;
        const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rv < 0) { a.vx -= rv * nx * 0.6; a.vy -= rv * ny * 0.6; b.vx += rv * nx * 0.6; b.vy += rv * ny * 0.6; }
        if ((a === me || b === me) && rv < -60) { g.sfx.hit(); g.shake(4, 0.15); breakCombo(g, '접촉!'); }
      }
    }
    for (const c of S.cars) progress(g, c);
    const ord = S.cars.slice().sort((a, b) => b.prog - a.prog);
    S.rank = ord.indexOf(me) + 1;
    if (me.lap >= LAPS && !S.res) finishRace(g);
    g.info = `이벤트 ${S.ev + 1}/${TRACKS.length} · 랩 ${Math.min(LAPS, me.lap + 1)}/${LAPS} · ${S.rank}위`;
  },
  draw(g, c) {
    if (S.shop) return shopDraw(g, c);
    const me = S.me, z = S.zoom;
    S.camX = U.lerp(S.camX, me.x + me.vx * 0.35, 0.12); S.camY = U.lerp(S.camY, me.y + me.vy * 0.35, 0.12);
    const T = TRACKS[S.ev];
    c.save(); c.translate(VW / 2, VH / 2); c.scale(z, z); c.translate(-S.camX, -S.camY);
    const x0 = S.camX - VW / 2 / z, y0 = S.camY - VH / 2 / z;
    c.fillStyle = T.bg; c.fillRect(x0, y0, VW / z, VH / z);
    c.fillStyle = 'rgba(255,255,255,.04)';
    for (let x = Math.floor(x0 / 80) * 80; x < x0 + VW / z; x += 80) for (let y = Math.floor(y0 / 80) * 80; y < y0 + VH / z; y += 80) if (((x + y) / 80) % 2 === 0) c.fillRect(x, y, 80, 80);
    c.lineCap = c.lineJoin = 'round';
    pathStroke(c, '#e2e8f0', RW * 2 + 16, []);
    pathStroke(c, '#dc2626', RW * 2 + 16, [20, 20]);
    pathStroke(c, '#374151', RW * 2, []);
    pathStroke(c, 'rgba(255,255,255,.35)', 3, [30, 30]);
    // 스키드마크
    c.strokeStyle = 'rgba(10,10,10,.45)'; c.lineWidth = 5; c.beginPath();
    for (const m of S.skid) { c.moveTo(m[0], m[1]); c.lineTo(m[2], m[3]); }
    c.stroke();
    // 출발선
    const [sx, sy] = S.path[0], ta = S.tan[0];
    c.save(); c.translate(sx, sy); c.rotate(ta); for (let i = -RW; i < RW; i += 14) for (let j = 0; j < 2; j++) { c.fillStyle = (i / 14 + j) % 2 ? '#fff' : '#111'; c.fillRect(j * 14 - 14, i, 14, 14); } c.restore();
    for (const o of S.deco) g.emoji(o.e, o.x, o.y, o.s);
    for (const p of S.pads) { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.globalAlpha = 0.5 + 0.5 * Math.sin(g.time * 8); g.poly([[-14, -18], [10, 0], [-14, 18], [-6, 0]], '#22d3ee'); c.restore(); }
    for (const car of S.cars) drawCar(g, c, car);
    c.restore();
    hud(g, c);
  },
});
function loadTrack(g) {
  const T = TRACKS[S.ev];
  S.path = catmull(T.pts, 14);
  const N = S.path.length;
  S.tan = S.path.map((p, i) => { const q = S.path[(i + 1) % N]; return Math.atan2(q[1] - p[1], q[0] - p[0]); });
  S.deco = [];
  for (let i = 0; i < N; i += 9) {
    const [x, y] = S.path[i], a = S.tan[i], side = i % 18 ? 1 : -1, o = RW + 40 + U.rand(0, 60);
    S.deco.push({ e: U.choice(S.ev === 2 || S.ev === 4 ? ['🏢', '🏬', '💡', '🚧'] : S.ev === 3 ? ['🌵', '🪨', '🌵', '🛢️'] : ['🌲', '🌳', '🚧', '🛢️']), x: x - Math.sin(a) * o * side, y: y + Math.cos(a) * o * side, s: U.rand(28, 44) });
  }
  S.pads = [];
  for (let i = 30; i < N; i += Math.floor(N / 4)) { const [x, y] = S.path[i]; S.pads.push({ x, y, a: S.tan[i] }); }
  const [x0, y0] = S.path[0], a0 = S.tan[0];
  const mk = (i, col, name) => { const back = 50 + Math.floor(i / 2) * 55, side = (i % 2 ? 1 : -1) * 35; return { i, col, name, x: x0 - Math.cos(a0) * back - Math.sin(a0) * side, y: y0 - Math.sin(a0) * back + Math.cos(a0) * side, a: a0, vx: 0, vy: 0, lap: -1, wp: N - 3, prog: 0, nos: 0, boost: 0, slip: 0, off: U.rand(-25, 25), skill: 0, steerV: 0 }; };
  S.cars = [];
  S.cars.push(mk(3, '#e11d48', '나'));
  RIV.forEach((r, k) => { const c = mk(k, r.c, r.n); c.skill = 0.9 + S.ev * 0.035 + k * 0.025; S.cars.push(c); });
  S.me = S.cars[0];
  S.me.nos = 0.5;
  Object.assign(S, { skid: [], combo: 0, mult: 1, driftT: 0, calm: 0, total: 0, best: 0, count: 3.5, cb: 4, time: 0, rank: 4, res: null, zoom: 1, camX: x0, camY: y0, hintMe: 0 });
  S.p2d = new Path2D(); S.path.forEach(([x, y], i) => (i ? S.p2d.lineTo(x, y) : S.p2d.moveTo(x, y))); S.p2d.closePath();
}
function pathStroke(c, col, w, dash) { c.setLineDash(dash); c.lineCap = dash.length ? 'butt' : 'round'; c.strokeStyle = col; c.lineWidth = w; c.stroke(S.p2d); c.setLineDash([]); }
function catmull(pts, seg) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(4, Math.round(len / seg));
    for (let s = 0; s < n; s++) { const t = s / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
  }
  return out;
}
function near(c) {
  const N = S.path.length; let b = 1e12, bi = c.wp;
  if (c.hintFull === undefined) { c.hintFull = 1; for (let i = 0; i < N; i++) { const d = (S.path[i][0] - c.x) ** 2 + (S.path[i][1] - c.y) ** 2; if (d < b) { b = d; bi = i; } } }
  else for (let k = -40; k <= 40; k++) { const i = (c.wp + k + N) % N, d = (S.path[i][0] - c.x) ** 2 + (S.path[i][1] - c.y) ** 2; if (d < b) { b = d; bi = i; } }
  return { i: bi, d: Math.sqrt(b) };
}
function physics(g, c, gas, brk, steer, hand, nos, dt, isMe) {
  const lv = isMe ? S.lv : { eng: S.ev, tire: S.ev, steer: S.ev, nos: 0 };
  const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
  let vf = c.vx * fx + c.vy * fy, vr = c.vx * rx + c.vy * ry;
  const top = (330 + lv.eng * 28) * (c.skill || 1) + (c.boost > 0 ? 160 : 0), acc = 300 + lv.eng * 30;
  c.boost -= dt;
  if (nos) { c.nos = Math.max(0, c.nos - dt / (2 + lv.nos * 0.8)); vf += 420 * dt; if (isMe && g.frame % 2 === 0) { const p = toS(c.x - fx * 22, c.y - fy * 22); g.burst(p[0], p[1], ['#38bdf8', '#a5f3fc', '#fff'], 2, 120, 0.3, 4); } }
  if (gas) vf += acc * (1 - Math.max(0, vf) / (top + (nos ? 150 : 0))) * dt;
  else if (brk) vf -= (vf > 0 ? 520 : 200) * dt;
  else vf *= Math.pow(0.6, dt);
  vf = U.clamp(vf, -120, top + (nos ? 170 : 0) + (c.boost > 0 ? 160 : 0));
  const sp = Math.hypot(vf, vr);
  const turn = (2.5 + lv.steer * 0.18) * (hand ? 1.35 : 1) * U.clamp(sp / 140, 0, 1) * Math.sign(vf || 1);
  c.steerV = U.lerp(c.steerV, steer, Math.min(1, dt * 10));
  c.a += c.steerV * turn * dt;
  let grip = 7 + lv.tire * 0.8;
  if (hand) grip = 1.1;
  else if (gas && Math.abs(steer) > 0 && sp > 220) grip *= 0.42 + lv.tire * 0.03;
  if (Math.abs(vr) > 40 && !hand) grip *= 0.6;
  vr *= Math.exp(-grip * dt);
  if (hand) vf *= Math.pow(0.75, dt);
  c.vx = fx * vf + rx * vr; c.vy = fy * vf + ry * vr;
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.slip = sp > 120 ? Math.atan2(Math.abs(vr), Math.abs(vf)) : 0;
  // 스키드
  if (c.slip > 0.2 && g.frame % 2 === 0) {
    for (const s of [-1, 1]) { const bx = c.x - fx * 14 + rx * 9 * s, by = c.y - fy * 14 + ry * 9 * s; if (c['l' + s]) S.skid.push([c['l' + s][0], c['l' + s][1], bx, by]); c['l' + s] = [bx, by]; }
    if (S.skid.length > 900) S.skid.splice(0, 60);
    if (isMe && g.frame % 4 === 0) { const p = toS(c.x - fx * 18, c.y - fy * 18); g.burst(p[0], p[1], ['rgba(226,232,240,.8)', 'rgba(148,163,184,.7)'], 2, 60, 0.7, 7); }
  } else { c['l-1'] = c.l1 = null; }
  // 벽
  const n = near(c);
  c.wp2 = n.i;
  if (n.d > RW - 12) {
    const [px, py] = S.path[n.i], nx = (c.x - px) / n.d, ny = (c.y - py) / n.d;
    c.x = px + nx * (RW - 12); c.y = py + ny * (RW - 12);
    const vn = c.vx * nx + c.vy * ny;
    if (vn > 0) { c.vx -= vn * nx * 1.5; c.vy -= vn * ny * 1.5; c.vx *= 0.75; c.vy *= 0.75; if (isMe && vn > 70) { g.sfx.hit(); g.shake(Math.min(10, vn / 30), 0.2); breakCombo(g, '벽 충돌!'); const p = toS(c.x, c.y); g.burst(p[0], p[1], ['#fde047', '#f97316', '#fff'], 10, 220, 0.4, 3); } }
  }
  // 부스트 패드
  for (const p of S.pads) if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 < 900 && c.boost < 0.6) { c.boost = 1; if (isMe) { g.sfx.power(); g.float(VW / 2, VH / 2 - 60, '부스트!', '#22d3ee', 22); } }
  if (isMe) driftScore(g, c, sp, dt);
}
function driftScore(g, c, sp, dt) {
  const ang = c.slip;
  if (ang > 0.22 && sp > 150) {
    S.driftT += dt; S.calm = 0;
    S.mult = Math.min(8, 1 + Math.floor(S.driftT / 1.2));
    S.combo += dt * sp * ang * 1.6 * S.mult;
    c.nos = Math.min(1, c.nos + dt * 0.12);
    if (g.frame % 10 === 0) g.sfx.noise(0.06, 0.02);
    S.dAng = ang;
  } else if (S.combo > 0) {
    S.calm += dt;
    if (S.calm > 0.6) bank(g);
  } else S.driftT = 0;
}
function bank(g) {
  const pts = Math.round(S.combo);
  if (pts > 0) {
    S.total += pts; g.add(pts); S.best = Math.max(S.best, pts);
    const lbl = pts > 6000 ? '전설의 드리프트!' : pts > 3000 ? '킹 드리프트!' : pts > 1200 ? '그레이트!' : pts > 400 ? '굿 드리프트' : '드리프트';
    g.float(VW / 2, VH / 2 - 90, `${lbl} +${pts}`, pts > 3000 ? '#f472b6' : '#fde047', pts > 3000 ? 30 : 24);
    g.sfx.coin();
  }
  S.combo = 0; S.mult = 1; S.driftT = 0; S.calm = 0;
}
function breakCombo(g, why) {
  if (S.combo > 50) { g.float(VW / 2, VH / 2 - 90, `${why} 콤보 -${Math.round(S.combo)}`, '#ef4444', 22); g.sfx.lose(); }
  S.combo = 0; S.mult = 1; S.driftT = 0;
}
function aiDrive(g, c, dt) {
  const N = S.path.length, i = c.wp2 !== undefined ? c.wp2 : c.wp;
  const look = S.path[(i + 8) % N], far = S.tan[(i + 18) % N], here = S.tan[i];
  let curv = far - here; curv = ((curv + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const tx = look[0] - Math.sin(S.tan[(i + 8) % N]) * c.off, ty = look[1] + Math.cos(S.tan[(i + 8) % N]) * c.off;
  let da = Math.atan2(ty - c.y, tx - c.x) - c.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const sp = Math.hypot(c.vx, c.vy), want = (330 + S.ev * 28) * c.skill * (1 - Math.min(0.45, Math.abs(curv) * 0.5));
  const me = S.me, rubber = me.prog - c.prog > 60 ? 1.08 : c.prog - me.prog > 80 ? 0.93 : 1;
  c.skillT = c.skill; const save = c.skill; c.skill = save * rubber;
  physics(g, c, sp < want * rubber, sp > want * rubber + 40, U.clamp(da * 2.5, -1, 1), Math.abs(curv) > 0.9 && sp > 230, false, dt, false);
  c.skill = save;
}
function progress(g, c) {
  const N = S.path.length, n = c.wp2 !== undefined ? c.wp2 : near(c).i, ahead = (n - c.wp + N) % N;
  if (ahead > 0 && ahead < 40) {
    if (c.wp > N - 40 && n < 40) { c.lap++; if (c === S.me && c.lap > 0 && c.lap < LAPS) { g.float(VW / 2, 160, c.lap === LAPS - 1 ? '🏁 마지막 랩!' : `랩 ${c.lap + 1}`, '#fde047', 32); g.sfx.coin(); } }
    c.wp = n;
  }
  c.prog = c.lap * N + c.wp;
}
function finishRace(g) {
  bank(g);
  const pos = S.rank, prize = [3000, 1800, 1000, 300][pos - 1];
  const earned = prize + Math.round(S.total / 4);
  S.cash += earned;
  g.add([2000, 1000, 500, 0][pos - 1]);
  S.res = { pos, prize, drift: S.total, earned, t: 6 };
  if (pos <= 3) g.sfx.win(); else g.sfx.lose();
}
function afterRace(g) {
  const pos = S.res.pos;
  if (pos > 3) return g.over(`${TRACKS[S.ev].n}에서 ${pos}위 탈락`);
  S.ev++;
  if (S.ev >= TRACKS.length) return g.win(pos === 1 ? '👑 드리프트 킹 등극!' : `시즌 완주! 마지막 ${pos}위`);
  S.res = null; S.shop = true;
}
function cost(k) { return 1200 + S.lv[k] * 900; }
function shopUpdate(g) {
  UPG.forEach((u, i) => {
    if (g.keyp('Digit' + (i + 1)) || g.clickIn(70 + i * 210, 200, 190, 230)) {
      if (S.lv[u.k] < 5 && S.cash >= cost(u.k)) { S.cash -= cost(u.k); S.lv[u.k]++; g.sfx.power(); g.burst(165 + i * 210, 300, ['#fde047', '#22c55e'], 20, 200, 0.6, 4); }
      else g.sfx.beep(150, 0.15);
    }
  });
  if (g.pressed('a') || g.clickIn(380, 490, 200, 56)) { S.shop = false; loadTrack(g); g.sfx.click(); }
}
function shopDraw(g, c) {
  g.rect(0, 0, VW, VH, '#111827');
  g.text('🔧 튜닝 숍', VW / 2, 60, 36, '#fde047');
  g.text(`보유 상금 💰 ${S.cash.toLocaleString()} · 다음 이벤트: ${TRACKS[S.ev].n}`, VW / 2, 110, 18, '#e2e8f0');
  UPG.forEach((u, i) => {
    const x = 70 + i * 210, lv = S.lv[u.k], ok = lv < 5 && S.cash >= cost(u.k);
    g.rrect(x, 200, 190, 230, 16, g.inRect(x, 200, 190, 230) ? '#334155' : '#1f2937', ok ? '#22c55e' : '#475569', 3);
    g.emoji(u.e, x + 95, 250, 48); g.text(`${i + 1}. ${u.n}`, x + 95, 300, 20, '#fff'); g.text(u.d, x + 95, 326, 13, '#94a3b8');
    for (let k = 0; k < 5; k++) g.rect(x + 30 + k * 27, 350, 22, 12, k < lv ? '#fde047' : '#374151');
    g.text(lv >= 5 ? 'MAX' : `💰 ${cost(u.k)}`, x + 95, 400, 18, ok ? '#22c55e' : '#94a3b8');
  });
  g.button(380, 490, 200, 56, '출발 ▶ (Space)', '#be123c', 20);
}
function toS(x, y) { return [(x - S.camX) * S.zoom + VW / 2, (y - S.camY) * S.zoom + VH / 2]; }
function drawCar(g, c, car) {
  c.save(); c.translate(car.x, car.y); c.rotate(car.a);
  g.rrect(-21, -12, 44, 26, 6, 'rgba(0,0,0,.35)');
  c.fillStyle = '#111'; c.fillRect(-16, -14, 10, 5); c.fillRect(-16, 9, 10, 5); c.fillRect(8, -14, 10, 5); c.fillRect(8, 9, 10, 5);
  g.rrect(-22, -11, 44, 22, 6, car.col, '#0008', 1.5);
  g.rrect(-6, -9, 14, 18, 3, '#1e293b');
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-20, -2, 30, 4);
  c.fillStyle = '#fef08a'; c.fillRect(19, -9, 3, 5); c.fillRect(19, 4, 3, 5);
  c.fillStyle = car.boost > 0 || (car === S.me && g.a && car.nos > 0) ? '#38bdf8' : '#ef4444'; c.fillRect(-23, -9, 2, 5); c.fillRect(-23, 4, 2, 5);
  c.restore();
  if (car !== S.me) g.text(car.name, car.x, car.y - 26, 12, '#fff');
}
function hud(g, c) {
  const me = S.me, sp = Math.hypot(me.vx, me.vy);
  g.rrect(12, 12, 160, 86, 14, 'rgba(0,0,0,.6)');
  g.text(`${S.rank}위`, 92, 42, 32, S.rank === 1 ? '#fde047' : '#fff'); g.text(`랩 ${Math.max(1, Math.min(LAPS, me.lap + 1))}/${LAPS}`, 92, 78, 16, '#cbd5e1');
  g.rrect(VW - 192, VH - 96, 180, 84, 14, 'rgba(0,0,0,.6)');
  g.text(Math.round(sp * 0.6) + ' km/h', VW - 102, VH - 70, 24, '#fff');
  g.text('니트로', VW - 160, VH - 36, 13, '#94a3b8'); g.rect(VW - 130, VH - 43, 106, 14, '#334155'); g.rect(VW - 130, VH - 43, 106 * me.nos, 14, '#38bdf8');
  // 콤보
  if (S.combo > 0) {
    const a = Math.min(1, S.combo / 300);
    g.text(`${Math.round(S.combo)}`, VW / 2, 70, 34 + a * 10, '#fde047');
    g.text(`x${S.mult} 드리프트 ${Math.round((S.dAng || 0) * 57)}°`, VW / 2, 108, 18, S.mult >= 5 ? '#f472b6' : '#fff');
    g.rect(VW / 2 - 80, 124, 160, 6, '#334155'); g.rect(VW / 2 - 80, 124, 160 * ((S.driftT % 1.2) / 1.2), 6, '#f472b6');
  }
  g.rrect(VW - 192, 12, 180, 60, 14, 'rgba(0,0,0,.6)');
  g.text(`드리프트 ${S.total.toLocaleString()}`, VW - 102, 32, 16, '#fde047'); g.text(`최고 콤보 ${S.best}`, VW - 102, 56, 13, '#cbd5e1');
  // 미니맵
  const mm = 150, xs = S.path.map((p) => p[0]), ys = S.path.map((p) => p[1]);
  if (!S.mmB) S.mmB = 0;
  const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys), sc = mm / Math.max(mxx - mnx, mxy - mny);
  g.rrect(12, VH - mm - 28, mm + 16, mm + 16, 12, 'rgba(0,0,0,.5)');
  c.save(); c.translate(20, VH - mm - 20); c.strokeStyle = '#94a3b8'; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i < S.path.length; i += 3) { const p = S.path[i]; const X = (p[0] - mnx) * sc, Y = (p[1] - mny) * sc; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
  c.closePath(); c.stroke();
  for (const car of S.cars) g.circle((car.x - mnx) * sc, (car.y - mny) * sc, car === me ? 5 : 4, car.col);
  c.restore();
  if (S.count > 0) g.text(Math.ceil(S.count), VW / 2, VH / 2 - 40, 100, '#fff');
  if (S.count > 0 && S.count > 2.5) g.text(`${TRACKS[S.ev].n}`, VW / 2, VH / 2 + 50, 28, '#fde047');
  if (S.res) {
    const R = S.res;
    g.rrect(280, 150, 400, 280, 20, 'rgba(15,23,42,.93)', '#fde047', 3);
    g.text(`${R.pos}위 완주!`, VW / 2, 200, 36, R.pos <= 3 ? '#fde047' : '#ef4444');
    g.text(`순위 상금 💰 ${R.prize}`, VW / 2, 260, 18, '#fff');
    g.text(`드리프트 점수 ${R.drift.toLocaleString()} → 💰 ${Math.round(R.drift / 4)}`, VW / 2, 292, 18, '#fff');
    g.text(`총 💰 ${R.earned}`, VW / 2, 334, 24, '#22c55e');
    g.text(R.pos <= 3 ? 'Space: 계속' : '3위 밖 — 탈락', VW / 2, 390, 16, '#94a3b8');
  }
}
