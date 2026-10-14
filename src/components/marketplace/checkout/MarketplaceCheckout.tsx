'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api, ErreurApi } from '@/lib/api'
import { cartLineKey, useCart } from '@/lib/cart'
import { useSession } from '@/lib/session'
import { avecRetour, useIci } from '@/lib/retour'
import { useAccount, normalisePhone } from '@/lib/account'
import { checkedTotal, commonCities, estimatedDeposit, groupDeliveries, type DeliveryMode, type MarketplaceOrder } from '@/lib/marketplace-checkout'
import { ShopIcon } from '../ShopIcon'
import { CheckoutHeading, Summary, TrustStrip, money } from './CheckoutUi'
import { useCheckedCart } from './useCheckedCart'
import { fraisBoutique, useTarifsLivraison } from './useTarifsLivraison'
import styles from './checkout.module.css'

export function MarketplaceCheckout({ selectedKeys }: { selectedKeys: string[] | null }) {
  const cart = useCart()
  const { session, chargement } = useSession()
  const account = useAccount()
  const router = useRouter()
  const ici = useIci()
  const lines = cart.lines.filter(line => selectedKeys === null || selectedKeys.includes(cartLineKey(line)))
  const { checked, loading, error: serviceError, refresh } = useCheckedCart(lines)
  const groups = groupDeliveries(checked)
  const cities = commonCities(checked)
  const total = checkedTotal(checked)
  const deposit = estimatedDeposit(total)
  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  const [address, setAddress] = useState({ ville: '', quartier: '', repere: '', telephoneDestinataire: '' })
  const [modes, setModes] = useState<Record<string, DeliveryMode>>({})
  const [step, setStep] = useState(2)
  const [terms, setTerms] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<{ body: string; key: string } | null>(null)
  const lock = useRef(false)
  const signature = JSON.stringify(lines.map(line => [cartLineKey(line), line.qty, checked.find(item => item.line === line)?.offer?.prixFcfa]))
  const [reviewed, setReviewed] = useState('')
  const effectiveStep = reviewed === signature ? step : 2
  const city = cities.includes(address.ville) ? address.ville : cities[0] ?? ''
  const limitsExceeded = lines.length > 50 || groups.length > 20
  const blockedSansFrais = loading || Boolean(serviceError) || !lines.length || checked.some(item => item.issue) || !cities.length || groups.some(group => !group.modes.length) || !Number.isSafeInteger(total) || limitsExceeded
  const { tarifs, erreur: tarifsErreur, recharger: rechargerTarifs } = useTarifsLivraison()
  const groupTotal = (group: typeof groups[number]) => group.lines.reduce((sum, item) => sum + (item.offer?.prixFcfa ?? item.line.price) * item.line.qty, 0)
  const feeFor = (group: typeof groups[number], mode: DeliveryMode) => tarifs ? fraisBoutique(tarifs, city, mode, groupTotal(group)) : null
  // Le mode retenu : celui choisi s'il est livrable dans la ville, sinon le premier qui l'est.
  function deliveryMode(group: typeof groups[number]) {
    const offerts = group.modes.filter(mode => feeFor(group, mode) !== null)
    return offerts.includes(modes[group.id]) ? modes[group.id] : offerts[0] ?? group.modes[0]
  }
  const groupFees = groups.map(group => feeFor(group, deliveryMode(group)))
  const fees = tarifs && city && groupFees.every(fee => fee !== null) ? groupFees.reduce<number>((sum, fee) => sum + (fee ?? 0), 0) : null
  const blocked = blockedSansFrais || fees === null
  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (blocked) return setError('Vérifiez les articles et les options de livraison avant de continuer.')
    if (address.quartier.trim().length < 2 || address.repere.trim().length < 3) return setError('Indiquez un quartier et un repère suffisamment précis pour la livraison.')
    if (!normalisePhone(address.telephoneDestinataire)) return setError('Indiquez un numéro camerounais valide, commençant par 6.')
    setReviewed(signature); setTerms(false); setStep(3)
  }
  async function submit() {
    if (lock.current || blocked || effectiveStep !== 3 || !session || !terms) return
    lock.current = true; setPending(true); setError('')
    const body = {
      lignes: lines.map(line => ({ offreId: line.offerId, quantite: line.qty })),
      livraisons: groups.map(group => ({ boutiqueId: group.id, mode: deliveryMode(group) })),
      adresse: { ...address, ville: city, quartier: address.quartier.trim(), repere: address.repere.trim(), telephoneDestinataire: normalisePhone(address.telephoneDestinataire)! },
      totalAttenduFcfa: total,
      fraisLivraisonAttendusFcfa: fees ?? undefined,
    }
    const serialized = JSON.stringify(body)
    // Retry an identical body with the same key even after a network timeout.
    if (!request.current || request.current.body !== serialized) request.current = { body: serialized, key: crypto.randomUUID() }
    try {
      const order = await api<MarketplaceOrder>('/marketplace/commandes', { methode: 'POST', corps: body, cleIdempotence: request.current.key })
      if (!order || typeof order.reference !== 'string' || !order.reference) throw new Error('Réponse de commande illisible')
      cart.consume(lines)
      router.push(`/marketplace/commande/${encodeURIComponent(order.reference)}/paiement`)
    } catch (cause) {
      setError(cause instanceof ErreurApi ? cause.code === 401 ? 'Votre session a expiré. Reconnectez-vous pour continuer.' : cause.message : 'La réponse n’a pas été reçue. Réessayez : une même demande ne créera pas deux commandes.')
      if (cause instanceof ErreurApi && cause.code === 409) { refresh(); void rechargerTarifs(); setStep(2) }
      lock.current = false; setPending(false)
    }
  }
  if (!lines.length) return <div className={styles.page}><div className={styles.shell}><CheckoutHeading title="Passer ma commande" subtitle="Livraison et paiement de vos achats." step={2}/><section className={styles.empty}><ShopIcon name="bag"/><h2>Aucun article sélectionné.</h2><Link className={styles.primary} href="/panier">Revenir au panier</Link></section></div></div>
  const compact = checked.map(item => ({ ...item.line, price: item.offer?.prixFcfa ?? item.line.price }))
  return <div className={styles.page}><div className={styles.shell}><CheckoutHeading title="Passer ma commande" subtitle={effectiveStep === 2 ? 'Renseignez votre adresse, puis choisissez la livraison pour chaque boutique.' : 'Vérifiez votre commande avant de régler l’acompte.'} step={effectiveStep}/><div className={styles.layout}><div className={styles.checkoutMain}>{!chargement && !session ? <section className={styles.accountPrompt}><ShopIcon name="shield"/><div><b>Un compte client est nécessaire pour commander.</b><p>Votre sélection reste enregistrée pendant votre connexion.</p><button onClick={account.open}>Se connecter</button><Link href={avecRetour('/inscription', ici)}>Créer un compte</Link></div></section> : null}{effectiveStep === 2 ? <form id="marketplace-delivery" onSubmit={advance}><section className={styles.panel}><h2><ShopIcon name="pin"/>Adresse de livraison</h2><p>Le quartier et le repère aident le livreur à vous trouver.</p><div className={styles.fields}><label>Ville<select required value={city} disabled={!cities.length || loading} onChange={event => setAddress({ ...address, ville: event.target.value })}>{cities.length ? cities.map(value => <option key={value}>{value}</option>) : <option value="">Aucune ville commune</option>}</select></label><label>Quartier<input required minLength={2} maxLength={80} value={address.quartier} autoComplete="address-level3" placeholder="Ex. Akwa, Bonamoussadi…" onChange={event => setAddress({ ...address, quartier: event.target.value })}/></label><label>Repère<input required minLength={3} maxLength={240} value={address.repere} placeholder="Ex. face à la pharmacie…" onChange={event => setAddress({ ...address, repere: event.target.value })}/></label><label>Téléphone du destinataire<input required type="tel" autoComplete="tel" maxLength={20} value={address.telephoneDestinataire} placeholder="6 77 12 34 56" onChange={event => setAddress({ ...address, telephoneDestinataire: event.target.value })}/></label></div></section><section className={styles.panel}><h2><ShopIcon name="truck"/>Livraison par boutique</h2><p>Chaque boutique prépare ses articles séparément.</p>{loading ? <p role="status">Vérification des prix, du stock et des livraisons…</p> : null}{!loading && !serviceError ? groups.map(group => <div className={styles.deliveryGroup} key={group.id}><div><span className={styles.shopMonogram}>{group.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span><b>{group.name}</b><small>{group.lines.reduce((sum, item) => sum + item.line.qty, 0)} article(s)</small></div><fieldset><legend>Mode de livraison</legend>{group.modes.length ? group.modes.map(mode => { const fee = feeFor(group, mode); return <label key={mode} data-unavailable={fee === null}><input type="radio" name={`delivery-${group.id}`} disabled={fee === null} checked={deliveryMode(group) === mode} onChange={() => setModes({ ...modes, [group.id]: mode })}/><span>{mode === 'vendeur' ? 'Livraison par le vendeur' : 'Livraison KatiHub'} · <b data-testid={`frais-${group.id}-${mode}`}>{!tarifs ? '…' : fee === null ? `non proposée à ${city}` : fee ? money(fee) : 'offerte'}</b><small>{group.lines.every(item => item.offer?.delaiMaxJours) ? `Délai annoncé : jusqu’à ${Math.max(...group.lines.map(item => item.offer!.delaiMaxJours!))} jours.` : 'Délai à confirmer avec la boutique.'}</small></span></label> }) : <p className={styles.warning}>Aucun mode commun pour ces articles.</p>}{tarifs && city && group.modes.length && group.modes.every(mode => feeFor(group, mode) === null) ? <p className={styles.warning}>La livraison de cette boutique n’est pas encore proposée à {city}.</p> : null}</fieldset></div>) : null}{!loading && !cities.length && !serviceError ? <p className={styles.warning}>Ces articles n’ont pas de ville de livraison commune. Revenez au panier pour commander les boutiques séparément.</p> : null}<div className={styles.info}><ShopIcon name="info"/>Seules les villes et options disponibles pour tous les articles sont proposées.</div></section></form> : <><section className={styles.panel}><h2><ShopIcon name="pin"/>Votre livraison</h2><button className={styles.edit} disabled={pending} onClick={() => setStep(2)}>Modifier</button><p><b>{city} · {address.quartier}</b><br/>{address.repere}<br/>{address.telephoneDestinataire}</p>{groups.map((group, index) => <p key={group.id}>{group.name} : {deliveryMode(group) === 'vendeur' ? 'livraison par le vendeur' : 'livraison KatiHub'}{typeof groupFees[index] === 'number' ? ` · ${groupFees[index] ? money(groupFees[index]!) : 'offerte'}` : ''}</p>)}</section><section className={styles.panel}><h2><ShopIcon name="shield"/>Paiement de l’acompte</h2><p>Vous réglerez l’acompte par Orange Money ou MTN Mobile Money après l’enregistrement de la commande.</p><div className={styles.depositExplanation}><b>{money(deposit)}</b><span>Acompte estimé : 10 % des produits, minimum 1 000 FCFA, sans dépasser le total.</span></div><p>Le solde, soit {money(total - deposit + (fees ?? 0))}{fees ? ` dont ${money(fees)} de frais de livraison` : ''}, reste dû à la livraison. Aucun paiement n’est lancé par ce bouton.</p><label className={styles.terms}><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)}/><span>J’ai vérifié ma commande et j’accepte les <Link href="/conditions-generales-vente">conditions de vente</Link>.</span></label></section></>}{(!loading && !serviceError ? checked.filter(item => item.issue) : []).map(item => <p role="alert" className={styles.warning} key={cartLineKey(item.line)}>{item.line.name} : {item.issue}</p>)}{limitsExceeded ? <p className={styles.warning} role="alert">Une commande est limitée à 50 articles distincts et 20 boutiques. Réduisez votre sélection dans le panier.</p> : null}{serviceError ? <p role="alert" className={styles.warning}>{serviceError}<button onClick={refresh}>Réessayer</button></p> : null}{tarifsErreur ? <p role="alert" className={styles.warning}>{tarifsErreur}<button onClick={() => void rechargerTarifs()}>Réessayer</button></p> : null}{error ? <p role="alert" className={styles.warning}>{error}</p> : null}<TrustStrip/><Link className={styles.continueShopping} href="/panier">Retour au panier</Link></div><Summary total={total} count={count} deposit={deposit} compactLines={compact} fees={fees}>{effectiveStep === 2 ? <button form="marketplace-delivery" className={styles.primary} disabled={blocked}>Continuer vers le paiement<ShopIcon name="arrow"/></button> : <button className={styles.primary} onClick={submit} disabled={pending || blocked || !session || !terms}>{pending ? 'Enregistrement…' : 'Confirmer ma commande'}<ShopIcon name="arrow"/></button>}<p className={styles.note}><ShopIcon name="info"/>Les prix et le stock sont revérifiés par le serveur à la validation.</p></Summary></div></div></div>
}
