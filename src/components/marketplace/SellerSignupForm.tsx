'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocalites } from '@/lib/localites'
import { CHOIX_VENDEUR, LIBELLE_MODE, MODES_LIVRAISON, type DeliveryMode } from '@/lib/modes-livraison'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useCategoriesMarketplace, type CategorieMarketplace } from './vendeur/categories'
import { supabase } from '@/lib/supabase'
import { ShopIcon } from './ShopIcon'
import styles from '@/app/devenir-vendeur/seller.module.css'

type Receipt = { reference: string; statut: 'candidature_recue'; boutique: { nom: string; slug: string } }
type Values = {
  owner: string; email: string; phone: string; password: string; confirmation: string
  legal: string; type: 'personne_physique' | 'entreprise'; niu: string; rccm: string
  shop: string; description: string; cities: string[]; categories: string[]; modes: DeliveryMode[]; pickup: string; stock: 'suivi' | 'non_suivi'
}

const steps = ['Vos coordonnées', 'Votre boutique', 'Votre activité', 'Vérification']
const cities = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi']
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function SellerSignupForm() {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>({ owner: '', email: '', phone: '', password: '', confirmation: '', legal: '', type: 'entreprise', niu: '', rccm: '', shop: '', description: '', cities: ['Douala'], categories: [], modes: ['katihub'], pickup: '', stock: 'suivi' })
  const [cni, setCni] = useState<File | null>(null)
  const [villeLibre, setVilleLibre] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [accountState, setAccountState] = useState<'creating' | 'ready' | 'pending-email' | 'needs-action' | 'existing-account' | 'local'>('creating')
  const [showPassword, setShowPassword] = useState(false)
  const slug = slugify(values.shop)
  const localites = useLocalites()
  const villes = [...new Set([...localites.map(l => l.ville), ...cities, ...values.cities])]
  const { categories: arbreCategories, erreur: erreurCategories } = useCategoriesMarketplace()
  const categoriesDisponibles = (arbreCategories ?? []).flatMap((categorie: CategorieMarketplace) =>
    categorie.sousCategories.length ? categorie.sousCategories.map(sous => ({ id: sous.id, label: `${categorie.nom} · ${sous.nom}` })) : [{ id: categorie.id, label: categorie.nom }],
  )
  const basculerMode = (mode: DeliveryMode) => {
    setValues(current => ({ ...current, modes: current.modes.includes(mode) ? current.modes.filter(m => m !== mode) : [...current.modes, mode] }))
    setError('')
  }
  const needsPassword = Boolean(supabase())
  const basculerVille = (ville: string) => setValues(current => ({ ...current, cities: current.cities.includes(ville) ? current.cities.filter(v => v !== ville) : [...current.cities, ville] }))
  const basculerCategorie = (id: string) => setValues(current => ({ ...current, categories: current.categories.includes(id) ? current.categories.filter(value => value !== id) : [...current.categories, id] }))

  const set = (key: keyof Values) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues(current => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  function validate(currentStep: number): string {
    if (currentStep === 0) {
      if (values.owner.trim().length < 2) return 'Indiquez votre nom et votre prénom.'
      if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) return 'Indiquez une adresse e-mail valide.'
      if (!/^(?:\+?237)?6\d{8}$/.test(values.phone.replace(/[\s().-]/g, ''))) return 'Indiquez un numéro mobile camerounais valide, commençant par 6.'
      if (needsPassword && values.password.length < 8) return 'Choisissez un mot de passe d’au moins 8 caractères.'
      if (needsPassword && values.password !== values.confirmation) return 'Les deux mots de passe ne correspondent pas.'
    }
    if (currentStep === 1) {
      if (values.shop.trim().length < 2 || !slug) return 'Donnez un nom à votre boutique.'
      if (values.description.trim().length < 10) return 'Présentez vos produits en quelques mots (au moins 10 caractères).'
      if (!values.cities.length) return 'Choisissez au moins une ville d’implantation.'
      if (values.cities.length > 20) return 'Vous pouvez indiquer au maximum 20 villes.'
      if (!values.categories.length) return 'Choisissez au moins une categorie de produits.'
      if (!values.modes.length) return 'Choisissez au moins une façon de remettre vos commandes.'
      if (values.modes.includes('retrait') && values.pickup.trim().length < 5) return 'Indiquez l’adresse où vos clients retirent leurs commandes.'
    }
    if (currentStep === 2) {
      if (values.legal.trim().length < 2) return 'Indiquez le nom sous lequel vous exercez votre activité.'
      if (!cni) return 'Joignez une photo ou un PDF de votre CNI.'
      if (cni.size > 10 * 1024 * 1024) return 'Le fichier CNI ne doit pas depasser 10 Mio.'
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(cni.type)) return 'Le fichier CNI doit etre une photo JPEG, PNG ou WebP, ou un PDF.'
      if (values.type === 'entreprise' && (!values.niu.trim() || !values.rccm.trim())) return 'Pour une entreprise, le NIU et le RCCM sont nécessaires.'
    }
    if (currentStep === 3 && !accepted) return 'Veuillez accepter le contrat vendeur avant l’envoi.'
    return ''
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const issue = validate(step)
    if (issue) return setError(issue)
    setError('')
    if (step < steps.length - 1) setStep(step + 1)
    else void submit()
  }

  async function createAccount() {
    const auth = supabase()
    if (!auth) return setAccountState('local')
    const { data, error: authError } = await auth.auth.signUp({
      email: values.email.trim().toLowerCase(), password: values.password,
      options: { data: { full_name: values.owner.trim(), account_type: 'seller' } },
    })
    if (authError) throw authError
    if (data.user?.identities?.length === 0) throw new Error('User already registered')
    setAccountState(data.session ? 'ready' : 'pending-email')
  }

  async function submit() {
    if (pending) return
    setPending(true)
    setError('')
    let saved = receipt
    try {
      // Une erreur de création de compte ne relance pas le POST de candidature.
      if (!saved) {
        const formulaire = new FormData()
        const villePrincipale = values.cities[0]
        formulaire.append('type', values.type)
        formulaire.append('nomLegal', values.legal.trim())
        if (values.niu.trim()) formulaire.append('niu', values.niu.trim())
        if (values.rccm.trim()) formulaire.append('rccm', values.rccm.trim())
        formulaire.append('boutique', JSON.stringify({ nom: values.shop.trim(), slug, description: values.description.trim(), modesLivraison: MODES_LIVRAISON.filter(mode => values.modes.includes(mode)), villesLivraison: values.cities, ville: villePrincipale, categoriesVente: values.categories, suiviStock: values.stock === 'suivi', ...(values.modes.includes('retrait') ? { adresseRetrait: values.pickup.trim() } : {}) }))
        formulaire.append('proprietaire', JSON.stringify({ courriel: values.email.trim().toLowerCase(), nom: values.owner.trim(), telephone: values.phone.replace(/[\s().-]/g, '') }))
        formulaire.append('cni', cni!, cni!.name)
        saved = await api<Receipt>('/vendeurs/inscription', {
          methode: 'POST', anonyme: true,
          corps: formulaire,
        })
        setReceipt(saved)
      }
      await createAccount()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      const compteExistant = /already registered|already exists|user exists|déjà inscrit|déjà enregistré/i.test(message)
      if (saved) setAccountState(compteExistant ? 'existing-account' : 'needs-action')
      setError(compteExistant ? '' : message || 'Une erreur est survenue. Réessayez.')
    } finally { setPending(false) }
  }

  if (receipt) return <section className={styles.success} aria-live="polite">
    <span className={styles.successIcon}>✓</span>
    <p className={styles.successEyebrow}>Étape 1 · candidature enregistrée</p>
    <h2>Candidature reçue pour {receipt.boutique.nom}</h2>
    <p className={styles.reference}>Référence à conserver : <strong>{receipt.reference.slice(0, 8).toUpperCase()}</strong></p>
    <p>Notre équipe examinera votre dossier avant l’ouverture de la boutique.</p>
    {accountState === 'creating' ? <p className={styles.accountMessage}>Création de votre accès en cours…</p> : null}
    {accountState === 'pending-email' ? <p className={styles.accountMessage}>Si la création du compte est nouvelle, un e-mail de confirmation sera envoyé à <strong>{values.email}</strong>. Ouvrez-le pour activer votre accès vendeur.</p> : null}
    {accountState === 'ready' ? <p className={styles.accountMessage}>Votre accès est prêt. Vous pouvez compléter votre dossier vendeur.</p> : null}
    {accountState === 'local' ? <p className={styles.accountMessage}>Environnement de démonstration : votre candidature est enregistrée. Pour accéder à l’espace vendeur, utilisez les identifiants de développement fournis par l’équipe.</p> : null}
    {accountState === 'existing-account' ? <div className={styles.existingAccount}>
      <span className={styles.accountStep}>Étape 2 · accès vendeur</span>
      <h3>Vous avez déjà un compte avec cette adresse</h3>
      <p>Votre candidature est bien enregistrée. Aucun nouvel envoi n’est nécessaire. Connectez-vous avec <strong>{values.email}</strong> pour retrouver votre espace vendeur. Si vous avez oublié votre mot de passe, choisissez « Mot de passe oublié ? » sur la page de connexion.</p>
      <Link className={styles.primaryLink} href="/connexion-vendeur">Me connecter à mon compte <ShopIcon name="arrow" /></Link>
    </div> : null}
    {accountState === 'needs-action' ? <p className={styles.accountMessage}>Votre candidature est enregistrée, mais la création de l’accès a échoué. Vous pouvez réessayer sans renvoyer votre candidature.</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {accountState === 'needs-action' ? <button className={styles.submit} type="button" disabled={pending} onClick={() => void submit()}>{pending ? 'Création en cours…' : 'Réessayer la création du compte'}</button> : null}
    {accountState !== 'existing-account' ? <div className={styles.successLinks}><Link href="/espace-vendeur">Aller à mon espace vendeur</Link><Link href="/connexion-vendeur">Se connecter</Link></div> : null}
  </section>

  return <div className={styles.signupLayout}>
    <section className={styles.panel} aria-labelledby="signup-form-title">
      <div className={styles.progressTop}><span>Étape {step + 1} sur {steps.length}</span><strong>{steps[step]}</strong></div>
      <ol className={styles.steps} aria-label="Étapes de l’inscription">{steps.map((label, index) => <li key={label} className={index === step ? styles.active : index < step ? styles.done : ''} aria-current={index === step ? 'step' : undefined}><i>{index < step ? '✓' : index + 1}</i><span>{label}</span></li>)}</ol>
      <form onSubmit={next} noValidate>
        {step === 0 ? <>
          <div className={styles.sectionHead}><h2 id="signup-form-title">Faisons connaissance</h2><p>Ces coordonnées serviront à vous joindre au sujet de votre boutique.</p></div>
          <div className={styles.fields}>
            <label>Votre nom complet <b>*</b><input autoFocus autoComplete="name" value={values.owner} onChange={set('owner')} placeholder="Ex. Mireille Tchana" /></label>
            <label>Adresse e-mail <b>*</b><input type="email" autoComplete="email" value={values.email} onChange={set('email')} placeholder="vous@exemple.cm" /></label>
            <label>Numéro mobile <b>*</b><input type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} placeholder="6 12 34 56 78" /><small>Un numéro camerounais auquel nous pouvons vous joindre.</small></label>
            {needsPassword ? <><label>Créer un mot de passe <b>*</b><span className={styles.passwordField}><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={set('password')} placeholder="8 caractères minimum" /><button type="button" onClick={() => setShowPassword(current => !current)}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label><label>Confirmer le mot de passe <b>*</b><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.confirmation} onChange={set('confirmation')} placeholder="Retapez votre mot de passe" /></label></> : <p className={styles.documentsNote}>En démonstration, aucun mot de passe personnel n’est créé. L’équipe vous communiquera les accès de test.</p>}
          </div>
        </> : null}
        {step === 1 ? <>
          <div className={styles.sectionHead}><h2 id="signup-form-title">Parlez-nous de votre boutique</h2><p>Quelques mots suffisent pour préparer sa présentation.</p></div>
          <div className={styles.fields}>
            <label>Nom de la boutique <b>*</b><input autoFocus value={values.shop} onChange={set('shop')} placeholder="Ex. Les créations de Mireille" /></label>
            <fieldset className={`${styles.wide} ${styles.choiceGrid}`}><legend>Dans quelles villes votre boutique est-elle implantée ? <b>*</b></legend><small>Vous pouvez choisir plusieurs villes. La première sélectionnée sera affichée comme ville principale.</small>{villes.map(city => <label key={city}><input type="checkbox" checked={values.cities.includes(city)} onChange={() => basculerVille(city)} />{city}</label>)}<div className={styles.addCity}><input value={villeLibre} onChange={event => setVilleLibre(event.target.value)} placeholder="Ajouter une autre ville" aria-label="Ajouter une autre ville" /><button type="button" onClick={() => { const ville = villeLibre.trim(); if (ville && !values.cities.includes(ville)) setValues(current => ({ ...current, cities: [...current.cities, ville] })); setVilleLibre('') }}>Ajouter</button></div></fieldset>
            <fieldset className={`${styles.wide} ${styles.choiceGrid}`}><legend>Que vendrez-vous ? <b>*</b></legend><small>Sélectionnez les catégories de produits commercialisées par votre boutique.</small>{erreurCategories ? <p className={styles.error} role="alert">{erreurCategories}</p> : null}{categoriesDisponibles.map(categorie => <label key={categorie.id}><input type="checkbox" checked={values.categories.includes(categorie.id)} onChange={() => basculerCategorie(categorie.id)} />{categorie.label}</label>)}</fieldset>
            <label className={styles.wide}>Présentez votre boutique <b>*</b><textarea rows={3} value={values.description} onChange={set('description')} placeholder="Quelques mots sur votre boutique et ses produits." /><small>Cette description sera utilisée pour présenter la boutique.</small></label>
            <fieldset className={styles.wide}><legend>Comment vos clients reçoivent-ils leurs commandes ? <b>*</b></legend>{(['vendeur', 'retrait', 'katihub', 'agence'] as const).map(mode => <label key={mode}><input type="checkbox" checked={values.modes.includes(mode)} onChange={() => basculerMode(mode)} data-testid={`mode-${mode}`}/>{CHOIX_VENDEUR[mode]}</label>)}</fieldset>
            {values.modes.includes('retrait') ? <label className={styles.wide}>Adresse de retrait <b>*</b><input value={values.pickup} onChange={set('pickup')} maxLength={240} placeholder="Ex. Akwa, rue Joss, face à la station Total" /></label> : null}
            <label className={styles.wide}>Suivez-vous votre stock sur KatiMarket ? <b>*</b><select value={values.stock} onChange={set('stock')}><option value="suivi">Oui, je tiens mes quantités à jour</option><option value="non_suivi">Non, je confirme chaque commande et refuse un article manquant</option></select></label>
          </div>
          {slug ? <p className={styles.shopPreview}>Adresse prévue : <strong>katihub.cm/boutiques/{slug}</strong></p> : null}
        </> : null}
        {step === 2 ? <>
          <div className={styles.sectionHead}><h2 id="signup-form-title">Sous quel nom vendez-vous ?</h2><p>Ces renseignements nous aident à vérifier votre activité.</p></div>
          <fieldset className={styles.sellerType}><legend>Votre situation <b>*</b></legend><label><input type="radio" name="seller-type" value="entreprise" checked={values.type === 'entreprise'} onChange={set('type')} /><span><strong>Je représente une entreprise</strong><small>Société ou organisation enregistrée</small></span></label><label><input type="radio" name="seller-type" value="personne_physique" checked={values.type === 'personne_physique'} onChange={set('type')} /><span><strong>Je vends en mon nom</strong><small>Activité individuelle</small></span></label></fieldset>
          <div className={styles.fields}><label className={styles.wide}>{values.type === 'entreprise' ? 'Dénomination de l’entreprise' : 'Nom légal du vendeur'} <b>*</b><input value={values.legal} onChange={set('legal')} placeholder={values.type === 'entreprise' ? 'Nom figurant sur vos documents' : 'Votre nom et prénom officiels'} /></label><label className={styles.wide}>Carte nationale d’identité (CNI) <b>*</b><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => setCni(event.target.files?.[0] ?? null)} /><small>Photo ou PDF, 10 Mio maximum. Le document est transmis et conservé dans un espace privé.</small>{cni ? <small>Fichier sélectionné : {cni.name}</small> : null}</label>{values.type === 'entreprise' ? <><label>NIU <b>*</b><input value={values.niu} onChange={set('niu')} placeholder="Numéro d’identifiant unique" /></label><label>RCCM <b>*</b><input value={values.rccm} onChange={set('rccm')} placeholder="Registre du commerce" /></label></> : null}</div>
        </> : null}
        {step === 3 ? <>
          <div className={styles.sectionHead}><h2 id="signup-form-title">Tout est bon pour vous ?</h2><p>Relisez les informations avant d’envoyer votre candidature.</p></div>
          <dl className={styles.review}><div><dt>Contact</dt><dd>{values.owner}<br />{values.email}<br />{values.phone}</dd><button type="button" onClick={() => setStep(0)}>Modifier</button></div><div><dt>Boutique</dt><dd>{values.shop} · {values.cities.join(', ')}<br />{categoriesDisponibles.filter(c => values.categories.includes(c.id)).map(c => c.label).join(', ')}<br />{values.description}<br />{values.modes.map(mode => LIBELLE_MODE[mode]).join(', ')} · {values.stock === 'suivi' ? 'stock suivi' : 'stock non suivi'}</dd><button type="button" onClick={() => setStep(1)}>Modifier</button></div><div><dt>Activité</dt><dd>{values.legal}<br />{values.type === 'entreprise' ? `Entreprise · NIU ${values.niu} · RCCM ${values.rccm}` : 'Vendeur individuel'}<br />CNI : {cni?.name}</dd><button type="button" onClick={() => setStep(2)}>Modifier</button></div></dl>
          <label className={styles.terms}><input type="checkbox" checked={accepted} onChange={event => { setAccepted(event.target.checked); setError('') }} /><span>J’accepte le <Link href="/contrat-vendeurs" target="_blank">contrat vendeur</Link> et j’ai pris connaissance de la <Link href="/politique-confidentialite" target="_blank">politique de confidentialité</Link>. <b>*</b></span></label>
        </> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>{step > 0 ? <button className={styles.back} type="button" onClick={() => { setError(''); setStep(step - 1) }}>Retour</button> : null}<button className={styles.submit} disabled={pending}>{pending ? 'Envoi en cours…' : step === steps.length - 1 ? 'Envoyer ma candidature' : 'Continuer'} <ShopIcon name="arrow" /></button></div>
      </form>
    </section>
    <aside className={styles.promo}><div className={styles.promoVisual}><Image src="/marchande-katihub-cameroun.png" alt="Une commerçante camerounaise dans sa boutique" fill sizes="(max-width: 900px) 100vw, 32vw" /></div><div className={styles.promoCopy}><h2>Votre boutique a sa place ici.</h2><p>Racontez-nous ce que vous vendez. Nous vous accompagnerons pour préparer votre arrivée sur KatiMarket.</p><p>La candidature prend quelques minutes. Vous pourrez compléter vos justificatifs plus tard.</p><Link href="/connexion-vendeur">Vous avez déjà un compte ? Se connecter <ShopIcon name="arrow" /></Link></div></aside>
  </div>
}
