/**
 * Screenshot harness.
 *
 * Renders real routes off the running dev server at the three widths the design
 * is authored for, so every visual judgement is made against the browser rather
 * than against the source.
 *
 *   node qa/capture.mjs                       # all routes, all widths
 *   node qa/capture.mjs --routes / --only desktop
 *   node qa/capture.mjs --clip 0,0,1440,900   # crop, for looking at one band
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, 'shots')
mkdirSync(OUT, { recursive: true })

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? fallback : argv[index + 1]
}

const BASE = flag('base', 'http://localhost:3000')
const ROUTES = flag('routes', '/').split(',')
const CLIP = flag('clip', null)
// Clipped inspection shots are read back by eye, not by a browser, so they are
// captured at 1x to stay under the reader's pixel budget.
const SCALE = Number(flag('scale', CLIP ? 1 : 2))

const VIEWPORTS = {
  desktop: { width: 1440, height: 960, deviceScaleFactor: SCALE },
  tablet: { width: 834, height: 1112, deviceScaleFactor: SCALE },
  phone: { width: 390, height: 844, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true },
}

const only = flag('only', null)
const targets = only ? { [only]: VIEWPORTS[only] } : VIEWPORTS

const browser = await chromium.launch()
const problems = []

for (const [label, viewport] of Object.entries(targets)) {
  const context = await browser.newContext({ ...viewport, locale: 'fr-FR' })
  const page = await context.newPage()

  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`[${label}] console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`[${label}] page: ${error.message}`))

  for (const route of ROUTES) {
    const name = route === '/' ? 'home' : route.replace(/[/?=&]/g, '-').replace(/^-/, '')
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60_000 })
    // Walk the page in viewport steps rather than jumping to the bottom, so
    // scroll-triggered work sees every band the way a reader would, and lazy
    // images get a chance to decode.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((resolve) => setTimeout(resolve, 120))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(OUT, `${name}-${label}.png`),
      // Clip coordinates are page coordinates, which only exist when the whole
      // page is being captured. Without fullPage they collapse to whatever the
      // viewport happens to be showing.
      fullPage: true,
      ...(CLIP
        ? {
            clip: Object.fromEntries(
              ['x', 'y', 'width', 'height'].map((key, i) => [key, Number(CLIP.split(',')[i])]),
            ),
          }
        : {}),
    })
    console.log(`  ${name}-${label}.png`)
  }

  await context.close()
}

await browser.close()

if (problems.length) {
  console.log(`\n${problems.length} runtime problem(s):`)
  for (const problem of [...new Set(problems)].slice(0, 20)) console.log(`  ${problem}`)
} else {
  console.log('\nno console or page errors')
}
