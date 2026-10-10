'use strict';
let S;
const CK = { HZ: 150, NEAR: 530, FX: 480, FY: 318, FR: 255, BR: 70, STAGES: 5 };
const CK_FIELD = [[-155, 45], [-105, 32], [-60, 55], [-22, 40], [20, 42], [58, 30], [100, 50], [145, 25], [180, 9]];
const CK_TYPES = { pace: '빠른 공', swing: '스윙', spin: '스핀', yorker: '요커', bouncer: '바운서', slower: '슬로 볼' };

GAME({
  title: '크리켓 배팅', w: 960, h: 600, bg: '#2e7d32', controls: 'dpad+ab', aLabel: '스윙', bLabel: '빨리',
  help: 'Space/클릭 = 배트 스윙 (공이 타자에게 올 때 타이밍!)\n스윙할 때 방향키: ← 왼쪽 · → 오른쪽 · ↑ 띄워치기(6점 노림, 캐치 위험) · ↓ 수비(안전)\n일찍 치면 왼쪽, 늦게 치면 오른쪽으로 휨 · 공이 스텀프 맞으면 아웃!\n바운더리: 굴러서 4점, 직접 넘기면 6점 · 공중볼을 수비가 잡으면 아웃\n스테이지마다 목표 득점을 정해진 공 안에 달성하라 (5스테이지)',
  init(g) { S = { stage: 0, total: 0, sixes: 0, fours: 0 }; startStage(g); },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    const fast = g.b ? 3 : 1;
    if (S.phase === 'ready') { S.pt -= dt * fast; if (S.pt <= 0) { S.phase = 'runup'; S.pt = 1.1; S.del = makeDelivery(); } }
    else if (S.phase === 'runup') { S.pt -= dt; if (S.pt <= 0) { S.phase = 'ball'; S.bt = 0; g.sfx.tone(200, 0.08, 'triangle', 0.05); } swingInput(g); }
    else if (S.phase === 'ball') {
      S.bt += dt;
      swingInput(g);
      const D = S.del;
      if (!S.contact && S.swingT !== null) {
        const err = D.T - (S.swingT + 0.1);
        if (S.bt >= S.swingT + 0.1 - 0.001 && Math.abs(err) < 0.13 && Math.abs(latAt(D, 0) - S.batX) < 0.55) doContact(g, err);
      }
      if (!S.contact && S.bt >= D.T + 0.135 && !S.passed) {
        S.passed = true;
        const lx = latAt(D, 0), h = hAt(D, 0);
        if (Math.abs(lx) < 0.13 && h < 0.72) { wicket(g, '볼드 아웃! 🏏💥'); g.burst(stx(0), sty(0, 0.4), ['#fff', '#ffcc80'], 20, 250, 0.6); S.stumpsDown = 1; }
        else if (Math.abs(lx) > 1.1) { addRuns(g, 1, '와이드 +1'); S.extraBall = true; }
      }
      if (!S.contact && S.bt >= D.T + 0.5) { if (S.phase === 'ball') endBall(g, S.extraBall ? null : 0, S.extraBall ? '' : '닷 볼'); }
    } else if (S.phase === 'field') {
      for (let i = 0; i < fast; i++) fieldSim(g, dt);
    } else if (S.phase === 'result') {
      S.pt -= dt * fast;
      if (S.pt <= 0 || (S.pt < 1 && (g.pressed('a') || g.mouse.clicked))) nextBall(g);
    }
    hud(g);
  },
  draw(g, c) {
    if (S.phase === 'field' || (S.phase === 'result' && S.view === 'field')) drawField(g, c);
    else draw3D(g, c);
    drawBoard(g);
    if (S.msgT > 0) g.text(S.msg, 480, 210, 40, S.msgC);
  },
});

function hud(g) { g.info = `스테이지 ${S.stage + 1} · ${S.runs}/${S.wk} · 목표 ${S.target} · 남은 공 ${S.balls - S.ball}`; }
function flash(m, c, t) { S.msg = m; S.msgC = c || '#fff'; S.msgT = t || 1.6; }
function startStage(g) {
  const st = S.stage;
  Object.assign(S, { runs: 0, wk: 0, maxWk: 3, ball: 0, balls: 18 + st * 6, target: 22 + st * 9, phase: 'ready', pt: 1.5, t: 0, msg: '', msgT: 0, swingT: null, contact: null, passed: false,
    batX: 0, view: '3d', log: [], fielders: [], fb: null, stumpsDown: 0, extraBall: false });
  flash(`스테이지 ${st + 1}: ${S.balls}구 안에 ${S.target}점!`, '#fff59d', 2.5);
}
function makeDelivery() {
  const st = S.stage;
  const pool = ['pace', 'pace', 'swing', 'spin', 'slower'];
  if (st >= 1) pool.push('yorker', 'bouncer');
  if (st >= 3) pool.push('swing', 'yorker');
  const type = U.choice(pool);
  const sp = 1 + st * 0.07;
  let T, zb, lxb, dev, bh;
  const line = U.rand(-0.5, 0.45);
  switch (type) {
    case 'pace': T = U.rand(0.95, 1.1) / sp; zb = U.rand(3, 6); dev = U.rand(-0.1, 0.1); bh = U.rand(0.6, 0.95); break;
    case 'swing': T = U.rand(1.0, 1.15) / sp; zb = U.rand(3.5, 6); dev = U.choice([-1, 1]) * U.rand(0.25, 0.45); bh = U.rand(0.55, 0.85); break;
    case 'spin': T = U.rand(1.35, 1.55) / sp; zb = U.rand(3, 5); dev = U.choice([-1, 1]) * U.rand(0.35, 0.7); bh = U.rand(0.4, 0.75); break;
    case 'yorker': T = U.rand(0.9, 1.0) / sp; zb = U.rand(0.2, 0.7); dev = 0; bh = 0.12; break;
    case 'bouncer': T = U.rand(0.95, 1.05) / sp; zb = U.rand(8, 10); dev = U.rand(-0.1, 0.1); bh = U.rand(1.3, 1.7); break;
    default: T = U.rand(1.45, 1.65) / sp; zb = U.rand(3.5, 5.5); dev = U.rand(-0.15, 0.15); bh = U.rand(0.6, 0.9);
  }
  lxb = line - dev * 0.5;
  return { type, T, zb, lx0: U.rand(-0.3, 0.3), lxb, dev, bh };
}
function zAt(D, t) { return 20 * (1 - t / D.T); }
function latAt(D, z) { if (z > D.zb) { const f = (20 - z) / (20 - D.zb); return U.lerp(D.lx0, D.lxb, f); } const f2 = (D.zb - z) / Math.max(0.01, D.zb); return D.lxb + D.dev * f2; }
function hAt(D, z) { if (z > D.zb) { const f = (20 - z) / (20 - D.zb); return 2.2 * (1 - f) + 0.4 * f * (1 - f); } const f2 = (D.zb - z) / Math.max(0.01, D.zb); return Math.max(0, D.bh * Math.sin(Math.min(1.3, f2) * Math.PI / 2)); }
function persp(z) { return 4 / (z + 4); }
function stx(lx, z) { return 480 + lx * persp(z || 0) * 110; }
function sty(z, h) { const p = persp(z); return CK.HZ + (CK.NEAR - CK.HZ) * p - (h || 0) * p * 110; }

function swingInput(g) {
  if (g.left && S.swingT === null) S.batX = Math.max(-0.5, S.batX - 1.5 / 60);
  if (g.right && S.swingT === null) S.batX = Math.min(0.5, S.batX + 1.5 / 60);
  if (!g.left && !g.right && S.swingT === null) S.batX *= 0.9;
  if ((g.pressed('a') || g.mouse.clicked) && S.swingT === null && S.phase === 'ball') {
    S.swingT = S.bt; S.dir = g.left ? -1 : g.right ? 1 : 0; S.loft = g.up; S.def = g.down; g.sfx.tone(300, 0.1, 'sawtooth', 0.04, 150);
  }
}
function doContact(g, err) {
  const D = S.del, ae = Math.abs(err);
  S.contact = { err };
  if (ae > 0.075) {
    g.sfx.tone(700, 0.05, 'square', 0.06);
    if (Math.random() < (S.loft ? 0.5 : 0.35)) { S.caughtBehind = true; return wicket(g, '엣지 → 캐치 아웃!'); }
    return launchHit(g, U.rand(6, 14), (err < 0 ? -1 : 1) * U.rand(100, 160), S.loft ? 0.5 : 0.08, '엣지');
  }
  const q = 1 - ae / 0.075;
  let ang = S.dir * 55 + U.clamp(-err * 500, -35, 35) + U.rand(-12, 12);
  let spd = (S.def ? 7 : 22 + q * 14) * (D.type === 'yorker' ? 0.7 : 1) * (D.type === 'bouncer' && !S.loft ? 0.85 : 1);
  let elev = S.def ? 0.02 : S.loft ? 0.55 + U.rand(-0.1, 0.12) : 0.1;
  if (D.type === 'bouncer' && !S.def) elev += 0.15;
  if (D.type === 'yorker') elev *= 0.5;
  g.sfx.tone(q > 0.7 ? 180 : 240, 0.15, 'square', 0.12, 80); g.shake(q > 0.7 ? 6 : 3, 0.15);
  if (q > 0.75) flash(q > 0.9 ? '완벽한 타이밍!' : '좋은 타격!', '#fff59d', 1);
  launchHit(g, spd, ang, elev, null);
}
function launchHit(g, spd, angDeg, elev, tag) {
  const a = (angDeg - 90) * Math.PI / 180;
  S.fb = { x: 0, y: 0, h: 1, vx: Math.cos(a) * spd * Math.cos(elev), vy: Math.sin(a) * spd * Math.cos(elev), vh: spd * Math.sin(elev), bounced: false, t: 0, dead: false };
  S.fielders = CK_FIELD.map(([deg, d], i) => { const r = (deg - 90) * Math.PI / 180, dd = i === 8 ? d : Math.min(68, d + S.stage * 2 + ((i * 7) % 5)); return { x: Math.cos(r) * dd, y: Math.sin(r) * dd, hx: 0, hy: 0, has: false }; });
  S.phase = 'field'; S.view = 'field'; S.tag = tag;
}
function predict(b, t) {
  let x = b.x, y = b.y, h = b.h, vx = b.vx, vy = b.vy, vh = b.vh, bn = b.bounced;
  const st = 0.05;
  for (let k = 0; k < t / st; k++) {
    if (!bn || h > 0) { vh -= 9.8 * st; h += vh * st; if (h <= 0) { h = 0; bn = true; vh = Math.abs(vh) > 3 ? -vh * 0.3 : 0; vx *= 0.7; vy *= 0.7; } }
    if (bn && h <= 0) { const sp = Math.hypot(vx, vy), ns = Math.max(0, sp - 5 * st); if (sp > 0) { vx *= ns / sp; vy *= ns / sp; } }
    x += vx * st; y += vy * st;
  }
  return [x, y, h];
}
function fieldSim(g, dt) {
  const b = S.fb;
  if (b.dead) return;
  b.t += dt;
  const inAir = !b.bounced || b.h > 0;
  if (inAir) { b.vh -= 9.8 * dt; b.h += b.vh * dt; if (b.h <= 0) { b.h = 0; if (!b.bounced) g.sfx.drop(); b.bounced = true; b.vh = Math.abs(b.vh) > 3 ? -b.vh * 0.3 : 0; b.vx *= 0.7; b.vy *= 0.7; } }
  if (b.bounced && b.h <= 0) { const sp = Math.hypot(b.vx, b.vy), ns = Math.max(0, sp - 5 * dt); if (sp > 0) { b.vx *= ns / sp; b.vy *= ns / sp; } }
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (Math.hypot(b.x, b.y) >= CK.BR) {
    b.dead = true;
    if (!b.bounced) { S.sixes++; g.sfx.win(); g.burst(fx(b.x), fy(b.y), ['#ffeb3b', '#e91e63', '#00e5ff'], 50, 350, 1.2); g.shake(6, 0.3); return endBall(g, 6, '식스!! 6점 🎉'); }
    S.fours++; g.sfx.power(); g.burst(fx(b.x), fy(b.y), ['#ffeb3b', '#fff'], 30, 260, 0.8); return endBall(g, 4, '포! 4점 바운더리');
  }
  const runs = Math.floor(b.t / 2.6);
  S.liveRuns = runs;
  for (const f of S.fielders) {
    let tx = b.x, ty = b.y;
    for (let k = 1; k <= 50; k++) { const [px, py] = predict(b, k * 0.1); if (Math.hypot(px - f.x, py - f.y) / 7.2 <= k * 0.1) { tx = px; ty = py; break; } if (k === 50) { tx = px; ty = py; } }
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy), sp = 7.2 * dt;
    if (d > 0.05) { f.x += dx / d * Math.min(sp, d); f.y += dy / d * Math.min(sp, d); }
    const dd = Math.hypot(b.x - f.x, b.y - f.y);
    if (!b.bounced && b.h < 2.6 && b.h > 0 && dd < 1.6 && b.t > 0.3) {
      if (Math.random() < 0.82) { b.dead = true; f.has = true; return wicket(g, '캐치 아웃! 🧤'); }
      else { flash('놓쳤다! 드롭!', '#fff59d', 1); b.vx *= -0.2; b.vy *= -0.2; b.vh = 1; }
    }
    if (b.bounced && b.h <= 0.4 && dd < 1.3) {
      b.dead = true; f.has = true;
      const throwT = Math.hypot(f.x, f.y) / 28;
      const r = Math.min(3, Math.floor((b.t + throwT) / 2.6));
      return endBall(g, r, r ? `${r}점!` : '수비에 막힘 (0점)');
    }
  }
  if (Math.hypot(b.vx, b.vy) < 0.5 && b.bounced && b.t > 6) { b.dead = true; endBall(g, Math.min(3, Math.floor(b.t / 2.6)), '득점'); }
}
function addRuns(g, r, m) { S.runs += r; S.total += r; g.add(r * 10); if (m) flash(m, '#fff', 1.2); }
function endBall(g, runs, msg) {
  if (runs !== null) {
    S.runs += runs; S.total += runs; S.ball++;
    if (runs > 0) g.add(runs * 10 + (runs === 6 ? 40 : runs === 4 ? 15 : 0), 480, 260);
    S.log.push(runs === 0 ? '·' : String(runs));
  }
  if (msg) flash(msg, runs >= 4 ? '#ffeb3b' : '#fff', 1.6);
  S.phase = 'result'; S.pt = 1.8;
}
function wicket(g, msg) {
  S.wk++; S.ball++; S.log.push('W');
  flash(msg, '#ff5252', 2); g.sfx.lose(); g.shake(8, 0.4);
  S.phase = 'result'; S.pt = 2.2;
}
function nextBall(g) {
  if (S.runs >= S.target) {
    const bonus = (S.balls - S.ball) * 20 + (S.maxWk - S.wk) * 100;
    g.add(300 + bonus); g.sfx.win(); S.stage++;
    if (S.stage >= CK.STAGES) return g.win(`전 스테이지 클리어! 총 ${S.total}런 · 6️⃣${S.sixes} 4️⃣${S.fours}`);
    return startStage(g);
  }
  if (S.wk >= S.maxWk) return g.over(`올 아웃! 스테이지 ${S.stage + 1} · ${S.runs}/${S.target}`);
  if (S.ball >= S.balls) return g.over(`공 소진! 스테이지 ${S.stage + 1} · ${S.runs}/${S.target}`);
  S.phase = 'ready'; S.pt = 0.7; S.swingT = null; S.contact = null; S.passed = false; S.view = '3d'; S.fb = null; S.stumpsDown = 0; S.extraBall = false; S.caughtBehind = false;
}

function fx(x) { return CK.FX + x * (CK.FR / CK.BR); }
function fy(y) { return CK.FY + y * (CK.FR / CK.BR); }
function drawField(g, c) {
  g.rect(0, 0, 960, 600, '#1b5e20');
  g.circle(CK.FX, CK.FY, CK.FR + 30, '#33691e');
  g.circle(CK.FX, CK.FY, CK.FR, '#43a047');
  for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)'; c.beginPath(); c.moveTo(CK.FX, CK.FY); c.arc(CK.FX, CK.FY, CK.FR, i * Math.PI / 6, (i + 1) * Math.PI / 6); c.fill(); }
  g.ring(CK.FX, CK.FY, CK.FR, '#fff', 3);
  c.setLineDash([6, 8]); g.ring(CK.FX, CK.FY, 30 * CK.FR / CK.BR, 'rgba(255,255,255,.5)', 1.5); c.setLineDash([]);
  g.rect(CK.FX - 6, CK.FY - 20 * CK.FR / CK.BR, 12, 20 * CK.FR / CK.BR, '#d7ccc8');
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.emoji('👥', CK.FX + Math.cos(a) * (CK.FR + 18), CK.FY + Math.sin(a) * (CK.FR + 18), 18); }
  const b = S.fb;
  if (b) {
    for (const f of S.fielders) { g.circle(fx(f.x), fy(f.y), 8, '#1565c0'); g.ring(fx(f.x), fy(f.y), 8, '#fff', 2); }
    g.circle(fx(b.x), fy(b.y), 4, 'rgba(0,0,0,.35)');
    const hz = b.h * 3;
    g.circle(fx(b.x), fy(b.y) - hz, 5 + b.h * 0.3, '#d32f2f'); g.ring(fx(b.x), fy(b.y) - hz, 5 + b.h * 0.3, '#fff', 1);
    if (!b.dead) g.text(`달리는 중… ${S.liveRuns || 0}런`, 480, 575, 20, '#fff');
  }
  g.emoji('🏏', CK.FX, CK.FY, 22);
}
function draw3D(g, c) {
  const sky = c.createLinearGradient(0, 0, 0, CK.HZ); sky.addColorStop(0, '#64b5f6'); sky.addColorStop(1, '#bbdefb');
  c.fillStyle = sky; c.fillRect(0, 0, 960, CK.HZ);
  g.rect(0, CK.HZ - 40, 960, 40, '#546e7a');
  for (let i = 0; i < 48; i++) g.circle(i * 20 + 10, CK.HZ - 26 + (i % 3) * 8, 5, ['#e57373', '#fff176', '#81c784', '#64b5f6'][i % 4]);
  const grd = c.createLinearGradient(0, CK.HZ, 0, 600); grd.addColorStop(0, '#558b2f'); grd.addColorStop(1, '#7cb342');
  c.fillStyle = grd; c.fillRect(0, CK.HZ, 960, 600 - CK.HZ);
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'; const y1 = sty(i * 3), y2 = sty(i * 3 + 3); c.fillRect(0, y2, 960, y1 - y2); }
  g.poly([[stx(-1.5, 22), sty(22)], [stx(1.5, 22), sty(22)], [stx(1.5, -1.5), sty(-1.5)], [stx(-1.5, -1.5), sty(-1.5)]], '#d7c49e');
  for (const z of [1.2, 18.8]) g.line(stx(-1.5, z), sty(z), stx(1.5, z), sty(z), '#fff', 2);
  drawStumps(g, 20, 0);
  const bowlerZ = S.phase === 'runup' ? 20 + S.pt * 8 : 20;
  if (S.phase === 'ready' || S.phase === 'runup' || S.phase === 'ball') g.emoji('🏃', stx(0.3, bowlerZ), sty(bowlerZ, 0.9), 70 * persp(bowlerZ) * 4);
  if (S.phase === 'ball' && S.del) {
    const D = S.del;
    const t = Math.min(S.bt, D.T + 0.5), z = zAt(D, t);
    const lx = S.contact ? latAt(D, 0) : latAt(D, Math.max(-1.6, z)), h = S.contact ? hAt(D, 0) : hAt(D, Math.max(-1.6, z));
    const zz = S.contact ? 0 : Math.max(-1.6, z);
    g.circle(stx(lx, zz), sty(zz, 0), 6 * persp(zz) * 1.6, 'rgba(0,0,0,.3)');
    g.circle(stx(lx, zz), sty(zz, h), 7 * persp(zz) * 1.7, '#d32f2f'); g.ring(stx(lx, zz), sty(zz, h), 7 * persp(zz) * 1.7, '#fff', 1);
    if (S.bt < 0.5) g.text(CK_TYPES[D.type], 480, 120, 22, '#fff');
  }
  drawStumps(g, 0, S.stumpsDown);
  const bx = stx(S.batX - 0.45, 0), by = sty(0, 0);
  const sw = S.swingT !== null ? Math.min(1, ((S.phase === 'ball' ? S.bt : 9) - S.swingT) / 0.2) : 0;
  c.save(); c.translate(bx, by - 150);
  g.rrect(-28, 30, 56, 90, 14, '#fafafa', '#9e9e9e', 2);
  g.rect(-24, 118, 18, 40, '#eeeeee'); g.rect(6, 118, 18, 40, '#eeeeee');
  g.circle(0, 10, 26, '#ffcc80'); g.rrect(-28, -18, 56, 26, 12, '#1a237e'); g.rect(-30, 2, 60, 6, '#283593');
  c.save(); c.translate(26, 80); c.rotate(-1.9 + sw * 2.9);
  g.rrect(-6, 0, 12, 34, 4, '#8d6e63'); g.rrect(-12, 30, 24, 80, 6, '#ffe0b2', '#a1887f', 2);
  c.restore();
  c.restore();
  if (S.phase === 'ready' || S.phase === 'runup') g.text('Space 스윙 · ←→↑↓로 방향', 480, 585, 16, 'rgba(255,255,255,.85)');
}
function drawStumps(g, z, down) {
  const p = persp(z);
  for (const o of [-0.11, 0, 0.11]) {
    const x = stx(o, z), y = sty(z, 0), h = 0.72 * p * 110;
    if (down) { const a = o * 8 + 0.4; g.line(x, y, x + Math.sin(a) * h, y - Math.cos(a) * h, '#f5deb3', 5 * p + 1); }
    else g.line(x, y, x, y - h, '#f5deb3', 5 * p + 1);
  }
  if (!down) g.line(stx(-0.12, z), sty(z, 0.73), stx(0.12, z), sty(z, 0.73), '#c62828', 3 * p + 1);
}
function drawBoard(g) {
  g.rrect(10, 10, 270, 92, 10, 'rgba(0,0,0,.55)');
  g.text(`스테이지 ${S.stage + 1}/${CK.STAGES}`, 22, 26, 14, '#fff59d', 'left');
  g.text(`${S.runs}/${S.wk}`, 22, 56, 32, '#fff', 'left');
  g.text(`목표 ${S.target} · 필요 ${Math.max(0, S.target - S.runs)}`, 270, 26, 13, '#fff', 'right');
  g.text(`남은 공 ${S.balls - S.ball}`, 270, 48, 14, '#b3e5fc', 'right');
  g.text('🏏'.repeat(Math.max(0, S.maxWk - S.wk)), 270, 68, 14, '#fff', 'right');
  const recent = S.log.slice(-10);
  recent.forEach((r, i) => { const x = 28 + i * 24; g.circle(x, 88, 10, r === 'W' ? '#e53935' : r === '6' ? '#ab47bc' : r === '4' ? '#1e88e5' : '#546e7a'); g.text(r, x, 89, 11, '#fff'); });
}
