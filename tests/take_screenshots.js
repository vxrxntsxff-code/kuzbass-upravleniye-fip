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

  // 1. Home page Hero & 6 Stages Infographic
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/home' });
  await delay(1200);
  await capture('01_home_hero.png', 'Home Hero & Seal');

  await sendCdp(ws, 'Runtime.evaluate', {
    expression: 'document.getElementById("stagesContainer").scrollIntoView({ behavior: "instant", block: "start" })'
  });
  await delay(800);
  await capture('02_home_6stages.png', '6 Regional Model Stages Infographic');

  await sendCdp(ws, 'Runtime.evaluate', {
    expression: 'window.scrollTo({ top: 1700, behavior: "instant" })'
  });
  await delay(800);
  await capture('03_home_benefits_micromodules.png', 'Benefits Grid & Micromodules');

  // 2. Directions Page
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/directions' });
  await delay(1000);
  await capture('04_directions.png', '5 Directions of Management Development');

  // 3. Help Page (В помощь руководителю)
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/help' });
  await delay(1000);
  await capture('05_help_normative.png', 'Help & Normative Docs');

  // 4. Cabinet Tab 1: Анкета
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/cabinet' });
  await delay(1000);
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("ank")' });
  await delay(500);
  await capture('06_cabinet_anketa.png', 'Cabinet Tab 1: Анкета руководителя');

  // 5. Cabinet Tab 2: Пройти диагностику (Самооценка & Тест 20)
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("diag")' });
  await delay(500);
  await capture('07_cabinet_diag_self.png', 'Cabinet Tab 2: Самооценка');

  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchDiagSubTab("test")' });
  await delay(500);
  await capture('08_cabinet_diag_test.png', 'Cabinet Tab 2: Комплексный тест 20');

  // 6. Cabinet Tab 3: Моя траектория (ИПР)
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("ipr")' });
  await delay(500);
  await capture('09_cabinet_ipr.png', 'Cabinet Tab 3: Моя траектория (ИПР)');

  // 7. Cabinet Tab 4: Портфолио
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("pf")' });
  await delay(500);
  await capture('11_cabinet_portfolio.png', 'Cabinet Tab 4: Портфолио');

  // 8. Cabinet Tab 5: Прогресс во времени (Было -> Стало)
  await sendCdp(ws, 'Runtime.evaluate', { expression: 'switchCabinetTab("progress")' });
  await delay(600);
  await capture('10_cabinet_progress_comparative.png', 'Cabinet Tab 5: Сравнение Было/Стало и график');

  ws.close();
  chromeProc.kill();
  console.log('✅ All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
