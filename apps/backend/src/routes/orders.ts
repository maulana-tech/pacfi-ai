import { Hono } from 'hono';
import { PacificaClient } from '../services/pacifica';
import { SwarmCoordinator } from '@pacfi/ai-swarm';
import { getWalletContext } from '../middleware/auth';
import { db } from '../db';
import { trades } from '../db/schema';

const router = new Hono();
const pacificaClient = new PacificaClient();
const swarmCoordinator = new SwarmCoordinator();

/**
 * POST /orders/create-market
 * Create market order with signed request
 */
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

    // Send to Pacifica API
    const order = await pacificaClient.createMarketOrder(
      wallet.walletAddress,
      symbol,
      side,
      amount,
      signature,
      timestamp,
      builderCode
    );

    // Store in database
    await db.insert(trades).values({
      userId: wallet.walletAddress, // Use wallet address as user ID
      symbol,
      side: side === 'bid' ? 'BUY' : 'SELL',
      entryPrice: parseFloat(order.entryPrice || '0'),
      size: parseFloat(amount),
      leverage: parseFloat(body.leverage || '1'),
      status: 'OPEN',
      executedAt: new Date(),
    });

    return c.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[Orders] Error creating market order:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /orders/create-limit
 * Create limit order with signed request
 */
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

    // Send to Pacifica API
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

    // Store in database
    await db.insert(trades).values({
      userId: wallet.walletAddress,
      symbol,
      side: side === 'bid' ? 'BUY' : 'SELL',
      entryPrice: parseFloat(price),
      size: parseFloat(amount),
      leverage: parseFloat(body.leverage || '1'),
      status: 'OPEN',
      executedAt: new Date(),
    });

    return c.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[Orders] Error creating limit order:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /orders/positions
 * Get user positions
 */
router.get('/positions', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const positions = await pacificaClient.getPositions(wallet.walletAddress);

    return c.json({
      success: true,
      positions,
    });
  } catch (error) {
    console.error('[Orders] Error fetching positions:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /orders/balance
 * Get user balance
 */
router.get('/balance', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const balance = await pacificaClient.getBalance(wallet.walletAddress);

    return c.json({
      success: true,
      balance,
    });
  } catch (error) {
    console.error('[Orders] Error fetching balance:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export { router as ordersRouter };
