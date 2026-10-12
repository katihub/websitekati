import styles from '@/components/marketplace/marketplace-catalogue.module.css'
export default function CatalogueLoading() {
  return <div className={styles.page} role="status" aria-label="Chargement du catalogue"><div className={`${styles.shell} ${styles.loading}`} aria-hidden="true"><div className={styles.skeleton}/><div>{Array.from({ length: 12 }, (_, index) => <div key={index} className={styles.skeleton}/>)}</div></div><span className="sr-only">Chargement des offres…</span></div>
}
