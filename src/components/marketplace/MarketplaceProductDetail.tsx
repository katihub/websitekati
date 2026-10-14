'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useCart } from '@/lib/cart'
import { selectShopRecommendations } from '@/lib/product-recommendations'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import type { MarketplaceProduct } from '@/app/marketplace/apercu/MarketplacePreview'
import styles from './product-detail.module.css'
export type { MarketplaceProduct }

const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
const tabs = ['Description', 'Caractéristiques', 'Avis clients', 'Livraison'] as const
function Icon({ name }: { name: 'cart' | 'heart' | 'truck' | 'shield' | 'return' | 'shop' | 'zoom' | 'arrow' }) {
  const paths = {
    cart: <><path d="M3 4h2l2 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z"/>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    shield: <><path d="m12 2-8 3v6c0 5 4 8 8 11 4-3 8-6 8-11V5Z"/><path d="m8 12 3 3 5-6"/></>,
    return: <><path d="M4 10a8 8 0 0 1 14-4l3 4M21 4v6h-6M20 14a8 8 0 0 1-14 4l-3-4M3 20v-6h6"/></>,
    shop: <><path d="M4 10v11h16V10M2 10l3-7h14l3 7M2 10c0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0M9 21v-7h6v7"/></>,
    zoom: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6M10 7v6"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  }
  return <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function MarketplaceProductDetail({ product: item, recommendations = {}, preferredShop }: { product: MarketplaceProduct; recommendations?: Record<string, OffreMarketplace[]>; preferredShop?: string }) {
  const [offerId, setOfferId] = useState(item.offres.find(offer => offer.boutique.slug === preferredShop && offer.disponible > 0 && offer.prixFcfa !== null)?.id ?? item.offres.find(offer => offer.disponible > 0 && offer.prixFcfa !== null)?.id ?? item.offres[0]?.id)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<(typeof tabs)[number]>('Description')
  const [favorite, setFavorite] = useState(false)
  const [notice, setNotice] = useState('')
  const zoom = useRef<HTMLDialogElement>(null)
  const cart = useCart()
  const selected = item.offres.find(offer => offer.id === offerId) ?? item.offres[0]
  const available = Boolean(selected && selected.disponible > 0 && selected.prixFcfa !== null)
  const quantity = Math.min(qty, selected?.disponible ?? 1, 99)
  const photos = item.images ?? []
  const [photoIndex, setPhotoIndex] = useState(0)
  const photo = photos[Math.min(photoIndex, photos.length - 1)] ?? null
  const illustration = photo?.url ?? (/samsung.*a15/i.test(item.nom) ? '/marketplace-telephone-kati.png' : null)
  const photoAlt = photo ? photo.texteAlternatif || `${item.nom}, photo ${photoIndex + 1}` : `Illustration de ${item.nom}`
  // Une boutique peut proposer plusieurs variantes du produit : le premier choix
  // est la boutique, le second la variante chez elle.
  const shops = [...new Map(item.offres.map(offer => [offer.boutique.slug, offer.boutique])).values()]
  const variants = selected ? [...item.offres.filter(offer => offer.boutique.slug === selected.boutique.slug)].sort((a, b) => (a.ordreVariante ?? 0) - (b.ordreVariante ?? 0)) : []
  const showVariants = variants.length > 1 || Boolean(selected?.libelleVariante)
  const related = selected ? selectShopRecommendations(recommendations[selected.boutique.slug] ?? [], selected.boutique.slug, item.slug, item.categorie) : []

  function addToCart() {
    if (!available || !selected || selected.prixFcfa === null) return
    cart.add({ slug: item.slug, name: selected.titre ?? (selected.libelleVariante ? `${item.nom} — ${selected.libelleVariante}` : item.nom), price: selected.prixFcfa, image: photos[0]?.url ?? illustration, offerId: selected.id, boutiqueId: selected.boutique.id, boutiqueNom: selected.boutique.nom, modesLivraison: selected.modesLivraison, villesLivraison: selected.villesLivraison }, quantity)
    setNotice(`${quantity} article(s) de ${selected.boutique.nom} ajouté(s) au panier.`)
  }

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span>›</span><Link href="/catalogue">Catalogue</Link>{item.categorie ? <><span>›</span><Link href={`/recherche?q=${encodeURIComponent(item.categorie)}`}>{item.categorie}</Link></> : null}<span>›</span><span aria-current="page">{item.nom}</span></nav>
    <div className={styles.layout}>
      <section className={styles.gallery} aria-label="Visuel du produit"><div className={styles.imageStage}>{illustration ? <Image src={illustration} alt={photoAlt} fill priority sizes="(max-width: 700px) 90vw, (max-width: 1200px) 40vw, 32vw" /> : <div className={styles.noImage}><span>{item.marque ?? item.categorie ?? 'KatiHub'}</span><p>Photos à venir</p></div>}{illustration ? <button className={styles.zoom} aria-label="Agrandir le visuel" onClick={() => zoom.current?.showModal()}><Icon name="zoom"/></button> : null}</div>{photos.length > 1 ? <ul className={styles.thumbs} aria-label="Autres photos">{photos.map((image, index) => <li key={image.id}><button type="button" aria-label={`Afficher la photo ${index + 1}`} aria-current={index === photoIndex} onClick={() => setPhotoIndex(index)}><Image src={image.url} alt="" width={72} height={72} /></button></li>)}</ul> : null}<p className={styles.caption}>{photos.length ? 'Photos publiées par la boutique et vérifiées par KatiHub.' : illustration ? 'Visuel illustratif · confirmez le modèle et la couleur auprès du vendeur.' : 'La boutique n’a pas encore publié de photos pour ce produit.'}</p></section>
      <section className={styles.info} aria-labelledby="product-title"><div className={styles.productHeading}><span>{item.categorie ?? 'Produit marketplace'}</span><b>{item.marque}</b></div><h1 id="product-title">{item.nom}</h1><p className={styles.subtitle}>{selected?.titre && selected.titre !== item.nom ? selected.titre : 'Découvrez l’offre de votre boutique et ses conditions de livraison.'}</p><button className={styles.reviewLink} onClick={() => {setTab('Avis clients'); document.getElementById('product-panel')?.scrollIntoView({block:'center'})}}>Avis clients <span>· Aucun avis publié</span></button>
        <div className={styles.price}><strong>{selected?.prixFcfa !== null && selected?.prixFcfa !== undefined ? money(selected.prixFcfa) : 'Prix sur demande'}</strong>{selected?.prixReferenceFcfa && selected.prixFcfa !== null && selected.prixReferenceFcfa > selected.prixFcfa ? <s aria-label={`Prix habituel ${money(selected.prixReferenceFcfa)}`}>{money(selected.prixReferenceFcfa)}</s> : null}</div><p className={styles.stock} data-available={Boolean(selected?.disponible)}><i/>{selected?.disponible ? 'En stock' : 'Indisponible'}<span>Vendu par {selected ? <Link href={`/boutiques/${selected.boutique.slug}`}>{selected.boutique.nom}</Link> : '—'}</span></p>
        <div className={styles.offerFacts}><div><Icon name="shop"/><span>Boutique locale<strong>{selected?.boutique.nom ?? 'Aucune offre'}</strong></span></div><div><Icon name="truck"/><span>Livraison<strong>{selected?.delaiMaxJours !== null && selected?.delaiMaxJours !== undefined ? `Sous ${selected.delaiMaxJours} jour(s)` : 'À confirmer'}</strong></span></div></div>
        {shops.length > 1 ? <label className={styles.sellerSelect}>Choisir la boutique<select value={selected?.boutique.slug} onChange={event => {const next = item.offres.find(offer => offer.boutique.slug === event.target.value && offer.disponible > 0 && offer.prixFcfa !== null) ?? item.offres.find(offer => offer.boutique.slug === event.target.value); if (next) setOfferId(next.id); setQty(1); setNotice('')}}>{shops.map(shop => {const best = item.offres.filter(offer => offer.boutique.slug === shop.slug && offer.prixFcfa !== null).map(offer => offer.prixFcfa!).sort((a, b) => a - b)[0]; return <option key={shop.slug} value={shop.slug}>{shop.nom} · {best !== undefined ? `${item.offres.filter(offer => offer.boutique.slug === shop.slug).length > 1 ? 'dès ' : ''}${money(best)}` : 'Prix sur demande'}</option>})}</select></label> : null}
        {showVariants ? <fieldset className={styles.variants}><legend>Variante{selected?.libelleVariante ? <> : <strong>{selected.libelleVariante}</strong></> : null}</legend><div>{variants.map(offer => <button key={offer.id} type="button" aria-pressed={offer.id === selected?.id} data-unavailable={offer.disponible === 0 || offer.prixFcfa === null} onClick={() => {setOfferId(offer.id); setQty(1); setNotice('')}}><span>{offer.libelleVariante ?? 'Standard'}</span><small>{offer.prixFcfa !== null ? money(offer.prixFcfa) : 'Prix sur demande'}{offer.disponible === 0 ? ' · Épuisé' : ''}</small></button>)}</div></fieldset> : null}
        <div className={styles.purchase}><div className={styles.quantity}><span>Quantité</span><div><button aria-label="Diminuer la quantité" disabled={qty <= 1} onClick={() => setQty(value => Math.max(1,value-1))}>−</button><output aria-live="polite">{Math.max(1,quantity)}</output><button aria-label="Augmenter la quantité" disabled={!available || quantity >= Math.min(selected?.disponible ?? 0,99)} onClick={() => setQty(value => value+1)}>+</button></div></div><button className={styles.favorite} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={favorite} onClick={() => setFavorite(value => !value)}><Icon name="heart"/></button><button className={styles.add} disabled={!available} onClick={addToCart}><Icon name="cart"/>Ajouter au panier</button></div><p className={styles.status} role="status">{notice || (selected?.disponible ? `${selected.disponible} unité(s) disponible(s) chez ce vendeur.` : 'Cette offre ne peut pas être ajoutée au panier.')}</p><div className={styles.assurance}><Icon name="shield"/><span>Votre panier conserve la boutique choisie. Les prix et disponibilités sont revérifiés à la commande.</span></div>
      </section>
      <aside className={styles.sidebar}><section className={styles.panel}><h2><Icon name="truck"/>Livraison & services</h2><div className={styles.service}><Icon name="truck"/><div><h3>{selected?.modesLivraison.includes('katihub') ? 'Livraison KatiHub' : 'Livraison du vendeur'}</h3><p>{selected?.delaiMaxJours !== null && selected?.delaiMaxJours !== undefined ? `Sous ${selected.delaiMaxJours} jour(s)` : 'Délai à confirmer'}</p><small>{selected?.villesLivraison.join(', ') || 'Zone à confirmer auprès du vendeur'}</small></div></div><div className={styles.service}><Icon name="return"/><div><h3>Retours & assistance</h3><p>Consultez les conditions applicables à votre commande.</p><Link href="/contact">Contacter l’équipe KatiHub</Link></div></div><div className={styles.service}><Icon name="shield"/><div><h3>Paiement sécurisé</h3><p>Les moyens de paiement disponibles sont présentés à la commande.</p></div></div></section>{selected ? <section className={styles.panel}><h2><Icon name="shop"/>Vendu par</h2><div className={styles.sellerProfile}><span className={styles.avatar}>{selected.boutique.nom.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><div><h3>{selected.boutique.nom}</h3><p>Boutique sur KatiHub</p><small>{selected.villesLivraison[0] ?? 'Cameroun'}</small></div></div><Link className={styles.shopLink} href={`/boutiques/${selected.boutique.slug}`}>Voir la boutique<Icon name="arrow"/></Link></section> : null}</aside>
      <section className={styles.details}><div className={styles.tabs} role="tablist" aria-label="Informations produit">{tabs.map((label,index) => <button key={label} id={`product-tab-${index}`} role="tab" aria-controls="product-panel" aria-selected={tab === label} tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next]);document.getElementById(`product-tab-${next}`)?.focus()}}}>{label}</button>)}</div><div className={styles.tabContent} id="product-panel" role="tabpanel" aria-labelledby={`product-tab-${tabs.indexOf(tab)}`} tabIndex={0}>
        {tab === 'Description' ? <><h2>À propos de {item.nom}</h2><p>{item.description ?? 'La description détaillée sera publiée par la boutique. Contactez le vendeur pour préciser vos besoins avant de commander.'}</p></> : null}
        {tab === 'Caractéristiques' ? <><h2>Informations produit</h2><dl className={styles.specs}><div><dt>Marque</dt><dd>{item.marque ?? 'Non renseignée'}</dd></div><div><dt>Catégorie</dt><dd>{item.categorie ?? 'Non renseignée'}</dd></div><div><dt>Référence</dt><dd>{item.nom}</dd></div>{Object.entries(selected?.attributsVariante ?? {}).map(([nom, valeur]) => <div key={nom}><dt>{nom}</dt><dd>{valeur}</dd></div>)}</dl><p>Confirmez les caractéristiques détaillées et les variantes disponibles auprès de la boutique.</p></> : null}
        {tab === 'Avis clients' ? <><h2>Les avis de vos prochains achats</h2><p>Aucun avis client n’est encore publié pour ce produit.</p></> : null}
        {tab === 'Livraison' ? <><h2>Livraison avec {selected?.boutique.nom ?? 'votre vendeur'}</h2><p>Zones proposées : {selected?.villesLivraison.join(', ') || 'à confirmer'}. {selected?.delaiMaxJours !== null && selected?.delaiMaxJours !== undefined ? `Délai maximum annoncé : ${selected.delaiMaxJours} jour(s).` : 'Le délai sera confirmé avec la boutique.'}</p><p>Les frais et modalités applicables sont confirmés avant la validation de votre commande.</p></> : null}
      </div></section>
    </div>
    {selected ? <section className={styles.related} data-recommendation-shop={selected.boutique.slug}><header><div><h2>À découvrir chez {selected.boutique.nom}</h2><p>Complétez votre sélection dans la même boutique.</p></div><Link href={`/boutiques/${selected.boutique.slug}`}>Voir la boutique<Icon name="arrow"/></Link></header>{related.length ? <div className={styles.relatedGrid}>{related.map(offer => <Link className={styles.relatedItem} key={offer.id} href={`/marketplace/produits/${offer.produit.slug}?boutique=${encodeURIComponent(selected.boutique.slug)}`}><span className={styles.relatedVisual}><Icon name="shop"/></span><div><h3>{offer.titre ?? offer.produit.nom}</h3><small>{offer.boutique.nom}</small><strong>{offer.prixFcfa === null ? 'Prix sur demande' : money(offer.prixFcfa)}</strong></div><Icon name="arrow"/></Link>)}</div> : <p className={styles.empty}>Aucun autre produit disponible dans cette boutique pour le moment.</p>}</section> : null}
    <dialog ref={zoom} className={styles.zoomDialog} onClick={event=>{if(event.target===event.currentTarget)zoom.current?.close()}}><button autoFocus onClick={()=>zoom.current?.close()} aria-label="Fermer le visuel">×</button>{illustration ? <Image src={illustration} alt={photoAlt} width={1000} height={1000}/> : null}</dialog>
  </main>
}
