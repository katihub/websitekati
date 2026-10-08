'use client'

import { api, apiDisponible, ErreurApi } from './api'
import type { Account } from './account'

/**
 * LA FICHE, DES DEUX COTES.
 *
 * LE STOCKAGE LOCAL RESTE LA SOURCE DU CHEMIN SANS COMPTE, et ce n'est pas une
 * transition en attendant mieux. On peut composer un devis entier sans jamais
 * s'inscrire, et ce chemin est celui que la boutique emprunte depuis le premier
 * jour: le degrader pour recompenser ceux qui creent un compte punirait la
 * majorite des visiteurs pour un benefice qu'ils n'ont pas demande.
 *
 * LE SERVEUR EST LA SOURCE DES QU'IL Y A UN COMPTE. Il porte la fiche d'un
 * appareil a l'autre, ce que le stockage local ne saura jamais faire, et c'est
 * exactement la promesse de la semaine 1 du cahier des charges.
 *
 * QUI GAGNE EN CAS DE DESACCORD, ET POURQUOI. Le serveur. Le cas se produit
 * quand quelqu'un modifie sa fiche sur son telephone puis ouvre son ordinateur,
 * ou l'ancienne version dort dans le stockage local depuis des semaines. Faire
 * gagner le local ressusciterait un numero perime a chaque visite depuis le
 * vieil appareil, et le client ne comprendrait pas pourquoi sa correction ne
 * tient jamais. Le seul cas ou le local gagne est celui ou le serveur n'a rien.
 */

/**
 * La fiche telle que le backend la garde. `nom` et `comptoirPrefere` sont
 * NULS pour une fiche nee de l'inscription en une etape (courriel, telephone,
 * mot de passe) : le nom arrive avec la premiere commande, et le comptoir ne
 * sert qu'au retrait.
 */
export interface ProfilServeur {
  nom: string | null
  telephone: string
  comptoirPrefere: string | null
  raisonSociale: string | null
  completLe: string | null
}

export interface ReponseProfil {
  profil: ProfilServeur | null
  adresses: unknown[]
  complet: boolean
}

type Reponse = ReponseProfil

/**
 * Envoie la fiche au serveur. Rend `true` si elle est partie.
 *
 * NE LEVE JAMAIS. Un echec ici ne doit pas empecher le client de continuer: sa
 * fiche est deja enregistree localement et son devis WhatsApp fonctionnera de
 * toute facon. Une boutique qui refuse de prendre une commande parce que son
 * API tousse perd la vente, pas la donnee.
 */
export async function pousserProfil(fiche: Account): Promise<boolean> {
  if (!apiDisponible) return false
  try {
    await api('/profil', {
      methode: 'PUT',
      corps: {
        nom: fiche.name,
        telephone: fiche.phone,
        comptoirPrefere: fiche.counter,
      },
    })
    return true
  } catch (e) {
    // On distingue les deux cas dans la console, parce qu'ils appellent des
    // reactions differentes: un 401 veut dire que la session a expire pendant
    // que le formulaire etait ouvert, ce qui est normal; le reste est une panne.
    if (e instanceof ErreurApi && e.code === 401) {
      console.info('[profil] session expirée, la fiche reste locale')
    } else {
      console.warn('[profil] envoi impossible, la fiche reste locale', e)
    }
    return false
  }
}

/**
 * Va chercher la fiche du serveur. Rend `null` s'il n'y en a pas, ou si le
 * service ne repond pas.
 */
async function tirerProfil(): Promise<Account | null> {
  if (!apiDisponible) return null
  try {
    const r = await api<Reponse>('/profil')
    /* UNE FICHE SANS NOM NE DESCEND PAS DANS LE NAVIGATEUR. La fiche locale
       sert au devis WhatsApp, qui a besoin d'un nom et d'un comptoir ; une
       fiche serveur nee de l'inscription en une etape n'en porte pas encore.
       La recopier ecrirait un nom nul que la fiche locale ne sait pas lire. */
    if (!r.profil?.nom || !r.profil.comptoirPrefere) return null
    return {
      name: r.profil.nom,
      phone: r.profil.telephone,
      counter: r.profil.comptoirPrefere,
    }
  } catch {
    return null
  }
}

/**
 * La fiche du serveur, telle quelle — pour la page de commande, qui doit
 * savoir ce qui manque (le nom, ou toute la fiche) avant d'envoyer.
 * `null` quand l'API est absente ou injoignable : la page se replie alors sur
 * ce que le client tape.
 */
export async function lireProfilServeur(): Promise<ReponseProfil | null> {
  if (!apiDisponible) return null
  try {
    return await api<Reponse>('/profil')
  } catch {
    return null
  }
}

/**
 * CREE OU COMPLETE LA FICHE AVEC CE QU'ON SAIT — inscription en une etape.
 *
 * Le telephone suffit au backend depuis le 5 octobre ; le nom et le comptoir
 * s'ajoutent quand on les connait. Rend `true` si la fiche est enregistree.
 */
export async function enregistrerFiche(champs: {
  telephone: string
  nom?: string
  comptoirPrefere?: string
}): Promise<boolean> {
  if (!apiDisponible) return false
  try {
    await api('/profil', { methode: 'PUT', corps: champs })
    return true
  } catch (e) {
    if (e instanceof ErreurApi && e.code === 401) {
      console.info('[profil] session expirée, la fiche n’a pas été enregistrée')
    } else {
      console.warn('[profil] enregistrement impossible', e)
    }
    return false
  }
}

/**
 * Reconcilie les deux cotes a la connexion.
 *
 * Trois cas, et le troisieme est celui qui compte:
 *   1. le serveur a une fiche  -> elle gagne, on ecrit le local
 *   2. le serveur n'a rien et le local non plus -> rien a faire
 *   3. le serveur n'a rien mais le local en a une -> on la lui pousse
 *
 * Le troisieme est le parcours reel du premier client: il remplit sa fiche sans
 * compte, compose un devis, et cree un compte pour le retrouver plus tard. Sans
 * ce cas, il devrait ressaisir les trois champs qu'il vient de taper.
 */
export async function reconcilier(
  local: Account | null,
  ecrireLocal: (fiche: Account) => void,
): Promise<void> {
  const distant = await tirerProfil()

  if (distant) {
    const different =
      !local ||
      local.name !== distant.name ||
      local.phone !== distant.phone ||
      local.counter !== distant.counter
    if (different) ecrireLocal(distant)
    return
  }

  if (local) await pousserProfil(local)
}
