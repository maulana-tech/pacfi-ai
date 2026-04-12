import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PriceChart from './PriceChart';
import SwarmStatus, { SwarmAgentStatus } from './SwarmStatus';
import TradesTable from './TradesTable';
import { useWalletContext } from './WalletConnect';

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
  totalROI: number;
  winRate: number;
  totalTrades: number;
  updatedAt: string;
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

  const chartPosition = positions[0];
  const chartSymbol = chartPosition?.symbol ?? 'BTC/USD';
  const chartPrice = chartPosition?.markPrice ?? 0;
  const chartChange = chartPosition?.pnlPct ?? 0;

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
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!isConnected && (
        <div
          className="card"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            fontSize: 13,
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
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 12,
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
                style={{ color: s.positive ? '#10B981' : '#EF4444' }}
              >
                {s.change}
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <PriceChart symbol={chartSymbol} currentPrice={chartPrice} change24h={chartChange} />
        <SwarmStatus
          agents={swarm.agents}
          lastRun={swarm.lastRun}
          loading={loading}
          onRefresh={() => void loadDashboard()}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">Top Traders</span>
          <a href="/leaderboard" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>
            Open leaderboard
          </a>
        </div>
        {leaderboardTeaser.length === 0 ? (
          <div style={{ padding: 20, fontSize: 13, color: '#9CA3AF' }}>
            No leaderboard data yet.
          </div>
        ) : (
          <div
            style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
          >
            {leaderboardTeaser.map((entry) => (
              <div
                key={`${entry.rank}-${entry.walletAddress}`}
                style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>
                    #{entry.rank}
                  </span>
                  <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                    {formatPercent(entry.totalROI)}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  {entry.username || shortWallet(entry.walletAddress)}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                  Win rate {entry.winRate.toFixed(1)}% | {entry.totalTrades} trades
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">Open Positions</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#2563EB',
              background: '#EFF6FF',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {positions.length} Active
          </span>
        </div>

        {positions.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: '#9CA3AF' }}>No open positions.</div>
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
                      <span style={{ fontWeight: 600, color: '#111827' }}>{pos.symbol}</span>
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
                        style={{ fontWeight: 700, color: pos.pnl >= 0 ? '#10B981' : '#EF4444' }}
                      >
                        {formatCurrency(pos.pnl)}
                      </span>
                      <span
                        className="num"
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: pos.pnlPct >= 0 ? '#10B981' : '#EF4444',
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
                        style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}
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
            padding: '14px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">Recent Trades</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <a href="/portfolio" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>
              View all
            </a>
          </div>
        </div>
        {mappedTrades.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: '#9CA3AF' }}>No recent trades.</div>
        ) : (
          <TradesTable trades={mappedTrades} />
        )}
      </div>
    </div>
  );
}
