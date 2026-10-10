let S;
const SW = 70, SH = 46;
GAME({
  title: '무한의 계단', w: 600, h: 880, bg: '#1e1b4b', controls: 'lr+ab', aLabel: '⬆', bLabel: '↔',
  help: '⬆ 오르기 (Z/→/클릭 오른쪽) · ↔ 방향 전환하며 오르기 (X/←/클릭 왼쪽)\n계단이 꺾이는 곳에서는 방향 전환을 눌러야 해요!\n시간 게이지가 0이 되거나 헛디디면 추락\n계단을 오를수록 게이지가 빨리 줄어요 · 🪙 코인 수집',
  init(g) { S = { st: [{ x: 0, d: 1 }], pos: 0, dir: 1, gauge: 1, dead: false, cam: 0, coins: 0, fall: 0, combo: 0, px: 0, py: 0 }; for (let i = 0; i < 60; i++) addStair(); },
  update(g, dt) {
    if (S.dead) { S.fall += dt; return; }
    const rate = 0.12 + Math.min(0.5, S.pos / 600);
    if (S.pos > 0) S.gauge -= rate * dt;
    if (S.gauge <= 0) return die(g, '시간 초과!');
    let act = null;
    if (g.pressed('a') || g.pressed('right') || g.pressed('up')) act = 'climb';
    if (g.pressed('b') || g.pressed('left')) act = 'turn';
    if (g.mouse.clicked) act = g.mouse.x > 300 ? 'climb' : 'turn';
    if (act) {
      if (act === 'turn') S.dir = -S.dir;
      const next = S.st[S.pos + 1];
      if (next.x - S.st[S.pos].x !== S.dir) { S.pos++; S.dir = S.dir; return die(g, '헛디뎠다!', true); }
      S.pos++; S.gauge = Math.min(1, S.gauge + 0.08); g.score = S.pos; g.sfx.tone(400 + (S.pos % 8) * 40, 0.04, 'square', 0.04);
      if (next.coin) { next.coin = false; S.coins++; g.add(5); g.sfx.coin(); }
      if (S.pos % 100 === 0) { g.float(300, 300, `${S.pos}계단!`, '#fde047', 40); g.sfx.win(); }
      while (S.st.length < S.pos + 40) addStair();
    }
    const cur = S.st[S.pos];
    S.px += (cur.x * SW - S.px) * Math.min(1, dt * 20); S.py += (S.pos * SH - S.py) * Math.min(1, dt * 20);
    g.info = `${S.pos}층 · 🪙${S.coins}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, 880); const h = (200 + S.pos * 0.5) % 360; grd.addColorStop(0, `hsl(${h},55%,22%)`); grd.addColorStop(1, `hsl(${h + 40},55%,10%)`); c.fillStyle = grd; c.fillRect(0, 0, 600, 880);
    for (let i = 0; i < 40; i++) g.rect((i * 97) % 600, ((i * 131 + S.py * 0.2) % 880), 2, 2, 'rgba(255,255,255,.4)');
    c.save(); c.translate(300 - S.px, 640 + S.py + (S.dead && S.fallMiss ? S.fall * S.fall * 900 : 0) * 0);
    for (let i = Math.max(0, S.pos - 14); i < S.pos + 22 && i < S.st.length; i++) {
      const s = S.st[i], x = s.x * SW, y = -i * SH;
      g.rrect(x - SW / 2, y, SW, 20, 4, i <= S.pos ? '#a78bfa' : '#c4b5fd', '#4c1d95', 2);
      g.rect(x - SW / 2, y + 20, SW, 10, '#5b21b6');
      if (s.coin) g.emoji('🪙', x, y - 18, 24);
    }
    const cur = S.st[S.pos];
    const fy = S.dead ? S.fall * S.fall * 700 : 0;
    c.save(); c.translate(S.px + (S.dead && S.fallMiss ? S.dir * SW * Math.min(1, S.fall * 3) : 0), -S.py - 30 + fy); c.scale(-S.dir, 1); if (S.dead) c.rotate(S.fall * 6);
    g.emoji('🏃', 0, 0, 56); c.restore();
    c.restore();
    g.rrect(100, 30, 400, 22, 11, '#1e1b4b', '#a78bfa', 2); g.rrect(102, 32, 396 * Math.max(0, S.gauge), 18, 9, S.gauge < 0.3 ? '#ef4444' : '#fbbf24');
    g.text(S.pos, 300, 100, 56, '#fff');
    g.button(20, 780, 270, 80, '↔ 방향 전환', '#7c3aed', 24); g.button(310, 780, 270, 80, '⬆ 오르기', '#2563eb', 24);
  },
});
function addStair() {
  const last = S.st[S.st.length - 1];
  let d = last.d; if (S.st.length > 3 && Math.random() < 0.35) d = -d;
  if (Math.abs(last.x + d) > 3) d = -d;
  S.st.push({ x: last.x + d, d, coin: Math.random() < 0.08 });
}
function die(g, msg, miss) { S.dead = true; S.fallMiss = miss; g.sfx.lose(); g.shake(8); g.later(() => g.over(`${S.pos}층 · ${msg}`), 1.2); }
