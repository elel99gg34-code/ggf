let S;
const GUNS = [
  { n: '권총', e: '🔫', dmg: 20, rate: 0.28, mag: 12, rel: 1.0, spread: 0.03, pel: 1, price: 0, ammo: Infinity, sp: 900 },
  { n: '샷건', e: '💥', dmg: 14, rate: 0.75, mag: 6, rel: 1.8, spread: 0.28, pel: 7, price: 600, ammo: 36, sp: 800 },
  { n: '기관단총', e: '🔥', dmg: 13, rate: 0.07, mag: 35, rel: 1.6, spread: 0.08, pel: 1, price: 1200, ammo: 210, sp: 950 },
  { n: '저격소총', e: '🎯', dmg: 120, rate: 0.9, mag: 5, rel: 2.2, spread: 0, pel: 1, price: 2000, ammo: 30, sp: 1600, pierce: 5 },
  { n: '미니건', e: '⚙️', dmg: 16, rate: 0.035, mag: 150, rel: 3, spread: 0.12, pel: 1, price: 4000, ammo: 600, sp: 1000 },
];
const ZT = [
  { e: '🧟', hp: 40, sp: 55, dmg: 12, r: 16, cash: 20 }, { e: '🧟‍♀️', hp: 30, sp: 85, dmg: 10, r: 15, cash: 25 },
  { e: '🧟‍♂️', hp: 160, sp: 40, dmg: 25, r: 22, cash: 80 }, { e: '🏃', hp: 25, sp: 150, dmg: 8, r: 14, cash: 30 },
];
GAME({
  title: '좀비 서바이벌', w: 1000, h: 680, bg: '#1a1a14', controls: 'dpad+ab', aLabel: '🔄', bLabel: '🔀', noRKey: true,
  help: 'WASD 이동 · 마우스 조준 + 클릭 = 사격 (터치: 자동 조준·사격)\nR 재장전 · 1~5 / 휠 / Q 무기 교체\n웨이브 사이 상점에서 무기·탄약·치료·업그레이드 구매\n좀비가 점점 많고 강해져요. 최대한 버텨라!',
  init(g) {
    S = { p: { x: 500, y: 340, hp: 100, max: 100, a: 0, inv: 0 }, cash: 0, wave: 0, z: [], b: [], blood: [], owned: [0], cur: 0, guns: GUNS.map((gn) => ({ mag: gn.mag, ammo: gn.ammo })), cool: 0, reload: 0, shop: false, pending: 0, spawnT: 0, dmgMul: 1, speedMul: 1, kills: 0, drops: [],
      rocks: [[250, 200, 34], [760, 180, 30], [300, 500, 28], [700, 480, 36], [500, 120, 22]] };
    nextWave(g);
  },
  update(g, dt) {
    if (S.shop) return shop(g);
    const P = S.p, gun = GUNS[S.cur], st = S.guns[S.cur], touch = matchMedia('(pointer: coarse)').matches;
    const mx = g.right - g.left, my = g.down - g.up, ml = Math.hypot(mx, my) || 1;
    move(P, (mx / ml) * 220 * S.speedMul * dt, (my / ml) * 220 * S.speedMul * dt, 16);
    P.x = U.clamp(P.x, 16, g.W - 16); P.y = U.clamp(P.y, 16, g.H - 16);
    let target = null;
    if (touch && S.z.length) target = S.z.reduce((a, b) => (U.dist(a.x, a.y, P.x, P.y) < U.dist(b.x, b.y, P.x, P.y) ? a : b));
    P.a = target ? U.angle(P.x, P.y, target.x, target.y) : U.angle(P.x, P.y, g.mouse.x, g.mouse.y);
    for (let i = 0; i < 5; i++) if (g.keyp('Digit' + (i + 1)) && S.owned.includes(i)) switchGun(g, i);
    if (g.keyp('KeyQ') || g.pressed('b')) { const k = S.owned.indexOf(S.cur); switchGun(g, S.owned[(k + 1) % S.owned.length]); }
    S.cool -= dt;
    if (S.reload > 0) { S.reload -= dt; if (S.reload <= 0) { const need = gun.mag - st.mag, take = Math.min(need, st.ammo); st.mag += take; st.ammo -= take; g.sfx.click(); } }
    if ((g.keyp('KeyR') || (g.pressed('a') && !g.keyp('Space'))) && S.reload <= 0 && st.mag < gun.mag && st.ammo > 0) { S.reload = gun.rel; g.sfx.tone(300, 0.1, 'square', 0.03); }
    const firing = touch ? target && U.dist(target.x, target.y, P.x, P.y) < 450 : g.mouse.down || g.key('Space');
    if (firing && S.cool <= 0 && S.reload <= 0) {
      if (st.mag > 0) {
        st.mag--; S.cool = gun.rate;
        for (let i = 0; i < gun.pel; i++) { const a = P.a + U.rand(-gun.spread, gun.spread); S.b.push({ x: P.x + Math.cos(P.a) * 20, y: P.y + Math.sin(P.a) * 20, vx: Math.cos(a) * gun.sp, vy: Math.sin(a) * gun.sp, dmg: gun.dmg * S.dmgMul, life: 0.8, pierce: gun.pierce || 1, hit: new Set() }); }
        g.sfx.tone(S.cur === 1 ? 120 : 260, 0.06, 'square', 0.05, 60); if (S.cur === 1 || S.cur === 3) g.shake(4, 0.1);
        S.muzzle = 0.05;
      } else if (st.ammo > 0) S.reload = gun.rel; else { S.cool = 0.3; g.sfx.click(); }
    }
    S.muzzle -= dt;
    for (const b of S.b) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (S.rocks.some(([x, y, r]) => U.dist(b.x, b.y, x, y) < r)) b.life = 0;
      for (const z of S.z) if (!z.dead && !b.hit.has(z) && U.dist(b.x, b.y, z.x, z.y) < z.r) {
        b.hit.add(z); z.hp -= b.dmg; z.x += b.vx * 0.008; z.y += b.vy * 0.008; z.flash = 0.05;
        S.blood.push({ x: z.x + U.rand(-10, 10), y: z.y + U.rand(-10, 10), r: U.rand(3, 8) });
        if (z.hp <= 0) { z.dead = true; S.kills++; S.cash += z.cash; g.add(z.cash * 5); g.float(z.x, z.y - 20, '$' + z.cash, '#4ade80', 16); g.sfx.hit(); if (Math.random() < 0.06) S.drops.push({ x: z.x, y: z.y, k: U.choice(['❤️', '📦']), t: 10 }); }
        if (--b.pierce <= 0) { b.life = 0; break; }
      }
    }
    S.b = S.b.filter((b) => b.life > 0);
    if (S.blood.length > 400) S.blood.splice(0, 100);
    S.spawnT -= dt;
    if (S.pending > 0 && S.spawnT <= 0) {
      S.spawnT = Math.max(0.12, 1 - S.wave * 0.06); S.pending--;
      const side = U.randi(4), pos = [[U.rand(g.W), -20], [g.W + 20, U.rand(g.H)], [U.rand(g.W), g.H + 20], [-20, U.rand(g.H)]][side];
      const pool = S.wave < 3 ? [0, 0, 1] : S.wave < 5 ? [0, 1, 1, 3] : [0, 1, 2, 3, 3];
      const t = ZT[U.choice(pool)], k = 1 + S.wave * 0.12;
      S.z.push({ ...t, x: pos[0], y: pos[1], hp: t.hp * k, max: t.hp * k, sp: t.sp * (1 + S.wave * 0.02) * U.rand(0.85, 1.15), atk: 0, flash: 0, wob: U.rand(6) });
    }
    for (const z of S.z) {
      const a = U.angle(z.x, z.y, P.x, P.y);
      move(z, Math.cos(a) * z.sp * dt, Math.sin(a) * z.sp * dt, z.r);
      for (const o of S.z) if (o !== z) { const d = U.dist(z.x, z.y, o.x, o.y); if (d < z.r + o.r && d > 0) { z.x += ((z.x - o.x) / d) * 0.6; z.y += ((z.y - o.y) / d) * 0.6; } }
      z.atk -= dt; z.flash -= dt;
      if (U.dist(z.x, z.y, P.x, P.y) < z.r + 14 && z.atk <= 0) { z.atk = 0.8; P.hp -= z.dmg; g.sfx.hit(); g.shake(6); S.hurt = 0.3; }
    }
    S.z = S.z.filter((z) => !z.dead);
    for (const d of S.drops) { d.t -= dt; if (U.dist(d.x, d.y, P.x, P.y) < 26) { d.t = 0; g.sfx.power(); if (d.k === '❤️') P.hp = Math.min(P.max, P.hp + 30); else S.owned.forEach((i) => i && (S.guns[i].ammo += GUNS[i].mag * 2)); g.float(d.x, d.y, d.k === '❤️' ? '+30 HP' : '탄약!', '#fff'); } }
    S.drops = S.drops.filter((d) => d.t > 0);
    S.hurt -= dt;
    if (P.hp <= 0) { g.sfx.lose(); return g.over(`웨이브 ${S.wave} · 처치 ${S.kills}`); }
    if (!S.pending && !S.z.length) { g.add(500 * S.wave); S.cash += 100 + S.wave * 50; S.shop = true; S.sel = 0; g.sfx.win(); }
    g.info = `웨이브 ${S.wave} · 💀${S.kills} · 💵${S.cash}`;
  },
  draw(g, c) {
    for (let x = 0; x < g.W; x += 80) for (let y = 0; y < g.H; y += 80) g.rect(x, y, 79, 79, (x + y) % 160 ? '#22221a' : '#1f1f18');
    S.blood.forEach((b) => g.circle(b.x, b.y, b.r, 'rgba(120,10,10,.55)'));
    S.rocks.forEach(([x, y, r]) => { g.circle(x, y + 4, r, 'rgba(0,0,0,.4)'); g.circle(x, y, r, '#57534e'); g.circle(x - r * 0.3, y - r * 0.3, r * 0.4, '#78716c'); });
    S.drops.forEach((d) => g.emoji(d.k, d.x, d.y + Math.sin(g.time * 5) * 3, 28));
    for (const z of S.z) {
      c.save(); c.translate(z.x, z.y); if (z.x > S.p.x) c.scale(-1, 1); if (z.flash > 0) c.filter = 'brightness(2.5)';
      g.emoji(z.e, 0, Math.sin(g.time * 6 + z.wob) * 2, z.r * 2.3); c.filter = 'none'; c.restore();
      if (z.hp < z.max) { g.rect(z.x - 16, z.y - z.r - 10, 32, 4, '#450a0a'); g.rect(z.x - 16, z.y - z.r - 10, (32 * z.hp) / z.max, 4, '#ef4444'); }
    }
    S.b.forEach((b) => g.line(b.x, b.y, b.x - b.vx * 0.015, b.y - b.vy * 0.015, '#fde68a', 2));
    const P = S.p;
    c.save(); c.translate(P.x, P.y); c.rotate(P.a);
    g.rect(6, -4, 24, 8, '#374151');
    if (S.muzzle > 0) g.circle(34, 0, 9, '#fde047');
    c.restore();
    g.circle(P.x, P.y, 16, '#2563eb'); g.circle(P.x, P.y, 10, '#fcd34d');
    // HUD
    g.rrect(10, g.H - 70, 280, 60, 10, 'rgba(0,0,0,.6)');
    g.rect(20, g.H - 60, 200, 12, '#450a0a'); g.rect(20, g.H - 60, 200 * Math.max(0, P.hp) / P.max, 12, '#ef4444');
    g.text(`${Math.max(0, Math.ceil(P.hp))}/${P.max}`, 230, g.H - 54, 13, '#fff', 'left');
    const gun = GUNS[S.cur], st = S.guns[S.cur];
    g.text(`${gun.e} ${gun.n}  ${S.reload > 0 ? '재장전...' : st.mag + ' / ' + (st.ammo === Infinity ? '∞' : st.ammo)}`, 20, g.H - 28, 18, '#fde047', 'left');
    g.text(`💵 ${S.cash}`, g.W - 20, g.H - 30, 22, '#4ade80', 'right');
    S.owned.forEach((i, k) => g.text(`${i + 1}${GUNS[i].e}`, 320 + k * 50, g.H - 30, 16, i === S.cur ? '#fff' : '#777'));
    if (S.hurt > 0) { c.fillStyle = `rgba(200,0,0,${S.hurt})`; c.fillRect(0, 0, g.W, g.H); }
    if (!matchMedia('(pointer: coarse)').matches) { g.ring(g.mouse.x, g.mouse.y, 12, '#f87171', 2); g.line(g.mouse.x - 16, g.mouse.y, g.mouse.x + 16, g.mouse.y, '#f87171', 1); g.line(g.mouse.x, g.mouse.y - 16, g.mouse.x, g.mouse.y + 16, '#f87171', 1); }
    if (S.banner > 0) { S.banner -= 1 / 60; g.text(`🧟 WAVE ${S.wave}`, g.W / 2, 120, 50, '#f87171'); }
    if (S.shop) drawShop(g);
  },
});
function move(o, dx, dy, r) {
  o.x += dx; o.y += dy;
  for (const [x, y, rr] of S.rocks) { const d = U.dist(o.x, o.y, x, y); if (d < r + rr) { o.x = x + ((o.x - x) / d) * (r + rr); o.y = y + ((o.y - y) / d) * (r + rr); } }
}
function switchGun(g, i) { if (i === S.cur) return; S.cur = i; S.reload = 0; S.cool = 0.2; g.sfx.click(); }
function nextWave(g) { S.wave++; S.pending = 6 + S.wave * 5; S.spawnT = 1.5; S.banner = 2; }
function items() {
  const L = [];
  GUNS.forEach((gn, i) => { if (i && !S.owned.includes(i)) L.push({ t: `${gn.e} ${gn.n} 구매`, p: gn.price, f: () => { S.owned.push(i); S.cur = i; } }); });
  L.push({ t: '📦 탄약 보충 (보유 무기 전부)', p: 250, f: () => S.owned.forEach((i) => i && (S.guns[i].ammo += GUNS[i].mag * 4)) });
  L.push({ t: '❤️ 체력 완전 회복', p: 300, f: () => (S.p.hp = S.p.max) });
  L.push({ t: '🛡️ 최대 체력 +25', p: 500, f: () => { S.p.max += 25; S.p.hp += 25; } });
  L.push({ t: `💪 피해량 +15% (현재 ${Math.round(S.dmgMul * 100)}%)`, p: Math.round(600 * S.dmgMul), f: () => (S.dmgMul += 0.15) });
  L.push({ t: `👟 이동속도 +8%`, p: Math.round(400 * S.speedMul), f: () => (S.speedMul += 0.08) });
  L.push({ t: '▶ 다음 웨이브 시작', p: 0, go: true });
  return L;
}
function shop(g) {
  const L = items();
  if (g.pressed('up')) S.sel = (S.sel + L.length - 1) % L.length;
  if (g.pressed('down')) S.sel = (S.sel + 1) % L.length;
  let pick = -1;
  L.forEach((it, i) => { if (g.inRect(300, 150 + i * 46, 400, 40)) { if (g.mouse.moved) S.sel = i; if (g.mouse.clicked) pick = i; } });
  g.mouse.moved = false;
  if (g.keyp('Space') || g.keyp('Enter')) pick = S.sel;
  if (pick >= 0) {
    const it = L[pick];
    if (it.go) { S.shop = false; nextWave(g); g.sfx.click(); return; }
    if (S.cash >= it.p) { S.cash -= it.p; it.f(); g.sfx.coin(); } else g.sfx.hit();
  }
}
function drawShop(g) {
  const c = g.ctx, L = items();
  c.fillStyle = 'rgba(0,0,0,.8)'; c.fillRect(0, 0, g.W, g.H);
  g.text(`🛒 상점 — 웨이브 ${S.wave} 클리어!`, g.W / 2, 70, 34, '#fde047');
  g.text(`보유 💵 ${S.cash}`, g.W / 2, 112, 22, '#4ade80');
  L.forEach((it, i) => {
    const y = 150 + i * 46, sel = i === S.sel, can = S.cash >= it.p;
    g.rrect(300, y, 400, 40, 8, sel ? '#3f3f1f' : '#1c1c14', sel ? '#fde047' : '#444');
    g.text(it.t, 316, y + 20, 17, it.go ? '#4ade80' : '#fff', 'left');
    if (!it.go) g.text('$' + it.p, 686, y + 20, 17, can ? '#4ade80' : '#f87171', 'right');
  });
  g.text('↑↓ + Space 또는 클릭', g.W / 2, g.H - 30, 15, '#999');
}
