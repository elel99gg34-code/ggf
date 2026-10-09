let S;
const BH = 22;
GAME({
  title: '스택 타워', w: 520, h: 800, bg: '#222', controls: 'none',
  help: '클릭 / 탭 / Space 로 블록 내려놓기\n아래 블록과 겹치는 부분만 남아요\n✨ 퍼펙트로 놓으면 콤보! 연속 퍼펙트 시 블록이 다시 커짐\n층수가 곧 점수',
  init(g) {
    S = { stack: [{ x: 0, z: 0, w: 160, d: 160, hue: 200 }], cur: null, falls: [], cam: 0, combo: 0, hue: 200, over: false, axis: 0, t: 0 };
    next();
  },
  update(g, dt) {
    S.cam += (S.stack.length * BH - S.cam) * Math.min(1, dt * 4);
    for (const f of S.falls) { f.vy += 1500 * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
    S.falls = S.falls.filter((f) => f.y < 1500);
    if (S.over) return;
    const C = S.cur;
    S.t += dt * (1.6 + Math.min(S.stack.length, 60) * 0.035);
    const pos = Math.sin(S.t) * 220;
    if (S.axis === 0) C.x = pos; else C.z = pos;
    if (g.pressed('a') || g.mouse.clicked) place(g);
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, g.H);
    grd.addColorStop(0, `hsl(${S.hue + 40},45%,${30}%)`); grd.addColorStop(1, `hsl(${S.hue},50%,${12}%)`);
    c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
    const base = 560 + S.cam;
    const iso = (x, z, h) => [g.W / 2 + (x - z) * 0.87, base + (x + z) * 0.5 - h];
    const box = (b, lvl, a = 1, dy = 0) => {
      const h = lvl * BH - dy, x0 = b.x - b.w / 2, z0 = b.z - b.d / 2, x1 = x0 + b.w, z1 = z0 + b.d;
      const p = (x, z, hh) => iso(x, z, hh);
      c.globalAlpha = a;
      g.poly([p(x0, z1, h), p(x1, z1, h), p(x1, z1, h - BH), p(x0, z1, h - BH)], `hsl(${b.hue},55%,42%)`);
      g.poly([p(x1, z0, h), p(x1, z1, h), p(x1, z1, h - BH), p(x1, z0, h - BH)], `hsl(${b.hue},55%,52%)`);
      g.poly([p(x0, z0, h), p(x1, z0, h), p(x1, z1, h), p(x0, z1, h)], `hsl(${b.hue},60%,66%)`);
      c.globalAlpha = 1;
    };
    // 바닥 기둥
    box({ x: 0, z: 0, w: 160, d: 160, hue: S.stack[0].hue }, 0, 1, -300);
    S.stack.forEach((b, i) => { if ((S.stack.length - i) * BH < 1200) box(b, i + 1); });
    if (S.cur && !S.over) box(S.cur, S.stack.length + 1);
    for (const f of S.falls) box(f.b, f.lvl, Math.max(0, 1 - f.y / 900), -f.y);
    if (S.flash > 0) { S.flash -= 1 / 60; const top = S.stack[S.stack.length - 1]; const [x, y] = iso(top.x, top.z, S.stack.length * BH); g.ring(x, y, (1 - S.flash) * 160, `rgba(255,255,255,${S.flash})`, 4); }
    g.text(S.stack.length - 1, g.W / 2, 90, 80, '#fff');
    if (S.combo > 1) g.text(`퍼펙트 ×${S.combo}`, g.W / 2, 150, 24, '#fde047');
  },
});
function next() {
  const top = S.stack[S.stack.length - 1];
  S.axis = S.stack.length % 2;
  S.hue = (S.hue + 7) % 360;
  S.cur = { x: top.x, z: top.z, w: top.w, d: top.d, hue: S.hue };
  S.t = -Math.PI / 2;
}
function place(g) {
  const C = S.cur, top = S.stack[S.stack.length - 1];
  const k = S.axis === 0 ? 'x' : 'z', sz = S.axis === 0 ? 'w' : 'd';
  const diff = C[k] - top[k];
  const lvl = S.stack.length + 1;
  if (Math.abs(diff) < 6) {
    C[k] = top[k]; S.combo++;
    g.sfx.tone(400 + S.combo * 60, 0.15, 'sine', 0.08); S.flash = 1;
    if (S.combo >= 5) { C[sz] = Math.min(160, C[sz] + 12); }
    g.add(1 + (S.combo >= 3 ? 1 : 0));
  } else {
    const overlap = top[sz] - Math.abs(diff);
    if (overlap <= 0) {
      S.falls.push({ b: { ...C }, lvl, y: 0, vy: 0, rot: 0, vr: 0 });
      S.over = true; g.sfx.lose(); g.shake(8);
      return g.over(`${S.stack.length - 1}층!`);
    }
    S.combo = 0;
    const cut = { ...C };
    cut[sz] = Math.abs(diff);
    cut[k] = diff > 0 ? top[k] + top[sz] / 2 + cut[sz] / 2 : top[k] - top[sz] / 2 - cut[sz] / 2;
    C[sz] = overlap; C[k] = top[k] + diff / 2;
    S.falls.push({ b: cut, lvl, y: 0, vy: 0, rot: 0, vr: 0 });
    g.sfx.drop(); g.add(1);
  }
  S.stack.push(C);
  next();
}
