'use strict';
let S;
const OPPS = [
  { n: '유리턱 조', hp: 70, wind: 1.0, idle: [1.4, 2.4], dmg: 0.8, skin: '#f5d0a9', trunk: '#16a34a', hair: '#78350f', atk: { jab: 4, hook: 3, upper: 1, body: 1 }, feint: 0, rank: 50 },
  { n: '돌주먹 박', hp: 95, wind: 0.85, idle: [1.1, 2.0], dmg: 1, skin: '#e0ac69', trunk: '#dc2626', hair: '#111', atk: { jab: 3, hook: 4, upper: 2, body: 2 }, feint: 0.05, rank: 25 },
  { n: '번개 리', hp: 110, wind: 0.65, idle: [0.7, 1.5], dmg: 1, skin: '#f1c27d', trunk: '#eab308', hair: '#1f2937', atk: { jab: 5, hook: 3, upper: 2, body: 2 }, feint: 0.12, rank: 10 },
  { n: '철벽 킹', hp: 150, wind: 0.75, idle: [0.9, 1.7], dmg: 1.25, skin: '#8d5524', trunk: '#7c3aed', hair: '#0f0f0f', atk: { jab: 2, hook: 4, upper: 3, body: 3 }, feint: 0.15, rank: 3 },
  { n: '챔피언 타이슨 김', hp: 180, wind: 0.55, idle: [0.6, 1.3], dmg: 1.4, skin: '#c68642', trunk: '#0f172a', hair: '#000', atk: { jab: 4, hook: 4, upper: 3, body: 3 }, feint: 0.22, rank: 1 },
];
const ATK = {
  jab: { n: '잽', w: 0.55, d: 7, block: 0.15, need: 'any' },
  hookL: { n: '왼 훅', w: 0.95, d: 13, block: 0.4, need: 'R' },
  hookR: { n: '오른 훅', w: 0.95, d: 13, block: 0.4, need: 'L' },
  upper: { n: '어퍼컷', w: 1.15, d: 20, block: 0.75, need: 'any' },
  body: { n: '바디 블로', w: 0.8, d: 10, block: 0.1, need: 'guard' },
};
const PUN = { jab: { t: 0.16, d: 3, st: 4, n: '잽' }, hook: { t: 0.3, d: 7, st: 9, n: '훅' }, upper: { t: 0.38, d: 11, st: 14, n: '어퍼컷' } };
const OX = 450, OY = 300;
GAME({
  title: '복싱 챔프', w: 900, h: 640, bg: '#0a0a14', controls: 'dpad+ab', aLabel: '잽', bLabel: '훅',
  help: '←/→: 회피(더킹) · ↓ 꾹: 가드 · Space/Z: 잽 · X/Shift: 훅 · ↑ + 펀치: 어퍼컷\n↓ 누른 채 펀치 = 바디 공격 (상대가 얼굴 가드 중일 때!)\n상대의 예비동작(❗)을 읽어라: 훅은 반대쪽으로, 바디 블로는 가드로 막기\n회피 성공 → 상대 빈틈! 카운터를 넣으면 ⭐ 획득 → ⭐로 필살 어퍼컷 (↑+X)\n다운되면 연타로 일어나라! 3라운드 · 5명을 꺾고 챔피언 벨트를!',
  init(g) {
    S = { lv: 0, total: 0 };
    newFight(g);
  },
  update(g, dt) {
    S.msgT -= dt; S.flash = Math.max(0, S.flash - dt * 3); S.oflash = Math.max(0, S.oflash - dt * 4);
    if (S.phase === 'intro' || S.phase === 'roundEnd') { S.t -= dt; if (S.t <= 0) { if (S.after) { const f = S.after; S.after = null; f(); } else S.phase = 'fight'; } return; }
    if (S.phase === 'result') { if (g.pressed('a') || g.clickIn(330, 470, 240, 56)) { S.lv++; newFight(g); } return; }
    if (S.phase === 'ocount') return ocount(g, dt);
    if (S.phase === 'pcount') return pcount(g, dt);
    fight(g, dt);
  },
  draw(g, c) { draw(g, c); },
});
function say(m, c = '#fde047', t = 1.4) { S.msg = m; S.msgC = c; S.msgT = t; }
function newFight(g) {
  const O = OPPS[S.lv];
  Object.assign(S, { php: 100, stam: 100, tired: 0, stars: 0, round: 1, rt: 60, kd: [0, 0], pts: [0, 0], ophp: O.hp, msg: '', msgT: 0, flash: 0, oflash: 0, combo: 0, blocks: 0,
    o: { s: 'idle', t: 1.5, guard: 'high', atk: null, hx: 0, hy: 0, sway: 0, open: 0 }, p: { act: 'idle', t: 0, punch: null, cd: 0, body: false, mash: 0 }, phase: 'intro', t: 2.2, after: null, count: 0, getUp: 0 });
  say(`${S.lv + 1}전 · 랭킹 ${O.rank}위 ${O.n}`, '#fde047', 2.2);
  g.info = `${S.lv + 1}/5전 vs ${O.n}`;
}
function fight(g, dt) {
  const O = OPPS[S.lv], o = S.o, p = S.p;
  S.rt -= dt;
  if (S.rt <= 0) return roundEnd(g);
  // 플레이어 입력
  p.t -= dt; p.cd -= dt;
  if (S.tired > 0) S.tired -= dt;
  if (p.act === 'hurt' && p.t <= 0) p.act = 'idle';
  if (p.act === 'punch') {
    if (!p.hit && p.t <= p.punch.t * 0.4) { p.hit = true; landPunch(g); }
    if (p.t <= 0) p.act = 'idle';
  }
  if ((p.act === 'dodgeL' || p.act === 'dodgeR') && p.t <= 0) { p.act = 'idle'; p.cd = 0.12; }
  if (p.act === 'idle' || p.act === 'guard') {
    p.act = g.down && !g.pressed('a') && !g.pressed('b') ? 'guard' : 'idle';
    if (p.cd <= 0) {
      if (g.pressed('left')) { p.act = 'dodgeL'; p.t = 0.42; g.sfx.tone(200, 0.06, 'triangle', 0.04); }
      else if (g.pressed('right')) { p.act = 'dodgeR'; p.t = 0.42; g.sfx.tone(200, 0.06, 'triangle', 0.04); }
      else if ((g.pressed('a') || g.pressed('b') || g.mouse.clicked) && S.tired <= 0) {
        let k = g.pressed('b') || (g.mouse.clicked && g.mouse.x > OX) ? 'hook' : 'jab';
        if (g.up) k = 'upper';
        const star = k === 'upper' && g.pressed('b') && S.stars > 0;
        if (star) S.stars--;
        p.act = 'punch'; p.punch = { ...PUN[k], k, star, side: k === 'jab' ? -1 : 1 }; p.t = p.punch.t * (star ? 1.4 : 1); p.hit = false; p.body = g.down;
        S.stam -= p.punch.st;
        if (S.stam <= 0) { S.stam = 0; S.tired = 2; say('지쳤다! 숨 고르기...', '#f87171', 1.2); }
        g.sfx.tone(150, 0.06, 'triangle', 0.05, 90);
      }
    }
  }
  if (p.act !== 'punch') S.stam = Math.min(100, S.stam + dt * (S.tired > 0 ? 35 : 14));
  // 상대
  o.t -= dt; o.sway += dt;
  o.hx *= Math.pow(0.02, dt); o.hy *= Math.pow(0.02, dt);
  if (o.s === 'idle') {
    if (Math.random() < dt * 0.4) o.guard = o.guard === 'high' ? 'low' : 'high';
    if (o.t <= 0) startAttack(O, o);
  } else if (o.s === 'wind') {
    if (o.t <= 0) {
      if (o.feint) { o.s = 'idle'; o.t = 0.35; o.feint = false; say('페인트!', '#cbd5e1', 0.7); }
      else { o.s = 'strike'; o.t = 0.15; resolveAttack(g, O); }
    }
  } else if (o.s === 'strike') { if (o.t <= 0) { o.s = 'recover'; o.t = 0.35; } }
  else if (o.s === 'recover' || o.s === 'open' || o.s === 'stun') { if (o.t <= 0) { o.s = 'idle'; o.t = U.rand(...O.idle); S.combo = 0; } }
  g.info = `R${S.round} ${Math.ceil(S.rt)}초 · ${S.lv + 1}/5전`;
}
function startAttack(O, o) {
  const pool = [];
  for (const k in O.atk) for (let i = 0; i < O.atk[k]; i++) pool.push(k);
  let k = U.choice(pool);
  if (k === 'hook') k = Math.random() < 0.5 ? 'hookL' : 'hookR';
  o.s = 'wind'; o.atk = k; o.t = ATK[k].w * O.wind * U.rand(0.9, 1.15); o.T = o.t;
  o.feint = Math.random() < O.feint;
}
function resolveAttack(g, O) {
  const o = S.o, p = S.p, A = ATK[o.atk];
  const dodged = (p.act === 'dodgeL' && (A.need === 'any' || A.need === 'L' || A.need === 'guard')) || (p.act === 'dodgeR' && (A.need === 'any' || A.need === 'R' || A.need === 'guard'));
  const wrongDodge = (p.act === 'dodgeL' || p.act === 'dodgeR') && !dodged;
  if (dodged && o.atk !== 'body') {
    o.s = 'open'; o.t = 1.1; o.open = 1; S.combo = 0;
    say('회피! 지금이다!', '#86efac', 0.8); g.sfx.tone(900, 0.06, 'sine', 0.05);
    g.add(10);
    return;
  }
  if (o.atk === 'body' && (p.act === 'dodgeL' || p.act === 'dodgeR')) {
    o.s = 'open'; o.t = 0.7; say('회피!', '#86efac', 0.6); return;
  }
  if (p.act === 'guard') {
    const dmg = A.d * A.block * O.dmg;
    hurtP(g, dmg, true);
    if (o.atk === 'body' || o.atk === 'jab') { o.s = 'open'; o.t = o.atk === 'body' ? 0.9 : 0.5; say('가드!', '#93c5fd', 0.6); }
    else if (o.atk === 'upper') { say('가드 브레이크!', '#f87171', 0.8); p.act = 'hurt'; p.t = 0.45; }
    else say('블록', '#93c5fd', 0.5);
    g.sfx.tone(260, 0.06, 'square', 0.05);
    return;
  }
  const dmg = A.d * O.dmg * (wrongDodge ? 1.25 : 1) * (p.act === 'punch' ? 1.3 : 1);
  hurtP(g, dmg, false);
  if (wrongDodge) say('반대쪽!', '#f87171', 0.6);
}
function hurtP(g, dmg, blocked) {
  const p = S.p;
  S.php -= dmg; S.pts[1] += dmg;
  if (!blocked) { p.act = 'hurt'; p.t = 0.4; S.flash = 1; g.shake(10, 0.25); g.sfx.hit(); g.sfx.noise(0.1, 0.15); }
  else g.shake(3, 0.1);
  if (S.php <= 0) { S.php = 0; pDown(g); }
}
function landPunch(g) {
  const p = S.p, o = S.o, P = p.punch, O = OPPS[S.lv];
  const open = o.s === 'open' || o.s === 'stun' || o.s === 'wind' && o.t < o.T * 0.5 || o.s === 'recover';
  const covered = o.s === 'idle' && ((o.guard === 'high' && !p.body && P.k !== 'upper') || (o.guard === 'low' && p.body));
  const sx = OX + P.side * 40, sy = OY - (p.body ? -40 : 70);
  if (covered || (o.s === 'idle' && Math.random() < 0.15 + S.lv * 0.05 && !P.star)) {
    S.blocks++;
    g.sfx.tone(320, 0.05, 'square', 0.05); g.burst(sx, sy, '#cbd5e1', 6, 120);
    g.float(sx, sy - 30, '블록', '#cbd5e1', 16);
    S.stam -= 4;
    if (S.blocks >= 3) { S.blocks = 0; o.s = 'wind'; o.atk = 'jab'; o.t = o.T = 0.35; o.feint = false; say('카운터 온다!', '#f87171', 0.6); }
    return;
  }
  S.blocks = 0;
  let d = P.d * (P.star ? 3 : 1) * (open ? 1.6 : 1) * (p.body ? 1.1 : 1);
  if (o.s === 'wind' && o.t < o.T * 0.5) { o.s = 'stun'; o.t = 0.6; say('인터럽트!', '#fde047', 0.7); }
  if (open && o.open) { o.open = 0; if (S.stars < 3) { S.stars++; g.float(OX, OY - 160, '⭐ +1', '#fde047', 26); g.sfx.coin(); } }
  S.combo++;
  S.ophp -= d; S.pts[0] += d;
  g.add(Math.round(d * 2 * (1 + S.combo * 0.1)));
  o.hx = P.side * -18 * (P.k === 'jab' ? 0.6 : 1.4); o.hy = P.k === 'upper' ? -30 : p.body ? 10 : -6;
  S.oflash = 1;
  g.burst(sx, sy, P.star ? ['#fde047', '#fff', '#f97316'] : ['#fff', '#fca5a5'], P.star ? 40 : 12, P.star ? 380 : 200);
  g.shake(P.star ? 14 : P.k === 'jab' ? 3 : 6, P.star ? 0.4 : 0.15);
  g.sfx.tone(P.star ? 90 : 140, P.star ? 0.3 : 0.08, 'square', 0.1, 50); g.sfx.noise(P.star ? 0.25 : 0.06, 0.2);
  if (P.star) say('⭐ 필살 어퍼컷!!', '#fde047', 1);
  if (S.combo >= 4) g.float(OX + 120, OY - 120, `${S.combo} 콤보!`, '#f97316', 22);
  if (o.s === 'idle' && Math.random() < 0.35) o.guard = o.guard === 'high' ? 'low' : 'high';
  if (o.s === 'idle' && P.k !== 'jab') { o.s = 'stun'; o.t = 0.3; }
  if (S.ophp <= 0) { S.ophp = 0; oDown(g); }
}
function oDown(g) {
  const O = OPPS[S.lv];
  S.kd[0]++; S.pts[0] += 20;
  g.add(300); g.sfx.explode(); g.shake(12, 0.5);
  say('다운!!', '#fde047', 1.5);
  S.phase = 'ocount'; S.count = 0; S.ct = 1.2;
  const tko = S.kd[0] >= 3;
  S.getUp = tko ? 99 : Math.random() < (S.kd[0] === 1 ? 0.85 : 0.5) - S.lv * -0.03 ? U.randi(3, 9) : 99;
  S.o.s = 'down';
  void O;
}
function ocount(g, dt) {
  S.ct -= dt;
  if (S.ct <= 0) {
    S.ct = 0.75; S.count++;
    g.sfx.beep(600, 0.1);
    if (S.count >= S.getUp) {
      const O = OPPS[S.lv];
      S.ophp = Math.round(O.hp * Math.max(0.25, 0.6 - S.kd[0] * 0.15));
      S.o.s = 'idle'; S.o.t = 1.2; S.phase = 'fight';
      say(`${S.count}카운트에 일어났다!`, '#fca5a5', 1.2);
      return;
    }
    if (S.count >= 10 || (S.kd[0] >= 3 && S.count >= 2)) return winFight(g, S.kd[0] >= 3 ? 'TKO' : 'KO');
  }
}
function pDown(g) {
  S.kd[1]++; S.pts[1] += 20;
  g.sfx.explode(); g.shake(14, 0.5);
  S.phase = 'pcount'; S.count = 0; S.ct = 1.2; S.p.mash = 0; S.need = 10 + S.kd[1] * 7;
  say('다운! 연타로 일어나라!', '#f87171', 1.5);
}
function pcount(g, dt) {
  if (g.pressed('a') || g.pressed('b') || g.mouse.clicked || g.pressed('up')) { S.p.mash++; g.sfx.tone(300 + S.p.mash * 20, 0.04, 'square', 0.04); }
  if (S.kd[1] >= 3) { S.ct -= dt; if (S.ct <= 0) loseFight(g, 'TKO 패'); return; }
  if (S.p.mash >= S.need) {
    S.php = Math.max(20, 60 - S.kd[1] * 12); S.phase = 'fight'; S.p.act = 'idle'; S.o.s = 'idle'; S.o.t = 1.2;
    say('일어났다! 아직 끝나지 않았어!', '#86efac', 1.4); g.sfx.power();
    return;
  }
  S.ct -= dt;
  if (S.ct <= 0) { S.ct = 0.85; S.count++; g.sfx.beep(400, 0.1); if (S.count >= 10) loseFight(g, 'KO 패'); }
}
function roundEnd(g) {
  g.sfx.beep(900, 0.5);
  if (S.round >= 3) {
    const [a, b] = S.pts;
    say(`판정: ${Math.round(a)} vs ${Math.round(b)}`, '#fde047', 2);
    S.phase = 'roundEnd'; S.t = 2;
    S.after = () => (a > b ? winFight(g, '판정승') : loseFight(g, '판정패'));
    return;
  }
  say(`${S.round}라운드 종료`, '#fde047', 2);
  S.phase = 'roundEnd'; S.t = 2.2;
  S.after = () => {
    S.round++; S.rt = 60; S.kd = [0, 0]; S.php = Math.min(100, S.php + (100 - S.php) * 0.35); S.stam = 100; S.tired = 0;
    S.o.s = 'idle'; S.o.t = 1.5; S.p.act = 'idle';
    say(`${S.round}라운드 파이트!`, '#fff', 1.2); S.phase = 'fight';
  };
}
function winFight(g, how) {
  const O = OPPS[S.lv];
  g.add(1000 * (S.lv + 1) + (how !== '판정승' ? 800 : 0) + Math.round(S.php) * 10);
  g.sfx.win();
  g.burst(OX, OY - 100, ['#fde047', '#fff', '#ef4444'], 70, 420, 1.2, 5);
  if (S.lv >= OPPS.length - 1) { S.phase = 'roundEnd'; S.t = 1.5; S.after = () => g.win(`🏆 세계 챔피언! ${O.n}에게 ${how}`); say(`${how} 승!!`, '#fde047', 2); return; }
  S.phase = 'result'; S.how = how;
}
function loseFight(g, how) { S.phase = 'roundEnd'; S.t = 1.5; S.after = () => g.over(`${OPPS[S.lv].n}에게 ${how}`); say(how, '#f87171', 2); }
/* ---------------- 그리기 ---------------- */
function draw(g, c) {
  const O = OPPS[S.lv], o = S.o, p = S.p;
  // 관중 & 링
  g.rect(0, 0, 900, 640, '#0a0a14');
  for (let i = 0; i < 70; i++) { const x = (i * 131) % 900, y = 40 + ((i * 71) % 150); g.circle(x, y, 9, `hsl(${(i * 37) % 360},25%,${20 + (i % 3) * 6}%)`); }
  for (let i = 0; i < 6; i++) if (Math.random() < 0.02) g.circle(Math.random() * 900, 40 + Math.random() * 150, 20, 'rgba(255,255,255,.5)');
  g.poly([[0, 640], [900, 640], [760, 330], [140, 330]], '#1e3a8a');
  g.poly([[60, 640], [840, 640], [730, 350], [170, 350]], '#2563eb');
  for (const [y, col] of [[250, '#ef4444'], [285, '#f8fafc'], [320, '#ef4444']]) g.line(0, y + 60, 900, y + 60, col, 4);
  g.rect(120, 220, 14, 160, '#94a3b8'); g.rect(766, 220, 14, 160, '#94a3b8');
  // 상대
  const sway = o.s === 'idle' ? Math.sin(o.sway * 2.2) * 14 : 0;
  const down = o.s === 'down';
  const bx = OX + sway + o.hx * 0.4, by = OY + (down ? 120 : 0);
  c.save();
  if (down) { c.translate(bx, by + 60); c.rotate(0.35); c.translate(-bx, -(by + 60)); c.globalAlpha = 0.9; }
  const skin = S.oflash > 0 ? '#fff' : O.skin;
  // 몸통
  g.rrect(bx - 85, by - 40, 170, 170, 40, skin);
  g.rrect(bx - 80, by + 95, 160, 90, 12, O.trunk); g.rect(bx - 80, by + 95, 160, 14, '#fff');
  // 머리
  const hx = bx + o.hx, hy = by - 95 + o.hy;
  g.rect(hx - 22, hy + 30, 44, 30, skin);
  g.circle(hx, hy, 52, skin);
  g.poly([[hx - 50, hy - 20], [hx - 40, hy - 52], [hx, hy - 60], [hx + 40, hy - 52], [hx + 50, hy - 20], [hx + 30, hy - 38], [hx - 30, hy - 38]], O.hair);
  const stunned = o.s === 'open' || o.s === 'stun' || down;
  if (stunned) { g.text('x', hx - 18, hy - 4, 22, '#111'); g.text('x', hx + 18, hy - 4, 22, '#111'); for (let i = 0; i < 3; i++) { const a = g.time * 4 + i * 2.1; g.text('⭐', hx + Math.cos(a) * 46, hy - 62 + Math.sin(a) * 10, 16); } }
  else { g.circle(hx - 18, hy - 4, 6, '#fff'); g.circle(hx + 18, hy - 4, 6, '#fff'); g.circle(hx - 18, hy - 3, 3, '#111'); g.circle(hx + 18, hy - 3, 3, '#111'); g.line(hx - 30, hy - 18, hx - 8, hy - (o.s === 'wind' ? 10 : 15), '#111', 4); g.line(hx + 30, hy - 18, hx + 8, hy - (o.s === 'wind' ? 10 : 15), '#111', 4); }
  g.rrect(hx - 14, hy + 20, 28, o.s === 'strike' ? 12 : 6, 3, '#7f1d1d');
  // 글러브
  drawOGloves(g, c, bx, by, hx, hy);
  c.restore();
  // 예비동작 표시
  if (o.s === 'wind') {
    const A = ATK[o.atk], k = 1 - o.t / o.T;
    const col = o.atk === 'body' ? '#60a5fa' : o.atk === 'upper' ? '#f97316' : '#ef4444';
    g.text('❗', hx + 70, hy - 70, 34 + k * 10);
    g.rrect(OX - 80, 110, 160, 30, 8, 'rgba(0,0,0,.6)'); g.text(A.n, OX, 125, 16, col);
    const hint = A.need === 'L' ? '← 회피' : A.need === 'R' ? '회피 →' : A.need === 'guard' ? '↓ 가드' : '←/→ 회피';
    g.text(hint, OX, 152, 13, '#e2e8f0');
  }
  if (o.s === 'idle') g.text(o.guard === 'high' ? '얼굴 가드' : '바디 가드', OX, 125, 13, 'rgba(255,255,255,.55)');
  // 플레이어
  drawPlayer(g, c);
  if (S.flash > 0) g.rect(0, 0, 900, 640, `rgba(239,68,68,${S.flash * 0.35})`);
  drawHUD(g, c);
  if (S.phase === 'ocount' || S.phase === 'pcount') {
    g.text(S.count + '', 450, 260, 110, '#fff');
    if (S.phase === 'pcount') {
      g.rrect(300, 380, 300, 26, 8, 'rgba(0,0,0,.6)'); g.rrect(302, 382, 296 * Math.min(1, S.p.mash / S.need), 22, 7, '#22c55e');
      g.text('연타! (Space/X/클릭)', 450, 430, 22, '#fde047');
    }
  }
  if (S.msgT > 0) { g.rrect(250, 190, 400, 56, 14, 'rgba(0,0,0,.65)'); g.text(S.msg, 450, 218, 26, S.msgC); }
  if (S.phase === 'result') {
    g.rrect(180, 200, 540, 340, 18, 'rgba(0,0,0,.9)', '#fde047', 3);
    g.text(`🥊 ${S.how} 승리!`, 450, 250, 34, '#fde047');
    g.text(`랭킹 상승! → ${OPPS[S.lv].rank}위`, 450, 300, 20, '#86efac');
    const N = OPPS[S.lv + 1];
    g.text('다음 상대', 450, 350, 16, '#94a3b8');
    g.text(`${N.n} (랭킹 ${N.rank}위)`, 450, 385, 24, '#fff');
    g.text(`체력 ${N.hp} · 속도 ${Math.round((1 / N.wind) * 100)}%`, 450, 420, 15, '#cbd5e1');
    g.button(330, 470, 240, 56, '다음 경기 ▶', '#dc2626', 22);
  }
  if (S.phase === 'intro') { g.text(`VS  ${O.n}`, 450, 420, 40, '#fff'); g.text(`랭킹 ${O.rank}위`, 450, 465, 20, '#fde047'); }
}
function drawOGloves(g, c, bx, by, hx, hy) {
  const o = S.o, gc = '#b91c1c';
  let L = [bx - 55, hy + 45, 34], R = [bx + 55, hy + 45, 34];
  if (o.guard === 'low' && o.s === 'idle') { L = [bx - 50, by + 40, 34]; R = [bx + 50, by + 40, 34]; }
  if (o.s === 'open' || o.s === 'stun') { L = [bx - 110, by + 60, 32]; R = [bx + 110, by + 60, 32]; }
  if (o.s === 'down') { L = [bx - 120, by + 80, 30]; R = [bx + 120, by + 80, 30]; }
  if (o.s === 'wind' || o.s === 'strike') {
    const k = o.s === 'wind' ? 1 - o.t / o.T : 1, st = o.s === 'strike';
    const shake = o.s === 'wind' && k > 0.6 ? Math.sin(S.o.sway * 60) * 4 : 0;
    if (o.atk === 'jab') L = st ? [OX - 10, 420, 90] : [bx - 70 + shake, hy + 30 - k * 20, 38];
    if (o.atk === 'hookL') L = st ? [OX - 60, 400, 95] : [bx - 120 - k * 70 + shake, hy - k * 20, 38 + k * 8];
    if (o.atk === 'hookR') R = st ? [OX + 60, 400, 95] : [bx + 120 + k * 70 + shake, hy - k * 20, 38 + k * 8];
    if (o.atk === 'upper') R = st ? [OX + 10, 360, 100] : [bx + 60 + shake, by + 120 + k * 40, 38];
    if (o.atk === 'body') { L = st ? [OX - 20, 520, 95] : [bx - 90 + shake, by + 70 + k * 10, 38]; }
    if (o.s === 'wind' && k > 0.5) { const G = o.atk === 'hookR' || o.atk === 'upper' ? R : L; g.ring(G[0], G[1], G[2] + 8 + Math.sin(S.o.sway * 30) * 4, 'rgba(250,204,21,.8)', 4); }
  }
  for (const [x, y, r] of [L, R]) { g.circle(x, y, r, gc); g.circle(x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,.25)'); g.rect(x - r * 0.6, y + r * 0.55, r * 1.2, r * 0.35, '#fff'); }
}
function drawPlayer(g, c) {
  const p = S.p;
  let dx = 0, dy = 0;
  if (p.act === 'dodgeL') dx = -170 * Math.sin(Math.min(1, (0.42 - p.t) / 0.12) * Math.PI / 2);
  if (p.act === 'dodgeR') dx = 170 * Math.sin(Math.min(1, (0.42 - p.t) / 0.12) * Math.PI / 2);
  if (p.act === 'hurt') { dx = Math.sin(p.t * 60) * 10; dy = 14; }
  if (S.phase === 'pcount') dy = 200;
  const x = OX + dx, y = 560 + dy;
  c.save(); c.globalAlpha = 0.88;
  g.rrect(x - 120, y + 10, 240, 140, 50, '#1f2937');
  g.circle(x, y - 10, 46, '#111827'); g.rect(x - 46, y - 18, 92, 10, '#16a34a');
  let L = [x - 100, y - 40], R = [x + 100, y - 40];
  if (p.act === 'guard') { L = [x - 40, y - 70]; R = [x + 40, y - 70]; }
  if (p.act === 'punch') {
    const P = p.punch, k = Math.sin(U.clamp(1 - p.t / P.t, 0, 1) * Math.PI);
    const tx = OX + (P.side < 0 ? -40 : 40), ty = p.body ? OY + 30 : P.k === 'upper' ? OY - 70 : OY - 90;
    if (P.side < 0) L = [U.lerp(L[0], tx, k), U.lerp(L[1], ty, k)]; else R = [U.lerp(R[0], tx, k), U.lerp(R[1], ty, k)];
  }
  for (const [gx, gy] of [L, R]) { g.circle(gx, gy, 40, '#16a34a'); g.circle(gx - 12, gy - 12, 13, 'rgba(255,255,255,.25)'); }
  c.restore();
}
function drawHUD(g, c) {
  const O = OPPS[S.lv];
  const bar = (x, w, v, max, col, label, right) => {
    g.rrect(x, 14, w, 22, 6, 'rgba(0,0,0,.6)');
    const ww = (w - 4) * U.clamp(v / max, 0, 1);
    g.rrect(right ? x + w - 2 - ww : x + 2, 16, ww, 18, 5, col);
    g.text(label, right ? x + w : x, 48, 14, '#fff', right ? 'right' : 'left');
  };
  bar(20, 330, S.php, 100, S.php > 30 ? '#22c55e' : '#ef4444', '나 (도전자)');
  bar(550, 330, S.ophp, O.hp, '#f97316', O.n, true);
  g.rrect(395, 8, 110, 50, 10, 'rgba(0,0,0,.7)');
  g.text(`R${S.round}`, 450, 22, 14, '#fde047'); g.text(`${Math.max(0, Math.ceil(S.rt))}`, 450, 44, 22, '#fff');
  g.text('스태미나', 20, 600, 12, '#94a3b8', 'left');
  g.rrect(80, 592, 160, 14, 5, 'rgba(255,255,255,.1)'); g.rrect(80, 592, 160 * S.stam / 100, 14, 5, S.tired > 0 ? '#ef4444' : '#38bdf8');
  g.text('⭐'.repeat(S.stars) + '☆'.repeat(3 - S.stars), 20, 625, 18, '#fde047', 'left');
  g.text(`다운 ${S.kd[0]} / 피다운 ${S.kd[1]}`, 880, 600, 13, '#cbd5e1', 'right');
  g.text(`${S.lv + 1}/5전`, 880, 625, 15, '#fde047', 'right');
}
