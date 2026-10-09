let S;
const C = 34, GROUND = 560;
const MAT = { w: { hp: 60, col: '#b45309', edge: '#78350f', pts: 500, hard: 1 }, s: { hp: 140, col: '#9ca3af', edge: '#4b5563', pts: 800, hard: 2.2 }, g: { hp: 25, col: 'rgba(147,197,253,.7)', edge: '#60a5fa', pts: 300, hard: 0.6 }, p: { hp: 30, pts: 5000, hard: 0.7 }, t: { hp: 80, col: '#dc2626', pts: 1000, hard: 1, tnt: true } };
const BIRDS = { r: { e: '🐦', n: '레드' }, y: { e: '🐤', n: '스피드' }, b: { e: '🐦‍⬛', n: '폭탄' }, u: { e: '🐧', n: '분열' } };
GAME({
  title: '성난 새총', w: 1100, h: 640, bg: '#87ceeb', controls: 'none', particleGravity: 400,
  help: '새를 마우스로 끌어당겼다 놓아 발사!\n비행 중 클릭 = 특수 능력: 🐤 가속 · 🐦‍⬛ 폭발 · 🐧 3마리 분열\n🐷 돼지를 모두 처치하면 클리어 · 남은 새 1마리당 +10000\n재료: 🪵 나무 · 🪨 돌(단단함) · 🧊 유리(약함) · 🧨 TNT',
  init(g) { S = { lvl: 0, total: 0 }; load(g); },
  update(g, dt) {
    const m = g.mouse;
    if (S.state === 'aim') {
      const bx = 200, by = 420;
      if (m.clicked && U.dist(m.x, m.y, bx, by) < 60) S.drag = true;
      if (S.drag) {
        const dx = m.x - bx, dy = m.y - by, d = Math.min(110, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
        S.pull = { x: bx + Math.cos(a) * d, y: by + Math.sin(a) * d, d, a };
        if (m.released) {
          S.drag = false;
          if (d > 20) { const sp = d * 8.5; S.bird = { k: S.queue.shift(), x: S.pull.x, y: S.pull.y, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp, r: 16, rest: 0, used: false, trail: [] }; S.extra = []; S.state = 'fly'; g.sfx.tone(300, 0.2, 'sine', 0.06, 900); }
          S.pull = null;
        }
      }
    } else if (S.state === 'fly') {
      const birds = [S.bird, ...S.extra].filter(Boolean);
      if (m.clicked && !S.bird.used) ability(g);
      for (const b of birds) stepBird(g, b, dt);
      const alive = [S.bird, ...S.extra].filter((b) => b && !b.dead);
      if (!alive.length) { S.state = 'settle'; S.settleT = 1.6; }
    } else if (S.state === 'settle') {
      S.settleT -= dt;
      if (S.settleT <= 0 && S.cells.every((c) => Math.abs(c.vy) < 1)) {
        if (!S.cells.some((c) => c.m === 'p')) { const bonus = S.queue.length * 10000; g.add(bonus); S.msg = `클리어! 남은 새 보너스 +${bonus}`; g.sfx.win(); S.state = 'win'; g.later(() => { S.lvl++; if (S.lvl >= 8) return g.win('모든 스테이지 클리어!'); load(g); }, 2.2); }
        else if (!S.queue.length) { S.state = 'lose'; g.later(() => g.over(`스테이지 ${S.lvl + 1} 실패 · 남은 돼지 ${S.cells.filter((c) => c.m === 'p').length}`), 0.8); }
        else S.state = 'aim';
      }
    }
    physics(g, dt);
    g.info = `스테이지 ${S.lvl + 1} · 🐷${S.cells.filter((c) => c.m === 'p').length}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#7dd3fc'); grd.addColorStop(1, '#e0f2fe'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 5; i++) g.emoji('☁️', (i * 260 + g.time * 8) % 1300 - 100, 70 + (i % 2) * 50, 60);
    c.fillStyle = '#86efac'; c.beginPath(); c.ellipse(300, GROUND + 20, 400, 120, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(900, GROUND + 20, 350, 90, 0, Math.PI, 0); c.fill();
    g.rect(0, GROUND, g.W, g.H - GROUND, '#65a30d'); g.rect(0, GROUND, g.W, 8, '#4d7c0f');
    // 새총
    g.rect(192, 420, 16, GROUND - 420, '#78350f');
    g.line(200, 440, 180, 400, '#78350f', 10); g.line(200, 440, 222, 400, '#78350f', 10);
    if (S.pull) { g.line(180, 405, S.pull.x, S.pull.y, '#3f1d0b', 5); g.line(222, 405, S.pull.x, S.pull.y, '#3f1d0b', 5); }
    for (const cl of S.cells) {
      const x = cl.x, y = cl.y, M = MAT[cl.m];
      c.globalAlpha = cl.flash > 0 ? 0.6 : 1;
      if (cl.m === 'p') g.emoji(cl.hp < M.hp * 0.5 ? '🤕' : '🐷', x + C / 2, y + C / 2, 36);
      else {
        g.rect(x + 1, y + 1, C - 2, C - 2, M.col); g.stroke(x + 1, y + 1, C - 2, C - 2, M.edge, 2);
        if (cl.m === 'w') { g.line(x + 6, y + 10, x + C - 6, y + 10, '#92400e', 1); g.line(x + 6, y + 22, x + C - 6, y + 22, '#92400e', 1); }
        if (cl.m === 't') g.text('TNT', x + C / 2, y + C / 2 + 1, 12, '#fff');
        if (cl.hp < M.hp * 0.5) { g.line(x + 6, y + 6, x + C / 2, y + C / 2, 'rgba(0,0,0,.5)', 2); g.line(x + C / 2, y + C / 2, x + C - 8, y + 12, 'rgba(0,0,0,.5)', 2); }
      }
      c.globalAlpha = 1;
    }
    for (const b of [S.bird, ...(S.extra || [])]) if (b && !b.dead) { b.trail.forEach(([x, y], i) => i % 3 === 0 && g.circle(x, y, 3, 'rgba(255,255,255,.7)')); c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx) * 0.3); c.scale(-1, 1); g.emoji(BIRDS[b.k].e, 0, 0, 38); c.restore(); }
    if (S.state === 'aim') { const nb = S.queue[0]; const p = S.pull || { x: 200, y: 420 }; c.save(); c.translate(p.x, p.y); c.scale(-1, 1); g.emoji(BIRDS[nb].e, 0, 0, 38); c.restore();
      if (S.pull) { const sp = S.pull.d * 8.5, a = S.pull.a; let x = S.pull.x, y = S.pull.y, vx = -Math.cos(a) * sp, vy = -Math.sin(a) * sp; for (let i = 0; i < 40; i++) { for (let k = 0; k < 3; k++) { vy += 500 / 60; x += vx / 60; y += vy / 60; } if (i % 2 === 0) g.circle(x, y, 3, 'rgba(255,255,255,.8)'); } } }
    S.queue.slice(S.state === 'aim' ? 1 : 0).forEach((k, i) => g.emoji(BIRDS[k].e, 150 - i * 36, GROUND - 16, 30));
    if (S.msg && S.state === 'win') g.text(S.msg, g.W / 2, 160, 34, '#fff');
    if (S.state === 'aim' && !S.pull && S.lvl === 0 && S.queue.length >= 3) g.text('👆 새를 뒤로 끌었다 놓으세요', 300, 330, 20, '#1e3a8a');
  },
});
function load(g) {
  const L = S.lvl;
  S.cells = [];
  const add = (gx, gy, m) => S.cells.push({ gx, x: 620 + gx * C, y: GROUND - (gy + 1) * C, vy: 0, m, hp: MAT[m].hp, flash: 0 });
  const R = (n) => U.randi(0, n);
  const towers = 2 + Math.min(3, Math.floor(L / 2));
  let gx = 0;
  for (let t = 0; t < towers; t++) {
    const h = 3 + R(2) + Math.floor(L / 3), w = 2 + R(1), mat = L >= 3 && Math.random() < 0.4 ? 's' : Math.random() < 0.3 ? 'g' : 'w';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y === 0 && x > 0 && x < w - 1) { add(gx + x, y, 'p'); continue; }
      if (x > 0 && x < w - 1 && y < h - 1) { if (y % 2 === 0) add(gx + x, y, 'p'); else add(gx + x, y, mat === 's' ? 'g' : 'w'); continue; }
      add(gx + x, y, y === h - 1 ? (Math.random() < 0.2 ? 'g' : mat) : mat);
    }
    if (w === 2) add(gx, h, 'p');
    else add(gx + 1, h, 'p');
    if (L >= 2 && Math.random() < 0.5) add(gx + w, 0, 't');
    gx += w + 1 + R(1);
  }
  S.cells.forEach((c) => { if (c.x > 1060) c.x = 1060; });
  S.queue = ['r', 'r', 'y', 'b', 'u'].slice(0, 3 + Math.min(2, Math.floor(L / 2)));
  if (L > 0) U.shuffle(S.queue);
  S.state = 'aim'; S.bird = null; S.extra = []; S.msg = '';
}
function physics(g, dt) {
  const cols = {};
  for (const c of S.cells) (cols[c.gx] = cols[c.gx] || []).push(c);
  for (const k in cols) {
    const col = cols[k].sort((a, b) => b.y - a.y);
    let floor = GROUND;
    for (const c of col) {
      c.flash -= dt;
      c.vy += 900 * dt; c.y += c.vy * dt;
      if (c.y + C >= floor) { if (c.vy > 380) dmg(g, c, (c.vy - 380) * 0.25); c.y = floor - C; c.vy = 0; }
      floor = c.y;
    }
  }
  S.cells = S.cells.filter((c) => !c.dead);
}
function dmg(g, c, d) {
  if (c.dead) return;
  c.hp -= d; c.flash = 0.1;
  if (c.hp <= 0) {
    c.dead = true; g.add(MAT[c.m].pts, c.x + C / 2, c.y);
    if (c.m === 'p') { g.sfx.pop(); g.burst(c.x + C / 2, c.y + C / 2, '#86efac', 20, 200); }
    else { g.sfx.hit(); g.burst(c.x + C / 2, c.y + C / 2, MAT[c.m].edge, 10, 200); }
    if (MAT[c.m].tnt) blast(g, c.x + C / 2, c.y + C / 2, 110, 120);
  }
}
function blast(g, x, y, r, power) {
  g.sfx.explode(); g.shake(12); g.burst(x, y, ['#f97316', '#fde047', '#111'], 50, 400);
  for (const c of S.cells) { const d = U.dist(x, y, c.x + C / 2, c.y + C / 2); if (d < r) { dmg(g, c, power * (1 - d / r)); c.vy -= 200 * (1 - d / r); } }
}
function stepBird(g, b, dt) {
  if (b.dead) return;
  const sub = 4;
  for (let s = 0; s < sub; s++) {
    b.vy += (500 * dt) / sub; b.x += (b.vx * dt) / sub; b.y += (b.vy * dt) / sub;
    if (b.y + b.r > GROUND) { b.y = GROUND - b.r; b.vy *= -0.35; b.vx *= 0.75; }
    for (const c of S.cells) {
      if (c.dead || !U.circRect(b, { x: c.x, y: c.y, w: C, h: C })) continue;
      const sp = Math.hypot(b.vx, b.vy), M = MAT[c.m];
      if (sp < 40) continue;
      const d = sp * 0.22 / M.hard * (b.heavy ? 2 : 1);
      dmg(g, c, d);
      if (c.dead && sp > 250) { b.vx *= 0.7; b.vy *= 0.7; }
      else {
        const cx = c.x + C / 2, cy = c.y + C / 2;
        if (Math.abs(b.x - cx) > Math.abs(b.y - cy)) { b.vx = -b.vx * 0.3; b.x = cx + Math.sign(b.x - cx) * (C / 2 + b.r); } else { b.vy = -b.vy * 0.3; b.y = cy + Math.sign(b.y - cy) * (C / 2 + b.r); }
        b.vx *= 0.8;
        // 충격으로 주변 블록에도 피해
        for (const o of S.cells) if (o !== c && U.dist(o.x, o.y, c.x, c.y) < C * 1.5) dmg(g, o, d * 0.25);
      }
      b.used = true;
      break;
    }
  }
  b.trail.push([b.x, b.y]); if (b.trail.length > 60) b.trail.shift();
  if (Math.hypot(b.vx, b.vy) < 30 && b.y > GROUND - 40) b.rest += dt; else b.rest = 0;
  if (b.rest > 1 || b.x > 1150 || b.x < -50) b.dead = true;
}
function ability(g) {
  const b = S.bird; b.used = true;
  if (b.k === 'y') { b.vx *= 2.2; b.vy *= 1.5; b.heavy = true; g.sfx.tone(600, 0.2, 'sawtooth', 0.04, 1600); }
  if (b.k === 'b') { blast(g, b.x, b.y, 130, 160); b.dead = true; }
  if (b.k === 'u') { for (const s of [-1, 1]) S.extra.push({ k: 'u', x: b.x, y: b.y, vx: b.vx, vy: b.vy + s * 160, r: 12, rest: 0, used: true, trail: [] }); g.sfx.pop(); }
}
