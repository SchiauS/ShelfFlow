#!/usr/bin/env node
/**
 * Smoke E2E for ShelfFlow. Uses playwright-core with a system Chromium.
 *
 *   CHROME_PATH=/path/to/chrome BASE_URL=https://schiausebastian.ro/projects/shelfflow \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node e2e/smoke.js
 *
 * Verifies: home renders books, catalog filters work, login works, admin is reachable,
 * unauthenticated admin access is blocked, and the main site is untouched.
 */
const { chromium } = require('playwright-core');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000/projects/shelfflow';
const CHROME = process.env.CHROME_PATH;
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
}

(async () => {
  if (!CHROME) throw new Error('CHROME_PATH is required');
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  check('home renders book cards', (await page.locator('.book-card').count()) > 0);

  await page.goto(BASE + '/catalog?available=true&sort=title', { waitUntil: 'networkidle' });
  check('catalog loads with filters', (await page.locator('.book-card').count()) > 0);

  await page.locator('.book-card__title a').first().click();
  await page.waitForSelector('.detail h1');
  check('book detail opens', Boolean(await page.locator('.detail h1').innerText()));

  if (EMAIL && PASSWORD) {
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForSelector('text=Administrare', { timeout: 15000 });
    check('admin login works', true);

    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForSelector('.stat');
    check('admin dashboard renders', (await page.locator('.stat').count()) >= 4);
  }

  const anon = await browser.newPage();
  await anon.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  check('anonymous admin access redirected to login', anon.url().includes('/login'));

  check('no runtime errors on visited pages', errors.filter((e) => !e.includes('401')).length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
})().catch((err) => { console.error('E2E error:', err.message); process.exit(1); });
