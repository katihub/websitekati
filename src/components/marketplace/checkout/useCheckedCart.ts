'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { CartLine } from '@/lib/cart'
import { checkLines, type LiveProduct } from '@/lib/marketplace-checkout'

export function useCheckedCart(lines: readonly CartLine[]) {
  const slugs = JSON.stringify([...new Set(lines.filter(line => line.offerId).map(line => line.slug))].sort())
  const [result, setResult] = useState<{ slugs: string; products: LiveProduct[]; error: string }>({ slugs: '', products: [], error: '' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void api<LiveProduct[]>('/marketplace/panier/verifier', { methode: 'POST', corps: { slugs: JSON.parse(slugs) }, anonyme: true, signal: controller.signal }).then(products => {
      if (!controller.signal.aborted) setResult({ slugs, products, error: '' })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ slugs, products: [], error: 'Impossible de vérifier les prix et le stock. Réessayez avant de commander.' })
    })
    return () => controller.abort()
  }, [slugs, retry])
  const loading = result.slugs !== slugs
  return { checked: checkLines(lines, result.slugs === slugs ? result.products : []), loading, error: result.error, refresh: () => { setResult({ slugs: '', products: [], error: '' }); setRetry(value => value + 1) } }
}
