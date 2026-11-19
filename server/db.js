const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Путь к БД можно переопределить окружением — тесты работают во временной папке
const dbPath = process.env.KUZBASS_DB_PATH || path.join(__dirname, '..', 'data', 'kuzbass_edu.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'director', -- director, deputy, reserve, expert, admin
      fio TEXT NOT NULL,
      birth_date TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      citizenship TEXT DEFAULT 'Российская Федерация',
      education_level TEXT,
      institution TEXT,
      workplace TEXT,
      position TEXT,
      experience_total TEXT,
      experience_ped TEXT,
      experience_mgmt TEXT,
      share_experience TEXT,
      consent_pd INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS diagnostic_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- self_assessment, test_20, case, simulation
      score_percent INTEGER NOT NULL,
      deficit_level TEXT NOT NULL, -- low, above_average, medium, high
      summary_text TEXT,
      details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ipr_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      competency TEXT NOT NULL,
      deficit_score INTEGER NOT NULL,
      recommended_module TEXT NOT NULL,
      action_format TEXT NOT NULL,
      target_result TEXT NOT NULL,
      deadline TEXT,
      mentor_name TEXT,
      status TEXT DEFAULT 'planned', -- planned, in_progress, completed
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS portfolio_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL, 
      -- achievements, cases_simulations, results_dynamics, prof_development, expert_mentoring, analytical_reports
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      file_name TEXT,
      verification_status TEXT DEFAULT 'pending', -- pending, approved, revision
      expert_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dialogue_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      author_name TEXT NOT NULL,
      author_role TEXT,
      category TEXT NOT NULL,
      question_text TEXT NOT NULL,
      answer_text TEXT,
      status TEXT DEFAULT 'new', -- new, in_progress, answered
      expert_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answered_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reserve_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      author_name TEXT NOT NULL,
      workplace TEXT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      expected_effect TEXT,
      votes_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published', -- published, approved, in_realization
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS idea_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(idea_id, user_id),
      FOREIGN KEY (idea_id) REFERENCES reserve_ideas(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- 'methodological' or 'normative'
      description TEXT,
      url TEXT,
      file_path TEXT,
      order_num INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrateSchema();
  seedInitialData();
}

// Миграция существующей БД: хеш пароля, таблица сессий, админ-таблицы и учетная запись admin
function migrateSchema() {
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('password_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      url TEXT,
      file_path TEXT,
      order_num INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Убеждаемся, что администратор существует в уже существующей БД
  try {
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    if (userCount > 0) {
      const adminUser = db.prepare('SELECT id FROM users WHERE login = ?').get('admin');
      if (!adminUser) {
        db.prepare(`
          INSERT INTO users (
            login, password, role, fio, birth_date, address, phone, email, 
            education_level, institution, workplace, position,
            experience_total, experience_ped, experience_mgmt, share_experience, consent_pd
          ) VALUES (
            'admin', 'admin123', 'admin', 'Администратор платформы ИРО', '1980-01-01',
            'г. Кемерово, ул. Заузелкова, 3', '+7 (3842) 37-80-33', 'admin@kuz-edu.ru',
            'Высшее', 'ГБОУ ДПО «ИРО Кузбасса»', 'ГБОУ ДПО «ИРО Кузбасса»', 'Администратор платформы',
            '20', '15', '10', 'Администрирование платформы', 1
          )
        `).run();
      }
    }
  } catch (_) {}

  // Заполняем дефолтный контент при отсутствии
  seedSiteContent();
  seedLibraryDocuments();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (userCount > 0) return;

  // Insert standard test accounts
  const insertUser = db.prepare(`
    INSERT INTO users (
      login, password, role, fio, birth_date, address, phone, email, 
      education_level, institution, workplace, position,
      experience_total, experience_ped, experience_mgmt, share_experience, consent_pd
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertUser.run(
    'director',
    'demo123',
    'director',
    'Иванова Анна Андреевна',
    '1983-05-14',
    'г. Кемерово, пр. Ленина, 82',
    '+7 (905) 912-34-56',
    'ivanova@kuz-edu.ru',
    'Высшее (специалитет)',
    'Кемеровский государственный университет (КемГУ)',
    'МБОУ «СОШ № 1 г. Кемерово»',
    'Директор',
    '19',
    '15',
    '7',
    'Проектное управление, развитие кадрового резерва школы, внедрение ВСОКО',
    1
  );

  insertUser.run(
    'deputy',
    'demo123',
    'deputy',
    'Смирнов Михаил Васильевич',
    '1989-11-22',
    'г. Новокузнецк, ул. Кирова, 45',
    '+7 (903) 845-67-89',
    'smirnov@kuz-edu.ru',
    'Высшее (магистратура)',
    'Кузбасский гуманитарно-педагогический институт',
    'МБОУ «Лицей № 84 им. В. А. Власова»',
    'Заместитель директора по УВР',
    '14',
    '14',
    '4',
    'Аналитика образовательных результатов, организация ВСОКО, наставничество молодых педагогов',
    1
  );

  insertUser.run(
    'reserve',
    'demo123',
    'reserve',
    'Кузнецова Екатерина Павловна',
    '1994-08-30',
    'г. Прокопьевск, ул. Гагарина, 12',
    '+7 (908) 543-21-00',
    'kuznetsova@kuz-edu.ru',
    'Высшее (бакалавриат)',
    'КемГУ, педагогический факультет',
    'МБОУ «ООШ № 12 г. Прокопьевска»',
    'Учитель физики, руководитель ШМО',
    '9',
    '9',
    '2',
    'Цифровые инструменты в управлении ОО, проектная деятельность учащихся',
    1
  );

  insertUser.run(
    'expert',
    'expert123',
    'expert',
    'Вербицкая Ирина Валерьевна',
    '1976-03-18',
    'г. Кемерово, ул. Заузелкова, 3',
    '+7 (3842) 37-80-33',
    'ouk@kuz-edu.ru',
    'Высшее (аспирантура, к.п.н.)',
    'ГБОУ ДПО «ИРО Кузбасса»',
    'ИРО Кузбасса',
    'Заведующий отделом подготовки управленческих кадров, эксперт Лиги',
    '26',
    '24',
    '15',
    'Моделирование образовательных систем, аудит управленческих практик, парное управление',
    1
  );

  insertUser.run(
    'admin',
    'admin123',
    'admin',
    'Администратор платформы ИРО',
    '1980-01-01',
    'г. Кемерово, ул. Заузелкова, 3',
    '+7 (3842) 37-80-33',
    'admin@kuz-edu.ru',
    'Высшее',
    'ГБОУ ДПО «ИРО Кузбасса»',
    'ГБОУ ДПО «ИРО Кузбасса»',
    'Администратор платформы',
    '20',
    '15',
    '10',
    'Администрирование и методическое сопровождение платформы',
    1
  );

  // Insert seed historical diagnostics for director (user_id = 1)
  const insertDiag = db.prepare(`
    INSERT INTO diagnostic_results (user_id, type, score_percent, deficit_level, summary_text, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertDiag.run(
    1,
    'self_assessment',
    48,
    'high',
    'Высокий уровень дефицитов при первичном входе в проект. Требуется интенсивное наставничество.',
    JSON.stringify({ scores: [2, 1, 2, 2, 2] }),
    '2026-01-21 10:15:00'
  );

  insertDiag.run(
    1,
    'test_20',
    61,
    'medium',
    'Средний уровень дефицитов. Заметный рост по направлению стратегического управления.',
    JSON.stringify({ scores: [3, 2, 2, 3, 2] }),
    '2026-04-15 14:30:00'
  );

  insertDiag.run(
    1,
    'self_assessment',
    74,
    'above_average',
    'Выше среднего уровня. Успешное освоение модулей по ФХД и управлению персоналом.',
    JSON.stringify({ scores: [4, 3, 3, 3, 2] }),
    '2026-09-03 16:45:00'
  );

  // Seed sample IPR items for user_id = 1
  const insertIpr = db.prepare(`
    INSERT INTO ipr_items (user_id, competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIpr.run(
    1,
    'Стратегическое управление',
    35,
    'Модуль ДПО «Стратегическое управление и проектная деятельность» (72 ч)',
    'Стратегическая лаборатория + онлайн-курс',
    'Проект обновленной программы развития школы на 2027–2030 гг.',
    '2026-12-15',
    'Забнева Э. И., д-р филос. наук',
    'in_progress'
  );

  insertIpr.run(
    1,
    'Финансово-хозяйственная деятельность',
    40,
    'Практикум «План ФХД и закупки по 44-ФЗ для первого руководителя»',
    'Стажировка на опорной площадке № 4 г. Кемерово',
    'Оптимизированный план закупок и привлечение гранта',
    '2027-02-28',
    'Скрипак Е. И., канд. экон. наук',
    'planned'
  );

  insertIpr.run(
    1,
    'Коммуникации',
    50,
    'Симуляционный тренажер «Кризис в родительском чате»',
    'Индивидуальный симулятор + супервизия',
    'Регламент реагирования на информационные инциденты ОО',
    '2026-11-30',
    'Вербицкая И. В.',
    'in_progress'
  );

  // Seed portfolio items for user_id = 1
  const insertPort = db.prepare(`
    INSERT INTO portfolio_items (user_id, category, title, description, file_name, verification_status, expert_comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPort.run(
    1,
    'achievements',
    'Программа развития МБОУ «СОШ № 1» до 2029 года',
    'Утверждена решением педагогического совета, согласована Управляющим советом. Прошла региональную экспертизу.',
    'programma_razvitiya_2029.pdf',
    'approved',
    'Высокая оценка экспертной комиссии. Рекомендовано в банк лучших практик Кузбасса.'
  );

  insertPort.run(
    1,
    'cases_simulations',
    'Решение управленческого кейса «Ремонт до отопительного сезона»',
    'Разработан альтернативный план перераспределения средств ФХД без срыва учебного процесса.',
    'case_remont_solution.docx',
    'approved',
    'Грамотное правовое обоснование по 44-ФЗ.'
  );

  insertPort.run(
    1,
    'results_dynamics',
    'Аналитическая справка: динамика успеваемости и результатов ГИА за 3 года',
    'Рост доли выпускников, сдавших ЕГЭ на 80+ баллов, на 18%. Снижение академической неуспеваемости до 0.4%.',
    'dinamika_gia_2023_2026.xlsx',
    'approved',
    'Подтверждено данными региональной информационной системы мониторинга.'
  );

  // Seed Dialogue Questions
  const insertQ = db.prepare(`
    INSERT INTO dialogue_questions (user_id, author_name, author_role, category, question_text, answer_text, status, expert_name, created_at, answered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQ.run(
    null,
    'Ковалёва Марина Сергеевна',
    'директор МБОУ «ООШ № 12», Прокопьевский МО',
    'Управление персоналом',
    'Какие инструменты использовать для анализа мотивации педагогической команды в сельской малокомплектной школе при дефиците молодых специалистов?',
    'Рекомендуем использовать модифицированную методику мотивационного профиля Ричи-Мартина, адаптированную кафедрой менеджмента ИРО Кузбасса, а также внедрить технологию распределенного лидерства через проектные микрогруппы. Методические материалы направлены в личный кабинет.',
    'answered',
    'Вербицкая И. В., зав. отделом подготовки кадров ИРО Кузбасса',
    '2026-10-12 11:20:00',
    '2026-10-14 15:40:00'
  );

  insertQ.run(
    null,
    'Терентьев Олег Игоревич',
    'заместитель директора, г. Новокузнецк',
    'Стратегическое управление',
    'Как грамотно выстроить стратегию развития школы при прогнозируемом снижении контингента обучающихся на 15% за три года из-за демографических факторов?',
    'Ключевой сценарий — перепрофилирование высвобождающихся пространств под раннюю профилизацию, сетевое взаимодействие с СПО и расширение платных образовательных услуг дополнительного образования. Подробный разбор кейса будет на форуме «Управленческий компас».',
    'answered',
    'Забнева Э. И., ректор ИРО Кузбасса',
    '2026-10-25 09:10:00',
    '2026-10-26 18:00:00'
  );

  insertQ.run(
    1,
    'Иванова Анна Андреевна',
    'директор МБОУ «СОШ № 1»',
    'Финансово-хозяйственная деятельность',
    'Каков правовой алгоритм перераспределения экономии по результатам торгов по 44-ФЗ на стимулирующие выплаты учителям?',
    null,
    'new',
    null,
    '2026-11-15 16:30:00',
    null
  );

  // Seed Reserve Ideas
  const insertIdea = db.prepare(`
    INSERT INTO reserve_ideas (user_id, author_name, workplace, title, category, description, expected_effect, votes_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIdea.run(
    3,
    'Кузнецова Екатерина Павловна',
    'МБОУ «ООШ № 12 г. Прокопьевска»',
    'Единый цифровой ассистент молодого руководителя «Старт-Директор»',
    'Цифровизация',
    'Чат-бот и мобильный чек-лист с пошаговыми инструкциями на первые 100 дней в должности руководителя: от передачи дел и инвентаризации до первой встречи с учредителем.',
    'Сокращение стрессового периода адаптации на 60%, предотвращение базовых процедурных ошибок по ФХД.',
    28
  );

  insertIdea.run(
    2,
    'Смирнов Михаил Васильевич',
    'МБОУ «Лицей № 84 г. Новокузнецка»',
    'Межшкольный обмен управленческими практиками «Теневой директор»',
    'Наставничество',
    'Программа стажировок, при которой кандидат в резерв проводит 3 рабочих дня в качестве дублера директора успешной школы другой территории региона.',
    'Погружение в реальный операционный контекст, развитие неявных управленческих навыков.',
    42
  );
}

const DEFAULT_SITE_CONTENT = [
  // Главная страница (home)
  { key: 'hero_title', value: '«Управленческий навигатор Кузбасса»', desc: 'Главный заголовок платформы', cat: 'home' },
  { key: 'hero_subtitle', value: 'Региональная модель опережающей подготовки и непрерывного развития управленческих кадров системы образования в условиях демографических и социокультурных вызовов (на примере Кемеровской области — Кузбасса)', desc: 'Подзаголовок на баннере главной страницы', cat: 'home' },
  { key: 'hero_inst', value: 'ГБОУ ДПО «Институт развития образования Кузбасса»', desc: 'Название института в шапке баннера', cat: 'home' },
  { key: 'mission_text', value: 'создать условия для осознанного профессионального роста руководителей, формирования сильного кадрового резерва и совместного поиска инновационных решений, направленных на повышение качества, эффективности и конкурентоспособности образования Кузбасса.', desc: 'Текст миссии региональной модели', cat: 'home' },
  { key: 'quote_text', value: '«Жизнь — это бесконечный труд, который служит твоему успеху, а вкус успеха дороже всего.»', desc: 'Цитата на главной странице', cat: 'home' },
  { key: 'quote_author', value: 'Рудольф Нуриев', desc: 'Автор цитаты', cat: 'home' },
  { key: 'stat_val_1', value: '31', desc: 'Цифра 1 статистики', cat: 'home' },
  { key: 'stat_lbl_1', value: 'опорная площадка во всех муниципалитетах региона', desc: 'Подпись 1 статистики', cat: 'home' },
  { key: 'stat_val_2', value: '68 / 27', desc: 'Цифра 2 статистики', cat: 'home' },
  { key: 'stat_lbl_2', value: 'экспертов и наставников Лиги из 27 территорий', desc: 'Подпись 2 статистики', cat: 'home' },
  { key: 'stat_val_3', value: '5', desc: 'Цифра 3 статистики', cat: 'home' },
  { key: 'stat_lbl_3', value: 'ключевых управленческих компетенций', desc: 'Подпись 3 статистики', cat: 'home' },
  { key: 'stat_val_4', value: '2030', desc: 'Цифра 4 статистики', cat: 'home' },
  { key: 'stat_lbl_4', value: 'горизонт опережающей подготовки кадров', desc: 'Подпись 4 статистики', cat: 'home' },

  // О проекте (about)
  { key: 'about_title', value: 'Как работает региональная модель', desc: 'Заголовок на странице «О проекте»', cat: 'about' },
  { key: 'about_lead', value: 'Научно обоснованная система сопровождения управленца в сфере образования на всех этапах его карьеры: от прогноза кадровой потребности и диагностики до портфолио-аттестации и непрерывного развития.', desc: 'Вводный текст раздела «О проекте»', cat: 'about' },
  { key: 'about_goal', value: 'разработка, научное обоснование, апробация и тиражирование региональной модели опережающей подготовки и непрерывного профессионального развития управленческих кадров системы образования, обеспечивающей преодоление демографических и социокультурных вызовов.', desc: 'Цель региональной модели', cat: 'about' },
  { key: 'about_tasks', value: '01. Теоретико-методологические основания предиктивной диагностики дефицитов\n02. Стандартизированный инструментарий по 5 направлениям компетенций\n03. Научные принципы перехода к портфолио-оценке результатов\n04. Модульные ДПП ПК с кейсами и симуляционными заданиями\n05. Региональная система аттестации на основе портфолио\n06. Сеть ресурсных центров управленческих практик в муниципалитетах\n07. Цифровая платформа «Управленческий навигатор Кузбасса»\n08. Сборник и пакет нормативных документов для тиражирования в субъектах РФ', desc: 'Задачи модели', cat: 'about' },
  { key: 'about_uniqueness', value: 'Экосистемный подход (непрерывное развитие от резерва до аттестации); Персонализация под дефициты каждого руководителя; Практико-ориентированность (знания сразу применяются в ОО); Профессиональное сообщество и Лига наставников; Доказательное управление на основе объективных диагностических данных.', desc: 'Уникальность проекта', cat: 'about' },
  { key: 'about_results_2030', value: '• 20 % управленцев ежегодно проходят комплексную оценку\n• Индивидуальные программы развития (ИПР) для каждого участника\n• Муниципальные площадки для обмена опытом (онлайн и офлайн)\n• Банк лучших управленческих практик Кузбасса\n• Снижение профессиональных дефицитов на 40–50 %\n• Увеличение доли молодых руководителей до 10 %\n• Профессиональное сообщество лидеров образования', desc: 'Ожидаемые результаты к 2030 году', cat: 'about' },

  // Контакты
  { key: 'contacts_phone', value: '8 (3842) 37-80-33', desc: 'Телефон проектного офиса', cat: 'contacts' },
  { key: 'contacts_email', value: 'fip@kuz-edu.ru', desc: 'Email проектного офиса', cat: 'contacts' },
  { key: 'contacts_address', value: 'г. Кемерово, ул. Заузелкова, д. 3', desc: 'Адрес института', cat: 'contacts' },
  { key: 'contacts_workhours', value: 'Понедельник — Пятница: 8:30 — 17:00', desc: 'Режим работы', cat: 'contacts' },

  // Ключевые компетенции (5 направлений)
  { key: 'comp_01_title', value: 'Стратегическое управление', desc: 'Название компетенции 1', cat: 'comp' },
  { key: 'comp_01_desc', value: 'Определение миссии, видения и целей развития образовательной организации с учётом демографических и социально-экономических условий региона.', desc: 'Описание компетенции 1', cat: 'comp' },
  { key: 'comp_01_quote', value: '«Я умею формулировать стратегические цели школы на основе анализа данных ВСОКО и потребностей региона»', desc: 'Цитата самооценки 1', cat: 'comp' },

  { key: 'comp_02_title', value: 'Управление ресурсами и ФХД', desc: 'Название компетенции 2', cat: 'comp' },
  { key: 'comp_02_desc', value: 'Формирование и исполнение бюджета ОО, привлечение внебюджетных средств, эффективное использование материально-технической базы.', desc: 'Описание компетенции 2', cat: 'comp' },
  { key: 'comp_02_quote', value: '«Я свободно ориентируюсь в плане ФХД, механизмах подушевого финансирования и грантовой поддержке»', desc: 'Цитата самооценки 2', cat: 'comp' },

  { key: 'comp_03_title', value: 'Управление персоналом', desc: 'Название компетенции 3', cat: 'comp' },
  { key: 'comp_03_desc', value: 'Формирование кадровой политики, адресное устранение дефицитов педагогов, профилактика эмоционального выгорания, развитие наставничества.', desc: 'Описание компетенции 3', cat: 'comp' },
  { key: 'comp_03_quote', value: '«Я выстраиваю индивидуальные маршруты развития для педагогов и эффективно делегирую полномочия»', desc: 'Цитата самооценки 3', cat: 'comp' },

  { key: 'comp_04_title', value: 'Управление качеством образования', desc: 'Название компетенции 4', cat: 'comp' },
  { key: 'comp_04_desc', value: 'Функционирование ВСОКО, объективность оценивания, адресная помощь школам с низкими образовательными результатами (ШНОР).', desc: 'Описание компетенции 4', cat: 'comp' },
  { key: 'comp_04_quote', value: '«Я принимаю управленческие решения на основе доказательных данных ВСОКО, ГИА и мониторингов»', desc: 'Цитата самооценки 4', cat: 'comp' },

  { key: 'comp_05_title', value: 'Коммуникации и партнёрство', desc: 'Название компетенции 5', cat: 'comp' },
  { key: 'comp_05_desc', value: 'Взаимодействие с родителями, социальными партнёрами, СМИ и общественностью, антикризисный PR и позиционирование ОО в медиасреде.', desc: 'Описание компетенции 5', cat: 'comp' },
  { key: 'comp_05_quote', value: '«Я умею конструктивно разрешать конфликтные ситуации и выстраивать доверительный диалог с родительским сообществом»', desc: 'Цитата самооценки 5', cat: 'comp' },

  // Образовательная траектория (traj)
  { key: 'traj_lead', value: 'Обучение строится под конкретные запросы руководителя: проектное управление, ВСОКО, развитие малокомплектной школы и другие темы собираются в персональный маршрут из четырёх форматов.', desc: 'Вводный текст траектории', cat: 'traj' },
  { key: 'traj_card_dpo', value: 'Четыре модульные программы ДПО (120 / 72 / 36 часов): стратегическое управление и проектная деятельность, финансово-хозяйственная деятельность, управление персоналом и командообразование, управление качеством образования, коммуникации. Личностно-ориентированный подход с учётом оценки портфолио.', desc: 'Карточка ДПП ПК', cat: 'traj' },
  { key: 'traj_card_online', value: 'Короткие прикладные курсы под специфические дефициты компетенций, выявленные диагностикой, — без отрыва от работы, с немедленным применением результата. Доступны из личного кабинета, а решённые задания становятся вкладом в портфолио.', desc: 'Карточка «Онлайн»', cat: 'traj' },
  { key: 'traj_card_events', value: 'Ежегодный форум «Управленческий компас» на площадках муниципалитетов, интенсивы, круглые столы, вебинары (не реже 1 раза в квартал): лидерские компетенции, карьерное планирование, ФХД, управление изменениями, наставничество.', desc: 'Карточка мероприятий', cat: 'traj' },
  { key: 'traj_card_labs', value: 'Ресурсные центры управленческих практик в муниципальных образованиях: стажировочные сессии (не менее 2 в квартал), обмен практиками, виртуальные стажировочные площадки лучших школ региона. Работают 5 лабораторий по направлениям компетенций.', desc: 'Карточка 31 опорной площадки', cat: 'traj' },

  // Кадровый резерв (future / КУЗБАСС.БУДУЩЕЕ.РФ)
  { key: 'future_lead', value: 'Онлайн-ресурс и проект по формированию, сопровождению, подготовке и использованию кадрового резерва системы образования Кемеровской области — Кузбасса с учётом проектов и конкурсов АНО «Россия — страна возможностей». Площадка для сбора, запуска и продвижения идей и проектов кандидатов в муниципальный и региональный кадровый резерв.', desc: 'Вводный текст кадрового резерва', cat: 'future' },
  { key: 'future_stat_1_val', value: '4', desc: 'Резерв: цифра 1', cat: 'future' },
  { key: 'future_stat_1_lbl', value: 'отбора кандидатов в кадровый резерв проведено', desc: 'Резерв: подпись 1', cat: 'future' },
  { key: 'future_stat_2_val', value: '267', desc: 'Резерв: цифра 2', cat: 'future' },
  { key: 'future_stat_2_lbl', value: 'анкет подано на предварительный отбор', desc: 'Резерв: подпись 2', cat: 'future' },
  { key: 'future_stat_3_val', value: '94 %', desc: 'Резерв: цифра 3', cat: 'future' },
  { key: 'future_stat_3_lbl', value: 'кандидатов прошли диагностическое тестирование (251 чел.)', desc: 'Резерв: подпись 3', cat: 'future' },
  { key: 'future_stat_4_val', value: '68 / 27', desc: 'Резерв: цифра 4', cat: 'future' },
  { key: 'future_stat_4_lbl', value: 'экспертов и наставников Лиги / территорий региона', desc: 'Резерв: подпись 4', cat: 'future' },
  { key: 'future_lvl_1', value: 'Уровень 1 · Отбор и диагностика: предиктивное тестирование, индивидуальные рекомендации по компетенциям', desc: 'Уровень 1 модели резерва', cat: 'future' },
  { key: 'future_lvl_2', value: 'Уровень 2 · Подготовка: модульные курсы, ИПР, переподготовка, самообразование, работа с наставником', desc: 'Уровень 2 модели резерва', cat: 'future' },
  { key: 'future_lvl_3', value: 'Уровень 3 · Сопровождение в должности: технология «парного управления», опорные площадки, сообщество', desc: 'Уровень 3 модели резерва', cat: 'future' },

  // В помощь руководителю (help)
  { key: 'help_lead', value: 'Актуальные нормативные документы, методические рекомендации и банк эффективных управленческих практик для руководителей образовательных организаций Кузбасса.', desc: 'Вводный текст раздела руководителя', cat: 'help' },
  { key: 'help_update_1_text', value: 'Новый Порядок организации и осуществления образовательной деятельности по дополнительным профессиональным программам (приказ Минобрнауки России от 24.03.2025 № 266): требования к структуре программ ПК и переподготовки.', desc: 'Законодательство: 1 сентября 2025', cat: 'help' },
  { key: 'help_update_2_text', value: 'ФГОС СОО утверждён приказом Минпросвещения России от 24.02.2025 № 138; профстандарт «Руководитель профессиональной образовательной организации» — приказ Минтруда России от 21.03.2025 № 137н; изменения ФГОС НОО/ООО применяются с 01.09.2025.', desc: 'Законодательство: 2025 стандарты', cat: 'help' },
  { key: 'help_update_3_text', value: 'Закон Кемеровской области от 05.07.2013 № 86-ОЗ «Об образовании» действует в редакции от 1 июля 2026 г.; ФЗ № 273-ФЗ и кодексы применяются в редакциях 2026 г.', desc: 'Законодательство: 2026 регион', cat: 'help' },

  // Фотографии
  { key: 'photo_iro', value: 'img/photo_iro.jpg', desc: 'Здание ИРО Кузбасса', cat: 'images' },
  { key: 'photo_strat_session', value: 'img/photo_strat_session.jpeg', desc: 'Стратегическая сессия', cat: 'images' },
  { key: 'photo_ecosistema', value: 'img/photo_ecosistema.jpg', desc: 'Образовательная экосистема', cat: 'images' },
  { key: 'photo_kniga_direktora', value: 'img/photo_kniga_direktora.png', desc: 'Книга руководителя', cat: 'images' }
];

function seedSiteContent() {
  const insert = db.prepare('INSERT OR IGNORE INTO site_content (key, value, description, category) VALUES (?, ?, ?, ?)');
  for (const item of DEFAULT_SITE_CONTENT) {
    insert.run(item.key, item.value, item.desc, item.cat);
  }
}

function resetSiteContentToDefaults() {
  const upsert = db.prepare(`
    INSERT INTO site_content (key, value, description, category, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = excluded.description, category = excluded.category, updated_at = CURRENT_TIMESTAMP
  `);
  for (const item of DEFAULT_SITE_CONTENT) {
    upsert.run(item.key, item.value, item.desc, item.cat);
  }
  const rows = db.prepare('SELECT key, value, description, category FROM site_content').all();
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });
  return content;
}

function seedLibraryDocuments() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM library_documents').get().cnt;
  if (count > 0) return;

  const insert = db.prepare('INSERT INTO library_documents (title, category, description, url, order_num) VALUES (?, ?, ?, ?, ?)');

  // Методические материалы
  insert.run('Методический сборник «Управленческий навигатор Кузбасса»', 'methodological', 'Итоговый сборник модели: методики, разборы кейсов, рабочие листы руководителя', 'https://kuz-edu.ru', 1);
  insert.run('Банк управленческих кейсов и симуляционных заданий (200+)', 'methodological', 'Реальные ситуации по пяти направлениям: стратегия, ФХД, персонал, качество, коммуникации', 'https://kuz-edu.ru', 2);
  insert.run('Банк лучших управленческих практик Кузбасса', 'methodological', 'Готовые управленческие решения с возможностью адаптации под свою организацию', 'https://kuz-edu.ru', 3);
  insert.run('Методические рекомендации по формированию управленческого портфолио', 'methodological', 'Алгоритм сбора данных, критерии и показатели оценки, подготовка к портфолио-аттестации', 'https://kuz-edu.ru', 4);

  // Нормативная база
  insert.run('Федеральный закон «Об образовании в РФ» № 273-ФЗ', 'normative', 'Базовый законодательный акт в образовании с актуальными изменениями 2026 года', 'http://pravo.gov.ru/proxy/ips/?docbody=&nd=102162745', 5);
  insert.run('Закон Кемеровской области — Кузбасса от 05.07.2013 № 86-ОЗ', 'normative', 'Закон «Об образовании» в редакции от 1 июля 2026 г.', 'https://kuz-edu.ru', 6);
  insert.run('Приказ Минпросвещения России от 24.02.2025 № 138 (ФГОС СОО)', 'normative', 'Федеральный государственный образовательный стандарт среднего общего образования', 'http://publication.pravo.gov.ru/', 7);
  insert.run('Приказ Минтруда России от 21.03.2025 № 137н', 'normative', 'Профстандарт «Руководитель профессиональной образовательной организации»', 'http://publication.pravo.gov.ru/', 8);
  insert.run('Приказ Минобрнауки России от 24.03.2025 № 266 (Порядок ДПП)', 'normative', 'Новый порядок организации программ ДПО, вступил в силу с 01.09.2025', 'http://publication.pravo.gov.ru/', 9);
}

initSchema();

module.exports = {
  db,
  initSchema,
  resetSiteContentToDefaults
};
