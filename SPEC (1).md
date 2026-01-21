# Private Markets Dossier - Full Spec

## What This Is

A web app where angel investors look up private companies one at a time and build a portfolio. Like Google for private company valuations, with the results saved to your personal list.

**The key:** Data is centrally cached. When you look up "Anthropic", you get shared data that's refreshed max once per day. No redundant API calls.

---

## Core Flow

```
User types: "Anthropic"
              ↓
Check central cache: Have data from last 7 days?
              ↓
      ┌───────┴───────┐
      ↓               ↓
     YES              NO
      ↓               ↓
  Return cached     AI lookup (1 call)
  data instantly    → Save to central cache
      ↓               ↓
      └───────┬───────┘
              ↓
    Show result card
              ↓
    User clicks "Add to My Portfolio"
              ↓
    Search next company...
```

**Most lookups are instant cache hits.** Anthropic is popular → many users look it up → 1 API call serves everyone.

---

## MVP Scope (Week 1)

### What We Build
- Search box for ONE company at a time
- Central data cache (Postgres or even JSON file for MVP)
- Result card with valuation, confidence, updates, sources
- "Add to Portfolio" button
- Portfolio list (local storage for MVP)
- Portfolio table view with all your companies

### What We Skip
- User accounts/auth
- Document parsing
- Auto-refresh/notifications
- Batch upload
- Mobile app

---

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Claude API with web search
- SQLite or JSON file for central cache (MVP)
- Local storage for user's portfolio (MVP)

---

## Data Model

### Central Cache (Shared Across All Users)

```typescript
interface CompanyData {
  id: string;                    // "anthropic"
  name: string;                  // "Anthropic"
  description: string;
  
  valuation: {
    low: number;
    high: number;
    confidence: 'high' | 'medium' | 'low' | 'unknown';
    sources: string[];
    asOf: string;                // ISO date of source data
  };
  
  updates: Array<{
    date: string;
    text: string;
    type: 'funding' | 'executive' | 'product' | 'layoff' | 'news';
    sourceUrl?: string;
  }>;
  
  signals?: {
    employees?: number;
    hiring?: number;
    glassdoor?: number;
  };
  
  status: 'active' | 'acquired' | 'ipo' | 'dead' | 'unknown';
  
  // Cache management
  lastRefreshed: string;         // ISO datetime
  refreshCount: number;          // How many times looked up
}
```

### User Portfolio (Local Storage for MVP)

```typescript
interface PortfolioPosition {
  companyId: string;             // Links to central cache
  addedAt: string;
  
  // User's private data
  shares?: number;
  costBasis?: number;
  notes?: string;
}

// Stored in localStorage as:
// { positions: PortfolioPosition[] }
```

---

## UI Screens

### Screen 1: Search + Results

```
┌─────────────────────────────────────────────────────────────────┐
│ PRIVATE MARKETS DOSSIER                                         │
│                                                                 │
│ ┌─────────────────────────────────────────┐                     │
│ │ Search company...              [Look Up]│                     │
│ └─────────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

After search:

┌─────────────────────────────────────────────────────────────────┐
│ PRIVATE MARKETS DOSSIER                                         │
│                                                                 │
│ ┌─────────────────────────────────────────┐                     │
│ │ Anthropic                      [Look Up]│                     │
│ └─────────────────────────────────────────┘                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ANTHROPIC                                         🟢 Active │ │
│ │ AI safety company building Claude. Founded 2021.            │ │
│ │                                                             │ │
│ │ VALUATION                                                   │ │
│ │ $50B - $60B                                                 │ │
│ │ 🟢 High confidence · Sources: Reuters, TechCrunch          │ │
│ │ As of: Jan 15, 2026                                        │ │
│ │                                                             │ │
│ │ RECENT UPDATES                                              │ │
│ │ • Jan 15 - Funding talks at $60B (Reuters)                 │ │
│ │ • Dec 8 - Claude 4 family launched                         │ │
│ │ • Oct 22 - Series D closed at $35B                         │ │
│ │                                                             │ │
│ │ SIGNALS                                                     │ │
│ │ Employees: ~1,200 · Hiring: 89 open roles                  │ │
│ │                                                             │ │
│ │ ┌─────────────┐  ┌─────────┐  ┌───────────┐                │ │
│ │ │+ Add to     │  │ Forge → │  │EquityZen→│                │ │
│ │ │  Portfolio  │  └─────────┘  └───────────┘                │ │
│ │ └─────────────┘                                             │ │
│ │                                                             │ │
│ │ ⚠️ Estimates from public sources. Verify before decisions. │ │
│ │ Data refreshed: 2 hours ago                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [View My Portfolio (3 companies)]                               │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 2: Portfolio View

```
┌─────────────────────────────────────────────────────────────────┐
│ MY PORTFOLIO                              [+ Add Company]       │
│                                           [Export CSV]          │
├─────────────────────────────────────────────────────────────────┤
│ Company     │ Val Est      │ Confidence │ Status │ Updated     │
├─────────────────────────────────────────────────────────────────┤
│ Anthropic   │ $50-60B      │ 🟢 High    │ Active │ 2h ago      │
│ Stripe      │ $50-65B      │ 🟡 Med     │ Active │ 1d ago      │
│ SpaceX      │ $180-210B    │ 🟢 High    │ Active │ 3d ago      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Click any row to see full details + your position              │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 3: Company Detail (from portfolio)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Portfolio                                             │
│                                                                 │
│ ANTHROPIC                                           🟢 Active  │
│ AI safety company building Claude                               │
├─────────────────────────────────────────────────────────────────┤
│ YOUR POSITION                                        [Edit]     │
│ Shares: 847 · Cost basis: $25,000                              │
│ Estimated value: $850K - $1.02M · +3,400%                      │
├─────────────────────────────────────────────────────────────────┤
│ VALUATION                                                       │
│ $50B - $60B (High confidence)                                  │
│ Sources: Reuters Jan 2026, TechCrunch Dec 2024                 │
├─────────────────────────────────────────────────────────────────┤
│ UPDATES                                                         │
│ • Jan 15, 2026 - Funding talks at $60B                         │
│ • Dec 8, 2025 - Claude 4 family launched                       │
│ • Oct 22, 2025 - Series D closed at $35B                       │
│ • Sep 1, 2025 - CFO hire from Stripe                           │
├─────────────────────────────────────────────────────────────────┤
│ YOUR NOTES                                           [Edit]     │
│ "Via Accel SPV. Holding long term."                            │
├─────────────────────────────────────────────────────────────────┤
│ [🔄 Explore Selling]    [Forge →]    [EquityZen →]             │
│                                                                 │
│ [Request Data Refresh]  Last refreshed: 2 hours ago            │
│ [Remove from Portfolio]                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Routes

### POST /api/lookup

```typescript
// Request
{ company: "Anthropic" }

// Response
{
  cached: true,                  // Was this from cache?
  data: CompanyData              // The company data
}
```

**Logic:**
1. Normalize company name (lowercase, trim)
2. Check cache: exists AND lastRefreshed < 7 days ago?
3. If YES → return cached data
4. If NO → call Claude API → save to cache → return

### POST /api/refresh

```typescript
// Request (rate limited: 1 per company per day per IP)
{ companyId: "anthropic" }

// Response
{ success: true, data: CompanyData }
```

Force refresh for a specific company. Rate limited.

---

## Claude Prompt

```
You are researching a private company for an investor.

Company: {company_name}

Search for the following specific information:

1. VALUATION
   - Most recent funding round (date, amount, valuation)
   - Any secondary market transactions in last 12 months
   - Any reported valuation from news sources
   
2. RECENT EVENTS (last 6 months)
   - Funding rounds
   - Executive hires or departures (CEO, CFO, CTO, CPO)
   - Major product launches
   - Partnerships or major customers
   - Layoffs or restructuring
   - Acquisition rumors or IPO filings

3. SIGNALS
   - Current employee count (LinkedIn or news)
   - Number of open job postings
   - Glassdoor rating if available

4. STATUS
   - Is company still operating?
   - Has it been acquired? By whom? For how much?
   - Has it IPO'd? What's the ticker?
   - Has it shut down?

Prioritize sources: TechCrunch, Reuters, Bloomberg, The Information, 
SEC filings, company press releases, PitchBook references.

Return JSON only (no markdown, no explanation):
{
  "name": "Anthropic",
  "description": "One sentence description",
  "valuation": {
    "low": 50000000000,
    "high": 60000000000,
    "confidence": "high",
    "sources": ["Reuters Jan 2026 - reported funding talks", "TechCrunch Oct 2025 - Series D coverage"],
    "asOf": "2026-01-15"
  },
  "updates": [
    {"date": "2026-01-15", "text": "Funding talks at $60B valuation", "type": "funding"},
    {"date": "2025-12-08", "text": "Claude 4 family launched", "type": "product"}
  ],
  "signals": {
    "employees": 1200,
    "hiring": 89,
    "glassdoor": 4.2
  },
  "status": "active"
}

RULES:
- If no valuation data found, set confidence to "unknown" and explain in sources
- Use ranges (low/high), not point estimates
- Include source attribution for every claim
- If company appears dead/acquired, set status accordingly
- If ambiguous company name, pick the most likely tech/startup company
- Return null for signals you can't find
```

---

## File Structure

```
/
├── app/
│   ├── page.tsx                 # Search + result card
│   ├── portfolio/
│   │   └── page.tsx             # Portfolio list view
│   ├── portfolio/[id]/
│   │   └── page.tsx             # Company detail view
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── lookup/
│       │   └── route.ts         # POST: search company
│       └── refresh/
│           └── route.ts         # POST: force refresh
├── components/
│   ├── SearchBox.tsx
│   ├── CompanyCard.tsx          # Result display
│   ├── PortfolioTable.tsx
│   ├── PositionEditor.tsx       # Edit shares/cost basis
│   └── ExportCSV.tsx
├── lib/
│   ├── types.ts
│   ├── claude.ts                # API wrapper
│   ├── cache.ts                 # Central cache operations
│   └── portfolio.ts             # Local storage helpers
├── data/
│   └── cache.json               # Simple file cache (MVP)
└── .env.local
```

---

## Cache Strategy (MVP)

For MVP, use a JSON file as cache:

```typescript
// data/cache.json
{
  "anthropic": {
    "name": "Anthropic",
    "lastRefreshed": "2026-01-21T10:30:00Z",
    // ... rest of CompanyData
  },
  "stripe": { ... }
}
```

Later: migrate to Postgres/Redis for proper multi-user support.

---

## Refresh Rules

| Scenario | Behavior |
|----------|----------|
| Company not in cache | AI lookup → cache |
| Cache < 7 days old | Return cached |
| Cache > 7 days old | AI lookup → update cache |
| User clicks "Refresh" | AI lookup if last refresh > 24h ago |
| Same company, multiple users | All get same cached data |

---

## Edge Cases

| Case | Handling |
|------|----------|
| Company not found | "Couldn't find [X]. Check spelling or try full company name." |
| Ambiguous name | AI picks most likely tech company; show "Did you mean...?" if wrong |
| No valuation data | confidence: "unknown", show message: "No recent valuation data" |
| Dead company | status: "dead", show when/why if known |
| Acquired | status: "acquired", show acquirer and price |
| IPO'd | status: "ipo", show ticker symbol |
| API error | Show error, offer retry |
| Rate limit hit | "Please wait before refreshing again" |

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Success Criteria

- [ ] Search "Anthropic" → get result in <5 seconds (cache) or <15 seconds (fresh)
- [ ] Valuations match what you'd find Googling
- [ ] Sources are real and verifiable
- [ ] Add 5 companies to portfolio
- [ ] Export CSV works
- [ ] Mobile responsive
- [ ] Second search for same company is instant (cache hit)

---

## Future Phases (Not MVP)

**Phase 2:** User accounts, server-side portfolio storage
**Phase 3:** Weekly auto-refresh, email digest of changes
**Phase 4:** Document upload to extract shares/cost basis
**Phase 5:** Warm handoff form to Forge/EquityZen
**Phase 6:** Valuation history charts
**Phase 7:** Mobile app
