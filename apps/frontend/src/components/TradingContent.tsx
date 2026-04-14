import React, { useEffect, useRef, useState } from 'react';
import PriceChart from './PriceChart';
import { useWalletContext } from './WalletConnect';
import {
  buildMessageToSign,
  buildOrderSigningPayload,
  fetchAgentStatus,
  fetchBuilderApprovals,
  AgentStatus,
  BuilderApproval,
  pacificaRequest,
  fetchPacificaMarketData,
  MarketData,
  MarketDataMap,
} from '../lib/pacifica';

// ─── Coin config ──────────────────────────────────────────────────────────────

const COIN_CONFIG: Record<string, { bg: string; symbol: string; label: string; tickSize: number }> = {
  BTC:  { bg: '#F7931A', symbol: '₿',  label: 'Bitcoin',    tickSize: 1 },
  ETH:  { bg: '#627EEA', symbol: 'Ξ',  label: 'Ethereum',   tickSize: 0.1 },
  SOL:  { bg: '#9945FF', symbol: '◎',  label: 'Solana',     tickSize: 0.01 },
  AVAX: { bg: '#E84142', symbol: 'A',  label: 'Avalanche',  tickSize: 0.001 },
  LINK: { bg: '#2A5ADA', symbol: 'L',  label: 'Chainlink',  tickSize: 0.001 },
  XRP:  { bg: '#00AAE4', symbol: '✕',  label: 'XRP',        tickSize: 0.0001 },
  DOGE: { bg: '#C2A633', symbol: 'Ð',  label: 'Dogecoin',   tickSize: 0.00001 },
  WLD:  { bg: '#2D2D2D', symbol: 'W',  label: 'Worldcoin',  tickSize: 0.0001 },
};

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'XRP', 'DOGE', 'WLD'] as const;
type Symbol = (typeof SYMBOLS)[number];

function CoinBadge({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const cfg = COIN_CONFIG[symbol] ?? { bg: '#6B7280', symbol: symbol[0] };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: cfg.bg,
        color: '#FFFFFF',
        fontSize: size * 0.42,
        fontWeight: 800,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {cfg.symbol}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const TrendUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <polyline points="1,9 4,5.5 6.5,7.5 11,2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="8,2.5 11,2.5 11,5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <polyline points="1,2.5 4,6.5 6.5,4.5 11,9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="8,9.5 11,9.5 11,6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WalletIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="9.5" cy="9" r="1" fill="currentColor" />
  </svg>
);

const BotIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="4.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="7" cy="1.5" r="1" fill="currentColor" />
    <circle cx="4.5" cy="8" r="1" fill="currentColor" />
    <circle cx="9.5" cy="8" r="1" fill="currentColor" />
    <path d="M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const SignIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 12L5 11l6-6-2-2-6 6-1 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 4l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const SpreadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M2 4l4-3 4 3M2 8l4 3 4-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPrice(price: number, tickSize: number): string {
  if (price === 0) return '—';
  const decimals = tickSize < 0.001 ? 5 : tickSize < 0.01 ? 4 : tickSize < 0.1 ? 3 : tickSize < 1 ? 2 : 1;
  return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtChange(c: number): string {
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`;
}

// ─── Empty market data ────────────────────────────────────────────────────────

const EMPTY_MARKET: MarketData = {
  price: 0, bid: 0, ask: 0, change: 0, high: 0, low: 0,
  volume: '$0', fundingRate: '—', maxLeverage: 10, minOrderSize: '10', lotSize: '0.001',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TradingContent() {
  const { walletAddress, isConnected, signMessage } = useWalletContext();

  const [selectedSymbol, setSelectedSymbol] = useState<Symbol>('BTC');
  const [orderType, setOrderType]           = useState<'market' | 'limit'>('market');
  const [side, setSide]                     = useState<'buy' | 'sell'>('buy');
  const [size, setSize]                     = useState('');
  const [limitPrice, setLimitPrice]         = useState('');
  const [leverage, setLeverage]             = useState(3);
  const [executionMode, setExecutionMode]   = useState<'wallet' | 'agent'>('wallet');

  const [marketDataMap, setMarketDataMap]   = useState<MarketDataMap>({});
  const [dataLoading, setDataLoading]       = useState(true);
  const [agentStatus, setAgentStatus]       = useState<AgentStatus | null>(null);
  const [approvals, setApprovals]           = useState<BuilderApproval[]>([]);
  const [selectedBuilder, setSelectedBuilder] = useState('');

  const [busy, setBusy]       = useState(false);
  const [notice, setNotice]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  // ── Market data polling ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchPacificaMarketData(SYMBOLS as unknown as string[], true);
        if (!cancelled) {
          setMarketDataMap(data);
          setDataLoading(false);
        }
      } catch {
        if (!cancelled) setDataLoading(false);
      }
    };

    load();
    const iv = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // ── Agent status ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAgentStatus().then(setAgentStatus).catch(() => undefined);
  }, []);

  // ── Builder approvals ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !walletAddress) { setApprovals([]); return; }
    fetchBuilderApprovals(walletAddress)
      .then((list) => {
        setApprovals(list);
        setSelectedBuilder((cur) =>
          cur && list.some((a) => a.builder_code === cur) ? cur : list[0]?.builder_code ?? ''
        );
      })
      .catch(() => undefined);
  }, [isConnected, walletAddress]);

  // ── Guard agent mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (executionMode === 'agent' && (!agentStatus?.enabled || agentStatus.managedAccount !== walletAddress)) {
      setExecutionMode('wallet');
    }
  }, [agentStatus, executionMode, walletAddress]);

  const market: MarketData = marketDataMap[selectedSymbol] ?? EMPTY_MARKET;
  const coin = COIN_CONFIG[selectedSymbol] ?? { bg: '#6B7280', symbol: selectedSymbol[0], label: selectedSymbol, tickSize: 0.01 };
  const maxLev = market.maxLeverage || 10;

  // ── Notional value estimate ───────────────────────────────────────────────────
  const sizeNum  = Number.parseFloat(size) || 0;
  const priceNum = orderType === 'limit' ? (Number.parseFloat(limitPrice) || 0) : market.price;
  const notional = sizeNum * priceNum;

  // ── Order submit ─────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    if (!isConnected || !walletAddress) {
      setNotice({ type: 'error', text: 'Connect your wallet first.' });
      return;
    }
    if (!size || sizeNum <= 0) {
      setNotice({ type: 'error', text: 'Order size must be greater than zero.' });
      return;
    }
    if (notional > 0 && notional < Number.parseFloat(market.minOrderSize)) {
      setNotice({ type: 'error', text: `Minimum order size is $${market.minOrderSize} USDC.` });
      return;
    }
    if (orderType === 'limit' && (!limitPrice || Number.parseFloat(limitPrice) <= 0)) {
      setNotice({ type: 'error', text: 'Limit price must be greater than zero.' });
      return;
    }

    setBusy(true);

    try {
      const timestamp    = Date.now();
      const clientOrderId = crypto.randomUUID();
      const signedSide   = side === 'buy' ? 'bid' : 'ask';

      // Build the data object to sign — matches what Pacifica expects
      const orderData: Record<string, unknown> =
        orderType === 'market'
          ? {
              amount: size,
              client_order_id: clientOrderId,
              reduce_only: false,
              side: signedSide,
              slippage_percent: '0.5',
              symbol: selectedSymbol,
              ...(selectedBuilder ? { builder_code: selectedBuilder } : {}),
            }
          : {
              amount: size,
              client_order_id: clientOrderId,
              price: limitPrice,
              reduce_only: false,
              side: signedSide,
              symbol: selectedSymbol,
              tif: 'GTC',
              ...(selectedBuilder ? { builder_code: selectedBuilder } : {}),
            };

      const signingType = orderType === 'market' ? 'create_market_order' : 'create_order';

      let signature: string | undefined;
      if (executionMode === 'wallet') {
        signature = await signMessage(
          buildMessageToSign(buildOrderSigningPayload(signingType, orderData, timestamp))
        );
      }

      await pacificaRequest(
        orderType === 'market' ? '/orders/create-market' : '/orders/create-limit',
        walletAddress,
        {
          method: 'POST',
          body: JSON.stringify({
            symbol: selectedSymbol,
            side: signedSide,
            amount: size,
            ...(orderType === 'limit' ? { price: limitPrice } : {}),
            leverage,
            clientOrderId,
            builderCode: selectedBuilder || undefined,
            signature,
            timestamp,
            executionMode,
          }),
        }
      );

      setNotice({ type: 'success', text: `${side === 'buy' ? 'Long' : 'Short'} ${selectedSymbol} order submitted.` });
      setSize('');
      setLimitPrice('');
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Order submission failed.' });
    } finally {
      setBusy(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Symbol tabs ───────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '10px 14px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SYMBOLS.map((sym) => {
            const cfg = COIN_CONFIG[sym];
            const md  = marketDataMap[sym];
            const active = sym === selectedSymbol;
            return (
              <button
                key={sym}
                onClick={() => { setSelectedSymbol(sym); setSize(''); setLimitPrice(''); setNotice(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: active ? `1.5px solid ${cfg.bg}` : '1.5px solid transparent',
                  background: active ? `${cfg.bg}14` : 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <CoinBadge symbol={sym} size={24} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#111827' : '#374151' }}>
                    {sym}
                  </div>
                  {md && md.price > 0 ? (
                    <div
                      className="num"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: md.change >= 0 ? '#10B981' : '#EF4444',
                      }}
                    >
                      {fmtChange(md.change)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#D1D5DB' }}>—</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Market ticker ─────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          background: '#0F172A',
          border: '1px solid #1E293B',
          color: '#F8FAFC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Coin identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CoinBadge symbol={selectedSymbol} size={36} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#F8FAFC', lineHeight: 1.2 }}>
                {selectedSymbol}/USDC
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{coin.label} Perpetual</div>
            </div>
          </div>

          <div style={{ width: 1, height: 36, background: '#1E293B', flexShrink: 0 }} />

          {/* Price */}
          {dataLoading ? (
            <div className="skeleton" style={{ width: 120, height: 28, background: '#1E293B' }} />
          ) : (
            <div>
              <div
                className="num"
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#F8FAFC',
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                }}
              >
                ${fmtPrice(market.price, coin.tickSize)}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: market.change >= 0 ? '#34D399' : '#F87171',
                  marginTop: 2,
                }}
              >
                {market.change >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                {fmtChange(market.change)}
              </div>
            </div>
          )}

          <div style={{ width: 1, height: 36, background: '#1E293B', flexShrink: 0 }} />

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Bid', value: market.bid > 0 ? `$${fmtPrice(market.bid, coin.tickSize)}` : '—', color: '#34D399' },
              { label: 'Ask', value: market.ask > 0 ? `$${fmtPrice(market.ask, coin.tickSize)}` : '—', color: '#F87171' },
              { label: '24h High', value: market.high > 0 ? `$${fmtPrice(market.high, coin.tickSize)}` : '—' },
              { label: '24h Low',  value: market.low  > 0 ? `$${fmtPrice(market.low,  coin.tickSize)}` : '—' },
              { label: 'Volume',   value: market.volume },
              { label: 'Funding',  value: market.fundingRate },
              { label: 'Max Lev',  value: `${market.maxLeverage}×` },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                  {label}
                </div>
                <div className="num" style={{ fontSize: 12, fontWeight: 700, color: color ?? '#CBD5E1' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid: chart + form ────────────────────────────────────────────── */}
      <div className="trade-grid">

        {/* Chart */}
        <PriceChart
          symbol={selectedSymbol}
          currentPrice={market.price}
          change24h={market.change}
        />

        {/* Order form */}
        <div className="card" style={{ padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Place Order</div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Buy / Sell */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['buy', 'sell'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSide(v)}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    transition: 'all 0.15s',
                    background: side === v
                      ? v === 'buy' ? '#10B981' : '#EF4444'
                      : '#F3F4F6',
                    color: side === v ? '#FFF' : '#9CA3AF',
                  }}
                >
                  {v === 'buy' ? 'Long / Buy' : 'Short / Sell'}
                </button>
              ))}
            </div>

            {/* Market / Limit */}
            <div
              style={{
                display: 'flex',
                background: '#F3F4F6',
                borderRadius: 8,
                padding: 3,
                gap: 3,
              }}
            >
              {(['market', 'limit'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOrderType(v)}
                  style={{
                    flex: 1,
                    padding: '7px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                    transition: 'all 0.15s',
                    background: orderType === v ? '#FFFFFF' : 'transparent',
                    color: orderType === v ? '#111827' : '#9CA3AF',
                    boxShadow: orderType === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {v === 'market' ? 'Market' : 'Limit'}
                </button>
              ))}
            </div>

            {/* Limit price (conditionally) */}
            {orderType === 'limit' && (
              <div className="input-group">
                <label className="input-label">Price (USDC)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    step={coin.tickSize}
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={market.price > 0 ? fmtPrice(market.price, coin.tickSize) : '0.00'}
                  />
                  {market.price > 0 && (
                    <button
                      type="button"
                      onClick={() => setLimitPrice(market.price.toString())}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#2563EB',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: 4,
                        padding: '2px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      Mark
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Size */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Size ({selectedSymbol})</label>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>Min ${ market.minOrderSize} USDC</span>
              </div>
              <input
                className="input-field"
                type="number"
                min="0"
                step={market.lotSize || '0.001'}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder={`0.00 ${selectedSymbol}`}
              />
              {notional > 0 && (
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  ≈ ${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
                </div>
              )}
            </div>

            {/* Leverage */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Leverage</label>
                <span
                  className="num"
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: leverage >= maxLev * 0.8 ? '#EF4444' : leverage >= maxLev * 0.5 ? '#F59E0B' : '#111827',
                  }}
                >
                  {leverage}×
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={maxLev}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                style={{ width: '100%', accentColor: side === 'buy' ? '#10B981' : '#EF4444' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#D1D5DB' }}>
                <span>1×</span><span>{Math.round(maxLev / 2)}×</span><span>{maxLev}×</span>
              </div>
            </div>

            {/* Bid/Ask spread mini display */}
            {market.bid > 0 && market.ask > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#F9FAFB',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: '#10B981', fontWeight: 700, fontSize: 11 }}>BID</div>
                  <div className="num" style={{ fontWeight: 700 }}>${fmtPrice(market.bid, coin.tickSize)}</div>
                </div>
                <div style={{ textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <SpreadIcon />
                  <span style={{ fontSize: 10 }}>
                    spread ${(market.ask - market.bid).toFixed(coin.tickSize < 0.01 ? 4 : 2)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#EF4444', fontWeight: 700, fontSize: 11 }}>ASK</div>
                  <div className="num" style={{ fontWeight: 700 }}>${fmtPrice(market.ask, coin.tickSize)}</div>
                </div>
              </div>
            )}

            {/* Execution mode */}
            <div className="input-group">
              <label className="input-label">Execution Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(['wallet', 'agent'] as const).map((v) => {
                  const disabled = v === 'agent' && (!agentStatus?.enabled || agentStatus.managedAccount !== walletAddress);
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setExecutionMode(v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '9px',
                        borderRadius: 8,
                        border: executionMode === v ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
                        background: executionMode === v ? '#EFF6FF' : '#FFFFFF',
                        color: disabled ? '#D1D5DB' : executionMode === v ? '#2563EB' : '#6B7280',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {v === 'wallet' ? <><WalletIcon /> Wallet Sign</> : <><BotIcon /> Agent</>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Builder code (if available) */}
            {approvals.length > 0 && (
              <div className="input-group">
                <label className="input-label">Builder Code</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedBuilder('')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: selectedBuilder === '' ? '1.5px solid #E5E7EB' : '1.5px solid #E5E7EB',
                      background: selectedBuilder === '' ? '#F3F4F6' : '#FFFFFF',
                      color: selectedBuilder === '' ? '#374151' : '#9CA3AF',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    None
                  </button>
                  {approvals.map((a) => (
                    <button
                      key={a.builder_code}
                      type="button"
                      onClick={() => setSelectedBuilder(a.builder_code)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: selectedBuilder === a.builder_code ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
                        background: selectedBuilder === a.builder_code ? '#EFF6FF' : '#FFFFFF',
                        color: selectedBuilder === a.builder_code ? '#2563EB' : '#374151',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {a.builder_code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Order summary */}
            <div
              style={{
                background: '#F9FAFB',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 11,
                color: '#6B7280',
                lineHeight: 1.7,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Type</span>
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {orderType === 'market' ? 'Market' : 'Limit'} {side === 'buy' ? 'Long' : 'Short'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Size</span>
                <span style={{ fontWeight: 600, color: '#374151' }}>{size || '—'} {selectedSymbol}</span>
              </div>
              {notional > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Notional</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    ${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Leverage</span>
                <span style={{ fontWeight: 600, color: '#374151' }}>{leverage}×</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sign via</span>
                <span style={{ fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SignIcon />
                  {executionMode === 'wallet' ? orderType === 'market' ? 'create_market_order' : 'create_order' : 'agent_wallet'}
                </span>
              </div>
            </div>

            {/* Submit */}
            {!isConnected ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  background: '#F9FAFB',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#9CA3AF',
                  border: '1px dashed #E5E7EB',
                }}
              >
                Connect wallet to trade
              </div>
            ) : (
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#FFFFFF',
                  background: busy
                    ? '#9CA3AF'
                    : side === 'buy'
                      ? 'linear-gradient(135deg, #10B981, #059669)'
                      : 'linear-gradient(135deg, #EF4444, #DC2626)',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {busy ? (
                  'Submitting…'
                ) : (
                  <>
                    <CoinBadge symbol={selectedSymbol} size={18} />
                    {side === 'buy' ? 'Long' : 'Short'} {selectedSymbol}
                    {notional > 0 && (
                      <span style={{ opacity: 0.8, fontWeight: 500, fontSize: 12 }}>
                        · ${notional.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </>
                )}
              </button>
            )}

            {/* Notice */}
            {notice && (
              <div
                style={{
                  padding: '11px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: notice.type === 'success' ? '#F0FDF4' : '#FFF1F2',
                  border: `1px solid ${notice.type === 'success' ? '#BBF7D0' : '#FECDD3'}`,
                  color: notice.type === 'success' ? '#065F46' : '#9F1239',
                }}
              >
                {notice.text}
              </div>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .trade-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 360px;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .trade-grid { grid-template-columns: 1fr; }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { opacity: 1; }
      `}</style>
    </div>
  );
}
