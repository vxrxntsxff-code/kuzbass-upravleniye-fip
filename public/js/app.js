// Логика клиентской платформы «Управленческие кадры Кузбасса»

const state = {
  currentUser: null,
  activeRoute: 'home',
  saScores: [null, null, null, null, null],
  testAnswers: {},
  diagHistory: [],
  iprItems: [],
  portfolioItems: [],
  dialogueQuestions: [],
  reserveIdeas: []
};

// ── Toast Helper ──
function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = isError ? '#b91c1c' : '#0f172a';
  toast.className = 'on';
  setTimeout(() => {
    toast.className = '';
  }, 3500);
}

// ── API Fetch wrapper ──
async function api(endpoint, options = {}) {
  options.headers = options.headers || {};
  if (state.currentUser && state.currentUser.id) {
    options.headers['x-user-id'] = state.currentUser.id;
  }
  if (!(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(endpoint, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка при запросе к серверу');
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// ── Auth Handling ──
async function initAuth() {
  const savedUser = localStorage.getItem('kuzbass_user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
      // Validate with server
      const res = await api('/api/auth/me');
      state.currentUser = res.user;
      localStorage.setItem('kuzbass_user', JSON.stringify(res.user));
    } catch (_) {
      // Auto login as default director
      await loginAs('director', 'demo123');
    }
  } else {
    // Default demo login for instant preview
    await loginAs('director', 'demo123');
  }
  updateAuthUI();
}

async function loginAs(login, password) {
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
    state.currentUser = data.user;
    localStorage.setItem('kuzbass_user', JSON.stringify(data.user));
    updateAuthUI();
    loadCabinetData();
    showToast(`Вход выполнен: ${data.user.fio}`);
    return data.user;
  } catch (err) {
    showToast(err.message, true);
  }
}

function updateAuthUI() {
  const headerBtn = document.getElementById('navLoginBtn');
  const userBadge = document.getElementById('userHeaderBadge');
  const loginWrap = document.getElementById('loginWrap');
  const cabWrap = document.getElementById('cabWrap');
  const cabWho = document.getElementById('cabWho');
  const demoRoleSelect = document.getElementById('demoRoleSelect');

  if (state.currentUser) {
    if (headerBtn) headerBtn.style.display = 'none';
    if (userBadge) {
      userBadge.style.display = 'flex';
      userBadge.innerHTML = `👤 <span>${state.currentUser.fio.split(' ')[0] || state.currentUser.login}</span> <small style="color:var(--ind);font-size:11px">(${getRoleTitle(state.currentUser.role)})</small>`;
    }
    if (loginWrap) loginWrap.style.display = 'none';
    if (cabWrap) cabWrap.style.display = 'block';
    if (cabWho) {
      cabWho.innerHTML = `<b>${state.currentUser.fio}</b> &nbsp;·&nbsp; ${state.currentUser.position || 'Руководитель'}, ${state.currentUser.workplace || 'ОО Кузбасса'} &nbsp;·&nbsp; <span class="badge b-g">${getRoleTitle(state.currentUser.role)}</span>`;
    }
    if (demoRoleSelect) {
      demoRoleSelect.value = state.currentUser.login;
    }
    fillProfileForm();
  } else {
    if (headerBtn) headerBtn.style.display = 'inline-flex';
    if (userBadge) userBadge.style.display = 'none';
    if (loginWrap) loginWrap.style.display = 'grid';
    if (cabWrap) cabWrap.style.display = 'none';
  }
}

function getRoleTitle(role) {
  switch (role) {
    case 'director': return 'Директор ОО';
    case 'deputy': return 'Заместитель директора';
    case 'reserve': return 'Кадровый резерв';
    case 'expert': return 'Эксперт Лиги';
    case 'admin': return 'Администратор';
    default: return 'Участник проекта';
  }
}

// ── Routing ──
const ROUTES = ['home', 'about', 'comp', 'diag', 'traj', 'dialog', 'future', 'help', 'login'];

function route() {
  const hash = (location.hash || '#/home').replace('#/', '');
  state.activeRoute = ROUTES.includes(hash) ? hash : 'home';

  ROUTES.forEach(r => {
    const el = document.getElementById('p-' + r);
    if (el) el.classList.toggle('on', r === state.activeRoute);
  });

  document.querySelectorAll('nav.main a').forEach(a => {
    const target = a.getAttribute('href');
    a.classList.toggle('on', target === '#/' + state.activeRoute);
  });

  const nav = document.getElementById('nav');
  if (nav) nav.classList.remove('open');

  window.scrollTo(0, 0);

  // Trigger page-specific loads
  if (state.activeRoute === 'dialog') loadDialogueFeed();
  if (state.activeRoute === 'future') loadReserveIdeas();
  if (state.activeRoute === 'login' && state.currentUser) loadCabinetData();
}

window.addEventListener('hashchange', route);

// ── Tabs Generic ──
function initTabs(barId, panePrefix) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const targetId = panePrefix + '-' + btn.dataset.t;
      document.querySelectorAll('.' + panePrefix + '-pane').forEach(pane => {
        pane.classList.toggle('on', pane.id === targetId);
      });
    };
  });
}

// ── Self Assessment ──
function renderSelfAssessment() {
  const box = document.getElementById('saList');
  if (!box) return;
  box.innerHTML = '';

  SA_QUESTIONS.forEach((q, i) => {
    const row = document.createElement('div');
    row.className = 'sa-q';
    const buttons = [0, 1, 2, 3, 4].map(v => 
      `<button data-i="${i}" data-v="${v}" class="${state.saScores[i] === v ? 'sel' : ''}">${v}</button>`
    ).join('');

    row.innerHTML = `
      <div class="qt">
        ${q.icon} <b>${q.title}</b>
        <small>${q.text}</small>
      </div>
      <div class="lik">${buttons}</div>
    `;
    box.appendChild(row);
  });

  box.querySelectorAll('.lik button').forEach(btn => {
    btn.onclick = () => {
      state.saScores[+btn.dataset.i] = +btn.dataset.v;
      renderSelfAssessment();
    };
  });
}

function calculateDeficitLevel(pct) {
  if (pct >= 81) return { level: 'low', name: 'Низкий уровень дефицитов', desc: 'Высокая сформированность. Вы готовы транслировать опыт и выступать наставником.', color: 'linear-gradient(135deg,#15803d,#22c55e)' };
  if (pct >= 70) return { level: 'above_average', name: 'Выше среднего уровня дефицитов', desc: 'Продвинутый уровень. Выполняются задания базового и частично продвинутого уровня.', color: 'linear-gradient(135deg,#0f766e,#14b8a6)' };
  if (pct >= 50) return { level: 'medium', name: 'Средний уровень дефицитов', desc: 'Базовый уровень. Требуется включение в индивидуальную программу развития (ИПР).', color: 'linear-gradient(135deg,#b45309,#f59e0b)' };
  return { level: 'high', name: 'Высокий уровень дефицитов', desc: 'Требуется интенсивное развитие. Первоочередное включение в ИПР и наставническое сопровождение.', color: 'linear-gradient(135deg,#b91c1c,#ef4444)' };
}

async function submitSelfAssessment() {
  if (state.saScores.some(s => s === null)) {
    showToast('Пожалуйста, оцените все 5 компетенций (шкала 0–4)', true);
    return;
  }

  const sum = state.saScores.reduce((a, b) => a + b, 0);
  const pct = Math.round((sum / (state.saScores.length * 4)) * 100);
  const def = calculateDeficitLevel(pct);

  const resBox = document.getElementById('saRes');
  resBox.className = 'sa-res on';
  resBox.style.background = def.color;

  let detailsHtml = `
    <span class="pct">${pct} %</span>
    <p class="lvl">${def.name}</p>
    <p>${def.desc}</p>
    <p style="margin-top:14px;font-weight:700">Аналитический срез по направлениям:</p>
  `;

  SA_QUESTIONS.forEach((q, i) => {
    const score = state.saScores[i];
    const comp = COMPETENCIES[i];
    detailsHtml += `
      <div style="margin-top:8px;background:rgba(255,255,255,.16);border-radius:10px;padding:10px 14px;font-size:13px">
        <b>${q.icon} ${q.title}</b>: ${score}/4 баллов
        <div style="height:6px;background:rgba(255,255,255,.3);border-radius:4px;margin:6px 0">
          <div style="height:6px;width:${score * 25}%;background:#fff;border-radius:4px"></div>
        </div>
        <div>➤ Рекомендация для ИПР: ${comp.module} (${comp.lab})</div>
      </div>
    `;
  });

  resBox.innerHTML = detailsHtml;

  // Persist to backend
  if (state.currentUser) {
    try {
      await api('/api/user/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'self_assessment',
          score_percent: pct,
          deficit_level: def.level,
          summary_text: `${def.name} (${pct}%). Самооценка по 5 направлениям.`,
          details: {
            competencyScores: state.saScores
          }
        })
      });
      showToast('Результаты самооценки сохранены в личном кабинете ✓');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Comprehensive Test ──
function renderTest() {
  const box = document.getElementById('testList');
  if (!box) return;
  let html = '';

  TEST_QUESTIONS.forEach((t, i) => {
    if (i === 0 || TEST_QUESTIONS[i - 1].d !== t.d) {
      html += `
        <h4 style="margin:22px 0 10px;font-size:14px;color:var(--ind);letter-spacing:0.04em;text-transform:uppercase;font-weight:800">
          Направление ${t.d + 1}: ${t.dir}
        </h4>
      `;
    }

    const options = t.o.map((opt, optIndex) => `
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:13.4px;margin:8px 0;cursor:pointer">
        <input type="radio" name="test_q_${i}" value="${optIndex}" style="margin-top:3px" ${state.testAnswers[i] === optIndex ? 'checked' : ''}>
        <span>${opt}</span>
      </label>
    `).join('');

    html += `
      <div class="sa-q" style="display:block">
        <div class="qt"><b>Вопрос ${i + 1}.</b> ${t.q}</div>
        <div style="margin-top:10px">${options}</div>
        <div id="test_exp_${i}" style="display:none;margin-top:12px"></div>
      </div>
    `;
  });

  box.innerHTML = html;

  box.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.onchange = (e) => {
      const qIndex = +e.target.name.replace('test_q_', '');
      state.testAnswers[qIndex] = +e.target.value;
    };
  });
}

async function submitTest() {
  const answeredCount = Object.keys(state.testAnswers).length;
  if (answeredCount < TEST_QUESTIONS.length) {
    showToast(`Ответьте на все 20 заданий (осталось без ответа: ${TEST_QUESTIONS.length - answeredCount})`, true);
    return;
  }

  let correctCount = 0;
  const dirScores = [0, 0, 0, 0, 0];

  TEST_QUESTIONS.forEach((t, i) => {
    const userChoice = state.testAnswers[i];
    const isCorrect = userChoice === t.c;
    if (isCorrect) {
      correctCount++;
      dirScores[t.d]++;
    }

    const expBox = document.getElementById(`test_exp_${i}`);
    if (expBox) {
      expBox.style.display = 'block';
      expBox.style.cssText = `
        display:block;margin-top:10px;border-radius:10px;padding:12px 14px;font-size:12.8px;line-height:1.55;
        background:${isCorrect ? '#ecfdf5' : '#fef2f2'};
        border:1px solid ${isCorrect ? '#a7f3d0' : '#fecaca'};
        color:${isCorrect ? '#14532d' : '#7f1d1d'};
      `;
      expBox.innerHTML = `
        ${isCorrect ? '<b>✔ Верно!</b> ' : `<b>✘ Неверно.</b> Правильный ответ: <b>«${t.o[t.c]}»</b>. `}
        <br><span style="margin-top:4px;display:inline-block"><b>Обоснование:</b> ${t.e}</span>
      `;
    }
  });

  const pct = Math.round((correctCount / TEST_QUESTIONS.length) * 100);
  const def = calculateDeficitLevel(pct);
  const resBox = document.getElementById('testRes');
  resBox.className = 'sa-res on';
  resBox.style.background = def.color;

  let summaryHtml = `
    <span class="pct">${pct} %</span>
    <p class="lvl">${def.name} · ${correctCount} из ${TEST_QUESTIONS.length} верно</p>
    <p>${def.desc}</p>
    <p style="margin-top:14px;font-weight:700">Результаты по 5 направлениям тестирования:</p>
  `;

  COMPETENCIES.forEach((comp, idx) => {
    const sc = dirScores[idx];
    summaryHtml += `
      <div style="margin-top:8px;background:rgba(255,255,255,.16);border-radius:10px;padding:10px 14px;font-size:13px">
        <b>${comp.icon} ${comp.title}</b>: ${sc}/4 заданий выполнено правильно
        <div style="height:6px;background:rgba(255,255,255,.3);border-radius:4px;margin:6px 0">
          <div style="height:6px;width:${sc * 25}%;background:#fff;border-radius:4px"></div>
        </div>
        <div>➤ Программа развития: ${comp.module}</div>
      </div>
    `;
  });

  resBox.innerHTML = summaryHtml;

  // Save to database
  if (state.currentUser) {
    try {
      await api('/api/user/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'test_20',
          score_percent: pct,
          deficit_level: def.level,
          summary_text: `Комплексный тест (20 заданий): ${correctCount}/20 (${pct}%). ${def.name}.`,
          details: {
            competencyScores: dirScores
          }
        })
      });
      showToast('Результаты тестирования сохранены в базу данных ✓');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Cases & Simulations Render ──
function renderCasesAndSimulations() {
  const caseBox = document.getElementById('casesContainer');
  if (caseBox) {
    caseBox.innerHTML = CASES_CATALOG.map(c => `
      <div class="card" style="border-top:4px solid var(--ind)">
        <span class="ico">📁</span>
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span class="badge b-t">${c.badge}</span>
          <span class="badge b-a">${c.level}</span>
        </div>
      </div>
    `).join('');
  }

  const simBox = document.getElementById('simContainer');
  if (simBox) {
    simBox.innerHTML = SIMULATIONS_CATALOG.map(s => `
      <div class="card" style="border-top:4px solid var(--vio)">
        <span class="ico">🎮</span>
        <h3>${s.title}</h3>
        <p><b>Формат:</b> ${s.type} · ${s.dir}</p>
        <p style="margin-top:6px">${s.desc}</p>
        <div style="margin-top:12px">
          <span class="badge b-g">${s.result}</span>
        </div>
      </div>
    `).join('');
  }
}

// ── Normative Library Render ──
function renderNormativeLibrary() {
  const box = document.getElementById('normLib');
  if (!box) return;
  let html = '';

  NORMATIVE_DOCS.forEach(group => {
    html += `<h3 style="margin:24px 0 12px;font-size:16px">${group.group}</h3>`;
    group.items.forEach(doc => {
      html += `
        <div class="doc">
          <span class="di">§</span>
          <div>
            <b>${doc.name}</b>
            <span>${doc.note}</span>
            <div style="margin-top:6px">
              <span class="badge b-g">${doc.status}</span>
              ${doc.url ? `<a href="${doc.url}" target="_blank" rel="noopener" style="margin-left:8px;font-size:12.5px;font-weight:700">открыть документ ↗</a>` : ''}
            </div>
          </div>
        </div>
      `;
    });
  });

  box.innerHTML = html;
}

// ── Dialogue Q&A Feed ──
async function loadDialogueFeed() {
  const box = document.getElementById('qList');
  if (!box) return;

  try {
    const res = await api('/api/dialogue');
    state.dialogueQuestions = res.questions;

    if (!res.questions.length) {
      box.innerHTML = '<p style="color:var(--mut)">Пока нет вопросов. Задайте первый вопрос экспертам!</p>';
      return;
    }

    box.innerHTML = res.questions.map(q => {
      const isAnswered = q.status === 'answered' && q.answer_text;
      const canAnswer = state.currentUser && (state.currentUser.role === 'expert' || state.currentUser.role === 'admin');

      return `
        <div class="q-item">
          <b style="font-size:14.5px;color:var(--ink)">${escapeHtml(q.question_text)}</b>
          <div class="meta">
            <span class="badge b-i">${q.category}</span>
            <span>👤 ${escapeHtml(q.author_name)} (${escapeHtml(q.author_role || 'Руководитель')})</span>
            <span class="badge ${isAnswered ? 'b-g' : 'b-a'}">${isAnswered ? 'Ответ эксперта дан' : 'В работе у эксперта Лиги'}</span>
          </div>

          ${isAnswered ? `
            <div style="margin-top:10px;background:#f8fafc;border-left:4px solid var(--grn);padding:10px 14px;border-radius:0 10px 10px 0;font-size:13.2px">
              <b>Ответ эксперта (${escapeHtml(q.expert_name || 'Лига экспертов ИРО Кузбасса')}):</b>
              <p style="margin-top:4px;color:#334155">${escapeHtml(q.answer_text)}</p>
            </div>
          ` : ''}

          ${canAnswer && !isAnswered ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)">
              <textarea class="inp" id="ans_${q.id}" placeholder="Текст официального ответа эксперта..." style="min-height:60px"></textarea>
              <button class="btn sm teal" style="margin-top:6px" onclick="submitAnswer(${q.id})">Ответить на вопрос</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load dialogue:', err);
  }
}

async function sendDialogueQuestion() {
  const textEl = document.getElementById('qText');
  const catEl = document.getElementById('qCat');
  const whoEl = document.getElementById('qWho');

  const text = textEl.value.trim();
  if (!text) {
    showToast('Введите текст вашего вопроса', true);
    return;
  }

  try {
    await api('/api/dialogue', {
      method: 'POST',
      body: JSON.stringify({
        question_text: text,
        category: catEl.value,
        author_name: whoEl ? whoEl.value.trim() : null
      })
    });
    textEl.value = '';
    if (whoEl) whoEl.value = '';
    showToast('Вопрос успешно передан экспертам Лиги ✓');
    loadDialogueFeed();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function submitAnswer(questionId) {
  const ansEl = document.getElementById(`ans_${questionId}`);
  if (!ansEl || !ansEl.value.trim()) {
    showToast('Введите текст ответа', true);
    return;
  }

  try {
    await api(`/api/dialogue/${questionId}/answer`, {
      method: 'PUT',
      body: JSON.stringify({
        answer_text: ansEl.value.trim(),
        expert_name: state.currentUser.fio
      })
    });
    showToast('Ответ опубликован в ленте ✓');
    loadDialogueFeed();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Reserve Ideas (Кузбасс.Будущее.РФ) ──
async function loadReserveIdeas() {
  const box = document.getElementById('reserveIdeasList');
  if (!box) return;

  try {
    const res = await api('/api/reserve/ideas');
    state.reserveIdeas = res.ideas;

    box.innerHTML = res.ideas.map(idea => `
      <div class="card" style="border-top:4px solid var(--ind);margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <h3 style="margin-bottom:4px">${escapeHtml(idea.title)}</h3>
            <span class="badge b-i">${escapeHtml(idea.category)}</span>
            <span style="font-size:12px;color:var(--mut);margin-left:8px">Автор: ${escapeHtml(idea.author_name)} (${escapeHtml(idea.workplace || 'Кузбасс')})</span>
          </div>
          <button class="btn sm ${idea.has_voted ? 'teal' : 'ghost'}" onclick="voteIdea(${idea.id})">
            👍 ${idea.votes_count} ${idea.has_voted ? 'Поддержано' : 'Поддержать'}
          </button>
        </div>
        <p style="margin-top:10px;font-size:13.8px">${escapeHtml(idea.description)}</p>
        ${idea.expected_effect ? `
          <div style="margin-top:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 12px;font-size:12.8px;color:#166534">
            <b>Ожидаемый региональный эффект:</b> ${escapeHtml(idea.expected_effect)}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load reserve ideas:', err);
  }
}

async function submitReserveIdea() {
  const title = document.getElementById('ideaTitle').value.trim();
  const desc = document.getElementById('ideaDesc').value.trim();
  const effect = document.getElementById('ideaEffect').value.trim();
  const cat = document.getElementById('ideaCat').value;

  if (!title || !desc) {
    showToast('Укажите название и суть проекта', true);
    return;
  }

  try {
    await api('/api/reserve/ideas', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: desc,
        expected_effect: effect,
        category: cat
      })
    });
    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaDesc').value = '';
    document.getElementById('ideaEffect').value = '';
    showToast('Проектная идея добавлена в региональный банк ✓');
    loadReserveIdeas();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function voteIdea(ideaId) {
  if (!state.currentUser) {
    showToast('Войдите в систему для голосования', true);
    return;
  }
  try {
    await api(`/api/reserve/ideas/${ideaId}/vote`, { method: 'POST' });
    loadReserveIdeas();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Cabinet Data & Charts ──
async function loadCabinetData() {
  if (!state.currentUser) return;

  try {
    // 1. Diagnostics History
    const diagRes = await api('/api/user/diagnostics');
    state.diagHistory = diagRes.results;
    renderCabinetDiagnostics(diagRes.results);
    renderProgressChart(diagRes.results);

    // 2. IPR Items
    const iprRes = await api('/api/user/ipr');
    state.iprItems = iprRes.items;
    renderCabinetIpr(iprRes.items);

    // 3. Portfolio Items
    const portRes = await api('/api/user/portfolio');
    state.portfolioItems = portRes.items;
    renderCabinetPortfolio(portRes.items);

  } catch (err) {
    console.error('Failed loading cabinet data:', err);
  }
}

function renderCabinetDiagnostics(history) {
  const table = document.getElementById('cabDiagHistoryTable');
  if (!table) return;

  if (!history.length) {
    table.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--mut)">Вы ещё не проходили диагностику. Перейдите в раздел «Диагностика» для старта.</td></tr>`;
    return;
  }

  table.innerHTML = `
    <tr>
      <th>Дата</th>
      <th>Процедура</th>
      <th>Результат</th>
      <th>Уровень дефицитов</th>
    </tr>
    ${history.map(item => {
      const d = new Date(item.created_at);
      const dateStr = `${('0' + d.getDate()).slice(-2)}.${('0' + (d.getMonth() + 1)).slice(-2)}.${d.getFullYear()}`;
      const typeLabel = item.type === 'self_assessment' ? 'Лист самооценки' : (item.type === 'test_20' ? 'Комплексный тест (20)' : 'Кейс / Симуляция');
      const badgeClass = item.deficit_level === 'low' ? 'b-g' : (item.deficit_level === 'above_average' ? 'b-t' : (item.deficit_level === 'medium' ? 'b-a' : 'b-r'));
      const lvlLabel = item.deficit_level === 'low' ? 'низкий дефицит' : (item.deficit_level === 'above_average' ? 'выше среднего' : (item.deficit_level === 'medium' ? 'средний дефицит' : 'высокий дефицит'));

      return `
        <tr>
          <td>${dateStr}</td>
          <td><b>${typeLabel}</b></td>
          <td><b style="color:var(--ind)">${item.score_percent} %</b></td>
          <td><span class="badge ${badgeClass}">${lvlLabel}</span></td>
        </tr>
      `;
    }).join('')}
  `;
}

function renderProgressChart(history) {
  const chartBox = document.getElementById('cabProgressChart');
  if (!chartBox) return;

  if (!history || history.length < 2) {
    chartBox.innerHTML = `
      <div style="background:#f8fafc;padding:26px;border-radius:12px;text-align:center;color:var(--soft);font-size:13.5px">
        Для построения динамического графика пройдите хотя бы две процедуры диагностики (самооценку и тест).
      </div>
    `;
    return;
  }

  const W = 360;
  const H = 160;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 35;

  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const points = history.map((item, index) => {
    const x = padLeft + (index / (history.length - 1)) * innerW;
    const y = padTop + innerH - (item.score_percent / 100) * innerH;
    const d = new Date(item.created_at);
    const dateStr = `${('0' + (d.getMonth() + 1)).slice(-2)}.${String(d.getFullYear()).slice(-2)}`;
    return { x, y, score: item.score_percent, dateStr };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

  chartBox.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="auto">
      <!-- Grid lines -->
      <g stroke="#e2e8f0" stroke-width="1">
        <line x1="${padLeft}" y1="${padTop}" x2="${W - padRight + 15}" y2="${padTop}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.33}" x2="${W - padRight + 15}" y2="${padTop + innerH * 0.33}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.66}" x2="${W - padRight + 15}" y2="${padTop + innerH * 0.66}"/>
        <line x1="${padLeft}" y1="${padTop + innerH}" x2="${W - padRight + 15}" y2="${padTop + innerH}"/>
      </g>
      <!-- Y labels -->
      <g font-size="9" fill="#94a3b8" text-anchor="end">
        <text x="${padLeft - 8}" y="${padTop + 3}">100%</text>
        <text x="${padLeft - 8}" y="${padTop + innerH * 0.33 + 3}">70%</text>
        <text x="${padLeft - 8}" y="${padTop + innerH * 0.66 + 3}">50%</text>
        <text x="${padLeft - 8}" y="${padTop + innerH + 3}">0%</text>
      </g>
      <!-- Trend Line -->
      <polyline points="${polylineStr}" fill="none" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Points -->
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="5.5" fill="#4f46e5" stroke="#fff" stroke-width="2"/>
        <text x="${p.x}" y="${p.y - 8}" font-size="10.5" font-weight="800" fill="#1e1b4b" text-anchor="middle">${p.score}%</text>
        <text x="${p.x}" y="${H - 10}" font-size="9.5" fill="#64748b" text-anchor="middle">${p.dateStr}</text>
      `).join('')}
    </svg>
    <div style="font-size:13px;color:var(--soft);margin-top:10px;line-height:1.5">
      <b>Динамика:</b> Рост управленческой компетентности от начального уровня к целевому профилю. Данные синхронизированы с региональной базой ФИП РАО.
    </div>
  `;
}

function renderCabinetIpr(items) {
  const box = document.getElementById('cabIprList');
  if (!box) return;

  if (!items.length) {
    box.innerHTML = `
      <div style="background:#f8fafc;padding:22px;border-radius:12px;text-align:center;color:var(--soft)">
        В вашей индивидуальной программе развития пока нет пунктов. Пройдите самооценку или тест, и система сформирует траекторию автоматически!
      </div>
    `;
    return;
  }

  box.innerHTML = items.map(it => `
    <div class="ipr-card ${it.status}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <b style="font-size:15px;color:var(--ink)">${escapeHtml(it.competency)}</b>
          <p style="margin:4px 0;font-size:13.5px;color:var(--soft)"><b>Модуль:</b> ${escapeHtml(it.recommended_module)}</p>
          <p style="margin:2px 0;font-size:13px;color:var(--mut)">Формат: ${escapeHtml(it.action_format)} · Наставник: ${escapeHtml(it.mentor_name || 'Лига экспертов')}</p>
          <p style="margin:4px 0;font-size:13px;color:#1e3a8a"><b>Целевой продукт:</b> ${escapeHtml(it.target_result)}</p>
        </div>
        <div style="text-align:right">
          <select class="inp" style="padding:4px 8px;font-size:12px;border-radius:8px;width:auto" onchange="updateIprStatus(${it.id}, this.value)">
            <option value="planned" ${it.status === 'planned' ? 'selected' : ''}>Запланировано</option>
            <option value="in_progress" ${it.status === 'in_progress' ? 'selected' : ''}>В процессе</option>
            <option value="completed" ${it.status === 'completed' ? 'selected' : ''}>Освоено ✓</option>
          </select>
          <div style="font-size:11.5px;color:var(--mut);margin-top:6px">Срок: ${it.deadline || '2027 г.'}</div>
        </div>
      </div>
    </div>
  `).join('');
}

async function updateIprStatus(id, newStatus) {
  try {
    await api(`/api/user/ipr/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    showToast('Статус модуля ИПР обновлен ✓');
    loadCabinetData();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderCabinetPortfolio(items) {
  const box = document.getElementById('cabPortfolioList');
  if (!box) return;

  if (!items.length) {
    box.innerHTML = `<p style="color:var(--mut);font-size:13.5px">В портфолио пока нет прикреплённых документов. Вы можете загрузить первый документ ниже.</p>`;
    return;
  }

  const categoryNames = {
    achievements: '🏫 Управленческие достижения',
    cases_simulations: '🧩 Кейсы и симуляции',
    results_dynamics: '📈 Динамика результатов',
    prof_development: '🎓 Профессиональное развитие',
    expert_mentoring: '🤝 Экспертная деятельность',
    analytical_reports: '📄 Аналитические справки'
  };

  box.innerHTML = items.map(doc => `
    <div class="doc" style="justify-content:space-between">
      <div style="display:flex;gap:12px">
        <span class="di">📄</span>
        <div>
          <b>${escapeHtml(doc.title)}</b>
          <span style="color:var(--ind);font-weight:600">${categoryNames[doc.category] || doc.category}</span>
          ${doc.description ? `<p style="margin:4px 0 0;font-size:13px;color:var(--soft)">${escapeHtml(doc.description)}</p>` : ''}
          ${doc.expert_comment ? `<p style="margin:4px 0 0;font-size:12.5px;color:#15803d"><b>Экспертное заключение:</b> ${escapeHtml(doc.expert_comment)}</p>` : ''}
          <div style="margin-top:6px">
            <span class="badge ${doc.verification_status === 'approved' ? 'b-g' : (doc.verification_status === 'revision' ? 'b-r' : 'b-a')}">
              ${doc.verification_status === 'approved' ? 'Одобрено аттестационной комиссией' : (doc.verification_status === 'revision' ? 'На доработке' : 'На проверке')}
            </span>
            ${doc.file_path ? `<a href="${doc.file_path}" target="_blank" style="margin-left:10px;font-size:12px;font-weight:700">Скачать файл 📎</a>` : ''}
          </div>
        </div>
      </div>
      <div>
        <button class="btn sm red" onclick="deletePortfolioDoc(${doc.id})">Удалить</button>
      </div>
    </div>
  `).join('');
}

async function addPortfolioDocument(e) {
  e.preventDefault();
  const title = document.getElementById('pfTitle').value.trim();
  const category = document.getElementById('pfCategory').value;
  const desc = document.getElementById('pfDesc').value.trim();
  const fileInput = document.getElementById('pfFile');

  if (!title) {
    showToast('Введите наименование документа', true);
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('description', desc);
  if (fileInput.files.length > 0) {
    formData.append('document', fileInput.files[0]);
  }

  try {
    await api('/api/user/portfolio', {
      method: 'POST',
      body: formData
    });
    document.getElementById('pfTitle').value = '';
    document.getElementById('pfDesc').value = '';
    fileInput.value = '';
    showToast('Документ добавлен в аттестационное портфолио ✓');
    loadCabinetData();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deletePortfolioDoc(id) {
  if (!confirm('Удалить данный документ из портфолио?')) return;
  try {
    await api(`/api/user/portfolio/${id}`, { method: 'DELETE' });
    showToast('Документ удален');
    loadCabinetData();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Profile Questionnaire ──
function fillProfileForm() {
  const u = state.currentUser;
  if (!u) return;

  const fields = ['fio', 'birth_date', 'address', 'phone', 'email', 'citizenship', 'education_level', 'institution', 'workplace', 'position', 'experience_total', 'experience_ped', 'experience_mgmt', 'share_experience'];
  fields.forEach(f => {
    const el = document.getElementById('a_' + f);
    if (el && u[f] !== undefined && u[f] !== null) {
      el.value = u[f];
    }
  });

  const consent = document.getElementById('a_consent_pd');
  if (consent) consent.checked = !!u.consent_pd;
}

async function saveProfileForm(e) {
  e.preventDefault();
  const consent = document.getElementById('a_consent_pd');
  if (consent && !consent.checked) {
    showToast('Необходимо дать согласие на обработку персональных данных (ФЗ № 152-ФЗ)', true);
    return;
  }

  const payload = {
    fio: document.getElementById('a_fio').value.trim(),
    birth_date: document.getElementById('a_birth_date').value,
    address: document.getElementById('a_address').value.trim(),
    phone: document.getElementById('a_phone').value.trim(),
    email: document.getElementById('a_email').value.trim(),
    citizenship: document.getElementById('a_citizenship').value.trim(),
    education_level: document.getElementById('a_education_level').value,
    institution: document.getElementById('a_institution').value.trim(),
    workplace: document.getElementById('a_workplace').value.trim(),
    position: document.getElementById('a_position').value.trim(),
    experience_total: document.getElementById('a_experience_total').value.trim(),
    experience_ped: document.getElementById('a_experience_ped').value.trim(),
    experience_mgmt: document.getElementById('a_experience_mgmt').value.trim(),
    share_experience: document.getElementById('a_share_experience').value.trim(),
    consent_pd: 1
  };

  try {
    const res = await api('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    state.currentUser = res.user;
    localStorage.setItem('kuzbass_user', JSON.stringify(res.user));
    updateAuthUI();
    showToast('Анкета участника успешно сохранена в базе данных ✓');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Escape HTML helper ──
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ── Initialization ──
document.addEventListener('DOMContentLoaded', async () => {
  // Mobile burger toggle
  const burger = document.getElementById('burger');
  if (burger) {
    burger.onclick = () => {
      document.getElementById('nav').classList.toggle('open');
    };
  }

  // Initialize tabs
  initTabs('dtabs', 'dt');
  initTabs('ctabs', 'ct');

  // Render components
  renderSelfAssessment();
  renderTest();
  renderCasesAndSimulations();
  renderNormativeLibrary();

  // Attach event handlers
  const saCalcBtn = document.getElementById('saCalc');
  if (saCalcBtn) saCalcBtn.onclick = submitSelfAssessment;

  const saResetBtn = document.getElementById('saReset');
  if (saResetBtn) {
    saResetBtn.onclick = () => {
      state.saScores = [null, null, null, null, null];
      renderSelfAssessment();
      const r = document.getElementById('saRes');
      if (r) r.className = 'sa-res';
    };
  }

  const testCalcBtn = document.getElementById('testCalc');
  if (testCalcBtn) testCalcBtn.onclick = submitTest;

  const testResetBtn = document.getElementById('testReset');
  if (testResetBtn) {
    testResetBtn.onclick = () => {
      state.testAnswers = {};
      renderTest();
      const r = document.getElementById('testRes');
      if (r) r.className = 'sa-res';
    };
  }

  const qSendBtn = document.getElementById('qSend');
  if (qSendBtn) qSendBtn.onclick = sendDialogueQuestion;

  const ideaSendBtn = document.getElementById('ideaSend');
  if (ideaSendBtn) ideaSendBtn.onclick = submitReserveIdea;

  const profileForm = document.getElementById('profileForm');
  if (profileForm) profileForm.onsubmit = saveProfileForm;

  const pfForm = document.getElementById('pfUploadForm');
  if (pfForm) pfForm.onsubmit = addPortfolioDocument;

  // Login handler
  const liBtn = document.getElementById('liBtn');
  if (liBtn) {
    liBtn.onclick = async () => {
      const login = document.getElementById('liLogin').value.trim() || 'director';
      const pass = document.getElementById('liPass').value.trim() || 'demo123';
      await loginAs(login, pass);
    };
  }

  // Quick demo role switcher
  const demoRoleSelect = document.getElementById('demoRoleSelect');
  if (demoRoleSelect) {
    demoRoleSelect.onchange = async (e) => {
      await loginAs(e.target.value, 'demo123');
    };
  }

  // Initialize Auth & Data
  await initAuth();

  // Route initial page
  route();
});
