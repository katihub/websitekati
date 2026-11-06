import type { Metadata } from 'next'
import Link from 'next/link'

import { CatalogueProductCard } from '@/components/marketplace/CatalogueProductCard'
import { ShopIcon } from '@/components/marketplace/ShopIcon'
import {
  lireCategoriesMarketplace,
  lireOffresMarketplace,
  type CategorieArbre,
  type OffreMarketplace,
} from '@/lib/marketplace-data'
import { FormulaireBudget } from './FormulaireBudget'
import styles from './mon-budget.module.css'

export const metadata: Metadata = {
  title: 'Mon Budget',
  description: 'Choisissez vos catégories et votre budget pour trouver les offres disponibles sur KatiMarket.',
}

type SearchParams = Record<string, string | string[] | undefined>
type CategorieSelection = { nom: string; slug: string }

const SUGGESTIONS_PAR_DEFAUT = [2_000, 5_000, 10_000, 20_000, 50_000]

function valeurs(params: SearchParams, cle: string): string[] {
  const valeur = params[cle]
  return (Array.isArray(valeur) ? valeur : valeur ? [valeur] : []).filter(Boolean)
}

function premier(params: SearchParams, cle: string): string | undefined {
  const valeur = params[cle]
  return Array.isArray(valeur) ? valeur[0] : valeur
}

function sousCategories(categorie: CategorieArbre): CategorieSelection[] {
  return categorie.sousCategories.flatMap((enfant) => [
    { nom: enfant.nom, slug: enfant.slug },
    ...enfant.sousCategories.map((petitEnfant) => ({
      nom: petitEnfant.nom,
      slug: petitEnfant.slug,
    })),
  ])
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

function cheminBudget(categories: readonly string[], sousCategorieSlugs: readonly string[], minimum?: number, maximum?: number) {
  const params = new URLSearchParams()
  categories.forEach((categorie) => params.append('categorie', categorie))
  sousCategorieSlugs.forEach((slug) => params.append('sousCategorie', slug))
  if (minimum !== undefined) params.set('prixMin', String(minimum))
  if (maximum !== undefined) params.set('prixMax', String(maximum))
  const query = params.toString()
  return `/mon-budget${query ? `?${query}` : ''}`
}

export default async function MonBudgetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const arbre = await lireCategoriesMarketplace()
  const categoriesChoisies = [...new Set(valeurs(params, 'categorie'))]
    .map((slug) => arbre.find((categorie) => categorie.slug === slug))
    .filter((categorie): categorie is CategorieArbre => categorie !== undefined)
  const sousChoisiesDemandees = new Set(valeurs(params, 'sousCategorie'))
  const sousCategoriesValides = categoriesChoisies.flatMap((categorie) => sousCategories(categorie))
  const sousCategoriesChoisies = sousCategoriesValides
    .filter((categorie) => sousChoisiesDemandees.has(categorie.slug))
  const min = prixValide(premier(params, 'prixMin'))
  const max = prixValide(premier(params, 'prixMax'))
  const invalidInterval = min !== undefined && max !== undefined && min > max
  const aChoisiUneCategorie = valeurs(params, 'categorie').length > 0
  const sources: Array<{ categorieSlug?: string }> = categoriesChoisies.length
    ? categoriesChoisies.flatMap((categorie) => {
        const enfantsChoisis = sousCategoriesChoisies.filter((enfant) =>
          sousCategories(categorie).some((enfantCategorie) => enfantCategorie.slug === enfant.slug),
        )
        return enfantsChoisis.length
          ? enfantsChoisis.map((enfant) => ({ categorieSlug: enfant.slug }))
          : [{ categorieSlug: categorie.slug }]
      })
    : aChoisiUneCategorie ? [] : [{ categorieSlug: undefined }]
  const selection = categoriesChoisies.map(({ slug }) => slug)
  const selectionSous = sousCategoriesChoisies.map(({ slug }) => slug)
  const filtresRenseignes = selection.length > 0 || selectionSous.length > 0 || min !== undefined || max !== undefined

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
  const listesPourSuggestions = invalidInterval || !filtresRenseignes
    ? []
    : await Promise.all(sources.map(({ categorieSlug }) => lireOffresMarketplace({
        categorieSlug,
        page: 1,
        taille: 100,
        tri: 'prix_asc',
      })))
  const listesPrixEleves = invalidInterval || !filtresRenseignes
    ? []
    : await Promise.all(listesPourSuggestions.map((liste, index) => {
        const dernierePage = liste.pagination.pages
        if (liste.indisponible || dernierePage <= 1) return Promise.resolve(null)
        return lireOffresMarketplace({
          categorieSlug: sources[index]?.categorieSlug,
          page: dernierePage,
          taille: 100,
          tri: 'prix_desc',
        })
      }))
  const offresParId = new Map<string, OffreMarketplace>()
  for (const liste of listes) {
    for (const offre of liste.offres) if (disponible(offre)) offresParId.set(offre.id, offre)
  }
  const offres = [...offresParId.values()].sort((a, b) => a.prixFcfa! - b.prixFcfa!)
  const offresPourSuggestions = [
    ...listesPourSuggestions.flatMap((liste) => liste.offres),
    ...listesPrixEleves.flatMap((liste) => liste?.offres ?? []),
  ]
  const suggestions = filtresRenseignes
    ? suggestionsBudget(offresPourSuggestions, min)
    : SUGGESTIONS_PAR_DEFAUT
  const indisponible = listes.some((liste) => liste.indisponible)
  const suggestionsIndisponibles = listesPourSuggestions.some((liste) => liste.indisponible)
    || listesPrixEleves.some((liste) => liste?.indisponible)
  const categoriesIndisponibles = arbre.length === 0

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link><span>›</span><span aria-current="page">Mon Budget</span>
        </nav>
        <header className={styles.intro}>
          <ShopIcon name="wallet" />
          <div><p>VOTRE SÉLECTION PERSONNALISÉE</p><h1>Mon Budget</h1>
            <span>Choisissez vos catégories de produits, puis définissez votre budget.</span>
          </div>
        </header>

        <FormulaireBudget>
          <fieldset>
            <legend>1. Choisissez vos catégories</legend>
            {categoriesIndisponibles
              ? <p className={styles.hint} role="status">Les catégories ne peuvent pas être chargées pour le moment.</p>
              : <div className={styles.categories}>
                  {arbre.map((categorie) => {
                    const enfants = sousCategories(categorie)
                    const cochee = selection.includes(categorie.slug)
                    return (
                      <details
                        key={categorie.id}
                        className={styles.categoryChoice}
                        open={cochee || enfants.some((enfant) => selectionSous.includes(enfant.slug))}
                      >
                        <summary className={styles.categorySummary}>
                          <ShopIcon name="grid" />
                          <span>{categorie.nom}</span>
                          {enfants.length ? <small>{enfants.length} sous-catégorie{enfants.length > 1 ? 's' : ''}</small> : null}
                          <ShopIcon name="arrow" />
                        </summary>
                        <div className={styles.categoryContents}>
                          <label className={styles.categoryOption}>
                            <input
                              type="checkbox"
                              name="categorie"
                              value={categorie.slug}
                              defaultChecked={cochee}
                              data-auto-submit
                            />
                            Inclure toute cette catégorie
                          </label>
                          {enfants.length ? (
                            <details
                              className={styles.subcategories}
                              open={enfants.some((enfant) => selectionSous.includes(enfant.slug))}
                            >
                              <summary>Sous-catégories facultatives</summary>
                              <div>
                                {enfants.map((enfant) => (
                                  <label key={enfant.slug} className={styles.subcategoryOption}>
                                    <input
                                      type="checkbox"
                                      name="sousCategorie"
                                      value={enfant.slug}
                                      defaultChecked={selectionSous.includes(enfant.slug)}
                                      disabled={!cochee}
                                      data-auto-submit
                                    />
                                    {enfant.nom}
                                  </label>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </details>
                    )
                  })}
                </div>}
          </fieldset>
          <fieldset>
            <legend>2. Définissez votre budget</legend>
            <div className={styles.prices}>
              <label>Minimum (FCFA)<input type="number" name="prixMin" min="0" max="1000000000" step="500" inputMode="numeric" defaultValue={min} placeholder="Sans minimum" /></label>
              <label>Maximum (FCFA)<input type="number" name="prixMax" min="0" max="1000000000" step="500" inputMode="numeric" defaultValue={max} placeholder="Sans maximum" /></label>
              <button type="submit"><ShopIcon name="search" />Voir les offres</button>
            </div>
          </fieldset>
        </FormulaireBudget>

        <section className={styles.shortcuts} aria-labelledby="suggestions-titre">
          <header><div><p>DES IDÉES SELON VOS CHOIX</p><h2 id="suggestions-titre">Quel montant maximum ?</h2></div>
            <span>{suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}</span>
          </header>
          {suggestions.length ? (
            <div className={styles.chips}>
              {suggestions.map((montant) => (
                <Link key={montant} href={cheminBudget(selection, selectionSous, min, montant)} aria-current={max === montant ? 'true' : undefined}>
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
