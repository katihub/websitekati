'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '@/app/reinitialiser-mot-de-passe/recovery.module.css'

export function PasswordRecovery({ audience = 'vendeur' }: { audience?: 'vendeur' | 'client' }) {
  const connexion = audience === 'client' ? '/connexion' : '/connexion-vendeur'
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired' | 'done' | 'unavailable'>(() => supabase() ? 'checking' : 'unavailable')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const client = supabase()
    if (!client) return
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    if (hash.has('error') || query.has('error')) { queueMicrotask(() => setStatus('expired')); return }
    let mounted = true
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if (mounted && event === 'PASSWORD_RECOVERY' && session) setStatus('ready')
    })
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (mounted && !sessionError) setStatus(current => current === 'ready' ? current : data.session ? 'ready' : 'expired')
      else if (mounted) setStatus('expired')
    })
    return () => { mounted = false; subscription.subscription.unsubscribe() }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Choisissez un mot de passe d’au moins 8 caractères.')
    if (password !== confirmation) return setError('Les deux mots de passe ne correspondent pas.')
    const client = supabase()
    if (!client) return setStatus('unavailable')
    setPending(true)
    try {
      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw updateError
      await client.auth.signOut()
      setPassword('')
      setConfirmation('')
      setStatus('done')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le mot de passe n’a pas pu être modifié.')
    } finally { setPending(false) }
  }

  return <main className={styles.page}><section className={styles.card}>
    <Link href={connexion} className={styles.back}>← Connexion {audience === 'client' ? 'client' : 'vendeur'}</Link>
    <h1>Nouveau mot de passe</h1>
    {status === 'checking' ? <p role="status">Vérification de votre lien…</p> : null}
    {status === 'unavailable' ? <p>La réinitialisation n’est pas disponible dans cet environnement de démonstration. Contactez l’équipe KatiMarket pour obtenir vos accès.</p> : null}
    {status === 'expired' ? <><p>Ce lien a expiré ou n’est plus valide. Demandez-en un nouveau depuis la page de connexion.</p><Link href={connexion} className={styles.action}>Revenir à la connexion</Link></> : null}
    {status === 'done' ? <><p>Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.</p><Link href={connexion} className={styles.action}>Se connecter</Link></> : null}
    {status === 'ready' ? <><p>Choisissez un nouveau mot de passe pour votre {audience === 'client' ? 'compte client' : 'espace vendeur'}.</p><form onSubmit={submit}>
      <label>Nouveau mot de passe <span className={styles.passwordField}><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(current => !current)}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label>
      <label>Confirmer le mot de passe<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.action} disabled={pending}>{pending ? 'Modification en cours…' : 'Enregistrer le mot de passe'}</button>
    </form></> : null}
  </section></main>
}
