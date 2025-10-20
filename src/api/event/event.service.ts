import { eq, inArray, and } from 'drizzle-orm';
import { db } from '../../../db/db.ts';
import {
  eventDates,
  eventVotes,
  events,
  InsertEventInput,
} from '../../../db/schema.ts';
import { NotFoundError, ConflictError } from '../../common/errors.ts';
import { logger } from '../../common/logger.ts';

export async function getAllEvents() {
  return await db.select({ id: events.id, name: events.name }).from(events);
}

export async function createEvent(event: InsertEventInput, dates: string[]) {
  return await db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(events)
      .values({ name: event.name })
      .returning({ id: events.id });

    const datesToInsert = dates.map((d) => ({
      eventId: Number(id),
      date: d,
    }));

    if (datesToInsert.length > 0) {
      await tx.insert(eventDates).values(datesToInsert);
    }

    return { id };
  });
}

export async function getEventById(queryId: number) {
  return await db.transaction(async (tx) => {
    // Get the actual event
    const eventResult = await tx
      .select()
      .from(events)
      .where(eq(events.id, queryId));
    if (eventResult.length === 0) {
      throw new NotFoundError(`Event with id ${queryId} not found.`);
    }
    const event = eventResult[0];

    // Get all dates associated with the event
    const dates = await tx
      .select()
      .from(eventDates)
      .where(eq(eventDates.eventId, queryId));

    const dateIds = dates.map((d) => d.id);

    // Get all votes for the dates
    const allVotes = await tx
      .select()
      .from(eventVotes)
      .where(inArray(eventVotes.eventDateId, dateIds));

    // Group the votes by event date id
    const votesByDateId = allVotes.reduce<Record<number, string[]>>(
      (acc, vote) => {
        if (!acc[vote.eventDateId]) {
          acc[vote.eventDateId] = [];
        }
        acc[vote.eventDateId].push(vote.personName);
        return acc;
      },
      {},
    );

    // Map the votes for the response result.
    const datesWithVotes = dates.map((date) => {
      const people = votesByDateId[date.id] || [];
      return { date: date.date, people };
    });

    return {
      id: event.id,
      name: event.name,
      dates: dates.map((d) => d.date),
      votes: datesWithVotes.filter((v) => v.people.length > 0),
    };
  });
}

export async function voteEvent(
  eventId: number,
  name: string,
  votes: string[],
) {
  return await db.transaction(async (tx) => {
    // Check if event exists.
    const eventResult = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    if (eventResult.length === 0) {
      throw new NotFoundError(`No event with ${eventId} exists!`);
    }
    const event = eventResult[0];

    // Find eventDates that match the provided votes.
    const availableEventDates = await tx
      .select()
      .from(eventDates)
      .where(eq(eventDates.eventId, eventId));

    // For each voted date, find a matching eventDate and insert vote.
    const votesToInsert = [];
    for (const votedDate of votes) {
      const matchingEventDate = availableEventDates.find(
        (d) => d.date === votedDate,
      );

      if (!matchingEventDate) {
        // If no matching date exists, throw an error
        throw new NotFoundError(
          `Date ${votedDate} is not available for this event`,
        );
      }

      // Register a vote, by inserting person and the matching event id.
      votesToInsert.push({
        eventDateId: matchingEventDate.id,
        personName: name,
      });
    }

    // Check if votesToInsert is empty, meaning all dates were invalid
    if (votesToInsert.length === 0) {
      throw new NotFoundError('No valid dates provided for voting');
    }

    // Check for existing votes to detect duplicates for the same date
    const votedDateIds = votesToInsert.map((v) => v.eventDateId);
    const existingVotes = await tx
      .select()
      .from(eventVotes)
      .where(
        and(
          eq(eventVotes.personName, name),
          inArray(eventVotes.eventDateId, votedDateIds),
        ),
      );

    if (existingVotes.length > 0) {
      const duplicateDates = existingVotes.map((v) => {
        const dateInfo = availableEventDates.find(
          (d) => d.id === v.eventDateId,
        );
        return dateInfo?.date;
      });
      logger.warn(
        `Duplicate vote detected for person: ${name} on dates: ${duplicateDates.join(
          ', ',
        )}`,
      );
      throw new ConflictError(
        `Person: ${name} has already voted for the following dates: ${duplicateDates.join(
          ', ',
        )}`,
      );
    }

    await tx.insert(eventVotes).values(votesToInsert);

    // Get all votes that match the available dates of the event.
    const dateIds = availableEventDates.map((d) => d.id);
    const allVotesForEvent = await tx
      .select()
      .from(eventVotes)
      .where(inArray(eventVotes.eventDateId, dateIds));

    // Group event votes by event id.
    const votesByDateId = allVotesForEvent.reduce<Record<number, string[]>>(
      (acc, vote) => {
        if (!acc[vote.eventDateId]) {
          acc[vote.eventDateId] = [];
        }
        acc[vote.eventDateId].push(vote.personName);
        return acc;
      },
      {},
    );

    const allVotes = availableEventDates.map((date) => ({
      date: date.date,
      people: votesByDateId[date.id] || [],
    }));

    return {
      id: event.id,
      name: event.name,
      dates: availableEventDates.map((d) => d.date),
      votes: allVotes.filter((v) => v.people.length > 0),
    };
  });
}

export async function getEventResults(eventId: number) {
  return await db.transaction(async (tx) => {
    // Get the event.
    const eventResult = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (eventResult.length === 0) {
      throw new NotFoundError(`No event with id ${eventId} exists!`);
    }
    const event = eventResult[0];

    // 2. Get all possilbe dates for the event.
    const datesForEvent = await tx
      .select({ id: eventDates.id, date: eventDates.date })
      .from(eventDates)
      .where(eq(eventDates.eventId, eventId));

    if (datesForEvent.length === 0) {
      return { id: event.id, name: event.name, suitableDates: [] };
    }

    // Date ids for possible dates
    const dateIds = datesForEvent.map((d) => d.id);

    // Get all votes for the possible dates of the event.
    const allVotes = await tx
      .select({
        eventDateId: eventVotes.eventDateId,
        personName: eventVotes.personName,
      })
      .from(eventVotes)
      .where(inArray(eventVotes.eventDateId, dateIds)); // gets

    // Process the results. Start by collecting person names into a set.
    const allParticipants = [...new Set(allVotes.map((v) => v.personName))];

    // No participants -> return early with the available results.
    const participantCount = allParticipants.length;
    if (participantCount === 0) {
      return {
        id: event.id,
        name: event.name,
        suitableDates: datesForEvent.map((d) => ({ date: d.date, people: [] })),
      };
    }

    // Next go through the votes and group them by event date id.
    const votesByDate = allVotes.reduce<Record<number, string[]>>(
      (acc, vote) => {
        if (!acc[vote.eventDateId]) {
          acc[vote.eventDateId] = [];
        }
        acc[vote.eventDateId].push(vote.personName);
        return acc;
      },
      {},
    );

    // Finally, go through all the possible event dates.
    const suitableDates = datesForEvent
      .filter((date) => {
        // For each date, filter those dates where every person is a participant.
        const votersForDate = votesByDate[date.id] || [];
        return allParticipants.every((participant) =>
          votersForDate.includes(participant),
        );
      })
      .map((date) => ({
        date: date.date,
        people: votesByDate[date.id] || [],
      }));

    return {
      id: event.id,
      name: event.name,
      suitableDates,
    };
  });
}
