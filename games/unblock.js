let S;
// 탈출 주차 (러시아워): 6×6 주차장에서 빨간 차를 오른쪽 출구로 빼내라
const UB_N = 6, UB_EXIT = 2, UB_CS = 92, UB_OX = 60, UB_OY = 70;
const UB_DIFF = [
  { name: '초급', lo: 4, hi: 8, cars: [7, 9], col: '#22c55e' },
  { name: '중급', lo: 9, hi: 14, cars: [9, 11], col: '#3b82f6' },
  { name: '고급', lo: 15, hi: 22, cars: [10, 13], col: '#f97316' },
  { name: '전문가', lo: 22, hi: 60, cars: [11, 14], col: '#dc2626' },
];
const UB_SET = 6;
const UB_COLS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1', '#78716c', '#0ea5e9', '#d946ef', '#65a30d'];
GAME({
  title: '탈출 주차', w: 960, h: 680, bg: '#d6d3d1', controls: 'dpad+ab', aLabel: '다음 차', bLabel: '되돌리기',
  help: '차를 드래그해서 앞뒤로 밀어요 (가로 차는 좌우, 세로 차는 위아래)\n빨간 차 🚗를 오른쪽 출구로 빼내면 클리어!\n키보드: Space(Z) = 다음 차 선택 · 방향키 = 이동 · X/U = 되돌리기 · H = 힌트\n최소 이동 수에 가까울수록 ⭐ 많이!',
  init(g) { S = { mode: 'select', d: 0, lvl: 0, msg: '', msgT: 0, stats: g.load('stats', [0, 0, 0, 0]) }; },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'select') {
      UB_DIFF.forEach((d, i) => { if (g.clickIn(260, 190 + i * 105, 440, 85) || g.keyp('Digit' + (i + 1))) { S.d = i; S.lvl = 0; newLevel(g); g.sfx.click(); } });
      g.info = '난이도를 고르세요';
      return;
    }
    // 차 위치 애니메이션
    for (const c of S.cars) { c.ax += (c.x - c.ax) * Math.min(1, dt * 16); c.ay += (c.y - c.ay) * Math.min(1, dt * 16); }
    if (S.exiting) {
      const r = S.cars[0];
      r.ax += dt * 14; r.x = r.ax;
      if (Math.random() < 0.5) g.burst(UB_OX + (r.ax) * UB_CS, UB_OY + UB_EXIT * UB_CS + UB_CS / 2, ['#9ca3af', '#e5e7eb'], 2, 80, 0.5, 5);
      if (r.ax > UB_N + 2) {
        S.exiting = false; S.clear = 2;
      }
      return;
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) { S.lvl++; if (S.lvl >= UB_SET) return g.win(`${UB_DIFF[S.d].name} ${UB_SET}판 모두 탈출!`); newLevel(g); }
      return;
    }
    S.time += dt;
    const gx = (m.x - UB_OX) / UB_CS, gy = (m.y - UB_OY) / UB_CS;
    if (m.clicked) {
      const ci = carAt(Math.floor(gx), Math.floor(gy));
      if (ci >= 0) { S.sel = ci; S.drag = { ci, sx: gx, sy: gy, ox: S.cars[ci].x, oy: S.cars[ci].y }; g.sfx.click(); }
      if (g.inRect(700, 330, 230, 50)) undo(g);
      if (g.inRect(700, 390, 230, 50)) hint(g);
      if (g.inRect(700, 450, 230, 50)) restart(g);
      if (g.inRect(700, 590, 110, 44)) S.mode = 'select';
      if (g.inRect(820, 590, 110, 44)) { g.add(-50); S.lvl++; if (S.lvl >= UB_SET) S.lvl = 0; newLevel(g); }
    }
    if (S.drag && m.down) {
      const c = S.cars[S.drag.ci];
      const [lo, hi] = range(S.drag.ci);
      if (c.h) { const t = U.clamp(S.drag.ox + (gx - S.drag.sx), lo, hi); c.ax = t; c.x = Math.round(t); }
      else { const t = U.clamp(S.drag.oy + (gy - S.drag.sy), lo, hi); c.ay = t; c.y = Math.round(t); }
    }
    if (S.drag && !m.down) {
      const c = S.cars[S.drag.ci];
      if (c.x !== S.drag.ox || c.y !== S.drag.oy) commitMove(g, S.drag.ci, S.drag.ox, S.drag.oy);
      S.drag = null;
    }
    if (g.pressed('a')) { S.sel = (S.sel + 1) % S.cars.length; g.sfx.tone(600, 0.03, 'sine', 0.04); }
    if (g.keyp('Tab')) S.sel = (S.sel + 1) % S.cars.length;
    const c = S.cars[S.sel];
    let dir = 0;
    if (c.h) { if (g.pressed('left')) dir = -1; if (g.pressed('right')) dir = 1; }
    else { if (g.pressed('up')) dir = -1; if (g.pressed('down')) dir = 1; }
    if (dir) {
      const [lo, hi] = range(S.sel);
      const ox = c.x, oy = c.y;
      if (c.h) c.x = U.clamp(c.x + dir, lo, hi); else c.y = U.clamp(c.y + dir, lo, hi);
      if (c.x !== ox || c.y !== oy) commitMove(g, S.sel, ox, oy); else g.sfx.beep(150, 0.04);
    }
    if (g.pressed('b') || g.keyp('KeyU')) undo(g);
    if (g.keyp('KeyH')) hint(g);
    g.info = `${UB_DIFF[S.d].name} ${S.lvl + 1}/${UB_SET} · 이동 ${S.moves} (최소 ${S.opt}) · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🚗 탈출 주차', 480, 80, 48, '#1c1917');
      g.text('차들을 밀어서 빨간 차가 출구로 나갈 길을 만드세요', 480, 135, 18, '#44403c', 'center', '600');
      UB_DIFF.forEach((d, i) => {
        g.button(260, 190 + i * 105, 440, 85, `${i + 1}. ${d.name}  (최소 ${d.lo}수+)`, d.col, 24);
        g.text(`탈출 ${S.stats[i] || 0}`, 720, 232 + i * 105, 16, '#57534e', 'left', '600');
      });
      return;
    }
    const B = UB_N * UB_CS;
    g.rrect(UB_OX - 18, UB_OY - 18, B + 36, B + 36, 18, '#44403c');
    g.rect(UB_OX, UB_OY, B, B, '#a8a29e');
    for (let y = 0; y < UB_N; y++) for (let x = 0; x < UB_N; x++) g.rrect(UB_OX + x * UB_CS + 3, UB_OY + y * UB_CS + 3, UB_CS - 6, UB_CS - 6, 6, '#b8b2ac');
    // 출구
    g.rect(UB_OX + B, UB_OY + UB_EXIT * UB_CS + 6, 22, UB_CS - 12, '#a8a29e');
    g.text('EXIT ▶', UB_OX + B + 50, UB_OY + UB_EXIT * UB_CS - 12, 14, '#dc2626');
    for (let i = 0; i < 3; i++) g.poly([[UB_OX + B + 26 + i * 12, UB_OY + UB_EXIT * UB_CS + 30], [UB_OX + B + 36 + i * 12, UB_OY + UB_EXIT * UB_CS + UB_CS / 2], [UB_OX + B + 26 + i * 12, UB_OY + UB_EXIT * UB_CS + UB_CS - 30]], `rgba(220,38,38,${0.3 + 0.7 * ((Math.floor(g.time * 4) + i) % 3 === 0)})`);
    c.save();
    c.beginPath(); c.rect(UB_OX - 18, UB_OY - 18, B + 300, B + 36); c.clip();
    S.cars.forEach((car, i) => {
      const px = UB_OX + car.ax * UB_CS, py = UB_OY + car.ay * UB_CS;
      const w = (car.h ? car.len : 1) * UB_CS, h = (car.h ? 1 : car.len) * UB_CS;
      g.rrect(px + 7, py + 10, w - 10, h - 10, 14, 'rgba(0,0,0,.25)');
      g.rrect(px + 5, py + 5, w - 10, h - 10, 14, car.col, i === S.sel ? '#fff' : 'rgba(0,0,0,.3)', i === S.sel ? 4 : 2);
      // 유리창
      if (car.h) { g.rrect(px + w - 38, py + 16, 18, h - 32, 5, 'rgba(219,234,254,.85)'); g.rrect(px + 14, py + 18, 14, h - 36, 4, 'rgba(219,234,254,.6)'); }
      else { g.rrect(px + 16, py + h - 38, w - 32, 18, 5, 'rgba(219,234,254,.85)'); g.rrect(px + 18, py + 14, w - 36, 14, 4, 'rgba(219,234,254,.6)'); }
      if (i === 0) g.emoji('😎', px + w / 2 - 8, py + h / 2, 34);
      else if (car.len === 3) g.emoji(car.h ? '📦' : '📦', px + w / 2, py + h / 2, 30);
      if (S.hintCar === i && S.hintT > 0) g.rrect(px + 2, py + 2, w - 4, h - 4, 14, null, '#22c55e', 5);
    });
    c.restore();
    if (S.hintT > 0) S.hintT -= 1 / 60;
    // 패널
    g.rrect(690, 20, 250, 640, 16, '#fafaf9', '#a8a29e');
    g.text('탈출 주차', 815, 58, 28, '#1c1917');
    g.text(`${UB_DIFF[S.d].name} · ${S.lvl + 1}/${UB_SET}`, 815, 95, 18, UB_DIFF[S.d].col);
    g.text(`이동 ${S.moves}`, 815, 140, 26, '#1c1917');
    g.text(`최소 ${S.opt}수`, 815, 175, 18, '#57534e', 'center', '600');
    g.text(`⏱️ ${U.fmtTime(S.time)}   💡 ${S.hintsUsed}`, 815, 208, 17, '#57534e', 'center', '600');
    const st = stars();
    g.text('⭐'.repeat(st) + '☆'.repeat(3 - st), 815, 250, 28, '#ca8a04');
    g.text('★3: 최소+2 이내 · ★2: 최소×1.5', 815, 285, 12, '#78716c', 'center', '600');
    g.button(700, 330, 230, 50, `↶ 되돌리기 (${S.hist.length})`, '#57534e', 18);
    g.button(700, 390, 230, 50, '💡 힌트 (최적 한 수)', '#15803d', 17);
    g.button(700, 450, 230, 50, '⟲ 처음부터', '#78716c', 18);
    g.button(700, 590, 110, 44, '난이도', '#44403c', 16);
    g.button(820, 590, 110, 44, '건너뛰기', '#44403c', 16);
    if (S.msgT > 0) { g.rrect(150, 625, 380, 44, 12, 'rgba(28,25,23,.9)'); g.text(S.msg, 340, 647, 17, '#fff'); }
    if (S.clear > 0) {
      g.rrect(130, 250, 420, 150, 20, 'rgba(28,25,23,.92)', '#facc15', 3);
      g.text('🏁 탈출 성공!', 340, 290, 34, '#fff');
      g.text('⭐'.repeat(S.lastStars) + '☆'.repeat(3 - S.lastStars), 340, 333, 28, '#facc15');
      g.text(`+${S.lastPts}점`, 340, 372, 20, '#fde68a');
    }
  },
});

function occ(cars, skip) {
  const o = new Array(UB_N * UB_N).fill(-1);
  cars.forEach((c, i) => {
    if (i === skip) return;
    for (let k = 0; k < c.len; k++) o[(c.y + (c.h ? 0 : k)) * UB_N + c.x + (c.h ? k : 0)] = i;
  });
  return o;
}
function carAt(x, y) {
  if (x < 0 || y < 0 || x >= UB_N || y >= UB_N) return -1;
  return occ(S.cars)[y * UB_N + x];
}
function range(i) {
  const c = S.cars[i], o = occ(S.cars, i);
  let lo = c.h ? c.x : c.y, hi = lo;
  if (c.h) { while (lo > 0 && o[c.y * UB_N + lo - 1] < 0) lo--; while (hi + c.len < UB_N && o[c.y * UB_N + hi + c.len] < 0) hi++; }
  else { while (lo > 0 && o[(lo - 1) * UB_N + c.x] < 0) lo--; while (hi + c.len < UB_N && o[(hi + c.len) * UB_N + c.x] < 0) hi++; }
  return [lo, hi];
}
// BFS 풀이: 반환 {dist, path(첫 수)}  상태 = 각 차의 가변 좌표
function solve(cars, wantPath) {
  const n = cars.length, fixed = cars.map((c) => (c.h ? c.y : c.x));
  const start = cars.map((c) => (c.h ? c.x : c.y));
  const key = (s) => String.fromCharCode(...s);
  const prev = new Map([[key(start), null]]);
  let frontier = [start], depth = 0;
  const grid = new Int8Array(36);
  while (frontier.length) {
    const next = [];
    for (const s of frontier) {
      // 빨간 차의 출구까지 길이 열려 있으면 +1수로 탈출
      grid.fill(-1);
      for (let i = 0; i < n; i++) { const c = cars[i]; for (let k = 0; k < c.len; k++) grid[(c.h ? fixed[i] : s[i] + k) * 6 + (c.h ? s[i] + k : fixed[i])] = i; }
      let free = true;
      for (let x = s[0] + 2; x < 6; x++) if (grid[UB_EXIT * 6 + x] >= 0) { free = false; break; }
      if (free) {
        if (!wantPath) return { dist: depth + (s[0] === 4 ? 0 : 1) };
        // 경로 복원
        const seq = [];
        let k = key(s);
        while (prev.get(k)) { const p = prev.get(k); seq.unshift(p.move); k = p.from; }
        if (s[0] !== 4) seq.push({ i: 0, v: 4 });
        return { dist: seq.length, seq };
      }
      for (let i = 0; i < n; i++) {
        const c = cars[i];
        for (const d of [-1, 1]) {
          let v = s[i];
          while (true) {
            v += d;
            if (v < 0 || v + c.len > 6) break;
            const cell = d < 0 ? v : v + c.len - 1;
            const idx = c.h ? fixed[i] * 6 + cell : cell * 6 + fixed[i];
            if (grid[idx] >= 0) break;
            const ns = s.slice(); ns[i] = v;
            const k = key(ns);
            if (!prev.has(k)) { prev.set(k, wantPath ? { from: key(s), move: { i, v } } : 1); next.push(ns); }
          }
        }
      }
    }
    if (prev.size > 400000) return null;
    frontier = next; depth++;
  }
  return null;
}
function randomCar(cars) {
  const h = Math.random() < 0.5, len = Math.random() < 0.3 ? 3 : 2;
  for (let t = 0; t < 30; t++) {
    const x = U.randi(0, h ? UB_N - len : UB_N - 1), y = U.randi(0, h ? UB_N - 1 : UB_N - len);
    if (h && y === UB_EXIT) continue; // 출구 줄에는 가로 차 금지(너무 막힘)
    const c = { x, y, h, len };
    const o = occ(cars);
    let ok = true;
    for (let k = 0; k < len; k++) if (o[(y + (h ? 0 : k)) * UB_N + x + (h ? k : 0)] >= 0) { ok = false; break; }
    if (ok) return c;
  }
  return null;
}
function generate(D) {
  const t0 = Date.now(), budget = 450 + S.d * 450;
  let best = null, bestD = -1;
  while (Date.now() - t0 < budget) {
    let cars = [{ x: U.randi(0, 2), y: UB_EXIT, h: true, len: 2 }];
    const want = U.randi(D.cars[0], D.cars[1]);
    while (cars.length < want) { const c = randomCar(cars); if (!c) break; cars.push(c); }
    let r = solve(cars);
    if (!r) continue;
    let cur = r.dist, stuck = 0;
    // 언덕 오르기: 변형해서 같거나 더 어려워지면 채택
    while (cur < D.lo && stuck < 400 && Date.now() - t0 < budget) {
      const nc = cars.map((c) => ({ ...c }));
      const op = Math.random();
      if (op < 0.45 && nc.length > 3) nc.splice(U.randi(1, nc.length - 1), 1);
      if (op >= 0.3 || nc.length < D.cars[0]) { const c = randomCar(nc); if (c) nc.push(c); }
      if (op < 0.1) { const c = randomCar(nc); if (c) nc.push(c); }
      if (nc.length > D.cars[1] + 1) { stuck++; continue; }
      const rr = solve(nc);
      if (rr && rr.dist >= cur && rr.dist <= D.hi) { if (rr.dist > cur) stuck = 0; else stuck++; cars = nc; cur = rr.dist; } else stuck++;
    }
    if (cur >= D.lo && cur <= D.hi) return cars;
    if (cur <= D.hi && cur > bestD) { best = cars; bestD = cur; }
  }
  return best || [{ x: 0, y: UB_EXIT, h: true, len: 2 }, { x: 3, y: 1, h: false, len: 3 }];
}
function newLevel(g) {
  const D = UB_DIFF[S.d];
  const raw = generate(D);
  S.cars = raw.map((c, i) => ({ ...c, ax: c.x, ay: c.y, col: i === 0 ? '#dc2626' : UB_COLS[1 + ((i - 1) % (UB_COLS.length - 1))] }));
  S.start = S.cars.map((c) => [c.x, c.y]);
  S.opt = solve(S.cars).dist;
  S.mode = 'play'; S.moves = 0; S.hist = []; S.time = 0; S.hintsUsed = 0; S.clear = 0; S.exiting = false; S.sel = 0; S.drag = null; S.hintT = 0;
  g.sfx.tone(392, 0.08, 'triangle', 0.06);
}
function restart(g) {
  S.cars.forEach((c, i) => { c.x = S.start[i][0]; c.y = S.start[i][1]; });
  S.hist = []; S.moves = 0; g.sfx.drop();
}
function say(t) { S.msg = t; S.msgT = 2; }
function commitMove(g, i, ox, oy) {
  S.hist.push({ i, x: ox, y: oy });
  S.moves++;
  g.sfx.tone(240 + i * 20, 0.06, 'square', 0.03);
  checkExit(g);
}
function undo(g) {
  const h = S.hist.pop();
  if (!h) return;
  S.cars[h.i].x = h.x; S.cars[h.i].y = h.y; S.moves = Math.max(0, S.moves - 1);
  g.sfx.tone(300, 0.05, 'sine', 0.05);
}
function stars() {
  const m = Math.max(S.moves, S.opt);
  return m <= S.opt + 2 ? 3 : m <= S.opt * 1.5 + 2 ? 2 : 1;
}
function checkExit(g) {
  const r = S.cars[0];
  const o = occ(S.cars, 0);
  for (let x = r.x + 2; x < UB_N; x++) if (o[UB_EXIT * UB_N + x] >= 0) return;
  if (r.x + 2 < UB_N) return; // 출구 끝까지 밀어야 탈출
  S.exiting = true; S.drag = null;
  const st = stars() - (S.hintsUsed > 2 ? 1 : 0);
  S.lastStars = Math.max(1, st);
  const pts = Math.max(100, S.opt * 60 * (S.d + 1) + S.lastStars * 150 - S.hintsUsed * 80 - Math.floor(S.time));
  S.lastPts = pts; g.add(pts);
  S.stats[S.d] = (S.stats[S.d] || 0) + 1; g.save('stats', S.stats);
  g.sfx.tone(300, 0.4, 'sawtooth', 0.05, 900); g.later(() => g.sfx.win(), 0.3); g.shake(5);
}
function hint(g) {
  const r = solve(S.cars, true);
  if (!r || !r.seq || !r.seq.length) { say('이미 출구가 열려 있어요! 빨간 차를 끝까지 밀어요'); return; }
  const mv = r.seq[0];
  const c = S.cars[mv.i];
  const ox = c.x, oy = c.y;
  if (c.h) c.x = mv.v; else c.y = mv.v;
  S.hintsUsed++; S.hintCar = mv.i; S.hintT = 1; S.sel = mv.i;
  say(`남은 최소 ${r.dist - 1}수`);
  g.sfx.power();
  commitMove(g, mv.i, ox, oy);
}
