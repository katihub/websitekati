export type ShopIconName = 'bag' | 'cart' | 'trash' | 'pin' | 'search' | 'arrow' | 'shield' | 'truck' | 'clock' | 'bookmark' | 'tag' | 'grid' | 'package' | 'laptop' | 'phone' | 'headphones' | 'home' | 'info' | 'check' | 'close' | 'wallet' | 'star' | 'users' | 'settings' | 'plus' | 'message' | 'file' | 'receipt' | 'heart' | 'question' | 'mail' | 'lock' | 'cookie'

export function ShopIcon({ name, className }: { name: ShopIconName; className?: string }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14"/>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20l1.2-4.5a8.5 8.5 0 1 1 16.8-4Z"/><path d="M8 11h8M8 14h5"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    receipt: <><path d="M4 3v18l4-2 4 2 4-2 4 2V3l-4 2-4-2-4 2Z"/><path d="M8 10h8M8 14h8"/></>,
    heart: <path d="M20.8 8.8c0 4.4-8.8 10-8.8 10s-8.8-5.6-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"/>,
    question: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1 .9-2 1.2-2 2.9M12 17h.01"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/></>,
    cookie: <><path d="M20.5 13A8.5 8.5 0 1 1 11 3.5a3 3 0 0 0 4 4 3 3 0 0 0 5.5 2A8.4 8.4 0 0 1 20.5 13Z"/><path d="M8.5 12h.01M11 16h.01M7 8h.01"/></>,
    wallet: <><rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 9h20M16 15h2"/></>,
    star: <path d="m12 2 3.1 6.4 7.1 1-5.1 5 .9 7-6-3.3-6 3.3.9-7-5.1-5 7.1-1Z"/>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M16 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 4 6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.5 2.5 2 1 2.4-1 2 3.5-2 1.6v2.8l2 1.6-2 3.5-2.4-1-2 1L14 22h-4l-.5-2.5-2-1-2.4 1-2-3.5 2-1.6v-2.8l-2-1.6 2-3.5 2.4 1 2-1Z"/></>,
    cart: <><path d="M3 4h2l2 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    trash: <><path d="M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3M10 10v7M14 10v7"/></>,
    bag: <><path d="m5 7-1 14h16L19 7ZM8 8V6a4 4 0 0 1 8 0v2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    shield: <><path d="m12 2-8 3v6c0 5 4 8 8 11 4-3 8-6 8-11V5Z"/><path d="m8 12 3 3 5-6"/></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4Z"/>,
    tag: <><path d="m3 3 8 0 10 10-8 8L3 11Z"/><circle cx="7" cy="7" r="1"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    package: <><path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7.5 4.5l9 5v4"/></>,
    laptop: <><rect x="5" y="4" width="14" height="12" rx="1"/><path d="M3 20h18l-2-4H5Z"/></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 5h2M11 19h2"/></>,
    headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/></>,
    home: <><path d="m3 10 9-8 9 8M5 9v12h14V9M9 21v-8h6v8"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  }
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function iconeCategorieMarketplace(nom: string): ShopIconName {
  if (/informatique|ordinateur|high.?tech/i.test(nom)) return 'laptop'
  if (/électronique|electronique|smartphone|téléphone|telephone/i.test(nom)) return 'phone'
  if (/audio|casque/i.test(nom)) return 'headphones'
  if (/maison|déco|deco|électroménager|electromenager|jardin/i.test(nom)) return 'home'
  if (/sport|loisir|mode|style|beauté|beaute|santé|sante/i.test(nom)) return 'star'
  if (/auto|moto|livraison/i.test(nom)) return 'truck'
  if (/sécurité|securite/i.test(nom)) return 'shield'
  return 'package'
}
