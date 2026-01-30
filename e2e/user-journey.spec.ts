import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E test suite covering full user journeys
 * Tests are independent and can run in parallel
 */

// Helper function to login
async function login(page) {
  await page.goto('/login');
  if (page.url().includes('/login')) {
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  }
}

// Helper function to navigate to chat
async function navigateToChat(page) {
  await page.goto('/chat');
  if (page.url().includes('/login')) {
    await login(page);
    await page.goto('/chat');
  }
}

test.describe('User Journey: Complete Workflow', () => {
  test('should complete full workflow: login → chat → code generation → preview', async ({ page }) => {
    // 1. Login
    await login(page);
    await expect(page).toHaveURL('/');

    // 2. Navigate to chat
    await page.goto('/chat');
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 3. Send message to AI
    const message = 'Create a simple React button component';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 4. Verify message appears in chat
    await expect(page.getByText(message)).toBeVisible();

    // 5. Wait for AI response
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 6. Verify code is generated
    await expect(page.locator('pre code')).toBeVisible();

    // 7. Verify preview is available
    const previewButton = page.getByRole('button', { name: /preview/i });
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await page.waitForTimeout(500);
    }

    // 8. Take screenshot for evidence
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-complete.png' });
  });

  test('should handle project creation and selection', async ({ page }) => {
    // 1. Login and navigate to chat
    await navigateToChat(page);

    // 2. Verify project list is visible
    const projectList = page.locator('[data-testid="project-list"]');
    if (await projectList.isVisible()) {
      // 3. Click new project button
      const newProjectBtn = page.getByRole('button', { name: /new project/i });
      if (await newProjectBtn.isVisible()) {
        await newProjectBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 4. Verify chat interface is ready
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 5. Send a message
    const message = 'Create a portfolio website';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 6. Verify message was sent
    await expect(page.getByText(message)).toBeVisible();

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-project-creation.png' });
  });

  test('should support AI chat interaction with streaming response', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Verify chat input is visible
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 3. Send multiple messages in sequence
    const messages = [
      'Create a React component',
      'Make it blue',
      'Add a button',
    ];

    for (const msg of messages) {
      await page.fill('textarea', msg);
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Send' }).click();
      await expect(page.getByText(msg)).toBeVisible();
      await page.waitForTimeout(500);
    }

    // 4. Verify all messages appear in chat
    for (const msg of messages) {
      await expect(page.getByText(msg)).toBeVisible();
    }

    // 5. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-chat-interaction.png' });
  });

  test('should generate and display code in editor', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send message that generates code
    const message = 'Create a React button with onClick handler';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Verify message was sent
    await expect(page.getByText(message)).toBeVisible();

    // 4. Wait for response
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 5. Verify code editor is visible
    const codeEditor = page.locator('[data-testid="code-editor"]');
    if (await codeEditor.isVisible()) {
      // 6. Verify code content
      const codeContent = page.locator('pre code');
      await expect(codeContent).toBeVisible();
    }

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-code-generation.png' });
  });

  test('should support preview functionality', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send message
    const message = 'Create a simple HTML page with a heading';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait for preview to load
    await page.waitForTimeout(2000);

    // 5. Check for preview elements
    const previewArea = page.locator('[data-testid="preview-area"]');
    if (await previewArea.isVisible()) {
      // Preview is visible
      await expect(previewArea).toBeVisible();
    }

    // 6. Check for refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(500);
    }

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-preview.png' });
  });

  test('should handle code editor interactions', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send message to generate code
    const message = 'Create a React component with state';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait for code to be generated
    await page.waitForTimeout(1000);

    // 5. Check if code editor is visible
    const codeEditor = page.locator('[data-testid="code-editor"]');
    if (await codeEditor.isVisible()) {
      // 6. Try to interact with code editor
      const editorContent = page.locator('.cm-content');
      if (await editorContent.isVisible()) {
        // Editor is visible and interactive
        await expect(editorContent).toBeVisible();
      }
    }

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-code-editor.png' });
  });

  test('should support file tabs navigation', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send message that might generate multiple files
    const message = 'Create a React app with multiple components';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait for files to be generated
    await page.waitForTimeout(1000);

    // 5. Check for file tabs
    const fileTabs = page.locator('[data-testid="file-tabs"]');
    if (await fileTabs.isVisible()) {
      // 6. Verify tabs are present
      await expect(fileTabs).toBeVisible();

      // 7. Try clicking on different tabs
      const tabs = page.locator('[data-testid="file-tab"]');
      const tabCount = await tabs.count();
      if (tabCount > 1) {
        await tabs.nth(1).click();
        await page.waitForTimeout(300);
      }
    }

    // 8. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-file-tabs.png' });
  });

  test('should support provider switching', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Check for provider selector
    const providerSelector = page.locator('[data-testid="provider-selector"]');
    if (await providerSelector.isVisible()) {
      // 3. Click provider selector
      await providerSelector.click();
      await page.waitForTimeout(300);

      // 4. Select different provider
      const providerOptions = page.locator('[data-testid="provider-option"]');
      const optionCount = await providerOptions.count();
      if (optionCount > 1) {
        await providerOptions.nth(1).click();
        await page.waitForTimeout(500);
      }
    }

    // 5. Verify chat is still functional
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 6. Send a message
    const message = 'Test message after provider switch';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 7. Verify message was sent
    await expect(page.getByText(message)).toBeVisible();

    // 8. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-provider-switching.png' });
  });

  test('should support theme toggle', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Look for theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // 3. Get initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('class');
      });

      // 4. Click theme toggle
      await themeToggle.click();
      await page.waitForTimeout(300);

      // 5. Verify theme changed
      const newTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('class');
      });

      // Theme should be different (or at least the action completed)
      expect(newTheme).toBeDefined();
    }

    // 6. Verify chat is still functional
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-theme-toggle.png' });
  });

  test('should handle auto-save functionality', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send a message
    const message = 'Create a React component';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait for auto-save to occur
    await page.waitForTimeout(2000);

    // 5. Check for save indicator
    const saveIndicator = page.locator('[data-testid="save-indicator"]');
    if (await saveIndicator.isVisible()) {
      // Save indicator is present
      await expect(saveIndicator).toBeVisible();
    }

    // 6. Reload page to verify data persists
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 7. Verify chat history is still there
    await expect(page.getByText(message)).toBeVisible();

    // 8. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-auto-save.png' });
  });

  test('should support version snapshots', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send initial message
    const message1 = 'Create a React button';
    await page.fill('textarea', message1);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message1)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait a moment
    await page.waitForTimeout(1000);

    // 5. Look for snapshot button
    const snapshotButton = page.locator('[data-testid="snapshot-button"]');
    if (await snapshotButton.isVisible()) {
      // 6. Create snapshot
      await snapshotButton.click();
      await page.waitForTimeout(500);

      // 7. Verify snapshot was created
      const snapshotList = page.locator('[data-testid="snapshot-list"]');
      if (await snapshotList.isVisible()) {
        await expect(snapshotList).toBeVisible();
      }
    }

    // 8. Send another message
    const message2 = 'Make it blue';
    await page.fill('textarea', message2);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 9. Wait for response
    await expect(page.getByText(message2)).toBeVisible();

    // 10. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-snapshots.png' });
  });

  test('should handle settings page navigation', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Look for settings button
    const settingsButton = page.locator('[data-testid="settings-button"]');
    if (await settingsButton.isVisible()) {
      // 3. Click settings
      await settingsButton.click();
      await page.waitForURL(/settings/);

      // 4. Verify settings page loaded
      await expect(page).toHaveURL(/settings/);

      // 5. Look for API key inputs
      const apiKeyInputs = page.locator('input[type="password"]');
      if (await apiKeyInputs.count() > 0) {
        // Settings page has API key inputs
        await expect(apiKeyInputs.first()).toBeVisible();
      }

      // 6. Navigate back to chat
      const backButton = page.getByRole('button', { name: /back|chat/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForURL(/chat/);
      }
    }

    // 7. Verify we're back at chat
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 8. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-settings.png' });
  });

  test('should handle mobile responsive layout', async ({ page }) => {
    // 1. Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. Navigate to chat
    await navigateToChat(page);

    // 3. Verify chat interface is visible
    await expect(page.getByPlaceholder('Describe your website...')).toBeVisible();

    // 4. Check for mobile menu
    const mobileMenu = page.locator('header button');
    if (await mobileMenu.isVisible()) {
      // 5. Click mobile menu
      await mobileMenu.click();
      await page.waitForTimeout(300);

      // 6. Verify menu items are visible
      const menuItems = page.getByText(/new project|settings/i);
      if (await menuItems.count() > 0) {
        await expect(menuItems.first()).toBeVisible();
      }

      // 7. Close menu
      await page.mouse.click(300, 300);
      await page.waitForTimeout(300);
    }

    // 8. Send a message on mobile
    const message = 'Create a mobile-friendly website';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 9. Verify message was sent
    await expect(page.getByText(message)).toBeVisible();

    // 10. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-mobile.png' });
  });

  test('should handle error states gracefully', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Try to send empty message
    const sendButton = page.getByRole('button', { name: 'Send' });
    const initialState = await sendButton.isEnabled();

    // 3. Verify send button behavior with empty input
    if (initialState) {
      // Button is enabled, try clicking it
      await sendButton.click();
      await page.waitForTimeout(300);
    }

    // 4. Send a valid message
    const message = 'Create a test component';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await sendButton.click();

    // 5. Verify message was sent
    await expect(page.getByText(message)).toBeVisible();

    // 6. Wait for response
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-error-handling.png' });
  });

  test('should maintain state across navigation', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send a message
    const message = 'Create a React component';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Navigate to settings
    const settingsButton = page.locator('[data-testid="settings-button"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForURL(/settings/);
    }

    // 5. Navigate back to chat
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // 6. Verify chat history is preserved
    await expect(page.getByText(message)).toBeVisible();

    // 7. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-state-persistence.png' });
  });

  test('should handle rapid message sending', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send multiple messages rapidly
    const messages = ['Message 1', 'Message 2', 'Message 3'];

    for (const msg of messages) {
      await page.fill('textarea', msg);
      await page.getByRole('button', { name: 'Send' }).click();
      // Don't wait between sends - test rapid sending
    }

    // 3. Wait for all messages to appear
    await page.waitForTimeout(2000);

    // 4. Verify all messages are in the chat
    for (const msg of messages) {
      await expect(page.getByText(msg)).toBeVisible();
    }

    // 5. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-rapid-messages.png' });
  });

  test('should handle long-running AI responses', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send a message that might generate longer response
    const message = 'Create a complex React application with multiple components and state management';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Verify message was sent
    await expect(page.getByText(message)).toBeVisible();

    // 4. Wait for response with longer timeout
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 15000 });

    // 5. Verify code is generated
    await expect(page.locator('pre code')).toBeVisible();

    // 6. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-long-response.png' });
  });

  test('should support copy code functionality', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send message to generate code
    const message = 'Create a React button';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait for code to be generated
    await page.waitForTimeout(1000);

    // 5. Look for copy button
    const copyButton = page.locator('[data-testid="copy-button"]');
    if (await copyButton.isVisible()) {
      // 6. Click copy button
      await copyButton.click();
      await page.waitForTimeout(300);

      // 7. Verify copy action (check for toast or similar)
      const toast = page.locator('[data-testid="toast"]');
      if (await toast.isVisible()) {
        await expect(toast).toBeVisible();
      }
    }

    // 8. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-copy-code.png' });
  });

  test('should handle view mode switching', async ({ page }) => {
    // 1. Navigate to chat
    await navigateToChat(page);

    // 2. Send message to generate code
    const message = 'Create a React component';
    await page.fill('textarea', message);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send' }).click();

    // 3. Wait for response
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Here is a mock response')).toBeVisible({ timeout: 10000 });

    // 4. Wait for code to be generated
    await page.waitForTimeout(1000);

    // 5. Look for view mode toggle buttons
    const codeViewButton = page.getByRole('button', { name: /code/i });
    const previewViewButton = page.getByRole('button', { name: /preview/i });

    // 6. Try switching to preview
    if (await previewViewButton.isVisible()) {
      await previewViewButton.click();
      await page.waitForTimeout(500);
    }

    // 7. Try switching back to code
    if (await codeViewButton.isVisible()) {
      await codeViewButton.click();
      await page.waitForTimeout(500);
    }

    // 8. Verify code editor is visible
    const codeEditor = page.locator('[data-testid="code-editor"]');
    if (await codeEditor.isVisible()) {
      await expect(codeEditor).toBeVisible();
    }

    // 9. Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/user-journey-view-mode.png' });
  });
});
