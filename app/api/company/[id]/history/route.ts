import { NextRequest, NextResponse } from 'next/server'
import { getValuationHistory, getFundingEvents } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id

    const [valuations, events] = await Promise.all([
      getValuationHistory(companyId),
      getFundingEvents(companyId),
    ])

    return NextResponse.json({
      companyId,
      valuations,
      events,
    })
  } catch (error) {
    console.error('Error fetching company history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company history' },
      { status: 500 }
    )
  }
}
