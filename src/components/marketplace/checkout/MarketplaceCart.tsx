'use client'

import Link from 'next/link'
import { imageProduit } from '@/lib/image-produit'
import { useState, useSyncExternalStore } from 'react'
import { cartLineKey, useCart, type CartLine } from '@/lib/cart'
import type { AccueilMarketplace } from '@/lib/marketplace-data'
import { ShopIcon } from '../ShopIcon'
import { CheckoutHeading, ProductThumb, Summary, TrustStrip, money } from './CheckoutUi'
import { useCheckedCart } from './useCheckedCart'
import { BoutonDemandeDevis } from '../devis/BoutonDemandeDevis'
import styles from './checkout.module.css'

const SAVED = 'katihub.articles-mis-de-cote.v1'
const EMPTY = '[]'
const changed = 'katihub:saved-cart'
const subscribe = (callback: () => void) => { window.addEventListener('storage', callback); window.addEventListener(changed, callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener(changed, callback) } }
const read = () => { try { return localStorage.getItem(SAVED) ?? EMPTY } catch { return EMPTY } }
function savedLines(raw: string): CartLine[] { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(line => typeof line.slug === 'string' && typeof line.name === 'string' && Number.isSafeInteger(line.price) && Number.isSafeInteger(line.qty) && line.qty > 0) : [] } catch { return [] } }
function write(lines: CartLine[]) { localStorage.setItem(SAVED, JSON.stringify(lines)); window.dispatchEvent(new Event(changed)) }

export function MarketplaceCart({ catalogue }: { catalogue: AccueilMarketplace }) {
  const cart = useCart()
  const [excluded, setExcluded] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const raw = useSyncExternalStore(subscribe, read, () => EMPTY)
  const saved = savedLines(raw)
  const { checked, loading, error, refresh } = useCheckedCart(cart.lines)
  const selected = cart.lines.filter(line => !excluded.includes(cartLineKey(line)))
  const total = selected.reduce((sum, line) => sum + line.price * line.qty, 0)
  const count = selected.reduce((sum, line) => sum + line.qty, 0)
  const allSelected = selected.length === cart.lines.length && selected.length > 0
  const issues = checked.filter(item => selected.some(line => cartLineKey(line) === cartLineKey(item.line)) && item.issue)
  const selectedShops = new Set(catalogue.boutiques.filter(shop => cart.lines.some(line => line.boutiqueId === shop.id)).map(shop => shop.slug))
  const recommendations = catalogue.offres.filter(offer => selectedShops.has(offer.boutique.slug) && !cart.lines.some(line => line.offerId === offer.id) && offer.disponible > 0 && offer.prixFcfa !== null).slice(0, 5)
  const href = cart.lines.every(line => !line.offerId) && selected.length === cart.lines.length ? '/commande/valider' : `/marketplace/commande?articles=${encodeURIComponent(selected.map(cartLineKey).join(','))}`
  function save(lines: readonly CartLine[]) {
    try { const next = new Map(saved.map(line => [cartLineKey(line), line])); lines.forEach(line => next.set(cartLineKey(line), line)); write([...next.values()]); lines.forEach(line => cart.remove(cartLineKey(line))); setNotice('Articles mis de côté dans ce navigateur.') }
    catch { setNotice('Le navigateur ne permet pas l’enregistrement. Vos articles sont toujours dans le panier.') }
  }
  return <div className={styles.page}><div className={styles.shell}><CheckoutHeading title={`Mon panier (${cart.count} article${cart.count > 1 ? 's' : ''})`} subtitle="Vérifiez vos articles avant de passer la commande." step={1}/>{cart.lines.length ? <div className={styles.layout}><section aria-label="Articles du panier"><div className={styles.toolbar}><label><input type="checkbox" checked={allSelected} onChange={() => setExcluded(allSelected ? cart.lines.map(cartLineKey) : [])}/>Tout sélectionner ({cart.lines.length})</label><div><button disabled={!selected.length} onClick={() => { selected.forEach(line => cart.remove(cartLineKey(line))); setNotice('La sélection a été supprimée du panier.') }}><ShopIcon name="trash"/>Supprimer la sélection</button><button disabled={!selected.length} onClick={() => save(selected)}><ShopIcon name="bookmark"/>Mettre de côté</button></div></div><ul className={styles.cartList}>{cart.lines.map(line => {
    const key = cartLineKey(line)
    const item = checked.find(item => cartLineKey(item.line) === key)
    const live = item?.offer
    return <li key={key} className={`${styles.cartRow} ${excluded.includes(key) ? styles.unselected : ''}`}><input type="checkbox" aria-label={`Sélectionner ${line.name} chez ${line.boutiqueNom ?? 'NowTech'}`} checked={!excluded.includes(key)} onChange={() => setExcluded(values => values.includes(key) ? values.filter(value => value !== key) : [...values, key])}/><ProductThumb line={line}/><div className={styles.rowInfo}><Link href={line.offerId ? `/marketplace/produits/${line.slug}${live ? `?boutique=${live.boutique.slug}` : ''}` : `/produit/${line.slug}`}><h2>{line.name}</h2></Link><p><ShopIcon name="bag"/>{live?.boutique.nom ?? line.boutiqueNom ?? 'NowTech'}</p><small>{loading ? 'Vérification du stock…' : error ? 'Stock non vérifié' : item?.issue ?? `${live?.disponible ?? '—'} disponible(s)`}</small></div><div className={styles.unitPrice}><strong>{money(line.price)}</strong><small>Prix unitaire</small>{live?.prixFcfa !== null && live?.prixFcfa !== undefined && live.prixFcfa !== line.price ? <span className={styles.warning}>Nouveau prix : {money(live.prixFcfa)}</span> : null}</div><div className={styles.quantity} role="group" aria-label={`Quantité de ${line.name}`}><button disabled={line.qty <= 1} aria-label={`Diminuer ${line.name}`} onClick={() => cart.setQty(key, line.qty - 1)}>−</button><output>{line.qty}</output><button disabled={line.qty >= Math.min(live?.disponible ?? 99, 99)} aria-label={`Augmenter ${line.name}`} onClick={() => cart.setQty(key, line.qty + 1)}>+</button></div><strong className={styles.lineTotal}>{money(line.price * line.qty)}</strong><div className={styles.rowActions}><button aria-label={`Supprimer ${line.name} chez ${line.boutiqueNom ?? 'NowTech'}`} onClick={() => cart.remove(key)}><ShopIcon name="trash"/></button><button onClick={() => save([line])}><ShopIcon name="bookmark"/><span>Mettre de côté</span></button></div></li>
  })}</ul><Link className={styles.continueShopping} href="/catalogue">Continuer mes achats<ShopIcon name="arrow"/></Link></section><div className={styles.rightRail}><Summary total={total} count={count}>{error ? <p className={styles.warning} role="alert">{error}<button onClick={refresh}>Réessayer</button></p> : null}{issues.length && !loading ? <p className={styles.warning}>Certains articles nécessitent votre attention avant la commande.</p> : null}<Link className={styles.primary} href={selected.length ? href : '#'} aria-disabled={!selected.length} onClick={event => { if (!selected.length) event.preventDefault() }}>Passer la commande<ShopIcon name="arrow"/></Link><BoutonDemandeDevis className={styles.devis} lignes={selected.filter(line => line.offerId).map(line => ({ offreId: line.offerId!, quantite: line.qty }))} libelle="Demander un devis pour la sélection"/>{selected.some(line => !line.offerId) ? <p className={styles.note}>Les articles NowTech se chiffrent depuis la page Devis NowTech.</p> : null}<div className={styles.paymentNames}><b>Acompte par Mobile Money</b><span>Orange Money</span><span>MTN Mobile Money</span></div></Summary><TrustStrip/></div></div> : <section className={styles.empty}><ShopIcon name="bag"/><h2>Votre panier attend vos trouvailles.</h2><p>Découvrez les produits de nos boutiques locales.</p><Link className={styles.primary} href="/catalogue">Découvrir le catalogue<ShopIcon name="arrow"/></Link></section>}{notice ? <p className={styles.notice} role="status">{notice}</p> : null}{saved.length ? <section className={styles.saved}><h2>Mis de côté ({saved.length})</h2><p>Enregistrés uniquement dans ce navigateur. Prix et stock à revérifier.</p><div>{saved.map(line => <article key={cartLineKey(line)}><ProductThumb line={line}/><b>{line.name}</b><small>{line.boutiqueNom}</small><strong>{money(line.price)}</strong><button onClick={() => { cart.add(line, line.qty); cart.close(); write(saved.filter(item => cartLineKey(item) !== cartLineKey(line))) }}>Remettre au panier</button><button onClick={() => write(saved.filter(item => cartLineKey(item) !== cartLineKey(line)))}>Supprimer</button></article>)}</div></section> : null}{recommendations.length ? <section className={styles.recommendations}><h2>À découvrir chez vos vendeurs</h2><div>{recommendations.map(offer => <Link key={offer.id} href={`/marketplace/produits/${offer.produit.slug}?boutique=${offer.boutique.slug}`}><ProductThumb line={{ name: offer.produit.nom, image: imageProduit(offer.produit)?.url ?? null }}/><b>{offer.titre ?? offer.produit.nom}</b><small>{offer.boutique.nom}</small><strong>{money(offer.prixFcfa!)}</strong><span>Voir le produit<ShopIcon name="arrow"/></span></Link>)}</div></section> : null}</div></div>
}
