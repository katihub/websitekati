import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CartLine } from '@/lib/cart'
import { ShopIcon } from '../ShopIcon'
import styles from './checkout.module.css'

export const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
export function CheckoutSteps({ step }: { step: number }) {
  return <ol className={styles.steps} aria-label="Étapes de la commande">{['Panier', 'Livraison', 'Paiement'].map((label, i) => <li key={label} className={i + 1 <= step ? styles.activeStep : ''} aria-current={i + 1 === step ? 'step' : undefined}><span>{i + 1 < step ? <ShopIcon name="check"/> : i + 1}</span><b>{label}</b></li>)}</ol>
}
export function CheckoutHeading({ title, subtitle, step }: { title: string; subtitle: string; step: number }) {
  return <><nav className={styles.breadcrumb} aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span>/</span><Link href="/panier">Panier</Link>{step > 1 ? <><span>/</span><span>{step === 2 ? 'Livraison' : 'Paiement'}</span></> : null}</nav><div className={styles.heading}><div><h1>{title}</h1><p>{subtitle}</p></div><CheckoutSteps step={step}/></div></>
}
export function ProductThumb({ line }: { line: Pick<CartLine, 'image' | 'name'> }) {
  return <div className={styles.thumb}>{line.image ? <Image src={line.image} alt={line.name} fill sizes="120px" className={styles.image}/> : <><ShopIcon name="package"/><small>Photo à venir</small></>}</div>
}
export function TrustStrip() {
  return <div className={styles.trust}><span><ShopIcon name="shield"/><b>Paiement sécurisé<small>Confirmation par le prestataire</small></b></span><span><ShopIcon name="truck"/><b>Livraison par boutique<small>Selon les options du vendeur</small></b></span></div>
}
export function Summary({ total, count, children, deposit, compactLines }: { total: number; count: number; children: ReactNode; deposit?: number; compactLines?: readonly CartLine[] }) {
  return <aside className={styles.summary}><h2><ShopIcon name="cart"/>Récapitulatif de la commande</h2>{compactLines ? <ul className={styles.compactLines}>{compactLines.map(line => <li key={line.offerId ?? line.slug}><ProductThumb line={line}/><div><b>{line.name}</b><small>{line.boutiqueNom} · Qté {line.qty}</small></div><strong>{money(line.price * line.qty)}</strong></li>)}</ul> : null}<dl><div><dt>Sous-total ({count} article{count > 1 ? 's' : ''})</dt><dd>{money(total)}</dd></div><div><dt>Frais de livraison</dt><dd>{deposit === undefined ? 'À la validation' : money(0)}</dd></div></dl>{deposit === undefined ? <p className={styles.note}>Les frais et les prix définitifs sont confirmés dans votre commande.</p> : <p className={styles.note}>Frais enregistrés actuellement par le service : 0 FCFA.</p>}<div className={styles.total}><b>{deposit === undefined ? 'Total produits' : 'Total'}</b><strong>{money(total)}</strong></div>{deposit !== undefined ? <dl className={styles.deposit}><div><dt>Acompte estimé à régler</dt><dd>{money(deposit)}</dd></div><div><dt>Solde produits à la livraison</dt><dd>{money(total - deposit)}</dd></div></dl> : null}{children}</aside>
}
