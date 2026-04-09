import { Hono } from 'hono';
import { asc, desc, eq } from 'drizzle-orm';
import { getWalletContext } from '../middleware/auth';
import { PacificaClient } from '../services/pacifica';
import { db } from '../db';
import { aiLogs, leaderboard, trades, users } from '../db/schema';

const router = new Hono();
const pacificaClient = new PacificaClient();

const DEFAULT_AGENTS = [
  { id: 'market_analyst', name: 'Market Analyst', role: 'Technical Analysis' },
  { id: 'sentiment_agent', name: 'Sentiment Agent', role: 'Market Sentiment' },
  { id: 'risk_manager', name: 'Risk Manager', role: 'Position Sizing' },
  { id: 'coordinator', name: 'Coordinator', role: 'Final Decision' },
];

type PositionLike = {
  symbol?: string;
  side?: string;
  size?: string | number;
  entryPrice?: string | number;
  markPrice?: string | number;
  liquidationPrice?: string | number;
  leverage?: string | number;
  unrealizedPnl?: string | number;
  pnlPct?: string | number;
};

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const toIso = (value: Date | string | null | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
};

const withEnvelope = <T>(data: T) => ({
  success: true,
  data,
  error: null,
  timestamp: new Date().toISOString(),
});

type ComputedLeaderboardRow = {
  walletAddress: string;
  username: string | null;
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  updatedAt: string;
};

type LeaderboardSortBy = 'roi' | 'winrate' | 'trades' | 'sharpe';
type LeaderboardOrder = 'asc' | 'desc';
type LeaderboardPeriod = 'all' | '7d' | '30d';

const computeSharpe = (returns: number[]): number => {
  if (returns.length === 0) {
    return 0;
  }
  const mean = returns.reduce((acc, value) => acc + value, 0) / returns.length;
  const variance =
    returns.reduce((acc, value) => acc + (value - mean) * (value - mean), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) {
    return mean;
  }
  return (mean / stdDev) * Math.sqrt(returns.length);
};

async function buildComputedLeaderboard(): Promise<ComputedLeaderboardRow[]> {
  return buildComputedLeaderboardWithPeriod('all');
}

function getPeriodStartMs(period: LeaderboardPeriod): number | null {
  const now = Date.now();
  if (period === '7d') {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  if (period === '30d') {
    return now - 30 * 24 * 60 * 60 * 1000;
  }
  return null;
}

async function buildComputedLeaderboardWithPeriod(
  period: LeaderboardPeriod
): Promise<ComputedLeaderboardRow[]> {
  const rows = await db
    .select({
      walletAddress: users.walletAddress,
      username: users.username,
      status: trades.status,
      roi: trades.roi,
      pnl: trades.pnl,
      executedAt: trades.executedAt,
    })
    .from(trades)
    .innerJoin(users, eq(trades.userId, users.id));

  const byWallet = new Map<
    string,
    {
      walletAddress: string;
      username: string | null;
      totalTrades: number;
      closedTrades: number;
      wins: number;
      roiValues: number[];
      totalROI: number;
      latestTimestamp: number;
    }
  >();

  for (const row of rows) {
    const executedTime = row.executedAt ? new Date(row.executedAt).getTime() : 0;
    const periodStartMs = getPeriodStartMs(period);
    if (periodStartMs !== null && executedTime > 0 && executedTime < periodStartMs) {
      continue;
    }

    const key = row.walletAddress;
    if (!byWallet.has(key)) {
      byWallet.set(key, {
        walletAddress: row.walletAddress,
        username: row.username ?? null,
        totalTrades: 0,
        closedTrades: 0,
        wins: 0,
        roiValues: [],
        totalROI: 0,
        latestTimestamp: 0,
      });
    }

    const bucket = byWallet.get(key)!;
    bucket.totalTrades += 1;
    bucket.latestTimestamp = Math.max(bucket.latestTimestamp, executedTime);

    if (row.status === 'CLOSED') {
      bucket.closedTrades += 1;
      const roi = parseNumber(row.roi, 0);
      bucket.roiValues.push(roi);
      bucket.totalROI += roi;
      if (parseNumber(row.pnl, 0) > 0) {
        bucket.wins += 1;
      }
    }
  }

  return Array.from(byWallet.values())
    .filter((row) => row.totalTrades > 0)
    .map((row) => ({
      walletAddress: row.walletAddress,
      username: row.username,
      totalROI: row.totalROI,
      winRate: row.closedTrades > 0 ? (row.wins / row.closedTrades) * 100 : 0,
      sharpeRatio: computeSharpe(row.roiValues),
      totalTrades: row.totalTrades,
      updatedAt: row.latestTimestamp ? new Date(row.latestTimestamp).toISOString() : new Date().toISOString(),
    }));
}

function sortLeaderboardRows(
  rows: ComputedLeaderboardRow[],
  sortBy: LeaderboardSortBy,
  order: LeaderboardOrder
): ComputedLeaderboardRow[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left =
      sortBy === 'winrate'
        ? a.winRate
        : sortBy === 'trades'
          ? a.totalTrades
          : sortBy === 'sharpe'
            ? a.sharpeRatio
            : a.totalROI;
    const right =
      sortBy === 'winrate'
        ? b.winRate
        : sortBy === 'trades'
          ? b.totalTrades
          : sortBy === 'sharpe'
            ? b.sharpeRatio
            : b.totalROI;

    if (left === right) {
      return (b.totalROI - a.totalROI) * direction;
    }
    return (left - right) * direction;
  });
}

router.get('/summary', async (c) => {
  try {
    const wallet = getWalletContext(c);
    if (!wallet) {
      return c.json({ success: false, data: null, error: 'Invalid wallet address' }, 400);
    }

    const [balance, positions] = await Promise.all([
      pacificaClient.getBalance(wallet.walletAddress).catch(() => 0),
      pacificaClient.getPositions(wallet.walletAddress).catch(() => []),
    ]);

    const openPositions = Array.isArray(positions) ? (positions as PositionLike[]) : [];
    const openPnl = openPositions.reduce((acc, item) => {
      return acc + parseNumber(item.unrealizedPnl ?? 0, 0);
    }, 0);

    const userRow = await db.query.users.findFirst({
      where: eq(users.walletAddress, wallet.walletAddress),
      columns: { id: true },
    });

    let totalTrades = 0;
    let winRate = 0;

    if (userRow) {
      const userTrades = await db
        .select({ pnl: trades.pnl, status: trades.status })
        .from(trades)
        .where(eq(trades.userId, userRow.id));

      totalTrades = userTrades.length;

      const closed = userTrades.filter((trade) => trade.status === 'CLOSED');
      const wins = closed.filter((trade) => parseNumber(trade.pnl, 0) > 0).length;
      winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    }

    const openPnlPct = balance > 0 ? (openPnl / balance) * 100 : 0;

    return c.json(
      withEnvelope({
        totalBalance: balance,
        openPnl,
        openPnlPct,
        winRate,
        totalTrades,
        openPositions: openPositions.length,
      })
    );
  } catch (error) {
    console.error('[Dashboard] Error fetching summary:', error);
    return c.json({ success: false, data: null, error: 'Failed to fetch dashboard summary' }, 500);
  }
});

router.get('/positions', async (c) => {
  try {
    const wallet = getWalletContext(c);
    if (!wallet) {
      return c.json({ success: false, data: null, error: 'Invalid wallet address' }, 400);
    }

    const positions = await pacificaClient.getPositions(wallet.walletAddress);
    const normalized = Array.isArray(positions)
      ? (positions as PositionLike[]).map((item) => {
          const symbol = String(item.symbol ?? 'UNKNOWN').toUpperCase();
          const sideRaw = String(item.side ?? 'LONG').toUpperCase();
          const side = sideRaw === 'ASK' || sideRaw === 'SHORT' ? 'SHORT' : 'LONG';

          return {
            symbol,
            side,
            size: parseNumber(item.size, 0),
            entryPrice: parseNumber(item.entryPrice, 0),
            markPrice: parseNumber(item.markPrice, parseNumber(item.entryPrice, 0)),
            pnl: parseNumber(item.unrealizedPnl, 0),
            pnlPct: parseNumber(item.pnlPct, 0),
            liquidationPrice: parseNumber(item.liquidationPrice, 0),
            leverage: parseNumber(item.leverage, 1),
          };
        })
      : [];

    return c.json(withEnvelope(normalized));
  } catch (error) {
    console.error('[Dashboard] Error fetching positions:', error);
    return c.json({ success: false, data: null, error: 'Failed to fetch positions' }, 500);
  }
});

router.get('/trades', async (c) => {
  try {
    const wallet = getWalletContext(c);
    if (!wallet) {
      return c.json({ success: false, data: null, error: 'Invalid wallet address' }, 400);
    }

    const limitInput = Number.parseInt(c.req.query('limit') ?? '10', 10);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 50) : 10;

    const userRow = await db.query.users.findFirst({
      where: eq(users.walletAddress, wallet.walletAddress),
      columns: { id: true },
    });

    if (!userRow) {
      return c.json(withEnvelope([]));
    }

    const rows = await db
      .select({
        id: trades.id,
        symbol: trades.symbol,
        side: trades.side,
        size: trades.size,
        entryPrice: trades.entryPrice,
        exitPrice: trades.exitPrice,
        pnl: trades.pnl,
        roi: trades.roi,
        status: trades.status,
        leverage: trades.leverage,
        executedAt: trades.executedAt,
      })
      .from(trades)
      .where(eq(trades.userId, userRow.id))
      .orderBy(desc(trades.executedAt))
      .limit(limit);

    const normalized = rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      side: row.side === 'BUY' ? 'BUY' : 'SELL',
      size: parseNumber(row.size, 0),
      entryPrice: parseNumber(row.entryPrice, 0),
      exitPrice: row.exitPrice ? parseNumber(row.exitPrice, 0) : null,
      pnl: row.pnl ? parseNumber(row.pnl, 0) : null,
      pnlPct: row.roi ? parseNumber(row.roi, 0) : null,
      status: row.status === 'OPEN' ? 'OPEN' : 'CLOSED',
      leverage: parseNumber(row.leverage, 1),
      executedAt: toIso(row.executedAt),
    }));

    return c.json(withEnvelope(normalized));
  } catch (error) {
    console.error('[Dashboard] Error fetching trades:', error);
    return c.json({ success: false, data: null, error: 'Failed to fetch trades' }, 500);
  }
});

router.get('/swarm-status', async (c) => {
  try {
    const wallet = getWalletContext(c);
    if (!wallet) {
      return c.json({ success: false, data: null, error: 'Invalid wallet address' }, 400);
    }

    const userRow = await db.query.users.findFirst({
      where: eq(users.walletAddress, wallet.walletAddress),
      columns: { id: true },
    });

    if (!userRow) {
      return c.json(
        withEnvelope({
          agents: DEFAULT_AGENTS.map((agent) => ({
            ...agent,
            status: 'idle',
            decision: null,
            confidence: null,
            reasoning: null,
          })),
          lastRun: null,
        })
      );
    }

    const logs = await db
      .select({
        agentName: aiLogs.agentName,
        outputDecision: aiLogs.outputDecision,
        confidence: aiLogs.confidence,
        timestamp: aiLogs.timestamp,
      })
      .from(aiLogs)
      .where(eq(aiLogs.userId, userRow.id))
      .orderBy(desc(aiLogs.timestamp))
      .limit(50);

    const latestByAgent = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      const key = log.agentName.toLowerCase();
      if (!latestByAgent.has(key)) {
        latestByAgent.set(key, log);
      }
    }

    const mapAgentLog = (agentId: string) => {
      if (agentId === 'market_analyst') return latestByAgent.get('market analyst');
      if (agentId === 'sentiment_agent') return latestByAgent.get('sentiment agent');
      if (agentId === 'risk_manager') return latestByAgent.get('risk manager');
      if (agentId === 'coordinator') return latestByAgent.get('coordinator');
      return undefined;
    };

    const agents = DEFAULT_AGENTS.map((agent) => {
      const log = mapAgentLog(agent.id);
      const decisionRaw = (log?.outputDecision ?? '').toUpperCase();
      const decision = decisionRaw.includes('BUY')
        ? 'BUY'
        : decisionRaw.includes('SELL')
          ? 'SELL'
          : decisionRaw.includes('HOLD')
            ? 'HOLD'
            : null;

      return {
        ...agent,
        status: log ? 'done' : 'idle',
        decision,
        confidence: log?.confidence ? parseNumber(log.confidence, 0) : null,
        reasoning: log?.outputDecision ?? null,
      };
    });

    return c.json(
      withEnvelope({
        agents,
        lastRun: logs[0]?.timestamp ? toIso(logs[0].timestamp) : null,
      })
    );
  } catch (error) {
    console.error('[Dashboard] Error fetching swarm status:', error);
    return c.json({ success: false, data: null, error: 'Failed to fetch swarm status' }, 500);
  }
});

router.get('/leaderboard-teaser', async (c) => {
  try {
    const limitInput = Number.parseInt(c.req.query('limit') ?? '3', 10);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 10) : 3;
    const periodRaw = (c.req.query('period') ?? 'all').toLowerCase();
    const period: LeaderboardPeriod =
      periodRaw === '7d' || periodRaw === '30d' ? periodRaw : 'all';

    const rows = await db
      .select({
        rank: leaderboard.rank,
        totalROI: leaderboard.totalROI,
        winRate: leaderboard.winRate,
        totalTrades: leaderboard.totalTrades,
        updatedAt: leaderboard.updatedAt,
        walletAddress: users.walletAddress,
        username: users.username,
      })
      .from(leaderboard)
      .innerJoin(users, eq(leaderboard.userId, users.id))
      .orderBy(desc(leaderboard.totalROI), desc(leaderboard.winRate))
      .limit(limit);

    if (rows.length === 0 || period !== 'all') {
      const computed = sortLeaderboardRows(await buildComputedLeaderboardWithPeriod(period), 'roi', 'desc')
        .slice(0, limit)
        .map((row, index) => ({
          rank: index + 1,
          walletAddress: row.walletAddress,
          username: row.username,
          totalROI: row.totalROI,
          winRate: row.winRate,
          totalTrades: row.totalTrades,
          updatedAt: row.updatedAt,
        }));

      return c.json(withEnvelope(computed));
    }

    const normalized = rows.map((row, index) => ({
      rank: row.rank ?? index + 1,
      walletAddress: row.walletAddress,
      username: row.username,
      totalROI: parseNumber(row.totalROI, 0),
      winRate: parseNumber(row.winRate, 0),
      totalTrades: row.totalTrades ?? 0,
      updatedAt: toIso(row.updatedAt),
    }));

    return c.json(withEnvelope(normalized));
  } catch (error) {
    console.error('[Dashboard] Error fetching leaderboard teaser:', error);
    return c.json({ success: false, data: null, error: 'Failed to fetch leaderboard teaser' }, 500);
  }
});

router.get('/leaderboard', async (c) => {
  try {
    const limitInput = Number.parseInt(c.req.query('limit') ?? '25', 10);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 100) : 25;
    const cursorRaw = c.req.query('cursor');
    let offset = 0;

    if (cursorRaw) {
      try {
        const decoded = Buffer.from(cursorRaw, 'base64url').toString('utf8');
        const parsed = Number.parseInt(decoded, 10);
        if (Number.isFinite(parsed) && parsed >= 0) {
          offset = parsed;
        }
      } catch {
        offset = 0;
      }
    }

    const sortByRaw = (c.req.query('sortBy') ?? 'roi').toLowerCase() as LeaderboardSortBy;
    const orderRaw = (c.req.query('order') ?? 'desc').toLowerCase() as LeaderboardOrder;
    const periodRaw = (c.req.query('period') ?? 'all').toLowerCase();
    const period: LeaderboardPeriod =
      periodRaw === '7d' || periodRaw === '30d' ? periodRaw : 'all';

    const sortColumn =
      sortByRaw === 'winrate'
        ? leaderboard.winRate
        : sortByRaw === 'trades'
          ? leaderboard.totalTrades
          : sortByRaw === 'sharpe'
            ? leaderboard.sharpeRatio
            : leaderboard.totalROI;

    const primaryOrder = orderRaw === 'asc' ? asc(sortColumn) : desc(sortColumn);
    const secondaryOrder = desc(leaderboard.totalROI);

    const rows = await db
      .select({
        dbRank: leaderboard.rank,
        totalROI: leaderboard.totalROI,
        winRate: leaderboard.winRate,
        sharpeRatio: leaderboard.sharpeRatio,
        totalTrades: leaderboard.totalTrades,
        updatedAt: leaderboard.updatedAt,
        walletAddress: users.walletAddress,
        username: users.username,
      })
      .from(leaderboard)
      .innerJoin(users, eq(leaderboard.userId, users.id))
      .orderBy(primaryOrder, secondaryOrder)
      .offset(offset)
      .limit(limit + 1);

    if (rows.length === 0 || period !== 'all') {
      const computedSorted = sortLeaderboardRows(
        await buildComputedLeaderboardWithPeriod(period),
        sortByRaw,
        orderRaw
      );
      const pageRows = computedSorted.slice(offset, offset + limit);
      const hasMore = computedSorted.length > offset + limit;
      const nextOffset = offset + pageRows.length;
      const nextCursor = hasMore ? Buffer.from(String(nextOffset)).toString('base64url') : null;

      const items = pageRows.map((row, index) => ({
        rank: offset + index + 1,
        globalRank: null,
        walletAddress: row.walletAddress,
        username: row.username,
        totalROI: row.totalROI,
        winRate: row.winRate,
        sharpeRatio: row.sharpeRatio,
        totalTrades: row.totalTrades,
        updatedAt: row.updatedAt,
      }));

      return c.json(
        withEnvelope({
          items,
          pageInfo: {
            limit,
            cursor: cursorRaw ?? null,
            nextCursor,
            hasMore,
          },
        })
      );
    }

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const normalized = pageRows.map((row, index) => ({
      rank: offset + index + 1,
      globalRank: row.dbRank,
      walletAddress: row.walletAddress,
      username: row.username,
      totalROI: parseNumber(row.totalROI, 0),
      winRate: parseNumber(row.winRate, 0),
      sharpeRatio: parseNumber(row.sharpeRatio, 0),
      totalTrades: row.totalTrades ?? 0,
      updatedAt: toIso(row.updatedAt),
    }));

    const nextOffset = offset + normalized.length;
    const nextCursor = hasMore ? Buffer.from(String(nextOffset)).toString('base64url') : null;

    return c.json(
      withEnvelope({
        items: normalized,
        pageInfo: {
          limit,
          cursor: cursorRaw ?? null,
          nextCursor,
          hasMore,
        },
      })
    );
  } catch (error) {
    console.error('[Dashboard] Error fetching leaderboard:', error);
    return c.json({ success: false, data: null, error: 'Failed to fetch leaderboard' }, 500);
  }
});

export { router as dashboardRouter };
