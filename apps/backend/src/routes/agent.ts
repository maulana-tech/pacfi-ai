import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { successEnvelope, errorEnvelope } from '../lib/api';
import { pacificaAgentWalletService } from '../services/agent-wallet';
import { PacificaClient } from '../services/pacifica';
import { SwarmCoordinator } from '../services/swarm';
import { db } from '../db';
import { aiLogs, users } from '../db/schema';

const router = new Hono();
const pacificaClient = new PacificaClient();
const swarmCoordinator = new SwarmCoordinator();

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';

async function ensureUser(walletAddress: string): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db.insert(users).values({ walletAddress }).returning({ id: users.id });
  return created.id;
}

router.get('/status', async (c) => {
  return c.json(successEnvelope(pacificaAgentWalletService.getStatus()));
});

/**
 * POST /agent/bind
 * Bind the backend agent wallet to the user's account on Pacifica.
 * Must be called once per account before agent-signed orders can execute.
 *
 * The user signs the payload { agent_wallet } with their own wallet (Phantom).
 * Body: { signature: string, timestamp: number }
 * Headers: X-Wallet-Address
 */
router.post('/bind', async (c) => {
  try {
    const walletAddress = c.req.header('X-Wallet-Address');
    if (!walletAddress) {
      return c.json(errorEnvelope('X-Wallet-Address header required'), 400);
    }

    const agentStatus = pacificaAgentWalletService.getStatus();
    if (!agentStatus.enabled || !agentStatus.agentWallet) {
      return c.json(errorEnvelope('Agent wallet not configured on backend'), 503);
    }

    const body = await c.req.json();
    const { signature, timestamp } = body;

    if (!signature || typeof signature !== 'string') {
      return c.json(errorEnvelope('Missing field: signature'), 400);
    }
    if (!timestamp || typeof timestamp !== 'number') {
      return c.json(errorEnvelope('Missing field: timestamp'), 400);
    }

    const result = await pacificaClient.bindAgentWallet(
      walletAddress,
      signature,
      timestamp,
      agentStatus.agentWallet
    );

    return c.json(successEnvelope({ bound: true, agentWallet: agentStatus.agentWallet, result }));
  } catch (error) {
    console.error('[Agent] Error binding agent wallet:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Bind failed'), 500);
  }
});

/**
 * POST /agent/analyze
 * Run a full AI swarm analysis cycle on a symbol.
 * Saves per-agent logs to DB when wallet is provided.
 *
 * Body: { symbol: string, portfolioBalance?: number }
 * Headers (optional): X-Wallet-Address — used to associate logs with the user
 */
router.post('/analyze', async (c) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return c.json(errorEnvelope('OPENROUTER_API_KEY is not configured on backend'), 503);
    }

    const body = await c.req.json();
    const { symbol, portfolioBalance, autoTrade } = body;

    if (!symbol || typeof symbol !== 'string') {
      return c.json(errorEnvelope('Missing required field: symbol'), 400);
    }

    const balance = portfolioBalance || 10000;
    const shouldAutoTrade = autoTrade === true;

    const resolvedSymbol = await pacificaClient.resolveSymbol(symbol);

    // ── Fetch real market data ─────────────────────────────────────────────
    const [orderbookResult, infoResult, tradesResult] = await Promise.allSettled([
      pacificaClient.getOrderbook(resolvedSymbol),
      pacificaClient.getMarketInfo(),
      pacificaClient.getRecentTrades(resolvedSymbol),
    ]);

    // Mid price from best bid/ask
    let price = 0;
    if (orderbookResult.status === 'fulfilled') {
      const bid = parseFloat(orderbookResult.value.bids[0]?.price ?? '0');
      const ask = parseFloat(orderbookResult.value.asks[0]?.price ?? '0');
      price = bid > 0 && ask > 0 ? (bid + ask) / 2 : bid || ask;
    }

    // Funding rate + specs from market info
    let fundingRate = 0;
    let maxLeverage = 10;
    if (infoResult.status === 'fulfilled' && Array.isArray(infoResult.value)) {
      const info = infoResult.value.find(
        (m: any) =>
          String(m.symbol).toUpperCase() === resolvedSymbol.toUpperCase() ||
          String(m.symbol).toUpperCase() === String(symbol).toUpperCase()
      );
      if (info) {
        fundingRate = parseFloat(info.funding_rate ?? '0');
        maxLeverage = info.max_leverage ?? 10;
      }
    }

    // Additional context from recent candles to align analysis with viewed market regime.
    let candleSnapshot: {
      interval: string;
      close: number;
      open: number;
      high: number;
      low: number;
      volume: number;
    }[] = [];
    try {
      const rawCandles = await pacificaClient.getCandleData(resolvedSymbol, '5m', 24);
      if (Array.isArray(rawCandles)) {
        candleSnapshot = rawCandles
          .slice(-8)
          .map((c: any) => ({
            interval: '5m',
            open: Number.parseFloat(c.o ?? c.open ?? '0'),
            high: Number.parseFloat(c.h ?? c.high ?? '0'),
            low: Number.parseFloat(c.l ?? c.low ?? '0'),
            close: Number.parseFloat(c.c ?? c.close ?? '0'),
            volume: Number.parseFloat(c.v ?? c.volume ?? '0'),
          }))
          .filter((c) => Number.isFinite(c.close) && c.close > 0);
      }
    } catch {
      // Non-fatal. Swarm can still analyze from orderbook/trades context.
    }

    // 24h stats from recent trades
    let volume24h = 0;
    let high24h = price;
    let low24h = price;
    let priceChange24h = 0;

    if (
      tradesResult.status === 'fulfilled' &&
      Array.isArray(tradesResult.value) &&
      tradesResult.value.length > 0
    ) {
      const trs = tradesResult.value;
      const prices = trs
        .map((t: any) => parseFloat(t.price))
        .filter((p: number) => isFinite(p) && p > 0);
      if (prices.length > 0) {
        high24h = Math.max(...prices);
        low24h = Math.min(...prices);
        const latest = prices[0];
        const oldest = prices[prices.length - 1];
        priceChange24h = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;
        volume24h = trs.reduce((acc: number, t: any) => {
          const p = parseFloat(t.price);
          const a = parseFloat(t.amount);
          return isFinite(p) && isFinite(a) ? acc + p * a : acc;
        }, 0);
      }
    }

    const marketData = {
      symbol: resolvedSymbol,
      price,
      markPrice: price,
      indexPrice: price,
      priceChange24h,
      volume24h,
      fundingRate,
      openInterest: 0,
      high24h,
      low24h,
      timestamp: Date.now(),
      leverage: 1,
    };

    const { decision, agentLogs } = await swarmCoordinator.executeCycle(marketData, balance);

    // ── Persist per-agent logs ─────────────────────────────────────────────
    const walletAddress = c.req.header('X-Wallet-Address');
    if (walletAddress) {
      try {
        const userId = await ensureUser(walletAddress);
        await db.insert(aiLogs).values(
          agentLogs.map((log) => ({
            userId,
            agentName: log.agentName,
            agentModel: log.agentModel,
            inputContext: log.inputContext,
            outputDecision: log.outputDecision,
            confidence: log.confidence !== null ? String(log.confidence) : null,
          }))
        );
      } catch (logErr) {
        // Non-fatal — don't fail the analysis response if logging errors
        console.warn('[Agent] Failed to persist ai_logs:', logErr);
      }
    }

    let execution: { success: boolean; orderId?: string; error?: string } | undefined;

    if (shouldAutoTrade && decision.action !== 'HOLD' && decision.confidence >= 60) {
      if (!pacificaAgentWalletService.isEnabled()) {
        execution = { success: false, error: 'Agent wallet not configured' };
      } else {
        try {
          const side = decision.action === 'BUY' ? 'bid' : 'ask';
          const amount = String(
            decision.positionSize || Math.floor(((balance * 0.1) / (price || 1)) * 100) / 100
          );

          const signed = pacificaAgentWalletService.signOrder('auto-trade', 'market', {
            symbol,
            side,
            amount,
          });

          const orderResult = await pacificaClient.createMarketOrder(
            'auto-trade',
            symbol,
            side,
            amount,
            signed.signature,
            signed.timestamp,
            signed.agentWallet
          );

          execution = { success: true, orderId: (orderResult as any)?.order_id || 'executed' };
        } catch (execError) {
          execution = {
            success: false,
            error: execError instanceof Error ? execError.message : 'Execution failed',
          };
        }
      }
    }

    return c.json(
      successEnvelope({
        symbol,
        decision,
        marketContext: marketData,
        execution,
      })
    );
  } catch (error) {
    console.error('[Agent] Error analyzing:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Analysis failed'), 500);
  }
});

export { router as agentRouter };
