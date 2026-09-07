/* =========================================================
 *  world.js - 맵 레이아웃 / 충돌 / 지면 프리렌더
 *  기지 -> 농장 -> 오리 연못 -> 사막 -> 정글 -> 바다 -> 공룡 계곡 -> 우주
 * ========================================================= */

const ZONE_THEME = {
  farm:   { floor:'#7cc054', floor2:'#6bab48', fog:null,                    prop:'tree'    },
  pond:   { floor:'#5fb8d8', floor2:'#4aa3c6', fog:'rgba(60,180,220,0.10)', prop:'reed'    },
  desert: { floor:'#e6c98a', floor2:'#d8b872', fog:'rgba(255,220,150,0.10)',prop:'cactus'  },
  jungle: { floor:'#2f6b3a', floor2:'#255a30', fog:'rgba(20,90,40,0.18)',   prop:'jungle'  },
  ocean:  { floor:'#1d4e86', floor2:'#173f6e', fog:'rgba(30,110,190,0.22)', prop:'coral'   },
  dino:   { floor:'#6b4230', floor2:'#57351f', fog:'rgba(180,60,20,0.14)',  prop:'volcano' },
  space:  { floor:'#181334', floor2:'#110e26', fog:'rgba(70,40,160,0.20)',  prop:'crystal' }
};

const World = {
  w: CONFIG.world.w,
  h: CONFIG.world.h,

  base: { x: 60, y: 300, w: 700, h: 900 },
  corridor: { y: 720, h: 150 },      // 구역을 잇는 통로

  zones: [],
  solids: [],
  gates: [],
  props: [],
  incubators: [],
  treadmills: [],
  shop: { x: 170, y: 1090 },
  spawns: {},
  bossSpots: {},
  ground: null,

  /* ---------------- 초기화 ---------------- */
  init() {
    const ZW = 780, ZH = 1080, ZY = 220, GAP = 60;
    let x = 880;

    this.zones.push(Object.assign({ id: 'base', name: '내 기지' }, this.base,
      { floor: '#6f7d92', floor2: '#5d6a7d' }));

    for (const z of ZONES) {
      const th = ZONE_THEME[z.id];
      this.zones.push({
        id: z.id, name: z.name, x, y: ZY, w: ZW, h: ZH,
        floor: th.floor, floor2: th.floor2, fog: th.fog, prop: th.prop, cfg: z
      });
      x += ZW + GAP;
    }
    this.w = x + 100;
    CONFIG.world.w = this.w;

    const S = (a, b, c, d) => this.solids.push({ x: a, y: b, w: c, h: d });

    /* 바깥 경계 */
    S(-60, -60, this.w + 120, 60);
    S(-60, this.h, this.w + 120, 60);
    S(-60, -60, 60, this.h + 120);
    S(this.w, -60, 60, this.h + 120);

    /* 기지 담장 (오른쪽 통로만 열림) */
    const B = this.base, CY = this.corridor.y, CH = this.corridor.h;
    this.wall(B.x, B.y, B.w, true);
    this.wall(B.x, B.y + B.h, B.w, true);
    this.wall(B.x, B.y, B.h, false);
    this.wall(B.x + B.w, B.y, B.h, false, [[CY - B.y, CH]]);

    /* 각 구역 울타리 : 좌/우 통로 개방 */
    for (const z of this.zones) {
      if (z.id === 'base') continue;
      this.wall(z.x, z.y, z.w, true);
      this.wall(z.x, z.y + z.h, z.w, true);
      this.wall(z.x, z.y, z.h, false, [[CY - z.y, CH]]);
      this.wall(z.x + z.w, z.y, z.h, false, [[CY - z.y, CH]]);

      /* 잠금 게이트: 구역 입구 */
      if (z.cfg.cost > 0) this.gates.push({ x: z.x - 16, y: CY, w: 32, h: CH, zone: z.id });

      /* 스폰 위치 */
      const list = [];
      const cols = [z.x + 130, z.x + 330, z.x + 520, z.x + 680];
      const rows = [z.y + 120, z.y + 300, z.y + 790, z.y + 950];
      rows.forEach((ry, ri) => cols.forEach((cx, ci) => {
        if ((ri + ci) % 4 === 3) return;
        list.push([cx, ry, (ri + ci) % 3 === 0 ? 1 : 0]);   // 1 = 엘리트
      }));
      this.spawns[z.id] = list;
      this.bossSpots[z.id] = { x: z.x + z.w / 2, y: z.y + z.h - 130 };

      /* 장식 */
      for (let i = 0; i < 10; i++) {
        const px = z.x + rand(70, z.w - 70);
        const py = z.y + rand(60, z.h - 60);
        if (py > CY - 70 && py < CY + CH + 70) continue;
        this.props.push({ type: z.prop, x: px, y: py, s: rand(0.75, 1.3), seed: rand(0, 10) });
      }
      /* 구역 표지판 */
      this.props.push({ type: 'sign', x: z.x + 70, y: CY - 40, zone: z.id });
    }

    /* 부화기 / 러닝머신 / 상점 */
    [[150, 430], [150, 580], [150, 730]].forEach((p, i) =>
      this.incubators.push({ i, x: p[0], y: p[1], egg: null, grow: 0, ready: false }));

    let k = 0;
    for (const ry of [470, 1060]) {
      for (const cx of [335, 445, 555, 665]) {
        this.treadmills.push({ i: k++, x: cx, y: ry, pet: null, kind: 'basic' });
      }
    }
    this.treadmills.forEach(t => S(t.x - 34, t.y - 22, 68, 30));
    this.incubators.forEach(t => S(t.x - 30, t.y - 18, 60, 26));

    this.props.push({ type: 'shop', x: this.shop.x, y: this.shop.y });
    S(this.shop.x - 50, this.shop.y - 38, 100, 36);

    this.buildGround();
  },

  /* 한 변에 구멍이 있는 벽 */
  wall(x, y, len, horiz, gaps = []) {
    const T = 24;
    let cur = 0;
    const segs = [];
    for (const [at, glen] of gaps.sort((a, b) => a[0] - b[0])) { segs.push([cur, at - cur]); cur = at + glen; }
    segs.push([cur, len - cur]);
    for (const [o, l] of segs) {
      if (l <= 0) continue;
      if (horiz) this.solids.push({ x: x + o, y: y - T / 2, w: l, h: T });
      else this.solids.push({ x: x - T / 2, y: y + o, w: T, h: l });
    }
    this.props.push({ type: 'fenceLine', x, y, len, horiz, gaps });
  },

  zoneAt(x, y) {
    for (const z of this.zones) if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
    return null;
  },
  zoneDef(id) { return this.zones.find(z => z.id === id); },

  /* 원 vs 사각형 충돌 해결 */
  resolve(p, r, unlocked) {
    const list = this.solids.concat(this.gates.filter(g => !unlocked[g.zone]));
    for (let pass = 0; pass < 2; pass++) {
      for (const s of list) {
        const cx = clamp(p.x, s.x, s.x + s.w);
        const cy = clamp(p.y, s.y, s.y + s.h);
        const dx = p.x - cx, dy = p.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r; p.y = cy + (dy / d) * r;
        } else {
          const l = p.x - s.x, rr = s.x + s.w - p.x, t = p.y - s.y, b = s.y + s.h - p.y;
          const m = Math.min(l, rr, t, b);
          if (m === l) p.x = s.x - r; else if (m === rr) p.x = s.x + s.w + r;
          else if (m === t) p.y = s.y - r; else p.y = s.y + s.h + r;
        }
      }
    }
    p.x = clamp(p.x, 20, this.w - 20);
    p.y = clamp(p.y, 20, this.h - 20);
  },

  /* ---------------- 지면 프리렌더 ---------------- */
  buildGround() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const g = c.getContext('2d');

    g.fillStyle = '#5c9b3e';
    g.fillRect(0, 0, this.w, this.h);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      g.fillRect(Math.random() * this.w, Math.random() * this.h, rand(6, 22), rand(3, 7));
    }

    /* 통로 */
    const CY = this.corridor.y, CH = this.corridor.h;
    g.fillStyle = '#c2a678';
    g.fillRect(this.base.x + this.base.w, CY, this.w - this.base.x - this.base.w, CH);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 800; i++) g.fillRect(this.base.x + this.base.w + Math.random() * (this.w - 900), CY + Math.random() * CH, rand(5, 14), rand(3, 6));

    for (const z of this.zones) {
      g.fillStyle = z.floor; g.fillRect(z.x, z.y, z.w, z.h);
      g.fillStyle = z.floor2;
      const tile = 68;
      for (let ty = 0; ty < z.h; ty += tile)
        for (let tx = 0; tx < z.w; tx += tile)
          if (((tx / tile | 0) + (ty / tile | 0)) % 2)
            g.fillRect(z.x + tx, z.y + ty, Math.min(tile, z.w - tx), Math.min(tile, z.h - ty));

      for (let i = 0; i < 1100; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        g.fillRect(z.x + Math.random() * z.w, z.y + Math.random() * z.h, rand(5, 16), rand(3, 6));
      }
      this.themeGround(g, z);

      /* 통로가 구역을 관통 */
      if (z.id !== 'base') {
        g.fillStyle = 'rgba(200,170,120,0.35)';
        g.fillRect(z.x, CY, z.w, CH);
      }
      /* 보스 아레나 */
      const bs = this.bossSpots[z.id];
      if (bs) {
        g.save();
        g.strokeStyle = 'rgba(255,60,60,0.55)'; g.lineWidth = 6; g.setLineDash([18, 14]);
        g.beginPath(); g.ellipse(bs.x, bs.y + 10, 150, 80, 0, 0, 7); g.stroke();
        g.setLineDash([]);
        g.fillStyle = 'rgba(255,60,60,0.10)';
        g.beginPath(); g.ellipse(bs.x, bs.y + 10, 150, 80, 0, 0, 7); g.fill();
        g.restore();
      }
    }

    /* 기지 격자 + 슬롯 */
    const B = this.zoneDef('base');
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 3;
    for (let ty = B.y; ty < B.y + B.h; ty += 96) { g.beginPath(); g.moveTo(B.x, ty); g.lineTo(B.x + B.w, ty); g.stroke(); }
    for (let tx = B.x; tx < B.x + B.w; tx += 96) { g.beginPath(); g.moveTo(tx, B.y); g.lineTo(tx, B.y + B.h); g.stroke(); }

    for (const t of this.treadmills) {
      g.fillStyle = 'rgba(0,0,0,0.16)'; roundRect(g, t.x - 46, t.y - 40, 92, 96, 10); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 3; g.setLineDash([9, 8]); g.stroke(); g.setLineDash([]);
    }
    for (const t of this.incubators) {
      g.fillStyle = 'rgba(255,255,255,0.10)'; roundRect(g, t.x - 42, t.y - 40, 84, 88, 10); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 3; g.setLineDash([9, 8]); g.stroke(); g.setLineDash([]);
    }

    this.ground = c;
  },

  themeGround(g, z) {
    const R = (n, f) => { for (let i = 0; i < n; i++) f(z.x + Math.random() * z.w, z.y + Math.random() * z.h); };
    if (z.id === 'pond') {
      R(26, (x, y) => {
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.beginPath(); g.ellipse(x, y, rand(30, 90), rand(10, 26), 0, 0, 7); g.fill();
      });
    } else if (z.id === 'desert') {
      R(40, (x, y) => {
        g.strokeStyle = 'rgba(180,140,80,0.35)'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x, y, rand(40, 110), rand(8, 20), rand(-0.3, 0.3), 0, 7); g.stroke();
      });
    } else if (z.id === 'jungle') {
      R(120, (x, y) => {
        g.fillStyle = `rgba(${randInt(40, 90)},${randInt(120, 190)},${randInt(50, 90)},0.5)`;
        g.beginPath(); g.ellipse(x, y, rand(10, 26), rand(5, 12), rand(0, 3), 0, 7); g.fill();
      });
    } else if (z.id === 'ocean') {
      R(50, (x, y) => {
        g.strokeStyle = 'rgba(140,215,255,0.22)'; g.lineWidth = 4;
        g.beginPath(); g.arc(x, y, rand(20, 70), 0.2, 2.6); g.stroke();
      });
      R(160, (x, y) => { g.fillStyle = 'rgba(255,255,255,0.30)'; g.fillRect(x, y, 3, 3); });
    } else if (z.id === 'dino') {
      R(30, (x, y) => {
        g.fillStyle = 'rgba(255,90,20,0.30)';
        g.beginPath(); g.ellipse(x, y, rand(24, 70), rand(10, 26), rand(0, 3), 0, 7); g.fill();
      });
      R(60, (x, y) => { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, y, rand(8, 22), rand(5, 10)); });
    } else if (z.id === 'space') {
      R(700, (x, y) => {
        const s = rand(1, 3.4);
        g.fillStyle = `rgba(255,255,255,${rand(0.25, 0.95)})`; g.fillRect(x, y, s, s);
      });
      R(6, (x, y) => {
        const gr = g.createRadialGradient(x, y, 4, x, y, 220);
        gr.addColorStop(0, `rgba(${randInt(80, 200)},${randInt(60, 160)},255,0.30)`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 220, 0, 7); g.fill();
      });
    }
  }
};
