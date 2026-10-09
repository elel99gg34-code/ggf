let S;
GAME({
  title: '나이프 히트', w: 520, h: 820, bg: '#1e1b2e', controls: 'none',
  help: '클릭/탭/Space 로 칼 던지기\n통나무에 꽂힌 칼에 부딪히면 실패!\n🍎 사과를 맞히면 보너스 +5\n5스테이지마다 보스 통나무 (회전 패턴이 변덕스러움)',
  init(g) { S = { stage: 0, knives: 0, apples: 0, fly: null, stuck: [], log: { a: 0, sp: 2, t: 0 }, broken: 0, shards: [], fail: false }; next(g); },
  update(g, dt) {
    const L = S.log;
    L.t += dt;
    const boss = S.stage % 5 === 0;
    const pat = S.stage % 4;
    let sp = L.sp;
    if (boss) sp = Math.sin(L.t * 1.3) * 4.5 + Math.sin(L.t * 3.1) * 1.5;
    else if (pat === 2) sp = L.sp * (Math.sin(L.t * 1.5) > 0 ? 1 : -1.3);
    else if (pat === 3) sp = L.sp * (1 + Math.sin(L.t * 2.2) * 0.8);
    L.a += sp * dt;
    for (const s of S.shards) { s.vy += 1200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; }
    S.shards = S.shards.filter((s) => s.y < 1000);
    if (S.fail) return;
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) next(g); return; }
    if (!S.fly && (g.pressed('a') || g.mouse.clicked) && S.left > 0) { S.fly = { y: 700 }; S.left--; g.sfx.tone(700, 0.05, 'triangle', 0.04, 1200); }
    if (S.fly) {
      S.fly.y -= 2600 * dt;
      if (S.fly.y <= 300 + 105) {
        const hitAng = -L.a;
        const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const ha = norm(hitAng);
        if (S.stuck.some((k) => { let d = Math.abs(norm(k) - ha); d = Math.min(d, Math.PI * 2 - d); return d < 0.17; })) {
          S.fail = true; g.sfx.hit(); g.shake(10);
          S.shards.push({ x: 260, y: 420, vx: U.rand(-200, 200), vy: -300, r: 0, vr: 12, knife: true });
          return g.later(() => g.over(`스테이지 ${S.stage} · 사과 ${S.apples}개`), 0.9);
        }
        S.stuck.push(ha); S.fly = null; g.add(1); S.knives++; S.hitT = 0.1; g.sfx.tone(200, 0.06, 'square', 0.06); g.burst(260, 405, '#a16207', 8, 150, 0.4);
        const ap = S.apples_on.find((p) => { let d = Math.abs(norm(p.a) - ha); d = Math.min(d, Math.PI * 2 - d); return d < 0.2 && !p.got; });
        if (ap) { ap.got = true; S.apples++; g.add(5, 260, 200); g.sfx.coin(); S.shards.push({ x: 260, y: 428, vx: U.rand(-150, 150), vy: -400, r: 0, vr: 5, e: '🍎' }); }
        if (S.left === 0) {
          g.sfx.win(); S.clear = 1.2; g.add(boss ? 30 : 10); g.shake(12);
          for (let i = 0; i < 8; i++) S.shards.push({ x: 260 + U.rand(-60, 60), y: 300 + U.rand(-60, 60), vx: U.rand(-300, 300), vy: U.rand(-500, -100), r: U.rand(6), vr: U.rand(-8, 8), e: '🪵' });
          S.stuck.forEach((k) => S.shards.push({ x: 260, y: 300, vx: U.rand(-300, 300), vy: U.rand(-400, -100), r: 0, vr: U.rand(-10, 10), knife: true }));
          S.stuck = [];
        }
      }
    }
    S.hitT = Math.max(0, (S.hitT || 0) - dt);
    g.info = `스테이지 ${S.stage}${boss ? ' 👑보스' : ''} · 🍎${S.apples}`;
  },
  draw(g, c) {
    const L = S.log, boss = S.stage % 5 === 0;
    g.text(`STAGE ${S.stage}`, 260, 60, 30, boss ? '#f87171' : '#fff');
    for (let i = 0; i < 5; i++) g.rect(185 + i * 32, 92, 26, 6, i < S.stage % 5 || (S.stage % 5 === 0) ? (i === 4 ? '#f87171' : '#fde047') : '#3f3a5a');
    if (!S.clear || S.clear > 1.1) {
      c.save(); c.translate(260, 300 - (S.hitT > 0 ? 6 : 0)); c.rotate(L.a);
      for (const k of S.stuck) { c.save(); c.rotate(k); drawKnife(g, 0, 132, true); c.restore(); }
      for (const p of S.apples_on) if (!p.got) { c.save(); c.rotate(p.a); g.emoji('🍎', 0, 128, 32); c.restore(); }
      g.circle(0, 0, 110, boss ? '#7f1d1d' : '#92400e'); g.circle(0, 0, 96, boss ? '#991b1b' : '#b45309'); g.ring(0, 0, 70, boss ? '#7f1d1d' : '#92400e', 3); g.ring(0, 0, 40, boss ? '#7f1d1d' : '#92400e', 3);
      if (boss) g.emoji('👑', 0, 0, 50);
      c.restore();
    }
    for (const s of S.shards) { c.save(); c.translate(s.x, s.y); c.rotate(s.r); if (s.knife) drawKnife(g, 0, 0, true); else g.emoji(s.e, 0, 0, 30); c.restore(); }
    if (S.fly) drawKnife(g, 260, S.fly.y, true, true);
    else if (S.left > 0 && !S.fail && !S.clear) drawKnife(g, 260, 700, true, true);
    for (let i = 0; i < S.total; i++) g.emoji('🔪', 40, 780 - i * 34, i < S.left ? 26 : 18 - 0);
    for (let i = S.left; i < S.total; i++) { c.globalAlpha = 0.25; g.circle(40, 780 - i * 34, 4, '#fff'); c.globalAlpha = 1; }
    g.text('🍎 ' + S.apples, 490, 40, 22, '#fff', 'right');
  },
});
function drawKnife(g, x, y, up, big) {
  const c = g.ctx; c.save(); c.translate(x, y); if (up) c.rotate(Math.PI);
  g.rect(-6, -60, 12, 40, '#1f2937'); g.rect(-8, -24, 16, 6, '#6b7280');
  g.poly([[-7, -18], [7, -18], [5, 30], [0, 42], [-5, 30]], '#e5e7eb', '#9ca3af', 1.5);
  c.restore();
}
function next(g) {
  S.stage++;
  const boss = S.stage % 5 === 0;
  S.total = S.left = Math.min(11, 5 + Math.floor(S.stage / 2) + (boss ? 2 : 0));
  S.log = { a: 0, sp: (1.6 + S.stage * 0.12) * (Math.random() < 0.5 ? 1 : -1), t: 0 };
  S.stuck = []; S.apples_on = []; S.clear = 0;
  const pre = Math.min(4, Math.floor(S.stage / 2));
  for (let i = 0; i < pre; i++) S.stuck.push(U.rand(Math.PI * 2));
  if (Math.random() < 0.7) S.apples_on.push({ a: U.rand(Math.PI * 2) });
}
