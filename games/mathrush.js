let S;
const MR_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '−'];
GAME({
  title: '암산 러시', w: 960, h: 680, bg: '#0c1220', controls: 'none',
  help: '문제를 보고 답을 입력하세요 (키보드 숫자 / 화면 키패드)\n자릿수를 다 입력하면 자동 채점! 맞히면 시간 충전, 틀리면 시간 감소\n시간 바는 점점 빨리 줄어들어요 · 연속 정답 10개면 🔥피버(점수 2배)\n레벨이 오를수록 곱셈·나눗셈·괄호·제곱 등 어려운 문제 등장\nBackspace 지우기 · - 키 음수 입력',
  init(g) {
    S = { lv: 1, solved: 0, time: 12, maxTime: 12, input: '', q: null, combo: 0, best: 0, fever: 0, feverT: 0, flash: 0, flashOk: false, hist: [], wrong: 0, shakeQ: 0, start: 3 };
    newQ();
    g.score = 0;
  },
  update(g, dt) {
    S.flash = Math.max(0, S.flash - dt);
    S.shakeQ = Math.max(0, S.shakeQ - dt);
    if (S.start > 0) { const p = Math.ceil(S.start); S.start -= dt; if (Math.ceil(S.start) !== p && S.start > 0) g.sfx.beep(600, 0.08); if (S.start <= 0) g.sfx.beep(1000, 0.15); return; }
    if (S.feverT > 0) { S.feverT -= dt; if (S.feverT <= 0) S.fever = 0; }
    const drain = 1 + (S.lv - 1) * 0.12;
    S.time -= dt * drain * (S.feverT > 0 ? 0.5 : 1);
    if (S.time <= 0) { S.time = 0; return g.over(`레벨 ${S.lv} · ${S.solved}문제 정답 · 최고 콤보 ${S.best}`); }
    // 입력
    for (let d = 0; d <= 9; d++) if (g.keyp('Digit' + d) || g.keyp('Numpad' + d)) typeKey(g, String(d));
    if (g.keyp('Backspace')) typeKey(g, '⌫');
    if (g.keyp('Minus') || g.keyp('NumpadSubtract')) typeKey(g, '−');
    if (g.mouse.clicked) MR_KEYS.forEach((k, i) => { const r = keyRect(i); if (g.inRect(r.x, r.y, r.w, r.h)) typeKey(g, k); });
    if (g.keyp('Enter') || g.keyp('NumpadEnter') || g.clickIn(640, 600, 296, 60)) submit(g, true);
    g.info = `레벨 ${S.lv} · 정답 ${S.solved} · 콤보 ${S.combo}`;
  },
  draw(g, c) {
    const fever = S.feverT > 0;
    if (fever) { c.globalAlpha = 0.18 + Math.sin(g.time * 10) * 0.06; g.rect(0, 0, 960, 680, '#f97316'); c.globalAlpha = 1; }
    g.text('🧮 암산 러시', 30, 36, 26, '#e2e8f0', 'left');
    g.text(`LEVEL ${S.lv}`, 600, 36, 24, '#38bdf8', 'right');
    // 타임바
    const tr = S.time / S.maxTime;
    g.rrect(30, 64, 570, 22, 11, '#1e293b');
    g.rrect(30, 64, Math.max(22, 570 * tr), 22, 11, tr < 0.25 ? (g.time % 0.3 < 0.15 ? '#ef4444' : '#f87171') : fever ? '#fb923c' : '#22d3ee');
    g.text(`${S.time.toFixed(1)}초`, 315, 76, 13, '#0f172a');
    // 문제 카드
    const sx = S.shakeQ > 0 ? Math.sin(g.time * 80) * 10 * S.shakeQ : 0;
    g.rrect(30 + sx, 110, 570, 230, 22, '#111827', S.flash > 0 ? (S.flashOk ? '#22c55e' : '#ef4444') : '#334155', 4);
    if (S.start > 0) g.text(String(Math.ceil(S.start)), 315, 225, 100, '#fde047');
    else {
      g.text(S.q.text, 315 + sx, 190, S.q.text.length > 14 ? 44 : 60, '#f8fafc');
      g.text('= ' + (S.input || '?'), 315 + sx, 280, 52, S.input ? '#fde047' : '#475569');
      g.text(S.q.kind, 50, 130, 13, '#64748b', 'left');
    }
    // 콤보 / 피버
    g.rrect(30, 360, 570, 50, 14, '#111827');
    for (let k = 0; k < 10; k++) g.circle(60 + k * 30, 385, 10, k < S.combo % 10 || fever ? '#fb923c' : '#334155');
    g.text(fever ? `🔥 피버! 점수 2배 ${S.feverT.toFixed(1)}초` : `콤보 ${S.combo}`, 580, 385, 18, fever ? '#fdba74' : '#cbd5e1', 'right');
    // 최근 기록
    g.text('최근 문제', 40, 440, 15, '#94a3b8', 'left');
    S.hist.slice(-6).reverse().forEach((h, i) => {
      g.text(`${h.ok ? '✅' : '❌'} ${h.text} = ${h.ans}${h.ok ? '' : `  (입력 ${h.inp})`}`, 40, 470 + i * 30, 17, h.ok ? '#86efac' : '#fca5a5', 'left', '500');
    });
    // 키패드
    MR_KEYS.forEach((k, i) => { const r = keyRect(i); g.button(r.x, r.y, r.w, r.h, k, k === '⌫' ? '#7f1d1d' : k === '−' ? '#334155' : '#1e3a8a', 30); });
    g.button(640, 600, 296, 60, '확인 (Enter)', '#15803d', 22);
    g.text('레벨업까지', 790, 40, 14, '#94a3b8');
    g.rrect(670, 56, 240, 14, 7, '#1e293b');
    g.rrect(670, 56, 240 * ((S.solved % 8) / 8), 14, 7, '#38bdf8');
  },
});
function keyRect(i) { return { x: 640 + (i % 3) * 100, y: 110 + Math.floor(i / 3) * 120, w: 96, h: 110 }; }
const MR_r = (a, b) => U.randi(a, b);
function newQ() {
  const lv = S.lv, kinds = [];
  kinds.push('add', 'sub');
  if (lv >= 2) kinds.push('mul');
  if (lv >= 3) kinds.push('div', 'add2');
  if (lv >= 4) kinds.push('mix', 'mul');
  if (lv >= 5) kinds.push('sq', 'neg');
  if (lv >= 6) kinds.push('paren', 'pct', 'mul2');
  if (lv >= 8) kinds.push('big', 'mix');
  const k = U.choice(kinds), s = Math.min(lv, 10);
  let a, b, c, text, ans, kind;
  switch (k) {
    case 'add': a = MR_r(2, 9 + s * 8); b = MR_r(2, 9 + s * 8); text = `${a} + ${b}`; ans = a + b; kind = '덧셈'; break;
    case 'sub': a = MR_r(5, 12 + s * 9); b = MR_r(1, a); text = `${a} − ${b}`; ans = a - b; kind = '뺄셈'; break;
    case 'mul': a = MR_r(2, 5 + s); b = MR_r(2, 9); text = `${a} × ${b}`; ans = a * b; kind = '곱셈'; break;
    case 'div': b = MR_r(2, 9); ans = MR_r(2, 4 + s); a = ans * b; text = `${a} ÷ ${b}`; kind = '나눗셈'; break;
    case 'add2': a = MR_r(5, 40); b = MR_r(5, 40); c = MR_r(5, 40); text = `${a} + ${b} + ${c}`; ans = a + b + c; kind = '세 수 덧셈'; break;
    case 'mix': a = MR_r(2, 9); b = MR_r(2, 9); c = MR_r(1, 30); text = `${a} × ${b} + ${c}`; ans = a * b + c; kind = '혼합 계산'; break;
    case 'sq': a = MR_r(2, 9 + Math.floor(s / 2)); text = `${a}²`; ans = a * a; kind = '제곱'; break;
    case 'neg': a = MR_r(1, 20); b = MR_r(a + 1, a + 30); text = `${a} − ${b}`; ans = a - b; kind = '음수 (−키)'; break;
    case 'paren': a = MR_r(2, 15); b = MR_r(2, 15); c = MR_r(2, 6); text = `(${a} + ${b}) × ${c}`; ans = (a + b) * c; kind = '괄호'; break;
    case 'pct': a = U.choice([10, 20, 25, 50, 30, 40]); b = U.choice([20, 40, 60, 80, 120, 200, 300, 500]); text = `${b}의 ${a}%`; ans = (a * b) / 100; kind = '퍼센트'; if (ans % 1) { text = `${b}의 50%`; ans = b / 2; } break;
    case 'mul2': a = MR_r(11, 25); b = MR_r(3, 9); text = `${a} × ${b}`; ans = a * b; kind = '두 자리 곱셈'; break;
    case 'big': a = MR_r(100, 999); b = MR_r(100, 999); text = `${a} + ${b}`; ans = a + b; kind = '큰 수 덧셈'; break;
  }
  S.q = { text, ans, kind, t0: 0 };
  S.input = '';
  S.qTime = 0;
}
function typeKey(g, k) {
  if (S.start > 0) return;
  if (k === '⌫') { S.input = S.input.slice(0, -1); g.sfx.click(); return; }
  if (k === '−') { S.input = S.input.startsWith('-') ? S.input.slice(1) : '-' + S.input; g.sfx.click(); if (S.input === String(S.q.ans)) submit(g); return; }
  if (S.input.replace('-', '').length >= 6) return;
  S.input += k;
  g.sfx.tone(500 + S.input.length * 60, 0.03, 'square', 0.04);
  const want = String(S.q.ans);
  if (S.input === want) submit(g);
  else if (S.input.length >= want.length && !want.startsWith(S.input)) submit(g);
}
function submit(g, manual) {
  if (!S.input || S.input === '-') return;
  const ok = Number(S.input) === S.q.ans;
  S.hist.push({ text: S.q.text, ans: S.q.ans, inp: S.input, ok });
  if (S.hist.length > 20) S.hist.shift();
  S.flash = 0.35; S.flashOk = ok;
  if (ok) {
    S.solved++; S.combo++; S.best = Math.max(S.best, S.combo);
    const mult = S.feverT > 0 ? 2 : 1;
    const pts = (10 + S.lv * 5 + Math.min(S.combo, 20) * 2) * mult;
    g.add(pts, 315, 150);
    S.time = Math.min(S.maxTime, S.time + 2.2 + Math.min(1.5, S.lv * 0.1));
    g.sfx.tone(700 + Math.min(S.combo, 15) * 40, 0.08, 'triangle', 0.09);
    g.burst(315, 280, ['#4ade80', '#fde047'], 12, 200, 0.5, 4);
    if (S.combo % 10 === 0) { S.feverT = 8; S.fever = 1; g.sfx.power(); g.float(315, 230, '🔥 FEVER!', '#fb923c', 50); g.shake(6, 0.3); }
    if (S.solved % 8 === 0) { S.lv++; g.float(315, 110, `LEVEL ${S.lv}!`, '#38bdf8', 40); g.sfx.win(); g.burst(480, 340, ['#38bdf8', '#a78bfa', '#fff'], 50, 400, 1, 5); }
  } else {
    S.combo = 0; S.feverT = 0;
    S.time -= 2.5;
    S.shakeQ = 0.4;
    g.sfx.hit(); g.shake(5, 0.2);
  }
  newQ();
}
