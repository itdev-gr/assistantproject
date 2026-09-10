import { test, expect } from '@playwright/test';

/**
 * Self-service business listing + auth dead-end regression tests.
 *
 * Read-only: nothing here writes to the live database.
 *
 * The "signed-in user without a role" case needs credentials for an account
 * that is NOT linked to any hotel: AGA_E2E_NOROLE_EMAIL / AGA_E2E_NOROLE_PASSWORD.
 * It is skipped when they are absent.
 */

// Next's route announcer is also role="alert"; scope to our own <p>.
const formAlert = (page: import('@playwright/test').Page) => page.locator('p[role="alert"]');

test.describe('list your business', () => {
  test.use({ locale: 'el' });

  test('home CTA and footer both lead to partner signup', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'List your business', exact: true }).first().click();
    await expect(page).toHaveURL(/\/en\/signup\?role=partner$/);
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Partner/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel(/Business name/)).toBeVisible();

    await page.goto('/en');
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'List your business', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/signup\?role=partner$/);
  });

  test('the old /list-your-business URL redirects to partner signup', async ({ page }) => {
    await page.goto('/list-your-business');
    await expect(page).toHaveURL(/\/signup\?role=partner$/);
    await page.goto('/en/list-your-business');
    await expect(page).toHaveURL(/\/en\/signup\?role=partner$/);
  });

  test('partner signup asks for a plan and preselects it from ?plan=', async ({ page }) => {
    await page.goto('/en/signup?plan=featured');
    await expect(page.getByRole('button', { name: /Partner/ })).toHaveAttribute('aria-pressed', 'true');
    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(3);
    await expect(page.getByRole('radio', { name: /Featured/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: /Standard/ })).toContainText('29');
  });
});

test.describe('auth dead ends', () => {
  test.use({ locale: 'el' });

  test('anonymous visit to /owner goes to login, not a blank page', async ({ page }) => {
    await page.goto('/en/owner');
    await expect(page).toHaveURL(/\/login\?next=%2Fowner/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('login page translates known error codes', async ({ page }) => {
    await page.goto('/login?error=no_hotel');
    await expect(formAlert(page)).toContainText('δεν είναι ακόμη συνδεδεμένος');
  });

  test('signup page offers visitor and partner accounts', async ({ page }) => {
    await page.goto('/en/signup');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Visitor/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Partner/ }).click();
    await expect(page.getByLabel(/Business name/)).toBeVisible();
    await expect(page.getByLabel(/Category/)).toBeVisible();
  });
});
