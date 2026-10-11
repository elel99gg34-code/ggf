let S;
// 페그 솔리테어: 말이 이웃 말을 뛰어넘어 빈 칸으로 — 뛰어넘긴 말은 제거. 하나만 남기면 성공!
const PG_ENG = ['  ooo  ', '  ooo  ', 'ooooooo', 'ooooooo', 'ooooooo', '  ooo  ', '  ooo  '];
const PG_EUR = ['  ooo  ', ' ooooo ', 'ooooooo', 'ooooooo', 'ooooooo', ' ooooo ', '  ooo  '];
// 레벨: board 모양 + 말 배치('#' 말, '.' 빈칸, ' ' 없음), target = 마지막 말 목표 칸(보너스)
const PG_LEVELS = [
  { name: '십자', board: 'eng', pegs: ['  ...  ', '  .#.  ', '..###..', '...#...', '...#...', '  ...  ', '  ...  '], target: [3, 3] },
  { name: '플러스', board: 'eng', pegs: ['  ...  ', '  .#.  ', '...#...', '.#####.', '...#...', '  .#.  ', '  ...  '], target: [3, 3] },
  { name: '벽난로', board: 'eng', pegs: ['  ###  ', '  ###  ', '..###..', '..#.#..', '.......', '  ...  ', '  ...  '], target: [3, 3] },
  { name: '삼각 15', board: 'tri', pegs: ['.', '##', '###', '####', '#####'] },
  { name: '위쪽 화살표', board: 'eng', pegs: ['  .#.  ', '  ###  ', '.#####.', '...#...', '...#...', '  ###  ', '  ###  '], target: [3, 0] },
  { name: '피라미드', board: 'eng', pegs: ['  ...  ', '  .#.  ', '..###..', '.#####.', '#######', '  ...  ', '  ...  '], target: [3, 3] },
  { name: '삼각 21', board: 'tri', pegs: ['#', '##', '###', '#.##', '#####', '######'] },
  { name: '다이아몬드', board: 'eng', pegs: ['  .#.  ', '  ###  ', '.#####.', '###.###', '.#####.', '  ###  ', '  .#.  '], target: [3, 3] },
  { name: '클래식 33', board: 'eng', pegs: ['  ###  ', '  ###  ', '#######', '###.###', '#######', '  ###  ', '  ###  '], target: [3, 3] },
  { name: '유럽식 37', board: 'eur', pegs: ['  #.#  ', ' ##### ', '#######', '#######', '#######', ' ##### ', '  ###  '] },
];
const PG_RANDOM = 4; // 고정 레벨 뒤 무작위 도전 수
GAME({
  title: '페그 솔리테어', w: 960, h: 680, bg: '#3f2a1d', controls: 'dpad+ab', aLabel: '선택', bLabel: '되돌리기',
  help: '말을 클릭해 고른 뒤, 초록색으로 빛나는 빈 칸을 클릭하면 이웃 말을 뛰어넘어요 (드래그도 가능)\n뛰어넘긴 말은 사라져요 — 마지막에 말 하나만 남기면 성공!\n🎯 표시 칸에 마지막 말을 남기면 보너스\n방향키 커서 · Space 선택/이동 · X/U 되돌리기 · H 힌트',
  init(g) { S = { mode: 'select', lvl: 0, unlocked: g.load('unlocked', 1), msg: '', msgT: 0, best: g.load('bestLeft', {}) }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    const total = PG_LEVELS.length + PG_RANDOM;
    if (S.mode === 'select') {
      for (let i = 0; i < total; i++) {
        const x = 110 + (i % 5) * 150, y = 190 + Math.floor(i / 5) * 140;
        if (i < S.unlocked && g.clickIn(x, y, 130, 115)) { S.lvl = i; loadLevel(g); g.sfx.click(); }
      }
      if (g.pressed('a')) { S.lvl = Math.min(S.unlocked, total) - 1; loadLevel(g); }
      g.info = '레벨을 고르세요';
      return;
    }
    if (S.anim) { S.anim.t += dt / 0.22; if (S.anim.t >= 1) S.anim = null; }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        S.lvl++;
        if (S.lvl >= total) return g.win('모든 레벨 정복!');
        S.unlocked = Math.max(S.unlocked, S.lvl + 1); g.save('unlocked', S.unlocked);
        loadLevel(g);
      }
      return;
    }
    S.time += dt;
    const hi = holeAt(m.x, m.y);
    if (m.clicked) {
      if (hi >= 0) clickHole(g, hi);
      if (g.inRect(720, 330, 210, 50)) undo(g);
      if (g.inRect(720, 390, 210, 50)) hint(g);
      if (g.inRect(720, 450, 210, 50)) restart(g);
      if (g.inRect(720, 590, 100, 44)) S.mode = 'select';
      if (g.inRect(830, 590, 100, 44)) { S.clear = 0.01; g.add(-100); }
    }
    if (m.released && S.sel >= 0 && hi >= 0 && hi !== S.sel) { const mv = S.jumps.find((j) => j[0] === S.sel && j[2] === hi && can(j)); if (mv) doJump(g, mv); }
    // 키보드 커서
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in D) if (g.pressed(k)) S.cur = nearestHole(S.cur, D[k]);
    if (g.pressed('a')) clickHole(g, S.cur);
    if (g.pressed('b') || g.keyp('KeyU')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    const left = S.pegs.filter(Boolean).length;
    g.info = `${S.name} · 남은 말 ${left} · 이동 ${S.hist.length} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    const total = PG_LEVELS.length + PG_RANDOM;
    if (S.mode === 'select') {
      g.text('📍 페그 솔리테어', 480, 80, 46, '#fde68a');
      g.text('말을 뛰어넘어 마지막 하나만 남기세요', 480, 135, 18, '#e7c9a9', 'center', '600');
      for (let i = 0; i < total; i++) {
        const x = 110 + (i % 5) * 150, y = 190 + Math.floor(i / 5) * 140, open = i < S.unlocked;
        g.rrect(x, y, 130, 115, 14, open ? (g.inRect(x, y, 130, 115) ? '#92400e' : '#78350f') : '#422a1a', open ? '#fbbf24' : '#5b3a24');
        g.text(open ? String(i + 1) : '🔒', x + 65, y + 40, 32, open ? '#fde68a' : '#6b4a33');
        const nm = i < PG_LEVELS.length ? PG_LEVELS[i].name : `무작위 ${i - PG_LEVELS.length + 1}`;
        g.text(nm, x + 65, y + 80, 15, open ? '#fef3c7' : '#6b4a33', 'center', '600');
        if (S.best[i] !== undefined) g.text(S.best[i] === 1 ? '⭐ 1개' : `최고 ${S.best[i]}개`, x + 65, y + 100, 12, '#fbbf24', 'center', '600');
      }
      return;
    }
    // 판
    g.circle(S.cx, S.cy, S.R, '#7c4a2a'); g.ring(S.cx, S.cy, S.R, '#a16207', 8); g.ring(S.cx, S.cy, S.R - 14, 'rgba(0,0,0,.2)', 3);
    const tgts = S.sel >= 0 ? S.jumps.filter((j) => j[0] === S.sel && can(j)).map((j) => j[2]) : [];
    S.holes.forEach((h, i) => {
      g.circle(h.x, h.y + 2, S.r * 0.62, 'rgba(0,0,0,.45)');
      g.circle(h.x, h.y, S.r * 0.55, '#2b1a10');
      if (S.target === i) g.ring(h.x, h.y, S.r * 0.72, 'rgba(250,204,21,.6)', 2);
      if (tgts.includes(i)) g.circle(h.x, h.y, S.r * 0.5 + Math.sin(g.time * 8) * 2, 'rgba(74,222,128,.55)');
      if (S.hintMv && S.hintT > 0 && (S.hintMv[0] === i || S.hintMv[2] === i)) g.ring(h.x, h.y, S.r * 0.75, '#38bdf8', 4);
    });
    S.holes.forEach((h, i) => {
      if (!S.pegs[i]) return;
      let x = h.x, y = h.y;
      if (S.anim && S.anim.to === i) { const k = S.anim.t; x = U.lerp(S.holes[S.anim.from].x, h.x, k); y = U.lerp(S.holes[S.anim.from].y, h.y, k) - Math.sin(Math.PI * k) * 30; }
      const sel = i === S.sel;
      g.circle(x + 3, y + 5, S.r * 0.5, 'rgba(0,0,0,.4)');
      g.circle(x, y - (sel ? 6 : 0), S.r * 0.5, sel ? '#f59e0b' : '#dc2626');
      g.circle(x - S.r * 0.15, y - S.r * 0.15 - (sel ? 6 : 0), S.r * 0.16, 'rgba(255,255,255,.55)');
    });
    if (S.removed && S.removed.t > 0) { const h = S.holes[S.removed.i]; S.removed.t -= 1 / 60; g.circle(h.x, h.y - (1 - S.removed.t) * 20, S.r * 0.5 * S.removed.t, 'rgba(220,38,38,.6)'); }
    const ch = S.holes[S.cur];
    if (ch) g.ring(ch.x, ch.y, S.r * 0.66, '#fde68a', 2);
    if (S.target >= 0) { const th = S.holes[S.target]; g.emoji('🎯', th.x + S.r * 0.45, th.y - S.r * 0.45, 16); }
    // 패널
    g.rrect(705, 20, 240, 640, 16, '#2a1a10', '#78350f');
    g.text('페그 솔리테어', 825, 58, 26, '#fde68a');
    g.text(`${S.lvl + 1}. ${S.name}`, 825, 96, 19, '#fbbf24');
    const left = S.pegs.filter(Boolean).length;
    g.text(`남은 말 ${left}`, 825, 145, 30, '#fef3c7');
    g.text(`이동 ${S.hist.length} · 💡 ${S.hintsUsed}`, 825, 185, 17, '#e7c9a9', 'center', '600');
    g.text(`⏱️ ${U.fmtTime(S.time)}`, 825, 212, 17, '#e7c9a9', 'center', '600');
    const mv = S.jumps.filter(can).length;
    g.text(`가능한 수 ${mv}`, 825, 250, 17, mv ? '#86efac' : '#fca5a5', 'center', '600');
    if (!mv && left > 1) g.text('막혔어요! 되돌리기?', 825, 285, 16, '#fca5a5');
    g.button(720, 330, 210, 50, `↶ 되돌리기`, '#78350f', 18);
    g.button(720, 390, 210, 50, '💡 힌트', '#15803d', 18);
    g.button(720, 450, 210, 50, '⟲ 처음부터', '#57534e', 18);
    g.button(720, 590, 100, 44, '레벨', '#44403c', 16);
    g.button(830, 590, 100, 44, '건너뛰기', '#44403c', 15);
    if (S.msgT > 0) { g.rrect(150, 620, 400, 46, 12, 'rgba(0,0,0,.75)'); g.text(S.msg, 350, 643, 17, '#fff'); }
    if (S.clear > 0 && S.won) {
      g.rrect(150, 260, 400, 140, 20, 'rgba(42,26,16,.93)', '#fbbf24', 3);
      g.text(S.centerBonus ? '🎯 완벽한 마무리!' : '🎉 성공!', 350, 305, 32, '#fde68a');
      g.text(`+${S.lastPts}점`, 350, 355, 22, '#fff');
    }
  },
});

// 보드 구성: holes[{x,y,r,c}], jumps[[from, over, to]]
function buildBoard(lv) {
  const holes = [], idx = {}, pegs = [];
  let tri = false;
  if (lv.board === 'tri') {
    tri = true;
    lv.pegs.forEach((row, r) => [...row].forEach((ch, c) => { idx[r + ',' + c] = holes.length; holes.push({ r, c }); pegs.push(ch === '#'); }));
  } else {
    lv.pegs.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== ' ') { idx[r + ',' + c] = holes.length; holes.push({ r, c }); pegs.push(ch === '#'); } }));
  }
  const dirs = tri ? [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]] : [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const jumps = [];
  holes.forEach((h, i) => {
    for (const [dr, dc] of dirs) {
      const o = idx[h.r + dr + ',' + (h.c + dc)], t = idx[h.r + 2 * dr + ',' + (h.c + 2 * dc)];
      if (o !== undefined && t !== undefined) jumps.push([i, o, t]);
    }
  });
  return { holes, pegs, jumps, tri, idx };
}
// 무작위 레벨: 한 개의 말에서 거꾸로 뛰기를 반복해 풀 수 있는 배치 생성
function randomLevel(k) {
  const shape = k % 2 ? PG_EUR : PG_ENG;
  const base = { board: 'eng', pegs: shape.map((r) => r.replace(/o/g, '.')) };
  const B = buildBoard(base);
  const want = 10 + k * 4;
  for (let att = 0; att < 200; att++) {
    const pegs = B.pegs.map(() => false);
    const start = U.randi(0, B.holes.length - 1);
    pegs[start] = true;
    let cnt = 1;
    for (let step = 0; step < 400 && cnt < want; step++) {
      const opts = B.jumps.filter(([a, o, t]) => pegs[t] && !pegs[o] && !pegs[a]);
      if (!opts.length) break;
      const [a, o, t] = U.choice(opts);
      pegs[t] = false; pegs[o] = true; pegs[a] = true; cnt++;
    }
    if (cnt >= want) {
      return { name: `무작위 ${k + 1}`, board: 'eng', pegs: base.pegs.map((row, r) => [...row].map((ch, c) => (ch === ' ' ? ' ' : pegs[B.idx[r + ',' + c]] ? '#' : '.')).join('')), targetIdx: start };
    }
  }
  return PG_LEVELS[0];
}
function loadLevel(g) {
  const lv = S.lvl < PG_LEVELS.length ? PG_LEVELS[S.lvl] : randomLevel(S.lvl - PG_LEVELS.length);
  const B = buildBoard(lv);
  S.holes = B.holes; S.pegs = B.pegs; S.jumps = B.jumps; S.start = B.pegs.slice();
  S.name = lv.name;
  S.target = lv.target ? B.idx[lv.target[1] + ',' + lv.target[0]] ?? -1 : lv.targetIdx ?? -1;
  // 좌표 배치
  S.cx = 350; S.cy = 335;
  if (B.tri) {
    const rows = lv.pegs.length, sp = Math.min(95, 520 / rows);
    S.r = sp * 0.9;
    S.holes.forEach((h) => { h.x = S.cx + (h.c - h.r / 2) * sp; h.y = S.cy - ((rows - 1) * sp * 0.866) / 2 + h.r * sp * 0.866 + 20; });
    S.R = rows * sp * 0.62 + 40;
  } else {
    const sp = 74;
    S.r = sp * 0.9;
    S.holes.forEach((h) => { h.x = S.cx + (h.c - 3) * sp; h.y = S.cy + (h.r - 3) * sp; });
    S.R = 300;
  }
  S.mode = 'play'; S.sel = -1; S.hist = []; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.won = false; S.cur = S.pegs.indexOf(true); S.anim = null; S.hintMv = null;
  g.sfx.tone(330, 0.08, 'triangle', 0.06);
}
function holeAt(x, y) {
  for (let i = 0; i < S.holes.length; i++) if (Math.hypot(S.holes[i].x - x, S.holes[i].y - y) < S.r * 0.55) return i;
  return -1;
}
function nearestHole(from, [dx, dy]) {
  const h = S.holes[from];
  let best = from, bd = 1e9;
  S.holes.forEach((o, i) => {
    const vx = o.x - h.x, vy = o.y - h.y;
    const along = vx * dx + vy * dy;
    if (along <= 5) return;
    const d = along + Math.abs(vx * dy - vy * dx) * 2;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
function can([a, o, t]) { return S.pegs[a] && S.pegs[o] && !S.pegs[t]; }
function clickHole(g, i) {
  if (S.pegs[i]) {
    S.sel = S.sel === i ? -1 : i; S.cur = i;
    const any = S.jumps.some((j) => j[0] === i && can(j));
    g.sfx.tone(any ? 520 : 200, 0.05, 'triangle', 0.05);
    return;
  }
  if (S.sel >= 0) {
    const mv = S.jumps.find((j) => j[0] === S.sel && j[2] === i && can(j));
    if (mv) doJump(g, mv); else { g.sfx.beep(160, 0.06); S.sel = -1; }
  }
}
function doJump(g, mv) {
  const [a, o, t] = mv;
  S.hist.push(mv);
  S.pegs[a] = false; S.pegs[o] = false; S.pegs[t] = true;
  S.sel = -1; S.cur = t;
  S.anim = { from: a, to: t, t: 0 };
  S.removed = { i: o, t: 1 };
  g.sfx.pop(); g.later(() => g.sfx.tone(300 + S.pegs.filter(Boolean).length * 8, 0.06, 'sine', 0.05), 0.15);
  g.burst(S.holes[o].x, S.holes[o].y, ['#dc2626', '#fca5a5'], 10, 150, 0.5);
  g.add(10);
  const left = S.pegs.filter(Boolean).length;
  const prevBest = S.best[S.lvl];
  if (prevBest === undefined || left < prevBest) { S.best[S.lvl] = left; g.save('bestLeft', S.best); }
  if (left === 1) {
    S.won = true; S.centerBonus = S.target >= 0 && S.pegs[S.target];
    const pts = 300 + S.start.filter(Boolean).length * 20 + (S.centerBonus ? 300 : 0) - S.hintsUsed * 30;
    S.lastPts = Math.max(50, pts); g.add(S.lastPts);
    S.clear = 2.2; g.later(() => g.sfx.win(), 0.25); g.shake(4);
    for (let k = 0; k < 5; k++) g.burst(S.holes[t].x, S.holes[t].y, ['#fde68a', '#f59e0b', '#fff'], 20, 300, 1);
  } else if (!S.jumps.some(can)) { say(`막혔어요! 말 ${left}개 남음 — 되돌리기를 써보세요`); g.sfx.lose(); g.shake(3); }
}
function undo(g) {
  const mv = S.hist.pop();
  if (!mv) return;
  const [a, o, t] = mv;
  S.pegs[a] = true; S.pegs[o] = true; S.pegs[t] = false; S.sel = -1; S.anim = null;
  g.add(-10); g.sfx.tone(260, 0.05, 'sine', 0.05);
}
function restart(g) { S.pegs = S.start.slice(); S.hist = []; S.sel = -1; g.sfx.drop(); }
function say(t) { S.msg = t; S.msgT = 2.5; }
// 깊이 우선 탐색 풀이 (실패한 상태 기억, 노드 제한)
function solveFrom(pegs, jumps, limit) {
  const dead = new Set();
  let nodes = 0;
  const p = pegs.slice();
  let count = p.filter(Boolean).length;
  const path = [];
  const rec = () => {
    if (count === 1) return true;
    if (++nodes > limit) return false;
    const key = p.map((v) => (v ? 1 : 0)).join('');
    if (dead.has(key)) return false;
    for (const j of jumps) {
      const [a, o, t] = j;
      if (p[a] && p[o] && !p[t]) {
        p[a] = p[o] = false; p[t] = true; count--; path.push(j);
        if (rec()) return true;
        p[a] = p[o] = true; p[t] = false; count++; path.pop();
        if (nodes > limit) return false;
      }
    }
    dead.add(key);
    return false;
  };
  return rec() ? path.slice() : nodes > limit ? undefined : null;
}
function hint(g) {
  const r = solveFrom(S.pegs, S.jumps, 250000);
  S.hintsUsed++;
  if (r === null) { say('이 상태에선 하나만 남길 수 없어요 — 되돌려 보세요'); g.sfx.lose(); return; }
  if (r === undefined) { say('너무 복잡해서 계산하지 못했어요 😅'); return; }
  if (!r.length) return;
  S.hintMv = r[0]; S.hintT = 2; S.sel = r[0][0]; S.cur = r[0][0];
  say('파란 칸의 말을 옮겨 보세요');
  g.sfx.beep(660, 0.08);
  const tick = () => { S.hintT -= 0.1; if (S.hintT > 0) g.later(tick, 0.1); };
  g.later(tick, 0.1);
}
