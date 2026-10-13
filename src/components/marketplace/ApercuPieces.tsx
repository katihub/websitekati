'use client'

import { useEffect, useMemo } from 'react'

/**
 * CE QUI VA PARTIR, VU AVANT DE PARTIR.
 *
 * Une preuve de litige ne se retire pas : elle est horodatee, empreintee et
 * gardee au dossier. Le client et le vendeur voient donc chaque fichier — la
 * photo elle-meme, pas seulement son nom — et les fichiers que le serveur
 * refuserait sont ecartes ici, avec la raison, avant tout envoi.
 *
 * Les limites sont celles du backend : PDF, JPEG, PNG ou WebP, 10 Mio par
 * fichier, 5 fichiers par message.
 */

export const TYPES_PIECES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export const TAILLE_MAX_PIECE = 10 * 1024 * 1024
export const PIECES_MAX_PAR_MESSAGE = 5

export interface VerificationPieces {
  acceptees: File[]
  refus: Array<{ nom: string; raison: string }>
}

export function verifierPieces(fichiers: File[]): VerificationPieces {
  const acceptees: File[] = []
  const refus: VerificationPieces['refus'] = []
  for (const fichier of fichiers) {
    if (!(TYPES_PIECES as readonly string[]).includes(fichier.type)) refus.push({ nom: fichier.name, raison: 'format non accepté' })
    else if (fichier.size > TAILLE_MAX_PIECE) refus.push({ nom: fichier.name, raison: 'plus de 10 Mio' })
    else if (acceptees.length >= PIECES_MAX_PAR_MESSAGE) refus.push({ nom: fichier.name, raison: 'au-delà de 5 fichiers' })
    else acceptees.push(fichier)
  }
  return { acceptees, refus }
}

export function taillePiece(octets: number) {
  return octets >= 1024 * 1024 ? `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mio` : `${Math.max(1, Math.ceil(octets / 1024))} Ko`
}

export function ApercuPieces({ verification }: { verification: VerificationPieces }) {
  const urls = useMemo(
    () => verification.acceptees.map((fichier) => (fichier.type.startsWith('image/') ? URL.createObjectURL(fichier) : null)),
    [verification.acceptees],
  )
  useEffect(() => () => urls.forEach((url) => url && URL.revokeObjectURL(url)), [urls])

  return (
    <div className="grid gap-3">
      {verification.acceptees.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Pièces prêtes à l’envoi">
          {verification.acceptees.map((fichier, index) => (
            <li key={`${fichier.name}-${index}`} className="overflow-hidden rounded-control border border-rule">
              {urls[index]
                // Une URL `blob:` locale : next/image n'a rien a optimiser ni a servir.
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={urls[index]!} alt={`Aperçu de ${fichier.name}`} className="aspect-square w-full bg-space object-cover" />
                : <div className="grid aspect-square place-items-center bg-space text-small font-bold text-ink-3" aria-hidden="true">PDF</div>}
              <p className="truncate px-2 pt-1 text-micro font-semibold" title={fichier.name}>{fichier.name}</p>
              <p className="px-2 pb-2 text-micro text-ink-3">{taillePiece(fichier.size)}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-small text-ink-3">Aucun fichier valide sélectionné.</p>}
      {verification.refus.length ? (
        <ul className="rounded-control border border-warn p-3 text-small text-warn" aria-label="Fichiers écartés">
          {verification.refus.map((refus, index) => <li key={`${refus.nom}-${index}`}>{refus.nom} : {refus.raison}</li>)}
        </ul>
      ) : null}
    </div>
  )
}
