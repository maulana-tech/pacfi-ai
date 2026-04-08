import bs58 from 'bs58';

interface PacificaOrderRequest {
  account: string;
  symbol: string;
  side: 'bid' | 'ask';
  amount: string;
  price?: string;
  leverage?: number;
  tif?: 'GTC' | 'IOC' | 'FOK';
  reduce_only?: boolean;
  client_order_id?: string;
}

interface PacificaOrderResponse {
  order_id: string;
  status: string;
  symbol: string;
  side: string;
  amount: string;
  price: string;
  filled_amount: string;
  timestamp: number;
}

export class PacificaClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Create a signed order request
   */
  async createOrder(order: PacificaOrderRequest): Promise<PacificaOrderResponse> {
    const endpoint = order.price ? '/orders/create-limit' : '/orders/create-market';

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(`Pacifica API error: ${error.message}`);
    }

    return response.json() as Promise<PacificaOrderResponse>;
  }

  /**
   * Get user positions
   */
  async getPositions(walletAddress: string): Promise<any[]> {
    const response = await fetch(`${this.apiUrl}/positions?account=${walletAddress}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }

    return response.json() as Promise<any[]>;
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/market/${symbol}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch market data for ${symbol}`);
    }

    return response.json();
  }

  /**
   * Get order history
   */
  async getOrderHistory(
    walletAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const response = await fetch(
      `${this.apiUrl}/orders?account=${walletAddress}&limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch order history');
    }

    return response.json() as Promise<any[]>;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, walletAddress: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ account: walletAddress }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel order');
    }

    return response.json();
  }

  /**
   * Get funding rates for a symbol
   */
  async getFundingRate(symbol: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/funding-rate/${symbol}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch funding rate for ${symbol}`);
    }

    return response.json();
  }

  /**
   * Get available symbols
   */
  async getSymbols(): Promise<string[]> {
    const response = await fetch(`${this.apiUrl}/symbols`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch symbols');
    }

    const data = (await response.json()) as { symbols?: string[] };
    return data.symbols || [];
  }
}

export default PacificaClient;
