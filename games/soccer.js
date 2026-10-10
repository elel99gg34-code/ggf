'use strict';
let S;
const L = 1050, HW = 680, GOALW = 110, Z = 1.3, HALF = 75;
const FORM = [[0.03, 0.5], [0.2, 0.13], [0.17, 0.38], [0.17, 0.62], [0.2, 0.87], [0.42, 0.14], [0.38, 0.4], [0.38, 0.6], [0.42, 0.86], [0.62, 0.38], [0.62, 0.62]];
const TEAMS = [
  { n: '우리 FC', c: '#2563eb', k: '#bfdbfe', s: 1.0 },
  { n: '부산 갈매기', c: '#f97316', k: '#fed7aa', s: 0.82 },
  { n: '대전 시티즌', c: '#9333ea', k: '#e9d5ff', s: 0.88 },
  { n: '인천 유나이티드', c: '#0f172a', k: '#94a3b8', s: 0.93 },
  { n: '광주 레인저스', c: '#eab308', k: '#713f12', s: 0.97 },
  { n: '수원 블루윙', c: '#06b6d4', k: '#164e63', s: 1.02 },
  { n: '울산 호랑이', c: '#dc2626', k: '#fecaca', s: 1.08 },
  { n: '전북 그린', c: '#16a34a', k: '#dcfce7', s: 1.14 },
];
GAME({
  title: '풀 축구', w: 960, h: 600, bg: '#14532d', controls: 'dpad+ab', aLabel: '패스', bLabel: '슛',
  help: '방향키/WASD: 이동 (파란 링 선수 조작)\nSpace/Z: 패스 · 공이 없을 땐 슬라이딩 태클\nX/Shift 꾹 눌렀다 떼기: 슛 (위/아래로 조준) · 공이 없을 땐 선수 전환\n마우스: 공 소유 중 클릭 = 그 지점으로 패스/슛\n8팀 리그 7라운드 (승 3점·무 1점) · 1위로 우승하라!',
  init(g) {
    S = { phase: 'table', round: 0, teams: TEAMS.map((t) => ({ ...t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 })), sched: makeSched(), results: [], m: null, cam: { x: 0, y: 0 } };
    g.info = '리그 1라운드';
  },
  update(g, dt) {
    if (S.phase === 'table') {
      if (g.pressed('a') || g.clickIn(380, 520, 200, 50)) startMatch(g);
      return;
    }
    upMatch(g, dt);
  },
  draw(g, c) {
    if (S.phase === 'table') return drawTable(g, c);
    drawMatch(g, c);
  },
});
function makeSched() {
  const arr = [0, 1, 2, 3, 4, 5, 6, 7], R = [];
  const rest = U.shuffle(arr.slice(1));
  for (let r = 0; r < 7; r++) {
    const a = [0, ...rest], pairs = [];
    for (let i = 0; i < 4; i++) pairs.push([a[i], a[7 - i]]);
    R.push(pairs);
    rest.unshift(rest.pop());
  }
  return R;
}
function poisson(l) { let k = 0, p = 1; const e = Math.exp(-l); do { k++; p *= Math.random(); } while (p > e); return k - 1; }
function record(a, b, ga, gb) {
  const A = S.teams[a], B = S.teams[b];
  A.GF += ga; A.GA += gb; B.GF += gb; B.GA += ga;
  if (ga > gb) { A.W++; A.P += 3; B.L++; } else if (ga < gb) { B.W++; B.P += 3; A.L++; } else { A.D++; B.D++; A.P++; B.P++; }
}
function standings() { return S.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.P - a.P || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF); }
function drawTable(g, c) {
  g.rect(0, 0, 960, 600, '#0f2a1c');
  for (let i = 0; i < 12; i++) g.rect(i * 80, 0, 40, 600, 'rgba(255,255,255,.02)');
  g.text('⚽ K-리그 시즌', 480, 40, 32, '#fde047');
  const st = standings();
  const hx = [120, 400, 460, 510, 560, 610, 680, 760];
  ['팀', '경기', '승', '무', '패', '득실', '승점'].forEach((h, i) => g.text(h, hx[i] + (i ? 0 : 100), 90, 16, '#86efac'));
  st.forEach((t, r) => {
    const y = 125 + r * 38, me = t.i === 0;
    g.rrect(90, y - 16, 720, 32, 6, me ? 'rgba(37,99,235,.45)' : 'rgba(255,255,255,.06)');
    g.text(r + 1 + '', 110, y, 18, r === 0 ? '#fde047' : '#fff');
    g.circle(145, y, 9, t.c); g.ring(145, y, 9, t.k, 2);
    g.text(t.n, 165, y, 17, '#fff', 'left');
    [t.W + t.D + t.L, t.W, t.D, t.L, (t.GF - t.GA > 0 ? '+' : '') + (t.GF - t.GA), t.P].forEach((v, i) => g.text(v + '', hx[i + 1], y, 17, i === 5 ? '#fde047' : '#e5e7eb'));
  });
  if (S.results.length) {
    g.text('지난 라운드 결과', 880, 110, 14, '#86efac');
    S.results.forEach((r, i) => g.text(r, 880, 135 + i * 22, 12, '#d1d5db'));
  }
  if (S.round < 7) {
    const opp = oppOf(S.round);
    g.text(`${S.round + 1}라운드 · 우리 FC vs ${TEAMS[opp].n} (전력 ${Math.round(TEAMS[opp].s * 100)})`, 480, 470, 20, '#fff');
    g.button(380, 520, 200, 50, '경기 시작 ▶', '#16a34a', 22);
  }
}
function oppOf(r) { for (const [a, b] of S.sched[r]) { if (a === 0) return b; if (b === 0) return a; } return 1; }
/* ---------------- 경기 ---------------- */
function startMatch(g) {
  const opp = oppOf(S.round);
  const m = (S.m = { opp, sc: [0, 0], t: 0, half: 1, P: [], ball: { x: L / 2, y: HW / 2, vx: 0, vy: 0, z: 0, vz: 0, owner: null, last: 0, gk: false }, ctrl: null, freeze: 0, after: null, msg: '', msgT: 0, charge: -1, swCd: 0, shots: [0, 0] });
  for (let t = 0; t < 2; t++) for (let i = 0; i < 11; i++) m.P.push({ team: t, role: i, num: i + 1, x: 0, y: 0, vx: 0, vy: 0, face: t ? Math.PI : 0, stun: 0, kcd: 0, slide: 0, dec: Math.random(), tk: 0.5, hold: 0, str: t ? TEAMS[opp].s : 1 });
  S.phase = 'match';
  kickoff(g, 0);
  g.info = `${S.round + 1}R vs ${TEAMS[opp].n}`;
}
function formX(p, fx) { return p.team === 0 ? fx * L : (1 - fx) * L; }
function kickoff(g, team) {
  const m = S.m;
  for (const p of m.P) {
    const f = FORM[p.role];
    p.x = formX(p, Math.min(f[0], 0.46)); p.y = f[1] * HW; p.vx = p.vy = 0; p.stun = p.slide = 0; p.face = p.team ? Math.PI : 0;
  }
  const k = m.P.find((p) => p.team === team && p.role === 9);
  k.x = L / 2 + (team ? 12 : -12); k.y = HW / 2;
  const b = m.ball; b.x = L / 2; b.y = HW / 2; b.vx = b.vy = b.z = b.vz = 0; b.owner = k; b.last = team;
  m.ctrl = team === 0 ? k : nearestOf(0, b.x, b.y);
  m.freeze = 1.2; m.charge = -1;
}
function nearestOf(team, x, y, excl, noGK = true) {
  let best = null, bd = 1e9;
  for (const p of S.m.P) {
    if (p.team !== team || p === excl || (noGK && p.role === 0)) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function say(text, t = 1.6) { S.m.msg = text; S.m.msgT = t; }
function sx(x) { return (x - S.cam.x) * Z; }
function sy(y) { return (y - S.cam.y) * Z; }
function upMatch(g, dt) {
  const m = S.m, b = m.ball;
  m.msgT -= dt;
  updCam(dt);
  if (m.freeze > 0) {
    m.freeze -= dt;
    if (m.freeze <= 0 && m.after) { const f = m.after; m.after = null; f(); }
    return;
  }
  m.t += dt;
  if (m.half === 1 && m.t >= HALF) { m.half = 2; say('전반 종료!', 2); g.sfx.beep(700, 0.5); m.freeze = 2; m.after = () => kickoff(g, 1); return; }
  if (m.t >= HALF * 2) return endMatch(g);
  m.swCd -= dt;
  // 조작 선수 선택
  const own = b.owner;
  if (own && own.team === 0 && own.role !== 0) m.ctrl = own;
  else if (!own || own.team === 1) {
    const n = nearestOf(0, b.x, b.y);
    if (g.pressed('b') && !own) { m.ctrl = nearestOf(0, b.x, b.y, m.ctrl); m.swCd = 0.6; g.sfx.click(); }
    else if (g.pressed('b') && own) { m.ctrl = n; m.swCd = 0.5; g.sfx.click(); }
    else if (m.swCd <= 0 && n !== m.ctrl && U.dist(n.x, n.y, b.x, b.y) + 60 < U.dist(m.ctrl.x, m.ctrl.y, b.x, b.y)) { m.ctrl = n; m.swCd = 0.8; }
  }
  // 추격자
  const chase = [null, null], chase2 = [null, null];
  for (let t = 0; t < 2; t++) {
    let ex = t === 0 ? m.ctrl : null;
    const tgt = b.owner || b;
    chase[t] = nearestOf(t, tgt.x + b.vx * 0.3, tgt.y + b.vy * 0.3, ex);
    if (t === 0 && U.dist(m.ctrl.x, m.ctrl.y, b.x, b.y) < 160) chase[0] = null;
    chase2[t] = t === 1 ? nearestOf(1, tgt.x, tgt.y, chase[1]) : null;
  }
  for (const p of m.P) {
    p.kcd -= dt;
    if (p.stun > 0) { p.stun -= dt; p.vx *= 0.9; p.vy *= 0.9; }
    else if (p.slide > 0) { p.slide -= dt; if (p.slide <= 0) p.stun = 0.35; }
    else if (p === m.ctrl) human(g, p, dt);
    else ai(g, p, dt, chase, chase2);
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = U.clamp(p.x, -30, L + 30); p.y = U.clamp(p.y, -25, HW + 25);
    if (Math.abs(p.vx) + Math.abs(p.vy) > 10 && p !== b.owner) p.face = Math.atan2(p.vy, p.vx);
    else if (p === b.owner && Math.hypot(p.vx, p.vy) > 10) p.face = Math.atan2(p.vy, p.vx);
  }
  // 분리
  for (let i = 0; i < m.P.length; i++) for (let j = i + 1; j < m.P.length; j++) {
    const a = m.P[i], c = m.P[j], dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy;
    if (d2 < 256 && d2 > 0.01) { const d = Math.sqrt(d2), o = (16 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; }
  }
  // 슬라이딩 태클 판정
  for (const p of m.P) if (p.slide > 0) {
    const o = b.owner;
    if (o && o.team !== p.team && U.dist(p.x, p.y, o.x, o.y) < 22) {
      p.slide = 0;
      if (Math.random() < 0.78) { o.stun = 0.8; take(p); g.sfx.hit(); g.shake(4, 0.15); g.burst(sx(o.x), sy(o.y), ['#fff', '#86efac'], 12, 160); g.float(sx(p.x), sy(p.y) - 20, '태클 성공!', '#fde047', 18); }
      else { p.stun = 0.7; g.sfx.drop(); }
    } else if (!o && b.z < 15 && U.dist(p.x, p.y, b.x, b.y) < 18) { p.slide = 0; take(p); }
  }
  ballPhys(g, dt);
}
function take(p) { const b = S.m.ball; b.owner = p; b.last = p.team; b.z = 0; b.vz = 0; p.hold = 0; p.dec = 0.3 + Math.random() * 0.3; }
function human(g, p, dt) {
  const m = S.m, b = m.ball;
  let ix = (g.right ? 1 : 0) - (g.left ? 1 : 0), iy = (g.down ? 1 : 0) - (g.up ? 1 : 0);
  const il = Math.hypot(ix, iy);
  const has = b.owner === p;
  const spd = has ? 150 : 168;
  const tvx = il ? (ix / il) * spd : 0, tvy = il ? (iy / il) * spd : 0;
  p.vx += (tvx - p.vx) * Math.min(1, dt * 10); p.vy += (tvy - p.vy) * Math.min(1, dt * 10);
  if (il) p.face = Math.atan2(iy, ix);
  if (has) {
    if (g.mouse.clicked) {
      const wx = g.mouse.x / Z + S.cam.x, wy = g.mouse.y / Z + S.cam.y;
      if (wx > L - 170 && Math.abs(wy - HW / 2) < 150) shoot(g, p, 0.75, (wy - HW / 2) / 60);
      else { const t = nearestOf(0, wx, wy, p); if (t && U.dist(t.x, t.y, wx, wy) < 70) passTo(g, p, t); else kickTo(g, p, wx, wy, 0); }
      return;
    }
    if (g.pressed('a')) { const t = pickPass(p, il ? Math.atan2(iy, ix) : p.face); if (t) passTo(g, p, t); else kickTo(g, p, p.x + Math.cos(p.face) * 200, p.y + Math.sin(p.face) * 200, 0); return; }
    if (g.held('b')) { if (m.charge < 0) m.charge = 0; m.charge = Math.min(1, m.charge + dt * 1.4); }
    else if (m.charge >= 0) { shoot(g, p, m.charge, iy); m.charge = -1; }
  } else {
    m.charge = -1;
    if (g.pressed('a') || g.mouse.clicked) {
      p.slide = 0.32; const a = p.face; p.vx = Math.cos(a) * 300; p.vy = Math.sin(a) * 300; g.sfx.tone(200, 0.15, 'triangle', 0.05, 90);
    }
  }
}
function pickPass(p, dir) {
  let best = null, bs = -1e9;
  for (const t of S.m.P) {
    if (t.team !== p.team || t === p) continue;
    const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
    if (d < 30 || d > 520) continue;
    let da = Math.abs(((Math.atan2(dy, dx) - dir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da > 1.0) continue;
    const s = -da * 200 - d * 0.35 + openness(t) * 0.5;
    if (s > bs) { bs = s; best = t; }
  }
  return best;
}
function openness(t) {
  let md = 999;
  for (const o of S.m.P) if (o.team !== t.team) md = Math.min(md, U.dist(o.x, o.y, t.x, t.y));
  return Math.min(md, 120);
}
function laneClear(p, t) {
  const ax = t.x - p.x, ay = t.y - p.y, l2 = ax * ax + ay * ay;
  for (const o of S.m.P) {
    if (o.team === p.team) continue;
    const u = U.clamp(((o.x - p.x) * ax + (o.y - p.y) * ay) / l2, 0, 1);
    if (U.dist(o.x, o.y, p.x + ax * u, p.y + ay * u) < 18 && u > 0.1) return false;
  }
  return true;
}
function bestAIPass(p) {
  const dir = p.team === 0 ? 1 : -1;
  let best = null, bs = -1e9;
  for (const t of S.m.P) {
    if (t.team !== p.team || t === p || t.role === 0) continue;
    const d = U.dist(p.x, p.y, t.x, t.y);
    if (d < 50 || d > 450) continue;
    let s = (t.x - p.x) * dir * 0.8 + openness(t) * 1.4 - Math.max(0, d - 280) * 0.6 + Math.random() * 40;
    if (!laneClear(p, t)) s -= 200;
    if (s > bs) { bs = s; best = t; }
  }
  return best;
}
function passTo(g, p, t) {
  const lead = 0.45;
  const tx = t.x + t.vx * lead, ty = t.y + t.vy * lead;
  kickTo(g, p, tx, ty, 0, t);
}
function kickTo(g, p, tx, ty, loft, recv) {
  const b = S.m.ball, d = U.dist(p.x, p.y, tx, ty);
  let a = Math.atan2(ty - p.y, tx - p.x);
  const err = p.team === 1 || p !== S.m.ctrl ? (1.15 - p.str) * 0.25 : 0.04;
  a += U.rand(-err, err);
  const sp = Math.min(520, d * 1.25 + 90);
  b.owner = null; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.vz = loft || (d > 320 ? 160 : 0); b.z = 1;
  b.last = p.team; b.gk = false; p.kcd = 0.35; p.face = a;
  g.sfx.tone(300, 0.06, 'triangle', 0.07);
}
function shoot(g, p, pw, aimY) {
  const m = S.m, b = m.ball, gx = p.team === 0 ? L + 10 : -10;
  const d = U.dist(p.x, p.y, gx, HW / 2);
  const acc = p === m.ctrl ? 1 : p.str;
  let ty = HW / 2 + U.clamp(aimY, -1, 1) * (GOALW * 0.38) + U.rand(-1, 1) * (20 + d * 0.08) * (1.3 - acc * 0.5) * (0.6 + pw * 0.6);
  const a = Math.atan2(ty - p.y, gx - p.x), sp = 420 + pw * 330;
  b.owner = null; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.vz = 60 + pw * 170 + Math.random() * 40; b.z = 2; b.last = p.team; b.gk = false;
  p.kcd = 0.4; m.shots[p.team]++;
  g.sfx.tone(160, 0.12, 'square', 0.09, 60); g.shake(3, 0.1);
  g.burst(sx(b.x), sy(b.y), '#fff', 8, 120);
}
function homePos(p) {
  const m = S.m, b = m.ball, f = FORM[p.role];
  const bfx = p.team === 0 ? b.x / L : 1 - b.x / L;
  const att = b.owner && b.owner.team === p.team;
  let fx = f[0] * 0.7 + bfx * 0.36 + (att ? 0.07 : -0.05) - 0.03;
  if (p.role >= 9 && att) fx += 0.06;
  if (p.role <= 4 && !att) fx = Math.min(fx, bfx - 0.02);
  fx = U.clamp(fx, 0.06, 0.9);
  const fy = f[1] * 0.72 + (b.y / HW) * 0.28;
  return [formX(p, fx), fy * HW];
}
function moveTo(p, tx, ty, sp, dt) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  const s = d < 6 ? 0 : Math.min(sp, d * 4);
  const vx = d ? (dx / d) * s : 0, vy = d ? (dy / d) * s : 0;
  p.vx += (vx - p.vx) * Math.min(1, dt * 7); p.vy += (vy - p.vy) * Math.min(1, dt * 7);
}
function ai(g, p, dt, chase, chase2) {
  const m = S.m, b = m.ball, own = b.owner, sp = 140 * (0.88 + p.str * 0.12);
  if (p.role === 0) return gkAI(g, p, dt);
  if (own === p) return carrier(g, p, dt);
  if (!own) {
    if (p === chase[p.team] || (p.team === 1 && p === chase2[1] && U.dist(p.x, p.y, b.x, b.y) < 140)) return moveTo(p, b.x + b.vx * 0.25, b.y + b.vy * 0.25, sp * 1.12, dt);
  } else if (own.team !== p.team) {
    if (p === chase[p.team]) {
      moveTo(p, own.x + own.vx * 0.15, own.y + own.vy * 0.15, sp * 1.08, dt);
      if (U.dist(p.x, p.y, own.x, own.y) < 19) {
        p.tk -= dt;
        if (p.tk <= 0) {
          p.tk = 0.55 + Math.random() * 0.7;
          const ch = (own === m.ctrl ? 0.32 : 0.42) * (p.str / own.str);
          if (Math.random() < ch) { take(p); own.stun = 0.5; g.sfx.hit(); if (p.team === 1) g.float(sx(own.x), sy(own.y) - 20, '뺏겼다!', '#f87171', 16); }
          else { p.stun = 0.3; }
        }
      }
      return;
    }
    if (p === chase2[p.team]) {
      const gx = p.team === 0 ? 0 : L;
      return moveTo(p, (own.x * 2 + gx) / 3, (own.y * 2 + HW / 2) / 3, sp, dt);
    }
  }
  const [hx, hy] = homePos(p);
  moveTo(p, hx, hy, sp * 0.85, dt);
}
function carrier(g, p, dt) {
  const b = S.m.ball, gx = p.team === 0 ? L : 0, gy = HW / 2, dir = p.team === 0 ? 1 : -1;
  const dGoal = U.dist(p.x, p.y, gx, gy);
  let th = null, td = 999;
  for (const o of S.m.P) if (o.team !== p.team) { const d = U.dist(o.x, o.y, p.x, p.y); if (d < td) { td = d; th = o; } }
  p.dec -= dt;
  if (p.dec <= 0) {
    p.dec = 0.25 + Math.random() * 0.35;
    if (dGoal < 280 && Math.random() < (dGoal < 180 ? 0.65 : 0.25)) return shoot(g, p, 0.55 + Math.random() * 0.45, U.rand(-1, 1));
    if ((td < 42 && Math.random() < 0.6) || Math.random() < 0.13) { const t = bestAIPass(p); if (t) return passTo(g, p, t); }
  }
  let a = Math.atan2(gy - p.y, gx - p.x);
  if (th && td < 80) { const aw = Math.atan2(p.y - th.y, p.x - th.x); a = Math.atan2(Math.sin(a) * 1.5 + Math.sin(aw), Math.cos(a) * 1.5 + Math.cos(aw)); }
  moveTo(p, p.x + Math.cos(a) * 100, p.y + Math.sin(a) * 100, 128 * (0.9 + p.str * 0.1), dt);
  if (Math.abs(p.y - gy) > HW * 0.42) p.vy -= Math.sign(p.y - gy) * 40 * dt;
  void dir;
}
function gkAI(g, p, dt) {
  const m = S.m, b = m.ball, gx = p.team === 0 ? 0 : L, dir = p.team === 0 ? 1 : -1;
  if (b.owner === p) {
    p.hold += dt;
    moveTo(p, gx + dir * 30, HW / 2, 60, dt);
    if (p.hold > 1.1) { const t = bestAIPass(p) || nearestOf(p.team, L / 2, HW / 2); passTo(g, p, t); }
    return;
  }
  const bx = b.x, by = b.y, near = Math.abs(bx - gx) < 260;
  let ty = HW / 2 + U.clamp((by - HW / 2) * 0.45, -GOALW / 2 + 6, GOALW / 2 - 6), tx = gx + dir * (near ? 22 : 14);
  const free = !b.owner, incoming = free && Math.sign(b.vx) === -dir && Math.abs(b.vx) > 120;
  if (incoming && Math.abs(bx - gx) < 260) {
    const t = (gx + dir * 18 - bx) / b.vx;
    if (t > 0) ty = U.clamp(by + b.vy * t, HW / 2 - GOALW / 2 - 12, HW / 2 + GOALW / 2 + 12);
  }
  if (free && U.dist(p.x, p.y, bx, by) < 90 && Math.abs(bx - gx) < 140 && !incoming) { tx = bx; ty = by; }
  moveTo(p, tx, ty, 150 + p.str * 60, dt);
  if (free && !b.gk && b.z < 50 && U.dist(p.x, p.y, bx, by) < 24) {
    b.gk = true;
    const spd = Math.hypot(b.vx, b.vy);
    const ch = U.clamp(1.15 - spd / 900 + (p.str - 1) * 0.6 - (p.team === 0 ? 0 : 0.03), 0.3, 0.97);
    if (Math.random() < ch) { take(p); g.sfx.drop(); if (spd > 350) g.float(sx(p.x), sy(p.y) - 24, '선방!', '#93c5fd', 18); }
    else { b.vx = -b.vx * 0.35 + U.rand(-60, 60); b.vy = U.rand(-200, 200); b.vz = 120; g.sfx.bounce(); g.float(sx(p.x), sy(p.y) - 24, '쳐냈다!', '#fde047', 16); }
  }
}
function ballPhys(g, dt) {
  const m = S.m, b = m.ball, o = b.owner;
  if (o) {
    b.x = o.x + Math.cos(o.face) * 11; b.y = o.y + Math.sin(o.face) * 11; b.z = 0; b.vx = o.vx; b.vy = o.vy;
  } else {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.z > 0 || b.vz > 0) { b.vz -= 700 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = Math.abs(b.vz) > 60 ? -b.vz * 0.4 : 0; } }
    const k = b.z > 2 ? 0.25 : 1.1;
    const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
    for (const p of m.P) {
      if (p.kcd > 0 || p.stun > 0 || b.z > (p.role === 0 ? 45 : 14)) continue;
      if (p.role === 0 && !b.gk && Math.hypot(b.vx, b.vy) > 260) continue;
      if (U.dist(p.x, p.y, b.x, b.y) < 15) { take(p); break; }
    }
  }
  // 골/아웃
  const inGoal = Math.abs(b.y - HW / 2) < GOALW / 2;
  if (b.x > L || b.x < 0) {
    const side = b.x > L ? 0 : 1; // side = 득점 팀 후보
    if (inGoal && b.z < 40) return goal(g, side);
    const defend = 1 - side;
    if (b.last === side) restart(g, defend, side === 0 ? L - 60 : 60, HW / 2, true);
    else restart(g, side, side === 0 ? L - 2 : 2, b.y < HW / 2 ? 2 : HW - 2);
    return;
  }
  if (b.y < 0 || b.y > HW) restart(g, 1 - b.last, U.clamp(b.x, 10, L - 10), b.y < 0 ? 0 : HW);
}
function restart(g, team, x, y, gk) {
  const m = S.m, b = m.ball;
  const p = gk ? m.P.find((q) => q.team === team && q.role === 0) : nearestOf(team, x, y);
  p.x = x; p.y = y; p.vx = p.vy = 0;
  b.vx = b.vy = b.vz = b.z = 0; b.x = x; b.y = y;
  take(p); p.face = Math.atan2(HW / 2 - y, L / 2 - x);
  p.dec = 0.6; p.hold = 0.3;
  if (team === 0 && !gk) m.ctrl = p;
  m.freeze = 0.6; g.sfx.beep(900, 0.12);
  say(gk ? '골킥' : y <= 0 || y >= HW ? (x <= 2 || x >= L - 2 ? '코너킥' : '스로인') : '');
}
function goal(g, team) {
  const m = S.m;
  m.sc[team]++;
  m.ball.owner = null; m.ball.vx *= 0.1; m.ball.vy *= 0.1;
  if (team === 0) { g.add(100, 480, 200); g.sfx.win(); g.shake(10, 0.5); say('⚽ 골!!! GOOOAL!', 2.2); g.burst(480, 300, ['#fde047', '#3b82f6', '#fff'], 70, 420, 1.2, 5); }
  else { g.sfx.lose(); g.shake(6, 0.3); say(`실점... ${TEAMS[m.opp].n} 득점`, 2.2); }
  m.freeze = 2.2; m.after = () => kickoff(g, 1 - team);
}
function endMatch(g) {
  const m = S.m, [a, b] = m.sc;
  record(0, m.opp, a, b);
  S.results = [`우리 FC ${a} : ${b} ${TEAMS[m.opp].n}`];
  for (const [x, y] of S.sched[S.round]) {
    if (x === 0 || y === 0) continue;
    const sa = TEAMS[x].s, sb = TEAMS[y].s;
    const ga = poisson(1.35 * Math.pow(sa / sb, 1.6)), gb = poisson(1.35 * Math.pow(sb / sa, 1.6));
    record(x, y, ga, gb);
    S.results.push(`${TEAMS[x].n} ${ga} : ${gb} ${TEAMS[y].n}`);
  }
  if (a > b) { g.add(300); g.sfx.win(); } else if (a === b) g.add(100); else g.sfx.lose();
  S.round++;
  S.phase = 'table'; S.m = null;
  if (S.round >= 7) {
    const rank = standings().findIndex((t) => t.i === 0) + 1;
    g.add([2000, 1000, 500, 200, 0, 0, 0, 0][rank - 1]);
    const me = S.teams[0];
    const msg = `최종 ${rank}위 · ${me.W}승 ${me.D}무 ${me.L}패 · 승점 ${me.P}`;
    g.later(() => (rank === 1 ? g.win('🏆 리그 우승! ' + msg) : g.over(msg)), 1.2);
  }
  g.info = `리그 ${Math.min(7, S.round + 1)}라운드`;
}
function updCam(dt) {
  const b = S.m.ball, vw = 960 / Z, vh = 600 / Z;
  const tx = U.clamp(b.x - vw / 2, -50, L + 50 - vw), ty = U.clamp(b.y - vh / 2, -40, HW + 40 - vh);
  S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 5); S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 5);
}
function drawPitch(g, c) {
  g.rect(-100, -100, L + 200, HW + 200, '#166534');
  for (let i = 0; i < 14; i++) g.rect(i * (L / 14), 0, L / 28, HW, 'rgba(255,255,255,.05)');
  const W = 'rgba(255,255,255,.85)';
  g.stroke(0, 0, L, HW, W, 3);
  g.line(L / 2, 0, L / 2, HW, W, 3);
  g.ring(L / 2, HW / 2, 80, W, 3); g.circle(L / 2, HW / 2, 4, W);
  for (const s of [0, 1]) {
    const x0 = s ? L - 160 : 0, x1 = s ? L - 55 : 0;
    g.stroke(x0, HW / 2 - 200, 160, 400, W, 3);
    g.stroke(x1, HW / 2 - 90, 55, 180, W, 3);
    g.circle(s ? L - 110 : 110, HW / 2, 4, W);
    c.beginPath(); c.strokeStyle = W; c.lineWidth = 3;
    c.arc(s ? L - 110 : 110, HW / 2, 80, s ? Math.PI * 0.72 : -Math.PI * 0.28, s ? Math.PI * 1.28 : Math.PI * 0.28); c.stroke();
    const gx = s ? L : -24;
    g.rect(gx, HW / 2 - GOALW / 2, 24, GOALW, 'rgba(255,255,255,.25)');
    for (let k = 0; k < 6; k++) g.line(gx + k * 4.8, HW / 2 - GOALW / 2, gx + k * 4.8, HW / 2 + GOALW / 2, 'rgba(255,255,255,.35)', 1);
    g.stroke(gx, HW / 2 - GOALW / 2, 24, GOALW, '#fff', 4);
  }
}
function drawMatch(g, c) {
  const m = S.m, b = m.ball;
  c.save(); c.scale(Z, Z); c.translate(-S.cam.x, -S.cam.y);
  drawPitch(g, c);
  for (const p of m.P) g.circle(p.x + 2, p.y + 4, 9, 'rgba(0,0,0,.25)');
  const ctrl = m.ctrl;
  if (ctrl) { g.ring(ctrl.x, ctrl.y, 15 + Math.sin(g.time * 8) * 2, '#38bdf8', 3); g.poly([[ctrl.x, ctrl.y - 26], [ctrl.x - 6, ctrl.y - 34], [ctrl.x + 6, ctrl.y - 34]], '#38bdf8'); }
  for (const p of m.P) {
    const T = TEAMS[p.team ? m.opp : 0];
    const col = p.role === 0 ? (p.team ? '#facc15' : '#22c55e') : T.c;
    if (p.slide > 0 || p.stun > 0) { c.save(); c.translate(p.x, p.y); c.rotate(p.face); g.rrect(-12, -6, 24, 12, 6, col, T.k, 2); c.restore(); }
    else {
      g.circle(p.x, p.y, 9, col); g.ring(p.x, p.y, 9, T.k, 2);
      g.circle(p.x + Math.cos(p.face) * 5, p.y + Math.sin(p.face) * 5, 3.5, '#f5d0a9');
    }
    g.text(p.num + '', p.x, p.y - 15, 9, '#fff');
  }
  // 공
  g.circle(b.x + b.z * 0.3, b.y + b.z * 0.4 + 2, 4, 'rgba(0,0,0,.35)');
  g.circle(b.x, b.y - b.z * 0.5, 4.5 + b.z * 0.02, '#fff'); g.ring(b.x, b.y - b.z * 0.5, 4.5 + b.z * 0.02, '#111', 1);
  c.restore();
  // HUD
  const H = TEAMS[0], A = TEAMS[m.opp];
  g.rrect(10, 10, 350, 40, 8, 'rgba(0,0,0,.6)');
  g.rect(18, 20, 8, 20, H.c); g.text('우리 FC', 32, 30, 16, '#fff', 'left');
  g.text(`${m.sc[0]} : ${m.sc[1]}`, 185, 30, 22, '#fde047');
  g.text(A.n, 340, 30, 15, '#fff', 'right'); g.rect(344, 20, 8, 20, A.c);
  const min = Math.min(90, Math.floor((m.t / (HALF * 2)) * 90));
  g.rrect(370, 10, 90, 40, 8, 'rgba(0,0,0,.6)'); g.text(`${min}'`, 415, 30, 20, '#fff');
  g.text(m.half === 1 ? '전반' : '후반', 480, 30, 14, '#d1fae5', 'left');
  if (m.charge >= 0) {
    g.rrect(380, 560, 200, 18, 6, 'rgba(0,0,0,.6)');
    g.rrect(382, 562, 196 * m.charge, 14, 5, U.hsl(120 - m.charge * 120, 90, 55));
    g.text('슛 파워', 480, 545, 14, '#fff');
  }
  // 미니맵
  const mx = 960 - 175, my = 600 - 118, ms = 165 / L;
  g.rrect(mx - 5, my - 5, 175, 113, 6, 'rgba(0,0,0,.55)');
  g.stroke(mx, my, L * ms, HW * ms, 'rgba(255,255,255,.5)', 1);
  g.line(mx + (L / 2) * ms, my, mx + (L / 2) * ms, my + HW * ms, 'rgba(255,255,255,.4)', 1);
  for (const p of m.P) g.circle(mx + p.x * ms, my + p.y * ms, p === ctrl ? 3.5 : 2.5, p === ctrl ? '#38bdf8' : TEAMS[p.team ? m.opp : 0].c);
  g.circle(mx + b.x * ms, my + b.y * ms, 2.5, '#fff');
  if (m.msgT > 0 && m.msg) {
    g.rrect(280, 250, 400, 70, 14, 'rgba(0,0,0,.6)');
    g.text(m.msg, 480, 285, 30, '#fde047');
  }
  if (m.freeze > 0 && m.t === 0 && m.half === 1) g.text('킥오프!', 480, 200, 34, '#fff');
}
