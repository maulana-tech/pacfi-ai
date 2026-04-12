import { Hono } from 'hono';
import { successEnvelope } from '../lib/api';
import { pacificaAgentWalletService } from '../services/agent-wallet';

const router = new Hono();

router.get('/status', async (c) => {
  return c.json(successEnvelope(pacificaAgentWalletService.getStatus()));
});

export { router as agentRouter };
