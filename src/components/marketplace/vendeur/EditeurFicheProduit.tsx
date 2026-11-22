'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'

import { api } from '@/lib/api'
import { avertissementPhoto, CONSEIL_PHOTOS, MESSAGE_PHOTO_OBLIGATOIRE } from '@/lib/publication-produit'
import { erreurActionnable } from '@/lib/erreur-actionnable'

/**
 * LA FICHE PRODUIT VUE PAR LE MARCHAND QUI L'A PROPOSEE : PHOTOS, TEXTES ET REFERENCEMENT.
 *
 * Rien n'est publie d'ici. Les photos deposees attendent ; le marchand compose
 * la galerie (ordre, texte alternatif), ecrit la description courte, la fiche
 * technique (texte et/ou PDF), le meta title et la meta description, et soumet
 * le tout. KatiMarket valide, puis la fiche publique change. Tant qu'une
 * proposition est en cours, elle est affichee et l'edition attend.
 */

export type ImageFiche = { id: string; url: string; texteAlternatif: string | null; ordre: number; statut: 'proposee' | 'publiee'; tailleOctets: number; variantes?: Array<{ offreId: string; ordre: number }> }
type Revision = { id: string; numero: number; statut: string; motifDecision: string | null; soumisLe: string; decideLe: string | null }
export type ContenuFiche = {
  produit: {
    id: string; nom: string; slug: string; metaTitre: string | null; metaDescription: string | null
    marque?: string | null; description?: string | null
    descriptionCourte?: string | null; ficheTechnique?: string | null; ficheTechniquePdfUrl?: string | null; ficheTechniquePdfCle?: string | null
  }
  images: ImageFiche[]
  offres: Array<{ id: string; libelleVariante: string | null; attributsVariante: Record<string, string> | null; ordreVariante: number }>
  revisionOuverte: Revision | null
  revisions: Revision[]
}
type Element = { imageId: string; texteAlternatif: string; offreIds: string[]; principalePourOffreIds: string[] }

function completerImagesPrincipales(elements: Element[]): Element[] {
  const offres = [...new Set(elements.flatMap((element) => element.offreIds))]
  return offres.reduce((resultat, offreId) => {
    if (resultat.some((element) => element.principalePourOffreIds.includes(offreId))) return resultat
    const premiere = resultat.findIndex((element) => element.offreIds.includes(offreId))
    return premiere < 0 ? resultat : resultat.map((element, index) => index === premiere
      ? { ...element, principalePourOffreIds: [...element.principalePourOffreIds, offreId] }
      : element)
  }, elements)
}

export const META_TITRE = { min: 10, max: 70 }
export const META_DESCRIPTION = { min: 50, max: 170 }
export const DESCRIPTION_COURTE = { min: 10, max: 300 }
const PDF_MAX = 25 * 1024 * 1024
const IMAGES_MAX = 12
const STATUTS: Record<string, string> = { soumise: 'en attente de validation', en_verification: 'en cours de vérification', approuvee: 'approuvée', refusee: 'refusée', modification_demandee: 'à corriger' }

function erreur(cause: unknown) {
  return erreurActionnable(cause)
}

/** Le premier etat de galerie propose : les photos publiees dans leur ordre. */
export function galerieInitiale(images: ImageFiche[]): Element[] {
  return images
    .filter((image) => image.statut === 'publiee')
    .sort((a, b) => a.ordre - b.ordre)
    .map((image) => ({
      imageId: image.id,
      texteAlternatif: image.texteAlternatif ?? '',
      offreIds: (image.variantes ?? []).map((association) => association.offreId),
      principalePourOffreIds: (image.variantes ?? []).filter((association) => association.ordre === 0).map((association) => association.offreId),
    }))
}

/**
 * `vente` : la partie publiee tout de suite (categories, prix, variantes, vente),
 * placee entre le general et les photos (fiche complete, 6 novembre 2026).
 */
/** Les photos trop petites ou trop allongees, mesurees dans le navigateur : un avertissement, jamais un blocage. */
function mesurerPhotos(fichiers: File[]): Promise<{ avertissements: string[]; illisibles: string[] }> {
  return Promise.all(fichiers.map((fichier) => new Promise<{ avertissement?: string; illisible?: string }>((resoudre) => {
    const url = URL.createObjectURL(fichier)
    const image = new window.Image()
    image.onload = () => { URL.revokeObjectURL(url); const texte = avertissementPhoto(image.naturalWidth, image.naturalHeight); resoudre(texte ? { avertissement: `${fichier.name} : ${texte}` } : {}) }
    image.onerror = () => { URL.revokeObjectURL(url); resoudre({ illisible: fichier.name }) }
    image.src = url
  }))).then((resultats) => ({
    avertissements: resultats.flatMap((resultat) => resultat.avertissement ? [resultat.avertissement] : []),
    illisibles: resultats.flatMap((resultat) => resultat.illisible ? [resultat.illisible] : []),
  }))
}

export function EditeurFicheProduit({ boutiqueId, produitId, onFermer, vente, direct = true }: { boutiqueId: string; produitId: string; onFermer: () => void; vente?: ReactNode; direct?: boolean }) {
  const [avertissements, setAvertissements] = useState<string[]>([])
  const [contenu, setContenu] = useState<ContenuFiche | null>(null)
  const [nom, setNom] = useState('')
  const [marque, setMarque] = useState('')
  const [description, setDescription] = useState('')
  const [galerie, setGalerie] = useState<Element[]>([])
  const [metaTitre, setMetaTitre] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [descriptionCourte, setDescriptionCourte] = useState('')
  const [ficheTechnique, setFicheTechnique] = useState('')
  const [pdf, setPdf] = useState<{ cle: string; url: string } | null>(null)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [imagesEnErreur, setImagesEnErreur] = useState<Set<string>>(() => new Set())
  const fichiers = useRef<HTMLInputElement>(null)
  // Tolere une reponse mise en cache par une ancienne version de l'API pendant le deploiement.
  const offres = contenu?.offres ?? []

  const charger = useCallback(async (signal?: AbortSignal) => {
    try {
      const prochain = await api<ContenuFiche>(`/marketplace/boutiques/${boutiqueId}/produits/${produitId}/contenu`, { signal })
      setContenu(prochain)
      setNom(prochain.produit.nom)
      setMarque(prochain.produit.marque ?? '')
      setDescription(prochain.produit.description ?? '')
      setGalerie(galerieInitiale(prochain.images))
      setMetaTitre(prochain.produit.metaTitre ?? '')
      setMetaDescription(prochain.produit.metaDescription ?? '')
      setDescriptionCourte(prochain.produit.descriptionCourte ?? '')
      setFicheTechnique(prochain.produit.ficheTechnique ?? '')
      setPdf(prochain.produit.ficheTechniquePdfCle && prochain.produit.ficheTechniquePdfUrl ? { cle: prochain.produit.ficheTechniquePdfCle, url: prochain.produit.ficheTechniquePdfUrl } : null)
    } catch (cause) {
      if (!signal?.aborted) setMessage({ type: 'erreur', texte: erreur(cause) })
    } finally {
      if (!signal?.aborted) setChargement(false)
    }
  }, [boutiqueId, produitId])

  useEffect(() => {
    const controleur = new AbortController()
    const minuterie = window.setTimeout(() => void charger(controleur.signal), 0)
    const fermerSurEchap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', fermerSurEchap)
    return () => {
      window.clearTimeout(minuterie)
      window.removeEventListener('keydown', fermerSurEchap)
      controleur.abort()
    }
  }, [charger, onFermer])

  async function deposer(liste: FileList | null) {
    if (!liste?.length || !contenu) return
    setEnvoi(true); setMessage(null)
    const selection = Array.from(liste).slice(0, IMAGES_MAX)
    const ajoutees: ImageFiche[] = []
    try {
      for (const fichier of selection) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type)) throw new Error(`${fichier.name} : seules les photos JPEG, PNG ou WebP sont acceptées.`)
        if (fichier.size > 5 * 1024 * 1024) throw new Error(`${fichier.name} dépasse 5 Mio.`)
        if (fichier.size === 0) throw new Error(`${fichier.name} est vide. Choisissez une autre photo.`)
      }
      const mesures = await mesurerPhotos(selection)
      setAvertissements(mesures.avertissements)
      if (mesures.illisibles.length) throw new Error(`${mesures.illisibles.map((nom) => `« ${nom} »`).join(', ')} : image illisible ou endommagée. Retirez-la de la sélection et choisissez un autre fichier.`)
      for (const [index, fichier] of selection.entries()) {
        const corps = new FormData()
        corps.append('fichier', fichier)
        try {
          ajoutees.push(await api<ImageFiche>(`/marketplace/boutiques/${boutiqueId}/produits/${produitId}/images`, { methode: 'POST', corps }))
        } catch (cause) {
          const conservees = ajoutees.length ? `${ajoutees.length} photo(s) précédente(s) sont déjà conservée(s). ` : ''
          throw new Error(`La photo « ${fichier.name} » (${index + 1} sur ${selection.length}) n’a pas été envoyée. ${erreurActionnable(cause)} ${conservees}Corrigez le fichier ou votre connexion, puis réessayez.`)
        }
      }
    } catch (cause) {
      setMessage({ type: 'erreur', texte: erreur(cause) })
    } finally {
      if (ajoutees.length) {
        setContenu({ ...contenu, images: [...contenu.images.filter((i) => !ajoutees.some((a) => a.id === i.id)), ...ajoutees] })
        setGalerie((actuelle) => [...actuelle, ...ajoutees.filter((a) => !actuelle.some((e) => e.imageId === a.id)).map((a) => ({ imageId: a.id, texteAlternatif: '', offreIds: [], principalePourOffreIds: [] }))].slice(0, IMAGES_MAX))
        setMessage((m) => m ?? { type: 'succes', texte: `${ajoutees.length} photo(s) ajoutée(s) à la galerie. ${direct ? 'Enregistrez la fiche pour les mettre en ligne.' : 'Soumettez la fiche pour les publier.'}` })
      }
      setEnvoi(false)
      if (fichiers.current) fichiers.current.value = ''
    }
  }

  /** Le PDF est controle (vrai PDF, antivirus) au depot ; il n'est publie qu'avec la fiche validee. */
  async function deposerPdf(fichier: File | undefined) {
    if (!fichier) return
    setMessage(null)
    if (fichier.type !== 'application/pdf') return setMessage({ type: 'erreur', texte: `« ${fichier.name} » n’est pas un PDF. Choisissez un fichier dont le nom se termine par .pdf.` })
    if (fichier.size === 0) return setMessage({ type: 'erreur', texte: `« ${fichier.name} » est vide. Choisissez un PDF contenant la fiche technique.` })
    if (fichier.size > PDF_MAX) return setMessage({ type: 'erreur', texte: `« ${fichier.name} » dépasse 25 Mo. Compressez-le, puis sélectionnez-le de nouveau.` })
    setEnvoi(true)
    try {
      const corps = new FormData()
      corps.append('fichier', fichier)
      const depot = await api<{ cle: string; url: string; appliquee: boolean }>(`/marketplace/boutiques/${boutiqueId}/produits/${produitId}/fiche-technique`, { methode: 'POST', corps })
      setPdf({ cle: depot.cle, url: depot.url })
      setMessage({ type: 'succes', texte: depot.appliquee ? 'PDF ajouté à votre proposition de produit.' : direct ? 'PDF déposé. Enregistrez la fiche pour le mettre en ligne.' : 'PDF déposé. Soumettez la fiche pour le publier.' })
    } catch (cause) {
      setMessage({ type: 'erreur', texte: `Le PDF « ${fichier.name} » n’a pas été envoyé. ${erreurActionnable(cause, 'Corrigez le fichier ou votre connexion, puis réessayez.')}` })
    } finally {
      setEnvoi(false)
    }
  }

  function deplacer(index: number, sens: -1 | 1) {
    setGalerie((actuelle) => {
      const cible = index + sens
      if (cible < 0 || cible >= actuelle.length) return actuelle
      const suivante = [...actuelle]
      ;[suivante[index], suivante[cible]] = [suivante[cible]!, suivante[index]!]
      return suivante
    })
  }

  function basculerVariante(imageId: string, offreId: string) {
    setGalerie((actuelle) => {
      const dejaAssociee = actuelle.find((element) => element.imageId === imageId)?.offreIds.includes(offreId) ?? false
      const aDejaPrincipale = actuelle.some((element) => element.principalePourOffreIds.includes(offreId))
      return completerImagesPrincipales(actuelle.map((element) => element.imageId !== imageId ? element : dejaAssociee
        ? { ...element, offreIds: element.offreIds.filter((id) => id !== offreId), principalePourOffreIds: element.principalePourOffreIds.filter((id) => id !== offreId) }
        : { ...element, offreIds: [...element.offreIds, offreId], principalePourOffreIds: aDejaPrincipale ? element.principalePourOffreIds : [...element.principalePourOffreIds, offreId] }))
    })
  }

  function definirPrincipale(imageId: string, offreId: string) {
    setGalerie((actuelle) => actuelle.map((element) => ({
      ...element,
      principalePourOffreIds: element.imageId === imageId
        ? [...element.principalePourOffreIds.filter((id) => id !== offreId), offreId]
        : element.principalePourOffreIds.filter((id) => id !== offreId),
    })))
  }

  async function soumettre() {
    // La fiche garde au moins une photo (9 novembre 2026).
    if (!galerie.length) return setMessage({ type: 'erreur', texte: MESSAGE_PHOTO_OBLIGATOIRE })
    const galerieComplete = completerImagesPrincipales(galerie)
    setEnvoi(true); setMessage(null)
    try {
      const revision = await api<{ statut?: string }>(`/marketplace/boutiques/${boutiqueId}/produits/${produitId}/contenu/revisions`, {
        methode: 'POST',
        corps: {
          // Le nom, la marque et la description ne partent que s'ils ont change.
          ...(nom.trim() && nom.trim() !== contenu?.produit.nom ? { nom: nom.trim() } : {}),
          ...(marque.trim() && marque.trim() !== (contenu?.produit.marque ?? '') ? { marque: marque.trim() } : {}),
          ...(description.trim() && description.trim() !== (contenu?.produit.description ?? '') ? { description: description.trim() } : {}),
          metaTitre: metaTitre.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          descriptionCourte: descriptionCourte.trim() || undefined,
          ficheTechnique: ficheTechnique.trim() || undefined,
          ficheTechniquePdfCle: pdf?.cle,
          images: galerieComplete.map((e) => ({
            imageId: e.imageId,
            texteAlternatif: e.texteAlternatif.trim() || undefined,
            offreIds: e.offreIds,
            principalePourOffreIds: e.principalePourOffreIds,
          })),
        },
      })
      setMessage({ type: 'succes', texte: revision?.statut === 'approuvee' ? 'Fiche enregistrée : elle est en ligne.' : 'Fiche envoyée à KatiMarket. Elle sera publiée après validation.' })
      await charger()
    } catch (cause) {
      setMessage({ type: 'erreur', texte: erreur(cause) })
    } finally {
      setEnvoi(false)
    }
  }

  if (chargement) return <section className="grid gap-4 p-6" aria-labelledby="fiche-chargement-titre">
    <button type="button" onClick={onFermer} className="min-h-11 justify-self-start rounded-control border border-rule px-4 text-small font-semibold">← Retour aux produits</button>
    <p id="fiche-chargement-titre" role="status" className="text-small">Chargement de la fiche…</p>
  </section>
  if (!contenu) return <div className="p-6"><p role="alert" className="text-small text-warn">{message?.texte ?? 'Fiche introuvable.'}</p><button type="button" onClick={onFermer} className="mt-4 min-h-11 rounded-control border border-rule px-4 text-small font-semibold">Retour</button></div>

  const parId = new Map(contenu.images.map((i) => [i.id, i]))
  const enAttente = contenu.images.filter((i) => !galerie.some((e) => e.imageId === i.id))
  const verrouille = Boolean(contenu.revisionOuverte) || envoi
  const titreValide = !metaTitre.trim() || (metaTitre.trim().length >= META_TITRE.min && metaTitre.trim().length <= META_TITRE.max)
  const descriptionValide = !metaDescription.trim() || (metaDescription.trim().length >= META_DESCRIPTION.min && metaDescription.trim().length <= META_DESCRIPTION.max)
  const altValides = galerie.every((e) => !e.texteAlternatif.trim() || e.texteAlternatif.trim().length >= 3)
  const courteValide = !descriptionCourte.trim() || (descriptionCourte.trim().length >= DESCRIPTION_COURTE.min && descriptionCourte.trim().length <= DESCRIPTION_COURTE.max)
  const derniere = contenu.revisions[0]
  const offresSansImage = offres.filter((offre) => !galerie.some((element) => element.offreIds.includes(offre.id)))

  return (
    <section className="grid grid-cols-1 gap-6" aria-labelledby="fiche-titre">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="t-label text-ink-3">Modifier le produit</p>
          <h2 id="fiche-titre" className="text-h3 font-semibold">{contenu.produit.nom}</h2>
          <p className="text-micro text-ink-3">{direct ? 'Chaque modification est en ligne dès son enregistrement. KatiMarket la contrôle ensuite et peut vous demander une correction.' : 'Les catégories, prix, variantes et le délai sont publiés tout de suite. Le nom, les textes, les photos, l’état et la garantie sont publiés après validation par KatiMarket.'}</p>
        </div>
        <button type="button" onClick={onFermer} className="min-h-11 rounded-control border border-rule px-4 text-small font-semibold">← Retour aux produits</button>
      </header>

      {contenu.revisionOuverte ? (
        <p role="status" className="rounded-well border border-primary p-3 text-small">Proposition n°{contenu.revisionOuverte.numero} {STATUTS[contenu.revisionOuverte.statut] ?? contenu.revisionOuverte.statut}. Vous pourrez modifier la fiche après la décision.</p>
      ) : derniere && derniere.statut !== 'approuvee' && derniere.motifDecision ? (
        <p role="status" className="rounded-well border border-warn p-3 text-small text-warn">Dernière proposition {STATUTS[derniere.statut] ?? derniere.statut} : {derniere.motifDecision}</p>
      ) : null}
      {message ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className={`rounded-well border p-3 text-small ${message.type === 'erreur' ? 'border-warn text-warn' : 'border-primary text-primary'}`}>{message.texte}</p> : null}

      <section aria-labelledby="general-titre" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="general-titre" className="text-h4 font-semibold">Général</h3><span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-micro font-bold text-[#9a4b00]">Validé par KatiMarket</span></div>
        <label className="block text-small font-semibold">Nom du produit
          <input value={nom} minLength={2} maxLength={240} disabled={verrouille} onChange={(event) => setNom(event.currentTarget.value)} data-testid="fiche-nom" className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal" />
        </label>
        <label className="block text-small font-semibold">Marque
          <input value={marque} maxLength={120} disabled={verrouille} onChange={(event) => setMarque(event.currentTarget.value)} placeholder="Ex. Samsung" data-testid="fiche-marque" className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal" />
        </label>
        <label className="block text-small font-semibold">Description
          <textarea value={description} rows={6} maxLength={10000} disabled={verrouille} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="Usage, bénéfices et éléments de différenciation…" data-testid="fiche-description" className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal" />
        </label>
      </section>

      {vente}

      <section aria-labelledby="galerie-titre" className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 id="galerie-titre" className="text-h4 font-semibold">Galerie</h3><p className="text-micro text-ink-3">La première photo est l’image principale. {galerie.length}/{IMAGES_MAX}</p><p className="text-micro text-ink-3" data-testid="conseil-photos">{CONSEIL_PHOTOS}</p>{avertissements.map((texte) => <p key={texte} role="status" className="text-micro text-[#b45309]">{texte}</p>)}</div>
          <label className={`inline-flex min-h-11 items-center rounded-control bg-secondary px-4 text-small font-bold text-on-surface ${verrouille ? 'opacity-50' : 'cursor-pointer'}`}>
            Ajouter des photos
            <input ref={fichiers} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={verrouille} onChange={(event) => void deposer(event.currentTarget.files)} />
          </label>
        </div>
        {offresSansImage.length ? <p role="status" className="rounded-well border-l-4 border-secondary bg-space p-3 text-micro">{offresSansImage.length} variante(s) n’ont pas d’image spécifique : {offresSansImage.map((offre) => offre.libelleVariante ?? 'Standard').join(', ')}. Elles utiliseront l’image principale commune. Cochez une variante sous une photo pour lui attribuer son propre visuel.</p> : null}
        {galerie.length ? (
          <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Photos publiées, dans l’ordre">
            {galerie.map((element, index) => {
              const image = parId.get(element.imageId)
              if (!image) return null
              return (
                <li key={element.imageId} className="grid gap-2 rounded-well border border-rule p-3" data-testid={`fiche-photo-${element.imageId}`}>
                  {imagesEnErreur.has(image.id) ? <p role="alert" className="grid aspect-square place-items-center rounded-control border border-warn bg-space p-3 text-center text-micro text-warn">Cette image ne peut pas être affichée. Retirez-la de la galerie, puis importez de nouveau le fichier.</p> : <Image src={image.url} alt={element.texteAlternatif || `Photo ${index + 1} de ${contenu.produit.nom}`} width={320} height={320} sizes="(max-width: 640px) 160px, 220px" className="mx-auto aspect-square w-full max-w-[220px] rounded-control bg-space object-contain" onError={() => setImagesEnErreur((actuelles) => new Set(actuelles).add(image.id))} />}
                  <p className="text-micro text-ink-3">{index === 0 ? 'Image principale' : `Position ${index + 1}`}{image.statut === 'proposee' ? ' · nouvelle' : ''}</p>
                  <label className="text-micro font-semibold">Texte alternatif
                    <input value={element.texteAlternatif} maxLength={200} disabled={verrouille} placeholder="Ex. Vue de face, coloris noir"
                      onChange={(event) => { const valeur = event.currentTarget.value; setGalerie((a) => a.map((e) => e.imageId === element.imageId ? { ...e, texteAlternatif: valeur } : e)) }}
                      className="mt-1 w-full rounded-control border border-rule bg-surface p-2 text-small font-normal" />
                  </label>
                  {offres.length > 1 || offres.some((offre) => offre.libelleVariante) ? <fieldset className="grid gap-1 border-t border-rule pt-2">
                    <legend className="text-micro font-semibold">Variantes illustrées</legend>
                    {offres.map((offre) => {
                      const associee = element.offreIds.includes(offre.id)
                      const principale = element.principalePourOffreIds.includes(offre.id)
                      return <div key={offre.id} className="grid grid-cols-[1fr_auto] items-center gap-2 text-micro">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={associee} disabled={verrouille} onChange={() => basculerVariante(element.imageId, offre.id)} />{offre.libelleVariante ?? 'Standard'}</label>
                        {associee ? <button type="button" disabled={verrouille || principale} onClick={() => definirPrincipale(element.imageId, offre.id)} className="rounded-full border border-rule px-2 py-1 font-semibold disabled:border-secondary disabled:text-secondary">{principale ? 'Principale' : 'Choisir'}</button> : null}
                      </div>
                    })}
                  </fieldset> : null}
                  <div className="flex gap-2">
                    <button type="button" disabled={verrouille || index === 0} onClick={() => deplacer(index, -1)} aria-label={`Avancer la photo ${index + 1}`} className="min-h-11 min-w-11 rounded-control border border-rule text-small disabled:opacity-40">←</button>
                    <button type="button" disabled={verrouille || index === galerie.length - 1} onClick={() => deplacer(index, 1)} aria-label={`Reculer la photo ${index + 1}`} className="min-h-11 min-w-11 rounded-control border border-rule text-small disabled:opacity-40">→</button>
                    <button type="button" disabled={verrouille || galerie.length <= 1} title={galerie.length <= 1 ? 'Un produit garde au moins une photo : ajoutez-en une autre avant de retirer celle-ci.' : undefined} onClick={() => setGalerie((a) => completerImagesPrincipales(a.filter((e) => e.imageId !== element.imageId)))} className="min-h-11 flex-1 rounded-control border border-rule px-3 text-small font-semibold disabled:opacity-40">Retirer</button>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : <p className="rounded-well border border-dashed border-rule p-6 text-center text-small text-ink-3">Aucune photo dans la galerie. Ajoutez-en au moins une : les fiches illustrées se vendent mieux.</p>}
        {enAttente.length ? (
          <div className="grid gap-2">
            <p className="text-micro text-ink-3">Photos déposées hors galerie : elles ne seront pas publiées.</p>
            <ul className="flex flex-wrap gap-2">{enAttente.map((image) => (
              <li key={image.id}><button type="button" disabled={verrouille || galerie.length >= IMAGES_MAX} onClick={() => setGalerie((a) => [...a, { imageId: image.id, texteAlternatif: image.texteAlternatif ?? '', offreIds: [], principalePourOffreIds: [] }])} className="flex min-h-11 items-center gap-2 rounded-control border border-rule p-1 pr-3 text-micro font-semibold">
                {imagesEnErreur.has(image.id) ? <span className="grid size-9 place-items-center rounded bg-space text-warn">!</span> : <Image src={image.url} alt="" width={36} height={36} sizes="36px" className="size-9 rounded object-cover" onError={() => setImagesEnErreur((actuelles) => new Set(actuelles).add(image.id))} />}Remettre dans la galerie
              </button></li>
            ))}</ul>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="textes-titre" className="grid gap-4">
        <h3 id="textes-titre" className="text-h4 font-semibold">Description courte et fiche technique</h3>
        <label className="block text-small font-semibold">Description courte
          <textarea value={descriptionCourte} rows={3} maxLength={DESCRIPTION_COURTE.max} disabled={verrouille} onChange={(event) => setDescriptionCourte(event.currentTarget.value)}
            aria-describedby="courte-aide" aria-invalid={!courteValide} placeholder="Ex. Smartphone endurant : batterie 5 000 mAh, 128 Go, double SIM."
            className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal" />
          <span id="courte-aide" className={`mt-1 block text-micro font-normal ${courteValide ? 'text-ink-3' : 'text-warn'}`}>{descriptionCourte.trim().length}/{DESCRIPTION_COURTE.max} caractères · affichée sous le titre de la fiche, trois lignes au plus.</span>
        </label>
        <label className="block text-small font-semibold">Fiche technique
          <textarea value={ficheTechnique} rows={8} maxLength={20000} disabled={verrouille} onChange={(event) => setFicheTechnique(event.currentTarget.value)}
            aria-describedby="fiche-aide" placeholder={'Écran : 6,5 pouces\nBatterie : 5 000 mAh\nMémoire : 128 Go'}
            className="mt-1 w-full rounded-control border border-rule bg-surface p-3 font-mono text-small font-normal" />
          <span id="fiche-aide" className="mt-1 block text-micro font-normal text-ink-3">Une caractéristique par ligne, « Nom : valeur ». Elle remplace l’onglet « Caractéristiques » de la fiche.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {pdf ? <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="text-small font-semibold text-primary underline" data-testid="fiche-pdf">Fiche technique (PDF)</a> : <span className="text-small text-ink-3">Aucun PDF</span>}
          <label className={`inline-flex min-h-11 items-center rounded-control border border-rule px-4 text-small font-semibold ${verrouille ? 'opacity-50' : 'cursor-pointer'}`}>
            {pdf ? 'Remplacer le PDF' : 'Ajouter un PDF'}
            <input type="file" accept="application/pdf" className="sr-only" disabled={verrouille} onChange={(event) => { void deposerPdf(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
          </label>
          {pdf ? <button type="button" disabled={verrouille} onClick={() => setPdf(null)} className="min-h-11 rounded-control border border-rule px-4 text-small font-semibold disabled:opacity-40">Retirer le PDF</button> : null}
        </div>
      </section>

      <section aria-labelledby="seo-titre" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid gap-4">
          <h3 id="seo-titre" className="text-h4 font-semibold">Référencement</h3>
          <label className="block text-small font-semibold">Meta title
            <input value={metaTitre} maxLength={META_TITRE.max} disabled={verrouille} onChange={(event) => setMetaTitre(event.currentTarget.value)}
              aria-describedby="meta-titre-aide" aria-invalid={!titreValide} className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal" />
            <span id="meta-titre-aide" className={`mt-1 block text-micro font-normal ${titreValide ? 'text-ink-3' : 'text-warn'}`}>{metaTitre.trim().length}/{META_TITRE.max} caractères · de {META_TITRE.min} à {META_TITRE.max}. Vide : le nom du produit est utilisé.</span>
          </label>
          <label className="block text-small font-semibold">Meta description
            <textarea value={metaDescription} rows={3} maxLength={META_DESCRIPTION.max} disabled={verrouille} onChange={(event) => setMetaDescription(event.currentTarget.value)}
              aria-describedby="meta-description-aide" aria-invalid={!descriptionValide} className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal" />
            <span id="meta-description-aide" className={`mt-1 block text-micro font-normal ${descriptionValide ? 'text-ink-3' : 'text-warn'}`}>{metaDescription.trim().length}/{META_DESCRIPTION.max} caractères · de {META_DESCRIPTION.min} à {META_DESCRIPTION.max}.</span>
          </label>
        </div>
        <figure className="min-w-0 rounded-well border border-rule p-4" aria-label="Aperçu dans les résultats de recherche">
          <figcaption className="t-label text-ink-3">Aperçu Google</figcaption>
          <p className="mt-3 truncate text-micro text-ink-3">katihub.cm › marketplace › {contenu.produit.slug}</p>
          <p className="mt-1 line-clamp-2 text-[1.1rem] leading-snug text-[#1a0dab]">{metaTitre.trim() || `${contenu.produit.nom} — KatiMarket`}</p>
          <p className="mt-1 line-clamp-3 text-small text-ink-2">{metaDescription.trim() || 'Sans meta description, Google choisit lui-même un extrait de la page.'}</p>
        </figure>
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-rule pt-4">
        <button type="button" onClick={() => void soumettre()} disabled={verrouille || !titreValide || !descriptionValide || !altValides || !courteValide}
          className="min-h-11 rounded-control bg-secondary px-5 text-small font-bold text-on-surface disabled:opacity-50">{envoi ? 'Envoi…' : direct ? 'Enregistrer et mettre en ligne' : 'Soumettre le contenu à validation'}</button>
      </div>
    </section>
  )
}
