let S;
const HOLES = [[180, 300], [400, 300], [620, 300], [180, 470], [400, 470], [620, 470], [180, 640], [400, 640], [620, 640]];
GAME({
  title: '두더지 잡기', w: 800, h: 780, bg: '#65a30d', controls: 'none',
  help: '튀어나온 두더지를 클릭(탭)해서 잡으세요! (숫자키 1~9도 가능)\n🐹 +10 · 🌟황금 두더지 +50 · 💣 폭탄은 치면 -50 & 시간 감소\n연속으로 잡으면 콤보 보너스\n60초 동안 최대한 많이!',
  init(g) { S = { moles: HOLES.map(() => ({ up: 0, t: 0, k: null, hit: 0 })), time: 60, spawn: 0.5, combo: 0, hammer: 0, hx: 0, hy: 0 }; },
  update(g, dt) {
    S.time -= dt;
    if (S.time <= 0) return g.over(`60초 동안 ${g.score}점!`);
    const pace = 1 + (60 - S.time) / 40;
    S.spawn -= dt * pace;
    if (S.spawn <= 0) { S.spawn = U.rand(0.35, 0.9); const free = S.moles.map((m, i) => (m.t <= 0 ? i : -1)).filter((i) => i >= 0); if (free.length) { const m = S.moles[U.choice(free)]; const r = Math.random(); m.k = r < 0.12 ? 'b' : r < 0.2 ? 'g' : 'm'; m.t = U.rand(0.7, 1.3) / Math.sqrt(pace); m.hit = 0; } }
    for (const m of S.moles) { if (m.t > 0) { m.t -= dt; m.up = Math.min(1, m.up + dt * 8); if (m.t <= 0 && !m.hit && m.k !== 'b') S.combo = 0; } else m.up = Math.max(0, m.up - dt * 8); m.hit = Math.max(0, m.hit - dt); }
    S.hammer -= dt;
    let pick = -1;
    for (let i = 0; i < 9; i++) if (g.keyp('Digit' + (i + 1)) || g.keyp('Numpad' + (7 - Math.floor(i / 3) * 3 + (i % 3)))) pick = i;
    if (g.mouse.clicked) { S.hammer = 0.15; S.hx = g.mouse.x; S.hy = g.mouse.y; HOLES.forEach(([x, y], i) => { if (Math.abs(g.mouse.x - x) < 75 && g.mouse.y > y - 110 && g.mouse.y < y + 30) pick = i; }); }
    if (pick >= 0) {
      if (!g.mouse.clicked) { S.hammer = 0.15; S.hx = HOLES[pick][0]; S.hy = HOLES[pick][1] - 50; }
      const m = S.moles[pick];
      if (m.t > 0 && m.up > 0.5 && !m.hit) {
        m.hit = 0.4; m.t = Math.min(m.t, 0.25);
        const [x, y] = HOLES[pick];
        if (m.k === 'b') { g.score = Math.max(0, g.score - 50); S.time -= 3; S.combo = 0; g.sfx.explode(); g.shake(12); g.float(x, y - 90, '-50 / -3초', '#ef4444', 26); g.burst(x, y - 50, ['#f97316', '#111'], 30); }
        else { S.combo++; const pts = (m.k === 'g' ? 50 : 10) + Math.min(S.combo, 20) * 2; g.add(pts); g.float(x, y - 100, `+${pts}` + (S.combo > 2 ? ` 콤보${S.combo}` : ''), m.k === 'g' ? '#fde047' : '#fff', 22); g.sfx.tone(m.k === 'g' ? 1000 : 500 + S.combo * 20, 0.08, 'square', 0.06); g.burst(x, y - 50, ['#fde047', '#fff'], 12); }
      } else { S.combo = 0; g.sfx.drop(); }
    }
    g.info = `⏱️ ${Math.ceil(S.time)} · 콤보 ${S.combo}`;
  },
  draw(g, c) {
    for (let i = 0; i < 30; i++) g.emoji('🌿', (i * 137) % 800, 200 + ((i * 89) % 580), 26);
    g.rrect(250, 20, 300, 80, 16, 'rgba(0,0,0,.3)'); g.text(Math.ceil(S.time), 400, 60, 44, S.time < 10 ? '#fca5a5' : '#fff');
    g.text(`🔨 ${g.score}`, 40, 60, 30, '#fff', 'left');
    HOLES.forEach(([x, y], i) => {
      const m = S.moles[i];
      c.fillStyle = '#3f2a14'; c.beginPath(); c.ellipse(x, y, 75, 26, 0, 0, Math.PI * 2); c.fill();
      if (m.up > 0) { c.save(); c.beginPath(); c.rect(x - 90, y - 160, 180, 160); c.clip(); const e = m.k === 'b' ? '💣' : m.hit ? '😵' : m.k === 'g' ? '🌟' : '🐹'; g.emoji(e, x, y - 50 * m.up + 30 - (m.hit ? 0 : 0), 100); c.restore(); }
      c.fillStyle = '#5c3d1e'; c.beginPath(); c.ellipse(x, y + 6, 78, 20, 0, 0, Math.PI); c.fill();
      g.text(i + 1, x + 70, y + 26, 14, 'rgba(255,255,255,.4)');
    });
    if (S.hammer > 0) { c.save(); c.translate(S.hx + 20, S.hy - 20); c.rotate(-0.8 + (1 - S.hammer / 0.15) * 0.8); g.emoji('🔨', 0, 0, 80); c.restore(); }
  },
});
