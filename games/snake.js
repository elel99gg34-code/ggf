let S;
const C = 25, GW = 32, GH = 24;
GAME({
  title: '스네이크', w: GW * C, h: GH * C, bg: '#0a1410', controls: 'dpad',
  help: '방향키/WASD 또는 스와이프로 이동\n🍎 +1, 🌟 황금사과 +5 (시간 제한)\n⚡ 먹으면 잠시 슬로우 모션\n10개마다 레벨업: 빨라지고 장애물 추가',
  init(g) {
    S = { body: [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }], dir: { x: 1, y: 0 }, q: [], t: 0, speed: 0.11, eaten: 0, level: 1, walls: [], gold: null, slow: 0, bolt: null, grow: 0 };
    place(S, 'food');
  },
  update(g, dt) {
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const k in D) if (g.pressed(k) && S.q.length < 3) S.q.push(D[k]);
    S.slow = Math.max(0, S.slow - dt);
    S.t += dt;
    const step = S.speed * (S.slow > 0 ? 1.8 : 1);
    if (S.gold && (S.gold.life -= dt) <= 0) S.gold = null;
    if (S.bolt && (S.bolt.life -= dt) <= 0) S.bolt = null;
    while (S.t >= step) {
      S.t -= step;
      while (S.q.length) {
        const [x, y] = S.q.shift();
        if (x !== -S.dir.x || y !== -S.dir.y) { S.dir = { x, y }; break; }
      }
      const h = S.body[0], n = { x: h.x + S.dir.x, y: h.y + S.dir.y };
      const hitSelf = S.body.slice(0, -1).some((p) => p.x === n.x && p.y === n.y);
      const hitWall = n.x < 0 || n.y < 0 || n.x >= GW || n.y >= GH || S.walls.some((w) => w.x === n.x && w.y === n.y);
      if (hitSelf || hitWall) {
        g.sfx.explode(); g.shake(10);
        S.body.forEach((p) => g.burst(p.x * C + C / 2, p.y * C + C / 2, '#4ade80', 4));
        return g.over(`길이 ${S.body.length} · 레벨 ${S.level}`);
      }
      S.body.unshift(n);
      let ate = false;
      if (n.x === S.food.x && n.y === S.food.y) {
        ate = true; S.eaten++; S.grow += 1; g.add(10 * S.level, n.x * C, n.y * C); g.sfx.coin();
        g.burst(n.x * C + C / 2, n.y * C + C / 2, '#ff4d4d', 16);
        place(S, 'food');
        if (!S.gold && Math.random() < 0.25) { place(S, 'gold'); S.gold.life = 6; }
        if (!S.bolt && Math.random() < 0.12) { place(S, 'bolt'); S.bolt.life = 7; }
        if (S.eaten % 10 === 0) levelUp(g);
      }
      if (S.gold && n.x === S.gold.x && n.y === S.gold.y) {
        ate = true; S.grow += 3; g.add(50 * S.level, n.x * C, n.y * C); g.sfx.power(); g.burst(n.x * C + C / 2, n.y * C + C / 2, '#ffd700', 30); S.gold = null;
      }
      if (S.bolt && n.x === S.bolt.x && n.y === S.bolt.y) {
        ate = true; S.slow = 5; g.sfx.power(); g.float(n.x * C, n.y * C, '슬로우!', '#7dd3fc'); S.bolt = null;
      }
      if (S.grow > 0) S.grow--; else S.body.pop();
      if (!ate) {}
    }
    g.info = `Lv ${S.level} · 길이 ${S.body.length}` + (S.slow > 0 ? ' · ⚡' : '');
  },
  draw(g, c) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if ((x + y) % 2) g.rect(x * C, y * C, C, C, '#0d1a14');
    S.walls.forEach((w) => g.rrect(w.x * C + 1, w.y * C + 1, C - 2, C - 2, 4, '#5b6378'));
    g.emoji('🍎', S.food.x * C + C / 2, S.food.y * C + C / 2 + 1, 22);
    if (S.gold) { c.globalAlpha = S.gold.life < 2 ? (Math.sin(g.time * 20) > 0 ? 1 : 0.3) : 1; g.emoji('🌟', S.gold.x * C + C / 2, S.gold.y * C + C / 2 + 1, 22); c.globalAlpha = 1; }
    if (S.bolt) g.emoji('⚡', S.bolt.x * C + C / 2, S.bolt.y * C + C / 2 + 1, 22);
    const n = S.body.length;
    S.body.forEach((p, i) => {
      const l = 60 - (i / n) * 25;
      g.rrect(p.x * C + 1, p.y * C + 1, C - 2, C - 2, 7, `hsl(${140 - i * 0.8},75%,${l}%)`);
    });
    const h = S.body[0], ex = h.x * C + C / 2, ey = h.y * C + C / 2;
    const px = -S.dir.y * 5, py = S.dir.x * 5, fx = S.dir.x * 4, fy = S.dir.y * 4;
    g.circle(ex + px + fx, ey + py + fy, 3.5, '#fff'); g.circle(ex - px + fx, ey - py + fy, 3.5, '#fff');
    g.circle(ex + px + fx * 1.4, ey + py + fy * 1.4, 1.8, '#000'); g.circle(ex - px + fx * 1.4, ey - py + fy * 1.4, 1.8, '#000');
    if (S.slow > 0) { c.fillStyle = 'rgba(125,211,252,0.06)'; c.fillRect(0, 0, g.W, g.H); }
    if (S.lvlMsg > 0) { S.lvlMsg -= 1 / 60; g.text('LEVEL ' + S.level, g.W / 2, g.H / 2, 60, 'rgba(255,255,255,' + Math.min(1, S.lvlMsg) + ')'); }
  },
});
function levelUp(g) {
  S.level++; S.speed = Math.max(0.05, S.speed * 0.9); S.lvlMsg = 1.5; g.sfx.win();
  for (let i = 0; i < 4 + S.level; i++) {
    const p = free(S); if (Math.abs(p.x - S.body[0].x) + Math.abs(p.y - S.body[0].y) > 5) S.walls.push(p);
  }
}
function free(S) {
  for (;;) {
    const p = { x: U.randi(GW), y: U.randi(GH) };
    if (!S.body.some((b) => b.x === p.x && b.y === p.y) && !S.walls.some((b) => b.x === p.x && b.y === p.y) && !(S.food && S.food.x === p.x && S.food.y === p.y)) return p;
  }
}
function place(S, k) { S[k] = free(S); }
