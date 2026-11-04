import styles from './shops.module.css'

export default function LoadingBoutiques() {
  return (
    <main className={styles.loadingPage} aria-busy="true">
      <p className="sr-only" role="status">Chargement des boutiques…</p>
      <div className={styles.loadingHeading} aria-hidden="true" />
      <div className={styles.loadingGrid} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div className={styles.loadingCard} key={index}>
            <span className={styles.loadingCover} />
            <div className={styles.loadingText}>
              <span className={styles.loadingLine} />
              <span className={styles.loadingLine} />
              <span className={styles.loadingLine} />
              <span className={styles.loadingLine} />
              <span className={styles.loadingLine} />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
