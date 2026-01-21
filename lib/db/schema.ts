import { sql } from '@vercel/postgres'

export async function createTables() {
  // Companies table
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Valuation snapshots (append-only)
  await sql`
    CREATE TABLE IF NOT EXISTS valuation_snapshots (
      id SERIAL PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      valuation_low BIGINT,
      valuation_high BIGINT,
      confidence TEXT,
      sources JSONB,
      snapshot_type TEXT NOT NULL,
      as_of_date DATE,
      captured_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Index for efficient company lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_company
    ON valuation_snapshots(company_id, captured_at DESC)
  `

  // Funding events
  await sql`
    CREATE TABLE IF NOT EXISTS funding_events (
      id SERIAL PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      event_date DATE NOT NULL,
      event_type TEXT NOT NULL,
      headline TEXT NOT NULL,
      valuation BIGINT,
      amount BIGINT,
      source_url TEXT,
      captured_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Index for company funding history
  await sql`
    CREATE INDEX IF NOT EXISTS idx_funding_events_company
    ON funding_events(company_id, event_date DESC)
  `

  // User positions (device_id for now, will add auth later)
  await sql`
    CREATE TABLE IF NOT EXISTS user_positions (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      company_id TEXT REFERENCES companies(id),
      shares NUMERIC,
      cost_basis NUMERIC,
      notes TEXT,
      added_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(device_id, company_id)
    )
  `

  // Employee snapshots (for signals)
  await sql`
    CREATE TABLE IF NOT EXISTS employee_snapshots (
      id SERIAL PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      employee_count INTEGER,
      hiring_count INTEGER,
      glassdoor_rating NUMERIC,
      captured_at TIMESTAMP DEFAULT NOW()
    )
  `

  console.log('All tables created successfully')
}
