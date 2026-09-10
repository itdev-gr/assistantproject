import { test, expect } from '@playwright/test';

test.describe('pricing page', () => {
  test.use({ locale: 'el' });

  test('footer links to /pricing and the three plans render with euro amounts', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Pricing', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/pricing$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('every traveller');

    for (const [tier, amount] of [['standard', '29'], ['featured', '59'], ['exclusive', '99']] as const) {
      const card = page.getByTestId(`plan-${tier}`);
      await expect(card).toBeVisible();
      await expect(card).toContainText(amount);
    }
  });

  test('plan CTA deep-links into partner signup with the plan preselected', async ({ page }) => {
    await page.goto('/en/pricing');
    await page.getByTestId('plan-exclusive').getByRole('link', { name: /Choose/ }).click();
    await expect(page).toHaveURL(/\/en\/signup\?role=partner&plan=exclusive$/);
    await expect(page.getByRole('radio', { name: /Exclusive/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('renders in Greek at the unprefixed URL', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ένα πλάνο');
    await expect(page.getByTestId('plan-featured')).toContainText('Δημοφιλέστερο');
  });
});
