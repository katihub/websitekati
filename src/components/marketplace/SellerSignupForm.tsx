'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { quartiersDe, useLocalites } from '@/lib/localites'
import { CHOIX_VENDEUR, LIBELLE_MODE, MODES_LIVRAISON, type DeliveryMode } from '@/lib/modes-livraison'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useCategoriesMarketplace, type CategorieMarketplace } from './vendeur/categories'
import { supabase } from '@/lib/supabase'
import { ShopIcon } from './ShopIcon'
import styles from '@/app/devenir-vendeur/seller.module.css'

type Receipt = { reference: string; statut: 'candidature_recue'; boutique: { nom: string; slug: string } }
type SavMode = 'kati_service' | 'boutique'
type Values = {
  owner: string; email: string; phone: string; password: string; confirmation: string
  legal: string; type: 'personne_physique' | 'entreprise'; niu: string; rccm: string
  birthDate: string; birthPlace: string; residenceCity: string; district: string; districtOther: boolean; sponsorName: string; sponsorPhone: string
  shop: string; description: string; cities: string[]; categories: string[]; modes: DeliveryMode[]; pickup: string; stock: 'suivi' | 'non_suivi'; sav: SavMode | ''
}

const steps = ['Vos coordonnées', 'Votre boutique', 'Votre activité', 'Vérification']
const cities = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi']
const AUTRE_QUARTIER = '__autre__'
/** La date de naissance la plus recente acceptee : avoir 18 ans aujourd'hui. */
const dateMajorite = (aujourdhui = new Date()) => {
  const limite = new Date(aujourdhui)
  limite.setFullYear(limite.getFullYear() - 18)
  return limite.toISOString().slice(0, 10)
}
const dateLisible = (iso: string) => (iso ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)) : '')
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function SellerSignupForm() {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>({ owner: '', email: '', phone: '', password: '', confirmation: '', legal: '', type: 'entreprise', niu: '', rccm: '', birthDate: '', birthPlace: '', residenceCity: '', district: '', districtOther: false, sponsorName: '', sponsorPhone: '', shop: '', description: '', cities: ['Douala'], categories: [], modes: ['katihub'], pickup: '', stock: 'suivi', sav: '' })
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
  const quartiersResidence = quartiersDe(localites, values.residenceCity)
  const { categories: arbreCategories, erreur: erreurCategories, reessayer: relireCategories } = useCategoriesMarketplace()
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
      if (!values.modes.length) return 'Choisissez au moins une façon de remettre vos commandes.'
      if (values.modes.includes('retrait') && values.pickup.trim().length < 5) return 'Indiquez l’adresse où vos clients retirent leurs commandes.'
      if (!values.sav) return 'Choisissez qui prendra en charge votre service après-vente.'
    }
    if (currentStep === 2) {
      if (values.type === 'entreprise') return values.legal.trim().length < 2 ? 'Indiquez la dénomination de votre entreprise.' : ''
      if (values.legal.trim().length < 2) return 'Indiquez votre nom et votre prénom.'
      if (!values.birthDate) return 'Indiquez votre date de naissance.'
      if (values.birthDate > dateMajorite()) return 'Vous devez avoir au moins 18 ans pour vendre sur KatiMarket.'
      if (values.birthPlace.trim().length < 2) return 'Indiquez votre lieu de naissance.'
      if (!values.residenceCity) return 'Choisissez votre ville de résidence.'
      if (values.district.trim().length < 2) return 'Indiquez votre quartier de résidence.'
      const telephoneParrain = values.sponsorPhone.replace(/[\s().-]/g, '')
      if (telephoneParrain && !/^\+?\d{8,15}$/.test(telephoneParrain)) return 'Le numéro du fournisseur ou parrain est invalide.'
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
        if (values.type === 'entreprise') {
          if (values.niu.trim()) formulaire.append('niu', values.niu.trim())
          if (values.rccm.trim()) formulaire.append('rccm', values.rccm.trim())
        } else {
          formulaire.append('dateNaissance', values.birthDate)
          formulaire.append('lieuNaissance', values.birthPlace.trim())
          formulaire.append('villeResidence', values.residenceCity)
          formulaire.append('quartierResidence', values.district.trim())
          if (values.sponsorName.trim()) formulaire.append('parrainNom', values.sponsorName.trim())
          if (values.sponsorPhone.trim()) formulaire.append('parrainTelephone', values.sponsorPhone.replace(/[\s().-]/g, ''))
        }
        formulaire.append('boutique', JSON.stringify({ nom: values.shop.trim(), slug, description: values.description.trim(), gestionSav: values.sav, modesLivraison: MODES_LIVRAISON.filter(mode => values.modes.includes(mode)), villesLivraison: values.cities, ville: villePrincipale, ...(values.categories.length ? { categoriesVente: values.categories } : {}), suiviStock: values.stock === 'suivi', ...(values.modes.includes('retrait') ? { adresseRetrait: values.pickup.trim() } : {}) }))
        formulaire.append('proprietaire', JSON.stringify({ courriel: values.email.trim().toLowerCase(), nom: values.owner.trim(), telephone: values.phone.replace(/[\s().-]/g, '') }))
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
            <fieldset className={`${styles.wide} ${styles.choiceGrid}`}><legend>Que vendrez-vous ? (facultatif)</legend><small>Sélectionnez les catégories de produits commercialisées par votre boutique. Ce choix est indicatif : il ne limite pas les produits que vous pourrez proposer.</small>{erreurCategories ? <p className={styles.error} role="alert">{erreurCategories} <button type="button" onClick={relireCategories}>Réessayer</button></p> : null}{categoriesDisponibles.map(categorie => <label key={categorie.id}><input type="checkbox" checked={values.categories.includes(categorie.id)} onChange={() => basculerCategorie(categorie.id)} />{categorie.label}</label>)}</fieldset>
            <label className={styles.wide}>Présentez votre boutique <b>*</b><textarea rows={3} value={values.description} onChange={set('description')} placeholder="Quelques mots sur votre boutique et ses produits." /><small>Cette description sera utilisée pour présenter la boutique.</small></label>
            <fieldset className={styles.wide}><legend>Comment vos clients reçoivent-ils leurs commandes ? <b>*</b></legend>{(['vendeur', 'retrait', 'katihub', 'agence'] as const).map(mode => <label key={mode}><input type="checkbox" checked={values.modes.includes(mode)} onChange={() => basculerMode(mode)} data-testid={`mode-${mode}`}/>{CHOIX_VENDEUR[mode]}</label>)}</fieldset>
            {values.modes.includes('retrait') ? <label className={styles.wide}>Adresse de retrait <b>*</b><input value={values.pickup} onChange={set('pickup')} maxLength={240} placeholder="Ex. Akwa, rue Joss, face à la station Total" /></label> : null}
            <label className={styles.wide}>Suivez-vous votre stock sur KatiMarket ? <b>*</b><select value={values.stock} onChange={set('stock')}><option value="suivi">Oui, je tiens mes quantités à jour</option><option value="non_suivi">Non, je confirme chaque commande et refuse un article manquant</option></select></label>
            <fieldset className={`${styles.wide} ${styles.sellerType} ${styles.savChoice}`}><legend>Qui gérera votre service après-vente (SAV) ? <b>*</b></legend><label><input type="radio" name="sav-mode" value="kati_service" checked={values.sav === 'kati_service'} onChange={set('sav')} /><span><strong>Kati Service gère mon SAV</strong><small>L’équipe KatiMarket prend en charge les demandes clients, les retours et leur suivi.</small></span></label><label><input type="radio" name="sav-mode" value="boutique" checked={values.sav === 'boutique'} onChange={set('sav')} /><span><strong>Je gère moi-même mon SAV</strong><small>Votre boutique répond directement aux clients et traite les demandes après-vente.</small></span></label></fieldset>
          </div>
          {slug ? <p className={styles.shopPreview}>Adresse prévue : <strong>katihub.cm/boutiques/{slug}</strong></p> : null}
        </> : null}
        {step === 2 ? <>
          <div className={styles.sectionHead}><h2 id="signup-form-title">Sous quel nom vendez-vous ?</h2><p>Ces renseignements nous aident à vérifier votre activité.</p></div>
          <fieldset className={styles.sellerType}><legend>Votre situation <b>*</b></legend><label><input type="radio" name="seller-type" value="entreprise" checked={values.type === 'entreprise'} onChange={set('type')} /><span><strong>Je représente une entreprise</strong><small>Société ou organisation enregistrée</small></span></label><label><input type="radio" name="seller-type" value="personne_physique" checked={values.type === 'personne_physique'} onChange={set('type')} /><span><strong>Je vends en mon nom</strong><small>Activité individuelle</small></span></label></fieldset>
          {values.type === 'entreprise' ? <div className={styles.fields}>
            <label className={styles.wide}>Dénomination de l’entreprise <b>*</b><input value={values.legal} onChange={set('legal')} placeholder="Nom figurant sur vos documents" /></label>
            <label>NIU (facultatif)<input value={values.niu} onChange={set('niu')} placeholder="Numéro d’identifiant unique" /></label>
            <label>RCCM (facultatif)<input value={values.rccm} onChange={set('rccm')} placeholder="Registre du commerce" /></label>
            <p className={`${styles.wide} ${styles.hint}`}>Vos justificatifs (CNI, NIU, RCCM) s’envoient plus tard depuis votre espace vendeur, qui vous rappelle ceux qui manquent.</p>
          </div> : <div className={styles.fields}>
            <label className={styles.wide}>Nom et prénom <b>*</b><input value={values.legal} onChange={set('legal')} autoComplete="name" placeholder="Vos nom et prénom officiels" data-testid="inscription-nom" /></label>
            <label>Date de naissance <b>*</b><input type="date" value={values.birthDate} onChange={set('birthDate')} max={dateMajorite()} autoComplete="bday" data-testid="inscription-naissance" /><small>Vous devez avoir au moins 18 ans.</small></label>
            <label>Lieu de naissance <b>*</b><input value={values.birthPlace} onChange={set('birthPlace')} maxLength={120} placeholder="Ex. Bafoussam" data-testid="inscription-lieu-naissance" /></label>
            <label>Ville de résidence <b>*</b><select value={values.residenceCity} onChange={event => { setValues(current => ({ ...current, residenceCity: event.target.value, district: '' })); setError('') }} data-testid="inscription-ville-residence"><option value="" disabled>Choisissez…</option>{villes.map(city => <option key={city} value={city}>{city}</option>)}</select></label>
            {quartiersResidence.length ? <label>Quartier de résidence <b>*</b><select value={values.districtOther ? AUTRE_QUARTIER : values.district} onChange={event => { const autre = event.target.value === AUTRE_QUARTIER; setValues(current => ({ ...current, districtOther: autre, district: autre ? '' : event.target.value })); setError('') }} data-testid="inscription-quartier"><option value="" disabled>Choisissez…</option>{quartiersResidence.map(q => <option key={q.id} value={q.nom}>{q.nom}</option>)}<option value={AUTRE_QUARTIER}>Autre quartier…</option></select></label> : null}
            {!quartiersResidence.length || values.districtOther ? <label>{quartiersResidence.length ? 'Autre quartier' : 'Quartier de résidence'} <b>*</b><input value={values.district} onChange={set('district')} maxLength={80} placeholder="Ex. Akwa, Bonamoussadi…" data-testid="inscription-quartier-libre" /></label> : null}
            <label>Nom d’un fournisseur ou parrain (facultatif)<input value={values.sponsorName} onChange={set('sponsorName')} maxLength={120} placeholder="Une personne qui vous connaît" /></label>
            <label>Téléphone d’un fournisseur ou parrain (facultatif)<input type="tel" value={values.sponsorPhone} onChange={set('sponsorPhone')} placeholder="Ex. 6 77 00 11 22" /></label>
            <p className={`${styles.wide} ${styles.hint}`}>Votre CNI s’envoie plus tard depuis votre espace vendeur, qui vous rappelle les documents qui manquent.</p>
          </div>}
        </> : null}
        {step === 3 ? <>
          <div className={styles.sectionHead}><h2 id="signup-form-title">Tout est bon pour vous ?</h2><p>Relisez les informations avant d’envoyer votre candidature.</p></div>
          <dl className={styles.review}><div><dt>Contact</dt><dd>{values.owner}<br />{values.email}<br />{values.phone}</dd><button type="button" onClick={() => setStep(0)}>Modifier</button></div><div><dt>Boutique</dt><dd>{values.shop} · {values.cities.join(', ')}<br />{values.categories.length ? <>{categoriesDisponibles.filter(c => values.categories.includes(c.id)).map(c => c.label).join(', ')}<br /></> : null}{values.description}<br />{values.modes.map(mode => LIBELLE_MODE[mode]).join(', ')} · {values.stock === 'suivi' ? 'stock suivi' : 'stock non suivi'}<br />SAV : {values.sav === 'kati_service' ? 'géré par Kati Service' : 'géré par la boutique'}</dd><button type="button" onClick={() => setStep(1)}>Modifier</button></div><div><dt>Activité</dt><dd>{values.legal}<br />{values.type === 'entreprise' ? `Entreprise${values.niu.trim() ? ` · NIU ${values.niu.trim()}` : ''}${values.rccm.trim() ? ` · RCCM ${values.rccm.trim()}` : ''}` : <>Vendeur individuel · né(e) le {dateLisible(values.birthDate)} à {values.birthPlace}<br />Réside à {values.residenceCity}, {values.district}{values.sponsorName.trim() || values.sponsorPhone.trim() ? <><br />Fournisseur ou parrain : {[values.sponsorName.trim(), values.sponsorPhone.trim()].filter(Boolean).join(' · ')}</> : null}</>}</dd><button type="button" onClick={() => setStep(2)}>Modifier</button></div></dl>
          <label className={styles.terms}><input type="checkbox" checked={accepted} onChange={event => { setAccepted(event.target.checked); setError('') }} /><span>J’accepte le <Link href="/contrat-vendeurs" target="_blank">contrat vendeur</Link> et j’ai pris connaissance de la <Link href="/politique-confidentialite" target="_blank">politique de confidentialité</Link>. <b>*</b></span></label>
        </> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>{step > 0 ? <button className={styles.back} type="button" onClick={() => { setError(''); setStep(step - 1) }}>Retour</button> : null}<button className={styles.submit} disabled={pending}>{pending ? 'Envoi en cours…' : step === steps.length - 1 ? 'Envoyer ma candidature' : 'Continuer'} <ShopIcon name="arrow" /></button></div>
      </form>
    </section>
    <aside className={styles.promo}><div className={styles.promoVisual}><Image src="/marchande-katihub-cameroun.png" alt="Une commerçante camerounaise dans sa boutique" fill sizes="(max-width: 900px) 100vw, 32vw" /></div><div className={styles.promoCopy}><h2>Votre boutique a sa place ici.</h2><p>Racontez-nous ce que vous vendez. Nous vous accompagnerons pour préparer votre arrivée sur KatiMarket.</p><p>La candidature prend quelques minutes. Vous pourrez compléter vos justificatifs plus tard.</p><Link href="/connexion-vendeur">Vous avez déjà un compte ? Se connecter <ShopIcon name="arrow" /></Link></div></aside>
  </div>
}
