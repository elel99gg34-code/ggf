let S;
const T = 24, MW = 40, MH = 25;
const MONS = [
  { e: '🐀', n: '쥐', hp: 6, atk: 2, def: 0, xp: 3, d: 1 }, { e: '🦇', n: '박쥐', hp: 5, atk: 3, def: 0, xp: 4, d: 1, fast: true },
  { e: '🐍', n: '독사', hp: 10, atk: 4, def: 1, xp: 6, d: 2 }, { e: '👺', n: '고블린', hp: 14, atk: 5, def: 1, xp: 9, d: 2 },
  { e: '💀', n: '해골병사', hp: 20, atk: 7, def: 3, xp: 14, d: 4 }, { e: '🧌', n: '오우거', hp: 34, atk: 9, def: 3, xp: 22, d: 5 },
  { e: '👻', n: '망령', hp: 24, atk: 10, def: 5, xp: 26, d: 6, fast: true }, { e: '🦂', n: '거대 전갈', hp: 40, atk: 12, def: 6, xp: 34, d: 7 },
  { e: '😈', n: '악마', hp: 55, atk: 15, def: 7, xp: 50, d: 8 }, { e: '🐉', n: '드래곤', hp: 120, atk: 20, def: 9, xp: 150, d: 10, boss: true },
];
const WEAPONS = [['🗡️', '단검', 2], ['⚔️', '장검', 4], ['🪓', '전투도끼', 6], ['🔱', '삼지창', 8], ['⚡', '번개검', 11]];
const ARMORS = [['🧥', '가죽 갑옷', 1], ['🦺', '사슬 갑옷', 3], ['🛡️', '판금 갑옷', 5], ['👑', '용비늘 갑옷', 8]];
GAME({
  title: '던전 로그라이크', w: MW * T, h: MH * T + 96, bg: '#000', controls: 'dpad+ab', aLabel: '🧪', bLabel: '📜',
  help: '방향키/WASD 이동 · 적에게 부딪히면 공격 (턴제)\nQ 🧪 물약 마시기 · E 📜 화염 두루마리 (가장 가까운 적) · Space 한 턴 쉬기\n🔽 계단으로 더 깊이! 무기·갑옷은 더 좋으면 자동 장착\n지하 10층의 🐉 드래곤을 처치하면 승리',
  init(g) {
    S = { depth: 0, p: { hp: 30, max: 30, atk: 4, def: 1, lvl: 1, xp: 0, need: 20, gold: 0, pot: 1, scroll: 1, wep: null, arm: null, kills: 0 }, log: [] };
    descend(g);
  },
  update(g, dt) {
    S.anim = Math.max(0, (S.anim || 0) - dt);
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let acted = false;
    for (const k in D) if (g.pressed(k) || (g.held(k) && S.repeat > 0.16)) { acted = move(g, ...D[k]); S.repeat = 0; break; }
    S.repeat = (S.repeat || 0) + dt;
    if (!acted && g.mouse.clicked) { const tx = Math.floor(g.mouse.x / T), ty = Math.floor(g.mouse.y / T), P = S.pos; const dx = Math.sign(tx - P.x), dy = Math.sign(ty - P.y); if (ty < MH && (dx || dy)) acted = Math.abs(tx - P.x) > Math.abs(ty - P.y) ? move(g, dx, 0) : move(g, 0, dy); }
    if (g.keyp('KeyQ') || (g.pressed('a') && !g.keyp('Space') && !g.keyp('KeyZ') && !g.keyp('Enter') && !g.keyp('KeyJ'))) acted = quaff(g);
    if (g.keyp('KeyE') || (g.pressed('b') && !g.keyp('ShiftLeft') && !g.keyp('ShiftRight') && !g.keyp('KeyX') && !g.keyp('KeyK'))) acted = read(g);
    if (g.keyp('Space') || g.keyp('Period')) { acted = true; if (S.p.hp < S.p.max && S.turn % 3 === 0) S.p.hp++; }
    if (acted) { S.turn++; monsters(g); fov(); if (S.turn % 8 === 0 && S.p.hp < S.p.max) S.p.hp++; }
    if (S.p.hp <= 0 && !S.dead) { S.dead = true; g.sfx.lose(); g.over(`지하 ${S.depth}층에서 사망 · 처치 ${S.p.kills}`); }
    g.score = S.p.gold + S.depth * 200 + S.p.kills * 20 + S.p.lvl * 100;
    g.info = `지하 ${S.depth}층 · Lv ${S.p.lvl}`;
  },
  draw(g, c) {
    const P = S.pos;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const seen = S.seen[y][x], vis = S.vis[y][x];
      if (!seen) continue;
      const v = S.map[y][x], px = x * T, py = y * T;
      if (v === '#') { g.rect(px, py, T, T, vis ? '#57534e' : '#292524'); g.rect(px, py, T, 3, vis ? '#78716c' : '#33302d'); }
      else { g.rect(px, py, T, T, vis ? ((x + y) % 2 ? '#3b332c' : '#362e27') : '#1a1714'); }
      if (v === '>') g.emoji('🔽', px + T / 2, py + T / 2, 20);
    }
    for (const it of S.items) if (S.vis[it.y][it.x] || (S.seen[it.y][it.x] && it.k !== 'gold')) g.emoji(it.e, it.x * T + T / 2, it.y * T + T / 2, 18);
    for (const m of S.mons) if (S.vis[m.y][m.x]) {
      c.save(); if (m.flash > 0) { m.flash -= 1 / 60; c.filter = 'brightness(3)'; }
      g.emoji(m.e, m.x * T + T / 2, m.y * T + T / 2, m.boss ? 30 : 21); c.restore();
      if (m.hp < m.max) { g.rect(m.x * T + 2, m.y * T, T - 4, 3, '#450a0a'); g.rect(m.x * T + 2, m.y * T, ((T - 4) * m.hp) / m.max, 3, '#ef4444'); }
    }
    g.emoji('🧝', P.x * T + T / 2, P.y * T + T / 2, 22);
    if (S.fx) { c.globalAlpha = S.anim * 3; g.circle(S.fx.x * T + T / 2, S.fx.y * T + T / 2, 30 * (1 - S.anim * 3) + 10, '#f97316'); c.globalAlpha = 1; }
    const by = MH * T;
    g.rect(0, by, g.W, 96, '#0c0a09'); g.line(0, by, g.W, by, '#44403c', 2);
    const p = S.p;
    g.text(`❤️ ${Math.max(0, p.hp)}/${p.max}`, 12, by + 18, 16, '#fca5a5', 'left');
    g.rect(110, by + 12, 120, 10, '#450a0a'); g.rect(110, by + 12, (120 * Math.max(0, p.hp)) / p.max, 10, '#ef4444');
    g.text(`Lv ${p.lvl}  XP ${p.xp}/${p.need}`, 245, by + 18, 14, '#93c5fd', 'left');
    g.text(`⚔️ ${p.atk + (p.wep ? p.wep[2] : 0)}  🛡️ ${p.def + (p.arm ? p.arm[2] : 0)}  💰 ${p.gold}  🧪 ${p.pot}  📜 ${p.scroll}`, 420, by + 18, 15, '#e7e5e4', 'left');
    g.text(`${p.wep ? p.wep[0] + p.wep[1] : '맨손'} / ${p.arm ? p.arm[0] + p.arm[1] : '옷'}`, g.W - 12, by + 18, 14, '#d6d3d1', 'right');
    S.log.slice(-3).forEach((m, i, a) => g.text(m, 12, by + 42 + i * 18, 14, i === a.length - 1 ? '#fde68a' : '#a8a29e', 'left', 'normal'));
  },
});
function log(m) { S.log.push(m); if (S.log.length > 30) S.log.shift(); }
function descend(g) {
  S.depth++;
  const M = U.grid(MW, MH, '#'), rooms = [];
  for (let tries = 0; tries < 200 && rooms.length < 9; tries++) {
    const w = U.randi(4, 9), h = U.randi(3, 6), x = U.randi(1, MW - w - 2), y = U.randi(1, MH - h - 2);
    if (rooms.some((r) => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) M[j][i] = '.';
  }
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    if (Math.random() < 0.5) { for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) M[a.cy][x] = '.'; for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) M[y][b.cx] = '.'; }
    else { for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) M[y][a.cx] = '.'; for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) M[b.cy][x] = '.'; }
  }
  const last = rooms[rooms.length - 1];
  if (S.depth < 10) M[last.cy][last.cx] = '>';
  S.map = M; S.pos = { x: rooms[0].cx, y: rooms[0].cy };
  S.mons = []; S.items = [];
  const freeCell = () => { for (;;) { const r = U.choice(rooms.slice(1)), x = U.randi(r.x, r.x + r.w - 1), y = U.randi(r.y, r.y + r.h - 1); if (M[y][x] === '.' && !S.mons.some((m) => m.x === x && m.y === y) && !S.items.some((i) => i.x === x && i.y === y)) return { x, y }; } };
  const pool = MONS.filter((m) => !m.boss && m.d <= S.depth && m.d >= S.depth - 4);
  for (let i = 0; i < 5 + S.depth * 1.5; i++) { const t = U.choice(pool), c = freeCell(); S.mons.push({ ...t, ...c, max: t.hp, awake: false }); }
  if (S.depth === 10) { const t = MONS[9]; S.mons.push({ ...t, x: last.cx, y: last.cy, max: t.hp, awake: false }); }
  for (let i = 0; i < 4 + U.randi(3); i++) S.items.push({ ...freeCell(), k: 'gold', e: '💰', v: U.randi(5, 15) * S.depth });
  for (let i = 0; i < 2; i++) S.items.push({ ...freeCell(), k: 'pot', e: '🧪' });
  if (Math.random() < 0.6) S.items.push({ ...freeCell(), k: 'scroll', e: '📜' });
  if (Math.random() < 0.55) { const w = WEAPONS[Math.min(4, Math.floor((S.depth - 1) / 2) + U.randi(0, 1))]; S.items.push({ ...freeCell(), k: 'wep', e: w[0], v: w }); }
  if (Math.random() < 0.45) { const a = ARMORS[Math.min(3, Math.floor((S.depth - 1) / 3) + U.randi(0, 1))]; S.items.push({ ...freeCell(), k: 'arm', e: a[0], v: a }); }
  S.seen = U.grid(MW, MH, false); S.vis = U.grid(MW, MH, false); S.turn = 0;
  fov();
  log(S.depth === 10 ? '🐉 깊은 곳에서 거대한 숨소리가 들린다...' : `지하 ${S.depth}층에 도착했다.`);
  if (g) g.sfx.power();
}
function fov() {
  const P = S.pos;
  S.vis = U.grid(MW, MH, false);
  for (let a = 0; a < 360; a += 2) {
    const dx = Math.cos((a * Math.PI) / 180), dy = Math.sin((a * Math.PI) / 180);
    let x = P.x + 0.5, y = P.y + 0.5;
    for (let i = 0; i < 8; i++) {
      const cx = Math.floor(x), cy = Math.floor(y);
      if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) break;
      S.vis[cy][cx] = S.seen[cy][cx] = true;
      if (S.map[cy][cx] === '#') break;
      x += dx; y += dy;
    }
  }
}
function attackStat() { return S.p.atk + (S.p.wep ? S.p.wep[2] : 0); }
function defStat() { return S.p.def + (S.p.arm ? S.p.arm[2] : 0); }
function move(g, dx, dy) {
  const P = S.pos, nx = P.x + dx, ny = P.y + dy;
  const m = S.mons.find((m) => m.x === nx && m.y === ny);
  if (m) {
    const crit = Math.random() < 0.1;
    const dmg = Math.max(1, attackStat() + U.randi(-1, 2) - m.def) * (crit ? 2 : 1);
    m.hp -= dmg; m.flash = 0.15; m.awake = true;
    g.float(nx * T + T / 2, ny * T, (crit ? '치명타 ' : '') + dmg, crit ? '#fde047' : '#fff', 16); g.sfx.hit();
    if (m.hp <= 0) {
      S.mons.splice(S.mons.indexOf(m), 1); S.p.kills++; g.burst(nx * T + T / 2, ny * T + T / 2, '#ef4444', 14, 120);
      log(`${m.n}을(를) 처치했다! (+${m.xp} XP)`); gainXp(g, m.xp);
      if (Math.random() < 0.3) S.items.push({ x: nx, y: ny, k: 'gold', e: '💰', v: U.randi(5, 20) * S.depth });
      if (m.boss) { g.add(5000); g.win(`드래곤 처치! 처치 ${S.p.kills} · 💰${S.p.gold}`); }
    }
    return true;
  }
  const v = S.map[ny]?.[nx];
  if (!v || v === '#') return false;
  P.x = nx; P.y = ny;
  const it = S.items.find((i) => i.x === nx && i.y === ny);
  if (it) {
    S.items.splice(S.items.indexOf(it), 1);
    if (it.k === 'gold') { S.p.gold += it.v; log(`💰 ${it.v} 골드를 주웠다.`); g.sfx.coin(); }
    if (it.k === 'pot') { S.p.pot++; log('🧪 회복 물약을 주웠다.'); g.sfx.click(); }
    if (it.k === 'scroll') { S.p.scroll++; log('📜 화염 두루마리를 주웠다.'); g.sfx.click(); }
    if (it.k === 'wep') { if (!S.p.wep || it.v[2] > S.p.wep[2]) { S.p.wep = it.v; log(`${it.v[0]} ${it.v[1]} 장착! (공격 +${it.v[2]})`); g.sfx.power(); } else { S.p.gold += 10; log(`${it.v[1]}은 필요없어 팔았다. (+10💰)`); } }
    if (it.k === 'arm') { if (!S.p.arm || it.v[2] > S.p.arm[2]) { S.p.arm = it.v; log(`${it.v[0]} ${it.v[1]} 착용! (방어 +${it.v[2]})`); g.sfx.power(); } else { S.p.gold += 10; log(`${it.v[1]}은 필요없어 팔았다. (+10💰)`); } }
  }
  if (v === '>') { descend(g); return false; }
  return true;
}
function gainXp(g, n) {
  const p = S.p; p.xp += n;
  while (p.xp >= p.need) { p.xp -= p.need; p.lvl++; p.need = Math.floor(p.need * 1.5); p.max += 8; p.hp = p.max; p.atk += 2; p.def += 1; log(`⬆️ 레벨 업! Lv ${p.lvl}`); g.sfx.win(); g.float(S.pos.x * T, S.pos.y * T - 10, 'LEVEL UP!', '#fde047', 22); }
}
function quaff(g) {
  if (S.p.pot <= 0) { log('물약이 없다!'); return false; }
  if (S.p.hp >= S.p.max) { log('이미 체력이 가득하다.'); return false; }
  S.p.pot--; const h = Math.round(S.p.max * 0.5); S.p.hp = Math.min(S.p.max, S.p.hp + h); log(`🧪 체력을 ${h} 회복했다.`); g.sfx.power(); return true;
}
function read(g) {
  if (S.p.scroll <= 0) { log('두루마리가 없다!'); return false; }
  const vis = S.mons.filter((m) => S.vis[m.y][m.x]);
  if (!vis.length) { log('보이는 적이 없다.'); return false; }
  S.p.scroll--;
  const t = vis.sort((a, b) => U.dist(a.x, a.y, S.pos.x, S.pos.y) - U.dist(b.x, b.y, S.pos.x, S.pos.y))[0];
  S.fx = { x: t.x, y: t.y }; S.anim = 0.33; g.sfx.explode(); g.shake(6);
  for (const m of [...S.mons]) if (Math.abs(m.x - t.x) <= 1 && Math.abs(m.y - t.y) <= 1) {
    const dmg = 15 + S.depth * 3; m.hp -= dmg; m.awake = true; g.float(m.x * T + T / 2, m.y * T, dmg, '#f97316', 18);
    if (m.hp <= 0) { S.mons.splice(S.mons.indexOf(m), 1); S.p.kills++; gainXp(g, m.xp); log(`🔥 ${m.n}이(가) 불타 사라졌다!`); if (m.boss) { g.add(5000); g.win('드래곤 처치!'); } }
  }
  return true;
}
function monsters(g) {
  const P = S.pos;
  for (const m of S.mons) {
    if (S.vis[m.y][m.x]) m.awake = true;
    if (!m.awake) continue;
    const acts = m.fast && S.turn % 2 === 0 ? 2 : 1;
    for (let a = 0; a < acts; a++) {
      if (Math.abs(m.x - P.x) + Math.abs(m.y - P.y) === 1) {
        if (Math.random() < 0.12) { log(`${m.n}의 공격이 빗나갔다.`); continue; }
        const dmg = Math.max(1, m.atk + U.randi(-1, 1) - defStat());
        S.p.hp -= dmg; g.float(P.x * T + T / 2, P.y * T, '-' + dmg, '#f87171', 16); g.shake(3, 0.1); g.sfx.tone(150, 0.08, 'square', 0.05);
        log(`${m.n}에게 ${dmg} 피해를 입었다!`);
        continue;
      }
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => S.map[y][x] !== '#' && !S.mons.some((o) => o.x === x && o.y === y) && !(x === P.x && y === P.y));
      if (!opts.length) continue;
      opts.sort((a, b) => U.dist(a[0], a[1], P.x, P.y) - U.dist(b[0], b[1], P.x, P.y));
      const [x, y] = Math.random() < 0.85 ? opts[0] : U.choice(opts);
      m.x = x; m.y = y;
    }
  }
}
