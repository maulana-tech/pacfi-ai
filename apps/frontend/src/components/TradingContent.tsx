import React, { useState } from 'react';
import PriceChart from './PriceChart';

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ARB/USD', 'OP/USD'];

const MARKET_DATA: Record<string, { price: number; change: number; high: number; low: number; volume: string; fundingRate: string }> = {
  'BTC/USD': { price: 45230.5, change: 2.34, high: 45890.0, low: 44120.0, volume: '$2.4B', fundingRate: '0.0082%' },
  'ETH/USD': { price: 2845.2, change: -1.12, high: 2920.0, low: 2800.0, volume: '$1.1B', fundingRate: '-0.0031%' },
  'SOL/USD': { price: 145.3, change: 4.21, high: 148.0, low: 138.5, volume: '$380M', fundingRate: '0.0120%' },
  'ARB/USD': { price: 1.24, change: -0.8, high: 1.30, low: 1.18, volume: '$95M', fundingRate: '0.0010%' },
  'OP/USD': { price: 2.18, change: 1.55, high: 2.25, low: 2.08, volume: '$120M', fundingRate: '0.0055%' },
};

const ORDER_BOOK = {
  asks: [
    { price: '45,245.00', size: '0.124', total: '5,610.38' },
    { price: '45,240.00', size: '0.087', total: '3,935.88' },
    { price: '45,235.50', size: '0.210', total: '9,499.46' },
    { price: '45,232.00', size: '0.055', total: '2,487.76' },
    { price: '45,231.00', size: '0.340', total: '15,378.54' },
  ],
  bids: [
    { price: '45,229.00', size: '0.280', total: '12,664.12' },
    { price: '45,225.00', size: '0.095', total: '4,296.38' },
    { price: '45,220.00', size: '0.160', total: '7,235.20' },
    { price: '45,215.00', size: '0.440', total: '19,894.60' },
    { price: '45,210.00', size: '0.072', total: '3,255.12' },
  ],
};

export default function TradingContent() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(3);
  const [aiMode, setAiMode] = useState(true);

  const market = MARKET_DATA[selectedSymbol];
  const isPositive = market.change >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Order submitted: ${side.toUpperCase()} ${size} ${selectedSymbol} @ ${orderType === 'market' ? 'Market' : `$${price}`} | ${leverage}x`);
  };

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Symbol selector + market stats */}
      <div className="card card-sm" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflowX: 'auto' }}>
          {/* Symbol tabs */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {SYMBOLS.map((sym) => {
              const m = MARKET_DATA[sym];
              const pos = m.change >= 0;
              return (
                <button
                  key={sym}
                  onClick={() => setSelectedSymbol(sym)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedSymbol === sym ? '#EFF6FF' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedSymbol === sym ? '#2563EB' : '#374151' }}>
                    {sym}
                  </div>
                  <div
                    className="num"
                    style={{ fontSize: 10, fontWeight: 600, color: pos ? '#10B981' : '#EF4444' }}
                  >
                    {pos ? '+' : ''}{m.change}%
                  </div>
                </button>
              );
            })}
          </div>

          <div className="divider" style={{ width: 1, height: 36, margin: '0 4px' }} />

          {/* Market stats */}
          <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
            {[
              { label: 'Mark Price', value: `$${market.price.toLocaleString()}` },
              { label: '24h High', value: `$${market.high.toLocaleString()}` },
              { label: '24h Low', value: `$${market.low.toLocaleString()}` },
              { label: '24h Volume', value: market.volume },
              { label: 'Funding Rate', value: market.fundingRate },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>
                  {item.label}
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main trading area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
        {/* Left: chart + order book */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PriceChart symbol={selectedSymbol} currentPrice={market.price} change24h={market.change} />

          {/* Order book */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <span className="card-title">Order Book</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {/* Asks */}
              <div style={{ borderRight: '1px solid #F3F4F6' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '8px 12px',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  {['Price', 'Size', 'Total'].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                      {h}
                    </span>
                  ))}
                </div>
                {ORDER_BOOK.asks.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      padding: '5px 12px',
                      position: 'relative',
                    }}
                  >
                    <span className="num" style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                      {row.price}
                    </span>
                    <span className="num" style={{ fontSize: 12, color: '#374151' }}>{row.size}</span>
                    <span className="num" style={{ fontSize: 12, color: '#9CA3AF' }}>{row.total}</span>
                  </div>
                ))}
              </div>

              {/* Bids */}
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '8px 12px',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  {['Price', 'Size', 'Total'].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                      {h}
                    </span>
                  ))}
                </div>
                {ORDER_BOOK.bids.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      padding: '5px 12px',
                    }}
                  >
                    <span className="num" style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                      {row.price}
                    </span>
                    <span className="num" style={{ fontSize: 12, color: '#374151' }}>{row.size}</span>
                    <span className="num" style={{ fontSize: 12, color: '#9CA3AF' }}>{row.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* AI Mode toggle */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span className="card-title">Place Order</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>AI Mode</span>
                <button
                  onClick={() => setAiMode(!aiMode)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    border: 'none',
                    background: aiMode ? '#2563EB' : '#D1D5DB',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: aiMode ? 18 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      background: '#FFF',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                  />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 16 }}>
              {/* Buy/Sell toggle */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  background: '#F3F4F6',
                  borderRadius: 8,
                  padding: 3,
                  marginBottom: 16,
                }}
              >
                {(['buy', 'sell'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    style={{
                      padding: '8px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 13,
                      background: side === s ? (s === 'buy' ? '#10B981' : '#EF4444') : 'transparent',
                      color: side === s ? '#FFF' : '#9CA3AF',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Order type */}
              <div style={{ marginBottom: 14 }}>
                <div className="input-label" style={{ marginBottom: 6 }}>Order Type</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['market', 'limit'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: 6,
                        border: `1px solid ${orderType === t ? '#2563EB' : '#E5E7EB'}`,
                        background: orderType === t ? '#EFF6FF' : '#FFF',
                        color: orderType === t ? '#2563EB' : '#6B7280',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price (limit only) */}
              {orderType === 'limit' && (
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label">Price (USD)</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder={market.price.toString()}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              )}

              {/* Size */}
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label className="input-label">Size</label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="0.00"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  step="0.001"
                  min="0"
                />
              </div>

              {/* Leverage */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="input-label">Leverage</span>
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                    {leverage}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {[1, 5, 10, 25, 50].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLeverage(v)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: `1px solid ${leverage === v ? '#2563EB' : '#E5E7EB'}`,
                        background: leverage === v ? '#EFF6FF' : 'transparent',
                        color: leverage === v ? '#2563EB' : '#9CA3AF',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {v}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Order summary */}
              {size && (
                <div
                  style={{
                    background: '#F9FAFB',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 14,
                    border: '1px solid #F3F4F6',
                  }}
                >
                  {[
                    { label: 'Order Value', value: `$${(parseFloat(size || '0') * market.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}` },
                    { label: 'Required Margin', value: `$${(parseFloat(size || '0') * market.price / leverage).toLocaleString('en-US', { maximumFractionDigits: 2 })}` },
                    { label: 'Est. Fee (0.05%)', value: `$${(parseFloat(size || '0') * market.price * 0.0005).toFixed(2)}` },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{row.label}</span>
                      <span className="num" style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-xl"
                style={{
                  width: '100%',
                  background: side === 'buy' ? '#10B981' : '#EF4444',
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {side === 'buy' ? 'Long' : 'Short'} {selectedSymbol.split('/')[0]}
              </button>

              {aiMode && (
                <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
                  AI Swarm will optimize entry timing
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
