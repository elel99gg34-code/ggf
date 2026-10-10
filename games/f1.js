'use strict';
let S;
const SEGL = 200, RW = 2000, CAMH = 1000, DRAW = 170, CD = 1 / Math.tan((50 * Math.PI) / 180);
const MAXSP = SEGL * 60, PZ = CAMH * CD, CARW = 0.24, LAPS = 3, VW = 960, VH = 600;
const TIRES = [
  { n: '소프트', k: 'S', c: '#ef4444', grip: 1.07, wear: 1.75, top: 1.02 },
  { n: '미디엄', k: 'M', c: '#facc15', grip: 1.0, wear: 1.0, top: 1.0 },
  { n: '하드', k: 'H', c: '#f1f5f9', grip: 0.93, wear: 0.6, top: 0.985 },
];
const NAMES = ['베르스타펜', '해밀턴', '르클레르', '노리스', '알론소', '러셀', '사인츠'];
const TEAM = ['#1e3a8a', '#14b8a6', '#dc2626', '#f97316', '#047857', '#38bdf8', '#be185d'];
const PTS = [25, 18, 15, 12, 10, 8, 6, 4];
const GPS = [
  { n: '모나코', sky: ['#0ea5e9', '#bae6fd'], grass: ['#4d7c0f', '#467310'], hill: ['#166534', '#15803d'], deco: ['🌴', '🏢', '🌴', '🛥️'],
    road: [[40, 120, 40, 0, 0], [30, 60, 30, 5, 10], [40, 100, 40, 0, 20], [30, 50, 30, -6, 0], [20, 60, 20, 3, -20], [40, 140, 40, 0, 0], [30, 80, 30, -4, 30], [30, 60, 30, 6, -10], [40, 160, 40, 0, -20], [30, 50, 30, -5, 0], [40, 90, 40, 2, 15], [30, 60, 30, 5, 0], [50, 150, 50, 0, 0]] },
  { n: '스즈카', sky: ['#7c3aed', '#fbcfe8'], grass: ['#3f6212', '#365314'], hill: ['#4c1d95', '#6d28d9'], deco: ['🌸', '🌳', '🎌', '🌸'],
    road: [[50, 140, 50, 0, 0], [30, 60, 30, 4, 30], [30, 50, 30, -4, 0], [30, 50, 30, 4, -20], [30, 50, 30, -4, 0], [40, 100, 40, 0, 40], [40, 70, 40, 6, 0], [40, 160, 40, 0, -40], [30, 60, 30, -3, 20], [30, 70, 30, 5, 0], [40, 120, 40, -2, -10], [30, 40, 30, -6, 0], [60, 150, 60, 0, 0]] },
  { n: '인터라고스', sky: ['#ea580c', '#fde68a'], grass: ['#65a30d', '#5b950b'], hill: ['#a16207', '#ca8a04'], deco: ['🌳', '🌵', '🏟️', '🌳'],
    road: [[50, 160, 50, 0, -20], [30, 50, 30, -6, -10], [30, 70, 30, 3, 30], [40, 120, 40, 0, 20], [30, 80, 30, -5, 0], [30, 60, 30, 5, -30], [40, 110, 40, -2, 0], [30, 70, 30, 6, 30], [40, 180, 40, 0, 0], [30, 60, 30, -4, -20], [30, 60, 30, -3, 10], [60, 160, 60, 0, 0]] },
];
const SPR = {};
GAME({
  title: 'F1 그랑프리', w: VW, h: VH, bg: '#0ea5e9', controls: 'dpad+ab', aLabel: '확인', bLabel: '브레이크',
  help: '↑ 가속 · ↓/X 브레이크 · ←→ 조향\n타이어는 달릴수록 닳아 그립이 떨어져요 (코너·잔디에서 더 빨리!)\n피트 구간(마지막 직선)에서 도로 오른쪽 끝 피트레인으로 들어가 피트스톱\n피트: ←→ 타이어 선택 · Space 확정 → 초록 구간에서 Space로 빠른 교체\n3개 그랑프리 · 3랩 레이스 · 챔피언십 포인트로 우승을 노려라',
  init(g) {
    S = { gp: 0, champ: NAMES.map(() => 0), me: 0, msg: '', msgT: 0 };
    loadGP(g);
  },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.result) { S.result.t -= dt; if (S.result.t <= 0 || (S.result.t < 3 && (g.pressed('a') || g.mouse.clicked))) nextGP(g); return; }
    const L = S.segs.length, TL = L * SEGL;
    if (S.count > 0) {
      S.count -= dt;
      const lit = Math.min(5, Math.floor((S.countMax - S.count) / 0.6));
      if (lit > S.lit && lit <= 5) { S.lit = lit; g.sfx.beep(330, 0.12); }
      if (S.count <= 0) { g.sfx.beep(880, 0.35); flash('출발!', '#22c55e'); }
      return;
    }
    S.time += dt; S.lapT += dt;
    // 플레이어
    const seg = S.segs[Math.floor(S.pos / SEGL) % L];
    const T = TIRES[S.tire], blown = S.wear >= 1;
    const grip = (1 - Math.min(1, S.wear) * 0.5) * T.grip * (blown ? 0.6 : 1);
    const zone = inZone(seg.i), inPit = zone && S.px > 1.1;
    if (S.pit) { pitUpdate(g, dt); }
    else {
      const sp = S.speed / MAXSP;
      const steer = (g.right ? 1 : 0) - (g.left ? 1 : 0);
      let maxS = MAXSP * T.top * (blown ? 0.55 : 1) * (0.93 + 0.07 * grip);
      if (inPit) maxS = MAXSP * 0.33;
      const gas = g.up || (g.mouse.down && g.mouse.y < VH * 0.5);
      const brk = g.down || g.b;
      if (gas) S.speed += MAXSP * 0.24 * (1 - sp * 0.55) * dt;
      else if (brk) S.speed -= MAXSP * 0.85 * dt;
      else S.speed -= MAXSP * 0.15 * dt;
      if (brk && gas) S.speed -= MAXSP * 0.5 * dt;
      const ms = g.mouse.down ? U.clamp((g.mouse.x - VW / 2) / 200, -1, 1) : 0;
      const st = steer || ms;
      S.px += st * dt * 2.1 * sp * (0.55 + 0.45 * grip);
      S.px -= dt * 2 * sp * sp * seg.curve * 0.31 * (1 + (1 - grip) * 1.4);
      S.steer = U.lerp(S.steer, st, dt * 8);
      const off = Math.abs(S.px) > 1 && !(inPit && S.px > 1);
      if (off && S.speed > MAXSP / 4) { S.speed -= MAXSP * 0.7 * dt; S.wear += dt * 0.02; if (g.frame % 4 === 0) g.shake(3, 0.1); if (g.frame % 3 === 0) g.burst(VW / 2 + U.rand(-90, 90), VH - 20, ['#65a30d', '#a16207'], 2, 120, 0.4, 4); }
      if (inPit && S.speed > maxS) S.speed = U.lerp(S.speed, maxS, dt * 3);
      S.speed = U.clamp(S.speed, 0, maxS);
      S.px = U.clamp(S.px, -2.2, zone ? 1.9 : 2.2);
      if (!zone && S.px > 1.1 && S.inLane) S.inLane = false;
      S.inLane = inPit;
      S.wear += dt * T.wear * (sp * sp * 0.0105 + Math.abs(st) * sp * 0.006 + Math.abs(seg.curve) * sp * 0.0012);
      if (S.wear > 0.75 && !S.warned) { S.warned = true; flash('⚠ 타이어 마모 심각! 피트인 하세요', '#f97316'); g.sfx.beep(220, 0.3); }
      if (S.wear >= 1 && !S.blownMsg) { S.blownMsg = true; flash('💥 타이어 펑크!', '#ef4444'); g.sfx.explode(); g.shake(8, 0.4); }
      // 피트 박스 도착
      if (inPit && !S.pitDone && seg.i >= S.pitBox && seg.i < S.pitBox + 6) { S.pit = { ph: 'choose', sel: S.tire === 1 ? 2 : 1, t: 0, n: 0, m: 0, dir: 1, cost: 0 }; S.speed = 0; g.sfx.drop(); }
      if (!zone) S.pitDone = false;
      // 엔진음
      S.eng -= dt; if (S.eng <= 0 && S.speed > 10) { S.eng = 0.09; const r = (S.speed / MAXSP * 8) % 1; g.sfx.tone(90 + r * 160 + S.speed / MAXSP * 120, 0.08, 'sawtooth', 0.012); }
    }
    S.sky1 += seg.curve * (S.speed / MAXSP) * dt * 120;
    S.pos += S.speed * dt;
    if (S.pos >= TL) { S.pos -= TL; lapDone(g); }
    if (S.ended) return;
    // AI
    for (const c of S.cars) aiUpdate(g, c, dt, TL);
    // 충돌
    for (const c of S.cars) {
      let dz = c.z - S.pos; if (dz > TL / 2) dz -= TL; if (dz < -TL / 2) dz += TL;
      if (Math.abs(dz) < SEGL * 0.8 && Math.abs(c.x - S.px) < CARW * 0.85) {
        if (dz > 0 && S.speed > c.speed) { S.speed = c.speed * 0.75; S.px += (S.px > c.x ? 0.08 : -0.08); S.wear += 0.02; g.shake(7, 0.25); g.sfx.hit(); g.burst(VW / 2, VH - 120, ['#fff', '#94a3b8', TEAM[c.k]], 14, 260, 0.5, 4); }
        else if (dz <= 0 && c.speed > S.speed) { c.speed = S.speed * 0.8; c.x += c.x > S.px ? 0.1 : -0.1; }
      }
    }
    // 순위
    const myP = S.lap * TL + S.pos;
    let r = 1; for (const c of S.cars) if (c.lap * TL + c.z > myP) r++;
    if (r < S.rank && S.time > 3) { g.sfx.coin(); g.add(50); }
    S.rank = r;
    g.info = `GP ${S.gp + 1}/3 ${GPS[S.gp].n} · 랩 ${Math.max(1, Math.min(LAPS, S.lap + 1))}/${LAPS} · ${S.rank}위`;
  },
  draw(g, c) {
    const L = S.segs.length, TL = L * SEGL, gp = GPS[S.gp];
    const camZ = (S.pos - PZ + TL) % TL;
    const base = S.segs[Math.floor(camZ / SEGL) % L], bp = (camZ % SEGL) / SEGL;
    const ps = S.segs[Math.floor(S.pos / SEGL) % L], pp = (S.pos % SEGL) / SEGL;
    const py = U.lerp(ps.y1, ps.y2, pp);
    // 하늘 & 언덕
    const sky = c.createLinearGradient(0, 0, 0, VH / 2); sky.addColorStop(0, gp.sky[0]); sky.addColorStop(1, gp.sky[1]);
    c.fillStyle = sky; c.fillRect(0, 0, VW, VH);
    hills(c, S.sky1 * 0.4, 230, 70, gp.hill[0], 0.006);
    hills(c, S.sky1, 270, 45, gp.hill[1], 0.011);
    let maxy = VH, x = 0, dx = -(base.curve * bp);
    const camX = S.px * RW, camY = py + CAMH;
    for (let n = 0; n < DRAW; n++) {
      const s = S.segs[(base.i + n) % L], loop = s.i < base.i ? TL : 0;
      const z1 = s.i * SEGL + loop - camZ, z2 = z1 + SEGL;
      s.clip = maxy; s.ok = false;
      if (z1 <= CD * 2) { x += dx; dx += s.curve; continue; }
      s.S1 = CD / z1; s.S2 = CD / z2;
      s.X1 = VW / 2 + s.S1 * (x - camX) * VW / 2; s.X2 = VW / 2 + s.S2 * (x + dx - camX) * VW / 2;
      s.Y1 = VH / 2 - s.S1 * (s.y1 - camY) * VH / 2; s.Y2 = VH / 2 - s.S2 * (s.y2 - camY) * VH / 2;
      s.W1 = s.S1 * RW * VW / 2; s.W2 = s.S2 * RW * VW / 2;
      x += dx; dx += s.curve;
      s.ok = true;
      if (s.Y2 >= s.Y1 || s.Y2 >= maxy) continue;
      const alt = Math.floor(s.i / 3) % 2, zone = inZone(s.i);
      c.fillStyle = gp.grass[alt]; c.fillRect(0, s.Y2, VW, s.Y1 - s.Y2 + 1);
      if (zone) quad(c, s.X1 + s.W1 * 1.05, s.Y1, s.W1 * 0.75, s.X2 + s.W2 * 1.05, s.Y2, s.W2 * 0.75, alt ? '#52525b' : '#57575f', 0.5);
      if (zone) quad(c, s.X1 + s.W1 * 1.85, s.Y1, s.W1 * 0.05, s.X2 + s.W2 * 1.85, s.Y2, s.W2 * 0.05, '#e5e7eb');
      quad(c, s.X1, s.Y1, s.W1 * 1.12, s.X2, s.Y2, s.W2 * 1.12, alt ? '#dc2626' : '#f8fafc');
      const startLine = s.i < 2;
      quad(c, s.X1, s.Y1, s.W1, s.X2, s.Y2, s.W2, startLine ? (s.i % 2 ? '#111' : '#fff') : alt ? '#4b5563' : '#525a66');
      if (s.i === S.pitBox) quad(c, s.X1 + s.W1 * 1.4, s.Y1, s.W1 * 0.3, s.X2 + s.W2 * 1.4, s.Y2, s.W2 * 0.3, '#facc15');
      if (alt && !startLine) { const lw1 = s.W1 / 40, lw2 = s.W2 / 40; quad(c, s.X1 - s.W1 / 3, s.Y1, lw1, s.X2 - s.W2 / 3, s.Y2, lw2, '#e5e7eb'); quad(c, s.X1 + s.W1 / 3, s.Y1, lw1, s.X2 + s.W2 / 3, s.Y2, lw2, '#e5e7eb'); }
      maxy = s.Y2;
    }
    // 스프라이트 & 차량 (뒤에서 앞으로)
    for (let n = DRAW - 1; n > 0; n--) {
      const s = S.segs[(base.i + n) % L];
      if (!s.ok) continue;
      for (const sp of s.sprites) {
        const sz = s.S1 * RW * VW / 2 * sp.sz, sx = s.X1 + s.S1 * sp.x * RW * VW / 2;
        if (sz < 2 || sx < -sz || sx > VW + sz) continue;
        clipDraw(c, s.clip, s.Y1 - sz, () => { if (sp.e === 'GANTRY') gantry(c, s.X1, s.Y1, s.W1); else c.drawImage(spr(sp.e), sx - sz / 2, s.Y1 - sz, sz, sz); });
      }
      for (const car of s.cars) {
        const pc = (car.z % SEGL) / SEGL, sc = U.lerp(s.S1, s.S2, pc);
        const cx = U.lerp(s.X1, s.X2, pc) + sc * car.x * RW * VW / 2, cy = U.lerp(s.Y1, s.Y2, pc), w = sc * CARW * RW * VW / 2;
        clipDraw(c, s.clip, cy - w * 0.5, () => { drawCar(c, cx, cy, w, TEAM[car.k], 0, car.wear, TIRES[car.tire].c); if (w > 30) g.text(NAMES[car.k], cx, cy - w * 0.62, Math.min(16, w * 0.14), '#fff'); });
      }
    }
    // 플레이어 차
    const bounce = S.speed > 100 ? Math.sin(g.time * 40) * 1.5 * (S.speed / MAXSP) : 0;
    drawCar(c, VW / 2, VH - 12 + bounce, 230, '#e11d48', S.steer, S.wear, TIRES[S.tire].c);
    if (S.speed > MAXSP * 0.6 && g.frame % 2 === 0) g.burst(VW / 2 + U.rand(-60, 60), VH - 30, 'rgba(203,213,225,.6)', 1, 60, 0.4, 5);
    hud(g, c);
  },
});
function loadGP(g) {
  const gp = GPS[S.gp];
  S.segs = [];
  for (const [e, h, l, cv, hl] of gp.road) addRoad(e, h, l, cv, hl);
  addRoad(40, 60, 40, 0, -lastY() / SEGL);
  const L = S.segs.length;
  S.pitStart = L - 90; S.pitBox = L - 40; S.pitEnd = 14;
  for (let i = 0; i < L; i++) {
    const s = S.segs[i];
    if (i % 6 === 0 && U.rand() < 0.75) s.sprites.push({ e: U.choice(gp.deco), x: -(1.5 + U.rand(0, 2.5)), sz: U.rand(0.7, 1.1) });
    if (i % 6 === 3 && !inZone(i) && U.rand() < 0.75) s.sprites.push({ e: U.choice(gp.deco), x: 1.5 + U.rand(0, 2.5), sz: U.rand(0.7, 1.1) });
    if (inZone(i) && i % 8 === 0) s.sprites.push({ e: U.choice(['🏁', '👨‍🔧', '🛞', '🏢']), x: 2.25, sz: 0.6 });
    if (Math.abs(s.curve) >= 5 && i % 10 === 0) s.sprites.push({ e: s.curve > 0 ? '⬅️' : '➡️', x: s.curve > 0 ? 1.3 : -1.3, sz: 0.5 });
    if (i % 25 === 0 && U.rand() < 0.5) s.sprites.push({ e: U.choice(['👨‍👩‍👧', '🙋', '📸', '🎉']), x: -1.35, sz: 0.35 });
  }
  S.segs[2].sprites.push({ e: 'GANTRY', x: 0, sz: 1 });
  S.segs[S.pitStart].sprites.push({ e: '🅿️', x: 1.3, sz: 0.55 });
  S.segs[S.pitBox].sprites.push({ e: '🛠️', x: 2.0, sz: 0.7 });
  const TL = L * SEGL;
  S.cars = NAMES.map((n, k) => ({ k, z: 0, lap: -1, x: 0, tx: 0, speed: 0, top: MAXSP * (0.83 + k * 0.016 + S.gp * 0.02 + U.rand(0, 0.02)), wear: 0, tire: k % 3 === 0 ? 2 : 1, pit: 0, pt: 0, seg: null, fin: 0 }));
  // 그리드: 플레이어 6번째
  const order = U.shuffle(S.cars.slice());
  const grid = [];
  order.forEach((c, i) => grid.push(c));
  grid.splice(5, 0, null);
  grid.forEach((c, i) => {
    const z = TL - 300 - i * 420, x = i % 2 ? 0.45 : -0.45;
    if (c) { c.z = z; c.x = c.tx = x; setSeg(c); }
    else { S.pos = z; S.px = x; }
  });
  Object.assign(S, { lap: -1, speed: 0, steer: 0, tire: 1, wear: 0, warned: false, blownMsg: false, pit: null, pitDone: false, inLane: false, time: 0, lapT: 0, best: 0, lapTimes: [], rank: 6, count: 3.0 + 0.6 * 5 + U.rand(0.2, 1), lit: 0, sky1: 0, eng: 0, result: null, ended: false, pitCount: 0, finCount: 0 });
  S.countMax = S.count;
  flash(`${GPS[S.gp].n} 그랑프리`, '#fde047');
}
function lastY() { return S.segs.length ? S.segs[S.segs.length - 1].y2 : 0; }
function addSeg(curve, y) { const i = S.segs.length; S.segs.push({ i, curve, y1: lastY(), y2: y, sprites: [], cars: [], ok: false, clip: 0, X1: 0, Y1: 0, W1: 0, S1: 0, X2: 0, Y2: 0, W2: 0, S2: 0 }); }
function eIn(a, b, p) { return a + (b - a) * p * p; }
function eIO(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }
function addRoad(e, h, l, cv, hl) {
  const sy = lastY(), ey = sy + hl * SEGL, t = e + h + l;
  for (let i = 0; i < e; i++) addSeg(eIn(0, cv, i / e), eIO(sy, ey, i / t));
  for (let i = 0; i < h; i++) addSeg(cv, eIO(sy, ey, (e + i) / t));
  for (let i = 0; i < l; i++) addSeg(eIO(cv, 0, i / l), eIO(sy, ey, (e + h + i) / t));
}
function inZone(i) { return i >= S.pitStart || i < S.pitEnd; }
function setSeg(c) {
  const s = S.segs[Math.floor(c.z / SEGL) % S.segs.length];
  if (s !== c.seg) { if (c.seg) { const a = c.seg.cars, j = a.indexOf(c); if (j >= 0) a.splice(j, 1); } s.cars.push(c); c.seg = s; }
}
function aiUpdate(g, c, dt, TL) {
  const s = c.seg, zone = inZone(s.i);
  let target = c.top * (1 - Math.abs(s.curve) * 0.028) * (1 - c.wear * 0.12) * TIRES[c.tire].top;
  const myP = S.lap * TL + S.pos, cp = c.lap * TL + c.z;
  if (cp - myP > TL * 0.35) target *= 0.94; if (myP - cp > TL * 0.35) target *= 1.05;
  if (c.fin) target *= 0.6;
  if (c.pit === 0 && c.wear > 0.55 && zone && s.i >= S.pitStart && s.i < S.pitBox - 20 && !c.fin) { c.pit = 1; c.tx = 1.4; }
  if (c.pit === 1) { target = MAXSP * 0.33; if (s.i >= S.pitBox && s.i < S.pitBox + 10) { c.pit = 2; c.pt = 2.6 + U.rand(0, 1.2); } }
  if (c.pit === 2) { target = 0; c.speed = 0; c.pt -= dt; if (c.pt <= 0) { c.pit = 3; c.wear = 0; c.tire = U.choice([0, 1, 2]); } }
  if (c.pit === 3) { target = MAXSP * 0.33; if (s.i >= S.pitEnd - 4 && s.i < S.pitEnd + 10) { c.pit = 0; c.tx = U.rand(-0.6, 0.6); } }
  if (c.pit === 0) {
    c.ct = (c.ct || 0) - dt;
    if (c.ct <= 0) { c.ct = U.rand(2, 5); c.tx = U.clamp(-s.curve * 0.1 + U.rand(-0.4, 0.4), -0.7, 0.7); }
    // 앞차 회피
    let dzP = S.pos - c.z; if (dzP < 0) dzP += TL;
    if (dzP < SEGL * 6 && Math.abs(S.px - c.x) < 0.35 && S.speed < c.speed) c.tx = S.px > 0 ? S.px - 0.5 : S.px + 0.5;
    for (const o of S.cars) { if (o === c) continue; let d = o.z - c.z; if (d < 0) d += TL; if (d < SEGL * 4 && Math.abs(o.x - c.x) < 0.3 && o.speed < c.speed) { c.tx = o.x > 0 ? o.x - 0.45 : o.x + 0.45; break; } }
    c.tx = U.clamp(c.tx, -0.8, 0.8);
  }
  if (S.count > 0) target = 0;
  c.speed += U.clamp(target - c.speed, -MAXSP * 0.8 * dt, MAXSP * 0.22 * dt);
  c.x += U.clamp(c.tx - c.x, -dt * 0.9, dt * 0.9);
  c.wear += dt * TIRES[c.tire].wear * (c.speed / MAXSP) ** 2 * 0.0105;
  c.z += c.speed * dt;
  if (c.z >= TL) { c.z -= TL; c.lap++; if (c.lap >= LAPS && !c.fin) { c.fin = ++S.finCount; } }
  setSeg(c);
}
function lapDone(g) {
  S.lap++;
  if (S.lap > 0) {
    S.lapTimes.push(S.lapT);
    const fast = !S.best || S.lapT < S.best;
    if (fast) S.best = S.lapT;
    flash(`랩 ${S.lap} · ${fmt(S.lapT)}${fast ? ' 🟣 베스트!' : ''}`, fast ? '#c084fc' : '#fff');
    g.add(fast ? 300 : 100); g.sfx.coin();
  }
  S.lapT = 0;
  if (S.lap >= LAPS) finish(g);
  else if (S.lap === LAPS - 1) flash('🏁 마지막 랩!', '#fde047');
}
function finish(g) {
  S.ended = true;
  const TL = S.segs.length * SEGL, myP = S.lap * TL + S.pos;
  const ord = S.cars.map((c) => ({ k: c.k, p: c.lap * TL + c.z, me: false })).concat([{ k: -1, p: myP, me: true }]);
  ord.sort((a, b) => b.p - a.p);
  const rows = ord.map((o, i) => { const pts = PTS[i] || 0; if (o.me) S.me += pts; else S.champ[o.k] += pts; return { name: o.me ? '나' : NAMES[o.k], pts, me: o.me }; });
  const pos = ord.findIndex((o) => o.me) + 1;
  g.add((PTS[pos - 1] || 0) * 100);
  if (pos === 1) { g.sfx.win(); g.burst(VW / 2, 200, ['#fde047', '#f472b6', '#22d3ee', '#fff'], 60, 400, 1.2, 5); }
  else g.sfx.power();
  S.result = { rows, pos, t: 7 };
}
function nextGP(g) {
  S.gp++;
  if (S.gp >= GPS.length) {
    const rank = 1 + S.champ.filter((p) => p > S.me).length;
    if (rank === 1) g.win(`🏆 월드 챔피언! (${S.me}포인트)`);
    else g.over(`챔피언십 ${rank}위 · ${S.me}포인트`);
    return;
  }
  S.result = null;
  loadGP(g);
}
function pitUpdate(g, dt) {
  const P = S.pit;
  P.t += dt; S.speed = 0;
  if (P.ph === 'choose') {
    if (g.pressed('left')) { P.sel = (P.sel + 2) % 3; g.sfx.click(); }
    if (g.pressed('right')) { P.sel = (P.sel + 1) % 3; g.sfx.click(); }
    for (let i = 0; i < 3; i++) if (g.clickIn(255 + i * 155, 290, 140, 110)) { P.sel = i; P.ph = 'work'; P.t = 0; g.sfx.click(); }
    if (g.pressed('a') && P.ph === 'choose') { P.ph = 'work'; P.t = 0; g.sfx.click(); }
  } else if (P.ph === 'work') {
    P.m += dt * 1.6 * P.dir; if (P.m > 1) { P.m = 1; P.dir = -1; } if (P.m < 0) { P.m = 0; P.dir = 1; }
    if (P.wait > 0) { P.wait -= dt; return; }
    if (g.pressed('a') || g.mouse.clicked) {
      const good = Math.abs(P.m - 0.5) < 0.12;
      P.cost += good ? 0.35 : 1.1; P.n++;
      g.sfx.tone(good ? 900 : 200, 0.12, 'square', 0.06);
      g.float(VW / 2, 420, good ? '퍼펙트!' : '미스 +0.8초', good ? '#22c55e' : '#ef4444', 24);
      P.wait = good ? 0.25 : 0.8;
      if (P.n >= 4) { P.ph = 'go'; P.t = 0; P.total = 1.2 + P.cost; }
    }
  } else if (P.ph === 'go') {
    if (P.t >= 0.6) {
      S.tire = P.sel; S.wear = 0; S.warned = S.blownMsg = false; S.pitDone = true; S.pit = null; S.pitCount++;
      flash(`피트스톱 ${P.total.toFixed(1)}초 · ${TIRES[S.tire].n}`, '#22c55e'); g.sfx.power(); g.add(P.total < 3 ? 400 : 150);
    }
  }
}
function flash(t, col) { S.msg = t; S.msgC = col; S.msgT = 2.4; }
function fmt(t) { return Math.floor(t / 60) + ':' + (t % 60).toFixed(2).padStart(5, '0'); }
function quad(c, x1, y1, w1, x2, y2, w2, col, off) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x2 - w2, y2); c.lineTo(x2 + w2, y2); c.lineTo(x1 + w1, y1); c.closePath(); c.fill();
}
function hills(c, off, y, amp, col, f) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 16) c.lineTo(x, y - amp * (0.6 + 0.4 * Math.sin((x + off) * f) * Math.cos((x + off) * f * 0.37)));
  c.lineTo(VW, VH); c.closePath(); c.fill();
}
function spr(e) {
  if (!SPR[e]) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.font = '104px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 70); SPR[e] = cv; }
  return SPR[e];
}
function clipDraw(c, clip, top, fn) {
  if (top >= clip) return;
  c.save(); c.beginPath(); c.rect(0, 0, VW, clip); c.clip(); fn(); c.restore();
}
function gantry(c, x, y, w) {
  const h = w * 0.9;
  c.fillStyle = '#334155'; c.fillRect(x - w * 1.25, y - h, w * 0.06, h); c.fillRect(x + w * 1.19, y - h, w * 0.06, h);
  c.fillRect(x - w * 1.25, y - h, w * 2.5, w * 0.16);
  for (let i = 0; i < 5; i++) { const on = S.count > 0 && i < S.lit; c.fillStyle = on ? '#ef4444' : S.count <= 0 && S.time < 2 ? '#22c55e' : '#111827'; c.beginPath(); c.arc(x - w * 0.4 + i * w * 0.2, y - h + w * 0.08, w * 0.05, 0, 7); c.fill(); }
}
function drawCar(c, x, y, w, col, steer, wear, tc) {
  const h = w * 0.42;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, -h * 0.05, w * 0.55, h * 0.12, 0, 0, 7); c.fill();
  // 뒷바퀴
  c.fillStyle = '#111'; c.fillRect(-w * 0.5, -h * 0.62, w * 0.22, h * 0.6); c.fillRect(w * 0.28, -h * 0.62, w * 0.22, h * 0.6);
  c.fillStyle = tc; c.fillRect(-w * 0.5, -h * 0.36, w * 0.22, h * 0.05); c.fillRect(w * 0.28, -h * 0.36, w * 0.22, h * 0.05);
  // 앞바퀴(조향)
  c.fillStyle = '#1f2937'; c.fillRect(-w * 0.42 + steer * w * 0.03, -h * 0.82, w * 0.14, h * 0.3); c.fillRect(w * 0.28 + steer * w * 0.03, -h * 0.82, w * 0.14, h * 0.3);
  // 차체
  c.fillStyle = col; c.beginPath(); c.moveTo(-w * 0.26, -h * 0.12); c.lineTo(-w * 0.16, -h * 0.85); c.lineTo(w * 0.16, -h * 0.85); c.lineTo(w * 0.26, -h * 0.12); c.closePath(); c.fill();
  c.fillStyle = '#0f172a'; c.fillRect(-w * 0.28, -h * 0.5, w * 0.56, h * 0.16);
  // 헬멧
  c.fillStyle = '#fde047'; c.beginPath(); c.arc(0, -h * 0.92, w * 0.07, 0, 7); c.fill();
  c.fillStyle = '#111'; c.fillRect(-w * 0.06, -h * 0.94, w * 0.12, h * 0.05);
  // 리어윙
  c.fillStyle = col; c.fillRect(-w * 0.34, -h * 1.15, w * 0.68, h * 0.17);
  c.fillStyle = '#111'; c.fillRect(-w * 0.34, -h * 0.98, w * 0.68, h * 0.04); c.fillRect(-w * 0.03, -h * 0.98, w * 0.06, h * 0.4);
  c.fillStyle = '#ef4444'; c.fillRect(-w * 0.04, -h * 0.3, w * 0.08, h * 0.08);
  if (wear > 0.85) { c.fillStyle = 'rgba(148,163,184,.5)'; c.beginPath(); c.arc(-w * 0.4, -h * 0.1, w * 0.12, 0, 7); c.arc(w * 0.4, -h * 0.1, w * 0.12, 0, 7); c.fill(); }
  c.restore();
}
function hud(g, c) {
  // 속도계
  const kmh = Math.round(S.speed / MAXSP * 330);
  g.rrect(VW - 200, VH - 130, 188, 118, 14, 'rgba(15,23,42,.75)');
  g.text(kmh, VW - 106, VH - 95, 44, '#fff'); g.text('km/h', VW - 106, VH - 62, 14, '#94a3b8');
  const gear = S.speed < 50 ? 'N' : String(Math.min(8, 1 + Math.floor(S.speed / MAXSP * 7.9)));
  g.text('기어 ' + gear, VW - 106, VH - 34, 16, '#fde047');
  // 타이어
  const T = TIRES[S.tire], wp = Math.min(1, S.wear);
  g.rrect(12, VH - 130, 200, 118, 14, 'rgba(15,23,42,.75)');
  g.circle(50, VH - 90, 24, '#111'); g.ring(50, VH - 90, 20, T.c, 6); g.text(T.k, 50, VH - 89, 18, T.c);
  g.text(T.n, 140, VH - 104, 16, '#fff');
  g.rect(90, VH - 86, 110, 12, '#334155'); g.rect(90, VH - 86, 110 * (1 - wp), 12, wp > 0.75 ? '#ef4444' : wp > 0.45 ? '#facc15' : '#22c55e');
  g.text(`타이어 ${Math.round((1 - wp) * 100)}%`, 145, VH - 60, 14, '#e2e8f0');
  g.text(S.wear >= 1 ? '💥 펑크' : `피트 ${S.pitCount}회`, 112, VH - 32, 14, S.wear >= 1 ? '#ef4444' : '#94a3b8');
  // 순위/랩
  g.rrect(12, 12, 170, 96, 14, 'rgba(15,23,42,.75)');
  g.text(`P${S.rank}`, 60, 52, 42, S.rank === 1 ? '#fde047' : '#fff'); g.text('/8', 110, 60, 18, '#94a3b8');
  g.text(`랩 ${Math.max(1, Math.min(LAPS, S.lap + 1))}/${LAPS}`, 97, 90, 16, '#e2e8f0');
  g.rrect(VW - 182, 12, 170, 70, 14, 'rgba(15,23,42,.75)');
  g.text(fmt(S.lapT), VW - 97, 36, 20, '#fff'); g.text('베스트 ' + (S.best ? fmt(S.best) : '-:--.--'), VW - 97, 62, 14, '#c084fc');
  // 피트 안내
  const seg = S.segs[Math.floor(S.pos / SEGL) % S.segs.length];
  if (inZone(seg.i) && !S.pitDone && !S.pit && seg.i >= S.pitStart && seg.i < S.pitBox) g.text(S.px > 1.1 ? '🛠️ 피트레인 · 속도 제한' : 'PIT ▶ 오른쪽 끝으로 들어가면 피트인', VW / 2, 130, 18, '#fde047');
  if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 90, 30, S.msgC); c.globalAlpha = 1; }
  if (S.count > 0) {
    g.rrect(VW / 2 - 170, 150, 340, 80, 16, 'rgba(0,0,0,.8)');
    for (let i = 0; i < 5; i++) g.circle(VW / 2 - 128 + i * 64, 190, 22, i < S.lit ? '#ef4444' : '#1f2937');
  }
  if (S.pit) pitUI(g, c);
  if (S.result) resultUI(g, c);
}
function pitUI(g, c) {
  const P = S.pit;
  g.rrect(220, 200, 520, 280, 20, 'rgba(15,23,42,.92)', '#fde047', 3);
  if (P.ph === 'choose') {
    g.text('🛠️ 피트스톱 · 타이어 선택', VW / 2, 240, 24, '#fde047');
    TIRES.forEach((t, i) => {
      g.rrect(255 + i * 155, 290, 140, 110, 12, i === P.sel ? '#334155' : '#1e293b', i === P.sel ? t.c : '#475569', 3);
      g.circle(325 + i * 155, 325, 22, '#111'); g.ring(325 + i * 155, 325, 18, t.c, 6); g.text(t.k, 325 + i * 155, 326, 16, t.c);
      g.text(t.n, 325 + i * 155, 365, 16, '#fff'); g.text(i === 0 ? '빠름·빨리 닳음' : i === 1 ? '균형' : '느림·오래감', 325 + i * 155, 388, 12, '#94a3b8');
    });
    g.text('←→ 선택 · Space 확정', VW / 2, 440, 16, '#cbd5e1');
  } else if (P.ph === 'work') {
    g.text(`🔧 타이어 교체 ${P.n}/4`, VW / 2, 240, 24, '#fde047');
    for (let i = 0; i < 4; i++) g.emoji(i < P.n ? '✅' : '🛞', 330 + i * 100, 300, 44);
    g.rect(280, 360, 400, 26, '#334155'); g.rect(280 + 400 * 0.38, 360, 400 * 0.24, 26, '#16a34a');
    g.rect(276 + 400 * P.m, 352, 8, 42, '#fff');
    g.text('초록 구간에서 Space!', VW / 2, 430, 18, '#cbd5e1');
  } else { g.text('🟢 출발!', VW / 2, 330, 40, '#22c55e'); }
}
function resultUI(g, c) {
  const R = S.result;
  g.rrect(250, 60, 460, 480, 20, 'rgba(15,23,42,.94)', '#fde047', 3);
  g.text(`${GPS[S.gp].n} GP 결과 · ${R.pos}위`, VW / 2, 100, 26, R.pos === 1 ? '#fde047' : '#fff');
  R.rows.forEach((r, i) => { const y = 145 + i * 34; if (r.me) g.rect(270, y - 15, 420, 30, 'rgba(225,29,72,.35)'); g.text(`${i + 1}`, 300, y, 18, '#fde047'); g.text(r.name, 340, y, 18, '#fff', 'left'); g.text(`+${r.pts}`, 660, y, 16, '#22c55e', 'right'); });
  const st = NAMES.map((n, k) => ({ n, p: S.champ[k] })).concat([{ n: '나', p: S.me }]).sort((a, b) => b.p - a.p);
  g.text(`챔피언십: ${st.findIndex((s) => s.n === '나') + 1}위 (${S.me}pt) · 선두 ${st[0].n} ${st[0].p}pt`, VW / 2, 440, 16, '#cbd5e1');
  g.text(S.gp + 1 < GPS.length ? 'Space: 다음 그랑프리' : 'Space: 최종 결과', VW / 2, 500, 16, '#94a3b8');
}
