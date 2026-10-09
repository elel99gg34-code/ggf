let S;
const W = 560, H = 880, GW = 180, MR = 36, PRr = 24;
GAME({
  title: '에어하키', w: W, h: H, bg: '#0b1120', controls: 'none',
  help: '마우스/터치로 아래쪽 말렛을 움직여 퍽을 쳐라\n빠르게 휘두를수록 강한 샷!\n벽 반사를 이용해 골을 노려라 · 7점 선승\nAI는 점점 강해져요',
  init(g) { S = { me: { x: W / 2, y: H - 120, vx: 0, vy: 0 }, ai: { x: W / 2, y: 120, vx: 0, vy: 0 }, puck: null, sc: [0, 0], wait: 1, lvl: 1 }; serve(1); },
  update(g, dt) {
    const m = S.me, a = S.ai, p = S.puck;
    const tx = U.clamp(g.mouse.x, MR, W - MR), ty = U.clamp(g.mouse.y, H / 2 + MR, H - MR);
    const kx = (g.right - g.left) * 600 * dt, ky = (g.down - g.up) * 600 * dt;
    const nx = kx || ky ? U.clamp(m.x + kx, MR, W - MR) : tx, ny = kx || ky ? U.clamp(m.y + ky, H / 2 + MR, H - MR) : ty;
    m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny;
    if (S.wait > 0) { S.wait -= dt; return; }
    // AI
    const skill = 0.55 + S.sc[1] * 0.04 + S.sc[0] * 0.05;
    let gx, gy;
    if (p.y < H / 2) { gx = p.x + (p.vx * 0.05); gy = p.y < a.y + 10 ? p.y - 60 : p.y - 20; if (p.vy > 300 && p.y > a.y) { gy = 120; gx = p.x; } }
    else { gx = W / 2 + (p.x - W / 2) * 0.4; gy = 110; }
    const sp = 520 * skill;
    const dx = U.clamp(gx - a.x, -sp * dt, sp * dt), dy = U.clamp(gy - a.y, -sp * dt, sp * dt);
    a.vx = dx / dt; a.vy = dy / dt; a.x = U.clamp(a.x + dx, MR, W - MR); a.y = U.clamp(a.y + dy, MR, H / 2 - MR);
    const sub = 6;
    for (let i = 0; i < sub; i++) {
      const h = dt / sub;
      p.x += p.vx * h; p.y += p.vy * h;
      if (p.x < PRr) { p.x = PRr; p.vx = Math.abs(p.vx) * 0.92; g.sfx.bounce(); } if (p.x > W - PRr) { p.x = W - PRr; p.vx = -Math.abs(p.vx) * 0.92; g.sfx.bounce(); }
      const inGoal = Math.abs(p.x - W / 2) < GW / 2;
      if (p.y < PRr && !inGoal) { p.y = PRr; p.vy = Math.abs(p.vy) * 0.92; g.sfx.bounce(); }
      if (p.y > H - PRr && !inGoal) { p.y = H - PRr; p.vy = -Math.abs(p.vy) * 0.92; g.sfx.bounce(); }
      for (const ml of [m, a]) {
        const d = U.dist(p.x, p.y, ml.x, ml.y);
        if (d < MR + PRr && d > 0) {
          const nx2 = (p.x - ml.x) / d, ny2 = (p.y - ml.y) / d;
          p.x = ml.x + nx2 * (MR + PRr); p.y = ml.y + ny2 * (MR + PRr);
          const rv = (p.vx - ml.vx) * nx2 + (p.vy - ml.vy) * ny2;
          if (rv < 0) { p.vx -= 1.9 * rv * nx2; p.vy -= 1.9 * rv * ny2; g.sfx.tone(300, 0.04, 'square', 0.06); g.burst(p.x, p.y, '#fff', 4, 120, 0.2); }
        }
      }
      const spd = Math.hypot(p.vx, p.vy); if (spd > 1700) { p.vx *= 1700 / spd; p.vy *= 1700 / spd; }
      if (p.y < -PRr) return goal(g, 0);
      if (p.y > H + PRr) return goal(g, 1);
    }
    p.vx *= Math.pow(0.85, dt); p.vy *= Math.pow(0.85, dt);
    S.trail.push({ x: p.x, y: p.y }); if (S.trail.length > 12) S.trail.shift();
    g.info = `${S.sc[0]} : ${S.sc[1]}`;
  },
  draw(g, c) {
    g.rrect(4, 4, W - 8, H - 8, 30, '#e0f2fe', '#38bdf8', 8);
    g.line(20, H / 2, W - 20, H / 2, '#f43f5e', 4); g.ring(W / 2, H / 2, 70, '#f43f5e', 4);
    g.ring(W / 2, 0, 110, '#3b82f6', 4); g.ring(W / 2, H, 110, '#3b82f6', 4);
    g.rect(W / 2 - GW / 2, 0, GW, 10, '#0f172a'); g.rect(W / 2 - GW / 2, H - 10, GW, 10, '#0f172a');
    for (let x = 30; x < W; x += 40) for (let y = 30; y < H; y += 40) g.circle(x, y, 1.5, '#bae6fd');
    S.trail.forEach((t, i) => g.circle(t.x, t.y, PRr * (i / S.trail.length), `rgba(15,23,42,${(i / S.trail.length) * 0.15})`));
    const P = S.puck; g.circle(P.x + 3, P.y + 4, PRr, 'rgba(0,0,0,.2)'); g.circle(P.x, P.y, PRr, '#111827'); g.ring(P.x, P.y, PRr - 6, '#374151', 3);
    for (const [ml, col] of [[S.me, '#2563eb'], [S.ai, '#dc2626']]) { g.circle(ml.x + 3, ml.y + 5, MR, 'rgba(0,0,0,.2)'); g.circle(ml.x, ml.y, MR, col); g.circle(ml.x, ml.y, MR * 0.55, 'rgba(255,255,255,.35)'); g.circle(ml.x, ml.y, MR * 0.35, col); }
    g.text(S.sc[1], W - 40, H / 2 - 40, 44, 'rgba(220,38,38,.6)'); g.text(S.sc[0], W - 40, H / 2 + 40, 44, 'rgba(37,99,235,.6)');
    if (S.msg && S.wait > 0) g.text(S.msg, W / 2, H / 2 - 120, 40, '#0f172a');
  },
});
function serve(toward) { S.puck = { x: W / 2, y: H / 2 + toward * 80, vx: 0, vy: 0 }; S.trail = []; S.wait = 1; }
function goal(g, who) {
  S.sc[who]++; g.shake(10);
  if (who === 0) { g.add(500); g.sfx.coin(); S.msg = '골!!'; } else { g.sfx.hit(); S.msg = 'AI 득점'; }
  if (S.sc[0] >= 7) { g.add(2000 - S.sc[1] * 200); return g.win(`${S.sc[0]} : ${S.sc[1]} 승리!`); }
  if (S.sc[1] >= 7) return g.over(`${S.sc[0]} : ${S.sc[1]} 패배`);
  serve(who === 0 ? -1 : 1); S.wait = 1.2;
}
