import Anthropic from '@anthropic-ai/sdk'
import { CompanyData } from './types'
import { normalizeCompanyId } from './utils'

const client = new Anthropic()

const LOOKUP_PROMPT = `You are researching a private company for an investor. Use web search to find the most current information.

Company: {company_name}

Search the web for the following specific information:

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

After searching, return ONLY a valid JSON object (no markdown, no explanation, no text before or after):
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
- Return ONLY the JSON object, nothing else
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

function extractJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')

  // Find JSON object - look for {"name" pattern which is the expected start
  const startIndex = cleaned.indexOf('{"')
  if (startIndex === -1) {
    // Try finding just {
    const braceIndex = cleaned.indexOf('{')
    if (braceIndex === -1) {
      throw new Error('No JSON object found in response')
    }
    cleaned = cleaned.substring(braceIndex)
  } else {
    cleaned = cleaned.substring(startIndex)
  }

  // Find the matching closing brace
  let depth = 0
  let endIndex = 0
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++
    if (cleaned[i] === '}') depth--
    if (depth === 0) {
      endIndex = i + 1
      break
    }
  }

  if (endIndex === 0) {
    throw new Error('Could not find complete JSON object')
  }

  return cleaned.substring(0, endIndex)
}

export async function lookupCompany(companyName: string): Promise<CompanyData> {
  const prompt = LOOKUP_PROMPT.replace('{company_name}', companyName)

  // Use Claude with web search enabled
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Collect all text from the response
  let fullText = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      fullText += block.text
    }
  }

  if (!fullText) {
    throw new Error('No text response from Claude')
  }

  const jsonText = extractJSON(fullText)
  const parsed: ClaudeResponse = JSON.parse(jsonText)

  // Validate required fields
  if (!parsed.name) {
    throw new Error(`Could not find company: ${companyName}`)
  }

  const companyData: CompanyData = {
    id: normalizeCompanyId(companyName),
    name: parsed.name,
    description: parsed.description || '',
    valuation: parsed.valuation || {
      low: 0,
      high: 0,
      confidence: 'unknown',
      sources: ['No valuation data found'],
      asOf: new Date().toISOString().split('T')[0],
    },
    updates: parsed.updates || [],
    signals: parsed.signals,
    status: parsed.status || 'unknown',
    lastRefreshed: new Date().toISOString(),
    refreshCount: 1,
  }

  return companyData
}
