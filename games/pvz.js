let S;
const ROWS = 5, COLS = 9, TW = 90, TH = 100, OX = 140, OY = 110;
const PL = [
  { k: 'sun', e: '🌻', n: '해바라기', cost: 50, hp: 300, cd: 7 }, { k: 'pea', e: '🌱', n: '완두슈터', cost: 100, hp: 300, cd: 7 },
  { k: 'wall', e: '🥜', n: '호두벽', cost: 50, hp: 2500, cd: 25 }, { k: 'ice', e: '🧊', n: '얼음슈터', cost: 175, hp: 300, cd: 7 },
  { k: 'rep', e: '🌵', n: '쌍발선인장', cost: 200, hp: 300, cd: 7 }, { k: 'cherry', e: '🍒', n: '체리폭탄', cost: 150, hp: 9999, cd: 30 },
  { k: 'mine', e: '🥔', n: '감자지뢰', cost: 25, hp: 300, cd: 20 },
];
const ZT = { norm: { e: '🧟', hp: 200, sp: 14 }, cone: { e: '🧟‍♂️', hp: 560, sp: 14 }, bucket: { e: '🧟‍♀️', hp: 1100, sp: 13 }, run: { e: '🏃', hp: 170, sp: 32 }, boss: { e: '🧌', hp: 3000, sp: 9 } };
GAME({
  title: '좀비 정원 디펜스', w: 1000, h: 640, bg: '#365314', controls: 'none',
  help: '위쪽 카드를 클릭 → 잔디를 클릭해서 식물 심기 · ☀️ 햇빛을 클릭해서 모으기\n🌻 해바라기로 햇빛을 벌고, 🌱 슈터로 좀비를 막아요\n🥜 호두벽 · 🧊 감속 · 🍒 범위 폭발 · 🥔 지뢰 · 🧹 삽으로 식물 제거\n좀비가 집에 들어오면 끝! (줄마다 잔디깎기 1회 방어) · 10스테이지',
  init(g) { S = { lvl: 0 }; load(g); },
  update(g, dt) {
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { if (S.lvl >= 10) return g.win('정원을 끝까지 지켰다!'); load(g); } return; }
    S.t += dt;
    PL.forEach((p, i) => { S.cds[i] = Math.max(0, S.cds[i] - dt); });
    // 입력
    if (g.mouse.clicked) {
      const sun = S.suns.find((s) => U.dist(s.x, s.y, g.mouse.x, g.mouse.y) < 34);
      if (sun) { sun.got = true; S.sun += 25; g.sfx.coin(); }
      else {
        PL.forEach((p, i) => { if (i < S.avail && g.inRect(140 + i * 92, 6, 86, 96)) { S.sel = S.sel === i ? -1 : i; g.sfx.click(); } });
        if (g.inRect(920, 6, 70, 96)) { S.sel = S.sel === 'shovel' ? -1 : 'shovel'; g.sfx.click(); }
        const c = Math.floor((g.mouse.x - OX) / TW), r = Math.floor((g.mouse.y - OY) / TH);
        if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
          const ex = S.plants.find((p) => p.r === r && p.c === c);
          if (S.sel === 'shovel' && ex) { ex.dead = true; S.sel = -1; g.sfx.drop(); }
          else if (typeof S.sel === 'number' && S.sel >= 0 && !ex) { const P = PL[S.sel]; if (S.sun >= P.cost && S.cds[S.sel] <= 0) { S.sun -= P.cost; S.cds[S.sel] = P.cd; S.plants.push({ ...P, r, c, hp: P.hp, t: P.k === 'sun' ? 5 : 1.4, arm: P.k === 'mine' ? 12 : 0, fuse: P.k === 'cherry' ? 1 : 0 }); g.sfx.tone(300, 0.08, 'triangle', 0.08); S.sel = -1; } else g.sfx.hit(); }
        }
      }
    }
    // 하늘 햇빛
    S.skySun -= dt; if (S.skySun <= 0) { S.skySun = 9; S.suns.push({ x: U.rand(OX + 40, OX + COLS * TW - 40), y: 60, ty: U.rand(OY + 50, OY + ROWS * TH - 50), life: 12 }); }
    for (const s of S.suns) { if (s.y < s.ty) s.y += 60 * dt; s.life -= dt; } S.suns = S.suns.filter((s) => !s.got && s.life > 0);
    // 식물
    for (const p of S.plants) {
      p.t -= dt;
      const px = OX + p.c * TW + TW / 2, py = OY + p.r * TH + TH / 2;
      if (p.k === 'sun' && p.t <= 0) { p.t = 22; S.suns.push({ x: px + 20, y: py - 20, ty: py + 10, life: 12 }); }
      if ((p.k === 'pea' || p.k === 'ice' || p.k === 'rep') && p.t <= 0 && S.zs.some((z) => z.r === p.r && z.x > px - 20 && z.x < OX + COLS * TW + 30)) { p.t = 1.45; const n = p.k === 'rep' ? 2 : 1; for (let k = 0; k < n; k++) S.peas.push({ x: px + 20 + k * 22, r: p.r, ice: p.k === 'ice' }); }
      if (p.k === 'mine') { p.arm -= dt; if (p.arm <= 0) { const z = S.zs.find((z) => z.r === p.r && Math.abs(z.x - px) < 40); if (z) { boom(g, px, py, 1, 0); p.dead = true; } } }
      if (p.k === 'cherry') { p.fuse -= dt; if (p.fuse <= 0) { boom(g, px, py, 1.5, 1); p.dead = true; } }
    }
    for (const pe of S.peas) { pe.x += 380 * dt; const z = S.zs.find((z) => z.r === pe.r && Math.abs(z.x - pe.x) < 22); if (z) { pe.dead = true; z.hp -= 20; z.flash = 0.08; if (pe.ice) z.slow = 4; g.sfx.tone(260, 0.03, 'square', 0.02); } if (pe.x > 1000) pe.dead = true; }
    S.peas = S.peas.filter((p) => !p.dead);
    // 좀비
    S.spawnT -= dt;
    if (S.queue.length && S.spawnT <= 0) { const k = S.queue.shift(); const T = ZT[k]; S.zs.push({ k, ...T, r: U.randi(0, ROWS - 1), x: 1010, hp: T.hp, max: T.hp, eat: 0, slow: 0, flash: 0 }); S.spawnT = Math.max(2, 9 - S.lvl * 0.5 - S.t / 30) * U.rand(0.6, 1.3); if (S.queue.length === S.flagAt) { S.wave = 3; g.sfx.tone(120, 1, 'sawtooth', 0.06); for (let k2 = 0; k2 < 3 + S.lvl; k2++) S.queue.unshift(U.choice(['norm', 'cone', 'run'])); S.spawnT = 0.5; } }
    if (S.wave > 0) { S.wave -= dt; S.spawnT = Math.min(S.spawnT, 0.6); }
    for (const z of S.zs) {
      z.slow -= dt; z.flash -= dt;
      const eatP = S.plants.find((p) => p.r === z.r && !p.dead && p.k !== 'mine' && Math.abs(OX + p.c * TW + TW / 2 - z.x) < 34);
      if (eatP) { z.eat -= dt; if (z.eat <= 0) { z.eat = 0.5; eatP.hp -= 50; g.sfx.tone(120, 0.04, 'square', 0.02); if (eatP.hp <= 0) eatP.dead = true; } }
      else z.x -= z.sp * (z.slow > 0 ? 0.5 : 1) * dt;
      if (z.x < OX - 10) { if (S.mower[z.r]) { S.mower[z.r] = 0; S.mowing.push({ r: z.r, x: OX - 30 }); g.sfx.tone(90, 1, 'sawtooth', 0.06); } else if (z.x < 40) return g.over(`🧠 좀비가 집에 들어왔다! (스테이지 ${S.lvl})`); }
      if (z.hp <= 0 && !z.dead) { z.dead = true; S.kills++; g.add(z.k === 'boss' ? 500 : 50); g.burst(z.x, OY + z.r * TH + 50, '#84cc16', 12); }
    }
    for (const m of S.mowing) { m.x += 500 * dt; for (const z of S.zs) if (z.r === m.r && Math.abs(z.x - m.x) < 40) z.hp = 0; }
    S.mowing = S.mowing.filter((m) => m.x < 1050);
    S.zs = S.zs.filter((z) => !z.dead); S.plants = S.plants.filter((p) => !p.dead);
    if (!S.queue.length && !S.zs.length && !S.clear) { g.add(1000 * S.lvl); g.sfx.win(); S.clear = 2.5; }
    g.info = `스테이지 ${S.lvl}/10 · ☀️${S.sun} · 남은 좀비 ${S.queue.length + S.zs.length}`;
  },
  draw(g, c) {
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) g.rect(OX + col * TW, OY + r * TH, TW, TH, (r + col) % 2 ? '#4d7c0f' : '#65a30d');
    g.rect(0, OY, OX, ROWS * TH, '#a16207'); g.emoji('🏠', 50, OY + ROWS * TH / 2, 90);
    for (let r = 0; r < ROWS; r++) if (S.mower[r]) g.emoji('🚜', OX - 30, OY + r * TH + TH / 2, 36);
    for (const m of S.mowing) g.emoji('🚜', m.x, OY + m.r * TH + TH / 2, 40);
    const hc = Math.floor((g.mouse.x - OX) / TW), hr = Math.floor((g.mouse.y - OY) / TH);
    if (typeof S.sel === 'number' && S.sel >= 0 && hc >= 0 && hr >= 0 && hc < COLS && hr < ROWS) { c.globalAlpha = 0.4; g.emoji(PL[S.sel].e, OX + hc * TW + TW / 2, OY + hr * TH + TH / 2, 60); c.globalAlpha = 1; }
    for (const p of S.plants) { const px = OX + p.c * TW + TW / 2, py = OY + p.r * TH + TH / 2; const bob = Math.sin(g.time * 3 + p.c) * 2; if (p.k === 'mine' && p.arm > 0) c.globalAlpha = 0.5; g.emoji(p.e, px, py + bob, p.k === 'cherry' ? 60 + (1 - p.fuse) * 30 : 60); c.globalAlpha = 1; if (p.hp < p.max) {} if (p.k === 'wall' && p.hp < 1200) g.text('💢', px + 20, py - 20, 18, '#000'); }
    for (const pe of S.peas) g.circle(pe.x, OY + pe.r * TH + TH / 2 - 10, 8, pe.ice ? '#7dd3fc' : '#84cc16');
    for (const z of [...S.zs].sort((a, b) => a.r - b.r)) { c.save(); c.translate(z.x, OY + z.r * TH + TH / 2 - 10); if (z.flash > 0) c.filter = 'brightness(2)'; g.emoji(z.e, 0, Math.sin(g.time * 5 + z.x) * 2, z.k === 'boss' ? 90 : 64); c.restore(); if (z.k === 'cone') g.emoji('🔺', z.x, OY + z.r * TH + 10, 24); if (z.k === 'bucket') g.emoji('🪣', z.x, OY + z.r * TH + 12, 26); if (z.slow > 0) g.ring(z.x, OY + z.r * TH + TH / 2, 26, '#7dd3fc', 2); g.rect(z.x - 20, OY + z.r * TH + 4, 40 * z.hp / z.max, 4, '#ef4444'); }
    for (const s of S.suns) { g.emoji('☀️', s.x, s.y, 50 + Math.sin(g.time * 4) * 4); }
    for (const b of S.booms) { b.t -= 1 / 60; c.globalAlpha = Math.max(0, b.t * 2); g.circle(b.x, b.y, b.r * (1 - b.t), '#f97316'); c.globalAlpha = 1; }
    S.booms = S.booms.filter((b) => b.t > 0);
    // 상단 카드
    g.rect(0, 0, 1000, 108, '#713f12');
    g.rrect(20, 6, 110, 96, 12, '#fef3c7'); g.emoji('☀️', 75, 36, 40); g.text(S.sun, 75, 82, 24, '#92400e');
    PL.forEach((p, i) => { if (i >= S.avail) return; const x = 140 + i * 92, can = S.sun >= p.cost && S.cds[i] <= 0; g.rrect(x, 6, 86, 96, 10, S.sel === i ? '#fde047' : can ? '#d9f99d' : '#a8a29e', '#365314', 2); g.emoji(p.e, x + 43, 40, 44); g.text(p.cost, x + 43, 86, 16, '#1a2e05'); if (S.cds[i] > 0) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x, 6, 86, 96 * (S.cds[i] / p.cd)); } });
    g.rrect(920, 6, 70, 96, 10, S.sel === 'shovel' ? '#fde047' : '#a8a29e', '#365314', 2); g.emoji('🧹', 955, 54, 44);
    if (S.wave > 0) g.text('🚩 대규모 좀비 출현!', 570, 360, 36, '#f87171');
    if (S.clear > 0) g.text(`스테이지 ${S.lvl} 클리어!`, 570, 360, 44, '#fde047');
  },
});
function load(g) {
  S.lvl++; const L = S.lvl;
  S.sun = 150; S.plants = []; S.zs = []; S.peas = []; S.suns = []; S.mowing = []; S.booms = [];
  S.mower = Array(ROWS).fill(1); S.cds = PL.map(() => 0); S.sel = -1; S.t = 0; S.skySun = 3; S.spawnT = 20; S.kills = 0; S.wave = 0; S.clear = 0;
  S.avail = Math.min(PL.length, 2 + L);
  const pool = ['norm', 'norm', ...(L >= 2 ? ['cone'] : []), ...(L >= 4 ? ['run', 'cone'] : []), ...(L >= 5 ? ['bucket'] : [])];
  S.queue = Array.from({ length: 8 + L * 3 }, () => U.choice(pool));
  if (L % 5 === 0) S.queue.push('boss');
  S.flagAt = Math.floor(S.queue.length / 2);
}
function boom(g, x, y, rad, big) {
  g.sfx.explode(); g.shake(8);
  S.booms.push({ x, y, r: TW * rad * 1.2, t: 0.5 });
  for (const z of S.zs) { const zy = OY + z.r * TH + TH / 2; if (Math.abs(z.x - x) < TW * rad && Math.abs(zy - y) < TH * rad) z.hp -= big ? 1800 : 1200; }
}
