import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { MarketplaceText } from '@/lib/language'
import { getBanners, type PublishedBanner } from '@/lib/banners'
import { lireAccueilMarketplace, lireCategoriesMarketplace, lireOffresMarketplace } from '@/lib/marketplace-data'
import { interleaveCategoryProducts } from '@/lib/mixed-category-products'
import { MarketplaceAvantages } from './MarketplaceAvantages'
import { MarketplaceCategoryMenu } from './MarketplaceCategoryMenu'
import { DerniersArrivages } from './DerniersArrivages'
import { MarketplaceHeroCarousel } from './MarketplaceHeroCarousel'
import { PromosCarrousel } from './PromosCarrousel'
import { MarquesAccueil } from './MarquesAccueil'
import { ProductCard } from './ProductCardAccueil'
import { ProductCarouselAccueil } from './ProductCarouselAccueil'
import { CategoryProductShowcase, type CategoryProductGroup } from './CategoryProductShowcase'
import { ShopCarouselAccueil } from './ShopCarouselAccueil'
import { NewsletterKatihub, VendreSurKatihub } from './VendreSurKatihub'
import { PubAccueil } from './PubAccueil'
import { RayonsAccueil, type RayonAccueil } from './RayonsAccueil'
import styles from './marketplace-home-v2.module.css'

const POPULAR = [['📱', 'Smartphones'], ['💻', 'Ordinateurs'], ['👗', 'Mode & Vêtements'], ['🛋️', 'Maison & Décoration'], ['🧴', 'Beauté & Soins'], ['🏋️', 'Sports & Fitness'], ['🧸', 'Enfants & Jouets'], ['🍳', 'Électroménager']]
const PROMOS_KATIMARKET: PublishedBanner[] = [
  {
    id: 'katihub-bienvenue',
    href: '/catalogue',
    label: 'Tout ce dont vous avez besoin, au même endroit !',
    description: 'Des boutiques locales et une livraison suivie au Cameroun.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Un couple camerounais découvre sa commande KatiMarket',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/home-promo-bienvenue.png', largeur: 1919, hauteur: 820 },
    mobile: { url: '/home-promo-bienvenue.png', largeur: 1919, hauteur: 820 },
  },
  {
    id: 'katihub-high-tech',
    href: '/recherche?q=High-Tech',
    label: 'Le meilleur de la high-tech',
    description: 'Téléphones, ordinateurs et accessoires choisis pour vous.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Une sélection high-tech KatiMarket dans les couleurs bleu nuit et orange',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-shop-tech-cover.png', largeur: 2172, hauteur: 724 },
    mobile: { url: '/marketplace-shop-tech-cover.png', largeur: 2172, hauteur: 724 },
  },
  {
    id: 'katihub-mode',
    href: '/recherche?q=Mode',
    label: 'Le style camerounais au quotidien',
    description: 'Mode, beauté et accessoires proposés par nos boutiques.',
    action: 'Explorer',
    tonalite: 'light',
    alt: 'Une cliente camerounaise découvre une création locale en boutique',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/home-promo-mode-boutique.png', largeur: 1916, hauteur: 821 },
    mobile: { url: '/home-promo-mode-boutique.png', largeur: 1916, hauteur: 821 },
  },
  {
    id: 'katihub-selection',
    href: '/catalogue',
    label: 'Vos essentiels, réunis au même endroit',
    description: 'Maison, électronique, beauté et bien plus encore.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Une sélection de produits disponibles sur KatiMarket',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-catalogue-cover.png', largeur: 2172, hauteur: 724 },
    mobile: { url: '/marketplace-catalogue-cover.png', largeur: 2172, hauteur: 724 },
  },
  {
    id: 'katihub-vendeurs',
    href: '/devenir-vendeur',
    label: 'Vendez sur KatiMarket',
    description: 'Ouvrez votre boutique en quelques minutes.',
    action: 'Commencer',
    tonalite: 'light',
    alt: 'Une commerçante camerounaise prépare ses commandes',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marchande-katihub-cameroun.png', largeur: 2048, hauteur: 1024 },
    mobile: { url: '/marchande-katihub-cameroun.png', largeur: 2048, hauteur: 1024 },
  },
  {
    id: 'katihub-livraison',
    href: '/contact',
    label: 'Livraison rapide à domicile',
    description: 'Recevez vos achats où que vous soyez au Cameroun.',
    action: 'En savoir plus',
    tonalite: 'orange',
    alt: 'Un professionnel livre une commande KatiMarket',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-vendeur-cameroun.png', largeur: 2048, hauteur: 1024 },
    mobile: { url: '/marketplace-vendeur-cameroun.png', largeur: 2048, hauteur: 1024 },
  },
]
const ORDRE_PROMOS_ACCUEIL = ['katihub-mode', 'katihub-selection', 'katihub-high-tech', 'katihub-bienvenue', 'katihub-vendeurs', 'katihub-livraison'] as const
function SectionHead({ title, href, label = <MarketplaceText id="viewAll" /> }: { title: ReactNode; href: string; label?: ReactNode }) {
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
  const categoriesCarrousel = rayons.filter((rayon) => rayon.nombre > 0).slice(0, 5)
  const groupesCategories: CategoryProductGroup[] = await Promise.all(categoriesCarrousel.map(async (rayon) => ({
    nom: rayon.nom,
    slug: rayon.slug,
    offres: (await lireOffresMarketplace({ categorieSlug: rayon.slug, taille: 12 })).offres,
  })))
  const offresPremier = groupesCategories.find((groupe) => groupe.slug === premier?.slug)?.offres.slice(0, 8)
    ?? (premier ? (await lireOffresMarketplace({ categorieSlug: premier.slug, taille: 8 })).offres : [])
  const best = offres.slice(0, 20)
  const mixedCategoryProducts = interleaveCategoryProducts(groupesCategories, 18)
  const fresh = [...offres].reverse().slice(0, 6)
  // Les promotions du panel restent prioritaires. Tant qu'aucune n'est
  // publiée, cette sélection KatiMarket évite de recréer un grand vide sous les
  // engagements sans réintroduire les anciennes créations hors charte.
  const promosAccueil = [
    ...bannieres.promos,
    ...ORDRE_PROMOS_ACCUEIL
      .map((id) => PROMOS_KATIMARKET.find((promo) => promo.id === id))
      .filter((promo): promo is PublishedBanner => promo !== undefined)
      .filter((promo) => !bannieres.promos.some((publiee) => String(publiee.id) === String(promo.id))),
  ]
  return <div className={styles.page}>
    <div className={`${styles.shell} ${styles.commerceGrid}`}>
      <MarketplaceCategoryMenu rayons={rayons} />
      <div className={styles.centerStage}>
        <MarketplaceHeroCarousel />
        <PromosCarrousel promos={promosAccueil} afficherLibelles={!bannieres.promos.length} />
      </div>
      <aside className={styles.promoRail} aria-label="Publicité et engagements KatiMarket">
        <PubAccueil pub={bannieres.pubsAccueil[0] ?? null} />
        <section className={styles.engagements} aria-label="Nos engagements">
          <article><i aria-hidden="true">🛵</i><div><b>Livraison rapide <em>à domicile</em></b><p>Recevez vos commandes où que vous soyez.</p><Link href="/contact">En savoir plus →</Link></div></article>
          <article><i aria-hidden="true">🔒</i><div><b>Paiement sécurisé</b><p>Mobile Money et partenaires de confiance.</p><span className={styles.moyens}><small>OM</small><small>MoMo</small><small>VISA</small></span></div></article>
          <article><i aria-hidden="true">🎧</i><div><b>Service client 24/7</b><p>Une équipe locale vous répond.</p><Link href="/contact">Nous contacter →</Link></div></article>
        </section>
      </aside>
    </div>

    <section className={`${styles.shell} ${styles.section}`}><SectionHead title={<MarketplaceText id="bestSellersTitle" />} href="/catalogue" />{best.length ? <ProductCarouselAccueil offres={best} /> : <p className={styles.empty}><MarketplaceText id="offersSoon" /></p>}</section>
    {mixedCategoryProducts.length ? <section className={`${styles.shell} ${styles.section}`} data-testid="mixed-category-products"><SectionHead title={<MarketplaceText id="mixedCategoriesTitle" />} href="/catalogue" label={<MarketplaceText id="viewAllCategories" />} /><p className={styles.sectionIntro}><MarketplaceText id="mixedCategoriesText" /></p><ProductCarouselAccueil offres={mixedCategoryProducts} label="Produits de différentes catégories" showCategory /></section> : null}
    <MarketplaceAvantages />
    {groupesCategories.some((groupe) => groupe.offres.length) ? <CategoryProductShowcase groupes={groupesCategories.filter((groupe) => groupe.offres.length)} /> : null}
    {rayons.length ? <RayonsAccueil rayons={rayons} initial={{ slug: premier!.slug, offres: offresPremier }} /> : null}
    <MarquesAccueil marques={comptes.facettes?.marques ?? []} totalOffres={comptes.pagination.total} />
    <DerniersArrivages />
    <section className={`${styles.shell} ${styles.section}`}><SectionHead title={<MarketplaceText id="popularCategories" />} href="/catalogue" label={<MarketplaceText id="viewAllCategories" />} /><div className={styles.categoryRail}>{POPULAR.map(([icon, name]) => <Link href={`/recherche?q=${encodeURIComponent(name)}`} key={name}><span>{icon}</span><b>{name}</b></Link>)}</div></section>
    <section className={`${styles.shell} ${styles.section}`}><SectionHead title={<MarketplaceText id="recommendedShopsTitle" />} href="/boutiques" label={<MarketplaceText id="viewAllShops" />} />{boutiques.length ? <ShopCarouselAccueil boutiques={boutiques.slice(0, 20)} /> : <p className={styles.empty}><MarketplaceText id="shopsSoon" /></p>}</section>

    <section className={`${styles.shell} ${styles.fashionBanner}`}><Image src="/home-banner-mode-createurs.png" alt="Trois jeunes Camerounais portent des tenues de créateurs locaux" fill sizes="(max-width: 800px) 100vw, 1480px" /><div><h2><MarketplaceText id="fashionBannerTitle" /><br /><strong><MarketplaceText id="daily" /></strong></h2><p><MarketplaceText id="localFashionText" /></p><Link href="/recherche?q=Mode"><MarketplaceText id="discoverFashion" /> <span>→</span></Link></div></section>

    <section className={`${styles.shell} ${styles.section}`}><SectionHead title={<MarketplaceText id="newArrivals" />} href="/catalogue?tri=recent" />{fresh.length ? <div className={styles.productGrid}>{fresh.map((offre) => <ProductCard key={offre.id} offre={offre} fresh />)}</div> : <p className={styles.empty}><MarketplaceText id="newArrivalsEmpty" /></p>}</section>
    <VendreSurKatihub />
    <NewsletterKatihub />
  </div>
}
