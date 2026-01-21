import { CompanyData } from './types'
import { normalizeCompanyId } from './utils'
import { getCompany, saveCompanyData, hasRecentData } from './db/queries'

export { normalizeCompanyId }

const CACHE_MAX_AGE_DAYS = 7

// Check if we have valid cached data
export async function getCachedCompany(companyName: string): Promise<CompanyData | null> {
  const id = normalizeCompanyId(companyName)

  // Check if we have recent data in the database
  const hasRecent = await hasRecentData(id)
  if (!hasRecent) {
    return null
  }

  return await getCompany(id)
}

// Save company data to database (creates valuation snapshot)
export async function cacheCompany(data: CompanyData): Promise<void> {
  await saveCompanyData(data)
}

// For backwards compatibility
export function isCacheValid(data: CompanyData): boolean {
  const lastRefreshed = new Date(data.lastRefreshed)
  const now = new Date()
  const diffDays = (now.getTime() - lastRefreshed.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays < CACHE_MAX_AGE_DAYS
}
