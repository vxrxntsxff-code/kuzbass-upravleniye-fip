// Property-тесты: утверждения, которые не должны ломаться ни при каких входах
// (по влогу: «statements that shouldn't be breakable», тысячи входов без предвзятости автора).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { calculateDeficitLevel, computeSaPercent, shufflePermutation, shuffleTestOptions, deficitRank } = require(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'js', 'logic.js'));

// Детерминированный ГПСЧ, чтобы прогон был воспроизводимым
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('P1: процент самооценки всегда в диапазоне 0–100, что бы ни пришло на вход', () => {
  const rnd = mulberry32(42);
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 8);
    const scores = Array.from({ length: n }, () => Math.floor(rnd() * 11) - 2); // включая мусор: -2..8
    const pct = computeSaPercent(scores);
    assert.ok(Number.isFinite(pct), `конечное число для [${scores}]`);
    assert.ok(pct >= 0 && pct <= 100, `0 ≤ ${pct} ≤ 100 для [${scores}]`);
  }
});

test('P2: монотонность — больше баллов не даёт худший уровень дефицитов', () => {
  const rnd = mulberry32(7);
  for (let i = 0; i < 2000; i++) {
    const a = Math.floor(rnd() * 21); // сумма из 5 шкал 0–20
    const b = Math.floor(rnd() * 21);
    const rankA = deficitRank(computeSaPercent([a]));
    const rankB = deficitRank(computeSaPercent([b]));
    if (a > b) assert.ok(rankA >= rankB, `сумма ${a} > ${b}, но ранг ниже: ${rankA} < ${rankB}`);
  }
});

test('P3: границы шкалы 81/70/50 совпадают с ТЗ во всех четырёх диапазонах', () => {
  const cases = [
    [81, 'low'], [100, 'low'], [80, 'above_average'], [70, 'above_average'],
    [69, 'medium'], [50, 'medium'], [49, 'high'], [0, 'high']
  ];
  for (const [pct, expected] of cases) {
    assert.equal(calculateDeficitLevel(pct).level, expected, `${pct}% → ${expected}`);
  }
});

test('P4: перемешивание — перестановка с раундтрипом oShown[cShown] === o[c]', () => {
  const questions = Array.from({ length: 200 }, (_, qi) => {
    const size = 2 + (qi % 4);
    const answers = Array.from({ length: size }, (_, i) => `вариант-${qi}-${i}`);
    return { o: answers, c: qi % size };
  });
  shuffleTestOptions(questions);
  questions.forEach((q, qi) => {
    assert.equal(q.oShown.length, q.o.length, `вопрос ${qi}: длина сохранена`);
    assert.deepEqual([...q.oShown].sort(), [...q.o].sort(), `вопрос ${qi}: та же мультимножество вариантов`);
    assert.equal(q.oShown[q.cShown], q.o[q.c], `вопрос ${qi}: верный ответ указывает на тот же текст`);
  });
});

test('P5: перемешивание детерминировано (одинаковые входы — одинаковый результат)', () => {
  const make = () => [{ o: ['a', 'b', 'c', 'd'], c: 1 }, { o: ['x', 'y'], c: 0 }];
  const a = shuffleTestOptions(make());
  const b = shuffleTestOptions(make());
  assert.deepEqual(a.map(q => q.oShown), b.map(q => q.oShown));
  assert.deepEqual(a.map(q => q.cShown), b.map(q => q.cShown));
});

test('P6: перестановка действительно меняет порядок (не тождественная) на 20 вопросах', () => {
  const questions = Array.from({ length: 20 }, (_, qi) => ({ o: ['A', 'B', 'C', 'D'], c: 1 }));
  shuffleTestOptions(questions);
  const shuffled = questions.map(q => q.oShown.join('|')).join(';');
  const original = questions.map(q => q.o.join('|')).join(';');
  assert.notEqual(shuffled, original, 'перемешивание не должно быть пустой операцией');
});

test('P7: shufflePermutation корректен для крайних размеров', () => {
  for (const size of [1, 2, 4, 8, 64]) {
    const { idx } = shufflePermutation(size, 999);
    assert.deepEqual([...idx].sort((a, b) => a - b), Array.from({ length: size }, (_, i) => i), `размер ${size}`);
  }
});
