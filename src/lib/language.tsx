'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type MarketplaceLocale = 'fr' | 'en'

const STORAGE_KEY = 'katimarket.locale.v1'
const COPY = {
  trust: { fr: 'En toute confiance !', en: 'Shop with confidence!' },
  allCategories: { fr: 'Toutes les catégories', en: 'All categories' },
  shops: { fr: 'Boutiques', en: 'Shops' },
  sell: { fr: 'Vendre sur KatiMarket', en: 'Sell on KatiMarket' },
  signIn: { fr: 'Se connecter', en: 'Sign in' },
  createAccount: { fr: 'Créer un compte', en: 'Create account' },
  greeting: { fr: 'Bonjour', en: 'Hello' },
  signOut: { fr: 'Se déconnecter', en: 'Sign out' },
  myAccount: { fr: 'Mon compte', en: 'My account' },
  sellerAccount: { fr: 'Compte vendeur', en: 'Seller account' },
  myShop: { fr: 'Ma boutique', en: 'My shop' },
  myOrders: { fr: 'Mes commandes', en: 'My orders' },
  myQuotes: { fr: 'Mes devis', en: 'My quotes' },
  myPoints: { fr: 'Mes KATI', en: 'My KATI' },
  myFavorites: { fr: 'Mes favoris', en: 'My favorites' },
  footerIntro: { fr: 'Votre marketplace de confiance au Cameroun. Des produits utiles, des vendeurs locaux vérifiés et une livraison suivie.', en: 'Your trusted marketplace in Cameroon. Useful products, verified local sellers, and tracked delivery.' },
  buy: { fr: 'Acheter sur KatiMarket', en: 'Shop on KatiMarket' },
  allProducts: { fr: 'Toutes les catégories', en: 'All categories' },
  bestSellers: { fr: 'Meilleures ventes', en: 'Best sellers' },
  recommendedShops: { fr: 'Boutiques recommandées', en: 'Recommended shops' },
  deliveryReturns: { fr: 'Livraison et retours', en: 'Delivery and returns' },
  sellOn: { fr: 'Vendre sur KatiMarket', en: 'Sell on KatiMarket' },
  openShop: { fr: 'Créer une boutique', en: 'Open a shop' },
  sellerSpace: { fr: 'Espace vendeur', en: 'Seller workspace' },
  sellerHelp: { fr: 'Centre d’aide vendeurs', en: 'Seller help center' },
  sellerContract: { fr: 'Contrat avec les vendeurs', en: 'Seller agreement' },
  helpInfo: { fr: 'Aide & informations', en: 'Help & information' },
  orderTracking: { fr: 'Suivi de commande', en: 'Track an order' },
  contact: { fr: 'Nous contacter', en: 'Contact us' },
  about: { fr: 'À propos de KatiMarket', en: 'About KatiMarket' },
  purchaseSecurity: { fr: 'Sécurité des achats', en: 'Shopping security' },
  legalInfo: { fr: 'Informations légales', en: 'Legal information' },
  legalNotice: { fr: 'Mentions légales', en: 'Legal notice' },
  privacy: { fr: 'Politique de confidentialité', en: 'Privacy policy' },
  termsSale: { fr: 'Conditions générales de vente', en: 'Terms of sale' },
  termsUse: { fr: 'Conditions d’utilisation', en: 'Terms of use' },
  cookies: { fr: 'Politique de cookies', en: 'Cookie policy' },
  copyright: { fr: '© 2026 KatiMarket Cameroun. Tous droits réservés.', en: '© 2026 KatiMarket Cameroon. All rights reserved.' },
  footerLegal: { fr: 'Liens légaux du pied de page', en: 'Footer legal links' },
  confidentiality: { fr: 'Confidentialité', en: 'Privacy' },
  salesTerms: { fr: 'Conditions de vente', en: 'Terms of sale' },
  sellers: { fr: 'Vendeurs', en: 'Sellers' },
  language: { fr: 'Langue', en: 'Language' },
  heroTagline: { fr: 'La marketplace qui vous connecte', en: 'The marketplace that brings you together' },
  promotions: { fr: 'Offres KatiMarket', en: 'KatiMarket promotions' },
  heroTitleOne: { fr: 'Tout ce dont vous avez besoin,', en: 'Everything you need,' },
  heroTitleTwo: { fr: 'au même endroit !', en: 'all in one place!' },
  heroTextOne: { fr: 'Des boutiques locales, des prix clairs et une livraison suivie au Cameroun.', en: 'Local shops, clear prices, and tracked delivery across Cameroon.' },
  discoverNow: { fr: 'Découvrir maintenant', en: 'Discover now' },
  heroFashionTitle: { fr: 'Le style camerounais,', en: 'Cameroonian style,' },
  heroFashionTitleTwo: { fr: 'livré chez vous.', en: 'delivered to your door.' },
  heroFashionText: { fr: 'Mode, beauté et accessoires proposés par des vendeurs vérifiés.', en: 'Fashion, beauty, and accessories from verified sellers.' },
  exploreFashion: { fr: 'Explorer la mode', en: 'Explore fashion' },
  previousAd: { fr: 'Publicité précédente', en: 'Previous promotion' },
  nextAd: { fr: 'Publicité suivante', en: 'Next promotion' },
  showAd: { fr: 'Afficher la publicité {number}', en: 'Show promotion {number}' },
  commitments: { fr: 'Nos engagements', en: 'Our commitments' },
  fastDelivery: { fr: 'Livraison rapide', en: 'Fast delivery' },
  homeDelivery: { fr: 'à domicile', en: 'to your door' },
  receiveOrders: { fr: 'Recevez vos commandes où que vous soyez.', en: 'Receive your orders wherever you are.' },
  learnMore: { fr: 'En savoir plus', en: 'Learn more' },
  securePayment: { fr: 'Paiement sécurisé', en: 'Secure payment' },
  paymentPartners: { fr: 'Mobile Money et partenaires de confiance.', en: 'Mobile Money and trusted partners.' },
  customerService: { fr: 'Service client 24/7', en: '24/7 customer support' },
  localTeam: { fr: 'Une équipe locale vous répond.', en: 'Our local team is here to help.' },
  bestSellersTitle: { fr: 'Meilleures ventes', en: 'Best sellers' },
  viewAll: { fr: 'Voir tout', en: 'View all' },
  offersSoon: { fr: 'Les offres seront bientôt disponibles.', en: 'Offers will be available soon.' },
  popularCategories: { fr: 'Catégories populaires', en: 'Popular categories' },
  viewAllCategories: { fr: 'Voir toutes les catégories', en: 'View all categories' },
  recommendedShopsTitle: { fr: 'Boutiques recommandées', en: 'Recommended shops' },
  viewAllShops: { fr: 'Voir toutes les boutiques', en: 'View all shops' },
  shopsSoon: { fr: 'Les boutiques seront bientôt disponibles.', en: 'Shops will be available soon.' },
  fashionBannerTitle: { fr: 'Le style camerounais,', en: 'Cameroonian style,' },
  daily: { fr: 'au quotidien !', en: 'every day!' },
  localFashionText: { fr: 'Vêtements, chaussures et accessoires proposés par des boutiques locales.', en: 'Clothing, shoes, and accessories from local shops.' },
  discoverFashion: { fr: 'Découvrir la mode', en: 'Discover fashion' },
  newArrivals: { fr: 'Nouveautés', en: 'New arrivals' },
  newArrivalsEmpty: { fr: 'Aucun nouvel article pour le moment.', en: 'No new arrivals yet.' },
  moreThanCart: { fr: 'Plus qu’un panier : les avantages KatiMarket', en: 'More than a cart: KatiMarket benefits' },
  benefitsText: { fr: 'Livraison Kati Express, points KATI, retrait gratuit en boutique, devis pour les pros : ce que la marketplace ajoute à chacun de vos achats, sans frais cachés.', en: 'Kati Express delivery, KATI points, free store pickup, and business quotes: extra value with every purchase, with no hidden fees.' },
  openCatalogue: { fr: 'Ouvrir le catalogue', en: 'Browse the catalogue' },
  carouselSlide: { fr: '{number} sur {total}', en: '{number} of {total}' },
  pauseScroll: { fr: 'Mettre le défilement en pause', en: 'Pause scrolling' },
  resumeScroll: { fr: 'Reprendre le défilement', en: 'Resume scrolling' },
  buyNow: { fr: 'Commander maintenant', en: 'Shop now' },
  seePoints: { fr: 'Voir mes KATI', en: 'View my KATI' },
  seeShops: { fr: 'Voir les boutiques', en: 'Browse shops' },
  chooseItems: { fr: 'Choisir mes articles', en: 'Choose my items' },
  moreCartAdvantages: { fr: 'Plus qu’un panier : les avantages KatiMarket', en: 'More than a cart: KatiMarket benefits' },
} satisfies Record<string, Record<MarketplaceLocale, string>>

type LanguageContextValue = {
  locale: MarketplaceLocale
  setLocale: (locale: MarketplaceLocale) => void
  text: (key: keyof typeof COPY, values?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<MarketplaceLocale>('fr')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'en') setLocaleState(stored)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.cookie = `${STORAGE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
  }, [locale])

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    text: (key, values) => COPY[key][locale].replace(/\{(\w+)\}/g, (_match, name: string) => String(values?.[name] ?? `{${name}}`)),
  }), [locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useMarketplaceLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useMarketplaceLanguage must be used inside LanguageProvider')
  return context
}

export function MarketplaceText({ id, values }: { id: keyof typeof COPY; values?: Record<string, string | number> }) {
  const { text } = useMarketplaceLanguage()
  return text(id, values)
}

/** Small client bridge for localized copy inside otherwise server-rendered pages. */
export function LocalizedText({ fr, en }: { fr: ReactNode; en: ReactNode }) {
  const { locale } = useMarketplaceLanguage()
  return <>{locale === 'en' ? en : fr}</>
}
