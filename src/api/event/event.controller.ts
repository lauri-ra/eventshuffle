import { Context } from '@hono/hono';
import * as eventService from './event.service.ts';
import {
  InsertEvent,
  InsertEventDates,
  InsertEventDatesInput,
} from '../../../db/schema.ts';

export async function listEvents(c: Context) {
  try {
    const events = await eventService.getAllEvents();
    const filteredEvents = events.map((e) => ({
      id: e.id,
      name: e.name,
    }));
    return c.json({ events: filteredEvents });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    return c.json({ error: 'Failed to fetch events', errorMessage }, 500);
  }
}

export async function postEvent(c: Context) {
  try {
    const request = await c.req.json<{
      name: string;
      dates: string[];
    }>();
    const createdEvent = await eventService.createEvent(
      { name: request.name },
      request.dates,
    );
    return c.json({ id: createdEvent.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    return c.json({ error: 'Failed to fetch events', errorMessage }, 500);
  }
}

export async function getEventById(c: Context) {
  try {
    const eventId = Number(c.req.param('id'));
    const event = await eventService.getEventById(eventId);
    return c.json(event);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    return c.json({ error: 'Failed to fetch events', errorMessage }, 500);
  }
}

export async function postEventVotes(c: Context) {
  try {
    const eventId = Number(c.req.param('id'));
    const payload = await c.req.json<{
      name: string;
      votes: string[];
    }>();
    const votedEvent = await eventService.voteEvent(
      eventId,
      payload.name,
      payload.votes,
    );
    return c.json(votedEvent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    return c.json({ error: 'Failed to fetch events', errorMessage }, 500);
  }
}

export async function getEventResults(c: Context) {
  try {
    const eventId = Number(c.req.param('id'));
    const results = await eventService.getEventResults(eventId);
    return c.json(results);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    return c.json({ error: 'Failed to fetch events', errorMessage }, 500);
  }
}
