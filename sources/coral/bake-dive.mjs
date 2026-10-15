// Bakes the dive-in layers into public/img/dive/: CSS filters (blur, hue, saturation,
// brightness, mirror) are applied once here instead of in the browser on every repaint
// of a scaled layer. Run from the project root: node sources/coral/bake-dive.mjs
import { chromium } from '@playwright/test'
import fs from 'node:fs'

const PAD = 32 // transparent margin so the blur can spread past the original edges
// Reference viewports for the two layouts (styles.css switches at aspect-ratio 1/1).
const WIDE = { w: 1440, h: 860 }
const TALL = { w: 400, h: 860 }

const SIDE = { file: 'public/img/coral-side.webp', w: 526, h: 601 }
const BED = { file: 'public/img/coral-bed.webp', w: 717, h: 311 }

// css: the filter actually rendered before (styles.css), size: how the image is sized
// in each layout, as [axis, viewport fraction].
const LAYERS = [
  { key: 'mid-l', base: BED, flip: true, blur: 3, rest: 'saturate(1.06)', wide: ['w', 0.46], tall: ['w', 0.84] },
  { key: 'mid-r', base: BED, flip: false, blur: 3, rest: 'saturate(1.06)', wide: ['w', 0.4], tall: ['w', 0.74] },
  { key: 'near-b', base: BED, flip: false, blur: 9, rest: 'saturate(1.12) brightness(0.92)', wide: ['w', 0.92], tall: ['w', 1.7] },
  { key: 'near-l', base: SIDE, flip: true, blur: 9, rest: 'hue-rotate(30deg) saturate(1.1) brightness(0.9)', wide: ['h', 1.04], tall: ['w', 1.1] },
  { key: 'near-r', base: SIDE, flip: false, blur: 9, rest: 'saturate(1.12) brightness(0.92)', wide: ['h', 1.12], tall: ['w', 1.2] },
]

const scaleFor = (base, [axis, frac], vp) => (axis === 'w' ? vp.w * frac / base.w : vp.h * frac / base.h)

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

for (const l of LAYERS) {
  const src = 'data:image/webp;base64,' + fs.readFileSync(l.base.file).toString('base64')
  for (const [name, vp] of [['wide', WIDE], ['tall', TALL]]) {
    const s = scaleFor(l.base, l[name], vp)
    const sigma = l.blur / s
    // Blurred this much, the layer needs only enough pixels for a ~2.5 px blur.
    const k = Math.min(1, Math.max(0.25, 2.5 / sigma))
    const filter = `blur(${(sigma * k).toFixed(2)}px) ${l.rest}`
    const url = await bake({ src, w: l.base.w, h: l.base.h, outW: l.base.w * k, outH: l.base.h * k, pad: PAD * k, filter, flip: l.flip, type: 'image/webp', quality: 0.86 })
    save(`public/img/dive/${l.key}-${name}.webp`, url)
  }
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

