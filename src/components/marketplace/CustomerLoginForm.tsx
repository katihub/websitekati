'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { completerFicheDepuisInscription } from '@/lib/profil'
import { avecRetour, useRetourDemande } from '@/lib/retour'
import { supabase } from '@/lib/supabase'
import styles from '@/app/inscription/signup.module.css'

export function CustomerLoginForm() {
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
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Vérifiez votre adresse e-mail.')
    if (!password) return setError('Indiquez votre mot de passe.')
    setPending(true)
    try {
      const client = supabase()
      if (client) {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (authError) throw authError
        await completerFicheDepuisInscription(data.user?.user_metadata)
      } else if (connexionLocaleActive) await seConnecterLocalement(email.trim().toLowerCase(), password)
      else throw new Error('La connexion est indisponible pour le moment.')
      setPassword('')
      // Retour a la page d'origine (commande, devis, avis d'une boutique), seulement vers un chemin interne.
      router.push(retour ?? '/compte/commandes')
    } catch {
      setError('Connexion impossible. Vérifiez votre adresse et votre mot de passe.')
    } finally { setPending(false) }
  }

  async function resetPassword() {
    setError(''); setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Saisissez d’abord votre adresse e-mail.')
    const client = supabase()
    if (!client) return setError('En démonstration, demandez les accès à l’équipe KatiMarket.')
    setResetPending(true)
    try {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/nouveau-mot-de-passe` })
      if (resetError) throw resetError
      setNotice('Si ce compte existe, nous avons envoyé un lien à cette adresse.')
    } catch {
      setError('Le lien n’a pas pu être envoyé. Réessayez dans un instant.')
    } finally { setResetPending(false) }
  }

  return <section className={styles.formArea} aria-labelledby="customer-login-title">
    <h1 id="customer-login-title">Bon retour sur KatiMarket</h1>
    <p className={styles.intro}>Retrouvez vos commandes et reprenez vos achats.</p>
    <form onSubmit={submit} noValidate>
      <label>Adresse e-mail<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="exemple@email.com" /></label>
      <label>Mot de passe<span className={styles.password}><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Votre mot de passe" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label>
      <div className={styles.aux}><button type="button" disabled={resetPending} onClick={() => void resetPassword()}>{resetPending ? 'Envoi du lien…' : 'Mot de passe oublié ?'}</button></div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      <button className={styles.primary} disabled={pending}>{pending ? 'Connexion en cours…' : 'Se connecter'}</button>
    </form>
    <p className={styles.switch}>Pas encore de compte ? <Link href={avecRetour('/inscription', retour)}>Créer un compte</Link></p>
  </section>
}
