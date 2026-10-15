// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Конструктор', () => {
  test('should-build-tank-in-3d-and-add-set-to-cart', async ({ page }) => {
    const builder = page.locator('#builder')
    const price = builder.getByTestId('builder-price')
    await builder.scrollIntoViewIfNeeded()

    // 1. 3D-сцена загрузилась; стартовая смета: «Классика» 14 900 + песок 900
    await expect(builder.getByTestId('builder-canvas').locator('canvas')).toBeVisible({ timeout: 15_000 })
    await expect(price).toHaveAttribute('data-value', '15800')

    // 2. Добавить корягу и камни — смета растёт, на вкладке счётчик
    await builder.getByRole('button', { name: 'Добавить: Коряга' }).click()
    await builder.getByRole('button', { name: 'Добавить: Коряга' }).click()
    await builder.getByRole('button', { name: 'Добавить: Камни «Сейрю»' }).click()
    await expect(price).toHaveAttribute('data-value', String(15800 + 1900 * 2 + 1200))
    await expect(builder.getByRole('tab', { name: /Декор/ })).toContainText('3')

    // 3. Убрать одну корягу
    await builder.getByRole('button', { name: 'Убрать: Коряга' }).click()
    await expect(price).toHaveAttribute('data-value', String(15800 + 1900 + 1200))

    // 4. Технику и жителей — цели «готов к запуску» закрываются
    await builder.getByRole('tab', { name: 'Техника' }).click()
    for (const name of ['Фильтр', 'Светильник LED', 'Обогреватель']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await builder.getByRole('tab', { name: 'Жители' }).click()
    await builder.getByRole('button', { name: 'Добавить: Неоны' }).click()
    await expect(builder.locator('.b-goals')).toContainText('Готов к запуску')

    // 5. Морская вода убирает пресноводное (коряга, камни, неоны), кораллы становятся доступны
    await builder.getByRole('tab', { name: 'Аквариум' }).click()
    await builder.getByRole('button', { name: 'Морская' }).click()
    await expect(builder.getByRole('tab', { name: /Кораллы/ })).toBeVisible()
    await expect(price).toHaveAttribute('data-value', String(14900 + 900 + 3900 + 5900 + 1900))

    // 6. Весь набор — в корзину
    await builder.getByRole('button', { name: 'Весь набор в корзину' }).click()
    await expect(page.getByTestId('cart-button')).toHaveAccessibleName('Корзина, товаров: 1')
  })
})
