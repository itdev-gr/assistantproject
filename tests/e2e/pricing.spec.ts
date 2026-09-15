import { test, expect } from '@playwright/test';

test.describe('pricing page', () => {
  test.use({ locale: 'el' });

  test('footer links to /pricing and every package renders with its yearly euro amount', async ({
    page,
  }) => {
    await page.goto('/en');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Pricing', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/pricing$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('local businesses');

    // Hotels (en-IE formatting: €1,490)
    for (const [plan, amount] of [
      ['basic', '990'],
      ['professional', '1,490'],
      ['advanced', '1,990'],
      ['enterprise', '2,990'],
    ] as const) {
      const card = page.getByTestId(`hotel-plan-${plan}`);
      await expect(card).toBeVisible();
      await expect(card).toContainText(amount);
      await expect(card).toContainText('/ year');
    }
    await expect(page.getByTestId('hotel-plan-accommodation')).toContainText('149');

    // Businesses
    await expect(page.getByTestId('plan-standard')).toContainText('149');
    await expect(page.getByTestId('plan-featured')).toContainText('299');
    await expect(page.getByTestId('plan-featured')).toContainText('Premium Partner');
    await expect(page.getByTestId('plan-exclusive')).toHaveCount(0);

    // Launch offer + commission sections
    await expect(page.getByTestId('launch-offer')).toContainText('50');
    await expect(page.getByTestId('launch-offer')).toContainText('990');
    await expect(page.getByTestId('commission')).toContainText('10%');
  });

  test('business CTA deep-links into partner signup with the plan preselected', async ({
    page,
  }) => {
    await page.goto('/en/pricing');
    await page
      .getByTestId('plan-featured')
      .getByRole('link', { name: /Choose/ })
      .click();
    await expect(page).toHaveURL(/\/en\/signup\?role=partner&plan=featured$/);
    await expect(page.getByRole('radio', { name: /Premium Partner/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('renders in Greek at the unprefixed URL with Greek number formatting', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Πλάνα για');
    await expect(page.getByTestId('hotel-plan-professional')).toContainText('1.490');
    await expect(page.getByTestId('hotel-plan-professional')).toContainText('Δημοφιλέστερο');
    await expect(page.getByTestId('plan-featured')).toContainText('Δημοφιλέστερο');
    await expect(page.getByTestId('commission')).toContainText('Έως 10%');
  });
});
