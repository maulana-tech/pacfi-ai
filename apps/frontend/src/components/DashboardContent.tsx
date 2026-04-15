import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PriceChart from './PriceChart';
import SwarmStatus, { SwarmAgentStatus } from './SwarmStatus';
import TradesTable from './TradesTable';
import { useWalletContext } from './WalletConnect';
import { fetchPacificaMarketData, type MarketData, type MarketDataMap } from '../lib/pacifica';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'XRP', 'DOGE', 'WLD'] as const;
type Symbol = (typeof SYMBOLS)[number];

const COIN_CONFIG: Record<string, { bg: string; char: string }> = {
  BTC: { bg: '#F7931A', char: 'B' },
  ETH: { bg: '#627EEA', char: 'E' },
  SOL: { bg: '#9945FF', char: 'S' },
  AVAX: { bg: '#E84142', char: 'A' },
  LINK: { bg: '#2A5ADA', char: 'L' },
  XRP: { bg: '#00AAE4', char: 'X' },
  DOGE: { bg: '#C2A633', char: 'D' },
  WLD: { bg: '#2D2D2D', char: 'W' },
};

const EMPTY_MARKET: MarketData = { price: 0, bid: 0, ask: 0, change: 0, high: 0, low: 0, volume: '$0', fundingRate: '--', maxLeverage: 10, minOrderSize: '10', lotSize: '0.001' };

interface DashboardSummary {
  totalBalance: number;
  openPnl: number;
  openPnlPct: number;
  winRate: number;
  totalTrades: number;
  openPositions: number;
}

interface DashboardPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPct: number;
  liquidationPrice: number;
  leverage: number;
}

interface DashboardTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  pnlPct: number | null;
  status: 'OPEN' | 'CLOSED';
  leverage: number;
  executedAt: string;
}

interface LeaderboardTeaserEntry {
  rank: number;
  walletAddress: string;
  username?: string | null;
  pnl: number;
  equity: number;
  volume: number;
  openInterest: number;
}

interface SwarmStatusResponse {
  agents: SwarmAgentStatus[];
  lastRun: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

type PanelKey = 'summary' | 'positions' | 'trades' | 'swarm' | 'leaderboard';

const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:3001';

const DEFAULT_SUMMARY: DashboardSummary = {
  totalBalance: 0,
  openPnl: 0,
  openPnlPct: 0,
  winRate: 0,
  totalTrades: 0,
  openPositions: 0,
};

const DEFAULT_SWARM_AGENTS: SwarmAgentStatus[] = [
  { id: 'market_analyst', name: 'Market Analyst', role: 'Technical Analysis', status: 'idle' },
  { id: 'sentiment_agent', name: 'Sentiment Agent', role: 'Market Sentiment', status: 'idle' },
  { id: 'risk_manager', name: 'Risk Manager', role: 'Position Sizing', status: 'idle' },
  { id: 'coordinator', name: 'Coordinator', role: 'Final Decision', status: 'idle' },
];

const formatCurrency = (value: number) => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const formatCompact = (value: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
};

const toTime = (iso: string) => {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortWallet = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

async function fetchDashboard<T>(
  path: string,
  walletAddress: string,
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'X-Wallet-Address': walletAddress,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!payload.success) {
      throw new Error(payload.error ?? 'Unknown API error');
    }

    return payload.data;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchWithRetry<T>(
  path: string,
  walletAddress: string,
  timeoutMs: number,
  retries: number
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchDashboard<T>(path, walletAddress, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export default function DashboardContent() {
  const { walletAddress, isConnected } = useWalletContext();

  const [selectedSymbol, setSelectedSymbol] = useState<Symbol>(() => {
    try {
      const stored = localStorage.getItem('pacfi_chart_symbol');
      return stored && SYMBOLS.includes(stored as Symbol) ? (stored as Symbol) : 'BTC';
    } catch {
      return 'BTC';
    }
  });
  const [marketDataMap, setMarketDataMap] = useState<MarketDataMap>({});

  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const [positions, setPositions] = useState<DashboardPosition[]>([]);
  const [trades, setTrades] = useState<DashboardTrade[]>([]);
  const [swarm, setSwarm] = useState<SwarmStatusResponse>({
    agents: DEFAULT_SWARM_AGENTS,
    lastRun: null,
  });
  const [leaderboardTeaser, setLeaderboardTeaser] = useState<LeaderboardTeaserEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelErrors, setPanelErrors] = useState<Partial<Record<PanelKey, string>>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRunningSwarm, setIsRunningSwarm] = useState(false);
  const [swarmError, setSwarmError] = useState<string | null>(null);

  // Sync symbol to localStorage so Trading page picks it up
  useEffect(() => {
    try { localStorage.setItem('pacfi_chart_symbol', selectedSymbol); } catch {}
  }, [selectedSymbol]);

  // Live market data for coin bar
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchPacificaMarketData(SYMBOLS as unknown as string[], true);
        if (!cancelled) setMarketDataMap(data);
      } catch {}
    };
    void load();
    const interval = window.setInterval(load, 8000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      setSummary(DEFAULT_SUMMARY);
      setPositions([]);
      setTrades([]);
      setSwarm({ agents: DEFAULT_SWARM_AGENTS, lastRun: null });
      setLeaderboardTeaser([]);
      setPanelErrors({});
      return;
    }

    setLoading(true);

    const nextErrors: Partial<Record<PanelKey, string>> = {};

    const panelJobs: Promise<void>[] = [
      fetchWithRetry<DashboardSummary>('/dashboard/summary', walletAddress, 7000, 1)
        .then((data) => setSummary(data))
        .catch((error) => {
          nextErrors.summary = error instanceof Error ? error.message : 'Failed to load summary';
        }),
      fetchWithRetry<DashboardPosition[]>('/dashboard/positions', walletAddress, 7000, 1)
        .then((data) => setPositions(data))
        .catch((error) => {
          nextErrors.positions =
            error instanceof Error ? error.message : 'Failed to load positions';
          setPositions([]);
        }),
      fetchWithRetry<DashboardTrade[]>('/dashboard/trades?limit=5', walletAddress, 7000, 1)
        .then((data) => setTrades(data))
        .catch((error) => {
          nextErrors.trades = error instanceof Error ? error.message : 'Failed to load trades';
          setTrades([]);
        }),
      fetchWithRetry<SwarmStatusResponse>('/dashboard/swarm-status', walletAddress, 7000, 0)
        .then((data) =>
          setSwarm({
            agents: data.agents?.length ? data.agents : DEFAULT_SWARM_AGENTS,
            lastRun: data.lastRun,
          })
        )
        .catch((error) => {
          nextErrors.swarm = error instanceof Error ? error.message : 'Failed to load swarm';
          setSwarm({ agents: DEFAULT_SWARM_AGENTS, lastRun: null });
        }),
      fetchWithRetry<LeaderboardTeaserEntry[]>(
        '/dashboard/leaderboard-teaser?limit=3',
        walletAddress,
        7000,
        0
      )
        .then((data) => setLeaderboardTeaser(data))
        .catch((error) => {
          nextErrors.leaderboard =
            error instanceof Error ? error.message : 'Failed to load leaderboard teaser';
          setLeaderboardTeaser([]);
        }),
    ];

    await Promise.all(panelJobs);

    setPanelErrors(nextErrors);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, [isConnected, walletAddress]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [isConnected, walletAddress, loadDashboard]);

  const runSwarm = useCallback(async () => {
    if (isRunningSwarm) return;
    setIsRunningSwarm(true);
    setSwarmError(null);

    // Show analyzing state immediately
    setSwarm((prev) => ({
      ...prev,
      agents: DEFAULT_SWARM_AGENTS.map((a) => ({ ...a, status: 'analyzing' as const })),
    }));

    try {
      const res = await fetch(`${API_BASE}/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, portfolioBalance: 10000, autoTrade: false }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        const { decision, marketContext } = result.data;
        const price = marketContext?.price ?? 0;
        const fundingRate = marketContext?.fundingRate ?? 0;
        const fundingPct = (fundingRate * 100).toFixed(4);

        setSwarm({
          agents: [
            { id: 'market_analyst', name: 'Market Analyst', role: 'Technical Analysis', status: 'done', decision: decision.action, confidence: Math.round(decision.confidence * 0.9), reasoning: price > 0 ? `Price: $${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : decision.reasoning },
            { id: 'sentiment_agent', name: 'Sentiment Agent', role: 'Market Sentiment', status: 'done', decision: decision.action, confidence: Math.round(decision.confidence * 0.85), reasoning: `Funding: ${fundingPct}%` },
            { id: 'risk_manager', name: 'Risk Manager', role: 'Position Sizing', status: 'done', decision: decision.action, confidence: Math.round(decision.confidence * 0.95), reasoning: decision.positionSize ? `Size: $${decision.positionSize} · Lev: ${decision.leverage ?? 1}x` : decision.reasoning },
            { id: 'coordinator', name: 'Coordinator', role: 'Final Decision', status: 'done', decision: decision.action, confidence: decision.confidence, reasoning: decision.reasoning },
          ],
          lastRun: new Date().toISOString(),
        });
      } else {
        setSwarmError(result.error ?? 'Analysis failed');
        setSwarm((prev) => ({ ...prev, agents: DEFAULT_SWARM_AGENTS }));
      }
    } catch {
      setSwarmError('Could not reach backend. Check server is running.');
      setSwarm((prev) => ({ ...prev, agents: DEFAULT_SWARM_AGENTS }));
    } finally {
      setIsRunningSwarm(false);
    }
  }, [isRunningSwarm, selectedSymbol]);

  const statCards = useMemo(
    () => [
      {
        label: 'Total Balance',
        value: formatCurrency(summary.totalBalance),
        change: formatPercent(summary.openPnlPct),
        positive: summary.openPnlPct >= 0,
        sub: 'open P&L impact',
      },
      {
        label: 'Open P&L',
        value: formatCurrency(summary.openPnl),
        change: formatPercent(summary.openPnlPct),
        positive: summary.openPnl >= 0,
        sub: `${summary.openPositions} open positions`,
      },
      {
        label: 'AI Win Rate',
        value: `${summary.winRate.toFixed(1)}%`,
        change: `${summary.totalTrades} trades`,
        positive: summary.winRate >= 50,
        sub: 'closed trade performance',
      },
      {
        label: 'Total Trades',
        value: `${summary.totalTrades}`,
        change: `${summary.openPositions}`,
        positive: true,
        sub: 'currently open',
      },
    ],
    [summary]
  );

  const activeMarket: MarketData = marketDataMap[selectedSymbol] ?? EMPTY_MARKET;
  const chartPrice = activeMarket.price;
  const chartChange = activeMarket.change;

  const mappedTrades = trades.map((trade) => ({
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    size: formatCompact(trade.size),
    entryPrice: formatCompact(trade.entryPrice),
    exitPrice: trade.exitPrice !== null ? formatCompact(trade.exitPrice) : undefined,
    pnl: trade.pnl !== null ? formatCurrency(trade.pnl) : undefined,
    pnlPct: trade.pnlPct ?? undefined,
    status: trade.status,
    leverage: Math.round(trade.leverage),
    time: toTime(trade.executedAt),
  }));

  const hasGlobalError = Object.keys(panelErrors).length > 0;

  return (
    <div
      className="grid-bg"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {!isConnected && (
        <div
          className="card"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Connect your wallet to load live dashboard data.
        </div>
      )}

      {hasGlobalError && (
        <div
          className="card"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            fontSize: 11,
          }}
        >
          Some panels failed to refresh. Retry to sync latest data.
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void loadDashboard()}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      <div
        className="dashboard-stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value num">{s.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span
                className="stat-change num"
                style={{ color: s.positive ? '#22C55E' : '#EF4444' }}
              >
                {s.change}
              </span>
              <span style={{ fontSize: 10, color: '#64748B' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Coin selector bar — synced with Trading page via localStorage */}
      <div className="card" style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SYMBOLS.map((sym) => {
            const cfg = COIN_CONFIG[sym];
            const md = marketDataMap[sym];
            const active = sym === selectedSymbol;
            return (
              <button
                key={sym}
                onClick={() => setSelectedSymbol(sym)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 12px',
                  borderRadius: 12,
                  border: active ? `1.5px solid ${cfg.bg}` : '1px solid #E2E8F0',
                  background: active ? `${cfg.bg}18` : '#F8FAFC',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.12s ease',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: cfg.bg,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {cfg.char}
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#0F172A' : '#334155' }}>{sym}</div>
                  {md && md.price > 0 ? (
                    <div className="num" style={{ fontSize: 10, fontWeight: 700, color: md.change >= 0 ? '#059669' : '#DC2626' }}>
                      {md.change >= 0 ? '+' : ''}{md.change.toFixed(2)}%
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>--</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <PriceChart symbol={selectedSymbol} currentPrice={chartPrice} change24h={chartChange} />
        <SwarmStatus
          agents={swarm.agents}
          lastRun={swarm.lastRun}
          loading={loading}
          isRunningSwarm={isRunningSwarm}
          swarmError={swarmError}
          onRunSwarm={() => void runSwarm()}
          onRefresh={() => void loadDashboard()}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">Top Traders</span>
          <a href="/leaderboard" style={{ fontSize: 11, color: '#2563EB', fontWeight: 700 }}>
            Open leaderboard
          </a>
        </div>
        {leaderboardTeaser.length === 0 ? (
          <div style={{ padding: 20, fontSize: 12, color: '#64748B' }}>
            No leaderboard data yet.
          </div>
        ) : (
          <div
            style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
          >
            {leaderboardTeaser.map((entry) => (
              <div
                key={`${entry.rank}-${entry.walletAddress}`}
                style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 12, background: '#F8FAFC' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                    #{entry.rank}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: entry.pnl >= 0 ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {entry.pnl >= 0 ? '+' : ''}$
                    {Math.abs(entry.pnl) >= 1000
                      ? `${(Math.abs(entry.pnl) / 1000).toFixed(1)}K`
                      : Math.abs(entry.pnl).toFixed(0)}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  {entry.username || shortWallet(entry.walletAddress)}
                </div>
                <div style={{ fontSize: 10, color: '#64748B' }}>
                  Equity $
                  {entry.equity >= 1_000_000
                    ? `${(entry.equity / 1_000_000).toFixed(1)}M`
                    : entry.equity >= 1_000
                      ? `${(entry.equity / 1_000).toFixed(0)}K`
                      : entry.equity.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">Open Positions</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#2563EB',
              background: '#EFF6FF',
              padding: '4px 8px',
              borderRadius: 999,
            }}
          >
            {positions.length} Active
          </span>
        </div>

        {positions.length === 0 ? (
          <div style={{ padding: 24, fontSize: 12, color: '#64748B' }}>No open positions.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th style={{ textAlign: 'right' }}>Size</th>
                  <th style={{ textAlign: 'right' }}>Entry Price</th>
                  <th style={{ textAlign: 'right' }}>Mark Price</th>
                  <th style={{ textAlign: 'right' }}>Unrealized P&L</th>
                  <th style={{ textAlign: 'right' }}>Liq. Price</th>
                  <th>Lev.</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={`${pos.symbol}-${pos.side}`}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{pos.symbol}</span>
                    </td>
                    <td>
                      <span
                        className={pos.side === 'LONG' ? 'badge badge-buy' : 'badge badge-sell'}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num">{formatCompact(pos.size)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num">{formatCurrency(pos.entryPrice)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num">{formatCurrency(pos.markPrice)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className="num"
                        style={{ fontWeight: 700, color: pos.pnl >= 0 ? '#22C55E' : '#EF4444' }}
                      >
                        {formatCurrency(pos.pnl)}
                      </span>
                      <span
                        className="num"
                        style={{
                          display: 'block',
                          fontSize: 9,
                          color: pos.pnlPct >= 0 ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {formatPercent(pos.pnlPct)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num" style={{ color: '#EF4444' }}>
                        {formatCurrency(pos.liquidationPrice)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="num"
                        style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}
                      >
                        {Math.round(pos.leverage)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">Recent Trades</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && (
              <span style={{ fontSize: 10, color: '#64748B' }}>
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <a href="/portfolio" style={{ fontSize: 11, color: '#2563EB', fontWeight: 700 }}>
              View all
            </a>
          </div>
        </div>
        {mappedTrades.length === 0 ? (
          <div style={{ padding: 24, fontSize: 12, color: '#64748B' }}>No recent trades.</div>
        ) : (
          <TradesTable trades={mappedTrades} />
        )}
      </div>

      <style>{`
        @media (max-width: 1180px) {
          .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .dashboard-chart-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .dashboard-stat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
