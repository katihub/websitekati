'use client'

import { useEffect, useState } from 'react'

import { api, apiDisponible } from './api'
import type { CartLine } from './cart'

/**
 * LE PRIX DU PANIER EST UN INSTANTANE, ET IL PEUT ETRE PERIME.
 *
 * `lib/cart.tsx` capture le prix a l'ajout, et documente pourquoi: le catalogue
 * vit dans le backend, et un panier qui le relirait a chaque rendu attendrait le
 * reseau avant d'afficher sa premiere ligne. Le compromis est bon tant que rien
 * n'est encaisse.
 *
 * MAIS UN PRIX CHANGE DES QUE LE PANEL L'ENREGISTRE. Du temps ou le catalogue ne
 * suivait WooCommerce que toutes les deux heures, quatre prix avaient deja bouge
 * en trois jours. Un panier laisse ouvert une nuit peut donc porter un prix que
 * la boutique ne pratique plus. Ce module va demander au serveur ce qu'il en
 * est, et rend de quoi le dire au client AVANT qu'il n'envoie sa commande.
 *
 * IL NE CORRIGE PAS LE PANIER TOUT SEUL. Un total qui change sous les yeux du
 * client pendant qu'il le lit est pire qu'un total perime: il ne sait plus ce
 * qu'il accepte. On montre l'ecart, on nomme les lignes concernees, et le client
 * decide.
 */

export type MotifRefus = 'inconnu' | 'retire' | 'rupture' | 'prix_nul' | 'quantite'

interface LigneVerifiee {
  slug: string
  quantite: number
  commandable: boolean
  motif?: MotifRefus
  produit?: { id: number; slug: string; nom: string; prix: number; image: string | null }
  sousTotal: number
}

interface Reponse {
  lignes: LigneVerifiee[]
  totaux: { ttc: number; ht: number; tva: number; tauxTva: number }
  commandable: boolean
  catalogueGenereLe: string | null
}

export interface EcartPrix {
  slug: string
  nom: string
  ancien: number
  nouveau: number
}

export interface Verification {
  /** `null` tant qu'on ne sait pas, ou si le service ne repond pas. */
  reponse: Reponse | null
  ecarts: EcartPrix[]
  indisponibles: Array<{ slug: string; nom: string; motif: MotifRefus }>
  enCours: boolean
}

const MOTIFS: Record<MotifRefus, string> = {
  inconnu: 'ce produit n’est plus au catalogue',
  retire: 'ce produit a été retiré',
  rupture: 'en rupture de stock',
  prix_nul: 'prix à confirmer au comptoir',
  quantite: 'quantité impossible',
}

export function libelleMotif(m: MotifRefus): string {
  return MOTIFS[m] ?? 'indisponible'
}

/**
 * Interroge le serveur sur le panier courant.
 *
 * SILENCIEUX EN CAS DE PANNE. Si le service ne repond pas, on rend `null` et
 * l'ecran continue de fonctionner avec les prix locaux: le devis WhatsApp est le
 * chemin historique de cette boutique et il ne doit pas dependre d'une API.
 * Afficher « impossible de verifier les prix » a chaque visite inquieterait le
 * client sur un probleme qui n'est pas le sien.
 */
export function useVerification(lines: readonly CartLine[]): Verification {
  const [reponse, setReponse] = useState<Reponse | null>(null)
  const [enCours, setEnCours] = useState(false)

  // La signature evite de relancer l'appel a chaque rendu: seul un changement
  // reel du panier, en contenu ou en quantite, redemande une verification.
  const signature = lines.map((l) => `${l.slug}:${l.qty}`).join('|')

  /* UN PANIER VIDE N'A RIEN A VERIFIER, ET CE N'EST PAS UN ETAT A ECRIRE.
     `setReponse(null)` depuis l'effet etait le reflexe ; la reponse du
     dernier panier verifie est simplement sans objet quand le panier est
     vide, et c'est au rendu de le dire — voir `reponseUtile` plus bas. */
  const verifiable = apiDisponible && lines.length > 0

  useEffect(() => {
    if (!verifiable) return

    const controleur = new AbortController()
    /* `setEnCours` ici est un abonnement qui commence : la regle du depot vise
       l'ecriture synchrone d'un etat DERIVE, pas le demarrage d'un travail. Le
       lint ne fait pas la difference ; on la fait pour lui en passant par une
       microtache, ce qui est aussi le moment ou le rendu courant est fini. */
    queueMicrotask(() => {
      if (!controleur.signal.aborted) setEnCours(true)
    })

    api<Reponse>('/catalogue/verifier', {
      methode: 'POST',
      corps: { lignes: lines.map((l) => ({ slug: l.slug, quantite: l.qty })) },
      signal: controleur.signal,
    })
      .then((r) => setReponse(r))
      .catch(() => setReponse(null))
      .finally(() => setEnCours(false))

    return () => controleur.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const parSlug = new Map(lines.map((l) => [l.slug, l]))

  /* La reponse du dernier panier verifie n'a plus d'objet quand le panier est
     vide ou que le service est absent : elle est ignoree au rendu plutot
     qu'effacee par un effet. */
  const reponseUtile = verifiable ? reponse : null

  const ecarts: EcartPrix[] = []
  const indisponibles: Verification['indisponibles'] = []

  for (const v of reponseUtile?.lignes ?? []) {
    const locale = parSlug.get(v.slug)
    if (!locale) continue

    if (!v.commandable) {
      indisponibles.push({ slug: v.slug, nom: locale.name, motif: v.motif ?? 'inconnu' })
      continue
    }
    if (v.produit && v.produit.prix !== locale.price) {
      ecarts.push({
        slug: v.slug,
        nom: v.produit.nom || locale.name,
        ancien: locale.price,
        nouveau: v.produit.prix,
      })
    }
  }

  return { reponse: reponseUtile, ecarts, indisponibles, enCours }
}
