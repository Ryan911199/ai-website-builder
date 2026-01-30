import { test, expect } from '@playwright/test';

test('sandpack preview integration', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('/api/chat', async route => {
    await route.fulfill({
      body: '0:"Here is some code:\\n```file:App.tsx\\nexport default function App() { return <div>Hello World</div> }\\n```"\n',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  });

  await page.goto('/chat');
  
  await page.fill('textarea', 'Generate a react component');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Here is some code')).toBeVisible();
  
  await page.click('button:has-text("Preview")');
  
  await expect(page.locator('.sp-wrapper')).toBeVisible({ timeout: 10000 });
  
  await page.screenshot({ path: 'e2e/sandpack-preview.png' });
});
