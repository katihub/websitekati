/**
 * LE MOT DE PASSE TEMPORAIRE SE CHANGE A LA CONNEXION (9 novembre 2026).
 *
 * Quand l'equipe KatiMarket pose un mot de passe temporaire, Supabase marque le
 * compte (`user_metadata.doit_changer_mot_de_passe`). A la connexion, le site
 * envoie la personne choisir le sien ; l'enregistrement efface le marqueur.
 */
export const MARQUEUR_MOT_DE_PASSE = 'doit_changer_mot_de_passe'

export function doitChangerMotDePasse(metadonnees: unknown): boolean {
  return Boolean(metadonnees && typeof metadonnees === 'object' && (metadonnees as Record<string, unknown>)[MARQUEUR_MOT_DE_PASSE] === true)
}

/** La page « nouveau mot de passe » du client ou du vendeur, en mode obligatoire. */
export function pageChangementObligatoire(audience: 'client' | 'vendeur'): string {
  return `${audience === 'client' ? '/nouveau-mot-de-passe' : '/reinitialiser-mot-de-passe'}?obligatoire=1`
}
