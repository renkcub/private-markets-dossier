'use client'

import { useState, useEffect } from 'react'
import SearchBox from '@/components/SearchBox'
import CompanyCard from '@/components/CompanyCard'
import { CompanyData, LookupResponse } from '@/lib/types'
import { getPortfolio } from '@/lib/portfolio'
import Link from 'next/link'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ data: CompanyData; cached: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [portfolioCount, setPortfolioCount] = useState(0)

  useEffect(() => {
    const updateCount = () => {
      const portfolio = getPortfolio()
      setPortfolioCount(portfolio.positions.length)
    }

    updateCount()

    // Update count when localStorage changes
    window.addEventListener('storage', updateCount)
    // Also check periodically for same-tab changes
    const interval = setInterval(updateCount, 1000)

    return () => {
      window.removeEventListener('storage', updateCount)
      clearInterval(interval)
    }
  }, [])

  const handleSearch = async (company: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup company')
      }

      const lookupResponse: LookupResponse = data
      setResult({
        data: lookupResponse.data,
        cached: lookupResponse.cached,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight">
            PRIVATE MARKETS DOSSIER
          </h1>
          {portfolioCount > 0 && (
            <Link
              href="/portfolio"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              View My Portfolio ({portfolioCount} {portfolioCount === 1 ? 'company' : 'companies'})
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero section when no result */}
        {!result && !isLoading && !error && (
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Research Private Companies
            </h2>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Get valuation estimates, recent news, and key signals for private companies.
              Built for angel investors.
            </p>
          </div>
        )}

        {/* Search box */}
        <div className="flex justify-center mb-8">
          <SearchBox onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-400">Researching company...</p>
            <p className="text-xs text-zinc-600 mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-center">
              <p className="text-red-400">{error}</p>
              <p className="text-sm text-zinc-500 mt-2">
                Check spelling or try the full company name.
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="flex justify-center">
            <CompanyCard data={result.data} cached={result.cached} />
          </div>
        )}

        {/* Portfolio link at bottom when there's a result */}
        {result && portfolioCount > 0 && (
          <div className="text-center mt-8">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <span>View My Portfolio ({portfolioCount} {portfolioCount === 1 ? 'company' : 'companies'})</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
