import { NextResponse } from 'next/server'
import { entetesVisiteur } from '@/lib/appel-backend'

/**
 * THE ASSISTANT'S DOOR, AND NOTHING ELSE.
 *
 * WHAT THIS FILE USED TO BE. 1 685 lines of intent engine: fifteen intents, a
 * twelve-step ladder, spelling rescue, price-bound reading, brand tallies. All
 * of it answered from a JSON catalogue compiled at build time, since retired.
 * It was careful work reading a frozen shop — a product created in the back
 * office did not exist for it, and a price changed this morning stayed wrong
 * until the next deployment.
 *
 * That understanding now lives in the backend, beside the data it reasons
 * about, and every question reaches the database. Keeping a second reading of
 * the same sentence here would guarantee the two disagree: the panel would say
 * one price and the product page another.
 *
 * WHY A PROXY AT ALL, RATHER THAN CALLING THE API FROM THE BROWSER. The
 * backend's CORS list carries `now-tech-website.vercel.app` and the admin
 * panel — not this site's own domain. A call from the browser is refused
 * before it leaves, with no error the page can see. Server-side, CORS does not
 * apply. The API's address also stays off the client, and a proxy can say
 * something useful when the shop is unreachable, where a blocked fetch says
 * nothing at all.
 */

/* The panel is a conversation: an answer must not be served from a cache, and
   Next must not try to render this at build time. */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''

/**
 * FIFTEEN SECONDS, AND THE REASON IS THE READER.
 *
 * The backend reads the catalogue and the knowledge base on every question;
 * measured locally, an answer comes back in well under a second. A visitor
 * staring at a typing indicator for thirty seconds has already decided the
 * shop is broken — better to say so at fifteen and let them retry.
 */
const DELAI_MS = 15_000

/** What the panel shows when the shop cannot be reached. */
function horsLigne() {
  return NextResponse.json(
    {
      fil: '',
      texte:
        'Je n’arrive pas à joindre la boutique à l’instant. Réessayez dans un moment, ' +
        'ou écrivez-nous sur WhatsApp — quelqu’un vous répondra tout de suite.',
      pieces: { humain: true },
      suites: ['Réessayer', 'Écrire sur WhatsApp'],
    },
    /* 200 AND NOT 502, AND C'EST DELIBERE. The panel draws this object as a
       message from Bod. A non-2xx would make the client throw and show its own
       generic failure instead of a sentence written for a human. The `humain`
       flag is what tells the panel this is a dead end, not an answer. */
    { status: 200 },
  )
}

/**
 * CE QUE LE PROXY DOIT TRANSMETTRE, ET NE TRANSMETTAIT PAS.
 *
 * Deux en-têtes, deux conséquences mesurables.
 *
 * `x-forwarded-for` D'ABORD, PARCE QUE SON ABSENCE ÉTAIT UN DÉFAUT ACTIF. Le
 * limiteur du backend compte par adresse IP, et toutes les questions du site
 * arrivaient sous l'IP de sortie de l'hébergeur : un seul seau pour tous les
 * visiteurs, sur une route plafonnée à une requête toutes les deux secondes.
 * Deux personnes qui écrivaient en même temps se gênaient.
 *
 * `authorization` ENSUITE. La vitrine sait poser le jeton, le backend sait le
 * lire — mais il ne passait pas ce relais, donc `Conversation.clientId` était
 * nul pour la totalité du trafic. Un client connecté était traité en inconnu,
 * et la branche qui rattache une conversation à un compte n'a jamais servi.
 * Le jeton est relayé QUAND IL EXISTE ; la route reste publique et l'anonyme
 * continue de poser ses questions.
 */
function entetesRelayees(requete: Request): Record<string, string> {
  const entetes: Record<string, string> = {}
  const jeton = requete.headers.get('authorization')
  if (jeton) entetes.authorization = jeton
  /* L'adresse du visiteur, et le secret qui la rend croyable pour le
     backend : voir `@/lib/appel-backend`. */
  return { ...entetes, ...entetesVisiteur(requete) }
}

export async function POST(requete: Request) {
  if (!API) {
    /* The variable is missing on the host. Saying so in the server log is the
       only way anyone finds out: the page itself must not leak configuration. */
    console.error('[assistant] NEXT_PUBLIC_API_URL absente : aucune question ne peut aboutir.')
    return horsLigne()
  }

  let corps: unknown
  try {
    corps = await requete.json()
  } catch {
    return NextResponse.json({ message: 'Corps JSON attendu.' }, { status: 400 })
  }

  const { question, fil, choix } = (corps ?? {}) as {
    question?: unknown
    fil?: unknown
    choix?: unknown
  }
  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json({ message: 'Une question est attendue.' }, { status: 400 })
  }

  try {
    const reponse = await fetch(`${API}/v1/assistant/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...entetesRelayees(requete),
      },
      body: JSON.stringify({
        /* Trimmed and capped here as well as in the backend: a 2 Mo body should
           not travel across the network to be refused at the other end. */
        question: question.trim().slice(0, 600),
        ...(typeof fil === 'string' && fil ? { fil } : {}),
        /* Validé du même motif que le DTO : un choix malformé est LAISSÉ DE
           CÔTÉ plutôt que relayé, sinon la question entière serait refusée à
           l'autre bout pour un bouton d'un onglet resté ouvert trop longtemps. */
        ...(typeof choix === 'string' && /^(faq|depannage)\.[a-z0-9-]{1,40}$/.test(choix)
          ? { choix }
          : {}),
      }),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: 'no-store',
    })

    if (!reponse.ok) {
      /* A 400 from the backend is the visitor's doing — an empty question, a
         malformed token — and its message is written for them. Anything else
         is ours, and they get the offline sentence rather than a status code. */
      if (reponse.status === 400) {
        return NextResponse.json(await reponse.json(), { status: 400 })
      }
      /* 429 N'EST PAS UNE PANNE, et le dire ainsi serait doublement faux :
         la boutique répond très bien, c'est le visiteur qui va plus vite que
         le plafond d'une question toutes les deux secondes. « Je n'arrive pas
         à joindre la boutique » l'inquiéterait pour rien et l'enverrait sur
         WhatsApp alors qu'il lui suffit d'attendre une seconde. */
      if (reponse.status === 429) {
        return NextResponse.json(
          {
            fil: typeof fil === 'string' ? fil : '',
            texte: 'Un instant — je termine votre question précédente.',
            pieces: {},
            suites: [],
          },
          { status: 200 },
        )
      }
      console.error(`[assistant] le backend a répondu ${reponse.status}`)
      return horsLigne()
    }

    return NextResponse.json(await reponse.json(), { status: 200 })
  } catch (erreur) {
    console.error(`[assistant] backend injoignable : ${(erreur as Error).message}`)
    return horsLigne()
  }
}
