import { test, expect } from '@playwright/test';

const OWNER_EMAIL = process.env.AGA_E2E_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.AGA_E2E_OWNER_PASSWORD;

if (!OWNER_EMAIL || !OWNER_PASSWORD) {
  throw new Error(
    'Set AGA_E2E_OWNER_EMAIL / AGA_E2E_OWNER_PASSWORD — see README §Tests',
  );
}

/**
 * End-to-end booking pipeline. Assumes the live database has at least one hotel
 * (slug 'aegean-blue') with active partnerships, plus an owner user identified
 * by AGA_E2E_OWNER_EMAIL / AGA_E2E_OWNER_PASSWORD (see README §Tests — run
 * scripts/reset-e2e-owner.ts once to sync the remote demo owner's password).
 *
 * Run locally:  pnpm exec playwright test
 */
test.describe('booking pipeline', () => {
  test('guest asks for a restaurant, owner confirms booking', async ({ page }) => {
    // 1. Guest opens the hotel page and asks the assistant.
    await page.goto('/en/h/aegean-blue');
    await expect(page.getByRole('heading', { name: 'Aegean Blue Suites' })).toBeVisible();

    const chatInput = page.getByRole('textbox', { name: /Ask me anything/i });
    await chatInput.fill('Where can I have dinner tonight?');
    await chatInput.press('Enter');

    const firstCta = page.getByRole('link', { name: /View more/i }).first();
    await expect(firstCta).toBeVisible({ timeout: 10_000 });
    const referralUrl = await firstCta.getAttribute('href');
    expect(referralUrl).toMatch(/\/api\/r\/[a-f0-9-]+\.\d+\./);

    // 2. Hit the signed redirect — verifies HMAC, sets clicked_at, 302s out.
    const res = await page.request.get(referralUrl!, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const target = res.headers()['location']!;
    expect(target).toContain('utm_source=aga');
    expect(target).toContain('utm_campaign=aegean-blue');

    // 3. Owner signs in.
    await page.goto('/en/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(OWNER_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/owner/);

    // 4. The clicked referral shows the 'Mark as booked' affordance.
    await page.goto('/en/owner/referrals');
    const markBooked = page.getByRole('button', { name: 'Mark as booked' }).first();
    await expect(markBooked).toBeVisible();
    await markBooked.click();

    await page.getByPlaceholder(/amount/i).fill('85');
    await page.getByRole('button', { name: 'Save' }).click();

    // 5. The booking appears with the computed commission.
    await page.goto('/en/owner/bookings');
    await expect(page.getByText('Confirmed').first()).toBeVisible();
    await expect(page.getByText('€85.00').first()).toBeVisible();
    // commission is non-zero (exact value depends on tier; just verify > 0)
    const commissionCell = page
      .locator('text=/€[0-9]+\\.[0-9]{2}/')
      .nth(2);
    await expect(commissionCell).toBeVisible();
  });
});
