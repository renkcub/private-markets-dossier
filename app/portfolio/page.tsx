'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPortfolio, removeFromPortfolio } from '@/lib/portfolio'
import { CompanyData, PortfolioPosition } from '@/lib/types'
import { formatTimeAgo, formatValuation } from '@/lib/utils'

interface PortfolioItem {
  position: PortfolioPosition
  company: CompanyData | null
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPortfolio() {
      const portfolio = getPortfolio()
      const loadedItems: PortfolioItem[] = []

      for (const position of portfolio.positions) {
        try {
          const response = await fetch('/api/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company: position.companyId }),
          })
          const data = await response.json()
          loadedItems.push({
            position,
            company: data.data || null,
          })
        } catch {
          loadedItems.push({ position, company: null })
        }
      }

      setItems(loadedItems)
      setLoading(false)
    }

    loadPortfolio()
  }, [])

  const handleRemove = (companyId: string) => {
    removeFromPortfolio(companyId)
    setItems(items.filter((item) => item.position.companyId !== companyId))
  }

  const getConfidenceIndicator = (confidence: string) => {
    switch (confidence) {
      case 'high': return '🟢'
      case 'medium': return '🟡'
      case 'low': return '🟠'
      default: return '⚪'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black">
        <header className="border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link href="/" className="text-xl font-bold text-white tracking-tight">
              PRIVATE MARKETS DOSSIER
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            PRIVATE MARKETS DOSSIER
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            + Add Company
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Portfolio</h1>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 mb-4">No companies in your portfolio yet.</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Search Companies
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Valuation Est.</th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Confidence</th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Updated</th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.position.companyId}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/portfolio/${item.position.companyId}`}
                  >
                    <td className="py-4">
                      <Link href={`/portfolio/${item.position.companyId}`} className="text-white font-medium hover:underline">
                        {item.company?.name || item.position.companyId}
                      </Link>
                    </td>
                    <td className="py-4 text-zinc-300">
                      {item.company
                        ? `${formatValuation(item.company.valuation.low)} - ${formatValuation(item.company.valuation.high)}`
                        : '-'}
                    </td>
                    <td className="py-4">
                      {item.company && (
                        <span className="flex items-center gap-2">
                          {getConfidenceIndicator(item.company.valuation.confidence)}
                          <span className="text-zinc-400 capitalize">
                            {item.company.valuation.confidence}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      {item.company && (
                        <span className="text-zinc-400 capitalize">{item.company.status}</span>
                      )}
                    </td>
                    <td className="py-4 text-zinc-500">
                      {item.company ? formatTimeAgo(item.company.lastRefreshed) : '-'}
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleRemove(item.position.companyId)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
