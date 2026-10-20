'use client'

import { useRef, useState, type FormEvent } from 'react'

import { ErreurApi, api } from '@/lib/api'
import { formatKati } from '@/lib/kati'
import { estCodeParrainage, normaliserCode } from '@/lib/parrainage'
import styles from './kati.module.css'

type Destinataire = { code: string; nom: string }
type ResultatTransfert = { id: string; points: number; destinataire: Destinataire; soldes: { disponible: number; enAttente: number; reserve: number }; dejaEffectue: boolean }

export function TransfertKati({ disponible, onTransfert }: { disponible: number; onTransfert: () => Promise<void> }) {
  const [code, setCode] = useState('')
  const [points, setPoints] = useState('')
  const [destinataire, setDestinataire] = useState<Destinataire | null>(null)
  const [phase, setPhase] = useState<'repos' | 'verification' | 'envoi'>('repos')
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const requete = useRef<{ corps: string; cle: string } | null>(null)
  const montant = Number(points)
  const montantValide = Number.isSafeInteger(montant) && montant > 0 && montant <= disponible

  async function verifier() {
    if (!estCodeParrainage(code)) return
    setPhase('verification'); setMessage(null); setDestinataire(null)
    try {
      setDestinataire(await api<Destinataire>(`/marketplace/kati/transferts/destinataires/${encodeURIComponent(code)}`))
    } catch (cause) {
      setMessage({ type: 'erreur', texte: cause instanceof ErreurApi ? cause.message : 'Le destinataire n’a pas pu être vérifié.' })
    } finally { setPhase('repos') }
  }

  async function envoyer(event: FormEvent) {
    event.preventDefault()
    if (!destinataire || !montantValide) return
    setPhase('envoi'); setMessage(null)
    try {
      const corps = JSON.stringify({ code: destinataire.code, points: montant })
      if (!requete.current || requete.current.corps !== corps) requete.current = { corps, cle: crypto.randomUUID() }
      const resultat = await api<ResultatTransfert>('/marketplace/kati/transferts', { methode: 'POST', corps: { code: destinataire.code, points: montant, cle: requete.current.cle } })
      setMessage({ type: 'succes', texte: `${formatKati(resultat.points)} ont bien été envoyés à ${resultat.destinataire.nom}.` })
      setCode(''); setPoints(''); setDestinataire(null)
      requete.current = null
      await onTransfert()
    } catch (cause) {
      setMessage({ type: 'erreur', texte: cause instanceof ErreurApi ? cause.message : 'Le transfert n’a pas pu être effectué.' })
    } finally { setPhase('repos') }
  }

  return <section className={styles.transferCard} aria-labelledby="transfert-kati-titre">
    <header><span className={styles.transferIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3 3m-3-3 3-3"/></svg></span><div><h2 id="transfert-kati-titre">Envoyer des KATI</h2><p>Transférez vos KATI disponibles à un autre utilisateur KatiMarket.</p></div></header>
    <p className={styles.transferBalance}><span>Disponible</span><strong>{formatKati(disponible)}</strong></p>
    <form onSubmit={(event) => void envoyer(event)} className={styles.transferForm}>
      <label>Code KATI du destinataire<span className={styles.codeRow}><input value={code} onChange={(event) => { setCode(normaliserCode(event.currentTarget.value)); setDestinataire(null); setMessage(null) }} minLength={8} maxLength={8} pattern="[A-Z]{2}[0-9]{6}" placeholder="AM482731" autoComplete="off"/><button type="button" onClick={() => void verifier()} disabled={!estCodeParrainage(code) || phase !== 'repos'}>{phase === 'verification' ? 'Vérification…' : 'Vérifier'}</button></span></label>
      {destinataire ? <div className={styles.recipient} role="status"><span aria-hidden="true">✓</span><p><small>Destinataire confirmé</small><strong>{destinataire.nom}</strong><b>{destinataire.code}</b></p></div> : null}
      <label>Montant à envoyer<span className={styles.amountField}><input type="number" inputMode="numeric" min={1} max={disponible} step={1} value={points} onChange={(event) => { setPoints(event.currentTarget.value); setMessage(null) }} placeholder="Ex. 10 000"/><b>KATI</b></span></label>
      {points && !montantValide ? <p className={styles.transferError} role="alert">Saisissez un montant entier compris entre 1 et {new Intl.NumberFormat('fr-FR').format(disponible)} KATI.</p> : null}
      <button className={styles.transferSubmit} type="submit" disabled={!destinataire || !montantValide || phase !== 'repos'}>{phase === 'envoi' ? 'Envoi en cours…' : 'Confirmer le transfert'}</button>
      <small className={styles.transferNote}>Le transfert est immédiat. Vérifiez le nom du destinataire avant de confirmer.</small>
    </form>
    {message ? <p className={message.type === 'erreur' ? styles.transferError : styles.transferSuccess} role={message.type === 'erreur' ? 'alert' : 'status'}>{message.texte}</p> : null}
  </section>
}
