let S;
GAME({
  title: '스키 활강', w: 720, h: 860, bg: '#f8fafc', controls: 'lr+ab', aLabel: '⚡',
  help: '←→ 방향 전환 (기울일수록 느려지고, 정면일수록 빨라짐)\n🚩 깃발 사이(문)를 통과하면 +100, 놓치면 시간 -3초\n🌲 나무 · 🪨 바위 · ⛄ 눈사람에 부딪히면 넘어져요 · Space 점프로 바위 넘기\n90초 동안 최대한 멀리! 가끔 나타나는 🐻 예티를 조심',
  init(g) { S = { x: 360, a: 0, speed: 0, dist: 0, objs: [], gates: [], next: 200, gnext: 400, time: 90, fall: 0, jump: 0, trail: [], yeti: null, gatesPassed: 0 }; },
  update(g, dt) {
    S.time -= dt;
    if (S.time <= 0) return g.over(`${Math.floor(S.dist / 10)}m · 깃발 ${S.gatesPassed}개`);
    if (S.fall > 0) { S.fall -= dt; S.speed *= Math.pow(0.1, dt); return; }
    if (g.left) S.a = Math.max(-1.3, S.a - 3 * dt); if (g.right) S.a = Math.min(1.3, S.a + 3 * dt);
    if (g.mouse.down) S.a = U.clamp((g.mouse.x - S.x) / 150, -1.3, 1.3);
    const target = 520 * Math.cos(S.a) + 60;
    S.speed += (target - S.speed) * dt * (target > S.speed ? 0.8 : 3);
    if (g.pressed('a') && S.jump <= 0) { S.jump = 0.6; g.sfx.jump(); }
    S.jump -= dt;
    const vx = Math.sin(S.a) * S.speed, vy = Math.cos(S.a) * S.speed;
    S.x = U.clamp(S.x + vx * dt, 20, 700);
    const dy = vy * dt;
    S.dist += dy;
    g.score = Math.floor(S.dist / 10) + S.gatesPassed * 100;
    for (const o of S.objs) o.y -= dy; for (const gt of S.gates) gt.y -= dy;
    S.trail.forEach((t) => (t.y -= dy)); S.trail.push({ x: S.x, y: 260 }); if (S.trail.length > 80) S.trail.shift();
    S.next -= dy; S.gnext -= dy;
    while (S.next < 0) { S.next += U.rand(30, 90) * Math.max(0.5, 1 - S.dist / 40000); const r = Math.random(); S.objs.push({ x: U.rand(20, 700), y: 900, e: r < 0.6 ? '🌲' : r < 0.85 ? '🪨' : '⛄' }); }
    while (S.gnext < 0) { S.gnext += U.rand(350, 500); const w = Math.max(110, 200 - S.dist / 400); const cx = U.rand(120, 600); S.gates.push({ x1: cx - w / 2, x2: cx + w / 2, y: 900, done: false }); S.objs = S.objs.filter((o) => !(o.y > 860 && o.x > cx - w / 2 - 30 && o.x < cx + w / 2 + 30)); }
    for (const o of S.objs) if (!o.hit && Math.abs(o.x - S.x) < 22 && Math.abs(o.y - 260) < 18) { if (o.e === '🪨' && S.jump > 0) continue; o.hit = true; S.fall = 1.2; S.speed = 0; g.sfx.hit(); g.shake(8); g.burst(S.x, 260, '#e2e8f0', 20); }
    for (const gt of S.gates) if (!gt.done && gt.y < 260) { gt.done = true; if (S.x > gt.x1 && S.x < gt.x2) { S.gatesPassed++; g.sfx.coin(); g.float(S.x, 230, '+100', '#22c55e'); } else { S.time -= 3; g.sfx.hit(); g.float(S.x, 230, '-3초', '#ef4444'); } }
    S.objs = S.objs.filter((o) => o.y > -40); S.gates = S.gates.filter((gt) => gt.y > -40);
    if (!S.yeti && S.dist > 6000 && Math.random() < dt * 0.04) S.yeti = { x: U.choice([-40, 760]), y: -60 };
    if (S.yeti) { const a = U.angle(S.yeti.x, S.yeti.y, S.x, 260); S.yeti.x += Math.cos(a) * 300 * dt; S.yeti.y += Math.sin(a) * 300 * dt - dy * 0.3; if (U.dist(S.yeti.x, S.yeti.y, S.x, 260) < 30) { S.yeti = null; S.time -= 10; S.fall = 2; g.sfx.lose(); g.float(S.x, 220, '🐻 예티에게 잡혔다! -10초', '#ef4444', 24); } else if (S.yeti.y < -200) S.yeti = null; }
    g.info = `⏱️ ${Math.ceil(S.time)} · ${Math.floor(S.dist / 10)}m · 🚩${S.gatesPassed}`;
  },
  draw(g, c) {
    c.globalAlpha = 0.5; for (let i = 1; i < S.trail.length; i++) { const a = S.trail[i - 1], b = S.trail[i]; g.line(a.x - 5, a.y, b.x - 5, b.y, '#cbd5e1', 2); g.line(a.x + 5, a.y, b.x + 5, b.y, '#cbd5e1', 2); } c.globalAlpha = 1;
    for (const gt of S.gates) { g.emoji('🚩', gt.x1, gt.y, 36); g.emoji('🚩', gt.x2, gt.y, 36); if (!gt.done) { c.setLineDash([6, 8]); g.line(gt.x1, gt.y + 14, gt.x2, gt.y + 14, 'rgba(239,68,68,.3)', 2); c.setLineDash([]); } }
    const items = [...S.objs, { e: 'P', y: 260 }, ...(S.yeti ? [{ e: '🐻‍❄️', x: S.yeti.x, y: S.yeti.y }] : [])].sort((a, b) => a.y - b.y);
    for (const o of items) {
      if (o.e === 'P') { c.save(); c.translate(S.x, 260 - (S.jump > 0 ? Math.sin((S.jump / 0.6) * Math.PI) * 26 : 0)); c.rotate(S.fall > 0 ? Math.PI / 2 : -S.a * 0.6); g.emoji('⛷️', 0, 0, 52); c.restore(); }
      else g.emoji(o.e, o.x, o.y - 10, o.e === '🌲' ? 52 : 40);
    }
    g.text(Math.ceil(S.time), g.W / 2, 40, 40, S.time < 10 ? '#ef4444' : '#1e293b');
    g.text(`${Math.floor(S.dist / 10)}m`, g.W - 20, 36, 22, '#1e293b', 'right');
  },
});
