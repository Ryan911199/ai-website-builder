import { test, expect } from '@playwright/test'

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Next.js/)
})

test('page contains expected content', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator('h1')
  await expect(heading).toBeVisible()
})
