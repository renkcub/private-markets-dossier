'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CompanyData } from '@/lib/types'
import { formatValuation, formatTimeAgo } from '@/lib/utils'
import { getPosition, updatePosition, removeFromPortfolio } from '@/lib/portfolio'

interface ValuationSnapshot {
  valuation_low: number
  valuation_high: number
  confidence: string
  sources: string[]
  snapshot_type: string
  captured_at: string
  as_of_date: string
}

interface FundingEvent {
  event_date: string
  event_type: string
  headline: string
  valuation: number | null
  amount: number | null
  source_url: string | null
}

interface HistoryData {
  valuations: ValuationSnapshot[]
  events: FundingEvent[]
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<CompanyData | null>(null)
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Position state
  const [shares, setShares] = useState<string>('')
  const [costBasis, setCostBasis] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        // Load company data
        const companyRes = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: companyId }),
        })
        const companyData = await companyRes.json()
        if (companyData.data) {
          setCompany(companyData.data)
        }

        // Load history
        const historyRes = await fetch(`/api/company/${companyId}/history`)
        const historyData = await historyRes.json()
        setHistory(historyData)

        // Load position from localStorage
        const position = getPosition(companyId)
        if (position) {
          setShares(position.shares?.toString() || '')
          setCostBasis(position.costBasis?.toString() || '')
          setNotes(position.notes || '')
        }
      } catch (err) {
        setError('Failed to load company data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [companyId])

  const handleSavePosition = () => {
    setSaving(true)
    updatePosition(companyId, {
      shares: shares ? parseFloat(shares) : undefined,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
      notes: notes || undefined,
    })
    setSaving(false)
    setEditing(false)
  }

  const handleRemove = () => {
    if (confirm('Remove this company from your portfolio?')) {
      removeFromPortfolio(companyId)
      router.push('/portfolio')
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-orange-400'
      default: return 'text-zinc-400'
    }
  }

  const getConfidenceIndicator = (confidence: string) => {
    switch (confidence) {
      case 'high': return '🟢'
      case 'medium': return '🟡'
      case 'low': return '🟠'
      default: return '⚪'
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'funding': return '💰'
      case 'executive': return '👔'
      case 'product': return '🚀'
      case 'layoff': return '📉'
      case 'acquisition': return '🤝'
      case 'ipo': return '📈'
      default: return '📰'
    }
  }

  // Calculate estimated value
  const estimatedValue = shares && company ? {
    low: parseFloat(shares) * (company.valuation.low / 1e9) * 1000, // Rough estimate
    high: parseFloat(shares) * (company.valuation.high / 1e9) * 1000,
  } : null

  if (loading) {
    return (
      <main className="min-h-screen bg-black">
        <header className="border-b border-zinc-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link href="/portfolio" className="text-zinc-400 hover:text-white">
              ← Back to Portfolio
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
        </div>
      </main>
    )
  }

  if (error || !company) {
    return (
      <main className="min-h-screen bg-black">
        <header className="border-b border-zinc-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link href="/portfolio" className="text-zinc-400 hover:text-white">
              ← Back to Portfolio
            </Link>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-red-400">{error || 'Company not found'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/portfolio" className="text-zinc-400 hover:text-white">
            ← Back to Portfolio
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Company Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-wide">
              {company.name}
            </h1>
            <p className="text-zinc-400 mt-1">{company.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
            company.status === 'active' ? 'text-green-400 bg-green-400/10' :
            company.status === 'acquired' ? 'text-blue-400 bg-blue-400/10' :
            company.status === 'ipo' ? 'text-purple-400 bg-purple-400/10' :
            'text-zinc-400 bg-zinc-400/10'
          }`}>
            {company.status}
          </span>
        </div>

        {/* Your Position */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Your Position
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Shares</label>
                  <input
                    type="number"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Cost Basis ($)</label>
                  <input
                    type="number"
                    value={costBasis}
                    onChange={(e) => setCostBasis(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  rows={2}
                  placeholder="e.g., Via Accel SPV. Holding long term."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePosition}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {shares || costBasis ? (
                <div className="space-y-2">
                  <div className="flex gap-6 text-zinc-300">
                    {shares && <span>Shares: <span className="text-white font-medium">{shares}</span></span>}
                    {costBasis && <span>Cost basis: <span className="text-white font-medium">${parseFloat(costBasis).toLocaleString()}</span></span>}
                  </div>
                  {notes && <p className="text-zinc-400 italic">"{notes}"</p>}
                </div>
              ) : (
                <p className="text-zinc-500">No position details added yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Valuation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Valuation
          </h2>
          <div className="text-3xl font-bold text-white">
            {formatValuation(company.valuation.low)} - {formatValuation(company.valuation.high)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span>{getConfidenceIndicator(company.valuation.confidence)}</span>
            <span className={getConfidenceColor(company.valuation.confidence)}>
              {company.valuation.confidence.charAt(0).toUpperCase() + company.valuation.confidence.slice(1)} confidence
            </span>
          </div>
          {company.valuation.sources.length > 0 && (
            <p className="text-sm text-zinc-400 mt-2">
              Sources: {company.valuation.sources.join(', ')}
            </p>
          )}
          {company.valuation.asOf && (
            <p className="text-xs text-zinc-500 mt-1">
              As of: {new Date(company.valuation.asOf).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </p>
          )}
        </div>

        {/* Valuation History */}
        {history && history.valuations.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Valuation History
            </h2>
            <div className="space-y-3">
              {history.valuations.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{v.snapshot_type === 'funding_round' ? '◆' : '★'}</span>
                    <span className="text-zinc-400">
                      {new Date(v.captured_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="text-white font-medium">
                    {formatValuation(v.valuation_low)} - {formatValuation(v.valuation_high)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-4">
              ★ Lookup snapshot  ◆ Funding round
            </p>
          </div>
        )}

        {/* Updates */}
        {company.updates.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Updates
            </h2>
            <div className="space-y-3">
              {company.updates.map((update, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span>{getEventIcon(update.type)}</span>
                  <div>
                    <span className="text-zinc-500">
                      {new Date(update.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    <span className="text-zinc-300 ml-2">- {update.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signals */}
        {company.signals && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Signals
            </h2>
            <div className="flex flex-wrap gap-6 text-sm text-zinc-300">
              {company.signals.employees && (
                <span>Employees: <span className="text-white">~{company.signals.employees.toLocaleString()}</span></span>
              )}
              {company.signals.hiring && (
                <span>Hiring: <span className="text-white">{company.signals.hiring} open roles</span></span>
              )}
              {company.signals.glassdoor && (
                <span>Glassdoor: <span className="text-white">{company.signals.glassdoor}/5</span></span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://forgeglobal.com/search?q=${encodeURIComponent(company.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
          >
            Explore on Forge →
          </a>
          <a
            href={`https://equityzen.com/search/?q=${encodeURIComponent(company.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
          >
            Explore on EquityZen →
          </a>
        </div>

        {/* Remove */}
        <div className="pt-6 border-t border-zinc-800">
          <button
            onClick={handleRemove}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove from Portfolio
          </button>
          <p className="text-xs text-zinc-600 mt-2">
            Data refreshed: {formatTimeAgo(company.lastRefreshed)}
          </p>
        </div>
      </div>
    </main>
  )
}
