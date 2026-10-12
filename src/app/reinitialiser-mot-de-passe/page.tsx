import type { Metadata } from 'next'
import { PasswordRecovery } from '@/components/marketplace/PasswordRecovery'

export const metadata: Metadata = { title: 'Réinitialiser le mot de passe marchand' }

export default function Page() { return <PasswordRecovery /> }
