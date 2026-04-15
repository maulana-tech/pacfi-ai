import { MarketData } from '../types';

export interface PacificaLeaderboardEntry {
  address: string;
  username: string | null;
  pnl_1d: string;
  pnl_7d: string;
  pnl_30d: string;
  pnl_all_time: string;
  equity_current: string;
  oi_current: string;
  volume_1d: string;
  volume_7d: string;
  volume_30d: string;
  volume_all_time: string;
}

/**
 * Pacifica API Client
 * Handles order creation and market data fetching
 * Testnet: https://test-api.pacifica.fi/api/v1
 * Mainnet: https://api.pacifica.fi/api/v1
 */
export class PacificaClient {
  private baseUrl: string;
  private marketInfoCache: {
    data: any[];
    expiresAt: number;
  } | null = null;
  private readonly marketInfoTtlMs = 60_000;

  constructor() {
    // Default to Pacifica testnet unless explicitly overridden.
    this.baseUrl = (process.env.PACIFICA_BASE_URL || 'https://test-api.pacifica.fi/api/v1').replace(
      /\/$/,
      ''
    );
  }

  private static normalizeSymbolInput(symbol: string): string {
    return symbol
      .trim()
      .toUpperCase()
      .replace('/USDC', '')
      .replace('/USD', '')
      .replace('-USDC', '')
      .replace('-USD', '');
  }

  private async getMarketInfoCached(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && this.marketInfoCache && this.marketInfoCache.expiresAt > Date.now()) {
      return this.marketInfoCache.data;
    }

    const data = await this.request<any[]>('/info');
    const normalized = Array.isArray(data) ? data : [];
    this.marketInfoCache = {
      data: normalized,
      expiresAt: Date.now() + this.marketInfoTtlMs,
    };
    return normalized;
  }

  async resolveSymbol(symbol: string): Promise<string> {
    const base = PacificaClient.normalizeSymbolInput(symbol);
    const requested = symbol.trim().toUpperCase();
    const candidates = Array.from(new Set([requested, `${base}-USDC`, `${base}-USD`, base]));

    try {
      const info = await this.getMarketInfoCached();
      if (!info.length) {
        return candidates[0];
      }

      const exact = new Map(
        info
          .filter((item) => item?.symbol)
          .map((item) => [String(item.symbol).toUpperCase(), String(item.symbol)])
      );

      for (const candidate of candidates) {
        const found = exact.get(candidate);
        if (found) return found;
      }

      const prefixed = info.find((item) =>
        String(item?.symbol ?? '')
          .toUpperCase()
          .startsWith(`${base}-`)
      );
      if (prefixed?.symbol) {
        return String(prefixed.symbol);
      }
    } catch {
      // Fallback to raw candidate if /info is temporarily unavailable.
    }

    return candidates[0];
  }

  private async requestWithSymbolFallback<T>(
    symbol: string,
    buildPath: (resolvedSymbol: string) => string
  ): Promise<T> {
    const base = PacificaClient.normalizeSymbolInput(symbol);
    const resolved = await this.resolveSymbol(symbol);
    const candidates = Array.from(
      new Set([resolved, symbol.trim().toUpperCase(), `${base}-USDC`, base])
    );

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        return await this.request<T>(buildPath(candidate));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to fetch Pacifica symbol data');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      let errText: string;
      try {
        const errJson = (await response.json()) as any;
        // Pacifica errors may be { error: "...", message: "..." } or { detail: "..." }
        errText = errJson?.error ?? errJson?.message ?? errJson?.detail ?? JSON.stringify(errJson);
      } catch {
        errText = await response.text().catch(() => response.statusText);
      }
      throw new Error(`Pacifica ${response.status}: ${errText}`);
    }

    const json: any = await response.json();

    if (json.success === false) {
      const msg = json.error ?? json.message ?? json.detail ?? 'Unknown error';
      throw new Error(`Pacifica error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }

    return json.data ?? json;
  }

  /**
   * Get all market prices
   * Use /info endpoint which includes market data
   */
  async getPrices(): Promise<any> {
    try {
      const data = await this.request<any[]>('/info');
      return data;
    } catch (error) {
      console.error('[PacificaClient] Error fetching prices:', error);
      throw error;
    }
  }

  /**
   * Get market info (all available trading pairs)
   * Endpoint: GET /api/v1/info
   */
  async getMarketInfo(): Promise<any> {
    try {
      return await this.getMarketInfoCached();
    } catch (error) {
      console.error('[PacificaClient] Error fetching market info:', error);
      throw error;
    }
  }

  /**
   * Get orderbook for a symbol
   */
  async getOrderbook(
    symbol: string,
    aggLevel: number = 1
  ): Promise<{
    symbol: string;
    bids: Array<{ price: string; amount: string; orders: number }>;
    asks: Array<{ price: string; amount: string; orders: number }>;
    timestamp: number;
  }> {
    try {
      const data = await this.requestWithSymbolFallback<any>(
        symbol,
        (resolvedSymbol) =>
          `/book?symbol=${encodeURIComponent(resolvedSymbol)}&agg_level=${aggLevel}`
      );
      return {
        symbol: data.s,
        bids:
          data.l?.[0]?.map((p: { p: string; a: string; n: number }) => ({
            price: p.p,
            amount: p.a,
            orders: p.n,
          })) || [],
        asks:
          data.l?.[1]?.map((p: { p: string; a: string; n: number }) => ({
            price: p.p,
            amount: p.a,
            orders: p.n,
          })) || [],
        timestamp: data.t,
      };
    } catch (error) {
      console.error('[PacificaClient] Error fetching orderbook:', error);
      throw error;
    }
  }

  /**
   * Get recent trades for a symbol
   */
  async getRecentTrades(symbol: string): Promise<
    Array<{
      eventType: string;
      price: string;
      amount: string;
      side: string;
      cause: string;
      createdAt: number;
    }>
  > {
    try {
      const data = await this.requestWithSymbolFallback<any[]>(
        symbol,
        (resolvedSymbol) => `/trades?symbol=${encodeURIComponent(resolvedSymbol)}`
      );
      return data.map((t) => ({
        eventType: t.event_type,
        price: t.price,
        amount: t.amount,
        side: t.side,
        cause: t.cause,
        createdAt: t.created_at,
      }));
    } catch (error) {
      console.error('[PacificaClient] Error fetching recent trades:', error);
      throw error;
    }
  }

  /**
   * Get candle data (OHLCV)
   */
  async getCandleData(symbol: string, interval: string = '1m', limit: number = 100): Promise<any> {
    try {
      return await this.requestWithSymbolFallback<any>(
        symbol,
        (resolvedSymbol) =>
          `/candles?symbol=${encodeURIComponent(resolvedSymbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
      );
    } catch (error) {
      console.error('[PacificaClient] Error fetching candle data:', error);
      throw error;
    }
  }

  /**
   * Get historical funding
   */
  async getFundingHistory(symbol: string): Promise<any> {
    try {
      return await this.requestWithSymbolFallback<any>(
        symbol,
        (resolvedSymbol) => `/markets/funding?symbol=${encodeURIComponent(resolvedSymbol)}`
      );
    } catch (error) {
      console.error('[PacificaClient] Error fetching funding history:', error);
      throw error;
    }
  }

  /**
   * Create market order
   * Signature must be generated by wallet on frontend
   */
  async createMarketOrder(
    walletAddress: string,
    symbol: string,
    side: 'bid' | 'ask',
    amount: string,
    signature: string,
    timestamp: number,
    agentWallet?: string,
    clientOrderId?: string,
    builderCode?: string,
    leverage?: number
  ): Promise<any> {
    const resolvedSymbol = await this.resolveSymbol(symbol);
    const body: Record<string, unknown> = {
      account: walletAddress,
      agent_wallet: agentWallet ?? null,
      signature,
      timestamp,
      expiry_window: 30000,
      symbol: resolvedSymbol,
      side,
      amount,
      slippage_percent: '0.5',
      reduce_only: false,
      client_order_id: clientOrderId,
      builder_code: builderCode,
    };
    if (leverage && leverage > 0) {
      body.leverage = leverage;
    }

    try {
      return await this.request('/orders/create_market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('[PacificaClient] Error creating market order:', error);
      throw error;
    }
  }

  /**
   * Create limit order
   * Signature must be generated by wallet on frontend
   */
  async createLimitOrder(
    walletAddress: string,
    symbol: string,
    side: 'bid' | 'ask',
    amount: string,
    price: string,
    signature: string,
    timestamp: number,
    agentWallet?: string,
    clientOrderId?: string,
    builderCode?: string,
    leverage?: number
  ): Promise<any> {
    const resolvedSymbol = await this.resolveSymbol(symbol);
    const body: Record<string, unknown> = {
      account: walletAddress,
      agent_wallet: agentWallet ?? null,
      signature,
      timestamp,
      expiry_window: 30000,
      symbol: resolvedSymbol,
      side,
      amount,
      price,
      tif: 'GTC',
      reduce_only: false,
      client_order_id: clientOrderId,
      builder_code: builderCode,
    };
    if (leverage && leverage > 0) {
      body.leverage = leverage;
    }

    try {
      return await this.request('/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('[PacificaClient] Error creating limit order:', error);
      throw error;
    }
  }

  /**
   * Get market data
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const resolvedSymbol = await this.resolveSymbol(symbol);
      const data = await this.request<Record<string, string>>(
        `/markets/${encodeURIComponent(resolvedSymbol)}`
      );

      return {
        symbol: resolvedSymbol,
        price: parseFloat(data.price),
        volume24h: parseFloat(data.volume24h),
        fundingRate: parseFloat(data.fundingRate),
        openInterest: parseFloat(data.openInterest),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[PacificaClient] Error fetching market data:', error);
      throw error;
    }
  }

  /**
   * Get account positions
   * Endpoint: GET /positions?account=...
   * Note: Pacifica only accepts standard Solana addresses (44 chars)
   */
  async getPositions(walletAddress: string): Promise<any> {
    try {
      if (walletAddress.length > 50) {
        console.warn('[PacificaClient] Address too long for Pacifica API, returning empty');
        return [];
      }
      return await this.request(`/positions?account=${walletAddress}`);
    } catch (error: any) {
      if (error.message?.includes('Wrong address size')) {
        console.warn('[PacificaClient] Invalid address for Pacifica, returning empty');
        return [];
      }
      console.error('[PacificaClient] Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   * Endpoint: GET /account/balance?account=...
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      if (walletAddress.length > 50) {
        console.warn('[PacificaClient] Address too long for Pacifica API, returning 0');
        return 0;
      }
      const data = await this.request<{ totalBalance: string }>(
        `/account/balance?account=${walletAddress}`
      );
      return parseFloat(data.totalBalance);
    } catch (error: any) {
      if (error.message?.includes('Wrong address size') || error.message?.includes('Not found')) {
        console.warn('[PacificaClient] Invalid address for Pacifica, returning 0');
        return 0;
      }
      console.error('[PacificaClient] Error fetching balance:', error);
      return 0;
    }
  }

  async approveBuilderCode(
    walletAddress: string,
    signature: string,
    timestamp: number,
    builderCode: string,
    maxFeeRate: string,
    expiryWindow: number = 5000
  ): Promise<any> {
    return this.request('/account/builder_codes/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletAddress,
        agent_wallet: null,
        signature,
        timestamp,
        expiry_window: expiryWindow,
        builder_code: builderCode,
        max_fee_rate: maxFeeRate,
      }),
    });
  }

  async getBuilderApprovals(walletAddress: string): Promise<any[]> {
    return this.request(`/account/builder_codes/approvals?account=${walletAddress}`);
  }

  async revokeBuilderCode(
    walletAddress: string,
    signature: string,
    timestamp: number,
    builderCode: string,
    expiryWindow: number = 5000
  ): Promise<any> {
    return this.request('/account/builder_codes/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletAddress,
        agent_wallet: null,
        signature,
        timestamp,
        expiry_window: expiryWindow,
        builder_code: builderCode,
      }),
    });
  }

  /**
   * Get global leaderboard from Pacifica
   * Endpoint: GET /api/v1/leaderboard
   */
  async getLeaderboard(): Promise<PacificaLeaderboardEntry[]> {
    try {
      const data = await this.request<PacificaLeaderboardEntry[]>('/leaderboard');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[PacificaClient] Error fetching leaderboard:', error);
      throw error;
    }
  }

  async updateBuilderFeeRate(
    walletAddress: string,
    signature: string,
    timestamp: number,
    builderCode: string,
    feeRate: string,
    expiryWindow: number = 5000
  ): Promise<any> {
    return this.request('/builder/update_fee_rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletAddress,
        agent_wallet: null,
        signature,
        timestamp,
        expiry_window: expiryWindow,
        builder_code: builderCode,
        fee_rate: feeRate,
      }),
    });
  }
}
