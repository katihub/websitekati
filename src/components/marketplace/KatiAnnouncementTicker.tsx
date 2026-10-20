'use client'

import { useState } from 'react'
import type { Announcement } from '@/lib/announcements'
import styles from './kati-announcement-ticker.module.css'

export function KatiAnnouncementTicker({ announcements }: { announcements: Announcement[] }) {
  const [paused, setPaused] = useState(false)
  const messages = announcements.length ? announcements : []
  return (
    <div className={styles.ticker} data-paused={paused} data-marketplace-announcements>
      <div className={styles.viewport} role="group" aria-label="Annonces KatiMarket">
        <div className={styles.track}>
          {[0, 1].map(copy => (
            <div className={styles.group} key={copy} aria-hidden={copy === 1} role={copy === 0 ? 'list' : undefined}>
              {messages.map(item => <span className={styles.item} key={item.id} role={copy === 0 ? 'listitem' : undefined}><i aria-hidden="true">◇</i>{item.texte}</span>)}
            </div>
          ))}
        </div>
      </div>
      {messages.length > 1 && (
        <button className={styles.pause} type="button" aria-label={paused ? 'Reprendre le défilement des annonces' : 'Mettre en pause le défilement des annonces'} onClick={() => setPaused(value => !value)}>
          {paused ? '▶' : 'Ⅱ'}
        </button>
      )}
    </div>
  )
}
