/* =========================================================
 *  util.js - 공용 헬퍼
 * ========================================================= */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist  = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
const now   = () => performance.now() / 1000;

/* 숫자 축약: 12500 -> 1.25만.  러닝머신 레벨이 무한이라 아주 큰 수까지 다룬다 */
const BIG_UNITS = [
  [1e48, '극'], [1e44, '재'], [1e40, '정'], [1e36, '간'], [1e32, '구'],
  [1e28, '양'],  [1e24, '자'], [1e20, '해'], [1e16, '경'], [1e12, '조'],
  [1e8, '억'],   [1e4, '만'],  [1e3, 'K']
];
function fmtMoney(n) {
  if (!isFinite(n)) return '∞';
  n = Math.floor(n);
  if (n < 1000) return String(n);
  for (const [d, suf] of BIG_UNITS) {
    if (n < d) continue;
    const v = n / d;
    if (v >= 10000) break;            // 단위를 넘어서면 지수 표기로
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + suf;
  }
  return n.toExponential(2).replace('e+', 'e');
}

function fmtRate(n) { return fmtMoney(n) + '/초'; }

function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

/* 가중치 추첨 */
function weightedPick(items, weightFn) {
  let total = 0;
  for (const it of items) total += weightFn(it);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/* luck 을 반영해 등급 뽑기. maxTier 가 있으면 그 위 등급은 아예 나오지 않는다 */
function rollRarity(luck, maxTier) {
  const pool = maxTier === undefined ? RARITIES : RARITIES.filter(r => r.tier <= maxTier);
  return weightedPick(pool, r => r.weight * Math.pow(luck, r.tier));
}
function rollVariant() {
  return weightedPick(VARIANTS, v => v.weight);
}

/* 펫 하나 생성 */
let _petSeq = 1;
function makePet(speciesId, rarityId, variantId) {
  const sp = SPECIES[speciesId] || SPECIES.chicken;
  return {
    uid: _petSeq++,
    species: sp.id,
    rarity: rarityId,
    variant: variantId,
    seed: Math.random() * 1000
  };
}
/* 초당 수익 = 생물 기본속도 x 등급배수 x 변형배수 */
function petIncome(pet) {
  const sp = SPECIES[pet.species] || SPECIES.chicken;
  return sp.base * RARITY_BY_ID[pet.rarity].mult * VARIANT_BY_ID[pet.variant].mult;
}
function petFullName(pet) {
  const sp = SPECIES[pet.species] || SPECIES.chicken;
  const v = VARIANT_BY_ID[pet.variant];
  const r = RARITY_BY_ID[pet.rarity];
  return (v.name ? v.name + ' ' : '') + r.name + ' ' + sp.pet;
}

/* 등급 하한이 있는 추첨 (보스용) */
function rollRarityMin(luck, minTier) {
  const pool = RARITIES.filter(r => r.tier >= (minTier || 0));
  return weightedPick(pool, r => r.weight * Math.pow(luck, r.tier));
}

/* 색 혼합 */
function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t)) + (((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t)) + (((pb >> 8) & 255) * t));
  const c = Math.round(((pa & 255) * (1 - t)) + ((pb & 255) * t));
  return `rgb(${r},${g},${c})`;
}

/* 무지개 색상 */
function rainbow(t, l = 60) {
  return `hsl(${(t * 120) % 360}, 95%, ${l}%)`;
}

/* 원형 사각형 경로 */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* 위에 밝은 면 / 아래 어두운 면이 있는 "블록" — 로블록스 느낌의 핵심 */
function block(ctx, x, y, w, h, color, opts = {}) {
  const top = opts.top !== false;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  if (top) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x, y, w, Math.max(2, h * 0.14));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(x, y + h - Math.max(2, h * 0.12), w, Math.max(2, h * 0.12));
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x + w - Math.max(2, w * 0.14), y, Math.max(2, w * 0.14), h);
  if (opts.outline) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

function shadowEllipse(ctx, x, y, rx, ry, a = 0.25) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* 캔버스 중앙 정렬 텍스트 (외곽선 포함) */
function outlineText(ctx, text, x, y, size, fill, stroke = '#000', weight = 800) {
  ctx.font = `${weight} ${size}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
