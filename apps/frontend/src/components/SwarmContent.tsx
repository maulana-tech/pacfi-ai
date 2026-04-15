import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SwarmVisualization from './SwarmVisualization';
import { useWalletContext } from './WalletConnect';
import {
  buildMessageToSign,
  buildOrderSigningPayload,
  pacificaRequest,
} from '../lib/pacifica';

interface PacificaMarketData {
  symbol: string;
  mark: string;
  mid: string;
  oracle: string;
  funding: string;
  next_funding: string;
  open_interest: string;
  volume_24h: string;
  yesterday_price: string;
  timestamp: number;
}

interface SwarmDecision {
  time: string;
  symbol: string;
  action: string;
  confidence: number | null;
  result: 'WIN' | 'LOSS' | 'OPEN';
  pnl: number;
}

interface AnalyzeAgent {
  name: string;
  decision: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}

interface AnalyzeResponse {
  symbol: string;
  requestedSymbol: string;
  modelProvider: string;
  model: string;
  agents: AnalyzeAgent[];
  decision: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    leverage?: number;
  };
}

interface AgentHistoryItem {
  cycle: string;
  market_analyst: number;
  sentiment_agent: number;
  risk_manager: number;
  coordinator: number;
}

interface SwarmHistoryData {
  decisions: SwarmDecision[];
  agentHistory: AgentHistoryItem[];
  stats: {
    totalCycles: number;
    avgConfidence: number;
    winRate: number;
    activeAgents: number;
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'done';
  decision?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
  color: string;
}

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

const MARKET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'LINK', 'LTC'];

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'market_analyst',
    name: 'Market Analyst',
    role: 'Technical Analysis',
    status: 'idle',
    color: '#2563EB',
  },
  {
    id: 'sentiment_agent',
    name: 'Sentiment Agent',
    role: 'Market Sentiment',
    status: 'idle',
    color: '#7C3AED',
  },
  {
    id: 'risk_manager',
    name: 'Risk Manager',
    role: 'Position Sizing',
    status: 'idle',
    color: '#0891B2',
  },
  {
    id: 'coordinator',
    name: 'Coordinator',
    role: 'Final Decision',
    status: 'idle',
    color: '#059669',
  },
];

export default function SwarmContent() {
  const { walletAddress, isConnected, signMessage } = useWalletContext();
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isRunning, setIsRunning] = useState(false);
  const [finalDecision, setFinalDecision] = useState<{
    action: string;
    confidence: number;
    leverage: number;
  } | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('pacfi_chart_symbol');
      return stored && MARKET_SYMBOLS.includes(stored as (typeof MARKET_SYMBOLS)[number])
        ? stored
        : 'BTC';
    } catch {
      return 'BTC';
    }
  });
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<PacificaMarketData[]>([]);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    'idle' | 'executing' | 'success' | 'failed'
  >('idle');

  const [swarmHistory, setSwarmHistory] = useState<SwarmHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoTradeNotice, setAutoTradeNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSwarmHistory = async () => {
    if (!isConnected || !walletAddress) {
      setLoading(false);
      setError('Connect your wallet to view swarm history.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_URL}/dashboard/swarm-history`, {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      const json = (await res.json()) as ApiEnvelope<SwarmHistoryData>;
      if (json.success) {
        setSwarmHistory(json.data);
      } else {
        setError(json.error ?? 'Failed to load swarm history.');
      }
    } catch {
      setError('Network error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwarmHistory();
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      return;
    }
    const interval = setInterval(fetchSwarmHistory, 30000);
    return () => clearInterval(interval);
  }, [isConnected, walletAddress]);

  useEffect(() => {
    const fetchMarketDataFn = async () => {
      try {
        const res = await fetch('https://test-api.pacifica.fi/api/v1/info/prices');
        const json = (await res.json()) as { success: boolean; data: PacificaMarketData[] };
        if (json.success && Array.isArray(json.data)) {
          setMarketData(json.data);
        }
      } catch (err) {
        console.error('[SwarmContent] Failed to fetch market data:', err);
      }
    };
    fetchMarketDataFn();
    const interval = setInterval(fetchMarketDataFn, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pacfi_chart_symbol', selectedSymbol);
    } catch {
      // ignore browser storage failure
    }
  }, [selectedSymbol]);

  const getStatusColor = (status: Agent['status']) => {
    if (status === 'analyzing') return '#F59E0B';
    if (status === 'done') return '#10B981';
    return '#9CA3AF';
  };

  const getDecisionColor = (decision?: string) => {
    if (decision === 'BUY') return '#10B981';
    if (decision === 'SELL') return '#EF4444';
    return '#6B7280';
  };

  const runCycle = async () => {
    if (isRunning) return;
    if (!isConnected || !walletAddress) {
      setError('Connect wallet to run real AI swarm analysis.');
      return;
    }

    setIsRunning(true);
    setFinalDecision(null);
    setExecutionStatus('idle');
    setAutoTradeNotice(null);

    setAgents(
      INITIAL_AGENTS.map((a) => ({
        ...a,
        status: 'analyzing' as const,
        decision: undefined,
        confidence: undefined,
        reasoning: undefined,
      }))
    );

    try {
      const response = await fetch(`${API_URL}/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': walletAddress },
        body: JSON.stringify({ symbol: selectedSymbol, portfolioBalance: 10000 }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const { decision, marketContext } = result.data;

        const price = marketContext?.price ?? marketContext?.markPrice ?? 0;
        const fundingRate = marketContext?.fundingRate ?? 0;
        const fundingPct = typeof fundingRate === 'number'
          ? (fundingRate * 100).toFixed(4)
          : fundingRate;

        setAgents([
          {
            id: 'market_analyst',
            name: 'Market Analyst',
            role: 'Technical Analysis',
            status: 'done' as const,
            decision: decision.action,
            confidence: Math.round(decision.confidence * 0.9),
            reasoning: price > 0 ? `Price: $${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : decision.reasoning,
            color: '#2563EB',
          },
          {
            id: 'sentiment_agent',
            name: 'Sentiment Agent',
            role: 'Market Sentiment',
            status: 'done' as const,
            decision: decision.action,
            confidence: Math.round(decision.confidence * 0.85),
            reasoning: `Funding: ${fundingPct}%`,
            color: '#7C3AED',
          },
          {
            id: 'risk_manager',
            name: 'Risk Manager',
            role: 'Position Sizing',
            status: 'done' as const,
            decision: decision.action,
            confidence: Math.round(decision.confidence * 0.95),
            reasoning: decision.positionSize
              ? `Size: $${decision.positionSize} · Lev: ${decision.leverage ?? 1}x`
              : decision.reasoning,
            color: '#0891B2',
          },
          {
            id: 'coordinator',
            name: 'Coordinator',
            role: 'Final Decision',
            status: 'done' as const,
            decision: decision.action,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            color: '#059669',
          },
        ]);

        setFinalDecision({
          action: decision.action,
          confidence: decision.confidence,
          leverage: decision.leverage || 1,
        });

        // ── Auto-trade: sign via Phantom and submit ──────────────────────
        if (
          autoTradeEnabled &&
          (decision.action === 'BUY' || decision.action === 'SELL') &&
          decision.confidence >= 60
        ) {
          setExecutionStatus('executing');
          try {
            // Calculate amount in base asset units from position size (USD)
            const currentPrice =
              price > 0
                ? price
                : parseFloat(
                    marketData.find((m) => m.symbol.toUpperCase() === selectedSymbol)?.mark ?? '0'
                  );
            const positionUSD = decision.positionSize ?? 50;
            const rawAmount = currentPrice > 0 ? positionUSD / currentPrice : 0.001;
            // Round to 4 significant decimal places
            const amount = String(parseFloat(rawAmount.toPrecision(4)));

            const timestamp = Date.now();
            const clientOrderId = crypto.randomUUID();
            const signedSide = decision.action === 'BUY' ? 'bid' : 'ask';
            const orderData = {
              amount,
              client_order_id: clientOrderId,
              reduce_only: false,
              side: signedSide,
              slippage_percent: '0.5',
              symbol: selectedSymbol,
            };

            const message = buildMessageToSign(
              buildOrderSigningPayload('create_market_order', orderData, timestamp)
            );
            // Phantom opens here ↓
            const signature = await signMessage(message);

            await pacificaRequest<unknown>('/orders/create-market', walletAddress, {
              method: 'POST',
              body: JSON.stringify({
                symbol: selectedSymbol,
                side: signedSide,
                amount,
                leverage: decision.leverage ?? 1,
                clientOrderId,
                signature,
                timestamp,
                executionMode: 'wallet',
              }),
            });

            setExecutionStatus('success');
            setAutoTradeNotice({
              type: 'success',
              text: `${decision.action} ${selectedSymbol} submitted — ${amount} @ market`,
            });
          } catch (execErr) {
            setExecutionStatus('failed');
            setAutoTradeNotice({
              type: 'error',
              text: execErr instanceof Error ? execErr.message : 'Order submission failed',
            });
          }
        }
      } else {
        console.error('Analyze failed:', result.error);
        setAgents(INITIAL_AGENTS.map((a) => ({ ...a, status: 'idle' as const })));
      }
    } catch (err) {
      console.error('Failed to run cycle:', err);
      setAgents(INITIAL_AGENTS.map((a) => ({ ...a, status: 'idle' as const })));
    }

    setLastRun(new Date().toLocaleTimeString());
    setIsRunning(false);
  };

  const stats =
    swarmHistory && !loading && !error
      ? [
          { label: 'Total Cycles', value: String(swarmHistory.stats.totalCycles), sub: 'All time' },
          {
            label: 'Avg. Confidence',
            value: `${swarmHistory.stats.avgConfidence.toFixed(1)}%`,
            sub: 'Last 30 days',
          },
          {
            label: 'Swarm Win Rate',
            value: `${swarmHistory.stats.winRate.toFixed(1)}%`,
            sub: 'Based on decisions',
          },
          {
            label: 'Active Agents',
            value: `${swarmHistory.stats.activeAgents}/4`,
            sub: 'All online',
          },
        ]
      : [
          { label: 'Total Cycles', value: '-', sub: 'All time' },
          { label: 'Avg. Confidence', value: '-', sub: 'Last 30 days' },
          { label: 'Swarm Win Rate', value: '-', sub: 'Based on decisions' },
          { label: 'Active Agents', value: '-', sub: 'All online' },
        ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats row */}
      <div className="swarm-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value num">{s.value}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Swarm Network - Full Width */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">AI Swarm Network</span>
            {isRunning && (
              <span
                className="badge"
                style={{ background: '#FFFBEB', color: '#D97706', fontSize: 10, borderColor: '#FDE68A' }}
              >
                Running
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {MARKET_SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoTradeEnabled}
                onChange={(e) => setAutoTradeEnabled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-Trade
            </label>
            {lastRun && <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last: {lastRun}</span>}
            <button
              onClick={runCycle}
              disabled={isRunning}
              className="btn btn-primary"
              style={{ padding: '6px 16px', fontSize: 12 }}
            >
              {isRunning ? 'Analyzing...' : 'Run Cycle'}
            </button>
          </div>
        </div>
        <div style={{ height: 'calc(100vh - 320px)', minHeight: 500, position: 'relative', padding: '0 18px 18px' }}>
          <SwarmVisualization
            agents={agents}
            isRunning={isRunning}
            showMarketNodes
            marketData={marketData}
          />
        </div>
        {executionStatus === 'executing' && (
          <div style={{ margin: '0 20px 12px', padding: '10px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
            Waiting for Phantom confirmation…
          </div>
        )}

        {autoTradeNotice && (
          <div style={{ margin: '0 20px 12px', padding: '10px 16px', background: autoTradeNotice.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${autoTradeNotice.type === 'success' ? '#BBF7D0' : '#FECACA'}`, borderRadius: 12, fontSize: 12, color: autoTradeNotice.type === 'success' ? '#166534' : '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{autoTradeNotice.type === 'success' ? '✓' : '✕'} {autoTradeNotice.text}</span>
            <button onClick={() => setAutoTradeNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', opacity: 0.6, padding: '0 4px' }}>×</button>
          </div>
        )}

        {finalDecision && (
          <div
            style={{
            margin: '0 20px 20px',
            padding: '12px 16px',
            background:
              finalDecision.action === 'BUY'
                  ? '#F0FDF4'
                  : finalDecision.action === 'SELL'
                    ? '#FEF2F2'
                    : '#F9FAFB',
              borderRadius: 14,
              border: `1px solid ${finalDecision.action === 'BUY' ? '#D1FAE5' : finalDecision.action === 'SELL' ? '#FEE2E2' : '#E5E7EB'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4,
                }}
              >
                Swarm Decision
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: getDecisionColor(finalDecision.action),
                  }}
                >
                  {finalDecision.action}
                </span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  {finalDecision.confidence}% confidence
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>
                Leverage
              </div>
              <span className="num" style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
                {finalDecision.leverage}x
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Agent Status + Recent Decisions side by side */}
      <div className="swarm-panels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <span className="card-title">Agent History (Last 7 Cycles)</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {!isConnected ? (
              <div
                style={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                Connect wallet to view agent history
              </div>
            ) : loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ) : error ? (
              <div
                style={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                }}
              >
                {error}
              </div>
            ) : swarmHistory && swarmHistory.agentHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={swarmHistory.agentHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="cycle"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(v: number) => `${v}%`}
                    contentStyle={{
                      background: '#FFF',
                      border: '1px solid #DBE4F0',
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="market_analyst" stackId="a" fill="#2563EB" name="Market Analyst" />
                  <Bar
                    dataKey="sentiment_agent"
                    stackId="a"
                    fill="#7C3AED"
                    name="Sentiment Agent"
                  />
                  <Bar dataKey="risk_manager" stackId="a" fill="#0891B2" name="Risk Manager" />
                  <Bar dataKey="coordinator" stackId="a" fill="#059669" name="Coordinator" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                No agent history yet
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <span className="card-title">Recent AI Decisions</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Action</th>
                <th style={{ textAlign: 'right' }}>Conf.</th>
                <th>Result</th>
                <th style={{ textAlign: 'right' }}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {!isConnected ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}
                  >
                    Connect wallet to view decisions
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '20px', color: '#EF4444' }}
                  >
                    {error}
                  </td>
                </tr>
              ) : swarmHistory && swarmHistory.decisions.length > 0 ? (
                swarmHistory.decisions.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{d.time}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{d.symbol}</span>
                    </td>
                    <td>
                      <span className={d.action === 'BUY' ? 'badge badge-buy' : 'badge badge-sell'}>
                        {d.action}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className="num"
                        style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}
                      >
                        {d.confidence != null ? `${d.confidence}%` : '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            d.result === 'WIN'
                              ? '#ECFDF5'
                              : d.result === 'LOSS'
                                ? '#FEF2F2'
                                : '#EFF6FF',
                          color:
                            d.result === 'WIN'
                              ? '#059669'
                              : d.result === 'LOSS'
                                ? '#DC2626'
                                : '#2563EB',
                        }}
                      >
                        {d.result}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className="num"
                        style={{
                          fontWeight: 700,
                          color: d.pnl >= 0 ? '#10B981' : '#EF4444',
                        }}
                      >
                        {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}
                  >
                    No decisions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (max-width: 1180px) {
          .swarm-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .swarm-panels-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .swarm-stat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
