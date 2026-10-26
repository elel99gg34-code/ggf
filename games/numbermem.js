let S;
const NM_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'];
GAME({
  title: '숫자 기억', w: 900, h: 700, bg: '#0f172a', controls: 'none', typing: true,
  help: '화면에 잠깐 나타나는 숫자를 외운 뒤 그대로 입력하세요\n숫자키(키패드) 또는 화면 버튼으로 입력 · Backspace 지우기 · Enter 확인\n맞히면 한 자리씩 길어져요 · 기회는 3번\n🔄 레벨에선 거꾸로 입력! · 👁️ 레벨에선 숫자가 한 개씩 깜빡여요',
  init(g) {
    S = { level: 1, len: 3, lives: 3, phase: 'ready', t: 1.2, num: '', inp: '', show: 0, mode: 'normal', res: null, best: 0, flash: 0, streak: 0, idx: 0 };
  },
  update(g, dt) {
    S.flash = Math.max(0, S.flash - dt);
    if (S.phase === 'ready') { S.t -= dt; if (S.t <= 0) newRound(g); return; }
    if (S.phase === 'show') {
      S.t -= dt;
      if (S.mode === 'blink') {
        const per = S.show / S.num.length;
        const idx = Math.min(S.num.length - 1, Math.floor((S.show - S.t) / per));
        if (idx !== S.idx) { S.idx = idx; g.sfx.tone(440 + Number(S.num[idx]) * 40, 0.08, 'sine', 0.05); }
      }
      if (S.t <= 0 || ((g.pressed('a') || g.mouse.clicked) && S.show - S.t > 0.4 && S.mode !== 'blink')) { S.phase = 'input'; S.inp = ''; S.inT = 0; g.sfx.pop(); }
      return;
    }
    if (S.phase === 'result') { S.t -= dt; if (S.t <= 0) { if (S.lives <= 0) return g.over(`최고 ${S.best}자리 · 레벨 ${S.level}`); S.phase = 'ready'; S.t = 0.6; } return; }
    // input
    S.inT += dt;
    for (let d = 0; d <= 9; d++) if (g.keyp('Digit' + d) || g.keyp('Numpad' + d)) press(g, String(d));
    if (g.keyp('Backspace')) press(g, '⌫');
    if (g.keyp('Enter') || g.keyp('NumpadEnter')) press(g, '✔');
    if (g.mouse.clicked) NM_KEYS.forEach((k, i) => { const r = keyRect(i); if (g.inRect(r[0], r[1], r[2], r[3])) press(g, k); });
    g.info = `레벨 ${S.level} · ${S.len}자리 · ❤️${S.lives}`;
  },
  draw(g, c) {
    // 배경 별
    for (let i = 0; i < 40; i++) { const x = (i * 137) % 900, y = (i * 251 + g.time * 8 * (1 + i % 3)) % 700; g.circle(x, y, 1 + (i % 3) * 0.5, 'rgba(148,163,184,.35)'); }
    g.text(`LEVEL ${S.level}`, 40, 40, 26, '#e2e8f0', 'left');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '💙' : '🖤', 770 + i * 40, 40, 30);
    g.text(`최고 ${S.best}자리`, 450, 40, 20, '#94a3b8');
    const modeTxt = S.mode === 'rev' ? '🔄 거꾸로 입력!' : S.mode === 'blink' ? '👁️ 한 글자씩 깜빡임' : S.mode === 'fast' ? '⚡ 빠르게 사라짐' : '';
    if (modeTxt) { g.rrect(330, 64, 240, 38, 19, S.mode === 'rev' ? '#7c3aed' : S.mode === 'blink' ? '#0891b2' : '#d97706'); g.text(modeTxt, 450, 84, 19, '#fff'); }
    const fs = Math.min(84, 820 / Math.max(4, S.len) * 1.5);
    if (S.phase === 'ready') {
      g.text(`${S.len}자리`, 450, 260, 60, '#38bdf8');
      g.text('준비…', 450, 330, 28, '#94a3b8');
    } else if (S.phase === 'show') {
      if (S.mode === 'blink') {
        const ch = S.num[S.idx];
        const per = S.show / S.num.length, local = ((S.show - S.t) % per) / per;
        if (local < 0.75) g.text(ch, 450, 260, 160, '#f8fafc');
        g.text(`${S.idx + 1} / ${S.num.length}`, 450, 380, 22, '#64748b');
      } else {
        g.text(spaced(S.num), 450, 260, fs, '#f8fafc');
      }
      g.rrect(200, 420, 500, 10, 5, '#1e293b');
      g.rrect(200, 420, Math.max(10, 500 * S.t / S.show), 10, 5, '#38bdf8');
      if (S.mode !== 'blink') g.text('외웠으면 클릭/Space로 바로 입력', 450, 455, 16, '#64748b', 'center', '500');
    } else if (S.phase === 'input' || S.phase === 'result') {
      g.text(S.mode === 'rev' ? '거꾸로 입력하세요' : '숫자를 입력하세요', 450, 150, 24, '#94a3b8');
      g.rrect(110, 180, 680, 110, 20, '#1e293b', S.phase === 'result' ? (S.res ? '#22c55e' : '#ef4444') : '#38bdf8', 3);
      const cur = S.inp + (S.phase === 'input' && g.time % 1 < 0.5 ? '_' : '');
      g.text(spaced(cur) || ' ', 450, 236, fs, '#f8fafc');
      if (S.phase === 'result') {
        g.text(S.res ? '정답! 🎉' : '틀렸어요', 450, 320, 30, S.res ? '#4ade80' : '#f87171');
        if (!S.res) {
          const want = S.mode === 'rev' ? [...S.num].reverse().join('') : S.num;
          let s = '';
          g.text('정답: ' + spaced(want), 450, 360, 26, '#fbbf24');
          s = [...want].map((ch, i) => (S.inp[i] === ch ? '○' : '✕')).join(' ');
          g.text(s, 450, 395, 20, '#94a3b8');
        }
      }
    }
    if (S.phase === 'input') {
      NM_KEYS.forEach((k, i) => {
        const [x, y, w, h] = keyRect(i), hov = g.inRect(x, y, w, h);
        g.rrect(x, y, w, h, 14, k === '✔' ? '#16a34a' : k === '⌫' ? '#475569' : hov ? '#334155' : '#1e293b', '#475569', 2);
        g.text(k, x + w / 2, y + h / 2 + 2, 30, '#f8fafc');
      });
    }
    if (S.flash > 0) { c.globalAlpha = S.flash; g.rect(0, 0, 900, 700, S.res ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'); c.globalAlpha = 1; }
  },
});
function keyRect(i) { const col = i % 3, row = Math.floor(i / 3); return [300 + col * 104, 420 + row * 68, 94, 60]; }
function spaced(s) { return s.replace(/(\d{3})(?=\d)/g, '$1 '); }
function newRound(g) {
  let n = '';
  for (let i = 0; i < S.len; i++) { let d; do d = U.randi(0, 9); while (i > 0 && String(d) === n[i - 1] && Math.random() < 0.6); n += d; }
  S.num = n;
  const L = S.level;
  S.mode = 'normal';
  if (L >= 4 && L % 4 === 0) S.mode = 'rev';
  else if (L >= 6 && L % 5 === 1) S.mode = 'blink';
  else if (L >= 9 && L % 3 === 0) S.mode = 'fast';
  S.show = S.mode === 'blink' ? S.len * 0.75 : (1 + S.len * 0.55) * (S.mode === 'fast' ? 0.55 : 1);
  S.t = S.show; S.idx = 0;
  S.phase = 'show';
  g.sfx.tone(660, 0.1, 'sine', 0.06);
}
function press(g, k) {
  if (S.phase !== 'input') return;
  if (k === '⌫') { S.inp = S.inp.slice(0, -1); g.sfx.click(); return; }
  if (k === '✔') { if (S.inp.length) judge(g); return; }
  if (S.inp.length >= S.len) return;
  S.inp += k; g.sfx.tone(500 + Number(k) * 30, 0.04, 'triangle', 0.05);
  if (S.inp.length === S.len) judge(g);
}
function judge(g) {
  const want = S.mode === 'rev' ? [...S.num].reverse().join('') : S.num;
  S.res = S.inp === want;
  S.phase = 'result'; S.flash = 0.5;
  if (S.res) {
    S.streak++;
    S.best = Math.max(S.best, S.len);
    const pts = Math.round(S.len * S.len * 10 * (S.mode === 'normal' ? 1 : 1.5) + Math.max(0, 8 - S.inT) * 10);
    g.add(pts, 450, 330);
    g.sfx.coin(); g.later(() => g.sfx.tone(990, 0.1, 'sine', 0.07), 0.1);
    g.burst(450, 236, ['#38bdf8', '#a78bfa', '#fbbf24', '#fff'], 40, 350, 1);
    S.level++; S.len++;
    if (S.len >= 12 && S.level % 5 === 0) g.float(450, 120, '🧠 기억력 천재!', '#fbbf24', 34);
    S.t = 1.1;
  } else {
    S.streak = 0; S.lives--;
    g.sfx.hit(); g.shake(8);
    S.t = 2.6;
  }
}
