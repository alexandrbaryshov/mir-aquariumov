// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Визит', () => {
  test('should-show-contacts-and-yandex-map', async ({ page }) => {
    const visit = page.locator('#visit')
    await visit.scrollIntoViewIfNeeded()

    // Контакты «Мира аквариумов»
    await expect(visit).toContainText('Чебоксары, просп. Ленина, 27')
    await expect(visit.getByRole('link', { name: '+7 (8352) 57-19-55' })).toHaveAttribute('href', 'tel:+78352571955')
    await expect(visit).toContainText('Уточняйте по телефону')

    // Карта Яндекса с меткой и кнопка маршрута, как на mir-aquariumov
    await expect(page.getByTestId('yandex-map')).toHaveAttribute('src', /yandex\.ru\/map-widget\/v1\/.*pt=47\.253140%2C56\.124000/)
    await expect(visit.getByRole('link', { name: /Построить маршрут/ })).toHaveAttribute('href', /yandex\.ru\/maps\/\?text=/)
  })
})
