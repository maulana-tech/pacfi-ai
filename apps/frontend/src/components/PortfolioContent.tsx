import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import TradesTable from './TradesTable';
import { useWalletContext } from './WalletConnect';

interface PortfolioData {
  totalBalance: number;
  availableBalance: number;
  totalPnL: number;
  openPnl: number;
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalTrades: number;
  allocation: { name: string; value: number; color: string }[];
  equityCurve: { date: string; equity: number }[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

function formatUSD(value: number, showSign = false): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortfolioContent() {
  const { walletAddress, isConnected } = useWalletContext();
  const [tab, setTab] = useState<'history' | 'performance'>('history');
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    if (!isConnected || !walletAddress) {
      setLoading(false);
      setError('Connect your wallet to view portfolio.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_URL}/dashboard/portfolio`, {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      const json = (await res.json()) as ApiEnvelope<PortfolioData>;
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error ?? 'Failed to load portfolio.');
      }
    } catch {
      setError('Network error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      return;
    }
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [isConnected, walletAddress]);

  if (!isConnected) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p style={{ color: '#92400E', marginBottom: 12, fontSize: 14 }}>Connect your wallet to view portfolio.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error ?? 'No data.'}</p>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={fetchPortfolio}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const openPnlPct = data.totalBalance > 0 ? (data.openPnl / data.totalBalance) * 100 : 0;

  const stats = [
    {
      label: 'Total Balance',
      value: formatUSD(data.totalBalance),
      sub: `${formatUSD(data.totalPnL, true)} all time`,
    },
    {
      label: 'Realized P&L',
      value: formatUSD(data.totalPnL, true),
      sub: 'All time',
    },
    {
      label: 'Unrealized P&L',
      value: formatUSD(data.openPnl, true),
      sub: `${openPnlPct >= 0 ? '+' : ''}${openPnlPct.toFixed(2)}% of balance`,
    },
    {
      label: 'Available Margin',
      value: formatUSD(data.availableBalance),
      sub: `${data.totalBalance > 0 ? Math.round((data.availableBalance / data.totalBalance) * 100) : 0}% of balance`,
    },
  ];

  const performanceMetrics = [
    { label: 'Total Return', value: `${data.totalROI >= 0 ? '+' : ''}${data.totalROI.toFixed(1)}%`, positive: data.totalROI >= 0 },
    { label: 'Sharpe Ratio', value: data.sharpeRatio.toFixed(2), positive: data.sharpeRatio >= 0 },
    { label: 'Max Drawdown', value: `-${data.maxDrawdown.toFixed(1)}%`, positive: false },
    { label: 'Win Rate', value: `${data.winRate.toFixed(1)}%`, positive: data.winRate >= 50 },
    { label: 'Avg. Win', value: formatUSD(data.avgWin, true), positive: true },
    { label: 'Avg. Loss', value: formatUSD(data.avgLoss, true), positive: false },
    { label: 'Profit Factor', value: data.profitFactor.toFixed(2), positive: data.profitFactor >= 1 },
    { label: 'Total Trades', value: String(data.totalTrades), positive: true },
  ];

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value num">{s.value}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Equity curve + allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Equity Curve</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last 30 days</span>
          </div>
          <div style={{ height: 180 }}>
            {data.equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.equityCurve} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']}
                    contentStyle={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#2563EB" strokeWidth={1.5} fill="url(#equityGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: 13 }}>
                No trade history yet
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Allocation</span>
          </div>
          {data.allocation.length > 0 ? (
            <>
              <div style={{ height: 120, marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.allocation} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                      {data.allocation.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.allocation.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: '#374151' }}>{item.name}</span>
                    </div>
                    <span className="num" style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#9CA3AF', fontSize: 13 }}>
              No open positions
            </div>
          )}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Performance Metrics</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {performanceMetrics.map((m) => (
            <div
              key={m.label}
              style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F3F4F6' }}
            >
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {m.label}
              </div>
              <div className="num" style={{ fontSize: 16, fontWeight: 800, color: m.positive ? '#10B981' : '#EF4444' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade history */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
          {(['history', 'performance'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: tab === t ? '#EFF6FF' : 'transparent',
                color: tab === t ? '#2563EB' : '#9CA3AF',
                transition: 'all 0.15s',
              }}
            >
              {t === 'history' ? 'Trade History' : 'AI Performance'}
            </button>
          ))}
        </div>
        {tab === 'history' && <TradesTable walletAddress={walletAddress} limit={50} />}
        {tab === 'performance' && (
          <div style={{ padding: '20px', color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
            AI performance breakdown coming soon
          </div>
        )}
      </div>
    </div>
  );
}
