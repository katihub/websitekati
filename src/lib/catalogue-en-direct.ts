import 'server-only'

import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { headers } from 'next/headers'
import { cache } from 'react'

import { adressesVisiteur, entetesLectureCommune, entetesPourVisiteur } from '@/lib/appel-backend'
import { rayonParSlug } from '@/lib/catalogue-vues'
import { counterLandmark } from '@/lib/comptoirs'
import { COUNTER_TOUR } from '@/constants/home'
import { DEPARTMENT_HERO_PRODUCT } from '@/constants/universes'
import type {
  Accueil,
  FicheProduit,
  FiltresListe,
  IndexMarques,
  Navigation,
  PageListe,
  PageRecherche,
  PointDeVente,
  Suggestions,
  Tri,
} from '@/types/catalogue'

/**
 * LE SEUL ENDROIT OU LA VITRINE LIT SON CATALOGUE.
 *
 * LE DEFAUT QUI L'A FAIT NAITRE. Le catalogue etait un fichier compile au build
 * depuis des exports WooCommerce. Un produit cree dans le panel n'existait donc
 * pas sur le site — sa fiche repondait 404 — et un prix corrige n'y apparaissait
 * que par une surcouche lue a part. Le backend est desormais la seule source :
 * chaque page lit ici, et nulle part ailleurs ne s'ecrit une adresse `/v1`.
 *
 * TROIS REGLES, TENUES DANS `lireJson` ET NON PAGE PAR PAGE.
 * - Chaque lecture porte l'en-tete de service. Le serveur de la vitrine appelle
 *   pour tous les visiteurs depuis quelques adresses : sans lui, le backend le
 *   plafonne a mille requetes par heure et tout le site tombe en 429. Une
 *   lecture dont l'adresse est choisie par le visiteur nomme en plus ce
 *   visiteur, pour que ce soit lui que le backend limite (voir `Payeur`).
 * - Chaque lecture porte l'etiquette `catalogue`, que `/api/revalider` expire a
 *   chaque ecriture du panel. Sans elle, une correction n'apparaitrait qu'a
 *   l'expiration du cache.
 * - Chaque lecture a un delai borne, et un echec LEVE `CatalogueIndisponible`.
 *   Il n'y a plus de fichier sur lequel retomber, et inventer une page vide
 *   serait pire qu'une erreur : une grille a zero reference sous « Reseaux »
 *   dit au client que la boutique n'en vend pas. Les pages attrapent la panne
 *   (`@/lib/panne-catalogue`) et affichent a la place, des le HTML du serveur,
 *   une page qui dit la verite et propose de reessayer.
 */

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''

const ETIQUETTE_CATALOGUE = 'catalogue'
const ETIQUETTE_POINTS_VENTE = 'points-vente'
export const ETIQUETTE_BANNIERES = 'bannieres'
export const ETIQUETTE_ANNONCES = 'annonces'
export const etiquetteProduit = (slug: string) => `produit:${slug}`

/**
 * Ce que `/api/revalider` expire a chaque appel. Une seule liste, lue par la route.
 *
 * LES BANNIERES Y SONT AUSSI. Leur lecture portait deja son etiquette, mais la
 * route ne l'expirait pas : une piece publiee dans le panel attendait les cinq
 * minutes du cache avant d'apparaitre en haut de l'accueil.
 */
export const ETIQUETTES_FIXES = [
  ETIQUETTE_CATALOGUE,
  'produit',
  ETIQUETTE_POINTS_VENTE,
  ETIQUETTE_BANNIERES,
  ETIQUETTE_ANNONCES,
] as const

/**
 * Six secondes pour une page, trois pour une suggestion.
 *
 * Une page qui attend le backend n'a rien d'autre a montrer : mieux vaut
 * patienter un peu qu'afficher l'erreur a la premiere lenteur d'un VPS. Une
 * suggestion, elle, arrive pendant la frappe ; au-dela de trois secondes le
 * lecteur a deja tape la lettre suivante et la reponse ne sert plus a rien.
 */
const DELAI_MS = 6_000
const DELAI_SUGGESTIONS_MS = 3_000

/**
 * DEUX SECONDES PENDANT LESQUELLES UNE LECTURE QUI VIENT D'ECHOUER ECHOUE TOUT DE SUITE.
 *
 * LE DEFAUT CONSTATE. Contre un backend fige, la fiche produit mettait 13,6 s a
 * afficher son erreur, pour un delai de six. Quand une page leve, Next la rend
 * une seconde fois pour produire l'erreur, et rappelle `generateMetadata` dans
 * un nouveau contexte : la memoire de `cache` est vide, et la meme lecture
 * attendait six secondes de plus pour echouer de la meme facon.
 *
 * Deux secondes suffisent a couvrir ce second rendu, qui suit l'echec a la
 * milliseconde, sans empecher le bouton « Reessayer » de retenter pour de bon
 * quand le lecteur le presse.
 *
 * UN DELAI DEPASSE SEULEMENT, ET JAMAIS PENDANT LE BUILD. La memoire leve AVANT
 * `fetch`, donc le rendu n'apprend ni la fraicheur de la lecture ni ce que le
 * cache de donnees garde. Constate : un build sans backend a fige /devis,
 * /hors-ligne et /compte/commandes en pages statiques sans rayons et sans
 * expiration (`initialRevalidateSeconds: false`), parce que la seconde lecture
 * de la navigation n'avait jamais atteint `fetch`. Une connexion refusee echoue
 * en quelques millisecondes : la retenter ne coute rien, et c'est seulement un
 * backend fige qui faisait attendre deux fois.
 */
const MEMOIRE_PANNE_MS = 2_000
const pannesRecentes = new Map<string, number>()

class DelaiDepasse extends Error {}

const auBuild = () => process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD

/** Soixante secondes comme filet : l'etiquette est le chemin normal de mise a jour. */
const FRAICHEUR_S = 60
const FRAICHEUR_RECHERCHE_S = 30
/* Les points de vente ne sont pas encore signales par le backend quand le
   panel les modifie : cinq minutes bornent l'attente sans charger la base. */
const FRAICHEUR_POINTS_VENTE_S = 300

/**
 * CE QUI PEUT ETRE ENVOYE COMME SLUG DE RAYON, DE FAMILLE OU DE MARQUE.
 *
 * Le motif est celui que `/v1/catalogue/liste` valide : hors de lui le backend
 * repond 400, que cette vitrine lirait comme une panne. La longueur est celle
 * que le panel accepte pour un slug de categorie (200).
 *
 * UNE SEULE REGLE POUR TOUTE LA VITRINE, et `params.ts` lit celle-ci. Il en
 * tenait une autre, 64 caracteres au plus : une famille au slug de 65 s'ouvrait
 * en /categorie/<slug>, mais le lien de son filtre, `?famille=<slug>`, etait
 * ecarte comme « ni un rayon, ni une famille, ni une marque ».
 */
const SLUG = /^[a-z0-9][a-z0-9-]*$/
const LONGUEUR_SLUG_MAX = 200

export const slugValide = (slug: string) => slug.length <= LONGUEUR_SLUG_MAX && SLUG.test(slug)

/**
 * QUI REPOND D'UNE LECTURE DEVANT LES QUOTAS DU BACKEND.
 *
 * `vitrine` : une adresse que le site borne lui-meme — le menu, une fiche, un
 * rayon sans filtre dans ses propres pages. Toutes les visites la partagent en
 * cache, et le backend ne la compte pas.
 *
 * `visiteur` : une adresse que le visiteur peut faire varier sans fin — une
 * question, un prix tape a la main, une combinaison de filtres, une page au-dela
 * de la derniere. Chaque variante manque le cache ; sans quota, n'importe qui
 * faisait travailler la base a travers la vitrine. L'adresse du visiteur est
 * donc transmise, et c'est lui que le backend limite.
 *
 * LE PRIX DE CE CHOIX EST CONNU. L'en-tete du visiteur entre dans la cle du
 * cache de `fetch`, et deux visiteurs qui posent la meme question ne partagent
 * plus la reponse. Pour une question tapee a la main, ils la partageaient
 * rarement.
 */
export type Payeur = 'vitrine' | 'visiteur'

/** `null` pour la vitrine ; pour un visiteur, les adresses relayees par l'hebergeur. */
async function adressesDuPayeur(payeur: Payeur): Promise<string | null> {
  return payeur === 'vitrine' ? null : adressesVisiteur(await headers())
}

export class CatalogueIndisponible extends Error {
  readonly chemin: string

  constructor(chemin: string, cause: unknown) {
    const raison = cause instanceof Error ? cause.message : String(cause)
    super(`catalogue injoignable (${chemin}) : ${raison}`, { cause })
    this.name = 'CatalogueIndisponible'
    this.chemin = chemin
  }
}

/**
 * Une lecture, mise en cache, bornee, verifiee.
 *
 * `cache` DE REACT ET NON LA MEMOISATION DE `fetch`. Une page lit la meme
 * navigation depuis ses metadonnees, son corps et parfois deux composants ; il
 * faut que ce soit un seul appel ET un seul decodage. Les arguments sont des
 * primitives parce que `cache` compare par identite : un tableau d'etiquettes
 * neuf a chaque appel ferait manquer la memoire a tous les coups.
 *
 * AUCUN `signal` SUR LE `fetch`, parce qu'un signal fait sortir la requete de
 * la memoisation de Next (`next/dist/docs/.../fetch.md`). Le delai est une course
 * contre une minuterie ; la requete perdante n'est pas annulee, elle finit en
 * arriere-plan et remplit le cache pour la visite suivante.
 *
 * `null` UNIQUEMENT POUR UN 404 ATTENDU : un produit retire, un slug que la base
 * ne connait pas. Tout le reste — statut inattendu, 429, reseau coupe, delai
 * depasse, JSON illisible — est une panne, et une panne leve.
 *
 * `visiteur` vaut `null` pour une lecture de la vitrine, et les adresses du
 * visiteur sinon (voir {@link Payeur}).
 */
const lireJson = cache(
  async (
    chemin: string,
    fraicheur: number,
    etiquettes: string,
    delaiMs: number,
    absentSi404: boolean,
    visiteur: string | null,
  ) => {
    if (!API) throw new CatalogueIndisponible(chemin, 'NEXT_PUBLIC_API_URL absente')

    const echecPrecedent = auBuild() ? undefined : pannesRecentes.get(chemin)
    if (echecPrecedent !== undefined && Date.now() - echecPrecedent < MEMOIRE_PANNE_MS) {
      throw new CatalogueIndisponible(chemin, 'pas de réponse il y a moins de deux secondes')
    }

    const travail = fetch(`${API}/v1${chemin}`, {
      headers: visiteur === null ? entetesLectureCommune() : entetesPourVisiteur(visiteur),
      next: { revalidate: fraicheur, tags: etiquettes.split(',') },
    }).then(async (reponse): Promise<unknown> => {
      if (reponse.status === 404 && absentSi404) return null
      if (!reponse.ok) throw new Error(`le backend a répondu ${reponse.status}`)
      // Le corps est lu DANS la course : un serveur qui envoie ses en-tetes puis
      // se tait tiendrait sinon la page au-dela du delai.
      return reponse.json()
    })
    // La perdante de la course ne doit pas devenir un rejet non traite.
    travail.catch(() => undefined)

    let minuterie: ReturnType<typeof setTimeout> | undefined
    const delai = new Promise<never>((_, rejeter) => {
      minuterie = setTimeout(() => rejeter(new DelaiDepasse(`pas de réponse en ${delaiMs} ms`)), delaiMs)
    })

    try {
      const valeur = await Promise.race([travail, delai])
      pannesRecentes.delete(chemin)
      return valeur
    } catch (erreur) {
      /* Seul un delai complet prouve un backend fige. La navigation lue sur le
         reste de l'echeance d'une suggestion peut expirer apres une seconde :
         la retenir ferait echouer d'emblee la page qui l'aurait eue en quatre. */
      if (erreur instanceof DelaiDepasse && delaiMs >= DELAI_MS && !auBuild()) {
        /* Les adresses de recherche viennent des visiteurs : la table est videe
           plutot que de grossir sans fin pendant une longue panne. */
        if (pannesRecentes.size > 500) pannesRecentes.clear()
        pannesRecentes.set(chemin, Date.now())
      }
      const panne = new CatalogueIndisponible(chemin, erreur)
      console.error(`[catalogue] ${chemin} : ${panne.message}`)
      throw panne
    } finally {
      clearTimeout(minuterie)
    }
  },
)

/** Une reponse d'API est une entree externe : on verifie sa forme, on ne la suppose pas. */
function verifier<T>(chemin: string, valeur: unknown, forme: (objet: Record<string, unknown>) => boolean): T {
  if (typeof valeur === 'object' && valeur !== null && forme(valeur as Record<string, unknown>)) {
    return valeur as T
  }
  const panne = new CatalogueIndisponible(chemin, 'réponse de forme inattendue')
  console.error(`[catalogue] ${chemin} : ${panne.message}`)
  throw panne
}

/**
 * Une chaine de requete canonique : parametres dans un ordre fixe, valeurs par
 * defaut omises. Deux pages qui demandent la meme liste construisent la meme
 * adresse, donc partagent la meme entree de cache.
 */
function requete(parametres: readonly (readonly [string, string | number | boolean | null | undefined])[]): string {
  const sortie = new URLSearchParams()
  for (const [nom, valeur] of parametres) {
    if (valeur === null || valeur === undefined || valeur === false || valeur === '') continue
    sortie.set(nom, valeur === true ? '1' : String(valeur))
  }
  const texte = sortie.toString()
  return texte ? `?${texte}` : ''
}

const liste = (valeurs: readonly string[] | undefined) => (valeurs && valeurs.length > 0 ? valeurs.join(',') : null)

const sansDefaut = <T>(valeur: T | undefined, defaut: T) => (valeur === defaut ? undefined : valeur)

const avecEtiquettes = (...etiquettes: string[]) => etiquettes.join(',')

/**
 * LES PHOTOGRAPHIES D'OUVERTURE DES RAYONS, CHOISIES A L'OEIL DANS LA VITRINE.
 *
 * Aucune table ne les porte : la vitrine les transmet a chaque appel. Toujours
 * la meme liste, dans l'ordre fixe des cles, donc une seule adresse et une seule
 * entree de cache pour la navigation de tout le site.
 */
const PHOTOS_RAYONS = Object.entries(DEPARTMENT_HERO_PRODUCT)
  .map(([rayon, produit]) => `${rayon}:${produit}`)
  .join(',')

const estNavigation = (n: Record<string, unknown>) =>
  Array.isArray(n.rayons) && Array.isArray(n.categories) && Array.isArray(n.marques) && typeof n.nombreProduits === 'number'

async function lireNavigationEn(delaiMs: number): Promise<Navigation> {
  const chemin = `/catalogue/navigation${requete([['photos', PHOTOS_RAYONS]])}`
  const brut = await lireJson(chemin, FRAICHEUR_S, avecEtiquettes(ETIQUETTE_CATALOGUE), delaiMs, false, null)
  return verifier<Navigation>(chemin, brut, estNavigation)
}

/** Le menu, l'arbre des familles, les marques et les compteurs. Leve si le backend ne repond pas. */
export async function lireNavigation(): Promise<Navigation> {
  return lireNavigationEn(DELAI_MS)
}

/**
 * La meme, pour l'habillage du site (en-tete, pied de page).
 *
 * `error.tsx` n'enveloppe pas le layout de son propre segment : une erreur
 * levee par l'en-tete remonterait jusqu'a la page d'erreur globale, sans style
 * ni navigation. L'habillage se replie donc, et la page, elle, dit la panne.
 */
export async function lireNavigationOuNull(): Promise<Navigation | null> {
  try {
    return await lireNavigation()
  } catch {
    return null
  }
}

/**
 * Une liste : un rayon, une famille, une marque ou le catalogue filtre.
 *
 * `null` quand un slug demande n'existe pas (404 du backend) ou n'a pas la
 * forme d'un slug. Le second cas n'appelle rien : le backend repondrait 400, et
 * une adresse tapee a la main n'est pas une panne du catalogue.
 *
 * `payeur` n'a pas de valeur par defaut : c'est l'appelant qui sait si les
 * filtres viennent de l'adresse du visiteur ou du code de la page.
 */
export async function lireListe(filtres: FiltresListe, payeur: Payeur): Promise<PageListe | null> {
  const slugs = [...(filtres.rayons ?? []), ...(filtres.familles ?? []), ...(filtres.marques ?? [])]
  if (!slugs.every(slugValide)) return null

  const entier = (valeur: number | null | undefined) =>
    typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0 ? valeur : null

  const chemin = `/catalogue/liste${requete([
    ['rayons', liste(filtres.rayons)],
    ['familles', liste(filtres.familles)],
    ['marques', liste(filtres.marques)],
    ['prixMin', entier(filtres.prixMin)],
    ['prixMax', entier(filtres.prixMax)],
    ['remise', filtres.remise],
    ['photo', filtres.photo],
    ['tri', sansDefaut(filtres.tri, 'recent')],
    ['page', sansDefaut(filtres.page, 1)],
    ['parPage', sansDefaut(filtres.parPage, 24)],
    ['facettes', filtres.facettes],
    [
      'tranches',
      filtres.facettes && filtres.tranches
        ? liste(filtres.tranches.map(({ min, max }) => `${entier(min) ?? ''}-${entier(max) ?? ''}`))
        : null,
    ],
  ])}`

  const brut = await lireJson(
    chemin,
    FRAICHEUR_S,
    avecEtiquettes(ETIQUETTE_CATALOGUE),
    DELAI_MS,
    true,
    await adressesDuPayeur(payeur),
  )
  if (brut === null) return null
  return verifier<PageListe>(
    chemin,
    brut,
    (l) => Array.isArray(l.produits) && typeof l.total === 'number' && typeof l.pages === 'number',
  )
}

/**
 * La page de resultats. Un rayon qui n'a pas la forme d'un slug est omis : la
 * page le valide deja contre la navigation, et ce garde evite seulement qu'une
 * adresse fantaisiste coute un 400.
 *
 * Toujours au compte du visiteur : la question est la sienne.
 */
export async function lireRecherche(question: {
  readonly q: string
  readonly rayon?: string | null
  readonly tri?: Tri
  readonly page?: number
}): Promise<PageRecherche> {
  const rayon = question.rayon && slugValide(question.rayon) ? question.rayon : null
  const chemin = `/catalogue/recherche${requete([
    ['q', question.q.trim()],
    ['rayon', rayon],
    ['tri', sansDefaut(question.tri, 'recent')],
    ['page', sansDefaut(question.page, 1)],
  ])}`
  const brut = await lireJson(
    chemin,
    FRAICHEUR_RECHERCHE_S,
    avecEtiquettes(ETIQUETTE_CATALOGUE),
    DELAI_MS,
    false,
    await adressesDuPayeur('visiteur'),
  )
  return verifier<PageRecherche>(
    chemin,
    brut,
    (r) => Array.isArray(r.produits) && typeof r.total === 'number' && Array.isArray(r.parRayon),
  )
}

/**
 * Cinq produits, trois familles, deux marques, pour une question en cours de
 * frappe, et le rayon auquel cette reponse s'applique vraiment : celui demande
 * s'il existe, `null` (tout le catalogue) sinon.
 *
 * LE RAYON EST VERIFIE CONTRE LA NAVIGATION AVANT D'ETRE ENVOYE. Le backend
 * repond « rien » a un slug qu'il ne connait pas, la ou la page de resultats
 * repond pour tout le catalogue et le dit.
 *
 * UN SEUL DELAI POUR LES DEUX LECTURES. La navigation attendait ses six
 * secondes, puis les suggestions leurs trois : contre un backend fige, une
 * suggestion pouvait mettre neuf secondes a echouer, pour un lecteur qui a tape
 * trois lettres de plus entre-temps. L'echeance est commune, et la seconde
 * lecture n'a que ce que la premiere lui a laisse.
 *
 * Une lettre n'est pas une question : en dessous de deux, rien n'est demande au
 * backend, et la reponse est vide.
 */
export async function lireSuggestions(
  q: string,
  rayonDemande: string | null,
): Promise<Suggestions & { readonly rayon: string | null }> {
  const echeance = Date.now() + DELAI_SUGGESTIONS_MS
  const reste = () => Math.max(1, echeance - Date.now())

  const rayon = rayonDemande
    ? (rayonParSlug(await lireNavigationEn(reste()), rayonDemande)?.slug ?? null)
    : null
  const question = q.trim()
  if (question.length < 2) return { rayon, produits: [], familles: [], marques: [] }

  const chemin = `/catalogue/suggestions${requete([
    ['q', question],
    ['rayon', rayon],
  ])}`
  const brut = await lireJson(
    chemin,
    FRAICHEUR_RECHERCHE_S,
    avecEtiquettes(ETIQUETTE_CATALOGUE),
    reste(),
    false,
    await adressesDuPayeur('visiteur'),
  )
  const suggestions = verifier<Suggestions>(
    chemin,
    brut,
    (s) => Array.isArray(s.produits) && Array.isArray(s.familles) && Array.isArray(s.marques),
  )
  return { rayon, produits: suggestions.produits, familles: suggestions.familles, marques: suggestions.marques }
}

/**
 * La fiche d'un produit. `null` quand il n'existe pas ou a ete retire : le
 * backend traite les deux de la meme facon, et la page repond 404.
 *
 * TROIS ETIQUETTES. `catalogue` parce qu'une fiche montre des produits lies,
 * dont le prix peut changer sans que celui-ci bouge ; `produit` et
 * `produit:<slug>` parce que le backend les tire deja apres une ecriture.
 */
export async function lireFiche(slug: string): Promise<FicheProduit | null> {
  if (slug.length === 0 || slug.length > LONGUEUR_SLUG_MAX) return null
  const chemin = `/catalogue/produits/${encodeURIComponent(slug)}`
  const brut = await lireJson(
    chemin,
    FRAICHEUR_S,
    avecEtiquettes(ETIQUETTE_CATALOGUE, 'produit', etiquetteProduit(slug)),
    DELAI_MS,
    true,
    null,
  )
  if (brut === null) return null
  return verifier<FicheProduit>(
    chemin,
    brut,
    (f) =>
      typeof f.slug === 'string' &&
      typeof f.prix === 'number' &&
      Number.isFinite(f.prix) &&
      Array.isArray(f.galerie) &&
      Array.isArray(f.lies) &&
      Array.isArray(f.fil),
  )
}

/** Une fiche des questions frequentes, telle que `GET /assistant/fiches/:cle` la rend. */
export interface FicheConditions {
  readonly cle: string
  readonly titre: string
  readonly corps: string
}

/** Les trois regles de la maison qu'un client doit lire avant de commander. */
export interface Conditions {
  readonly livraison: FicheConditions | null
  readonly garantie: FicheConditions | null
  readonly paiement: FicheConditions | null
}

/**
 * Cinq minutes : ces textes changent quand la direction les reecrit dans le
 * panel, pas au fil des ventes. Les relire a chaque page de commande couterait
 * trois appels par client pour rien.
 */
const FRAICHEUR_CONDITIONS_S = 300
const ETIQUETTE_CONDITIONS = 'conditions'

/**
 * LES CONDITIONS DE LIVRAISON, DE GARANTIE ET DE PAIEMENT, ECRITES PAR LA MAISON.
 *
 * Elles vivent dans la base de connaissances (`faq.livraison`, `faq.garantie`,
 * `faq.paiement`) et se corrigent depuis le panel : la vitrine les lit, elle ne
 * les recopie pas — une copie divergerait a la premiere correction.
 *
 * JAMAIS DE PANNE. Une fiche absente ou illisible devient `null`, et la page de
 * commande se passe de ce paragraphe plutot que de refuser la commande : un
 * client qui ne lit pas les conditions peut encore acheter, un client devant une
 * page d'erreur ne le peut plus.
 */
export async function lireConditions(): Promise<Conditions> {
  const lire = async (cle: string): Promise<FicheConditions | null> => {
    const chemin = `/assistant/fiches/${encodeURIComponent(cle)}`
    try {
      const brut = await lireJson(
        chemin,
        FRAICHEUR_CONDITIONS_S,
        avecEtiquettes(ETIQUETTE_CONDITIONS),
        DELAI_MS,
        true,
        null,
      )
      if (brut === null) return null
      return verifier<FicheConditions>(
        chemin,
        brut,
        (f) => typeof f.titre === 'string' && typeof f.corps === 'string',
      )
    } catch {
      return null
    }
  }
  const [livraison, garantie, paiement] = await Promise.all([
    lire('faq.livraison'),
    lire('faq.garantie'),
    lire('faq.paiement'),
  ])
  return { livraison, garantie, paiement }
}

/** L'index des marques, avec leur photographie et leurs rayons. */
export async function lireMarques(): Promise<IndexMarques> {
  const chemin = '/catalogue/marques'
  const brut = await lireJson(chemin, FRAICHEUR_S, avecEtiquettes(ETIQUETTE_CATALOGUE), DELAI_MS, false, null)
  return verifier<IndexMarques>(chemin, brut, (m) => Array.isArray(m.marques))
}

/** Les selections, le tour des comptoirs et les colonnes d'arrivages de l'accueil. */
export async function lireAccueil(comptoirs: readonly string[] = COUNTER_TOUR): Promise<Accueil> {
  const chemin = `/vitrine/accueil${requete([['comptoirs', liste(comptoirs)]])}`
  const brut = await lireJson(chemin, FRAICHEUR_S, avecEtiquettes(ETIQUETTE_CATALOGUE), DELAI_MS, false, null)
  return verifier<Accueil>(
    chemin,
    brut,
    (a) => typeof a.selections === 'object' && a.selections !== null && Array.isArray(a.colonnes),
  )
}

/** Les comptoirs de retrait. Leve si le backend ne repond pas. */
export async function lirePointsVente(): Promise<readonly PointDeVente[]> {
  const chemin = '/vitrine/points-vente'
  const brut = await lireJson(
    chemin,
    FRAICHEUR_POINTS_VENTE_S,
    avecEtiquettes(ETIQUETTE_POINTS_VENTE),
    DELAI_MS,
    false,
    null,
  )
  if (!Array.isArray(brut)) {
    const panne = new CatalogueIndisponible(chemin, 'réponse de forme inattendue')
    console.error(`[catalogue] ${chemin} : ${panne.message}`)
    throw panne
  }
  return brut.map((point) => normaliserPointVente(point, brut))
}

/**
 * UN BACKEND PLUS ANCIEN QUE LES LIGNES MULTIPLES RESTE LISIBLE.
 *
 * Avant la liste `phones`, un comptoir ne portait qu'un `phone` et un
 * `whatsapp`, et c'est ce que rend encore la production tant que la nouvelle
 * version n'y est pas deployee. On en refait une liste, pour que les composants
 * ne connaissent qu'une seule forme.
 *
 * Le libelle manque aussi a ce backend-la. Le quartier seul ne suffit pas a sa
 * place : les deux comptoirs d'Akwa s'intitulaient tous deux « Akwa » sur
 * /contact et sur l'accueil. Quand un quartier en porte plusieurs, le repere
 * les departage, comme dans le pied de page.
 */
function normaliserPointVente(
  brut: PointDeVente & { phone?: string | null; whatsapp?: string | null },
  tous: readonly PointDeVente[],
): PointDeVente {
  const { phone, whatsapp, ...point } = brut
  const phones = Array.isArray(brut.phones)
    ? brut.phones
    : [...new Set([phone, whatsapp].filter((ligne): ligne is string => !!ligne))].map((number) => ({
        number,
        whatsapp: number === whatsapp,
      }))
  return {
    ...point,
    label: brut.label?.trim() || nomSansLibelle(brut, tous),
    phones,
    mapUrl: brut.mapUrl ?? null,
  }
}

function nomSansLibelle(point: PointDeVente, tous: readonly PointDeVente[]): string {
  const repere = counterLandmark(point, tous)
  return repere ? `${point.district} (${repere})` : point.district
}

/** Les memes, pour l'habillage : une liste vide plutot qu'un site sans pied de page. */
export async function lirePointsVenteOuVide(): Promise<readonly PointDeVente[]> {
  try {
    return await lirePointsVente()
  } catch {
    return []
  }
}
