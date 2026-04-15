import React, { useEffect, useState } from 'react';
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

const COIN_CONFIG: Record<string, { bg: string; symbol: string; label: string; tickSize: number }> = {
  BTC: { bg: '#F7931A', symbol: 'B', label: 'Bitcoin', tickSize: 1 },
  ETH: { bg: '#627EEA', symbol: 'E', label: 'Ethereum', tickSize: 0.1 },
  SOL: { bg: '#9945FF', symbol: 'S', label: 'Solana', tickSize: 0.01 },
  AVAX: { bg: '#E84142', symbol: 'A', label: 'Avalanche', tickSize: 0.001 },
  LINK: { bg: '#2A5ADA', symbol: 'L', label: 'Chainlink', tickSize: 0.001 },
  XRP: { bg: '#00AAE4', symbol: 'X', label: 'XRP', tickSize: 0.0001 },
  DOGE: { bg: '#C2A633', symbol: 'D', label: 'Dogecoin', tickSize: 0.00001 },
  WLD: { bg: '#2D2D2D', symbol: 'W', label: 'Worldcoin', tickSize: 0.0001 },
};

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'XRP', 'DOGE', 'WLD'] as const;
type Symbol = (typeof SYMBOLS)[number];

function CoinBadge({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const cfg = COIN_CONFIG[symbol] ?? { bg: '#6B7280', symbol: symbol[0] };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', background: cfg.bg, color: '#FFFFFF', fontSize: size * 0.42, fontWeight: 800, flexShrink: 0, userSelect: 'none' }}>
      {cfg.symbol}
    </span>
  );
}

const TrendUpIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1,9 4,5.5 6.5,7.5 11,2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="8,2.5 11,2.5 11,5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const TrendDownIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1,2.5 4,6.5 6.5,4.5 11,9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="8,9.5 11,9.5 11,6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const WalletIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" /><circle cx="9.5" cy="9" r="1" fill="currentColor" /></svg>;
const BotIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="1.5" r="1" fill="currentColor" /><circle cx="4.5" cy="8" r="1" fill="currentColor" /><circle cx="9.5" cy="8" r="1" fill="currentColor" /><path d="M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
const SignIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12L5 11l6-6-2-2-6 6-1 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 4l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
const SpreadIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M2 4l4-3 4 3M2 8l4 3 4-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function fmtPrice(price: number, tickSize: number): string {
  if (price === 0) return '--';
  const decimals = tickSize < 0.001 ? 5 : tickSize < 0.01 ? 4 : tickSize < 0.1 ? 3 : tickSize < 1 ? 2 : 1;
  return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtChange(c: number): string {
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`;
}

const EMPTY_MARKET: MarketData = { price: 0, bid: 0, ask: 0, change: 0, high: 0, low: 0, volume: '$0', fundingRate: '--', maxLeverage: 10, minOrderSize: '10', lotSize: '0.001' };

export default function TradingContent() {
  const { walletAddress, isConnected, signMessage } = useWalletContext();
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol>(() => {
    try {
      const stored = localStorage.getItem('pacfi_chart_symbol');
      return stored && SYMBOLS.includes(stored as Symbol) ? (stored as Symbol) : 'BTC';
    } catch {
      return 'BTC';
    }
  });
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [leverage, setLeverage] = useState(3);
  const [executionMode, setExecutionMode] = useState<'wallet' | 'agent'>('wallet');
  const [marketDataMap, setMarketDataMap] = useState<MarketDataMap>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [approvals, setApprovals] = useState<BuilderApproval[]>([]);
  const [selectedBuilder, setSelectedBuilder] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('pacfi_chart_symbol', selectedSymbol);
    } catch {}
  }, [selectedSymbol]);

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
    void load();
    const interval = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetchAgentStatus().then(setAgentStatus).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setApprovals([]);
      return;
    }
    fetchBuilderApprovals(walletAddress)
      .then((list) => {
        setApprovals(list);
        setSelectedBuilder((current) => current && list.some((approval) => approval.builder_code === current) ? current : list[0]?.builder_code ?? '');
      })
      .catch(() => undefined);
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setWalletBalance(null);
      return;
    }
    pacificaRequest<{ balance: number }>('/orders/balance', walletAddress, { method: 'GET' })
      .then((res) => setWalletBalance(typeof res?.balance === 'number' ? res.balance : null))
      .catch(() => setWalletBalance(null));
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (executionMode === 'agent' && (!agentStatus?.enabled || agentStatus.managedAccount !== walletAddress)) {
      setExecutionMode('wallet');
    }
  }, [agentStatus, executionMode, walletAddress]);

  const market: MarketData = marketDataMap[selectedSymbol] ?? EMPTY_MARKET;
  const coin = COIN_CONFIG[selectedSymbol] ?? { bg: '#6B7280', symbol: selectedSymbol[0], label: selectedSymbol, tickSize: 0.01 };
  const maxLev = market.maxLeverage || 10;
  const sizeNum = Number.parseFloat(size) || 0;
  const priceNum = orderType === 'limit' ? (Number.parseFloat(limitPrice) || 0) : market.price;
  const notional = sizeNum * priceNum;

  async function refreshBalance() {
    if (!walletAddress) return;
    try {
      const res = await pacificaRequest<{ balance: number }>('/orders/balance', walletAddress, { method: 'GET' });
      setWalletBalance(typeof res?.balance === 'number' ? res.balance : null);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!isConnected || !walletAddress) return setNotice({ type: 'error', text: 'Connect your wallet first.' });
    if (!size || sizeNum <= 0) return setNotice({ type: 'error', text: 'Order size must be greater than zero.' });
    if (notional > 0 && notional < Number.parseFloat(market.minOrderSize)) return setNotice({ type: 'error', text: `Minimum order size is $${market.minOrderSize} USDC.` });
    if (orderType === 'limit' && (!limitPrice || Number.parseFloat(limitPrice) <= 0)) return setNotice({ type: 'error', text: 'Limit price must be greater than zero.' });
    setBusy(true);
    try {
      const timestamp = Date.now();
      const clientOrderId = crypto.randomUUID();
      const signedSide = side === 'buy' ? 'bid' : 'ask';
      const orderData: Record<string, unknown> = orderType === 'market'
        ? { amount: size, client_order_id: clientOrderId, reduce_only: false, side: signedSide, slippage_percent: '0.5', symbol: selectedSymbol, ...(selectedBuilder ? { builder_code: selectedBuilder } : {}) }
        : { amount: size, client_order_id: clientOrderId, price: limitPrice, reduce_only: false, side: signedSide, symbol: selectedSymbol, tif: 'GTC', ...(selectedBuilder ? { builder_code: selectedBuilder } : {}) };
      const signingType = orderType === 'market' ? 'create_market_order' : 'create_order';
      let signature: string | undefined;
      if (executionMode === 'wallet') {
        signature = await signMessage(buildMessageToSign(buildOrderSigningPayload(signingType, orderData, timestamp)));
      }
      const orderResult = await pacificaRequest<any>(orderType === 'market' ? '/orders/create-market' : '/orders/create-limit', walletAddress, {
        method: 'POST',
        body: JSON.stringify({ symbol: selectedSymbol, side: signedSide, amount: size, ...(orderType === 'limit' ? { price: limitPrice } : {}), leverage, clientOrderId, builderCode: selectedBuilder || undefined, signature, timestamp, executionMode }),
      });
      const orderId: string | undefined = orderResult?.order_id ?? orderResult?.id ?? orderResult?.clientOrderId;
      setNotice({ type: 'success', text: `${side === 'buy' ? 'Long' : 'Short'} ${selectedSymbol} order submitted${orderId ? ` · ID: ${String(orderId).slice(0, 12)}...` : ''}.` });
      setSize('');
      setLimitPrice('');
      void refreshBalance();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Order submission failed.' });
    } finally {
      setBusy(false);
    }
  }

  const renderPending = busy ? 'Submitting...' : null;
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, fontSize: 12, color: '#92400E', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>Testnet: all trades use Pacifica testnet funds only.</span>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <a href="https://test.pacifica.fi" target="_blank" rel="noopener noreferrer">Open Pacifica Testnet</a>
          <span style={{ color: '#D97706' }}>•</span>
          <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer">SOL Faucet</a>
        </div>
      </div>

      <div className="card" style={{ padding: '10px 14px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SYMBOLS.map((sym) => {
            const cfg = COIN_CONFIG[sym];
            const md = marketDataMap[sym];
            const active = sym === selectedSymbol;
            return (
              <button key={sym} onClick={() => { setSelectedSymbol(sym); setSize(''); setLimitPrice(''); setNotice(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 14, border: active ? `1.5px solid ${cfg.bg}` : '1px solid #E2E8F0', background: active ? `${cfg.bg}14` : '#F8FAFC', cursor: 'pointer', flexShrink: 0 }}>
                <CoinBadge symbol={sym} size={24} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#0F172A' : '#334155' }}>{sym}</div>
                  {md && md.price > 0 ? <div className="num" style={{ fontSize: 11, fontWeight: 700, color: md.change >= 0 ? '#059669' : '#DC2626' }}>{fmtChange(md.change)}</div> : <div style={{ fontSize: 11, color: '#94A3B8' }}>--</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: '18px 20px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)', border: '1px solid #DBE4F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CoinBadge symbol={selectedSymbol} size={36} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{selectedSymbol}/USDC</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{coin.label} Perpetual</div>
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: '#E2E8F0', flexShrink: 0 }} />
          {dataLoading ? <div className="skeleton" style={{ width: 120, height: 28 }} /> : <div><div className="num" style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1.1, letterSpacing: '-0.5px' }}>${fmtPrice(market.price, coin.tickSize)}</div><div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: market.change >= 0 ? '#059669' : '#DC2626', marginTop: 2 }}>{market.change >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}{fmtChange(market.change)}</div></div>}
          <div style={{ width: 1, height: 36, background: '#E2E8F0', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[{ label: 'Bid', value: market.bid > 0 ? `$${fmtPrice(market.bid, coin.tickSize)}` : '--', color: '#059669' }, { label: 'Ask', value: market.ask > 0 ? `$${fmtPrice(market.ask, coin.tickSize)}` : '--', color: '#DC2626' }, { label: '24h High', value: market.high > 0 ? `$${fmtPrice(market.high, coin.tickSize)}` : '--' }, { label: '24h Low', value: market.low > 0 ? `$${fmtPrice(market.low, coin.tickSize)}` : '--' }, { label: 'Volume', value: market.volume }, { label: 'Funding', value: market.fundingRate }, { label: 'Max Lev', value: `${market.maxLeverage}x` }].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                <div className="num" style={{ fontSize: 12, fontWeight: 700, color: color ?? '#0F172A' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="trade-grid">
        <PriceChart symbol={selectedSymbol} currentPrice={market.price} change24h={market.change} />
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div className="card-title">Place Order</div>
            {isConnected && <div style={{ fontSize: 11, color: '#64748B', textAlign: 'right' }}><span style={{ color: '#94A3B8' }}>Balance</span>{' '}<span className="num" style={{ fontWeight: 700, color: '#0F172A' }}>{walletBalance !== null ? `$${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}</span><span style={{ color: '#94A3B8' }}> USDC</span></div>}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['buy', 'sell'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setSide(value)} style={{ padding: '10px', borderRadius: 12, border: side === value ? 'none' : '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: side === value ? value === 'buy' ? '#10B981' : '#EF4444' : '#F8FAFC', color: side === value ? '#FFFFFF' : '#64748B' }}>
                  {value === 'buy' ? 'Long / Buy' : 'Short / Sell'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: 14, padding: 3, gap: 3, border: '1px solid #E2E8F0' }}>
              {(['market', 'limit'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setOrderType(value)} style={{ flex: 1, padding: '7px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: orderType === value ? '#FFFFFF' : 'transparent', color: orderType === value ? '#0F172A' : '#64748B', boxShadow: orderType === value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {value === 'market' ? 'Market' : 'Limit'}
                </button>
              ))}
            </div>
            {orderType === 'limit' && <div className="input-group"><label className="input-label">Price (USDC)</label><div style={{ position: 'relative' }}><input className="input-field" type="number" min="0" step={coin.tickSize} value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder={market.price > 0 ? fmtPrice(market.price, coin.tickSize) : '0.00'} />{market.price > 0 && <button type="button" onClick={() => setLimitPrice(market.price.toString())} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 999, padding: '2px 6px', cursor: 'pointer' }}>Mark</button>}</div></div>}
            <div className="input-group"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label className="input-label">Size ({selectedSymbol})</label><span style={{ fontSize: 10, color: '#64748B' }}>Min ${market.minOrderSize} USDC</span></div><input className="input-field" type="number" min="0" step={market.lotSize || '0.001'} value={size} onChange={(e) => setSize(e.target.value)} placeholder={`0.00 ${selectedSymbol}`} />{notional > 0 && <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Approx. ${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC</div>}</div>
            <div className="input-group"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label className="input-label">Leverage</label><span className="num" style={{ fontSize: 13, fontWeight: 800, color: leverage >= maxLev * 0.8 ? '#EF4444' : leverage >= maxLev * 0.5 ? '#F59E0B' : '#0F172A' }}>{leverage}x</span></div><input type="range" min={1} max={maxLev} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} style={{ width: '100%', accentColor: side === 'buy' ? '#10B981' : '#EF4444' }} /><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}><span>1x</span><span>{Math.round(maxLev / 2)}x</span><span>{maxLev}x</span></div></div>
            {market.bid > 0 && market.ask > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', padding: '10px 14px', fontSize: 12 }}><div><div style={{ color: '#10B981', fontWeight: 700, fontSize: 11 }}>BID</div><div className="num" style={{ fontWeight: 700 }}>${fmtPrice(market.bid, coin.tickSize)}</div></div><div style={{ textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}><SpreadIcon /><span style={{ fontSize: 10 }}>spread ${(market.ask - market.bid).toFixed(coin.tickSize < 0.01 ? 4 : 2)}</span></div><div style={{ textAlign: 'right' }}><div style={{ color: '#EF4444', fontWeight: 700, fontSize: 11 }}>ASK</div><div className="num" style={{ fontWeight: 700 }}>${fmtPrice(market.ask, coin.tickSize)}</div></div></div>}
            <div className="input-group"><label className="input-label">Execution Mode</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{(['wallet', 'agent'] as const).map((value) => { const disabled = value === 'agent' && (!agentStatus?.enabled || agentStatus.managedAccount !== walletAddress); return <button key={value} type="button" disabled={disabled} onClick={() => !disabled && setExecutionMode(value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 12, border: executionMode === value ? '1.5px solid #2563EB' : '1.5px solid #DBE4F0', background: executionMode === value ? '#EFF6FF' : '#FFFFFF', color: disabled ? '#CBD5E1' : executionMode === value ? '#2563EB' : '#475569', fontWeight: 700, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer' }}>{value === 'wallet' ? <><WalletIcon /> Wallet Sign</> : <><BotIcon /> Agent</>}</button>; })}</div></div>
            {approvals.length > 0 && <div className="input-group"><label className="input-label">Builder Code</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button type="button" onClick={() => setSelectedBuilder('')} style={{ padding: '5px 10px', borderRadius: 999, border: '1.5px solid #DBE4F0', background: selectedBuilder === '' ? '#F8FAFC' : '#FFFFFF', color: selectedBuilder === '' ? '#334155' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>None</button>{approvals.map((approval) => <button key={approval.builder_code} type="button" onClick={() => setSelectedBuilder(approval.builder_code)} style={{ padding: '5px 10px', borderRadius: 999, border: selectedBuilder === approval.builder_code ? '1.5px solid #2563EB' : '1.5px solid #DBE4F0', background: selectedBuilder === approval.builder_code ? '#EFF6FF' : '#FFFFFF', color: selectedBuilder === approval.builder_code ? '#2563EB' : '#334155', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{approval.builder_code}</button>)}</div></div>}
            <div style={{ background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', padding: '10px 14px', fontSize: 11, color: '#64748B', lineHeight: 1.7 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Type</span><span style={{ fontWeight: 700, color: '#334155' }}>{orderType === 'market' ? 'Market' : 'Limit'} {side === 'buy' ? 'Long' : 'Short'}</span></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Size</span><span style={{ fontWeight: 700, color: '#334155' }}>{size || '--'} {selectedSymbol}</span></div>{notional > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Notional</span><span style={{ fontWeight: 700, color: '#334155' }}>${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></div>}<div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Leverage</span><span style={{ fontWeight: 700, color: '#334155' }}>{leverage}x</span></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sign via</span><span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}><SignIcon />{executionMode === 'wallet' ? orderType === 'market' ? 'create_market_order' : 'create_order' : 'agent_wallet'}</span></div></div>
            {!isConnected ? <div style={{ textAlign: 'center', padding: '12px', background: '#F8FAFC', borderRadius: 14, fontSize: 13, color: '#64748B', border: '1px dashed #DBE4F0' }}>Connect wallet to trade</div> : <button type="submit" disabled={busy} style={{ padding: '12px', borderRadius: 14, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: '#FFFFFF', background: busy ? '#9CA3AF' : side === 'buy' ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #EF4444, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{renderPending ?? <><CoinBadge symbol={selectedSymbol} size={18} />{side === 'buy' ? 'Long' : 'Short'} {selectedSymbol}{notional > 0 && <span style={{ opacity: 0.8, fontWeight: 500, fontSize: 12 }}>• ${notional.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}</>}</button>}
            {notice && <div style={{ padding: '11px 14px', borderRadius: 14, fontSize: 12, fontWeight: 500, background: notice.type === 'success' ? '#F0FDF4' : '#FFF1F2', border: `1px solid ${notice.type === 'success' ? '#BBF7D0' : '#FECDD3'}`, color: notice.type === 'success' ? '#065F46' : '#9F1239' }}>{notice.text}</div>}
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
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { opacity: 1; }
      `}</style>
    </div>
  );
}
