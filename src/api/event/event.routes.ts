import { Hono } from '@hono/hono';
import * as eventController from './event.controller.ts';
import { zValidator } from '@hono/zod-validator';
import {
  createEventSchema,
  addVoteSchema,
  eventIdParamSchema,
} from './event.types.ts';

const eventRouter = new Hono();

// Define event related API routes.
// For endpoints that accept input, zod middleware is used to validate
// request params or bodies before calling controller functions.
eventRouter.get('/list', eventController.listEvents);

eventRouter.get('/:id', zValidator('param', eventIdParamSchema), async (c) => {
  const { id: eventId } = c.req.valid('param');
  return await eventController.getEventById(c, eventId);
});

eventRouter.get(
  '/:id/results',
  zValidator('param', eventIdParamSchema),
  async (c) => {
    const { id: eventId } = c.req.valid('param');
    return await eventController.getEventResults(c, eventId);
  },
);

eventRouter.post('/', zValidator('json', createEventSchema), async (c) => {
  const request = c.req.valid('json');
  return await eventController.postEvent(c, request);
});

eventRouter.post(
  '/:id/vote',
  zValidator('param', eventIdParamSchema),
  zValidator('json', addVoteSchema),
  async (c) => {
    const { id: eventId } = c.req.valid('param');
    const payload = c.req.valid('json');
    return await eventController.postEventVotes(c, eventId, payload);
  },
);

export default eventRouter;
