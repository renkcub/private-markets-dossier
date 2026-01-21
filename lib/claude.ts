import Anthropic from '@anthropic-ai/sdk'
import { CompanyData } from './types'
import { normalizeCompanyId } from './utils'

const client = new Anthropic()

const LOOKUP_PROMPT = `You are researching a private company for an investor.

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
  "name": "Company Name",
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
    {"date": "2025-12-08", "text": "Major product launched", "type": "product"}
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
- Return null for signals you can't find`

interface ClaudeResponse {
  name: string
  description: string
  valuation: {
    low: number
    high: number
    confidence: 'high' | 'medium' | 'low' | 'unknown'
    sources: string[]
    asOf: string
  }
  updates: Array<{
    date: string
    text: string
    type: 'funding' | 'executive' | 'product' | 'layoff' | 'news'
    sourceUrl?: string
  }>
  signals?: {
    employees?: number
    hiring?: number
    glassdoor?: number
  }
  status: 'active' | 'acquired' | 'ipo' | 'dead' | 'unknown'
}

export async function lookupCompany(companyName: string): Promise<CompanyData> {
  const prompt = LOOKUP_PROMPT.replace('{company_name}', companyName)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let jsonText = textBlock.text.trim()

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed: ClaudeResponse = JSON.parse(jsonText)

  const companyData: CompanyData = {
    id: normalizeCompanyId(companyName),
    name: parsed.name,
    description: parsed.description,
    valuation: parsed.valuation,
    updates: parsed.updates || [],
    signals: parsed.signals,
    status: parsed.status,
    lastRefreshed: new Date().toISOString(),
    refreshCount: 1,
  }

  return companyData
}
