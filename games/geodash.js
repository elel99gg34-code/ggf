let S;
const G0 = 460, BS = 40;
GAME({
  title: '지오메트리 대시', w: 1000, h: 560, bg: '#1e1b4b', controls: 'none',
  help: 'Space/↑/클릭 = 점프 (누르고 있으면 착지 즉시 재점프)\n가시(▲)에 닿거나 블록 옆면에 부딪히면 실패\n블록 위는 밟고 달릴 수 있어요 · 🟡 점프 패드 · ⭕ 공중 점프 링\n진행률 100%를 노려라! 레벨이 끝나면 더 어려운 다음 레벨',
  init(g) { S = { lvl: 0, attempts: 0 }; build(); reset(); },
  update(g, dt) {
    const P = S.p;
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) { S.attempts++; if (S.attempts >= 5) return g.over(`레벨 ${S.lvl + 1} · 최고 진행률 ${Math.round(S.bestPct)}%`); reset(); } return; }
    const hold = g.a || g.up || g.mouse.down, press = g.pressed('a') || g.pressed('up') || g.mouse.clicked;
    const sp = 420 + S.lvl * 40;
    S.x += sp * dt;
    P.vy += 2600 * dt; P.y += P.vy * dt;
    let grounded = false;
    const px = S.x + 200;
    if (P.y >= G0 - BS) { P.y = G0 - BS; P.vy = 0; grounded = true; }
    for (const o of S.objs) {
      if (o.x > px + 60 || o.x + o.w < px - 60) continue;
      if (o.k === 'block') {
        if (px + BS > o.x + 4 && px < o.x + o.w - 4) {
          if (P.y + BS > o.y && P.y + BS - P.vy * dt <= o.y + 10 && P.vy >= 0) { P.y = o.y - BS; P.vy = 0; grounded = true; }
          else if (P.y + BS > o.y + 8 && P.y < o.y + o.h) return die(g);
        }
      } else if (o.k === 'spike') {
        const cx = o.x + o.w / 2;
        if (Math.abs(px + BS / 2 - cx) < o.w / 2 - 4 && P.y + BS > o.y + o.h * 0.35 && P.y < o.y + o.h) return die(g);
      } else if (o.k === 'pad') { if (px + BS > o.x && px < o.x + o.w && P.y + BS >= o.y - 4) { P.vy = -1250; g.sfx.power(); } }
      else if (o.k === 'ring') { if (U.dist(px + BS / 2, P.y + BS / 2, o.x + 20, o.y + 20) < 45 && press && !o.used) { o.used = true; P.vy = -880; g.sfx.jump(); } }
    }
    if (grounded) { P.rot = Math.round(P.rot / (Math.PI / 2)) * (Math.PI / 2); if (hold) { P.vy = -880; g.sfx.tone(500, 0.04, 'square', 0.03); } }
    else P.rot += 7 * dt;
    if (grounded && g.frame % 3 === 0) g.burst(200 + 4, P.y + BS, S.col, 2, 80, 0.3);
    const pct = Math.min(100, (S.x / S.len) * 100);
    S.bestPct = Math.max(S.bestPct, pct);
    g.score = S.lvlScore + Math.round(S.bestPct * 10);
    S.beat += dt;
    if (S.beat > 60 / 128) { S.beat -= 60 / 128; S.pulse = 1; g.sfx.tone(S.notes[S.ni++ % S.notes.length], 0.1, 'triangle', 0.025); }
    S.pulse = Math.max(0, S.pulse - dt * 3);
    if (pct >= 100) { S.lvlScore += 1000 * (S.lvl + 1) + (5 - S.attempts) * 200; g.sfx.win(); S.lvl++; S.attempts = 0; S.bestPct = 0; build(); reset(); g.float(500, 200, `레벨 ${S.lvl} 클리어!`, '#fde047', 40); }
    g.info = `레벨 ${S.lvl + 1} · 시도 ${S.attempts + 1}/5 · ${Math.floor(pct)}%`;
  },
  draw(g, c) {
    const hue = (S.lvl * 70 + 230) % 360;
    const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, `hsl(${hue},60%,${18 + S.pulse * 6}%)`); grd.addColorStop(1, `hsl(${hue + 40},60%,8%)`); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 12; i++) { const x = ((i * 120 - S.x * 0.2) % 1440 + 1440) % 1440 - 120; g.rect(x, 140 + (i % 3) * 60, 80, 400, `hsla(${hue},60%,30%,.25)`); }
    c.save(); c.translate(200 - S.x, 0);
    for (const o of S.objs) {
      if (o.x > S.x + 1100 || o.x + o.w < S.x - 300) continue;
      if (o.k === 'block') { g.rect(o.x, o.y, o.w, o.h, '#0f0f23'); g.stroke(o.x + 2, o.y + 2, o.w - 4, o.h - 4, `hsl(${hue},90%,65%)`, 3); }
      if (o.k === 'spike') g.poly([[o.x + 2, o.y + o.h], [o.x + o.w / 2, o.y], [o.x + o.w - 2, o.y + o.h]], '#0f0f23', '#fff', 2.5);
      if (o.k === 'pad') g.rrect(o.x, o.y - 8, o.w, 8, 4, '#facc15');
      if (o.k === 'ring') g.ring(o.x + 20, o.y + 20, 18 + S.pulse * 4, o.used ? '#555' : '#facc15', 4);
    }
    c.restore();
    g.rect(0, G0, g.W, g.H - G0, `hsl(${hue},50%,14%)`); g.line(0, G0, g.W, G0, '#fff', 2);
    const P = S.p;
    if (!(S.dead > 0)) { c.save(); c.translate(200 + BS / 2, P.y + BS / 2); c.rotate(P.rot); g.rect(-BS / 2, -BS / 2, BS, BS, S.col); g.stroke(-BS / 2 + 3, -BS / 2 + 3, BS - 6, BS - 6, '#fff', 3); g.rect(-8, -8, 16, 16, '#fff'); c.restore(); }
    const pct = Math.min(1, S.x / S.len);
    g.rrect(250, 18, 500, 12, 6, 'rgba(255,255,255,.2)'); g.rrect(250, 18, 500 * pct, 12, 6, '#4ade80');
    g.text(`${Math.floor(pct * 100)}%`, 770, 25, 14, '#fff', 'left');
    if (S.x < 300) g.text(`LEVEL ${S.lvl + 1}${S.attempts ? ` · 시도 ${S.attempts + 1}` : ''}`, 500, 200, 40, '#fff');
  },
});
function build() {
  const objs = [];
  let x = 900;
  const L = S.lvl, R = (() => { let s = 1234 + L * 77; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const len = 9000 + L * 2500;
  while (x < len) {
    const r = R(), d = Math.min(1, L * 0.25 + x / len * 0.4);
    if (r < 0.22) { const n = 1 + (R() < d * 0.6 ? 1 : 0) + (R() < d * 0.3 ? 1 : 0); for (let i = 0; i < n; i++) objs.push({ k: 'spike', x: x + i * BS, y: G0 - BS, w: BS, h: BS }); x += n * BS + 300; }
    else if (r < 0.42) { const h = 1 + Math.floor(R() * 2), w = 2 + Math.floor(R() * 4); objs.push({ k: 'block', x, y: G0 - h * BS, w: w * BS, h: h * BS }); if (R() < 0.5 + d * 0.3) objs.push({ k: 'spike', x: x + w * BS, y: G0 - BS, w: BS, h: BS }); x += w * BS + 260; }
    else if (r < 0.58) { let sx = x; for (let i = 0; i < 3; i++) { objs.push({ k: 'block', x: sx, y: G0 - (i + 1) * BS, w: BS * 2, h: (i + 1) * BS }); sx += BS * 2 + (i < 2 ? 140 : 0); } objs.push({ k: 'spike', x: sx + 40, y: G0 - BS, w: BS, h: BS }); objs.push({ k: 'spike', x: sx + 80, y: G0 - BS, w: BS, h: BS }); x = sx + 360; }
    else if (r < 0.7) { objs.push({ k: 'pad', x, y: G0, w: BS, h: 8 }); for (let i = 0; i < 4; i++) objs.push({ k: 'spike', x: x + 120 + i * BS, y: G0 - BS, w: BS, h: BS }); x += 520; }
    else if (r < 0.8 && L > 0) { for (let i = 0; i < 5; i++) objs.push({ k: 'spike', x: x + i * BS, y: G0 - BS, w: BS, h: BS }); objs.push({ k: 'ring', x: x + BS * 1.5, y: G0 - 190 }); x += 5 * BS + 320; }
    else { objs.push({ k: 'block', x, y: G0 - 140, w: BS * 4, h: BS }); objs.push({ k: 'spike', x: x + BS, y: G0 - BS, w: BS, h: BS }); objs.push({ k: 'spike', x: x + BS * 2, y: G0 - BS, w: BS, h: BS }); x += BS * 4 + 280; }
  }
  S.objs = objs; S.len = x + 400; S.lvlScore = S.lvlScore || 0; S.bestPct = 0;
  S.col = ['#facc15', '#22d3ee', '#f472b6', '#4ade80', '#fb923c'][L % 5];
  S.notes = [262, 330, 392, 523, 392, 330, 294, 349].map((f) => f * (1 + (L % 3) * 0.12));
}
function reset() { S.x = 0; S.p = { y: G0 - BS, vy: 0, rot: 0 }; S.dead = 0; S.beat = 0; S.pulse = 0; S.ni = 0; S.objs.forEach((o) => (o.used = false)); }
function die(g) { S.dead = 1; g.sfx.explode(); g.shake(10); g.burst(220, S.p.y + 20, [S.col, '#fff'], 40, 400); }
