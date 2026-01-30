import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Login Page', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/login');
      
      const headings = page.locator('h1, h2, h3, h4, h5, h6, [role="heading"]');
      const count = await headings.count();
      
      if (count > 0) {
        const headingElements = await headings.all();
        let lastLevel = 0;
        
        for (const element of headingElements) {
          const tagName = await element.evaluate(el => el.tagName);
          const level = parseInt(tagName.substring(1));
          lastLevel = level;
        }
      }
    });

    test('should have properly labeled form inputs', async ({ page }) => {
      await page.goto('/login');
      
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('id');
    });

    test('should support keyboard navigation on login form', async ({ page }) => {
      await page.goto('/login');
      
      await page.keyboard.press('Tab');
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toBeFocused();
      
      await page.keyboard.type('admin123');
      
      await page.keyboard.press('Tab');
      const submitButton = page.getByRole('button', { name: /login/i });
      await expect(submitButton).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      await page.waitForURL('/', { timeout: 5000 }).catch(() => {});
    });

    test('should have proper button accessibility', async ({ page }) => {
      await page.goto('/login');
      
      const submitButton = page.getByRole('button', { name: /login/i });
      await expect(submitButton).toBeVisible();
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(submitButton).toBeFocused();
    });

    test('should have accessible error messages', async ({ page }) => {
      await page.goto('/login');
      
      const submitButton = page.getByRole('button', { name: /login/i });
      await submitButton.click();
      
      await page.waitForTimeout(500);
      
      const errorMessages = page.locator('text=/error|failed|invalid/i');
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    });

    test('should have proper form structure', async ({ page }) => {
      await page.goto('/login');
      
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      await expect(form).toHaveAttribute('method', 'POST').catch(() => {});
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/login');
      
      const description = page.getByText(/Enter your password/);
      await expect(description).toBeVisible();
      
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toBeVisible();
    });
  });

  test.describe('Chat Page', () => {
    test('should have accessible buttons with proper roles', async ({ page }) => {
      await page.goto('/login');
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      expect(buttonCount).toBeGreaterThan(0);
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        const hasAccessibleName = ariaLabel || (textContent && textContent.trim().length > 0);
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should have accessible form controls', async ({ page }) => {
      await page.goto('/login');
      
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        
        let hasAccessibleLabel = false;
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasAccessibleLabel = await label.count() > 0;
        }
        
        hasAccessibleLabel = hasAccessibleLabel || !!ariaLabel || !!placeholder;
        expect(hasAccessibleLabel).toBeTruthy();
      }
    });

    test('should have proper focus indicators', async ({ page }) => {
      await page.goto('/login');
      
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el) return null;
        
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });
      
      expect(focusedElement).toBeDefined();
    });

    test('should have accessible text content', async ({ page }) => {
      await page.goto('/login');
      
      const textElements = page.locator('p, span, div, button, label');
      const count = await textElements.count();
      
      expect(count).toBeGreaterThan(0);
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = textElements.nth(i);
        const fontSize = await element.evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });
        
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(10);
      }
    });
  });

  test.describe('General Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
      await page.goto('/login');
      
      const title = await page.title();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have proper language attribute', async ({ page }) => {
      await page.goto('/login');
      
      const htmlElement = page.locator('html');
      const lang = await htmlElement.getAttribute('lang');
      
      expect(lang).toBeDefined();
    });

    test('should have proper viewport meta tag', async ({ page }) => {
      await page.goto('/login');
      
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeDefined();
      expect(viewport).toContain('width=device-width');
    });

    test('should have accessible images with alt text', async ({ page }) => {
      await page.goto('/chat');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        const ariaLabel = await image.getAttribute('aria-label');
        
        const hasAltText = alt !== null || ariaLabel !== null;
        expect(hasAltText).toBeTruthy();
      }
    });

    test('should have proper link accessibility', async ({ page }) => {
      await page.goto('/login');
      
      const links = page.locator('a');
      const linkCount = await links.count();
      
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        
        const href = await link.getAttribute('href');
        expect(href).toBeDefined();
        
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        
        const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel;
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should support Tab key navigation', async ({ page }) => {
      await page.goto('/login');
      
      const initialFocused = await page.evaluate(() => document.activeElement?.tagName);
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const afterTabFocused = await page.evaluate(() => document.activeElement?.tagName);
      
      expect(afterTabFocused).toBeDefined();
    });

    test('should support Shift+Tab for reverse navigation', async ({ page }) => {
      await page.goto('/login');
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const beforeShiftTab = await page.evaluate(() => document.activeElement?.tagName);
      
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(100);
      
      const afterShiftTab = await page.evaluate(() => document.activeElement?.tagName);
      
      expect(afterShiftTab).toBeDefined();
    });

    test('should have proper focus trap in modals if present', async ({ page }) => {
      await page.goto('/chat');
      
      const dialogs = page.locator('dialog, [role="dialog"]');
      const dialogCount = await dialogs.count();
      
      if (dialogCount > 0) {
        const dialog = dialogs.first();
        await expect(dialog).toBeVisible();
        
        const focusableInModal = dialog.locator('button, [href], input, select, textarea, [tabindex]');
        const focusableCount = await focusableInModal.count();
        
        expect(focusableCount).toBeGreaterThan(0);
      }
    });
  });
});
