// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Визит', () => {
  test('should-show-personal-data-consent', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Запись на визит' })
    const agree = form.getByRole('checkbox', { name: /Согласен на обработку персональных данных для подтверждения визита/ })
    await expect(agree).not.toBeChecked()

    // 1. Нажать на «обработку персональных данных» — открывается уведомление по 152-ФЗ, галочка не ставится
    await form.getByRole('button', { name: 'обработку персональных данных' }).click()
    const notice = page.getByRole('dialog', { name: 'Согласие на обработку персональных данных' })
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('№ 152-ФЗ «О персональных данных»')
    await expect(notice).toContainText('отозвать')
    await expect(agree).not.toBeChecked()

    // 2. «Закрыть» и Escape закрывают уведомление
    await notice.getByRole('button', { name: 'Закрыть' }).click()
    await expect(notice).toHaveCount(0)
    await form.getByRole('button', { name: 'обработку персональных данных' }).click()
    await page.keyboard.press('Escape')
    await expect(notice).toHaveCount(0)

    // 3. «Согласен» в уведомлении ставит галочку
    await form.getByRole('button', { name: 'обработку персональных данных' }).click()
    await notice.getByRole('button', { name: 'Согласен' }).click()
    await expect(notice).toHaveCount(0)
    await expect(agree).toBeChecked()
  })
})
