// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Витрина', () => {
  test('should-tile-products-on-phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'плитка — только на телефоне')
    const grid = page.getByTestId('product-grid')
    await grid.scrollIntoViewIfNeeded()

    // 1. На телефоне товары идут плиткой в два столбца
    const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(2)

    // 2. На экран помещаются четыре карточки (два ряда)
    const cards = grid.getByRole('listitem')
    const first = await cards.nth(0).boundingBox()
    const fourth = await cards.nth(3).boundingBox()
    expect(fourth.y + fourth.height - first.y).toBeLessThan(page.viewportSize().height)
  })
})
