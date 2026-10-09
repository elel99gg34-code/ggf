let S;
GAME({
  title: '슈퍼 헥사곤', w: 900, h: 640, bg: '#000', controls: 'lr+ab', lower: false,
  help: '←→ (또는 화면 좌/우 터치) 로 중심을 도는 삼각형을 회전\n좁혀오는 벽의 빈틈으로 빠져나가세요\n10초마다 단계 상승 (점 → 선 → 삼각형 → 사각형 → 오각형 → 육각형!)\n점수 = 버틴 시간 (0.01초 단위)',
  init(g) { S = { a: 0, walls: [], rot: 0, rs: 1, spawn: 0, hue: 0, t: 0, flip: 6, dead: false, sides: 6, pulse: 0 }; },
  update(g, dt) {
    if (S.dead) return;
    S.t += dt;
    let dir = g.right - g.left;
    if (g.mouse.down) dir = g.mouse.x > g.W / 2 ? 1 : -1;
    const prevA = S.a;
    S.a += dir * 9.5 * dt;
    S.flip -= dt; if (S.flip <= 0) { S.flip = U.rand(3, 7); S.rs = -Math.sign(S.rs) * U.rand(1, 1.6 + S.t / 40); }
    S.rot += S.rs * dt * (1 + S.t / 60);
    S.hue = (S.hue + dt * 30) % 360;
    S.pulse = Math.max(0, S.pulse - dt * 4);
    const speed = 260 + S.t * 3.5;
    S.spawn -= dt;
    if (S.spawn <= 0) { pattern(); S.spawn = Math.max(0.55, 1.15 - S.t / 120); g.sfx.tone(110 + (S.t % 4) * 20, 0.08, 'square', 0.03); S.pulse = 1; }
    for (const w of S.walls) w.r -= speed * dt;
    S.walls = S.walls.filter((w) => w.r + w.th > 20);
    // 충돌: 플레이어는 반지름 70 위치, 각도 S.a (rot 기준)
    const seg = (((S.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / S.sides);
    const si = Math.floor(seg);
    const PR = 72;
    for (const w of S.walls) {
      if (PR + 4 > w.r && PR - 4 < w.r + w.th && w.side === si) {
        // 옆에서 밀려 들어간 경우 이전 각도로 되돌림
        const pseg = Math.floor((((prevA % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / S.sides));
        if (pseg !== si && dir) { S.a = prevA; continue; }
        S.dead = true; g.sfx.explode(); g.shake(16, 0.6); g.sfx.lose();
        return g.later(() => g.over(`${S.t.toFixed(2)}초 생존 · ${stage()}`), 0.8);
      }
    }
    g.score = Math.floor(S.t * 100);
    const st = Math.floor(S.t / 10);
    if (st !== S.lastSt) { S.lastSt = st; if (st > 0) { g.sfx.power(); S.msg = 1.5; } }
    S.msg = Math.max(0, (S.msg || 0) - dt);
    g.info = `${S.t.toFixed(2)}초 · ${stage()}`;
  },
  draw(g, c) {
    const cx = g.W / 2, cy = g.H / 2, n = S.sides, h = S.hue;
    c.save(); c.translate(cx, cy); c.rotate(S.rot); c.scale(1 + S.pulse * 0.03, (1 + S.pulse * 0.03) * 0.92);
    for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; g.poly([[0, 0], [Math.cos(a0) * 900, Math.sin(a0) * 900], [Math.cos(a1) * 900, Math.sin(a1) * 900]], i % 2 ? `hsl(${h},60%,10%)` : `hsl(${h},60%,15%)`); }
    for (const w of S.walls) {
      const a0 = (w.side / n) * Math.PI * 2, a1 = ((w.side + 1) / n) * Math.PI * 2, r0 = Math.max(0, w.r), r1 = w.r + w.th;
      g.poly([[Math.cos(a0) * r0, Math.sin(a0) * r0], [Math.cos(a1) * r0, Math.sin(a1) * r0], [Math.cos(a1) * r1, Math.sin(a1) * r1], [Math.cos(a0) * r1, Math.sin(a0) * r1]], `hsl(${h},90%,60%)`);
    }
    const hr = 48 + S.pulse * 4;
    g.poly(Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * hr, Math.sin((i / n) * Math.PI * 2) * hr]), `hsl(${h},60%,12%)`, `hsl(${h},90%,60%)`, 5);
    if (!S.dead) { const a = S.a, r = 72; c.save(); c.rotate(a); g.poly([[r + 10, 0], [r - 2, -8], [r - 2, 8]], `hsl(${h},90%,70%)`); c.restore(); }
    c.restore();
    g.rrect(g.W - 200, 14, 186, 44, 0, 'rgba(0,0,0,.6)');
    g.text(S.t.toFixed(2), g.W - 24, 36, 28, '#fff', 'right');
    g.text(stage(), 20, 30, 20, '#fff', 'left');
    if (S.msg > 0) g.text(stage().toUpperCase(), g.W / 2, 90, 48, `rgba(255,255,255,${Math.min(1, S.msg)})`);
  },
});
function stage() { return ['점 POINT', '선 LINE', '삼각형 TRIANGLE', '사각형 SQUARE', '오각형 PENTAGON', '육각형 HEXAGON'][Math.min(5, Math.floor(S.t / 10))]; }
function pattern() {
  const n = S.sides, R = 520, th = 26;
  const p = U.randi(0, S.t > 20 ? 4 : 2), off = U.randi(0, n - 1);
  if (p === 0) { for (let i = 0; i < n; i++) if (i !== off) S.walls.push({ side: i, r: R, th }); }
  else if (p === 1) { for (let i = 0; i < n; i += 2) S.walls.push({ side: (i + off) % n, r: R, th }); for (let i = 1; i < n; i += 2) S.walls.push({ side: (i + off) % n, r: R + 170, th }); }
  else if (p === 2) { for (let i = 0; i < n; i++) if (i !== off && i !== (off + 3) % n) S.walls.push({ side: i, r: R, th }); }
  else if (p === 3) { for (let k = 0; k < 4; k++) S.walls.push({ side: (off + k * (k % 2 ? 1 : 0) + Math.floor(k / 2) * 3) % n, r: R + k * 110, th }); for (let k = 0; k < 4; k++) for (let i = 0; i < n; i++) if (i % 2 === k % 2 && i !== (off + k) % n) S.walls.push({ side: i, r: R + k * 110, th: 20 }); }
  else { let s = off; for (let k = 0; k < 6; k++) { for (let i = 0; i < n; i++) if (i !== s) S.walls.push({ side: i, r: R + k * 140, th: 20 }); s = (s + U.choice([1, -1]) + n) % n; } S.spawn += 1.5; }
}
