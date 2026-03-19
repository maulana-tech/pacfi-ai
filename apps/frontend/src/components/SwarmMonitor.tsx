import React, { useState, useEffect } from 'react';

interface SwarmLog {
  id: string;
  agent: string;
  message: string;
  confidence?: number;
  timestamp: string;
}

export default function SwarmMonitor() {
  const [logs, setLogs] = useState<SwarmLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate real-time updates for now
    const mockLogs: SwarmLog[] = [
      {
        id: '1',
        agent: 'Market Analyst',
        message: 'Analyzing SOL/USD price action. Current price: $150.25',
        confidence: 85,
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        agent: 'Sentiment Agent',
        message: 'Funding rate at 0.05%. Market sentiment is neutral.',
        confidence: 72,
        timestamp: new Date().toISOString(),
      },
      {
        id: '3',
        agent: 'Risk Manager',
        message: 'Calculated optimal position size: 10 SOL with 5x leverage',
        confidence: 90,
        timestamp: new Date().toISOString(),
      },
    ];

    setLogs(mockLogs);
    setIsConnected(true);

    // Simulate new logs every 10 seconds
    const interval = setInterval(() => {
      const newLog: SwarmLog = {
        id: Date.now().toString(),
        agent: ['Market Analyst', 'Sentiment Agent', 'Risk Manager'][
          Math.floor(Math.random() * 3)
        ],
        message: 'Analyzing market conditions...',
        confidence: Math.floor(Math.random() * 30) + 70,
        timestamp: new Date().toISOString(),
      };

      setLogs((prev) => [newLog, ...prev].slice(0, 20));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getAgentColor = (agent: string): string => {
    const colors: Record<string, string> = {
      'Market Analyst': '#2563eb',
      'Sentiment Agent': '#f59e0b',
      'Risk Manager': '#ef4444',
      Coordinator: '#10b981',
    };
    return colors[agent] || '#6b7280';
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold">Live Swarm Activity</h2>
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isConnected ? '#10b981' : '#ef4444',
            animation: isConnected ? 'pulse 2s infinite' : 'none',
          }}
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Waiting for swarm activity...</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded border bg-gray-50"
              style={{
                borderLeftColor: getAgentColor(log.agent),
                borderLeftWidth: '4px',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: getAgentColor(log.agent) }}
                  >
                    {log.agent}
                  </span>
                  <p className="text-gray-700 text-sm mt-1">{log.message}</p>
                  {log.confidence && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${log.confidence}%`,
                            backgroundColor: getAgentColor(log.agent),
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{log.confidence}%</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);
