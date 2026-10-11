let S;
const HX_R = 4, HX_SZ = 31, HX_CX = 420, HX_CY = 330;
const HX_SQ3 = Math.sqrt(3);
const HX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const HX_SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, -1], [1, 0], [0, 1]],
];
const HX_COLS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa', '#f472b6'];
GAME({
  title: '헥사 블록', w: 960, h: 760, bg: '#1e1b4b', controls: 'dpad+ab', aLabel: '놓기', bLabel: '회전',
  help: '아래 3개의 조각을 끌어서(드래그) 육각 보드에 놓으세요\n세 방향(가로·대각선 2개) 중 한 줄이 꽉 차면 사라지며 점수!\n여러 줄 동시 / 연속 콤보면 보너스 · 조각 3개를 다 쓰면 새 조각\n우클릭 또는 X: 조각 회전 (회전권 필요, 줄 지우면 충전)\n키보드: 1·2·3 조각 선택, 방향키 이동, Space 놓기\n놓을 곳이 없으면 게임 오버',
  init(g) {
    S = { cells: new Map(), pieces: [], drag: null, sel: 0, cur: { q: 0, r: 0 }, combo: 0, rot: 3, lines: 0, level: 1, clearing: [], msg: '', msgT: 0, kb: false, deadT: 0 };
    for (let q = -HX_R; q <= HX_R; q++) for (let r = -HX_R; r <= HX_R; r++) if (Math.abs(q + r) <= HX_R) S.cells.set(key(q, r), null);
    deal();
    g.score = 0;
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    for (const c of S.clearing) c.t -= dt;
    S.clearing = S.clearing.filter((c) => c.t > 0);
    if (S.deadT > 0) { S.deadT -= dt; if (S.deadT <= 0) g.over(`${S.lines}줄 제거 · 레벨 ${S.level}`); return; }
    const m = g.mouse;
    // 드래그 시작
    if (m.clicked) {
      for (let i = 0; i < 3; i++) {
        const p = S.pieces[i]; if (!p) continue;
        if (Math.abs(m.x - slotX(i)) < 110 && Math.abs(m.y - 660) < 80) { S.drag = { i }; S.sel = i; S.kb = false; g.sfx.click(); break; }
      }
      if (g.clickIn(820, 200, 120, 60)) rotate(g, S.sel);
    }
    if (m.rclick) rotate(g, S.drag ? S.drag.i : S.sel);
    if (S.drag && !m.down) {
      const p = S.pieces[S.drag.i], anc = dropAnchor(p, m.x, m.y);
      if (anc && fits(p, anc.q, anc.r)) placePiece(g, S.drag.i, anc.q, anc.r);
      else g.sfx.beep(170, 0.05);
      S.drag = null;
    }
    // 키보드
    for (let i = 0; i < 3; i++) if (g.keyp('Digit' + (i + 1)) && S.pieces[i]) { S.sel = i; S.kb = true; g.sfx.click(); }
    if (!S.pieces[S.sel]) S.sel = S.pieces.findIndex((p) => p);
    const mv = (dq, dr) => { const nq = S.cur.q + dq, nr = S.cur.r + dr; if (S.cells.has(key(nq, nr))) { S.cur = { q: nq, r: nr }; S.kb = true; } };
    if (g.pressed('left')) mv(-1, 0);
    if (g.pressed('right')) mv(1, 0);
    if (g.pressed('up')) mv(g.key('ShiftLeft') ? 1 : 0, -1);
    if (g.pressed('down')) mv(g.key('ShiftLeft') ? -1 : 0, 1);
    if (g.pressed('b')) rotate(g, S.sel);
    if (g.pressed('a') && S.sel >= 0 && S.pieces[S.sel]) {
      const p = S.pieces[S.sel];
      if (fits(p, S.cur.q, S.cur.r)) placePiece(g, S.sel, S.cur.q, S.cur.r); else g.sfx.beep(170, 0.05);
    }
    g.info = `레벨 ${S.level} · ${S.lines}줄 · 회전권 ${S.rot}`;
  },
  draw(g, c) {
    g.text('⬡ 헥사 블록', 30, 40, 28, '#e0e7ff', 'left');
    g.text(`레벨 ${S.level}`, 30, 75, 18, '#a5b4fc', 'left');
    g.text(`줄 ${S.lines}`, 30, 100, 16, '#a5b4fc', 'left');
    if (S.combo > 1) g.text(`콤보 ×${S.combo}`, 30, 130, 22, '#fbbf24', 'left');
    // 회전 버튼
    g.button(820, 200, 120, 60, `⟳ 회전 ${S.rot}`, S.rot > 0 ? '#4338ca' : '#312e81', 18);
    g.text('우클릭/X', 880, 275, 12, '#a5b4fc');
    // 보드
    const m = g.mouse, dp = S.drag ? S.pieces[S.drag.i] : null;
    let ghost = null, ghostOk = false;
    if (dp) { const a = dropAnchor(dp, m.x, m.y); if (a) { ghost = cellsOf(dp, a.q, a.r); ghostOk = fits(dp, a.q, a.r); } }
    else if (S.kb && S.pieces[S.sel]) { ghost = cellsOf(S.pieces[S.sel], S.cur.q, S.cur.r); ghostOk = fits(S.pieces[S.sel], S.cur.q, S.cur.r); }
    const gset = new Set(ghost ? ghost.map((h) => key(h[0], h[1])) : []);
    // 줄 완성 미리보기
    let willClear = new Set();
    if (ghost && ghostOk) willClear = previewClear(ghost);
    for (const [k, v] of S.cells) {
      const [q, r] = k.split(',').map(Number), p = hpx(q, r);
      hex(c, p.x, p.y, HX_SZ - 2, v ? v : '#312e81', v ? 'rgba(255,255,255,.35)' : '#3730a3');
      if (v) hex(c, p.x - 3, p.y - 4, HX_SZ * 0.45, 'rgba(255,255,255,.22)');
      if (willClear.has(k) && v) hex(c, p.x, p.y, HX_SZ - 2, `rgba(255,255,255,${0.3 + Math.sin(g.time * 12) * 0.2})`);
      if (gset.has(k)) hex(c, p.x, p.y, HX_SZ - 4, ghostOk ? 'rgba(255,255,255,.45)' : 'rgba(239,68,68,.45)');
    }
    for (const cl of S.clearing) { const p = hpx(cl.q, cl.r); const s = cl.t / 0.4; hex(c, p.x, p.y, (HX_SZ - 2) * s, cl.c); }
    if (S.kb) { const p = hpx(S.cur.q, S.cur.r); hexLine(c, p.x, p.y, HX_SZ - 1, '#fff', 3); }
    // 조각 트레이
    g.rrect(60, 585, 840, 150, 20, 'rgba(255,255,255,.06)');
    for (let i = 0; i < 3; i++) {
      const p = S.pieces[i]; if (!p) continue;
      if (S.drag && S.drag.i === i) continue;
      const ok = canPlaceAnywhere(p);
      c.globalAlpha = ok ? 1 : 0.35;
      drawPiece(c, p, slotX(i), 660, 0.62);
      c.globalAlpha = 1;
      if (S.sel === i && S.kb) g.text('▲ 선택', slotX(i), 725, 14, '#fde047');
      g.text(String(i + 1), slotX(i) - 100, 600, 12, '#818cf8');
    }
    if (dp) drawPiece(c, dp, m.x, m.y - 70, 1);
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, HX_CX, 40, 34, '#fde047'); c.globalAlpha = 1; }
    if (S.deadT > 0) { g.rrect(HX_CX - 200, 300, 400, 70, 16, 'rgba(0,0,0,.8)'); g.text('놓을 곳이 없어요!', HX_CX, 335, 28, '#fca5a5'); }
  },
});
function key(q, r) { return q + ',' + r; }
function hpx(q, r) { return { x: HX_CX + HX_SZ * HX_SQ3 * (q + r / 2), y: HX_CY + HX_SZ * 1.5 * r }; }
function pxHex(x, y) {
  const fx = x - HX_CX, fy = y - HX_CY;
  const q = (HX_SQ3 / 3 * fx - fy / 3) / HX_SZ, r = (2 / 3 * fy) / HX_SZ;
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry - (-q - r));
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dz > dy) rz = -rx - ry;
  return { q: rx, r: rz };
}
function hexPath(c, x, y, s) {
  c.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const px = x + s * Math.cos(a), py = y + s * Math.sin(a); i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath();
}
function hex(c, x, y, s, fill, strokeC) { hexPath(c, x, y, s); c.fillStyle = fill; c.fill(); if (strokeC) { c.strokeStyle = strokeC; c.lineWidth = 2; c.stroke(); } }
function hexLine(c, x, y, s, col, lw) { hexPath(c, x, y, s); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function slotX(i) { return 200 + i * 280; }
function rotShape(cells) { return cells.map(([q, r]) => [-r, q + r]); }
function makePiece() {
  // 레벨이 오를수록 큰 조각 확률 증가
  const maxIdx = Math.min(HX_SHAPES.length, 7 + S.level);
  let sh = HX_SHAPES[U.randi(0, maxIdx - 1)].map((a) => a.slice());
  for (let k = U.randi(0, 5); k > 0; k--) sh = rotShape(sh);
  return { cells: norm(sh), col: U.choice(HX_COLS) };
}
function norm(cells) { const [q0, r0] = cells[0]; return cells.map(([q, r]) => [q - q0, r - r0]); }
function deal() { S.pieces = [makePiece(), makePiece(), makePiece()]; S.sel = 0; }
function cellsOf(p, q, r) { return p.cells.map(([a, b]) => [q + a, r + b]); }
function fits(p, q, r) { return cellsOf(p, q, r).every(([a, b]) => { const k = key(a, b); return S.cells.has(k) && !S.cells.get(k); }); }
function canPlaceAnywhere(p) { for (const k of S.cells.keys()) { const [q, r] = k.split(',').map(Number); if (fits(p, q, r)) return true; } return false; }
function centroidPx(p, sc) {
  let sx = 0, sy = 0;
  for (const [q, r] of p.cells) { sx += HX_SZ * sc * HX_SQ3 * (q + r / 2); sy += HX_SZ * sc * 1.5 * r; }
  return { x: sx / p.cells.length, y: sy / p.cells.length };
}
function dropAnchor(p, mx, my) {
  // 끌고 있는 조각은 (mx, my-70)에 중심이 그려짐 → 첫 칸의 화면 위치로 보드 칸 계산
  const ce = centroidPx(p, 1), x0 = mx - ce.x, y0 = my - 70 - ce.y;
  return pxHex(x0, y0);
}
function drawPiece(c, p, x, y, sc) {
  const ce = centroidPx(p, sc);
  for (const [q, r] of p.cells) {
    const px = x - ce.x + HX_SZ * sc * HX_SQ3 * (q + r / 2), py = y - ce.y + HX_SZ * sc * 1.5 * r;
    hex(c, px, py, (HX_SZ - 2) * sc, p.col, 'rgba(255,255,255,.4)');
    hex(c, px - 3 * sc, py - 4 * sc, HX_SZ * 0.45 * sc, 'rgba(255,255,255,.22)');
  }
}
function rotate(g, i) {
  const p = S.pieces[i];
  if (!p) return;
  if (S.rot <= 0) { g.sfx.beep(150, 0.08); S.msg = '회전권이 없어요'; S.msgT = 1; return; }
  S.rot--;
  p.cells = norm(rotShape(p.cells));
  g.sfx.tone(600, 0.06, 'sine', 0.07, 800);
}
function allLines() {
  if (S._lines) return S._lines;
  const L = [];
  for (let v = -HX_R; v <= HX_R; v++) {
    const a = [], b = [], d = [];
    for (const k of S.cells.keys()) {
      const [q, r] = k.split(',').map(Number);
      if (q === v) a.push(k); if (r === v) b.push(k); if (-q - r === v) d.push(k);
    }
    L.push(a, b, d);
  }
  S._lines = L;
  return L;
}
function previewClear(ghost) {
  const filled = new Set(ghost.map((h) => key(h[0], h[1])));
  const out = new Set();
  for (const line of allLines()) if (line.every((k) => S.cells.get(k) || filled.has(k))) line.forEach((k) => out.add(k));
  return out;
}
function placePiece(g, i, q, r) {
  const p = S.pieces[i];
  for (const [a, b] of cellsOf(p, q, r)) S.cells.set(key(a, b), p.col);
  S.pieces[i] = null;
  g.add(p.cells.length);
  g.sfx.drop();
  // 줄 판정
  const full = allLines().filter((line) => line.every((k) => S.cells.get(k)));
  if (full.length) {
    const del = new Set();
    full.forEach((line) => line.forEach((k) => del.add(k)));
    S.combo++;
    const pts = del.size * 10 * full.length * S.combo;
    let sx = 0, sy = 0;
    for (const k of del) {
      const [a, b] = k.split(',').map(Number), pp = hpx(a, b);
      S.clearing.push({ q: a, r: b, c: S.cells.get(k), t: 0.4 });
      S.cells.set(k, null);
      g.burst(pp.x, pp.y, ['#fff', '#fde047', '#a5b4fc'], 4, 200, 0.6, 4);
      sx += pp.x; sy += pp.y;
    }
    g.add(pts, sx / del.size, sy / del.size);
    S.lines += full.length;
    S.rot = Math.min(9, S.rot + full.length);
    g.sfx.tone(500 + S.combo * 80, 0.18, 'triangle', 0.1, 900);
    g.shake(3 + full.length * 3, 0.25);
    S.msg = full.length >= 3 ? `트리플!! ×${full.length}` : full.length === 2 ? '더블 라인!' : S.combo > 1 ? `콤보 ×${S.combo}` : '라인 클리어!';
    S.msgT = 1.3;
    const lv = 1 + Math.floor(S.lines / 8);
    if (lv > S.level) { S.level = lv; S.msg = `레벨 ${lv}!`; g.sfx.power(); }
  } else S.combo = 0;
  if (S.pieces.every((x) => !x)) deal();
  if (S.pieces.filter((x) => x).every((x) => !canPlaceAnywhere(x)) && S.rot <= 0) { S.deadT = 1.4; g.sfx.lose(); }
  else if (S.pieces.filter((x) => x).every((x) => !canPlaceAnywhere(x))) {
    // 회전해서 놓을 수 있는지 확인
    let any = false;
    for (const x of S.pieces) if (x) { let cs = x.cells; for (let k = 0; k < 5 && !any; k++) { cs = norm(rotShape(cs)); if (canPlaceAnywhere({ cells: cs })) any = true; } }
    if (!any) { S.deadT = 1.4; g.sfx.lose(); } else { S.msg = '회전해서 놓아보세요!'; S.msgT = 2; }
  }
}
