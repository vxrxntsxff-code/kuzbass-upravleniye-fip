const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      } catch (err) {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  const tmpDir = path.join(__dirname, '../.chrome-tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=' + DEBUG_PORT,
    '--user-data-dir=' + tmpDir,
    'about:blank'
  ]);

  let connected = false;
  for (let i = 0; i < 20; i++) {
    await delay(300);
    try {
      const res = await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/version');
      if (res.ok) { connected = true; break; }
    } catch (_) {}
  }
  if (!connected) throw new Error('Cannot connect to Chrome');

  const newTabRes = await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/new?http://localhost:3000/#/home', { method: 'PUT' });
  const tabInfo = await newTabRes.json();
  const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'DOM.enable');
  await sendCdp(ws, 'Log.enable');

  const logs = [];
  ws.addEventListener('message', evt => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Log.entryAdded') logs.push(msg.params.entry);
    } catch (_) {}
  });

  const routes = ['home', 'about', 'comp', 'diag', 'traj', 'dialog', 'future', 'help', 'cabinet'];
  const auditDir = path.join(__dirname, '../screenshots/audit');
  fs.mkdirSync(auditDir, { recursive: true });

  await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false
  });

  const issues = [];

  for (const r of routes) {
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/' + r });
    await delay(600);

    // Evaluate layout metrics in the browser
    const evalRes = await sendCdp(ws, 'Runtime.evaluate', {
      expression: `JSON.stringify({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        brokenImages: Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src)
      })`
    });

    const pageMetrics = JSON.parse(evalRes.result.value);
    if (pageMetrics.hasHorizontalOverflow) {
      issues.push(`[Layout] Page #${r} has horizontal overflow: scrollWidth ${pageMetrics.scrollWidth} > clientWidth ${pageMetrics.clientWidth}`);
    }
    if (pageMetrics.brokenImages && pageMetrics.brokenImages.length > 0) {
      issues.push(`[Image] Page #${r} has broken images: ${pageMetrics.brokenImages.join(', ')}`);
    }

    // Capture top
    const shotTop = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(auditDir, `${r}_top.png`), Buffer.from(shotTop.data, 'base64'));

    // Capture middle/bottom if long
    if (pageMetrics.scrollHeight > 1400) {
      await sendCdp(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, 900)' });
      await delay(300);
      const shotMid = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(auditDir, `${r}_mid.png`), Buffer.from(shotMid.data, 'base64'));

      if (pageMetrics.scrollHeight > 2200) {
        await sendCdp(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, document.documentElement.scrollHeight)' });
        await delay(300);
        const shotBottom = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(auditDir, `${r}_bottom.png`), Buffer.from(shotBottom.data, 'base64'));
      }
    }
  }

  // Also test mobile viewports: tablet 768px and mobile 375px
  for (const width of [768, 375]) {
    await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
      width,
      height: 800,
      deviceScaleFactor: 2,
      mobile: width < 600
    });
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/#/home' });
    await delay(600);
    const evalMob = await sendCdp(ws, 'Runtime.evaluate', {
      expression: `JSON.stringify({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      })`
    });
    const mobData = JSON.parse(evalMob.result.value);
    if (mobData.hasHorizontalOverflow) {
      issues.push(`[Mobile ${width}px] Home page has horizontal overflow: ${mobData.scrollWidth} > ${mobData.clientWidth}`);
    }
    const shotMob = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(auditDir, `home_${width}px.png`), Buffer.from(shotMob.data, 'base64'));
  }

  ws.close();
  chromeProc.kill();

  console.log('--- AUDIT REPORT ---');
  console.log('Issues found:', issues.length);
  issues.forEach(i => console.log('  ⚠️', i));
  console.log('Browser Logs:', logs.length);
  logs.forEach(l => console.log('  📝', l.level, l.text));
}

run().catch(console.error);
