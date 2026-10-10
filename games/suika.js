let S;
const FR = [['🍒', 15], ['🍓', 21], ['🍇', 28], ['🍊', 34], ['🍋', 41], ['🍎', 50], ['🍐', 58], ['🍑', 66], ['🍍', 76], ['🍈', 88], ['🍉', 104]];
const BX = 230, BW = 440, BT = 120, BB = 840, LINE = 200;
GAME({
  title: '수박 게임', w: 900, h: 880, bg: '#fef3c7', controls: 'lr+ab', particleGravity: 300,
  help: '마우스(터치)로 위치를 정하고 클릭하면 과일이 떨어져요 (←→ + Space도 가능)\n같은 과일끼리 닿으면 합쳐져서 한 단계 큰 과일로!\n🍒 → 🍓 → 🍇 → 🍊 → 🍋 → 🍎 → 🍐 → 🍑 → 🍍 → 🍈 → 🍉\n빨간 선 위로 과일이 쌓이면 게임 오버 · 수박 두 개를 합치면 대박!',
  init(g) { S = { f: [], x: 450, cur: U.randi(0, 4), next: U.randi(0, 4), cd: 0, over: 0, id: 0, best: 0 }; },
  update(g, dt) {
    if (g.mouse.moved || g.mouse.down) S.x = g.mouse.x; g.mouse.moved = false;
    S.x += (g.right - g.left) * 500 * dt;
    const r = FR[S.cur][1]; S.x = U.clamp(S.x, BX + r, BX + BW - r);
    S.cd -= dt;
    if ((g.mouse.clicked || g.pressed('a')) && S.cd <= 0) { S.f.push({ id: S.id++, t: S.cur, x: S.x, y: BT - 20, vx: 0, vy: 0, r, age: 0 }); S.cur = S.next; S.next = U.randi(0, 4); S.cd = 0.5; g.sfx.tone(400, 0.05, 'sine', 0.06); }
    const sub = 6, h = dt / sub;
    for (let k = 0; k < sub; k++) {
      for (const f of S.f) { f.vy += 1400 * h; f.x += f.vx * h; f.y += f.vy * h; }
      for (let it = 0; it < 2; it++) {
        for (let i = 0; i < S.f.length; i++) for (let j = i + 1; j < S.f.length; j++) {
          const a = S.f[i], b = S.f[j]; if (a.dead || b.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = a.r + b.r;
          if (d < md && d > 0.01) {
            if (a.t === b.t && a.t < FR.length - 1) { merge(g, a, b); continue; }
            if (a.t === b.t && a.t === FR.length - 1) { a.dead = b.dead = true; g.add(3000, a.x, a.y); g.sfx.win(); g.burst((a.x + b.x) / 2, (a.y + b.y) / 2, ['#22c55e', '#ef4444', '#fde047'], 80, 500, 1.4); continue; }
            const nx = dx / d, ny = dy / d, ov = (md - d) / 2, ma = a.r * a.r, mb = b.r * b.r, tm = ma + mb;
            a.x -= nx * ov * (mb / tm) * 2; a.y -= ny * ov * (mb / tm) * 2; b.x += nx * ov * (ma / tm) * 2; b.y += ny * ov * (ma / tm) * 2;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const jn = (-1.2 * rv) / (1 / ma + 1 / mb); a.vx -= (jn / ma) * nx; a.vy -= (jn / ma) * ny; b.vx += (jn / mb) * nx; b.vy += (jn / mb) * ny; }
          }
        }
        for (const f of S.f) {
          if (f.x < BX + f.r) { f.x = BX + f.r; f.vx = Math.abs(f.vx) * 0.3; } if (f.x > BX + BW - f.r) { f.x = BX + BW - f.r; f.vx = -Math.abs(f.vx) * 0.3; }
          if (f.y > BB - f.r) { f.y = BB - f.r; f.vy = -Math.abs(f.vy) * 0.2; f.vx *= 0.96; }
        }
      }
      S.f = S.f.filter((f) => !f.dead);
    }
    for (const f of S.f) { f.vx *= Math.pow(0.6, dt); f.age += dt; }
    const danger = S.f.some((f) => f.age > 1.2 && f.y - f.r < LINE);
    S.over = danger ? S.over + dt : Math.max(0, S.over - dt * 2);
    if (S.over > 2) return g.over(`최고 과일 ${FR[S.best][0]}`);
    g.info = `최고 ${FR[S.best][0]}`;
  },
  draw(g, c) {
    g.rrect(BX - 14, BT - 30, BW + 28, BB - BT + 44, 18, '#fde68a', '#b45309', 6);
    g.rect(BX, BT - 20, BW, BB - BT + 20, '#fffbeb');
    c.setLineDash([12, 10]); g.line(BX, LINE, BX + BW, LINE, S.over > 0 ? `rgba(239,68,68,${0.5 + Math.sin(g.time * 20) * 0.5})` : 'rgba(239,68,68,.4)', 3); c.setLineDash([]);
    for (const f of S.f) { g.circle(f.x, f.y + 3, f.r, 'rgba(0,0,0,.08)'); g.emoji(FR[f.t][0], f.x, f.y, f.r * 2.05); }
    const r = FR[S.cur][1];
    c.setLineDash([4, 8]); g.line(S.x, 60, S.x, BB, 'rgba(180,83,9,.25)', 2); c.setLineDash([]);
    if (S.cd <= 0) g.emoji(FR[S.cur][0], S.x, 70, r * 2.05);
    g.text('다음', 790, 120, 18, '#92400e'); g.circle(790, 175, 40, '#fff'); g.emoji(FR[S.next][0], 790, 175, 50);
    g.text('진화 순서', 110, 140, 16, '#92400e');
    FR.forEach(([e], i) => { g.emoji(e, 70 + (i % 2) * 70, 190 + i * 55, 40); });
    g.text(g.score, 450, 40, 40, '#b45309');
  },
});
function merge(g, a, b) {
  a.dead = b.dead = true;
  const t = a.t + 1, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  S.f.push({ id: S.id++, t, x, y, vx: (a.vx + b.vx) / 2, vy: Math.min(a.vy, b.vy) - 60, r: FR[t][1], age: 2 });
  S.best = Math.max(S.best, t);
  const pts = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66][t] * 10;
  g.add(pts, x, y - 30);
  g.sfx.tone(300 + t * 70, 0.12, 'triangle', 0.08); g.burst(x, y, ['#fbbf24', '#fff'], 10 + t * 2, 200);
  if (t === FR.length - 1) { g.sfx.win(); g.float(450, 300, '🍉 수박 완성!!', '#16a34a', 50); g.shake(10); }
}
