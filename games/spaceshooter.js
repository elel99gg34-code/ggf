let S;
const WW = 4000, TOP = 72, GND = 540;
GAME({
  title: '스페이스 디펜더', w: 960, h: 600, bg: '#02030a', controls: 'dpad+ab', aLabel: '레이저', bLabel: '스마트밤',
  help: '←→ 추진(방향 전환) · ↑↓ 상하 이동 · Space/Z 레이저\nX/Shift 스마트 폭탄(화면 내 적 전멸) · H/1 하이퍼스페이스(랜덤 순간이동)\n👽 착륙선이 사람을 납치해 위로 올라가면 돌연변이가 됩니다!\n납치범을 쏴서 떨어지는 사람을 받아 땅에 내려주면 보너스\n사람이 전멸하면 행성 폭발 — 모든 적이 돌연변이로!\n상단 레이더로 전체 상황을 확인하세요',
  init(g) {
    S = { p: { x: 400, y: 300, vx: 0, vy: 0, face: 1, dead: 0, inv: 2 }, cam: 0, lives: 3, bombs: 3, wave: 0, foes: [], hum: [], bul: [], eb: [], fx: [],
      stars: [], mtn: [], planet: true, waveMsg: 0, cd: 0, baiterT: 0, next: 10000 };
    for (let i = 0; i < 160; i++) S.stars.push({ x: U.rand(WW), y: U.rand(TOP, GND - 40), z: U.rand(0.2, 0.6) });
    for (let x = 0; x < WW; x += 40) S.mtn.push(GND - 10 - Math.abs(Math.sin(x * 0.004) * 40 + Math.sin(x * 0.013) * 22));
    for (let i = 0; i < 10; i++) S.hum.push(human(U.rand(WW)));
    nextWave(g);
  },
  update(g, dt) {
    const P = S.p;
    S.waveMsg -= dt;
    if (P.dead > 0) {
      P.dead -= dt;
      if (P.dead <= 0) { if (S.lives < 0) return g.over(`웨이브 ${S.wave} · 생존 인간 ${S.hum.length}`); P.inv = 2.5; P.vx = 0; P.y = 300; S.eb.length = 0; }
    } else {
      if (g.left) P.face = -1; if (g.right) P.face = 1;
      const thr = g.left || g.right;
      P.vx += (thr ? P.face * 900 : -P.vx * 1.5) * dt; P.vx = U.clamp(P.vx, -560, 560);
      P.vy = (g.down - g.up) * 300;
      if (g.mouse.down) { const dy = g.mouse.y - P.y; P.vy = U.clamp(dy * 4, -300, 300); const sx = g.mouse.x - 480; P.face = sx >= 0 ? 1 : -1; P.vx = U.clamp(P.vx + P.face * 900 * dt * Math.min(1, Math.abs(sx) / 200), -560, 560); }
      P.x = wrap(P.x + P.vx * dt); P.y = U.clamp(P.y + P.vy * dt, TOP + 14, GND - 14);
      P.inv -= dt; S.cd -= dt;
      if ((g.a || (g.mouse.down && g.frame % 2 === 0)) && S.cd <= 0) { S.cd = 0.12; S.bul.push({ x: P.x + P.face * 20, y: P.y + 2, dir: P.face, len: 10, life: 0.45, vx: P.vx }); g.sfx.tone(1500, 0.06, 'square', 0.025, 700); }
      if (g.pressed('b') || g.mouse.rclick) smart(g);
      if (g.keyp('KeyH') || g.keyp('Digit1')) { P.x = U.rand(WW); P.y = U.rand(TOP + 40, GND - 60); P.vx = 0; g.sfx.tone(200, 0.4, 'sine', 0.06, 1600); if (Math.random() < 0.15) { kill(g); } else P.inv = 0.8; }
      // 사람 운반
      for (const h of S.hum) if (h.st === 'fall' && dx(h.x, P.x) ** 2 + (h.y - P.y) ** 2 < 900) { h.st = 'carry'; g.add(500, sx(h.x), h.y - 20); g.sfx.coin(); }
    }
    const target = P.x - 480 + P.face * -200;
    S.cam = wrap(S.cam + dx(target, S.cam) * Math.min(1, dt * 3));
    // 탄
    for (const b of S.bul) {
      b.len += 2400 * dt; b.life -= dt; b.x = wrap(b.x + b.vx * dt);
      for (const f of S.foes) if (!f.dead && Math.abs(f.y - b.y) < f.r) { const d = dx(f.x, b.x) * b.dir; if (d > -f.r && d < b.len) { hurt(g, f); b.life = 0; break; } }
    }
    S.bul = S.bul.filter((b) => b.life > 0);
    // 적
    S.baiterT -= dt;
    if (S.baiterT <= 0) { S.baiterT = 18; S.foes.push(foe('baiter', wrap(P.x + 600), U.rand(150, 400))); }
    const lv = S.wave;
    for (const f of S.foes) {
      f.t += dt; f.cd -= dt;
      const ddx = dx(P.x, f.x), ddy = P.y - f.y, near = Math.abs(ddx) < 560;
      if (f.k === 'lander') {
        if (!f.h) {
          f.x = wrap(f.x + f.vx * dt);
          if (!f.tgt || f.tgt.st !== 'walk') f.tgt = S.hum.filter((h) => h.st === 'walk' && !h.taken).sort((a, b) => Math.abs(dx(a.x, f.x)) - Math.abs(dx(b.x, f.x)))[0];
          const gy = f.tgt && Math.abs(dx(f.tgt.x, f.x)) < 30 ? GND - 28 : 260 + Math.sin(f.t + f.ph) * 80;
          f.y += U.clamp(gy - f.y, -80 * dt, 80 * dt);
          if (f.tgt && Math.abs(dx(f.tgt.x, f.x)) < 30) { f.vx *= 0.9; if (f.y > GND - 34 && f.tgt.st === 'walk') { f.h = f.tgt; f.h.st = 'abduct'; f.h.taken = true; g.sfx.tone(300, 0.6, 'sine', 0.05, 900); } }
          else if (Math.abs(f.vx) < 30) f.vx = (Math.random() < 0.5 ? -1 : 1) * (60 + lv * 6);
        } else {
          f.y -= (40 + lv * 3) * dt; f.h.x = f.x; f.h.y = f.y + 24;
          if (f.y < TOP + 16) { f.dead = true; S.hum = S.hum.filter((h) => h !== f.h); S.foes.push(foe('mutant', f.x, f.y)); g.sfx.tone(120, 0.5, 'sawtooth', 0.07, 400); }
        }
        if (near && f.cd <= 0) { f.cd = U.rand(1.5, 3.5) - lv * 0.1; aim(f.x, f.y, 220 + lv * 10); }
      } else if (f.k === 'mutant') {
        f.x = wrap(f.x + Math.sign(ddx) * (200 + lv * 10) * dt + U.rand(-60, 60) * dt * 8);
        f.y = U.clamp(f.y + Math.sign(ddy) * 150 * dt + U.rand(-50, 50) * dt * 6, TOP + 10, GND - 20);
        if (near && f.cd <= 0) { f.cd = U.rand(1, 2); aim(f.x, f.y, 260); }
      } else if (f.k === 'bomber') {
        f.x = wrap(f.x + f.vx * dt); f.y = 250 + Math.sin(f.t * 0.8 + f.ph) * 150;
        if (f.cd <= 0) { f.cd = 0.9; S.eb.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 6, mine: true }); }
      } else if (f.k === 'pod') {
        f.x = wrap(f.x + f.vx * dt); f.y += f.vy * dt; if (f.y < TOP + 20 || f.y > GND - 60) f.vy *= -1;
      } else if (f.k === 'swarmer') {
        f.vx = U.lerp(f.vx, Math.sign(ddx) * 320, dt * 2); f.x = wrap(f.x + f.vx * dt); f.y += (Math.sign(ddy) * 120 + Math.sin(f.t * 8) * 200) * dt;
        f.y = U.clamp(f.y, TOP + 10, GND - 20);
        if (near && f.cd <= 0) { f.cd = U.rand(1.5, 3); aim(f.x, f.y, 240); }
      } else if (f.k === 'baiter') {
        f.vx = U.lerp(f.vx, Math.sign(ddx) * (Math.abs(P.vx) + 200), dt * 2); f.x = wrap(f.x + f.vx * dt); f.y += U.clamp(ddy, -200, 200) * dt;
        if (f.cd <= 0 && near) { f.cd = 0.7; aim(f.x, f.y, 330); }
      }
      if (P.dead <= 0 && P.inv <= 0 && Math.abs(dx(f.x, P.x)) < f.r + 16 && Math.abs(f.y - P.y) < f.r + 8) { hurt(g, f); kill(g); }
    }
    S.foes = S.foes.filter((f) => !f.dead);
    for (const b of S.eb) {
      b.x = wrap(b.x + b.vx * dt); b.y += b.vy * dt; b.life -= dt;
      if (P.dead <= 0 && P.inv <= 0 && Math.abs(dx(b.x, P.x)) < (b.mine ? 12 : 10) && Math.abs(b.y - P.y) < 9) { b.life = 0; kill(g); }
    }
    S.eb = S.eb.filter((b) => b.life > 0 && b.y > TOP && b.y < GND + 10);
    // 사람
    for (const h of S.hum) {
      h.t += dt;
      if (h.st === 'walk') { h.x = wrap(h.x + h.vx * dt); if (Math.random() < dt * 0.3) h.vx *= -1; }
      else if (h.st === 'fall') { h.vy += 120 * dt; h.y += h.vy * dt; if (h.y >= GND - 12) { if (h.vy > 150) { h.dead = true; g.burst(sx(h.x), h.y, '#fca5a5', 12, 120, 0.5); g.sfx.lose(); } else { h.st = 'walk'; h.y = GND - 12; h.taken = false; g.add(250, sx(h.x), h.y - 20); } } }
      else if (h.st === 'carry') { h.x = P.x; h.y = P.y + 22; if (P.dead > 0) { h.st = 'fall'; h.vy = 0; } else if (P.y > GND - 50) { h.st = 'walk'; h.y = GND - 12; h.vy = 0; h.taken = false; g.add(1000, sx(h.x), h.y - 30); g.float(sx(h.x), h.y - 60, '구출!', '#4ade80', 22); g.sfx.power(); } }
    }
    S.hum = S.hum.filter((h) => !h.dead);
    if (S.planet && !S.hum.length) { S.planet = false; for (const f of S.foes) if (f.k === 'lander') { f.dead = true; S.foes.push(foe('mutant', f.x, f.y)); } g.shake(20, 1.5); g.sfx.explode(); g.float(480, 300, '행성 폭발!!', '#ef4444', 44); }
    if (!S.foes.some((f) => f.k !== 'baiter' && !f.dead) && P.dead <= 0) {
      const bonus = S.hum.length * 100 * Math.min(5, S.wave);
      g.add(bonus, 480, 280); if (bonus) g.float(480, 240, `생존자 보너스 ${bonus}`, '#fde047', 26);
      S.foes = S.foes.filter((f) => f.k !== 'baiter');
      nextWave(g);
    }
    if (g.score >= S.next) { S.next += 10000; S.lives++; S.bombs++; g.sfx.power(); g.float(480, 200, '1UP + 폭탄', '#4ade80', 28); }
    for (const f of S.fx) f.t -= dt;
    S.fx = S.fx.filter((f) => f.t > 0);
    g.info = `웨이브 ${S.wave} · 🚀×${Math.max(0, S.lives)} · 💣×${S.bombs} · 🧑×${S.hum.length}`;
  },
  draw(g, c) {
    const P = S.p;
    for (const s of S.stars) { const x = ((s.x - S.cam * s.z) % 960 + 960) % 960; g.rect(x, s.y, 2, 2, `rgba(255,255,255,${s.z + 0.2})`); }
    if (S.planet) {
      c.strokeStyle = '#b45309'; c.lineWidth = 2; c.beginPath();
      for (let x = 0; x <= 960; x += 10) { const wx = wrap(S.cam + x), i = Math.floor(wx / 40), f = (wx % 40) / 40, y = U.lerp(S.mtn[i], S.mtn[(i + 1) % S.mtn.length], f); x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      g.rect(0, GND, 960, 600 - GND, '#1c1206');
    }
    for (const h of S.hum) { const x = sx(h.x); if (x < -20 || x > 980) continue; g.emoji(h.st === 'fall' ? '🙀' : '🧑', x, h.y, 22); if (h.st === 'abduct') g.ring(x, h.y, 14 + Math.sin(g.time * 12) * 3, '#f472b6', 2); }
    for (const f of S.foes) {
      const x = sx(f.x); if (x < -40 || x > 1000) continue;
      const e = { lander: '👽', mutant: '👹', bomber: '🎃', pod: '🟣', swarmer: '🐝', baiter: '🛸' }[f.k];
      if (f.k === 'lander' && f.h) g.line(x, f.y + 8, x, f.y + 20, '#f472b6', 2);
      g.emoji(e, x, f.y + (f.k === 'mutant' ? U.rand(-2, 2) : 0), f.r * 2.2);
    }
    for (const b of S.eb) { const x = sx(b.x); if (b.mine) { g.rect(x - 4, b.y - 4, 8, 8, Math.floor(g.time * 8) % 2 ? '#f59e0b' : '#fff'); } else { g.circle(x, b.y, 4, '#fff'); g.circle(x, b.y, 2, '#f43f5e'); } }
    for (const b of S.bul) { const x = sx(b.x); const L = Math.min(b.len, 700); c.globalAlpha = Math.min(1, b.life * 4); g.line(x, b.y, x + b.dir * L, b.y, U.hsl((g.time * 600 + b.y) % 360, 90, 70), 2); g.line(x + b.dir * (L - 30), b.y, x + b.dir * L, b.y, '#fff', 3); c.globalAlpha = 1; }
    if (P.dead <= 0 && !(P.inv > 0 && Math.floor(g.time * 12) % 2)) {
      const x = sx(P.x);
      c.save(); c.translate(x, P.y); c.scale(P.face, 1);
      g.poly([[-20, -6], [-6, -10], [22, -2], [24, 2], [-20, 6]], '#e5e7eb', '#60a5fa', 1.5);
      g.poly([[-18, -6], [-12, -14], [-6, -8]], '#a855f7');
      g.rect(-2, -6, 10, 4, '#38bdf8');
      if (g.left || g.right || g.mouse.down) g.poly([[-20, -4], [-34 - Math.random() * 10, 0], [-20, 4]], '#fb923c');
      c.restore();
    }
    for (const f of S.fx) { c.globalAlpha = f.t; g.rect(0, TOP, 960, GND - TOP, 'rgba(255,255,255,.4)'); c.globalAlpha = 1; }
    // 레이더
    g.rect(0, 0, 960, TOP, '#0b1020'); g.line(0, TOP, 960, TOP, '#3b82f6', 2);
    const rx = 180, rw = 600, k = rw / WW, ry = 6, rh = TOP - 12;
    g.stroke(rx, ry, rw, rh, '#1e3a8a', 1);
    const cx0 = rx + rw / 2;
    const rp = (wx) => cx0 + dx(wx, P.x) * k;
    g.stroke(rp(wrap(S.cam + 480)) - 480 * k, ry, 960 * k, rh, 'rgba(255,255,255,.4)', 1);
    for (const h of S.hum) g.rect(rp(h.x) - 1, ry + ((h.y - TOP) / (GND - TOP)) * rh - 1, 3, 3, '#a78bfa');
    for (const f of S.foes) g.rect(rp(f.x) - 1.5, ry + ((f.y - TOP) / (GND - TOP)) * rh - 1.5, 3, 3, f.k === 'lander' ? '#4ade80' : f.k === 'mutant' ? '#ef4444' : '#fbbf24');
    g.rect(cx0 - 2, ry + ((P.y - TOP) / (GND - TOP)) * rh - 2, 5, 4, '#fff');
    for (let i = 0; i < Math.max(0, S.lives); i++) g.emoji('🚀', 20 + i * 24, 22, 18);
    for (let i = 0; i < S.bombs; i++) g.emoji('💣', 20 + i * 22, 50, 16);
    g.text(`WAVE ${S.wave}`, 870, 22, 18, '#fde047'); g.text(`👽 ${S.foes.filter((f) => f.k === 'lander').length}`, 870, 50, 16, '#4ade80');
    if (S.waveMsg > 0) { g.text(`WAVE ${S.wave}`, 480, 260, 48, '#fde047'); g.text(S.planet ? `인간 ${S.hum.length}명을 지켜라!` : '행성 없음 — 생존하라!', 480, 310, 22, '#fff'); }
  },
});
function wrap(x) { return ((x % WW) + WW) % WW; }
function dx(a, b) { let d = (a - b) % WW; if (d > WW / 2) d -= WW; if (d < -WW / 2) d += WW; return d; }
function sx(wx) { return dx(wx, S.cam + 480) + 480; }
function human(x) { return { x, y: GND - 12, vx: U.choice([-12, 12]), st: 'walk', t: 0, vy: 0 }; }
function foe(k, x, y) {
  const r = { lander: 14, mutant: 13, bomber: 14, pod: 16, swarmer: 9, baiter: 16 }[k];
  return { k, x, y, r, t: 0, cd: U.rand(1, 3), vx: U.choice([-1, 1]) * U.rand(50, 90), vy: U.rand(-60, 60), ph: U.rand(6), dead: false };
}
function nextWave(g) {
  S.wave++; S.waveMsg = 2.5; S.baiterT = 40 - Math.min(20, S.wave * 2);
  if (S.wave % 5 === 0 && S.hum.length < 10) { while (S.hum.length < 10) S.hum.push(human(U.rand(WW))); if (!S.planet) { S.planet = true; g.float(480, 350, '행성 복구!', '#4ade80', 26); } }
  const P = S.p, n = 6 + S.wave * 2;
  const far = () => wrap(P.x + U.rand(700, WW - 700));
  for (let i = 0; i < n; i++) S.foes.push(foe(S.planet ? 'lander' : 'mutant', far(), U.rand(TOP + 30, 200)));
  for (let i = 0; i < Math.min(5, Math.floor(S.wave / 2)); i++) S.foes.push(foe('bomber', far(), 250));
  for (let i = 0; i < Math.min(4, Math.floor((S.wave - 1) / 2)); i++) S.foes.push(foe('pod', far(), U.rand(150, 400)));
  g.sfx.power();
}
function aim(x, y, sp) {
  const P = S.p, ddx = dx(P.x, x), ddy = P.y - y, d = Math.hypot(ddx, ddy) || 1;
  S.eb.push({ x, y, vx: (ddx / d) * sp + P.vx * 0.4, vy: (ddy / d) * sp, life: 3 });
}
function hurt(g, f) {
  if (f.dead) return;
  f.dead = true;
  const pts = { lander: 150, mutant: 150, bomber: 250, pod: 1000, swarmer: 150, baiter: 200 }[f.k];
  const x = sx(f.x);
  g.add(pts, x, f.y - 16);
  g.burst(x, f.y, ['#fde047', '#f472b6', '#4ade80', '#fff'], 16, 260, 0.6, 3);
  g.sfx.tone(180, 0.15, 'sawtooth', 0.05, 40);
  if (f.h) { f.h.st = 'fall'; f.h.vy = 0; g.float(x, f.y - 40, '받아라!', '#93c5fd', 18); }
  if (f.k === 'pod') for (let i = 0; i < 5; i++) { const s = foe('swarmer', f.x + U.rand(-20, 20), f.y + U.rand(-20, 20)); s.vx = U.rand(-200, 200); S.foes.push(s); }
}
function smart(g) {
  if (S.bombs <= 0 || S.p.dead > 0) return;
  S.bombs--; S.fx.push({ t: 0.4 }); g.shake(10, 0.4); g.sfx.explode();
  for (const f of S.foes) if (Math.abs(dx(f.x, S.cam + 480)) < 500) hurt(g, f);
  S.eb = S.eb.filter((b) => Math.abs(dx(b.x, S.cam + 480)) > 500);
}
function kill(g) {
  const P = S.p;
  if (P.dead > 0 || P.inv > 0) return;
  const x = sx(P.x);
  g.burst(x, P.y, ['#fff', '#60a5fa', '#a855f7', '#fde047'], 60, 380, 1.2, 4); g.shake(14, 0.6); g.sfx.explode();
  S.lives--; P.dead = 2;
}
