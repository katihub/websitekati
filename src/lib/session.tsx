'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  connexionLocaleActive,
  seDeconnecterLocalement,
  sessionLocaleActuelle,
  surChangementLocal,
} from './connexion-locale'
import { CLE_SESSION, supabase } from './supabase'

/**
 * LA SESSION, ET RIEN D'AUTRE.
 *
 * Ce contexte ne porte pas le profil du client. La fiche (nom, telephone,
 * comptoir) reste ou elle est, dans `account.tsx`, en stockage local: elle sert
 * a composer un devis WhatsApp sans compte, et ce chemin doit continuer de
 * fonctionner pour quelqu'un qui ne se connectera jamais. Une session vient
 * S'AJOUTER a la fiche, elle ne la remplace pas.
 *
 * Les deux se rencontrent au moment de commander: c'est le backend qui
 * rapproche le compte connecte et le profil, parce que c'est lui qui a besoin
 * des deux et lui seul.
 *
 * DEUX SOURCES, UNE SEULE FORME. En ligne, la session vient de Supabase ; sur
 * un poste sans Supabase, du backend local (voir `connexion-locale.ts`). Les
 * composants ne voient que `SessionVitrine` : qui est connecte et sous quel
 * identifiant. Ce que Supabase sait de plus n'etait lu nulle part.
 */

interface SessionVitrine {
  userId: string
  courriel: string | null
}

interface EtatSession {
  session: SessionVitrine | null
  /** `null` tant qu'on ne sait pas encore: la premiere lecture est asynchrone. */
  chargement: boolean
  courriel: string | null
  deconnecter: () => Promise<void>
}

const Contexte = createContext<EtatSession | null>(null)

/** La source locale n'est lue que si Supabase n'est pas configure : jamais les deux. */
const sourceLocale = () => connexionLocaleActive && supabase() === null

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionVitrine | null>(() => {
    if (!sourceLocale()) return null
    const s = sessionLocaleActuelle()
    return s ? { userId: s.userId, courriel: s.courriel } : null
  })
  /* PAS DE CLIENT, PAS DE CHARGEMENT — et c'est su avant le premier rendu.
     `supabase()` rend null quand les variables manquent ; l'ecrire depuis un
     effet faisait un rendu « en cours » de trop, et le depot l'interdit.
     Le fait est lu ici, une fois. La source locale, elle, se lit d'un coup. */
  const [chargement, setChargement] = useState(() => supabase() !== null)

  useEffect(() => {
    if (sourceLocale()) {
      return surChangementLocal(() => {
        const s = sessionLocaleActuelle()
        setSession(s ? { userId: s.userId, courriel: s.courriel } : null)
      })
    }

    const client = supabase()
    if (!client) return

    let vivant = true

    // La session est d'abord relue du stockage, puis on s'abonne. L'ordre
    // importe: s'abonner sans lire laisserait l'interface en « deconnecte »
    // pendant tout le temps du premier rafraichissement de jeton, et l'oeil
    // verrait le bouton « Se connecter » clignoter chez quelqu'un qui l'est.
    void client.auth.getSession().then(({ data }) => {
      if (!vivant) return
      const s = data.session
      setSession(s ? { userId: s.user.id, courriel: s.user.email ?? null } : null)
      setChargement(false)
    })

    const { data: abonnement } = client.auth.onAuthStateChange((_evenement, s) => {
      if (!vivant) return
      setSession(s ? { userId: s.user.id, courriel: s.user.email ?? null } : null)
      setChargement(false)
    })

    return () => {
      vivant = false
      abonnement.subscription.unsubscribe()
    }
  }, [])

  const valeur = useMemo<EtatSession>(
    () => ({
      session,
      chargement,
      courriel: session?.courriel ?? null,
      /**
       * SUR CET APPAREIL, SE DECONNECTER DOIT TOUJOURS DECONNECTER.
       *
       * La version installee de supabase-js retire la session du navigateur
       * meme quand l'appel au serveur echoue ; la ligne qui suit l'erreur est
       * un filet, pour qu'une version plus ancienne, ou un stockage reste en
       * place, ne laisse jamais un client « deconnecte » encore connecte.
       *
       * `local` : cet appareil seulement. Se deconnecter de l'ordinateur du
       * bureau ne doit pas fermer la session du telephone.
       */
      deconnecter: async () => {
        if (sourceLocale()) {
          seDeconnecterLocalement()
          return
        }
        const client = supabase()
        if (!client) return
        const { error } = await client.auth.signOut({ scope: 'local' })
        if (error) oublierSessionStockee()
        setSession(null)
      },
    }),
    [session, chargement],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

/** Retire du navigateur tout ce que supabase-js y garde de la session. */
function oublierSessionStockee() {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const cle = window.localStorage.key(i)
      if (cle?.startsWith(CLE_SESSION)) window.localStorage.removeItem(cle)
    }
  } catch {
    /* Stockage inaccessible : il n'y a rien a y retirer non plus. */
  }
}

export function useSession(): EtatSession {
  const c = useContext(Contexte)
  if (!c) throw new Error('useSession doit être appelé dans un SessionProvider')
  return c
}
