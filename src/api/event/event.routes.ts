import { Hono } from '@hono/hono';
import * as eventController from './event.controller.ts';

const eventRouter = new Hono();

eventRouter.get('/list', eventController.listEvents);
eventRouter.get('/:id', eventController.getEventById);
eventRouter.get('/:id/results', eventController.getEventResults);

eventRouter.post('/', eventController.postEvent);
eventRouter.post('/:id/vote', eventController.postEventVotes);

export default eventRouter;
