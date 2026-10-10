let S;
const W = 960, H = 640, T = 32;
const LV = [
  ['..............................', '..............................', '...########......########.....', '..............................', '..........##########..........', '..............................', '#######..............#########', '..............................', '.......################.......', '..............................', '###.........########.......###', '..............................', '..............................', '.....######..........######...', '..............................', '..............................', '###.........######.........###', '..............................', '..............................', '##############################'],
  ['..............................', '..............................', '######......######......######', '..............................', '.........############.........', '..............................', '...#####..............#####...', '..............................', '###########........###########', '..............................', '.....####################.....', '..............................', '##........................####', '.....######..........######...', '..............................', '..............................', '###.........######.........###', '..............................', '..............................', '##############################'],
];
GAME({
  title: '스노우 브라더스', w: W, h: H, bg: '#0f172a', controls: 'lr+ab', aLabel: '❄️', bLabel: '⤒',
  help: '←→ 이동 · ↑/X 점프 · Space 눈 던지기\n적에게 눈을 여러 번 맞히면 눈덩이로 변해요\n눈덩이를 밀면(Space) 굴러가면서 다른 적까지 쓸어버려요 — 연쇄 보너스!\n🍣 초밥(점수) · 🧪 물약(빨강=스피드, 파랑=파워, 노랑=사거리)',
  init(g) { S = { lvl: 0, lives: 3, speed: 1, power: 1, range: 1 }; load(g); },
  update(g, dt) {
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) load(g); return; }
    const P = S.p;
    if (P.dead > 0) { P.dead -= dt; if (P.dead <= 0) { if (S.lives < 0) return g.over(`층 ${S.lvl}`); Object.assign(P, { x: 100, y: 18 * T, vx: 0, vy: 0, inv: 2 }); } return; }
    P.inv -= dt;
    P.vx = (g.right - g.left) * 200 * S.speed; if (P.vx) P.face = Math.sign(P.vx);
    if ((g.pressed('b') || g.pressed('up')) && P.ground) { P.vy = -620; g.sfx.jump(); }
    phys(P, dt, 22, 28);
    S.cd -= dt;
    if (g.pressed('a') && S.cd <= 0) {
      const push = S.en.find((e) => e.snow >= 4 && !e.roll && Math.abs(e.x - (P.x + P.face * 30)) < 34 && Math.abs(e.y - P.y) < 30);
      if (push) { push.roll = P.face; push.chain = 0; g.sfx.tone(200, 0.2, 'square', 0.05, 80); }
      else { S.shots.push({ x: P.x + P.face * 18, y: P.y - 10, vx: P.face * 420, vy: -60, life: 0.35 * S.range }); S.cd = 0.25; g.sfx.tone(800, 0.04, 'sine', 0.04); }
    }
    for (const s of S.shots) { s.x += s.vx * dt; s.vy += 500 * dt; s.y += s.vy * dt; s.life -= dt; for (const e of S.en) if (!e.dead && !e.roll && U.dist(s.x, s.y, e.x, e.y - 14) < 24) { s.life = 0; e.snow = Math.min(4, e.snow + S.power); e.melt = 5; e.vx *= 0.3; g.sfx.tone(500, 0.04, 'triangle', 0.04); break; } }
    S.shots = S.shots.filter((s) => s.life > 0);
    for (const e of S.en) {
      if (e.dead) continue;
      if (e.roll) {
        e.vx = e.roll * 420; e.x += e.vx * dt; e.vy += 1500 * dt; e.y += e.vy * dt; landE(e);
        if (e.x < 20 || e.x > W - 20) { e.roll = -e.roll; e.x = U.clamp(e.x, 21, W - 21); e.bounces = (e.bounces || 0) + 1; if (e.bounces > 3) kill(g, e); }
        for (const o of S.en) if (o !== e && !o.dead && U.dist(o.x, o.y, e.x, e.y) < 44) { e.chain++; g.add(500 * e.chain, o.x, o.y - 30); kill(g, o, true); }
        if (e.y > H + 40) kill(g, e);
        continue;
      }
      if (e.snow > 0) { e.melt -= dt; if (e.melt <= 0) { e.snow--; e.melt = 1.5; } if (e.snow >= 4) { e.vx = 0; phys(e, dt, 22, 28); continue; } }
      e.t -= dt;
      if (e.t <= 0) { e.t = U.rand(1, 2.5); e.dir = Math.random() < 0.6 ? Math.sign(P.x - e.x) || 1 : -e.dir; if (Math.random() < 0.3 && e.ground) e.vy = -560; }
      e.vx = e.dir * (60 + S.lvl * 8) * (e.snow ? 0.4 : 1);
      phys(e, dt, 22, 28);
      if (P.inv <= 0 && !e.snow && U.dist(e.x, e.y, P.x, P.y) < 34) { S.lives--; P.dead = 2; g.sfx.lose(); g.shake(8); }
      if (e.snow >= 4 && U.dist(e.x, e.y, P.x, P.y) < 30 && P.vy > 0 && P.y < e.y - 10) { P.vy = -400; }
    }
    S.en = S.en.filter((e) => !e.dead);
    for (const it of S.items) { it.vy += 900 * dt; it.y += it.vy * dt; landE(it); it.t -= dt; if (U.dist(it.x, it.y, P.x, P.y) < 30) { it.t = 0; g.sfx.power(); if (it.k === '🍣') g.add(300, it.x, it.y); else { if (it.c === 'r') S.speed = 1.4; if (it.c === 'b') S.power = 2; if (it.c === 'y') S.range = 1.8; g.float(it.x, it.y - 30, { r: '스피드 UP', b: '파워 UP', y: '사거리 UP' }[it.c], '#fde047'); } } }
    S.items = S.items.filter((i) => i.t > 0);
    if (!S.en.length && !S.clear) { g.add(2000); g.sfx.win(); S.clear = 2; }
    g.info = `${S.lvl}층 · ❤️${Math.max(0, S.lives)}`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1e3a8a'); grd.addColorStop(1, '#0f172a'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) g.circle((i * 97 + g.time * 10) % W, (i * 61 + g.time * 30) % H, 2, 'rgba(255,255,255,.6)');
    for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) if (S.map[y][x] === '#') { g.rect(x * T, y * T, T, T, '#a5f3fc'); g.rect(x * T, y * T, T, 8, '#fff'); g.stroke(x * T, y * T, T, T, '#0891b2', 1); }
    for (const it of S.items) it.k === '🍣' ? g.emoji('🍣', it.x, it.y - 12, 30) : g.emoji('🧪', it.x, it.y - 12, 30);
    for (const e of S.en) {
      if (e.snow >= 4 || e.roll) { c.save(); c.translate(e.x, e.y - 18); if (e.roll) c.rotate(g.time * e.roll * 12); g.circle(0, 0, 24, '#f8fafc'); g.ring(0, 0, 24, '#cbd5e1', 2); g.circle(-6, -6, 6, '#e2e8f0'); c.restore(); continue; }
      c.save(); c.translate(e.x, e.y - 16); if (e.dir > 0) c.scale(-1, 1); g.emoji(e.e, 0, 0, 38); c.restore();
      if (e.snow) { c.globalAlpha = 0.85; g.circle(e.x, e.y - 8, 6 + e.snow * 5, '#f8fafc'); c.globalAlpha = 1; }
    }
    for (const s of S.shots) g.circle(s.x, s.y, 7, '#fff');
    const P = S.p;
    if (!(P.dead > 0) && (P.inv <= 0 || Math.floor(g.time * 10) % 2)) { c.save(); c.translate(P.x, P.y - 18); c.scale(-P.face, 1); g.emoji('⛄', 0, 0, 44); c.restore(); }
    if (S.clear > 0) g.text(`${S.lvl}층 클리어!`, W / 2, 300, 48, '#fde047');
  },
});
function load(g) {
  S.lvl++; S.clear = 0;
  const L = LV[(S.lvl - 1) % LV.length];
  S.map = L.map((r) => [...r]);
  S.p = { x: 100, y: 18 * T, vx: 0, vy: 0, face: 1, ground: false, inv: 2, dead: 0 };
  S.shots = []; S.items = []; S.cd = 0;
  const n = Math.min(8, 3 + S.lvl);
  S.en = Array.from({ length: n }, (_, i) => ({ x: 200 + ((i * 137) % 700), y: 2 * T, vx: 0, vy: 0, dir: i % 2 ? 1 : -1, t: 1, snow: 0, melt: 0, ground: false, e: U.choice(['👹', '👺', '🦖', '👾', '🐸']) }));
}
function solid(x, y) { const cx = Math.floor(x / T), cy = Math.floor(y / T); if (cx < 0 || cx >= 30) return true; return S.map[cy]?.[cx] === '#'; }
function phys(o, dt, hw, hh) {
  o.vy = Math.min(o.vy + 1500 * dt, 800);
  const nx = o.x + o.vx * dt; if (!solid(nx + Math.sign(o.vx) * hw * 0.5, o.y - 4) || o.vx === 0) o.x = U.clamp(nx, 16, W - 16);
  const py = o.y; o.y += o.vy * dt; o.ground = false;
  if (o.vy > 0) { const ty = Math.floor(o.y / T); if ((solid(o.x - 8, o.y) || solid(o.x + 8, o.y)) && py <= ty * T + 2) { o.y = ty * T; o.vy = 0; o.ground = true; } }
  if (o.y > H + 50 && o !== S.p) { o.y = 0; }
  if (o === S.p && o.y > H) o.y = 0;
}
function landE(o) { const ty = Math.floor(o.y / T); if ((solid(o.x - 6, o.y) || solid(o.x + 6, o.y)) && o.vy > 0) { o.y = ty * T; o.vy = 0; } }
function kill(g, e, chained) {
  e.dead = true; g.sfx.explode(); g.burst(e.x, e.y - 18, ['#fff', '#bae6fd'], 20, 250);
  if (!chained) g.add(500, e.x, e.y - 30);
  if (Math.random() < 0.6) S.items.push({ x: e.x, y: e.y - 20, vy: -200, k: Math.random() < 0.6 ? '🍣' : '🧪', c: U.choice(['r', 'b', 'y']), t: 8 });
}
