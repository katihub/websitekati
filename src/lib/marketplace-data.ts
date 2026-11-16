import 'server-only'

import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { entetesLectureCommune, entetesPourVisiteur } from '@/lib/appel-backend'
import { lireJsonMarketplaceAvecReprise } from '@/lib/marketplace-resilience'
import { TAILLE_LOT_BOUTIQUE } from '@/lib/shop-catalogue'

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
  /** Les vrais avis « produit » publies (9 novembre 2026) ; null : produit encore sans avis. */
  avis?: { moyenne: number; nombre: number } | null
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
export type BoutiquePubliqueMarketplace = BoutiqueMarketplace & {
  offres: OffreBoutiqueMarketplace[]
  pagination?: ListeOffresMarketplace['pagination']
  facettes?: ListeOffresMarketplace['facettes']
  /** Vrai uniquement sur un premier chargement sans copie valide : l'identite reste visible. */
  catalogueIndisponible?: boolean
}

export interface AccueilMarketplace {
  boutiques: BoutiqueMarketplace[]
  offres: OffreMarketplace[]
}

export interface ListeOffresMarketplace {
  indisponible?: boolean
  facettes?: {
    categories: { nom: string; nombre: number }[]
    marques: { nom: string; nombre: number }[]
    /** Le nombre d'offres de chaque categorie, par slug, compte comme sa page (9 novembre 2026). */
    parCategorie?: Record<string, number>
  }
  offres: OffreMarketplace[]
  pagination: { page: number; taille: number; total: number; pages: number }
  filtres: { q: string | null; categorie: string | null; boutique: string | null; tri: string }
  /** La categorie de la page, quand le catalogue est filtre par `categorieSlug`. */
  categorie?: { nom: string; slug: string; parent: { nom: string; slug: string } | null } | null
}

interface ParametresOffresMarketplace {
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
}

function parametresOffresMarketplace(params: ParametresOffresMarketplace) {
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
  return query
}

function sansCatalogueBoutique(boutique: BoutiquePubliqueMarketplace): BoutiqueMarketplace {
  const identite = { ...boutique }
  const champsOptionnels = identite as Partial<BoutiquePubliqueMarketplace>
  delete champsOptionnels.offres
  delete champsOptionnels.pagination
  delete champsOptionnels.facettes
  return identite
}

function sansBoutique(offre: OffreMarketplace): OffreBoutiqueMarketplace {
  const copie = { ...offre }
  delete (copie as Partial<OffreMarketplace>).boutique
  return copie
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

/** Cache complet des pages boutique, rafraichi sans retirer la derniere copie valide. */
export const ETIQUETTE_BOUTIQUES_MARKETPLACE = 'marketplace-boutiques'

class CatalogueBoutiquePartiel extends Error {
  constructor(readonly boutique: BoutiqueMarketplace, cause: unknown) {
    super(`les offres de la boutique ${boutique.slug} sont indisponibles`, { cause })
    this.name = 'CatalogueBoutiquePartiel'
  }
}

export async function lireAccueilMarketplace(): Promise<AccueilMarketplace> {
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/accueil`, { headers: entetesLectureCommune(), next: { revalidate: 60 } })
    if (!reponse.ok) return { boutiques: [], offres: [] }
    return await reponse.json() as AccueilMarketplace
  } catch {
    return { boutiques: [], offres: [] }
  }
}

/** Une page de l'annuaire des boutiques : trente au plus, avec les villes pour le filtre. */
export interface AnnuaireBoutiques {
  boutiques: BoutiqueMarketplace[]
  villes: string[]
  pagination: { page: number; taille: number; total: number; pages: number }
  indisponible?: boolean
}

/**
 * L'ANNUAIRE DES BOUTIQUES, PAR PAGES DE TRENTE.
 *
 * L'accueil s'arrete a vingt boutiques ; la page « Boutiques » lit cette route
 * pour les montrer toutes, une page a la fois, filtrees par le serveur.
 */
export async function lireBoutiquesMarketplace(params: { page?: number; q?: string; ville?: string }): Promise<AnnuaireBoutiques> {
  const vide: AnnuaireBoutiques = { boutiques: [], villes: [], pagination: { page: 1, taille: 30, total: 0, pages: 1 }, indisponible: true }
  const query = new URLSearchParams()
  if (params.page && params.page > 1) query.set('page', String(params.page))
  if (params.q) query.set('q', params.q)
  if (params.ville) query.set('ville', params.ville)
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/boutiques?${query}`, { headers: entetesLectureCommune(), next: { revalidate: 60 } })
    if (!reponse.ok) return vide
    return await reponse.json() as AnnuaireBoutiques
  } catch {
    return vide
  }
}

/**
 * L'IDENTITE D'UNE BOUTIQUE, SANS SES OFFRES.
 *
 * `/marketplace/boutiques/:slug` donne l'identite de la boutique, sans son telephone
 * depuis le 9 novembre 2026 : les clients passent par KatiMarket. Elle
 * renvoyait aussi TOUTES les offres (4 Mo et 8 s pour les 3 393 produits de
 * NowTech) ; depuis le 7 novembre 2026, elle ne renvoie plus que l'identite. Les
 * champs d'offres restent ecartes ici tant qu'un ancien backend peut repondre.
 */
/**
 * La boutique et son PREMIER lot d'offres ; `useOffresBoutique` lit les suivants.
 *
 * UNE PANNE LEVE, ET SEULE UNE BOUTIQUE INCONNUE REND `null`. La page est gardee
 * en cache : une regeneration qui leve laisse en place la derniere bonne copie,
 * alors qu'un `null` publierait une page 404 pendant la panne.
 */
const lireBoutiqueMarketplaceCachee = unstable_cache(async (slug: string): Promise<BoutiquePubliqueMarketplace | null> => {
  const query = parametresOffresMarketplace({ boutique: slug, taille: TAILLE_LOT_BOUTIQUE })
  const [resultatIdentite, resultatListe] = await Promise.allSettled([
    lireJsonMarketplaceAvecReprise<BoutiquePubliqueMarketplace>({
      chemin: `${BASE}/v1/marketplace/boutiques/${encodeURIComponent(slug)}`,
      entetes: entetesLectureCommune(),
      absentSi404: true,
    }),
    lireJsonMarketplaceAvecReprise<ListeOffresMarketplace>({
      chemin: `${BASE}/v1/marketplace/offres?${query}`,
      entetes: entetesLectureCommune(),
    }),
  ])
  const brut = resultatIdentite.status === 'fulfilled' ? resultatIdentite.value : null
  const liste = resultatListe.status === 'fulfilled' ? resultatListe.value : null
  const identite = brut ? sansCatalogueBoutique(brut) : undefined
  const boutique = identite ?? (await lireAccueilMarketplace()).boutiques.find((item) => item.slug === slug)
  if (!boutique) {
    if (resultatIdentite.status === 'rejected') throw resultatIdentite.reason
    return null
  }
  if (!liste) {
    const cause = resultatListe.status === 'rejected' ? resultatListe.reason : 'reponse vide'
    throw new CatalogueBoutiquePartiel(boutique, cause)
  }

  return {
    ...boutique,
    offres: liste.offres.map(sansBoutique),
    pagination: liste.pagination,
    facettes: liste.facettes,
  }
}, ['boutique-publique-resiliente-v1', BASE], { revalidate: 60, tags: [ETIQUETTE_BOUTIQUES_MARKETPLACE] })

export const lireBoutiqueMarketplace = cache(async (slug: string) => {
  try {
    return await lireBoutiqueMarketplaceCachee(slug)
  } catch (erreur) {
    /* Une reponse partielle n'entre jamais dans le cache. Elle sert seulement
       la toute premiere visite quand aucune ancienne copie n'existe encore. */
    if (!(erreur instanceof CatalogueBoutiquePartiel)) throw erreur
    return {
      ...erreur.boutique,
      offres: [],
      catalogueIndisponible: true,
    } satisfies BoutiquePubliqueMarketplace
  }
})

export async function lireOffresMarketplace(params: ParametresOffresMarketplace = {}, visiteur?: string): Promise<ListeOffresMarketplace> {
  const query = parametresOffresMarketplace(params)
  const vide: ListeOffresMarketplace = {
    indisponible: true,
    offres: [],
    pagination: { page: params.page ?? 1, taille: params.taille ?? 24, total: 0, pages: 1 },
    filtres: { q: params.q ?? null, categorie: params.categorie ?? null, boutique: params.boutique ?? null, tri: params.tri ?? 'recent' },
  }
  try {
    const reponse = await fetch(`${BASE}/v1/marketplace/offres?${query}`, { headers: visiteur === undefined ? entetesLectureCommune() : entetesPourVisiteur(visiteur), next: { revalidate: 30 } })
    if (!reponse.ok) {
      console.error(`[marketplace] /v1/marketplace/offres : le backend a repondu ${reponse.status}`)
      return vide
    }
    return await reponse.json() as ListeOffresMarketplace
  } catch (erreur) {
    console.error(`[marketplace] /v1/marketplace/offres : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
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
