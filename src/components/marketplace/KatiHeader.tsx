import Link from 'next/link'
import { CartButton } from '@/components/layout/CartButton'
import { lireCategoriesMarketplace } from '@/lib/marketplace-data'
import { ActionsCompte, LiensBarreHaut } from './KatiHeaderCompte'
import { KatiLogo } from './KatiLogo'
import { CaptureParrainage } from './kati/CaptureParrainage'
import styles from './marketplace-shell-v2.module.css'

/** Le menu suit l'arbre des categories tenu par KatiHub : les six premieres, dans leur ordre. */
export async function KatiHeader() {
  const categories = (await lireCategoriesMarketplace()).slice(0, 6)
  return (
    <header className={styles.header} data-marketplace-header>
      <CaptureParrainage />
      <div className={styles.topbar} data-marketplace-topbar><div className={styles.shell}>
        <span>▣ Livraison rapide partout au Cameroun</span><span>◇ Paiement sécurisé</span><span>◉ Une équipe à votre écoute 24/7</span>
        <em>En toute confiance !</em>
        <LiensBarreHaut />
      </div></div>
      <div className={`${styles.shell} ${styles.mainbar}`}>
        <KatiLogo />
        <form action="/recherche" className={styles.search} data-marketplace-search>
          <label htmlFor="katihub-search" className="sr-only">Rechercher</label>
          <input id="katihub-search" name="q" placeholder="Rechercher un produit, une boutique…" />
          <button type="submit" aria-label="Lancer la recherche">⌕</button>
        </form>
        <div className={styles.actions} data-marketplace-actions>
          <ActionsCompte />
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
