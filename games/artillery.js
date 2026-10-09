let S;
const WEAP = [{ n: '일반 포탄', e: '⚫', r: 34, dmg: 35, n0: Infinity }, { n: '대형 폭탄', e: '💣', r: 62, dmg: 55, n0: 2 }, { n: '집속탄', e: '🎆', r: 26, dmg: 22, n0: 2, cluster: 5 }, { n: '굴착탄', e: '🔩', r: 46, dmg: 25, n0: 2, drill: true }];
GAME({
  title: '포격전', w: 1100, h: 620, bg: '#0b1026', controls: 'dpad+ab', aLabel: '🔥', bLabel: '🔁',
  help: '←→ 각도 · ↑↓ 힘 (또는 마우스로 조준 후 클릭)\nSpace 발사 · Q/X 무기 교체 (대형 폭탄·집속탄·굴착탄)\n🚩 바람의 방향과 세기를 계산하세요!\n적 탱크를 파괴하면 다음 전장 (적이 점점 정확해져요)',
  init(g) { S = { lvl: 0, hp: 100 }; newMap(g); },
  update(g, dt) {
    for (const p of S.proj) {
      p.vx += S.wind * dt * 1.0; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.trail.push([p.x, p.y]); if (p.trail.length > 40) p.trail.shift();
      const gy = ground(p.x);
      let hitT = null;
      for (const t of S.tanks) if (t.hp > 0 && U.dist(p.x, p.y, t.x, t.y - 10) < 18 && p.age > 0.15) hitT = t;
      p.age += dt;
      if (p.drill && p.y >= gy) { p.drilled = (p.drilled || 0) + dt; if (p.drilled > 0.35) hitT = hitT || true; }
      if ((p.y >= gy && !p.drill) || hitT || p.x < -50 || p.x > g.W + 50 || p.y > g.H + 50) {
        p.dead = true;
        if (p.x > -50 && p.x < g.W + 50 && p.y < g.H + 50) explode(g, p.x, Math.min(p.y, gy + (p.drill ? 40 : 0)), p.w);
        if (p.w.cluster && !p.child) for (let i = 0; i < p.w.cluster; i++) S.proj.push({ x: p.x, y: Math.min(p.y, ground(p.x)) - 5, vx: U.rand(-160, 160), vy: U.rand(-320, -200), w: { r: 22, dmg: 16 }, child: true, trail: [], age: 0.2 });
      }
    }
    S.proj = S.proj.filter((p) => !p.dead);
    for (const t of S.tanks) { const gy = ground(t.x); if (t.y < gy) { t.vy = (t.vy || 0) + 600 * dt; t.y = Math.min(gy, t.y + t.vy * dt); if (t.y === gy) { if (t.vy > 350) { t.hp -= Math.round((t.vy - 350) / 10); g.sfx.hit(); } t.vy = 0; } } else { t.y = gy; t.vy = 0; } if (t.y > g.H - 5) t.hp = 0; }
    const me = S.tanks[0], foe = S.tanks[1];
    if (S.proj.length) return;
    if (S.settle > 0) { S.settle -= dt; return; }
    if (me.hp <= 0) { if (!S.done) { S.done = true; g.sfx.lose(); g.over(`전장 ${S.lvl} 에서 패배`); } return; }
    if (foe.hp <= 0) { if (!S.done) { S.done = true; g.add(1000 * S.lvl + me.hp * 10); g.sfx.win(); S.msg = '🎉 적 파괴! 다음 전장으로'; g.later(() => { S.hp = Math.min(100, me.hp + 40); newMap(g); }, 2); } return; }
    if (S.turn === 0) {
      if (g.left) me.ang = Math.min(Math.PI - 0.05, me.ang + 1.2 * dt);
      if (g.right) me.ang = Math.max(0.05, me.ang - 1.2 * dt);
      if (g.up) me.pow = Math.min(100, me.pow + 40 * dt);
      if (g.down) me.pow = Math.max(10, me.pow - 40 * dt);
      if (g.key('KeyQ') && !S.qHeld || g.pressed('b')) { do { me.wi = (me.wi + 1) % WEAP.length; } while (me.ammo[me.wi] <= 0); g.sfx.click(); }
      S.qHeld = g.key('KeyQ');
      if (g.mouse.down) { const dx = g.mouse.x - me.x, dy = me.y - 14 - g.mouse.y; if (dy > -40) { me.ang = U.clamp(Math.atan2(Math.max(dy, 1), dx), 0.05, Math.PI - 0.05); me.pow = U.clamp(Math.hypot(dx, dy) / 3, 10, 100); S.aiming = true; } }
      if ((g.pressed('a') && !g.keyp('KeyJ')) || (S.aiming && g.mouse.released)) { S.aiming = false; shoot(g, me); S.turn = 1; S.aiT = 1.2; }
    } else {
      S.aiT -= dt;
      if (!S.aiPlan) S.aiPlan = plan(foe, me);
      foe.ang += (S.aiPlan.ang - foe.ang) * Math.min(1, dt * 3); foe.pow += (S.aiPlan.pow - foe.pow) * Math.min(1, dt * 3);
      if (S.aiT <= 0) { foe.ang = S.aiPlan.ang; foe.pow = S.aiPlan.pow; foe.wi = S.aiPlan.wi; shoot(g, foe); S.aiPlan = null; S.turn = 0; }
    }
    g.info = `전장 ${S.lvl} · ${S.turn === 0 ? '내 차례' : '적 차례'}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#0b1026'); grd.addColorStop(1, '#3b2a5a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
    S.stars.forEach(([x, y]) => g.rect(x, y, 2, 2, '#c7d2fe'));
    g.emoji('🌕', 980, 80, 70);
    c.fillStyle = S.terrainCol; c.beginPath(); c.moveTo(0, g.H);
    for (let x = 0; x <= g.W; x += 2) c.lineTo(x, S.h[x]);
    c.lineTo(g.W, g.H); c.fill();
    c.strokeStyle = '#a3e635'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= g.W; x += 2) x ? c.lineTo(x, S.h[x]) : c.moveTo(x, S.h[x]); c.stroke();
    for (const p of S.proj) { c.globalAlpha = 0.4; p.trail.forEach(([x, y]) => g.circle(x, y, 2, '#fde68a')); c.globalAlpha = 1; g.emoji(p.w.e || '⚫', p.x, p.y, 16); }
    S.tanks.forEach((t, i) => {
      if (t.hp <= 0) { g.emoji('🔥', t.x, t.y - 14, 34); return; }
      c.save(); c.translate(t.x, t.y - 12);
      c.save(); c.rotate(-t.ang); g.rect(0, -3, 26, 6, '#1f2937'); c.restore();
      g.rrect(-18, -6, 36, 16, 6, t.col, '#111'); g.circle(0, -6, 9, t.col);
      c.restore();
      g.rect(t.x - 25, t.y - 44, 50, 6, '#450a0a'); g.rect(t.x - 25, t.y - 44, (50 * Math.max(0, t.hp)) / 100, 6, '#22c55e');
      g.text(i === 0 ? '나' : 'AI', t.x, t.y - 56, 13, '#fff');
    });
    const me = S.tanks[0];
    if (S.turn === 0 && !S.proj.length && me.hp > 0) {
      c.setLineDash([4, 6]); const L = 40 + me.pow * 0.8; g.line(me.x, me.y - 14, me.x + Math.cos(me.ang) * L, me.y - 14 - Math.sin(me.ang) * L, 'rgba(255,255,255,.6)', 2); c.setLineDash([]);
    }
    g.rrect(10, 10, 330, 74, 10, 'rgba(0,0,0,.45)');
    g.text(`각도 ${Math.round((me.ang * 180) / Math.PI)}°  힘 ${Math.round(me.pow)}`, 24, 30, 18, '#fff', 'left');
    g.rect(24, 44, 200, 8, '#334155'); g.rect(24, 44, me.pow * 2, 8, '#f59e0b');
    g.text(`${WEAP[me.wi].e} ${WEAP[me.wi].n} ${me.ammo[me.wi] === Infinity ? '' : '×' + me.ammo[me.wi]}`, 24, 68, 16, '#fde68a', 'left');
    const wd = S.wind;
    g.text('바람', g.W / 2, 22, 14, '#cbd5e1');
    g.rect(g.W / 2 - 60, 34, 120, 8, '#334155'); g.rect(g.W / 2, 34, U.clamp(wd / 2, -60, 60), 8, '#38bdf8');
    g.text((wd > 0 ? '→ ' : '← ') + Math.abs(Math.round(wd)), g.W / 2, 56, 14, '#7dd3fc');
    if (S.done && S.msg) g.text(S.msg, g.W / 2, 200, 36, '#fde047');
    if (S.turn === 1 && !S.proj.length && !S.done) g.text('적이 조준 중...', g.W / 2, 110, 20, '#fca5a5');
  },
});
function ground(x) { return S.h[U.clamp(Math.round(x), 0, S.h.length - 1)]; }
function newMap(g) {
  S.lvl++;
  const W = 1100, h = [];
  const a1 = U.rand(40, 90), a2 = U.rand(20, 50), f1 = U.rand(0.004, 0.009), f2 = U.rand(0.015, 0.03), p1 = U.rand(6), p2 = U.rand(6), base = U.rand(380, 450);
  for (let x = 0; x <= W; x++) h.push(base + Math.sin(x * f1 + p1) * a1 + Math.sin(x * f2 + p2) * a2 - Math.max(0, 140 - Math.abs(x - 550) * 0.5) * (S.lvl % 2 ? 1 : 0.3));
  S.h = h; S.proj = []; S.turn = 0; S.done = false; S.msg = ''; S.settle = 0;
  S.terrainCol = ['#3f6212', '#713f12', '#164e63', '#4c1d95', '#7f1d1d'][(S.lvl - 1) % 5];
  S.stars = Array.from({ length: 70 }, () => [U.rand(W), U.rand(300)]);
  const mx = U.rand(80, 260), ex = U.rand(840, 1020);
  S.tanks = [
    { x: mx, y: ground(mx), ang: Math.PI / 4, pow: 60, hp: S.hp, col: '#3b82f6', wi: 0, ammo: WEAP.map((w) => w.n0) },
    { x: ex, y: ground(ex), ang: (Math.PI * 3) / 4, pow: 60, hp: 100, col: '#ef4444', wi: 0, ammo: WEAP.map((w) => w.n0) },
  ];
  S.wind = U.rand(-40, 40) * (1 + S.lvl * 0.1);
}
function shoot(g, t) {
  const w = WEAP[t.wi];
  if (t.ammo[t.wi] !== Infinity) t.ammo[t.wi]--;
  const sp = t.pow * 6.5;
  S.proj.push({ x: t.x + Math.cos(t.ang) * 26, y: t.y - 14 - Math.sin(t.ang) * 26, vx: Math.cos(t.ang) * sp, vy: -Math.sin(t.ang) * sp, w, trail: [], age: 0, drill: w.drill });
  if (t.ammo[t.wi] <= 0) t.wi = 0;
  g.sfx.tone(120, 0.25, 'sawtooth', 0.06, 50); g.shake(4);
}
function explode(g, x, y, w) {
  const r = w.r;
  for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(S.h.length - 1, Math.ceil(x + r)); i++) { const dy = Math.sqrt(Math.max(0, r * r - (i - x) ** 2)); if (S.h[i] < y + dy) S.h[i] = Math.max(S.h[i], y + dy); }
  for (const t of S.tanks) { const d = U.dist(t.x, t.y - 8, x, y); if (d < r + 16) { const dmg = Math.round(w.dmg * (1 - d / (r + 16)) + 5); t.hp -= dmg; g.float(t.x, t.y - 60, '-' + dmg, '#f87171', 22); if (t === S.tanks[1]) g.add(dmg * 5); } }
  g.burst(x, y, ['#f97316', '#fde047', '#fff', '#78350f'], 30, 260); g.sfx.explode(); g.shake(r / 5);
  S.settle = 0.8; S.wind += U.rand(-10, 10); S.wind = U.clamp(S.wind, -80, 80);
}
function plan(me, target) {
  let best = null, bd = 1e9;
  const acc = Math.max(8, 70 - S.lvl * 10);
  for (let k = 0; k < 400; k++) {
    const ang = U.rand(Math.PI / 2 + 0.05, Math.PI - 0.1), pow = U.rand(25, 100);
    let x = me.x + Math.cos(ang) * 26, y = me.y - 14 - Math.sin(ang) * 26, vx = Math.cos(ang) * pow * 6.5, vy = -Math.sin(ang) * pow * 6.5;
    for (let i = 0; i < 600; i++) { const dt = 1 / 60; vx += S.wind * dt; vy += 300 * dt; x += vx * dt; y += vy * dt; if (y >= ground(x) || x < 0 || x > 1100) break; }
    const d = Math.abs(x - target.x) + Math.abs(y - target.y) * 0.3;
    if (d < bd) { bd = d; best = { ang, pow }; }
  }
  const wi = me.ammo[1] > 0 && Math.random() < 0.4 ? 1 : me.ammo[2] > 0 && Math.random() < 0.3 ? 2 : 0;
  return { ang: best.ang + U.rand(-1, 1) * acc * 0.0015, pow: U.clamp(best.pow + U.rand(-1, 1) * acc * 0.06, 10, 100), wi };
}
