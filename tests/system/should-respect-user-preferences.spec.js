// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Системные режимы', () => {
  test('should-respect-user-preferences', async ({ page }) => {
    // 1. Эмулировать prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.locator('.bubble')).toHaveCount(0)
    await expect(page.getByTestId('hero-fish')).toHaveCount(0)
    await expect(page.locator('.hero-fish-static')).toBeVisible()

    // 2. Эмулировать тёмную схему
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(6, 25, 29)')

    // 3. Переключить тему кнопкой в шапке
    await page.getByRole('button', { name: 'Включить дневную тему' }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 238, 229)')
    expect(await page.evaluate(() => localStorage.getItem('mir-aquariumov-theme'))).toBe('"light"')

    // 4. Проверить ширину документа
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
