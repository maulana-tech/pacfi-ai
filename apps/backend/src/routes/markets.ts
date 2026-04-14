import { Hono } from 'hono';
import { PacificaClient } from '../services/pacifica';
import { successEnvelope, errorEnvelope } from '../lib/api';

const router = new Hono();
const pacificaClient = new PacificaClient();

router.get('/info', async (c) => {
  try {
    const data = await pacificaClient.getMarketInfo();
    return c.json(successEnvelope(data));
  } catch (error) {
    console.error('[Markets] Error fetching info:', error);
    return c.json(errorEnvelope('Failed to fetch market info'), 500);
  }
});

router.get('/prices', async (c) => {
  try {
    const data = await pacificaClient.getPrices();
    return c.json(successEnvelope(data));
  } catch (error) {
    console.error('[Markets] Error fetching prices:', error);
    return c.json(errorEnvelope('Failed to fetch prices'), 500);
  }
});

router.get('/book', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json(errorEnvelope('Symbol is required'), 400);
  }

  try {
    const aggLevel = Number.parseInt(c.req.query('agg_level') ?? '1', 10);
    const data = await pacificaClient.getOrderbook(symbol, aggLevel);
    return c.json(successEnvelope(data));
  } catch (error) {
    console.error('[Markets] Error fetching orderbook:', error);
    return c.json(errorEnvelope('Failed to fetch orderbook'), 500);
  }
});

router.get('/trades', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json(errorEnvelope('Symbol is required'), 400);
  }

  try {
    const data = await pacificaClient.getRecentTrades(symbol);
    return c.json(successEnvelope(data));
  } catch (error) {
    console.error('[Markets] Error fetching trades:', error);
    return c.json(errorEnvelope('Failed to fetch trades'), 500);
  }
});

router.get('/candles', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json(errorEnvelope('Symbol is required'), 400);
  }

  try {
    const interval = c.req.query('interval') ?? '1m';
    const limit = Number.parseInt(c.req.query('limit') ?? '100', 10);
    const data = await pacificaClient.getCandleData(symbol, interval, limit);
    return c.json(successEnvelope(data));
  } catch (error) {
    console.error('[Markets] Error fetching candles:', error);
    return c.json(errorEnvelope('Failed to fetch candles'), 500);
  }
});

router.get('/funding', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json(errorEnvelope('Symbol is required'), 400);
  }

  try {
    const data = await pacificaClient.getFundingHistory(symbol);
    return c.json(successEnvelope(data));
  } catch (error) {
    console.error('[Markets] Error fetching funding:', error);
    return c.json(errorEnvelope('Failed to fetch funding'), 500);
  }
});

export { router as marketsRouter };
