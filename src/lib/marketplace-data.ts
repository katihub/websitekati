import 'server-only'

export interface BoutiqueMarketplace {
  id: string
  nom: string
  slug: string
  description: string | null
  modesLivraison: string[]
  villesLivraison: string[]
  /** La ville de la boutique elle-meme ; nulle si le marchand ne l'a pas encore renseignee. */
  ville?: string | null
}

export interface OffreMarketplace {
  id: string
  titre: string | null
  prixFcfa: number | null
  prixReferenceFcfa: number | null
  etat: string | null
  delaiMaxJours: number | null
  disponible: number
  modesLivraison?: string[]
  villesLivraison?: string[]
  produit: { nom: string; slug: string; marque: string | null; categorie: string | null; images?: Array<{ url: string; texteAlternatif: string | null }> }
  boutique: { nom: string; slug: string }
}

// L’API boutique fournit son identité une seule fois, pas dans chaque offre.
export type OffreBoutiqueMarketplace = Omit<OffreMarketplace, 'boutique'>
export type BoutiquePubliqueMarketplace = BoutiqueMarketplace & { offres: OffreBoutiqueMarketplace[] }

export interface AccueilMarketplace {
  boutiques: BoutiqueMarketplace[]
  offres: OffreMarketplace[]
}

export interface ListeOffresMarketplace {
  indisponible?: boolean
  facettes?: { categories: { nom: string; nombre: number }[]; marques: { nom: string; nombre: number }[] }
  offres: OffreMarketplace[]
  pagination: { page: number; taille: number; total: number; pages: number }
  filtres: { q: string | null; categorie: string | null; boutique: string | null; tri: string }
  /** La categorie de la page, quand le catalogue est filtre par `categorieSlug`. */
  categorie?: { nom: string; slug: string; parent: { nom: string; slug: string } | null } | null
}

/** L'arbre des categories KatiHub actives, tel que le marchand et le client le voient. */
export interface CategorieArbre {
  id: string
  nom: string
  slug: string
  garantie: { mois: number; libelle: string }
  sousCategories: Array<{ id: string; nom: string; slug: string; garantie: { mois: number; libelle: string } }>
}

/** Vide quand l'API ne repond pas : le menu se replie alors sur « Toutes les categories ». */
export async function lireCategoriesMarketplace(): Promise<CategorieArbre[]> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/categories`, { next: { revalidate: 300 } })
    return reponse.ok ? await reponse.json() as CategorieArbre[] : []
  } catch {
    return []
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'

export async function lireAccueilMarketplace(): Promise<AccueilMarketplace> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/accueil`, { next: { revalidate: 60 } })
    if (!reponse.ok) return { boutiques: [], offres: [] }
    return await reponse.json() as AccueilMarketplace
  } catch {
    return { boutiques: [], offres: [] }
  }
}

export async function lireBoutiqueMarketplace(slug: string): Promise<BoutiquePubliqueMarketplace | null> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/boutiques/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (!reponse.ok) return null
    return await reponse.json()
  } catch {
    return null
  }
}

export async function lireOffresMarketplace(params: {
  marque?: string
  prixMin?: number
  prixMax?: number
  q?: string
  categorie?: string
  categorieSlug?: string
  boutique?: string
  tri?: 'recent' | 'prix_asc' | 'prix_desc'
  page?: number
  taille?: number
} = {}): Promise<ListeOffresMarketplace> {
  const query = new URLSearchParams()
  if (params.marque) query.set('marque', params.marque)
  if (params.prixMin !== undefined) query.set('prixMin', String(params.prixMin))
  if (params.prixMax !== undefined) query.set('prixMax', String(params.prixMax))
  if (params.q) query.set('q', params.q)
  if (params.categorie) query.set('categorie', params.categorie)
  if (params.categorieSlug) query.set('categorieSlug', params.categorieSlug)
  if (params.boutique) query.set('boutique', params.boutique)
  if (params.tri) query.set('tri', params.tri)
  query.set('page', String(params.page ?? 1))
  query.set('taille', String(params.taille ?? 24))
  const vide: ListeOffresMarketplace = {
    indisponible: true,
    offres: [],
    pagination: { page: params.page ?? 1, taille: params.taille ?? 24, total: 0, pages: 1 },
    filtres: { q: params.q ?? null, categorie: params.categorie ?? null, boutique: params.boutique ?? null, tri: params.tri ?? 'recent' },
  }
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/offres?${query}`, { next: { revalidate: 30 } })
    if (!reponse.ok) return vide
    return await reponse.json() as ListeOffresMarketplace
  } catch {
    return vide
  }
}
