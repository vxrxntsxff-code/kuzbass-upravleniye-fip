// Клиентская логика платформы «Управленческие кадры Кузбасса»

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
  toast.style.background = isError ? 'var(--danger)' : 'var(--ink)';
  toast.className = 'on';
  setTimeout(() => {
    toast.className = '';
  }, 3500);
}

// ── Offline / File Protocol Fallback Data ──
const OFFLINE_SEED = {
  users: {
    director: {
      id: 1, login: 'director', role: 'director', role_title: 'Директор ОО',
      fio: 'Иванова Анна Андреевна', birth_date: '1983-05-14', address: 'г. Кемерово, пр. Ленина, 82',
      phone: '+7 (905) 912-34-56', email: 'ivanova@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (специалитет)', institution: 'Кемеровский государственный университет (КемГУ)',
      workplace: 'МБОУ «СОШ № 1 г. Кемерово»', position: 'Директор', experience_total: '18 / 18 / 6',
      share_experience: 'Управление качеством (ВСОКО), бережливые технологии', consent_pd: 1
    },
    deputy: {
      id: 2, login: 'deputy', role: 'deputy', role_title: 'Заместитель по УВР',
      fio: 'Смирнов Михаил Владимирович', birth_date: '1987-11-20', address: 'г. Новокузнецк, ул. Кирова, 45',
      phone: '+7 (923) 456-78-90', email: 'smirnov@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (магистратура)', institution: 'Новокузнецкий филиал-институт КемГУ',
      workplace: 'МБОУ «Лицей № 84 г. Новокузнецка»', position: 'Заместитель директора по УВР', experience_total: '12 / 12 / 3',
      share_experience: 'Профильное обучение и инженерные классы', consent_pd: 1
    },
    reserve: {
      id: 3, login: 'reserve', role: 'reserve', role_title: 'Кадровый резерв',
      fio: 'Кузнецова Елена Петровна', birth_date: '1992-03-08', address: 'г. Прокопьевск, ул. Гагарина, 12',
      phone: '+7 (913) 789-01-23', email: 'kuznetsova@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (специалитет)', institution: 'Кузбасский гуманитарно-педагогический институт',
      workplace: 'МБОУ «Гимназия № 72 г. Прокопьевска»', position: 'Учитель математики, резервист Лиги', experience_total: '9 / 9 / 0',
      share_experience: 'Цифровая образовательная среда и олимпиадное движение', consent_pd: 1
    },
    expert: {
      id: 4, login: 'expert', role: 'expert', role_title: 'Эксперт Лиги',
      fio: 'Вербицкая Ирина Васильевна', birth_date: '1975-09-19', address: 'г. Кемерово, б-р Строителей, 28',
      phone: '+7 (903) 901-23-45', email: 'verbitskaya@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (аспирантура / ученая степень)', institution: 'ИРО Кузбасса (к.п.н., доцент)',
      workplace: 'ГБОУ ДПО «ИРО Кузбасса»', position: 'Заведующая кафедрой управления образованием', experience_total: '26 / 26 / 15',
      share_experience: 'Аттестация руководящих кадров, целевое наставничество', consent_pd: 1
    }
  },
  ipr: [
    {
      id: 1, competency: 'Финансово-хозяйственная деятельность', deficit_level: 'medium',
      recommended_module: 'Модуль 2: Экономика школы и закупки по 44-ФЗ / 223-ФЗ в 2026–2027 гг.',
      action_format: 'Курс ДПО (72 ч) + наставнический практикум',
      target_result: 'Скорректированный план ФХД ОО и проект закупки без нарушений',
      deadline: 'I квартал 2027', status: 'in_progress', mentor_name: 'Вербицкая И. В.'
    },
    {
      id: 2, competency: 'Управление качеством образования', deficit_level: 'medium',
      recommended_module: 'Модуль 4: ВСОКО как инструмент доказательного управления ОО',
      action_format: 'Стажировочная площадка опорной школы',
      target_result: 'Положение о ВСОКО и карта аналитических показателей',
      deadline: 'II квартал 2027', status: 'planned', mentor_name: 'Совет Лиги'
    },
    {
      id: 3, competency: 'Управление персоналом', deficit_level: 'low',
      recommended_module: 'Модуль 3: Парное управление и наставничество молодых педагогов',
      action_format: 'Командная сессия Лиги директоров',
      target_result: 'Дорожная карта наставничества для 5 молодых специалистов',
      deadline: 'IV квартал 2026', status: 'completed', mentor_name: 'Вербицкая И. В.'
    }
  ],
  diagnostics: [
    { id: 1, type: 'self_assessment', score_percent: 75, deficit_level: 'above_average', summary_text: 'Выше среднего уровня (75%). Самооценка.', created_at: '2026-09-15T09:00:00Z' },
    { id: 2, type: 'test_20', score_percent: 85, deficit_level: 'low', summary_text: 'Тест 20 заданий: 17/20 (85%). Низкий уровень дефицитов.', created_at: '2026-10-20T11:30:00Z' },
    { id: 3, type: 'test_20', score_percent: 90, deficit_level: 'low', summary_text: 'Комплексный тест: 18/20 (90%). Низкий уровень дефицитов.', created_at: '2026-11-12T14:15:00Z' }
  ],
  portfolio: [
    {
      id: 1, title: 'Программа развития МБОУ «СОШ № 1 г. Кемерово» на 2025–2028 гг.', category: 'achievements',
      description: 'Утверждена педсоветом, согласована с Учредителем. Заняла II место в региональном конкурсе программ развития.',
      file_path: '', verification_status: 'approved', expert_comment: 'Соответствует ФОП и стратегическим приоритетам Кузбасса.', created_at: '2026-10-01T10:00:00Z'
    },
    {
      id: 2, title: 'Аналитическая справка: динамика показателей ВПР и ГИА за 3 года', category: 'results_dynamics',
      description: 'Рост качества образования по профильным предметам на 14.2%.',
      file_path: '', verification_status: 'approved', expert_comment: 'Объективность оценивания подтверждена независимым мониторингом.', created_at: '2026-10-15T12:00:00Z'
    },
    {
      id: 3, title: 'Удостоверение о повышении квалификации: «Менеджмент в образовании» (144 ч)', category: 'prof_development',
      description: 'ФГАОУ ДПО «Академия Минпросвещения России», рег. номер 77/4921.',
      file_path: '', verification_status: 'approved', expert_comment: 'Зачтено в счёт обязательного модуля ДПО.', created_at: '2026-11-01T08:00:00Z'
    }
  ],
  dialogue: [
    {
      id: 1, author_name: 'Смирнов М. В.', author_role: 'Заместитель по УВР', author_workplace: 'Лицей № 84 г. Новокузнецка',
      question_text: 'Как правильно оформить доплату за наставничество в локальном Положении об оплате труда по методике парного руководства?',
      status: 'answered', answer_text: 'Рекомендуется включить фиксированную стимулирующую надбавку в Положение об оплате труда ОО на основании Распоряжения Минпросвещения РФ № Р-145 и методических рекомендаций ИРО Кузбасса (раздел 4). Приказ издаётся ежегодно по результатам соглашения сторон.',
      expert_name: 'Вербицкая И. В. (эксперт Лиги)', created_at: '2026-11-10T10:00:00Z'
    },
    {
      id: 2, author_name: 'Кузнецова Е. П.', author_role: 'Кадровый резерв', author_workplace: 'Гимназия № 72 г. Прокопьевска',
      question_text: 'Какие подтверждающие документы в портфолио имеют наивысший вес при аттестации кандидата на должность руководителя ОО?',
      status: 'answered', answer_text: 'Наибольший вес имеют: 1) Подтверждённая динамика образовательных результатов ОО/класса за 3 года (ВСОКО/ГИА); 2) Защищённый управленческий проект развития ОО; 3) Результаты независимой диагностики дефицитов ИРО Кузбасса.',
      expert_name: 'Комиссия Лиги директоров Кузбасса', created_at: '2026-11-14T15:20:00Z'
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

  if (endpoint === '/api/auth/me') {
    return { user: state.currentUser || OFFLINE_SEED.users.director };
  }
  if (endpoint === '/api/auth/login') {
    const login = body.login || 'director';
    const u = OFFLINE_SEED.users[login] || Object.values(OFFLINE_SEED.users).find(x => x.login === login) || OFFLINE_SEED.users.director;
    return { success: true, user: u };
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
        expert_comment: 'Передано на проверку аттестационной комиссии.',
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
  if (endpoint === '/api/dialogue/questions') {
    let dlg = getLocalState('dialogue', OFFLINE_SEED.dialogue);
    if (method === 'POST') {
      const newQ = {
        id: Date.now(),
        author_name: state.currentUser ? state.currentUser.fio : 'Участник',
        author_role: state.currentUser ? state.currentUser.role_title : 'Педагог',
        author_workplace: state.currentUser ? state.currentUser.workplace : 'Кузбасс',
        question_text: body.question_text,
        status: 'open',
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
  if (endpoint.includes('/answer') && method === 'POST') {
    const id = +endpoint.split('/')[4];
    let dlg = getLocalState('dialogue', OFFLINE_SEED.dialogue);
    dlg = dlg.map(q => q.id === id ? {
      ...q,
      status: 'answered',
      answer_text: body.answer_text,
      expert_name: state.currentUser ? `${state.currentUser.fio} (эксперт)` : 'Эксперт Лиги'
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
        author_role: state.currentUser ? state.currentUser.role_title : 'Резерв',
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

// ── API Fetch wrapper ──
async function api(endpoint, options = {}) {
  if (window.location.protocol === 'file:') {
    return mockApi(endpoint, options);
  }

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
    console.warn('Backend API unreachable, using local mode:', err.message);
    return mockApi(endpoint, options);
  }
}

// ── Auth Handling ──
async function initAuth() {
  const savedUser = localStorage.getItem('kuzbass_user');
  if (savedUser) {
    try {
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
    localStorage.setItem('kuzbass_user', JSON.stringify(data.user));
    updateAuthUI();
    loadCabinetData();
    if (!silent) showToast(`Вход выполнен: ${data.user.fio}`);
    return data.user;
  } catch (err) {
    if (!silent) showToast(err.message, true);
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
      userBadge.innerHTML = `<span>${state.currentUser.fio.split(' ')[0] || state.currentUser.login}</span> <span class="badge b-i">${getRoleTitle(state.currentUser.role)}</span>`;
    }
    if (loginWrap) loginWrap.style.display = 'none';
    if (cabWrap) cabWrap.style.display = 'block';
    if (cabWho) {
      cabWho.innerHTML = `${state.currentUser.fio} · <span style="font-weight:400;color:var(--ink-muted)">${state.currentUser.position || 'Руководитель'}, ${state.currentUser.workplace || 'ОО Кузбасса'}</span> · <span class="badge b-g">${getRoleTitle(state.currentUser.role)}</span>`;
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

// ── Render Competencies Page ──
function renderCompetencies() {
  const box = document.getElementById('compContainer');
  if (!box) return;

  box.innerHTML = COMPETENCIES.map(c => `
    <div class="card">
      <div class="card-icon">${c.icon}</div>
      <div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px">${c.code} · ${c.subtitle}</div>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <div style="margin:12px 0;background:var(--surface-subtle);border-left:3px solid var(--accent);padding:10px 12px;font-size:12.5px;color:var(--ink-secondary);font-style:italic">
        ${c.selfQuote}
      </div>
      <div style="margin-top:10px">
        <span class="chip">${c.module}</span>
        <span class="chip">${c.lab}</span>
      </div>
    </div>
  `).join('');
}

// ── Self Assessment ──
function renderSelfAssessment() {
  const box = document.getElementById('saList');
  if (!box) return;
  box.innerHTML = '';

  SA_QUESTIONS.forEach((q, i) => {
    const row = document.createElement('div');
    row.className = 'sa-row';
    const buttons = [0, 1, 2, 3, 4].map(v => 
      `<button data-i="${i}" data-v="${v}" class="${state.saScores[i] === v ? 'sel' : ''}">${v}</button>`
    ).join('');

    row.innerHTML = `
      <div class="sa-info">
        <span class="sa-title">${q.code}. ${q.title}</span>
        <span class="sa-desc">${q.text}</span>
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
  if (pct >= 81) return { level: 'low', name: 'Низкий уровень дефицитов', desc: 'Высокая сформированность. Вы готовы транслировать опыт и выступать наставником Лиги.', color: 'var(--success)' };
  if (pct >= 70) return { level: 'above_average', name: 'Выше среднего уровня', desc: 'Продвинутый уровень. Выполняются задания базового и частично повышенного уровней.', color: '#0d9488' };
  if (pct >= 50) return { level: 'medium', name: 'Средний уровень дефицитов', desc: 'Базовый уровень. Требуется включение в индивидуальную программу развития (ИПР).', color: 'var(--warning)' };
  return { level: 'high', name: 'Высокий уровень дефицитов', desc: 'Требуется интенсивное развитие. Первоочередное включение в ИПР и наставническое сопровождение.', color: 'var(--danger)' };
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
  resBox.className = 'diag-result-card on';
  resBox.style.borderLeft = `4px solid ${def.color}`;

  let detailsHtml = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.04em">Итоговый показатель сформированности</div>
        <div class="score-num" style="color:${def.color}">${pct}%</div>
        <h3 style="margin:4px 0 2px;font-size:16px">${def.name}</h3>
        <p style="margin:0;font-size:13.5px;color:var(--ink-secondary)">${def.desc}</p>
      </div>
      <div>
        <button class="btn sm outline" onclick="location.hash='#/login'">Перейти в личный кабинет →</button>
      </div>
    </div>
    
    <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
      <b style="font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted)">Срез по направлениям компетенций:</b>
  `;

  SA_QUESTIONS.forEach((q, i) => {
    const score = state.saScores[i];
    const comp = COMPETENCIES[i];
    detailsHtml += `
      <div style="margin-top:10px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px">
        <div style="display:flex;justify-content:space-between;font-weight:700">
          <span>${q.title}</span>
          <span style="font-variant-numeric:tabular-nums">${score} / 4 баллов</span>
        </div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin:8px 0">
          <div style="height:5px;width:${score * 25}%;background:var(--ink);border-radius:3px"></div>
        </div>
        <div style="font-size:12px;color:var(--ink-muted)">Рекомендация для ИПР: <b>${comp.module}</b> (${comp.lab})</div>
      </div>
    `;
  });

  detailsHtml += `</div>`;
  resBox.innerHTML = detailsHtml;

  if (state.currentUser) {
    try {
      await api('/api/user/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'self_assessment',
          score_percent: pct,
          deficit_level: def.level,
          summary_text: `${def.name} (${pct}%). Самооценка.`,
          details: { competencyScores: state.saScores }
        })
      });
      showToast('Результаты сохранены в личном кабинете ✓');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateTestProgress() {
  const answeredCount = Object.keys(state.testAnswers).length;
  const countEl = document.getElementById('testAnsweredCount');
  const fillEl = document.getElementById('testProgressFill');
  if (countEl) countEl.textContent = answeredCount;
  if (fillEl) fillEl.style.width = `${Math.min(100, Math.round((answeredCount / TEST_QUESTIONS.length) * 100))}%`;
}

// ── Comprehensive Test ──
function renderTest() {
  const box = document.getElementById('testList');
  if (!box) return;
  let html = '';

  TEST_QUESTIONS.forEach((t, i) => {
    if (i === 0 || TEST_QUESTIONS[i - 1].d !== t.d) {
      html += `
        <h4 style="margin:24px 0 10px;font-size:13px;color:var(--accent);letter-spacing:0.06em;text-transform:uppercase;font-weight:800">
          Направление ${t.d + 1}: ${t.dir}
        </h4>
      `;
    }

    const options = t.o.map((opt, optIndex) => `
      <label class="test-option">
        <input type="radio" name="test_q_${i}" value="${optIndex}" ${state.testAnswers[i] === optIndex ? 'checked' : ''}>
        <span>${opt}</span>
      </label>
    `).join('');

    html += `
      <div class="test-q-card">
        <div class="q-title"><b>${i + 1}.</b> ${t.q}</div>
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

async function submitTest() {
  const answeredCount = Object.keys(state.testAnswers).length;
  if (answeredCount < TEST_QUESTIONS.length) {
    showToast(`Ответьте на все 20 заданий (осталось: ${TEST_QUESTIONS.length - answeredCount})`, true);
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
      expBox.style.background = isCorrect ? 'var(--success-tint)' : 'var(--danger-tint)';
      expBox.style.border = `1px solid ${isCorrect ? '#a7f3d0' : '#fecaca'}`;
      expBox.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
      expBox.innerHTML = `
        <b>${isCorrect ? '✔ Верный ответ.' : `✘ Неверно. Правильно: «${t.o[t.c]}».`}</b>
        <div style="margin-top:6px;color:var(--ink-secondary);font-size:12.5px">${t.e}</div>
      `;
    }
  });

  const pct = Math.round((correctCount / TEST_QUESTIONS.length) * 100);
  const def = calculateDeficitLevel(pct);
  const resBox = document.getElementById('testRes');
  resBox.className = 'diag-result-card on';
  resBox.style.borderLeft = `4px solid ${def.color}`;

  let summaryHtml = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.04em">Результат комплексного теста</div>
        <div class="score-num" style="color:${def.color}">${pct}%</div>
        <h3 style="margin:4px 0 2px;font-size:16px">${def.name} · ${correctCount} из ${TEST_QUESTIONS.length} верно</h3>
        <p style="margin:0;font-size:13.5px;color:var(--ink-secondary)">${def.desc}</p>
      </div>
      <div>
        <button class="btn sm outline" onclick="location.hash='#/login'">Смотреть профиль в кабинете →</button>
      </div>
    </div>
    
    <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
      <b style="font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted)">Результаты по 5 направлениям стандарта:</b>
  `;

  COMPETENCIES.forEach((comp, idx) => {
    const sc = dirScores[idx];
    summaryHtml += `
      <div style="margin-top:10px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px">
        <div style="display:flex;justify-content:space-between;font-weight:700">
          <span>${comp.title}</span>
          <span style="font-variant-numeric:tabular-nums">${sc} / 4 заданий верно</span>
        </div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin:8px 0">
          <div style="height:5px;width:${sc * 25}%;background:var(--ink);border-radius:3px"></div>
        </div>
        <div style="font-size:12px;color:var(--ink-muted)">Рекомендуемый трек: <b>${comp.module}</b></div>
      </div>
    `;
  });

  summaryHtml += `</div>`;
  resBox.innerHTML = summaryHtml;

  if (state.currentUser) {
    try {
      await api('/api/user/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'test_20',
          score_percent: pct,
          deficit_level: def.level,
          summary_text: `Тест 20 заданий: ${correctCount}/20 (${pct}%). ${def.name}.`,
          details: { competencyScores: dirScores }
        })
      });
      showToast('Результаты тестирования сохранены ✓');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Cases & Simulations ──
let currentCaseFilter = 'all';
let currentCaseSearch = '';

function renderCasesAndSimulations() {
  const caseBox = document.getElementById('casesContainer');
  if (caseBox) {
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
          По заданным критериям кейсов не найдено. Попробуйте выбрать другую категорию или очистить поисковый запрос.
        </div>
      `;
    } else {
      caseBox.innerHTML = filtered.map(c => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span class="badge b-i">${c.badge}</span>
            <span class="badge b-a">${c.level}</span>
          </div>
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
        </div>
      `).join('');
    }
  }

  const simBox = document.getElementById('simContainer');
  if (simBox) {
    simBox.innerHTML = SIMULATIONS_CATALOG.map(s => `
      <div class="card">
        <div style="margin-bottom:8px">
          <span class="badge b-t">${s.type}</span>
          <span class="badge b-i">${s.dir}</span>
        </div>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;font-size:12px;color:var(--ink-muted)">
          Целевой результат: <b>${s.result}</b>
        </div>
      </div>
    `).join('');
  }
}

// ── Normative Library ──
function renderNormativeLibrary() {
  const box = document.getElementById('normLib');
  if (!box) return;
  let html = '';

  NORMATIVE_DOCS.forEach(group => {
    html += `<h3 style="margin:26px 0 12px;font-size:15px;color:var(--ink)">${group.group}</h3>`;
    group.items.forEach(doc => {
      html += `
        <div class="doc-row">
          <div class="doc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div class="doc-content">
            <span class="doc-title">${doc.name}</span>
            <span class="doc-desc">${doc.note}</span>
            <div style="margin-top:6px">
              <span class="badge b-g">${doc.status}</span>
              ${doc.url ? `<a href="${doc.url}" target="_blank" rel="noopener" style="margin-left:10px;font-size:12px;font-weight:600">Открыть первоисточник ↗</a>` : ''}
            </div>
          </div>
        </div>
      `;
    });
  });

  box.innerHTML = html;
}

// ── Dialogue Q&A ──
async function loadDialogueFeed() {
  const box = document.getElementById('qList');
  if (!box) return;

  try {
    const res = await api('/api/dialogue');
    state.dialogueQuestions = res.questions;

    if (!res.questions.length) {
      box.innerHTML = '<p style="color:var(--ink-muted);font-size:13.5px">Вопросов пока нет. Задайте вопрос экспертам Лиги.</p>';
      return;
    }

    box.innerHTML = res.questions.map(q => {
      const isAnswered = q.status === 'answered' && q.answer_text;
      const canAnswer = state.currentUser && (state.currentUser.role === 'expert' || state.currentUser.role === 'admin');

      return `
        <div class="card" style="margin-bottom:12px">
          <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:4px">${escapeHtml(q.question_text)}</div>
          <div style="font-size:12px;color:var(--ink-muted);display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px">
            <span class="badge b-i">${q.category}</span>
            <span>${escapeHtml(q.author_name)} (${escapeHtml(q.author_role || 'Руководитель')})</span>
            <span class="badge ${isAnswered ? 'b-g' : 'b-a'}">${isAnswered ? 'Ответ дан' : 'В работе'}</span>
          </div>

          ${isAnswered ? `
            <div style="margin-top:12px;background:var(--surface-subtle);border-left:3px solid var(--success);padding:10px 14px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:13px">
              <b style="color:var(--ink)">Ответ эксперта (${escapeHtml(q.expert_name || 'Лига экспертов ИРО Кузбасса')}):</b>
              <p style="margin:4px 0 0;color:var(--ink-secondary)">${escapeHtml(q.answer_text)}</p>
            </div>
          ` : ''}

          ${canAnswer && !isAnswered ? `
            <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border)">
              <textarea class="inp" id="ans_${q.id}" placeholder="Текст официального ответа эксперта..." style="min-height:64px"></textarea>
              <button class="btn sm primary" style="margin-top:6px" onclick="submitAnswer(${q.id})">Опубликовать ответ</button>
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
    showToast('Вопрос передан экспертам Лиги ✓');
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
    showToast('Ответ опубликован ✓');
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
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <h3 style="margin-bottom:4px">${escapeHtml(idea.title)}</h3>
            <span class="badge b-i">${escapeHtml(idea.category)}</span>
            <span style="font-size:12px;color:var(--ink-muted);margin-left:8px">${escapeHtml(idea.author_name)} · ${escapeHtml(idea.workplace || 'Кузбасс')}</span>
          </div>
          <button class="btn sm ${idea.has_voted ? 'primary' : 'outline'}" onclick="voteIdea(${idea.id})">
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
    showToast('Заполните название и описание идеи', true);
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

// ── Cabinet Data & Dynamic SVG Chart ──
async function loadCabinetData() {
  if (!state.currentUser) return;

  try {
    const diagRes = await api('/api/user/diagnostics');
    state.diagHistory = diagRes.results;
    renderCabinetDiagnostics(diagRes.results);
    renderProgressChart(diagRes.results);

    const iprRes = await api('/api/user/ipr');
    state.iprItems = iprRes.items;
    renderCabinetIpr(iprRes.items);

    const portRes = await api('/api/user/portfolio');
    state.portfolioItems = portRes.items;
    renderCabinetPortfolio(portRes.items);

    updateCabinetReadiness();
  } catch (err) {
    console.error('Failed loading cabinet data:', err);
  }
}

function updateCabinetReadiness() {
  const diagCount = state.diagHistory ? state.diagHistory.length : 0;
  const iprTotal = state.iprItems ? state.iprItems.length : 0;
  const iprDone = state.iprItems ? state.iprItems.filter(i => i.status === 'completed').length : 0;
  const portTotal = state.portfolioItems ? state.portfolioItems.length : 0;

  let score = 20; // базовый профиль
  if (diagCount > 0) score += 30;
  if (iprTotal > 0) {
    score += Math.round((iprDone / iprTotal) * 30);
  }
  if (portTotal > 0) score += Math.min(20, portTotal * 5);

  score = Math.min(100, Math.max(15, score));

  const textEl = document.getElementById('cabReadinessText');
  const detEl = document.getElementById('cabReadinessDetails');
  const fillEl = document.getElementById('cabReadinessFill');

  if (textEl && fillEl) {
    fillEl.style.width = `${score}%`;
    let statusLabel = 'Базовый уровень';
    if (score >= 80) statusLabel = 'Высокая степень готовности';
    else if (score >= 60) statusLabel = 'Достаточная степень готовности';
    else if (score >= 40) statusLabel = 'Формирующийся уровень';

    textEl.textContent = `${score}% · ${statusLabel}`;
    if (detEl) {
      detEl.textContent = `Диагностика: ${diagCount > 0 ? 'пройдена (' + diagCount + ' замера)' : 'не пройдена'}, ИПР: ${iprDone} из ${iprTotal} освоено, портфолио: ${portTotal} документов`;
    }
  }
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
      const lvlLabel = item.deficit_level === 'low' ? 'Низкий' : (item.deficit_level === 'above_average' ? 'Выше среднего' : (item.deficit_level === 'medium' ? 'Средний' : 'Высокий'));

      return `
        <tr>
          <td>${dateStr}</td>
          <td><b>${typeLabel}</b></td>
          <td><b style="color:var(--ink);font-variant-numeric:tabular-nums">${item.score_percent} %</b></td>
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
      <div style="background:var(--surface-subtle);padding:22px;border-radius:var(--radius-sm);text-align:center;color:var(--ink-muted);font-size:13px">
        Для построения динамического графика пройдите хотя бы две процедуры диагностики.
      </div>
    `;
    return;
  }

  const W = 360;
  const H = 150;
  const padLeft = 40;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 30;

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
      <g stroke="var(--border)" stroke-width="1">
        <line x1="${padLeft}" y1="${padTop}" x2="${W - padRight + 10}" y2="${padTop}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.33}" x2="${W - padRight + 10}" y2="${padTop + innerH * 0.33}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.66}" x2="${W - padRight + 10}" y2="${padTop + innerH * 0.66}"/>
        <line x1="${padLeft}" y1="${padTop + innerH}" x2="${W - padRight + 10}" y2="${padTop + innerH}"/>
      </g>
      <g font-size="9" fill="var(--ink-muted)" text-anchor="end">
        <text x="${padLeft - 6}" y="${padTop + 3}">100%</text>
        <text x="${padLeft - 6}" y="${padTop + innerH * 0.33 + 3}">70%</text>
        <text x="${padLeft - 6}" y="${padTop + innerH * 0.66 + 3}">50%</text>
        <text x="${padLeft - 6}" y="${padTop + innerH + 3}">0%</text>
      </g>
      <polyline points="${polylineStr}" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--ink)" stroke="#fff" stroke-width="2"/>
        <text x="${p.x}" y="${p.y - 7}" font-size="10" font-weight="700" fill="var(--ink)" text-anchor="middle">${p.score}%</text>
        <text x="${p.x}" y="${H - 8}" font-size="9.5" fill="var(--ink-muted)" text-anchor="middle">${p.dateStr}</text>
      `).join('')}
    </svg>
    <div style="font-size:12.5px;color:var(--ink-muted);margin-top:8px">
      Данные сравнительного прогресса сохранены в SQLite базе проекта ФИП РАО.
    </div>
  `;
}

function renderCabinetIpr(items) {
  const box = document.getElementById('cabIprList');
  if (!box) return;

  if (!items.length) {
    box.innerHTML = `
      <div style="background:var(--surface-subtle);padding:20px;border-radius:var(--radius-sm);text-align:center;color:var(--ink-muted);font-size:13px">
        В индивидуальной программе развития пока нет пунктов. Пройдите самооценку или тест для автогенерации маршрута.
      </div>
    `;
    return;
  }

  box.innerHTML = items.map(it => `
    <div class="ipr-item-card ${it.status}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <b style="font-size:14.5px;color:var(--ink)">${escapeHtml(it.competency)}</b>
          <p style="margin:4px 0;font-size:13px;color:var(--ink-secondary)"><b>Курс:</b> ${escapeHtml(it.recommended_module)}</p>
          <p style="margin:2px 0;font-size:12.5px;color:var(--ink-muted)">Формат: ${escapeHtml(it.action_format)} · Наставник: ${escapeHtml(it.mentor_name || 'Лига экспертов')}</p>
          <p style="margin:4px 0;font-size:12.5px;color:var(--accent)">Целевой продукт: <b>${escapeHtml(it.target_result)}</b></p>
        </div>
        <div style="text-align:right">
          <select class="inp" style="padding:4px 8px;font-size:12px;width:auto" onchange="updateIprStatus(${it.id}, this.value)">
            <option value="planned" ${it.status === 'planned' ? 'selected' : ''}>Запланировано</option>
            <option value="in_progress" ${it.status === 'in_progress' ? 'selected' : ''}>В процессе</option>
            <option value="completed" ${it.status === 'completed' ? 'selected' : ''}>Освоено ✓</option>
          </select>
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:6px">Срок: ${it.deadline || '2027 г.'}</div>
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
    box.innerHTML = `<p style="color:var(--ink-muted);font-size:13px">В портфолио пока нет прикреплённых документов.</p>`;
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
    <div class="doc-row" style="justify-content:space-between">
      <div style="display:flex;gap:12px">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div>
          <span class="doc-title">${escapeHtml(doc.title)}</span>
          <span style="color:var(--accent);font-size:12px;font-weight:600">${categoryNames[doc.category] || doc.category}</span>
          ${doc.description ? `<p style="margin:4px 0 0;font-size:12.5px;color:var(--ink-secondary)">${escapeHtml(doc.description)}</p>` : ''}
          ${doc.expert_comment ? `<p style="margin:4px 0 0;font-size:12px;color:var(--success)"><b>Экспертное заключение:</b> ${escapeHtml(doc.expert_comment)}</p>` : ''}
          <div style="margin-top:6px">
            <span class="badge ${doc.verification_status === 'approved' ? 'b-g' : (doc.verification_status === 'revision' ? 'b-r' : 'b-a')}">
              ${doc.verification_status === 'approved' ? 'Одобрено аттестационной комиссией' : (doc.verification_status === 'revision' ? 'На доработке' : 'На проверке')}
            </span>
            ${doc.file_path ? `<a href="${doc.file_path}" target="_blank" style="margin-left:10px;font-size:12px;font-weight:600">Скачать файл 📎</a>` : ''}
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
    showToast('Анкета сохранена в базе данных ✓');
  } catch (err) {
    showToast(err.message, true);
  }
}

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

// ── Startup ──
document.addEventListener('DOMContentLoaded', async () => {
  const burger = document.getElementById('burger');
  if (burger) {
    burger.onclick = () => {
      document.getElementById('nav').classList.toggle('open');
    };
  }

  initTabs('dtabs', 'dt');
  initTabs('ctabs', 'ct');

  renderCompetencies();
  renderSelfAssessment();
  renderTest();
  renderCasesAndSimulations();
  renderNormativeLibrary();

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

  // Case filter buttons
  document.querySelectorAll('.case-filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.case-filter-btn').forEach(b => {
        b.classList.remove('primary', 'on');
        b.classList.add('outline');
      });
      btn.classList.remove('outline');
      btn.classList.add('primary', 'on');
      currentCaseFilter = btn.dataset.cat;
      renderCasesAndSimulations();
    };
  });

  // Case search input
  const caseSearch = document.getElementById('caseSearchInput');
  if (caseSearch) {
    caseSearch.oninput = (e) => {
      currentCaseSearch = e.target.value;
      renderCasesAndSimulations();
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

  const liBtn = document.getElementById('liBtn');
  if (liBtn) {
    liBtn.onclick = async () => {
      const login = document.getElementById('liLogin').value.trim() || 'director';
      const pass = document.getElementById('liPass').value.trim() || 'demo123';
      await loginAs(login, pass);
    };
  }

  const demoRoleSelect = document.getElementById('demoRoleSelect');
  if (demoRoleSelect) {
    demoRoleSelect.onchange = async (e) => {
      await loginAs(e.target.value, 'demo123');
    };
  }

  await initAuth();
  route();
});
