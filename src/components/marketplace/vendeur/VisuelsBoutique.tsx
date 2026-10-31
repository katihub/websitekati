'use client'

/* eslint-disable @next/next/no-img-element -- l'aperçu montre le fichier tel qu'il vient d'être déposé, avant le CDN d'images */
import { useRef, useState } from 'react'

import { api, ErreurApi } from '@/lib/api'
import styles from '@/app/espace-vendeur/seller-workspace.module.css'

/**
 * LE LOGO ET LA BANNIÈRE DE LA BOUTIQUE.
 *
 * Publiés sans modération : ils apparaissent sur la liste des boutiques, sur la
 * page de la boutique et à l'accueil dès l'envoi. Le serveur vérifie le contenu
 * réel du fichier (JPEG, PNG ou WebP, 5 Mio au plus) ; l'équipe KatiMarket peut
 * retirer un visuel inadapté.
 */
type TypeVisuel = 'logo' | 'banniere'
type Visuels = { logoUrl?: string | null; banniereUrl?: string | null }

const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp']
const TAILLE_MAX = 5 * 1024 * 1024

const TEXTES: Record<TypeVisuel, { titre: string; aide: string }> = {
  logo: { titre: 'Logo', aide: 'Carré de préférence, au moins 300 × 300 px. Il remplace les initiales de la boutique.' },
  banniere: { titre: 'Bannière', aide: 'Format large, au moins 1600 × 500 px. Elle s’affiche en fond de votre carte et en haut de votre page.' },
}

export function VisuelsBoutique({ shopId, visuels, onRefresh }: { shopId: string; visuels: Visuels; onRefresh: () => Promise<void> }) {
  return (
    <section className={styles.settingsCard}>
      <h3>Logo et bannière</h3>
      <p className={styles.memberHint}>Ils apparaissent tout de suite sur la liste des boutiques, sur votre page et à l’accueil. JPEG, PNG ou WebP, 5 Mio au plus.</p>
      <Visuel shopId={shopId} type="logo" url={visuels.logoUrl ?? null} onRefresh={onRefresh} />
      <Visuel shopId={shopId} type="banniere" url={visuels.banniereUrl ?? null} onRefresh={onRefresh} />
    </section>
  )
}

function Visuel({ shopId, type, url, onRefresh }: { shopId: string; type: TypeVisuel; url: string | null; onRefresh: () => Promise<void> }) {
  const champ = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const texte = TEXTES[type]

  async function envoyer(fichier: File | undefined) {
    if (!fichier) return
    setMessage('')
    if (!TYPES_ACCEPTES.includes(fichier.type)) return setMessage('Choisissez une image JPEG, PNG ou WebP.')
    if (fichier.size > TAILLE_MAX) return setMessage('Cette image dépasse 5 Mio.')
    const corps = new FormData()
    corps.append('fichier', fichier)
    setPending(true)
    try {
      await api(`/vendeurs/mes-boutiques/${shopId}/visuels/${type}`, { methode: 'POST', corps })
      await onRefresh()
      setMessage(`${texte.titre} mis${type === 'banniere' ? 'e' : ''} à jour.`)
    } catch (cause) {
      setMessage(cause instanceof ErreurApi ? cause.message : 'L’envoi a échoué. Réessayez.')
    } finally {
      setPending(false)
      if (champ.current) champ.current.value = ''
    }
  }

  async function retirer() {
    setPending(true); setMessage('')
    try {
      await api(`/vendeurs/mes-boutiques/${shopId}/visuels/${type}`, { methode: 'DELETE' })
      await onRefresh()
      setMessage(`${texte.titre} retiré${type === 'banniere' ? 'e' : ''}.`)
    } catch (cause) {
      setMessage(cause instanceof ErreurApi ? cause.message : 'Le retrait a échoué. Réessayez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.visuel} data-testid={`visuel-${type}`}>
      <div className={type === 'logo' ? styles.visuelLogo : styles.visuelBanniere}>
        {url ? <img src={url} alt={`${texte.titre} actuel`} /> : <span>Aucun{type === 'banniere' ? 'e' : ''} {texte.titre.toLowerCase()}</span>}
      </div>
      <div className={styles.visuelActions}>
        <strong>{texte.titre}</strong>
        <small>{texte.aide}</small>
        <label className={styles.visuelBouton}>
          {pending ? 'Envoi…' : url ? 'Remplacer' : 'Ajouter'}
          <input ref={champ} type="file" accept={TYPES_ACCEPTES.join(',')} disabled={pending} onChange={event => void envoyer(event.target.files?.[0])} hidden />
        </label>
        {url ? <button type="button" className={styles.visuelRetirer} disabled={pending} onClick={() => void retirer()}>Retirer</button> : null}
        {message ? <p className={styles.feedback} role="status">{message}</p> : null}
      </div>
    </div>
  )
}
