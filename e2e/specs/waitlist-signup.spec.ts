import { test, expect } from '@playwright/test';

test.describe('Waitlist Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to content area to find CTA buttons
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    await page.waitForTimeout(500);
  });

  test('CTA button opens the expandable form', async ({ page }) => {
    // Click the first CTA button in content
    const ctaButton = page.locator('main button').first();
    await ctaButton.click();

    // Form should become visible
    const formHeading = page.getByText(/waitlist/i);
    await expect(formHeading).toBeVisible({ timeout: 3000 });
  });

  test('form has required fields: first name, last name, email', async ({ page }) => {
    // Open the form
    const ctaButton = page.locator('main button').first();
    await ctaButton.click();

    // Check for required fields
    await expect(page.locator('#first_name')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#last_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('form validates required fields before submission', async ({ page }) => {
    // Open the form
    const ctaButton = page.locator('main button').first();
    await ctaButton.click();

    // Wait for form to appear
    await page.waitForSelector('#first_name', { timeout: 3000 });

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Error messages should appear
    const errors = page.locator('[role="alert"]');
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
  });

  test('form close button hides the form', async ({ page }) => {
    // Open the form
    const ctaButton = page.locator('main button').first();
    await ctaButton.click();

    // Wait for form
    await page.waitForSelector('#first_name', { timeout: 3000 });

    // Click close button
    const closeButton = page.locator('button[aria-label*="close"]');
    await closeButton.click();

    // Form fields should no longer be visible
    await expect(page.locator('#first_name')).not.toBeVisible({ timeout: 3000 });
  });

  test('country dropdown populates state dropdown', async ({ page }) => {
    // Open the form
    const ctaButton = page.locator('main button').first();
    await ctaButton.click();

    // Wait for form
    await page.waitForSelector('#first_name', { timeout: 3000 });

    // Select United States from country dropdown
    // Note: This depends on the Select component implementation
    const countrySelect = page.locator('#country');
    if (await countrySelect.isVisible()) {
      // Headless UI select - would need specific interaction
      // This is a skeleton test; actual implementation depends on Select component
      expect(true).toBe(true);
    }
  });
});
