let S;
const TS = 48, OY = 96, RW = 16, RH = 10;
const DV = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
// 지상 3x3 맵
const OW = {
  '0,0': ['TTTTTTTTTTTTTTTT', 'T~~~...RRRRR...T', 'T~~....R.D.R...T', 'T~.....R...R....', 'T......RRRRR....', 'T...*.....*.....', 'T..*.*..........', 'T....T....*....T', 'T..T...*.......T', 'TTTTTT....TTTTTT'],
  '1,0': ['TTTTTTTTTTTTTTTT', 'T..*........*..T', 'T...~~~~~~~~...T', '....~......~....', '....~..F...~....', '....~~~..~~~....', 'T..............T', 'T..*........*..T', 'T..............T', 'TTTTTT....TTTTTT'],
  '2,0': ['TTTTTTTTTTTTTTTT', 'T....TTTTTT....T', 'T...TTT.D.TTT..T', '.....T.....T...T', '...............T', '......*..*.....T', '...*...........T', 'T.....*....*...T', 'T..*...........T', 'TTTTTT....TTTTTT'],
  '0,1': ['TTTTTT....TTTTTT', 'T..............T', 'T..TTTTTTTTTT..T', 'T..T........T...', 'T..T..M.....T...', 'T..T........T...', 'T..TTTT..TTTT...', 'T......*.......T', 'T..*........*..T', 'TTTTTT....TTTTTT'],
  '1,1': ['TTTTTT....TTTTTT', 'T....*....*....T', 'T..TT......TT..T', '...T...~~...T...', '.......~~.......', '.......~~.......', '...T........T...', 'T..TT......TT..T', 'T....*....*....T', 'TTTTTT....TTTTTT'],
  '2,1': ['TTTTTT....TTTTTT', 'T..............T', 'T.*.*.*..*.*.*.T', '...............T', '..****....****.T', '...............T', '...............T', 'T.*.*.*..*.*.*.T', 'T..............T', 'TTTTTT....TTTTTT'],
  '0,2': ['TTTTTT....TTTTTT', 'T~~~~..........T', 'T~~~...*..*....T', 'T~~.............', 'T~.....TT.......', 'T~.....TT.......', 'T~~.............', 'T~~~.....*..*..T', 'T~~~~~.........T', 'TTTTTTTTTTTTTTTT'],
  '1,2': ['TTTTTT....TTTTTT', 'T..............T', 'T..TTTTTTTTTT..T', '...T...O....T...', '...T........T...', '...TTTT..TTTT...', '................', 'T..*........*..T', 'T..............T', 'TTTTTTTTTTTTTTTT'],
  '2,2': ['TTTTTT....TTTTTT', 'T..............T', 'T.~~~~~~~~~~~~.T', '..~**********~.T', '..~*...C....*~.T', '..~*........*~.T', '..~**********~.T', 'T.~~~~~..~~~~~.T', 'T..............T', 'TTTTTTTTTTTTTTTT'],
};
const OWEN = { '0,0': ['moblin', 'moblin', 'octo', 'octo'], '2,0': ['moblin', 'moblin', 'moblin', 'slime', 'slime'], '1,1': ['octo', 'octo', 'octo', 'slime', 'slime'], '2,1': ['moblin', 'moblin', 'octo', 'octo', 'slime'], '0,2': ['slime', 'slime', 'slime', 'slime', 'octo'], '2,2': ['moblin', 'moblin', 'octo', 'octo'] };
const DUN = {
  d1: {
    n: '제1 던전: 용의 둥지', ow: '2,0', start: '1,1',
    edges: [['1,1', '0,1', 'open'], ['1,1', '2,1', 'open'], ['1,1', '1,0', 'lock'], ['1,0', '0,0', 'lock'], ['1,0', '2,0', 'boss']],
    rooms: {
      '1,1': { pat: 'pillars', ens: ['bat', 'bat', 'bat', 'slime'] },
      '0,1': { pat: 'center', ens: ['slime', 'slime', 'slime', 'skel'], reward: 'key' },
      '2,1': { pat: 'blocks', ens: ['skel', 'skel', 'skel', 'bat'], trap: true, reward: 'bow' },
      '1,0': { pat: 'water', ens: ['skel', 'skel', 'bat', 'bat', 'slime'], reward: 'key' },
      '0,0': { pat: 'blocks', ens: ['skel', 'bat', 'bat', 'skel', 'skel'], trap: true, reward: 'bosskey' },
      '2,0': { pat: 'plain', ens: [], trap: true, boss: 'dragon' },
    },
  },
  d2: {
    n: '제2 던전: 망령의 탑', ow: '0,0', start: '1,1',
    edges: [['1,1', '0,1', 'open'], ['1,1', '2,1', 'bomb'], ['1,1', '1,0', 'open'], ['1,0', '0,0', 'lock'], ['1,0', '2,0', 'boss']],
    rooms: {
      '1,1': { pat: 'pillars', ens: ['ghost', 'skel', 'skel', 'bat'] },
      '0,1': { pat: 'water', ens: ['ghost', 'ghost', 'skel', 'skel', 'bat'], trap: true, reward: 'key' },
      '2,1': { pat: 'plain', ens: [], reward: 'hc', secret: true },
      '1,0': { pat: 'blocks', ens: ['ghost', 'ghost', 'skel', 'skel', 'skel', 'bat'], trap: true },
      '0,0': { pat: 'center', ens: ['bat', 'bat', 'bat'], eye: true },
      '2,0': { pat: 'plain', ens: [], trap: true, boss: 'eye' },
    },
  },
};
const PAT = {
  plain: [], pillars: [[3, 2], [3, 7], [12, 2], [12, 7]], center: [[6, 3], [9, 3], [6, 6], [9, 6]],
  blocks: [[2, 2], [5, 2], [10, 2], [13, 2], [2, 7], [5, 7], [10, 7], [13, 7]],
  water: [[4, 2, 2], [4, 3, 2], [4, 6, 2], [4, 7, 2], [11, 2, 2], [11, 3, 2], [11, 6, 2], [11, 7, 2]],
};
const EN = {
  slime: { e: '🟢', hp: 1, dmg: 1, sp: 90, s: 30 }, octo: { e: '🐙', hp: 2, dmg: 1, sp: 60, s: 34 }, moblin: { e: '👹', hp: 3, dmg: 2, sp: 70, s: 36 },
  bat: { e: '🦇', hp: 1, dmg: 1, sp: 120, s: 30, fly: true }, skel: { e: '💀', hp: 3, dmg: 2, sp: 95, s: 34 }, ghost: { e: '👻', hp: 3, dmg: 2, sp: 50, s: 36, fly: true, ghost: true },
  dragon: { e: '🐉', hp: 14, dmg: 2, sp: 80, s: 90, boss: true }, eye: { e: '👁️', hp: 12, dmg: 2, sp: 90, s: 90, boss: true },
};
GAME({
  title: '전설의 검', w: 768, h: 576, bg: '#000', controls: 'dpad+ab', aLabel: '검', bLabel: '아이템',
  help: 'WASD/방향키 이동 · Space/Z 검 휘두르기 (체력이 가득하면 검기 발사)\nX/Shift = 아이템 사용 (🏹활 / 💣폭탄) · Q 또는 1/2 아이템 선택\n할아버지에게 검을 받고, 두 던전의 보스를 쓰러뜨려 트라이포스 조각 2개를 모으세요\n🗝️열쇠로 잠긴 문을, 💣폭탄으로 금 간 바위·벽을 부숴요 · 🧚요정 샘에서 회복',
  init(g) {
    S = {
      area: 'ow', rx: 1, ry: 2, rooms: {}, opened: {}, done: {},
      p: { x: 7.5 * TS, y: 7.5 * TS, dir: 'u', ifr: 0, kbx: 0, kby: 0, kbt: 0, swing: 0, hit: null, walk: 0 },
      hp: 6, max: 6, rupees: 0, earned: 0, keys: 0, bombs: 0, arrows: 0, sword: false, bow: false, bombBag: false, bosskey: {}, sel: 'bow', tri: 0, bosses: 0, kills: 0,
      ens: [], shots: [], drops: [], bombs_: [], trans: null, dlg: null, visited: {}, fade: 0, buyCd: 0,
    };
    enterRoom(g, null);
    say('👴 할아버지 동굴로 가 보자. (위쪽 건물 안)');
  },
  update(g, dt) {
    if (S.trans) { S.trans.t += dt / 0.45; if (S.trans.t >= 1) S.trans = null; return; }
    if (S.fade > 0) { S.fade -= dt; return; }
    const P = S.p;
    if (S.dlg) { S.dlg.t -= dt; if (S.dlg.t <= 0) S.dlg = null; }
    S.buyCd -= dt;
    // 아이템 선택
    if (g.keyp('KeyQ')) { const own = ownedItems(); if (own.length) { const i = own.indexOf(S.sel); S.sel = own[(i + 1) % own.length]; g.sfx.click(); } }
    if (g.keyp('Digit1') && S.bow) { S.sel = 'bow'; g.sfx.click(); }
    if (g.keyp('Digit2') && S.bombBag) { S.sel = 'bomb'; g.sfx.click(); }
    // 이동
    P.ifr -= dt;
    if (P.kbt > 0) { P.kbt -= dt; moveP(P.kbx * dt, P.kby * dt); }
    else if (P.swing <= 0) {
      let mx = g.right - g.left, my = g.down - g.up;
      if (g.mouse.down && !g.mouse.clicked) { const dx = g.mouse.x - P.x, dy = g.mouse.y - OY - P.y; if (Math.hypot(dx, dy) > 24) { if (Math.abs(dx) > Math.abs(dy)) mx = Math.sign(dx); else my = Math.sign(dy); } }
      if (mx || my) {
        if (mx && my) { mx *= 0.707; my *= 0.707; }
        if (Math.abs(mx) > Math.abs(my) || (!my)) P.dir = mx > 0 ? 'r' : 'l'; else P.dir = my > 0 ? 'd' : 'u';
        if (mx && my) P.dir = Math.abs(g.right - g.left) && P.dir.match(/[lr]/) ? P.dir : P.dir;
        moveP(mx * 160 * dt, my * 160 * dt);
        P.walk += dt;
      }
    }
    // 공격
    if (g.pressed('a') && P.swing <= 0 && S.sword) {
      P.swing = 0.26; P.hit = new Set(); g.sfx.tone(700, 0.08, 'triangle', 0.05, 300);
      if (S.hp >= S.max && !S.shots.some((s) => s.k === 'beam')) { const v = DV[P.dir]; S.shots.push({ k: 'beam', x: P.x + v[0] * 20, y: P.y + v[1] * 20, vx: v[0] * 420, vy: v[1] * 420, pl: true, dmg: 1, life: 2 }); }
    } else if (g.pressed('a') && !S.sword) say('검이 없어! 할아버지를 찾아가자.');
    if (g.pressed('b')) useItem(g);
    if (P.swing > 0) { P.swing -= dt; swordHit(g); }
    // 상호작용 / 문 / 전환
    interact(g, dt);
    if (S.trans || S.fade > 0) return;
    // 적
    for (const e of S.ens) enemyAI(g, e, dt);
    // 투사체
    for (const s of S.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.k === 'boom') continue;
      const tx = Math.floor(s.x / TS), ty = Math.floor(s.y / TS);
      if (tx < 0 || ty < 0 || tx >= RW || ty >= RH || (solidT(tx, ty, true) && tileAt(tx, ty) !== 2)) {
        if (s.k === 'arrow' && S.room.eye && !S.room.eyeHit && tx === 7 && ty <= 0) { eyeSwitch(g); }
        s.life = 0; if (s.pl) g.burst(s.x, s.y + OY, '#fde68a', 5, 80, 0.2, 3); continue;
      }
      if (s.pl) {
        if (s.k === 'arrow' && S.room.eye && !S.room.eyeHit && Math.abs(s.x - 7.5 * TS) < 30 && s.y < TS * 1.2) { eyeSwitch(g); s.life = 0; continue; }
        for (const e of S.ens) if (!e.dead && Math.abs(e.x - s.x) < e.s * 0.45 + 6 && Math.abs(e.y - s.y) < e.s * 0.45 + 6) { hitEnemy(g, e, s.k === 'arrow' ? 2 : s.dmg, s.vx, s.vy, s.k); s.life = 0; break; }
      } else if (Math.abs(P.x - s.x) < 16 && Math.abs(P.y - s.y) < 16) { hurtP(g, s.dmg, s.x - s.vx, s.y - s.vy); s.life = 0; }
    }
    S.shots = S.shots.filter((s) => s.life > 0);
    // 폭탄
    for (const b of S.bombs_) { b.t -= dt; if (b.t <= 0) explode(g, b); }
    S.bombs_ = S.bombs_.filter((b) => b.t > 0);
    S.ens = S.ens.filter((e) => !e.dead);
    // 방 클리어
    const R = S.room;
    if (!R.cleared && S.ens.length === 0 && R.spawned) {
      R.cleared = true;
      if (S.area !== 'ow') {
        S.done[R.key] = true;
        if (R.trap) g.sfx.tone(300, 0.2, 'square', 0.04, 600);
        if (R.spec.reward && !R.rewardGiven && !R.spec.secret) spawnReward(g, R);
      }
    }
    // 드롭 획득
    for (const d of S.drops) {
      d.t -= dt;
      if (Math.abs(d.x - P.x) < 24 && Math.abs(d.y - P.y) < 24) { d.t = 0; pick(g, d); }
    }
    S.drops = S.drops.filter((d) => d.t > 0);
    g.score = S.earned + S.kills * 10 + S.bosses * 1500 + (S.max - 6) * 100;
    g.info = `${S.area === 'ow' ? '하이랄 평원' : DUN[S.area].n} · 🔺 ${S.tri}/2`;
    if (S.hp <= 0) { g.sfx.lose(); g.over(`트라이포스 ${S.tri}/2 · 처치 ${S.kills}`); }
  },
  draw(g, c) {
    if (S.trans) {
      const T = S.trans, v = DV[T.dir], k = T.t;
      c.save(); c.translate(-v[0] * k * RW * TS, -v[1] * k * RH * TS); drawRoom(g, c, T.from, 0, 0); c.restore();
      c.save(); c.translate(v[0] * (1 - k) * RW * TS, v[1] * (1 - k) * RH * TS); drawRoom(g, c, S.room, 0, 0); c.restore();
    } else {
      drawRoom(g, c, S.room, 0, 0);
      drawEntities(g, c);
    }
    if (S.fade > 0) { c.globalAlpha = Math.min(1, S.fade * 2); g.rect(0, OY, g.W, g.H - OY, '#000'); c.globalAlpha = 1; }
    drawHud(g, c);
    if (S.dlg) {
      const n = Math.min(S.dlg.s.length, Math.floor((4 - S.dlg.t) * 40) + 1);
      g.rrect(40, g.H - 86, g.W - 80, 64, 10, 'rgba(0,0,0,.85)', '#fff', 2);
      g.text(S.dlg.s.slice(0, Math.max(1, n)), g.W / 2, g.H - 54, 17, '#fff');
    }
  },
});
function say(s) { S.dlg = { s, t: 4 }; }
function ownedItems() { const o = []; if (S.bow) o.push('bow'); if (S.bombBag) o.push('bomb'); return o; }
function tileAt(tx, ty) { return S.room.t[ty] ? S.room.t[ty][tx] : 1; }
function solidT(tx, ty, forShot) {
  if (tx < 0 || ty < 0 || tx >= RW || ty >= RH) return false;
  const t = S.room.t[ty][tx];
  if (t === 1 || t === 2 || t === 3 || t === 4 || t === 7 || t === 10 || t === 12 || t === 13) return true;
  if (S.room.trap && !S.room.cleared && S.room.doorT && S.room.doorT.some((d) => d[0] === tx && d[1] === ty)) return true;
  return false;
}
function boxHit(x, y, h, fn) {
  const x0 = Math.floor((x - h) / TS), x1 = Math.floor((x + h - 1) / TS), y0 = Math.floor((y - h) / TS), y1 = Math.floor((y + h - 1) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(tx, ty)) return [tx, ty];
  return null;
}
function moveP(dx, dy) {
  const P = S.p, h = 13;
  P.x += dx; let b = boxHit(P.x, P.y, h, solidT);
  if (b) { P.x -= dx; P.bump = b; if (!dy) { const cy = (b[1] + 0.5) * TS; const off = P.y - cy; if (Math.abs(off) > 20 && !boxHit(P.x + dx, P.y + Math.sign(off) * 4, h, solidT)) P.y += Math.sign(off) * 2; } }
  P.y += dy; b = boxHit(P.x, P.y, h, solidT);
  if (b) { P.y -= dy; P.bump = b; if (!dx) { const cx = (b[0] + 0.5) * TS; const off = P.x - cx; if (Math.abs(off) > 20 && !boxHit(P.x + Math.sign(off) * 4, P.y + dy, h, solidT)) P.x += Math.sign(off) * 2; } }
}
function roomKey(area, x, y) { return area + ':' + x + ',' + y; }
function edgeKey(area, a, b) { return area + ':' + [a, b].sort().join('|'); }
function getRoom(area, x, y) {
  const key = roomKey(area, x, y);
  if (S.rooms[key]) return S.rooms[key];
  const R = { key, area, x, y, t: [], npcs: [], chest: null, spec: {}, doorT: [], doors: {} };
  if (area === 'ow') {
    OW[x + ',' + y].forEach((row, ty) => {
      R.t.push([...row].map((ch, tx) => {
        if (ch === 'T') return 1; if (ch === '~') return 2; if (ch === '*') return 3; if (ch === 'R') return 4; if (ch === 'D') return 6;
        if (ch === 'O') { R.npcs.push({ k: 'old', x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }); R.npcs.push({ k: 'sword', x: (tx + 0.5) * TS, y: (ty + 1.6) * TS }); R.npcs.push({ k: 'fire', x: (tx - 2.5) * TS, y: (ty + 0.5) * TS }); R.npcs.push({ k: 'fire', x: (tx + 3.5) * TS, y: (ty + 0.5) * TS }); }
        if (ch === 'M') { R.npcs.push({ k: 'shop', x: (tx + 1.5) * TS, y: (ty + 0.5) * TS }); [['bomb', 20], ['arrow', 15], ['heart', 10]].forEach((it, i) => R.npcs.push({ k: 'ware', w: it[0], price: it[1], x: (tx - 0.5 + i * 2) * TS, y: (ty + 1.7) * TS })); }
        if (ch === 'F') R.npcs.push({ k: 'fairy', x: (tx + 1) * TS, y: (ty + 0.5) * TS });
        if (ch === 'C') R.chest = { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS, c: 'hc', open: false };
        return 0;
      }));
    });
    R.spec = { ens: OWEN[x + ',' + y] || [] };
  } else {
    const D = DUN[area], sp = D.rooms[x + ',' + y];
    R.spec = sp; R.trap = !!sp.trap;
    for (let ty = 0; ty < RH; ty++) { const row = []; for (let tx = 0; tx < RW; tx++) row.push(tx === 0 || ty === 0 || tx === RW - 1 || ty === RH - 1 ? 1 : 0); R.t.push(row); }
    for (const p of PAT[sp.pat]) R.t[p[1]][p[0]] = p[2] === 2 ? 2 : 7;
    const doorTiles = { u: [[7, 0], [8, 0]], d: [[7, 9], [8, 9]], l: [[0, 4], [0, 5]], r: [[15, 4], [15, 5]] };
    const me = x + ',' + y;
    for (const [a, b, type] of D.edges) {
      if (a !== me && b !== me) continue;
      const o = a === me ? b : a, [ox, oy] = o.split(',').map(Number);
      const dir = ox < x ? 'l' : ox > x ? 'r' : oy < y ? 'u' : 'd';
      const ek = edgeKey(area, a, b), open = type === 'open' || S.opened[ek];
      const code = open ? 0 : type === 'lock' ? 10 : type === 'boss' ? 12 : 13;
      R.doors[dir] = { type, ek, code };
      for (const [tx, ty] of doorTiles[dir]) { R.t[ty][tx] = code; R.doorT.push([tx, ty, dir]); }
    }
    if (me === D.start) { for (const [tx, ty] of doorTiles.d) R.t[ty][tx] = 0; R.doors.d = { type: 'exit', code: 0 }; }
    if (sp.secret) R.chest = { x: 7.5 * TS, y: 4.5 * TS, c: 'hc', open: false, rupees: 50 };
    R.cleared = !!S.done[key];
  }
  S.rooms[key] = R;
  return R;
}
function enterRoom(g, fromDir) {
  const R = getRoom(S.area, S.rx, S.ry);
  S.room = R; S.visited[R.key] = true;
  S.ens = []; S.shots = []; S.drops = []; S.bombs_ = [];
  R.spawned = false;
  const done = S.area !== 'ow' && S.done[R.key];
  if (!done) {
    for (const k of R.spec.ens || []) spawnEnemy(k);
    if (R.spec.boss) { const b = mkEnemy(R.spec.boss, 12 * TS, 4.5 * TS); if (R.spec.boss === 'eye') { b.x = 7.5 * TS; b.y = 2.2 * TS; } S.ens.push(b); say(R.spec.boss === 'dragon' ? '🐉 용 아쿠아멘투스가 나타났다!' : '👁️ 거대한 눈 고마! 눈을 뜰 때 화살을 쏴라!'); g.sfx.tone(90, 1, 'sawtooth', 0.07, 60); }
  }
  R.spawned = true;
  R.cleared = S.ens.length === 0 ? (S.area === 'ow' || done || !R.spec.reward || R.rewardGiven ? true : R.cleared) : false;
  if (S.area !== 'ow' && S.ens.length === 0 && !R.cleared) R.cleared = false;
  if (R.trap && S.ens.length && g) g.sfx.tone(140, 0.25, 'square', 0.05, 80);
}
function freeSpot() {
  for (let i = 0; i < 80; i++) {
    const tx = U.randi(2, RW - 3), ty = U.randi(2, RH - 3);
    if (solidT(tx, ty) || tileAt(tx, ty) === 6) continue;
    const x = (tx + 0.5) * TS, y = (ty + 0.5) * TS;
    if (U.dist(x, y, S.p.x, S.p.y) < 170) continue;
    return [x, y];
  }
  return [RW * TS / 2, RH * TS / 2];
}
function mkEnemy(k, x, y) { const d = EN[k]; return { k, x, y, hp: d.hp, max: d.hp, s: d.s, dir: U.choice(['u', 'd', 'l', 'r']), mt: U.rand(0.5, 1.5), cd: U.rand(1, 3), kbt: 0, kbx: 0, kby: 0, flash: 0, ph: U.rand(0, 6), st: 0, open: 0 }; }
function spawnEnemy(k) { const [x, y] = freeSpot(); S.ens.push(mkEnemy(k, x, y)); }
function eSolid(e) { return (tx, ty) => tx < 1 || ty < 1 || tx >= RW - 1 || ty >= RH - 1 || solidT(tx, ty) || tileAt(tx, ty) === 6; }
function eMove(e, dx, dy) {
  const d = EN[e.k], h = Math.min(20, e.s * 0.4);
  if (d.fly) { e.x = U.clamp(e.x + dx, TS + h, (RW - 1) * TS - h); e.y = U.clamp(e.y + dy, TS + h, (RH - 1) * TS - h); return false; }
  let blocked = false; const fn = eSolid(e);
  e.x += dx; if (boxHit(e.x, e.y, h, fn)) { e.x -= dx; blocked = true; }
  e.y += dy; if (boxHit(e.x, e.y, h, fn)) { e.y -= dy; blocked = true; }
  return blocked;
}
function enemyAI(g, e, dt) {
  const d = EN[e.k], P = S.p;
  e.flash -= dt; e.ph += dt;
  if (e.kbt > 0) { e.kbt -= dt; eMove(e, e.kbx * dt, e.kby * dt); return; }
  if (e.stun > 0) { e.stun -= dt; return; }
  e.mt -= dt; e.cd -= dt;
  const dxp = P.x - e.x, dyp = P.y - e.y;
  if (e.k === 'slime') {
    if (e.mt <= 0) { e.mt = U.rand(0.7, 1.4); e.hop = 0.4; e.dir = Math.random() < 0.55 ? (Math.abs(dxp) > Math.abs(dyp) ? (dxp > 0 ? 'r' : 'l') : (dyp > 0 ? 'd' : 'u')) : U.choice(['u', 'd', 'l', 'r']); }
    if (e.hop > 0) { e.hop -= dt; const v = DV[e.dir]; eMove(e, v[0] * d.sp * dt, v[1] * d.sp * dt); }
  } else if (e.k === 'octo' || e.k === 'moblin' || e.k === 'skel') {
    if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0 && e.k === 'octo') shootE(e, 'rock', 210, 1); }
    else {
      const v = DV[e.dir];
      const bl = eMove(e, v[0] * d.sp * dt, v[1] * d.sp * dt);
      if (bl || e.mt <= 0) { e.mt = U.rand(0.8, 2); e.dir = Math.random() < 0.4 ? (Math.abs(dxp) > Math.abs(dyp) ? (dxp > 0 ? 'r' : 'l') : (dyp > 0 ? 'd' : 'u')) : U.choice(['u', 'd', 'l', 'r']); }
      if (e.k === 'octo' && e.cd <= 0) { e.cd = U.rand(2, 3.5); e.wait = 0.5; }
      if (e.k === 'moblin' && e.cd <= 0 && (Math.abs(dxp) < 20 || Math.abs(dyp) < 20)) { e.dir = Math.abs(dxp) > Math.abs(dyp) ? (dxp > 0 ? 'r' : 'l') : (dyp > 0 ? 'd' : 'u'); e.cd = 2.2; shootE(e, 'spear', 270, 2); }
    }
  } else if (e.k === 'bat') {
    if (e.mt <= 0) { e.mt = U.rand(0.5, 1.2); e.ang = Math.random() < 0.4 ? Math.atan2(dyp, dxp) : U.rand(0, Math.PI * 2); }
    eMove(e, Math.cos(e.ang || 0) * d.sp * dt + Math.sin(e.ph * 8) * 40 * dt, Math.sin(e.ang || 0) * d.sp * dt);
  } else if (e.k === 'ghost') {
    const a = Math.atan2(dyp, dxp); eMove(e, Math.cos(a) * d.sp * dt, Math.sin(a) * d.sp * dt);
  } else if (e.k === 'dragon') {
    if (!e.ty || Math.abs(e.y - e.ty) < 5) e.ty = U.rand(2, 7) * TS;
    e.y += Math.sign(e.ty - e.y) * d.sp * dt;
    e.x = 12 * TS + Math.sin(e.ph * 0.7) * 30;
    if (e.cd <= 0) {
      e.cd = e.hp < 7 ? 1.3 : 2;
      const a = Math.atan2(dyp, dxp);
      for (const o of e.hp < 7 ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.3, 0, 0.3]) S.shots.push({ k: 'fire', x: e.x - 30, y: e.y - 10, vx: Math.cos(a + o) * 220, vy: Math.sin(a + o) * 220, dmg: 2, life: 4 });
      g.sfx.tone(160, 0.3, 'sawtooth', 0.04, 80);
    }
  } else if (e.k === 'eye') {
    e.x = 7.5 * TS + Math.sin(e.ph * 0.6) * 5 * TS;
    e.st += dt;
    const cyc = e.st % 4;
    e.open = cyc > 2.4 ? 1 : 0;
    if (e.cd <= 0) {
      e.cd = e.hp < 6 ? 1.6 : 2.4;
      const a = Math.atan2(dyp, dxp);
      S.shots.push({ k: 'tear', x: e.x, y: e.y + 30, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: 2, life: 4 });
      if (Math.random() < 0.4 && S.ens.length < 5) { const b = mkEnemy('bat', e.x, e.y + 40); S.ens.push(b); }
    }
  }
  // 접촉 피해
  if (Math.abs(dxp) < e.s * 0.4 + 12 && Math.abs(dyp) < e.s * 0.4 + 12) hurtP(g, d.dmg, e.x, e.y);
}
function shootE(e, k, sp, dmg) { const v = DV[e.dir]; S.shots.push({ k, x: e.x + v[0] * 16, y: e.y + v[1] * 16, vx: v[0] * sp, vy: v[1] * sp, dmg, life: 3, dir: e.dir }); }
function hurtP(g, dmg, fx, fy) {
  const P = S.p;
  if (P.ifr > 0) return;
  S.hp -= dmg; P.ifr = 1; P.kbt = 0.16;
  const a = Math.atan2(P.y - fy, P.x - fx); P.kbx = Math.cos(a) * 320; P.kby = Math.sin(a) * 320;
  g.sfx.hit(); g.shake(5, 0.2);
  if (S.hp > 0 && S.hp <= 2) g.sfx.tone(880, 0.1, 'square', 0.04);
}
function swordRect() {
  const P = S.p, v = DV[P.dir];
  if (v[0]) return { x: v[0] > 0 ? P.x + 8 : P.x - 50, y: P.y - 14, w: 42, h: 28 };
  return { x: P.x - 14, y: v[1] > 0 ? P.y + 8 : P.y - 50, w: 28, h: 42 };
}
function swordHit(g) {
  const r = swordRect(), P = S.p;
  for (const e of S.ens) {
    if (P.hit.has(e) || e.dead) continue;
    const h = e.s * 0.42;
    if (U.rectHit(r, { x: e.x - h, y: e.y - h, w: h * 2, h: h * 2 })) { P.hit.add(e); hitEnemy(g, e, 1, DV[P.dir][0] * 300, DV[P.dir][1] * 300, 'sword'); }
  }
  // 수풀 베기
  const x0 = Math.floor(r.x / TS), x1 = Math.floor((r.x + r.w) / TS), y0 = Math.floor(r.y / TS), y1 = Math.floor((r.y + r.h) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, ty) === 3) {
    S.room.t[ty][tx] = 0; g.burst((tx + 0.5) * TS, (ty + 0.5) * TS + OY, ['#4ade80', '#166534'], 10, 120, 0.4, 4); g.sfx.tone(300, 0.05, 'triangle', 0.03);
    const r2 = Math.random(); if (r2 < 0.25) drop('rupee', (tx + 0.5) * TS, (ty + 0.5) * TS); else if (r2 < 0.35) drop('heart', (tx + 0.5) * TS, (ty + 0.5) * TS);
  }
  // 상자 열기 (검으로 쳐도)
}
function hitEnemy(g, e, dmg, vx, vy, src) {
  const d = EN[e.k];
  if (e.inv > g.time) return;
  if (e.k === 'eye' && !e.open) { g.sfx.tone(200, 0.05, 'square', 0.03); return; }
  if (e.k === 'eye' && src === 'sword') dmg = 0.5;
  e.hp -= dmg; e.flash = 0.15; e.inv = g.time + (d.boss ? 0.35 : 0.1);
  if (!d.boss) { const l = Math.hypot(vx, vy) || 1; e.kbx = vx / l * 340; e.kby = vy / l * 340; e.kbt = 0.13; }
  g.sfx.tone(d.boss ? 150 : 400, 0.06, 'square', 0.05, 120);
  if (e.hp <= 0) {
    e.dead = true; S.kills++;
    g.burst(e.x, e.y + OY, ['#fff', '#fca5a5', '#fde68a'], d.boss ? 60 : 14, d.boss ? 300 : 160, 0.6, 4);
    g.sfx.explode();
    if (d.boss) {
      g.shake(14, 0.6); S.bosses++;
      for (const o of S.ens) if (o !== e) o.dead = true;
      drop('hc', e.x - 30, e.y); drop('tri', e.x + 30, e.y);
      say('보스를 쓰러뜨렸다! ❤️ 하트 그릇과 🔺 트라이포스 조각을 얻자!');
    } else {
      const r = Math.random();
      if (r < 0.3) drop('rupee', e.x, e.y); else if (r < 0.45) drop('heart', e.x, e.y); else if (r < 0.52 && S.bombBag) drop('bombs', e.x, e.y); else if (r < 0.6 && S.bow) drop('arrows', e.x, e.y); else if (r < 0.64) drop('rupee5', e.x, e.y);
    }
  }
}
function drop(k, x, y) { S.drops.push({ k, x, y, t: ['rupee', 'rupee5', 'heart', 'bombs', 'arrows'].includes(k) ? 9 : 1e9 }); }
function pick(g, d) {
  const sx = d.x, sy = d.y + OY;
  if (d.k === 'rupee' || d.k === 'rupee5') { const n = d.k === 'rupee' ? 1 : 5; S.rupees = Math.min(255, S.rupees + n); S.earned += n * 5; g.sfx.coin(); g.float(sx, sy, '+' + n + '💎', '#4ade80', 16); }
  else if (d.k === 'heart') { S.hp = Math.min(S.max, S.hp + 2); g.sfx.tone(1000, 0.08, 'sine', 0.05, 1400); }
  else if (d.k === 'bombs') { S.bombs = Math.min(16, S.bombs + 4); g.sfx.coin(); }
  else if (d.k === 'arrows') { S.arrows = Math.min(40, S.arrows + 5); g.sfx.coin(); }
  else if (d.k === 'key') { S.keys++; g.sfx.power(); say('🗝️ 작은 열쇠를 얻었다!'); }
  else if (d.k === 'hc') { S.max += 2; S.hp = S.max; g.sfx.win(); say('❤️ 하트 그릇! 최대 체력이 늘었다.'); g.float(sx, sy, '최대 체력 UP', '#f87171', 22); }
  else if (d.k === 'tri') {
    S.tri++; g.sfx.win(); g.add(2000); g.burst(sx, sy, ['#fde047', '#facc15', '#fff'], 50, 260, 1, 5);
    if (S.tri >= 2) { say('🔺🔺 트라이포스 조각을 모두 모았다! 하이랄에 평화가...'); g.later(() => g.win(`트라이포스 완성! 하트 ${S.max / 2} · 처치 ${S.kills}`), 2); }
    else say('🔺 트라이포스 조각 1/2! 다음은 북서쪽 바위 너머 제2 던전이다. (💣 필요)');
  }
}
function spawnReward(g, R) {
  R.rewardGiven = true;
  const rw = R.spec.reward;
  if (rw === 'key') { drop('key', 7.5 * TS, 4.5 * TS); g.sfx.tone(1200, 0.3, 'sine', 0.05, 1600); }
  else { R.chest = { x: 7.5 * TS, y: 4.5 * TS, c: rw, open: false }; g.sfx.tone(600, 0.4, 'triangle', 0.05, 1200); say('어딘가에서 상자가 나타났다!'); }
}
function eyeSwitch(g) {
  S.room.eyeHit = true; g.sfx.power(); g.shake(4, 0.2);
  S.room.chest = { x: 7.5 * TS, y: 5 * TS, c: 'bosskey', open: false };
  say('👁️ 눈 석상에 화살이 꽂히자 상자가 나타났다!');
}
function interact(g, dt) {
  const P = S.p, R = S.room;
  // 상자
  const ch = R.chest;
  if (ch && !ch.open && Math.abs(ch.x - P.x) < 34 && Math.abs(ch.y - P.y) < 34) {
    ch.open = true; g.sfx.win();
    if (ch.c === 'hc') { S.max += 2; S.hp = S.max; say('❤️ 하트 그릇을 얻었다! 최대 체력 +1'); if (ch.rupees) { S.rupees = Math.min(255, S.rupees + ch.rupees); S.earned += 100; } }
    if (ch.c === 'bow') { S.bow = true; S.arrows += 20; S.sel = 'bow'; say('🏹 활을 얻었다! X로 화살 발사 (화살 20개)'); }
    if (ch.c === 'bosskey') { S.bosskey[S.area] = true; say('🔑 보스 열쇠를 얻었다! 해골 문을 열 수 있다.'); }
    g.add(100, ch.x, ch.y + OY - 30);
  }
  // NPC
  for (const n of R.npcs) {
    const near = Math.abs(n.x - P.x) < 36 && Math.abs(n.y - P.y) < 36;
    if (n.k === 'sword' && !S.sword && near) { S.sword = true; n.gone = true; g.sfx.win(); say('🗡️ 검을 얻었다! Space로 휘두르자. 북동쪽 던전으로 가거라!'); }
    if (n.k === 'old' && !S.sword && U.dist(n.x, n.y, P.x, P.y) < 120 && (!S.dlg || S.dlg.s[0] !== '혼')) say('혼자 가면 위험하단다! 이 검을 가져가렴.');
    if (n.k === 'fairy' && U.dist(n.x, n.y, P.x, P.y) < 50 && S.hp < S.max) { S.hp = Math.min(S.max, S.hp + dt * 6); if (g.frame % 10 === 0) g.sfx.tone(1200 + Math.random() * 400, 0.05, 'sine', 0.03); }
    if (n.k === 'ware' && near && S.buyCd <= 0) {
      S.buyCd = 1;
      if (S.rupees < n.price) { say(`💎 ${n.price}루피가 필요해!`); g.sfx.tone(150, 0.1, 'square', 0.04); }
      else {
        S.rupees -= n.price; g.sfx.coin();
        if (n.w === 'bomb') { S.bombBag = true; S.bombs = Math.min(16, S.bombs + 4); if (!S.bow) S.sel = 'bomb'; say('💣 폭탄 4개 구입! X로 설치, 금 간 바위를 부술 수 있어.'); }
        if (n.w === 'arrow') { S.arrows = Math.min(40, S.arrows + 10); say('🪶 화살 10개 구입!'); }
        if (n.w === 'heart') { S.hp = S.max; say('❤️ 체력이 모두 회복됐다!'); }
      }
    }
  }
  // 문 열기 (부딪힌 타일)
  if (P.bump) {
    const [bx, by] = P.bump; P.bump = null;
    const t = tileAt(bx, by);
    if (t === 10 || t === 12) {
      const dd = R.doorT.find((d) => d[0] === bx && d[1] === by); const door = dd && R.doors[dd[2]];
      if (door) {
        if (t === 10 && S.keys > 0) { S.keys--; openDoor(g, door); }
        else if (t === 12 && S.bosskey[S.area]) openDoor(g, door);
        else if (!S.dlg) say(t === 10 ? '🔒 잠겨 있다. 작은 열쇠가 필요하다.' : '💀 보스 열쇠가 필요하다.');
      }
    }
  }
  // 던전 입구
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  if (S.area === 'ow' && tileAt(tx, ty) === 6) {
    const key = S.rx + ',' + S.ry, d = Object.keys(DUN).find((k) => DUN[k].ow === key);
    if (d) { S.area = d; const [sx, sy] = DUN[d].start.split(',').map(Number); S.rx = sx; S.ry = sy; P.x = 7.5 * TS + 24; P.y = 8.3 * TS; P.dir = 'u'; S.fade = 0.5; enterRoom(g, 'u'); say(DUN[d].n); g.sfx.tone(200, 0.5, 'triangle', 0.05, 100); return; }
  }
  // 방 이동
  let dir = null;
  if (P.x < 0) dir = 'l'; else if (P.x > RW * TS) dir = 'r'; else if (P.y < 0) dir = 'u'; else if (P.y > RH * TS) dir = 'd';
  if (!dir) return;
  if (S.area === 'ow' && !S.sword) { P.x = U.clamp(P.x, 20, RW * TS - 20); P.y = U.clamp(P.y, 20, RH * TS - 20); say('먼저 할아버지에게서 검을 받자!'); return; }
  const from = S.room;
  if (S.area !== 'ow' && dir === 'd' && from.doors.d && from.doors.d.type === 'exit') {
    const D = DUN[S.area]; const [ox, oy] = D.ow.split(',').map(Number);
    S.area = 'ow'; S.rx = ox; S.ry = oy;
    const R2 = getRoom('ow', ox, oy);
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (R2.t[y][x] === 6) { P.x = (x + 0.5) * TS; P.y = (y + 1.5) * TS; }
    P.dir = 'd'; S.fade = 0.5; enterRoom(g, 'd'); return;
  }
  const v = DV[dir];
  S.rx += v[0]; S.ry += v[1];
  if (dir === 'l') P.x += RW * TS; if (dir === 'r') P.x -= RW * TS; if (dir === 'u') P.y += RH * TS; if (dir === 'd') P.y -= RH * TS;
  if (dir === 'l' || dir === 'r') P.x = U.clamp(P.x, 14, RW * TS - 14); else P.y = U.clamp(P.y, 14, RH * TS - 14);
  S.trans = { from, dir, t: 0 };
  enterRoom(g, dir);
}
function openDoor(g, door) {
  S.opened[door.ek] = true;
  g.sfx.tone(500, 0.15, 'square', 0.05, 900); g.shake(3, 0.15);
  for (const key in S.rooms) {
    const R = S.rooms[key]; if (R.area !== S.area) continue;
    for (const dir in R.doors) if (R.doors[dir].ek === door.ek) { R.doors[dir].code = 0; for (const [tx, ty, d] of R.doorT) if (d === dir) R.t[ty][tx] = 0; }
  }
}
function useItem(g) {
  const P = S.p, v = DV[P.dir];
  if (S.sel === 'bow' && S.bow) {
    if (S.arrows <= 0) { say('화살이 없다! 상점에서 사자.'); return; }
    if (S.shots.some((s) => s.k === 'arrow')) return;
    S.arrows--; S.shots.push({ k: 'arrow', x: P.x + v[0] * 16, y: P.y + v[1] * 16, vx: v[0] * 520, vy: v[1] * 520, pl: true, dmg: 2, life: 2, dir: P.dir });
    g.sfx.tone(900, 0.08, 'triangle', 0.04, 400);
  } else if (S.sel === 'bomb' && S.bombBag) {
    if (S.bombs <= 0) { say('폭탄이 없다!'); return; }
    if (S.bombs_.length >= 2) return;
    S.bombs--; S.bombs_.push({ x: P.x + v[0] * 30, y: P.y + v[1] * 30, t: 1.4 }); g.sfx.drop();
  } else if (!S.bow && !S.bombBag) say('사용할 아이템이 없다.');
}
function explode(g, b) {
  g.burst(b.x, b.y + OY, ['#f97316', '#fde047', '#78716c', '#fff'], 40, 260, 0.6, 5); g.shake(10, 0.35); g.sfx.explode();
  for (const e of S.ens) if (U.dist(e.x, e.y, b.x, b.y) < 80 + e.s * 0.3) hitEnemy(g, e, 3, e.x - b.x, e.y - b.y, 'bomb');
  if (U.dist(S.p.x, S.p.y, b.x, b.y) < 55) hurtP(g, 2, b.x, b.y);
  const R = S.room;
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) {
    if (U.dist((tx + 0.5) * TS, (ty + 0.5) * TS, b.x, b.y) > 80) continue;
    if (R.t[ty][tx] === 4) { R.t[ty][tx] = 0; g.burst((tx + 0.5) * TS, (ty + 0.5) * TS + OY, '#a8a29e', 10, 150, 0.5, 5); }
    if (R.t[ty][tx] === 13) { const dd = R.doorT.find((d) => d[0] === tx && d[1] === ty); if (dd) { openDoor(g, R.doors[dd[2]]); say('💥 벽이 무너지고 비밀 통로가 드러났다!'); } }
  }
}
// ---------- 그리기 ----------
function drawRoom(g, c, R, ox, oy) {
  const dun = R.area !== 'ow';
  g.rect(0, OY, RW * TS, RH * TS, dun ? '#2b2f45' : '#7cb35a');
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) {
    const t = R.t[ty][tx], x = tx * TS, y = ty * TS + OY;
    if (dun && t === 0 && (tx + ty) % 2 === 0) g.rect(x, y, TS, TS, '#30354e');
    if (!dun && t === 0 && (tx * 7 + ty * 3) % 5 === 0) { g.rect(x + 10, y + 14, 3, 6, '#5f9a44'); g.rect(x + 30, y + 30, 3, 6, '#5f9a44'); }
    if (t === 1) { if (dun) { g.rect(x, y, TS, TS, '#4c3a6b'); g.stroke(x + 2, y + 2, TS - 4, TS / 2 - 2, '#3a2c54', 2); g.stroke(x + 2, y + TS / 2, TS - 4, TS / 2 - 2, '#3a2c54', 2); } else { g.rect(x, y, TS, TS, '#2f6b2a'); g.circle(x + TS / 2, y + TS / 2 - 3, 20, '#1f5420'); g.circle(x + TS / 2 - 6, y + TS / 2 - 8, 11, '#3d8a35'); g.rect(x + 20, y + 36, 8, 10, '#5b3a1e'); } }
    else if (t === 2) { g.rect(x, y, TS, TS, '#2f7ad1'); g.line(x + 8, y + 16 + Math.sin(g.time * 2 + tx) * 3, x + 22, y + 16 + Math.sin(g.time * 2 + tx) * 3, '#7cc0ff', 2); }
    else if (t === 3) { g.circle(x + TS / 2, y + TS / 2, 20, '#2f8a3a'); g.circle(x + TS / 2 - 6, y + TS / 2 - 6, 9, '#4cbc58'); }
    else if (t === 4) { g.rrect(x + 3, y + 3, TS - 6, TS - 6, 10, '#8a8178', '#57524d', 3); g.line(x + 14, y + 12, x + 24, y + 26, '#57524d', 2); g.line(x + 24, y + 26, x + 20, y + 38, '#57524d', 2); }
    else if (t === 6) { g.rect(x + 4, y + 4, TS - 8, TS - 8, '#111'); g.rect(x + 10, y + 12, TS - 20, 5, '#444'); g.rect(x + 10, y + 22, TS - 20, 5, '#444'); g.rect(x + 10, y + 32, TS - 20, 5, '#444'); }
    else if (t === 7) { g.rect(x + 2, y + 2, TS - 4, TS - 4, '#5e6a8a'); g.rect(x + 8, y + 8, TS - 16, TS - 16, '#7684a8'); }
    else if (t === 10) { g.rect(x, y, TS, TS, '#7a4a1e'); g.emoji('🔒', x + TS / 2, y + TS / 2, 24); }
    else if (t === 12) { g.rect(x, y, TS, TS, '#5b1e1e'); g.emoji('💀', x + TS / 2, y + TS / 2, 24); }
    else if (t === 13) { g.rect(x, y, TS, TS, '#4c3a6b'); g.line(x + 10, y + 6, x + 26, y + 24, '#1a1326', 3); g.line(x + 26, y + 24, x + 18, y + 42, '#1a1326', 3); }
    else if (t === 0 && dun && R.trap && !R.cleared && R.doorT.some((d) => d[0] === tx && d[1] === ty) && R === S.room && !S.trans) { g.rect(x, y, TS, TS, '#6b6b7a'); g.line(x, y + TS / 2, x + TS, y + TS / 2, '#3a3a45', 3); }
  }
  if (R.eye) { const x = 7.5 * TS, y = OY + TS / 2; g.emoji(R.eyeHit ? '😑' : '👁️', x, y, 36); }
  for (const n of R.npcs) {
    if (n.gone) continue;
    const x = n.x, y = n.y + OY;
    if (n.k === 'old') g.emoji('👴', x, y, 38);
    else if (n.k === 'sword' && !S.sword) g.emoji('🗡️', x, y + Math.sin(g.time * 3) * 3, 30);
    else if (n.k === 'fire') g.emoji('🔥', x, y + Math.sin(g.time * 12) * 2, 32);
    else if (n.k === 'shop') g.emoji('🧔', x, y, 38);
    else if (n.k === 'ware') { g.emoji(n.w === 'bomb' ? '💣' : n.w === 'arrow' ? '🪶' : '❤️', x, y - 6, 28); g.text('💎' + n.price, x, y + 20, 13, '#fff'); }
    else if (n.k === 'fairy') { g.emoji('🧚', x + Math.sin(g.time * 2) * 10, y + Math.cos(g.time * 3) * 6, 34); }
  }
  if (R.chest) g.emoji(R.chest.open ? '📭' : '🧰', R.chest.x, R.chest.y + OY, 36);
}
function drawEntities(g, c) {
  const P = S.p;
  for (const d of S.drops) {
    if (d.t < 2 && Math.floor(d.t * 8) % 2) continue;
    const e = { rupee: '💎', rupee5: '💠', heart: '❤️', bombs: '💣', arrows: '🪶', key: '🗝️', hc: '💖', tri: '🔺' }[d.k];
    g.emoji(e, d.x, d.y + OY + Math.sin(g.time * 4 + d.x) * 2, d.k === 'tri' || d.k === 'hc' ? 34 : 24);
  }
  for (const b of S.bombs_) { g.emoji('💣', b.x, b.y + OY, 26 + (b.t < 0.5 ? Math.sin(g.time * 40) * 4 : 0)); }
  for (const e of S.ens) {
    const d = EN[e.k];
    c.save(); c.translate(e.x, e.y + OY);
    if (e.flash > 0) c.filter = 'brightness(2.5)';
    if (d.ghost) c.globalAlpha = 0.55 + Math.sin(e.ph * 5) * 0.25;
    const bob = e.k === 'slime' && e.hop > 0 ? -Math.sin((0.4 - e.hop) / 0.4 * Math.PI) * 10 : Math.sin(e.ph * 6) * 2;
    if (e.k === 'eye') { g.circle(0, 0, 50, '#3b0764'); g.emoji(e.open ? '👁️' : '🟣', 0, 0, e.open ? 80 : 70); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI + Math.sin(e.ph * 4 + i) * 0.2; g.line(Math.cos(a) * 40, Math.sin(a) * 30, Math.cos(a) * 70, Math.sin(a) * 60 + 10, '#3b0764', 6); } }
    else { if (e.dir === 'r' || (d.boss && e.k === 'dragon')) c.scale(e.k === 'dragon' ? 1 : -1, 1); g.emoji(d.e, 0, bob, e.s); }
    c.filter = 'none'; c.globalAlpha = 1;
    c.restore();
    if (d.boss) { g.rect(g.W / 2 - 150, OY + 8, 300, 10, '#450a0a'); g.rect(g.W / 2 - 150, OY + 8, 300 * Math.max(0, e.hp) / e.max, 10, '#ef4444'); }
  }
  for (const s of S.shots) {
    const x = s.x, y = s.y + OY;
    if (s.k === 'rock') g.circle(x, y, 7, '#a8a29e');
    else if (s.k === 'spear' || s.k === 'arrow') { const l = Math.hypot(s.vx, s.vy) || 1; g.line(x - s.vx / l * 16, y - s.vy / l * 16, x + s.vx / l * 12, y + s.vy / l * 12, s.k === 'arrow' ? '#fde68a' : '#78350f', 4); }
    else if (s.k === 'fire') { g.circle(x, y, 10, '#f97316'); g.circle(x, y, 5, '#fde047'); }
    else if (s.k === 'tear') { g.circle(x, y, 9, '#a855f7'); g.circle(x, y, 4, '#f0abfc'); }
    else if (s.k === 'beam') { c.save(); c.translate(x, y); c.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 4); g.emoji('🗡️', 0, 0, 30); c.restore(); g.circle(x, y, 6, `hsl(${g.time * 900 % 360},90%,70%)`); }
  }
  // 플레이어
  const x = P.x, y = P.y + OY;
  if (!(P.ifr > 0 && Math.floor(P.ifr * 14) % 2)) {
    if (P.swing > 0) {
      const v = DV[P.dir], k = 1 - P.swing / 0.26;
      c.save(); c.translate(x, y); c.rotate(Math.atan2(v[1], v[0]) + (k - 0.5) * 1.6);
      g.rect(14, -3, 30, 6, '#e5e7eb'); g.rect(10, -7, 5, 14, '#a16207');
      c.restore();
    }
    g.circle(x, y + 14, 12, 'rgba(0,0,0,.2)');
    c.save(); c.translate(x, y); if (P.dir === 'l') c.scale(-1, 1);
    g.emoji('🧝', 0, Math.sin(P.walk * 14) * 1.5, 38);
    c.restore();
    if (P.dir === 'u') g.rect(x - 8, y - 18, 16, 4, '#15803d');
  }
}
function drawHud(g, c) {
  g.rect(0, 0, g.W, OY, '#000');
  // 미니맵
  const isOw = S.area === 'ow', cw = 34, chh = 20;
  g.rect(14, 10, cw * 3 + 4, chh * 3 + 4, '#333');
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const key = roomKey(S.area, x, y), exists = isOw || DUN[S.area].rooms[x + ',' + y];
    if (!exists) continue;
    g.rect(16 + x * cw, 12 + y * chh, cw - 2, chh - 2, S.visited[key] ? (isOw ? '#4d7c3a' : '#4c4f7a') : '#222');
    if (!isOw && DUN[S.area].rooms[x + ',' + y].boss) g.text('💀', 16 + x * cw + cw / 2, 12 + y * chh + chh / 2, 10, '#fff');
    if (x === S.rx && y === S.ry) g.circle(16 + x * cw + cw / 2 - 1, 12 + y * chh + chh / 2 - 1, 5, '#facc15');
  }
  g.text(isOw ? '하이랄' : DUN[S.area].n.split(':')[0], 66, 84, 12, '#ccc');
  // 카운트
  g.text(`💎 ${S.rupees}`, 140, 22, 16, '#fff', 'left');
  g.text(`🗝️ ${S.keys}${S.bosskey[S.area] ? ' 🔑' : ''}`, 140, 46, 16, '#fff', 'left');
  g.text(`💣 ${S.bombs}`, 140, 70, 16, '#fff', 'left');
  g.text(`🪶 ${S.arrows}`, 210, 70, 16, '#fff', 'left');
  // 아이템 슬롯
  const bx = 300;
  g.rrect(bx, 14, 52, 60, 6, null, '#3b82f6', 3); g.text('B', bx + 26, 84, 12, '#93c5fd');
  if (S.sel === 'bow' && S.bow) g.emoji('🏹', bx + 26, 44, 34); else if (S.sel === 'bomb' && S.bombBag) g.emoji('💣', bx + 26, 44, 34);
  g.rrect(bx + 62, 14, 52, 60, 6, null, '#ef4444', 3); g.text('A', bx + 88, 84, 12, '#fca5a5');
  if (S.sword) g.emoji('🗡️', bx + 88, 44, 34);
  g.text('Q:교체', bx + 150, 84, 11, '#888');
  // 트라이포스
  for (let i = 0; i < 2; i++) g.emoji(i < S.tri ? '🔺' : '🔻', bx + 148 + i * 26, 30, 22);
  c.globalAlpha = 1;
  // 하트
  g.text('- 생명 -', 640, 16, 14, '#ef4444');
  for (let i = 0; i < S.max / 2; i++) {
    const hx = 540 + (i % 8) * 26, hy = 42 + Math.floor(i / 8) * 26, v = S.hp - i * 2;
    g.emoji(v >= 2 ? '❤️' : v === 1 || (v > 0 && v < 2) ? '💔' : '🖤', hx, hy, 22);
  }
}
