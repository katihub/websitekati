import type { Metadata } from 'next'
import { PasswordRecovery } from '@/components/marketplace/PasswordRecovery'

export const metadata: Metadata = { title: 'Nouveau mot de passe client' }

export default function Page() { return <PasswordRecovery audience="client" /> }
