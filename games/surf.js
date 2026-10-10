'use strict';
let S;
const SF = { TROUGH: 470, W: 960 };

GAME({
  title: '서핑 웨이브', w: 960, h: 540, bg: '#0b6fa4', controls: 'dpad+ab', aLabel: '펌프', bLabel: '그랩',
  help: '↑ 파도 위로 · ↓ 파도 아래로 (내려가면 가속!)\n빠른 속도로 파도 꼭대기(립)를 치면 에어! 공중에서 ←→ 회전, Shift/X 꾹 = 그랩\n착지 때 보드가 똑바로여야 성공 · 왼쪽 부서지는 파도(폼)에 잡히면 와이프아웃\n바위·상어·서퍼 피하고 🐚조개 모으기 · 파도 가까이 = 튜브 라이딩 보너스\nSpace = 펌프(짧은 가속)',
  init(g) {
    S = { sx: 380, y: 360, hd: 0.2, v: 380, air: false, vy: 0, vx: 0, rot: 0, spun: 0, grab: 0, lives: 3, dist: 0, lvl: 1, obs: [], items: [], spawn: 1, ispawn: 0.5,
      wipe: 0, inv: 1.5, foam: 70, tube: 0, msg: '', msgT: 0, spray: [], pump: 0, t: 0, combo: 0 };
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt; S.inv -= dt; S.pump -= dt;
    const waveH = Math.min(320, 220 + (S.lvl - 1) * 18), LIP = SF.TROUGH - waveH;
    const waveSpd = 300 + S.lvl * 18;
    S.LIP = LIP;
    S.foam = 70 + Math.sin(S.t * 1.3) * 18 + (S.lvl - 1) * 4;
    if (S.wipe > 0) {
      S.wipe -= dt;
      if (S.wipe <= 0) { if (S.lives <= 0) return g.over(`${Math.floor(S.dist)}m 서핑 · 레벨 ${S.lvl}`); S.sx = 420; S.y = LIP + waveH * 0.45; S.hd = 0.2; S.v = 380; S.air = false; S.rot = 0; S.inv = 2; }
      scroll(g, dt, waveSpd * 0.6);
      return hud(g);
    }
    if (!S.air) {
      const turn = 2.6;
      if (g.up) S.hd -= turn * dt; else if (g.down) S.hd += turn * dt; else S.hd += (0.15 - S.hd) * dt * 1.5;
      S.hd = U.clamp(S.hd, -1.05, 1.05);
      if (g.pressed('a') && S.pump <= 0) { S.v += 70; S.pump = 0.6; g.sfx.tone(300, 0.1, 'sine', 0.06, 500); }
      S.v += Math.sin(S.hd) * 420 * dt - 25 * dt;
      const relY = (S.y - LIP) / waveH;
      if (relY > 0.88) S.v -= 160 * dt;
      S.v = U.clamp(S.v, 150, 760);
      S.y += S.v * Math.sin(S.hd) * 0.75 * dt;
      S.sx += (S.v * Math.cos(S.hd) - waveSpd) * 0.7 * dt;
      if (S.y < LIP + 6) {
        if (S.hd < -0.35 && S.v > 360) {
          S.air = true; S.vy = S.v * Math.sin(S.hd) * 1.15 - 120; S.rot = 0; S.spun = 0; S.grab = 0; S.vx = S.v * Math.cos(S.hd);
          g.sfx.jump(); spray(S.sx, LIP, 14);
        } else { S.y = LIP + 6; S.hd = Math.max(S.hd, 0.1); S.v -= 60 * dt; }
      }
      if (S.y > SF.TROUGH - 8) { S.y = SF.TROUGH - 8; S.hd = Math.min(S.hd, -0.05); }
      if (Math.random() < 0.5) S.spray.push({ x: S.sx - 18, y: S.y + 6, vx: -S.v * 0.3 + U.rand(-30, 30), vy: U.rand(-90, -30), t: 0.5 });
      const tubeZone = S.sx < S.foam + 150 && relY < 0.55;
      if (tubeZone) { S.tube += dt; if (Math.floor(S.tube * 4) !== Math.floor((S.tube - dt) * 4)) g.add(25); if (S.tube > 0.2 && S.tube - dt <= 0.2) flash('튜브 라이딩! 🌊', '#80deea'); }
      else if (S.tube > 0) { if (S.tube > 1.5) { const b = Math.round(S.tube * 200); g.add(b, S.sx, S.y - 50); g.sfx.coin(); flash(`튜브 탈출 +${b}`, '#80deea'); } S.tube = 0; }
    } else {
      S.vy += 1100 * dt; S.y += S.vy * dt;
      S.sx += (S.vx - waveSpd) * 0.5 * dt;
      const rs = 7.5;
      if (g.left) { S.rot -= rs * dt; S.spun -= rs * dt; }
      if (g.right) { S.rot += rs * dt; S.spun += rs * dt; }
      if (g.b) { S.grab += dt; if (Math.random() < 0.3) g.burst(S.sx, S.y, '#fff59d', 1, 60, 0.3, 2); }
      if (S.vy > 0 && S.y >= LIP + 8) landing(g, LIP);
    }
    S.sx = U.clamp(S.sx, 0, 900);
    if (S.sx < S.foam + 14 && S.inv <= 0) return wipeout(g, '파도에 휩쓸림!');
    scroll(g, dt, S.air ? S.vx : S.v * Math.cos(S.hd));
    for (const o of S.obs) {
      if (o.hit) continue;
      const dx = o.x - S.sx, dy = o.y - S.y;
      if (dx * dx + dy * dy < (o.r + 14) * (o.r + 14) && S.inv <= 0) { o.hit = true; return wipeout(g, o.name + '에 부딪힘!'); }
    }
    for (const it of S.items) {
      if (!it.got && Math.abs(it.x - S.sx) < 26 && Math.abs(it.y - S.y) < 30) { it.got = true; g.add(it.p, it.x, it.y); g.sfx.coin(); g.burst(it.x, it.y, '#fff176', 10, 150, 0.4); if (it.life) { S.lives = Math.min(5, S.lives + 1); flash('목숨 +1 ❤️', '#ff8a80'); } }
    }
    const nl = 1 + Math.floor(S.dist / 900);
    if (nl > S.lvl) { S.lvl = nl; g.sfx.power(); flash(`레벨 ${S.lvl} — 파도가 커진다!`, '#fff'); g.add(500); }
    hud(g);
  },
  draw(g, c) {
    const LIP = S.LIP || 250, H = SF.TROUGH - LIP;
    const sky = c.createLinearGradient(0, 0, 0, LIP); sky.addColorStop(0, '#4fc3f7'); sky.addColorStop(1, '#e1f5fe');
    c.fillStyle = sky; c.fillRect(0, 0, 960, 540);
    g.circle(800, 70, 40, '#fff59d');
    for (let i = 0; i < 5; i++) { const x = ((i * 260 - S.dist * 6) % 1300 + 1300) % 1300 - 120; g.emoji('☁️', x, 50 + (i % 3) * 30, 60); }
    const face = c.createLinearGradient(0, LIP, 0, SF.TROUGH); face.addColorStop(0, '#4dd0e1'); face.addColorStop(0.5, '#0097a7'); face.addColorStop(1, '#00626f');
    c.fillStyle = face; c.beginPath(); c.moveTo(0, SF.TROUGH + 70);
    for (let x = 0; x <= 960; x += 24) c.lineTo(x, LIP + Math.sin(x * 0.02 + S.t * 3) * 5);
    c.lineTo(960, SF.TROUGH + 70); c.closePath(); c.fill();
    for (let i = 0; i < 8; i++) { const yy = LIP + H * (0.15 + i * 0.11); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= 960; x += 30) { const y = yy + Math.sin(x * 0.03 + S.t * 2 + i) * 4; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    g.rect(0, SF.TROUGH, 960, 70, '#005662');
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); for (let x = 0; x <= 960; x += 12) { const y = LIP + Math.sin(x * 0.02 + S.t * 3) * 5 - 2; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    const fx = S.foam;
    c.fillStyle = 'rgba(0,131,143,.9)'; c.beginPath(); c.moveTo(0, LIP - 70); c.quadraticCurveTo(fx + 140, LIP - 90, fx + 150, LIP + 30); c.quadraticCurveTo(fx + 60, LIP - 20, 0, LIP + 60); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.moveTo(0, LIP - 72); c.quadraticCurveTo(fx + 140, LIP - 92, fx + 152, LIP + 30); c.quadraticCurveTo(fx + 120, LIP - 60, 0, LIP - 50); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(0, LIP - 40);
    for (let y = LIP - 40; y <= SF.TROUGH + 70; y += 20) c.lineTo(fx + Math.sin(y * 0.1 + S.t * 8) * 14, y);
    c.lineTo(0, SF.TROUGH + 70); c.closePath(); c.fill();
    for (let i = 0; i < 6; i++) g.circle(fx + Math.sin(S.t * 5 + i) * 10, LIP + i * H / 6, 16 + (i % 3) * 5, 'rgba(255,255,255,.85)');
    for (const it of S.items) if (!it.got) g.emoji(it.e, it.x, it.y + Math.sin(S.t * 4 + it.x * 0.1) * 4, 28);
    for (const o of S.obs) { if (o.k === 'gull') g.emoji(o.e, o.x, o.y + Math.sin(S.t * 8 + o.x) * 4, o.r * 2.3); else { g.emoji(o.e, o.x, o.y, o.r * 2.4); g.ring(o.x, o.y + o.r * 0.7, o.r, 'rgba(255,255,255,.4)', 2); } }
    for (const p of S.spray) g.circle(p.x, p.y, 3 * (p.t / 0.5) + 1, 'rgba(255,255,255,.8)');
    drawSurfer(g, c);
    g.rrect(10, 10, 250, 56, 10, 'rgba(0,0,0,.35)');
    g.text(`${Math.floor(S.dist)}m`, 20, 30, 22, '#fff', 'left');
    g.text('❤️'.repeat(Math.max(0, S.lives)), 20, 54, 16, '#fff', 'left');
    g.text(`레벨 ${S.lvl}`, 250, 30, 18, '#fff59d', 'right');
    g.rect(150, 48, 100, 8, 'rgba(255,255,255,.3)'); g.rect(150, 48, 100 * U.clamp((S.v - 150) / 610, 0, 1), 8, S.v > 360 ? '#76ff03' : '#ffca28');
    g.text('속도', 144, 52, 11, '#fff', 'right');
    if (S.air) { const turns = Math.abs(S.spun) / (Math.PI * 2); g.text(`${Math.floor(turns * 360)}°${S.grab > 0.2 ? ' + 그랩' : ''}`, S.sx, S.y - 70, 22, '#fff'); }
    if (S.msgT > 0) g.text(S.msg, 480, 110, 28, S.msgC);
    if (S.wipe > 0) g.text('와이프아웃! 🌊', 480, 200, 38, '#ff5252');
  },
});

function hud(g) { g.info = `레벨 ${S.lvl} · ${Math.floor(S.dist)}m · ❤️${S.lives}`; }
function flash(m, c) { S.msg = m; S.msgC = c || '#fff'; S.msgT = 1.8; }
function spray(x, y, n) { for (let i = 0; i < n; i++) S.spray.push({ x, y, vx: U.rand(-150, 150), vy: U.rand(-260, -60), t: 0.6 }); }

function scroll(g, dt, spd) {
  const m = Math.max(80, spd) * dt;
  S.dist += m / 40;
  const LIP = S.LIP, H = SF.TROUGH - LIP;
  for (const o of S.obs) { o.x -= m + (o.vx || 0) * dt; if (o.k === 'surfer') o.y += Math.sin(S.t * 2 + o.ph) * 30 * dt; }
  for (const it of S.items) it.x -= m;
  S.obs = S.obs.filter((o) => o.x > -60); S.items = S.items.filter((i) => i.x > -60 && !i.got);
  for (const p of S.spray) { p.vy += 500 * dt; p.x += p.vx * dt - m * 0.5; p.y += p.vy * dt; p.t -= dt; }
  S.spray = S.spray.filter((p) => p.t > 0);
  S.spawn -= m / 400; S.ispawn -= m / 300;
  if (S.spawn <= 0) {
    S.spawn = U.rand(0.9, 1.8) / (1 + S.lvl * 0.12);
    const r = Math.random();
    let o;
    if (r < 0.3) o = { k: 'rock', e: '🪨', name: '바위', r: 22, y: LIP + H * U.rand(0.7, 0.92) };
    else if (r < 0.5) o = { k: 'shark', e: '🦈', name: '상어', r: 22, y: LIP + H * U.rand(0.35, 0.85), vx: 60 };
    else if (r < 0.68) o = { k: 'surfer', e: '🏄', name: '다른 서퍼', r: 20, y: LIP + H * U.rand(0.2, 0.7), vx: -80, ph: Math.random() * 6 };
    else if (r < 0.82) o = { k: 'buoy', e: '🛟', name: '부표', r: 16, y: LIP + H * U.rand(0.3, 0.9) };
    else o = { k: 'gull', e: '🐦', name: '갈매기', r: 16, y: LIP - U.rand(40, 140), vx: 120 };
    o.x = 1000; S.obs.push(o);
  }
  if (S.ispawn <= 0) {
    S.ispawn = U.rand(0.6, 1.4);
    const r = Math.random();
    const it = r < 0.08 ? { e: '❤️', p: 100, life: true, y: LIP + H * U.rand(0.2, 0.8) } : r < 0.25 ? { e: '💎', p: 300, y: LIP - U.rand(60, 150) } : { e: '🐚', p: 50, y: LIP + H * U.rand(0.1, 0.85) };
    it.x = 1000; S.items.push(it);
  }
}

function landing(g, LIP) {
  S.air = false; S.y = LIP + 10; S.hd = 0.45;
  let a = ((S.rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2;
  if (Math.abs(a) > 0.75) return wipeout(g, '착지 실패!');
  const turns = Math.round(Math.abs(S.spun) / (Math.PI * 2));
  let pts = 150, name = '에어';
  if (turns >= 1) { pts = [0, 500, 1400, 3000, 5000][Math.min(4, turns)]; name = `${turns * 360}° 에어`; }
  if (S.grab > 0.25) { pts += Math.round(S.grab * 400); name += ' + 그랩'; }
  const clean = Math.abs(a) < 0.25;
  if (clean) { pts = Math.round(pts * 1.3); name += ' (클린!)'; }
  if (S.t - (S.lastLand || -99) > 6) S.combo = 0;
  S.lastLand = S.t; S.combo++; pts *= Math.min(S.combo, 5);
  g.add(pts, S.sx, S.y - 60); flash(`${name}${S.combo > 1 ? ' x' + Math.min(S.combo, 5) : ''}`, '#ffeb3b');
  g.sfx[turns >= 1 ? 'power' : 'coin'](); spray(S.sx, S.y, 18); g.shake(3, 0.15);
  S.v = Math.max(S.v, 420); S.rot = 0;
}
function wipeout(g, why) {
  S.lives--; S.wipe = 1.6; S.air = false; S.combo = 0; S.tube = 0;
  g.sfx.explode(); g.shake(10, 0.4); spray(S.sx, S.y, 30); g.burst(S.sx, S.y, ['#fff', '#b2ebf2'], 30, 300, 0.8);
  flash(why, '#ff5252');
}
function drawSurfer(g, c) {
  if (S.wipe > 0) { g.emoji('💦', S.sx, S.y - 10, 50); return; }
  if (S.inv > 0 && Math.floor(S.t * 10) % 2) return;
  c.save(); c.translate(S.sx, S.y);
  const ang = S.air ? S.rot : S.hd * 0.6;
  c.rotate(ang);
  g.rrect(-34, -4, 68, 9, 5, '#ff7043', '#fff', 2); g.line(-30, 0, 30, 0, '#fff', 1.5);
  const crouch = S.air && S.grab > 0 ? 12 : 0;
  c.lineCap = 'round';
  g.line(-10, -4, -6, -28 + crouch, '#1a237e', 6); g.line(10, -4, 4, -28 + crouch, '#1a237e', 6);
  g.line(-1, -28 + crouch, 0, -54 + crouch, '#ffca28', 9);
  if (S.air && S.grab > 0) { g.line(0, -48 + crouch, 14, -6, '#ffcc80', 5); g.line(0, -48 + crouch, -18, -60, '#ffcc80', 5); }
  else { g.line(0, -50 + crouch, -24, -40 + crouch, '#ffcc80', 5); g.line(0, -50 + crouch, 24, -46 + crouch, '#ffcc80', 5); }
  g.circle(1, -65 + crouch, 10, '#ffcc80'); g.circle(1, -69 + crouch, 9, '#5d4037');
  c.restore();
}
