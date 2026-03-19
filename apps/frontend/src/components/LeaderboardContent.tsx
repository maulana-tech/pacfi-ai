import React, { useState } from 'react';

const TRADERS = [
  { rank: 1, address: '7xKp...3mNq', pnl: '+$48,230', pnlPct: '+241.2%', winRate: '74.2%', trades: 312, followers: 89, aiEnabled: true },
  { rank: 2, address: '3aRt...9bWx', pnl: '+$32,150', pnlPct: '+160.8%', winRate: '71.5%', trades: 245, followers: 64, aiEnabled: true },
  { rank: 3, address: '9mFv...2cLp', pnl: '+$28,900', pnlPct: '+144.5%', winRate: '69.8%', trades: 198, followers: 51, aiEnabled: false },
  { rank: 4, address: '5nHj...7dQs', pnl: '+$21,450', pnlPct: '+107.3%', winRate: '67.2%', trades: 176, followers: 38, aiEnabled: true },
  { rank: 5, address: '2kBm...4eYr', pnl: '+$18,720', pnlPct: '+93.6%', winRate: '65.9%', trades: 154, followers: 29, aiEnabled: true },
  { rank: 6, address: '8pCn...6fZt', pnl: '+$15,380', pnlPct: '+76.9%', winRate: '64.1%', trades: 132, followers: 22, aiEnabled: false },
  { rank: 7, address: '4qDs...1gAu', pnl: '+$12,640', pnlPct: '+63.2%', winRate: '62.8%', trades: 118, followers: 17, aiEnabled: true },
  { rank: 8, address: '6rEt...8hBv', pnl: '+$9,870', pnlPct: '+49.4%', winRate: '61.5%', trades: 97, followers: 12, aiEnabled: false },
  { rank: 9, address: '1sFu...5iCw', pnl: '+$7,230', pnlPct: '+36.2%', winRate: '60.2%', trades: 84, followers: 8, aiEnabled: true },
  { rank: 10, address: '0tGv...3jDx', pnl: '+$5,450', pnlPct: '+27.3%', winRate: '58.9%', trades: 71, followers: 5, aiEnabled: false },
];

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardContent() {
  const [sortBy, setSortBy] = useState<'pnl' | 'winRate' | 'trades'>('pnl');

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Top 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {TRADERS.slice(0, 3).map((trader) => (
          <div
            key={trader.rank}
            className="card"
            style={{
              border: trader.rank === 1 ? '1px solid #FCD34D' : '1px solid #E5E7EB',
              background: trader.rank === 1 ? '#FFFBEB' : '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>{MEDAL[trader.rank]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                  {trader.address}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                  {trader.aiEnabled && (
                    <span
                      className="badge"
                      style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 9 }}
                    >
                      AI Swarm
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{trader.followers} followers</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>Total P&L</div>
                <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>{trader.pnl}</div>
                <div className="num" style={{ fontSize: 11, color: '#10B981' }}>{trader.pnlPct}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>Win Rate</div>
                <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{trader.winRate}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{trader.trades} trades</div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 12 }}
            >
              Copy Trader
            </button>
          </div>
        ))}
      </div>

      {/* Full leaderboard */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="card-title">All Traders</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['pnl', 'winRate', 'trades'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 5,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  background: sortBy === s ? '#EFF6FF' : '#F3F4F6',
                  color: sortBy === s ? '#2563EB' : '#9CA3AF',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'pnl' ? 'P&L' : s === 'winRate' ? 'Win Rate' : 'Trades'}
              </button>
            ))}
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Trader</th>
              <th style={{ textAlign: 'right' }}>Total P&L</th>
              <th style={{ textAlign: 'right' }}>Return</th>
              <th style={{ textAlign: 'right' }}>Win Rate</th>
              <th style={{ textAlign: 'right' }}>Trades</th>
              <th>AI</th>
              <th>Followers</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {TRADERS.map((trader) => (
              <tr key={trader.rank}>
                <td>
                  <span
                    className="num"
                    style={{
                      fontWeight: 700,
                      color: trader.rank <= 3 ? '#F59E0B' : '#9CA3AF',
                      fontSize: trader.rank <= 3 ? 14 : 12,
                    }}
                  >
                    {trader.rank <= 3 ? MEDAL[trader.rank] : `#${trader.rank}`}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {trader.address}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontWeight: 700, color: '#10B981' }}>{trader.pnl}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontWeight: 600, color: '#10B981' }}>{trader.pnlPct}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontWeight: 600, color: '#374151' }}>{trader.winRate}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num" style={{ color: '#6B7280' }}>{trader.trades}</span>
                </td>
                <td>
                  {trader.aiEnabled ? (
                    <span className="badge badge-open" style={{ fontSize: 9 }}>AI</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#D1D5DB' }}>—</span>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{trader.followers}</span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
