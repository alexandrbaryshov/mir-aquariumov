// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Главный экран', () => {
  test('should-drift-ticker-on-its-own', async ({ page }) => {
    const track = page.getByTestId('ticker-track')
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e)
    // The track loops by one copy of the row (a quarter of it): measure the shift modulo that.
    const loop = await track.evaluate((el) => el.scrollWidth / 4)
    const leftShift = (from, to) => (((from - to) % loop) + loop) % loop

    // 1. Без прокрутки лента сама медленно едет влево
    const x1 = await x()
    await page.waitForTimeout(1_000)
    const shift = leftShift(x1, await x())
    expect(shift).toBeGreaterThan(10)
    expect(shift).toBeLessThan(80) // медленно: десятки пикселей в секунду

    // 2. Прокрутка не разгоняет и не разворачивает ленту
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(300)
    await page.mouse.wheel(0, -900)
    const x3 = await x()
    await page.waitForTimeout(1_000)
    const shift2 = leftShift(x3, await x())
    expect(shift2).toBeGreaterThan(10)
    expect(shift2).toBeLessThan(80)
  })
})
