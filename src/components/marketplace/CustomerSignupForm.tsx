'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { enregistrerFiche } from '@/lib/profil'
import { supabase } from '@/lib/supabase'
import styles from '@/app/inscription/signup.module.css'

export function CustomerSignupForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const local = connexionLocaleActive && !supabase()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim().toLowerCase()
    const phone = String(data.get('phone') ?? '').replace(/[\s().-]/g, '')
    const password = String(data.get('password') ?? '')
    if (name.length < 2) return setError('Indiquez votre prénom et votre nom.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Vérifiez votre adresse e-mail.')
    if (!/^(?:\+?237)?6\d{8}$/.test(phone)) return setError('Saisissez un mobile camerounais à 9 chiffres, commençant par 6.')
    if (local ? !password : password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return setError(local ? 'Indiquez le mot de passe de démonstration.' : 'Choisissez au moins 8 caractères, avec une majuscule, une minuscule et un chiffre.')
    if (!data.get('terms')) return setError('Veuillez accepter les conditions d’utilisation.')
    setPending(true)
    try {
      const client = supabase()
      if (client) {
        const { data: auth, error: authError } = await client.auth.signUp({ email, password, options: { data: { full_name: name, phone } } })
        if (authError) throw authError
        if (auth.user?.identities?.length === 0) throw new Error('Cette adresse est peut-être déjà utilisée. Essayez de vous connecter.')
        if (auth.session) await enregistrerFiche({ nom: name, telephone: phone })
        setSuccess(auth.session ? 'Votre compte est prêt. Vous pouvez reprendre vos achats.' : 'Vérifiez votre boîte e-mail pour confirmer votre compte.')
      } else if (connexionLocaleActive) {
        await seConnecterLocalement(email, password)
        await enregistrerFiche({ nom: name, telephone: phone })
        setSuccess('Vous êtes connecté à l’environnement de démonstration. Aucun compte personnel n’a été créé ici.')
      } else throw new Error('Le service d’inscription est indisponible pour le moment.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’inscription n’a pas abouti. Réessayez.')
    } finally { setPending(false) }
  }

  if (success) return <section className={`${styles.formArea} ${styles.success}`} aria-live="polite"><span className={styles.successMark}>✓</span><h1>Vous y êtes presque</h1><p>{success}</p><button type="button" className={styles.primary} onClick={() => router.push('/')}>Retourner à l’accueil</button></section>

  return <section className={styles.formArea} aria-labelledby="customer-signup-title">
    <h1 id="customer-signup-title">Créer un compte</h1>
    <p className={styles.intro}>Vos commandes, vos adresses et vos boutiques au même endroit.</p>
    <form onSubmit={submit} noValidate>
      <label>Nom complet<input name="name" autoComplete="name" placeholder="Votre nom et votre prénom" /></label>
      <label>Adresse e-mail<input name="email" type="email" autoComplete="email" placeholder="exemple@email.com" /></label>
      <label>Téléphone mobile<span className={styles.phone}><span>+237</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="6XX XXX XXX" /></span></label>
      <label>{local ? 'Mot de passe de démonstration' : 'Mot de passe'}<span className={styles.password}><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={local ? 'Accès fourni par l’équipe' : '8 caractères minimum'} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label>
      {!local ? <p className={styles.hint}>Au moins une majuscule, une minuscule et un chiffre.</p> : <p className={styles.hint}>Cette version locale utilise un accès partagé, pas un compte personnel.</p>}
      <label className={styles.check}><input name="terms" type="checkbox" /><span>J’accepte les <Link href="/conditions" target="_blank">conditions d’utilisation</Link> et j’ai lu la <Link href="/politique-confidentialite" target="_blank">politique de confidentialité</Link>.</span></label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.primary} disabled={pending}>{pending ? 'Un instant…' : local ? 'Continuer en démonstration' : 'Créer mon compte'}</button>
    </form>
    <p className={styles.switch}>Déjà un compte ? <Link href="/connexion">Se connecter</Link></p>
  </section>
}
