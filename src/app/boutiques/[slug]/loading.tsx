import { BarreChargement } from '@/components/ui/BarreChargement'
import styles from '../shops.module.css'

export default function LoadingBoutique() {
  return (
    <div className={styles.loadingPage} aria-busy="true">
      <BarreChargement libelle="Chargement de la boutique" />
      <span className={styles.loadingBanniere} aria-hidden="true" />
      <div className={styles.loadingGrid} aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className={styles.loadingCard} key={index}>
            <span className={styles.loadingCover} />
            <div className={styles.loadingText}>
              <span className={styles.loadingLine} />
              <span className={styles.loadingLine} />
              <span className={styles.loadingLine} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
