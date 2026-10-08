'use client'

import { useEffect, useState } from 'react'

/**
 * LE BOUTON QUI INSTALLE LA BOUTIQUE COMME UNE APPLICATION.
 *
 * CE QUE LE NAVIGATEUR NOUS DONNE, ET CE QU'IL NE DONNE PAS. Chrome, Edge et
 * les navigateurs Android émettent `beforeinstallprompt` quand le site est
 * installable — manifeste valide, service worker enregistré, origine sûre. On
 * retient l'événement et on rouvre l'invite au clic. C'est le SEUL moyen : on
 * ne peut pas déclencher une installation de sa propre initiative, et un
 * bouton qui appellerait `prompt()` sans cet événement ne ferait rien.
 *
 * IL DISPARAÎT QUAND IL N'A PLUS DE SENS, et c'est la moitié du travail. Pas
 * d'événement — application déjà installée, navigateur qui ne le propose pas,
 * ou iOS, qui n'implémente pas l'API — pas de bouton. Un bouton « Installer »
 * qui ne fait rien est pire que pas de bouton : il apprend au visiteur que
 * les commandes de ce site ne répondent pas.
 *
 * IOS EST LE CAS QUI MÉRITE D'ÊTRE NOMMÉ. Safari installe parfaitement les
 * PWA, mais par « Partager → Sur l'écran d'accueil », sans API. On ne peut
 * donc pas y automatiser le geste ; on l'explique, une fois, et seulement à
 * ceux qui sont sur iOS et pas déjà en application.
 *
 * L'ENREGISTREMENT DU SERVICE WORKER VIT ICI plutôt que dans la mise en page :
 * c'est la même préoccupation — rendre le site installable — et le composant
 * est déjà client. Un fichier de plus pour trois lignes ferait deux endroits
 * à retrouver le jour où l'installation cesse d'être proposée.
 */

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Déjà lancée depuis l'écran d'accueil : il n'y a plus rien à installer. */
function dejaInstallee(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS, qui ne suit pas la requête média.
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function surIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallerApp() {
  const [invite, setInvite] = useState<EvenementInstallation | null>(null)
  const [expliqueIos, setExpliqueIos] = useState(false)
  const [installee, setInstallee] = useState(false)

  useEffect(() => {
    // L'enregistrement est différé après le premier rendu : il ne doit rien
    // coûter au chargement de la page, qui est ce que le visiteur attend.
    if ('serviceWorker' in navigator) {
      const poser = () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      if (document.readyState === 'complete') poser()
      else window.addEventListener('load', poser, { once: true })
    }

    const surInvite = (evenement: Event) => {
      // Sans cela, Chrome affiche sa propre bannière : deux invites pour un
      // seul geste, dont une qu'on ne contrôle pas.
      evenement.preventDefault()
      setInvite(evenement as EvenementInstallation)
    }
    const surInstallation = () => {
      setInvite(null)
      setInstallee(true)
    }

    window.addEventListener('beforeinstallprompt', surInvite)
    window.addEventListener('appinstalled', surInstallation)
    return () => {
      window.removeEventListener('beforeinstallprompt', surInvite)
      window.removeEventListener('appinstalled', surInstallation)
    }
  }, [])

  /* L'état « déjà installée » est lu au rendu, pas écrit depuis un effet : le
     dépôt interdit le second, et la réponse est connue dès le premier rendu
     côté client. */
  if (installee || dejaInstallee()) return null

  if (invite) {
    return (
      <button
        type="button"
        onClick={async () => {
          const evenement = invite
          // Une invite ne se rouvre pas : on la retire avant de l'ouvrir, pour
          // qu'un double clic ne lève pas d'erreur.
          setInvite(null)
          await evenement.prompt()
          await evenement.userChoice
        }}
        className="press hidden items-center gap-1.5 self-center rounded-control border border-rail-ink-2/40 px-3 py-1 text-micro font-semibold text-rail-ink transition-colors duration-[var(--t-fast)] hover:border-secondary hover:text-secondary md:inline-flex"
      >
        <IconTelecharger />
        Installer l’application
      </button>
    )
  }

  if (surIos()) {
    return (
      <span className="hidden items-center self-center md:inline-flex">
        <button
          type="button"
          onClick={() => setExpliqueIos((ouvert) => !ouvert)}
          aria-expanded={expliqueIos}
          className="press inline-flex items-center gap-1.5 rounded-control border border-rail-ink-2/40 px-3 py-1 text-micro font-semibold text-rail-ink transition-colors duration-[var(--t-fast)] hover:border-secondary hover:text-secondary"
        >
          <IconTelecharger />
          Installer l’application
        </button>
        {expliqueIos ? (
          <span
            role="status"
            className="ml-2 max-w-[22rem] text-micro leading-snug text-rail-ink-2"
          >
            Sur iPhone : touchez <strong className="text-rail-ink">Partager</strong>, puis
            <strong className="text-rail-ink"> Sur l’écran d’accueil</strong>.
          </span>
        ) : null}
      </span>
    )
  }

  return null
}

function IconTelecharger() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-[0.9375rem] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5v8" />
      <path d="M4.5 6.5 8 10l3.5-3.5" />
      <path d="M2.5 11.5v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5" />
    </svg>
  )
}
