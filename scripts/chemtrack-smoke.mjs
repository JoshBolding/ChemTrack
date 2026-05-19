import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

class CDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result ?? {});
        return;
      }
      const listeners = this.listeners.get(msg.method) ?? [];
      for (const listener of listeners) listener(msg.params ?? {});
    });
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, 10_000);
    });
  }
}

const appUrl = process.env.CHEMTRACK_URL ?? 'http://127.0.0.1:5173';
const chromePath = process.env.CHROME_PATH ?? (await findChrome());
const port = Number(process.env.CDP_PORT ?? 9337);
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chemtrack-cdp-'));
const outDir = path.resolve('artifacts', 'chemtrack-smoke');
const origin = new URL(appUrl).origin;

await fs.mkdir(outDir, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
  ],
  { stdio: 'ignore' }
);

try {
  await waitForCdp(port);
  const target = await newTarget(port, 'about:blank');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.connect();

  const issues = [];
  cdp.on('Runtime.exceptionThrown', (event) => {
    issues.push(`runtime exception: ${event.exceptionDetails?.text ?? 'unknown'}`);
  });
  cdp.on('Runtime.consoleAPICalled', (event) => {
    if (event.type === 'error') {
      issues.push(`console error: ${event.args?.map((arg) => arg.value ?? arg.description).join(' ')}`);
    }
  });
  cdp.on('Log.entryAdded', (event) => {
    if (event.entry?.level === 'error') {
      issues.push(`log error: ${event.entry.text}`);
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Storage.clearDataForOrigin', {
    origin,
    storageTypes: 'all',
  });

  await viewport(cdp, 1366, 900, false);
  await goto(cdp, `${appUrl}/#/`);
  await waitForText(cdp, 'Coil Tubing Operations');
  await waitForText(cdp, 'ChemTrack');
  await waitForText(cdp, 'Start Demo');
  await screenshot(cdp, 'home-desktop.png');

  await goto(cdp, `${appUrl}/#/scan`);
  await waitForText(cdp, 'Scan Tote QR Code');
  await setInput(cdp, 'RH-250414-007');
  await clickText(cdp, 'Search');
  await waitForText(cdp, 'Corrosion Inhibitor 47');
  await waitForText(cdp, '330');
  await waitForText(cdp, 'Safety Quick Card');
  await screenshot(cdp, 'tote-detail-initial.png');

  await clickText(cdp, 'Assign to Unit');
  await waitForText(cdp, 'Smith Energy #44');
  await clickText(cdp, 'Save & Assign');
  await waitForText(cdp, 'Assigned to Unit');
  await waitForText(cdp, 'Unit 3');

  await clickText(cdp, 'Record Usage');
  await waitForText(cdp, 'Record Usage');
  await clickText(cdp, '280 gal');
  await clickText(cdp, 'Save Update');
  await waitForText(cdp, '280');
  await waitForText(cdp, 'Partial');
  await waitForText(cdp, 'Smith Energy #44');
  await screenshot(cdp, 'tote-detail-after-usage.png');

  await goto(cdp, `${appUrl}/#/units/u3`);
  await waitForText(cdp, 'Unit 3');
  await waitForText(cdp, 'Job context');
  await waitForText(cdp, 'Smith Energy #44');
  await screenshot(cdp, 'unit-3.png');

  await goto(cdp, `${appUrl}/#/tote/RH-250414-007/return`);
  await waitForText(cdp, 'Return to Yard');
  await clickText(cdp, 'Save Return');
  await waitForText(cdp, 'Returned to yard');
  await waitForText(cdp, 'Yard');

  await goto(cdp, `${appUrl}/#/inventory`);
  await waitForText(cdp, 'By Product');
  await waitForText(cdp, 'full');
  await waitForText(cdp, 'partial');
  await screenshot(cdp, 'inventory.png');

  await goto(cdp, `${appUrl}/#/attention`);
  await waitForText(cdp, 'Needs Attention');
  await waitForText(cdp, 'Quantity outside tote capacity');

  await goto(cdp, `${appUrl}/#/reports`);
  await waitForText(cdp, 'ChemTrack Supervisor View');
  await waitForText(cdp, 'Job Usage');
  await waitForText(cdp, 'Unit Loadout');
  await screenshot(cdp, 'supervisor-desktop.png');

  await viewport(cdp, 390, 844, true);
  await goto(cdp, `${appUrl}/#/`);
  await waitForText(cdp, 'Start Demo');
  await assertNoVerticalScroll(cdp, 'mobile home');
  await screenshot(cdp, 'home-mobile.png');

  await goto(cdp, `${appUrl}/#/scan`);
  await waitForText(cdp, 'Start Camera Scan');
  await clickText(cdp, 'Start Camera Scan');
  await waitForText(cdp, 'Scan Tote QR');
  await waitForText(cdp, 'Manual Lookup');
  await assertTextMissing(cdp, 'Center the QR code inside the frame');
  await assertTextMissing(cdp, 'Center QR in the frame');
  await assertNoVerticalScroll(cdp, 'mobile camera');
  await screenshot(cdp, 'camera-mobile.png');

  await goto(cdp, `${appUrl}/#/tote/RH-250414-007`);
  await waitForText(cdp, 'Tote ID');
  await waitForText(cdp, 'Safety Quick Card');
  await screenshot(cdp, 'tote-mobile.png');

  const filteredIssues = issues.filter(
    (issue) =>
      !issue.includes('Download the React DevTools') &&
      !issue.includes('favicon') &&
      !issue.includes('ERR_ABORTED')
  );
  if (filteredIssues.length) {
    throw new Error(`Browser console/runtime issues:\n${filteredIssues.join('\n')}`);
  }

  console.log(`Smoke passed at ${appUrl}`);
  console.log(`Screenshots: ${outDir}`);
} finally {
  chrome.kill();
  await new Promise((resolve) => {
    chrome.once('exit', resolve);
    setTimeout(resolve, 1500);
  });
  try {
    await fs.rm(userDataDir, { recursive: true, force: true });
  } catch {
    // Chrome can hold a lock for a moment on Windows; the temp profile is safe to leave.
  }
}

async function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(os.homedir(), 'AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep looking.
    }
  }
  throw new Error('Chrome or Edge executable not found. Set CHROME_PATH to run smoke checks.');
}

async function waitForCdp(cdpPort) {
  const url = `http://127.0.0.1:${cdpPort}/json/version`;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await wait(250);
  }
  throw new Error('Chrome DevTools Protocol did not start.');
}

async function newTarget(cdpPort, url) {
  const res = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`Unable to create Chrome target: ${res.status}`);
  return res.json();
}

async function viewport(cdp, width, height, mobile) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}

async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await waitForReady(cdp);
}

async function waitForReady(cdp) {
  for (let i = 0; i < 60; i++) {
    const ready = await evalValue(cdp, 'document.readyState === "complete"');
    if (ready) return;
    await wait(100);
  }
  throw new Error('Page did not finish loading.');
}

async function waitForText(cdp, text) {
  const needle = JSON.stringify(text.toLowerCase());
  for (let i = 0; i < 80; i++) {
    const present = await evalValue(
      cdp,
      `document.body && document.body.innerText.toLowerCase().includes(${needle})`
    );
    if (present) return;
    await wait(100);
  }
  const body = await evalValue(cdp, 'document.body ? document.body.innerText.slice(0, 1200) : ""');
  throw new Error(`Text not found: ${text}\nVisible text:\n${body}`);
}

async function assertTextMissing(cdp, text) {
  const needle = JSON.stringify(text.toLowerCase());
  const present = await evalValue(
    cdp,
    `document.body && document.body.innerText.toLowerCase().includes(${needle})`
  );
  if (present) {
    throw new Error(`Unexpected text found: ${text}`);
  }
}

async function clickText(cdp, text) {
  const needle = JSON.stringify(text);
  await evalValue(
    cdp,
    `(() => {
      const matches = Array.from(document.querySelectorAll('a,button')).filter((el) =>
        el.textContent.replace(/\\s+/g, ' ').trim().includes(${needle})
      );
      if (matches.length === 0) throw new Error('Clickable text not found: ' + ${needle});
      matches[0].click();
      return true;
    })()`
  );
  await wait(250);
}

async function setInput(cdp, value) {
  const encoded = JSON.stringify(value);
  await evalValue(
    cdp,
    `(() => {
      const input = document.querySelector('input');
      if (!input) throw new Error('Input not found');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${encoded});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`
  );
}

async function screenshot(cdp, fileName) {
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  await fs.writeFile(path.join(outDir, fileName), Buffer.from(result.data, 'base64'));
}

async function assertNoVerticalScroll(cdp, label) {
  const metrics = await evalValue(
    cdp,
    `(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.scrollingElement.scrollHeight,
      clientHeight: document.scrollingElement.clientHeight
    }))()`
  );
  if (metrics.scrollHeight > metrics.innerHeight + 2) {
    throw new Error(
      `${label} scrolls vertically: scrollHeight=${metrics.scrollHeight}, innerHeight=${metrics.innerHeight}, clientHeight=${metrics.clientHeight}`
    );
  }
}

async function evalValue(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime evaluation failed');
  }
  return result.result?.value;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
