'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

import { useAccount } from '@/lib/account'

/**
 * The one door into the quote, and what it is honestly allowed to check.
 *
 * WHAT WAS ASKED AND WHAT THIS DOES. The shop asked that a customer cannot reach
 * the quote without a connected account, named as "Google auth ou email". The
 * gate is built; the sign-in method is not, and it cannot be from this codebase.
 * Google means an identity provider, a client secret, a redirect URI and a server
 * route to receive the callback, and this storefront has no server that writes,
 * no environment file and no session cookie. An e-mail sign-in means sending a
 * message, which nothing here sends: `lib/account.tsx` documents an e-mail field
 * being REMOVED for that reason, since it collected a real address against a
 * service that does not exist. Drawing either button would put a lock on a door
 * with no wall behind it, which is worse than no door.
 *
 * So the gate checks the thing this shop actually needs and actually has: the
 * customer file. Three facts, name, WhatsApp number and counter, held in this
 * browser. That is not authentication and the interface never says it is, but as
 * a CONDITION it is the right one, because those three facts are exactly what
 * the quote cannot be produced without. A proforma addressed to nobody, sent to
 * no number, collected from no counter is not a document.
 *
 * THE INTENT SURVIVES THE DIALOG. A customer who presses "Commander maintenant"
 * has asked for two things at once: to be known, and to go to the quote. Opening
 * the card and then leaving them on the product page would make them press the
 * same button twice and would read as the first press having failed. So the wish
 * is recorded, and the moment a file exists the navigation happens by itself.
 *
 * IT IS A REF AND NOT STATE, on purpose. Nothing about this is rendered: the
 * component looks identical whether or not someone is mid-intent, so putting it
 * in state would buy a re-render of the product page for no pixel. The effect
 * only ever reads it.
 */
export function useCheckoutGate(): { go: () => void; ready: boolean } {
  const { account, openPourDevis } = useAccount()
  const router = useRouter()
  const wanted = useRef(false)

  useEffect(() => {
    if (!wanted.current || !account) return
    wanted.current = false
    router.push('/devis')
  }, [account, router])

  const go = useCallback(() => {
    if (account) {
      router.push('/devis')
      return
    }
    wanted.current = true
    openPourDevis()
  }, [account, openPourDevis, router])

  return { go, ready: account !== null }
}
