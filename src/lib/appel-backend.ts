import 'server-only'

/**
 * COMMENT LE SERVEUR DE LA VITRINE SE PRESENTE AU BACKEND.
 *
 * LE DEFAUT QUI A FAIT NAITRE CE FICHIER. Le backend tient ses quotas par
 * adresse IP, et c'est le SERVEUR de la vitrine qui l'appelle, pour tous les
 * visiteurs, depuis quelques adresses seulement. Deux consequences, constatees :
 * - apres une correction de prix, les pages en cours de rendu relisaient toutes
 *   la table en meme temps, le backend repondait 429, et la barre de recherche
 *   retombait sur les prix du build ;
 * - le backend ne croit que le dernier intermediaire (`trust proxy` a 1), donc
 *   l'adresse du visiteur relayee dans `x-forwarded-for` n'etait jamais lue :
 *   tous les visiteurs du chat partageaient un seul quota.
 *
 * LE SECRET EST CELUI DE LA REVALIDATION. C'est deja le secret partage entre
 * les deux services ; en introduire un second pour la meme relation de
 * confiance aurait double ce qu'il faut configurer, et ce qui peut diverger.
 *
 * `server-only` N'EST PAS UNE PRECAUTION DE STYLE. Ce secret dans le code
 * envoye au navigateur permettrait a n'importe qui de s'affranchir des quotas.
 * Importer ce fichier depuis un composant client casse la compilation, et
 * c'est voulu.
 */

const SECRET = process.env.REVALIDATION_SECRET ?? ''

/**
 * Pour une lecture COMMUNE A TOUS les visiteurs, deja mise en cache ici, ET
 * DONT L'ADRESSE NE DEPEND PAS DE CE QU'UN VISITEUR TAPE : le menu, une fiche
 * produit, l'accueil, une page de rayon sans filtre, le menu de l'assistant.
 * Le backend ne la decompte d'AUCUN quota, rafales comprises.
 *
 * C'EST CETTE SECONDE CONDITION QUI COMPTE. Une recherche, une suggestion ou
 * une liste filtree par un prix libre changent d'adresse a chaque frappe :
 * chacune manque le cache, et avec cet en-tete personne ne la limitait. Un
 * script qui variait `?q=` ou `?prix=` faisait travailler la base sans fin a
 * travers la vitrine — 30 suggestions distinctes en 0,23 s, toutes servies,
 * contre dix par seconde admises pour un visiteur. Celles-la passent par
 * `entetesPourVisiteur`.
 */
export function entetesLectureCommune(): Record<string, string> {
  return SECRET ? { 'x-secret-service': SECRET } : {}
}

/** Les adresses relayees par l'hebergeur ; la premiere est celle du visiteur. */
export function adressesVisiteur(entetes: Pick<Headers, 'get'>): string {
  return entetes.get('x-forwarded-for') ?? entetes.get('x-real-ip') ?? ''
}

/**
 * Pour une requete FAITE AU NOM D'UN VISITEUR : une question, une demande a
 * l'equipe, la relecture d'un fil, une recherche. Le backend compte alors
 * l'adresse du visiteur, et non celle de ce serveur.
 *
 * `x-forwarded-for` reste relaye tel quel, pour les journaux et pour un backend
 * qui n'aurait pas encore le secret : sans lui, rien ne change par rapport a
 * avant.
 */
export function entetesPourVisiteur(adresses: string): Record<string, string> {
  const entetes: Record<string, string> = {}
  if (adresses) entetes['x-forwarded-for'] = adresses
  const visiteur = adresses.split(',')[0]?.trim()
  if (SECRET && visiteur) {
    entetes['x-secret-service'] = SECRET
    entetes['x-visiteur-ip'] = visiteur
  }
  return entetes
}

/** La meme chose, depuis la requete qu'une route a recue. */
export function entetesVisiteur(requete: Request): Record<string, string> {
  return entetesPourVisiteur(adressesVisiteur(requete.headers))
}
