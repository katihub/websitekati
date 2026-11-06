import type { CategorieArbre } from '@/lib/marketplace-data'

export const UNIVERS_CATEGORIES = [
  { slug: 'high-tech', nom: 'High-Tech', icone: 'laptop' },
  { slug: 'maison-electro', nom: 'Maison & Electro', icone: 'home' },
  { slug: 'mode-cosmetique', nom: 'Mode & Cosmetique', icone: 'star' },
] as const

export type UniversCategorie = (typeof UNIVERS_CATEGORIES)[number]

const MOTIFS: Record<UniversCategorie['slug'], RegExp> = {
  'high-tech': /informatique|electronique|high.?tech/,
  'maison-electro': /electromenager|maison|energie|agro|aliment|food/,
  'mode-cosmetique': /mode|style|cosmet|beaute|soin/,
}

function cle(texte: string) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
}

export function universPourSlug(slug: string): UniversCategorie | null {
  return UNIVERS_CATEGORIES.find((univers) => univers.slug === slug) ?? null
}

export function categoriesDansUnivers(
  categories: readonly CategorieArbre[],
  univers: UniversCategorie,
): CategorieArbre[] {
  const motif = MOTIFS[univers.slug]
  return categories.filter((categorie) =>
    motif.test(cle(`${categorie.slug} ${categorie.nom}`)),
  )
}
