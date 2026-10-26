let S;
const GY = 530, BASE = 300;
const HST = [
  { n: '사막 협곡', len: 4200, camps: 3, per: 8, need: 12, sky: ['#fbbf24', '#fde68a'], gnd: '#b45309', tanks: 4, aa: 1, jets: 0, chop: 0 },
  { n: '정글 기지', len: 5200, camps: 4, per: 8, need: 18, sky: ['#065f46', '#6ee7b7'], gnd: '#14532d', tanks: 6, aa: 3, jets: 1, chop: 1 },
  { n: '야간 요새', len: 6200, camps: 5, per: 8, need: 26, sky: ['#0f172a', '#334155'], gnd: '#1f2937', tanks: 8, aa: 5, jets: 2, chop: 2 },
];
GAME({
  title: '헬기 강습', w: 960, h: 600, bg: '#000', controls: 'dpad+ab', aLabel: '기관총', bLabel: '폭탄',
  help: '←→ 비행/방향 · ↑↓ 고도 · Space/Z 기관총 · X/Shift 폭탄\n🏚️ 포로 수용소를 사격해 부수면 포로가 나옵니다\n포로 근처에 착륙(↓로 땅까지)하면 탑승 (최대 16명)\n왼쪽 🏁 기지에 착륙하면 하차 = 구출!\n착륙 시 포로를 깔아뭉개지 않도록 주의 · 목표 인원을 구출하면 다음 작전',
  init(g) {
    S = { st: 0, lives: 3, h: null, ents: [], hos: [], bul: [], eb: [], bombs: [], cam: 0, rescued: 0, lost: 0, totalR: 0, banner: 3, done: 0, clouds: [] };
    for (let i = 0; i < 12; i++) S.clouds.push({ x: U.rand(8000), y: U.rand(40, 200), s: U.rand(0.6, 1.5) });
    setup(g);
  },
  update(g, dt) {
    const H = S.h, st = HST[S.st];
    S.banner -= dt;
    if (S.done > 0) { S.done -= dt; if (S.done <= 0) { S.st++; if (S.st >= HST.length) { g.add(S.lives * 5000); return g.win(`총 ${S.totalR}명 구출! 모든 작전 성공`); } setup(g); } return; }
    if (H.dead > 0) {
      H.dead -= dt;
      if (H.dead <= 0) { if (S.lives <= 0) return g.over(`${st.n} · 구출 ${S.totalR + S.rescued}명`); respawn(); }
    } else {
      const ax = g.right - g.left, ay = g.down - g.up;
      if (ax) H.face = ax;
      if (H.landed) { if (ay < 0 || ax) { H.landed = false; H.vy = -60; } }
      else {
        H.vx = U.clamp(H.vx + ax * 420 * dt - H.vx * 0.9 * dt, -330, 330);
        H.vy = U.lerp(H.vy, ay * 220, dt * 4);
        H.x = U.clamp(H.x + H.vx * dt, 60, st.len); H.y = Math.max(70, H.y + H.vy * dt);
        if (H.y >= GY - 20) {
          H.y = GY - 20;
          if (Math.abs(H.vx) < 140 && H.vy > -10) { H.landed = true; H.vx = 0; H.vy = 0; g.sfx.drop(); for (const h of S.hos) if (h.st === 'free' && Math.abs(h.x - H.x) < 34) { h.st = 'dead'; S.lost++; g.float(sx(h.x), GY - 40, '앗!', '#f87171'); g.burst(sx(h.x), GY - 10, '#ef4444', 10, 120, 0.4); } }
          else { hurtH(g, 15); H.vy = -150; H.vx *= -0.5; }
        }
      }
      H.tilt = U.lerp(H.tilt, H.vx / 330 * 0.35, dt * 5);
      H.cd -= dt; H.bcd -= dt; H.inv -= dt;
      if ((g.a || g.mouse.down) && H.cd <= 0) { H.cd = 0.08; const a = (H.face > 0 ? 0 : Math.PI) + H.face * (0.12 + Math.abs(H.tilt) * 0.8); S.bul.push({ x: H.x + H.face * 30, y: H.y + 10, vx: Math.cos(a) * 780 + H.vx, vy: Math.sin(a) * 780, life: 0.9 }); g.sfx.tone(240, 0.03, 'square', 0.03, 120); }
      if ((g.pressed('b') || g.mouse.rclick) && H.bcd <= 0 && !H.landed) { H.bcd = 0.5; S.bombs.push({ x: H.x, y: H.y + 16, vx: H.vx * 0.8, vy: 40 }); g.sfx.tone(600, 0.3, 'sine', 0.03, 200); }
      // 착륙 중 탑승/하차
      if (H.landed) {
        if (H.x < BASE + 120 && H.aboard > 0) { H.unload -= dt; if (H.unload <= 0) { H.unload = 0.25; H.aboard--; S.rescued++; g.add(500, sx(H.x) - 40, GY - 60); g.sfx.coin(); S.walkers.push({ x: H.x - 20, t: 0 }); } }
      }
    }
    S.cam = U.lerp(S.cam, U.clamp(H.x - 480 + H.face * 140, 0, st.len - 860), dt * 3);
    // 포로
    for (const h of S.hos) {
      if (h.st === 'free') {
        if (H.landed && H.dead <= 0 && Math.abs(h.x - H.x) < 280 && H.aboard < 16) { h.x += Math.sign(H.x - h.x) * 70 * dt; h.wave = 0; if (Math.abs(h.x - H.x) < 14) { h.st = 'in'; H.aboard++; g.sfx.tone(800, 0.05, 'square', 0.03); } }
        else { h.wave += dt; h.x += Math.sin(h.wave * 0.7 + h.ph) * 15 * dt; }
      }
    }
    for (const w of S.walkers) { w.t += dt; w.x -= 50 * dt; }
    S.walkers = S.walkers.filter((w) => w.t < 3);
    // 적
    for (const e of S.ents) {
      if (e.dead) continue;
      e.t += dt; e.cd -= dt; e.fl -= dt;
      const dxh = H.x - e.x, onScr = Math.abs(dxh) < 620 && H.dead <= 0;
      if (e.k === 'camp') continue;
      if (e.k === 'tank') { if (onScr) e.x += Math.sign(dxh) * (Math.abs(dxh) > 200 ? 40 : -20) * dt; e.x = U.clamp(e.x, BASE + 400, st.len); if (onScr && e.cd <= 0) { e.cd = U.rand(2, 3.5) - S.st * 0.3; lob(e.x, GY - 30, H.x + H.vx * 0.6, H.y, 380); g.sfx.tone(150, 0.1, 'square', 0.04); } }
      else if (e.k === 'aa') { if (onScr && e.cd <= 0) { e.cd = 0.9 - S.st * 0.1; const a = Math.atan2(H.y - (GY - 30), dxh) + U.rand(-0.1, 0.1); S.eb.push({ x: e.x, y: GY - 30, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: U.rand(0.8, 1.6), flak: true }); } }
      else if (e.k === 'jet') { e.x += e.vx * dt; if ((e.vx > 0 && e.x > H.x + 900) || (e.vx < 0 && e.x < H.x - 900)) { e.vx *= -1; e.y = U.rand(90, 260); } if (onScr && e.cd <= 0 && Math.sign(dxh) === Math.sign(e.vx)) { e.cd = 1.4; const a = Math.atan2(H.y - e.y, dxh); S.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * 380 + e.vx * 0.3, vy: Math.sin(a) * 380, life: 3, missile: true }); g.sfx.tone(500, 0.2, 'sawtooth', 0.03, 200); } }
      else if (e.k === 'chop') { if (onScr) { e.x += U.clamp(dxh - Math.sign(dxh) * 260, -150, 150) * dt; e.y += U.clamp(H.y - e.y, -100, 100) * dt; } if (onScr && e.cd <= 0) { e.cd = 1.1; const a = Math.atan2(H.y - e.y, dxh); S.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 2 }); } }
      if ((e.k === 'jet' || e.k === 'chop') && H.dead <= 0 && Math.abs(e.x - H.x) < 40 && Math.abs(e.y - H.y) < 26) { hitE(g, e, 99); hurtH(g, 40); }
    }
    // 내 탄
    for (const b of S.bul) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.y > GY) { b.life = 0; g.burst(sx(b.x), GY, '#a8a29e', 3, 60, 0.2); }
      for (const e of S.ents) if (!e.dead && Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) { b.life = 0; hitE(g, e, 1); break; }
      for (const h of S.hos) if (h.st === 'free' && Math.abs(b.x - h.x) < 6 && b.y > GY - 24) { b.life = 0; h.st = 'dead'; S.lost++; g.burst(sx(h.x), GY - 10, '#ef4444', 8, 100, 0.4); }
    }
    S.bul = S.bul.filter((b) => b.life > 0);
    for (const b of S.bombs) {
      b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      let hit = b.y >= GY - 4;
      for (const e of S.ents) if (!e.dead && Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) hit = true;
      if (hit) {
        b.done = true; g.burst(sx(b.x), b.y, ['#f97316', '#fde047', '#78350f'], 24, 260, 0.6, 4); g.shake(5, 0.2); g.sfx.explode();
        for (const e of S.ents) if (!e.dead && Math.abs(e.x - b.x) < 70 && Math.abs(e.y - b.y) < 70) hitE(g, e, 8);
        for (const h of S.hos) if (h.st === 'free' && Math.abs(h.x - b.x) < 50) { h.st = 'dead'; S.lost++; }
      }
    }
    S.bombs = S.bombs.filter((b) => !b.done);
    for (const b of S.eb) {
      if (b.g) b.vy += 300 * dt;
      if (b.missile) { const a = Math.atan2(H.y - b.y, H.x - b.x), cur = Math.atan2(b.vy, b.vx); let d = a - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; const na = cur + U.clamp(d, -1.5 * dt, 1.5 * dt), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.flak && b.life <= 0) { g.burst(sx(b.x), b.y, ['#9ca3af', '#f97316'], 8, 120, 0.4); if (Math.hypot(b.x - H.x, b.y - H.y) < 60 && H.dead <= 0) hurtH(g, 10); continue; }
      if (H.dead <= 0 && Math.abs(b.x - H.x) < 30 && Math.abs(b.y - H.y) < 16) { b.life = 0; hurtH(g, b.missile ? 25 : 12); g.burst(sx(b.x), b.y, '#f97316', 10, 160, 0.3); }
      if (b.y > GY) b.life = 0;
    }
    S.eb = S.eb.filter((b) => b.life > 0);
    // 작전 종료 판정
    const caged = S.ents.filter((e) => e.k === 'camp' && !e.dead).reduce((a, e) => a + e.n, 0);
    const field = S.hos.filter((h) => h.st === 'free').length + caged;
    if (S.rescued + H.aboard + field < st.need) return g.over(`구출 가능 인원 부족 (${S.rescued}/${st.need}) — 작전 실패`);
    if (!field && H.aboard === 0 && H.dead <= 0) {
      if (S.rescued >= st.need) { S.done = 3; S.totalR += S.rescued; g.add(3000 * (S.st + 1) + Math.round(H.hp) * 20, 480, 260); g.sfx.win(); }
      else return g.over(`구출 ${S.rescued}/${st.need}명 — 작전 실패`);
    }
    g.info = `${st.n} · 구출 ${S.rescued}/${st.need} · 탑승 ${H.aboard}/16 · 🚁×${S.lives}`;
  },
  draw(g, c) {
    const st = HST[S.st], H = S.h;
    const gr = c.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, st.sky[0]); gr.addColorStop(1, st.sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, 960, 600);
    if (S.st === 2) for (let i = 0; i < 40; i++) g.rect((i * 137) % 960, (i * 71) % 300, 2, 2, '#fff');
    for (const cl of S.clouds) { const x = ((cl.x - S.cam * 0.3) % 1400 + 1400) % 1400 - 200; g.circle(x, cl.y, 26 * cl.s, 'rgba(255,255,255,.35)'); g.circle(x + 28 * cl.s, cl.y + 6, 20 * cl.s, 'rgba(255,255,255,.35)'); }
    for (let i = -1; i < 8; i++) { const x = i * 200 - (S.cam * 0.5) % 200; g.poly([[x, GY], [x + 100, GY - 90 - (i * 37 + Math.floor(S.cam * 0.5 / 200) * 37) % 60], [x + 200, GY]], 'rgba(0,0,0,.15)'); }
    g.rect(0, GY, 960, 600 - GY, st.gnd);
    g.rect(0, GY, 960, 4, 'rgba(255,255,255,.2)');
    // 기지
    const bx = sx(BASE);
    if (bx > -200 && bx < 1100) { g.rect(bx - 120, GY - 6, 240, 6, '#e5e7eb'); g.text('H', bx, GY - 18, 20, '#fde047'); g.emoji('🏁', bx - 140, GY - 30, 40); g.emoji('🏥', bx + 150, GY - 34, 60); }
    if (st.len - S.cam < 1000) g.emoji('🚩', sx(st.len + 40), GY - 30, 40);
    for (const e of S.ents) {
      if (e.dead && e.k !== 'camp') continue;
      const x = sx(e.x); if (x < -80 || x > 1040) continue;
      c.save(); if (e.fl > 0) c.globalAlpha = 0.5;
      if (e.k === 'camp') { if (e.dead) { g.rect(x - 40, GY - 12, 80, 12, '#57534e'); g.emoji('🔥', x - 20, GY - 20, 24); } else { g.rect(x - 44, e.y - 30, 88, 60, '#78716c'); g.poly([[x - 50, e.y - 30], [x, e.y - 56], [x + 50, e.y - 30]], '#57534e'); for (let i = -30; i <= 30; i += 12) g.rect(x + i - 2, e.y - 20, 4, 30, '#1c1917'); g.rect(x - 40, e.y - 40, 80 * e.hp / e.max, 4, '#f87171'); } }
      else if (e.k === 'tank') { c.translate(x, e.y); if (H.x < e.x) c.scale(-1, 1); g.rrect(-26, -4, 52, 18, 6, '#3f6212', '#1a2e05', 2); g.rrect(-16, -16, 30, 14, 4, '#4d7c0f'); c.rotate(-0.5); g.rect(10, -14, 26, 5, '#1a2e05'); }
      else if (e.k === 'aa') { c.translate(x, e.y); g.rect(-20, 0, 40, 18, '#52525b'); c.rotate(Math.atan2(H.y - e.y, H.x - e.x)); g.rect(0, -6, 30, 4, '#27272a'); g.rect(0, 2, 30, 4, '#27272a'); }
      else if (e.k === 'jet') { c.translate(x, e.y); if (e.vx < 0) c.scale(-1, 1); g.emoji('✈️', 0, 0, 52); }
      else if (e.k === 'chop') { c.translate(x, e.y); if (H.x < e.x) c.scale(-1, 1); g.emoji('🚁', 0, 0, 50); }
      c.restore();
    }
    for (const h of S.hos) { if (h.st !== 'free') continue; const x = sx(h.x); g.emoji('🙋', x, GY - 14 - (Math.sin(h.wave * 10) > 0.7 ? 4 : 0), 24); }
    for (const w of S.walkers) g.emoji('🚶', sx(w.x), GY - 14, 22);
    for (const b of S.bul) g.rect(sx(b.x) - 3, b.y - 1.5, 6, 3, '#fde047');
    for (const b of S.bombs) { g.circle(sx(b.x), b.y, 6, '#1f2937'); g.rect(sx(b.x) - 2, b.y - 11, 4, 6, '#4b5563'); }
    for (const b of S.eb) { const x = sx(b.x); if (b.missile) { c.save(); c.translate(x, b.y); c.rotate(Math.atan2(b.vy, b.vx)); g.rect(-8, -2, 16, 4, '#e5e7eb'); g.circle(-10, 0, 3 + Math.random() * 2, '#f97316'); c.restore(); } else g.circle(x, b.y, b.flak ? 4 : 4, b.flak ? '#a8a29e' : '#fb7185'); }
    // 헬기
    if (H.dead <= 0 && !(H.inv > 0 && Math.floor(g.time * 12) % 2)) {
      const x = sx(H.x);
      c.save(); c.translate(x, H.y); c.rotate(H.tilt); c.scale(H.face, 1);
      g.rrect(-26, -10, 46, 22, 10, '#4d7c0f', '#1a2e05', 2);
      g.rrect(4, -6, 16, 12, 6, '#7dd3fc');
      g.rect(-62, -4, 40, 6, '#3f6212');
      g.circle(-62, -2, 8 + Math.sin(g.time * 50) * 2, 'rgba(203,213,225,.5)');
      g.rect(-2, -16, 4, 6, '#1f2937');
      const rw = 52 * Math.abs(Math.cos(g.time * 40));
      g.rect(-rw, -18, rw * 2, 3, '#1f2937');
      g.rect(-20, 14, 40, 3, '#1f2937'); g.rect(-14, 10, 3, 5, '#1f2937'); g.rect(10, 10, 3, 5, '#1f2937');
      c.restore();
      if (H.aboard) g.text(`👥${H.aboard}`, x, H.y - 32, 13, '#fff');
    }
    // HUD
    g.rrect(12, 12, 230, 64, 10, 'rgba(0,0,0,.5)');
    g.text('기체', 36, 30, 13, '#fff'); g.rect(60, 24, 170, 12, '#450a0a'); g.rect(60, 24, 170 * Math.max(0, H.hp) / 100, 12, H.hp > 35 ? '#4ade80' : '#ef4444');
    g.text(`구출 ${S.rescued}/${st.need} · 탑승 ${H.aboard} · 사망 ${S.lost}`, 126, 56, 13, '#fde68a');
    // 미니맵
    const mx = 300, mw = 640, k = mw / (st.len + 200);
    g.rrect(mx - 6, 14, mw + 12, 22, 6, 'rgba(0,0,0,.45)');
    g.rect(mx + BASE * k - 3, 22, 6, 8, '#fde047');
    for (const e of S.ents) if (!e.dead) g.rect(mx + e.x * k - 2, e.k === 'camp' ? 20 : e.k === 'jet' || e.k === 'chop' ? 18 : 26, 4, 4, e.k === 'camp' ? '#a8a29e' : '#ef4444');
    for (const h of S.hos) if (h.st === 'free') g.rect(mx + h.x * k - 1, 30, 2, 3, '#4ade80');
    g.rect(mx + H.x * k - 3, 18, 6, 14, '#60a5fa');
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); g.text(`작전 ${S.st + 1}: ${st.n}`, 480, 230, 40, '#fff'); g.text(`포로 ${st.camps * st.per}명 중 ${st.need}명 이상 구출`, 480, 275, 20, '#fde047'); c.globalAlpha = 1; }
    if (S.done > 0) g.text('작전 성공!', 480, 260, 48, '#4ade80');
  },
});
function sx(x) { return x - S.cam; }
function setup(g) {
  const st = HST[S.st];
  S.h = { x: BASE, y: GY - 20, vx: 0, vy: 0, face: 1, tilt: 0, landed: true, hp: 100, cd: 0, bcd: 0, inv: 2, aboard: 0, unload: 0, dead: 0 };
  S.ents = []; S.hos = []; S.bul = []; S.eb = []; S.bombs = []; S.walkers = [];
  S.rescued = 0; S.lost = 0; S.cam = 0; S.banner = 3;
  for (let i = 0; i < st.camps; i++) { const x = 1100 + (i + 0.5) * ((st.len - 1100) / st.camps); S.ents.push(E('camp', x, GY - 30, { hp: 12, w: 90, h: 60, n: st.per })); }
  for (let i = 0; i < st.tanks; i++) S.ents.push(E('tank', U.rand(1000, st.len), GY - 12, { hp: 6, w: 52, h: 30 }));
  for (let i = 0; i < st.aa; i++) S.ents.push(E('aa', U.rand(1400, st.len), GY - 10, { hp: 8, w: 40, h: 26 }));
  for (let i = 0; i < st.jets; i++) S.ents.push(E('jet', U.rand(2000, st.len), U.rand(90, 220), { hp: 5, w: 50, h: 24, vx: -380 }));
  for (let i = 0; i < st.chop; i++) S.ents.push(E('chop', U.rand(2500, st.len), U.rand(150, 300), { hp: 8, w: 50, h: 30 }));
}
function E(k, x, y, o) { return Object.assign({ k, x, y, t: 0, cd: U.rand(1, 3), fl: 0, dead: false, max: o.hp }, o); }
function respawn() { const H = S.h; Object.assign(H, { x: BASE, y: GY - 20, vx: 0, vy: 0, landed: true, hp: 100, inv: 2.5, aboard: 0, dead: 0 }); }
function lob(x, y, tx, ty, sp) {
  const dxx = tx - x, t = Math.max(0.8, Math.abs(dxx) / sp);
  S.eb.push({ x, y, vx: dxx / t, vy: (ty - y - 0.5 * 300 * t * t) / t, life: t + 1, g: true });
}
function hitE(g, e, d) {
  if (e.dead) return;
  e.hp -= d; e.fl = 0.06;
  if (e.hp > 0) { g.sfx.tone(500, 0.02, 'square', 0.02); return; }
  e.dead = true;
  const x = sx(e.x);
  g.burst(x, e.y, ['#f97316', '#fde047', '#1f2937'], 26, 260, 0.7, 4); g.sfx.explode(); g.shake(5, 0.2);
  if (e.k === 'camp') {
    g.add(1000, x, e.y - 50); g.float(x, e.y - 80, '포로 해방!', '#4ade80', 22);
    for (let i = 0; i < e.n; i++) S.hos.push({ x: e.x + U.rand(-50, 50), st: 'free', wave: 0, ph: U.rand(6) });
    for (const h of S.hos) if (h.st === 'caged' && h.camp === e) h.st = 'free';
  } else g.add({ tank: 300, aa: 400, jet: 800, chop: 600 }[e.k], x, e.y - 30);
}
function hurtH(g, d) {
  const H = S.h;
  if (H.inv > 0 || H.dead > 0) return;
  H.hp -= d; H.inv = 0.3; g.shake(6, 0.2); g.sfx.hit();
  if (H.hp <= 0) {
    H.dead = 2.5; S.lives--;
    g.burst(sx(H.x), H.y, ['#fff', '#f97316', '#fde047'], 60, 380, 1.2, 5); g.shake(14, 0.6); g.sfx.explode();
    if (H.aboard) { S.lost += H.aboard; g.float(480, 220, `탑승자 ${H.aboard}명 사망…`, '#f87171', 24); H.aboard = 0; }
  }
}
