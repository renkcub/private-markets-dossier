import { promises as fs } from 'fs'
import path from 'path'
import { CompanyData } from './types'
import { normalizeCompanyId } from './utils'

// Use /tmp on Vercel (serverless), local data folder otherwise
const isVercel = process.env.VERCEL === '1'
const CACHE_FILE = isVercel
  ? '/tmp/cache.json'
  : path.join(process.cwd(), 'data', 'cache.json')
const CACHE_MAX_AGE_DAYS = 7

interface CacheStore {
  [companyId: string]: CompanyData
}

// In-memory cache as fallback
let memoryCache: CacheStore = {}

export async function getCache(): Promise<CacheStore> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return memoryCache
  }
}

export async function saveCache(cache: CacheStore): Promise<void> {
  memoryCache = cache
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch {
    // Silently fail on read-only systems, use memory cache
  }
}

export { normalizeCompanyId }

export function isCacheValid(data: CompanyData): boolean {
  const lastRefreshed = new Date(data.lastRefreshed)
  const now = new Date()
  const diffDays = (now.getTime() - lastRefreshed.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays < CACHE_MAX_AGE_DAYS
}

export async function getCachedCompany(companyName: string): Promise<CompanyData | null> {
  const cache = await getCache()
  const id = normalizeCompanyId(companyName)
  const data = cache[id]

  if (data && isCacheValid(data)) {
    return data
  }

  return null
}

export async function cacheCompany(data: CompanyData): Promise<void> {
  const cache = await getCache()
  cache[data.id] = {
    ...data,
    refreshCount: (cache[data.id]?.refreshCount || 0) + 1,
  }
  await saveCache(cache)
}
