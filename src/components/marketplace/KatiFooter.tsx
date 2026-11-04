'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { CONTACT_MARKETPLACE, lienTelephone } from '@/constants/contact-marketplace'
import { useMarketplaceLanguage } from '@/lib/language'
import { KatiLogo } from './KatiLogo'
import { ShopIcon, type ShopIconName } from './ShopIcon'
import styles from './marketplace-shell-v2.module.css'

function FooterLink({ href, icon, children }: { href: string; icon: ShopIconName; children: ReactNode }) {
  return <Link href={href} className={styles.footerLink}><ShopIcon name={icon} />{children}</Link>
}

export function KatiFooter() {
  const { text } = useMarketplaceLanguage()
  return (
    <footer className={styles.footer} data-marketplace-footer>
      <div className={`${styles.shell} ${styles.footerGrid}`}>
        <div><KatiLogo footer /><p>{text('footerIntro')}</p><p><ShopIcon name="pin" /> {CONTACT_MARKETPLACE.adresse}<br /><ShopIcon name="phone" /> {CONTACT_MARKETPLACE.telephones.map((numero, index) => <span key={numero}>{index ? ' · ' : ''}<a href={lienTelephone(numero)}>{numero}</a></span>)}</p><span className={styles.socials}>f&nbsp;&nbsp;◉&nbsp;&nbsp;▶&nbsp;&nbsp;in</span></div>
        <div><h2><ShopIcon name="bag" /> {text('buy')}</h2><FooterLink href="/catalogue" icon="package">{text('allProducts')}</FooterLink><FooterLink href="/catalogue" icon="star">{text('bestSellers')}</FooterLink><FooterLink href="/boutiques" icon="home">{text('recommendedShops')}</FooterLink><FooterLink href="/livraison-retours" icon="truck">{text('deliveryReturns')}</FooterLink><FooterLink href="/services" icon="star">{text('ourServices')}</FooterLink></div>
        <div><h2><ShopIcon name="tag" /> {text('sellOn')}</h2><FooterLink href="/devenir-vendeur" icon="plus">{text('openShop')}</FooterLink><FooterLink href="/espace-vendeur" icon="grid">{text('sellerSpace')}</FooterLink><FooterLink href="/contact" icon="message">{text('sellerHelp')}</FooterLink><FooterLink href="/contrat-vendeurs" icon="file">{text('sellerContract')}</FooterLink></div>
        <div><h2><ShopIcon name="question" /> {text('helpInfo')}</h2><FooterLink href="/compte/commandes" icon="pin">{text('orderTracking')}</FooterLink><FooterLink href="/compte/devis" icon="receipt">{text('myQuotes')}</FooterLink><FooterLink href="/compte/favoris" icon="heart">{text('myFavorites')}</FooterLink><FooterLink href="/faq" icon="question">{text('faq')}</FooterLink><FooterLink href="/contact" icon="mail">{text('contact')}</FooterLink><FooterLink href="/a-propos" icon="info">{text('about')}</FooterLink><FooterLink href="/securite" icon="shield">{text('purchaseSecurity')}</FooterLink></div>
        <div><h2><ShopIcon name="file" /> {text('legalInfo')}</h2><FooterLink href="/mentions-legales" icon="file">{text('legalNotice')}</FooterLink><FooterLink href="/politique-confidentialite" icon="lock">{text('privacy')}</FooterLink><FooterLink href="/conditions-generales-vente" icon="cart">{text('termsSale')}</FooterLink><FooterLink href="/conditions" icon="receipt">{text('termsUse')}</FooterLink><FooterLink href="/cookies" icon="cookie">{text('cookies')}</FooterLink></div>
      </div>
      <div className={`${styles.shell} ${styles.legal}`}><span>{text('copyright')}</span><nav aria-label={text('footerLegal')}><FooterLink href="/mentions-legales" icon="file">{text('legalNotice')}</FooterLink><FooterLink href="/politique-confidentialite" icon="lock">{text('confidentiality')}</FooterLink><FooterLink href="/conditions-generales-vente" icon="cart">{text('salesTerms')}</FooterLink><FooterLink href="/contrat-vendeurs" icon="file">{text('sellers')}</FooterLink></nav></div>
    </footer>
  )
}
