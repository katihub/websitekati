'use client'

/* eslint-disable @next/next/no-img-element -- le pixel de secours (sans JavaScript) est l'image officielle de Facebook */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

/**
 * LE PIXEL FACEBOOK (META) DE KATIMARKET (10 novembre 2026).
 *
 * Le code de base officiel : il charge fbevents.js, initialise le pixel et compte
 * la premiere page vue. Le site change de page sans recharger (Next.js) : chaque
 * navigation suivante envoie elle aussi un `PageView`, sinon seule l'arrivee
 * serait comptee.
 *
 * Monte par l'en-tete du site, present sur toutes les pages : `app/layout.tsx`
 * porte du travail en cours qui n'est pas a modifier ici.
 */
export const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ?? '1786240625787815'

type Fbq = (commande: string, ...arguments_: unknown[]) => void

export function FacebookPixel() {
  const chemin = usePathname()
  const premierePage = useRef(true)

  useEffect(() => {
    // La premiere page est deja comptee par le code de base.
    if (premierePage.current) {
      premierePage.current = false
      return
    }
    const fbq = (window as unknown as { fbq?: Fbq }).fbq
    fbq?.('track', 'PageView')
  }, [chemin])

  if (!FACEBOOK_PIXEL_ID) return null
  return <>
    <Script id="facebook-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${FACEBOOK_PIXEL_ID}');
fbq('track', 'PageView');`}</Script>
    <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`} /></noscript>
  </>
}
