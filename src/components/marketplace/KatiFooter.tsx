'use client'

import Link from 'next/link'
import { useMarketplaceLanguage } from '@/lib/language'
import { KatiLogo } from './KatiLogo'
import styles from './marketplace-shell-v2.module.css'

export function KatiFooter() {
  const { text } = useMarketplaceLanguage()
  return (
    <footer className={styles.footer} data-marketplace-footer>
      <div className={`${styles.shell} ${styles.footerGrid}`}>
        <div><KatiLogo footer /><p>{text('footerIntro')}</p><span className={styles.socials}>f&nbsp;&nbsp;◉&nbsp;&nbsp;▶&nbsp;&nbsp;in</span></div>
        <div><h2>{text('buy')}</h2><Link href="/catalogue">{text('allProducts')}</Link><Link href="/catalogue">{text('bestSellers')}</Link><Link href="/boutiques">{text('recommendedShops')}</Link><Link href="/livraison-retours">{text('deliveryReturns')}</Link></div>
        <div><h2>{text('sellOn')}</h2><Link href="/devenir-vendeur">{text('openShop')}</Link><Link href="/espace-vendeur">{text('sellerSpace')}</Link><Link href="/contact">{text('sellerHelp')}</Link><Link href="/contrat-vendeurs">{text('sellerContract')}</Link></div>
        <div><h2>{text('helpInfo')}</h2><Link href="/compte/commandes">{text('orderTracking')}</Link><Link href="/compte/devis">{text('myQuotes')}</Link><Link href="/compte/favoris">{text('myFavorites')}</Link><Link href="/contact">{text('contact')}</Link><Link href="/a-propos">{text('about')}</Link><Link href="/securite">{text('purchaseSecurity')}</Link></div>
        <div><h2>{text('legalInfo')}</h2><Link href="/mentions-legales">{text('legalNotice')}</Link><Link href="/politique-confidentialite">{text('privacy')}</Link><Link href="/conditions-generales-vente">{text('termsSale')}</Link><Link href="/conditions">{text('termsUse')}</Link><Link href="/cookies">{text('cookies')}</Link></div>
      </div>
      <div className={`${styles.shell} ${styles.legal}`}><span>{text('copyright')}</span><nav aria-label={text('footerLegal')}><Link href="/mentions-legales">{text('legalNotice')}</Link><Link href="/politique-confidentialite">{text('confidentiality')}</Link><Link href="/conditions-generales-vente">{text('salesTerms')}</Link><Link href="/contrat-vendeurs">{text('sellers')}</Link></nav></div>
    </footer>
  )
}
