/**
 * LA RECHERCHE PAR PHOTO, SANS LE RESEAU.
 *
 * Le modele decrit le produit vu ; ces fonctions transforment sa reponse en
 * requetes catalogue et choisissent la premiere qui trouve vraiment quelque
 * chose. Separees de la route pour etre testees sans appel externe.
 */

export type AnalyseImage = {
  /** Ce que le client lit : « Caméra IP Hikvision ». */
  label: string
  /** Le type de produit, en mots du catalogue : « caméra de surveillance ». */
  produit: string
  marque: string
  modele: string
  /** Du plus precis au plus large, rediges par le modele. */
  requetes: string[]
}

const propre = (valeur: unknown, max: number) =>
  typeof valeur === 'string' ? valeur.trim().replace(/\s+/g, ' ').slice(0, max) : ''

/** La reponse du modele, validee champ par champ ; `null` si rien d'exploitable. */
export function lireAnalyse(valeur: unknown): AnalyseImage | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null
  const brut = valeur as Record<string, unknown>
  const analyse: AnalyseImage = {
    label: propre(brut.label, 120),
    produit: propre(brut.produit, 60),
    marque: propre(brut.marque, 40),
    modele: propre(brut.modele, 60),
    requetes: Array.isArray(brut.requetes)
      ? brut.requetes.map((requete) => propre(requete, 100)).filter((requete) => requete.length >= 2).slice(0, 4)
      : [],
  }
  if (!analyse.produit && !analyse.marque && !analyse.requetes.length) return null
  if (!analyse.label) analyse.label = [analyse.produit, analyse.marque, analyse.modele].filter(Boolean).join(' ')
  return analyse
}

/**
 * Les requetes a essayer, de la plus precise a la plus large, sans doublon.
 * Le modele propose les siennes ; on y ajoute les combinaisons sures (marque et
 * modele, type et marque, type seul) pour qu'un modele introuvable ramene au
 * moins les produits du meme genre.
 */
export function candidatsRecherche(analyse: AnalyseImage): string[] {
  const { produit, marque, modele } = analyse
  const candidats = [
    ...analyse.requetes,
    [marque, modele].filter(Boolean).join(' '),
    [produit, marque].filter(Boolean).join(' '),
    modele,
    produit,
    marque,
  ]
  const vus = new Set<string>()
  return candidats
    .map((candidat) => candidat.trim())
    .filter((candidat) => {
      const cle = candidat.toLocaleLowerCase('fr')
      if (candidat.length < 2 || vus.has(cle)) return false
      vus.add(cle)
      return true
    })
    .slice(0, 6)
}

/** Ce que la recherche publique repond a une requete : son total et le texte de son meilleur resultat. */
export type Sondage = { total: number; apercu: string }

/** Sans accent, en minuscules, le tiret lu comme un espace : « Easy-UPS » vaut « Easy UPS ». */
const sansAccent = (valeur: string) => valeur.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr').replace(/-/g, ' ')
const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'en', 'au', 'aux', 'a', 'pour', 'par', 'sur', 'avec', 'sans', 'dans'])

/** Vrai quand chaque mot utile de la requete figure dans le texte du resultat. */
export function couvre(requete: string, apercu: string): boolean {
  const texte = sansAccent(apercu)
  const mots = sansAccent(requete).split(/[\s,;/]+/).filter((mot) => mot.length >= 2 && !MOTS_VIDES.has(mot))
  return mots.length > 0 && mots.every((mot) => texte.includes(mot))
}

/**
 * LA REQUETE A OUVRIR, DANS L'ORDRE DE PRECISION.
 *
 * La recherche publique cherche chaque mot : une requete precise sur un modele
 * absent trouve quand meme « quelque chose » par la marque seule. On retient
 * donc la premiere requete dont le meilleur resultat contient TOUS ses mots ;
 * a defaut, la premiere qui trouve des produits ; a defaut, la plus precise,
 * avec un total nul que la page de recherche saura dire.
 *
 * Les sondages partent tous en meme temps : on attend le plus lent une fois, pas
 * la somme. Un sondage en echec compte pour zero.
 */
export async function choisirRequete(
  candidats: string[],
  sonder: (requete: string) => Promise<Sondage>,
): Promise<{ requete: string; total: number }> {
  const sondages = await Promise.all(candidats.map((candidat) => sonder(candidat).catch(() => ({ total: 0, apercu: '' }))))
  const exact = sondages.findIndex((sondage, index) => sondage.total > 0 && couvre(candidats[index]!, sondage.apercu))
  const index = exact >= 0 ? exact : sondages.findIndex((sondage) => sondage.total > 0)
  return index >= 0 ? { requete: candidats[index]!, total: sondages[index]!.total } : { requete: candidats[0] ?? '', total: 0 }
}

/** Le texte que rend l'API Responses, qu'il soit agrege ou reparti en morceaux. */
export function texteSortie(response: Record<string, unknown>): string {
  if (typeof response.output_text === 'string') return response.output_text
  const output = Array.isArray(response.output) ? response.output : []
  return output.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) return []
    return content.flatMap((part) => part && typeof part === 'object' && (part as { type?: unknown }).type === 'output_text' && typeof (part as { text?: unknown }).text === 'string' ? [(part as { text: string }).text] : [])
  }).join('')
}
