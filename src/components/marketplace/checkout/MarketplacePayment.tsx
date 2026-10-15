'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ErreurApi } from '@/lib/api'
import { normalisePhone } from '@/lib/account'
import type { MarketplaceOrder } from '@/lib/marketplace-checkout'
import { LIBELLE_MODE } from '@/lib/modes-livraison'
import { useJetonSuivi } from '@/lib/suivi'
import { ShopIcon } from '../ShopIcon'
import { CheckoutHeading, TrustStrip, money } from './CheckoutUi'
import styles from './checkout.module.css'

/** `jetonUrl` : le lien d'une commande sans compte ; il ouvre la commande a la place de la session. */
export function MarketplacePayment({ reference, jetonUrl }: { reference: string; jetonUrl?: string }) {
  // Le jeton du lien, ou celui garde par ce navigateur ; `undefined` tant qu'il n'est pas resolu.
  const jeton = useJetonSuivi(reference, jetonUrl)
  const [order, setOrder] = useState<MarketplaceOrder | null>(null)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState('')
  const [pending, setPending] = useState(false)
  const [transaction, setTransaction] = useState<{ id: string; since: number } | null>(null)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const path = jeton ? `/marketplace/commandes/sans-compte/${encodeURIComponent(reference)}` : `/marketplace/commandes/${encodeURIComponent(reference)}`
  const acces = jeton ? { jetonSuivi: jeton } : {}
  const suivi = `/marketplace/commande/${encodeURIComponent(reference)}/suivi${jeton ? `?suivi=${encodeURIComponent(jeton)}` : ''}`
  useEffect(() => {
    if (jeton === undefined) return
    const abort = new AbortController()
    void api<MarketplaceOrder>(path, { signal: abort.signal, ...(jeton ? { jetonSuivi: jeton } : {}) }).then(value => { if (!abort.signal.aborted) { setOrder(value); setError('') } }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof ErreurApi && cause.code === 401 ? 'Connectez-vous avec le compte qui a passé cette commande.' : cause instanceof ErreurApi ? cause.message : 'Impossible de lire la commande. Réessayez.') })
    return () => abort.abort()
  }, [path, retry, jeton])
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (!transaction) return
    const abort = new AbortController()
    let timeout: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const value = await api<MarketplaceOrder>(path, { signal: abort.signal, ...(jeton ? { jetonSuivi: jeton } : {}) })
        if (abort.signal.aborted) return
        setOrder(value)
        if (value.acompteRecu >= value.acompteDu) { setTransaction(null); lock.current = false; return }
      } catch { /* A failed read is not a failed payment. */ }
      if (abort.signal.aborted) return
      if (Date.now() - transaction!.since > 180000) { setTransaction(null); lock.current = false; setError('La confirmation prend du temps. Vérifiez le statut avant de relancer un paiement.'); return }
      timeout = setTimeout(poll, 4000)
    }
    timeout = setTimeout(poll, 4000)
    return () => { clearTimeout(timeout); abort.abort() }
  }, [transaction, path, jeton])
  const paid = Boolean(order && order.acompteRecu >= order.acompteDu)
  const complet = order?.modePaiementMarketplace === 'complet'
  // Une commande dont les KATI couvrent l'acompte est confirmee sans paiement en ligne.
  const parKati = Boolean(order && order.acompteDu === 0 && (order.remiseKatiFcfa ?? 0) > 0)
  const closed = Boolean(order && ['annulee', 'refusee', 'close', 'annulation_demandee'].includes(order.statut))
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !order || paid || closed) return
    const normalized = normalisePhone(phone)
    if (!normalized) return setError('Indiquez un numéro camerounais valide commençant par 6.')
    lock.current = true; setPending(true); setError('')
    const abort = new AbortController(); controller.current = abort
    try {
      const result = await api<{ transId: string; montant: number }>(jeton ? '/paiements/fapshi/sans-compte/direct' : '/paiements/fapshi/direct', { methode: 'POST', corps: { reference, telephone: normalized, ...(operator ? { operateur: operator } : {}) }, signal: abort.signal, ...acces })
      if (!abort.signal.aborted) setTransaction({ id: result.transId, since: Date.now() })
    } catch (cause) {
      if (!abort.signal.aborted) { lock.current = false; setError(cause instanceof ErreurApi && cause.code === 503 ? 'Le service de paiement est momentanément indisponible. Votre commande est enregistrée ; réessayez plus tard.' : cause instanceof ErreurApi ? cause.message : 'La demande n’a pas pu être confirmée. Vérifiez le statut avant de réessayer.') }
    } finally { if (!abort.signal.aborted) setPending(false) }
  }
  return <div className={styles.page}><div className={styles.shell}><CheckoutHeading title={paid ? (parKati ? 'Commande confirmée, merci.' : complet ? 'Paiement reçu, merci.' : 'Acompte reçu, merci.') : complet ? 'Régler ma commande' : 'Régler mon acompte'} subtitle={complet ? `Commande ${reference} · Tout se règle maintenant : rien à payer au livreur.` : `Commande ${reference} · Le solde et les frais de livraison seront réglés à la livraison.`} step={3}/>{!order ? <section className={styles.panel}>{error ? <><p className={styles.warning} role="alert">{error}</p><button className={styles.primary} onClick={() => setRetry(value => value + 1)}>Réessayer</button></> : <p role="status">Chargement de la commande…</p>}</section> : <div className={styles.layout}><div className={styles.checkoutMain}><section className={styles.panel}><h2><ShopIcon name="shield"/>{paid ? (parKati ? 'Votre acompte est réglé en KATI' : complet ? 'Votre paiement est confirmé' : 'Votre acompte est confirmé') : closed ? 'Commande non payable' : 'Orange Money ou MTN Mobile Money'}</h2>{paid ? <><div className={styles.success}><ShopIcon name="check"/><div><b data-testid="paiement-recu">{parKati ? `${money(order.remiseKatiFcfa ?? 0)} payés en KATI` : `${money(order.acompteRecu)} reçus`}</b><p>{order.resteAPayer > 0 ? 'Votre commande est confirmée. Le solde reste dû à la livraison.' : 'Votre commande est entièrement réglée : rien à payer au livreur.'}</p></div></div>{jeton ? <><Link className={styles.primary} href={suivi}>Suivre ma commande</Link><p className={styles.note} data-testid="arguments-compte">Gardez le lien reçu par e-mail : il ouvre votre commande. Avec un compte KatiHub, vous gagnez des KATI sur vos prochaines commandes et vous les suivez toutes au même endroit.</p></> : <Link className={styles.primary} href="/compte/commandes">Mes commandes</Link>}</> : closed ? <p>Cette commande ne peut plus être réglée en ligne.</p> : transaction ? <div className={styles.info} role="status"><ShopIcon name="phone"/><div><b>Validez la demande sur votre téléphone.</b><p>Ne saisissez jamais votre code secret sur KatiHub. Nous attendons la confirmation du prestataire.</p><small>Transaction : {transaction.id}</small></div></div> : <form className={styles.paymentForm} onSubmit={pay}><p>La commande est enregistrée. Le prestataire vous demandera de valider le paiement sur votre téléphone.</p><label>Numéro à débiter<input type="tel" required autoComplete="tel" value={phone} placeholder="6 77 12 34 56" onChange={event => setPhone(event.target.value)}/></label><fieldset><legend>Opérateur</legend><div className={styles.operatorChoices}>{[['', 'Automatique'], ['orange money', 'Orange Money'], ['mobile money', 'MTN Mobile Money']].map(([value, label]) => <label key={value}><input type="radio" name="operator" checked={operator === value} onChange={() => setOperator(value)}/>{label}</label>)}</div></fieldset><button className={styles.primary} disabled={pending}>{pending ? 'Demande en cours…' : `${complet ? 'Payer' : 'Régler l’acompte de'} ${money(order.acompteDu - order.acompteRecu)}`}<ShopIcon name="arrow"/></button><p className={styles.note}>Aucun montant n’est envoyé par le navigateur : le serveur détermine l’acompte exigible.</p></form>}{error ? <p className={styles.warning} role="alert">{error}</p> : null}<button className={styles.edit} disabled={pending || Boolean(transaction)} onClick={() => setRetry(value => value + 1)}>Actualiser le statut</button></section><section className={styles.panel}><h2><ShopIcon name="bag"/>Vos boutiques</h2>{order.sousCommandes.map(group => <div className={styles.orderGroup} key={group.reference}><b>{group.boutique ? <Link href={`/boutiques/${group.boutique.slug}`}>{group.boutique.nom}</Link> : group.reference}</b><small>{group.reference} · {LIBELLE_MODE[group.modeLivraison] ?? group.modeLivraison}{group.noteAgence ? ` · ${group.noteAgence}` : ''}</small>{group.lignes.map((line, i) => <p key={i}><span>{line.offreTitreCapture} × {line.quantite}</span><strong>{money(line.totalNetFcfa)}</strong></p>)}</div>)}</section><TrustStrip/></div><aside className={styles.summary}><h2>Récapitulatif de la commande</h2><dl><div><dt>Total produits</dt><dd>{money(order.totalFermeTtc)}</dd></div><div><dt>Frais de livraison ({complet ? 'payés en ligne' : 'payés à la livraison'})</dt><dd>{order.fraisLivraison ? money(order.fraisLivraison) : 'Offerts'}</dd></div>{order.assuranceFcfa ? <div><dt>Assurance KATI</dt><dd>{money(order.assuranceFcfa)}</dd></div> : null}{order.installationFcfa ? <div><dt>Installation</dt><dd>{money(order.installationFcfa)}</dd></div> : null}{order.remiseKatiFcfa ? <div><dt>Payé en KATI</dt><dd>−{money(order.remiseKatiFcfa)}</dd></div> : null}<div><dt>{complet ? 'Paiement reçu' : 'Acompte reçu'}</dt><dd>{money(order.acompteRecu)}</dd></div></dl><div className={styles.total}><b>{paid ? (complet ? 'Réglé' : 'Acompte réglé') : 'À régler maintenant'}</b><strong>{money(paid ? order.acompteRecu : Math.max(0, order.acompteDu - order.acompteRecu))}</strong></div>{complet ? null : <><div className={styles.depositExplanation}><b>{money(order.resteAPayer)}</b><span>{order.fraisLivraison ? 'Solde restant, frais de livraison compris, réglé à la livraison' : 'Solde restant, réglé à la livraison'}</span></div><p className={styles.note}>Le paiement de l’acompte n’équivaut pas au règlement intégral de la commande.</p></>}</aside></div>}</div></div>
}
