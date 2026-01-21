import { sql } from '@vercel/postgres'

export async function createTables() {
  // Companies table
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'unknown',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Valuation snapshots (append-only history)
  await sql`
    CREATE TABLE IF NOT EXISTS valuation_snapshots (
      id SERIAL PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      valuation_low BIGINT,
      valuation_high BIGINT,
      confidence TEXT,
      sources JSONB,
      snapshot_type TEXT DEFAULT 'lookup',
      captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      as_of_date DATE
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
      company_id TEXT NOT NULL REFERENCES companies(id),
      event_date DATE,
      event_type TEXT NOT NULL,
      headline TEXT,
      valuation BIGINT,
      amount BIGINT,
      source_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
      company_id TEXT NOT NULL REFERENCES companies(id),
      shares DECIMAL,
      cost_basis DECIMAL,
      notes TEXT,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(device_id, company_id)
    )
  `

  // Company updates/news (from lookups)
  await sql`
    CREATE TABLE IF NOT EXISTS company_updates (
      id SERIAL PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      update_date DATE,
      update_text TEXT NOT NULL,
      update_type TEXT,
      source_url TEXT,
      captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Signals snapshots (employee count, hiring, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS signal_snapshots (
      id SERIAL PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      employees INTEGER,
      hiring INTEGER,
      glassdoor DECIMAL,
      captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  console.log('All tables created successfully')
}
