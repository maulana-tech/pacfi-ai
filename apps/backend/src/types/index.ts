export interface User {
  id: string;
  email: string;
  username: string;
  pacificaApiKey: string;
  pacificaApiSecret: string;
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  createdAt: Date;
  updatedAt: Date;
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
  updatedAt: Date;
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
  closedAt?: Date;
  aiReasoning?: string;
}

export interface AILog {
  id: string;
  userId: string;
  tradeId?: string;
  agentName: string;
  agentModel: string;
  inputContext: string;
  outputDecision: string;
  confidence?: number;
  timestamp: Date;
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

export interface WalletUser {
  walletAddress: string;
  createdAt: Date;
  lastActive: Date;
}
