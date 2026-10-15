import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tiny fake backend so the booking form has a real request to send
// (and Playwright has a real request to intercept / mock).
function bookingApi() {
  const handler = (req, res, next) => {
    if (!req.url.startsWith('/api/booking')) return next()
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end()
    }
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      let data = {}
      try {
        data = JSON.parse(body)
      } catch {}
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      if (!data.name || !data.phone) {
        res.statusCode = 422
        return res.end(JSON.stringify({ ok: false, error: 'Нужны имя и телефон' }))
      }
      const id = 'MA-' + Math.floor(1000 + Math.random() * 9000)
      setTimeout(() => res.end(JSON.stringify({ ok: true, id })), 600)
    })
  }
  return {
    name: 'booking-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), bookingApi()],
  server: {
    // playwright-cli writes traces/snapshots into the project; without this
    // Vite reloads the page in the middle of a test run.
    watch: { ignored: ['**/.playwright-cli/**', '**/qa/**', '**/test-results/**', '**/playwright-report/**', '**/tests/**', '**/specs/**'] },
  },
})
