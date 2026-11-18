const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (err) {
        // ignore other messages
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log('🚀 Launching Chrome in headless CDP mode...');
  const tmpDir = path.join(__dirname, '../.chrome-tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  let connected = false;
  for (let i = 0; i < 20; i++) {
    await delay(300);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        connected = true;
        break;
      }
    } catch (_) {}
  }

  if (!connected) {
    throw new Error('Could not connect to Chrome debugging port');
  }

  // Create new page target
  const newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?http://localhost:3000/#/home`, { method: 'PUT' });
  const tabInfo = await newTabRes.json();
  const wsUrl = tabInfo.webSocketDebuggerUrl;

  console.log('🔗 Connected to CDP WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'DOM.enable');
  await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1600,
    deviceScaleFactor: 1,
    mobile: false
  });

  const screenshotsDir = path.join(__dirname, '../screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const capture = async (filename, label) => {
    console.log(`📸 Capturing ${label} -> ${filename}...`);
    await delay(200);
    const shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(screenshotsDir, filename), buffer);
    console.log(`   Saved ${filename} (${Math.round(buffer.length / 1024)} KB)`);
  };

  // 1. Home page Hero & 6 Stages
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/home' });
  await delay(1200);
  await capture('01_home_hero.png', 'Home Hero & Seal');

  // 2. About page (#/about)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/about' });
  await delay(1000);
  await capture('02_about.png', 'About Regional Model (Цель, Задачи, Миссия, Жизненный цикл, 2030)');

  // 3. Competencies page (#/comp)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/comp' });
  await delay(1000);
  await capture('03_comp.png', '5 Key Competencies (без модулей и уровней)');

  // 4. Diagnostics page (#/diag)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/diag' });
  await delay(1000);
  await capture('04_diag.png', 'Diagnostics Page (4 блока, шкала, переход в ЛК)');

  // 5. Trajectory page (#/traj)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/traj' });
  await delay(1000);
  await capture('05_traj.png', 'Educational Trajectory (4 трека с 31 опорной площадкой, 6 шагов ИПР)');

  // 6. Dialogue page (#/dialog)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/dialog' });
  await delay(1000);
  await capture('06_dialog.png', 'Effective Dialogue (Форма + эксперты + лента)');

  // 7. Kuzbass Future page (#/future)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/future' });
  await delay(1000);
  await capture('07_future.png', 'Кузбасс.Будущее.РФ (3 уровня, банк инициатив)');

  // 8. Help page (#/help)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/help' });
  await delay(1000);
  await capture('08_help.png', 'Help Page (Методические и нормативные документы, без поддержки)');

  // 9. Cabinet Tab 1: Анкета
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/cabinet' });
  await delay(1000);
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("ank")' });
  await delay(500);
  await capture('09_cabinet_anketa.png', 'Cabinet Tab 1: Анкета руководителя');

  // 10. Cabinet Tab 2: Пройти диагностику
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("diag")' });
  await delay(500);
  await capture('10_cabinet_diag.png', 'Cabinet Tab 2: Диагностика (самооценка и тест)');

  // 11. Cabinet Tab 3: Моя траектория (ИПР)
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("ipr")' });
  await delay(500);
  await capture('11_cabinet_ipr.png', 'Cabinet Tab 3: Моя траектория (ИПР)');

  // 12. Cabinet Tab 4: Портфолио
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("pf")' });
  await delay(500);
  await capture('12_cabinet_portfolio.png', 'Cabinet Tab 4: Портфолио');

  // 13. Cabinet Tab 5: Прогресс во времени (Было -> Стало)
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("progress")' });
  await delay(600);
  await capture('13_cabinet_progress.png', 'Cabinet Tab 5: Сравнение Было/Стало и график динамики');

  ws.close();
  chromeProc.kill();
  console.log('✅ All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
