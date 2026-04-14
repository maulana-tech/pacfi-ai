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
      builderCode
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
      builderCode
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
 */
router.get('/market-data', async (c) => {
  try {
    const symbolsParam = c.req.query('symbols');
    const requestedSymbols = symbolsParam
      ? symbolsParam.split(',').map((s) => s.trim())
      : ['BTC', 'ETH', 'SOL'];

    // Default fallback data for when Pacifica API is unavailable
    const DEFAULT_MARKET_DATA: Record<string, any> = {
      BTC: {
        price: 45230.5,
        change: 2.34,
        high: 45890,
        low: 44120,
        volume: '$2.4B',
        fundingRate: '+0.0082%',
      },
      ETH: {
        price: 2845.2,
        change: -1.12,
        high: 2920,
        low: 2800,
        volume: '$1.1B',
        fundingRate: '-0.0031%',
      },
      SOL: {
        price: 145.3,
        change: 4.21,
        high: 148,
        low: 138.5,
        volume: '$380M',
        fundingRate: '+0.0120%',
      },
    };

    const marketDataMap: Record<string, any> = {};

    const formatVolume = (value: number): string => {
      if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
      return `$${value.toFixed(2)}`;
    };

    try {
      // Use recent trades for each symbol to build a reliable live snapshot.
      await Promise.all(
        requestedSymbols.map(async (symbol) => {
          const tradesData = await pacificaClient.getRecentTrades(symbol);
          if (!Array.isArray(tradesData) || tradesData.length === 0) {
            return;
          }

          const prices = tradesData
            .map((item) => Number.parseFloat(item.price))
            .filter((value) => Number.isFinite(value) && value > 0);

          if (prices.length === 0) {
            return;
          }

          const amounts = tradesData
            .map((item) => Number.parseFloat(item.amount))
            .filter((value) => Number.isFinite(value) && value > 0);

          const latestPrice = prices[0];
          const previousPrice = prices[1] ?? latestPrice;
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const totalNotional = tradesData.reduce((acc, item) => {
            const p = Number.parseFloat(item.price);
            const a = Number.parseFloat(item.amount);
            if (!Number.isFinite(p) || !Number.isFinite(a)) {
              return acc;
            }
            return acc + p * a;
          }, 0);

          const change =
            previousPrice > 0 ? ((latestPrice - previousPrice) / previousPrice) * 100 : 0;

          marketDataMap[symbol] = {
            price: latestPrice,
            change: Number.parseFloat(change.toFixed(2)),
            high,
            low,
            volume: formatVolume(totalNotional),
            fundingRate: 'N/A',
          };
        })
      );
    } catch (error) {
      console.warn('[Orders] Pacifica trades fetch failed, using fallback data:', error);
    }

    // Fill in missing symbols with defaults
    for (const symbol of requestedSymbols) {
      if (!marketDataMap[symbol]) {
        marketDataMap[symbol] = DEFAULT_MARKET_DATA[symbol] || DEFAULT_MARKET_DATA.BTC;
      }
    }

    return c.json({
      success: true,
      data: marketDataMap,
    });
  } catch (error) {
    console.error('[Orders] Error fetching market data:', error);
    // Return default mock data on error
    return c.json(
      {
        success: true,
        data: {
          BTC: {
            price: 45230.5,
            change: 2.34,
            high: 45890,
            low: 44120,
            volume: '$2.4B',
            fundingRate: '+0.0082%',
          },
          ETH: {
            price: 2845.2,
            change: -1.12,
            high: 2920,
            low: 2800,
            volume: '$1.1B',
            fundingRate: '-0.0031%',
          },
          SOL: {
            price: 145.3,
            change: 4.21,
            high: 148,
            low: 138.5,
            volume: '$380M',
            fundingRate: '+0.0120%',
          },
        },
      },
      200
    );
  }
});

export { router as ordersRouter };
