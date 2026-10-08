/**
 * Downloads the manufacturer logomarks the brand wall renders.
 *
 *   node scripts/fetch-brand-marks.mjs
 *
 * WHY THE FILES ARE COMMITTED. They are fetched once, written to
 * `public/brands/`, and served from our own origin. A CDN `<img>` per logo would
 * put fourteen third-party requests on the critical path of a page whose
 * audience is on a metered connection, and would break the day the CDN does.
 * Nothing at runtime talks to simpleicons.org.
 *
 * WHAT IS DOWNLOADED. Simple Icons ships the marks themselves under CC0. The
 * trademarks remain their owners'; a distributor naming and showing the brands
 * it stocks is nominative use, which is what this wall is. Each file is a single
 * path with no colour, which is why the component can paint it as a mask.
 *
 * WHICH BRANDS. Only those the catalog actually carries AND that have a mark.
 * Thirty-three of 101. The other 67 have no file in the set at all: Simple Icons
 * removed most non-free marks in 2024, which is why Hikvision (266 references),
 * Canon (157), D-Link (57), APC (48) and HPE (43) are absent despite being among
 * the deepest brands here. No substitute is fetched for them from anywhere else,
 * because provenance that cannot be stated is provenance that does not exist.
 * The wall is ranked by the same depth the rest of the site ranks brands by, so
 * a brand with no mark is skipped rather than drawn as a word beside a logo:
 * half a wall of type and half a wall of marks reads as a wall that failed to
 * load. Hikvision, Dahua, ZKTeco, Grandstream, Canon and D-Link have no mark in
 * the set and are reachable from `/marques` instead.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Catalog brand name -> Simple Icons slug. */
const MARKS = {
  HP: 'hp',
  LENOVO: 'lenovo',
  'TP-LINK': 'tplink',
  LG: 'lg',
  MIKROTIK: 'mikrotik',
  DELL: 'dell',
  EPSON: 'epson',
  UBIQUITI: 'ubiquiti',
  CISCO: 'cisco',
  PANASONIC: 'panasonic',
  SYNOLOGY: 'synology',
  QNAP: 'qnap',
  NETGEAR: 'netgear',
  ACER: 'acer',
  SEAGATE: 'seagate',
  ZEBRA: 'zebratechnologies',
  SAMSUNG: 'samsung',
  XIAOMI: 'xiaomi',
  TOSHIBA: 'toshiba',
  SONY: 'sony',
  // Second pass. Everything below was checked against Simple Icons' own index
  // (3 453 entries) rather than guessed at: of the 101 brands the ingest
  // recovered, exactly 34 exist there and 67 do not.
  FORTINET: 'fortinet',
  KASPERSKY: 'kaspersky',
  INTEL: 'intel',
  HUAWEI: 'huawei',
  MSI: 'msi',
  JBL: 'jbl',
  APPLE: 'apple',
  ASUS: 'asus',
  GARMIN: 'garmin',
  KINGSTON: 'kingstontechnology',
  LINKSYS: 'linksys',
  IMOU: 'imou',
  NIKON: 'nikon',
}

const OUT = join(process.cwd(), 'public', 'brands')
await mkdir(OUT, { recursive: true })

const manifest = []
for (const [brand, slug] of Object.entries(MARKS)) {
  const response = await fetch(`https://cdn.simpleicons.org/${slug}`)
  if (!response.ok) {
    console.warn(`skip ${brand}: ${response.status}`)
    continue
  }
  const svg = await response.text()
  // The CDN paints the brand colour into the path; the wall paints its own, so
  // the fill is stripped and the file is left as pure geometry.
  const clean = svg.replace(/ fill="[^"]*"/g, '')
  await writeFile(join(OUT, `${slug}.svg`), clean, 'utf8')

  const colour = await fetch(`https://cdn.simpleicons.org/${slug}`)
    .then((r) => r.text())
    .then((s) => s.match(/fill="(#[0-9a-fA-F]{6})"/)?.[1] ?? null)
  manifest.push({ brand, slug, colour })
  console.log(`${brand.padEnd(10)} ${slug.padEnd(18)} ${colour ?? '-'}`)
}

console.log(`\n${manifest.length} marks written to public/brands/`)
console.log(JSON.stringify(manifest, null, 2))
