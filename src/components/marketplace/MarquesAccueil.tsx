import Link from 'next/link'

import { BRAND_MARK_BY_NAME } from '@/constants/brand-marks'
import styles from './marketplace-marques.module.css'

/**
 * « LES MARQUES DE NOS BOUTIQUES » : les marques vendues sur KatiMarket, des plus
 * presentes aux moins presentes, lues dans les facettes du catalogue. Une
 * marque dont le site tient le logo l'affiche en monochrome discret, a sa
 * couleur au survol ; les autres, souvent des marques locales, ont leurs
 * initiales. Des tuiles compactes, pour en montrer beaucoup sans qu'elles
 * prennent le pas sur les produits. Chaque tuile ouvre le catalogue filtre.
 */

// 40 remplit des rangees entieres sur 8, 5 ou 4 colonnes.
const LIMITE = 40

function initiales(nom: string) {
  const mots = nom.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  return (mots.length > 1 ? mots[0]![0]! + mots[1]![0]! : (mots[0] ?? '?').slice(0, 2)).toUpperCase()
}

export function MarquesAccueil({ marques, totalOffres }: { marques: Array<{ nom: string; nombre: number }>; totalOffres: number }) {
  const affichees = [...marques].filter((m) => m.nombre > 0).sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom, 'fr')).slice(0, LIMITE)
  if (!affichees.length) return null
  const nombre = new Intl.NumberFormat('fr-FR')
  return <section className={styles.section} aria-labelledby="marques-titre">
    <header className={styles.entete}>
      <div>
        <h2 id="marques-titre">Les marques qui font votre quotidien</h2>
        <p>{nombre.format(totalOffres)} offre{totalOffres > 1 ? 's' : ''} auprès de {nombre.format(marques.length)} marque{marques.length > 1 ? 's' : ''}, proposées par les boutiques de KatiMarket.</p>
      </div>
      <Link href="/marques">Explorer toutes les marques <span aria-hidden="true">→</span></Link>
    </header>
    <ul className={styles.grille}>
      {affichees.map((marque, index) => {
        const logo = BRAND_MARK_BY_NAME.get(marque.nom.toUpperCase())
        return <li key={marque.nom} style={{ '--i': index } as React.CSSProperties}>
          <Link href={`/catalogue?marque=${encodeURIComponent(marque.nom)}`} className={styles.tuile} aria-label={`${marque.nom} : ${marque.nombre} offre${marque.nombre > 1 ? 's' : ''}`}>
            <span aria-hidden="true" className={styles.visuel}>{logo
              ? <span className={styles.logo} style={{ '--mark-src': `url(/brands/${logo.file}.svg)`, '--mark-ink': logo.paint } as React.CSSProperties} />
              : <span className={styles.monogramme}>{initiales(marque.nom)}</span>}</span>
            <b className={styles.nom}>{marque.nom}</b>
            <small className={styles.compte} aria-hidden="true">{nombre.format(marque.nombre)}</small>
          </Link>
        </li>
      })}
    </ul>
  </section>
}
