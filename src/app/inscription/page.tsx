import type { Metadata } from 'next'
import Image from 'next/image'
import { CustomerSignupForm } from '@/components/marketplace/CustomerSignupForm'
import styles from './signup.module.css'

export const metadata: Metadata = { title: 'Créer mon compte client' }

export default function InscriptionPage() {
  return <div className={styles.page}>
    <CustomerSignupForm />
    <div className={styles.photo}><Image src="/compte-client-marche-douala.png" alt="Une cliente choisit des produits frais au marché à Douala" fill priority sizes="(max-width: 850px) 100vw, 42vw" /></div>
  </div>
}
