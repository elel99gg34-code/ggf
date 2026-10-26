'use strict';
let S;
const RX0 = 40, RX1 = 960, RY0 = 80, RY1 = 580, CR = 70, CX = 500, CY = 330, GL0 = 110, GL1 = 890, MOUTH = 44, PER = 60;
const FOES = [
  { n: '부산 펭귄스', c: '#f97316', s: 0.85 },
  { n: '서울 바이킹', c: '#a855f7', s: 0.95 },
  { n: '인천 샤크스', c: '#06b6d4', s: 1.05 },
  { n: '얼음왕국 블리자드', c: '#e11d48', s: 1.17 },
];
const ROUND = ['8강', '4강', '결승 1', '결승 2'];
const POS = [[0.62, 0.3], [0.62, 0.7], [0.36, 0.5]];
GAME({
  title: '아이스하키', w: 1000, h: 600, bg: '#0b1220', controls: 'dpad+ab', aLabel: '슛', bLabel: '패스/체크',
  help: '방향키/WASD: 스케이팅 (관성 주의!)\nSpace/Z: 짧게 = 리스트샷, 꾹 눌렀다 떼기 = 슬랩샷 · 퍽 없을 때 = 포크체크(스틱으로 뺏기)\nX/Shift: 퍽 있을 때 패스 · 없을 때 바디체크 돌진!\n3피리어드 · 동점이면 서든데스 연장 · 4경기 플레이오프 우승에 도전',
  init(g) {
    S = { round: 0, phase: 'intro', t: 2.2, m: null, total: [0, 0] };
    startGame(g);
  },
  update(g, dt) {
    const m = S.m;
    m.msgT -= dt;
    if (S.phase === 'intro' || S.phase === 'goal' || S.phase === 'break') {
      S.t -= dt;
      for (const p of m.P) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      if (S.t <= 0) { if (S.next) { const f = S.next; S.next = null; f(); } else S.phase = 'play'; }
      return;
    }
    if (S.phase === 'between') { if (g.pressed('a') || g.clickIn(400, 440, 200, 54)) { S.round++; startGame(g); } return; }
    play(g, dt);
    g.info = `${ROUND[S.round]} · ${FOES[S.round].n}`;
  },
  draw(g, c) { drawRink(g, c); },
});
function startGame(g) {
  const F = FOES[S.round];
  S.m = { sc: [0, 0], per: 1, t: PER, P: [], puck: { x: CX, y: CY, vx: 0, vy: 0, owner: null, last: 0, cd: 0 }, ctrl: null, charge: -1, msg: `${ROUND[S.round]} vs ${F.n}`, msgT: 2.2, sog: [0, 0], swCd: 0 };
  for (let t = 0; t < 2; t++) {
    for (let i = 0; i < 3; i++) S.m.P.push({ team: t, gk: false, i, x: 0, y: 0, vx: 0, vy: 0, face: 0, down: 0, chk: 0, cd: 0, dec: 0, str: t ? F.s : 1 });
    S.m.P.push({ team: t, gk: true, i: 3, x: 0, y: 0, vx: 0, vy: 0, face: 0, down: 0, chk: 0, cd: 0, dec: 0, str: t ? F.s : 1 });
  }
  faceoff();
  S.phase = 'intro'; S.t = 2.2;
}
function faceoff() {
  const m = S.m;
  for (const p of m.P) {
    const dir = p.team ? 1 : -1;
    if (p.gk) { p.x = p.team ? GL1 - 18 : GL0 + 18; p.y = CY; }
    else if (p.i === 0) { p.x = CX + dir * 22; p.y = CY; }
    else { p.x = CX + dir * (p.i === 1 ? 120 : 200); p.y = CY + (p.i === 1 ? -110 : 100); }
    p.vx = p.vy = 0; p.down = 0; p.chk = 0; p.face = p.team ? Math.PI : 0;
  }
  const k = m.puck; k.x = CX; k.y = CY; k.vx = k.vy = 0; k.owner = null; k.cd = 0;
  m.ctrl = m.P.find((p) => p.team === 0 && p.i === 0);
  m.charge = -1;
}
function say(s, t = 1.4) { S.m.msg = s; S.m.msgT = t; }
function nearest(team, x, y, excl) {
  let b = null, bd = 1e9;
  for (const p of S.m.P) if (p.team === team && !p.gk && p !== excl) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; b = p; } }
  return b;
}
function play(g, dt) {
  const m = S.m, k = m.puck;
  m.t -= dt; m.swCd -= dt;
  if (m.t <= 0) return periodEnd(g);
  const own = k.owner;
  if (own && own.team === 0 && !own.gk) m.ctrl = own;
  else if (!own || own.team === 1) {
    const n = nearest(0, k.x, k.y);
    if (m.swCd <= 0 && n !== m.ctrl && U.dist(n.x, n.y, k.x, k.y) + 50 < U.dist(m.ctrl.x, m.ctrl.y, k.x, k.y)) { m.ctrl = n; m.swCd = 0.6; }
  }
  const chase1 = nearest(1, k.x, k.y);
  let chase0 = nearest(0, k.x, k.y, m.ctrl);
  if (U.dist(m.ctrl.x, m.ctrl.y, k.x, k.y) < 200) chase0 = null;
  for (const p of m.P) {
    p.cd -= dt;
    if (p.down > 0) { p.down -= dt; p.vx *= Math.pow(0.2, dt); p.vy *= Math.pow(0.2, dt); }
    else if (p.chk > 0) { p.chk -= dt; checkHit(g, p); }
    else if (p === m.ctrl) human(g, p, dt);
    else if (p.gk) goalie(g, p, dt);
    else ai(g, p, dt, p.team ? chase1 : chase0);
    p.x += p.vx * dt; p.y += p.vy * dt;
    clampRink(p, 12, 0.3);
    if (Math.hypot(p.vx, p.vy) > 20) p.face = Math.atan2(p.vy, p.vx);
  }
  for (let i = 0; i < m.P.length; i++) for (let j = i + 1; j < m.P.length; j++) {
    const a = m.P[i], b = m.P[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 24 && d > 0.01) { const o = (24 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; }
  }
  puckPhys(g, dt);
}
function human(g, p, dt) {
  const m = S.m, k = m.puck;
  const ix = (g.right ? 1 : 0) - (g.left ? 1 : 0), iy = (g.down ? 1 : 0) - (g.up ? 1 : 0), il = Math.hypot(ix, iy);
  const acc = 520, max = k.owner === p ? 230 : 255;
  if (il) { p.vx += (ix / il) * acc * dt; p.vy += (iy / il) * acc * dt; }
  else { p.vx *= Math.pow(0.35, dt); p.vy *= Math.pow(0.35, dt); }
  const sp = Math.hypot(p.vx, p.vy); if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  if (il) p.face = Math.atan2(iy, ix);
  if (k.owner === p) {
    if (g.held('a')) { if (m.charge < 0) m.charge = 0; m.charge = Math.min(1, m.charge + dt * 1.3); }
    else if (m.charge >= 0) { shoot(g, p, m.charge, iy); m.charge = -1; }
    if (g.pressed('b')) { const t = bestPass(p, il ? Math.atan2(iy, ix) : p.face); if (t) passTo(g, p, t); }
    if (g.mouse.clicked) { const a = Math.atan2(g.mouse.y - p.y, g.mouse.x - p.x); if (g.mouse.x > GL1 - 150) shoot(g, p, 0.8, (g.mouse.y - CY) / MOUTH); else release(g, p, a, 520); }
  } else {
    m.charge = -1;
    if (g.pressed('b') || g.mouse.clicked) { p.chk = 0.28; const a = p.face; p.vx = Math.cos(a) * 430; p.vy = Math.sin(a) * 430; g.sfx.tone(160, 0.15, 'sawtooth', 0.04, 80); }
    if (g.pressed('a')) poke(g, p);
  }
}
function poke(g, p) {
  const k = S.m.puck, o = k.owner;
  const sx = p.x + Math.cos(p.face) * 22, sy = p.y + Math.sin(p.face) * 22;
  g.sfx.tone(700, 0.04, 'square', 0.04);
  if (o && o.team !== p.team && U.dist(sx, sy, k.x, k.y) < 26 && Math.random() < 0.6) { take(p); g.float(p.x, p.y - 26, '포크체크!', '#fde047', 16); }
  else if (!o && U.dist(sx, sy, k.x, k.y) < 30) take(p);
}
function checkHit(g, p) {
  for (const q of S.m.P) {
    if (q.team === p.team || q.down > 0 || q.gk) continue;
    if (U.dist(p.x, p.y, q.x, q.y) < 28) {
      p.chk = 0;
      const a = Math.atan2(q.y - p.y, q.x - p.x), pw = Math.hypot(p.vx, p.vy);
      q.vx = Math.cos(a) * pw * 0.9; q.vy = Math.sin(a) * pw * 0.9; q.down = 1.3 / Math.max(0.8, q.str);
      p.vx *= 0.2; p.vy *= 0.2;
      const k = S.m.puck;
      if (k.owner === q) { k.owner = null; k.vx = q.vx * 0.8 + U.rand(-80, 80); k.vy = q.vy * 0.8 + U.rand(-80, 80); k.cd = 0; q.cd = 0.8; }
      g.sfx.hit(); g.sfx.noise(0.15, 0.15); g.shake(7, 0.25); g.burst(q.x, q.y, ['#fff', '#bae6fd'], 18, 220);
      if (p.team === 0) { g.float(q.x, q.y - 30, '바디체크!', '#fde047', 20); g.add(20); }
      return;
    }
  }
}
function take(p) { const k = S.m.puck; k.owner = p; k.last = p.team; p.dec = 0.3 + Math.random() * 0.3; }
function release(g, p, a, sp) {
  const k = S.m.puck;
  k.owner = null; k.vx = Math.cos(a) * sp + p.vx * 0.3; k.vy = Math.sin(a) * sp + p.vy * 0.3; k.last = p.team; p.cd = 0.3; k.sh = false;
  g.sfx.tone(900, 0.04, 'square', 0.05);
}
function passTo(g, p, t) {
  const tx = t.x + t.vx * 0.35, ty = t.y + t.vy * 0.35, d = U.dist(p.x, p.y, tx, ty);
  const err = p.team ? (1.2 - p.str) * 0.2 : 0.02;
  release(g, p, Math.atan2(ty - p.y, tx - p.x) + U.rand(-err, err), Math.min(640, 260 + d * 1.1));
}
function bestPass(p, dir) {
  let b = null, bs = -1e9;
  for (const t of S.m.P) {
    if (t.team !== p.team || t === p || t.gk) continue;
    const a = Math.atan2(t.y - p.y, t.x - p.x), da = Math.abs(((a - dir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const s = -da * 150 - U.dist(p.x, p.y, t.x, t.y) * 0.2;
    if (s > bs) { bs = s; b = t; }
  }
  return b;
}
function shoot(g, p, pw, aim) {
  const m = S.m, gx = p.team ? GL0 : GL1, slap = pw > 0.35;
  const acc = p.team ? p.str : 1.05;
  const ty = CY + U.clamp(aim || 0, -1, 1) * MOUTH * 0.8 + U.rand(-1, 1) * (MOUTH * (1.25 - acc * 0.5)) * (slap ? 1 + pw * 0.4 : 0.8);
  const sp = slap ? 620 + pw * 480 : 560;
  release(g, p, Math.atan2(ty - p.y, gx - p.x), sp);
  m.puck.sh = true; m.sog[p.team]++;
  if (slap) { g.sfx.tone(120, 0.15, 'square', 0.1, 40); g.sfx.noise(0.1, 0.2); g.shake(5, 0.15); g.burst(p.x, p.y, '#e0f2fe', 14, 260); if (p.team === 0) g.float(p.x, p.y - 30, '슬랩샷!', '#67e8f9', 18); }
}
function ai(g, p, dt, chaser) {
  const m = S.m, k = m.puck, own = k.owner, dir = p.team ? -1 : 1, sp = 215 * (0.85 + p.str * 0.15);
  let tx, ty, fast = 1;
  if (own === p) {
    const gx = p.team ? GL0 : GL1, d = U.dist(p.x, p.y, gx, CY);
    p.dec -= dt;
    let th = 999; for (const o of m.P) if (o.team !== p.team && !o.gk) th = Math.min(th, U.dist(o.x, o.y, p.x, p.y));
    if (p.dec <= 0) {
      p.dec = 0.3 + Math.random() * 0.4;
      if (d < 300 && Math.random() < (d < 200 ? 0.55 : 0.22)) return shoot(g, p, Math.random() < 0.5 ? 0.2 : 0.5 + Math.random() * 0.5, U.rand(-1, 1));
      if (th < 55 && Math.random() < 0.5) { const t = bestPass(p, Math.atan2(CY - p.y, gx - p.x)); if (t) return passTo(g, p, t); }
    }
    tx = gx - dir * 120; ty = CY + Math.sin(g.time + p.i) * 90;
  } else if (p === chaser) {
    const tgt = own || k;
    tx = tgt.x + (own ? 0 : k.vx * 0.2); ty = tgt.y + (own ? 0 : k.vy * 0.2); fast = 1.1;
    if (own && own.team !== p.team && U.dist(p.x, p.y, own.x, own.y) < 70) {
      p.dec -= dt;
      if (p.dec <= 0) {
        p.dec = 0.7 + Math.random() * 0.8;
        if (Math.random() < 0.45 * p.str) { p.chk = 0.25; const a = Math.atan2(own.y - p.y, own.x - p.x); p.vx = Math.cos(a) * 400; p.vy = Math.sin(a) * 400; }
        else if (U.dist(p.x, p.y, own.x, own.y) < 34) { p.face = Math.atan2(own.y - p.y, own.x - p.x); if (Math.random() < 0.35 * p.str) poke(g, p); }
      }
    }
  } else {
    const att = own && own.team === p.team;
    const P = POS[p.i];
    let fx = att ? P[0] : P[0] - 0.3;
    fx = U.clamp(fx + ((p.team ? 1 - k.x / 1000 : k.x / 1000) - 0.5) * 0.4, 0.12, 0.85);
    tx = p.team ? 1000 - fx * 1000 : fx * 1000; ty = RY0 + P[1] * (RY1 - RY0) * 0.8 + (k.y - CY) * 0.25 + (RY1 - RY0) * 0.1;
  }
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d > 6) { p.vx += (dx / d) * 480 * dt; p.vy += (dy / d) * 480 * dt; }
  p.vx *= Math.pow(0.45, dt); p.vy *= Math.pow(0.45, dt);
  const v = Math.hypot(p.vx, p.vy), mx = sp * fast * (own === p ? 0.88 : 1);
  if (v > mx) { p.vx *= mx / v; p.vy *= mx / v; }
}
function goalie(g, p, dt) {
  const k = S.m.puck, gx = p.team ? GL1 - 16 : GL0 + 16;
  if (k.owner === p) {
    p.dec -= dt;
    if (p.dec <= -0.6) { const t = bestPass(p, p.team ? Math.PI : 0); if (t) passTo(g, p, t); }
    return;
  }
  let ty = CY + U.clamp((k.y - CY) * 0.5, -MOUTH + 6, MOUTH - 6);
  const towards = (p.team ? k.vx > 200 : k.vx < -200) && !k.owner;
  if (towards) { const t = (gx - k.x) / k.vx; if (t > 0 && t < 1) ty = U.clamp(k.y + k.vy * t, CY - MOUTH - 6, CY + MOUTH + 6); }
  const tx = gx + (p.team ? -1 : 1) * (Math.abs(k.x - gx) < 200 ? 14 : 4);
  const spd = 190 + p.str * 70;
  p.vx = U.clamp((tx - p.x) * 8, -spd, spd); p.vy = U.clamp((ty - p.y) * 9, -spd, spd);
}
function clampRink(o, r, bounce) {
  const minX = RX0 + r, maxX = RX1 - r, minY = RY0 + r, maxY = RY1 - r;
  // 모서리 원형
  for (const [cx, cy] of [[RX0 + CR, RY0 + CR], [RX1 - CR, RY0 + CR], [RX0 + CR, RY1 - CR], [RX1 - CR, RY1 - CR]]) {
    if ((o.x - cx) * (cx < CX ? 1 : -1) < 0 && (o.y - cy) * (cy < CY ? 1 : -1) < 0) {
      const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
      if (d > CR - r) {
        const nx = dx / d, ny = dy / d; o.x = cx + nx * (CR - r); o.y = cy + ny * (CR - r);
        const vn = o.vx * nx + o.vy * ny; if (vn > 0) { o.vx -= (1 + bounce) * vn * nx; o.vy -= (1 + bounce) * vn * ny; return true; }
      }
    }
  }
  let hit = false;
  if (o.x < minX) { o.x = minX; o.vx = Math.abs(o.vx) * bounce; hit = true; }
  if (o.x > maxX) { o.x = maxX; o.vx = -Math.abs(o.vx) * bounce; hit = true; }
  if (o.y < minY) { o.y = minY; o.vy = Math.abs(o.vy) * bounce; hit = true; }
  if (o.y > maxY) { o.y = maxY; o.vy = -Math.abs(o.vy) * bounce; hit = true; }
  return hit;
}
function puckPhys(g, dt) {
  const m = S.m, k = m.puck, o = k.owner;
  if (o) { k.x = o.x + Math.cos(o.face) * 18; k.y = o.y + Math.sin(o.face) * 18; k.vx = o.vx; k.vy = o.vy; return; }
  const steps = 3, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    const px = k.x;
    k.x += k.vx * h; k.y += k.vy * h;
    // 골대 (네트 뒤/옆 막기)
    for (const [gx, side] of [[GL0, 0], [GL1, 1]]) {
      const back = side ? gx + 26 : gx - 26, inY = Math.abs(k.y - CY) < MOUTH;
      const crossed = side ? px <= gx && k.x > gx : px >= gx && k.x < gx;
      if (crossed && inY) return goal(g, side ? 0 : 1);
      const inNet = side ? k.x > gx && k.x < back : k.x < gx && k.x > back;
      if (inNet && Math.abs(k.y - CY) < MOUTH + 6) { k.x = px; k.vx = -k.vx * 0.5; g.sfx.tone(1300, 0.05, 'square', 0.05); }
    }
    if (clampRink(k, 5, 0.75) && Math.hypot(k.vx, k.vy) > 150) g.sfx.tone(260, 0.04, 'triangle', 0.06);
  }
  const f = Math.pow(0.55, dt); k.vx *= f; k.vy *= f;
  k.cd -= dt;
  const fast = Math.hypot(k.vx, k.vy);
  for (const p of m.P) {
    if (p.down > 0 || p.cd > 0) continue;
    const sx = p.x + Math.cos(p.face) * 14, sy = p.y + Math.sin(p.face) * 14;
    const d = U.dist(sx, sy, k.x, k.y), reach = p.gk ? 26 : 20;
    if (d < reach) {
      if (p.gk && k.sh && fast > 300) {
        const save = U.clamp(0.95 - fast / 1500 + (p.str - 1) * 0.5 - (p.team ? 0.03 : 0), 0.22, 0.9);
        k.sh = false;
        if (Math.random() < save) {
          if (Math.random() < 0.5) { take(p); p.dec = 0; } else { k.vx = -k.vx * 0.4; k.vy = U.rand(-300, 300); }
          g.sfx.tone(400, 0.06, 'square', 0.07); g.float(p.x, p.y - 28, '세이브!', p.team ? '#fca5a5' : '#93c5fd', 18);
        }
        continue;
      }
      if (!p.gk && fast > 700 && Math.random() < 0.5) continue;
      take(p); break;
    }
  }
}
function goal(g, team) {
  const m = S.m;
  m.sc[team]++; S.total[team]++;
  m.puck.vx = m.puck.vy = 0; m.puck.owner = null;
  if (team === 0) { g.add(150, 500, 200); g.sfx.win(); g.shake(10, 0.4); say('🚨 골!!!', 2); g.burst(GL1, CY, ['#ef4444', '#fde047', '#fff'], 60, 380, 1.2, 5); }
  else { g.sfx.lose(); g.shake(5, 0.3); say('실점...', 2); g.burst(GL0, CY, '#f87171', 30, 250); }
  if (m.per > 3) return finish(g);
  S.phase = 'goal'; S.t = 2; S.next = () => { faceoff(); S.phase = 'play'; };
}
function periodEnd(g) {
  const m = S.m;
  if (m.per < 3 || (m.per === 3 && m.sc[0] === m.sc[1])) {
    m.per++; m.t = PER;
    say(m.per > 3 ? '서든데스 연장!' : `${m.per}피리어드`, 2);
    g.sfx.beep(600, 0.6);
    S.phase = 'break'; S.t = 2; S.next = () => { faceoff(); S.phase = 'play'; };
    return;
  }
  finish(g);
}
function finish(g) {
  const m = S.m, [a, b] = m.sc;
  S.phase = 'goal'; S.t = 2.2;
  if (a > b) {
    g.add(1000 * (S.round + 1));
    S.next = () => {
      if (S.round >= FOES.length - 1) return g.win(`플레이오프 우승! 통산 ${S.total[0]}골`);
      S.phase = 'between';
    };
    say(`승리! ${a} : ${b}`, 2.2);
  } else S.next = () => g.over(`${ROUND[S.round]} 탈락 · ${a} : ${b}`), say(a === b ? `무승부 ${a}:${b} — 탈락` : `패배 ${a} : ${b}`, 2.2);
}
function drawRink(g, c) {
  const m = S.m, F = FOES[S.round];
  g.rrect(RX0 - 8, RY0 - 8, RX1 - RX0 + 16, RY1 - RY0 + 16, CR + 8, '#cbd5e1');
  g.rrect(RX0, RY0, RX1 - RX0, RY1 - RY0, CR, '#eef6fb');
  for (let i = 0; i < 6; i++) g.line(RX0 + 60 + i * 160, RY0 + 10, RX0 + 20 + i * 160, RY1 - 10, 'rgba(148,163,184,.12)', 18);
  g.line(CX, RY0, CX, RY1, '#dc2626', 5);
  g.line(330, RY0, 330, RY1, '#2563eb', 5); g.line(670, RY0, 670, RY1, '#2563eb', 5);
  g.line(GL0, RY0 + 20, GL0, RY1 - 20, '#dc2626', 2); g.line(GL1, RY0 + 20, GL1, RY1 - 20, '#dc2626', 2);
  g.ring(CX, CY, 60, '#2563eb', 3); g.circle(CX, CY, 5, '#2563eb');
  for (const [x, y] of [[220, 210], [220, 450], [780, 210], [780, 450]]) { g.ring(x, y, 44, '#dc2626', 2); g.circle(x, y, 5, '#dc2626'); }
  for (const s of [0, 1]) {
    const gx = s ? GL1 : GL0, d = s ? 1 : -1;
    c.beginPath(); c.arc(gx, CY, 50, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2, s === 0); c.fillStyle = 'rgba(96,165,250,.35)'; c.fill();
    g.rect(Math.min(gx, gx + d * 26), CY - MOUTH, 26, MOUTH * 2, 'rgba(255,255,255,.7)');
    for (let i = 0; i < 6; i++) g.line(gx, CY - MOUTH + i * 17.6, gx + d * 26, CY - MOUTH + i * 17.6, 'rgba(0,0,0,.15)', 1);
    g.line(gx, CY - MOUTH, gx + d * 26, CY - MOUTH, '#dc2626', 4); g.line(gx, CY + MOUTH, gx + d * 26, CY + MOUTH, '#dc2626', 4); g.line(gx + d * 26, CY - MOUTH, gx + d * 26, CY + MOUTH, '#dc2626', 4);
  }
  if (m.ctrl && S.phase === 'play') g.ring(m.ctrl.x, m.ctrl.y, 20 + Math.sin(g.time * 8) * 2, '#0ea5e9', 3);
  for (const p of m.P) {
    const col = p.team ? F.c : '#1d4ed8';
    g.circle(p.x + 3, p.y + 4, 14, 'rgba(0,0,0,.15)');
    if (p.down > 0) { c.save(); c.translate(p.x, p.y); c.rotate(p.face + Math.PI / 2); g.rrect(-18, -9, 36, 18, 9, col, '#0f172a', 2); c.restore(); g.text('💫', p.x, p.y - 20, 14); continue; }
    const sx = p.x + Math.cos(p.face) * 22, sy = p.y + Math.sin(p.face) * 22;
    g.line(p.x + Math.cos(p.face + 0.6) * 8, p.y + Math.sin(p.face + 0.6) * 8, sx, sy, '#78350f', 4);
    g.circle(p.x, p.y, p.gk ? 16 : 13, col); g.ring(p.x, p.y, p.gk ? 16 : 13, p.chk > 0 ? '#fde047' : '#0f172a', p.chk > 0 ? 4 : 2);
    if (p.gk) g.rect(p.x - 10, p.y - 4, 20, 8, 'rgba(255,255,255,.6)');
    g.circle(p.x, p.y, 6, p.team ? '#fde68a' : '#bfdbfe');
  }
  const k = m.puck;
  g.circle(k.x, k.y, 6, '#0a0a0a'); g.ring(k.x, k.y, 6, '#525252', 1);
  // HUD
  g.rrect(250, 10, 500, 56, 12, 'rgba(15,23,42,.9)');
  g.rect(262, 22, 10, 32, '#1d4ed8'); g.text('우리 팀', 280, 38, 18, '#fff', 'left');
  g.text(`${m.sc[0]} : ${m.sc[1]}`, 500, 32, 28, '#fde047');
  g.text(m.per > 3 ? 'OT' : `${m.per}P  ${U.fmtTime(Math.max(0, m.t))}`, 500, 56, 13, '#94a3b8');
  g.text(F.n, 720, 38, 17, '#fff', 'right'); g.rect(728, 22, 10, 32, F.c);
  g.text(`슈팅 ${m.sog[0]} - ${m.sog[1]}`, 120, 40, 14, '#94a3b8');
  g.text(ROUND[S.round], 880, 40, 16, '#fde047');
  if (m.charge >= 0) { g.rrect(400, 586, 200, 10, 4, 'rgba(255,255,255,.2)'); g.rrect(400, 586, 200 * m.charge, 10, 4, m.charge > 0.35 ? '#ef4444' : '#38bdf8'); }
  if (m.msgT > 0) { g.rrect(330, 280, 340, 70, 14, 'rgba(15,23,42,.85)'); g.text(m.msg, 500, 315, 30, '#fde047'); }
  if (S.phase === 'between') {
    g.rrect(250, 220, 500, 290, 18, 'rgba(15,23,42,.95)', '#fde047', 3);
    g.text('🏒 다음 라운드 진출!', 500, 270, 30, '#fde047');
    const N = FOES[S.round + 1];
    g.text(`${ROUND[S.round + 1]} 상대: ${N.n}`, 500, 330, 22, '#fff');
    g.text(`전력 ${Math.round(N.s * 100)}`, 500, 370, 18, '#94a3b8');
    g.button(400, 440, 200, 54, '경기 시작 ▶', '#2563eb', 22);
  }
}
