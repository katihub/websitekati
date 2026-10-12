export default function ChargementProduitMarketplace() {
  return (
    <main aria-busy="true" aria-label="Chargement du produit" style={{ minHeight: '100vh', background: '#fff', padding: '10vh 8vw' }}>
      <div style={{ height: 18, width: 180, background: '#eef1f6', borderRadius: 8, marginBottom: 40 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ minHeight: 520, background: '#f5f7fa', borderRadius: 24 }} />
        <div><div style={{ height: 46, background: '#eef1f6', borderRadius: 10, marginBottom: 24 }} /><div style={{ height: 260, background: '#f5f7fa', borderRadius: 18 }} /></div>
      </div>
    </main>
  )
}
