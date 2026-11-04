'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { CONTACT_MARKETPLACE, lienTelephone } from '@/constants/contact-marketplace'
import { useMarketplaceLanguage } from '@/lib/language'
import { KatiLogo } from './KatiLogo'
import styles from './marketplace-shell-v2.module.css'

function FooterLink({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  return <Link href={href} className={styles.footerLink}><span aria-hidden="true">{icon}</span>{children}</Link>
}

export function KatiFooter() {
  const { text } = useMarketplaceLanguage()
  return (
    <footer className={styles.footer} data-marketplace-footer>
      <div className={`${styles.shell} ${styles.footerGrid}`}>
        <div><KatiLogo footer /><p>{text('footerIntro')}</p><p><span aria-hidden="true">📍 </span>{CONTACT_MARKETPLACE.adresse}<br /><span aria-hidden="true">☎ </span>{CONTACT_MARKETPLACE.telephones.map((numero, index) => <span key={numero}>{index ? ' · ' : ''}<a href={lienTelephone(numero)}>{numero}</a></span>)}</p><span className={styles.socials}>f&nbsp;&nbsp;◉&nbsp;&nbsp;▶&nbsp;&nbsp;in</span></div>
        <div><h2><span aria-hidden="true">🛍️</span> {text('buy')}</h2><FooterLink href="/catalogue" icon="📦">{text('allProducts')}</FooterLink><FooterLink href="/catalogue" icon="⭐">{text('bestSellers')}</FooterLink><FooterLink href="/boutiques" icon="🏬">{text('recommendedShops')}</FooterLink><FooterLink href="/livraison-retours" icon="🚚">{text('deliveryReturns')}</FooterLink><FooterLink href="/services" icon="✨">{text('ourServices')}</FooterLink></div>
        <div><h2><span aria-hidden="true">🏪</span> {text('sellOn')}</h2><FooterLink href="/devenir-vendeur" icon="➕">{text('openShop')}</FooterLink><FooterLink href="/espace-vendeur" icon="📊">{text('sellerSpace')}</FooterLink><FooterLink href="/contact" icon="💬">{text('sellerHelp')}</FooterLink><FooterLink href="/contrat-vendeurs" icon="📝">{text('sellerContract')}</FooterLink></div>
        <div><h2><span aria-hidden="true">🛟</span> {text('helpInfo')}</h2><FooterLink href="/compte/commandes" icon="📍">{text('orderTracking')}</FooterLink><FooterLink href="/compte/devis" icon="🧾">{text('myQuotes')}</FooterLink><FooterLink href="/compte/favoris" icon="❤️">{text('myFavorites')}</FooterLink><FooterLink href="/faq" icon="❓">{text('faq')}</FooterLink><FooterLink href="/contact" icon="✉️">{text('contact')}</FooterLink><FooterLink href="/a-propos" icon="ℹ️">{text('about')}</FooterLink><FooterLink href="/securite" icon="🔒">{text('purchaseSecurity')}</FooterLink></div>
        <div><h2><span aria-hidden="true">⚖️</span> {text('legalInfo')}</h2><FooterLink href="/mentions-legales" icon="📄">{text('legalNotice')}</FooterLink><FooterLink href="/politique-confidentialite" icon="🔐">{text('privacy')}</FooterLink><FooterLink href="/conditions-generales-vente" icon="🛒">{text('termsSale')}</FooterLink><FooterLink href="/conditions" icon="📜">{text('termsUse')}</FooterLink><FooterLink href="/cookies" icon="🍪">{text('cookies')}</FooterLink></div>
      </div>
      <div className={`${styles.shell} ${styles.legal}`}><span>{text('copyright')}</span><nav aria-label={text('footerLegal')}><FooterLink href="/mentions-legales" icon="📄">{text('legalNotice')}</FooterLink><FooterLink href="/politique-confidentialite" icon="🔐">{text('confidentiality')}</FooterLink><FooterLink href="/conditions-generales-vente" icon="🛒">{text('salesTerms')}</FooterLink><FooterLink href="/contrat-vendeurs" icon="📝">{text('sellers')}</FooterLink></nav></div>
    </footer>
  )
}
