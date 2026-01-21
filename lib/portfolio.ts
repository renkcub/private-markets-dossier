'use client'

import { Portfolio, PortfolioPosition } from './types'

const STORAGE_KEY = 'private-markets-portfolio'

export function getPortfolio(): Portfolio {
  if (typeof window === 'undefined') {
    return { positions: [] }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }

  return { positions: [] }
}

export function savePortfolio(portfolio: Portfolio): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio))
}

export function addToPortfolio(companyId: string): PortfolioPosition {
  const portfolio = getPortfolio()

  // Check if already in portfolio
  const existing = portfolio.positions.find((p) => p.companyId === companyId)
  if (existing) {
    return existing
  }

  const position: PortfolioPosition = {
    companyId,
    addedAt: new Date().toISOString(),
  }

  portfolio.positions.push(position)
  savePortfolio(portfolio)

  return position
}

export function removeFromPortfolio(companyId: string): void {
  const portfolio = getPortfolio()
  portfolio.positions = portfolio.positions.filter((p) => p.companyId !== companyId)
  savePortfolio(portfolio)
}

export function isInPortfolio(companyId: string): boolean {
  const portfolio = getPortfolio()
  return portfolio.positions.some((p) => p.companyId === companyId)
}

export function updatePosition(
  companyId: string,
  updates: Partial<Omit<PortfolioPosition, 'companyId' | 'addedAt'>>
): void {
  const portfolio = getPortfolio()
  const position = portfolio.positions.find((p) => p.companyId === companyId)

  if (position) {
    Object.assign(position, updates)
    savePortfolio(portfolio)
  }
}

export function getPosition(companyId: string): PortfolioPosition | undefined {
  const portfolio = getPortfolio()
  return portfolio.positions.find((p) => p.companyId === companyId)
}
