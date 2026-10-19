import { api } from './api'

export interface StatutVerificationCourriel {
  courriel: string | null
  verifie: boolean
  verifieLe: string | null
  envoyeLe: string | null
  expireLe: string | null
}

export const statutVerificationCourriel = () =>
  api<StatutVerificationCourriel>('/profil/verification-courriel')

export const envoyerVerificationCourriel = () =>
  api<StatutVerificationCourriel & { envoye?: boolean }>('/profil/verification-courriel/envoyer', {
    methode: 'POST',
  })

export const confirmerCodeCourriel = (code: string) =>
  api<StatutVerificationCourriel>('/profil/verification-courriel/confirmer-code', {
    methode: 'POST',
    corps: { code },
  })

export const confirmerLienCourriel = (jeton: string) =>
  api<StatutVerificationCourriel>('/profil/verification-courriel/confirmer-lien', {
    methode: 'POST',
    corps: { jeton },
    anonyme: true,
  })
