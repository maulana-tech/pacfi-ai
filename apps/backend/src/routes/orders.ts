import { Hono } from 'hono';
import { PacificaClient } from '../services/pacifica';
import { SwarmCoordinator } from '../services/swarm';
import { getWalletContext } from '../middleware/auth';
import { db } from '../db';
import { trades, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = new Hono();
const pacificaClient = new PacificaClient();
const swarmCoordinator = new SwarmCoordinator();

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

router.post('/create-market', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const body = await c.req.json();
    const { symbol, side, amount, signature, timestamp, builderCode } = body;

    if (!symbol || !side || !amount || !signature || !timestamp) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const order = await pacificaClient.createMarketOrder(
      wallet.walletAddress,
      symbol,
      side,
      amount,
      signature,
      timestamp,
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

    return c.json({ success: true, order });
  } catch (error) {
    console.error('[Orders] Error creating market order:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

router.post('/create-limit', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const body = await c.req.json();
    const { symbol, side, amount, price, signature, timestamp, builderCode } = body;

    if (!symbol || !side || !amount || !price || !signature || !timestamp) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const order = await pacificaClient.createLimitOrder(
      wallet.walletAddress,
      symbol,
      side,
      amount,
      price,
      signature,
      timestamp,
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

    return c.json({ success: true, order });
  } catch (error) {
    console.error('[Orders] Error creating limit order:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

router.get('/positions', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const positions = await pacificaClient.getPositions(wallet.walletAddress);

    return c.json({ success: true, positions });
  } catch (error) {
    console.error('[Orders] Error fetching positions:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

router.get('/balance', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const balance = await pacificaClient.getBalance(wallet.walletAddress);

    return c.json({ success: true, balance });
  } catch (error) {
    console.error('[Orders] Error fetching balance:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

export { router as ordersRouter };
