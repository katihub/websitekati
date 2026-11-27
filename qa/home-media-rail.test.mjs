import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('the home media rail is image-only and connected to its dedicated placement', async () => {
  const [component, home, banners] = await Promise.all([
    readFile(new URL('src/components/marketplace/AccueilMediaRail.tsx', root), 'utf8'),
    readFile(new URL('src/components/marketplace/MarketplaceHome.tsx', root), 'utf8'),
    readFile(new URL('src/lib/banners.ts', root), 'utf8'),
  ])

  assert.match(component, /<picture>/)
  assert.doesNotMatch(component, /<h[1-6](?:\s|>)|<p(?:\s|>)|<button(?:\s|>)/)
  assert.match(home, /<AccueilMediaRail medias=/)
  assert.match(banners, /media_accueil/)
})
