let S;
const COLS = ['#facc15', '#a855f7', '#ec4899', '#22d3ee'];
GAME({
  title: '컬러 스위치', w: 480, h: 800, bg: '#18181b', controls: 'none',
  help: '탭/클릭/Space 로 위로 튀어오르기\n공과 같은 색 부분만 통과할 수 있어요!\n🎨 컬러 스위처를 먹으면 공 색이 바뀜\n⭐ 별 = +1 점',
  init(g) { S = { y: 620, vy: 0, cam: 0, col: 0, obs: [], top: 400, started: false }; for (let i = 0; i < 4; i++) addObs(); },
  update(g, dt) {
    const tap = g.pressed('a') || g.pressed('up') || g.mouse.clicked;
    if (!S.started) { if (tap) { S.started = true; S.vy = -560; g.sfx.jump(); } return; }
    if (tap) { S.vy = -560; g.sfx.tone(600, 0.05, 'sine', 0.05, 900); }
    S.vy += 1500 * dt; S.y += S.vy * dt;
    if (S.y - S.cam < 360) S.cam = S.y - 360;
    if (S.y - S.cam > g.H + 20) return die(g);
    for (const o of S.obs) {
      o.a += o.sp * dt;
      if (!o.starGot && Math.abs(S.y - o.y) < 22) { o.starGot = true; g.add(1); g.sfx.coin(); g.burst(g.W / 2, o.y - S.cam, '#fff', 12); }
      if (!o.swGot && Math.abs(S.y - (o.y - o.gap)) < 22) { o.swGot = true; let n; do { n = U.randi(4); } while (n === S.col); S.col = n; g.sfx.power(); }
      if (hit(o)) return die(g);
    }
    if (S.obs[S.obs.length - 1].y > S.cam - 400) addObs();
    S.obs = S.obs.filter((o) => o.y - S.cam < g.H + 300);
  },
  draw(g, c) {
    c.save(); c.translate(0, -S.cam);
    const cx = g.W / 2;
    for (const o of S.obs) {
      c.save(); c.translate(o.kind === 'bar' ? 0 : o.kind === 'cross' ? cx - 75 : cx, o.y);
      if (o.kind === 'ring' || o.kind === 'double') {
        for (const [R, dir] of o.kind === 'double' ? [[o.r, 1], [o.r - 26, -1]] : [[o.r, 1]]) for (let i = 0; i < 4; i++) { c.strokeStyle = COLS[i]; c.lineWidth = 18; c.beginPath(); c.arc(0, 0, R, o.a * dir + (i * Math.PI) / 2, o.a * dir + ((i + 1) * Math.PI) / 2); c.stroke(); }
      } else if (o.kind === 'cross') {
        for (let i = 0; i < 4; i++) { c.save(); c.rotate(o.a + (i * Math.PI) / 2); g.rrect(0, -9, o.r, 18, 9, COLS[i]); c.restore(); }
      } else if (o.kind === 'bar') {
        const w = 120, off = ((o.a * 60) % (w * 4) + w * 4) % (w * 4);
        for (let k = -1; k < 6; k++) g.rect(k * w - off + 0, -10, w, 20, COLS[((k % 4) + 4) % 4]);
      } else if (o.kind === 'square') {
        c.rotate(o.a); const s = o.r;
        [[-s, -s, s, -s], [s, -s, s, s], [s, s, -s, s], [-s, s, -s, -s]].forEach(([x1, y1, x2, y2], i) => g.line(x1, y1, x2, y2, COLS[i], 18));
      }
      c.restore();
      if (!o.starGot) g.emoji('⭐', cx, o.y, 30);
      if (!o.swGot) { c.save(); c.translate(cx, o.y - o.gap); c.rotate(g.time * 2); for (let i = 0; i < 4; i++) { c.fillStyle = COLS[i]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 14, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2); c.fill(); } c.restore(); }
    }
    g.circle(cx, S.y, 13, COLS[S.col]);
    c.restore();
    g.text(g.score, 30, 40, 36, '#fff', 'left');
    if (!S.started) g.text('탭해서 시작', g.W / 2, 720, 26, '#fff');
  },
});
function addObs() {
  const kinds = ['ring', 'ring', 'cross', 'square', 'bar', 'double'];
  const n = S.obs.length;
  const kind = n < 2 ? 'ring' : U.choice(kinds);
  const sp = (1.4 + Math.min(2, S.top < 0 ? -S.top / 4000 : 0)) * (Math.random() < 0.5 ? 1 : -1);
  S.top -= 380;
  S.obs.push({ kind, y: S.top, r: kind === 'cross' ? 140 : kind === 'square' ? 95 : 120, a: U.rand(6), sp, gap: 190, starGot: false, swGot: false });
}
function colorAtAngle(a) { const k = (((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2); return Math.floor(k) % 4; }
function hit(o) {
  const cx = 240, by = S.y, br = 13, dy = by - o.y;
  if (o.kind === 'ring' || o.kind === 'double') {
    for (const [R, dir] of o.kind === 'double' ? [[o.r, 1], [o.r - 26, -1]] : [[o.r, 1]]) for (const yy of [dy - br, dy + br]) {
      if (Math.abs(Math.abs(yy) - R) < 9) { const ang = yy < 0 ? -Math.PI / 2 : Math.PI / 2; if (colorAtAngle(ang - o.a * dir) !== S.col) return true; }
    }
  } else if (o.kind === 'cross') {
    // 십자 막대: 중심이 화면 중앙, 공은 중심 위아래로 지나감 → 막대 끝 근처 수직선 상
    for (let i = 0; i < 4; i++) { const a = o.a + (i * Math.PI) / 2; const ex = Math.cos(a), ey = Math.sin(a); for (let t = 0; t <= o.r; t += 6) { if (U.dist(cx - 75 + ex * t, o.y + ey * t, cx, by) < br + 8 && i !== S.col) return true; } }
  } else if (o.kind === 'bar') {
    if (Math.abs(dy) < 10 + br) { const w = 120, off = ((o.a * 60) % (w * 4) + w * 4) % (w * 4); const k = Math.floor((cx + off) / w); if (((k % 4) + 4) % 4 !== S.col) return true; }
  } else if (o.kind === 'square') {
    const s = o.r;
    const lines = [[-s, -s, s, -s], [s, -s, s, s], [s, s, -s, s], [-s, s, -s, -s]];
    const ca = Math.cos(o.a), sa = Math.sin(o.a);
    for (let i = 0; i < 4; i++) { const [x1, y1, x2, y2] = lines[i]; const ax = cx + x1 * ca - y1 * sa, ay = o.y + x1 * sa + y1 * ca, bx = cx + x2 * ca - y2 * sa, by2 = o.y + x2 * sa + y2 * ca; const dx = bx - ax, dyy = by2 - ay, L = dx * dx + dyy * dyy, t = U.clamp(((cx - ax) * dx + (by - ay) * dyy) / L, 0, 1); if (U.dist(ax + dx * t, ay + dyy * t, cx, by) < br + 9 && i !== S.col) return true; }
  }
  return false;
}
function die(g) { g.sfx.explode(); g.shake(10); g.burst(240, S.y - S.cam, COLS, 50, 400); g.over(`⭐ ${g.score}개`); }
