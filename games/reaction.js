let S;
const RX_TESTS = [
  { n: '신호 반응', e: '🚦', d: '빨강 → 초록으로 바뀌는 순간 클릭(또는 Space)!\n5회 평균 반응시간 측정 · 미리 누르면 실격 후 재시도', unit: 'ms', lower: true, grades: [200, 250, 300, 380] },
  { n: '타겟 에임', e: '🎯', d: '나타나는 과녁 20개를 최대한 빨리 클릭!\n과녁은 점점 작아져요 · 빗나가면 +100ms', unit: 'ms', lower: true, grades: [450, 550, 680, 850] },
  { n: '선택 반응', e: '🎨', d: '가운데 나타나는 색과 같은 버튼을 누르세요\n키보드 1~4 또는 클릭 · 12회 · 틀리면 +400ms', unit: 'ms', lower: true, grades: [420, 520, 650, 800] },
  { n: '타이밍', e: '⏱️', d: '좌우로 움직이는 바늘을 가운데에서 멈추세요!\n클릭/Space · 6회 · 점점 빨라져요', unit: '%', lower: false, grades: [92, 84, 74, 60] },
  { n: '연타', e: '👆', d: '5초 동안 최대한 많이 클릭(또는 Space)!\n초당 클릭 수(CPS) 측정', unit: 'CPS', lower: false, grades: [9, 7.5, 6, 4.5] },
];
const RX_GR = ['S', 'A', 'B', 'C', 'D'], RX_GRC = ['#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#94a3b8'];
const RX_CH = [['빨강', '#ef4444'], ['파랑', '#3b82f6'], ['초록', '#22c55e'], ['노랑', '#eab308']];
GAME({
  title: '반응속도 테스트', w: 900, h: 680, bg: '#0b1220', controls: 'ab', aLabel: '반응!', bLabel: '메뉴',
  help: '5가지 테스트: 🚦신호 반응 · 🎯타겟 에임 · 🎨선택 반응 · ⏱️타이밍 · 👆연타\n메뉴에서 하나를 고르거나 "전체 도전"으로 5종 연속 측정\n클릭/터치 또는 Space로 반응 · 숫자키 1~5로 테스트 선택, 6 = 전체 도전\n등급 S~D · 최고 기록은 저장돼요',
  init(g) {
    S = { phase: 'menu', test: -1, chain: false, chainRes: [], T: null, rec: g.load('rec', {}), last: null, t: 0, flash: 0, done: 0 };
  },
  update(g, dt) {
    S.t += dt; S.flash = Math.max(0, S.flash - dt);
    const tap = g.mouse.clicked || g.pressed('a');
    if (S.phase === 'menu') {
      for (let i = 0; i < 5; i++) if (g.keyp('Digit' + (i + 1)) || g.clickIn(...menuRect(i))) { S.chain = false; startTest(g, i); return; }
      if (g.keyp('Digit6') || g.clickIn(300, 560, 300, 64)) { S.chain = true; S.chainRes = []; startTest(g, 0); return; }
      if (g.clickIn(700, 610, 170, 48)) g.over(`누적 점수로 종료`);
      return;
    }
    if (S.phase === 'result') {
      S.wait -= dt;
      if (S.wait <= 0 && (tap || S.chain)) {
        if (S.chain) {
          if (S.test < 4) startTest(g, S.test + 1);
          else {
            const pts = S.chainRes.reduce((a, r) => a + r.pts, 0);
            const gs = S.chainRes.map((r) => RX_GR[r.grade]).join('');
            return g.win(`전체 도전 완료! 등급 ${gs} · ${pts}점`);
          }
        } else S.phase = 'menu';
      }
      return;
    }
    if (S.phase === 'intro') {
      if (S.t > 0.4 && tap) { S.phase = 'run'; S.t = 0; prep(g); }
      return;
    }
    if (g.pressed('b')) { S.phase = 'menu'; return; }
    run(g, dt, tap);
  },
  draw(g, c) {
    if (S.phase === 'menu') return drawMenu(g, c);
    const td = RX_TESTS[S.test];
    g.text(`${td.e} ${td.n}${S.chain ? `  (${S.test + 1}/5)` : ''}`, 30, 34, 24, '#e2e8f0', 'left');
    if (S.phase === 'intro') {
      g.emoji(td.e, 450, 220, 110);
      td.d.split('\n').forEach((l, i) => g.text(l, 450, 340 + i * 34, 21, '#cbd5e1', 'center', '500'));
      g.text(g.time % 1 < 0.6 ? '클릭하면 시작' : '', 450, 470, 26, '#fbbf24');
      return;
    }
    if (S.phase === 'result') {
      const r = S.last;
      g.text('결과', 450, 150, 28, '#94a3b8');
      g.text(`${r.val}${td.unit}`, 450, 240, 80, '#f8fafc');
      g.circle(450, 370, 60, RX_GRC[r.grade]); g.text(RX_GR[r.grade], 450, 372, 70, '#0b1220');
      g.text(`+${r.pts}점`, 450, 465, 28, '#fbbf24');
      if (r.newRec) g.text('🎉 최고 기록!', 450, 510, 26, '#4ade80');
      g.text(r.detail || '', 450, 550, 18, '#94a3b8', 'center', '500');
      if (S.wait <= 0 && !S.chain) g.text('클릭해서 메뉴로', 450, 610, 20, '#64748b');
      return;
    }
    drawRun(g, c, td);
  },
});
function menuRect(i) { const col = i % 3, row = Math.floor(i / 3); const w = 250, x = row === 0 ? 50 + col * 275 : 187 + col * 275; return [x, 120 + row * 210, w, 190]; }
function drawMenu(g, c) {
  g.text('⚡ 반응속도 테스트', 450, 50, 36, '#fbbf24');
  g.text('측정할 테스트를 고르세요 (1~5)', 450, 92, 18, '#94a3b8', 'center', '500');
  RX_TESTS.forEach((t, i) => {
    const [x, y, w, h] = menuRect(i), hov = g.inRect(x, y, w, h), r = S.rec[i];
    g.rrect(x, y, w, h, 20, hov ? '#1e3a5f' : '#132036', hov ? '#fbbf24' : '#334155', 2);
    g.emoji(t.e, x + w / 2, y + 55, 56);
    g.text(`${i + 1}. ${t.n}`, x + w / 2, y + 110, 22, '#f1f5f9');
    if (r) { g.text(`최고 ${r.val}${t.unit}`, x + w / 2 - 20, y + 150, 18, '#94a3b8', 'center', '600'); g.circle(x + w - 40, y + 150, 16, RX_GRC[r.grade]); g.text(RX_GR[r.grade], x + w - 40, y + 151, 18, '#0b1220'); }
    else g.text('기록 없음', x + w / 2, y + 150, 17, '#475569', 'center', '600');
  });
  g.button(300, 560, 300, 64, '🏆 전체 도전 (6)', '#b45309', 24);
  g.button(700, 610, 170, 48, '종료하기', '#334155', 18);
}
function startTest(g, i) { S.test = i; S.phase = 'intro'; S.t = 0; g.sfx.click(); }
function prep(g) {
  const i = S.test;
  if (i === 0) S.T = { trial: 0, times: [], state: 'wait', w: U.rand(1.5, 4), early: 0 };
  if (i === 1) S.T = { n: 0, miss: 0, t: 0, tg: null };
  if (i === 2) S.T = { n: 0, times: [], wrong: 0, state: 'wait', w: U.rand(0.6, 1.5), col: 0 };
  if (i === 3) S.T = { n: 0, acc: [], pos: 0, dir: 1, sp: 1.2, stop: 0 };
  if (i === 4) S.T = { n: 0, t: 5, started: false, rip: [] };
  if (i === 1) newTarget();
}
function newTarget() { const T = S.T, r = Math.max(14, 46 - T.n * 1.6); T.tg = { x: U.rand(80 + r, 820 - r), y: U.rand(110 + r, 640 - r), r, t: 0 }; }
function run(g, dt, tap) {
  const T = S.T, i = S.test;
  if (i === 0) {
    if (T.state === 'wait') {
      T.w -= dt;
      if (tap) { T.state = 'early'; T.w = 1.2; T.early++; g.sfx.hit(); g.shake(5); }
      else if (T.w <= 0) { T.state = 'go'; T.go = performance.now(); g.sfx.beep(1000, 0.05); }
    } else if (T.state === 'go') {
      if (tap) { const ms = Math.round(performance.now() - T.go); T.times.push(ms); T.state = 'show'; T.w = 1.1; T.lastMs = ms; g.sfx.coin(); g.burst(450, 380, '#4ade80', 20, 300); }
    } else { T.w -= dt; if (T.w <= 0) { if (T.state === 'show') T.trial++; if (T.trial >= 5) return finishTest(g, Math.round(avg(T.times)), `기록: ${T.times.join(', ')}ms · 실격 ${T.early}회`); T.state = 'wait'; T.w = U.rand(1.5, 4); } }
  } else if (i === 1) {
    T.t += dt; T.tg.t += dt;
    if (g.mouse.clicked) {
      if (U.dist(g.mouse.x, g.mouse.y, T.tg.x, T.tg.y) <= T.tg.r) {
        g.sfx.tone(600 + T.n * 20, 0.05, 'square', 0.04); g.burst(T.tg.x, T.tg.y, ['#f87171', '#fff'], 14, 260);
        T.n++; if (T.n >= 20) return finishTest(g, Math.round((T.t * 1000 + T.miss * 100) / 20), `총 ${T.t.toFixed(2)}초 · 빗나감 ${T.miss}회`);
        newTarget();
      } else { T.miss++; g.sfx.hit(); }
    }
  } else if (i === 2) {
    if (T.state === 'wait') { T.w -= dt; if (T.w <= 0) { T.state = 'go'; T.col = U.randi(0, 3); T.go = performance.now(); } }
    else if (T.state === 'go') {
      let p = -1;
      for (let k = 0; k < 4; k++) if (g.keyp('Digit' + (k + 1)) || g.clickIn(...chRect(k))) p = k;
      if (p >= 0) {
        const ms = performance.now() - T.go;
        if (p === T.col) { T.times.push(ms); g.sfx.coin(); T.fb = 1; } else { T.times.push(ms + 400); T.wrong++; g.sfx.hit(); g.shake(4); T.fb = 0; }
        T.n++; T.state = 'fb'; T.w = 0.35;
        if (T.n >= 12) return finishTest(g, Math.round(avg(T.times)), `오답 ${T.wrong}회 (벌점 포함)`);
      }
    } else { T.w -= dt; if (T.w <= 0) { T.state = 'wait'; T.w = U.rand(0.4, 1.4); } }
  } else if (i === 3) {
    if (T.stop > 0) { T.stop -= dt; if (T.stop <= 0) { T.n++; if (T.n >= 6) return finishTest(g, Math.round(avg(T.acc)), `정확도: ${T.acc.join(', ')}%`); T.sp = 1.2 + T.n * 0.35; T.pos = U.rand(-1, 1); } return; }
    T.pos += T.dir * T.sp * dt * 2;
    if (T.pos > 1) { T.pos = 1; T.dir = -1; } if (T.pos < -1) { T.pos = -1; T.dir = 1; }
    if (tap) { const a = Math.round((1 - Math.abs(T.pos)) * 100); T.acc.push(a); T.stop = 0.9; T.lastA = a; a >= 90 ? g.sfx.coin() : g.sfx.drop(); if (a >= 95) g.burst(450 + T.pos * 380, 380, '#facc15', 24, 300); }
  } else if (i === 4) {
    if (tap) { if (!T.started) T.started = true; T.n++; g.sfx.tone(300 + (T.n % 12) * 40, 0.03, 'square', 0.03); T.rip.push({ x: g.mouse.clicked ? g.mouse.x : 450, y: g.mouse.clicked ? g.mouse.y : 400, t: 0.4 }); g.shake(1.5); }
    for (const r of T.rip) r.t -= dt; T.rip = T.rip.filter((r) => r.t > 0);
    if (T.started) { T.t -= dt; if (T.t <= 0) return finishTest(g, Math.round(T.n / 5 * 10) / 10, `총 ${T.n}회 클릭`); }
  }
}
function chRect(k) { return [105 + k * 180, 520, 150, 100]; }
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function finishTest(g, val, detail) {
  const td = RX_TESTS[S.test];
  let grade = 4;
  for (let k = 0; k < 4; k++) if (td.lower ? val <= td.grades[k] : val >= td.grades[k]) { grade = k; break; }
  const pts = [1000, 700, 450, 250, 100][grade] + (td.lower ? Math.max(0, Math.round((td.grades[3] - val) * 0.5)) : Math.round(val * (td.unit === '%' ? 3 : 30)));
  g.add(pts);
  const prev = S.rec[S.test];
  const newRec = !prev || (td.lower ? val < prev.val : val > prev.val);
  if (newRec) { S.rec[S.test] = { val, grade }; g.save('rec', S.rec); }
  S.last = { val, grade, pts, newRec, detail };
  if (S.chain) S.chainRes.push({ grade, pts });
  S.phase = 'result'; S.wait = S.chain ? 2.6 : 0.8;
  grade <= 1 ? g.sfx.win() : g.sfx.power();
  g.burst(450, 370, [RX_GRC[grade], '#fff'], 50, 380, 1.1, 4);
}
function drawRun(g, c, td) {
  const T = S.T, i = S.test;
  if (i === 0) {
    const col = T.state === 'go' ? '#16a34a' : T.state === 'early' ? '#7c3aed' : T.state === 'show' ? '#1d4ed8' : '#b91c1c';
    g.rrect(60, 80, 780, 560, 28, col);
    const msg = T.state === 'go' ? '지금 클릭!' : T.state === 'early' ? '너무 빨라요! 다시' : T.state === 'show' ? `${T.lastMs} ms` : '기다리세요…';
    g.emoji(T.state === 'go' ? '🟢' : T.state === 'early' ? '😵' : T.state === 'show' ? '⚡' : '🔴', 450, 270, 100);
    g.text(msg, 450, 400, 54, '#fff');
    g.text(`${Math.min(T.trial + 1, 5)} / 5`, 450, 600, 22, 'rgba(255,255,255,.7)');
  } else if (i === 1) {
    g.text(`${T.n} / 20`, 450, 34, 22, '#f8fafc');
    g.text(`${T.t.toFixed(2)}초`, 870, 34, 22, '#fbbf24', 'right');
    const tg = T.tg, pop = Math.min(1, tg.t * 8);
    for (let k = 3; k >= 0; k--) g.circle(tg.x, tg.y, tg.r * pop * (k + 1) / 4, k % 2 ? '#fff' : '#ef4444');
  } else if (i === 2) {
    g.text(`${T.n} / 12`, 450, 34, 22, '#f8fafc');
    if (T.state === 'go') { g.circle(450, 280, 120, RX_CH[T.col][1]); }
    else if (T.state === 'fb') g.emoji(T.fb ? '⭕' : '❌', 450, 280, 140);
    else { g.ring(450, 280, 120, '#334155', 6); g.text('준비…', 450, 280, 30, '#64748b'); }
    for (let k = 0; k < 4; k++) { const [x, y, w, h] = chRect(k); g.rrect(x, y, w, h, 18, RX_CH[k][1]); g.text(`${k + 1}. ${RX_CH[k][0]}`, x + w / 2, y + h / 2, 24, '#fff'); }
  } else if (i === 3) {
    g.text(`${Math.min(T.n + 1, 6)} / 6`, 450, 34, 22, '#f8fafc');
    g.rrect(70, 340, 760, 80, 40, '#1e293b');
    g.rrect(430, 340, 40, 80, 8, 'rgba(250,204,21,.35)');
    g.rrect(445, 340, 10, 80, 4, '#facc15');
    const x = 450 + T.pos * 380;
    g.poly([[x, 330], [x - 14, 300], [x + 14, 300]], '#f8fafc');
    g.rect(x - 3, 330, 6, 100, '#f8fafc');
    if (T.stop > 0) g.text(`${T.lastA}%`, 450, 230, 64, T.lastA >= 90 ? '#4ade80' : T.lastA >= 70 ? '#fbbf24' : '#f87171');
    T.acc.forEach((a, k) => g.text(`${a}%`, 300 + k * 60, 500, 20, '#94a3b8'));
  } else if (i === 4) {
    g.text(T.started ? `${Math.max(0, T.t).toFixed(1)}초` : '클릭하면 시작!', 450, 120, 40, '#fbbf24');
    const s = 1 + Math.min(0.15, T.rip.length * 0.02);
    g.circle(450, 380, 150 * s, '#2563eb'); g.circle(450, 380, 130 * s, '#3b82f6');
    g.text(String(T.n), 450, 382, 90, '#fff');
    for (const r of T.rip) g.ring(r.x, r.y, (0.4 - r.t) * 150, `rgba(250,204,21,${r.t * 2.5})`, 3);
    if (T.started) g.text(`${(T.n / Math.max(0.1, 5 - T.t)).toFixed(1)} CPS`, 450, 600, 24, '#94a3b8');
  }
}
