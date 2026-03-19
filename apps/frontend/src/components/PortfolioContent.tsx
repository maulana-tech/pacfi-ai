import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import TradesTable from './TradesTable';

const ALLOCATION = [
  { name: 'BTC/USD', value: 45, color: '#F7931A' },
  { name: 'ETH/USD', value: 28, color: '#627EEA' },
  { name: 'SOL/USD', value: 18, color: '#9945FF' },
  { name: 'Others', value: 9, color: '#E5E7EB' },
];

const EQUITY_DATA = (() => {
  const data = [];
  let equity = 20000;
  for (let i = 30; i >= 0; i--) {
    const change = (Math.random() - 0.42) * 600;
    equity = Math.max(15000, equity + change);
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      equity: parseFloat(equity.toFixed(2)),
    });
  }
  return data;
})();

const PERFORMANCE = [
  { label: 'Total Return', value: '+22.9%', positive: true },
  { label: 'Sharpe Ratio', value: '1.84', positive: true },
  { label: 'Max Drawdown', value: '-8.2%', positive: false },
  { label: 'Win Rate', value: '68.5%', positive: true },
  { label: 'Avg. Win', value: '+$42.30', positive: true },
  { label: 'Avg. Loss', value: '-$18.60', positive: false },
  { label: 'Profit Factor', value: '2.27', positive: true },
  { label: 'Total Trades', value: '142', positive: true },
];

export default function PortfolioContent() {
  const [tab, setTab] = useState<'history' | 'performance'>('history');

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Balance', value: '$24,582.50', sub: '+$4,582.50 all time' },
          { label: 'Realized P&L', value: '+$4,568.00', sub: 'All time' },
          { label: 'Unrealized P&L', value: '+$14.50', sub: '1 open position' },
          { label: 'Available Margin', value: '$18,450.00', sub: '75% of balance' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value num">{s.value}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Equity curve + allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        {/* Equity curve */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Equity Curve</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last 30 days</span>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={EQUITY_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
          </div>
        </div>

        {/* Allocation */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Allocation</span>
          </div>
          <div style={{ height: 120, marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ALLOCATION} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                  {ALLOCATION.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ALLOCATION.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: '#374151' }}>{item.name}</span>
                </div>
                <span className="num" style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Performance Metrics</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {PERFORMANCE.map((m) => (
            <div
              key={m.label}
              style={{
                padding: '12px 14px',
                background: '#F9FAFB',
                borderRadius: 8,
                border: '1px solid #F3F4F6',
              }}
            >
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {m.label}
              </div>
              <div
                className="num"
                style={{ fontSize: 16, fontWeight: 800, color: m.positive ? '#10B981' : '#EF4444' }}
              >
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
        {tab === 'history' && <TradesTable />}
        {tab === 'performance' && (
          <div style={{ padding: '20px', color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
            AI performance breakdown coming soon
          </div>
        )}
      </div>
    </div>
  );
}
