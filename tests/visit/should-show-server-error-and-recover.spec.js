// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Визит', () => {
  test('should-show-server-error-and-recover', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Запись на визит' })

    // 1. Замокать POST /api/booking ответом 500, заполнить форму и отправить
    await page.route('**/api/booking', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Сервер на обслуживании' }),
      }),
    )
    await form.getByRole('textbox', { name: 'Имя' }).fill('Мария')
    await form.getByRole('textbox', { name: 'Телефон' }).fill('+7 916 123-45-67')
    await form.getByRole('checkbox', { name: /Согласен/ }).check()
    await form.getByRole('button', { name: 'Записаться' }).click()
    await expect(page.getByRole('alert')).toContainText('Не получилось отправить: Сервер на обслуживании')

    // 2. Снять мок и отправить снова
    await page.unroute('**/api/booking')
    await form.getByRole('button', { name: 'Записаться' }).click()
    const success = page.getByTestId('booking-success')
    await expect(success).toContainText('Ждём вас, Мария!')
    await expect(success).toContainText('посещение выставки')
    await expect(success).toContainText(/MA-\d{4}/)
  })
})
