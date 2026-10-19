import type { Metadata } from 'next'
import { PasswordRecovery } from '@/components/marketplace/PasswordRecovery'

export const metadata: Metadata = { title: 'Réinitialiser le mot de passe vendeur' }

export default function Page() { return <PasswordRecovery /> }
