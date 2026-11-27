'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

export type PaymentOperator = 'orange' | 'mtn'
type Availability = { operateurs: Record<PaymentOperator, boolean> }

export function usePaymentOperators() {
  const [availability, setAvailability] = useState<Availability | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void api<Availability>('/paiements/operateurs', { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setAvailability(value) })
      .catch(() => { if (!controller.signal.aborted) setAvailability({ operateurs: { orange: false, mtn: false } }) })
    return () => controller.abort()
  }, [])
  const active = useMemo(() => (['orange', 'mtn'] as const).filter(operator => availability?.operateurs[operator]), [availability])
  return { loading: availability === null, active, none: availability !== null && active.length === 0 }
}
