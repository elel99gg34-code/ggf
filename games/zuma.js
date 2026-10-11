'use strict';
let S;
const ZM_R = 15, ZM_D = 30;
const ZM_COL = ['#ef4444', '#22c55e', '#3b82f6', '#facc15', '#a855f7', '#f8fafc'];
const ZM_LEVELS = [
  { path: 0, balls: 50, colors: 4, speed: 34, name: '태양의 신전' },
  { path: 1, balls: 60, colors: 4, speed: 38, name: '뱀의 계곡' },
  { path: 2, balls: 70, colors: 4, speed: 42, name: '달의 연못' },
  { path: 0, balls: 80, colors: 5, speed: 44, name: '황금 나선' },
  { path: 3, balls: 85, colors: 5, speed: 46, name: '쌍둥이 고리' },
  { path: 1, balls: 95, colors: 5, speed: 50, name: '독사의 길' },
  { path: 2, balls: 105, colors: 6, speed: 52, name: '비의 제단' },
  { path: 3, balls: 115, colors: 6, speed: 56, name: '해골의 문' },
  { path: 0, balls: 130, colors: 6, speed: 60, name: '최후의 피라미드' },
];
GAME({
  title: '주마 구슬', w: 960, h: 640, bg: '#3f2a14', controls: 'lr+ab', aLabel: '발사', bLabel: '교체',
  help: '마우스로 조준 · 클릭 발사 · 우클릭/Space+Shift 구슬 교체\n키보드: ←→ 조준 회전 · Space 발사 · Shift/X 교체\n같은 색 3개 이상을 맞추면 펑! 끊긴 양쪽 색이 같으면 끌려와 연쇄 콤보\n특수구슬: ⏪ 후퇴 · 🐢 감속 · 💣 폭발 · 🎯 조준선\n구슬이 해골 구멍에 닿으면 생명 -1 · 9개 스테이지',
  init(g) { S = { level: 0, lives: 3, total: 0 }; buildLevel(g); },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    if (S.phase === 'clear') { S.timer -= dt; if (S.timer < 1.8 && S.bonusS < S.L) { S.bonusS += 18; g.add(10, pos(Math.min(S.bonusS, S.L - 1))[0], pos(Math.min(S.bonusS, S.L - 1))[1]); } if (S.timer <= 0) { S.level++; if (S.level >= ZM_LEVELS.length) return g.win(`모든 신전 정복! 생명 ${S.lives}`); buildLevel(g); } return; }
    if (S.phase === 'lose') { S.timer -= dt; for (const b of S.chain) b.s += 600 * dt; S.chain = S.chain.filter((b) => b.s < S.L); if (S.timer <= 0) { if (S.lives <= 0) return g.over(`${ZM_LEVELS[S.level].name}에서 패배`); buildLevel(g); } return; }
    // aim
    if (g.mouse.moved || g.mouse.down) S.aim = Math.atan2(g.mouse.y - S.fy, g.mouse.x - S.fx);
    S.aim += ((g.held('right') ? 1 : 0) - (g.held('left') ? 1 : 0)) * 3 * dt;
    if (g.mouse.clicked || (g.pressed('a') && !g.held('b'))) shoot(g);
    if (g.mouse.rclick || g.pressed('b')) { const t = S.ball; S.ball = S.next; S.next = t; g.sfx.click(); }
    for (const k of ['slow', 'rev', 'aimT']) if (S[k] > 0) S[k] -= dt;
    moveChain(g, dt);
    moveShots(g, dt);
    if (S.chain.length) { const head = S.chain[S.chain.length - 1]; S.danger = head.s / S.L; if (head.s >= S.L - ZM_R) { loseLife(g); return; } }
    else if (S.spawnLeft <= 0) { clearLevel(g); return; }
    if (S.danger > 0.85 && Math.floor(S.t * 3) !== Math.floor((S.t - dt) * 3)) g.sfx.beep(220, 0.06);
    // ensure shooter colors exist
    const present = colorsPresent();
    if (present.size && !present.has(S.ball.c)) S.ball = { c: U.choice([...present]), p: null };
    if (present.size && !present.has(S.next.c)) S.next = { c: U.choice([...present]), p: null };
    g.info = `${S.level + 1}. ${ZM_LEVELS[S.level].name} · ❤️${S.lives}`;
  },
  draw(g, c) {
    // ground
    g.rect(0, 0, 960, 640, '#6b4f2a');
    for (let i = 0; i < 60; i++) g.rect((i * 157) % 960, (i * 89) % 640, 40, 20, 'rgba(0,0,0,.05)');
    // path track
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#3b2a14'; c.lineWidth = ZM_D + 12; c.beginPath();
    for (let s = 0; s < S.L; s += 6) { const [x, y] = pos(s); s ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.strokeStyle = '#8b6b3e'; c.lineWidth = ZM_D + 2; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 2; c.setLineDash([6, 10]); c.stroke(); c.setLineDash([]);
    // danger glow on last part
    const [hx, hy] = pos(S.L - 1);
    g.circle(hx, hy, 34, '#111'); g.emoji('💀', hx, hy, 46);
    if (S.danger > 0.75) g.ring(hx, hy, 40 + Math.sin(S.t * 10) * 5, '#ef4444', 4);
    const [sx, sy] = pos(0); g.circle(sx, sy, 26, '#1c1917'); g.ring(sx, sy, 26, '#a16207', 4);
    // chain
    for (const b of S.chain) { if (b.s < 0) continue; const [x, y] = pos(b.s); drawBall(g, x, y, b.c, b.p, b.flash); }
    // shots
    for (const s of S.shots) drawBall(g, s.x, s.y, s.c, s.p);
    // aim line
    if (S.aimT > 0) { c.setLineDash([4, 8]); g.line(S.fx, S.fy, S.fx + Math.cos(S.aim) * 700, S.fy + Math.sin(S.aim) * 700, ZM_COL[S.ball.c], 2); c.setLineDash([]); }
    // frog
    c.save(); c.translate(S.fx, S.fy); c.rotate(S.aim + Math.PI / 2);
    g.circle(0, 0, 42, '#15803d'); g.circle(0, 0, 36, '#22c55e');
    g.circle(-14, -24, 10, '#fff'); g.circle(14, -24, 10, '#fff'); g.circle(-14, -26, 5, '#000'); g.circle(14, -26, 5, '#000');
    drawBall(g, 0, -40 + S.recoil * 10, S.ball.c, S.ball.p);
    drawBall(g, 0, 18, S.next.c, S.next.p, 0, 0.55);
    c.restore();
    S.recoil = Math.max(0, S.recoil - 0.08);
    // hud
    g.rrect(10, 10, 230, 40, 10, 'rgba(0,0,0,.35)');
    g.text(`${S.level + 1}. ${ZM_LEVELS[S.level].name}`, 125, 30, 16, '#fde68a');
    const prog = 1 - S.spawnLeft / ZM_LEVELS[S.level].balls;
    g.rrect(720, 16, 220, 20, 8, 'rgba(0,0,0,.4)'); g.rrect(720, 16, 220 * prog, 20, 8, '#facc15'); g.text('주마 게이지', 830, 26, 12, '#111');
    g.text('❤️'.repeat(Math.max(0, S.lives)), 830, 56, 18, '#fff');
    if (S.slow > 0) g.text('🐢 감속', 70, 70, 16, '#a7f3d0');
    if (S.rev > 0) g.text('⏪ 후퇴', 70, 92, 16, '#bfdbfe');
    if (S.msgT > 0) g.text(S.msg, 480, 120, 34, '#fde047');
    if (S.phase === 'clear') { g.rrect(300, 250, 360, 120, 16, 'rgba(0,0,0,.75)', '#facc15', 3); g.text('스테이지 클리어!', 480, 290, 32, '#facc15'); g.text(`최대 콤보 ${S.bestCombo} · 생명 ${S.lives}`, 480, 335, 16, '#fff'); }
    if (S.phase === 'lose') { g.rrect(300, 250, 360, 120, 16, 'rgba(0,0,0,.75)', '#ef4444', 3); g.text(S.lives > 0 ? '생명 -1 💀' : '게임 오버', 480, 300, 34, '#f87171'); }
  },
});
function makePath(type) {
  const pts = [];
  const cx = 480, cy = 340;
  if (type === 0) { // spiral
    for (let t = 0; t <= 1; t += 0.0015) { const a = t * Math.PI * 5.2 + Math.PI, r = 300 * (1 - t) + 85; pts.push([cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 0.85]); }
  } else if (type === 1) { // serpentine
    const rows = 5;
    for (let t = 0; t <= 1; t += 0.001) { const f = t * rows, row = Math.floor(Math.min(f, rows - 0.0001)), k = f - row; const dir = row % 2 ? -1 : 1; let x = dir > 0 ? U.lerp(60, 900, k) : U.lerp(900, 60, k); let y = 70 + row * 115 + Math.sin(k * Math.PI) * 25; if (row === 2 && Math.abs(x - 480) < 120) y = 300 + (y - 300) * 0; pts.push([x, y]); }
  } else if (type === 2) { // big loop around frog then inner
    for (let t = 0; t <= 1; t += 0.0012) { const a = -Math.PI / 2 + t * Math.PI * 3.6, r = 290 - t * 150; pts.push([cx + Math.cos(a) * r * 1.45 + Math.sin(t * 20) * 10, cy + Math.sin(a) * r * 0.95]); }
  } else { // figure eight-ish
    for (let t = 0; t <= 1; t += 0.0012) { const a = t * Math.PI * 3.3 - Math.PI / 2; pts.push([cx + Math.sin(a) * 400, cy + Math.sin(a * 2) * 200 * (1 - t * 0.25) + (t - 0.5) * 120]); }
  }
  // resample uniformly every 2px
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [px, py] = out[out.length - 1];
    const [x, y] = pts[i];
    let d = Math.hypot(x - px, y - py);
    while (d >= 2) { const k = 2 / d; px += (x - px) * k; py += (y - py) * k; out.push([px, py]); d = Math.hypot(x - px, y - py); }
  }
  return out;
}
function pos(s) { const i = U.clamp(Math.round(s / 2), 0, S.path.length - 1); return S.path[i]; }
function buildLevel(g) {
  const lv = ZM_LEVELS[S.level];
  S.path = makePath(lv.path); S.L = (S.path.length - 1) * 2;
  S.fx = 480; S.fy = 340;
  if (lv.path === 1) { S.fy = 300; }
  if (lv.path === 3) { S.fy = 470; }
  S.chain = []; S.shots = []; S.spawnLeft = lv.balls; S.colors = lv.colors; S.speed = lv.speed;
  S.intro = 1; S.t = 0; S.phase = 'play'; S.slow = 0; S.rev = 0; S.aimT = 0; S.combo = 0; S.bestCombo = S.bestCombo || 0; S.danger = 0; S.recoil = 0;
  S.aim = -Math.PI / 2; S.msg = lv.name; S.msgT = 2; S.lastC = -1; S.run = 0;
  S.ball = { c: U.randi(0, S.colors - 1), p: null }; S.next = { c: U.randi(0, S.colors - 1), p: null };
  g.sfx.power();
}
function newChainBall() {
  let c;
  if (S.lastC >= 0 && S.run < 2 && Math.random() < 0.55) c = S.lastC; else c = U.randi(0, S.colors - 1);
  S.run = c === S.lastC ? S.run + 1 : 0; S.lastC = c;
  const p = Math.random() < 0.035 ? U.choice(['rev', 'slow', 'bomb', 'aim']) : null;
  return { c, p, s: 0, flash: 0 };
}
function colorsPresent() { const set = new Set(); for (const b of S.chain) set.add(b.c); return set; }
function segStart(i) { while (i > 0 && S.chain[i].s - S.chain[i - 1].s <= ZM_D + 0.5) i--; return i; }
function moveChain(g, dt) {
  const ch = S.chain;
  // spawn
  while (S.spawnLeft > 0 && (!ch.length || ch[0].s >= 0)) { const b = newChainBall(); b.s = ch.length ? ch[0].s - ZM_D : -ZM_D; ch.unshift(b); S.spawnLeft--; }
  if (!ch.length) return;
  // intro rush
  const head = ch[ch.length - 1];
  let v = S.speed;
  if (S.intro && head.s < S.L * 0.22) v = 420; else S.intro = 0;
  const near = head.s / S.L;
  if (near > 0.8) v *= 0.55;
  if (S.slow > 0) v *= 0.4;
  if (S.rev > 0) v = -60;
  // tail segment moves
  let i = 0;
  const tailEnd = (() => { let k = 0; while (k + 1 < ch.length && ch[k + 1].s - ch[k].s <= ZM_D + 0.5) k++; return k; })();
  for (i = 0; i <= tailEnd; i++) ch[i].s += v * dt;
  // other segments: pull back if matching
  let k = tailEnd + 1;
  while (k < ch.length) {
    let e = k; while (e + 1 < ch.length && ch[e + 1].s - ch[e].s <= ZM_D + 0.5) e++;
    const prev = ch[k - 1];
    if (prev.c === ch[k].c) {
      for (let j = k; j <= e; j++) { ch[j].pull = (ch[j].pull || 120) + 900 * dt; ch[j].s -= ch[j].pull * dt; }
      if (ch[k].s - prev.s <= ZM_D) {
        for (let j = k; j <= e; j++) ch[j].pull = 0;
        g.sfx.tone(300, 0.05, 'square', 0.05);
        if (checkMatch(g, k, true)) return;
      }
    }
    k = e + 1;
  }
  // push resolution
  for (i = 1; i < ch.length; i++) if (ch[i].s < ch[i - 1].s + ZM_D) ch[i].s = ch[i - 1].s + ZM_D;
  for (const b of ch) if (b.flash > 0) b.flash -= dt;
}
function shoot(g) {
  if (S.shots.length >= 2) return;
  const sp = 900;
  S.shots.push({ x: S.fx + Math.cos(S.aim) * 40, y: S.fy + Math.sin(S.aim) * 40, vx: Math.cos(S.aim) * sp, vy: Math.sin(S.aim) * sp, c: S.ball.c, p: null });
  S.ball = S.next;
  const pres = [...colorsPresent()];
  S.next = { c: pres.length ? U.choice(pres) : U.randi(0, S.colors - 1), p: null };
  S.recoil = 1; g.sfx.shoot();
}
function moveShots(g, dt) {
  for (const s of S.shots) {
    const steps = 3;
    for (let k = 0; k < steps && !s.dead; k++) {
      s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
      for (let i = 0; i < S.chain.length; i++) {
        const b = S.chain[i]; if (b.s < 0) continue;
        const [bx, by] = pos(b.s);
        if ((s.x - bx) ** 2 + (s.y - by) ** 2 < (ZM_D - 2) ** 2) { insertBall(g, s, i); s.dead = true; break; }
      }
    }
    if (s.x < -30 || s.x > 990 || s.y < -30 || s.y > 670) s.dead = true;
  }
  S.shots = S.shots.filter((s) => !s.dead);
}
function insertBall(g, s, i) {
  const b = S.chain[i];
  const [bx, by] = pos(b.s), [ax, ay] = pos(Math.min(S.L, b.s + 4));
  const tx = ax - bx, ty = ay - by;
  const ahead = (s.x - bx) * tx + (s.y - by) * ty > 0;
  const idx = ahead ? i + 1 : i;
  const nb = { c: s.c, p: null, s: ahead ? b.s + ZM_D : b.s, flash: 0.2 };
  if (!ahead) { /* push b and following forward */ }
  S.chain.splice(idx, 0, nb);
  // shift touching balls ahead
  for (let j = idx + 1; j < S.chain.length; j++) { if (S.chain[j].s < S.chain[j - 1].s + ZM_D) S.chain[j].s = S.chain[j - 1].s + ZM_D; else break; }
  if (!ahead) { /* ball i now at idx+1 */ }
  g.sfx.tone(500, 0.04, 'triangle', 0.05);
  S.combo = 0;
  if (!checkMatch(g, idx, false)) { S.missStreak = (S.missStreak || 0) + 1; }
}
function checkMatch(g, idx, isChain) {
  const ch = S.chain;
  if (idx < 0 || idx >= ch.length) return false;
  const c = ch[idx].c;
  let a = idx, b = idx;
  while (a > 0 && ch[a - 1].c === c && ch[a].s - ch[a - 1].s <= ZM_D + 0.5) a--;
  while (b < ch.length - 1 && ch[b + 1].c === c && ch[b + 1].s - ch[b].s <= ZM_D + 0.5) b++;
  const n = b - a + 1;
  if (n < 3) return false;
  let removeA = a, removeB = b;
  const powers = [];
  for (let j = a; j <= b; j++) if (ch[j].p) powers.push([ch[j].p, j]);
  for (const [p, j] of powers) {
    if (p === 'bomb') { removeA = Math.min(removeA, Math.max(0, j - 3)); removeB = Math.max(removeB, Math.min(ch.length - 1, j + 3)); }
    if (p === 'slow') { S.slow = 6; S.msg = '🐢 감속!'; S.msgT = 1; }
    if (p === 'rev') { S.rev = 3; S.msg = '⏪ 후퇴!'; S.msgT = 1; }
    if (p === 'aim') { S.aimT = 12; S.msg = '🎯 조준선!'; S.msgT = 1; }
  }
  if (powers.some((p) => p[0] === 'bomb')) { g.sfx.explode(); g.shake(10, 0.3); S.msg = '💣 폭발!'; S.msgT = 1; }
  S.combo = isChain ? S.combo + 1 : 1;
  S.bestCombo = Math.max(S.bestCombo, S.combo);
  const cnt = removeB - removeA + 1;
  const [mx, my] = pos(ch[Math.floor((removeA + removeB) / 2)].s);
  for (let j = removeA; j <= removeB; j++) { const [x, y] = pos(ch[j].s); g.burst(x, y, ZM_COL[ch[j].c], 8, 200, 0.5); }
  const pts = cnt * 10 * S.combo + (S.combo > 1 ? 100 * S.combo : 0);
  g.add(pts, mx, my - 20);
  if (S.combo > 1) { g.float(mx, my - 50, `콤보 x${S.combo}`, '#fde047', 26); g.shake(3 + S.combo, 0.2); }
  g.sfx.tone(600 + S.combo * 90, 0.12, 'square', 0.07, 1000 + S.combo * 100);
  ch.splice(removeA, cnt);
  // check if the gap merges immediately (both sides touching)
  if (removeA > 0 && removeA < ch.length && ch[removeA].s - ch[removeA - 1].s <= ZM_D + 0.5) checkMatch(g, removeA, true);
  return true;
}
function loseLife(g) {
  S.lives--; S.phase = 'lose'; S.timer = 2.2; g.sfx.lose(); g.shake(14, 0.6);
}
function clearLevel(g) {
  S.phase = 'clear'; S.timer = 3; S.bonusS = 0; g.sfx.win();
  g.add(1000 * (S.level + 1));
  g.burst(S.fx, S.fy, ZM_COL, 60, 400, 1.2);
}
function drawBall(g, x, y, c, p, flash, sc) {
  const r = ZM_R * (sc || 1);
  g.circle(x + 2, y + 3, r, 'rgba(0,0,0,.3)');
  g.circle(x, y, r, ZM_COL[c]);
  g.circle(x - r * 0.35, y - r * 0.35, r * 0.35, 'rgba(255,255,255,.6)');
  if (flash > 0) g.circle(x, y, r, 'rgba(255,255,255,.6)');
  if (p) g.emoji({ rev: '⏪', slow: '🐢', bomb: '💣', aim: '🎯' }[p], x, y, r * 1.2);
}
