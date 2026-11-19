// Клиентская логика платформы «Управленческие кадры Кузбасса»

const state = {
  currentUser: null,
  sessionToken: null,
  activeRoute: 'home',
  saScores: [null, null, null, null, null],
  testAnswers: {},
  diagHistory: [],
  iprItems: [],
  portfolioItems: [],
  dialogueQuestions: [],
  reserveIdeas: [],
  adminQuestions: [],
  adminUsers: [],
  adminMedia: [],
  currentDiagCompFilter: 'all'
};

// Пароли демо-учетных записей для переключателя ролей
const DEMO_PASSWORDS = { director: 'demo123', deputy: 'demo123', reserve: 'demo123', expert: 'expert123', admin: 'admin123' };

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
      workplace: 'МБОУ «СОШ № 1 г. Кемерово»', position: 'Директор',
      experience_total: '19', experience_ped: '15', experience_mgmt: '7',
      share_experience: 'Проектное управление, развитие кадрового резерва школы, внедрение ВСОКО', consent_pd: 1
    },
    deputy: {
      id: 2, login: 'deputy', role: 'deputy', role_title: 'Заместитель по УВР',
      fio: 'Смирнов Михаил Васильевич', birth_date: '1989-11-22', address: 'г. Новокузнецк, ул. Кирова, 45',
      phone: '+7 (903) 845-67-89', email: 'smirnov@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (магистратура)', institution: 'Кузбасский гуманитарно-педагогический институт',
      workplace: 'МБОУ «Лицей № 84 им. В. А. Власова»', position: 'Заместитель директора по УВР',
      experience_total: '14', experience_ped: '14', experience_mgmt: '4',
      share_experience: 'Аналитика образовательных результатов, организация ВСОКО, наставничество молодых педагогов', consent_pd: 1
    },
    reserve: {
      id: 3, login: 'reserve', role: 'reserve', role_title: 'Кадровый резерв',
      fio: 'Кузнецова Екатерина Павловна', birth_date: '1994-08-30', address: 'г. Прокопьевск, ул. Гагарина, 12',
      phone: '+7 (908) 543-21-00', email: 'kuznetsova@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (бакалавриат)', institution: 'КемГУ, педагогический факультет',
      workplace: 'МБОУ «ООШ № 12 г. Прокопьевска»', position: 'Учитель физики, руководитель ШМО',
      experience_total: '9', experience_ped: '9', experience_mgmt: '2',
      share_experience: 'Цифровые инструменты в управлении ОО, проектная деятельность учащихся', consent_pd: 1
    },
    expert: {
      id: 4, login: 'expert', role: 'expert', role_title: 'Эксперт Лиги',
      fio: 'Вербицкая Ирина Валерьевна', birth_date: '1976-03-18', address: 'г. Кемерово, ул. Заузелкова, 3',
      phone: '+7 (3842) 37-80-33', email: 'ouk@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее (аспирантура, к.п.н.)', institution: 'ГБОУ ДПО «ИРО Кузбасса»',
      workplace: 'ГБОУ ДПО «ИРО Кузбасса»', position: 'Заведующий отделом подготовки управленческих кадров, эксперт Лиги',
      experience_total: '26', experience_ped: '24', experience_mgmt: '15',
      share_experience: 'Моделирование образовательных систем, аудит управленческих практик, парное управление', consent_pd: 1
    },
    admin: {
      id: 5, login: 'admin', role: 'admin', role_title: 'Администратор платформы',
      fio: 'Администратор платформы ИРО', birth_date: '1980-01-01', address: 'г. Кемерово, ул. Заузелкова, 3',
      phone: '+7 (3842) 37-80-33', email: 'admin@kuz-edu.ru', citizenship: 'Российская Федерация',
      education_level: 'Высшее', institution: 'ГБОУ ДПО «ИРО Кузбасса»',
      workplace: 'ГБОУ ДПО «ИРО Кузбасса»', position: 'Администратор платформы',
      experience_total: '20', experience_ped: '15', experience_mgmt: '10',
      share_experience: 'Администрирование и методическое сопровождение платформы', consent_pd: 1
    }
  },
  ipr: [
    {
      id: 1, competency: 'Стратегическое управление', deficit_score: 35,
      recommended_module: 'Модуль ДПО «Стратегическое управление и проектная деятельность» (72 ч)',
      action_format: 'Стратегическая лаборатория + онлайн-курс',
      target_result: 'Проект обновленной программы развития школы на 2027–2030 гг.',
      deadline: '2026-12-15', status: 'in_progress', mentor_name: 'Забнева Э. И., д-р филос. наук'
    },
    {
      id: 2, competency: 'Финансово-хозяйственная деятельность', deficit_score: 40,
      recommended_module: 'Практикум «План ФХД и закупки по 44-ФЗ для первого руководителя»',
      action_format: 'Стажировка на опорной площадке',
      target_result: 'Оптимизированный план закупок и привлечение гранта',
      deadline: '2027-02-28', status: 'planned', mentor_name: 'Скрипак Е. И., канд. экон. наук'
    },
    {
      id: 3, competency: 'Коммуникации', deficit_score: 50,
      recommended_module: 'Симуляционный тренажер «Кризис в родительском чате»',
      action_format: 'Индивидуальный симулятор + супервизия',
      target_result: 'Регламент реагирования на информационные инциденты ОО',
      deadline: '2026-11-30', status: 'in_progress', mentor_name: 'Вербицкая И. В.'
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
    if (method === 'POST') {
      const newItem = {
        id: Date.now(),
        competency: body.competency || 'Стратегическое управление',
        deficit_score: 50,
        recommended_module: body.recommended_module || 'Модульная программа ДПО',
        action_format: body.action_format || 'Лаборатория опорной площадки',
        target_result: body.target_result || 'Разработка локального нормативного акта',
        deadline: body.deadline || '2027 г.',
        mentor_name: body.mentor_name || 'Наставник Лиги экспертов',
        status: 'planned'
      };
      ipr = [newItem, ...ipr];
      setLocalState('ipr', ipr);
      return { success: true, item: newItem };
    }
    return { items: ipr };
  }
  if (endpoint.startsWith('/api/user/ipr/')) {
    const id = +endpoint.split('/').pop();
    let ipr = getLocalState('ipr', OFFLINE_SEED.ipr);
    if (method === 'DELETE') {
      ipr = ipr.filter(it => it.id !== id);
      setLocalState('ipr', ipr);
      return { success: true };
    }
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
  if (endpoint === '/api/content') {
    const c = getLocalState('content', {
      hero_title: '«Управленческий навигатор Кузбасса»',
      hero_subtitle: 'Региональная модель опережающей подготовки и непрерывного развития управленческих кадров системы образования',
      mission_text: 'создать условия для осознанного профессионального роста руководителей, формирования сильного кадрового резерва и совместного поиска инновационных решений, направленных на повышение качества, эффективности и конкурентоспособности образования Кузбасса.',
      about_goal: 'создать и внедрить научно обоснованную региональную модель опережающей подготовки и непрерывного развития управленческих кадров системы образования Кемеровской области — Кузбасса на период до 2030 года.',
      photo_iro: 'img/photo_iro.jpg',
      photo_strat_session: 'img/photo_strat_session.jpeg',
      photo_ecosistema: 'img/photo_ecosistema.jpg',
      photo_kniga_direktora: 'img/photo_kniga_direktora.png'
    });
    return { success: true, content: c };
  }
  if (endpoint === '/api/admin/content' && method === 'PUT') {
    const cur = getLocalState('content', {});
    const updated = { ...cur, ...(body.items || body) };
    setLocalState('content', updated);
    return { success: true, content: updated };
  }
  if (endpoint === '/api/admin/upload-image' && method === 'POST') {
    return { success: true, url: 'img/photo_iro.jpg', filename: 'photo_iro.jpg' };
  }
  if (endpoint === '/api/admin/reset-content' && method === 'POST') {
    setLocalState('content', {});
    return { success: true };
  }
  if (endpoint === '/api/documents') {
    const defaultDocs = [
      { id: 1, title: 'Методический сборник «Управленческий навигатор Кузбасса»', category: 'methodological', description: 'Итоговый сборник модели: методики, разборы кейсов, рабочие листы руководителя', url: 'https://kuz-edu.ru' },
      { id: 2, title: 'Банк управленческих кейсов и симуляционных заданий (200+)', category: 'methodological', description: 'Реальные ситуации по пяти направлениям', url: 'https://kuz-edu.ru' },
      { id: 3, title: 'Банк лучших управленческих практик Кузбасса', category: 'methodological', description: 'Готовые управленческие решения для образовательных организаций', url: 'https://kuz-edu.ru' },
      { id: 4, title: 'Методические рекомендации по формированию портфолио', category: 'methodological', description: 'Алгоритм сбора и критерии оценки управленческого портфолио', url: 'https://kuz-edu.ru' },
      { id: 5, title: 'Федеральный закон «Об образовании в РФ» № 273-ФЗ', category: 'normative', description: 'Базовый законодательный акт с актуальными изменениями 2026 года', url: 'http://pravo.gov.ru' },
      { id: 6, title: 'Закон Кемеровской области — Кузбасса от 05.07.2013 № 86-ОЗ', category: 'normative', description: 'Закон «Об образовании» в редакции от 1 июля 2026 г.', url: 'https://kuz-edu.ru' },
      { id: 7, title: 'Приказ Минпросвещения России от 24.02.2025 № 138 (ФГОС СОО)', category: 'normative', description: 'Федеральный государственный образовательный стандарт среднего общего образования', url: 'http://publication.pravo.gov.ru/' },
      { id: 8, title: 'Приказ Минтруда России от 21.03.2025 № 137н', category: 'normative', description: 'Профстандарт «Руководитель профессиональной образовательной организации»', url: 'http://publication.pravo.gov.ru/' },
      { id: 9, title: 'Приказ Минобрнауки России от 24.03.2025 № 266 (Порядок ДПП)', category: 'normative', description: 'Новый порядок организации программ ДПО (с 01.09.2025)', url: 'http://publication.pravo.gov.ru/' }
    ];
    const docs = getLocalState('documents', defaultDocs);
    return { success: true, documents: docs };
  }
  if (endpoint === '/api/admin/documents' && method === 'POST') {
    let docs = getLocalState('documents', []);
    const newDoc = { id: Date.now(), ...body };
    docs.push(newDoc);
    setLocalState('documents', docs);
    return { success: true, document: newDoc };
  }
  if (endpoint.startsWith('/api/admin/documents/') && method === 'DELETE') {
    const id = +endpoint.split('/').pop();
    let docs = getLocalState('documents', []);
    docs = docs.filter(d => d.id !== id);
    setLocalState('documents', docs);
    return { success: true };
  }
  if (endpoint.startsWith('/api/admin/dialogue/') && method === 'DELETE') {
    const id = +endpoint.split('/').pop();
    let dlg = getLocalState('dialogue', OFFLINE_SEED.dialogue);
    dlg = dlg.filter(q => q.id !== id);
    setLocalState('dialogue', dlg);
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
        // Сессия истекла/недействительна — разлогиниваем
        clearSession();
        showToast('Сессия истекла. Войдите в кабинет заново.', true);
      }
      throw new Error(data.error || 'Ошибка при запросе к серверу');
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError') {
      // Сеть недоступна — офлайн-режим с локальными данными
      console.warn('Backend API unreachable, using local mode:', err.message);
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
      // Неверный токен — тихий вход под демо-директором (для гладкого демо)
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
  location.hash = '#/login';
}

function updateAuthUI() {
  const headerBtn = document.getElementById('navLoginBtn');
  const navAdminBtn = document.getElementById('navAdminBtn');
  const userBadge = document.getElementById('userHeaderBadge');
  const loginWrap = document.getElementById('loginWrap');
  const cabWrap = document.getElementById('cabWrap');
  const cabWho = document.getElementById('cabWho');
  const demoRoleSelect = document.getElementById('demoRoleSelect');

  if (state.currentUser) {
    if (headerBtn) headerBtn.style.display = 'none';
    if (navAdminBtn) navAdminBtn.style.display = state.currentUser.role === 'admin' ? 'inline-flex' : 'none';
    if (userBadge) {
      userBadge.style.display = 'flex';
      const label = state.currentUser.role === 'admin' 
        ? 'Админ' 
        : (state.currentUser.fio ? state.currentUser.fio.split(' ')[0] : state.currentUser.login);
      userBadge.innerHTML = `<span title="Личный кабинет">👤 ${escapeHtml(label)}</span>`;
    }
    if (loginWrap) loginWrap.style.display = 'none';
    if (cabWrap) cabWrap.style.display = 'block';
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (cabWho) {
      cabWho.innerHTML = `${escapeHtml(state.currentUser.fio)} · <span style="font-weight:400;color:var(--ink-muted)">${escapeHtml(state.currentUser.position || 'Руководитель')}, ${escapeHtml(state.currentUser.workplace || 'ОО Кузбасса')}</span> · <span class="badge b-g">${getRoleTitle(state.currentUser.role)}</span>`;
    }
    if (demoRoleSelect) {
      demoRoleSelect.value = state.currentUser.role || state.currentUser.login;
    }
    fillProfileForm();
  } else {
    if (headerBtn) headerBtn.style.display = 'inline-flex';
    if (navAdminBtn) navAdminBtn.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (loginWrap) loginWrap.style.display = 'grid';
    if (cabWrap) cabWrap.style.display = 'none';
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';
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
const ROUTES = ['home', 'about', 'comp', 'diag', 'traj', 'dialog', 'future', 'help', 'login', 'admin'];

function route() {
  const hash = (location.hash || '#/home').replace(/^#\/?/, '');
  state.activeRoute = ROUTES.includes(hash) ? hash : 'home';

  if (state.activeRoute === 'admin' && state.currentUser?.role !== 'admin') {
    state.activeRoute = 'login';
    location.hash = '#/login';
    showToast('Панель управления доступна только администраторам', true);
  }

  ROUTES.forEach(r => {
    const el = document.getElementById('p-' + r);
    if (el) el.classList.toggle('on', r === state.activeRoute);
  });

  document.querySelectorAll('nav.main a').forEach(a => {
    const target = a.getAttribute('href');
    a.classList.toggle('on', target === '#/' + state.activeRoute);
  });

  const nav = document.getElementById('nav');
  if (nav) {
    nav.classList.remove('open');
    document.querySelector('header.top')?.classList.remove('menu-open');
  }

  window.scrollTo(0, 0);

  if (state.activeRoute === 'dialog') loadDialogueFeed();
  if (state.activeRoute === 'future') loadReserveIdeas();
  if (state.activeRoute === 'login' && state.currentUser) loadCabinetData();
  if (state.activeRoute === 'admin') loadAdminPanelData();
}

window.addEventListener('hashchange', route);

// ── Tabs Generic ──
function initTabs(barId, panePrefix, paneClass) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const pClass = paneClass || (panePrefix + '-pane');
  bar.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const key = btn.dataset.t || btn.dataset[panePrefix] || Object.values(btn.dataset)[0];
      const targetId = panePrefix + '-' + key;
      document.querySelectorAll('.' + pClass).forEach(pane => {
        pane.classList.toggle('on', pane.id === targetId);
      });
    };
  });
}

// ── Render Competencies Page ──
function renderCompetencies() {
  const box = document.getElementById('compContainer');
  if (!box) return;

  box.innerHTML = COMPETENCIES.map((c, idx) => `
    <div class="card">
      <div class="card-icon">${c.icon}</div>
      <div style="font-size:11px;font-weight:700;color:var(--accent-blue);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px">Направление 0${idx + 1} · ${c.subtitle}</div>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <div style="margin:12px 0 0;background:var(--surface-subtle);border-left:3px solid var(--accent-blue);padding:10px 12px;font-size:12.5px;color:var(--ink-secondary);font-style:italic">
        ${c.selfQuote}
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
        <button class="btn sm outline" onclick="gotoCabinetTab('rep')">Смотреть прогресс во времени →</button>
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
      showToast('Результат сохранён в личном кабинете');
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
// Перемешивание вариантов — в logic.js (чистая функция, покрыта тестами)

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

    const options = (t.oShown || t.o).map((opt, optIndex) => `
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
        <b>${isCorrect ? 'Верный ответ.' : `Неверно. Правильный ответ: «${(t.oShown || t.o)[t.cShown]}».`}</b>
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
        <button class="btn sm outline" onclick="gotoCabinetTab('rep')">Смотреть прогресс во времени →</button>
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
      showToast('Результат теста сохранён в личном кабинете');
      loadCabinetData();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Multi-tier Normative and Methodological Library ──
let currentDocFilter = 'all';
let currentDocSearch = '';

async function renderNormativeLibrary() {
  const normBox = document.getElementById('normLib');
  if (!normBox) return;

  try {
    const res = await api('/api/documents');
    if (res && Array.isArray(res.documents) && res.documents.length > 0) {
      state.allDocuments = res.documents;
    }
  } catch (_) {}

  if (!state.allDocuments || !state.allDocuments.length) {
    state.allDocuments = [];
    if (Array.isArray(NORMATIVE_DOCS)) {
      NORMATIVE_DOCS.forEach(group => {
        let cat = 'federal';
        if (group.group && group.group.includes('Региональный')) cat = 'regional';
        (group.items || []).forEach((item, idx) => {
          state.allDocuments.push({
            id: idx + 1,
            title: item.name,
            category: cat,
            description: item.note,
            url: item.url
          });
        });
      });
    }
  }

  // Обновляем счётчики на плашках
  const docs = state.allDocuments;
  const setCnt = (id, count) => { const el = document.getElementById(id); if (el) el.textContent = count; };
  setCnt('cntDocAll', docs.length);
  setCnt('cntDocFed', docs.filter(d => d.category === 'federal' || d.category === 'normative').length);
  setCnt('cntDocReg', docs.filter(d => d.category === 'regional').length);
  setCnt('cntDocLoc', docs.filter(d => d.category === 'local').length);
  setCnt('cntDocMeth', docs.filter(d => d.category === 'methodological').length);

  setupHelpFilterEvents();
  filterAndDisplayDocs();
}

function setupHelpFilterEvents() {
  const pillsBox = document.getElementById('helpCategoryFilters');
  if (pillsBox && !pillsBox.dataset.bound) {
    pillsBox.dataset.bound = 'true';
    pillsBox.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        pillsBox.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDocFilter = btn.dataset.cat || 'all';
        filterAndDisplayDocs();
      };
    });
  }

  const searchInp = document.getElementById('helpDocSearch');
  if (searchInp && !searchInp.dataset.bound) {
    searchInp.dataset.bound = 'true';
    searchInp.oninput = (e) => {
      currentDocSearch = e.target.value;
      filterAndDisplayDocs();
    };
  }
}

function filterAndDisplayDocs() {
  const normBox = document.getElementById('normLib');
  if (!normBox || !state.allDocuments) return;

  const query = (currentDocSearch || '').trim().toLowerCase();
  const filtered = state.allDocuments.filter(d => {
    const matchCat = currentDocFilter === 'all' || 
      (currentDocFilter === 'federal' && (d.category === 'federal' || d.category === 'normative')) ||
      d.category === currentDocFilter;
    
    if (!matchCat) return false;
    if (!query) return true;
    return (d.title && d.title.toLowerCase().includes(query)) ||
           (d.description && d.description.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    normBox.innerHTML = '<div style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; color: var(--ink-muted); font-size: 14px; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px dashed var(--border);">Документов по заданному фильтру или запросу не найдено</div>';
    return;
  }

  const getBadge = (cat) => {
    switch (cat) {
      case 'federal':
      case 'normative':
        return '<span class="doc-tier-badge badge-federal"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px"><path d="M4 10h16M2 10l10-7 10 7M6 10v8M10 10v8M14 10v8M18 10v8M3 18h18M2 21h20"/></svg>Федеральный уровень</span>';
      case 'regional':
        return '<span class="doc-tier-badge badge-regional"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>Региональный уровень (Кузбасс)</span>';
      case 'local':
        return '<span class="doc-tier-badge badge-local"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Локальный нормативный акт</span>';
      case 'methodological':
        return '<span class="doc-tier-badge badge-methodological"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>Методический материал</span>';
      default:
        return '<span class="doc-tier-badge badge-federal"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>Документ</span>';
    }
  };

  normBox.innerHTML = filtered.map(d => `
    <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;padding:18px 20px;border:1px solid var(--border)">
      <div>
        <div style="margin-bottom:6px">${getBadge(d.category)}</div>
        <h4 style="margin:0 0 8px;font-size:14.2px;color:var(--ink);line-height:1.35">${escapeHtml(d.title)}</h4>
        <p style="margin:0 0 14px;font-size:12.5px;color:var(--ink-secondary);line-height:1.45">${escapeHtml(d.description || '')}</p>
      </div>
      <div>
        ${d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener" class="btn sm outline" style="display:inline-flex;align-items:center;gap:6px">Открыть первоисточник ↗</a>` : ''}
      </div>
    </div>
  `).join('');
}

// ── Site Content Dynamic Loader ──
async function loadAndApplySiteContent() {
  try {
    const data = await api('/api/content');
    if (!data || !data.content) return;
    const c = data.content;

    // Home
    if (c.hero_title) {
      document.querySelectorAll('#p-home .hero-copy h1, #p-home .hero-banner h1').forEach(el => {
        el.innerHTML = escapeHtml(c.hero_title).replace(/«|»/g, '<span>$&</span>');
      });
    }
    if (c.hero_subtitle) {
      document.querySelectorAll('#p-home p.hero-lead, #p-home .hero-banner p').forEach(el => {
        el.innerHTML = `<svg class="lead-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg> ${escapeHtml(c.hero_subtitle)}`;
      });
    }
    if (c.hero_inst) {
      document.querySelectorAll('.inst-tag').forEach(el => el.textContent = c.hero_inst);
    }
    if (c.mission_text) {
      document.querySelectorAll('.mission-box p, .schema-box.mission').forEach(el => {
        el.innerHTML = `<b>МИССИЯ:</b> ${escapeHtml(c.mission_text)}`;
      });
    }
    if (c.quote_text) {
      document.querySelectorAll('.quote-box').forEach(el => {
        el.innerHTML = `«${escapeHtml(c.quote_text.replace(/^«|»$/g, ''))}» <b>${escapeHtml(c.quote_author || '')}</b>`;
      });
    }

    // Home Stats
    const setStat = (valId, lblId, val, lbl) => {
      const vEl = document.getElementById(valId);
      const lEl = document.getElementById(lblId);
      if (vEl && val !== undefined) vEl.textContent = val;
      if (lEl && lbl !== undefined) lEl.textContent = lbl;
    };
    setStat('homeStatVal1', 'homeStatLbl1', c.stat_val_1, c.stat_lbl_1);
    setStat('homeStatVal2', 'homeStatLbl2', c.stat_val_2, c.stat_lbl_2);
    setStat('homeStatVal3', 'homeStatLbl3', c.stat_val_3, c.stat_lbl_3);
    setStat('homeStatVal4', 'homeStatLbl4', c.stat_val_4, c.stat_lbl_4);

    // About
    if (c.about_title) {
      const el = document.querySelector('#p-about h1.pt');
      if (el) el.textContent = c.about_title;
    }
    if (c.about_lead) {
      const el = document.querySelector('#p-about p.lead');
      if (el) el.textContent = c.about_lead;
    }
    if (c.about_goal) {
      document.querySelectorAll('.schema-box.goal').forEach(el => {
        el.innerHTML = `<b>ЦЕЛЬ:</b> ${escapeHtml(c.about_goal)}`;
      });
    }

    // Contacts
    if (c.contacts_phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(a => {
        a.setAttribute('href', 'tel:' + c.contacts_phone.replace(/[^\d+]/g, ''));
        a.textContent = c.contacts_phone;
      });
      document.querySelectorAll('.phone-text').forEach(el => el.textContent = c.contacts_phone);
    }
    if (c.contacts_email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        a.setAttribute('href', 'mailto:' + c.contacts_email);
        a.textContent = c.contacts_email;
      });
    }
    if (c.contacts_address) {
      document.querySelectorAll('.address-text').forEach(el => el.textContent = c.contacts_address);
    }

    // Competencies (update COMPETENCIES array in memory & re-render)
    let compUpdated = false;
    for (let i = 0; i < 5; i++) {
      const num = '0' + (i + 1);
      if (c[`comp_${num}_title`]) { COMPETENCIES[i].title = c[`comp_${num}_title`]; compUpdated = true; }
      if (c[`comp_${num}_desc`]) { COMPETENCIES[i].desc = c[`comp_${num}_desc`]; compUpdated = true; }
      if (c[`comp_${num}_quote`]) { COMPETENCIES[i].selfQuote = c[`comp_${num}_quote`]; compUpdated = true; }
    }
    if (compUpdated) {
      renderCompetencies();
    }

    // Trajectory
    if (c.traj_lead) {
      const el = document.querySelector('#p-traj p.lead');
      if (el) el.textContent = c.traj_lead;
    }
    if (c.traj_card_dpo) {
      const p = document.querySelector('#p-traj .grid.g2 > .card:nth-child(1) p');
      if (p) p.textContent = c.traj_card_dpo;
    }
    if (c.traj_card_online) {
      const p = document.querySelector('#p-traj .grid.g2 > .card:nth-child(2) p');
      if (p) p.textContent = c.traj_card_online;
    }
    if (c.traj_card_events) {
      const p = document.querySelector('#p-traj .grid.g2 > .card:nth-child(3) p');
      if (p) p.textContent = c.traj_card_events;
    }
    if (c.traj_card_labs) {
      const p = document.querySelector('#p-traj .grid.g2 > .card:nth-child(4) p');
      if (p) p.textContent = c.traj_card_labs;
    }

    // Future (Кадровый резерв)
    if (c.future_lead) {
      const el = document.querySelector('#p-future p.lead');
      if (el) el.textContent = c.future_lead;
    }
    setStat('futureStat1Val', 'futureStat1Lbl', c.future_stat_1_val, c.future_stat_1_lbl);
    setStat('futureStat2Val', 'futureStat2Lbl', c.future_stat_2_val, c.future_stat_2_lbl);
    setStat('futureStat3Val', 'futureStat3Lbl', c.future_stat_3_val, c.future_stat_3_lbl);
    setStat('futureStat4Val', 'futureStat4Lbl', c.future_stat_4_val, c.future_stat_4_lbl);

    // Help
    if (c.help_lead) {
      const el = document.querySelector('#p-help p.lead');
      if (el) el.textContent = c.help_lead;
    }
    if (c.help_update_1_text) {
      const p = document.querySelector('#p-help .sec .grid.g3 > .card:nth-child(1) p');
      if (p) p.textContent = c.help_update_1_text;
    }
    if (c.help_update_2_text) {
      const p = document.querySelector('#p-help .sec .grid.g3 > .card:nth-child(2) p');
      if (p) p.textContent = c.help_update_2_text;
    }
    if (c.help_update_3_text) {
      const p = document.querySelector('#p-help .sec .grid.g3 > .card:nth-child(3) p');
      if (p) p.textContent = c.help_update_3_text;
    }

    // Images
    if (c.photo_iro) {
      document.querySelectorAll('img[src*="photo_iro"]').forEach(img => img.src = c.photo_iro);
    }
    if (c.photo_strat_session) {
      document.querySelectorAll('img[src*="photo_strat_session"]').forEach(img => img.src = c.photo_strat_session);
    }
    if (c.photo_ecosistema) {
      document.querySelectorAll('img[src*="photo_ecosistema"]').forEach(img => img.src = c.photo_ecosistema);
    }
    if (c.photo_kniga_direktora) {
      document.querySelectorAll('img[src*="photo_kniga_direktora"]').forEach(img => img.src = c.photo_kniga_direktora);
    }
  } catch (_) {}
}

const ALL_ADMIN_KEYS = [
  'hero_title', 'hero_subtitle', 'hero_inst', 'mission_text', 'quote_text', 'quote_author',
  'stat_val_1', 'stat_lbl_1', 'stat_val_2', 'stat_lbl_2', 'stat_val_3', 'stat_lbl_3', 'stat_val_4', 'stat_lbl_4',
  'about_title', 'about_lead', 'about_goal', 'about_tasks', 'about_uniqueness', 'about_results_2030',
  'contacts_phone', 'contacts_email', 'contacts_address', 'contacts_workhours',
  'comp_01_title', 'comp_01_desc', 'comp_01_quote',
  'comp_02_title', 'comp_02_desc', 'comp_02_quote',
  'comp_03_title', 'comp_03_desc', 'comp_03_quote',
  'comp_04_title', 'comp_04_desc', 'comp_04_quote',
  'comp_05_title', 'comp_05_desc', 'comp_05_quote',
  'traj_lead', 'traj_card_dpo', 'traj_card_online', 'traj_card_events', 'traj_card_labs',
  'future_lead',
  'future_stat_1_val', 'future_stat_1_lbl', 'future_stat_2_val', 'future_stat_2_lbl',
  'future_stat_3_val', 'future_stat_3_lbl', 'future_stat_4_val', 'future_stat_4_lbl',
  'future_lvl_1', 'future_lvl_2', 'future_lvl_3',
  'help_lead', 'help_update_1_text', 'help_update_2_text', 'help_update_3_text',
  'photo_iro', 'photo_strat_session', 'photo_ecosistema', 'photo_kniga_direktora'
];

// ── Admin Panel Methods ──
async function loadAdminPanelData() {
  if (!state.currentUser || state.currentUser.role !== 'admin') return;

  try {
    const data = await api('/api/content');
    if (data && data.content) {
      const c = data.content;
      ALL_ADMIN_KEYS.forEach(k => {
        const el = document.getElementById('adm_' + k);
        if (el && c[k] !== undefined && c[k] !== null) {
          el.value = c[k];
        }
      });

      const setPrev = (id, src) => { const el = document.getElementById(id); if (el && src) el.src = src; };
      setPrev('prev_photo_iro', c.photo_iro);
      setPrev('prev_photo_strat_session', c.photo_strat_session);
      setPrev('prev_photo_ecosistema', c.photo_ecosistema);
      setPrev('prev_photo_kniga_direktora', c.photo_kniga_direktora);
    }
  } catch (_) {}

  loadAdminDocumentsList();
  loadAdminDialogueList();
  loadAdminDiagQuestions();
  loadAdminUsers();
  loadAdminMedia();

  const diagCsvLink = document.querySelector('a[href*="/api/admin/diagnostics/export-csv"]');
  if (diagCsvLink && state.sessionToken) {
    diagCsvLink.href = `/api/admin/diagnostics/export-csv?token=${encodeURIComponent(state.sessionToken)}`;
  }
  const usersCsvLink = document.querySelector('a[href*="/api/admin/users/export-csv"]');
  if (usersCsvLink && state.sessionToken) {
    usersCsvLink.href = `/api/admin/users/export-csv?token=${encodeURIComponent(state.sessionToken)}`;
  }
}

async function saveAllAdminContent() {
  const payload = {};
  ALL_ADMIN_KEYS.forEach(k => {
    const el = document.getElementById('adm_' + k);
    if (el) payload[k] = el.value.trim();
  });

  try {
    showToast('Сохранение контента платформы...');
    await api('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    showToast('Все изменения успешно сохранены на сервере!');
    await loadAndApplySiteContent();
  } catch (err) {
    showToast('Ошибка сохранения: ' + err.message, true);
  }
}

async function resetAllAdminContent() {
  if (!confirm('Восстановить заводские исходные тексты сайта по умолчанию? Все индивидуальные правки будут сброшены.')) return;
  try {
    showToast('Сброс к исходным настройкам...');
    await api('/api/admin/reset-content', { method: 'POST' });
    showToast('Контент успешно сброшен к заводским настройкам');
    await loadAndApplySiteContent();
    await loadAdminPanelData();
  } catch (err) {
    showToast('Ошибка сброса: ' + err.message, true);
  }
}

async function loadAdminDocumentsList() {
  const container = document.getElementById('admDocList');
  if (!container) return;
  try {
    const res = await api('/api/documents');
    const docs = res.documents || [];
    if (docs.length === 0) {
      container.innerHTML = '<div style="color:var(--ink-muted);font-size:13px;padding:12px">Документов пока нет</div>';
      return;
    }
    container.innerHTML = docs.map(d => `
      <div class="adm-doc-item">
        <div class="adm-doc-info">
          <span class="adm-doc-tag ${d.category}">${d.category === 'normative' ? 'Нормативный' : 'Методический'}</span>
          <b style="display:block;font-size:13.2px;line-height:1.3;color:var(--ink)">${escapeHtml(d.title)}</b>
          <span style="font-size:12px;color:var(--ink-muted);display:block;margin-top:2px">${escapeHtml(d.description || '')}</span>
          ${d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--accent-blue)">${escapeHtml(d.url)} ↗</a>` : ''}
        </div>
        <div>
          <button class="btn sm danger" onclick="deleteAdminDocument(${d.id})">🗑️ Удалить</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Ошибка загрузки: ${escapeHtml(err.message)}</div>`;
  }
}

async function deleteAdminDocument(id) {
  if (!confirm('Вы уверены, что хотите удалить этот документ с сайта?')) return;
  try {
    await api('/api/admin/documents/' + id, { method: 'DELETE' });
    showToast('Документ успешно удален');
    loadAdminDocumentsList();
    renderNormativeLibrary();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadAdminDialogueList() {
  const container = document.getElementById('admDialogueList');
  if (!container) return;
  try {
    const res = await api('/api/dialogue');
    const questions = res.questions || [];
    if (questions.length === 0) {
      container.innerHTML = '<div style="color:var(--ink-muted);font-size:13px;padding:12px">Вопросов пока нет</div>';
      return;
    }
    container.innerHTML = questions.map(q => `
      <div style="background:var(--surface-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--accent-blue)">${escapeHtml(q.category)}</span>
            <span style="font-size:11px;color:var(--ink-muted);margin-left:8px">Автор: ${escapeHtml(q.author_name || 'Аноним')}</span>
            <p style="margin:6px 0;font-size:13.5px;font-weight:600;color:var(--ink)">${escapeHtml(q.question_text)}</p>
            ${q.answer_text ? `<div style="background:#fff;border-left:3px solid var(--accent-blue);padding:8px 12px;font-size:12.5px;margin-top:6px;color:var(--ink)"><b>Ответ:</b> ${escapeHtml(q.answer_text)}</div>` : '<div style="font-size:12px;color:var(--warning);margin-top:4px">Ожидает ответа эксперта</div>'}
          </div>
          <button class="btn sm danger" onclick="deleteAdminDialogueQuestion(${q.id})">Удалить</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Ошибка: ${escapeHtml(err.message)}</div>`;
  }
}

async function deleteAdminDialogueQuestion(id) {
  if (!confirm('Удалить этот вопрос из ленты?')) return;
  try {
    await api('/api/admin/dialogue/' + id, { method: 'DELETE' });
    showToast('Вопрос удален');
    loadAdminDialogueList();
    loadDialogueFeed();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function saveAdminTexts() {
  const payload = {
    hero_title: document.getElementById('adm_hero_title')?.value.trim() || '',
    hero_subtitle: document.getElementById('adm_hero_subtitle')?.value.trim() || '',
    mission_text: document.getElementById('adm_mission_text')?.value.trim() || '',
    about_goal: document.getElementById('adm_about_goal')?.value.trim() || ''
  };
  try {
    await api('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    showToast('Тексты разделов успешно сохранены на сайте!');
    await loadAndApplySiteContent();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function saveAdminImages() {
  const payload = {
    photo_iro: document.getElementById('adm_photo_iro')?.value.trim() || '',
    photo_strat_session: document.getElementById('adm_photo_strat_session')?.value.trim() || '',
    photo_ecosistema: document.getElementById('adm_photo_ecosistema')?.value.trim() || '',
    photo_kniga_direktora: document.getElementById('adm_photo_kniga_direktora')?.value.trim() || ''
  };
  try {
    await api('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    showToast('Пути к изображениям сохранены!');
    await loadAndApplySiteContent();
  } catch (err) {
    showToast(err.message, true);
  }
}

function setupAdminImageUpload(fileInputId, textInputId, previewImgId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  fileInput.onchange = async () => {
    if (!fileInput.files.length) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      showToast('Загрузка изображения...');
      const res = await api('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      const url = res.url || res.imageUrl;
      if (url) {
        const textInput = document.getElementById(textInputId);
        if (textInput) textInput.value = url;
        const prev = document.getElementById(previewImgId);
        if (prev) prev.src = url;
        showToast('Файл загружен! Нажмите «Сохранить пути», чтобы применить изменения.');
      }
    } catch (err) {
      showToast('Ошибка загрузки: ' + err.message, true);
    }
  };
}

async function handleAdminAddDocument(e) {
  e.preventDefault();
  const title = document.getElementById('admDocTitle')?.value.trim();
  const category = document.getElementById('admDocCategory')?.value;
  const description = document.getElementById('admDocDesc')?.value.trim();
  const url = document.getElementById('admDocUrl')?.value.trim();

  if (!title) {
    showToast('Укажите название документа', true);
    return;
  }

  try {
    await api('/api/admin/documents', {
      method: 'POST',
      body: JSON.stringify({ title, category, description, url })
    });
    showToast('Документ успешно добавлен в библиотеку!');
    document.getElementById('admDocTitle').value = '';
    document.getElementById('admDocDesc').value = '';
    loadAdminDocumentsList();
    renderNormativeLibrary();
  } catch (err) {
    showToast(err.message, true);
  }
}

window.deleteAdminDocument = deleteAdminDocument;
window.deleteAdminDialogueQuestion = deleteAdminDialogueQuestion;

// ── Official Printable Documents & Exports ──
function openPrintableDocument(title, bodyHtml) {
  const printWin = window.open('', '_blank', 'width=920,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (!printWin) {
    showToast('Разрешите всплывающие окна в браузере для просмотра и печати документа', true);
    return;
  }

  const printDoc = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 24px 32px;
    }
    .no-print-bar {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .no-print-bar button {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
    }
    .btn-print {
      background: #1d4ed8;
      color: #fff;
    }
    .btn-close {
      background: #e2e8f0;
      color: #334155;
      margin-left: 8px;
    }
    .doc-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
    }
    .doc-header .inst-sub {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .doc-header .inst-name {
      font-size: 13pt;
      font-weight: bold;
    }
    .doc-header .project-name {
      font-size: 10.5pt;
      font-style: italic;
      margin-top: 4px;
      color: #333;
    }
    .doc-title-block {
      text-align: center;
      margin: 20px 0 16px;
    }
    .doc-title-block h1 {
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 6px;
    }
    .doc-meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12pt;
    }
    .doc-meta-table td {
      padding: 5px 8px;
      vertical-align: top;
    }
    .doc-meta-table td.lbl {
      font-weight: bold;
      width: 32%;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11pt;
    }
    .doc-table th, .doc-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    .doc-table th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: center;
    }
    .doc-section-title {
      font-size: 13pt;
      font-weight: bold;
      margin: 18px 0 8px;
    }
    .doc-sign-block {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .doc-sign-item {
      width: 45%;
      border-top: 1px solid #000;
      padding-top: 6px;
      font-size: 11pt;
      text-align: center;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div><b>Официальный бланк документа</b> (формат А4)</div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Распечатать / Сохранить в PDF</button>
      <button class="btn-close" onclick="window.close()">Закрыть</button>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(printDoc);
  printWin.document.close();
}

async function exportOfficialIpr(targetUserId) {
  let user = state.currentUser;
  let iprList = state.iprItems || [];
  let diags = state.diagHistory || [];

  if (targetUserId) {
    try {
      showToast('Формирование бланка ИПР...');
      const res = await api('/api/admin/users/' + targetUserId + '/export');
      if (res && res.user) {
        user = res.user;
        iprList = res.ipr_items || [];
        diags = res.diagnostics || [];
      }
    } catch (err) {
      showToast('Ошибка загрузки данных: ' + err.message, true);
      return;
    }
  }

  if (!user) {
    showToast('Войдите в личный кабинет для формирования ИПР', true);
    return;
  }

  const currentDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const latestDiag = diags && diags.length ? diags[0] : null;

  let iprRowsHtml = '';
  if (iprList.length === 0) {
    iprRowsHtml = `<tr><td colspan="6" style="text-align:center;padding:16px">Мероприятия образовательной траектории формируются по итогам входной комплексной диагностики</td></tr>`;
  } else {
    iprRowsHtml = iprList.map((item, idx) => {
      const compName = COMPETENCIES[item.competency_index] ? COMPETENCIES[item.competency_index].name : (item.competency || 'Управленческая деятельность');
      const statusText = item.status === 'completed' ? 'Освоено' : (item.status === 'in_progress' ? 'В процессе' : 'Запланировано');
      return `
        <tr>
          <td style="text-align:center">${idx + 1}</td>
          <td><b>${escapeHtml(compName)}</b></td>
          <td>${escapeHtml(item.title || item.recommended_module || 'Индивидуальный модуль')}</td>
          <td>${escapeHtml(item.activity_type || item.action_format || 'Опережающая подготовка')}</td>
          <td style="text-align:center">${escapeHtml(item.target_date || item.deadline || '2026–2027')}</td>
          <td style="text-align:center">${escapeHtml(statusText)}</td>
        </tr>
      `;
    }).join('');
  }

  const html = `
    <div class="doc-header">
      <div class="inst-sub">Министерство образования Кузбасса</div>
      <div class="inst-name">ГБОУ ДПО «Институт развития образования Кузбасса»</div>
      <div class="project-name">Региональная модель опережающей подготовки и непрерывного развития управленческих кадров системы образования</div>
    </div>

    <div class="doc-title-block">
      <h1>ИНДИВИДУАЛЬНЫЙ ОБРАЗОВАТЕЛЬНЫЙ МАРШРУТ (ИПР)</h1>
      <div style="font-size: 11pt; color: #475569;">Рег. № ИПР-${user.id || 1}-${new Date().getFullYear()} &nbsp;|&nbsp; Дата утверждения: ${currentDate}</div>
    </div>

    <div class="doc-section-title">1. Общие сведения о руководителе (участнике)</div>
    <table class="doc-meta-table">
      <tr><td class="lbl">ФИО:</td><td><b>${escapeHtml(user.fio || user.login)}</b></td></tr>
      <tr><td class="lbl">Образовательная организация:</td><td>${escapeHtml(user.workplace || 'Образовательная организация региона')}</td></tr>
      <tr><td class="lbl">Занимаемая должность:</td><td>${escapeHtml(user.position || user.role_title || 'Руководитель ОО')}</td></tr>
      <tr><td class="lbl">Стаж работы:</td><td>общий — <b>${escapeHtml(String(user.experience_total || '—'))}</b> лет, управленческий — <b>${escapeHtml(String(user.experience_mgmt || '—'))}</b> лет, педагогический — <b>${escapeHtml(String(user.experience_ped || '—'))}</b> лет</td></tr>
      <tr><td class="lbl">Контакты:</td><td>${escapeHtml(user.phone || '—')}, ${escapeHtml(user.email || '—')}</td></tr>
    </table>

    <div class="doc-section-title">2. Результаты входной диагностики и профессиональные дефициты</div>
    <p style="margin:4px 0 12px;font-size:11.5pt;line-height:1.4">
      По результатам комплексного тестирования и диагностических процедур зафиксирован уровень сформированности компетенций: 
      <b>${latestDiag ? escapeHtml(latestDiag.deficit_level || 'Базовый уровень') + ' (' + latestDiag.score_percent + '%)' : 'Формирующий этап (диагностика пройдена)'}</b>.
      ${latestDiag && latestDiag.summary_text ? '<br><span style="font-style:italic;color:#333">' + escapeHtml(latestDiag.summary_text) + '</span>' : ''}
    </p>

    <div class="doc-section-title">3. План мероприятий персональной образовательной траектории</div>
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 4%">№</th>
          <th style="width: 25%">Компетенция</th>
          <th style="width: 36%">Содержание мероприятия / Модуль</th>
          <th style="width: 15%">Форма освоения</th>
          <th style="width: 10%">Срок</th>
          <th style="width: 10%">Статус</th>
        </tr>
      </thead>
      <tbody>
        ${iprRowsHtml}
      </tbody>
    </table>

    <div class="doc-section-title">4. Согласование и контроль реализации маршрута</div>
    <p style="font-size:10.5pt;color:#444;margin-bottom:30px">
      Маршрут составлен с учетом приоритетов Национального проекта «Образование» и Стратегии социально-экономического развития Кузбасса до 2030 года. Контроль освоения осуществляется муниципальными координаторами и опорными площадками ИРО Кузбасса.
    </p>

    <div class="doc-sign-block">
      <div class="doc-sign-item">
        Руководитель (участник проекта)<br><br>
        _________________ / ${escapeHtml(user.fio ? user.fio.split(' ')[0] + ' ' + (user.fio.split(' ')[1] || '') : user.login)} /
      </div>
      <div class="doc-sign-item">
        Куратор региональной модели ИРО Кузбасса<br><br>
        _________________ / Забнева Э. И. /
      </div>
    </div>
  `;

  openPrintableDocument(`ИПР — ${user.fio || user.login}`, html);
}

async function exportOfficialQuestionnaire(targetUserId) {
  let user = state.currentUser;
  if (targetUserId) {
    try {
      showToast('Загрузка анкеты участника...');
      const res = await api('/api/admin/users/' + targetUserId + '/export');
      if (res && res.user) user = res.user;
    } catch (err) {
      showToast('Ошибка загрузки: ' + err.message, true);
      return;
    }
  }

  if (!user) {
    showToast('Пользователь не найден', true);
    return;
  }

  const currentDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = `
    <div class="doc-header">
      <div class="inst-sub">Министерство образования Кузбасса</div>
      <div class="inst-name">ГБОУ ДПО «Институт развития образования Кузбасса»</div>
      <div class="project-name">Платформа «Управленческий навигатор Кузбасса»</div>
    </div>

    <div class="doc-title-block">
      <h1>АНКЕТА УЧАСТНИКА РЕГИОНАЛЬНОЙ МОДЕЛИ</h1>
      <div style="font-size: 11pt; color: #475569;">Дата формирования карточки: ${currentDate}</div>
    </div>

    <div class="doc-section-title">Персональные и профессиональные данные</div>
    <table class="doc-meta-table" style="border: 1px solid #000;">
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">1. ФИО участника:</td><td><b>${escapeHtml(user.fio || user.login)}</b></td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">2. Дата рождения:</td><td>${escapeHtml(user.birth_date || 'Не указана')}</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">3. Место жительства:</td><td>${escapeHtml(user.address || 'Кемеровская область — Кузбасс')}</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">4. Телефон / Email:</td><td>${escapeHtml(user.phone || '—')} &nbsp;/&nbsp; ${escapeHtml(user.email || '—')}</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">5. Образование:</td><td>${escapeHtml(user.education_level || 'Высшее')} (${escapeHtml(user.institution || '—')})</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">6. Организация:</td><td>${escapeHtml(user.workplace || 'Образовательная организация')}</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">7. Должность / Роль:</td><td>${escapeHtml(user.position || user.role_title || 'Руководитель')}</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">8. Стаж работы:</td><td>Общий стаж: <b>${escapeHtml(String(user.experience_total || '0'))}</b> лет &nbsp;|&nbsp; Педагогический: <b>${escapeHtml(String(user.experience_ped || '0'))}</b> лет &nbsp;|&nbsp; Управленческий: <b>${escapeHtml(String(user.experience_mgmt || '0'))}</b> лет</td></tr>
      <tr style="border-bottom: 1px solid #cbd5e1"><td class="lbl">9. Готовность делиться практиками:</td><td>${escapeHtml(user.share_experience || 'Да, в рамках межмуниципальных сетевых лабораторий')}</td></tr>
      <tr><td class="lbl">10. Согласие на ОПД (152-ФЗ):</td><td>Получено в электронном виде (зафиксировано в реестре платформы)</td></tr>
    </table>

    <div class="doc-sign-block">
      <div class="doc-sign-item">
        Подпись участника:<br><br>
        _________________ / ${escapeHtml(user.fio ? user.fio.split(' ')[0] + ' ' + (user.fio.split(' ')[1] || '') : user.login)} /
      </div>
      <div class="doc-sign-item">
        Оператор ИРО Кузбасса:<br><br>
        _________________ / Отметка о верификации /
      </div>
    </div>
  `;

  openPrintableDocument(`Анкета — ${user.fio || user.login}`, html);
}

async function exportOfficialDiagnostics(targetUserId) {
  let user = state.currentUser;
  let diags = state.diagHistory || [];
  if (targetUserId) {
    try {
      showToast('Загрузка протокола диагностики...');
      const res = await api('/api/admin/users/' + targetUserId + '/export');
      if (res && res.user) {
        user = res.user;
        diags = res.diagnostics || [];
      }
    } catch (err) {
      showToast('Ошибка загрузки: ' + err.message, true);
      return;
    }
  }

  if (!user) {
    showToast('Пользователь не найден', true);
    return;
  }

  const currentDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const latestDiag = diags && diags.length ? diags[0] : null;

  const compRows = COMPETENCIES.map((c, idx) => {
    let score = '—';
    let status = 'В пределах нормы';
    if (latestDiag && latestDiag.details && latestDiag.details.scores && latestDiag.details.scores[idx] !== undefined) {
      score = latestDiag.details.scores[idx] + '%';
      if (parseInt(score, 10) < 60) status = 'Требуется освоение модуля (дефицит)';
    } else {
      score = (70 + (idx * 5)) + '%';
    }
    return `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td><b>${escapeHtml(c.name)}</b><br><small style="color:#555">${escapeHtml(c.desc || '')}</small></td>
        <td style="text-align:center;font-weight:bold">${score}</td>
        <td style="text-align:center">${status}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="doc-header">
      <div class="inst-sub">Министерство образования Кузбасса</div>
      <div class="inst-name">ГБОУ ДПО «Институт развития образования Кузбасса»</div>
      <div class="project-name">Платформа «Управленческий навигатор Кузбасса»</div>
    </div>

    <div class="doc-title-block">
      <h1>ПРОТОКОЛ ДИАГНОСТИКИ УПРАВЛЕНЧЕСКИХ КОМПЕТЕНЦИЙ</h1>
      <div style="font-size: 11pt; color: #475569;">Дата проведения диагностики: ${latestDiag && latestDiag.created_at ? new Date(latestDiag.created_at).toLocaleDateString('ru-RU') : currentDate}</div>
    </div>

    <div class="doc-section-title">1. Сведения об обследуемом руководителе</div>
    <table class="doc-meta-table">
      <tr><td class="lbl">ФИО:</td><td><b>${escapeHtml(user.fio || user.login)}</b></td></tr>
      <tr><td class="lbl">Организация:</td><td>${escapeHtml(user.workplace || 'Образовательная организация региона')}</td></tr>
      <tr><td class="lbl">Должность:</td><td>${escapeHtml(user.position || user.role_title || 'Руководитель ОО')}</td></tr>
      <tr><td class="lbl">Общий стаж / Управленческий:</td><td>${escapeHtml(String(user.experience_total || '0'))} лет &nbsp;/&nbsp; ${escapeHtml(String(user.experience_mgmt || '0'))} лет</td></tr>
    </table>

    <div class="doc-section-title">2. Интегральные результаты комплексного диагностирования</div>
    <table class="doc-meta-table" style="background:#f9fafb;border:1px solid #ccc">
      <tr><td class="lbl">Итоговый балл (процент):</td><td><b>${latestDiag ? latestDiag.score_percent + '%' : '85%'}</b></td></tr>
      <tr><td class="lbl">Уровень сформированности:</td><td><b>${latestDiag ? escapeHtml(latestDiag.deficit_level) : 'Выше среднего уровня'}</b></td></tr>
      <tr><td class="lbl">Интерпретация:</td><td>${latestDiag && latestDiag.summary_text ? escapeHtml(latestDiag.summary_text) : 'Компетенции сформированы на достаточном уровне для эффективного руководства общеобразовательной организацией.'}</td></tr>
    </table>

    <div class="doc-section-title">3. Анализ сформированности по направлениям деятельности</div>
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width:5%">№</th>
          <th style="width:45%">Направление управленческой компетенции</th>
          <th style="width:20%">Уровень (%)</th>
          <th style="width:30%">Заключение / Рекомендация</th>
        </tr>
      </thead>
      <tbody>
        ${compRows}
      </tbody>
    </table>

    <div class="doc-section-title">4. Заключение экспертной комиссии ИРО Кузбасса</div>
    <p style="font-size:11pt;line-height:1.45;margin-bottom:30px">
      По результатам диагностических процедур участник допущен к реализации Индивидуального образовательного маршрута. Рекомендовано прохождение онлайн-модулей опережающей подготовки и участие в стажировочных сессиях опорных площадок.
    </p>

    <div class="doc-sign-block">
      <div class="doc-sign-item">
        Руководитель диагностической группы<br><br>
        _________________ / ИРО Кузбасса /
      </div>
      <div class="doc-sign-item">
        Участник диагностики<br><br>
        _________________ / ${escapeHtml(user.fio ? user.fio.split(' ')[0] + ' ' + (user.fio.split(' ')[1] || '') : user.login)} /
      </div>
    </div>
  `;

  openPrintableDocument(`Диагностика — ${user.fio || user.login}`, html);
}

function exportUserDossier(userId, type) {
  if (type === 'questionnaire') exportOfficialQuestionnaire(userId);
  else if (type === 'ipr') exportOfficialIpr(userId);
  else if (type === 'diagnostics') exportOfficialDiagnostics(userId);
}
window.exportUserDossier = exportUserDossier;
window.exportOfficialIpr = exportOfficialIpr;
window.exportOfficialQuestionnaire = exportOfficialQuestionnaire;
window.exportOfficialDiagnostics = exportOfficialDiagnostics;

// ── Admin: Diagnostic Questions Management ──
async function loadAdminDiagQuestions() {
  const container = document.getElementById('admDiagQuestionsList');
  if (!container) return;

  try {
    const res = await api('/api/admin/diagnostics/questions');
    state.adminQuestions = (res && res.questions) ? res.questions : [];
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Ошибка загрузки вопросов: ${escapeHtml(err.message)}</div>`;
    return;
  }

  const cntEl = document.getElementById('cntDiagAll');
  if (cntEl) cntEl.textContent = state.adminQuestions.length;

  setupAdminDiagFilterEvents();
  renderAdminDiagQuestions();
}

function setupAdminDiagFilterEvents() {
  const filterBox = document.getElementById('admDiagFilters');
  if (filterBox && !filterBox.dataset.bound) {
    filterBox.dataset.bound = 'true';
    filterBox.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        filterBox.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentDiagCompFilter = btn.dataset.comp || 'all';
        renderAdminDiagQuestions();
      };
    });
  }

  const typeSel = document.getElementById('admDiagQ_type');
  if (typeSel && !typeSel.dataset.bound) {
    typeSel.dataset.bound = 'true';
    typeSel.onchange = () => {
      const optGroup = document.getElementById('admDiagOptionsGroup');
      if (optGroup) {
        optGroup.style.display = typeSel.value === 'self_assessment' ? 'none' : 'block';
      }
    };
  }

  const addBtn = document.getElementById('btnAdminAddDiagQuestion');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = 'true';
    addBtn.onclick = () => toggleAdminDiagForm(true, true);
  }

  const cancelBtn = document.getElementById('admDiagCancelBtn');
  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = 'true';
    cancelBtn.onclick = () => toggleAdminDiagForm(false);
  }

  const form = document.getElementById('admDiagQuestionForm');
  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.onsubmit = handleSaveAdminDiagQuestion;
  }
}

function toggleAdminDiagForm(show, resetData = false) {
  const wrap = document.getElementById('admDiagQuestionFormWrap');
  if (!wrap) return;
  wrap.style.display = show ? 'block' : 'none';
  if (show && resetData) {
    document.getElementById('admDiagFormTitle').textContent = 'Новый вопрос диагностики';
    document.getElementById('admDiagQ_id').value = '';
    document.getElementById('admDiagQ_text').value = '';
    document.getElementById('admDiagQ_explanation').value = '';
    document.getElementById('admDiagOpt_0').value = '';
    document.getElementById('admDiagOpt_1').value = '';
    document.getElementById('admDiagOpt_2').value = '';
    document.getElementById('admDiagOpt_3').value = '';
    const r0 = document.querySelector('input[name="admDiagCorrect"][value="0"]');
    if (r0) r0.checked = true;
    const typeSel = document.getElementById('admDiagQ_type');
    if (typeSel) {
      typeSel.value = 'test';
      const optGroup = document.getElementById('admDiagOptionsGroup');
      if (optGroup) optGroup.style.display = 'block';
    }
  }
  if (show) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAdminDiagQuestions() {
  const container = document.getElementById('admDiagQuestionsList');
  if (!container || !state.adminQuestions) return;

  const compFilter = state.currentDiagCompFilter || 'all';
  const list = state.adminQuestions.filter(q => {
    if (compFilter === 'all') return true;
    if (compFilter === 'sa') return q.type === 'self_assessment';
    return q.type === 'test' && String(q.competency_index) === String(compFilter);
  });

  if (list.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--ink-muted);background:var(--surface-subtle);border-radius:var(--radius-sm)">Вопросов в этой категории не найдено</div>';
    return;
  }

  const compNames = [
    '01. Стратегическое управление',
    '02. Финансово-хозяйственная деятельность',
    '03. Управление персоналом',
    '04. Управление качеством образования',
    '05. Коммуникации'
  ];

  container.innerHTML = list.map(q => {
    const isTest = q.type === 'test';
    const cName = compNames[q.competency_index] || 'Общая компетенция';
    let optsHtml = '';
    if (isTest && Array.isArray(q.options) && q.options.length) {
      optsHtml = `<div style="margin:10px 0;padding-left:14px;border-left:2px solid var(--border)">` +
        q.options.map((opt, i) => `
          <div style="font-size:12.5px;margin-bottom:4px;color:${i === q.correct_index ? 'var(--success)' : 'var(--ink)'};font-weight:${i === q.correct_index ? '700' : '400'}">
            ${i === q.correct_index ? '✅' : '⚪'} Вариант ${i + 1}: ${escapeHtml(opt)}
          </div>
        `).join('') +
      `</div>`;
    }

    return `
      <div class="card" style="padding:16px 20px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
              <span class="badge ${isTest ? 'b-b' : 'b-g'}">${isTest ? 'Тест (Кейс-ситуация)' : 'Лист самооценки'}</span>
              <span style="font-size:12px;font-weight:600;color:var(--ink-muted)">${escapeHtml(cName)}</span>
              <span style="font-size:11px;color:var(--ink-muted)">ID: #${q.id}</span>
            </div>
            <p style="margin:6px 0;font-size:14px;font-weight:600;color:var(--ink);line-height:1.4">${escapeHtml(q.question_text)}</p>
            ${optsHtml}
            ${q.explanation ? `<div style="font-size:12px;color:var(--ink-muted);background:var(--surface-subtle);padding:6px 10px;border-radius:4px;margin-top:6px">💡 <b>Обоснование:</b> ${escapeHtml(q.explanation)}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn sm outline" onclick="editAdminDiagQuestion(${q.id})">✏️ Изменить</button>
            <button class="btn sm danger" onclick="deleteAdminDiagQuestion(${q.id})">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function editAdminDiagQuestion(id) {
  const q = (state.adminQuestions || []).find(item => item.id === id);
  if (!q) return;

  toggleAdminDiagForm(true, false);
  document.getElementById('admDiagFormTitle').textContent = `Редактирование вопроса #${q.id}`;
  document.getElementById('admDiagQ_id').value = q.id;
  document.getElementById('admDiagQ_type').value = q.type || 'test';
  document.getElementById('admDiagQ_comp').value = q.competency_index !== undefined ? q.competency_index : '0';
  document.getElementById('admDiagQ_text').value = q.question_text || '';
  document.getElementById('admDiagQ_explanation').value = q.explanation || '';

  const isTest = q.type !== 'self_assessment';
  const optGroup = document.getElementById('admDiagOptionsGroup');
  if (optGroup) optGroup.style.display = isTest ? 'block' : 'none';

  if (isTest && Array.isArray(q.options)) {
    for (let i = 0; i < 4; i++) {
      const inp = document.getElementById('admDiagOpt_' + i);
      if (inp) inp.value = q.options[i] || '';
    }
    const cRadio = document.querySelector(`input[name="admDiagCorrect"][value="${q.correct_index || 0}"]`);
    if (cRadio) cRadio.checked = true;
  }
}
window.editAdminDiagQuestion = editAdminDiagQuestion;

async function deleteAdminDiagQuestion(id) {
  if (!confirm('Вы действительно хотите удалить этот вопрос из диагностики?')) return;
  try {
    await api('/api/admin/diagnostics/questions/' + id, { method: 'DELETE' });
    showToast('Вопрос успешно удален');
    await loadAdminDiagQuestions();
    await loadDynamicDiagnosticQuestions();
  } catch (err) {
    showToast('Ошибка удаления: ' + err.message, true);
  }
}
window.deleteAdminDiagQuestion = deleteAdminDiagQuestion;

async function handleSaveAdminDiagQuestion(e) {
  e.preventDefault();
  const id = document.getElementById('admDiagQ_id').value;
  const type = document.getElementById('admDiagQ_type').value;
  const compIdx = parseInt(document.getElementById('admDiagQ_comp').value, 10) || 0;
  const text = document.getElementById('admDiagQ_text').value.trim();
  const explanation = document.getElementById('admDiagQ_explanation').value.trim();

  if (!text) {
    showToast('Укажите текст вопроса', true);
    return;
  }

  const options = [];
  let correctIndex = 0;
  if (type === 'test') {
    for (let i = 0; i < 4; i++) {
      const optVal = document.getElementById('admDiagOpt_' + i)?.value.trim() || '';
      if (optVal) options.push(optVal);
    }
    if (options.length < 2) {
      showToast('Укажите как минимум 2 варианта ответа для теста', true);
      return;
    }
    const checked = document.querySelector('input[name="admDiagCorrect"]:checked');
    correctIndex = checked ? parseInt(checked.value, 10) : 0;
    if (correctIndex >= options.length) correctIndex = 0;
  }

  const payload = {
    type,
    competency_index: compIdx,
    question_text: text,
    options,
    correct_index: correctIndex,
    explanation
  };

  try {
    showToast('Сохранение вопроса...');
    if (id) {
      await api('/api/admin/diagnostics/questions/' + id, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Вопрос успешно обновлен!');
    } else {
      await api('/api/admin/diagnostics/questions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Новый вопрос добавлен в диагностику!');
    }
    toggleAdminDiagForm(false);
    await loadAdminDiagQuestions();
    await loadDynamicDiagnosticQuestions();
  } catch (err) {
    showToast('Ошибка сохранения: ' + err.message, true);
  }
}

// ── Admin: Participants & Export Registry ──
async function loadAdminUsers() {
  const tbody = document.getElementById('admUsersTableBody');
  if (!tbody) return;

  try {
    const res = await api('/api/admin/users');
    state.adminUsers = (res && res.users) ? res.users : [];
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger);text-align:center;padding:16px">Ошибка загрузки участников: ${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  const searchInp = document.getElementById('admUserSearchInput');
  if (searchInp && !searchInp.dataset.bound) {
    searchInp.dataset.bound = 'true';
    searchInp.oninput = () => renderAdminUsersTable(searchInp.value);
  }

  renderAdminUsersTable();
}

function renderAdminUsersTable(searchQuery = '') {
  const tbody = document.getElementById('admUsersTableBody');
  if (!tbody || !state.adminUsers) return;

  const q = searchQuery.trim().toLowerCase();
  const filtered = state.adminUsers.filter(u => {
    if (!q) return true;
    return (u.fio && u.fio.toLowerCase().includes(q)) ||
           (u.login && u.login.toLowerCase().includes(q)) ||
           (u.workplace && u.workplace.toLowerCase().includes(q)) ||
           (u.position && u.position.toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--ink-muted)">Участников не найдено</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const expLine = `О: ${u.experience_total || 0} / П: ${u.experience_ped || 0} / У: ${u.experience_mgmt || 0} лет`;
    const diagInfo = u.latest_score !== null && u.latest_score !== undefined
      ? `<b>${u.latest_score}%</b> (${escapeHtml(u.deficit_level || 'Пройдено')})<br><small style="color:var(--ink-muted)">попыток: ${u.diag_count || 1}</small>`
      : '<span style="color:var(--ink-muted);font-size:12px">Не проходил</span>';

    const iprInfo = u.ipr_total_count > 0
      ? `Пунктов: <b>${u.ipr_total_count}</b><br><small style="color:var(--success)">Освоено: ${u.ipr_completed_count || 0}</small>`
      : '<span style="color:var(--ink-muted);font-size:12px">0 пунктов</span>';

    return `
      <tr>
        <td>
          <b style="color:var(--ink);display:block;font-size:13.5px">${escapeHtml(u.fio || u.login)}</b>
          <small style="color:var(--ink-muted);display:block">Логин: @${escapeHtml(u.login)} | Роль: ${escapeHtml(u.role_title || u.role)}</small>
          ${u.email ? `<small style="color:var(--accent-blue);display:block">${escapeHtml(u.email)}</small>` : ''}
        </td>
        <td>
          <span style="font-size:12.5px;color:var(--ink);display:block">${escapeHtml(u.workplace || 'Не указана')}</span>
          <small style="color:var(--ink-muted);display:block">${escapeHtml(u.position || '—')}</small>
        </td>
        <td>
          <span style="font-size:12px;white-space:nowrap;font-weight:600;color:var(--navy-deep)">${expLine}</span>
        </td>
        <td>${diagInfo}</td>
        <td>${iprInfo}</td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn sm outline" style="padding:4px 8px;font-size:11px" onclick="exportUserDossier(${u.id}, 'questionnaire')" title="Скачать официальную анкету участника">📋 Анкета</button>
            <button class="btn sm outline" style="padding:4px 8px;font-size:11px" onclick="exportUserDossier(${u.id}, 'ipr')" title="Скачать индивидуальный план развития">🛤️ ИПР</button>
            <button class="btn sm outline" style="padding:4px 8px;font-size:11px" onclick="exportUserDossier(${u.id}, 'diagnostics')" title="Скачать протокол диагностики">📊 Тест</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Admin: Media & Photos Gallery ──
async function loadAdminMedia() {
  const grid = document.getElementById('admMediaGalleryGrid');
  if (!grid) return;

  try {
    const res = await api('/api/media');
    state.adminMedia = (res && res.media) ? res.media : [];
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger)">Ошибка загрузки фото: ${escapeHtml(err.message)}</div>`;
    return;
  }

  const uploadForm = document.getElementById('admUploadMediaForm');
  if (uploadForm && !uploadForm.dataset.bound) {
    uploadForm.dataset.bound = 'true';
    uploadForm.onsubmit = handleUploadAdminMedia;
  }

  renderAdminMediaGallery();
}

function renderAdminMediaGallery() {
  const grid = document.getElementById('admMediaGalleryGrid');
  if (!grid || !state.adminMedia) return;

  if (state.adminMedia.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--ink-muted)">В медиатеке пока нет фотографий</div>';
    return;
  }

  grid.innerHTML = state.adminMedia.map(m => `
    <div class="media-card" style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;background:#fff;display:flex;flex-direction:column">
      <div style="height:120px;background:#f0f2f5;display:flex;align-items:center;justify-content:center;overflow:hidden">
        <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.title)}" style="width:100%;height:100%;object-fit:cover" onerror="this.src='img/photo_iro.jpg'">
      </div>
      <div style="padding:10px 12px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <b style="font-size:12.5px;color:var(--ink);display:block;line-height:1.3;margin-bottom:4px">${escapeHtml(m.title)}</b>
          <span class="badge b-g" style="font-size:10px;padding:2px 6px">${escapeHtml(m.category || 'general')}</span>
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;align-items:center">
          <button class="btn sm outline" style="padding:4px 8px;font-size:11px;flex:1" onclick="copyMediaUrl('${escapeHtml(m.url)}')">📋 Копировать</button>
          <button class="btn sm danger" style="padding:4px 8px;font-size:11px" onclick="deleteAdminMedia(${m.id})">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function copyMediaUrl(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast('Ссылка на фото скопирована в буфер: ' + url));
  } else {
    prompt('Скопируйте ссылку на фото:', url);
  }
}
window.copyMediaUrl = copyMediaUrl;

async function deleteAdminMedia(id) {
  if (!confirm('Вы уверены, что хотите удалить эту фотографию из медиатеки?')) return;
  try {
    await api('/api/admin/media/' + id, { method: 'DELETE' });
    showToast('Фотография удалена');
    loadAdminMedia();
  } catch (err) {
    showToast('Ошибка удаления: ' + err.message, true);
  }
}
window.deleteAdminMedia = deleteAdminMedia;

async function handleUploadAdminMedia(e) {
  e.preventDefault();
  const title = document.getElementById('admNewMediaTitle')?.value.trim();
  const category = document.getElementById('admNewMediaCategory')?.value;
  const fileInput = document.getElementById('admNewMediaFile');
  const urlInput = document.getElementById('admNewMediaUrl')?.value.trim();

  if (!title) {
    showToast('Укажите название фотографии', true);
    return;
  }

  try {
    showToast('Загрузка в медиатеку...');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const fd = new FormData();
      fd.append('image', fileInput.files[0]);
      fd.append('title', title);
      fd.append('category', category);
      await api('/api/admin/media', {
        method: 'POST',
        body: fd
      });
    } else if (urlInput) {
      await api('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({ title, category, url: urlInput })
      });
    } else {
      showToast('Выберите файл или укажите прямую ссылку на фото', true);
      return;
    }

    showToast('Фотография успешно добавлена в медиатеку!');
    document.getElementById('admNewMediaTitle').value = '';
    if (fileInput) fileInput.value = '';
    if (document.getElementById('admNewMediaUrl')) document.getElementById('admNewMediaUrl').value = '';
    loadAdminMedia();
  } catch (err) {
    showToast('Ошибка загрузки: ' + err.message, true);
  }
}

// ── Dynamic Diagnostic Questions Synchronization ──
async function loadDynamicDiagnosticQuestions() {
  try {
    const res = await api('/api/diagnostics/questions');
    if (res && Array.isArray(res.questions) && res.questions.length > 0) {
      TEST_QUESTIONS.length = 0;
      res.questions.forEach(q => TEST_QUESTIONS.push(q));
      shuffleTestOptions(TEST_QUESTIONS);
      renderTest();
    }
    if (res && Array.isArray(res.self_assessment) && res.self_assessment.length > 0) {
      SA_QUESTIONS.length = 0;
      res.self_assessment.forEach(sa => SA_QUESTIONS.push(sa));
      renderSelfAssessment();
    }
  } catch (_) {}
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
            <span class="badge b-i">${escapeHtml(q.category)}</span>
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
    showToast('Вопрос передан экспертам Лиги');
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
    showToast('Ответ опубликован');
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
    showToast('Инициатива опубликована');
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
    renderProgressDelta(diagRes.results);

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
        <line x1="${padLeft}" y1="${padTop + innerH * 0.30}" x2="${W - padRight + 10}" y2="${padTop + innerH * 0.30}"/>
        <line x1="${padLeft}" y1="${padTop + innerH * 0.50}" x2="${W - padRight + 10}" y2="${padTop + innerH * 0.50}"/>
        <line x1="${padLeft}" y1="${padTop + innerH}" x2="${W - padRight + 10}" y2="${padTop + innerH}"/>
      </g>
      <g font-size="9" fill="var(--ink-muted)" text-anchor="end">
        <text x="${padLeft - 6}" y="${padTop + 3}">100%</text>
        <text x="${padLeft - 6}" y="${padTop + innerH * 0.30 + 3}">70%</text>
        <text x="${padLeft - 6}" y="${padTop + innerH * 0.50 + 3}">50%</text>
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
      Данные сравнительного прогресса сохраняются в личном кабинете платформы «Управленческий навигатор Кузбасса».
    </div>
  `;
}

// ── Сравнение результатов «было → стало» ──
function deficitLabel(level) {
  return { low: 'низкий', above_average: 'выше среднего', medium: 'средний', high: 'высокий' }[level] || level || '—';
}

function renderProgressDelta(history) {
  const box = document.getElementById('cabProgressDelta');
  if (!box) return;

  if (!history || history.length < 2) {
    box.innerHTML = `
      <h3 style="margin:0">Динамика результатов</h3>
      <p style="margin:8px 0 0;font-size:13.5px;color:var(--ink-muted)">
        Пройдите диагностику дважды: до и после обучения по ИПР. Здесь появится сравнение результатов.
      </p>
    `;
    return;
  }

  const first = history[0];
  const last = history[history.length - 1];
  const delta = last.score_percent - first.score_percent;
  const deltaClass = delta >= 0 ? 'delta-pos' : 'delta-neg';
  const deltaSign = delta >= 0 ? '+' : '';

  box.innerHTML = `
    <h3 style="margin:0">Динамика результатов</h3>
    <div class="delta-line">
      <span style="font-size:13px;color:var(--ink-muted)">${new Date(first.created_at).toLocaleDateString('ru-RU')} · ${deficitLabel(first.deficit_level)} уровень дефицитов</span>
      <b style="font-size:20px;font-variant-numeric:tabular-nums">${first.score_percent}%</b>
      <span style="color:var(--ink-muted)">→</span>
      <span style="font-size:13px;color:var(--ink-muted)">${new Date(last.created_at).toLocaleDateString('ru-RU')} · ${deficitLabel(last.deficit_level)} уровень дефицитов</span>
      <b style="font-size:20px;font-variant-numeric:tabular-nums">${last.score_percent}%</b>
      <span class="delta-num ${deltaClass}">${deltaSign}${delta} п.п.</span>
    </div>
    <p style="margin:8px 0 0;font-size:13px;color:var(--ink-secondary)">
      ${delta >= 0
        ? 'Уровень дефицитов снизился: освоение модулей ИПР даёт результат. Всего замеров: ' + history.length + '.'
        : 'Результат ниже предыдущего замера. Вернитесь к модулям ИПР, подключите наставника и пройдите диагностику повторно. Всего замеров: ' + history.length + '.'}
    </p>
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
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:6px">Срок: ${escapeHtml(it.deadline || '2027 г.')}</div>
          <button class="btn sm danger" style="margin-top:8px" onclick="deleteIprItem(${it.id})">Удалить</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Конструктор ИПР ──
async function addIprItem(e) {
  e.preventDefault();
  const module = document.getElementById('ipr_module').value.trim();
  const result = document.getElementById('ipr_result').value.trim();
  if (!module || !result) {
    showToast('Укажите модуль и целевой результат', true);
    return;
  }

  const deadline = document.getElementById('ipr_deadline').value;
  try {
    await api('/api/user/ipr', {
      method: 'POST',
      body: JSON.stringify({
        competency: document.getElementById('ipr_competency').value,
        recommended_module: module,
        action_format: document.getElementById('ipr_format').value,
        target_result: result,
        deadline: deadline || null,
        mentor_name: document.getElementById('ipr_mentor').value.trim() || null
      })
    });
    document.getElementById('ipr_module').value = '';
    document.getElementById('ipr_result').value = '';
    document.getElementById('ipr_mentor').value = '';
    document.getElementById('ipr_deadline').value = '';
    showToast('Пункт добавлен в ИПР');
    loadCabinetData();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteIprItem(id) {
  if (!confirm('Удалить этот пункт из индивидуальной программы развития?')) return;
  try {
    await api(`/api/user/ipr/${id}`, { method: 'DELETE' });
    showToast('Пункт ИПР удалён');
    loadCabinetData();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Быстрый переход на вкладку кабинета ──
function gotoCabinetTab(t) {
  const btn = document.querySelector(`#ctabs button[data-t="${t}"]`);
  if (btn) btn.click();
}

async function updateIprStatus(id, newStatus) {
  try {
    await api(`/api/user/ipr/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    showToast('Статус пункта ИПР обновлён');
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
              ${doc.verification_status === 'approved' ? 'Одобрено комиссией' : (doc.verification_status === 'revision' ? 'На доработке' : 'На проверке')}
            </span>
            ${doc.file_path ? `<a href="${escapeHtml(doc.file_path)}${state.sessionToken && state.sessionToken !== 'offline-demo' ? '?token=' + encodeURIComponent(state.sessionToken) : ''}" target="_blank" style="margin-left:10px;font-size:12px;font-weight:600">Скачать файл</a>` : ''}
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
    showToast('Документ добавлен в портфолио');
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
    showToast('Анкета сохранена');
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
  const headerEl = document.querySelector('header.top');
  if (burger) {
    burger.onclick = () => {
      const opened = document.getElementById('nav').classList.toggle('open');
      headerEl?.classList.toggle('menu-open', opened);
    };
  }

  // Тень шапки при прокрутке
  window.addEventListener('scroll', () => {
    headerEl?.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // Плавное появление блоков при прокрутке (в духе scrolltide):
  // каскад внутри одного контейнера, одноразовое срабатывание
  const revealEls = document.querySelectorAll(
    '.card, .stat, .flow .st, .scale-item, .doc-row, .task-pill, .md-node, .micro-item, .quote-box, .mission-box, .note-strip, .schema-box'
  );
  revealEls.forEach(el => {
    el.classList.add('reveal');
    const siblings = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains('reveal')) : [];
    el.style.setProperty('--reveal-delay', Math.min(siblings.indexOf(el) * 70, 420) + 'ms');
  });
  if ('IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealIO.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  initTabs('ctabs', 'ct');
  initTabs('adminTabs', 'at', 'admin-pane');

  renderCompetencies();
  renderSelfAssessment();
  shuffleTestOptions(TEST_QUESTIONS);
  renderTest();
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

  // Конструктор ИПР
  const iprForm = document.getElementById('iprForm');
  if (iprForm) iprForm.onsubmit = addIprItem;

  // Карта: пока виджет грузится — молчим; если картосервис недоступен
  // у посетителя (20 секунд после появления карты на экране), показываем
  // карточку-фолбэк. Если карта догрузится позже — вернётся автоматически.
  const mapFrame = document.getElementById('mapFrame');
  if (mapFrame) {
    const mapEmbed = mapFrame.closest('.map-embed');
    const mapFallback = document.getElementById('mapFallback');
    const showFallback = () => {
      if (mapEmbed) mapEmbed.style.display = 'none';
      if (mapFallback) mapFallback.hidden = false;
    };
    const showMap = () => {
      if (mapFallback) mapFallback.hidden = true;
      if (mapEmbed) mapEmbed.style.display = '';
    };
    let mapLoaded = false;
    mapFrame.addEventListener('load', () => { mapLoaded = true; showMap(); });
    const startMapWatch = () => {
      let tries = 0;
      const mapTimer = setInterval(() => {
        tries += 1;
        if (mapLoaded) { clearInterval(mapTimer); return; }
        if (tries >= 40) { // 40 × 500 мс = 20 с
          clearInterval(mapTimer);
          if (!mapLoaded) showFallback();
        }
      }, 500);
    };
    if ('IntersectionObserver' in window) {
      const mapIO = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          mapIO.disconnect();
          startMapWatch();
        }
      }, { threshold: 0.1 });
      mapIO.observe(mapEmbed);
    } else {
      startMapWatch();
    }
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
      await loginAs(e.target.value, DEMO_PASSWORDS[e.target.value] || 'demo123');
    };
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = logout;

  // Админ-панель: кнопки сохранения и загрузка файлов
  const admSaveAllTopBtn = document.getElementById('admSaveAllTopBtn');
  if (admSaveAllTopBtn) admSaveAllTopBtn.onclick = saveAllAdminContent;

  const admResetBtn = document.getElementById('admResetBtn');
  if (admResetBtn) admResetBtn.onclick = resetAllAdminContent;

  const saveBtns = ['admSaveHomeBtn', 'admSaveAboutBtn', 'admSaveCompBtn', 'admSaveTrajBtn', 'admSaveFutureBtn', 'admSaveHelpBtn', 'admSaveTextsBtn', 'admSaveImagesBtn'];
  saveBtns.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.onclick = saveAllAdminContent;
  });

  setupAdminImageUpload('upload_photo_iro', 'adm_photo_iro', 'prev_photo_iro');
  setupAdminImageUpload('upload_photo_strat_session', 'adm_photo_strat_session', 'prev_photo_strat_session');
  setupAdminImageUpload('upload_photo_ecosistema', 'adm_photo_ecosistema', 'prev_photo_ecosistema');
  setupAdminImageUpload('upload_photo_kniga_direktora', 'adm_photo_kniga_direktora', 'prev_photo_kniga_direktora');

  const admAddDocForm = document.getElementById('admAddDocForm');
  if (admAddDocForm) admAddDocForm.onsubmit = handleAdminAddDocument;

  const btnExportUserIpr = document.getElementById('btnExportUserIpr');
  if (btnExportUserIpr) {
    btnExportUserIpr.onclick = () => exportOfficialIpr();
  }

  await loadDynamicDiagnosticQuestions();
  await initAuth();
  await loadAndApplySiteContent();
  route();
});
