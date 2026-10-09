let S;
const W5 = 96, HY = 560;
GAME({
  title: '스네이크 vs 블록', w: 480, h: 800, bg: '#0f172a', controls: 'lr+ab',
  help: '마우스/터치 드래그 또는 ←→ 로 좌우 이동\n숫자 블록에 부딪히면 숫자만큼 몸이 줄어들며 블록을 부숴요\n🟡 숫자 공을 먹으면 몸이 길어짐 · 세로 벽은 통과 불가\n작은 숫자 블록을 골라 길을 뚫어라!',
  init(g) { S = { x: 240, len: 6, hist: [], rows: [], foods: [], walls: [], top: 0, speed: 260, eat: 0, dist: 0 }; for (let i = 0; i < 300; i++) S.hist.push({ x: 240, y: HY + i * 2 }); S.next = -200; },
  update(g, dt) {
    let tx = S.x;
    if (g.mouse.down) tx = g.mouse.x; else tx += (g.right - g.left) * 520 * dt;
    // 벽 충돌 (가로 이동 제한)
    let nx = U.lerp(S.x, U.clamp(tx, 14, 466), Math.min(1, dt * 18));
    for (const w of S.walls) if (HY + 10 > w.y && HY - 10 < w.y + w.h) { if (S.x <= w.x && nx > w.x - 14) nx = w.x - 14; if (S.x >= w.x && nx < w.x + 14) nx = w.x + 14; }
    S.x = nx;
    // 블록 충돌
    let blocked = null;
    for (const r of S.rows) for (const b of r.blocks) if (b.v > 0 && HY - 14 < b.y + 90 && HY + 14 > b.y && S.x > b.x && S.x < b.x + W5) blocked = b;
    const speed = S.speed + Math.min(240, S.dist / 50);
    if (blocked && HY - 14 < blocked.y + 92 && HY > blocked.y + 60) {
      S.eat -= dt;
      if (S.eat <= 0) { S.eat = blocked.v > 20 ? 0.035 : 0.07; blocked.v--; S.len--; g.add(1); g.sfx.tone(300 + (blocked.v % 10) * 30, 0.04, 'square', 0.04); g.burst(S.x, HY - 16, blocked.col, 3, 150, 0.3); g.shake(2, 0.05); if (S.len <= 0) { g.sfx.lose(); return g.over(`${Math.floor(S.dist / 10)}m 전진`); } }
    } else {
      const dy = speed * dt;
      S.dist += dy;
      for (const r of S.rows) { r.blocks.forEach((b) => (b.y += dy)); }
      S.foods.forEach((f) => (f.y += dy)); S.walls.forEach((w) => (w.y += dy));
      S.next += dy;
      S.hist.unshift({ x: S.x, y: HY }); S.hist.forEach((h, i) => { if (i) h.y += dy; });
      if (S.hist.length > 400) S.hist.length = 400;
    }
    while (S.next > -100) gen();
    for (const f of S.foods) if (!f.got && U.dist(f.x, f.y, S.x, HY) < 24) { f.got = true; S.len += f.v; g.sfx.coin(); g.float(f.x, f.y - 20, '+' + f.v, '#fde047'); }
    S.rows = S.rows.filter((r) => r.blocks[0].y < 900); S.foods = S.foods.filter((f) => !f.got && f.y < 900); S.walls = S.walls.filter((w) => w.y < 900);
    g.info = `길이 ${S.len} · ${Math.floor(S.dist / 10)}m`;
  },
  draw(g, c) {
    for (const w of S.walls) g.rrect(w.x - 3, w.y, 6, w.h, 3, '#e2e8f0');
    for (const r of S.rows) for (const b of r.blocks) if (b.v > 0) { g.rrect(b.x + 3, b.y + 3, W5 - 6, 84, 12, b.col); g.text(b.v, b.x + W5 / 2, b.y + 46, 30, '#0f172a'); }
    for (const f of S.foods) { g.circle(f.x, f.y, 11, '#facc15'); g.text(f.v, f.x, f.y - 22, 16, '#fde68a'); }
    // 몸통
    const n = Math.min(S.len, 60);
    for (let i = n - 1; i >= 0; i--) { const h = S.hist[Math.min(S.hist.length - 1, i * 5)]; g.circle(h.x, h.y + 0, 12, i === 0 ? '#facc15' : `hsl(${45 - i},95%,${60 - i * 0.3}%)`); }
    g.text(S.len, S.x, HY - 30, 18, '#fff');
  },
});
function gen() {
  const y = S.next - 300;
  const d = Math.min(1, S.dist / 15000);
  if (Math.random() < 0.55) {
    const blocks = [];
    const full = Math.random() < 0.45;
    const safe = U.randi(0, 4);
    for (let i = 0; i < 5; i++) {
      if (!full && Math.random() < 0.45) continue;
      let v = i === safe ? U.randi(1, Math.max(2, Math.floor(S.len * 0.5))) : U.randi(1, Math.floor(10 + d * 40));
      blocks.push({ x: i * W5, y, v, col: blockCol(v) });
    }
    if (blocks.length) S.rows.push({ blocks });
    for (let k = 0; k < U.randi(1, 3); k++) S.foods.push({ x: U.randi(0, 4) * W5 + W5 / 2, y: y - U.rand(80, 200), v: U.randi(1, 5), got: false });
    if (Math.random() < 0.5) { const wx = U.randi(1, 4) * W5; S.walls.push({ x: wx, y: y - 230, h: U.rand(120, 220) }); }
  } else { for (let k = 0; k < U.randi(1, 3); k++) S.foods.push({ x: U.randi(0, 4) * W5 + W5 / 2, y: y + U.rand(-100, 100), v: U.randi(1, 6), got: false }); }
  S.next -= U.rand(300, 420);
}
function blockCol(v) { const t = Math.min(1, v / 50); return `hsl(${120 - t * 120},80%,${65 - t * 10}%)`; }
