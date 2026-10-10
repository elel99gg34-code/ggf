'use strict';
let S;
const HB = { L: 40, R: 920, T: 60, B: 560, CY: 310, GW: 60, Z6: 130, Z9: 195, HALF: 90, SPD: 190 };

GAME({
  title: '핸드볼', w: 960, h: 600, bg: '#1b5e20', controls: 'dpad+ab', aLabel: '슛', bLabel: '패스',
  help: '방향키 이동 · Space 꾹=슛 파워, 놓으면 슛 (↑↓ 누르면 위/아래 구석)\n6m 라인 근처에서 슛 = 점프슛! · Shift/X 패스 (방향키 쪽 동료에게)\n수비: Shift/X = 공 뺏기 (무리하면 반칙 → 7m 던지기)\n7m 던지기: 조준점 이동 후 Space 슛 / 막을 땐 방향키로 다이브\n전후반 90초씩 · 동점이면 7m 승부던지기',
  init(g) {
    S = { sc: [0, 0], half: 1, clock: HB.HALF, mode: 'play', msg: '', msgT: 0, t: 0, pause: 0, charge: -1, ctrl: 0, switchT: 0, possT: 0, stats: { shots: 0 },
      ball: { owner: null, x: 480, y: HB.CY, vx: 0, vy: 0, kind: null, from: null, tgt: null, z: 0, t: 0 }, pk: null, so: null };
    S.pl = [];
    for (let t = 0; t < 2; t++) {
      S.pl.push({ team: t, gk: true, x: t ? HB.R - 20 : HB.L + 20, y: HB.CY, stun: 0, cd: 0, dive: 0, idx: 0 });
      for (let i = 0; i < 4; i++) S.pl.push({ team: t, gk: false, x: 0, y: 0, stun: 0, cd: 0, idx: i, jump: 0 });
    }
    kickoff(g, 0);
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    if (S.mode === 'pk') return updPK(g, dt);
    if (S.pause > 0) { S.pause -= dt; if (S.pause <= 0 && S.after) { const f = S.after; S.after = null; f(); } return hud(g); }
    S.clock -= dt;
    if (S.clock <= 0) return endHalf(g);
    const B = S.ball;
    const ctrl = S.pl[S.ctrl];
    for (const p of S.pl) { p.stun -= dt; p.cd -= dt; p.dive = Math.max(0, p.dive - dt); if (p.jump > 0) p.jump -= dt; }
    if (B.owner && B.owner.team === 0 && !B.owner.gk) S.ctrl = S.pl.indexOf(B.owner);
    else if (!(B.owner && B.owner.team === 0)) { S.switchT -= dt; if (S.switchT <= 0) { S.switchT = 0.4; let best = null, bd = 1e9; for (const p of S.pl) if (p.team === 0 && !p.gk) { const d = U.dist(p.x, p.y, B.x, B.y); if (d < bd) { bd = d; best = p; } } S.ctrl = S.pl.indexOf(best); } }
    humanCtrl(g, S.pl[S.ctrl], dt);
    for (const p of S.pl) if (p !== S.pl[S.ctrl]) aiPlayer(g, p, dt);
    for (const p of S.pl) zoneClamp(p);
    separate();
    updBall(g, dt);
    void ctrl;
    hud(g);
  },
  draw(g, c) {
    drawCourt(g, c);
    if (S.mode === 'pk') return drawPK(g, c);
    const B = S.ball;
    for (const p of S.pl) drawPlayer(g, c, p);
    const bz = B.owner ? 0 : B.z;
    g.circle(B.x + 3, B.y + 4, 6, 'rgba(0,0,0,.3)');
    g.emoji('🏐', B.x, B.y - bz, 16 + bz * 0.2);
    if (S.charge >= 0) { const p = S.pl[S.ctrl]; g.rect(p.x - 20, p.y - 34, 40, 6, '#000'); g.rect(p.x - 20, p.y - 34, 40 * S.charge, 6, S.charge > 0.85 ? '#f44336' : '#ffeb3b'); }
    g.rrect(380, 4, 200, 46, 10, 'rgba(0,0,0,.6)');
    g.text(`${S.sc[0]} : ${S.sc[1]}`, 480, 22, 24, '#fff');
    g.text(`${S.half}H ${U.fmtTime(Math.max(0, S.clock))}`, 480, 42, 13, '#ffeb3b');
    g.text('🔵 우리 →', 300, 26, 15, '#90caf9'); g.text('← 상대 🔴', 660, 26, 15, '#ef9a9a');
    if (S.msgT > 0) g.text(S.msg, 480, 110, 32, S.msgC);
  },
});

function hud(g) { g.info = S.mode === 'pk' && S.so ? `승부던지기 ${S.so.g[0]} : ${S.so.g[1]}` : `${S.half}H ${U.fmtTime(Math.max(0, S.clock))} · ${S.sc[0]} : ${S.sc[1]}`; }
function flash(m, c, t) { S.msg = m; S.msgC = c || '#fff'; S.msgT = t || 1.6; }
function goalX(team) { return team === 0 ? HB.R : HB.L; }
function ownGoalX(team) { return team === 0 ? HB.L : HB.R; }
function attackSpot(p) {
  const gx = goalX(p.team), s = p.team === 0 ? -1 : 1;
  const spots = [[gx + s * 70, 110], [gx + s * 250, 220], [gx + s * 250, 400], [gx + s * 70, 510]];
  const sp = spots[p.idx];
  return [sp[0] + Math.sin(S.t * 0.9 + p.idx * 2) * 30 * s, sp[1] + Math.cos(S.t * 0.7 + p.idx) * 30];
}
function kickoff(g, team) {
  const B = S.ball;
  for (const p of S.pl) {
    if (p.gk) { p.x = ownGoalX(p.team) + (p.team ? -20 : 20); p.y = HB.CY; continue; }
    const s = p.team === 0 ? -1 : 1;
    p.x = 480 + s * (60 + (p.idx % 2) * 120); p.y = [150, 260, 360, 470][p.idx]; p.stun = 0;
  }
  const carrier = S.pl.find((p) => p.team === team && !p.gk && p.idx === 1);
  carrier.x = 480 + (team ? 20 : -20); carrier.y = HB.CY;
  B.owner = carrier; B.kind = null; S.possT = 0; S.charge = -1;
}
function endHalf(g) {
  if (S.half === 1) { S.half = 2; S.clock = HB.HALF; flash('후반전 시작!', '#ffeb3b', 2); g.sfx.beep(880, 0.4); S.pause = 1.5; S.after = () => kickoff(g, 1); return; }
  if (S.sc[0] !== S.sc[1]) return finish(g);
  flash('동점! 7m 승부던지기', '#ffeb3b', 2.5); g.sfx.power();
  S.so = { n: 0, g: [0, 0], k: [0, 0] };
  S.pause = 0; startPK(g, 0, true);
}
function finish(g) {
  const [a, b] = S.sc;
  if (a > b) { g.add(1000); g.win(`${a} : ${b} 승리! 🤾`); } else g.over(`${a} : ${b} 패배`);
}

function humanCtrl(g, p, dt) {
  const B = S.ball;
  if (p.stun > 0) return;
  let mx = (g.right ? 1 : 0) - (g.left ? 1 : 0), my = (g.down ? 1 : 0) - (g.up ? 1 : 0);
  const m = Math.hypot(mx, my) || 1;
  const sp = HB.SPD * (B.owner === p ? 0.92 : 1) * (S.charge >= 0 ? 0.6 : 1);
  if (p.jump > 0) { p.x += p.jvx * dt; p.y += p.jvy * dt; }
  else { p.x += (mx / m) * sp * dt; p.y += (my / m) * sp * dt; }
  if (mx || my) { p.fx = mx / m; p.fy = my / m; }
  if (B.owner === p) {
    S.possT += dt;
    if (g.pressed('a') && S.charge < 0) S.charge = 0;
    if (S.charge >= 0) {
      S.charge = Math.min(1, S.charge + dt * 1.4);
      if (!g.held('a')) {
        const dG = U.dist(p.x, p.y, goalX(0), HB.CY);
        if (dG < HB.Z9 && p.jump <= 0) { p.jump = 0.3; p.jvx = 200; p.jvy = (HB.CY - p.y) * 0.4; g.sfx.jump(); S.pendingShot = { pow: S.charge, aim: g.up ? -1 : g.down ? 1 : 0 }; S.charge = -1; }
        else { shoot(g, p, S.charge, g.up ? -1 : g.down ? 1 : 0); S.charge = -1; }
      }
    }
    if (S.pendingShot && p.jump <= 0.12) { shoot(g, p, S.pendingShot.pow, S.pendingShot.aim, true); S.pendingShot = null; }
    if (g.pressed('b') && S.charge < 0) { const tm = pickPass(p, mx, my); if (tm) pass(g, p, tm); }
  } else if (B.owner && B.owner.team === 1) {
    if (g.pressed('b') && p.cd <= 0) tackle(g, p, B.owner, true);
  }
}
function pickPass(p, mx, my) {
  let best = null, bs = -1e9;
  for (const q of S.pl) {
    if (q.team !== p.team || q === p || q.gk) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    let sc = -d * 0.2 + openness(q) * 2;
    if (mx || my) sc += ((dx * mx + dy * my) / d) * 200;
    else sc += (p.team === 0 ? dx : -dx) * 0.3;
    if (sc > bs) { bs = sc; best = q; }
  }
  return best;
}
function openness(q) { let m = 200; for (const o of S.pl) if (o.team !== q.team && !o.gk) m = Math.min(m, U.dist(o.x, o.y, q.x, q.y)); return m; }
function pass(g, p, q) {
  const B = S.ball, d = U.dist(p.x, p.y, q.x, q.y), T = d / 640;
  const tx = q.x + (q.vx || 0) * T, ty = q.y + (q.vy || 0) * T;
  B.owner = null; B.kind = 'pass'; B.from = p; B.tgt = q; B.x = p.x; B.y = p.y;
  const dd = Math.hypot(tx - p.x, ty - p.y) || 1; B.vx = (tx - p.x) / dd * 640; B.vy = (ty - p.y) / dd * 640; B.t = 0; B.z = 10;
  B.icept = Math.random();
  p.cd = 0.3; g.sfx.tone(520, 0.05, 'sine', 0.07);
}
function shoot(g, p, pow, aim, jump) {
  const B = S.ball, gx = goalX(p.team);
  const dG = U.dist(p.x, p.y, gx, HB.CY);
  let ty = HB.CY + aim * (HB.GW - 10) + (aim === 0 ? U.rand(-25, 25) : 0);
  const spread = (dG / 300) * 28 + (pow > 0.88 ? 45 : 0) - (jump ? 10 : 0);
  ty += U.rand(-spread, spread);
  const spd = 480 + pow * 480;
  const dx = gx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  B.owner = null; B.kind = 'shot'; B.from = p; B.x = p.x; B.y = p.y; B.vx = dx / d * spd; B.vy = dy / d * spd; B.z = 16; B.ty = ty; B.t = 0;
  const gk = S.pl.find((q) => q.gk && q.team !== p.team);
  gk.react = U.rand(0.08, 0.2) + (p.team === 0 ? 0.05 : 0) - (p.team === 1 ? 0 : 0); gk.aimY = ty + U.rand(-30, 30) * (spd / 900);
  p.cd = 0.5; S.possT = 0; g.sfx.shoot();
  if (p.team === 0) S.stats.shots++;
}
function tackle(g, d, carrier, human) {
  d.cd = human ? 0.6 : 0.9;
  const dist = U.dist(d.x, d.y, carrier.x, carrier.y);
  if (dist > 34) { if (human) { d.stun = 0.15; } return; }
  const r = Math.random(), steal = human ? 0.42 : 0.2, foul = human ? 0.3 : 0.14;
  if (r < steal) { S.ball.owner = d; S.possT = 0; g.sfx.pop(); flash(d.team === 0 ? '스틸!' : '뺏겼다!', d.team === 0 ? '#80d8ff' : '#ff8a80', 1); if (d.team === 0) g.add(30, d.x, d.y - 30); carrier.stun = 0.5; }
  else if (r < steal + foul) {
    g.sfx.tone(1800, 0.3, 'square', 0.05); d.stun = 0.8;
    const dG = U.dist(carrier.x, carrier.y, goalX(carrier.team), HB.CY);
    if (dG < HB.Z9 + 20) { flash('반칙! 7m 던지기', '#ffeb3b', 2); S.pause = 1.2; S.after = () => startPK(g, carrier.team, false); }
    else { flash('반칙 — 프리스로', '#fff', 1.2); for (const o of S.pl) if (o.team === d.team && !o.gk && U.dist(o.x, o.y, carrier.x, carrier.y) < 60) { const a = Math.atan2(o.y - carrier.y, o.x - carrier.x); o.x = carrier.x + Math.cos(a) * 60; o.y = carrier.y + Math.sin(a) * 60; } }
  } else { d.stun = 0.35; }
}

function aiPlayer(g, p, dt) {
  const B = S.ball;
  if (p.stun > 0) return;
  let tx = p.x, ty = p.y, spd = HB.SPD * (p.team === 1 ? 0.93 + Math.min(0.15, S.sc[0] * 0.015) : 0.9);
  if (p.gk) return aiGK(g, p, dt);
  const hasBall = B.owner && B.owner.team === p.team;
  if (B.owner === p) {
    S.possT += dt * (p.team === 1 ? 1 : 0);
    const gx = goalX(p.team), dG = U.dist(p.x, p.y, gx, HB.CY);
    tx = gx + (p.team ? 1 : -1) * 150; ty = HB.CY + Math.sin(S.t + p.idx) * 80;
    let pressure = 0; for (const o of S.pl) if (o.team !== p.team && !o.gk && U.dist(o.x, o.y, p.x, p.y) < 40) pressure++;
    p.hold = (p.hold || 0) + dt;
    if (dG < 215 && (Math.random() < dt * (pressure ? 0.8 : 2.2) || S.possT > 14) && p.cd <= 0) { shoot(g, p, U.rand(0.5, 0.85), U.choice([-1, 0, 1])); p.hold = 0; return; }
    if ((pressure && Math.random() < dt * 1.6) || p.hold > 3.5) { const q = pickPass(p, 0, 0); if (q && !q.gk) { pass(g, p, q); p.hold = 0; return; } }
  } else if (B.owner === null && B.kind !== 'shot' && (B.kind !== 'pass' || B.tgt === p || B.tgt.team !== p.team)) {
    const mates = S.pl.filter((q) => q.team === p.team && !q.gk);
    let near = mates[0], nd = 1e9; for (const q of mates) { const d = U.dist(q.x, q.y, B.x, B.y); if (d < nd) { nd = d; near = q; } }
    if (near === p || B.tgt === p) { tx = B.x + B.vx * 0.15; ty = B.y + B.vy * 0.15; }
    else [tx, ty] = hasBall ? attackSpot(p) : defendSpot(p);
  } else if (hasBall) {
    if (B.tgt === p && B.kind === 'pass') { tx = B.x; ty = B.y; } else [tx, ty] = attackSpot(p);
  } else {
    const carrier = B.owner;
    [tx, ty] = defendSpot(p);
    if (carrier && carrier.team !== p.team) {
      const mates = S.pl.filter((q) => q.team === p.team && !q.gk && q !== S.pl[S.ctrl]);
      let near = null, nd = 1e9; for (const q of mates) { const d = U.dist(q.x, q.y, carrier.x, carrier.y); if (d < nd) { nd = d; near = q; } }
      if (near === p) {
        const og = ownGoalX(p.team), a = Math.atan2(HB.CY - carrier.y, og - carrier.x);
        tx = carrier.x + Math.cos(a) * 22; ty = carrier.y + Math.sin(a) * 22;
        if (U.dist(p.x, p.y, carrier.x, carrier.y) < 32 && p.cd <= 0 && Math.random() < dt * 1.5) tackle(g, p, carrier, false);
      }
    }
  }
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d > 3) { const v = Math.min(spd, d * 6); p.vx = dx / d * v; p.vy = dy / d * v; p.x += p.vx * dt; p.y += p.vy * dt; p.fx = dx / d; p.fy = dy / d; } else { p.vx = p.vy = 0; }
}
function defendSpot(p) {
  const og = ownGoalX(p.team), s = p.team === 0 ? 1 : -1;
  const opp = S.pl.filter((q) => q.team !== p.team && !q.gk);
  const mark = opp[p.idx];
  const a = Math.atan2(mark.y - HB.CY, mark.x - og), dm = U.dist(mark.x, mark.y, og, HB.CY);
  const r = Math.max(HB.Z6 + 14, Math.min(dm - 34, HB.Z9 + 30));
  void s;
  return [og + Math.cos(a) * r, HB.CY + Math.sin(a) * r];
}
function aiGK(g, p, dt) {
  const B = S.ball, og = ownGoalX(p.team), s = p.team === 0 ? 1 : -1;
  let ty = HB.CY + (B.y - HB.CY) * 0.4;
  if (B.kind === 'shot' && B.from && B.from.team !== p.team && !B.owner) {
    p.react -= dt;
    if (p.react <= 0) { ty = p.aimY; p.dive = 0.3; }
    else ty = p.y;
  }
  ty = U.clamp(ty, HB.CY - HB.GW + 6, HB.CY + HB.GW - 6);
  const sp = p.dive > 0 ? 330 : 220;
  const d = ty - p.y; p.y += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
  p.x = og + s * (16 + Math.min(20, Math.abs(B.x - og) * 0.03));
  if (B.owner === p) {
    p.hold = (p.hold || 0) + dt;
    if (p.hold > 0.9) { const q = pickPass(p, 0, 0); if (q) { pass(g, p, q); p.hold = 0; } }
  }
}
function zoneClamp(p) {
  p.x = U.clamp(p.x, HB.L + 6, HB.R - 6); p.y = U.clamp(p.y, HB.T + 6, HB.B - 6);
  if (p.gk) return;
  for (const gx of [HB.L, HB.R]) {
    const d = U.dist(p.x, p.y, gx, HB.CY);
    if (d < HB.Z6 && !(p.jump > 0)) { const a = Math.atan2(p.y - HB.CY, p.x - gx); p.x = gx + Math.cos(a) * HB.Z6; p.y = HB.CY + Math.sin(a) * HB.Z6; }
  }
}
function separate() {
  for (let i = 0; i < S.pl.length; i++) for (let j = i + 1; j < S.pl.length; j++) {
    const a = S.pl[i], b = S.pl[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 22 && d > 0.01) { const o = (22 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; }
  }
}
function updBall(g, dt) {
  const B = S.ball;
  if (B.owner) { const p = B.owner; B.x = p.x + (p.fx || (p.team ? -1 : 1)) * 10; B.y = p.y + (p.fy || 0) * 10 - 4; B.z = 0; return; }
  const pbx = B.x; B.t += dt; B.x += B.vx * dt; B.y += B.vy * dt;
  if (B.kind !== 'shot' && (B.x < HB.L || B.x > HB.R)) { B.vx = -B.vx * 0.5; B.x = U.clamp(B.x, HB.L, HB.R); B.kind = 'loose'; }
  if (B.kind === 'loose') { B.vx *= Math.pow(0.3, dt); B.vy *= Math.pow(0.3, dt); B.z = Math.max(0, B.z - 40 * dt); }
  if (B.y < HB.T || B.y > HB.B) { B.vy = -B.vy * 0.5; B.y = U.clamp(B.y, HB.T, HB.B); if (B.kind === 'pass') B.kind = 'loose'; }
  if (B.kind === 'shot') {
    const gk = S.pl.find((q) => q.gk && q.team !== B.from.team), gx = goalX(B.from.team);
    if ((pbx - gk.x) * (B.x - gk.x) <= 0 && Math.abs(B.y - gk.y) < 26 + (gk.dive > 0 ? 14 : 0)) {
      const caught = Math.random() < 0.5;
      g.sfx.hit(); g.burst(B.x, B.y, '#fff', 10, 150, 0.3);
      flash(B.from.team === 0 ? '선방에 막혔다!' : '골키퍼 세이브!', B.from.team === 0 ? '#ff8a80' : '#80d8ff', 1.2);
      if (gk.team === 0) g.add(50, gk.x, gk.y - 30);
      if (caught) { B.owner = gk; gk.hold = 0; B.kind = null; S.possT = 0; }
      else { B.kind = 'loose'; B.vx = -B.vx * 0.35 + U.rand(-60, 60); B.vy = U.rand(-200, 200); }
      return;
    }
    if ((B.from.team === 0 && B.x >= gx) || (B.from.team === 1 && B.x <= gx)) {
      if (Math.abs(B.y - HB.CY) < HB.GW) scored(g, B.from.team, B.from);
      else { flash('골대 밖!', '#fff', 1); const gk2 = S.pl.find((q) => q.gk && q.team !== B.from.team); B.owner = gk2; gk2.hold = 0; B.kind = null; }
      return;
    }
  } else if (B.kind === 'pass') {
    for (const o of S.pl) {
      if (o.team === B.from.team || o.gk || o.stun > 0) continue;
      if (U.dist(o.x, o.y, B.x, B.y) < 18 && B.icept < 0.45) { B.owner = o; B.kind = null; S.possT = 0; g.sfx.pop(); flash(o.team === 0 ? '인터셉트!' : '패스 차단당함', o.team === 0 ? '#80d8ff' : '#ff8a80', 1); if (o.team === 0) g.add(30, o.x, o.y - 30); return; }
    }
    if (B.t > 1.4) B.kind = 'loose';
  }
  if (B.kind !== 'shot') for (const p of S.pl) {
    if (p.stun > 0 || (p === B.from && B.t < 0.25)) continue;
    if (U.dist(p.x, p.y, B.x, B.y) < 18) { if (p.gk && U.dist(p.x, p.y, ownGoalX(p.team), HB.CY) > HB.Z6) continue; B.owner = p; B.kind = null; p.hold = 0; if (B.from && p.team !== B.from.team) S.possT = 0; g.sfx.tone(380, 0.04, 'sine', 0.05); return; }
  }
  if (B.kind === 'loose' && Math.hypot(B.vx, B.vy) < 5) { B.vx = B.vy = 0; }
}
function scored(g, team, shooter) {
  S.sc[team]++;
  const B = S.ball; B.kind = null; B.vx = B.vy = 0;
  if (team === 0) { g.add(200, B.x, B.y); g.sfx.win(); g.burst(B.x, B.y, ['#2196f3', '#fff', '#ffeb3b'], 40, 300, 0.9); flash(shooter && shooter.jump > 0 ? '점프슛 골!!' : '골!', '#80d8ff', 1.6); }
  else { g.sfx.lose(); g.shake(5, 0.3); flash('실점…', '#ff8a80', 1.4); }
  S.pause = 1.6; S.after = () => kickoff(g, 1 - team);
}

/* ---------- 7m 던지기 ---------- */
function startPK(g, shooterTeam, shootout) {
  S.mode = 'pk';
  S.pk = { team: shooterTeam, phase: 'aim', t: 0, ax: 0, ay: 0, bx: 0, by: 0, kx: 0, ky: 0, kdir: null, result: null, shootout, tell: 0, aiT: U.rand(1.2, 2.2), target: null };
  if (shooterTeam === 1) { const tg = [U.rand(-0.85, 0.85), U.rand(-0.8, 0.8)]; S.pk.target = tg; S.pk.tell = Math.random() < 0.6 ? Math.sign(tg[0]) : -Math.sign(tg[0]); }
  hud(g);
}
const PK = { GX: 480, GY: 300, GWd: 300, GH: 200 };
function updPK(g, dt) {
  const k = S.pk; k.t += dt; S.msgT -= dt;
  if (k.phase === 'aim') {
    if (k.team === 0) {
      const sp = 1.6;
      if (g.left) k.ax -= sp * dt; if (g.right) k.ax += sp * dt; if (g.up) k.ay -= sp * dt; if (g.down) k.ay += sp * dt;
      if (g.mouse.moved) { k.ax = (g.mouse.x - PK.GX) / (PK.GWd / 2); k.ay = (g.mouse.y - PK.GY) / (PK.GH / 2); }
      k.ax = U.clamp(k.ax, -1.2, 1.2); k.ay = U.clamp(k.ay, -1.2, 1.2);
      k.wob = Math.sin(k.t * 5) * 0.08;
      if (g.pressed('a') || (g.mouse.clicked && k.t > 0.3)) {
        k.target = [k.ax + k.wob + U.rand(-0.06, 0.06), k.ay + Math.cos(k.t * 4) * 0.06];
        const guess = Math.random() < 0.45 ? k.target : [U.rand(-0.9, 0.9), U.rand(-0.8, 0.8)];
        k.kdir = [U.clamp(guess[0], -0.85, 0.85), U.clamp(guess[1], -0.75, 0.75)];
        k.phase = 'fly'; k.ft = 0; g.sfx.shoot();
      }
    } else {
      if (g.pressed('left')) k.kdir = [-0.65, k.kdir ? k.kdir[1] : 0];
      if (g.pressed('right')) k.kdir = [0.65, k.kdir ? k.kdir[1] : 0];
      if (g.pressed('up')) k.kdir = [k.kdir ? k.kdir[0] : 0, -0.55];
      if (g.pressed('down')) k.kdir = [k.kdir ? k.kdir[0] : 0, 0.55];
      if (k.t > k.aiT) { k.phase = 'fly'; k.ft = 0; g.sfx.shoot(); }
    }
  } else if (k.phase === 'fly') {
    k.ft += dt;
    if (k.team === 1) {
      if (g.pressed('left')) k.kdir = [-0.65, k.kdir ? k.kdir[1] : 0];
      if (g.pressed('right')) k.kdir = [0.65, k.kdir ? k.kdir[1] : 0];
      if (g.pressed('up')) k.kdir = [k.kdir ? k.kdir[0] : 0, -0.55];
      if (g.pressed('down')) k.kdir = [k.kdir ? k.kdir[0] : 0, 0.55];
    }
    const kd = k.kdir || [0, 0];
    k.kx = U.lerp(k.kx, kd[0], Math.min(1, dt * 9)); k.ky = U.lerp(k.ky, kd[1], Math.min(1, dt * 9));
    if (k.ft >= 0.42) {
      const [tx, ty] = k.target;
      const out = Math.abs(tx) > 1 || Math.abs(ty) > 1;
      const dx = (tx - k.kx) * PK.GWd / 2, dy = (ty - k.ky) * PK.GH / 2;
      const saved = !out && Math.hypot(dx, dy * 0.8) < 62;
      k.result = out ? 'out' : saved ? 'save' : 'goal';
      k.phase = 'res'; k.rt = 0;
      const goal = k.result === 'goal';
      if (goal) { g.sfx[k.team === 0 ? 'win' : 'lose'](); g.burst(PK.GX + tx * PK.GWd / 2, PK.GY + ty * PK.GH / 2, ['#fff', '#ffeb3b'], 30, 260, 0.7); }
      else { g.sfx.hit(); g.shake(5, 0.2); }
      flash(goal ? (k.team === 0 ? '골인!' : '실점…') : out ? '골대 밖!' : (k.team === 0 ? '막혔다!' : '선방!!'), goal === (k.team === 0) ? '#80d8ff' : '#ff8a80', 1.8);
      if (k.team === 0 && goal) g.add(200); if (k.team === 1 && !goal) g.add(150);
      if (!k.shootout && goal) S.sc[k.team]++;
      if (k.shootout) { S.so.k[k.team]++; if (goal) S.so.g[k.team]++; }
    }
  } else if (k.phase === 'res') {
    k.rt += dt;
    if (k.rt > 1.8) {
      if (!k.shootout) { S.mode = 'play'; if (k.result === 'goal') kickoff(g, 1 - k.team); else { const gk = S.pl.find((q) => q.gk && q.team !== k.team); for (const p of S.pl) zoneClamp(p); S.ball.owner = gk; gk.hold = 0; S.ball.kind = null; } return; }
      const so = S.so, [a, b] = so.g, [na, nb] = so.k;
      const done = (na >= 5 && nb >= 5 && a !== b && na === nb) || (na <= 5 && nb <= 5 && (a + (5 - na) < b || b + (5 - nb) < a));
      if (done) { S.sc[0] += a > b ? 1 : 0; S.sc[1] += b > a ? 1 : 0; return finish(g); }
      startPK(g, na > nb ? 1 : 0, true);
    }
  }
  hud(g);
}
function drawPK(g, c) {
  const k = S.pk;
  g.rect(0, 0, 960, 600, '#2e7d32');
  g.rect(0, 380, 960, 220, '#f9a825'); g.rect(0, 380, 960, 6, '#fff');
  c.fillStyle = 'rgba(255,255,255,.1)'; for (let x = 0; x < 960; x += 16) for (let y = 0; y < 180; y += 16) if (((x + y) / 16) % 2) c.fillRect(x, 200 + y, 8, 8);
  const L = PK.GX - PK.GWd / 2, T = PK.GY - PK.GH / 2;
  g.rect(L, T, PK.GWd, PK.GH, 'rgba(255,255,255,.12)');
  for (let x = L; x <= L + PK.GWd; x += 15) g.line(x, T, x, T + PK.GH, 'rgba(255,255,255,.25)', 1);
  for (let y = T; y <= T + PK.GH; y += 15) g.line(L, y, L + PK.GWd, y, 'rgba(255,255,255,.25)', 1);
  for (let i = 0; i < 10; i++) { g.rect(L - 10, T + i * 21, 10, 21, i % 2 ? '#e53935' : '#fff'); g.rect(L + PK.GWd, T + i * 21, 10, 21, i % 2 ? '#e53935' : '#fff'); g.rect(L - 10 + i * 32, T - 10, 32, 10, i % 2 ? '#e53935' : '#fff'); }
  const kx = PK.GX + k.kx * PK.GWd / 2, ky = PK.GY + 40 + k.ky * PK.GH / 2 * 0.8;
  c.save(); c.translate(kx, ky); c.rotate(k.kx * 0.9);
  g.rrect(-16, -40, 32, 56, 10, k.team === 0 ? '#e53935' : '#1e88e5'); g.line(-16, -30, -48, -60 + k.ky * 30, '#ffcc80', 9); g.line(16, -30, 48, -60 + k.ky * 30, '#ffcc80', 9);
  g.line(-8, 14, -14, 52, '#333', 9); g.line(8, 14, 14, 52, '#333', 9);
  g.emoji(k.team === 0 ? '😠' : '😎', 0, -56, 34);
  c.restore();
  if (k.phase === 'aim' && k.team === 0) {
    const ax = PK.GX + (k.ax + (k.wob || 0)) * PK.GWd / 2, ay = PK.GY + k.ay * PK.GH / 2;
    g.ring(ax, ay, 18, '#ffeb3b', 3); g.line(ax - 26, ay, ax + 26, ay, '#ffeb3b', 2); g.line(ax, ay - 26, ax, ay + 26, '#ffeb3b', 2);
    g.text('조준 후 Space / 클릭으로 슛!', 480, 560, 22, '#000');
  }
  if (k.team === 1 && k.phase !== 'res') {
    g.text('방향키로 다이브 방향 선택! (공 날아오기 전에)', 480, 560, 22, '#000');
    const sx = 480 + Math.sin(k.t * 3) * 6;
    g.emoji('🤾', sx, 470, 90);
    if (k.phase === 'aim' && k.t > k.aiT - 0.6) g.emoji(k.tell < 0 ? '👈' : '👉', sx + k.tell * 30, 410, 30);
  } else if (k.phase === 'aim') g.emoji('🤾', 480, 480, 90);
  if (k.phase === 'fly' || k.phase === 'res') {
    const p = k.phase === 'fly' ? Math.min(1, k.ft / 0.42) : 1;
    const bx = U.lerp(480, PK.GX + k.target[0] * PK.GWd / 2, p), by = U.lerp(470, PK.GY + k.target[1] * PK.GH / 2, p);
    g.emoji('🏐', bx, by, U.lerp(50, 24, p));
  }
  g.rrect(330, 10, 300, 60, 10, 'rgba(0,0,0,.55)');
  if (k.shootout) {
    g.text('7m 승부던지기', 480, 26, 16, '#ffeb3b');
    for (let t = 0; t < 2; t++) g.text(`${t ? '🔴' : '🔵'} ${S.so.g[t]}  (${S.so.k[t]}/5)`, 400 + t * 160, 52, 16, '#fff');
  } else { g.text('7m 던지기', 480, 26, 16, '#ffeb3b'); g.text(`${S.sc[0]} : ${S.sc[1]}  ${S.half}H ${U.fmtTime(Math.max(0, S.clock))}`, 480, 52, 16, '#fff'); }
  g.text(k.team === 0 ? '🔵 우리 팀 슈터' : '🔴 상대 슈터 — 당신이 골키퍼!', 480, 100, 22, '#fff');
  if (S.msgT > 0) g.text(S.msg, 480, 160, 40, S.msgC);
}

function drawCourt(g, c) {
  g.rect(0, 0, 960, 600, '#0d3b1e');
  g.rect(HB.L, HB.T, HB.R - HB.L, HB.B - HB.T, '#d98e43');
  for (let x = HB.L; x < HB.R; x += 40) g.rect(x, HB.T, 20, HB.B - HB.T, 'rgba(255,255,255,.04)');
  g.stroke(HB.L, HB.T, HB.R - HB.L, HB.B - HB.T, '#fff', 3);
  g.line(480, HB.T, 480, HB.B, '#fff', 2); g.ring(480, HB.CY, 40, '#fff', 2);
  for (const gx of [HB.L, HB.R]) {
    const s = gx === HB.L ? 1 : -1;
    c.fillStyle = 'rgba(30,136,229,.35)'; c.beginPath(); c.arc(gx, HB.CY, HB.Z6, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(gx, HB.CY, HB.Z6, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5); c.stroke();
    c.setLineDash([10, 10]); c.lineWidth = 2; c.beginPath(); c.arc(gx, HB.CY, HB.Z9, s > 0 ? -1.2 : Math.PI - 1.2 + 0, s > 0 ? 1.2 : Math.PI + 1.2); c.stroke(); c.setLineDash([]);
    g.line(gx + s * 160, HB.CY - 8, gx + s * 160, HB.CY + 8, '#fff', 3);
    g.rect(gx - (s > 0 ? 18 : 0), HB.CY - HB.GW, 18, HB.GW * 2, 'rgba(255,255,255,.3)');
    for (let y = HB.CY - HB.GW; y < HB.CY + HB.GW; y += 12) g.rect(gx - (s > 0 ? 6 : 0), y, 6, 6, y % 24 ? '#e53935' : '#fff');
  }
}
function drawPlayer(g, c, p) {
  const ctrl = S.pl[S.ctrl] === p;
  const col = p.team === 0 ? (p.gk ? '#00acc1' : '#1e88e5') : (p.gk ? '#fb8c00' : '#e53935');
  const jy = p.jump > 0 ? Math.sin((p.jump / 0.3) * Math.PI) * 14 : 0;
  g.circle(p.x + 2, p.y + 4, 11, 'rgba(0,0,0,.25)');
  if (ctrl) g.ring(p.x, p.y, 17, '#ffeb3b', 3);
  g.circle(p.x, p.y - jy, 11, col); g.ring(p.x, p.y - jy, 11, '#fff', 2);
  g.text(p.gk ? 'G' : String(p.idx + (p.team ? 5 : 1)), p.x, p.y - jy + 1, 11, '#fff');
  if (p.stun > 0) g.text('💫', p.x, p.y - 20, 14);
  if (p.dive > 0) g.ring(p.x, p.y, 26, 'rgba(255,255,255,.5)', 2);
}
