# Agent Execution Plan — Pacfi AI

**Target:** Aplikasi fully running tanpa mock data di halaman utama.  
**Format:** Tiap task atomic, spesifik, dan bisa dikerjakan tanpa memahami keseluruhan arsitektur.  
**Aturan agent:** Baca file yang disebutkan, tulis perubahan sesuai spec, jangan ubah hal lain.

---

## Konteks Singkat

- Backend: Hono di `apps/backend/src/`, port 3001
- Frontend: Astro + React di `apps/frontend/src/`, port 3000
- Database: PostgreSQL + Drizzle ORM. Schema di `apps/backend/src/db/schema.ts`
- Semua response backend dibungkus: `{ success: true, data: ..., timestamp: ... }`
- Helper: `successEnvelope(data)` dan `errorEnvelope(msg)` dari `apps/backend/src/lib/api.ts`
- Wallet context dari header `X-Wallet-Address`: `getWalletContext(c)` dari `apps/backend/src/middleware/auth.ts`
- API URL di frontend: `import.meta.env.PUBLIC_API_URL` (default `http://localhost:3001`)

---

## GRUP A — Backend: Endpoint Portfolio

### T-A1: Tambah route `/dashboard/portfolio`

**File:** `apps/backend/src/routes/dashboard.ts`  
**Lokasi insert:** Setelah baris `router.get('/summary', ...)` (sekitar baris 208), sebelum `router.get('/positions', ...)`  
**Depends on:** Tidak ada

**Tambahkan kode berikut persis setelah penutup handler `/summary` (`});` sekitar baris 262):**

```typescript
router.get('/portfolio', async (c) => {
  try {
    const wallet = getWalletContext(c);
    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const [balance, positions] = await Promise.all([
      pacificaClient.getBalance(wallet.walletAddress).catch(() => 0),
      pacificaClient.getPositions(wallet.walletAddress).catch(() => []),
    ]);

    const openPositions = Array.isArray(positions) ? (positions as PositionLike[]) : [];

    // Allocation from open positions
    const totalNotional = openPositions.reduce((acc, p) => {
      return acc + parseNumber(p.size, 0) * parseNumber(p.entryPrice, 0);
    }, 0);

    const allocationMap = new Map<string, number>();
    for (const p of openPositions) {
      const sym = String(p.symbol ?? 'UNKNOWN').toUpperCase();
      const notional = parseNumber(p.size, 0) * parseNumber(p.entryPrice, 0);
      allocationMap.set(sym, (allocationMap.get(sym) ?? 0) + notional);
    }

    const COLORS: Record<string, string> = {
      'BTC/USD': '#F7931A',
      'ETH/USD': '#627EEA',
      'SOL/USD': '#9945FF',
    };

    const allocation = Array.from(allocationMap.entries()).map(([name, notional]) => ({
      name,
      value: totalNotional > 0 ? Math.round((notional / totalNotional) * 100) : 0,
      color: COLORS[name] ?? '#E5E7EB',
    }));

    const userRow = await db.query.users.findFirst({
      where: eq(users.walletAddress, wallet.walletAddress),
      columns: { id: true },
    });

    if (!userRow) {
      return c.json(
        successEnvelope({
          totalBalance: balance,
          availableBalance: balance,
          totalPnL: 0,
          totalROI: 0,
          winRate: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalTrades: 0,
          allocation,
          equityCurve: [],
        })
      );
    }

    // All closed trades for metrics
    const allTrades = await db
      .select({
        pnl: trades.pnl,
        roi: trades.roi,
        status: trades.status,
        executedAt: trades.executedAt,
      })
      .from(trades)
      .where(eq(trades.userId, userRow.id))
      .orderBy(asc(trades.executedAt));

    const closedTrades = allTrades.filter((t) => t.status === 'CLOSED');
    const wins = closedTrades.filter((t) => parseNumber(t.pnl, 0) > 0);
    const losses = closedTrades.filter((t) => parseNumber(t.pnl, 0) <= 0);

    const totalPnL = closedTrades.reduce((acc, t) => acc + parseNumber(t.pnl, 0), 0);
    const totalROI = closedTrades.reduce((acc, t) => acc + parseNumber(t.roi, 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + parseNumber(t.pnl, 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, t) => a + parseNumber(t.pnl, 0), 0) / losses.length : 0;
    const sumWins = wins.reduce((a, t) => a + parseNumber(t.pnl, 0), 0);
    const sumLosses = Math.abs(losses.reduce((a, t) => a + parseNumber(t.pnl, 0), 0));
    const profitFactor = sumLosses > 0 ? sumWins / sumLosses : sumWins > 0 ? 99 : 0;

    // Equity curve: last 30 days, cumulative PnL per day
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTrades = closedTrades.filter(
      (t) => t.executedAt && new Date(t.executedAt) >= thirtyDaysAgo
    );

    const dayMap = new Map<string, number>();
    for (const t of recentTrades) {
      const day = new Date(t.executedAt!).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      dayMap.set(day, (dayMap.get(day) ?? 0) + parseNumber(t.pnl, 0));
    }

    // Build 30-day series
    const equityCurve: { date: string; equity: number }[] = [];
    let runningEquity = balance - totalPnL; // approximate starting balance
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      runningEquity += dayMap.get(label) ?? 0;
      equityCurve.push({ date: label, equity: parseFloat(runningEquity.toFixed(2)) });
    }

    // Sharpe from roi values
    const roiValues = closedTrades.map((t) => parseNumber(t.roi, 0));
    const sharpeRatio = computeSharpe(roiValues);

    // Max drawdown: peak-to-trough on equity curve
    let peak = equityCurve[0]?.equity ?? 0;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const openPnl = openPositions.reduce((acc, p) => acc + parseNumber(p.unrealizedPnl ?? 0, 0), 0);
    const availableBalance = balance - openPositions.reduce((acc, p) => {
      return acc + parseNumber(p.size, 0) * parseNumber(p.entryPrice, 0) / parseNumber(p.leverage ?? 1, 1);
    }, 0);

    return c.json(
      successEnvelope({
        totalBalance: balance,
        availableBalance: Math.max(0, availableBalance),
        totalPnL,
        openPnl,
        totalROI,
        winRate,
        sharpeRatio,
        maxDrawdown,
        avgWin,
        avgLoss,
        profitFactor,
        totalTrades: allTrades.length,
        allocation,
        equityCurve,
      })
    );
  } catch (error) {
    console.error('[Dashboard] Error fetching portfolio:', error);
    return c.json(errorEnvelope('Failed to fetch portfolio'), 500);
  }
});
```

**Done when:** `GET /dashboard/portfolio` dengan header `X-Wallet-Address: <addr>` mengembalikan JSON `{ success: true, data: { totalBalance, equityCurve: [...], allocation: [...], ... } }`.

---

### T-A2: Tambah route `/dashboard/swarm-history`

**File:** `apps/backend/src/routes/dashboard.ts`  
**Lokasi insert:** Setelah penutup handler `/swarm-status` (`});` sekitar baris 443), sebelum `/leaderboard-teaser`  
**Depends on:** Tidak ada

**Tambahkan kode berikut:**

```typescript
router.get('/swarm-history', async (c) => {
  try {
    const wallet = getWalletContext(c);
    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const limitInput = Number.parseInt(c.req.query('limit') ?? '10', 10);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 50) : 10;

    const userRow = await db.query.users.findFirst({
      where: eq(users.walletAddress, wallet.walletAddress),
      columns: { id: true },
    });

    if (!userRow) {
      return c.json(
        successEnvelope({
          decisions: [],
          agentHistory: [],
          stats: { totalCycles: 0, avgConfidence: 0, winRate: 0, activeAgents: 4 },
        })
      );
    }

    // Recent decisions: trades with linked ai_logs (coordinator decision)
    const recentTrades = await db
      .select({
        id: trades.id,
        symbol: trades.symbol,
        side: trades.side,
        pnl: trades.pnl,
        status: trades.status,
        executedAt: trades.executedAt,
        aiReasoning: trades.aiReasoning,
      })
      .from(trades)
      .where(eq(trades.userId, userRow.id))
      .orderBy(desc(trades.executedAt))
      .limit(limit);

    // Get coordinator confidence for those trades
    const tradeIds = recentTrades.map((t) => t.id);
    const coordinatorLogs = tradeIds.length > 0
      ? await db
          .select({
            tradeId: aiLogs.tradeId,
            confidence: aiLogs.confidence,
            outputDecision: aiLogs.outputDecision,
          })
          .from(aiLogs)
          .where(eq(aiLogs.userId, userRow.id))
      : [];

    const confidenceByTrade = new Map<string, number>();
    for (const log of coordinatorLogs) {
      if (log.tradeId && !confidenceByTrade.has(log.tradeId)) {
        confidenceByTrade.set(log.tradeId, parseNumber(log.confidence, 0));
      }
    }

    const decisions = recentTrades.map((t) => {
      const pnlVal = parseNumber(t.pnl, 0);
      const result = t.status === 'OPEN' ? 'OPEN' : pnlVal > 0 ? 'WIN' : 'LOSS';
      const pnlStr = t.pnl
        ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}`
        : null;
      const executedDate = t.executedAt ? new Date(t.executedAt) : new Date();
      const time = executedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      return {
        time,
        symbol: t.symbol,
        action: t.side === 'BUY' ? 'BUY' : 'SELL',
        confidence: confidenceByTrade.get(t.id) ?? null,
        result,
        pnl: pnlStr,
      };
    });

    // Agent history: group last 7 cycles by trade (tradeId groups an agent run)
    const recentLogs = await db
      .select({
        tradeId: aiLogs.tradeId,
        agentName: aiLogs.agentName,
        confidence: aiLogs.confidence,
        timestamp: aiLogs.timestamp,
      })
      .from(aiLogs)
      .where(eq(aiLogs.userId, userRow.id))
      .orderBy(desc(aiLogs.timestamp))
      .limit(200);

    // Group by tradeId (each tradeId = one cycle)
    const cycleMap = new Map<string, { agentName: string; confidence: number }[]>();
    for (const log of recentLogs) {
      const key = log.tradeId ?? `solo-${log.agentName}`;
      if (!cycleMap.has(key)) cycleMap.set(key, []);
      cycleMap.get(key)!.push({
        agentName: log.agentName.toLowerCase(),
        confidence: parseNumber(log.confidence, 0),
      });
    }

    const cycleKeys = Array.from(cycleMap.keys()).slice(0, 7);
    const agentHistory = cycleKeys.map((key, idx) => {
      const logs = cycleMap.get(key)!;
      const getConf = (name: string) =>
        logs.find((l) => l.agentName.includes(name))?.confidence ?? 0;
      return {
        cycle: `C${idx + 1}`,
        analyst: getConf('market'),
        sentiment: getConf('sentiment'),
        risk: getConf('risk'),
        coordinator: getConf('coordinator'),
      };
    });

    // Stats
    const allLogs = await db
      .select({ confidence: aiLogs.confidence, agentName: aiLogs.agentName })
      .from(aiLogs)
      .where(eq(aiLogs.userId, userRow.id));

    const totalCycles = cycleMap.size;
    const avgConfidence =
      allLogs.length > 0
        ? allLogs.reduce((a, l) => a + parseNumber(l.confidence, 0), 0) / allLogs.length
        : 0;

    const closedTrades = recentTrades.filter((t) => t.status === 'CLOSED');
    const wins = closedTrades.filter((t) => parseNumber(t.pnl, 0) > 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    const activeAgentNames = new Set(allLogs.map((l) => l.agentName.toLowerCase()));
    const activeAgents = Math.min(activeAgentNames.size, 4);

    return c.json(
      successEnvelope({
        decisions,
        agentHistory,
        stats: {
          totalCycles,
          avgConfidence: parseFloat(avgConfidence.toFixed(1)),
          winRate: parseFloat(winRate.toFixed(1)),
          activeAgents,
        },
      })
    );
  } catch (error) {
    console.error('[Dashboard] Error fetching swarm history:', error);
    return c.json(errorEnvelope('Failed to fetch swarm history'), 500);
  }
});
```

**Done when:** `GET /dashboard/swarm-history` dengan header `X-Wallet-Address` mengembalikan `{ success: true, data: { decisions: [...], agentHistory: [...], stats: {...} } }`.

---

## GRUP B — Frontend: PortfolioContent Live API

### T-B1: Replace PortfolioContent.tsx dengan versi live

**File:** `apps/frontend/src/components/PortfolioContent.tsx`  
**Action:** Ganti seluruh isi file dengan kode di bawah. Ini menghapus semua konstanta mock dan mengganti dengan fetch ke `/dashboard/portfolio`.  
**Depends on:** T-A1

```tsx
import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import TradesTable from './TradesTable';

interface PortfolioData {
  totalBalance: number;
  availableBalance: number;
  totalPnL: number;
  openPnl: number;
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalTrades: number;
  allocation: { name: string; value: number; color: string }[];
  equityCurve: { date: string; equity: number }[];
}

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

function formatUSD(value: number, showSign = false): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortfolioContent() {
  const [tab, setTab] = useState<'history' | 'performance'>('history');
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const walletAddress =
    typeof window !== 'undefined' ? (window as any).__wallet?.publicKey?.toString() ?? '' : '';

  const fetchPortfolio = async () => {
    if (!walletAddress) {
      setLoading(false);
      setError('Connect your wallet to view portfolio.');
      return;
    }
    try {
      setError(null);
      const res = await fetch(`${API_URL}/dashboard/portfolio`, {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data as PortfolioData);
      } else {
        setError(json.error ?? 'Failed to load portfolio.');
      }
    } catch {
      setError('Network error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error ?? 'No data.'}</p>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={fetchPortfolio}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const openPnlPct = data.totalBalance > 0 ? (data.openPnl / data.totalBalance) * 100 : 0;

  const stats = [
    {
      label: 'Total Balance',
      value: formatUSD(data.totalBalance),
      sub: `${formatUSD(data.totalPnL, true)} all time`,
    },
    {
      label: 'Realized P&L',
      value: formatUSD(data.totalPnL, true),
      sub: 'All time',
    },
    {
      label: 'Unrealized P&L',
      value: formatUSD(data.openPnl, true),
      sub: `${openPnlPct >= 0 ? '+' : ''}${openPnlPct.toFixed(2)}% of balance`,
    },
    {
      label: 'Available Margin',
      value: formatUSD(data.availableBalance),
      sub: `${data.totalBalance > 0 ? Math.round((data.availableBalance / data.totalBalance) * 100) : 0}% of balance`,
    },
  ];

  const performanceMetrics = [
    { label: 'Total Return', value: `${data.totalROI >= 0 ? '+' : ''}${data.totalROI.toFixed(1)}%`, positive: data.totalROI >= 0 },
    { label: 'Sharpe Ratio', value: data.sharpeRatio.toFixed(2), positive: data.sharpeRatio >= 0 },
    { label: 'Max Drawdown', value: `-${data.maxDrawdown.toFixed(1)}%`, positive: false },
    { label: 'Win Rate', value: `${data.winRate.toFixed(1)}%`, positive: data.winRate >= 50 },
    { label: 'Avg. Win', value: formatUSD(data.avgWin, true), positive: true },
    { label: 'Avg. Loss', value: formatUSD(data.avgLoss, true), positive: false },
    { label: 'Profit Factor', value: data.profitFactor.toFixed(2), positive: data.profitFactor >= 1 },
    { label: 'Total Trades', value: String(data.totalTrades), positive: true },
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

      {/* Equity curve + allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Equity Curve</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last 30 days</span>
          </div>
          <div style={{ height: 180 }}>
            {data.equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.equityCurve} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']}
                    contentStyle={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#2563EB" strokeWidth={1.5} fill="url(#equityGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: 13 }}>
                No trade history yet
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Allocation</span>
          </div>
          {data.allocation.length > 0 ? (
            <>
              <div style={{ height: 120, marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.allocation} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                      {data.allocation.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.allocation.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: '#374151' }}>{item.name}</span>
                    </div>
                    <span className="num" style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#9CA3AF', fontSize: 13 }}>
              No open positions
            </div>
          )}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Performance Metrics</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {performanceMetrics.map((m) => (
            <div
              key={m.label}
              style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F3F4F6' }}
            >
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {m.label}
              </div>
              <div className="num" style={{ fontSize: 16, fontWeight: 800, color: m.positive ? '#10B981' : '#EF4444' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade history */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
          {(['history', 'performance'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: tab === t ? '#EFF6FF' : 'transparent',
                color: tab === t ? '#2563EB' : '#9CA3AF',
                transition: 'all 0.15s',
              }}
            >
              {t === 'history' ? 'Trade History' : 'AI Performance'}
            </button>
          ))}
        </div>
        {tab === 'history' && <TradesTable />}
        {tab === 'performance' && (
          <div style={{ padding: '20px', color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
            AI performance breakdown coming soon
          </div>
        )}
      </div>
    </div>
  );
}
```

**Done when:** Halaman `/portfolio` tidak lagi menampilkan angka random saat reload. Jika belum ada trade, equity curve menampilkan "No trade history yet". Jika wallet tidak terhubung, tampil pesan dan tombol Retry.

---

## GRUP C — Frontend: SwarmContent Live Data

### T-C1: Replace data mock di SwarmContent.tsx dengan live API

**File:** `apps/frontend/src/components/SwarmContent.tsx`  
**Action:** Ganti konstanta `AGENT_HISTORY`, `RECENT_DECISIONS`, dan stats row hardcoded dengan fetch ke `/dashboard/swarm-history`. JANGAN ganti `MOCK_CYCLES` — itu untuk animasi UI, bukan data real.  
**Depends on:** T-A2

**Perubahan spesifik:**

1. **Hapus baris 19–70** (konstanta `AGENT_HISTORY` dan `RECENT_DECISIONS`)

2. **Tambahkan interface dan state baru** setelah import (setelah baris `import SwarmSkeleton from './SwarmSkeleton';`):

```tsx
const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

interface SwarmHistoryData {
  decisions: {
    time: string;
    symbol: string;
    action: string;
    confidence: number | null;
    result: string;
    pnl: string | null;
  }[];
  agentHistory: {
    cycle: string;
    analyst: number;
    sentiment: number;
    risk: number;
    coordinator: number;
  }[];
  stats: {
    totalCycles: number;
    avgConfidence: number;
    winRate: number;
    activeAgents: number;
  };
}
```

3. **Di dalam fungsi `SwarmContent()`**, tambahkan state dan fetch setelah deklarasi state yang sudah ada (setelah `const [marketData, setMarketData] = useState...`):

```tsx
  const [swarmHistory, setSwarmHistory] = useState<SwarmHistoryData | null>(null);

  const walletAddress =
    typeof window !== 'undefined' ? (window as any).__wallet?.publicKey?.toString() ?? '' : '';

  useEffect(() => {
    const fetchSwarmHistory = async () => {
      if (!walletAddress) return;
      try {
        const res = await fetch(`${API_URL}/dashboard/swarm-history?limit=10`, {
          headers: { 'X-Wallet-Address': walletAddress },
        });
        const json = await res.json();
        if (json.success) setSwarmHistory(json.data as SwarmHistoryData);
      } catch {
        // silently fail, keep showing placeholder
      }
    };
    fetchSwarmHistory();
    const interval = setInterval(fetchSwarmHistory, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);
```

4. **Ganti stats row hardcoded** (baris 261–275, bagian `[{ label: 'Total Cycles', ...}]`) dengan:

```tsx
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Cycles', value: swarmHistory ? String(swarmHistory.stats.totalCycles) : '—', sub: 'All time' },
          { label: 'Avg. Confidence', value: swarmHistory ? `${swarmHistory.stats.avgConfidence}%` : '—', sub: 'Last 30 days' },
          { label: 'Swarm Win Rate', value: swarmHistory ? `${swarmHistory.stats.winRate}%` : '—', sub: 'Based on decisions' },
          { label: 'Active Agents', value: swarmHistory ? `${swarmHistory.stats.activeAgents}/4` : '4/4', sub: 'All online' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value num">{s.value}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>
```

5. **Ganti prop `data` pada BarChart** — di bagian Agent History chart, ubah `data={AGENT_HISTORY}` menjadi:

```tsx
data={swarmHistory?.agentHistory ?? []}
```

6. **Ganti `RECENT_DECISIONS.map(...)` di tabel Recent AI Decisions** dengan:

```tsx
{(swarmHistory?.decisions ?? []).length > 0 ? (
  (swarmHistory!.decisions).map((d, i) => (
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
          {d.confidence !== null ? `${d.confidence}%` : '—'}
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
          style={{ fontWeight: 700, color: d.pnl?.startsWith('+') ? '#10B981' : '#EF4444' }}
        >
          {d.pnl ?? '—'}
        </span>
      </td>
    </tr>
  ))
) : (
  <tr>
    <td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px', fontSize: 13 }}>
      {walletAddress ? 'No AI decisions yet' : 'Connect wallet to view decisions'}
    </td>
  </tr>
)}
```

**Done when:** Tabel Recent AI Decisions menampilkan data dari DB (atau empty state jika belum ada). Stats row tidak lagi hardcoded. BarChart kosong jika belum ada history.

---

## GRUP D — Validasi & Cleanup

### T-D1: Type-check semua package

**Command:** Dari root repo, jalankan:
```bash
pnpm type-check
```

**Done when:** Output tidak ada error TypeScript. Warning boleh ada.

---

### T-D2: Verifikasi endpoint baru terdaftar di router

**File:** `apps/backend/src/routes/dashboard.ts`  
**Check:** Pastikan ada 2 route baru:
- `router.get('/portfolio', ...)`
- `router.get('/swarm-history', ...)`

Jalankan backend dan test manual:
```bash
curl -H "X-Wallet-Address: test123" http://localhost:3001/dashboard/portfolio
curl -H "X-Wallet-Address: test123" http://localhost:3001/dashboard/swarm-history
```

**Done when:** Kedua endpoint mengembalikan `{ "success": true, "data": {...} }` (bukan 404).

---

## Ringkasan Urutan Eksekusi

```
T-A1 → T-B1 (portfolio endpoint dulu, baru frontend)
T-A2 → T-C1 (swarm history endpoint dulu, baru frontend)
T-A1 + T-A2 bisa dikerjakan paralel
T-B1 + T-C1 bisa dikerjakan paralel setelah A selesai
T-D1 + T-D2 terakhir setelah semua selesai
```

## Yang TIDAK diubah oleh plan ini

- `MOCK_CYCLES` di `SwarmContent.tsx` — tetap dipakai untuk animasi UI saat tombol "Run Cycle" ditekan
- `TradesTable` component — sudah live, tidak perlu diubah
- Leaderboard — sudah live
- Dashboard halaman utama — sudah live
- Trading page — sudah live
- Auth middleware — tidak diubah
- Database schema — tidak diubah (tidak perlu migrasi baru)
