const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload directory
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(uploadDir));

// Helper: authenticate user from header or query
function getUser(req) {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  if (!userId) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
}

// ── Auth API ──
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  if (!login) {
    return res.status(400).json({ error: 'Укажите логин' });
  }

  // Find user by login
  let user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  
  // If demo login doesn't exist, create automatically for smooth demo
  if (!user) {
    const info = db.prepare(`
      INSERT INTO users (login, password, role, fio, workplace, position, consent_pd)
      VALUES (?, ?, 'director', ?, 'Образовательная организация Кузбасса', 'Руководитель', 1)
    `).run(login, password || 'demo123', login);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  // Exclude password in return
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

app.post('/api/auth/register', (req, res) => {
  const { login, password, fio, role, workplace, position, phone, email } = req.body;
  if (!login || !fio) {
    return res.status(400).json({ error: 'Логин и ФИО обязательны' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO users (login, password, role, fio, workplace, position, phone, email, consent_pd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      login,
      password || 'demo123',
      role || 'director',
      fio,
      workplace || 'МБОУ «СОШ»',
      position || 'Руководитель',
      phone || '',
      email || ''
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ── Profile API ──
app.put('/api/user/profile', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const {
    fio, birth_date, address, phone, email, citizenship,
    education_level, institution, workplace, position,
    experience_total, experience_ped, experience_mgmt,
    share_experience, consent_pd, role
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
      consent_pd = COALESCE(?, consent_pd),
      role = COALESCE(?, role)
    WHERE id = ?
  `).run(
    fio, birth_date, address, phone, email, citizenship,
    education_level, institution, workplace, position,
    experience_total, experience_ped, experience_mgmt,
    share_experience, consent_pd !== undefined ? (consent_pd ? 1 : 0) : null,
    role,
    user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const { password: _, ...safeUser } = updated;
  res.json({ success: true, user: safeUser });
});

// ── Diagnostics API ──
app.get('/api/user/diagnostics', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const results = db.prepare(`
    SELECT * FROM diagnostic_results 
    WHERE user_id = ? 
    ORDER BY created_at ASC
  `).all(user.id);

  res.json({ results });
});

app.post('/api/user/diagnostics', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const { type, score_percent, deficit_level, summary_text, details } = req.body;
  if (score_percent === undefined || !type) {
    return res.status(400).json({ error: 'Некорректные данные диагностики' });
  }

  const info = db.prepare(`
    INSERT INTO diagnostic_results (user_id, type, score_percent, deficit_level, summary_text, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    type,
    score_percent,
    deficit_level || 'medium',
    summary_text || '',
    details ? JSON.stringify(details) : null
  );

  // If details contain scores for the 5 competencies, auto-generate IPR items for lowest
  if (details && Array.isArray(details.competencyScores)) {
    const COMP_MODULES = [
      { name: 'Стратегическое управление', module: 'Модуль ДПО «Стратегическое управление и проектная деятельность» (72 ч)', format: 'Стратегическая лаборатория + онлайн-курс', result: 'Проект программы развития ОО' },
      { name: 'Финансово-хозяйственная деятельность', module: 'Практикум «План ФХД и закупки по 44-ФЗ для первого руководителя»', format: 'Финансовая лаборатория опорной площадки', result: 'Оптимизированный план ФХД' },
      { name: 'Управление персоналом', module: 'Модуль «Управление персоналом и командообразование» (36 ч)', format: 'Кадровая лаборатория + парное управление', result: 'Программа наставничества педагогического коллектива' },
      { name: 'Управление качеством образования', module: 'Модуль «Управление качеством образования и ВСОКО» (72 ч)', format: 'Лаборатория качества + аналитический практикум', result: 'Положение и инструментарий ВСОКО' },
      { name: 'Коммуникации', module: 'Модуль «Коммуникации и работа с общественностью» (36 ч)', format: 'Симулятор «Кризис в родительском чате»', result: 'Медиаплан и регламент кризисных коммуникаций ОО' }
    ];

    details.competencyScores.forEach((score, index) => {
      if (score <= 2 && COMP_MODULES[index]) {
        const item = COMP_MODULES[index];
        // Check if item already exists in IPR
        const existing = db.prepare('SELECT id FROM ipr_items WHERE user_id = ? AND competency = ?').get(user.id, item.name);
        if (!existing) {
          db.prepare(`
            INSERT INTO ipr_items (user_id, competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')
          `).run(
            user.id,
            item.name,
            score * 25,
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
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const items = db.prepare('SELECT * FROM ipr_items WHERE user_id = ? ORDER BY id DESC').all(user.id);
  res.json({ items });
});

app.post('/api/user/ipr', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const { competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name } = req.body;
  const info = db.prepare(`
    INSERT INTO ipr_items (user_id, competency, deficit_score, recommended_module, action_format, target_result, deadline, mentor_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')
  `).run(
    user.id,
    competency || 'Стратегическое управление',
    deficit_score || 50,
    recommended_module || 'Модульная программа ДПО',
    action_format || 'Лаборатория опорной площадки',
    target_result || 'Разработка локального нормативного акта',
    deadline || '2027-03-31',
    mentor_name || 'Наставник Лиги экспертов'
  );

  const created = db.prepare('SELECT * FROM ipr_items WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, item: created });
});

app.put('/api/user/ipr/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const { status, target_result, deadline, mentor_name } = req.body;
  db.prepare(`
    UPDATE ipr_items SET
      status = COALESCE(?, status),
      target_result = COALESCE(?, target_result),
      deadline = COALESCE(?, deadline),
      mentor_name = COALESCE(?, mentor_name)
    WHERE id = ? AND user_id = ?
  `).run(status, target_result, deadline, mentor_name, req.params.id, user.id);

  const updated = db.prepare('SELECT * FROM ipr_items WHERE id = ?').get(req.params.id);
  res.json({ success: true, item: updated });
});

app.delete('/api/user/ipr/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  db.prepare('DELETE FROM ipr_items WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ success: true });
});

// ── Portfolio API ──
app.get('/api/user/portfolio', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const items = db.prepare('SELECT * FROM portfolio_items WHERE user_id = ? ORDER BY id DESC').all(user.id);
  res.json({ items });
});

app.post('/api/user/portfolio', upload.single('document'), (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const { category, title, description } = req.body;
  if (!title || !category) {
    return res.status(400).json({ error: 'Укажите название и категорию документа' });
  }

  let filePath = null;
  let fileName = null;
  if (req.file) {
    filePath = '/uploads/' + req.file.filename;
    fileName = req.file.originalname;
  }

  const info = db.prepare(`
    INSERT INTO portfolio_items (user_id, category, title, description, file_path, file_name, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    user.id,
    category,
    title,
    description || '',
    filePath,
    fileName
  );

  const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, item });
});

app.delete('/api/user/portfolio/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });

  const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ? AND user_id = ?').get(req.params.id, user.id);
  if (item && item.file_path) {
    const fullDiskPath = path.join(__dirname, '..', item.file_path);
    if (fs.existsSync(fullDiskPath)) {
      try { fs.unlinkSync(fullDiskPath); } catch (_) {}
    }
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ success: true });
});

// ── Dialogue Q&A API ──
app.get('/api/dialogue', (req, res) => {
  const category = req.query.category;
  let questions;
  if (category && category !== 'Все') {
    questions = db.prepare('SELECT * FROM dialogue_questions WHERE category = ? ORDER BY id DESC').all(category);
  } else {
    questions = db.prepare('SELECT * FROM dialogue_questions ORDER BY id DESC').all();
  }
  res.json({ questions });
});

app.post('/api/dialogue', (req, res) => {
  const user = getUser(req);
  const { category, question_text, author_name, author_role } = req.body;
  if (!question_text) {
    return res.status(400).json({ error: 'Введите текст вопроса' });
  }

  const finalName = author_name || (user ? user.fio : 'Участник проекта');
  const finalRole = author_role || (user ? `${user.position}, ${user.workplace}` : 'Руководитель ОО');

  const info = db.prepare(`
    INSERT INTO dialogue_questions (user_id, author_name, author_role, category, question_text, status)
    VALUES (?, ?, ?, ?, ?, 'new')
  `).run(
    user ? user.id : null,
    finalName,
    finalRole,
    category || 'Стратегическое управление',
    question_text
  );

  const question = db.prepare('SELECT * FROM dialogue_questions WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, question });
});

app.put('/api/dialogue/:id/answer', (req, res) => {
  const { answer_text, expert_name } = req.body;
  if (!answer_text) {
    return res.status(400).json({ error: 'Введите текст ответа' });
  }

  db.prepare(`
    UPDATE dialogue_questions SET
      answer_text = ?,
      expert_name = ?,
      status = 'answered',
      answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(answer_text, expert_name || 'Эксперт Лиги ИРО Кузбасса', req.params.id);

  const updated = db.prepare('SELECT * FROM dialogue_questions WHERE id = ?').get(req.params.id);
  res.json({ success: true, question: updated });
});

// ── Reserve Ideas API ──
app.get('/api/reserve/ideas', (req, res) => {
  const user = getUser(req);
  const ideas = db.prepare('SELECT * FROM reserve_ideas ORDER BY votes_count DESC, id DESC').all();

  // If user authenticated, check their voted ideas
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
  if (!title || !description) {
    return res.status(400).json({ error: 'Заполните название и описание идеи' });
  }

  const finalAuthor = author_name || (user ? user.fio : 'Кандидат кадрового резерва');
  const finalWorkplace = workplace || (user ? user.workplace : 'ОО Кузбасса');

  const info = db.prepare(`
    INSERT INTO reserve_ideas (user_id, author_name, workplace, title, category, description, expected_effect, votes_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    user ? user.id : null,
    finalAuthor,
    finalWorkplace,
    title,
    category || 'Инновации в образовании',
    description,
    expected_effect || ''
  );

  // Auto-vote for own idea if user logged in
  if (user) {
    try {
      db.prepare('INSERT INTO idea_votes (idea_id, user_id) VALUES (?, ?)').run(info.lastInsertRowid, user.id);
    } catch (_) {}
  }

  const idea = db.prepare('SELECT * FROM reserve_ideas WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, idea });
});

app.post('/api/reserve/ideas/:id/vote', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Для голосования войдите в систему' });

  const ideaId = req.params.id;
  const existingVote = db.prepare('SELECT id FROM idea_votes WHERE idea_id = ? AND user_id = ?').get(ideaId, user.id);

  if (existingVote) {
    // Unvote
    db.prepare('DELETE FROM idea_votes WHERE id = ?').run(existingVote.id);
    db.prepare('UPDATE reserve_ideas SET votes_count = MAX(0, votes_count - 1) WHERE id = ?').run(ideaId);
    return res.json({ success: true, voted: false });
  } else {
    // Vote
    db.prepare('INSERT INTO idea_votes (idea_id, user_id) VALUES (?, ?)').run(ideaId, user.id);
    db.prepare('UPDATE reserve_ideas SET votes_count = votes_count + 1 WHERE id = ?').run(ideaId);
    return res.json({ success: true, voted: true });
  }
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

// Fallback to SPA index.html for any unrecognized frontend route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kuzbass Management Platform is running on http://localhost:${PORT}`);
});
