const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, '..', 'data', 'kuzbass_edu.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode
db.exec('PRAGMA foreign_keys = ON;');

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
  `);

  seedInitialData();
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
    '+7 (3842) 56-69-86',
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

initSchema();

module.exports = {
  db,
  initSchema
};
