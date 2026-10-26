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
import { BoutonPlusieursFois } from './plusieurs-fois/BoutonPlusieursFois'
import { imageProduit } from '@/lib/image-produit'
import { katiPourMontant, usePolitiqueKati } from '@/lib/kati'
import { libelleDelaiMarketplace } from '@/lib/marketplace-delivery'
import { productCardSpecs } from '@/lib/product-card-specs'
import { useMarketplaceLanguage } from '@/lib/language'
export type { MarketplaceProduct }

const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
const dureeGarantie = (mois: number, en = false) => mois <= 0 ? (en ? 'No warranty' : 'Sans garantie') : mois % 12 === 0 ? (mois === 12 ? (en ? '1 year' : '1 an') : `${mois / 12} ${en ? 'years' : 'ans'}`) : `${mois} ${en ? 'months' : 'mois'}`
const villeDe = (boutique: { ville?: string | null } | undefined) => boutique?.ville || 'Cameroun'
const villesDeBoutique = (boutique: { ville?: string | null; villesLivraison?: string[] } | undefined) => {
  const villes = boutique?.villesLivraison?.map(ville => ville.trim()).filter(Boolean) ?? []
  return [...new Map(villes.map(ville => [ville.toLocaleLowerCase('fr'), ville])).values()].join(', ') || villeDe(boutique)
}
const tabs = ['Description', 'Fiche technique', 'Avis clients', 'Livraison'] as const
type VarianteProduit = MarketplaceProduct['offres'][number]
type GroupeVariante = { nom: string; valeurs: Array<{ valeur: string; offres: VarianteProduit[] }> }

/** Regroupe les combinaisons vendeurs en choix lisibles : Memoire, Stockage, Couleur, etc. */
function groupesDeVariantes(variantes: VarianteProduit[]): GroupeVariante[] {
  const groupes = new Map<string, Map<string, VarianteProduit[]>>()
  for (const variante of variantes) {
    for (const [nomBrut, valeurBrute] of Object.entries(variante.attributsVariante ?? {})) {
      const nom = nomBrut.trim()
      const valeur = valeurBrute.trim()
      if (!nom || !valeur) continue
      const valeurs = groupes.get(nom) ?? new Map<string, VarianteProduit[]>()
      valeurs.set(valeur, [...(valeurs.get(valeur) ?? []), variante])
      groupes.set(nom, valeurs)
    }
  }
  return [...groupes].map(([nom, valeurs]) => ({
    nom,
    valeurs: [...valeurs].map(([valeur, offres]) => ({ valeur, offres })),
  }))
}

/** Choisit la meilleure combinaison disponible tout en conservant les autres choix du client. */
function variantePourValeur(variantes: VarianteProduit[], actuelle: VarianteProduit | undefined, nom: string, valeur: string) {
  const candidats = variantes.filter(variante => variante.attributsVariante?.[nom]?.trim() === valeur)
  const attributsActuels = actuelle?.attributsVariante ?? {}
  let meilleure: VarianteProduit | undefined
  let meilleurScore = -1
  for (const candidat of candidats) {
    let score = candidat.disponible > 0 && candidat.prixFcfa !== null ? 1_000 : 0
    for (const [autreNom, autreValeur] of Object.entries(attributsActuels)) {
      if (autreNom !== nom && candidat.attributsVariante?.[autreNom] === autreValeur) score += 1
    }
    if (score > meilleurScore) {
      meilleure = candidat
      meilleurScore = score
    }
  }
  return meilleure
}

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

export function MarketplaceProductDetail({ product: item, recommendations = {}, preferredShop, accessories = [] }: { product: MarketplaceProduct; recommendations?: Record<string, OffreMarketplace[]>; preferredShop?: string; accessories?: OffreMarketplace[] }) {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const politiqueKati = usePolitiqueKati()
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
  const photoAlt = photo ? photo.texteAlternatif || `${item.nom}, ${en ? 'photo' : 'photo'} ${photoIndex + 1}` : `${en ? 'Image of' : 'Illustration de'} ${item.nom}`
  // Une boutique peut proposer plusieurs variantes du produit : le premier choix
  // est la boutique, le second la variante chez elle.
  const shops = [...new Map(item.offres.map(offer => [offer.boutique.slug, offer.boutique])).values()]
  const variants = selected ? [...item.offres.filter(offer => offer.boutique.slug === selected.boutique.slug)].sort((a, b) => (a.ordreVariante ?? 0) - (b.ordreVariante ?? 0)) : []
  const showVariants = variants.length > 1 || Boolean(selected?.libelleVariante)
  const variantGroups = groupesDeVariantes(variants)
  const related = selected ? selectShopRecommendations(recommendations[selected.boutique.slug] ?? [], selected.boutique.slug, item.slug, item.categorie) : []
  const garantieMois = Math.max(selected?.garantieMois ?? 0, item.categorieDetail?.garantieMinimaleMois ?? 0)

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
    setNotice(en ? `${quantity} item(s) added to your cart from ${villeDe(selected.boutique)}.` : `${quantity} article(s) ajouté(s) au panier, depuis ${villeDe(selected.boutique)}.`)
  }

  function addAccessory(offer: OffreMarketplace) {
    if (offer.prixFcfa === null || offer.disponible <= 0 || !offer.modesLivraison?.length || !offer.boutique.id) return
    cart.add({ slug: offer.produit.slug, name: offer.titre ?? offer.produit.nom, price: offer.prixFcfa, image: offer.produit.images?.[0]?.url ?? null, offerId: offer.id, boutiqueId: offer.boutique.id, boutiqueNom: offer.boutique.nom, modesLivraison: offer.modesLivraison as never, villesLivraison: offer.villesLivraison ?? [], quantiteMinimale: offer.quantiteMinimale ?? 1 })
    setNotice(en ? `${offer.produit.nom} added to your cart.` : `${offer.produit.nom} ajouté au panier.`)
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
      <nav className={styles.breadcrumb} aria-label={en ? 'Breadcrumb' : 'Fil d’Ariane'}><Link href="/">{en ? 'Home' : 'Accueil'}</Link><span>›</span><Link href="/catalogue">{en ? 'Catalogue' : 'Catalogue'}</Link>{item.categorieDetail ? <>{item.categorieDetail.parent ? <><span>›</span><Link href={`/categories/${item.categorieDetail.parent.slug}`}>{item.categorieDetail.parent.nom}</Link></> : null}<span>›</span><Link href={`/categories/${item.categorieDetail.slug}`}>{item.categorieDetail.nom}</Link></> : item.categorie ? <><span>›</span><Link href={`/recherche?q=${encodeURIComponent(item.categorie)}`}>{item.categorie}</Link></> : null}<span>›</span><span aria-current="page">{item.nom}</span></nav>
    <div className={styles.layout}>
      <section className={styles.gallery} aria-label={en ? 'Product images' : 'Visuel du produit'}><div className={styles.imageStage}>{illustration ? <Image src={illustration} alt={photoAlt} fill priority sizes="(max-width: 700px) 90vw, (max-width: 1200px) 40vw, 32vw" /> : <div className={styles.noImage}><span>{item.marque ?? item.categorie ?? 'KatiMarket'}</span><p>{en ? 'Photos coming soon' : 'Photos à venir'}</p></div>}{illustration ? <button className={styles.zoom} aria-label={en ? 'Enlarge image' : 'Agrandir le visuel'} onClick={() => zoom.current?.showModal()}><Icon name="zoom"/></button> : null}</div>{photos.length > 1 ? <ul className={styles.thumbs} aria-label={en ? 'More photos' : 'Autres photos'}>{photos.map((image, index) => <li key={image.id}><button type="button" aria-label={en ? `Show photo ${index + 1}` : `Afficher la photo ${index + 1}`} aria-current={index === photoIndex} onClick={() => setPhotoIndex(index)}><Image src={image.url} alt="" width={72} height={72} /></button></li>)}</ul> : null}<p className={styles.caption}>{photos.length ? (en ? 'Photos published by the shop and verified by KatiMarket.' : 'Photos publiées par la boutique et vérifiées par KatiMarket.') : illustration ? (en ? 'Illustrative image · confirm the model and colour with the seller.' : 'Visuel illustratif · confirmez le modèle et la couleur auprès du vendeur.') : (en ? 'The shop has not published photos for this product yet.' : 'La boutique n’a pas encore publié de photos pour ce produit.')}</p></section>
      <section className={styles.info} aria-labelledby="product-title"><div className={styles.productHeading}><span>{item.categorie ?? (en ? 'Marketplace product' : 'Produit marketplace')}</span><b>{item.marque}</b></div><h1 id="product-title">{item.nom}</h1>{selected?.verifieParKatiLe ? <p className={styles.verified} title={en ? 'KatiMarket received this item from the shop and tested it before recommending it.' : 'KatiMarket a reçu cet article de la boutique et l’a testé avant de le recommander.'}><Icon name="shield"/>{en ? 'Verified by KatiMarket' : 'Vérifié par KatiMarket'}</p> : null}{item.descriptionCourte ? <p className={styles.shortDescription} data-testid="description-courte">{item.descriptionCourte}</p> : <p className={styles.subtitle}>{selected?.titre && selected.titre !== item.nom ? selected.titre : (en ? 'Explore this shop’s offer and delivery terms.' : 'Découvrez l’offre de votre boutique et ses conditions de livraison.')}</p>}<button className={styles.reviewLink} onClick={() => {setTab('Avis clients'); document.getElementById('product-panel')?.scrollIntoView({block:'center'})}}>{en ? 'Customer reviews' : 'Avis clients'} <span>· {en ? 'See reviews' : 'Voir les avis'}</span></button>
        <div className={styles.price}><strong>{selected?.prixFcfa !== null && selected?.prixFcfa !== undefined ? money(selected.prixFcfa) : (en ? 'Price on request' : 'Prix sur demande')}</strong>{selected?.prixReferenceFcfa && selected.prixFcfa !== null && selected.prixReferenceFcfa > selected.prixFcfa ? <s aria-label={`${en ? 'Regular price' : 'Prix habituel'} ${money(selected.prixReferenceFcfa)}`}>{money(selected.prixReferenceFcfa)}</s> : null}</div><p className={styles.stock} data-available={Boolean(selected?.disponible)}><i/>{surCommande(selected?.disponible) ? (en ? 'Available to order' : 'Disponible') : selected?.disponible ? (en ? 'In stock' : 'En stock') : (en ? 'Unavailable' : 'Indisponible')}<span>{en ? 'Shop in' : 'Boutique à'} {selected ? <Link href={`/boutiques/${selected.boutique.slug}`}>{villesDeBoutique(selected.boutique)}</Link> : '—'}</span></p>
        <div className={styles.offerFacts}><div><Icon name="shop"/><span>{en ? 'Shop locations' : 'Villes de la boutique'}<strong>{selected ? villesDeBoutique(selected.boutique) : (en ? 'No offer' : 'Aucune offre')}</strong></span></div><div><Icon name="truck"/><span>{en ? 'Delivery' : 'Livraison'}<strong>{en ? 'Within 3 days maximum' : 'Sous 3 jours maximum'}</strong></span></div><div className={styles.warrantyFact} data-testid="garantie-produit"><Icon name="shield"/><span>{en ? 'Warranty included' : 'Garantie offerte'}<strong>{garantieMois > 0 ? dureeGarantie(garantieMois, en) : (en ? 'Not applicable' : 'Non applicable')}</strong></span></div></div>
        {shops.length > 1 ? <label className={styles.sellerSelect}>{en ? 'Choose a shop' : 'Choisir la boutique'}<select value={selected?.boutique.slug} onChange={event => {const next = item.offres.find(offer => offer.boutique.slug === event.target.value && offer.disponible > 0 && offer.prixFcfa !== null) ?? item.offres.find(offer => offer.boutique.slug === event.target.value); if (next) choisir(next.id)}}>{shops.map(shop => {const best = item.offres.filter(offer => offer.boutique.slug === shop.slug && offer.prixFcfa !== null).map(offer => offer.prixFcfa!).sort((a, b) => a - b)[0]; return <option key={shop.slug} value={shop.slug}>{villeDe(shop)} · {best !== undefined ? `${item.offres.filter(offer => offer.boutique.slug === shop.slug).length > 1 ? (en ? 'from ' : 'dès ') : ''}${money(best)}` : (en ? 'Price on request' : 'Prix sur demande')}</option>})}</select></label> : null}
        {showVariants ? <section className={styles.variants} aria-labelledby="configuration-title"><header><h2 id="configuration-title">{en ? 'Choose your configuration' : 'Choisissez votre configuration'}</h2>{selected?.libelleVariante ? <strong>{selected.libelleVariante}</strong> : null}</header>{variantGroups.length && variants.every(offre => Object.keys(offre.attributsVariante ?? {}).length > 0) ? <div className={styles.variantGroups}>{variantGroups.map(groupe => <fieldset key={groupe.nom}><legend>{groupe.nom}<strong>{selected?.attributsVariante?.[groupe.nom] ?? ''}</strong></legend><div>{groupe.valeurs.map(({ valeur, offres }) => {const indisponible = offres.every(offre => offre.disponible <= 0 || offre.prixFcfa === null); return <button key={valeur} type="button" aria-pressed={selected?.attributsVariante?.[groupe.nom] === valeur} disabled={indisponible} onClick={() => {const variante = variantePourValeur(variants, selected, groupe.nom, valeur); if (variante) choisir(variante.id)}}><span>{valeur}</span>{indisponible ? <small>{en ? 'Sold out' : 'Épuisé'}</small> : null}</button>})}</div></fieldset>)}</div> : <fieldset className={styles.variantFallback}><legend>{en ? 'Available options' : 'Options disponibles'}</legend><div>{variants.map(offer => <button key={offer.id} type="button" aria-pressed={offer.id === selected?.id} disabled={offer.disponible === 0 || offer.prixFcfa === null} onClick={() => choisir(offer.id)}><span>{offer.libelleVariante ?? (en ? 'Standard' : 'Standard')}</span><small>{offer.prixFcfa !== null ? money(offer.prixFcfa) : (en ? 'Price on request' : 'Prix sur demande')}{offer.disponible === 0 ? (en ? ' · Sold out' : ' · Épuisé') : ''}</small></button>)}</div></fieldset>}</section> : null}
        <div className={styles.purchase}><div className={styles.quantity}><span>{en ? 'Quantity' : 'Quantité'}</span><div><button aria-label={en ? 'Decrease quantity' : 'Diminuer la quantité'} disabled={quantity <= minimum} onClick={() => setQty(Math.max(minimum, quantity - 1))}>−</button><output aria-live="polite">{quantity}</output><button aria-label={en ? 'Increase quantity' : 'Augmenter la quantité'} disabled={!available || quantity >= maximum} onClick={() => setQty(quantity + 1)}>+</button></div></div><button className={styles.favorite} aria-label={favorite ? (en ? 'Remove from favorites' : 'Retirer des favoris') : (en ? 'Add to favorites' : 'Ajouter aux favoris')} aria-pressed={favorite} onClick={basculerFavori}><Icon name="heart"/></button><button className={styles.add} disabled={!available} onClick={addToCart}><Icon name="cart"/>{en ? 'Add to cart' : 'Ajouter au panier'}</button><button className={styles.buyNow} disabled={!available} onClick={buyNow} data-testid="acheter-maintenant">{en ? 'Buy now' : 'Acheter maintenant'}<Icon name="arrow"/></button></div>{minimum > 1 ? <p className={styles.moq} data-testid="moq">{en ? `Minimum order quantity: ${minimum}` : `Quantité minimum commandable : ${minimum}`}</p> : null}{selected && selected.prixFcfa !== null ? <BoutonDemandeDevis className={styles.devis} lignes={[{ offreId: selected.id, quantite: quantity, nom: selected.libelleVariante ? `${item.nom} — ${selected.libelleVariante}` : item.nom }]} libelle={en ? 'Request a business quote' : 'Demander un devis (quantités entreprise)'}/> : null}{available && selected ? <BoutonPlusieursFois offreId={selected.id} quantite={quantity} nom={item.nom} className={styles.plusieursFois}/> : null}{available && selected?.prixFcfa ? <GainKati montantFcfa={selected.prixFcfa * quantity} className={styles.kati} afficherTaux={false}/> : null}<p className={styles.status} role="status">{notice || (available ? `${en ? (surCommande(selected?.disponible) ? 'Available to order' : 'In stock') : libelleDisponibilite(selected?.disponible)} ${en ? 'at this shop.' : 'chez ce vendeur.'}` : selected?.disponible ? (en ? `Fewer than ${minimum} units available: request a quote from the shop.` : `Moins de ${minimum} unités disponibles : demandez un devis à la boutique.`) : (en ? 'This offer cannot be added to the cart.' : 'Cette offre ne peut pas être ajoutée au panier.'))}</p><div className={styles.assurance}><Icon name="shield"/><span>{en ? 'Your cart keeps the selected shop. Prices and availability are checked again at checkout.' : 'Votre panier conserve la boutique choisie. Les prix et disponibilités sont revérifiés à la commande.'}</span></div>
      </section>
      <aside className={styles.sidebar}><section className={styles.panel}><h2><Icon name="truck"/>{en ? 'Delivery & services' : 'Livraison & services'}</h2><div className={styles.service}><Icon name="truck"/><div><h3>{selected?.modesLivraison.length ? selected.modesLivraison.map(mode => LIBELLE_MODE[mode] ?? mode).join(' · ') : (en ? 'Delivery to be confirmed' : 'Livraison à confirmer')}</h3><p>{libelleDelaiMarketplace(selected?.delaiMaxJours)}</p><small>{selected?.villesLivraison.join(', ') || (en ? 'Confirm delivery area with the seller' : 'Zone à confirmer auprès du vendeur')}</small>{selected?.modesLivraison.includes('retrait') && selected.boutique.adresseRetrait ? <small data-testid="retrait-boutique">{en ? 'Free pickup: ' : 'Retrait gratuit : '}{selected.boutique.adresseRetrait}</small> : null}{selected?.modesLivraison.includes('agence') ? <small>{en ? 'Agency delivery fees are 10% of the order value and are payable in full when ordering.' : DESCRIPTION_MODE.agence}</small> : null}</div></div><div className={styles.service}><Icon name="return"/><div><h3>{en ? 'Returns & support' : 'Retours & assistance'}</h3><p>{en ? 'Check the terms that apply to your order.' : 'Consultez les conditions applicables à votre commande.'}</p><div className={styles.serviceLinks}><Link href="/livraison-retours">{en ? 'View return and support policy' : 'Voir la politique de retour et d’assistance'}</Link><Link href="/contact">{en ? 'Contact KatiMarket support' : 'Contacter l’équipe KatiMarket'}</Link></div></div></div><div className={styles.service}><Icon name="shield"/><div><h3>{en ? 'Secure payment' : 'Paiement sécurisé'}</h3><p>{en ? 'Available payment methods are shown at checkout.' : 'Les moyens de paiement disponibles sont présentés à la commande.'}</p></div></div></section>{selected ? <section className={styles.panel}><h2><Icon name="shop"/>{en ? 'The shop' : 'La boutique'}</h2><div className={styles.sellerProfile}><span className={styles.avatar}>{villeDe(selected.boutique).slice(0,2).toUpperCase()}</span><div><h3>{selected.boutique.nom}</h3><p>{en ? 'KatiMarket-verified shop' : 'Boutique vérifiée sur KatiMarket'}</p><small>{villesDeBoutique(selected.boutique)}</small></div></div><Link className={styles.shopLink} href={`/boutiques/${selected.boutique.slug}`}>{en ? 'Visit shop' : 'Voir la boutique'}<Icon name="arrow"/></Link></section> : null}</aside>
      <section className={styles.details}><div className={styles.tabs} role="tablist" aria-label={en ? 'Product information' : 'Informations produit'}>{tabs.map((label,index) => <button key={label} id={`product-tab-${index}`} role="tab" aria-controls="product-panel" aria-selected={tab === label} tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next]);document.getElementById(`product-tab-${next}`)?.focus()}}}>{en ? ['Description', 'Specifications', 'Customer reviews', 'Delivery'][index] : label}</button>)}</div><div className={styles.tabContent} id="product-panel" role="tabpanel" aria-labelledby={`product-tab-${tabs.indexOf(tab)}`} tabIndex={0}>
        {tab === 'Description' ? <><h2>{en ? 'About' : 'À propos de'} {item.nom}</h2><p>{item.description ?? (en ? 'The shop will publish a detailed description soon. Contact the seller to confirm your requirements before ordering.' : 'La description détaillée sera publiée par la boutique. Contactez le vendeur pour préciser vos besoins avant de commander.')}</p></> : null}
        {tab === 'Fiche technique' ? <><h2>{en ? 'Specifications' : 'Fiche technique'}</h2>{item.ficheTechnique ? <dl className={styles.ficheTechnique} data-testid="fiche-technique">{lignesFiche(item.ficheTechnique).map((ligne, index) => ligne.nom ? <div key={index}><dt>{ligne.nom}</dt><dd>{ligne.valeur}</dd></div> : <div key={index} className={styles.ficheNote}><dd>{ligne.valeur}</dd></div>)}</dl> : null}{item.ficheTechniquePdfUrl ? <p><a className={styles.fichePdf} href={item.ficheTechniquePdfUrl} target="_blank" rel="noopener noreferrer" download>{en ? 'Download specifications (PDF)' : 'Télécharger la fiche technique (PDF)'}</a></p> : null}<h3 className={styles.ficheSousTitre}>{en ? 'Offer details' : 'Informations de l’offre'}</h3><dl className={styles.specs}><div><dt>{en ? 'Brand' : 'Marque'}</dt><dd>{item.marque ?? (en ? 'Not provided' : 'Non renseignée')}</dd></div><div><dt>{en ? 'Category' : 'Catégorie'}</dt><dd>{item.categorieDetail ? (item.categorieDetail.parent ? `${item.categorieDetail.parent.nom} › ${item.categorieDetail.nom}` : item.categorieDetail.nom) : item.categorie ?? (en ? 'Not provided' : 'Non renseignée')}</dd></div>{typeof selected?.garantieMois === 'number' ? <div><dt>{en ? 'Offer warranty' : 'Garantie de cette offre'}</dt><dd>{dureeGarantie(selected.garantieMois, en)}</dd></div> : null}{item.categorieDetail?.garantieMinimaleMois ? <div><dt>{en ? 'KatiMarket minimum warranty' : 'Garantie minimale KatiMarket'}</dt><dd>{en ? `${item.categorieDetail.garantie}, for all sellers in this category` : `${item.categorieDetail.garantie}, pour tous les vendeurs de cette catégorie`}</dd></div> : null}<div><dt>{en ? 'Reference' : 'Référence'}</dt><dd>{item.nom}</dd></div>{Object.entries(selected?.attributsVariante ?? {}).map(([nom, valeur]) => <div key={nom}><dt>{nom}</dt><dd>{valeur}</dd></div>)}</dl>{!item.ficheTechnique && !item.ficheTechniquePdfUrl ? <p>{en ? 'The shop has not published specifications yet. Please confirm the details with the seller.' : 'La boutique n’a pas encore publié de fiche technique : confirmez les caractéristiques détaillées auprès d’elle.'}</p> : null}</> : null}
        {tab === 'Avis clients' ? <AvisBoutique slug={item.slug} nom={item.nom} cible="produit" /> : null}
        {tab === 'Livraison' ? <><h2>{en ? 'Delivery from' : 'Livraison depuis'} {selected ? villeDe(selected.boutique) : (en ? 'the shop' : 'la boutique')}</h2><p>{en ? 'Available areas: ' : 'Zones proposées : '}{selected?.villesLivraison.join(', ') || (en ? 'to be confirmed' : 'à confirmer')}. {libelleDelaiMarketplace(selected?.delaiMaxJours)}.</p><p>{en ? 'Applicable fees and terms are confirmed before you place your order.' : 'Les frais et modalités applicables sont confirmés avant la validation de votre commande.'}</p>{selected?.modesLivraison.includes('agence') ? <p>{en ? 'Agency dispatch costs 10% of the order value; the full order must be paid when placing it.' : 'L’expédition en agence coûte 10 % de la valeur de la commande ; celle-ci doit être payée intégralement au moment de la commande.'}</p> : null}</> : null}
      </div></section>
    </div>
    {selected ? <section className={styles.related} data-recommendation-shop={selected.boutique.slug}><header><div><h2>{en ? 'More from this shop' : 'À découvrir dans cette boutique'}</h2><p>{en ? 'Complete your selection with offers available from the same seller.' : 'Complétez votre sélection avec des offres disponibles chez le même vendeur.'}</p></div><Link href={`/boutiques/${selected.boutique.slug}`}>{en ? 'View shop' : 'Voir la boutique'}<Icon name="arrow"/></Link></header>{related.length ? <div className={styles.relatedGrid}>{related.map((offer, index) => {
      const visuel = imageProduit(offer.produit)
      const specs = productCardSpecs(offer, 3)
      const gain = politiqueKati && offer.prixFcfa ? katiPourMontant(offer.prixFcfa, politiqueKati.gainClientBps, politiqueKati.katiParFcfa) : 0
      const href = `/marketplace/produits/${offer.produit.slug}?boutique=${encodeURIComponent(selected.boutique.slug)}`
      return <article className={styles.relatedItem} key={offer.id} style={{ '--related-delay': `${index * 55}ms` } as React.CSSProperties}>
        <Link className={styles.relatedVisual} href={href} aria-label={`${en ? 'View' : 'Voir'} ${offer.titre ?? offer.produit.nom}`}>{visuel ? <Image src={visuel.url} alt={visuel.alt} fill sizes="(max-width: 700px) 76vw, (max-width: 1200px) 45vw, 360px"/> : <span>{offer.produit.marque ?? offer.produit.categorie ?? 'KatiMarket'}</span>}</Link>
        <div className={styles.relatedBody}><small>{offer.boutique.nom}</small><h3><Link href={href}>{offer.titre ?? offer.produit.nom}</Link></h3>{specs.length ? <ul aria-label={en ? 'Key features' : 'Caractéristiques principales'}>{specs.map(spec => <li key={spec}>{spec}</li>)}</ul> : null}<strong>{offer.prixFcfa === null ? (en ? 'Price on request' : 'Prix sur demande') : money(offer.prixFcfa)}</strong><div className={styles.relatedMeta}><span className={styles.relatedStock}><i/>{en ? 'Available' : 'Disponible'}</span><span><Icon name="truck"/>{libelleDelaiMarketplace(offer.delaiMaxJours)}</span></div>{gain > 0 ? <p className={styles.relatedKati}><b>K</b>+ {new Intl.NumberFormat('fr-FR').format(gain)} KATI</p> : null}<Link href={href} className={styles.relatedAction} aria-label={`${en ? 'Discover' : 'Découvrir'} ${offer.titre ?? offer.produit.nom}`}><Icon name="arrow"/></Link></div>
      </article>
    })}</div> : <p className={styles.empty}>{en ? 'No other products are currently available from this shop.' : 'Aucun autre produit disponible dans cette boutique pour le moment.'}</p>}</section> : null}
    {accessories.length ? <section className={styles.related} aria-labelledby="compatible-accessories-title" data-testid="accessory-recommendations"><header><div><h2 id="compatible-accessories-title">{en ? 'Compatible accessories' : 'Accessoires compatibles'}</h2><p>{en ? 'Related products in this category. Add only the items you want.' : 'Des produits complémentaires associés à cette catégorie. Ajoutez uniquement ceux qui vous intéressent.'}</p></div></header><div className={styles.relatedGrid}>{accessories.slice(0, 4).map(offer => <article className={styles.relatedItem} key={offer.id}><Link className={styles.relatedVisual} href={`/marketplace/produits/${offer.produit.slug}`} aria-label={`${en ? 'View' : 'Voir'} ${offer.produit.nom}`}>{offer.produit.images?.[0]?.url ? <Image src={offer.produit.images[0].url} alt={offer.produit.images[0].texteAlternatif ?? offer.produit.nom} fill sizes="(max-width: 700px) 76vw, 360px"/> : <span>{offer.produit.marque ?? offer.produit.categorie ?? 'KatiMarket'}</span>}</Link><div className={styles.relatedBody}><small>{offer.boutique.nom}</small><h3><Link href={`/marketplace/produits/${offer.produit.slug}`}>{offer.titre ?? offer.produit.nom}</Link></h3><strong>{offer.prixFcfa === null ? (en ? 'Price on request' : 'Prix sur demande') : money(offer.prixFcfa)}</strong><button type="button" className={styles.relatedAction} disabled={offer.prixFcfa === null || offer.disponible <= 0} onClick={() => addAccessory(offer)}>{en ? 'Add to cart' : 'Ajouter au panier'}</button></div></article>)}</div></section> : null}
    <dialog ref={zoom} className={styles.zoomDialog} onClick={event=>{if(event.target===event.currentTarget)zoom.current?.close()}}><button autoFocus onClick={()=>zoom.current?.close()} aria-label={en ? 'Close image' : 'Fermer le visuel'}>×</button>{illustration ? <Image src={illustration} alt={photoAlt} width={1000} height={1000}/> : null}</dialog>
  </main>
}
