import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const store = 'http://localhost:5174',
  admin = 'http://localhost:5175',
  api = 'http://localhost:8081/api';
async function login(page, url, email) {
  await page.goto(`${url}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('NovaraDemo!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function token(request, role) {
  const r = await request.post(`${api}/auth/login`, {
    data: { email: `${role}@novara.demo`, password: 'NovaraDemo!2026' },
  });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).accessToken;
}
async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // Exercise lazy-loaded images before checking their decoded dimensions.
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

test('customer purchases, staff fulfills, customer sees delivery', async ({ page, browser, request }) => {
  const stamp = Date.now();
  const email = `browser-${stamp}@example.test`;
  await page.goto(`${store}/register`);
  await page.getByLabel('Full name').fill('Taylor Browser');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest!2026');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(`${store}/account`);
  await page.goto(`${store}/products/10`);
  await expect(page.getByRole('heading', { name: 'USB-C Power Adapter', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.goto(`${store}/cart`);
  await expect(page.getByRole('heading', { name: 'USB-C Power Adapter' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByLabel('Phone number').fill('4155550199');
  await page.getByLabel('Street address').fill('430 Pine Street');
  await page.getByLabel('City', { exact: true }).fill('San Francisco');
  await page.getByLabel('State / region').fill('California');
  await page.getByLabel('Postal code').fill('94103');
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Good things are on their way.' })).toBeVisible();
  const orderId = Number(page.url().match(/orders\/(\d+)/)[1]);
  await expect(page.getByText('$38.95').first()).toBeVisible();
  const context = await browser.newContext();
  const oms = await context.newPage();
  await login(oms, admin, 'staff@novara.demo');
  await oms.goto(`${admin}/orders/${orderId}`);
  await oms.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await oms.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(oms.getByRole('button', { name: 'Start processing', exact: true })).toBeVisible();
  await oms.getByRole('button', { name: 'Start processing', exact: true }).click();
  await oms.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(oms.getByRole('button', { name: 'Create shipment', exact: true })).toBeVisible();
  await oms.getByRole('button', { name: 'Create shipment', exact: true }).click();
  await oms.getByRole('dialog').getByRole('button', { name: 'Create shipment', exact: true }).click();
  await expect(oms.getByRole('button', { name: 'Mark as shipped', exact: true })).toBeVisible();
  await oms.getByRole('button', { name: 'Mark as shipped', exact: true }).click();
  await oms.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(oms.getByRole('button', { name: 'Mark as delivered', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('NOVARA Express', { exact: true })).toBeVisible();
  await expect(page.locator('.page-heading .status')).toHaveText('Shipped');
  await oms.getByRole('button', { name: 'Mark as delivered', exact: true }).click();
  await oms.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(oms.locator('.page-heading .status')).toHaveText('Delivered');
  await page.reload();
  await expect(page.locator('.page-heading .status')).toHaveText('Delivered');
  await context.close();
});

test('declined checkout can be retried and cancellation restores stock', async ({ page, request }) => {
  const before = await (await request.get(`${api}/products/10`)).json();
  await login(page, store, 'customer@novara.demo');
  await page.goto(`${store}/products/10`);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.goto(`${store}/checkout`);
  await page.getByLabel('Phone number').fill('4155550190');
  await page.getByLabel('Street address').fill('20 Market Street');
  await page.getByLabel('City', { exact: true }).fill('San Francisco');
  await page.getByLabel('State / region').fill('California');
  await page.getByLabel('Postal code').fill('94103');
  await page.getByLabel('Demo payment outcome').selectOption('DECLINE');
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved. Payment needs attention.' })).toBeVisible();
  expect((await (await request.get(`${api}/products/10`)).json()).stock).toBe(before.stock);
  await page.getByRole('button', { name: 'Retry simulated payment' }).click();
  await expect(page.getByRole('button', { name: 'Retry simulated payment' })).not.toBeVisible();
  expect((await (await request.get(`${api}/products/10`)).json()).stock).toBe(before.stock - 1);
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await page.getByLabel('Reason', { exact: true }).fill('Browser cancellation check');
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.locator('.page-heading .status')).toHaveText('Cancelled');
  expect((await (await request.get(`${api}/products/10`)).json()).stock).toBe(before.stock);
});

test('manager creates product, uploads an image and adjusts stock', async ({ page }) => {
  await login(page, admin, 'manager@novara.demo');
  await page.goto(`${admin}/products/new`);
  const name = `Browser Desk Hub ${Date.now()}`;
  await page.getByLabel('Product name', { exact: true }).fill(name);
  await page
    .getByLabel('Description', { exact: true })
    .fill('Compact USB-C hub for connecting a daily desk setup.');
  await page.getByLabel('Specifications', { exact: true }).fill('Ports: 4|Connection: USB-C');
  await page.getByLabel('SKU', { exact: true }).fill(`BROWSER-${Date.now()}`);
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Accessories' });
  await page.getByLabel('Price (USD)').fill('49.95');
  await page
    .getByLabel('Upload product image')
    .setInputFiles('backend/src/main/resources/static/media/catalog/nv-mon-27-0.jpg');
  await expect(page.locator('.image-editor img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page).toHaveURL(`${admin}/products`);
  await page.getByRole('link', { name: 'Inventory', exact: true }).click();
  await page.getByLabel('Search inventory').fill(name);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Adjust stock', exact: true }).click();
  await page.getByLabel('Quantity change').fill('12');
  await page.getByLabel('Reason', { exact: true }).fill('Browser stock-in check');
  await page.getByRole('button', { name: 'Record adjustment' }).click();
  await expect(page.locator('tbody tr')).toContainText('12');
  await page.getByRole('button', { name: 'Movement history', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Browser stock-in check');
  // Leave the demo catalog curated: retain the audit trail but archive the test product.
  await page.goto(`${admin}/products`);
  await page.getByLabel('Search products').fill(name);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page
    .locator('tbody tr')
    .filter({ hasText: name })
    .getByRole('link', { name: 'Edit', exact: true })
    .click();
  await page.getByRole('button', { name: 'Deactivate product' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(page).toHaveURL(`${admin}/products`);
});

test('catalog search, filtering, sorting, quantity and newsletter work', async ({ page }) => {
  await page.goto(store);
  await page.getByLabel('Search products', { exact: true }).fill('AirPods');
  await page.getByRole('button', { name: 'Submit search' }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByLabel('Sort products').selectOption('price,asc');
  await expect(page.locator('.product-card h3').first()).toHaveText('Apple AirPods');
  await page.getByRole('button', { name: 'Add Apple AirPods to cart', exact: true }).click();
  await page.goto(`${store}/cart`);
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(page.locator('.quantity>span')).toHaveText('2');
  await page.getByRole('button', { name: 'Remove Apple AirPods', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make room for something good' })).toBeVisible();
  await page.getByLabel('Newsletter email').fill(`newsletter-${Date.now()}@example.test`);
  await page.getByRole('button', { name: 'Keep me posted' }).click();
  await expect(page.getByRole('status')).toContainText('Thanks for subscribing');
});

test('all pages render at desktop, tablet and mobile without overflow or failed images', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  await fs.mkdir('.runtime/screenshots', { recursive: true });
  const customerToken = await token(request, 'customer');
  const orderData = await (
    await request.get(`${api}/orders/my-orders`, { headers: { Authorization: `Bearer ${customerToken}` } })
  ).json();
  const orderId = orderData.content[0].id;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, store, 'customer@novara.demo');
  await page.goto(`${store}/products/10`);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  const storeRoutes = [
    '/',
    '/products',
    '/products/1',
    '/cart',
    '/checkout',
    '/account',
    '/account/orders',
    '/account/addresses',
    `/account/orders/${orderId}`,
    '/help',
  ];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const route of storeRoutes) {
      await page.goto(store + route);
      await settle(page);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `store ${route} ${width}`,
      ).toBeTruthy();
      expect(
        await page
          .locator('img')
          .evaluateAll((imgs) => imgs.filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src)),
        `images ${route}`,
      ).toEqual([]);
      if (
        [
          '/',
          '/products',
          '/products/1',
          '/cart',
          '/checkout',
          '/account',
          `/account/orders/${orderId}`,
        ].includes(route)
      )
        await page.screenshot({
          path: `.runtime/screenshots/store-${route === '/' ? 'home' : route.replaceAll('/', '-')}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, admin, 'admin@novara.demo');
  const routes = [
    '/',
    '/orders',
    `/orders/${orderId}`,
    '/products',
    '/products/1',
    '/inventory',
    '/customers',
    '/customers/4',
    '/payments',
    '/shipments',
    '/analytics',
    '/users',
  ];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const route of routes) {
      await page.goto(admin + route);
      await settle(page);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('.error-box')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `admin ${route} ${width}`,
      ).toBeTruthy();
      expect(
        await page
          .locator('img')
          .evaluateAll((imgs) => imgs.filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src)),
        `images ${route}`,
      ).toEqual([]);
      if (['/', '/orders', '/products', '/inventory'].includes(route))
        await page.screenshot({
          path: `.runtime/screenshots/admin-${route === '/' ? 'overview' : route.replaceAll('/', '-')}-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
