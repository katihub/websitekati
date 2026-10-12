import type { Metadata } from 'next'
import { MerchantLogin } from '@/components/marketplace/MerchantLogin'

export const metadata: Metadata = { title: 'Connexion marchand', description: 'Connectez-vous à votre espace vendeur KatiHub au Cameroun.' }

export default function ConnexionVendeurPage() {
  return <MerchantLogin />
}
