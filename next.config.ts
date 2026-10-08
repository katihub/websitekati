import type { NextConfig } from 'next'

// A BACKEND ON THIS MACHINE SERVES ITS OWN FILES, AND THE OPTIMISER HAS TO BE
// ALLOWED TO READ THEM.
//
// With `STOCKAGE_LOCAL` set, the local backend answers `urlPublique` with
// `http://localhost:<port>/fichiers/<bucket>/<path>` for every file it holds on
// disk: what the admin panel uploads on a workstation, and the banners copied
// there for development. Next 16 refuses both by default — the host is not in
// `remotePatterns`, and it resolves to a loopback address, which the optimiser
// rejects unless `dangerouslyAllowLocalIP` is on.
//
// Remote storage is not a substitute on a workstation. The optimiser gives up
// on an upstream after a fixed 7 seconds (`AbortSignal.timeout(7000)` in
// next/dist/server/image-optimizer.js, not configurable), and a 6 MB banner
// took 41 seconds from a Douala connection: every banner came back 500.
//
// Both allowances follow the API address instead of the environment name, so
// they exist only when that address is loopback. In production it is the
// public API, neither is added, and the SSRF protection stays whole.
const API = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null
const API_LOCALE = API !== null && ['localhost', '127.0.0.1', '[::1]'].includes(API.hostname)

/** One public bucket the pages show, under one storage base. */
type Motif = { protocol: 'http' | 'https'; hostname: string; port: string; pathname: string }

/** The two public buckets whose files are pictures: product photographs and banners. */
const SEAUX_IMAGES = ['produits', 'branding'] as const

/** Where a Supabase public object lives, after its storage base. */
const CHEMIN_PUBLIC = '/storage/v1/object/public/'

/**
 * The storage base of an address: everything before `/storage/v1/object/public/`,
 * prefix included (`/supabase` when Supabase answers behind the API's domain).
 * Given a bare origin or a Supabase URL, the URL itself, without a trailing
 * slash. `null` for anything that is not http(s).
 */
function baseStockage(adresse: string): string | null {
  const brute = adresse.trim()
  const coupe = brute.indexOf(CHEMIN_PUBLIC)
  const candidate = (coupe >= 0 ? brute.slice(0, coupe) : brute).replace(/\/+$/, '')
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' || url.protocol === 'http:' ? candidate : null
  } catch {
    return null
  }
}

/**
 * A storage base written as patterns: one per picture bucket, never the whole
 * host. The same Supabase instance also serves auth and REST, and an optimiser
 * allowed on all of it would fetch anything the instance exposes.
 */
function motifs(base: string): Motif[] {
  const url = new URL(base)
  const prefixe = url.pathname.replace(/\/+$/, '')
  return SEAUX_IMAGES.map((seau) => ({
    protocol: url.protocol.replace(':', '') as 'http' | 'https',
    hostname: url.hostname,
    port: url.port,
    pathname: `${prefixe}${CHEMIN_PUBLIC}${seau}/**`,
  }))
}

/**
 * WHERE THE BACKEND SAYS THE PICTURES ARE, ASKED AT BUILD TIME.
 *
 * The pages never invent an image address: every product and banner URL comes
 * from the API, which builds it from its own `SUPABASE_URL`. But Next's
 * optimiser only fetches from hosts listed here, and the list used to be typed
 * by hand — our VPS's sslip.io name, our API's domain, the old WordPress host.
 * Installed anywhere else, every picture would have come back as a 400 from the
 * optimiser.
 *
 * So the list is read where the addresses are made: one page of the public
 * catalogue, and the storage base of every picture on it. It also kept our own
 * production honest: the API serves pictures from a host this site's Supabase
 * URL does not name, and a list built from this site's variables alone would
 * have refused every photograph.
 *
 * Unreachable at build time — no network, API down — and the list falls back
 * to the variables below, with a warning: the site still builds.
 */
async function basesAnnonceesParLeBackend(): Promise<string[]> {
  if (!API) return []
  try {
    const reponse = await fetch(`${API.origin}/v1/catalogue/produits?taille=48`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/json' },
    })
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
    const corps = (await reponse.json()) as { produits?: { image?: string | null }[] }
    const bases = new Set<string>()
    for (const produit of corps.produits ?? []) {
      if (!produit.image?.includes(CHEMIN_PUBLIC)) continue
      const base = baseStockage(produit.image)
      if (base) bases.add(base)
    }
    return [...bases]
  } catch (erreur) {
    console.warn(
      `[images] the API at ${API.origin} could not be asked where pictures live ` +
        `(${(erreur as Error).message}). Only NEXT_PUBLIC_SUPABASE_URL and IMAGES_ORIGINES are allowed.`,
    )
    return []
  }
}

export default async function configuration(): Promise<NextConfig> {
  const bases = new Set<string>(await basesAnnonceesParLeBackend())
  // The Supabase this site signs in against: normally the very storage the API
  // builds its addresses from.
  const supabase = baseStockage(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  if (supabase) bases.add(supabase)
  // An explicit complement, comma-separated, for a host neither of the above
  // names: a storage move in progress, an old host still in a CDN's cache.
  for (const origine of (process.env.IMAGES_ORIGINES ?? '').split(',')) {
    const base = baseStockage(origine)
    if (base) bases.add(base)
  }

  return {
    images: {
      // Relative `/allege/...` pictures are files of this site, served from its
      // own origin: they need no pattern at all.
      remotePatterns: [
        ...[...bases].flatMap(motifs),
        ...(API_LOCALE && API
          ? [{
              protocol: API.protocol.replace(':', '') as 'http' | 'https',
              hostname: API.hostname,
              port: API.port,
              pathname: '/fichiers/**',
            }]
          : []),
      ],
      dangerouslyAllowLocalIP: API_LOCALE,
      // THE LADDER STOPS AT 1080, AND THE 502s ON VERCEL ARE WHY.
      //
      // The comment here used to say that packshots top out at 600x600 and that
      // anything larger is upscaling, and then listed 1200 and 1920 anyway. That
      // contradiction had a price. On a retina desktop the product page shows its
      // photograph at 710 css pixels, so the browser asks for 1420, so Next rounds
      // up to the next rung: 1920. Measured on the running optimiser, generating
      // that variant takes between 4.6 and 5.2 seconds, on top of fetching the
      // source from an origin that answers in 2 to 17. Vercel's image optimiser
      // has a budget, and the first visitor to each product paid it: 500 locally,
      // 502 in production.
      //
      // The ladder is now measured rather than assumed. Sampling 669 files from
      // the 6 686 exported to export/images: the median is 600 pixels wide, the
      // 75th centile 679, the 90th 1000, and only 0.6 per cent reach 1920. So the
      // top two rungs were upscaling 99.4 per cent of the library, spending five
      // seconds to invent pixels that were never photographed. Capping at 1080
      // gives the 710 pixel slot a 1.31x source, which on a packshot on white is
      // invisible, and it removes the rung that was timing out.
      imageSizes: [96, 128, 160, 200, 256, 320, 400],
      deviceSizes: [420, 640, 828, 1080],
      // AVIF FIRST, WEBP BEHIND IT, AND THE ORDER IS THE PREFERENCE. A browser
      // that accepts both is served AVIF, which on a packshot shot on white is
      // the case AVIF is best at: large flat areas and a single object. Everything
      // else falls back to WebP, and anything older than that to the original.
      //
      // The cost is the first encode, which is slower than WebP and happens once
      // per size per image, on the server, and is then cached for the 30 days
      // below. The reader never waits for it twice.
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 60 * 60 * 24 * 30,
    },
  }
}
