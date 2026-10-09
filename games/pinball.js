let S;
const BR = 11, GRAV = 900;
GAME({
  title: '핀볼', w: 600, h: 900, bg: '#0c0a1d', controls: 'lr+ab', aLabel: '🚀',
  help: '← / Z = 왼쪽 플리퍼 · → / / = 오른쪽 플리퍼\nSpace/↓ 꾹 눌렀다 떼면 공 발사 (오래 누를수록 강하게)\n범퍼 100 · 슬링샷 50 · 타겟 4개 모두 = 보너스 & 배수 UP\n공 3개 · 흔들기(T)는 3번 이상 하면 틸트!',
  init(g) {
    S = { balls: 3, mult: 1, ball: null, plunge: 0, launched: false, fl: { l: 0.5, r: 0.5, lv: 0, rv: 0 }, targets: [0, 0, 0, 0], lit: [0, 0, 0], tilt: 0, tiltT: 0, flash: {}, save: 0 };
    S.walls = [
      [20, 860, 20, 160], [20, 160, 60, 90], [60, 90, 140, 50], [140, 50, 300, 30], [300, 30, 460, 50], [460, 50, 540, 90], [540, 90, 580, 160], [580, 160, 580, 880],
      [540, 880, 540, 240],
      [20, 680, 175, 790], [540, 680, 385, 790],
      [70, 610, 70, 690], [70, 690, 145, 740], [490, 610, 490, 690], [490, 690, 415, 740],
      [100, 180, 100, 330], [460, 180, 460, 330],
      [200, 110, 200, 150], [260, 105, 260, 145], [320, 105, 320, 145], [380, 110, 380, 150],
    ].map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2 }));
    S.slings = [{ x1: 105, y1: 600, x2: 150, y2: 700, side: 1 }, { x1: 455, y1: 600, x2: 410, y2: 700, side: -1 }];
    S.bumpers = [{ x: 210, y: 260, r: 32 }, { x: 350, y: 260, r: 32 }, { x: 280, y: 360, r: 32 }, { x: 150, y: 430, r: 22 }, { x: 410, y: 430, r: 22 }];
    S.tgt = [{ x: 170, y: 520 }, { x: 230, y: 500 }, { x: 330, y: 500 }, { x: 390, y: 520 }];
    S.lanes = [{ x: 230, y: 125 }, { x: 290, y: 120 }, { x: 350, y: 125 }];
    newBall();
  },
  update(g, dt) {
    const L = g.left || g.key('KeyZ') || (g.mouse.down && g.mouse.x < 300), R = g.right || g.key('Slash') || g.key('KeyM') || (g.mouse.down && g.mouse.x >= 300);
    if ((L && !S.pL) || (R && !S.pR)) g.sfx.tone(180, 0.05, 'square', 0.05);
    S.pL = L; S.pR = R;
    if (S.tiltT > 0) { S.tiltT -= dt; }
    if (g.keyp('KeyT')) { S.tilt++; if (S.tilt >= 3) { S.tiltT = 3; g.float(300, 450, 'TILT!', '#ef4444', 60); g.sfx.lose(); } else if (S.ball) { S.ball.vx += U.rand(-150, 150); S.ball.vy -= 100; g.shake(8); } }
    const flUp = (k, on) => { const tgt = on && S.tiltT <= 0 ? 1 : 0; const prev = S.fl[k]; S.fl[k] += (tgt - S.fl[k]) * Math.min(1, dt * (tgt ? 30 : 14)); S.fl[k + 'v'] = (S.fl[k] - prev) / dt; };
    flUp('l', L); flUp('r', R);
    const b = S.ball;
    const plungeKey = g.a || g.down || (g.mouse.down && g.mouse.x > 540);
    if (b && !S.launched && b.x > 540) {
      if (plungeKey) S.plunge = Math.min(1, S.plunge + dt * 1.2);
      else if (S.plunge > 0) { b.vy = -900 - S.plunge * 900; S.plunge = 0; S.launched = true; g.sfx.tone(200, 0.2, 'sawtooth', 0.05, 600); }
    }
    if (!b) return;
    const sub = 10, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      if (b.x > 540 && !S.launched && b.y >= 850) { b.y = 850; b.vy = 0; b.vx = 0; continue; }
      b.vy += GRAV * h; b.x += b.vx * h; b.y += b.vy * h;
      for (const w of S.walls) collideSeg(b, w.x1, w.y1, w.x2, w.y2, 0.5, 0, 0);
      for (const s of S.slings) if (collideSeg(b, s.x1, s.y1, s.x2, s.y2, 0.5, 0, 0)) { const nx = (s.y2 - s.y1), ny = -(s.x2 - s.x1), l = Math.hypot(nx, ny); b.vx += (nx / l) * 500 * s.side; b.vy += (ny / l) * 500 * s.side; score(g, 50); S.flash[s.x1] = 0.15; g.sfx.tone(700, 0.05, 'square', 0.04); }
      for (const bp of S.bumpers) { const d = U.dist(b.x, b.y, bp.x, bp.y); if (d < bp.r + BR) { const nx = (b.x - bp.x) / d, ny = (b.y - bp.y) / d; b.x = bp.x + nx * (bp.r + BR); b.y = bp.y + ny * (bp.r + BR); const sp = Math.max(500, Math.hypot(b.vx, b.vy)); b.vx = nx * sp; b.vy = ny * sp; score(g, 100); bp.flash = 0.15; g.sfx.tone(520 + bp.x % 200, 0.07, 'square', 0.05); } }
      for (const [k, px, py, dir] of [['l', 175, 790, 1], ['r', 385, 790, -1]]) {
        const ang = dir > 0 ? 0.5 - S.fl[k] * 1.0 : Math.PI - 0.5 + S.fl[k] * 1.0, len = 82;
        const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
        const w = -S.fl[k + 'v'] * 1.0 * dir;
        collideSeg(b, px, py, ex, ey, 0.25, w, { px, py }, 8);
      }
      for (let t = 0; t < 4; t++) { const tg = S.tgt[t]; if (!S.targets[t] && Math.abs(b.x - tg.x) < 18 + BR && Math.abs(b.y - tg.y) < 6 + BR) { S.targets[t] = 1; b.vy = -Math.abs(b.vy) * 0.6 - 100; score(g, 200); g.sfx.coin(); if (S.targets.every((v) => v)) { score(g, 2000); S.mult = Math.min(5, S.mult + 1); g.float(300, 450, `배수 ×${S.mult}!`, '#fde047', 40); g.sfx.win(); S.targets = [0, 0, 0, 0]; } } }
      for (let t = 0; t < 3; t++) { const ln = S.lanes[t]; if (!S.lit[t] && Math.abs(b.x - ln.x) < 16 && Math.abs(b.y - ln.y) < 16) { S.lit[t] = 1; score(g, 100); g.sfx.tone(900, 0.06, 'triangle', 0.04); if (S.lit.every((v) => v)) { score(g, 1000); S.save = 10; S.lit = [0, 0, 0]; g.float(300, 200, '볼 세이버 ON!', '#4ade80', 30); } } }
      const sp = Math.hypot(b.vx, b.vy); if (sp > 1800) { b.vx *= 1800 / sp; b.vy *= 1800 / sp; }
    }
    S.save -= dt;
    if (b.y > 920) {
      if (S.save > 0) { g.float(300, 700, '세이브!', '#4ade80', 30); newBall(); return; }
      S.balls--; g.sfx.lose(); g.shake(10);
      if (S.balls <= 0) { S.ball = null; return g.over(`배수 ×${S.mult}`); }
      newBall();
    }
    for (const k in S.flash) S.flash[k] -= dt;
    S.bumpers.forEach((bp) => (bp.flash = (bp.flash || 0) - dt));
    g.info = `공 ${S.balls} · ×${S.mult}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, 900); grd.addColorStop(0, '#1e1b4b'); grd.addColorStop(1, '#0c0a1d'); c.fillStyle = grd; c.fillRect(0, 0, 600, 900);
    for (let i = 0; i < 5; i++) g.ring(280, 360, 60 + i * 50, 'rgba(129,140,248,.06)', 10);
    g.text('GGF', 280, 600, 70, 'rgba(255,255,255,.06)');
    c.lineCap = 'round';
    for (const w of S.walls) g.line(w.x1, w.y1, w.x2, w.y2, '#a5b4fc', 6);
    for (const s of S.slings) g.line(s.x1, s.y1, s.x2, s.y2, (S.flash[s.x1] || 0) > 0 ? '#fff' : '#f472b6', 8);
    for (const bp of S.bumpers) { c.shadowBlur = bp.flash > 0 ? 30 : 10; c.shadowColor = '#f0abfc'; g.circle(bp.x, bp.y, bp.r, bp.flash > 0 ? '#fff' : '#c026d3'); c.shadowBlur = 0; g.circle(bp.x, bp.y, bp.r * 0.6, '#f5d0fe'); g.text('100', bp.x, bp.y + 1, bp.r * 0.5, '#86198f'); }
    S.tgt.forEach((t, i) => g.rrect(t.x - 18, t.y - 6, 36, 12, 4, S.targets[i] ? '#334155' : '#facc15', '#fff', 1));
    S.lanes.forEach((ln, i) => { g.circle(ln.x, ln.y, 9, S.lit[i] ? '#4ade80' : '#14532d'); });
    for (const [k, px, py, dir] of [['l', 175, 790, 1], ['r', 385, 790, -1]]) {
      const ang = dir > 0 ? 0.5 - S.fl[k] * 1.0 : Math.PI - 0.5 + S.fl[k] * 1.0;
      g.line(px, py, px + Math.cos(ang) * 82, py + Math.sin(ang) * 82, '#f97316', 18); g.circle(px, py, 10, '#fff');
    }
    g.rect(546, 860 + S.plunge * 30, 28, 40, '#ef4444');
    if (S.ball) { g.circle(S.ball.x, S.ball.y, BR, '#e5e7eb'); g.circle(S.ball.x - 3, S.ball.y - 4, 4, '#fff'); }
    if (S.save > 0) g.text('🛡️ 세이버', 280, 870, 16, '#4ade80');
    g.text(`×${S.mult}`, 30, 30, 20, '#fde047', 'left');
    for (let i = 0; i < S.balls; i++) g.circle(560 - i * 0, 40 + i * 26, 8, '#e5e7eb');
    if (S.ball && S.ball.x > 540 && !S.launched) g.text('Space 꾹 → 놓기', 300, 860, 18, '#fde047');
  },
});
function newBall() { S.ball = { x: 560, y: 850, vx: 0, vy: 0 }; S.launched = false; S.plunge = 0; }
function score(g, n) { g.add(n * S.mult); }
function collideSeg(b, x1, y1, x2, y2, e, w, pivot, thick = 3) {
  const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
  const t = U.clamp(((b.x - x1) * dx + (b.y - y1) * dy) / L, 0, 1);
  const cx = x1 + dx * t, cy = y1 + dy * t, d = U.dist(b.x, b.y, cx, cy), R = BR + thick;
  if (d >= R || d === 0) return false;
  const nx = (b.x - cx) / d, ny = (b.y - cy) / d;
  b.x = cx + nx * R; b.y = cy + ny * R;
  let svx = 0, svy = 0;
  if (pivot) { const rx = cx - pivot.px, ry = cy - pivot.py; svx = -w * ry; svy = w * rx; }
  const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
  if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
  return vn < -50;
}
