/* =========================================================
 *  계란을 훔치다 (Steal an Egg)
 *  config.js - 등급 / 아우라 / 생물 / 보스 / 밸런스
 *
 *  최종 수익 = 생물 기본속도 × 등급 배수 × 아우라 변형 배수 × 러닝머신 배수
 * ========================================================= */

/* ---------- 등급 (낮음 -> 높음) ---------- */
const RARITIES = [
  {
    id: 'common', name: '일반', en: 'COMMON', tier: 0,
    weight: 5000, mult: 1,
    c1: '#8d99ab', c2: '#e4ebf4', glow: '#aab6c6',
    aura: 'none', auraName: '없음'
  },
  {
    id: 'rare', name: '레어 알', en: 'RARE', tier: 1,
    weight: 2400, mult: 3,
    c1: '#1257d6', c2: '#8ed2ff', glow: '#3d9bff',
    aura: 'bubble', auraName: '물결'
  },
  {
    id: 'epic', name: '에픽', en: 'EPIC', tier: 2,
    weight: 1100, mult: 9,
    c1: '#6d1fd0', c2: '#e3b0ff', glow: '#b45cff',
    aura: 'spark', auraName: '자수정'
  },
  {
    id: 'secret', name: '시크릿', en: 'SECRET', tier: 3,
    weight: 340, mult: 30,
    c1: '#3a0713', c2: '#ff2b52', glow: '#ff2b4d',
    aura: 'shadow', auraName: '그림자'
  },
  {
    id: 'divine', name: '디바인', en: 'DIVINE', tier: 4,
    weight: 110, mult: 100,
    c1: '#c48a00', c2: '#fff3ae', glow: '#ffd447',
    aura: 'halo', auraName: '후광'
  },
  {
    id: 'cosmic', name: '코스믹', en: 'COSMIC', tier: 5,
    weight: 34, mult: 350,
    c1: '#2b1b7a', c2: '#43e8ff', glow: '#7a5cff',
    aura: 'nebula', auraName: '성운'
  },
  {
    id: 'eternal', name: '영원한', en: 'ETERNAL', tier: 6,
    weight: 6, mult: 1600,
    c1: '#ff5fbe', c2: '#7dffe0', glow: '#ffffff',
    aura: 'eternal', auraName: '무한'
  }
];
const RARITY_BY_ID = {};
RARITIES.forEach(r => { RARITY_BY_ID[r.id] = r; });

/* ---------- 아우라 변형 (희귀 오버레이) ---------- */
const VARIANTS = [
  { id: 'normal',  name: '',       weight: 870, mult: 1, tag: '' },
  { id: 'shiny',   name: '빛나는', weight: 105, mult: 2, tag: 'SHINY' },
  { id: 'rainbow', name: '무지개', weight: 25,  mult: 5, tag: 'RAINBOW' }
];
const VARIANT_BY_ID = {};
VARIANTS.forEach(v => { VARIANT_BY_ID[v.id] = v; });

/* ---------- 알을 품은 생물 ----------
 *  base  : 권장속도 (초당 수익의 기준값)
 *  luck  : 등급 가중치에 luck^tier 로 곱해짐
 *  alert : 경계 주기 배수 (높을수록 자주 뒤돌아봄)
 */
const SPECIES = {
  chicken: { id:'chicken', name:'닭',      pet:'병아리',     zone:'farm',   base:1,       luck:1.00, alert:1.00, spd:[42,66],   scale:1.00, form:'chicken',
             body:'#ffffff', body2:'#d7dde6', accent:'#ff4d4d', beak:'#ffa726' },
  hen:     { id:'hen',     name:'갈색 닭', pet:'꼬꼬',       zone:'farm',   base:2.5,     luck:1.25, alert:1.15, spd:[46,72],   scale:1.02, form:'chicken',
             body:'#d29055', body2:'#a56b38', accent:'#ff4d4d', beak:'#ffb74d' },

  duck:    { id:'duck',    name:'오리',    pet:'새끼오리',   zone:'pond',   base:150,     luck:1.45, alert:1.30, spd:[86,124],  scale:0.98, form:'duck',
             body:'#f3f6fb', body2:'#c3cddc', accent:'#ffd54a', beak:'#ffb300',
             trait:'헤엄치듯 빠르게 도망친다' },
  swan:    { id:'swan',    name:'백조',    pet:'새끼백조',   zone:'pond',   base:380,     luck:1.65, alert:1.45, spd:[92,132],  scale:1.16, form:'duck',
             body:'#ffffff', body2:'#dfe7f5', accent:'#111111', beak:'#ff7043',
             trait:'목이 길어 멀리서도 눈치챈다', warnMul:0.8 },

  scorpion:{ id:'scorpion',name:'전갈',    pet:'새끼전갈',   zone:'desert', base:1000,    luck:1.85, alert:1.55, spd:[74,108],  scale:1.05, form:'scorpion',
             body:'#c8763a', body2:'#8c4a1e', accent:'#ffcf6b', beak:'#3a2416',
             trait:'모래 속에 숨었다가 갑자기 튀어나온다', burrow:true },
  kingScorpion:{ id:'kingScorpion', name:'킹 전갈', pet:'전갈왕 새끼', zone:'desert', base:2600, luck:2.05, alert:1.70, spd:[80,116], scale:1.28, form:'scorpion',
             body:'#4b3b6b', body2:'#2b2244', accent:'#b98bff', beak:'#1b1226',
             trait:'독침 경고가 거의 없다', warnMul:0.6, burrow:true },

  tiger:   { id:'tiger',   name:'호랑이',  pet:'아기호랑이', zone:'jungle', base:10000,   luck:2.25, alert:1.80, spd:[110,158], scale:1.34, form:'tiger',
             body:'#ff9f2e', body2:'#c96c00', accent:'#1b1b1b', beak:'#ffe0b2',
             trait:'들키면 짧게 달려든다', pounce:true },
  whiteTiger:{ id:'whiteTiger', name:'백호', pet:'아기백호',  zone:'jungle', base:26000,  luck:2.45, alert:1.95, spd:[118,168], scale:1.40, form:'tiger',
             body:'#eef3fb', body2:'#b9c6d8', accent:'#1b1b1b', beak:'#dceaff',
             trait:'소리 없이 접근을 감지한다', warnMul:0.65, pounce:true },

  whale:   { id:'whale',   name:'고래',    pet:'새끼고래',   zone:'ocean',  base:500000,  luck:2.65, alert:2.00, spd:[58,92],   scale:1.75, form:'whale',
             body:'#3f7fd4', body2:'#22508f', accent:'#bfe4ff', beak:'#0f2a4d',
             trait:'물보라를 뿜어 시야를 가린다', spout:true },
  orca:    { id:'orca',    name:'범고래',  pet:'새끼범고래', zone:'ocean',  base:1300000, luck:2.85, alert:2.15, spd:[66,104],  scale:1.85, form:'whale',
             body:'#1b1f2a', body2:'#0d1016', accent:'#ffffff', beak:'#0a0d12',
             trait:'무리 지어 경계한다', warnMul:0.6, spout:true },

  dino:    { id:'dino',    name:'공룡',    pet:'아기공룡',   zone:'dino',   base:1800000,  luck:3.00, alert:2.25, spd:[92,132],  scale:1.9,  form:'dino',
             body:'#5fbf5a', body2:'#2f7a3a', accent:'#ffd54a', beak:'#f5f1e0',
             trait:'발소리로 땅이 흔들린다 — 화면이 진동', quake:true },
  trex:    { id:'trex',    name:'티라노',  pet:'아기티라노', zone:'dino',   base:4500000,  luck:3.15, alert:2.4,  spd:[104,150], scale:2.05, form:'dino',
             body:'#a8452f', body2:'#6d2617', accent:'#ffe066', beak:'#fff6e0',
             trait:'포효하면 예고 없이 돌아본다', warnMul:0.5, quake:true },

  skeleton:{ id:'skeleton',name:'해골장군',pet:'꼬마해골',   zone:'space',  base:18000000, luck:3.30, alert:2.5,  spd:[88,126],  scale:1.55, form:'skeleton',
             body:'#e9edf5', body2:'#aeb6c6', accent:'#8affe0', beak:'#5a6376',
             trait:'무중력에서 순간이동하듯 움직인다', blink:true },
  skullKing:{id:'skullKing',name:'해골왕', pet:'꼬마해골왕', zone:'space',  base:45000000, luck:3.5,  alert:2.65, spd:[96,138],  scale:1.72, form:'skeleton',
             body:'#2a2f45', body2:'#12162a', accent:'#ff4d8d', beak:'#6b5cff',
             trait:'검을 휘두르면 예고가 사라진다', warnMul:0.42, blink:true }
};
const SPECIES_LIST = Object.values(SPECIES);
const CHICKEN_TYPES = SPECIES;   // 하위 호환

/* ---------- 보스 (일반 몹과 규칙이 다르다) ----------
 *  · 알을 여러 개 품고 있고 하나 훔칠 때마다 분노 단계 상승 (예고가 더 짧아짐)
 *  · 예고(❗)가 아주 짧고 뒤돌아보는 시간이 길다
 *  · 들키면 "돌진" — 넉백 + 긴 기절 + 가방의 알 1개 손실
 *  · 등급 하한이 보장된다
 */
const BOSSES = [
  {
    id:'kkoko', zone:'farm', name:'꼬꼬대왕', title:'앞마당의 폭군', form:'rooster',
    species:'hen', eggs:3, minTier:2, luck:2.6, base:8,
    fillTime:3.6, warn:0.32, look:1.45, calm:[1.1,2.1],
    chargeSpeed:420, chargeTime:1.05, stun:2.0, cooldown:100, scale:2.15, roam:150,
    body:'#e8e8ee', body2:'#b9bfcc', accent:'#ff2b4d', beak:'#ffb300', glow:'#ff8a5c'
  },
  {
    id:'motherduck', zone:'pond', name:'마더덕', title:'연못의 지배자', form:'duck',
    species:'swan', eggs:3, minTier:2, luck:2.9, base:900,
    fillTime:3.9, warn:0.30, look:1.55, calm:[1.0,2.0],
    chargeSpeed:470, chargeTime:1.1, stun:2.1, cooldown:130, scale:2.25, roam:160,
    body:'#fff6d8', body2:'#e6c46a', accent:'#ff9800', beak:'#ff8f00', glow:'#ffd447'
  },
  {
    id:'scorpionking', zone:'desert', name:'스콜피온 킹', title:'모래폭풍의 왕', form:'scorpion',
    species:'kingScorpion', eggs:3, minTier:3, luck:3.1, base:6000,
    fillTime:4.2, warn:0.26, look:1.65, calm:[0.95,1.9],
    chargeSpeed:500, chargeTime:1.15, stun:2.3, cooldown:170, scale:2.3, roam:170,
    body:'#7a2f2f', body2:'#3f1414', accent:'#ffc14d', beak:'#1b0d0d', glow:'#ff6b3d'
  },
  {
    id:'junglelord', zone:'jungle', name:'정글 군주', title:'초록 어둠의 포식자', form:'tiger',
    species:'whiteTiger', eggs:3, minTier:4, luck:3.4, base:60000,
    fillTime:4.5, warn:0.23, look:1.75, calm:[0.9,1.8],
    chargeSpeed:560, chargeTime:1.2, stun:2.5, cooldown:210, scale:2.4, roam:180,
    body:'#1f2a22', body2:'#0f1712', accent:'#7dff8a', beak:'#c9ffd4', glow:'#7dff8a'
  },
  {
    id:'leviathan', zone:'ocean', name:'리바이어던', title:'심해의 신화', form:'whale',
    species:'orca', eggs:3, minTier:5, luck:3.8, base:3000000,
    fillTime:5.0, warn:0.20, look:1.95, calm:[0.85,1.7],
    chargeSpeed:620, chargeTime:1.3, stun:2.8, cooldown:280, scale:2.6, roam:190,
    body:'#123a5c', body2:'#061a2c', accent:'#43e8ff', beak:'#9fe8ff', glow:'#43e8ff'
  },
  {
    id:'volcano', zone:'dino', name:'화산의 폭군', title:'멸종을 부른 자', form:'dino',
    species:'trex', eggs:3, minTier:5, luck:4.1, base:11000000,
    fillTime:5.3, warn:0.18, look:2.05, calm:[0.8,1.6],
    chargeSpeed:660, chargeTime:1.35, stun:3.0, cooldown:320, scale:2.9, roam:200,
    body:'#c4442a', body2:'#61190f', accent:'#ffb300', beak:'#fff1c9', glow:'#ff6a2a'
  },
  {
    id:'skullgeneral', zone:'space', name:'해골 대장군', title:'우주의 끝을 지키는 자', form:'skeleton',
    species:'skullKing', eggs:3, minTier:6, luck:5.0, base:110000000,
    fillTime:5.8, warn:0.15, look:2.2, calm:[0.75,1.5],
    chargeSpeed:720, chargeTime:1.4, stun:3.2, cooldown:400, scale:3.0, roam:210,
    body:'#f1f4fb', body2:'#8d95a8', accent:'#ff2b6b', beak:'#6b5cff', glow:'#ff2b6b'
  }
];
const BOSS_BY_ZONE = {};
BOSSES.forEach(b => { BOSS_BY_ZONE[b.zone] = b; });

/* ---------- 구역 ---------- */
const ZONES = [
  { id:'farm',   name:'농장',        cost:0,        emoji:'🐔', speed:1,      mobs:['chicken','hen'],            boss:'kkoko' },
  { id:'pond',   name:'오리 연못',   cost:2500,     emoji:'🦆', speed:150,    mobs:['duck','swan'],              boss:'motherduck' },
  { id:'desert', name:'사막',        cost:250000,   emoji:'🦂', speed:1000,   mobs:['scorpion','kingScorpion'],  boss:'scorpionking' },
  { id:'jungle', name:'정글',        cost:3000000,  emoji:'🐯', speed:10000,  mobs:['tiger','whiteTiger'],       boss:'junglelord' },
  { id:'ocean',  name:'바다',        cost:60000000, emoji:'🐋', speed:500000, mobs:['whale','orca'],             boss:'leviathan' },
  { id:'dino',   name:'공룡 계곡',   cost:800000000,   emoji:'🦖', speed:1800000,  mobs:['dino','trex'],            boss:'volcano' },
  { id:'space',  name:'우주',        cost:15000000000, emoji:'💀', speed:18000000, mobs:['skeleton','skullKing'],   boss:'skullgeneral' }
];
const ZONE_BY_ID = {};
ZONES.forEach(z => { ZONE_BY_ID[z.id] = z; });

/* ---------- 러닝머신 ---------- */
const TREADMILLS = [
  { id:'basic',   name:'기본 러닝머신',  mult:1,   cost:0,         belt:'#4a5262', frame:'#8e9bb0' },
  { id:'pro',     name:'프로 러닝머신',  mult:2.2, cost:8000,      belt:'#1f3a5f', frame:'#3d8bff' },
  { id:'turbo',   name:'터보 러닝머신',  mult:5,   cost:400000,    belt:'#4a1230', frame:'#ff4d8d' },
  { id:'quantum', name:'퀀텀 러닝머신',  mult:12,  cost:25000000,  belt:'#132b2b', frame:'#00e5c0' }
];
const TREADMILL_BY_ID = {};
TREADMILLS.forEach(t => { TREADMILL_BY_ID[t.id] = t; });

/* ---------- 밸런스 ---------- */
const CONFIG = {
  player: { speed: 250, radius: 16 },

  steal: {
    range: 82,
    fillTime: 2.6,
    warnTime: 0.62,
    lookTime: 1.05,
    calmMin: 1.5,
    calmMax: 3.4,
    stunTime: 1.1,
    respawn: 9
  },

  incubator: {
    baseSlots: 1,
    maxSlots: 3,
    slotCost: [0, 5000, 400000],
    growTime: 20,
    petBonus: 0.9
  },

  treadmillSlots: {
    base: 1,
    max: 8,
    cost: n => Math.floor(600 * Math.pow(3.4, n - 1))
  },

  backpack: {
    levels: [1, 2, 4, 7],
    cost: [0, 3000, 120000, 5000000]
  },

  offline: { capHours: 2, rate: 0.5 },

  world: { w: 6800, h: 1520 },

  save: { key: 'steal_an_egg_save_v2', interval: 5 }
};

/* ---------- 튜토리얼 ---------- */
const TUTORIAL = [
  { id:'move',    title:'움직여보기',    body:'WASD / 방향키로 움직여봐. (모바일은 왼쪽 조이스틱)' },
  { id:'goFarm',  title:'농장으로!',     body:'오른쪽 농장으로 가. 노란 화살표가 길을 알려줄게.' },
  { id:'steal',   title:'알 훔치기',     body:'닭 근처에서 [E] 를 꾹! 머리 위에 ❗ 뜨면 즉시 손 떼야 해.' },
  { id:'deliver', title:'부화기에 넣기', body:'기지로 돌아가 부화기 위에서 [E] 로 알을 넣어.' },
  { id:'hatch',   title:'성장 & 부화',   body:'알이 다 자라면 [E] 로 부화! 등급이 공개된다.' },
  { id:'place',   title:'러닝머신 가동', body:'러닝머신 위에서 [E] 로 펫을 올려. 돈이 자동으로 들어와!' },
  { id:'buy',     title:'확장하기',      body:'[B] 상점에서 러닝머신 슬롯과 다음 구역을 사자.' },
  { id:'boss',    title:'보스 도전',     body:'구역마다 보스가 있어. 예고가 짧고 들키면 돌진해온다 — 대신 등급 하한 보장!' }
];
