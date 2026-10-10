let S;
const W = 1000, H = 600, GY = 520, GOALW = 70, GOALH = 190, R = 34, BR = 18;
const HEADS = ['🧑', '🐯', '🤖', '👽', '🐶', '🦁', '🐸', '👹'];
GAME({
  title: '헤드 사커', w: W, h: H, bg: '#38bdf8', controls: 'lr+ab', aLabel: '🦶', bLabel: '⤒',
  help: '←→ 이동 · ↑/X 점프 · Space 킥 (공을 높이 차올려요)\n머리로 헤딩하고 발로 차서 상대 골대에 넣으세요!\n⚡ Space를 꾹 눌러 게이지를 채운 뒤 차면 슈퍼킥!\n60초 경기 · 이기면 다음 상대 (점점 강해져요)',
  init(g) { S = { round: 0 }; nextMatch(); },
  update(g, dt) {
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0 && S.after) { const f = S.after; S.after = null; f(g); } return; }
    S.time -= dt;
    if (S.time <= 0) return endMatch(g);
    const me = S.me, ai = S.ai, b = S.ball;
    me.vx = (g.right - g.left) * 300;
    if ((g.pressed('up') || g.pressed('b')) && me.ground) me.vy = -620;
    if (g.pressed('a')) { me.kick = 0.2; S.charge = 0; }
    if (g.a) S.charge = Math.min(1, (S.charge || 0) + dt);
    // AI
    const lvl = 0.55 + S.round * 0.08;
    const tx = b.x + (b.x > ai.x ? -10 : 20) + 30, def = b.x > W * 0.55 || b.vx > 200;
    ai.vx = U.clamp((def ? Math.max(tx, b.x + 25) : W - 150) - ai.x, -1, 1) * 280 * lvl;
    if (b.y < GY - 120 && Math.abs(b.x - ai.x) < 90 && ai.ground && Math.random() < 0.06 * lvl * 2) ai.vy = -600;
    if (U.dist(b.x, b.y, ai.x - 30, ai.y + 30) < 60 && Math.random() < 0.15 * lvl) ai.kick = 0.2;
    for (const p of [me, ai]) { p.vy += 1500 * dt; p.x = U.clamp(p.x + p.vx * dt, GOALW + R, W - GOALW - R); p.y += p.vy * dt; p.ground = false; if (p.y > GY - R) { p.y = GY - R; p.vy = 0; p.ground = true; } p.kick -= dt; }
    // 공
    const sub = 4;
    for (let k = 0; k < sub; k++) {
      const h = dt / sub;
      b.vy += 900 * h; b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vx * h * 0.02;
      if (b.y > GY - BR) { b.y = GY - BR; b.vy = -Math.abs(b.vy) * 0.7; b.vx *= 0.98; }
      if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); }
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx) * 0.8; }
      // 골대 크로스바
      for (const gx of [GOALW, W - GOALW]) { if (Math.abs(b.x - gx) < BR + 4 && Math.abs(b.y - (GY - GOALH)) < 10) { b.vy = -Math.abs(b.vy) * 0.8; b.y = GY - GOALH - 10 - BR; } }
      if (b.y > GY - GOALH && (b.x < GOALW - 4 || b.x > W - GOALW + 4)) return goal(g, b.x < W / 2 ? 1 : 0);
      for (const [p, dir] of [[me, 1], [ai, -1]]) {
        const d = U.dist(b.x, b.y, p.x, p.y);
        if (d < R + BR) { const nx = (b.x - p.x) / d, ny = (b.y - p.y) / d; b.x = p.x + nx * (R + BR); b.y = p.y + ny * (R + BR); const rv = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny; if (rv < 0) { b.vx -= 1.7 * rv * nx; b.vy -= 1.7 * rv * ny; } b.vx += p.vx * 0.3; g.sfx.bounce(); }
        const fx = p.x + dir * 22, fy = p.y + R + 6;
        if (p.kick > 0 && U.dist(b.x, b.y, fx, fy) < BR + 26) { const sup = p === me && S.charge >= 1; b.vx = dir * (sup ? 1100 : 650); b.vy = sup ? -200 : -520; p.kick = 0; g.sfx.tone(sup ? 200 : 300, 0.1, 'square', 0.08); if (sup) { S.charge = 0; g.shake(8); g.burst(b.x, b.y, ['#f97316', '#fde047'], 30); } }
      }
      const sp = Math.hypot(b.vx, b.vy); if (sp > 1300) { b.vx *= 1300 / sp; b.vy *= 1300 / sp; }
    }
    g.info = `상대 ${S.round} · ${S.sc[0]} : ${S.sc[1]} · ⏱️${Math.ceil(S.time)}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#0ea5e9'); grd.addColorStop(1, '#bae6fd'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) g.circle(20 + i * 16.5, 120 + (i % 3) * 18, 9, `hsl(${(i * 53) % 360},60%,55%)`);
    g.rect(0, 160, W, 20, '#1e3a8a');
    g.rect(0, GY, W, H - GY, '#16a34a'); for (let x = 0; x < W; x += 80) g.rect(x, GY, 40, H - GY, '#15803d');
    g.line(W / 2, GY, W / 2, H, '#fff', 3);
    for (const [gx, side] of [[0, 1], [W - GOALW, -1]]) { g.rect(gx, GY - GOALH, GOALW, GOALH, 'rgba(255,255,255,.25)'); for (let y = GY - GOALH; y < GY; y += 14) g.line(gx, y, gx + GOALW, y, 'rgba(255,255,255,.5)', 1); for (let x = gx; x <= gx + GOALW; x += 14) g.line(x, GY - GOALH, x, GY, 'rgba(255,255,255,.5)', 1); g.rect(side > 0 ? gx + GOALW - 6 : gx, GY - GOALH, 6, GOALH, '#fff'); g.rect(gx, GY - GOALH - 6, GOALW, 8, '#fff'); }
    for (const [p, e, dir, col] of [[S.me, HEADS[0], 1, '#2563eb'], [S.ai, HEADS[S.round % HEADS.length + 1] || '🐯', -1, '#dc2626']]) {
      g.rrect(p.x - 14 + dir * (p.kick > 0 ? 18 : 6), p.y + R - 6, 28, 14, 7, col);
      c.save(); c.translate(p.x, p.y); c.scale(-dir, 1); g.emoji(e, 0, 0, R * 2.4); c.restore();
    }
    const b = S.ball; c.save(); c.translate(b.x, b.y); c.rotate(b.rot); g.emoji('⚽', 0, 0, BR * 2.3); c.restore();
    g.rrect(W / 2 - 120, 10, 240, 60, 12, 'rgba(15,23,42,.8)');
    g.text(`${S.sc[0]}  :  ${S.sc[1]}`, W / 2, 32, 30, '#fff'); g.text(`${Math.ceil(S.time)}`, W / 2, 58, 16, '#fde047');
    g.rect(20, 20, 160, 12, '#1e293b'); g.rect(20, 20, 160 * (S.charge || 0), 12, S.charge >= 1 ? '#f97316' : '#fde047'); g.text('⚡ 슈퍼킥', 20, 44, 13, '#0f172a', 'left');
    if (S.wait > 0 && S.msg) g.text(S.msg, W / 2, 260, 56, '#fff');
  },
});
function nextMatch() { S.round++; S.sc = [0, 0]; S.time = 60; S.charge = 0; kickoff(); S.wait = 1.5; S.msg = `상대 ${S.round}: ${HEADS[S.round % HEADS.length + 1] || '🐯'}`; }
function kickoff() { S.me = { x: 250, y: GY - R, vx: 0, vy: 0, ground: true, kick: 0 }; S.ai = { x: W - 250, y: GY - R, vx: 0, vy: 0, ground: true, kick: 0 }; S.ball = { x: W / 2, y: 200, vx: U.rand(-60, 60), vy: 0, rot: 0 }; }
function goal(g, who) {
  S.sc[who]++; g.shake(10);
  if (who === 0) { g.add(300); g.sfx.win(); S.msg = '⚽ 골!!!'; } else { g.sfx.lose(); S.msg = '실점...'; }
  S.wait = 1.6; S.after = () => kickoff();
}
function endMatch(g) {
  const [a, b] = S.sc;
  if (a > b) { g.add(1000 * S.round); S.msg = `승리! ${a}:${b}`; S.wait = 2; g.sfx.win(); S.after = () => nextMatch(); }
  else if (a === b) { S.msg = '동점! 골든골 30초'; S.time = 30; S.wait = 1.5; S.after = () => kickoff(); }
  else g.over(`상대 ${S.round}에게 ${a}:${b} 패배`);
}
