let S;
const LG_CATS = [
  { n: '사람', v: [['🧙', '마법사'], ['🤴', '왕자'], ['👸', '공주'], ['🧛', '뱀파이어'], ['🤖', '로봇']] },
  { n: '음료', v: [['☕', '커피'], ['🍵', '녹차'], ['🥛', '우유'], ['🧃', '주스'], ['🥤', '콜라']] },
  { n: '동물', v: [['🐶', '강아지'], ['🐱', '고양이'], ['🐦', '앵무새'], ['🐟', '금붕어'], ['🐰', '토끼']] },
  { n: '음식', v: [['🍕', '피자'], ['🍔', '버거'], ['🍣', '초밥'], ['🍜', '라면'], ['🍩', '도넛']] },
  { n: '취미', v: [['⚽', '축구'], ['🎸', '기타'], ['📚', '독서'], ['🎨', '그림'], ['🎮', '게임']] },
  { n: '탈것', v: [['🚲', '자전거'], ['🚗', '자동차'], ['🛵', '스쿠터'], ['🚌', '버스'], ['🛹', '보드']] },
  { n: '꽃', v: [['🌹', '장미'], ['🌻', '해바라기'], ['🌷', '튤립'], ['🌸', '벚꽃'], ['🌼', '데이지']] },
  { n: '과일', v: [['🍎', '사과'], ['🍌', '바나나'], ['🍇', '포도'], ['🍓', '딸기'], ['🍑', '복숭아']] },
];
const LG_STAGES = [[3, 3], [3, 3], [4, 3], [4, 3], [4, 4], [4, 4], [5, 3], [5, 4], [5, 4], [5, 5]];
const LG_SYM = { same: '＝', diff: '≠', at: '📍', notAt: '🚫', left: '▶', next: '↔', before: '≪' };
GAME({
  title: '논리 격자', w: 1000, h: 640, bg: '#0f172a', controls: 'none',
  help: '오른쪽 단서를 읽고 각 집(열)에 어떤 항목이 있는지 알아내세요\n작은 아이콘 클릭 = 후보 지우기 · 우클릭 = 그 값으로 확정 (Space로 모드 전환)\n자동 정리: 한 칸에 하나만 남으면 같은 줄의 다른 칸에서 지워져요\n틀린 후보를 지우거나 잘못 확정하면 ❤️ 감소 · H 힌트 · Backspace 되돌리기\n단서를 클릭하면 사용 완료 표시 · 10개 퍼즐을 모두 풀면 승리!',
  init(g) {
    S = { stage: 0, lives: 3, mode: 'x', hist: [], t: 0, msg: '', msgT: 0, solvedT: 0, hints: 0, totalT: 0, auto: true, flash: null };
    newPuzzle(g);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
    g.info = `퍼즐 ${S.stage + 1}/10 · ${S.N}집 × ${S.K}항목`;
    if (S.solvedT > 0) {
      S.solvedT -= dt;
      if (S.solvedT <= 0 || (S.solvedT < 1.5 && (g.mouse.clicked || g.pressed('a')))) {
        S.solvedT = 0; S.stage++;
        if (S.stage >= LG_STAGES.length) { g.win(`10개 퍼즐 완료! 총 ${U.fmtTime(S.totalT)} · 힌트 ${S.hints}회`); return; }
        S.lives = Math.min(3, S.lives + 1);
        newPuzzle(g);
      }
      return;
    }
    S.t += dt; S.totalT += dt;
    const m = g.mouse;
    if (g.pressed('a') || g.clickIn(20, 596, 180, 38)) { S.mode = S.mode === 'x' ? 'o' : 'x'; g.sfx.click(); }
    if (g.keyp('Backspace') || g.clickIn(210, 596, 130, 38)) undo(g);
    if (g.keyp('KeyH') || g.clickIn(350, 596, 130, 38)) hint(g);
    if (g.keyp('KeyT') || g.clickIn(490, 596, 140, 38)) { S.auto = !S.auto; g.sfx.click(); if (S.auto) autoClean(); }
    // 단서 클릭 → 사용 표시
    if (m.clicked) S.clues.forEach((cl, i) => { const r = clueRect(i); if (g.inRect(r.x, r.y, r.w, r.h)) { cl.used = !cl.used; g.sfx.move(); } });
    if (m.clicked || m.rclick) {
      const hit = candAt(m.x, m.y);
      if (hit) {
        const act = m.rclick ? (S.mode === 'x' ? 'o' : 'x') : S.mode;
        act === 'x' ? eliminate(g, hit) : confirm(g, hit);
      }
    }
  },
  draw(g, c) {
    const N = S.N, K = S.K, L = S.lay;
    g.rect(0, 0, 1000, 640, '#0f172a');
    // 상단
    g.text(`🧩 퍼즐 ${S.stage + 1} / 10`, 20, 26, 20, '#e2e8f0', 'left');
    g.text(`⏱ ${U.fmtTime(S.t)}`, 250, 26, 18, '#93c5fd', 'left');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '❤️' : '🖤', 380 + i * 28, 26, 20);
    g.text(`남은 후보 ${remaining()}`, 630, 26, 15, '#94a3b8', 'right');
    // 집 머리
    for (let h = 0; h < N; h++) {
      const x = L.x0 + L.lw + h * L.cw;
      g.rrect(x + 3, 52, L.cw - 6, 50, 10, '#1e293b');
      g.emoji('🏠', x + L.cw / 2 - 16, 77, 28);
      g.text(`${h + 1}번`, x + L.cw / 2 + 18, 78, 17, '#fde68a');
    }
    for (let ci = 0; ci < K; ci++) {
      const y = L.y0 + ci * L.rh, cat = S.cats[ci];
      g.rrect(L.x0, y + 3, L.lw - 6, L.rh - 6, 10, '#1e293b');
      g.text(cat.n, L.x0 + (L.lw - 6) / 2, y + L.rh / 2, 17, '#cbd5e1');
      for (let h = 0; h < N; h++) {
        const x = L.x0 + L.lw + h * L.cw, cand = S.p[ci][h], single = popc(cand) === 1;
        const fl = S.flash && S.flash.c === ci && S.flash.h === h;
        g.rrect(x + 3, y + 3, L.cw - 6, L.rh - 6, 10, fl ? (S.flash.bad ? '#7f1d1d' : '#365314') : single ? '#14532d' : '#1e293b', single ? '#4ade80' : '#334155', 2);
        if (single) {
          const v = bitIdx(cand);
          g.emoji(cat.v[v][0], x + L.cw / 2, y + L.rh / 2 - 8, Math.min(L.rh * 0.5, 48));
          g.text(cat.v[v][1], x + L.cw / 2, y + L.rh - 16, 13, '#bbf7d0');
        } else {
          for (let v = 0; v < N; v++) {
            const r = candRect(ci, h, v), on = cand & (1 << v);
            const hov = g.inRect(r.x, r.y, r.w, r.h);
            if (on) {
              if (hov) g.rrect(r.x, r.y, r.w, r.h, 6, S.mode === 'x' ? 'rgba(239,68,68,.35)' : 'rgba(74,222,128,.35)');
              g.emoji(cat.v[v][0], r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.72);
            } else {
              c.globalAlpha = 0.12; g.emoji(cat.v[v][0], r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.6); c.globalAlpha = 1;
            }
          }
        }
      }
    }
    // 단서 패널
    g.rrect(645, 8, 345, 624, 14, '#111827', '#334155', 2);
    g.text(`📜 단서 ${S.clues.length}개`, 660, 30, 17, '#fde68a', 'left');
    g.text('클릭: 사용 표시', 975, 30, 12, '#64748b', 'right', '500');
    S.clues.forEach((cl, i) => drawClue(g, cl, i));
    // 버튼
    g.button(20, 596, 180, 38, S.mode === 'x' ? '✖ 지우기 모드' : '✔ 확정 모드', S.mode === 'x' ? '#991b1b' : '#166534', 16);
    g.button(210, 596, 130, 38, '↶ 되돌리기', '#334155', 15);
    g.button(350, 596, 130, 38, '💡 힌트 (H)', '#a16207', 15);
    g.button(490, 596, 140, 38, `자동정리 ${S.auto ? 'ON' : 'OFF'}`, S.auto ? '#1d4ed8' : '#334155', 15);
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT * 2); g.rrect(150, 4, 480, 44, 12, 'rgba(0,0,0,.92)', S.msgC, 2); g.text(S.msg, 390, 26, 17, S.msgC); c.globalAlpha = 1; }
    if (S.solvedT > 0) {
      g.rrect(90, 230, 480, 150, 18, 'rgba(6,78,59,.95)', '#4ade80', 3);
      g.text('🎉 퍼즐 해결!', 330, 270, 30, '#fff');
      g.text(`${U.fmtTime(S.t)} · +${S.lastPts}점`, 330, 312, 18, '#bbf7d0');
      if (S.solvedT < 1.5) g.text('클릭하면 다음 퍼즐', 330, 348, 15, '#fde68a');
    }
  },
});
// ───── 비트 유틸 ─────
function popc(x) { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; }
function bitIdx(x) { let i = 0; while (x > 1) { x >>= 1; i++; } return i; }
function lowIdx(x) { let i = 0; while (!(x & 1)) { x >>= 1; i++; } return i; }
// ───── 생성 / 풀이 ─────
function propagate(pos, clues, N) {
  // pos[c][v] = 가능한 집 비트마스크. 모순이면 false
  const full = (1 << N) - 1, K = pos.length;
  let changed = true, guard = 0;
  const set = (c, v, m) => { if (m !== pos[c][v]) { pos[c][v] = m; changed = true; } return m !== 0; };
  while (changed && guard++ < 200) {
    changed = false;
    for (const cl of clues) {
      const [ac, av] = cl.a, A = pos[ac][av];
      if (cl.t === 'at') { if (!set(ac, av, A & (1 << cl.h))) return false; continue; }
      if (cl.t === 'notAt') { if (!set(ac, av, A & ~(1 << cl.h))) return false; continue; }
      const [bc, bv] = cl.b, B = pos[bc][bv];
      if (cl.t === 'same') { const m = A & B; if (!set(ac, av, m) || !set(bc, bv, m)) return false; }
      else if (cl.t === 'diff') { if (popc(A) === 1 && !set(bc, bv, B & ~A)) return false; if (popc(pos[bc][bv]) === 1 && !set(ac, av, pos[ac][av] & ~pos[bc][bv])) return false; }
      else if (cl.t === 'left') { if (!set(ac, av, A & (B >> 1))) return false; if (!set(bc, bv, B & ((pos[ac][av] << 1) & full))) return false; }
      else if (cl.t === 'next') { if (!set(ac, av, A & (((B << 1) | (B >> 1)) & full))) return false; const A2 = pos[ac][av]; if (!set(bc, bv, B & (((A2 << 1) | (A2 >> 1)) & full))) return false; }
      else if (cl.t === 'before') {
        if (!B || !A) return false;
        if (!set(ac, av, A & ((1 << bitIdx(B)) - 1))) return false;
        const lo = lowIdx(pos[ac][av]);
        if (!set(bc, bv, B & ~((1 << (lo + 1)) - 1) & full)) return false;
      }
    }
    for (let c = 0; c < K; c++) {
      for (let v = 0; v < N; v++) {
        const m = pos[c][v];
        if (!m) return false;
        if (popc(m) === 1) for (let w = 0; w < N; w++) if (w !== v && pos[c][w] & m) set(c, w, pos[c][w] & ~m);
      }
      for (let h = 0; h < N; h++) {
        let cnt = 0, last = -1;
        for (let v = 0; v < N; v++) if (pos[c][v] & (1 << h)) { cnt++; last = v; }
        if (cnt === 0) return false;
        if (cnt === 1 && pos[c][last] !== 1 << h) set(c, last, 1 << h);
      }
    }
  }
  return true;
}
function freshPos(K, N) { const full = (1 << N) - 1; return Array.from({ length: K }, () => Array(N).fill(full)); }
function isSolved(pos) { return pos.every((row) => row.every((m) => popc(m) === 1)); }
function solvable(clues, K, N) { const p = freshPos(K, N); return propagate(p, clues, N) && isSolved(p); }
function randClue(sol, K, N, hard) {
  const types = hard ? ['same', 'same', 'left', 'next', 'next', 'before', 'diff', 'notAt', 'at'] : ['same', 'same', 'same', 'left', 'next', 'at', 'before', 'diff', 'notAt'];
  const t = U.choice(types);
  const rv = () => { const c = U.randi(0, K - 1), v = U.randi(0, N - 1); return [c, v]; };
  const houseOf = ([c, v]) => sol[c].indexOf(v);
  for (let k = 0; k < 40; k++) {
    const a = rv(), b = rv(), ha = houseOf(a), hb = houseOf(b);
    if (t === 'at') return { t, a, h: ha };
    if (t === 'notAt') { let h; do h = U.randi(0, N - 1); while (h === ha); return { t, a, h }; }
    if (a[0] === b[0]) continue;
    if (t === 'same' && ha === hb) return { t, a, b };
    if (t === 'diff' && ha !== hb) return { t, a, b };
    if (t === 'left' && ha + 1 === hb) return { t, a, b };
    if (t === 'next' && Math.abs(ha - hb) === 1) return { t, a, b };
    if (t === 'before' && ha < hb && hb - ha >= 1) return { t, a, b };
  }
  return null;
}
function genPuzzle(N, K, hard) {
  for (let tries = 0; tries < 30; tries++) {
    const sol = Array.from({ length: K }, () => U.shuffle([...Array(N).keys()]));
    // sol[c][h] = v
    const clues = [];
    let pos = freshPos(K, N), guard = 0;
    while (!isSolved(pos) && guard++ < 600) {
      const cl = randClue(sol, K, N, hard);
      if (!cl) continue;
      const test = pos.map((r) => r.slice());
      if (!propagate(test, [cl], N)) continue;
      const before = JSON.stringify(pos);
      propagate(test, [...clues, cl], N);
      if (JSON.stringify(test) === before) continue;
      clues.push(cl); pos = test;
    }
    if (!isSolved(pos)) continue;
    // 불필요한 단서 제거
    const order = U.shuffle(clues.slice());
    let cur = clues.slice();
    for (const cl of order) { const t = cur.filter((x) => x !== cl); if (solvable(t, K, N)) cur = t; }
    // 단서가 너무 적은 3x3이면 '같은 집' 단서 하나 추가로 재미
    return { sol, clues: U.shuffle(cur).map((c) => ({ ...c, used: false })) };
  }
  return null;
}
function newPuzzle(g) {
  const [N, K] = LG_STAGES[S.stage];
  S.N = N; S.K = K;
  const catIdx = U.shuffle([...Array(LG_CATS.length).keys()]).slice(0, K);
  if (!catIdx.includes(0) && Math.random() < 0.6) catIdx[0] = 0;
  S.cats = catIdx.map((i) => ({ n: LG_CATS[i].n, v: U.shuffle(LG_CATS[i].v.slice()).slice(0, N) }));
  const pz = genPuzzle(N, K, S.stage >= 4);
  S.sol = pz.sol; S.clues = pz.clues;
  const full = (1 << N) - 1;
  S.p = Array.from({ length: K }, () => Array(N).fill(full));   // 플레이어: p[c][h] = 후보 값 비트
  S.hist = []; S.t = 0; S.flash = null;
  const lw = 78, cw = Math.floor((630 - 20 - lw) / N), y0 = 108, rh = Math.min(130, Math.floor((588 - y0) / K));
  S.lay = { x0: 14, lw, cw, y0, rh };
  const nc = S.clues.length;
  S.clueH = Math.min(60, Math.floor(580 / nc));
  say(`퍼즐 ${S.stage + 1}: ${N}채의 집, ${K}가지 항목`, '#fde68a');
  g.sfx.power();
}
function candRect(c, h, v) {
  const L = S.lay, N = S.N, cols = N <= 3 ? N : 3, rows = Math.ceil(N / cols);
  const x = L.x0 + L.lw + h * L.cw + 8, y = L.y0 + c * L.rh + 8, w = (L.cw - 16) / cols, hh = (L.rh - 16) / rows;
  const row = Math.floor(v / cols), inRow = row === rows - 1 ? N - row * cols : cols, off = (cols - inRow) * w / 2;
  return { x: x + off + (v % cols) * w, y: y + row * hh, w, h: hh };
}
function candAt(x, y) {
  for (let c = 0; c < S.K; c++) for (let h = 0; h < S.N; h++) {
    if (popc(S.p[c][h]) === 1) continue;
    for (let v = 0; v < S.N; v++) { const r = candRect(c, h, v); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h && S.p[c][h] & (1 << v)) return { c, h, v }; }
  }
  return null;
}
function snapshot() { S.hist.push(S.p.map((r) => r.slice())); if (S.hist.length > 100) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; S.p = h; g.sfx.move(); }
function mistake(g, hit, txt) {
  S.lives--; S.flash = { c: hit.c, h: hit.h, t: 0.6, bad: true };
  g.sfx.hit(); g.shake(8, 0.3);
  say(txt, '#fca5a5');
  if (S.lives <= 0) g.later(() => g.over(`퍼즐 ${S.stage + 1}에서 실패 · ${S.stage}개 해결`), 0.8);
}
function eliminate(g, hit) {
  const truth = S.sol[hit.c][hit.h];
  if (truth === hit.v) { mistake(g, hit, `틀렸어요! ${S.cats[hit.c].v[hit.v][1]}은(는) 여기가 맞아요`); return; }
  snapshot();
  S.p[hit.c][hit.h] &= ~(1 << hit.v);
  g.sfx.pop();
  const r = candRect(hit.c, hit.h, hit.v); g.burst(r.x + r.w / 2, r.y + r.h / 2, '#f87171', 6, 90, 0.3, 3);
  afterChange(g);
}
function confirm(g, hit) {
  const truth = S.sol[hit.c][hit.h];
  if (truth !== hit.v) { mistake(g, hit, `틀렸어요! 여기는 ${S.cats[hit.c].v[hit.v][1]}이(가) 아니에요`); return; }
  snapshot();
  S.p[hit.c][hit.h] = 1 << hit.v;
  g.sfx.coin();
  S.flash = { c: hit.c, h: hit.h, t: 0.4, bad: false };
  afterChange(g);
}
function autoClean() {
  // 하나만 남은 칸의 값을 같은 줄에서 제거 / 한 칸에만 남은 값은 확정
  let ch = true;
  while (ch) {
    ch = false;
    for (let c = 0; c < S.K; c++) {
      for (let h = 0; h < S.N; h++) {
        const m = S.p[c][h];
        if (popc(m) === 1) for (let k = 0; k < S.N; k++) if (k !== h && S.p[c][k] & m) { S.p[c][k] &= ~m; ch = true; }
      }
      for (let v = 0; v < S.N; v++) {
        let cnt = 0, last = -1;
        for (let h = 0; h < S.N; h++) if (S.p[c][h] & (1 << v)) { cnt++; last = h; }
        if (cnt === 1 && S.p[c][last] !== 1 << v) { S.p[c][last] = 1 << v; ch = true; }
      }
    }
  }
}
function afterChange(g) {
  if (S.auto) autoClean();
  if (S.p.every((r) => r.every((m) => popc(m) === 1))) {
    const base = [0, 0, 0, 300, 500, 800][S.N] * (S.K - 1);
    const pts = Math.round(base + Math.max(0, 600 - S.t * 2) + S.lives * 50);
    S.lastPts = pts; g.add(pts);
    S.solvedT = 3; g.sfx.win();
    for (let i = 0; i < 6; i++) g.burst(U.rand(60, 600), U.rand(120, 560), ['#4ade80', '#fde68a', '#60a5fa', '#f472b6'], 20, 260, 0.9, 4);
  }
}
function hint(g) {
  // 현재 상태 + 단서로 논리적으로 지울 수 있는 후보를 하나 찾는다
  const N = S.N, K = S.K, pos = freshPos(K, N);
  for (let c = 0; c < K; c++) for (let v = 0; v < N; v++) { let m = 0; for (let h = 0; h < N; h++) if (S.p[c][h] & (1 << v)) m |= 1 << h; pos[c][v] = m; }
  propagate(pos, S.clues, N);
  const cells = [];
  for (let c = 0; c < K; c++) for (let h = 0; h < N; h++) { let m = 0; for (let v = 0; v < N; v++) if (pos[c][v] & (1 << h)) m |= 1 << v; if (m !== S.p[c][h]) cells.push({ c, h, m }); }
  snapshot();
  S.hints++; g.add(-50);
  if (cells.length) {
    const cell = U.choice(cells);
    S.p[cell.c][cell.h] = cell.m;
    S.flash = { c: cell.c, h: cell.h, t: 1.2, bad: false };
    say('💡 단서로 알아낼 수 있는 칸을 정리했어요 (-50)', '#fde68a');
  } else {
    const un = [];
    for (let c = 0; c < K; c++) for (let h = 0; h < N; h++) if (popc(S.p[c][h]) > 1) un.push({ c, h });
    if (!un.length) return;
    const cell = U.choice(un);
    S.p[cell.c][cell.h] = 1 << S.sol[cell.c][cell.h];
    S.flash = { c: cell.c, h: cell.h, t: 1.2, bad: false };
    say('💡 한 칸을 공개했어요 (-50)', '#fde68a');
  }
  g.sfx.power();
  afterChange(g);
}
function remaining() { let n = 0; for (const r of S.p) for (const m of r) if (popc(m) > 1) n += popc(m) - 1; return n; }
function say(m, c) { S.msg = m; S.msgC = c || '#fff'; S.msgT = 2.4; }
// ───── 단서 그리기 ─────
function clueRect(i) { return { x: 652, y: 46 + i * S.clueH, w: 330, h: S.clueH - 3 }; }
function hasJong(w) { const ch = w.charCodeAt(w.length - 1); return ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 > 0; }
function jo(w, a, b) { return w + (hasJong(w) ? a : b); }
function nm(x) { return S.cats[x[0]].v[x[1]][1]; }
function em(x) { return S.cats[x[0]].v[x[1]][0]; }
function clueText(cl) {
  const A = nm(cl.a);
  switch (cl.t) {
    case 'at': return `${jo(A, '은', '는')} ${cl.h + 1}번 집에 있다`;
    case 'notAt': return `${jo(A, '은', '는')} ${cl.h + 1}번 집에 없다`;
    case 'same': return `${jo(A, '과', '와')} ${jo(nm(cl.b), '은', '는')} 같은 집`;
    case 'diff': return `${jo(A, '과', '와')} ${jo(nm(cl.b), '은', '는')} 다른 집`;
    case 'left': return `${A}의 바로 오른쪽 집에 ${jo(nm(cl.b), '이', '가')} 있다`;
    case 'next': return `${jo(A, '과', '와')} ${jo(nm(cl.b), '은', '는')} 이웃한 집`;
    case 'before': return `${jo(A, '은', '는')} ${nm(cl.b)}보다 왼쪽 어딘가에`;
  }
  return '';
}
function drawClue(g, cl, i) {
  const r = clueRect(i), c = g.ctx, h = r.h, cy = r.y + h / 2, big = h >= 40;
  g.rrect(r.x, r.y, r.w, r.h, 8, cl.used ? '#0b1220' : '#1e293b', cl.used ? '#1f2937' : '#334155', 1);
  if (cl.used) c.globalAlpha = 0.35;
  const es = Math.min(h * 0.62, 30), iy = big ? r.y + h * 0.38 : cy;
  let x = r.x + 10 + es / 2;
  g.emoji(em(cl.a), x, iy, es);
  x += es / 2 + 6;
  if (cl.t === 'at' || cl.t === 'notAt') {
    g.text(LG_SYM[cl.t], x + 12, iy, es * 0.7, '#fde68a');
    g.emoji('🏠', x + 40, iy, es * 0.9);
    g.text(String(cl.h + 1), x + 60, iy, es * 0.7, '#fde68a', 'left');
  } else {
    g.text(LG_SYM[cl.t], x + 14, iy, es * 0.8, cl.t === 'diff' ? '#f87171' : '#fde68a');
    g.emoji(em(cl.b), x + 30 + es / 2, iy, es);
  }
  if (big) g.text(clueText(cl), r.x + 10, r.y + h * 0.8, 12, '#cbd5e1', 'left', '500');
  else g.text(clueText(cl), r.x + 130, cy, 11, '#94a3b8', 'left', '500');
  if (cl.used) { c.globalAlpha = 1; g.line(r.x + 6, cy, r.x + r.w - 6, cy, 'rgba(148,163,184,.5)', 2); }
}
