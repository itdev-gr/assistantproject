import { test, expect } from '@playwright/test';

/**
 * Hotel ⇄ business connection requests (owner side).
 *
 * Needs a demo hotel owner: AGA_E2E_OWNER_EMAIL / AGA_E2E_OWNER_PASSWORD
 * (skipped when absent). Read-only by default; set AGA_E2E_WRITE=1 to send a
 * request to the first listed business and withdraw it again (self-cleaning:
 * the row ends up `cancelled`, nothing is left pending).
 */
const OWNER_EMAIL = process.env.AGA_E2E_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.AGA_E2E_OWNER_PASSWORD;

test.describe('owner partners page', () => {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set AGA_E2E_OWNER_EMAIL / AGA_E2E_OWNER_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel('Email').fill(OWNER_EMAIL!);
    await page.getByLabel('Password').fill(OWNER_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/owner/);
  });

  test('shows the connection tabs and the finder', async ({ page }) => {
    await page.goto('/en/owner/partners');
    await expect(page.getByRole('heading', { level: 1, name: 'Partners' })).toBeVisible();
    for (const tab of ['Connected', 'Incoming', 'Sent', 'History', 'Find businesses']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${tab}`) })).toBeVisible();
    }
    await page.goto('/en/owner/partners?tab=find');
    await expect(page.getByLabel('Search businesses by name')).toBeVisible();
  });

  test('sends a request and withdraws it', async ({ page }) => {
    test.skip(process.env.AGA_E2E_WRITE !== '1', 'Set AGA_E2E_WRITE=1 to write to the live DB');
    await page.goto('/en/owner/partners?tab=find');
    const sendButtons = page.getByRole('button', { name: 'Send request' });
    test.skip((await sendButtons.count()) === 0, 'No business available to request');
    await sendButtons.first().click();
    await page.getByLabel('Message *').fill('E2E connection request — safe to ignore, withdrawn automatically.');
    await page.getByRole('button', { name: 'Send request' }).last().click();
    await expect(page.getByText('Request sent')).toBeVisible();

    await page.goto('/en/owner/partners?tab=sent');
    await expect(page.getByText('E2E connection request')).toBeVisible();
    await page.getByRole('button', { name: 'Withdraw' }).first().click();
    await expect(page.getByText('E2E connection request')).toHaveCount(0);
  });
});
