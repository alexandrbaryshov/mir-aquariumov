// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Витрина', () => {
  test('should-open-and-close-product-dialog', async ({ page }) => {
    // 1. Нажать на фото «Нано-куб «Подоконник»»
    await page.getByRole('button', { name: 'Нано-куб «Подоконник» — подробнее' }).click()
    const dialog = page.getByRole('dialog', { name: 'Нано-куб «Подоконник»' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('14 900 ₽')
    await expect(dialog.getByRole('button', { name: 'Закрыть' })).toBeFocused()

    // 2. Нажать Escape
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
