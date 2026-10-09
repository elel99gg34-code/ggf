let S;
const FISH = [
  { e: '🐟', v: 5, d: 0, sp: 60 }, { e: '🐠', v: 10, d: 100, sp: 80 }, { e: '🐡', v: 20, d: 250, sp: 50 }, { e: '🦑', v: 35, d: 450, sp: 70 },
  { e: '🦀', v: 50, d: 650, sp: 40 }, { e: '🐙', v: 80, d: 900, sp: 55 }, { e: '🦈', v: 150, d: 1200, sp: 120 }, { e: '🐋', v: 300, d: 1600, sp: 50 }, { e: '🧜', v: 800, d: 2100, sp: 90 },
];
GAME({
  title: '낚시왕', w: 600, h: 860, bg: '#0369a1', controls: 'lr+ab', aLabel: '🎣',
  help: 'Space/클릭 = 낚싯줄 던지기 · 마우스/←→ 로 바늘 조종\n내려갈 때: 물고기를 피하세요! (닿으면 그 자리에서 감기 시작)\n올라올 때: 최대한 많은 물고기를 낚으세요\n번 돈으로 줄 길이·바늘 개수·⛽ 속도를 업그레이드 · 10번 낚시',
  init(g) { S = { money: 0, casts: 0, len: 300, cap: 3, speed: 1, phase: 'boat', hook: { x: 300, y: 0 }, depth: 0, caught: [], fish: [], shop: false, earned: 0 }; spawnFish(); },
  update(g, dt) {
    const H = S.hook;
    let tx = H.x;
    if (g.mouse.moved || g.mouse.down) tx = g.mouse.x; tx += (g.right - g.left) * 400 * dt;
    g.mouse.moved = false;
    for (const f of S.fish) { if (f.caught) continue; f.x += f.vx * dt; if (f.x < 30 || f.x > 570) f.vx *= -1; }
    if (S.phase === 'boat') {
      if (S.shop) return shop(g);
      if (g.pressed('a') || g.mouse.clicked) { S.phase = 'down'; S.depth = 0; S.caught = []; H.x = 300; g.sfx.tone(400, 0.2, 'sine', 0.05, 150); }
      return;
    }
    H.x += U.clamp(tx - H.x, -500 * dt, 500 * dt); H.x = U.clamp(H.x, 20, 580);
    if (S.phase === 'down') {
      S.depth += (220 + S.speed * 80) * dt;
      if (S.depth >= S.len) { S.depth = S.len; S.phase = 'up'; g.sfx.tone(200, 0.1, 'square', 0.04); }
      for (const f of S.fish) if (!f.caught && U.dist(f.x, f.y, H.x, S.depth) < 26) { S.phase = 'up'; g.sfx.hit(); g.float(H.x, 300, '앗! 걸렸다 — 감아 올려!', '#fde047', 22); break; }
    } else if (S.phase === 'up') {
      S.depth -= (300 + S.speed * 100) * dt;
      if (S.caught.length < S.cap) for (const f of S.fish) if (!f.caught && U.dist(f.x, f.y, H.x, S.depth) < 30) { f.caught = true; S.caught.push(f); g.sfx.tone(600 + S.caught.length * 80, 0.06, 'square', 0.04); if (S.caught.length >= S.cap) break; }
      for (const f of S.caught) { f.x = H.x + U.rand(-4, 4); f.y = S.depth + 20; }
      if (S.depth <= 0) {
        const earned = S.caught.reduce((s, f) => s + f.v, 0);
        S.money += earned; g.add(earned); S.earned = earned; S.casts++;
        S.fish = S.fish.filter((f) => !f.caught);
        if (S.caught.length) { g.sfx.coin(); g.float(300, 120, `+$${earned}`, '#4ade80', 34); g.burst(300, 140, ['#fde047', '#4ade80'], 24, 250); }
        S.phase = 'boat'; S.depth = 0;
        if (S.casts >= 10) return g.win(`총 수익 $${g.score}`);
        S.shop = true; S.sel = 0; refill();
      }
    }
    g.info = `${S.casts + (S.phase !== 'boat' ? 1 : 0)}/10회 · 💰$${S.money} · 🎣${S.caught.length}/${S.cap}`;
  },
  draw(g, c) {
    const cam = Math.max(0, S.depth - 360);
    const grd = c.createLinearGradient(0, -cam, 0, 2400 - cam); grd.addColorStop(0, '#38bdf8'); grd.addColorStop(0.3, '#0369a1'); grd.addColorStop(0.7, '#082f49'); grd.addColorStop(1, '#020617'); c.fillStyle = grd; c.fillRect(0, 0, 600, 860);
    c.save(); c.translate(0, -cam + 140);
    g.rect(0, -400, 600, 400, '#7dd3fc'); g.emoji('☀️', 520, -90, 60);
    for (let x = 0; x < 600; x += 40) g.circle(x + ((g.time * 30) % 40), 0, 22, '#0ea5e9');
    g.emoji('🚣', 300, -24, 80);
    for (let d = 100; d < 2400; d += 100) { g.text(`${d}m`, 10, d, 12, 'rgba(255,255,255,.3)', 'left'); g.line(40, d, 70, d, 'rgba(255,255,255,.15)', 1); }
    g.rect(0, S.len, 600, 3, 'rgba(239,68,68,.5)'); g.text(`줄 한계 ${S.len}m`, 590, S.len - 10, 12, '#fca5a5', 'right');
    for (let i = 0; i < 30; i++) { const y = ((i * 173 + g.time * 30) % 2400); g.circle((i * 97) % 600, 2400 - y, 3, 'rgba(255,255,255,.15)'); }
    for (const f of S.fish) { if (f.y < cam - 200 || f.y > cam + 900) continue; c.save(); c.translate(f.x, f.y); if (f.vx > 0 && !f.caught) c.scale(-1, 1); g.emoji(f.e, 0, 0, f.big ? 70 : 40); c.restore(); }
    if (S.phase !== 'boat') { g.line(300, -10, S.hook.x, S.depth, 'rgba(255,255,255,.6)', 1.5); g.text('🪝', S.hook.x, S.depth, 28); }
    c.restore();
    g.rrect(10, 10, 180, 60, 10, 'rgba(0,0,0,.4)');
    g.text(`💰 $${S.money}`, 22, 30, 20, '#4ade80', 'left'); g.text(`깊이 ${Math.round(S.depth)}m`, 22, 54, 15, '#fff', 'left');
    if (S.phase === 'boat' && !S.shop) g.text('Space / 클릭 으로 던지기!', 300, 420, 26, '#fff');
    if (S.shop) drawShop(g);
  },
});
function spawnFish() { S.fish = []; refill(); }
function refill() {
  while (S.fish.length < 70) {
    const y = U.rand(80, 2300);
    const pool = FISH.filter((f) => f.d <= y);
    const t = pool[pool.length - 1 - Math.min(pool.length - 1, Math.floor(Math.random() * Math.random() * 3))];
    S.fish.push({ ...t, x: U.rand(40, 560), y, vx: U.choice([-1, 1]) * t.sp * U.rand(0.7, 1.3), caught: false, big: t.v >= 150 });
  }
}
function upgrades() { return [
  { n: `🧵 줄 길이 +150m (현재 ${S.len}m)`, p: Math.round(40 * Math.pow(1.6, (S.len - 300) / 150)), f: () => (S.len += 150) },
  { n: `🪝 바늘 +1개 (현재 ${S.cap}개)`, p: Math.round(30 * Math.pow(1.7, S.cap - 3)), f: () => S.cap++ },
  { n: `⚙️ 릴 속도 업 (Lv ${S.speed})`, p: Math.round(50 * Math.pow(1.8, S.speed - 1)), f: () => S.speed++ },
  { n: '▶ 다시 낚시하러 가기', p: 0, go: true },
]; }
function shop(g) {
  const L = upgrades();
  if (g.pressed('up')) S.sel = (S.sel + L.length - 1) % L.length; if (g.pressed('down')) S.sel = (S.sel + 1) % L.length;
  let pick = -1;
  L.forEach((u, i) => { if (g.inRect(70, 330 + i * 70, 460, 58)) { S.sel = i; if (g.mouse.clicked) pick = i; } });
  if (g.keyp('Space') || g.keyp('Enter')) pick = S.sel;
  if (pick < 0) return;
  const u = L[pick];
  if (u.go) { S.shop = false; return; }
  if (S.money >= u.p) { S.money -= u.p; u.f(); g.sfx.power(); } else g.sfx.hit();
}
function drawShop(g) {
  const c = g.ctx; c.fillStyle = 'rgba(2,6,23,.82)'; c.fillRect(0, 0, 600, 860);
  g.text(S.earned ? `이번 수익 $${S.earned}` : '이번엔 꽝...', 300, 200, 30, S.earned ? '#4ade80' : '#94a3b8');
  g.text(`🏪 낚시 상점 · 보유 $${S.money}`, 300, 270, 24, '#fde047');
  upgrades().forEach((u, i) => { const y = 330 + i * 70, sel = S.sel === i; g.rrect(70, y, 460, 58, 12, sel ? '#1e3a5f' : '#0f172a', sel ? '#fde047' : '#334155'); g.text(u.n, 90, y + 29, 17, u.go ? '#4ade80' : '#fff', 'left'); if (!u.go) g.text('$' + u.p, 510, y + 29, 17, S.money >= u.p ? '#4ade80' : '#f87171', 'right'); });
  g.text(`남은 기회 ${10 - S.casts}번`, 300, 640, 18, '#cbd5e1');
}
