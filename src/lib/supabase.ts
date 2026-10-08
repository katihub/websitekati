'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * LE CLIENT SUPABASE DU NAVIGATEUR.
 *
 * IL NE SERT QU'A L'IDENTITE. Aucune table n'est lue par lui, aucun produit,
 * aucune commande: tout cela passe par le backend, qui relit les prix en base
 * et n'accorde sa confiance a rien de ce que le navigateur affirme. La cle
 * anonyme est publique par conception, elle part dans ce fichier et se retrouve
 * dans le JavaScript livre; c'est acceptable tant qu'elle ne donne acces qu'a
 * l'inscription et a la connexion.
 *
 * C'est exactement la lecon de l'audit de NVC au mois d'aout: la meme cle y
 * detenait SELECT, INSERT, UPDATE, DELETE et TRUNCATE sur les vingt-trois tables
 * du schema public, et n'importe qui pouvait vider le contenu editorial depuis
 * un navigateur. Ici il n'y a rien a vider: l'instance de la boutique ne porte
 * que `auth`, et le contenu vit derriere le backend.
 *
 * INSTANCE DEDIEE, JAMAIS CELLE DE NVC. Ouvrir les inscriptions sur l'instance
 * du studio donnerait a chaque client de la boutique un compte accepte par la
 * garde d'administration de NVC, qui verifie une session et non un role.
 */

/** Ou supabase-js range la session dans le navigateur. La deconnexion la vise. */
export const CLE_SESSION = 'nowtech.session.v1'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

/**
 * Rend le client, ou `null` si la configuration manque.
 *
 * ON NE LEVE PAS. Une vitrine dont la page produit tombe parce qu'une variable
 * d'environnement manque est pire qu'une vitrine ou l'on ne peut pas se
 * connecter: la boutique doit continuer a vendre par WhatsApp, qui est son
 * chemin historique et qui ne depend de rien de tout ceci. Les composants qui
 * appellent ceci traitent le `null` comme « la connexion n'est pas disponible ».
 */
export function supabase(): SupabaseClient | null {
  if (!url || !cle) return null
  if (!client) {
    client = createClient(url, cle, {
      auth: {
        // La session survit a la fermeture de l'onglet, et le jeton se
        // rafraichit tout seul. Sur un marche ou la connexion est comptee au
        // volume, redemander un mot de passe a chaque visite serait payer deux
        // fois: en donnees et en abandons.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: CLE_SESSION,
      },
    })
  }
  return client
}
