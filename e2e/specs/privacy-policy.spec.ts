import { test, expect } from '@playwright/test';

test.describe('Privacy Policy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy-policy');
  });

  test('renders the privacy policy page', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Privacy Policy', level: 1 });
    await expect(heading).toBeVisible();
  });

  test('displays all required GDPR sections', async ({ page }) => {
    // Key sections per GDPR requirements
    await expect(page.getByText('Introduction')).toBeVisible();
    await expect(page.getByText('What Data We Collect')).toBeVisible();
    await expect(page.getByText('How We Use Your Data')).toBeVisible();
    await expect(page.getByText('Data Retention')).toBeVisible();
    await expect(page.getByText('Data Security')).toBeVisible();
    await expect(page.getByText(/Your Rights/)).toBeVisible();
    await expect(page.getByText('Contact Us')).toBeVisible();
  });

  test('has working contact email links', async ({ page }) => {
    const emailLinks = page.locator('a[href="mailto:privacy@helloworlddao.com"]');
    await expect(emailLinks.first()).toBeVisible();
  });

  test('has external link to Persona privacy policy', async ({ page }) => {
    const personaLink = page.locator('a[href*="withpersona.com"]');
    await expect(personaLink).toBeVisible();
    await expect(personaLink).toHaveAttribute('target', '_blank');
    await expect(personaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('back button navigates back', async ({ page }) => {
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

  test('has proper page structure with header, main, and footer', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('footer displays current year', async ({ page }) => {
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator('footer')).toContainText(currentYear);
  });
});
