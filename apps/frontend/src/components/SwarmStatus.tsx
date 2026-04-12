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
  onRefresh?: () => void;
}

const getStatusColor = (status: SwarmAgentStatus['status']) => {
  if (status === 'analyzing') return '#F59E0B';
  if (status === 'done') return '#10B981';
  return '#9CA3AF';
};

const getDecisionColor = (decision?: string | null) => {
  if (decision === 'BUY') return '#10B981';
  if (decision === 'SELL') return '#EF4444';
  return '#6B7280';
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
  onRefresh,
}: SwarmStatusProps) {
  const coordinator = agents.find((agent) => agent.id === 'coordinator');

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            {loading && (
              <span
                className="badge"
                style={{
                  background: '#FFFBEB',
                  color: '#D97706',
                  fontSize: 10,
                }}
              >
                Syncing
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
            Last cycle: {toReadableTime(lastRun)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={!onRefresh || loading}
          className="btn btn-primary btn-sm"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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

              {loading && agent.status === 'idle' ? (
                <div className="skeleton" style={{ height: 10, width: 140, borderRadius: 4 }} />
              ) : agent.reasoning ? (
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
              ) : (
                <p style={{ fontSize: 11, color: '#D1D5DB' }}>Waiting...</p>
              )}
            </div>

            {agent.decision && (
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}
              >
                <span className={getDecisionBadgeClass(agent.decision)}>{agent.decision}</span>
                <span className="num" style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>
                  {Math.round(agent.confidence ?? 0)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {coordinator?.decision && (
        <div
          style={{
            margin: '0 20px 16px',
            padding: '12px 16px',
            background:
              coordinator.decision === 'BUY'
                ? '#F0FDF4'
                : coordinator.decision === 'SELL'
                  ? '#FEF2F2'
                  : '#F9FAFB',
            borderRadius: 8,
            border: `1px solid ${
              coordinator.decision === 'BUY'
                ? '#D1FAE5'
                : coordinator.decision === 'SELL'
                  ? '#FEE2E2'
                  : '#E5E7EB'
            }`,
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
                  color: getDecisionColor(coordinator.decision),
                }}
              >
                {coordinator.decision}
              </span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {Math.round(coordinator.confidence ?? 0)}% confidence
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
