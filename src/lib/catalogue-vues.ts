import 'server-only'

import { BRAND_MARK_BY_NAME } from '@/constants/brand-marks'
import { DEPARTMENT_CARDS, PROMO_BANNERS, SELECTIONS, type SelectionId } from '@/constants/home'
import { ORDRE_RAYONS } from '@/constants/universes'
import { formatAmount } from '@/lib/format'
import type {
  Accueil,
  BrandEntry,
  BrandTile,
  CarteProduit,
  CategorieNav,
  CounterPick,
  DepartmentNav,
  EnfantListe,
  HeroPanel,
  IndexDepartment,
  IndexMarques,
  LibellesFacettes,
  MarqueNav,
  Navigation,
  PromoPanel,
  RayonId,
  RayonNav,
  RecentColumn,
  Selection,
} from '@/types/catalogue'

/**
 * CE QUE LA VITRINE COMPOSE A PARTIR DU BACKEND ET DE SES PROPRES DECISIONS.
 *
 * Des fonctions pures : une reponse du backend entre, un modele de vue sort.
 * Aucune lecture reseau ici — elles vivent dans `catalogue-en-direct.ts` — pour
 * que l'ordre d'un menu ou d'une liste de rayons ne depende que de ses entrees.
 */

/**
 * Un rayon ajoute en base sans etre connu de la vitrine n'a ni icone ni texte
 * d'accueil : `DEPARTMENT_ICON[id]` planterait le rendu. Il est ecarte plutot que
 * dessine a moitie.
 */
function rayonConnu(id: string): id is RayonId {
  return (ORDRE_RAYONS as readonly string[]).includes(id)
}

/** Un rayon que la vitrine sait dessiner : son id a une icone et un texte d'accueil. */
export type RayonConnu = RayonNav & { readonly id: RayonId }

const estConnu = (rayon: RayonNav): rayon is RayonConnu => rayonConnu(rayon.id)

/**
 * Le plus fourni d'abord, puis l'id croissant.
 *
 * C'EST L'ORDRE QUE LE SITE A TOUJOURS AFFICHE, ET LE BACKEND N'EN A PAS LE
 * MEME. Le SQL departage les egalites par nom : « Laptop Lenovo » et
 * « Ordinateur de bureau » (86 chacune) sortaient inversees dans le menu.
 */
function parProfondeur(
  a: Pick<CategorieNav, 'compte' | 'id'>,
  b: Pick<CategorieNav, 'compte' | 'id'>,
): number {
  return b.compte - a.compte || a.id - b.id
}

/**
 * Les rayons, le plus fourni d'abord, a egalite dans l'ordre editorial.
 *
 * Le backend les rend par nom ; l'ordre d'affichage est une decision de la
 * vitrine, la meme que prenait le build.
 */
export function rayonsOrdonnes(nav: Navigation): RayonConnu[] {
  return nav.rayons
    .filter(estConnu)
    .sort((a, b) => b.compte - a.compte || ORDRE_RAYONS.indexOf(a.id) - ORDRE_RAYONS.indexOf(b.id))
}

export function rayonParSlug(nav: Navigation | null, slug: string): RayonConnu | null {
  if (!nav || !slug) return null
  return nav.rayons.filter(estConnu).find((rayon) => rayon.slug === slug) ?? null
}

export function rayonParId(nav: Navigation | null, id: string): RayonConnu | null {
  if (!nav) return null
  return nav.rayons.filter(estConnu).find((rayon) => rayon.id === id) ?? null
}

/**
 * Une famille par son slug, `Non classé` compris.
 *
 * La categorie masquee reste une adresse valide : `/categorie/non-classe`
 * repondait deja 200, et un filtre `?famille=non-classe` n'est pas une valeur
 * inconnue. Elle n'est simplement proposee nulle part.
 */
export function categorieParSlug(nav: Navigation | null, slug: string): CategorieNav | null {
  if (!nav || !slug) return null
  return nav.categories.find((categorie) => categorie.slug === slug) ?? null
}

export function marqueParSlug(nav: Navigation | null, slug: string): MarqueNav | null {
  if (!nav || !slug) return null
  return nav.marques.find((marque) => marque.slug === slug) ?? null
}

const versEnfant = (categorie: CategorieNav): EnfantListe => ({
  nom: categorie.nom,
  slug: categorie.slug,
  compte: categorie.compte,
})

/**
 * Les familles rangees sous un rayon, a toute profondeur, la plus fournie d'abord.
 *
 * `nonVides` est la liste qu'on PROPOSE au lecteur : sans la categorie masquee
 * et sans les familles dont le stock est tombe a zero, parce qu'un lien vers
 * une grille vide est une porte qui ne s'ouvre sur rien.
 *
 * LE BACKEND REND DEJA CES ENFANTS DANS `liste`, ET ILS NE SONT PAS LUS. Il les
 * departage par nom ; le site les a toujours departages par id. Les deriver
 * d'ici garde l'ordre que le lecteur connait (voir `parProfondeur`).
 */
function famillesDuRayon(
  nav: Navigation,
  rayonId: string,
  { nonVides }: { readonly nonVides: boolean },
): CategorieNav[] {
  return nav.categories
    .filter(
      (categorie) =>
        categorie.rayonId === rayonId &&
        categorie.niveau > 0 &&
        (!nonVides || (!categorie.masquee && categorie.compte > 0)),
    )
    .sort(parProfondeur)
}

/** Ce que la page d'un rayon propose au-dessus de sa grille : ses dix-huit familles les plus fournies. */
export function enfantsDuRayon(nav: Navigation, rayonId: string): EnfantListe[] {
  return famillesDuRayon(nav, rayonId, { nonVides: true }).slice(0, 18).map(versEnfant)
}

/** Les sous-familles directes d'une famille qui ont du stock, meme ordre que ci-dessus. */
export function enfantsDeCategorie(nav: Navigation, categorie: CategorieNav): EnfantListe[] {
  const parId = new Map(nav.categories.map((c) => [c.id, c]))
  return categorie.enfantsIds
    .map((id) => parId.get(id))
    .filter((enfant): enfant is CategorieNav => enfant !== undefined && !enfant.masquee && enfant.compte > 0)
    .sort(parProfondeur)
    .map(versEnfant)
}

/**
 * L'index du catalogue : chaque rayon et toutes ses familles non vides.
 *
 * Le compte d'un rayon est celui de la navigation, et non la somme de ses
 * familles : un produit range dans deux familles du meme rayon y est compte
 * une fois, comme au comptoir.
 */
export function indexDesFamilles(nav: Navigation): IndexDepartment[] {
  return rayonsOrdonnes(nav).map((rayon) => ({
    id: rayon.id,
    name: rayon.nom,
    slug: rayon.slug,
    tagline: rayon.accroche ?? '',
    totalCount: rayon.compte,
    families: famillesDuRayon(nav, rayon.id, { nonVides: true }).map((categorie) => ({
      name: categorie.nom,
      slug: categorie.slug,
      count: categorie.compte,
      level: categorie.niveau,
    })),
  }))
}

export function libellesFacettes(nav: Navigation): LibellesFacettes {
  const slugParId = new Map(nav.categories.map((categorie) => [categorie.id, categorie.slug]))
  return {
    rayon: new Map(rayonsOrdonnes(nav).map((rayon) => [rayon.slug, rayon.nom])),
    famille: new Map(nav.categories.map((categorie) => [categorie.slug, categorie.nom])),
    marque: new Map(nav.marques.map((marque) => [marque.slug, marque.nom])),
    ancetres: new Map(
      nav.categories.map((categorie) => [
        categorie.slug,
        categorie.ancetresIds.flatMap((id) => slugParId.get(id) ?? []),
      ]),
    ),
  }
}

/* -------------------------------------------------------------------------- */
/* L'habillage et l'accueil                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Les rayons du menu, chacun avec ses familles les plus fournies.
 *
 * SANS ECARTER LES FAMILLES VIDES NI LA CATEGORIE MASQUEE, comme l'a toujours
 * fait le menu : il ne garde que les plus fournies, et le filtre de la page de
 * rayon changerait ici l'ordre d'une egalite sans rien retirer de visible.
 */
export function departementsMenu(nav: Navigation, famillesParRayon: number): DepartmentNav[] {
  return rayonsOrdonnes(nav).map((rayon) => ({
    id: rayon.id,
    name: rayon.nom,
    shortName: rayon.nomCourt,
    slug: rayon.slug,
    totalCount: rayon.compte,
    families: famillesDuRayon(nav, rayon.id, { nonVides: false })
      .slice(0, famillesParRayon)
      .map((categorie) => ({ name: categorie.nom, slug: categorie.slug, count: categorie.compte })),
  }))
}

/**
 * Une carte par rayon, dans l'ordre du menu.
 *
 * Le texte est ecrit dans `constants/home.ts` ; le compte glisse dans la phrase
 * vient de la navigation. Un rayon vide est ecarte plutot qu'annonce avec un zero.
 */
export function panneauxHero(nav: Navigation): HeroPanel[] {
  return rayonsOrdonnes(nav).flatMap((rayon) => {
    const carte = DEPARTMENT_CARDS[rayon.id]
    if (!carte || rayon.compte === 0) return []
    return [
      {
        id: rayon.id,
        headline: carte.headline,
        body: carte.body.replace('{n}', formatAmount(rayon.compte)),
        cta: carte.cta,
        href: `/rayon/${rayon.slug}`,
        slug: rayon.slug,
        shortName: rayon.nomCourt,
        image: rayon.image,
        families: famillesDuRayon(nav, rayon.id, { nonVides: false })
          .slice(0, 5)
          .map((categorie) => ({ name: categorie.nom, slug: categorie.slug })),
      },
    ]
  })
}

export function panneauxPromo(nav: Navigation): PromoPanel[] {
  return PROMO_BANNERS.flatMap((promo) => {
    const rayon = rayonParId(nav, promo.universeId)
    if (!rayon) return []
    return [
      {
        id: rayon.id,
        headline: promo.headline,
        body: promo.body.replace('{n}', formatAmount(rayon.compte)),
        href: `/rayon/${rayon.slug}`,
        image: rayon.image,
      },
    ]
  })
}

const parCompteEtNom = (a: { compte: number; nom: string }, b: { compte: number; nom: string }) =>
  b.compte - a.compte || a.nom.localeCompare(b.nom, 'fr')

/**
 * Le mur des marques : celles dont nous tenons le logo, les plus fournies d'abord.
 *
 * Une marque sans produit derriere est ecartee : le mur est une navigation, et
 * une porte doit s'ouvrir sur quelque chose.
 */
export function tuilesMarques(nav: Navigation, limite: number): BrandTile[] {
  return [...nav.marques]
    .sort(parCompteEtNom)
    .flatMap((marque) => {
      const logo = BRAND_MARK_BY_NAME.get(marque.nom)
      if (!logo || marque.compte === 0) return []
      return [
        {
          name: marque.nom,
          slug: marque.slug,
          productCount: marque.compte,
          file: logo.file,
          paint: logo.paint,
        },
      ]
    })
    .slice(0, limite)
}

export function entreesMarques(index: IndexMarques): BrandEntry[] {
  return index.marques
    .filter((marque) => marque.compte > 0)
    .sort(parCompteEtNom)
    .map((marque) => {
      const logo = BRAND_MARK_BY_NAME.get(marque.nom)
      const initiale = marque.nom.trim().charAt(0).toUpperCase()
      return {
        name: marque.nom,
        slug: marque.slug,
        productCount: marque.compte,
        departments: marque.rayons.map((rayon) => rayon.nomCourt),
        file: logo?.file ?? null,
        paint: logo?.paint ?? null,
        letter: /[A-Z]/.test(initiale) ? initiale : '#',
        image: marque.image,
      }
    })
}

/** L'identifiant d'onglet de la vitrine, la cle du backend : les deux ne s'ecrivent pas pareil. */
const CLE_SELECTION: Readonly<Record<SelectionId, keyof Accueil['selections']>> = {
  nouveautes: 'nouveautes',
  affaires: 'affaires',
  'petits-prix': 'petitsPrix',
  pro: 'pro',
}

/** Les quatre onglets : les libelles et les regles de la vitrine, les produits du backend. */
export function selectionsAccueil(accueil: Accueil): Selection[] {
  return SELECTIONS.map((selection) => ({
    id: selection.id,
    label: selection.label,
    rule: selection.rule,
    products: accueil.selections[CLE_SELECTION[selection.id]] ?? [],
  }))
}

export function tourDesComptoirs(accueil: Accueil): CounterPick[] {
  return accueil.comptoirs.map((comptoir) => ({
    departmentName: comptoir.rayon.nomCourt,
    product: comptoir.produit,
  }))
}

export function colonnesRecentes(accueil: Accueil): RecentColumn[] {
  return accueil.colonnes.map((colonne) => ({
    categoryName: colonne.categorie.nom,
    categorySlug: colonne.categorie.slug,
    departmentName: colonne.rayon.nom ?? '',
    totalCount: colonne.categorie.compte,
    newestAt: colonne.produits[0]?.ajouteLe ?? null,
    products: colonne.produits,
  }))
}

/**
 * Le catalogue de l'atelier : les prestations d'abord, puis le prix croissant.
 *
 * Le terme du fournisseur range aussi du materiel jamais reclasse ; ce tri fait
 * passer le travail devant. A prix egal, le plus recent d'abord, comme le
 * faisait la liste d'origine : sans ce dernier critere l'ordre de deux lignes a
 * 45 000 FCFA dependrait de la date de creation que le backend retient.
 */
export function trierServices(cartes: readonly CarteProduit[]): CarteProduit[] {
  const prestation = (nom: string) => /^(service|installation|maintenance|douane|energie)/i.test(nom)
  return [...cartes].sort(
    (a, b) => Number(prestation(b.nom)) - Number(prestation(a.nom)) || a.prix - b.prix || b.id - a.id,
  )
}
