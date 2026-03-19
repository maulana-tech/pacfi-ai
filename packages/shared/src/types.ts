export interface User {
  id: string;
  email: string;
  username: string;
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  createdAt: Date;
}

export interface Portfolio {
  id: string;
  userId: string;
  totalBalance: number;
  availableBalance: number;
  totalPnL: number;
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  leverage: number;
  pnl?: number;
  roi?: number;
  status: 'OPEN' | 'CLOSED';
  executedAt: Date;
}

export interface SwarmDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  positionSize?: number;
  leverage?: number;
  stopLossPct?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
  timestamp: Date;
}
