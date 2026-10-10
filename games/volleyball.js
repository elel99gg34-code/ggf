'use strict';
let S;
const VB = { GY: 470, NX: 480, NT: 318, G: 720, BR: 13, CG: 1500, JV: 640, WIN: 15 };

GAME({
  title: '비치 발리볼', w: 960, h: 540, bg: '#87ceeb', controls: 'lr+ab', aLabel: '점프', bLabel: '다이브',
  help: '←→ 이동 · Space 점프 · Shift/X 다이브(멀리 있는 공 받기)\n공에 닿으면 자동으로 리시브/토스! 공중에서 공을 치면 스파이크\n스파이크 방향: ↑ 깊게 · ↓ 짧게(네트 앞) · 네트 앞에서 점프 = 블로킹\n서브: Space (↑깊게 ↓짧게) · 한 팀 3번 터치 안에 넘기기 · 15점 선승(2점 차)',
  init(g) {
    S = { sc: [0, 0], serveTeam: 0, phase: 'serve', wait: 0, touches: 0, lastTeam: -1, lastHit: null, msg: '', msgT: 0, t: 0, rally: 0,
      ball: { x: 0, y: 0, vx: 0, vy: 0, spin: 0 }, trail: [] };
    S.p = [mk(0, 300, true, '🙂', '#1e88e5'), mk(0, 150, false, '😎', '#1e88e5'), mk(1, 640, false, '😠', '#e53935'), mk(1, 820, false, '😤', '#e53935')];
    setupServe(g);
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    const B = S.ball;
    for (const p of S.p) charPhys(p, dt);
    const H = S.p[0];
    if (S.phase !== 'point') humanMove(g, H, dt);
    if (S.phase === 'serve') {
      const sv = S.server;
      B.x = sv.x + (sv.team ? -14 : 14); B.y = sv.y - 100 + Math.sin(S.t * 4) * 3; B.vx = B.vy = 0;
      for (const p of S.p) if (!p.human && p !== sv) aiMove(g, p, dt, true);
      S.wait -= dt;
      if (sv.human) { if (g.pressed('a')) doServe(g, sv); }
      else if (S.wait <= 0) doServe(g, sv);
      return hud(g);
    }
    if (S.phase === 'point') {
      S.wait -= dt;
      for (const p of S.p) if (!p.human) aiMove(g, p, dt, true);
      if (S.wait <= 0) { if (checkEnd(g)) return; setupServe(g); }
      ballPhys(g, dt, true);
      return hud(g);
    }
    for (const p of S.p) if (!p.human) aiMove(g, p, dt, false);
    ballPhys(g, dt, false);
    hud(g);
  },
  draw(g, c) {
    const sky = c.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#4fc3f7'); sky.addColorStop(1, '#e1f5fe');
    c.fillStyle = sky; c.fillRect(0, 0, 960, 540);
    g.circle(120, 80, 40, '#fff59d');
    g.rect(0, 330, 960, 60, '#0288d1'); for (let i = 0; i < 12; i++) g.rect(((i * 97 + S.t * 20) % 1000) - 20, 345 + (i % 3) * 14, 40, 3, 'rgba(255,255,255,.5)');
    g.emoji('🌴', 40, 330, 110); g.emoji('🌴', 920, 320, 120); g.emoji('⛱️', 880, 410, 60);
    g.rect(0, 390, 960, 150, '#f5deb3'); g.rect(0, VB.GY, 960, 70, '#e6c896');
    for (let i = 0; i < 40; i++) g.circle((i * 137) % 960, VB.GY + 10 + (i * 31) % 60, 2, 'rgba(160,120,60,.3)');
    g.line(20, VB.GY, 940, VB.GY, '#1565c0', 4);
    g.line(20, VB.GY - 2, 20, VB.GY + 6, '#1565c0', 4); g.line(940, VB.GY - 2, 940, VB.GY + 6, '#1565c0', 4);
    g.rect(VB.NX - 3, VB.NT - 10, 6, VB.GY - VB.NT + 10, '#5d4037');
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(VB.NX - 2, VB.NT, 4, 110);
    for (let y = VB.NT; y < VB.NT + 110; y += 10) g.line(VB.NX - 4, y, VB.NX + 4, y, 'rgba(0,0,0,.35)', 1);
    g.rect(VB.NX - 5, VB.NT - 4, 10, 6, '#fff');
    const B = S.ball;
    const sh = U.clamp((VB.GY - B.y) / 400, 0, 1);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(B.x, VB.GY + 4, 14 - sh * 6, 4, 0, 0, Math.PI * 2); c.fill();
    for (const p of S.p) drawChar(g, c, p);
    for (let i = 0; i < S.trail.length; i++) { const t = S.trail[i]; g.circle(t.x, t.y, VB.BR * (i / S.trail.length), `rgba(255,255,255,${0.3 * i / S.trail.length})`); }
    c.save(); c.translate(B.x, B.y); c.rotate(S.t * 6 * (B.vx > 0 ? 1 : -1)); g.emoji('🏐', 0, 0, VB.BR * 2.3); c.restore();
    if (S.phase === 'rally' && B.vy > 0) { const lx = landX(B); if (lx !== null) { c.globalAlpha = 0.5; g.ring(lx, VB.GY + 3, 10, '#fff', 2); c.globalAlpha = 1; } }
    g.rrect(380, 8, 200, 54, 12, 'rgba(0,0,0,.45)');
    g.text(String(S.sc[0]), 430, 36, 34, '#64b5f6'); g.text(':', 480, 34, 30, '#fff'); g.text(String(S.sc[1]), 530, 36, 34, '#ef9a9a');
    g.text('우리 팀', 300, 30, 16, '#0d47a1'); g.text('상대 팀', 660, 30, 16, '#b71c1c');
    if (S.serveTeam === 0) g.text('🏐서브', 300, 52, 13, '#0d47a1'); else g.text('🏐서브', 660, 52, 13, '#b71c1c');
    if (S.phase === 'rally' && S.lastTeam >= 0) g.text(`터치 ${S.touches}/3`, S.lastTeam ? 720 : 240, 90, 16, S.touches >= 3 ? '#e53935' : '#333');
    if (S.phase === 'serve' && S.server.human) g.text('Space로 서브! (↑깊게 ↓짧게)', 480, 120, 22, '#0d47a1');
    if (S.msgT > 0) g.text(S.msg, 480, 170, 32, S.msgC);
  },
});

function mk(team, x, human, face, col) { return { team, x, y: VB.GY, vy: 0, vx: 0, ground: true, human, face, col, home: x, cd: 0, dive: 0, spikeT: 0, role: null }; }
function hud(g) { g.info = `우리 ${S.sc[0]} : ${S.sc[1]} 상대 · 랠리 ${S.rally}`; }
function flash(m, c) { S.msg = m; S.msgC = c || '#fff'; S.msgT = 1.6; }
function side(team) { return team === 0 ? -1 : 1; }

function setupServe(g) {
  const team = S.serveTeam;
  const mates = S.p.filter((p) => p.team === team);
  S.server = team === 0 ? S.p[(S.sc[0] + S.sc[1]) % 2 === 0 ? 0 : 1] : mates[(S.sc[0] + S.sc[1]) % 2];
  for (const p of S.p) { p.x = p.home; p.y = VB.GY; p.vy = 0; p.ground = true; p.dive = 0; p.role = null; }
  S.server.x = team === 0 ? 60 : 900;
  S.phase = 'serve'; S.wait = 1.2; S.touches = 0; S.lastTeam = -1; S.lastHit = null; S.rally = 0; S.trail = [];
}
function doServe(g, sv) {
  const B = S.ball, H = S.p[0];
  let deep = 0.5;
  if (sv.human) { if (g.up) deep = 0.85; else if (g.down) deep = 0.15; }
  else deep = Math.random();
  const tx = sv.team === 0 ? 560 + deep * 360 : 400 - deep * 360;
  if (!sv.human && Math.random() < 0.05) launch(B, tx, 0.7, 'net');
  else launch(B, tx + U.rand(-20, 20), 1.35);
  for (const q of S.p) { q.react = q.team !== sv.team ? 0.15 : 0; q.err = q.team !== sv.team && !q.human ? U.rand(-1, 1) * (Math.random() < 0.25 ? 80 : 12) : 0; }
  S.phase = 'rally'; S.serving = true; S.lastTeam = sv.team; S.touches = 3; S.lastHit = sv; sv.cd = 0.4;
  g.sfx.tone(300, 0.12, 'square', 0.08, 150); void H;
}
function launch(B, tx, T, mode) {
  const ty = VB.GY - VB.BR;
  B.vx = (tx - B.x) / T; B.vy = (ty - B.y - 0.5 * VB.G * T * T) / T;
  if (mode === 'net') { B.vy *= 0.6; }
}
function heightAtNet(B) {
  if ((VB.NX - B.x) * B.vx <= 0) return -1e9;
  const t = (VB.NX - B.x) / B.vx;
  return B.y + B.vy * t + 0.5 * VB.G * t * t;
}
function landX(B) {
  const a = 0.5 * VB.G, b = B.vy, cc = B.y - (VB.GY - VB.BR);
  const disc = b * b - 4 * a * cc; if (disc < 0) return null;
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  return B.x + B.vx * t;
}
function timeToY(B, y) {
  const a = 0.5 * VB.G, b = B.vy, cc = B.y - y;
  const disc = b * b - 4 * a * cc; if (disc < 0) return null;
  return (-b + Math.sqrt(disc)) / (2 * a);
}
function charPhys(p, dt) {
  p.cd -= dt; p.spikeT -= dt;
  if (!p.ground) { p.vy += VB.CG * dt; p.y += p.vy * dt; if (p.y >= VB.GY) { p.y = VB.GY; p.vy = 0; p.ground = true; } }
  if (p.dive > 0) { p.dive -= dt; p.x += p.vx * dt; p.vx *= Math.pow(0.1, dt); }
  const lo = p.team === 0 ? 15 : VB.NX + 22, hi = p.team === 0 ? VB.NX - 22 : 945;
  p.x = U.clamp(p.x, lo, hi);
}
function humanMove(g, p, dt) {
  if (p.dive > 0) return;
  const sp = 290;
  if (g.left) p.x -= sp * dt; if (g.right) p.x += sp * dt;
  if (g.pressed('a') && p.ground && S.phase === 'rally') { p.vy = -VB.JV; p.ground = false; g.sfx.jump(); }
  if (g.pressed('b') && p.ground && S.phase === 'rally') { p.dive = 0.45; p.vx = (g.left ? -1 : g.right ? 1 : (S.ball.x < p.x ? -1 : 1)) * 520; g.sfx.noise(0.15, 0.08); }
  p.dir = g.up ? 1 : g.down ? -1 : 0;
}

function aiMove(g, p, dt, idle) {
  const B = S.ball, sd = side(p.team), mate = S.p.find((o) => o !== p && o.team === p.team);
  let tx = p.home;
  const speed = 250 + (p.team === 1 ? Math.min(60, (S.sc[0] + S.sc[1]) * 2) : 30);
  if (p.react > 0) { p.react -= dt; return; }
  if (!idle && S.phase === 'rally') {
    const ourSide = p.team === 0 ? B.x < VB.NX + 40 : B.x > VB.NX - 40;
    const coming = (p.team === 0 ? B.vx < 0 : B.vx > 0) || ourSide;
    const hitY = VB.GY - 78;
    const tHit = timeToY(B, hitY);
    const px = tHit !== null ? B.x + B.vx * tHit : B.x;
    const mineSide = p.team === 0 ? px < VB.NX : px > VB.NX;
    if (S.lastTeam !== p.team || S.touches >= 3) {
      if (coming && mineSide) {
        const dMe = Math.abs(p.x - px), dMate = Math.abs(mate.x - px);
        const iGo = mate.human ? dMe < dMate - 30 && !(Math.abs(mate.x - px) < 80) : dMe <= dMate;
        if (iGo || (!mate.human && dMe === dMate)) { tx = px - sd * 10 + (p.err || 0); p.role = 'recv'; }
        else { tx = VB.NX + sd * 90; p.role = 'set'; }
      } else { tx = p.team === 0 ? 260 : 700; if (!mineSide) tx = p.home; p.role = null; }
      if (p.team === 1 && coming && mineSide && Math.abs(B.x - VB.NX) < 140 && B.vy > 0 && S.lastHit && S.lastHit.spikeT > 0 && p.ground && Math.abs(p.x - VB.NX) < 70 && Math.random() < 0.3) { p.vy = -VB.JV; p.ground = false; }
    } else {
      if (S.touches === 1) {
        if (S.lastHit === p) tx = p.team === 0 ? 300 : 660;
        else tx = px - sd * 8;
      } else if (S.touches === 2) {
        if (S.lastHit === p) tx = p.team === 0 ? 260 : 700;
        else {
          tx = px + sd * 18;
          const tj = timeToY(B, VB.GY - 80 - 150);
          if (p.ground && tj !== null && Math.abs(tj - VB.JV / VB.CG) < 0.05 && Math.abs(p.x - tx) < 50) { p.vy = -VB.JV; p.ground = false; }
        }
      }
    }
    if (p.team === 1 && S.lastTeam === 0 && S.touches === 2 && p.ground && !p.blockCd) {
      const spiker = S.p.find((q) => q.team === 0 && !q.ground && Math.abs(q.x - VB.NX) < 140);
      if (spiker && Math.abs(p.x - VB.NX) < 120 && Math.random() < 0.04) { tx = VB.NX + 30; p.vy = -VB.JV * 0.9; p.ground = false; }
    }
  } else if (idle && S.phase === 'serve' && p !== S.server) tx = p.home;
  if (p.dive <= 0) {
    const d = tx - p.x;
    if (Math.abs(d) > 4) p.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
  }
}

function ballPhys(g, dt, dead) {
  const B = S.ball;
  const steps = 3, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    const px = B.x;
    B.vy += VB.G * h; B.x += B.vx * h; B.y += B.vy * h;
    if ((px - VB.NX) * (B.x - VB.NX) <= 0 && B.y + VB.BR > VB.NT) {
      B.x = px; B.vx = -B.vx * 0.25; B.vy *= 0.5;
      if (!dead) { g.sfx.tone(120, 0.1, 'triangle', 0.1); S.netHit = true; }
    } else if ((px - VB.NX) * (B.x - VB.NX) <= 0) S.serving = false;
    if (B.y + VB.BR >= VB.GY) {
      B.y = VB.GY - VB.BR; B.vy = -B.vy * 0.35; B.vx *= 0.5;
      if (!dead) { landed(g); return; }
    }
    if (!dead) for (const p of S.p) tryHit(g, p);
  }
  if (Math.abs(B.vx) + Math.abs(B.vy) > 50) { S.trail.push({ x: B.x, y: B.y }); if (S.trail.length > 8) S.trail.shift(); }
  if (!dead && (B.x < -150 || B.x > 1110)) landed(g);
}
function tryHit(g, p) {
  const B = S.ball;
  if (p.cd > 0) return;
  if (S.serving && p.team === S.lastTeam) return;
  const hx = p.x, hy = p.y - (p.ground ? 70 : 92);
  const dx = B.x - hx, dy = B.y - hy;
  const reach = p.dive > 0 ? 44 : 36;
  if (dx * dx + dy * dy > reach * reach) {
    if (p.dive > 0 && Math.abs(B.x - p.x) < 50 && B.y > VB.GY - 50) { } else return;
  }
  const crossedFrom = S.lastTeam;
  if (S.lastHit === p && S.lastTeam === p.team && S.touches < 3) return;
  const sd = side(p.team);
  const isBlock = !p.ground && Math.abs(p.x - VB.NX) < 70 && crossedFrom !== p.team && S.lastHit && S.lastHit.spikeT > 0;
  let touches = S.lastTeam === p.team ? S.touches + 1 : 1;
  if (isBlock) touches = 0;
  if (touches > 3) { fault(g, p.team, '포 히트!'); return; }
  S.lastTeam = p.team; S.touches = touches; S.lastHit = p; p.cd = 0.35; S.netHit = false; S.rally++;
  for (const q of S.p) if (q.team !== p.team && !q.human) { const sk = q.team === 1 ? Math.max(0.4, 1 - (S.sc[0] + S.sc[1]) * 0.02) : 0.7; q.react = U.rand(0.05, 0.22) * sk; q.err = U.rand(-1, 1) * 22 * sk; }
  for (const q of S.p) if (q.team === p.team) { q.react = 0; q.err = 0; }
  const oppLo = p.team === 0 ? VB.NX + 40 : 40, oppHi = p.team === 0 ? 920 : VB.NX - 40;
  if (isBlock) {
    B.vx = -sd * U.rand(120, 260) * -1; B.vy = 80;
    B.vx = (p.team === 0 ? 1 : -1) * U.rand(140, 260);
    g.sfx.tone(200, 0.15, 'square', 0.1, 600); flash('블로킹!', '#ffeb3b'); g.shake(5, 0.2); g.burst(B.x, B.y, '#fff', 14, 200, 0.4);
    if (p.human) g.add(150, p.x, p.y - 120);
    S.touches = 0;
    return;
  }
  const high = B.y < VB.NT - 8 && !p.ground;
  if ((touches === 3 || (p.human && high) || (!p.human && touches >= 2 && high)) && high && Math.abs(p.x - VB.NX) < 300) {
    let deep;
    if (p.human) deep = p.dir > 0 ? 0.9 : p.dir < 0 ? 0.12 : 0.5;
    else deep = Math.random();
    const tx = p.team === 0 ? oppLo + deep * (oppHi - oppLo) : oppHi - deep * (oppHi - oppLo);
    let T = 0.42;
    for (; T < 1.3; T += 0.06) { launch(B, tx, T); if (heightAtNet(B) < VB.NT - VB.BR - 8) break; }
    if (!p.human && Math.random() < 0.08) { B.vx *= 1.25; }
    p.spikeT = 0.8;
    for (const q of S.p) if (q.team !== p.team && !q.human) { const miss = Math.random() < (q.team === 1 ? Math.max(0.3, 0.6 - (S.sc[0] + S.sc[1]) * 0.01) : 0.45); q.err = U.rand(-1, 1) * (miss ? 110 : 30); q.react = U.rand(0.12, 0.25); }
    if (!p.human && Math.random() < 0.07) { B.vx *= 1.3; B.vy *= 0.6; }
    g.sfx.tone(160, 0.18, 'sawtooth', 0.12, 60); g.shake(6, 0.2); g.burst(B.x, B.y, ['#fff', '#ffeb3b'], 16, 260, 0.4);
    flash(p.human ? '스파이크!' : '', '#ffeb3b');
    return;
  }
  const mate = S.p.find((o) => o !== p && o.team === p.team);
  let tx, T;
  const err = p.human ? 25 : 40 + (p.team === 1 ? 0 : 0);
  if (touches === 1) { tx = VB.NX + sd * 90 + U.rand(-err, err); T = 1.25; }
  else if (touches === 2) { tx = VB.NX + sd * 70 + U.rand(-err, err) * 0.6; T = 1.6; void mate; }
  else {
    const deep = Math.random();
    tx = p.team === 0 ? oppLo + deep * (oppHi - oppLo) : oppHi - deep * (oppHi - oppLo);
    T = 1.1;
    for (; T < 2; T += 0.1) { launch(B, tx, T); if (heightAtNet(B) < VB.NT - 40) break; }
    g.sfx.bounce();
    return;
  }
  launch(B, tx, T);
  if (p.dive > 0) { B.vy -= 60; }
  g.sfx.tone(touches === 1 ? 440 : 600, 0.08, 'sine', 0.1);
}
function landed(g) {
  const B = S.ball;
  let winner;
  const out = B.x < 20 || B.x > 940;
  if (out) { winner = S.lastTeam === 0 ? 1 : 0; flash('아웃!', '#fff'); }
  else { winner = B.x < VB.NX ? 1 : 0; flash(winner === 0 ? '득점!' : '실점…', winner === 0 ? '#64b5f6' : '#ef9a9a'); }
  point(g, winner);
}
function fault(g, team, why) { flash(why, '#fff'); point(g, 1 - team); }
function point(g, winner) {
  S.sc[winner]++; S.phase = 'point'; S.wait = 1.6;
  if (winner === 0) { g.add(100 + S.rally * 10, 480, 220); g.sfx.coin(); g.burst(S.ball.x, VB.GY - 20, ['#64b5f6', '#fff'], 20, 200, 0.6); }
  else { g.sfx.hit(); g.shake(4, 0.2); }
  S.serveTeam = winner;
}
function checkEnd(g) {
  const [a, b] = S.sc;
  if ((a >= VB.WIN || b >= VB.WIN) && Math.abs(a - b) >= 2 || a >= 21 || b >= 21) {
    if (a > b) { g.add(1000); g.win(`${a} : ${b} 승리! 🏐`); } else g.over(`${a} : ${b} 패배`);
    return true;
  }
  return false;
}
function drawChar(g, c, p) {
  const x = p.x, y = p.y;
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, VB.GY + 4, 18, 5, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y);
  if (p.dive > 0) c.rotate(Math.sign(p.vx) * 1.1);
  c.lineCap = 'round';
  const run = p.ground ? Math.sin(S.t * 14 + p.x * 0.1) * 6 : 0;
  g.line(-6, -30, -8 + run, 0, '#ffcc80', 7); g.line(6, -30, 8 - run, 0, '#ffcc80', 7);
  g.rrect(-13, -40, 26, 14, 5, p.col);
  g.rrect(-12, -66, 24, 30, 8, p.col);
  g.text(p.team === 0 ? (p.human ? '1' : '2') : (p === S.p[2] ? '3' : '4'), 0, -52, 12, '#fff');
  const armUp = !p.ground || (S.phase === 'rally' && Math.abs(S.ball.x - p.x) < 80 && S.ball.y < p.y - 60);
  if (armUp) { g.line(-10, -62, -12, -92, '#ffcc80', 6); g.line(10, -62, 12, -92, '#ffcc80', 6); }
  else { g.line(-10, -62, -4, -40, '#ffcc80', 6); g.line(10, -62, 4, -40, '#ffcc80', 6); }
  g.emoji(p.face, 0, -80, 28);
  if (p.human) { g.poly([[-7, -110], [7, -110], [0, -100]], '#ffeb3b', '#000', 1); }
  c.restore();
}
