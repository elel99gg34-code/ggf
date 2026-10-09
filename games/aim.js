let S;
const MODES = [{ n: '클래식', d: '고정 타겟 30초' }, { n: '무빙', d: '움직이는 타겟' }, { n: '플릭', d: '작고 빨리 사라짐' }];
GAME({
  title: '에임 트레이너', w: 1000, h: 700, bg: '#0b1020', controls: 'none',
  help: '나타나는 🎯 타겟을 최대한 빠르고 정확하게 클릭!\n중앙에 가까울수록 높은 점수 (정중앙 = 헤드샷 2배)\n빗나가면 정확도 감소 · 연속 명중 시 콤보\n모드: 클래식 / 무빙 / 플릭 — 30초 승부',
  init(g) { S = { mode: S?.mode ?? 0, phase: 'menu', time: 30, targets: [], hits: 0, shots: 0, combo: 0, rt: [], marks: [] }; },
  update(g, dt) {
    if (S.phase === 'menu') { MODES.forEach((m, i) => { if (g.clickIn(200 + i * 210, 330, 180, 120)) { S.mode = i; S.phase = 'play'; spawn(); spawn(); g.sfx.power(); } }); return; }
    S.time -= dt;
    if (S.time <= 0) { const acc = S.shots ? S.hits / S.shots : 0; const avg = S.rt.length ? S.rt.reduce((a, b) => a + b, 0) / S.rt.length : 0; g.add(Math.round(acc * 1000)); return g.over(`명중 ${S.hits} · 정확도 ${(acc * 100).toFixed(1)}% · 평균 반응 ${Math.round(avg * 1000)}ms`); }
    for (const t of S.targets) { t.age += dt; if (S.mode === 1) { t.x += t.vx * dt; t.y += t.vy * dt; if (t.x < 60 || t.x > 940) t.vx *= -1; if (t.y < 80 || t.y > 660) t.vy *= -1; } if (S.mode === 2) t.r = t.r0 * Math.max(0, 1 - t.age / 1.1); }
    const gone = S.targets.filter((t) => S.mode === 2 && t.age > 1.1);
    if (gone.length) { S.combo = 0; S.targets = S.targets.filter((t) => !gone.includes(t)); gone.forEach(() => spawn()); }
    if (g.mouse.clicked) {
      S.shots++; g.sfx.tone(180, 0.06, 'square', 0.05, 60);
      const t = S.targets.find((t) => U.dist(t.x, t.y, g.mouse.x, g.mouse.y) < t.r);
      if (t) {
        const d = U.dist(t.x, t.y, g.mouse.x, g.mouse.y) / t.r, head = d < 0.2;
        S.hits++; S.combo++; S.rt.push(t.age);
        const pts = Math.round((100 - d * 60) * (head ? 2 : 1) * (1 + Math.min(S.combo, 20) * 0.05));
        g.add(pts); g.float(t.x, t.y - 30, head ? `HEADSHOT +${pts}` : `+${pts}`, head ? '#f87171' : '#fde047', head ? 22 : 18);
        g.burst(t.x, t.y, ['#f87171', '#fff'], 14, 250); g.sfx.tone(head ? 1200 : 900, 0.05, 'square', 0.05);
        S.targets = S.targets.filter((q) => q !== t); spawn();
      } else { S.combo = 0; S.marks.push({ x: g.mouse.x, y: g.mouse.y, t: 1 }); }
    }
    S.marks = S.marks.filter((m) => (m.t -= dt) > 0);
    g.info = `⏱️ ${Math.ceil(S.time)} · 명중 ${S.hits} · 정확도 ${S.shots ? Math.round((S.hits / S.shots) * 100) : 100}%`;
  },
  draw(g, c) {
    for (let x = 0; x < 1000; x += 50) g.line(x, 0, x, 700, '#111a33', 1); for (let y = 0; y < 700; y += 50) g.line(0, y, 1000, y, '#111a33', 1);
    if (S.phase === 'menu') { g.text('🎯 모드를 선택하세요', 500, 240, 34, '#fff'); MODES.forEach((m, i) => { g.button(200 + i * 210, 330, 180, 120, '', '#1e3a8a'); g.text(m.n, 290 + i * 210, 370, 24, '#fff'); g.text(m.d, 290 + i * 210, 410, 14, '#bfdbfe'); }); return; }
    for (const m of S.marks) { c.globalAlpha = m.t; g.text('✕', m.x, m.y, 20, '#64748b'); c.globalAlpha = 1; }
    for (const t of S.targets) { g.circle(t.x, t.y, t.r, '#fff'); g.circle(t.x, t.y, t.r * 0.8, '#ef4444'); g.circle(t.x, t.y, t.r * 0.6, '#fff'); g.circle(t.x, t.y, t.r * 0.4, '#ef4444'); g.circle(t.x, t.y, t.r * 0.2, '#fde047'); }
    g.text(Math.ceil(S.time), 500, 40, 40, S.time < 5 ? '#f87171' : '#fff');
    if (S.combo > 2) g.text(`콤보 ×${S.combo}`, 500, 82, 20, '#fde047');
    const m = g.mouse; g.ring(m.x, m.y, 14, '#4ade80', 2); g.line(m.x - 22, m.y, m.x - 8, m.y, '#4ade80', 2); g.line(m.x + 8, m.y, m.x + 22, m.y, '#4ade80', 2); g.line(m.x, m.y - 22, m.x, m.y - 8, '#4ade80', 2); g.line(m.x, m.y + 8, m.x, m.y + 22, '#4ade80', 2);
  },
});
function spawn() {
  const r = S.mode === 2 ? 30 : U.rand(26, 42) * Math.max(0.6, 1 - (30 - S.time) / 60);
  S.targets.push({ x: U.rand(70, 930), y: U.rand(100, 650), r, r0: r, age: 0, vx: U.rand(-220, 220), vy: U.rand(-160, 160) });
}
