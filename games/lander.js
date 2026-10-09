let S;
GAME({
  title: '달 착륙선', w: 960, h: 640, bg: '#000', controls: 'dpad',
  help: '↑ 메인 엔진 · ←→ 회전 (A/D)\n초록색 착륙장에 똑바로, 천천히 내려앉으세요\n(수직 속도 40 이하, 수평 20 이하, 기울기 10° 이하)\n착륙장 배율 ×2~×5 · 연료가 떨어지면 끝',
  init(g) { S = { fuel: 1000, level: 0, landed: 0 }; newTerrain(); },
  update(g, dt) {
    const L = S.L;
    if (S.state === 'landed') { S.wait -= dt; if (S.wait <= 0) newTerrain(); return; }
    if (S.state === 'crash') { S.wait -= dt; if (S.wait <= 0) { if (S.fuel <= 0) return g.over(`착륙 성공 ${S.landed}회`); newTerrain(true); } return; }
    L.a += (g.right - g.left) * 2.2 * dt; L.a = U.clamp(L.a, -Math.PI / 2, Math.PI / 2);
    S.thrust = g.up && S.fuel > 0;
    if (S.thrust) { L.vx += Math.sin(L.a) * 60 * dt; L.vy -= Math.cos(L.a) * 60 * dt; S.fuel = Math.max(0, S.fuel - 22 * dt); if (g.frame % 2 === 0) g.burst(L.x - Math.sin(L.a) * 18, L.y + Math.cos(L.a) * 18, ['#f97316', '#fde047'], 2, 60, 0.4); if (g.frame % 6 === 0) g.sfx.noise(0.08, 0.04); }
    if ((g.left || g.right) && S.fuel > 0) S.fuel = Math.max(0, S.fuel - 3 * dt);
    L.vy += 16 * dt * (1 + S.level * 0.05);
    L.x += L.vx * dt; L.y += L.vy * dt;
    if (L.x < 0) L.x += g.W; if (L.x > g.W) L.x -= g.W;
    const gy = groundAt(L.x);
    if (L.y + 14 >= gy) {
      const pad = S.pads.find((p) => L.x - 12 > p.x1 && L.x + 12 < p.x2);
      const ok = pad && Math.abs(L.vy) < 40 && Math.abs(L.vx) < 20 && Math.abs(L.a) < 0.18;
      if (ok) {
        const pts = Math.round((50 + (40 - Math.abs(L.vy)) * 5) * pad.m);
        g.add(pts, L.x, L.y - 40); S.fuel = Math.min(1000, S.fuel + 150); S.landed++;
        g.sfx.win(); S.state = 'landed'; S.wait = 2.5; S.msg = `완벽 착륙! +${pts} (연료 +150)`; L.y = gy - 14;
      } else {
        g.sfx.explode(); g.shake(14); g.burst(L.x, L.y, ['#f97316', '#fde047', '#94a3b8'], 70, 300, 1.2);
        S.state = 'crash'; S.wait = 2.5; S.fuel = Math.max(0, S.fuel - 200); S.msg = pad ? '너무 빠르거나 기울어졌다! (연료 -200)' : '착륙장이 아니다! (연료 -200)';
      }
    }
    if (S.fuel <= 0 && L.y > g.H + 50) return g.over(`착륙 성공 ${S.landed}회`);
    g.info = `착륙 ${S.landed}회`;
  },
  draw(g, c) {
    S.stars.forEach((s) => g.rect(s[0], s[1], 1.5, 1.5, '#cbd5e1'));
    c.fillStyle = '#1f2937'; c.beginPath(); c.moveTo(0, g.H); S.pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(g.W, g.H); c.fill();
    c.strokeStyle = '#e5e7eb'; c.lineWidth = 2; c.beginPath(); S.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    S.pads.forEach((p) => { g.rect(p.x1, p.y - 2, p.x2 - p.x1, 5, '#22c55e'); g.text('×' + p.m, (p.x1 + p.x2) / 2, p.y + 18, 16, '#4ade80'); });
    const L = S.L;
    if (S.state !== 'crash') {
      c.save(); c.translate(L.x, L.y); c.rotate(L.a);
      if (S.thrust) g.poly([[-6, 12], [6, 12], [0, 26 + Math.random() * 14]], '#f97316');
      g.poly([[-12, 8], [12, 8], [10, -6], [0, -14], [-10, -6]], '#e5e7eb', '#94a3b8');
      g.circle(0, -3, 4, '#38bdf8');
      g.line(-10, 8, -16, 16, '#cbd5e1', 2); g.line(10, 8, 16, 16, '#cbd5e1', 2);
      c.restore();
    }
    const alt = Math.max(0, Math.round(groundAt(L.x) - L.y - 14));
    const okc = (v, lim) => (Math.abs(v) < lim ? '#4ade80' : '#f87171');
    g.text(`연료 ${Math.round(S.fuel)}`, 20, 24, 18, S.fuel < 200 ? '#f87171' : '#fff', 'left');
    g.rect(20, 40, 200, 8, '#334155'); g.rect(20, 40, (S.fuel / 1000) * 200, 8, '#fbbf24');
    g.text(`고도 ${alt}`, 20, 70, 16, '#cbd5e1', 'left');
    g.text(`수평 ${L.vx.toFixed(0)}`, 20, 94, 16, okc(L.vx, 20), 'left');
    g.text(`수직 ${L.vy.toFixed(0)}`, 20, 118, 16, okc(L.vy, 40), 'left');
    g.text(`기울기 ${(L.a * 57.3).toFixed(0)}°`, 20, 142, 16, okc(L.a, 0.18), 'left');
    if (S.msg && S.state !== 'fly') g.text(S.msg, g.W / 2, 200, 28, S.state === 'landed' ? '#4ade80' : '#f87171');
  },
});
function groundAt(x) {
  for (let i = 0; i < S.pts.length - 1; i++) { const [x1, y1] = S.pts[i], [x2, y2] = S.pts[i + 1]; if (x >= x1 && x <= x2) return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1 || 1); }
  return 640;
}
function newTerrain(same) {
  if (!same) S.level++;
  if (!same || !S.pts) {
    S.pts = []; S.pads = [];
    let y = U.rand(450, 560);
    const padAt = U.shuffle([2, 6, 10, 14, 18]).slice(0, Math.max(2, 4 - Math.floor(S.level / 3)));
    for (let i = 0, x = 0; x <= 960; i++) {
      const isPad = padAt.includes(i);
      const w = isPad ? Math.max(40, 90 - S.level * 6) : U.rand(20, 50);
      S.pts.push([x, y]);
      if (isPad) { S.pads.push({ x1: x, x2: x + w, y, m: Math.max(2, Math.min(5, Math.round(140 / w))) }); x += w; S.pts.push([x, y]); }
      else x += w;
      y = U.clamp(y + U.rand(-90, 90) * (1 + S.level * 0.1), 300, 620);
    }
    S.stars = Array.from({ length: 90 }, () => [U.rand(960), U.rand(400)]);
  }
  S.L = { x: U.rand(100, 860), y: 60, vx: U.rand(-40, 40), vy: 0, a: 0 };
  S.state = 'fly'; S.msg = '';
}
