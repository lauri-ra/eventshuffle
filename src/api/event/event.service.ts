import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/db.ts';
import {
  eventDates,
  eventVotes,
  events,
  InsertEventDates,
  InsertEventDatesInput,
  InsertEventInput,
} from '../../../db/schema.ts';

export async function getAllEvents() {
  return await db.select().from(events);
}

export async function createEvent(event: InsertEventInput, dates: string[]) {
  return await db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(events)
      .values({ name: event.name })
      .returning({ id: events.id });

    for (const d of dates) {
      const input: InsertEventDates = {
        eventId: Number(id),
        date: d,
      };
      await tx.insert(eventDates).values(input);
    }
    return { id };
  });
}

export async function getEventById(queryId: number) {
  return await db.transaction(async (tx) => {
    // Get the actual event and all dates associated with it.
    const event = await tx.select().from(events).where(eq(events.id, queryId));
    const dates = await tx
      .select()
      .from(eventDates)
      .where(eq(eventDates.eventId, queryId));

    // Go through each event date & get people who voted for it.
    const datesWithVotes = await Promise.all(
      dates.map(async (date) => {
        // Find event votes that match the date id.
        const votes = await tx
          .select()
          .from(eventVotes)
          .where(eq(eventVotes.eventDateId, date.id));

        const people = votes.map((vote) => vote.personName);

        return { date: date.date, people };
      }),
    );

    return {
      id: event[0].id,
      name: event[0].name,
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
    const event = await tx.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      throw new Error(`No event with ${eventId} exists!`);
    }

    // Find eventDates that match the provided votes.
    const availableEventDates = await tx
      .select()
      .from(eventDates)
      .where(eq(eventDates.eventId, eventId));

    // For each voted date, find a matching eventDate and insert vote.
    for (const votedDate of votes) {
      const matchingEventDate = availableEventDates.find(
        (d) => d.date === votedDate,
      );

      if (!matchingEventDate) {
        // If no matching date exists, log an error and move onto the next.
        console.error(`Date ${votedDate} not found for this event!`);
        continue;
      }

      // Register a vote, by inserting person and the matching event id.
      // Ignore the vote if its a duplicate by the same person.
      await tx
        .insert(eventVotes)
        .values({ eventDateId: matchingEventDate.id, personName: name })
        .onConflictDoNothing();
    }

    // Get all votes to return complete response
    const allVotes = await Promise.all(
      availableEventDates.map(async (date) => {
        const votesForDate = await tx
          .select()
          .from(eventVotes)
          .where(eq(eventVotes.eventDateId, date.id));

        return {
          date: date.date,
          people: votesForDate.map((v) => v.personName),
        };
      }),
    );

    return {
      id: event[0].id,
      name: event[0].name,
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
      throw new Error(`No event with ${eventId} exists!`);
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
