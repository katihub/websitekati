'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { supabase } from '@/lib/supabase'
import { ShopIcon } from './ShopIcon'
import styles from '@/app/connexion-vendeur/merchant-login.module.css'

export function MerchantLogin({ onSuccess }: { onSuccess?: () => Promise<void> }) {
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
      } else throw new Error('Le service de connexion est indisponible pour le moment.')
      if (onSuccess) await onSuccess()
      else router.replace('/espace-vendeur')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La connexion a échoué. Réessayez.')
    } finally { setPending(false) }
  }

  async function resetPassword() {
    setError('')
    setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Indiquez votre adresse e-mail pour recevoir le lien de réinitialisation.')
    const client = supabase()
    if (!client) return setError('Cet environnement de démonstration utilise un accès partagé. Contactez l’équipe KatiHub pour retrouver vos identifiants.')
    setResetPending(true)
    try {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe` })
      if (resetError) setError(resetError.message)
      else setNotice('Si ce compte existe, un lien de réinitialisation a été envoyé à votre adresse e-mail.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le lien n’a pas pu être envoyé. Réessayez.')
    } finally { setResetPending(false) }
  }

  return <div className={styles.page} data-seller-auth>
    <div className={styles.shell}>
      <div className={styles.topline}><span>Espace marchand KatiHub</span><Link href="/devenir-vendeur">Créer un compte marchand <ShopIcon name="arrow" /></Link></div>
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="merchant-login-title">
          <span className={styles.formIcon}><ShopIcon name="bag" /></span>
          <h1 id="merchant-login-title">Connexion marchand</h1>
          <p className={styles.subtitle}>Accédez à votre espace vendeur KatiHub.</p>
          <form onSubmit={submit}>
            <label>Adresse e-mail<input type="email" required autoComplete="email" placeholder="vous@boutique.cm" value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label>Mot de passe<span className={styles.passwordField}><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Votre mot de passe" value={password} onChange={event => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label>
            <button type="button" className={styles.forgot} disabled={resetPending} onClick={() => void resetPassword()}>{resetPending ? 'Envoi du lien…' : 'Mot de passe oublié ?'}</button>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
            <button className={styles.submit} disabled={pending}>{pending ? 'Connexion en cours…' : 'Se connecter'} <ShopIcon name="arrow" /></button>
          </form>
          <div className={styles.signup}><span>Pas encore de compte vendeur ?</span><Link href="/devenir-vendeur">Créer un compte marchand</Link></div>
          <div className={styles.assurances}><span><ShopIcon name="shield" /> Accès sécurisé</span><span><ShopIcon name="headphones" /> Assistance locale</span></div>
        </section>
        <aside className={styles.promo} aria-label="Vendre sur KatiHub">
          <Image src="/marchande-katihub-cameroun.png" alt="Une commerçante camerounaise prépare ses commandes dans sa boutique" fill priority sizes="(max-width: 900px) 100vw, 55vw" />
          <div className={styles.promoCopy}><span>Vendez sur KatiHub</span><h2>Votre boutique, vos clients, votre élan.</h2><p>Gérez vos produits et vos commandes depuis votre espace vendeur, au Cameroun.</p></div>
          <div className={styles.promoFooter}><span><ShopIcon name="bag" /> Produits</span><span><ShopIcon name="package" /> Commandes</span><span><ShopIcon name="shield" /> Vérification</span></div>
        </aside>
      </div>
    </div>
  </div>
}
