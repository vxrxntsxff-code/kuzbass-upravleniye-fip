// Differential-тест: старая система (статичный прототип ТЗ) против новой (logic.js)
// на одних входах. Любое расхождение шкалы — баг (по влогу: «run old and new on
// the same inputs; any divergence is a bug»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { calculateDeficitLevel, computeSaPercent } = require(join(ROOT, 'public', 'js', 'logic.js'));

// Старая шкала из prototype.html: пороговые условия if(p>=81)/if(p>=70)/if(p>=50)
// и её функция saLevel(p) — вычисляем так же, как в прототипе.
const prototypeSource = readFileSync(join(ROOT, 'prototype.html'), 'utf8');

function prototypeLevel(p) {
  if (p >= 81) return 'низкий';
  if (p >= 70) return 'выше среднего';
  if (p >= 50) return 'средний';
  return 'высокий';
}

function newLevel(p) {
  const map = { low: 'низкий', above_average: 'выше среднего', medium: 'средний', high: 'высокий' };
  return map[calculateDeficitLevel(p).level];
}

test('D1: прототип действительно содержит пороги 81/70/50 (защита от дрейфа референса)', () => {
  assert.ok(prototypeSource.includes('p>=81'), 'порог 81 в прототипе');
  assert.ok(prototypeSource.includes('p>=70'), 'порог 70 в прототипе');
  assert.ok(prototypeSource.includes('p>=50'), 'порог 50 в прототипе');
});

test('D2: новая шкала совпадает со старой на всех процентах 0–100', () => {
  for (let p = 0; p <= 100; p++) {
    assert.equal(newLevel(p), prototypeLevel(p), `${p}% должен классифицироваться одинаково`);
  }
});

test('D3: формула процента самооценки совпадает с прототипом на случайных баллах', () => {
  // Прототип: pct = Math.round(sum / (SA.length*4) * 100), SA.length = 5
  const rnd = mulberry32(2026);
  for (let i = 0; i < 1000; i++) {
    const scores = Array.from({ length: 5 }, () => Math.floor(rnd() * 5));
    const sum = scores.reduce((a, b) => a + b, 0);
    const oldPct = Math.round(sum / (5 * 4) * 100);
    assert.equal(computeSaPercent(scores), oldPct, `баллы [${scores}]`);
  }
});

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
