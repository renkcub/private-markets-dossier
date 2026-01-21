'use client'

import { useState, useEffect } from 'react'
import { CompanyData } from '@/lib/types'
import { formatTimeAgo } from '@/lib/utils'
import { addToPortfolio, isInPortfolio, removeFromPortfolio } from '@/lib/portfolio'

interface CompanyCardProps {
  data: CompanyData
  cached: boolean
}

function formatValuation(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(0)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`
  }
  return `$${value.toLocaleString()}`
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'text-green-400'
    case 'medium':
      return 'text-yellow-400'
    case 'low':
      return 'text-orange-400'
    default:
      return 'text-zinc-400'
  }
}

function getConfidenceIndicator(confidence: string): string {
  switch (confidence) {
    case 'high':
      return '🟢'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟠'
    default:
      return '⚪'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-400 bg-green-400/10'
    case 'acquired':
      return 'text-blue-400 bg-blue-400/10'
    case 'ipo':
      return 'text-purple-400 bg-purple-400/10'
    case 'dead':
      return 'text-red-400 bg-red-400/10'
    default:
      return 'text-zinc-400 bg-zinc-400/10'
  }
}

function getUpdateTypeIcon(type: string): string {
  switch (type) {
    case 'funding':
      return '💰'
    case 'executive':
      return '👔'
    case 'product':
      return '🚀'
    case 'layoff':
      return '📉'
    case 'news':
      return '📰'
    default:
      return '•'
  }
}

export default function CompanyCard({ data, cached }: CompanyCardProps) {
  const [inPortfolio, setInPortfolio] = useState(false)

  useEffect(() => {
    setInPortfolio(isInPortfolio(data.id))
  }, [data.id])

  const handlePortfolioToggle = () => {
    if (inPortfolio) {
      removeFromPortfolio(data.id)
      setInPortfolio(false)
    } else {
      addToPortfolio(data.id)
      setInPortfolio(true)
    }
  }

  return (
    <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
              {data.name}
            </h2>
            <p className="text-zinc-400 mt-1">{data.description}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(data.status)}`}
          >
            {data.status}
          </span>
        </div>
      </div>

      {/* Valuation */}
      <div className="p-6 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Valuation
        </h3>
        <div className="text-3xl font-bold text-white">
          {formatValuation(data.valuation.low)} - {formatValuation(data.valuation.high)}
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span>{getConfidenceIndicator(data.valuation.confidence)}</span>
          <span className={getConfidenceColor(data.valuation.confidence)}>
            {data.valuation.confidence.charAt(0).toUpperCase() +
              data.valuation.confidence.slice(1)}{' '}
            confidence
          </span>
          {data.valuation.sources.length > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">
                Sources: {data.valuation.sources.slice(0, 2).join(', ')}
              </span>
            </>
          )}
        </div>
        {data.valuation.asOf && (
          <p className="text-xs text-zinc-500 mt-1">
            As of: {new Date(data.valuation.asOf).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Recent Updates */}
      {data.updates && data.updates.length > 0 && (
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent Updates
          </h3>
          <ul className="space-y-2">
            {data.updates.slice(0, 4).map((update, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span>{getUpdateTypeIcon(update.type)}</span>
                <span className="text-zinc-500 flex-shrink-0">
                  {new Date(update.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-zinc-300">- {update.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signals */}
      {data.signals && (data.signals.employees || data.signals.hiring || data.signals.glassdoor) && (
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Signals
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            {data.signals.employees && (
              <span>
                Employees: <span className="text-white">~{data.signals.employees.toLocaleString()}</span>
              </span>
            )}
            {data.signals.hiring && (
              <span>
                Hiring: <span className="text-white">{data.signals.hiring} open roles</span>
              </span>
            )}
            {data.signals.glassdoor && (
              <span>
                Glassdoor: <span className="text-white">{data.signals.glassdoor}/5</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePortfolioToggle}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inPortfolio
                ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {inPortfolio ? '✓ In Portfolio' : '+ Add to Portfolio'}
          </button>
          <a
            href={`https://forgeglobal.com/search?q=${encodeURIComponent(data.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Forge →
          </a>
          <a
            href={`https://equityzen.com/search/?q=${encodeURIComponent(data.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            EquityZen →
          </a>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500">
            ⚠️ Estimates from public sources. Verify before making investment decisions.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Data refreshed: {formatTimeAgo(data.lastRefreshed)}
            {cached && ' (cached)'}
          </p>
        </div>
      </div>
    </div>
  )
}
