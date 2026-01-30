import { test, expect } from '@playwright/test';

test.describe('Chat UI', () => {
  test('should allow user to send a message and receive a streaming response', async ({ page }) => {
    page.on('console', msg => console.log(`Browser log: ${msg.text()}`));
    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();

    const message = 'Create a portfolio website';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(message)).toBeVisible();

    await expect(page.getByText('Here is a mock response')).toBeVisible();
    
    await expect(page.locator('pre code')).toBeVisible();
    await expect(page.getByText("console.log('Hello World');")).toBeVisible();

    await page.screenshot({ path: '.sisyphus/evidence/chat-ui-success.png' });
  });

  test('should support mobile sidebar toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    await expect(page.locator('header button')).toBeVisible();

    await page.click('header button');

    await expect(page.getByText('New Project')).toBeVisible();

    await page.mouse.click(300, 300);

    await page.waitForTimeout(300);
  });
});
