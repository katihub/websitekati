/**
 * LE CONTRAT DU CATALOGUE, SOUS LES NOMS DU BACKEND.
 *
 * Ces types decrivent ce que rendent `/v1/catalogue/*`, `/v1/vitrine/accueil`
 * et `/v1/vitrine/points-vente`. Ils gardent les noms du backend plutot que de
 * les traduire a l'arrivee : la carte produit traversait deja trois formes
 * (`Product` compile, `ProductSummary`, `ProduitCite` de l'assistant) et chaque
 * traduction etait un endroit ou un champ pouvait etre renomme d'un cote et
 * oublie de l'autre.
 *
 * AUCUN `server-only` ICI. Ce fichier ne porte que des types, que les
 * composants client (la carte, le champ de recherche) doivent pouvoir importer ;
 * la lecture elle-meme vit dans `@/lib/catalogue-en-direct`, qui est protege.
 */

import type { SelectionId } from '@/constants/home'

export type Tri = 'recent' | 'prix-croissant' | 'prix-decroissant' | 'remise'

/** Une etape du fil d'Ariane. `href` est un chemin de la vitrine, pas de l'API. */
export interface EtapeFil {
  readonly nom: string
  readonly href: string
}

/** Ce qu'une carte produit affiche, dans une grille, une ligne ou une suggestion. */
export interface CarteProduit {
  /** Identifiant WooCommerce ou du panel : la « Ref. » que le comptoir relit au telephone. */
  readonly id: number
  readonly slug: string
  readonly nom: string
  /** Prix effectif, promotion appliquee ou expiree selon l'heure de la lecture. */
  readonly prix: number
  readonly prixReference: number | null
  readonly remisePct: number | null
  /**
   * Une promotion decidee dans le panel porte au moins une de ces deux dates ;
   * une remise heritee de WooCommerce n'en porte aucune.
   */
  readonly promoDebut: string | null
  readonly promoFin: string | null
  readonly enStock: boolean
  readonly marque: string | null
  readonly marqueSlug: string | null
  readonly caracteristiques: readonly string[]
  readonly categorieNom: string | null
  readonly categorieSlug: string | null
  readonly rayonSlug: string | null
  /** `AAAA-MM`, ou `null` quand le mois de mise en ligne n'est pas connu. */
  readonly ajouteLe: string | null
  readonly image: string | null
  /** La deuxieme photographie, montree au survol. */
  readonly imageSurvol: string | null
}

export interface FamilleNav {
  readonly id: number
  readonly slug: string
  readonly nom: string
  readonly compte: number
}

export interface RayonNav {
  /** Chaine libre cote backend : un rayon ajoute en base n'est pas encore connu ici. */
  readonly id: string
  readonly slug: string
  readonly nom: string
  readonly nomCourt: string
  readonly accroche: string | null
  readonly compte: number
  readonly image: string | null
  readonly familles: readonly FamilleNav[]
}

export interface CategorieNav {
  readonly id: number
  readonly slug: string
  readonly nom: string
  readonly parentId: number | null
  readonly niveau: number
  readonly ancetresIds: readonly number[]
  readonly enfantsIds: readonly number[]
  readonly rayonId: string | null
  readonly masquee: boolean
  /** Le sous-arbre entier : le nombre de references derriere le lien. */
  readonly compte: number
}

export interface MarqueNav {
  readonly nom: string
  readonly slug: string
  readonly compte: number
  /** Ids de rayon, le plus fourni d'abord. */
  readonly rayons: readonly string[]
}

export interface Navigation {
  readonly rayons: readonly RayonNav[]
  readonly categories: readonly CategorieNav[]
  readonly marques: readonly MarqueNav[]
  readonly nombreFamilles: number
  readonly nombreProduits: number
  readonly nombreMarques: number
}

export interface ValeurFacette {
  readonly valeur: string
  readonly libelle: string
  readonly compte: number
  readonly choisie: boolean
}

export interface Tranche {
  readonly min: number | null
  readonly max: number | null
  readonly compte: number
  readonly choisie: boolean
}

export interface Facettes {
  readonly rayons: readonly ValeurFacette[]
  readonly familles: readonly ValeurFacette[]
  readonly marques: readonly ValeurFacette[]
  readonly remise: { readonly compte: number; readonly choisie: boolean }
  readonly photo: { readonly compte: number; readonly choisie: boolean }
  readonly tranches: readonly Tranche[]
  readonly prixPlancher: number
  readonly prixPlafond: number
  readonly actives: number
}

export interface EnfantListe {
  readonly nom: string
  readonly slug: string
  readonly compte: number
  readonly image?: string | null
}

export interface PageListe {
  readonly titre: string
  readonly fil: readonly EtapeFil[]
  readonly total: number
  readonly produits: readonly CarteProduit[]
  readonly enfants: readonly EnfantListe[]
  readonly page: number
  readonly pages: number
  readonly parPage: number
  readonly facettes: Facettes | null
}

export interface FiltresListe {
  readonly rayons?: readonly string[]
  readonly familles?: readonly string[]
  readonly marques?: readonly string[]
  readonly prixMin?: number | null
  readonly prixMax?: number | null
  readonly remise?: boolean
  readonly photo?: boolean
  readonly tri?: Tri
  readonly page?: number
  readonly parPage?: number
  readonly facettes?: boolean
  readonly tranches?: readonly { readonly min: number | null; readonly max: number | null }[]
}

/** Une page vers laquelle renvoyer : une famille ou une marque, avec son compte. */
export interface Destination {
  readonly nom: string
  readonly slug: string
  readonly compte: number
}

export interface ResultatRayon {
  /** Id du rayon. */
  readonly rayon: string
  readonly slug: string
  readonly nom: string
  readonly nomCourt: string
  readonly total: number
}

export interface PageRecherche {
  readonly requete: string
  readonly rayon: string | null
  readonly rayonNom: string | null
  readonly total: number
  readonly totalTousRayons: number
  readonly produits: readonly CarteProduit[]
  readonly familles: readonly Destination[]
  readonly marques: readonly Destination[]
  readonly parRayon: readonly ResultatRayon[]
  readonly page: number
  readonly pages: number
}

export interface Suggestions {
  readonly produits: readonly CarteProduit[]
  readonly familles: readonly Destination[]
  readonly marques: readonly Destination[]
}

/**
 * LE DÉLAI DE LIVRAISON ANNONCÉ POUR UN PRODUIT, TEL QUE LE PANEL LE RÈGLE.
 *
 * `max` est nul quand la direction a posé une seule valeur (« 3 jours ») plutôt
 * qu'une fourchette. Les minutes et les heures arrivent telles quelles — 4 320
 * minutes pour trois jours — et c'est `formatDelai` qui les rend lisibles.
 */
export interface DelaiLivraison {
  readonly id: number
  readonly min: number
  readonly max: number | null
  readonly unite: 'minutes' | 'heures' | 'jours_ouvres' | 'jours' | 'semaines' | 'mois'
}

export interface FicheProduit extends CarteProduit {
  /**
   * LES DEUX TEXTES, NOMMÉS COMME LE PANEL LES NOMME — et c'est l'inverse de ce
   * que les noms de colonnes laissent croire. `description` est la
   * « Description courte » du panel, `ficheTechnique` sa « Description
   * détaillée ». Les fiches importées de l'ancien site portent souvent un
   * long texte dans `description` : la page en tient compte.
   */
  readonly description: string | null
  readonly ficheTechnique: string | null
  /**
   * Facultatif, et nul quand aucun délai n'est configuré : un backend plus
   * ancien ne l'envoie pas, et la fiche ne doit pas tomber pour autant.
   */
  readonly delaiLivraison?: DelaiLivraison | null
  readonly fichePdf: { readonly url: string; readonly nom: string; readonly octets: number | null } | null
  readonly galerie: readonly { readonly url: string | null; readonly alt: string }[]
  readonly categorie: {
    readonly id: number | null
    readonly nom: string | null
    readonly slug: string
    readonly compte: number
  } | null
  readonly rayon: {
    readonly id: string
    readonly slug: string
    readonly nom: string
    readonly nomCourt: string
  } | null
  readonly fil: readonly EtapeFil[]
  readonly lies: readonly CarteProduit[]
  readonly creeLe: string
}

export interface MarqueIndex {
  readonly nom: string
  readonly slug: string
  readonly compte: number
  readonly rayons: readonly {
    readonly id: string
    readonly slug: string
    readonly nom: string
    readonly nomCourt: string
    readonly compte: number
  }[]
  readonly image: string | null
}

export interface IndexMarques {
  readonly marques: readonly MarqueIndex[]
  readonly produitsMarques: number
}

export interface Accueil {
  readonly selections: {
    readonly nouveautes: readonly CarteProduit[]
    readonly affaires: readonly CarteProduit[]
    readonly petitsPrix: readonly CarteProduit[]
    readonly pro: readonly CarteProduit[]
  }
  readonly comptoirs: readonly {
    readonly rayon: { readonly id: string; readonly slug: string; readonly nom: string; readonly nomCourt: string }
    readonly produit: CarteProduit
  }[]
  readonly colonnes: readonly {
    readonly categorie: { readonly id: number; readonly slug: string; readonly nom: string; readonly compte: number }
    readonly racineId: number | null
    readonly rayon: {
      readonly id: string | null
      readonly slug: string | null
      readonly nom: string | null
      readonly nomCourt: string | null
    }
    readonly produits: readonly CarteProduit[]
  }[]
}

/** Une ligne d'un comptoir, telle que le panel la saisit. */
export interface LigneComptoir {
  readonly number: string
  readonly whatsapp: boolean
}

export interface PointDeVente {
  readonly id: number
  readonly key: string
  /**
   * Le nom que le panel et l'assistant donnent au comptoir : « Akwa Paris
   * Dancing ». Toujours present : un backend qui ne l'envoie pas encore recoit
   * a sa place le quartier, suivi du repere quand deux comptoirs le partagent
   * (`normaliserPointVente`), sinon deux cartes s'intitulaient « Akwa ».
   */
  readonly label: string
  readonly city: string
  readonly district: string
  readonly directions: string
  /** Dans l'ordre du panel ; la premiere est la ligne principale du comptoir. */
  readonly phones: readonly LigneComptoir[]
  readonly mapUrl: string | null
  readonly hours: unknown
  readonly coordinates: unknown
}

/* -------------------------------------------------------------------------- */
/* Vues : ce que la vitrine compose a partir du contrat                       */
/* -------------------------------------------------------------------------- */

/**
 * Les rayons que la vitrine sait dessiner.
 *
 * Le backend en tient les noms, les accroches et les familles ; ces ids sont ce
 * que la vitrine y accroche de son cote : une icone (`DEPARTMENT_ICON`), un
 * panneau d'accueil (`DEPARTMENT_CARDS`), une photo d'ouverture
 * (`DEPARTMENT_HERO_PRODUCT`). Un id absent d'ici n'a rien de tout cela, et
 * `rayonsOrdonnes` l'ecarte avant qu'un composant ne le rencontre.
 */
export type RayonId =
  | 'appliance'
  | 'smart'
  | 'computing'
  | 'network'
  | 'security'
  | 'printing'
  | 'power'
  | 'vision'
  | 'connectics'
  | 'storage'
  | 'telecom'
  | 'mobile'
  | 'office'
  | 'services'

/**
 * Un rayon reduit a ce que le menu de l'en-tete dessine.
 *
 * L'id est un `RayonId` et non la chaine libre du backend : le menu en tire
 * une icone, et seuls les rayons que la vitrine sait dessiner arrivent jusqu'ici
 * (voir `rayonsOrdonnes`).
 */
export interface DepartmentNav {
  readonly id: RayonId
  readonly name: string
  readonly shortName: string
  readonly slug: string
  readonly totalCount: number
  readonly families: readonly {
    readonly name: string
    readonly slug: string
    readonly count: number
  }[]
}

export interface HeroPanel {
  readonly id: RayonId
  readonly headline: readonly string[]
  readonly body: string
  readonly cta: string
  readonly href: string
  /** Le slug du rayon, dont la carte se sert pour lire ses premiers produits. */
  readonly slug: string
  readonly shortName: string
  readonly image: string | null
  /** The department's five deepest families, as the card's own quick links. */
  readonly families: readonly { readonly name: string; readonly slug: string }[]
}

export interface PromoPanel {
  readonly id: RayonId
  readonly headline: string
  readonly body: string
  readonly href: string
  readonly image: string | null
}

export interface Selection {
  readonly id: SelectionId
  readonly label: string
  readonly rule: string
  readonly products: readonly CarteProduit[]
}

export interface CounterPick {
  readonly departmentName: string
  readonly product: CarteProduit
}

export interface BrandTile {
  readonly name: string
  readonly slug: string
  readonly productCount: number
  /** File in `public/brands/`, without the extension. */
  readonly file: string
  /** The colour the mark is drawn in, from the moment the wall appears. */
  readonly paint: string
}

/** A brand as `/marques` renders it: countable, placed, photographed, and marked if we hold one. */
export interface BrandEntry {
  readonly name: string
  readonly slug: string
  readonly productCount: number
  /** Departments the brand appears in, deepest first. Named, not id'd. */
  readonly departments: readonly string[]
  /** File in `public/brands/` without the extension, or null for the brands we hold no mark for. */
  readonly file: string | null
  readonly paint: string | null
  /** Initial, for the alphabetical index. `#` for anything not A-Z. */
  readonly letter: string
  /** The brand's most recent photographed reference, chosen by the backend. */
  readonly image: string | null
}

export interface RecentColumn {
  readonly categoryName: string
  readonly categorySlug: string
  readonly departmentName: string
  readonly totalCount: number
  readonly newestAt: string | null
  readonly products: readonly CarteProduit[]
}

/**
 * Un rayon de l'index des familles, sous les noms que `FamilyIndex` lit deja.
 *
 * Ces vues gardent leurs champs anglais : elles melent la reponse du backend a
 * des decisions de la vitrine (l'ordre, les familles retenues), et les renommer
 * aurait reecrit le balisage de composants que ce chantier ne touche pas.
 */
export interface IndexDepartment {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly tagline: string
  readonly totalCount: number
  readonly families: readonly {
    readonly name: string
    readonly slug: string
    readonly count: number
    readonly level: number
  }[]
}

/**
 * Ce que le panneau de filtres doit savoir d'un slug qui n'est pas dans ses facettes.
 *
 * Une valeur choisie peut manquer de sa propre liste — plafonnee a 24, ou vide
 * en combinaison avec les autres filtres — et c'est justement la que le lecteur
 * a besoin de sa pastille pour la retirer : le nom vient donc de la navigation.
 * `ancetres` sert a reconnaitre une sous-famille deja contenue dans une famille
 * choisie, que les comptes seuls ne distinguent pas d'une coincidence.
 */
export interface LibellesFacettes {
  readonly rayon: ReadonlyMap<string, string>
  readonly famille: ReadonlyMap<string, string>
  readonly marque: ReadonlyMap<string, string>
  /** Slug d'une famille -> slugs de ses ancetres. */
  readonly ancetres: ReadonlyMap<string, readonly string[]>
}
