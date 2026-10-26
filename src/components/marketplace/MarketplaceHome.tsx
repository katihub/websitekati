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
    id: 'katihub-alimentation',
    href: '/recherche?q=Alimentation',
    label: 'Vos essentiels du quotidien',
    description: 'Épicerie et produits alimentaires pour toute la famille.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Une sélection de produits alimentaires et de première nécessité',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-alimentation.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-alimentation.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-beaute',
    href: '/recherche?q=Beauté',
    label: 'Beauté et soins au quotidien',
    description: 'Des soins pour le visage et le corps.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Une sélection de soins pour le corps et le visage',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-beaute-soins.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-beaute-soins.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-bricolage',
    href: '/recherche?q=Bricolage',
    label: 'Tous vos projets prennent vie',
    description: 'Outillage, peinture et matériaux pour vos travaux.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Des outils et matériaux pour le bricolage et la construction',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-bricolage.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-bricolage.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-mode',
    href: '/recherche?q=Mode',
    label: 'Le style qui vous ressemble',
    description: 'Mode, chaussures et accessoires pour toutes vos envies.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Une sélection de vêtements, chaussures et accessoires de mode',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-mode-accessoires.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-mode-accessoires.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-electromenager',
    href: '/recherche?q=Électroménager',
    label: 'Équipez votre maison',
    description: 'Le petit électroménager utile au quotidien.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Une sélection de petit électroménager pour la maison',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-electromenager.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-electromenager.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-electronique',
    href: '/recherche?q=Électronique',
    label: 'Restez connecté partout',
    description: 'Téléphones, audio et accessoires pour rester connecté.',
    action: 'Découvrir',
    tonalite: 'orange',
    alt: 'Un smartphone, une enceinte et un casque audio',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-electronique.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-electronique.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-informatique',
    href: '/recherche?q=Informatique',
    label: 'Tout pour votre espace de travail',
    description: 'Ordinateurs, imprimantes et équipements informatiques.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Des ordinateurs et une imprimante pour le travail',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-informatique.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-informatique.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-bien-etre',
    href: '/recherche?q=Bien-être',
    label: 'Prenez soin de vous',
    description: 'Bien-être, relaxation et soins à domicile.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Des appareils et produits dédiés au bien-être',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-bien-etre.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-bien-etre.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-energie',
    href: '/recherche?q=Énergie solaire',
    label: 'Passez à l’énergie solaire',
    description: 'Équipements solaires et solutions d’autonomie énergétique.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Des panneaux solaires, un régulateur et une batterie',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-energie-solaire.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-energie-solaire.jpeg', largeur: 1333, hauteur: 444 },
  },
  {
    id: 'katihub-securite',
    href: '/recherche?q=Sécurité et Surveillance',
    label: 'Protégez ce qui compte',
    description: 'Caméras et solutions de vidéosurveillance.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Des caméras et un système complet de vidéosurveillance',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/promo-securite-surveillance.jpeg', largeur: 1333, hauteur: 444 },
    mobile: { url: '/promo-securite-surveillance.jpeg', largeur: 1333, hauteur: 444 },
  },
]
const ORDRE_PROMOS_ACCUEIL = ['katihub-alimentation', 'katihub-beaute', 'katihub-bricolage', 'katihub-mode', 'katihub-electromenager', 'katihub-electronique', 'katihub-informatique', 'katihub-bien-etre', 'katihub-energie', 'katihub-securite'] as const
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
