import React from 'react';
import SwarmStatus from './SwarmStatus';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AGENT_HISTORY = [
  { cycle: 'C1', analyst: 82, sentiment: 71, risk: 75, coordinator: 78 },
  { cycle: 'C2', analyst: 65, sentiment: 58, risk: 70, coordinator: 64 },
  { cycle: 'C3', analyst: 78, sentiment: 82, risk: 68, coordinator: 76 },
  { cycle: 'C4', analyst: 91, sentiment: 74, risk: 85, coordinator: 84 },
  { cycle: 'C5', analyst: 55, sentiment: 62, risk: 60, coordinator: 58 },
  { cycle: 'C6', analyst: 88, sentiment: 79, risk: 82, coordinator: 83 },
  { cycle: 'C7', analyst: 72, sentiment: 68, risk: 74, coordinator: 71 },
];

const AGENT_STATS = [
  { name: 'Market Analyst', model: 'Qwen-Max', accuracy: '71.2%', calls: 142, avgConf: '76%', color: '#2563EB' },
  { name: 'Sentiment Agent', model: 'Qwen-Plus', accuracy: '68.5%', calls: 142, avgConf: '69%', color: '#7C3AED' },
  { name: 'Risk Manager', model: 'Qwen-Turbo', accuracy: '74.8%', calls: 142, avgConf: '73%', color: '#0891B2' },
  { name: 'Coordinator', model: 'Qwen-Max', accuracy: '68.5%', calls: 142, avgConf: '72%', color: '#059669' },
];

const RECENT_DECISIONS = [
  { time: '14:32', symbol: 'BTC/USD', action: 'BUY', confidence: 78, result: 'WIN', pnl: '+$20.53' },
  { time: '13:15', symbol: 'ETH/USD', action: 'SELL', confidence: 72, result: 'WIN', pnl: '+$51.84' },
  { time: '12:48', symbol: 'SOL/USD', action: 'BUY', confidence: 65, result: 'OPEN', pnl: '+$14.50' },
  { time: '11:20', symbol: 'BTC/USD', action: 'SELL', confidence: 80, result: 'WIN', pnl: '+$15.00' },
  { time: '10:05', symbol: 'ETH/USD', action: 'BUY', confidence: 58, result: 'LOSS', pnl: '-$72.00' },
];

export default function SwarmContent() {
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

      {/* Live swarm + agent stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        {/* Agent stats */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Agent Performance</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>All time</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {AGENT_STATS.map((agent) => (
              <div
                key={agent.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  background: '#F9FAFB',
                  borderRadius: 8,
                  border: '1px solid #F3F4F6',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: agent.color + '15',
                    border: `1px solid ${agent.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke={agent.color} strokeWidth="1.5" />
                    <circle cx="8" cy="8" r="2.5" fill={agent.color} />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{agent.name}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{agent.model}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: 'Accuracy', value: agent.accuracy },
                      { label: 'Calls', value: agent.calls },
                      { label: 'Avg Conf.', value: agent.avgConf },
                    ].map((m) => (
                      <div key={m.label}>
                        <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {m.label}
                        </div>
                        <div className="num" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <span className="dot dot-green" />
              </div>
            ))}
          </div>
        </div>

        {/* Live swarm */}
        <SwarmStatus />
      </div>

      {/* Confidence chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Agent Confidence per Cycle</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last 7 cycles</span>
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={AGENT_HISTORY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="analyst" name="Market Analyst" fill="#2563EB" radius={[2, 2, 0, 0]} />
              <Bar dataKey="sentiment" name="Sentiment" fill="#7C3AED" radius={[2, 2, 0, 0]} />
              <Bar dataKey="risk" name="Risk Manager" fill="#0891B2" radius={[2, 2, 0, 0]} />
              <Bar dataKey="coordinator" name="Coordinator" fill="#059669" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent decisions */}
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
              <th style={{ textAlign: 'right' }}>Confidence</th>
              <th>Result</th>
              <th style={{ textAlign: 'right' }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_DECISIONS.map((d, i) => (
              <tr key={i}>
                <td><span style={{ fontSize: 12, color: '#9CA3AF' }}>{d.time}</span></td>
                <td><span style={{ fontWeight: 600, color: '#111827' }}>{d.symbol}</span></td>
                <td>
                  <span className={d.action === 'BUY' ? 'badge badge-buy' : 'badge badge-sell'}>
                    {d.action}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {d.confidence}%
                  </span>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: d.result === 'WIN' ? '#ECFDF5' : d.result === 'LOSS' ? '#FEF2F2' : '#EFF6FF',
                      color: d.result === 'WIN' ? '#059669' : d.result === 'LOSS' ? '#DC2626' : '#2563EB',
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
  );
}
