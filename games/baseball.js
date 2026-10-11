'use strict';
let S;
const ZX = 480, ZY = 455, ZW = 64, ZH = 80, RX = 498, RY = 238;
const PT = [
  { n: '직구', k: 'FB', T: 0.5, bx: 0, by: -0.12, c: '#ef4444' },
  { n: '커브', k: 'CB', T: 0.7, bx: 0.35, by: 1.15, c: '#3b82f6' },
  { n: '슬라이더', k: 'SL', T: 0.6, bx: 0.95, by: 0.35, c: '#22c55e' },
  { n: '체인지업', k: 'CH', T: 0.68, bx: -0.3, by: 0.5, c: '#eab308' },
  { n: '포크', k: 'FK', T: 0.62, bx: 0, by: 1.35, c: '#a855f7' },
];
const LINEUP = ['이정후', '김하성', '최정', '양의지', '강백호', '노시환', '박해민', '오지환', '김혜성'];
const CPUS = ['오타니', '저지', '베츠', '트라웃', '소토', '프리먼', '알바레즈', '하퍼', '린도어'];
GAME({
  title: '홈런 더비 야구', w: 960, h: 640, bg: '#0c1a2e', controls: 'dpad+ab', aLabel: '스윙/투구', bLabel: '구종',
  help: '[타격] 마우스/방향키로 배트 위치 · 클릭/Space로 스윙\n공의 색으로 구종을 읽어라: 🔴직구 🔵커브 🟢슬라이더 🟡체인지업 🟣포크\n변화구는 마지막에 휜다! 배트를 공 살짝 아래에 대면 뜬공(홈런각), 위면 땅볼\n[투구] 1~5 또는 X로 구종 선택 · 마우스/방향키로 코스 · 클릭/Space로 투구\n9이닝 · 우리는 홈팀(말 공격) · 이기면 승리!',
  init(g) {
    S = { inn: 1, top: true, outs: 0, b: 0, s: 0, bases: [0, 0, 0], runs: [0, 0], line: [[], []], hits: [0, 0], hr: 0, bi: [0, 0],
      phase: 'ready', t: 1.5, ball: null, swing: null, cur: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, sel: 0, stamina: 1, used: [0, 0, 0, 0, 0], msg: '', msgT: 0, msgC: '#fff', hit: null, cpuSwing: null, ks: 0, pitchN: 0 };
    banner('1회 초 · 수비 시작', '#93c5fd');
    g.info = '1회 초';
  },
  update(g, dt) {
    S.msgT -= dt;
    const batting = !S.top;
    // 커서
    if (g.mouse.moved || g.mouse.down) { const x = (g.mouse.x - ZX) / ZW, y = (g.mouse.y - ZY) / ZH; if (batting) { S.cur.x = x; S.cur.y = y; } else if (g.mouse.y < 560) { S.aim.x = x; S.aim.y = y; } }
    const o = batting ? S.cur : S.aim;
    o.x = U.clamp(o.x + (g.right - g.left) * 3 * dt, -1.9, 1.9); o.y = U.clamp(o.y + (g.down - g.up) * 3 * dt, -1.9, 1.9);
    if (S.swing) S.swing.t += dt;
    if (S.cpuSwing) S.cpuSwing.t += dt;
    if (S.phase === 'ready') {
      S.t -= dt;
      if (S.t <= 0) {
        if (batting) { S.phase = 'windup'; S.t = 0.9; S.cpuPitch = cpuChoose(); }
        else S.phase = 'choose';
      }
    } else if (S.phase === 'choose') {
      for (let i = 0; i < 5; i++) if (g.keyp('Digit' + (i + 1))) { S.sel = i; g.sfx.click(); }
      if (g.pressed('b')) { S.sel = (S.sel + 1) % 5; g.sfx.click(); }
      for (let i = 0; i < 5; i++) if (g.clickIn(170 + i * 128, 584, 118, 44)) { S.sel = i; g.sfx.click(); return; }
      if (g.pressed('a') || (g.mouse.clicked && g.mouse.y < 560)) {
        const noise = 0.18 + (1 - S.stamina) * 0.45;
        S.used[S.sel]++;
        S.stamina = Math.max(0, S.stamina - 0.012 - (S.sel ? 0.006 : 0));
        S.phase = 'windup'; S.t = 0.7;
        S.cpuPitch = { type: S.sel, x: S.aim.x + U.rand(-noise, noise), y: S.aim.y + U.rand(-noise, noise) };
      }
    } else if (S.phase === 'windup') {
      S.t -= dt;
      if (S.t <= 0) { startPitch(g, S.cpuPitch); }
    } else if (S.phase === 'pitch') {
      const B = S.ball; B.el += dt;
      if (batting) {
        if ((g.pressed('a') || g.mouse.clicked) && !S.swing) { S.swing = { t: 0, at: B.el + 0.07, done: false }; g.sfx.tone(140, 0.12, 'triangle', 0.05, 80); }
        if (S.swing && !S.swing.done && B.el >= S.swing.at) { S.swing.done = true; contact(g, B.el - B.T, true); if (S.phase !== 'pitch') return; }
      } else cpuBat(g, B);
      if (B.el >= B.T + 0.14 && S.phase === 'pitch') {
        if (S.swing && S.swing.done || S.cpuSwing && S.cpuSwing.miss) strike(g, true);
        else if (Math.abs(B.px) <= 1.05 && Math.abs(B.py) <= 1.05) strike(g, false);
        else ball(g);
      }
    } else if (S.phase === 'hit') {
      const H = S.hit; H.t += dt;
      if (H.t >= H.dur) resolveHit(g);
    } else if (S.phase === 'result') {
      S.t -= dt; if (S.t <= 0) nextPitch(g);
    } else if (S.phase === 'change') {
      S.t -= dt; if (S.t <= 0) { S.phase = 'ready'; S.t = 0.6; }
    }
    g.info = `${S.inn}회 ${S.top ? '초' : '말'} · ${S.runs[1]} : ${S.runs[0]}`;
  },
  draw(g, c) { drawScene(g, c); },
});
function banner(m, col = '#fde047', t = 1.6) { S.msg = m; S.msgC = col; S.msgT = t; }
function cpuChoose() {
  const w = S.s === 2 ? [2, 3, 3, 2, 3] : S.b === 3 ? [6, 1, 2, 2, 0] : [4, 2, 2, 2, 1.5];
  let r = Math.random() * w.reduce((a, b) => a + b), type = 0;
  for (; type < 4; type++) { r -= w[type]; if (r <= 0) break; }
  const inZ = Math.random() < (S.b === 3 ? 0.85 : S.s === 2 ? 0.45 : 0.62);
  const x = inZ ? U.rand(-0.95, 0.95) : U.choice([-1, 1]) * U.rand(1.1, 1.7), y = inZ ? U.rand(-0.95, 0.95) : U.rand(-1.6, 1.6);
  const fat = Math.min(0.15, S.inn * 0.012);
  return { type, x: x + U.rand(-fat, fat), y: y + U.rand(-fat, fat) };
}
function startPitch(g, p) {
  const P = PT[p.type], speedK = S.top ? 1 : 1 - Math.min(0.12, S.inn * 0.01);
  S.ball = { type: p.type, px: p.x, py: p.y, el: 0, T: P.T * speedK * U.rand(0.96, 1.04), bx: P.bx * (Math.random() < 0.5 && p.type === 3 ? -1 : 1), by: P.by };
  S.phase = 'pitch'; S.swing = null; S.cpuSwing = null;
  g.sfx.tone(500, 0.08, 'sine', 0.04, 900);
  S.pitchN++;
}
function ballPos(B, t) {
  const e = t * t * 0.55 + t * 0.45, br = Math.pow(Math.min(t, 1.2), 3);
  const fx = ZX + (B.px - B.bx) * ZW, fy = ZY + (B.py - B.by) * ZH;
  return [U.lerp(RX, fx, e) + B.bx * ZW * br, U.lerp(RY, fy, e) + B.by * ZH * br, 4 + 13 * e];
}
function cpuBat(g, B) {
  if (S.cpuSwing) return;
  if (B.el < B.T * 0.55) return;
  const inZ = Math.abs(B.px) <= 1 && Math.abs(B.py) <= 1;
  const edge = Math.max(Math.abs(B.px), Math.abs(B.py));
  const pow = 0.85 + ((S.bi[1] % 9) === 3 || (S.bi[1] % 9) === 4 ? 0.2 : 0) + S.inn * 0.01;
  let sw = inZ ? 0.72 : edge < 1.45 ? 0.32 : 0.1;
  if (S.s === 2) sw += 0.15;
  if (S.b === 3 && !inZ) sw -= 0.1;
  const used = S.used[B.type] / Math.max(1, S.used.reduce((a, b) => a + b));
  sw += (used - 0.2) * 0.3;
  if (Math.random() > sw) { S.cpuSwing = { t: -1, miss: false, take: true }; return; }
  let ct = (inZ ? 0.82 - edge * 0.28 : 0.38 - (edge - 1) * 0.5) + (used - 0.2) * 0.5 - (B.type === 4 || B.type === 1 ? 0.08 : 0) + (pow - 1) * 0.3;
  ct -= (1 - S.stamina) * -0.25;
  S.cpuSwing = { t: -(B.T - B.el) + 0.04 };
  if (Math.random() < ct) {
    const dtm = U.rand(-0.1, 0.1) * (1.4 - pow * 0.5), dv = U.rand(-0.45, 0.35) + (B.type === 4 ? 0.15 : 0);
    S.cpuSwing.dtm = dtm; S.cpuSwing.dv = dv; S.cpuSwing.pow = pow;
    g.later(() => { if (S.phase === 'pitch' && S.ball === B) contactCPU(g, B); }, Math.max(0, B.T - B.el));
  } else S.cpuSwing.miss = true;
}
function contactCPU(g, B) {
  const cs = S.cpuSwing;
  const q = U.clamp(1 - Math.abs(cs.dtm) / 0.13 * 0.6 - Math.abs(cs.dv) * 0.5 + U.rand(-0.15, 0.1), 0, 1) * cs.pow;
  launch(g, q, cs.dv, cs.dtm, false);
}
function contact(g, dtm, human) {
  const B = S.ball;
  const [bxs, bys] = ballPos(B, B.el / B.T);
  const ex = (S.cur.x * ZW + ZX - bxs) / ZW, ey = (S.cur.y * ZH + ZY - bys) / ZH;
  const loc = Math.hypot(ex * 0.8, ey * 0.6);
  if (Math.abs(dtm) > 0.13 || loc > 0.55) { S.swing.miss = true; return; }
  const q = U.clamp(1 - Math.abs(dtm) / 0.13 * 0.55 - loc / 0.55 * 0.55 + 0.1, 0, 1);
  launch(g, q, ey, dtm, human);
}
function launch(g, q, dv, dtm, human) {
  // dv > 0: 배트가 공보다 아래 → 뜬공, dv < 0 → 땅볼
  const ang = U.clamp(12 + dv * 70 + U.rand(-6, 6), -25, 70);
  const dir = U.clamp(-dtm / 0.13, -1, 1) * 40 + U.rand(-8, 8);
  let res, dist = 0;
  if (q < 0.22) res = 'foul';
  else if (ang < 6) res = q > 0.82 && Math.random() < 0.55 ? (q > 0.95 && Math.random() < 0.3 ? 2 : 1) : 'go';
  else if (ang < 24) res = q > 0.48 ? (q > 0.94 && Math.random() < 0.4 ? 3 : q > 0.78 ? 2 : 1) : Math.random() < 0.5 ? 'lo' : 1;
  else if (ang < 46) {
    dist = q * 480 * (1 - Math.abs(ang - 31) / 55);
    res = dist >= 370 ? 4 : dist > 320 ? (Math.random() < 0.15 ? 3 : 2) : dist > 260 && Math.random() < 0.3 ? 1 : 'fo';
  } else res = 'po';
  if (Math.abs(dir) > 44 && res !== 4) res = 'foul';
  if (res === 4) dist = Math.max(dist, 375);
  else if (!dist) dist = typeof res === 'number' ? 120 + res * 70 : res === 'go' ? 90 : res === 'po' ? 60 : res === 'foul' ? 150 : 230;
  S.phase = 'hit';
  S.hit = { res, ang, dir, dist, q, t: 0, dur: res === 4 ? 2.6 : res === 'foul' ? 0.9 : 1.7, human };
  g.sfx.tone(q > 0.7 ? 1200 : 600, 0.08, 'square', 0.1, 200); g.sfx.noise(0.08, 0.2);
  g.shake(q > 0.8 ? 8 : 3, 0.2);
  g.burst(ZX + S.cur.x * ZW, ZY + S.cur.y * ZH, ['#fff', '#fde047'], 16, 260);
  if (res === 4) { g.sfx.tone(900, 0.5, 'sawtooth', 0.04, 1800, 0.1); banner('💥 홈런!!!', '#fde047', 2.4); }
}
function resolveHit(g) {
  const H = S.hit, side = S.top ? 1 : 0;
  const names = { go: '땅볼 아웃', fo: '플라이 아웃', lo: '라인드라이브 아웃', po: '팝플라이 아웃' };
  if (H.res === 'foul') { banner('파울', '#cbd5e1', 0.9); if (S.s < 2) S.s++; return after(0.6); }
  if (typeof H.res === 'string') { banner(names[H.res], '#f87171'); return out(g); }
  const n = H.res;
  S.hits[side]++;
  if (side === 0) { g.add(30 + n * 20); if (n === 4) { S.hr++; g.add(300); g.burst(480, 200, ['#fde047', '#ef4444', '#3b82f6', '#fff'], 80, 450, 1.3, 5); g.sfx.win(); } else g.sfx.coin(); }
  else if (n === 4) g.sfx.lose();
  if (n < 4) banner(['', '안타!', '2루타!', '3루타!'][n], side ? '#fca5a5' : '#86efac');
  advance(g, n, false);
  newBatter();
  after(0.9);
}
function advance(g, n, walk) {
  const side = S.top ? 1 : 0;
  let r = 0;
  if (walk) {
    if (S.bases[0]) { if (S.bases[1]) { if (S.bases[2]) r++; S.bases[2] = 1; } S.bases[1] = 1; }
    S.bases[0] = 1;
  } else {
    const nb = [0, 0, 0];
    for (let i = 2; i >= 0; i--) if (S.bases[i]) { const to = i + n + (n === 1 && i === 1 ? 1 : 0); if (to >= 3) r++; else nb[to] = 1; }
    if (n >= 4) r++; else nb[n - 1] = 1;
    S.bases = nb;
  }
  if (r) score(g, side, r);
}
function score(g, side, r) {
  S.runs[side] += r;
  const li = S.inn - 1; S.line[side][li] = (S.line[side][li] || 0) + r;
  if (side === 0) { g.add(100 * r); g.float(480, 160, `+${r}점!`, '#4ade80', 32); }
  else g.float(480, 160, `실점 ${r}`, '#f87171', 28);
  if (!S.top && S.inn >= 9 && S.runs[0] > S.runs[1]) { S.ended = true; g.add(2000); g.later(() => g.win(`끝내기! ${S.runs[0]} : ${S.runs[1]} 승리 · 홈런 ${S.hr}`), 1.5); }
}
function newBatter() { S.b = 0; S.s = 0; S.bi[S.top ? 1 : 0]++; S.used = [0, 0, 0, 0, 0]; }
function after(t) { S.phase = 'result'; S.t = t; }
function strike(g, swung) {
  S.s++;
  g.sfx.tone(swung ? 220 : 330, 0.1, 'square', 0.06);
  if (S.s >= 3) {
    banner(swung ? '헛스윙 삼진!' : '루킹 삼진!', S.top ? '#86efac' : '#f87171');
    if (S.top) { S.ks++; g.add(40); }
    return out(g);
  }
  banner(swung ? '헛스윙 스트라이크' : '스트라이크!', '#fde68a', 0.8);
  after(0.6);
}
function ball(g) {
  S.b++;
  g.sfx.tone(500, 0.06, 'sine', 0.05);
  if (S.b >= 4) { banner('볼넷', '#93c5fd'); advance(g, 1, true); newBatter(); return after(0.8); }
  banner('볼', '#93c5fd', 0.7); after(0.6);
}
function out(g) {
  S.outs++;
  newBatter();
  if (S.outs >= 3) return sideChange(g);
  after(0.9);
}
function sideChange(g) {
  if (S.ended) return;
  S.line[S.top ? 1 : 0][S.inn - 1] = S.line[S.top ? 1 : 0][S.inn - 1] || 0;
  S.outs = 0; S.bases = [0, 0, 0]; S.b = 0; S.s = 0;
  if (S.top) {
    if (S.inn >= 9 && S.runs[0] > S.runs[1]) { g.add(2000); return g.win(`${S.runs[0]} : ${S.runs[1]} 승리! 홈런 ${S.hr}개 · 탈삼진 ${S.ks}`); }
    S.top = false; banner(`${S.inn}회 말 · 공격!`, '#86efac', 1.8);
  } else {
    if (S.inn >= 9 && S.runs[0] !== S.runs[1]) return S.runs[0] > S.runs[1] ? g.win('승리!') : g.over(`${S.runs[0]} : ${S.runs[1]} 패배 · 홈런 ${S.hr}개`);
    if (S.inn >= 12) return g.over(`${S.runs[0]} : ${S.runs[1]} 무승부 (12회)`);
    S.inn++; S.top = true; S.stamina = Math.min(1, S.stamina + 0.12);
    banner(`${S.inn}회 초 · 수비`, '#93c5fd', 1.8);
  }
  S.phase = 'change'; S.t = 1.8;
}
function nextPitch() { S.phase = 'ready'; S.t = 0.5; S.ball = null; }
/* ---------------- 그리기 ---------------- */
function drawScene(g, c) {
  // 관중석/하늘
  g.rect(0, 0, 960, 640, '#0c1a2e');
  for (let i = 0; i < 40; i++) g.circle((i * 97) % 960, 30 + ((i * 53) % 90), 2, 'rgba(255,255,255,.15)');
  g.rect(0, 120, 960, 60, '#1e293b');
  for (let i = 0; i < 80; i++) g.circle(6 + i * 12, 140 + (i % 3) * 12, 4, U.hsl((i * 47) % 360, 50, 55));
  g.rect(0, 180, 960, 14, '#065f46');
  g.poly([[0, 194], [960, 194], [960, 640], [0, 640]], '#15803d');
  for (let i = 0; i < 8; i++) g.poly([[i * 140 - 60, 194], [i * 140 + 10, 194], [i * 200 - 300, 640], [i * 200 - 400, 640]], 'rgba(255,255,255,.04)');
  g.poly([[380, 640], [580, 640], [520, 300], [440, 300]], '#b45309');
  c.save(); c.scale(1, 0.35); g.circle(RX - 18, 270 / 0.35, 60, '#c2853d'); c.restore();
  // 투수
  const wind = S.phase === 'windup' ? 1 - S.t / 0.9 : S.phase === 'pitch' ? 1 : 0;
  g.circle(RX - 18, 222, 9, '#f5d0a9'); g.rect(RX - 26, 230, 16, 30, S.top ? '#1d4ed8' : '#991b1b');
  g.line(RX - 12, 236, RX - 12 + Math.cos(-wind * 4) * 16, 236 + Math.sin(-wind * 4) * 16, '#f5d0a9', 4);
  g.text(S.top ? '나' : 'CPU', RX - 18, 205, 11, '#fff');
  // 홈플레이트/스트라이크존
  g.poly([[ZX - 60, 600], [ZX + 60, 600], [ZX + 60, 615], [ZX, 635], [ZX - 60, 615]], '#f8fafc');
  g.stroke(ZX - ZW, ZY - ZH, ZW * 2, ZH * 2, 'rgba(255,255,255,.55)', 2);
  for (let i = 1; i < 3; i++) { g.line(ZX - ZW + (i * ZW * 2) / 3, ZY - ZH, ZX - ZW + (i * ZW * 2) / 3, ZY + ZH, 'rgba(255,255,255,.15)', 1); g.line(ZX - ZW, ZY - ZH + (i * ZH * 2) / 3, ZX + ZW, ZY - ZH + (i * ZH * 2) / 3, 'rgba(255,255,255,.15)', 1); }
  // 타자
  const batting = !S.top;
  const bx = ZX - 150, by = 470;
  g.rrect(bx - 22, by - 50, 44, 110, 14, batting ? '#1d4ed8' : '#991b1b');
  g.circle(bx, by - 66, 20, '#f5d0a9'); g.circle(bx, by - 72, 21, batting ? '#1e3a8a' : '#7f1d1d');
  const sw = batting ? S.swing : S.cpuSwing && S.cpuSwing.t >= 0 ? S.cpuSwing : null;
  const st = sw ? U.clamp(sw.t / 0.22, 0, 1) : 0;
  const tgt = batting ? { x: ZX + S.cur.x * ZW, y: ZY + S.cur.y * ZH } : { x: ZX, y: ZY };
  const ha = -2.3 + st * 3.2;
  const hx = bx + 18, hy = by - 20;
  if (st > 0 && st < 1) {
    const L = Math.hypot(tgt.x - hx, tgt.y - hy);
    g.line(hx, hy, hx + Math.cos(ha) * L, hy + Math.sin(ha) * L * 0.5 + (tgt.y - hy) * st, '#d6a35c', 10);
  } else g.line(hx, hy, hx + Math.cos(ha) * 90, hy + Math.sin(ha) * 90, '#d6a35c', 9);
  // 공
  if (S.ball && S.phase === 'pitch') {
    const B = S.ball, t = B.el / B.T;
    const [x, y, r] = ballPos(B, Math.min(t, 1.18));
    const P = PT[B.type];
    for (let k = 1; k <= 4; k++) { const [tx, ty, tr] = ballPos(B, Math.max(0, t - k * 0.04)); g.circle(tx, ty, tr * 0.7, P.c + '33'); }
    g.circle(x + 3, y + 5, r, 'rgba(0,0,0,.25)');
    g.circle(x, y, r, '#fff');
    const sp = g.time * 30;
    c.strokeStyle = P.c; c.lineWidth = Math.max(1.5, r * 0.25);
    c.beginPath(); c.arc(x, y, r * 0.65, sp, sp + 1.6); c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.65, sp + Math.PI, sp + Math.PI + 1.6); c.stroke();
  }
  // 커서 / 조준
  if (batting) {
    const x = ZX + S.cur.x * ZW, y = ZY + S.cur.y * ZH;
    g.ring(x, y, 22, 'rgba(250,204,21,.9)', 3); g.ring(x, y, 9, 'rgba(250,204,21,.5)', 2);
  } else if (S.phase === 'choose') {
    const x = ZX + S.aim.x * ZW, y = ZY + S.aim.y * ZH, n = (0.18 + (1 - S.stamina) * 0.45);
    g.ring(x, y, n * ZW + 6, 'rgba(147,197,253,.5)', 2); g.circle(x, y, 7, PT[S.sel].c);
  }
  // 타구 애니메이션
  if (S.phase === 'hit') drawHit(g, c);
  drawHUD(g, c);
  if (S.msgT > 0) { g.rrect(300, 250, 360, 64, 14, 'rgba(0,0,0,.65)'); g.text(S.msg, 480, 282, 32, S.msgC); }
}
function drawHit(g, c) {
  const H = S.hit, t = Math.min(1, H.t / H.dur);
  const a = ((H.dir - 90) * Math.PI) / 180, d = H.dist * t;
  const sx = ZX + Math.cos(a) * d * 1.2, sy = ZY - 20 - d * 0.7 - Math.sin(t * Math.PI) * Math.max(0, H.ang) * 3;
  if (H.res !== 'foul' || t < 0.8) { g.circle(sx, sy, Math.max(3, 12 - t * 9), '#fff'); }
  // 미니 필드
  const fx = 820, fy = 330, k = 0.28;
  c.save(); c.globalAlpha = 0.92;
  g.poly([[fx, fy], [fx - 120, fy - 120], [fx + 120, fy - 120]], '#166534');
  c.beginPath(); c.moveTo(fx, fy); c.arc(fx, fy, 400 * k + 8, -Math.PI * 0.75, -Math.PI * 0.25); c.closePath(); c.fillStyle = '#166534'; c.fill();
  c.strokeStyle = '#fde047'; c.lineWidth = 2; c.beginPath(); c.arc(fx, fy, 370 * k, -Math.PI * 0.75, -Math.PI * 0.25); c.stroke();
  g.poly([[fx, fy], [fx - 25, fy - 25], [fx, fy - 50], [fx + 25, fy - 25]], '#b45309');
  const bx = fx + Math.cos(a) * d * k, by = fy + Math.sin(a) * d * k;
  g.line(fx, fy, bx, by, 'rgba(255,255,255,.6)', 2); g.circle(bx, by, 4, '#fff');
  c.restore();
}
function drawHUD(g, c) {
  // 라인 스코어
  g.rrect(10, 8, 520, 74, 8, 'rgba(0,0,0,.7)');
  const n = Math.max(9, S.inn);
  for (let i = 0; i < n; i++) g.text(i + 1 + '', 112 + i * 30, 22, 12, i + 1 === S.inn ? '#fde047' : '#94a3b8');
  g.text('R', 112 + n * 30, 22, 12, '#fde047'); g.text('H', 142 + n * 30, 22, 12, '#94a3b8');
  [[1, 'CPU 레드삭스'], [0, '우리 타이거즈']].forEach(([side, nm], r) => {
    const y = 44 + r * 24;
    g.text(nm, 18, y, 13, side ? '#fca5a5' : '#93c5fd', 'left');
    for (let i = 0; i < n; i++) { const v = S.line[side][i]; g.text(v === undefined ? '' : v + '', 112 + i * 30, y, 14, '#fff'); }
    g.text(S.runs[side] + '', 112 + n * 30, y, 15, '#fde047'); g.text(S.hits[side] + '', 142 + n * 30, y, 14, '#cbd5e1');
  });
  // BSO
  g.rrect(800, 8, 150, 92, 8, 'rgba(0,0,0,.7)');
  const row = (lbl, cnt, max, col, y) => { g.text(lbl, 815, y, 14, '#fff'); for (let i = 0; i < max; i++) g.circle(840 + i * 20, y, 6, i < cnt ? col : 'rgba(255,255,255,.15)'); };
  row('B', S.b, 3, '#22c55e', 28); row('S', S.s, 2, '#eab308', 52); row('O', S.outs, 2, '#ef4444', 76);
  // 베이스
  const dx = 735, dy = 54;
  [[dx + 22, dy], [dx, dy - 22], [dx - 22, dy]].forEach(([x, y], i) => { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); g.rect(-8, -8, 16, 16, S.bases[i] ? '#fde047' : 'rgba(255,255,255,.2)'); c.restore(); });
  // 타자/투수 정보
  const side = S.top ? 1 : 0, nm = (S.top ? CPUS : LINEUP)[S.bi[side] % 9];
  g.rrect(10, 92, 200, 30, 8, 'rgba(0,0,0,.55)');
  g.text(`${(S.bi[side] % 9) + 1}번 타자 ${nm}`, 110, 107, 14, '#fff');
  if (S.top) {
    g.rrect(10, 128, 200, 22, 6, 'rgba(0,0,0,.55)');
    g.rrect(70, 134, 130 * S.stamina, 10, 4, S.stamina > 0.5 ? '#4ade80' : S.stamina > 0.25 ? '#facc15' : '#ef4444');
    g.text('체력', 40, 139, 12, '#fff');
    if (S.phase === 'choose') {
      g.text('구종 선택 (1~5 / X) · 코스 조준 후 클릭/Space', 480, 565, 14, '#e2e8f0');
      PT.forEach((p, i) => {
        const x = 170 + i * 128;
        g.rrect(x, 584, 118, 44, 10, i === S.sel ? p.c : 'rgba(0,0,0,.6)', p.c, 2);
        g.text(`${i + 1} ${p.n}`, x + 59, 600, 15, '#fff');
        g.text('사용 ' + S.used[i], x + 59, 618, 10, '#e2e8f0');
      });
    }
  } else {
    g.rrect(780, 560, 170, 72, 8, 'rgba(0,0,0,.55)');
    PT.forEach((p, i) => { g.circle(796, 572 + i * 13, 4, p.c); g.text(p.n, 806, 572 + i * 13, 11, '#e2e8f0', 'left'); });
    g.text(`홈런 ${S.hr}`, 900, 590, 16, '#fde047');
  }
  if (S.ball && S.phase === 'result' && S.ball.type !== undefined) g.text(`${PT[S.ball.type].n} ${Math.round(155 - (PT[S.ball.type].T - 0.5) * 140)}km/h`, ZX, ZY + ZH + 30, 16, PT[S.ball.type].c);
}
