import { Fragment, type ReactNode } from 'react'

/**
 * LE TEXTE D'UNE FICHE, AVEC SES LIENS ET SES NUMÉROS CLIQUABLES.
 *
 * POURQUOI MAINTENANT. La fiche « Où nous trouver » porte, telle quelle en
 * base, `[GoogleMap](https://maps.app.goo.gl/…)`, une URL nue, et six numéros
 * écrits `678730810 / 640022856`. Rendue en texte brut, elle demande au
 * visiteur de recopier un numéro à la main — sur un téléphone, devant une
 * boutique qu'il cherche. Le défaut existait déjà ; il était atteint par qui
 * tapait « vous êtes où ». Avec le menu guidé, c'est le PREMIER bouton de
 * l'écran d'accueil : il devient inévitable.
 *
 * JAMAIS `dangerouslySetInnerHTML`. Le corps vient de la base, donc du panel,
 * donc d'une saisie humaine — et demain d'une réponse d'équipe transformée en
 * fiche. On compose des éléments React, ce qui rend l'injection impossible
 * par construction plutôt que par vigilance.
 *
 * DEUX FORMES DE NUMÉRO, PARCE QUE LA BASE EN CONTIENT DEUX. Le document
 * d'origine écrit `678730810` d'un bloc ; la fiche de contact, recomposée par
 * le script d'extraction, écrit `678 73 08 10`. Les deux doivent devenir un
 * lien, et les deux composent le même +237.
 */

/** `[libellé](url)`, une URL nue, un courriel, ou un mobile camerounais. */
const MOTIF = new RegExp(
  [
    '\\[([^\\]]{1,80})\\]\\((https?:\\/\\/[^\\s)]+)\\)', // 1 libellé, 2 url
    '(https?:\\/\\/[^\\s<>"]+)', // 3 url nue
    '([\\w.+-]+@[\\w-]+\\.[\\w.-]{2,})', // 4 courriel
    '(?:\\+?237[\\s.-]?)?(6\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}|6\\d{8})', // 5 mobile
  ].join('|'),
  'g',
)

/** Le lien d'appel : neuf chiffres, indicatif du pays devant. */
function versTel(brut: string): string {
  return `tel:+237${brut.replace(/\D/g, '')}`
}

/** Une URL longue se lit par son hôte ; le reste est du bruit dans une bulle. */
function libelleDeLien(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const LIEN =
  'font-semibold text-secondary underline decoration-secondary underline-offset-2 hover:text-secondary'

export function TexteRiche({ texte }: { texte: string }) {
  const morceaux: ReactNode[] = []
  let curseur = 0
  let index = 0

  for (const trouve of texte.matchAll(MOTIF)) {
    const debut = trouve.index ?? 0
    if (debut > curseur) morceaux.push(texte.slice(curseur, debut))
    curseur = debut + trouve[0].length

    const [, libelle, urlNommee, urlNue, courriel, mobile] = trouve
    const cle = `r${index++}`

    if (urlNommee) {
      morceaux.push(
        <a key={cle} href={urlNommee} target="_blank" rel="noreferrer" className={LIEN}>
          {libelle}
        </a>,
      )
    } else if (urlNue) {
      morceaux.push(
        <a key={cle} href={urlNue} target="_blank" rel="noreferrer" className={LIEN}>
          {libelleDeLien(urlNue)}
        </a>,
      )
    } else if (courriel) {
      morceaux.push(
        <a key={cle} href={`mailto:${courriel}`} className={LIEN}>
          {courriel}
        </a>,
      )
    } else if (mobile) {
      morceaux.push(
        <a key={cle} href={versTel(mobile)} className={`t-num ${LIEN}`}>
          {mobile}
        </a>,
      )
    }
  }

  if (curseur < texte.length) morceaux.push(texte.slice(curseur))

  return (
    <>
      {morceaux.map((m, i) => (
        <Fragment key={i}>{m}</Fragment>
      ))}
    </>
  )
}
