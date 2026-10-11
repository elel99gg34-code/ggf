'use strict';
let S;
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const BX = 350, BY = 370, SC = 1.48;
const OPP = [
  { n: '동네 고수 김씨', e: '🧔', sig: 26, d: '펍에서 30년 던진 아저씨' },
  { n: '펍 챔피언 레이', e: '👨', sig: 19, d: '지역 리그 우승자' },
  { n: '프로 루키 민', e: '🧑', sig: 14, d: '떠오르는 신예' },
  { n: '세계 랭커 더 파워', e: '🤴', sig: 9.5, d: '세계 랭킹 1위' },
];
const FINALS = [];
const ALL = [];
(function () {
  const pref = [20, 16, 18, 12, 10, 8, 19, 17, 15, 14, 13, 11, 9, 7, 6, 5, 4, 3, 2, 1];
  for (const n of pref) FINALS.push({ n, m: 2, v: n * 2, l: 'D' + n });
  FINALS.push({ n: 50, m: 1, v: 50, l: 'BULL' });
  for (let n = 20; n >= 1; n--) ALL.push({ n, m: 3, v: n * 3, l: 'T' + n });
  for (let n = 20; n >= 1; n--) ALL.push({ n, m: 1, v: n, l: 'S' + n });
  ALL.push({ n: 25, m: 1, v: 25, l: '25' });
  for (const f of FINALS) ALL.push(f);
})();
GAME({
  title: '다트 501', w: 1000, h: 720, bg: '#10221a', controls: 'dpad+ab', aLabel: '던지기', bLabel: '숨참기',
  help: '마우스로 조준 · 클릭(또는 Space)으로 던지기 · 방향키로도 조준 이동\nX/Shift 꾹: 숨 참기 (흔들림 크게 감소, 숨 게이지 소모)\n501점을 정확히 0으로! 마지막 다트는 더블(바깥 좁은 링) 또는 불스아이\n0 미만 / 1 남음 / 더블이 아닌 0 = 버스트 (턴 무효)\n3레그 선승 · 4명의 상대를 꺾고 세계 챔피언에!',
  init(g) {
    S = { opp: 0, ax: BX, ay: BY - 150, sw: 0, breath: 1, tired: false, stuck: [], fly: null, msg: '', msgT: 0, wait: 0, then: null, aiAim: { x: BX, y: BY }, hist: [[], []], stats: { n180: 0, best: 0 } };
    newMatch();
  },
  update(g, dt) {
    S.msgT -= dt; S.sw += dt;
    if (S.phase === 'next') {
      if (g.pressed('a') || g.clickIn(720, 560, 220, 56)) { newMatch(); g.sfx.click(); }
      return;
    }
    if (S.fly) {
      const f = S.fly; f.t += dt / 0.28;
      if (f.t >= 1) { S.fly = null; land(g, f); }
      return;
    }
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0 && S.then) { const fn = S.then; S.then = null; fn(); } return; }
    // 숨 참기
    const hold = g.held('b') && !S.tired && S.breath > 0;
    if (hold) { S.breath -= dt / 2.4; if (S.breath <= 0) { S.breath = 0; S.tired = true; g.sfx.tone(180, 0.3, 'sine', 0.05); } }
    else { S.breath = Math.min(1, S.breath + dt / 4); if (S.breath > 0.35) S.tired = false; }
    S.hold = hold;
    if (S.phase === 'aim') {
      if (g.mouse.moved) { S.ax = g.mouse.x; S.ay = g.mouse.y; }
      S.ax = U.clamp(S.ax + (g.right - g.left) * 240 * dt, 20, 690); S.ay = U.clamp(S.ay + (g.down - g.up) * 240 * dt, 20, 700);
      if ((g.mouse.clicked && g.mouse.x < 700) || g.pressed('a')) {
        const [ox, oy] = sway();
        throwDart(g, 0, S.ax + ox + gauss() * 2.5 * SC, S.ay + oy + gauss() * 2.5 * SC);
      }
    } else if (S.phase === 'ai') {
      S.aiT -= dt;
      const t = S.aiTarget;
      S.aiAim.x += (t.x - S.aiAim.x) * Math.min(1, dt * 4); S.aiAim.y += (t.y - S.aiAim.y) * Math.min(1, dt * 4);
      if (S.aiT <= 0) {
        const sig = OPP[S.opp].sig * (S.rem[1] <= 40 ? 1.1 : 1) * SC;
        throwDart(g, 1, t.x + gauss() * sig, t.y + gauss() * sig);
      }
    }
    g.info = `상대 ${S.opp + 1}/4 · 레그 ${S.legs[0]}-${S.legs[1]}`;
  },
  draw(g, c) {
    drawBoard(g, c);
    for (const d of S.stuck) drawDart(g, d.x, d.y, d.who, 1);
    if (S.fly) {
      const f = S.fly, t = f.t, x = U.lerp(f.sx, f.x, t), y = U.lerp(f.sy, f.y, t) - Math.sin(t * Math.PI) * 60;
      drawDart(g, x, y, f.who, 1 + (1 - t) * 1.6);
    }
    if (S.phase === 'aim' && !S.fly && S.wait <= 0) {
      const [ox, oy] = sway(), x = S.ax + ox, y = S.ay + oy;
      g.ring(S.ax, S.ay, 8, 'rgba(255,255,255,.25)', 1);
      g.ring(x, y, 11, S.hold ? '#67e8f9' : '#fde047', 2);
      g.line(x - 18, y, x - 5, y, '#fde047', 2); g.line(x + 5, y, x + 18, y, '#fde047', 2);
      g.line(x, y - 18, x, y - 5, '#fde047', 2); g.line(x, y + 5, x, y + 18, '#fde047', 2);
      g.circle(x, y, 2, '#ef4444');
    }
    if (S.phase === 'ai' && !S.fly && S.wait <= 0) g.ring(S.aiAim.x, S.aiAim.y, 10, 'rgba(248,113,113,.7)', 2);
    drawPanel(g, c);
    if (S.msgT > 0) {
      g.rrect(BX - 190, 20, 380, 56, 12, 'rgba(0,0,0,.7)');
      g.text(S.msg, BX, 48, 28, S.msgC || '#fde047');
    }
    if (S.phase === 'next') {
      g.rrect(150, 220, 700, 260, 18, 'rgba(0,0,0,.85)', '#fde047', 3);
      const o = OPP[S.opp];
      g.text('🏆 매치 승리!', 500, 270, 34, '#fde047');
      g.text('다음 상대', 500, 320, 18, '#a7f3d0');
      g.emoji(o.e, 330, 390, 64);
      g.text(o.n, 520, 375, 28, '#fff'); g.text(o.d, 520, 410, 16, '#cbd5e1');
      g.button(720, 560, 220, 56, '다음 매치 ▶', '#16a34a', 22);
    }
  },
});
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function sway() {
  const t = S.sw, amp = (15 + S.opp * 1.5) * SC * (S.hold ? 0.28 : 1) * (S.rem && S.rem[0] <= 40 ? 1.25 : 1) * (S.tired ? 1.3 : 1);
  return [Math.sin(t * 1.7) * amp + Math.sin(t * 3.3 + 1) * amp * 0.45, Math.cos(t * 1.25) * amp + Math.sin(t * 2.7 + 2) * amp * 0.4];
}
function newMatch() {
  S.legs = [0, 0]; S.leg = 0; S.phase = 'wait';
  newLeg();
  say(`VS ${OPP[S.opp].n}`, '#fde047', 2);
}
function newLeg() {
  S.rem = [501, 501]; S.turn = S.leg % 2; S.hist = [[], []];
  startTurn();
}
function startTurn() {
  S.darts = []; S.turnStart = S.rem[S.turn]; S.stuck = [];
  S.phase = S.turn === 0 ? 'aim' : 'ai';
  if (S.turn === 1) planAI(0.9);
}
function say(m, c = '#fde047', t = 1.5) { S.msg = m; S.msgC = c; S.msgT = t; }
function scoreAt(px, py) {
  const dx = (px - BX) / SC, dy = (py - BY) / SC, r = Math.hypot(dx, dy);
  if (r <= 6.35) return { v: 50, dbl: true, l: 'BULL' };
  if (r <= 15.9) return { v: 25, dbl: false, l: '25' };
  if (r > 170) return { v: 0, dbl: false, l: '아웃' };
  let a = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const idx = Math.floor((((a + 9) % 360) + 360) % 360 / 18), n = ORDER[idx];
  if (r >= 99 && r <= 107) return { v: n * 3, dbl: false, l: 'T' + n };
  if (r >= 162) return { v: n * 2, dbl: true, l: 'D' + n };
  return { v: n, dbl: false, l: '' + n };
}
function targetPos(t) {
  if (t.n === 50) return { x: BX, y: BY };
  if (t.n === 25) return { x: BX, y: BY - 11 * SC };
  const r = t.m === 3 ? 103 : t.m === 2 ? 166 : 135, a = (ORDER.indexOf(t.n) * 18 * Math.PI) / 180;
  return { x: BX + Math.sin(a) * r * SC, y: BY - Math.cos(a) * r * SC };
}
const COCACHE = {};
function checkout(rem, darts) {
  const key = rem + '_' + darts;
  if (key in COCACHE) return COCACHE[key];
  let res = null;
  if (rem <= 170 && rem > 1) {
    for (const f of FINALS) if (f.v === rem) { res = [f]; break; }
    if (!res && darts >= 2) outer: for (const a of ALL) for (const f of FINALS) if (a.v + f.v === rem) { res = [a, f]; break outer; }
    if (!res && darts >= 3) outer2: for (const a of ALL) { if (a.m !== 3 && a.n !== 25 && a.v < 20) continue; for (const b of ALL) for (const f of FINALS) if (a.v + b.v + f.v === rem) { res = [a, b, f]; break outer2; } }
  }
  return (COCACHE[key] = res);
}
function planAI(t) {
  const rem = S.rem[1], left = 3 - S.darts.length;
  const co = checkout(rem, left);
  let tg;
  if (co) tg = co[0];
  else if (rem > 1 && rem <= 60) {
    tg = null;
    for (const f of FINALS) { const s = rem - f.v; if (s >= 1 && s <= 20) { tg = { n: s, m: 1 }; break; } }
    tg = tg || { n: 1, m: 1 };
  } else tg = Math.random() < 0.8 ? { n: 20, m: 3 } : { n: 19, m: 3 };
  S.aiTarget = targetPos(tg); S.aiT = t;
}
function throwDart(g, who, x, y) {
  S.fly = { who, sx: who ? 900 : S.ax + 60, sy: 760, x, y, t: 0 };
  g.sfx.tone(700, 0.12, 'sine', 0.04, 300);
}
function land(g, f) {
  const who = f.who, r = scoreAt(f.x, f.y);
  S.stuck.push({ x: f.x, y: f.y, who });
  S.darts.push(r);
  g.sfx.tone(r.v ? 180 : 90, 0.06, 'square', 0.08);
  g.burst(f.x, f.y, r.dbl ? '#ef4444' : '#fde047', r.v >= 40 ? 18 : 6, 140, 0.4);
  if (r.v >= 50 || r.l[0] === 'T') g.shake(3, 0.12);
  g.float(f.x, f.y - 26, r.l === '아웃' ? '아웃' : `${r.l}${r.l[0] === 'T' || r.l[0] === 'D' ? ' = ' + r.v : ''}`, r.dbl ? '#fca5a5' : '#fff', 20);
  const nr = S.rem[who] - r.v;
  if (nr < 0 || nr === 1 || (nr === 0 && !r.dbl)) {
    S.rem[who] = S.turnStart;
    say('BUST! 💥', '#f87171', 1.3); g.sfx.hit(); g.shake(5, 0.2);
    return endTurn(g, true);
  }
  S.rem[who] = nr;
  if (who === 0) g.add(r.v);
  if (nr === 0) return legWon(g, who);
  if (S.darts.length >= 3) return endTurn(g);
  if (who === 1) planAI(0.75 + Math.random() * 0.4);
}
function endTurn(g, bust) {
  const tot = bust ? 0 : S.darts.reduce((s, d) => s + d.v, 0);
  S.hist[S.turn].unshift(bust ? 'BUST' : tot);
  if (!bust && tot === 180) { say('🎯 ONE HUNDRED AND EIGHTY!', '#fde047', 2.2); g.sfx.win(); if (S.turn === 0) { g.add(500); S.stats.n180++; } g.burst(BX, BY, ['#fde047', '#ef4444', '#22c55e'], 60, 400, 1); }
  else if (!bust && tot >= 100) say(`${S.turn ? OPP[S.opp].n : '나'}: ${tot}점!`, '#a7f3d0', 1.3);
  S.phase = 'wait'; S.wait = 1.3;
  S.then = () => { S.turn = 1 - S.turn; startTurn(); };
}
function legWon(g, who) {
  const co = S.turnStart;
  S.legs[who]++;
  if (who === 0) { g.add(300 + co * 3, BX, BY); say(`체크아웃 ${co}! 레그 획득 🎉`, '#4ade80', 2); g.sfx.coin(); g.burst(BX, BY, ['#4ade80', '#fff'], 40, 300); }
  else { say(`${OPP[S.opp].n} 체크아웃 ${co}`, '#f87171', 2); g.sfx.lose(); }
  S.phase = 'wait'; S.wait = 2.2;
  if (S.legs[who] >= 3) {
    S.then = () => {
      if (who === 0) {
        g.add(1500 * (S.opp + 1));
        S.opp++;
        if (S.opp >= OPP.length) return g.win(`세계 챔피언! 180 × ${S.stats.n180}`);
        S.phase = 'next'; g.sfx.win();
      } else g.over(`${OPP[S.opp].n}에게 ${S.legs[0]}-${S.legs[1]} 패배`);
    };
  } else S.then = () => { S.leg++; newLeg(); };
}
function wedge(c, r0, r1, a0, a1, col) {
  c.beginPath(); c.arc(BX, BY, r1, a0, a1); c.arc(BX, BY, r0, a1, a0, true); c.closePath(); c.fillStyle = col; c.fill();
}
function drawBoard(g, c) {
  g.rect(0, 0, 700, 720, '#1f3b2b');
  for (let i = 0; i < 8; i++) g.rect(0, i * 90, 700, 45, 'rgba(0,0,0,.08)');
  g.circle(BX + 6, BY + 10, 225 * SC, 'rgba(0,0,0,.4)');
  g.circle(BX, BY, 225 * SC, '#0b0b0b');
  g.ring(BX, BY, 225 * SC, '#78350f', 10);
  const s = SC;
  for (let i = 0; i < 20; i++) {
    const a0 = ((i * 18 - 9 - 90) * Math.PI) / 180, a1 = a0 + (18 * Math.PI) / 180, ev = i % 2 === 0;
    wedge(c, 162 * s, 170 * s, a0, a1, ev ? '#dc2626' : '#16a34a');
    wedge(c, 107 * s, 162 * s, a0, a1, ev ? '#111' : '#f5e9c8');
    wedge(c, 99 * s, 107 * s, a0, a1, ev ? '#dc2626' : '#16a34a');
    wedge(c, 15.9 * s, 99 * s, a0, a1, ev ? '#111' : '#f5e9c8');
    const am = (i * 18 * Math.PI) / 180;
    g.text(ORDER[i] + '', BX + Math.sin(am) * 194 * s, BY - Math.cos(am) * 194 * s, 22, '#fff');
  }
  c.strokeStyle = '#a3a3a3'; c.lineWidth = 1;
  for (const r of [15.9, 99, 107, 162, 170]) { c.beginPath(); c.arc(BX, BY, r * s, 0, Math.PI * 2); c.stroke(); }
  g.circle(BX, BY, 15.9 * s, '#16a34a'); g.circle(BX, BY, 6.35 * s, '#dc2626');
}
function drawDart(g, x, y, who, k) {
  const col = who ? '#f87171' : '#60a5fa';
  g.line(x, y, x + 10 * k, y + 22 * k, '#d4d4d8', 2 * k);
  g.line(x + 10 * k, y + 22 * k, x + 15 * k, y + 34 * k, col, 4 * k);
  g.poly([[x + 15 * k, y + 34 * k], [x + 8 * k, y + 46 * k], [x + 22 * k, y + 44 * k]], col);
  g.circle(x, y, 1.6, '#fff');
}
function drawPanel(g, c) {
  g.rect(700, 0, 300, 720, '#0b1711');
  const o = OPP[S.opp] || OPP[OPP.length - 1];
  const box = (who, y) => {
    const act = S.turn === who && S.phase !== 'next';
    g.rrect(715, y, 270, 190, 14, act ? 'rgba(250,204,21,.12)' : 'rgba(255,255,255,.04)', act ? '#facc15' : 'rgba(255,255,255,.15)', 2);
    g.emoji(who ? o.e : '🙂', 750, y + 35, 38);
    g.text(who ? o.n : '나 (플레이어)', 780, y + 28, 16, '#fff', 'left');
    g.text('레그 ' + '●'.repeat(S.legs[who]) + '○'.repeat(3 - S.legs[who]), 780, y + 50, 14, '#a7f3d0', 'left');
    g.text(S.rem[who] + '', 850, y + 105, 64, who ? '#fca5a5' : '#93c5fd');
    g.text('최근: ' + S.hist[who].slice(0, 4).join(' · '), 850, y + 165, 13, '#94a3b8');
  };
  box(0, 20); box(1, 225);
  g.text('이번 턴', 850, 440, 16, '#a7f3d0');
  for (let i = 0; i < 3; i++) {
    const d = S.darts[i];
    g.rrect(728 + i * 86, 460, 76, 46, 8, 'rgba(255,255,255,.07)');
    g.text(d ? (d.l === '아웃' ? '0' : d.l) : '-', 766 + i * 86, 483, 18, d && d.dbl ? '#fca5a5' : '#fff');
  }
  if (S.turn === 0 && S.phase === 'aim') {
    const co = checkout(S.rem[0], 3 - S.darts.length);
    g.text('체크아웃 추천', 850, 535, 15, '#a7f3d0');
    g.text(co ? co.map((t) => t.l).join(' → ') : S.rem[0] > 170 ? 'T20 노리기' : '세팅 필요', 850, 562, 20, '#fde047');
  }
  g.text('숨', 730, 610, 14, '#cbd5e1');
  g.rrect(750, 602, 220, 16, 6, 'rgba(255,255,255,.1)');
  g.rrect(750, 602, 220 * S.breath, 16, 6, S.tired ? '#f87171' : '#67e8f9');
  g.text('X/Shift 꾹: 숨 참기', 850, 640, 13, '#94a3b8');
  g.text(`매치 ${S.opp + 1} / ${OPP.length}`, 850, 690, 16, '#fde047');
}
