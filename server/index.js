const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const { db, resetSiteContentToDefaults } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Каталог загрузок переопределяется окружением — тесты не трогают данные продакшена
const uploadDir = process.env.KUZBASS_UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// ── Password hashing (scrypt; поддержана миграция с старых открыых паролей) ──
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  if (stored === undefined || stored === null) return false;
  if (stored.startsWith('scrypt:')) {
    const [, salt, hash] = stored.split(':');
    const expected = Buffer.from(hash, 'hex');
    const check = crypto.scryptSync(String(pw), salt, 64, { length: expected.length });
    return expected.length > 0 && crypto.timingSafeEqual(check, expected);
  }
  // Legacy: открытый пароль из демо-БД — сверяем и повышаем до хеша при входе
  return stored === pw;
}

// ── Upload middleware: только документы портфолио ──
const ALLOWED_UPLOAD_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_UPLOAD_EXT.includes(ext)) {
      return cb(new Error('Допустимые форматы файла: PDF, DOC, DOCX, XLS, XLSX'));
    }
    cb(null, true);
  }
});

// Загрузка изображений для админ-панели
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const imgDir = path.join(uploadDir, 'images');
    fs.mkdirSync(imgDir, { recursive: true });
    cb(null, imgDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
      return cb(new Error('Допустимы только форматы изображений: JPG, PNG, WEBP, SVG'));
    }
    cb(null, true);
  }
});

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Auth helpers: сессии по токену вместо доверия заголовку x-user-id ──
function getToken(req) {
  return req.headers['x-auth-token'] ||
    String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
    req.query.token ||
    null;
}

function getUser(req) {
  const token = getToken(req);
  if (!token) return null;
  return db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?
  `).get(token) || null;
}

function requireAuth(req, res) {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ error: 'Не авторизован' });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Требуются права администратора' });
    return null;
  }
  return user;
}

// Простая защита от перебора паролей (в памяти процесса)
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const rec = loginAttempts.get(key) || { count: 0, start: now };
  if (now - rec.start > 5 * 60 * 1000) { rec.count = 0; rec.start = now; }
  rec.count += 1;
  loginAttempts.set(key, rec);
  if (rec.count > 20) {
    return res.status(429).json({ error: 'Слишком много попыток входа. Подождите несколько минут.' });
  }
  next();
}

// ── Auth API ──
app.post('/api/auth/login', loginRateLimit, (req, res) => {
  const login = String(req.body.login || '').trim();
  const password = req.body.password === undefined || req.body.password === null ? '' : String(req.body.password);
  if (!login) {
    return res.status(400).json({ error: 'Укажите логин' });
  }
  if (login.length > 64 || password.length > 128) {
    return res.status(400).json({ error: 'Слишком длинный логин или пароль' });
  }

  let user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);

  if (!user) {
    // Демо-режим: произвольный новый логин мгновенно получает чистый кабинет
    const info = db.prepare(`
      INSERT INTO users (login, password, password_hash, role, fio, workplace, position, consent_pd)
      VALUES (?, '', ?, 'director', ?, 'Образовательная организация Кузбасса', 'Руководитель', 1)
    `).run(login, hashPassword(password || 'demo123'), login);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } else {
    const ok = user.password_hash
      ? verifyPassword(password, user.password_hash)
      : verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }
    // Повышаем legacy-пароль до scrypt-хеша
    if (!user.password_hash) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  const { password: _, password_hash: __, ...safeUser } = user;
  res.json({ success: true, user: safeUser, token });
});

app.post('/api/auth/register', (req, res) => {
  const { login, password, fio, role, workplace, position, phone, email } = req.body;
  if (!login || !fio) {
    return res.status(400).json({ error: 'Логин и ФИО обязательны' });
  }
  const ALLOWED_ROLES = ['director', 'deputy', 'reserve'];

  try {
    const info = db.prepare(`
      INSERT INTO users (login, password, password_hash, role, fio, workplace, position, phone, email, consent_pd)
      VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      String(login).trim(),
      hashPassword(password || 'demo123'),
      ALLOWED_ROLES.includes(role) ? role : 'director',
      String(fio).trim(),
      workplace || 'МБОУ «СОШ»',
      position || 'Руководитель',
      phone || '',
      email || ''
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
    const { password: _, password_hash: __, ...safeUser } = user;
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { password: _, password_hash: __, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ success: true });
});

// ── Static frontend files (после определения getUser) ──
app.use(express.static(path.join(__dirname, '..', 'public')));

// Загруженные документы портфолио — только для авторизованных пользователей;
// публичные изображения сайта (/uploads/images/...) доступны всем посетителям
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/images/')) {
    return next();
  }
  if (!getUser(req)) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  next();
}, express.static(uploadDir));

// ── Profile API ──
// node:sqlite не принимает undefined — нормализуем отсутствующие поля в NULL
const nn = v => (v === undefined ? null : v);

app.put('/api/user/profile', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const {
    fio, birth_date, address, phone, email, citizenship,
    education_level, institution, workplace, position,
    experience_total, experience_ped, experience_mgmt,
    share_experience, consent_pd
  } = req.body;

  db.prepare(`
    UPDATE users SET
      fio = COALESCE(?, fio),
      birth_date = COALESCE(?, birth_date),
      address = COALESCE(?, address),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      citizenship = COALESCE(?, citizenship),
      education_level = COALESCE(?, education_level),
      institution = COALESCE(?, institution),
      workplace = COALESCE(?, workplace),
      position = COALESCE(?, position),
      experience_total = COALESCE(?, experience_total),
      experience_ped = COALESCE(?, experience_ped),
      experience_mgmt = COALESCE(?, experience_mgmt),
      share_experience = COALESCE(?, share_experience),
      consent_pd = COALESCE(?, consent_pd)
    WHERE id = ?
  `).run(
    nn(fio), nn(birth_date), nn(address), nn(phone), nn(email), nn(citizenship),
    nn(education_level), nn(institution), nn(workplace), nn(position),
    nn(experience_total), nn(experience_ped), nn(experience_mgmt),
    nn(share_experience), consent_pd !== undefined ? (consent_pd ? 1 : 0) : null,
    user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const { password: _, password_hash: __, ...safeUser } = updated;
  res.json({ success: true, user: safeUser });
});

// ── Diagnostics API ──
app.get('/api/user/diagnostics', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const results = db.prepare(`
    SELECT * FROM diagnostic_results
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(user.id);

  res.json({ results });
});

const DEFICIT_LEVELS = ['low', 'above_average', 'medium', 'high'];

app.post('/api/user/diagnostics', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { type, score_percent, deficit_level, summary_text, details } = req.body;
  const score = Number(score_percent);
  if (!type || !Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Некорректные данные диагностики' });
  }

  const info = db.prepare(`
    INSERT INTO diagnostic_results (user_id, type, score_percent, deficit_level, summary_text, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    String(type).slice(0, 64),
    Math.round(score),
    DEFICIT_LEVELS.includes(deficit_level) ? deficit_level : 'medium',
    String(summary_text || '').slice(0, 500),
    details ? JSON.stringify(details).slice(0, 20000) : null
  );

  // Если в деталях есть баллы по 5 компетенциям — автогенерация ИПР по дефицитам
  if (details && Array.isArray(details.competencyScores)) {
    const COMP_MODULES = [
      { name: 'Стратегическое управление', module: 'Модуль ДПО «Стратегическое управление и проектная деятельность» (72 ч)', format: 'Стратегическая лаборатория + онлайн-курс', result: 'Проект программы развития ОО' },
      { name: 'Финансово-хозяйственная деятельность', module: 'Практикум «План ФХД и закупки по 44-ФЗ для первого руководителя»', format: 'Финансовая лаборатория опорной площадки', result: 'Оптимизированный план ФХД' },
      { name: 'Управление персоналом', module: 'Модуль «Управление персоналом и командообразование» (36 ч)', format: 'Кадровая лаборатория + парное управление', result: 'Программа наставничества педагогического коллектива' },
      { name: 'Управление качеством образования', module: 'Модуль «Управление качеством образования и ВСОКО» (72 ч)', format: 'Лаборатория качества + аналитический практикум', result: 'Положение и инструментарий ВСОКО' },
      { name: 'Коммуникации', module: 'Модуль «Коммуникации и работа с общественностью» (36 ч)', format: 'Симулятор «Кризис в родительском чате»', result: 'Медиаплан и регламент кризисных коммуникаций ОО' }
    ];

    details.competencyScores.slice(0, 5).forEach((scoreVal, index) => {
      const s = Number(scoreVal);
      if (Number.isFinite(s) && s <= 2 && COMP_MODULES[index]) {
        const item = COMP_MODULES[index];
        const existing = db.prepare('SELECT id FROM ipr_items WHERE user_id = ? AND competency = ?').get(user.id, item.name);
        if (!existing) {
          db.prepare(`
            INSERT INTO ipr_items (user_id, competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')
          `).run(
            user.id,
            item.name,
            Math.round(s * 25),
            item.module,
            item.format,
            item.result,
            '2027-04-30',
            'Эксперт Лиги ИРО Кузбасса'
          );
        }
      }
    });
  }

  const saved = db.prepare('SELECT * FROM diagnostic_results WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, result: saved });
});

// ── IPR (Individual Plan) API ──
app.get('/api/user/ipr', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const items = db.prepare('SELECT * FROM ipr_items WHERE user_id = ? ORDER BY id DESC').all(user.id);
  res.json({ items });
});

app.post('/api/user/ipr', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name } = req.body;
  const info = db.prepare(`
    INSERT INTO ipr_items (user_id, competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')
  `).run(
    user.id,
    String(competency || 'Стратегическое управление').slice(0, 200),
    Math.max(0, Math.min(100, Number(deficit_score) || 50)),
    String(recommended_module || 'Модульная программа ДПО').slice(0, 300),
    String(action_format || 'Лаборатория опорной площадки').slice(0, 300),
    String(target_result || 'Разработка локального нормативного акта').slice(0, 300),
    String(deadline || '2027-03-31').slice(0, 64),
    String(mentor_name || 'Наставник Лиги экспертов').slice(0, 200)
  );

  const created = db.prepare('SELECT * FROM ipr_items WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, item: created });
});

const IPR_STATUSES = ['planned', 'in_progress', 'completed'];

app.put('/api/user/ipr/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });

  const { status, target_result, deadline, mentor_name } = req.body;
  const safeStatus = IPR_STATUSES.includes(status) ? status : null;

  db.prepare(`
    UPDATE ipr_items SET
      status = COALESCE(?, status),
      target_result = COALESCE(?, target_result),
      deadline = COALESCE(?, deadline),
      mentor_name = COALESCE(?, mentor_name)
    WHERE id = ? AND user_id = ?
  `).run(safeStatus, nn(target_result), nn(deadline), nn(mentor_name), id, user.id);

  const updated = db.prepare('SELECT * FROM ipr_items WHERE id = ? AND user_id = ?').get(id, user.id);
  res.json({ success: true, item: updated });
});

app.delete('/api/user/ipr/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });

  db.prepare('DELETE FROM ipr_items WHERE id = ? AND user_id = ?').run(id, user.id);
  res.json({ success: true });
});

// ── Portfolio API ──
app.get('/api/user/portfolio', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const items = db.prepare('SELECT * FROM portfolio_items WHERE user_id = ? ORDER BY id DESC').all(user.id);
  res.json({ items });
});

app.post('/api/user/portfolio', (req, res) => {
  upload.single('document')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const user = requireAuth(req, res);
      if (!user) return;

      const { category, title, description } = req.body;
      if (!title || !category) {
        return res.status(400).json({ error: 'Укажите название и категорию документа' });
      }

      let filePath = null;
      let fileName = null;
      if (req.file) {
        filePath = '/uploads/' + req.file.filename;
        fileName = req.file.originalname.slice(0, 255);
      }

      const info = db.prepare(`
        INSERT INTO portfolio_items (user_id, category, title, description, file_path, file_name, verification_status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        user.id,
        String(category).slice(0, 64),
        String(title).slice(0, 300),
        String(description || '').slice(0, 2000),
        filePath,
        fileName
      );

      const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(info.lastInsertRowid);
      res.json({ success: true, item });
    } catch (e) {
      res.status(500).json({ error: 'Ошибка сохранения документа' });
    }
  });
});

app.delete('/api/user/portfolio/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });

  const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ? AND user_id = ?').get(id, user.id);
  if (item && item.file_path) {
    // file_path — URL вида /uploads/<name>; физически файл лежит в uploadDir
    const fullDiskPath = path.join(uploadDir, path.basename(item.file_path));
    if (fs.existsSync(fullDiskPath)) {
      try { fs.unlinkSync(fullDiskPath); } catch (_) {}
    }
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ? AND user_id = ?').run(id, user.id);
  res.json({ success: true });
});

// ── Dialogue Q&A API ──
const DIALOGUE_CATEGORIES = [
  'Стратегическое управление',
  'Финансово-хозяйственная деятельность',
  'Управление персоналом',
  'Управление качеством образования',
  'Коммуникации',
  'Предложение по развитию проекта'
];

app.get('/api/dialogue', (req, res) => {
  const category = req.query.category;
  let questions;
  if (category && category !== 'Все') {
    questions = db.prepare('SELECT * FROM dialogue_questions WHERE category = ? ORDER BY id DESC').all(String(category).slice(0, 128));
  } else {
    questions = db.prepare('SELECT * FROM dialogue_questions ORDER BY id DESC').all();
  }
  res.json({ questions });
});

app.post('/api/dialogue', (req, res) => {
  const user = getUser(req);
  const { category, question_text, author_name, author_role } = req.body;
  const text = String(question_text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Введите текст вопроса' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Текст вопроса слишком длинный (до 2000 символов)' });
  }

  const finalName = String(author_name || (user ? user.fio : 'Участник проекта')).slice(0, 200);
  const finalRole = String(author_role || (user ? `${user.position}, ${user.workplace}` : 'Руководитель ОО')).slice(0, 200);
  const finalCategory = DIALOGUE_CATEGORIES.includes(category) ? category : 'Стратегическое управление';

  const info = db.prepare(`
    INSERT INTO dialogue_questions (user_id, author_name, author_role, category, question_text, status)
    VALUES (?, ?, ?, ?, ?, 'new')
  `).run(user ? user.id : null, finalName, finalRole, finalCategory, text);

  const question = db.prepare('SELECT * FROM dialogue_questions WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, question });
});

// Отвечать могут только эксперты Лиги и администраторы
app.put('/api/dialogue/:id/answer', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (!['expert', 'admin'].includes(user.role)) {
    return res.status(403).json({ error: 'Публиковать ответы могут только эксперты Лиги' });
  }

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });

  const answerText = String(req.body.answer_text || '').trim();
  if (!answerText) {
    return res.status(400).json({ error: 'Введите текст ответа' });
  }
  if (answerText.length > 5000) {
    return res.status(400).json({ error: 'Текст ответа слишком длинный (до 5000 символов)' });
  }

  db.prepare(`
    UPDATE dialogue_questions SET
      answer_text = ?,
      expert_name = ?,
      status = 'answered',
      answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(answerText, String(req.body.expert_name || user.fio).slice(0, 200), id);

  const updated = db.prepare('SELECT * FROM dialogue_questions WHERE id = ?').get(id);
  res.json({ success: true, question: updated });
});

// ── Reserve Ideas API ──
app.get('/api/reserve/ideas', (req, res) => {
  const user = getUser(req);
  const ideas = db.prepare('SELECT * FROM reserve_ideas ORDER BY votes_count DESC, id DESC').all();

  let userVotes = [];
  if (user) {
    userVotes = db.prepare('SELECT idea_id FROM idea_votes WHERE user_id = ?').all(user.id).map(r => r.idea_id);
  }

  const enriched = ideas.map(idea => ({
    ...idea,
    has_voted: userVotes.includes(idea.id)
  }));

  res.json({ ideas: enriched });
});

app.post('/api/reserve/ideas', (req, res) => {
  const user = getUser(req);
  const { title, category, description, expected_effect, author_name, workplace } = req.body;
  const safeTitle = String(title || '').trim();
  const safeDesc = String(description || '').trim();
  if (!safeTitle || !safeDesc) {
    return res.status(400).json({ error: 'Заполните название и описание идеи' });
  }
  if (safeTitle.length > 300 || safeDesc.length > 4000) {
    return res.status(400).json({ error: 'Название или описание слишком длинные' });
  }

  const finalAuthor = String(author_name || (user ? user.fio : 'Кандидат кадрового резерва')).slice(0, 200);
  const finalWorkplace = String(workplace || (user ? user.workplace : 'ОО Кузбасса')).slice(0, 200);

  const info = db.prepare(`
    INSERT INTO reserve_ideas (user_id, author_name, workplace, title, category, description, expected_effect, votes_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    user ? user.id : null,
    finalAuthor,
    finalWorkplace,
    safeTitle,
    String(category || 'Инновации в образовании').slice(0, 128),
    safeDesc,
    String(expected_effect || '').slice(0, 500)
  );

  // Автор голосует за собственную идею первым
  if (user) {
    try {
      db.prepare('INSERT INTO idea_votes (idea_id, user_id) VALUES (?, ?)').run(info.lastInsertRowid, user.id);
    } catch (_) {}
  }

  const idea = db.prepare('SELECT * FROM reserve_ideas WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, idea });
});

app.post('/api/reserve/ideas/:id/vote', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const ideaId = parseInt(req.params.id, 10);
  if (!ideaId) return res.status(400).json({ error: 'Некорректный id идеи' });

  const idea = db.prepare('SELECT id FROM reserve_ideas WHERE id = ?').get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Идея не найдена' });

  const existingVote = db.prepare('SELECT id FROM idea_votes WHERE idea_id = ? AND user_id = ?').get(ideaId, user.id);

  if (existingVote) {
    db.prepare('DELETE FROM idea_votes WHERE id = ?').run(existingVote.id);
    db.prepare('UPDATE reserve_ideas SET votes_count = MAX(0, votes_count - 1) WHERE id = ?').run(ideaId);
    return res.json({ success: true, voted: false });
  }

  db.prepare('INSERT INTO idea_votes (idea_id, user_id) VALUES (?, ?)').run(ideaId, user.id);
  db.prepare('UPDATE reserve_ideas SET votes_count = votes_count + 1 WHERE id = ?').run(ideaId);
  res.json({ success: true, voted: true });
});

// ── Admin: Site Content API (тексты и изображения) ──
app.get('/api/content', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, description, category FROM site_content').all();
    const content = {};
    rows.forEach(r => { content[r.key] = r.value; });
    res.json({ success: true, content, items: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/content', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const updates = req.body.items || req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Некорректный формат данных' });
  }

  const upsert = db.prepare(`
    INSERT INTO site_content (key, value, description, category, updated_at)
    VALUES (?, ?, COALESCE((SELECT description FROM site_content WHERE key = ?), ''), 'general', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof key === 'string' && typeof value === 'string') {
      upsert.run(key, value, key);
    }
  }

  const rows = db.prepare('SELECT key, value, description, category FROM site_content').all();
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });
  res.json({ success: true, content, items: rows });
});

app.post('/api/admin/reset-content', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const content = resetSiteContentToDefaults();
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/upload-image', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  uploadImage.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл изображения не передан' });

    const publicUrl = '/uploads/images/' + req.file.filename;
    res.json({ success: true, url: publicUrl, filename: req.file.filename });
  });
});

// ── Library Documents API (библиотека «В помощь руководителю») ──
const ALLOWED_DOC_CATEGORIES = ['federal', 'regional', 'local', 'methodological', 'normative'];

app.get('/api/documents', (req, res) => {
  try {
    const { category } = req.query;
    let documents;
    if (category && category !== 'all' && category !== 'Все') {
      if (category === 'federal' || category === 'normative') {
        documents = db.prepare("SELECT * FROM library_documents WHERE category IN ('federal', 'normative') ORDER BY order_num, id").all();
      } else {
        documents = db.prepare('SELECT * FROM library_documents WHERE category = ? ORDER BY order_num, id').all(category);
      }
    } else {
      documents = db.prepare('SELECT * FROM library_documents ORDER BY category, order_num, id').all();
    }
    res.json({ success: true, documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/documents', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { title, category, description, url, file_path, order_num } = req.body;
  const safeTitle = String(title || '').trim();
  if (!safeTitle) {
    return res.status(400).json({ error: 'Укажите название документа' });
  }

  const cat = ALLOWED_DOC_CATEGORIES.includes(category) ? category : 'federal';
  const info = db.prepare(`
    INSERT INTO library_documents (title, category, description, url, file_path, order_num)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    safeTitle.slice(0, 300),
    cat,
    String(description || '').slice(0, 1000),
    String(url || '').slice(0, 500),
    String(file_path || '').slice(0, 500),
    parseInt(order_num, 10) || 0
  );

  const doc = db.prepare('SELECT * FROM library_documents WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, document: doc });
});

app.put('/api/admin/documents/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id документа' });

  const existing = db.prepare('SELECT * FROM library_documents WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Документ не найден' });

  const { title, category, description, url, file_path, order_num } = req.body;
  const safeCat = category !== undefined ? (ALLOWED_DOC_CATEGORIES.includes(category) ? category : existing.category) : null;

  db.prepare(`
    UPDATE library_documents
    SET title = COALESCE(?, title),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        url = COALESCE(?, url),
        file_path = COALESCE(?, file_path),
        order_num = COALESCE(?, order_num)
    WHERE id = ?
  `).run(
    title !== undefined ? String(title).trim().slice(0, 300) : null,
    safeCat,
    description !== undefined ? String(description).slice(0, 1000) : null,
    url !== undefined ? String(url).slice(0, 500) : null,
    file_path !== undefined ? String(file_path).slice(0, 500) : null,
    order_num !== undefined ? parseInt(order_num, 10) || 0 : null,
    id
  );

  const updated = db.prepare('SELECT * FROM library_documents WHERE id = ?').get(id);
  res.json({ success: true, document: updated });
});

app.delete('/api/admin/documents/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id документа' });

  db.prepare('DELETE FROM library_documents WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── Media Library API (Фотогалерея и медиатека) ──
app.get('/api/media', (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM site_media ORDER BY id DESC').all();
    res.json({ success: true, media });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/media', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    uploadImage.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Файл изображения не передан' });

      const title = String(req.body.title || req.file.originalname || 'Фото').trim().slice(0, 200);
      const category = String(req.body.category || 'general').trim().slice(0, 50);
      const publicUrl = '/uploads/images/' + req.file.filename;

      const info = db.prepare(`
        INSERT INTO site_media (title, url, category, file_name, file_size)
        VALUES (?, ?, ?, ?, ?)
      `).run(title, publicUrl, category, req.file.filename, req.file.size);

      const item = db.prepare('SELECT * FROM site_media WHERE id = ?').get(info.lastInsertRowid);
      res.json({ success: true, item });
    });
  } else {
    const { title, url, category } = req.body || {};
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return res.status(400).json({ error: 'Укажите URL изображения или загрузите файл' });
    const safeTitle = String(title || 'Изображение').trim().slice(0, 200);
    const safeCat = String(category || 'general').trim().slice(0, 50);

    const info = db.prepare(`
      INSERT INTO site_media (title, url, category)
      VALUES (?, ?, ?)
    `).run(safeTitle, safeUrl.slice(0, 500), safeCat);

    const item = db.prepare('SELECT * FROM site_media WHERE id = ?').get(info.lastInsertRowid);
    res.json({ success: true, item });
  }
});

app.delete('/api/admin/media/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id изображения' });

  const item = db.prepare('SELECT * FROM site_media WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Изображение не найдено' });

  if (item.file_name) {
    const filePath = path.join(uploadDir, 'images', item.file_name);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
  }

  db.prepare('DELETE FROM site_media WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── Diagnostic Questions API (вопросы тестирования и самооценки) ──
app.get('/api/diagnostics/questions', (req, res) => {
  try {
    const testQuestions = db.prepare(`
      SELECT id, competency_index, question_text, options_json, correct_index, explanation, order_num
      FROM diagnostic_questions
      WHERE type = 'test' AND is_active = 1
      ORDER BY order_num, id
    `).all().map(q => ({
      id: q.id,
      d: q.competency_index,
      q: q.question_text,
      o: JSON.parse(q.options_json || '[]'),
      c: q.correct_index,
      e: q.explanation,
      order: q.order_num
    }));

    const saQuestions = db.prepare(`
      SELECT id, competency_index, question_text, explanation, order_num
      FROM diagnostic_questions
      WHERE type = 'self_assessment' AND is_active = 1
      ORDER BY order_num, id
    `).all().map(sa => ({
      id: sa.competency_index,
      db_id: sa.id,
      title: sa.explanation,
      text: sa.question_text
    }));

    res.json({
      success: true,
      questions: testQuestions,
      self_assessment: saQuestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/diagnostics/questions', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const questions = db.prepare('SELECT * FROM diagnostic_questions ORDER BY type, competency_index, order_num, id').all().map(q => ({
      ...q,
      options: JSON.parse(q.options_json || '[]')
    }));
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/diagnostics/questions', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { type, competency_index, question_text, options, correct_index, explanation, order_num } = req.body || {};
  const safeText = String(question_text || '').trim();
  if (!safeText) return res.status(400).json({ error: 'Укажите текст вопроса' });

  const qType = type === 'self_assessment' ? 'self_assessment' : 'test';
  const compIdx = Math.max(0, Math.min(4, parseInt(competency_index, 10) || 0));
  const optionsArr = Array.isArray(options) ? options : [];
  const correctIdx = Math.max(0, parseInt(correct_index, 10) || 0);

  const info = db.prepare(`
    INSERT INTO diagnostic_questions (type, competency_index, question_text, options_json, correct_index, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    qType,
    compIdx,
    safeText.slice(0, 2000),
    JSON.stringify(optionsArr),
    correctIdx,
    String(explanation || '').slice(0, 2000),
    parseInt(order_num, 10) || 0
  );

  const created = db.prepare('SELECT * FROM diagnostic_questions WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, question: { ...created, options: JSON.parse(created.options_json || '[]') } });
});

app.put('/api/admin/diagnostics/questions/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id вопроса' });

  const existing = db.prepare('SELECT * FROM diagnostic_questions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Вопрос не найден' });

  const { type, competency_index, question_text, options, correct_index, explanation, order_num, is_active } = req.body || {};

  db.prepare(`
    UPDATE diagnostic_questions
    SET type = COALESCE(?, type),
        competency_index = COALESCE(?, competency_index),
        question_text = COALESCE(?, question_text),
        options_json = COALESCE(?, options_json),
        correct_index = COALESCE(?, correct_index),
        explanation = COALESCE(?, explanation),
        order_num = COALESCE(?, order_num),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    type !== undefined ? (type === 'self_assessment' ? 'self_assessment' : 'test') : null,
    competency_index !== undefined ? parseInt(competency_index, 10) : null,
    question_text !== undefined ? String(question_text).trim().slice(0, 2000) : null,
    options !== undefined ? JSON.stringify(Array.isArray(options) ? options : []) : null,
    correct_index !== undefined ? parseInt(correct_index, 10) : null,
    explanation !== undefined ? String(explanation).slice(0, 2000) : null,
    order_num !== undefined ? parseInt(order_num, 10) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  const updated = db.prepare('SELECT * FROM diagnostic_questions WHERE id = ?').get(id);
  res.json({ success: true, question: { ...updated, options: JSON.parse(updated.options_json || '[]') } });
});

app.delete('/api/admin/diagnostics/questions/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id вопроса' });

  db.prepare('DELETE FROM diagnostic_questions WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── Admin: Participants & Export API (участники, анкеты, результаты диагностики и ИПР) ──
app.get('/api/admin/users', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const users = db.prepare(`
      SELECT 
        u.id, u.login, u.role, u.fio, u.birth_date, u.address, u.phone, u.email,
        u.education_level, u.institution, u.workplace, u.position,
        u.experience_total, u.experience_ped, u.experience_mgmt, u.share_experience,
        u.consent_pd, u.created_at,
        (SELECT COUNT(*) FROM diagnostic_results WHERE user_id = u.id) as diag_count,
        (SELECT score_percent FROM diagnostic_results WHERE user_id = u.id ORDER BY id DESC LIMIT 1) as last_diag_score,
        (SELECT deficit_level FROM diagnostic_results WHERE user_id = u.id ORDER BY id DESC LIMIT 1) as last_diag_level,
        (SELECT created_at FROM diagnostic_results WHERE user_id = u.id ORDER BY id DESC LIMIT 1) as last_diag_date,
        (SELECT COUNT(*) FROM ipr_items WHERE user_id = u.id) as ipr_count
      FROM users u
      ORDER BY u.id DESC
    `).all();

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id/export', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id пользователя' });

  const user = db.prepare(`
    SELECT id, login, role, fio, birth_date, address, phone, email,
           education_level, institution, workplace, position,
           experience_total, experience_ped, experience_mgmt, share_experience,
           consent_pd, created_at
    FROM users WHERE id = ?
  `).get(id);

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const diagnostics = db.prepare('SELECT * FROM diagnostic_results WHERE user_id = ? ORDER BY id DESC').all(id).map(d => {
    let details = {};
    try { details = JSON.parse(d.details_json || '{}'); } catch (_) {}
    return {
      ...d,
      details
    };
  });

  const iprItems = db.prepare('SELECT * FROM ipr_items WHERE user_id = ? ORDER BY id ASC').all(id);
  const portfolio = db.prepare('SELECT id, category, title, description, file_name, verification_status, created_at FROM portfolio_items WHERE user_id = ?').all(id);

  res.json({
    success: true,
    user,
    diagnostics,
    ipr_items: iprItems,
    portfolio
  });
});

app.get('/api/admin/diagnostics/export-csv', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const rows = db.prepare(`
      SELECT 
        d.id as diag_id, d.created_at as passed_at, d.type, d.score_percent, d.deficit_level, d.summary_text, d.details_json,
        u.id as user_id, u.fio, u.login, u.workplace, u.position, u.phone, u.email
      FROM diagnostic_results d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.id DESC
    `).all();

    let csv = '\uFEFF';
    csv += 'ID теста;Дата;ФИО;Логин;Организация;Должность;Телефон;Email;Тип диагностики;Итоговый балл (%);Уровень дефицита;1. Стратегия;2. ФХД;3. Персонал;4. Качество;5. Коммуникации;Резюме\n';

    const clean = (val) => '"' + String(val || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';

    rows.forEach(r => {
      let details = {};
      try { details = JSON.parse(r.details_json || '{}'); } catch (_) {}
      const scores = Array.isArray(details.scores) ? details.scores : [];

      csv += [
        r.diag_id,
        clean(r.passed_at),
        clean(r.fio),
        clean(r.login),
        clean(r.workplace),
        clean(r.position),
        clean(r.phone),
        clean(r.email),
        clean(r.type === 'self_assessment' ? 'Самооценка' : 'Комплексный тест (20)'),
        r.score_percent !== undefined ? r.score_percent : 0,
        clean(r.deficit_level),
        scores[0] !== undefined ? scores[0] : '',
        scores[1] !== undefined ? scores[1] : '',
        scores[2] !== undefined ? scores[2] : '',
        scores[3] !== undefined ? scores[3] : '',
        scores[4] !== undefined ? scores[4] : '',
        clean(r.summary_text)
      ].join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="diagnostics_kuzbass_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/export-csv', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const rows = db.prepare(`
      SELECT 
        u.id, u.login, u.role, u.fio, u.birth_date, u.address, u.phone, u.email,
        u.education_level, u.institution, u.workplace, u.position,
        u.experience_total, u.experience_ped, u.experience_mgmt, u.share_experience,
        u.consent_pd, u.created_at,
        (SELECT COUNT(*) FROM diagnostic_results WHERE user_id = u.id) as diag_count,
        (SELECT COUNT(*) FROM ipr_items WHERE user_id = u.id) as ipr_count
      FROM users u
      ORDER BY u.id DESC
    `).all();

    let csv = '\uFEFF';
    csv += 'ID;ФИО;Логин;Роль;Организация;Должность;Телефон;Email;Образование;Общий стаж;Пед. стаж;Управл. стаж;Диагностика (раз);Мероприятий ИПР;Согласие ПД;Дата регистрации\n';

    const clean = (val) => '"' + String(val || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';

    rows.forEach(u => {
      csv += [
        u.id,
        clean(u.fio),
        clean(u.login),
        clean(u.role),
        clean(u.workplace),
        clean(u.position),
        clean(u.phone),
        clean(u.email),
        clean(u.education_level),
        clean(u.experience_total),
        clean(u.experience_ped),
        clean(u.experience_mgmt),
        u.diag_count,
        u.ipr_count,
        u.consent_pd ? 'Да' : 'Нет',
        clean(u.created_at)
      ].join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participants_kuzbass_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Dialogue Moderation API ──
app.delete('/api/admin/dialogue/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id вопроса' });

  db.prepare('DELETE FROM dialogue_questions WHERE id = ?').run(id);
  res.json({ success: true });
});

app.put('/api/admin/dialogue/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Некорректный id вопроса' });

  const { question_text, answer_text, status, category } = req.body;
  db.prepare(`
    UPDATE dialogue_questions
    SET question_text = COALESCE(?, question_text),
        answer_text = COALESCE(?, answer_text),
        status = COALESCE(?, status),
        category = COALESCE(?, category),
        answered_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE answered_at END
    WHERE id = ?
  `).run(
    question_text !== undefined ? String(question_text).slice(0, 2000) : null,
    answer_text !== undefined ? String(answer_text).slice(0, 3000) : null,
    status || null,
    category || null,
    answer_text || null,
    id
  );

  const question = db.prepare('SELECT * FROM dialogue_questions WHERE id = ?').get(id);
  res.json({ success: true, question });
});

// ── Summary Stats API ──
app.get('/api/stats/summary', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const diagCount = db.prepare('SELECT COUNT(*) as c FROM diagnostic_results').get().c;
  const ideasCount = db.prepare('SELECT COUNT(*) as c FROM reserve_ideas').get().c;
  const questionsCount = db.prepare("SELECT COUNT(*) as c FROM dialogue_questions WHERE status = 'answered'").get().c;

  res.json({
    users_total: 267 + userCount,
    diagnostics_passed: 251 + diagCount,
    platforms_network: '47 + 31',
    efficiency_growth: '+35 %',
    active_ideas: 14 + ideasCount,
    answered_questions: 58 + questionsCount
  });
});

// Ошибки multer и прочие — JSON вместо HTML-страницы
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

// Fallback: неизвестные API-маршруты — 404 JSON, остальные пути — SPA index.html
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Метод API не найден' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kuzbass Management Platform is running on http://localhost:${PORT}`);
});
