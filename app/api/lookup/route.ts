import { NextRequest, NextResponse } from 'next/server'
import { getCachedCompany, cacheCompany } from '@/lib/cache'
import { lookupCompany } from '@/lib/claude'
import { LookupRequest, LookupResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: LookupRequest = await request.json()

    if (!body.company || typeof body.company !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    const companyName = body.company.trim()

    if (companyName.length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check cache first
    const cached = await getCachedCompany(companyName)

    if (cached) {
      const response: LookupResponse = {
        cached: true,
        data: cached,
      }
      return NextResponse.json(response)
    }

    // Not in cache or expired, lookup via Claude
    const companyData = await lookupCompany(companyName)

    // Save to cache
    await cacheCompany(companyData)

    const response: LookupResponse = {
      cached: false,
      data: companyData,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Lookup error:', error)

    const message = error instanceof Error ? error.message : 'An error occurred'

    return NextResponse.json(
      { error: `Failed to lookup company: ${message}` },
      { status: 500 }
    )
  }
}
