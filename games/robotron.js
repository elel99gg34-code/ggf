let S;
const AX = 20, AY = 20, AW = 920, AH = 600, MAXW = 15;
const FAM = ['👩', '👨', '🧒'];
GAME({
  title: '로보 학살', w: 960, h: 640, bg: '#000', controls: 'dpad+ab', aLabel: '사격', bLabel: '폭탄',
  help: 'WASD 이동 · 방향키 사격(8방향, 이동과 따로!)\n또는 마우스: 커서 방향으로 사격(클릭 유지)\n모바일/패드: 방향키 이동 + 사격 버튼은 가장 가까운 적 자동 조준\nX/Shift: 스마트 폭탄 (웨이브당 1개) · 사람을 구출하면 점수가 계속 오름!\n🦾 헐크는 죽지 않음(밀려나기만) · 🧠 브레인은 사람을 개조합니다 · 15웨이브 생존',
  init(g) {
    S = { p: { x: 480, y: 320, inv: 2, dead: 0, ax: 1, ay: 0 }, lives: 3, wave: 0, ents: [], hum: [], bul: [], eb: [], fx: [], resc: 0, cd: 0, bomb: 1, banner: 0, next: 25000, clearT: 0 };
    startWave(g);
  },
  update(g, dt) {
    const P = S.p;
    S.banner -= dt;
    if (S.clearT > 0) { S.clearT -= dt; if (S.clearT <= 0) { if (S.wave >= MAXW) { g.add(S.lives * 10000); return g.win(`${MAXW}웨이브 생존! 구출 ${S.totalResc || 0}명`); } startWave(g); } return; }
    if (P.dead > 0) { P.dead -= dt; if (P.dead <= 0) { if (S.lives < 0) return g.over(`웨이브 ${S.wave} · 구출 ${S.totalResc || 0}명`); P.x = 480; P.y = 320; P.inv = 2.5; S.eb.length = 0; for (const e of S.ents) if (U.dist(e.x, e.y, P.x, P.y) < 160) { const a = U.angle(P.x, P.y, e.x, e.y); e.x = P.x + Math.cos(a) * 200; e.y = P.y + Math.sin(a) * 200; } } return; }
    // 이동 (WASD 전용 + 패드)
    let mx = (g.key('KeyD') ? 1 : 0) - (g.key('KeyA') ? 1 : 0), my = (g.key('KeyS') ? 1 : 0) - (g.key('KeyW') ? 1 : 0);
    let sx = (g.key('ArrowRight') ? 1 : 0) - (g.key('ArrowLeft') ? 1 : 0), sy = (g.key('ArrowDown') ? 1 : 0) - (g.key('ArrowUp') ? 1 : 0);
    if (!mx && !my && !g.key('KeyA') && (g.left || g.right || g.up || g.down) && !sx && !sy) { mx = g.right - g.left; my = g.down - g.up; }
    const ml = Math.hypot(mx, my);
    if (ml) { P.x = U.clamp(P.x + (mx / ml) * 210 * dt, AX + 12, AX + AW - 12); P.y = U.clamp(P.y + (my / ml) * 210 * dt, AY + 14, AY + AH - 14); P.fx = mx; P.walk = (P.walk || 0) + dt; }
    P.inv -= dt; S.cd -= dt;
    let fire = false, fa = 0;
    if (sx || sy) { fire = true; fa = Math.atan2(sy, sx); }
    else if (g.mouse.down) { fire = true; fa = U.angle(P.x, P.y, g.mouse.x, g.mouse.y); }
    else if (g.a) { const t = nearest(); fire = true; fa = t ? U.angle(P.x, P.y, t.x, t.y) : Math.atan2(my || 0, mx || 1); }
    if (fire && S.cd <= 0) { S.cd = 0.085; S.bul.push({ x: P.x, y: P.y, vx: Math.cos(fa) * 900, vy: Math.sin(fa) * 900 }); g.sfx.tone(1100, 0.03, 'square', 0.02, 600); }
    if ((g.pressed('b') || g.mouse.rclick) && S.bomb > 0) { S.bomb--; g.shake(12, 0.5); g.sfx.explode(); S.fx.push({ k: 'wave', x: P.x, y: P.y, t: 0.5 }); for (const e of S.ents) if (e.k !== 'hulk' && U.dist(e.x, e.y, P.x, P.y) < 300) kill(g, e); else if (e.k === 'hulk') { const a = U.angle(P.x, P.y, e.x, e.y); e.x += Math.cos(a) * 80; e.y += Math.sin(a) * 80; } S.eb.length = 0; }
    // 탄
    for (const b of S.bul) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < AX || b.x > AX + AW || b.y < AY || b.y > AY + AH) { b.dead = true; continue; }
      for (const e of S.ents) if (!e.dead && Math.abs(e.x - b.x) < e.r && Math.abs(e.y - b.y) < e.r) {
        b.dead = true;
        if (e.k === 'hulk') { e.x += b.vx * 0.012; e.y += b.vy * 0.012; e.stun = 0.1; g.sfx.tone(200, 0.02, 'square', 0.02); }
        else if (e.hp > 1) { e.hp--; e.fl = 0.06; }
        else kill(g, e);
        break;
      }
    }
    S.bul = S.bul.filter((b) => !b.dead);
    // 적
    const lv = S.wave;
    for (const e of S.ents) {
      if (e.dead) continue;
      e.t += dt; e.cd -= dt; e.fl -= dt; if (e.stun > 0) e.stun -= dt;
      const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (e.k === 'grunt') { e.step -= dt; if (e.step <= 0) { e.step = Math.max(0.05, 0.35 - lv * 0.02 - e.t * 0.004); e.x += (dx / d) * 9; e.y += (dy / d) * 9; } }
      else if (e.k === 'hulk') {
        if (e.stun > 0) continue;
        const tgt = S.hum.find((h) => !h.dead && U.dist(h.x, h.y, e.x, e.y) < 220) || P;
        e.turn -= dt; if (e.turn <= 0) { e.turn = U.rand(0.8, 2); const a = U.angle(e.x, e.y, tgt.x, tgt.y); e.dir = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? [Math.sign(Math.cos(a)), 0] : [0, Math.sign(Math.sin(a))]; }
        e.x += e.dir[0] * 55 * dt; e.y += e.dir[1] * 55 * dt;
        for (const h of S.hum) if (!h.dead && U.dist(h.x, h.y, e.x, e.y) < 22) { h.dead = true; S.fx.push({ k: 'skull', x: h.x, y: h.y, t: 1 }); g.sfx.tone(120, 0.3, 'square', 0.05, 60); }
      }
      else if (e.k === 'brain') {
        const h = S.hum.filter((h) => !h.dead).sort((a, b) => U.dist(a.x, a.y, e.x, e.y) - U.dist(b.x, b.y, e.x, e.y))[0];
        const tx = h ? h.x : P.x, ty = h ? h.y : P.y, a = U.angle(e.x, e.y, tx, ty);
        e.x += Math.cos(a) * 60 * dt; e.y += Math.sin(a) * 60 * dt;
        if (h && U.dist(h.x, h.y, e.x, e.y) < 18) { h.dead = true; S.ents.push(E('prog', h.x, h.y)); g.sfx.tone(300, 0.4, 'sawtooth', 0.05, 900); }
        if (e.cd <= 0 && d < 400) { e.cd = U.rand(2, 4); S.eb.push({ x: e.x, y: e.y, vx: (dx / d) * 120, vy: (dy / d) * 120, life: 6, cruise: true }); }
      }
      else if (e.k === 'prog') { const a = Math.atan2(dy, dx) + Math.sin(e.t * 6) * 0.6; e.x += Math.cos(a) * 170 * dt; e.y += Math.sin(a) * 170 * dt; }
      else if (e.k === 'sphere') {
        e.vx += U.rand(-200, 200) * dt; e.vy += U.rand(-200, 200) * dt; const sp = Math.hypot(e.vx, e.vy); if (sp > 180) { e.vx *= 180 / sp; e.vy *= 180 / sp; }
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.cd <= 0 && e.spawn > 0) { e.cd = U.rand(2, 3.5); e.spawn--; S.ents.push(E('enforcer', e.x, e.y)); g.sfx.tone(700, 0.15, 'sine', 0.04, 1400); }
        if (e.spawn <= 0 && e.cd < -2) e.dead = true;
      }
      else if (e.k === 'enforcer') {
        const a = Math.atan2(dy, dx) + Math.sin(e.t * 2) * 0.8; e.x += Math.cos(a) * 110 * dt; e.y += Math.sin(a) * 110 * dt;
        if (e.cd <= 0) { e.cd = U.rand(0.8, 1.8) - lv * 0.03; const t = d / 300, ax = Math.atan2(dy + U.rand(-30, 30), dx + U.rand(-30, 30)); S.eb.push({ x: e.x, y: e.y, vx: Math.cos(ax) * 300, vy: Math.sin(ax) * 300, life: 3 }); }
      }
      else if (e.k === 'tank') {
        e.x += e.vx * dt; e.y += e.vy * dt; if (e.x < AX + 20 || e.x > AX + AW - 20) e.vx *= -1; if (e.y < AY + 20 || e.y > AY + AH - 20) e.vy *= -1;
        if (e.cd <= 0) { e.cd = U.rand(1.5, 2.5); const a = Math.atan2(dy, dx) + U.rand(-0.4, 0.4); S.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 5, bounce: 2 }); }
      }
      e.x = U.clamp(e.x, AX + 10, AX + AW - 10); e.y = U.clamp(e.y, AY + 10, AY + AH - 10);
      if (e.k !== 'electrode' && P.inv <= 0 && Math.abs(e.x - P.x) < e.r + 8 && Math.abs(e.y - P.y) < e.r + 10) die(g);
      if (e.k === 'electrode' && P.inv <= 0 && U.dist(e.x, e.y, P.x, P.y) < e.r + 8) die(g);
      if (e.k === 'grunt' || e.k === 'prog') for (const o of S.ents) if (o.k === 'electrode' && !o.dead && U.dist(o.x, o.y, e.x, e.y) < o.r + 8) { kill(g, e, true); kill(g, o, true); }
    }
    S.ents = S.ents.filter((e) => !e.dead);
    for (const b of S.eb) {
      if (b.cruise) { const a = U.angle(b.x, b.y, P.x, P.y), cur = Math.atan2(b.vy, b.vx); let df = a - cur; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; const na = cur + U.clamp(df, -2 * dt, 2 * dt); b.vx = Math.cos(na) * 140; b.vy = Math.sin(na) * 140; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.x < AX || b.x > AX + AW) { if (b.bounce-- > 0) b.vx *= -1; else b.life = 0; }
      if (b.y < AY || b.y > AY + AH) { if (b.bounce-- > 0) b.vy *= -1; else b.life = 0; }
      if (P.inv <= 0 && U.dist(b.x, b.y, P.x, P.y) < 12) { b.life = 0; die(g); }
      for (const pb of S.bul) if (!pb.dead && U.dist(pb.x, pb.y, b.x, b.y) < 10) { pb.dead = true; b.life = 0; g.add(25); }
    }
    S.eb = S.eb.filter((b) => b.life > 0);
    // 사람
    for (const h of S.hum) {
      if (h.dead) continue;
      h.turn -= dt; if (h.turn <= 0) { h.turn = U.rand(1, 3); const a = U.rand(Math.PI * 2); h.vx = Math.cos(a) * 40; h.vy = Math.sin(a) * 40; }
      h.x = U.clamp(h.x + h.vx * dt, AX + 10, AX + AW - 10); h.y = U.clamp(h.y + h.vy * dt, AY + 10, AY + AH - 10);
      if (U.dist(h.x, h.y, P.x, P.y) < 22) { h.dead = true; S.resc++; S.totalResc = (S.totalResc || 0) + 1; const pts = Math.min(5, S.resc) * 1000; g.add(pts, h.x, h.y - 20); g.sfx.coin(); g.burst(h.x, h.y, ['#4ade80', '#fff'], 12, 160, 0.5); }
    }
    S.hum = S.hum.filter((h) => !h.dead);
    for (const f of S.fx) f.t -= dt;
    S.fx = S.fx.filter((f) => f.t > 0);
    if (g.score >= S.next) { S.next += 25000; S.lives++; g.float(480, 200, '1UP!', '#4ade80', 32); g.sfx.power(); }
    if (!S.ents.some((e) => e.k !== 'hulk' && e.k !== 'electrode')) { S.clearT = 1.8; g.add(1000 * S.wave, 480, 300); g.sfx.win(); }
    g.info = `웨이브 ${S.wave}/${MAXW} · 🧍×${Math.max(0, S.lives)} · 💥×${S.bomb} · 남은 사람 ${S.hum.length}`;
  },
  draw(g, c) {
    const hue = (S.wave * 47) % 360;
    g.stroke(AX - 4, AY - 4, AW + 8, AH + 8, U.hsl(hue, 90, 55), 4);
    g.stroke(AX - 10, AY - 10, AW + 20, AH + 20, U.hsl((hue + 120) % 360, 90, 45), 2);
    for (const e of S.ents) if (e.k === 'electrode') { c.save(); c.translate(e.x, e.y); c.rotate(g.time * 2); g.poly([[0, -e.r], [e.r, 0], [0, e.r], [-e.r, 0]], U.hsl((hue + 180) % 360, 90, 60), '#fff', 1.5); c.restore(); }
    for (const h of S.hum) { g.emoji(h.e, h.x, h.y + Math.sin(g.time * 10 + h.x) * 1.5, 26); }
    for (const e of S.ents) {
      if (e.k === 'electrode') continue;
      c.save(); c.translate(e.x, e.y);
      if (e.fl > 0) c.globalAlpha = 0.4;
      if (e.k === 'grunt') { const s = Math.sin(e.t * 12) > 0 ? 1 : -1; g.rect(-9, -12, 18, 16, '#dc2626'); g.rect(-6, -8, 12, 4, '#fde047'); g.rect(-9 + s * 2, 4, 5, 9, '#facc15'); g.rect(4 - s * 2, 4, 5, 9, '#facc15'); g.rect(-13, -9, 4, 10, '#2563eb'); g.rect(9, -9, 4, 10, '#2563eb'); }
      else if (e.k === 'hulk') { g.emoji('🦾', 0, 0, 40); g.ring(0, 0, 22, 'rgba(34,197,94,.5)', 2); }
      else if (e.k === 'brain') g.emoji('🧠', 0, Math.sin(e.t * 5) * 2, 32);
      else if (e.k === 'prog') { g.emoji('🧟', 0, 0, 26); }
      else if (e.k === 'sphere') { g.circle(0, 0, 13, U.hsl((g.time * 400) % 360, 90, 55)); g.ring(0, 0, 13 + Math.sin(g.time * 10) * 3, '#fff', 2); }
      else if (e.k === 'enforcer') { c.rotate(e.t * 3); g.poly([[0, -12], [11, 8], [-11, 8]], '#f472b6', '#fff', 1.5); }
      else if (e.k === 'tank') { g.rrect(-15, -15, 30, 30, 5, '#7c3aed', '#c4b5fd', 2); g.circle(0, 0, 7, '#ddd6fe'); }
      c.restore();
    }
    for (const b of S.eb) { if (b.cruise) { g.circle(b.x, b.y, 5, '#a3e635'); g.ring(b.x, b.y, 8, 'rgba(163,230,53,.5)', 2); } else if (b.bounce !== undefined) { g.ring(b.x, b.y, 6, '#c084fc', 3); } else g.poly([[b.x - 5, b.y], [b.x, b.y - 5], [b.x + 5, b.y], [b.x, b.y + 5]], '#f9a8d4'); }
    for (const b of S.bul) g.line(b.x, b.y, b.x - b.vx * 0.022, b.y - b.vy * 0.022, U.hsl((g.time * 900) % 360, 100, 70), 3);
    for (const f of S.fx) { if (f.k === 'skull') { c.globalAlpha = f.t; g.emoji('💀', f.x, f.y - (1 - f.t) * 20, 26); c.globalAlpha = 1; } else if (f.k === 'wave') { c.globalAlpha = f.t * 2; g.ring(f.x, f.y, (0.5 - f.t) * 600, '#fff', 6); c.globalAlpha = 1; } }
    const P = S.p;
    if (P.dead <= 0 && !(P.inv > 0 && Math.floor(g.time * 12) % 2)) {
      c.save(); c.translate(P.x, P.y);
      const w = Math.sin((P.walk || 0) * 16) * 3;
      g.rect(-5, 2, 4, 10 + w, '#e5e7eb'); g.rect(1, 2, 4, 10 - w, '#e5e7eb');
      g.rect(-7, -10, 14, 14, '#60a5fa'); g.circle(0, -14, 6, '#fcd34d'); g.rect(-4, -16, 8, 3, '#111');
      c.restore();
    }
    if (P.dead > 0) g.burst(P.x, P.y, U.hsl((g.time * 700) % 360, 100, 60), 2, 300, 0.5, 4);
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); g.text(`WAVE ${S.wave}`, 480, 280, 54, U.hsl(hue, 90, 65)); g.text(S.bannerT, 480, 335, 20, '#fff'); c.globalAlpha = 1; }
    if (S.clearT > 0) g.text('웨이브 클리어!', 480, 300, 44, '#4ade80');
  },
});
function E(k, x, y) {
  const r = { grunt: 12, hulk: 18, brain: 14, prog: 12, sphere: 13, enforcer: 11, tank: 15, electrode: 11 }[k];
  return { k, x, y, r, t: 0, cd: U.rand(0.5, 2.5), step: U.rand(0, 0.4), turn: 0, dir: [1, 0], hp: k === 'tank' ? 3 : k === 'brain' ? 2 : 1, fl: 0, vx: U.rand(-80, 80), vy: U.rand(-80, 80), spawn: 3, stun: 0, dead: false };
}
function startWave(g) {
  S.wave++; S.banner = 2.2; S.bomb = Math.max(S.bomb, 1); S.resc = 0; S.ents = []; S.eb = []; S.bul = [];
  const w = S.wave, P = S.p;
  P.x = 480; P.y = 320; P.inv = 1.5;
  const spot = (minD) => { for (let i = 0; i < 40; i++) { const x = U.rand(AX + 30, AX + AW - 30), y = U.rand(AY + 30, AY + AH - 30); if (U.dist(x, y, 480, 320) > minD) return [x, y]; } return [AX + 40, AY + 40]; };
  const add = (k, n, d = 180) => { for (let i = 0; i < n; i++) { const [x, y] = spot(d); S.ents.push(E(k, x, y)); } };
  add('grunt', 12 + w * 3);
  add('electrode', Math.min(14, 4 + w), 120);
  if (w >= 2) add('hulk', Math.min(8, Math.floor(w / 2) + 1), 220);
  if (w >= 3 && w % 2 === 1) add('brain', Math.min(8, 2 + Math.floor(w / 3)), 250);
  if (w >= 4) add('sphere', Math.min(5, Math.floor(w / 4) + 1), 250);
  if (w >= 6) add('tank', Math.min(6, Math.floor((w - 4) / 2)), 250);
  S.hum = [];
  const nh = 6 + Math.min(6, w);
  for (let i = 0; i < nh; i++) { const [x, y] = spot(120); S.hum.push({ x, y, e: FAM[i % 3], vx: 0, vy: 0, turn: 0, dead: false }); }
  S.bannerT = w === 1 ? '로봇을 쓸어버리고 사람을 구하라!' : w >= 3 && w % 2 === 1 ? '🧠 브레인 웨이브 — 사람을 지켜라!' : w >= 6 ? '탱크가 도탄을 쏜다!' : `로봇 ${S.ents.length}기`;
  g.sfx.tone(330, 0.1, 'square', 0.05); g.sfx.tone(660, 0.2, 'square', 0.05, null, 0.1);
}
function nearest() { let b = null, bd = 1e9; for (const e of S.ents) { if (e.k === 'electrode' && b) continue; const d = U.dist(e.x, e.y, S.p.x, S.p.y) + (e.k === 'hulk' || e.k === 'electrode' ? 300 : 0); if (d < bd) { bd = d; b = e; } } return b; }
function kill(g, e, quiet) {
  if (e.dead || e.k === 'hulk') return;
  e.dead = true;
  const pts = { grunt: 100, brain: 500, prog: 100, sphere: 1000, enforcer: 150, tank: 200, electrode: 25 }[e.k] || 50;
  if (!quiet) g.add(pts);
  const col = { grunt: ['#dc2626', '#facc15'], brain: ['#f472b6', '#fff'], prog: ['#4ade80'], sphere: ['#fff', '#60a5fa'], enforcer: ['#f472b6'], tank: ['#7c3aed', '#c4b5fd'], electrode: ['#fff'] }[e.k];
  g.burst(e.x, e.y, col, 12, 220, 0.4, 3);
  g.sfx.tone(200 + Math.random() * 300, 0.06, 'square', 0.03, 60);
}
function die(g) {
  const P = S.p;
  if (P.inv > 0 || P.dead > 0) return;
  S.lives--; P.dead = 1.8; g.shake(12, 0.5); g.sfx.explode(); g.sfx.lose();
  g.burst(P.x, P.y, ['#60a5fa', '#fcd34d', '#fff'], 40, 320, 0.9, 4);
}
