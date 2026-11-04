'use client'

import { useMarketplaceLanguage, type MarketplaceLocale } from '@/lib/language'
import styles from './marketplace-shell-v2.module.css'

const locales: MarketplaceLocale[] = ['fr', 'en']

export function LanguageSwitcher() {
  const { locale, setLocale, text } = useMarketplaceLanguage()

  return <div className={styles.languageSwitcher} role="group" aria-label={text('language')} data-testid="language-switcher">
    {locales.map(option => <button key={option} type="button" lang={option} aria-pressed={locale === option} onClick={() => setLocale(option)}>
      {option.toUpperCase()}
    </button>)}
  </div>
}

export function TrustSlogan() {
  const { text } = useMarketplaceLanguage()
  return <em>{text('trust')}</em>
}
