'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'

import { api, apiDisponible, enteteAutorisation, ErreurApi } from '@/lib/api'
import { ShopIcon } from './ShopIcon'
import styles from './avis-boutique.module.css'

/**
 * LES AVIS DES CLIENTS SUR UNE BOUTIQUE, ET LE FORMULAIRE POUR EN DONNER UN.
 *
 * Seuls les acheteurs verifies ecrivent : un client connecte choisit l'un de
 * ses achats livres par cette boutique qui n'a pas encore d'avis. Les autres
 * lisent, et savent pourquoi ils ne peuvent pas ecrire. L'auteur est montre par
 * son prenom, l'initiale de son nom et sa ville.
 */

type Note = 1 | 2 | 3 | 4 | 5
export type AvisPublic = {
  id: string
  note: number
  commentaire: string | null
  creeLe: string
  achatVerifie: boolean
  auteur: string
  ville: string | null
  reponse: { contenu: string; creeLe: string } | null
}
export type ListeAvis = { total: number; moyenne: number | null; repartition: Record<Note, number>; page: number; taille: number; avis: AvisPublic[] }
type Achat = { id: string; offreTitreCapture: string; quantite: number; sousCommande: { reference: string; livreeLe: string | null } }
type Session = 'inconnue' | 'anonyme' | 'connectee'

const TAILLE = 5
const date = (valeur: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(valeur))
const LIBELLES_NOTE: Record<Note, string> = { 1: 'Très décevant', 2: 'Décevant', 3: 'Correct', 4: 'Bien', 5: 'Excellent' }

function Etoiles({ note, taille = 'petite' }: { note: number; taille?: 'petite' | 'grande' }) {
  return <span className={styles.etoiles} data-taille={taille} role="img" aria-label={`${note.toLocaleString('fr-FR')} sur 5`}>
    {[1, 2, 3, 4, 5].map(i => <span key={i} aria-hidden="true" data-pleine={i <= Math.round(note)}>★</span>)}
  </span>
}

export function AvisBoutique({ slug, nom }: { slug: string; nom: string }) {
  const [liste, setListe] = useState<ListeAvis | null>(null)
  const [page, setPage] = useState(1)
  const [erreur, setErreur] = useState('')
  const [session, setSession] = useState<Session>('inconnue')
  const [achats, setAchats] = useState<Achat[]>([])

  const charger = useCallback(async (prochaine: number) => {
    try {
      const resultat = await api<ListeAvis>(`/marketplace/reputation/boutiques/${encodeURIComponent(slug)}/avis?page=${prochaine}&taille=${TAILLE}`, { anonyme: true })
      setListe(actuelle => prochaine > 1 && actuelle ? { ...resultat, avis: [...actuelle.avis, ...resultat.avis] } : resultat)
      setPage(prochaine)
      setErreur('')
    } catch {
      setErreur('Les avis ne peuvent pas être chargés pour le moment.')
    }
  }, [slug])

  const chargerAchats = useCallback(async () => {
    const connecte = apiDisponible && Object.keys(await enteteAutorisation()).length > 0
    setSession(connecte ? 'connectee' : 'anonyme')
    if (!connecte) return
    try {
      setAchats(await api<Achat[]>(`/marketplace/reputation/boutiques/${encodeURIComponent(slug)}/achats-evaluables`))
    } catch {
      setAchats([])
    }
  }, [slug])

  useEffect(() => {
    const minuterie = window.setTimeout(() => { void charger(1); void chargerAchats() }, 0)
    return () => window.clearTimeout(minuterie)
  }, [charger, chargerAchats])

  async function publie() {
    await Promise.all([charger(1), chargerAchats()])
  }

  return <section className={styles.section} aria-labelledby="avis-boutique-titre" id="avis">
    <header className={styles.entete}>
      <h2 id="avis-boutique-titre"><ShopIcon name="star" />Avis des clients</h2>
      {liste?.total ? <p>{liste.total} avis vérifié{liste.total > 1 ? 's' : ''}</p> : null}
    </header>

    <div className={styles.grille}>
      <div className={styles.colonne}>
        <Synthese liste={liste} />
        <Ecrire slug={slug} nom={nom} session={session} achats={achats} onPublie={publie} />
      </div>

      <div className={styles.colonne}>
        {erreur ? <p className={styles.alerte} role="alert">{erreur}</p> : null}
        {!liste && !erreur ? <p className={styles.vide} role="status">Chargement des avis…</p> : null}
        {liste && !liste.avis.length ? <p className={styles.vide}>Aucun avis pour le moment. Les clients qui ont reçu une commande de {nom} pourront donner le leur ici.</p> : null}
        {liste?.avis.length ? <ol className={styles.liste}>
          {liste.avis.map(avis => <li key={avis.id} className={styles.avis} data-testid="avis-boutique">
            <div className={styles.avisTete}>
              <Etoiles note={avis.note} />
              <strong>{avis.auteur}</strong>
              {avis.ville ? <span>{avis.ville}</span> : null}
              <time dateTime={avis.creeLe}>{date(avis.creeLe)}</time>
            </div>
            {avis.achatVerifie ? <p className={styles.verifie}><ShopIcon name="check" />Achat vérifié</p> : null}
            {avis.commentaire ? <p className={styles.commentaire}>{avis.commentaire}</p> : null}
            {avis.reponse ? <div className={styles.reponse}><b>Réponse de la boutique</b><p>{avis.reponse.contenu}</p></div> : null}
          </li>)}
        </ol> : null}
        {liste && liste.avis.length < liste.total ? <button type="button" className={styles.plus} onClick={() => void charger(page + 1)}>Afficher plus d’avis</button> : null}
      </div>
    </div>
  </section>
}

function Synthese({ liste }: { liste: ListeAvis | null }) {
  if (!liste?.total || liste.moyenne === null) return null
  return <div className={styles.synthese}>
    <p className={styles.moyenne}><strong>{liste.moyenne.toLocaleString('fr-FR')}</strong><span>/ 5</span></p>
    <Etoiles note={liste.moyenne} taille="grande" />
    <ul aria-label="Répartition des notes">
      {([5, 4, 3, 2, 1] as Note[]).map(note => {
        const nombre = liste.repartition[note] ?? 0
        return <li key={note}><span>{note} ★</span><span className={styles.barre}><i style={{ width: `${(nombre / liste.total) * 100}%` }} /></span><span>{nombre}</span></li>
      })}
    </ul>
  </div>
}

function Ecrire({ slug, nom, session, achats, onPublie }: { slug: string; nom: string; session: Session; achats: Achat[]; onPublie: () => Promise<void> }) {
  const id = useId()
  const [ligneId, setLigneId] = useState('')
  const [note, setNote] = useState<Note | 0>(0)
  const [commentaire, setCommentaire] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const achat = ligneId || achats[0]?.id || ''

  async function envoyer(event: FormEvent) {
    event.preventDefault()
    if (!note) return setMessage({ type: 'erreur', texte: 'Choisissez une note de 1 à 5 étoiles.' })
    const texte = commentaire.trim()
    if (texte && texte.length < 2) return setMessage({ type: 'erreur', texte: 'Votre commentaire est trop court.' })
    setEnvoi(true); setMessage(null)
    try {
      await api('/marketplace/reputation/avis', { methode: 'POST', corps: { ligneId: achat, dimension: 'vendeur', note, commentaire: texte || undefined } })
      setNote(0); setCommentaire(''); setLigneId('')
      setMessage({ type: 'succes', texte: 'Merci ! Votre avis est publié.' })
      await onPublie()
    } catch (cause) {
      setMessage({ type: 'erreur', texte: cause instanceof ErreurApi || cause instanceof Error ? cause.message : 'Votre avis n’a pas pu être publié.' })
    } finally { setEnvoi(false) }
  }

  if (session === 'inconnue') return null
  if (session === 'anonyme') return <div className={styles.invitation}>
    <h3>Vous avez acheté dans cette boutique ?</h3>
    <p>Connectez-vous pour partager votre expérience avec {nom}.</p>
    <Link href={`/connexion?retour=${encodeURIComponent(`/boutiques/${slug}#avis`)}`} className={styles.bouton}>Se connecter pour donner un avis</Link>
  </div>
  if (!achats.length) return <div className={styles.invitation}>
    {message?.type === 'succes' ? <p className={styles.succes} role="status">{message.texte}</p> : null}
    <h3>Donner votre avis</h3>
    <p>Vous pourrez évaluer {nom} dès qu’une de vos commandes chez elle vous aura été livrée. Chaque achat livré compte pour un avis.</p>
  </div>

  return <form className={styles.formulaire} onSubmit={event => void envoyer(event)} aria-labelledby={`${id}-titre`}>
    <h3 id={`${id}-titre`}>Donner votre avis sur {nom}</h3>
    {achats.length > 1 ? <label>Votre achat
      <select value={achat} onChange={event => setLigneId(event.target.value)}>
        {achats.map(a => <option key={a.id} value={a.id}>{a.offreTitreCapture} · {a.sousCommande.reference}</option>)}
      </select>
    </label> : <p className={styles.achat}>Pour votre achat : <b>{achats[0]!.offreTitreCapture}</b> ({achats[0]!.sousCommande.reference})</p>}
    <fieldset className={styles.notes}>
      <legend>Votre note</legend>
      <div>{([1, 2, 3, 4, 5] as Note[]).map(valeur => <label key={valeur} title={LIBELLES_NOTE[valeur]} data-active={valeur <= note}>
        <input type="radio" name={`${id}-note`} value={valeur} checked={note === valeur} onChange={() => setNote(valeur)} className="sr-only" />
        <span aria-hidden="true">★</span><span className="sr-only">{valeur} étoile{valeur > 1 ? 's' : ''} — {LIBELLES_NOTE[valeur]}</span>
      </label>)}</div>
      <small aria-live="polite">{note ? LIBELLES_NOTE[note] : 'Touchez une étoile'}</small>
    </fieldset>
    <label>Votre commentaire <span>(facultatif)</span>
      <textarea rows={4} maxLength={3000} value={commentaire} onChange={event => setCommentaire(event.target.value)} placeholder="Qualité des produits, accueil, respect des délais…" />
    </label>
    {message ? <p className={message.type === 'succes' ? styles.succes : styles.alerte} role={message.type === 'succes' ? 'status' : 'alert'}>{message.texte}</p> : null}
    <button type="submit" className={styles.bouton} disabled={envoi}>{envoi ? 'Publication…' : 'Publier mon avis'}</button>
    <p className={styles.mention}>Votre prénom, l’initiale de votre nom et votre ville apparaîtront avec votre avis.</p>
  </form>
}
