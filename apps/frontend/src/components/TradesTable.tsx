import React from 'react';

interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  size: string;
  entryPrice: string;
  exitPrice?: string;
  pnl?: string;
  pnlPct?: number;
  status: 'OPEN' | 'CLOSED';
  time: string;
  leverage: number;
}

const MOCK_TRADES: Trade[] = [
  { id: '1', symbol: 'BTC/USD', side: 'BUY', size: '0.05', entryPrice: '44,820.00', exitPrice: '45,230.50', pnl: '+$20.53', pnlPct: 0.92, status: 'CLOSED', time: '14:32', leverage: 3 },
  { id: '2', symbol: 'ETH/USD', side: 'SELL', size: '0.8', entryPrice: '2,910.00', exitPrice: '2,845.20', pnl: '+$51.84', pnlPct: 2.23, status: 'CLOSED', time: '13:15', leverage: 2 },
  { id: '3', symbol: 'SOL/USD', side: 'BUY', size: '5', entryPrice: '142.40', exitPrice: undefined, pnl: '+$14.50', pnlPct: 2.04, status: 'OPEN', time: '12:48', leverage: 5 },
  { id: '4', symbol: 'BTC/USD', side: 'SELL', size: '0.03', entryPrice: '45,600.00', exitPrice: '45,100.00', pnl: '+$15.00', pnlPct: 1.10, status: 'CLOSED', time: '11:20', leverage: 2 },
  { id: '5', symbol: 'ETH/USD', side: 'BUY', size: '1.2', entryPrice: '2,780.00', exitPrice: '2,720.00', pnl: '-$72.00', pnlPct: -2.16, status: 'CLOSED', time: '10:05', leverage: 3 },
  { id: '6', symbol: 'SOL/USD', side: 'SELL', size: '10', entryPrice: '148.20', exitPrice: '144.80', pnl: '+$34.00', pnlPct: 2.29, status: 'CLOSED', time: '09:42', leverage: 4 },
];

interface TradesTableProps {
  trades?: Trade[];
  limit?: number;
}

export default function TradesTable({ trades = MOCK_TRADES, limit }: TradesTableProps) {
  const displayTrades = limit ? trades.slice(0, limit) : trades;

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
          {displayTrades.map((trade) => (
            <tr key={trade.id}>
              <td>
                <span style={{ fontWeight: 600, color: '#111827' }}>{trade.symbol}</span>
              </td>
              <td>
                <span className={trade.side === 'BUY' ? 'badge badge-buy' : 'badge badge-sell'}>
                  {trade.side}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#374151' }}>{trade.size}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#374151' }}>${trade.entryPrice}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#374151' }}>
                  {trade.exitPrice ? `$${trade.exitPrice}` : '—'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                {trade.pnl && (
                  <div>
                    <span
                      className="num"
                      style={{
                        fontWeight: 700,
                        color: (trade.pnlPct ?? 0) >= 0 ? '#10B981' : '#EF4444',
                        display: 'block',
                      }}
                    >
                      {trade.pnl}
                    </span>
                    <span
                      className="num"
                      style={{
                        fontSize: 10,
                        color: (trade.pnlPct ?? 0) >= 0 ? '#10B981' : '#EF4444',
                      }}
                    >
                      {(trade.pnlPct ?? 0) >= 0 ? '+' : ''}{trade.pnlPct?.toFixed(2)}%
                    </span>
                  </div>
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
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{trade.time}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
