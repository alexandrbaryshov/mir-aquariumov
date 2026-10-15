import { test, expect } from './fixtures.js'

test('seed', async ({ page }) => {
  // Fixture opens the site with an empty localStorage.
  await expect(page).toHaveTitle(/Мир аквариумов/)
})
