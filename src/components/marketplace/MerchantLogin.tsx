'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { supabase } from '@/lib/supabase'
import { ShopIcon } from './ShopIcon'
import styles from '@/app/connexion-vendeur/merchant-login.module.css'
import { useMarketplaceLanguage } from '@/lib/language'

export function MerchantLogin({ onSuccess }: { onSuccess?: () => Promise<void> }) {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resetPending, setResetPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setPending(true)
    try {
      const client = supabase()
      if (client) {
        const result = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (result.error) throw result.error
      } else if (connexionLocaleActive) {
        await seConnecterLocalement(email.trim().toLowerCase(), password)
      } else throw new Error(en ? 'Sign-in is temporarily unavailable.' : 'Le service de connexion est indisponible pour le moment.')
      if (onSuccess) await onSuccess()
      else router.replace('/espace-vendeur')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Sign-in failed. Please try again.' : 'La connexion a échoué. Réessayez.'))
    } finally { setPending(false) }
  }

  async function resetPassword() {
    setError('')
    setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(en ? 'Enter your email address to receive a reset link.' : 'Indiquez votre adresse e-mail pour recevoir le lien de réinitialisation.')
    const client = supabase()
    if (!client) return setError(en ? 'This demo uses shared access. Contact KatiMarket support to recover your credentials.' : 'Cet environnement de démonstration utilise un accès partagé. Contactez l’équipe KatiMarket pour retrouver vos identifiants.')
    setResetPending(true)
    try {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe` })
      if (resetError) setError(resetError.message)
      else setNotice(en ? 'If this account exists, a password reset link has been sent to your email address.' : 'Si ce compte existe, un lien de réinitialisation a été envoyé à votre adresse e-mail.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'The link could not be sent. Please try again.' : 'Le lien n’a pas pu être envoyé. Réessayez.'))
    } finally { setResetPending(false) }
  }

  return <div className={styles.page} data-seller-auth>
    <div className={styles.shell}>
      <div className={styles.topline}><span>{en ? 'KatiMarket seller workspace' : 'Espace vendeur KatiMarket'}</span><Link href="/devenir-vendeur">{en ? 'Create a seller account' : 'Créer un compte vendeur'} <ShopIcon name="arrow" /></Link></div>
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="merchant-login-title">
          <span className={styles.formIcon}><ShopIcon name="bag" /></span>
          <h1 id="merchant-login-title">{en ? 'Seller sign in' : 'Connexion vendeur'}</h1>
          <p className={styles.subtitle}>{en ? 'Access your KatiMarket seller workspace.' : 'Accédez à votre espace vendeur KatiMarket.'}</p>
          <form onSubmit={submit}>
            <label>{en ? 'Email address' : 'Adresse e-mail'}<input type="email" required autoComplete="email" placeholder="vous@boutique.cm" value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label>{en ? 'Password' : 'Mot de passe'}<span className={styles.passwordField}><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder={en ? 'Your password' : 'Votre mot de passe'} value={password} onChange={event => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? (en ? 'Hide password' : 'Masquer le mot de passe') : (en ? 'Show password' : 'Afficher le mot de passe')}>{showPassword ? (en ? 'Hide' : 'Masquer') : (en ? 'Show' : 'Afficher')}</button></span></label>
            <button type="button" className={styles.forgot} disabled={resetPending} onClick={() => void resetPassword()}>{resetPending ? (en ? 'Sending link…' : 'Envoi du lien…') : (en ? 'Forgot password?' : 'Mot de passe oublié ?')}</button>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
            <button className={styles.submit} disabled={pending}>{pending ? (en ? 'Signing in…' : 'Connexion en cours…') : (en ? 'Sign in' : 'Se connecter')} <ShopIcon name="arrow" /></button>
          </form>
          <div className={styles.signup}><span>{en ? 'No seller account yet?' : 'Pas encore de compte vendeur ?'}</span><Link href="/devenir-vendeur">{en ? 'Create a seller account' : 'Créer un compte vendeur'}</Link></div>
          <div className={styles.assurances}><span><ShopIcon name="shield" /> {en ? 'Secure access' : 'Accès sécurisé'}</span><span><ShopIcon name="headphones" /> {en ? 'Local support' : 'Assistance locale'}</span></div>
        </section>
        <aside className={styles.promo} aria-label={en ? 'Sell on KatiMarket' : 'Vendre sur KatiMarket'}>
          <Image src="/marchande-katihub-cameroun.png" alt={en ? 'A Cameroonian shopkeeper preparing orders in her shop' : 'Une commerçante camerounaise prépare ses commandes dans sa boutique'} fill priority sizes="(max-width: 900px) 100vw, 55vw" />
          <div className={styles.promoCopy}><span>{en ? 'Sell on KatiMarket' : 'Vendez sur KatiMarket'}</span><h2>{en ? 'Your shop, your customers, your growth.' : 'Votre boutique, vos clients, votre élan.'}</h2><p>{en ? 'Manage products and orders from your seller workspace, anywhere in Cameroon.' : 'Gérez vos produits et vos commandes depuis votre espace vendeur, au Cameroun.'}</p></div>
          <div className={styles.promoFooter}><span><ShopIcon name="bag" /> {en ? 'Products' : 'Produits'}</span><span><ShopIcon name="package" /> {en ? 'Orders' : 'Commandes'}</span><span><ShopIcon name="shield" /> {en ? 'Verification' : 'Vérification'}</span></div>
        </aside>
      </div>
    </div>
  </div>
}
