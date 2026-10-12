import type { Metadata } from 'next'
import { SellerWorkspace } from '@/components/marketplace/SellerWorkspace'

export const metadata: Metadata = {
  title: 'Espace vendeur | KatiHub',
  description: 'Pilotez votre dossier, vos produits et vos offres sur KatiHub.',
}

export default function SellerWorkspacePage() {
  return <SellerWorkspace />
}
