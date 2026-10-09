let S;
const PADS = [{ c: '#22c55e', l: '#86efac', f: 329.6 }, { c: '#ef4444', l: '#fca5a5', f: 261.6 }, { c: '#facc15', l: '#fef08a', f: 220 }, { c: '#3b82f6', l: '#93c5fd', f: 164.8 }];
GAME({
  title: '사이먼 기억력', w: 700, h: 780, bg: '#0f172a', controls: 'none',
  help: '빛과 소리가 나오는 순서를 기억하세요\n그 순서대로 패드를 클릭 (또는 Q W A S / 1 2 3 4 키)\n맞히면 순서가 하나씩 늘어나요\n10단계마다 속도 UP!',
  init(g) { S = { seq: [], i: 0, phase: 'show', t: 1, lit: -1, litT: 0, show: 0 }; add(); },
  update(g, dt) {
    S.litT -= dt; if (S.litT <= 0) S.lit = -1;
    const sp = Math.max(0.22, 0.6 - Math.floor(S.seq.length / 10) * 0.12);
    if (S.phase === 'show') {
      S.t -= dt;
      if (S.t <= 0) { if (S.show >= S.seq.length) { S.phase = 'input'; S.i = 0; return; } flash(g, S.seq[S.show++], sp * 0.8); S.t = sp; }
      return;
    }
    if (S.phase === 'fail') return;
    let p = -1;
    [['KeyQ', 'Digit1'], ['KeyW', 'Digit2'], ['KeyA', 'Digit3'], ['KeyS', 'Digit4']].forEach((ks, i) => ks.forEach((k) => g.keyp(k) && (p = i)));
    if (g.mouse.clicked) { const dx = g.mouse.x - 350, dy = g.mouse.y - 400, d = Math.hypot(dx, dy); if (d > 90 && d < 300) p = (dy < 0 ? 0 : 2) + (dx < 0 ? 0 : 1); }
    if (p < 0) return;
    flash(g, p, 0.25);
    if (p === S.seq[S.i]) { S.i++; if (S.i >= S.seq.length) { g.add(S.seq.length * 10); g.sfx.coin(); add(); } }
    else { S.phase = 'fail'; S.lit = S.seq[S.i]; S.litT = 1.2; g.sfx.tone(90, 0.8, 'sawtooth', 0.1); g.shake(10); g.later(() => g.over(`${S.seq.length - 1}단계까지 기억!`), 1.2); }
    g.info = `단계 ${S.seq.length}`;
  },
  draw(g, c) {
    const cx = 350, cy = 400;
    g.circle(cx, cy, 310, '#1e293b');
    for (let i = 0; i < 4; i++) {
      const a0 = [Math.PI, Math.PI * 1.5, Math.PI * 0.5, 0][i], lit = S.lit === i;
      c.fillStyle = lit ? PADS[i].l : PADS[i].c; c.globalAlpha = lit ? 1 : 0.55;
      if (lit) { c.shadowBlur = 50; c.shadowColor = PADS[i].l; }
      c.beginPath(); c.arc(cx, cy, 290, a0 + 0.05, a0 + Math.PI / 2 - 0.05); c.arc(cx, cy, 100, a0 + Math.PI / 2 - 0.12, a0 + 0.12, true); c.closePath(); c.fill();
      c.shadowBlur = 0; c.globalAlpha = 1;
      const lx = cx + Math.cos(a0 + Math.PI / 4) * 195, ly = cy + Math.sin(a0 + Math.PI / 4) * 195;
      g.text(['Q', 'W', 'A', 'S'][i], lx, ly, 22, 'rgba(255,255,255,.6)');
    }
    g.circle(cx, cy, 90, '#0f172a');
    g.text(S.seq.length, cx, cy - 10, 48, '#fff');
    g.text(S.phase === 'show' ? '보세요 👀' : S.phase === 'input' ? '따라하세요!' : '틀렸어요', cx, cy + 32, 16, '#94a3b8');
  },
});
function add() { S.seq.push(U.randi(0, 3)); S.phase = 'show'; S.show = 0; S.t = 1; }
function flash(g, i, d) { S.lit = i; S.litT = d; g.sfx.tone(PADS[i].f, d, 'triangle', 0.12); }
