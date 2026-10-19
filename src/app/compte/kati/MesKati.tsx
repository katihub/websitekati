'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { CarteParrainage } from '@/components/marketplace/kati/CarteParrainage'
import { useAccount } from '@/lib/account'
import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { imageProduit } from '@/lib/image-produit'
import { formatKati, katiPourMontant, usePolitiqueKati, type HistoriqueKati, type OperationKati, type PortefeuilleKati } from '@/lib/kati'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import { productCardSpecs } from '@/lib/product-card-specs'
import styles from './kati.module.css'
import { TransfertKati } from './TransfertKati'

type Etat = { phase: 'chargement' } | { phase: 'connexion' } | { phase: 'refus'; message: string } | { phase: 'prete'; portefeuille: PortefeuilleKati; historique: HistoriqueKati }

const fcfa = (montant: number) => `${new Intl.NumberFormat('fr-FR').format(montant)} FCFA`
const date = (valeur: string) => new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(valeur))
const LIBELLES: Record<OperationKati['type'], string> = {
  attribution: 'Gain en attente', liberation: 'Disponible', reservation: 'Réservé pour une commande', utilisation: 'Utilisé',
  annulation: 'Repris', expiration: 'Expiré', correction: 'Correction KatiHub', transfert: 'Transfert', ajustement: 'Ajustement KatiHub', restitution: 'KATI restitués',
}

function variation(operation: OperationKati) {
  if (operation.type === 'liberation') return { points: operation.disponible, signe: '' }
  const points = operation.disponible + operation.enAttente + operation.reserve
  return { points, signe: points > 0 ? '+' : points < 0 ? '−' : '' }
}

function Icon({ name }: { name: 'user' | 'cart' | 'coins' | 'gift' | 'shield' | 'shop' | 'truck' | 'arrow' }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6"/></>,
    cart: <><path d="M3 4h2l2 10h10l2-7H6"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></>,
    coins: <><ellipse cx="12" cy="6" rx="6" ry="3"/><path d="M6 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></>,
    gift: <><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-4 0-5-1.2-5-2.5S8 2 9.5 3C11 4 12 7 12 7Zm0 0c4 0 5-1.2 5-2.5S16 2 14.5 3C13 4 12 7 12 7Z"/></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-5"/>,
    shop: <><path d="M4 9v11h16V9M3 9l2-5h14l2 5"/><path d="M3 9c0 2 3 2 4.5 0 1.5 2 4.5 2 6 0 1.5 2 4.5 2 6 0M9 20v-6h6v6"/></>,
    truck: <><path d="M3 5h11v11H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    arrow: <path d="m9 5 7 7-7 7"/>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Steps() {
  const steps = [
    { icon: 'cart' as const, title: 'Achetez', text: 'Commandez auprès de vos boutiques préférées.' },
    { icon: 'coins' as const, title: 'Cumulez', text: 'Recevez des KATI après chaque livraison.' },
    { icon: 'gift' as const, title: 'Économisez', text: 'Payez une partie de vos prochains achats.' },
  ]
  return <ol className={styles.steps} aria-label="Comment fonctionnent les KATI">{steps.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>{index + 1}</span><span className={styles.stepIcon}><Icon name={step.icon}/></span><span><b>{step.title}</b><small>{step.text}</small></span>{index < steps.length - 1 ? <Icon name="arrow"/> : null}</li>)}</ol>
}

function KatiCoin() {
  return <div className={styles.coinScene} aria-hidden="true"><span className={`${styles.spark} ${styles.sparkOne}`}>✦</span><span className={`${styles.spark} ${styles.sparkTwo}`}>✦</span><span className={`${styles.miniCoin} ${styles.miniOne}`}>K</span><span className={`${styles.miniCoin} ${styles.miniTwo}`}>K</span><span className={styles.orbit}/><span className={styles.coin}>K</span><span className={styles.pedestal}/></div>
}

function LoggedOutHero({ onLogin, conversion, error }: { onLogin: () => void; conversion: string | null; error?: string }) {
  return <><section className={styles.hero} aria-labelledby="kati-title"><div className={styles.heroCopy}><h1 id="kati-title">Vos achats vous <strong>récompensent</strong></h1><p>Chaque commande livrée sur KatiHub vous fait gagner des KATI. Cumulez des points et économisez sur vos prochains achats.</p>{conversion ? <span className={styles.conversion}>{conversion}</span> : null}{error ? <p className={styles.heroError} role="alert">{error}</p> : null}<button type="button" onClick={onLogin} className={styles.loginButton}><Icon name="user"/><span>Se connecter</span><Icon name="arrow"/></button><small>pour voir votre solde et suivre vos gains</small></div><KatiCoin/><div className={styles.heroSteps}><Steps/></div></section><div className={styles.mobileSteps}><Steps/></div></>
}

function WalletHero({ wallet }: { wallet: PortefeuilleKati }) {
  return <section className={`${styles.hero} ${styles.walletHero}`} aria-labelledby="kati-title"><div className={styles.heroCopy}><p className={styles.walletLabel}>Votre solde disponible</p><h1 id="kati-title">{formatKati(wallet.disponible)}</h1><p>Une économie de <strong>{fcfa(wallet.valeurFcfa.disponible)}</strong> à utiliser sur vos prochains achats.</p><Link href="/catalogue" className={styles.loginButton}><Icon name="cart"/><span>Utiliser mes KATI</span><Icon name="arrow"/></Link></div><KatiCoin/><dl className={styles.walletStats}><div><dt>En attente</dt><dd>{formatKati(wallet.enAttente)}</dd><small>{fcfa(wallet.valeurFcfa.enAttente)} après validation</small></div><div><dt>Réservés</dt><dd>{formatKati(wallet.reserve)}</dd><small>Liés à vos commandes en cours</small></div></dl></section>
}

function ProductRecommendations({ offers }: { offers: readonly OffreMarketplace[] }) {
  const politique = usePolitiqueKati()
  if (!offers.length) return null
  return <section className={styles.recommendations} aria-labelledby="kati-products-title"><header><div><h2 id="kati-products-title">Gagnez des KATI sur ces produits</h2><p>Une sélection disponible qui récompense votre prochain achat livré.</p></div><Link href="/catalogue">Voir tous les produits <Icon name="arrow"/></Link></header><div className={styles.productRail}>{offers.slice(0, 6).map((offer, index) => {
    const image = imageProduit(offer.produit)
    const specs = productCardSpecs(offer, 2)
    const gain = politique && offer.prixFcfa ? katiPourMontant(offer.prixFcfa, politique.gainClientBps, politique.katiParFcfa) : null
    const href = `/marketplace/produits/${offer.produit.slug}?boutique=${encodeURIComponent(offer.boutique.slug)}`
    return <article className={styles.productCard} style={{ '--delay': `${index * 65}ms` } as React.CSSProperties} key={offer.id}><Link href={href} className={styles.productImage}>{image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width: 700px) 72vw, 280px" priority={index === 0}/> : <span>{offer.produit.marque ?? offer.produit.categorie ?? 'KatiHub'}</span>}</Link><div className={styles.productContent}><small><Icon name="shop"/>{offer.boutique.nom}</small><h3><Link href={href}>{offer.titre ?? offer.produit.nom}</Link></h3>{specs.length ? <ul>{specs.map(spec => <li key={spec}>{spec}</li>)}</ul> : null}<strong>{offer.prixFcfa === null ? 'Prix sur demande' : fcfa(offer.prixFcfa)}</strong><Link href={href} className={styles.katiGain}><span>K</span>{gain ? `+ ${formatKati(gain)}` : 'Gagnez des KATI'}<Icon name="arrow"/></Link></div></article>
  })}</div></section>
}

function Reassurance() {
  const items = [{ icon: 'shield' as const, title: 'Paiement sécurisé', text: 'Vos transactions sont protégées.' }, { icon: 'shop' as const, title: 'Boutiques locales', text: 'Des vendeurs proches de chez vous.' }, { icon: 'truck' as const, title: 'KATI après livraison', text: 'Vos points sont validés après réception.' }]
  return <section className={styles.reassurance} aria-label="Les garanties KatiHub">{items.map(item => <div key={item.title}><span><Icon name={item.icon}/></span><p><b>{item.title}</b><small>{item.text}</small></p></div>)}</section>
}

export function MesKati({ recommendations }: { recommendations: readonly OffreMarketplace[] }) {
  const { open: ouvrirCompte } = useAccount()
  const politique = usePolitiqueKati()
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })
  const [suite, setSuite] = useState(false)

  useEffect(() => {
    if (!apiDisponible) return
    const controleur = new AbortController()
    Promise.all([api<PortefeuilleKati>('/marketplace/kati/moi', { signal: controleur.signal }), api<HistoriqueKati>('/marketplace/kati/moi/historique', { signal: controleur.signal })]).then(([portefeuille, historique]) => { if (!controleur.signal.aborted) setEtat({ phase: 'prete', portefeuille, historique }) }).catch((e: unknown) => { if (controleur.signal.aborted) return; setEtat(e instanceof ErreurApi && e.code === 401 ? { phase: 'connexion' } : { phase: 'refus', message: e instanceof ErreurApi ? e.message : 'Vos KATI n’ont pas pu être chargés.' }) })
    return () => controleur.abort()
  }, [])

  async function rafraichir() {
    const [portefeuille, historique] = await Promise.all([api<PortefeuilleKati>('/marketplace/kati/moi'), api<HistoriqueKati>('/marketplace/kati/moi/historique')])
    setEtat({ phase: 'prete', portefeuille, historique })
  }

  async function plus() {
    if (etat.phase !== 'prete') return
    setSuite(true)
    try { const page = await api<HistoriqueKati>(`/marketplace/kati/moi/historique?page=${etat.historique.page + 1}`); setEtat({ ...etat, historique: { ...page, elements: [...etat.historique.elements, ...page.elements] } }) } finally { setSuite(false) }
  }

  const conversion = politique ? `${new Intl.NumberFormat('fr-FR').format(politique.katiParFcfa)} KATI = 1 FCFA` : null
  const connected = etat.phase === 'prete'
  return <div className={styles.content}>
    {etat.phase === 'chargement' ? <section className={`${styles.hero} ${styles.loadingHero}`} role="status" aria-label="Chargement de vos KATI"><div/><div/><div/></section> : connected ? <WalletHero wallet={etat.portefeuille}/> : <LoggedOutHero onLogin={ouvrirCompte} conversion={conversion} error={etat.phase === 'refus' ? etat.message : undefined}/>} 
    {connected ? <section className={styles.accountDetails}>{!etat.portefeuille.courrielVerifie ? <p className={styles.policy}><strong>Adresse e-mail à confirmer.</strong> Vos achats continuent normalement et vos KATI restent en attente jusqu’à la confirmation.</p> : null}{politique ? <p className={styles.policy}>Chaque commande livrée vous rapporte <strong>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(politique.gainClientBps / 100)} %</strong> de son montant{politique.expirationGainsMois ? `, et les points restent valables ${politique.expirationGainsMois} mois` : ''}.</p> : null}{etat.portefeuille.gainsEnAttente.length ? <section className={styles.listSection} aria-labelledby="kati-attente-titre"><h2 id="kati-attente-titre">Bientôt disponibles</h2><ul>{etat.portefeuille.gainsEnAttente.map(gain => <li key={gain.id}><span>{gain.commission ? 'Commission de parrainage' : gain.commande ? `Commande ${gain.commande}` : gain.libelle}{gain.disponibleLe ? <small>{etat.portefeuille.courrielVerifie ? `Disponible le ${date(gain.disponibleLe)}` : 'En attente de confirmation de votre adresse e-mail'}</small> : null}</span><b>{formatKati(gain.points)}</b></li>)}</ul></section> : null}</section> : null}
    <ProductRecommendations offers={recommendations}/><Reassurance/>
    {connected ? <div className={styles.lowerGrid}><div className={styles.katiActions}><TransfertKati disponible={etat.portefeuille.disponible} onTransfert={rafraichir}/><CarteParrainage/></div><section className={styles.listSection} aria-labelledby="kati-historique-titre"><h2 id="kati-historique-titre">Historique</h2>{etat.historique.elements.length ? <ul data-testid="kati-historique">{etat.historique.elements.map(operation => { const { points, signe } = variation(operation); return <li key={operation.id}><span><b>{LIBELLES[operation.type]}{operation.commission ? ' · parrainage' : ''}</b><small>{date(operation.creeLe)}{operation.commande ? ` · ${operation.commande}` : ''} · {operation.libelle}</small></span><strong data-negative={points < 0}>{signe}{formatKati(Math.abs(points))}</strong></li> })}</ul> : <div className={styles.emptyHistory}><p>Votre première commande livrée fera apparaître vos gains ici.</p><Link href="/catalogue">Découvrir le catalogue</Link></div>}{etat.historique.elements.length < etat.historique.total ? <button type="button" disabled={suite} onClick={() => void plus()}>{suite ? 'Chargement…' : 'Voir plus'}</button> : null}</section></div> : null}
  </div>
}
