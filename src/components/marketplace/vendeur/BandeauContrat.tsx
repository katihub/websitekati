'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { api, ErreurApi } from '@/lib/api'
import styles from '@/app/espace-vendeur/seller-workspace.module.css'

type EtatContrat = { aLire: boolean; version: { numero: number; publieLe: string; resume: string | null } | null }

/**
 * LE CONTRAT VENDEUR A CHANGE. Apres un changement important publie par
 * KatiMarket, la boutique le lit et confirme en avoir pris connaissance. Rien
 * n'est bloque : le bandeau reste jusqu'a la confirmation.
 */
export function BandeauContrat({ shopId }: { shopId: string }) {
  const [etat, setEtat] = useState<EtatContrat | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    const controleur = new AbortController()
    api<EtatContrat>(`/contenus/boutiques/${shopId}/contrat-vendeur`, { signal: controleur.signal })
      .then((valeur) => { if (!controleur.signal.aborted) setEtat(valeur) })
      .catch(() => { if (!controleur.signal.aborted) setEtat(null) })
    return () => controleur.abort()
  }, [shopId])

  if (!etat?.aLire || !etat.version) return null
  const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(etat.version.publieLe))

  async function confirmer() {
    setEnvoi(true); setErreur('')
    try {
      setEtat(await api<EtatContrat>(`/contenus/boutiques/${shopId}/contrat-vendeur/lu`, { methode: 'POST' }))
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'La confirmation n’a pas pu être enregistrée.')
    } finally {
      setEnvoi(false)
    }
  }

  return <div className={styles.bandeauContrat} role="status" data-testid="bandeau-contrat">
    <div>
      <strong>Le contrat vendeur a changé</strong>
      <p>La version {etat.version.numero} s’applique depuis le {date}.{etat.version.resume ? ` Ce qui change : ${etat.version.resume}` : ''}</p>
      {erreur ? <p role="alert">{erreur}</p> : null}
    </div>
    <div>
      <Link href="/contrat-vendeurs" target="_blank">Lire le contrat</Link>
      <button type="button" disabled={envoi} onClick={() => void confirmer()} data-testid="contrat-lu">{envoi ? 'Enregistrement…' : 'J’ai pris connaissance'}</button>
    </div>
  </div>
}
