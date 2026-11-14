import { calculate } from './rates.js';
import assert from 'node:assert';

// 스크린샷 실측: 8,220g, 41x31x28 -> 128,500원
let r = calculate({ type: 'parcel', actualG: 8220, lCm: 41, wCm: 31, hCm: 28 });
assert.equal(Math.round(r.volumetricKg * 1000), 5931);
assert.equal(r.stepKg, 8.5);
assert.equal(r.total, 128500);
assert.equal(r.ok, true);

// 경계: 0.5kg 이하, 부피중량이 더 큰 경우
r = calculate({ type: 'parcel', actualG: 400, lCm: 30, wCm: 30, hCm: 30 }); // 부피 4.5kg
assert.equal(r.stepKg, 4.5);
assert.equal(r.total, 79500);

// 20kg 초과 -> 불가
r = calculate({ type: 'parcel', actualG: 20500, lCm: 40, wCm: 30, hCm: 30 });
assert.equal(r.ok, false);

// 서류 1kg -> 34,000원
r = calculate({ type: 'document', actualG: 1000, lCm: 20, wCm: 15, hCm: 2 });
assert.equal(r.total, 34000);

// 사전접수 5% 할인: 128,500 -> 122,075원
r = calculate({ type: 'parcel', actualG: 8220, lCm: 41, wCm: 31, hCm: 28, prepaidDiscount: true });
assert.equal(r.total, 122075);

console.log('all tests passed');
