let S;
const DT = [
  { n: '청둥오리', c: '#16a34a', pts: 500, sp: 1 },
  { n: '파랑오리', c: '#2563eb', pts: 1000, sp: 1.25 },
  { n: '붉은오리', c: '#dc2626', pts: 1500, sp: 1.55 },
];
const SKY = 430, ROUNDS = 12;
GAME({
  title: '오리 사냥', w: 960, h: 600, bg: '#60a5fa', controls: 'dpad+ab', aLabel: '발사', bLabel: '',
  help: '마우스로 조준하고 클릭해서 발사!\n키보드: 방향키로 조준점 이동 · Space/Z 발사\n오리가 나올 때마다 총알 3발 · 시간이 지나면 날아가 버려요\n라운드마다 필요한 명중 수를 채워야 다음 라운드 진출\n🥇 황금오리는 보너스! 퍼펙트 라운드 시 대량 보너스',
  init(g) {
    S = { round: 0, cross: { x: 480, y: 250 }, ducks: [], shots: 3, hits: [], idx: 0, phase: 'intro', pt: 2.5, dog: { y: 520, mode: 'walk', x: 120, t: 0 },
      need: 6, flash: 0, combo: 0, clouds: [], fx: [], perfect: 0, totalHit: 0, totalShot: 0 };
    for (let i = 0; i < 5; i++) S.clouds.push({ x: U.rand(960), y: U.rand(40, 200), s: U.rand(0.6, 1.4) });
    newRound(g);
  },
  update(g, dt) {
    const C = S.cross;
    if (g.mouse.moved) { C.x = g.mouse.x; C.y = g.mouse.y; }
    C.x = U.clamp(C.x + (g.right - g.left) * 520 * dt, 0, 960); C.y = U.clamp(C.y + (g.down - g.up) * 520 * dt, 0, 600);
    S.flash -= dt;
    for (const c of S.clouds) { c.x += 12 * c.s * dt; if (c.x > 1060) c.x = -100; }
    S.pt -= dt;
    const D = S.dog; D.t += dt;
    if (S.phase === 'intro') {
      if (D.mode === 'walk') { D.x += 90 * dt; if (S.pt < 1) { D.mode = 'jump'; D.vy = -420; g.sfx.tone(500, 0.1, 'square', 0.05, 700); } }
      else if (D.mode === 'jump') { D.vy += 900 * dt; D.y += D.vy * dt; D.x += 60 * dt; if (D.y > 600) { D.mode = 'hide'; } }
      if (S.pt <= 0) { S.phase = 'fly'; release(g); }
    } else if (S.phase === 'fly') {
      const shoot = g.mouse.clicked || g.pressed('a');
      if (shoot) fire(g);
      let alive = 0;
      for (const d of S.ducks) {
        d.t += dt; d.flap += dt * 14;
        if (d.state === 'fly') {
          alive++;
          d.life -= dt;
          if (d.life <= 0) { d.state = 'away'; d.vx *= 0.3; d.vy = -360; }
          d.turn -= dt;
          if (d.turn <= 0) { d.turn = U.rand(0.6, 1.6); const a = U.rand(-Math.PI * 0.95, -Math.PI * 0.05); const sp = Math.hypot(d.vx, d.vy); d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp * U.rand(0.4, 1.2); }
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.x < 30 || d.x > 930) { d.vx *= -1; d.x = U.clamp(d.x, 30, 930); }
          if (d.y < 40 || d.y > SKY - 40) { d.vy *= -1; d.y = U.clamp(d.y, 40, SKY - 40); }
        } else if (d.state === 'hit') { alive++; d.ht -= dt; if (d.ht <= 0) { d.state = 'fall'; d.vy = 0; g.sfx.tone(900, 0.8, 'triangle', 0.05, 200); } }
        else if (d.state === 'fall') { alive++; d.vy += 1200 * dt; d.y += d.vy * dt; if (d.y > SKY + 20) { d.state = 'down'; g.sfx.drop(); } }
        else if (d.state === 'away') { alive++; d.y += d.vy * dt; d.x += d.vx * dt; if (d.y < -60) { d.state = 'gone'; S.hits[d.slot] = 0; } }
      }
      if (!alive) endWave(g);
    } else if (S.phase === 'dog') {
      if (D.mode === 'up') { D.y = Math.max(D.ty, D.y - 260 * dt); if (S.pt < 0.5) D.mode = 'down'; }
      else if (D.mode === 'down') D.y += 300 * dt;
      if (S.pt <= 0) { D.mode = 'hide'; D.y = 600; nextWave(g); }
    } else if (S.phase === 'result') {
      if (S.pt <= 0) {
        const got = S.hits.filter((h) => h === 1).length;
        if (got < S.need) return g.over(`라운드 ${S.round} · 명중 ${got}/${S.need} (필요) · 명중률 ${acc()}%`);
        if (S.round >= ROUNDS) { g.add(20000); return g.win(`${ROUNDS} 라운드 완주! 명중률 ${acc()}%`); }
        newRound(g);
      }
    }
    for (const f of S.fx) f.t -= dt;
    S.fx = S.fx.filter((f) => f.t > 0);
    g.info = `라운드 ${S.round}/${ROUNDS} · 필요 ${S.need}마리 · 명중률 ${acc()}%`;
  },
  draw(g, c) {
    const gr = c.createLinearGradient(0, 0, 0, SKY);
    gr.addColorStop(0, S.flash > 0 ? '#fff' : '#3b82f6'); gr.addColorStop(1, S.flash > 0 ? '#fef9c3' : '#93c5fd');
    c.fillStyle = gr; c.fillRect(0, 0, 960, 600);
    if (S.phase === 'fly' && S.ducks.some((d) => d.state === 'away')) { c.fillStyle = 'rgba(244,114,182,.25)'; c.fillRect(0, 0, 960, SKY); g.text('날아가버렸다!', 480, 80, 30, '#fff'); }
    for (const cl of S.clouds) { g.circle(cl.x, cl.y, 30 * cl.s, 'rgba(255,255,255,.9)'); g.circle(cl.x + 30 * cl.s, cl.y + 6, 24 * cl.s, 'rgba(255,255,255,.9)'); g.circle(cl.x - 30 * cl.s, cl.y + 8, 22 * cl.s, 'rgba(255,255,255,.9)'); }
    // 나무
    g.rect(110, 200, 34, 260, '#78350f');
    g.circle(127, 190, 80, '#15803d'); g.circle(80, 240, 55, '#166534'); g.circle(175, 235, 55, '#166534');
    // 오리 (덤불 뒤 레이어)
    for (const d of S.ducks) if (d.state !== 'gone' && d.state !== 'down') drawDuck(g, c, d);
    // 개 (덤불 뒤)
    drawDog(g, c);
    // 풀숲
    g.rect(0, SKY, 960, 600 - SKY, '#65a30d');
    for (let x = 0; x < 960; x += 40) g.poly([[x, SKY + 4], [x + 20, SKY - 26 - ((x * 7) % 20)], [x + 40, SKY + 4]], '#4d7c0f');
    g.rect(0, SKY + 40, 960, 160, '#a16207');
    g.rect(0, SKY + 40, 960, 8, '#854d0e');
    // HUD
    g.rrect(30, 510, 120, 70, 10, '#111827', '#22c55e', 2);
    g.text('탄환', 90, 528, 14, '#86efac');
    for (let i = 0; i < 3; i++) { const x = 60 + i * 30; g.rrect(x - 7, 542, 14, 28, 4, i < S.shots ? '#fbbf24' : '#374151'); if (i < S.shots) g.rect(x - 7, 542, 14, 8, '#b45309'); }
    g.rrect(170, 510, 520, 70, 10, '#111827', '#22c55e', 2);
    g.text('명중', 210, 545, 16, '#86efac');
    for (let i = 0; i < 10; i++) {
      const x = 260 + i * 42, h = S.hits[i];
      const col = h === 1 ? '#f87171' : h === 0 ? '#e5e7eb' : '#4b5563';
      if (S.phase === 'fly' && S.ducks.some((d) => d.slot === i && d.state === 'fly') && Math.floor(g.time * 4) % 2) g.emoji('🦆', x, 545, 26);
      else { g.circle(x, 545, 14, col); if (h === 1) g.emoji('🦆', x, 545, 18); }
    }
    for (let i = 0; i < S.need; i++) g.rect(250 + i * 42, 568, 20, 4, '#60a5fa');
    g.rrect(710, 510, 220, 70, 10, '#111827', '#22c55e', 2);
    g.text(`R ${S.round}`, 760, 545, 26, '#fde047');
    g.text(`${Math.round(g.score)}`, 860, 545, 22, '#fff');
    // 메시지
    if (S.phase === 'intro') { g.rrect(330, 220, 300, 90, 14, 'rgba(0,0,0,.6)'); g.text(`ROUND ${S.round}`, 480, 252, 36, '#fff'); g.text(`${S.need}마리 이상 맞혀라!`, 480, 290, 18, '#fde047'); }
    if (S.phase === 'result') { g.rrect(290, 200, 380, 110, 14, 'rgba(0,0,0,.7)'); const got = S.hits.filter((h) => h === 1).length; g.text(got >= S.need ? (got === 10 ? '🎯 퍼펙트!!' : '라운드 통과!') : '실패...', 480, 238, 36, got >= S.need ? '#4ade80' : '#f87171'); g.text(`명중 ${got}/10`, 480, 280, 22, '#fff'); }
    for (const f of S.fx) { c.globalAlpha = f.t * 3; g.ring(f.x, f.y, 26 - f.t * 40, '#fff', 3); c.globalAlpha = 1; }
    // 조준점
    const C = S.cross;
    g.ring(C.x, C.y, 22, '#fff', 3); g.ring(C.x, C.y, 22, '#ef4444', 1.5);
    g.line(C.x - 32, C.y, C.x - 10, C.y, '#fff', 2); g.line(C.x + 10, C.y, C.x + 32, C.y, '#fff', 2);
    g.line(C.x, C.y - 32, C.x, C.y - 10, '#fff', 2); g.line(C.x, C.y + 10, C.x, C.y + 32, '#fff', 2);
    g.circle(C.x, C.y, 2, '#ef4444');
  },
});
function acc() { return S.totalShot ? Math.round((S.totalHit / S.totalShot) * 100) : 100; }
function newRound(g) {
  S.round++;
  S.need = Math.min(9, 5 + Math.ceil(S.round / 2));
  S.hits = new Array(10).fill(-1); S.idx = 0;
  S.phase = 'intro'; S.pt = 2.5;
  Object.assign(S.dog, { x: 100, y: 520, mode: 'walk', t: 0 });
  g.sfx.tone(523, 0.12, 'square', 0.05); g.sfx.tone(659, 0.12, 'square', 0.05, null, 0.13); g.sfx.tone(784, 0.25, 'square', 0.05, null, 0.26);
}
function release(g) {
  S.ducks = []; S.shots = 3;
  const n = S.round >= 4 ? 2 : (S.round >= 2 && Math.random() < 0.5 ? 2 : 1);
  for (let i = 0; i < n && S.idx < 10; i++) {
    const r = Math.random(), lv = S.round;
    let ti = r < 0.15 + lv * 0.04 ? 2 : r < 0.45 + lv * 0.03 ? 1 : 0;
    const gold = Math.random() < 0.06;
    const sp = (170 + lv * 16) * DT[ti].sp * (gold ? 1.3 : 1);
    const a = U.rand(-Math.PI * 0.8, -Math.PI * 0.2);
    S.ducks.push({ x: U.rand(200, 760), y: SKY + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, flap: 0, state: 'fly', life: Math.max(3.5, 7 - lv * 0.25), turn: U.rand(0.5, 1.2), ti, gold, slot: S.idx++, ht: 0 });
  }
  g.sfx.tone(700, 0.08, 'square', 0.04, 500);
}
function fire(g) {
  if (S.shots <= 0) { g.sfx.beep(150, 0.05); return; }
  S.shots--; S.totalShot++; S.flash = 0.05;
  g.sfx.tone(160, 0.12, 'square', 0.1, 60); g.sfx.noise(0.12, 0.15);
  g.shake(3, 0.08);
  const C = S.cross;
  S.fx.push({ x: C.x, y: C.y, t: 0.3 });
  let hitAny = false;
  for (const d of S.ducks) {
    if (d.state !== 'fly') continue;
    if (Math.abs(d.x - C.x) < 34 && Math.abs(d.y - C.y) < 28) {
      hitAny = true; d.state = 'hit'; d.ht = 0.45; S.hits[d.slot] = 1; S.totalHit++;
      const T = DT[d.ti]; let pts = T.pts * (1 + Math.floor((S.round - 1) / 3));
      if (d.gold) pts *= 5;
      if (S.shots === 2) pts = Math.round(pts * 1.5);
      g.add(pts, d.x, d.y - 30);
      g.burst(d.x, d.y, d.gold ? ['#fde047', '#fff'] : [T.c, '#fff', '#a16207'], 20, 200, 0.6, 4);
      g.sfx.hit();
    }
  }
  if (hitAny) {
    const multi = S.ducks.filter((d) => d.state === 'hit' && d.ht > 0.4).length;
    if (multi >= 2) { g.add(2000, C.x, C.y - 60); g.float(C.x, C.y - 90, '더블킬!', '#f472b6', 26); }
  }
  if (S.shots === 0) for (const d of S.ducks) if (d.state === 'fly') d.life = Math.min(d.life, 0.4);
}
function endWave(g) {
  const got = S.ducks.filter((d) => d.state === 'down');
  S.phase = 'dog'; S.pt = 2;
  const D = S.dog;
  D.x = got.length ? U.clamp(got[0].x, 200, 760) : 480; D.y = SKY + 60; D.ty = SKY - 70; D.mode = 'up'; D.got = got.length; D.t = 0;
  if (got.length) g.sfx.tone(880, 0.1, 'square', 0.05, 1100); else { [0, 1, 2, 3].forEach((i) => g.sfx.tone(300 + (i % 2) * 80, 0.1, 'square', 0.05, null, i * 0.12)); }
}
function nextWave(g) {
  if (S.idx >= 10) {
    S.phase = 'result'; S.pt = 2.5;
    const got = S.hits.filter((h) => h === 1).length;
    if (got === 10) { g.add(10000 * Math.ceil(S.round / 3), 480, 330); S.perfect++; g.sfx.win(); }
    else if (got >= S.need) { g.add(got * 200, 480, 330); g.sfx.power(); }
    return;
  }
  S.phase = 'fly'; release(g);
}
function drawDuck(g, c, d) {
  c.save(); c.translate(d.x, d.y);
  const dir = d.vx >= 0 ? -1 : 1;
  if (d.state === 'hit') { g.emoji('😵', 0, -30, 22); c.scale(dir, 1); g.emoji('🦆', 0, 0, 52); }
  else if (d.state === 'fall') { c.rotate(Math.PI / 2 * -dir); c.scale(dir, -1); g.emoji('🦆', 0, 0, 52); }
  else {
    c.scale(dir, 0.85 + Math.abs(Math.sin(d.flap)) * 0.25);
    if (d.gold) { c.shadowColor = '#fde047'; c.shadowBlur = 20; }
    g.emoji('🦆', 0, 0, 52);
    c.shadowBlur = 0;
    g.circle(8, -14, 6, d.gold ? '#facc15' : DT[d.ti].c);
  }
  c.restore();
}
function drawDog(g, c) {
  const D = S.dog;
  if (D.mode === 'hide') return;
  c.save(); c.translate(D.x, D.y);
  if (D.mode === 'walk') { c.scale(-1, 1); g.emoji('🐕', 0, Math.abs(Math.sin(D.t * 10)) * -6, 70); }
  else if (D.mode === 'jump') { c.scale(-1, 1); c.rotate(-0.4); g.emoji('🐕', 0, 0, 70); }
  else {
    g.emoji('🐶', 0, 0, 80);
    if (D.got) { for (let i = 0; i < D.got; i++) g.emoji('🦆', (i - (D.got - 1) / 2) * 40, -50, 40); g.text('잡았다!', 0, -90, 18, '#fff'); }
    else { g.emoji('😂', 30, -40, 34); g.text('킥킥킥', 0, -80, 18, '#fde047'); }
  }
  c.restore();
}
