import { expect, test, type Page } from '@playwright/test'

/**
 * LE CONFORT D'AFFICHAGE, DU TELEPHONE AU PORTABLE.
 * L'en-tete garde le compte et le panier dans l'ecran a toutes les largeurs ;
 * sur telephone, la partie qui reste collee en haut ne mange pas l'ecran ; et
 * aucun texte visible ne descend sous 10 px.
 */

const LARGEURS = [320, 360, 390, 768, 820, 1024, 1100, 1280, 1440]

async function dansLEcran(page: Page, selecteur: string) {
  return page.locator(selecteur).first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.left >= 0 && r.right <= document.documentElement.clientWidth + 1
  })
}

test.describe('en-tête responsive', () => {
  for (const largeur of LARGEURS) {
    test(`garde le compte et le panier dans l'écran à ${largeur} px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 800 })
      await page.goto('/faq')
      await expect(page.locator('[data-marketplace-actions] a[href="/espace-vendeur"]')).toBeVisible()
      expect(await dansLEcran(page, '[data-marketplace-actions] a[href="/espace-vendeur"]')).toBe(true)
      expect(await dansLEcran(page, '[data-marketplace-actions] a[href="/panier"]')).toBe(true)
    })
  }

  test('sur téléphone, la partie collée en haut laisse la page lisible', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/faq')
    await page.evaluate(() => window.scrollTo(0, 1200))
    await expect.poll(() => page.locator('[data-marketplace-header]').evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(190)
    await expect(page.locator('[data-marketplace-actions] a[href="/panier"]')).toBeInViewport()
  })

  test('les onglets des catégories tiennent dans un écran de 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/categories')
    const debord = await page.evaluate(() => [...document.querySelectorAll('main *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || r.right <= document.documentElement.clientWidth + 1) return false
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return false
        }
        return true
      }).length)
    expect(debord).toBe(0)
  })
})

test.describe('textes lisibles sur téléphone', () => {
  for (const route of ['/', '/categories', '/devenir-vendeur', '/faq']) {
    test(`aucun texte visible sous 10 px sur ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const minuscules = await page.evaluate(() => [...document.body.querySelectorAll('*')]
        .filter((el) => {
          const s = getComputedStyle(el)
          const r = el.getBoundingClientRect()
          const texte = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
          return texte && r.width > 0 && r.height > 1 && s.visibility !== 'hidden' && parseFloat(s.fontSize) < 10
        })
        .map((el) => `${(el.textContent ?? '').trim().slice(0, 40)} (${getComputedStyle(el).fontSize})`))
      expect(minuscules).toEqual([])
    })
  }
})
