export function buildAccessoryRecommendationQuery(categoryIds: readonly string[], excludedSlugs: readonly string[] = []): string {
  const categories = [...new Set(categoryIds.filter(Boolean))].slice(0, 8)
  if (!categories.length) return ''
  const excluded = [...new Set(excludedSlugs.filter(Boolean))].slice(0, 100)
  const params = new URLSearchParams({ categories: categories.join(',') })
  if (excluded.length) params.set('exclure', excluded.join(','))
  return `?${params.toString()}`
}
