import { NextResponse } from 'next/server'
import { entetesVisiteur } from '@/lib/appel-backend'

/**
 * REPLAYS A THREAD, SO A RETURNING VISITOR DOES NOT START OVER.
 *
 * The panel keeps its thread token in the browser and asks for the
 * conversation back when it opens. Without this, every reload wiped the
 * history — which the old panel did, and which made the assistant feel like a
 * search box rather than someone you had been talking to.
 *
 * Same reason as the sibling route for going through the server: the backend's
 * CORS list does not carry this domain, and the API's address stays off the
 * client.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''

export async function GET(requete: Request, contexte: { params: Promise<{ fil: string }> }) {
  const { fil } = await contexte.params

  /* An expired or unknown thread is not an error worth surfacing: the token
     simply aged out, and the right behaviour is to open on the greeting. The
     client reads 404 as « start fresh ». */
  if (!API || !fil) return NextResponse.json({ message: 'Conversation introuvable' }, { status: 404 })

  /* THE VISITOR'S ADDRESS TRAVELS WITH THE REPLAY, as it does on the question
     route next door. This route is capped at two reads a second per address,
     and the panel now rereads a thread whenever a question to the team is
     pending and the tab regains focus. Without the header every visitor on the
     site would share the host's single outbound address — one bucket — and a
     handful of returning tabs would starve everyone else's replay.

     FORWARDING THE HEADER WAS NOT ENOUGH ON ITS OWN: the backend trusts one
     proxy hop, so it read the host's address anyway. `entetesVisiteur` adds
     the shared secret that makes the declared visitor address believable. */
  try {
    const reponse = await fetch(`${API}/v1/assistant/fils/${encodeURIComponent(fil)}`, {
      headers: entetesVisiteur(requete),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!reponse.ok) {
      return NextResponse.json({ message: 'Conversation introuvable' }, { status: 404 })
    }
    return NextResponse.json(await reponse.json(), { status: 200 })
  } catch {
    /* Unreachable is indistinguishable from expired as far as the panel is
       concerned: both mean « you have no history to show », and inventing a
       distinction would only add an error message nobody can act on. */
    return NextResponse.json({ message: 'Conversation introuvable' }, { status: 404 })
  }
}
