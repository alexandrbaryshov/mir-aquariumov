// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect, waitForIntro } from '../fixtures.js'

test.describe('Главный экран', () => {
  test('should-show-name-and-swimming-fish', async ({ page }) => {
    // 1. После погружения видны название и плашка с кнопками
    await expect(page.getByRole('heading', { level: 1, name: 'Мир аквариумов' })).toBeVisible()
    await expect(page.getByTestId('hero-name')).toHaveCSS('opacity', '1', { timeout: 5_000 })
    await expect(page.locator('.hero-kicker')).toHaveText('Выставка — магазин')
    await expect(page.getByRole('link', { name: 'Собрать аквариум' })).toHaveAttribute('href', '#builder')
    await expect(page.getByRole('link', { name: 'Записаться на выставку' })).toHaveAttribute('href', '#booking')
    await expect(page.locator('.hero-actions a')).toHaveCount(2)
    await expect(page.locator('.hero-facts')).toContainText('Чебоксары, просп. Ленина, 27')
    await expect(page.locator('.hero-facts')).toContainText('+7 (8352) 57-19-55')
    await expect(page.locator('.hero-facts')).not.toContainText('Часы')

    // 1a. Внизу появляется подсказка «Листайте вниз» и уходит, как только страницу прокрутили
    const hint = page.getByTestId('scroll-hint')
    await expect(hint).toHaveText('Листайте вниз')
    await expect(hint.locator('.hero-hint-inner')).toHaveCSS('opacity', '1', { timeout: 6_000 })
    await page.mouse.wheel(0, 300)
    await expect(hint).toHaveCSS('opacity', '0')
    await page.mouse.wheel(0, -300)
    await expect(hint).toHaveCSS('opacity', '1')

    // 2. После интро выплывает рыба
    const fish = page.getByTestId('hero-fish')
    await expect(fish).toHaveCSS('opacity', '1', { timeout: 10_000 })

    // 3. Клип проплыва действительно проигрывается
    const clipTime = () =>
      page.evaluate(() => Math.max(...[...document.querySelectorAll('.chroma-source')].map((v) => v.currentTime)))
    const t1 = await clipTime()
    await expect.poll(clipTime, { timeout: 5_000 }).toBeGreaterThan(t1 + 0.5)
  })

  test('should-layer-fish-behind-and-in-front-of-the-name', async ({ page }) => {
    // Проплыв «behind» — рыба под буквами
    await page.goto('/?fish=a:behind:3')
    await waitForIntro(page)
    await expect(page.getByTestId('hero-fish')).toHaveCSS('z-index', '1', { timeout: 10_000 })

    // Проплыв «graze» — рыба скользит поверх нижнего края букв
    await page.goto('/?fish=b:graze:5')
    await waitForIntro(page)
    const fish = page.getByTestId('hero-fish')
    await expect(fish).toHaveCSS('z-index', '3', { timeout: 10_000 })
    // …но не выше, чем на треть высоты букв
    const name = await page.getByTestId('hero-name').boundingBox()
    const box = await fish.boundingBox()
    expect(box.y).toBeGreaterThan(name.y - name.height * 0.6)
  })
})
