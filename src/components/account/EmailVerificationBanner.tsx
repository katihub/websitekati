'use client'

import { useEffect, useState } from 'react'

import { useSession } from '@/lib/session'
import {
  confirmerCodeCourriel,
  envoyerVerificationCourriel,
  statutVerificationCourriel,
  type StatutVerificationCourriel,
} from '@/lib/verification-courriel'
import styles from './EmailVerificationBanner.module.css'

export function EmailVerificationBanner() {
  const { session, chargement } = useSession()
  const [statut, setStatut] = useState<StatutVerificationCourriel | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (chargement || !session) return
    let vivant = true
    void statutVerificationCourriel()
      .then((valeur) => { if (vivant) setStatut(valeur) })
      .catch(() => undefined)
    return () => { vivant = false }
  }, [chargement, session])

  if (!session || !statut || statut.verifie) return null

  const envoyer = async () => {
    setPending(true); setMessage('')
    try {
      const valeur = await envoyerVerificationCourriel()
      setStatut(valeur)
      setMessage(`Code envoyé à ${valeur.courriel ?? 'votre adresse'}.`)
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Envoi impossible.') }
    finally { setPending(false) }
  }
  const confirmer = async () => {
    if (!/^\d{6}$/.test(code)) return setMessage('Saisissez les 6 chiffres du code.')
    setPending(true); setMessage('')
    try {
      const valeur = await confirmerCodeCourriel(code)
      setStatut(valeur)
      setMessage('Adresse confirmée. Vos KATI pourront maintenant être débloqués.')
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Code incorrect.') }
    finally { setPending(false) }
  }

  return <aside className={styles.banner} aria-live="polite">
    <p><strong>Débloquez vos KATI.</strong> Confirmez votre adresse e-mail ; vous pouvez continuer à commander normalement.</p>
    <div className={styles.actions}>
      <button type="button" onClick={() => void envoyer()} disabled={pending}>{statut.envoyeLe ? 'Renvoyer le code' : 'Envoyer le code'}</button>
      <input className={styles.code} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code de confirmation à 6 chiffres" />
      <button type="button" onClick={() => void confirmer()} disabled={pending || code.length !== 6}>Confirmer</button>
    </div>
    {message ? <span className={styles.message}>{message}</span> : null}
  </aside>
}
