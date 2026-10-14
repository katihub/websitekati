'use client'

import Image from 'next/image'
import { imageProduit } from '@/lib/image-produit'
import Link from 'next/link'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import { useCart } from '@/lib/cart'
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
  const canAdd = offer.prixFcfa !== null && qty < Math.min(offer.disponible, 99)
  return <article className={styles.productCard} data-catalogue-offer={offer.id}><Link href={href} className={styles.visual} aria-label={`Voir ${offer.produit.nom}`}>
    {image ? <Image src={image} alt={visuel?.alt ?? offer.produit.nom} fill sizes="(max-width: 600px) 45vw, (max-width: 1300px) 20vw, 170px"/> : <div className={styles.placeholder}><ShopIcon name={catalogueIcon(offer.produit.categorie ?? '')}/><b>{offer.produit.marque ?? offer.produit.categorie ?? 'Produit'}</b></div>}
    <small className={styles.photoNote}>{image ? 'Visuel illustratif' : 'Photo à venir'}</small>{discount ? <b className={styles.discount}>−{discount}%</b> : null}
  </Link><div className={styles.productBody}><h2><Link href={href}>{offer.titre ?? offer.produit.nom}</Link></h2><Link className={styles.seller} href={`/boutiques/${offer.boutique.slug}`}>{offer.boutique.nom}</Link><div className={styles.price}>{discount ? <del>{money(offer.prixReferenceFcfa!)}</del> : <span className={styles.condition}>{offer.etat ?? 'Offre boutique'}</span>}<strong>{offer.prixFcfa === null ? 'Prix sur demande' : money(offer.prixFcfa)}</strong></div><p className={styles.stock}><ShopIcon name="check"/>En stock{offer.delaiMaxJours ? ` · ${offer.delaiMaxJours} j max.` : ''}</p>{offer.prixFcfa === null ? <Link href={href} className={styles.primary}>Voir l’offre</Link> : <button className={styles.primary} disabled={!canAdd} onClick={() => { if (canAdd) cart.add({ slug: offer.produit.slug, name: offer.titre ?? offer.produit.nom, price: offer.prixFcfa!, image, offerId: offer.id, boutiqueNom: offer.boutique.nom, modesLivraison: offer.modesLivraison?.filter((mode): mode is 'vendeur' | 'katihub' => mode === 'vendeur' || mode === 'katihub'), villesLivraison: offer.villesLivraison }) }}><ShopIcon name="cart"/>{canAdd ? 'Ajouter au panier' : 'Quantité maximale'}</button>}</div></article>
}
