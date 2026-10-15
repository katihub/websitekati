'use client'

import { useCallback, useEffect, useState } from 'react'

import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
import { normalisePhone } from '@/lib/account'
import { ErreurApi, api } from '@/lib/api'
import { LIBELLE_MODE, estModeLivraison, type DeliveryMode } from '@/lib/modes-livraison'

/**
 * LES OPERATIONS DE LIVRAISON DE LA BOUTIQUE.
 *
 * Pour les modes qu'elle gere elle-meme (sa livraison, le retrait, l'agence), la
 * boutique fait avancer chaque colis :
 * 1. elle l'affecte a un de ses agents, verifie par KatiHub ;
 * 2. elle en prouve la prise en charge (photo du colis prepare, ou sa reference) ;
 * 3. elle le met en route, ou au comptoir pour un retrait ;
 * 4. elle le remet contre le code envoye au client, ou, en agence, prouve le
 *    depot par le bordereau.
 * Les colis Kati Express sont operes par KatiHub : ils s'affichent sans action.
 */

type Agent = { id: string; nom: string; telephone: string; actif: boolean; verifieLe: string | null; plafondEspecesFcfa: number | null }
type Adresse = { ville?: string; quartier?: string; repere?: string; adresseRetrait?: string; agence?: string }
type Livraison = {
  id: string; reference: string; statut: string; modeLivraison: string; ville: string; creeLe: string
  geree?: boolean; adresse?: Adresse | null; telephoneClient?: string | null
  montantACollecterFcfa?: number; fraisLivraisonFcfa?: number; fraisPrepayes?: boolean
  agentCourant?: { id: string; nom: string } | null; codeActifJusquau?: string | null
  sousCommande: { reference: string; noteAgence?: string | null; lignes?: Array<{ produitNomCapture: string; quantite: number; quantiteRefusee?: number }> }
}
type Fenetre =
  | { type: 'agent' }
  | { type: 'prise' | 'remise' | 'depot' | 'incident'; livraison: Livraison }
  | null

const TERMINES = ['livree', 'annulee', 'perdue', 'retour_recu', 'refusee_client', 'echec', 'retour_initie']
const STATUTS: Record<string, string> = {
  planifiee: 'À affecter', a_affecter: 'À affecter', affectee: 'Affectée', prise_en_charge: 'Prise en charge', en_livraison: 'En livraison',
  reportee: 'Reportée', echec: 'Échec', refusee_client: 'Refusée par le client', livree: 'Livrée', perdue: 'Perdue', annulee: 'Annulée',
  retour_initie: 'Retour en cours', retour_recu: 'Retour reçu',
}
const fcfa = (montant: number) => `${new Intl.NumberFormat('fr-FR').format(montant)} FCFA`
const date = (valeur: string) => new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur))
const message = (cause: unknown) => cause instanceof ErreurApi ? cause.message : cause instanceof Error ? cause.message : 'L’action n’a pas pu être enregistrée.'

/** Le libelle du statut, dit dans les mots du mode : en retrait, « en livraison » veut dire « au comptoir ». */
function libelleStatut(livraison: Livraison) {
  if (livraison.modeLivraison === 'retrait' && livraison.statut === 'en_livraison') return 'Prête au comptoir'
  if (livraison.modeLivraison === 'agence' && livraison.statut === 'en_livraison') return 'En route vers l’agence'
  return STATUTS[livraison.statut] ?? livraison.statut.replaceAll('_', ' ')
}

const LIBELLE_PRISE: Record<string, string> = { vendeur: 'Remis au livreur', retrait: 'Commande préparée', agence: 'Colis prêt pour l’agence' }
const LIBELLE_DEPART: Record<string, string> = { vendeur: 'Partir en livraison', retrait: 'Prête au comptoir', agence: 'En route vers l’agence' }

async function empreinteTexte(texte: string) {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))
  return Array.from(new Uint8Array(octets), (octet) => octet.toString(16).padStart(2, '0')).join('')
}

/** Depose la photo d'une preuve ; rend la cle et l'empreinte a joindre a l'etape. */
async function deposerPhoto(expeditionId: string, fichier: File) {
  const corps = new FormData()
  corps.append('fichier', fichier)
  return api<{ stockageCle: string; empreinteSha256: string }>(`/marketplace/expeditions/${expeditionId}/preuves`, { methode: 'POST', corps })
}

/** Les livraisons et les agents de la boutique, lus ensemble. */
function lire(shopId: string, signal?: AbortSignal) {
  return Promise.all([
    api<{ elements: Livraison[] }>(`/vendeurs/mes-boutiques/${shopId}/livraisons`, { signal }),
    api<Agent[]>(`/marketplace/expeditions/boutiques/${shopId}/agents`, { signal }),
  ])
}

function fichierDe(donnees: FormData, nom: string): File | null {
  const valeur = donnees.get(nom)
  return valeur instanceof File && valeur.size > 0 ? valeur : null
}

export function LivraisonsBoutique({ shopId }: { shopId: string }) {
  const [livraisons, setLivraisons] = useState<Livraison[] | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [toutes, setToutes] = useState(false)
  const [choixAgent, setChoixAgent] = useState<Record<string, string>>({})
  const [fenetre, setFenetre] = useState<Fenetre>(null)

  const recevoir = useCallback(([liste, equipe]: Awaited<ReturnType<typeof lire>>) => {
    setLivraisons(liste.elements)
    setAgents(equipe)
  }, [])
  const echouer = useCallback((cause: unknown) => {
    setErreur(message(cause))
    setLivraisons((actuelles) => actuelles ?? [])
  }, [])
  const charger = useCallback(() => lire(shopId).then(recevoir).catch(echouer), [shopId, recevoir, echouer])

  useEffect(() => {
    const controleur = new AbortController()
    lire(shopId, controleur.signal)
      .then((donnees) => { if (!controleur.signal.aborted) recevoir(donnees) })
      .catch((cause: unknown) => { if (!controleur.signal.aborted) echouer(cause) })
    return () => controleur.abort()
  }, [shopId, recevoir, echouer])

  const disponibles = agents.filter((agent) => agent.actif && agent.verifieLe)
  const geree = (livraison: Livraison) => livraison.geree ?? livraison.modeLivraison !== 'katihub'
  const visibles = (livraisons ?? []).filter((livraison) => toutes || (geree(livraison) && !TERMINES.includes(livraison.statut)))

  /** Une action directe : elle se verrouille le temps de l'appel, puis la liste se recharge. */
  async function agir(cle: string, appel: () => Promise<unknown>, reussite: string) {
    if (enCours) return
    setEnCours(cle); setErreur(''); setSucces('')
    try { await appel(); setSucces(reussite); await charger() }
    catch (cause) { setErreur(message(cause)) }
    finally { setEnCours(null) }
  }

  /** Une action en fenetre : une erreur la garde ouverte avec son message. */
  async function valider(appel: () => Promise<unknown>, reussite: string) {
    await appel()
    setFenetre(null); setSucces(reussite); setErreur('')
    await charger()
  }

  async function ajouterAgent(donnees: FormData) {
    const nom = String(donnees.get('nom') ?? '').trim()
    const telephone = normalisePhone(String(donnees.get('telephone') ?? ''))
    if (nom.length < 2) throw new Error('Indiquez le nom de l’agent.')
    if (!telephone) throw new Error('Indiquez un numéro mobile camerounais, commençant par 6.')
    await valider(() => api(`/marketplace/expeditions/boutiques/${shopId}/agents`, { methode: 'POST', corps: { nom, telephone } }), `${nom} est ajouté : KatiHub doit le vérifier avant sa première livraison.`)
  }

  async function prendreEnCharge(livraison: Livraison, donnees: FormData) {
    const photo = fichierDe(donnees, 'photo')
    const reference = String(donnees.get('reference') ?? '').trim()
    if (!photo && reference.length < 2) throw new Error('Joignez une photo du colis, ou au moins sa référence.')
    // Sans photo, seule l'empreinte de la reference part : la reference reste dans la boutique.
    const preuve = photo
      ? { type: 'photo_colis', ...(await deposerPhoto(livraison.id, photo)) }
      : { type: 'scan_etiquette', empreinteSha256: await empreinteTexte(`${livraison.id}:${reference}`) }
    await valider(() => api(`/marketplace/expeditions/${livraison.id}/prise-en-charge`, { methode: 'POST', corps: preuve }), `${livraison.reference} : prise en charge enregistrée.`)
  }

  async function remettre(livraison: Livraison, donnees: FormData) {
    const code = String(donnees.get('code') ?? '').replace(/\s/g, '')
    if (!/^\d{6}$/.test(code)) throw new Error('Le code du client compte 6 chiffres.')
    await valider(
      () => api(`/marketplace/expeditions/${livraison.id}/confirmation`, { methode: 'POST', corps: { code, montantEncaisseFcfa: livraison.montantACollecterFcfa ?? 0 } }),
      `${livraison.reference} est remise au client.`,
    )
  }

  async function deposer(livraison: Livraison, donnees: FormData) {
    const numeroBordereau = String(donnees.get('bordereau') ?? '').trim()
    const photo = fichierDe(donnees, 'photo')
    if (numeroBordereau.length < 2) throw new Error('Indiquez le numéro du bordereau remis par l’agence.')
    if (!photo) throw new Error('Joignez la photo du bordereau.')
    const preuve = await deposerPhoto(livraison.id, photo)
    await valider(
      () => api(`/marketplace/expeditions/${livraison.id}/depot-agence`, { methode: 'POST', corps: { numeroBordereau, ...preuve } }),
      `${livraison.reference} est déposée à l’agence : le client est livré.`,
    )
  }

  async function signaler(livraison: Livraison, donnees: FormData) {
    const statut = String(donnees.get('statut') ?? '')
    const motif = String(donnees.get('motif') ?? '').trim()
    if (motif.length < 5) throw new Error('Décrivez ce qui s’est passé (5 caractères au moins).')
    await valider(() => api(`/marketplace/expeditions/${livraison.id}/incidents`, { methode: 'POST', corps: { statut, motif } }), `${livraison.reference} : incident enregistré.`)
  }

  const bouton = 'min-h-11 rounded-control px-4 text-small font-semibold disabled:opacity-50'
  const principal = `${bouton} bg-secondary text-on-surface`
  const secondaire = `${bouton} border border-rule`

  function actions(livraison: Livraison) {
    const mode = livraison.modeLivraison
    const occupe = Boolean(enCours)
    if (!geree(livraison)) return <p className="text-small text-ink-3">Opérée par Kati Express : KatiHub s’en occupe.</p>
    if (['planifiee', 'a_affecter', 'reportee'].includes(livraison.statut)) {
      if (!disponibles.length) return <p className="text-small text-warn">Aucun agent vérifié : ajoutez-en un ci-dessus, KatiHub le vérifie avant sa première livraison.</p>
      const choisi = choixAgent[livraison.id] ?? disponibles[0]!.id
      return <div className="flex flex-wrap items-end gap-2">
        <label className="text-small font-semibold">Agent
          <select value={choisi} onChange={(event) => setChoixAgent({ ...choixAgent, [livraison.id]: event.currentTarget.value })} className="mt-1 block min-h-11 rounded-control border border-rule bg-surface px-3 font-normal" data-testid={`agent-${livraison.reference}`}>
            {disponibles.map((agent) => <option key={agent.id} value={agent.id}>{agent.nom}</option>)}
          </select>
        </label>
        <button type="button" className={principal} disabled={occupe} onClick={() => void agir(livraison.id, () => api(`/marketplace/expeditions/${livraison.id}/affectation`, { methode: 'POST', corps: { agentId: choisi } }), `${livraison.reference} est affectée.`)}>Affecter</button>
      </div>
    }
    if (livraison.statut === 'affectee') {
      return <button type="button" className={principal} disabled={occupe} onClick={() => setFenetre({ type: 'prise', livraison })}>{LIBELLE_PRISE[mode] ?? 'Prise en charge'}</button>
    }
    if (livraison.statut === 'prise_en_charge') {
      return <button type="button" className={principal} disabled={occupe} onClick={() => void agir(livraison.id, () => api(`/marketplace/expeditions/${livraison.id}/depart`, { methode: 'POST' }), mode === 'retrait' ? `${livraison.reference} attend le client au comptoir : envoyez-lui son code de retrait.` : `${livraison.reference} est en route.`)}>{LIBELLE_DEPART[mode] ?? 'Partir'}</button>
    }
    if (livraison.statut === 'en_livraison') {
      const incident = <button type="button" className={secondaire} disabled={occupe} onClick={() => setFenetre({ type: 'incident', livraison })}>Signaler un incident</button>
      if (mode === 'agence') {
        return <div className="flex flex-wrap gap-2"><button type="button" className={principal} disabled={occupe} onClick={() => setFenetre({ type: 'depot', livraison })}>Confirmer le dépôt</button>{incident}</div>
      }
      return <div className="grid gap-2">
        {livraison.codeActifJusquau ? <p className="text-micro text-ink-3">Code envoyé au client, valable jusqu’au {date(livraison.codeActifJusquau)}.</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={livraison.codeActifJusquau ? secondaire : principal} disabled={occupe} onClick={() => void agir(livraison.id, () => api(`/marketplace/expeditions/${livraison.id}/code`, { methode: 'POST' }), mode === 'retrait' ? 'Le code de retrait est envoyé au client par e-mail, avec l’adresse de la boutique.' : 'Le code de livraison est envoyé au client par e-mail ; il vaut 30 minutes.')}>{livraison.codeActifJusquau ? 'Renvoyer le code' : mode === 'retrait' ? 'Envoyer le code de retrait' : 'Envoyer le code au client'}</button>
          <button type="button" className={livraison.codeActifJusquau ? principal : secondaire} disabled={occupe || !livraison.codeActifJusquau} onClick={() => setFenetre({ type: 'remise', livraison })}>Confirmer la remise</button>
          {incident}
        </div>
      </div>
    }
    return null
  }

  function destination(livraison: Livraison) {
    const adresse = livraison.adresse
    if (!geree(livraison) || !adresse) return `${livraison.ville}`
    if (livraison.modeLivraison === 'retrait') return `Retrait à la boutique${adresse.adresseRetrait ? ` : ${adresse.adresseRetrait}` : ''}`
    if (livraison.modeLivraison === 'agence') return `Agence : ${livraison.sousCommande.noteAgence ?? adresse.agence ?? 'à préciser'} (${adresse.ville ?? livraison.ville})`
    return [adresse.quartier, adresse.ville ?? livraison.ville].filter(Boolean).join(', ') + (adresse.repere ? ` — ${adresse.repere}` : '')
  }

  const fenetreLivraison = fenetre && fenetre.type !== 'agent' ? fenetre.livraison : null

  return <div className="grid gap-6" data-testid="livraisons-boutique">
    <section className="rounded-well border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-h4 font-semibold">Vos agents</h2><p className="mt-1 max-w-2xl text-small text-ink-2">Les livreurs et les employés du comptoir de la boutique. KatiHub vérifie chaque agent et fixe l’argent qu’il peut garder sur lui avant sa première livraison.</p></div>
        <button type="button" className={principal} onClick={() => setFenetre({ type: 'agent' })} data-testid="ajouter-agent">Ajouter un agent</button>
      </div>
      {agents.length ? <ul className="mt-4 divide-y divide-rule">{agents.map((agent) => <li key={agent.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`agent-ligne-${agent.nom}`}>
        <div><b className="text-small">{agent.nom}</b><span className="ml-2 text-micro text-ink-3">{agent.telephone}</span>
          <p className={`text-micro ${!agent.actif ? 'text-ink-3' : agent.verifieLe ? 'text-primary' : 'text-warn'}`}>{!agent.actif ? 'Retiré' : agent.verifieLe ? `Vérifié par KatiHub${agent.plafondEspecesFcfa !== null ? ` · peut encaisser jusqu’à ${fcfa(agent.plafondEspecesFcfa)}` : ''}` : 'En attente de vérification KatiHub'}</p></div>
        {agent.actif ? <button type="button" className={secondaire} disabled={Boolean(enCours)} onClick={() => void agir(agent.id, () => api(`/marketplace/expeditions/boutiques/${shopId}/agents/${agent.id}/desactivation`, { methode: 'POST' }), `${agent.nom} est retiré.`)}>Retirer</button> : null}
      </li>)}</ul> : <p className="mt-4 text-small text-ink-3">Aucun agent pour l’instant.</p>}
    </section>

    <section className="rounded-well border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h4 font-semibold">Vos livraisons</h2>
        <label className="flex items-center gap-2 text-small"><input type="checkbox" className="size-5" checked={toutes} onChange={(event) => setToutes(event.currentTarget.checked)} />Afficher aussi les livraisons terminées et Kati Express</label>
      </div>
      {erreur ? <p role="alert" className="mt-4 rounded-control border border-warn p-3 text-small text-warn">{erreur}</p> : null}
      <p role="status" className={succes ? 'mt-4 rounded-control border border-primary p-3 text-small text-primary' : 'sr-only'}>{succes}</p>
      {livraisons === null ? <p className="mt-4 text-small text-ink-3" role="status">Chargement des livraisons…</p>
        : visibles.length ? <ul className="mt-4 grid gap-3">{visibles.map((livraison) => <li key={livraison.id} className="grid gap-3 rounded-well border border-rule p-4" data-testid={`livraison-${livraison.reference}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <b className="t-num">{livraison.reference}</b>
              <span className="ml-2 text-micro text-ink-3">Commande {livraison.sousCommande.reference} · {estModeLivraison(livraison.modeLivraison) ? LIBELLE_MODE[livraison.modeLivraison as DeliveryMode] : livraison.modeLivraison}</span>
              <p className="mt-1 text-small text-ink-2">{destination(livraison)}</p>
              {livraison.telephoneClient ? <p className="text-small text-ink-2">Client : <a className="text-secondary underline" href={`tel:${livraison.telephoneClient.replace(/\s/g, '')}`}>{livraison.telephoneClient}</a></p> : null}
              {livraison.sousCommande.lignes?.length ? <p className="text-micro text-ink-3">{livraison.sousCommande.lignes.filter((l) => l.quantite > (l.quantiteRefusee ?? 0)).map((l) => `${l.produitNomCapture} × ${l.quantite - (l.quantiteRefusee ?? 0)}`).join(' · ')}</p> : null}
            </div>
            <div className="text-right">
              <span className="inline-flex rounded-full border border-rule px-2 py-0.5 text-micro font-semibold">{libelleStatut(livraison)}</span>
              {geree(livraison) && livraison.montantACollecterFcfa !== undefined ? <p className="mt-1 text-small">{livraison.montantACollecterFcfa ? <>À encaisser : <b className="t-num">{fcfa(livraison.montantACollecterFcfa)}</b></> : 'Rien à encaisser'}</p> : null}
              {livraison.agentCourant ? <p className="text-micro text-ink-3">Agent : {livraison.agentCourant.nom}</p> : null}
            </div>
          </div>
          {actions(livraison)}
        </li>)}</ul>
        : <p className="mt-4 text-small text-ink-3">{toutes ? 'Aucune livraison pour cette boutique.' : 'Aucune livraison à traiter : tout est à jour.'}</p>}
    </section>

    {fenetre?.type === 'agent' ? <FenetreAction ouverte titre="Ajouter un agent" description="Un livreur ou un employé du comptoir. KatiHub le vérifie avant sa première livraison." libelleValider="Ajouter" onValider={ajouterAgent} onFermer={() => setFenetre(null)}>
      <ChampTexte nom="nom" libelle="Nom complet" required minLength={2} maxLength={120} autoComplete="name" />
      <ChampTexte nom="telephone" libelle="Téléphone mobile" required type="tel" inputMode="tel" maxLength={20} placeholder="6 77 12 34 56" />
    </FenetreAction> : null}

    {fenetre?.type === 'prise' && fenetreLivraison ? <FenetreAction ouverte titre={`${LIBELLE_PRISE[fenetreLivraison.modeLivraison] ?? 'Prise en charge'} — ${fenetreLivraison.reference}`} description="La photo du colis prêt (ou sa référence) prouve que la commande est prise en charge. Elle protège la boutique en cas de contestation." libelleValider="Enregistrer" onValider={(donnees) => prendreEnCharge(fenetreLivraison, donnees)} onFermer={() => setFenetre(null)}>
      <label className="block text-small font-semibold">Photo du colis<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-1 block w-full text-small font-normal" /></label>
      <ChampTexte nom="reference" libelle="Ou, sans photo, la référence de l’étiquette" aide="Gardez-la : seule son empreinte est envoyée, elle permettra de prouver la prise en charge." maxLength={120} placeholder="Ex. numéro de sac" />
    </FenetreAction> : null}

    {fenetre?.type === 'remise' && fenetreLivraison ? <FenetreAction ouverte titre={`Remise au client — ${fenetreLivraison.reference}`} description={<>Saisissez le code que le client vous donne, après avoir vérifié son colis.{fenetreLivraison.montantACollecterFcfa ? <> Encaissez d’abord <b>{fcfa(fenetreLivraison.montantACollecterFcfa)}</b>.</> : ' Rien n’est à encaisser.'}</>} libelleValider="Confirmer la remise" onValider={(donnees) => remettre(fenetreLivraison, donnees)} onFermer={() => setFenetre(null)}>
      <ChampTexte nom="code" libelle="Code du client" required inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength={7} autoComplete="one-time-code" />
    </FenetreAction> : null}

    {fenetre?.type === 'depot' && fenetreLivraison ? <FenetreAction ouverte titre={`Dépôt à l’agence — ${fenetreLivraison.reference}`} description={`Agence choisie par le client : ${fenetreLivraison.sousCommande.noteAgence ?? 'non précisée'}. Le bordereau remis par l’agence prouve le dépôt ; le client est alors livré.`} libelleValider="Confirmer le dépôt" onValider={(donnees) => deposer(fenetreLivraison, donnees)} onFermer={() => setFenetre(null)}>
      <ChampTexte nom="bordereau" libelle="Numéro du bordereau" required minLength={2} maxLength={60} />
      <label className="block text-small font-semibold">Photo du bordereau<input type="file" name="photo" required accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="mt-1 block w-full text-small font-normal" /></label>
    </FenetreAction> : null}

    {fenetre?.type === 'incident' && fenetreLivraison ? <FenetreAction ouverte titre={`Incident — ${fenetreLivraison.reference}`} description="Le client et KatiHub voient le motif. Un report permet de réaffecter la livraison." libelleValider="Enregistrer l’incident" onValider={(donnees) => signaler(fenetreLivraison, donnees)} onFermer={() => setFenetre(null)}>
      <label className="block text-small font-semibold">Ce qui s’est passé
        <select name="statut" className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 font-normal">
          <option value="reportee">Report (client absent, rendez-vous déplacé)</option>
          <option value="refusee_client">Le client refuse le colis</option>
          <option value="echec">Échec de livraison</option>
        </select>
      </label>
      <ChampTexte nom="motif" libelle="Motif" required minLength={5} maxLength={500} multiligne />
    </FenetreAction> : null}
  </div>
}
