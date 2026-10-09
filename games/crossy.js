let S;
const T = 50, COLS = 11;
GAME({
  title: '크로시 로드', w: COLS * T, h: 800, bg: '#7cc95a', controls: 'dpad',
  help: '방향키/WASD/스와이프로 한 칸씩 이동 (탭 = 앞으로)\n🚗 도로 · 🚂 기찻길(경고등 주의!) · 🌊 강은 통나무로\n🪙 코인 수집 · 너무 오래 머무르면 독수리가 잡아가요!\n점수 = 가장 멀리 간 줄 수',
  init(g) {
    S = { px: 5, row: 0, hop: 0, face: 'up', rows: {}, maxRow: 0, cam: 0, idle: 0, coins: 0, dead: false, eagle: null, offX: 0 };
    for (let r = -6; r < 20; r++) makeRow(r);
  },
  update(g, dt) {
    if (S.dead) { if (S.eagle) S.eagle.y -= 600 * dt; return; }
    let moved = false;
    const tap = g.mouse.clicked && !g.swiped;
    const D = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] };
    for (const k in D) if (g.pressed(k) || (k === 'up' && tap && !g.swiped)) {
      const [dx, dr] = D[k];
      const nx = Math.round(S.px + S.offX) + dx, nr = S.row + dr;
      if (nx < 0 || nx >= COLS || nr < S.maxRow - 4) continue;
      const R = S.rows[nr];
      if (R && R.trees && R.trees.includes(nx)) { S.face = k; continue; }
      S.px = nx; S.offX = 0; S.row = nr; S.face = k; S.hop = 0.12; moved = true; g.sfx.move();
      break;
    }
    if (moved) { S.idle = 0; if (S.row > S.maxRow) { S.maxRow = S.row; g.score = S.maxRow + S.coins * 5; } }
    S.idle += dt; S.hop -= dt;
    for (let r = S.maxRow + 20; !S.rows[r]; r--) makeRow(r);
    const targetCam = S.row * T - 250;
    S.cam += (Math.max(S.cam, targetCam) - S.cam) * Math.min(1, dt * 4);
    S.cam += dt * Math.min(40, 8 + S.maxRow * 0.2);
    for (const k in S.rows) {
      const R = S.rows[k];
      if (+k < S.row - 10) { delete S.rows[k]; continue; }
      if (R.type === 'rail') { R.t -= dt; if (R.t <= 0 && !R.train) { R.warn = 1; R.t = U.rand(3, 7); } if (R.warn > 0) { R.warn -= dt; if (R.warn <= 0) { R.train = { x: R.dir > 0 ? -12 : COLS + 1 }; g.sfx.tone(180, 0.4, 'sawtooth', 0.05); } } if (R.train) { R.train.x += R.dir * 30 * dt; if (R.train.x < -14 || R.train.x > COLS + 14) R.train = null; } }
      if (R.objs) for (const o of R.objs) { o.x += R.v * dt; if (R.v > 0 && o.x > COLS + 1) o.x -= R.span; if (R.v < 0 && o.x + o.w < -1) o.x += R.span; }
    }
    const R = S.rows[S.row], x = S.px + S.offX;
    if (S.hop <= 0 && R) {
      if (R.type === 'road' && R.objs.some((o) => x + 0.35 > o.x && x - 0.35 < o.x + o.w - 0.1)) return die(g, '🚗 치였다!');
      if (R.type === 'rail' && R.train && x > R.train.x - 0.5 && x < R.train.x + 8) return die(g, '🚂 기차에 치였다!');
      if (R.type === 'water') {
        const log = R.objs.find((o) => x + 0.5 > o.x && x - 0.5 < o.x + o.w - 0.4 + 0.4);
        if (!log) return die(g, '🌊 풍덩!');
        S.offX += R.v * dt;
        if (S.px + S.offX < -0.5 || S.px + S.offX > COLS - 0.5) return die(g, '🌊 떠내려갔다!');
      }
    }
    if (S.hop <= 0 && R && R.coin === Math.round(x)) { R.coin = -1; S.coins++; g.score = S.maxRow + S.coins * 5; g.sfx.coin(); }
    if (S.row * T < S.cam - 60 || S.idle > 9) { S.eagle = { y: 0 }; return die(g, '🦅 독수리에게 잡혀갔다!'); }
    g.info = `🪙${S.coins}`;
  },
  draw(g, c) {
    const sy = (r) => g.H - (r * T - S.cam) - T;
    for (let r = Math.floor(S.cam / T) - 1; r < Math.floor(S.cam / T) + 18; r++) {
      const R = S.rows[r]; if (!R) continue;
      const y = sy(r);
      const bg = { grass: r % 2 ? '#8fd16a' : '#86c962', road: '#4b5563', rail: '#78716c', water: '#38bdf8' }[R.type];
      g.rect(0, y, g.W, T, bg);
      if (R.type === 'road') for (let x = 0; x < g.W; x += 50) g.rect(x + 10, y + T - 3, 25, 3, '#d1d5db');
      if (R.type === 'rail') { g.rect(0, y + 14, g.W, 4, '#d6d3d1'); g.rect(0, y + 32, g.W, 4, '#d6d3d1'); for (let x = 0; x < g.W; x += 22) g.rect(x, y + 10, 8, 30, '#57534e'); g.emoji(R.warn > 0 && Math.floor(g.time * 8) % 2 ? '🔴' : '⚫', R.dir > 0 ? 14 : g.W - 14, y + 10, 14); }
      if (R.trees) R.trees.forEach((tx) => g.emoji(U.choice ? (tx % 3 ? '🌳' : '🌲') : '🌳', tx * T + T / 2, y + T / 2 - 4, 44));
      if (R.objs) for (const o of R.objs) {
        if (R.type === 'water') { g.rrect(o.x * T, y + 8, o.w * T, T - 16, 10, '#92400e', '#78350f', 3); }
        else { c.save(); c.translate(o.x * T + (o.w * T) / 2, y + T / 2); if (R.v > 0) c.scale(-1, 1); g.emoji(o.e, 0, 0, o.w > 1.5 ? 56 : 42); c.restore(); }
      }
      if (R.train) for (let i = 0; i < 8; i++) g.emoji(i === (R.dir > 0 ? 7 : 0) ? '🚂' : '🚃', (R.train.x + i) * T + T / 2, y + T / 2, 50);
      if (R.coin >= 0) g.emoji('🪙', R.coin * T + T / 2, y + T / 2, 26);
    }
    const x = (S.px + S.offX) * T + T / 2, y = sy(S.row) + T / 2 - (S.hop > 0 ? 12 : 0);
    if (!S.dead || !S.eagle) {
      c.save(); c.translate(x, y); if (S.face === 'left') c.scale(-1, 1);
      if (S.dead) c.scale(1.3, 0.3);
      g.emoji('🐔', 0, 0, 42); c.restore();
    }
    if (S.eagle) g.emoji('🦅', x, y + S.eagle.y, 70);
    if (S.idle > 6 && !S.dead) g.text('⚠️ 서둘러!', g.W / 2, 60, 26, '#dc2626');
  },
});
function makeRow(r) {
  if (r <= 2) { S.rows[r] = { type: 'grass', trees: r < 0 ? [0, 1, 2, 3, 4, 6, 7, 8, 9, 10] : [0, 10] }; return; }
  const d = Math.min(1, r / 150);
  const prev = S.rows[r - 1];
  let type = U.choice(['grass', 'road', 'road', 'water', 'rail', 'grass']);
  if (prev && prev.type === 'water' && Math.random() < 0.3) type = 'water';
  const R = { type, coin: Math.random() < 0.12 ? U.randi(COLS) : -1 };
  if (type === 'grass') { R.trees = []; for (let x = 0; x < COLS; x++) if (Math.random() < 0.2) R.trees.push(x); if (R.trees.includes(R.coin)) R.coin = -1; }
  if (type === 'road') {
    R.v = U.choice([-1, 1]) * U.rand(1.5, 3 + d * 3); const truck = Math.random() < 0.3;
    R.objs = []; let x = U.rand(3); while (x < COLS + 3) { R.objs.push({ x, w: truck ? 2 : 1, e: truck ? '🚚' : U.choice(['🚗', '🚕', '🚙', '🚓']) }); x += (truck ? 2 : 1) + U.rand(2.5, 5); }
    R.span = Math.max(x, COLS + 4);
  }
  if (type === 'water') { R.v = U.choice([-1, 1]) * U.rand(1, 2.2); R.objs = []; let x = U.rand(2); while (x < COLS + 3) { const w = U.randi(2, 4); R.objs.push({ x, w }); x += w + U.rand(1.2, 2.6); } R.span = Math.max(x, COLS + 4); }
  if (type === 'rail') { R.dir = U.choice([-1, 1]); R.t = U.rand(1, 5); R.warn = 0; R.train = null; R.coin = -1; }
  S.rows[r] = R;
}
function die(g, msg) { S.dead = true; g.sfx.hit(); g.shake(8); g.later(() => g.over(msg + ` · ${S.maxRow}칸`), 0.8); }
