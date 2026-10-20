import type { Metadata } from 'next'
import { MerchantLogin } from '@/components/marketplace/MerchantLogin'

export const metadata: Metadata = { title: 'Connexion vendeur', description: 'Connectez-vous à votre espace vendeur KatiMarket au Cameroun.' }

export default function ConnexionVendeurPage() {
  return <MerchantLogin />
}
