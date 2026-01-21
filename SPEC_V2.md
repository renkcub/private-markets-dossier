# Private Markets Dossier - Technical Spec v2

## Overview

Portfolio tracker for private market investments. Users look up companies one at a time, data is centrally cached, history builds over time.

**Live:** https://private-markets-dossier.vercel.app

---

## Architecture Decisions

### Data Storage: Vercel Postgres

Moving from JSON cache to proper database for history tracking.

### Valuation History Model

Two types of data points:

1. **Lookup Snapshots** — Created when a user searches a company
2. **Funding Events** — Known funding rounds extracted from news

**Chart visualization:**
- ★ Star = Single lookup (no line, just a point)
- ● Connected dots = Multiple lookups over time
- ◆ Diamond = Known funding round
- Dashed line = Interpolated/uncertain between funding rounds

---

## Database Schema

### companies
```sql
CREATE TABLE companies (
  id TEXT PRIMARY KEY,              -- slug like "anthropic"
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',     -- active, acquired, ipo, dead
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### valuation_snapshots (append-only)
```sql
CREATE TABLE valuation_snapshots (
  id SERIAL PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  valuation_low BIGINT,
  valuation_high BIGINT,
  confidence TEXT,                  -- high, medium, low, unknown
  sources JSONB,                    -- array of source strings
  snapshot_type TEXT NOT NULL,      -- 'lookup' or 'funding_round'
  as_of_date DATE,                  -- when the source data is from
  captured_at TIMESTAMP DEFAULT NOW()
);
```

### funding_events
```sql
CREATE TABLE funding_events (
  id SERIAL PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,         -- funding, acquisition, ipo, layoff, executive
  headline TEXT NOT NULL,
  valuation BIGINT,                 -- if known
  amount BIGINT,                    -- funding amount if known
  source_url TEXT,
  captured_at TIMESTAMP DEFAULT NOW()
);
```

### user_positions
```sql
CREATE TABLE user_positions (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,          -- anonymous user ID (localStorage)
  company_id TEXT REFERENCES companies(id),
  shares NUMERIC,
  cost_basis NUMERIC,
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_id, company_id)
);
```

### employee_snapshots (optional, for signals)
```sql
CREATE TABLE employee_snapshots (
  id SERIAL PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  employee_count INTEGER,
  hiring_count INTEGER,
  glassdoor_rating NUMERIC,
  captured_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Routes

### POST /api/lookup
- Input: `{ company: "Anthropic" }`
- Checks if company exists in DB with recent snapshot (< 7 days)
- If yes: return cached data
- If no: call Claude API with web search, save to DB, return
- Response: `{ cached: boolean, data: CompanyData }`

### POST /api/refresh
- Input: `{ companyId: "anthropic" }`
- Rate limited: 1 refresh per company per 24 hours
- Forces new Claude API lookup
- Appends new snapshot (doesn't overwrite)

### GET /api/company/[id]/history
- Returns all valuation_snapshots and funding_events for charting
- Ordered by date

### GET /api/portfolio
- Input: device_id from header/cookie
- Returns all positions with current company data

### POST /api/portfolio
- Add or update position (shares, cost basis, notes)

---

## Pages

### / (Landing)
- Search box
- Result card with valuation, confidence, updates, signals
- "Add to Portfolio" button
- ✅ Built

### /portfolio
- Table of all positions
- Columns: Company, Val Est, Confidence, Status, Updated
- Click row → detail page
- Export CSV button
- ✅ Partially built (needs click-through, CSV)

### /portfolio/[id]
- Full company detail
- YOUR POSITION section (editable: shares, cost basis, notes)
- VALUATION HISTORY chart (stars/dots/diamonds)
- UPDATES timeline
- Explore Selling buttons
- ❌ Not built

---

## Company Card Display

```
┌─────────────────────────────────────────────────────────────────┐
│ ANTHROPIC                                           🟢 Active  │
│ AI safety company developing Claude...                         │
│                                                                 │
│ VALUATION                                                       │
│ $300B - $350B                                                   │
│ 🟢 High confidence · Sources: [linked]                         │
│ As of: Jan 21, 2026                                            │
│                                                                 │
│ RECENT UPDATES                                                  │
│ 💰 Jan 15 - Funding at $300B+ valuation                        │
│ 🚀 Dec 8 - Claude 4 family launched                            │
│ 👤 Oct 31 - Hired Jan Leike as Head of AI Safety               │
│                                                                 │
│ SIGNALS                                                         │
│ Employees: ~500 · Hiring: 45 · Glassdoor: 4.8                  │
│                                                                 │
│ [+ Add to Portfolio]  [Forge →]  [EquityZen →]                 │
│                                                                 │
│ ⚠️ Estimates from public sources. Verify before decisions.     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Valuation History Chart

```
  $300B ─────────────────────────────────────────────★ (Jan 2026 lookup)
                                               ╱
  $200B ─────────────────────────────────────╱
                                      ╱
  $100B ─────────────────────────◆──╯  (Series D, late 2024)
                            ╱
   $50B ────────────◆──────╯           (Series C, mid 2024)
                   ╱
   $20B ─────◆────╯                    (Series B)
            ╱
        2022      2023        2024         2025        2026

Legend: ◆ Funding round   ★ Your lookup   ● Multiple lookups (connected)
```

---

## Remaining Work

### Phase 1: Database (current)
- [ ] Set up Vercel Postgres
- [ ] Create schema
- [ ] Migrate /api/lookup to use DB
- [ ] Migrate /api/refresh to use DB

### Phase 2: Portfolio Detail
- [ ] /portfolio/[id] page
- [ ] Position editor (shares, cost basis, notes)
- [ ] Save positions to DB

### Phase 3: History & Charts
- [ ] /api/company/[id]/history endpoint
- [ ] Valuation history chart component
- [ ] Display funding events vs lookup snapshots

### Phase 4: Polish
- [ ] Export CSV
- [ ] Mobile responsive
- [ ] Rate limiting

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
```

---

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Vercel Postgres
- Claude API with web search
