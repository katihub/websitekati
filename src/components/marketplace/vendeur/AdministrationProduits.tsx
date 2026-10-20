'use client'

/* eslint-disable @next/next/no-img-element -- les aperçus utilisent des URL blob locales avant tout téléversement */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { api, enteteAutorisation } from '@/lib/api'
import { lireSuggestionProduit, type MerchantProductDraft, type MerchantProductSuggestion } from '@/lib/merchant-product-ai'
import { cheminCategorie, useCategoriesMarketplace, type CategorieProduit } from './categories'
import { EditeurFicheProduit, type ImageFiche } from './EditeurFicheProduit'
import styles from './administration-produits.module.css'

type Produit = {
  id: string
  slug: string
  nom: string
  description: string | null
  marque: string | null
  categorie: string | null
  categorieDetail?: CategorieProduit
  statut: string
  creeLe: string
}

type Revision = {
  statut: string
  titre: string
  description: string | null
  prixFcfa: number
  prixReferenceFcfa: number | null
  etat: string
  garantieMois: number
  modesLivraison: string[]
  villesLivraison: string[]
  delaiMaxJours: number
  quantiteMinimale?: number
  libelleVariante: string | null
  attributsVariante: Record<string, string> | null
}

type Offre = {
  id: string
  referenceVendeur: string
  statut: string
  prixFcfa: number | null
  prixReferenceFcfa?: number | null
  titre?: string | null
  description?: string | null
  etat?: string | null
  garantieMois?: number | null
  modesLivraison?: string[]
  villesLivraison?: string[]
  delaiMaxJours?: number | null
  quantiteMinimale?: number
  libelleVariante: string | null
  attributsVariante: Record<string, string> | null
  produit: { id: string; nom: string; slug: string; statut: string }
  stock: { quantite: number; quantiteReservee: number } | null
  revisions: Revision[]
}

type BrouillonLot = { prix: string; prixReference: string; stock: string; minimum: string; delai: string }
type PhotoLocale = { fichier: File; url: string }
type Mode = 'liste' | 'ajout' | 'lot'

const STATUTS: Record<string, string> = {
  soumis: 'En validation', en_verification: 'En vérification', actif: 'Actif', publiee: 'Publiée',
  modification_demandee: 'À corriger', refuse: 'Refusé', brouillon: 'Brouillon', archive: 'Archivé', archivee: 'Archivée',
}
const EDITABLE = ['soumis', 'en_verification', 'actif', 'modification_demandee']
const REVISIONS_OUVERTES = ['soumise', 'en_verification']
const money = (valeur: number) => `${new Intl.NumberFormat('fr-FR').format(valeur)} FCFA`
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const messageErreur = (cause: unknown) => cause instanceof Error ? cause.message : 'L’action n’a pas pu aboutir.'

function valeursOffre(offre: Offre): BrouillonLot {
  const revision = offre.revisions[0]
  return {
    prix: String(offre.prixFcfa ?? revision?.prixFcfa ?? ''),
    prixReference: String(offre.prixReferenceFcfa ?? revision?.prixReferenceFcfa ?? ''),
    stock: String(offre.stock?.quantite ?? 0),
    minimum: String(offre.quantiteMinimale ?? revision?.quantiteMinimale ?? 1),
    delai: String(offre.delaiMaxJours ?? revision?.delaiMaxJours ?? 0),
  }
}

function identique(a: BrouillonLot, b: BrouillonLot) {
  return a.prix === b.prix && a.prixReference === b.prixReference && a.stock === b.stock && a.minimum === b.minimum && a.delai === b.delai
}

export function AdministrationProduits({ boutiqueId, nomBoutique, produits, offres, canPublish, onRefresh }: {
  boutiqueId: string
  nomBoutique: string
  produits: Produit[]
  offres: Offre[]
  canPublish: boolean
  onRefresh: () => Promise<void>
}) {
  const [mode, setMode] = useState<Mode>('liste')
  const [fiche, setFiche] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  if (fiche) return <EditeurFicheProduit key={fiche} boutiqueId={boutiqueId} produitId={fiche} onFermer={() => setFiche(null)} />

  return <section className={styles.shell} aria-label="Administration des produits">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>CATALOGUE VENDEUR</p><h2>Produits</h2><p>{produits.length} fiche(s) · {offres.length} offre(s) dans votre boutique</p></div>
      <div className={styles.headerActions}>
        {offres.length ? <button type="button" className={mode === 'lot' ? styles.activeSecondary : styles.secondary} onClick={() => setMode(mode === 'lot' ? 'liste' : 'lot')}>✎ Modification en lot</button> : null}
        <button type="button" className={styles.primary} disabled={!canPublish} onClick={() => setMode('ajout')}>＋ Nouveau produit</button>
      </div>
    </header>
    {notice ? <p role="status" className={styles.feedback}>{notice}</p> : null}
    {mode === 'ajout' ? <AjoutProduit boutiqueId={boutiqueId} nomBoutique={nomBoutique} canPublish={canPublish} onAnnuler={() => setMode('liste')} onCree={async () => { await onRefresh(); setNotice('Produit envoyé à la modération. Vous pouvez suivre son statut dans la liste.'); setMode('liste') }} /> : null}
    {mode === 'lot' ? <ModificationLot boutiqueId={boutiqueId} offres={offres} onRetour={() => setMode('liste')} onRefresh={onRefresh} /> : null}
    {mode === 'liste' ? <ListeProduits produits={produits} offres={offres} onFiche={setFiche} onAjouter={() => setMode('ajout')} onLot={() => setMode('lot')} /> : null}
  </section>
}

function ListeProduits({ produits, offres, onFiche, onAjouter, onLot }: { produits: Produit[]; offres: Offre[]; onFiche: (id: string) => void; onAjouter: () => void; onLot: () => void }) {
  const [recherche, setRecherche] = useState('')
  const filtres = produits.filter((produit) => `${produit.nom} ${produit.marque ?? ''} ${produit.categorie ?? ''}`.toLowerCase().includes(recherche.toLowerCase()))
  return <>
    <div className={styles.toolbar}><label className={styles.search}><span aria-hidden>⌕</span><input aria-label="Rechercher un produit" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un produit, une marque…" /></label><button type="button" onClick={onLot} disabled={!offres.length}>Modifier 10 ou 20 offres</button></div>
    {filtres.length ? <div className={styles.listWrap}><table className={styles.productTable}><thead><tr><th>Produit</th><th>Catégorie</th><th>Statut</th><th>Offres</th><th>Action</th></tr></thead><tbody>{filtres.map((produit) => {
      const liees = offres.filter((offre) => offre.produit.id === produit.id)
      const prix = liees.map((offre) => offre.prixFcfa ?? offre.revisions[0]?.prixFcfa).filter((value): value is number => typeof value === 'number').sort((a, b) => a - b)[0]
      return <tr key={produit.id}><td><strong>{produit.nom}</strong><small>{produit.marque || 'Marque non renseignée'}</small></td><td>{cheminCategorie(produit.categorieDetail, produit.categorie) || 'À classer'}</td><td><span className={styles.status} data-status={produit.statut}>{STATUTS[produit.statut] ?? produit.statut}</span></td><td><b>{liees.length}</b>{prix ? <small>dès {money(prix)}</small> : <small>Aucun prix publié</small>}</td><td>{EDITABLE.includes(produit.statut) ? <button type="button" className={styles.linkButton} onClick={() => onFiche(produit.id)}>Fiche et photos</button> : '—'}</td></tr>
    })}</tbody></table></div> : <div className={styles.empty}><span aria-hidden>□</span><h3>{recherche ? 'Aucun résultat' : 'Votre catalogue est vide'}</h3><p>{recherche ? 'Essayez un autre nom ou une autre marque.' : 'Créez votre première fiche avec un aperçu client en direct.'}</p>{!recherche ? <button type="button" className={styles.primary} onClick={onAjouter}>Ajouter un produit</button> : null}</div>}
  </>
}

function AjoutProduit({ boutiqueId, nomBoutique, canPublish, onAnnuler, onCree }: { boutiqueId: string; nomBoutique: string; canPublish: boolean; onAnnuler: () => void; onCree: () => Promise<void> }) {
  const [values, setValues] = useState<MerchantProductDraft>({ nom: '', marque: '', categorie: '', sousCategorie: '', description: '', descriptionCourte: '', ficheTechnique: '', metaTitre: '', metaDescription: '' })
  const [photos, setPhotos] = useState<PhotoLocale[]>([])
  const photosRef = useRef<PhotoLocale[]>([])
  const [pdf, setPdf] = useState<File | null>(null)
  const [mobile, setMobile] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [contexteIa, setContexteIa] = useState('')
  const [generationIa, setGenerationIa] = useState(false)
  const [messageIa, setMessageIa] = useState('')
  const [suggestionIa, setSuggestionIa] = useState<MerchantProductSuggestion | null>(null)
  const [avantIa, setAvantIa] = useState<MerchantProductDraft | null>(null)
  const { categories, erreur: erreurCategories } = useCategoriesMarketplace()
  const racine = categories?.find((categorie) => categorie.id === values.categorie)
  const sousCategorie = racine?.sousCategories.find((sous) => sous.id === values.sousCategorie)
  const categorieId = racine ? (racine.sousCategories.length ? sousCategorie?.id : racine.id) : undefined
  const garantie = sousCategorie?.garantie ?? (racine && !racine.sousCategories.length ? racine.garantie : null)
  const libelleCategorie = sousCategorie?.nom ?? racine?.nom ?? 'Catégorie à choisir'
  const image = photos[0]?.url
  const lignes = useMemo(() => values.ficheTechnique.split('\n').map((ligne) => ligne.trim()).filter(Boolean).slice(0, 5), [values.ficheTechnique])

  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), [])

  function choisirPhotos(fichiers: FileList | null) {
    if (!fichiers) return
    const valides = Array.from(fichiers).filter((fichier) => ['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type) && fichier.size <= 5 * 1024 * 1024)
    setPhotos((actuelles) => [...actuelles, ...valides.map((fichier) => ({ fichier, url: URL.createObjectURL(fichier) }))].slice(0, 12))
  }

  function retirerPhoto(index: number) {
    setPhotos((actuelles) => { URL.revokeObjectURL(actuelles[index]!.url); return actuelles.filter((_, position) => position !== index) })
  }

  async function genererFiche() {
    setMessageIa('')
    if (values.nom.trim().length < 2 && contexteIa.trim().length < 10) {
      setMessageIa('Indiquez au moins le nom ou la référence exacte du produit et quelques faits vérifiables.')
      return
    }
    setGenerationIa(true)
    try {
      const reponse = await fetch('/api/marchand/assistant-produit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await enteteAutorisation() },
        body: JSON.stringify({ boutiqueId, contexte: contexteIa, draft: values }),
      })
      const donnees = await reponse.json() as { suggestion?: unknown; message?: unknown }
      if (!reponse.ok) throw new Error(typeof donnees.message === 'string' ? donnees.message : 'La génération n’a pas abouti.')
      const suggestion = lireSuggestionProduit(donnees.suggestion)
      if (!suggestion) throw new Error('La proposition reçue est incomplète. Relancez la génération.')
      const categorieProposee = suggestion.categorieId
        ? categories?.flatMap((categorie) => [
            ...(categorie.id === suggestion.categorieId && !categorie.sousCategories.length ? [{ categorie: categorie.id, sousCategorie: '' }] : []),
            ...categorie.sousCategories.filter((sous) => sous.id === suggestion.categorieId).map((sous) => ({ categorie: categorie.id, sousCategorie: sous.id })),
          ])[0]
        : undefined
      setAvantIa(values)
      setSuggestionIa(suggestion)
      setValues((actuelles) => ({
        ...actuelles,
        nom: suggestion.nom || actuelles.nom,
        marque: suggestion.marque || actuelles.marque,
        categorie: categorieProposee?.categorie ?? actuelles.categorie,
        sousCategorie: categorieProposee?.sousCategorie ?? actuelles.sousCategorie,
        descriptionCourte: suggestion.descriptionCourte || actuelles.descriptionCourte,
        description: suggestion.description || actuelles.description,
        ficheTechnique: suggestion.ficheTechnique || actuelles.ficheTechnique,
        metaTitre: suggestion.metaTitre || actuelles.metaTitre,
        metaDescription: suggestion.metaDescription || actuelles.metaDescription,
      }))
      setMessageIa('La proposition a rempli la fiche et l’aperçu. Relisez les points signalés avant de soumettre.')
    } catch (cause) {
      setMessageIa(messageErreur(cause))
    } finally {
      setGenerationIa(false)
    }
  }

  function annulerApplicationIa() {
    if (!avantIa) return
    setValues(avantIa)
    setAvantIa(null)
    setSuggestionIa(null)
    setMessageIa('La fiche précédente a été restaurée.')
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage('')
    if (!categorieId) return setMessage(racine ? 'Choisissez la sous-catégorie du produit.' : 'Choisissez la catégorie du produit.')
    setPending(true)
    try {
      const produit = await api<{ id: string }>(`/marketplace/boutiques/${boutiqueId}/propositions-produits`, { methode: 'POST', corps: {
        nom: values.nom.trim(), slug: slugify(values.nom), marque: values.marque.trim() || undefined, categorieId,
        description: values.description.trim() || undefined, descriptionCourte: values.descriptionCourte.trim() || undefined, ficheTechnique: values.ficheTechnique.trim() || undefined,
      } })
      const images: ImageFiche[] = []
      for (const photo of photos) {
        const corps = new FormData(); corps.append('fichier', photo.fichier)
        images.push(await api<ImageFiche>(`/marketplace/boutiques/${boutiqueId}/produits/${produit.id}/images`, { methode: 'POST', corps }))
      }
      let clePdf: string | undefined
      if (pdf) {
        const corps = new FormData(); corps.append('fichier', pdf)
        const depot = await api<{ cle: string }>(`/marketplace/boutiques/${boutiqueId}/produits/${produit.id}/fiche-technique`, { methode: 'POST', corps })
        clePdf = depot.cle
      }
      if (images.length || values.metaTitre.trim() || values.metaDescription.trim()) {
        await api(`/marketplace/boutiques/${boutiqueId}/produits/${produit.id}/contenu/revisions`, { methode: 'POST', corps: {
          metaTitre: values.metaTitre.trim() || undefined, metaDescription: values.metaDescription.trim() || undefined,
          descriptionCourte: values.descriptionCourte.trim() || undefined, ficheTechnique: values.ficheTechnique.trim() || undefined,
          ficheTechniquePdfCle: clePdf, images: images.map((photo, index) => ({ imageId: photo.id, texteAlternatif: `${values.nom.trim()}, photo ${index + 1}` })),
        } })
      }
      setMessage('Produit et médias envoyés à la modération KatiMarket.'); await onCree()
    } catch (cause) { setMessage(messageErreur(cause)) } finally { setPending(false) }
  }

  return <form className={styles.create} onSubmit={submit}>
    <div className={styles.createTop}><div><button type="button" className={styles.back} onClick={onAnnuler}>← Retour au catalogue</button><h3>Ajouter un produit</h3><p>Les informations saisies apparaissent immédiatement dans l’aperçu client.</p></div><button className={styles.primary} disabled={!canPublish || pending}>{pending ? 'Envoi en cours…' : 'Soumettre à la validation'}</button></div>
    <div className={styles.createGrid}>
      <div className={styles.formColumn}>
        <section className={styles.aiPanel} aria-labelledby="assistant-produit-titre">
          <div className={styles.aiHeading}>
            <span className={styles.aiMark} aria-hidden>✦</span>
            <div><p className={styles.aiEyebrow}>COPILOTE KATIMARKET</p><h4 id="assistant-produit-titre">Générer une fiche produit fiable</h4><p>Donnez la référence exacte et les faits connus. L’IA complète le titre, la catégorie, les descriptions, la fiche technique et le référencement.</p></div>
          </div>
          <label className={styles.aiContext}>Informations source à respecter
            <textarea rows={4} maxLength={6000} value={contexteIa} onChange={(event) => setContexteIa(event.target.value)} placeholder={'Ex. HP 16-an0008tx, Core Ultra 7, RAM 16 Go, SSD 1 To, écran 16 pouces. Copiez ici les caractéristiques du fournisseur ou de l’emballage.'} />
            <small>{contexteIa.length}/6000 · N’ajoutez que des informations que vous pouvez vérifier.</small>
          </label>
          <div className={styles.aiActions}>
            <button type="button" className={styles.aiGenerate} disabled={generationIa} aria-busy={generationIa || undefined} onClick={() => void genererFiche()}>{generationIa ? 'Génération de la fiche…' : '✦ Générer toute la fiche'}</button>
            {avantIa ? <button type="button" className={styles.aiUndo} onClick={annulerApplicationIa}>Annuler l’application</button> : null}
            <span>La fiche n’est jamais publiée automatiquement.</span>
          </div>
          {messageIa ? <p className={styles.aiStatus} role="status">{messageIa}</p> : null}
          {suggestionIa ? <div className={styles.aiReview} data-testid="assistant-produit-resultat"><div><strong>8 champs proposés et appliqués</strong><small>Photos, PDF, prix et stock restent sous votre contrôle.</small></div>{suggestionIa.pointsAValider.length ? <div className={styles.aiWarnings}><strong>À vérifier avant validation</strong><ul>{suggestionIa.pointsAValider.map((point) => <li key={point}>{point}</li>)}</ul></div> : <p className={styles.aiClean}>Aucun fait manquant signalé. Une relecture humaine reste requise.</p>}</div> : null}
        </section>
        <fieldset><legend><span>1</span>Informations produit</legend><div className={styles.fieldGrid}><label className={styles.full}>Nom du produit <em>{values.nom.length}/150</em><input required minLength={2} maxLength={150} value={values.nom} onChange={(e) => setValues({ ...values, nom: e.target.value })} placeholder="Ex. Ordinateur portable HP Omen 16" /></label><label>Marque<input value={values.marque} onChange={(e) => setValues({ ...values, marque: e.target.value })} placeholder="Ex. HP" /></label><label>Catégorie<select required value={values.categorie} onChange={(e) => setValues({ ...values, categorie: e.target.value, sousCategorie: '' })}><option value="">Sélectionner…</option>{categories?.map((categorie) => <option key={categorie.id} value={categorie.id}>{categorie.nom}</option>)}</select></label>{racine?.sousCategories.length ? <label className={styles.full}>Sous-catégorie<select required value={values.sousCategorie} onChange={(e) => setValues({ ...values, sousCategorie: e.target.value })}><option value="">Sélectionner…</option>{racine.sousCategories.map((sous) => <option key={sous.id} value={sous.id}>{sous.nom}</option>)}</select></label> : null}</div>{garantie ? <p className={styles.categoryRule} data-testid="garantie-categorie">Garantie minimale de cette catégorie : <strong>{garantie.mois ? garantie.libelle : 'aucune'}</strong>.</p> : null}{erreurCategories ? <p className={styles.errorText}>{erreurCategories}</p> : null}</fieldset>
        <fieldset><legend><span>2</span>Médias</legend><p className={styles.help}>La première image devient le visuel principal · JPEG, PNG ou WebP · 5 Mio maximum.</p><label className={styles.dropzone}>＋ Ajouter des photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => choisirPhotos(e.currentTarget.files)} /></label>{photos.length ? <div className={styles.thumbnails}>{photos.map((photo, index) => <figure key={photo.url}><img src={photo.url} alt=""/><button type="button" onClick={() => retirerPhoto(index)} aria-label={`Retirer la photo ${index + 1}`}>×</button><figcaption>{index === 0 ? 'Principale' : index + 1}</figcaption></figure>)}</div> : null}</fieldset>
        <fieldset><legend><span>3</span>Contenu</legend><label>Description courte <em>{values.descriptionCourte.length}/300</em><textarea minLength={10} maxLength={300} rows={3} value={values.descriptionCourte} onChange={(e) => setValues({ ...values, descriptionCourte: e.target.value })} placeholder="La promesse essentielle du produit en trois lignes." /></label><label>Description détaillée<textarea rows={5} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} placeholder="Usage, bénéfices et éléments de différenciation…" /></label><label>Fiche technique<textarea rows={6} maxLength={20000} value={values.ficheTechnique} onChange={(e) => setValues({ ...values, ficheTechnique: e.target.value })} placeholder={'Écran : 16 pouces\nMémoire : 16 Go\nStockage : SSD 1 To'} /></label><label>Fiche technique PDF<input type="file" accept="application/pdf" onChange={(e) => setPdf(e.currentTarget.files?.[0] ?? null)} /></label></fieldset>
        <fieldset><legend><span>4</span>Référencement</legend><label>Meta title <em>{values.metaTitre.length}/70</em><input maxLength={70} value={values.metaTitre} onChange={(e) => setValues({ ...values, metaTitre: e.target.value })} placeholder={values.nom || 'Titre visible sur Google'} /></label><label>Meta description <em>{values.metaDescription.length}/170</em><textarea rows={3} maxLength={170} value={values.metaDescription} onChange={(e) => setValues({ ...values, metaDescription: e.target.value })} /></label></fieldset>
        {message ? <p role="status" className={styles.feedback}>{message}</p> : null}
      </div>
      <aside className={`${styles.preview} ${mobile ? styles.previewMobile : ''}`}>
        <header><div><strong>Aperçu client en direct</strong><small><i /> Non publié · mise à jour instantanée</small></div><div className={styles.device}><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Ordinateur</button><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobile</button></div></header>
        <div className={styles.storePreview}>
          <div className={styles.previewImage}>{image ? <img src={image} alt="Aperçu principal du produit" /> : <span>Ajoutez une photo<br/><small>pour visualiser le produit</small></span>}</div>
          <div className={styles.previewCopy}><small className={styles.shopName}>▣ {nomBoutique}</small><h4>{values.nom || 'Nom de votre produit'}</h4><p className={styles.previewBrand}>{values.marque || 'Marque'} · {libelleCategorie}</p><div className={styles.pricePlaceholder}>Prix ajouté après validation</div><p>{values.descriptionCourte || 'Votre description courte apparaîtra ici pour aider le client à comprendre le produit en quelques secondes.'}</p><button type="button" disabled>Ajouter au panier</button></div>
          {lignes.length ? <dl className={styles.specs}>{lignes.map((ligne) => { const [nom, ...reste] = ligne.split(':'); return <div key={ligne}><dt>{nom}</dt><dd>{reste.join(':').trim() || '—'}</dd></div> })}</dl> : null}
        </div>
        <div className={styles.previewNote}><strong>Ce qui sera contrôlé</strong><p>Catégorie, contenu, photos et référencement sont vérifiés par KatiMarket avant publication. Le prix et le stock seront ajoutés ensuite dans l’offre.</p></div>
      </aside>
    </div>
  </form>
}

function ModificationLot({ boutiqueId, offres, onRetour, onRefresh }: { boutiqueId: string; offres: Offre[]; onRetour: () => void; onRefresh: () => Promise<void> }) {
  const [taille, setTaille] = useState<10 | 20>(10)
  const [page, setPage] = useState(1)
  const [recherche, setRecherche] = useState('')
  const [brouillons, setBrouillons] = useState<Record<string, BrouillonLot>>({})
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const filtrees = offres.filter((offre) => `${offre.produit.nom} ${offre.referenceVendeur} ${offre.libelleVariante ?? ''}`.toLowerCase().includes(recherche.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtrees.length / taille))
  const visibles = filtrees.slice((page - 1) * taille, page * taille)
  const modifiees = offres.filter((offre) => brouillons[offre.id] && !identique(brouillons[offre.id]!, valeursOffre(offre)))
  const nombreChangements = modifiees.reduce((total, offre) => {
    const avant = valeursOffre(offre); const apres = brouillons[offre.id]!
    return total + (Object.keys(avant) as Array<keyof BrouillonLot>).filter((champ) => avant[champ] !== apres[champ]).length
  }, 0)

  function changer(offre: Offre, champ: keyof BrouillonLot, valeur: string) {
    setBrouillons((actuels) => ({ ...actuels, [offre.id]: { ...(actuels[offre.id] ?? valeursOffre(offre)), [champ]: valeur } }))
  }

  function erreurLigne(offre: Offre) {
    const valeur = brouillons[offre.id] ?? valeursOffre(offre)
    const prix = Number(valeur.prix); const reference = valeur.prixReference ? Number(valeur.prixReference) : 0
    if (!Number.isInteger(prix) || prix < 1) return 'Prix invalide'
    if (reference && reference <= prix) return 'Le prix barré doit être supérieur'
    if (Number(valeur.stock) < (offre.stock?.quantiteReservee ?? 0)) return `Stock inférieur aux ${offre.stock?.quantiteReservee ?? 0} réservées`
    if (Number(valeur.minimum) < 1) return 'Minimum invalide'
    if (Number(valeur.delai) < 0 || Number(valeur.delai) > 3) return 'Le délai doit être de 3 jours maximum'
    return ''
  }

  async function enregistrer() {
    setMessage('')
    const invalide = modifiees.find(erreurLigne)
    if (invalide) return setMessage(`${invalide.produit.nom} : ${erreurLigne(invalide)}.`)
    setPending(true)
    const echecs: string[] = []
    await Promise.all(modifiees.map(async (offre) => {
      const avant = valeursOffre(offre); const apres = brouillons[offre.id]!
      try {
        if (avant.stock !== apres.stock) await api(`/marketplace/boutiques/${boutiqueId}/offres/${offre.id}/stock`, { methode: 'POST', corps: { quantite: Number(apres.stock), motif: 'Modification en lot depuis l’espace vendeur' } })
        const moderation = avant.prix !== apres.prix || avant.prixReference !== apres.prixReference || avant.minimum !== apres.minimum || avant.delai !== apres.delai
        if (moderation) {
          const base = offre.revisions[0]
          if (!base) throw new Error('Aucune version de référence disponible')
          if (REVISIONS_OUVERTES.includes(base.statut)) throw new Error('une modification est déjà en validation')
          await api(`/marketplace/boutiques/${boutiqueId}/offres/${offre.id}/revisions`, { methode: 'POST', corps: {
            titre: base.titre, description: base.description ?? undefined, prixFcfa: Number(apres.prix), prixReferenceFcfa: apres.prixReference ? Number(apres.prixReference) : undefined,
            etat: base.etat, garantieMois: base.garantieMois, modesLivraison: base.modesLivraison, villesLivraison: base.villesLivraison,
            delaiMaxJours: Number(apres.delai), quantiteMinimale: Number(apres.minimum), libelleVariante: base.libelleVariante ?? offre.libelleVariante ?? undefined,
            attributsVariante: base.attributsVariante ?? offre.attributsVariante ?? undefined,
          } })
        }
      } catch (cause) { echecs.push(`${offre.produit.nom} (${messageErreur(cause)})`) }
    }))
    await onRefresh()
    setBrouillons({}); setPending(false)
    setMessage(echecs.length ? `${modifiees.length - echecs.length} offre(s) enregistrée(s). Échecs : ${echecs.join(', ')}.` : `${modifiees.length} offre(s) traitée(s). Les prix et délais modifiés sont maintenant en validation.`)
  }

  return <div className={styles.bulk}>
    <div className={styles.bulkToolbar}><button type="button" className={styles.back} onClick={onRetour}>← Revenir à la liste</button><label className={styles.search}><span>⌕</span><input aria-label="Rechercher dans les offres" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1) }} placeholder="Produit, référence, variante…" /></label><div className={styles.pageSize}><span>Lignes :</span><button type="button" aria-pressed={taille === 10} onClick={() => { setTaille(10); setPage(1) }}>10</button><button type="button" aria-pressed={taille === 20} onClick={() => { setTaille(20); setPage(1) }}>20</button></div></div>
    <div className={styles.bulkInfo}><div><strong>Modification en lot</strong><p>Le stock est appliqué immédiatement. Prix, minimum et délai restent en validation jusqu’à la décision KatiMarket.</p></div><span>{filtrees.length} offre(s)</span></div>
    <div className={styles.bulkScroll}><table className={styles.bulkTable}><thead><tr><th>Produit / offre</th><th>Prix FCFA</th><th>Prix de référence</th><th>Stock</th><th>Minimum</th><th>Délai (3 j max.)</th><th>État</th></tr></thead><tbody>{visibles.map((offre) => {
      const valeur = brouillons[offre.id] ?? valeursOffre(offre); const modifiee = !identique(valeur, valeursOffre(offre)); const erreur = erreurLigne(offre)
      return <tr key={offre.id} data-modified={modifiee || undefined} data-error={Boolean(erreur) || undefined}><td><strong>{offre.produit.nom}</strong><small>{offre.referenceVendeur}{offre.libelleVariante ? ` · ${offre.libelleVariante}` : ''}</small></td><td><input aria-label={`Prix de ${offre.produit.nom}`} inputMode="numeric" value={valeur.prix} onChange={(e) => changer(offre, 'prix', e.target.value)} /></td><td><input aria-label={`Prix de référence de ${offre.produit.nom}`} inputMode="numeric" value={valeur.prixReference} onChange={(e) => changer(offre, 'prixReference', e.target.value)} /></td><td><input aria-label={`Stock de ${offre.produit.nom}`} inputMode="numeric" value={valeur.stock} onChange={(e) => changer(offre, 'stock', e.target.value)} /></td><td><input aria-label={`Minimum de ${offre.produit.nom}`} inputMode="numeric" value={valeur.minimum} onChange={(e) => changer(offre, 'minimum', e.target.value)} /></td><td><input aria-label={`Délai de ${offre.produit.nom}`} type="number" min="0" max="3" inputMode="numeric" value={valeur.delai} onChange={(e) => changer(offre, 'delai', e.target.value)} /></td><td>{erreur ? <span className={styles.rowError} title={erreur}>À corriger</span> : REVISIONS_OUVERTES.includes(offre.revisions[0]?.statut ?? '') ? <span className={styles.pending}>En validation</span> : <span className={styles.ready}>{modifiee ? 'Modifié' : 'Prêt'}</span>}</td></tr>
    })}</tbody></table></div>
    <div className={styles.pagination}><span>Page {page} sur {totalPages}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button><button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button></div></div>
    {message ? <p className={styles.feedback} role="status">{message}</p> : null}
    <div className={styles.saveBar}><div><strong>{nombreChangements} modification(s) non enregistrée(s)</strong><small>Vous pouvez naviguer entre les pages sans perdre vos changements.</small></div><button type="button" className={styles.secondary} disabled={!modifiees.length || pending} onClick={() => setBrouillons({})}>Annuler les changements</button><button type="button" className={styles.primary} disabled={!modifiees.length || pending} onClick={() => void enregistrer()}>{pending ? 'Enregistrement…' : `Enregistrer ${nombreChangements} modification(s)`}</button></div>
  </div>
}
