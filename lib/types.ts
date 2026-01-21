export interface CompanyData {
  id: string;
  name: string;
  description: string;

  valuation: {
    low: number;
    high: number;
    confidence: 'high' | 'medium' | 'low' | 'unknown';
    sources: string[];
    asOf: string;
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

  lastRefreshed: string;
  refreshCount: number;
}

export interface PortfolioPosition {
  companyId: string;
  addedAt: string;
  shares?: number;
  costBasis?: number;
  notes?: string;
}

export interface Portfolio {
  positions: PortfolioPosition[];
}

export interface LookupResponse {
  cached: boolean;
  data: CompanyData;
}

export interface LookupRequest {
  company: string;
}
