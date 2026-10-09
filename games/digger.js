let S;
const T = 44, GW = 18, GH = 13;
GAME({
  title: '보석 광부', w: GW * T, h: GH * T + 10, bg: '#3b2412', controls: 'dpad+ab', aLabel: '🔥',
  help: '방향키로 땅을 파며 이동\n💎 보석 25점 (8개 연속 시 보너스 250) · 모두 모으면 레벨 클리어\n💰 아래를 파면 떨어짐! 2칸 이상 떨어지면 깨져서 금화 500\nSpace 화염탄 발사 (재장전 시간 있음) · 👹 괴물에 닿으면 사망',
  init(g) { S = { level: 0, lives: 3 }; newLevel(); },
  update(g, dt) {
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) { if (S.lives < 0) return g.over(`레벨 ${S.level}`); respawn(); } return; }
    const P = S.p;
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const k in D) if (g.held(k) || g.pressed(k)) P.want = D[k];
    if (!g.left && !g.right && !g.up && !g.down) P.want = null;
    P.mt += dt * 6.5;
    if (P.mt >= 1) {
      if (P.want) {
        const nx = P.x + P.want[0], ny = P.y + P.want[1];
        const bag = S.bags.find((b) => b.x === nx && b.y === ny && !b.falling);
        let ok = nx >= 0 && ny >= 0 && nx < GW && ny < GH;
        if (ok && bag) { if (P.want[1] === 0) { const bx = nx + P.want[0]; if (bx >= 0 && bx < GW && !S.bags.some((b) => b.x === bx && b.y === ny)) { bag.x = bx; S.dirt[ny][bx] = 0; } else ok = false; } else ok = false; }
        if (ok) { P.px = P.x; P.py = P.y; P.x = nx; P.y = ny; P.face = P.want; P.mt = 0; if (S.dirt[ny][nx]) { S.dirt[ny][nx] = 0; if (g.frame % 2) g.sfx.tone(120, 0.04, 'triangle', 0.03); } }
      } else P.mt = 1;
    }
    const gi = S.gems.findIndex((e) => e.x === P.x && e.y === P.y);
    if (gi >= 0) { S.gems.splice(gi, 1); S.streak++; g.add(25, P.x * T + T / 2, P.y * T); g.sfx.coin(); if (S.streak === 8) { g.add(250, P.x * T, P.y * T - 20); S.streak = 0; g.sfx.power(); } } else if (P.mt === 0) {}
    const gold = S.golds.findIndex((e) => e.x === P.x && e.y === P.y);
    if (gold >= 0) { S.golds.splice(gold, 1); g.add(500, P.x * T, P.y * T); g.sfx.power(); }
    // 돈주머니 낙하
    S.bagT += dt;
    if (S.bagT > 0.18) {
      S.bagT = 0;
      for (const b of S.bags) {
        const below = b.y + 1 < GH && !S.dirt[b.y + 1][b.x] && !S.bags.some((o) => o !== b && o.x === b.x && o.y === b.y + 1);
        if (below && !(P.x === b.x && P.y === b.y + 1 && !b.falling)) {
          if (!b.falling) { b.wobble = (b.wobble || 0) + 1; if (b.wobble < 4) continue; b.falling = true; b.fell = 0; }
          b.y++; b.fell++;
          for (const m of S.mons) if (m.x === b.x && m.y === b.y) { m.dead = true; g.add(250, m.x * T, m.y * T); g.sfx.hit(); }
          if (P.x === b.x && P.y === b.y) { die(g); }
        } else if (b.falling) { b.falling = false; b.wobble = 0; if (b.fell > 1) { b.broken = true; S.golds.push({ x: b.x, y: b.y }); g.sfx.drop(); g.burst(b.x * T + T / 2, b.y * T + T / 2, '#fde047', 14); } }
        else b.wobble = 0;
      }
      S.bags = S.bags.filter((b) => !b.broken);
    }
    // 화염탄
    S.cool -= dt;
    if (g.pressed('a') && S.cool <= 0 && P.face) { S.fire = { x: P.x * T + T / 2, y: P.y * T + T / 2, dx: P.face[0], dy: P.face[1] }; S.cool = 3; g.sfx.shoot(); }
    if (S.fire) {
      const f = S.fire; f.x += f.dx * 500 * dt; f.y += f.dy * 500 * dt;
      const cx = Math.floor(f.x / T), cy = Math.floor(f.y / T);
      if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || S.dirt[cy][cx]) S.fire = null;
      else for (const m of S.mons) if (m.x === cx && m.y === cy || U.dist(f.x, f.y, m.x * T + T / 2, m.y * T + T / 2) < 26) { m.dead = true; S.fire = null; g.add(250, f.x, f.y); g.sfx.explode(); g.burst(f.x, f.y, '#f97316', 25); break; }
    }
    // 괴물
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.spawned < S.total && S.mons.length < 3 + Math.floor(S.level / 2)) { S.mons.push({ x: GW - 1, y: 0, mt: 0, hob: false, age: 0 }); S.spawned++; S.spawnT = 4; S.dirt[0][GW - 1] = 0; }
    for (const m of S.mons) {
      m.age += dt;
      if (!m.hob && m.age > 12 && Math.random() < dt * 0.1) m.hob = true;
      m.mt += dt * (3.2 + S.level * 0.25);
      if (m.mt < 1) continue;
      m.mt = 0;
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const nx = m.x + dx, ny = m.y + dy; return nx >= 0 && ny >= 0 && nx < GW && ny < GH && (m.hob || !S.dirt[ny][nx]) && !S.bags.some((b) => b.x === nx && b.y === ny); });
      if (!opts.length) continue;
      opts.sort((a, b) => Math.abs(m.x + a[0] - P.x) + Math.abs(m.y + a[1] - P.y) - (Math.abs(m.x + b[0] - P.x) + Math.abs(m.y + b[1] - P.y)));
      const pick = Math.random() < 0.8 ? opts[0] : U.choice(opts);
      m.x += pick[0]; m.y += pick[1];
      if (m.hob) S.dirt[m.y][m.x] = 0;
    }
    S.mons = S.mons.filter((m) => !m.dead);
    if (S.mons.some((m) => m.x === P.x && m.y === P.y)) die(g);
    if (!S.gems.length || (S.spawned >= S.total && !S.mons.length)) { g.add(1000 * S.level); g.sfx.win(); newLevel(); }
    g.info = `레벨 ${S.level} · ❤️${Math.max(0, S.lives)} · 💎${S.gems.length}`;
  },
  draw(g, c) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (S.dirt[y][x]) { g.rect(x * T, y * T, T, T, (x + y) % 2 ? '#7c4a1e' : '#8b5523'); g.circle(x * T + 10 + ((x * 7) % 20), y * T + 12 + ((y * 5) % 18), 3, '#5c3714'); }
      else g.rect(x * T, y * T, T, T, '#1a0f06');
    }
    S.gems.forEach((e) => g.emoji('💎', e.x * T + T / 2, e.y * T + T / 2, 28));
    S.golds.forEach((e) => g.emoji('🪙', e.x * T + T / 2, e.y * T + T / 2, 28));
    S.bags.forEach((b) => g.emoji('💰', b.x * T + T / 2 + (b.wobble ? Math.sin(g.time * 40) * 3 : 0), b.y * T + T / 2, 32));
    S.mons.forEach((m) => g.emoji(m.hob ? '👺' : '👹', m.x * T + T / 2, m.y * T + T / 2, 34));
    if (S.fire) g.emoji('🔥', S.fire.x, S.fire.y, 24);
    const P = S.p;
    if (!(S.dead > 0)) { c.save(); c.translate(P.x * T + T / 2, P.y * T + T / 2); if (P.face && P.face[0] < 0) c.scale(-1, 1); g.emoji('⛏️', 0, 0, 34); c.restore(); }
    else g.emoji('💀', P.x * T + T / 2, P.y * T + T / 2, 34);
    g.rect(0, GH * T, g.W * Math.max(0, 1 - S.cool / 3), 10, '#f97316');
  },
});
function newLevel() {
  S.level++;
  S.dirt = U.grid(GW, GH, 1);
  S.gems = []; S.bags = []; S.golds = []; S.mons = [];
  for (let i = 0; i < 6; i++) { const x = U.randi(1, GW - 3), y = U.randi(1, GH - 3); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) if (!S.gems.some((e) => e.x === x + a && e.y === y + b)) S.gems.push({ x: x + a, y: y + b }); }
  for (let i = 0; i < 6 + S.level; i++) { const x = U.randi(GW), y = U.randi(GH - 3); if (!S.gems.some((e) => e.x === x && e.y === y) && !S.bags.some((b) => b.x === x && b.y === y)) S.bags.push({ x, y }); }
  for (let x = 4; x < GW; x++) S.dirt[0][x] = 0;
  for (let y = 0; y < GH; y++) S.dirt[y][Math.floor(GW / 2)] = 0;
  S.gems = S.gems.filter((e) => S.dirt[e.y][e.x]); S.bags = S.bags.filter((b) => S.dirt[b.y][b.x] && b.y !== 0);
  S.total = 5 + S.level * 2; S.spawned = 0; S.spawnT = 3; S.streak = 0; S.bagT = 0;
  respawn();
}
function respawn() { S.p = { x: Math.floor(GW / 2), y: GH - 1, mt: 1, face: [1, 0], want: null }; S.dirt[GH - 1][Math.floor(GW / 2)] = 0; S.cool = 0; S.fire = null; S.mons.forEach((m) => { m.x = GW - 1; m.y = 0; }); S.dead = 0; }
function die(g) { if (S.dead > 0) return; S.lives--; S.dead = 2; g.sfx.lose(); g.shake(10); }
