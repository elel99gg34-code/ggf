'use strict';
let S;
const PT_T = 32, PT_W = 30, PT_H = 18, PT_OY = 24;
const PT_PCOL = ['#38bdf8', '#fb923c'];
// level builders: border metal, then ops. f = fill(x0,y0,x1,y1,ch), s = set(x,y,ch)
const PT_LV = [
  { name: '첫 번째 포탈', tip: '왼쪽 벽(흰 벽)과 오른쪽 천장에 포탈을 하나씩! 벽으로 걸어 들어가세요.', b: (f, s) => { f(14, 0, 28, 0, '#'); f(13, 10, 13, 15, 'X'); f(0, 12, 0, 15, '#'); s(2, 15, 'P'); s(27, 15, 'E'); } },
  { name: '산성 건너기', tip: '초록 산성은 위험! 양쪽 벽을 포탈로 연결하세요.', b: (f, s) => { f(8, 15, 21, 15, '^'); f(0, 11, 0, 15, '#'); f(29, 11, 29, 15, '#'); s(3, 15, 'P'); s(25, 15, 'E'); } },
  { name: '빠른 것은 빠르게 나온다', tip: '절벽 끝에 서서 아래 바닥을 조준! 높은 곳에서 바닥 포탈로 떨어지면 같은 속도로 튀어나와요.', b: (f, s) => { f(1, 4, 6, 15, 'X'); f(7, 16, 12, 16, '#'); f(13, 15, 19, 15, '^'); f(20, 16, 21, 16, '#'); f(22, 6, 28, 15, 'X'); s(3, 3, 'P'); s(26, 5, 'E'); } },
  { name: '큐브와 버튼', tip: '선반 위 큐브를 가져와 버튼에! Shift/X 로 들기·내려놓기', b: (f, s) => { f(0, 4, 2, 4, 'X'); f(0, 1, 0, 2, '#'); s(2, 3, 'C'); f(0, 11, 0, 15, '#'); f(24, 1, 24, 10, 'X'); f(24, 11, 24, 15, 'D'); s(12, 15, 'B'); s(6, 15, 'P'); s(27, 15, 'E'); } },
  { name: '분해 그릴', tip: '파란 격자(그릴)는 포탈 발사를 막고, 통과하면 포탈이 사라져요. 날아서 넘어가세요!', b: (f, s) => { f(1, 4, 4, 15, 'X'); f(5, 16, 14, 16, '#'); f(15, 8, 15, 15, 'X'); f(15, 1, 15, 7, 'G'); s(2, 3, 'P'); s(25, 15, 'E'); f(20, 13, 22, 15, 'X'); } },
  { name: '멀리 날아가기', tip: '벽 포탈에서 튀어나오는 속도로 산성을 뛰어넘으세요.', b: (f, s) => { f(22, 5, 28, 15, 'X'); f(18, 16, 21, 16, '#'); f(17, 10, 17, 15, 'X'); f(8, 15, 16, 15, 'X'); f(1, 15, 7, 15, '^'); f(0, 10, 0, 14, '#'); s(25, 4, 'P'); s(16, 14, 'E'); } },
  { name: '구덩이 속 큐브', tip: '구덩이 끝에 서서 큐브 바로 아래 바닥에 포탈, 다른 하나는 흰 바닥에! 큐브가 튀어나와요.', b: (f, s) => { f(1, 9, 28, 15, 'X'); f(2, 9, 7, 15, '.'); f(2, 16, 7, 16, '#'); s(4, 15, 'C'); f(10, 9, 12, 9, '#'); s(15, 8, 'B'); s(18, 8, 'P'); f(22, 1, 22, 4, 'X'); f(22, 5, 22, 8, 'D'); s(26, 8, 'E'); } },
  { name: '무한 낙하', tip: '발밑 바닥과 바로 위 천장에 포탈 → 무한히 떨어지며 가속! 그다음 주황 포탈을 옮기세요.', b: (f, s) => { f(7, 15, 19, 15, '^'); f(1, 16, 6, 16, '#'); f(20, 16, 21, 16, '#'); f(22, 6, 28, 15, 'X'); f(1, 0, 12, 0, '#'); s(3, 15, 'P'); s(26, 5, 'E'); } },
  { name: '두 개의 버튼', tip: '버튼 두 개를 동시에! 흰 바닥 포탈에 뛰어들면 다른 포탈로 나와요. 선반 위 천장도 흰 벽!', b: (f, s) => { f(1, 9, 28, 15, 'X'); f(2, 9, 7, 15, '.'); f(2, 16, 7, 16, '#'); s(4, 15, 'C'); f(10, 9, 12, 9, '#'); f(15, 4, 17, 4, 'X'); s(16, 3, 'C'); f(15, 0, 17, 0, '#'); s(14, 8, 'B'); s(19, 8, 'B'); f(22, 1, 22, 4, 'X'); f(22, 5, 22, 8, 'D'); s(26, 8, 'E'); s(18, 8, 'P'); } },
  { name: '최종 시험', tip: '버튼으로 문을 열고, 날아서 산성을 건너라!', b: (f, s) => { f(22, 5, 28, 15, 'X'); f(18, 16, 21, 16, '#'); f(17, 10, 17, 15, 'X'); f(8, 15, 16, 15, 'X'); f(1, 15, 7, 15, '^'); f(0, 10, 0, 14, '#'); f(13, 11, 13, 14, 'D'); s(27, 4, 'C'); s(23, 4, 'B'); s(25, 4, 'P'); s(16, 14, 'E'); } },
];
GAME({
  title: '포탈 퍼즐', w: 960, h: 600, bg: '#0f172a', controls: 'lr+ab', aLabel: '점프', bLabel: '들기', noRKey: true,
  help: '←→/AD 이동 · Space/W/↑ 점프 · 마우스로 조준\n좌클릭(또는 Q) = 파랑 포탈 · 우클릭(또는 E) = 주황 포탈 (터치: 탭할 때마다 번갈아)\n흰 벽에만 포탈 가능 · 들어간 속도 그대로 다른 포탈에서 튀어나옴!\nShift/X 큐브 들기·놓기 · 버튼을 누르면 문이 열려요 · R = 단계 재시작\n🚪 출구에 도달하면 클리어 · 총 10단계',
  init(g) { S = { lvl: 0, deaths: 0, touch: typeof window !== 'undefined' && 'ontouchstart' in window, nextP: 0 }; loadLevel(g, 0); },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { S.lvl++; if (S.lvl >= PT_LV.length) return g.win(`모든 실험 완료! 사망 ${S.deaths}회`); loadLevel(g, S.lvl); } return; }
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) loadLevel(g, S.lvl, true); return; }
    if (g.keyp('KeyR')) return loadLevel(g, S.lvl, true);
    const P = S.p;
    // aim
    const m = g.mouse;
    if (m.moved || m.clicked || m.down) S.aimMouse = true;
    if (S.aimMouse) S.aimPt = [m.x, m.y - PT_OY];
    S.aim = S.aimMouse ? Math.atan2(S.aimPt[1] - (P.y + P.h / 2), S.aimPt[0] - (P.x + P.w / 2)) : (P.face > 0 ? -0.35 : Math.PI + 0.35);
    if (m.clicked) { if (S.touch) { shoot(g, S.nextP); S.nextP ^= 1; } else shoot(g, 0); }
    if (m.rclick) shoot(g, 1);
    if (g.keyp('KeyQ')) shoot(g, 0);
    if (g.keyp('KeyE')) shoot(g, 1);
    // move
    const dir = (g.right ? 1 : 0) - (g.left ? 1 : 0);
    if (dir) P.face = dir;
    if (P.ground) { P.vx = approach(P.vx, dir * 230, 2400 * dt); }
    else {
      if (dir && (Math.sign(P.vx) !== dir || Math.abs(P.vx) < 230)) P.vx += dir * 1100 * dt;
      if (!dir) P.vx *= 1 - 0.5 * dt;
    }
    P.coy = P.ground ? 0.08 : P.coy - dt;
    if ((g.pressed('a') || g.pressed('up')) && P.coy > 0) { P.vy = -520; P.coy = 0; P.jumping = true; g.sfx.jump(); }
    if (P.vy >= 0) P.jumping = false;
    if (P.jumping && !(g.a || g.up) && P.vy < -260) P.vy = -260;
    P.vy = Math.min(P.vy + 1500 * dt, 1100);
    physics(g, P, dt);
    // carry
    if (g.pressed('b')) toggleCarry(g);
    for (const c of S.cubes) {
      if (c === S.carry) { c.x = P.x + P.w / 2 - c.w / 2 + P.face * 24; c.y = P.y + 2; c.vx = P.vx; c.vy = P.vy; continue; }
      c.vy = Math.min(c.vy + 1500 * dt, 1100);
      if (c.ground) c.vx = approach(c.vx, 0, 1500 * dt); else c.vx *= 1 - 0.3 * dt;
      physics(g, c, dt);
      if (touches(c, '^') || c.y > PT_H * PT_T) respawnCube(g, c);
      if (touches(c, 'G')) respawnCube(g, c);
    }
    // grill
    if (touches(P, 'G')) { if (S.portals[0] || S.portals[1]) { S.portals = [null, null]; g.sfx.tone(200, 0.2, 'sawtooth', 0.05, 80); S.msg = '포탈 분해됨'; S.msgT = 1; } if (S.carry) { respawnCube(g, S.carry); S.carry = null; } }
    // buttons/doors
    let all = S.buttons.length > 0;
    for (const b of S.buttons) {
      const r = { x: b.x * PT_T + 2, y: b.y * PT_T + 22, w: PT_T - 4, h: 10 };
      b.on = U.rectHit(P, r) || S.cubes.some((c) => c !== S.carry && U.rectHit(c, r));
      if (b.on && !b.was) g.sfx.tone(520, 0.08, 'square', 0.05); if (!b.on && b.was) g.sfx.tone(260, 0.08, 'square', 0.04);
      b.was = b.on; if (!b.on) all = false;
    }
    if (all !== S.doorOpen) { S.doorOpen = all; g.sfx.tone(all ? 700 : 300, 0.15, 'triangle', 0.06); }
    S.doorAnim = approach(S.doorAnim, S.doorOpen ? 1 : 0, dt * 4);
    // hazards
    if (touches(P, '^', 4) || P.y > PT_H * PT_T + 40) return die(g);
    if (touches(P, 'E', 6)) { S.clear = 1.6; const pts = Math.max(200, 1500 - Math.floor(S.t) * 10 - S.lvDeaths * 100); g.add(pts, P.x, P.y + PT_OY - 20); g.sfx.win(); g.burst(P.x + 10, P.y + PT_OY, PT_PCOL, 40, 300, 1); return; }
    for (const s of S.shots) s.t -= dt;
    S.shots = S.shots.filter((s) => s.t > 0);
    g.info = `${S.lvl + 1}/10 · ${PT_LV[S.lvl].name}`;
  },
  draw(g, c) {
    g.rect(0, 0, 960, PT_OY, '#020617');
    g.text(`실험실 ${S.lvl + 1}/10 · ${PT_LV[S.lvl].name}`, 12, 12, 14, '#e2e8f0', 'left');
    g.text(`사망 ${S.deaths} · R 재시작`, 948, 12, 12, '#94a3b8', 'right');
    c.save(); c.translate(0, PT_OY);
    g.rect(0, 0, 960, PT_H * PT_T, '#1e293b');
    for (let y = 0; y < PT_H; y++) for (let x = 0; x < PT_W; x++) {
      const ch = S.map[y][x], px = x * PT_T, py = y * PT_T;
      if (ch === '.' || ch === 'P' || ch === 'C') { if ((x + y) % 2) g.rect(px, py, PT_T, PT_T, '#1a2436'); continue; }
      if (ch === '#') { g.rect(px, py, PT_T, PT_T, '#e2e8f0'); g.stroke(px + 1, py + 1, PT_T - 2, PT_T - 2, '#cbd5e1', 1); }
      else if (ch === 'X') { g.rect(px, py, PT_T, PT_T, '#334155'); g.line(px, py + 16, px + 32, py + 16, '#1e293b', 1); g.line(px + 16, py, px + 16, py + 16, '#1e293b', 1); g.circle(px + 4, py + 4, 1.5, '#64748b'); }
      else if (ch === '^') { g.rect(px, py + 8, PT_T, PT_T - 8, '#65a30d'); g.circle(px + 8 + Math.sin(S.t * 3 + x) * 4, py + 10, 3, '#bef264'); g.rect(px, py + 6 + Math.sin(S.t * 2 + x) * 2, PT_T, 4, '#a3e635'); }
      else if (ch === 'G') { g.rect(px + 12, py, 8, PT_T, 'rgba(56,189,248,.18)'); for (let k = 0; k < 4; k++) g.line(px + 12, py + k * 8 + ((S.t * 20) % 8), px + 20, py + k * 8 + ((S.t * 20) % 8), 'rgba(125,211,252,.6)', 1); }
      else if (ch === 'D') { const o = S.doorAnim; g.rect(px + 4, py, PT_T - 8, PT_T * (1 - o), '#b45309'); g.rect(px + 4, py, 3, PT_T * (1 - o), '#fbbf24'); if (o > 0.9) g.rect(px + 4, py, PT_T - 8, 3, '#78350f'); }
      else if (ch === 'B') { const b = S.buttons.find((bb) => bb.x === x && bb.y === y); g.rect(px + 2, py + 26, PT_T - 4, 6, '#475569'); g.rrect(px + 6, py + (b && b.on ? 24 : 20), PT_T - 12, 6, 3, b && b.on ? '#4ade80' : '#ef4444'); }
      else if (ch === 'E') { g.rect(px + 2, py - 16, PT_T - 4, PT_T + 16, '#0f766e'); g.rect(px + 6, py - 12, PT_T - 12, PT_T + 12, `rgba(94,234,212,${0.5 + Math.sin(S.t * 4) * 0.3})`); g.emoji('🚪', px + 16, py + 4, 22); }
    }
    // door wall lines
    // portals
    S.portals.forEach((p, i) => { if (p) drawPortal(g, c, p, i, !!S.portals[1 - i]); });
    // cubes
    for (const cb of S.cubes) { g.rrect(cb.x, cb.y, cb.w, cb.h, 4, '#94a3b8', '#e2e8f0', 2); g.rect(cb.x + 4, cb.y + 4, cb.w - 8, cb.h - 8, '#64748b'); g.circle(cb.x + cb.w / 2, cb.y + cb.h / 2, 5, '#f472b6'); }
    // shots
    for (const s of S.shots) { c.globalAlpha = s.t / 0.2; g.line(s.x1, s.y1, s.x2, s.y2, s.ok ? PT_PCOL[s.i] : '#94a3b8', 3); if (!s.ok) g.circle(s.x2, s.y2, 6, '#e2e8f0'); c.globalAlpha = 1; }
    // player
    const P = S.p;
    if (S.dead <= 0) {
      g.rrect(P.x, P.y + 8, P.w, P.h - 8, 4, '#f8fafc');
      g.rect(P.x + 2, P.y + P.h - 6, 6, 6, '#334155'); g.rect(P.x + P.w - 8, P.y + P.h - 6, 6, 6, '#334155');
      g.circle(P.x + P.w / 2, P.y + 7, 7, '#fcd34d');
      g.circle(P.x + P.w / 2 + P.face * 3, P.y + 6, 1.8, '#111');
      // gun
      const gx = P.x + P.w / 2, gy = P.y + P.h / 2;
      g.line(gx, gy, gx + Math.cos(S.aim) * 18, gy + Math.sin(S.aim) * 18, '#cbd5e1', 5);
      g.circle(gx + Math.cos(S.aim) * 18, gy + Math.sin(S.aim) * 18, 3, PT_PCOL[S.touch ? S.nextP : 0]);
    }
    c.restore();
    // crosshair
    if (S.aimMouse) { const m = g.mouse; g.ring(m.x, m.y, 9, 'rgba(56,189,248,.8)', 2); g.ring(m.x, m.y, 4, 'rgba(251,146,60,.8)', 2); }
    if (S.msgT > 0) { g.rrect(180, 40, 600, 36, 10, 'rgba(2,6,23,.75)'); g.text(S.msg, 480, 58, 15, '#fde047'); }
    if (S.clear > 0) { g.rrect(330, 240, 300, 90, 16, 'rgba(2,6,23,.9)', '#5eead4', 3); g.text('실험 성공! ✅', 480, 285, 30, '#5eead4'); }
    if (S.dead > 0) g.text('💀 다시 시도', 480, 300, 30, '#f87171');
  },
});
function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
function loadLevel(g, i, retry) {
  const L = PT_LV[i];
  const map = [];
  for (let y = 0; y < PT_H; y++) { const row = []; for (let x = 0; x < PT_W; x++) row.push(y === 0 || y >= 16 || x === 0 || x === 29 ? 'X' : '.'); map.push(row); }
  const f = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) map[y][x] = ch; };
  const s = (x, y, ch) => { map[y][x] = ch; };
  L.b(f, s);
  S.map = map; S.portals = [null, null]; S.shots = []; S.cubes = []; S.buttons = []; S.carry = null; S.doorOpen = false; S.doorAnim = 0;
  S.t = 0; S.clear = 0; S.dead = 0; S.aimMouse = S.aimMouse || false;
  if (!retry) S.lvDeaths = 0;
  for (let y = 0; y < PT_H; y++) for (let x = 0; x < PT_W; x++) {
    const ch = map[y][x];
    if (ch === 'P') S.p = { x: x * PT_T + 6, y: y * PT_T + 4, w: 20, h: 28, vx: 0, vy: 0, ground: false, face: 1, coy: 0, tcd: 0 };
    if (ch === 'C') S.cubes.push({ x: x * PT_T + 4, y: y * PT_T + 8, w: 24, h: 24, vx: 0, vy: 0, sx: x * PT_T + 4, sy: y * PT_T + 8, ground: false, tcd: 0 });
    if (ch === 'B') S.buttons.push({ x, y, on: false, was: false });
  }
  S.msg = retry ? PT_LV[i].name : `${i + 1}. ${L.name} — ${L.tip}`; S.msgT = retry ? 1.5 : 6;
}
function tileAt(tx, ty) { if (tx < 0 || tx >= PT_W || ty < 0 || ty >= PT_H) return 'X'; return S.map[ty][tx]; }
function isSolid(tx, ty) { const c = tileAt(tx, ty); return c === '#' || c === 'X' || (c === 'D' && S.doorAnim < 0.9); }
function touches(b, ch, inset = 0) {
  const x0 = Math.floor((b.x + inset) / PT_T), x1 = Math.floor((b.x + b.w - 1 - inset) / PT_T), y0 = Math.floor((b.y + inset) / PT_T), y1 = Math.floor((b.y + b.h - 1 - inset) / PT_T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tileAt(x, y) === ch) return true;
  return false;
}
function portalOn(tx, ty, nx, ny) { for (let i = 0; i < 2; i++) { const p = S.portals[i]; if (p && p.tx === tx && p.ty === ty && p.nx === nx && p.ny === ny) return i; } return -1; }
function physics(g, b, dt) {
  if (b.tcd > 0) b.tcd -= dt;
  // X axis
  b.x += b.vx * dt;
  let hit = collide(b);
  if (hit.length) {
    const nx = b.vx > 0 ? -1 : 1;
    if (!tryPortal(g, b, hit, nx, 0)) {
      if (b.vx > 0) b.x = Math.min(...hit.map((h) => h[0])) * PT_T - b.w; else b.x = (Math.max(...hit.map((h) => h[0])) + 1) * PT_T;
      b.vx = 0;
    }
  }
  b.y += b.vy * dt;
  b.ground = false;
  hit = collide(b);
  if (hit.length) {
    const ny = b.vy > 0 ? -1 : 1;
    if (!tryPortal(g, b, hit, 0, ny)) {
      if (b.vy > 0) { b.y = Math.min(...hit.map((h) => h[1])) * PT_T - b.h; b.ground = true; if (b === S.p && b.vy > 700) { g.sfx.drop(); g.shake(3, 0.1); } }
      else b.y = (Math.max(...hit.map((h) => h[1])) + 1) * PT_T;
      b.vy = 0;
    }
  }
}
function collide(b) {
  const out = [];
  const x0 = Math.floor(b.x / PT_T), x1 = Math.floor((b.x + b.w - 0.01) / PT_T), y0 = Math.floor(b.y / PT_T), y1 = Math.floor((b.y + b.h - 0.01) / PT_T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isSolid(x, y)) out.push([x, y]);
  return out;
}
function tryPortal(g, b, hit, nx, ny) {
  if (b.tcd > 0 || !S.portals[0] || !S.portals[1]) return false;
  for (const [tx, ty] of hit) {
    const i = portalOn(tx, ty, nx, ny);
    if (i < 0) continue;
    // tangential fit
    if (nx !== 0) { const cy = b.y + b.h / 2; if (cy < ty * PT_T + 2 || cy > ty * PT_T + PT_T - 2 || b.y < ty * PT_T - 8 || b.y + b.h > ty * PT_T + PT_T + 8) continue; }
    else { const cx = b.x + b.w / 2; if (cx < tx * PT_T - 2 || cx > tx * PT_T + PT_T + 2) continue; }
    teleport(g, b, S.portals[i], S.portals[1 - i]);
    return true;
  }
  return false;
}
function teleport(g, b, A, B) {
  const angIn = Math.atan2(-A.ny, -A.nx), angOut = Math.atan2(B.ny, B.nx);
  const th = angOut - angIn, cs = Math.cos(th), sn = Math.sin(th);
  let vx = b.vx * cs - b.vy * sn, vy = b.vx * sn + b.vy * cs;
  vx = Math.round(vx * 1000) / 1000; vy = Math.round(vy * 1000) / 1000;
  const along = vx * B.nx + vy * B.ny;
  if (along < 160) { vx += B.nx * (160 - along); vy += B.ny * (160 - along); }
  if (B.nx !== 0) vy = Math.max(vy, -200) * 0.3;
  else vx *= 0.5;
  const cx = B.tx * PT_T + 16 + B.nx * (16 + b.w / 2 + 1), cy = B.ty * PT_T + 16 + B.ny * (16 + b.h / 2 + 1);
  b.x = cx - b.w / 2; b.y = B.ny === 0 ? B.ty * PT_T + PT_T - b.h - 0.5 : cy - b.h / 2;
  if (B.ny === 0 && b.h > PT_T) b.y = cy - b.h / 2;
  b.vx = vx; b.vy = vy; b.tcd = 0.05; b.jumping = false;
  if (b === S.p && S.carry) { S.carry.x = b.x; S.carry.y = b.y; }
  if (g) { g.sfx.tone(300, 0.12, 'sine', 0.06, 900); g.burst(cx, cy + PT_OY, PT_PCOL, 10, 160, 0.4); }
}
function shoot(g, i) {
  const P = S.p;
  let dx = Math.cos(S.aim), dy = Math.sin(S.aim);
  // the gun is held out in front of the body, so you can aim down past a ledge edge
  let ox = P.x + P.w / 2 + (Math.abs(dx) > 0.05 ? Math.sign(dx) * 16 : 0), oy = P.y + P.h / 2;
  if (isSolid(Math.floor(ox / PT_T), Math.floor(oy / PT_T))) ox = P.x + P.w / 2;
  if (S.aimMouse && S.aimPt) { const ax = S.aimPt[0] - ox, ay = S.aimPt[1] - oy, al = Math.hypot(ax, ay); if (al > 4) { dx = ax / al; dy = ay / al; } }
  let px = ox, py = oy, ptx = Math.floor(px / PT_T), pty = Math.floor(py / PT_T);
  let res = null;
  for (let d = 0; d < 1400; d += 2) {
    const x = ox + dx * d, y = oy + dy * d, tx = Math.floor(x / PT_T), ty = Math.floor(y / PT_T);
    if (tx !== ptx || ty !== pty) {
      const ch = tileAt(tx, ty);
      if (ch === 'G') { res = { x, y, ok: false }; break; }
      if (isSolid(tx, ty)) {
        let nx = ptx - tx, ny = pty - ty;
        if (nx && ny) { // diagonal crossing: pick by which neighbour is open
          if (!isSolid(tx + nx, ty)) ny = 0; else nx = 0;
        }
        const ok = ch === '#' && !isSolid(tx + nx, ty + ny) && portalOn(tx, ty, nx, ny) !== 1 - i;
        if (ok) S.portals[i] = { tx, ty, nx, ny, t: 0 };
        res = { x, y, ok };
        break;
      }
      ptx = tx; pty = ty;
    }
    px = x; py = y;
  }
  if (!res) return;
  S.shots.push({ x1: ox, y1: oy, x2: res.x, y2: res.y, i, ok: res.ok, t: 0.2 });
  if (res.ok) g.sfx.tone(i ? 520 : 680, 0.1, 'square', 0.05, i ? 300 : 400); else { g.sfx.tone(140, 0.08, 'sawtooth', 0.04); g.burst(res.x, res.y + PT_OY, '#e2e8f0', 5, 80, 0.3); }
}
function toggleCarry(g) {
  const P = S.p;
  if (S.carry) {
    const c = S.carry;
    c.x = P.x + P.w / 2 - c.w / 2 + P.face * 24; c.y = P.y + P.h - c.h;
    if (collide(c).length) { c.x = P.x + P.w / 2 - c.w / 2; c.y = P.y + P.h - c.h; }
    c.vx = P.vx * 0.5; c.vy = 0; S.carry = null; g.sfx.drop(); return;
  }
  for (const c of S.cubes) if (Math.hypot(c.x + 12 - (P.x + 10), c.y + 12 - (P.y + 14)) < 48) { S.carry = c; g.sfx.click(); return; }
}
function respawnCube(g, c) { c.x = c.sx; c.y = c.sy; c.vx = 0; c.vy = 0; if (g) { g.sfx.tone(400, 0.1, 'triangle', 0.04); g.burst(c.x + 12, c.y + 12 + PT_OY, '#94a3b8', 10, 100); } }
function die(g) { S.dead = 1; S.deaths++; S.lvDeaths++; g.sfx.lose(); g.shake(8, 0.3); g.burst(S.p.x + 10, S.p.y + PT_OY + 14, ['#f8fafc', '#a3e635'], 20, 200); }
function drawPortal(g, c, p, i, linked) {
  const cx = p.tx * PT_T + 16 + p.nx * 16, cy = p.ty * PT_T + 16 + p.ny * 16;
  c.save(); c.translate(cx, cy); c.rotate(Math.atan2(p.ny, p.nx));
  const col = PT_PCOL[i];
  c.fillStyle = linked ? col : 'rgba(148,163,184,.6)';
  c.beginPath(); c.ellipse(2, 0, 6, 17, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(2, 0, 8 + Math.sin(S.t * 8) * 1.5, 19, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(3, 0, 2, 10, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
