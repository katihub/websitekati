import type { Metadata } from 'next'
import Link from 'next/link'
import { SellerSignupForm } from '@/components/marketplace/SellerSignupForm'
import styles from './seller.module.css'

export const metadata: Metadata = { title: 'Devenir vendeur' }

export default function DevenirVendeurPage() {
  return (
    <div className={styles.page}>
      <div className={styles.heading}><h1>Devenir vendeur sur KatiHub</h1><p>Présentez-nous votre activité. Nous vous aiderons à préparer votre boutique au Cameroun. Déjà inscrit ? <Link href="/connexion-vendeur">Se connecter</Link></p></div>
      <SellerSignupForm />
    </div>
  )
}
