/* =========================================================
 *  계란을 훔치다 (Steal an Egg)
 *  config.js - 등급 / 아우라 / 생물 / 구역 / 밸런스
 *
 *  루프 : 자는 파수꾼 옆 둥지에서 알을 훔친다 → 깨서 쫓아온다 →
 *         도망쳐 기지로 → 울타리에 넣어 부화 → 펫이 돈을 번다 →
 *         러닝머신을 타서 내 속도를 올린다 → 더 빠른 구역에 도전
 * ========================================================= */

/* ---------- 등급 ---------- */
const RARITIES = [
  { id:'common',  name:'일반',    en:'COMMON',  tier:0, weight:5000, mult:1,
    c1:'#8d99ab', c2:'#e4ebf4', glow:'#aab6c6', aura:'none',    auraName:'없음' },
  { id:'rare',    name:'레어 알', en:'RARE',    tier:1, weight:2400, mult:3,
    c1:'#1257d6', c2:'#8ed2ff', glow:'#3d9bff', aura:'bubble',  auraName:'물결' },
  { id:'epic',    name:'에픽',    en:'EPIC',    tier:2, weight:1100, mult:9,
    c1:'#6d1fd0', c2:'#e3b0ff', glow:'#b45cff', aura:'spark',   auraName:'자수정' },
  { id:'secret',  name:'시크릿',  en:'SECRET',  tier:3, weight:340,  mult:30,
    c1:'#3a0713', c2:'#ff2b52', glow:'#ff2b4d', aura:'shadow',  auraName:'그림자' },
  { id:'divine',  name:'디바인',  en:'DIVINE',  tier:4, weight:110,  mult:100,
    c1:'#c48a00', c2:'#fff3ae', glow:'#ffd447', aura:'halo',    auraName:'후광' },
  { id:'cosmic',  name:'코스믹',  en:'COSMIC',  tier:5, weight:34,   mult:350,
    c1:'#2b1b7a', c2:'#43e8ff', glow:'#7a5cff', aura:'nebula',  auraName:'성운' },
  { id:'eternal', name:'영원한',  en:'ETERNAL', tier:6, weight:6,    mult:1600,
    c1:'#ff5fbe', c2:'#7dffe0', glow:'#ffffff', aura:'eternal', auraName:'무한' },
  /* 최상위 — 우주에서만, 그것도 아주 드물게 나온다 */
  { id:'transcend', name:'초월', en:'TRANSCENDENT', tier:7, weight:0.12, mult:12000,
    c1:'#05060c', c2:'#d7b0ff', glow:'#c9a2ff', aura:'transcend', auraName:'균열' }
];
const RARITY_BY_ID = {};
RARITIES.forEach(r => { RARITY_BY_ID[r.id] = r; });

/* 이 등급 이상이면 전광판 알림이 뜬다 */
const ANNOUNCE_TIER = 3;   // 시크릿

/* ---------- 아우라 변형 ---------- */
const VARIANTS = [
  { id:'normal',  name:'',       weight:870, mult:1, tag:'' },
  { id:'shiny',   name:'빛나는', weight:105, mult:2, tag:'SHINY' },
  { id:'rainbow', name:'무지개', weight:25,  mult:5, tag:'RAINBOW' }
];
const VARIANT_BY_ID = {};
VARIANTS.forEach(v => { VARIANT_BY_ID[v.id] = v; });

/* ---------- 둥지를 지키는 생물 ----------
 *  base   : 권장속도 (부화한 펫의 초당 수익 기준값)
 *  luck   : 등급 가중치에 luck^tier 로 곱해짐
 *  chase  : 깨어났을 때 추격 속도 (px/s) — 내 속도가 이보다 낮으면 잡힌다
 *  wake   : 알을 들어올리는 데 걸리는 시간(초). 짧을수록 쉽다
 *  rage   : 추격 지속 시간(초)
 */
const SPECIES = {
  chicken:  { id:'chicken',  name:'닭',      pet:'병아리',     zone:'farm',   base:1,
              luck:1.00, chase:165, wake:1.6, rage:5.0,  scale:1.00, form:'chicken',
              body:'#ffffff', body2:'#d7dde6', accent:'#ff4d4d', beak:'#ffa726' },
  hen:      { id:'hen',      name:'갈색 닭', pet:'꼬꼬',       zone:'farm',   base:2.5,
              luck:1.25, chase:190, wake:1.5, rage:5.5,  scale:1.02, form:'chicken',
              body:'#d29055', body2:'#a56b38', accent:'#ff4d4d', beak:'#ffb74d' },

  duck:     { id:'duck',     name:'오리',    pet:'새끼오리',   zone:'pond',   base:150,
              luck:1.45, chase:215, wake:1.5, rage:6.0,  scale:0.98, form:'duck',
              body:'#f3f6fb', body2:'#c3cddc', accent:'#ffd54a', beak:'#ffb300' },
  swan:     { id:'swan',     name:'백조',    pet:'새끼백조',   zone:'pond',   base:380,
              luck:1.65, chase:240, wake:1.4, rage:6.5,  scale:1.16, form:'duck',
              body:'#ffffff', body2:'#dfe7f5', accent:'#111111', beak:'#ff7043' },

  scorpion: { id:'scorpion', name:'전갈',    pet:'새끼전갈',   zone:'desert', base:1000,
              luck:1.85, chase:275, wake:1.4, rage:7.0,  scale:1.05, form:'scorpion',
              body:'#c8763a', body2:'#8c4a1e', accent:'#ffcf6b', beak:'#3a2416' },
  kingScorpion:{ id:'kingScorpion', name:'킹 전갈', pet:'전갈왕 새끼', zone:'desert', base:2600,
              luck:2.05, chase:300, wake:1.3, rage:7.5,  scale:1.28, form:'scorpion',
              body:'#4b3b6b', body2:'#2b2244', accent:'#b98bff', beak:'#1b1226' },

  tiger:    { id:'tiger',    name:'호랑이',  pet:'아기호랑이', zone:'jungle', base:10000,
              luck:2.25, chase:340, wake:1.3, rage:8.0,  scale:1.34, form:'tiger',
              body:'#ff9f2e', body2:'#c96c00', accent:'#1b1b1b', beak:'#ffe0b2' },
  whiteTiger:{ id:'whiteTiger', name:'백호', pet:'아기백호',   zone:'jungle', base:26000,
              luck:2.45, chase:365, wake:1.2, rage:8.5,  scale:1.40, form:'tiger',
              body:'#eef3fb', body2:'#b9c6d8', accent:'#1b1b1b', beak:'#dceaff' },

  whale:    { id:'whale',    name:'고래',    pet:'새끼고래',   zone:'ocean',  base:500000,
              luck:2.65, chase:375, wake:1.3, rage:9.0,  scale:1.75, form:'whale',
              body:'#3f7fd4', body2:'#22508f', accent:'#bfe4ff', beak:'#0f2a4d' },
  orca:     { id:'orca',     name:'범고래',  pet:'새끼범고래', zone:'ocean',  base:1300000,
              luck:2.85, chase:400, wake:1.2, rage:9.5,  scale:1.85, form:'whale',
              body:'#1b1f2a', body2:'#0d1016', accent:'#ffffff', beak:'#0a0d12' },

  dino:     { id:'dino',     name:'공룡',    pet:'아기공룡',   zone:'dino',   base:1800000,
              luck:3.00, chase:430, wake:1.2, rage:10.0, scale:1.90, form:'dino',
              body:'#5fbf5a', body2:'#2f7a3a', accent:'#ffd54a', beak:'#f5f1e0', quake:true },
  trex:     { id:'trex',     name:'티라노',  pet:'아기티라노', zone:'dino',   base:4500000,
              luck:3.15, chase:460, wake:1.1, rage:11.0, scale:2.05, form:'dino',
              body:'#a8452f', body2:'#6d2617', accent:'#ffe066', beak:'#fff6e0', quake:true },

  skeleton: { id:'skeleton', name:'해골장군',pet:'꼬마해골',   zone:'space',  base:18000000,
              luck:3.30, chase:500, wake:1.1, rage:12.0, scale:1.55, form:'skeleton',
              body:'#e9edf5', body2:'#aeb6c6', accent:'#8affe0', beak:'#5a6376' },
  skullKing:{ id:'skullKing',name:'해골왕',  pet:'꼬마해골왕', zone:'space',  base:45000000,
              luck:3.50, chase:545, wake:1.0, rage:13.0, scale:1.72, form:'skeleton',
              body:'#2a2f45', body2:'#12162a', accent:'#ff4d8d', beak:'#6b5cff' }
};
const CHICKEN_TYPES = SPECIES;   // 하위 호환

/* ---------- 구역 (전부 자유 이동 · 잠금 없음) ----------
 *  maxTier : 이 구역에서 나올 수 있는 최고 등급 (RARITIES 의 tier)
 *            농장·연못은 에픽까지 — 시크릿은 사막부터 나온다.
 */
/*  스테이지 하나 = 몹 1마리 + 둥지 1개(알 4개).
 *  mob 이 그 스테이지를 지키는 유일한 파수꾼이다.  */
const ZONES = [
  { id:'farm',   name:'닭의 숲',   emoji:'🐔', speed:1,        mob:'chicken',  need:0,   maxTier:2 },
  { id:'pond',   name:'오리 연못', emoji:'🦆', speed:150,      mob:'duck',     need:240, maxTier:2 },
  { id:'desert', name:'사막',      emoji:'🦂', speed:1000,     mob:'scorpion', need:300, maxTier:3 },
  { id:'jungle', name:'정글',      emoji:'🐯', speed:10000,    mob:'tiger',    need:365, maxTier:4 },
  { id:'ocean',  name:'바다',      emoji:'🐋', speed:500000,   mob:'whale',    need:400, maxTier:5 },
  { id:'dino',   name:'공룡 계곡', emoji:'🦖', speed:1800000,  mob:'dino',     need:460, maxTier:6 },
  { id:'space',  name:'우주',      emoji:'💀', speed:18000000, mob:'skeleton', need:545, maxTier:7 }
];
ZONES.forEach(z => { z.mobs = [z.mob]; });   // 하위 호환
const ZONE_BY_ID = {};
ZONES.forEach(z => { ZONE_BY_ID[z.id] = z; });

/* ---------- 밸런스 ---------- */
const CONFIG = {
  player: {
    baseSpeed: 230,      // 속도 레벨 0 일 때
    perLevel: 0.10,      // 레벨당 +10%
    radius: 16,
    carryPenalty: 0.92,  // 알을 들면 살짝 느려진다

    /* 리스폰 — 체력 개념은 없다. 잡히면 그 자리에서 쓰러지고 기지로 돌아간다 */
    downTime: 2.0,       // 쓰러져 있는 시간
    respawnGrace: 2.5    // 리스폰 직후 무적 (바로 다시 잡히지 않게)
  },

  /* 러닝머신 — 플레이어가 직접 타서 속도를 올린다.
     레벨 상한은 없다. 돈만 있으면 무한히 계속 올릴 수 있다. */
  treadmill: {
    fillTime: 3.2,                                    // 한 레벨 올리는 데 달려야 하는 시간
    cost: lv => Math.floor(250 * Math.pow(2.9, lv))   // 다음 레벨 비용
  },

  /* 울타리 — 부화한 펫이 여기서 돈을 번다 */
  pen: {
    baseSlots: 4,
    maxSlots: 24,
    cost: n => Math.floor(400 * Math.pow(1.9, n - 4))
  },

  nest: {
    eggs: 4,            // 둥지 하나에 알 4개
    respawn: 16,        // 다 털린 둥지가 알 4개로 다시 차기까지
    guardScale: 1.7     // 스테이지의 유일한 몹이라 크게 그린다
  },

  steal: {
    startle: 0.75,      // 깨어나서 벌떡 일어나기까지 — 이 틈에 도망쳐야 한다
    reach: 74,          // 둥지에 손이 닿는 거리
    catchDist: 46,      // 파수꾼에게 잡히는 거리
    stun: 1.0,
    sleepAgain: 3.5     // 추격 포기 후 다시 잠들기까지
  },

  hatch: { time: 14 },  // 울타리에 넣은 알이 부화하기까지(초)

  offline: { capHours: 2, rate: 0.5 },
  world: { w: 6400, h: 1400 },
  save: { key: 'steal_an_egg_save_v3', interval: 5 }
};

/* ---------- 튜토리얼 ---------- */
const TUTORIAL = [
  { id:'move',   title:'움직여보기',     body:'WASD / 방향키로 움직여. (모바일은 왼쪽 화면 드래그)' },
  { id:'goFarm', title:'농장 둥지로',    body:'오른쪽 농장에 닭이 자고 있어. 노란 화살표를 따라가.' },
  { id:'steal',  title:'알 훔치기',      body:'둥지엔 알이 4개. 옆에서 [E] 를 꾹! 하나 들 때마다 닭이 깨서 쫓아온다.' },
  { id:'escape', title:'도망쳐!',        body:'잡히면 알을 떨어뜨려. 기지 쪽으로 도망가서 따돌려.' },
  { id:'pen',    title:'울타리에 넣기',  body:'기지 울타리 앞에서 [E]. 알이 부화하면 펫이 돈을 벌어줘.' },
  { id:'run',    title:'러닝머신 타기',  body:'러닝머신 위에서 [E] 를 꾹 눌러 달려. 돈을 써서 내 속도를 올린다.' },
  { id:'far',    title:'더 먼 구역으로', body:'구역마다 파수꾼이 더 빨라. 시크릿은 사막부터 나온다 — 속도를 올려야 갈 수 있어!' }
];
