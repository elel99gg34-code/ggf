let S;
// 하노이의 탑: 큰 원판은 작은 원판 위에 올릴 수 없다. 최소 횟수로 모두 옮겨라
const TH_LEVELS = [
  { n: 3, name: '워밍업' }, { n: 4, name: '네 개' }, { n: 5, name: '다섯 개' },
  { n: 5, name: '흐트러진 탑', scramble: true }, { n: 6, name: '여섯 개' }, { n: 6, name: '흐트러진 탑 2', scramble: true },
  { n: 7, name: '일곱 개' }, { n: 7, name: '흐트러진 탑 3', scramble: true }, { n: 8, name: '여덟 개' }, { n: 9, name: '전설의 아홉' },
];
const TH_PX = [190, 480, 770], TH_BASE = 520, TH_DH = 30;
const TH_COLS = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
GAME({
  title: '하노이의 탑', w: 960, h: 680, bg: '#1e1b4b', controls: 'dpad+ab', aLabel: '집기/놓기', bLabel: '되돌리기',
  help: '원판을 드래그하거나, 기둥을 클릭해 집고 다른 기둥을 클릭해 내려놓아요\n큰 원판은 작은 원판 위에 놓을 수 없어요 · 모든 원판을 🚩 목표 기둥으로!\n키보드: 1/2/3 또는 ←→ + Space 로 집기/놓기 · X/U 되돌리기 · H 힌트\n최소 횟수로 풀면 ⭐⭐⭐ · 🤖 자동 풀이는 점수 없음',
  init(g) { S = { mode: 'select', lvl: 0, unlocked: g.load('unlocked', 1), bestStars: g.load('stars', {}), msg: '', msgT: 0 }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'select') {
      TH_LEVELS.forEach((lv, i) => {
        const x = 110 + (i % 5) * 150, y = 210 + Math.floor(i / 5) * 160;
        if (i < S.unlocked && g.clickIn(x, y, 130, 130)) { S.lvl = i; loadLevel(g); g.sfx.click(); }
      });
      if (g.pressed('a')) { S.lvl = Math.min(S.unlocked, TH_LEVELS.length) - 1; loadLevel(g); }
      g.info = '레벨을 고르세요';
      return;
    }
    // 애니메이션
    if (S.fly) {
      S.fly.t += dt / S.fly.dur;
      if (S.fly.t >= 1) { const f = S.fly; S.fly = null; land(g, f.disc, f.to); }
      return;
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        S.lvl++;
        if (S.lvl >= TH_LEVELS.length) return g.win('전설의 탑까지 모두 정복!');
        S.unlocked = Math.max(S.unlocked, S.lvl + 1); g.save('unlocked', S.unlocked);
        loadLevel(g);
      }
      return;
    }
    S.time += dt;
    if (S.auto) {
      S.autoT -= dt;
      if (S.autoT <= 0) { const mv = nextMove(); if (mv) { pick(mv[0]); drop(g, mv[1]); } S.autoT = Math.max(0.08, 0.5 - S.n * 0.05); }
      if (m.clicked && g.inRect(720, 560, 210, 48)) { S.auto = false; }
      return;
    }
    const pegAt = (x) => (x < 335 ? 0 : x < 625 ? 1 : 2);
    if (m.clicked && m.y < 560) {
      const p = pegAt(m.x);
      if (S.hold === null) { if (pick(p)) { S.dragging = true; S.dragFrom = p; g.sfx.tone(500, 0.04, 'triangle', 0.05); } else g.sfx.beep(160, 0.05); }
      else { drop(g, p); }
    }
    if (S.dragging && !m.down) {
      S.dragging = false;
      const p = pegAt(m.x);
      if (S.hold !== null && p !== S.dragFrom) drop(g, p);
    }
    if (m.clicked) {
      if (g.inRect(20, 600, 130, 50)) undo(g);
      if (g.inRect(160, 600, 130, 50)) hint(g);
      if (g.inRect(300, 600, 130, 50)) loadLevel(g, true);
      if (g.inRect(440, 600, 130, 50)) { S.auto = true; S.autoT = 0.3; S.usedAuto = true; if (S.hold !== null) cancelHold(); say('🤖 자동 풀이 — 이 판은 점수 없음'); }
      if (g.inRect(580, 600, 110, 50)) S.mode = 'select';
    }
    for (let i = 0; i < 3; i++) if (g.keyp('Digit' + (i + 1)) || g.keyp('Numpad' + (i + 1))) { S.cur = i; keyAct(g); }
    if (g.pressed('left')) S.cur = (S.cur + 2) % 3;
    if (g.pressed('right')) S.cur = (S.cur + 1) % 3;
    if (g.pressed('a') || g.pressed('down') || g.pressed('up')) keyAct(g);
    if (g.pressed('b') || g.keyp('KeyU')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `${S.lvl + 1}. ${TH_LEVELS[S.lvl].name} · 이동 ${S.moves} / 최소 ${S.min} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🗼 하노이의 탑', 480, 80, 46, '#e0e7ff');
      g.text('원판을 최소 횟수로 목표 기둥에 옮기세요', 480, 135, 18, '#a5b4fc', 'center', '600');
      TH_LEVELS.forEach((lv, i) => {
        const x = 110 + (i % 5) * 150, y = 210 + Math.floor(i / 5) * 160, open = i < S.unlocked;
        g.rrect(x, y, 130, 130, 14, open ? (g.inRect(x, y, 130, 130) ? '#4338ca' : '#3730a3') : '#272360', open ? '#818cf8' : '#312e81');
        g.text(open ? String(i + 1) : '🔒', x + 65, y + 38, 30, open ? '#fff' : '#4c4a8a');
        g.text(lv.name, x + 65, y + 76, 14, open ? '#c7d2fe' : '#4c4a8a', 'center', '600');
        g.text(`원판 ${lv.n}개`, x + 65, y + 96, 12, '#818cf8', 'center', '600');
        const st = S.bestStars[i] || 0;
        if (st) g.text('⭐'.repeat(st), x + 65, y + 116, 14);
      });
      return;
    }
    // 배경 장식
    for (let i = 0; i < 30; i++) g.circle((i * 137) % 960, (i * 71) % 400, 1.2, 'rgba(199,210,254,.4)');
    g.rrect(40, TH_BASE, 880, 22, 8, '#78350f', '#451a03');
    for (let p = 0; p < 3; p++) {
      const x = TH_PX[p];
      if (p === S.cur && !S.auto) g.rrect(x - 135, 150, 270, TH_BASE - 150, 16, 'rgba(129,140,248,.12)');
      g.rrect(x - 7, 190, 14, TH_BASE - 190, 6, '#a16207', '#78350f');
      if (p === S.target) g.emoji('🚩', x + 18, 180, 30);
      g.text(String(p + 1), x, TH_BASE + 40, 18, '#a5b4fc');
      S.pegs[p].forEach((d, k) => {
        if (S.hold !== null && S.holdFrom === p && k === S.pegs[p].length - 1) return;
        drawDisc(g, d, x, TH_BASE - TH_DH / 2 - k * TH_DH);
      });
    }
    if (S.fly) {
      const f = S.fly, k = f.t;
      const x0 = TH_PX[f.from], x1 = TH_PX[f.to], y0 = f.y0, y1 = TH_BASE - TH_DH / 2 - S.pegs[f.to].length * TH_DH;
      const x = U.lerp(x0, x1, k), y = U.lerp(y0, y1, k) - Math.sin(Math.PI * k) * 80;
      drawDisc(g, f.disc, x, y);
    }
    if (S.hold !== null && !S.fly) {
      const m = g.mouse;
      const x = S.dragging ? m.x : TH_PX[S.cur], y = S.dragging ? m.y : 120 + Math.sin(g.time * 5) * 4;
      drawDisc(g, S.hold, x, y);
    }
    if (S.hintMv && S.hintT > 0) {
      S.hintT -= 1 / 60;
      const [a, b] = S.hintMv;
      c.setLineDash([10, 8]);
      g.line(TH_PX[a], 150, TH_PX[b], 150, '#4ade80', 4);
      c.setLineDash([]);
      g.text('➜', TH_PX[b] - Math.sign(b - a) * 10, 150, 30, '#4ade80');
    }
    // 하단 UI
    g.button(20, 600, 130, 50, '↶ 되돌리기', '#4338ca', 17);
    g.button(160, 600, 130, 50, '💡 힌트', '#15803d', 17);
    g.button(300, 600, 130, 50, '⟲ 다시', '#475569', 17);
    g.button(440, 600, 130, 50, S.auto ? '🤖 진행 중' : '🤖 자동 풀이', '#7c3aed', 16);
    g.button(580, 600, 110, 50, '레벨', '#334155', 16);
    g.rrect(710, 20, 230, 110, 14, 'rgba(15,13,50,.7)', '#4338ca');
    g.text(`${S.lvl + 1}. ${TH_LEVELS[S.lvl].name}`, 825, 45, 18, '#e0e7ff');
    g.text(`이동 ${S.moves} / 최소 ${S.min}`, 825, 77, 20, S.moves > S.min ? '#fca5a5' : '#bbf7d0');
    g.text(`⏱️ ${U.fmtTime(S.time)}`, 825, 106, 16, '#a5b4fc', 'center', '600');
    const st = starsFor(S.moves);
    g.text('⭐'.repeat(st) + '☆'.repeat(3 - st), 120, 40, 26, '#facc15');
    g.text(`2ⁿ−1 = ${(1 << S.n) - 1}`, 120, 75, 14, '#818cf8', 'center', '600');
    if (S.msgT > 0) { g.rrect(280, 20, 400, 46, 12, 'rgba(15,13,50,.92)', '#6366f1'); g.text(S.msg, 480, 43, 17, '#fff'); }
    if (S.clear > 0) {
      g.rrect(260, 220, 440, 150, 20, 'rgba(30,27,75,.94)', '#facc15', 3);
      g.text(S.usedAuto ? '🤖 자동 풀이 완료' : '🎉 탑 완성!', 480, 262, 32, '#fff');
      g.text('⭐'.repeat(S.lastStars) + '☆'.repeat(3 - S.lastStars), 480, 305, 28, '#facc15');
      g.text(S.usedAuto ? '점수 없음' : `+${S.lastPts}점`, 480, 345, 20, '#fde68a');
    }
  },
});

function drawDisc(g, d, x, y) {
  const w = 50 + (d / S.n) * 200, h = TH_DH - 4;
  g.rrect(x - w / 2 + 2, y - h / 2 + 4, w, h, 10, 'rgba(0,0,0,.35)');
  g.rrect(x - w / 2, y - h / 2, w, h, 10, TH_COLS[(d - 1) % TH_COLS.length], 'rgba(0,0,0,.35)');
  g.rrect(x - w / 2 + 6, y - h / 2 + 4, w - 12, 6, 3, 'rgba(255,255,255,.3)');
  g.text(String(d), x, y + 1, 14, 'rgba(0,0,0,.55)');
}
function loadLevel(g, retry) {
  const lv = TH_LEVELS[S.lvl];
  const n = lv.n;
  S.n = n; S.mode = 'play';
  if (!retry || !S.startPegs) {
    let pegs;
    if (lv.scramble) {
      do {
        pegs = [[], [], []];
        const pos = Array.from({ length: n }, () => U.randi(0, 2));
        for (let d = n; d >= 1; d--) pegs[pos[d - 1]].push(d);
        S.target = U.randi(0, 2);
      } while (pegs[S.target].length === n || minMoves(pegs, S.target) < (1 << (n - 1)));
    } else { pegs = [Array.from({ length: n }, (_, i) => n - i), [], []]; S.target = 2; }
    S.startPegs = pegs.map((p) => p.slice());
  }
  S.pegs = S.startPegs.map((p) => p.slice());
  S.min = minMoves(S.pegs, S.target);
  S.moves = 0; S.hist = []; S.hold = null; S.holdFrom = -1; S.dragging = false; S.fly = null; S.cur = 0;
  S.clear = 0; S.auto = false; S.usedAuto = false; S.hintsUsed = 0; S.hintMv = null;
  if (!retry) S.time = 0;
  g.sfx.tone(392, 0.08, 'triangle', 0.06);
  if (lv.scramble && !retry) say(`흐트러진 탑! 🚩${S.target + 1}번 기둥으로 모으세요`);
}
function where(pegs) {
  const pos = [];
  pegs.forEach((p, i) => p.forEach((d) => (pos[d] = i)));
  return pos;
}
// 임의 배치에서 목표 기둥까지의 최소 이동 수
function minMoves(pegs, t) {
  const pos = where(pegs);
  let total = 0, target = t;
  for (let d = pegs.flat().length; d >= 1; d--) {
    if (pos[d] === target) continue;
    total += 1 + ((1 << (d - 1)) - 1);
    target = 3 - pos[d] - target;
  }
  return total;
}
// 최적 다음 수
function nextMove() {
  const pegs = S.pegs.map((p) => p.slice());
  const pos = where(pegs);
  let target = S.target, mv = null;
  for (let d = S.n; d >= 1; d--) {
    if (pos[d] === target) continue;
    mv = [pos[d], target];
    target = 3 - pos[d] - target;
  }
  return mv;
}
function pick(p) {
  if (!S.pegs[p].length) return false;
  S.hold = S.pegs[p][S.pegs[p].length - 1]; S.holdFrom = p;
  return true;
}
function cancelHold() { S.hold = null; S.holdFrom = -1; S.dragging = false; }
function drop(g, p) {
  const d = S.hold, from = S.holdFrom;
  if (p === from) { cancelHold(); g.sfx.tone(300, 0.04, 'sine', 0.04); return; }
  const top = S.pegs[p][S.pegs[p].length - 1];
  if (top !== undefined && top < d) {
    say('큰 원판은 작은 원판 위에 놓을 수 없어요!'); g.sfx.hit(); g.shake(5); cancelHold(); return;
  }
  S.pegs[from].pop();
  const y0 = S.dragging ? g.mouse.y : 120;
  cancelHold();
  S.hist.push([from, p]);
  S.moves++;
  S.fly = { disc: d, from, to: p, t: 0, dur: S.auto ? Math.max(0.06, 0.32 - S.n * 0.03) : 0.18, y0 };
  S.cur = p;
}
function land(g, d, p) {
  S.pegs[p].push(d);
  g.sfx.tone(200 + (S.n - d) * 60, 0.07, 'triangle', 0.07);
  g.burst(TH_PX[p], TH_BASE - S.pegs[p].length * TH_DH + 10, TH_COLS[(d - 1) % TH_COLS.length], 6, 100, 0.4);
  if (S.pegs[S.target].length === S.n) win(g);
}
function keyAct(g) {
  if (S.hold === null) { if (pick(S.cur)) g.sfx.tone(500, 0.04, 'triangle', 0.05); else g.sfx.beep(160, 0.05); }
  else drop(g, S.cur);
}
function undo(g) {
  if (S.hold !== null) { cancelHold(); return; }
  const h = S.hist.pop();
  if (!h) return;
  S.pegs[h[0]].push(S.pegs[h[1]].pop());
  S.moves++; // 되돌리기도 이동으로 센다 (최소 기록 방지)
  g.sfx.tone(280, 0.05, 'sine', 0.05);
}
function hint(g) {
  const mv = nextMove();
  if (!mv) return;
  S.hintMv = mv; S.hintT = 1.5; S.hintsUsed++;
  const rest = minMoves(S.pegs.map((p, i) => (S.hold !== null && i === S.holdFrom ? p : p)), S.target);
  say(`${mv[0] + 1}번 → ${mv[1] + 1}번 (남은 최소 ${rest}수)`);
  g.sfx.beep(660, 0.08);
}
function starsFor(m) { return m <= S.min ? 3 : m <= S.min * 1.3 ? 2 : 1; }
function say(t) { S.msg = t; S.msgT = 2.4; }
function win(g) {
  S.lastStars = S.usedAuto ? 0 : Math.max(1, starsFor(S.moves) - (S.hintsUsed > 3 ? 1 : 0));
  S.lastPts = S.usedAuto ? 0 : Math.max(50, S.min * 15 + S.lastStars * 150 - Math.floor(S.time / 2) - S.hintsUsed * 20);
  g.add(S.lastPts);
  if (!S.usedAuto && S.lastStars > (S.bestStars[S.lvl] || 0)) { S.bestStars[S.lvl] = S.lastStars; g.save('stars', S.bestStars); }
  S.clear = 2.4; S.auto = false;
  g.sfx.win(); g.shake(4);
  for (let i = 0; i < 4; i++) g.burst(TH_PX[S.target], 300 + i * 40, TH_COLS, 24, 280, 1);
}
