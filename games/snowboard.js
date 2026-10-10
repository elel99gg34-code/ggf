'use strict';
let S;
const SB = { PY: 170, STAGES: 5, NAMES: ['초보 슬로프', '숲속 코스', '모글 계곡', '빙판 협곡', '블랙 다이아몬드'] };

GAME({
  title: '스노보드', w: 960, h: 600, bg: '#f4f8fc', controls: 'dpad+ab', aLabel: '점프', bLabel: '그랩',
  help: '←→ 방향 전환 (옆으로 = 감속) · ↓ 턱(가속) · ↑ 브레이크\nSpace 점프(작은 장애물 넘기) · 🟦 점프대에서 크게 날기\n공중: ←→ 회전 스핀, Shift/X 꾹 = 그랩 · 착지 때 진행 방향과 맞아야 성공\n🚩 게이트 사이를 통과! 놓치면 +3초 · 제한 시간 안에 결승선 통과\n총 5개 코스',
  init(g) {
    S = { stage: 0, lives: 3 };
    loadStage(g);
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    if (S.finish > 0) {
      S.finish -= dt; S.spd = Math.max(0, S.spd - 500 * dt); S.wy += S.spd * dt;
      if (S.finish <= 0) { S.stage++; if (S.stage >= SB.STAGES) return g.win(`5개 코스 완주! 🏂`); loadStage(g); }
      return hud(g);
    }
    S.time -= dt;
    if (S.time <= 0) { return g.over(`${SB.NAMES[S.stage]} 시간 초과`); }
    if (S.crash > 0) {
      S.crash -= dt;
      if (S.crash <= 0) { S.a = 0; S.spd = 80; S.inv = 1.5; S.air = 0; S.rot = 0; }
      return hud(g);
    }
    S.inv -= dt;
    const ice = onIce();
    if (S.air > 0) {
      S.air -= dt; S.airH = Math.sin(Math.PI * (1 - S.air / S.airMax)) * S.airMax * 120;
      if (g.left) { S.rot -= 7 * dt; } if (g.right) { S.rot += 7 * dt; }
      if (g.b) S.grab += dt;
      if (S.air <= 0) land(g);
    } else {
      const turn = ice ? 1.2 : 2.8;
      if (g.left) S.a -= turn * dt; if (g.right) S.a += turn * dt;
      S.a = U.clamp(S.a, -1.4, 1.4);
      let acc = Math.cos(S.a) * (g.down ? 330 : 240) - S.spd * (ice ? 0.12 : 0.28) - Math.abs(Math.sin(S.a)) * (ice ? 60 : 260);
      if (g.up) acc -= 400;
      S.spd = U.clamp(S.spd + acc * dt, 40, 880);
      if (g.pressed('a')) { S.air = S.airMax = 0.45; S.rot = 0; S.grab = 0; S.small = true; S.airDir = S.a; g.sfx.jump(); }
      if (Math.random() < 0.7) S.trail.push({ x: S.x, y: S.wy, t: 2.5 });
      if (Math.abs(S.a) > 0.8 && S.spd > 250 && Math.random() < 0.5) g.burst(S.x, SB.PY + 10, '#fff', 2, 120, 0.4, 3);
    }
    const dir = S.air > 0 ? S.airDir : S.a;
    S.x += Math.sin(dir) * S.spd * dt; S.wy += Math.cos(dir) * S.spd * dt;
    if (S.x < 40 || S.x > 920) { S.x = U.clamp(S.x, 40, 920); if (S.air <= 0) crash(g, '펜스 충돌!'); }
    for (const t of S.trail) t.t -= dt;
    while (S.trail.length && S.trail[0].t <= 0) S.trail.shift();
    if (S.trail.length > 300) S.trail.shift();
    for (const o of S.objs) {
      const dy = o.y - S.wy;
      if (dy < -60 || dy > 60) continue;
      if (o.k === 'gate') {
        if (!o.done && S.wy >= o.y) {
          o.done = true;
          if (S.x > o.x - o.w / 2 && S.x < o.x + o.w / 2) { S.gates++; g.add(100 + S.stage * 20, S.x, SB.PY - 30); g.sfx.coin(); S.time += 0.5; }
          else { S.time -= 3; S.missed++; flash('게이트 미스! -3초', '#e53935'); g.sfx.hit(); }
        }
        continue;
      }
      if (o.got) continue;
      const dx = o.x - S.x;
      if (Math.abs(dx) < o.r && Math.abs(dy) < o.r * 0.7) {
        if (o.k === 'ramp') { if (S.air <= 0) { S.airMax = S.air = 0.6 + S.spd / 700; S.airDir = S.a; S.rot = 0; S.grab = 0; S.small = false; g.sfx.jump(); g.add(50); o.got = true; } }
        else if (o.k === 'coin') { o.got = true; g.add(30, o.x, SB.PY - 30); g.sfx.coin(); }
        else if (o.k === 'clock') { o.got = true; S.time += 4; flash('+4초 ⏱', '#1e88e5'); g.sfx.power(); }
        else if (S.inv <= 0 && !(S.air > 0 && (o.k === 'rock' || o.k === 'flag' || S.airH > 60))) { o.got = true; crash(g, o.k === 'tree' ? '나무에 꽝!' : o.k === 'rock' ? '바위에 걸림!' : '눈사람 박살!'); }
      }
    }
    if (S.wy >= S.len) { finishStage(g); }
    hud(g);
  },
  draw(g, c) {
    const oy = S.wy - SB.PY;
    g.rect(0, 0, 960, 600, '#f4f8fc');
    for (let i = 0; i < 30; i++) { const y = ((i * 97 - oy) % 1200 + 1200) % 1200 - 100; g.circle((i * 211) % 960, y, 30 + (i % 4) * 12, 'rgba(200,220,240,.35)'); }
    for (const p of S.ice) { const y = p.y - oy; if (y > -200 && y < 800) g.rrect(p.x - p.w / 2, y, p.w, p.h, 30, 'rgba(129,212,250,.45)', 'rgba(255,255,255,.8)', 2); }
    g.rect(0, 0, 36, 600, '#90a4ae'); g.rect(924, 0, 36, 600, '#90a4ae');
    for (let i = 0; i < 14; i++) { const y = ((i * 50 - oy) % 700 + 700) % 700 - 50; g.rect(30, y, 8, 26, '#ff7043'); g.rect(922, y, 8, 26, '#ff7043'); }
    c.strokeStyle = 'rgba(140,170,200,.5)'; c.lineWidth = 3; c.beginPath(); let first = true;
    for (const t of S.trail) { const y = t.y - oy; if (first) { c.moveTo(t.x, y); first = false; } else c.lineTo(t.x, y); } c.stroke();
    const fy = S.len - oy;
    if (fy < 700) { for (let x = 36; x < 924; x += 30) g.rect(x, fy, 15, 15, ((x / 30) | 0) % 2 ? '#000' : '#fff'); g.text('🏁 결승', 480, fy - 30, 28, '#000'); }
    for (const o of S.objs) {
      const y = o.y - oy; if (y < -80 || y > 680) continue;
      if (o.k === 'gate') {
        const col = o.c ? '#e53935' : '#1e88e5', al = o.done ? 0.35 : 1;
        c.globalAlpha = al;
        g.line(o.x - o.w / 2, y - 30, o.x - o.w / 2, y + 4, '#555', 3); g.poly([[o.x - o.w / 2, y - 30], [o.x - o.w / 2 + 22, y - 22], [o.x - o.w / 2, y - 14]], col);
        g.line(o.x + o.w / 2, y - 30, o.x + o.w / 2, y + 4, '#555', 3); g.poly([[o.x + o.w / 2, y - 30], [o.x + o.w / 2 - 22, y - 22], [o.x + o.w / 2, y - 14]], col);
        c.setLineDash([6, 8]); g.line(o.x - o.w / 2, y, o.x + o.w / 2, y, col, 1); c.setLineDash([]);
        c.globalAlpha = 1;
      } else if (o.k === 'ramp') { g.poly([[o.x - 40, y + 20], [o.x + 40, y + 20], [o.x + 30, y - 20], [o.x - 30, y - 20]], '#4fc3f7', '#0277bd', 3); g.text('⇡', o.x, y, 22, '#fff'); }
      else if (!o.got) {
        g.circle(o.x + 6, y + o.r * 0.5, o.r * 0.7, 'rgba(0,0,0,.08)');
        g.emoji({ tree: '🌲', rock: '🪨', snowman: '⛄', coin: '❄️', clock: '⏱️', flag: '🚩' }[o.k], o.x, y - (o.k === 'tree' ? 14 : 0), o.k === 'tree' ? o.r * 2.6 : o.r * 2);
      }
    }
    drawRider(g, c);
    g.rrect(10, 10, 300, 74, 10, 'rgba(20,40,70,.75)');
    g.text(`${S.stage + 1}. ${SB.NAMES[S.stage]}`, 20, 28, 17, '#fff', 'left');
    g.text(`⏱ ${S.time.toFixed(1)}`, 300, 28, 20, S.time < 10 ? '#ff5252' : '#fff59d', 'right');
    g.text(`게이트 ${S.gates}/${S.totalGates}  미스 ${S.missed}`, 20, 52, 14, '#b3e5fc', 'left');
    g.text(`${Math.round(S.spd / 8)} km/h`, 300, 52, 14, '#fff', 'right');
    g.rect(20, 70, 280, 6, 'rgba(255,255,255,.25)'); g.rect(20, 70, 280 * Math.min(1, S.wy / S.len), 6, '#76ff03');
    if (S.air > 0 && !S.small) { const deg = Math.round(Math.abs(S.rot) * 180 / Math.PI / 10) * 10; g.text(`${deg}°${S.grab > 0.2 ? ' 그랩!' : ''}`, S.x, SB.PY - 80 - S.airH * 0.3, 22, '#6a1b9a'); }
    if (S.msgT > 0) g.text(S.msg, 480, 260, 30, S.msgC);
    if (S.crash > 0) g.text('💫 꽈당!', S.x, SB.PY - 60, 26, '#e53935');
    if (S.finish > 0) { g.rrect(280, 220, 400, 140, 16, 'rgba(20,40,70,.85)'); g.text('코스 완주!', 480, 255, 32, '#fff'); g.text(`남은 시간 보너스 +${S.bonus}`, 480, 300, 20, '#fff59d'); g.text(`게이트 ${S.gates}/${S.totalGates}`, 480, 330, 18, '#b3e5fc'); }
  },
});

function hud(g) { g.info = `코스 ${S.stage + 1}/${SB.STAGES} · ⏱${Math.max(0, S.time).toFixed(1)} · 게이트 ${S.gates}`; }
function flash(m, c) { S.msg = m; S.msgC = c || '#333'; S.msgT = 1.6; }
function onIce() { for (const p of S.ice) if (S.x > p.x - p.w / 2 && S.x < p.x + p.w / 2 && S.wy > p.y && S.wy < p.y + p.h) return true; return false; }

function loadStage(g) {
  const st = S.stage, len = 9000 + st * 2500;
  Object.assign(S, { x: 480, wy: 0, a: 0, spd: 120, air: 0, airH: 0, airMax: 1, airDir: 0, rot: 0, grab: 0, crash: 0, inv: 1, t: 0, msg: '', msgT: 0, trail: [], objs: [], ice: [], len, gates: 0, missed: 0, finish: 0, small: false });
  let gx = 480, gi = 0;
  for (let y = 600; y < len - 300; y += U.randi(380, 520) - st * 20) {
    gx = U.clamp(gx + U.randi(-260, 260), 160, 800);
    const w = 190 - st * 18;
    S.objs.push({ k: 'gate', x: gx, y, w, c: gi++ % 2 });
    if (Math.random() < 0.45) S.objs.push({ k: 'coin', x: gx + U.rand(-30, 30), y: y - 120, r: 20 });
  }
  S.totalGates = gi;
  const dens = 0.6 + st * 0.35;
  for (let y = 500; y < len - 200; y += 120) {
    const n = Math.random() < dens ? U.randi(1, 2 + st) : 0;
    for (let i = 0; i < n; i++) {
      const x = U.rand(70, 890);
      const near = S.objs.some((o) => o.k === 'gate' && Math.abs(o.y - y) < 90 && Math.abs(o.x - x) < o.w / 2 + 50);
      if (near) continue;
      const r = Math.random();
      const k = r < 0.5 + st * 0.05 ? 'tree' : r < 0.78 ? 'rock' : 'snowman';
      S.objs.push({ k, x, y: y + U.rand(-40, 40), r: k === 'tree' ? 22 : 18 });
    }
    if (Math.random() < 0.08) S.objs.push({ k: 'ramp', x: U.rand(150, 810), y, r: 40 });
    if (Math.random() < 0.025) S.objs.push({ k: 'clock', x: U.rand(150, 810), y: y + 60, r: 20 });
  }
  if (st >= 2) for (let i = 0; i < 4 + st * 2; i++) S.ice.push({ x: U.rand(150, 810), y: U.rand(800, len - 600), w: U.rand(160, 320), h: U.rand(160, 300) });
  S.objs.sort((a, b) => a.y - b.y);
  S.time = Math.round(len / 360 + 6 - st * 1.5);
  flash(`${st + 1}. ${SB.NAMES[st]}`, '#0d47a1');
  g.sfx.beep(660, 0.15);
}
function land(g) {
  S.air = 0; S.airH = 0;
  if (S.small) { S.small = false; S.rot = 0; return; }
  const turns = S.rot / (Math.PI * 2), off = Math.abs(turns - Math.round(turns)) * Math.PI * 2;
  if (off > 0.7) { S.rot = 0; return crash(g, '착지 실패!'); }
  const n = Math.round(Math.abs(turns));
  let pts = 100, name = '빅 에어';
  if (n > 0) { pts = [0, 400, 1000, 2000, 3500][Math.min(4, n)]; name = `${n * 360}° 스핀`; }
  if (S.grab > 0.3) { pts += Math.round(S.grab * 300); name += ' + 그랩'; }
  g.add(pts, S.x, SB.PY - 50); flash(name, '#6a1b9a'); g.sfx[n ? 'power' : 'coin']();
  g.burst(S.x, SB.PY + 10, '#fff', 20, 200, 0.5, 4); g.shake(3, 0.15);
  S.a = S.airDir; S.rot = 0;
}
function crash(g, why) {
  S.crash = 1.2; S.spd = 0; S.air = 0; S.airH = 0; S.rot = 0;
  g.sfx.hit(); g.shake(9, 0.35); g.burst(S.x, SB.PY, ['#fff', '#b3e5fc'], 26, 260, 0.7, 4);
  flash(why, '#e53935'); S.time -= 1;
}
function finishStage(g) {
  S.bonus = Math.round(Math.max(0, S.time) * 50 + S.gates * 20 + (S.missed === 0 ? 1000 : 0));
  g.add(S.bonus); g.sfx.win(); S.finish = 2.8;
  g.burst(480, 300, ['#e53935', '#1e88e5', '#ffeb3b', '#43a047'], 60, 400, 1.2, 4);
  if (S.missed === 0) flash('퍼펙트 게이트! +1000', '#43a047');
}
function drawRider(g, c) {
  const x = S.x, y = SB.PY - (S.airH || 0) * 0.5;
  g.circle(x + (S.airH || 0) * 0.2, SB.PY + 6, 18 - Math.min(10, (S.airH || 0) * 0.05), 'rgba(0,0,0,.15)');
  c.save(); c.translate(x, y);
  const sc = 1 + (S.airH || 0) / 300; c.scale(sc, sc);
  const dir = S.air > 0 ? S.airDir + S.rot : S.a;
  if (S.crash > 0) c.rotate(S.t * 12);
  c.save(); c.rotate(dir + Math.PI / 2);
  g.rrect(-30, -8, 60, 16, 8, '#7b1fa2', '#fff', 2);
  c.restore();
  c.rotate(dir);
  g.circle(0, 0, 12, '#26a69a'); g.circle(0, 0, 8, '#fdd835');
  const grab = S.air > 0 && S.grab > 0;
  g.line(0, 0, grab ? 10 : 16, grab ? 10 : -4, '#26a69a', 5); g.line(0, 0, grab ? -10 : -16, grab ? 10 : 4, '#26a69a', 5);
  c.restore();
}
