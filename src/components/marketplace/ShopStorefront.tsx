'use client'

import Image from 'next/image'
import { LIBELLE_MODE, estModeLivraison } from '@/lib/modes-livraison'
import { imageProduit } from '@/lib/image-produit'
import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
import type { BoutiquePubliqueMarketplace, OffreBoutiqueMarketplace } from '@/lib/marketplace-data'
import { filterShopOffers, hasShopDiscount, type ShopSort } from '@/lib/shop-catalogue'
import { productCardSpecs } from '@/lib/product-card-specs'
import { useCart } from '@/lib/cart'
import { AvisBoutique } from './AvisBoutique'
import { ShopIcon, type ShopIconName } from './ShopIcon'
import styles from './shop-storefront.module.css'

const views = ['Accueil boutique', 'Tous les produits', 'Nouveautés', 'Promotions', 'Catégories', 'À propos'] as const
type ShopView = (typeof views)[number]
const money = (value: number | null) => value === null ? 'Prix sur demande' : `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const savedKey = 'katihub.boutiques-enregistrees.v1'
const savedEvent = 'katihub:saved-shops'
let savedFallback: string[] = []
function readSavedShops(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(savedKey) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch { return savedFallback }
}
function subscribeSaved(notify: () => void) {
  window.addEventListener('storage', notify)
  window.addEventListener(savedEvent, notify)
  return () => { window.removeEventListener('storage', notify); window.removeEventListener(savedEvent, notify) }
}
function categoryIcon(category: string): ShopIconName {
  if (/informatique|ordinateur/i.test(category)) return 'laptop'
  if (/electronique|électronique|smartphone|téléphone|high.tech/i.test(category)) return 'phone'
  if (/audio|casque/i.test(category)) return 'headphones'
  if (/maison|déco|électroménager/i.test(category)) return 'home'
  return 'bag'
}

function StoreProductCard({ offer, shop, compact = false }: { offer: OffreBoutiqueMarketplace; shop: BoutiquePubliqueMarketplace; compact?: boolean }) {
  const cart = useCart()
  const visuel = imageProduit(offer.produit)
  const illustration = visuel?.url ?? null
  const href = `/marketplace/produits/${offer.produit.slug}?boutique=${encodeURIComponent(shop.slug)}`
  const discount = hasShopDiscount(offer) ? Math.round((1 - offer.prixFcfa! / offer.prixReferenceFcfa!) * 100) : null
  const alreadyAdded = cart.lines.find(line => line.offerId === offer.id)?.qty ?? 0
  const canAdd = offer.prixFcfa !== null && alreadyAdded < Math.min(offer.disponible, 99)
  const specs = productCardSpecs(offer, compact ? 2 : 3)
  function add() {
    if (!canAdd || offer.prixFcfa === null) return
    cart.add({ slug: offer.produit.slug, name: offer.titre ?? offer.produit.nom, price: offer.prixFcfa, image: illustration, offerId: offer.id, boutiqueId: shop.id, boutiqueNom: shop.nom, modesLivraison: shop.modesLivraison.filter((mode): mode is 'vendeur' | 'katihub' => mode === 'vendeur' || mode === 'katihub'), villesLivraison: shop.villesLivraison })
  }
  return <article className={`${styles.productCard} ${compact ? styles.compactCard : ''}`} data-shop-offer={offer.id}>
    <Link className={styles.productVisual} href={href} aria-label={`Voir ${offer.produit.nom}`}>
      {illustration ? <Image src={illustration} alt={visuel?.alt ?? offer.produit.nom} fill sizes={compact ? '80px' : '(max-width: 600px) 45vw, 240px'} /> : <div className={styles.cataloguePlaceholder}><ShopIcon name={categoryIcon(offer.produit.categorie ?? '')}/><span>{offer.produit.marque ?? offer.produit.categorie ?? 'Produit'}</span></div>}
      {discount ? <b className={styles.discount}>−{discount}%</b> : null}
      {!compact ? <small>{illustration ? 'Visuel illustratif' : 'Photo à venir'}</small> : null}
    </Link>
    <div className={styles.productBody}><small className={styles.productCategory}>{offer.produit.categorie ?? 'Dans cette boutique'}</small><h3><Link href={href}>{offer.titre ?? offer.produit.nom}</Link></h3>{specs.length ? <ul className={styles.productSpecs} aria-label="Caractéristiques principales">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul> : null}<div className={styles.productPrice}><strong>{money(offer.prixFcfa)}</strong>{discount ? <del>{money(offer.prixReferenceFcfa)}</del> : null}</div>{!compact ? <><p className={styles.productStock}><i/>En stock <span>· {offer.disponible} disponible(s)</span></p>{offer.prixFcfa === null ? <Link className={styles.cardAction} href={href}>Voir l’offre<ShopIcon name="arrow"/></Link> : <button className={styles.cardAction} onClick={add} disabled={!canAdd}><ShopIcon name="bag"/>{canAdd ? 'Ajouter au panier' : 'Quantité maximale'}</button>}</> : <Link className={styles.compactLink} href={href}>Voir l’offre<ShopIcon name="arrow"/></Link>}</div>
  </article>
}

export function ShopStorefront({ shop }: { shop: BoutiquePubliqueMarketplace }) {
  const [view, setView] = useState<ShopView>('Accueil boutique')
  const [query, setQuery] = useState('')
  const [draftQuery, setDraftQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<ShopSort>('recent')
  const [limit, setLimit] = useState(24)
  const saved = useSyncExternalStore(subscribeSaved, () => readSavedShops().includes(shop.slug), () => false)
  const categories = [...new Set(shop.offres.map(offer => offer.produit.categorie).filter((value): value is string => Boolean(value)))]
  const tech = categories.some(item => /électronique|informatique|high.tech|smartphone/i.test(item))
  const offers = filterShopOffers(shop.offres, { query, category, sort, promotions: view === 'Promotions' })
  const promotions = shop.offres.filter(offer => hasShopDiscount(offer) && offer.disponible > 0)
  const home = view === 'Accueil boutique' && !query && !category
  const about = view === 'À propos'
  const categoriesOnly = view === 'Catégories'
  function navigate(next: ShopView) { setView(next); setCategory(''); setQuery(''); setDraftQuery(''); setSort('recent'); setLimit(24) }
  function selectCategory(next: string) { setCategory(next); setView('Tous les produits'); setLimit(24) }
  function toggleSaved() {
    const ids = readSavedShops()
    savedFallback = saved ? ids.filter(slug => slug !== shop.slug) : [...new Set([...ids, shop.slug])]
    try { localStorage.setItem(savedKey, JSON.stringify(savedFallback)) } catch { /* Mémoire de session si le stockage est indisponible. */ }
    window.dispatchEvent(new Event(savedEvent))
  }
  const title = home ? 'Notre sélection' : query ? `Résultats pour « ${query} »` : category || (view === 'Accueil boutique' ? 'Les produits de la boutique' : view)
  return <main className={styles.page}>
    <section className={styles.cover} aria-labelledby="shop-title"><Image src={tech ? '/marketplace-shop-tech-cover.png' : '/marketplace-vendeur-cameroun.png'} alt="" fill priority sizes="100vw" className={styles.coverImage}/><div className={styles.coverInner}>
      <div className={styles.storeLogo} aria-hidden="true"><ShopIcon name={tech ? 'laptop' : 'bag'}/><strong>{initials(shop.nom)}</strong></div>
      <div className={styles.identity}><div className={styles.storeName}><h1 id="shop-title">{shop.nom}</h1><span><ShopIcon name="bag"/>Boutique sur KatiHub</span></div><div className={styles.storeMeta}><span><ShopIcon name="pin"/>{shop.ville || shop.villesLivraison[0] || 'Cameroun'}</span><span><ShopIcon name="package"/>{shop.offres.length} produit{shop.offres.length > 1 ? 's' : ''}</span></div><div className={styles.storeActions}><button aria-pressed={saved} title="Enregistrée dans ce navigateur" onClick={toggleSaved}><ShopIcon name={saved ? 'check' : 'bookmark'}/>{saved ? 'Boutique enregistrée' : 'Enregistrer la boutique'}</button><button onClick={() => navigate('À propos')}><ShopIcon name="info"/>À propos de la boutique</button></div></div>
      <p className={styles.coverSlogan}>{tech ? <>Vos envies high-tech,<br/><strong>à portée de main.</strong></> : <>De belles découvertes,<br/><strong>tout près de vous.</strong></>}</p>
    </div></section>
    <div className={styles.shopNav}><div className={styles.shell}><nav aria-label="Navigation de la boutique">{views.map(item => <button key={item} aria-current={view === item ? 'page' : undefined} onClick={() => navigate(item)}>{item}</button>)}</nav><form role="search" onSubmit={event => {event.preventDefault();setQuery(draftQuery.trim());setView('Tous les produits');setLimit(24)}}><label className="sr-only" htmlFor="shop-search">Rechercher dans {shop.nom}</label><input id="shop-search" value={draftQuery} onChange={event=>setDraftQuery(event.target.value)} placeholder="Rechercher dans cette boutique…"/><button type="submit" aria-label="Rechercher dans la boutique"><ShopIcon name="search"/></button></form></div></div>
    <div className={`${styles.shell} ${styles.storeLayout}`}>
      <aside className={styles.categoryMenu}><h2><ShopIcon name="bag"/>Catégories de la boutique</h2><button data-active={!category && !about && !categoriesOnly} onClick={() => {navigate('Tous les produits')}}><ShopIcon name="grid"/><span>Tous les produits</span><b>{shop.offres.length}</b></button>{categories.map(item => <button key={item} data-active={category === item} onClick={() => selectCategory(item)}><ShopIcon name={categoryIcon(item)}/><span>{item}</span><ShopIcon name="arrow"/></button>)}<div className={styles.sidebarFooter}><ShopIcon name="shield"/><span>Vous explorez les offres de <strong>{shop.nom}</strong>.</span></div><Link className={styles.allShops} href="/boutiques">Toutes les boutiques<ShopIcon name="arrow"/></Link></aside>
      <div className={styles.mainContent}>
        {home ? <div className={styles.promoBands}><button className={styles.promoOrange} onClick={() => navigate(promotions.length ? 'Promotions' : 'Tous les produits')}><ShopIcon name="tag"/><span><b>{promotions.length ? 'Les offres du moment' : 'À découvrir dans la boutique'}</b><small>{promotions.length ? `${promotions.length} offre(s) à prix réduit` : 'Votre prochaine découverte est ici.'}</small><em>{promotions.length ? 'Voir les promotions' : 'Explorer la sélection'}<ShopIcon name="arrow"/></em></span></button><button className={styles.promoNavy} onClick={() => navigate('À propos')}><ShopIcon name="truck"/><span><b>Livraison près de chez vous</b><small>{shop.villesLivraison.join(' · ') || 'Zones à confirmer avec le vendeur'}</small><em>Voir les informations<ShopIcon name="arrow"/></em></span></button><button className={styles.promoLight} onClick={() => navigate('Catégories')}><ShopIcon name="grid"/><span><b>Trouvez ce qui vous plaît</b><small>{categories.length ? `${categories.length} catégorie(s) à explorer` : 'Découvrez les produits de la boutique'}</small><em>Parcourir la boutique<ShopIcon name="arrow"/></em></span></button></div> : null}
        {about ? <ShopAbout shop={shop} expanded/> : categoriesOnly ? <><SectionTitle title="Catégories de la boutique" icon="grid"/><CategoryRail categories={categories} shop={shop} select={selectCategory}/></> : <section className={styles.catalogue} aria-labelledby="shop-products-title"><header className={styles.sectionHead}><div><h2 id="shop-products-title"><ShopIcon name={view === 'Promotions' ? 'tag' : view === 'Nouveautés' ? 'clock' : 'bag'}/>{title}</h2>{!home ? <p role="status">{offers.length} produit{offers.length > 1 ? 's' : ''} disponible{offers.length > 1 ? 's' : ''} dans cette boutique</p> : null}</div>{home ? <button onClick={() => navigate('Tous les produits')}>Voir tout<ShopIcon name="arrow"/></button> : <label className={styles.sort}>Trier par<select value={sort} onChange={event=>{setSort(event.target.value as ShopSort);setLimit(24)}}><option value="recent">Plus récents</option><option value="prix_asc">Prix croissant</option><option value="prix_desc">Prix décroissant</option></select></label>}</header>
          {query || category ? <div className={styles.activeFilters}>{query ? <span>Recherche : {query}</span> : null}{category ? <span>{category}</span> : null}<button onClick={() => {setQuery('');setDraftQuery('');setCategory('');setLimit(24)}}><ShopIcon name="close"/>Effacer les filtres</button></div> : null}
          {offers.length ? <div className={styles.productGrid} data-product-count={offers.length} data-shop-catalogue={shop.slug}>{offers.slice(0, home ? 6 : limit).map(offer => <StoreProductCard key={offer.id} offer={offer} shop={shop}/>)}</div> : <div className={styles.empty}><ShopIcon name={view === 'Promotions' ? 'tag' : 'search'}/><h3>{view === 'Promotions' && !query && !category ? 'Aucune promotion en cours' : query || category ? 'Aucun produit ne correspond à votre recherche' : 'La boutique prépare sa sélection'}</h3><p>{query || category ? 'Essayez un autre mot-clé ou retirez un filtre.' : view === 'Promotions' ? 'Les nouvelles offres apparaîtront ici lorsqu’elles seront publiées.' : 'Revenez bientôt pour découvrir ses premières offres.'}</p><button onClick={() => navigate('Tous les produits')}>Voir tous les produits<ShopIcon name="arrow"/></button></div>}
          {!home && offers.length > limit ? <button className={styles.showMore} onClick={() => setLimit(value=>value+24)}>Afficher plus de produits<ShopIcon name="arrow"/></button> : null}
        </section>}
        {home && categories.length ? <section className={styles.categories}><SectionTitle title="Catégories de la boutique" icon="grid"/><CategoryRail categories={categories} shop={shop} select={selectCategory}/></section> : null}
      </div>
    </div>
    {home && shop.offres.length > 6 ? <div className={`${styles.shell} ${styles.discovery}`}><section className={styles.discoveryPanel}><SectionTitle title="Nouveautés" icon="clock" action={() => navigate('Nouveautés')}/><div className={styles.miniGrid}>{shop.offres.slice(0,3).map(offer=><StoreProductCard key={offer.id} offer={offer} shop={shop} compact/>)}</div></section>{promotions.length ? <section className={styles.discoveryPanel}><SectionTitle title="Promotions de la boutique" icon="tag" action={() => navigate('Promotions')}/><div className={styles.miniGrid}>{promotions.slice(0,3).map(offer=><StoreProductCard key={offer.id} offer={offer} shop={shop} compact/>)}</div></section> : null}</div> : null}
    <div className={styles.shell}><AvisBoutique slug={shop.slug} nom={shop.nom}/></div>
    {!about ? <div className={`${styles.shell} ${styles.bottomInfo}`}><ShopAbout shop={shop}/><section className={styles.commitments}><SectionTitle title="Acheter dans cette boutique" icon="shield"/><div><span><ShopIcon name="bag"/><b>Une boutique locale</b><small>{shop.nom}</small></span><span><ShopIcon name="truck"/><b>Livraison proposée</b><small>{shop.villesLivraison.join(' · ') || 'À confirmer'}</small></span><span><ShopIcon name="shield"/><b>Votre vendeur conservé</b><small>De la fiche au panier</small></span></div><p>Les frais, délais et conditions sont confirmés avant la validation de votre commande.</p></section></div> : null}
    <p className={`${styles.shell} ${styles.savedHint}`} role="status">{saved ? 'Cette boutique est enregistrée dans ce navigateur.' : ''}</p>
  </main>
}

function SectionTitle({ title, icon, action }: { title: string; icon: ShopIconName; action?: () => void }) {
  return <header className={styles.sectionHead}><h2><ShopIcon name={icon}/>{title}</h2>{action ? <button onClick={action}>Voir tout<ShopIcon name="arrow"/></button> : null}</header>
}
function CategoryRail({ categories, shop, select }: { categories: string[]; shop: BoutiquePubliqueMarketplace; select: (value:string)=>void }) {
  return categories.length ? <div className={styles.categoryRail}>{categories.map(item=><button key={item} onClick={()=>select(item)}><ShopIcon name={categoryIcon(item)}/><span><b>{item}</b><small>{shop.offres.filter(offer=>offer.produit.categorie===item).length} produit(s)<ShopIcon name="arrow"/></small></span></button>)}</div> : <p className={styles.emptyCategories}>Les catégories apparaîtront avec les premières offres de cette boutique.</p>
}
function ShopAbout({ shop, expanded=false }: { shop: BoutiquePubliqueMarketplace; expanded?:boolean }) {
  return <section className={`${styles.about} ${expanded ? styles.aboutExpanded : ''}`}><SectionTitle title={`À propos de ${shop.nom}`} icon="info"/><p>{shop.description ?? `${shop.nom} vous accueille sur KatiHub. Explorez ses produits et les conditions de chaque offre.`}</p><dl><div><dt>Zones de livraison</dt><dd>{shop.villesLivraison.join(' · ') || 'À confirmer avec le vendeur'}</dd></div><div><dt>Livraison assurée par</dt><dd>{shop.modesLivraison.map(mode => estModeLivraison(mode) ? LIBELLE_MODE[mode] : mode).join(' · ') || 'À confirmer'}</dd></div></dl><Link href="/boutiques">Découvrir les autres boutiques<ShopIcon name="arrow"/></Link></section>
}
