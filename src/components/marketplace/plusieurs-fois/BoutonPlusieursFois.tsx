'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { api, apiDisponible } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import type { EligibiliteEchelonnement } from '@/lib/paiement-plusieurs-fois'

/**
 * « PAYER EN PLUSIEURS FOIS » SUR LA FICHE PRODUIT. Rien ne s'affiche tant que
 * l'offre n'est pas eligible : mode ouvert, categorie autorisee, boutique
 * d'accord, prix suffisant. Le premier versement minimum vient du serveur.
 */
export function BoutonPlusieursFois({ offreId, quantite, nom, className }: { offreId: string; quantite: number; nom: string; className?: string }) {
  const cle = `${offreId}:${quantite}`
  const [lu, setLu] = useState<{ cle: string; valeur: EligibiliteEchelonnement } | null>(null)
  useEffect(() => {
    if (!apiDisponible) return
    let actif = true
    api<EligibiliteEchelonnement>(`/marketplace/echelonnement/offres/${encodeURIComponent(offreId)}?quantite=${quantite}`, { anonyme: true })
      .then((valeur) => { if (actif) setLu({ cle, valeur }) })
      .catch(() => { if (actif) setLu({ cle, valeur: { eligible: false } }) })
    return () => { actif = false }
  }, [offreId, quantite, cle])
  const eligibilite = lu?.cle === cle ? lu.valeur : null
  if (!eligibilite?.eligible || !eligibilite.premierVersementMinFcfa || !eligibilite.dureeMaxJours) return null
  const mois = Math.floor(eligibilite.dureeMaxJours / 30)
  const href = `/paiement-plusieurs-fois/nouveau?offre=${encodeURIComponent(offreId)}&quantite=${quantite}&nom=${encodeURIComponent(nom)}`
  return <Link href={href} className={className} data-testid="payer-plusieurs-fois">
    <b>Payer en plusieurs fois</b>
    <small>Dès {formatPrice(eligibilite.premierVersementMinFcfa)} aujourd’hui, jusqu’à {mois >= 1 ? `${mois} mois` : `${eligibilite.dureeMaxJours} jours`} · livré une fois payé</small>
  </Link>
}
