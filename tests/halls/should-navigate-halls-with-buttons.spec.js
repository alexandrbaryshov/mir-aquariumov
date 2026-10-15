// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Разделы зала', () => {
  test('should-navigate-halls-with-buttons', async ({ page }) => {
    const prev = page.getByTestId('halls-prev')
    const next = page.getByTestId('halls-next')
    const track = page.getByRole('list', { name: 'Разделы зала' })
    const scrollLeft = () => track.evaluate((el) => el.scrollLeft)

    // 1. Прокрутить к залам
    await page.locator('#halls').scrollIntoViewIfNeeded()
    await expect(prev).toBeDisabled()
    await expect(next).toBeEnabled()

    // 2. Нажать «Следующий зал»
    await next.click()
    await expect.poll(scrollLeft).toBeGreaterThan(100)
    await expect(prev).toBeEnabled()

    // 3. Листать вперёд до конца
    for (let i = 0; i < 8 && (await next.isEnabled()); i++) {
      await next.click()
      await page.waitForTimeout(450)
    }
    await expect(next).toBeDisabled()
    await expect(page.locator('.halls-counter')).toContainText('06 / 06')

    // 4. Вернуться назад
    const before = await scrollLeft()
    await prev.click()
    await expect.poll(scrollLeft).toBeLessThan(before)

    // 5. Колесо мыши над каруселью прокручивает страницу, а не застревает
    const box = await track.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const y0 = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 400)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y0 + 200)
  })
})
