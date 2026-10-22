import Link from 'next/link'

const BALISAGE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g

/**
 * UN TEXTE REDIGE DEPUIS LE PANEL. Deux balisages seulement, **gras** et
 * [lien](/page) ; tout le reste s'affiche tel quel, sans jamais interpreter de
 * HTML. Le serveur a deja refuse tout lien qui n'est ni une page du site, ni
 * une adresse https, ni un e-mail.
 */
export function TexteRiche({ texte }: { texte: string }) {
  const morceaux: React.ReactNode[] = []
  let dernier = 0
  for (const trouve of texte.matchAll(BALISAGE)) {
    if (trouve.index > dernier) morceaux.push(texte.slice(dernier, trouve.index))
    const cle = morceaux.length
    if (trouve[1]) morceaux.push(<strong key={cle}>{trouve[1]}</strong>)
    else {
      const cible = trouve[3]!
      morceaux.push(cible.startsWith('/')
        ? <Link key={cle} href={cible}>{trouve[2]}</Link>
        : <a key={cle} href={cible} rel="noopener noreferrer" target={cible.startsWith('https://') ? '_blank' : undefined}>{trouve[2]}</a>)
    }
    dernier = trouve.index + trouve[0].length
  }
  if (dernier < texte.length) morceaux.push(texte.slice(dernier))
  return <>{morceaux}</>
}
