import Link from 'next/link'
import type { ReactNode } from 'react'
import { CartButton } from '@/components/layout/CartButton'
import { lireCategoriesMarketplace } from '@/lib/marketplace-data'
import { KatiLogo } from './KatiLogo'
import { CaptureParrainage } from './kati/CaptureParrainage'
import styles from './marketplace-shell-v2.module.css'

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
}

/** Le menu suit l'arbre des categories tenu par KatiHub : les six premieres, dans leur ordre. */
export async function KatiHeader() {
  const categories = (await lireCategoriesMarketplace()).slice(0, 6)
  return (
    <header className={styles.header} data-marketplace-header>
      <CaptureParrainage />
      <div className={styles.topbar} data-marketplace-topbar><div className={styles.shell}>
        <span>▣ Livraison rapide partout au Cameroun</span><span>◇ Paiement sécurisé</span><span>◉ Une équipe à votre écoute 24/7</span>
        <em>En toute confiance !</em>
        <Link href="/connexion">Se connecter</Link><Link href="/inscription">Créer un compte</Link>
      </div></div>
      <div className={`${styles.shell} ${styles.mainbar}`}>
        <KatiLogo />
        <form action="/recherche" className={styles.search} data-marketplace-search>
          <label htmlFor="katihub-search" className="sr-only">Rechercher</label>
          <input id="katihub-search" name="q" placeholder="Rechercher un produit, une boutique…" />
          <button type="submit" aria-label="Lancer la recherche">⌕</button>
        </form>
        <div className={styles.actions} data-marketplace-actions>
          <Link href="/connexion" className={styles.actionLien} aria-label="Connexion"><Icon><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></Icon><span>Connexion</span></Link>
          <Link href="/espace-vendeur" className={styles.actionLien} aria-label="Compte marchand"><Icon><path d="M3 9.5 4.5 4h15L21 9.5M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M4.5 12.5V20h15v-7.5M9.5 20v-4.5h5V20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></Icon><span>Compte marchand</span></Link>
          <CartButton href="/panier" />
        </div>
      </div>
      <nav className={styles.nav} aria-label="Catégories principales" data-marketplace-nav><div className={styles.shell}>
        <Link href="/categories" className={styles.allCategories}>▦ Toutes les catégories</Link>
        {categories.map((categorie) => <Link key={categorie.id} href={`/categories/${categorie.slug}`}>{categorie.nom}</Link>)}
        <Link href="/boutiques">Boutiques</Link><Link href="/devenir-vendeur">Vendre sur KatiHub</Link>
      </div></nav>
    </header>
  )
}
