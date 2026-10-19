export interface MarketplaceSuggestion {
  readonly id: string
  readonly nom: string
  readonly slug: string
  readonly image: string | null
  readonly prixFcfa: number | null
  readonly boutique: { readonly nom: string; readonly slug: string }
}

export interface MarketplaceSuggestReply {
  readonly query: string
  readonly produits: readonly MarketplaceSuggestion[]
}
