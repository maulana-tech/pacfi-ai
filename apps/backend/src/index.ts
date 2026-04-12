import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';
import { dashboardRouter } from './routes/dashboard';
import { builderRouter } from './routes/builder';
import { agentRouter } from './routes/agent';
import { errorEnvelope } from './lib/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Routes
app.route('/health', healthRouter);
app.route('/orders', ordersRouter);
app.route('/dashboard', dashboardRouter);
app.route('/builder', builderRouter);
app.route('/agent', agentRouter);

// 404 handler
app.notFound((c) => {
  return c.json(errorEnvelope('Not found'), 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[Error]', err);
  return c.json(
    errorEnvelope('Internal server error'),
    500
  );
});

const port = parseInt(process.env.PORT || '3001', 10);

export default {
  fetch: app.fetch,
  port,
};

console.log(`Backend server starting on port ${port}`);
