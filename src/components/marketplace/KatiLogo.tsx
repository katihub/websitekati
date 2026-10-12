import Link from 'next/link'
import Image from 'next/image'
import styles from './marketplace-shell-v2.module.css'

export function KatiLogo({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" className={`${styles.logo} ${footer ? styles.logoFooter : ''}`} aria-label="KatiHub, accueil">
      <span className={styles.logoMark}><Image src="/katihub-logo-official.png" alt="" fill sizes="64px" priority={!footer} /></span>
      <span className={styles.logoText}>
        <strong>KATI<span>HUB</span></strong>
        <small>UN SEUL HUB POUR TOUT</small>
      </span>
    </Link>
  )
}
