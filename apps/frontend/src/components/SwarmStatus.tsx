import React from 'react';

export interface SwarmAgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'done';
  decision?: 'BUY' | 'SELL' | 'HOLD' | null;
  confidence?: number | null;
  reasoning?: string | null;
}

interface SwarmStatusProps {
  agents: SwarmAgentStatus[];
  lastRun?: string | null;
  loading?: boolean;
  isRunningSwarm?: boolean;
  swarmError?: string | null;
  onRefresh?: () => void;
  onRunSwarm?: () => void;
}

const getStatusColor = (status: SwarmAgentStatus['status'], isRunning?: boolean) => {
  if (isRunning) return '#D97706';
  if (status === 'analyzing') return '#D97706';
  if (status === 'done') return '#059669';
  return '#94A3B8';
};

const getDecisionColor = (decision?: string | null) => {
  if (decision === 'BUY') return '#059669';
  if (decision === 'SELL') return '#DC2626';
  return '#64748B';
};

const getDecisionBadgeClass = (decision?: string | null) => {
  if (decision === 'BUY') return 'badge badge-buy';
  if (decision === 'SELL') return 'badge badge-sell';
  return 'badge badge-hold';
};

const toReadableTime = (iso?: string | null) => {
  if (!iso) return 'No cycle yet';
  return new Date(iso).toLocaleTimeString();
};

export default function SwarmStatus({
  agents,
  lastRun,
  loading = false,
  isRunningSwarm = false,
  swarmError = null,
  onRefresh,
  onRunSwarm,
}: SwarmStatusProps) {
  const coordinator = agents.find((agent) => agent.id === 'coordinator');
  const isActive = loading || isRunningSwarm;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="card-title">AI Swarm</span>
            {isRunningSwarm && (
              <span
                className="badge"
                style={{
                  background: '#FFFBEB',
                  color: '#D97706',
                  borderColor: '#FDE68A',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                Analyzing...
              </span>
            )}
            {loading && !isRunningSwarm && (
              <span
                className="badge"
                style={{ background: '#F8FAFC', color: '#64748B', borderColor: '#E2E8F0' }}
              >
                Syncing
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
            Last cycle: {toReadableTime(lastRun)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {onRunSwarm && (
            <button
              onClick={onRunSwarm}
              disabled={isActive}
              className="btn btn-primary btn-sm"
              title="Run a new AI swarm analysis cycle"
            >
              {isRunningSwarm ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Running...
                </span>
              ) : (
                'Run Analysis'
              )}
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isActive || !onRefresh}
            className="btn btn-ghost btn-sm"
            title="Refresh swarm status from DB"
          >
            Refresh
          </button>
        </div>
      </div>

      {swarmError && (
        <div
          style={{
            margin: '12px 18px 0',
            padding: '10px 12px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            fontSize: 12,
            color: '#991B1B',
          }}
        >
          {swarmError}
        </div>
      )}

      <div style={{ padding: '10px 18px 12px' }}>
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 0',
              borderBottom: idx < agents.length - 1 ? '1px solid #F1F5F9' : 'none',
              opacity: isRunningSwarm && agent.status === 'idle' ? 0.5 : 1,
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{ paddingTop: 4, flexShrink: 0 }}>
              <span
                className="dot"
                style={{
                  width: 10,
                  height: 10,
                  background: getStatusColor(
                    agent.status,
                    isRunningSwarm && agent.status === 'analyzing'
                  ),
                  boxShadow:
                    agent.status === 'analyzing' || isRunningSwarm
                      ? '0 0 0 4px rgba(245, 158, 11, 0.16)'
                      : 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{agent.name}</span>
                <span style={{ fontSize: 10, color: '#64748B' }}>{agent.role}</span>
              </div>

              {isRunningSwarm ? (
                <div className="skeleton" style={{ height: 9, width: 140, borderRadius: 999 }} />
              ) : agent.reasoning ? (
                <p
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    lineHeight: 1.45,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 240,
                  }}
                  title={agent.reasoning}
                >
                  {agent.reasoning}
                </p>
              ) : (
                <p style={{ fontSize: 11, color: '#94A3B8' }}>
                  {agent.status === 'idle' ? 'Waiting...' : 'No data yet'}
                </p>
              )}
            </div>

            {agent.decision && !isRunningSwarm && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <span className={getDecisionBadgeClass(agent.decision)}>{agent.decision}</span>
                <span className="num" style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                  {Math.round(agent.confidence ?? 0)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {coordinator?.decision && !isRunningSwarm && (
        <div
          style={{
            margin: '0 18px 18px',
            padding: '12px 14px',
            background:
              coordinator.decision === 'BUY'
                ? '#F0FDF4'
                : coordinator.decision === 'SELL'
                  ? '#FEF2F2'
                  : '#F8FAFC',
            borderRadius: 14,
            border: `1px solid ${
              coordinator.decision === 'BUY'
                ? '#D1FAE5'
                : coordinator.decision === 'SELL'
                  ? '#FEE2E2'
                  : '#E2E8F0'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
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
              Swarm Consensus
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: getDecisionColor(coordinator.decision) }}>
                {coordinator.decision}
              </span>
              <span style={{ fontSize: 12, color: '#475569' }}>
                {Math.round(coordinator.confidence ?? 0)}% confidence
              </span>
            </div>
          </div>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
            {toReadableTime(lastRun)}
          </span>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>
    </div>
  );
}
