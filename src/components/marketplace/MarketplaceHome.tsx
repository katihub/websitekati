import Image from 'next/image'
import Link from 'next/link'
import { getBanners, type PublishedBanner } from '@/lib/banners'
import { lireAccueilMarketplace, lireCategoriesMarketplace, lireOffresMarketplace } from '@/lib/marketplace-data'
import { MarketplaceAvantages } from './MarketplaceAvantages'
import { DerniersArrivages } from './DerniersArrivages'
import { MarketplaceHeroCarousel } from './MarketplaceHeroCarousel'
import { MarquesAccueil } from './MarquesAccueil'
import { ProductCard } from './ProductCardAccueil'
import { ProductCarouselAccueil } from './ProductCarouselAccueil'
import { CategoryProductShowcase, type CategoryProductGroup } from './CategoryProductShowcase'
import { ShopCarouselAccueil } from './ShopCarouselAccueil'
import { NewsletterKatihub, VendreSurKatihub } from './VendreSurKatihub'
import { RayonsAccueil, type RayonAccueil } from './RayonsAccueil'
import styles from './marketplace-home-v2.module.css'

const POPULAR = [['📱', 'Smartphones'], ['💻', 'Ordinateurs'], ['👗', 'Mode & Vêtements'], ['🛋️', 'Maison & Décoration'], ['🧴', 'Beauté & Soins'], ['🏋️', 'Sports & Fitness'], ['🧸', 'Enfants & Jouets'], ['🍳', 'Électroménager']]
const PROMOS_KATIHUB: PublishedBanner[] = [
  {
    id: 'katihub-bienvenue',
    href: '/catalogue',
    label: 'Tout ce dont vous avez besoin, au même endroit !',
    description: 'Des boutiques locales et une livraison suivie au Cameroun.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Une cliente KatiHub reçoit sa commande',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-hero-douala.png', largeur: 2048, hauteur: 1024 },
    mobile: { url: '/marketplace-hero-douala.png', largeur: 2048, hauteur: 1024 },
  },
  {
    id: 'katihub-high-tech',
    href: '/recherche?q=High-Tech',
    label: 'Le meilleur de la high-tech',
    description: 'Téléphones, ordinateurs et accessoires choisis pour vous.',
    action: 'Découvrir',
    tonalite: 'navy',
    alt: 'Une sélection high-tech KatiHub dans les couleurs bleu nuit et orange',
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
    alt: 'Une cliente camerounaise avec ses achats KatiHub',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-mode-cameroun.png', largeur: 2172, hauteur: 724 },
    mobile: { url: '/marketplace-mode-cameroun.png', largeur: 2172, hauteur: 724 },
  },
  {
    id: 'katihub-selection',
    href: '/catalogue',
    label: 'Vos essentiels, réunis au même endroit',
    description: 'Maison, électronique, beauté et bien plus encore.',
    action: 'Découvrir',
    tonalite: 'light',
    alt: 'Une sélection de produits disponibles sur KatiHub',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-catalogue-cover.png', largeur: 2172, hauteur: 724 },
    mobile: { url: '/marketplace-catalogue-cover.png', largeur: 2172, hauteur: 724 },
  },
  {
    id: 'katihub-vendeurs',
    href: '/devenir-vendeur',
    label: 'Vendez sur KatiHub',
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
    alt: 'Un professionnel livre une commande KatiHub',
    focus: 50,
    emplacement: 'promo',
    large: { url: '/marketplace-vendeur-cameroun.png', largeur: 2048, hauteur: 1024 },
    mobile: { url: '/marketplace-vendeur-cameroun.png', largeur: 2048, hauteur: 1024 },
  },
]
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
  const categoriesCarrousel = rayons.filter((rayon) => rayon.nombre > 0).slice(0, 5)
  const groupesCategories: CategoryProductGroup[] = await Promise.all(categoriesCarrousel.map(async (rayon) => ({
    nom: rayon.nom,
    slug: rayon.slug,
    offres: (await lireOffresMarketplace({ categorieSlug: rayon.slug, taille: 12 })).offres,
  })))
  const offresPremier = groupesCategories.find((groupe) => groupe.slug === premier?.slug)?.offres.slice(0, 8)
    ?? (premier ? (await lireOffresMarketplace({ categorieSlug: premier.slug, taille: 8 })).offres : [])
  const best = offres.slice(0, 20)
  const fresh = [...offres].reverse().slice(0, 6)
  // Les promotions du panel restent prioritaires. Tant qu'aucune n'est
  // publiée, cette sélection KatiHub évite de recréer un grand vide sous les
  // engagements sans réintroduire les anciennes créations hors charte.
  const promosAccueil = bannieres.promos.length ? bannieres.promos : PROMOS_KATIHUB
  return <div className={styles.page}>
    <MarketplaceHeroCarousel promos={promosAccueil} />

    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Meilleures ventes" href="/catalogue" />{best.length ? <ProductCarouselAccueil offres={best} /> : <p className={styles.empty}>Les offres seront bientôt disponibles.</p>}</section>
    <MarketplaceAvantages />
    {groupesCategories.some((groupe) => groupe.offres.length) ? <CategoryProductShowcase groupes={groupesCategories.filter((groupe) => groupe.offres.length)} /> : null}
    {rayons.length ? <RayonsAccueil rayons={rayons} initial={{ slug: premier!.slug, offres: offresPremier }} /> : null}
    <MarquesAccueil marques={comptes.facettes?.marques ?? []} totalOffres={comptes.pagination.total} />
    <DerniersArrivages />
    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Catégories populaires" href="/catalogue" label="Voir toutes les catégories" /><div className={styles.categoryRail}>{POPULAR.map(([icon, name]) => <Link href={`/recherche?q=${encodeURIComponent(name)}`} key={name}><span>{icon}</span><b>{name}</b></Link>)}</div></section>
    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Boutiques recommandées" href="/boutiques" label="Voir toutes les boutiques" />{boutiques.length ? <ShopCarouselAccueil boutiques={boutiques.slice(0, 20)} /> : <p className={styles.empty}>Les boutiques seront bientôt disponibles.</p>}</section>

    <section className={`${styles.shell} ${styles.fashionBanner}`}><Image src="/marketplace-mode-cameroun.png" alt="Une cliente camerounaise présente une sélection mode" fill sizes="(max-width: 800px) 100vw, 1480px" /><div><h2>Le style camerounais,<br /><strong>au quotidien !</strong></h2><p>Vêtements, chaussures et accessoires proposés par des boutiques locales.</p><Link href="/recherche?q=Mode">Découvrir la mode <span>→</span></Link></div></section>

    <section className={`${styles.shell} ${styles.section}`}><SectionHead title="Nouveautés" href="/catalogue?tri=recent" />{fresh.length ? <div className={styles.productGrid}>{fresh.map((offre) => <ProductCard key={offre.id} offre={offre} fresh />)}</div> : null}</section>
    <VendreSurKatihub />
    <NewsletterKatihub />
  </div>
}
