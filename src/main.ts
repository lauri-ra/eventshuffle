import { Hono } from '@hono/hono';
import { logger } from '@hono/hono/logger';
import eventRouter from './api/event/event.routes.ts';
import { APP_CONFIG } from './config.ts';

const app = new Hono();

app.use(logger());
app.get('/', (c) => c.text('Hello, world!'));

app.route('/api/v1/event', eventRouter);

Deno.serve({ port: APP_CONFIG.port }, app.fetch);
