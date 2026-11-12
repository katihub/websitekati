'use client'

import { useEffect, useRef } from 'react'

import styles from './message-retour.module.css'

/**
 * LE RETOUR D'UN ENVOI, LISIBLE D'UN COUP D'OEIL (13 novembre 2026).
 *
 * Succes et echec s'affichaient dans le meme texte gris : « Indiquez la
 * reference de chaque variante » ressemblait a « Produit envoye ». Une erreur
 * est desormais un bandeau rouge, annonce aux lecteurs d'ecran, et la page
 * defile jusqu'a lui ; un succes, un bandeau vert.
 */
export type Retour = { type: 'succes' | 'erreur'; texte: string } | null

export const erreur = (texte: string): Retour => ({ type: 'erreur', texte })
export const succes = (texte: string): Retour => ({ type: 'succes', texte })

export function MessageRetour({ retour, className }: { retour: Retour; className?: string }) {
  const element = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (retour?.type === 'erreur') element.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [retour])
  if (!retour) return null
  const echec = retour.type === 'erreur'
  return <p
    ref={element}
    role={echec ? 'alert' : 'status'}
    className={`${echec ? styles.erreur : styles.succes} ${className ?? ''}`}
    data-testid={echec ? 'message-erreur' : 'message-succes'}
  >
    <span aria-hidden="true">{echec ? '⚠' : '✓'}</span>
    <span>{retour.texte}</span>
  </p>
}
