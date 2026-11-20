import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
const skill = path.join(
  process.env.DESIGN_TASTE_SKILL || path.join(os.homedir(), '.codex/skills/design-taste-frontend'),
  'scripts/lib/',
);
const { probe, app, layout } = await import(pathToFileURL(skill + 'probe.mjs'));
const { judge, judgeApp, judgeLayout, APP_SKIP } = await import(pathToFileURL(skill + 'rules.mjs'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5175/login');
await page.getByLabel('Email address').fill('admin@novara.demo');
await page.getByLabel('Password', { exact: true }).fill('NovaraDemo!2026');
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForURL('http://localhost:5175/');
await fs.mkdir('.runtime/visual', { recursive: true });
const findings = [];
for (const width of [1440, 768, 390]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.goto('http://localhost:5175/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const measured = await page.evaluate(probe),
    appMeasured = await page.evaluate(app),
    layoutMeasured = await page.evaluate(layout);
  const allow = [...APP_SKIP, 'palette'];
  const f = [
    ...judge(measured, { width, allow }),
    ...judgeApp(appMeasured, measured, { width, allow }),
    ...judgeLayout(layoutMeasured, { width, allow }),
  ];
  findings.push({ width, findings: f });
  await page.screenshot({ path: `.runtime/visual/admin-${width}.png`, fullPage: true });
}
await fs.writeFile('.runtime/visual/admin-report.json', JSON.stringify({ findings, errors }, null, 2));
console.log(JSON.stringify({ findings, errors }, null, 2));
await browser.close();
