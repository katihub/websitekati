/**
 * Rendered-layout audit.
 *
 * Reads the live page in a real browser and reports measurements rather than
 * pictures: computed type sizes, contrast ratios, section rhythm, overflow, and
 * overlapping boxes. Screenshots say something looks wrong; this says what the
 * number is.
 *
 *   node qa/audit.mjs                 # desktop
 *   node qa/audit.mjs --only phone
 */

import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? fallback : argv[index + 1]
}

const BASE = flag('base', 'http://localhost:3000')
const ROUTE = flag('route', '/')

const VIEWPORTS = {
  desktop: { width: 1440, height: 960 },
  tablet: { width: 834, height: 1112 },
  phone: { width: 390, height: 844 },
}
const only = flag('only', null)
const targets = only ? { [only]: VIEWPORTS[only] } : VIEWPORTS

const browser = await chromium.launch()

for (const [label, viewport] of Object.entries(targets)) {
  const context = await browser.newContext({ viewport, locale: 'fr-FR' })
  const page = await context.newPage()
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
    window.scrollTo(0, 0)
  })
  // Long enough for the slowest entrance to finish. Sampling early reports
  // transitions in flight as stranded content.
  await page.waitForTimeout(1400)

  const report = await page.evaluate(() => {
    const out = { type: {}, contrast: [], overflow: [], collisions: [], rhythm: {}, hidden: [] }

    const srgb = (c) => {
      const v = c / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
    const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
      return (x + 0.05) / (y + 0.05)
    }
    const groundOf = (el) => {
      let node = el
      while (node && node !== document.documentElement) {
        const bg = getComputedStyle(node).backgroundColor
        // Only a plain rgb()/rgba() can be read as a ground. Tailwind compiles
        // an opacity modifier to color-mix(), whose numbers are percentages and
        // oklab components, and reading those as channels invents ratios.
        const nums = (bg.match(/[\d.]+/g) || []).map(Number)
        const plain = /^rgba?\(/.test(bg) && nums.length >= 3
        // The alpha has to come from the full number list. Reading it from the
        // three-channel slice made every transparent background resolve to
        // opaque black, which inverted every ratio on the page.
        const alpha = nums.length >= 4 ? nums[3] : 1
        if (plain && alpha > 0.5) return nums.slice(0, 3)
        node = node.parentElement
      }
      return [255, 255, 255]
    }

    // -- type scale: every distinct rendered size, with a sample -------------
    for (const el of document.querySelectorAll('h1,h2,h3,p,span,a,dt,dd,li,button,input')) {
      if (!el.textContent?.trim()) continue
      if (el.children.length && !el.matches('h1,h2,h3,p,dt,dd,li,button,a')) continue
      const size = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10
      out.type[size] = out.type[size] || { count: 0, sample: el.textContent.trim().slice(0, 34) }
      out.type[size].count++
    }

    // -- contrast on real text ----------------------------------------------
    const seen = new Set()
    for (const el of document.querySelectorAll('h1,h2,h3,p,span,a,dt,dd,li,button')) {
      const text = el.textContent?.trim()
      if (!text || el.children.length) continue
      const style = getComputedStyle(el)
      const size = parseFloat(style.fontSize)
      const weight = Number(style.fontWeight)
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      const r = ratio(parse(style.color), groundOf(el))
      const floor = large ? 3 : 4.5
      const key = `${style.color}|${size}`
      if (r < floor && !seen.has(key)) {
        seen.add(key)
        out.contrast.push({
          text: text.slice(0, 40),
          size,
          ratio: Math.round(r * 100) / 100,
          floor,
          color: style.color,
        })
      }
    }

    // -- horizontal overflow --------------------------------------------------
    const docWidth = document.documentElement.clientWidth
    for (const el of document.querySelectorAll('body *')) {
      const box = el.getBoundingClientRect()
      if (box.width === 0) continue
      if (box.right > docWidth + 1 || box.left < -1) {
        const style = getComputedStyle(el)
        // Bleeding pictures are clipped by an ancestor on purpose.
        let clipped = false
        let node = el.parentElement
        while (node) {
          if (getComputedStyle(node).overflow !== 'visible') {
            clipped = true
            break
          }
          node = node.parentElement
        }
        if (clipped || style.position === 'fixed') continue
        out.overflow.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString().slice(0, 60),
          left: Math.round(box.left),
          right: Math.round(box.right),
        })
      }
    }

    // -- text sitting on top of a picture inside a department tile ------------
    for (const tile of document.querySelectorAll('a[href^="/rayon/"]')) {
      // LE TITRE EST L'ELEMENT QUI PORTE DU TEXTE, PAS LE PREMIER `span > span`.
      // Ce selecteur visait le nom du rayon quand la tuile etait un bloc de type
      // au-dessus d'une image. Le balisage a change, et il attrape desormais
      // l'enveloppe de l'image : la sonde signalait quatorze collisions entre
      // une image et une boite de texte VIDE de 156x156, qui etait cette
      // enveloppe. Une sonde qui ment coute plus cher que pas de sonde, parce
      // qu'on finit par ignorer ce qu'elle dit.
      const heading = [...tile.querySelectorAll('span, h2, h3, p')].find(
        (n) => (n.textContent ?? '').trim().length > 0 && !n.querySelector('img'),
      )
      const picture = tile.querySelector('img')
      if (!heading || !picture) continue
      const a = heading.getBoundingClientRect()
      const b = picture.getBoundingClientRect()
      const overlap =
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      if (overlap > 40) {
        out.collisions.push({
          tile: heading.textContent?.trim().slice(0, 34),
          overlapPx: Math.round(overlap),
        })
      }
    }

    // -- anything still hidden after the reveal pass -------------------------
    // Three states can strand content now, not one: an unfinished opacity
    // fade, a masked line still parked below its baseline, and a wipe still
    // clipping its picture to nothing.
    for (const el of document.querySelectorAll('.reveal')) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.9) {
        out.hidden.push(`opacity ${el.className?.toString().slice(0, 44)}`)
      }
    }
    for (const el of document.querySelectorAll('.r-line')) {
      const t = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      if (Math.abs(t.f) > 1) {
        out.hidden.push(`line +${Math.round(t.f)}px "${el.textContent?.trim().slice(0, 26)}"`)
      }
    }
    for (const el of document.querySelectorAll('.r-wipe')) {
      const clip = getComputedStyle(el).clipPath
      if (clip !== 'none' && !/inset\(0(px)?( 0(px)?){0,3}\)/.test(clip.replace(/\s+/g, ' '))) {
        out.hidden.push(`wipe ${clip.slice(0, 34)}`)
      }
    }

    // -- section rhythm ------------------------------------------------------
    const sections = [...document.querySelectorAll('main > section, main > div')]
    out.rhythm.gaps = sections.slice(1).map((el, i) => {
      const prev = sections[i].getBoundingClientRect()
      return Math.round(el.getBoundingClientRect().top - prev.bottom)
    })
    out.rhythm.headerHeight = Math.round(
      document.querySelector('header')?.getBoundingClientRect().height ?? 0,
    )
    out.rhythm.pageHeight = Math.round(document.body.scrollHeight)
    return out
  })

  console.log(`\n===== ${label} ${viewport.width}x${viewport.height} =====`)
  const sizes = Object.keys(report.type)
    .map(Number)
    .sort((a, b) => b - a)
  console.log(`type scale: ${sizes.length} distinct sizes`)
  for (const size of sizes) {
    const entry = report.type[size]
    console.log(`   ${String(size).padStart(5)}px x${String(entry.count).padStart(3)}  ${entry.sample}`)
  }
  console.log(
    `header ${report.rhythm.headerHeight}px | page ${report.rhythm.pageHeight}px | band gaps ${report.rhythm.gaps.join(', ')}`,
  )
  console.log(`contrast failures: ${report.contrast.length}`)
  for (const f of report.contrast) {
    console.log(`   ${f.ratio}:1 (needs ${f.floor}) ${f.size}px ${f.color}  "${f.text}"`)
  }
  console.log(`horizontal overflow: ${report.overflow.length}`)
  for (const o of report.overflow.slice(0, 6)) console.log(`   ${o.tag}.${o.cls} ${o.left}..${o.right}`)
  console.log(`tile text/picture collisions: ${report.collisions.length}`)
  for (const c of report.collisions) console.log(`   ${c.tile} (${c.overlapPx}px2)`)
  console.log(`still hidden after reveal: ${report.hidden.length}`)
  for (const h of report.hidden.slice(0, 10)) console.log(`   ${h}`)

  await context.close()
}

await browser.close()
