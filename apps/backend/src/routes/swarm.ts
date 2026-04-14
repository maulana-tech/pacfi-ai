import { Hono } from 'hono';
import { getWalletContext } from '../middleware/auth';
import { Context } from 'hono';
import { db } from '../db';
import { users, aiLogs, trades } from '../db/schema';
import { errorEnvelope, successEnvelope } from '../lib/api';
import { desc, eq } from 'drizzle-orm';

const router = new Hono();

interface SwarmAgent {
  id: string;
  decision: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}

interface SwarmExecutionResult {
  tradeId: string | null;
  decision: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  agents: Record<string, SwarmAgent>;
  timestamp: string;
}

/**
 * Execute swarm decision cycle
 * POST /swarm/execute
 *
 * Runs swarm analysis to generate a trading decision
 * (Full AI implementation requires DASHSCOPE_API_KEY)
 */
router.post('/execute', async (c: Context) => {
  try {
    const ctx = getWalletContext(c);

    if (!ctx?.walletAddress) {
      return c.json(errorEnvelope('Wallet address not found in request context'), { status: 400 });
    }

    // Get user by wallet address
    const userList = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.walletAddress, ctx.walletAddress))
      .limit(1);

    const userRecord = userList[0];
    if (!userRecord) {
      return c.json(errorEnvelope('User not found'), { status: 404 });
    }

    const userId: string = userRecord.id;

    // Get latest trade for context
    const latestTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.executedAt))
      .limit(1);

    const latestTrade = latestTrades[0];
    const tradeId = latestTrade?.id || null;
    const symbol = latestTrade?.symbol || 'BTC/USD';

    // For demo: return a mock swarm decision
    // In production: call SwarmCoordinator with DASHSCOPE_API_KEY
    const mockDecision: SwarmExecutionResult = {
      tradeId,
      decision: 'BUY',
      confidence: 72,
      agents: {
        coordinator: {
          id: 'coordinator',
          decision: 'BUY',
          confidence: 72,
          reasoning: 'Market analysis shows bullish signals with moderate confidence',
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Store decision in ai_logs
    if (mockDecision.decision) {
      await db.insert(aiLogs).values({
        userId,
        tradeId: tradeId || undefined,
        agentName: 'coordinator',
        agentModel: 'qwen-max',
        inputContext: JSON.stringify({ symbol, tradeId }),
        outputDecision: JSON.stringify(mockDecision),
        confidence: String(mockDecision.confidence),
      });
    }

    return c.json(successEnvelope(mockDecision));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute swarm decision';
    console.error('[POST /swarm/execute]', message, error);

    return c.json(errorEnvelope(message), { status: 500 });
  }
});

/**
 * Get swarm execution history
 * GET /swarm/history
 */
router.get('/history', async (c: Context) => {
  try {
    const ctx = getWalletContext(c);

    if (!ctx?.walletAddress) {
      return c.json(errorEnvelope('Wallet address not found in request context'), { status: 400 });
    }

    // Get user by wallet address
    const userList = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.walletAddress, ctx.walletAddress))
      .limit(1);

    const userRecord = userList[0];
    if (!userRecord) {
      return c.json(errorEnvelope('User not found'), { status: 404 });
    }

    const userId: string = userRecord.id;

    const limit = Math.min(Number(c.req.query('limit') || '20'), 100);

    // Query recent swarm logs for this user
    const logs = await db
      .select()
      .from(aiLogs)
      .where(eq(aiLogs.userId, userId))
      .orderBy(desc(aiLogs.timestamp))
      .limit(limit + 1);

    const hasMore = logs.length > limit;
    const items = logs.slice(0, limit);

    // Group by tradeId
    const grouped: Record<
      string,
      {
        tradeId: string | null;
        executedAt: string;
        agents: Record<string, SwarmAgent>;
        coordinatorConfidence?: number;
      }
    > = {};

    for (const log of items) {
      const key = log.tradeId || `sim_${log.id}`;

      if (!grouped[key]) {
        grouped[key] = {
          tradeId: log.tradeId || null,
          executedAt: log.timestamp?.toISOString() || new Date().toISOString(),
          agents: {},
        };
      }

      try {
        const outputData = JSON.parse(log.outputDecision || '{}');
        grouped[key].agents[log.agentName] = {
          id: log.agentName,
          decision: outputData.decision || 'HOLD',
          confidence: log.confidence ? Number(log.confidence) : 0,
          reasoning: outputData.reasoning || '',
        };
      } catch {
        // Skip parsing errors
      }

      // Coordinator confidence from coordinator agent
      if (log.agentName === 'coordinator') {
        grouped[key].coordinatorConfidence = log.confidence ? Number(log.confidence) : 0;
      }
    }

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].timestamp?.toISOString() || null : null;

    return c.json(
      successEnvelope({
        items: Object.values(grouped),
        pageInfo: {
          limit,
          cursor: null,
          nextCursor,
          hasMore,
        },
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch swarm history';
    console.error('[GET /swarm/history]', message, error);

    return c.json(errorEnvelope(message), { status: 500 });
  }
});

export default router;
export { router as swarmRouter };
