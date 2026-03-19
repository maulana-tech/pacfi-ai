import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Routes
app.route('/health', healthRouter);
app.route('/orders', ordersRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[Error]', err);
  return c.json(
    {
      error: 'Internal server error',
    },
    500
  );
});

const port = parseInt(process.env.PORT || '3001', 10);

export default {
  fetch: app.fetch,
  port,
};

console.log(`Backend server starting on port ${port}`);
