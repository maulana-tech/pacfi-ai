import React, { useState, useEffect, useCallback } from 'react';

const API_URL = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3001';

interface Trade {
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

function fmtPrice(n: number): string {
  if (n === 0) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

interface TradesTableProps {
  walletAddress?: string | null;
  limit?: number;
}

export default function TradesTable({ walletAddress, limit = 25 }: TradesTableProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!walletAddress) {
      setTrades([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/trades?limit=${limit}`, {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrades(json.data);
      } else {
        setError(json.error ?? 'Failed to load trades');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, limit]);

  useEffect(() => {
    void fetchTrades();
  }, [fetchTrades]);

  if (!walletAddress) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
        Connect your wallet to view trade history.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 40, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{error}</div>
        <button
          onClick={fetchTrades}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#334155' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
        No trades yet. Place your first order on the Trading page.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th style={{ textAlign: 'right' }}>Size</th>
            <th style={{ textAlign: 'right' }}>Entry</th>
            <th style={{ textAlign: 'right' }}>Exit</th>
            <th style={{ textAlign: 'right' }}>P&L</th>
            <th>Status</th>
            <th>Lev.</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td>
                <span style={{ fontWeight: 600, color: '#111827' }}>{trade.symbol}</span>
              </td>
              <td>
                <span className={trade.side === 'BUY' ? 'badge badge-buy' : 'badge badge-sell'}>
                  {trade.side === 'BUY' ? 'Long' : 'Short'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#374151' }}>{trade.size}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#374151' }}>${fmtPrice(trade.entryPrice)}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#374151' }}>
                  {trade.exitPrice ? `$${fmtPrice(trade.exitPrice)}` : '—'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                {trade.pnl !== null ? (
                  <div>
                    <span className="num" style={{ fontWeight: 700, color: trade.pnl >= 0 ? '#10B981' : '#EF4444', display: 'block' }}>
                      {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
                    </span>
                    {trade.pnlPct !== null && (
                      <span className="num" style={{ fontSize: 10, color: trade.pnlPct >= 0 ? '#10B981' : '#EF4444' }}>
                        {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#94A3B8', fontSize: 12 }}>Open</span>
                )}
              </td>
              <td>
                <span className={trade.status === 'OPEN' ? 'badge badge-open' : 'badge badge-closed'}>
                  {trade.status}
                </span>
              </td>
              <td>
                <span className="num" style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  {trade.leverage}x
                </span>
              </td>
              <td>
                <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {fmtTime(trade.executedAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
