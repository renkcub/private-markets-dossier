import { NextResponse } from 'next/server'
import { createTables } from '@/lib/db/schema'

export async function POST() {
  try {
    await createTables()
    return NextResponse.json({ success: true, message: 'Database tables created' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// Also allow GET for easy browser testing
export async function GET() {
  return POST()
}
