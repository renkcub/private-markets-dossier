import { sql } from '@vercel/postgres'
import { CompanyData } from '../types'

// Get company with latest valuation
export async function getCompany(companyId: string): Promise<CompanyData | null> {
  try {
    // Get company base data
    const companyResult = await sql`
      SELECT * FROM companies WHERE id = ${companyId}
    `

    if (companyResult.rows.length === 0) {
      return null
    }

    const company = companyResult.rows[0]

    // Get latest valuation snapshot
    const valuationResult = await sql`
      SELECT * FROM valuation_snapshots
      WHERE company_id = ${companyId}
      ORDER BY captured_at DESC
      LIMIT 1
    `

    // Get latest employee snapshot for signals
    const signalsResult = await sql`
      SELECT employee_count, hiring_count, glassdoor_rating
      FROM employee_snapshots
      WHERE company_id = ${companyId}
      ORDER BY captured_at DESC
      LIMIT 1
    `

    // Get recent funding events as updates
    const eventsResult = await sql`
      SELECT event_date, headline, event_type, source_url
      FROM funding_events
      WHERE company_id = ${companyId}
      ORDER BY event_date DESC
      LIMIT 10
    `

    const valuation = valuationResult.rows[0]
    const signals = signalsResult.rows[0]

    const companyData: CompanyData = {
      id: company.id,
      name: company.name,
      description: company.description || '',
      status: company.status || 'unknown',
      valuation: valuation
        ? {
            low: Number(valuation.valuation_low),
            high: Number(valuation.valuation_high),
            confidence: valuation.confidence || 'unknown',
            sources: valuation.sources || [],
            asOf: valuation.as_of_date?.toISOString().split('T')[0] || '',
          }
        : {
            low: 0,
            high: 0,
            confidence: 'unknown',
            sources: [],
            asOf: '',
          },
      updates: eventsResult.rows.map((row) => ({
        date: row.event_date?.toISOString().split('T')[0] || '',
        text: row.headline,
        type: row.event_type || 'news',
        sourceUrl: row.source_url,
      })),
      signals: signals
        ? {
            employees: signals.employee_count,
            hiring: signals.hiring_count,
            glassdoor: signals.glassdoor_rating ? Number(signals.glassdoor_rating) : undefined,
          }
        : undefined,
      lastRefreshed: valuation?.captured_at?.toISOString() || company.updated_at?.toISOString() || '',
      refreshCount: 1,
    }

    return companyData
  } catch (error) {
    console.error('Error getting company:', error)
    return null
  }
}

// Check if we have recent data (within cache window)
export async function hasRecentData(companyId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT captured_at FROM valuation_snapshots
      WHERE company_id = ${companyId}
      AND captured_at > NOW() - INTERVAL '7 days'
      ORDER BY captured_at DESC
      LIMIT 1
    `
    return result.rows.length > 0
  } catch {
    return false
  }
}

// Save company data (creates new snapshot, preserving history)
export async function saveCompanyData(data: CompanyData): Promise<void> {
  try {
    // Upsert company
    await sql`
      INSERT INTO companies (id, name, description, status, updated_at)
      VALUES (${data.id}, ${data.name}, ${data.description}, ${data.status}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = NOW()
    `

    // Insert valuation snapshot (append-only)
    await sql`
      INSERT INTO valuation_snapshots (
        company_id, valuation_low, valuation_high, confidence, sources, snapshot_type, as_of_date
      ) VALUES (
        ${data.id},
        ${data.valuation.low},
        ${data.valuation.high},
        ${data.valuation.confidence},
        ${JSON.stringify(data.valuation.sources)},
        'lookup',
        ${data.valuation.asOf || null}
      )
    `

    // Insert funding events from updates (avoid duplicates)
    for (const update of data.updates) {
      if (update.date && update.text) {
        await sql`
          INSERT INTO funding_events (company_id, event_date, event_type, headline, source_url)
          SELECT ${data.id}, ${update.date}, ${update.type}, ${update.text}, ${update.sourceUrl || null}
          WHERE NOT EXISTS (
            SELECT 1 FROM funding_events
            WHERE company_id = ${data.id}
            AND headline = ${update.text}
          )
        `
      }
    }

    // Insert employee snapshot
    if (data.signals && (data.signals.employees || data.signals.hiring || data.signals.glassdoor)) {
      await sql`
        INSERT INTO employee_snapshots (company_id, employee_count, hiring_count, glassdoor_rating)
        VALUES (
          ${data.id},
          ${data.signals.employees || null},
          ${data.signals.hiring || null},
          ${data.signals.glassdoor || null}
        )
      `
    }
  } catch (error) {
    console.error('Error saving company data:', error)
    throw error
  }
}

// Get valuation history for a company (for charting)
export async function getValuationHistory(companyId: string) {
  const result = await sql`
    SELECT
      valuation_low,
      valuation_high,
      confidence,
      sources,
      snapshot_type,
      captured_at,
      as_of_date
    FROM valuation_snapshots
    WHERE company_id = ${companyId}
    ORDER BY captured_at ASC
  `
  return result.rows
}

// Get funding events for a company
export async function getFundingEvents(companyId: string) {
  const result = await sql`
    SELECT
      event_date,
      event_type,
      headline,
      valuation,
      amount,
      source_url,
      captured_at
    FROM funding_events
    WHERE company_id = ${companyId}
    ORDER BY event_date ASC
  `
  return result.rows
}

// User position management
export async function getUserPosition(deviceId: string, companyId: string) {
  const result = await sql`
    SELECT * FROM user_positions
    WHERE device_id = ${deviceId} AND company_id = ${companyId}
  `
  return result.rows[0] || null
}

export async function saveUserPosition(
  deviceId: string,
  companyId: string,
  data: { shares?: number; costBasis?: number; notes?: string }
) {
  await sql`
    INSERT INTO user_positions (device_id, company_id, shares, cost_basis, notes, updated_at)
    VALUES (${deviceId}, ${companyId}, ${data.shares || null}, ${data.costBasis || null}, ${data.notes || null}, NOW())
    ON CONFLICT (device_id, company_id) DO UPDATE SET
      shares = COALESCE(EXCLUDED.shares, user_positions.shares),
      cost_basis = COALESCE(EXCLUDED.cost_basis, user_positions.cost_basis),
      notes = COALESCE(EXCLUDED.notes, user_positions.notes),
      updated_at = NOW()
  `
}

export async function deleteUserPosition(deviceId: string, companyId: string) {
  await sql`
    DELETE FROM user_positions
    WHERE device_id = ${deviceId} AND company_id = ${companyId}
  `
}

export async function getUserPortfolio(deviceId: string) {
  const result = await sql`
    SELECT
      up.*,
      c.name,
      c.description,
      c.status,
      vs.valuation_low,
      vs.valuation_high,
      vs.confidence,
      vs.captured_at as last_refreshed
    FROM user_positions up
    JOIN companies c ON up.company_id = c.id
    LEFT JOIN LATERAL (
      SELECT * FROM valuation_snapshots
      WHERE company_id = up.company_id
      ORDER BY captured_at DESC
      LIMIT 1
    ) vs ON true
    WHERE up.device_id = ${deviceId}
    ORDER BY up.added_at DESC
  `
  return result.rows
}
