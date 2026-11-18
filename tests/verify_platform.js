const assert = require('node:assert');

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting Full-Story Automated Verification for Kuzbass Platform...\n');

  // Test 1: Frontend HTML delivery and legacy string absence
  console.log('1. Checking HTML delivery and verified structure...');
  const htmlRes = await request('/');
  assert.strictEqual(htmlRes.status, 200, 'HTML should return 200');
  assert.ok(htmlRes.data.includes('Региональная модель'), 'HTML must include Региональная модель');
  assert.ok(htmlRes.data.includes('Управленческий навигатор Кузбасса'), 'HTML must include Управленческий навигатор Кузбасса');
  assert.ok(htmlRes.data.includes('logo_iro.png'), 'HTML must reference official IRO logo');
  assert.ok(!htmlRes.data.includes('ФИП РАО'), 'HTML must NOT include ФИП РАО');
  assert.ok(!htmlRes.data.includes('2027–2029'), 'HTML must NOT include 2027–2029');
  assert.ok(!htmlRes.data.includes('Горячая линия методической поддержки'), 'HTML must NOT include removed support hotline');
  assert.ok(htmlRes.data.includes('31 опорн'), 'HTML should include 31 опорная площадка per track 4 note');
  console.log('   ✓ HTML verified cleanly with new structure and without legacy mentions\n');

  // Test 2: Stats summary
  console.log('2. Checking /api/stats/summary endpoint...');
  const statsRes = await request('/api/stats/summary');
  assert.strictEqual(statsRes.status, 200);
  assert.ok(statsRes.data.users_total >= 100, 'Users total should be >= 100');
  assert.ok(statsRes.data.municipalities.includes('33'), 'Should state 33 municipalities');
  assert.ok(statsRes.data.schools_covered.includes('520'), 'Should state 520+ schools');
  console.log('   ✓ Stats summary verified: ', statsRes.data);

  // Test 3: Authentication flow
  console.log('3. Testing Authentication (director login)...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'director', password: 'demo123' })
  });
  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.data.token, 'Should receive session token');
  assert.strictEqual(loginRes.data.user.login, 'director');
  const token = loginRes.data.token;
  console.log(`   ✓ Login successful for ${loginRes.data.user.fio}, token received\n`);

  // Test 4: Profile update (Tab 1: Анкета)
  console.log('4. Testing Tab 1: Profile update (Анкета)...');
  const profileRes = await request('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({
      fio: 'Иванова Анна Андреевна',
      experience_total: '19',
      experience_ped: '19',
      experience_mgmt: '7',
      position: 'Директор высшей категории',
      share_experience: 'ВСОКО, бережливое управление, парное наставничество'
    })
  });
  assert.strictEqual(profileRes.status, 200);
  assert.strictEqual(profileRes.data.user.experience_mgmt, '7');
  console.log('   ✓ Profile successfully updated and saved in SQLite\n');

  // Test 5: Diagnostics submission (Tab 2: Пройти диагностику)
  console.log('5. Testing Tab 2: Diagnostic submission (Тест 20 заданий)...');
  const diagRes = await request('/api/user/diagnostics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({
      type: 'test_20',
      score_percent: 95,
      deficit_level: 'low',
      summary_text: 'Итоговый контрольный замер: 19/20 (95%). Низкий уровень дефицитов.',
      details: { competencyScores: [4, 4, 3, 4, 4] }
    })
  });
  assert.strictEqual(diagRes.status, 200);
  const savedDiag = diagRes.data.result || diagRes.data.item;
  assert.strictEqual(savedDiag.score_percent, 95);
  console.log('   ✓ Diagnostic successfully recorded: score 95%\n');

  // Test 6: Dynamic Comparative Progress (Tab 5: Прогресс во времени)
  console.log('6. Testing Tab 5: Dynamic Comparative Progress (Было → Стало)...');
  const historyRes = await request('/api/user/diagnostics', {
    headers: { 'x-auth-token': token }
  });
  assert.strictEqual(historyRes.status, 200);
  const items = historyRes.data.results;
  assert.ok(items.length >= 2, 'Should have at least 2 diagnostic points');
  const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const startScore = sorted[0].score_percent;
  const latestScore = sorted[sorted.length - 1].score_percent;
  const delta = latestScore - startScore;
  console.log(`   ✓ Comparative calculation: Первичный срез = ${startScore}%, Контрольный = ${latestScore}%, Прирост (дельта) = +${delta}%`);
  assert.ok(latestScore >= startScore, 'Latest score should reflect progress');

  // Test 7: IPR Module update (Tab 3: Моя траектория)
  console.log('\n7. Testing Tab 3: IPR item status toggle...');
  const iprListRes = await request('/api/user/ipr', {
    headers: { 'x-auth-token': token }
  });
  assert.strictEqual(iprListRes.status, 200);
  assert.ok(iprListRes.data.items.length > 0, 'Should have IPR items');
  const firstIpr = iprListRes.data.items[0];
  const iprUpdateRes = await request(`/api/user/ipr/${firstIpr.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({ status: 'completed' })
  });
  assert.strictEqual(iprUpdateRes.status, 200);
  console.log(`   ✓ IPR module #${firstIpr.id} status updated to "completed"\n`);

  // Test 8: Dialogue Q&A
  console.log('8. Testing Dialogue Q&A system...');
  const sendQRes = await request('/api/dialogue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({
      question_text: 'Какой порядок прохождения повторной диагностики в Региональной Модели?',
      category: 'Стратегическое управление',
      author_name: 'Иванова А. А.'
    })
  });
  assert.strictEqual(sendQRes.status, 200);
  console.log('   ✓ Question submitted successfully\n');

  // Test 9: Reserve Ideas
  console.log('9. Testing Reserve Ideas initiative and voting...');
  const ideaRes = await request('/api/reserve/ideas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({
      title: 'Региональная стажировочная лига директоров',
      description: 'Сетевая программа обмена практиками между школами Кузбасса.',
      expected_effect: 'Повышение качества управления в 50+ школах региона.',
      category: 'Наставничество'
    })
  });
  assert.strictEqual(ideaRes.status, 200);
  const newIdeaId = ideaRes.data.idea.id;
  const voteRes = await request(`/api/reserve/ideas/${newIdeaId}/vote`, {
    method: 'POST',
    headers: { 'x-auth-token': token }
  });
  assert.strictEqual(voteRes.status, 200);
  console.log('   ✓ Idea created and voted successfully\n');

  console.log('🎉 ALL 9 AUTOMATED BACKEND & WORKFLOW TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
