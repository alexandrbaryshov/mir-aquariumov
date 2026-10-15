// Bakes the depth-of-field layer of the dive-in into public/img/dive/: the CSS blur is
// applied once here instead of in the browser on every repaint of a scaled layer.
// (The corals themselves are sharp cutouts: see make_reef.py.)
// Run from the project root: node sources/coral/bake-dive.mjs
import { chromium } from '@playwright/test'
import fs from 'node:fs'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
fs.mkdirSync('public/img/dive', { recursive: true })

async function bake({ src, w, h, outW, outH, pad, filter, flip, type, quality }) {
  return page.evaluate(
    async ({ src, w, h, outW, outH, pad, filter, flip, type, quality }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = document.createElement('canvas')
      c.width = Math.round(outW + pad * 2)
      c.height = Math.round(outH + pad * 2)
      const ctx = c.getContext('2d')
      ctx.filter = filter
      if (flip) {
        ctx.translate(c.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(img, 0, 0, w, h, pad, pad, outW, outH)
      return c.toDataURL(type, quality)
    },
    { src, w, h, outW, outH, pad, filter, flip, type, quality },
  )
}

const save = (file, dataUrl) => {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
  fs.writeFileSync(file, buf)
  console.log(file, Math.round(buf.length / 1024) + ' KB')
}

// Depth of field: the plate blurred like `.hero-dof` did (blur 7px at ~0.68 render
// scale), at a quarter of the resolution, since nothing sharp is left in it anyway.
{
  const src = 'data:image/jpeg;base64,' + fs.readFileSync('public/img/hero-water.jpg').toString('base64')
  const k = 0.25
  const url = await bake({ src, w: 2400, h: 1340, outW: 2400 * k, outH: 1340 * k, pad: 0, filter: `blur(${((7 / 0.68) * k).toFixed(2)}px) saturate(1.05)`, flip: false, type: 'image/webp', quality: 0.82 })
  save('public/img/dive/hero-water-dof.webp', url)
}

await browser.close()
