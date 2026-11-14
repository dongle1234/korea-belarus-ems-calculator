// 한국 → 벨라루스 EMS 요금표 (우체국 국제특급)
// 출처: https://ems.epost.go.kr/upFile/guide/2026emsPrice.pdf (2026년 요금표)
// 비서류 요금은 2026.7.1부터 추가운송수수료 포함 요금. 서류 요금은 2017.7.1부터 적용.
// 벨라루스 = 3지역. 비서류 최대 20kg, 서류 최대 2kg.
// 요금적용중량 = max(실중량, 부피중량), 부피중량(kg) = 가로×세로×높이(cm) / 6000
// 적용 구간은 "이하" 기준: 중량이 구간 상한을 초과하면 다음 구간.
// 예: 8.22kg → 8.5kg 구간 → 128,500원 (스크린샷 실측과 일치)

export const EMS_RATES = {
  parcel: [ // 비서류(소포), 3지역, 원
    [0.5, 37500], [0.75, 41000], [1, 43500], [1.25, 46000],
    [1.5, 48000], [1.75, 51000], [2, 54500], [2.5, 60000],
    [3, 64500], [3.5, 69500], [4, 74500], [4.5, 79500],
    [5, 86000], [5.5, 91500], [6, 96500], [6.5, 102000],
    [7, 108500], [7.5, 115500], [8, 122000], [8.5, 128500],
    [9, 135500], [9.5, 142500], [10, 150000], [10.5, 157500],
    [11, 165500], [11.5, 173000], [12, 181000], [12.5, 188000],
    [13, 196000], [13.5, 203000], [14, 210500], [14.5, 217500],
    [15, 224000], [15.5, 231000], [16, 238000], [16.5, 245000],
    [17, 252000], [17.5, 259000], [18, 266500], [18.5, 273500],
    [19, 280500], [19.5, 289000], [20, 296000],
  ],
  document: [ // 서류, 3지역, 원 (최대 2kg)
    [0.3, 28000], [0.5, 30000], [0.75, 32000], [1, 34000],
    [1.25, 36000], [1.5, 38000], [1.75, 40000], [2, 42000],
  ],
};

export const MAX_WEIGHT_KG = { parcel: 20, document: 2 };
export const MAX_LENGTH_M = 1.5; // 길이 <= 1.5m
export const MAX_LENGTH_PLUS_GIRTH_M = 3; // 길이 + 둘레 <= 3m

export function volumetricWeightKg(lCm, wCm, hCm) {
  return (lCm * wCm * hCm) / 6000;
}

export function chargeableWeightKg(actualKg, lCm, wCm, hCm) {
  const vol = volumetricWeightKg(lCm, wCm, hCm);
  return { chargeableKg: Math.max(actualKg, vol), volumetricKg: vol };
}

export function lookupRate(type, chargeableKg) {
  const table = EMS_RATES[type];
  for (const [limit, price] of table) {
    if (chargeableKg <= limit + 1e-9) return { stepKg: limit, price };
  }
  return null; // 초과
}

export function sizeCheck(lCm, wCm, hCm) {
  const sides = [lCm, wCm, hCm].sort((a, b) => b - a);
  const longestM = sides[0] / 100;
  const girthM = (2 * (sides[1] + sides[2])) / 100;
  return {
    longestM,
    girthM,
    totalM: longestM + girthM,
    lengthOk: longestM <= MAX_LENGTH_M + 1e-9,
    totalOk: longestM + girthM <= MAX_LENGTH_PLUS_GIRTH_M + 1e-9,
  };
}

export function calculate({ type, actualG, lCm, wCm, hCm, prepaidDiscount = false }) {
  const actualKg = actualG / 1000;
  const { chargeableKg, volumetricKg } = chargeableWeightKg(actualKg, lCm, wCm, hCm);
  const size = sizeCheck(lCm, wCm, hCm);
  const maxKg = MAX_WEIGHT_KG[type];
  if (chargeableKg > maxKg + 1e-9) {
    return { ok: false, reason: `요금적용중량 ${chargeableKg.toFixed(2)}kg이 ${type === 'parcel' ? '비서류' : '서류'} 최대 ${maxKg}kg을 초과합니다.`, chargeableKg, volumetricKg, size };
  }
  if (!size.lengthOk || !size.totalOk) {
    return { ok: false, reason: `최대규격 초과: 길이 ${size.longestM.toFixed(2)}m (≤1.5m), 길이+둘레 ${size.totalM.toFixed(2)}m (≤3m)`, chargeableKg, volumetricKg, size };
  }
  const found = lookupRate(type, chargeableKg);
  if (!found) return { ok: false, reason: '요금표에 없는 구간입니다.', chargeableKg, volumetricKg, size };
  const discount = prepaidDiscount ? Math.round(found.price * 0.05) : 0;
  return {
    ok: true,
    type, actualKg, volumetricKg, chargeableKg,
    stepKg: found.stepKg, price: found.price,
    discount, total: found.price - discount,
    size,
  };
}
