import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the hero section with Hello World heading', async ({ page }) => {
    // Wait for the globe image to load and trigger typing animation
    await page.waitForSelector('img[alt*="Earth from space"]');

    // Wait for typing animation to complete
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Hello World', { timeout: 5000 });
  });

  test('renders the Learn More button after typing completes', async ({ page }) => {
    await page.waitForSelector('img[alt*="Earth from space"]');

    const button = page.getByRole('button', { name: /learn more/i });
    await expect(button).toBeVisible({ timeout: 5000 });
  });

  test('scrolls to content when Learn More is clicked', async ({ page }) => {
    await page.waitForSelector('img[alt*="Earth from space"]');

    const button = page.getByRole('button', { name: /learn more/i });
    await button.click({ timeout: 5000 });

    // Content section should be in viewport
    const content = page.locator('#content');
    await expect(content).toBeVisible();
  });

  test('displays the language selector', async ({ page }) => {
    const selector = page.locator('#language-selector');
    await expect(selector).toBeVisible();
  });

  test('has proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Hello World Co-Op/i);
  });

  test('sunrise background changes on scroll', async ({ page }) => {
    // Get initial background
    const bgDiv = page.locator('.fixed.inset-0.-z-10');
    const initialBg = await bgDiv.evaluate((el) => el.style.background);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    await page.waitForTimeout(200);

    // Background should have changed
    const newBg = await bgDiv.evaluate((el) => el.style.background);
    expect(newBg).not.toBe(initialBg);
  });

  test('content sections render with CTA buttons', async ({ page }) => {
    // Scroll to content area
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    await page.waitForTimeout(500);

    // At least one CTA button should be visible in the content
    const ctaButtons = page.locator('main button');
    await expect(ctaButtons.first()).toBeVisible({ timeout: 5000 });
  });
});
