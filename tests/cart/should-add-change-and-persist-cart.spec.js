// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect, revealHeader } from '../fixtures.js'

test.describe('Корзина', () => {
  test('should-add-change-and-persist-cart', async ({ page }) => {
    const cartButton = page.getByTestId('cart-button')

    // 1. Добавить «Гуппи эндлера, пара» дважды и «Светильник «Полдень»» один раз
    const guppy = page.getByRole('button', { name: 'Добавить «Гуппи эндлера, пара» в корзину' })
    await guppy.click()
    await guppy.click()
    await page.getByRole('button', { name: 'Добавить «Светильник «Полдень»» в корзину' }).click()
    await expect(cartButton).toHaveAccessibleName('Корзина, товаров: 3')

    // 2. Перезагрузить страницу
    await page.reload()
    await expect(cartButton).toHaveAccessibleName('Корзина, товаров: 3')

    // 3. Открыть корзину
    await revealHeader(page)
    await cartButton.click()
    const drawer = page.getByTestId('cart-drawer')
    await expect(drawer.getByTestId('cart-line')).toHaveCount(2)
    await expect(drawer.getByTestId('cart-total')).toHaveAttribute('data-value', '19880')

    // 4. Удалить обе строки
    await drawer.getByRole('button', { name: 'Удалить «Гуппи эндлера, пара»' }).click()
    await drawer.getByRole('button', { name: 'Удалить «Светильник «Полдень»»' }).click()
    await expect(drawer.getByText('Пока пусто — рыбка скучает.')).toBeVisible()
  })
})
