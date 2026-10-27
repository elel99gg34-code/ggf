let S;
// 7세그먼트: a=1 b=2 c=4 d=8 e=16 f=32 g=64
const MP_DIG = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
const MP_OF = {}; MP_DIG.forEach((m, d) => (MP_OF[m] = d));
// 템플릿: n = 좌변 수들의 자릿수, r = 결과 자릿수
const MP_TPL = [
  { n: [1, 1], r: 1 }, { n: [1, 1], r: 2 }, { n: [2, 1], r: 2 }, { n: [2, 1], r: 1 },
  { n: [1, 1, 1], r: 1 }, { n: [2, 2], r: 2 }, { n: [2, 1, 1], r: 2 }, { n: [1, 2], r: 2 },
];
const MP_KIND = { move: '옮겨서', remove: '빼서', add: '더해서' };
GAME({
  title: '성냥개비 퍼즐', w: 960, h: 600, bg: '#1a0f08', controls: 'none',
  help: '틀린 식의 성냥개비를 옮기거나(빼거나/더해서) 올바른 식으로 만드세요\n이동: 성냥개비 클릭 → 빈 자리(점선) 클릭 · 빈 곳 클릭하면 제자리로\n빼기: 성냥 클릭 · 더하기: 빈 자리 클릭 · = 기호는 고정\nBackspace 되돌리기 · H 힌트 · N 건너뛰기(목숨 -1)\n30단계 클리어가 목표! 빨리 풀수록 보너스',
  init(g) {
    S = { lv: 1, lives: 3, slots: [], start: [], sol: [], held: null, hist: [], cfg: null, t: 60, tMax: 60, hint: 0, msg: '', msgT: 0, msgC: '#fff', solved: 0, wrongT: 0, done: false, doneT: 0, show: false, fire: 0, streak: 0, L: 52, T: 9, ox: 0, oy: 0 };
    newLevel(g);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt); S.wrongT = Math.max(0, S.wrongT - dt); S.fire = Math.max(0, S.fire - dt);
    g.info = `${S.lv}단계 / 30 · ${MP_KIND[S.cfg.kind]} ${S.cfg.K}개`;
    if (S.done) {
      S.doneT -= dt;
      if (S.fire > 0 && Math.random() < 0.5) { const p = randomStick(); if (p) g.burst(p.hx, p.hy, ['#f97316', '#facc15', '#ef4444'], 3, 60, 0.5, 4); }
      if (S.doneT <= 0 || (S.doneT < 1.2 && (g.mouse.clicked || g.pressed('a')))) {
        if (S.lives <= 0) { g.over(`${S.lv}단계에서 실패 · ${S.solved}문제 해결`); return; }
        if (S.lv >= 30) { g.win(`30단계 모두 클리어! 목숨 ${S.lives}개 남음`); return; }
        S.lv++; newLevel(g);
      }
      return;
    }
    S.t -= dt;
    if (S.t <= 0) { S.t = 0; fail(g, '⏰ 시간 초과!'); return; }
    const m = g.mouse;
    // 버튼
    if (g.clickIn(40, 520, 160, 54) || g.keyp('Backspace')) { undo(g); return; }
    if (g.clickIn(220, 520, 160, 54) || g.keyp('KeyC')) { resetLv(g); return; }
    if (g.clickIn(580, 520, 160, 54) || g.keyp('KeyH')) { useHint(g); return; }
    if (g.clickIn(760, 520, 160, 54) || g.keyp('KeyN')) { fail(g, '⏭ 건너뜀'); return; }
    if (!m.clicked) return;
    const kind = S.cfg.kind;
    const hit = hitTest(m.x, m.y, kind === 'move' ? (S.held ? 0 : 1) : kind === 'remove' ? 1 : undefined);
    if (kind === 'move') {
      if (S.held) {
        if (hit && !(S.slots[hit.i].m & hit.b)) { pushHist(); S.slots[hit.i].m |= hit.b; S.held = null; g.sfx.drop(); afterAction(g); }
        else if (!hit) { S.slots[S.held.i].m |= S.held.b; S.held = null; S.hist.pop(); g.sfx.move(); }
      } else if (hit && (S.slots[hit.i].m & hit.b)) {
        pushHist(); S.slots[hit.i].m &= ~hit.b; S.held = { i: hit.i, b: hit.b }; g.sfx.click();
      }
    } else if (kind === 'remove') {
      if (hit && (S.slots[hit.i].m & hit.b)) {
        if (removedCount() >= S.cfg.K) { say('더 뺄 수 없어요! 되돌리기를 사용하세요', '#fca5a5'); g.sfx.beep(200, 0.1); return; }
        pushHist(); S.slots[hit.i].m &= ~hit.b; const r = stickRect(hit.i, hit.b); g.burst(r.x + r.w / 2, r.y + r.h / 2, '#d6a35c', 10, 150, 0.5, 3); g.sfx.pop(); afterAction(g);
      }
    } else {
      if (hit) {
        const on = S.slots[hit.i].m & hit.b, orig = S.start[hit.i] & hit.b;
        if (!on) {
          if (addedCount() >= S.cfg.K) { say('추가할 성냥이 없어요!', '#fca5a5'); g.sfx.beep(200, 0.1); return; }
          pushHist(); S.slots[hit.i].m |= hit.b; g.sfx.drop(); afterAction(g);
        } else if (!orig) { pushHist(); S.slots[hit.i].m &= ~hit.b; g.sfx.move(); }
      }
    }
  },
  draw(g, c) {
    // 나무 테이블
    for (let i = 0; i < 10; i++) g.rect(0, i * 60, 960, 60, i % 2 ? '#3b2414' : '#40281a');
    for (let i = 0; i < 10; i++) g.line(0, i * 60, 960, i * 60, 'rgba(0,0,0,.25)', 2);
    // HUD
    g.rrect(16, 12, 928, 64, 14, 'rgba(0,0,0,.45)');
    g.text(`🔥 ${S.lv}단계`, 36, 44, 24, '#fdba74', 'left');
    g.text(`성냥개비 ${S.cfg.K}개를 ${MP_KIND[S.cfg.kind]} 올바른 식을 만드세요`, 480, 44, 22, '#fff7ed');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '🧡' : '🖤', 850 + i * 30, 44, 22);
    const tr = S.t / S.tMax;
    g.rrect(16, 84, 928, 10, 5, 'rgba(0,0,0,.4)');
    g.rrect(16, 84, Math.max(10, 928 * tr), 10, 5, tr < 0.25 ? '#ef4444' : '#f59e0b');
    g.text(`${Math.ceil(S.t)}초`, 930, 108, 14, '#fed7aa', 'right');
    // 사용량 표시
    const used = S.cfg.kind === 'move' ? movedCount() : S.cfg.kind === 'remove' ? removedCount() : addedCount();
    g.text(`사용 ${used} / ${S.cfg.K}`, 36, 108, 16, used > S.cfg.K ? '#f87171' : '#fde68a', 'left');
    if (S.cfg.kind === 'add') { for (let i = 0; i < S.cfg.K - addedCount(); i++) drawStick(g, 790 - i * 20, 130, 9, 60, false, false); g.text('남은 성냥', 760, 112, 14, '#fed7aa', 'right'); }
    // 판
    const sx = S.wrongT > 0 ? Math.sin(S.wrongT * 60) * 8 : 0;
    c.save(); c.translate(sx, 0);
    const pl = S.layout;
    g.rrect(pl.x0 - 30, S.oy - 34, pl.wTot + 60, S.L * 2 + S.T * 3 + 68, 22, 'rgba(0,0,0,.28)', S.done && !S.failed ? '#facc15' : 'rgba(255,255,255,.08)', 3);
    const showGhost = (S.cfg.kind === 'move' && S.held) || S.cfg.kind === 'add';
    const hov = !S.done ? hitTest(g.mouse.x, g.mouse.y, S.cfg.kind === 'move' ? (S.held ? 0 : 1) : S.cfg.kind === 'remove' ? 1 : undefined) : null;
    for (let i = 0; i < S.slots.length; i++) {
      const sl = S.slots[i];
      for (const b of bitsOf(sl.k)) {
        const r = stickRect(i, b), on = sl.m & b;
        const isHov = hov && hov.i === i && hov.b === b;
        if (on) {
          const hl = (S.hint >= 1 && (S.start[i] & b) && !(S.sol[i] & b) && !S.done) || (isHov && sl.k !== 'E' && S.cfg.kind !== 'add');
          drawStick(g, r.x, r.y, r.w, r.h, hl, sl.k === 'E', S.fire > 0 && sl.k !== 'E');
        } else if (sl.k !== 'E') {
          const hintTo = S.hint >= 2 && (S.sol[i] & b) && !S.done;
          if (showGhost || hintTo) {
            c.setLineDash([5, 5]);
            g.rrect(r.x, r.y, r.w, r.h, 4, isHov ? 'rgba(253,224,71,.35)' : hintTo ? 'rgba(74,222,128,.35)' : null, isHov ? '#fde047' : hintTo ? '#4ade80' : 'rgba(255,255,255,.22)', 2);
            c.setLineDash([]);
          }
        }
      }
    }
    c.restore();
    // 들고 있는 성냥
    if (S.held) { const r = stickRect(S.held.i, S.held.b); drawStick(g, g.mouse.x - r.w / 2, g.mouse.y - r.h / 2, r.w, r.h, true, false); }
    // 식 해석 표시
    const ev = evalStr(S.slots);
    g.text(ev.txt, 480, 452, 22, ev.ok ? '#86efac' : ev.valid ? '#fca5a5' : '#a8a29e');
    // 버튼
    g.button(40, 520, 160, 54, '↶ 되돌리기', '#57534e', 18);
    g.button(220, 520, 160, 54, '⟲ 처음으로', '#57534e', 18);
    g.button(580, 520, 160, 54, `💡 힌트 ${S.hint}/2`, '#a16207', 18);
    g.button(760, 520, 160, 54, '⏭ 건너뛰기', '#7f1d1d', 18);
    g.text(`해결 ${S.solved} · 연속 ${S.streak}`, 480, 547, 16, '#fed7aa');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT * 2); g.rrect(250, 470, 460, 38, 12, 'rgba(0,0,0,.7)'); g.text(S.msg, 480, 489, 18, S.msgC); c.globalAlpha = 1; }
    if (S.done) {
      g.rrect(280, 128, 400, 54, 16, S.failed ? 'rgba(127,29,29,.92)' : 'rgba(22,101,52,.92)', '#fde68a', 2);
      g.text(S.failed ? `${S.failMsg} · 정답을 확인하세요` : '🎉 정답! 불이 붙었다!', 480, 155, 22, '#fff');
      if (S.doneT < 1.2) g.text('클릭 / Space 로 다음', 480, 200, 15, '#fde68a');
    }
  },
});
function bitsOf(k) { return k === 'D' ? [1, 2, 4, 8, 16, 32, 64] : k === 'O' ? [2, 1] : [1, 2]; }
function cfgFor(lv) {
  if (lv <= 5) return { kind: 'move', K: 1, tpls: [0], time: 70 };
  if (lv <= 8) return { kind: lv % 2 ? 'remove' : 'add', K: 1, tpls: [0, 1], time: 60 };
  if (lv <= 13) return { kind: 'move', K: 1, tpls: [1, 2, 3, 7], time: 80 };
  if (lv <= 16) return { kind: U.choice(['add', 'remove', 'move']), K: 1, tpls: [2, 3, 4], time: 75 };
  if (lv <= 21) return { kind: 'move', K: 1, tpls: [4, 5, 6], time: 90 };
  if (lv <= 25) return { kind: lv % 2 ? 'move' : U.choice(['add', 'remove']), K: 2, tpls: [0, 1, 7], time: 130 };
  return { kind: 'move', K: 2, tpls: [2, 3, 4, 5], time: 150 };
}
function genEq(tpl) {
  for (let t = 0; t < 400; t++) {
    const nums = tpl.n.map((len) => (len === 1 ? U.randi(0, 9) : U.randi(10, 99)));
    const ops = nums.slice(1).map(() => (Math.random() < 0.5 ? '+' : '-'));
    let v = nums[0]; ops.forEach((o, i) => (v = o === '+' ? v + nums[i + 1] : v - nums[i + 1]));
    if (tpl.r === 1 ? v >= 0 && v <= 9 : v >= 10 && v <= 99) return { nums, ops, res: v };
  }
  return null;
}
function buildSlots(tpl, eq) {
  const sl = [];
  const pushNum = (n, len) => String(n).padStart(len, '0').split('').forEach((d) => sl.push({ k: 'D', m: MP_DIG[+d] }));
  eq.nums.forEach((n, i) => { if (i) sl.push({ k: 'O', m: eq.ops[i - 1] === '+' ? 3 : 1 }); pushNum(n, tpl.n[i]); });
  sl.push({ k: 'E', m: 3 });
  pushNum(eq.res, tpl.r);
  return sl;
}
function slotValid(sl) { return sl.k === 'D' ? MP_OF[sl.m] !== undefined : sl.k === 'O' ? sl.m === 1 || sl.m === 3 : true; }
function parse(slots) {
  // 반환: {valid, nums:[], ops:[], res}
  const groups = [[]], ops = [];
  let res = null;
  for (const s of slots) {
    if (!slotValid(s)) return { valid: false };
    if (s.k === 'D') groups[groups.length - 1].push(MP_OF[s.m]);
    else if (s.k === 'O') { ops.push(s.m === 3 ? '+' : '-'); groups.push([]); }
    else { groups.push([]); res = groups.length - 1; }
  }
  for (const gr of groups) if (gr.length > 1 && gr[0] === 0) return { valid: false };
  const vals = groups.map((gr) => +gr.join(''));
  const right = vals[res], left = vals.slice(0, res);
  let v = left[0]; ops.forEach((o, i) => (v = o === '+' ? v + left[i + 1] : v - left[i + 1]));
  return { valid: true, left, ops, right, v, ok: v === right };
}
function evalStr(slots) {
  const p = parse(slots);
  if (!p.valid) return { txt: '(올바르지 않은 숫자/기호가 있어요)', valid: false, ok: false };
  let s = '' + p.left[0]; p.ops.forEach((o, i) => (s += ` ${o} ${p.left[i + 1]}`));
  return { txt: `${s} = ${p.right}   ${p.ok ? '✔ 참' : '✘ 거짓 (' + s + ' = ' + p.v + ')'}`, valid: true, ok: p.ok };
}
function positions(slots) { const out = []; slots.forEach((s, i) => { if (s.k !== 'E') for (const b of bitsOf(s.k)) out.push([i, b]); }); return out; }
function genPuzzle(cfg) {
  for (let t = 0; t < 2000; t++) {
    const tpl = MP_TPL[U.choice(cfg.tpls)], eq = genEq(tpl);
    if (!eq) continue;
    const sol = buildSlots(tpl, eq);
    for (let k = 0; k < 60; k++) {
      const st = sol.map((s) => ({ k: s.k, m: s.m }));
      const pos = U.shuffle(positions(st));
      const on = pos.filter(([i, b]) => st[i].m & b), off = pos.filter(([i, b]) => !(st[i].m & b));
      if (on.length < cfg.K || off.length < cfg.K) break;
      // 정답 → 문제 로 거꾸로 변형
      if (cfg.kind === 'move' || cfg.kind === 'add') for (let j = 0; j < cfg.K; j++) { const [i, b] = on[j]; st[i].m &= ~b; }
      if (cfg.kind === 'move' || cfg.kind === 'remove') for (let j = 0; j < cfg.K; j++) { const [i, b] = off[j]; st[i].m |= b; }
      const p = parse(st);
      if (!p.valid || p.ok) continue;
      return { start: st, sol };
    }
  }
  return null;
}
function newLevel(g) {
  S.cfg = cfgFor(S.lv);
  let pz = genPuzzle(S.cfg);
  if (!pz) { S.cfg = { kind: 'move', K: 1, tpls: [0], time: 70 }; pz = genPuzzle(S.cfg); }
  S.slots = pz.start.map((s) => ({ k: s.k, m: s.m }));
  S.start = pz.start.map((s) => s.m);
  S.sol = pz.sol.map((s) => s.m);
  S.held = null; S.hist = []; S.hint = 0; S.done = false; S.failed = false;
  S.tMax = S.t = S.cfg.time;
  // 레이아웃
  const n = S.slots.length;
  S.L = n <= 5 ? 64 : n <= 7 ? 54 : 46; S.T = n <= 5 ? 11 : 9;
  const sw = S.L + 2 * S.T, gap = n <= 5 ? 40 : 26;
  S.layout = { sw, gap, wTot: n * sw + (n - 1) * gap, x0: 480 - (n * sw + (n - 1) * gap) / 2 };
  S.oy = 290 - (S.L * 2 + S.T * 3) / 2;
  say(`${S.lv}단계 · 성냥 ${S.cfg.K}개를 ${MP_KIND[S.cfg.kind]}!`, '#fde68a');
}
function stickRect(i, b) {
  const L = S.L, t = S.T, x0 = S.layout.x0 + i * (S.layout.sw + S.layout.gap), y0 = S.oy, k = S.slots[i].k;
  if (k === 'D') {
    switch (b) {
      case 1: return { x: x0 + t, y: y0, w: L, h: t };
      case 2: return { x: x0 + t + L, y: y0 + t, w: t, h: L };
      case 4: return { x: x0 + t + L, y: y0 + 2 * t + L, w: t, h: L };
      case 8: return { x: x0 + t, y: y0 + 2 * L + 2 * t, w: L, h: t };
      case 16: return { x: x0, y: y0 + 2 * t + L, w: t, h: L };
      case 32: return { x: x0, y: y0 + t, w: t, h: L };
      default: return { x: x0 + t, y: y0 + L + t, w: L, h: t };
    }
  }
  const yc = y0 + L + 1.5 * t;
  if (k === 'O') return b === 1 ? { x: x0 + t, y: yc - t / 2, w: L, h: t } : { x: x0 + t + L / 2 - t / 2, y: yc - L / 2, w: t, h: L };
  return b === 1 ? { x: x0 + t, y: yc - t / 2 - 13, w: L, h: t } : { x: x0 + t, y: yc - t / 2 + 13, w: L, h: t };
}
function hitTest(x, y, want) {
  // want: 1 = 놓인 성냥만, 0 = 빈 자리만, undefined = 모두
  let best = null, bd = 1e9;
  for (let i = 0; i < S.slots.length; i++) {
    if (S.slots[i].k === 'E') continue;
    for (const b of bitsOf(S.slots[i].k)) {
      if (want !== undefined && !!(S.slots[i].m & b) !== !!want) continue;
      const r = stickRect(i, b), pad = 7;
      if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) {
        const d = r.w > r.h ? Math.abs(y - (r.y + r.h / 2)) + Math.max(0, Math.abs(x - (r.x + r.w / 2)) - r.w / 2) : Math.abs(x - (r.x + r.w / 2)) + Math.max(0, Math.abs(y - (r.y + r.h / 2)) - r.h / 2);
        if (d < bd) { bd = d; best = { i, b }; }
      }
    }
  }
  return best;
}
function drawStick(g, x, y, w, h, hl, fixed, burning) {
  const c = g.ctx, horiz = w > h, t = horiz ? h : w;
  if (hl) { c.shadowColor = '#fde047'; c.shadowBlur = 16; }
  g.rrect(x + 2, y + 3, w, h, t / 2, 'rgba(0,0,0,.35)');
  g.rrect(x, y, w, h, t / 2, fixed ? '#c9a46a' : hl ? '#ffe2a8' : '#f2c98a', hl ? '#fde047' : '#9a6b33', 1.5);
  if (horiz) g.rect(x + t, y + t * 0.25, w - t * 2, t * 0.18, 'rgba(255,255,255,.25)');
  else g.rect(x + t * 0.25, y + t, t * 0.18, h - t * 2, 'rgba(255,255,255,.25)');
  c.shadowBlur = 0;
  // 머리
  const hx = horiz ? x + t * 0.9 : x + w / 2, hy = horiz ? y + h / 2 : y + t * 0.9;
  g.circle(hx, hy, t * 0.78, fixed ? '#7f1d1d' : '#b91c1c');
  g.circle(hx - t * 0.2, hy - t * 0.2, t * 0.25, 'rgba(255,255,255,.45)');
  if (burning) g.emoji('🔥', hx, hy - t * 0.9, t * 2.2);
}
function randomStick() {
  const on = positions(S.slots).filter(([i, b]) => S.slots[i].m & b);
  if (!on.length) return null;
  const [i, b] = U.choice(on), r = stickRect(i, b), horiz = r.w > r.h;
  return { hx: horiz ? r.x + 8 : r.x + r.w / 2, hy: horiz ? r.y + r.h / 2 : r.y + 8 };
}
function pushHist() { S.hist.push(S.slots.map((s) => s.m)); if (S.hist.length > 60) S.hist.shift(); }
function undo(g) {
  if (S.held) { S.slots[S.held.i].m |= S.held.b; S.held = null; S.hist.pop(); g.sfx.move(); return; }
  const h = S.hist.pop(); if (!h) return;
  h.forEach((m, i) => (S.slots[i].m = m)); g.sfx.move();
}
function resetLv(g) { if (S.held) S.held = null; S.start.forEach((m, i) => (S.slots[i].m = m)); S.hist = []; g.sfx.move(); say('처음 상태로 되돌렸어요', '#e7e5e4'); }
function movedCount() { let n = 0; S.slots.forEach((s, i) => { for (const b of bitsOf(s.k)) if ((S.start[i] & b) && !(s.m & b)) n++; }); return n - (S.held ? 1 : 0); }
function removedCount() { let n = 0; S.slots.forEach((s, i) => { for (const b of bitsOf(s.k)) if ((S.start[i] & b) && !(s.m & b)) n++; }); return n; }
function addedCount() { let n = 0; S.slots.forEach((s, i) => { for (const b of bitsOf(s.k)) if (!(S.start[i] & b) && (s.m & b)) n++; }); return n; }
function say(m, c) { S.msg = m; S.msgC = c || '#fff'; S.msgT = 2.2; }
function afterAction(g) {
  const kind = S.cfg.kind, used = kind === 'move' ? movedCount() : kind === 'remove' ? removedCount() : addedCount();
  const p = parse(S.slots);
  if (p.valid && p.ok && used <= S.cfg.K && used > 0 && (kind === 'move' || used === S.cfg.K)) { solve(g); return; }
  if (used > S.cfg.K) { say(`${S.cfg.K}개까지만 ${MP_KIND[kind]} 바꿀 수 있어요! 되돌리세요`, '#fca5a5'); g.sfx.beep(220, 0.12); return; }
  if (used === S.cfg.K) { S.wrongT = 0.4; g.sfx.hit(); say(p.valid ? '식이 맞지 않아요… 다시!' : '숫자 모양이 이상해요… 다시!', '#fca5a5'); }
}
function solve(g) {
  S.done = true; S.doneT = 2.6; S.fire = 2.2; S.solved++; S.streak++;
  let pts = 100 + S.lv * 25 + Math.floor(S.t * 3) + S.streak * 10;
  if (S.hint) pts = Math.floor(pts * (S.hint >= 2 ? 0.4 : 0.7));
  g.add(pts, 480, 240);
  g.sfx.win(); g.sfx.noise(0.4, 0.08);
  for (let k = 0; k < 8; k++) { const p = randomStick(); if (p) g.burst(p.hx, p.hy, ['#f97316', '#facc15', '#ef4444', '#fff7ed'], 14, 200, 0.8, 4); }
}
function fail(g, msg) {
  S.lives--; S.streak = 0; S.done = true; S.failed = true; S.failMsg = msg; S.doneT = 3.2; S.held = null;
  S.sol.forEach((m, i) => (S.slots[i].m = m));
  g.sfx.hit(); g.shake(8, 0.3);
}
function useHint(g) {
  if (S.hint >= 2) return;
  S.hint++; S.t = Math.max(1, S.t - 5); g.sfx.power();
  say(S.hint === 1 ? '빛나는 성냥을 확인하세요 (-5초)' : '초록 점선 자리를 확인하세요 (-5초)', '#fde68a');
}
