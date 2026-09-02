import { test, expect } from '@playwright/test';

/**
 * Self-service business listing + auth dead-end regression tests.
 *
 * Read-only by default. Set AGA_E2E_WRITE=1 to actually submit a listing
 * request (inserts an unverified row into the live `businesses` table that an
 * admin must reject/delete in /admin/moderation afterwards).
 *
 * The "signed-in user without a role" case needs credentials for an account
 * that is NOT linked to any hotel: AGA_E2E_NOROLE_EMAIL / AGA_E2E_NOROLE_PASSWORD.
 * It is skipped when they are absent.
 */

// Next's route announcer is also role="alert"; scope to our own <p>.
const formAlert = (page: import('@playwright/test').Page) => page.locator('p[role="alert"]');

test.describe('list your business', () => {
  test.use({ locale: 'el' });

  test('home CTA and footer both lead to the listing form', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'List your business', exact: true }).first().click();
    await expect(page).toHaveURL(/\/en\/list-your-business$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Put your business in front of travellers/ }),
    ).toBeVisible();

    await page.goto('/en/about');
    await page
      .getByRole('main')
      .getByRole('link', { name: 'List your business', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/list-your-business$/);
  });

  test('form renders in Greek at the unprefixed URL with live categories', async ({ page }) => {
    await page.goto('/list-your-business');
    await expect(
      page.getByRole('heading', { level: 1, name: /Βάλτε την επιχείρησή σας/ }),
    ).toBeVisible();
    const select = page.getByLabel(/Κατηγορία/);
    await expect(select).toBeVisible();
    // The placeholder option plus at least one real category from the DB.
    expect(await select.locator('option').count()).toBeGreaterThan(1);
    await expect(page.getByRole('button', { name: 'Αποστολή αίτησης' })).toBeVisible();
  });

  test('server-side validation highlights bad fields without submitting', async ({ page }) => {
    await page.goto('/en/list-your-business');
    await page.getByLabel(/Business name/).fill('X');
    await page.getByLabel(/Town \/ area/).fill('Naxos');
    await page.getByLabel(/Street address/).fill('Main street 1');
    await page.getByLabel(/Phone/).fill('123');
    await page.getByLabel('Email *').fill('not-an-email');
    await page.getByLabel(/Tell us about your place/).fill('too short');
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(formAlert(page)).toHaveText(/check the highlighted fields/i);
    await expect(page.getByLabel(/Business name/)).toHaveClass(/border-destructive/);
    await expect(page.getByLabel('Email *')).toHaveClass(/border-destructive/);
    await expect(page.getByLabel(/Category/)).toHaveClass(/border-destructive/);
  });

  test('a complete request is accepted', async ({ page }) => {
    test.skip(process.env.AGA_E2E_WRITE !== '1', 'Set AGA_E2E_WRITE=1 to write to the live DB');
    const stamp = Date.now();
    await page.goto('/en/list-your-business');
    await page.getByLabel(/Business name/).fill(`E2E Taverna ${stamp}`);
    await page.getByLabel(/Category/).selectOption({ index: 1 });
    await page.getByLabel(/Town \/ area/).fill('Chania, Crete');
    await page.getByLabel(/Street address/).fill('Akti Koundourioti 1');
    await page.getByLabel(/Phone/).fill('+30 28210 00000');
    await page.getByLabel('Email *').fill(`e2e-${stamp}@example.com`);
    await page.getByLabel(/Website/).fill('example.com');
    await page
      .getByLabel(/Tell us about your place/)
      .fill('Automated end-to-end test submission — safe to reject in moderation.');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('status')).toContainText('we received your request');
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

  test('signup page points businesses to the listing form', async ({ page }) => {
    await page.goto('/en/signup');
    await expect(page.getByRole('heading', { name: 'Create a hotel account' })).toBeVisible();
    await page.getByRole('link', { name: /send a listing request/ }).click();
    await expect(page).toHaveURL(/\/en\/list-your-business$/);
  });

  test('signed-in user without a hotel lands on /no-access instead of looping', async ({ page }) => {
    const email = process.env.AGA_E2E_NOROLE_EMAIL;
    const password = process.env.AGA_E2E_NOROLE_PASSWORD;
    test.skip(!email || !password, 'Set AGA_E2E_NOROLE_EMAIL / AGA_E2E_NOROLE_PASSWORD');

    await page.goto('/en/login?next=/owner');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel(/Password/).fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/no-access$/);
    await expect(
      page.getByRole('heading', { name: /not linked to a property yet/ }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'List your business' })).toBeVisible();

    // The header now reflects the session instead of offering "Sign in" again.
    await page.goto('/en');
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  });
});
