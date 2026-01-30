import { test, expect } from '@playwright/test';

test('provider switching and settings', async ({ page }) => {
  let settings = {
    claudeApiKey: '',
    minimaxApiKey: '',
    selectedProvider: 'claude',
  };

  // Mock settings API
  await page.route('/api/settings', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: settings,
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      settings = { ...settings, ...body };
      await route.fulfill({
        json: { success: true },
      });
    }
  });

  // Mock chat API
  await page.route('/api/chat', async (route) => {
    await route.fulfill({
      json: {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello from the selected provider!',
      },
    });
  });

  // 0. Login
  await page.goto('/login');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  // 1. Go to settings
  await page.goto('/settings');
  
  // 2. Fill in keys
  await page.fill('input[placeholder="sk-ant-..."]', 'sk-ant-test-key');
  await page.fill('input[placeholder="Enter your MiniMax API key"]', 'minimax-test-key');
  
  // 3. Select provider
  await page.click('button[role="combobox"]'); // The Select trigger
  await page.click('div[role="option"]:has-text("MiniMax")');
  
  // 4. Save
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect(page.getByText('Settings saved successfully')).toBeVisible();

  // 5. Go to chat
  await page.goto('/chat');
  
  // 6. Verify provider selector
  // The selector is a combobox with the current value
  const selector = page.getByRole('combobox').first();
  await expect(selector).toContainText('MiniMax');
  
  // Verify status indicator
  await expect(page.getByText('Ready')).toBeVisible();
  
  // 7. Switch provider in chat
  await selector.click();
  await page.getByRole('option', { name: 'Anthropic (Claude)' }).click();
  await expect(selector).toContainText('Anthropic (Claude)');
});
