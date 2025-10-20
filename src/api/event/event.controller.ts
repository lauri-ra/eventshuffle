import { Context } from '@hono/hono';
import * as eventService from './event.service.ts';
import type { CreateEventInput, VoteEventInput } from './event.types.ts';

export async function listEvents(c: Context) {
  try {
    const events = await eventService.getAllEvents();
    return c.json({ events });
  } catch (error) {
    console.error('Error listing events:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to list events', details: errorMessage },
      500,
    );
  }
}

export async function postEvent(c: Context, request: CreateEventInput) {
  try {
    const createdEvent = await eventService.createEvent(
      { name: request.name },
      request.dates,
    );

    return c.json({ id: createdEvent.id }, 201);
  } catch (error) {
    console.error('Error creating event:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to create event', details: errorMessage },
      500,
    );
  }
}

export async function getEventById(c: Context, eventId: number) {
  try {
    const event = await eventService.getEventById(eventId);
    return c.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: error.message }, 404);
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to fetch event', details: errorMessage },
      500,
    );
  }
}

export async function postEventVotes(
  c: Context,
  eventId: number,
  payload: VoteEventInput,
) {
  try {
    const votedEvent = await eventService.voteEvent(
      eventId,
      payload.name,
      payload.votes,
    );

    return c.json(votedEvent);
  } catch (error) {
    console.error('Error voting on event:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: error.message }, 404);
    }

    if (error instanceof Error && error.message.includes('already voted')) {
      return c.json({ error: error.message }, 409);
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to submit votes', details: errorMessage },
      500,
    );
  }
}

export async function getEventResults(c: Context, eventId: number) {
  try {
    const results = await eventService.getEventResults(eventId);
    return c.json(results);
  } catch (error) {
    console.error('Error fetching event results:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: error.message }, 404);
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to fetch results', details: errorMessage },
      500,
    );
  }
}
