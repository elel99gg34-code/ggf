'use strict';
let S;
const SW_PX = 60, SW_PW = 840, SW_LEN = 50, SW_LANES = 8, SW_TOP = 70, SW_LH = 44;
const SW_ROUNDS = [
  { name: '예선', adv: 4, ai: [1.18, 1.48], tempo: 0.5 },
  { name: '준결승', adv: 3, ai: [1.36, 1.66], tempo: 0.46 },
  { name: '결승', adv: 1, ai: [1.55, 1.86], tempo: 0.42 },
];
const SW_NAMES = ['김태환', '레드기', '피터스', '마츠다', '로페즈', '코왈스키', '탐슨', '안드레', '드레셀', '판잔러', '첼리크', '오카모', '루이스', '베르그'];
const SW_FLAGS = ['🇰🇷', '🇺🇸', '🇦🇺', '🇯🇵', '🇧🇷', '🇵🇱', '🇬🇧', '🇫🇷', '🇨🇳', '🇮🇹', '🇹🇷', '🇩🇪', '🇨🇦', '🇸🇪'];
GAME({
  title: '수영 대회', w: 960, h: 600, bg: '#0b3d63', controls: 'dpad+ab', aLabel: '출발', bLabel: '숨',
  help: '출발 신호(삐!) 후 Space로 다이빙 — 미리 누르면 부정출발!\n← → 를 번갈아 박자에 맞춰 누르면 스트로크 (터치: 화면 왼쪽/오른쪽)\n↑ 또는 Shift/X = 숨쉬기 (박자에 맞춰) · 산소가 바닥나면 느려져요\n정확할수록 콤보·속도 UP · 마지막 15m는 라스트 스퍼트 (박자가 빨라짐)\n예선 4위 → 준결승 3위 → 결승 금메달을 노려라!',
  init(g) { S = { round: 0, total: 0, records: [] }; newRace(g); },
  update(g, dt) {
    S.t += dt;
    if (S.phase === 'result') {
      S.resT += dt;
      if (S.resT > 1 && (g.pressed('a') || g.mouse.clicked)) nextAfterResult(g);
      return;
    }
    if (S.phase === 'ready') {
      S.readyT += dt; if (S.goFired) S.raceT += dt;
      if (!S.goFired && S.readyT >= S.goAt) { S.goFired = true; S.goTime = S.t; g.sfx.tone(880, 0.35, 'square', 0.12); }
      if (!S.goFired && (g.pressed('a') || g.mouse.clicked)) {
        S.falses++; g.sfx.lose(); g.shake(8, 0.3);
        if (S.falses >= 2) { S.phase = 'result'; S.dq = true; S.resT = 0; return; }
        g.float(480, 300, '부정출발 경고! (한 번 더면 실격)', '#f87171', 30);
        S.readyT = 0; S.goAt = U.rand(1.6, 3.2);
      }
      for (const a of S.ai) if (S.goFired && !a.started && S.t - S.goTime >= a.react) { a.started = true; a.d = 3.6 + Math.random() * 0.8; a.v = 2.4; }
      if (S.goFired && (g.pressed('a') || g.mouse.clicked || g.pressed('left') || g.pressed('right'))) {
        const rt = S.t - S.goTime; S.react = rt;
        const glide = U.clamp(6.2 - rt * 6, 3, 5.8);
        S.p.d = glide; S.p.v = 2.6; S.phase = 'swim'; S.beat0 = S.t + 0.35; S.lastBeatUsed = -1;
        g.sfx.drop(); g.burst(SW_PX + glide / SW_LEN * SW_PW, laneY(S.pl), ['#e0f2fe', '#7dd3fc'], 20, 160);
        g.float(480, 260, rt < 0.2 ? '번개 출발! ⚡' : rt < 0.35 ? '좋은 출발!' : '느린 출발…', rt < 0.35 ? '#fde047' : '#cbd5e1', 28);
        if (rt < 0.2) g.add(200, 480, 300);
      }
      if (S.goFired && S.t - S.goTime > 1.5 && S.phase === 'ready') { S.phase = 'swim'; S.p.d = 2; S.p.v = 1.5; S.beat0 = S.t; S.react = 1.5; S.lastBeatUsed = -1; }
      updAI(g, dt);
      return;
    }
    // swim
    S.raceT += dt;
    const P = S.p;
    const spurt = P.d > SW_LEN - 15;
    const tempo = S.tempo * (spurt ? 0.82 : 1);
    if (spurt && !S.spurtMsg) { S.spurtMsg = true; g.float(480, 240, '🔥 라스트 스퍼트!', '#fb923c', 34); g.sfx.power(); }
    // beat clock
    S.beatPh += dt / tempo;
    while (S.beatPh >= 1) { S.beatPh -= 1; S.beatIdx++; if (!P.fin) g.sfx.tone(S.beatIdx % 4 === 0 ? 660 : 440, 0.04, 'sine', 0.04); if (S.lastBeatUsed < S.beatIdx - 1 && S.beatIdx > 2 && !P.fin) missBeat(g); }
    if (!P.fin) {
      let inp = null;
      if (g.pressed('left')) inp = 'L'; else if (g.pressed('right')) inp = 'R'; else if (g.pressed('up') || g.pressed('b')) inp = 'B';
      if (g.mouse.clicked) inp = g.mouse.y < 140 ? 'B' : g.mouse.x < 480 ? 'L' : 'R';
      if (inp) stroke(g, inp);
      P.o -= (spurt ? 10 : 8) * dt;
      if (P.o < 0) P.o = 0;
      const drag = 1.25 + (P.o <= 0 ? 1.4 : 0);
      P.v -= P.v * drag * dt; if (P.v < 0.2) P.v = 0.2;
      P.d += P.v * dt; P.anim += P.v * dt * 2.2;
      if (P.d >= SW_LEN) { P.d = SW_LEN; P.fin = true; P.time = S.raceT; S.finOrder.push(P); g.sfx.win(); g.burst(SW_PX + SW_PW, laneY(S.pl), ['#fde047', '#fff', '#38bdf8'], 40, 300); g.shake(6); }
    }
    updAI(g, dt);
    const allFin = S.ai.every((a) => a.fin) && P.fin;
    if (P.fin && (allFin || S.raceT > P.time + 6)) {
      for (const a of S.ai) if (!a.fin) { a.fin = true; a.time = S.raceT + (SW_LEN - a.d) / Math.max(1, a.v); S.finOrder.push(a); }
      finishRace(g);
    }
    for (const b of S.bub) { b.y -= 30 * dt; b.life -= dt; }
    S.bub = S.bub.filter((b) => b.life > 0);
    g.info = `${SW_ROUNDS[S.round].name} · ${S.p.d.toFixed(1)}m / 50m`;
  },
  draw(g, c) {
    // deck
    g.rect(0, 0, 960, 600, '#cbd5e1');
    g.rect(0, 0, 960, SW_TOP - 10, '#334155');
    for (let i = 0; i < 24; i++) g.emoji(['🙂', '😃', '😮', '🤩', '🙌'][(i * 7) % 5], 20 + i * 40, 20 + Math.sin(g.time * 6 + i) * (S.phase === 'swim' ? 4 : 1), 22);
    g.text(`🏊 ${SW_ROUNDS[S.round].name} · 남자 자유형 50m`, 480, 46, 18, '#e2e8f0');
    // pool
    const py = SW_TOP, ph = SW_LANES * SW_LH;
    g.rect(SW_PX - 20, py - 8, SW_PW + 40, ph + 16, '#e2e8f0');
    const gr = c.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, '#0ea5e9'); gr.addColorStop(1, '#0369a1');
    g.rect(SW_PX, py, SW_PW, ph, gr);
    for (let i = 0; i < 14; i++) { const x = SW_PX + ((i * 73 + g.time * 18) % SW_PW); g.line(x, py, x + 40, py + ph, 'rgba(255,255,255,.05)', 10); }
    for (let m = 5; m < 50; m += 5) { const x = SW_PX + m / SW_LEN * SW_PW; g.line(x, py, x, py + ph, m === 15 || m === 35 ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.08)', 1); if (m % 10 === 0) g.text(m + 'm', x, py + ph + 14, 11, '#475569'); }
    const sx = SW_PX + (SW_LEN - 15) / SW_LEN * SW_PW; g.rect(sx, py, 3, ph, 'rgba(251,146,60,.5)');
    for (let l = 0; l <= SW_LANES; l++) {
      const y = py + l * SW_LH;
      if (l > 0 && l < SW_LANES) for (let x = SW_PX; x < SW_PX + SW_PW; x += 12) g.circle(x + 6, y, 4, (x / 12 | 0) % 4 < 2 ? '#dc2626' : '#f8fafc');
    }
    for (let l = 0; l < SW_LANES; l++) { g.rect(SW_PX + 30, py + l * SW_LH + SW_LH / 2 - 2, SW_PW - 60, 4, 'rgba(15,23,42,.25)'); g.text(l + 1, SW_PX - 10, laneY(l), 14, '#334155'); }
    g.rect(SW_PX + SW_PW - 4, py, 8, ph, '#facc15');
    // swimmers
    const all = S.ai.concat([S.p]);
    for (const s of all) {
      const y = laneY(s.lane), x = SW_PX + s.d / SW_LEN * SW_PW;
      const me = s === S.p;
      if (s.started || me && S.phase === 'swim') {
        for (let k = 1; k < 4; k++) g.circle(x - 16 - k * 10, y + Math.sin(g.time * 9 + k + s.lane) * 3, 6 - k, 'rgba(255,255,255,.35)');
        c.save(); c.translate(x, y + Math.sin((s.anim || 0) * 3) * 2); c.scale(-1, 1); g.emoji('🏊', 0, 0, 32); c.restore();
        if (Math.sin((s.anim || 0) * 6) > 0.8) g.circle(x + 8, y - 10, 3, '#fff');
      } else { g.emoji('🧍', x - 14, y, 28); }
      if (me) { g.ring(x, y, 22 + Math.sin(g.time * 6) * 2, '#fde047', 3); g.text('나', x, y - 24, 12, '#fde047'); }
      if (s.fin) g.text(`${s.place}위 ${s.time.toFixed(2)}`, SW_PX + SW_PW - 70, y, 14, s.place === 1 ? '#fde047' : '#fff');
      else if (S.phase !== 'swim' || s.d < 2) g.text(`${s.flag} ${s.name}`, SW_PX + 120, y - 13, 11, 'rgba(255,255,255,.75)');
    }
    for (const b of S.bub) g.ring(b.x, b.y, 3, 'rgba(255,255,255,.7)', 1.5);
    drawHud(g, c);
    if (S.phase === 'ready') {
      g.rrect(300, 200, 360, 110, 16, 'rgba(15,23,42,.85)');
      if (!S.goFired) g.text(S.readyT < 0.8 ? '선수 소개…' : '제자리에… (Take your marks)', 480, 240, 22, '#fff');
      else g.text('삐! 출발!! ▶ Space', 480, 240, 30, '#fde047');
      g.text(S.falses ? '⚠ 부정출발 경고 1회' : '신호 후 Space / 클릭 / 화살표', 480, 282, 15, S.falses ? '#f87171' : '#94a3b8');
    }
    if (S.phase === 'result') drawResult(g);
  },
});
function laneY(l) { return SW_TOP + l * SW_LH + SW_LH / 2; }
function newRace(g) {
  const R = SW_ROUNDS[S.round];
  S.tempo = R.tempo; S.t = 0; S.raceT = 0; S.phase = 'ready'; S.readyT = 0; S.goAt = U.rand(2.0, 3.4); S.goFired = false; S.falses = 0; S.dq = false;
  S.beatPh = 0; S.beatIdx = 0; S.lastBeatUsed = -1; S.finOrder = []; S.bub = []; S.spurtMsg = false;
  S.pl = 3 + (S.round === 2 ? 1 : U.randi(-1, 1));
  S.p = { lane: S.pl, d: 0, v: 0, o: 100, combo: 0, maxCombo: 0, hand: null, anim: 0, fin: false, name: '나', flag: '🇰🇷', perfect: 0, good: 0, miss: 0, judge: '', judgeT: 0 };
  const names = U.shuffle(SW_NAMES.slice(1).map((n, i) => [n, SW_FLAGS[i + 1]]));
  S.ai = [];
  let k = 0;
  for (let l = 0; l < SW_LANES; l++) {
    if (l === S.pl) continue;
    const center = Math.abs(l - 3.5);
    const base = U.lerp(R.ai[1], R.ai[0], center / 3.5) + U.rand(-0.06, 0.06);
    S.ai.push({ lane: l, d: 0, v: 0, cruise: base, kick: U.rand(0.95, 1.06), react: U.rand(0.13, 0.32), started: false, fin: false, name: names[k][0], flag: names[k][1], anim: U.rand(0, 6), fade: U.rand(0.92, 1.04) });
    k++;
  }
}
function updAI(g, dt) {
  for (const a of S.ai) {
    if (!a.started || a.fin) continue;
    let tgt = a.cruise * (a.d > 35 ? a.kick : 1) * (a.d > 42 ? a.fade : 1);
    tgt *= 1 + Math.sin(S.t * 1.3 + a.lane) * 0.035;
    a.v += (tgt - a.v) * Math.min(1, dt * 2.5);
    a.d += a.v * dt; a.anim += a.v * dt * 2.2;
    if (a.d >= SW_LEN) { a.d = SW_LEN; a.fin = true; a.time = S.raceT; S.finOrder.push(a); g.sfx.tone(300 + S.finOrder.length * 40, 0.08, 'triangle', 0.04); }
  }
}
function stroke(g, inp) {
  const P = S.p;
  // nearest beat
  const ph = S.beatPh;
  let idx, off;
  if (ph < 0.5) { idx = S.beatIdx; off = ph; } else { idx = S.beatIdx + 1; off = 1 - ph; }
  const err = off * S.tempo;
  if (idx <= S.lastBeatUsed) { judge(g, '너무 빨라요', '#f87171'); P.combo = 0; P.v *= 0.92; return; }
  S.lastBeatUsed = idx;
  let q, lbl, col;
  if (err < 0.055) { q = 1; lbl = 'PERFECT'; col = '#fde047'; P.perfect++; }
  else if (err < 0.11) { q = 0.7; lbl = 'GOOD'; col = '#86efac'; P.good++; }
  else if (err < 0.17) { q = 0.4; lbl = 'OK'; col = '#93c5fd'; }
  else { q = 0.12; lbl = 'MISS'; col = '#f87171'; P.miss++; }
  const x = SW_PX + P.d / SW_LEN * SW_PW, y = laneY(P.lane);
  if (inp === 'B') {
    P.o = Math.min(100, P.o + 22 + q * 26);
    P.v += 0.12 * q;
    judge(g, '숨 ' + lbl, col);
    g.sfx.tone(240, 0.12, 'sine', 0.06, 380);
    for (let i = 0; i < 4; i++) S.bub.push({ x: x + U.rand(-8, 12), y: y - 6, life: 0.8 });
    if (q < 0.4) P.combo = 0;
    return;
  }
  if (P.hand === inp) { judge(g, '같은 팔! 엇박자', '#f87171'); P.combo = 0; P.v *= 0.85; g.sfx.hit(); return; }
  P.hand = inp;
  if (q >= 0.7) P.combo++; else P.combo = 0;
  P.maxCombo = Math.max(P.maxCombo, P.combo);
  const mult = 1 + Math.min(P.combo, 24) * 0.022;
  const oxy = P.o <= 0 ? 0.45 : P.o < 20 ? 0.8 : 1;
  P.v += 0.92 * q * mult * oxy * (S.tempo / 0.46);
  judge(g, lbl + (P.combo > 2 ? ` x${P.combo}` : ''), col);
  if (q >= 1) { g.add(10 + Math.min(P.combo, 30), x, y - 26); g.burst(x + 6, y, ['#fff', '#bae6fd'], 6, 120, 0.4); }
  g.sfx.tone(inp === 'L' ? 520 : 620, 0.05, 'triangle', 0.05 + q * 0.04);
  if (P.combo > 0 && P.combo % 10 === 0) { g.sfx.coin(); g.float(x, y - 40, `${P.combo} 콤보!`, '#fde047', 22); }
}
function missBeat(g) {
  const P = S.p;
  if (S.phase !== 'swim') return;
  if (P.combo > 0) { P.combo = 0; judge(g, '박자 놓침', '#94a3b8'); }
}
function judge(g, t, c) { S.p.judge = t; S.p.judgeC = c; S.p.judgeT = 0.6; }
function finishRace(g) {
  S.phase = 'result'; S.resT = 0;
  S.finOrder.sort((a, b) => a.time - b.time);
  S.finOrder.forEach((s, i) => (s.place = i + 1));
  const P = S.p;
  S.place = P.place;
  const R = SW_ROUNDS[S.round];
  const pts = Math.max(0, (9 - P.place) * 150) + Math.round(Math.max(0, 40 - P.time) * 40) + P.maxCombo * 10;
  g.add(pts, 480, 200);
  S.records.push(`${R.name}: ${P.place}위 ${P.time.toFixed(2)}초`);
  S.adv = P.place <= R.adv;
}
function nextAfterResult(g) {
  if (S.dq) return g.over(`${SW_ROUNDS[S.round].name} 부정출발 실격 😢`);
  const R = SW_ROUNDS[S.round];
  if (S.round === 2) {
    const pl = S.p.place;
    if (pl === 1) { g.add(3000); return g.win(`🥇 금메달! 기록 ${S.p.time.toFixed(2)}초`); }
    return g.over(pl === 2 ? `🥈 은메달! ${S.p.time.toFixed(2)}초` : pl === 3 ? `🥉 동메달! ${S.p.time.toFixed(2)}초` : `결승 ${pl}위 · ${S.p.time.toFixed(2)}초`);
  }
  if (!S.adv) return g.over(`${R.name} ${S.p.place}위 탈락 (${R.adv}위 안에 들어야 진출)`);
  S.round++; g.add(500); newRace(g);
}
function drawHud(g, c) {
  const P = S.p, y0 = 440;
  g.rect(0, y0, 960, 160, '#0f172a');
  // rhythm track
  const tx = 120, tw = 640, ty = y0 + 62, hitX = tx + 120;
  g.rrect(tx, ty - 34, tw, 68, 12, '#1e293b', '#334155');
  g.line(hitX, ty - 30, hitX, ty + 30, '#fde047', 3);
  g.ring(hitX, ty, 24, 'rgba(253,224,71,.6)', 3);
  const spacing = 110;
  if (S.phase === 'swim' && !P.fin) {
    for (let k = -1; k < 6; k++) {
      const x = hitX + (k - S.beatPh) * spacing;
      if (x < tx + 8 || x > tx + tw - 10) continue;
      const bi = S.beatIdx + k;
      const used = bi <= S.lastBeatUsed;
      const want = P.hand === 'L' ? (k % 2 === 0 ? 'R' : 'L') : (k % 2 === 0 ? 'L' : 'R');
      const breathHint = P.o < 45 && k === 1;
      const col = used ? '#334155' : breathHint ? '#22d3ee' : want === 'L' ? '#f472b6' : '#60a5fa';
      g.circle(x, ty, 18, col);
      g.text(breathHint ? '숨' : want === 'L' ? '←' : '→', x, ty + 1, 16, used ? '#64748b' : '#fff');
    }
  } else g.text(S.phase === 'ready' ? '출발 대기' : '골인!', tx + tw / 2, ty, 18, '#94a3b8');
  if (P.judgeT > 0) { P.judgeT -= 1 / 60; g.text(P.judge, hitX, ty - 50, 20, P.judgeC); }
  // oxygen
  g.text('산소', 50, y0 + 30, 14, '#7dd3fc');
  g.rrect(20, y0 + 44, 60, 90, 8, '#1e293b');
  const oh = 86 * P.o / 100; g.rrect(22, y0 + 46 + 86 - oh, 56, oh, 6, P.o < 25 ? (Math.sin(g.time * 12) > 0 ? '#ef4444' : '#7f1d1d') : '#22d3ee');
  g.text(Math.round(P.o) + '%', 50, y0 + 145, 13, '#e2e8f0');
  // speed & combo
  g.text(`속도 ${P.v.toFixed(2)} m/s`, 860, y0 + 34, 16, '#e2e8f0');
  g.text(`콤보 ${P.combo}`, 860, y0 + 64, 22, P.combo >= 10 ? '#fde047' : '#e2e8f0');
  g.text(`시간 ${S.raceT.toFixed(2)}`, 860, y0 + 96, 16, '#94a3b8');
  // position bar
  const ranked = S.ai.concat([P]).slice().sort((a, b) => (b.fin && a.fin ? a.time - b.time : b.d - a.d));
  g.text(`현재 ${ranked.indexOf(P) + 1}위`, 860, y0 + 126, 18, '#fb923c');
  g.text('← → 번갈아 박자 맞추기 · ↑ 숨쉬기', tx + tw / 2, y0 + 130, 13, '#64748b');
}
function drawResult(g) {
  g.rrect(200, 90, 560, 420, 20, 'rgba(15,23,42,.94)', '#38bdf8', 3);
  const R = SW_ROUNDS[S.round];
  if (S.dq) {
    g.text('🚫 부정출발 실격', 480, 250, 40, '#f87171');
    g.text('클릭 / Space', 480, 460, 16, '#94a3b8');
    return;
  }
  g.text(`${R.name} 결과`, 480, 125, 28, '#fde047');
  S.finOrder.forEach((s, i) => {
    const y = 170 + i * 32, me = s === S.p;
    if (me) g.rrect(230, y - 14, 500, 28, 6, 'rgba(253,224,71,.18)');
    g.text(['🥇', '🥈', '🥉'][i] || `${i + 1}`, 260, y, 18, '#fff');
    g.text(`${s.flag} ${s.name}`, 300, y, 17, me ? '#fde047' : '#e2e8f0', 'left');
    g.text(`레인 ${s.lane + 1}`, 560, y, 14, '#94a3b8');
    g.text(s.time.toFixed(2), 690, y, 17, '#fff', 'right');
  });
  const P = S.p;
  g.text(`PERFECT ${P.perfect} · GOOD ${P.good} · MISS ${P.miss} · 최대콤보 ${P.maxCombo} · 반응 ${(S.react || 0).toFixed(2)}s`, 480, 440, 13, '#cbd5e1');
  const msg = S.round === 2 ? (P.place <= 3 ? '메달 획득! 🎉' : '아쉬워요…') : S.adv ? `✅ ${SW_ROUNDS[S.round + 1].name} 진출!` : `❌ 탈락 (${R.adv}위 안 필요)`;
  g.text(msg, 480, 470, 20, S.adv || (S.round === 2 && P.place <= 3) ? '#4ade80' : '#f87171');
  if (S.resT > 1) g.text('클릭 / Space 로 계속', 480, 498, 13, '#94a3b8');
}
