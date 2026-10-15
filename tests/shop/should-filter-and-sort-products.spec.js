// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Витрина', () => {
  test('should-filter-and-sort-products', async ({ page }) => {
    const grid = page.getByTestId('product-grid')

    // 1. Нажать вкладку «Обитатели»
    await page.getByRole('tab', { name: 'Обитатели' }).click()
    await expect(page.getByRole('tab', { name: 'Обитатели' })).toHaveAttribute('aria-selected', 'true')
    await expect(grid.getByRole('listitem')).toHaveCount(4)

    // 2. Выбрать порядок «Дешевле»
    await page.getByRole('combobox').first().selectOption('cheap')
    const first = grid.getByRole('listitem').first()
    await expect(first.getByRole('heading')).toHaveText('Креветка «Голубой бархат»')
    await expect(first).toContainText('350 ₽')
  })
})
