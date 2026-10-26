let S;
const ST_COL = [
  ['빨강', '#ef4444'], ['파랑', '#3b82f6'], ['초록', '#16a34a'], ['노랑', '#eab308'],
  ['보라', '#a855f7'], ['주황', '#f97316'], ['분홍', '#ec4899'], ['검정', '#1f2937'],
];
GAME({
  title: '색깔 판단', w: 900, h: 680, bg: '#fafaf9', controls: 'none',
  help: '화면의 글자가 "무슨 색으로 칠해져 있는지" 고르세요 (글자 뜻에 속지 마세요!)\n🔄 표시가 뜨면 반대로 "글자의 뜻"을 고르세요\n클릭/터치 또는 숫자키 1~8 · 시간 안에 못 고르면 생명 -1\n레벨이 오를수록 색이 늘고, 빨라지고, 글자가 움직여요',
  init(g) {
    S = { level: 1, lives: 3, n: 0, combo: 0, maxCombo: 0, q: null, t: 0, tmax: 3, lock: 0, res: null, picked: -1, msg: '', msgT: 0, fever: 0, ok: 0, rts: [], bg: 0 };
    newQ(g);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt); S.bg = Math.max(0, S.bg - dt);
    if (S.fever > 0) S.fever -= dt;
    if (S.lock > 0) {
      S.lock -= dt;
      if (S.lock <= 0) { if (S.lives <= 0) return g.over(`레벨 ${S.level} · 정답 ${S.ok}개 · 최대 콤보 ${S.maxCombo}`); newQ(g); }
      return;
    }
    S.t -= dt;
    S.q.ph += dt;
    if (S.t <= 0) { fail(g, '⏰ 시간 초과!'); return; }
    const nb = S.q.opts.length;
    let pick = -1;
    for (let i = 0; i < nb; i++) {
      if (g.keyp('Digit' + (i + 1)) || g.keyp('Numpad' + (i + 1))) pick = i;
      const r = btnRect(i, nb);
      if (g.clickIn(r[0], r[1], r[2], r[3])) pick = i;
    }
    if (pick >= 0) choose(g, pick);
    g.info = `레벨 ${S.level} · ❤️${S.lives} · 콤보 ${S.combo}`;
  },
  draw(g, c) {
    if (S.fever > 0) { g.rect(0, 0, 900, 680, `hsla(${(g.time * 200) % 360},90%,92%,1)`); }
    if (S.bg > 0) { c.globalAlpha = S.bg * 2; g.rect(0, 0, 900, 680, S.res ? '#bbf7d0' : '#fecaca'); c.globalAlpha = 1; }
    g.text(`LEVEL ${S.level}`, 30, 34, 26, '#44403c', 'left');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '❤️' : '🖤', 800 + i * 34, 34, 28);
    g.text(`${S.ok}`, 450, 34, 30, '#44403c');
    if (S.combo >= 3) g.text(`🔥 ${S.combo} COMBO${S.fever > 0 ? ' · FEVER x2' : ''}`, 450, 70, 20, '#ea580c');
    // 규칙 표시
    const q = S.q;
    g.rrect(270, 92, 360, 48, 24, q.rev ? '#7c3aed' : '#0f766e');
    g.text(q.rev ? '🔄 글자의 "뜻"을 고르세요!' : '🎨 글자의 "색"을 고르세요', 450, 117, 21, '#fff');
    // 타이머
    const r = Math.max(0, S.t / S.tmax);
    g.rrect(150, 160, 600, 12, 6, '#e7e5e4');
    g.rrect(150, 160, Math.max(12, 600 * r), 12, 6, r < 0.3 ? '#dc2626' : '#0ea5e9');
    // 단어 카드
    g.rrect(180, 190, 540, 230, 28, q.cardBg, '#d6d3d1', 2);
    let x = 450, y = 305, rot = 0, sc = 1;
    if (q.move === 1) x += Math.sin(q.ph * 3) * 150;
    if (q.move === 2) { rot = Math.sin(q.ph * 2.5) * 0.35; sc = 1 + Math.sin(q.ph * 5) * 0.12; }
    if (q.move === 3) { x += Math.cos(q.ph * 2.2) * 120; y += Math.sin(q.ph * 4.4) * 50; }
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
    g.text(ST_COL[q.word][0], 0, 0, 110, ST_COL[q.ink][1]);
    c.restore();
    if (q.decoy >= 0) g.text(ST_COL[q.decoy][0], 450, 395, 22, ST_COL[(q.decoy + 3) % 8][1]);
    // 버튼
    const nb = q.opts.length;
    for (let i = 0; i < nb; i++) {
      const [bx, by, bw, bh] = btnRect(i, nb), ci = q.opts[i];
      let fill = q.btnColor ? ST_COL[q.btnColor[i]][1] : '#fff';
      if (S.lock > 0 && i === S.picked) fill = S.res ? '#bbf7d0' : '#fecaca';
      const hov = g.inRect(bx, by, bw, bh);
      g.rrect(bx, by + 4, bw, bh, 16, 'rgba(0,0,0,.12)');
      g.rrect(bx, by - (hov ? 3 : 0), bw, bh, 16, fill, '#a8a29e', 2);
      const tc = q.btnColor && !(S.lock > 0 && i === S.picked) ? '#fff' : q.labelInk ? ST_COL[q.labelInk[i]][1] : '#292524';
      g.text(ST_COL[ci][0], bx + bw / 2, by + bh / 2 - (hov ? 3 : 0), 30, tc);
      g.text(String(i + 1), bx + 14, by + 14 - (hov ? 3 : 0), 13, q.btnColor ? 'rgba(255,255,255,.8)' : '#a8a29e');
    }
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT * 2); g.text(S.msg, 450, 450, 30, S.res ? '#16a34a' : '#dc2626'); c.globalAlpha = 1; }
    if (S.rts.length) g.text(`평균 반응 ${(S.rts.reduce((a, b) => a + b, 0) / S.rts.length * 1000).toFixed(0)}ms`, 870, 660, 15, '#78716c', 'right', '600');
  },
});
function btnRect(i, n) {
  const per = n <= 4 ? n : Math.ceil(n / 2), row = Math.floor(i / per), col = i % per;
  const inRow = Math.min(per, n - row * per), bw = n <= 4 ? 170 : 150, bh = n <= 4 ? 110 : 80, gap = 18;
  const tot = inRow * bw + (inRow - 1) * gap;
  return [450 - tot / 2 + col * (bw + gap), (n <= 4 ? 490 : 470) + row * (bh + 16), bw, bh];
}
function newQ(g) {
  const L = S.level;
  const nc = L < 3 ? 4 : L < 5 ? 5 : L < 8 ? 6 : 8;
  const pool = U.shuffle([...Array(8).keys()]).slice(0, nc);
  const word = U.choice(pool);
  let ink = U.choice(pool);
  const congruentChance = L < 2 ? 0.3 : 0.12;
  if (Math.random() > congruentChance) while (ink === word) ink = U.choice(pool);
  const rev = L >= 3 && Math.random() < Math.min(0.4, 0.12 + L * 0.03);
  const opts = L >= 6 ? U.shuffle(pool.slice()) : pool.slice().sort((a, b) => a - b);
  const q = { word, ink, rev, opts, ph: U.rand(0, 6), move: 0, decoy: -1, btnColor: null, labelInk: null, cardBg: '#fff' };
  if (L >= 4) q.move = U.choice([0, 1, 2, L >= 7 ? 3 : 1]);
  if (L >= 5 && Math.random() < 0.4) q.labelInk = opts.map(() => U.choice(pool));
  if (L >= 7 && Math.random() < 0.3) { q.btnColor = U.shuffle(opts.slice()); q.labelInk = null; }
  if (L >= 6 && Math.random() < 0.3) q.decoy = U.choice(pool);
  if (L >= 8 && Math.random() < 0.3) q.cardBg = '#e7e5e4';
  S.q = q;
  S.tmax = Math.max(1.3, 3.4 - L * 0.2) + (rev ? 0.4 : 0);
  S.t = S.tmax; S.picked = -1; S.res = null;
}
function choose(g, i) {
  const q = S.q, want = q.rev ? q.word : q.ink, got = q.opts[i];
  S.picked = i;
  if (got === want) {
    S.res = true; S.ok++; S.n++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    const rt = S.tmax - S.t; S.rts.push(rt); if (S.rts.length > 30) S.rts.shift();
    const pts = Math.round((50 + S.t * 40) * (1 + S.level * 0.2) * (S.fever > 0 ? 2 : 1) + S.combo * 5);
    const [bx, by, bw] = btnRect(i, q.opts.length);
    g.add(pts, bx + bw / 2, by - 10);
    g.sfx.tone(500 + Math.min(S.combo, 20) * 30, 0.08, 'triangle', 0.07);
    g.burst(bx + bw / 2, by + 40, [ST_COL[want][1], '#fff'], 14, 220);
    S.msg = rt < 0.8 ? '번개처럼! ⚡' : '정답!'; S.msgT = 0.5; S.bg = 0.25;
    if (S.combo > 0 && S.combo % 15 === 0) { S.fever = 6; g.sfx.power(); g.float(450, 250, '🌈 FEVER! 점수 x2', '#db2777', 40); }
    if (S.ok % 12 === 0) { S.level++; g.later(() => { g.float(450, 300, `⬆ LEVEL ${S.level}`, '#0f766e', 46); g.sfx.win(); g.shake(4); }, 0.2); if (S.level % 3 === 0 && S.lives < 3) { S.lives++; g.later(() => g.float(450, 350, '❤️ 생명 +1', '#ef4444', 30), 0.6); } }
    S.lock = 0.25;
  } else {
    fail(g, q.rev ? `뜻은 "${ST_COL[want][0]}"!` : `색은 "${ST_COL[want][0]}"!`);
  }
}
function fail(g, m) {
  S.res = false; S.lives--; S.combo = 0; S.fever = 0;
  S.msg = m; S.msgT = 1; S.bg = 0.4;
  g.sfx.hit(); g.shake(7);
  S.lock = 0.9;
}
