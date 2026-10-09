let S;
const T = 48, COLS = 14, ROWS = 13;
GAME({
  title: '개구리 건너기', w: COLS * T, h: ROWS * T + 40, bg: '#111', controls: 'dpad',
  help: '방향키/WASD/스와이프로 한 칸씩 이동\n아래 도로: 차를 피하세요 · 위 강: 통나무와 거북이를 타세요\n🪷 5개의 집을 모두 채우면 레벨 클리어\n🪰 파리가 있는 집은 보너스 +200',
  init(g) { S = { level: 1, lives: 3, homes: [0, 0, 0, 0, 0], maxRow: 12 }; build(); reset(); },
  update(g, dt) {
    const F = S.frog;
    if (S.dead) { S.dead -= dt; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`레벨 ${S.level}`); reset(); } return; }
    S.timer -= dt;
    if (S.timer <= 0) return die(g);
    for (const [k, [dx, dy]] of Object.entries({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] })) {
      if (g.pressed(k) && F.hop <= 0) {
        const nx = F.x + dx * T, ny = F.row + dy;
        if (nx < 0 || nx > (COLS - 1) * T || ny > 12) continue;
        F.x = nx; F.row = ny; F.hop = 0.12; F.face = k; g.sfx.move();
        if (ny < S.maxRow) { S.maxRow = ny; g.add(10); }
      }
    }
    F.hop -= dt;
    for (const l of S.lanes) for (const o of l.objs) {
      o.x += l.v * dt;
      if (l.v > 0 && o.x > g.W + 20) o.x -= l.span; if (l.v < 0 && o.x + o.w < -20) o.x += l.span;
      if (o.turtle) o.sub = Math.sin(g.time * 1.4 + o.ph) < -0.6;
    }
    if (S.flyT !== undefined) { S.flyT -= dt; if (S.flyT <= 0) { S.fly = U.randi(5); if (S.homes[S.fly]) S.fly = -1; S.flyT = 5; } }
    const lane = S.lanes.find((l) => l.row === F.row);
    const cx = F.x + T / 2;
    if (F.row === 0) {
      const idx = homeIndex(cx);
      if (idx < 0 || S.homes[idx]) return die(g);
      S.homes[idx] = 1; g.add(50 + Math.floor(S.timer) * 10, cx, T / 2); g.sfx.coin();
      if (S.fly === idx) { g.add(200, cx, T / 2); S.fly = -1; }
      if (S.homes.every((h) => h)) { g.add(1000 * S.level); g.sfx.win(); S.level++; S.homes = [0, 0, 0, 0, 0]; build(); }
      return reset(true);
    }
    if (lane && lane.water) {
      const on = lane.objs.find((o) => cx > o.x + 4 && cx < o.x + o.w - 4 && !o.sub);
      if (!on) return die(g, true);
      F.x += lane.v * dt;
      if (F.x < -T / 2 || F.x > g.W - T / 2) return die(g, true);
    } else if (lane) {
      if (lane.objs.some((o) => F.x + 8 < o.x + o.w && F.x + T - 8 > o.x)) return die(g);
    }
    g.info = `레벨 ${S.level} · ❤️${S.lives}`;
  },
  draw(g, c) {
    g.rect(0, 0, g.W, T, '#14532d');
    for (let i = 0; i < 5; i++) {
      const x = (i * 3 + 1) * T - T / 2 + 4;
      g.rect(x - 4, 4, T + 8, T - 4, '#0c4a6e');
      if (S.homes[i]) g.emoji('🐸', x + T / 2, T / 2 + 2, 36); else if (S.fly === i) g.emoji('🪰', x + T / 2, T / 2 + 2, 26);
      else g.emoji('🪷', x + T / 2, T / 2 + 2, 22);
    }
    for (let r = 1; r <= 5; r++) g.rect(0, r * T, g.W, T, '#0c4a6e');
    g.rect(0, 6 * T, g.W, T, '#4c1d95');
    for (let r = 7; r <= 11; r++) { g.rect(0, r * T, g.W, T, '#1f2937'); if (r < 11) for (let x = 0; x < g.W; x += 60) g.rect(x, (r + 1) * T - 2, 30, 4, '#facc15'); }
    g.rect(0, 12 * T, g.W, T, '#4c1d95');
    for (const l of S.lanes) for (const o of l.objs) {
      const y = l.row * T;
      if (l.water) {
        if (o.turtle) { const n = Math.round(o.w / T); for (let i = 0; i < n; i++) { c.globalAlpha = o.sub ? 0.25 : 1; g.emoji('🐢', o.x + i * T + T / 2, y + T / 2, 36); c.globalAlpha = 1; } }
        else { g.rrect(o.x, y + 8, o.w, T - 16, 14, '#92400e', '#78350f', 3); for (let i = 20; i < o.w; i += 40) g.line(o.x + i, y + 14, o.x + i + 14, y + 14, '#b45309', 2); }
      } else {
        c.save(); c.translate(o.x + o.w / 2, y + T / 2); if (l.v > 0) c.scale(-1, 1);
        g.emoji(o.e, 0, 0, o.w > T ? 46 : 38); c.restore();
      }
    }
    const F = S.frog;
    if (S.dead) g.emoji(S.splash ? '💦' : '💥', F.x + T / 2, F.row * T + T / 2, 40);
    else { c.save(); c.translate(F.x + T / 2, F.row * T + T / 2); c.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[F.face]); g.emoji('🐸', 0, F.hop > 0 ? -4 : 0, F.hop > 0 ? 42 : 36); c.restore(); }
    const by = ROWS * T;
    g.rect(0, by, g.W, 40, '#000');
    g.text('TIME', 40, by + 20, 16, '#facc15');
    g.rect(80, by + 12, (S.timer / 40) * 400, 16, S.timer < 10 ? '#ef4444' : '#22c55e');
    g.text('🐸'.repeat(Math.max(0, S.lives)), g.W - 10, by + 20, 18, '#fff', 'right');
  },
});
function homeIndex(cx) { for (let i = 0; i < 5; i++) { const x = (i * 3 + 1) * T - T / 2 + 4 + T / 2; if (Math.abs(cx - x) < 28) return i; } return -1; }
function build() {
  const k = 1 + (S.level - 1) * 0.18;
  const mk = (row, v, w, n, gapOpts, extra = {}) => {
    const objs = []; let x = 0;
    for (let i = 0; i < n; i++) { objs.push({ x, w, ...extra, ph: U.rand(6) }); x += w + U.choice(gapOpts); }
    return { row, v: v * k, objs, span: Math.max(x, COLS * T + w + 40), ...extra.lane };
  };
  S.lanes = [
    mk(11, -60, T, 4, [140, 200], { e: '🚗' }), mk(10, 80, T, 3, [180, 220], { e: '🚜' }), mk(9, -100, T, 4, [130, 170], { e: '🚙' }),
    mk(8, 140, T, 2, [250, 320], { e: '🏎️' }), mk(7, -70, T * 2, 3, [180, 260], { e: '🚚' }),
    mk(5, -70, T * 3, 3, [130, 160], { turtle: true, lane: { water: true } }), mk(4, 80, T * 3, 3, [120, 160], { lane: { water: true } }),
    mk(3, 120, T * 5, 2, [160, 220], { lane: { water: true } }), mk(2, -90, T * 2, 4, [100, 130], { turtle: true, lane: { water: true } }),
    mk(1, 70, T * 4, 3, [110, 150], { lane: { water: true } }),
  ];
  S.lanes.forEach((l) => { if (l.objs[0].lane) { l.water = true; } l.objs.forEach((o) => delete o.lane); });
  S.fly = -1; S.flyT = 3;
}
function reset(keepTimer) { S.frog = { x: 7 * T, row: 12, hop: 0, face: 'up' }; S.timer = 40; S.maxRow = 12; }
function die(g, water) {
  if (S.dead) return;
  S.dead = 1.2; S.splash = water; g.sfx.hit(); g.shake(6);
}
