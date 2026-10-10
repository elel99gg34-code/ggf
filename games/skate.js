'use strict';
let S;
const SK = { GY: 455, G: 1450, PX: 280, LETTERS: ['S', 'K', 'A', 'T', 'E'] };
const SK_TRICKS = {
  left: { n: '킥플립', p: 250, t: 0.42, k: 'flip' },
  right: { n: '힐플립', p: 250, t: 0.42, k: 'heel' },
  up: { n: '360 셔빗', p: 350, t: 0.5, k: 'shove' },
  b: { n: '트레플립', p: 600, t: 0.62, k: 'tre' },
};

GAME({
  title: '스케이트보드', w: 960, h: 540, bg: '#7ec8e3', controls: 'dpad+ab', aLabel: '알리', bLabel: '트레',
  help: '→ 푸시(가속) · ← 브레이크 · Space 알리(점프)\n공중: ← 킥플립 · → 힐플립 · ↑ 360셔빗 · Shift/X 트레플립\n레일/박스 위로 떨어질 때 ↓ = 그라인드 (←→로 균형)\n착지 후 0.6초 안에 다시 알리하면 콤보 유지! 트릭 도중 착지 = 넘어짐\n제한시간 안에 목표 점수 달성 → 다음 파크 · S-K-A-T-E 글자 모으면 보너스',
  init(g) {
    S = { lvl: 0, x: 0, y: SK.GY, vx: 220, vy: 0, air: false, grind: null, bal: 0, balV: 0, trick: null, trickT: 0, spinA: 0, combo: null, landT: 0,
      bail: 0, obs: [], items: [], genX: 400, time: 60, lvlStart: 0, target: 0, letters: [], grindKey: 0, msg: '', msgT: 0, best: 0, dust: [], lastKick: null, rot: 0 };
    newLevel(g, true);
  },
  update(g, dt) {
    S.msgT -= dt;
    S.time -= dt;
    if (S.time <= 0) {
      bank(g);
      if (g.score - S.lvlStart >= S.target) nextLevel(g);
      else return g.over(`파크 ${S.lvl} · 목표 ${S.target} 중 ${g.score - S.lvlStart}점`);
    }
    if (g.score - S.lvlStart >= S.target && !S.cleared) { S.cleared = true; flash(g, '목표 달성! 남은 시간 동안 보너스 →', '#ffeb3b'); g.sfx.power(); }
    while (S.genX < S.x + 1400) genChunk();
    S.obs = S.obs.filter((o) => o.x + o.w > S.x - 600);
    S.items = S.items.filter((i) => !i.got && i.x > S.x - 600);
    if (S.bail > 0) {
      S.bail -= dt; S.vx = Math.max(0, S.vx - 400 * dt); S.x += S.vx * dt; S.y = Math.min(S.y + 300 * dt, surf(S.x, S.y) < 1e8 ? surf(S.x, S.y) : SK.GY);
      if (S.bail <= 0) { S.vx = 160; S.air = false; S.vy = 0; S.trick = null; S.grind = null; S.rot = 0; respawnSafe(); }
      return hud(g);
    }
    if (S.grind) updGrind(g, dt);
    else if (!S.air) updGround(g, dt);
    else updAir(g, dt);
    if (S.grindKey > 0) S.grindKey -= dt;
    if (g.pressed('down')) S.grindKey = 0.3;
    if (S.combo && !S.air && !S.grind) { S.landT -= dt; if (S.landT <= 0) bank(g); }
    for (const it of S.items) {
      if (!it.got && Math.abs(it.x - S.x) < 26 && Math.abs(it.y - (S.y - 30)) < 36) {
        it.got = true;
        if (it.k === 'L') { S.letters.push(it.l); g.sfx.coin(); g.float(SK.PX, S.y - 80, it.l + '!', '#ff4081', 30); if (S.letters.length === 5) { g.add(2000, SK.PX, S.y - 100); S.time += 10; flash(g, 'S-K-A-T-E 완성! +2000 +10초', '#ff4081'); g.sfx.win(); } }
        else { g.add(50, SK.PX, S.y - 70); g.sfx.coin(); }
      }
    }
    for (const d of S.dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.t -= dt; }
    S.dust = S.dust.filter((d) => d.t > 0);
    hud(g);
  },
  draw(g, c) {
    const cam = S.x - SK.PX;
    const sky = c.createLinearGradient(0, 0, 0, 540); sky.addColorStop(0, ['#7ec8e3', '#ffb74d', '#9575cd', '#4dd0e1', '#f06292'][S.lvl % 5]); sky.addColorStop(1, '#e1f5fe');
    c.fillStyle = sky; c.fillRect(0, 0, 960, 540);
    g.circle(820, 90, 46, 'rgba(255,245,200,.9)');
    for (let i = 0; i < 7; i++) { const x = ((i * 220 - cam * 0.2) % 1540 + 1540) % 1540 - 150, h = 90 + (i * 47) % 120; g.rect(x, SK.GY - 120 - h, 110, h + 120, 'rgba(70,90,120,.35)'); for (let w = 0; w < 4; w++) g.rect(x + 14 + w * 24, SK.GY - 100 - h + 20, 12, 16, 'rgba(255,255,200,.35)'); }
    for (let i = 0; i < 12; i++) { const x = ((i * 130 - cam * 0.5) % 1560 + 1560) % 1560 - 100; g.rect(x, SK.GY - 60, 8, 60, 'rgba(60,60,60,.25)'); g.emoji('🌴', x + 4, SK.GY - 80, 50); }
    g.rect(0, SK.GY, 960, 85, '#9e9e9e'); g.rect(0, SK.GY, 960, 6, '#bdbdbd');
    for (let i = 0; i < 20; i++) { const x = ((i * 120 - cam) % 2400 + 2400) % 2400 - 100; g.rect(x, SK.GY + 30, 60, 4, 'rgba(255,255,255,.3)'); }
    for (const o of S.obs) drawObs(g, c, o, o.x - cam);
    for (const it of S.items) if (!it.got) {
      const x = it.x - cam, y = it.y + Math.sin(g.time * 4 + it.x) * 5;
      if (it.k === 'L') { g.circle(x, y, 20, '#ff4081'); g.text(it.l, x, y + 1, 24, '#fff'); } else g.emoji('⭐', x, y, 26);
    }
    for (const d of S.dust) g.circle(d.x - cam, d.y, 4 * d.t / 0.4 + 1, 'rgba(255,255,255,.6)');
    drawSkater(g, c, SK.PX, S.y);
    if (S.grind) {
      g.rrect(SK.PX - 60, S.y - 120, 120, 14, 6, 'rgba(0,0,0,.5)');
      g.rect(SK.PX - 2 + S.bal * 55, S.y - 122, 4, 18, Math.abs(S.bal) > 0.7 ? '#f44336' : '#76ff03');
    }
    g.rrect(10, 10, 300, 70, 10, 'rgba(0,0,0,.45)');
    g.text(`파크 ${S.lvl}`, 20, 28, 18, '#fff', 'left');
    const got = g.score - S.lvlStart, pr = Math.min(1, got / S.target);
    g.rect(20, 44, 200, 14, '#333'); g.rect(20, 44, 200 * pr, 14, pr >= 1 ? '#76ff03' : '#ffca28');
    g.text(`${got} / ${S.target}`, 120, 51, 11, '#000');
    g.text(`⏱ ${Math.ceil(S.time)}`, 290, 28, 20, S.time < 10 ? '#ff5252' : '#fff', 'right');
    SK.LETTERS.forEach((l, i) => g.text(l, 236 + i * 14, 66, 14, S.letters.includes(l) ? '#ff4081' : 'rgba(255,255,255,.3)'));
    if (S.combo) {
      const cc = S.combo;
      g.text(cc.names.slice(-4).join(' + '), 480, 120, 20, '#fff');
      g.text(`${cc.pts} × ${cc.mult}`, 480, 150, 30, S.landT > 0 && !S.air && !S.grind ? '#ffeb3b' : '#fff');
      if (!S.air && !S.grind) { g.rect(430, 170, 100 * Math.max(0, S.landT / 0.6), 5, '#ffeb3b'); }
    }
    if (S.msgT > 0) g.text(S.msg, 480, 210, 28, S.msgC || '#fff');
    if (S.bail > 0) g.text('꽈당! 💥', SK.PX, S.y - 110, 30, '#ff5252');
  },
});

function hud(g) { g.info = `파크 ${S.lvl} · 남은 ${Math.ceil(S.time)}초 · 목표 ${Math.max(0, S.target - (g.score - S.lvlStart))}`; }
function flash(g, m, c) { S.msg = m; S.msgC = c; S.msgT = 2; }
function newLevel(g, first) {
  S.lvl++; S.time = 60; S.lvlStart = g.score; S.target = 12000 * S.lvl + 3000 * (S.lvl - 1) * (S.lvl - 1); S.letters = []; S.cleared = false;
  if (first) { S.genX = S.x + 500; S.obs = []; S.items = []; }
  else { S.obs = S.obs.filter((o) => o.x < S.x + 300); S.items = []; S.genX = S.x + 500; }
  S.letterIdx = 0; S.chunks = 0;
  flash(g, `파크 ${S.lvl} — 목표 ${S.target}점!`, '#fff');
}
function nextLevel(g) { g.add(Math.max(0, Math.ceil(S.time)) * 20); g.sfx.win(); newLevel(g, false); }

function genChunk() {
  let x = S.genX;
  const r = Math.random(), L = S.lvl;
  const o = (t, w, h, extra) => { const ob = Object.assign({ t, x, w, h }, extra || {}); S.obs.push(ob); return ob; };
  let w = 0;
  if (r < 0.22) { const h = U.randi(45, 70); o('kicker', 130, h); w = 130; if (Math.random() < 0.5) { const gw = U.randi(80, 120 + L * 20); x += 130; o('gap', gw, 0); w += gw; } }
  else if (r < 0.42) { const len = U.randi(200, 360); o('rail', len, U.randi(55, 85)); w = len; }
  else if (r < 0.58) { const len = U.randi(160, 280); o('funbox', 90 + len + 90, 50, { top: len }); w = 180 + len; }
  else if (r < 0.7) { const len = U.randi(180, 300); o('ledge', len, 42); w = len; }
  else if (r < 0.82) { o('cone', 30, 34); w = 30; if (L > 1 && Math.random() < 0.5) { x += 60; o('cone', 30, 34); w += 60; } }
  else if (r < 0.92) { const gw = U.randi(70, 110 + L * 15); o('gap', gw, 0); w = gw; }
  else { const h = U.randi(60, 80); o('kicker', 140, h); x += 140 + 140; const len = U.randi(200, 300); o('rail', len, U.randi(60, 80)); w = 280 + len; }
  const cx = S.genX + w / 2;
  if (S.chunks % 3 === 1 && S.letterIdx < 5) { S.items.push({ k: 'L', l: SK.LETTERS[S.letterIdx++], x: cx, y: SK.GY - U.randi(150, 210) }); }
  else if (Math.random() < 0.6) for (let i = 0; i < 3; i++) S.items.push({ k: 's', x: cx - 40 + i * 40, y: SK.GY - 120 - Math.sin((i / 2) * Math.PI) * 40 });
  S.chunks++;
  S.genX += w + U.randi(220, 380) - Math.min(100, L * 12);
}

function surf(x, feet) {
  let s = SK.GY;
  for (const o of S.obs) {
    if (x < o.x || x > o.x + o.w) continue;
    if (o.t === 'gap') { if (x > o.x + 4 && x < o.x + o.w - 4) s = 1e9; }
  }
  for (const o of S.obs) {
    if (x < o.x || x > o.x + o.w) continue;
    const u = x - o.x;
    if (o.t === 'kicker') s = Math.min(s, SK.GY - o.h * u / o.w);
    else if (o.t === 'funbox') {
      if (u < 90) s = Math.min(s, SK.GY - o.h * u / 90);
      else if (u > o.w - 90) s = Math.min(s, SK.GY - o.h * (o.w - u) / 90);
      else if (feet <= SK.GY - o.h + 14) s = Math.min(s, SK.GY - o.h);
    } else if (o.t === 'ledge') { if (feet <= SK.GY - o.h + 14) s = Math.min(s, SK.GY - o.h); }
  }
  return s;
}
function wallHit(px, nx, feet) {
  for (const o of S.obs) {
    if (o.t === 'ledge' && px + 12 <= o.x && nx + 12 > o.x && feet > SK.GY - o.h + 10) return true;
    if (o.t === 'cone' && nx + 10 > o.x && nx - 10 < o.x + o.w && feet > SK.GY - o.h + 4) return true;
  }
  return false;
}

function updGround(g, dt) {
  if (g.right) S.vx += 300 * dt;
  if (g.left) S.vx -= 420 * dt;
  S.vx = U.clamp(S.vx - 20 * dt, 120, 440 + S.lvl * 10);
  if (g.pressed('right')) { g.sfx.noise(0.08, 0.04); S.dust.push({ x: S.x - 20, y: S.y, vx: -60, vy: -20, t: 0.4 }); }
  const px = S.x, nx = S.x + S.vx * dt;
  if (wallHit(px, nx, S.y)) return doBail(g, '부딪힘!');
  const k = S.obs.find((o) => o.t === 'kicker' && px >= o.x && px <= o.x + o.w);
  S.x = nx;
  if (k && nx > k.x + k.w) { S.air = true; S.vy = -(430 + S.vx * 0.75) * (k.h / 60); g.sfx.jump(); S.y = SK.GY - k.h; startAir(); return; }
  const s = surf(S.x, S.y);
  if (s > S.y + 14) { S.air = true; S.vy = 0; startAir(); return; }
  S.y = s;
  if (g.pressed('a')) { S.air = true; S.vy = -560; g.sfx.jump(); startAir(); if (S.combo && S.landT > 0) addTrick(g, '알리', 50); }
}
function startAir() { S.trick = null; S.rot = 0; }
function updAir(g, dt) {
  const py = S.y, px = S.x;
  S.vy += SK.G * dt; S.x += S.vx * dt; S.y += S.vy * dt;
  if (wallHit(px, S.x, S.y)) return doBail(g, '부딪힘!');
  if (S.trick) { S.trickT -= dt; if (S.trickT <= 0) { addTrick(g, S.trick.n, S.trick.p); S.trick = null; } }
  if (!S.trick) { for (const key of ['left', 'right', 'up', 'b']) if (g.pressed(key)) { S.trick = SK_TRICKS[key]; S.trickT = SK_TRICKS[key].t; g.sfx.tone(500 + Math.random() * 200, 0.08, 'triangle', 0.05, 900); break; } }
  if (S.vy > 0 && !S.trick && (g.down || S.grindKey > 0)) {
    for (const o of S.obs) {
      const top = SK.GY - o.h;
      if ((o.t === 'rail' || o.t === 'ledge' || o.t === 'funbox') && S.x > o.x + (o.t === 'funbox' ? 90 : 0) && S.x < o.x + o.w - (o.t === 'funbox' ? 90 : 0) && py <= top + 6 && S.y >= top - 4) {
        S.grind = o; S.y = top; S.vy = 0; S.bal = U.rand(-0.15, 0.15); S.balV = 0; S.grindPts = 0; S.grindName = o.t === 'rail' ? '50-50 그라인드' : o.t === 'ledge' ? '5-0 렛지' : '보드슬라이드';
        g.sfx.tone(900, 0.2, 'sawtooth', 0.03); return;
      }
    }
  }
  if (S.y > 600) return doBail(g, '추락!');
  const s = surf(S.x, py);
  if (S.vy > 0 && S.y >= s && s < 1e8) {
    S.y = s; S.air = false; S.vy = 0;
    if (S.trick && S.trickT > 0.07) return doBail(g, '트릭 실패!');
    if (S.trick) { addTrick(g, S.trick.n, S.trick.p); S.trick = null; }
    g.sfx.drop(); for (let i = 0; i < 4; i++) S.dust.push({ x: S.x + U.rand(-15, 15), y: S.y, vx: U.rand(-80, 80), vy: U.rand(-60, -10), t: 0.4 });
    if (S.combo) { S.landT = 0.6; g.sfx.tone(700, 0.06, 'square', 0.04); }
  }
}
function updGrind(g, dt) {
  const o = S.grind;
  S.x += S.vx * dt; S.vx = Math.max(160, S.vx - 15 * dt);
  S.balV += (U.rand(-1, 1) * 3.2 + S.bal * 2.2) * dt * (1 + S.lvl * 0.12);
  if (g.left) S.balV -= 3.5 * dt;
  if (g.right) S.balV += 3.5 * dt;
  S.balV *= Math.pow(0.6, dt); S.bal += S.balV * dt;
  if (Math.abs(S.bal) > 1) { S.grind = null; return doBail(g, '균형 잃음!'); }
  S.grindPts += dt * 220;
  if (Math.random() < 0.6) g.burst(SK.PX + U.rand(-10, 10), S.y, ['#ffeb3b', '#ff9800'], 1, 120, 0.3, 2);
  const end = o.t === 'funbox' ? o.x + o.w - 90 : o.x + o.w;
  if (g.pressed('a')) { finishGrind(g); S.air = true; S.vy = -520; g.sfx.jump(); startAir(); return; }
  if (S.x > end) { finishGrind(g); S.air = true; S.vy = -120; startAir(); }
}
function finishGrind(g) { addTrick(g, S.grindName, Math.round(100 + S.grindPts)); S.grind = null; }
function addTrick(g, n, p) {
  if (!S.combo) S.combo = { pts: 0, mult: 0, names: [], seen: {} };
  const c = S.combo, rep = c.seen[n] || 0; c.seen[n] = rep + 1;
  const val = Math.round(p * Math.pow(0.5, rep));
  c.pts += val; c.mult = Math.min(10, c.mult + 1); c.names.push(n);
  g.float(SK.PX + 40, S.y - 90, `${n} ${val}`, '#fff', 18);
}
function bank(g) {
  if (!S.combo) return;
  const c = S.combo, tot = c.pts * c.mult;
  if (tot > 0) { g.add(tot, SK.PX, S.y - 130); if (c.mult >= 3) { g.sfx.power(); g.burst(SK.PX, S.y - 60, ['#ffeb3b', '#ff4081', '#00e5ff'], 20 + c.mult * 4, 260, 0.8); flash(g, `${c.mult}콤보! +${tot}`, '#ffeb3b'); } else g.sfx.coin(); }
  S.combo = null; S.landT = 0;
}
function doBail(g, why) {
  S.bail = 1.1; S.combo = null; S.trick = null; S.grind = null; S.air = false;
  g.sfx.hit(); g.shake(8, 0.3); g.burst(SK.PX, S.y - 20, ['#fff', '#ffeb3b'], 16, 200, 0.6);
  flash(g, why, '#ff5252'); S.time = Math.max(0.5, S.time - 2);
}
function respawnSafe() {
  for (let tries = 0; tries < 50; tries++) {
    const s = surf(S.x, SK.GY), bad = S.obs.some((o) => (o.t === 'ledge' || o.t === 'cone' || o.t === 'gap') && S.x + 30 > o.x && S.x - 30 < o.x + o.w);
    if (!bad && s < 1e8) { S.y = s; return; }
    S.x += 30;
  }
  S.y = SK.GY;
}

function drawObs(g, c, o, x) {
  if (x > 1000 || x + o.w < -40) return;
  const top = SK.GY - o.h;
  if (o.t === 'kicker') { g.poly([[x, SK.GY], [x + o.w, top], [x + o.w, SK.GY]], '#8d6e63', '#5d4037', 3); g.line(x, SK.GY, x + o.w, top, '#bcaaa4', 4); }
  else if (o.t === 'funbox') { g.poly([[x, SK.GY], [x + 90, top], [x + o.w - 90, top], [x + o.w, SK.GY]], '#607d8b', '#37474f', 3); g.line(x + 90, top, x + o.w - 90, top, '#ffca28', 5); }
  else if (o.t === 'ledge') { g.rect(x, top, o.w, o.h, '#78909c'); g.rect(x, top, o.w, 6, '#cfd8dc'); g.stroke(x, top, o.w, o.h, '#455a64', 2); }
  else if (o.t === 'rail') { g.line(x, top, x + o.w, top, '#eceff1', 6); g.line(x, top, x + o.w, top, '#90a4ae', 2); for (let p = 10; p < o.w; p += 90) g.line(x + p, top, x + p, SK.GY, '#546e7a', 5); }
  else if (o.t === 'gap') { g.rect(x, SK.GY, o.w, 85, '#263238'); c.fillStyle = '#ffeb3b'; for (let p = 0; p < o.w; p += 20) c.fillRect(x + p, SK.GY - 2, 10, 4); }
  else if (o.t === 'cone') g.emoji('🚧', x + o.w / 2, SK.GY - 18, 40);
}
function drawSkater(g, c, x, y) {
  c.save(); c.translate(x, y);
  if (S.bail > 0) c.rotate(-Math.min(1.4, (1.1 - S.bail) * 4));
  let bsx = 1, bsy = 1, brot = 0, col = '#e53935';
  if (S.trick) {
    const p = 1 - S.trickT / S.trick.t, a = p * Math.PI * 2;
    if (S.trick.k === 'flip' || S.trick.k === 'heel') { bsy = Math.cos(a); if (bsy < 0) col = '#212121'; }
    else if (S.trick.k === 'shove') bsx = Math.cos(a);
    else { bsy = Math.cos(a * 2); bsx = Math.cos(a); if (bsy < 0) col = '#212121'; }
  }
  if (S.grind) brot = 0;
  else if (!S.air && S.bail <= 0) { const s1 = surf(S.x - 15, S.y), s2 = surf(S.x + 15, S.y); if (s1 < 1e8 && s2 < 1e8) brot = Math.atan2(s2 - s1, 30); }
  c.save(); c.translate(0, -8 - (S.air ? 10 : 0)); c.rotate(brot); c.scale(bsx, bsy || 0.05);
  g.rrect(-28, -4, 56, 8, 4, col, '#000', 1);
  c.restore();
  if (!S.trick || S.trick.k === 'shove') { g.circle(-18, -2 - (S.air ? 10 : 0), 4, '#ffecb3'); g.circle(18, -2 - (S.air ? 10 : 0), 4, '#ffecb3'); }
  const lift = S.air ? 22 : 12, crouch = S.air ? 8 : 0;
  c.lineCap = 'round';
  g.line(-10, -12 - lift + 8, -6, -40 + crouch, '#1565c0', 6); g.line(10, -12 - lift + 8, 4, -40 + crouch, '#1565c0', 6);
  g.line(0, -40 + crouch, 2, -70 + crouch, '#ff7043', 9);
  const arm = Math.sin(g.time * 6) * 0.3 + (S.grind ? S.bal * 0.8 : 0);
  g.line(2, -64 + crouch, -22, -52 + crouch + arm * 20, '#ff7043', 5); g.line(2, -64 + crouch, 24, -54 + crouch - arm * 20, '#ff7043', 5);
  g.circle(3, -82 + crouch, 11, '#ffcc80'); g.rect(-9, -95 + crouch, 24, 8, '#212121');
  c.restore();
}
