let S;
const T = 20, GN = 26, OX = 40, OY = 30;
const ET = [{ n: '일반', sp: 45, hp: 1, rate: 1.8, col: '#cbd5e1', pts: 100 }, { n: '고속', sp: 85, hp: 1, rate: 1.6, col: '#93c5fd', pts: 200 }, { n: '파워', sp: 50, hp: 1, rate: 0.9, col: '#fca5a5', pts: 300, fast: true }, { n: '장갑', sp: 40, hp: 4, rate: 1.4, col: '#86efac', pts: 400 }];
GAME({
  title: '배틀 시티', w: 860, h: 580, bg: '#525252', controls: 'dpad+ab', aLabel: '💥',
  help: '방향키 이동 · Space 발사\n적 탱크 20대를 모두 부수면 스테이지 클리어 · 🦅 기지를 지켜라!\n아이템: ⭐ 업그레이드 · ⛑️ 무적 · 💣 전멸 · ⏰ 정지 · 🧱 기지 강화 · ❤️ 목숨\n벽돌은 부서지고 철벽은 ⭐3단계에서만 부서져요',
  init(g) { S = { stage: 0, lives: 3, power: 0 }; load(g); },
  update(g, dt) {
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) load(g); return; }
    const P = S.p;
    S.freeze -= dt; S.shovel -= dt; if (S.shovel > -1 && S.shovel <= 0) { fortify('B'); S.shovel = -9; }
    if (P.dead > 0) { P.dead -= dt; if (P.dead <= 0) { if (S.lives < 0) return g.over(`스테이지 ${S.stage}`); Object.assign(P, { x: 8 * T, y: 24 * T, dir: 0, shield: 3 }); } }
    else {
      const D = [['up', 0, -1, 0], ['right', 1, 0, 1], ['down', 0, 1, 2], ['left', -1, 0, 3]];
      let mv = null; for (const d of D) if (g.held(d[0])) mv = d;
      if (mv) { if (P.dir !== mv[3]) { P.dir = mv[3]; P.x = Math.round(P.x / (T / 2)) * (T / 2); P.y = Math.round(P.y / (T / 2)) * (T / 2); } moveTank(P, mv[1] * 90 * dt, mv[2] * 90 * dt); if (g.frame % 8 === 0) g.sfx.tone(80, 0.05, 'square', 0.02); }
      P.cd -= dt; P.shield -= dt;
      const maxB = S.power >= 2 ? 2 : 1;
      if (g.pressed('a') && S.bul.filter((b) => b.o === P).length < maxB) fire(g, P);
    }
    // 적 스폰
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.left > 0 && S.en.length < 4) { const sx = [0, 12, 24][S.spawnIdx++ % 3] * T; if (!S.en.some((e) => Math.abs(e.x - sx) < 2 * T && e.y < 2 * T)) { const t = S.queue.shift(); S.en.push({ x: sx, y: 0, dir: 2, t, hp: ET[t].hp, cd: 1, turn: 1, bonus: [3, 10, 17].includes(20 - S.left) }); S.left--; } S.spawnT = 2.5; }
    for (const e of S.en) {
      if (S.freeze > 0) continue;
      const tp = ET[e.t], dx = [0, 1, 0, -1][e.dir], dy = [-1, 0, 1, 0][e.dir];
      const ox = e.x, oy = e.y; moveTank(e, dx * tp.sp * dt, dy * tp.sp * dt);
      e.turn -= dt;
      if ((ox === e.x && oy === e.y) || e.turn <= 0) { e.turn = U.rand(0.8, 3); e.x = Math.round(e.x / (T / 2)) * (T / 2); e.y = Math.round(e.y / (T / 2)) * (T / 2); e.dir = Math.random() < 0.5 ? 2 : U.randi(0, 3); if (Math.random() < 0.3) e.dir = Math.abs(e.x - 12 * T) > T ? (e.x < 12 * T ? 1 : 3) : 2; }
      e.cd -= dt; if (e.cd <= 0) { e.cd = tp.rate * U.rand(0.6, 1.4); fire(g, e); }
    }
    for (const b of S.bul) {
      const steps = 3;
      for (let k = 0; k < steps && !b.dead; k++) {
        b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
        if (b.x < 0 || b.y < 0 || b.x > GN * T || b.y > GN * T) { b.dead = true; break; }
        const cx = Math.floor(b.x / (T / 2)), cy = Math.floor(b.y / (T / 2));
        // 넓게 부수기 (총알 방향 수직으로 2칸)
        const cells = b.vx ? [[cx, cy], [cx, cy - 1], [cx, cy + 1]] : [[cx, cy], [cx - 1, cy], [cx + 1, cy]];
        let hit = false;
        for (const [x, y] of cells) { const v = S.map[y]?.[x]; if (v === 'B') { S.map[y][x] = '.'; hit = true; } else if (v === 'S') { if (b.big) S.map[y][x] = '.'; hit = true; } }
        if (hit) { b.dead = true; g.sfx.tone(150, 0.05, 'square', 0.04); break; }
        if (Math.abs(b.x - 13 * T) < T && Math.abs(b.y - 25 * T) < T && !S.baseDead) { b.dead = true; S.baseDead = true; g.sfx.explode(); g.shake(16); g.burst(OX + 13 * T, OY + 25 * T, ['#f97316', '#fde047'], 60, 300); g.later(() => g.over('🦅 기지가 파괴됐다!'), 1.5); return; }
        if (b.o === S.p) { for (const e of S.en) if (!e.dead && hitTank(b, e)) { b.dead = true; e.hp--; g.sfx.hit(); if (e.bonus) { e.bonus = false; dropItem(); } if (e.hp <= 0) { e.dead = true; g.add(ET[e.t].pts, OX + e.x + T, OY + e.y + T); S.kills++; g.sfx.explode(); g.burst(OX + e.x + T, OY + e.y + T, ['#f97316', '#fde047', '#fff'], 30, 250); } break; } }
        else if (!S.p.dead && hitTank(b, S.p)) { b.dead = true; if (S.p.shield <= 0) { S.lives--; S.power = 0; S.p.dead = 2; g.sfx.explode(); g.shake(10); g.burst(OX + S.p.x + T, OY + S.p.y + T, ['#fde047', '#fff'], 40, 300); } }
        for (const o of S.bul) if (o !== b && !o.dead && o.o !== b.o && Math.abs(o.x - b.x) < 6 && Math.abs(o.y - b.y) < 6) { o.dead = b.dead = true; }
      }
    }
    S.bul = S.bul.filter((b) => !b.dead); S.en = S.en.filter((e) => !e.dead);
    if (S.item && !S.p.dead && Math.abs(S.item.x - S.p.x) < 2 * T && Math.abs(S.item.y - S.p.y) < 2 * T) { useItem(g, S.item.k); S.item = null; }
    if (S.item) { S.item.t -= dt; if (S.item.t <= 0) S.item = null; }
    if (!S.left && !S.en.length && !S.clear) { g.add(1000 * S.stage); g.sfx.win(); S.clear = 2.5; S.msg = `STAGE ${S.stage} CLEAR`; }
    g.info = `스테이지 ${S.stage} · ❤️${Math.max(0, S.lives)} · 적 ${S.left + S.en.length}`;
  },
  draw(g, c) {
    g.rect(OX, OY, GN * T, GN * T, '#000');
    for (let y = 0; y < GN * 2; y++) for (let x = 0; x < GN * 2; x++) { const v = S.map[y][x], px = OX + x * T / 2, py = OY + y * T / 2; if (v === 'B') { g.rect(px, py, T / 2, T / 2, '#b45309'); g.rect(px, py + T / 4 - 1, T / 2, 1, '#7c2d12'); } else if (v === 'S') { g.rect(px, py, T / 2, T / 2, '#d4d4d4'); g.rect(px + 2, py + 2, T / 2 - 4, T / 2 - 4, '#fafafa'); } else if (v === 'W') g.rect(px, py, T / 2, T / 2, (x + y + Math.floor(g.time * 2)) % 2 ? '#1d4ed8' : '#2563eb'); }
    g.emoji(S.baseDead ? '💥' : '🦅', OX + 13 * T, OY + 25 * T, 36);
    const tank = (t, col, shield) => { const cx = OX + t.x + T, cy = OY + t.y + T; c.save(); c.translate(cx, cy); c.rotate(t.dir * Math.PI / 2); g.rect(-T + 2, -T + 2, 8, 2 * T - 4, '#3f3f46'); g.rect(T - 10, -T + 2, 8, 2 * T - 4, '#3f3f46'); g.rrect(-T + 8, -T + 6, 2 * T - 16, 2 * T - 12, 4, col); g.rect(-3, -T, 6, T, col); g.circle(0, 0, 6, '#18181b'); c.restore(); if (shield) g.ring(cx, cy, T + 3, `rgba(255,255,255,${0.5 + Math.sin(g.time * 30) * 0.4})`, 2); };
    for (const e of S.en) tank(e, e.bonus && Math.floor(g.time * 8) % 2 ? '#f87171' : ET[e.t].col);
    if (!(S.p.dead > 0)) tank(S.p, ['#facc15', '#fde047', '#fef08a', '#fff'][S.power], S.p.shield > 0);
    for (const b of S.bul) g.rect(OX + b.x - 2, OY + b.y - 2, 4, 4, '#fff');
    for (let y = 0; y < GN * 2; y++) for (let x = 0; x < GN * 2; x++) if (S.map[y][x] === 'G') g.rect(OX + x * T / 2, OY + y * T / 2, T / 2, T / 2, 'rgba(22,163,74,.85)');
    if (S.item) g.emoji(S.item.k, OX + S.item.x + T, OY + S.item.y + T, 32);
    g.rect(OX + GN * T + 10, OY, 300, GN * T, '#737373');
    g.text(`STAGE ${S.stage}`, 720, 60, 26, '#fff');
    for (let i = 0; i < S.left; i++) g.emoji('🛡️', 640 + (i % 5) * 32, 110 + Math.floor(i / 5) * 32, 22);
    g.text(`❤️ × ${Math.max(0, S.lives)}`, 720, 300, 22, '#fff'); g.text(`⭐ Lv ${S.power}`, 720, 340, 20, '#fde047');
    if (S.freeze > 0) g.text(`⏰ ${Math.ceil(S.freeze)}`, 720, 380, 20, '#93c5fd');
    if (S.clear > 0) { g.rrect(120, 220, 360, 100, 14, 'rgba(0,0,0,.8)'); g.text(S.msg, 300, 270, 34, '#fde047'); }
  },
});
function load(g) {
  S.stage++;
  const M = U.grid(GN * 2, GN * 2, '.');
  const set = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (M[j] && M[j][i] !== undefined) M[j][i] = v; };
  const R = (() => { let s = S.stage * 7919; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let k = 0; k < 18 + S.stage * 2; k++) { const x = Math.floor(R() * 12) * 4 + 2, y = Math.floor(R() * 10) * 4 + 6, w = 2 + Math.floor(R() * 3) * 2, h = 2 + Math.floor(R() * 4) * 2, r = R(); const v = r < 0.65 ? 'B' : r < 0.78 ? 'S' : r < 0.88 ? 'G' : 'W'; set(x, y, w, h, v); set(GN * 2 - x - w, y, w, h, v); }
  set(0, 0, GN * 2, 4, '.'); set(14, 44, 24, 8, '.'); set(0, 46, 10, 6, '.');
  S.map = M; fortify('B');
  S.p = { x: 8 * T, y: 24 * T, dir: 0, cd: 0, shield: 3, dead: 0 };
  S.en = []; S.bul = []; S.left = 20; S.spawnT = 1; S.spawnIdx = 0; S.kills = 0; S.freeze = 0; S.shovel = -9; S.item = null; S.baseDead = false; S.clear = 0;
  S.queue = Array.from({ length: 20 }, (_, i) => Math.min(3, U.randi(0, Math.min(3, Math.floor(S.stage / 2) + (i > 12 ? 1 : 0)))));
}
function fortify(v) { for (let y = 46; y < 52; y++) for (let x = 22; x < 30; x++) if (!(y >= 48 && x >= 24 && x < 28)) S.map[y][x] = v; }
function solidAt(px, py) { const v = S.map[Math.floor(py / (T / 2))]?.[Math.floor(px / (T / 2))]; return v === undefined || v === 'B' || v === 'S' || v === 'W' || (px > 12 * T && px < 14 * T && py > 24 * T); }
function moveTank(t, dx, dy) {
  const nx = U.clamp(t.x + dx, 0, (GN - 2) * T), ny = U.clamp(t.y + dy, 0, (GN - 2) * T);
  const pts = []; for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) if (i === 1 || i === 3 || j === 1 || j === 3) pts.push([nx + (i * T) / 2 - (i === 3 ? 1 : 0), ny + (j * T) / 2 - (j === 3 ? 1 : 0)]);
  const ok = [[nx + 1, ny + 1], [nx + 2 * T - 1, ny + 1], [nx + 1, ny + 2 * T - 1], [nx + 2 * T - 1, ny + 2 * T - 1], [nx + T, ny + 1], [nx + T, ny + 2 * T - 1], [nx + 1, ny + T], [nx + 2 * T - 1, ny + T]].every(([x, y]) => !solidAt(x, y));
  const others = [S.p, ...S.en].filter((o) => o !== t && !(o.dead > 0));
  const coll = others.some((o) => Math.abs(o.x - nx) < 2 * T - 2 && Math.abs(o.y - ny) < 2 * T - 2 && !(Math.abs(o.x - t.x) < 2 * T - 2 && Math.abs(o.y - t.y) < 2 * T - 2));
  if (ok && !coll) { t.x = nx; t.y = ny; }
}
function fire(g, t) {
  const dx = [0, 1, 0, -1][t.dir], dy = [-1, 0, 1, 0][t.dir], fast = t === S.p ? S.power >= 1 : ET[t.t]?.fast;
  S.bul.push({ x: t.x + T + dx * T, y: t.y + T + dy * T, vx: dx * (fast ? 420 : 260), vy: dy * (fast ? 420 : 260), o: t, big: t === S.p && S.power >= 3 });
  if (t === S.p) g.sfx.shoot();
}
function hitTank(b, t) { return b.x > t.x && b.x < t.x + 2 * T && b.y > t.y && b.y < t.y + 2 * T; }
function dropItem() { S.item = { x: U.randi(1, 22) * T, y: U.randi(3, 20) * T, k: U.choice(['⭐', '⛑️', '💣', '⏰', '🧱', '❤️']), t: 12 }; }
function useItem(g, k) {
  g.sfx.power(); g.add(500);
  if (k === '⭐') S.power = Math.min(3, S.power + 1);
  if (k === '⛑️') S.p.shield = 10;
  if (k === '💣') { S.en.forEach((e) => { e.dead = true; g.burst(OX + e.x + T, OY + e.y + T, '#f97316', 25); }); g.sfx.explode(); }
  if (k === '⏰') S.freeze = 10;
  if (k === '🧱') { fortify('S'); S.shovel = 15; }
  if (k === '❤️') S.lives++;
}
