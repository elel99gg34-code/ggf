let S;
const JD = [
  { n: '쉬움', c: 4, r: 3, w: 400, h: 300, rot: false, base: 400 },
  { n: '보통', c: 6, r: 4, w: 480, h: 360, rot: false, base: 1000 },
  { n: '어려움', c: 8, r: 6, w: 560, h: 420, rot: false, base: 2200 },
  { n: '전문가', c: 10, r: 8, w: 560, h: 420, rot: true, base: 4200 },
];
const JTHEMES = ['노을 지는 산', '열대 바다', '우주 여행', '꽃밭 소풍', '도시의 밤', '과자 나라'];
GAME({
  title: '직소 퍼즐', w: 960, h: 680, bg: '#2a2438', controls: 'none',
  help: '조각을 드래그해서 가운데 판의 제자리에 놓으면 딱 붙어요\n난이도 4단계: 12 / 24 / 48 / 80조각 (전문가는 조각이 회전되어 있어요)\n전문가: 조각 클릭 또는 우클릭 = 90° 회전\n👁 미리보기 · 🧲 가장자리 정리 · 💡 힌트(조각 하나 자동 배치)',
  init(g) { S = { diff: g.load('diff', 0), solvedCnt: 0, streak: 0, theme: -1 }; newPuzzle(g); },
  update(g, dt) {
    const m = g.mouse;
    S.time += S.done ? 0 : dt;
    if (S.flashT > 0) S.flashT -= dt;
    // 하단 버튼
    if (m.clicked && m.y > 628) {
      JD.forEach((d, k) => { if (g.inRect(14 + k * 84, 634, 78, 38)) { S.diff = k; g.save('diff', k); S.streak = 0; newPuzzle(g); g.sfx.click(); } });
      if (g.inRect(366, 634, 130, 38)) { S.preview = !S.preview; g.sfx.click(); }
      if (g.inRect(504, 634, 140, 38)) { arrange(g); }
      if (g.inRect(652, 634, 140, 38)) hint(g);
      if (g.inRect(800, 634, 146, 38)) { if (S.done) S.streak = S.streak; newPuzzle(g); g.sfx.click(); }
      return;
    }
    if (S.done) { if (g.clickIn(S.bx + S.bw / 2 - 170, S.by + S.bh / 2 - 70, 340, 140) || g.pressed('a')) { newPuzzle(g); } return; }
    if (g.keyp('KeyV')) S.preview = !S.preview;
    if (g.keyp('KeyH')) hint(g);
    if (m.clicked || m.rclick) {
      for (let k = S.order.length - 1; k >= 0; k--) {
        const p = S.pieces[S.order[k]]; if (p.placed) continue;
        const cx = p.x + S.pw / 2, cy = p.y + S.ph / 2;
        if (Math.abs(m.x - cx) < S.pw / 2 + 4 && Math.abs(m.y - cy) < S.ph / 2 + 4) {
          S.order.splice(k, 1); S.order.push(p.id);
          if (m.rclick) { if (S.rot) { p.rot = (p.rot + 1) % 4; g.sfx.move(); trySnap(g, p); } }
          else { S.drag = { p, ox: m.x - p.x, oy: m.y - p.y, sx: m.x, sy: m.y, moved: false }; g.sfx.tone(380, 0.04, 'triangle', 0.05); }
          break;
        }
      }
    }
    if (S.drag) {
      const d = S.drag;
      if (Math.hypot(m.x - d.sx, m.y - d.sy) > 6) d.moved = true;
      d.p.x = U.clamp(m.x - d.ox, -S.pw / 2, 960 - S.pw / 2); d.p.y = U.clamp(m.y - d.oy, 0, 620 - S.ph / 2);
      if (!m.down) {
        S.drag = null;
        if (!d.moved && S.rot) { d.p.rot = (d.p.rot + 1) % 4; g.sfx.move(); }
        trySnap(g, d.p);
      }
    }
    g.info = `${JD[S.diff].n} · ${S.placedN}/${S.pieces.length} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    // 판
    g.rrect(S.bx - 10, S.by - 10, S.bw + 20, S.bh + 20, 12, '#3f3654', '#6b5b8a', 3);
    g.rect(S.bx, S.by, S.bw, S.bh, '#1e1a29');
    for (let x = 0; x <= S.cols; x++) g.line(S.bx + x * S.pw, S.by, S.bx + x * S.pw, S.by + S.bh, 'rgba(255,255,255,.05)', 1);
    for (let y = 0; y <= S.rows; y++) g.line(S.bx, S.by + y * S.ph, S.bx + S.bw, S.by + y * S.ph, 'rgba(255,255,255,.05)', 1);
    if (S.preview || S.done) { c.globalAlpha = S.done ? 1 : 0.28; c.drawImage(S.pic, S.bx, S.by, S.bw, S.bh); c.globalAlpha = 1; }
    const m = S.margin;
    const drawP = (p) => {
      c.save(); c.translate(p.x + S.pw / 2, p.y + S.ph / 2); c.rotate(p.rot * Math.PI / 2);
      c.drawImage(p.cv, -S.pw / 2 - m, -S.ph / 2 - m, S.pw + 2 * m, S.ph + 2 * m); c.restore();
    };
    if (!S.done) for (const id of S.order) { const p = S.pieces[id]; if (p.placed) drawP(p); }
    for (const id of S.order) { const p = S.pieces[id]; if (!p.placed) drawP(p); }
    if (S.flashT > 0 && S.flashP) { const p = S.flashP; g.stroke(p.x, p.y, S.pw, S.ph, `rgba(253,224,71,${S.flashT * 2})`, 3); }
    if (S.drag) { const p = S.drag.p; g.stroke(p.x - 1, p.y - 1, S.pw + 2, S.ph + 2, 'rgba(255,255,255,.5)', 2); }
    g.text(`🧩 ${S.themeName}`, 14, 20, 18, '#e9d5ff', 'left');
    g.text(`${S.placedN} / ${S.pieces.length} 조각 · ⏱️ ${U.fmtTime(S.time)}`, 946, 20, 15, '#c4b5fd', 'right');
    // 진행바
    g.rrect(S.bx, S.by + S.bh + 14, S.bw, 8, 4, '#3f3654'); g.rrect(S.bx, S.by + S.bh + 14, S.bw * S.placedN / S.pieces.length, 8, 4, '#a855f7');
    JD.forEach((d, k) => g.button(14 + k * 84, 634, 78, 38, d.n, S.diff === k ? '#9333ea' : '#4c4363', 15));
    g.button(366, 634, 130, 38, S.preview ? '👁 미리보기 ON' : '👁 미리보기', S.preview ? '#7e22ce' : '#4c4363', 15);
    g.button(504, 634, 140, 38, '🧲 가장자리 정리', '#4c4363', 15);
    g.button(652, 634, 140, 38, '💡 힌트', '#a16207', 15);
    g.button(800, 634, 146, 38, '🖼 새 그림', '#7c2d12', 15);
    if (S.done) {
      g.rrect(S.bx + S.bw / 2 - 170, S.by + S.bh / 2 - 70, 340, 140, 16, 'rgba(88,28,135,.92)', '#fff', 3);
      g.text('🎉 완성!', S.bx + S.bw / 2, S.by + S.bh / 2 - 30, 36, '#fff');
      g.text(`+${S.gain}점 · ${U.fmtTime(S.time)}`, S.bx + S.bw / 2, S.by + S.bh / 2 + 12, 20, '#f3e8ff');
      g.text('Space 또는 🖼 새 그림으로 다음 퍼즐', S.bx + S.bw / 2, S.by + S.bh / 2 + 44, 14, '#e9d5ff');
    }
  },
});
function paintTheme(p, W, H, t) {
  const R = U.rand, E = (s, x, y, sz) => { p.font = `${sz}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillText(s, x, y); };
  const grad = (y0, y1, cols) => { const gr = p.createLinearGradient(0, y0, 0, y1); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; };
  const blob = (x, y, r, c) => { const gr = p.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); p.fillStyle = gr; p.fillRect(x - r, y - r, r * 2, r * 2); };
  const mount = (base, amp, col, step) => { p.fillStyle = col; p.beginPath(); p.moveTo(0, H); let y = base; for (let x = 0; x <= W + step; x += step) { y = U.clamp(y + R(-amp, amp), base - amp * 3, base + amp); p.lineTo(x, y); } p.lineTo(W, H); p.fill(); };
  if (t === 0) {
    p.fillStyle = grad(0, H * 0.6, ['#1e1b4b', '#7c3aed', '#f97316', '#fde047']); p.fillRect(0, 0, W, H);
    blob(R(150, 410), H * 0.45, 140, 'rgba(253,224,71,.8)'); p.fillStyle = '#fef08a'; p.beginPath(); p.arc(R(180, 380), H * 0.45, 45, 0, 7); p.fill();
    mount(H * 0.5, 30, '#6d28d9', 40); mount(H * 0.6, 25, '#4c1d95', 30); mount(H * 0.72, 18, '#2e1065', 20);
    p.fillStyle = grad(H * 0.78, H, ['#7c3aed', '#1e1b4b']); p.fillRect(0, H * 0.8, W, H * 0.2);
    for (let i = 0; i < 30; i++) { p.fillStyle = `rgba(253,224,71,${R(0.2, 0.6)})`; p.fillRect(R(0, W), R(H * 0.8, H), R(20, 60), 2); }
    for (let i = 0; i < 9; i++) E('🌲', R(0, W), R(H * 0.72, H * 0.8), R(26, 44));
    for (let i = 0; i < 5; i++) E('🕊️', R(40, W - 40), R(30, H * 0.35), R(18, 28));
    E('🏕️', R(60, W - 60), H * 0.77, 40); E('🦌', R(60, W - 60), H * 0.75, 34);
  } else if (t === 1) {
    p.fillStyle = grad(0, H * 0.45, ['#38bdf8', '#bae6fd']); p.fillRect(0, 0, W, H * 0.45);
    p.fillStyle = grad(H * 0.45, H, ['#0ea5e9', '#0369a1', '#0c4a6e']); p.fillRect(0, H * 0.45, W, H * 0.55);
    E('☀️', R(60, 200), 60, 70);
    for (let i = 0; i < 4; i++) E('☁️', R(0, W), R(30, 140), R(40, 70));
    p.fillStyle = '#fde68a'; p.beginPath(); p.ellipse(R(380, 460), H * 0.46, 90, 22, 0, 0, 7); p.fill();
    E('🌴', 420, H * 0.36, 70);
    for (let i = 0; i < 26; i++) { p.strokeStyle = 'rgba(255,255,255,.5)'; p.lineWidth = 2; const x = R(0, W), y = R(H * 0.47, H * 0.65); p.beginPath(); p.arc(x, y, 10, Math.PI * 1.1, Math.PI * 1.9); p.stroke(); }
    E('⛵', R(80, 300), H * 0.43, 54); E('🐬', R(100, 450), H * 0.55, 40);
    const sea = ['🐠', '🐟', '🐡', '🦀', '🐙', '🐢', '🦑', '🐳', '🪸', '🐚'];
    for (let i = 0; i < 16; i++) E(U.choice(sea), R(20, W - 20), R(H * 0.62, H - 20), R(26, 46));
    for (let i = 0; i < 20; i++) { p.strokeStyle = 'rgba(255,255,255,.4)'; p.beginPath(); p.arc(R(0, W), R(H * 0.6, H), R(3, 7), 0, 7); p.stroke(); }
  } else if (t === 2) {
    p.fillStyle = grad(0, H, ['#020617', '#1e1b4b', '#312e81']); p.fillRect(0, 0, W, H);
    blob(R(0, W), R(0, H), 200, 'rgba(236,72,153,.35)'); blob(R(0, W), R(0, H), 220, 'rgba(56,189,248,.3)'); blob(R(0, W), R(0, H), 160, 'rgba(168,85,247,.35)');
    for (let i = 0; i < 260; i++) { p.fillStyle = `rgba(255,255,255,${R(0.3, 1)})`; const s = R(0.5, 2.5); p.fillRect(R(0, W), R(0, H), s, s); }
    for (let i = 0; i < 3; i++) { const x = R(60, W - 60), y = R(60, H - 60), r = R(25, 55), hue = U.randi(0, 360); const gr = p.createRadialGradient(x - r / 3, y - r / 3, 2, x, y, r); gr.addColorStop(0, `hsl(${hue},80%,75%)`); gr.addColorStop(1, `hsl(${hue},70%,30%)`); p.fillStyle = gr; p.beginPath(); p.arc(x, y, r, 0, 7); p.fill(); if (i === 0) { p.strokeStyle = `hsla(${hue + 40},80%,80%,.8)`; p.lineWidth = 4; p.beginPath(); p.ellipse(x, y, r * 1.7, r * 0.4, -0.3, 0, 7); p.stroke(); } }
    const sp = ['🚀', '🛸', '🌍', '🌙', '👽', '☄️', '🛰️', '👨‍🚀', '⭐', '🪐'];
    for (let i = 0; i < 10; i++) E(U.choice(sp), R(30, W - 30), R(30, H - 30), R(28, 56));
  } else if (t === 3) {
    p.fillStyle = grad(0, H * 0.5, ['#7dd3fc', '#e0f2fe']); p.fillRect(0, 0, W, H);
    const rb = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6']; const rx = R(150, 410);
    rb.forEach((c, i) => { p.strokeStyle = c; p.lineWidth = 10; p.beginPath(); p.arc(rx, H * 0.55, 200 - i * 10, Math.PI, 0); p.stroke(); });
    p.fillStyle = '#86efac'; p.beginPath(); p.ellipse(W * 0.3, H * 0.62, 320, 90, 0, 0, 7); p.fill();
    p.fillStyle = '#4ade80'; p.beginPath(); p.ellipse(W * 0.8, H * 0.68, 300, 90, 0, 0, 7); p.fill();
    p.fillStyle = '#22c55e'; p.fillRect(0, H * 0.72, W, H * 0.28);
    const fl = ['🌷', '🌻', '🌼', '🌸', '🌹', '🌺', '💐', '🍄'];
    for (let i = 0; i < 46; i++) E(U.choice(fl), R(10, W - 10), R(H * 0.62, H - 10), R(22, 38));
    for (let i = 0; i < 6; i++) E(U.choice(['🦋', '🐝', '🐞', '🐦']), R(30, W - 30), R(40, H * 0.55), R(24, 36));
    E('☁️', R(40, W - 40), 50, 60); E('🧺', R(80, W - 80), H * 0.66, 44);
  } else if (t === 4) {
    p.fillStyle = grad(0, H, ['#0f172a', '#1e3a8a', '#7c3aed']); p.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { p.fillStyle = `rgba(255,255,255,${R(0.3, 0.9)})`; p.fillRect(R(0, W), R(0, H * 0.5), 1.5, 1.5); }
    blob(R(60, W - 60), 70, 80, 'rgba(254,249,195,.5)'); E('🌕', R(80, W - 80), 70, 50);
    let x = 0;
    while (x < W) { const bw = R(36, 80), bh = R(120, 300), hue = U.randi(200, 280); p.fillStyle = `hsl(${hue},30%,${R(12, 24)}%)`; p.fillRect(x, H - bh, bw, bh); for (let wy = H - bh + 10; wy < H - 30; wy += 16) for (let wx = x + 6; wx < x + bw - 8; wx += 12) if (Math.random() < 0.55) { p.fillStyle = U.choice(['#fde047', '#fbbf24', '#fef9c3', '#f472b6', '#67e8f9']); p.fillRect(wx, wy, 6, 8); } x += bw + R(2, 8); }
    p.fillStyle = '#111827'; p.fillRect(0, H - 34, W, 34);
    for (let i = 0; i < 14; i++) { p.fillStyle = '#fde047'; p.fillRect(i * 44, H - 18, 22, 3); }
    for (let i = 0; i < 4; i++) E(U.choice(['🚗', '🚕', '🚌', '🚓']), R(20, W - 20), H - 28, 30);
    E('🎡', R(40, W - 40), H * 0.62, 70);
  } else {
    for (let i = 0; i < 12; i++) { p.fillStyle = ['#fbcfe8', '#fde68a', '#bae6fd', '#ddd6fe', '#bbf7d0', '#fecaca'][i % 6]; p.fillRect(i * W / 12, 0, W / 12 + 1, H); }
    for (let i = 0; i < 40; i++) { p.fillStyle = `hsla(${U.randi(0, 360)},80%,70%,.6)`; p.beginPath(); p.arc(R(0, W), R(0, H), R(4, 14), 0, 7); p.fill(); }
    const sw = ['🍩', '🍭', '🍰', '🧁', '🍬', '🍫', '🍪', '🍦', '🎂', '🍓', '🍒', '🥞'];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) E(U.choice(sw), 40 + x * 80 + R(-10, 10), 42 + y * 84 + R(-10, 10), R(40, 58));
  }
  // 가장자리 비네팅
  const vg = p.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.25)'); p.fillStyle = vg; p.fillRect(0, 0, W, H);
}
function piecePath(c, pw, ph, s, h) {
  // s = [top, right, bottom, left] : 0 평평, ±1 혹 방향
  const pts = [[0, 0, pw, 0], [pw, 0, pw, ph], [pw, ph, 0, ph], [0, ph, 0, 0]];
  c.beginPath(); c.moveTo(0, 0);
  pts.forEach(([x1, y1, x2, y2], k) => {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L, hh = s[k] * h;
    const P = (t, o) => [x1 + dx * t + nx * o, y1 + dy * t + ny * o];
    if (!s[k]) { c.lineTo(x2, y2); return; }
    c.lineTo(...P(0.36, 0));
    c.bezierCurveTo(...P(0.42, hh * 0.3), ...P(0.28, hh), ...P(0.5, hh));
    c.bezierCurveTo(...P(0.72, hh), ...P(0.58, hh * 0.3), ...P(0.64, 0));
    c.lineTo(x2, y2);
  });
  c.closePath();
}
function newPuzzle(g) {
  const D = JD[S.diff];
  S.bw = D.w; S.bh = D.h; S.bx = 480 - D.w / 2; S.by = Math.round(100 + (420 - D.h) / 2);
  let t = U.randi(0, JTHEMES.length - 1); if (t === S.theme) t = (t + 1) % JTHEMES.length; S.theme = t;
  const pic = document.createElement('canvas'); pic.width = S.bw * 2; pic.height = S.bh * 2;
  const pc = pic.getContext('2d'); pc.scale(2, 2); paintTheme(pc, S.bw, S.bh, t);
  const cols = D.c, rows = D.r, pw = S.bw / cols, ph = S.bh / rows, h = Math.min(pw, ph) * 0.24, m = Math.ceil(h + 4);
  const hs = U.grid(cols, rows, () => (Math.random() < 0.5 ? 1 : -1)), vs = U.grid(cols, rows, () => (Math.random() < 0.5 ? 1 : -1));
  const pieces = [], Q = 2;
  for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
    const s = [r === 0 ? 0 : -hs[r - 1][cc], cc === cols - 1 ? 0 : vs[r][cc], r === rows - 1 ? 0 : hs[r][cc], cc === 0 ? 0 : -vs[r][cc - 1]];
    const cv = document.createElement('canvas'); cv.width = Math.ceil((pw + 2 * m) * Q); cv.height = Math.ceil((ph + 2 * m) * Q);
    const x = cv.getContext('2d'); x.scale(Q, Q); x.translate(m, m);
    piecePath(x, pw, ph, s, h);
    x.save(); x.clip(); x.drawImage(pic, -cc * pw - 0 + 0, -r * ph, S.bw, S.bh); x.restore();
    x.lineWidth = 1.6; x.strokeStyle = 'rgba(0,0,0,.55)'; x.stroke();
    x.save(); x.translate(-0.8, -0.8); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,.35)'; x.stroke(); x.restore();
    pieces.push({ id: pieces.length, r, c: cc, tx: S.bx + cc * pw, ty: S.by + r * ph, x: 0, y: 0, rot: D.rot ? U.randi(0, 3) : 0, placed: false, cv, edge: !!(s.filter((v) => v === 0).length) });
  }
  Object.assign(S, { pic, cols, rows, pw, ph, margin: m, pieces, order: U.shuffle(pieces.map((p) => p.id)), rot: D.rot, time: 0, hints: 0, done: false, drag: null, preview: false, placedN: 0, themeName: JTHEMES[t], flashT: 0, flashP: null });
  for (const p of pieces) { const [x, y] = scatterPos(); p.x = x; p.y = y; }
}
function scatterPos() {
  const pw = S.pw, ph = S.ph;
  for (let k = 0; k < 50; k++) {
    const x = U.rand(4, 956 - pw), y = U.rand(40, 620 - ph);
    if (x + pw > S.bx - 14 && x < S.bx + S.bw + 14 && y + ph > S.by - 14 && y < S.by + S.bh + 30) continue;
    return [x, y];
  }
  return [U.rand(0, S.bx - pw), U.rand(0, 620 - ph)];
}
function trySnap(g, p) {
  if (p.placed || p.rot !== 0) return;
  if (Math.hypot(p.x - p.tx, p.y - p.ty) < Math.max(14, Math.min(S.pw, S.ph) * 0.3)) {
    p.x = p.tx; p.y = p.ty; p.placed = true; S.placedN++;
    S.order.splice(S.order.indexOf(p.id), 1); S.order.unshift(p.id);
    g.sfx.tone(660, 0.06, 'square', 0.04); g.sfx.tone(990, 0.08, 'triangle', 0.05, null, 0.05);
    g.burst(p.x + S.pw / 2, p.y + S.ph / 2, ['#e9d5ff', '#fde047', '#fff'], 10, 120, 0.4);
    g.add(10 + S.diff * 5);
    S.flashT = 0.5; S.flashP = p;
    if (S.placedN === S.pieces.length) finish(g);
  }
}
function finish(g) {
  S.done = true; S.solvedCnt++; S.streak++;
  S.gain = Math.max(100, Math.round(JD[S.diff].base * (1 + S.streak * 0.1) - S.time * 1.0 - S.hints * 60));
  g.add(S.gain, S.bx + S.bw / 2, S.by + S.bh / 2 - 100); g.sfx.win(); g.shake(5, 0.3);
  for (let k = 0; k < 10; k++) g.later(() => g.burst(U.rand(S.bx, S.bx + S.bw), U.rand(S.by, S.by + S.bh), ['#a855f7', '#fde047', '#22c55e', '#f472b6', '#38bdf8'], 28, 280, 1.1), k * 0.12);
}
function arrange(g) {
  // 남은 조각을 가장자리 조각 먼저 판 바깥에 줄 세우기
  const left = S.pieces.filter((p) => !p.placed).sort((a, b) => b.edge - a.edge);
  const slots = [], sx = S.pw + 8, sy = S.ph + 8, m = S.margin;
  for (let y = 8 + m / 2; y + S.ph < 620; y += sy) for (let x = 8 + m / 2; x + S.pw < 952; x += sx) {
    if (x + S.pw > S.bx - 12 && x < S.bx + S.bw + 12 && y + S.ph > S.by - 12 && y < S.by + S.bh + 28) continue;
    slots.push([x, y]);
  }
  left.forEach((p, i) => { const s = slots[i % Math.max(1, slots.length)] || scatterPos(); p.x = s[0] + (i >= slots.length ? 6 : 0); p.y = s[1] + (i >= slots.length ? 6 : 0); });
  const ids = left.map((p) => p.id).reverse(); S.order = S.order.filter((id) => !ids.includes(id)).concat(ids);
  g.sfx.power();
}
function hint(g) {
  if (S.done) return;
  const left = S.pieces.filter((p) => !p.placed); if (!left.length) return;
  const p = left.find((q) => q.edge) || left[0];
  p.rot = 0; p.x = p.tx; p.y = p.ty; S.hints++; trySnap(g, p); g.sfx.power();
}
