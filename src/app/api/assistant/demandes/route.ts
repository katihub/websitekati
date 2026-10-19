import { NextResponse } from 'next/server'
import { entetesVisiteur } from '@/lib/appel-backend'

/**
 * LA QUESTION CONFIÉE À L'ÉQUIPE, RELAYÉE COMME SES VOISINES.
 *
 * Quand l'assistant ne sait pas, le visiteur peut écrire à une personne sans
 * quitter le chat. La demande part d'ici vers le backend, qui l'enregistre,
 * ajoute la confirmation au fil et prévient l'équipe ; la réponse revient plus
 * tard dans la même conversation, et par e-mail.
 *
 * MÊME RAISON DE PASSER PAR LE SERVEUR : la liste CORS du backend ne porte pas
 * ce domaine, un appel depuis le navigateur serait refusé avant de partir, et
 * l'adresse de l'API reste côté serveur.
 *
 * CE PROXY NE DÉCIDE RIEN DU FOND. Savoir si un téléphone ou un e-mail est
 * exigé dépend de qui appelle, et seul le backend lit le jeton. Il vérifie la
 * forme, relaie, et rend TEL QUEL le statut et le message du backend : ces
 * messages sont écrits pour la personne devant l'écran.
 */

/* Une demande écrit en base : aucune réponse ne doit sortir d'un cache, et Next
   ne doit pas tenter de rendre ceci à la construction. */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''
const DELAI_MS = 15_000

/** Les statuts dont le message est écrit pour le visiteur, et relayés tels quels. */
const STATUTS_RELAYES = new Set([400, 404, 429])

/** Ce que le visiteur lit quand la boutique ne répond pas. */
const INJOIGNABLE =
  'Nous n’arrivons pas à joindre l’équipe à l’instant. Réessayez dans un moment, ' +
  'ou contactez-nous depuis la page Contact afin qu’un conseiller reprenne votre demande.'

/** 429 sans message lisible : le limiteur de Nest parle anglais, pas au visiteur. */
const TROP_DE_DEMANDES =
  'Vous venez déjà d’envoyer une question. Patientez un instant avant d’en envoyer une autre.'

function injoignable(statut: number) {
  return NextResponse.json({ message: INJOIGNABLE }, { status: statut })
}

/**
 * `x-forwarded-for` et `authorization`, pour les raisons écrites dans
 * `../route.ts` : sans le premier, tous les visiteurs partagent le seau du
 * limiteur ; sans le second, un client connecté est traité en inconnu — et ici
 * cela lui réclamerait un téléphone que son compte connaît déjà.
 */
function entetesRelayees(requete: Request): Record<string, string> {
  const entetes: Record<string, string> = {}
  const jeton = requete.headers.get('authorization')
  if (jeton) entetes.authorization = jeton
  /* L'adresse du visiteur, et le secret qui la rend croyable pour le
     backend : voir `@/lib/appel-backend`. */
  return { ...entetes, ...entetesVisiteur(requete) }
}

/** Une chaîne non vide, nettoyée et plafonnée ; sinon rien. */
function texte(valeur: unknown, plafond: number): string | undefined {
  if (typeof valeur !== 'string') return undefined
  const propre = valeur.trim()
  return propre ? propre.slice(0, plafond) : undefined
}

/**
 * Le message d'erreur du backend, ramené à une phrase.
 *
 * La validation de Nest rend `message` en TABLEAU quand plusieurs règles
 * échouent ; le formulaire affiche une ligne, donc on garde la première, comme
 * `api()` le fait déjà côté navigateur.
 */
function messageDe(corps: unknown): string | null {
  if (!corps || typeof corps !== 'object') return null
  const m = (corps as { message?: unknown }).message
  if (typeof m === 'string' && m.trim()) return m
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0]
  return null
}

export async function POST(requete: Request) {
  if (!API) {
    /* La variable manque sur l'hébergeur. Le journal du serveur est le seul
       endroit où quelqu'un l'apprendra : la page ne doit pas exposer la
       configuration. */
    console.error('[assistant] NEXT_PUBLIC_API_URL absente : aucune demande ne peut aboutir.')
    return injoignable(503)
  }

  let corps: unknown
  try {
    corps = await requete.json()
  } catch {
    return NextResponse.json({ message: 'Corps JSON attendu.' }, { status: 400 })
  }

  const brut = (corps ?? {}) as Record<string, unknown>
  const fil = texte(brut.fil, 64)
  const question = texte(brut.question, 2000)
  if (!fil) {
    return NextResponse.json(
      { message: 'Cette conversation est introuvable. Posez votre question à nouveau.' },
      { status: 400 },
    )
  }
  if (!question) {
    return NextResponse.json({ message: 'Écrivez la question à transmettre.' }, { status: 400 })
  }

  /* LES CHAMPS VIDES SONT OMIS, PAS ENVOYÉS VIDES. Un `courriel: ""` serait lu
     comme une adresse invalide à l'autre bout, et refuserait la demande d'un
     visiteur qui n'a laissé que son téléphone — exactement ce qu'il a le droit
     de faire. */
  const nom = texte(brut.nom, 120)
  const telephone = texte(brut.telephone, 40)
  const courriel = texte(brut.courriel, 254)

  let reponse: Response
  try {
    reponse = await fetch(`${API}/v1/assistant/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...entetesRelayees(requete) },
      body: JSON.stringify({
        fil,
        question,
        ...(nom ? { nom } : {}),
        ...(telephone ? { telephone } : {}),
        ...(courriel ? { courriel } : {}),
      }),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: 'no-store',
    })
  } catch (erreur) {
    console.error(`[assistant] demandes : backend injoignable : ${(erreur as Error).message}`)
    return injoignable(502)
  }

  /* Le corps est lu en texte puis interprété : un relais en panne répond une
     page HTML, et `json()` lèverait sur ce qui est, pour le visiteur, la même
     chose qu'un backend éteint. */
  const donnees = await reponse
    .text()
    .then((t) => (t ? (JSON.parse(t) as unknown) : null))
    .catch(() => null)

  if (reponse.ok) {
    const { reference, statut } = (donnees ?? {}) as { reference?: unknown; statut?: unknown }
    if (typeof reference !== 'string') {
      console.error(`[assistant] demandes : réponse ${reponse.status} sans référence`)
      return injoignable(502)
    }
    return NextResponse.json(
      { reference, statut: typeof statut === 'string' ? statut : 'nouvelle' },
      { status: reponse.status },
    )
  }

  if (STATUTS_RELAYES.has(reponse.status)) {
    const message = messageDe(donnees)
    /* Le limiteur rend « ThrottlerException: Too Many Requests » : c'est un
       message pour le journal, pas pour quelqu'un qui attend l'équipe. */
    const lisible =
      reponse.status === 429 && (!message || /throttl|too many/i.test(message))
        ? TROP_DE_DEMANDES
        : message
    const apres = reponse.headers.get('retry-after')
    return NextResponse.json(
      { message: lisible ?? INJOIGNABLE },
      { status: reponse.status, headers: apres ? { 'Retry-After': apres } : undefined },
    )
  }

  /* 401, 500, 502… : un défaut de notre côté, dont le visiteur ne peut rien
     faire. Il lit une phrase, le journal garde le statut. */
  console.error(`[assistant] demandes : le backend a répondu ${reponse.status}`)
  return injoignable(502)
}
