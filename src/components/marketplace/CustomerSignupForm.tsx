'use client'

import { useState, useSyncExternalStore, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { VILLES_CAMEROUN, villeValide } from '@/constants/villes'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { enregistrerFiche } from '@/lib/profil'
import { garderParrainage, lireParrainageGarde, oublierParrainage, rattacher } from '@/lib/parrainage'
import { avecRetour, useRetourDemande } from '@/lib/retour'
import { supabase } from '@/lib/supabase'
import { envoyerVerificationCourriel } from '@/lib/verification-courriel'
import styles from '@/app/inscription/signup.module.css'
import { useMarketplaceLanguage } from '@/lib/language'

const sansAbonnement = () => () => {}

export function CustomerSignupForm() {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const router = useRouter()
  const retour = useRetourDemande()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Le code du lien suivi avant l'inscription : vide au rendu serveur, lu ensuite dans le navigateur.
  const codeGarde = useSyncExternalStore(sansAbonnement, () => lireParrainageGarde()?.code ?? '', () => '')

  /** Le code est garde ; il est rattache tout de suite si l'inscription ouvre une session, sinon a la premiere visite de « Mes KATI ». */
  async function parrainer(code: string, session: boolean) {
    if (!code) return ''
    const garde = lireParrainageGarde()
    if (garde && garde.code !== code) oublierParrainage()
    const retenu = garderParrainage(code)
    if (!session) return ' Votre code de parrainage sera enregistré à votre première connexion.'
    try {
      await rattacher(code, retenu?.code === code ? retenu.jeton : undefined)
      return ' Votre parrain est enregistré.'
    } catch {
      return ' Votre code de parrainage n’a pas pu être enregistré : vérifiez-le dans « Mes KATI ».'
    }
  }
  const local = connexionLocaleActive && !supabase()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim().toLowerCase()
    const phone = String(data.get('phone') ?? '').replace(/[\s().-]/g, '')
    const city = villeValide(String(data.get('city') ?? ''))
    const password = String(data.get('password') ?? '')
    const code = String(data.get('parrain') ?? '').trim().toUpperCase().replace(/\s+/g, '')
    if (name.length < 2) return setError(en ? 'Enter your first and last name.' : 'Indiquez votre prénom et votre nom.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(en ? 'Check your email address.' : 'Vérifiez votre adresse e-mail.')
    if (!/^(?:\+?237)?6\d{8}$/.test(phone)) return setError(en ? 'Enter a 9-digit Cameroon mobile number starting with 6.' : 'Saisissez un mobile camerounais à 9 chiffres, commençant par 6.')
    if (!city) return setError(en ? 'Enter your city.' : 'Indiquez votre ville.')
    if (local ? !password : password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return setError(local ? (en ? 'Enter the demo password.' : 'Indiquez le mot de passe de démonstration.') : (en ? 'Use at least 8 characters, including uppercase, lowercase, and a number.' : 'Choisissez au moins 8 caractères, avec une majuscule, une minuscule et un chiffre.'))
    if (!data.get('terms')) return setError(en ? 'Please accept the terms of use.' : 'Veuillez accepter les conditions d’utilisation.')
    setPending(true)
    try {
      const client = supabase()
      if (client) {
        const { data: auth, error: authError } = await client.auth.signUp({ email, password, options: { data: { full_name: name, phone, city } } })
        if (authError) throw authError
        if (auth.user?.identities?.length === 0) throw new Error(en ? 'This address may already be in use. Try signing in.' : 'Cette adresse est peut-être déjà utilisée. Essayez de vous connecter.')
        if (auth.session) {
          await enregistrerFiche({ nom: name, telephone: phone, ville: city })
          await envoyerVerificationCourriel().catch(() => undefined)
        }
        const parrainage = await parrainer(code, Boolean(auth.session))
        setSuccess(`${auth.session ? (en ? 'Your account is ready. Confirm your email to unlock your KATI.' : 'Votre compte est prêt. Confirmez votre adresse e-mail pour débloquer vos KATI.') : (en ? 'Check your inbox to confirm your account.' : 'Vérifiez votre boîte e-mail pour confirmer votre compte.')}${parrainage}`)
      } else if (connexionLocaleActive) {
        await seConnecterLocalement(email, password)
        await enregistrerFiche({ nom: name, telephone: phone, ville: city })
        setSuccess(en ? 'You are signed in to the demo environment. No personal account was created.' : 'Vous êtes connecté à l’environnement de démonstration. Aucun compte personnel n’a été créé ici.')
      } else throw new Error(en ? 'Sign-up is temporarily unavailable.' : 'Le service d’inscription est indisponible pour le moment.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Sign-up failed. Please try again.' : 'L’inscription n’a pas abouti. Réessayez.'))
    } finally { setPending(false) }
  }

  if (success) return <section className={`${styles.formArea} ${styles.success}`} aria-live="polite"><span className={styles.successMark}>✓</span><h1>{en ? 'Almost there' : 'Vous y êtes presque'}</h1><p>{success}</p><button type="button" className={styles.primary} onClick={() => router.push(retour ?? '/')}>{retour ? (en ? 'Continue where I left off' : 'Reprendre là où j’en étais') : (en ? 'Back to home' : 'Retourner à l’accueil')}</button></section>

  return <section className={styles.formArea} aria-labelledby="customer-signup-title">
    <h1 id="customer-signup-title">{en ? 'Create an account' : 'Créer un compte'}</h1>
    <p className={styles.intro}>{en ? 'Your orders, addresses, and shops in one place.' : 'Vos commandes, vos adresses et vos boutiques au même endroit.'}</p>
    <form onSubmit={submit} noValidate>
      <label>{en ? 'Full name' : 'Nom complet'}<input name="name" autoComplete="name" placeholder={en ? 'Your first and last name' : 'Votre nom et votre prénom'} /></label>
      <label>{en ? 'Email address' : 'Adresse e-mail'}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" /></label>
      <label>{en ? 'Mobile phone' : 'Téléphone mobile'}<span className={styles.phone}><span>+237</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="6XX XXX XXX" /></span></label>
      <label>{en ? 'City' : 'Ville'}<input name="city" list="villes-inscription" autoComplete="address-level2" maxLength={60} placeholder={en ? 'Douala, Yaoundé…' : 'Douala, Yaoundé…'} /></label>
      <datalist id="villes-inscription">{VILLES_CAMEROUN.map(ville => <option key={ville} value={ville} />)}</datalist>
      <label>{local ? (en ? 'Demo password' : 'Mot de passe de démonstration') : (en ? 'Password' : 'Mot de passe')}<span className={styles.password}><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={local ? (en ? 'Access provided by the team' : 'Accès fourni par l’équipe') : (en ? 'At least 8 characters' : '8 caractères minimum')} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? (en ? 'Hide' : 'Masquer') : (en ? 'Show' : 'Afficher')}</button></span></label>
      {!local ? <p className={styles.hint}>{en ? 'Include uppercase and lowercase letters and a number.' : 'Au moins une majuscule, une minuscule et un chiffre.'}</p> : <p className={styles.hint}>{en ? 'This local version uses shared access, not a personal account.' : 'Cette version locale utilise un accès partagé, pas un compte personnel.'}</p>}
      <label>{en ? 'Referral code' : 'Code de parrainage'} <small>({en ? 'optional' : 'facultatif'})</small><input key={codeGarde} name="parrain" defaultValue={codeGarde} minLength={8} maxLength={8} pattern="[A-Za-z]{2}[0-9]{6}" placeholder="AM482731" autoComplete="off" /></label>
      <label className={styles.check}><input name="terms" type="checkbox" /><span>{en ? 'I accept the ' : 'J’accepte les '}<Link href="/conditions" target="_blank">{en ? 'terms of use' : 'conditions d’utilisation'}</Link>{en ? ' and have read the ' : ' et j’ai lu la '}<Link href="/politique-confidentialite" target="_blank">{en ? 'privacy policy' : 'politique de confidentialité'}</Link>.</span></label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.primary} disabled={pending}>{pending ? (en ? 'One moment…' : 'Un instant…') : local ? (en ? 'Continue in demo' : 'Continuer en démonstration') : (en ? 'Create my account' : 'Créer mon compte')}</button>
    </form>
    <p className={styles.switch}>{en ? 'Already have an account?' : 'Déjà un compte ?'} <Link href={avecRetour('/connexion', retour)}>{en ? 'Sign in' : 'Se connecter'}</Link></p>
  </section>
}
