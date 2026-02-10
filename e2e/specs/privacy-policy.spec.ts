import { test, expect } from '@playwright/test';

test.describe('Privacy Policy Page', () => {
  test('loads privacy policy page directly', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
  });

  test('displays required sections', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.getByText(/data collection/i)).toBeVisible();
    await expect(page.getByText(/your rights/i)).toBeVisible();
  });

  test.skip('displays all required GDPR sections', async ({ page }) => {
    await page.goto('/privacy-policy');
    // Key sections per GDPR requirements
    await expect(page.getByText('Introduction')).toBeVisible();
    await expect(page.getByText('What Data We Collect')).toBeVisible();
    await expect(page.getByText('How We Use Your Data')).toBeVisible();
    await expect(page.getByText('Data Retention')).toBeVisible();
    await expect(page.getByText('Data Security')).toBeVisible();
    await expect(page.getByText(/Your Rights/)).toBeVisible();
    await expect(page.getByText('Contact Us')).toBeVisible();
  });

  test.skip('has working contact email links', async ({ page }) => {
    await page.goto('/privacy-policy');
    const emailLinks = page.locator('a[href="mailto:privacy@helloworlddao.com"]');
    await expect(emailLinks.first()).toBeVisible();
  });

  test.skip('has external link to Persona privacy policy', async ({ page }) => {
    await page.goto('/privacy-policy');
    const personaLink = page.locator('a[href*="withpersona.com"]');
    await expect(personaLink).toBeVisible();
    await expect(personaLink).toHaveAttribute('target', '_blank');
    await expect(personaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test.skip('back button navigates back', async ({ page }) => {
    // First navigate to landing page, then to privacy policy
    await page.goto('/');
    await page.goto('/privacy-policy');

    const backButton = page.getByRole('button', { name: /back/i });
    await expect(backButton).toBeVisible();

    await backButton.click();

    // Should navigate back to landing page
    await page.waitForURL('/');
    expect(page.url()).toContain('/');
  });

  test.skip('has proper page structure with header, main, and footer', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test.skip('footer displays current year', async ({ page }) => {
    await page.goto('/privacy-policy');
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator('footer')).toContainText(currentYear);
  });
});
