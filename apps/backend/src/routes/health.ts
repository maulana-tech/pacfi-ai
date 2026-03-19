import { Hono } from 'hono';

const router = new Hono();

router.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export { router as healthRouter };
