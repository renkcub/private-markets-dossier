import { sql } from '@vercel/postgres'
import { CompanyData } from '../types'

const CACHE_MAX_AGE_DAYS = 7

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

    // Get recent updates
    const updatesResult = await sql`
      SELECT update_date, update_text, update_type, source_url
      FROM company_updates
      WHERE company_id = ${companyId}
      ORDER BY update_date DESC
      LIMIT 10
    `

    // Get latest signals
    const signalsResult = await sql`
      SELECT employees, hiring, glassdoor
      FROM signal_snapshots
      WHERE company_id = ${companyId}
      ORDER BY captured_at DESC
      LIMIT 1
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
      updates: updatesResult.rows.map((row) => ({
        date: row.update_date?.toISOString().split('T')[0] || '',
        text: row.update_text,
        type: row.update_type || 'news',
        sourceUrl: row.source_url,
      })),
      signals: signals
        ? {
            employees: signals.employees,
            hiring: signals.hiring,
            glassdoor: signals.glassdoor ? Number(signals.glassdoor) : undefined,
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
        company_id, valuation_low, valuation_high, confidence, sources, as_of_date
      ) VALUES (
        ${data.id},
        ${data.valuation.low},
        ${data.valuation.high},
        ${data.valuation.confidence},
        ${JSON.stringify(data.valuation.sources)},
        ${data.valuation.asOf || null}
      )
    `

    // Insert updates (avoid duplicates based on date + text)
    for (const update of data.updates) {
      await sql`
        INSERT INTO company_updates (company_id, update_date, update_text, update_type, source_url)
        SELECT ${data.id}, ${update.date || null}, ${update.text}, ${update.type}, ${update.sourceUrl || null}
        WHERE NOT EXISTS (
          SELECT 1 FROM company_updates
          WHERE company_id = ${data.id}
          AND update_text = ${update.text}
        )
      `
    }

    // Insert signals snapshot
    if (data.signals) {
      await sql`
        INSERT INTO signal_snapshots (company_id, employees, hiring, glassdoor)
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

// Get valuation history for a company
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
    ORDER BY captured_at DESC
    LIMIT 50
  `
  return result.rows
}

// Get funding events for a company
export async function getFundingEvents(companyId: string) {
  const result = await sql`
    SELECT *
    FROM funding_events
    WHERE company_id = ${companyId}
    ORDER BY event_date DESC
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
