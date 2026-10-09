let S;
const CW = 520, CH = 800, CX = 140, CY = 40;
GAME({
  title: '테니스', w: 800, h: 880, bg: '#166534', controls: 'dpad+ab', aLabel: '🎾',
  help: '방향키/WASD 또는 마우스로 이동 · 공이 가까이 오면 자동 스윙\nSpace 를 누르고 치면 강타 (스매시)!\n타격 위치(라켓 중앙/끝)에 따라 방향이 바뀌어요\n6게임 선취 한 세트 승부 (듀스 · 어드밴티지 포함)',
  init(g) { S = { me: { x: CX + CW / 2, y: CY + CH - 40 }, ai: { x: CX + CW / 2, y: CY + 40 }, pts: [0, 0], games: [0, 0], server: 0, ball: null, wait: 1, msg: '', swing: 0, aiSwing: 0 }; serve(); },
  update(g, dt) {
    const M = S.me, A = S.ai, b = S.ball;
    let mx = g.right - g.left, my = g.down - g.up;
    if (!mx && !my && g.mouse.down) { const dx = g.mouse.x - M.x, dy = g.mouse.y - M.y; if (Math.hypot(dx, dy) > 8) { mx = dx / Math.hypot(dx, dy); my = dy / Math.hypot(dx, dy); } }
    const ml = Math.hypot(mx, my) || 1;
    M.x = U.clamp(M.x + (mx / ml) * 330 * dt, CX - 60, CX + CW + 60); M.y = U.clamp(M.y + (my / ml) * 330 * dt, CY + CH / 2 + 40, CY + CH + 60);
    S.swing -= dt; S.aiSwing -= dt;
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0 && S.server === 1) aiServe(g); return; }
    if (!b.live && S.server === 0) { b.x = M.x + 16; b.y = M.y - 10; b.z = 40; if (g.pressed('a') || g.mouse.clicked) { hit(g, b, 0, true); } return; }
    // AI 이동: 공 낙하 지점 예측
    let tx = CX + CW / 2, ty = CY + 30;
    if (b.vy < 0) { const t = Math.max(0, (b.y - (CY + 40)) / -b.vy); tx = b.x + b.vx * t; ty = CY + 30; }
    const aiSp = 260 + S.games[0] * 15 + S.games[1] * 5;
    A.x += U.clamp(tx - A.x, -aiSp * dt, aiSp * dt); A.y += U.clamp(ty - A.y, -aiSp * dt, aiSp * dt);
    // 공 물리 (z = 높이)
    b.vz -= 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0; b.vz = Math.abs(b.vz) * 0.65; b.bounces++;
      const inX = b.x > CX && b.x < CX + CW, side = b.y > CY + CH / 2 ? 0 : 1;
      if (b.bounces === 1) { if (!inX || b.y < CY || b.y > CY + CH || side === b.hitter) return point(g, 1 - b.hitter, side === b.hitter ? '네트 앞 바운드' : '아웃!'); g.sfx.tone(200, 0.04, 'triangle', 0.05); }
      else if (b.bounces >= 2) return point(g, b.hitter, '득점!');
    }
    // 네트
    if ((b.py - (CY + CH / 2)) * (b.y - (CY + CH / 2)) < 0 && b.z < 22) { return point(g, 1 - b.hitter, '네트!'); }
    b.py = b.y;
    if (b.x < CX - 200 || b.x > CX + CW + 200 || b.y < -100 || b.y > CY + CH + 150) return point(g, b.bounces ? b.hitter : 1 - b.hitter, b.bounces ? '득점!' : '아웃!');
    // 타격
    if (b.hitter === 1 && U.dist(b.x, b.y, M.x, M.y) < 52 && b.z < 90 && b.vy > 0) hit(g, b, 0, false, g.a);
    if (b.hitter === 0 && U.dist(b.x, b.y, A.x, A.y) < 50 && b.z < 90 && b.vy < 0) hit(g, b, 1, false, Math.random() < 0.15);
    g.info = `게임 ${S.games[0]} : ${S.games[1]} · ${ptName(0)} - ${ptName(1)}`;
  },
  draw(g, c) {
    g.rect(CX - 60, CY - 30, CW + 120, CH + 60, '#1d4ed8');
    g.stroke(CX, CY, CW, CH, '#fff', 4); g.line(CX + 50, CY, CX + 50, CY + CH, '#fff', 3); g.line(CX + CW - 50, CY, CX + CW - 50, CY + CH, '#fff', 3);
    g.line(CX + 50, CY + 200, CX + CW - 50, CY + 200, '#fff', 3); g.line(CX + 50, CY + CH - 200, CX + CW - 50, CY + CH - 200, '#fff', 3); g.line(CX + CW / 2, CY + 200, CX + CW / 2, CY + CH - 200, '#fff', 3);
    const b = S.ball;
    g.circle(b.x, b.y, 7, 'rgba(0,0,0,.35)');
    for (const [p, sw, e] of [[S.ai, S.aiSwing, '🧑‍🦰'], [S.me, S.swing, '🧑']]) { g.circle(p.x, p.y + 18, 16, 'rgba(0,0,0,.25)'); g.emoji(e, p.x, p.y, 46); c.save(); c.translate(p.x + 20, p.y); c.rotate(sw > 0 ? -sw * 10 : 0.3); g.line(0, 0, 0, -26, '#111', 3); g.ring(0, -34, 10, '#dc2626', 3); c.restore(); }
    g.rect(CX - 50, CY + CH / 2 - 3, CW + 100, 6, '#e5e7eb'); g.rect(CX - 50, CY + CH / 2 - 14, CW + 100, 11, 'rgba(255,255,255,.4)');
    g.circle(b.x, b.y - b.z * 0.6, 8, '#d9f99d'); g.ring(b.x, b.y - b.z * 0.6, 8, '#65a30d', 1.5);
    g.rrect(10, 10, 120, 80, 10, 'rgba(0,0,0,.55)');
    g.text('나', 24, 34, 15, '#fff', 'left'); g.text('AI', 24, 66, 15, '#fff', 'left');
    g.text(S.games[0], 66, 34, 18, '#fde047'); g.text(S.games[1], 66, 66, 18, '#fde047');
    g.text(ptName(0), 104, 34, 16, '#fff'); g.text(ptName(1), 104, 66, 16, '#fff');
    if (S.wait > 0 && S.msg) g.text(S.msg, 400, 440, 40, '#fde047');
    if (!b.live && S.server === 0 && S.wait <= 0) g.text('Space/클릭 = 서브', 400, CY + CH + 20, 18, '#fff');
  },
});
function ptName(p) { const a = S.pts[p], b = S.pts[1 - p]; if (a >= 3 && b >= 3) return a === b ? '40' : a > b ? 'AD' : '40'; return ['0', '15', '30', '40'][Math.min(3, a)]; }
function serve() { const srv = S.server; S.ball = { x: srv ? S.ai.x : S.me.x, y: srv ? S.ai.y + 20 : S.me.y - 20, z: 40, vx: 0, vy: 0, vz: 0, live: false, hitter: srv, bounces: 0, py: 0 }; S.wait = 1; }
function aiServe(g) { const b = S.ball; b.x = S.ai.x; b.y = S.ai.y + 20; hit(g, b, 1, true); }
function hit(g, b, who, isServe, power) {
  const p = who ? S.ai : S.me;
  const tx = who ? U.rand(CX + 40, CX + CW - 40) + (S.me.x < CX + CW / 2 ? 60 : -60) : CX + CW / 2 + (b.x - p.x) * -6 + U.rand(-40, 40);
  const ty = who ? U.rand(CY + CH / 2 + 120, CY + CH - 60) : U.rand(CY + 60, CY + CH / 2 - 120);
  let T = isServe ? 1.0 : power ? 0.75 : U.rand(0.95, 1.2);
  let fx = tx, fy = ty;
  if (who && !isServe && Math.random() < 0.1 + (Math.hypot(b.vx, b.vy) > 900 ? 0.15 : 0)) { if (Math.random() < 0.5) fx = U.choice([CX - 40, CX + CW + 40]); else fy = CY + CH + 50; }
  b.vx = ((fx === tx ? U.clamp(tx, CX + 15, CX + CW - 15) : fx) - b.x) / T; b.vy = (fy - b.y) / T; b.vz = 900 * T / 2 - b.z / T + (power ? -60 : 0);
  b.live = true; b.hitter = who; b.bounces = 0; b.py = b.y;
  if (who) S.aiSwing = 0.15; else S.swing = 0.15;
  g.sfx.tone(power ? 900 : 600, 0.05, 'square', 0.07); if (power) g.shake(4);
  if (!who && !isServe) g.add(10);
}
function point(g, w, why) {
  S.pts[w]++;
  S.msg = (w === 0 ? '✅ ' : '❌ ') + why;
  w === 0 ? g.sfx.coin() : g.sfx.hit();
  if (w === 0) g.add(100);
  const [a, b] = S.pts;
  if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2) {
    const gw = a > b ? 0 : 1; S.games[gw]++; S.pts = [0, 0]; S.server = 1 - S.server; S.msg = gw === 0 ? '🎾 게임 획득!' : 'AI 게임';
    if (gw === 0) g.add(500);
    const [x, y] = S.games;
    if ((x >= 6 || y >= 6) && Math.abs(x - y) >= 2 || x === 7 || y === 7) return x > y ? (g.add(3000), g.win(`세트 ${x} : ${y} 승리!`)) : g.over(`세트 ${x} : ${y} 패배`);
  }
  serve();
}
