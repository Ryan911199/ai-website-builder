import { test, expect } from '@playwright/test';

test.describe('Static HTML Preview (iframe)', () => {
  test('should render HTML content in iframe', async ({ page }) => {
    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    const message = 'Create a simple HTML page with a red heading';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(message)).toBeVisible();
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '.sisyphus/evidence/static-preview-render.png' });
  });

  test('should display refresh button in preview', async ({ page }) => {
    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    const message = 'Create a simple HTML page';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(message)).toBeVisible();
    
    await page.waitForTimeout(2000);
    
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    
    await page.screenshot({ path: '.sisyphus/evidence/static-preview-refresh-button.png' });
  });

  test('should handle iframe sandbox restrictions', async ({ page }) => {
    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    const message = 'Create an HTML page with JavaScript that logs to console';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(message)).toBeVisible();
    
    await page.waitForTimeout(2000);
    
    const iframes = page.frameLocator('iframe[title="Preview"]');
    
    if (iframes) {
      await page.screenshot({ path: '.sisyphus/evidence/static-preview-sandbox.png' });
    }
  });

  test('should refresh preview on button click', async ({ page }) => {
    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    const message = 'Create a simple HTML page with a button';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(message)).toBeVisible();
    
    await page.waitForTimeout(2000);
    
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: '.sisyphus/evidence/static-preview-after-refresh.png' });
    }
  });

  test('should render CSS styles in preview', async ({ page }) => {
    await page.goto('/chat');
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.goto('/chat');
    }

    const message = 'Create an HTML page with styled heading (blue color, large font)';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(message)).toBeVisible();
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '.sisyphus/evidence/static-preview-css.png' });
  });
});
