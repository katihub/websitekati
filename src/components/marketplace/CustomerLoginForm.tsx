'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { completerFicheDepuisInscription } from '@/lib/profil'
import { avecRetour, useRetourDemande } from '@/lib/retour'
import { supabase } from '@/lib/supabase'
import styles from '@/app/inscription/signup.module.css'
import { useMarketplaceLanguage } from '@/lib/language'

export function CustomerLoginForm() {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const router = useRouter()
  const retour = useRetourDemande()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(en ? 'Check your email address.' : 'Vérifiez votre adresse e-mail.')
    if (!password) return setError(en ? 'Enter your password.' : 'Indiquez votre mot de passe.')
    setPending(true)
    try {
      const client = supabase()
      if (client) {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (authError) throw authError
        await completerFicheDepuisInscription(data.user?.user_metadata)
      } else if (connexionLocaleActive) await seConnecterLocalement(email.trim().toLowerCase(), password)
      else throw new Error(en ? 'Sign-in is temporarily unavailable.' : 'La connexion est indisponible pour le moment.')
      setPassword('')
      // Retour a la page d'origine (commande, devis, avis d'une boutique), seulement vers un chemin interne.
      router.push(retour ?? '/compte/commandes')
    } catch {
      setError(en ? 'Could not sign in. Check your email and password.' : 'Connexion impossible. Vérifiez votre adresse et votre mot de passe.')
    } finally { setPending(false) }
  }

  async function resetPassword() {
    setError(''); setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(en ? 'Enter your email address first.' : 'Saisissez d’abord votre adresse e-mail.')
    const client = supabase()
    if (!client) return setError(en ? 'For demo access, contact the KatiMarket team.' : 'En démonstration, demandez les accès à l’équipe KatiMarket.')
    setResetPending(true)
    try {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/nouveau-mot-de-passe` })
      if (resetError) throw resetError
      setNotice(en ? 'If this account exists, we sent a link to this address.' : 'Si ce compte existe, nous avons envoyé un lien à cette adresse.')
    } catch {
      setError(en ? 'The link could not be sent. Please try again shortly.' : 'Le lien n’a pas pu être envoyé. Réessayez dans un instant.')
    } finally { setResetPending(false) }
  }

  return <section className={styles.formArea} aria-labelledby="customer-login-title">
    <h1 id="customer-login-title">{en ? 'Welcome back to KatiMarket' : 'Bon retour sur KatiMarket'}</h1>
    <p className={styles.intro}>{en ? 'Find your orders and pick up where you left off.' : 'Retrouvez vos commandes et reprenez vos achats.'}</p>
    <form onSubmit={submit} noValidate>
      <label>{en ? 'Email address' : 'Adresse e-mail'}<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" /></label>
      <label>{en ? 'Password' : 'Mot de passe'}<span className={styles.password}><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder={en ? 'Your password' : 'Votre mot de passe'} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? (en ? 'Hide' : 'Masquer') : (en ? 'Show' : 'Afficher')}</button></span></label>
      <div className={styles.aux}><button type="button" disabled={resetPending} onClick={() => void resetPassword()}>{resetPending ? (en ? 'Sending link…' : 'Envoi du lien…') : (en ? 'Forgot password?' : 'Mot de passe oublié ?')}</button></div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      <button className={styles.primary} disabled={pending}>{pending ? (en ? 'Signing in…' : 'Connexion en cours…') : (en ? 'Sign in' : 'Se connecter')}</button>
    </form>
    <p className={styles.switch}>{en ? 'New to KatiMarket?' : 'Pas encore de compte ?'} <Link href={avecRetour('/inscription', retour)}>{en ? 'Create an account' : 'Créer un compte'}</Link></p>
  </section>
}
