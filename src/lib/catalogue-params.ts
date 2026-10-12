export type CatalogueParams = Record<string, string | string[] | undefined>
export function catalogueParams(params: CatalogueParams) {
  const first = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]) ?? ''
  const price = (key: string) => /^\d{1,10}$/.test(first(key)) && Number(first(key)) <= 1_000_000_000 ? Number(first(key)) : undefined
  const rawTri = first('tri')
  const tri: 'recent' | 'prix_asc' | 'prix_desc' = rawTri === 'prix_asc' || rawTri === 'prix_desc' ? rawTri : 'recent'
  return { q: first('q').trim().slice(0, 100), categorie: first('categorie').slice(0, 160), marque: first('marque').slice(0, 160), prixMin: price('prixMin'), prixMax: price('prixMax'), tri, page: Math.min(10000, Math.max(1, Number.parseInt(first('page'), 10) || 1)), vue: first('vue') === 'liste' ? 'liste' as const : 'grille' as const }
}
