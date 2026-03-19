import React from 'react';
import PriceChart from './PriceChart';
import SwarmStatus from './SwarmStatus';
import TradesTable from './TradesTable';

const stats = [
  {
    label: 'Total Balance',
    value: '$24,582.50',
    change: '+12.5%',
    positive: true,
    sub: 'vs last month',
  },
  {
    label: 'Open P&L',
    value: '+$14.50',
    change: '+2.04%',
    positive: true,
    sub: '1 open position',
  },
  {
    label: 'AI Win Rate',
    value: '68.5%',
    change: '+5.3%',
    positive: true,
    sub: 'Last 30 days',
  },
  {
    label: 'Total Trades',
    value: '142',
    change: '+18',
    positive: true,
    sub: 'This month',
  },
];

const openPositions = [
  {
    symbol: 'SOL/USD',
    side: 'LONG',
    size: '5',
    entry: '$142.40',
    mark: '$145.30',
    pnl: '+$14.50',
    pnlPct: '+2.04%',
    liq: '$98.20',
    leverage: 5,
  },
];

export default function DashboardContent() {
  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        {stats.map((s) => (
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

      {/* Main content: chart + swarm */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <PriceChart symbol="BTC/USD" currentPrice={45230.5} change24h={2.34} />
        <SwarmStatus />
      </div>

      {/* Open Positions */}
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
            {openPositions.length} Active
          </span>
        </div>
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
              {openPositions.map((pos, i) => (
                <tr key={i}>
                  <td><span style={{ fontWeight: 600, color: '#111827' }}>{pos.symbol}</span></td>
                  <td>
                    <span className={pos.side === 'LONG' ? 'badge badge-buy' : 'badge badge-sell'}>
                      {pos.side}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num">{pos.size}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num">{pos.entry}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num">{pos.mark}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num" style={{ fontWeight: 700, color: '#10B981' }}>
                      {pos.pnl}
                    </span>
                    <span className="num" style={{ display: 'block', fontSize: 10, color: '#10B981' }}>
                      {pos.pnlPct}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num" style={{ color: '#EF4444' }}>{pos.liq}</span>
                  </td>
                  <td>
                    <span className="num" style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
                      {pos.leverage}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trades */}
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
          <a
            href="/portfolio"
            style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}
          >
            View all
          </a>
        </div>
        <TradesTable limit={5} />
      </div>
    </div>
  );
}
