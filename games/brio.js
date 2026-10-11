let S;
const BW = 3000;
const WPN = {
  fist: { n: '주먹', e: '👊', dmg: 18, rof: 0.45, mag: 0, ammo: null, spd: 0, sp: 0, life: 0, rl: 0, tier: 0 },
  pistol: { n: '권총', e: '🔫', dmg: 15, rof: 0.28, mag: 12, ammo: 'l', spd: 950, sp: 0.06, life: 0.55, rl: 1.1, tier: 1, c: '#cbd5e1' },
  smg: { n: 'SMG', e: '🔫', dmg: 9, rof: 0.075, mag: 30, ammo: 'l', spd: 950, sp: 0.13, life: 0.45, rl: 1.6, tier: 2, c: '#86efac' },
  shotgun: { n: '샷건', e: '🔫', dmg: 10, rof: 0.85, mag: 5, ammo: 's', spd: 850, sp: 0.32, life: 0.32, rl: 2.2, tier: 2, pel: 8, c: '#fca5a5' },
  rifle: { n: '돌격소총', e: '🔫', dmg: 15, rof: 0.11, mag: 30, ammo: 'h', spd: 1150, sp: 0.05, life: 0.65, rl: 1.9, tier: 3, c: '#93c5fd' },
  sniper: { n: '저격총', e: '🔫', dmg: 80, rof: 1.4, mag: 5, ammo: 'h', spd: 1900, sp: 0.004, life: 0.75, rl: 2.6, tier: 4, c: '#fcd34d', zoom: 0.68 },
};
const AMMO = { l: { n: '경탄', c: '#fde047', amt: 30 }, s: { n: '산탄', c: '#f87171', amt: 10 }, h: { n: '중탄', c: '#60a5fa', amt: 30 } };
const ZONE = [{ w: 35, s: 25, f: 0.6, d: 2 }, { w: 30, s: 20, f: 0.55, d: 4 }, { w: 25, s: 18, f: 0.5, d: 7 }, { w: 22, s: 15, f: 0.45, d: 11 }, { w: 20, s: 14, f: 0.4, d: 16 }, { w: 15, s: 12, f: 0.0, d: 25 }];
const NM = ['치킨러버', '야생곰', 'Pro_Sniper', '배그고수', '숲속요정', '김순경', '도망자', 'Rusher', '캠핑족', '한방맨', 'GhostZ', '낙하산', '탄창부족', '보급왕', '자기장', '풀숲러', '총알배송', 'Ninja', '훈장', '막내', '평화주의자', '헤드샷', '건물주', '생존왕'];
GAME({
  title: '배틀로얄 io', w: 1024, h: 640, bg: '#4b7a3a', controls: 'dpad+ab', aLabel: '사격', bLabel: '줍기', noRKey: true,
  help: '✈️ 비행기에서 Space/클릭으로 낙하 → 착지 지점 선택\nWASD 이동 · 마우스 조준 · 클릭/Space 사격\nE/X 무기 줍기 · Q 또는 1/2 무기 교체 · R 재장전\nH 또는 3 = 회복 사용 (🩹붕대 / 💊구급상자)\n자기장(파란 원) 밖은 피해! 최후의 1인이 되면 승리',
  init(g) {
    S = { walls: [], trees: [], items: [], bullets: [], acts: [], feed: [], cam: { x: BW / 2, y: BW / 2, z: 1 }, t: 0, phase: 'plane', kills: 0, fx: [] };
    genMap();
    const a = U.rand(0, Math.PI * 2), off = U.rand(-500, 500);
    S.plane = { x0: BW / 2 + Math.cos(a) * 2000 - Math.sin(a) * off, y0: BW / 2 + Math.sin(a) * 2000 + Math.cos(a) * off, a: a + Math.PI, t: 0, dur: 14 };
    S.plane.x = S.plane.x0; S.plane.y = S.plane.y0;
    S.me = mkAct('나', true);
    S.acts.push(S.me);
    for (let i = 0; i < 24; i++) { const b = mkAct(NM[i], false); b.jumpAt = U.rand(0.2, 0.75); b.skill = U.rand(0.5, 1); S.acts.push(b); }
    S.zone = { x: BW / 2, y: BW / 2, r: BW * 0.75, nx: BW / 2, ny: BW / 2, nr: BW * 0.75, i: -1, t: 15, st: 'wait', ox: 0, oy: 0, or: 0, dmg: 1 };
  },
  update(g, dt) {
    S.t += dt;
    const P = S.me, z = S.cam.z;
    const mwx = S.cam.x + (g.mouse.x - g.W / 2) / z, mwy = S.cam.y + (g.mouse.y - g.H / 2) / z;
    // 비행기
    const pl = S.plane;
    if (pl.t < pl.dur) {
      pl.t += dt;
      const f = pl.t / pl.dur;
      pl.x = pl.x0 + Math.cos(pl.a) * 4000 * f; pl.y = pl.y0 + Math.sin(pl.a) * 4000 * f;
      for (const a of S.acts) if (a.st === 'plane') {
        a.x = pl.x; a.y = pl.y;
        const inMap = pl.x > 100 && pl.x < BW - 100 && pl.y > 100 && pl.y < BW - 100;
        if ((inMap && ((a.me && (g.pressed('a') || g.mouse.clicked)) || (!a.me && f > a.jumpAt))) || f > 0.78) { a.st = 'chute'; a.chute = 3; if (a.me) { g.sfx.tone(300, 0.4, 'sine', 0.05, 120); note('🪂 낙하!'); } }
      }
    }
    // 자기장
    zoneUpdate(g, dt);
    // 플레이어 입력
    if (P.st !== 'dead') {
      let mx = g.right - g.left, my = g.down - g.up; const ml = Math.hypot(mx, my) || 1;
      P.ix = mx / ml; P.iy = my / ml;
      P.a = Math.atan2(mwy - P.y, mwx - P.x);
      P.trig = g.held('a') || g.mouse.down;
      if (g.keyp('KeyQ')) swap(g, P, 1 - P.cur);
      if (g.keyp('Digit1')) swap(g, P, 0);
      if (g.keyp('Digit2')) swap(g, P, 1);
      if (g.keyp('KeyR')) startReload(g, P);
      if (g.keyp('KeyH') || g.keyp('Digit3')) startHeal(g, P);
      if (g.keyp('KeyE') || g.pressed('b')) pickup(g, P, true);
    }
    for (const a of S.acts) if (!a.me && a.st === 'ground') botAI(a, dt);
    for (const a of S.acts) actUpdate(g, a, dt);
    // 탄
    for (const b of S.bullets) {
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let hit = false;
      for (const w of S.walls) if (segRect(b.x, b.y, nx, ny, w)) { hit = true; break; }
      if (!hit) for (const t of S.trees) { const dx = nx - t.x, dy = ny - t.y; if (dx * dx + dy * dy < t.r * t.r * 0.7) { hit = true; break; } }
      if (hit) { b.life = 0; if (onScreen(nx, ny)) S.fx.push({ k: 'spark', x: nx, y: ny, t: 0.15 }); continue; }
      for (const a of S.acts) {
        if (a === b.own || a.st !== 'ground') continue;
        if (segCirc(b.x, b.y, nx, ny, a.x, a.y, 15)) { b.life = 0; damage(g, a, b.dmg, b.own); break; }
      }
      b.x = nx; b.y = ny; b.life -= dt;
    }
    S.bullets = S.bullets.filter((b) => b.life > 0);
    S.fx = S.fx.filter((f) => (f.t -= dt) > 0);
    S.feed = S.feed.filter((f) => (f.t -= dt) > 0);
    // 카메라
    const tgt = P.st === 'plane' ? pl : P;
    let tz = P.st === 'plane' ? 0.55 : P.st === 'chute' ? 0.7 : 1;
    if (P.st === 'ground' && P.w[P.cur] && WPN[P.w[P.cur].k].zoom && g.held('b')) tz = WPN[P.w[P.cur].k].zoom;
    if (P.st === 'ground' && P.w[P.cur] && WPN[P.w[P.cur].k].zoom) tz = 0.8;
    S.cam.z += (tz - S.cam.z) * Math.min(1, dt * 2);
    S.cam.x += (tgt.x - S.cam.x) * Math.min(1, dt * 8); S.cam.y += (tgt.y - S.cam.y) * Math.min(1, dt * 8);
    const alive = S.acts.filter((a) => a.st !== 'dead').length;
    S.alive = alive;
    g.score = S.kills * 150 + Math.floor(S.t) * 2 + (25 - alive) * 20;
    g.info = `👥 생존 ${alive} · 💀 처치 ${S.kills} · ${S.zone.st === 'wait' ? '⏳ 자기장 ' + Math.ceil(S.zone.t) + '초' : '⚠️ 자기장 축소 중'}`;
    if (P.st === 'dead' && !S.ended) { S.ended = true; g.later(() => g.over(`#${alive + 1} 순위 · 처치 ${S.kills} · ${P.killer ? P.killer + '에게 사망' : '자기장에서 사망'}`), 1.2); }
    else if (alive === 1 && P.st !== 'dead' && !S.ended) { S.ended = true; g.add(1000); note('🍗 이겼닭! 오늘 저녁은 치킨이닭!'); g.later(() => g.win(`🏆 최후의 1인! 처치 ${S.kills}`), 1.5); }
  },
  draw(g, c) {
    const z = S.cam.z, P = S.me, Z = S.zone;
    c.save(); c.translate(g.W / 2, g.H / 2); c.scale(z, z); c.translate(-S.cam.x, -S.cam.y);
    const x0 = S.cam.x - g.W / 2 / z, x1 = S.cam.x + g.W / 2 / z, y0 = S.cam.y - g.H / 2 / z, y1 = S.cam.y + g.H / 2 / z;
    g.rect(-600, -600, BW + 1200, BW + 1200, '#2f5d8a');
    g.rect(0, 0, BW, BW, '#5d9147');
    c.strokeStyle = 'rgba(0,0,0,.06)'; c.lineWidth = 2; c.beginPath();
    for (let x = Math.floor(Math.max(0, x0) / 100) * 100; x <= Math.min(BW, x1); x += 100) { c.moveTo(x, Math.max(0, y0)); c.lineTo(x, Math.min(BW, y1)); }
    for (let y = Math.floor(Math.max(0, y0) / 100) * 100; y <= Math.min(BW, y1); y += 100) { c.moveTo(Math.max(0, x0), y); c.lineTo(Math.min(BW, x1), y); }
    c.stroke();
    for (const h of S.houses) if (h.x < x1 && h.x + h.w > x0 && h.y < y1 && h.y + h.h > y0) g.rect(h.x, h.y, h.w, h.h, '#a68a64');
    for (const it of S.items) {
      if (it.x < x0 - 20 || it.x > x1 + 20 || it.y < y0 - 20 || it.y > y1 + 20) continue;
      const bob = Math.sin(S.t * 3 + it.x) * 2;
      if (it.k === 'w') { g.circle(it.x, it.y, 17, 'rgba(0,0,0,.25)'); g.ring(it.x, it.y, 17, WPN[it.v].c, 3); g.emoji('🔫', it.x, it.y + bob, 20); g.text(WPN[it.v].n, it.x, it.y + 26, 11, WPN[it.v].c); }
      else if (it.k === 'a') { g.rrect(it.x - 9, it.y - 7 + bob, 18, 14, 3, AMMO[it.v].c, '#333', 2); }
      else g.emoji(it.k === 'band' ? '🩹' : it.k === 'med' ? '💊' : '🦺', it.x, it.y + bob, 22);
    }
    for (const a of S.acts) if (a.st === 'ground' && a.x > x0 - 40 && a.x < x1 + 40 && a.y > y0 - 40 && a.y < y1 + 40) drawAct(g, c, a);
    for (const b of S.bullets) g.line(b.x, b.y, b.x - b.vx * 0.025, b.y - b.vy * 0.025, b.own.me ? '#fef08a' : '#fed7aa', 3);
    for (const w of S.walls) if (w.x < x1 && w.x + w.w > x0 && w.y < y1 && w.y + w.h > y0) { g.rect(w.x, w.y, w.w, w.h, '#5b4630'); }
    for (const h of S.houses) if (h.x < x1 && h.x + h.w > x0 && h.y < y1 && h.y + h.h > y0 && !(P.st === 'ground' && P.x > h.x && P.x < h.x + h.w && P.y > h.y && P.y < h.y + h.h)) {
      c.globalAlpha = 0.9; g.rect(h.x + 6, h.y + 6, h.w - 12, h.h - 12, h.roof); c.globalAlpha = 1;
      g.line(h.x + 6, h.y + h.h / 2, h.x + h.w - 6, h.y + h.h / 2, 'rgba(0,0,0,.25)', 3);
    }
    for (const t of S.trees) if (t.x > x0 - 60 && t.x < x1 + 60 && t.y > y0 - 60 && t.y < y1 + 60) { if (t.rock) { g.circle(t.x, t.y, t.r, '#8b8f94'); g.circle(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.5, '#a3a7ab'); } else { c.globalAlpha = 0.92; g.circle(t.x, t.y, t.r, '#2f6b2a'); g.circle(t.x - 5, t.y - 5, t.r * 0.65, '#3d8a35'); c.globalAlpha = 1; } }
    for (const f of S.fx) { if (f.k === 'spark') g.circle(f.x, f.y, 5, '#fde68a'); if (f.k === 'blood') { c.globalAlpha = f.t * 3; g.circle(f.x, f.y, 10, '#dc2626'); c.globalAlpha = 1; } if (f.k === 'melee') { c.globalAlpha = f.t * 5; g.ring(f.x, f.y, 26, '#fff', 4); c.globalAlpha = 1; } }
    for (const a of S.acts) if (a.st === 'chute') { g.circle(a.x, a.y, 14, a.me ? '#facc15' : '#f97316'); g.emoji('🪂', a.x, a.y - 30, 44 * (0.7 + a.chute / 6)); }
    // 자기장
    c.fillStyle = 'rgba(40,90,255,.28)'; c.beginPath(); c.rect(-700, -700, BW + 1400, BW + 1400); c.arc(Z.x, Z.y, Z.r, 0, Math.PI * 2, true); c.fill();
    g.ring(Z.x, Z.y, Z.r, '#60a5fa', 6);
    if (Z.i >= 0 && Z.st === 'wait') { c.setLineDash([20, 14]); g.ring(Z.nx, Z.ny, Z.nr, '#fff', 4); c.setLineDash([]); }
    if (S.plane.t < S.plane.dur) { c.save(); c.translate(S.plane.x, S.plane.y); c.rotate(S.plane.a + Math.PI / 4); g.emoji('✈️', 0, 0, 90); c.restore(); }
    c.restore();
    // HUD
    if (P.st === 'plane') { g.text('Space / 클릭으로 낙하!', g.W / 2, 90, 30, '#fff'); g.text('비행기 경로를 보고 착지할 곳을 고르세요', g.W / 2, 124, 16, '#e2e8f0'); }
    if (P.st === 'chute') g.text(`🪂 착지까지 ${P.chute.toFixed(1)}초 - 방향키로 활강`, g.W / 2, 90, 20, '#fff');
    // 미니맵
    const MM = 150, mx0 = g.W - MM - 10, my0 = 10, k = MM / BW;
    g.rect(mx0, my0, MM, MM, '#3f6d33'); g.stroke(mx0, my0, MM, MM, '#111', 2);
    for (const h of S.houses) g.rect(mx0 + h.x * k, my0 + h.y * k, h.w * k, h.h * k, '#a68a64');
    c.save(); c.beginPath(); c.rect(mx0, my0, MM, MM); c.clip();
    g.ring(mx0 + Z.x * k, my0 + Z.y * k, Z.r * k, '#60a5fa', 2);
    if (Z.i >= 0) g.ring(mx0 + Z.nx * k, my0 + Z.ny * k, Z.nr * k, '#fff', 1);
    if (S.plane.t < S.plane.dur) { g.line(mx0 + S.plane.x0 * k, my0 + S.plane.y0 * k, mx0 + (S.plane.x0 + Math.cos(S.plane.a) * 4000) * k, my0 + (S.plane.y0 + Math.sin(S.plane.a) * 4000) * k, 'rgba(255,255,255,.5)', 1); }
    c.restore();
    const me = P.st === 'plane' ? S.plane : P;
    g.circle(mx0 + me.x * k, my0 + me.y * k, 4, '#facc15');
    // 킬피드
    S.feed.forEach((f, i) => g.text(f.s, g.W - 12, my0 + MM + 18 + i * 20, 13, f.me ? '#fde047' : '#fff', 'right'));
    // 하단: 체력/무기
    if (P.st !== 'plane') {
      const hx = g.W / 2 - 160, hy = g.H - 46;
      g.rrect(hx, hy, 320, 22, 6, 'rgba(0,0,0,.55)');
      g.rrect(hx + 2, hy + 2, 316 * Math.max(0, P.hp) / 100, 18, 5, P.hp > 50 ? '#f8fafc' : P.hp > 25 ? '#fbbf24' : '#ef4444');
      g.text(Math.ceil(Math.max(0, P.hp)), g.W / 2, hy + 12, 14, '#111');
      if (P.armor) g.text(`🦺 Lv${P.armor}`, hx - 40, hy + 12, 14, '#fff');
      for (let i = 0; i < 2; i++) {
        const w = P.w[i], bx = g.W / 2 - 170 + i * 175, by = g.H - 100;
        g.rrect(bx, by, 165, 46, 8, i === P.cur ? 'rgba(250,204,21,.35)' : 'rgba(0,0,0,.45)', i === P.cur ? '#facc15' : 'rgba(255,255,255,.2)', 2);
        if (w) { const d = WPN[w.k]; g.text(`${i + 1}. ${d.n}`, bx + 10, by + 15, 14, d.c, 'left'); g.text(`${w.mag}/${d.mag}  (${P.ammo[d.ammo]})`, bx + 10, by + 33, 13, '#fff', 'left'); }
        else g.text(`${i + 1}. 👊 빈 슬롯`, bx + 10, by + 23, 14, '#94a3b8', 'left');
      }
      g.text(`🩹${P.band}  💊${P.med}`, g.W / 2 + 200, g.H - 34, 16, '#fff', 'left');
      g.text(`경${P.ammo.l} 산${P.ammo.s} 중${P.ammo.h}`, g.W / 2 + 200, g.H - 76, 12, '#e2e8f0', 'left');
      if (P.reload > 0) g.text('재장전 중...', g.W / 2, g.H - 120, 16, '#fde047');
      if (P.heal) g.text(`${P.heal.k === 'med' ? '💊 구급상자' : '🩹 붕대'} 사용 중 ${P.heal.t.toFixed(1)}`, g.W / 2, g.H - 140, 16, '#4ade80');
      const near = nearItem(P);
      if (near && near.k === 'w') g.text(`E: ${WPN[near.v].n} 줍기`, g.W / 2, g.H / 2 + 50, 16, '#fff');
      const Zd = U.dist(P.x, P.y, Z.x, Z.y);
      if (Zd > Z.r && P.st === 'ground') { g.text('⚠️ 자기장 밖! 안으로 이동하세요', g.W / 2, 60, 20, '#93c5fd'); const a = Math.atan2(Z.y - P.y, Z.x - P.x); g.text('➤', g.W / 2 + Math.cos(a) * 80, g.H / 2 + Math.sin(a) * 80, 30, '#93c5fd'); }
    }
    g.text(`👥 ${S.alive || 25}`, 14, 22, 20, '#fff', 'left');
    S.msg && S.msg.forEach((m, i) => g.text(m.s, g.W / 2, 160 + i * 26, 20, '#fff'));
  },
});
function note(s) { S.msg = S.msg || []; S.msg.push({ s, t: 2.5 }); if (S.msg.length > 3) S.msg.shift(); setTimeout(() => { S.msg = (S.msg || []).filter((m) => m.s !== s); }, 2500); }
function mkAct(name, me) {
  return { name, me, x: 0, y: 0, vx: 0, vy: 0, ix: 0, iy: 0, a: 0, hp: 100, armor: 0, w: [null, null], cur: 0, ammo: { l: 0, s: 0, h: 0 }, band: 0, med: 0, cd: 0, reload: 0, heal: null, st: 'plane', kills: 0, trig: false, flash: 0, stuck: 0, dodge: 0, think: 0 };
}
function genMap() {
  S.houses = [];
  const roofs = ['#7c3f2a', '#5b6b7a', '#8a5a2b', '#6b4c7a', '#3f6b6b'];
  for (let tries = 0; S.houses.length < 30 && tries < 600; tries++) {
    const w = U.randi(170, 280), h = U.randi(150, 230), x = U.randi(150, BW - 150 - w), y = U.randi(150, BW - 150 - h);
    if (S.houses.some((o) => x < o.x + o.w + 90 && x + w + 90 > o.x && y < o.y + o.h + 90 && y + h + 90 > o.y)) continue;
    const H = { x, y, w, h, roof: U.choice(roofs) };
    S.houses.push(H);
    const T = 14, door = 64, ds = U.randi(0, 3), ds2 = (ds + 2) % 4;
    const sides = [[x, y, w, T, 'h'], [x + w - T, y, T, h, 'v'], [x, y + h - T, w, T, 'h'], [x, y, T, h, 'v']];
    sides.forEach((s, i) => {
      if (i === ds || (i === ds2 && Math.random() < 0.5)) {
        if (s[4] === 'h') { const m = s[0] + s[2] / 2; S.walls.push({ x: s[0], y: s[1], w: m - door / 2 - s[0], h: T }, { x: m + door / 2, y: s[1], w: s[0] + s[2] - m - door / 2, h: T }); }
        else { const m = s[1] + s[3] / 2; S.walls.push({ x: s[0], y: s[1], w: T, h: m - door / 2 - s[1] }, { x: s[0], y: m + door / 2, w: T, h: s[1] + s[3] - m - door / 2 }); }
      } else S.walls.push({ x: s[0], y: s[1], w: s[2], h: s[3] });
    });
    const n = U.randi(2, 4);
    for (let i = 0; i < n; i++) addItem(x + U.rand(35, w - 35), y + U.rand(35, h - 35), true);
  }
  for (let i = 0; i < 170; i++) {
    const x = U.rand(60, BW - 60), y = U.rand(60, BW - 60), r = U.rand(22, 40);
    if (S.houses.some((h) => x > h.x - r - 30 && x < h.x + h.w + r + 30 && y > h.y - r - 30 && y < h.y + h.h + r + 30)) continue;
    S.trees.push({ x, y, r, rock: Math.random() < 0.3 });
  }
  for (let i = 0; i < 110; i++) addItem(U.rand(80, BW - 80), U.rand(80, BW - 80), false);
}
function addItem(x, y, good) {
  const r = Math.random();
  if (r < (good ? 0.45 : 0.3)) {
    const w = U.choice(good ? ['pistol', 'smg', 'shotgun', 'rifle', 'rifle', 'smg', 'sniper'] : ['pistol', 'pistol', 'smg', 'shotgun', 'rifle']);
    S.items.push({ k: 'w', v: w, x, y });
    S.items.push({ k: 'a', v: WPN[w].ammo, x: x + U.rand(-25, 25), y: y + U.rand(-25, 25), n: AMMO[WPN[w].ammo].amt });
  } else if (r < 0.65) { const v = U.choice(['l', 's', 'h']); S.items.push({ k: 'a', v, x, y, n: AMMO[v].amt }); }
  else if (r < 0.82) S.items.push({ k: 'band', x, y });
  else if (r < 0.9) S.items.push({ k: 'med', x, y });
  else S.items.push({ k: 'armor', v: Math.random() < 0.6 ? 1 : Math.random() < 0.7 ? 2 : 3, x, y });
}
function onScreen(x, y) { return Math.abs(x - S.cam.x) < 700 && Math.abs(y - S.cam.y) < 450; }
function scr(x, y) { return [(x - S.cam.x) * S.cam.z + 512, (y - S.cam.y) * S.cam.z + 320]; }
function zoneUpdate(g, dt) {
  const Z = S.zone;
  if (S.plane.t < S.plane.dur * 0.6) return;
  Z.t -= dt;
  if (Z.st === 'wait') {
    if (Z.i < 0 && Z.t <= 0) { nextZone(); return; }
    if (Z.t <= 0 && Z.i >= 0) { Z.st = 'shrink'; Z.t = ZONE[Z.i].s; Z.ox = Z.x; Z.oy = Z.y; Z.or = Z.r; note('⚠️ 자기장이 줄어듭니다!'); g.sfx.tone(220, 0.6, 'sawtooth', 0.05, 110); }
  } else {
    const f = 1 - Math.max(0, Z.t) / ZONE[Z.i].s;
    Z.x = U.lerp(Z.ox, Z.nx, f); Z.y = U.lerp(Z.oy, Z.ny, f); Z.r = U.lerp(Z.or, Z.nr, f);
    if (Z.t <= 0) { Z.dmg = ZONE[Z.i].d; if (Z.i < ZONE.length - 1) nextZone(); else Z.st = 'final'; }
  }
}
function nextZone() {
  const Z = S.zone;
  Z.i++;
  const P = ZONE[Z.i];
  const nr = Math.max(Z.i === 0 ? BW * 0.42 : Z.r * P.f, 0);
  const a = U.rand(0, Math.PI * 2), d = U.rand(0, Math.max(0, Z.r - nr) * 0.85);
  Z.nx = U.clamp(Z.x + Math.cos(a) * d, 200, BW - 200); Z.ny = U.clamp(Z.y + Math.sin(a) * d, 200, BW - 200); Z.nr = nr;
  if (Z.i === 0) { Z.x = BW / 2; Z.y = BW / 2; }
  Z.st = 'wait'; Z.t = P.w; Z.dmg = Math.max(Z.dmg, P.d * 0.6);
  note(`📍 다음 자기장 표시됨 (${P.w}초 후 축소)`);
}
function solid(a) {
  for (const w of S.walls) {
    const nx = U.clamp(a.x, w.x, w.x + w.w), ny = U.clamp(a.y, w.y, w.y + w.h), dx = a.x - nx, dy = a.y - ny, d2 = dx * dx + dy * dy;
    if (d2 < 15 * 15) { const d = Math.sqrt(d2) || 0.01; if (d2 === 0) { a.x += 1; continue; } a.x += (dx / d) * (15 - d); a.y += (dy / d) * (15 - d); a.hitWall = true; }
  }
  for (const t of S.trees) { const dx = a.x - t.x, dy = a.y - t.y, d = Math.hypot(dx, dy), m = t.r * 0.8 + 15; if (d < m && d > 0) { a.x += (dx / d) * (m - d); a.y += (dy / d) * (m - d); a.hitWall = true; } }
  a.x = U.clamp(a.x, 15, BW - 15); a.y = U.clamp(a.y, 15, BW - 15);
}
function actUpdate(g, a, dt) {
  if (a.st === 'dead' || a.st === 'plane') return;
  if (a.st === 'chute') {
    a.chute -= dt;
    if (!a.me && a.dropX === undefined) { const h = U.choice(S.houses); a.dropX = h.x + h.w / 2 + U.rand(-150, 150); a.dropY = h.y + h.h / 2 + U.rand(-150, 150); }
    if (!a.me) { const an = Math.atan2(a.dropY - a.y, a.dropX - a.x); a.ix = Math.cos(an); a.iy = Math.sin(an); }
    a.x = U.clamp(a.x + a.ix * 300 * dt, 20, BW - 20); a.y = U.clamp(a.y + a.iy * 300 * dt, 20, BW - 20);
    if (a.chute <= 0) { a.st = 'ground'; solid(a); if (a.me) { g.sfx.drop(); g.shake(4, 0.2); } }
    return;
  }
  a.cd -= dt; a.flash -= dt; a.hitWall = false;
  const slow = a.heal ? 0.45 : 1;
  const sp = 210 * slow;
  a.x += a.ix * sp * dt; a.y += a.iy * sp * dt;
  solid(a);
  const Z = S.zone;
  if (U.dist(a.x, a.y, Z.x, Z.y) > Z.r) { a.zt = (a.zt || 0) + dt; if (a.zt > 1) { a.zt = 0; damage(g, a, Z.dmg, null, true); } }
  // 재장전
  const w = a.w[a.cur];
  if (a.reload > 0) {
    a.reload -= dt;
    if (a.reload <= 0 && w) { const d = WPN[w.k], need = d.mag - w.mag, take = Math.min(need, a.ammo[d.ammo]); w.mag += take; a.ammo[d.ammo] -= take; if (a.me) g.sfx.click(); }
  }
  if (a.heal) {
    a.heal.t -= dt;
    if (a.heal.t <= 0) { if (a.heal.k === 'med') a.hp = 100; else a.hp = Math.min(100, Math.max(a.hp, Math.min(75, a.hp + 20))); a.heal = null; if (a.me) { g.sfx.power(); g.float(512, 280, '회복!', '#4ade80'); } }
  }
  // 아이템 자동 획득
  pickup(g, a, false);
  if (a.trig && a.cd <= 0 && a.reload <= 0 && !a.heal) shoot(g, a);
}
function shoot(g, a) {
  const w = a.w[a.cur], d = w ? WPN[w.k] : WPN.fist;
  if (w && w.mag <= 0) { startReload(g, a); return; }
  a.cd = d.rof;
  if (!w) {
    const hx = a.x + Math.cos(a.a) * 26, hy = a.y + Math.sin(a.a) * 26;
    for (const o of S.acts) if (o !== a && o.st === 'ground' && U.dist(o.x, o.y, hx, hy) < 28) damage(g, o, d.dmg, a);
    if (onScreen(hx, hy)) { S.fx.push({ k: 'melee', x: hx, y: hy, t: 0.15 }); if (a.me) g.sfx.tone(160, 0.06, 'triangle', 0.05); }
    a.punch = 0.15;
    return;
  }
  w.mag--;
  const n = d.pel || 1, err = d.sp * (a.me ? 1 : 1.6 - a.skill * 0.6);
  for (let i = 0; i < n; i++) {
    const an = a.a + U.rand(-err, err);
    S.bullets.push({ x: a.x + Math.cos(a.a) * 22, y: a.y + Math.sin(a.a) * 22, vx: Math.cos(an) * d.spd * U.rand(0.9, 1), vy: Math.sin(an) * d.spd * U.rand(0.9, 1), dmg: d.dmg, life: d.life, own: a });
  }
  a.muz = 0.06;
  if (onScreen(a.x, a.y)) {
    const vol = a.me ? 0.05 : 0.02;
    if (w.k === 'sniper') g.sfx.tone(140, 0.25, 'sawtooth', vol * 1.5, 50);
    else if (w.k === 'shotgun') g.sfx.noise(0.18, vol * 1.6);
    else g.sfx.tone(w.k === 'pistol' ? 420 : 300, 0.05, 'square', vol, 90);
    if (a.me && w.k === 'sniper') g.shake(3, 0.1);
  }
  if (w.mag <= 0 && a.ammo[d.ammo] > 0) startReload(g, a);
}
function startReload(g, a) {
  const w = a.w[a.cur]; if (!w || a.reload > 0) return;
  const d = WPN[w.k]; if (w.mag >= d.mag || a.ammo[d.ammo] <= 0) { if (a.me && a.ammo[d.ammo] <= 0 && w.mag <= 0) note('탄약 없음!'); return; }
  a.reload = d.rl; a.heal = null; if (a.me) g.sfx.tone(600, 0.05, 'square', 0.03);
}
function startHeal(g, a) {
  if (a.heal || a.hp >= 100) return;
  if (a.med > 0 && (a.hp < 50 || a.band <= 0)) { a.med--; a.heal = { k: 'med', t: 5 }; }
  else if (a.band > 0 && a.hp < 75) { a.band--; a.heal = { k: 'band', t: 2.5 }; }
  else if (a.me) note(a.band + a.med ? '붕대는 75까지만 회복돼요' : '회복 아이템 없음');
  if (a.heal) a.reload = 0;
}
function swap(g, a, i) { if (a.cur === i) return; a.cur = i; a.reload = 0; a.cd = 0.25; if (a.me) g.sfx.click(); }
function nearItem(a) {
  let best = null, bd = 40;
  for (const it of S.items) { const d = U.dist(it.x, it.y, a.x, a.y); if (d < bd && it.k === 'w') { bd = d; best = it; } }
  return best;
}
function pickup(g, a, manual) {
  for (const it of S.items) {
    if (it.gone || Math.abs(it.x - a.x) > 30 || Math.abs(it.y - a.y) > 30 || U.dist(it.x, it.y, a.x, a.y) > 30) continue;
    if (it.k === 'a') { a.ammo[it.v] += it.n; it.gone = true; if (a.me) { g.sfx.coin(); g.float(512, 290, `+${it.n} ${AMMO[it.v].n}`, AMMO[it.v].c, 16); } }
    else if (it.k === 'band' && a.band < 10) { a.band++; it.gone = true; if (a.me) { g.sfx.coin(); g.float(512, 290, '+🩹', '#fff', 18); } }
    else if (it.k === 'med' && a.med < 4) { a.med++; it.gone = true; if (a.me) { g.sfx.coin(); g.float(512, 290, '+💊', '#fff', 18); } }
    else if (it.k === 'armor' && it.v > a.armor) { a.armor = it.v; it.gone = true; if (a.me) { g.sfx.power(); g.float(512, 290, `🦺 방탄조끼 Lv${it.v}`, '#fff', 18); } }
    else if (it.k === 'w') {
      const empty = a.w[0] ? (a.w[1] ? -1 : 1) : 0;
      let slot = -1;
      if (empty >= 0) slot = empty;
      else if (manual) slot = a.cur;
      else if (!a.me) { const lo = WPN[a.w[0].k].tier <= WPN[a.w[1].k].tier ? 0 : 1; if (WPN[it.v].tier > WPN[a.w[lo].k].tier) slot = lo; }
      if (slot < 0) continue;
      if (a.w[slot]) S.items.push({ k: 'w', v: a.w[slot].k, x: a.x + U.rand(-20, 20), y: a.y + U.rand(-20, 20) });
      a.w[slot] = { k: it.v, mag: Math.floor(WPN[it.v].mag * 0.5) };
      it.gone = true;
      if (a.me) { g.sfx.power(); g.float(512, 290, `${WPN[it.v].n} 획득`, WPN[it.v].c, 18); a.cur = slot; }
      if (manual) break;
    }
  }
  if (S.items.some((i) => i.gone)) S.items = S.items.filter((i) => !i.gone);
}
function damage(g, a, dmg, src, zone) {
  if (a.st !== 'ground') return;
  const red = zone ? 0 : [0, 0.25, 0.4, 0.55][a.armor];
  a.hp -= dmg * (1 - red); a.flash = 0.1; a.heal = zone ? a.heal : null;
  if (src) a.lastAtk = src;
  if (onScreen(a.x, a.y) && !zone) S.fx.push({ k: 'blood', x: a.x, y: a.y, t: 0.25 });
  if (a.me) { g.shake(zone ? 2 : 5, 0.15); g.sfx.hit(); }
  else if (src && src.me) { const [x, y] = scr(a.x, a.y); g.float(x, y - 30, Math.round(dmg * (1 - red)), '#fff', 16); g.sfx.tone(900, 0.03, 'square', 0.03); }
  if (a.hp <= 0) {
    a.st = 'dead'; a.hp = 0;
    const k = src && src.st !== 'dead' ? src : null;
    if (k) k.kills++;
    if (k && k.me) { S.kills++; g.add(0); g.sfx.explode(); note(`💀 ${a.name} 처치!`); }
    a.killer = k ? k.name : null;
    S.feed.unshift({ s: k ? `${k.name} 🔫 ${a.name}` : `☠️ ${a.name} (자기장)`, t: 6, me: (k && k.me) || a.me });
    if (S.feed.length > 6) S.feed.pop();
    if (onScreen(a.x, a.y)) { const [x, y] = scr(a.x, a.y); g.burst(x, y, ['#dc2626', '#7f1d1d', '#fbbf24'], 24, 200, 0.6, 4); }
    // 드롭
    a.w.forEach((w) => w && S.items.push({ k: 'w', v: w.k, x: a.x + U.rand(-25, 25), y: a.y + U.rand(-25, 25) }));
    for (const t in a.ammo) if (a.ammo[t] > 0) S.items.push({ k: 'a', v: t, n: a.ammo[t], x: a.x + U.rand(-25, 25), y: a.y + U.rand(-25, 25) });
    for (let i = 0; i < a.band; i++) S.items.push({ k: 'band', x: a.x + U.rand(-25, 25), y: a.y + U.rand(-25, 25) });
    for (let i = 0; i < a.med; i++) S.items.push({ k: 'med', x: a.x + U.rand(-25, 25), y: a.y + U.rand(-25, 25) });
    if (a.armor) S.items.push({ k: 'armor', v: a.armor, x: a.x, y: a.y });
  }
}
function lineClear(x1, y1, x2, y2) {
  for (const w of S.walls) if (segRect(x1, y1, x2, y2, w)) return false;
  for (const t of S.trees) if (t.rock && segCirc(x1, y1, x2, y2, t.x, t.y, t.r * 0.7)) return false;
  return true;
}
function segRect(x1, y1, x2, y2, r) {
  if (Math.max(x1, x2) < r.x || Math.min(x1, x2) > r.x + r.w || Math.max(y1, y2) < r.y || Math.min(y1, y2) > r.y + r.h) return false;
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return true;
}
function segCirc(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = U.clamp(((cx - x1) * dx + (cy - y1) * dy) / l2, 0, 1), px = x1 + dx * t - cx, py = y1 + dy * t - cy;
  return px * px + py * py < r * r;
}
function botAI(b, dt) {
  b.think -= dt; b.react = (b.react || 0) - dt;
  const Z = S.zone;
  if (b.think <= 0) {
    b.think = U.rand(0.2, 0.4);
    let best = null, bd = 480;
    for (const o of S.acts) {
      if (o === b || o.st !== 'ground') continue;
      const d = U.dist(o.x, o.y, b.x, b.y);
      if (d < bd && lineClear(b.x, b.y, o.x, o.y)) { bd = d; best = o; }
    }
    if (!best && b.lastAtk && b.lastAtk.st === 'ground' && U.dist(b.lastAtk.x, b.lastAtk.y, b.x, b.y) < 800) best = b.lastAtk;
    if (best && best !== b.foe) b.react = U.rand(0.5, 1.1) - b.skill * 0.3;
    b.foe = best;
    // 목표 아이템
    const hasGun = b.w[0] || b.w[1];
    let it = null, id = hasGun ? 350 : 900;
    for (const i of S.items) {
      const d = U.dist(i.x, i.y, b.x, b.y);
      if (d > id || U.dist(i.x, i.y, Z.nx, Z.ny) > Math.max(Z.r, Z.nr)) continue;
      const want = i.k === 'w' ? (!b.w[0] || !b.w[1] || WPN[i.v].tier > Math.min(WPN[b.w[0].k].tier, WPN[b.w[1].k].tier)) : i.k === 'a' ? (b.ammo[i.v] < 60) : i.k === 'armor' ? i.v > b.armor : i.k === 'band' ? b.band < 5 : b.med < 2;
      if (want) { id = d; it = i; }
    }
    b.goal = it;
    // 무기 선택: 탄약 있는 최고 무기
    let bi = -1, bt = -1;
    b.w.forEach((w, i) => { if (w && (w.mag > 0 || b.ammo[WPN[w.k].ammo] > 0) && WPN[w.k].tier > bt) { bt = WPN[w.k].tier; bi = i; } });
    if (bi >= 0 && bi !== b.cur && !b.foe) { b.cur = bi; b.reload = 0; }
    if (bi >= 0 && b.foe && (!b.w[b.cur] || (b.w[b.cur].mag <= 0 && b.ammo[WPN[b.w[b.cur].k].ammo] <= 0))) b.cur = bi;
    if (Math.random() < 0.1) b.strafe = U.choice([-1, 1]);
  }
  let mx = 0, my = 0;
  const f = b.foe && b.foe.st === 'ground' ? b.foe : null;
  const zd = U.dist(b.x, b.y, Z.x, Z.y), znd = U.dist(b.x, b.y, Z.nx, Z.ny);
  const outZone = zd > Z.r - 60 || (Z.st === 'wait' && Z.i >= 0 && znd > Z.nr - 40 && Z.t < 18);
  const w = b.w[b.cur], armed = w && (w.mag > 0 || b.ammo[WPN[w.k].ammo] > 0);
  if (!f && b.hp < 70 && !b.heal && (b.band || b.med) && !outZone) startHeal(null, b);
  if (!f && w && w.mag < WPN[w.k].mag * 0.5 && b.reload <= 0) startReload(null, b);
  b.trig = false;
  if (f) {
    const d = U.dist(f.x, f.y, b.x, b.y);
    const lead = w ? d / WPN[w.k].spd : 0;
    const ta = Math.atan2(f.y + f.iy * 200 * lead * b.skill - b.y, f.x + f.ix * 200 * lead * b.skill - b.x);
    let da = ta - b.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    b.a += da * Math.min(1, dt * (4 + b.skill * 6));
    const visible = lineClear(b.x, b.y, f.x, f.y);
    if (armed) {
      const keep = w.k === 'shotgun' ? 120 : w.k === 'sniper' ? 450 : w.k === 'smg' ? 200 : 300;
      if (visible && b.react <= 0 && Math.abs(da) < 0.25 && d < (WPN[w.k].spd * WPN[w.k].life + 40)) b.trig = true;
      const an = Math.atan2(f.y - b.y, f.x - b.x), rad = !visible ? 1 : d > keep + 50 ? 1 : d < keep - 50 ? -1 : 0;
      mx = Math.cos(an) * rad + Math.cos(an + Math.PI / 2) * (b.strafe || 1) * 0.8;
      my = Math.sin(an) * rad + Math.sin(an + Math.PI / 2) * (b.strafe || 1) * 0.8;
      if (b.hp < 30 && (b.band || b.med) && d > 250) { mx = -Math.cos(an); my = -Math.sin(an); }
    } else if (!b.goal || d < 90) {
      const an = Math.atan2(f.y - b.y, f.x - b.x);
      mx = Math.cos(an); my = Math.sin(an);
      if (d < 40) b.trig = true;
    }
  }
  if (!f || (!armed && b.goal)) {
    if (b.goal && !b.goal.gone) { const an = Math.atan2(b.goal.y - b.y, b.goal.x - b.x); mx = Math.cos(an); my = Math.sin(an); if (!f) b.a = an; }
    else if (outZone) { const tx = Z.st === 'wait' && Z.i >= 0 ? Z.nx : Z.x, ty = Z.st === 'wait' && Z.i >= 0 ? Z.ny : Z.y; const an = Math.atan2(ty - b.y, tx - b.x); mx = Math.cos(an); my = Math.sin(an); b.a = an; }
    else { if (!b.wander || Math.random() < dt * 0.3) b.wander = U.rand(0, Math.PI * 2); mx = Math.cos(b.wander) * 0.6; my = Math.sin(b.wander) * 0.6; }
  }
  if (outZone && f && zd > Z.r) { const an = Math.atan2(Z.y - b.y, Z.x - b.x); mx += Math.cos(an) * 1.5; my += Math.sin(an) * 1.5; }
  // 막힘 회피
  if (b.hitWall) b.stuck += dt; else b.stuck = Math.max(0, b.stuck - dt);
  if (b.stuck > 0.3) { b.dodge = 0.7; b.dodgeA = Math.atan2(my, mx) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2; b.stuck = 0; }
  if (b.dodge > 0) { b.dodge -= dt; mx = Math.cos(b.dodgeA); my = Math.sin(b.dodgeA); }
  const ml = Math.hypot(mx, my);
  b.ix = ml > 0.1 ? mx / ml : 0; b.iy = ml > 0.1 ? my / ml : 0;
}
function drawAct(g, c, a) {
  c.save(); c.translate(a.x, a.y); c.rotate(a.a);
  const w = a.w[a.cur];
  if (w) { const L = w.k === 'sniper' ? 40 : w.k === 'rifle' ? 34 : w.k === 'shotgun' ? 30 : w.k === 'smg' ? 26 : 22; g.rect(8, -3, L, 6, '#222'); if (a.muz > 0) { g.circle(8 + L + 4, 0, 6, '#fde047'); a.muz -= 0.016; } g.circle(12, 9, 5, '#f1c27d'); g.circle(16, -7, 5, '#f1c27d'); }
  else { const p = a.punch > 0 ? 10 : 0; a.punch = (a.punch || 0) - 0.016; g.circle(12 + p, 10, 6, '#f1c27d'); g.circle(12, -10, 6, '#f1c27d'); }
  c.restore();
  g.circle(a.x, a.y, 15, '#222');
  g.circle(a.x, a.y, 13, a.flash > 0 ? '#fff' : a.me ? '#facc15' : '#f1c27d');
  if (a.armor) g.ring(a.x, a.y, 13, ['', '#94a3b8', '#3b82f6', '#a855f7'][a.armor], 3);
  if (!a.me) { g.rect(a.x - 16, a.y - 28, 32, 4, '#450a0a'); g.rect(a.x - 16, a.y - 28, 32 * Math.max(0, a.hp) / 100, 4, '#ef4444'); g.text(a.name, a.x, a.y - 38, 11, '#fff'); }
  if (a.heal) g.text('+', a.x, a.y - 22, 18, '#4ade80');
}
