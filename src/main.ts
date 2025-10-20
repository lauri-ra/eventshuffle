import { Hono } from '@hono/hono';
import { logger } from '@hono/hono/logger';
import eventRouter from './api/event/event.routes.ts';
import { APP_CONFIG } from './config.ts';
import { errorHandler } from './common/errorHandler.ts';

const app = new Hono();

// Middleware
app.use(logger());

// Error handler
app.onError(errorHandler);

// Routes
app.get('/', (c) => c.text('Hello, world!'));
app.route('/api/v1/event', eventRouter);

Deno.serve({ port: APP_CONFIG.port }, app.fetch);
