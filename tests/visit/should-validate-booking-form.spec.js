// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Визит', () => {
  test('should-validate-booking-form', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Запись на визит' })

    // 1. Нажать «Записаться» с пустой формой
    await form.getByRole('button', { name: 'Записаться' }).click()
    await expect(form.locator('.field-error')).toHaveCount(3)
    await expect(form.getByRole('textbox', { name: 'Имя' })).toBeFocused()
    await expect(form.getByRole('textbox', { name: 'Имя' })).toHaveAttribute('aria-invalid', 'true')
  })
})
