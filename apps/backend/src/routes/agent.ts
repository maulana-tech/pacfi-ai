import { Hono } from 'hono';
import { successEnvelope, errorEnvelope } from '../lib/api';
import { pacificaAgentWalletService } from '../services/agent-wallet';
import { PacificaClient } from '../services/pacifica';
import { SwarmCoordinator } from '../services/swarm';

const router = new Hono();
const pacificaClient = new PacificaClient();
const swarmCoordinator = new SwarmCoordinator();

router.get('/status', async (c) => {
  return c.json(successEnvelope(pacificaAgentWalletService.getStatus()));
});

router.post('/analyze', async (c) => {
  try {
    const body = await c.req.json();
    const { symbol, portfolioBalance } = body;

    if (!symbol) {
      return c.json(errorEnvelope('Missing required field: symbol'), 400);
    }

    const balance = portfolioBalance || 10000;

    const [orderbook, marketInfo] = await Promise.all([
      pacificaClient.getOrderbook(symbol),
      pacificaClient.getPrices(),
    ]);

    const symbolInfo = marketInfo?.find((m: any) => m.symbol === symbol);

    const bestBid = parseFloat(orderbook.bids[0]?.price || '0');
    const bestAsk = parseFloat(orderbook.asks[0]?.price || '0');
    const currentPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk || 0;

    const context = {
      symbol,
      currentPrice,
      priceChange24h: 0,
      volume24h: parseFloat(String(symbolInfo?.volume24h || 0)),
      fundingRate: parseFloat(String(symbolInfo?.funding_rate || 0)),
      openInterest: 0,
      markPrice: currentPrice,
      indexPrice: currentPrice,
      high24h: currentPrice * 1.02,
      low24h: currentPrice * 0.98,
      leverage: 1,
    };

    const decision = await swarmCoordinator.executeCycle(
      { ...context, timestamp: Date.now() } as any,
      balance
    );

    return c.json(
      successEnvelope({
        symbol,
        decision,
        marketContext: context,
      })
    );
  } catch (error) {
    console.error('[Agent] Error analyzing:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Analysis failed'), 500);
  }
});

export { router as agentRouter };
