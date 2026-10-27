let S;
const SQ_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '⌫'];
const SQ_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113];
const SQ_R = (a, b) => U.randi(a, b);
// 수열 생성기: (lv, n) → { t: 항 배열, rule: 설명, name }
const SQ_GEN = {
  arith(lv, n) { const a = SQ_R(1, 30), d = SQ_R(2, 4 + lv * 2) * (lv >= 2 && Math.random() < 0.3 ? -1 : 1); return { t: seq(n, (i) => a + d * i), rule: `${d > 0 ? '+' : ''}${d}씩 일정하게 변해요 (등차수열)`, name: '등차' }; },
  geo(lv, n) { const a = SQ_R(1, 4), r = U.choice(lv >= 3 ? [2, 3, 4] : [2, 3]); return { t: seq(n, (i) => a * r ** i), rule: `×${r}씩 커져요 (등비수열)`, name: '등비' }; },
  half(lv, n) { const r = U.choice([2, 2, 3]), a = SQ_R(1, 3) * r ** (n - 1); return { t: seq(n, (i) => a / r ** i), rule: `÷${r}씩 작아져요`, name: '나눗셈' }; },
  squares(lv, n) { const k = SQ_R(1, 5); return { t: seq(n, (i) => (i + k) ** 2), rule: `제곱수예요 (${k}², ${k + 1}², ${k + 2}² …)`, name: '제곱' }; },
  tri(lv, n) { const a = SQ_R(1, 10), d0 = SQ_R(1, 4), dd = SQ_R(1, lv >= 4 ? 4 : 2); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v += d0 + dd * (i - 1)))), rule: `더하는 수가 ${d0}부터 ${dd}씩 늘어나요 (계차수열)`, name: '계차' }; },
  alt(lv, n) { const a = SQ_R(5, 30), p = SQ_R(3, 9), q = SQ_R(1, p - 1); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v += i % 2 ? p : -q))), rule: `+${p}, −${q}를 번갈아 해요`, name: '번갈아' }; },
  fib(lv, n) { const t = [SQ_R(1, 5), SQ_R(1, 6)]; while (t.length < n) t.push(t[t.length - 1] + t[t.length - 2]); return { t, rule: '앞의 두 수를 더하면 다음 수 (피보나치형)', name: '피보나치' }; },
  cubes(lv, n) { const k = SQ_R(1, 3); return { t: seq(n, (i) => (i + k) ** 3), rule: `세제곱수예요 (${k}³, ${k + 1}³ …)`, name: '세제곱' }; },
  altOps(lv, n) { const m = U.choice([2, 3]), k = SQ_R(1, 6), a = SQ_R(1, 5); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v = i % 2 ? v * m : v + k))), rule: `×${m}, +${k}를 번갈아 해요`, name: '혼합 연산' }; },
  inter(lv, n) { const a = SQ_R(1, 20), d = SQ_R(2, 6), b = SQ_R(20, 60), e = -SQ_R(1, 5); return { t: seq(n, (i) => (i % 2 ? b + e * ((i - 1) / 2) : a + d * (i / 2))), rule: `홀수 번째는 +${d}, 짝수 번째는 ${e}씩 (두 수열이 섞임)`, name: '교차' }; },
  mulAdd(lv, n) { const m = U.choice([2, 3]), k = U.choice([1, -1, 2]), a = SQ_R(1, 4); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v = v * m + k))), rule: `×${m} 한 뒤 ${k > 0 ? '+' + k : '−' + -k}`, name: '곱하고 더하기' }; },
  primes(lv, n) { const s = SQ_R(0, 12); return { t: SQ_PRIMES.slice(s, s + n), rule: '소수(1과 자기 자신으로만 나누어지는 수)예요', name: '소수' }; },
  fact(lv, n) { const t = [1]; for (let i = 1; i < n; i++) t.push(t[i - 1] * (i + 1)); return { t, rule: '×2, ×3, ×4 … 곱하는 수가 1씩 커져요 (팩토리얼)', name: '팩토리얼' }; },
  mulInc(lv, n) { const a = SQ_R(1, 3), s = SQ_R(1, 2); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v *= s + i - 1))), rule: `×${s}, ×${s + 1}, ×${s + 2} … 곱하는 수가 1씩 커져요`, name: '증가 곱셈' }; },
  diffGeo(lv, n) { const a = SQ_R(1, 10), d = SQ_R(1, 3), r = U.choice([2, 3]); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v += d * r ** (i - 1)))), rule: `더하는 수가 ${d}부터 ${r}배씩 커져요`, name: '계차 등비' }; },
  pow2(lv, n) { const k = U.choice([-1, 1]), s = SQ_R(1, 3); return { t: seq(n, (i) => 2 ** (i + s) + k), rule: `2의 거듭제곱 ${k > 0 ? '+1' : '−1'}`, name: '거듭제곱' }; },
  pronic(lv, n) { const s = SQ_R(1, 4), c = U.choice([0, 1, -1, 2]); return { t: seq(n, (i) => (i + s) * (i + s + 1) + c), rule: `n×(n+1)${c ? (c > 0 ? ' + ' + c : ' − ' + -c) : ''} 꼴이에요`, name: '곱 수열' }; },
  tribo(lv, n) { const t = [SQ_R(0, 2), SQ_R(1, 3), SQ_R(1, 4)]; while (t.length < n) t.push(t[t.length - 1] + t[t.length - 2] + t[t.length - 3]); return { t, rule: '앞의 세 수를 더하면 다음 수', name: '트리보나치' }; },
  altSign(lv, n) { const s = SQ_R(1, 3); return { t: seq(n, (i) => (i % 2 ? -1 : 1) * (i + s) ** 2), rule: '제곱수에 부호가 +, − 번갈아 붙어요', name: '부호 교대' }; },
  digSum(lv, n) { let v = SQ_R(10, 40); return { t: seq(n, (i) => (i === 0 ? v : (v += String(v).split('').reduce((a, b) => a + +b, 0)))), rule: '앞 수 + 앞 수의 각 자리 숫자 합', name: '자릿수 합' }; },
  geoNeg(lv, n) { const a = SQ_R(1, 3), r = U.choice([-2, -3]); return { t: seq(n, (i) => a * r ** i), rule: `×(${r})씩 (부호가 바뀌어요)`, name: '음의 등비' }; },
  sqDiff(lv, n) { const a = SQ_R(1, 20); let v = a; return { t: seq(n, (i) => (i === 0 ? v : (v += i * i))), rule: '더하는 수가 1, 4, 9, 16 … 제곱수예요', name: '제곱 계차' }; },
  prod(lv, n) { const t = [SQ_R(1, 3), SQ_R(2, 3)]; while (t.length < n) t.push(t[t.length - 1] * t[t.length - 2]); return { t, rule: '앞의 두 수를 곱하면 다음 수', name: '곱 피보나치' }; },
  dec(lv, n) { const d = SQ_R(3, 6 + lv * 2), a = d * (n + SQ_R(0, 6)); return { t: seq(n, (i) => a - d * i), rule: `−${d}씩 줄어들어요`, name: '감소' }; },
};
const SQ_POOL = [
  ['arith', 'geo', 'half', 'dec', 'arith'],
  ['squares', 'tri', 'alt', 'arith', 'geo'],
  ['fib', 'cubes', 'altOps', 'inter', 'mulAdd', 'tri'],
  ['primes', 'fact', 'diffGeo', 'pow2', 'pronic', 'mulInc', 'sqDiff'],
  ['tribo', 'altSign', 'digSum', 'geoNeg', 'prod', 'diffGeo', 'mulAdd'],
];
function seq(n, f) { const out = []; for (let i = 0; i < n; i++) out.push(f(i)); return out; }
GAME({
  title: '수열 맞히기', w: 960, h: 640, bg: '#0b1324', controls: 'none',
  help: '수열의 규칙을 찾아 ? 자리에 올 숫자를 입력하세요\n숫자키 / 화면 키패드 · − 키로 음수 · Backspace 지우기 · Enter 확인\nH: 힌트(이웃한 수의 차이 보기, 점수 절반)\n빨리 맞힐수록, 연속으로 맞힐수록 점수 UP · 목숨 3개\n5문제마다 레벨업 → 피보나치, 소수, 계차수열 등 어려운 규칙 등장 · 40문제 정답이면 클리어!',
  init(g) {
    S = { lv: 1, solved: 0, lives: 3, combo: 0, best: 0, input: '', q: null, t: 30, tMax: 30, fb: 0, fbOk: false, hint: false, shakeQ: 0, hist: [], appear: 0, used: {} };
    newQ();
  },
  update(g, dt) {
    S.shakeQ = Math.max(0, S.shakeQ - dt); S.appear += dt;
    g.info = `레벨 ${S.lv} · 정답 ${S.solved}/40 · 콤보 ${S.combo}`;
    if (S.fb > 0) {
      S.fb -= dt;
      if (S.fb <= 0 || (S.fb < 2 && (g.mouse.clicked || g.pressed('a')))) {
        S.fb = 0;
        if (S.lives <= 0) { g.over(`레벨 ${S.lv} · ${S.solved}문제 정답 · 최고 콤보 ${S.best}`); return; }
        if (S.solved >= 40) { g.win(`40문제 정복! 최고 콤보 ${S.best}`); return; }
        newQ();
      }
      return;
    }
    S.t -= dt;
    if (S.t <= 0) { S.t = 0; judge(g, false, true); return; }
    for (let d = 0; d <= 9; d++) if (g.keyp('Digit' + d) || g.keyp('Numpad' + d)) typeKey(g, String(d));
    if (g.keyp('Backspace')) typeKey(g, '⌫');
    if (g.keyp('Minus') || g.keyp('NumpadSubtract')) typeKey(g, '−');
    if (g.mouse.clicked) SQ_KEYS.forEach((k, i) => { const r = keyRect(i); if (g.inRect(r.x, r.y, r.w, r.h)) typeKey(g, k); });
    if ((g.keyp('KeyH') || g.clickIn(40, 560, 250, 56)) && !S.hint) { S.hint = true; g.sfx.power(); }
    if (g.keyp('Enter') || g.keyp('NumpadEnter') || g.keyp('Space') || g.clickIn(660, 560, 270, 56)) submit(g);
  },
  draw(g, c) {
    // 배경 격자
    for (let x = 0; x < 960; x += 40) g.line(x, 0, x, 640, 'rgba(56,189,248,.04)', 1);
    for (let y = 0; y < 640; y += 40) g.line(0, y, 960, y, 'rgba(56,189,248,.04)', 1);
    const q = S.q;
    g.text('🔣 수열 맞히기', 30, 34, 24, '#e0f2fe', 'left');
    g.text(`LEVEL ${S.lv}`, 600, 34, 22, '#38bdf8', 'right');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '💙' : '🖤', 650 + i * 30, 34, 22);
    g.text(`✅ ${S.solved}/40`, 930, 34, 18, '#86efac', 'right');
    // 타이머
    const tr = S.t / S.tMax;
    g.rrect(30, 60, 900, 12, 6, '#1e293b');
    g.rrect(30, 60, Math.max(12, 900 * tr), 12, 6, tr < 0.25 ? '#ef4444' : tr < 0.5 ? '#f59e0b' : '#22d3ee');
    // 수열 카드
    const sx = S.shakeQ > 0 ? Math.sin(S.shakeQ * 70) * 10 : 0;
    g.rrect(30, 90, 900, 250, 22, '#0f1b33', S.fb > 0 ? (S.fbOk ? '#22c55e' : '#ef4444') : '#1e3a5f', 3);
    g.text(`규칙 유형: ${S.hint || S.fb > 0 ? q.name : '???'}`, 54, 114, 14, '#64748b', 'left');
    const n = q.t.length, tw = Math.min(118, 840 / n - 10), gap = 10, x0 = 480 - (n * tw + (n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) {
      const a = U.clamp((S.appear - i * 0.07) * 5, 0, 1);
      if (a <= 0) continue;
      const x = x0 + i * (tw + gap) + sx, y = 160 + (1 - a) * 30, blank = i === q.blank;
      c.globalAlpha = a;
      let col = '#1e293b', st = '#334155';
      if (blank) { col = S.fb > 0 ? (S.fbOk ? '#14532d' : '#7f1d1d') : '#172554'; st = S.fb > 0 ? (S.fbOk ? '#4ade80' : '#f87171') : `rgba(250,204,21,${0.6 + Math.sin(g.time * 6) * 0.4})`; }
      g.rrect(x, y, tw, 100, 16, col, st, 3);
      const val = blank ? (S.fb > 0 ? String(q.ans) : S.input || '?') : String(q.t[i]);
      const fs = val.length > 5 ? 22 : val.length > 3 ? 28 : 36;
      g.text(val, x + tw / 2, y + 50, fs, blank ? (S.fb > 0 ? '#fff' : S.input ? '#fde047' : '#facc15') : '#f1f5f9');
      if (i < n - 1) g.text('›', x + tw + gap / 2, y + 50, 18, '#475569');
      c.globalAlpha = 1;
    }
    // 힌트: 차이
    if (S.hint || S.fb > 0) {
      for (let i = 0; i < n - 1; i++) {
        const xa = x0 + i * (tw + gap) + tw / 2, xb = xa + tw + gap, unknown = (i === q.blank || i + 1 === q.blank) && S.fb <= 0;
        c.strokeStyle = '#38bdf8'; c.lineWidth = 2; c.beginPath(); c.moveTo(xa, 266); c.quadraticCurveTo((xa + xb) / 2, 300, xb, 266); c.stroke();
        const d = q.t[i + 1] - q.t[i];
        g.text(unknown ? '?' : (d >= 0 ? '+' : '') + d, (xa + xb) / 2, 304, 15, unknown ? '#facc15' : '#7dd3fc');
      }
    }
    if (S.fb > 0) {
      g.rrect(30, 352, 600, 66, 16, S.fbOk ? '#14532d' : '#7f1d1d');
      g.text(S.fbMsg, 330, 372, 19, '#fff');
      g.text('규칙: ' + q.rule, 330, 398, 15, '#fde68a', 'center', '500');
    } else {
      g.text('? 에 들어갈 수는?', 330, 385, 22, '#cbd5e1');
    }
    // 입력창
    g.rrect(40, 430, 560, 110, 18, '#0f1b33', '#1e3a5f', 2);
    g.text('답:', 70, 485, 26, '#94a3b8', 'left');
    g.text((S.input || '') + (S.fb <= 0 && g.time % 1 < 0.5 ? '▌' : ''), 130, 485, 46, '#fde047', 'left');
    g.text(`콤보 ${S.combo}  ×${(1 + Math.min(S.combo, 10) * 0.1).toFixed(1)}`, 580, 452, 15, '#fb923c', 'right');
    // 키패드
    SQ_KEYS.forEach((k, i) => { const r = keyRect(i); g.button(r.x, r.y, r.w, r.h, k, k === '⌫' ? '#7f1d1d' : k === '−' ? '#334155' : '#1e3a8a', 26); });
    g.button(40, 560, 250, 56, S.hint ? '💡 힌트 사용함' : '💡 힌트 (H)', S.hint ? '#334155' : '#a16207', 18);
    g.text(`다음 레벨까지 ${5 - (S.solved % 5)}문제`, 445, 588, 15, '#64748b');
    g.button(660, 560, 270, 56, '확인 (Enter)', '#15803d', 20);
  },
});
function keyRect(i) { return { x: 660 + (i % 3) * 92, y: 352 + Math.floor(i / 3) * 50 - 0, w: 86, h: 44 }; }
function newQ() {
  const pool = [];
  for (let k = 0; k < Math.min(SQ_POOL.length, S.lv); k++) pool.push(...SQ_POOL[k]);
  // 최신 레벨 유형 비중 높이기
  if (S.lv <= SQ_POOL.length) pool.push(...SQ_POOL[S.lv - 1], ...SQ_POOL[S.lv - 1]);
  let q;
  for (let tries = 0; tries < 50; tries++) {
    const key = U.choice(pool), n = S.lv >= 4 ? 7 : 6;
    q = SQ_GEN[key](S.lv, n);
    if (q.t.some((v) => Math.abs(v) > 99999 || !Number.isInteger(v))) continue;
    if ((S.used[key] || 0) > 2 && tries < 20) continue;
    q.key = key;
    break;
  }
  S.used[q.key] = (S.used[q.key] || 0) + 1;
  if (Object.values(S.used).reduce((a, b) => a + b, 0) > 8) S.used = {};
  q.blank = S.lv >= 3 && Math.random() < 0.3 ? U.randi(2, q.t.length - 2) : q.t.length - 1;
  q.ans = q.t[q.blank];
  S.q = q; S.input = ''; S.hint = false; S.appear = 0;
  S.tMax = S.t = Math.max(18, 34 - S.lv * 2);
}
function typeKey(g, k) {
  if (S.fb > 0) return;
  if (k === '⌫') { S.input = S.input.slice(0, -1); g.sfx.move(); return; }
  if (k === '−') { S.input = S.input.startsWith('-') ? S.input.slice(1) : '-' + S.input; g.sfx.click(); return; }
  if (S.input.replace('-', '').length >= 6) return;
  S.input += k; g.sfx.click();
}
function submit(g) {
  if (S.fb > 0 || !S.input || S.input === '-') return;
  judge(g, +S.input === S.q.ans, false);
}
function judge(g, ok, timeout) {
  S.fb = 3.2; S.fbOk = ok;
  if (ok) {
    S.solved++; S.combo++; S.best = Math.max(S.best, S.combo);
    let pts = Math.round((100 + S.lv * 40 + S.t * 5) * (1 + Math.min(S.combo, 10) * 0.1));
    if (S.hint) pts = Math.round(pts / 2);
    g.add(pts, 480, 210);
    S.fbMsg = `정답! +${pts}${S.combo >= 3 ? `  🔥${S.combo}연속` : ''}`;
    g.sfx.coin(); g.burst(480, 210, ['#22d3ee', '#facc15', '#4ade80'], 30, 300, 0.8, 4);
    if (S.solved % 5 === 0) { S.lv++; g.later(() => { g.float(480, 300, `LEVEL UP! ${S.lv}`, '#38bdf8', 40); g.sfx.power(); }, 0.3); }
  } else {
    S.lives--; S.combo = 0; S.shakeQ = 0.5;
    S.fbMsg = timeout ? `⏰ 시간 초과! 정답은 ${S.q.ans}` : `오답! 입력 ${S.input} → 정답 ${S.q.ans}`;
    g.sfx.hit(); g.shake(8, 0.3);
  }
  S.hist.push({ ok, ans: S.q.ans });
}
