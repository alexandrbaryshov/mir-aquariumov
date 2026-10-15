import { test as baseTest } from '@playwright/test'
export { expect } from '@playwright/test'

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await waitForIntro(page)
    await use(page)
  },
})

/** No splash any more: the hero dives in through the corals and settles. */
export async function waitForIntro(page) {
  await page.locator('.hero[data-intro="done"]').waitFor({ timeout: 15_000 })
}

/** Header hides while scrolling down; scroll up a little so it slides back. */
export async function revealHeader(page) {
  await waitForIntro(page)
  await page.mouse.wheel(0, -200)
  await page.getByTestId('cart-button').waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
}
