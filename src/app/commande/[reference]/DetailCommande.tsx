'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ErreurApi, api, apiDisponible } from '@/lib/api'
import {
  type Commande,
  libellePaiement,
  libelleRemise,
  libelleStatut,
  paiementEnLigneDu,
  receptionConfirmable,
  tonStatut,
  totalAffiche,
} from '@/lib/commandes'
import { formatPrice } from '@/lib/format'
import { lienCommande, resoudreJeton } from '@/lib/suivi'
import { useMarketplaceLanguage } from '@/lib/language'

type Etat =
  | { phase: 'chargement' }
  | { phase: 'refus'; message: string }
  | { phase: 'prete'; commande: Commande; jeton: string | null }

/**
 * `jetonUrl` : la cle d'une commande passee sans compte, lue dans son lien
 * (`?suivi=…`). Sans elle, ce navigateur peut l'avoir gardee a la commande ;
 * sinon, la commande est celle du compte connecte.
 *
 * LA CLE PASSE AVANT LA SESSION. Quelqu'un qui commande sans compte puis se
 * connecte sur le meme appareil n'a pas cette commande dans son compte : la
 * lire par la session repondrait « introuvable ».
 */
export function DetailCommande({ reference, jetonUrl }: { reference: string; jetonUrl?: string }) {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const [etat, setEtat] = useState<Etat>(
    apiDisponible
      ? { phase: 'chargement' }
      : { phase: 'refus', message: en ? 'Order tracking is not available for this shop yet.' : 'Le suivi de commande n’est pas encore ouvert sur cette boutique.' },
  )
  const [confirmation, setConfirmation] = useState<'repos' | 'envoi'>('repos')
  const [erreurAction, setErreurAction] = useState<string | null>(null)
  const [copie, setCopie] = useState(false)

  useEffect(() => {
    if (!apiDisponible) return
    const controleur = new AbortController()
    charger(reference, resoudreJeton(reference, jetonUrl), controleur.signal, en).then((r) => {
      if (!controleur.signal.aborted) setEtat(r)
    })
    return () => controleur.abort()
  }, [reference, jetonUrl, en])

  if (etat.phase === 'chargement') {
    return (
      <p className="text-small text-ink-3" role="status">
        {en ? 'Loading order…' : 'Chargement de la commande…'}
      </p>
    )
  }

  if (etat.phase === 'refus') {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-small text-ink">{etat.message}</p>
        <Link href="/" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">
          {en ? 'Back to the shop' : 'Retour à la boutique'}
        </Link>
      </div>
    )
  }

  const c = etat.commande
  const jeton = etat.jeton
  const total = totalAffiche(c)

  const confirmerReception = async () => {
    if (confirmation === 'envoi') return
    setConfirmation('envoi')
    setErreurAction(null)
    try {
      const maje = await api<Commande>(
        jeton
          ? `/commandes/sans-compte/${encodeURIComponent(reference)}/recu`
          : `/commandes/${encodeURIComponent(reference)}/recu`,
        { methode: 'POST', jetonSuivi: jeton ?? undefined },
      )
      setEtat({ phase: 'prete', commande: maje, jeton })
    } catch (e) {
      setErreurAction(e instanceof ErreurApi ? e.message : 'La confirmation n’a pas pu être enregistrée.')
    } finally {
      setConfirmation('repos')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="t-label text-ink-3">{en ? 'Order' : 'Commande'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-h3 font-semibold tracking-[-0.01em] text-ink">{c.reference}</h1>
          <Pastille ton={tonStatut(c.statut)}>{en ? STATUT_EN[c.statut] ?? c.statut.replaceAll('_', ' ') : libelleStatut(c.statut)}</Pastille>
        </div>
      </header>

      {receptionConfirmable(c) ? (
        <section className="rounded-well border border-secondary bg-secondary p-4">
          <p className="text-small font-semibold text-ink">{en ? 'Have you received your order?' : 'Avez-vous reçu votre commande ?'}</p>
          <p className="mt-1 text-micro text-ink-2">
            {en ? 'Confirm receipt once you have the goods. This confirmation closes your order.' : 'Confirmez la réception une fois la marchandise entre vos mains. C’est cette confirmation qui clôture votre commande.'}
          </p>
          {erreurAction ? (
            <p className="mt-2 text-micro text-warn" role="alert">
              {erreurAction}
            </p>
          ) : null}
          <button
            type="button"
            onClick={confirmerReception}
            disabled={confirmation === 'envoi'}
            className="press fill mt-3 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)] disabled:opacity-60"
          >
            {confirmation === 'envoi' ? (en ? 'Saving…' : 'Enregistrement…') : (en ? 'I received my order' : 'J’ai reçu ma commande')}
          </button>
        </section>
      ) : null}

      {c.confirmeParClient ? (
        <p className="text-small text-ink-2">
          ✓ {en ? 'You confirmed receipt' : 'Vous avez confirmé la réception'}{c.recuLe ? ` ${en ? 'on ' : 'le '}${formatDate(c.recuLe, en)}` : ''}.
        </p>
      ) : null}

      {jeton ? <LienDeSuivi reference={c.reference} jeton={jeton} copie={copie} onCopie={setCopie} en={en} /> : null}

      {paiementEnLigneDu(c) ? (
        <Link
          href={lienCommande(c.reference, jeton, '/paiement')}
          className="press fill inline-flex min-h-11 items-center justify-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)]"
        >
          {en ? 'Pay for my order' : 'Régler ma commande'} — {formatPrice(c.resteAPayer)}
        </Link>
      ) : null}

      <section className="rounded-well border border-rule">
        <ul className="divide-y divide-rule">
          {c.lignes.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-small text-ink">
                <span className="t-num text-ink-3">{l.quantite}×</span> {l.nomCapture}
              </span>
              <span className="t-num shrink-0 text-small text-ink-2">
                {formatPrice(l.prixCapture * l.quantite)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-rule px-4 py-3">
          <span className="text-small text-ink-2">{en ? 'Total' : 'Total'}</span>
          <span className="t-num text-h4 font-semibold text-ink">{formatPrice(total)}</span>
        </div>
        {c.resteAPayer > 0 ? (
          <p className="border-t border-rule px-4 py-2 text-micro text-ink-3">
            {en ? 'Remaining balance: ' : 'Reste à payer : '}<span className="t-num">{formatPrice(c.resteAPayer)}</span>
          </p>
        ) : (
          <p className="border-t border-rule px-4 py-2 text-micro text-ink-3">{en ? 'Paid.' : 'Réglée.'}</p>
        )}
      </section>

      <section className="grid gap-3 text-small sm:grid-cols-2">
        <Info label={en ? 'Delivery' : 'Remise'}>{en ? MODE_EN[c.modeRemise] ?? c.modeRemise : libelleRemise(c.modeRemise)}</Info>
        <Info label={en ? 'Payment' : 'Paiement'}>{en ? PAYMENT_EN[c.modePaiementSouhaite] ?? c.modePaiementSouhaite : libellePaiement(c.modePaiementSouhaite)}</Info>
        {c.modeRemise === 'retrait' ? (
          <Info label={en ? 'Pickup point' : 'Comptoir'}>{c.comptoir ?? '—'}</Info>
        ) : (
          <Info label={en ? 'Address' : 'Adresse'}>
            {[c.adresseFigee?.ville, c.adresseFigee?.quartier, c.adresseFigee?.repere]
              .filter(Boolean)
              .join(', ') || '—'}
          </Info>
        )}
        {c.livreur ? (
          <Info label={en ? 'Courier' : 'Livreur'}>
            {c.livreur.nom}
            {c.livreur.telephone ? ` · ${c.livreur.telephone}` : ''}
          </Info>
        ) : null}
        <Info label={en ? 'Placed on' : 'Passée le'}>{formatDate(c.creeLe, en)}</Info>
      </section>

      {jeton ? (
        <Link href="/" className="text-micro text-secondary underline underline-offset-2">
          ← {en ? 'Back to the shop' : 'Retour à la boutique'}
        </Link>
      ) : (
        <Link href="/compte/commandes" className="text-micro text-secondary underline underline-offset-2">
          ← {en ? 'All my orders' : 'Toutes mes commandes'}
        </Link>
      )}
    </div>
  )
}

/**
 * LA CLE DE LA COMMANDE, MONTREE A CELUI QUI N'A PAS DE COMPTE.
 *
 * Sans compte, ce lien est le seul chemin de retour vers la commande : pour la
 * payer, la suivre, dire qu'elle est arrivee. Le courriel le garde a qui en a
 * laisse un ; les autres doivent pouvoir le copier, ou se l'envoyer.
 */
function LienDeSuivi({
  reference,
  jeton,
  copie,
  onCopie,
  en,
}: {
  reference: string
  jeton: string
  copie: boolean
  onCopie: (copie: boolean) => void
  en: boolean
}) {
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${lienCommande(reference, jeton)}`)
      onCopie(true)
    } catch {
      onCopie(false)
    }
  }
  return (
    <section className="rounded-well border border-rule bg-space p-4">
      <p className="text-small font-semibold text-ink">{en ? 'Keep this page link' : 'Gardez le lien de cette page'}</p>
      <p className="mt-1 text-micro leading-[1.6] text-ink-2">
        {en ? 'You placed this order without an account. This link is the key to paying for it, tracking it, and confirming delivery from any phone.' : 'Vous avez commandé sans compte : ce lien est la clé de votre commande. Il sert à la payer, à la suivre et à confirmer sa réception, depuis n’importe quel téléphone.'}
      </p>
      <button
        type="button"
        onClick={copier}
        className="press mt-3 inline-flex min-h-10 items-center rounded-control border border-rule px-4 text-micro font-semibold text-ink hover:border-ink hover:text-secondary"
      >
        {copie ? (en ? 'Link copied ✓' : 'Lien copié ✓') : (en ? 'Copy link' : 'Copier le lien')}
      </button>
    </section>
  )
}

async function charger(reference: string, jeton: string | null, signal: AbortSignal, en: boolean): Promise<Etat> {
  try {
    const commande = await api<Commande>(
      jeton
        ? `/commandes/sans-compte/${encodeURIComponent(reference)}`
        : `/commandes/${encodeURIComponent(reference)}`,
      { signal, jetonSuivi: jeton ?? undefined },
    )
    return { phase: 'prete', commande, jeton }
  } catch (erreur) {
    if (signal.aborted) return { phase: 'chargement' }
    const code = erreur instanceof ErreurApi ? erreur.code : 0
    return {
      phase: 'refus',
      message:
        code === 401
          ? (en ? 'Sign in with the account used to place this order to track it.' : 'Connectez-vous avec le compte qui a passé cette commande pour la suivre.')
          : code === 404 && jeton
            ? (en ? 'This link does not open an order. Check that it is complete, or contact us with the reference.' : 'Ce lien n’ouvre aucune commande. Vérifiez qu’il est complet, ou appelez-nous avec la référence.')
            : code === 404
            ? (en ? 'This order could not be found, or belongs to another account.' : 'Cette commande est introuvable, ou elle appartient à un autre compte.')
            : erreur instanceof ErreurApi
              ? erreur.message
              : (en ? 'The order could not be loaded. Check your connection.' : 'La commande n’a pas pu être chargée. Vérifiez votre connexion.'),
    }
  }
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-well border border-rule bg-space px-4 py-3">
      <p className="t-label text-ink-3">{label}</p>
      <p className="mt-0.5 text-ink">{children}</p>
    </div>
  )
}

function Pastille({
  ton,
  children,
}: {
  ton: 'neutre' | 'progres' | 'succes' | 'alerte'
  children: React.ReactNode
}) {
  const couleur = {
    neutre: 'border-rule text-ink-2',
    progres: 'border-secondary text-ink',
    succes: 'border-primary text-primary',
    alerte: 'border-warn bg-warn text-on-surface',
  }[ton]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-micro font-semibold ${couleur}`}>
      {children}
    </span>
  )
}

function formatDate(iso: string, en = false): string {
  try {
    return new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { dateStyle: 'long' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const STATUT_EN: Record<string, string> = { soumise: 'Submitted', confirmee: 'Confirmed', refusee: 'Declined', en_preparation: 'Preparing', prete_au_retrait: 'Ready for pickup', en_remise: 'Out for delivery', retour_ouvert: 'Return opened', annulation_demandee: 'Cancellation requested', annulee: 'Cancelled', close: 'Completed' }
const MODE_EN: Record<string, string> = { retrait: 'Store pickup', domicile: 'Home delivery', agence: 'Agency shipping', point_relais: 'Pickup point' }
const PAYMENT_EN: Record<string, string> = { espece: 'Cash', mobile_money: 'Mobile Money', carte: 'Card', mixte: 'Split payment', a_la_livraison: 'Cash on delivery' }
