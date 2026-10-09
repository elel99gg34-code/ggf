let S;
const LANES = 4, LW = 110, OX = 230, HITY = 700, KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], KL = ['D', 'F', 'J', 'K'];
const COL = ['#f472b6', '#60a5fa', '#60a5fa', '#f472b6'];
const SONGS = [{ n: '네온 드라이브', bpm: 128, root: 57 }, { n: '스타 러너', bpm: 140, root: 60 }, { n: '하이퍼 비트', bpm: 160, root: 62 }];
GAME({
  title: '리듬 4키', w: 900, h: 820, bg: '#09090b', controls: 'none', typing: true,
  help: 'D F J K 키 (또는 레인 터치)로 판정선에서 노트를 쳐요\nPERFECT · GREAT · GOOD · MISS 판정 · 콤보를 이어가세요!\n긴 노트(롱노트)는 끝까지 누르고 있기\n곡이 끝나면 정확도에 따라 등급 (S ~ D)',
  init(g) { S = { song: 0, notes: [], t: -2, combo: 0, maxCombo: 0, judge: { p: 0, gr: 0, go: 0, m: 0 }, pop: null, press: [0, 0, 0, 0], hold: [null, null, null, null], hp: 100 }; build(); },
  update(g, dt) {
    S.t += dt;
    const spb = 60 / SONGS[S.song].bpm;
    // 배경 비트
    const beat = Math.floor(S.t / spb); if (beat !== S.beat && S.t > 0 && S.t < S.len) { S.beat = beat; g.sfx.tone(beat % 4 === 0 ? 70 : 110, 0.08, 'sine', beat % 4 === 0 ? 0.12 : 0.05); if (beat % 2 === 1) g.sfx.noise(0.04, 0.03); }
    const down = [0, 1, 2, 3].map((i) => g.key(KEYS[i]) || (g.mouse.down && Math.floor((g.mouse.x - OX) / LW) === i));
    const press = [0, 1, 2, 3].map((i) => g.keyp(KEYS[i]) || (g.mouse.clicked && Math.floor((g.mouse.x - OX) / LW) === i));
    for (let i = 0; i < LANES; i++) {
      S.press[i] = down[i] ? 1 : Math.max(0, S.press[i] - dt * 6);
      if (press[i]) {
        const cand = S.notes.filter((n) => n.lane === i && !n.done && Math.abs(n.t - S.t) < 0.18).sort((a, b) => Math.abs(a.t - S.t) - Math.abs(b.t - S.t))[0];
        if (cand) { const d = Math.abs(cand.t - S.t); judge(g, d < 0.045 ? 'p' : d < 0.09 ? 'gr' : 'go', cand); if (cand.len) S.hold[i] = cand; else cand.done = true; }
      }
      const h = S.hold[i];
      if (h) { if (!down[i]) { if (S.t < h.t + h.len - 0.12) judge(g, 'm', h); h.done = true; S.hold[i] = null; } else if (S.t >= h.t + h.len) { h.done = true; S.hold[i] = null; g.add(50); } else if (g.frame % 6 === 0) { g.add(5); g.burst(OX + i * LW + LW / 2, HITY, COL[i], 2, 100, 0.3); } }
    }
    for (const n of S.notes) if (!n.done && !S.hold.includes(n) && S.t - n.t > 0.18) { n.done = true; judge(g, 'm', n); }
    if (S.hp <= 0) return g.over(`${SONGS[S.song].n} · 체력 소진`);
    if (S.t > S.len + 1.5) {
      const tot = S.notes.length, acc = (S.judge.p + S.judge.gr * 0.7 + S.judge.go * 0.4) / tot;
      const grade = acc > 0.95 ? 'S' : acc > 0.85 ? 'A' : acc > 0.7 ? 'B' : acc > 0.5 ? 'C' : 'D';
      g.add(Math.round(acc * 5000));
      S.song++;
      if (S.song >= SONGS.length) return g.win(`마지막 곡 등급 ${grade} · 최대 콤보 ${S.maxCombo}`);
      g.float(450, 300, `${SONGS[S.song - 1].n} 클리어! 등급 ${grade}`, '#fde047', 34); build(); S.t = -2.5;
    }
    g.info = `${SONGS[S.song].n} · 콤보 ${S.combo}`;
  },
  draw(g, c) {
    const spd = 650;
    g.rect(OX, 0, LW * LANES, g.H, '#18181b');
    for (let i = 0; i < LANES; i++) { if (S.press[i] > 0) { const grd = c.createLinearGradient(0, HITY, 0, HITY - 300); grd.addColorStop(0, COL[i] + '88'); grd.addColorStop(1, 'transparent'); c.fillStyle = grd; c.globalAlpha = S.press[i]; c.fillRect(OX + i * LW, HITY - 300, LW, 300); c.globalAlpha = 1; } g.line(OX + i * LW, 0, OX + i * LW, g.H, '#27272a', 2); }
    g.line(OX + LANES * LW, 0, OX + LANES * LW, g.H, '#27272a', 2);
    for (const n of S.notes) {
      if (n.done && !n.len) continue;
      const y = HITY - (n.t - S.t) * spd, x = OX + n.lane * LW;
      if (n.len) { const y2 = HITY - (n.t + n.len - S.t) * spd; if (n.done && !S.hold.includes(n)) continue; g.rrect(x + 30, Math.max(-20, y2), LW - 60, Math.min(HITY, y) - Math.max(-20, y2), 10, COL[n.lane] + '99'); }
      if (y < -30 || y > g.H + 30) continue;
      if (!S.hold.includes(n)) { g.rrect(x + 6, y - 14, LW - 12, 28, 8, COL[n.lane], '#fff', 2); }
    }
    g.rect(OX, HITY - 3, LW * LANES, 6, '#fafafa');
    for (let i = 0; i < LANES; i++) { g.rrect(OX + i * LW + 6, HITY + 30, LW - 12, 70, 12, S.press[i] > 0.5 ? COL[i] : '#27272a', '#52525b', 2); g.text(KL[i], OX + i * LW + LW / 2, HITY + 65, 28, '#fff'); }
    if (S.pop && S.pop.t > 0) { S.pop.t -= 1 / 60; g.text(S.pop.s, 450, 420, 44 + S.pop.t * 20, S.pop.c); }
    if (S.combo > 2) g.text(S.combo, 450, 340, 60, 'rgba(255,255,255,.85)');
    g.text(SONGS[S.song].n, 110, 40, 22, '#fff'); g.text(`${SONGS[S.song].bpm} BPM`, 110, 70, 14, '#a1a1aa');
    g.rect(30, 120, 160, 12, '#3f3f46'); g.rect(30, 120, 1.6 * S.hp, 12, S.hp < 30 ? '#ef4444' : '#22c55e'); g.text('HP', 30, 106, 12, '#a1a1aa', 'left');
    [['PERFECT', 'p', '#fde047'], ['GREAT', 'gr', '#4ade80'], ['GOOD', 'go', '#60a5fa'], ['MISS', 'm', '#f87171']].forEach(([n, k, col], i) => { g.text(n, 30, 180 + i * 30, 15, col, 'left'); g.text(S.judge[k], 190, 180 + i * 30, 15, '#fff', 'right'); });
    g.rect(OX, 0, LW * LANES * U.clamp(S.t / S.len, 0, 1), 4, '#a78bfa');
    if (S.t < 0) g.text(Math.ceil(-S.t), 450, 400, 90, '#fff');
  },
});
function build() {
  const sg = SONGS[S.song], spb = 60 / sg.bpm, bars = 24 + S.song * 4;
  S.notes = []; S.len = bars * 4 * spb; S.beat = -1;
  let lastLane = 0;
  for (let b = 0; b < bars * 4; b++) {
    const t = b * spb + 0.5, dens = 0.55 + S.song * 0.15 + (b > bars * 2 ? 0.1 : 0);
    if (Math.random() < dens) { let l; do { l = U.randi(0, 3); } while (l === lastLane && Math.random() < 0.6); lastLane = l; const long = Math.random() < 0.08; S.notes.push({ t, lane: l, len: long ? spb * 2 : 0 }); if (long) b += 2; }
    if (S.song > 0 && Math.random() < 0.25 + S.song * 0.1) { const l = (lastLane + 2) % 4; S.notes.push({ t: t + spb / 2, lane: l, len: 0 }); }
    if (Math.random() < 0.1 * (S.song + 1)) { S.notes.push({ t, lane: (lastLane + 1) % 4, len: 0 }); }
  }
  S.combo = 0;
}
function judge(g, k, n) {
  S.judge[k]++;
  const info = { p: ['PERFECT', '#fde047', 100], gr: ['GREAT', '#4ade80', 70], go: ['GOOD', '#60a5fa', 40], m: ['MISS', '#f87171', 0] }[k];
  S.pop = { s: info[0], c: info[1], t: 0.5 };
  if (k === 'm') { S.combo = 0; S.hp -= 8; g.sfx.hit(); }
  else { S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.hp = Math.min(100, S.hp + 1.5); g.add(Math.round(info[2] * (1 + Math.min(S.combo, 100) / 50))); const sg = SONGS[S.song], scale = [0, 3, 5, 7, 10, 12]; g.sfx.tone(440 * Math.pow(2, (sg.root + scale[(n.lane + S.combo) % scale.length] - 69) / 12), 0.12, 'square', 0.04); g.burst(OX + n.lane * LW + LW / 2, HITY, COL[n.lane], 10, 200, 0.4); }
}
