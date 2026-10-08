'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { useAccount } from '@/lib/account'
import { shopWhatsapp, whatsappHref } from '@/lib/comptoirs'

/**
 * PAYER SA COMMANDE DEPUIS SON TELEPHONE.
 *
 * WHY A PUSH AND NOT A LINK. Fapshi offers both. `initiate-pay` returns a URL:
 * the customer leaves the shop, picks their operator on a page that is not
 * ours, and comes back — the shape of a European checkout. `direct-pay` makes
 * their handset ring where they already are, and they enter their code without
 * leaving anything. In Cameroon mobile money happens on the phone, not in a
 * browser tab, and the second shape is the one people know.
 *
 * THE AMOUNT IS NEVER SENT. It is read from the order by the backend. This
 * component does not know how to say « pay 45 000 » — it can only say « pay
 * order CM-KPP69N », and the shop decides what that costs. A price that
 * travels through a browser is a proposal, not a fact.
 *
 * WHAT IT DOES NOT PRETEND. A successful request means the prompt LEFT, never
 * that anything was paid: the customer may walk away, mistype their code, or
 * have no balance. What settles an order is Fapshi's callback to the backend,
 * and the only honest thing this screen can do is watch the order until the
 * shop says it is paid.
 */

/** How long to keep watching before saying so plainly. */
const ATTENTE_MAX_MS = 180_000
/** Between two checks. Fapshi rate-limits status lookups, and so should we. */
const INTERVALLE_MS = 4_000

type Etat =
  | { phase: 'saisie' }
  | { phase: 'envoi' }
  | { phase: 'attente'; transId: string; depuis: number }
  | { phase: 'paye' }
  | { phase: 'echec'; message: string }

interface Commande {
  reference: string
  resteAPayer: number
  statutPaiement?: string
}

/**
 * CE QUE LE CLIENT LIT QUAND CA NE MARCHE PAS.
 *
 * LE MESSAGE DU BACKEND N'EST PAS TOUJOURS ECRIT POUR LUI. Certains le sont —
 * « Le numéro doit être un numéro camerounais à neuf chiffres » dit quoi
 * faire. D'autres traversent depuis plus loin : « ThrottlerException: Too
 * Many Requests » vient du limiteur de debit, « 500,000 XAF is the maximum
 * amount that can be paid » vient de Fapshi, en anglais. Une campagne de test
 * les a vus s'afficher tels quels sur cette page, et c'est exactement ce
 * qu'un client ne doit jamais lire : ca ressemble a une panne, et ca n'explique
 * rien.
 *
 * Le code HTTP et quelques motifs suffisent a reconnaitre chaque cas et a le
 * dire en francais, avec ce que la personne peut faire ensuite.
 */
function expliquer(erreur: unknown): string {
  if (!(erreur instanceof ErreurApi)) {
    return 'Le paiement n’a pas pu être lancé. Vérifiez votre connexion et réessayez.'
  }

  const brut = erreur.message ?? ''

  if (erreur.code === 429 || /too many/i.test(brut)) {
    return 'Une demande vient déjà d’être envoyée. Attendez quelques secondes avant d’en refaire une.'
  }
  if (erreur.code === 401) {
    return 'Votre session a expiré. Reconnectez-vous pour régler cette commande.'
  }
  if (erreur.code === 403) {
    return 'Vous ne pouvez pas régler cette commande depuis ce compte.'
  }
  if (erreur.code === 404) {
    return 'Cette commande est introuvable, ou elle appartient à un autre compte.'
  }
  if (erreur.code === 503) {
    return 'Le service de paiement ne répond pas pour le moment. Réessayez dans quelques minutes, ou réglez au comptoir.'
  }

  /* Le plafond par transaction de la passerelle. Le montant maximal varie
     selon l'operateur et le compte ; on le lit dans le message plutot que de
     le fixer ici, et on dit quoi faire : payer en plusieurs fois, ou au
     comptoir. */
  const plafond = /([\d\s,.]+)\s*XAF is the maximum/i.exec(brut)
  if (plafond?.[1]) {
    return (
      `Le paiement mobile est limité à ${plafond[1].trim().replace(/,/g, ' ')} XAF par opération. ` +
      'Pour cette commande, réglez en plusieurs fois ou au comptoir.'
    )
  }
  if (/valid MTN or Orange/i.test(brut)) {
    return 'Ce numéro n’est pas reconnu par MTN ni Orange. Vérifiez-le et réessayez.'
  }
  if (/insufficient|solde/i.test(brut)) {
    return 'Le solde de ce compte mobile est insuffisant pour cette commande.'
  }

  /* Un message en francais, ecrit par le backend pour la personne devant
     l'ecran, passe tel quel. Un message en anglais, ou vide, ne passe pas :
     il vient d'une couche qui ne lui parlait pas. */
  const enFrancais = /[àâçéèêëîïôûùüÿœ]|\b(le|la|les|un|une|des|ne|pas|est|votre|cette)\b/i.test(brut)
  if (erreur.code === 400 && enFrancais) return brut

  return 'Le paiement n’a pas pu être lancé. Vérifiez le numéro et réessayez, ou appelez-nous.'
}

/**
 * `jeton` : la cle d'une commande passee sans compte. Avec elle, la commande se
 * relit et se paie par les routes sans compte, sans session.
 */
export function PaiementMobile({ commande, jeton = null }: { commande: Commande; jeton?: string | null }) {
  const whatsapp = shopWhatsapp(useAccount().pointsVente)
  const [telephone, setTelephone] = useState('')
  const [operateur, setOperateur] = useState<'' | 'mobile money' | 'orange money'>('')
  const [etat, setEtat] = useState<Etat>(
    commande.resteAPayer <= 0 ? { phase: 'paye' } : { phase: 'saisie' },
  )
  const [reste, setReste] = useState(commande.resteAPayer)
  const vivant = useRef(true)

  useEffect(() => () => {
    vivant.current = false
  }, [])

  /**
   * WATCHES THE ORDER, NOT THE GATEWAY.
   *
   * Fapshi exposes a status lookup, and using it from here would be the
   * obvious move — and the wrong one. It is rate-limited to six calls a
   * minute, it would need the API keys in the browser, and above all it
   * answers a different question: whether the GATEWAY thinks it collected,
   * not whether the SHOP considers the order settled. Only the callback
   * closes an order, so only the order can be believed.
   */
  useEffect(() => {
    if (etat.phase !== 'attente') return

    const debut = etat.depuis
    const minuteur = setInterval(async () => {
      if (!vivant.current) return

      if (Date.now() - debut > ATTENTE_MAX_MS) {
        clearInterval(minuteur)
        setEtat({
          phase: 'echec',
          message:
            'Je n’ai pas reçu la confirmation du paiement. Si vous avez validé sur votre ' +
            'téléphone, elle peut encore arriver — sinon, réessayez ou appelez-nous.',
        })
        return
      }

      try {
        const fraiche = await api<Commande>(
          jeton
            ? `/commandes/sans-compte/${encodeURIComponent(commande.reference)}`
            : `/commandes/${encodeURIComponent(commande.reference)}`,
          { jetonSuivi: jeton ?? undefined },
        )
        if (!vivant.current) return
        setReste(fraiche.resteAPayer)
        if (fraiche.resteAPayer <= 0) {
          clearInterval(minuteur)
          setEtat({ phase: 'paye' })
        }
      } catch {
        /* A failed check is not a failed payment: the network hiccuped, or the
           session is being refreshed. Turning that into an error message would
           tell the customer their money is lost when it is not. */
      }
    }, INTERVALLE_MS)

    return () => clearInterval(minuteur)
  }, [etat, commande.reference, jeton])

  const payer = useCallback(async () => {
    if (etat.phase === 'envoi' || etat.phase === 'attente') return
    setEtat({ phase: 'envoi' })

    try {
      const reponse = await api<{ transId: string; montant: number }>(
        jeton ? '/paiements/fapshi/sans-compte/direct' : '/paiements/fapshi/direct',
        {
          methode: 'POST',
          corps: {
            reference: commande.reference,
            telephone,
            ...(operateur ? { operateur } : {}),
          },
          jetonSuivi: jeton ?? undefined,
        },
      )
      setEtat({ phase: 'attente', transId: reponse.transId, depuis: Date.now() })
    } catch (erreur) {
      setEtat({ phase: 'echec', message: expliquer(erreur) })
    }
  }, [etat.phase, commande.reference, telephone, operateur, jeton])

  if (!apiDisponible) {
    return (
      <p className="rounded-well border border-rule bg-space p-4 text-small text-ink-2">
        Le paiement en ligne n’est pas encore ouvert sur cette boutique. Appelez-nous, ou
        réglez au comptoir.
      </p>
    )
  }

  if (etat.phase === 'paye') {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-body font-semibold text-ink">Paiement reçu, merci.</p>
        <p className="mt-1 text-small text-ink-2">
          La commande {commande.reference} est soldée. Vous recevrez la suite par téléphone.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <span className="text-small text-ink-2">Reste à payer</span>
        <span className="t-num text-h4 font-semibold text-ink">{formatPrice(reste)}</span>
      </div>

      {etat.phase === 'attente' ? (
        <div className="rounded-well border border-rule bg-space p-4">
          <p className="text-body font-semibold text-ink">
            Composez votre code sur le {telephone}
          </p>
          <p className="mt-1 text-small text-ink-2">
            Une demande de paiement vient d’être envoyée sur ce téléphone. Cette page se met à
            jour toute seule dès que le règlement nous parvient — ne la fermez pas.
          </p>
          {/* Naming the transaction is not decoration: it is what the counter
              asks for when a customer calls to say the money left. */}
          <p className="t-label mt-3 text-ink-3">Transaction {etat.transId}</p>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            payer()
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="paiement-telephone" className="flex flex-col gap-1.5">
            <span className="t-label text-ink-2">Numéro à débiter</span>
            <input
              id="paiement-telephone"
              name="telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
              placeholder="+237 6 70 00 00 00"
              /* Every written form is accepted: the backend strips the country
                 code and the separators before validating. Refusing
                 « +237 670 00 00 00 » because it is not nine bare digits would
                 be a refusal of form, and nobody calls back to report one. */
              className="field min-h-12 rounded-control border border-rule px-3 text-[1rem] outline-none placeholder:text-ink-3"
            />
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="t-label text-ink-2">Opérateur</legend>
            <div className="flex flex-wrap gap-2">
              {([
                ['', 'Détecter automatiquement'],
                ['mobile money', 'MTN Mobile Money'],
                ['orange money', 'Orange Money'],
              ] as const).map(([valeur, libelle]) => (
                <button
                  key={valeur || 'auto'}
                  type="button"
                  onClick={() => setOperateur(valeur)}
                  aria-pressed={operateur === valeur}
                  className={`press min-h-11 rounded-pill border px-3.5 text-micro transition-colors duration-[var(--t-fast)] ${
                    operateur === valeur
                      ? 'border-secondary bg-secondary text-on-surface'
                      : 'border-rule text-ink-2 hover:bg-space'
                  }`}
                >
                  {libelle}
                </button>
              ))}
            </div>
            <p className="t-label text-ink-3">
              Laissez sur automatique : le préfixe du numéro suffit à choisir.
            </p>
          </fieldset>

          {etat.phase === 'echec' ? (
            <div className="rounded-well border border-warn bg-paper p-3">
              <p className="text-small text-ink">{etat.message}</p>
              {whatsapp ? (
                <a
                  href={whatsappHref(
                    whatsapp,
                    `Bonjour, j'ai un souci de paiement sur la commande ${commande.reference}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-micro text-secondary underline underline-offset-2"
                >
                  Nous écrire sur WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={etat.phase === 'envoi' || telephone.trim().length < 9}
            className="press min-h-12 rounded-control bg-secondary text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary hover:text-on-surface disabled:pointer-events-none disabled:opacity-30"
          >
            {etat.phase === 'envoi' ? 'Envoi de la demande…' : `Payer ${formatPrice(reste)}`}
          </button>

          {/* SAYING WHAT HAPPENS NEXT, BEFORE IT HAPPENS. A prompt arriving on
              your phone with no warning looks like a scam, and the customer
              declines it. */}
          <p className="t-label text-ink-3">
            Votre téléphone sonnera dans quelques secondes. Composez votre code secret pour
            valider — rien n’est débité avant.
          </p>
        </form>
      )}
    </div>
  )
}
