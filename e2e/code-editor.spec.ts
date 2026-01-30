import { test, expect } from '@playwright/test';

test('code editor displays files from AI response', async ({ page }) => {
  test.setTimeout(60000);

  await page.route('/api/chat', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'Here is the code:\n```file:test.tsx\nconsole.log("hello")\n```',
    });
  });

  await page.goto('/chat');
  
  await page.waitForSelector('textarea');
  await page.fill('textarea', 'Generate code');
  await page.click('button[type="submit"]');

  await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('test.tsx')).toBeVisible();
  await expect(page.locator('.cm-content')).toContainText('console.log("hello")');
});
