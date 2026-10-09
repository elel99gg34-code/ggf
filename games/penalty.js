let S;
const GX = 200, GY = 160, GWd = 560, GHt = 230;
GAME({
  title: '승부차기', w: 960, h: 700, bg: '#14532d', controls: 'none',
  help: '⚽ 키커: 골대 안의 원하는 지점을 클릭 → 파워 게이지가 초록일 때 다시 클릭!\n(빨간 구간이면 빗나갈 수 있어요)\n🧤 키퍼: 상대가 차는 순간 공이 날아갈 곳을 클릭해서 다이빙!\n5번씩 차고 동점이면 서든데스',
  init(g) { S = { round: 0, me: [], ai: [], phase: 'kAim', ball: null, keeper: { x: 480, y: 330, tx: 480, ty: 330, dive: 0 }, gauge: 0, gdir: 1, wait: 0, msg: '' }; },
  update(g, dt) {
    const K = S.keeper;
    K.x += (K.tx - K.x) * Math.min(1, dt * 7); K.y += (K.ty - K.y) * Math.min(1, dt * 7);
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) nextPhase(g); return; }
    if (S.phase === 'kAim') { if (g.mouse.clicked && inGoal(g.mouse.x, g.mouse.y, 40)) { S.target = { x: g.mouse.x, y: g.mouse.y }; S.phase = 'kPow'; S.gauge = 0; g.sfx.click(); } }
    else if (S.phase === 'kPow') {
      S.gauge += S.gdir * dt * 1.6; if (S.gauge > 1) { S.gauge = 1; S.gdir = -1; } if (S.gauge < 0) { S.gauge = 0; S.gdir = 1; }
      if (g.mouse.clicked || g.pressed('a')) {
        const err = Math.abs(S.gauge - 0.7) * 260;
        const t = { x: S.target.x + U.rand(-err, err), y: S.target.y + U.rand(-err, err) * 0.6 - (S.gauge > 0.9 ? 60 : 0) };
        kick(g, t, 0.45 + (1 - S.gauge) * 0.25);
        const guess = Math.random() < 0.35 ? t : { x: U.choice([GX + 90, 480, GX + GWd - 90]), y: U.rand(GY + 60, GY + GHt - 40) };
        g.later(() => { K.tx = guess.x; K.ty = guess.y; K.dive = 1; }, 0.12);
        S.phase = 'kFly';
      }
    } else if (S.phase === 'gReady') {
      S.aiT -= dt;
      if (S.aiT <= 0) { const t = { x: U.rand(GX + 30, GX + GWd - 30), y: U.rand(GY + 30, GY + GHt - 20) }; if (Math.random() < 0.12) t.y = GY - 30; kick(g, t, U.rand(0.55, 0.75)); S.phase = 'gFly'; }
    } else if (S.phase === 'gFly') {
      if (g.mouse.clicked && !S.dived) { S.dived = true; K.tx = U.clamp(g.mouse.x, GX + 30, GX + GWd - 30); K.ty = U.clamp(g.mouse.y, GY + 50, GY + GHt); K.dive = 1; g.sfx.tone(300, 0.08, 'sine', 0.05); }
    }
    const b = S.ball;
    if (b && b.t < 1) {
      b.t = Math.min(1, b.t + dt / b.dur);
      const k = b.t, e = 1 - Math.pow(1 - k, 2);
      b.x = U.lerp(b.sx, b.tx, e); b.y = U.lerp(b.sy, b.ty, e) - Math.sin(k * Math.PI) * 40; b.r = U.lerp(26, 11, e); b.rot += dt * 20;
      if (b.t >= 0.75 && !b.judged) {
        const saved = U.dist(K.x, K.y, b.tx, b.ty) < 70 && K.dive;
        const inside = inGoal(b.tx, b.ty, 0);
        if (saved && inside) { b.judged = true; b.saved = true; b.vx = (b.tx - K.x) * 3; }
      }
      if (b.t >= 1 && !b.judged) {
        b.judged = true;
        const inside = inGoal(b.tx, b.ty, 0);
        const post = !inside && inGoal(b.tx, b.ty, 18);
        result(g, inside, post ? '골대 맞음!' : inside ? '골!!!' : '빗나감!');
      } else if (b.saved && !b.reported) { b.reported = true; result(g, false, '선방!!'); }
    }
    g.info = `${S.me.filter(Boolean).length} : ${S.ai.filter(Boolean).length} · 라운드 ${S.round + 1}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, 150); grd.addColorStop(0, '#0f172a'); grd.addColorStop(1, '#1e3a5f'); c.fillStyle = grd; c.fillRect(0, 0, 960, 150);
    for (let i = 0; i < 80; i++) g.circle((i * 37) % 960, 40 + ((i * 13) % 90), 6, `hsl(${(i * 47) % 360},60%,${40 + (i % 3) * 10}%)`);
    for (let y = 150; y < 700; y += 50) g.rect(0, y, 960, 25, 'rgba(255,255,255,.04)');
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(60, GY + GHt + 50); c.lineTo(900, GY + GHt + 50); c.stroke();
    g.poly([[GX - 120, GY + GHt + 50], [GX + GWd + 120, GY + GHt + 50], [GX + GWd + 260, 690], [GX - 260, 690]], null, '#fff', 4);
    c.globalAlpha = 0.35; for (let x = GX; x <= GX + GWd; x += 20) g.line(x, GY, x, GY + GHt, '#fff', 1); for (let y = GY; y <= GY + GHt; y += 20) g.line(GX, y, GX + GWd, y, '#fff', 1); c.globalAlpha = 1;
    g.rect(GX - 10, GY - 10, GWd + 20, 10, '#f8fafc'); g.rect(GX - 10, GY - 10, 10, GHt + 10, '#f8fafc'); g.rect(GX + GWd, GY - 10, 10, GHt + 10, '#f8fafc');
    const K = S.keeper, dv = K.dive ? U.clamp((K.x - 480) / 200, -1.2, 1.2) : 0;
    c.save(); c.translate(K.x, K.y); c.rotate(dv); g.emoji('🧤', -52, -48, 44); g.emoji('🧤', 52, -48, 44); g.emoji(S.phase.startsWith('g') ? '🧍' : '🧍‍♂️', 0, 0, 150); c.restore();
    if (S.phase === 'kAim' && inGoal(g.mouse.x, g.mouse.y, 40)) { g.ring(g.mouse.x, g.mouse.y, 18, '#fde047', 3); g.line(g.mouse.x - 26, g.mouse.y, g.mouse.x + 26, g.mouse.y, '#fde047', 2); g.line(g.mouse.x, g.mouse.y - 26, g.mouse.x, g.mouse.y + 26, '#fde047', 2); }
    if (S.phase === 'kPow') { g.ring(S.target.x, S.target.y, 18, '#fde047', 3); g.rrect(330, 640, 300, 26, 8, '#1e293b'); const grd2 = c.createLinearGradient(330, 0, 630, 0); grd2.addColorStop(0, '#ef4444'); grd2.addColorStop(0.55, '#facc15'); grd2.addColorStop(0.7, '#22c55e'); grd2.addColorStop(0.85, '#facc15'); grd2.addColorStop(1, '#ef4444'); c.fillStyle = grd2; c.fillRect(334, 644, 292, 18); g.rect(330 + S.gauge * 296, 636, 6, 34, '#fff'); }
    const b = S.ball;
    if (b) { c.save(); c.translate(b.x, b.y); c.rotate(b.rot); g.emoji('⚽', 0, 0, b.r * 2); c.restore(); }
    else g.emoji('⚽', 480, 600, 52);
    // 점수판
    g.rrect(20, 160, 150, 120, 10, 'rgba(0,0,0,.6)');
    g.text('나', 40, 190, 16, '#fff', 'left'); g.text('AI', 40, 240, 16, '#fff', 'left');
    for (let i = 0; i < Math.max(5, S.me.length, S.ai.length); i++) { const x = 72 + (i % 5) * 18; if (i < 5 || i < S.me.length) g.circle(x, 190, 7, S.me[i] === undefined ? '#334155' : S.me[i] ? '#22c55e' : '#ef4444'); if (i < 5 || i < S.ai.length) g.circle(x, 240, 7, S.ai[i] === undefined ? '#334155' : S.ai[i] ? '#22c55e' : '#ef4444'); }
    const hint = { kAim: '⚽ 내 차례! 골대 안을 클릭해 조준', kPow: '초록 구간에서 클릭!', gReady: '🧤 키퍼 차례! 공이 날아갈 곳을 클릭', gFly: '지금 클릭!' }[S.phase];
    if (hint && !S.wait) g.text(hint, 480, 120, 24, '#fde047');
    if (S.wait > 0 && S.msg) g.text(S.msg, 480, 420, 56, S.msgCol);
  },
});
function inGoal(x, y, m) { return x > GX - m && x < GX + GWd + m && y > GY - m && y < GY + GHt + m * 0.3; }
function kick(g, t, dur) { S.ball = { sx: 480, sy: 600, tx: t.x, ty: t.y, x: 480, y: 600, t: 0, dur, r: 26, rot: 0 }; g.sfx.tone(120, 0.12, 'square', 0.08); }
function result(g, goal, msg) {
  const meKick = S.phase === 'kFly';
  (meKick ? S.me : S.ai).push(goal);
  S.msg = msg; S.msgCol = goal === meKick ? '#4ade80' : '#f87171';
  if (meKick && goal) { g.add(500); g.sfx.coin(); g.shake(6); } else if (!meKick && !goal) { g.add(700); g.sfx.power(); } else g.sfx.hit();
  S.wait = 1.8;
}
function nextPhase(g) {
  S.ball = null; S.keeper = { x: 480, y: 330, tx: 480, ty: 330, dive: 0 }; S.dived = false;
  const m = S.me.filter(Boolean).length, a = S.ai.filter(Boolean).length, nm = S.me.length, na = S.ai.length;
  if (nm === na) {
    if (nm >= 5 && m !== a) return m > a ? (g.add(2000), g.win(`${m} : ${a} 승리!`)) : g.over(`${m} : ${a} 패배`);
    if (nm < 5) { const leftM = 5 - nm, leftA = 5 - na; if (m > a + leftA) return (g.add(2000), g.win(`${m} : ${a} 조기 승리!`)); if (a > m + leftM) return g.over(`${m} : ${a} 패배`); }
    S.round = nm; S.phase = 'kAim';
  } else {
    if (nm <= 5 && na < 5 && m > a + (5 - na)) return (g.add(2000), g.win(`${m} : ${a} 조기 승리!`));
    S.phase = 'gReady'; S.aiT = U.rand(0.8, 1.6);
  }
}
