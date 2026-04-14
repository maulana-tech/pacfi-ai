import React, { useEffect, useState } from 'react';
import { useWalletContext } from './WalletConnect';

// ─── Icons ────────────────────────────────────────────────────────────────────

const TrophyIcon = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 10.5c-2.21 0-4-1.79-4-4V2h8v4.5c0 2.21-1.79 4-4 4Z"
      stroke={color}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M4 4H2a1 1 0 0 0-1 1v.5a2.5 2.5 0 0 0 2.5 2.5H4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M12 4h2a1 1 0 0 1 1 1v.5a2.5 2.5 0 0 1-2.5 2.5H12" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8 10.5V13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M5.5 14h5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const MedalIcon = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="9.5" r="4.5" stroke={color} strokeWidth="1.4" />
    <path d="M5.5 1.5 8 4l2.5-2.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 4v1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8 7.5v1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const TrendUpIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <polyline points="1,10 5,6 7.5,8 13,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="9.5,3 13,3 13,6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendDownIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <polyline points="1,4 5,8 7.5,6 13,11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="9.5,11 13,11 13,7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WalletIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="9.5" cy="9" r="1" fill="currentColor" />
  </svg>
);

const CoinsIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <circle cx="5.5" cy="8" r="4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8.5 3a4 4 0 0 1 0 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M5.5 6v4M3.5 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const BarChartIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="1" y="8" width="3" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    <rect x="5.5" y="4.5" width="3" height="8.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    <rect x="10" y="1.5" width="3" height="11.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const ActivityIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <polyline points="1,7 4,7 5.5,2.5 7,11.5 8.5,5 10,9 11.5,7 13,7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M12.5 2.5v4h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 11.5v-4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.5 6.5A5.5 5.5 0 0 0 3.4 3.4L1.5 7.5M1.5 7.5A5.5 5.5 0 0 0 10.6 10.6l1.9-4.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ClockIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SignalIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="1.5" fill="currentColor" />
    <path d="M2.5 9.5a5 5 0 0 1 0-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M9.5 9.5a5 5 0 0 0 0-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const ChevronDownIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username: string | null;
  pnl: number;
  equity: number;
  volume: number;
  openInterest: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

type SortBy = 'pnl' | 'equity' | 'volume';
type Period = 'all' | '30d' | '7d' | '1d';

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

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatUsd = (value: number) => {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
};

const formatUsdPlain = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const shortWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

const sortLabel = (s: SortBy) =>
  s === 'equity' ? 'Equity' : s === 'volume' ? 'Volume' : 'PnL';

const periodLabel = (p: Period) =>
  p === '1d' ? '24h' : p === '7d' ? '7D' : p === '30d' ? '30D' : 'All-time';

// ─── Rank badge ───────────────────────────────────────────────────────────────

const RANK_STYLES: Record<number, { bg: string; border: string; color: string; cardBg: string; cardBorder: string }> = {
  1: { bg: '#FEF3C7', border: '#F59E0B', color: '#B45309', cardBg: '#FFFBEB', cardBorder: '#FCD34D' },
  2: { bg: '#F1F5F9', border: '#94A3B8', color: '#475569', cardBg: '#F8FAFC', cardBorder: '#CBD5E1' },
  3: { bg: '#FDF4EE', border: '#D97706', color: '#92400E', cardBg: '#FFFAF5', cardBorder: '#FCA97C' },
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 8,
          background: RANK_STYLES[1].bg,
          border: `1px solid ${RANK_STYLES[1].border}`,
          color: RANK_STYLES[1].color,
          flexShrink: 0,
        }}
      >
        <TrophyIcon color={RANK_STYLES[1].color} size={14} />
      </span>
    );
  }
  if (rank <= 3) {
    const s = RANK_STYLES[rank];
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 8,
          background: s.bg,
          border: `1px solid ${s.border}`,
          color: s.color,
          flexShrink: 0,
        }}
      >
        <MedalIcon color={s.color} size={14} />
      </span>
    );
  }
  return (
    <span
      className="num"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 8,
        background: '#F3F4F6',
        fontSize: 12,
        fontWeight: 700,
        color: '#9CA3AF',
        flexShrink: 0,
      }}
    >
      {rank}
    </span>
  );
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchLeaderboard(
  sortBy: SortBy,
  period: Period,
  walletAddress: string | null,
  cursor: string | null,
  timeoutMs = 8000,
): Promise<LeaderboardPage> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    if (walletAddress) headers['X-Wallet-Address'] = walletAddress;
    const query = new URLSearchParams({ limit: '25', sortBy, period });
    if (cursor) query.set('cursor', cursor);
    const res = await fetch(`${API_BASE}/dashboard/leaderboard?${query}`, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const payload = (await res.json()) as ApiEnvelope<LeaderboardPage>;
    if (!payload.success) throw new Error(payload.error ?? 'Unknown API error');
    return payload.data;
  } finally {
    window.clearTimeout(timeout);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaderboardContent() {
  const { walletAddress } = useWalletContext();
  const [sortBy, setSortBy] = useState<SortBy>('pnl');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setEntries([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchLeaderboard(sortBy, period, walletAddress, nextCursor);
      setEntries((prev) => [...prev, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
      setHasMore(page.pageInfo.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard();
  }, [sortBy, period, walletAddress]);

  const topThree = entries.slice(0, 3);

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Leaderboard</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: '#059669',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 5,
                padding: '2px 7px',
              }}
            >
              <SignalIcon size={11} />
              Live · Pacifica
            </span>
            {lastUpdated && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#9CA3AF',
                }}
              >
                <ClockIcon size={11} />
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => void loadLeaderboard()}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshIcon size={13} />
          Refresh
        </button>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#991B1B',
          }}
        >
          <span>{error}</span>
          <button
            className="btn btn-sm"
            onClick={() => void loadLeaderboard()}
            style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Top 3 podium ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {loading && entries.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ minHeight: 140 }}>
                <div className="skeleton" style={{ height: 28, width: 28, borderRadius: 8, marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 12, width: '55%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 11, width: '40%', marginBottom: 16 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="skeleton" style={{ height: 32, borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 32, borderRadius: 6 }} />
                </div>
              </div>
            ))
          : topThree.length === 0
            ? (
              <div
                className="card"
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: 13,
                  padding: '32px 20px',
                }}
              >
                No leaderboard data yet.
              </div>
            )
            : topThree.map((entry) => {
              const rs = RANK_STYLES[entry.rank] ?? null;
              return (
                <div
                  key={`${entry.rank}-${entry.walletAddress}`}
                  className="card"
                  style={{
                    background: rs?.cardBg ?? '#FFFFFF',
                    border: `1px solid ${rs?.cardBorder ?? '#E5E7EB'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Rank + wallet */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <RankBadge rank={entry.rank} />
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: '#9CA3AF',
                        fontFamily: 'monospace',
                      }}
                    >
                      <WalletIcon size={11} />
                      {shortWallet(entry.walletAddress)}
                    </span>
                  </div>

                  {/* Display name */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                    {entry.username || shortWallet(entry.walletAddress)}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* PnL */}
                    <div
                      style={{
                        background: entry.pnl >= 0 ? '#F0FDF4' : '#FFF1F2',
                        border: `1px solid ${entry.pnl >= 0 ? '#BBF7D0' : '#FECDD3'}`,
                        borderRadius: 7,
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: 4,
                        }}
                      >
                        {entry.pnl >= 0
                          ? <span style={{ color: '#10B981' }}><TrendUpIcon size={11} /></span>
                          : <span style={{ color: '#EF4444' }}><TrendDownIcon size={11} /></span>
                        }
                        PnL
                      </div>
                      <div
                        className="num"
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: entry.pnl >= 0 ? '#059669' : '#DC2626',
                        }}
                      >
                        {formatUsd(entry.pnl)}
                      </div>
                    </div>

                    {/* Equity */}
                    <div
                      style={{
                        background: '#F9FAFB',
                        border: '1px solid #F3F4F6',
                        borderRadius: 7,
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: 4,
                        }}
                      >
                        <CoinsIcon size={11} />
                        Equity
                      </div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
                        {formatUsdPlain(entry.equity)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* ── Table card ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Table toolbar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span className="card-title">All Traders</span>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Period filter */}
            <div
              style={{
                display: 'flex',
                background: '#F3F4F6',
                borderRadius: 7,
                padding: 3,
                gap: 2,
              }}
            >
              {(['all', '30d', '7d', '1d'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setPeriod(v)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    background: period === v ? '#FFFFFF' : 'transparent',
                    color: period === v ? '#111827' : '#9CA3AF',
                    boxShadow: period === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {periodLabel(v)}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />

            {/* Sort filter */}
            <div
              style={{
                display: 'flex',
                background: '#F3F4F6',
                borderRadius: 7,
                padding: 3,
                gap: 2,
              }}
            >
              {(['pnl', 'equity', 'volume'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSortBy(v)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    background: sortBy === v ? '#FFFFFF' : 'transparent',
                    color: sortBy === v ? '#2563EB' : '#9CA3AF',
                    boxShadow: sortBy === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {v === 'pnl' && <TrendUpIcon size={11} />}
                  {v === 'equity' && <CoinsIcon size={11} />}
                  {v === 'volume' && <BarChartIcon size={11} />}
                  {sortLabel(v)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table body */}
        {loading && entries.length === 0 ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
                <div className="skeleton" style={{ width: 120, height: 12, borderRadius: 4 }} />
                <div className="skeleton" style={{ flex: 1, height: 12, borderRadius: 4, marginLeft: 'auto', maxWidth: 300 }} />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
            No traders found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Trader</th>
                  <th style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <TrendUpIcon size={11} />
                      PnL ({periodLabel(period)})
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <CoinsIcon size={11} />
                      Equity
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <BarChartIcon size={11} />
                      Volume ({periodLabel(period)})
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <ActivityIcon size={11} />
                      Open Interest
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isMe = entry.walletAddress === walletAddress;
                  return (
                    <tr
                      key={`${entry.rank}-${entry.walletAddress}`}
                      style={{ background: isMe ? '#EFF6FF' : undefined }}
                    >
                      {/* Rank */}
                      <td>
                        <RankBadge rank={entry.rank} />
                      </td>

                      {/* Trader */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: isMe ? '#DBEAFE' : '#F3F4F6',
                              border: `1px solid ${isMe ? '#93C5FD' : '#E5E7EB'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              color: isMe ? '#2563EB' : '#9CA3AF',
                            }}
                          >
                            <WalletIcon size={13} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: isMe ? '#2563EB' : '#111827',
                              }}
                            >
                              {entry.username || shortWallet(entry.walletAddress)}
                              {isMe && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#2563EB',
                                    background: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: '#9CA3AF',
                                fontFamily: 'monospace',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {shortWallet(entry.walletAddress)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PnL */}
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: entry.pnl >= 0 ? '#059669' : '#DC2626',
                          }}
                        >
                          {entry.pnl >= 0 ? <TrendUpIcon size={12} /> : <TrendDownIcon size={12} />}
                          <span className="num" style={{ fontWeight: 700, fontSize: 13 }}>
                            {formatUsd(entry.pnl)}
                          </span>
                        </div>
                      </td>

                      {/* Equity */}
                      <td style={{ textAlign: 'right' }}>
                        <span className="num" style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>
                          {formatUsdPlain(entry.equity)}
                        </span>
                      </td>

                      {/* Volume */}
                      <td style={{ textAlign: 'right' }}>
                        <span className="num" style={{ color: '#6B7280', fontSize: 13 }}>
                          {formatUsdPlain(entry.volume)}
                        </span>
                      </td>

                      {/* OI */}
                      <td style={{ textAlign: 'right' }}>
                        <span className="num" style={{ color: '#9CA3AF', fontSize: 13 }}>
                          {formatUsdPlain(entry.openInterest)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && entries.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {entries.length} traders
            </span>
            {hasMore ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {loadingMore ? (
                  'Loading...'
                ) : (
                  <>
                    Load more
                    <ChevronDownIcon size={13} />
                  </>
                )}
              </button>
            ) : (
              <span style={{ fontSize: 11, color: '#D1D5DB' }}>End of list</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
