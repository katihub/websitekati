import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CartLine } from '@/lib/cart'
import { ShopIcon } from '../ShopIcon'
import { GainKati } from '../kati/GainKati'
import type { EstimationReglement } from '@/lib/reglement'
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
export function Summary({ total, count, children, deposit, compactLines, fees, reglement, completImpose }: { total: number; count: number; children: ReactNode; deposit?: number; compactLines?: readonly CartLine[]; fees?: number | null; reglement?: EstimationReglement; completImpose?: boolean }) {
  return <aside className={styles.summary}><h2><ShopIcon name="cart"/>Récapitulatif de la commande</h2>{compactLines ? <ul className={styles.compactLines}>{compactLines.map(line => <li key={line.offerId ?? line.slug}><ProductThumb line={line}/><div><b>{line.name}</b><small>{line.boutiqueNom} · Qté {line.qty}</small></div><strong>{money(line.price * line.qty)}</strong></li>)}</ul> : null}<dl><div><dt>Sous-total ({count} article{count > 1 ? 's' : ''})</dt><dd>{money(total)}</dd></div><div><dt>Frais de livraison</dt><dd data-testid="frais-livraison">{typeof fees === 'number' ? (fees ? money(fees) : 'Offerts') : 'Selon le quartier'}</dd></div></dl>{typeof fees === 'number' ? <p className={styles.note}>{completImpose ? 'Les frais d’agence sont inclus dans le paiement complet de la commande.' : 'Les frais de livraison se paient à la livraison, avec le solde : ils ne sont pas compris dans l’acompte.'}</p> : <p className={styles.note}>Les frais de livraison dépendent du quartier et du mode choisis.</p>}{reglement && reglement.assuranceFcfa + reglement.installationFcfa + reglement.remiseKatiFcfa > 0 ? <dl data-testid="recap-options">{reglement.assuranceFcfa ? <div><dt>Assurance KATI</dt><dd>{money(reglement.assuranceFcfa)}</dd></div> : null}{reglement.installationFcfa ? <div><dt>Installation</dt><dd>{money(reglement.installationFcfa)}</dd></div> : null}{reglement.remiseKatiFcfa ? <div><dt>Payé en KATI</dt><dd>−{money(reglement.remiseKatiFcfa)}</dd></div> : null}</dl> : null}<div className={styles.total}><b>{typeof fees === 'number' ? 'Total' : 'Total produits'}</b><strong>{money(total + (fees ?? 0) + (reglement ? reglement.assuranceFcfa + reglement.installationFcfa - reglement.remiseKatiFcfa : 0))}</strong></div><GainKati montantFcfa={total - (reglement?.remiseKatiFcfa ?? 0)} className={styles.note}/>{reglement ? <dl className={styles.deposit}><div><dt>À payer maintenant</dt><dd data-testid="recap-maintenant">{money(reglement.aPayerMaintenantFcfa)}</dd></div><div><dt>À la livraison</dt><dd data-testid="recap-livraison">{money(reglement.aPayerLivraisonFcfa)}</dd></div></dl> : deposit !== undefined ? <dl className={styles.deposit}><div><dt>Acompte estimé à régler</dt><dd>{money(deposit)}</dd></div><div><dt>Solde à la livraison{fees ? ' (frais compris)' : ''}</dt><dd>{money(total - deposit + (fees ?? 0))}</dd></div></dl> : null}{children}</aside>
}
