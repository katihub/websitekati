import styles from './boutique-loading.module.css'

export default function LoadingBoutique() {
  return (
    <main className={styles.page} data-shop-loading>
      <div className={styles.progress} role="status" aria-live="polite">
        <span className={styles.track} aria-hidden="true" />
        <span>Chargement de la boutique…</span>
      </div>
      <section className={styles.cover} aria-hidden="true">
        <span className={styles.logo} />
        <div className={styles.identity}><i /><i /><i /></div>
      </section>
      <div className={styles.navigation} aria-hidden="true" />
      <div className={styles.products} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
      </div>
    </main>
  )
}
