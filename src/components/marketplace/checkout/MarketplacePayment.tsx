'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ErreurApi } from '@/lib/api'
import { normalisePhone } from '@/lib/account'
import type { MarketplaceOrder } from '@/lib/marketplace-checkout'
import { ShopIcon } from '../ShopIcon'
import { CheckoutHeading, TrustStrip, money } from './CheckoutUi'
import styles from './checkout.module.css'

export function MarketplacePayment({ reference }: { reference: string }) {
  const [order, setOrder] = useState<MarketplaceOrder | null>(null)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState('')
  const [pending, setPending] = useState(false)
  const [transaction, setTransaction] = useState<{ id: string; since: number } | null>(null)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const path = `/marketplace/commandes/${encodeURIComponent(reference)}`
  useEffect(() => {
    const abort = new AbortController()
    void api<MarketplaceOrder>(path, { signal: abort.signal }).then(value => { if (!abort.signal.aborted) { setOrder(value); setError('') } }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof ErreurApi && cause.code === 401 ? 'Connectez-vous avec le compte qui a passé cette commande.' : cause instanceof ErreurApi ? cause.message : 'Impossible de lire la commande. Réessayez.') })
    return () => abort.abort()
  }, [path, retry])
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (!transaction) return
    const abort = new AbortController()
    let timeout: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const value = await api<MarketplaceOrder>(path, { signal: abort.signal })
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
  }, [transaction, path])
  const paid = Boolean(order && order.acompteRecu >= order.acompteDu)
  const closed = Boolean(order && ['annulee', 'refusee', 'close', 'annulation_demandee'].includes(order.statut))
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !order || paid || closed) return
    const normalized = normalisePhone(phone)
    if (!normalized) return setError('Indiquez un numéro camerounais valide commençant par 6.')
    lock.current = true; setPending(true); setError('')
    const abort = new AbortController(); controller.current = abort
    try {
      const result = await api<{ transId: string; montant: number }>('/paiements/fapshi/direct', { methode: 'POST', corps: { reference, telephone: normalized, ...(operator ? { operateur: operator } : {}) }, signal: abort.signal })
      if (!abort.signal.aborted) setTransaction({ id: result.transId, since: Date.now() })
    } catch (cause) {
      if (!abort.signal.aborted) { lock.current = false; setError(cause instanceof ErreurApi && cause.code === 503 ? 'Le service de paiement est momentanément indisponible. Votre commande est enregistrée ; réessayez plus tard.' : cause instanceof ErreurApi ? cause.message : 'La demande n’a pas pu être confirmée. Vérifiez le statut avant de réessayer.') }
    } finally { if (!abort.signal.aborted) setPending(false) }
  }
  return <div className={styles.page}><div className={styles.shell}><CheckoutHeading title={paid ? 'Acompte reçu, merci.' : 'Régler mon acompte'} subtitle={`Commande ${reference} · Le solde et les frais de livraison seront réglés à la livraison.`} step={3}/>{!order ? <section className={styles.panel}>{error ? <><p className={styles.warning} role="alert">{error}</p><button className={styles.primary} onClick={() => setRetry(value => value + 1)}>Réessayer</button></> : <p role="status">Chargement de la commande…</p>}</section> : <div className={styles.layout}><div className={styles.checkoutMain}><section className={styles.panel}><h2><ShopIcon name="shield"/>{paid ? 'Votre acompte est confirmé' : closed ? 'Commande non payable' : 'Orange Money ou MTN Mobile Money'}</h2>{paid ? <><div className={styles.success}><ShopIcon name="check"/><div><b>{money(order.acompteRecu)} reçus</b><p>L’acompte est réglé, mais votre commande n’est pas soldée. Le solde reste dû à la livraison.</p></div></div><Link className={styles.primary} href="/compte/commandes">Mes commandes</Link></> : closed ? <p>Cette commande ne peut plus être réglée en ligne.</p> : transaction ? <div className={styles.info} role="status"><ShopIcon name="phone"/><div><b>Validez la demande sur votre téléphone.</b><p>Ne saisissez jamais votre code secret sur KatiHub. Nous attendons la confirmation du prestataire.</p><small>Transaction : {transaction.id}</small></div></div> : <form className={styles.paymentForm} onSubmit={pay}><p>La commande est enregistrée. Le prestataire vous demandera de valider l’acompte sur votre téléphone.</p><label>Numéro à débiter<input type="tel" required autoComplete="tel" value={phone} placeholder="6 77 12 34 56" onChange={event => setPhone(event.target.value)}/></label><fieldset><legend>Opérateur</legend><div className={styles.operatorChoices}>{[['', 'Automatique'], ['orange money', 'Orange Money'], ['mobile money', 'MTN Mobile Money']].map(([value, label]) => <label key={value}><input type="radio" name="operator" checked={operator === value} onChange={() => setOperator(value)}/>{label}</label>)}</div></fieldset><button className={styles.primary} disabled={pending}>{pending ? 'Demande en cours…' : `Régler l’acompte de ${money(order.acompteDu - order.acompteRecu)}`}<ShopIcon name="arrow"/></button><p className={styles.note}>Aucun montant n’est envoyé par le navigateur : le serveur détermine l’acompte exigible.</p></form>}{error ? <p className={styles.warning} role="alert">{error}</p> : null}<button className={styles.edit} disabled={pending || Boolean(transaction)} onClick={() => setRetry(value => value + 1)}>Actualiser le statut</button></section><section className={styles.panel}><h2><ShopIcon name="bag"/>Vos boutiques</h2>{order.sousCommandes.map(group => <div className={styles.orderGroup} key={group.reference}><b>{group.boutique ? <Link href={`/boutiques/${group.boutique.slug}`}>{group.boutique.nom}</Link> : group.reference}</b><small>{group.reference} · {group.modeLivraison === 'vendeur' ? 'Livraison par le vendeur' : 'Livraison KatiHub'}</small>{group.lignes.map((line, i) => <p key={i}><span>{line.offreTitreCapture} × {line.quantite}</span><strong>{money(line.totalNetFcfa)}</strong></p>)}</div>)}</section><TrustStrip/></div><aside className={styles.summary}><h2>Récapitulatif de la commande</h2><dl><div><dt>Total produits</dt><dd>{money(order.totalFermeTtc)}</dd></div><div><dt>Frais de livraison (payés à la livraison)</dt><dd>{order.fraisLivraison ? money(order.fraisLivraison) : 'Offerts'}</dd></div><div><dt>Acompte reçu</dt><dd>{money(order.acompteRecu)}</dd></div></dl><div className={styles.total}><b>{paid ? 'Acompte réglé' : 'À régler maintenant'}</b><strong>{money(paid ? order.acompteRecu : Math.max(0, order.acompteDu - order.acompteRecu))}</strong></div><div className={styles.depositExplanation}><b>{money(order.resteAPayer)}</b><span>{order.fraisLivraison ? 'Solde restant, frais de livraison compris, réglé à la livraison' : 'Solde restant, réglé à la livraison'}</span></div><p className={styles.note}>Le paiement de l’acompte n’équivaut pas au règlement intégral de la commande.</p></aside></div>}</div></div>
}
