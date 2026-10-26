let S;
const BA_TESTS = [
  { k: 'calc', n: '계산', e: '🧮', d: '나온 계산의 답을 빠르게 고르세요\n15문제 · 속도와 정확도 측정' },
  { k: 'mem', n: '기억', e: '🧠', d: '8초 동안 그림 10개를 외우세요\n그다음 본 그림만 모두 골라 주세요' },
  { k: 'color', n: '색깔 판단', e: '🎨', d: '글자의 "뜻"이 아니라 "색"을 고르세요\n15문제 · 속도와 정확도 측정' },
  { k: 'order', n: '순서 터치', e: '🔢', d: '흩어진 숫자 1~16을 순서대로 빠르게 터치!\n틀리면 1초 벌점' },
  { k: 'count', n: '개수 세기', e: '👀', d: '잠깐 나타난 별의 개수를 맞히세요\n8문제 · 점점 많아져요' },
];
const BA_ITEMS = ['🍎', '🚗', '🐶', '⚽', '🎸', '🌙', '🔑', '📚', '🌵', '🍕', '✈️', '🎈', '🐟', '⏰', '🌻', '👓', '🧀', '🎁', '🚲', '🐢', '🍩', '🏠', '☂️', '🦋', '🍇', '🎩', '🔔', '🧸', '🌈', '🪁', '🍔', '🐘'];
const BA_COL = [['빨강', '#ef4444'], ['파랑', '#3b82f6'], ['초록', '#16a34a'], ['노랑', '#eab308']];
GAME({
  title: '두뇌 나이', w: 900, h: 680, bg: '#f8fafc', controls: 'none', typing: true,
  help: '5가지 미니게임(계산·기억·색깔·순서·개수)으로 두뇌 나이를 측정해요\n클릭/터치 또는 숫자키 1~4로 답하기\n빠르고 정확할수록 두뇌 나이가 젊어집니다 (최저 20세)\n각 테스트 전 설명을 읽고 Space/클릭으로 시작',
  init(g) {
    S = { ti: 0, phase: 'intro', results: [], t: 0, st: null, msg: '', msgT: 0, fx: [], bestAge: g.load('bestAge', null) };
  },
  update(g, dt) {
    S.t += dt; S.msgT = Math.max(0, S.msgT - dt);
    for (const f of S.fx) f.t -= dt; S.fx = S.fx.filter((f) => f.t > 0);
    if (S.phase === 'intro') {
      if (g.pressed('a') || g.clickIn(350, 470, 200, 64)) beginTest(g);
      return;
    }
    if (S.phase === 'between') { S.wait -= dt; if (S.wait <= 0) { S.ti++; if (S.ti >= BA_TESTS.length) finish(g); else { S.phase = 'intro'; S.t = 0; } } return; }
    if (S.phase === 'final') return;
    const k = BA_TESTS[S.ti].k, T = S.st;
    T.time += dt;
    if (k === 'calc' || k === 'color' || k === 'count') {
      if (k === 'count' && T.show > 0) { T.show -= dt; return; }
      if (T.lock > 0) { T.lock -= dt; if (T.lock <= 0) nextQ(g); return; }
      let pick = -1;
      for (let i = 0; i < 4; i++) if (g.keyp('Digit' + (i + 1)) || g.keyp('Numpad' + (i + 1)) || g.clickIn(...optRect(i))) pick = i;
      if (pick >= 0) answer(g, pick);
    } else if (k === 'mem') {
      if (T.view > 0) { T.view -= dt; if (T.view <= 0) { T.time = 0; } return; }
      if (g.mouse.clicked) {
        T.grid.forEach((it, i) => { const r = memRect(i); if (g.inRect(...r)) { it.sel = !it.sel; g.sfx.click(); } });
        if (g.inRect(350, 590, 200, 56)) endMem(g);
      }
      if (g.pressed('a')) endMem(g);
      if (T.time > 25) endMem(g);
    } else if (k === 'order') {
      if (g.mouse.clicked) {
        for (const n of T.nums) {
          if (n.done) continue;
          if (U.dist(g.mouse.x, g.mouse.y, n.x, n.y) < 34) {
            if (n.v === T.next) { n.done = true; T.next++; g.sfx.tone(300 + n.v * 30, 0.06, 'triangle', 0.06); g.burst(n.x, n.y, '#38bdf8', 8, 150); if (T.next > 16) endTest(g, scoreOrder(T)); }
            else { T.pen += 1; g.sfx.hit(); g.shake(3); S.fx.push({ x: n.x, y: n.y, t: 0.4 }); }
            break;
          }
        }
      }
    }
  },
  draw(g, c) {
    g.rect(0, 0, 900, 70, '#1e3a8a');
    g.text('🧠 두뇌 나이 측정', 30, 36, 26, '#fff', 'left');
    for (let i = 0; i < BA_TESTS.length; i++) {
      const x = 520 + i * 74, done = i < S.ti || S.phase === 'final', cur = i === S.ti && S.phase !== 'final';
      g.rrect(x, 14, 64, 42, 10, done ? '#22c55e' : cur ? '#facc15' : '#334155');
      g.emoji(BA_TESTS[i].e, x + 32, 35, 26);
    }
    if (S.phase === 'final') return drawFinal(g, c);
    const tdef = BA_TESTS[S.ti];
    if (S.phase === 'intro') {
      g.rrect(200, 120, 500, 440, 24, '#fff', '#cbd5e1', 2);
      g.text(`테스트 ${S.ti + 1} / ${BA_TESTS.length}`, 450, 165, 20, '#64748b');
      g.emoji(tdef.e, 450, 250, 90);
      g.text(tdef.n, 450, 335, 40, '#1e3a8a');
      tdef.d.split('\n').forEach((l, i) => g.text(l, 450, 385 + i * 30, 19, '#334155', 'center', '500'));
      g.button(350, 470, 200, 64, '시작 ▶', '#2563eb', 26);
      return;
    }
    if (S.phase === 'between') {
      const r = S.results[S.results.length - 1];
      g.text(`${tdef.e} ${tdef.n} 완료!`, 450, 260, 40, '#1e3a8a');
      g.text(`점수 ${r.score} / 100`, 450, 330, 34, r.score >= 70 ? '#16a34a' : r.score >= 40 ? '#d97706' : '#dc2626');
      g.text(r.detail, 450, 385, 20, '#475569', 'center', '500');
      return;
    }
    const T = S.st;
    if (tdef.k === 'calc' || tdef.k === 'color' || tdef.k === 'count') {
      g.text(`${Math.min(T.i + 1, T.total)} / ${T.total}`, 450, 100, 20, '#64748b');
      if (tdef.k === 'calc') { g.rrect(220, 150, 460, 160, 24, '#eef2ff'); g.text(T.q.text, 450, 232, 64, '#1e293b'); }
      if (tdef.k === 'color') { g.rrect(220, 150, 460, 160, 24, '#f1f5f9'); g.text(T.q.word, 450, 232, 84, T.q.col); }
      if (tdef.k === 'count') {
        g.rrect(150, 120, 600, 300, 24, '#0f172a');
        if (T.show > 0) for (const s of T.q.stars) g.emoji(s.e, s.x, s.y, 34);
        else g.text('몇 개였나요?', 450, 270, 36, '#e2e8f0');
      }
      if (!(tdef.k === 'count' && T.show > 0)) for (let i = 0; i < 4; i++) {
        const [x, y, w, h] = optRect(i);
        let fill = tdef.k === 'color' ? BA_COL[i][1] : '#2563eb';
        if (T.lock > 0 && i === T.q.ans) fill = '#16a34a';
        if (T.lock > 0 && i === T.picked && i !== T.q.ans) fill = '#9ca3af';
        g.rrect(x, y, w, h, 16, fill, 'rgba(0,0,0,.1)', 2);
        g.text(tdef.k === 'color' ? BA_COL[i][0] : String(T.q.opts[i]), x + w / 2, y + h / 2 + 2, 34, '#fff');
        g.text(String(i + 1), x + 16, y + 16, 14, 'rgba(255,255,255,.7)');
      }
      if (T.lock > 0) g.emoji(T.right ? '⭕' : '❌', 450, 232, 140);
    } else if (tdef.k === 'mem') {
      if (T.view > 0) {
        g.text(`외우세요! ${Math.ceil(T.view)}`, 450, 110, 30, '#1e3a8a');
        g.rrect(150, 140, 600, 6, 3, '#cbd5e1'); g.rrect(150, 140, 600 * T.view / 8, 6, 3, '#2563eb');
        T.show.forEach((e, i) => g.emoji(e, 210 + (i % 5) * 120, 250 + Math.floor(i / 5) * 140, 80));
      } else {
        g.text('봤던 그림을 모두 고르세요', 450, 100, 26, '#1e3a8a');
        T.grid.forEach((it, i) => { const [x, y, w, h] = memRect(i); g.rrect(x, y, w, h, 14, it.sel ? '#bfdbfe' : '#fff', it.sel ? '#2563eb' : '#cbd5e1', it.sel ? 4 : 2); g.emoji(it.e, x + w / 2, y + h / 2, 52); });
        g.button(350, 590, 200, 56, '완료 ✔', '#16a34a', 24);
        g.text(`${Math.max(0, 25 - T.time).toFixed(0)}초`, 620, 618, 20, '#64748b');
      }
    } else if (tdef.k === 'order') {
      g.text(`다음: ${T.next}`, 450, 100, 26, '#1e3a8a');
      g.text(`${T.time.toFixed(1)}초`, 820, 100, 22, '#64748b', 'right');
      for (const n of T.nums) {
        if (n.done) { g.circle(n.x, n.y, 30, '#e2e8f0'); continue; }
        g.circle(n.x, n.y + 3, 32, 'rgba(0,0,0,.12)'); g.circle(n.x, n.y, 32, '#0ea5e9'); g.text(String(n.v), n.x, n.y + 1, 28, '#fff');
      }
      for (const f of S.fx) { g.text('✕', f.x, f.y, 50, `rgba(220,38,38,${f.t * 2.5})`); }
    }
  },
});
function optRect(i) { return [120 + i * 170, 470, 150, 100]; }
function memRect(i) { return [150 + (i % 6) * 102, 140 + Math.floor(i / 6) * 102, 90, 90]; }
function beginTest(g) {
  const k = BA_TESTS[S.ti].k;
  S.phase = 'play';
  S.st = { time: 0, i: 0, ok: 0, rts: [], lock: 0, total: 15, pen: 0 };
  const T = S.st;
  if (k === 'count') { T.total = 8; }
  if (k === 'mem') {
    const all = U.shuffle(BA_ITEMS.slice());
    T.show = all.slice(0, 10); T.view = 8;
    T.grid = U.shuffle(all.slice(0, 18)).map((e) => ({ e, sel: false, seen: T.show.includes(e) }));
  }
  if (k === 'order') {
    T.next = 1; T.nums = [];
    for (let v = 1; v <= 16; v++) {
      let x, y, ok, tries = 0;
      do { x = U.rand(110, 790); y = U.rand(160, 620); ok = T.nums.every((n) => U.dist(n.x, n.y, x, y) > 80); tries++; } while (!ok && tries < 300);
      T.nums.push({ v, x, y, done: false });
    }
  }
  if (k !== 'mem' && k !== 'order') nextQ(g, true);
  g.sfx.click();
}
function nextQ(g, first) {
  const k = BA_TESTS[S.ti].k, T = S.st;
  if (!first) T.i++;
  if (T.i >= T.total) {
    const acc = T.ok / T.total, avg = T.rts.reduce((a, b) => a + b, 0) / Math.max(1, T.rts.length);
    const base = k === 'count' ? 1.6 : k === 'color' ? 0.8 : 1.3;
    const spd = U.clamp(1 - (avg - base * 0.6) / (base * 2.5), 0, 1);
    return endTest(g, { score: Math.round(acc * 70 + spd * 30 * acc), detail: `정답 ${T.ok}/${T.total} · 평균 ${avg.toFixed(2)}초` });
  }
  T.qStart = T.time; T.picked = -1;
  if (k === 'calc') {
    const lvl = T.i < 5 ? 0 : T.i < 10 ? 1 : 2;
    const op = U.choice(lvl === 0 ? ['+', '-'] : lvl === 1 ? ['+', '-', '×'] : ['×', '÷', '+', '-']);
    let a, b, r;
    if (op === '+') { a = U.randi(2, 9 + lvl * 20); b = U.randi(2, 9 + lvl * 20); r = a + b; }
    if (op === '-') { a = U.randi(5, 15 + lvl * 25); b = U.randi(1, a); r = a - b; }
    if (op === '×') { a = U.randi(2, 9); b = U.randi(2, 9 + lvl * 3); r = a * b; }
    if (op === '÷') { b = U.randi(2, 9); r = U.randi(2, 9); a = b * r; }
    const opts = new Set([r]);
    while (opts.size < 4) { const d = r + U.choice([-10, -2, -1, 1, 2, 10, U.randi(-6, 6)]); if (d >= 0 && d !== r) opts.add(d); }
    const arr = U.shuffle([...opts]);
    T.q = { text: `${a} ${op} ${b} = ?`, opts: arr, ans: arr.indexOf(r) };
  } else if (k === 'color') {
    const w = U.randi(0, 3); let c = U.randi(0, 3);
    if (Math.random() < 0.75) while (c === w) c = U.randi(0, 3);
    T.q = { word: BA_COL[w][0], col: BA_COL[c][1], ans: c, opts: [] };
  } else if (k === 'count') {
    const n = U.randi(4 + T.i, 7 + T.i * 1.5 | 0);
    const stars = [];
    const em = U.choice(['⭐', '🍎', '🐥', '🔵', '🌸']);
    for (let i = 0; i < n; i++) { let x, y, tries = 0; do { x = U.rand(185, 715); y = U.rand(150, 390); tries++; } while (stars.some((s) => U.dist(s.x, s.y, x, y) < 40) && tries < 200); stars.push({ x, y, e: em }); }
    const opts = new Set([n]);
    while (opts.size < 4) { const d = n + U.randi(-3, 3); if (d > 0) opts.add(d); }
    const arr = [...opts].sort((a, b) => a - b);
    T.q = { stars, opts: arr, ans: arr.indexOf(n) };
    T.show = Math.max(0.7, 1.4 - T.i * 0.08);
    T.qStart = T.time + T.show;
  }
}
function answer(g, i) {
  const T = S.st;
  T.picked = i;
  const rt = T.time - T.qStart;
  T.rts.push(rt);
  T.right = i === T.q.ans;
  if (T.right) { T.ok++; g.sfx.coin(); } else { g.sfx.hit(); g.shake(3); }
  T.lock = T.right ? 0.25 : 0.6;
}
function endMem(g) {
  const T = S.st;
  let hit = 0, wrong = 0;
  for (const it of T.grid) { if (it.sel && it.seen) hit++; if (it.sel && !it.seen) wrong++; }
  const sc = U.clamp(Math.round((hit - wrong * 1.2) * 10), 0, 100);
  endTest(g, { score: sc, detail: `맞힘 ${hit}/10 · 오답 ${wrong}` });
}
function scoreOrder(T) {
  const t = T.time + T.pen;
  return { score: Math.round(U.clamp(100 - (t - 9) * 4.5, 0, 100)), detail: `기록 ${T.time.toFixed(1)}초 · 실수 ${T.pen}회` };
}
function endTest(g, r) {
  S.results.push(r);
  g.add(r.score * 10);
  S.phase = 'between'; S.wait = 2.2;
  g.sfx.win();
  g.burst(450, 300, ['#60a5fa', '#facc15', '#4ade80'], 40, 300, 1);
}
function finish(g) {
  const avg = S.results.reduce((a, r) => a + r.score, 0) / S.results.length;
  S.age = Math.round(U.clamp(20 + (100 - avg) * 0.62, 20, 80));
  S.avg = avg;
  S.phase = 'final';
  if (S.bestAge === null || S.age < S.bestAge) { S.bestAge = S.age; g.save('bestAge', S.age); S.newBest = true; }
  g.add((80 - S.age) * 50);
  g.shake(6);
  g.burst(450, 250, ['#f472b6', '#facc15', '#60a5fa', '#4ade80'], 90, 450, 1.4, 5);
  g.later(() => g.win(`두뇌 나이 ${S.age}세 · ${ageComment(S.age)}`), 4.5);
}
function ageComment(a) { return a <= 22 ? '천재 두뇌! 🧠✨' : a <= 30 ? '아주 젊은 두뇌!' : a <= 40 ? '건강한 두뇌' : a <= 55 ? '조금 피곤한 두뇌' : '두뇌 운동이 필요해요!'; }
function drawFinal(g, c) {
  g.rrect(150, 100, 600, 520, 28, '#fff', '#93c5fd', 3);
  g.text('당신의 두뇌 나이는', 450, 150, 26, '#475569');
  const shown = Math.min(S.age + 40, Math.round(80 - Math.min(1, S.t / 1.5) * (80 - S.age)));
  g.text(`${S.phase === 'final' ? Math.max(S.age, shown) : S.age}세`, 450, 230, 90, S.age <= 30 ? '#16a34a' : S.age <= 50 ? '#d97706' : '#dc2626');
  g.text(ageComment(S.age), 450, 300, 26, '#1e3a8a');
  S.results.forEach((r, i) => {
    const y = 350 + i * 44;
    g.emoji(BA_TESTS[i].e, 220, y, 28); g.text(BA_TESTS[i].n, 250, y, 20, '#334155', 'left');
    g.rrect(400, y - 10, 250, 20, 10, '#e2e8f0'); g.rrect(400, y - 10, Math.max(20, 250 * r.score / 100), 20, 10, r.score >= 70 ? '#22c55e' : r.score >= 40 ? '#f59e0b' : '#ef4444');
    g.text(String(r.score), 690, y, 20, '#334155');
  });
  g.text(S.newBest ? `🎉 최고 기록 갱신! (${S.bestAge}세)` : `최고 기록: ${S.bestAge}세`, 450, 590, 20, '#7c3aed');
}
