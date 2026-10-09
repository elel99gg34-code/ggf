let S;
const LANE = 90, LN = 5, RX = 140;
GAME({
  title: '고속도로 추격', w: 730, h: 820, bg: '#365314', controls: 'dpad+ab', aLabel: '🚀',
  help: '←→ 차선 변경 · ↑ 가속 · ↓ 감속 · Space 니트로\n다른 차를 아슬아슬하게 스쳐 지나가면 "니어미스" 보너스!\n빠를수록 점수가 빨리 오르고, 🪙 코인과 ⛽ 연료를 챙기세요\n연료가 바닥나거나 충돌하면 끝',
  init(g) { S = { bonus: 0, x: RX + LANE * 2 + LANE / 2, tx: 2, speed: 300, cars: [], items: [], dist: 0, fuel: 100, nitro: 1, scroll: 0, near: 0, combo: 0, comboT: 0, t: 0, crashed: false }; },
  update(g, dt) {
    if (S.crashed) return;
    S.t += dt;
    if (g.pressed('left')) S.tx = Math.max(0, S.tx - 1);
    if (g.pressed('right')) S.tx = Math.min(LN - 1, S.tx + 1);
    if (g.mouse.down) S.tx = U.clamp(Math.floor((g.mouse.x - RX) / LANE), 0, LN - 1);
    S.x += (RX + S.tx * LANE + LANE / 2 - S.x) * Math.min(1, dt * 10);
    const boost = g.a && S.nitro > 0;
    const target = boost ? 900 : g.up ? 650 : g.down ? 220 : 420;
    S.speed += (target - S.speed) * dt * 1.5;
    if (boost) { S.nitro -= dt * 0.4; if (g.frame % 2 === 0) g.burst(S.x, 720, ['#60a5fa', '#fff'], 2, 100, 0.3); } else S.nitro = Math.min(1, S.nitro + dt * 0.05);
    S.fuel -= dt * (2.2 + S.speed / 400);
    if (S.fuel <= 0) { g.sfx.lose(); return g.over(`⛽ 연료 고갈 · ${(S.dist / 1000).toFixed(2)}km`); }
    S.dist += S.speed * dt / 10; S.scroll = (S.scroll + S.speed * dt) % 80;
    g.score = Math.floor(S.dist) + S.bonus;
    const dens = Math.min(2.6, 0.9 + S.t / 50);
    if (Math.random() < dt * dens * 1.6) {
      const l = U.randi(0, LN - 1);
      if (!S.cars.some((c) => c.lane === l && c.y < 0)) S.cars.push({ lane: l, x: RX + l * LANE + LANE / 2, y: -100, v: U.rand(120, 300), e: U.choice(['🚗', '🚙', '🚕', '🚐', '🚚', '🚌', '🚓', '🛻']), near: false, sw: Math.random() < 0.15 ? U.rand(1, 4) : 0 });
    }
    if (Math.random() < dt * 0.6) S.items.push({ lane: U.randi(0, LN - 1), y: -40, k: Math.random() < 0.25 ? '⛽' : '🪙' });
    for (const c of S.cars) {
      c.y += (S.speed - c.v) * dt;
      if (c.sw > 0) { c.sw -= dt; if (c.sw <= 0) { const nl = U.clamp(c.lane + U.choice([-1, 1]), 0, LN - 1); if (!S.cars.some((o) => o !== c && o.lane === nl && Math.abs(o.y - c.y) < 160)) c.lane = nl; } }
      c.x += (RX + c.lane * LANE + LANE / 2 - c.x) * Math.min(1, dt * 3);
      for (const o of S.cars) if (o !== c && o.lane === c.lane && o.y < c.y && c.y - o.y < 120) c.v = Math.min(c.v, o.v);
      const dx = Math.abs(c.x - S.x), dy = Math.abs(c.y - 700);
      if (dx < 46 && dy < 70) { S.crashed = true; g.sfx.explode(); g.shake(18, 0.6); g.burst(S.x, 700, ['#f97316', '#fde047', '#111'], 60, 400, 1); return g.later(() => g.over(`💥 충돌 · ${(S.dist / 1000).toFixed(2)}km · 니어미스 ${S.near}`), 1); }
      if (!c.near && dy < 40 && dx < 100) { c.near = true; S.near++; S.combo++; S.comboT = 2; const b = 50 * S.combo; S.bonus += b; g.float(S.x, 640, `니어미스! +${b}`, '#fde047', 22); g.sfx.tone(800 + S.combo * 50, 0.08, 'square', 0.04); }
    }
    S.comboT -= dt; if (S.comboT <= 0) S.combo = 0;
    for (const it of S.items) { it.y += S.speed * dt; if (Math.abs(RX + it.lane * LANE + LANE / 2 - S.x) < 40 && Math.abs(it.y - 700) < 50) { it.got = true; if (it.k === '⛽') { S.fuel = Math.min(100, S.fuel + 35); g.sfx.power(); } else { S.bonus += 100; g.sfx.coin(); } } }
    S.cars = S.cars.filter((c) => c.y < 950 && c.y > -400); S.items = S.items.filter((i) => !i.got && i.y < 900);
    g.info = `${Math.round(S.speed / 3)}km/h · ⛽${Math.round(S.fuel)}%`;
  },
  draw(g, c) {
    for (let y = -80 + S.scroll; y < g.H; y += 80) { g.emoji('🌳', 60, y, 50); g.emoji('🌲', g.W - 60, y + 40, 50); }
    g.rect(RX - 10, 0, LANE * LN + 20, g.H, '#9ca3af'); g.rect(RX, 0, LANE * LN, g.H, '#374151');
    for (let l = 1; l < LN; l++) for (let y = -80 + S.scroll; y < g.H; y += 80) g.rect(RX + l * LANE - 3, y, 6, 44, '#f3f4f6');
    for (const it of S.items) g.emoji(it.k, RX + it.lane * LANE + LANE / 2, it.y, 40);
    for (const car of S.cars) { c.save(); c.translate(car.x, car.y); c.rotate(-Math.PI / 2); g.emoji(car.e, 0, 0, 80); c.restore(); }
    c.save(); c.translate(S.x, 700); c.rotate(-Math.PI / 2 + (S.x - (RX + S.tx * LANE + LANE / 2)) * -0.004); g.emoji('🏎️', 0, 0, 90); c.restore();
    g.rrect(10, 10, 200, 70, 10, 'rgba(0,0,0,.6)');
    g.text(`${(S.dist / 1000).toFixed(2)} km`, 20, 30, 20, '#fff', 'left');
    g.rect(20, 48, 180, 8, '#450a0a'); g.rect(20, 48, 1.8 * S.fuel, 8, S.fuel < 25 ? '#ef4444' : '#22c55e');
    g.rect(20, 62, 180, 8, '#1e3a8a'); g.rect(20, 62, 180 * S.nitro, 8, '#60a5fa');
    if (S.combo > 1) g.text(`콤보 ×${S.combo}`, g.W / 2, 60, 30, '#fde047');
  },
});
