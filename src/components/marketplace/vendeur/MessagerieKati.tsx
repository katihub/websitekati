'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { ErreurApi, api } from '@/lib/api'
import styles from '@/app/espace-vendeur/seller-workspace.module.css'
import fil from './messagerie-kati.module.css'

/**
 * LA MESSAGERIE DIRECTE AVEC L'EQUIPE KATI.
 *
 * Une conversation par sujet, entre la boutique et l'equipe (la direction ou
 * le point focal de la boutique) : pas d'assistant, chaque reponse est signee
 * par la personne qui l'ecrit. Le fil ouvert se relit toutes les 20 secondes ;
 * ecrire sur une conversation resolue la rouvre.
 */
type Statut = 'ouverte' | 'resolue'
type Conversation = { id: string; sujet: string; statut: Statut; dernierMessageLe: string; nonLus: number }
type Message = { id: string; auteurType: 'vendeur' | 'equipe'; auteurNom: string; contenu: string; creeLe: string }
type Fil = Omit<Conversation, 'nonLus'> & { messages: Message[] }

const RAFRAICHISSEMENT_MS = 20_000
const date = (iso: string) => new Intl.DateTimeFormat('fr-CM', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const erreur = (e: unknown, repli: string) => (e instanceof ErreurApi ? e.message : repli)

export function MessagerieKati({ shopId }: { shopId: string }) {
  const base = `/messagerie-vendeurs/boutiques/${shopId}`
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [ouverte, setOuverte] = useState<string | 'nouvelle' | null>(null)
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    try { setConversations(await api<Conversation[]>(base)) }
    catch (e) { setMessage(erreur(e, 'Vos conversations n’ont pas pu être chargées.')); setConversations([]) }
  }, [base])

  useEffect(() => {
    const minuterie = window.setTimeout(() => void charger(), 0)
    return () => window.clearTimeout(minuterie)
  }, [charger])
  // Stable : le fil le rappelle a chaque lecture ; une fonction neuve a chaque rendu le relancerait sans fin.
  const relu = useCallback(() => void charger(), [charger])

  const aTraiter = conversations?.filter((c) => c.nonLus > 0).length ?? 0
  return <div className={styles.featureGrid} data-testid="messagerie-kati">
    <section className={styles.featureList}>
      <header><h2>Vos échanges avec l’équipe KATI</h2><span>{conversations ? `${conversations.length} conversation(s) · ${aTraiter} non lue(s)` : 'Chargement…'}</span></header>
      <button type="button" className={fil.nouvelle} onClick={() => setOuverte('nouvelle')} data-testid="messagerie-nouvelle">Nouvelle conversation</button>
      {message ? <p className={styles.feedback} role="status">{message}</p> : null}
      {conversations && !conversations.length ? <p className={styles.blank}>Aucune conversation pour le moment. Une question sur vos commandes, vos reversements ou votre catalogue ? Écrivez à l’équipe KATI.</p> : null}
      {conversations?.length ? <ul>{conversations.map((c) => <li key={c.id}>
        <button type="button" className={fil.ligne} aria-current={ouverte === c.id} onClick={() => setOuverte(c.id)} data-testid={`messagerie-conversation-${c.id}`}>
          <strong>{c.sujet}</strong>
          <small>{date(c.dernierMessageLe)} · {c.statut === 'resolue' ? 'Résolue' : 'Ouverte'}</small>
        </button>
        {c.nonLus ? <b className={fil.pastille} aria-label={`${c.nonLus} message(s) non lu(s)`}>{c.nonLus}</b> : null}
      </li>)}</ul> : null}
    </section>

    <section className={styles.actionPanel}>
      {ouverte === 'nouvelle'
        ? <NouvelleConversation base={base} onOuverte={(id) => { setOuverte(id); void charger() }} />
        : ouverte ? <FilConversation key={ouverte} url={`${base}/${ouverte}`} onLu={relu} />
        : <p>Choisissez une conversation, ou ouvrez-en une nouvelle : l’équipe KATI vous répond ici.</p>}
    </section>
  </div>
}

function NouvelleConversation({ base, onOuverte }: { base: string; onOuverte: (id: string) => void }) {
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const donnees = new FormData(event.currentTarget)
    setEnvoi(true); setMessage('')
    try {
      const { id } = await api<{ id: string }>(base, { methode: 'POST', corps: { sujet: String(donnees.get('sujet') ?? '').trim(), contenu: String(donnees.get('contenu') ?? '').trim() } })
      onOuverte(id)
    } catch (e) { setMessage(erreur(e, 'Le message n’a pas pu être envoyé. Réessayez.')) }
    finally { setEnvoi(false) }
  }

  return <>
    <h2>Écrire à l’équipe KATI</h2>
    <p>La direction ou le point focal de votre boutique vous répond dans cette conversation.</p>
    <form onSubmit={envoyer}>
      <label>Sujet<input name="sujet" required minLength={3} maxLength={180} placeholder="Ex. Reversement de septembre" data-testid="messagerie-sujet" /></label>
      <label>Message<textarea name="contenu" required maxLength={4000} rows={6} data-testid="messagerie-contenu" /></label>
      {message ? <p className={styles.feedback} role="alert">{message}</p> : null}
      <button type="submit" disabled={envoi} data-testid="messagerie-envoyer">{envoi ? 'Envoi…' : 'Envoyer'}</button>
    </form>
  </>
}

function FilConversation({ url, onLu }: { url: string; onLu: () => void }) {
  const [donnees, setDonnees] = useState<Fil | null>(null)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')

  const relire = useCallback(async () => {
    try { setDonnees(await api<Fil>(url)); onLu() }
    catch (e) { setMessage(erreur(e, 'La conversation n’a pas pu être chargée.')) }
  }, [url, onLu])

  useEffect(() => {
    const premiere = window.setTimeout(() => void relire(), 0)
    const intervalle = window.setInterval(() => void relire(), RAFRAICHISSEMENT_MS)
    return () => { window.clearTimeout(premiere); window.clearInterval(intervalle) }
  }, [relire])

  async function repondre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const contenu = texte.trim()
    if (!contenu || envoi) return
    setEnvoi(true); setMessage('')
    try { setDonnees(await api<Fil>(`${url}/messages`, { methode: 'POST', corps: { contenu } })); setTexte(''); onLu() }
    catch (e) { setMessage(erreur(e, 'Le message n’a pas pu être envoyé. Réessayez.')) }
    finally { setEnvoi(false) }
  }

  if (!donnees) return <p>{message || 'Chargement de la conversation…'}</p>
  return <>
    <h2>{donnees.sujet}</h2>
    <p>{donnees.statut === 'resolue' ? 'L’équipe a marqué cette conversation résolue. Écrire la rouvre.' : 'L’équipe KATI vous répond ici.'}</p>
    <ol className={fil.messages} data-testid="messagerie-fil">
      {donnees.messages.map((m) => <li key={m.id} data-auteur={m.auteurType}>
        <b>{m.auteurType === 'equipe' ? `${m.auteurNom} · équipe KATI` : m.auteurNom}</b>
        <span>{m.contenu}</span>
        <small>{date(m.creeLe)}</small>
      </li>)}
    </ol>
    <form onSubmit={repondre}>
      <label>Votre réponse<textarea value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={4000} rows={4} data-testid="messagerie-reponse" /></label>
      {message ? <p className={styles.feedback} role="alert">{message}</p> : null}
      <button type="submit" disabled={envoi || !texte.trim()} data-testid="messagerie-repondre">{envoi ? 'Envoi…' : 'Envoyer'}</button>
    </form>
  </>
}
