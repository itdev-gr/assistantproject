import { test, expect } from '@playwright/test';

test.describe('about page', () => {
  test.use({ locale: 'el' });

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

test.describe('about page navigation', () => {
  test('header menu link navigates to the about page', async ({ page }) => {
    await page.goto('/en');
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'About', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Built on the island/ }),
    ).toBeVisible();
  });

  test('footer contains the about link', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'About us' }),
    ).toBeVisible();
  });
});

test.describe('about page navigation on small screens', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('header fits at 375px with About link and Sign in visible, no horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/en/about');

    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'About', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Sign in' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('about page navigation on small screens (Greek locale)', () => {
  test.use({ locale: 'el', viewport: { width: 375, height: 667 } });

  test('Greek header fits at 375px with Σχετικά link and Είσοδος visible, no horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/about');

    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Σχετικά', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Είσοδος' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
