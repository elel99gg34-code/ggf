'use strict';
let S;
const LG_CS = 4, LG_GW = 240, LG_GH = 115, LG_WH = 460, LG_TICK = 0.075, LG_SPLAT = 30;
const LG_SK = [
  { id: 'climb', n: '등반', e: '🧗' }, { id: 'float', n: '낙하산', e: '☂️' }, { id: 'bomb', n: '폭파', e: '💣' }, { id: 'block', n: '막기', e: '✋' },
  { id: 'build', n: '계단', e: '🧱' }, { id: 'bash', n: '수평굴', e: '👊' }, { id: 'mine', n: '사선굴', e: '⛏️' }, { id: 'dig', n: '수직굴', e: '⬇️' },
];
// skills order: climb float bomb block build bash mine dig
const LG_LV = [
  { name: '그냥 파 보세요', n: 10, need: 5, time: 180, rr: 50, sk: [0, 0, 0, 0, 0, 0, 0, 10], hatch: [160, 120], exit: [800, 432],
    b: (T) => { T.rect(80, 250, 800, 50); T.rect(80, 150, 20, 100); T.rect(860, 150, 20, 100); T.rect(40, 360, 900, 100); T.rect(40, 300, 20, 60); T.rect(920, 300, 20, 60); } },
  { name: '다리를 놓아라', n: 15, need: 10, time: 200, rr: 50, sk: [0, 0, 0, 0, 12, 0, 0, 0], hatch: [120, 140], exit: [850, 312],
    b: (T) => { T.rect(40, 330, 360, 130); T.rect(20, 200, 20, 260); T.rect(560, 340, 400, 120); T.water(400, 420, 160, 40); } },
  { name: '절벽 주의', n: 20, need: 15, time: 180, rr: 60, sk: [0, 0, 2, 4, 0, 0, 0, 6], hatch: [480, 100], exit: [480, 432],
    b: (T) => { T.rect(260, 260, 440, 40); T.rect(100, 360, 760, 100); T.water(0, 440, 100, 20); T.water(860, 440, 100, 20); T.rect(0, 440, 100, 20, 0); } },
  { name: '벽을 넘어서', n: 20, need: 14, time: 200, rr: 50, sk: [20, 20, 0, 0, 0, 0, 0, 0], hatch: [120, 200], exit: [840, 432],
    b: (T) => { T.rect(20, 360, 920, 100); T.rect(0, 200, 20, 260); T.rect(420, 120, 50, 240); T.rect(940, 200, 20, 260); } },
  { name: '뚫고 지나가기', n: 20, need: 16, time: 220, rr: 50, sk: [0, 0, 0, 0, 0, 10, 0, 0], hatch: [100, 220], exit: [880, 352],
    b: (T) => { T.rect(20, 380, 920, 80); T.rect(0, 200, 20, 260); T.rect(260, 260, 60, 120); T.rect(480, 230, 80, 150); T.rect(700, 280, 50, 100); T.rect(940, 200, 20, 260); } },
  { name: '깊은 동굴', n: 20, need: 15, time: 240, rr: 55, sk: [0, 5, 0, 2, 0, 0, 10, 4], hatch: [140, 60], exit: [800, 432],
    b: (T) => { T.rect(40, 160, 600, 220); T.rect(20, 40, 20, 340); T.steel(640, 160, 20, 140); T.rect(40, 440, 900, 20); T.rect(660, 380, 280, 60); T.rect(940, 200, 20, 260); T.erase(300, 260, 120, 60); } },
  { name: '강철 미로', n: 25, need: 18, time: 240, rr: 50, sk: [0, 4, 4, 4, 8, 6, 0, 6], hatch: [100, 60], exit: [860, 432],
    b: (T) => { T.rect(40, 160, 420, 30); T.steel(460, 160, 40, 30); T.rect(20, 40, 20, 160); T.rect(300, 300, 640, 40); T.steel(300, 300, 100, 40); T.rect(40, 440, 900, 20); T.rect(560, 340, 40, 100); T.steel(940, 200, 20, 260); } },
  { name: '산 넘고 물 건너', n: 30, need: 22, time: 260, rr: 55, sk: [6, 10, 2, 3, 12, 4, 4, 4], hatch: [90, 120], exit: [880, 280],
    b: (T) => { T.rect(20, 300, 260, 160); T.ellipse(380, 360, 140, 120); T.water(280, 430, 380, 30); T.rect(660, 300, 300, 160); T.rect(500, 200, 30, 140); T.rect(0, 100, 20, 360); } },
  { name: '탑 아래로', n: 30, need: 20, time: 260, rr: 60, sk: [0, 8, 5, 4, 6, 4, 6, 8], hatch: [480, 40], exit: [120, 432],
    b: (T) => { T.rect(380, 100, 200, 30); T.rect(400, 200, 160, 30); T.rect(380, 300, 200, 30); T.steel(370, 60, 10, 280); T.steel(580, 60, 10, 280); T.rect(20, 440, 920, 20); T.water(600, 420, 360, 40); T.rect(200, 380, 40, 60); } },
  { name: '최후의 시험', n: 40, need: 30, time: 300, rr: 50, sk: [6, 6, 4, 4, 10, 5, 5, 5], hatch: [80, 60], exit: [890, 152],
    b: (T) => { T.rect(20, 140, 300, 40); T.rect(0, 20, 20, 160); T.steel(320, 140, 30, 40); T.rect(20, 300, 500, 40); T.rect(20, 440, 920, 20); T.water(520, 400, 200, 60); T.rect(720, 360, 240, 100); T.rect(700, 170, 260, 30); T.rect(620, 200, 40, 160); T.steel(940, 0, 20, 170); } },
];
GAME({
  title: '레밍즈 구출', w: 960, h: 600, bg: '#0b1020', controls: 'none', noAutoPause: false,
  help: '아래 패널에서 기술(1~8)을 고른 뒤 레밍을 클릭해 역할 부여\n🧗등반 ☂️낙하산 💣폭파 ✋막기 🧱계단 👊수평굴 ⛏️사선굴 ⬇️수직굴\n−/+ 로 투입 속도 조절 · Shift/X 빨리감기 · N 전체 폭파(핵)\n목표 수 이상을 출구 🚪로 구출하면 다음 단계 · 높은 데서 떨어지면 철퍼덕!\n총 10단계 · 기회 5번',
  init(g) { S = { lvl: 0, lives: 5, total: 0 }; loadLevel(g, 0); },
  update(g, dt) {
    if (S.phase === 'result') {
      if (g.clickIn(380, 360, 200, 50) || g.pressed('a')) {
        if (S.passed) { S.lvl++; if (S.lvl >= LG_LV.length) return g.win(`모든 단계 클리어! 총 ${S.total}마리 구출`); loadLevel(g, S.lvl); }
        else { if (S.lives <= 0) return g.over(`${S.lvl + 1}단계에서 실패`); loadLevel(g, S.lvl); }
      }
      return;
    }
    // input
    for (let i = 0; i < 8; i++) if (g.keyp('Digit' + (i + 1))) S.sel = i;
    if (g.keyp('Minus') || g.keyp('NumpadSubtract')) S.rr = Math.max(S.minRR, S.rr - 10);
    if (g.keyp('Equal') || g.keyp('NumpadAdd')) S.rr = Math.min(99, S.rr + 10);
    if (g.pressed('b')) S.ff = !S.ff;
    if (g.keyp('KeyN')) nuke(g);
    if (g.mouse.clicked) {
      const m = g.mouse;
      if (m.y > LG_WH) panelClick(g, m.x, m.y);
      else { const L = pick(m.x, m.y); if (L) assign(g, L); }
    }
    S.hover = g.mouse.y < LG_WH ? pick(g.mouse.x, g.mouse.y) : null;
    const sp = S.ff ? 3 : 1;
    S.acc += dt * sp;
    S.timeLeft -= dt * sp;
    while (S.acc >= LG_TICK) { S.acc -= LG_TICK; tick(g); }
    if (S.timeLeft <= 0 && !S.ended) { S.ended = true; for (const L of S.lems) if (L.st !== 'dead' && L.st !== 'saved') kill(g, L, 'time'); }
    const alive = S.lems.filter((L) => L.st !== 'dead' && L.st !== 'saved').length;
    if ((S.spawned >= S.L.n || S.nuked) && alive === 0) finish(g);
    g.info = `${S.lvl + 1}. ${S.L.name} · 구출 ${S.saved}/${S.L.need}`;
  },
  draw(g, c) {
    // sky
    const gr = c.createLinearGradient(0, 0, 0, LG_WH); gr.addColorStop(0, '#0f172a'); gr.addColorStop(1, '#312e81');
    g.rect(0, 0, 960, LG_WH, gr);
    for (let i = 0; i < 50; i++) g.circle((i * 211) % 960, (i * 97) % 300, 1, 'rgba(255,255,255,.4)');
    if (S.tc) c.drawImage(S.tc, 0, 0);
    // water
    for (const w of S.waters) { g.rect(w.x, w.y, w.w, w.h, 'rgba(37,99,235,.75)'); for (let x = w.x; x < w.x + w.w; x += 16) g.circle(x + 8, w.y + Math.sin(S.time * 4 + x) * 2, 6, 'rgba(147,197,253,.6)'); }
    // hatch & exit
    const [hx, hy] = S.L.hatch; g.rect(hx - 24, hy - 26, 48, 18, '#78350f'); g.rect(hx - 20, hy - 10, 40, 6, S.spawned < S.L.n ? '#111' : '#451a03');
    const [ex, ey] = S.L.exit; g.rect(ex - 20, ey - 34, 40, 34, '#7c2d12'); g.rect(ex - 12, ey - 26, 24, 26, '#fbbf24'); g.emoji('🚪', ex, ey - 16, 28); g.circle(ex - 22, ey - 40, 4 + Math.sin(S.time * 10), '#f97316'); g.circle(ex + 22, ey - 40, 4 + Math.cos(S.time * 10), '#f97316');
    // lemmings
    for (const L of S.lems) if (L.st !== 'dead' && L.st !== 'saved') drawLem(g, L);
    if (S.hover) { const L = S.hover; g.stroke(L.x * LG_CS - 8, L.y * LG_CS - 14, 18, 20, '#fff', 1.5); }
    if (g.mouse.y < LG_WH) { const m = g.mouse; g.line(m.x - 10, m.y, m.x - 3, m.y, '#fff', 2); g.line(m.x + 3, m.y, m.x + 10, m.y, '#fff', 2); g.line(m.x, m.y - 10, m.x, m.y - 3, '#fff', 2); g.line(m.x, m.y + 3, m.x, m.y + 10, '#fff', 2); }
    drawPanel(g, c);
    if (S.msgT > 0) { S.msgT -= 1 / 60; g.text(S.msg, 480, 60, 26, '#fde047'); }
    if (S.phase === 'result') {
      g.rrect(260, 140, 440, 290, 18, 'rgba(15,23,42,.95)', S.passed ? '#4ade80' : '#f87171', 3);
      g.text(S.passed ? '🎉 단계 성공!' : '😢 구출 실패', 480, 185, 32, S.passed ? '#4ade80' : '#f87171');
      g.text(`구출 ${S.saved} / 필요 ${S.L.need} (총 ${S.L.n})`, 480, 240, 20, '#e2e8f0');
      g.text(`구출률 ${Math.round(S.saved / S.L.n * 100)}%`, 480, 275, 18, '#cbd5e1');
      g.text(S.passed ? `+${S.gain}점` : `남은 기회 ${S.lives}`, 480, 315, 18, '#fde047');
      g.button(380, 360, 200, 50, S.passed ? (S.lvl >= LG_LV.length - 1 ? '완료!' : '다음 단계 ▶') : S.lives > 0 ? '다시 도전 ↻' : '끝', S.passed ? '#15803d' : '#b91c1c', 20);
    }
  },
});
/* ---------- terrain ---------- */
function loadLevel(g, i) {
  const L = LG_LV[i];
  S.L = L; S.grid = new Uint8Array(LG_GW * LG_GH); S.waters = [];
  S.tc = null;
  try { S.tc = document.createElement('canvas'); S.tc.width = 960; S.tc.height = LG_WH; S.tctx = S.tc.getContext('2d'); } catch (e) { S.tc = null; }
  const T = {
    rect: (x, y, w, h, v = 1) => { for (let cy = Math.floor(y / LG_CS); cy < Math.ceil((y + h) / LG_CS); cy++) for (let cx = Math.floor(x / LG_CS); cx < Math.ceil((x + w) / LG_CS); cx++) setC(cx, cy, v); },
    steel: (x, y, w, h) => T.rect(x, y, w, h, 2),
    erase: (x, y, w, h) => T.rect(x, y, w, h, 0),
    ellipse: (x, y, rx, ry) => { for (let cy = Math.floor((y - ry) / LG_CS); cy <= (y + ry) / LG_CS; cy++) for (let cx = Math.floor((x - rx) / LG_CS); cx <= (x + rx) / LG_CS; cx++) { const dx = (cx * LG_CS - x) / rx, dy = (cy * LG_CS - y) / ry; if (dx * dx + dy * dy <= 1) setC(cx, cy, 1); } },
    water: (x, y, w, h) => S.waters.push({ x, y, w, h }),
  };
  L.b(T);
  redraw();
  S.lems = []; S.spawned = 0; S.saved = 0; S.dead = 0; S.spawnT = 1.5; S.rr = L.rr; S.minRR = L.rr; S.sel = L.sk.findIndex((n) => n > 0); S.skills = L.sk.slice();
  S.timeLeft = L.time; S.acc = 0; S.time = 0; S.ff = false; S.nuked = false; S.ended = false; S.phase = 'play'; S.msg = `${i + 1}. ${L.name} — ${L.need}/${L.n}마리 구출`; S.msgT = 3; S.hover = null;
  if (g) g.sfx.power();
}
function idx(x, y) { return y * LG_GW + x; }
function cell(x, y) { if (x < 0 || x >= LG_GW || y < 0) return 0; if (y >= LG_GH) return 0; return S.grid[idx(x, y)]; }
function solid(x, y) { return cell(x, y) > 0; }
function setC(x, y, v) { if (x < 0 || x >= LG_GW || y < 0 || y >= LG_GH) return; S.grid[idx(x, y)] = v; }
function dirtCol(x, y) { const h = (x * 73856093 ^ y * 19349663) >>> 0; return ['#a16207', '#92400e', '#b45309', '#854d0e'][h % 4]; }
function paint(x, y) {
  if (!S.tctx) return;
  const v = cell(x, y);
  if (!v) S.tctx.clearRect(x * LG_CS, y * LG_CS, LG_CS, LG_CS);
  else { S.tctx.fillStyle = v === 2 ? ((x + y) % 2 ? '#94a3b8' : '#64748b') : v === 3 ? '#fcd34d' : (!solid(x, y - 1) ? '#16a34a' : dirtCol(x, y)); S.tctx.fillRect(x * LG_CS, y * LG_CS, LG_CS, LG_CS); }
}
function redraw() { if (!S.tctx) return; S.tctx.clearRect(0, 0, 960, LG_WH); for (let y = 0; y < LG_GH; y++) for (let x = 0; x < LG_GW; x++) if (S.grid[idx(x, y)]) paint(x, y); }
function removeC(x, y) { if (cell(x, y) === 1 || cell(x, y) === 3) { setC(x, y, 0); paint(x, y); if (solid(x, y + 1)) paint(x, y + 1); return 1; } return cell(x, y) === 2 ? -1 : 0; }
function addC(x, y) { if (x < 0 || x >= LG_GW || y < 0 || y >= LG_GH || cell(x, y)) return; setC(x, y, 3); paint(x, y); }
/* ---------- lemmings ---------- */
function tick(g) {
  S.time += LG_TICK;
  // spawn
  if (S.spawned < S.L.n && !S.nuked) {
    S.spawnT -= LG_TICK;
    if (S.spawnT <= 0) {
      S.spawnT = 0.35 + (100 - S.rr) / 40;
      const [hx, hy] = S.L.hatch;
      S.lems.push({ x: Math.round(hx / LG_CS), y: Math.round(hy / LG_CS), dir: 1, st: 'fall', fd: 0, climb: false, float: false, bomb: -1, n: 0, k: 0, anim: 0 });
      S.spawned++;
      if (g) g.sfx.tone(700, 0.04, 'square', 0.03);
    }
  }
  for (const L of S.lems) if (L.st !== 'dead' && L.st !== 'saved') updLem(g, L);
}
function blockerAt(x, y, self) { for (const b of S.lems) if (b !== self && b.st === 'block' && Math.abs(b.x - x) <= 1 && Math.abs(b.y - y) <= 4) return true; return false; }
function inWater(L) { const px = L.x * LG_CS, py = L.y * LG_CS; for (const w of S.waters) if (px >= w.x && px <= w.x + w.w && py >= w.y) return true; return false; }
function updLem(g, L) {
  L.anim++;
  if (L.bomb >= 0) { L.bomb -= LG_TICK; if (L.bomb <= 0) return explode(g, L); }
  if (L.y >= LG_GH + 2 || inWater(L)) return kill(g, L, inWater(L) ? 'water' : 'fall');
  const [ex, ey] = S.L.exit;
  if (L.st !== 'fall' && Math.abs(L.x * LG_CS - ex) < 12 && Math.abs(L.y * LG_CS - ey) < 12) { L.st = 'saved'; S.saved++; if (g) { g.sfx.coin(); g.add(100, ex, ey - 40); } return; }
  switch (L.st) {
    case 'fall': {
      const sp = L.float && L.fd > 8 ? 1 : 2;
      for (let i = 0; i < sp; i++) {
        if (solid(L.x, L.y + 1)) {
          if (L.fd > LG_SPLAT && !L.float) return kill(g, L, 'splat');
          L.st = 'walk'; L.fd = 0; return;
        }
        L.y++; L.fd++;
        if (L.y >= LG_GH + 2) return kill(g, L, 'fall');
      }
      return;
    }
    case 'walk': return walk(g, L);
    case 'block': if (!solid(L.x, L.y + 1)) { L.st = 'fall'; L.fd = 0; } return;
    case 'climb': {
      if (solid(L.x, L.y - 3)) { L.dir = -L.dir; L.x += L.dir; L.st = 'fall'; L.fd = 0; return; }
      if (L.anim % 2) return;
      L.y--;
      if (!solid(L.x + L.dir, L.y) && !solid(L.x + L.dir, L.y - 1)) { L.x += L.dir; L.y--; L.st = 'walk'; }
      return;
    }
    case 'build': {
      L.k++;
      if (L.k % 4) return;
      if (solid(L.x + L.dir, L.y - 1) || solid(L.x + L.dir * 2, L.y - 1) || solid(L.x + L.dir, L.y - 3)) { L.dir = -L.dir; L.st = 'walk'; return; }
      for (let k = 0; k < 4; k++) addC(L.x + L.dir * k, L.y);
      L.x += L.dir * 2; L.y -= 1; L.n++;
      if (g) g.sfx.tone(L.n >= 10 ? 900 : 500, 0.03, 'square', 0.03);
      if (L.n >= 12) { L.st = 'walk'; L.shrug = 10; }
      return;
    }
    case 'bash': {
      L.k++; if (L.k % 2) return;
      let st = false, any = 0;
      for (let dx = 1; dx <= 3; dx++) for (let dy = -3; dy <= 0; dy++) { const r = removeC(L.x + L.dir * dx, L.y + dy); if (r < 0) st = true; else any += r; }
      if (st) { if (g) g.sfx.hit(); L.st = 'walk'; L.dir = -L.dir; return; }
      L.x += L.dir;
      if (!solid(L.x, L.y + 1)) { L.st = 'fall'; L.fd = 0; return; }
      let ahead = false; for (let dx = 1; dx <= 6 && !ahead; dx++) for (let dy = -3; dy <= 0; dy++) if (cell(L.x + L.dir * dx, L.y + dy) === 1 || cell(L.x + L.dir * dx, L.y + dy) === 3) { ahead = true; break; }
      if (!ahead && !any) L.st = 'walk';
      return;
    }
    case 'dig': {
      L.k++; if (L.k % 3) return;
      let st = false, any = 0;
      for (let dx = -2; dx <= 2; dx++) { const r = removeC(L.x + dx, L.y + 1); if (r < 0) st = true; else any += r; }
      if (st) { L.st = 'walk'; return; }
      if (!any) { L.st = 'fall'; L.fd = 0; return; }
      L.y++;
      return;
    }
    case 'mine': {
      L.k++; if (L.k % 3) return;
      let st = false;
      for (let dx = 0; dx <= 3; dx++) for (let dy = -3; dy <= 1; dy++) { const r = removeC(L.x + L.dir * dx, L.y + dy); if (r < 0) st = true; }
      if (st) { L.st = 'walk'; L.dir = -L.dir; return; }
      L.x += L.dir; L.y += 1;
      if (!solid(L.x, L.y + 1) && !solid(L.x + L.dir, L.y + 2)) { L.st = 'fall'; L.fd = 0; }
      return;
    }
  }
}
function walk(g, L) {
  if (!solid(L.x, L.y + 1)) { L.st = 'fall'; L.fd = 0; return; }
  if (L.shrug > 0) { L.shrug--; return; }
  const nx = L.x + L.dir;
  if (nx < 1 || nx >= LG_GW - 1 || blockerAt(nx, L.y, L)) { L.dir = -L.dir; return; }
  if (solid(nx, L.y)) {
    for (let up = 1; up <= 3; up++) if (!solid(nx, L.y - up) && !solid(nx, L.y - up - 1) && !solid(nx, L.y - up - 2)) { L.x = nx; L.y -= up; return; }
    if (L.climb) { L.st = 'climb'; return; }
    L.dir = -L.dir; return;
  }
  if (solid(nx, L.y - 2) && solid(nx, L.y - 1)) { L.dir = -L.dir; return; }
  L.x = nx;
  if (!solid(L.x, L.y + 1)) {
    if (solid(L.x, L.y + 2)) L.y += 1; else if (solid(L.x, L.y + 3)) L.y += 2;
    else { L.st = 'fall'; L.fd = 0; }
  }
}
function kill(g, L, why) {
  L.st = 'dead'; S.dead++;
  if (!g) return;
  const px = L.x * LG_CS, py = L.y * LG_CS;
  if (why === 'splat') { g.sfx.hit(); g.burst(px, py, ['#22c55e', '#3b82f6', '#fda4af'], 10, 120, 0.5); }
  else if (why === 'water') { g.sfx.tone(300, 0.2, 'sine', 0.05, 120); g.burst(px, py, ['#93c5fd', '#fff'], 10, 120); }
  else if (why === 'time') g.burst(px, py, '#94a3b8', 4, 60);
}
function explode(g, L) {
  for (let dy = -6; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) if (dx * dx + dy * dy * 1.2 <= 30) removeC(L.x + dx, L.y - 1 + dy);
  if (g) { g.sfx.explode(); g.shake(5, 0.2); g.burst(L.x * LG_CS, L.y * LG_CS - 6, ['#f97316', '#fde047', '#22c55e', '#3b82f6'], 30, 260, 0.8); }
  L.st = 'dead'; S.dead++;
}
function pick(mx, my) {
  let best = null, bd = 1e9;
  for (const L of S.lems) {
    if (L.st === 'dead' || L.st === 'saved') continue;
    const px = L.x * LG_CS, py = L.y * LG_CS - 6;
    const d = Math.abs(px - mx) + Math.abs(py - my);
    if (Math.abs(px - mx) < 12 && Math.abs(py - my) < 14 && d < bd) { bd = d; best = L; }
  }
  return best;
}
function assign(g, L) {
  const s = S.sel; if (s < 0 || S.skills[s] <= 0) { g.sfx.beep(150, 0.08); return; }
  const id = LG_SK[s].id;
  const grounded = ['walk', 'build', 'bash', 'dig', 'mine'].includes(L.st);
  let ok = false;
  if (id === 'climb' && !L.climb) { L.climb = true; ok = true; }
  else if (id === 'float' && !L.float) { L.float = true; ok = true; }
  else if (id === 'bomb' && L.bomb < 0) { L.bomb = 5; ok = true; }
  else if (id === 'block' && grounded && L.st !== 'block') { L.st = 'block'; ok = true; }
  else if (id === 'build' && grounded) { L.st = 'build'; L.n = 0; L.k = 0; ok = true; }
  else if (id === 'bash' && grounded) { L.st = 'bash'; L.k = 0; ok = true; }
  else if (id === 'mine' && grounded) { L.st = 'mine'; L.k = 0; ok = true; }
  else if (id === 'dig' && grounded) { L.st = 'dig'; L.k = 0; ok = true; }
  if (ok) { S.skills[s]--; g.sfx.click(); g.float(L.x * LG_CS, L.y * LG_CS - 20, LG_SK[s].e, '#fff', 16); }
  else g.sfx.beep(150, 0.08);
}
function nuke(g) {
  if (S.nuked) return;
  S.nuked = true; let k = 0;
  for (const L of S.lems) if (L.st !== 'dead' && L.st !== 'saved' && L.bomb < 0) { L.bomb = 5 + (k++) * 0.08; }
  g.sfx.power(); S.msg = '☢️ 전체 폭파!'; S.msgT = 2;
}
function finish(g) {
  S.phase = 'result';
  S.passed = S.saved >= S.L.need;
  if (S.passed) {
    S.gain = S.saved * 100 + Math.max(0, Math.round(S.timeLeft)) * 5 + (S.saved === S.L.n ? 1000 : 0);
    g.add(S.gain); S.total += S.saved; g.sfx.win();
  } else { S.lives--; g.sfx.lose(); }
}
/* ---------- panel ---------- */
function panelClick(g, mx, my) {
  // rr - +
  if (g.inRect(10, 480, 50, 50, { x: mx, y: my })) { S.rr = Math.max(S.minRR, S.rr - 10); g.sfx.click(); return; }
  if (g.inRect(66, 480, 50, 50, { x: mx, y: my })) { S.rr = Math.min(99, S.rr + 10); g.sfx.click(); return; }
  for (let i = 0; i < 8; i++) if (g.inRect(126 + i * 72, 472, 66, 116, { x: mx, y: my })) { S.sel = i; g.sfx.click(); return; }
  if (g.inRect(712, 472, 66, 116, { x: mx, y: my })) { S.ff = !S.ff; g.sfx.click(); return; }
  if (g.inRect(784, 472, 66, 116, { x: mx, y: my })) { nuke(g); return; }
}
function drawPanel(g, c) {
  g.rect(0, LG_WH, 960, 140, '#1e1b2e');
  g.rrect(10, 480, 50, 50, 8, '#334155'); g.text('−', 35, 505, 26, '#fff');
  g.rrect(66, 480, 50, 50, 8, '#334155'); g.text('+', 91, 505, 26, '#fff');
  g.text(`투입 ${S.rr}`, 63, 548, 13, '#cbd5e1');
  g.text(`최소 ${S.minRR}`, 63, 568, 11, '#64748b');
  for (let i = 0; i < 8; i++) {
    const x = 126 + i * 72, sel = S.sel === i;
    g.rrect(x, 472, 66, 116, 10, sel ? '#4338ca' : '#2a2540', sel ? '#fde047' : '#475569', sel ? 3 : 1);
    g.text(S.skills[i], x + 33, 492, 20, S.skills[i] ? '#fff' : '#64748b');
    g.emoji(LG_SK[i].e, x + 33, 530, 30);
    g.text(`${i + 1} ${LG_SK[i].n}`, x + 33, 570, 12, '#cbd5e1');
  }
  g.rrect(712, 472, 66, 116, 10, S.ff ? '#b45309' : '#2a2540', '#475569'); g.text('⏩', 745, 515, 26, '#fff'); g.text('빨리감기', 745, 565, 12, '#cbd5e1');
  g.rrect(784, 472, 66, 116, 10, S.nuked ? '#7f1d1d' : '#2a2540', '#475569'); g.text('☢️', 817, 515, 26, '#fff'); g.text('전체폭파', 817, 565, 12, '#cbd5e1');
  const out = S.lems.filter((L) => L.st !== 'dead' && L.st !== 'saved').length;
  g.text(`밖 ${out}`, 905, 490, 15, '#93c5fd');
  g.text(`구출 ${S.saved}`, 905, 515, 15, S.saved >= S.L.need ? '#4ade80' : '#fde047');
  g.text(`필요 ${S.L.need}`, 905, 540, 13, '#cbd5e1');
  g.text(U.fmtTime(Math.max(0, S.timeLeft)), 905, 567, 16, S.timeLeft < 30 ? '#f87171' : '#e2e8f0');
  // minimap of lives
  g.text('❤'.repeat(Math.max(0, S.lives)), 905, 590, 10, '#f87171');
}
function drawLem(g, L) {
  const px = L.x * LG_CS, py = L.y * LG_CS + LG_CS;
  const f = L.dir;
  const step = Math.floor(L.anim / 2) % 2;
  if (L.st === 'fall' && L.float && L.fd > 8) { g.emoji('☂️', px, py - 22, 16); }
  // legs
  if (L.st === 'walk' || L.st === 'bash' || L.st === 'mine') { g.rect(px - 3 + step * 2 * f, py - 3, 2, 3, '#1d4ed8'); g.rect(px + 1 - step * 2 * f, py - 3, 2, 3, '#1d4ed8'); }
  else g.rect(px - 3, py - 3, 6, 3, '#1d4ed8');
  // body
  g.rect(px - 3, py - 8, 6, 5, '#3b82f6');
  // head
  g.rect(px - 2, py - 11, 5, 3, '#fda4af');
  g.rect(px - 3 - (f < 0 ? 0 : 1), py - 13, 6, 3, '#22c55e');
  if (L.st === 'block') { g.rect(px - 7, py - 9, 3, 2, '#fda4af'); g.rect(px + 4, py - 9, 3, 2, '#fda4af'); }
  if (L.st === 'build') g.rect(px + f * 4 - 1, py - 6, 3, 2, '#fcd34d');
  if (L.st === 'dig' || L.st === 'mine' || L.st === 'bash') { g.line(px + f * 3, py - 7, px + f * 7, py - 3 + (L.anim % 2) * 3, '#e5e7eb', 2); }
  if (L.st === 'climb') g.rect(px + f * 3, py - 12, 2, 4, '#fda4af');
  if (L.bomb > 0) g.text(Math.ceil(L.bomb), px, py - 20, 12, '#fde047');
  if (L.climb) g.circle(px - f * 4, py - 7, 1.5, '#fbbf24');
}
