let S;
const T = 40, ROWS = 15;
const THEMES = [
  { sky: ['#5c94fc', '#9cc4ff'], ground: '#c84c0c', top: '#00a800', name: '1-1 초원' },
  { sky: ['#000', '#111'], ground: '#0060a0', top: '#3cbcfc', name: '1-2 지하' },
  { sky: ['#fca044', '#fcd8a8'], ground: '#a85000', top: '#e09050', name: '1-3 사막' },
  { sky: ['#0c0c3c', '#3c3c8c'], ground: '#505070', top: '#9c9cdc', name: '1-4 밤하늘' },
  { sky: ['#300000', '#701010'], ground: '#606060', top: '#a0a0a0', name: '1-5 마왕성' },
];
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
GAME({
  title: '슈퍼 점퍼', w: 960, h: ROWS * T, bg: '#5c94fc', controls: 'lr+ab', aLabel: '⤒', bLabel: '🔥',
  help: '←→ 이동 · Space/Z/↑ 점프 (꾹 = 높이) · Shift/X 달리기 + 🔥 화염구\n❓블록을 아래서 쳐서 아이템 · 🍄 커지기 · 🌻 화염구\n적은 위에서 밟기! 🐢 등껍질은 차서 볼링처럼\n🚩 깃발에 닿으면 클리어 (높을수록 보너스) · 총 5스테이지',
  init(g) { S = { lvl: 0, lives: 3, coins: 0, big: 0 }; load(g); },
  update(g, dt) {
    const P = S.p;
    if (S.clear) { S.clear -= dt; P.vy = 200; if (P.y + P.h < 13 * T) P.y += 200 * dt; else P.x += 150 * dt; if (S.clear <= 0) { S.lvl++; if (S.lvl >= 5) return g.win(`코인 ${S.coins}개 · 전 스테이지 클리어!`); load(g); } return; }
    if (S.dead) { S.dead -= dt; P.vy += 1500 * dt; P.y += P.vy * dt; if (S.dead <= 0) { S.lives--; if (S.lives < 0) return g.over(`스테이지 ${S.lvl + 1} · 코인 ${S.coins}`); S.big = 0; load(g); } return; }
    S.time -= dt; if (S.time <= 0) return die(g);
    const run = g.b, jumpP = g.pressed('a') || g.pressed('up'), jumpH = g.a || g.up;
    const max = run ? 330 : 210, acc = P.ground ? 1400 : 900;
    const dir = g.right - g.left;
    if (dir) { P.vx += dir * acc * dt; P.face = dir; } else if (P.ground) P.vx *= Math.pow(0.0005, dt);
    P.vx = U.clamp(P.vx, -max, max);
    P.coyote = P.ground ? 0.1 : P.coyote - dt;
    P.buf = jumpP ? 0.12 : P.buf - dt;
    if (P.buf > 0 && P.coyote > 0) { P.vy = -620 - Math.abs(P.vx) * 0.25; P.buf = 0; P.coyote = 0; g.sfx.jump(); }
    if (!jumpH && P.vy < -200) P.vy = -200;
    P.vy = Math.min(P.vy + 1700 * dt, 900);
    P.h = S.big ? 70 : 36;
    collide(g, P, dt, true);
    if (P.x < S.cam) { P.x = S.cam; P.vx = 0; }
    if (P.y > g.H + 50) return die(g);
    P.inv -= dt;
    if (S.big === 2 && g.pressed('b') && S.fire.length < 2) { S.fire.push({ x: P.x + P.w / 2, y: P.y + 20, vx: P.face * 500, vy: 100, w: 14, h: 14 }); g.sfx.shoot(); }
    for (const f of S.fire) { f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; const ty = Math.floor((f.y + 14) / T), tx = Math.floor((f.x + 7) / T); if (solid(tx, ty) && f.vy > 0) { f.vy = -380; f.y = ty * T - 14; } if (solid(Math.floor((f.x + (f.vx > 0 ? 14 : 0)) / T), Math.floor((f.y + 7) / T))) f.dead = true; for (const e of S.ens) if (!e.dead && U.rectHit(f, e)) { kill(g, e); f.dead = true; } }
    S.fire = S.fire.filter((f) => !f.dead && Math.abs(f.x - P.x) < 700 && f.y < g.H);
    for (const e of S.ens) {
      if (e.dead) { e.dt -= dt; if (e.flat === undefined) { e.vy += 1500 * dt; e.y += e.vy * dt; } continue; }
      if (Math.abs(e.x - P.x) > 1100) continue;
      e.vy = Math.min(e.vy + 1700 * dt, 900);
      const vx0 = e.vx;
      collide(g, e, dt, false);
      if (e.hitWall) e.vx = -vx0;
      if (e.y > g.H + 100) e.dead = true;
      if (e.shell && e.vx) for (const o of S.ens) if (o !== e && !o.dead && U.rectHit(e, o)) kill(g, o);
      if (U.rectHit(P, e) && P.inv <= 0) {
        if (P.vy > 0 && P.y + P.h - e.y < 22) {
          P.vy = jumpH ? -600 : -380; g.sfx.bounce();
          if (e.type === 'k' && !e.shell) { e.shell = true; e.vx = 0; e.h = 30; e.y += 10; g.add(100, e.x, e.y); }
          else if (e.shell && !e.vx) { e.vx = (P.x < e.x ? 1 : -1) * 550; }
          else if (e.shell) e.vx = 0;
          else { e.dead = true; e.flat = true; e.dt = 0.5; g.add(100, e.x, e.y); }
        } else if (e.shell && !e.vx) { e.vx = (P.x < e.x ? 1 : -1) * 550; e.x += Math.sign(e.vx) * 10; P.inv = 0.2; g.sfx.hit(); }
        else hurt(g);
      }
    }
    S.ens = S.ens.filter((e) => !(e.dead && e.dt < -1));
    for (const it of S.items) {
      if (it.rise > 0) { it.rise -= dt; it.y -= 40 * dt; continue; }
      if (it.k === 'm') { it.vy = Math.min((it.vy || 0) + 1700 * dt, 900); const v0 = it.vx; collide(g, it, dt, false); if (it.hitWall) it.vx = -v0; }
      if (U.rectHit(P, it)) { it.got = true; g.sfx.power(); g.add(1000, it.x, it.y); if (it.k === 'm') { if (!S.big) { S.big = 1; P.y -= 34; } } else { if (!S.big) P.y -= 34; S.big = 2; } }
    }
    S.items = S.items.filter((i) => !i.got && i.y < g.H);
    for (const c of S.coinsOn) if (!c.got && U.rectHit(P, { x: c.x * T + 8, y: c.y * T + 4, w: 24, h: 32 })) { c.got = true; S.coins++; g.add(200); g.sfx.coin(); if (S.coins % 100 === 0) { S.lives++; g.sfx.power(); } }
    S.pops = S.pops.filter((p) => (p.t -= dt) > 0);
    S.bumps.forEach((b) => (b.t -= dt)); S.bumps = S.bumps.filter((b) => b.t > 0);
    if (P.x + P.w > S.flagX * T + 14 && !S.clear) {
      const h = Math.max(0, 13 * T - P.y), bonus = Math.round(h / 40) * 500 + Math.floor(S.time) * 50;
      g.add(bonus, P.x, P.y); g.sfx.win(); S.clear = 3; P.x = S.flagX * T; S.time = 0;
    }
    S.cam = U.clamp(Math.max(S.cam, P.x - 400), 0, S.W * T - g.W);
    g.info = `${THEMES[S.lvl].name} · ❤️${S.lives} · 🪙${S.coins} · ⏱️${Math.ceil(S.time)}`;
  },
  draw(g, c) {
    const th = THEMES[S.lvl];
    const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 8; i++) { const x = ((i * 400 - S.cam * 0.3) % 3200 + 3200) % 3200 - 200; if (S.lvl === 1) continue; g.emoji(S.lvl === 3 ? '⭐' : S.lvl === 4 ? '🔥' : '☁️', x, 80 + (i % 3) * 40, 50); }
    for (let i = 0; i < 6; i++) { const x = ((i * 600 - S.cam * 0.5) % 3600 + 3600) % 3600 - 300; c.fillStyle = S.lvl === 2 ? '#e8b070' : S.lvl === 4 ? '#401010' : 'rgba(0,120,0,.35)'; c.beginPath(); c.ellipse(x, 13 * T, 180, 110, 0, Math.PI, 0); c.fill(); }
    c.save(); c.translate(-Math.round(S.cam), 0);
    const x0 = Math.floor(S.cam / T), x1 = x0 + Math.ceil(g.W / T) + 1;
    for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) {
      const t = S.map[y]?.[x]; if (!t || t === ' ') continue;
      const bump = S.bumps.find((b) => b.x === x && b.y === y), by = y * T - (bump ? Math.sin((1 - bump.t / 0.15) * Math.PI) * 10 : 0), px = x * T;
      if (t === '#') { g.rect(px, by, T, T, th.ground); if (S.map[y - 1]?.[x] !== '#') g.rect(px, by, T, 8, th.top); g.stroke(px, by, T, T, 'rgba(0,0,0,.2)', 1); }
      if (t === 'B') { g.rect(px, by, T, T, '#b45309'); g.line(px, by + T / 2, px + T, by + T / 2, '#451a03', 2); g.line(px + T / 2, by, px + T / 2, by + T / 2, '#451a03', 2); g.line(px + T / 4, by + T / 2, px + T / 4, by + T, '#451a03', 2); g.stroke(px, by, T, T, '#451a03', 2); }
      if (t === '?') { g.rect(px, by, T, T, '#f59e0b'); g.stroke(px + 2, by + 2, T - 4, T - 4, '#92400e', 2); g.text('?', px + T / 2, by + T / 2 + 2, 24, Math.floor(g.time * 3) % 2 ? '#fff' : '#fde68a'); }
      if (t === 'U') { g.rect(px, by, T, T, '#92400e'); g.stroke(px + 2, by + 2, T - 4, T - 4, '#451a03', 2); }
      if (t === 'P') { g.rect(px - 4, by, T + 8, T, '#16a34a'); g.rect(px + 2, by + 4, 8, T - 8, '#4ade80'); g.stroke(px - 4, by, T + 8, T, '#14532d', 2); }
      if (t === 'p') { g.rect(px, by, T, T, '#16a34a'); g.rect(px + 6, by, 8, T, '#4ade80'); g.line(px, by, px, by + T, '#14532d', 2); g.line(px + T, by, px + T, by + T, '#14532d', 2); }
      if (t === 'S') { g.rect(px, by, T, T, '#78716c'); g.stroke(px, by, T, T, '#44403c', 2); }
      if (t === '=') { g.rrect(px, by, T, 16, 4, '#d97706', '#78350f'); }
      if (t === '^') g.poly([[px, by + T], [px + T / 4, by + 10], [px + T / 2, by + T], [px + 3 * T / 4, by + 10], [px + T, by + T]], '#d1d5db', '#6b7280');
    }
    for (const co of S.coinsOn) if (!co.got) { const w = Math.abs(Math.sin(g.time * 4 + co.x)) * 20 + 4; g.rrect(co.x * T + T / 2 - w / 2, co.y * T + 6, w, 28, w / 2, '#facc15', '#a16207'); }
    const fx = S.flagX * T;
    g.rect(fx + 16, 3 * T, 6, 10 * T, '#d1d5db'); g.circle(fx + 19, 3 * T, 8, '#22c55e');
    g.poly([[fx + 16, 3 * T + 10 + (S.clear ? (3 - S.clear) * 120 : 0)], [fx - 30, 3 * T + 28 + (S.clear ? (3 - S.clear) * 120 : 0)], [fx + 16, 3 * T + 46 + (S.clear ? (3 - S.clear) * 120 : 0)]], '#ef4444');
    g.emoji('🏰', fx + 220, 13 * T - 70, 140);
    for (const it of S.items) g.emoji(it.k === 'm' ? '🍄' : '🌻', it.x + 16, it.y + 16, 34);
    for (const p of S.pops) g.emoji('🪙', p.x, p.y - (0.5 - p.t) * 120, 28);
    for (const e of S.ens) {
      if (e.x < S.cam - 60 || e.x > S.cam + g.W + 60) continue;
      c.save(); c.translate(e.x + e.w / 2, e.y + e.h / 2);
      if (e.flat) c.scale(1.2, 0.4); if (e.dead && !e.flat) c.scale(1, -1); if (e.vx > 0 && !e.shell) c.scale(-1, 1);
      g.emoji(e.shell ? '🐚' : e.type === 'k' ? '🐢' : e.type === 'f' ? '🦇' : '🍄‍🟫', 0, 0, e.shell ? 34 : 38); c.restore();
    }
    for (const f of S.fire) g.emoji('🔥', f.x + 7, f.y + 7, 20);
    const P = S.p;
    if (P.inv <= 0 || Math.floor(g.time * 14) % 2) {
      c.save(); c.translate(P.x + P.w / 2, P.y + P.h / 2); c.scale(-P.face, 1);
      const em = S.dead ? '😵' : S.big === 2 ? '🧑‍🚒' : '🧑';
      g.emoji(em, 0, S.big ? 6 : 0, S.big ? 62 : 40);
      if (S.big) g.emoji('🧢', 2, -24, 30); c.restore();
    }
    c.restore();
    if (S.intro > 0) { S.intro -= 1 / 60; c.fillStyle = `rgba(0,0,0,${Math.min(1, S.intro)})`; c.fillRect(0, 0, g.W, g.H); g.text(th.name, g.W / 2, g.H / 2 - 20, 44, '#fff'); g.text(`❤️ × ${S.lives}`, g.W / 2, g.H / 2 + 30, 26, '#fff'); }
  },
});
function solid(x, y) { const t = S.map[y]?.[x]; return t && '#B?UPpS='.includes(t); }
function collide(g, o, dt, isP) {
  o.hitWall = false; o.ground = false;
  o.x += o.vx * dt;
  let y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (solid(tx, y) && S.map[y][tx] !== '=') { o.x = tx * T - o.w; o.vx = 0; o.hitWall = true; } }
  if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (solid(tx, y) && S.map[y][tx] !== '=') { o.x = (tx + 1) * T; o.vx = 0; o.hitWall = true; } }
  const prevB = o.y + o.h;
  o.y += o.vy * dt;
  const xa = Math.floor((o.x + 3) / T), xb = Math.floor((o.x + o.w - 3) / T);
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = xa; x <= xb; x++) if (solid(x, ty) && (S.map[ty][x] !== '=' || prevB <= ty * T + 2)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; break; } if (isP && S.map[ty]?.[xa] === '^' || isP && S.map[ty]?.[xb] === '^') { if (o.y + o.h > ty * T + 14) hurt(g, true); } }
  if (o.vy < 0) {
    const ty = Math.floor(o.y / T);
    const cx = Math.floor((o.x + o.w / 2) / T);
    for (const x of [cx, xa, xb]) if (solid(x, ty) && S.map[ty][x] !== '=') { o.y = (ty + 1) * T; o.vy = 0; if (isP) bump(g, x, ty); break; }
  }
}
function bump(g, x, y) {
  const t = S.map[y][x];
  S.bumps.push({ x, y, t: 0.15 });
  for (const e of S.ens) if (!e.dead && Math.abs(e.x + e.w / 2 - (x * T + T / 2)) < T && Math.abs(e.y + e.h - y * T) < 6) kill(g, e);
  for (const c of S.coinsOn) if (!c.got && c.x === x && c.y === y - 1) { c.got = true; S.coins++; g.add(200); g.sfx.coin(); }
  if (t === '?') {
    S.map[y][x] = 'U';
    const k = S.qItems[x + ',' + y];
    if (k) { S.items.push({ k: S.big ? 'f' : 'm', x: x * T + 4, y: y * T, w: 32, h: 32, vx: 120, vy: 0, rise: 0.8 }); g.sfx.power(); }
    else { S.coins++; g.add(200); g.sfx.coin(); S.pops.push({ x: x * T + T / 2, y: y * T, t: 0.5 }); }
  } else if (t === 'B') {
    if (S.big) { S.map[y][x] = ' '; g.sfx.explode(); g.add(50); g.burst(x * T + 20 - S.cam, y * T + 20, '#b45309', 12, 250); } else g.sfx.bounce();
  } else g.sfx.bounce();
}
function kill(g, e) { if (e.dead) return; e.dead = true; e.vy = -400; e.dt = 0; g.add(200, e.x, e.y); g.sfx.hit(); }
function hurt(g, spike) {
  const P = S.p;
  if (P.inv > 0) return;
  if (S.big) { S.big = 0; P.inv = 2; P.y += 34; g.sfx.hit(); return; }
  die(g);
}
function die(g) { if (S.dead) return; S.dead = 2.5; S.p.vy = -650; g.sfx.lose(); }
function load(g) {
  const R = rng(S.lvl + 7), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const W = 170 + S.lvl * 25;
  const M = Array.from({ length: ROWS }, () => Array(W).fill(' '));
  S.coinsOn = []; S.ens = []; S.qItems = {};
  const ground = (x) => { M[13][x] = '#'; M[14][x] = '#'; };
  for (let x = 0; x < 14; x++) ground(x);
  let x = 14;
  const diff = S.lvl;
  const enemy = (ex, ey, type) => S.ens.push({ type, x: ex * T, y: ey * T - 36, w: 34, h: 36, vx: -60 - diff * 8, vy: 0, dead: false });
  while (x < W - 30) {
    const f = R();
    if (f < 0.16) { const w = ri(2, Math.min(5, 3 + Math.floor(diff / 2))); if (R() < 0.5 && diff > 0) for (let i = 0; i < w; i++) M[9][x + i] = '='; x += w; if (diff >= 3 && R() < 0.5) { for (let i = 0; i < 2; i++) ground(x + i); x += 2; const w2 = ri(2, 4); x += w2; } }
    else if (f < 0.3) { const h = ri(2, 4); for (let i = 0; i < 4; i++) ground(x + i); for (let y = 13 - h; y < 13; y++) { M[y][x + 1] = y === 13 - h ? 'P' : 'p'; M[y][x + 2] = y === 13 - h ? 'P' : 'p'; } if (R() < 0.5) enemy(x + 3, 13, 'g'); x += 4; }
    else if (f < 0.52) { const w = ri(5, 9); for (let i = 0; i < w; i++) ground(x + i); const bx = x + 1, bw = ri(3, 5); for (let i = 0; i < bw; i++) { const q = R() < 0.35; M[9][bx + i] = q ? '?' : 'B'; if (q && R() < 0.3) S.qItems[bx + i + ',9'] = 1; } if (R() < 0.4) { for (let i = 1; i < bw - 1; i++) M[5][bx + i] = R() < 0.3 ? '?' : 'B'; for (let i = 1; i < bw - 1; i++) S.coinsOn.push({ x: bx + i, y: 4 }); } for (let i = 0; i < 1 + (diff > 1); i++) enemy(x + ri(2, w - 1), 13, R() < 0.3 + diff * 0.08 ? 'k' : 'g'); x += w; }
    else if (f < 0.64) { const h = ri(3, 4 + Math.min(2, diff)); for (let i = 0; i < h * 2 + 2; i++) ground(x + i); for (let i = 0; i < h; i++) for (let y = 12 - i; y < 13; y++) { M[y][x + i] = 'S'; M[y][x + h * 2 + 1 - i] = 'S'; } x += h * 2 + 2; if (R() < 0.5) { x += ri(2, 3); } }
    else if (f < 0.76) { const w = ri(6, 10); for (let i = 0; i < w; i++) ground(x + i); for (let i = 0; i < 5; i++) S.coinsOn.push({ x: x + 1 + i, y: 10 - Math.round(Math.sin((i / 4) * Math.PI) * 2) }); if (diff >= 1) enemy(x + w - 2, 13, 'g'); if (diff >= 2) enemy(x + w - 4, 13, 'g'); x += w; }
    else if (f < 0.86 && diff >= 1) { const w = ri(5, 8); for (let i = 0; i < w; i++) ground(x + i); for (let i = 2; i < w - 2; i++) if (R() < 0.6) M[12][x + i] = '^'; for (let i = 1; i < w - 1; i++) M[9][x + i] = '='; S.coinsOn.push({ x: x + Math.floor(w / 2), y: 8 }); x += w; }
    else { const w = ri(6, 9); for (let i = 0; i < w; i++) ground(x + i); for (let i = 0; i < 1 + Math.floor(diff / 2); i++) enemy(x + ri(1, w - 1), 13, R() < 0.25 ? 'k' : 'g'); x += w; }
  }
  for (; x < W; x++) ground(x);
  const sx = W - 28; for (let i = 0; i < 8; i++) for (let y = 12 - i; y < 13; y++) M[y][sx + i] = 'S';
  for (let y = 4; y < 13; y++) M[y][sx + 8] = 'S';
  S.flagX = sx + 11; S.map = M; S.W = W;
  S.p = { x: 80, y: 13 * T - 40, w: 28, h: 36, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buf: 0, inv: 0 };
  if (S.big) { S.p.h = 70; S.p.y -= 34; }
  S.cam = 0; S.items = []; S.fire = []; S.pops = []; S.bumps = []; S.time = 300; S.dead = 0; S.clear = 0; S.intro = 1.6;
  g.W && (document.title = THEMES[S.lvl].name + ' · 슈퍼 점퍼');
}
