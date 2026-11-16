/**
 * Une lecture JSON courte et retentable pour les pages publiques Marketplace.
 *
 * Le cache reste la responsabilite de Next.js autour de cette fonction. Ici,
 * chaque tentative va vraiment au backend : une reponse 429 ou 503 memoisee
 * pendant le rendu ne devient donc pas une fausse "nouvelle tentative".
 */

interface JournalMarketplace {
  warn(message: string): void
  error(message: string): void
}

interface OptionsLecture {
  chemin: string
  entetes?: HeadersInit
  absentSi404?: boolean
  tentatives?: number
  delaiMs?: number
  attenteMs?: number
  journal?: JournalMarketplace
  fetcher?: typeof fetch
  temporiser?: (ms: number) => Promise<void>
}

class ReponseMarketplaceInattendue extends Error {
  readonly statut: number

  constructor(statut: number) {
    super(`le backend a repondu ${statut}`)
    this.name = 'ReponseMarketplaceInattendue'
    this.statut = statut
  }
}

const attendre = (ms: number) => new Promise<void>((resoudre) => setTimeout(resoudre, ms))

function temporaire(erreur: unknown): boolean {
  if (erreur instanceof ReponseMarketplaceInattendue) {
    return erreur.statut === 408 || erreur.statut === 425 || erreur.statut === 429 || erreur.statut >= 500
  }
  return erreur instanceof SyntaxError || (erreur instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(erreur.name))
}

const raison = (erreur: unknown) => erreur instanceof Error ? erreur.message : String(erreur)

export async function lireJsonMarketplaceAvecReprise<T>({
  chemin,
  entetes,
  absentSi404 = false,
  tentatives = 2,
  delaiMs = 6_000,
  attenteMs = 250,
  journal = console,
  fetcher = fetch,
  temporiser = attendre,
}: OptionsLecture): Promise<T | null> {
  const total = Math.max(1, tentatives)
  let derniereErreur: unknown

  for (let tentative = 1; tentative <= total; tentative += 1) {
    const debut = Date.now()
    const controleur = new AbortController()
    const minuterie = setTimeout(() => controleur.abort(), delaiMs)
    try {
      const reponse = await fetcher(chemin, {
        headers: entetes,
        cache: 'no-store',
        signal: controleur.signal,
      })
      if (reponse.status === 404 && absentSi404) return null
      if (!reponse.ok) throw new ReponseMarketplaceInattendue(reponse.status)
      return await reponse.json() as T
    } catch (erreur) {
      derniereErreur = erreur
      const recommencer = tentative < total && temporaire(erreur)
      const message = `[marketplace] ${chemin} : ${raison(erreur)} apres ${Date.now() - debut} ms (tentative ${tentative}/${total})`
      if (!recommencer) {
        journal.error(message)
        throw erreur
      }
      journal.warn(`${message}, nouvelle tentative`)
      await temporiser(attenteMs * tentative)
    } finally {
      clearTimeout(minuterie)
    }
  }

  throw derniereErreur
}
