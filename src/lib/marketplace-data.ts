import 'server-only'

import { entetesLectureCommune } from '@/lib/appel-backend'

export interface BoutiqueMarketplace {
  id: string
  nom: string
  slug: string
  description: string | null
  modesLivraison: string[]
  villesLivraison: string[]
  /** La ville de la boutique elle-meme ; nulle si le marchand ne l'a pas encore renseignee. */
  ville?: string | null
  /** Le logo et la banniere choisis par la boutique ; sans eux, ses initiales et le fond par defaut. */
  logoUrl?: string | null
  banniereUrl?: string | null
  /** Le numero publie sur la page de la boutique (absent des listes). */
  telephone?: string | null
}

export interface OffreMarketplace {
  id: string
  titre: string | null
  prixFcfa: number | null
  prixReferenceFcfa: number | null
  etat: string | null
  delaiMaxJours: number | null
  disponible: number
  /** La disponibilite decidee par l'equipe : hors `en_stock`, l'offre n'est plus commandable. */
  statutStock?: 'en_stock' | 'rupture' | 'reapprovisionnement'
  quantiteMinimale?: number
  verifieParKatiLe?: string | null
  modesLivraison?: string[]
  villesLivraison?: string[]
  /** Caracteristiques propres a la variante, par exemple RAM ou capacite. */
  attributsVariante?: Record<string, string> | null
  /** La date de publication de l'offre (liste du catalogue). */
  publieLe?: string | null
  produit: {
    nom: string; slug: string; marque: string | null; categorie: string | null; ficheTechnique?: string | null; images?: Array<{ url: string; texteAlternatif: string | null }>
    /** La categorie KatiMarket du produit, avec son rayon parent quand c'est une sous-categorie. */
    categorieRef?: { nom: string; slug: string; parent: { nom: string; slug: string } | null } | null
  }
  boutique: { id?: string; nom: string; slug: string; ville?: string | null }
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

/** L'arbre des categories KatiMarket actives, tel que le marchand et le client le voient. */
export interface CategorieArbre {
  id: string
  nom: string
  slug: string
  garantie: { mois: number; libelle: string }
  sousCategories: Array<{ id: string; nom: string; slug: string; garantie: { mois: number; libelle: string }; sousCategories: Array<{ id: string; nom: string; slug: string; garantie: { mois: number; libelle: string } }> }>
}

/** Vide quand l'API ne repond pas : le menu se replie alors sur « Toutes les categories ». */
export async function lireCategoriesMarketplace(): Promise<CategorieArbre[]> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/categories`, { headers: entetesLectureCommune(), next: { revalidate: 300 } })
    return reponse.ok ? await reponse.json() as CategorieArbre[] : []
  } catch {
    return []
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'

export async function lireAccueilMarketplace(): Promise<AccueilMarketplace> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/accueil`, { headers: entetesLectureCommune(), next: { revalidate: 60 } })
    if (!reponse.ok) return { boutiques: [], offres: [] }
    return await reponse.json() as AccueilMarketplace
  } catch {
    return { boutiques: [], offres: [] }
  }
}

export async function lireBoutiqueMarketplace(slug: string): Promise<BoutiquePubliqueMarketplace | null> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/boutiques/${encodeURIComponent(slug)}`, { headers: entetesLectureCommune(), next: { revalidate: 60 } })
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
    const reponse = await fetch(`${BASE}/v1/marketplace/offres?${query}`, { headers: entetesLectureCommune(), next: { revalidate: 30 } })
    if (!reponse.ok) return vide
    return await reponse.json() as ListeOffresMarketplace
  } catch {
    return vide
  }
}

/**
 * LES REGLAGES PUBLICS DES SERVICES KATIMARKET, pour la page « Nos services » :
 * le taux de l'assurance de la commande et le programme KATI, tels que la
 * direction les regle. Chacun est nul si le backend ne repond pas : la page
 * garde alors ses phrases, sans chiffre, plutot que d'en inventer un.
 */
export interface ConditionsServices {
  assurance: { active: boolean; tauxBps: number } | null
  kati: { gainClientBps: number; commissionParrainBps: number; parrainageDureeMois: number; liberationApresLivraisonJours: number } | null
}

async function lireReglage<T>(chemin: string): Promise<T | null> {
  try {
    const reponse = await fetch(`${BASE}/v1${chemin}`, { headers: entetesLectureCommune(), next: { revalidate: 300 } })
    return reponse.ok ? await reponse.json() as T : null
  } catch {
    return null
  }
}

export async function lireConditionsServices(): Promise<ConditionsServices> {
  const [services, kati] = await Promise.all([
    lireReglage<{ assurance: ConditionsServices['assurance'] }>('/marketplace/services-commande'),
    lireReglage<NonNullable<ConditionsServices['kati']>>('/marketplace/kati/politique'),
  ])
  return { assurance: services?.assurance ?? null, kati }
}
