import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The 3D builder renders WebGL in software in headless Chrome; with every core busy the
  // dive-in intro and the canvas compete for CPU, so keep some headroom.
  workers: 4,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5179',
    channel: 'chrome', // system Chrome, no browser download needed
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5179',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
