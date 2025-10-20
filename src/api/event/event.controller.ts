import { Context } from '@hono/hono';
import * as eventService from './event.service.ts';
import type { CreateEventInput, VoteEventInput } from './event.types.ts';

export async function listEvents(c: Context) {
  const events = await eventService.getAllEvents();
  return c.json({ events });
}

export async function postEvent(c: Context, request: CreateEventInput) {
  const createdEvent = await eventService.createEvent(
    { name: request.name },
    request.dates,
  );

  return c.json({ id: createdEvent.id }, 201);
}

export async function getEventById(c: Context, eventId: number) {
  const event = await eventService.getEventById(eventId);
  return c.json(event);
}

export async function postEventVotes(
  c: Context,
  eventId: number,
  payload: VoteEventInput,
) {
  const votedEvent = await eventService.voteEvent(
    eventId,
    payload.name,
    payload.votes,
  );

  return c.json(votedEvent);
}

export async function getEventResults(c: Context, eventId: number) {
  const results = await eventService.getEventResults(eventId);
  return c.json(results);
}
