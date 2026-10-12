'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { ErreurApi, api } from '@/lib/api'
import { formatPrice } from '@/lib/format'

type Mission = {
  id: string; reference: string; statut: string; ville: string
  adresseFigee: { quartier?: string; repere?: string } | null
  montantACollecterFcfa: number; livraisonPrevueDebut: string | null; livraisonPrevueFin: string | null
  sousCommande: { reference: string; boutique: { nom: string }; commande: { reference: string; telephoneLivraison: string | null } }
  evenements: Array<{ id: string; type: string; motif: string | null; creeLe: string }>
}

const TERMINES = new Set(['livree', 'annulee', 'perdue', 'refusee_client'])

export function MissionsLivreur() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [action, setAction] = useState<string | null>(null)

  const charger = useCallback(async (signal?: AbortSignal) => {
    try {
      setMissions(await api<Mission[]>('/marketplace/expeditions/miennes', { signal }))
      setErreur('')
    } catch (cause) {
      if (!signal?.aborted) setErreur(cause instanceof ErreurApi ? cause.message : 'Impossible de charger les missions.')
    } finally {
      if (!signal?.aborted) setChargement(false)
    }
  }, [])

  useEffect(() => {
    const controleur = new AbortController()
    api<Mission[]>('/marketplace/expeditions/miennes', { signal: controleur.signal })
      .then((prochainesMissions) => {
        setMissions(prochainesMissions)
        setErreur('')
      })
      .catch((cause: unknown) => {
        if (!controleur.signal.aborted) {
          setErreur(cause instanceof ErreurApi ? cause.message : 'Impossible de charger les missions.')
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) setChargement(false)
      })
    return () => controleur.abort()
  }, [])

  async function executer(id: string, chemin: string, corps?: unknown) {
    if (action) return
    setAction(`${id}:${chemin}`); setErreur('')
    try {
      await api(`/marketplace/expeditions/${id}/${chemin}`, { methode: 'POST', ...(corps === undefined ? {} : { corps }) })
      await charger()
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'L’action n’a pas pu être enregistrée.')
    } finally { setAction(null) }
  }

  async function prendreEnCharge(mission: Mission) {
    const reference = window.prompt('Référence du bordereau ou du colis')?.trim()
    if (!reference) return
    const empreinte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${mission.id}:${reference}`))
    const hex = Array.from(new Uint8Array(empreinte), (octet) => octet.toString(16).padStart(2, '0')).join('')
    await executer(mission.id, 'prise-en-charge', { type: 'scan_etiquette', empreinteSha256: hex })
  }

  async function incident(mission: Mission) {
    const statut = window.prompt('Type : reportee, echec, refusee_client ou perdue', 'reportee')?.trim()
    if (!statut) return
    const motif = window.prompt('Décrivez l’incident (5 caractères minimum)')?.trim()
    if (motif) await executer(mission.id, 'incidents', { statut, motif })
  }

  async function confirmer(event: FormEvent<HTMLFormElement>, mission: Mission) {
    event.preventDefault()
    const donnees = new FormData(event.currentTarget)
    await executer(mission.id, 'confirmation', { code: donnees.get('code'), montantEncaisseFcfa: mission.montantACollecterFcfa })
  }

  if (chargement) return <main className="mx-auto max-w-5xl px-5 py-14"><p role="status">Chargement des missions…</p></main>
  const actives = missions.filter((mission) => !TERMINES.has(mission.statut))
  const terminees = missions.filter((mission) => TERMINES.has(mission.statut))

  return <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
    <header className="border-b border-rule pb-8"><p className="t-label text-ink-3">Opérations terrain</p><h1 className="mt-2 text-h2 font-semibold text-ink">Mes missions</h1><p className="mt-2 max-w-2xl text-small text-ink-2">Prise en charge, départ, code client et encaissement sont consignés dans le journal de livraison.</p></header>
    {erreur ? <p className="mt-5 rounded-well border border-warn p-3 text-small text-warn" role="alert">{erreur}</p> : null}
    <section className="mt-8"><div className="flex items-end justify-between"><h2 className="text-h3 font-semibold">À traiter</h2><span className="t-num text-small text-ink-3">{actives.length}</span></div>{actives.length === 0 ? <div className="mt-4 rounded-well border border-dashed border-rule p-8 text-center text-small text-ink-3">Aucune mission active.</div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{actives.map((mission) => <CarteMission key={mission.id} mission={mission} occupe={Boolean(action)} prendreEnCharge={prendreEnCharge} executer={executer} incident={incident} confirmer={confirmer} />)}</div>}</section>
    {terminees.length ? <section className="mt-12"><h2 className="text-h3 font-semibold">Historique récent</h2><div className="mt-4 grid gap-3">{terminees.map((mission) => <div key={mission.id} className="flex flex-wrap justify-between gap-3 rounded-well border border-rule px-4 py-3"><span><b>{mission.reference}</b><small className="block text-ink-3">{mission.sousCommande.boutique.nom} · {mission.sousCommande.commande.reference}</small></span><span className="text-small font-semibold text-primary">{libelle(mission.statut)}</span></div>)}</div></section> : null}
  </main>
}

function CarteMission({ mission, occupe, prendreEnCharge, executer, incident, confirmer }: { mission: Mission; occupe: boolean; prendreEnCharge: (mission: Mission) => Promise<void>; executer: (id: string, chemin: string, corps?: unknown) => Promise<void>; incident: (mission: Mission) => Promise<void>; confirmer: (event: FormEvent<HTMLFormElement>, mission: Mission) => Promise<void> }) {
  const adresse = [mission.ville, mission.adresseFigee?.quartier, mission.adresseFigee?.repere].filter(Boolean).join(', ')
  return <article className="rounded-well border border-rule bg-space p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-h4 font-semibold">{mission.reference}</h3><p className="mt-1 text-micro text-ink-3">{mission.sousCommande.boutique.nom} · {mission.sousCommande.commande.reference}</p></div><span className="rounded-full border border-primary px-2.5 py-1 text-micro font-semibold text-primary">{libelle(mission.statut)}</span></div><dl className="mt-5 grid gap-3 text-small sm:grid-cols-2"><div><dt className="text-ink-3">Adresse</dt><dd className="font-medium">{adresse || 'À confirmer'}</dd></div><div><dt className="text-ink-3">Téléphone</dt><dd className="font-medium"><a href={mission.sousCommande.commande.telephoneLivraison ? `tel:${mission.sousCommande.commande.telephoneLivraison}` : undefined}>{mission.sousCommande.commande.telephoneLivraison || 'Non renseigné'}</a></dd></div><div><dt className="text-ink-3">À encaisser</dt><dd className="t-num text-h4 font-semibold">{formatPrice(mission.montantACollecterFcfa)}</dd></div><div><dt className="text-ink-3">Créneau</dt><dd>{mission.livraisonPrevueDebut ? date(mission.livraisonPrevueDebut) : 'Non planifié'}</dd></div></dl><div className="mt-5 flex flex-wrap gap-2">{mission.statut === 'affectee' ? <button disabled={occupe} onClick={() => void prendreEnCharge(mission)} className="min-h-10 rounded-control bg-secondary px-4 text-small font-bold text-on-surface">Prendre en charge</button> : null}{mission.statut === 'prise_en_charge' ? <button disabled={occupe} onClick={() => void executer(mission.id, 'depart')} className="min-h-10 rounded-control bg-secondary px-4 text-small font-bold text-on-surface">Démarrer la livraison</button> : null}{mission.statut === 'en_livraison' ? <button disabled={occupe} onClick={() => void executer(mission.id, 'code')} className="min-h-10 rounded-control border border-rule px-4 text-small font-semibold">Envoyer le code client</button> : null}{['affectee', 'prise_en_charge', 'en_livraison', 'reportee'].includes(mission.statut) ? <button disabled={occupe} onClick={() => void incident(mission)} className="min-h-10 rounded-control border border-rule px-4 text-small font-semibold">Déclarer un incident</button> : null}</div>{mission.statut === 'en_livraison' ? <form onSubmit={(event) => void confirmer(event, mission)} className="mt-4 flex flex-col gap-2 rounded-control border border-rule bg-surface p-3 sm:flex-row"><label className="flex-1 text-micro font-semibold">Code à 6 chiffres<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="mt-1 w-full rounded-control border border-rule p-2 text-small font-normal" /></label><button disabled={occupe} className="min-h-11 self-end rounded-control bg-primary px-4 text-small font-bold text-on-surface">Confirmer · {formatPrice(mission.montantACollecterFcfa)}</button></form> : null}</article>
}

function libelle(valeur: string) { return valeur.replaceAll('_', ' ') }
function date(valeur: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur)) }
