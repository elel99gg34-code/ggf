'use strict';
let S;
const VW = 960, VH = 620, AX = 40, AY = 70, AW = 880, AH = 520, CR = 21;
const NAMES = ['고철왕', '불도저', '망치', '탱크', '번개', '해골', '롤러', '폭주족', '강철이'];
const COLS = ['#f97316', '#22c55e', '#a855f7', '#eab308', '#06b6d4', '#64748b', '#ec4899', '#84cc16', '#f43f5e'];
const ROUNDS = [
  { n: 3, hp: 70, sk: 0.7 }, { n: 4, hp: 80, sk: 0.8 }, { n: 5, hp: 90, sk: 0.85 }, { n: 5, hp: 100, sk: 0.9, boss: 1 }, { n: 7, hp: 100, sk: 1 },
];
const PW = [{ k: 'fix', e: '🔧' }, { k: 'nos', e: '⚡' }, { k: 'shield', e: '🛡️' }, { k: 'spike', e: '📌' }];
GAME({
  title: '데몰리션 더비', w: VW, h: VH, bg: '#57534e', controls: 'dpad+ab', aLabel: '니트로', bLabel: '사이드',
  help: '↑ 가속 · ↓ 후진 · ←→ 조향 · Space 니트로 돌진 · Shift/X 사이드브레이크\n상대 차의 옆구리(×1.5)나 뒤(×1.2)를 들이받으면 큰 데미지! 앞범퍼는 튼튼해요(×0.5)\n🔧 수리 · ⚡ 니트로 충전 · 🛡️ 무적 · 📌 스파이크 범퍼(데미지 2배)\n마지막까지 살아남으면 라운드 승리 · 5라운드',
  init(g) { S = { rd: 0, msg: '', msgT: 0, kills: 0 }; loadRound(g, 100); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.end > 0) { S.end -= dt; if (S.end <= 0) { if (S.won) { S.rd++; if (S.rd >= ROUNDS.length) return g.win(`🏆 더비 챔피언! 격파 ${S.kills}대`); loadRound(g, Math.min(100, S.me.hp + 40)); } else return g.over(`라운드 ${S.rd + 1}에서 폐차… 격파 ${S.kills}대`); } updCars(g, dt * 0.4); return; }
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.cb) { S.cb = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 880 : 440, 0.12); } return; }
    S.t += dt;
    const me = S.me;
    if (me.alive) {
      const ms = g.mouse.down;
      let steer = (g.right ? 1 : 0) - (g.left ? 1 : 0), gas = g.up, rev = g.down;
      if (ms && !steer && !gas && !rev) { let da = Math.atan2(g.mouse.y - me.y, g.mouse.x - me.x) - me.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI; steer = U.clamp(da * 2, -1, 1); gas = true; }
      me.in = { gas, rev, steer, hand: g.b, nos: g.a };
    }
    for (const c of S.cars) if (c !== me && c.alive) ai(c, dt);
    updCars(g, dt);
    // 파워업
    S.pwT -= dt;
    if (S.pwT <= 0 && S.pws.length < 3) { S.pwT = U.rand(5, 9); S.pws.push({ ...U.choice(PW), x: U.rand(AX + 80, AX + AW - 80), y: U.rand(AY + 80, AY + AH - 80), t: 12 }); }
    for (const p of S.pws) { p.t -= dt; for (const c of S.cars) if (c.alive && U.dist(c.x, c.y, p.x, p.y) < 30 && p.t > 0) { p.t = 0; power(g, c, p.k); } }
    S.pws = S.pws.filter((p) => p.t > 0);
    // 승패
    const alive = S.cars.filter((c) => c.alive);
    if (!me.alive && !S.end) { S.end = 3; S.won = false; g.sfx.lose(); flash('💀 폐차!', '#ef4444'); }
    else if (alive.length === 1 && me.alive && !S.end) { S.end = 3; S.won = true; g.sfx.win(); g.add(2000 + S.rd * 1000 + Math.round(me.hp) * 10); flash(`🏆 라운드 ${S.rd + 1} 승리!`, '#fde047'); g.burst(me.x, me.y, ['#fde047', '#fff', '#f97316'], 50, 350, 1, 5); }
    g.info = `라운드 ${S.rd + 1}/${ROUNDS.length} · 생존 ${alive.length}대 · 격파 ${S.kills}`;
  },
  draw(g, c) {
    // 관중석 & 아레나
    g.rect(0, 0, VW, VH, '#292524');
    for (let x = 10; x < VW; x += 26) { g.emoji(['🙋', '🧑', '🙌', '🧔', '👩', '📣'][(x / 26) % 6 | 0], x, 22 + (S.hitT > 0 ? -Math.abs(Math.sin(g.time * 15 + x)) * 5 : 0), 20); g.emoji(['👨', '🎉', '👧', '🙋‍♂️', '🧑'][(x / 26) % 5 | 0], x + 12, 46, 18); }
    g.rect(AX, AY, AW, AH, '#a16207');
    c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(AX + ((i * 137) % AW), AY + ((i * 251) % AH), 10 + (i % 5) * 6, 0, 7); c.fill(); }
    for (const m of S.mud) { c.fillStyle = m.oil ? 'rgba(17,24,39,.8)' : 'rgba(68,48,20,.75)'; c.beginPath(); c.ellipse(m.x, m.y, m.r, m.r * 0.7, 0, 0, 7); c.fill(); if (m.oil) g.circle(m.x - 8, m.y - 4, 6, 'rgba(147,51,234,.4)'); }
    for (const sk of S.skid) g.line(sk[0], sk[1], sk[2], sk[3], 'rgba(40,25,10,.35)', 4);
    // 타이어 벽
    for (let x = AX; x <= AX + AW; x += 22) { tire(g, x, AY - 8); tire(g, x, AY + AH + 8); }
    for (let y = AY; y <= AY + AH; y += 22) { tire(g, AX - 8, y); tire(g, AX + AW + 8, y); }
    for (const o of S.obs) { g.circle(o.x, o.y, o.r, '#1f2937'); g.ring(o.x, o.y, o.r - 6, '#4b5563', 4); g.ring(o.x, o.y, o.r - 14, '#4b5563', 3); }
    for (const p of S.pws) { const b = Math.sin(g.time * 5) * 3; g.circle(p.x, p.y + b, 18, 'rgba(255,255,255,.25)'); g.emoji(p.e, p.x, p.y + b, 28); }
    for (const car of S.cars) drawCar(g, c, car);
    for (const car of S.cars) if (car.alive) { const w = 44; g.rect(car.x - w / 2, car.y - 38, w, 5, '#111'); g.rect(car.x - w / 2, car.y - 38, w * car.hp / car.max, 5, car.hp > 50 ? '#22c55e' : car.hp > 25 ? '#f59e0b' : '#ef4444'); if (car !== S.me) g.text(car.name, car.x, car.y - 48, 11, '#fff'); else g.text('나', car.x, car.y - 48, 12, '#fde047'); }
    // HUD
    const me = S.me;
    g.rrect(VW - 250, VH - 50, 240, 42, 10, 'rgba(0,0,0,.6)');
    g.text(`❤️ ${Math.ceil(me.hp)}`, VW - 210, VH - 29, 16, '#fff');
    g.text('⚡', VW - 160, VH - 29, 16); g.rect(VW - 145, VH - 36, 120, 14, '#334155'); g.rect(VW - 145, VH - 36, 120 * me.nos, 14, '#38bdf8');
    let st = []; if (me.shield > 0) st.push(`🛡️${Math.ceil(me.shield)}`); if (me.spike > 0) st.push(`📌${Math.ceil(me.spike)}`);
    if (st.length) g.text(st.join(' '), VW - 130, VH - 62, 16, '#fff');
    g.rrect(10, VH - 50, 300, 42, 10, 'rgba(0,0,0,.6)');
    S.cars.forEach((car, i) => { g.circle(30 + i * 34, VH - 29, 12, car.alive ? car.col : '#3f3f46'); if (!car.alive) g.text('✕', 30 + i * 34, VH - 29, 14, '#ef4444'); });
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 110, 28, S.msgC); c.globalAlpha = 1; }
    if (S.count > 0) { g.text(Math.ceil(S.count), VW / 2, VH / 2 - 30, 100, '#fff'); g.text(`라운드 ${S.rd + 1}${ROUNDS[S.rd].boss ? ' · 👹 보스 트럭 등장!' : ''}`, VW / 2, VH / 2 + 50, 26, '#fde047'); }
  },
});
function loadRound(g, hp) {
  const R = ROUNDS[S.rd];
  S.cars = [];
  const N = R.n + 1;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, x = AX + AW / 2 + Math.cos(a) * 330, y = AY + AH / 2 + Math.sin(a) * 200;
    const boss = R.boss && i === N - 1;
    S.cars.push({ i, name: i === 0 ? '나' : boss ? '👹 몬스터' : NAMES[(i - 1 + S.rd * 2) % NAMES.length], col: i === 0 ? '#dc2626' : boss ? '#1e293b' : COLS[(i - 1 + S.rd) % COLS.length], x, y, a: a + Math.PI, vx: 0, vy: 0, hp: i === 0 ? hp : boss ? 220 : R.hp, max: i === 0 ? 100 : boss ? 220 : R.hp, alive: true, mass: boss ? 2.2 : 1, size: boss ? 1.35 : 1, nos: i === 0 ? 0.6 : 0.4, nosOn: 0, shield: 0, spike: 0, sk: R.sk, in: { gas: false, rev: false, steer: 0, hand: false, nos: false }, tgt: null, tgtT: 0, stuck: 0, revT: 0, hitCd: 0, smoke: 0, lastHit: null });
  }
  S.me = S.cars[0];
  S.obs = [{ x: AX + AW / 2, y: AY + AH / 2, r: 34 }];
  if (S.rd >= 2) S.obs.push({ x: AX + AW * 0.25, y: AY + AH / 2, r: 26 }, { x: AX + AW * 0.75, y: AY + AH / 2, r: 26 });
  S.mud = [];
  for (let k = 0; k < 3 + S.rd; k++) S.mud.push({ x: U.rand(AX + 100, AX + AW - 100), y: U.rand(AY + 80, AY + AH - 80), r: U.rand(35, 60), oil: k % 3 === 2 });
  Object.assign(S, { count: 3.5, cb: 4, t: 0, end: 0, won: false, pws: [], pwT: 4, skid: [], hitT: 0 });
}
function ai(c, dt) {
  c.tgtT -= dt;
  if (!c.tgt || !c.tgt.alive || c.tgtT <= 0) {
    c.tgtT = U.rand(3, 6);
    const others = S.cars.filter((o) => o !== c && o.alive);
    others.sort((a, b) => (U.dist(c.x, c.y, a.x, a.y) - (a === S.me ? 120 : 0) + a.hp) - (U.dist(c.x, c.y, b.x, b.y) - (b === S.me ? 120 : 0) + b.hp));
    c.tgt = others[0] || null;
    const pw = S.pws.find((p) => U.dist(c.x, c.y, p.x, p.y) < 200);
    if (pw && Math.random() < 0.5) c.tgt = { x: pw.x, y: pw.y, vx: 0, vy: 0, alive: true, pw: 1 };
  }
  const t = c.tgt;
  if (!t) { c.in = { gas: false, rev: false, steer: 0 }; return; }
  if (t.pw && !S.pws.some((p) => p.x === t.x && p.y === t.y)) c.tgtT = 0;
  // 옆구리를 노림
  const lead = 0.35 * c.sk, tx = t.x + (t.vx || 0) * lead, ty = t.y + (t.vy || 0) * lead;
  let da = Math.atan2(ty - c.y, tx - c.x) - c.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const sp = Math.hypot(c.vx, c.vy);
  if (c.revT > 0) { c.revT -= dt; c.in = { gas: false, rev: true, steer: -Math.sign(da) || 1, nos: false }; return; }
  if (sp < 25 && c.in.gas) { c.stuck += dt; if (c.stuck > 0.8) { c.stuck = 0; c.revT = 0.7 + Math.random() * 0.4; } } else c.stuck = 0;
  const d = U.dist(c.x, c.y, t.x, t.y);
  c.in = { gas: Math.abs(da) < 2.2 || d > 150, rev: Math.abs(da) > 2.2 && d < 150, steer: U.clamp(da * 2.2, -1, 1) * (Math.abs(da) > 2.2 && d < 150 ? -1 : 1), hand: Math.abs(da) > 1.4 && sp > 140 && c.sk > 0.8, nos: d < 220 && Math.abs(da) < 0.25 && c.nos > 0.3 && Math.random() < 0.05 * c.sk };
}
function updCars(g, dt) {
  for (const c of S.cars) {
    c.hitCd -= dt; c.shield -= dt; c.spike -= dt; c.nosOn -= dt;
    if (!c.alive) { c.vx *= Math.pow(0.1, dt); c.vy *= Math.pow(0.1, dt); c.x += c.vx * dt; c.y += c.vy * dt; c.smoke -= dt; if (c.smoke <= 0) { c.smoke = 0.12; g.burst(c.x, c.y, ['rgba(40,40,40,.7)', 'rgba(80,80,80,.6)', '#f97316'], 1, 40, 1, 9); } continue; }
    const I = c.in, fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
    let vf = c.vx * fx + c.vy * fy, vr = c.vx * rx + c.vy * ry;
    let onMud = null; for (const m of S.mud) if (((c.x - m.x) / m.r) ** 2 + ((c.y - m.y) / (m.r * 0.7)) ** 2 < 1) onMud = m;
    const dmgF = 0.65 + 0.35 * (c.hp / c.max);
    let top = 290 * dmgF / Math.sqrt(c.mass) * (onMud && !onMud.oil ? 0.55 : 1);
    if (I.nos && c.nos > 0 && c.nosOn <= 0) { c.nosOn = 1.2; c.nos = Math.max(0, c.nos - 0.35); if (c === S.me) { g.sfx.power(); } }
    if (c.nosOn > 0) { top += 230; vf += 700 * dt; if (g.frame % 2 === 0) g.burst(c.x - fx * 24, c.y - fy * 24, ['#38bdf8', '#fde047'], 2, 100, 0.3, 4); }
    if (I.gas) vf += 360 * dt * (vf < top ? 1 : -0.5); else if (I.rev) vf -= (vf > 0 ? 520 : 260) * dt; else vf *= Math.pow(0.4, dt);
    vf = U.clamp(vf, -150, top + (c.nosOn > 0 ? 230 : 0));
    const sp = Math.hypot(vf, vr);
    c.a += (I.steer || 0) * 2.8 * (I.hand ? 1.5 : 1) * U.clamp(Math.abs(vf) / 120, 0, 1) * Math.sign(vf || 1) * dt / Math.sqrt(c.mass);
    let grip = I.hand ? 1.2 : 6; if (onMud && onMud.oil) grip = 0.6;
    vr *= Math.exp(-grip * dt);
    c.vx = fx * vf + rx * vr; c.vy = fy * vf + ry * vr;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.nos = Math.min(1, c.nos + dt * 0.04);
    if (Math.abs(vr) > 60 && g.frame % 2 === 0) { S.skid.push([c.x - fx * 14, c.y - fy * 14, c.x - fx * 14 - c.vx * 0.03, c.y - fy * 14 - c.vy * 0.03]); if (S.skid.length > 400) S.skid.shift(); }
    // 벽
    const r = CR * c.size;
    if (c.x < AX + r || c.x > AX + AW - r) { const v = Math.abs(c.vx); c.x = U.clamp(c.x, AX + r, AX + AW - r); c.vx *= -0.45; wallHit(g, c, v); }
    if (c.y < AY + r || c.y > AY + AH - r) { const v = Math.abs(c.vy); c.y = U.clamp(c.y, AY + r, AY + AH - r); c.vy *= -0.45; wallHit(g, c, v); }
    for (const o of S.obs) { const d = U.dist(c.x, c.y, o.x, o.y), m = o.r + r; if (d < m && d > 0) { const nx = (c.x - o.x) / d, ny = (c.y - o.y) / d, vn = c.vx * nx + c.vy * ny; c.x = o.x + nx * m; c.y = o.y + ny * m; if (vn < 0) { c.vx -= 1.5 * vn * nx; c.vy -= 1.5 * vn * ny; wallHit(g, c, -vn); } } }
    if (c.smoke > -1 && c.hp < c.max * 0.45) { c.smoke -= dt; if (c.smoke <= 0) { c.smoke = c.hp < c.max * 0.2 ? 0.08 : 0.2; g.burst(c.x - fx * 10, c.y - fy * 10, c.hp < c.max * 0.2 ? ['#f97316', '#ef4444', 'rgba(60,60,60,.7)'] : ['rgba(90,90,90,.6)'], 1, 30, 0.8, 7); } }
  }
  // 차끼리 충돌
  for (let i = 0; i < S.cars.length; i++) for (let j = i + 1; j < S.cars.length; j++) {
    const A = S.cars[i], B = S.cars[j], m = CR * A.size + CR * B.size, d = U.dist(A.x, A.y, B.x, B.y);
    if (d >= m || d === 0) continue;
    const nx = (B.x - A.x) / d, ny = (B.y - A.y) / d, ov = m - d, tm = A.mass + B.mass;
    A.x -= nx * ov * B.mass / tm; A.y -= ny * ov * B.mass / tm; B.x += nx * ov * A.mass / tm; B.y += ny * ov * A.mass / tm;
    const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if (vn >= 0) continue;
    const jimp = -(1.4) * vn / (1 / A.mass + 1 / B.mass);
    A.vx -= jimp * nx / A.mass; A.vy -= jimp * ny / A.mass; B.vx += jimp * nx / B.mass; B.vy += jimp * ny / B.mass;
    const imp = -vn;
    if (imp < 50) continue;
    // 부위별 데미지
    const zone = (V, sx, sy) => { let a = Math.atan2(sy, sx) - V.a; a = ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; a = Math.abs(a); return a < 0.8 ? 'front' : a > 2.35 ? 'rear' : 'side'; };
    const zA = zone(A, nx, ny), zB = zone(B, -nx, -ny);
    const mult = { front: 0.5, side: 1.5, rear: 1.2 };
    const base = imp * 0.09;
    const dB = base * mult[zB] * (zA === 'front' ? 1.2 : 0.6) * (A.spike > 0 ? 2 : 1) * (A.nosOn > 0 ? 1.4 : 1) * A.mass;
    const dA = base * mult[zA] * (zB === 'front' ? 1.2 : 0.6) * (B.spike > 0 ? 2 : 1) * (B.nosOn > 0 ? 1.4 : 1) * B.mass;
    damage(g, B, dB, A, zB); damage(g, A, dA, B, zA);
    const px = (A.x + B.x) / 2, py = (A.y + B.y) / 2;
    g.burst(px, py, ['#fde047', '#f97316', '#e5e7eb', '#94a3b8'], Math.min(24, 6 + imp / 20), 200 + imp, 0.45, 3);
    if (A === S.me || B === S.me) { g.shake(Math.min(14, imp / 25), 0.3); g.sfx.hit(); if (imp > 200) g.sfx.noise(0.2, 0.08); } else if (imp > 150) g.sfx.tone(120, 0.08, 'square', 0.03);
    S.hitT = 0.6;
  }
  S.hitT -= dt;
}
function damage(g, c, dmg, by, zone) {
  if (!c.alive || c.shield > 0) return;
  c.hp -= dmg; c.lastHit = by;
  if (by === S.me && dmg > 3) { g.add(Math.round(dmg * 10)); if (dmg > 15) g.float(c.x, c.y - 30, zone === 'side' ? `💥 T-본! ${Math.round(dmg)}` : zone === 'rear' ? `후방 ${Math.round(dmg)}` : `${Math.round(dmg)}`, zone === 'side' ? '#f472b6' : '#fde047', zone === 'side' ? 22 : 16); }
  if (c.hp <= 0) {
    c.hp = 0; c.alive = false; c.smoke = 0;
    g.sfx.explode(); g.burst(c.x, c.y, ['#f97316', '#ef4444', '#fde047', '#111'], 40, 320, 0.9, 5); g.shake(8, 0.3);
    if (by === S.me) { S.kills++; g.add(1000); flash(`💀 ${c.name} 격파!`, '#fde047'); }
    else if (c !== S.me) flash(`${c.name} 탈락`, '#cbd5e1');
  }
}
function wallHit(g, c, v) {
  if (v < 80) return;
  if (c.shield <= 0) c.hp -= v * 0.02;
  if (c.hp <= 0 && c.alive) { c.hp = 0.01; damage(g, c, 1, c.lastHit && c.lastHit.alive ? c.lastHit : null, 'front'); }
  if (c === S.me) { g.shake(Math.min(8, v / 40), 0.15); g.sfx.drop(); }
}
function power(g, c, k) {
  if (k === 'fix') c.hp = Math.min(c.max, c.hp + 30);
  if (k === 'nos') c.nos = 1;
  if (k === 'shield') c.shield = 5;
  if (k === 'spike') c.spike = 8;
  if (c === S.me) { g.sfx.power(); flash({ fix: '🔧 수리 +30', nos: '⚡ 니트로 충전', shield: '🛡️ 무적 5초', spike: '📌 스파이크 범퍼!' }[k], '#22d3ee'); }
}
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 1.8; }
function tire(g, x, y) { g.circle(x, y, 11, '#111827'); g.circle(x, y, 5, '#374151'); }
function drawCar(g, c, car) {
  c.save(); c.translate(car.x, car.y); c.rotate(car.a); c.scale(car.size, car.size);
  const col = car.alive ? car.col : '#3f3f46';
  g.rrect(-24, -14, 50, 30, 6, 'rgba(0,0,0,.35)');
  c.fillStyle = '#111'; c.fillRect(-18, -16, 11, 5); c.fillRect(-18, 11, 11, 5); c.fillRect(9, -16, 11, 5); c.fillRect(9, 11, 11, 5);
  g.rrect(-24, -13, 48, 26, 5, col, '#0009', 2);
  g.rect(20, -13, 6, 26, car.spike > 0 ? '#e5e7eb' : '#52525b');
  if (car.spike > 0) for (let k = -10; k <= 10; k += 5) g.poly([[26, k - 2], [32, k], [26, k + 2]], '#e5e7eb');
  g.rrect(-8, -10, 16, 20, 3, car.alive ? '#0f172a' : '#18181b');
  if (car.alive && car.hp < car.max * 0.6) { g.line(-18, -8, -6, 2, '#0008', 2); g.line(4, 6, 14, -4, '#0008', 2); }
  if (car === S.me) g.text('★', -16, 0, 12, '#fde047');
  c.restore();
  if (car.shield > 0) g.ring(car.x, car.y, 30 * car.size, `rgba(56,189,248,${0.5 + 0.3 * Math.sin(S.t * 10)})`, 3);
}
