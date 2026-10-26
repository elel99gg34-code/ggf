'use strict';
let S;
const VW = 960, VH = 620, BY = 0.7;
const COURSES = [
  { n: '에메랄드 호수', water: ['#0e7490', '#155e75'], bank: '#65a30d', sand: '#fde68a', len: 9000, wave: 0.5, cur: 0, rock: 0.4, night: false },
  { n: '열대 해안', water: ['#0891b2', '#0e7490'], bank: '#16a34a', sand: '#fef3c7', len: 10500, wave: 1, cur: 0, rock: 0.6, night: false },
  { n: '급류 협곡', water: ['#0f766e', '#115e59'], bank: '#78350f', sand: '#a8a29e', len: 11000, wave: 0.8, cur: 70, rock: 1.1, night: false },
  { n: '네온 항구 (야간)', water: ['#1e1b4b', '#172554'], bank: '#334155', sand: '#475569', len: 12000, wave: 0.9, cur: 0, rock: 0.8, night: true },
  { n: '폭풍의 바다', water: ['#1e3a5f', '#0f2742'], bank: '#3f6212', sand: '#d6d3d1', len: 13000, wave: 1.8, cur: 20, rock: 1, night: false },
];
const RIV = [{ n: '샤크', c: '#f97316' }, { n: '돌핀', c: '#a855f7' }, { n: '마린', c: '#facc15' }];
GAME({
  title: '파워보트', w: VW, h: VH, bg: '#0e7490', controls: 'dpad+ab', aLabel: '터보', bLabel: '브레이크',
  help: '↑ 가속 · ↓ 감속 · ←→ 방향\n🔵 부스터 링을 통과하면 가속! 터보 게이지는 Space로 사용\n🔴🟢 부표 게이트 사이를 통과 (놓치면 감속 페널티)\n큰 파도를 빠르게 타면 점프 · 공중에선 바위도 넘어요\n5개 코스 · 3위 안에 들어야 다음 코스',
  init(g) { S = { ci: 0, pts: 0 }; loadCourse(g); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.res) { S.res.t -= dt; if (S.res.t < 2.5 && (g.pressed('a') || g.mouse.clicked || S.res.t <= 0)) next(g); return; }
    S.wt += dt;
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.cb) { S.cb = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 880 : 440, 0.12); } return; }
    S.t += dt;
    const me = S.me;
    const ms = g.mouse.down ? U.clamp((g.mouse.x - VW / 2) / 150, -1, 1) : 0;
    drive(g, me, g.up || g.mouse.down, g.down || g.b, ((g.right ? 1 : 0) - (g.left ? 1 : 0)) || ms, g.a, dt);
    for (const b of S.boats) if (b !== me) ai(g, b, dt);
    // 보트 충돌
    for (let i = 0; i < S.boats.length; i++) for (let j = i + 1; j < S.boats.length; j++) {
      const a = S.boats[i], b = S.boats[j]; if (a.z > 5 || b.z > 5) continue;
      const d = U.dist(a.x, a.y, b.x, b.y);
      if (d < 36 && d > 0) { const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d, p = (36 - d) / 2; a.x += nx * p; a.y += ny * p; b.x -= nx * p; b.y -= ny * p; a.sp *= 0.97; b.sp *= 0.97; if ((a === me || b === me) && g.frame % 10 === 0) { g.sfx.hit(); g.shake(3, 0.1); } }
    }
    const ord = S.boats.slice().sort((a, b) => a.y - b.y);
    S.rank = ord.indexOf(me) + 1;
    for (const b of S.boats) if (!b.fin && b.y < S.finY) { b.fin = ++S.finN; if (b === me) finish(g); }
    S.camY = U.lerp(S.camY, me.y - VH * (BY - 0.5) + Math.sin(me.a + Math.PI / 2) * 0, Math.min(1, dt * 6));
    // 물보라
    if (me.sp > 120 && me.z <= 0 && g.frame % 2 === 0) { const p = scr(me.x - Math.cos(me.a) * 26, me.y - Math.sin(me.a) * 26); g.burst(p[0], p[1], ['#e0f2fe', '#ffffff', '#7dd3fc'], 2, 80, 0.5, 4); }
    for (const b of S.boats) { b.wk -= dt; if (b.wk <= 0 && b.z <= 0 && b.sp > 60) { b.wk = 0.05; b.wake.push({ x: b.x - Math.cos(b.a) * 24, y: b.y - Math.sin(b.a) * 24, a: b.a, t: 0 }); if (b.wake.length > 40) b.wake.shift(); } for (const w of b.wake) w.t += dt; }
    g.info = `코스 ${S.ci + 1}/${COURSES.length} · ${S.rank}위 · 게이트 ${S.gatesOk}/${S.gates.length}`;
  },
  draw(g, c) {
    const C = COURSES[S.ci];
    g.rect(0, 0, VW, VH, C.water[0]);
    c.save(); c.translate(0, -S.camY);
    const y0 = S.camY - 40, y1 = S.camY + VH + 40;
    // 물결 무늬
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
    for (let y = Math.floor(y0 / 40) * 40; y < y1; y += 40) { c.beginPath(); for (let x = 0; x <= VW; x += 24) { const yy = y + Math.sin(x * 0.03 + S.wt * 2 + y) * 5; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
    // 해류
    if (C.cur) { c.strokeStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 14; k++) { const x = (k * 71) % VW, y = ((k * 137 + S.wt * C.cur * 2) % (VH + 80)) + S.camY - 40; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 26); c.stroke(); } }
    // 강둑
    for (const side of [0, 1]) {
      c.beginPath();
      for (let y = Math.floor(y0 / 20) * 20; y <= y1; y += 20) { const x = side ? bankR(y) : bankL(y); y === Math.floor(y0 / 20) * 20 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.lineTo(side ? VW : 0, y1); c.lineTo(side ? VW : 0, y0); c.closePath();
      c.fillStyle = C.sand; c.fill();
      c.beginPath();
      for (let y = Math.floor(y0 / 20) * 20; y <= y1; y += 20) { const x = (side ? bankR(y) + 26 : bankL(y) - 26); y === Math.floor(y0 / 20) * 20 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.lineTo(side ? VW : 0, y1); c.lineTo(side ? VW : 0, y0); c.closePath(); c.fillStyle = C.bank; c.fill();
    }
    for (const d of S.deco) if (d.y > y0 && d.y < y1) g.emoji(d.e, d.x, d.y, d.s);
    // 결승선
    if (S.finY > y0 && S.finY < y1) for (let x = bankL(S.finY); x < bankR(S.finY); x += 20) g.rect(x, S.finY - 10, 20, 10, (Math.floor(x / 20)) % 2 ? '#fff' : '#111'), g.rect(x, S.finY, 20, 10, (Math.floor(x / 20)) % 2 ? '#111' : '#fff');
    // 파도
    for (const w of S.waves) if (w.y > y0 - 40 && w.y < y1) {
      c.fillStyle = 'rgba(224,242,254,.55)'; c.beginPath();
      for (let x = w.x0; x <= w.x1; x += 10) { const yy = w.y + Math.sin(x * 0.05 + S.wt * 4) * 4; x === w.x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
      for (let x = w.x1; x >= w.x0; x -= 10) c.lineTo(x, w.y + 16 + Math.sin(x * 0.07) * 3);
      c.closePath(); c.fill();
      g.line(w.x0, w.y, w.x1, w.y, 'rgba(255,255,255,.8)', 3);
    }
    // 게이트
    for (const gt of S.gates) if (gt.y > y0 && gt.y < y1) {
      if (!gt.done) g.line(gt.x - gt.w, gt.y, gt.x + gt.w, gt.y, 'rgba(255,255,255,.25)', 2);
      const bob = Math.sin(S.wt * 3 + gt.y) * 2;
      g.circle(gt.x - gt.w, gt.y + bob, 11, gt.done === 1 ? '#86efac' : '#dc2626'); g.circle(gt.x + gt.w, gt.y + bob, 11, gt.done === 1 ? '#86efac' : '#16a34a');
      g.ring(gt.x - gt.w, gt.y + bob, 11, '#fff', 2); g.ring(gt.x + gt.w, gt.y + bob, 11, '#fff', 2);
    }
    // 링
    for (const r of S.rings) if (r.y > y0 && r.y < y1) { const p = 1 + Math.sin(S.wt * 6) * 0.08; c.globalAlpha = r.cd > 0 ? 0.3 : 1; g.ring(r.x, r.y, 26 * p, '#38bdf8', 7); g.ring(r.x, r.y, 26 * p, '#e0f2fe', 2); g.text('»', r.x, r.y, 18, '#e0f2fe'); c.globalAlpha = 1; }
    for (const o of S.obs) if (o.y > y0 && o.y < y1) g.emoji(o.e, o.x, o.y, o.r * 2.3);
    // 보트
    for (const b of S.boats) {
      c.globalAlpha = 0.5; for (const w of b.wake) { const a = Math.max(0, 1 - w.t / 1.2); if (a <= 0) continue; c.strokeStyle = `rgba(255,255,255,${a * 0.6})`; c.lineWidth = 2; const s = 8 + w.t * 30; c.beginPath(); c.moveTo(w.x - Math.sin(w.a) * s, w.y + Math.cos(w.a) * s); c.lineTo(w.x + Math.sin(w.a) * s, w.y - Math.cos(w.a) * s); c.stroke(); } c.globalAlpha = 1;
    }
    for (const b of S.boats) drawBoat(g, c, b);
    if (C.night) { c.fillStyle = 'rgba(0,0,20,.35)'; c.fillRect(0, y0, VW, y1 - y0); for (const r of S.rings) if (r.y > y0 && r.y < y1) g.circle(r.x, r.y, 34, 'rgba(56,189,248,.15)'); }
    c.restore();
    if (C.wave > 1.5) { c.fillStyle = 'rgba(148,163,184,.12)'; c.fillRect(0, 0, VW, VH); for (let i = 0; i < 50; i++) { const x = (i * 83 + S.wt * 300) % VW, y = (i * 151 + S.wt * 700) % VH; g.line(x, y, x - 6, y + 16, 'rgba(226,232,240,.5)', 1); } }
    hud(g, c);
  },
});
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function bankL(y) { return 120 + Math.sin(y * 0.0021 + S.ph) * 70 + Math.sin(y * 0.0007) * 40; }
function bankR(y) { return VW - 120 + Math.sin(y * 0.0017 + S.ph * 2) * 70 + Math.sin(y * 0.0009 + 1) * 40; }
function loadCourse(g) {
  const C = COURSES[S.ci], R = rng(77 + S.ci * 31);
  S.ph = S.ci * 1.7;
  S.finY = -C.len;
  S.gates = []; S.rings = []; S.obs = []; S.waves = []; S.deco = [];
  for (let y = -500; y > S.finY + 300; y -= 520 + R() * 200) {
    const l = bankL(y), r = bankR(y), w = 85 - S.ci * 6, x = U.lerp(l + w + 40, r - w - 40, R());
    S.gates.push({ x, y, w, done: 0 });
    if (R() < 0.75) { const ry = y - 230 - R() * 80; S.rings.push({ x: U.lerp(bankL(ry) + 60, bankR(ry) - 60, R()), y: ry, cd: 0 }); }
  }
  for (let y = -700; y > S.finY + 200; y -= 900 / C.wave + R() * 300) { const l = bankL(y), r = bankR(y), cx = U.lerp(l, r, R()), hw = 90 + R() * 110 * C.wave; S.waves.push({ y, x0: Math.max(l + 10, cx - hw), x1: Math.min(r - 10, cx + hw), h: C.wave }); }
  for (let y = -900; y > S.finY + 300; y -= 260 / C.rock + R() * 200) {
    const l = bankL(y), r = bankR(y), x = U.lerp(l + 30, r - 30, R());
    if (S.gates.some((gt) => Math.abs(gt.y - y) < 70 && Math.abs(gt.x - x) < gt.w + 30)) continue;
    S.obs.push({ x, y, r: 16 + R() * 8, e: U.choice(C.night ? ['🛟', '📦', '🪨'] : ['🪨', '🪨', '🪵', '🛢️']) });
  }
  for (let y = 300; y > S.finY - 800; y -= 70) {
    S.deco.push({ x: bankL(y) - 60 - R() * 50, y, e: U.choice(C.night ? ['🏢', '🏙️', '💡'] : S.ci === 1 ? ['🌴', '🏖️', '🌴'] : S.ci === 2 ? ['🪨', '🌲', '⛰️'] : ['🌳', '🌲', '🏡']), s: 30 + R() * 16 });
    S.deco.push({ x: bankR(y) + 60 + R() * 50, y: y + 30, e: U.choice(C.night ? ['🏢', '🚢', '💡'] : S.ci === 1 ? ['🌴', '⛱️', '🐚'] : S.ci === 2 ? ['🪨', '🌲', '🏕️'] : ['🌳', '🌲', '⛺']), s: 30 + R() * 16 });
  }
  const cx = (bankL(0) + bankR(0)) / 2;
  S.boats = [];
  const mk = (i, col, name) => ({ i, col, name, x: cx - 135 + i * 90, y: 60, a: -Math.PI / 2, sp: 0, vx: 0, vy: 0, z: 0, vz: 0, boost: 0, turbo: 0.4, wake: [], wk: 0, fin: 0, gi: 0, skill: 0, off: U.rand(-30, 30), stun: 0 });
  S.boats.push(mk(1, '#e11d48', '나'));
  RIV.forEach((r, k) => { const b = mk(k === 0 ? 0 : k + 1, r.c, r.n); b.skill = 0.85 + S.ci * 0.035 + k * 0.03; S.boats.push(b); });
  S.me = S.boats[0];
  Object.assign(S, { count: 3.5, cb: 4, t: 0, wt: 0, camY: 60 - VH * (BY - 0.5) - VH / 2 + VH / 2, rank: 4, finN: 0, res: null, gatesOk: 0, msg: '', msgT: 0 });
  S.camY = S.me.y - VH * BY;
}
function drive(g, b, gas, brk, steer, turbo, dt) {
  const C = COURSES[S.ci], me = b === S.me;
  b.boost -= dt; b.stun -= dt;
  let top = 360 * (b.skill || 1) + (b.boost > 0 ? 200 : 0);
  if (turbo && b.turbo > 0) { b.turbo = Math.max(0, b.turbo - dt * 0.4); top += 170; if (me && g.frame % 2 === 0) { const p = scr(b.x - Math.cos(b.a) * 28, b.y - Math.sin(b.a) * 28); g.burst(p[0], p[1], ['#f97316', '#fde047'], 2, 100, 0.3, 4); } }
  if (b.stun > 0) { gas = false; top *= 0.5; }
  if (b.z > 0) {
    b.vz -= 900 * dt; b.z += b.vz * dt;
    if (b.z <= 0) { b.z = 0; b.vz = 0; b.sp *= 0.85; if (me) { g.sfx.drop(); g.shake(5, 0.2); const p = scr(b.x, b.y); g.burst(p[0], p[1], ['#e0f2fe', '#fff', '#38bdf8'], 18, 200, 0.6, 5); g.add(150, p[0], p[1] - 30); } }
  } else {
    if (gas) b.sp += 280 * dt * (1 - b.sp / (top + 1)); else if (brk) b.sp -= 300 * dt; else b.sp -= 90 * dt;
    if (b.boost > 0 || (turbo && b.turbo > 0)) b.sp = Math.max(b.sp, Math.min(top, b.sp + 600 * dt));
    b.sp = U.clamp(b.sp, -60, top);
    b.a += steer * 2.2 * dt * U.clamp(Math.abs(b.sp) / 120, 0.3, 1);
  }
  // 관성 (물 위 미끄러짐)
  const tx = Math.cos(b.a) * b.sp, ty = Math.sin(b.a) * b.sp, k = b.z > 0 ? 0 : Math.min(1, dt * 2.6);
  b.vx += (tx - b.vx) * k; b.vy += (ty - b.vy) * k;
  b.x += b.vx * dt; b.y += (b.vy + C.cur) * dt;
  // 파도 흔들림
  if (b.z <= 0) b.x += Math.sin(S.wt * 1.5 + b.y * 0.01) * C.wave * 12 * dt;
  // 둑
  const l = bankL(b.y) + 18, r = bankR(b.y) - 18;
  if (b.x < l || b.x > r) { b.x = U.clamp(b.x, l, r); b.vx *= -0.4; b.sp *= 0.7; b.a += (b.x <= l ? 0.3 : -0.3) * (Math.cos(b.a) > 0 ? -1 : 1) * 0 + 0; if (me && g.frame % 8 === 0) { g.sfx.hit(); g.shake(4, 0.15); } }
  if (b.y > 140) { b.y = 140; b.vy = Math.min(0, b.vy); }
  // 파도 점프
  for (const w of S.waves) if (b.z <= 0 && Math.abs(b.y - w.y) < 12 && b.x > w.x0 && b.x < w.x1 && b.sp > 170 && b.vy < 0 && w !== b.lastW) {
    b.lastW = w; b.vz = 160 + b.sp * 0.55 * Math.min(1.4, w.h); b.z = 1;
    if (me) { g.sfx.jump(); flash('🌊 점프!', '#e0f2fe'); }
  }
  // 장애물
  if (b.z < 12) for (const o of S.obs) { if (Math.abs(o.y - b.y) > 40) continue; const d = U.dist(b.x, b.y, o.x, o.y); if (d < o.r + 14 && d > 0) { const nx = (b.x - o.x) / d, ny = (b.y - o.y) / d; b.x = o.x + nx * (o.r + 14); b.y = o.y + ny * (o.r + 14); b.sp *= 0.35; b.vx = nx * 80; b.vy = ny * 80; b.stun = 0.6; if (me) { g.sfx.explode(); g.shake(8, 0.3); flash('쾅! 충돌', '#ef4444'); const p = scr(b.x, b.y); g.burst(p[0], p[1], ['#fff', '#94a3b8', '#7dd3fc'], 14, 220, 0.5, 4); } } }
  // 링
  for (const r of S.rings) { r.cd -= dt / S.boats.length; if (r.cd <= 0 && U.dist(b.x, b.y, r.x, r.y) < 30 && b.z < 30) { b.boost = 1.4; b.turbo = Math.min(1, b.turbo + 0.15); if (me) { r.cd = 0.8; g.sfx.power(); g.add(100); flash('🔵 부스트!', '#38bdf8'); const p = scr(r.x, r.y); g.burst(p[0], p[1], ['#38bdf8', '#e0f2fe'], 20, 250, 0.5, 4); } } }
  // 게이트
  const gt = S.gates[b.gi];
  if (gt && b.y < gt.y) {
    const ok = Math.abs(b.x - gt.x) < gt.w;
    if (me) {
      gt.done = ok ? 1 : 2;
      if (ok) { S.gatesOk++; g.add(80); g.sfx.coin(); b.turbo = Math.min(1, b.turbo + 0.1); }
      else { b.sp *= 0.5; b.stun = 0.8; g.sfx.lose(); flash('게이트 미스! 감속', '#f97316'); g.add(-100); }
    }
    b.gi++;
  }
}
function ai(g, b, dt) {
  if (S.count > 0) return;
  const gt = S.gates[b.gi];
  let tx = gt ? gt.x + b.off * 0.5 : (bankL(b.y) + bankR(b.y)) / 2, ty = gt ? gt.y : S.finY - 200;
  const ring = S.rings.find((r) => r.y < b.y - 40 && r.y > b.y - 260 && (!gt || r.y > gt.y));
  if (ring && b.skill > 0.92) { tx = ring.x; ty = ring.y; }
  for (const o of S.obs) if (o.y < b.y && o.y > b.y - 160 && Math.abs(o.x - (b.x + (tx - b.x) * 0.3)) < 45) tx = o.x + (b.x < o.x ? -70 : 70);
  let da = Math.atan2(ty - b.y, tx - b.x) - b.a; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const me = S.me, rub = b.y - me.y > 400 ? 1.08 : me.y - b.y > 500 ? 0.94 : 1;
  const sk = b.skill; b.skill *= rub;
  drive(g, b, true, false, U.clamp(da * 2.5, -1, 1), b.turbo > 0.6 && Math.random() < 0.02 ? (b.tt = 1.5) : (b.tt = (b.tt || 0) - dt) > 0, dt);
  b.skill = sk;
}
function finish(g) {
  const pos = S.me.fin, pts = [10, 6, 3, 0][pos - 1];
  S.pts += pts;
  g.add([3000, 1800, 900, 200][pos - 1] + S.gatesOk * 50);
  S.res = { pos, pts, t: 6, time: S.t };
  pos <= 3 ? g.sfx.win() : g.sfx.lose();
  if (pos === 1) g.burst(VW / 2, 200, ['#fde047', '#38bdf8', '#fff'], 50, 380, 1, 5);
}
function next(g) {
  if (S.res.pos > 3) return g.over(`${COURSES[S.ci].n} ${S.res.pos}위 — 탈락`);
  S.ci++;
  if (S.ci >= COURSES.length) return g.win(`🏆 시즌 종료! 챔피언십 ${S.pts}점`);
  loadCourse(g);
}
function scr(x, y) { return [x, y - S.camY]; }
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 1.6; }
function drawBoat(g, c, b) {
  c.save(); c.translate(b.x + b.z * 0.3, b.y + b.z * 0.4); c.rotate(b.a);
  if (b.z > 0) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 26, 11, 0, 0, 7); c.fill(); }
  c.restore();
  c.save(); c.translate(b.x, b.y - b.z * 0.2); c.rotate(b.a); const s = 1 + b.z / 250; c.scale(s, s);
  g.poly([[30, 0], [12, -12], [-24, -12], [-26, 0], [-24, 12], [12, 12]], b.col, '#0007', 2);
  g.poly([[24, 0], [10, -7], [-14, -7], [-14, 7], [10, 7]], '#f8fafc');
  g.rrect(-8, -6, 12, 12, 3, '#0f172a');
  g.rect(-28, -5, 5, 10, '#334155');
  if (b.boost > 0) { g.circle(-32, 0, 5 + Math.random() * 3, '#fde047'); }
  c.restore();
  if (b !== S.me) g.text(b.name, b.x, b.y - 30 - b.z * 0.2, 12, '#fff');
}
function hud(g, c) {
  const me = S.me;
  g.rrect(12, 12, 170, 86, 14, 'rgba(0,0,0,.5)');
  g.text(`${S.rank}위`, 97, 42, 32, S.rank === 1 ? '#fde047' : '#fff'); g.text(COURSES[S.ci].n, 97, 78, 13, '#cbd5e1');
  g.rrect(VW - 200, VH - 98, 188, 86, 14, 'rgba(0,0,0,.5)');
  g.text(Math.round(Math.abs(me.sp) * 0.25) + ' 노트', VW - 106, VH - 72, 22, '#fff');
  g.text('터보', VW - 170, VH - 38, 13, '#cbd5e1'); g.rect(VW - 145, VH - 45, 120, 14, '#334155'); g.rect(VW - 145, VH - 45, 120 * me.turbo, 14, '#f97316');
  // 진행 바
  const L = -S.finY;
  g.rect(VW - 30, 120, 10, 300, 'rgba(0,0,0,.35)');
  for (const b of S.boats) { const p = U.clamp(-b.y / L, 0, 1); g.circle(VW - 25, 420 - 300 * p, b === me ? 7 : 5, b.col); }
  g.emoji('🏁', VW - 25, 106, 18);
  g.text(`⏱ ${S.t.toFixed(1)}s`, VW / 2, 24, 18, '#fff');
  if (me.z > 0) g.text(`에어 ${Math.round(me.z)}`, VW / 2, VH * BY - 70, 16, '#e0f2fe');
  if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 120, 26, S.msgC); c.globalAlpha = 1; }
  if (S.count > 0) { g.text(Math.ceil(S.count), VW / 2, VH / 2 - 60, 100, '#fff'); g.text(COURSES[S.ci].n, VW / 2, VH / 2 + 20, 28, '#fde047'); }
  if (S.res) {
    const R = S.res;
    g.rrect(280, 160, 400, 260, 20, 'rgba(15,23,42,.93)', '#38bdf8', 3);
    g.text(`${R.pos}위 골인!`, VW / 2, 210, 38, R.pos <= 3 ? '#fde047' : '#ef4444');
    g.text(`기록 ${R.time.toFixed(2)}s · 게이트 ${S.gatesOk}/${S.gates.length}`, VW / 2, 265, 18, '#fff');
    g.text(`챔피언십 +${R.pts} (총 ${S.pts})`, VW / 2, 305, 20, '#22d3ee');
    g.text(R.pos <= 3 ? 'Space: 다음 코스' : '3위 밖 — 탈락', VW / 2, 370, 16, '#94a3b8');
  }
}
