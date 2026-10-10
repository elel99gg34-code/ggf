let S;
const AY0 = 50, AY1 = 540, LANES = [135, 295, 455], MIDX = 500;
const RC = {
  knight: { n: '기사', e: '🤺', cost: 3, cnt: 1, hp: 780, dmg: 85, rate: 1.1, range: 22, spd: 46, r: 14, sight: 150 },
  archer: { n: '궁수', e: '🏹', cost: 3, cnt: 2, hp: 210, dmg: 48, rate: 1.1, range: 140, spd: 48, r: 11, air: 1, proj: '#fde047', sight: 170 },
  giant: { n: '자이언트', e: '🧌', cost: 5, cnt: 1, hp: 2500, dmg: 150, rate: 1.5, range: 22, spd: 34, r: 20, bld: 1, tank: 1 },
  goblin: { n: '고블린', e: '👺', cost: 2, cnt: 3, hp: 170, dmg: 58, rate: 1.0, range: 18, spd: 82, r: 10, sight: 150 },
  wizard: { n: '마법사', e: '🧙', cost: 5, cnt: 1, hp: 560, dmg: 140, rate: 1.4, range: 135, spd: 46, r: 13, air: 1, splash: 48, proj: '#f97316', sight: 170 },
  pekka: { n: '미니 페카', e: '🤖', cost: 4, cnt: 1, hp: 950, dmg: 340, rate: 1.7, range: 22, spd: 62, r: 14, sight: 150, tank: 1 },
  skel: { n: '해골 군단', e: '💀', cost: 3, cnt: 8, hp: 70, dmg: 42, rate: 1.0, range: 16, spd: 70, r: 8, sight: 150 },
  dragon: { n: '아기 드래곤', e: '🐉', cost: 4, cnt: 1, hp: 820, dmg: 100, rate: 1.6, range: 90, spd: 60, r: 15, air: 1, fly: 1, splash: 42, proj: '#ef4444', sight: 160 },
  hog: { n: '돼지 기수', e: '🐗', cost: 4, cnt: 1, hp: 980, dmg: 170, rate: 1.5, range: 20, spd: 98, r: 14, bld: 1, tank: 1 },
  minion: { n: '미니언', e: '🦇', cost: 3, cnt: 3, hp: 190, dmg: 52, rate: 1.0, range: 60, spd: 75, r: 10, air: 1, fly: 1, proj: '#a78bfa', sight: 160 },
  fire: { n: '화염구', e: '☄️', cost: 4, spell: 1, rad: 72, dmg: 430 },
  arrows: { n: '화살비', e: '🎯', cost: 3, spell: 1, rad: 115, dmg: 170 },
};
const FOES = ['🧑‍🌾 시골 기사단', '🧝 숲의 궁수단', '🧛 어둠의 백작', '🐲 용의 군주', '👑 전설의 왕'];
GAME({
  title: '타워 러시 배틀', w: 1000, h: 640, bg: '#14532d', controls: 'dpad+ab', aLabel: '소환', bLabel: '카드',
  help: '아래 카드를 클릭(또는 1~4) → 내 진영(왼쪽)을 클릭해서 소환\n키보드: ↑↓ 레인 · ←→ 위치 · Space 소환 · X 다음 카드\n💧 엘릭서를 관리하며 상대 타워 3개와 👑킹 타워를 부숴라\n상대 레인 타워를 부수면 그 레인 앞쪽까지 소환 가능 · 마지막 1분은 엘릭서 2배\n크라운이 많은 쪽이 승리 · 5명의 상대를 꺾으면 우승!',
  init(g) { S = { stage: 0 }; newMatch(g); },
  update(g, dt) {
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0 && S.after) { const f = S.after; S.after = null; f(); } return; }
    if (S.done) return;
    S.time -= dt;
    const mult = S.time < 60 || S.ot ? 2 : 1;
    S.elix = Math.min(10, S.elix + dt / 2.8 * mult);
    S.ai.elix = Math.min(10, S.ai.elix + dt / 2.8 * mult * S.aiMul);
    input(g, dt);
    ai(g, dt);
    for (const u of S.units) unitStep(g, u, dt);
    for (const t of S.towers) towerStep(g, t, dt);
    for (const p of S.proj) projStep(g, p, dt);
    for (const sp of S.spells) { sp.t -= dt; if (sp.t <= 0 && !sp.hit) { sp.hit = 1; area(g, sp.x, sp.y, sp.rad, sp.dmg, sp.side, 1, 0.35); g.shake(sp.rad / 12); g.sfx.explode(); g.burst(sp.x, sp.y, ['#f97316', '#fde047', '#ef4444'], 30, 260, 0.6, 4); } }
    S.spells = S.spells.filter((s) => s.t > -0.3);
    S.units = S.units.filter((u) => !u.dead);
    S.proj = S.proj.filter((p) => !p.dead);
    // 분리
    const us = S.units;
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j]; if (!!a.fly !== !!b.fly) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, m = (a.r + b.r) * 0.85;
      if (d < m) { const push = (m - d) / 2, nx = dx / d, ny = dy / d; const wa = a.side === b.side ? 1 : 0.5; a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wa; b.y += ny * push * wa; }
    }
    for (const u of us) { u.y = U.clamp(u.y, AY0 + 12, AY1 - 12); u.x = U.clamp(u.x, 10, 990); }
    checkEnd(g);
    g.info = `상대 ${S.stage}/5 · ${FOES[S.stage - 1]} · 💧${Math.floor(S.elix)}`;
  },
  draw(g, c) {
    // 경기장
    for (let x = 0; x < 20; x++) for (let y = 0; y < 10; y++) g.rect(x * 50, AY0 + y * 49, 50, 49, (x + y) % 2 ? '#3f8f3a' : '#47a141');
    for (const ly of LANES) g.rect(0, ly - 22, 1000, 44, 'rgba(180,140,80,.35)');
    g.rect(MIDX - 22, AY0, 44, AY1 - AY0, '#38bdf8');
    for (let i = 0; i < 12; i++) g.line(MIDX - 14 + (i % 3) * 12, AY0 + ((g.time * 30 + i * 40) % (AY1 - AY0)), MIDX - 8 + (i % 3) * 12, AY0 + ((g.time * 30 + i * 40) % (AY1 - AY0)) + 10, 'rgba(255,255,255,.5)', 2);
    for (const ly of LANES) { g.rect(MIDX - 30, ly - 26, 60, 52, '#92400e'); for (let k = 0; k < 5; k++) g.line(MIDX - 30 + k * 12 + 6, ly - 26, MIDX - 30 + k * 12 + 6, ly + 26, '#78350f', 2); }
    const sel = S.sel >= 0 ? RC[S.hand[S.sel]] : null;
    if (sel && !sel.spell) {
      c.fillStyle = 'rgba(96,165,250,.16)'; c.fillRect(0, AY0, 470, AY1 - AY0);
      LANES.forEach((ly, i) => { if (S.towers[3 + i].hp <= 0) { c.fillStyle = 'rgba(96,165,250,.16)'; c.fillRect(470, ly - 70, 250, 140); } });
    }
    // 타워
    for (const t of S.towers) {
      const col = t.side === 0 ? '#2563eb' : '#dc2626';
      if (t.hp <= 0) { g.rrect(t.x - 26, t.y - 18, 52, 36, 6, '#57534e'); g.emoji('🪨', t.x, t.y, 30); continue; }
      const sz = t.king ? 40 : 32;
      g.rrect(t.x - sz, t.y - sz, sz * 2, sz * 2, 10, t.flash > 0 ? '#fff' : '#a8a29e', col, 4);
      g.emoji(t.king ? '🏯' : '🏰', t.x, t.y + 2, t.king ? 54 : 42);
      if (t.king) g.emoji(t.active ? '👑' : '💤', t.x, t.y - sz - 10, 22);
      g.rect(t.x - 34, t.y + sz + 4, 68, 8, '#1c1917'); g.rect(t.x - 34, t.y + sz + 4, 68 * t.hp / t.max, 8, col);
      g.text(Math.ceil(t.hp), t.x, t.y + sz + 18, 12, '#fff');
    }
    // 유닛
    const list = S.units.slice().sort((a, b) => (a.fly - b.fly) || (a.y - b.y));
    for (const u of list) {
      const col = u.side === 0 ? 'rgba(59,130,246,.75)' : 'rgba(239,68,68,.75)';
      const oy = u.fly ? -14 + Math.sin(g.time * 6 + u.x) * 3 : 0;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(u.x, u.y + u.r * 0.6, u.r, u.r * 0.4, 0, 0, Math.PI * 2); c.fill();
      g.ring(u.x, u.y + u.r * 0.6, u.r * 0.9, col, 3);
      c.save(); c.translate(u.x + (u.atk > 0 ? (u.side ? -4 : 4) : 0), u.y + oy); if (u.side === 1) c.scale(-1, 1);
      if (u.flash > 0) c.filter = 'brightness(2.2)';
      g.emoji(u.e, 0, 0, u.r * 2.4); c.restore();
      if (u.hp < u.max) { g.rect(u.x - u.r, u.y + oy - u.r * 1.4, u.r * 2, 4, '#111'); g.rect(u.x - u.r, u.y + oy - u.r * 1.4, u.r * 2 * u.hp / u.max, 4, u.side ? '#ef4444' : '#60a5fa'); }
    }
    for (const p of S.proj) g.circle(p.x, p.y, p.splash ? 6 : 4, p.c);
    for (const sp of S.spells) {
      if (sp.t > 0) { const k = sp.t / sp.max; g.ring(sp.x, sp.y, sp.rad, 'rgba(255,255,255,.5)', 2); g.emoji(sp.e, sp.x - k * 160 * (sp.side ? -1 : 1), sp.y - k * 200, 40); }
      else { c.globalAlpha = Math.max(0, 1 + sp.t / 0.3); g.circle(sp.x, sp.y, sp.rad, 'rgba(249,115,22,.45)'); c.globalAlpha = 1; }
    }
    // 커서 미리보기
    if (sel) {
      const p = S.kbd ? { x: S.kx, y: LANES[S.kl] } : { x: g.mouse.x, y: g.mouse.y };
      if (p.y > AY0 && p.y < AY1) {
        const q = sel.spell ? p : clampDeploy(0, p.x, p.y);
        c.globalAlpha = 0.55; if (sel.spell) g.ring(q.x, q.y, sel.rad, '#fff', 2); g.emoji(sel.e, q.x, q.y, 36); c.globalAlpha = 1;
      }
    }
    // 상단 HUD
    g.rect(0, 0, 1000, AY0, '#0f172a');
    g.text('👑'.repeat(S.crowns[0]) + '·'.repeat(3 - S.crowns[0]), 120, 25, 24, '#60a5fa');
    g.text('👑'.repeat(S.crowns[1]) + '·'.repeat(3 - S.crowns[1]), 880, 25, 24, '#f87171');
    g.text('나', 30, 25, 18, '#93c5fd'); g.text(FOES[S.stage - 1], 700, 25, 16, '#fca5a5');
    g.text((S.ot ? '연장 ' : '') + U.fmtTime(Math.max(0, S.time)), 500, 25, 26, S.time < 60 || S.ot ? '#fbbf24' : '#fff');
    if (S.time < 60 || S.ot) g.text('엘릭서 x2', 360, 25, 15, '#d8b4fe');
    // 하단 카드
    g.rect(0, AY1, 1000, 100, '#1e1b4b');
    g.text('다음', 52, AY1 + 16, 13, '#a5b4fc');
    g.rrect(22, AY1 + 26, 60, 50, 8, '#312e81'); g.emoji(RC[S.deck[0]].e, 52, AY1 + 51, 30);
    S.hand.forEach((k, i) => {
      const C = RC[k], x = 110 + i * 118, y = AY1 + 6, can = S.elix >= C.cost;
      g.rrect(x, y, 108, 68, 10, S.sel === i ? '#fde047' : can ? '#e0e7ff' : '#6b7280', S.sel === i ? '#f59e0b' : '#4338ca', 3);
      g.emoji(C.e, x + 30, y + 32, 38);
      g.text(C.n, x + 72, y + 20, C.n.length > 4 ? 11 : 13, '#1e1b4b');
      g.circle(x + 84, y + 48, 13, '#a855f7'); g.text(C.cost, x + 84, y + 49, 15, '#fff');
      g.text(i + 1, x + 10, y + 12, 11, '#4338ca');
    });
    // 엘릭서 바
    const ex = 110, ey = AY1 + 80, ew = 460;
    g.rrect(ex, ey, ew, 14, 7, '#312e81');
    g.rrect(ex, ey, ew * S.elix / 10, 14, 7, '#c026d3');
    for (let i = 1; i < 10; i++) g.line(ex + ew * i / 10, ey, ex + ew * i / 10, ey + 14, '#1e1b4b', 2);
    g.text('💧 ' + Math.floor(S.elix), ex + ew + 30, ey + 7, 16, '#f0abfc');
    g.text('상대 💧' + Math.floor(S.ai.elix), 930, AY1 + 87, 13, '#fca5a5');
    g.text(S.sel >= 0 ? '배치할 곳을 클릭!' : '카드를 고르세요', 800, AY1 + 40, 18, '#c7d2fe');
    if (S.msgT > 0) { g.rrect(250, 230, 500, 120, 16, 'rgba(15,23,42,.88)', '#fde047', 3); g.text(S.msg, 500, 275, 30, '#fde047'); g.text(S.msg2 || '', 500, 315, 17, '#e2e8f0'); }
  },
});
function newMatch(g) {
  S.stage++;
  const mk = (side, king, lane, x, y) => ({ side, king, lane, x, y, hp: king ? 2600 : 1450, max: king ? 2600 : 1450, dmg: king ? 62 : 52, rate: king ? 1.0 : 0.8, range: king ? 175 : 155, cd: 0, r: king ? 36 : 28, active: !king, flash: 0, tower: 1 });
  S.towers = [];
  LANES.forEach((ly, i) => S.towers.push(mk(0, 0, i, 175, ly)));
  LANES.forEach((ly, i) => S.towers.push(mk(1, 0, i, 825, ly)));
  S.towers.push(mk(0, 1, 1, 62, 295)); S.towers.push(mk(1, 1, 1, 938, 295));
  const all = Object.keys(RC);
  S.deck = U.shuffle(all.slice()); S.hand = S.deck.splice(0, 4);
  const aiDeck = U.shuffle(all.slice()).slice(0, 8);
  if (!aiDeck.some((k) => RC[k].tank)) aiDeck[0] = 'giant';
  U.shuffle(aiDeck);
  S.ai = { elix: 5, deck: aiDeck.slice(4), hand: aiDeck.slice(0, 4), think: 2, support: null };
  S.aiMul = 0.82 + S.stage * 0.1;
  S.units = []; S.proj = []; S.spells = []; S.elix = 6; S.time = 180; S.ot = false; S.crowns = [0, 0];
  S.sel = -1; S.kl = 1; S.kx = 380; S.kbd = false; S.done = false;
  S.msg = `상대 ${S.stage}: ${FOES[S.stage - 1]}`; S.msg2 = '전투 시작!'; S.msgT = 1.8; S.after = null;
}
function clampDeploy(side, x, y) {
  let l = 0, bd = 1e9; LANES.forEach((ly, i) => { const d = Math.abs(ly - y); if (d < bd) { bd = d; l = i; } });
  const pocket = S.towers[(side === 0 ? 3 : 0) + l].hp <= 0;
  if (side === 0) x = U.clamp(x, 20, pocket ? 720 : 470); else x = U.clamp(x, pocket ? 280 : 530, 980);
  return { x, y: U.clamp(y, LANES[l] - 45, LANES[l] + 45), l };
}
function input(g, dt) {
  for (let i = 0; i < 4; i++) if (g.keyp('Digit' + (i + 1))) { S.sel = S.sel === i ? -1 : i; S.kbd = true; g.sfx.click(); }
  if (g.pressed('b')) { S.sel = (S.sel + 1) % 4; S.kbd = true; g.sfx.click(); }
  if (g.pressed('up')) { S.kl = Math.max(0, S.kl - 1); S.kbd = true; }
  if (g.pressed('down')) { S.kl = Math.min(2, S.kl + 1); S.kbd = true; }
  if (g.left) { S.kx -= 300 * dt; S.kbd = true; } if (g.right) { S.kx += 300 * dt; S.kbd = true; }
  S.kx = U.clamp(S.kx, 30, 720);
  if (g.mouse.moved) S.kbd = false;
  if (g.pressed('a')) { if (S.sel < 0) S.sel = 0; else if (play(g, 0, S.sel, S.kx, LANES[S.kl])) S.sel = -1; }
  if (g.mouse.clicked) {
    const my = g.mouse.y, mx = g.mouse.x;
    if (my > AY1) { for (let i = 0; i < 4; i++) if (g.inRect(110 + i * 118, AY1 + 6, 108, 68)) { S.sel = S.sel === i ? -1 : i; g.sfx.click(); } }
    else if (my > AY0 && S.sel >= 0) { S.kbd = false; if (play(g, 0, S.sel, mx, my)) S.sel = -1; }
  }
}
function play(g, side, idx, x, y) {
  const P = side === 0 ? S : S.ai;
  const key = P.hand[idx], C = RC[key];
  const el = side === 0 ? S.elix : S.ai.elix;
  if (el < C.cost) { if (side === 0) { g.sfx.beep(180, 0.1); g.float(x, y, '엘릭서 부족', '#f0abfc', 18); } return false; }
  if (side === 0) S.elix -= C.cost; else S.ai.elix -= C.cost;
  P.hand[idx] = P.deck.shift(); P.deck.push(key);
  if (C.spell) {
    S.spells.push({ x, y, rad: C.rad, dmg: C.dmg, side, t: 0.7, max: 0.7, e: C.e });
    if (side === 0) g.sfx.tone(500, 0.3, 'sawtooth', 0.04, 200);
    return true;
  }
  const q = clampDeploy(side, x, y);
  for (let i = 0; i < C.cnt; i++) {
    const a = (i / C.cnt) * Math.PI * 2, rr = C.cnt > 1 ? 10 + C.cnt * 2 : 0;
    S.units.push({ ...C, key, side, lane: q.l, x: q.x + Math.cos(a) * rr, y: q.y + Math.sin(a) * rr, hp: C.hp, max: C.hp, cd: 0.6, tg: null, rt: 0, atk: 0, flash: 0, deploy: 1, sight: C.sight || 0, fly: C.fly || 0 });
  }
  g.burst(q.x, q.y, side ? '#f87171' : '#93c5fd', 12, 120, 0.4);
  if (side === 0) g.sfx.pop();
  return true;
}
function alive(t) { return t && !t.dead && t.hp > 0; }
function findTarget(u) {
  let best = null, bd = u.sight || 0;
  if (!u.bld) for (const e of S.units) {
    if (e.side === u.side || e.dead || (e.fly && !u.air)) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; best = e; }
  }
  if (best) return best;
  bd = 1e9;
  for (const t of S.towers) {
    if (t.side === u.side || t.hp <= 0) continue;
    let d = Math.hypot(t.x - u.x, t.y - u.y); if (!t.king && t.lane === u.lane) d *= 0.6;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function unitStep(g, u, dt) {
  u.cd -= dt; u.rt -= dt; u.atk -= dt; u.flash -= dt;
  if (u.deploy > 0) { u.deploy -= dt * 1.5; return; }
  if (!alive(u.tg) || u.rt <= 0) { const nt = findTarget(u); if (nt !== u.tg) u.cd = Math.max(u.cd, 0.3); u.tg = nt; u.rt = 0.3; }
  const t = u.tg; if (!t) return;
  const d = Math.hypot(t.x - u.x, t.y - u.y) - (t.r || 10) - u.r * 0.5;
  if (d <= u.range) {
    if (u.cd <= 0) {
      u.cd = u.rate; u.atk = 0.12;
      if (u.proj) S.proj.push({ x: u.x, y: u.y - (u.fly ? 14 : 4), t, dmg: u.dmg, splash: u.splash || 0, side: u.side, c: u.proj, lx: t.x, ly: t.y });
      else { hit(g, t, u.dmg, u.side); if (u.side === 0) g.sfx.tone(160 + Math.random() * 40, 0.04, 'square', 0.025); }
    }
    return;
  }
  let tx = t.x, ty = t.y;
  // 지상 유닛은 다리로 강 건너기
  if (!u.fly && ((u.x < MIDX - 30 && tx > MIDX - 30) || (u.x > MIDX + 30 && tx < MIDX + 30))) { ty = LANES[u.lane]; if (Math.abs(u.y - ty) > 6) tx = u.x + (tx > u.x ? 10 : -10); }
  const dx = tx - u.x, dy = ty - u.y, m = Math.hypot(dx, dy) || 1;
  u.x += dx / m * u.spd * dt; u.y += dy / m * u.spd * dt;
  if (!u.fly && Math.abs(u.x - MIDX) < 30) { u.lane = LANES.reduce((b, ly, i) => (Math.abs(ly - u.y) < Math.abs(LANES[b] - u.y) ? i : b), 0); u.y += (LANES[u.lane] - u.y) * Math.min(1, dt * 6); }
}
function hit(g, t, dmg, side) {
  if (!alive(t)) return;
  t.hp -= dmg; t.flash = 0.08;
  if (t.tower) {
    if (side === 0) { g.score += Math.round(dmg / 10); }
    if (t.king) t.active = true;
    if (t.hp <= 0) towerDown(g, t);
  } else if (t.hp <= 0) { t.dead = true; g.burst(t.x, t.y, t.side ? ['#fca5a5', '#fff'] : ['#93c5fd', '#fff'], 10, 150, 0.4); if (side === 0) g.add(t.max >= 900 ? 30 : 10); }
}
function towerDown(g, t) {
  t.hp = 0; const winner = 1 - t.side;
  g.shake(14, 0.5); g.sfx.explode(); g.burst(t.x, t.y, ['#78716c', '#f97316', '#fde047'], 50, 320, 1, 5);
  if (t.king) { S.crowns[winner] = 3; }
  else {
    S.crowns[winner] = Math.min(3, S.crowns[winner] + 1);
    for (const k of S.towers) if (k.king && k.side === t.side) k.active = true;
  }
  if (winner === 0) { g.add(300, t.x, t.y - 40); g.float(t.x, t.y - 70, '👑 크라운!', '#fde047', 28); }
}
function towerStep(g, t, dt) {
  t.flash -= dt;
  if (t.hp <= 0 || !t.active) return;
  t.cd -= dt; if (t.cd > 0) return;
  let best = null, bd = t.range;
  for (const u of S.units) { if (u.side === t.side || u.dead) continue; const d = Math.hypot(u.x - t.x, u.y - t.y) - u.r; if (d < bd) { bd = d; best = u; } }
  if (best) { t.cd = t.rate; S.proj.push({ x: t.x, y: t.y - 20, t: best, dmg: t.dmg, splash: 0, side: t.side, c: t.side ? '#fecaca' : '#bfdbfe', lx: best.x, ly: best.y, fast: 1 }); }
}
function projStep(g, p, dt) {
  if (alive(p.t)) { p.lx = p.t.x; p.ly = p.t.y - (p.t.fly ? 14 : 0); }
  const dx = p.lx - p.x, dy = p.ly - p.y, d = Math.hypot(dx, dy), sp = (p.fast ? 560 : 420) * dt;
  if (d <= sp + 4) {
    p.dead = true;
    if (p.splash) { area(g, p.lx, p.ly, p.splash, p.dmg, p.side, 0, 1); g.burst(p.lx, p.ly, p.c, 8, 100, 0.3); }
    else if (alive(p.t)) hit(g, p.t, p.dmg, p.side);
    return;
  }
  p.x += dx / d * sp; p.y += dy / d * sp;
}
function area(g, x, y, rad, dmg, side, spell, towerMul) {
  for (const u of S.units) if (u.side !== side && !u.dead && Math.hypot(u.x - x, u.y - y) < rad + u.r) hit(g, u, dmg, side);
  for (const t of S.towers) if (t.side !== side && t.hp > 0 && Math.hypot(t.x - x, t.y - y) < rad + t.r) hit(g, t, Math.round(dmg * towerMul), side);
}
function towerPct(side) { let s = 0; for (const t of S.towers) if (t.side === side) s += Math.max(0, t.hp) / t.max; return s; }
function checkEnd(g) {
  let res = null;
  if (S.crowns[0] >= 3 || S.crowns[1] >= 3) res = S.crowns[0] >= 3 ? 0 : 1;
  else if (S.ot && S.crowns[0] !== S.crowns[1]) res = S.crowns[0] > S.crowns[1] ? 0 : 1;
  else if (S.time <= 0) {
    if (S.crowns[0] !== S.crowns[1]) res = S.crowns[0] > S.crowns[1] ? 0 : 1;
    else if (!S.ot) { S.ot = true; S.time = 60; S.msg = '⏱ 연장전!'; S.msg2 = '먼저 타워를 부수는 쪽이 승리'; S.msgT = 1.5; g.sfx.power(); return; }
    else { const a = towerPct(0), b = towerPct(1); res = Math.abs(a - b) < 0.001 ? 2 : a > b ? 0 : 1; }
  }
  if (res === null) return;
  S.done = true;
  if (res === 0) {
    g.add(1000 * S.stage + Math.round(S.elix * 20));
    if (S.stage >= 5) { S.msg = '🏆 최종 우승!'; S.msg2 = '모든 상대를 꺾었다'; S.msgT = 1.5; S.after = () => g.win(`👑 ${S.crowns[0]}크라운으로 전설의 왕까지 격파!`); }
    else { S.msg = `승리! 👑 ${S.crowns[0]} : ${S.crowns[1]}`; S.msg2 = '다음 상대: ' + FOES[S.stage]; S.msgT = 2.5; S.after = () => newMatch(g); }
    g.sfx.win();
  } else if (res === 2) { S.msg = '무승부!'; S.msg2 = '같은 상대와 재경기'; S.msgT = 2; S.stage--; S.after = () => newMatch(g); }
  else { S.msg = `패배... 👑 ${S.crowns[0]} : ${S.crowns[1]}`; S.msg2 = ''; S.msgT = 1.2; S.after = () => g.over(`${FOES[S.stage - 1]}에게 패배 (상대 ${S.stage}/5)`); }
}
function ai(g, dt) {
  const A = S.ai;
  A.think -= dt; if (A.think > 0) return;
  A.think = U.rand(0.5, 1.3) / (0.85 + S.stage * 0.08);
  const threat = [0, 0, 0], tx = [0, 0, 0], air = [0, 0, 0];
  let swarm = null, swarmN = 0;
  for (const u of S.units) {
    if (u.side !== 0 || u.x < 380) continue;
    threat[u.lane] += u.hp * (u.dmg / 60); tx[u.lane] = Math.max(tx[u.lane], u.x); if (u.fly) air[u.lane]++;
    let n = 0; for (const v of S.units) if (v.side === 0 && Math.hypot(v.x - u.x, v.y - u.y) < 70) n += v.max < 400 ? 1 : 0.5;
    if (n > swarmN) { swarmN = n; swarm = u; }
  }
  const afford = (f) => A.hand.map((k, i) => ({ k, i, C: RC[k] })).filter((o) => o.C.cost <= A.elix && f(o.C));
  // 주문
  if (swarm && swarmN >= 3) {
    const sp = afford((C) => C.spell);
    if (sp.length && Math.random() < 0.8) { const o = sp[0]; play(g, 1, o.i, swarm.x + 10, swarm.y); return; }
  }
  let L = 0; for (let i = 1; i < 3; i++) if (threat[i] > threat[L]) L = i;
  if (threat[L] > 0) {
    let opts = afford((C) => !C.spell && !C.bld && (!air[L] || C.air));
    if (!opts.length) opts = afford((C) => !C.spell && !C.bld);
    if (opts.length) {
      opts.sort((a, b) => (b.C.dmg / b.C.rate) * (b.C.cnt) - (a.C.dmg / a.C.rate) * (a.C.cnt));
      const o = S.stage >= 3 ? opts[0] : U.choice(opts);
      play(g, 1, o.i, Math.max(560, Math.min(tx[L] + 110, 820)), LANES[L] + U.rand(-20, 20)); return;
    }
  }
  if (A.support && A.elix >= 3) {
    const opts = afford((C) => !C.spell && !C.tank);
    if (opts.length) { const o = U.choice(opts); play(g, 1, o.i, 870, LANES[A.support] + U.rand(-15, 15)); A.support = null; return; }
  }
  if (A.elix >= (S.stage >= 3 ? 8 : 9.5)) {
    let best = 0, bh = 1e9; for (let i = 0; i < 3; i++) { const t = S.towers[i]; const h = t.hp <= 0 ? 400 : t.hp; if (h < bh) { bh = h; best = i; } }
    const tanks = afford((C) => C.tank);
    const o = tanks.length ? tanks[0] : U.choice(afford((C) => !C.spell));
    if (o) { play(g, 1, o.i, o.k === 'hog' ? 600 : 880, LANES[best] + U.rand(-15, 15)); A.support = best; A.think = 2.2; }
  }
}
