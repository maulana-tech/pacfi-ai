import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';
import { dashboardRouter } from './routes/dashboard';
import { builderRouter } from './routes/builder';
import { agentRouter } from './routes/agent';
import { marketsRouter } from './routes/markets';
import { swarmRouter } from './routes/swarm';
import { errorEnvelope } from './lib/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env.local') });

const app = new Hono();

// Middleware
app.use(cors());
app.use(logger());

// API Routes
app.route('/health', healthRouter);
app.route('/markets', marketsRouter);
app.route('/orders', ordersRouter);
app.route('/dashboard', dashboardRouter);
app.route('/builder', builderRouter);
app.route('/agent', agentRouter);
app.route('/swarm', swarmRouter);

// Serve frontend static files
app.use(
  '/*',
  serveStatic({
    root: path.resolve(__dirname, '../../../apps/frontend/dist'),
    index: 'index.html',
  })
);

// 404 handler
app.notFound((c) => {
  return c.json(errorEnvelope('Not found'), 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[Error]', err);
  return c.json(errorEnvelope('Internal server error'), 500);
});

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`Backend server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
