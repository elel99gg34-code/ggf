let S;
// 각 홀: 시작, 홀컵, 파, 벽(사각형 x,y,w,h), 모래, 물, 움직이는 막대
const HOLES = [
  { s: [150, 300], h: [750, 300], par: 2, walls: [], sand: [], water: [], mov: [] },
  { s: [150, 480], h: [750, 120], par: 3, walls: [[400, 0, 40, 400]], sand: [[600, 380, 150, 120]], water: [], mov: [] },
  { s: [120, 300], h: [780, 300], par: 3, walls: [[300, 150, 30, 300], [550, 0, 30, 250], [550, 350, 30, 250]], sand: [], water: [], mov: [] },
  { s: [120, 120], h: [780, 480], par: 3, walls: [[250, 220, 450, 30]], sand: [], water: [[300, 350, 250, 130]], mov: [] },
  { s: [450, 520], h: [450, 90], par: 3, walls: [], sand: [], water: [], mov: [{ x: 450, y: 300, len: 140, sp: 1.6 }] },
  { s: [100, 500], h: [800, 100], par: 4, walls: [[200, 300, 500, 30], [200, 100, 30, 200], [670, 330, 30, 200]], sand: [[400, 120, 160, 120]], water: [[300, 420, 200, 100]], mov: [] },
  { s: [120, 300], h: [800, 300], par: 3, walls: [[350, 0, 30, 220], [350, 380, 30, 220], [550, 120, 30, 360]], sand: [], water: [], mov: [{ x: 460, y: 300, len: 90, sp: -2.2 }] },
  { s: [450, 540], h: [450, 300], par: 4, walls: [[300, 200, 300, 25], [300, 400, 300, 25], [300, 200, 25, 160], [575, 265, 25, 160]], sand: [[100, 100, 120, 400]], water: [[700, 100, 120, 400]], mov: [] },
  { s: [100, 100], h: [800, 500], par: 4, walls: [[200, 0, 30, 450], [400, 150, 30, 450], [600, 0, 30, 450]], sand: [[430, 480, 170, 120]], water: [[230, 400, 170, 80]], mov: [{ x: 715, y: 300, len: 80, sp: 2.5 }] },
];
GAME({
  title: '미니 골프', w: 900, h: 640, bg: '#14532d', controls: 'none',
  help: '공을 클릭한 채 뒤로 끌었다가 놓으면 샷!\n(끈 거리 = 힘, 반대 방향으로 날아가요)\n🟨 벙커는 감속 · 🟦 물에 빠지면 +1타 & 제자리\n9홀 · 파보다 적게 칠수록 고득점 (홀인원 = 1000점!)',
  init(g) { S = { hole: 0, strokes: 0, total: 0, card: [] }; load(); },
  update(g, dt) {
    const H = HOLES[S.hole], b = S.ball;
    for (const m of H.mov) m.a = (m.a || 0) + m.sp * dt;
    if (S.sunk > 0) { S.sunk -= dt; if (S.sunk <= 0) next(g); return; }
    const moving = Math.hypot(b.vx, b.vy) > 4;
    if (!moving) {
      b.vx = b.vy = 0;
      if (g.mouse.clicked && U.dist(g.mouse.x, g.mouse.y, b.x, b.y) < 60) S.aim = true;
      if (S.aim && g.mouse.released) {
        S.aim = false;
        const dx = b.x - g.mouse.x, dy = b.y - g.mouse.y, d = Math.min(220, Math.hypot(dx, dy));
        if (d > 8) { const p = d * 5.2; b.vx = (dx / Math.hypot(dx, dy)) * p; b.vy = (dy / Math.hypot(dx, dy)) * p; S.strokes++; S.last = { x: b.x, y: b.y }; g.sfx.tone(300, 0.08, 'triangle', 0.08); }
      }
    }
    const sub = 6;
    for (let i = 0; i < sub; i++) {
      const h = dt / sub;
      const inSand = H.sand.some(([x, y, w, hh]) => b.x > x + 30 && b.x < x + w + 30 && b.y > y + 30 && b.y < y + hh + 30);
      const fr = inSand ? 0.12 : 0.55;
      b.vx *= Math.pow(fr, h); b.vy *= Math.pow(fr, h);
      const sp = Math.hypot(b.vx, b.vy); if (sp < 25 && sp > 0) { b.vx *= Math.max(0, 1 - h * 4); b.vy *= Math.max(0, 1 - h * 4); }
      b.x += b.vx * h; b.y += b.vy * h;
      if (b.x < 30 + 9) { b.x = 39; b.vx = Math.abs(b.vx) * 0.8; g.sfx.bounce(); } if (b.x > 870 - 9) { b.x = 861; b.vx = -Math.abs(b.vx) * 0.8; g.sfx.bounce(); }
      if (b.y < 30 + 9) { b.y = 39; b.vy = Math.abs(b.vy) * 0.8; g.sfx.bounce(); } if (b.y > 610 - 9) { b.y = 601; b.vy = -Math.abs(b.vy) * 0.8; g.sfx.bounce(); }
      for (const [x, y, w, hh] of H.walls) rectBounce(g, b, x + 30, y + 30, w, hh);
      for (const m of H.mov) { const ex = Math.cos(m.a) * m.len, ey = Math.sin(m.a) * m.len; segBounce(g, b, m.x - ex, m.y - ey, m.x + ex, m.y + ey); }
      const [hx, hy] = H.h, dh = U.dist(b.x, b.y, hx, hy);
      if (dh < 14 && Math.hypot(b.vx, b.vy) < 650) { S.sunk = 1.5; b.vx = b.vy = 0; b.x = hx; b.y = hy; holeDone(g); return; }
      if (dh < 40 && Math.hypot(b.vx, b.vy) < 120) { b.vx += (hx - b.x) * h * 6; b.vy += (hy - b.y) * h * 6; }
      if (H.water.some(([x, y, w, hh]) => b.x > x + 30 && b.x < x + w + 30 && b.y > y + 30 && b.y < y + hh + 30)) { S.strokes++; g.sfx.drop(); g.burst(b.x, b.y, '#60a5fa', 20); b.x = S.last.x; b.y = S.last.y; b.vx = b.vy = 0; g.float(b.x, b.y - 30, '풍덩! +1타', '#60a5fa'); return; }
    }
    if (S.strokes >= 10 && !moving && !S.aim) { S.strokes = 11; holeDone(g); S.sunk = 1.2; }
    g.info = `홀 ${S.hole + 1}/9 · 파 ${H.par} · ${S.strokes}타`;
  },
  draw(g, c) {
    const H = HOLES[S.hole];
    g.rrect(20, 20, 860, 600, 20, '#7c4a1e');
    g.rect(30, 30, 840, 580, '#22c55e');
    for (let x = 30; x < 870; x += 40) g.rect(x, 30, 20, 580, 'rgba(255,255,255,.04)');
    for (const [x, y, w, h] of H.sand) g.rrect(x + 30, y + 30, w, h, 20, '#fde68a');
    for (const [x, y, w, h] of H.water) { g.rrect(x + 30, y + 30, w, h, 20, '#3b82f6'); for (let i = 0; i < 3; i++) g.line(x + 50, y + 50 + i * 20 + Math.sin(g.time * 2 + i) * 3, x + w + 10, y + 50 + i * 20 + Math.sin(g.time * 2 + i) * 3, 'rgba(255,255,255,.3)', 2); }
    for (const [x, y, w, h] of H.walls) { g.rect(x + 30, y + 30, w, h, '#78350f'); g.stroke(x + 30, y + 30, w, h, '#451a03', 2); }
    for (const m of H.mov) { const ex = Math.cos(m.a) * m.len, ey = Math.sin(m.a) * m.len; g.line(m.x - ex, m.y - ey, m.x + ex, m.y + ey, '#dc2626', 12); g.circle(m.x, m.y, 10, '#7f1d1d'); }
    const [hx, hy] = H.h;
    g.circle(hx, hy, 15, '#052e16'); g.line(hx, hy, hx, hy - 60, '#e5e7eb', 3); g.poly([[hx, hy - 60], [hx + 30, hy - 50], [hx, hy - 40]], '#ef4444');
    const b = S.ball;
    if (S.aim) {
      const dx = b.x - g.mouse.x, dy = b.y - g.mouse.y, d = Math.min(220, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      const col = d < 80 ? '#4ade80' : d < 160 ? '#facc15' : '#ef4444';
      c.setLineDash([8, 8]); g.line(b.x, b.y, b.x + Math.cos(a) * d * 1.4, b.y + Math.sin(a) * d * 1.4, col, 4); c.setLineDash([]);
      g.line(b.x, b.y, b.x - Math.cos(a) * d * 0.4, b.y - Math.sin(a) * d * 0.4, 'rgba(255,255,255,.5)', 6);
      g.rect(b.x - 30, b.y + 22, 60, 6, '#111'); g.rect(b.x - 30, b.y + 22, (60 * d) / 220, 6, col);
    }
    if (!(S.sunk > 0)) { g.circle(b.x + 2, b.y + 3, 9, 'rgba(0,0,0,.3)'); g.circle(b.x, b.y, 9, '#fff'); }
    g.text(`HOLE ${S.hole + 1}  ·  PAR ${H.par}  ·  ${S.strokes}타`, 450, 12, 16, '#fff');
    if (S.sunk > 0) g.text(S.msg, 450, 300, 50, '#fde047');
    if (!S.strokes && !S.aim) g.text('공을 끌어서 조준!', b.x, b.y - 40, 16, '#fff');
  },
});
function load() { const H = HOLES[S.hole]; S.ball = { x: H.s[0], y: H.s[1], vx: 0, vy: 0 }; S.last = { x: H.s[0], y: H.s[1] }; S.strokes = 0; S.sunk = 0; S.aim = false; H.mov.forEach((m) => (m.a = 0)); }
function holeDone(g) {
  const H = HOLES[S.hole], d = S.strokes - H.par;
  const names = { '-3': '알바트로스!', '-2': '이글!', '-1': '버디!', 0: '파', 1: '보기', 2: '더블 보기' };
  S.msg = S.strokes === 1 ? '⛳ 홀인원!!' : names[d] || `+${d}`;
  const pts = S.strokes === 1 ? 1000 : Math.max(0, (H.par + 3 - S.strokes) * 150);
  g.add(pts); S.total += S.strokes; S.card.push(S.strokes);
  S.strokes <= H.par ? g.sfx.win() : g.sfx.coin();
}
function next(g) { S.hole++; if (S.hole >= HOLES.length) { const par = HOLES.reduce((s, h) => s + h.par, 0); const d = S.total - par; return g.win(`총 ${S.total}타 (${d > 0 ? '+' + d : d === 0 ? 'E' : d})`); } load(); }
function rectBounce(g, b, x, y, w, h) {
  const nx = U.clamp(b.x, x, x + w), ny = U.clamp(b.y, y, y + h), dx = b.x - nx, dy = b.y - ny, d = Math.hypot(dx, dy);
  if (d < 9 && d > 0) { const ux = dx / d, uy = dy / d; b.x = nx + ux * 9; b.y = ny + uy * 9; const vn = b.vx * ux + b.vy * uy; if (vn < 0) { b.vx -= 1.8 * vn * ux; b.vy -= 1.8 * vn * uy; g.sfx.bounce(); } }
  else if (d === 0) { b.vx *= -1; b.vy *= -1; }
}
function segBounce(g, b, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, t = U.clamp(((b.x - x1) * dx + (b.y - y1) * dy) / (dx * dx + dy * dy), 0, 1), cx = x1 + dx * t, cy = y1 + dy * t, d = U.dist(b.x, b.y, cx, cy);
  if (d < 15 && d > 0) { const ux = (b.x - cx) / d, uy = (b.y - cy) / d; b.x = cx + ux * 15; b.y = cy + uy * 15; const vn = b.vx * ux + b.vy * uy; b.vx -= 1.8 * Math.min(0, vn) * ux; b.vy -= 1.8 * Math.min(0, vn) * uy; b.vx += ux * 120; b.vy += uy * 120; g.sfx.bounce(); }
}
