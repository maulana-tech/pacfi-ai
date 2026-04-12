import React, { useEffect, useState } from 'react';
import { useWalletContext } from './WalletConnect';

interface LeaderboardEntry {
  rank: number;
  globalRank: number | null;
  walletAddress: string;
  username?: string | null;
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

type SortBy = 'roi' | 'winRate' | 'trades' | 'sharpe';
type Period = 'all' | '30d' | '7d';

interface LeaderboardPage {
  items: LeaderboardEntry[];
  pageInfo: {
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:3001';

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const shortWallet = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

const sortLabel = (sortBy: SortBy) => {
  if (sortBy === 'roi') return 'ROI';
  if (sortBy === 'winRate') return 'Win Rate';
  if (sortBy === 'trades') return 'Trades';
  return 'Sharpe';
};

async function fetchLeaderboard(
  sortBy: SortBy,
  period: Period,
  walletAddress: string | null,
  cursor: string | null,
  timeoutMs = 8000
): Promise<LeaderboardPage> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {};
    if (walletAddress) {
      headers['X-Wallet-Address'] = walletAddress;
    }

    const query = new URLSearchParams({
      limit: '20',
      sortBy,
      period,
    });
    if (cursor) {
      query.set('cursor', cursor);
    }

    const response = await fetch(`${API_BASE}/dashboard/leaderboard?${query.toString()}`, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = (await response.json()) as ApiEnvelope<LeaderboardPage>;
    if (!payload.success) {
      throw new Error(payload.error ?? 'Unknown API error');
    }

    return payload.data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function LeaderboardContent() {
  const { walletAddress } = useWalletContext();
  const [sortBy, setSortBy] = useState<SortBy>('roi');
  const [period, setPeriod] = useState<Period>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await fetchLeaderboard(sortBy, period, walletAddress, null);
      setEntries(page.items);
      setNextCursor(page.pageInfo.nextCursor);
      setHasMore(page.pageInfo.hasMore);
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load leaderboard');
      setEntries([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchLeaderboard(sortBy, period, walletAddress, nextCursor);
      setEntries((prev) => [...prev, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
      setHasMore(page.pageInfo.hasMore);
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load more leaderboard');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard();
  }, [sortBy, period, walletAddress]);

  const topThree = entries.slice(0, 3);

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '10px 16px', fontSize: 12, color: '#6B7280' }}>
        Ranking by <strong>{sortLabel(sortBy)}</strong>
        <span style={{ marginLeft: 8 }}>
          for{' '}
          <strong>
            {period === 'all' ? 'all-time' : period === '30d' ? 'last 30D' : 'last 7D'}
          </strong>
        </span>
        {lastUpdated && (
          <span style={{ marginLeft: 8, color: '#9CA3AF' }}>
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div
          className="card"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 12,
          }}
        >
          Failed to refresh leaderboard. {error}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void loadLeaderboard()}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {loading && topThree.length === 0 ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card" style={{ minHeight: 124 }}>
              <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 14, width: '75%', marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 10, width: '100%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: '66%' }} />
            </div>
          ))
        ) : topThree.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', color: '#9CA3AF', fontSize: 13 }}>
            No leaderboard data yet.
          </div>
        ) : (
          topThree.map((entry) => (
            <div
              key={`${entry.rank}-${entry.walletAddress}`}
              className="card"
              style={{
                border: entry.rank === 1 ? '1px solid #FCD34D' : '1px solid #E5E7EB',
                background: entry.rank === 1 ? '#FFFBEB' : '#FFFFFF',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <span
                  className="num"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: entry.rank <= 3 ? '#D97706' : '#6B7280',
                  }}
                >
                  #{entry.rank}
                </span>
                {entry.globalRank && (
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>Global #{entry.globalRank}</span>
                )}
              </div>
              <div
                style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}
              >
                {entry.username || shortWallet(entry.walletAddress)}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 10 }}>
                {shortWallet(entry.walletAddress)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>
                    ROI
                  </div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>
                    {formatPercent(entry.totalROI)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>
                    Win Rate
                  </div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
                    {entry.winRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span className="card-title">All Traders</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', '30d', '7d'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    background: period === value ? '#ECFDF5' : '#F3F4F6',
                    color: period === value ? '#059669' : '#9CA3AF',
                    transition: 'all 0.15s',
                  }}
                >
                  {value === 'all' ? 'All-time' : value.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['roi', 'winRate', 'trades', 'sharpe'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    background: sortBy === value ? '#EFF6FF' : '#F3F4F6',
                    color: sortBy === value ? '#2563EB' : '#9CA3AF',
                    transition: 'all 0.15s',
                  }}
                >
                  {sortLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && entries.length === 0 ? (
          <div style={{ padding: 20 }}>
            <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 14, width: '100%' }} />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: '#9CA3AF' }}>No traders found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Trader</th>
                  <th style={{ textAlign: 'right' }}>ROI</th>
                  <th style={{ textAlign: 'right' }}>Win Rate</th>
                  <th style={{ textAlign: 'right' }}>Sharpe</th>
                  <th style={{ textAlign: 'right' }}>Trades</th>
                  <th style={{ textAlign: 'right' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.rank}-${entry.walletAddress}`}>
                    <td>
                      <span className="num" style={{ fontWeight: 700, color: '#6B7280' }}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                          {entry.username || shortWallet(entry.walletAddress)}
                        </span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                          {shortWallet(entry.walletAddress)}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num" style={{ fontWeight: 700, color: '#10B981' }}>
                        {formatPercent(entry.totalROI)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num" style={{ fontWeight: 600, color: '#374151' }}>
                        {entry.winRate.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num" style={{ color: '#6B7280' }}>
                        {entry.sharpeRatio.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num" style={{ color: '#6B7280' }}>
                        {entry.totalTrades}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {new Date(entry.updatedAt).toLocaleTimeString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && entries.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              Showing {entries.length} traders
            </span>
            {hasMore ? (
              <button className="btn btn-ghost btn-sm" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            ) : (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>End of list</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
