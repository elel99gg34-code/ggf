let S;
const W = 1000, H = 600;
GAME({
  title: '언덕 오르기 레이싱', w: W, h: H, bg: '#7dd3fc', controls: 'lr+ab', aLabel: '⛽', bLabel: '🛑',
  help: '→ / Space = 가속 · ← / X = 브레이크(후진)\n공중에서 가속·브레이크로 차체를 회전시켜 착지 각도를 맞춰요\n머리가 땅에 닿거나 ⛽ 연료가 떨어지면 끝 · 연료통과 🪙 코인을 모으세요\n멀리 갈수록 지형이 험해져요 · 공중 회전 묘기 보너스!',
  init(g) { S = { car: { x: 200, y: 200, vx: 0, vy: 0, a: 0, w: 0 }, fuel: 1, coins: 0, items: [], cam: 0, maxX: 0, air: 0, flips: 0, rot: 0, dead: false, wheels: [0, 0] }; gen(0, 4000); },
  update(g, dt) {
    if (S.dead) return;
    const C = S.car, gas = g.right || g.a || (g.mouse.down && g.mouse.x > W / 2), brk = g.left || g.b || (g.mouse.down && g.mouse.x <= W / 2);
    if (S.fuel <= 0 && Math.abs(C.vx) < 5) return die(g, '⛽ 연료 부족!');
    const sub = 8, h = dt / sub;
    let grounded = 0;
    for (let k = 0; k < sub; k++) {
      C.vy += 900 * h; C.x += C.vx * h; C.y += C.vy * h; C.a += C.w * h;
      C.w *= Math.pow(0.6, h);
      grounded = 0;
      for (const [ox, wi] of [[-45, 0], [45, 1]]) {
        const ca = Math.cos(C.a), sa = Math.sin(C.a), wx = C.x + ox * ca - 22 * sa, wy = C.y + ox * sa + 22 * ca, r = 18;
        const gy = ground(wx);
        if (wy + r > gy) {
          grounded++;
          const slope = Math.atan2(ground(wx + 2) - ground(wx - 2), 4), nx = -Math.sin(slope), ny = Math.cos(slope) * -1;
          const pen = wy + r - gy;
          C.y -= pen * 0.5; C.x += nx * pen * 0.1;
          const rx = wx - C.x, ry = wy - C.y, vpx = C.vx - C.w * ry, vpy = C.vy + C.w * rx;
          const vn = vpx * (-nx) * -1 + vpy * ny * -1;
          const nnx = Math.sin(slope), nny = -Math.cos(slope);
          const vdot = vpx * nnx + vpy * nny;
          if (vdot < 0) { const j = -vdot * 0.9; C.vx += nnx * j * 0.5; C.vy += nny * j * 0.5; C.w += (rx * nny - ry * nnx) * j * 0.00045; }
          const tx = Math.cos(slope), ty = Math.sin(slope);
          if (gas && S.fuel > 0) { C.vx += tx * 520 * h; C.vy += ty * 520 * h; }
          if (brk) { const vt = C.vx * tx + C.vy * ty; C.vx -= tx * Math.sign(vt || -1) * 420 * h; C.vy -= ty * Math.sign(vt || -1) * 420 * h; }
          C.vx *= 1 - 0.15 * h; S.wheels[wi] += (C.vx * tx + C.vy * ty) * h / r;
        }
      }
      if (!grounded) { if (gas) C.w -= 3.2 * h; if (brk) C.w += 3.2 * h; }
      // 머리 충돌
      const hx = C.x + 10 * Math.cos(C.a) + 30 * Math.sin(C.a), hy = C.y + 10 * Math.sin(C.a) - 30 * Math.cos(C.a);
      if (hy > ground(hx) - 4) return die(g, '💥 머리 충돌!');
    }
    if (gas && S.fuel > 0) S.fuel -= dt * 0.045; else S.fuel -= dt * 0.012;
    S.fuel = Math.max(0, S.fuel);
    if (!grounded) { S.air += dt; S.rot += C.w * dt; if (Math.abs(S.rot) > Math.PI * 2) { S.rot = 0; S.flips++; g.add(500); g.float(W / 2, 200, '🔄 공중 회전! +500', '#fde047', 30); g.sfx.power(); } }
    else { if (S.air > 1.2) { g.add(Math.floor(S.air * 50)); g.float(W / 2, 230, `에어타임 +${Math.floor(S.air * 50)}`, '#fff', 22); } S.air = 0; S.rot = 0; }
    if (C.x > S.genX - 1500) gen(S.genX, S.genX + 2000);
    for (const it of S.items) if (!it.got && U.dist(it.x, it.y, C.x, C.y) < 50) { it.got = true; if (it.k === '⛽') { S.fuel = 1; g.sfx.power(); g.float(W / 2, 150, '⛽ 연료 충전!', '#4ade80', 26); } else { S.coins += it.v; g.add(it.v); g.sfx.coin(); } }
    S.cam += (C.x - 300 - S.cam) * Math.min(1, dt * 5);
    S.maxX = Math.max(S.maxX, C.x);
    g.score = Math.floor(S.maxX / 10) + S.coins + S.flips * 500;
    g.info = `${Math.floor(S.maxX / 10)}m · 🪙${S.coins}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#38bdf8'); grd.addColorStop(1, '#e0f2fe'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const mx = ((i * 400 - S.cam * 0.2) % 2400 + 2400) % 2400 - 300; g.poly([[mx, 450], [mx + 200, 180], [mx + 400, 450]], '#94a3b8'); }
    const C = S.car, camY = Math.min(0, C.y - 250) * 0.8;
    c.save(); c.translate(-S.cam, -camY);
    c.fillStyle = '#65a30d'; c.beginPath(); c.moveTo(S.cam - 10, H + 600);
    for (let x = S.cam - 10; x <= S.cam + W + 10; x += 8) c.lineTo(x, ground(x));
    c.lineTo(S.cam + W + 10, H + 600); c.fill();
    c.strokeStyle = '#3f6212'; c.lineWidth = 8; c.beginPath(); for (let x = S.cam - 10; x <= S.cam + W + 10; x += 8) x === S.cam - 10 ? c.moveTo(x, ground(x) + 4) : c.lineTo(x, ground(x) + 4); c.stroke();
    for (let m = Math.ceil(S.cam / 1000) * 1000; m < S.cam + W; m += 1000) { g.rect(m - 2, ground(m) - 80, 4, 80, '#fff'); g.text(`${m / 10}m`, m, ground(m) - 92, 16, '#0f172a'); }
    for (const it of S.items) if (!it.got && it.x > S.cam - 50 && it.x < S.cam + W + 50) g.emoji(it.k === '⛽' ? '⛽' : '🪙', it.x, it.y, it.k === '⛽' ? 40 : 28);
    c.save(); c.translate(C.x, C.y); c.rotate(C.a);
    g.rrect(-62, -20, 124, 34, 10, '#dc2626', '#7f1d1d', 3); g.rrect(-20, -48, 52, 30, 8, '#bae6fd', '#7f1d1d', 3);
    g.emoji('👷', 6, -38, 30);
    for (const [ox, wi] of [[-45, 0], [45, 1]]) { c.save(); c.translate(ox, 22); c.rotate(S.wheels[wi]); g.circle(0, 0, 18, '#1f2937'); g.circle(0, 0, 8, '#9ca3af'); g.rect(-2, -16, 4, 32, '#4b5563'); c.restore(); }
    c.restore();
    c.restore();
    g.rrect(20, 20, 220, 26, 8, '#1e293b'); g.rrect(22, 22, 216 * S.fuel, 22, 6, S.fuel < 0.25 ? '#ef4444' : '#22c55e'); g.text('⛽ 연료', 130, 33, 13, '#fff');
    g.text(`${Math.floor(S.maxX / 10)}m`, W - 20, 34, 26, '#0f172a', 'right');
    g.text(`🪙 ${S.coins}`, W - 20, 66, 20, '#a16207', 'right');
  },
});
function gen(x0, x1) {
  if (!S.pts) { S.pts = []; S.genX = 0; }
  for (let x = S.genX; x <= x1; x += 40) {
    const d = Math.min(1, x / 30000);
    const y = 420 - Math.sin(x * 0.0021) * (60 + d * 120) - Math.sin(x * 0.0057 + 1) * (25 + d * 70) - Math.sin(x * 0.013) * (8 + d * 25) + (x < 600 ? 0 : 0);
    S.pts.push(x < 400 ? 420 : y);
    if (x > 600 && x % 1600 === 0) S.items.push({ x, y: y - 50, k: '⛽' });
    else if (x > 400 && Math.random() < 0.12) for (let k = 0; k < 4; k++) S.items.push({ x: x + k * 40, y: y - 40, k: 'c', v: x > 10000 ? 25 : x > 4000 ? 10 : 5 });
  }
  S.genX = x1 + 40;
}
function ground(x) { const i = Math.max(0, Math.floor(x / 40)), t = x / 40 - i; const a = S.pts[i] ?? 420, b = S.pts[i + 1] ?? a; return a + (b - a) * t; }
function die(g, msg) { S.dead = true; g.sfx.explode(); g.shake(12); g.burst(W / 2, H / 2, ['#f97316', '#fde047', '#111'], 40); g.later(() => g.over(`${Math.floor(S.maxX / 10)}m · ${msg}`), 1); }
