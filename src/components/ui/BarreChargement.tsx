import styles from './barre-chargement.module.css'

/**
 * La barre de chargement que le client voit dans la page. Avec `total`, elle dit
 * ce qui est reellement arrive ; sans lui, elle defile sans annoncer de chiffre.
 */
export function BarreChargement({ libelle, valeur, total }: { libelle: string; valeur?: number; total?: number }) {
  const mesuree = valeur !== undefined && total !== undefined && total > 0
  const nombre = new Intl.NumberFormat('fr-FR')
  return (
    <div className={styles.barre} data-testid="barre-chargement">
      <div
        className={styles.piste}
        role="progressbar"
        aria-label={libelle}
        aria-valuemin={mesuree ? 0 : undefined}
        aria-valuemax={mesuree ? total : undefined}
        aria-valuenow={mesuree ? valeur : undefined}
      >
        <span
          className={mesuree ? styles.mesure : styles.defile}
          style={mesuree ? { transform: `scaleX(${Math.min(1, valeur / total)})` } : undefined}
        />
      </div>
      <p>{libelle}…{mesuree ? <b>{nombre.format(valeur)} / {nombre.format(total)}</b> : null}</p>
    </div>
  )
}
