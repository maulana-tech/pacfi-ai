import React, { useEffect, useState } from 'react';
import PriceChart from './PriceChart';
import { useWalletContext } from './WalletConnect';
import {
  buildMessageToSign,
  buildOrderSigningPayload,
  fetchAgentStatus,
  BuilderApproval,
  fetchBuilderApprovals,
  AgentStatus,
  pacificaRequest,
  fetchPacificaMarketData,
  MarketDataMap,
} from '../lib/pacifica';

const SYMBOLS = ['BTC', 'ETH', 'SOL'] as const;

// Mock data for fallback
const DEFAULT_MARKET_DATA: MarketDataMap = {
  BTC: {
    price: 45230.5,
    change: 2.34,
    high: 45890,
    low: 44120,
    volume: '$2.4B',
    fundingRate: '0.0082%',
  },
  ETH: {
    price: 2845.2,
    change: -1.12,
    high: 2920,
    low: 2800,
    volume: '$1.1B',
    fundingRate: '-0.0031%',
  },
  SOL: {
    price: 145.3,
    change: 4.21,
    high: 148,
    low: 138.5,
    volume: '$380M',
    fundingRate: '0.0120%',
  },
};

export default function TradingContent() {
  const { walletAddress, isConnected, signMessage } = useWalletContext();
  const [selectedSymbol, setSelectedSymbol] = useState<(typeof SYMBOLS)[number]>('BTC');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(3);
  const [approvals, setApprovals] = useState<BuilderApproval[]>([]);
  const [selectedBuilderCode, setSelectedBuilderCode] = useState('');
  const [executionMode, setExecutionMode] = useState<'wallet' | 'agent'>('wallet');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [marketData, setMarketData] = useState<MarketDataMap>(DEFAULT_MARKET_DATA);
  const market = marketData[selectedSymbol] || DEFAULT_MARKET_DATA[selectedSymbol];

  useEffect(() => {
    fetchAgentStatus()
      .then(setAgentStatus)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setApprovals([]);
      setSelectedBuilderCode('');
      return;
    }

    fetchBuilderApprovals(walletAddress)
      .then((nextApprovals) => {
        setApprovals(nextApprovals);
        setSelectedBuilderCode((current) =>
          current && nextApprovals.some((item) => item.builder_code === current)
            ? current
            : nextApprovals[0]?.builder_code || ''
        );
      })
      .catch(() => undefined);
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (
      executionMode === 'agent' &&
      (!agentStatus?.enabled || agentStatus.managedAccount !== walletAddress)
    ) {
      setExecutionMode('wallet');
    }
  }, [agentStatus, executionMode, walletAddress]);

  // Fetch real-time market data on mount and refresh every 5 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchMarketData = async () => {
      try {
        const data = await fetchPacificaMarketData(SYMBOLS as unknown as string[]);
        if (isMounted) {
          setMarketData(data);
        }
      } catch (error) {
        console.warn('Failed to fetch market data:', error);
        // Keep existing data or fallback to defaults
      }
    };

    // Fetch immediately on mount
    fetchMarketData();

    // Set up interval for continuous refresh (every 5 seconds)
    const interval = setInterval(fetchMarketData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!walletAddress || !isConnected) {
      setNotice('Connect your wallet first.');
      return;
    }

    if (!size || Number.parseFloat(size) <= 0) {
      setNotice('Order size must be greater than zero.');
      return;
    }

    if (orderType === 'limit' && (!price || Number.parseFloat(price) <= 0)) {
      setNotice('Limit price must be greater than zero.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      const timestamp = Date.now();
      const clientOrderId = crypto.randomUUID();
      const signedSide = side === 'buy' ? 'bid' : 'ask';
      const orderData =
        orderType === 'market'
          ? {
              symbol: selectedSymbol,
              amount: size,
              side: signedSide,
              slippage_percent: '0.5',
              reduce_only: false,
              client_order_id: clientOrderId,
              ...(selectedBuilderCode ? { builder_code: selectedBuilderCode } : {}),
            }
          : {
              symbol: selectedSymbol,
              amount: size,
              side: signedSide,
              price,
              tif: 'GTC',
              reduce_only: false,
              client_order_id: clientOrderId,
              ...(selectedBuilderCode ? { builder_code: selectedBuilderCode } : {}),
            };

      const signature =
        executionMode === 'wallet'
          ? await signMessage(
              buildMessageToSign(
                buildOrderSigningPayload(
                  orderType === 'market' ? 'create_market_order' : 'create_order',
                  orderData,
                  timestamp
                )
              )
            )
          : undefined;

      await pacificaRequest(
        orderType === 'market' ? '/orders/create-market' : '/orders/create-limit',
        walletAddress,
        {
          method: 'POST',
          body: JSON.stringify({
            symbol: selectedSymbol,
            side: signedSide,
            amount: size,
            price: orderType === 'limit' ? price : undefined,
            leverage,
            builderCode: selectedBuilderCode || undefined,
            clientOrderId,
            signature,
            timestamp,
            executionMode,
          }),
        }
      );

      setNotice(`Order submitted${selectedBuilderCode ? ` with ${selectedBuilderCode}` : ''}.`);
      setSize('');
      setPrice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Order submission failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: '24px 28px', display: 'grid', gap: 16 }}>
      <div className="card" style={{ padding: 20, background: '#0F2742', color: '#F8FAFC' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#93C5FD',
            }}
          >
            Pacifica Trading
          </div>
          <h2 style={{ fontSize: 28, lineHeight: 1.15, color: '#FFFFFF' }}>
            Order payload sekarang sinkron dengan signing flow Pacifica
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#CBD5E1', margin: 0 }}>
            Market order ditandatangani sebagai `create_market_order`, limit order sebagai
            `create_order`, dan builder code yang dipakai di order diambil dari approval yang sudah
            ada di halaman Builder. Jika agent wallet backend aktif untuk account ini, order juga
            bisa dijalankan tanpa popup signature wallet.
          </p>
        </div>
      </div>

      <div className="card card-sm" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              style={{
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                background: selectedSymbol === symbol ? '#EFF6FF' : 'transparent',
                color: selectedSymbol === symbol ? '#2563EB' : '#374151',
                fontWeight: 700,
              }}
            >
              {symbol}/USD
            </button>
          ))}
          <div style={{ display: 'flex', gap: 18, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {[
              ['Mark', `$${market.price.toLocaleString()}`],
              ['24h', `${market.change > 0 ? '+' : ''}${market.change}%`],
              ['High', `$${market.high.toLocaleString()}`],
              ['Low', `$${market.low.toLocaleString()}`],
              ['Funding', market.fundingRate],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>{label}</div>
                <div
                  className="num"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color:
                      label === '24h' ? (market.change >= 0 ? '#10B981' : '#EF4444') : '#111827',
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="trade-grid">
        <div style={{ display: 'grid', gap: 14 }}>
          <PriceChart
            symbol={`${selectedSymbol}/USD`}
            currentPrice={market.price}
            change24h={market.change}
          />

          <div className="card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div className="card-title">Approved Builder Codes</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">Connected Wallet</div>
                <div className="stat-value" style={{ fontSize: 14 }}>
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : 'Not connected'}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">Approved Codes</div>
                <div className="stat-value">{approvals.length}</div>
              </div>
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">Active Builder</div>
                <div className="stat-value" style={{ fontSize: 14 }}>
                  {selectedBuilderCode || '-'}
                </div>
              </div>
            </div>

            {approvals.length > 0 ? (
              approvals.map((approval) => (
                <button
                  key={approval.builder_code}
                  type="button"
                  onClick={() => setSelectedBuilderCode(approval.builder_code)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border:
                      approval.builder_code === selectedBuilderCode
                        ? '1px solid #2563EB'
                        : '1px solid #E5E7EB',
                    background:
                      approval.builder_code === selectedBuilderCode ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#111827' }}>{approval.builder_code}</span>
                  <span style={{ color: '#6B7280', fontSize: 12 }}>
                    max fee {approval.max_fee_rate || '-'}
                  </span>
                </button>
              ))
            ) : (
              <div
                style={{
                  border: '1px dashed #D1D5DB',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  color: '#6B7280',
                }}
              >
                Tidak ada builder code approved. Atur dulu di halaman <a href="/builder">Builder</a>
                .
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>
            Place Order
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div className="input-label">Execution Mode</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['wallet', 'agent'] as const).map((value) => {
                  const isAgentUnavailable =
                    value === 'agent' &&
                    (!agentStatus?.enabled || agentStatus.managedAccount !== walletAddress);

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !isAgentUnavailable && setExecutionMode(value)}
                      style={{
                        borderRadius: 8,
                        padding: '10px',
                        cursor: isAgentUnavailable ? 'not-allowed' : 'pointer',
                        border: executionMode === value ? '1px solid #2563EB' : '1px solid #E5E7EB',
                        background: executionMode === value ? '#EFF6FF' : '#FFF',
                        color: isAgentUnavailable
                          ? '#9CA3AF'
                          : executionMode === value
                            ? '#2563EB'
                            : '#6B7280',
                        fontWeight: 700,
                      }}
                    >
                      {value === 'wallet' ? 'Wallet Sign' : 'Agent Wallet'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['buy', 'sell'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    cursor: 'pointer',
                    background:
                      side === value ? (value === 'buy' ? '#10B981' : '#EF4444') : '#F3F4F6',
                    color: side === value ? '#FFF' : '#6B7280',
                    fontWeight: 700,
                  }}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {(['market', 'limit'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOrderType(value)}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    padding: '8px',
                    cursor: 'pointer',
                    border: orderType === value ? '1px solid #2563EB' : '1px solid #E5E7EB',
                    background: orderType === value ? '#EFF6FF' : '#FFF',
                    color: orderType === value ? '#2563EB' : '#6B7280',
                    fontWeight: 700,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>

            {orderType === 'limit' ? (
              <input
                className="input-field"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Limit price"
              />
            ) : null}

            <input
              className="input-field"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Size"
            />

            <div className="input-field" style={{ background: '#F9FAFB', color: '#111827' }}>
              {selectedBuilderCode || 'No builder code attached'}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="input-label">Leverage</span>
                <span className="num" style={{ fontWeight: 700 }}>
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
            </div>

            <div
              style={{
                borderRadius: 10,
                padding: '12px 14px',
                background: '#F9FAFB',
                color: '#4B5563',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {`Signing type: ${orderType === 'market' ? 'create_market_order' : 'create_order'} | Mode: ${executionMode} | Builder code: ${selectedBuilderCode || 'none'}`}
            </div>

            <div
              style={{
                borderRadius: 10,
                padding: '12px 14px',
                background: '#F9FAFB',
                color: '#4B5563',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {agentStatus?.enabled
                ? `Agent wallet ${agentStatus.agentWallet?.slice(0, 6)}...${agentStatus.agentWallet?.slice(-4)} is configured for ${agentStatus.managedAccount?.slice(0, 6)}...${agentStatus.managedAccount?.slice(-4)}.`
                : 'Agent wallet is not configured on the backend.'}
            </div>

            <button
              type="submit"
              className="btn"
              style={{ width: '100%', background: side === 'buy' ? '#10B981' : '#EF4444' }}
              disabled={busy}
            >
              {busy ? 'Submitting...' : `${side === 'buy' ? 'Long' : 'Short'} ${selectedSymbol}`}
            </button>

            {notice ? (
              <div
                style={{
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: '#ECFDF5',
                  color: '#065F46',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {notice}
              </div>
            ) : null}
          </form>
        </div>
      </div>

      <style>{`
        .trade-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 14px;
        }

        @media (max-width: 1080px) {
          .trade-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
