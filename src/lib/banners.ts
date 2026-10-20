import { BANNERS } from '@/constants/banners'
import { ETIQUETTE_BANNIERES } from '@/lib/catalogue-en-direct'

/**
 * LES BANNIERES, LUES CHEZ LE BACKEND PLUTOT QUE COMPILEES DANS LE SITE.
 *
 * CE QUE CELA CHANGE. Elles vivaient dans `src/constants/banners.ts`, un tableau
 * de cinq entrees compile dans le bundle : changer une accroche demandait un
 * commit, une revue et un deploiement. Une operation de fin de semaine se decide
 * le vendredi, pas au rythme d'une chaine de livraison.
 *
 * POURQUOI CE N'EST PAS LE CATALOGUE. Lire 4 275 produits par le reseau a chaque
 * rendu coute la recherche en memoire a une milliseconde, qui est ce que ce site
 * a de plus precieux. Cinq bannieres sont une autre affaire : c'est une requete,
 * quelques kilo-octets, et le resultat est mis en cache cinq minutes.
 *
 * LA REPLI EST LE POINT LE PLUS IMPORTANT DE CE FICHIER. Le site est sur Vercel,
 * le backend sur un VPS unique a Francfort. Le jour ou ce VPS redemarre, la page
 * d'accueil ne doit pas perdre sa premiere image : elle retombe sur les cinq
 * pieces livrees avec le site. Le lecteur voit une banniere peut-etre datee,
 * jamais un trou en pleine largeur.
 *
 * LE DELAI EST MESURE, PAS DEVINE. Six appels a l'API en regime etabli : 0,47 s
 * median, 1,20 s au pire. Le premier essai a pourtant depasse 2,5 s, sur un
 * conteneur qui venait de redemarrer et dont la connexion a la base etait
 * encore froide. Quatre secondes couvrent ce cas sans couvrir une vraie panne.
 *
 * Le compromis penche volontairement de ce cote : cette lecture n'a lieu
 * qu'une fois toutes les cinq minutes, donc attendre une seconde de plus est
 * paye une fois, tandis qu'un repli declenche pour rien affiche des bannieres
 * perimees pendant cinq minutes entieres.
 */

export interface BannerVariant {
  readonly url: string
  readonly largeur: number
  readonly hauteur: number
}

/**
 * OU LA PIECE S'AFFICHE DANS L'OUVERTURE DE LA PAGE D'ACCUEIL.
 *
 * Le proprietaire a divise la section en deux blocs sur la meme rangee : le
 * carrousel des bannieres et, a cote, celui des promotions. `pub_accueil` est
 * la publicite de l'accueil KatiMarket, dans la colonne de droite. L'emplacement
 * est choisi dans le panel, piece par piece.
 */
export type EmplacementBanniere = 'principal' | 'promo' | 'pub_accueil'

export interface PublishedBanner {
  readonly id: number | string
  readonly href: string
  readonly label: string
  readonly description: string
  readonly action: string
  readonly tonalite: 'navy' | 'light' | 'orange'
  readonly alt: string
  readonly focus: number
  readonly emplacement: EmplacementBanniere
  readonly large: BannerVariant
  /**
   * Toujours renseignee ici, meme quand le panel n'a pas recu de piece mobile :
   * `normaliser` y reporte alors la piece large, qui est un fichier valable pour
   * un telephone, simplement plus lourd. Le composant n'a pas a le savoir.
   */
  readonly mobile: BannerVariant
}

/** Les pieces de l'ouverture par emplacement, dans l'ordre du panel. */
export interface BannieresAccueil {
  readonly principales: PublishedBanner[]
  readonly promos: PublishedBanner[]
  /** Les publicites de l'accueil KatiMarket ; la premiere est affichee. */
  readonly pubsAccueil: PublishedBanner[]
}

/**
 * LE PREFIXE DE VERSION EST AJOUTE ICI, PAS ATTENDU DE LA VARIABLE.
 *
 * `NEXT_PUBLIC_API_URL` porte l'HOTE, et rien d'autre. C'etait ambigu, et
 * l'ambiguite etait cassante : `api.ts` ajoutait `/v1` lui-meme tandis que ce
 * fichier et la lecture de la fiche produit attendaient que la variable le
 * contienne deja. Aucune des deux valeurs possibles ne faisait fonctionner
 * l'ensemble — sans `/v1` la fiche produit et les bannieres tombaient en 404,
 * avec `/v1` le panier et le profil appelaient `/v1/v1/...`. Tout fichier qui
 * appelle le backend ajoute desormais le prefixe (ici, `api.ts`,
 * `catalogue-en-direct.ts`, les routes de l'assistant), et la variable ne porte
 * que l'hote.
 */
const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''
const DELAI_MS = 4000
const REVALIDATION_S = 300

/**
 * Les dimensions des pieces livrees avec le site.
 *
 * Relevees dans les fichiers eux-memes, pas recopiees d'un commentaire : deux
 * des cinq ne font pas la taille que le composant portait en dur, la mobile
 * d'Electromenager mesurant 2400x775 et la large d'Impression 14178x3000.
 */
const TAILLES_LOCALES: Record<string, { large: [number, number]; mobile: [number, number] }> = {
  'banner-1-cuisine.jpg': { large: [14179, 3000], mobile: [2400, 788] },
  'banner-3-reseaux.jpg': { large: [14179, 3000], mobile: [2400, 788] },
  'banner-4-tv-audio.jpg': { large: [14179, 3000], mobile: [2400, 788] },
  'banner-5-electromenager.jpg': { large: [14179, 3000], mobile: [2400, 775] },
  'banner-6-impression.jpg': { large: [14178, 3000], mobile: [2400, 788] },
}

/** Les pieces du dépôt, dans la forme que rend l'API. */
function repli(): PublishedBanner[] {
  return BANNERS.map((b) => {
    const tailles = TAILLES_LOCALES[b.file] ?? { large: [14179, 3000], mobile: [2400, 788] }
    return {
      id: b.file,
      href: b.href,
      label: b.label,
      description: '',
      action: 'Découvrir',
      tonalite: 'light',
      alt: b.alt,
      focus: b.focus,
      emplacement: 'principal' as const,
      large: { url: `/branding/${b.file}`, largeur: tailles.large[0], hauteur: tailles.large[1] },
      mobile: {
        url: `/branding/${b.mobileFile}`,
        largeur: tailles.mobile[0],
        hauteur: tailles.mobile[1],
      },
    }
  })
}

function estVariante(v: unknown): v is BannerVariant {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).url === 'string' &&
    Number((v as Record<string, unknown>).largeur) > 0 &&
    Number((v as Record<string, unknown>).hauteur) > 0
  )
}

/**
 * Une reponse d'API est une entree externe : elle est verifiee, pas supposee.
 *
 * DEUX CHAMPS SONT TOLERES ABSENTS, ET C'EST VOULU. `emplacement` n'existe pas
 * chez un backend plus ancien que la division bannieres/promo : sans lui, tout
 * est une banniere, exactement comme avant. `mobile` peut etre `null` quand le
 * panel n'a recu que la piece large ; on y reporte alors la large.
 */
function normaliser(valeur: unknown): PublishedBanner | null {
  if (typeof valeur !== 'object' || valeur === null) return null
  const b = valeur as Record<string, unknown>
  if (
    typeof b.href !== 'string' ||
    typeof b.label !== 'string' ||
    typeof b.alt !== 'string' ||
    !estVariante(b.large) ||
    (b.mobile != null && !estVariante(b.mobile))
  ) {
    return null
  }
  return {
    id: b.id as number | string,
    href: b.href,
    label: b.label,
    description: typeof b.description === 'string' ? b.description : '',
    action: typeof b.action === 'string' && b.action ? b.action : 'Découvrir',
    tonalite: b.tonalite === 'navy' || b.tonalite === 'orange' ? b.tonalite : 'light',
    alt: b.alt,
    focus: Number(b.focus) || 50,
    emplacement: b.emplacement === 'promo' || b.emplacement === 'pub_accueil' ? b.emplacement : 'principal',
    large: b.large,
    mobile: estVariante(b.mobile) ? b.mobile : b.large,
  }
}

/** Les pieces de l'ouverture, separees par emplacement. */
export async function getBanners(): Promise<BannieresAccueil> {
  const toutes = await lireBannieres()
  return {
    principales: toutes.filter((b) => b.emplacement === 'principal'),
    promos: toutes.filter((b) => b.emplacement === 'promo'),
    pubsAccueil: toutes.filter((b) => b.emplacement === 'pub_accueil'),
  }
}

async function lireBannieres(): Promise<PublishedBanner[]> {
  if (!API) return repli()

  try {
    const reponse = await fetch(`${API}/v1/vitrine/bannieres`, {
      next: { revalidate: REVALIDATION_S, tags: [ETIQUETTE_BANNIERES] },
      signal: AbortSignal.timeout(DELAI_MS),
    })
    if (!reponse.ok) return repli()

    const donnees: unknown = await reponse.json()
    if (!Array.isArray(donnees)) return repli()

    const bannieres = donnees
      .map(normaliser)
      .filter((b): b is PublishedBanner => b !== null)
    // Une liste vide n'est pas une reponse valable ici. Elle veut dire que
    // quelqu'un a tout depublie, ou que la table est vide apres une migration
    // manquee ; dans les deux cas, montrer les pieces du depot vaut mieux que
    // laisser le haut de la page d'accueil sans rien.
    return bannieres.length > 0 ? bannieres : repli()
  } catch {
    return repli()
  }
}
