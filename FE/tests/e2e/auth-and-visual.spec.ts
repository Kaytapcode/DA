import { expect, test } from '@playwright/test'

test.describe('Authentication and visual coverage', () => {
  test('registers then logs in through Gateway.Api', async ({ page }) => {
    // Username max length is 20 chars; build a 17-char id (pw_ + 14 hex chars).
    const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const username = `pw_${nonce}`.slice(0, 20)
    const email = `${username}@example.com`
    const password = 'SecurePass@123'

    await page.goto('/register')
    await page.locator('#username').fill(username)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#confirmPassword').fill(password)
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page).toHaveURL(/\/login$/)

    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /^Sign In/ }).click()

    await expect(page).toHaveURL(/\/user\/home$/)
    const token = await page.evaluate(() => window.localStorage.getItem('auth_token'))
    expect(token).toBeTruthy()
  })

  test('captures login page visual baseline', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveScreenshot('login-page.png', { fullPage: true })
  })
})
