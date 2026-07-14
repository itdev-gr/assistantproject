import { test, expect } from '@playwright/test';

test.describe('about page', () => {
  test('renders the story in English', async ({ page }) => {
    await page.goto('/en/about');
    await expect(
      page.getByRole('heading', { level: 1, name: /Built on the island/ }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    // Scoped to main: the footer also has a 'List your business' link, and an
    // unscoped locator matching two elements is a Playwright strict-mode error.
    await expect(
      page.getByRole('main').getByRole('link', { name: 'List your business' }),
    ).toBeVisible();
  });

  test('renders the story in Greek at the unprefixed URL', async ({ page }) => {
    await page.goto('/about');
    await expect(
      page.getByRole('heading', { level: 1, name: /Φτιαγμένο στο νησί/ }),
    ).toBeVisible();
  });
});
