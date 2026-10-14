'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import styles from './marketplace.module.css'

type Seller = {
  id: string
  name: string
  initials: string
  rating: string
  sales: string
  price: number
  delivery: string
  window: string
  recommended?: boolean
}

const demoSellers: Seller[] = [
  {
    id: 'nowtech',
    name: 'NowTech',
    initials: 'NT',
    rating: '4,8',
    sales: '412 ventes',
    price: 149000,
    delivery: 'Livré par KatiHub',
    window: 'Demain, 12–13 avr.',
    recommended: true,
  },
  {
    id: 'techmall',
    name: 'TechMall Cameroun',
    initials: 'TC',
    rating: '4,5',
    sales: '328 ventes',
    price: 152000,
    delivery: 'Livraison vendeur',
    window: '14–16 avr.',
  },
  {
    id: 'easyshop',
    name: 'EasyShop237',
    initials: 'ES',
    rating: '4,3',
    sales: '276 ventes',
    price: 155000,
    delivery: 'Livré par KatiHub',
    window: 'Demain, 12–13 avr.',
  },
]

export type MarketplaceProduct = {
  id: string
  slug: string
  nom: string
  description: string | null
  marque: string | null
  categorie: string | null
  /** Le referencement valide par KatiHub ; absent, la page compose le sien. */
  /** La categorie KatiHub du produit et la garantie minimale qu'elle impose. */
  categorieDetail?: { nom: string; slug: string; parent: { nom: string; slug: string } | null; garantieMinimaleMois: number; garantie: string } | null
  metaTitre?: string | null
  metaDescription?: string | null
  /** Les photos publiees, la premiere est l'image principale. */
  images?: Array<{ id: string; url: string; texteAlternatif: string | null }>
  offres: Array<{
    id: string
    titre: string | null
    prixFcfa: number | null
    prixReferenceFcfa?: number | null
    garantieMois?: number | null
    /** Le nom de la variante (« 128 Go / Noir ») ; null pour une offre sans variante. */
    libelleVariante?: string | null
    attributsVariante?: Record<string, string> | null
    ordreVariante?: number
    modesLivraison: Array<'vendeur' | 'katihub'>
    villesLivraison: string[]
    delaiMaxJours: number | null
    disponible: number
    /** `ville` : la ville de la boutique, montree au client a la place de son nom. */
    boutique: { id: string; nom: string; slug: string; ville?: string | null }
  }>
}

const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

function Icon({ name }: { name: 'search' | 'pin' | 'heart' | 'user' | 'cart' | 'truck' | 'shield' | 'gift' | 'star' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    cart: <><path d="M3 4h2l2 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    shield: <path d="M12 2 4.5 5v6c0 5 3.2 8.7 7.5 11 4.3-2.3 7.5-6 7.5-11V5L12 2Zm-3 10 2 2 4-5"/>,
    gift: <><path d="M4 10h16v11H4zM2 6h20v4H2zM12 6v15M12 6H8.5a2 2 0 1 1 0-4C11 2 12 6 12 6Zm0 0h3.5a2 2 0 1 0 0-4C13 2 12 6 12 6Z"/></>,
    star: <path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z"/>,
  }
  return <svg aria-hidden viewBox="0 0 24 24" className={styles.icon}>{paths[name]}</svg>
}

export function MarketplacePreview({ product }: { product?: MarketplaceProduct }) {
  const sellers = useMemo<Seller[]>(() => product
    ? product.offres.flatMap((offre, index) => offre.prixFcfa === null ? [] : [{
        id: offre.id,
        name: offre.boutique.nom,
        initials: offre.boutique.nom.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
        rating: 'Nouveau',
        sales: `${offre.disponible} en stock`,
        price: offre.prixFcfa,
        delivery: offre.modesLivraison.includes('katihub') ? 'Livré par KatiHub' : 'Livraison vendeur',
        window: offre.delaiMaxJours === 0 ? 'Aujourd’hui' : `Sous ${offre.delaiMaxJours ?? 3} jour(s)`,
        recommended: index === 0,
      }])
    : demoSellers, [product])
  const [selectedId, setSelectedId] = useState(sellers[0]?.id ?? '')
  const [storage, setStorage] = useState('128 Go')
  const [tab, setTab] = useState('Description')
  const effectiveSelectedId = sellers.some((seller) => seller.id === selectedId)
    ? selectedId
    : (sellers[0]?.id ?? '')
  const selected = sellers.find((seller) => seller.id === effectiveSelectedId)
  const price = selected?.price ?? 0
  const deposit = price > 0 ? Math.min(price, Math.max(1000, Math.ceil(price * 0.1))) : 0
  const balance = price - deposit
  const totals = useMemo(() => ({ deposit, balance }), [deposit, balance])

  return (
    <div className={`${styles.previewPage} marketplacePreview`}>
      <a className={styles.skipLink} href="#produit">Aller au produit</a>

      <div className={styles.trustBar}>
        <div className={styles.shell}>
          <span><Icon name="truck" /> Livraison à Douala & Yaoundé</span>
          <span><Icon name="shield" /> Paiement sécurisé Mobile Money</span>
          <span><span className={styles.returnMark}>5j</span> Retours sous 5 jours</span>
          <span className={styles.trustLinks}>Aide · Devenir vendeur · Suivi de commande</span>
        </div>
      </div>

      <header className={styles.header}>
        <div className={`${styles.shell} ${styles.headerRow}`}>
          <a href="#" className={styles.brand} aria-label="KatiHub, accueil">
            <span className={styles.brandMark}>K</span>
            <span><strong>KATI<span>HUB</span></strong><small>UN SEUL HUB POUR TOUT</small></span>
          </a>
          <form className={styles.search} onSubmit={(event) => event.preventDefault()} role="search">
            <label className={styles.srOnly} htmlFor="marketplace-search">Rechercher</label>
            <Icon name="search" />
            <input id="marketplace-search" placeholder="Rechercher un produit, une boutique…" />
            <button type="submit" aria-label="Lancer la recherche"><Icon name="search" /></button>
          </form>
          <nav className={styles.actions} aria-label="Actions principales">
            <button type="button"><Icon name="pin" /><span>Douala</span></button>
            <button type="button"><Icon name="heart" /><span>Favoris</span></button>
            <button type="button"><Icon name="user" /><span>Compte</span></button>
            <button type="button" className={styles.cart}><Icon name="cart" /><span>Panier</span><b>3</b></button>
          </nav>
        </div>
        <nav className={`${styles.shell} ${styles.categoryNav}`} aria-label="Catégories">
          <a href="#" className={styles.allCategories}>☷ Toutes les catégories</a>
          <a href="#">Électronique</a><a href="#">Mode & Style</a><a href="#">Maison & Déco</a>
          <a href="#">Beauté & Santé</a><a href="#">Sports & Loisirs</a><a href="#">Auto & Moto</a><a href="#">Plus</a>
        </nav>
      </header>

      <main id="produit" className={`${styles.shell} ${styles.main}`}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          Accueil <span>/</span> Téléphones <span>/</span> Smartphones <span>/</span> Galaxy A15
        </nav>

        <div className={styles.productGrid}>
          <section className={styles.gallery} aria-label="Galerie du produit">
            <div className={styles.thumbnails}>
              {[1, 2, 3, 4].map((item) => (
                <button type="button" className={item === 1 ? styles.thumbActive : ''} key={item} aria-label={`Photo ${item}`}>
                  <Image src="/marketplace-telephone-kati.png" alt="" width={72} height={72} />
                </button>
              ))}
            </div>
            <div className={styles.productVisual}>
              <span className={styles.official}>✓ Produit contrôlé</span>
              <Image src="/marketplace-telephone-kati.png" alt="Smartphone bleu, vues avant et arrière" fill priority sizes="(max-width: 900px) 80vw, 34vw" />
            </div>
          </section>

          <section className={styles.productInfo}>
            <p className={styles.eyebrow}>{product?.marque ?? 'Samsung'} · {product?.categorie ?? 'Smartphone 4G'}</p>
            <h1>{product?.nom ?? 'Samsung Galaxy A15 128 Go'}</h1>
            <p className={styles.subtitle}>{product ? 'Fiche commune contrôlée par l’équipe KatiHub' : 'Écran Super AMOLED · Grande autonomie · Double SIM'}</p>
            <div className={styles.rating}>{product ? <><span>☆</span><strong>Nouveau</strong><a href="#avis">Avis après achat vérifié</a></> : <><span>★★★★★</span><strong>4,6</strong><a href="#avis">128 avis vérifiés</a><i />1 248 ventes</>}</div>
            <p className={styles.fromPrice}>Dès <strong>{money.format(sellers.length ? Math.min(...sellers.map((seller) => seller.price)) : 0)} FCFA</strong></p>
            <p className={styles.stock}><span>✓</span> {sellers.length ? 'En stock' : 'Indisponible'} <small>{sellers.reduce((total, seller) => total + (Number.parseInt(seller.sales) || 0), 0)} unité(s) disponibles</small></p>
            {!product ? <dl className={styles.specs}>
              <div><dt>Écran</dt><dd>6,5” AMOLED</dd></div>
              <div><dt>Stockage</dt><dd>{storage}</dd></div>
              <div><dt>Batterie</dt><dd>5 000 mAh</dd></div>
              <div><dt>Photo</dt><dd>50 MP</dd></div>
            </dl> : null}
            {!product ? <fieldset className={styles.choices}>
              <legend>Couleur : <strong>Bleu nuit</strong></legend>
              <button type="button" className={styles.colorChoice} aria-label="Bleu nuit sélectionné" aria-pressed="true" />
              <button type="button" className={`${styles.colorChoice} ${styles.colorLight}`} aria-label="Bleu clair" aria-pressed="false" />
              <button type="button" className={`${styles.colorChoice} ${styles.colorGold}`} aria-label="Or" aria-pressed="false" />
            </fieldset> : null}
            {!product ? <fieldset className={styles.choices}>
              <legend>Stockage</legend>
              {['128 Go', '256 Go'].map((value) => <button type="button" key={value} onClick={() => setStorage(value)} aria-pressed={storage === value}>{value}</button>)}
            </fieldset> : null}
            <div className={styles.assurances}>
              <span><Icon name="shield" /> Garantie vérifiée</span>
              <span><Icon name="truck" /> Livraison suivie</span>
            </div>
          </section>

          <aside className={styles.offers} aria-labelledby="offers-title">
            <div className={styles.offersTitle}><h2 id="offers-title">Choisissez votre vendeur</h2><button type="button">Comparer</button></div>
            <div className={styles.sellerList}>
              {sellers.length === 0 ? <p>Aucune offre n’est disponible pour le moment.</p> : null}
              {sellers.map((seller) => (
                <label className={`${styles.seller} ${effectiveSelectedId === seller.id ? styles.sellerSelected : ''}`} key={seller.id}>
                  <input type="radio" name="seller" checked={effectiveSelectedId === seller.id} onChange={() => setSelectedId(seller.id)} />
                  <span className={styles.radio} />
                  <span className={styles.avatar}>{seller.initials}</span>
                  <span className={styles.sellerBody}>
                    <span className={styles.sellerTop}><strong>{seller.name}</strong><b>{money.format(seller.price)} FCFA</b></span>
                    <span className={styles.verified}>✓ Vendeur vérifié</span>
                    <span className={styles.sellerMeta}><span>★ {seller.rating} · {seller.sales}</span><span>Retours 5 jours</span></span>
                    <span className={styles.delivery}><Icon name="truck" /><span><strong>{seller.delivery}</strong><small>{seller.window} à Douala</small></span></span>
                  </span>
                  {seller.recommended ? <em>Meilleur choix</em> : null}
                </label>
              ))}
            </div>

            <section className={styles.paymentSummary} aria-live="polite">
              <h3>{selected ? `Détail avec ${selected.name}` : 'Aucune offre disponible'}</h3>
              <dl>
                <div><dt>Produit</dt><dd>{money.format(price)} FCFA</dd></div>
                <div className={styles.deposit}><dt>Acompte maintenant (10 %)</dt><dd>{money.format(totals.deposit)} FCFA</dd></div>
                <div><dt>Reste à la livraison</dt><dd>{money.format(totals.balance)} FCFA</dd></div>
                <div><dt>Frais de livraison</dt><dd>Payés à réception</dd></div>
              </dl>
              <p>ⓘ L’acompte est remboursable avant le déplacement du livreur.</p>
            </section>
            <button type="button" className={styles.primaryButton} disabled={!selected}><Icon name="cart" /> Ajouter au panier</button>
            <button type="button" className={styles.secondaryButton} disabled={!selected}>Acheter maintenant</button>
            <div className={styles.reward}><Icon name="gift" /><span><strong>+1 490 Kati après livraison</strong><small>Vos points fidélité pour de prochains achats.</small></span><a href="#">En savoir plus</a></div>
          </aside>
        </div>

        <section className={styles.details}>
          <div className={styles.tabs} role="tablist" aria-label="Informations produit">
            {['Description', 'Avis produit', 'Vendeurs', 'Livraison & retours'].map((label) => (
              <button type="button" role="tab" aria-selected={tab === label} onClick={() => setTab(label)} key={label}>{label}{label === 'Avis produit' ? ' (128)' : ''}</button>
            ))}
          </div>
          <div className={styles.tabContent} role="tabpanel">
            <div><p className={styles.eyebrow}>{tab}</p><h2>Un choix fiable pour le quotidien</h2><p>{product?.description ?? 'Un smartphone fluide et endurant, contrôlé avant publication. Les caractéristiques sont communes au produit ; le prix, le stock, la livraison et la garantie dépendent du vendeur sélectionné.'}</p></div>
            <div id="avis" className={styles.review}><strong>4,6<span>/5</span></strong><span className={styles.stars}>★★★★★</span><small>128 achats vérifiés</small><blockquote>« Très bon rapport qualité-prix. Livraison suivie et montant restant conforme. »</blockquote></div>
          </div>
        </section>
      </main>

      <footer className={styles.marketFooter}>
        <div className={styles.shell}><strong>KATI<span>HUB</span></strong><p>Achetez auprès de vendeurs vérifiés, en toute confiance.</p><span>© 2026 KatiHub · Douala, Cameroun</span></div>
      </footer>
    </div>
  )
}
