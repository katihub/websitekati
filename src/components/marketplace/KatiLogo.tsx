import Image from 'next/image'
import Link from 'next/link'
import styles from './marketplace-shell-v2.module.css'

export function KatiLogo({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" className={`${styles.logo} ${footer ? styles.logoFooter : ''}`} aria-label="KatiMarket, accueil">
      {footer ? (
        <Image
          src="/brand/katimarket-logo.webp"
          alt=""
          width={960}
          height={960}
          sizes="148px"
          className={styles.logoArtwork}
        />
      ) : (
        <>
          <span className={styles.logoMark} aria-hidden="true">
            <Image src="/brand/katimarket-mark.png" alt="" fill sizes="54px" priority />
          </span>
          <span className={styles.logoText}>
            <strong>KATI<span>MARKET</span></strong>
            <small>VOS BOUTIQUES LOCALES</small>
          </span>
        </>
      )}
    </Link>
  )
}
