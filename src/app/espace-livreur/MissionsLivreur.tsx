'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
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

/** Les issues qu'un livreur peut declarer, dans les mots du terrain. */
const INCIDENTS = [
  ['reportee', 'Livraison reportée (client absent, nouveau créneau)'],
  ['echec', 'Échec de livraison'],
  ['refusee_client', 'Refusée par le client'],
  ['perdue', 'Colis perdu'],
] as const

type Fenetre = { type: 'prise'; mission: Mission } | { type: 'incident'; mission: Mission } | null

export function MissionsLivreur() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [action, setAction] = useState<string | null>(null)
  const [succes, setSucces] = useState('')
  const [fenetre, setFenetre] = useState<Fenetre>(null)
  const [typeIncident, setTypeIncident] = useState<string>('reportee')

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

  /** Appelle le backend et recharge ; l'erreur remonte a l'appelant, qui choisit ou l'afficher. */
  async function appeler(id: string, chemin: string, corps?: unknown) {
    await api(`/marketplace/expeditions/${id}/${chemin}`, { methode: 'POST', ...(corps === undefined ? {} : { corps }) })
    await charger()
  }

  /** Les actions sans saisie : leur erreur s'affiche en tete de page. */
  async function executer(id: string, chemin: string, corps?: unknown, messageSucces?: string) {
    if (action) return
    setAction(`${id}:${chemin}`); setErreur(''); setSucces('')
    try {
      await appeler(id, chemin, corps)
      if (messageSucces) setSucces(messageSucces)
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'L’action n’a pas pu être enregistrée.')
    } finally { setAction(null) }
  }

  async function prendreEnCharge(mission: Mission, donnees: FormData) {
    const reference = String(donnees.get('reference') ?? '').trim()
    const empreinte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${mission.id}:${reference}`))
    const hex = Array.from(new Uint8Array(empreinte), (octet) => octet.toString(16).padStart(2, '0')).join('')
    await appeler(mission.id, 'prise-en-charge', { type: 'scan_etiquette', empreinteSha256: hex })
    setFenetre(null)
    setSucces(`Colis ${mission.reference} pris en charge.`)
  }

  async function declarerIncident(mission: Mission, donnees: FormData) {
    const statut = String(donnees.get('statut') ?? '')
    await appeler(mission.id, 'incidents', { statut, motif: String(donnees.get('motif') ?? '').trim() })
    setFenetre(null)
    setSucces(`Incident déclaré sur ${mission.reference}.`)
  }

  function ouvrir(prochaine: Fenetre) {
    setErreur(''); setSucces('')
    setTypeIncident('reportee')
    setFenetre(prochaine)
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
    <p role="status" className={succes ? 'mt-5 rounded-well border border-primary p-3 text-small text-primary' : 'sr-only'}>{succes}</p>
    <section className="mt-8"><div className="flex items-end justify-between"><h2 className="text-h3 font-semibold">À traiter</h2><span className="t-num text-small text-ink-3">{actives.length}</span></div>{actives.length === 0 ? <div className="mt-4 rounded-well border border-dashed border-rule p-8 text-center text-small text-ink-3">Aucune mission active.</div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{actives.map((mission) => <CarteMission key={mission.id} mission={mission} occupe={Boolean(action)} ouvrir={ouvrir} executer={executer} confirmer={confirmer} />)}</div>}</section>
    <FenetreAction
      ouverte={fenetre?.type === 'prise'}
      titre={fenetre ? `Prendre en charge ${fenetre.mission.reference}` : ''}
      description="Saisissez la référence imprimée sur le bordereau ou l’étiquette. Elle prouve que vous avez le bon colis en main."
      libelleValider="Confirmer la prise en charge"
      onFermer={() => setFenetre(null)}
      onValider={(donnees) => (fenetre ? prendreEnCharge(fenetre.mission, donnees) : Promise.resolve())}
    >
      <ChampTexte nom="reference" libelle="Référence du bordereau ou du colis" required minLength={3} maxLength={120} />
    </FenetreAction>
    <FenetreAction
      ouverte={fenetre?.type === 'incident'}
      titre={fenetre ? `Incident sur ${fenetre.mission.reference}` : ''}
      libelleValider="Déclarer l’incident"
      irreversible={typeIncident === 'perdue' ? 'Je confirme que le colis est perdu. La perte engage la responsabilité de celui qui le détenait et ne pourra pas être annulée depuis cet écran.' : undefined}
      onFermer={() => setFenetre(null)}
      onValider={(donnees) => (fenetre ? declarerIncident(fenetre.mission, donnees) : Promise.resolve())}
    >
      <fieldset className="grid gap-2">
        <legend className="text-small font-semibold">Ce qui s’est passé</legend>
        {INCIDENTS.map(([valeur, texte]) => (
          <label key={valeur} className="flex min-h-11 items-center gap-3 rounded-control border border-rule px-3 text-small">
            <input type="radio" name="statut" value={valeur} checked={typeIncident === valeur} onChange={() => setTypeIncident(valeur)} className="size-5" />
            {texte}
          </label>
        ))}
      </fieldset>
      <ChampTexte nom="motif" libelle="Détails" aide="5 caractères minimum : ce qu’a dit le client, ce que vous avez constaté." multiligne required minLength={5} maxLength={500} />
    </FenetreAction>
    {terminees.length ? <section className="mt-12"><h2 className="text-h3 font-semibold">Historique récent</h2><div className="mt-4 grid gap-3">{terminees.map((mission) => <div key={mission.id} className="flex flex-wrap justify-between gap-3 rounded-well border border-rule px-4 py-3"><span><b>{mission.reference}</b><small className="block text-ink-3">{mission.sousCommande.boutique.nom} · {mission.sousCommande.commande.reference}</small></span><span className="text-small font-semibold text-primary">{libelle(mission.statut)}</span></div>)}</div></section> : null}
  </main>
}

function CarteMission({ mission, occupe, ouvrir, executer, confirmer }: { mission: Mission; occupe: boolean; ouvrir: (fenetre: Fenetre) => void; executer: (id: string, chemin: string, corps?: unknown, messageSucces?: string) => Promise<void>; confirmer: (event: FormEvent<HTMLFormElement>, mission: Mission) => Promise<void> }) {
  const adresse = [mission.ville, mission.adresseFigee?.quartier, mission.adresseFigee?.repere].filter(Boolean).join(', ')
  return <article className="rounded-well border border-rule bg-space p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-h4 font-semibold">{mission.reference}</h3><p className="mt-1 text-micro text-ink-3">{mission.sousCommande.boutique.nom} · {mission.sousCommande.commande.reference}</p></div><span className="rounded-full border border-primary px-2.5 py-1 text-micro font-semibold text-primary">{libelle(mission.statut)}</span></div><dl className="mt-5 grid gap-3 text-small sm:grid-cols-2"><div><dt className="text-ink-3">Adresse</dt><dd className="font-medium">{adresse || 'À confirmer'}</dd></div><div><dt className="text-ink-3">Téléphone</dt><dd className="font-medium"><a href={mission.sousCommande.commande.telephoneLivraison ? `tel:${mission.sousCommande.commande.telephoneLivraison}` : undefined}>{mission.sousCommande.commande.telephoneLivraison || 'Non renseigné'}</a></dd></div><div><dt className="text-ink-3">À encaisser</dt><dd className="t-num text-h4 font-semibold">{formatPrice(mission.montantACollecterFcfa)}</dd></div><div><dt className="text-ink-3">Créneau</dt><dd>{mission.livraisonPrevueDebut ? date(mission.livraisonPrevueDebut) : 'Non planifié'}</dd></div></dl><div className="mt-5 flex flex-wrap gap-2">{mission.statut === 'affectee' ? <button disabled={occupe} onClick={() => ouvrir({ type: 'prise', mission })} className="min-h-10 rounded-control bg-secondary px-4 text-small font-bold text-on-surface">Prendre en charge</button> : null}{mission.statut === 'prise_en_charge' ? <button disabled={occupe} onClick={() => void executer(mission.id, 'depart', undefined, `Livraison ${mission.reference} démarrée.`)} className="min-h-10 rounded-control bg-secondary px-4 text-small font-bold text-on-surface">Démarrer la livraison</button> : null}{mission.statut === 'en_livraison' ? <button disabled={occupe} onClick={() => void executer(mission.id, 'code', undefined, 'Code envoyé au client.')} className="min-h-10 rounded-control border border-rule px-4 text-small font-semibold">Envoyer le code client</button> : null}{['affectee', 'prise_en_charge', 'en_livraison', 'reportee'].includes(mission.statut) ? <button disabled={occupe} onClick={() => ouvrir({ type: 'incident', mission })} className="min-h-10 rounded-control border border-rule px-4 text-small font-semibold">Déclarer un incident</button> : null}</div>{mission.statut === 'en_livraison' ? <form onSubmit={(event) => void confirmer(event, mission)} className="mt-4 flex flex-col gap-2 rounded-control border border-rule bg-surface p-3 sm:flex-row"><label className="flex-1 text-micro font-semibold">Code à 6 chiffres<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="mt-1 w-full rounded-control border border-rule p-2 text-small font-normal" /></label><button disabled={occupe} className="min-h-11 self-end rounded-control bg-primary px-4 text-small font-bold text-on-surface">Confirmer · {formatPrice(mission.montantACollecterFcfa)}</button></form> : null}</article>
}

function libelle(valeur: string) { return valeur.replaceAll('_', ' ') }
function date(valeur: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur)) }
