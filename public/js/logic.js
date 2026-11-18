// Чистая логика платформы без DOM: подключается в браузере и в тестах (node --test)
// Правила: функции без побочных эффектов, никакой работы с document/fetch.

// Шкала уровней дефицитов (единая для самооценки, теста и кабинета)
function calculateDeficitLevel(pct) {
  if (pct >= 81) return { level: 'low', name: 'Низкий уровень дефицитов', desc: 'Высокая сформированность. Вы готовы транслировать опыт и выступать наставником Лиги.', color: 'var(--success)' };
  if (pct >= 70) return { level: 'above_average', name: 'Выше среднего уровня', desc: 'Продвинутый уровень. Выполняются задания базового и частично повышенного уровней.', color: '#0d9488' };
  if (pct >= 50) return { level: 'medium', name: 'Средний уровень дефицитов', desc: 'Базовый уровень. Требуется включение в индивидуальную программу развития (ИПР).', color: 'var(--warning)' };
  return { level: 'high', name: 'Высокий уровень дефицитов', desc: 'Требуется интенсивное развитие. Первоочередное включение в ИПР и наставническое сопровождение.', color: 'var(--danger)' };
}

// Итоговый процент самооценки: сумма баллов по шкале 0–4 к максимуму
function computeSaPercent(scores) {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const clean = scores.map(s => Math.max(0, Math.min(4, Number(s) || 0)));
  const sum = clean.reduce((a, b) => a + b, 0);
  return Math.round((sum / (clean.length * 4)) * 100);
}

// Детерминированное перемешивание вариантов ответа.
// В исходных данных верный ответ у большинства вопросов стоял вторым —
// тест проходился угадыванием. Возвращает индексы-перестановку и позицию верного ответа.
function shufflePermutation(size, seed) {
  let s = (seed * 2654435761 + 1) % 2147483647;
  if (s <= 0) s = 1;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  const idx = Array.from({ length: size }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { idx };
}

function shuffleTestOptions(questions) {
  questions.forEach((t, qi) => {
    const { idx } = shufflePermutation((t.o || []).length, qi + 1);
    t.oShown = idx.map(i => t.o[i]);
    t.cShown = idx.indexOf(t.c);
  });
  return questions;
}

// Ранг уровня для проверок монотонности (чем больше, тем лучше результат)
function deficitRank(pct) {
  const lv = calculateDeficitLevel(pct).level;
  return { low: 3, above_average: 2, medium: 1, high: 0 }[lv];
}

// Экспорт для тестов (Node) и глобальные имена для браузера
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDeficitLevel, computeSaPercent, shufflePermutation, shuffleTestOptions, deficitRank };
}
