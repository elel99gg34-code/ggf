let S;
const T = 24, GW = 30, GH = 28;
GAME({
  title: '지네 사냥', w: GW * T, h: GH * T, bg: '#050505', controls: 'dpad+ab', aLabel: '🔥',
  help: '방향키/WASD 또는 마우스로 이동 (화면 아래 영역)\nSpace/클릭 꾹 = 연사\n지네 머리 100 · 몸통 10 · 🕷️ 거미 300~900 · 버섯 1\n지네를 쏘면 버섯으로 변하고 둘로 갈라져요',
  init(g) {
    S = { p: { x: GW * T / 2, y: (GH - 2) * T }, shots: [], mush: U.grid(GW, GH, 0), segs: [], wave: 0, lives: 3, cool: 0, spider: null, flea: null, inv: 0 };
    for (let i = 0; i < 45; i++) S.mush[U.randi(1, GH - 6)][U.randi(GW)] = 4;
    nextWave();
  },
  update(g, dt) {
    const P = S.p;
    if (g.mouse.down || g.mouse.moved) { P.x += U.clamp(g.mouse.x - P.x, -500 * dt, 500 * dt); P.y += U.clamp(g.mouse.y - P.y, -500 * dt, 500 * dt); g.mouse.moved = false; }
    const nx = P.x + (g.right - g.left) * 300 * dt, ny = P.y + (g.down - g.up) * 300 * dt;
    const free = (x, y) => !S.mush[Math.floor(y / T)]?.[Math.floor(x / T)];
    if (free(nx, P.y)) P.x = nx; if (free(P.x, ny)) P.y = ny;
    P.x = U.clamp(P.x, 10, g.W - 10); P.y = U.clamp(P.y, (GH - 6) * T, g.H - 12);
    S.cool -= dt; S.inv -= dt;
    if ((g.a || g.mouse.down) && S.cool <= 0) { S.shots.push({ x: P.x, y: P.y - 10 }); S.cool = 0.09; g.sfx.tone(1200, 0.03, 'square', 0.02); }
    for (const s of S.shots) {
      s.y -= 900 * dt;
      const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T);
      if (cy >= 0 && S.mush[cy][cx]) { S.mush[cy][cx]--; s.dead = true; if (!S.mush[cy][cx]) g.add(1); g.sfx.tone(300, 0.03, 'square', 0.03); continue; }
      for (const sg of S.segs) if (!sg.dead && Math.abs(s.x - (sg.x * T + T / 2)) < 13 && Math.abs(s.y - (sg.y * T + T / 2)) < 13) {
        sg.dead = true; s.dead = true; g.add(sg.head ? 100 : 10, sg.x * T, sg.y * T); g.sfx.hit(); g.burst(sg.x * T + 12, sg.y * T + 12, '#4ade80', 10);
        if (sg.y >= 0 && sg.y < GH) S.mush[sg.y][sg.x] = 4;
        const i = S.segs.indexOf(sg); if (S.segs[i + 1]) S.segs[i + 1].head = true;
        break;
      }
      if (S.spider && !s.dead && U.dist(s.x, s.y, S.spider.x, S.spider.y) < 18) { const d = U.dist(P.x, P.y, S.spider.x, S.spider.y); const v = d < 80 ? 900 : d < 160 ? 600 : 300; g.add(v, S.spider.x, S.spider.y); g.burst(S.spider.x, S.spider.y, '#f472b6', 25); g.sfx.explode(); S.spider = null; s.dead = true; }
      if (S.flea && !s.dead && U.dist(s.x, s.y, S.flea.x, S.flea.y) < 14) { g.add(200, S.flea.x, S.flea.y); S.flea = null; s.dead = true; g.sfx.hit(); }
    }
    S.shots = S.shots.filter((s) => !s.dead && s.y > 0);
    S.segs = S.segs.filter((s) => !s.dead);
    // 지네 이동 (그리드 기반)
    S.stepT -= dt;
    if (S.stepT <= 0) {
      S.stepT = Math.max(0.025, 0.07 - S.wave * 0.004);
      for (const sg of S.segs) {
        const nx = sg.x + sg.dx;
        const blocked = nx < 0 || nx >= GW || (sg.y >= 0 && S.mush[sg.y][nx] && !sg.poison);
        if (blocked || sg.dive) {
          sg.y += sg.dy;
          if (sg.y >= GH - 1) { sg.dy = -1; sg.dive = false; } if (sg.y < GH - 6 && sg.dy < 0) sg.dy = 1;
          sg.dx = -sg.dx;
        } else sg.x = nx;
      }
    }
    // 거미
    if (!S.spider && Math.random() < dt * 0.15) S.spider = { x: Math.random() < 0.5 ? -10 : g.W + 10, y: (GH - 5) * T, vx: 0, vy: 0, t: 0 };
    if (S.spider) {
      const sp = S.spider; sp.t -= dt;
      if (sp.t <= 0) { sp.t = U.rand(0.3, 0.8); sp.vx = (sp.x < g.W / 2 ? 1 : -1) * U.rand(60, 160) * (Math.random() < 0.8 ? 1 : -1); sp.vy = U.rand(-200, 200); }
      sp.x += sp.vx * dt; sp.y = U.clamp(sp.y + sp.vy * dt, (GH - 8) * T, g.H - 12);
      const cx = Math.floor(sp.x / T), cy = Math.floor(sp.y / T);
      if (S.mush[cy] && S.mush[cy][cx] && Math.random() < 0.02) S.mush[cy][cx] = 0;
      if (sp.x < -30 || sp.x > g.W + 30) S.spider = null;
    }
    // 벼룩: 아래쪽 버섯이 적으면 떨어지며 버섯을 심음
    if (!S.flea && S.wave > 1 && Math.random() < dt * 0.1) S.flea = { x: U.randi(GW) * T + T / 2, y: 0 };
    if (S.flea) { S.flea.y += 300 * dt; const cy = Math.floor(S.flea.y / T); if (cy < GH - 1 && Math.random() < 0.06) S.mush[cy][Math.floor(S.flea.x / T)] = 4; if (S.flea.y > g.H) S.flea = null; }
    if (S.inv <= 0) {
      const hit = S.segs.some((sg) => U.dist(P.x, P.y, sg.x * T + 12, sg.y * T + 12) < 18) || (S.spider && U.dist(P.x, P.y, S.spider.x, S.spider.y) < 20) || (S.flea && U.dist(P.x, P.y, S.flea.x, S.flea.y) < 16);
      if (hit) {
        S.lives--; S.inv = 2; g.sfx.explode(); g.shake(12); g.burst(P.x, P.y, ['#fff', '#60a5fa'], 40);
        if (S.lives < 0) return g.over(`웨이브 ${S.wave}`);
        S.spider = null; S.segs.forEach((s) => { s.y = Math.min(s.y, 2); }); 
      }
    }
    if (!S.segs.length) nextWave();
    g.info = `웨이브 ${S.wave} · ❤️${Math.max(0, S.lives)}`;
  },
  draw(g, c) {
    g.rect(0, (GH - 6) * T, g.W, 6 * T, '#0b0b16');
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const m = S.mush[y][x]; if (!m) continue;
      const cx = x * T + T / 2, cy = y * T + T / 2, s = 0.5 + m * 0.125;
      g.rect(cx - 3, cy, 6, 9 * s, '#e5e7eb');
      c.fillStyle = U.hsl((S.wave * 50) % 360, 80, 55); c.beginPath(); c.arc(cx, cy + 1, 10 * s, Math.PI, 0); c.fill();
    }
    S.segs.forEach((sg) => {
      const x = sg.x * T + T / 2, y = sg.y * T + T / 2;
      g.circle(x, y, 11, sg.head ? '#ef4444' : '#22c55e'); g.circle(x - 3, y - 3, 4, sg.head ? '#fca5a5' : '#86efac');
      if (sg.head) { g.circle(x - 4, y - 2, 2.5, '#000'); g.circle(x + 4, y - 2, 2.5, '#000'); }
    });
    if (S.spider) g.emoji('🕷️', S.spider.x, S.spider.y, 30);
    if (S.flea) g.emoji('🦟', S.flea.x, S.flea.y, 24);
    S.shots.forEach((s) => g.rect(s.x - 1.5, s.y - 8, 3, 12, '#fde047'));
    if (S.inv <= 0 || Math.floor(g.time * 10) % 2) { g.circle(S.p.x, S.p.y, 10, '#60a5fa'); g.rect(S.p.x - 2, S.p.y - 16, 4, 10, '#bfdbfe'); }
  },
});
function nextWave() {
  S.wave++;
  const len = 12;
  S.segs = [];
  for (let i = 0; i < len; i++) S.segs.push({ x: GW / 2 - i - 1 + len, y: 0, dx: -1, dy: 1, head: i === 0 });
  S.segs.forEach((s, i) => (s.x = 14 + i));
  for (let k = 0; k < Math.min(S.wave - 1, 5); k++) S.segs.push({ x: U.randi(GW), y: 0, dx: U.choice([-1, 1]), dy: 1, head: true });
  S.stepT = 0.5;
  if (S.wave > 1) g_bonus();
}
function g_bonus() { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (S.mush[y][x] && S.mush[y][x] < 4) S.mush[y][x] = 4; }
