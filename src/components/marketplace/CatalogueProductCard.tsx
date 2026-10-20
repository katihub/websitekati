'use client'

import Image from 'next/image'
import { estModeLivraison } from '@/lib/modes-livraison'
import { imageProduit } from '@/lib/image-produit'
import Link from 'next/link'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import { productCardSpecs } from '@/lib/product-card-specs'
import { useCart } from '@/lib/cart'
import { minimumDe, surCommande } from '@/lib/stock'
import { libelleDelaiMarketplace } from '@/lib/marketplace-delivery'
import { ShopIcon, type ShopIconName } from './ShopIcon'
import styles from './marketplace-catalogue.module.css'

export function catalogueIcon(category: string): ShopIconName {
  if (/informatique/i.test(category)) return 'laptop'
  if (/électronique|téléphone/i.test(category)) return 'phone'
  if (/maison|déco|électroménager/i.test(category)) return 'home'
  if (/audio/i.test(category)) return 'headphones'
  return 'bag'
}
const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
export function CatalogueProductCard({ offer }: { offer: OffreMarketplace }) {
  const cart = useCart()
  const visuel = imageProduit(offer.produit)
  const image = visuel?.url ?? null
  const href = `/marketplace/produits/${offer.produit.slug}?boutique=${encodeURIComponent(offer.boutique.slug)}`
  const discount = offer.prixFcfa !== null && offer.prixReferenceFcfa && offer.prixReferenceFcfa > offer.prixFcfa ? Math.round((1 - offer.prixFcfa / offer.prixReferenceFcfa) * 100) : null
  const qty = cart.lines.find(line => line.offerId === offer.id)?.qty ?? 0
  const minimum = minimumDe(offer)
  const specs = productCardSpecs(offer)
  const canAdd = offer.prixFcfa !== null && qty + (qty ? 1 : minimum) <= Math.min(offer.disponible, Math.max(99, minimum))
  return <article className={styles.productCard} data-catalogue-offer={offer.id}><Link href={href} className={styles.visual} aria-label={`Voir ${offer.produit.nom}`}>
    {image ? <Image src={image} alt={visuel?.alt ?? offer.produit.nom} fill sizes="(max-width: 600px) 45vw, (max-width: 1300px) 20vw, 170px"/> : <div className={styles.placeholder}><ShopIcon name={catalogueIcon(offer.produit.categorie ?? '')}/><b>{offer.produit.marque ?? offer.produit.categorie ?? 'Produit'}</b></div>}
    {image ? null : <small className={styles.photoNote}>Photo à venir</small>}{discount ? <b className={styles.discount}>−{discount}%</b> : null}{offer.verifieParKatiLe ? <b className={styles.verified} title="KatiMarket a reçu et testé cet article">Vérifié KatiMarket</b> : null}
  </Link><div className={styles.productBody}><h2><Link href={href}>{offer.titre ?? offer.produit.nom}</Link></h2><Link className={styles.seller} href={`/boutiques/${offer.boutique.slug}`}>{offer.boutique.nom}</Link>{specs.length ? <ul className={styles.productSpecs} aria-label="Caractéristiques principales">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul> : null}<div className={styles.price}>{discount ? <del>{money(offer.prixReferenceFcfa!)}</del> : <span className={styles.condition}>{offer.etat ?? 'Offre boutique'}</span>}<strong>{offer.prixFcfa === null ? 'Prix sur demande' : money(offer.prixFcfa)}</strong></div><p className={styles.stock}><ShopIcon name="check"/>{surCommande(offer.disponible) ? 'Disponible' : 'En stock'} · {libelleDelaiMarketplace(offer.delaiMaxJours)}{minimum > 1 ? ` · min. ${minimum}` : ''}</p>{offer.prixFcfa === null ? <Link href={href} className={styles.primary}>Voir l’offre</Link> : <button className={styles.primary} disabled={!canAdd} onClick={() => { if (canAdd) cart.add({ slug: offer.produit.slug, name: offer.titre ?? offer.produit.nom, price: offer.prixFcfa!, image, offerId: offer.id, boutiqueNom: offer.boutique.nom, modesLivraison: offer.modesLivraison?.filter(estModeLivraison), villesLivraison: offer.villesLivraison, quantiteMinimale: minimum }, qty ? 1 : minimum) }}><ShopIcon name="cart"/>{canAdd ? 'Ajouter au panier' : 'Quantité maximale'}</button>}</div></article>
}
