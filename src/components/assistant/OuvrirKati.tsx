'use client'

/**
 * OUVRE LA CONVERSATION AVEC KATI DEPUIS UNE PAGE.
 *
 * L'assistante vit dans un lanceur flottant (`data-assistant-launcher`) ; ce
 * bouton le declenche plutot que d'ouvrir une seconde conversation, pour que
 * le fil, l'historique et la reprise par un conseiller restent les memes.
 */
export function OuvrirKati({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const lanceur = document.querySelector<HTMLElement>('[data-assistant-launcher]')
        // Deja ouverte, la conversation reste ouverte : le lanceur la refermerait.
        if (lanceur && !lanceur.getAttribute('aria-label')?.startsWith('Fermer')) lanceur.click()
      }}
    >
      {children}
    </button>
  )
}
