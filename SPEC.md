# Private Markets Dossier - Full Spec

## What This Is
A web app where angel investors paste company names and get auto-updated valuations + news. A spreadsheet that updates itself.

**User has:** 150 companies in a Google Sheet, manually updating a NOTES column with valuation news
**We replace:** The manual Googling with AI that does it automatically

---

## MVP Scope (Week 1)

### What We Build
Single page, no auth, no database:
1. Textarea where user pastes company names (one per line)
2. Submit button → API calls Claude with web search for each company
3. Returns: valuation estimate, confidence, recent updates, status
4. Display as expandable table
5. "Copy as CSV" button to paste back into their spreadsheet

### What We Skip
- User accounts
- Database/persistence  
- Document parsing
- Auto-refresh
- Mobile app

---

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Claude API with web search

---

## Data Structures

### API Response (per company)
```typescript
interface CompanyResult {
  name: string;
  description: string;
  valuation: {
    low: number;      // e.g., 50000000000
    high: number;     // e.g., 60000000000
    confidence: 'high' | 'medium' | 'low';
    sources: string[];
    asOf: string;     // ISO date
  };
  updates: Array<{
    date: string;
    text: string;
    sourceUrl?: string;
  }>;
  signals?: {
    employees?: number;
    hiring?: number;
    glassdoor?: number;
  };
  status: 'active' | 'acquired' | 'ipo' | 'dead' | 'unknown';
}
```

### Request
```typescript
interface LookupRequest {
  companies: string[];  // ["Anthropic", "Stripe", "SpaceX"]
}
```

---

## UI Design

### Landing Page
```
┌─────────────────────────────────────────────────────────────────┐
│ PRIVATE MARKETS DOSSIER                                         │
│ Paste your companies. Get valuations.                           │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Anthropic                                                   │ │
│ │ Stripe                                                      │ │
│ │ SpaceX                                                      │ │
│ │ Databricks                                                  │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Look Up Companies]                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Results Table
```
┌─────────────────────────────────────────────────────────────────┐
│ RESULTS                                          [Copy as CSV]  │
├─────────────────────────────────────────────────────────────────┤
│ Company     │ Val Est      │ Confidence │ Latest Update         │
├─────────────────────────────────────────────────────────────────┤
│ ▶ Anthropic │ $50-60B      │ 🟢 High    │ Funding talks at $60B │
│ ▶ Stripe    │ $50-65B      │ 🟡 Med     │ CFO departure         │
│ ▶ SpaceX    │ $180-210B    │ 🟢 High    │ Secondary at $185/sh  │
│ ▶ Convoy    │ $0           │ 💀 Dead    │ Shut down Oct 2023    │
└─────────────────────────────────────────────────────────────────┘

Click ▶ to expand:
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Anthropic                                                     │
│   AI safety company building Claude. Founded 2021.              │
│                                                                 │
│   Valuation: $50B - $60B (High confidence)                     │
│   Sources: Reuters Jan 2026, TechCrunch Dec 2024               │
│                                                                 │
│   Updates:                                                      │
│   • Jan 15, 2026 - Funding talks at $60B (Reuters)             │
│   • Dec 8, 2025 - Claude 4 family launched                     │
│   • Oct 22, 2025 - Series D closed at $35B                     │
│                                                                 │
│   [Explore Selling →]  [Forge] [EquityZen]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Route: /api/lookup

### Claude Prompt Template
```
You are researching private companies for an investor portfolio.

For each company, search for:
1. Recent valuation (funding rounds, secondary market, news)
2. Notable events in last 6 months
3. Current status (active, acquired, IPO'd, dead)
4. Employee count if available

Company: {company_name}

Return JSON only, no markdown:
{
  "name": "Company Name",
  "description": "One sentence description",
  "valuation": {
    "low": number,
    "high": number,
    "confidence": "high" | "medium" | "low",
    "sources": ["Source 1", "Source 2"],
    "asOf": "2026-01-15"
  },
  "updates": [
    {"date": "2026-01-15", "text": "What happened"}
  ],
  "signals": {
    "employees": number or null,
    "hiring": number or null
  },
  "status": "active" | "acquired" | "ipo" | "dead" | "unknown"
}

Rules:
- Use ranges, not point estimates for valuation
- If no recent data, set confidence to "low"  
- If company is dead/acquired, reflect in status
- Always cite sources
```

---

## File Structure
```
/
├── app/
│   ├── page.tsx              # Landing page with textarea
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Tailwind imports
│   └── api/
│       └── lookup/
│           └── route.ts      # POST handler for company lookup
├── components/
│   ├── CompanyInput.tsx      # Textarea + submit
│   ├── ResultsTable.tsx      # Main results display
│   ├── CompanyRow.tsx        # Single row, expandable
│   └── CopyCSVButton.tsx     # Export functionality
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   └── claude.ts             # Claude API wrapper
├── .env.local                # ANTHROPIC_API_KEY
└── package.json
```

---

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Company not found | Return error state, suggest alternatives |
| Multiple matches | Return best match + note ambiguity |
| No valuation data | confidence: "unknown", explain why |
| Dead company | status: "dead", show shutdown date |
| IPO'd | status: "ipo", show ticker |
| Rate limiting | Process sequentially, show progress |

---

## Future Phases (Not Now)

**Phase 2:** User accounts, save portfolio
**Phase 3:** Auto-refresh weekly, email digest  
**Phase 4:** Document upload + parsing
**Phase 5:** Warm handoff to Forge/EquityZen for leads

---

## Success Criteria

- [ ] Paste 10 companies → results in <60 seconds
- [ ] Valuations are reasonable (not hallucinated)
- [ ] Sources are real
- [ ] Can copy CSV back to spreadsheet
- [ ] Mobile responsive
