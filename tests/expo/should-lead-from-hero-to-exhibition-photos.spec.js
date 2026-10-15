// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Выставка', () => {
  test('should-lead-from-hero-to-exhibition-photos', async ({ page }) => {
    // 1. «Записаться на выставку» на главном экране ведёт сначала к фото выставки — последнему разделу
    await page.locator('.hero').getByRole('link', { name: 'Записаться на выставку' }).click()
    await expect(page).toHaveURL(/#expo$/)
    const expo = page.locator('#expo')
    await expect(page.locator('main > section').last()).toHaveId('expo')
    await expect(expo.getByRole('heading', { level: 2 })).toHaveText('Кто живёт на выставке')
    await expect(expo).toBeInViewport()

    const titles = expo.locator('.expo-title')
    await expect(titles).toHaveText([
      'Пузырчатая актиния',
      'Мадагаскарский дневной геккон',
      'Тигровый питон-альбинос',
      'Красные попугаи и малавийские цихлиды',
      'Астронотусы',
      'Красноухие черепахи',
    ])
    for (const img of await expo.locator('.expo-open img').all()) await expect(img).toHaveAttribute('alt', /\S/)

    // 2. Фото открывается крупно, листается стрелкой и закрывается по Esc
    await expo.getByRole('button', { name: 'Мадагаскарский дневной геккон — открыть фото' }).click()
    const box = page.getByTestId('expo-lightbox')
    await expect(box).toBeVisible()
    await expect(box).toContainText('02 / 06')
    await page.keyboard.press('ArrowRight')
    await expect(box.locator('#lightbox-title')).toHaveText('Тигровый питон-альбинос')
    await page.keyboard.press('Escape')
    await expect(box).toHaveCount(0)

    // 3. Из плитки под фото — к форме записи, цель визита уже «Записаться на выставку»
    const cta = expo.locator('.expo-cta')
    await cta.scrollIntoViewIfNeeded()
    await cta.getByRole('link', { name: 'Записаться на выставку' }).click()
    await expect(page).toHaveURL(/#booking$/)
    const form = page.getByRole('form', { name: 'Запись на визит' })
    await expect(form).toBeInViewport()
    await expect(form.getByRole('combobox', { name: 'Цель визита' })).toHaveValue('Записаться на выставку')
  })
})
