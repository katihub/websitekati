import Link from 'next/link'

/**
 * THE PAGE THAT DOES NOT EXIST, SAID IN THE SHOP'S OWN VOICE.
 *
 * Without this file Next.js draws its own: « 404 — This page could not be
 * found. », in English, between our header and our footer. A campaign of
 * tests noticed it; a customer from Douala who followed an old link would
 * have noticed it first. The old site had thousands of URLs, and some of them
 * are still in search results and in people's messages.
 */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[36rem] px-4 pt-16 pb-band text-center md:pt-24">
      <p className="t-label text-ink-3">Page introuvable</p>
      <h1 className="mt-2 text-h3 font-semibold tracking-[-0.01em] text-ink text-balance">
        Cette adresse ne mène nulle part
      </h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-small text-ink-2">
        Le lien est peut-être ancien, ou le produit a changé d’adresse. Le catalogue, lui, est
        toujours là.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/catalogue"
          className="press inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-semibold text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary"
        >
          Voir le catalogue
        </Link>
        <Link
          href="/"
          className="press inline-flex min-h-11 items-center rounded-control border border-rule px-5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  )
}
