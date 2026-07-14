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

test.describe('about page redesign', () => {
  test('hero image and new sections render', async ({ page }) => {
    await page.goto('/en/about');
    await expect(page.locator('img[src*="about-hero"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Our story' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What we stand by' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Questions, answered' }),
    ).toBeVisible();
  });

  test('FAQ answers are in the DOM before interaction and toggle open', async ({ page }) => {
    await page.goto('/en/about');
    const firstAnswer = page.getByText(
      'Yes — browsing the guide and the recommendations are completely free',
    );
    // Present in the DOM for crawlers even while collapsed.
    await expect(firstAnswer).toBeAttached();
    const firstQuestion = page.getByText('Is the guide free for visitors?');
    await firstQuestion.click();
    await expect(firstAnswer).toBeVisible();
  });
});

test.describe('about page SEO', () => {
  test('has hreflang alternates and canonical', async ({ page }) => {
    await page.goto('/en/about');
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toBeAttached();
    await expect(page.locator('link[rel="alternate"][hreflang="el"]')).toBeAttached();
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toBeAttached();
    await expect(page.locator('link[rel="canonical"]')).toBeAttached();
  });

  test('has OpenGraph image and JSON-LD structured data', async ({ page }) => {
    await page.goto('/en/about');
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toBeAttached();
    expect(await ogImage.getAttribute('content')).toContain('about-hero');

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const parsed = scripts.map((s) => JSON.parse(s));
    const types = parsed.map((p) => p['@type']);
    expect(types).toContain('AboutPage');
    expect(types).toContain('FAQPage');
    const faq = parsed.find((p) => p['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(6);
    expect(faq.mainEntity[0]['@type']).toBe('Question');
  });
});
