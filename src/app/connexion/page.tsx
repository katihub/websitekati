import type { Metadata } from 'next'
import Image from 'next/image'
import { CustomerLoginForm } from '@/components/marketplace/CustomerLoginForm'
import styles from '@/app/inscription/signup.module.css'

export const metadata: Metadata = { title: 'Connexion client' }

export default function ConnexionPage() {
  return <div className={styles.page}>
    <CustomerLoginForm />
    <div className={styles.photo}><Image src="/connexion-client-marche-douala.png" alt="Une cliente reçoit ses achats dans un commerce à Douala" fill priority sizes="(max-width: 850px) 100vw, 42vw" /></div>
  </div>
}
