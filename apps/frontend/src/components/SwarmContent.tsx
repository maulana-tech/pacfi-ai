import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SwarmVisualization from './SwarmVisualization';
import SwarmSkeleton from './SwarmSkeleton';
import { useWalletContext } from './WalletConnect';

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
  confidence: number;
  result: 'WIN' | 'LOSS' | 'OPEN';
  pnl: number;
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

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

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

const MOCK_CYCLES = [
  {
    agents: [
      {
        id: 'market_analyst',
        decision: 'BUY' as const,
        confidence: 78,
        reasoning: 'RSI oversold, MACD bullish crossover detected',
      },
      {
        id: 'sentiment_agent',
        decision: 'BUY' as const,
        confidence: 65,
        reasoning: 'Funding rate negative, sentiment shifting bullish',
      },
      {
        id: 'risk_manager',
        decision: 'BUY' as const,
        confidence: 72,
        reasoning: 'Risk/reward 1:3.2, position size 2% portfolio',
      },
      {
        id: 'coordinator',
        decision: 'BUY' as const,
        confidence: 72,
        reasoning: 'Consensus: 3/3 agents agree on BUY signal',
      },
    ],
    final: { action: 'BUY', confidence: 72, leverage: 3 },
  },
  {
    agents: [
      {
        id: 'market_analyst',
        decision: 'SELL' as const,
        confidence: 82,
        reasoning: 'Price at resistance, bearish divergence on 4H',
      },
      {
        id: 'sentiment_agent',
        decision: 'HOLD' as const,
        confidence: 55,
        reasoning: 'Mixed signals, funding rate neutral',
      },
      {
        id: 'risk_manager',
        decision: 'SELL' as const,
        confidence: 70,
        reasoning: 'Downside risk elevated, reduce exposure',
      },
      {
        id: 'coordinator',
        decision: 'SELL' as const,
        confidence: 68,
        reasoning: 'Majority signal: SELL with moderate confidence',
      },
    ],
    final: { action: 'SELL', confidence: 68, leverage: 2 },
  },
];

export default function SwarmContent() {
  const { walletAddress, isConnected } = useWalletContext();
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isRunning, setIsRunning] = useState(false);
  const [finalDecision, setFinalDecision] = useState<{
    action: string;
    confidence: number;
    leverage: number;
  } | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<PacificaMarketData[]>([]);
  
  const [swarmHistory, setSwarmHistory] = useState<SwarmHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const fetchMarketData = async () => {
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
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

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

    setIsRunning(true);
    setFinalDecision(null);

    const cycle = MOCK_CYCLES[cycleIndex % MOCK_CYCLES.length];
    setCycleIndex((i) => i + 1);

    setAgents(INITIAL_AGENTS.map((a) => ({ ...a, status: 'idle' as const })));

    for (let i = 0; i < cycle.agents.length; i++) {
      const agentData = cycle.agents[i];

      setAgents((prev) =>
        prev.map((a) => (a.id === agentData.id ? { ...a, status: 'analyzing' as const } : a))
      );

      await new Promise((r) => setTimeout(r, 1200));

      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentData.id
            ? {
                ...a,
                status: 'done' as const,
                decision: agentData.decision,
                confidence: agentData.confidence,
                reasoning: agentData.reasoning,
              }
            : a
        )
      );

      await new Promise((r) => setTimeout(r, 300));
    }

    setFinalDecision(cycle.final);
    setLastRun(new Date().toLocaleTimeString());
    setIsRunning(false);
  };

  const stats =
    swarmHistory && !loading && !error
      ? [
          { label: 'Total Cycles', value: String(swarmHistory.stats.totalCycles), sub: 'All time' },
          { label: 'Avg. Confidence', value: `${swarmHistory.stats.avgConfidence.toFixed(1)}%`, sub: 'Last 30 days' },
          { label: 'Swarm Win Rate', value: `${swarmHistory.stats.winRate.toFixed(1)}%`, sub: 'Based on decisions' },
          { label: 'Active Agents', value: `${swarmHistory.stats.activeAgents}/4`, sub: 'All online' },
        ]
      : [
          { label: 'Total Cycles', value: '-', sub: 'All time' },
          { label: 'Avg. Confidence', value: '-', sub: 'Last 30 days' },
          { label: 'Swarm Win Rate', value: '-', sub: 'Based on decisions' },
          { label: 'Active Agents', value: '-', sub: 'All online' },
        ];

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value num">{s.value}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{s.sub}</div>
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
                style={{ background: '#FFFBEB', color: '#D97706', fontSize: 10 }}
              >
                Running
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
        <div style={{ height: 'calc(100vh - 320px)', minHeight: 500, position: 'relative' }}>
          <SwarmVisualization
            agents={agents}
            isRunning={isRunning}
            showMarketNodes
            marketData={marketData}
          />
        </div>
        {finalDecision && (
          <div
            style={{
              margin: '0 20px 16px',
              padding: '12px 16px',
              background:
                finalDecision.action === 'BUY'
                  ? '#F0FDF4'
                  : finalDecision.action === 'SELL'
                    ? '#FEF2F2'
                    : '#F9FAFB',
              borderRadius: 8,
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
                  color: '#9CA3AF',
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
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
            <span className="card-title">Agent History (Last 7 Cycles)</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {!isConnected ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                Connect wallet to view agent history
              </div>
            ) : loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ) : error ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                {error}
              </div>
            ) : swarmHistory && swarmHistory.agentHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={swarmHistory.agentHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    formatter={(v: number) => `${v}%`}
                    contentStyle={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11 }}
                  />
                  <Bar dataKey="market_analyst" stackId="a" fill="#2563EB" name="Market Analyst" />
                  <Bar dataKey="sentiment_agent" stackId="a" fill="#7C3AED" name="Sentiment Agent" />
                  <Bar dataKey="risk_manager" stackId="a" fill="#0891B2" name="Risk Manager" />
                  <Bar dataKey="coordinator" stackId="a" fill="#059669" name="Coordinator" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                No agent history yet
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>
                    Connect wallet to view decisions
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#EF4444' }}>
                    {error}
                  </td>
                </tr>
              ) : swarmHistory && swarmHistory.decisions.length > 0 ? (
                swarmHistory.decisions.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{d.time}</span>
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
                        {d.confidence}%
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>
                    No decisions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
