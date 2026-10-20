'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { useAccount } from '@/lib/account'
import { ErreurApi, api, apiDisponible } from '@/lib/api'

type Ligne = { id: string; offreTitreCapture: string }
type SousCommande = { id: string; reference: string; boutique: { id: string; nom: string; slug: string }; lignes: Ligne[] }
type Contexte = { id: string; reference: string; statut: string; creeLe: string; sousCommandes: SousCommande[] }
type Message = { id: string; auteurType: string; contenu: string; creeLe: string }
type Ticket = {
  id: string
  reference: string
  categorie: string
  statut: string
  objet: string
  description: string
  creeLe: string
  modifieLe: string
  boutique: { nom: string; slug: string }
  commande: { reference: string }
  sousCommande: { reference: string } | null
  ligne: Ligne | null
  messages: Message[]
  capacites: { repondre: boolean }
}

const MOTIFS = [
  ['commande', 'Problème avec une commande'],
  ['livraison', 'Livraison ou retrait'],
  ['paiement', 'Paiement ou acompte'],
  ['produit_endommage', 'Produit endommagé'],
  ['produit_non_conforme', 'Produit non conforme'],
  ['produit_manquant', 'Produit manquant'],
  ['remboursement', 'Retour ou remboursement'],
  ['comportement_vendeur', 'Problème avec un vendeur'],
  ['autre', 'Autre demande'],
] as const

const STATUTS: Record<string, string> = {
  ouverte: 'Ouverte',
  en_attente_vendeur: 'Réponse du vendeur attendue',
  en_attente_client: 'Votre réponse est attendue',
  escaladee: 'Transmise à KatiMarket',
  en_arbitrage: 'En cours d’examen',
  resolue: 'Résolue',
  fermee: 'Fermée',
}

const AUTEURS: Record<string, string> = { client: 'Vous', vendeur: 'Le vendeur', equipe: 'KatiMarket' }

type Etat =
  | { phase: 'chargement' }
  | { phase: 'connexion' }
  | { phase: 'erreur'; message: string }
  | { phase: 'pret'; contextes: Contexte[]; tickets: Ticket[] }

export function CentreAssistance() {
  const { open: ouvrirCompte } = useAccount()
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [commandeId, setCommandeId] = useState('')
  const [sousCommandeId, setSousCommandeId] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreurFormulaire, setErreurFormulaire] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const charger = useCallback(async (signal?: AbortSignal) => {
    if (!apiDisponible) {
      setEtat({ phase: 'erreur', message: 'Le service d’assistance n’est pas configuré.' })
      return
    }
    try {
      const [contextes, tickets] = await Promise.all([
        api<Contexte[]>('/marketplace/demandes-client/contextes', { signal }),
        api<Ticket[]>('/marketplace/demandes-client', { signal }),
      ])
      if (!signal?.aborted) setEtat({ phase: 'pret', contextes, tickets })
    } catch (cause) {
      if (signal?.aborted) return
      if (cause instanceof ErreurApi && cause.code === 401) setEtat({ phase: 'connexion' })
      else setEtat({ phase: 'erreur', message: cause instanceof Error ? cause.message : 'L’assistance est momentanément indisponible.' })
    }
  }, [])

  useEffect(() => {
    const controleur = new AbortController()
    void charger(controleur.signal)
    return () => controleur.abort()
  }, [charger])

  const commande = useMemo(() => etat.phase === 'pret' ? etat.contextes.find((item) => item.id === commandeId) : undefined, [commandeId, etat])
  const sousCommande = useMemo(() => commande?.sousCommandes.find((item) => item.id === sousCommandeId), [commande, sousCommandeId])

  function choisirCommande(id: string) {
    setCommandeId(id)
    const prochaine = etat.phase === 'pret' ? etat.contextes.find((item) => item.id === id)?.sousCommandes[0]?.id ?? '' : ''
    setSousCommandeId(prochaine)
  }

  async function ouvrirTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commandeId || !sousCommandeId) return
    const donnees = new FormData(event.currentTarget)
    setEnvoi(true)
    setErreurFormulaire('')
    setConfirmation('')
    try {
      const ticket = await api<Ticket>('/marketplace/demandes-client', {
        methode: 'POST',
        corps: {
          commandeId,
          sousCommandeId,
          ...(donnees.get('ligneId') ? { ligneId: donnees.get('ligneId') } : {}),
          categorie: donnees.get('categorie'),
          objet: String(donnees.get('objet') ?? '').trim(),
          description: String(donnees.get('description') ?? '').trim(),
        },
      })
      setConfirmation(`Ticket ${ticket.reference} ouvert. Le vendeur et l’équipe KatiMarket peuvent maintenant vous répondre.`)
      setFormulaireOuvert(false)
      setCommandeId('')
      setSousCommandeId('')
      await charger()
    } catch (cause) {
      setErreurFormulaire(cause instanceof Error ? cause.message : 'Le ticket n’a pas pu être ouvert.')
    } finally {
      setEnvoi(false)
    }
  }

  async function repondre(ticket: Ticket, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formulaire = event.currentTarget
    const contenu = String(new FormData(formulaire).get('contenu') ?? '').trim()
    if (!contenu) return
    setErreurFormulaire('')
    try {
      await api(`/marketplace/demandes-client/${ticket.id}/messages`, { methode: 'POST', corps: { contenu } })
      formulaire.reset()
      setConfirmation(`Votre réponse au ticket ${ticket.reference} a été envoyée.`)
      await charger()
    } catch (cause) {
      setErreurFormulaire(cause instanceof Error ? cause.message : 'Votre réponse n’a pas pu être envoyée.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-band md:pt-12">
      <nav className="text-micro text-ink-3" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span aria-current="page">Assistance</span></nav>
      <header className="mt-5 grid gap-5 rounded-well bg-ink px-5 py-7 text-white md:grid-cols-[1fr_auto] md:items-end md:px-8">
        <div><p className="t-label text-white/60">Centre d’aide KatiMarket</p><h1 className="mt-2 text-h2 font-semibold">Comment pouvons-nous vous aider ?</h1><p className="mt-2 max-w-2xl text-small text-white/75">Ouvrez un ticket lié à votre commande et suivez chaque réponse au même endroit.</p></div>
        <button type="button" onClick={() => { setFormulaireOuvert((valeur) => !valeur); setErreurFormulaire('') }} className="min-h-12 rounded-control bg-secondary px-5 text-small font-bold text-on-surface transition-transform hover:-translate-y-0.5">{formulaireOuvert ? 'Fermer le formulaire' : 'Ouvrir un ticket'}</button>
      </header>

      {confirmation ? <p role="status" className="mt-5 rounded-control border border-primary bg-space px-4 py-3 text-small text-primary">{confirmation}</p> : null}
      {erreurFormulaire ? <p role="alert" className="mt-5 rounded-control border border-warn px-4 py-3 text-small text-warn">{erreurFormulaire}</p> : null}

      {etat.phase === 'chargement' ? <p role="status" className="mt-8 text-small text-ink-3">Chargement de vos demandes…</p> : null}
      {etat.phase === 'connexion' ? <section className="mt-8 rounded-well border border-rule bg-space p-5"><h2 className="text-h4 font-semibold">Connectez-vous pour contacter l’assistance</h2><p className="mt-2 text-small text-ink-3">Vos tickets seront rattachés à votre compte et à vos commandes.</p><button type="button" onClick={ouvrirCompte} className="mt-4 min-h-11 rounded-control bg-secondary px-5 text-small font-bold">Se connecter</button></section> : null}
      {etat.phase === 'erreur' ? <p role="alert" className="mt-8 rounded-well border border-warn p-4 text-small text-warn">{etat.message}</p> : null}

      {etat.phase === 'pret' && formulaireOuvert ? (
        <section className="mt-6 rounded-well border border-rule bg-paper p-5 shadow-[var(--shadow-panel)] md:p-7" aria-labelledby="nouveau-ticket">
          <div className="max-w-3xl"><p className="t-label text-secondary">Nouvelle demande</p><h2 id="nouveau-ticket" className="mt-1 text-h3 font-semibold">Dites-nous ce qui s’est passé</h2><p className="mt-2 text-small text-ink-3">La commande et la boutique permettent d’envoyer votre demande directement à la bonne équipe.</p></div>
          {etat.contextes.length === 0 ? <p className="mt-6 rounded-control bg-space p-4 text-small">Aucune commande marketplace ne peut être rattachée à un ticket pour le moment.</p> : (
            <form onSubmit={ouvrirTicket} aria-label="Ouvrir un ticket client" className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-small font-semibold">Motif<select name="categorie" required className="mt-2 min-h-12 w-full rounded-control border border-rule bg-paper px-3 font-normal">{MOTIFS.map(([valeur, libelle]) => <option value={valeur} key={valeur}>{libelle}</option>)}</select></label>
              <label className="text-small font-semibold">Commande<select required value={commandeId} onChange={(event) => choisirCommande(event.target.value)} className="mt-2 min-h-12 w-full rounded-control border border-rule bg-paper px-3 font-normal"><option value="">Choisir une commande</option>{etat.contextes.map((item) => <option value={item.id} key={item.id}>{item.reference} · {date(item.creeLe)}</option>)}</select></label>
              <label className="text-small font-semibold">Boutique / vendeur<select required value={sousCommandeId} disabled={!commande} onChange={(event) => setSousCommandeId(event.target.value)} className="mt-2 min-h-12 w-full rounded-control border border-rule bg-paper px-3 font-normal disabled:opacity-50"><option value="">Choisir la boutique concernée</option>{commande?.sousCommandes.map((item) => <option value={item.id} key={item.id}>{item.boutique.nom} · {item.reference}</option>)}</select></label>
              <label className="text-small font-semibold">Produit concerné <span className="font-normal text-ink-3">(facultatif)</span><select name="ligneId" disabled={!sousCommande} className="mt-2 min-h-12 w-full rounded-control border border-rule bg-paper px-3 font-normal disabled:opacity-50"><option value="">Toute la commande / boutique</option>{sousCommande?.lignes.map((item) => <option value={item.id} key={item.id}>{item.offreTitreCapture}</option>)}</select></label>
              <label className="text-small font-semibold md:col-span-2">Objet<input name="objet" required minLength={5} maxLength={180} placeholder="Ex. Je n’ai pas reçu le bon article" className="mt-2 min-h-12 w-full rounded-control border border-rule bg-paper px-3 font-normal" /></label>
              <label className="text-small font-semibold md:col-span-2">Décrivez le problème<textarea name="description" required minLength={10} maxLength={5000} rows={5} placeholder="Ajoutez les dates, les articles concernés et ce que vous attendez comme solution." className="mt-2 w-full rounded-control border border-rule bg-paper p-3 font-normal" /></label>
              <div className="md:col-span-2"><button disabled={envoi || !commandeId || !sousCommandeId} className="min-h-12 rounded-control bg-secondary px-6 text-small font-bold disabled:cursor-not-allowed disabled:opacity-50">{envoi ? 'Ouverture en cours…' : 'Envoyer ma demande'}</button><p className="mt-2 text-micro text-ink-3">Un numéro de ticket vous sera attribué immédiatement.</p></div>
            </form>
          )}
        </section>
      ) : null}

      {etat.phase === 'pret' ? (
        <section className="mt-10" aria-labelledby="mes-tickets">
          <div className="flex items-end justify-between gap-4"><div><p className="t-label text-ink-3">Suivi</p><h2 id="mes-tickets" className="mt-1 text-h3 font-semibold">Mes tickets</h2></div><span className="rounded-full bg-space px-3 py-1 text-micro font-semibold">{etat.tickets.length} dossier{etat.tickets.length > 1 ? 's' : ''}</span></div>
          {etat.tickets.length === 0 ? <div className="mt-5 rounded-well border border-dashed border-rule p-7 text-center"><p className="font-semibold">Vous n’avez aucun ticket ouvert.</p><p className="mt-1 text-small text-ink-3">Vos demandes et les réponses des vendeurs apparaîtront ici.</p></div> : <div className="mt-5 grid gap-4">{etat.tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onRepondre={repondre} />)}</div>}
        </section>
      ) : null}
    </main>
  )
}

function TicketCard({ ticket, onRepondre }: { ticket: Ticket; onRepondre: (ticket: Ticket, event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const attenteClient = ticket.statut === 'en_attente_client'
  return <details className="group rounded-well border border-rule bg-paper open:shadow-[var(--shadow-panel)]">
    <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
      <span className="min-w-0"><span className="block font-semibold text-ink">{ticket.objet}</span><span className="mt-1 block text-micro text-ink-3">{ticket.reference} · {ticket.commande.reference} · {ticket.boutique.nom}</span></span>
      <span className={`w-fit rounded-full border px-3 py-1 text-micro font-semibold ${attenteClient ? 'border-secondary bg-secondary/10 text-ink' : 'border-rule text-primary'}`}>{STATUTS[ticket.statut] ?? ticket.statut.replaceAll('_', ' ')}</span>
    </summary>
    <div className="border-t border-rule px-5 py-5">
      <p className="text-micro text-ink-3">Motif : {MOTIFS.find(([valeur]) => valeur === ticket.categorie)?.[1] ?? ticket.categorie} · Ouvert le {date(ticket.creeLe)}</p>
      <ol className="mt-4 grid gap-3" aria-label={`Échanges du ticket ${ticket.reference}`}>{ticket.messages.map((message) => <li key={message.id} className={`max-w-[90%] rounded-control p-3 text-small ${message.auteurType === 'client' ? 'ml-auto bg-space' : 'border border-rule'}`}><p className="flex flex-wrap justify-between gap-2"><b>{AUTEURS[message.auteurType] ?? 'Intervenant'}</b><time className="text-micro text-ink-3" dateTime={message.creeLe}>{date(message.creeLe)}</time></p><p className="mt-1 whitespace-pre-line break-words">{message.contenu}</p></li>)}</ol>
      {ticket.capacites.repondre ? <form onSubmit={(event) => void onRepondre(ticket, event)} className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor={`reponse-${ticket.id}`}>Répondre au ticket {ticket.reference}</label><textarea id={`reponse-${ticket.id}`} name="contenu" required minLength={2} rows={2} placeholder="Écrire une réponse…" className="min-h-12 flex-1 rounded-control border border-rule p-3 text-small"/><button className="min-h-12 rounded-control bg-ink px-5 text-small font-bold text-white">Envoyer</button></form> : null}
    </div>
  </details>
}

function date(valeur: string) {
  const instant = new Date(valeur)
  return Number.isNaN(instant.getTime()) ? 'date inconnue' : new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(instant)
}
