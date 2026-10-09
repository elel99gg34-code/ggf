let S;
const TX = 70, TY = 90, TW = 860, TH = 430, R = 11, PR = 22;
const BCOL = ['#fff', '#facc15', '#2563eb', '#dc2626', '#7c3aed', '#f97316', '#16a34a', '#7f1d1d', '#111', '#facc15', '#2563eb', '#dc2626', '#7c3aed', '#f97316', '#16a34a', '#7f1d1d'];
GAME({
  title: '8볼 당구', w: 1000, h: 600, bg: '#1c1917', controls: 'none',
  help: '마우스로 조준 → 꾹 누르면 파워 게이지 → 떼면 샷!\n먼저 넣은 쪽(단색 1~7 / 줄무늬 9~15)이 내 그룹\n내 그룹을 다 넣고 마지막에 8번을 넣으면 승리\n흰 공이 빠지거나 8번을 일찍 넣으면 반칙 / 패배',
  init(g) { S = { turn: 0, group: [null, null], balls: [], charge: 0, charging: false, moving: false, msg: '', aiT: 0, pocketed: [], wins: 0, first: null, shotBy: 0 }; rack(); S.msg = '당신의 브레이크!'; },
  update(g, dt) {
    if (S.moving) {
      const sub = 8;
      for (let i = 0; i < sub; i++) physics(g, dt / sub);
      if (S.balls.every((b) => b.in || Math.hypot(b.vx, b.vy) < 2)) { S.balls.forEach((b) => (b.vx = b.vy = 0)); S.moving = false; resolve(g); }
      return;
    }
    if (S.over) return;
    const cue = S.balls[0];
    if (S.turn === 0) {
      S.aim = U.angle(cue.x, cue.y, g.mouse.x, g.mouse.y);
      if (g.key('ArrowLeft')) S.aimK = (S.aimK || 0) - dt * 0.5; if (g.key('ArrowRight')) S.aimK = (S.aimK || 0) + dt * 0.5;
      if (g.mouse.clicked) { S.charging = true; S.charge = 0; S.cdir = 1; }
      if (S.charging) { S.charge += S.cdir * dt * 0.9; if (S.charge > 1) { S.charge = 1; S.cdir = -1; } if (S.charge < 0.05) { S.charge = 0.05; S.cdir = 1; } }
      if (S.charging && g.mouse.released) { S.charging = false; shoot(g, S.aim, S.charge); }
    } else {
      S.aiT -= dt;
      if (S.aiT <= 0) { const p = aiPlan(); S.aim = p.a; shoot(g, p.a, p.p); }
      else if (!S.aiPlanCache) { S.aiPlanCache = aiPlan(); } else S.aim = U.lerp(S.aim || 0, S.aiPlanCache.a, dt * 4);
    }
    g.info = `${S.turn === 0 ? '내 차례' : 'AI 차례'} · 나: ${grpName(0)}`;
  },
  draw(g, c) {
    g.rrect(TX - 40, TY - 40, TW + 80, TH + 80, 26, '#78350f'); g.rrect(TX - 30, TY - 30, TW + 60, TH + 60, 20, '#92400e');
    g.rect(TX - 6, TY - 6, TW + 12, TH + 12, '#065f46');
    const grd = c.createRadialGradient(TX + TW / 2, TY + TH / 2, 50, TX + TW / 2, TY + TH / 2, 500); grd.addColorStop(0, '#16a34a'); grd.addColorStop(1, '#0f766e'); c.fillStyle = grd; c.fillRect(TX, TY, TW, TH);
    for (const [x, y] of pockets()) g.circle(x, y, PR, '#0a0a0a');
    for (let i = 1; i <= 3; i++) { g.circle(TX + (TW * i) / 4, TY - 18, 3, '#fde68a'); g.circle(TX + (TW * i) / 4, TY + TH + 18, 3, '#fde68a'); }
    g.line(TX + TW * 0.25, TY, TX + TW * 0.25, TY + TH, 'rgba(255,255,255,.15)', 1);
    for (const b of S.balls) if (!b.in) drawBall(g, b);
    const cue = S.balls[0];
    if (!S.moving && !S.over && !cue.in) {
      const a = S.aim || 0;
      const hit = trace(cue.x, cue.y, a);
      c.setLineDash([6, 6]); g.line(cue.x, cue.y, hit.x, hit.y, 'rgba(255,255,255,.6)', 2); c.setLineDash([]);
      g.ring(hit.x, hit.y, R, 'rgba(255,255,255,.6)', 2);
      if (hit.ball && S.turn === 0) { const b = hit.ball, oa = U.angle(hit.x, hit.y, b.x, b.y); g.line(b.x, b.y, b.x + Math.cos(oa) * 80, b.y + Math.sin(oa) * 80, 'rgba(253,224,71,.7)', 2); }
      const back = 20 + (S.charging || S.turn ? S.charge * 80 : 0);
      g.line(cue.x - Math.cos(a) * (back + R), cue.y - Math.sin(a) * (back + R), cue.x - Math.cos(a) * (back + 360), cue.y - Math.sin(a) * (back + 360), '#d6a86b', 8);
      g.line(cue.x - Math.cos(a) * (back + R), cue.y - Math.sin(a) * (back + R), cue.x - Math.cos(a) * (back + 30), cue.y - Math.sin(a) * (back + 30), '#e0f2fe', 8);
    }
    g.rrect(TX, 18, 300, 44, 10, S.turn === 0 ? '#1e3a8a' : '#292524'); g.text(`🧑 나 · ${grpName(0)}`, TX + 150, 40, 18, '#fff');
    g.rrect(TX + TW - 300, 18, 300, 44, 10, S.turn === 1 ? '#7f1d1d' : '#292524'); g.text(`🤖 AI · ${grpName(1)}`, TX + TW - 150, 40, 18, '#fff');
    g.text(S.msg, 500, 40, 16, '#fde047');
    g.rect(TX, 548, 300, 16, '#292524'); g.rect(TX, 548, 300 * (S.charging ? S.charge : 0), 16, S.charge > 0.75 ? '#ef4444' : '#f59e0b'); g.text('파워', TX + 310, 556, 14, '#d6d3d1', 'left');
    S.pocketed.forEach((n, i) => drawBall(g, { x: TX + TW - 10 - i * 26, y: 556, n }));
  },
});
function drawBall(g, b) {
  const c = g.ctx;
  g.circle(b.x + 2, b.y + 3, R, 'rgba(0,0,0,.35)');
  if (b.n > 8) { g.circle(b.x, b.y, R, '#fff'); c.save(); c.beginPath(); c.arc(b.x, b.y, R, 0, 7); c.clip(); g.rect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1, BCOL[b.n]); c.restore(); }
  else g.circle(b.x, b.y, R, BCOL[b.n]);
  if (b.n) { g.circle(b.x, b.y, R * 0.5, '#fff'); g.text(b.n, b.x, b.y + 0.5, 9, '#111'); }
  g.circle(b.x - 4, b.y - 4, 3, 'rgba(255,255,255,.6)');
}
function pockets() { return [[TX, TY], [TX + TW / 2, TY - 6], [TX + TW, TY], [TX, TY + TH], [TX + TW / 2, TY + TH + 6], [TX + TW, TY + TH]]; }
function grpName(p) { const gr = S.group[p]; return gr === null ? '미정' : gr === 'solid' ? '단색(1~7)' : '줄무늬(9~15)'; }
function isMine(n, p) { const gr = S.group[p]; if (gr === null) return n !== 8 && n !== 0; return gr === 'solid' ? n >= 1 && n <= 7 : n >= 9; }
function rack() {
  S.balls = [{ n: 0, x: TX + TW * 0.25, y: TY + TH / 2, vx: 0, vy: 0 }];
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  U.shuffle(order); const i8 = order.indexOf(8); [order[4], order[i8]] = [order[i8], order[4]];
  let k = 0; const sx = TX + TW * 0.7, sy = TY + TH / 2;
  for (let col = 0; col < 5; col++) for (let row = 0; row <= col; row++) S.balls.push({ n: order[k++], x: sx + col * R * 1.75, y: sy + (row - col / 2) * R * 2.02, vx: 0, vy: 0 });
}
function shoot(g, a, p) {
  const cue = S.balls[0];
  cue.vx = Math.cos(a) * p * 1600; cue.vy = Math.sin(a) * p * 1600;
  S.moving = true; S.first = null; S.potted = []; S.shotBy = S.turn; S.aiPlanCache = null;
  g.sfx.tone(200 + p * 300, 0.06, 'triangle', 0.1);
}
function physics(g, dt) {
  for (const b of S.balls) {
    if (b.in) continue;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0) { const f = Math.max(0, sp - 160 * dt) / sp; b.vx *= f; b.vy *= f; }
    for (const [px, py] of pockets()) if (U.dist(b.x, b.y, px, py) < PR - 2) { b.in = true; b.vx = b.vy = 0; S.potted.push(b.n); g.sfx.drop(); break; }
    if (b.in) continue;
    if (b.x < TX + R) { b.x = TX + R; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > TX + TW - R) { b.x = TX + TW - R; b.vx = -Math.abs(b.vx) * 0.8; }
    if (b.y < TY + R) { b.y = TY + R; b.vy = Math.abs(b.vy) * 0.8; } if (b.y > TY + TH - R) { b.y = TY + TH - R; b.vy = -Math.abs(b.vy) * 0.8; }
  }
  for (let i = 0; i < S.balls.length; i++) for (let j = i + 1; j < S.balls.length; j++) {
    const a = S.balls[i], b = S.balls[j]; if (a.in || b.in) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < R * 2 && d > 0) {
      const nx = dx / d, ny = dy / d, ov = (R * 2 - d) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv > 0) { const imp = rv * 0.97; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; if (rv > 30) g.sfx.tone(900, 0.02, 'sine', Math.min(0.08, rv / 6000)); }
      if (S.first === null && (a.n === 0 || b.n === 0)) S.first = a.n === 0 ? b.n : a.n;
    }
  }
}
function resolve(g) {
  const p = S.shotBy, o = 1 - p, cue = S.balls[0];
  let foul = false, keep = false;
  S.pocketed.push(...S.potted.filter((n) => n));
  if (S.potted.includes(8)) {
    const cleared = S.group[p] && S.balls.filter((b) => !b.in && isMine(b.n, p)).length === 0;
    S.over = true;
    if (cleared && !S.potted.includes(0)) { if (p === 0) { g.add(5000); g.win('8번 볼 성공! 승리!'); } else g.over('AI가 8번을 넣었다. 패배'); }
    else { if (p === 0) g.over('8번 볼을 먼저 넣었다! 패배'); else { g.add(3000); g.win('AI 반칙! 승리!'); } }
    return;
  }
  if (S.potted.includes(0)) { foul = true; cue.in = false; cue.x = TX + TW * 0.25; cue.y = TY + TH / 2; while (S.balls.some((b) => b !== cue && !b.in && U.dist(b.x, b.y, cue.x, cue.y) < R * 2)) cue.y += R * 2; S.msg = '스크래치! 반칙'; }
  else if (S.first === null) { foul = true; S.msg = '공을 맞히지 못함 · 반칙'; }
  else if (S.group[p] && !isMine(S.first, p) && !(S.first === 8 && S.balls.filter((b) => !b.in && isMine(b.n, p)).length === 0)) { foul = true; S.msg = '상대 공을 먼저 맞힘 · 반칙'; }
  const potOwn = S.potted.filter((n) => n && n !== 8);
  if (S.group[p] === null && potOwn.length && !foul) { S.group[p] = potOwn[0] < 8 ? 'solid' : 'stripe'; S.group[o] = S.group[p] === 'solid' ? 'stripe' : 'solid'; S.msg = `${p === 0 ? '나' : 'AI'}: ${grpName(p)}`; }
  const mine = potOwn.filter((n) => isMine(n, p));
  if (mine.length && !foul) { keep = true; if (p === 0) { g.add(mine.length * 300); g.sfx.coin(); } if (!S.msg || S.msg.includes('차례')) S.msg = '한 번 더!'; }
  if (!keep) { S.turn = o; if (!foul) S.msg = S.turn === 0 ? '당신 차례' : 'AI 차례'; }
  else S.turn = p;
  if (S.turn === 1) { S.aiT = 1.4; S.aiPlanCache = null; S.charge = 0.5; }
  S.potted = [];
}
function trace(x, y, a) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let best = { x: x + dx * 1200, y: y + dy * 1200, t: 1200 };
  for (const b of S.balls) { if (b.n === 0 || b.in) continue; const fx = b.x - x, fy = b.y - y, t = fx * dx + fy * dy; if (t <= 0) continue; const d2 = fx * fx + fy * fy - t * t; if (d2 > 4 * R * R) continue; const th = t - Math.sqrt(4 * R * R - d2); if (th < best.t) best = { x: x + dx * th, y: y + dy * th, t: th, ball: b }; }
  const tx = dx > 0 ? (TX + TW - R - x) / dx : dx < 0 ? (TX + R - x) / dx : 1e9, ty = dy > 0 ? (TY + TH - R - y) / dy : dy < 0 ? (TY + R - y) / dy : 1e9, tw = Math.min(tx, ty);
  if (tw < best.t) best = { x: x + dx * tw, y: y + dy * tw, t: tw };
  return best;
}
function clear(x1, y1, x2, y2, skip) { for (const b of S.balls) { if (b.in || skip.includes(b)) continue; const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = U.clamp(((b.x - x1) * dx + (b.y - y1) * dy) / L, 0, 1); if (U.dist(b.x, b.y, x1 + dx * t, y1 + dy * t) < R * 2) return false; } return true; }
function aiPlan() {
  const cue = S.balls[0];
  let best = null, bs = -1e9;
  const targets = S.balls.filter((b) => !b.in && b.n && (isMine(b.n, 1) || (b.n === 8 && S.group[1] && S.balls.filter((x) => !x.in && isMine(x.n, 1)).length === 0)));
  for (const b of targets) for (const [px, py] of pockets()) {
    const pa = U.angle(b.x, b.y, px, py), gx = b.x - Math.cos(pa) * R * 2, gy = b.y - Math.sin(pa) * R * 2;
    const ca = U.angle(cue.x, cue.y, gx, gy);
    let cut = Math.abs(((pa - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (cut > 1.3) continue;
    if (!clear(cue.x, cue.y, gx, gy, [cue, b]) || !clear(b.x, b.y, px, py, [b, cue])) continue;
    const dist = U.dist(cue.x, cue.y, gx, gy) + U.dist(b.x, b.y, px, py);
    const sc = -cut * 300 - dist * 0.4;
    if (sc > bs) { bs = sc; best = { a: ca, p: U.clamp(0.25 + dist / 1400 + cut * 0.15, 0.25, 0.95) }; }
  }
  if (!best) { const t = targets[0] || S.balls.find((b) => !b.in && b.n); best = { a: U.angle(cue.x, cue.y, t.x, t.y), p: 0.5 }; }
  const err = 0.03 * Math.max(0.3, 1 - S.pocketed.length * 0.03);
  return { a: best.a + U.rand(-err, err), p: best.p };
}
