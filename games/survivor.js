let S;
const WEP = {
  wand: { n: '마법 지팡이', e: '🪄', d: '가장 가까운 적에게 마법탄' },
  whip: { n: '채찍', e: '〰️', d: '좌우를 크게 휩쓸어요' },
  garlic: { n: '마늘 오라', e: '🧄', d: '주변 적에게 지속 피해 + 밀치기' },
  orbit: { n: '수호 성서', e: '📖', d: '주위를 회전하는 성서' },
  bolt: { n: '번개 반지', e: '⚡', d: '무작위 적에게 낙뢰' },
  axe: { n: '도끼', e: '🪓', d: '위로 던져 포물선 관통' },
  knife: { n: '단검', e: '🗡️', d: '바라보는 방향으로 연사' },
};
const PAS = {
  might: { n: '힘의 반지', e: '💪', d: '피해량 +15%' }, haste: { n: '시계', e: '⏱️', d: '쿨다운 -8%' }, swift: { n: '날개', e: '🪽', d: '이동속도 +10%' },
  heart: { n: '심장', e: '❤️', d: '최대 체력 +25, 회복' }, magnet: { n: '자석', e: '🧲', d: '획득 범위 +40%' }, regen: { n: '재생', e: '🌿', d: '초당 체력 회복 +0.6' }, area: { n: '촛대', e: '🕯️', d: '공격 범위 +12%' },
};
const FOES = [
  { e: '🦇', hp: 6, sp: 95, dmg: 6, r: 14, xp: 1, t: 0 }, { e: '🧟', hp: 16, sp: 50, dmg: 10, r: 16, xp: 2, t: 0 },
  { e: '💀', hp: 30, sp: 70, dmg: 12, r: 16, xp: 3, t: 60 }, { e: '👻', hp: 22, sp: 110, dmg: 10, r: 15, xp: 3, t: 120 },
  { e: '🐺', hp: 45, sp: 125, dmg: 14, r: 17, xp: 4, t: 180 }, { e: '🧌', hp: 140, sp: 45, dmg: 22, r: 24, xp: 8, t: 240 },
  { e: '😈', hp: 90, sp: 100, dmg: 18, r: 18, xp: 6, t: 360 },
];
GAME({
  title: '뱀파이어 서바이버', w: 1024, h: 640, bg: '#14201a', controls: 'dpad', noRKey: true,
  help: 'WASD/방향키 이동 (무기는 자동 공격)\n💠 경험치 보석을 모아 레벨업 → 업그레이드 3개 중 선택 (1/2/3 또는 클릭)\n2분마다 보스 등장! 보스는 보물상자를 떨어뜨려요\n🍗 체력 회복 · 10분 생존 시 승리',
  init(g) {
    S = { p: { x: 0, y: 0, hp: 100, max: 100, face: 1, fx: 1, fy: 0, inv: 0 }, foes: [], gems: [], shots: [], fx: [], items: [], lvl: 1, xp: 0, need: 5, kills: 0,
      wep: { wand: 1 }, pas: {}, cd: {}, spawnT: 0, choice: null, bossAt: 120, orbA: 0, garlicT: 0 };
  },
  update(g, dt) {
    if (S.choice) return choose(g);
    const P = S.p, st = stats();
    let mx = g.right - g.left, my = g.down - g.up;
    if (g.mouse.down) { const dx = g.mouse.x - g.W / 2, dy = g.mouse.y - g.H / 2, d = Math.hypot(dx, dy); if (d > 20) { mx = dx / d; my = dy / d; } }
    const ml = Math.hypot(mx, my);
    if (ml) { P.x += (mx / ml) * st.speed * dt; P.y += (my / ml) * st.speed * dt; P.fx = mx / ml; P.fy = my / ml; if (mx) P.face = Math.sign(mx); }
    P.hp = Math.min(P.max, P.hp + st.regen * dt);
    P.inv -= dt;
    const T = g.time;
    // 스폰
    S.spawnT -= dt;
    const rate = 0.9 + T / 30;
    while (S.spawnT <= 0) {
      S.spawnT += 1 / rate;
      if (S.foes.length > 380) break;
      const pool = FOES.filter((f) => f.t <= T);
      const f = U.choice(pool.slice(-3));
      spawn(f, 1 + T / 90);
    }
    if (T >= S.bossAt) { S.bossAt += 120; spawn({ e: '🐲', hp: 600, sp: 75, dmg: 30, r: 40, xp: 50, boss: true }, 1 + T / 60); g.sfx.tone(80, 1, 'sawtooth', 0.08); g.float(g.W / 2, 120, '⚠️ 보스 출현!', '#f87171', 36); }
    if (Math.random() < dt * 0.04) S.items.push({ x: P.x + U.rand(-500, 500), y: P.y + U.rand(-350, 350), k: '🍗' });
    // 무기
    const near = (n = 1, range = 600) => S.foes.filter((f) => U.dist(f.x, f.y, P.x, P.y) < range).sort((a, b) => U.dist(a.x, a.y, P.x, P.y) - U.dist(b.x, b.y, P.x, P.y)).slice(0, n);
    for (const w in S.wep) {
      const L = S.wep[w];
      S.cd[w] = (S.cd[w] || 0) - dt;
      if (w === 'garlic' || w === 'orbit') continue;
      if (S.cd[w] > 0) continue;
      if (w === 'wand') { S.cd[w] = (1.1 - L * 0.08) * st.cd; near(L >= 4 ? 2 + (L >= 6) : 1).forEach((f) => { const a = U.angle(P.x, P.y, f.x, f.y); for (let i = 0; i < (L >= 3 ? 2 : 1); i++) S.shots.push({ x: P.x, y: P.y, vx: Math.cos(a + i * 0.15) * 520, vy: Math.sin(a + i * 0.15) * 520, dmg: (10 + L * 5) * st.dmg, life: 1.2, pierce: 1, r: 8, e: '✨', hit: new Set() }); }); g.sfx.tone(900, 0.04, 'sine', 0.02); }
      if (w === 'whip') { S.cd[w] = 1.3 * st.cd; const sides = L >= 2 ? [1, -1] : [P.face]; sides.forEach((s, i) => g.later(() => slash(g, s, (16 + L * 8) * st.dmg, (160 + L * 15) * st.area), i * 0.15)); }
      if (w === 'bolt') { S.cd[w] = (2.6 - L * 0.2) * st.cd; const vis = S.foes.filter((f) => Math.abs(f.x - P.x) < 520 && Math.abs(f.y - P.y) < 330); U.shuffle(vis).slice(0, 1 + L).forEach((f) => { hurt(g, f, (25 + L * 12) * st.dmg); S.fx.push({ k: 'bolt', x: f.x, y: f.y, t: 0.25 }); }); if (vis.length) g.sfx.tone(1500, 0.1, 'sawtooth', 0.03, 200); }
      if (w === 'axe') { S.cd[w] = 1.6 * st.cd; for (let i = 0; i < Math.ceil(L / 2); i++) S.shots.push({ x: P.x, y: P.y, vx: U.rand(-160, 160) + P.face * 60, vy: -620 - i * 60, g: 1300, dmg: (22 + L * 9) * st.dmg, life: 1.8, pierce: 99, r: 18 * st.area, e: '🪓', spin: true, hit: new Set() }); }
      if (w === 'knife') { S.cd[w] = (0.5 - L * 0.04) * st.cd; for (let i = 0; i < 1 + Math.floor(L / 2); i++) g.later(() => S.shots.push({ x: P.x, y: P.y, vx: P.fx * 700, vy: P.fy * 700, dmg: (7 + L * 4) * st.dmg, life: 0.9, pierce: L >= 5 ? 3 : 1, r: 8, e: '🗡️', ang: Math.atan2(P.fy, P.fx), hit: new Set() }), i * 0.06); }
    }
    if (S.wep.garlic) {
      S.garlicT -= dt; const L = S.wep.garlic, R = (60 + L * 10) * st.area;
      if (S.garlicT <= 0) { S.garlicT = 0.45; for (const f of S.foes) if (U.dist(f.x, f.y, P.x, P.y) < R + f.r) { hurt(g, f, (4 + L * 2.5) * st.dmg); const a = U.angle(P.x, P.y, f.x, f.y); if (!f.boss) { f.x += Math.cos(a) * 12; f.y += Math.sin(a) * 12; } } }
    }
    if (S.wep.orbit) {
      const L = S.wep.orbit, n = Math.min(6, L + 1), R = 100 * st.area; S.orbA += dt * (2.6 + L * 0.2);
      for (let i = 0; i < n; i++) { const a = S.orbA + (i / n) * Math.PI * 2, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R; for (const f of S.foes) if ((f.orbCd || 0) <= T && U.dist(f.x, f.y, ox, oy) < f.r + 16) { hurt(g, f, (9 + L * 5) * st.dmg); f.orbCd = T + 0.4; } }
    }
    for (const s of S.shots) {
      if (s.g) s.vy += s.g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const f of S.foes) if (!f.dead && !s.hit.has(f) && U.dist(s.x, s.y, f.x, f.y) < f.r + s.r) { s.hit.add(f); hurt(g, f, s.dmg); if (--s.pierce <= 0) { s.life = 0; break; } }
    }
    S.shots = S.shots.filter((s) => s.life > 0);
    // 적 이동 + 분리
    const grid = new Map();
    for (const f of S.foes) { const k = ((f.x / 50) | 0) + ',' + ((f.y / 50) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(f); }
    for (const f of S.foes) {
      const a = U.angle(f.x, f.y, P.x, P.y);
      f.x += Math.cos(a) * f.sp * dt * (f.slow > 0 ? 0.4 : 1); f.y += Math.sin(a) * f.sp * dt * (f.slow > 0 ? 0.4 : 1);
      f.flash -= dt;
      const cell = grid.get(((f.x / 50) | 0) + ',' + ((f.y / 50) | 0)) || [];
      for (const o of cell) { if (o === f) continue; const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 1, m = f.r + o.r; if (d < m) { f.x += (dx / d) * (m - d) * 0.3; f.y += (dy / d) * (m - d) * 0.3; } }
      if (U.dist(f.x, f.y, P.x, P.y) < f.r + 16) { P.hp -= f.dmg * dt * 1.5; if (P.inv <= 0) { P.inv = 0.3; g.sfx.hit(); } }
      if (U.dist(f.x, f.y, P.x, P.y) > 1400 && !f.boss) f.dead = true;
    }
    S.foes = S.foes.filter((f) => !f.dead);
    // 보석
    for (const e of S.gems) {
      const d = U.dist(e.x, e.y, P.x, P.y);
      if (d < st.magnet || e.pull) { e.pull = true; const a = U.angle(e.x, e.y, P.x, P.y); e.x += Math.cos(a) * 600 * dt; e.y += Math.sin(a) * 600 * dt; }
      if (d < 20) { e.got = true; S.xp += e.v; g.sfx.tone(1200 + Math.random() * 200, 0.03, 'sine', 0.025); }
    }
    S.gems = S.gems.filter((e) => !e.got);
    if (S.gems.length > 400) S.gems.splice(0, S.gems.length - 400);
    for (const it of S.items) if (U.dist(it.x, it.y, P.x, P.y) < 30) {
      it.got = true;
      if (it.k === '🍗') { P.hp = Math.min(P.max, P.hp + 30); g.float(P.x - P.x + g.W / 2, g.H / 2 - 40, '+30 HP', '#4ade80'); g.sfx.power(); }
      if (it.k === '🎁') { g.sfx.win(); levelUp(g, true); }
      if (it.k === '🧲') { S.gems.forEach((e) => (e.pull = true)); g.sfx.power(); }
    }
    S.items = S.items.filter((i) => !i.got && U.dist(i.x, i.y, P.x, P.y) < 1500);
    while (S.xp >= S.need) { S.xp -= S.need; levelUp(g); }
    S.fx = S.fx.filter((f) => (f.t -= dt) > 0);
    g.score = S.kills * 10 + Math.floor(T) * 5;
    if (P.hp <= 0) { g.sfx.explode(); return g.over(`생존 ${U.fmtTime(T)} · 처치 ${S.kills} · Lv ${S.lvl}`); }
    if (T >= 600) { g.add(10000); return g.win(`10분 생존! 처치 ${S.kills}`); }
    g.info = `⏱️ ${U.fmtTime(T)} · 💀${S.kills}`;
  },
  draw(g, c) {
    const P = S.p, ox = g.W / 2 - P.x, oy = g.H / 2 - P.y;
    const tx = ((ox % 64) + 64) % 64, ty = ((oy % 64) + 64) % 64;
    for (let x = tx - 64; x < g.W; x += 64) for (let y = ty - 64; y < g.H; y += 64) { g.rect(x, y, 63, 63, '#18271f'); if ((Math.floor((x - ox) / 64) * 7 + Math.floor((y - oy) / 64) * 13) % 11 === 0) g.emoji('🌿', x + 32, y + 32, 18); }
    c.save(); c.translate(ox, oy);
    const st = stats();
    if (S.wep.garlic) { const R = (60 + S.wep.garlic * 10) * st.area; g.circle(P.x, P.y, R, 'rgba(250,250,210,.08)'); g.ring(P.x, P.y, R, 'rgba(250,250,210,.25)', 2); }
    for (const e of S.gems) { const col = e.v >= 10 ? '#f87171' : e.v >= 3 ? '#4ade80' : '#60a5fa'; g.poly([[e.x, e.y - 7], [e.x + 5, e.y], [e.x, e.y + 7], [e.x - 5, e.y]], col); }
    for (const it of S.items) g.emoji(it.k, it.x, it.y, 30);
    for (const f of S.foes) {
      if (f.x < P.x - 560 || f.x > P.x + 560 || f.y < P.y - 360 || f.y > P.y + 360) continue;
      c.save(); c.translate(f.x, f.y); if (f.x > P.x) c.scale(-1, 1);
      if (f.flash > 0) c.filter = 'brightness(3)';
      g.emoji(f.e, 0, Math.sin(g.time * 10 + f.x) * 2, f.r * 2.2); c.filter = 'none'; c.restore();
      if (f.boss) { g.rect(f.x - 40, f.y - f.r - 16, 80, 6, '#450a0a'); g.rect(f.x - 40, f.y - f.r - 16, (80 * f.hp) / f.max, 6, '#ef4444'); }
    }
    if (S.wep.orbit) { const n = Math.min(6, S.wep.orbit + 1), R = 100 * st.area; for (let i = 0; i < n; i++) { const a = S.orbA + (i / n) * Math.PI * 2; g.emoji('📖', P.x + Math.cos(a) * R, P.y + Math.sin(a) * R, 26); } }
    for (const s of S.shots) { c.save(); c.translate(s.x, s.y); c.rotate(s.spin ? g.time * 12 : s.ang !== undefined ? s.ang + Math.PI * 0.75 : 0); g.emoji(s.e, 0, 0, s.e === '🪓' ? 34 : 22); c.restore(); }
    for (const f of S.fx) {
      if (f.k === 'bolt') { c.globalAlpha = f.t * 4; g.line(f.x + U.rand(-10, 10), f.y - 400, f.x, f.y, '#fef08a', 4); g.circle(f.x, f.y, 26, 'rgba(254,240,138,.5)'); c.globalAlpha = 1; }
      if (f.k === 'slash') { c.globalAlpha = f.t * 4; g.rrect(f.x, f.y - 22, f.w, 44, 20, 'rgba(255,255,255,.75)'); c.globalAlpha = 1; }
    }
    c.save(); c.translate(P.x, P.y); c.scale(-P.face, 1); if (P.inv > 0) c.globalAlpha = 0.6; g.emoji('🧙', 0, Math.sin(g.time * 12) * 2, 40); c.restore();
    g.rect(P.x - 22, P.y + 26, 44, 5, '#450a0a'); g.rect(P.x - 22, P.y + 26, (44 * Math.max(0, P.hp)) / P.max, 5, '#ef4444');
    c.restore();
    g.rect(0, 0, g.W, 12, '#0f172a'); g.rect(0, 0, (g.W * S.xp) / S.need, 12, '#3b82f6');
    g.text(`Lv ${S.lvl}`, g.W - 10, 26, 16, '#93c5fd', 'right');
    g.text(U.fmtTime(g.time), g.W / 2, 34, 26, '#fff');
    let x = 10;
    for (const w in S.wep) { g.emoji(WEP[w].e, x + 14, 36, 22); g.text(S.wep[w], x + 30, 46, 11, '#fde047'); x += 34; }
    x = 10; for (const p in S.pas) { g.emoji(PAS[p].e, x + 14, 66, 18); g.text(S.pas[p], x + 28, 74, 10, '#a5f3fc'); x += 30; }
    if (S.choice) drawChoice(g);
  },
});
function stats() {
  const p = S.pas;
  return { dmg: 1 + 0.15 * (p.might || 0), cd: Math.pow(0.92, p.haste || 0), speed: 190 * (1 + 0.1 * (p.swift || 0)), magnet: 70 * (1 + 0.4 * (p.magnet || 0)), regen: 0.2 + 0.6 * (p.regen || 0), area: 1 + 0.12 * (p.area || 0) };
}
function spawn(f, k) {
  const P = S.p, a = U.rand(Math.PI * 2), d = 620;
  S.foes.push({ ...f, x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d * 0.7, hp: f.hp * k, max: f.hp * k, dmg: f.dmg * Math.sqrt(k), flash: 0 });
}
function hurt(g, f, d) {
  if (f.dead) return;
  f.hp -= d; f.flash = 0.08;
  if (Math.random() < 0.3) g.float(f.x - S.p.x + g.W / 2, f.y - S.p.y + g.H / 2 - 20, Math.round(d), '#fff', 14);
  if (f.hp <= 0) {
    f.dead = true; S.kills++;
    S.gems.push({ x: f.x, y: f.y, v: f.xp });
    if (f.boss) { S.items.push({ x: f.x, y: f.y, k: '🎁' }); g.sfx.explode(); g.shake(10); }
    else if (Math.random() < 0.004) S.items.push({ x: f.x, y: f.y, k: '🧲' });
    g.burst(f.x - S.p.x + g.W / 2, f.y - S.p.y + g.H / 2, '#fca5a5', 5, 120, 0.4);
  }
}
function slash(g, side, dmg, w) {
  const P = S.p, x = side > 0 ? P.x : P.x - w;
  S.fx.push({ k: 'slash', x, y: P.y, w, t: 0.2 });
  for (const f of S.foes) if (f.x + f.r > x && f.x - f.r < x + w && Math.abs(f.y - P.y) < 40 + f.r) hurt(g, f, dmg);
  g.sfx.tone(300, 0.08, 'sawtooth', 0.03, 900);
}
function levelUp(g, chest) {
  S.lvl++; S.need = Math.floor(5 + S.lvl * 4 + Math.pow(S.lvl, 1.6));
  const opts = [];
  for (const w in WEP) if ((S.wep[w] || 0) < 6 && (S.wep[w] || Object.keys(S.wep).length < 6)) opts.push({ t: 'w', k: w });
  for (const p in PAS) if ((S.pas[p] || 0) < 5 && (S.pas[p] || Object.keys(S.pas).length < 6)) opts.push({ t: 'p', k: p });
  U.shuffle(opts);
  if (!opts.length) { S.p.hp = S.p.max; return; }
  if (chest) { apply(U.choice(opts)); g.float(g.W / 2, g.H / 2 - 80, '🎁 보물상자!', '#fde047', 30); return; }
  S.choice = { opts: opts.slice(0, 3), sel: 0 };
  g.sfx.power();
}
function apply(o) {
  if (o.t === 'w') S.wep[o.k] = (S.wep[o.k] || 0) + 1;
  else { S.pas[o.k] = (S.pas[o.k] || 0) + 1; if (o.k === 'heart') { S.p.max += 25; S.p.hp = Math.min(S.p.max, S.p.hp + 40); } }
}
function cardRect(g, i, n) { const w = 260, h = 300, gap = 24, x0 = g.W / 2 - (n * w + (n - 1) * gap) / 2; return [x0 + i * (w + gap), 170, w, h]; }
function choose(g) {
  const C = S.choice, n = C.opts.length;
  if (g.pressed('left')) C.sel = (C.sel + n - 1) % n;
  if (g.pressed('right')) C.sel = (C.sel + 1) % n;
  let pick = -1;
  ['Digit1', 'Digit2', 'Digit3'].forEach((k, i) => g.keyp(k) && i < n && (pick = i));
  if (g.pressed('a')) pick = C.sel;
  for (let i = 0; i < n; i++) { const [x, y, w, h] = cardRect(g, i, n); if (g.inRect(x, y, w, h)) { C.sel = i; if (g.mouse.clicked) pick = i; } }
  if (pick >= 0) { apply(C.opts[pick]); S.choice = null; g.sfx.coin(); }
}
function drawChoice(g) {
  const c = g.ctx, C = S.choice;
  c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, 0, g.W, g.H);
  g.text('⬆️ 레벨 업!', g.W / 2, 110, 44, '#fde047');
  C.opts.forEach((o, i) => {
    const [x, y, w, h] = cardRect(g, i, C.opts.length), D = o.t === 'w' ? WEP[o.k] : PAS[o.k], cur = (o.t === 'w' ? S.wep : S.pas)[o.k] || 0;
    g.rrect(x, y, w, h, 18, i === C.sel ? '#3b2f7a' : '#1e1b4b', i === C.sel ? '#fde047' : '#4c4a8a', 3);
    g.emoji(D.e, x + w / 2, y + 80, 70);
    g.text(D.n, x + w / 2, y + 160, 24, '#fff');
    g.text(cur ? `Lv ${cur} → ${cur + 1}` : '✨ NEW', x + w / 2, y + 195, 18, cur ? '#93c5fd' : '#4ade80');
    g.text(D.d, x + w / 2, y + 240, 15, '#c7d2fe', 'center', 'normal');
    g.text(`[${i + 1}]`, x + w / 2, y + h - 22, 14, '#8b8fc7');
  });
}
