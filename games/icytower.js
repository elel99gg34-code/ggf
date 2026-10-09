let S;
GAME({
  title: '아이시 타워', w: 600, h: 800, bg: '#1e293b', controls: 'lr+ab',
  help: '←→ 달리기 · Space/↑ 점프 (빨리 달릴수록 높이 점프!)\n한 번에 2층 이상 뛰어오르면 콤보 시작 · 콤보가 끊기기 전에 계속 연결\n시간이 지나면 화면이 스스로 올라가기 시작해요\n점수 = 층수 × 10 + 콤보 보너스',
  init(g) { S = { x: 300, y: 740, vx: 0, vy: 0, cam: 0, plats: [], floor: 0, maxFloor: 0, combo: 0, comboFloors: 0, comboT: 0, scroll: 0, started: false, lastFloor: 0, bonus: 0, face: 1 }; for (let i = 0; i < 30; i++) addPlat(i); },
  update(g, dt) {
    const ax = (g.right - g.left) * 1600;
    if (ax) { S.vx += ax * dt; S.face = Math.sign(ax); } else S.vx *= Math.pow(0.02, dt);
    S.vx = U.clamp(S.vx, -620, 620);
    S.x += S.vx * dt;
    if (S.x < 50) { S.x = 50; S.vx = -S.vx * 0.9; } if (S.x > 550) { S.x = 550; S.vx = -S.vx * 0.9; }
    const py = S.y;
    S.vy += 2200 * dt; S.y += S.vy * dt;
    let on = null;
    if (S.vy >= 0) for (const p of S.plats) if (py <= p.y && S.y >= p.y && S.x > p.x - 10 && S.x < p.x + p.w + 10) { on = p; S.y = p.y; S.vy = 0; }
    if (on) {
      if (on.i > S.lastFloor) {
        const jumped = on.i - S.lastFloor;
        if (jumped >= 2) { S.combo++; S.comboFloors += jumped; S.comboT = 3; g.sfx.tone(400 + S.combo * 40, 0.08, 'square', 0.04); }
        else endCombo(g);
        S.lastFloor = on.i;
      } else if (on.i < S.lastFloor) { endCombo(g); S.lastFloor = on.i; }
      if ((g.pressed('a') || g.pressed('up') || g.a || g.up) && S.vy === 0) { S.vy = -(820 + Math.abs(S.vx) * 0.95); S.started = true; g.sfx.jump(); }
    }
    S.comboT -= dt; if (S.comboT <= 0 && S.combo) endCombo(g);
    if (S.lastFloor > S.maxFloor) { S.maxFloor = S.lastFloor; }
    if (S.maxFloor > 5) S.started = true;
    if (S.started) S.scroll = Math.min(260, 40 + g.time * 3 + S.maxFloor * 0.5);
    S.cam -= S.scroll * dt;
    if (S.y - S.cam < 300) S.cam = S.y - 300;
    while (S.plats[S.plats.length - 1].y > S.cam - 200) addPlat(S.plats.length);
    S.plats = S.plats.filter((p) => p.y < S.cam + 900);
    if (S.y - S.cam > 840) { endCombo(g); g.sfx.lose(); return g.over(`${S.maxFloor}층 도달`); }
    g.score = S.maxFloor * 10 + S.bonus;
    g.info = `${S.maxFloor}층` + (S.combo ? ` · 콤보 ${S.combo}` : '');
  },
  draw(g, c) {
    c.save(); c.translate(0, -S.cam);
    const y0 = S.cam;
    for (let y = Math.floor(y0 / 80) * 80; y < y0 + 900; y += 80) for (let x = 0; x < 600; x += 100) g.rect(x + ((y / 80) % 2) * 50, y, 98, 78, '#273449');
    g.rect(0, y0, 40, 800, '#475569'); g.rect(560, y0, 40, 800, '#475569');
    for (const p of S.plats) {
      const theme = Math.floor(p.i / 100) % 4, col = ['#93c5fd', '#a3e635', '#fbbf24', '#f472b6'][theme];
      g.rrect(p.x, p.y, p.w, 16, 6, col, '#0f172a', 2);
      if (p.i % 10 === 0 && p.i) { g.rect(p.x + p.w / 2 - 22, p.y + 18, 44, 18, '#0f172a'); g.text(p.i, p.x + p.w / 2, p.y + 27, 13, '#fde047'); }
    }
    c.save(); c.translate(S.x, S.y - 24); c.scale(-S.face, 1);
    if (S.vy < -900) c.rotate(g.time * 14);
    g.emoji('🧑‍🎤', 0, 0, 46); c.restore();
    c.restore();
    g.rect(0, 0, 14, g.H, '#0f172a'); g.rect(2, g.H - (S.comboT / 3) * g.H, 10, (S.comboT / 3) * g.H, '#f97316');
    if (S.combo) g.text(`콤보 ×${S.combo}`, 300, 60, 34, '#fde047');
    if (S.comboMsg > 0) { S.comboMsg -= 1 / 60; g.text(S.comboTxt, 300, 300, 40, `rgba(255,255,255,${Math.min(1, S.comboMsg)})`); }
  },
});
function endCombo(g) {
  if (S.combo >= 2) { const b = S.comboFloors * S.combo; S.bonus += b; S.comboTxt = `${['', '', 'GOOD', 'SWEET', 'GREAT', 'SUPER', 'WOW', 'AMAZING', 'EXTREME', 'FANTASTIC'][Math.min(9, S.combo)] || 'LEGENDARY'}! +${b}`; S.comboMsg = 1.6; g.sfx.win(); }
  S.combo = 0; S.comboFloors = 0;
}
function addPlat(i) {
  const y = 760 - i * 82;
  if (i === 0) { S.plats.push({ i, x: 40, y, w: 520 }); return; }
  const w = i % 50 === 0 ? 520 : Math.max(90, 220 - i * 0.25 + U.rand(-30, 30));
  S.plats.push({ i, x: i % 50 === 0 ? 40 : U.rand(45, 555 - w), y, w });
}
