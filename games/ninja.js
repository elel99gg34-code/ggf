let S;
const FR = [['🍉', '#ef4444'], ['🍊', '#fb923c'], ['🍎', '#dc2626'], ['🍍', '#facc15'], ['🥝', '#84cc16'], ['🍋', '#fde047'], ['🍑', '#fdba74'], ['🥥', '#f5f5f4'], ['🍇', '#a855f7'], ['🍓', '#f43f5e']];
GAME({
  title: '과일 닌자', w: 960, h: 640, bg: '#2a1a0e', controls: 'none',
  help: '마우스를 누른 채(터치는 드래그) 휘둘러 과일을 베세요\n한 번에 3개 이상 = 콤보 보너스!\n💣 폭탄을 베면 게임 오버 · 과일 3개 놓치면 게임 오버\n🍌 황금 바나나 = 슬로우 모션 · ⭐ 별 과일 = +50',
  init(g) { S = { objs: [], halves: [], trail: [], miss: 0, t: 1, wave: 0, slow: 0, combo: [], comboT: 0, splats: [] }; },
  update(g, dt0) {
    S.slow -= dt0;
    const dt = S.slow > 0 ? dt0 * 0.4 : dt0;
    const m = g.mouse;
    if (m.down) { S.trail.push({ x: m.x, y: m.y, t: 0.2 }); } 
    S.trail.forEach((p) => (p.t -= dt0)); S.trail = S.trail.filter((p) => p.t > 0);
    if (!m.down && S.trail.length && S.trail[S.trail.length - 1].t < 0.18) {}
    S.t -= dt;
    if (S.t <= 0) {
      S.wave++;
      const n = U.randi(1, Math.min(6, 2 + Math.floor(S.wave / 4)));
      const bombP = Math.min(0.35, 0.08 + S.wave * 0.01);
      for (let i = 0; i < n; i++) g.later(() => launch(g, Math.random() < bombP), i * U.rand(0.05, 0.25));
      S.t = Math.max(0.9, 2.2 - S.wave * 0.03);
    }
    // 베기 판정
    const tr = S.trail;
    if (m.down && tr.length >= 2) {
      const a = tr[tr.length - 2], b = tr[tr.length - 1];
      const len = U.dist(a.x, a.y, b.x, b.y);
      if (len > 4) for (const o of S.objs) {
        if (o.cut) continue;
        if (segCirc(a.x, a.y, b.x, b.y, o.x, o.y, o.r)) {
          o.cut = true;
          if (o.bomb) { g.sfx.explode(); g.shake(20, 0.8); S.flash = 1; g.burst(o.x, o.y, ['#fff', '#f97316', '#111'], 80, 500, 1); return g.later(() => g.over(`💣 폭탄을 베었다! · 웨이브 ${S.wave}`), 0.8); }
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          for (const s of [-1, 1]) S.halves.push({ e: o.e, x: o.x, y: o.y, vx: o.vx + Math.cos(ang + Math.PI / 2) * 120 * s, vy: o.vy - 50, rot: 0, vr: s * 4, side: s, ang, r: o.r });
          S.splats.push({ x: o.x, y: o.y, c: o.c, t: 2, r: o.r * 1.4 });
          g.burst(o.x, o.y, o.c, 22, 260, 0.7);
          g.sfx.tone(U.rand(300, 500), 0.08, 'sawtooth', 0.04, 1200);
          let pts = o.star ? 50 : o.banana ? 10 : 1;
          if (o.banana) { S.slow = 4; g.float(o.x, o.y - 30, '슬로우 모션!', '#fde047', 26); g.sfx.power(); }
          g.add(pts, o.x, o.y);
          S.combo.push(o); S.comboT = 0.25;
        }
      }
    }
    S.comboT -= dt0;
    if (S.comboT <= 0 && S.combo.length) {
      if (S.combo.length >= 3) { const bonus = S.combo.length * 2; g.add(bonus); const c = S.combo[S.combo.length - 1]; g.float(c.x, c.y - 50, `${S.combo.length} 콤보! +${bonus}`, '#fde047', 30); g.sfx.coin(); }
      S.combo = [];
    }
    for (const o of S.objs) { o.vy += 500 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.y > g.H + 80 && o.vy > 0) { o.gone = true; if (!o.cut && !o.bomb && !o.banana) { S.miss++; g.sfx.hit(); g.float(U.clamp(o.x, 40, g.W - 40), g.H - 40, '❌', '#ef4444', 34); if (S.miss >= 3) return g.over(`과일 3개를 놓쳤다! · 웨이브 ${S.wave}`); } } }
    S.objs = S.objs.filter((o) => !o.gone && !o.cut);
    for (const h of S.halves) { h.vy += 600 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    S.halves = S.halves.filter((h) => h.y < g.H + 80);
    S.splats = S.splats.filter((s) => (s.t -= dt0) > 0);
    g.info = '❌'.repeat(S.miss) + '⭕'.repeat(3 - S.miss);
  },
  draw(g, c) {
    for (let x = 0; x < g.W; x += 120) { g.rect(x, 0, 116, g.H, '#3d2614'); g.rect(x + 116, 0, 4, g.H, '#22140a'); }
    for (const s of S.splats) { c.globalAlpha = Math.min(0.6, s.t / 2); g.circle(s.x, s.y, s.r, s.c); c.globalAlpha = 1; }
    for (const h of S.halves) {
      c.save(); c.translate(h.x, h.y); c.rotate(h.rot);
      c.beginPath(); c.rect(h.side > 0 ? 0 : -h.r * 1.5, -h.r * 1.5, h.r * 1.5, h.r * 3); c.clip();
      g.emoji(h.e, 0, 0, h.r * 2.4); c.restore();
    }
    for (const o of S.objs) { c.save(); c.translate(o.x, o.y); c.rotate(o.rot); if (o.bomb) { g.ring(0, 0, o.r + 4 + Math.sin(g.time * 20) * 3, '#ef4444', 3); } if (o.star) g.ring(0, 0, o.r + 6, '#fde047', 3); g.emoji(o.e, 0, 0, o.r * 2.4); c.restore(); }
    if (S.trail.length > 1) {
      c.lineCap = 'round';
      for (let i = 1; i < S.trail.length; i++) { const a = S.trail[i - 1], b = S.trail[i]; g.line(a.x, a.y, b.x, b.y, `rgba(255,255,255,${b.t * 4})`, 2 + (i / S.trail.length) * 10); }
    }
    if (S.slow > 0) { c.fillStyle = 'rgba(147,197,253,.12)'; c.fillRect(0, 0, g.W, g.H); }
    if (S.flash > 0) { S.flash -= 1 / 60; c.fillStyle = `rgba(255,255,255,${S.flash})`; c.fillRect(0, 0, g.W, g.H); }
    g.text(g.score, 30, 40, 40, '#fde047', 'left');
  },
});
function launch(g, bomb) {
  const x = U.rand(150, g.W - 150);
  const f = U.choice(FR), r = U.rand(28, 38);
  const special = !bomb && Math.random() < 0.06;
  const o = { x, y: g.H + 40, vx: (g.W / 2 - x) * U.rand(0.2, 0.6), vy: -U.rand(620, 780), r, rot: 0, vr: U.rand(-3, 3), e: bomb ? '💣' : f[0], c: f[1], bomb };
  if (special) { if (Math.random() < 0.5) { o.banana = true; o.e = '🍌'; o.c = '#fde047'; } else { o.star = true; o.e = '🌟'; o.c = '#fde047'; } }
  S.objs.push(o);
  g.sfx.tone(180, 0.1, 'sine', 0.04, 400);
}
function segCirc(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
  const t = U.clamp(((cx - x1) * dx + (cy - y1) * dy) / l, 0, 1);
  return U.dist(x1 + dx * t, y1 + dy * t, cx, cy) < r;
}
