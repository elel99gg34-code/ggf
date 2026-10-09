let S;
GAME({
  title: '양궁', w: 960, h: 640, bg: '#7dd3fc', controls: 'none',
  help: '마우스를 누르고 있으면 활시위를 당겨요 (조준점이 흔들림)\n바람(🚩)을 계산해서 조준점을 반대로 보정하세요!\n떼면 발사 · 숨을 참으면(Space 꾹) 흔들림 감소 (5초 제한)\n10발 · 과녁 거리가 점점 멀어져요 (X = 정중앙 10점)',
  init(g) { S = { shot: 0, arrows: [], phase: 'aim', wind: 0, draw: 0, hold: 5, sway: 0, fly: null, total: 0, dist: 30, x10: 0 }; newShot(); },
  update(g, dt) {
    S.sway += dt;
    if (S.phase === 'aim') {
      const breath = g.a && S.hold > 0;
      if (breath) S.hold = Math.max(0, S.hold - dt); else S.hold = Math.min(5, S.hold + dt * 0.5);
      const amp = (breath ? 4 : 14) * (1 + S.shot * 0.06) * (S.hold <= 0 ? 2 : 1);
      S.ax = g.mouse.x + Math.sin(S.sway * 1.7) * amp + Math.sin(S.sway * 4.3) * amp * 0.4;
      S.ay = g.mouse.y + Math.cos(S.sway * 1.3) * amp + Math.sin(S.sway * 3.1) * amp * 0.4;
      if (g.mouse.down) S.draw = Math.min(1, S.draw + dt * 1.2); else if (S.draw > 0) {
        if (S.draw >= 0.6) {
          const k = S.dist / 30;
          const tx = S.ax + S.wind * 9 * k + U.rand(-3, 3) * (1 - S.draw + 0.3), ty = S.ay + (1 - S.draw) * 80 * k + 6 * k;
          S.fly = { sx: 480, sy: 600, tx, ty, t: 0 }; S.phase = 'fly'; g.sfx.tone(500, 0.12, 'triangle', 0.06, 1200);
        }
        S.draw = 0;
      }
    } else if (S.phase === 'fly') {
      S.fly.t += dt / (0.35 + S.dist / 200);
      if (S.fly.t >= 1) {
        const { tx, ty } = S.fly, d = U.dist(tx, ty, 480, 260), R = targetR();
        const ring = d <= R ? Math.max(1, 10 - Math.floor((d / R) * 10)) : 0;
        const X = d <= R * 0.05;
        S.arrows.push({ x: tx, y: ty, score: ring, X });
        g.add(ring * 10 + (X ? 20 : 0)); S.total += ring; if (X) S.x10++;
        S.msg = ring ? (X ? '✨ X 텐!!' : `${ring}점`) : '빗나감...'; S.phase = 'show'; S.wait = 1.5;
        ring >= 9 ? g.sfx.win() : ring ? g.sfx.hit() : g.sfx.lose();
        if (ring === 10) g.shake(4);
      }
    } else if (S.phase === 'show') {
      S.wait -= dt;
      if (S.wait <= 0) { S.shot++; if (S.shot >= 10) return g.win(`총점 ${S.total}점 · X ${S.x10}개`); newShot(); }
    }
    g.info = `${S.shot + 1}/10발 · ${S.dist}m · 합계 ${S.total}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, 640); grd.addColorStop(0, '#38bdf8'); grd.addColorStop(0.6, '#bae6fd'); grd.addColorStop(0.6, '#4ade80'); grd.addColorStop(1, '#16a34a'); c.fillStyle = grd; c.fillRect(0, 0, 960, 640);
    for (let i = 0; i < 5; i++) g.emoji('☁️', ((i * 230 + S.sway * S.wind * 6) % 1200 + 1200) % 1200 - 120, 60 + (i % 2) * 40, 60);
    const R = targetR(), cols = ['#f8fafc', '#f8fafc', '#111827', '#111827', '#3b82f6', '#3b82f6', '#ef4444', '#ef4444', '#facc15', '#facc15'];
    g.rect(470, 260, 20, 120, '#78350f');
    for (let i = 0; i < 10; i++) { g.circle(480, 260, R * (1 - i / 10), cols[i]); g.ring(480, 260, R * (1 - i / 10), i === 2 || i === 3 ? '#fff' : '#111', 1); }
    g.ring(480, 260, R * 0.05, '#111', 1);
    for (const a of S.arrows.slice(-10)) { g.line(a.x, a.y, a.x + 6, a.y + 10, '#78350f', 2); g.circle(a.x, a.y, 2.5, '#111'); }
    g.rrect(20, 20, 210, 70, 10, 'rgba(0,0,0,.45)');
    g.emoji('🚩', 46, 55, 34);
    g.text(`바람 ${Math.abs(S.wind).toFixed(1)} m/s ${S.wind > 0 ? '→' : S.wind < 0 ? '←' : ''}`, 70, 45, 16, '#fff', 'left');
    g.rect(70, 62, 140, 8, '#334155'); g.rect(140, 62, S.wind * 14, 8, '#38bdf8');
    if (S.phase === 'aim') {
      const s = 1 + S.draw;
      g.ring(S.ax, S.ay, 14 * s, 'rgba(0,0,0,.8)', 2); g.line(S.ax - 22, S.ay, S.ax + 22, S.ay, 'rgba(0,0,0,.8)', 1.5); g.line(S.ax, S.ay - 22, S.ax, S.ay + 22, 'rgba(0,0,0,.8)', 1.5); g.circle(S.ax, S.ay, 2, '#ef4444');
      g.rrect(380, 600, 200, 14, 7, '#1e293b'); g.rrect(380, 600, 200 * S.draw, 14, 7, S.draw >= 0.6 ? '#22c55e' : '#f59e0b');
      g.text('숨 참기', 600, 607, 12, '#0f172a', 'left'); g.rect(650, 602, 80, 10, '#1e293b'); g.rect(650, 602, 16 * S.hold, 10, '#a78bfa');
    }
    if (S.fly) { const k = S.fly.t, x = U.lerp(S.fly.sx, S.fly.tx, k), y = U.lerp(S.fly.sy, S.fly.ty, k) - Math.sin(k * Math.PI) * 40, sz = U.lerp(60, 8, k); if (S.phase === 'fly') { c.save(); c.translate(x, y); g.line(0, 0, 0, sz, '#78350f', Math.max(1, sz / 12)); g.poly([[0, -6], [-4, 2], [4, 2]], '#6b7280'); c.restore(); } }
    if (S.phase === 'show') g.text(S.msg, 480, 470, 50, '#fff');
    g.text(`${S.dist}m`, 480, 420, 18, '#14532d');
  },
});
function targetR() { return 150 * (30 / S.dist); }
function newShot() { S.phase = 'aim'; S.fly = null; S.dist = [30, 30, 40, 40, 50, 50, 60, 60, 70, 70][S.shot]; S.wind = U.rand(-1, 1) * (1 + S.shot * 0.35); S.hold = 5; }
