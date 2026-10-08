/**
 * What the assistant exchanges with the shop, and nothing more.
 *
 * WHY THIS FILE REPLACED A 1 685-LINE ROUTE. The old assistant answered from a
 * JSON catalogue compiled at build time. A product created in the back office
 * did not exist for it; a price changed this morning stayed wrong until the
 * next deployment. It read the shop as it was the day the site was built.
 *
 * The understanding now lives in the backend, next to the data it reasons
 * about — bounds, brands, stock, subjects, breakdowns — and every question
 * reaches the database. Keeping a second, divergent reading of the same
 * sentence on this side would guarantee that the two disagree, and the reader
 * would get one answer in the panel and another on the product page.
 */

import { enteteAutorisation } from './api'

/** One product, exactly as the shop's own catalogue route returns it. */
export interface ProduitCite {
  readonly id: number
  readonly slug: string
  readonly nom: string
  readonly prix: number
  readonly prixReference: number | null
  readonly remisePct: number | null
  readonly promoDebut: string | null
  readonly promoFin: string | null
  readonly enStock: boolean
  readonly marque: string | null
  readonly image: string | null
}

/** What came with the answer: what to show, and what justifies it. */
export interface PiecesReponse {
  readonly produits?: readonly ProduitCite[]
  readonly total?: number
  /** True when the products came from a spelling rescue rather than an exact match. */
  readonly approximatif?: boolean
  readonly fiche?: { readonly cle: string; readonly titre: string }
  readonly filtres?: {
    readonly termes?: string
    /** Le backend l'envoie depuis toujours ; ce type ne le déclarait pas, donc
        « Je filtre sur… » n'a jamais montré la marque comprise. */
    readonly marque?: string
    readonly prixMin?: number
    readonly prixMax?: number
    readonly enStock?: boolean
    readonly enPromotion?: boolean
  }
  /** True when the assistant is handing the question to a person. */
  readonly humain?: boolean
  /** Le nœud de menu d'où vient la réponse, pour rouvrir l'arbre au bon endroit. */
  readonly menu?: { readonly noeud: string }
  /**
   * La confirmation qu'une question est partie vers l'équipe. C'est le serveur
   * qui l'écrit dans le fil, jamais le panneau : le visiteur relit ce qui a
   * réellement été enregistré, pas ce que le navigateur croit avoir envoyé.
   *
   * `statut` est celui du moment où la confirmation a été écrite (« nouvelle »)
   * et ne bouge plus ensuite : c'est l'arrivée d'un message de l'équipe qui dit
   * qu'une demande a reçu sa réponse, pas ce champ.
   */
  readonly demande?: { readonly reference: string; readonly statut: string }
  /** Porté par un message de l'équipe : qui a répondu, et à quelle demande. */
  readonly equipe?: { readonly nom: string; readonly reference: string }
}

/** Ce que fait un bouton du menu. Seuls `fiche` et `humain` atteignent le serveur. */
export type ActionMenu = 'menu' | 'fiche' | 'recherche' | 'humain'

export interface EntreeMenu {
  readonly libelle: string
  readonly action: ActionMenu
  readonly cible?: string
}

export interface NoeudMenu {
  readonly id: string
  readonly titre: string
  /** Le parent. Son absence dessine la racine — c'est ce qui décide de « Retour ». */
  readonly retour?: string
  readonly entrees: readonly EntreeMenu[]
}

export interface MenuAssistant {
  readonly version: string | null
  readonly racine: string
  readonly noeuds: readonly NoeudMenu[]
}

export interface ReponseAssistant {
  readonly fil: string
  readonly texte: string
  readonly pieces: PiecesReponse
  readonly suites: readonly string[]
}

/**
 * Who speaks. `equipe` is a person from the shop answering, from the admin
 * panel, a question the visitor handed over — it arrives in the thread later,
 * never as the answer to a request.
 */
export type AuteurMessage = 'visiteur' | 'assistant' | 'equipe'

/** One turn of the thread, as the panel draws it. */
export interface Message {
  readonly id: string
  readonly auteur: AuteurMessage
  readonly texte: string
  readonly pieces?: PiecesReponse
  /** Milliseconds. Written when the turn is created, never re-derived on render. */
  readonly le: number
}

/**
 * The thread token, kept so a returning visitor finds their conversation.
 *
 * IT IS NOT A CREDENTIAL. The server draws it at random and it designates one
 * anonymous thread: it continues a conversation and opens nobody else's. A
 * visitor who loses it loses their history, and that is the whole extent of
 * the damage.
 */
const CLE_FIL = 'nowtech.assistant.fil.v1'

export function lireFil(): string | null {
  try {
    return window.localStorage.getItem(CLE_FIL)
  } catch {
    /* Private windows and blocked site data throw on access rather than
       returning null. A panel that cannot remember a thread still works. */
    return null
  }
}

export function garderFil(fil: string): void {
  try {
    window.localStorage.setItem(CLE_FIL, fil)
  } catch {
    /* Nothing to do, and nothing to tell the reader: the conversation works,
       it simply will not survive a reload. */
  }
}

/**
 * LES CONVERSATIONS DU NAVIGATEUR, ET POURQUOI ELLES VIVENT ICI.
 *
 * Le serveur garde chaque fil et sait le rejouer, mais il ne sait pas QUELS
 * fils appartiennent à ce visiteur : la route est publique, il n'y a pas de
 * compte. Le navigateur est donc le seul endroit où la LISTE peut exister —
 * et c'est suffisant, parce que c'est exactement la portée du service rendu :
 * « retrouver mes conversations sur cet appareil ».
 *
 * CE QUI EST GARDÉ EST MINUSCULE : un jeton, un titre, une date. Jamais le
 * contenu — il est au serveur, qui le rend par `relire()`. Recopier les
 * messages ici créerait une seconde vérité qui divergerait de la première.
 *
 * LE TITRE EST LA PREMIÈRE QUESTION POSÉE, coupée. C'est ce dont on se
 * souvient d'une conversation, et cela évite d'en inventer un.
 */
const CLE_FILS = 'nowtech.assistant.fils.v1'
const FILS_GARDES = 12

export interface FilResume {
  readonly fil: string
  readonly titre: string
  /** Millisecondes, dernière activité — c'est l'ordre dans lequel on les lit. */
  readonly le: number
  /**
   * Les références des questions transmises à l'équipe depuis ce fil et encore
   * sans réponse. Tant qu'il en reste une, le panneau relit ce fil quand on
   * l'ouvre et quand l'onglet revient au premier plan : sans websocket, c'est
   * la seule façon de voir arriver la réponse.
   */
  readonly attente?: readonly string[]
  /** Une réponse de l'équipe est arrivée et le visiteur ne l'a pas encore lue. */
  readonly nonLu?: boolean
}

function lireListe(): FilResume[] {
  try {
    const brut = window.localStorage.getItem(CLE_FILS)
    const liste = brut ? (JSON.parse(brut) as unknown) : []
    if (!Array.isArray(liste)) return []
    return liste
      .filter(
        (f): f is FilResume =>
          typeof (f as FilResume)?.fil === 'string' &&
          typeof (f as FilResume)?.titre === 'string' &&
          typeof (f as FilResume)?.le === 'number',
      )
      .map((f) => {
        /* Les deux champs récents sont relus avec méfiance : une entrée écrite
           à la main, ou par une version future, ne doit pas faire planter la
           liste — elle perd seulement son suivi de demande. */
        const attente = Array.isArray(f.attente)
          ? f.attente.filter((r): r is string => typeof r === 'string')
          : []
        return {
          fil: f.fil,
          titre: f.titre,
          le: f.le,
          ...(attente.length > 0 ? { attente } : {}),
          ...(f.nonLu === true ? { nonLu: true } : {}),
        }
      })
  } catch {
    return []
  }
}

function ecrireListe(liste: readonly FilResume[]): void {
  window.localStorage.setItem(CLE_FILS, JSON.stringify(liste.slice(0, FILS_GARDES)))
}

/** Les conversations de cet appareil, la plus récente en tête. */
function listerFils(): FilResume[] {
  return lireListe().sort((a, b) => b.le - a.le)
}

/**
 * LA LISTE EST UN ÉTAT EXTERNE, PAS UN ÉTAT REACT — et c'est pour cela qu'on
 * la lit par un magasin plutôt que par un effet. Elle vit dans le stockage du
 * navigateur, elle change quand une conversation démarre, et elle peut changer
 * dans un AUTRE onglet. L'écrire depuis un effet ferait un rendu de plus à
 * chaque ouverture du panneau, ce que ce dépôt interdit, et manquerait
 * l'autre onglet.
 *
 * L'INSTANTANÉ EST MIS EN CACHE, ET IL LE FAUT : `useSyncExternalStore`
 * compare par identité. Rendre un tableau neuf à chaque appel ferait boucler
 * React indéfiniment.
 */
let instantaneFils: FilResume[] = []
let signatureFils = ''
const abonnesFils = new Set<() => void>()

function relireInstantane(): void {
  const liste = listerFils()
  /* L'attente et le « non lu » entrent dans la signature : sans eux, l'arrivée
     d'une réponse ne changerait pas l'instantané et la pastille n'apparaîtrait
     qu'au prochain message. */
  const signature = liste
    .map((f) => `${f.fil}:${f.le}:${f.attente?.join(',') ?? ''}:${f.nonLu ? 1 : 0}`)
    .join('|')
  if (signature === signatureFils) return
  signatureFils = signature
  instantaneFils = liste
}

function prevenir(): void {
  relireInstantane()
  for (const abonne of abonnesFils) abonne()
}

export function abonnerFils(surChangement: () => void): () => void {
  abonnesFils.add(surChangement)
  /* Un autre onglet qui démarre une conversation doit se voir ici. */
  window.addEventListener('storage', prevenir)
  return () => {
    abonnesFils.delete(surChangement)
    if (abonnesFils.size === 0) window.removeEventListener('storage', prevenir)
  }
}

export function instantaneDesFils(): FilResume[] {
  return instantaneFils
}

/** Le serveur n'a pas de stockage : la liste y est vide, et le premier rendu client la remplit. */
export function filsCoteServeur(): FilResume[] {
  return VIDE
}

const VIDE: FilResume[] = []

/**
 * Inscrit ou rafraîchit une conversation. Le titre n'est posé QU'UNE FOIS :
 * une conversation garde le nom de ce qui l'a ouverte, même si elle dérive
 * ensuite vers autre chose.
 */
export function noterFil(fil: string, premiereQuestion: string): void {
  try {
    const liste = lireListe()
    const connu = liste.find((f) => f.fil === fil)
    const titre = connu?.titre ?? (premiereQuestion.trim().slice(0, 60) || 'Conversation')
    const autres = liste.filter((f) => f.fil !== fil)
    /* `...connu` d'abord : une question de plus ne doit pas effacer le suivi
       d'une demande encore en attente sur ce fil. */
    ecrireListe([{ ...connu, fil, titre, le: Date.now() }, ...autres])
    prevenir()
  } catch {
    /* Fenêtre privée, stockage bloqué : la conversation marche quand même,
       elle ne survivra simplement pas au rechargement. */
  }
}

/**
 * Retient qu'une question est partie vers l'équipe depuis ce fil.
 *
 * C'est ce qui décide des relectures : un fil sans demande en attente n'est
 * jamais relu en arrière-plan. Relire tous les fils à chaque retour sur
 * l'onglet dépenserait le plafond de la route de relecture pour des
 * conversations où personne n'attend rien.
 */
export function noterDemande(fil: string, reference: string, question: string): void {
  try {
    const liste = lireListe()
    const connu = liste.find((f) => f.fil === fil)
    const attente = [...(connu?.attente ?? []).filter((r) => r !== reference), reference]
    const autres = liste.filter((f) => f.fil !== fil)
    ecrireListe([
      {
        ...connu,
        fil,
        titre: connu?.titre ?? (question.trim().slice(0, 60) || 'Conversation'),
        le: Date.now(),
        attente,
      },
      ...autres,
    ])
    prevenir()
  } catch {
    /* Stockage bloqué : la demande est partie quand même, et la réponse
       arrivera par e-mail ou à la prochaine reprise du fil. */
  }
}

/**
 * Compare un fil relu à ses demandes en attente.
 *
 * Une demande est RÉPONDUE quand un message de l'équipe porte sa référence.
 * `lu` dit si le visiteur a ce fil sous les yeux au moment de la relecture :
 * si oui, rien à signaler ; sinon la conversation est marquée, et la marque
 * reste jusqu'à ce qu'il l'ouvre.
 *
 * N'ÉCRIT QU'EN CAS DE CHANGEMENT. Une écriture prévient les abonnés, et une
 * relecture à chaque retour sur l'onglet qui réécrirait la liste pour rien
 * ferait refaire le rendu du panneau à chaque fois.
 */
export function constaterReponses(fil: string, messages: readonly Message[], lu: boolean): void {
  try {
    const liste = lireListe()
    const connu = liste.find((f) => f.fil === fil)
    if (!connu) return

    const repondues = new Set(
      messages.flatMap((m) =>
        m.auteur === 'equipe' && m.pieces?.equipe ? [m.pieces.equipe.reference] : [],
      ),
    )
    const attente = connu.attente ?? []
    const reste = attente.filter((r) => !repondues.has(r))
    const arrivee = reste.length < attente.length
    const nonLu = lu ? false : Boolean(connu.nonLu) || arrivee
    if (!arrivee && nonLu === Boolean(connu.nonLu)) return

    const maj: FilResume = {
      fil: connu.fil,
      titre: connu.titre,
      /* Une réponse est une activité : la conversation remonte en tête. */
      le: arrivee ? Date.now() : connu.le,
      ...(reste.length > 0 ? { attente: reste } : {}),
      ...(nonLu ? { nonLu: true } : {}),
    }
    ecrireListe(liste.map((f) => (f.fil === fil ? maj : f)))
    prevenir()
  } catch {
    /* Rien à faire : la marque est un confort, la réponse est dans le fil. */
  }
}

/** Le visiteur a ouvert cette conversation : sa marque « réponse » s'efface. */
export function marquerLu(fil: string): void {
  try {
    const liste = lireListe()
    const connu = liste.find((f) => f.fil === fil)
    if (!connu?.nonLu) return
    const lu: FilResume = {
      fil: connu.fil,
      titre: connu.titre,
      le: connu.le,
      ...(connu.attente ? { attente: connu.attente } : {}),
    }
    ecrireListe(liste.map((f) => (f.fil === fil ? lu : f)))
    prevenir()
  } catch {
    /* Rien à faire. */
  }
}

/** Les conversations où une question attend encore l'équipe. */
export function filsEnAttente(): FilResume[] {
  return listerFils().filter((f) => (f.attente?.length ?? 0) > 0)
}

/** Ferme la conversation courante sans l'effacer : la suivante en ouvrira une neuve. */
export function nouvelleConversation(): void {
  try {
    window.localStorage.removeItem(CLE_FIL)
  } catch {
    /* Rien à faire. */
  }
}

/** The sentence shown when the shop cannot be reached at all. */
export const HORS_LIGNE =
  'Je n’arrive pas à joindre la boutique à l’instant. Réessayez dans un moment, ' +
  'ou écrivez-nous sur WhatsApp — quelqu’un vous répondra tout de suite.'

/**
 * Asks the shop a question.
 *
 * IT GOES THROUGH OUR OWN ROUTE, NOT STRAIGHT TO THE API. Three reasons, and
 * the first is the one that decides: the backend's CORS list does not carry
 * this site's domain, so a call from the browser would be blocked before it
 * left. The second is that the API's address stays on the server. The third is
 * that a proxy can fail gracefully, where a blocked fetch fails silently.
 */
export async function demander(
  question: string,
  fil: string | null,
  signal?: AbortSignal,
  choix?: string,
): Promise<ReponseAssistant> {
  const reponse = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, ...(fil ? { fil } : {}), ...(choix ? { choix } : {}) }),
    signal,
  })

  if (!reponse.ok) throw new Error(`assistant: ${reponse.status}`)
  return (await reponse.json()) as ReponseAssistant
}

/**
 * L'arbre du menu. `null` quand il n'est pas joignable : le panneau retombe
 * alors sur la saisie libre, qui est l'interface d'avant et qui marche.
 */
export async function lireMenu(signal?: AbortSignal): Promise<MenuAssistant | null> {
  try {
    const reponse = await fetch('/api/assistant/menu', { signal })
    if (!reponse.ok) return null
    const menu = (await reponse.json()) as MenuAssistant
    return menu.noeuds.length ? menu : null
  } catch {
    return null
  }
}

/**
 * Replays a thread, so a returning visitor lands in their conversation rather
 * than on a blank panel.
 *
 * A thread that no longer exists is not an error worth showing: the token
 * simply expired, and the right behaviour is to start fresh. The caller gets
 * `null` and opens on the greeting.
 */
export async function relire(fil: string, signal?: AbortSignal): Promise<Message[] | null> {
  try {
    const reponse = await fetch(`/api/assistant/fils/${encodeURIComponent(fil)}`, { signal })
    if (!reponse.ok) return null

    const donnees = (await reponse.json()) as {
      messages?: Array<{
        rang: number
        auteur: AuteurMessage
        texte: string
        pieces?: PiecesReponse | null
        creeLe: string
      }>
    }

    const messages = donnees.messages ?? []
    if (messages.length === 0) return null

    return messages.map((m) => ({
      id: `${fil}-${m.rang}`,
      auteur: m.auteur,
      texte: m.texte,
      ...(m.pieces ? { pieces: m.pieces } : {}),
      le: Date.parse(m.creeLe) || Date.now(),
    }))
  } catch {
    return null
  }
}

/**
 * Lays a replayed thread over the one on screen, keeping what did not change.
 *
 * WHY NOT SIMPLY REPLACE IT. The thread is an `aria-live` region, and the
 * turns drawn from a question carry local ids (`m3`) where replayed ones carry
 * the server's (`fil-3`). Swapping the array would remount every bubble, and a
 * screen reader would read the whole conversation again each time the tab
 * regains focus. A turn whose author and text match is kept as the SAME object,
 * so only what is genuinely new is announced — and when nothing is new, the
 * very same array comes back and React does not render at all.
 *
 * The server still wins: from the first turn that differs, its version is the
 * one drawn.
 */
export function fusionnerFil(locaux: readonly Message[], serveur: readonly Message[]): Message[] {
  let change = locaux.length !== serveur.length
  const fusion = serveur.map((m, i) => {
    const local = locaux[i]
    if (local && local.auteur === m.auteur && local.texte === m.texte) return local
    change = true
    return m
  })
  return change ? fusion : (locaux as Message[])
}

/** What the visitor hands to the team. */
export interface DemandeEquipe {
  readonly fil: string
  readonly question: string
  readonly nom?: string
  readonly telephone?: string
  readonly courriel?: string
}

export type ResultatDemande =
  | { readonly ok: true; readonly reference: string; readonly statut: string }
  | { readonly ok: false; readonly statut: number; readonly message: string }

/** Ce que le formulaire affiche quand ni le proxy ni le backend n'ont pu répondre. */
const DEMANDE_IMPOSSIBLE =
  'Votre question n’a pas pu partir. Vérifiez votre connexion et réessayez, ' +
  'ou écrivez-nous sur WhatsApp.'

/**
 * Hands the question to a person.
 *
 * THE TOKEN IS READ HERE, AT THE MOMENT OF SENDING. A signed-in customer needs
 * no contact fields — the backend knows their address from the account — but
 * only if the token actually reaches it. Read at mount, a Supabase token could
 * have expired by the time the visitor has finished typing.
 *
 * NEVER THROWS. The form has exactly two outcomes to draw, a reference or a
 * sentence, and a network failure is one more sentence.
 */
export async function transmettreDemande(
  demande: DemandeEquipe,
  signal?: AbortSignal,
): Promise<ResultatDemande> {
  try {
    const reponse = await fetch('/api/assistant/demandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await enteteAutorisation()) },
      body: JSON.stringify(demande),
      signal,
    })
    const donnees = (await reponse.json().catch(() => null)) as {
      reference?: unknown
      statut?: unknown
      message?: unknown
    } | null

    if (reponse.ok && typeof donnees?.reference === 'string') {
      return {
        ok: true,
        reference: donnees.reference,
        statut: typeof donnees.statut === 'string' ? donnees.statut : 'nouvelle',
      }
    }
    return {
      ok: false,
      statut: reponse.status,
      message: typeof donnees?.message === 'string' ? donnees.message : DEMANDE_IMPOSSIBLE,
    }
  } catch {
    return { ok: false, statut: 0, message: DEMANDE_IMPOSSIBLE }
  }
}

/**
 * The hour a message was sent, as a conversation writes it.
 *
 * No date: a thread is read in one sitting, and « 14:32 » says everything a
 * reader needs. A full date beside every bubble would be noise.
 */
export function heure(le: number): string {
  return new Date(le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
