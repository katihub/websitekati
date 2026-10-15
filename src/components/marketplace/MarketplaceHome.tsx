import Image from 'next/image'
import Link from 'next/link'
import { getBanners } from '@/lib/banners'
import { lireAccueilMarketplace, lireCategoriesMarketplace, lireOffresMarketplace } from '@/lib/marketplace-data'
import { MarketplaceAvantages } from './MarketplaceAvantages'
import { MarketplaceHeroCarousel } from './MarketplaceHeroCarousel'
import { ProductCard } from './ProductCardAccueil'
import { PubAccueil } from './PubAccueil'
import { RayonsAccueil, type RayonAccueil } from './RayonsAccueil'
import styles from './marketplace-home-v2.module.css'

const CATEGORIES = [
  ['▯', 'Électronique'], ['♙', 'Mode & Style'], ['⌂', 'Maison & Décoration'], ['✿', 'Beauté & Santé'], ['◉', 'Sports & Loisirs'], ['▱', 'Auto & Moto'], ['♧', 'Jardinage'], ['♙', 'Enfants & Jouets'], ['⌁', 'Alimentation'], ['▦', 'High-Tech'], ['⌕', 'Bricolage & Outillage'], ['▦', 'Plus de catégories'],
] as const
const POPULAR = [['📱', 'Smartphones'], ['💻', 'Ordinateurs'], ['👗', 'Mode & Vêtements'], ['🛋️', 'Maison & Décoration'], ['🧴', 'Beauté & Soins'], ['🏋️', 'Sports & Fitness'], ['🧸', 'Enfants & Jouets'], ['🍳', 'Électroménager']]
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

function SectionHead({ title, href, label = 'Voir tout' }: { title: string; href: string; label?: string }) {
  return <header className={styles.sectionHead}><h2>{title}</h2><Link href={href}>{label}<span>→</span></Link></header>
}

export async function MarketplaceHome() {
  const [{ boutiques, offres }, bannieres, categories, comptes] = await Promise.all([
    lireAccueilMarketplace(), getBanners(), lireCategoriesMarketplace(), lireOffresMarketplace({ taille: 1 }),
  ])
  // Les rayons, du mieux fourni au moins fourni ; la section s'ouvre sur le premier.
  const nombres = new Map((comptes.facettes?.categories ?? []).map((c) => [c.nom, c.nombre]))
  const rayons: RayonAccueil[] = categories
    .map((c) => ({ nom: c.nom, slug: c.slug, nombre: nombres.get(c.nom) ?? 0, sousCategories: c.sousCategories.map((s) => ({ nom: s.nom, slug: s.slug })) }))
    .sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom, 'fr'))
  const premier = rayons.find((r) => r.nombre > 0) ?? rayons[0]
  const offresPremier = premier ? (await lireOffresMarketplace({ categorieSlug: premier.slug, taille: 8 })).offres : []
  const best = offres.slice(0, 6)
  const fresh = [...offres].reverse().slice(0, 6)
  return <div className={styles.page}>
    <div className={`${styles.shell} ${styles.commerceGrid}`}>
      <aside className={styles.categoryMenu}><h2><span>☰</span>Toutes les catégories</h2>{CATEGORIES.map(([icon, label]) => <Link key={label} href={`/recherche?q=${encodeURIComponent(label)}`}><span>{icon}</span>{label}<b>›</b></Link>)}</aside>
      <div className={styles.centerStage}><MarketplaceHeroCarousel /><div className={styles.trustStrip}><span><i>✓</i><b>Produits vérifiés<small>et de qualité</small></b></span><span><i>▰</i><b>Livraison rapide<small>au Cameroun</small></b></span><span><i>◇</i><b>Paiement sécurisé<small>et fiable</small></b></span><span><i>↶</i><b>Retours faciles<small>sous 5 jours</small></b></span><span><i>◉</i><b>Service client<small>à votre écoute</small></b></span></div></div>
      {/* La colonne de droite : la publicite choisie par le super admin, puis les engagements KatiHub regroupes. */}
      <aside className={styles.promoRail} aria-label="Publicité et engagements KatiHub">
        <PubAccueil pub={bannieres.pubsAccueil[0] ?? null} />
        <section className={styles.engagements} aria-label="Nos engagements">
          <article><i aria-hidden="true">🛵</i><div><b>Livraison rapide <em>à domicile</em></b><p>Recevez vos commandes où que vous soyez.</p><Link href="/contact">En savoir plus →</Link></div></article>
          <article><i aria-hidden="true">🔒</i><div><b>Paiement sécurisé</b><p>Mobile Money et partenaires de confiance.</p><span className={styles.moyens}><small>OM</small><small>MoMo</small><small>VISA</small></span></div></article>
          <article><i aria-hidden="true">🎧</i><div><b>Service client 24/7</b><p>Une équipe locale vous répond.</p><Link href="/contact">Nous contacter →</Link></div></article>
        </section>
      </aside>
    </div>

    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Meilleures ventes" href="/catalogue" />{best.length ? <div className={styles.productGrid}>{best.map((offre) => <ProductCard key={offre.id} offre={offre} />)}</div> : <p className={styles.empty}>Les offres seront bientôt disponibles.</p>}</section>
    <MarketplaceAvantages />
    {rayons.length ? <RayonsAccueil rayons={rayons} initial={{ slug: premier!.slug, offres: offresPremier }} /> : null}
    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Catégories populaires" href="/catalogue" label="Voir toutes les catégories" /><div className={styles.categoryRail}>{POPULAR.map(([icon, name]) => <Link href={`/recherche?q=${encodeURIComponent(name)}`} key={name}><span>{icon}</span><b>{name}</b></Link>)}</div></section>
    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Boutiques recommandées" href="/boutiques" label="Voir toutes les boutiques" /><div className={styles.shopGrid}>{boutiques.slice(0, 6).map((shop, index) => <Link href={`/boutiques/${shop.slug}`} className={styles.shopCard} key={shop.id}><span data-color={index % 5}>{initials(shop.nom)}</span><strong>{shop.nom}</strong><small>{shop.description ?? 'Boutique locale vérifiée'}</small><em>⌖ {shop.villesLivraison[0] ?? 'Cameroun'}</em><b>Visiter la boutique →</b></Link>)}</div></section>

    <section className={`${styles.shell} ${styles.fashionBanner}`}><Image src="/marketplace-mode-cameroun.png" alt="Une cliente camerounaise présente une sélection mode" fill sizes="(max-width: 800px) 100vw, 1480px" /><div><h2>Le style camerounais,<br /><strong>au quotidien !</strong></h2><p>Vêtements, chaussures et accessoires proposés par des boutiques locales.</p><Link href="/recherche?q=Mode">Découvrir la mode <span>→</span></Link></div></section>

    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Nouveautés" href="/catalogue?tri=recent" />{fresh.length ? <div className={styles.productGrid}>{fresh.map((offre) => <ProductCard key={offre.id} offre={offre} fresh />)}</div> : null}</section>
    <section className={`${styles.shell} ${styles.sellerBanner}`}><Image src="/marketplace-vendeur-cameroun.png" alt="Un vendeur camerounais dans sa boutique" fill sizes="420px" /><div><h2>Vendez sur <strong>KatiHub</strong></h2><p>Rejoignez les vendeurs locaux qui développent leur activité en ligne.</p><ul><li>Votre boutique en quelques minutes</li><li>Des clients partout au Cameroun</li><li>Une équipe pour vous accompagner</li></ul></div><Link href="/devenir-vendeur">Créer ma boutique <span>→</span></Link></section>
    <section className={`${styles.shell} ${styles.newsletter}`}><span>✉</span><div><h2>Restez informé avec KatiHub</h2><p>Recevez nos nouveautés et les offres des boutiques locales.</p></div><form action="/inscription" method="get"><label className="sr-only" htmlFor="newsletter-email">Votre adresse e-mail</label><input id="newsletter-email" name="email" type="email" autoComplete="email" required placeholder="Votre adresse e-mail" /><button type="submit">S’inscrire →</button></form></section>
  </div>
}
