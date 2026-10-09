let S;
const LV = [
  ['..........', '.11111111.', '.22222222.', '.33333333.', '.44444444.', '..........'],
  ['1.1.1.1.1.', '.2.2.2.2.2', '3.3.3.3.3.', '.4.4.4.4.4', '5.5.5.5.5.', '.1.1.1.1.1'],
  ['....99....', '...9339...', '..933339..', '.93344339.', '9334554339', '.93344339.', '..933339..'],
  ['XXXX..XXXX', '1111..1111', '2222..2222', '3333333333', '4444444444', '..55555555'],
  ['5555555555', '4X4X4X4X4X', '3333333333', 'X2X2X2X2X2', '1111111111', '9999999999'],
];
const BC = ['', '#60a5fa', '#34d399', '#fbbf24', '#f97316', '#f43f5e', '', '', '', '#a78bfa'];
const PU = [['M', '#f472b6', '멀티볼'], ['W', '#34d399', '넓게'], ['L', '#f87171', '레이저'], ['S', '#60a5fa', '슬로우'], ['+', '#fde047', '+1 목숨'], ['F', '#fb923c', '파이어볼']];
GAME({
  title: '벽돌깨기', w: 800, h: 640, bg: '#0b0d22', controls: 'lr+ab',
  help: '마우스 또는 ←→ 로 패들 이동\n클릭/Space로 발사 (레이저도 발사)\n아이템: M 멀티볼 · W 넓게 · L 레이저 · S 슬로우 · + 목숨 · F 파이어볼\n모든 벽돌을 깨면 다음 스테이지!',
  init(g) {
    S = { lives: 3, stage: 0, pad: { x: 340, w: 120 }, balls: [], bricks: [], drops: [], lasers: [], wide: 0, laser: 0, slow: 0, fire: 0, useMouse: false };
    loadStage(g);
  },
  update(g, dt) {
    const P = S.pad;
    if (g.mouse.moved) S.useMouse = true;
    if (g.left || g.right) S.useMouse = false;
    const tw = S.wide > 0 ? 190 : 120;
    P.w += (tw - P.w) * Math.min(1, dt * 10);
    if (S.useMouse) P.x = g.mouse.x - P.w / 2; else P.x += (g.right - g.left) * 700 * dt;
    P.x = U.clamp(P.x, 0, g.W - P.w);
    g.mouse.moved = false;
    ['wide', 'laser', 'slow', 'fire'].forEach((k) => (S[k] = Math.max(0, S[k] - dt)));
    const fire = g.pressed('a') || g.mouse.clicked;
    if (fire) {
      S.balls.forEach((b) => { if (b.stuck) { b.stuck = false; b.vx = U.rand(-150, 150); b.vy = -420; g.sfx.bounce(); } });
      if (S.laser > 0) { S.lasers.push({ x: P.x + 10, y: 590 }, { x: P.x + P.w - 10, y: 590 }); g.sfx.shoot(); }
    }
    const spd = (420 + S.stage * 40) * (S.slow > 0 ? 0.6 : 1);
    for (const b of S.balls) {
      if (b.stuck) { b.x = P.x + P.w / 2; b.y = 590 - b.r; continue; }
      const sub = 4;
      for (let s = 0; s < sub; s++) {
        const m = Math.hypot(b.vx, b.vy); b.vx = (b.vx / m) * spd; b.vy = (b.vy / m) * spd;
        b.x += (b.vx * dt) / sub; b.y += (b.vy * dt) / sub;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); g.sfx.bounce(); }
        if (b.x > g.W - b.r) { b.x = g.W - b.r; b.vx = -Math.abs(b.vx); g.sfx.bounce(); }
        if (b.y < b.r + 40) { b.y = b.r + 40; b.vy = Math.abs(b.vy); g.sfx.bounce(); }
        if (b.vy > 0 && b.y + b.r > 590 && b.y < 605 && b.x > P.x - b.r && b.x < P.x + P.w + b.r) {
          const t = (b.x - (P.x + P.w / 2)) / (P.w / 2);
          const a = -Math.PI / 2 + t * 1.1;
          b.vx = Math.cos(a) * spd; b.vy = Math.sin(a) * spd; b.y = 590 - b.r;
          g.sfx.bounce(); S.combo = 0;
        }
        for (const br of S.bricks) {
          if (br.dead || !U.circRect(b, br)) continue;
          if (!(S.fire > 0 && br.hp < 99)) {
            const ox = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r)), oy = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
            if (ox < oy) b.vx = b.x < br.x + br.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
            else b.vy = b.y < br.y + br.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
          }
          hitBrick(g, br, S.fire > 0);
          break;
        }
      }
    }
    S.balls = S.balls.filter((b) => b.y < g.H + 20);
    if (!S.balls.length) {
      S.lives--; g.sfx.lose(); g.shake(10);
      if (S.lives <= 0) return g.over(`스테이지 ${S.stage + 1}`);
      S.wide = S.laser = S.fire = S.slow = 0;
      S.balls = [{ x: 0, y: 0, vx: 0, vy: -1, r: 8, stuck: true }];
    }
    for (const l of S.lasers) {
      l.y -= 900 * dt;
      for (const br of S.bricks) if (!br.dead && l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + br.h) { hitBrick(g, br); l.dead = true; break; }
    }
    S.lasers = S.lasers.filter((l) => !l.dead && l.y > 30);
    for (const d of S.drops) {
      d.y += 180 * dt;
      if (d.y > 580 && d.y < 610 && d.x > P.x - 15 && d.x < P.x + P.w + 15) {
        d.dead = true; g.sfx.power(); g.float(d.x, 560, PU[d.t][2], PU[d.t][1]);
        const k = PU[d.t][0];
        if (k === 'M') { const src = S.balls[0] || { x: P.x, y: 580, vx: 0, vy: -1 }; for (let i = 0; i < 2; i++) S.balls.push({ x: src.x, y: src.y, vx: U.rand(-1, 1), vy: -1, r: 8 }); }
        if (k === 'W') S.wide = 15; if (k === 'L') S.laser = 10; if (k === 'S') S.slow = 10; if (k === '+') S.lives++; if (k === 'F') S.fire = 8;
      }
    }
    S.drops = S.drops.filter((d) => !d.dead && d.y < g.H);
    if (S.bricks.every((b) => b.dead || b.hp >= 99)) { g.add(1000 * (S.stage + 1)); g.sfx.win(); S.stage++; if (S.stage >= LV.length * 2) return g.win('모든 스테이지 클리어!'); loadStage(g); }
    g.info = `스테이지 ${S.stage + 1} · ❤️${S.lives}`;
  },
  draw(g, c) {
    g.rect(0, 0, g.W, 40, '#060816');
    let x = 10;
    [['wide', 'W'], ['laser', 'L'], ['slow', 'S'], ['fire', 'F']].forEach(([k, n]) => { if (S[k] > 0) { g.text(`${n} ${S[k].toFixed(0)}s`, x + 30, 20, 16, PU.find((p) => p[0] === n)[1]); x += 70; } });
    g.text('❤️'.repeat(Math.min(S.lives, 8)), g.W - 10, 20, 18, '#fff', 'right');
    for (const b of S.bricks) {
      if (b.dead) continue;
      const col = b.hp >= 99 ? '#6b7280' : BC[b.base];
      g.rrect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4, col);
      g.rect(b.x + 4, b.y + 4, b.w - 8, 4, 'rgba(255,255,255,.3)');
      if (b.hp > 1 && b.hp < 99) g.text(b.hp, b.x + b.w / 2, b.y + b.h / 2 + 2, 14, 'rgba(0,0,0,.6)');
    }
    for (const d of S.drops) { g.rrect(d.x - 16, d.y - 10, 32, 20, 8, PU[d.t][1]); g.text(PU[d.t][0], d.x, d.y + 1, 15, '#111'); }
    for (const l of S.lasers) g.rect(l.x - 2, l.y, 4, 16, '#f87171');
    const P = S.pad;
    g.rrect(P.x, 590, P.w, 14, 7, S.laser > 0 ? '#f87171' : '#e5e7eb');
    if (S.laser > 0) { g.rect(P.x + 6, 584, 8, 8, '#fca5a5'); g.rect(P.x + P.w - 14, 584, 8, 8, '#fca5a5'); }
    for (const b of S.balls) {
      if (S.fire > 0) g.circle(b.x, b.y, b.r + 4, 'rgba(251,146,60,.4)');
      g.circle(b.x, b.y, b.r, S.fire > 0 ? '#fb923c' : '#fff');
    }
    if (S.balls.some((b) => b.stuck)) g.text('클릭 또는 Space로 발사', g.W / 2, 450, 22, 'rgba(255,255,255,.7)');
  },
});
function loadStage(g) {
  const map = LV[S.stage % LV.length], lvBoost = Math.floor(S.stage / LV.length);
  S.bricks = [];
  const bw = 76, bh = 26, ox = (g.W - 10 * bw) / 2;
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const hp = ch === 'X' ? 99 : ch === '9' ? 3 + lvBoost : Math.max(1, Math.ceil(+ch / 2)) + lvBoost;
    S.bricks.push({ x: ox + x * bw, y: 80 + y * bh, w: bw, h: bh, hp, base: ch === 'X' ? 0 : +ch, dead: false });
  }));
  S.balls = [{ x: 0, y: 0, vx: 0, vy: -1, r: 8, stuck: true }];
  S.drops = []; S.lasers = [];
}
function hitBrick(g, br, force) {
  if (br.hp >= 99 && !force) { g.sfx.bounce(); return; }
  br.hp = force ? 0 : br.hp - 1;
  g.sfx.hit();
  if (br.hp <= 0) {
    br.dead = true;
    S.combo = (S.combo || 0) + 1;
    g.add(10 * br.base * Math.min(S.combo, 10) || 50);
    g.burst(br.x + br.w / 2, br.y + br.h / 2, BC[br.base] || '#999', 14);
    if (Math.random() < 0.16) S.drops.push({ x: br.x + br.w / 2, y: br.y, t: U.randi(PU.length) });
  }
}
