import { Hono } from 'hono';
import { PacificaClient } from '../services/pacifica';
import { SwarmCoordinator } from '../services/swarm';
import { getWalletContext } from '../middleware/auth';
import { PacificaOrderSigner } from '../services/signing';
import { pacificaAgentWalletService } from '../services/agent-wallet';
import { db } from '../db';
import { trades, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { errorEnvelope, orderSuccessEnvelope } from '../lib/api';

const router = new Hono();
const pacificaClient = new PacificaClient();
const swarmCoordinator = new SwarmCoordinator();
const BUILDER_CODE_REGEX = /^[a-zA-Z0-9]{1,16}$/;

function getOrderAuth(
  wallet: ReturnType<typeof getWalletContext>,
  body: Record<string, unknown>
): { signature: string; timestamp: number; agentWallet?: string } | { error: string } {
  const executionMode = body.executionMode === 'agent' ? 'agent' : 'wallet';

  if (executionMode === 'agent') {
    if (!wallet?.walletAddress) {
      return { error: 'Invalid wallet address' };
    }

    if (!pacificaAgentWalletService.isEnabled()) {
      return { error: 'Agent wallet is not configured on the backend' };
    }

    if (!pacificaAgentWalletService.canManageAccount(wallet.walletAddress)) {
      return { error: 'Agent wallet is not authorized for this account' };
    }

    try {
      const signed = pacificaAgentWalletService.signOrder(
        wallet.walletAddress,
        typeof body.price === 'string' ? 'limit' : 'market',
        {
          symbol: String(body.symbol ?? ''),
          side: body.side as 'bid' | 'ask',
          amount: String(body.amount ?? ''),
          price: typeof body.price === 'string' ? body.price : undefined,
          clientOrderId: typeof body.clientOrderId === 'string' ? body.clientOrderId : undefined,
          builderCode: typeof body.builderCode === 'string' ? body.builderCode : undefined,
        }
      );

      return {
        signature: signed.signature,
        timestamp: signed.timestamp,
        agentWallet: signed.agentWallet,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to sign with agent wallet',
      };
    }
  }

  const signatureValue =
    (typeof wallet?.signature === 'string' && wallet.signature) ||
    (typeof body.signature === 'string' && body.signature) ||
    '';

  const timestampValue =
    (typeof wallet?.timestamp === 'number' && wallet.timestamp) ||
    (typeof body.timestamp === 'number' && body.timestamp) ||
    (typeof body.timestamp === 'string' ? Number.parseInt(body.timestamp, 10) : undefined);

  if (!signatureValue) {
    return { error: 'Missing required header X-Signature or body field signature' };
  }

  if (!PacificaOrderSigner.isValidSignature(signatureValue)) {
    return { error: 'Invalid signature format' };
  }

  if (!timestampValue || !Number.isFinite(timestampValue)) {
    return { error: 'Missing required field timestamp' };
  }

  return {
    signature: signatureValue,
    timestamp: timestampValue,
  };
}

async function ensureUser(walletAddress: string): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [created] = await db.insert(users).values({ walletAddress }).returning({ id: users.id });

  return created.id;
}

function isValidBuilderCode(builderCode: unknown): boolean {
  return typeof builderCode === 'string' && BUILDER_CODE_REGEX.test(builderCode);
}

router.post('/create-market', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const body = await c.req.json();
    const { symbol, side, amount, builderCode, clientOrderId } = body;
    const leverage = typeof body.leverage === 'number' ? body.leverage : undefined;

    if (!symbol || !side || !amount) {
      return c.json(errorEnvelope('Missing required fields'), 400);
    }

    if (builderCode && !isValidBuilderCode(builderCode)) {
      return c.json(
        errorEnvelope('Invalid builder code format. Use 1-16 alphanumeric characters.'),
        400
      );
    }

    const auth = getOrderAuth(wallet, body);
    if ('error' in auth) {
      return c.json(errorEnvelope(auth.error), 400);
    }

    const order = await pacificaClient.createMarketOrder(
      wallet.walletAddress,
      String(symbol),
      side as 'bid' | 'ask',
      String(amount),
      auth.signature,
      auth.timestamp,
      auth.agentWallet,
      typeof clientOrderId === 'string' ? clientOrderId : undefined,
      builderCode,
      leverage
    );

    const userId = await ensureUser(wallet.walletAddress);

    await db.insert(trades).values({
      userId,
      symbol,
      side: side === 'bid' ? 'BUY' : 'SELL',
      entryPrice: String(parseFloat((order as any).entryPrice || '0')),
      size: String(parseFloat(amount)),
      leverage: String(parseFloat(body.leverage || '1')),
      status: 'OPEN',
    });

    return c.json(orderSuccessEnvelope('order', order));
  } catch (error) {
    console.error('[Orders] Error creating market order:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

router.post('/create-limit', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const body = await c.req.json();
    const { symbol, side, amount, price, builderCode, clientOrderId } = body;
    const leverage = typeof body.leverage === 'number' ? body.leverage : undefined;

    if (!symbol || !side || !amount || !price) {
      return c.json(errorEnvelope('Missing required fields'), 400);
    }

    if (builderCode && !isValidBuilderCode(builderCode)) {
      return c.json(
        errorEnvelope('Invalid builder code format. Use 1-16 alphanumeric characters.'),
        400
      );
    }

    const auth = getOrderAuth(wallet, body);
    if ('error' in auth) {
      return c.json(errorEnvelope(auth.error), 400);
    }

    const order = await pacificaClient.createLimitOrder(
      wallet.walletAddress,
      String(symbol),
      side as 'bid' | 'ask',
      String(amount),
      String(price),
      auth.signature,
      auth.timestamp,
      auth.agentWallet,
      typeof clientOrderId === 'string' ? clientOrderId : undefined,
      builderCode,
      leverage
    );

    const userId = await ensureUser(wallet.walletAddress);

    await db.insert(trades).values({
      userId,
      symbol,
      side: side === 'bid' ? 'BUY' : 'SELL',
      entryPrice: String(parseFloat(price)),
      size: String(parseFloat(amount)),
      leverage: String(parseFloat(body.leverage || '1')),
      status: 'OPEN',
    });

    return c.json(orderSuccessEnvelope('order', order));
  } catch (error) {
    console.error('[Orders] Error creating limit order:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

router.get('/positions', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const positions = await pacificaClient.getPositions(wallet.walletAddress);

    return c.json(orderSuccessEnvelope('positions', positions));
  } catch (error) {
    console.error('[Orders] Error fetching positions:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

router.get('/balance', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const balance = await pacificaClient.getBalance(wallet.walletAddress);

    return c.json(orderSuccessEnvelope('balance', balance));
  } catch (error) {
    console.error('[Orders] Error fetching balance:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

/**
 * Get real-time market data for specified symbols
 * GET /orders/market-data?symbols=BTC,ETH,SOL
 * Uses orderbook mid price + /info for funding rate & specs
 */
router.get('/market-data', async (c) => {
  const symbolsParam = c.req.query('symbols');
  const requestedSymbols = symbolsParam
    ? symbolsParam
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : ['BTC', 'ETH', 'SOL'];

  const fmtVol = (v: number): string => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  };

  // 1. Fetch instrument specs (funding rate, max leverage, lot size, min order size)
  const infoMap = new Map<string, any>();
  try {
    const infoList = await pacificaClient.getMarketInfo();
    if (Array.isArray(infoList)) {
      for (const item of infoList) {
        if (item.symbol) infoMap.set(String(item.symbol), item);
      }
    }
  } catch {
    console.warn('[Orders] /info fetch failed, continuing without specs');
  }

  // 2. Per-symbol: orderbook for mid price, recent trades for 24h stats
  const results = await Promise.allSettled(
    requestedSymbols.map(async (symbol) => {
      const [bookResult, tradesResult] = await Promise.allSettled([
        pacificaClient.getOrderbook(symbol),
        pacificaClient.getRecentTrades(symbol),
      ]);

      const info = infoMap.get(symbol);

      // Funding rate from /info (raw rate e.g. 0.000015 → +0.0015%)
      const rawFunding = Number.parseFloat(info?.funding_rate ?? '0');
      const fundingPct = (rawFunding * 100).toFixed(4);
      const fundingRate = `${rawFunding >= 0 ? '+' : ''}${fundingPct}%`;

      const maxLeverage: number = info?.max_leverage ?? 10;
      const minOrderSize: string = info?.min_order_size ?? '10';
      const lotSize: string = info?.lot_size ?? '0.001';

      // Mid price from best bid + best ask
      let price = 0;
      let bid = 0;
      let ask = 0;
      if (bookResult.status === 'fulfilled') {
        bid = Number.parseFloat(bookResult.value.bids[0]?.price ?? '0');
        ask = Number.parseFloat(bookResult.value.asks[0]?.price ?? '0');
        if (bid > 0 && ask > 0) {
          price = (bid + ask) / 2;
        } else {
          price = bid || ask;
        }
      }

      // 24h stats from recent trades
      let change = 0;
      let high = price;
      let low = price;
      let volume = '$0';
      if (
        tradesResult.status === 'fulfilled' &&
        Array.isArray(tradesResult.value) &&
        tradesResult.value.length > 0
      ) {
        const trs = tradesResult.value;
        const prices = trs
          .map((t) => Number.parseFloat(t.price))
          .filter((p) => Number.isFinite(p) && p > 0);
        if (prices.length > 0) {
          if (price === 0) price = prices[0];
          high = Math.max(...prices);
          low = Math.min(...prices);
          const latest = prices[0];
          const oldest = prices[prices.length - 1];
          change = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;
          const totalNotional = trs.reduce((acc, t) => {
            const p = Number.parseFloat(t.price);
            const a = Number.parseFloat(t.amount);
            return Number.isFinite(p) && Number.isFinite(a) ? acc + p * a : acc;
          }, 0);
          volume = fmtVol(totalNotional);
        }
      }

      return {
        price: Number.parseFloat(price.toFixed(8)),
        bid: Number.parseFloat(bid.toFixed(8)),
        ask: Number.parseFloat(ask.toFixed(8)),
        change: Number.parseFloat(change.toFixed(2)),
        high: Number.parseFloat(high.toFixed(8)),
        low: Number.parseFloat(low.toFixed(8)),
        volume,
        fundingRate,
        maxLeverage,
        minOrderSize,
        lotSize,
      };
    })
  );

  const marketDataMap: Record<string, any> = {};
  for (let i = 0; i < requestedSymbols.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      marketDataMap[requestedSymbols[i]] = r.value;
    }
  }

  return c.json({ success: true, data: marketDataMap });
});

/**
 * Get OHLCV candle data for a symbol
 * GET /orders/candles?symbol=BTC&interval=1h&limit=100
 * Transforms Pacifica candle data to lightweight-charts format
 */
router.get('/candles', async (c) => {
  const symbol = (c.req.query('symbol') ?? 'BTC').toUpperCase();
  const interval = c.req.query('interval') ?? '1h';
  const limit = Math.min(500, Math.max(10, Number.parseInt(c.req.query('limit') ?? '100', 10)));
  const symbolCandidates = Array.from(new Set([symbol, `${symbol}-USDC`]));

  const buildFromTrades = async () => {
    const tradesResults = await Promise.allSettled(
      symbolCandidates.map((s) => pacificaClient.getRecentTrades(s))
    );
    const trades = tradesResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .sort((a, b) => a.createdAt - b.createdAt);
    const intervalMs: Record<string, number> = {
      '1m': 60_000,
      '5m': 300_000,
      '15m': 900_000,
      '1h': 3_600_000,
      '4h': 14_400_000,
      '1d': 86_400_000,
    };
    const bucketMs = intervalMs[interval] ?? 3_600_000;
    const buckets = new Map<
      number,
      { open: number; high: number; low: number; close: number; volume: number }
    >();

    for (const t of trades) {
      const price = Number.parseFloat(t.price);
      const amount = Number.parseFloat(t.amount);
      if (!Number.isFinite(price) || price <= 0) {
        continue;
      }

      const bucket = Math.floor(t.createdAt / bucketMs) * bucketMs;
      const existing = buckets.get(bucket);

      if (!existing) {
        buckets.set(bucket, {
          open: price,
          high: price,
          low: price,
          close: price,
          volume: Number.isFinite(amount) ? amount : 0,
        });
      } else {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
        if (Number.isFinite(amount)) {
          existing.volume += amount;
        }
      }
    }

    return Array.from(buckets.entries())
      .map(([t, v]) => ({ time: Math.floor(t / 1000), ...v }))
      .sort((a, b) => a.time - b.time)
      .slice(-limit);
  };

  try {
    let candles: any[] = [];
    for (const s of symbolCandidates) {
      try {
        const raw = await pacificaClient.getCandleData(s, interval, limit);
        const next = Array.isArray(raw) ? raw : [];
        if (next.length > candles.length) {
          candles = next;
        }
      } catch {
        // Try next symbol variant.
      }
    }

    const normalizeToUnixSeconds = (value: unknown): number => {
      const numeric =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number.parseFloat(value)
            : NaN;

      if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
      }

      // Pacifica may return either ms or seconds depending on endpoint/version.
      return numeric > 10_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    };

    // Normalize to { time (unix seconds), open, high, low, close, volume }
    const normalized = candles
      .map((c: any) => {
        const time = normalizeToUnixSeconds(c.t ?? c.time ?? c.ts);
        const open = Number.parseFloat(c.o ?? c.open ?? '0');
        const high = Number.parseFloat(c.h ?? c.high ?? '0');
        const low = Number.parseFloat(c.l ?? c.low ?? '0');
        const close = Number.parseFloat(c.c ?? c.close ?? '0');
        const volume = Number.parseFloat(c.v ?? c.volume ?? '0');
        return { time, open, high, low, close, volume };
      })
      .filter((c) => c.time > 0 && c.open > 0)
      .sort((a, b) => a.time - b.time);

    if (normalized.length >= 2) {
      return c.json({ success: true, data: normalized });
    }

    const fromTrades = await buildFromTrades();
    return c.json({ success: true, data: fromTrades });
  } catch (error) {
    console.warn('[Orders] /candles failed, building from trades:', error);

    // Fallback: build pseudo-candles from recent trades
    try {
      const candles = await buildFromTrades();

      return c.json({ success: true, data: candles });
    } catch {
      return c.json({ success: true, data: [] });
    }
  }
});

export { router as ordersRouter };
