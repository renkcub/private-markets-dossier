export function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function formatValuation(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(0)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`
  }
  return `$${value.toLocaleString()}`
}

export function normalizeCompanyId(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')
}
