'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartLineKey, useCart } from '@/lib/cart'
import { DESCRIPTION_MODE, LIBELLE_MODE } from '@/lib/modes-livraison'
import { selectShopRecommendations } from '@/lib/product-recommendations'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import type { MarketplaceProduct } from '@/app/marketplace/apercu/MarketplacePreview'
import styles from './product-detail.module.css'
import { BoutonDemandeDevis } from './devis/BoutonDemandeDevis'
import { AvisBoutique } from './AvisBoutique'
import { useListeClient } from '@/lib/listes-client'
import { libelleDisponibilite, minimumDe, surCommande } from '@/lib/stock'
import { GainKati } from './kati/GainKati'
export type { MarketplaceProduct }

const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
/** LA FICHE MONTRE LA VILLE DE LA BOUTIQUE, PAS SON NOM : le client choisit d'ou part son colis. */
const dureeGarantie = (mois: number) => mois <= 0 ? 'Sans garantie' : mois % 12 === 0 ? (mois === 12 ? '1 an' : `${mois / 12} ans`) : `${mois} mois`
const villeDe = (boutique: { ville?: string | null } | undefined) => boutique?.ville || 'Cameroun'
const tabs = ['Description', 'Fiche technique', 'Avis clients', 'Livraison'] as const
/** « Ecran : 6,5 pouces » devient une ligne de tableau ; une ligne sans « : » reste du texte. */
const lignesFiche = (texte: string) => texte.split('\n').map(ligne => ligne.trim()).filter(Boolean).map(ligne => {
  const i = ligne.indexOf(':')
  return i > 0 && i < 60 ? { nom: ligne.slice(0, i).trim(), valeur: ligne.slice(i + 1).trim() } : { nom: null, valeur: ligne }
})
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
  const [qty, setQty] = useState(() => minimumDe(item.offres.find(offer => offer.boutique.slug === preferredShop && offer.disponible > 0 && offer.prixFcfa !== null) ?? item.offres.find(offer => offer.disponible > 0 && offer.prixFcfa !== null) ?? item.offres[0]))
  const [tab, setTab] = useState<(typeof tabs)[number]>('Description')
  const favoris = useListeClient('favori')
  const [notice, setNotice] = useState('')
  const zoom = useRef<HTMLDialogElement>(null)
  const cart = useCart()
  const router = useRouter()
  const selected = item.offres.find(offer => offer.id === offerId) ?? item.offres[0]
  // Le MOQ est un plancher ; sans suivi de stock, seul le plafond de 99 (ou le MOQ s'il est plus haut) borne.
  const minimum = minimumDe(selected)
  const maximum = Math.min(selected?.disponible ?? 0, Math.max(99, minimum))
  const available = Boolean(selected && selected.disponible >= minimum && selected.prixFcfa !== null)
  const quantity = Math.max(minimum, Math.min(qty, maximum))
  const choisir = (id: string) => { setOfferId(id); setQty(minimumDe(item.offres.find(offer => offer.id === id))); setNotice('') }
  const photos = item.images ?? []
  const [photoIndex, setPhotoIndex] = useState(0)
  const photo = photos[Math.min(photoIndex, photos.length - 1)] ?? null
  const illustration = photo?.url ?? null
  const photoAlt = photo ? photo.texteAlternatif || `${item.nom}, photo ${photoIndex + 1}` : `Illustration de ${item.nom}`
  // Une boutique peut proposer plusieurs variantes du produit : le premier choix
  // est la boutique, le second la variante chez elle.
  const shops = [...new Map(item.offres.map(offer => [offer.boutique.slug, offer.boutique])).values()]
  const variants = selected ? [...item.offres.filter(offer => offer.boutique.slug === selected.boutique.slug)].sort((a, b) => (a.ordreVariante ?? 0) - (b.ordreVariante ?? 0)) : []
  const showVariants = variants.length > 1 || Boolean(selected?.libelleVariante)
  const related = selected ? selectShopRecommendations(recommendations[selected.boutique.slug] ?? [], selected.boutique.slug, item.slug, item.categorie) : []

  const favorite = Boolean(selected && favoris.contient(selected.id))
  function basculerFavori() {
    if (!selected) return
    if (favorite) return favoris.retirer(selected.id)
    favoris.ajouter({
      offreId: selected.id, slug: item.slug, nom: selected.libelleVariante ? `${item.nom} — ${selected.libelleVariante}` : item.nom, prixFcfa: selected.prixFcfa,
      image: photos[0]?.url ?? null, boutiqueId: selected.boutique.id, boutiqueNom: selected.boutique.nom, boutiqueSlug: selected.boutique.slug, quantite: 1,
    })
  }

  function ligneChoisie() {
    if (!available || !selected || selected.prixFcfa === null) return null
    return { slug: item.slug, name: selected.titre ?? (selected.libelleVariante ? `${item.nom} — ${selected.libelleVariante}` : item.nom), price: selected.prixFcfa, image: photos[0]?.url ?? illustration, offerId: selected.id, boutiqueId: selected.boutique.id, boutiqueNom: selected.boutique.nom, modesLivraison: selected.modesLivraison, villesLivraison: selected.villesLivraison, quantiteMinimale: minimum }
  }

  function addToCart() {
    const ligne = ligneChoisie()
    if (!ligne || !selected) return
    cart.add(ligne, quantity)
    setNotice(`${quantity} article(s) ajouté(s) au panier, depuis ${villeDe(selected.boutique)}.`)
  }

  /** « Acheter maintenant » : la commande de cet article seul, a la quantite choisie, sans passer par le panier. */
  function buyNow() {
    const ligne = ligneChoisie()
    if (!ligne) return
    const cle = cartLineKey(ligne)
    cart.add(ligne, quantity)
    cart.setQty(cle, quantity)
    cart.close()
    router.push(`/marketplace/commande?articles=${encodeURIComponent(cle)}`)
  }

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span>›</span><Link href="/catalogue">Catalogue</Link>{item.categorieDetail ? <>{item.categorieDetail.parent ? <><span>›</span><Link href={`/categories/${item.categorieDetail.parent.slug}`}>{item.categorieDetail.parent.nom}</Link></> : null}<span>›</span><Link href={`/categories/${item.categorieDetail.slug}`}>{item.categorieDetail.nom}</Link></> : item.categorie ? <><span>›</span><Link href={`/recherche?q=${encodeURIComponent(item.categorie)}`}>{item.categorie}</Link></> : null}<span>›</span><span aria-current="page">{item.nom}</span></nav>
    <div className={styles.layout}>
      <section className={styles.gallery} aria-label="Visuel du produit"><div className={styles.imageStage}>{illustration ? <Image src={illustration} alt={photoAlt} fill priority sizes="(max-width: 700px) 90vw, (max-width: 1200px) 40vw, 32vw" /> : <div className={styles.noImage}><span>{item.marque ?? item.categorie ?? 'KatiHub'}</span><p>Photos à venir</p></div>}{illustration ? <button className={styles.zoom} aria-label="Agrandir le visuel" onClick={() => zoom.current?.showModal()}><Icon name="zoom"/></button> : null}</div>{photos.length > 1 ? <ul className={styles.thumbs} aria-label="Autres photos">{photos.map((image, index) => <li key={image.id}><button type="button" aria-label={`Afficher la photo ${index + 1}`} aria-current={index === photoIndex} onClick={() => setPhotoIndex(index)}><Image src={image.url} alt="" width={72} height={72} /></button></li>)}</ul> : null}<p className={styles.caption}>{photos.length ? 'Photos publiées par la boutique et vérifiées par KatiHub.' : illustration ? 'Visuel illustratif · confirmez le modèle et la couleur auprès du vendeur.' : 'La boutique n’a pas encore publié de photos pour ce produit.'}</p></section>
      <section className={styles.info} aria-labelledby="product-title"><div className={styles.productHeading}><span>{item.categorie ?? 'Produit marketplace'}</span><b>{item.marque}</b></div><h1 id="product-title">{item.nom}</h1>{selected?.verifieParKatiLe ? <p className={styles.verified} title="KatiHub a reçu cet article de la boutique et l’a testé avant de le recommander."><Icon name="shield"/>Vérifié par KatiHub</p> : null}{item.descriptionCourte ? <p className={styles.shortDescription} data-testid="description-courte">{item.descriptionCourte}</p> : <p className={styles.subtitle}>{selected?.titre && selected.titre !== item.nom ? selected.titre : 'Découvrez l’offre de votre boutique et ses conditions de livraison.'}</p>}<button className={styles.reviewLink} onClick={() => {setTab('Avis clients'); document.getElementById('product-panel')?.scrollIntoView({block:'center'})}}>Avis clients <span>· Voir les avis</span></button>
        <div className={styles.price}><strong>{selected?.prixFcfa !== null && selected?.prixFcfa !== undefined ? money(selected.prixFcfa) : 'Prix sur demande'}</strong>{selected?.prixReferenceFcfa && selected.prixFcfa !== null && selected.prixReferenceFcfa > selected.prixFcfa ? <s aria-label={`Prix habituel ${money(selected.prixReferenceFcfa)}`}>{money(selected.prixReferenceFcfa)}</s> : null}</div><p className={styles.stock} data-available={Boolean(selected?.disponible)}><i/>{surCommande(selected?.disponible) ? 'Disponible' : selected?.disponible ? 'En stock' : 'Indisponible'}<span>Boutique à {selected ? <Link href={`/boutiques/${selected.boutique.slug}`}>{villeDe(selected.boutique)}</Link> : '—'}</span></p>
        <div className={styles.offerFacts}><div><Icon name="shop"/><span>Ville de la boutique<strong>{selected ? villeDe(selected.boutique) : 'Aucune offre'}</strong></span></div><div><Icon name="truck"/><span>Livraison<strong>{selected?.delaiMaxJours !== null && selected?.delaiMaxJours !== undefined ? `Sous ${selected.delaiMaxJours} jour(s)` : 'À confirmer'}</strong></span></div></div>
        {shops.length > 1 ? <label className={styles.sellerSelect}>Choisir la boutique<select value={selected?.boutique.slug} onChange={event => {const next = item.offres.find(offer => offer.boutique.slug === event.target.value && offer.disponible > 0 && offer.prixFcfa !== null) ?? item.offres.find(offer => offer.boutique.slug === event.target.value); if (next) choisir(next.id)}}>{shops.map(shop => {const best = item.offres.filter(offer => offer.boutique.slug === shop.slug && offer.prixFcfa !== null).map(offer => offer.prixFcfa!).sort((a, b) => a - b)[0]; return <option key={shop.slug} value={shop.slug}>{villeDe(shop)} · {best !== undefined ? `${item.offres.filter(offer => offer.boutique.slug === shop.slug).length > 1 ? 'dès ' : ''}${money(best)}` : 'Prix sur demande'}</option>})}</select></label> : null}
        {showVariants ? <fieldset className={styles.variants}><legend>Variante{selected?.libelleVariante ? <> : <strong>{selected.libelleVariante}</strong></> : null}</legend><div>{variants.map(offer => <button key={offer.id} type="button" aria-pressed={offer.id === selected?.id} data-unavailable={offer.disponible === 0 || offer.prixFcfa === null} onClick={() => choisir(offer.id)}><span>{offer.libelleVariante ?? 'Standard'}</span><small>{offer.prixFcfa !== null ? money(offer.prixFcfa) : 'Prix sur demande'}{offer.disponible === 0 ? ' · Épuisé' : ''}</small></button>)}</div></fieldset> : null}
        <div className={styles.purchase}><div className={styles.quantity}><span>Quantité</span><div><button aria-label="Diminuer la quantité" disabled={quantity <= minimum} onClick={() => setQty(Math.max(minimum, quantity - 1))}>−</button><output aria-live="polite">{quantity}</output><button aria-label="Augmenter la quantité" disabled={!available || quantity >= maximum} onClick={() => setQty(quantity + 1)}>+</button></div></div><button className={styles.favorite} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={favorite} onClick={basculerFavori}><Icon name="heart"/></button><button className={styles.add} disabled={!available} onClick={addToCart}><Icon name="cart"/>Ajouter au panier</button><button className={styles.buyNow} disabled={!available} onClick={buyNow} data-testid="acheter-maintenant">Acheter maintenant<Icon name="arrow"/></button></div>{selected && selected.prixFcfa !== null ? <BoutonDemandeDevis className={styles.devis} lignes={[{ offreId: selected.id, quantite: quantity, nom: selected.libelleVariante ? `${item.nom} — ${selected.libelleVariante}` : item.nom }]} libelle="Demander un devis (quantités entreprise)"/> : null}{available && selected?.prixFcfa ? <GainKati montantFcfa={selected.prixFcfa * quantity} className={styles.kati}/> : null}{minimum > 1 ? <p className={styles.moq} data-testid="moq">Minimum de commande : {minimum} unités, au panier comme en devis.</p> : null}<p className={styles.status} role="status">{notice || (available ? `${libelleDisponibilite(selected?.disponible)} chez ce vendeur.` : selected?.disponible ? `Moins de ${minimum} unités disponibles : demandez un devis à la boutique.` : 'Cette offre ne peut pas être ajoutée au panier.')}</p><div className={styles.assurance}><Icon name="shield"/><span>Votre panier conserve la boutique choisie. Les prix et disponibilités sont revérifiés à la commande.</span></div>
      </section>
      <aside className={styles.sidebar}><section className={styles.panel}><h2><Icon name="truck"/>Livraison & services</h2><div className={styles.service}><Icon name="truck"/><div><h3>{selected?.modesLivraison.length ? selected.modesLivraison.map(mode => LIBELLE_MODE[mode] ?? mode).join(' · ') : 'Livraison à confirmer'}</h3><p>{selected?.delaiMaxJours !== null && selected?.delaiMaxJours !== undefined ? `Sous ${selected.delaiMaxJours} jour(s)` : 'Délai à confirmer'}</p><small>{selected?.villesLivraison.join(', ') || 'Zone à confirmer auprès du vendeur'}</small>{selected?.modesLivraison.includes('retrait') && selected.boutique.adresseRetrait ? <small data-testid="retrait-boutique">Retrait gratuit : {selected.boutique.adresseRetrait}</small> : null}{selected?.modesLivraison.includes('agence') ? <small>{DESCRIPTION_MODE.agence}</small> : null}</div></div><div className={styles.service}><Icon name="return"/><div><h3>Retours & assistance</h3><p>Consultez les conditions applicables à votre commande.</p><Link href="/contact">Contacter l’équipe KatiHub</Link></div></div><div className={styles.service}><Icon name="shield"/><div><h3>Paiement sécurisé</h3><p>Les moyens de paiement disponibles sont présentés à la commande.</p></div></div></section>{selected ? <section className={styles.panel}><h2><Icon name="shop"/>La boutique</h2><div className={styles.sellerProfile}><span className={styles.avatar}>{villeDe(selected.boutique).slice(0,2).toUpperCase()}</span><div><h3>Boutique à {villeDe(selected.boutique)}</h3><p>Boutique vérifiée sur KatiHub</p><small>{selected.villesLivraison[0] ?? 'Cameroun'}</small></div></div><Link className={styles.shopLink} href={`/boutiques/${selected.boutique.slug}`}>Voir la boutique<Icon name="arrow"/></Link></section> : null}</aside>
      <section className={styles.details}><div className={styles.tabs} role="tablist" aria-label="Informations produit">{tabs.map((label,index) => <button key={label} id={`product-tab-${index}`} role="tab" aria-controls="product-panel" aria-selected={tab === label} tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next]);document.getElementById(`product-tab-${next}`)?.focus()}}}>{label}</button>)}</div><div className={styles.tabContent} id="product-panel" role="tabpanel" aria-labelledby={`product-tab-${tabs.indexOf(tab)}`} tabIndex={0}>
        {tab === 'Description' ? <><h2>À propos de {item.nom}</h2><p>{item.description ?? 'La description détaillée sera publiée par la boutique. Contactez le vendeur pour préciser vos besoins avant de commander.'}</p></> : null}
        {tab === 'Fiche technique' ? <><h2>Fiche technique</h2>{item.ficheTechnique ? <dl className={styles.ficheTechnique} data-testid="fiche-technique">{lignesFiche(item.ficheTechnique).map((ligne, index) => ligne.nom ? <div key={index}><dt>{ligne.nom}</dt><dd>{ligne.valeur}</dd></div> : <div key={index} className={styles.ficheNote}><dd>{ligne.valeur}</dd></div>)}</dl> : null}{item.ficheTechniquePdfUrl ? <p><a className={styles.fichePdf} href={item.ficheTechniquePdfUrl} target="_blank" rel="noopener noreferrer" download>Télécharger la fiche technique (PDF)</a></p> : null}<h3 className={styles.ficheSousTitre}>Informations de l’offre</h3><dl className={styles.specs}><div><dt>Marque</dt><dd>{item.marque ?? 'Non renseignée'}</dd></div><div><dt>Catégorie</dt><dd>{item.categorieDetail ? (item.categorieDetail.parent ? `${item.categorieDetail.parent.nom} › ${item.categorieDetail.nom}` : item.categorieDetail.nom) : item.categorie ?? 'Non renseignée'}</dd></div>{typeof selected?.garantieMois === 'number' ? <div><dt>Garantie de cette offre</dt><dd>{dureeGarantie(selected.garantieMois)}</dd></div> : null}{item.categorieDetail?.garantieMinimaleMois ? <div><dt>Garantie minimale KatiHub</dt><dd>{item.categorieDetail.garantie}, pour tous les vendeurs de cette catégorie</dd></div> : null}<div><dt>Référence</dt><dd>{item.nom}</dd></div>{Object.entries(selected?.attributsVariante ?? {}).map(([nom, valeur]) => <div key={nom}><dt>{nom}</dt><dd>{valeur}</dd></div>)}</dl>{!item.ficheTechnique && !item.ficheTechniquePdfUrl ? <p>La boutique n’a pas encore publié de fiche technique : confirmez les caractéristiques détaillées auprès d’elle.</p> : null}</> : null}
        {tab === 'Avis clients' ? <AvisBoutique slug={item.slug} nom={item.nom} cible="produit" /> : null}
        {tab === 'Livraison' ? <><h2>Livraison depuis {selected ? villeDe(selected.boutique) : 'la boutique'}</h2><p>Zones proposées : {selected?.villesLivraison.join(', ') || 'à confirmer'}. {selected?.delaiMaxJours !== null && selected?.delaiMaxJours !== undefined ? `Délai maximum annoncé : ${selected.delaiMaxJours} jour(s).` : 'Le délai sera confirmé avec la boutique.'}</p><p>Les frais et modalités applicables sont confirmés avant la validation de votre commande.</p></> : null}
      </div></section>
    </div>
    {selected ? <section className={styles.related} data-recommendation-shop={selected.boutique.slug}><header><div><h2>À découvrir dans cette boutique</h2><p>Complétez votre sélection dans la même boutique.</p></div><Link href={`/boutiques/${selected.boutique.slug}`}>Voir la boutique<Icon name="arrow"/></Link></header>{related.length ? <div className={styles.relatedGrid}>{related.map(offer => <Link className={styles.relatedItem} key={offer.id} href={`/marketplace/produits/${offer.produit.slug}?boutique=${encodeURIComponent(selected.boutique.slug)}`}><span className={styles.relatedVisual}><Icon name="shop"/></span><div><h3>{offer.titre ?? offer.produit.nom}</h3><small>{villeDe(selected.boutique)}</small><strong>{offer.prixFcfa === null ? 'Prix sur demande' : money(offer.prixFcfa)}</strong></div><Icon name="arrow"/></Link>)}</div> : <p className={styles.empty}>Aucun autre produit disponible dans cette boutique pour le moment.</p>}</section> : null}
    <dialog ref={zoom} className={styles.zoomDialog} onClick={event=>{if(event.target===event.currentTarget)zoom.current?.close()}}><button autoFocus onClick={()=>zoom.current?.close()} aria-label="Fermer le visuel">×</button>{illustration ? <Image src={illustration} alt={photoAlt} width={1000} height={1000}/> : null}</dialog>
  </main>
}
