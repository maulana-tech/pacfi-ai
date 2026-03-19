import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Generate mock OHLCV data
function generateMockData(points = 60) {
  const data = [];
  let price = 45000 + Math.random() * 5000;
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 800;
    price = Math.max(30000, price + change);
    const ts = new Date(now - i * 15 * 60 * 1000);
    data.push({
      time: ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      price: parseFloat(price.toFixed(2)),
    });
  }
  return data;
}

const PERIODS = ['1H', '4H', '1D', '1W', '1M'];

interface PriceChartProps {
  symbol?: string;
  currentPrice?: number;
  change24h?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: '8px 12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
        }}
      >
        <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{label}</p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#111827',
            fontFamily: 'monospace',
          }}
        >
          ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function PriceChart({ symbol = 'BTC/USD', currentPrice = 45230.5, change24h = 2.34 }: PriceChartProps) {
  const [activePeriod, setActivePeriod] = useState('1H');
  const data = generateMockData(60);
  const isPositive = change24h >= 0;
  const strokeColor = isPositive ? '#10B981' : '#EF4444';
  const fillColor = isPositive ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)';

  return (
    <div className="card" style={{ padding: '20px 20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: '#F7931A',
                borderRadius: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: '#FFF' }}>₿</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{symbol}</span>
            <span
              className="badge"
              style={{
                background: '#F3F4F6',
                color: '#6B7280',
                fontSize: 10,
                padding: '2px 6px',
              }}
            >
              PERP
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              className="num"
              style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}
            >
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isPositive ? '#10B981' : '#EF4444',
              }}
            >
              {isPositive ? '+' : ''}{change24h}%
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: '#F3F4F6',
            borderRadius: 6,
            padding: 3,
          }}
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activePeriod === p ? '#FFFFFF' : 'transparent',
                color: activePeriod === p ? '#111827' : '#9CA3AF',
                boxShadow: activePeriod === p ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.12} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval={11}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
