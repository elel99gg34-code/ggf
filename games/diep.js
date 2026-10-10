let S;
const DW = 3600;
const PI = Math.PI;
const BOTN = ['포탑왕', 'Tanky', '삼각김밥', '네모돌이', '스나이퍼K', '불도저', '오각형사냥꾼', 'xX_Pro_Xx', '동글이', '탄막장인', '드론마스터', '깡통', '철갑이', 'Boomer'];
const STATN = ['체력 재생', '최대 체력', '몸통 피해', '탄속', '관통력', '탄 피해', '재장전', '이동 속도'];
const STATC = ['#f0b27a', '#e05bd6', '#a77bff', '#5b8cff', '#ffd23f', '#ff6b6b', '#6bff8f', '#5bf0ff'];
// barrel: [angle, side, len, width, delay, dmgM, spdM, spread, kind]
const CLS = {
  basic: { n: '기본 탱크', rl: 1, fov: 1, b: [[0, 0, 1.9, 0.85, 0, 1, 1, 0.05]], next: ['twin', 'sniper', 'machine', 'flank'] },
  twin: { n: '트윈', rl: 1, fov: 1, b: [[0, -0.5, 1.9, 0.75, 0, 0.7, 1, 0.06], [0, 0.5, 1.9, 0.75, 0.5, 0.7, 1, 0.06]], next: ['triple', 'quad'] },
  sniper: { n: '스나이퍼', rl: 1.5, fov: 1.2, b: [[0, 0, 2.5, 0.8, 0, 1.6, 1.45, 0.01]], next: ['assassin', 'overseer'] },
  machine: { n: '머신건', rl: 0.5, fov: 1, b: [[0, 0, 1.8, 1.3, 0, 0.7, 1, 0.4, 'w']], next: ['destroyer', 'sprayer'] },
  flank: { n: '플랭크 가드', rl: 1, fov: 1, b: [[0, 0, 1.9, 0.85, 0, 1, 1, 0.05], [PI, 0, 1.5, 0.85, 0, 1, 1, 0.05]], next: ['triangle', 'twinflank'] },
  triple: { n: '트리플 샷', rl: 1, fov: 1, b: [[0, 0, 2, 0.8, 0, 0.75, 1, 0.05], [-0.65, 0, 1.75, 0.8, 0.5, 0.75, 1, 0.05], [0.65, 0, 1.75, 0.8, 0.5, 0.75, 1, 0.05]] },
  quad: { n: '쿼드 탱크', rl: 0.9, fov: 1, b: [[0, 0, 1.9, 0.8, 0, 0.85, 1, 0.05], [PI / 2, 0, 1.9, 0.8, 0.5, 0.85, 1, 0.05], [PI, 0, 1.9, 0.8, 0, 0.85, 1, 0.05], [-PI / 2, 0, 1.9, 0.8, 0.5, 0.85, 1, 0.05]] },
  assassin: { n: '어쌔신', rl: 1.9, fov: 1.4, b: [[0, 0, 2.9, 0.8, 0, 2.4, 1.75, 0.0]] },
  overseer: { n: '오버시어', rl: 1.4, fov: 1.15, drone: 8, b: [[PI / 2, 0, 1.35, 1.1, 0, 1.3, 0.75, 0, 'd'], [-PI / 2, 0, 1.35, 1.1, 0.5, 1.3, 0.75, 0, 'd']] },
  destroyer: { n: '디스트로이어', rl: 3.3, fov: 1, b: [[0, 0, 1.9, 1.45, 0, 3.6, 0.75, 0.04]], big: 1.7 },
  sprayer: { n: '스프레이어', rl: 0.32, fov: 1, b: [[0, 0, 2.2, 0.6, 0, 0.45, 1.2, 0.12], [0, 0, 1.75, 1.3, 0.5, 0.55, 1, 0.42, 'w']] },
  triangle: { n: '트라이앵글', rl: 0.9, fov: 1, spd: 1.12, b: [[0, 0, 1.9, 0.85, 0, 1, 1, 0.05], [PI * 0.8, 0, 1.6, 0.8, 0.5, 0.45, 1, 0.05], [-PI * 0.8, 0, 1.6, 0.8, 0.5, 0.45, 1, 0.05]] },
  twinflank: { n: '트윈 플랭크', rl: 1, fov: 1, b: [[0, -0.5, 1.9, 0.75, 0, 0.7, 1, 0.06], [0, 0.5, 1.9, 0.75, 0.5, 0.7, 1, 0.06], [PI, -0.5, 1.9, 0.75, 0, 0.7, 1, 0.06], [PI, 0.5, 1.9, 0.75, 0.5, 0.7, 1, 0.06]] },
};
const SHP = {
  sq: { n: 4, r: 15, hp: 10, xp: 10, bd: 16, c: '#ffe869', s: '#bfae4e' },
  tri: { n: 3, r: 17, hp: 30, xp: 25, bd: 24, c: '#fc7677', s: '#bd5859' },
  pen: { n: 5, r: 27, hp: 100, xp: 130, bd: 34, c: '#768dfc', s: '#5869bd' },
  alpha: { n: 5, r: 85, hp: 3000, xp: 3000, bd: 70, c: '#768dfc', s: '#5869bd' },
};
GAME({
  title: '탱크 io', w: 1024, h: 640, bg: '#b9b9b9', controls: 'dpad+ab', aLabel: '발사', bLabel: '자동',
  help: 'WASD/방향키 이동 · 마우스 조준 · 클릭/Space 발사\nE 또는 X = 자동 발사 토글\n도형(🟨🔺⬟)을 부숴 경험치 → 레벨업 포인트로 능력치 강화 (1~8 키 또는 + 클릭)\nLv15/30에 포탑 진화! (클래스 카드 클릭, 선택 대기 중엔 1~4 키)\n봇 탱크를 처치하면 큰 경험치 · 체력이 0이 되면 끝',
  init(g) {
    S = { tanks: [], bullets: [], shapes: [], t: 0, cam: { x: DW / 2, y: DW / 2, z: 1 }, auto: false, uiHold: false, kills: 0, msg: [], lb: [], nOff: U.randi(0, 13) };
    S.me = mkTank('나', DW / 2 + U.rand(-800, 800), DW / 2 + U.rand(-800, 800), true);
    S.me.prot = 4;
    S.tanks.push(S.me);
    for (let i = 0; i < 11; i++) S.tanks.push(mkBot(i));
    for (let i = 0; i < 230; i++) addShape();
  },
  update(g, dt) {
    S.t += dt;
    const P = S.me;
    // ---------- 입력 ----------
    const mz = S.cam.z;
    const mwx = S.cam.x + (g.mouse.x - g.W / 2) / mz, mwy = S.cam.y + (g.mouse.y - g.H / 2) / mz;
    if (g.mouse.clicked) S.uiHold = uiClick(g);
    if (!g.mouse.down) S.uiHold = false;
    if (g.keyp('KeyE') || g.pressed('b')) { S.auto = !S.auto; g.sfx.click(); note(S.auto ? '자동 발사 ON' : '자동 발사 OFF'); }
    for (let i = 0; i < 8; i++) if (g.keyp('Digit' + (i + 1))) {
      if (P.choice) { if (i < P.choice.length) evolve(g, P, P.choice[i]); }
      else upStat(g, P, i);
    }
    let mx = g.right - g.left, my = g.down - g.up;
    const ml = Math.hypot(mx, my) || 1;
    P.ix = mx / ml; P.iy = my / ml;
    P.a = Math.atan2(mwy - P.y, mwx - P.x);
    P.aimX = mwx; P.aimY = mwy;
    P.firing = S.auto || (g.mouse.down && !S.uiHold) || g.held('a');
    // ---------- 봇 ----------
    for (const t of S.tanks) if (!t.me && !t.dead) botAI(t, dt);
    // ---------- 탱크 ----------
    for (const t of S.tanks) {
      if (t.dead) continue;
      const st = stats(t), sp = st.spd;
      t.vx += (t.ix * sp - t.vx) * Math.min(1, dt * 5);
      t.vy += (t.iy * sp - t.vy) * Math.min(1, dt * 5);
      t.x = U.clamp(t.x + t.vx * dt, 20, DW - 20); t.y = U.clamp(t.y + t.vy * dt, 20, DW - 20);
      t.dmgT += dt; t.prot = Math.max(0, (t.prot || 0) - dt); t.flash -= dt;
      t.hp = Math.min(st.maxHp, t.hp + st.maxHp * (st.regen + (t.dmgT > 6 ? 0.08 : 0)) * dt);
      t.r = 20 * (1 + t.lvl * 0.012);
      fire(g, t, st, dt);
    }
    // ---------- 탄 ----------
    for (const b of S.bullets) {
      const o = b.own;
      if (b.drone) {
        if (o.dead) { b.hp = 0; continue; }
        let tx = o.x + Math.cos(S.t * 2 + b.k) * 70, ty = o.y + Math.sin(S.t * 2 + b.k) * 70;
        if (o.firing) { tx = o.aimX; ty = o.aimY; }
        const a = Math.atan2(ty - b.y, tx - b.x), ds = b.spd;
        b.vx += (Math.cos(a) * ds - b.vx) * Math.min(1, dt * 3); b.vy += (Math.sin(a) * ds - b.vy) * Math.min(1, dt * 3);
        b.ang = Math.atan2(b.vy, b.vx);
      } else b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -50 || b.y < -50 || b.x > DW + 50 || b.y > DW + 50) { b.hp = 0; continue; }
      for (const s of S.shapes) {
        if (s.hp <= 0) continue;
        const dx = s.x - b.x, dy = s.y - b.y, rr = s.r + b.r;
        if (dx * dx + dy * dy < rr * rr && b.last !== s) {
          b.last = s; s.hp -= b.dmg; s.hitT = 0.1; b.hp -= s.t === 'alpha' ? 3 : 1;
          s.vx += b.vx * 0.04; s.vy += b.vy * 0.04;
          if (s.hp <= 0) killShape(g, s, o);
          if (b.hp <= 0) break;
        }
      }
      if (b.hp <= 0) continue;
      for (const t of S.tanks) {
        if (t.dead || t === o || t.prot > 0) continue;
        const dx = t.x - b.x, dy = t.y - b.y, rr = t.r + b.r;
        if (dx * dx + dy * dy < rr * rr && b.last !== t) {
          b.last = t; hurt(g, t, b.dmg, o); b.hp -= 2;
          t.vx += b.vx * 0.06; t.vy += b.vy * 0.06;
          if (b.hp <= 0) break;
        }
      }
    }
    // 탄 vs 탄
    const BL = S.bullets;
    for (let i = 0; i < BL.length; i++) {
      const a = BL[i]; if (a.hp <= 0) continue;
      for (let j = i + 1; j < BL.length; j++) {
        const b = BL[j]; if (b.hp <= 0 || b.own === a.own) continue;
        const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r;
        if (dx * dx + dy * dy < rr * rr) { const ah = a.hp * a.dmg, bh = b.hp * b.dmg; if (ah >= bh) { a.hp -= bh / a.dmg; b.hp = 0; } else { b.hp -= ah / b.dmg; a.hp = 0; } if (a.hp <= 0) break; }
      }
    }
    S.bullets = BL.filter((b) => b.hp > 0);
    // ---------- 도형 ----------
    for (const s of S.shapes) {
      if (s.hp <= 0) continue;
      s.rot += s.rs * dt; s.hitT -= dt;
      s.x += s.vx * dt + Math.cos(s.rot * 0.3) * 4 * dt; s.y += s.vy * dt + Math.sin(s.rot * 0.3) * 4 * dt;
      s.vx *= 1 - dt * 2; s.vy *= 1 - dt * 2;
      s.x = U.clamp(s.x, 20, DW - 20); s.y = U.clamp(s.y, 20, DW - 20);
      for (const t of S.tanks) {
        if (t.dead) continue;
        const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy) || 1, rr = t.r + s.r;
        if (d < rr) {
          const nx = dx / d, ny = dy / d, push = (rr - d);
          t.x += nx * push * 0.6; t.y += ny * push * 0.6; s.x -= nx * push * 0.4; s.y -= ny * push * 0.4;
          t.vx += nx * 60; t.vy += ny * 60;
          if (t.prot <= 0) hurt(g, t, SHP[s.t].bd * dt * 2.2, null);
          s.hp -= stats(t).body * dt; s.hitT = 0.1;
          if (s.hp <= 0) killShape(g, s, t);
        }
      }
    }
    S.shapes = S.shapes.filter((s) => s.hp > 0);
    while (S.shapes.length < 230) addShape();
    // ---------- 탱크 vs 탱크 ----------
    for (let i = 0; i < S.tanks.length; i++) for (let j = i + 1; j < S.tanks.length; j++) {
      const a = S.tanks[i], b = S.tanks[j];
      if (a.dead || b.dead) continue;
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1, rr = a.r + b.r;
      if (d < rr) {
        const nx = dx / d, ny = dy / d;
        a.vx += nx * 140; a.vy += ny * 140; b.vx -= nx * 140; b.vy -= ny * 140;
        if (a.prot <= 0) hurt(g, a, stats(b).body * dt * 1.5, b);
        if (b.prot <= 0) hurt(g, b, stats(a).body * dt * 1.5, a);
      }
    }
    // ---------- 봇 리스폰 ----------
    for (let i = 0; i < S.tanks.length; i++) {
      const t = S.tanks[i];
      if (t.dead && !t.me) { t.resp -= dt; if (t.resp <= 0) S.tanks[i] = mkBot(i); }
    }
    S.msg = S.msg.filter((m) => (m.t -= dt) > 0);
    if (P.dead) return;
    if (P.hp <= 0) return;
    // ---------- 카메라 ----------
    const fov = CLS[P.cls].fov * (1 + P.lvl * 0.004);
    S.cam.z += (1 / fov - S.cam.z) * Math.min(1, dt * 2);
    S.cam.x += (P.x - S.cam.x) * Math.min(1, dt * 8); S.cam.y += (P.y - S.cam.y) * Math.min(1, dt * 8);
    S.lb = S.tanks.filter((t) => !t.dead).sort((a, b) => b.xp - a.xp).slice(0, 8);
    g.score = Math.floor(P.xp);
    const rank = S.tanks.filter((t) => !t.dead && t.xp > P.xp).length + 1;
    g.info = `Lv ${P.lvl} · ${CLS[P.cls].n} · 순위 ${rank} · 처치 ${S.kills}`;
  },
  draw(g, c) {
    const z = S.cam.z, P = S.me;
    c.save(); c.translate(g.W / 2, g.H / 2); c.scale(z, z); c.translate(-S.cam.x, -S.cam.y);
    const x0 = S.cam.x - g.W / 2 / z, x1 = S.cam.x + g.W / 2 / z, y0 = S.cam.y - g.H / 2 / z, y1 = S.cam.y + g.H / 2 / z;
    g.rect(0, 0, DW, DW, '#cdcdcd');
    g.rect(DW / 2 - 450, DW / 2 - 450, 900, 900, '#c3c3c3');
    c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 1;
    c.beginPath();
    for (let x = Math.floor(Math.max(0, x0) / 24) * 24; x <= Math.min(DW, x1); x += 24) { c.moveTo(x, Math.max(0, y0)); c.lineTo(x, Math.min(DW, y1)); }
    for (let y = Math.floor(Math.max(0, y0) / 24) * 24; y <= Math.min(DW, y1); y += 24) { c.moveTo(Math.max(0, x0), y); c.lineTo(Math.min(DW, x1), y); }
    c.stroke();
    for (const s of S.shapes) {
      if (s.x + s.r < x0 || s.x - s.r > x1 || s.y + s.r < y0 || s.y - s.r > y1) continue;
      const d = SHP[s.t];
      polyPath(c, s.x, s.y, s.r, d.n, s.rot);
      c.fillStyle = s.hitT > 0 ? '#fff' : d.c; c.fill(); c.strokeStyle = d.s; c.lineWidth = 3.5; c.lineJoin = 'round'; c.stroke();
      if (s.hp < s.max) hpBar(g, s.x, s.y + s.r + 8, s.r * 1.6, s.hp / s.max);
    }
    for (const b of S.bullets) {
      if (b.x < x0 - 30 || b.x > x1 + 30 || b.y < y0 - 30 || b.y > y1 + 30) continue;
      const col = b.own.me ? '#00b2e1' : '#f14e54', sc = b.own.me ? '#0085a8' : '#b43a3f';
      if (b.drone) { polyPath(c, b.x, b.y, b.r * 1.3, 3, b.ang); c.fillStyle = col; c.fill(); c.strokeStyle = sc; c.lineWidth = 3; c.stroke(); }
      else { c.globalAlpha = Math.min(1, b.life * 3); g.circle(b.x, b.y, b.r, sc); g.circle(b.x, b.y, b.r - 2.5, col); c.globalAlpha = 1; }
    }
    for (const t of S.tanks) if (!t.dead && t.x > x0 - 100 && t.x < x1 + 100 && t.y > y0 - 100 && t.y < y1 + 100) drawTank(g, c, t);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 8; c.strokeRect(0, 0, DW, DW);
    c.restore();
    // 미니맵
    const MM = 130, mx0 = g.W - MM - 12, my0 = g.H - MM - 12;
    g.rrect(mx0, my0, MM, MM, 6, 'rgba(205,205,205,.85)', '#555', 3);
    g.rect(mx0 + MM / 2 - (450 / DW) * MM, my0 + MM / 2 - (450 / DW) * MM, (900 / DW) * MM, (900 / DW) * MM, 'rgba(0,0,0,.08)');
    for (const t of S.tanks) if (!t.dead && (t.me || t.lvl >= 30)) g.circle(mx0 + (t.x / DW) * MM, my0 + (t.y / DW) * MM, t.me ? 4 : 2.5, t.me ? '#00b2e1' : '#f14e54');
    // 리더보드
    ot(g, '리더보드', g.W - 100, 18, 17, '#fff');
    S.lb.forEach((t, i) => {
      const y = 38 + i * 21, top = S.lb[0].xp || 1;
      g.rrect(g.W - 190, y - 8, 180, 16, 8, 'rgba(0,0,0,.35)');
      g.rrect(g.W - 190, y - 8, Math.max(16, 180 * t.xp / top), 16, 8, t.me ? '#00b2e1' : '#f14e54');
      ot(g, `${t.name} - ${fmt(t.xp)}`, g.W - 100, y, 12, '#fff');
    });
    // 점수/레벨 바
    if (!P.dead) {
      const need = needXp(P.lvl), prev = P.lvl > 1 ? totXp(P.lvl) : 0;
      ot(g, P.name, g.W / 2, g.H - 72, 22, '#fff');
      g.rrect(g.W / 2 - 130, g.H - 54, 260, 16, 8, 'rgba(0,0,0,.5)');
      g.rrect(g.W / 2 - 130, g.H - 54, 260 * U.clamp((P.xp - prev) / need, 0, 1), 16, 8, '#ffde43');
      ot(g, `Lv ${P.lvl} ${CLS[P.cls].n}`, g.W / 2, g.H - 46, 12, '#fff');
      g.rrect(g.W / 2 - 100, g.H - 32, 200, 14, 7, 'rgba(0,0,0,.5)');
      g.rrect(g.W / 2 - 100, g.H - 32, 200 * Math.min(1, P.xp / Math.max(1, S.lb[0] ? S.lb[0].xp : 1)), 14, 7, '#6bff8f');
      ot(g, `점수 ${fmt(P.xp)}`, g.W / 2, g.H - 25, 11, '#fff');
    }
    // 능력치 패널
    const sx = 10, sy = g.H - 8 * 20 - 16;
    if (P.pts > 0 || g.inRect(0, sy - 30, 230, 200)) {
      if (P.pts > 0) ot(g, `x${P.pts} 포인트`, sx + 100, sy - 14, 16, '#fff');
      for (let i = 0; i < 8; i++) {
        const y = sy + i * 20;
        g.rrect(sx, y, 200, 16, 8, 'rgba(0,0,0,.45)');
        for (let k = 0; k < P.st[i]; k++) g.rect(sx + 4 + k * 23, y + 3, 21, 10, STATC[i]);
        ot(g, `${STATN[i]} [${i + 1}]`, sx + 92, y + 8, 11, '#fff');
        if (P.pts > 0 && P.st[i] < 7) { g.circle(sx + 212, y + 8, 8, STATC[i]); ot(g, '+', sx + 212, y + 8, 14, '#222'); }
      }
    }
    // 진화 카드
    if (P.choice) {
      ot(g, '진화 선택!', 90, 18, 18, '#fff');
      P.choice.forEach((k, i) => {
        const x = 10 + (i % 2) * 90, y = 32 + Math.floor(i / 2) * 90;
        g.rrect(x, y, 84, 84, 8, ['#8ef', '#fe8', '#f88', '#a8f'][i], 'rgba(0,0,0,.4)', 3);
        c.save(); c.translate(x + 42, y + 36); c.scale(0.7, 0.7);
        drawTank(g, c, { x: 0, y: 0, a: -PI / 4 + S.t * 0.6, r: 20, cls: k, me: true, hp: 1, max: 1, preview: true });
        c.restore();
        ot(g, `${i + 1}. ${CLS[k].n}`, x + 42, y + 74, 11, '#111');
      });
    }
    if (S.auto) ot(g, '🔁 자동 발사', g.W / 2, 20, 14, '#fff');
    if (P.prot > 0) ot(g, '무적 ' + P.prot.toFixed(1), g.W / 2, 40, 14, '#fff');
    S.msg.forEach((m, i) => { c.globalAlpha = Math.min(1, m.t); ot(g, m.s, g.W / 2, 70 + i * 22, 17, '#fff'); c.globalAlpha = 1; });
  },
});
function fmt(n) { n = Math.floor(n); return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n; }
function needXp(l) { return Math.floor(8 + Math.pow(l, 2.15) * 0.9); }
function totXp(l) { let s = 0; for (let i = 1; i < l; i++) s += needXp(i); return s; }
function note(s) { S.msg.push({ s, t: 2.5 }); if (S.msg.length > 4) S.msg.shift(); }
function mkTank(name, x, y, me) {
  return { name, x, y, vx: 0, vy: 0, ix: 0, iy: 0, a: 0, r: 20, hp: 50, lvl: 1, xp: 0, pts: 0, st: [0, 0, 0, 0, 0, 0, 0, 0], cls: 'basic', tier: 1, cd: [], me: !!me, dmgT: 9, flash: 0, choice: null, prot: 0, aimX: x, aimY: y, firing: false, drones: 0 };
}
function mkBot(i) {
  let x, y, tries = 0;
  do { x = U.rand(150, DW - 150); y = U.rand(150, DW - 150); tries++; } while (S.me && !S.me.dead && U.dist(x, y, S.me.x, S.me.y) < 900 && tries < 30);
  const t = mkTank(BOTN[(i + (S.nOff || 0)) % BOTN.length], x, y, false);
  t.prot = 2;
  t.style = U.choice(['farm', 'farm', 'hunt', 'snipe']);
  t.think = 0; t.strafe = U.choice([-1, 1]);
  const startXp = Math.random() < 0.55 ? U.rand(0, 600) : U.rand(600, 9000);
  gainXp(null, t, startXp);
  t.hp = stats(t).maxHp;
  return t;
}
function stats(t) {
  const s = t.st, cl = CLS[t.cls];
  const maxHp = 50 + 2 * (t.lvl - 1) + 22 * s[1];
  return {
    regen: 0.004 + 0.007 * s[0], maxHp, body: 30 + 18 * s[2], bspd: 360 * (1 + 0.1 * s[3]), pen: 1 + 0.75 * s[4],
    dmg: 7 * (1 + 0.28 * s[5]), reload: 0.6 * Math.pow(0.87, s[6]) * cl.rl, spd: 175 * (1 + 0.07 * s[7]) * (1 - t.lvl * 0.004) * (cl.spd || 1),
  };
}
function addShape(t) {
  if (!t) { const r = Math.random(); t = r < 0.62 ? 'sq' : r < 0.86 ? 'tri' : 'pen'; }
  let x = U.rand(40, DW - 40), y = U.rand(40, DW - 40);
  if (t === 'pen' && Math.random() < 0.6) { x = DW / 2 + U.rand(-420, 420); y = DW / 2 + U.rand(-420, 420); }
  if (Math.random() < 0.004 && !S.shapes.some((s) => s.t === 'alpha')) { t = 'alpha'; x = DW / 2 + U.rand(-200, 200); y = DW / 2 + U.rand(-200, 200); }
  const d = SHP[t];
  S.shapes.push({ t, x, y, r: d.r, hp: d.hp, max: d.hp, rot: U.rand(0, 6.28), rs: U.rand(-0.6, 0.6), vx: 0, vy: 0, hitT: 0 });
}
function polyPath(c, x, y, r, n, rot) {
  c.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * PI * 2; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
function hpBar(g, x, y, w, f) { g.rrect(x - w / 2, y - 3, w, 6, 3, '#555'); g.rrect(x - w / 2 + 1, y - 2, Math.max(0, (w - 2) * f), 4, 2, '#85e37d'); }
function scr(x, y) { return [(x - S.cam.x) * S.cam.z + 512, (y - S.cam.y) * S.cam.z + 320]; }
function gainXp(g, t, n) {
  t.xp += n;
  while (t.lvl < 45 && t.xp >= totXp(t.lvl + 1)) {
    t.lvl++;
    if (t.lvl <= 28 || t.lvl % 3 === 0) t.pts++;
    if ((t.lvl >= 15 && t.tier === 1) || (t.lvl >= 30 && t.tier === 2)) { if (!t.choice) t.choice = CLS[t.cls].next.slice(); }
    if (t.me && g) { g.sfx.power(); note(`레벨 ${t.lvl}!`); if (t.choice) note('🔼 탱크 진화 가능!'); }
  }
  if (!t.me) {
    while (t.pts > 0) { const pri = t.style === 'snipe' ? [5, 3, 6, 4, 1, 7, 0] : t.style === 'hunt' ? [1, 5, 6, 7, 3, 0, 4, 2] : [6, 5, 3, 4, 1, 0, 7]; const i = Math.random() < 0.75 ? pri.find((k) => t.st[k] < 7) : U.randi(0, 7); if (i === undefined || t.st[i] >= 7) { if (t.st.every((v) => v >= 7)) break; continue; } t.st[i]++; t.pts--; }
    while (t.choice) { const pick = t.style === 'snipe' && t.choice.includes('sniper') ? 'sniper' : U.choice(t.choice); evolve(null, t, pick); }
  }
}
function evolve(g, t, k) {
  t.cls = k; t.tier++; t.choice = null; t.cd = []; t.drones = 0;
  if (t.lvl >= 30 && t.tier === 2 && CLS[k].next) t.choice = CLS[k].next.slice();
  if (g) { g.sfx.win(); note(`${CLS[k].n}(으)로 진화!`); const [x, y] = scr(t.x, t.y); g.burst(x, y, ['#00b2e1', '#fff', '#ffde43'], 30, 260, 0.7, 5); }
}
function upStat(g, t, i) {
  if (t.pts <= 0 || t.st[i] >= 7) return;
  t.st[i]++; t.pts--;
  if (i === 1) t.hp += 22;
  g.sfx.tone(500 + i * 80, 0.08, 'triangle', 0.05);
}
function uiClick(g) {
  const P = S.me, m = g.mouse;
  if (P.choice) for (let i = 0; i < P.choice.length; i++) {
    const x = 10 + (i % 2) * 90, y = 32 + Math.floor(i / 2) * 90;
    if (g.inRect(x, y, 84, 84)) { evolve(g, P, P.choice[i]); return true; }
  }
  const sx = 10, sy = g.H - 8 * 20 - 16;
  if (P.pts > 0 && m.x < 230 && m.y > sy - 4) {
    for (let i = 0; i < 8; i++) if (g.inRect(sx, sy + i * 20 - 2, 222, 20)) { upStat(g, P, i); return true; }
  }
  return false;
}
function fire(g, t, st, dt) {
  const cl = CLS[t.cls];
  for (let i = 0; i < cl.b.length; i++) {
    const B = cl.b[i];
    if (t.cd[i] === undefined) t.cd[i] = st.reload * B[4];
    t.cd[i] -= dt;
    if (!t.firing && !(B[8] === 'd')) { t.cd[i] = Math.max(t.cd[i], st.reload * B[4] * 0.5); continue; }
    if (t.cd[i] > 0) continue;
    if (B[8] === 'd') {
      if (t.drones >= cl.drone) { t.cd[i] = 0.2; continue; }
      t.cd[i] = st.reload * 2;
      t.drones++;
    } else t.cd[i] = st.reload;
    const a = t.a + B[0] + U.rand(-B[7], B[7]);
    const side = B[1] * t.r, len = B[2] * t.r;
    const bx = t.x + Math.cos(t.a + B[0]) * len - Math.sin(t.a + B[0]) * side, by = t.y + Math.sin(t.a + B[0]) * len + Math.cos(t.a + B[0]) * side;
    const spd = st.bspd * B[6] * (B[8] === 'd' ? 0.7 : 1);
    const r = t.r * B[3] * 0.48 * (cl.big || 1) * (B[8] === 'w' ? 0.6 : 1);
    const b = { x: bx, y: by, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r, dmg: st.dmg * B[5], hp: st.pen * (B[8] === 'd' ? 3 : 1) * (cl.big ? 2 : 1), life: 2.2 * (B[6] > 1.3 ? 1.2 : 1), own: t, spd, last: null };
    if (B[8] === 'd') { b.drone = true; b.k = Math.random() * 6; b.life = 1e9; b.ang = a; b.onDie = t; }
    S.bullets.push(b);
    const rec = (cl.big ? 140 : 18) * B[3];
    t.vx -= Math.cos(a) * rec; t.vy -= Math.sin(a) * rec;
    t.kick = t.kick || []; t.kick[i] = 1;
    if (t.me) g.sfx.tone(cl.big ? 120 : 260 + Math.random() * 40, cl.big ? 0.15 : 0.04, cl.big ? 'sawtooth' : 'square', cl.big ? 0.06 : 0.018, cl.big ? 60 : 120);
  }
  if (t.kick) for (let i = 0; i < t.kick.length; i++) if (t.kick[i]) t.kick[i] = Math.max(0, t.kick[i] - dt * 8);
  if (cl.drone) t.drones = S.bullets.reduce((n, b) => n + (b.drone && b.own === t && b.hp > 0 ? 1 : 0), 0);
}
function hurt(g, t, dmg, src) {
  if (t.dead || t.prot > 0) return;
  t.hp -= dmg; t.dmgT = 0; t.flash = 0.08; t.lastHit = src;
  if (t.me && dmg > 3) { g.shake(3, 0.1); g.sfx.hit(); }
  if (t.hp <= 0) killTank(g, t, src);
}
function killTank(g, t, src) {
  t.dead = true; t.resp = U.rand(3, 7);
  const [x, y] = scr(t.x, t.y);
  g.burst(x, y, t.me ? '#00b2e1' : '#f14e54', 34, 300, 0.8, 6);
  for (const b of S.bullets) if (b.own === t && b.drone) b.hp = 0;
  const killer = src && !src.dead ? src : null;
  if (killer) {
    const gain = Math.min(23536, t.xp * 0.5 + 50);
    gainXp(g, killer, gain);
    if (killer.me) { S.kills++; g.sfx.explode(); g.shake(8, 0.3); note(`💥 ${t.name} 처치! +${fmt(gain)}`); g.float(x, y - 20, '+' + fmt(gain), '#ffde43', 26); }
    else if (t.me) note(`${killer.name}에게 당했다`);
  }
  if (t.me) {
    g.sfx.explode(); g.shake(14, 0.5);
    g.score = Math.floor(t.xp);
    g.later(() => g.over(`Lv ${t.lvl} ${CLS[t.cls].n} · 처치 ${S.kills} · ${killer ? killer.name + '에게 격파됨' : '격파됨'}`), 0.6);
  }
}
function killShape(g, s, by) {
  s.hp = 0;
  const d = SHP[s.t];
  if (by && !by.dead) gainXp(g, by, d.xp);
  if (by && by.me) {
    const [x, y] = scr(s.x, s.y);
    g.burst(x, y, d.c, s.t === 'alpha' ? 60 : 10, s.t === 'alpha' ? 400 : 160, 0.5, 5);
    g.sfx.tone(s.t === 'pen' ? 300 : 600, 0.06, 'triangle', 0.04, 200);
    if (s.t === 'alpha') { g.shake(10, 0.4); note('🌟 알파 펜타곤 파괴! +3000'); }
  }
}
function botAI(t, dt) {
  t.think -= dt;
  const st = stats(t), hpF = t.hp / st.maxHp;
  if (t.think <= 0) {
    t.think = U.rand(0.25, 0.45);
    if (Math.random() < 0.08) t.strafe *= -1;
    let best = null, bd = 1e9;
    const range = t.style === 'snipe' ? 820 : 640;
    for (const o of S.tanks) {
      if (o === t || o.dead || o.prot > 0) continue;
      const d = U.dist(o.x, o.y, t.x, t.y);
      let w = d - (o.me ? 60 : 0) - (o === t.lastHit ? 250 : 0);
      if (o.me && S.t < 25) w += 300; // 초반엔 덜 공격적
      if (d < range && w < bd) { bd = w; best = o; }
    }
    t.foe = best;
    if (!best || hpF < 0.35) {
      let bs = null, bw = -1;
      for (const s of S.shapes) {
        const d = U.dist(s.x, s.y, t.x, t.y);
        if (d > 700) continue;
        const w = (SHP[s.t].xp + 8) / (d + 120) * (s.t === 'alpha' && t.lvl < 25 ? 0.05 : 1);
        if (w > bw) { bw = w; bs = s; }
      }
      t.prey = bs;
    }
  }
  const f = t.foe && !t.foe.dead ? t.foe : null;
  let mx = 0, my = 0;
  if (f && hpF >= 0.35) {
    const d = U.dist(f.x, f.y, t.x, t.y), bs = st.bspd, tt = d / bs;
    const ax = f.x + f.vx * tt * 0.8, ay = f.y + f.vy * tt * 0.8;
    t.a += angDiff(t.a, Math.atan2(ay - t.y, ax - t.x) + U.rand(-0.05, 0.05)) * Math.min(1, dt * 9);
    t.aimX = f.x; t.aimY = f.y;
    t.firing = true;
    const keep = t.style === 'snipe' ? 520 : t.style === 'hunt' ? 220 : 340;
    const ang = Math.atan2(f.y - t.y, f.x - t.x);
    const radial = d > keep + 40 ? 1 : d < keep - 40 ? -1 : 0;
    mx = Math.cos(ang) * radial + Math.cos(ang + PI / 2) * t.strafe * 0.8;
    my = Math.sin(ang) * radial + Math.sin(ang + PI / 2) * t.strafe * 0.8;
  } else {
    if (f && hpF < 0.35) { const ang = Math.atan2(t.y - f.y, t.x - f.x); mx = Math.cos(ang); my = Math.sin(ang); t.a += angDiff(t.a, ang + PI) * Math.min(1, dt * 6); t.firing = true; }
    const p = t.prey && t.prey.hp > 0 ? t.prey : null;
    if (p) {
      const d = U.dist(p.x, p.y, t.x, t.y);
      if (!f) { t.a += angDiff(t.a, Math.atan2(p.y - t.y, p.x - t.x)) * Math.min(1, dt * 7); t.firing = d < 520; t.aimX = p.x; t.aimY = p.y; }
      if (!(f && hpF < 0.35)) { const ang = Math.atan2(p.y - t.y, p.x - t.x), want = d > 230 ? 1 : d < 150 ? -0.6 : 0; mx = Math.cos(ang) * want; my = Math.sin(ang) * want; }
    } else if (!f) {
      t.firing = false;
      const ang = Math.atan2(DW / 2 - t.y, DW / 2 - t.x) + Math.sin(S.t * 0.3 + t.x) * 1.2;
      mx = Math.cos(ang); my = Math.sin(ang);
    }
  }
  if (t.x < 200) mx += 1; if (t.x > DW - 200) mx -= 1; if (t.y < 200) my += 1; if (t.y > DW - 200) my -= 1;
  const ml = Math.hypot(mx, my);
  t.ix = ml > 0.1 ? mx / ml : 0; t.iy = ml > 0.1 ? my / ml : 0;
}
function angDiff(a, b) { let d = b - a; while (d > PI) d -= PI * 2; while (d < -PI) d += PI * 2; return d; }
function drawTank(g, c, t) {
  const cl = CLS[t.cls], r = t.r;
  c.save(); c.translate(t.x, t.y);
  if (t.prot > 0 && !t.preview) c.globalAlpha = 0.5 + 0.3 * Math.sin(S.t * 20);
  c.save(); c.rotate(t.a);
  c.fillStyle = '#999'; c.strokeStyle = '#727272'; c.lineWidth = 3; c.lineJoin = 'round';
  cl.b.forEach((B, i) => {
    c.save(); c.rotate(B[0]);
    const k = t.kick && t.kick[i] ? t.kick[i] * r * 0.2 : 0;
    const L = B[2] * r - k, W = B[3] * r, sd = B[1] * r;
    c.beginPath();
    if (B[8] === 'w') { c.moveTo(0, sd - W * 0.35); c.lineTo(L, sd - W * 0.6); c.lineTo(L, sd + W * 0.6); c.lineTo(0, sd + W * 0.35); }
    else if (B[8] === 'd') { c.moveTo(0, sd - W * 0.3); c.lineTo(L, sd - W * 0.55); c.lineTo(L, sd + W * 0.55); c.lineTo(0, sd + W * 0.3); }
    else c.rect(0, sd - W / 2, L, W);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  });
  c.restore();
  const body = t.flash > 0 ? '#fff' : t.me ? '#00b2e1' : '#f14e54', edge = t.me ? '#0085a8' : '#b43a3f';
  g.circle(0, 0, r, edge); g.circle(0, 0, r - 3, body);
  c.globalAlpha = 1;
  c.restore();
  if (t.preview) return;
  const mh = stats(t).maxHp;
  if (t.hp < mh - 0.5) hpBar(g, t.x, t.y + r + 12, r * 2.2, Math.max(0, t.hp / mh));
  if (!t.me) { ot(g, t.name, t.x, t.y - r - 22, 14, '#fff'); ot(g, 'Lv ' + t.lvl, t.x, t.y - r - 8, 10, '#eee'); }
}
function ot(g, s, x, y, size, col = '#fff', al = 'center') {
  const c = g.ctx;
  c.font = `bold ${size}px system-ui, sans-serif`; c.textAlign = al; c.textBaseline = 'middle';
  if (col !== '#111' && col !== '#222') { c.lineWidth = Math.max(2, size / 5); c.strokeStyle = '#333'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}
