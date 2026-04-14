const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

export const BUILDER_CODE_REGEX = /^[a-zA-Z0-9]{1,16}$/;
export const FEE_RATE_REGEX = /^\d+(\.\d+)?$/;

type BuilderOperationType =
  | 'approve_builder_code'
  | 'revoke_builder_code'
  | 'update_builder_code_fee_rate';

type OrderOperationType = 'create_market_order' | 'create_order';

export type BuilderApproval = {
  builder_code: string;
  max_fee_rate?: string;
};

export type AgentStatus = {
  enabled: boolean;
  agentWallet: string | null;
  managedAccount: string | null;
};

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }

  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortJsonKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

export function buildMessageToSign(payload: Record<string, unknown>): string {
  return JSON.stringify(sortJsonKeys(payload));
}

export async function pacificaRequest<T>(
  path: string,
  walletAddress: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': walletAddress,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Request failed');
  }

  return (payload.data ?? payload) as T;
}

export function buildBuilderSigningPayload(
  type: BuilderOperationType,
  data: Record<string, unknown>,
  timestamp: number,
  expiryWindow: number = 5000
) {
  return {
    timestamp,
    expiry_window: expiryWindow,
    type,
    data,
  };
}

export function buildOrderSigningPayload(
  type: OrderOperationType,
  data: Record<string, unknown>,
  timestamp: number,
  expiryWindow: number = 30000
) {
  return {
    timestamp,
    expiry_window: expiryWindow,
    type,
    data,
  };
}

export function isValidBuilderCode(value: string): boolean {
  return BUILDER_CODE_REGEX.test(value);
}

export function isValidFeeRate(value: string): boolean {
  if (!FEE_RATE_REGEX.test(value)) {
    return false;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export async function fetchBuilderApprovals(walletAddress: string): Promise<BuilderApproval[]> {
  const data = await pacificaRequest<{ approvals: BuilderApproval[] }>(
    '/builder/approvals',
    walletAddress,
    { method: 'GET' }
  );

  return Array.isArray(data.approvals) ? data.approvals : [];
}

export async function fetchAgentStatus(): Promise<AgentStatus> {
  const data = await fetch(`${API_BASE}/agent/status`);
  const payload = await data.json();

  if (!data.ok || payload.success === false) {
    throw new Error(payload.error || 'Failed to fetch agent status');
  }

  return payload.data as AgentStatus;
}

// Market data types and fetching
export type MarketData = {
  price: number;
  change: number;      // 24h change percentage
  high: number;        // 24h high
  low: number;         // 24h low
  volume: string;      // Volume display string
  fundingRate: string; // Funding rate display string
};

export type MarketDataMap = Record<string, MarketData>;

// Cache for market data (5 second TTL for real-time responsiveness)
let marketDataCache: {
  data: MarketDataMap;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5000; // 5 seconds

const DEFAULT_MARKET_DATA: MarketDataMap = {
  BTC: {
    price: 45230.5,
    change: 2.34,
    high: 45890,
    low: 44120,
    volume: '$2.4B',
    fundingRate: '0.0082%',
  },
  ETH: {
    price: 2845.2,
    change: -1.12,
    high: 2920,
    low: 2800,
    volume: '$1.1B',
    fundingRate: '-0.0031%',
  },
  SOL: {
    price: 145.3,
    change: 4.21,
    high: 148,
    low: 138.5,
    volume: '$380M',
    fundingRate: '0.0120%',
  },
};

/**
 * Fetch real-time market data from Pacifica
 * Falls back to mock data if API is unavailable
 */
export async function fetchPacificaMarketData(
  symbols: string[] = ['BTC', 'ETH', 'SOL'],
  forceRefresh: boolean = false
): Promise<MarketDataMap> {
  // Return cached data if fresh and not forcing refresh
  if (!forceRefresh && marketDataCache && Date.now() - marketDataCache.timestamp < CACHE_TTL_MS) {
    return marketDataCache.data;
  }

  try {
    // Fetch from backend endpoint that aggregates Pacifica market data
    const response = await fetch(`${API_BASE}/orders/market-data?symbols=${symbols.join(',')}`);
    
    if (!response.ok) {
      throw new Error('Market data API failed');
    }

    const payload = await response.json();
    
    if (payload.success === false || !payload.data) {
      throw new Error('Invalid market data response');
    }

    const marketData: MarketDataMap = payload.data;

    // Update cache
    marketDataCache = {
      data: marketData,
      timestamp: Date.now(),
    };

    return marketData;
  } catch (error) {
    console.warn('Failed to fetch real-time market data from Pacifica, using fallback:', error);
    
    // Return cached data if available, otherwise fallback to mock
    if (marketDataCache) {
      return marketDataCache.data;
    }

    // Use mock data as final fallback
    return DEFAULT_MARKET_DATA;
  }
}
