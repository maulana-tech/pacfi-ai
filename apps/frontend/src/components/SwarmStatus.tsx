import React, { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'done';
  decision?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
}

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'market_analyst',
    name: 'Market Analyst',
    role: 'Technical Analysis',
    status: 'idle',
  },
  {
    id: 'sentiment_agent',
    name: 'Sentiment Agent',
    role: 'Market Sentiment',
    status: 'idle',
  },
  {
    id: 'risk_manager',
    name: 'Risk Manager',
    role: 'Position Sizing',
    status: 'idle',
  },
  {
    id: 'coordinator',
    name: 'Coordinator',
    role: 'Final Decision',
    status: 'idle',
  },
];

const MOCK_CYCLES = [
  {
    agents: [
      { id: 'market_analyst', decision: 'BUY' as const, confidence: 78, reasoning: 'RSI oversold, MACD bullish crossover detected' },
      { id: 'sentiment_agent', decision: 'BUY' as const, confidence: 65, reasoning: 'Funding rate negative, sentiment shifting bullish' },
      { id: 'risk_manager', decision: 'BUY' as const, confidence: 72, reasoning: 'Risk/reward 1:3.2, position size 2% portfolio' },
      { id: 'coordinator', decision: 'BUY' as const, confidence: 72, reasoning: 'Consensus: 3/3 agents agree on BUY signal' },
    ],
    final: { action: 'BUY', confidence: 72, leverage: 3 },
  },
  {
    agents: [
      { id: 'market_analyst', decision: 'SELL' as const, confidence: 82, reasoning: 'Price at resistance, bearish divergence on 4H' },
      { id: 'sentiment_agent', decision: 'HOLD' as const, confidence: 55, reasoning: 'Mixed signals, funding rate neutral' },
      { id: 'risk_manager', decision: 'SELL' as const, confidence: 70, reasoning: 'Downside risk elevated, reduce exposure' },
      { id: 'coordinator', decision: 'SELL' as const, confidence: 68, reasoning: 'Majority signal: SELL with moderate confidence' },
    ],
    final: { action: 'SELL', confidence: 68, leverage: 2 },
  },
];

export default function SwarmStatus() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isRunning, setIsRunning] = useState(false);
  const [finalDecision, setFinalDecision] = useState<{ action: string; confidence: number; leverage: number } | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runCycle = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setFinalDecision(null);

    const cycle = MOCK_CYCLES[cycleIndex % MOCK_CYCLES.length];
    setCycleIndex((i) => i + 1);

    // Reset agents
    setAgents(INITIAL_AGENTS.map((a) => ({ ...a, status: 'idle' as const })));

    // Animate each agent sequentially
    for (let i = 0; i < cycle.agents.length; i++) {
      const agentData = cycle.agents[i];

      // Set to analyzing
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentData.id ? { ...a, status: 'analyzing' as const } : a
        )
      );

      await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

      // Set to done with result
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

      await new Promise((r) => setTimeout(r, 200));
    }

    setFinalDecision(cycle.final);
    setLastRun(new Date().toLocaleTimeString());
    setIsRunning(false);
  };

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

  const getDecisionBadgeClass = (decision?: string) => {
    if (decision === 'BUY') return 'badge badge-buy';
    if (decision === 'SELL') return 'badge badge-sell';
    return 'badge badge-hold';
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">AI Swarm</span>
            {isRunning && (
              <span
                className="badge"
                style={{
                  background: '#FFFBEB',
                  color: '#D97706',
                  fontSize: 10,
                  animation: 'pulse 1.5s infinite',
                }}
              >
                Running
              </span>
            )}
          </div>
          {lastRun && (
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              Last cycle: {lastRun}
            </p>
          )}
        </div>
        <button
          onClick={runCycle}
          disabled={isRunning}
          className="btn btn-primary btn-sm"
        >
          {isRunning ? (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="5.5" cy="5.5" r="4.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M5.5 1 A4.5 4.5 0 0 1 10 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <polygon points="2,1 10,5.5 2,10" fill="white" />
              </svg>
              Run Cycle
            </>
          )}
        </button>
      </div>

      {/* Agents */}
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
            {/* Status indicator */}
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

            {/* Agent info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {agent.name}
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{agent.role}</span>
              </div>

              {agent.status === 'analyzing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="skeleton" style={{ height: 10, width: 140, borderRadius: 4 }} />
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
                    maxWidth: 220,
                  }}
                >
                  {agent.reasoning}
                </p>
              )}

              {agent.status === 'idle' && (
                <p style={{ fontSize: 11, color: '#D1D5DB' }}>Waiting...</p>
              )}
            </div>

            {/* Decision badge */}
            {agent.status === 'done' && agent.decision && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span className={getDecisionBadgeClass(agent.decision)}>{agent.decision}</span>
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

      {/* Final Decision */}
      {finalDecision && (
        <div
          style={{
            margin: '0 20px 16px',
            padding: '12px 16px',
            background: finalDecision.action === 'BUY' ? '#F0FDF4' : finalDecision.action === 'SELL' ? '#FEF2F2' : '#F9FAFB',
            borderRadius: 8,
            border: `1px solid ${finalDecision.action === 'BUY' ? '#D1FAE5' : finalDecision.action === 'SELL' ? '#FEE2E2' : '#E5E7EB'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
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
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>Leverage</div>
            <span className="num" style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
              {finalDecision.leverage}x
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
