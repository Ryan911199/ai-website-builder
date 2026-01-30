import { test, expect } from '@playwright/test';

test('sandpack preview integration', async ({ page }) => {
  // Mock the chat API
  await page.route('/api/chat', async route => {
    await route.fulfill({
      body: '0:"Here is some code:\\n```file:App.tsx\\nexport default function App() { return <div>Hello World</div> }\\n```"\n',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  });

  await page.goto('/chat');
  
  // Type a message
  await page.fill('textarea', 'Generate a react component');
  await page.click('button[type="submit"]');
  
  // Wait for the message to appear in the chat
  await expect(page.locator('text=Here is some code')).toBeVisible();
  
  // Click Preview button
  await page.click('button:has-text("Preview")');
  
  // Wait for Sandpack to load (it might take a while to bundle)
  // We can check for the Sandpack container
  await expect(page.locator('.sp-wrapper')).toBeVisible({ timeout: 10000 });
  
  // Take screenshot
  await page.screenshot({ path: 'e2e/sandpack-preview.png' });
});
