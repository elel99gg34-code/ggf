let S;
const LEVELS = [
`####
# .#
#  ###
#*@  #
#  $ #
#  ###
####`,
`######
#    #
# #@ #
# $* #
# .* #
#    #
######`,
`  ####
###  ####
#     $ #
# #  #$ #
# . .#@ #
#########`,
`########
#      #
# .**$@#
#      #
#####  #
    ####`,
` #######
 #     #
 # .$. #
## $@$ #
#  .$. #
#      #
########`,
`###### #####
#    ###   #
# $$     #@#
# $ #...   #
#   ########
#####`,
`#######
#  .  #
#  $  #
#.$@$.#
#  $  #
#  .  #
#######`,
`  ######
  # ..@#
  # $$ #
  ## ###
   # #
   # #
#### #
#    ##
# #   #
#   # #
###   #
  #####`,
`#####
#.  ##
#@$$ #
##   #
 ##  #
  ##.#
   ###`,
`      #####
      #.  #
      #.# #
#######.# #
# @ $ $ $ #
# # # # ###
#       #
#########`,
];
GAME({
  title: '소코반', w: 900, h: 700, bg: '#292524', controls: 'dpad+ab', aLabel: '↶', bLabel: '⟲', noRKey: true,
  help: '방향키/WASD/스와이프로 이동 · 상자를 밀어서 🎯 목표 지점으로\n상자는 밀 수만 있고 당길 수 없어요!\nZ/U/Space = 되돌리기 · R/X = 레벨 다시 시작\n10개 레벨 · 적은 이동으로 깰수록 고득점',
  init(g) { S = { lv: 0 }; load(); },
  update(g, dt) {
    S.anim = Math.max(0, S.anim - dt * 8);
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { S.lv++; if (S.lv >= LEVELS.length) return g.win('모든 레벨 클리어!'); load(); } return; }
    if (g.pressed('a') || g.keyp('KeyU') || g.keyp('KeyZ')) undo(g);
    if (g.keyp('KeyR') || g.pressed('b')) { load(); g.sfx.click(); }
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const k in D) if (g.pressed(k)) { move(g, ...D[k]); break; }
    if (g.mouse.clicked) { const [ox, oy, cs] = layout(); const tx = Math.floor((g.mouse.x - ox) / cs), ty = Math.floor((g.mouse.y - oy) / cs); const dx = tx - S.px, dy = ty - S.py; if (Math.abs(dx) + Math.abs(dy) === 1) move(g, dx, dy); }
    g.info = `레벨 ${S.lv + 1}/${LEVELS.length} · 이동 ${S.moves} · 밀기 ${S.pushes}`;
  },
  draw(g, c) {
    const [ox, oy, cs] = layout();
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
      const k = y * S.W + x, px = ox + x * cs, py = oy + y * cs;
      if (S.wall.has(k)) { g.rect(px, py, cs, cs, '#78716c'); g.rect(px + 2, py + 2, cs - 4, cs / 2 - 3, '#a8a29e'); g.rect(px + 2, py + cs / 2 + 1, cs - 4, cs / 2 - 3, '#a8a29e'); }
      else if (S.floor.has(k)) { g.rect(px, py, cs, cs, (x + y) % 2 ? '#44403c' : '#3f3a36'); if (S.goals.has(k)) g.emoji('🎯', px + cs / 2, py + cs / 2, cs * 0.6); }
    }
    for (const b of S.boxes) { const x = b % S.W, y = Math.floor(b / S.W), on = S.goals.has(b); g.rrect(ox + x * cs + 3, oy + y * cs + 3, cs - 6, cs - 6, 6, on ? '#16a34a' : '#b45309', on ? '#4ade80' : '#78350f', 3); g.line(ox + x * cs + 8, oy + y * cs + 8, ox + x * cs + cs - 8, oy + y * cs + cs - 8, on ? '#4ade80' : '#78350f', 3); g.line(ox + x * cs + cs - 8, oy + y * cs + 8, ox + x * cs + 8, oy + y * cs + cs - 8, on ? '#4ade80' : '#78350f', 3); }
    c.save(); c.translate(ox + S.px * cs + cs / 2, oy + S.py * cs + cs / 2 - S.anim * 4); if (S.face < 0) c.scale(-1, 1); g.emoji('🧑‍🏭', 0, 0, cs * 0.85); c.restore();
    g.text(`레벨 ${S.lv + 1}`, 450, 30, 26, '#fde68a');
    g.text('Z 되돌리기 · R 다시', 450, 680, 15, '#a8a29e');
    if (S.clear > 0) g.text('🎉 클리어!', 450, 350, 60, '#4ade80');
  },
});
function layout() { const cs = Math.floor(Math.min(820 / S.W, 600 / S.H, 64)); return [(900 - cs * S.W) / 2, 60 + (600 - cs * S.H) / 2, cs]; }
function load() {
  const rows = LEVELS[S.lv].split('\n'); S.H = rows.length; S.W = Math.max(...rows.map((r) => r.length));
  S.wall = new Set(); S.goals = new Set(); S.boxes = new Set(); S.floor = new Set();
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const k = y * S.W + x; if (ch === '#') S.wall.add(k); if ('.*+'.includes(ch)) S.goals.add(k); if ('$*'.includes(ch)) S.boxes.add(k); if ('@+'.includes(ch)) { S.px = x; S.py = y; } }));
  // 바깥 공간을 제외한 바닥 채우기
  const st = [S.py * S.W + S.px]; S.floor.add(st[0]);
  while (st.length) { const k = st.pop(); for (const d of [1, -1, S.W, -S.W]) { const n = k + d; if (n < 0 || n >= S.W * S.H || S.wall.has(n) || S.floor.has(n)) continue; if ((d === 1 && n % S.W === 0) || (d === -1 && k % S.W === 0)) continue; S.floor.add(n); st.push(n); } }
  S.hist = []; S.moves = 0; S.pushes = 0; S.clear = 0; S.anim = 0; S.face = 1;
}
function move(g, dx, dy) {
  const k = S.py * S.W + S.px, n = k + dy * S.W + dx;
  if (S.wall.has(n)) return;
  if (dx) S.face = dx;
  const snap = { px: S.px, py: S.py, boxes: new Set(S.boxes), moves: S.moves, pushes: S.pushes };
  if (S.boxes.has(n)) { const nn = n + dy * S.W + dx; if (S.wall.has(nn) || S.boxes.has(nn)) { g.sfx.hit(); return; } S.boxes.delete(n); S.boxes.add(nn); S.pushes++; g.sfx.tone(S.goals.has(nn) ? 700 : 200, 0.06, 'square', 0.05); }
  else g.sfx.move();
  S.hist.push(snap); S.px += dx; S.py += dy; S.moves++; S.anim = 1;
  if ([...S.boxes].every((b) => S.goals.has(b))) { const pts = Math.max(200, 2000 - S.moves * 8); g.add(pts); g.sfx.win(); S.clear = 1.5; g.float(450, 300, `+${pts}`, '#fde047', 34); }
}
function undo(g) { const s = S.hist.pop(); if (!s) return; Object.assign(S, s); g.sfx.click(); }
