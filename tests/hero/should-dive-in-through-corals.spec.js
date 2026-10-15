// spec: specs/mir-aquariumov.plan.md
// seed: tests/seed.spec.js
import { test, expect } from '@playwright/test'

test.describe('Главный экран', () => {
  test('should-dive-in-through-corals', async ({ page }) => {
    // 1. Открыть сайт: заставки больше нет, сразу начинается погружение
    await page.goto('/')
    await expect(page.getByTestId('splash')).toHaveCount(0)
    const hero = page.locator('.hero')
    await expect(hero).toHaveAttribute('data-intro', 'diving', { timeout: 4_000 })

    // 2. Кораллы на переднем плане «пролетают» мимо камеры: слой растёт из 1 (до 8×, потом гаснет)
    const near = page.locator('.c-near-r')
    await expect(near).toHaveCount(1)
    const scale = () => near.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
    await expect.poll(scale, { timeout: 3_000 }).toBeGreaterThan(1.5)

    // 3. Камера останавливается: ближние кораллы убраны, название проявилось через рябь
    await expect(hero).toHaveAttribute('data-intro', 'done', { timeout: 8_000 })
    await expect(page.locator('.dive-coral')).toHaveCount(0)
    await expect(page.getByTestId('hero-name')).toHaveCSS('opacity', '1')

    // 3a. Низкие кораллы остались в нижних углах, по краям, а не под названием
    const rest = page.locator('.reef-rest img')
    await expect(rest).toHaveCount(2)
    const view = page.viewportSize()
    const name = await page.getByTestId('hero-name').boundingBox()
    const [left, right] = [await rest.nth(0).boundingBox(), await rest.nth(1).boundingBox()]
    expect(left.x).toBeLessThan(0)
    expect(right.x + right.width).toBeGreaterThan(view.width)
    expect(Math.min(left.y, right.y)).toBeGreaterThan(name.y + name.height * 0.5)

    // 4. Клипы рыбы скачаны целиком (blob-ссылки), пока шло погружение
    const getSources = () => page.evaluate(() => [...document.querySelectorAll('.chroma-source')].map((v) => v.src))
    await expect.poll(async () => (await getSources()).length, { timeout: 10_000 }).toBe(2)
    for (const src of await getSources()) expect(src).toMatch(/^blob:/)
  })
})
