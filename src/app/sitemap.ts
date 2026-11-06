import type { MetadataRoute } from 'next'

import { legalPages } from '@/components/marketplace/legal-content'
import {
  lireAccueilMarketplace,
  lireCategoriesMarketplace,
  lireOffresMarketplace,
  type CategorieArbre,
  type ListeOffresMarketplace,
} from '@/lib/marketplace-data'

const ORIGINE = 'https://www.katimarket.com'
const TAILLE_PAGE = 100
const PAGES_PAR_LOT = 4
const LIMITE_URLS_GOOGLE = 50_000

export const revalidate = 3600

function url(chemin: string) {
  return new URL(chemin, ORIGINE).toString()
}

function slugsCategories(categories: readonly CategorieArbre[]): string[] {
  return categories.flatMap((categorie) => [
    categorie.slug,
    ...categorie.sousCategories.flatMap((sousCategorie) => [
      sousCategorie.slug,
      ...sousCategorie.sousCategories.map((enfant) => enfant.slug),
    ]),
  ])
}

async function lireToutesLesOffres(): Promise<ListeOffresMarketplace[]> {
  const premierePage = await lireOffresMarketplace({ page: 1, taille: TAILLE_PAGE })
  if (premierePage.indisponible) {
    console.error('[sitemap] Le catalogue marketplace est indisponible; les pages fixes resteront disponibles.')
    return []
  }

  const nombrePages = premierePage.pagination.pages
  if (!Number.isSafeInteger(nombrePages) || nombrePages < 1) {
    console.error('[sitemap] Le catalogue a renvoyé un nombre de pages invalide.')
    return [premierePage]
  }

  const pages = [premierePage]
  const limitePages = Math.min(nombrePages, Math.ceil(LIMITE_URLS_GOOGLE / TAILLE_PAGE))
  if (nombrePages > limitePages) {
    console.error(`[sitemap] Le catalogue dépasse la limite de ${LIMITE_URLS_GOOGLE} offres par sitemap.`)
  }

  for (let debut = 2; debut <= limitePages; debut += PAGES_PAR_LOT) {
    const numeros = Array.from(
      { length: Math.min(PAGES_PAR_LOT, limitePages - debut + 1) },
      (_, index) => debut + index,
    )
    const lot = await Promise.all(
      numeros.map((page) => lireOffresMarketplace({ page, taille: TAILLE_PAGE })),
    )
    for (const resultat of lot) {
      if (resultat.indisponible) {
        console.error(`[sitemap] Impossible de lire la page ${resultat.pagination.page} du catalogue.`)
      } else {
        pages.push(resultat)
      }
    }
  }

  return pages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagesStatiques: MetadataRoute.Sitemap = [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/catalogue'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/boutiques'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/mon-budget'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/univers/high-tech'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/univers/maison-electro'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/univers/mode-cosmetique'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/categories'), changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/marques'), changeFrequency: 'weekly', priority: 0.7 },
    { url: url('/promotions'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/soldes'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/a-propos'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/contact'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/faq'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/services'), changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/devenir-vendeur'), changeFrequency: 'monthly', priority: 0.6 },
    ...Object.keys(legalPages).map((slug) => ({
      url: url(`/${slug}`),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ]

  const [categories, accueil, pagesOffres] = await Promise.all([
    lireCategoriesMarketplace(),
    lireAccueilMarketplace(),
    lireToutesLesOffres(),
  ])

  const boutiques = new Set(accueil.boutiques.map((boutique) => boutique.slug))
  const produits = new Set<string>()
  for (const offre of [...accueil.offres, ...pagesOffres.flatMap((page) => page.offres)]) {
    if (offre.boutique.slug) boutiques.add(offre.boutique.slug)
    if (offre.produit.slug) produits.add(offre.produit.slug)
  }

  const dynamiques: MetadataRoute.Sitemap = [
    ...slugsCategories(categories).map((slug) => ({
      url: url(`/categories/${encodeURIComponent(slug)}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...[...boutiques].map((slug) => ({
      url: url(`/boutiques/${encodeURIComponent(slug)}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...[...produits].map((slug) => ({
      url: url(`/marketplace/produits/${encodeURIComponent(slug)}`),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]

  const uniques = new Map<string, MetadataRoute.Sitemap[number]>()
  for (const entree of [...pagesStatiques, ...dynamiques]) uniques.set(entree.url, entree)
  const resultat = [...uniques.values()]
  if (resultat.length > LIMITE_URLS_GOOGLE) {
    console.error(`[sitemap] ${resultat.length} URLs dépassent la limite Google; le sitemap est limité à ${LIMITE_URLS_GOOGLE}.`)
    return resultat.slice(0, LIMITE_URLS_GOOGLE)
  }
  return resultat
}
