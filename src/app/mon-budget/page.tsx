import type { Metadata } from 'next'
import Link from 'next/link'

import { CatalogueProductCard } from '@/components/marketplace/CatalogueProductCard'
import { ShopIcon } from '@/components/marketplace/ShopIcon'
import { lireCategoriesMarketplace, lireOffresMarketplace, type OffreMarketplace } from '@/lib/marketplace-data'
import { categoriesDansUnivers, UNIVERS_CATEGORIES } from '@/lib/univers-categories'
import styles from './mon-budget.module.css'

export const metadata: Metadata = {
  title: 'Mon Budget',
  description: 'Choisissez vos catégories et votre budget pour trouver les offres disponibles sur KatiMarket.',
}

type SearchParams = Record<string, string | string[] | undefined>

function valeurs(params: SearchParams, cle: string): string[] {
  const valeur = params[cle]
  return (Array.isArray(valeur) ? valeur : valeur ? [valeur] : []).filter(Boolean)
}

function prixValide(valeur: string | undefined) {
  return valeur && /^\d{1,10}$/.test(valeur) && Number(valeur) <= 1_000_000_000
    ? Number(valeur)
    : undefined
}

function disponible(offre: OffreMarketplace) {
  return offre.prixFcfa !== null && offre.prixFcfa > 0 && offre.disponible > 0 && offre.statutStock !== 'rupture'
}

function arrondirBudget(prix: number) {
  const pas = prix <= 10_000 ? 500 : prix <= 50_000 ? 1_000 : prix <= 200_000 ? 5_000 : 10_000
  return Math.ceil(prix / pas) * pas
}

function suggestionsBudget(offres: readonly OffreMarketplace[], minimum?: number): number[] {
  const montants = [...new Set(offres.filter((offre) =>
    disponible(offre) && (minimum === undefined || offre.prixFcfa! >= minimum),
  ).map((offre) => arrondirBudget(offre.prixFcfa!)))]
    .sort((a, b) => a - b)
  if (montants.length <= 10) return montants
  return Array.from({ length: 10 }, (_, index) =>
    montants[Math.round(index * (montants.length - 1) / 9)]!,
  ).filter((montant, index, liste) => index === 0 || montant !== liste[index - 1])
}

function cheminBudget(categories: readonly string[], minimum?: number, maximum?: number) {
  const params = new URLSearchParams()
  categories.forEach((categorie) => params.append('univers', categorie))
  if (minimum !== undefined) params.set('prixMin', String(minimum))
  if (maximum !== undefined) params.set('prixMax', String(maximum))
  const query = params.toString()
  return `/mon-budget${query ? `?${query}` : ''}`
}

export default async function MonBudgetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const arbre = await lireCategoriesMarketplace()
  const universDisponibles = UNIVERS_CATEGORIES.map((univers) => ({
    univers,
    categories: categoriesDansUnivers(arbre, univers),
  }))
  const slugsConnus = new Set(universDisponibles.flatMap(({ categories }) => categories.map(({ slug }) => slug)))
  const universChoisis = [...new Set(valeurs(params, 'univers'))]
    .filter((slug) => UNIVERS_CATEGORIES.some((univers) => univers.slug === slug))
  const min = prixValide(Array.isArray(params.prixMin) ? params.prixMin[0] : params.prixMin)
  const max = prixValide(Array.isArray(params.prixMax) ? params.prixMax[0] : params.prixMax)
  const categoriesChoisies = universDisponibles
    .filter(({ univers }) => universChoisis.includes(univers.slug))
    .flatMap(({ categories }) => categories)
    .filter((categorie) => slugsConnus.has(categorie.slug))
  const invalidInterval = min !== undefined && max !== undefined && min > max
  const aChoisiUnUnivers = universChoisis.length > 0
  const sources = categoriesChoisies.length
    ? categoriesChoisies.map((categorie) => ({ categorie, categorieSlug: categorie.slug }))
    : aChoisiUnUnivers ? [] : [{ categorie: null, categorieSlug: undefined }]

  const listes = invalidInterval
    ? []
    : await Promise.all(sources.map(({ categorieSlug }) => lireOffresMarketplace({
        categorieSlug,
        prixMin: min,
        prixMax: max,
        page: 1,
        taille: 24,
        tri: 'prix_asc',
      })))
  const listesPourSuggestions = invalidInterval
    ? []
    : await Promise.all(sources.map(({ categorieSlug }) => lireOffresMarketplace({
        categorieSlug,
        page: 1,
        taille: 24,
        tri: 'recent',
      })))
  const offresParId = new Map<string, OffreMarketplace>()
  for (const liste of listes) {
    for (const offre of liste.offres) if (disponible(offre)) offresParId.set(offre.id, offre)
  }
  const offres = [...offresParId.values()].sort((a, b) => a.prixFcfa! - b.prixFcfa!)
  const offresPourSuggestions = listesPourSuggestions.flatMap((liste) => liste.offres)
  const suggestions = suggestionsBudget(offresPourSuggestions, min)
  const indisponible = listes.some((liste) => liste.indisponible)
  const suggestionsIndisponibles = listesPourSuggestions.some((liste) => liste.indisponible)
  const selection = universChoisis

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link><span>›</span><span aria-current="page">Mon Budget</span>
        </nav>
        <header className={styles.intro}>
          <ShopIcon name="wallet" />
          <div><p>VOTRE SÉLECTION PERSONNALISÉE</p><h1>Mon Budget</h1>
            <span>Choisissez vos univers et votre budget pour trouver des offres disponibles.</span>
          </div>
        </header>

        <form action="/mon-budget" method="get" className={styles.filters}>
          <fieldset>
            <legend>1. Choisissez vos catégories</legend>
            <div className={styles.univers}>
              {universDisponibles.map(({ univers, categories }) => (
                <label key={univers.slug} className={styles.universOption}>
                  <input type="checkbox" name="univers" value={univers.slug} defaultChecked={selection.includes(univers.slug)} disabled={!categories.length} />
                  <ShopIcon name={univers.icone} />
                  <span><b>{univers.nom}</b><small>{categories.map((categorie) => categorie.nom).join(' · ') || 'Catégories à venir'}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>2. Définissez votre budget</legend>
            <div className={styles.prices}>
              <label>Minimum (FCFA)<input type="number" name="prixMin" min="0" max="1000000000" step="500" inputMode="numeric" defaultValue={min} placeholder="Sans minimum" /></label>
              <label>Maximum (FCFA)<input type="number" name="prixMax" min="0" max="1000000000" step="500" inputMode="numeric" defaultValue={max} placeholder="Sans maximum" /></label>
              <button type="submit"><ShopIcon name="search" />Voir les offres</button>
            </div>
          </fieldset>
        </form>

        <section className={styles.shortcuts} aria-labelledby="suggestions-titre">
          <header><div><p>DES IDÉES SELON VOS CHOIX</p><h2 id="suggestions-titre">Quel montant maximum ?</h2></div>
            <span>{suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}</span>
          </header>
          {suggestions.length ? (
            <div className={styles.chips}>
              {suggestions.map((montant) => (
                <Link key={montant} href={cheminBudget(selection, min, montant)} aria-current={max === montant ? 'true' : undefined}>
                  Maxi {new Intl.NumberFormat('fr-FR').format(montant)} F
                </Link>
              ))}
            </div>
          ) : <p className={suggestionsIndisponibles ? styles.error : styles.hint} role={suggestionsIndisponibles ? 'status' : undefined}>
            {suggestionsIndisponibles ? 'Les suggestions ne peuvent pas être chargées pour le moment.' : 'Aucune suggestion pour ces catégories et ce budget.'}
          </p>}
        </section>

        <section className={styles.results} aria-label="Offres selon votre budget">
          <header><h2>Offres disponibles</h2><span>{offres.length} offre{offres.length > 1 ? 's' : ''} affichée{offres.length > 1 ? 's' : ''}</span></header>
          {invalidInterval ? <p className={styles.error} role="alert">Le budget minimum doit être inférieur ou égal au maximum.</p>
            : indisponible ? <p className={styles.error} role="alert">Le catalogue est momentanément indisponible. Réessayez dans un instant.</p>
              : offres.length ? <div className={styles.products}>{offres.map((offre) => <CatalogueProductCard key={offre.id} offer={offre} />)}</div>
                : <div className={styles.empty}><ShopIcon name="search" /><b>Aucune offre dans cette sélection.</b><span>Modifiez votre budget ou choisissez d’autres catégories.</span></div>}
        </section>
      </div>
    </div>
  )
}
