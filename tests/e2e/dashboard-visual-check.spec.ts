/**
 * Visual sweep of the restyled admin & owner dashboards.
 * Logs in with the throwaway test accounts (AGA_TEST_* env) and captures a
 * screenshot of every dashboard page, desktop and one mobile drawer shot.
 * Not part of the regular e2e suite: run explicitly with
 *   pnpm exec playwright test dashboard-visual-check
 */
import { test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.AGA_TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.AGA_TEST_ADMIN_PASSWORD!;
const OWNER_EMAIL = process.env.AGA_TEST_OWNER_EMAIL!;
const OWNER_PASSWORD = process.env.AGA_TEST_OWNER_PASSWORD!;
const OUT = process.env.AGA_SHOT_DIR ?? 'test-results/dashboard-shots';

// Opt-in sweep: skip silently when the test-account credentials are not set,
// so the regular `pnpm test:e2e` run is unaffected.
test.skip(
  !ADMIN_EMAIL || !ADMIN_PASSWORD || !OWNER_EMAIL || !OWNER_PASSWORD,
  'Set AGA_TEST_ADMIN_* / AGA_TEST_OWNER_* to run the dashboard visual sweep',
);

async function login(page: Page, email: string, password: string) {
  await page.goto('/el/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: /Κωδικός|Password/ }).fill(password);
  await page.getByRole('button', { name: /Είσοδος|Sign in/ }).click();
  await page.waitForURL(/\/(admin|owner)/, { timeout: 20_000 });
}

async function shoot(page: Page, path: string, name: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

test.describe('dashboard visual sweep', () => {
  test('admin pages', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await shoot(page, '/el/admin', 'admin-01-tenants');
    await shoot(page, '/el/admin/businesses', 'admin-02-businesses');
    await shoot(page, '/el/admin/categories', 'admin-03-categories');
    await shoot(page, '/el/admin/partnerships', 'admin-04-partnerships');
    await shoot(page, '/el/admin/moderation', 'admin-05-moderation');
    await shoot(page, '/el/admin/rules', 'admin-06-rules');
    await shoot(page, '/el/admin/flags', 'admin-07-flags');
    await shoot(page, '/el/admin/usage', 'admin-08-usage');
    await shoot(page, '/el/admin/new-tenant', 'admin-09-new-tenant');
    await shoot(page, '/el/admin/businesses/new', 'admin-10-new-business');
  });

  test('owner pages', async ({ page }) => {
    test.setTimeout(240_000);
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await shoot(page, '/el/owner', 'owner-01-dashboard');
    await shoot(page, '/el/owner/property', 'owner-02-property');
    await shoot(page, '/el/owner/faqs', 'owner-03-faqs');
    await shoot(page, '/el/owner/amenities', 'owner-04-amenities');
    await shoot(page, '/el/owner/hours', 'owner-05-hours');
    await shoot(page, '/el/owner/policies', 'owner-06-policies');
    await shoot(page, '/el/owner/rooms', 'owner-07-rooms');
    await shoot(page, '/el/owner/referrals', 'owner-08-referrals');
    await shoot(page, '/el/owner/bookings', 'owner-09-bookings');
    await shoot(page, '/el/owner/billing', 'owner-10-billing');
    await shoot(page, '/el/owner/settings', 'owner-11-settings');
    await shoot(page, '/el/owner/faqs/new', 'owner-12-faq-new');
  });

  test('mobile drawer', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto('/el/owner');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT}/mobile-01-topbar.png` });
    await page.getByRole('button', { name: 'RoomRVI' }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/mobile-02-drawer.png` });
  });
});
