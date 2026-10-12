'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { ErreurApi, api, telechargerApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'

type Evenement = { id: string; type: string; versStatut: string | null; motif: string | null; creeLe: string }
type Ligne = { id: string; offreTitreCapture: string; quantite: number; quantiteLivree: number; quantiteRetournee: number; quantiteRemboursee: number; totalNetFcfa: number }
type Expedition = { id: string; reference: string; statut: string; ville: string; montantACollecterFcfa: number; livreeLe: string | null; evenements: Evenement[] }
type SousCommande = { id: string; reference: string; statut: string; boutique: { nom: string; slug: string }; lignes: Ligne[]; expeditions: Expedition[] }
type Commande = { id: string; reference: string; statut: string; totalFermeTtc: number; acompteDu: number; acompteRecu: number; resteAPayer: number; sousCommandes: SousCommande[] }
type Retour = { id: string; statut: string; quantite: number; montantRembourseFcfa: number; referenceRetour: string | null; motifDecision?: string | null; motifArbitrage?: string | null; motifContestation?: string | null }
type Piece = { id: string; nomCapture: string; typeMime: string; tailleOctets: number; empreinteSha256: string }
type Demande = { id: string; reference: string; statut: string; objet: string; modifieLe: string; boutique: { nom: string }; ligne: Ligne | null; messages: Array<{ id: string; auteurType: string; contenu: string; creeLe: string; pieces: Piece[] }>; retour: Retour | null; capacites: { repondre: boolean; expedier: boolean; contester: boolean } }

const CATEGORIES = [
  ['produit_non_conforme', 'Produit non conforme'],
  ['produit_endommage', 'Produit endommagé'],
  ['produit_manquant', 'Produit manquant'],
  ['livraison', 'Problème de livraison'],
  ['remboursement', 'Remboursement'],
  ['autre', 'Autre demande'],
] as const

export function SuiviMarketplace({ reference }: { reference: string }) {
  const [commande, setCommande] = useState<Commande | null>(null)
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [selection, setSelection] = useState<{ sousCommande: SousCommande; ligne: Ligne; expedition?: Expedition } | null>(null)

  const charger = useCallback(async (signal?: AbortSignal) => {
    setErreur('')
    try {
      const prochaine = await api<Commande>(`/marketplace/commandes/${encodeURIComponent(reference)}`, { signal })
      const dossiers = await api<Demande[]>(`/marketplace/demandes-client?commandeId=${encodeURIComponent(prochaine.id)}`, { signal })
      setCommande(prochaine)
      setDemandes(dossiers)
    } catch (cause) {
      if (!signal?.aborted) setErreur(cause instanceof ErreurApi ? cause.message : 'Le suivi est momentanément indisponible.')
    } finally {
      if (!signal?.aborted) setChargement(false)
    }
  }, [reference])

  useEffect(() => {
    const controleur = new AbortController()
    api<Commande>(`/marketplace/commandes/${encodeURIComponent(reference)}`, { signal: controleur.signal })
      .then(async (prochaine) => {
        const dossiers = await api<Demande[]>(
          `/marketplace/demandes-client?commandeId=${encodeURIComponent(prochaine.id)}`,
          { signal: controleur.signal },
        )
        if (!controleur.signal.aborted) {
          setCommande(prochaine)
          setDemandes(dossiers)
          setErreur('')
        }
      })
      .catch((cause: unknown) => {
        if (!controleur.signal.aborted) {
          setErreur(cause instanceof ErreurApi ? cause.message : 'Le suivi est momentanément indisponible.')
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) setChargement(false)
      })
    return () => controleur.abort()
  }, [reference])

  async function ouvrirDemande(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commande || !selection || envoi) return
    const donnees = new FormData(event.currentTarget)
    setEnvoi(true)
    setErreur('')
    try {
      await api('/marketplace/demandes-client', {
        methode: 'POST',
        corps: {
          commandeId: commande.id,
          sousCommandeId: selection.sousCommande.id,
          ligneId: selection.ligne.id,
          ...(selection.expedition ? { expeditionId: selection.expedition.id } : {}),
          categorie: donnees.get('categorie'),
          objet: donnees.get('objet'),
          description: donnees.get('description'),
        },
      })
      setSelection(null)
      await charger()
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'La demande n’a pas pu être créée.')
    } finally {
      setEnvoi(false)
    }
  }

  async function demanderRetour(demandeId: string, ligne: Ligne) {
    const motif = window.prompt('Motif du retour (10 caractères minimum)')?.trim()
    if (!motif) return
    setEnvoi(true)
    setErreur('')
    try {
      await api(`/marketplace/demandes-client/${demandeId}/retour`, {
        methode: 'POST',
        corps: { ligneId: ligne.id, quantite: 1, motif },
      })
      await charger()
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'Le retour n’a pas pu être demandé.')
    } finally {
      setEnvoi(false)
    }
  }

  async function repondre(demandeId: string) {
    const contenu = window.prompt('Votre message (2 caracteres minimum)')?.trim()
    if (!contenu) return
    setEnvoi(true); setErreur('')
    try {
      await api(`/marketplace/demandes-client/${demandeId}/messages`, { methode: 'POST', corps: { contenu } })
      await charger()
    } catch (cause) { setErreur(cause instanceof Error ? cause.message : "Le message n'a pas pu etre envoye.") }
    finally { setEnvoi(false) }
  }

  async function expedierRetour(retourId: string) {
    const referenceRetour = window.prompt('Reference de suivi du colis retour')?.trim()
    if (!referenceRetour) return
    setEnvoi(true); setErreur('')
    try {
      await api(`/marketplace/demandes-client/retours/${retourId}/expedition`, { methode: 'POST', corps: { referenceRetour } })
      await charger()
    } catch (cause) { setErreur(cause instanceof Error ? cause.message : "L'expedition n'a pas pu etre enregistree.") }
    finally { setEnvoi(false) }
  }

  async function contesterRetour(retourId: string) {
    const motif = window.prompt('Expliquez pourquoi vous contestez ce refus')?.trim()
    if (!motif) return
    setEnvoi(true); setErreur('')
    try {
      await api(`/marketplace/demandes-client/retours/${retourId}/contestation`, { methode: 'POST', corps: { motif } })
      await charger()
    } catch (cause) { setErreur(cause instanceof Error ? cause.message : "La contestation n'a pas pu etre ouverte.") }
    finally { setEnvoi(false) }
  }

  async function joindrePieces(demande: Demande, fichiers: FileList | null) {
    const message = demande.messages.findLast((element) => element.auteurType === 'client')
    if (!message || !fichiers?.length) return
    if (fichiers.length > 5) {
      setErreur('Vous pouvez joindre au maximum 5 fichiers a la fois.')
      return
    }
    setEnvoi(true)
    setErreur('')
    try {
      for (const fichier of Array.from(fichiers)) {
        if (fichier.size > 10 * 1024 * 1024) throw new Error(`${fichier.name} depasse 10 Mio.`)
        const corps = new FormData()
        corps.append('fichier', fichier)
        await api(`/marketplace/demandes-client/${demande.id}/messages/${message.id}/pieces`, { methode: 'POST', corps })
      }
      await charger()
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "La piece n'a pas pu etre jointe.")
    } finally {
      setEnvoi(false)
    }
  }

  async function telechargerPiece(demandeId: string, piece: Piece) {
    setErreur('')
    try {
      await telechargerApi(`/marketplace/demandes-client/${demandeId}/pieces/${piece.id}`, piece.nomCapture)
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "La piece n'a pas pu etre telechargee.")
    }
  }

  if (chargement) return <main className="mx-auto max-w-5xl px-5 py-14"><p role="status">Chargement du suivi…</p></main>
  if (!commande) return <main className="mx-auto max-w-3xl px-5 py-14"><p role="alert">{erreur || 'Commande introuvable.'}</p></main>

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <header className="flex flex-col gap-5 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <div><p className="t-label text-ink-3">Suivi marketplace</p><h1 className="mt-2 text-h2 font-semibold text-ink">Commande {commande.reference}</h1><p className="mt-2 text-small text-ink-2">Statut : {libelle(commande.statut)}</p></div>
        <div className="rounded-well bg-ink px-5 py-4 text-white"><span className="block text-micro opacity-70">Solde à la livraison</span><strong className="t-num text-h4">{formatPrice(commande.resteAPayer)}</strong></div>
      </header>

      {erreur ? <p className="mt-5 rounded-well border border-warn p-3 text-small text-warn" role="alert">{erreur}</p> : null}

      <section className="mt-8 grid gap-5">
        {commande.sousCommandes.map((groupe) => (
          <article key={groupe.id} className="rounded-well border border-rule bg-space p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-h4 font-semibold">{groupe.boutique.nom}</h2><p className="text-micro text-ink-3">{groupe.reference} · {libelle(groupe.statut)}</p></div></div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <ul className="divide-y divide-rule">
                {groupe.lignes.map((ligne) => (
                  <li key={ligne.id} className="py-3">
                    <div className="flex justify-between gap-4"><span>{ligne.offreTitreCapture} × {ligne.quantite}</span><strong className="t-num">{formatPrice(ligne.totalNetFcfa)}</strong></div>
                    <p className="mt-1 text-micro text-ink-3">Livré : {ligne.quantiteLivree} · Retourné : {ligne.quantiteRetournee} · Remboursé : {ligne.quantiteRemboursee}</p>
                    <button type="button" className="mt-2 text-micro font-semibold text-secondary underline" onClick={() => setSelection({ sousCommande: groupe, ligne, expedition: groupe.expeditions[0] })}>Signaler un problème</button>
                  </li>
                ))}
              </ul>
              <div className="grid gap-3">
                {groupe.expeditions.map((expedition) => (
                  <div key={expedition.id} className="rounded-control border border-rule p-4"><div className="flex justify-between gap-3"><strong>{expedition.reference}</strong><span className="text-micro font-semibold text-primary">{libelle(expedition.statut)}</span></div><p className="mt-1 text-micro text-ink-3">{expedition.ville} · À encaisser : {formatPrice(expedition.montantACollecterFcfa)}</p><ol className="mt-3 border-l border-rule pl-4">{expedition.evenements.slice(-4).reverse().map((evt) => <li key={evt.id} className="mb-2 text-micro"><b>{libelle(evt.type)}</b><span className="block text-ink-3">{date(evt.creeLe)}{evt.motif ? ` · ${evt.motif}` : ''}</span></li>)}</ol></div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Mes demandes et retours</h2>
        {demandes.length === 0 ? <p className="mt-3 text-small text-ink-3">Aucun dossier ouvert sur cette commande.</p> : (
          <div className="mt-4 grid gap-3">{demandes.map((demande) => (
            <article key={demande.id} className="rounded-well border border-rule p-4">
              <div className="flex flex-wrap justify-between gap-2"><strong>{demande.objet}</strong><span className="text-micro text-primary">{libelle(demande.statut)}</span></div>
              <p className="mt-1 text-micro text-ink-3">{demande.reference} · {demande.boutique.nom}</p>
              {demande.messages.map(message => (
                <div key={message.id} className="mt-3 rounded-control bg-space p-3 text-small">
                  <p><b>{message.auteurType === 'client' ? 'Vous' : 'Intervenant'} :</b> {message.contenu}</p>
                  {message.pieces.length ? <ul className="mt-2 flex flex-wrap gap-2">{message.pieces.map(piece => (
                    <li key={piece.id}><button type="button" className="text-micro font-semibold text-secondary underline" onClick={() => void telechargerPiece(demande.id, piece)}>{piece.nomCapture} · {Math.ceil(piece.tailleOctets / 1024)} Ko</button></li>
                  ))}</ul> : null}
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
              {demande.capacites.repondre ? <button type="button" disabled={envoi} onClick={() => void repondre(demande.id)} className="rounded-control bg-ink px-4 py-2 text-small font-semibold text-white">RÃ©pondre</button> : null}
              <label className="inline-flex cursor-pointer items-center rounded-control border border-rule px-4 py-2 text-small font-semibold">
                {envoi ? 'Envoi…' : 'Joindre des preuves'}
                <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={envoi} onChange={event => { void joindrePieces(demande, event.currentTarget.files); event.currentTarget.value = '' }} />
              </label>
              {demande.retour && demande.capacites.expedier ? <button type="button" disabled={envoi} onClick={() => void expedierRetour(demande.retour!.id)} className="rounded-control bg-secondary px-4 py-2 text-small font-semibold">DÃ©clarer le colis expÃ©diÃ©</button> : null}
              {demande.retour && demande.capacites.contester ? <button type="button" disabled={envoi} onClick={() => void contesterRetour(demande.retour!.id)} className="rounded-control border border-warn px-4 py-2 text-small font-semibold text-warn">Contester la dÃ©cision</button> : null}
              </div>
              <p className="mt-1 text-micro text-ink-3">PDF, JPEG, PNG ou WebP · 10 Mio maximum · 5 fichiers par message.</p>
              {demande.retour ? <p className="mt-3 rounded-control bg-space p-3 text-small">Retour : {libelle(demande.retour.statut)}{demande.retour.montantRembourseFcfa ? ` · ${formatPrice(demande.retour.montantRembourseFcfa)}` : ''}</p> : demande.ligne && demande.ligne.quantiteLivree > demande.ligne.quantiteRetournee ? <button type="button" disabled={envoi} onClick={() => demanderRetour(demande.id, demande.ligne!)} className="mt-3 rounded-control border border-rule px-4 py-2 text-small font-semibold">Demander un retour</button> : null}
            </article>
          ))}</div>
        )}
      </section>

      {selection ? <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-label="Ouvrir une demande"><form onSubmit={ouvrirDemande} className="w-full max-w-xl rounded-well bg-surface p-6 shadow-xl"><div className="flex justify-between gap-4"><div><p className="t-label text-ink-3">Nouvelle demande</p><h2 className="mt-1 text-h4 font-semibold">{selection.ligne.offreTitreCapture}</h2></div><button type="button" aria-label="Fermer" onClick={() => setSelection(null)} className="text-h4">×</button></div><label className="mt-5 block text-small font-semibold">Catégorie<select name="categorie" required className="mt-1 w-full rounded-control border border-rule bg-surface p-3 font-normal">{CATEGORIES.map(([valeur, texte]) => <option key={valeur} value={valeur}>{texte}</option>)}</select></label><label className="mt-4 block text-small font-semibold">Objet<input name="objet" minLength={5} maxLength={180} required className="mt-1 w-full rounded-control border border-rule p-3 font-normal" /></label><label className="mt-4 block text-small font-semibold">Description<textarea name="description" minLength={10} maxLength={5000} required rows={5} className="mt-1 w-full rounded-control border border-rule p-3 font-normal" /></label><button disabled={envoi} className="mt-5 min-h-11 w-full rounded-control bg-secondary px-5 font-bold text-on-surface">{envoi ? 'Envoi…' : 'Ouvrir la demande'}</button></form></div> : null}

      <Link href="/compte/commandes" className="mt-10 inline-flex text-small text-secondary underline">← Toutes mes commandes</Link>
    </main>
  )
}

function libelle(valeur: string) { return valeur.replaceAll('_', ' ') }
function date(valeur: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur)) }
