// ═══════════════════════════════════════════════════════════════════════════
// Клиентская логика платформы «Региональная Модель» (ГБОУ ДПО «ИРО Кузбасса»)
// Реализовано в стиле грифонклуб.рф
// ═══════════════════════════════════════════════════════════════════════════

const state = {
  currentUser: null,
  sessionToken: null,
  activeRoute: 'home',
  activeCabinetTab: 'ank',
  saScores: [null, null, null, null, null],
  testAnswers: {},
  diagHistory: [],
  iprItems: [],
  portfolioItems: [],
  dialogueQuestions: [],
  reserveIdeas: []
};

// Пароли демо-учетных записей для быстрого переключения ролей
const DEMO_PASSWORDS = {
  director: 'demo123',
  deputy: 'demo123',
  reserve: 'demo123',
  expert: 'expert123'
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
  toast.style.background = isError ? 'var(--danger)' : 'var(--hero-bg)';
  toast.className = 'on';
  setTimeout(() => {
    toast.className = '';
  }, 3500);
}

// ── Fallback Offline Seed Data ──
const OFFLINE_SEED = {
  users: {
    director: {
      id: 1, login: 'director', role: 'director', role_title: 'Директор ОО',
      fio: 'Иванова Анна Андреевна', birth_date: '1983-05-14', address: 'г. Кемерово, пр. Ленина, 82',
      phone: '+7 (905) 912-34-56', email: 'ivanova@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (специалитет)', institution: 'Кемеровский государственный университет (КемГУ)',
      workplace: 'МБОУ «СОШ № 1 г. Кемерово»', position: 'Директор', experience_total: '18',
      experience_ped: '18', experience_mgmt: '6',
      share_experience: 'Управление качеством (ВСОКО), бережливые технологии, парное наставничество', consent_pd: 1
    },
    deputy: {
      id: 2, login: 'deputy', role: 'deputy', role_title: 'Заместитель по УВР',
      fio: 'Смирнов Михаил Владимирович', birth_date: '1987-11-20', address: 'г. Новокузнецк, ул. Кирова, 45',
      phone: '+7 (923) 456-78-90', email: 'smirnov@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (магистратура)', institution: 'Новокузнецкий филиал-институт КемГУ',
      workplace: 'МБОУ «Лицей № 84 г. Новокузнецка»', position: 'Заместитель директора по УВР',
      experience_total: '12', experience_ped: '12', experience_mgmt: '3',
      share_experience: 'Профильное обучение, инженерные классы, сетевые программы', consent_pd: 1
    },
    reserve: {
      id: 3, login: 'reserve', role: 'reserve', role_title: 'Кадровый резерв',
      fio: 'Кузнецова Елена Петровна', birth_date: '1992-03-08', address: 'г. Прокопьевск, ул. Гагарина, 12',
      phone: '+7 (913) 789-01-23', email: 'kuznetsova@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (специалитет)', institution: 'Кузбасский гуманитарно-педагогический институт',
      workplace: 'МБОУ «Гимназия № 72 г. Прокопьевска»', position: 'Учитель математики, участник резерва',
      experience_total: '9', experience_ped: '9', experience_mgmt: '1',
      share_experience: 'Цифровая среда, олимпиадная подготовка, проектная работа', consent_pd: 1
    },
    expert: {
      id: 4, login: 'expert', role: 'expert', role_title: 'Эксперт Региональной Модели',
      fio: 'Вербицкая Ирина Васильевна', birth_date: '1975-09-19', address: 'г. Кемерово, б-р Строителей, 28',
      phone: '+7 (903) 901-23-45', email: 'verbitskaya@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (аспирантура / ученая степень)', institution: 'ИРО Кузбасса (к.п.н., доцент)',
      workplace: 'ГБОУ ДПО «ИРО Кузбасса»', position: 'Заведующая кафедрой управления образованием',
      experience_total: '26', experience_ped: '26', experience_mgmt: '15',
      share_experience: 'Аттестация руководящих кадров, разработка ВСОКО, наставничество', consent_pd: 1
    }
  },
  ipr: [
    {
      id: 1, competency: 'Финансово-хозяйственная деятельность', deficit_level: 'medium',
      recommended_module: 'Микромодуль: Закупки по 44-ФЗ для первого руководителя: аудит рисков (24 ч)',
      action_format: 'Онлайн-тренажер + практикум со специалистом ФАС',
      target_result: 'Аудит плана-графика закупок ОО и чек-лист контракта без нарушений',
      deadline: 'I квартал', status: 'in_progress', mentor_name: 'Вербицкая И. В.'
    },
    {
      id: 2, competency: 'Управление качеством образования', deficit_level: 'medium',
      recommended_module: 'Микромодуль: ВСОКО без рисков необъективности Рособрнадзора (24 ч)',
      action_format: 'Стажировка в школе-лидере ВСОКО',
      target_result: 'Новая редакция Положения о ВСОКО и матрица оценочных процедур',
      deadline: 'II квартал', status: 'planned', mentor_name: 'Совет Региональной Модели'
    },
    {
      id: 3, competency: 'Управление персоналом', deficit_level: 'low',
      recommended_module: 'Микромодуль: Технология «парного управления»: адаптация преемника (24 ч)',
      action_format: 'Командная сессия руководителей',
      target_result: 'План наставничества для 2 резервистов образовательной организации',
      deadline: 'Прошлый период', status: 'completed', mentor_name: 'Вербицкая И. В.'
    }
  ],
  diagnostics: [
    {
      id: 1, type: 'self_assessment', score_percent: 48, deficit_level: 'high',
      summary_text: 'Первичный диагностический срез (48%). Высокий уровень управленческих дефицитов.',
      created_at: '2026-09-12T09:00:00Z'
    },
    {
      id: 2, type: 'test_20', score_percent: 70, deficit_level: 'above_average',
      summary_text: 'Промежуточный замер после микромодуля (70%). Выше среднего уровня.',
      created_at: '2026-10-18T11:30:00Z'
    },
    {
      id: 3, type: 'test_20', score_percent: 88, deficit_level: 'low',
      summary_text: 'Контрольный срез после проработки ошибок (88%). Низкий уровень дефицитов.',
      created_at: '2026-11-16T14:15:00Z'
    }
  ],
  portfolio: [
    {
      id: 1, title: 'Программа развития МБОУ «СОШ № 1 г. Кемерово» на 2025–2028 гг.', category: 'achievements',
      description: 'Утверждена педсоветом, согласована с Учредителем. Заняла II место в региональном конкурсе программ развития.',
      file_path: '', verification_status: 'approved', expert_comment: 'Полностью соответствует ФОП и стратегическим приоритетам Кузбасса.', created_at: '2026-10-01T10:00:00Z'
    },
    {
      id: 2, title: 'Аналитическая справка: динамика показателей ВПР и ГИА за 3 года', category: 'results_dynamics',
      description: 'Рост качества образования по профильным предметам на 14.2%.',
      file_path: '', verification_status: 'approved', expert_comment: 'Объективность оценивания подтверждена независимым мониторингом ИРО Кузбасса.', created_at: '2026-10-15T12:00:00Z'
    },
    {
      id: 3, title: 'Удостоверение о повышении квалификации: «Менеджмент в образовании» (144 ч)', category: 'prof_development',
      description: 'ФГАОУ ДПО «Академия Минпросвещения России», рег. номер 77/4921.',
      file_path: '', verification_status: 'approved', expert_comment: 'Зачтено в счёт обязательного модуля регионального стандарта.', created_at: '2026-11-01T08:00:00Z'
    }
  ],
  dialogue: [
    {
      id: 1, author_name: 'Смирнов М. В.', author_role: 'Заместитель по УВР', author_workplace: 'Лицей № 84 г. Новокузнецка',
      category: 'Управление персоналом',
      question_text: 'Как правильно оформить доплату за наставничество в локальном Положении об оплате труда по методике парного руководства?',
      status: 'answered', answer_text: 'Рекомендуется включить фиксированную стимулирующую надбавку в Положение об оплате труда ОО на основании Распоряжения Минпросвещения РФ № Р-145 и методических рекомендаций ИРО Кузбасса (раздел 4). Приказ издаётся ежегодно по результатам соглашения сторон.',
      expert_name: 'Вербицкая И. В. (эксперт ИРО Кузбасса)', created_at: '2026-11-10T10:00:00Z'
    },
    {
      id: 2, author_name: 'Кузнецова Е. П.', author_role: 'Кадровый резерв', author_workplace: 'Гимназия № 72 г. Прокопьевска',
      category: 'Стратегическое управление',
      question_text: 'Какие подтверждающие документы в портфолио имеют наивысший вес при аттестации кандидата на должность руководителя ОО?',
      status: 'answered', answer_text: 'Наибольший вес имеют: 1) Подтверждённая динамика образовательных результатов ОО/класса за 3 года (ВСОКО/ГИА); 2) Защищённый управленческий проект развития ОО; 3) Результаты независимой стандартизованной диагностики дефицитов ИРО Кузбасса.',
      expert_name: 'Аттестационная комиссия Региональной Модели', created_at: '2026-11-14T15:20:00Z'
    }
  ],
  ideas: [
    {
      id: 1, title: '«Управленческий инкубатор»: стажировки резервистов в школах-лидерах',
      description: 'Программа 14-дневного погружения кандидата в должность исполняющего обязанности директора опорной ОО под кураторством наставника с разбором реальных управленческих кейсов.',
      expected_effect: 'Сокращение адаптационного периода вновь назначенных директоров с 1.5 лет до 3 месяцев.',
      category: 'Наставничество', author_name: 'Иванова А. А.', author_role: 'Директор ОО', workplace: 'МБОУ «СОШ № 1 г. Кемерово»',
      votes_count: 42, has_voted: 1
    },
    {
      id: 2, title: 'Региональный депозитарий школьных программ развития',
      description: 'Единая защищённая цифровая база успешно прошедших экспертизу программ развития школ Кузбасса с фильтрацией по типологии ОО (малокомплектные, городские, сельские, инженерные).',
      expected_effect: 'Экономия до 120 часов методической работы каждой управленческой команды региона.',
      category: 'Цифровизация', author_name: 'Смирнов М. В.', author_role: 'Заместитель по УВР', workplace: 'Лицей № 84 г. Новокузнецка',
      votes_count: 28, has_voted: 0
    }
  ]
};

function getLocalState(key, fallback) {
  try {
    const s = localStorage.getItem('kuz_' + key);
    if (s) return JSON.parse(s);
  } catch (_) {}
  return fallback;
}

function setLocalState(key, val) {
  try {
    localStorage.setItem('kuz_' + key, JSON.stringify(val));
  } catch (_) {}
}

async function mockApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let body = {};
  if (typeof options.body === 'string') {
    try { body = JSON.parse(options.body || '{}'); } catch (_) {}
  }

  if (endpoint === '/api/stats/summary') {
    return {
      total_users: 1420,
      total_diagnostics: 890,
      growth_rate: '+40%',
      municipalities: '33 муниципалитета',
      schools_covered: '520+ ОО'
    };
  }
  if (endpoint === '/api/auth/me') {
    return { user: state.currentUser || OFFLINE_SEED.users.director };
  }
  if (endpoint === '/api/auth/login') {
    const login = body.login || 'director';
    const u = OFFLINE_SEED.users[login] || Object.values(OFFLINE_SEED.users).find(x => x.login === login) || OFFLINE_SEED.users.director;
    return { success: true, user: u, token: 'offline-demo' };
  }
  if (endpoint === '/api/auth/logout') {
    return { success: true };
  }
  if (endpoint === '/api/user/profile') {
    state.currentUser = { ...state.currentUser, ...body };
    setLocalState('cur_user', state.currentUser);
    return { success: true, user: state.currentUser };
  }
  if (endpoint === '/api/user/diagnostics') {
    let diag = getLocalState('diagnostics', OFFLINE_SEED.diagnostics);
    if (method === 'POST') {
      const newItem = {
        id: Date.now(),
        type: body.type,
        score_percent: body.score_percent,
        deficit_level: body.deficit_level,
        summary_text: body.summary_text,
        details: body.details,
        created_at: new Date().toISOString()
      };
      diag = [newItem, ...diag];
      setLocalState('diagnostics', diag);
      return { success: true, item: newItem };
    }
    return { results: diag };
  }
  if (endpoint === '/api/user/ipr') {
    let ipr = getLocalState('ipr', OFFLINE_SEED.ipr);
    return { items: ipr };
  }
  if (endpoint.startsWith('/api/user/ipr/')) {
    const id = +endpoint.split('/').pop();
    let ipr = getLocalState('ipr', OFFLINE_SEED.ipr);
    ipr = ipr.map(it => it.id === id ? { ...it, status: body.status } : it);
    setLocalState('ipr', ipr);
    return { success: true };
  }
  if (endpoint === '/api/user/portfolio') {
    let pf = getLocalState('portfolio', OFFLINE_SEED.portfolio);
    if (method === 'POST') {
      const title = options.body instanceof FormData ? options.body.get('title') : body.title;
      const category = options.body instanceof FormData ? options.body.get('category') : body.category;
      const desc = options.body instanceof FormData ? options.body.get('description') : body.description;
      const newItem = {
        id: Date.now(),
        title: title || 'Новый документ',
        category: category || 'achievements',
        description: desc || '',
        file_path: '',
        verification_status: 'pending',
        expert_comment: 'Передано на проверку экспертной комиссии.',
        created_at: new Date().toISOString()
      };
      pf = [newItem, ...pf];
      setLocalState('portfolio', pf);
      return { success: true, item: newItem };
    }
    return { items: pf };
  }
  if (endpoint.startsWith('/api/user/portfolio/') && method === 'DELETE') {
    const id = +endpoint.split('/').pop();
    let pf = getLocalState('portfolio', OFFLINE_SEED.portfolio);
    pf = pf.filter(it => it.id !== id);
    setLocalState('portfolio', pf);
    return { success: true };
  }
  if (endpoint === '/api/dialogue') {
    let dlg = getLocalState('dialogue', OFFLINE_SEED.dialogue);
    if (method === 'POST') {
      const newQ = {
        id: Date.now(),
        author_name: body.author_name || (state.currentUser ? state.currentUser.fio : 'Участник'),
        author_role: state.currentUser ? state.currentUser.role_title : 'Педагог',
        author_workplace: state.currentUser ? state.currentUser.workplace : 'Кузбасс',
        category: body.category || 'Стратегическое управление',
        question_text: body.question_text,
        status: 'new',
        answer_text: null,
        expert_name: null,
        created_at: new Date().toISOString()
      };
      dlg = [newQ, ...dlg];
      setLocalState('dialogue', dlg);
      return { success: true, question: newQ };
    }
    return { questions: dlg };
  }
  if (endpoint.includes('/answer') && method === 'PUT') {
    const id = +endpoint.split('/')[3];
    let dlg = getLocalState('dialogue', OFFLINE_SEED.dialogue);
    dlg = dlg.map(q => q.id === id ? {
      ...q,
      status: 'answered',
      answer_text: body.answer_text,
      expert_name: state.currentUser ? `${state.currentUser.fio} (эксперт)` : 'Эксперт Региональной Модели'
    } : q);
    setLocalState('dialogue', dlg);
    return { success: true };
  }
  if (endpoint === '/api/reserve/ideas') {
    let ideas = getLocalState('ideas', OFFLINE_SEED.ideas);
    if (method === 'POST') {
      const newIdea = {
        id: Date.now(),
        title: body.title,
        description: body.description,
        expected_effect: body.expected_effect,
        category: body.category || 'Инициатива',
        author_name: state.currentUser ? state.currentUser.fio : 'Резервист',
        author_role: state.currentUser ? state.currentUser.role_title : 'Кадровый резерв',
        workplace: state.currentUser ? state.currentUser.workplace : 'Кузбасс',
        votes_count: 1,
        has_voted: 1
      };
      ideas = [newIdea, ...ideas];
      setLocalState('ideas', ideas);
      return { success: true, idea: newIdea };
    }
    return { ideas };
  }
  if (endpoint.endsWith('/vote') && method === 'POST') {
    const parts = endpoint.split('/');
    const id = +parts[parts.length - 2];
    let ideas = getLocalState('ideas', OFFLINE_SEED.ideas);
    ideas = ideas.map(idea => {
      if (idea.id === id) {
        const hasVoted = !idea.has_voted;
        return {
          ...idea,
          has_voted: hasVoted ? 1 : 0,
          votes_count: idea.votes_count + (hasVoted ? 1 : -1)
        };
      }
      return idea;
    });
    setLocalState('ideas', ideas);
    return { success: true };
  }

  return { success: true };
}

// ── API Fetch Wrapper ──
async function api(endpoint, options = {}) {
  if (window.location.protocol === 'file:') {
    return mockApi(endpoint, options);
  }

  options.headers = options.headers || {};
  if (state.sessionToken) {
    options.headers['x-auth-token'] = state.sessionToken;
  }
  if (!(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(endpoint, options);
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401 && endpoint !== '/api/auth/login') {
        clearSession();
        showToast('Сессия обновлена. Перезайдите в кабинет.', true);
      }
      throw new Error(data.error || 'Ошибка при запросе к серверу');
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError') {
      console.warn('Backend API unreachable, using local fallback:', err.message);
      return mockApi(endpoint, options);
    }
    throw err;
  }
}

// ── Auth Handling ──
function clearSession() {
  state.sessionToken = null;
  state.currentUser = null;
  localStorage.removeItem('kuzbass_token');
  localStorage.removeItem('kuzbass_user');
  updateAuthUI();
}

async function initAuth() {
  const savedToken = localStorage.getItem('kuzbass_token');
  const savedUser = localStorage.getItem('kuzbass_user');
  if (savedToken && savedUser) {
    try {
      state.sessionToken = savedToken;
      state.currentUser = JSON.parse(savedUser);
      const res = await api('/api/auth/me');
      state.currentUser = res.user;
      localStorage.setItem('kuzbass_user', JSON.stringify(res.user));
    } catch (_) {
      await loginAs('director', 'demo123', true);
    }
  } else {
    await loginAs('director', 'demo123', true);
  }
  updateAuthUI();
}

async function loginAs(login, password, silent = false) {
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
    state.currentUser = data.user;
    state.sessionToken = data.token || null;
    localStorage.setItem('kuzbass_user', JSON.stringify(data.user));
    if (data.token) localStorage.setItem('kuzbass_token', data.token);
    updateAuthUI();
    loadCabinetData();
    if (!silent) showToast(`Вход выполнен: ${data.user.fio}`);
    return data.user;
  } catch (err) {
    if (!silent) showToast(err.message, true);
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  clearSession();
  showToast('Вы вышли из личного кабинета');
  location.hash = '#/home';
}

function updateAuthUI() {
  const headerBtn = document.getElementById('navLoginBtn');
  const userBadge = document.getElementById('userHeaderBadge');
  const cabWho = document.getElementById('cabWho');
  const cabDetailsLine = document.getElementById('cabDetailsLine');
  const cabRoleBadge = document.getElementById('cabRoleBadge');
  const demoRoleSelect = document.getElementById('demoRoleSelect');

  if (state.currentUser) {
    if (headerBtn) headerBtn.style.display = 'none';
    if (userBadge) {
      userBadge.style.display = 'inline-flex';
      const shortName = state.currentUser.fio.split(' ')[0] || state.currentUser.login;
      userBadge.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>${escapeHtml(shortName)}</span>
      `;
    }
    if (cabWho) cabWho.textContent = state.currentUser.fio;
    if (cabDetailsLine) {
      cabDetailsLine.textContent = `${state.currentUser.position || 'Руководитель'}, ${state.currentUser.workplace || 'Кузбасс'}`;
    }
    if (cabRoleBadge) cabRoleBadge.textContent = getRoleTitle(state.currentUser.role);
    if (demoRoleSelect) demoRoleSelect.value = state.currentUser.login;

    fillProfileForm();
  } else {
    if (headerBtn) headerBtn.style.display = 'inline-flex';
    if (userBadge) userBadge.style.display = 'none';
  }
}

function getRoleTitle(role) {
  switch (role) {
    case 'director': return 'Директор ОО';
    case 'deputy': return 'Заместитель директора';
    case 'reserve': return 'Кадровый резерв';
    case 'expert': return 'Эксперт Региональной Модели';
    case 'admin': return 'Администратор';
    default: return 'Руководитель';
  }
}

// ── Routing ──
const ROUTES = ['home', 'about', 'comp', 'diag', 'traj', 'dialog', 'future', 'help', 'cabinet'];

function route() {
  let hash = (location.hash || '#/home').replace('#/', '');
  if (hash === 'login') hash = 'cabinet';
  if (hash === 'directions') hash = 'comp';
  if (hash === 'reserve') hash = 'future';
  if (!ROUTES.includes(hash)) hash = 'home';
  state.activeRoute = hash;

  // Показываем активную страницу и скрываем остальные
  ROUTES.forEach(r => {
    const el = document.getElementById('p-' + r);
    if (el) {
      const isTarget = r === state.activeRoute;
      el.classList.toggle('on', isTarget);
      el.style.display = isTarget ? 'block' : 'none';
    }
  });

  // Обновляем подсветку ссылок в шапке
  document.querySelectorAll('nav.main a').forEach(a => {
    const target = a.getAttribute('href');
    a.classList.toggle('on', target === '#/' + state.activeRoute);
  });

  const nav = document.getElementById('nav');
  if (nav) nav.classList.remove('open');

  window.scrollTo(0, 0);

  if (state.activeRoute === 'comp') renderCompetencies();
  if (state.activeRoute === 'dialog') loadDialogueFeed();
  if (state.activeRoute === 'future') loadReserveIdeas();
  if (state.activeRoute === 'cabinet') loadCabinetData();
  if (state.activeRoute === 'help') {
    renderCasesAndSimulations();
    renderNormativeLibrary();
  }
}

window.addEventListener('hashchange', route);

// ── Navigation Helper: Пройти диагностику ──
function goToCabinetDiag() {
  location.hash = '#/cabinet';
  switchCabinetTab('diag');
  setTimeout(() => {
    const diagSection = document.getElementById('ct-diag');
    if (diagSection) {
      diagSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// ── Cabinet 5 Tabs Switching ──
function switchCabinetTab(tabKey) {
  state.activeCabinetTab = tabKey;
  const tabs = document.querySelectorAll('#cabTabs button');
  tabs.forEach(btn => {
    btn.classList.toggle('on', btn.dataset.ctab === tabKey);
  });

  document.querySelectorAll('.cab-pane').forEach(pane => {
    pane.classList.toggle('on', pane.id === 'ct-' + tabKey);
  });

  if (tabKey === 'progress') {
    renderProgressTab();
  }
}

// ── Diagnostic Sub-Tabs (Самооценка / Тест 20) ──
function switchDiagSubTab(tab) {
  const selfBtn = document.getElementById('diagSubTabSelfBtn');
  const testBtn = document.getElementById('diagSubTabTestBtn');
  const selfPane = document.getElementById('diagSubSelf');
  const testPane = document.getElementById('diagSubTest');

  if (tab === 'self') {
    if (selfBtn) selfBtn.classList.add('on');
    if (testBtn) testBtn.classList.remove('on');
    if (selfPane) selfPane.style.display = 'block';
    if (testPane) testPane.style.display = 'none';
  } else {
    if (selfBtn) selfBtn.classList.remove('on');
    if (testBtn) testBtn.classList.add('on');
    if (selfPane) selfPane.style.display = 'none';
    if (testPane) testPane.style.display = 'block';
  }
}

// ── Help Sub-Tabs (Кейсы / Документы) ──
function switchHelpTab(tab) {
  const docsPane = document.getElementById('helpTabDocs');
  const casesPane = document.getElementById('helpTabCases');
  const buttons = document.querySelectorAll('.help-tab-btn');

  buttons.forEach(b => {
    b.classList.toggle('on', b.textContent.toLowerCase().includes(tab === 'docs' ? 'документ' : 'кейс'));
  });

  if (tab === 'docs') {
    if (docsPane) docsPane.style.display = 'block';
    if (casesPane) casesPane.style.display = 'none';
  } else {
    if (docsPane) docsPane.style.display = 'none';
    if (casesPane) casesPane.style.display = 'block';
  }
}

// ── Render 6 Stages Infographic on Home ──
function renderRegionalModelStages() {
  const box = document.getElementById('stagesContainer');
  if (!box || typeof REGIONAL_MODEL_STAGES === 'undefined') return;

  box.innerHTML = REGIONAL_MODEL_STAGES.map(st => `
    <div class="stage-card">
      <div class="stage-img-wrap">
        <img src="${escapeHtml(st.img || st.image)}" alt="${escapeHtml(st.title)}" loading="lazy">
        <span class="stage-num">${st.step || st.num}</span>
      </div>
      <div class="stage-body">
        <span class="stage-tag">${escapeHtml(st.badge || st.tag)}</span>
        <h3 class="stage-title">${escapeHtml(st.title)}</h3>
        <p class="stage-desc">${escapeHtml(st.desc)}</p>
      </div>
    </div>
  `).join('');
}

// ── Render Top Micromodules on Home ──
function renderHomeMicromodules() {
  const box = document.getElementById('homeMicromodulesList');
  if (!box || typeof DIRECTIONS === 'undefined') return;

  const allMods = [];
  DIRECTIONS.forEach(d => {
    (d.micromodules || []).forEach(m => {
      allMods.push({ ...m, dirTitle: d.title, dirCode: d.code });
    });
  });

  box.innerHTML = allMods.slice(0, 6).map(m => `
    <div class="micromodule-item">
      <div style="font-size:11.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--accent-sand-deep)">
        ${escapeHtml(m.dirTitle)}
      </div>
      <h4>${escapeHtml(m.title)}</h4>
      <div class="meta">
        <span>⏱ ${m.hours} ак. ч.</span>
        <span>•</span>
        <span>${escapeHtml(m.format)}</span>
      </div>
    </div>
  `).join('');
}

// ── Render Competencies Page (#/comp) ──
function renderCompetencies() {
  const box = document.getElementById('compContainer') || document.getElementById('directionsList');
  if (!box || typeof DIRECTIONS === 'undefined') return;

  box.innerHTML = DIRECTIONS.map(d => `
    <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:44px;height:44px;border-radius:10px;background:var(--hero-bg);color:var(--accent-sand);display:flex;align-items:center;justify-content:center;padding:9px;flex-shrink:0">
            ${d.icon}
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent-sand-deep);letter-spacing:0.06em;text-transform:uppercase">
              Компетенция ${d.id + 1} · ${d.code}
            </div>
            <h3 style="margin:2px 0 0;font-size:17px">${escapeHtml(d.title)}</h3>
          </div>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:10px;line-height:1.4">
          ${escapeHtml(d.subtitle)}
        </div>

        <p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:var(--ink-secondary)">
          ${escapeHtml(d.desc)}
        </p>

        <div style="background:var(--surface-subtle);border-left:3px solid var(--hero-bg);padding:10px 14px;border-radius:0 6px 6px 0;font-size:12.5px;font-style:italic;color:var(--ink-secondary);margin-bottom:16px;line-height:1.5">
          ${escapeHtml(d.selfQuote)}
        </div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:auto">
        <button class="btn sm sand full" onclick="goToCabinetDiag()">Пройти диагностику в личном кабинете →</button>
      </div>
    </div>
  `).join('');
}

const renderDirections = renderCompetencies;

// ── Self Assessment (Tab 2 inside Cabinet) ──
function renderSelfAssessment() {
  const box = document.getElementById('selfAssessmentRows');
  if (!box || typeof DIRECTIONS === 'undefined') return;
  box.innerHTML = '';

  DIRECTIONS.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = 'sa-row';
    const buttons = [0, 1, 2, 3, 4].map(v => 
      `<button data-i="${i}" data-v="${v}" class="${state.saScores[i] === v ? 'sel' : ''}">${v}</button>`
    ).join('');

    row.innerHTML = `
      <div class="sa-info">
        <span class="sa-title">${i + 1}. ${d.title}</span>
        <span class="sa-desc">${d.selfQuote || d.desc}</span>
      </div>
      <div class="likert-group">${buttons}</div>
    `;
    box.appendChild(row);
  });

  box.querySelectorAll('.likert-group button').forEach(btn => {
    btn.onclick = () => {
      state.saScores[+btn.dataset.i] = +btn.dataset.v;
      renderSelfAssessment();
    };
  });
}

function calculateDeficitLevel(pct) {
  if (pct >= 81) return { level: 'low', name: 'Низкий уровень дефицитов', desc: 'Высокая сформированность. Вы готовы выступать в качестве руководителя-наставника региона.', color: 'var(--success)' };
  if (pct >= 70) return { level: 'above_average', name: 'Выше среднего уровня', desc: 'Продвинутый уровень. Компетенции достаточны для решения комплексных задач.', color: '#0d9488' };
  if (pct >= 50) return { level: 'medium', name: 'Средний уровень дефицитов', desc: 'Базовый уровень. Требуется включение в индивидуальную программу развития (ИПР).', color: 'var(--warning)' };
  return { level: 'high', name: 'Высокий уровень дефицитов', desc: 'Требуется интенсивное развитие. Первоочередное включение в микромодули и наставническое сопровождение.', color: 'var(--danger)' };
}

async function submitSelfAssessment() {
  if (state.saScores.some(s => s === null)) {
    showToast('Пожалуйста, оцените все 5 направлений по шкале от 0 до 4', true);
    return;
  }

  const sum = state.saScores.reduce((a, b) => a + b, 0);
  const pct = Math.round((sum / (state.saScores.length * 4)) * 100);
  const def = calculateDeficitLevel(pct);

  const resBox = document.getElementById('saRes');
  if (resBox) {
    resBox.className = 'diag-result-card on';
    resBox.style.borderLeft = `4px solid ${def.color}`;

    let detailsHtml = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.04em">Итоговый результат самооценки</div>
          <div class="score-num" style="color:${def.color}">${pct}%</div>
          <h3 style="margin:4px 0 2px;font-size:16px">${def.name}</h3>
          <p style="margin:0;font-size:13.5px;color:var(--ink-secondary)">${def.desc}</p>
        </div>
        <div>
          <button class="btn sm sand" onclick="switchCabinetTab('ipr')">Смотреть обновлённую ИПР →</button>
        </div>
      </div>
      
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
        <b style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted)">Срез по 5 направлениям:</b>
    `;

    DIRECTIONS.forEach((d, i) => {
      const score = state.saScores[i];
      const mod = (d.micromodules && d.micromodules[0]) ? d.micromodules[0].title : d.module;
      detailsHtml += `
        <div style="margin-top:10px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px">
          <div style="display:flex;justify-content:space-between;font-weight:700">
            <span>${d.title}</span>
            <span style="font-variant-numeric:tabular-nums">${score} / 4 баллов</span>
          </div>
          <div style="height:5px;background:var(--border);border-radius:3px;margin:8px 0">
            <div style="height:5px;width:${score * 25}%;background:var(--hero-bg);border-radius:3px"></div>
          </div>
          <div style="font-size:12px;color:var(--ink-muted)">Рекомендация для ИПР: <b>${mod}</b></div>
        </div>
      `;
    });

    detailsHtml += `</div>`;
    resBox.innerHTML = detailsHtml;
    resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (state.currentUser) {
    try {
      await api('/api/user/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'self_assessment',
          score_percent: pct,
          deficit_level: def.level,
          summary_text: `Самооценка по 5 направлениям: ${pct}%. ${def.name}.`,
          details: { competencyScores: state.saScores }
        })
      });
      showToast('Результаты сохранены в вашем личном кабинете ✓');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }
}

// ── 20-Question Comprehensive Test ──
function shuffleTestOptions() {
  if (typeof TEST_QUESTIONS === 'undefined') return;
  TEST_QUESTIONS.forEach((t, qi) => {
    let seed = (qi * 2654435761 + 1) % 2147483647;
    if (seed <= 0) seed = 1;
    const rnd = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const idx = t.o.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    t.oShown = idx.map(i => t.o[i]);
    t.cShown = idx.indexOf(t.c);
  });
}

function renderTest() {
  const box = document.getElementById('testList');
  if (!box || typeof TEST_QUESTIONS === 'undefined') return;
  let html = '';

  TEST_QUESTIONS.forEach((t, i) => {
    if (i === 0 || TEST_QUESTIONS[i - 1].d !== t.d) {
      html += `
        <h4 style="margin:24px 0 10px;font-size:13px;color:var(--hero-bg);letter-spacing:0.06em;text-transform:uppercase;font-weight:800">
          Направление ${t.d + 1}: ${t.dir}
        </h4>
      `;
    }

    const options = (t.oShown || t.o).map((opt, optIndex) => `
      <label class="test-option">
        <input type="radio" name="test_q_${i}" value="${optIndex}" ${state.testAnswers[i] === optIndex ? 'checked' : ''}>
        <span>${escapeHtml(opt)}</span>
      </label>
    `).join('');

    html += `
      <div class="test-q-card">
        <div class="q-title"><b>${i + 1}.</b> ${escapeHtml(t.q)}</div>
        <div>${options}</div>
        <div id="test_exp_${i}" class="test-explanation" style="display:none"></div>
      </div>
    `;
  });

  box.innerHTML = html;

  box.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.onchange = (e) => {
      const qIndex = +e.target.name.replace('test_q_', '');
      state.testAnswers[qIndex] = +e.target.value;
      updateTestProgress();
    };
  });
  updateTestProgress();
}

function updateTestProgress() {
  const answeredCount = Object.keys(state.testAnswers).length;
  const countEl = document.getElementById('testAnsweredCount');
  const fillEl = document.getElementById('testProgressFill');
  const total = (typeof TEST_QUESTIONS !== 'undefined') ? TEST_QUESTIONS.length : 20;
  if (countEl) countEl.textContent = answeredCount;
  if (fillEl) fillEl.style.width = `${Math.min(100, Math.round((answeredCount / total) * 100))}%`;
}

async function submitTest() {
  const total = (typeof TEST_QUESTIONS !== 'undefined') ? TEST_QUESTIONS.length : 20;
  const answeredCount = Object.keys(state.testAnswers).length;
  if (answeredCount < total) {
    showToast(`Ответьте на все ${total} заданий (осталось: ${total - answeredCount})`, true);
    return;
  }

  let correctCount = 0;
  const dirScores = [0, 0, 0, 0, 0];

  TEST_QUESTIONS.forEach((t, i) => {
    const userChoice = state.testAnswers[i];
    const isCorrect = userChoice === t.cShown;
    if (isCorrect) {
      correctCount++;
      dirScores[t.d]++;
    }

    const expBox = document.getElementById(`test_exp_${i}`);
    if (expBox) {
      expBox.style.display = 'block';
      expBox.style.background = isCorrect ? 'var(--success-tint)' : 'var(--danger-tint)';
      expBox.style.border = `1px solid ${isCorrect ? '#a7f3d0' : '#fecaca'}`;
      expBox.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
      expBox.innerHTML = `
        <b>${isCorrect ? '✔ Верный ответ.' : `✘ Неверно. Правильно: «${escapeHtml((t.oShown || t.o)[t.cShown])}».`}</b>
        <div style="margin-top:6px;color:var(--ink-secondary);font-size:12.5px">${escapeHtml(t.e)}</div>
      `;
    }
  });

  const pct = Math.round((correctCount / total) * 100);
  const def = calculateDeficitLevel(pct);
  const resBox = document.getElementById('testRes');
  if (resBox) {
    resBox.className = 'diag-result-card on';
    resBox.style.borderLeft = `4px solid ${def.color}`;

    let summaryHtml = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.04em">Результат комплексной диагностики</div>
          <div class="score-num" style="color:${def.color}">${pct}%</div>
          <h3 style="margin:4px 0 2px;font-size:16px">${def.name} · ${correctCount} из ${total} верно</h3>
          <p style="margin:0;font-size:13.5px;color:var(--ink-secondary)">${def.desc}</p>
        </div>
        <div>
          <button class="btn sm sand" onclick="switchCabinetTab('progress')">Смотреть график прогресса →</button>
        </div>
      </div>
      
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
        <b style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted)">Результаты по 5 направлениям:</b>
    `;

    DIRECTIONS.forEach((d, idx) => {
      const sc = dirScores[idx];
      summaryHtml += `
        <div style="margin-top:10px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px">
          <div style="display:flex;justify-content:space-between;font-weight:700">
            <span>${d.title}</span>
            <span style="font-variant-numeric:tabular-nums">${sc} / 4 заданий верно</span>
          </div>
          <div style="height:5px;background:var(--border);border-radius:3px;margin:8px 0">
            <div style="height:5px;width:${sc * 25}%;background:var(--hero-bg);border-radius:3px"></div>
          </div>
        </div>
      `;
    });

    summaryHtml += `</div>`;
    resBox.innerHTML = summaryHtml;
    resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (state.currentUser) {
    try {
      await api('/api/user/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'test_20',
          score_percent: pct,
          deficit_level: def.level,
          summary_text: `Комплексная диагностика (20 заданий): ${correctCount}/${total} (${pct}%). ${def.name}.`,
          details: { competencyScores: dirScores }
        })
      });
      showToast('Результаты диагностики зафиксированы в базе данных ✓');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }
}

// ── Cases & Normative Library (#/help) ──
let currentCaseFilter = 'all';
let currentCaseSearch = '';

function renderCasesAndSimulations() {
  const caseBox = document.getElementById('casesContainer');
  if (!caseBox || typeof CASES_CATALOG === 'undefined') return;

  let filtered = CASES_CATALOG;
  if (currentCaseFilter && currentCaseFilter !== 'all') {
    const q = currentCaseFilter.toLowerCase();
    filtered = filtered.filter(c =>
      (c.dir && c.dir.toLowerCase().includes(q)) ||
      (c.badge && c.badge.toLowerCase().includes(q)) ||
      (c.title && c.title.toLowerCase().includes(q))
    );
  }
  if (currentCaseSearch) {
    const sq = currentCaseSearch.toLowerCase().trim();
    filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(sq) ||
      c.desc.toLowerCase().includes(sq) ||
      (c.dir && c.dir.toLowerCase().includes(sq)) ||
      (c.badge && c.badge.toLowerCase().includes(sq))
    );
  }

  if (!filtered.length) {
    caseBox.innerHTML = `
      <div style="grid-column:1/-1;background:var(--surface-subtle);padding:24px;border-radius:var(--radius-sm);text-align:center;color:var(--ink-muted);font-size:13.5px">
        По заданным критериям кейсов не найдено.
      </div>
    `;
    return;
  }

  caseBox.innerHTML = filtered.map(c => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="badge b-i">${escapeHtml(c.badge)}</span>
        <span class="badge b-a">${escapeHtml(c.level)}</span>
      </div>
      <h3>${escapeHtml(c.title)}</h3>
      <p style="font-size:13px">${escapeHtml(c.desc)}</p>
    </div>
  `).join('');
}

function renderNormativeLibrary() {
  const box = document.getElementById('normLibContainer');
  if (!box || typeof NORMATIVE_DOCS === 'undefined') return;

  box.innerHTML = NORMATIVE_DOCS.map(group => `
    <h3 style="margin:24px 0 12px;font-size:16px;color:var(--ink)">${escapeHtml(group.group)}</h3>
    ${group.items.map(doc => `
      <div class="doc-row">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div class="doc-content">
          <span class="doc-title">${escapeHtml(doc.name)}</span>
          <span class="doc-desc">${escapeHtml(doc.note)}</span>
          <div style="margin-top:6px">
            <span class="badge b-g">${escapeHtml(doc.status)}</span>
            ${doc.url ? `<a href="${doc.url}" target="_blank" rel="noopener" style="margin-left:10px;font-size:12px;font-weight:600;color:var(--hero-bg)">Открыть документ ↗</a>` : ''}
          </div>
        </div>
      </div>
    `).join('')}
  `).join('');
}

// ── Dialogue Q&A (#/dialog) ──
async function loadDialogueFeed() {
  const box = document.getElementById('dialogueFeed');
  if (!box) return;

  try {
    const res = await api('/api/dialogue');
    state.dialogueQuestions = res.questions || [];

    if (!state.dialogueQuestions.length) {
      box.innerHTML = '<p style="color:var(--ink-muted);font-size:13.5px">Вопросов пока нет. Задайте вопрос экспертам Региональной Модели.</p>';
      return;
    }

    box.innerHTML = state.dialogueQuestions.map(q => {
      const isAnswered = q.status === 'answered' && q.answer_text;
      const canAnswer = state.currentUser && (state.currentUser.role === 'expert' || state.currentUser.role === 'admin');

      return `
        <div class="card" style="margin-bottom:12px">
          <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:4px">${escapeHtml(q.question_text)}</div>
          <div style="font-size:12px;color:var(--ink-muted);display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px">
            <span class="badge b-i">${escapeHtml(q.category)}</span>
            <span>${escapeHtml(q.author_name)} (${escapeHtml(q.author_role || 'Руководитель')})</span>
            <span class="badge ${isAnswered ? 'b-g' : 'b-a'}">${isAnswered ? 'Ответ дан' : 'В работе'}</span>
          </div>

          ${isAnswered ? `
            <div style="margin-top:12px;background:var(--surface-subtle);border-left:3px solid var(--success);padding:10px 14px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:13px">
              <b style="color:var(--ink)">Ответ эксперта (${escapeHtml(q.expert_name || 'ИРО Кузбасса')}):</b>
              <p style="margin:4px 0 0;color:var(--ink-secondary)">${escapeHtml(q.answer_text)}</p>
            </div>
          ` : ''}

          ${canAnswer && !isAnswered ? `
            <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border)">
              <textarea class="inp" id="ans_${q.id}" placeholder="Текст официального ответа эксперта..." style="min-height:64px"></textarea>
              <button class="btn sm sand" style="margin-top:6px" onclick="submitAnswer(${q.id})">Опубликовать ответ</button>
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

  if (!textEl) return;
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
        category: catEl ? catEl.value : 'Стратегическое управление',
        author_name: state.currentUser ? state.currentUser.fio : 'Руководитель ОО'
      })
    });
    textEl.value = '';
    showToast('Вопрос направлен экспертам ИРО Кузбасса ✓');
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
        expert_name: state.currentUser ? state.currentUser.fio : 'Эксперт Региональной Модели'
      })
    });
    showToast('Ответ опубликован ✓');
    loadDialogueFeed();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Reserve Ideas (Кадровый резерв #/reserve) ──
async function loadReserveIdeas() {
  const box = document.getElementById('reserveIdeasList');
  if (!box) return;

  try {
    const res = await api('/api/reserve/ideas');
    state.reserveIdeas = res.ideas || [];

    box.innerHTML = state.reserveIdeas.map(idea => `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <h3 style="margin-bottom:4px">${escapeHtml(idea.title)}</h3>
            <span class="badge b-i">${escapeHtml(idea.category)}</span>
            <span style="font-size:12px;color:var(--ink-muted);margin-left:8px">${escapeHtml(idea.author_name)} · ${escapeHtml(idea.workplace || 'Кузбасс')}</span>
          </div>
          <button class="btn sm ${idea.has_voted ? 'sand' : 'outline-dark'}" onclick="voteIdea(${idea.id})">
            ▲ ${idea.votes_count} ${idea.has_voted ? 'Поддержано' : 'Поддержать'}
          </button>
        </div>
        <p style="margin-top:10px;font-size:13.5px">${escapeHtml(idea.description)}</p>
        ${idea.expected_effect ? `
          <div style="margin-top:10px;background:var(--surface-subtle);border-radius:var(--radius-sm);padding:8px 12px;font-size:12.5px;color:var(--ink-secondary)">
            <b>Региональный эффект:</b> ${escapeHtml(idea.expected_effect)}
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
    showToast('Заполните название и описание инициативы', true);
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
    showToast('Проектная инициатива опубликована ✓');
    loadReserveIdeas();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function voteIdea(ideaId) {
  try {
    await api(`/api/reserve/ideas/${ideaId}/vote`, { method: 'POST' });
    loadReserveIdeas();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Load Cabinet Data & Comparative Progress ──
async function loadCabinetData() {
  if (!state.currentUser) return;

  try {
    const diagRes = await api('/api/user/diagnostics');
    state.diagHistory = diagRes.results || [];
    renderCabinetDiagnostics(state.diagHistory);
    renderProgressTab();

    const iprRes = await api('/api/user/ipr');
    state.iprItems = iprRes.items || [];
    renderCabinetIpr(state.iprItems);

    const portRes = await api('/api/user/portfolio');
    state.portfolioItems = portRes.items || [];
    renderCabinetPortfolio(state.portfolioItems);
  } catch (err) {
    console.error('Failed loading cabinet data:', err);
  }
}

// ── Tab 5: Прогресс во времени (Сравнение «Было → Стало») ──
function renderProgressTab() {
  const history = state.diagHistory || [];

  const startEl = document.getElementById('compScoreStart');
  const currEl = document.getElementById('compScoreCurrent');
  const deltaEl = document.getElementById('compDelta');
  const statusEl = document.getElementById('compStatusLabel');

  if (!history.length) {
    if (startEl) startEl.textContent = '—';
    if (currEl) currEl.textContent = '—';
    if (deltaEl) deltaEl.textContent = 'Пройдите диагностику';
    if (statusEl) statusEl.textContent = 'Ожидает замера';
    renderProgressChart([]);
    return;
  }

  // История отсортирована chronologically для расчета динамики
  const sorted = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  const firstScore = first.score_percent;
  const latestScore = latest.score_percent;
  const delta = latestScore - firstScore;

  if (startEl) startEl.textContent = `${firstScore} %`;
  if (currEl) currEl.textContent = `${latestScore} %`;

  if (deltaEl) {
    if (delta > 0) {
      deltaEl.textContent = `+${delta}% прирост после проработки`;
      deltaEl.style.color = 'var(--success)';
    } else if (delta === 0) {
      deltaEl.textContent = 'Базовый уровень зафиксирован';
      deltaEl.style.color = 'var(--ink-secondary)';
    } else {
      deltaEl.textContent = `${delta}% динамика`;
      deltaEl.style.color = 'var(--danger)';
    }
  }

  if (statusEl) {
    if (latestScore >= 80) statusEl.textContent = 'Высокая готовность';
    else if (latestScore >= 60) statusEl.textContent = 'Достаточная готовность';
    else statusEl.textContent = 'В процессе развития';
  }

  renderProgressChart(sorted);
}

function renderProgressChart(history) {
  const chartBox = document.getElementById('cabProgressChart');
  if (!chartBox) return;

  if (!history || history.length < 2) {
    chartBox.innerHTML = `
      <div style="background:var(--surface-subtle);padding:22px;border-radius:var(--radius-sm);text-align:center;color:var(--ink-muted);font-size:13px">
        Для построения динамического графика пройдите диагностику повторно (минимум 2 замера).
      </div>
    `;
    return;
  }

  const W = 460;
  const H = 190;
  const padLeft = 46;
  const padRight = 36;
  const padTop = 24;
  const padBottom = 34;

  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const points = history.map((item, index) => {
    const x = padLeft + (index / (history.length - 1)) * innerW;
    const y = padTop + innerH - (item.score_percent / 100) * innerH;
    const d = new Date(item.created_at);
    const dateStr = `${('0' + d.getDate()).slice(-2)}.${('0' + (d.getMonth() + 1)).slice(-2)}`;
    return { x, y, score: item.score_percent, dateStr };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

  chartBox.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="auto">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#202754" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#202754" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <g stroke="var(--border)" stroke-width="1">
        <line x1="${padLeft}" y1="${padTop}" x2="${W - padRight}" y2="${padTop}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.30}" x2="${W - padRight}" y2="${padTop + innerH * 0.30}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.50}" x2="${W - padRight}" y2="${padTop + innerH * 0.50}"/>
        <line x1="${padLeft}" y1="${padTop + innerH}" x2="${W - padRight}" y2="${padTop + innerH}"/>
      </g>
      <g font-size="9" fill="var(--ink-muted)" text-anchor="end">
        <text x="${padLeft - 8}" y="${padTop + 3}">100%</text>
        <text x="${padLeft - 8}" y="${padTop + innerH * 0.30 + 3}">70%</text>
        <text x="${padLeft - 8}" y="${padTop + innerH * 0.50 + 3}">50%</text>
        <text x="${padLeft - 8}" y="${padTop + innerH + 3}">0%</text>
      </g>
      <polygon points="${padLeft},${padTop + innerH} ${polylineStr} ${points[points.length - 1].x},${padTop + innerH}" fill="url(#chartGrad)"/>
      <polyline points="${polylineStr}" fill="none" stroke="var(--hero-bg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--hero-bg)" stroke="#ffffff" stroke-width="2.5"/>
        <text x="${p.x}" y="${p.y - 9}" font-size="11" font-weight="700" fill="var(--hero-bg)" text-anchor="middle">${p.score}%</text>
        <text x="${p.x}" y="${H - 10}" font-size="9.5" fill="var(--ink-muted)" text-anchor="middle">${p.dateStr}</text>
      `).join('')}
    </svg>
    <div style="font-size:12px;color:var(--ink-muted);margin-top:6px;text-align:center">
      Точки фиксации динамики: первичный срез → межмодульный замер → итоговый контроль
    </div>
  `;
}

function renderCabinetDiagnostics(history) {
  const table = document.getElementById('cabDiagHistoryTable');
  if (!table) return;

  if (!history.length) {
    table.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--ink-muted);padding:18px">Диагностика ещё не пройдена.</td></tr>`;
    return;
  }

  table.innerHTML = `
    <tr>
      <th style="padding:8px;border-bottom:2px solid var(--border);text-align:left">Дата</th>
      <th style="padding:8px;border-bottom:2px solid var(--border);text-align:left">Процедура</th>
      <th style="padding:8px;border-bottom:2px solid var(--border);text-align:left">Результат</th>
      <th style="padding:8px;border-bottom:2px solid var(--border);text-align:left">Дефициты</th>
    </tr>
    ${history.map(item => {
      const d = new Date(item.created_at);
      const dateStr = `${('0' + d.getDate()).slice(-2)}.${('0' + (d.getMonth() + 1)).slice(-2)}.${d.getFullYear()}`;
      const typeLabel = item.type === 'self_assessment' ? 'Самооценка (5 направлений)' : 'Комплексный тест (20)';
      const badgeClass = item.deficit_level === 'low' ? 'b-g' : (item.deficit_level === 'above_average' ? 'b-t' : (item.deficit_level === 'medium' ? 'b-a' : 'b-r'));
      const lvlLabel = item.deficit_level === 'low' ? 'Низкий' : (item.deficit_level === 'above_average' ? 'Выше среднего' : (item.deficit_level === 'medium' ? 'Средний' : 'Высокий'));

      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid var(--border)">${dateStr}</td>
          <td style="padding:8px;border-bottom:1px solid var(--border)"><b>${typeLabel}</b></td>
          <td style="padding:8px;border-bottom:1px solid var(--border)"><b style="color:var(--hero-bg);font-variant-numeric:tabular-nums">${item.score_percent} %</b></td>
          <td style="padding:8px;border-bottom:1px solid var(--border)"><span class="badge ${badgeClass}">${lvlLabel}</span></td>
        </tr>
      `;
    }).join('')}
  `;
}

// ── Tab 3: Моя траектория (ИПР) ──
function renderCabinetIpr(items) {
  const box = document.getElementById('cabIprList');
  if (!box) return;

  if (!items.length) {
    box.innerHTML = `
      <div style="background:var(--surface-subtle);padding:20px;border-radius:var(--radius-sm);text-align:center;color:var(--ink-muted);font-size:13px">
        В индивидуальной программе развития пока нет модулей. Пройдите диагностику для автогенерации индивидуальной траектории.
      </div>
    `;
    return;
  }

  box.innerHTML = items.map(it => `
    <div class="ipr-item-card ${it.status}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <b style="font-size:14.5px;color:var(--ink)">${escapeHtml(it.competency)}</b>
          <p style="margin:4px 0;font-size:13px;color:var(--ink-secondary)"><b>Рекомендуемый курс / микромодуль:</b> ${escapeHtml(it.recommended_module)}</p>
          <p style="margin:2px 0;font-size:12.5px;color:var(--ink-muted)">Формат: ${escapeHtml(it.action_format)} · Наставник: ${escapeHtml(it.mentor_name || 'Совет Региональной Модели')}</p>
          <p style="margin:4px 0;font-size:12.5px;color:var(--hero-bg)">Целевой управленческий продукт: <b>${escapeHtml(it.target_result)}</b></p>
        </div>
        <div style="text-align:right">
          <select class="inp" style="padding:6px 10px;font-size:12.5px;width:auto;font-weight:600" onchange="updateIprStatus(${it.id}, this.value)">
            <option value="planned" ${it.status === 'planned' ? 'selected' : ''}>Запланировано</option>
            <option value="in_progress" ${it.status === 'in_progress' ? 'selected' : ''}>В процессе изучения</option>
            <option value="completed" ${it.status === 'completed' ? 'selected' : ''}>Освоено ✓</option>
          </select>
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:6px">Срок: ${escapeHtml(it.deadline || '2026–2027')}</div>
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

// ── Tab 4: Портфолио ──
function renderCabinetPortfolio(items) {
  const box = document.getElementById('cabPortfolioList');
  if (!box) return;

  if (!items.length) {
    box.innerHTML = `<p style="color:var(--ink-muted);font-size:13px;margin-top:16px">В портфолио пока нет прикреплённых документов.</p>`;
    return;
  }

  const categoryNames = {
    achievements: 'Управленческие достижения',
    cases_simulations: 'Решённые кейсы и симуляции',
    results_dynamics: 'Динамика результатов (ВСОКО/ГИА)',
    prof_development: 'Профессиональное развитие и ДПО',
    expert_mentoring: 'Экспертная и наставническая деятельность',
    analytical_reports: 'Аналитические справки'
  };

  box.innerHTML = items.map(doc => `
    <div class="doc-row" style="justify-content:space-between;align-items:flex-start">
      <div style="display:flex;gap:12px;flex:1">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div>
          <span class="doc-title">${escapeHtml(doc.title)}</span>
          <span style="color:var(--hero-bg);font-size:12px;font-weight:600">${categoryNames[doc.category] || doc.category}</span>
          ${doc.description ? `<p style="margin:4px 0 0;font-size:12.5px;color:var(--ink-secondary)">${escapeHtml(doc.description)}</p>` : ''}
          ${doc.expert_comment ? `<p style="margin:4px 0 0;font-size:12px;color:var(--success)"><b>Экспертное заключение:</b> ${escapeHtml(doc.expert_comment)}</p>` : ''}
          <div style="margin-top:6px">
            <span class="badge ${doc.verification_status === 'approved' ? 'b-g' : (doc.verification_status === 'revision' ? 'b-r' : 'b-a')}">
              ${doc.verification_status === 'approved' ? 'Одобрено экспертной комиссией' : (doc.verification_status === 'revision' ? 'На доработке' : 'На проверке')}
            </span>
          </div>
        </div>
      </div>
      <div>
        <button class="btn sm danger" onclick="deletePortfolioDoc(${doc.id})">Удалить</button>
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
  if (fileInput && fileInput.files.length > 0) {
    formData.append('document', fileInput.files[0]);
  }

  try {
    await api('/api/user/portfolio', {
      method: 'POST',
      body: formData
    });
    document.getElementById('pfTitle').value = '';
    document.getElementById('pfDesc').value = '';
    if (fileInput) fileInput.value = '';
    showToast('Документ добавлен в портфолио ✓');
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

// ── Tab 1: Анкета ──
function fillProfileForm() {
  const u = state.currentUser;
  if (!u) return;

  const fields = [
    'fio', 'birth_date', 'address', 'phone', 'email', 'citizenship',
    'education_level', 'institution', 'workplace', 'position',
    'experience_total', 'experience_ped', 'experience_mgmt', 'share_experience'
  ];
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
    showToast('Необходимо согласие на обработку персональных данных (ФЗ № 152-ФЗ)', true);
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
    showToast('Анкета успешно сохранена в базе данных ✓');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Update Summary Stats in Hero ──
async function updateSummaryStats() {
  try {
    const res = await api('/api/stats/summary');
    if (res) {
      const uEl = document.getElementById('kpiUsers');
      const dEl = document.getElementById('kpiDiag');
      const gEl = document.getElementById('kpiGrowth');
      const mEl = document.getElementById('kpiMuni');

      const totalUsers = res.users_total || res.total_users;
      const totalDiag = res.diagnostics_passed || res.total_diagnostics;
      const growth = res.efficiency_growth || res.growth_rate;

      if (uEl && totalUsers) uEl.textContent = `${totalUsers}+`;
      if (dEl && totalDiag) dEl.textContent = `${totalDiag}`;
      if (gEl && growth) gEl.textContent = growth;
      if (mEl && res.municipalities) mEl.textContent = res.municipalities;
    }
  } catch (err) {
    console.warn('Failed to load stats summary:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ── Startup Initialization ──
document.addEventListener('DOMContentLoaded', async () => {
  // Mobile Burger Menu
  const burger = document.getElementById('burger');
  if (burger) {
    burger.onclick = () => {
      document.getElementById('nav').classList.toggle('open');
    };
  }

  // Cabinet Tabs Navigation
  const cabTabs = document.getElementById('cabTabs');
  if (cabTabs) {
    cabTabs.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        switchCabinetTab(btn.dataset.ctab);
      };
    });
  }

  // Render Page Content
  renderRegionalModelStages();
  renderHomeMicromodules();
  renderDirections();
  renderSelfAssessment();
  shuffleTestOptions();
  renderTest();
  renderCasesAndSimulations();
  renderNormativeLibrary();
  updateSummaryStats();

  // Buttons & Forms
  const saCalcBtn = document.getElementById('saCalc');
  if (saCalcBtn) saCalcBtn.onclick = submitSelfAssessment;

  const saResetBtn = document.getElementById('saReset');
  if (saResetBtn) {
    saResetBtn.onclick = () => {
      state.saScores = [null, null, null, null, null];
      renderSelfAssessment();
      const r = document.getElementById('saRes');
      if (r) r.className = 'diag-result-card';
    };
  }

  const testCalcBtn = document.getElementById('testCalc');
  if (testCalcBtn) testCalcBtn.onclick = submitTest;

  const testResetBtn = document.getElementById('testReset');
  if (testResetBtn) {
    testResetBtn.onclick = () => {
      state.testAnswers = {};
      renderTest();
      updateTestProgress();
      const r = document.getElementById('testRes');
      if (r) r.className = 'diag-result-card';
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

  const demoRoleSelect = document.getElementById('demoRoleSelect');
  if (demoRoleSelect) {
    demoRoleSelect.onchange = async (e) => {
      await loginAs(e.target.value, DEMO_PASSWORDS[e.target.value] || 'demo123');
    };
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = logout;

  // Case Filter buttons
  document.querySelectorAll('.case-filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.case-filter-btn').forEach(b => {
        b.classList.remove('sand', 'on');
        b.classList.add('outline-dark');
      });
      btn.classList.remove('outline-dark');
      btn.classList.add('sand', 'on');
      currentCaseFilter = btn.dataset.cat;
      renderCasesAndSimulations();
    };
  });

  const caseSearch = document.getElementById('caseSearchInput');
  if (caseSearch) {
    caseSearch.oninput = (e) => {
      currentCaseSearch = e.target.value;
      renderCasesAndSimulations();
    };
  }

  // Initialize auth session and route
  await initAuth();
  route();
});
