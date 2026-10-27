'use strict';
let S;
const PX = 10, FY = 64, FW = 53.3, MID = 26.65, VIEWY = 96;
const OPLAYS = [
  { k: 'run', n: '러닝', d: 'RB에게 핸드오프 · 직접 달린다' },
  { k: 'short', n: '숏패스', d: '슬랜트·아웃·훅 · 짧고 확실하게' },
  { k: 'long', n: '롱패스', d: '고·포스트 · 한 방의 롱패스' },
  { k: 'screen', n: '스크린', d: 'RB 스윙패스 · 블로커 앞장' },
];
const DPLAYS = [
  { k: 'rund', n: '런 수비', d: 'LB가 라인으로 돌진' },
  { k: 'passd', n: '패스 수비', d: '커버 강화 · 러시 약화' },
  { k: 'blitz', n: '블리츠', d: 'LB까지 QB 압박! 커버는 약함' },
];
const SPD = { QB: 7, RB: 8.6, WR1: 8.7, WR2: 8.7, TE: 7.8, OL1: 5.5, OL2: 5.5, DL1: 6.6, DL2: 6.6, LB1: 7.5, LB2: 7.5, CB1: 8.4, CB2: 8.4, S: 8.1 };
GAME({
  title: '미식축구', w: 960, h: 600, bg: '#0b1a10', controls: 'dpad+ab', aLabel: '패스/스프린트', bLabel: '저크/전환',
  help: '플레이 선택: 1~4 (4번째 다운엔 5 펀트 · 6 필드골) 또는 클릭\n[공격] 패스: 1~4로 리시버 지정 · Space = 가장 빈 리시버 · 리시버 클릭도 가능\n볼 캐리어: 방향키 이동 · Space 꾹 = 스프린트 · X = 저크(태클 회피)\n[수비] 방향키로 수비수 조작, 닿으면 태클 · X = 공에 가까운 선수로 전환\n4쿼터 · 터치다운 7점 · 필드골 3점 · 이기면 승리!',
  init(g) {
    S = { sc: [0, 0], q: 1, clock: 300, O: 0, los: 35, fd: 45, down: 1, phase: 'call', P: [], ball: null, pl: null, msg: '', msgT: 0, hc: null, stam: 1, cam: 20, kick: null, stats: { yds: 0, td: 0, sacks: 0, ints: 0 } };
    say('킥오프! 우리 공격 · 자기 진영 25야드', '#fde047', 2);
  },
  update(g, dt) {
    S.msgT -= dt;
    if (S.phase === 'call') return callUpd(g);
    if (S.phase === 'pre') { S.t -= dt; camUpd(dt); if (S.t <= 0) { S.phase = 'live'; g.sfx.beep(500, 0.08); } return; }
    if (S.phase === 'live') return live(g, dt);
    if (S.phase === 'kick') return kickUpd(g, dt);
    if (S.phase === 'dead') {
      S.t -= dt;
      for (const p of S.P) { p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * dt; p.y += p.vy * dt; }
      if (S.ball && S.ball.state === 'air') ballUpd(g, dt);
      if (S.t <= 0) { const f = S.after; S.after = null; f && f(); }
    }
  },
  draw(g, c) { draw(g, c); },
});
function say(m, c = '#fde047', t = 1.6) { S.msg = m; S.msgC = c; S.msgT = t; }
function dirOf(team) { return team === 0 ? 1 : -1; }
function goalX(team) { return team === 0 ? 110 : 10; }
function toGo() { return Math.round(Math.abs(S.fd - S.los)); }
function ydLine(x) { const v = Math.round(x - 10); return v <= 50 ? v : 100 - v; }
/* ---------------- 플레이 선택 ---------------- */
function options() {
  if (S.O === 0) { const o = OPLAYS.slice(); if (S.down === 4) o.push({ k: 'punt', n: '펀트', d: '공을 멀리 차서 넘긴다' }, { k: 'fg', n: '필드골', d: `${Math.round(110 - S.los + 17)}야드 킥 · 3점` }); return o; }
  return DPLAYS;
}
function callUpd(g) {
  const ops = options();
  let pick = -1;
  for (let i = 0; i < ops.length; i++) { if (g.keyp('Digit' + (i + 1))) pick = i; const [x, y, w, h] = btnRect(i, ops.length); if (g.clickIn(x, y, w, h)) pick = i; }
  if (pick < 0) return;
  g.sfx.click();
  const o = ops[pick];
  if (S.O === 0) {
    if (o.k === 'punt') return punt(g, 0);
    if (o.k === 'fg') { S.phase = 'kick'; S.kick = { a: 0, d: 1, t: 0, dist: Math.round(110 - S.los + 17), fly: -1 }; return; }
    setup(g, o.k, cpuDef());
  } else {
    const c = cpuCall();
    if (c === 'punt') return punt(g, 1);
    if (c === 'fg') return cpuFG(g);
    setup(g, c, o.k);
  }
}
function btnRect(i, n) { const w = 200, h = 64, gap = 14, tot = n > 3 ? 3 : n, row = Math.floor(i / 3), col = i % 3, x0 = 480 - (tot * w + (tot - 1) * gap) / 2; return [x0 + col * (w + gap), 330 + row * (h + gap), w, h]; }
function cpuDef() {
  const tg = toGo(), r = Math.random();
  if (r < 0.2) return 'blitz';
  if (S.down >= 3 && tg > 5) return 'passd';
  if (tg <= 3) return 'rund';
  return r < 0.6 ? 'passd' : 'rund';
}
function cpuCall() {
  const tg = toGo(), toGoal = S.los - 10;
  if (S.down === 4) {
    if (toGoal <= 33) return 'fg';
    if (tg <= 2 && toGoal < 55) return Math.random() < 0.5 ? 'run' : 'short';
    return 'punt';
  }
  const r = Math.random();
  if (tg >= 8) return r < 0.45 ? 'long' : r < 0.85 ? 'short' : 'screen';
  if (tg <= 3) return r < 0.6 ? 'run' : 'short';
  return r < 0.4 ? 'run' : r < 0.75 ? 'short' : r < 0.9 ? 'long' : 'screen';
}
/* ---------------- 셋업 ---------------- */
function mk(team, role, x, y) { return { team, role, x, y, vx: 0, vy: 0, route: null, ri: 0, stun: 0, eng: null, engT: 0, jk: 0, jcd: 0, mark: null, dive: 0 }; }
function setup(g, play, call) {
  const O = S.O, D = 1 - O, d = dirOf(O), L = S.los;
  S.P = [];
  const add = (t, r, rx, y) => { const p = mk(t, r, L + rx * d, y); S.P.push(p); return p; };
  const qb = add(O, 'QB', -3, MID), rb = add(O, 'RB', -6, MID);
  const w1 = add(O, 'WR1', -0.6, MID - 20), w2 = add(O, 'WR2', -0.6, MID + 19), te = add(O, 'TE', -0.6, MID + 7);
  add(O, 'OL1', -0.7, MID - 2), add(O, 'OL2', -0.7, MID + 2);
  add(D, 'DL1', 1, MID - 2.5), add(D, 'DL2', 1, MID + 2.5);
  const lb1 = add(D, 'LB1', 5, MID - 6), lb2 = add(D, 'LB2', 5, MID + 6);
  const cb1 = add(D, 'CB1', 6, MID - 20), cb2 = add(D, 'CB2', 6, MID + 19), sf = add(D, 'S', 14, MID);
  cb1.mark = w1; cb2.mark = w2; lb1.mark = te; lb2.mark = rb; sf.mark = null;
  const inw = (p) => (p.y < MID ? 1 : -1);
  const R = (p, pts) => { p.route = pts.map(([fx, fy]) => [p.x + fx * d, p.y + fy * inw(p)]); };
  if (play === 'short') { R(w1, [[5, 0], [11, 6]]); R(w2, [[6, 0], [7, -9]]); R(te, [[6, 0], [5, 0]]); R(rb, [[2, -1], [4, -9]]); }
  else if (play === 'long') { R(w1, [[32, 0]]); R(w2, [[12, 0], [32, 10]]); R(te, [[22, 0]]); R(rb, [[1, 3], [5, 5]]); }
  else if (play === 'screen') { R(rb, [[1, -3], [1, -9], [4, -11]]); R(te, [[3, 0], [4, 2]]); }
  for (const p of S.P) p.sp = SPD[p.role] * (p.team === 1 ? 0.93 + S.q * 0.025 : 1);
  S.ball = { state: 'held', holder: qb, x: qb.x, y: qb.y, z: 0 };
  S.pl = { play, call, O, D, d, t: 0, handed: play !== 'run', thrown: false, holdT: U.rand(1.3, 2.6), carrier: qb };
  S.hc = O === 0 ? qb : lb1;
  S.phase = 'pre'; S.t = 0.9;
  S.stam = 1;
  say(`${O === 0 ? OPLAYS.find((p) => p.k === play).n : DPLAYS.find((p) => p.k === call).n}!`, '#fff', 0.9);
}
/* ---------------- 라이브 플레이 ---------------- */
function live(g, dt) {
  const pl = S.pl, b = S.ball;
  pl.t += dt;
  if (!pl.handed && pl.t > 0.45) {
    const rb = S.P.find((p) => p.team === pl.O && p.role === 'RB');
    b.holder = rb; pl.handed = true; pl.carrier = rb; if (pl.O === 0) S.hc = rb;
    g.sfx.tone(300, 0.05, 'triangle', 0.05);
  }
  // 수비 전환
  if (pl.O === 1 && g.pressed('b')) {
    let best = null, bd = 1e9; const tx = b.x, ty = b.y;
    for (const p of S.P) if (p.team === 0 && p !== S.hc) { const d = U.dist(p.x, p.y, tx, ty); if (d < bd) { bd = d; best = p; } }
    if (best) { S.hc = best; g.sfx.click(); }
  }
  // 패스 입력
  const qb = S.P.find((p) => p.team === pl.O && p.role === 'QB');
  if (b.state === 'held' && b.holder === qb && pl.play !== 'run' && !pl.thrown && (qb.x - S.los) * pl.d < 0.5) {
    if (pl.O === 0) {
      const recs = receivers();
      let tgt = null;
      for (let i = 0; i < recs.length; i++) if (g.keyp('Digit' + (i + 1))) tgt = recs[i];
      if (g.mouse.clicked) { const wx = g.mouse.x / PX + S.cam, wy = (g.mouse.y - FY) / PX; for (const r of recs) if (U.dist(r.x, r.y, wx, wy) < 3) tgt = r; }
      if (g.pressed('a')) tgt = mostOpen(recs).r;
      if (tgt) throwTo(g, qb, tgt);
    } else if (pl.t > 0.6) {
      const press = S.P.some((p) => p.team === pl.D && U.dist(p.x, p.y, qb.x, qb.y) < 2.6);
      const mo = mostOpen(receivers());
      if (pl.t > pl.holdT || (press && Math.random() < 0.08) || (mo.o > 5 && pl.t > 1.1 && Math.random() < 0.05)) if (mo.r) throwTo(g, qb, mo.r);
    }
  }
  for (const p of S.P) {
    p.jcd -= dt;
    if (p.jk > 0) p.jk -= dt;
    if (p.dive > 0) p.dive -= dt;
    if (p.stun > 0) { p.stun -= dt; p.vx *= 0.85; p.vy *= 0.85; }
    else if (p === S.hc) human(g, p, dt);
    else ai(p, dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  blocks(dt);
  ballUpd(g, dt);
  if (S.phase !== 'live') return;
  // 태클 / 사이드라인 / 터치다운
  const c = b.state === 'held' ? b.holder : null;
  if (c) {
    if (c.team === pl.O && (c.x - goalX(pl.O)) * pl.d >= 0) return touchdown(g, pl.O);
    if (c.y < 0 || c.y > FW) return deadBall(g, c.x, '사이드라인 아웃');
    for (const p of S.P) {
      if (p.team === c.team || p.stun > 0 || p.eng) continue;
      if (U.dist(p.x, p.y, c.x, c.y) < 1.05) {
        if (c.jk > 0 && Math.random() < 0.7) { p.stun = 0.8; g.float(sx(p.x), sy(p.y) - 16, '미스 태클!', '#fde047', 15); g.sfx.tone(800, 0.06, 'sine', 0.05); continue; }
        if (c.team === 0 && c.role !== 'QB' && Math.random() < 0.12) { p.stun = 0.6; g.float(sx(c.x), sy(c.y) - 18, '태클 브레이크!', '#86efac', 15); continue; }
        g.sfx.hit(); g.shake(5, 0.2); g.burst(sx(c.x), sy(c.y), ['#fff', '#a3e635'], 14, 160);
        const sack = c.role === 'QB' && !pl.thrown && (c.x - S.los) * pl.d < 0;
        if (sack) { say('색!!', c.team === 0 ? '#f87171' : '#86efac'); if (c.team === 1) { g.add(150); S.stats.sacks++; } }
        return deadBall(g, c.x, sack ? null : '태클');
      }
    }
  }
  camUpd(dt);
}
function receivers() { return ['WR1', 'WR2', 'TE', 'RB'].map((r) => S.P.find((p) => p.team === S.pl.O && p.role === r)); }
function openness(r) { let m = 99; for (const p of S.P) if (p.team !== r.team && !p.role.startsWith('DL')) m = Math.min(m, U.dist(p.x, p.y, r.x, r.y)); return m; }
function mostOpen(recs) {
  let best = null, bs = -1e9, bo = 0;
  for (const r of recs) { const o = openness(r), depth = (r.x - S.los) * S.pl.d; const s = o * 2 + Math.min(depth, 15) * 0.4 + ((r.x - S.fd) * S.pl.d > 0 ? 3 : 0); if (s > bs) { bs = s; best = r; bo = o; } }
  return { r: best, o: bo };
}
function throwTo(g, qb, r) {
  const pl = S.pl, b = S.ball;
  const d0 = U.dist(qb.x, qb.y, r.x, r.y), T = 0.3 + d0 / 24;
  let tx = r.x + r.vx * T, ty = r.y + r.vy * T;
  const err = pl.O === 0 ? 0.6 : 0.9 + d0 * 0.03;
  tx += U.rand(-err, err); ty += U.rand(-err, err);
  b.state = 'air'; b.holder = null; b.sx = qb.x; b.sy = qb.y; b.tx = tx; b.ty = ty; b.t = 0; b.T = T; b.r = r;
  pl.thrown = true;
  if (pl.O === 0) S.hc = r;
  g.sfx.tone(500, 0.1, 'sine', 0.06, 900);
}
function ballUpd(g, dt) {
  const b = S.ball, pl = S.pl;
  if (b.state === 'held') { b.x = b.holder.x + 0.5 * pl.d; b.y = b.holder.y; b.z = 0; return; }
  if (b.state !== 'air') return;
  b.t += dt;
  const u = Math.min(1, b.t / b.T);
  b.x = U.lerp(b.sx, b.tx, u); b.y = U.lerp(b.sy, b.ty, u); b.z = Math.sin(u * Math.PI) * (1 + b.T * 3);
  if (u < 1 || S.phase !== 'live') { if (u >= 1 && S.phase !== 'live') b.state = 'gone'; return; }
  // 도착 판정
  const r = b.r, rd = U.dist(r.x, r.y, b.x, b.y);
  let dd = 99, dfn = null;
  for (const p of S.P) if (p.team === pl.D) { const d = U.dist(p.x, p.y, b.x, b.y); if (d < dd) { dd = d; dfn = p; } }
  if (dfn && dd < 1.3 && dd < rd && Math.random() < 0.42) {
    b.state = 'gone';
    if (pl.D === 0) { g.add(250); S.stats.ints++; }
    g.sfx.tone(pl.D === 0 ? 900 : 200, 0.3, 'square', 0.06, pl.D === 0 ? 1400 : 80);
    say('인터셉트!!', pl.D === 0 ? '#86efac' : '#f87171', 2);
    return endPlay(g, dfn.x, true);
  }
  let catchP = rd < 1.8 ? 0.93 - (dd < 1.6 ? 0.35 : dd < 3 ? 0.12 : 0) : 0;
  if (Math.random() < catchP) {
    b.state = 'held'; b.holder = r; pl.carrier = r; if (pl.O === 0) S.hc = r;
    g.sfx.tone(700, 0.06, 'square', 0.05);
    g.float(sx(r.x), sy(r.y) - 20, '캐치!', '#fff', 16);
    return;
  }
  b.state = 'gone';
  say(dd < 1.6 ? '패스 디펜스!' : '패스 실패', '#cbd5e1', 1.2);
  g.sfx.tone(160, 0.15, 'triangle', 0.06);
  endPlay(g, S.los, false, true);
}
function human(g, p, dt) {
  let ix = (g.right ? 1 : 0) - (g.left ? 1 : 0), iy = (g.down ? 1 : 0) - (g.up ? 1 : 0);
  if (g.mouse.down) { const wx = g.mouse.x / PX + S.cam, wy = (g.mouse.y - FY) / PX, dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy); if (d > 0.5) { ix = dx / d; iy = dy / d; } }
  const il = Math.hypot(ix, iy);
  const isC = S.ball.state === 'held' && S.ball.holder === p;
  let sp = p.sp;
  if (isC && g.held('a') && S.stam > 0 && !(p.role === 'QB' && !S.pl.thrown && S.pl.play !== 'run' && (p.x - S.los) * S.pl.d < 0.5)) { sp *= 1.18; S.stam = Math.max(0, S.stam - dt * 0.45); }
  else S.stam = Math.min(1, S.stam + dt * 0.15);
  if (!isC && S.pl.O === 1 && g.pressed('a') && p.dive <= 0) { p.dive = 0.35; }
  if (p.dive > 0) sp *= 1.5;
  if (isC && g.pressed('b') && p.jcd <= 0) { p.jk = 0.35; p.jcd = 1.1; p.vy += (iy || (Math.random() < 0.5 ? 1 : -1)) * 6; g.sfx.tone(400, 0.08, 'sine', 0.05, 800); }
  const tvx = il ? (ix / il) * sp : 0, tvy = il ? (iy / il) * sp : 0;
  p.vx += (tvx - p.vx) * Math.min(1, dt * 9); p.vy += (tvy - p.vy) * Math.min(1, dt * 9);
}
function moveTo(p, tx, ty, dt, k = 1) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), s = Math.min(p.sp * k * (p.eng ? 0.15 : 1), d * 5);
  const vx = d > 0.05 ? (dx / d) * s : 0, vy = d > 0.05 ? (dy / d) * s : 0;
  p.vx += (vx - p.vx) * Math.min(1, dt * 8); p.vy += (vy - p.vy) * Math.min(1, dt * 8);
}
function pursue(p, c, dt, k = 1) {
  const d = U.dist(p.x, p.y, c.x, c.y), t = Math.min(0.7, d / p.sp);
  moveTo(p, c.x + c.vx * t, c.y + c.vy * t, dt, k);
}
function nearestFoe(p, roleFilter) {
  let b = null, bd = 1e9;
  for (const q of S.P) if (q.team !== p.team && (!roleFilter || roleFilter(q))) { const d = U.dist(p.x, p.y, q.x, q.y); if (d < bd) { bd = d; b = q; } }
  return b;
}
function ai(p, dt) {
  const pl = S.pl, b = S.ball, c = b.state === 'held' ? b.holder : null, d = pl.d;
  const offense = p.team === pl.O, qbHolding = c && c.role === 'QB' && !pl.thrown && pl.play !== 'run';
  if (offense) {
    if (c === p) {
      // CPU 볼 캐리어
      if (p.role === 'QB' && qbHolding) {
        const drop = S.los - d * 6; moveTo(p, drop, p.y, dt, 0.7);
        const r = nearestFoe(p); if (r && U.dist(r.x, r.y, p.x, p.y) < 2) p.vy += Math.sign(p.y - r.y || 1) * 10 * dt;
        return;
      }
      let ay = 0;
      for (const q of S.P) if (q.team !== p.team && q.stun <= 0) { const dx = (q.x - p.x) * d, dy = q.y - p.y; if (dx > -1 && dx < 6 && Math.abs(dy) < 4) ay -= Math.sign(dy || 1) * (6 - dx) * 0.4; }
      if (p.y < 4) ay += 2; if (p.y > FW - 4) ay -= 2;
      return moveTo(p, p.x + d * 8, p.y + ay, dt, 1);
    }
    if (b.state === 'air' && b.r === p) return moveTo(p, b.tx, b.ty, dt, 1.05);
    if (p.role.startsWith('OL')) {
      const t = nearestFoe(p, (q) => q.role.startsWith('DL') || (pl.call === 'blitz' && q.role.startsWith('LB')));
      if (t) moveTo(p, (t.x + (c ? c.x : p.x)) / 2, (t.y + (c ? c.y : p.y)) / 2, dt, 1);
      return;
    }
    if (p.role === 'QB') return moveTo(p, p.x, p.y, dt);
    if (p.route && (pl.play !== 'run') && (!c || c.role === 'QB' || b.state === 'air')) {
      if (p.ri < p.route.length) { const [tx, ty] = p.route[p.ri]; moveTo(p, tx, ty, dt); if (U.dist(p.x, p.y, tx, ty) < 0.8) p.ri++; }
      else { const f = nearestFoe(p); if (f && U.dist(f.x, f.y, p.x, p.y) < 3) moveTo(p, p.x + d * 0.5, p.y - Math.sign(f.y - p.y) * 3, dt, 0.6); else moveTo(p, p.x, p.y, dt); }
      return;
    }
    // 블로킹
    const carrier = c && c.team === p.team ? c : null;
    const t = nearestFoe(p, (q) => q.stun <= 0);
    if (t && carrier) { const mx = (t.x + carrier.x) / 2, my = (t.y + carrier.y) / 2; moveTo(p, mx, my, dt, 0.9); }
    else if (t) moveTo(p, t.x, t.y, dt, 0.8);
    return;
  }
  // 수비
  if (b.state === 'air') {
    const near = U.dist(p.x, p.y, b.tx, b.ty) < 9 && !p.role.startsWith('DL');
    if (near) return moveTo(p, b.tx, b.ty, dt, 1);
  }
  if (!c) return moveTo(p, p.x, p.y, dt);
  const runRead = !qbHolding;
  if (p.role.startsWith('DL')) { if (pl.call === 'passd' && p.role === 'DL2' && qbHolding) return moveTo(p, S.los + d * 6, MID + 4, dt); return pursue(p, c, dt, 1); }
  if (runRead) {
    const react = pl.call === 'rund' ? 0.2 : 0.55;
    if ((pl.t > react && c.role !== 'QB') || pl.thrown || (c.x - S.los) * d > 0) return pursue(p, c, dt, 1);
  }
  if (p.role.startsWith('LB')) {
    if (pl.call === 'blitz') return pursue(p, c, dt, 1);
    if (pl.call === 'rund' && pl.t < 1.2) return moveTo(p, S.los + d * 1.5, p.y, dt, 0.9);
    const m = p.mark;
    if (m) return moveTo(p, m.x + d * 1.5, m.y, dt, pl.call === 'passd' ? 1 : 0.9);
    return;
  }
  if (p.role.startsWith('CB')) {
    const m = p.mark, lag = pl.call === 'blitz' ? 0.85 : 0.97;
    return moveTo(p, m.x + d * 1.2 + m.vx * 0.2, m.y + m.vy * 0.2, dt, lag);
  }
  if (p.role === 'S') {
    let deep = S.los + d * 12;
    for (const q of S.P) if (q.team === pl.O && q.role !== 'QB') { if ((q.x - deep) * d > -3) deep = q.x + d * 3; }
    return moveTo(p, deep, U.lerp(MID, c.y, 0.4), dt, 0.9);
  }
}
function blocks(dt) {
  const pl = S.pl;
  for (const p of S.P) {
    if (p.eng) { p.engT -= dt; if (p.engT <= 0 || U.dist(p.x, p.y, p.eng.x, p.eng.y) > 2) { p.eng.eng = null; p.eng = null; } }
  }
  for (const o of S.P) {
    if (o.team !== pl.O || o.eng || o.stun > 0 || o === S.ball.holder || (S.ball.state === 'air' && S.ball.r === o)) continue;
    if (o.role === 'QB' || (o.route && pl.play !== 'run' && o.ri < o.route.length)) continue;
    for (const dfn of S.P) {
      if (dfn.team !== pl.D || dfn.eng || dfn === S.hc && Math.random() < 0.5) continue;
      if (U.dist(o.x, o.y, dfn.x, dfn.y) < 1.2) {
        o.eng = dfn; dfn.eng = o;
        const t = o.role.startsWith('OL') ? U.rand(1.2, 2.8) * (pl.call === 'passd' ? 1.3 : pl.call === 'blitz' ? 0.8 : 1) : U.rand(0.5, 1.2);
        o.engT = dfn.engT = t;
        break;
      }
    }
  }
}
function deadBall(g, x, why) { if (why) say(why, '#fff', 1); endPlay(g, x, false); }
function endPlay(g, spotX, turnover, incomplete) {
  const pl = S.pl, d = pl.d;
  S.phase = 'dead'; S.t = 1.4;
  for (const p of S.P) { if (p.eng) p.eng = null; }
  spotX = U.clamp(spotX, 10.5, 109.5);
  const gain = incomplete ? 0 : Math.round((spotX - S.los) * d);
  tick(pl.t * 3 + (incomplete ? 6 : 22));
  if (!turnover && !incomplete && pl.O === 0 && gain > 0) { g.add(gain * 5); S.stats.yds += gain; }
  if (!turnover && !incomplete && gain !== 0) g.float(sx(spotX), FY + 24, `${gain > 0 ? '+' : ''}${gain}야드`, gain > 0 ? (pl.O === 0 ? '#86efac' : '#fca5a5') : '#cbd5e1', 18);
  S.after = () => {
    if (turnover) return changePoss(g, spotX);
    if (!incomplete) S.los = spotX;
    if ((S.los - S.fd) * d >= 0) {
      S.down = 1; S.fd = U.clamp(S.los + d * 10, 10, 110);
      if (!incomplete) say('퍼스트 다운!', pl.O === 0 ? '#86efac' : '#fca5a5', 1.2), g.sfx.coin();
    } else if (++S.down > 4) { say('공격권 이전 (다운 소진)', '#fde047', 1.6); return changePoss(g, S.los); }
    nextCall(g);
  };
}
function changePoss(g, x) {
  S.O = 1 - S.O; S.los = U.clamp(x, 11, 109); S.down = 1;
  S.fd = U.clamp(S.los + dirOf(S.O) * 10, 10, 110);
  nextCall(g);
}
function tick(sec) {
  S.clock -= sec;
  if (S.clock <= 0) { S.q++; S.clock = 300; if (S.q <= 4) say(`${S.q}쿼터 시작`, '#fde047', 1.6); }
}
function nextCall(g) {
  if (S.q > 4) return gameEnd(g);
  S.phase = 'call';
}
function gameEnd(g) {
  const [a, b] = S.sc, m = `${a} : ${b} · 전진 ${S.stats.yds}야드 · TD ${S.stats.td}`;
  if (a > b) { g.add(3000); g.win('승리! ' + m); } else g.over((a === b ? '무승부 ' : '패배 ') + m);
}
function touchdown(g, team) {
  S.sc[team] += 6;
  const pat = Math.random() < 0.95; if (pat) S.sc[team] += 1;
  if (team === 0) { g.add(700); S.stats.td++; g.sfx.win(); g.shake(8, 0.4); g.burst(480, 300, ['#fde047', '#22c55e', '#fff', '#3b82f6'], 70, 420, 1.2, 5); }
  else { g.sfx.lose(); g.shake(4, 0.2); }
  say(`🏈 터치다운!! ${pat ? '(PAT 성공)' : '(PAT 실패)'}`, team === 0 ? '#fde047' : '#f87171', 2.4);
  S.phase = 'dead'; S.t = 2.4; tick(S.pl.t * 3 + 30);
  S.after = () => { S.O = 1 - team; S.los = S.O === 0 ? 35 : 85; S.down = 1; S.fd = S.los + dirOf(S.O) * 10; nextCall(g); };
}
function punt(g, team) {
  const d = dirOf(team);
  let x = S.los + d * U.rand(36, 50);
  if ((x - goalX(team)) * d >= 0) x = team === 0 ? 90 : 30;
  say(`펀트! ${Math.round(Math.abs(x - S.los))}야드`, '#cbd5e1', 1.6);
  g.sfx.tone(140, 0.12, 'square', 0.08, 60);
  tick(15);
  S.P = []; S.ball = null;
  S.phase = 'dead'; S.t = 1.6;
  S.after = () => changePoss(g, x);
}
function cpuFG(g) {
  const dist = Math.round(S.los - 10 + 17), ok = Math.random() < U.clamp(1.02 - (dist - 20) * 0.016, 0.3, 0.97);
  say(`상대 ${dist}야드 필드골 ${ok ? '성공' : '실패!'}`, ok ? '#f87171' : '#86efac', 2);
  if (ok) S.sc[1] += 3;
  tick(15); S.P = []; S.ball = null;
  S.phase = 'dead'; S.t = 2;
  S.after = () => { if (ok) { S.O = 0; S.los = 35; S.down = 1; S.fd = 45; nextCall(g); } else changePoss(g, S.los); };
}
function kickUpd(g, dt) {
  const k = S.kick;
  if (k.fly >= 0) {
    k.fly += dt;
    if (k.fly > 1.4) {
      S.phase = 'dead'; S.t = 0.2; tick(15);
      S.after = () => { if (k.ok) { S.O = 1; S.los = 85; S.down = 1; S.fd = 75; nextCall(g); } else changePoss(g, S.los); };
    }
    return;
  }
  const spd = 1.4 + k.dist / 40;
  k.a += k.d * dt * spd; if (k.a > 1) { k.a = 1; k.d = -1; } if (k.a < -1) { k.a = -1; k.d = 1; }
  if (g.pressed('a') || g.mouse.clicked) {
    const tol = U.clamp(0.42 - (k.dist - 20) * 0.007, 0.08, 0.42);
    k.ok = Math.abs(k.a) < tol; k.fly = 0; k.res = k.a;
    g.sfx.tone(140, 0.12, 'square', 0.08, 60);
    if (k.ok) { S.sc[0] += 3; g.add(300); g.later(() => { say(`${k.dist}야드 필드골 성공!`, '#86efac', 2); g.sfx.win(); }, 1); }
    else g.later(() => { say('노 굿! 필드골 실패', '#f87171', 2); g.sfx.lose(); }, 1);
  }
}
function camUpd(dt) {
  const b = S.ball, x = b ? b.x : S.los;
  const t = U.clamp(x - 44 + (S.pl ? S.pl.d * 8 : 0), 0, 120 - VIEWY);
  S.cam += (t - S.cam) * Math.min(1, dt * 4);
}
function sx(x) { return (x - S.cam) * PX; }
function sy(y) { return FY + y * PX; }
/* ---------------- 그리기 ---------------- */
function draw(g, c) {
  if (S.phase === 'call' || S.phase === 'kick') { const t = U.clamp(S.los - 48, 0, 120 - VIEWY); S.cam += (t - S.cam) * 0.15; }
  g.rect(0, 0, 960, 600, '#0b1a10');
  g.rect(0, FY - 6, 960, FW * PX + 12, '#e5e7eb');
  g.rect(0, FY, 960, FW * PX, '#2f8f3a');
  for (let y = 0; y < 12; y++) if (y % 2) g.rect(0, FY + y * FW * PX / 12, 960, FW * PX / 12, 'rgba(255,255,255,.03)');
  g.rect(sx(0), FY, 10 * PX, FW * PX, '#1d4ed8'); g.rect(sx(110), FY, 10 * PX, FW * PX, '#b91c1c');
  c.save(); c.translate(sx(5), sy(MID)); c.rotate(-Math.PI / 2); g.text('우 리 팀', 0, 0, 26, 'rgba(255,255,255,.5)'); c.restore();
  c.save(); c.translate(sx(115), sy(MID)); c.rotate(Math.PI / 2); g.text('C P U', 0, 0, 26, 'rgba(255,255,255,.5)'); c.restore();
  for (let x = 10; x <= 110; x += 5) {
    g.line(sx(x), FY, sx(x), FY + FW * PX, 'rgba(255,255,255,.7)', x % 10 ? 1 : 2);
    if (x % 10 === 0 && x > 10 && x < 110) { const n = ydLine(x); g.text(n + '', sx(x), sy(9), 18, 'rgba(255,255,255,.75)'); g.text(n + '', sx(x), sy(FW - 9), 18, 'rgba(255,255,255,.75)'); }
    for (let k = 1; k < 5 && x < 110; k++) { g.line(sx(x + k), sy(MID - 3), sx(x + k), sy(MID - 2.3), 'rgba(255,255,255,.5)', 1); g.line(sx(x + k), sy(MID + 2.3), sx(x + k), sy(MID + 3), 'rgba(255,255,255,.5)', 1); }
  }
  // 골포스트
  for (const gx of [0, 120]) { g.line(sx(gx), sy(MID - 3), sx(gx), sy(MID + 3), '#facc15', 5); }
  // LOS & 퍼스트다운
  if (S.phase !== 'kick') {
    g.line(sx(S.los), FY, sx(S.los), FY + FW * PX, '#3b82f6', 3);
    if (S.fd > 10 && S.fd < 110) g.line(sx(S.fd), FY, sx(S.fd), FY + FW * PX, '#facc15', 3);
  }
  // 선수
  for (const p of S.P) {
    const X = sx(p.x), Y = sy(p.y), col = p.team === 0 ? '#1d4ed8' : '#b91c1c', hl = p.team === 0 ? '#bfdbfe' : '#fecaca';
    if (X < -20 || X > 980) continue;
    g.circle(X + 2, Y + 3, 9, 'rgba(0,0,0,.25)');
    if (p === S.hc && S.phase !== 'call') g.ring(X, Y, 14, '#fde047', 3);
    g.circle(X, Y, 9, p.stun > 0 ? '#64748b' : col); g.ring(X, Y, 9, hl, 2);
    g.rect(X - 6, Y - 2, 12, 4, hl);
    if (p.jk > 0) g.ring(X, Y, 12, '#a3e635', 2);
    if (p.eng) g.line(X, Y, sx(p.eng.x), sy(p.eng.y), 'rgba(255,255,255,.35)', 3);
  }
  // 리시버 표시
  if (S.phase === 'live' && S.pl && S.pl.O === 0 && !S.pl.thrown && S.pl.play !== 'run' && S.ball.holder && S.ball.holder.role === 'QB') {
    receivers().forEach((r, i) => { const o = openness(r); g.circle(sx(r.x), sy(r.y) - 20, 9, o > 4 ? '#22c55e' : o > 2 ? '#eab308' : '#ef4444'); g.text(i + 1 + '', sx(r.x), sy(r.y) - 20, 12, '#fff'); });
  }
  if (S.pl && S.phase !== 'call' && S.pl.O !== undefined && S.P.length) for (const p of S.P) if (p.route && S.phase === 'pre' && p.team === 0) { c.save(); c.setLineDash([4, 5]); c.beginPath(); c.moveTo(sx(p.x), sy(p.y)); for (const [x, y] of p.route) c.lineTo(sx(x), sy(y)); c.strokeStyle = 'rgba(253,224,71,.7)'; c.lineWidth = 2; c.stroke(); c.restore(); }
  // 공
  const b = S.ball;
  if (b && b.state !== 'gone') {
    const X = sx(b.x), Y = sy(b.y) - (b.z || 0) * 6;
    if (b.z) g.circle(sx(b.x), sy(b.y), 3, 'rgba(0,0,0,.3)');
    c.save(); c.translate(X, Y); c.rotate(g.time * (b.state === 'air' ? 12 : 0)); c.beginPath(); c.ellipse(0, 0, 6, 3.6, 0, 0, Math.PI * 2); c.fillStyle = '#7c2d12'; c.fill(); g.line(-2, 0, 2, 0, '#fff', 1); c.restore();
  }
  if (S.phase === 'kick') drawKick(g, c);
  hud(g, c);
  if (S.phase === 'call') drawCall(g, c);
  if (S.msgT > 0) { g.rrect(280, 230, 400, 60, 14, 'rgba(0,0,0,.7)'); g.text(S.msg, 480, 260, 26, S.msgC); }
}
function hud(g, c) {
  g.rrect(8, 6, 944, 48, 10, 'rgba(0,0,0,.75)');
  g.rect(18, 16, 8, 28, '#1d4ed8'); g.text('우리 팀', 34, 30, 16, '#fff', 'left'); g.text(S.sc[0] + '', 120, 30, 26, '#fde047');
  g.text(S.sc[1] + '', 180, 30, 26, '#fde047'); g.text('CPU', 214, 30, 16, '#fff', 'left'); g.rect(256, 16, 8, 28, '#b91c1c');
  g.text(`${Math.min(4, S.q)}Q  ${U.fmtTime(Math.max(0, S.clock))}`, 360, 30, 18, '#fff');
  const dn = ['', '1st', '2nd', '3rd', '4th'][S.down] || '';
  g.text(`${dn} & ${S.fd >= 110 || S.fd <= 10 ? 'Goal' : toGo()}`, 520, 30, 20, '#facc15');
  const side = S.los < 60 ? (S.los < 60 ? 'CPU' : '') : '우리';
  g.text(`볼 위치: ${S.los <= 60 ? '우리' : '상대'} ${ydLine(S.los)}야드`, 700, 30, 15, '#cbd5e1');
  void side;
  g.text(S.O === 0 ? '🏈 공격' : '🛡️ 수비', 890, 30, 16, S.O === 0 ? '#93c5fd' : '#fca5a5');
  if (S.phase === 'live' && S.ball && S.ball.holder === S.hc && S.hc.team === 0) {
    g.rrect(380, 576, 200, 12, 5, 'rgba(0,0,0,.6)'); g.rrect(381, 577, 198 * S.stam, 10, 4, '#22c55e'); g.text('스프린트', 340, 582, 12, '#fff');
  }
}
function drawCall(g, c) {
  const ops = options();
  g.rrect(170, 200, 620, 140 + Math.ceil(ops.length / 3) * 78, 18, 'rgba(0,0,0,.82)', S.O === 0 ? '#3b82f6' : '#ef4444', 3);
  g.text(S.O === 0 ? '공격 플레이 선택' : '수비 작전 선택', 480, 236, 26, '#fff');
  g.text(`${['', '1st', '2nd', '3rd', '4th'][S.down]} & ${toGo()} · 엔드존까지 ${Math.round(Math.abs(goalX(S.O) - S.los))}야드`, 480, 272, 16, '#facc15');
  g.text('숫자키 또는 클릭', 480, 300, 13, '#94a3b8');
  ops.forEach((o, i) => {
    const [x, y, w, h] = btnRect(i, ops.length), hov = g.inRect(x, y, w, h);
    g.rrect(x, y, w, h, 10, hov ? '#334155' : '#1e293b', S.O === 0 ? '#60a5fa' : '#f87171', 2);
    g.text(`${i + 1}. ${o.n}`, x + w / 2, y + 22, 18, '#fff');
    g.text(o.d, x + w / 2, y + 46, 11, '#cbd5e1');
  });
}
function drawKick(g, c) {
  const k = S.kick;
  g.rrect(280, 380, 400, 120, 14, 'rgba(0,0,0,.8)');
  g.text(`${k.dist}야드 필드골 — 중앙에서 Space!`, 480, 404, 17, '#fff');
  const tol = U.clamp(0.42 - (k.dist - 20) * 0.007, 0.08, 0.42);
  g.rect(300, 440, 360, 24, '#334155'); g.rect(480 - tol * 180, 440, tol * 360, 24, '#22c55e');
  const v = k.fly >= 0 ? k.res : k.a; g.rect(480 + v * 180 - 2, 432, 4, 40, '#fde047');
  // 골대 & 공
  const gx = 830, gy = 300;
  g.line(gx, gy + 120, gx, gy + 40, '#facc15', 5); g.line(gx - 50, gy + 40, gx + 50, gy + 40, '#facc15', 5);
  g.line(gx - 50, gy + 40, gx - 50, gy - 60, '#facc15', 5); g.line(gx + 50, gy + 40, gx + 50, gy - 60, '#facc15', 5);
  if (k.fly >= 0) { const t = Math.min(1, k.fly / 1); g.circle(gx + k.res * 90 * t, gy + 150 - t * 170, 8 - t * 3, '#7c2d12'); }
}
