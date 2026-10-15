// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '../fixtures.js'

test.describe('Конструктор', () => {
  test('should-offer-doubled-assortment', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const builder = page.locator('#builder')
    await builder.scrollIntoViewIfNeeded()
    await expect(builder.getByTestId('builder-canvas').locator('canvas')).toBeVisible({ timeout: 15_000 })
    const rows = builder.locator('.b-tabpanel .b-item')
    const tab = (name) => builder.getByRole('tab', { name: new RegExp(`^${name}`) }).click()

    // 1. Шесть аквариумов; берём самый большой, чтобы поместились все жители
    await tab('Аквариум')
    await expect(builder.getByRole('radio', { name: /л ·/ })).toHaveCount(6)
    await builder.getByRole('radio', { name: /Гостиная/ }).click()

    // 2. Пресная вода: грунт 6 (+ «Без грунта»), декор 6, растения 8, техника 8, жители 10
    for (const [name, n] of [['Грунт', 7], ['Декор', 6], ['Растения', 8], ['Техника', 8], ['Жители', 10]]) {
      await tab(name)
      await expect(rows).toHaveCount(n)
    }

    // 3. Новые позиции появляются в 3D без ошибок
    await tab('Декор')
    for (const name of ['Корень «Паук»', 'Каменный грот', 'Сланцевые плиты']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await tab('Растения')
    for (const name of ['Кабомба', 'Людвигия', 'Криптокорина', 'Элеохарис']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await tab('Техника')
    for (const name of ['Внешний фильтр', 'CO₂-система', 'Термометр', 'Автокормушка']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await tab('Жители')
    for (const name of ['Пецилии', 'Суматранские барбусы', 'Коридорасы', 'Дискус', 'Улитка-ампулярия']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await expect(builder.getByRole('tab', { name: /Жители/ })).toContainText('5')

    // 4. Морская вода: грунт 4 (+ «Без грунта»), декор 4, кораллы 8, техника 8, жители 8
    await tab('Аквариум')
    await builder.getByRole('button', { name: 'Морская' }).click()
    for (const [name, n] of [['Грунт', 5], ['Декор', 4], ['Кораллы', 8], ['Техника', 8], ['Жители', 8]]) {
      await tab(name)
      await expect(rows).toHaveCount(n)
    }
    await tab('Декор')
    for (const name of ['Рифовая скала', 'Раковины']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await tab('Кораллы')
    for (const name of ['Мозговик', 'Дискосомы', 'Горгонария', 'Эуфиллия']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await tab('Техника')
    await builder.getByRole('button', { name: 'Добавить: Пеноотделитель' }).click()
    await tab('Жители')
    for (const name of ['Королевская грамма', 'Мандаринка', 'Голубой хирург', 'Морская звезда']) await builder.getByRole('button', { name: `Добавить: ${name}` }).click()
    await page.waitForTimeout(1500)
    expect(errors).toEqual([])
  })
})
