import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SwarmVisualization from './SwarmVisualization';
import SwarmSkeleton from './SwarmSkeleton';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

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

interface AgentDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning?: string;
  positionSize?: number;
  leverage?: number;
  stopLossPct?: number;
  riskLevel?: string;
}

interface AnalyzeResponse {
  success: boolean;
  data?: {
    symbol: string;
    decision: AgentDecision;
    marketContext: {
      symbol: string;
      currentPrice: number;
      priceChange24h: number;
      volume24h: number;
      fundingRate: number;
    };
  };
  error?: string;
}

const AGENT_HISTORY = [
  { cycle: 'C1', analyst: 82, sentiment: 71, risk: 75, coordinator: 78 },
  { cycle: 'C2', analyst: 65, sentiment: 58, risk: 70, coordinator: 64 },
  { cycle: 'C3', analyst: 78, sentiment: 82, risk: 68, coordinator: 76 },
  { cycle: 'C4', analyst: 91, sentiment: 74, risk: 85, coordinator: 84 },
  { cycle: 'C5', analyst: 55, sentiment: 62, risk: 60, coordinator: 58 },
  { cycle: 'C6', analyst: 88, sentiment: 79, risk: 82, coordinator: 83 },
  { cycle: 'C7', analyst: 72, sentiment: 68, risk: 74, coordinator: 71 },
];

const RECENT_DECISIONS = [
  {
    time: '14:32',
    symbol: 'BTC/USD',
    action: 'BUY',
    confidence: 78,
    result: 'WIN',
    pnl: '+$20.53',
  },
  {
    time: '13:15',
    symbol: 'ETH/USD',
    action: 'SELL',
    confidence: 72,
    result: 'WIN',
    pnl: '+$51.84',
  },
  {
    time: '12:48',
    symbol: 'SOL/USD',
    action: 'BUY',
    confidence: 65,
    result: 'OPEN',
    pnl: '+$14.50',
  },
  {
    time: '11:20',
    symbol: 'BTC/USD',
    action: 'SELL',
    confidence: 80,
    result: 'WIN',
    pnl: '+$15.00',
  },
  {
    time: '10:05',
    symbol: 'ETH/USD',
    action: 'BUY',
    confidence: 58,
    result: 'LOSS',
    pnl: '-$72.00',
  },
];

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

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const res = await fetch('https://test-api.pacifica.fi/api/v1/info');
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
    setCycleIndex((i) => i + 1);

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
      const response = await fetch(`${API_BASE}/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTC', portfolioBalance: 10000 }),
      });

      const result: AnalyzeResponse = await response.json();

      if (result.success && result.data) {
        const { decision, marketContext } = result.data;

        setAgents([
          {
            id: 'fundamentals',
            name: 'Fundamentals',
            role: 'Tokenomics & Project',
            status: 'done' as const,
            decision: decision.action,
            confidence: Math.round(decision.confidence * 0.9),
            reasoning: 'Analyzed market conditions',
            color: '#2563EB',
          },
          {
            id: 'sentiment',
            name: 'Sentiment',
            role: 'Market Sentiment',
            status: 'done' as const,
            decision: decision.action,
            confidence: Math.round(decision.confidence * 0.85),
            reasoning: `Funding rate: ${marketContext.fundingRate}%`,
            color: '#7C3AED',
          },
          {
            id: 'technical',
            name: 'Technical',
            role: 'Price Action',
            status: 'done' as const,
            decision: decision.action,
            confidence: decision.confidence,
            reasoning: `Price: $${marketContext.currentPrice.toFixed(2)}`,
            color: '#0891B2',
          },
          {
            id: 'risk',
            name: 'Risk Manager',
            role: 'Position Sizing',
            status: 'done' as const,
            decision: decision.action,
            confidence: Math.round(decision.confidence * 0.95),
            reasoning: `Risk: ${decision.riskLevel || 'MEDIUM'}`,
            color: '#059669',
          },
        ]);

        setFinalDecision({
          action: decision.action,
          confidence: decision.confidence,
          leverage: decision.leverage || 1,
        });
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

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Cycles', value: '142', sub: 'All time' },
          { label: 'Avg. Confidence', value: '72.4%', sub: 'Last 30 days' },
          { label: 'Swarm Win Rate', value: '68.5%', sub: 'Based on decisions' },
          { label: 'Active Agents', value: '4/4', sub: 'All online' },
        ].map((s) => (
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
            <span className="card-title">Agent Status</span>
          </div>
          <div style={{ padding: '12px 20px' }}>
            {agents.map((agent, idx) => (
              <div
                key={agent.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: idx < agents.length - 1 ? '1px solid #F9FAFB' : 'none',
                }}
              >
                <div style={{ paddingTop: 2 }}>
                  <span
                    className="dot"
                    style={{
                      background: getStatusColor(agent.status),
                      boxShadow:
                        agent.status === 'analyzing'
                          ? '0 0 0 3px rgba(245,158,11,0.15)'
                          : agent.status === 'done'
                            ? '0 0 0 3px rgba(16,185,129,0.15)'
                            : 'none',
                      transition: 'all 0.3s',
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {agent.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{agent.role}</span>
                  </div>
                  {agent.status === 'analyzing' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        className="skeleton"
                        style={{ height: 10, width: 140, borderRadius: 4 }}
                      />
                    </div>
                  )}
                  {agent.status === 'done' && agent.reasoning && (
                    <p
                      style={{
                        fontSize: 11,
                        color: '#6B7280',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                    >
                      {agent.reasoning}
                    </p>
                  )}
                  {agent.status === 'idle' && (
                    <p style={{ fontSize: 11, color: '#D1D5DB' }}>Waiting...</p>
                  )}
                </div>
                {agent.status === 'done' && agent.decision && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 3,
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        background:
                          agent.decision === 'BUY'
                            ? '#ECFDF5'
                            : agent.decision === 'SELL'
                              ? '#FEF2F2'
                              : '#F3F4F6',
                        color:
                          agent.decision === 'BUY'
                            ? '#059669'
                            : agent.decision === 'SELL'
                              ? '#DC2626'
                              : '#6B7280',
                      }}
                    >
                      {agent.decision}
                    </span>
                    <span
                      className="num"
                      style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}
                    >
                      {agent.confidence}%
                    </span>
                  </div>
                )}
              </div>
            ))}
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
              {RECENT_DECISIONS.map((d, i) => (
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
                        color: d.pnl.startsWith('+') ? '#10B981' : '#EF4444',
                      }}
                    >
                      {d.pnl}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
