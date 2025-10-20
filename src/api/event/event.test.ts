import { assertEquals, assertRejects } from '@std/assert';
import { returnsNext, stub } from '@std/testing/mock';
import { db } from '../../../db/db.ts';
import * as eventService from './event.service.ts';

Deno.test('event.service.ts', async (t) => {
  await t.step('getAllEvents should return all events', async () => {
    const selectStub = stub(
      db,
      'select',
      () =>
        ({
          from: () =>
            Promise.resolve([
              { id: 1, name: 'Event 1' },
              { id: 2, name: 'Event 2' },
            ]),
          // deno-lint-ignore no-explicit-any
        } as any),
    );

    try {
      const result = await eventService.getAllEvents();
      assertEquals(result.length, 2);
      assertEquals(result[0].name, 'Event 1');
      assertEquals(result[1].name, 'Event 2');
    } finally {
      selectStub.restore();
    }
  });

  await t.step('createEvent should create event and return id', async () => {
    // deno-lint-ignore no-explicit-any
    const txMock = stub(db, 'transaction', async (cb: any) => {
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () => Promise.resolve([{ id: 1 }]),
          }),
        }),
      };
      // deno-lint-ignore no-explicit-any
      return await cb(tx as any);
    });

    try {
      const result = await eventService.createEvent({ name: 'New Event' }, [
        '2025-10-20',
        '2025-10-21',
      ]);
      assertEquals(result.id, 1);
    } finally {
      txMock.restore();
    }
  });

  await t.step('getEventById should throw if event not found', async () => {
    // deno-lint-ignore no-explicit-any
    const txMock = stub(db, 'transaction', async (cb: any) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => Promise.resolve([]),
          }),
        }),
      };
      // deno-lint-ignore no-explicit-any
      return await cb(tx as any);
    });

    try {
      await assertRejects(
        () => eventService.getEventById(999),
        Error,
        'Event with id 999 not found.',
      );
    } finally {
      txMock.restore();
    }
  });

  await t.step('getEventById should return a formatted event', async () => {
    const whereStub = returnsNext([
      Promise.resolve([{ id: 1, name: 'Test Event' }]), // Get event
      Promise.resolve([
        { id: 10, eventId: 1, date: '2025-10-20' },
        { id: 11, eventId: 1, date: '2025-10-21' },
      ]), // Get dates
      Promise.resolve([
        { id: 100, eventDateId: 10, personName: 'Alice' },
        { id: 101, eventDateId: 10, personName: 'Bob' },
      ]), // Get votes
    ]);

    // deno-lint-ignore no-explicit-any
    const txMock = stub(db, 'transaction', async (cb: any) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: whereStub,
          }),
        }),
      };
      // deno-lint-ignore no-explicit-any
      return await cb(tx as any);
    });

    try {
      const result = await eventService.getEventById(1);
      assertEquals(result.id, 1);
      assertEquals(result.name, 'Test Event');
      assertEquals(result.dates, ['2025-10-20', '2025-10-21']);
      assertEquals(result.votes.length, 1);
      assertEquals(result.votes[0].date, '2025-10-20');
      assertEquals(result.votes[0].people.length, 2);
      assertEquals(result.votes[0].people.includes('Alice'), true);
      assertEquals(result.votes[0].people.includes('Bob'), true);
    } finally {
      txMock.restore();
    }
  });

  await t.step(
    'voteEvent should throw if person has already voted',
    async () => {
      const eventId = 1;
      const personName = 'Test Person';
      const votes = ['2025-10-21'];

      const whereStub = returnsNext([
        Promise.resolve([{ id: 1, name: 'Test Event' }]), // event exists
        Promise.resolve([{ id: 10, eventId: 1, date: '2025-10-21' }]), // available dates
        Promise.resolve([{ id: 100, eventDateId: 10, personName }]), // existing vote
      ]);

      // deno-lint-ignore no-explicit-any
      const txMock = stub(db, 'transaction', async (cb: any) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: whereStub,
            }),
          }),
        };
        // deno-lint-ignore no-explicit-any
        return await cb(tx as any);
      });

      try {
        await assertRejects(
          () => eventService.voteEvent(eventId, personName, votes),
          Error,
          `Person: ${personName} has already voted for the following dates: 2025-10-21`,
        );
      } finally {
        txMock.restore();
      }
    },
  );

  await t.step('voteEvent should successfully record votes', async () => {
    const eventId = 1;
    const personName = 'Alice';
    const votes = ['2025-10-21'];

    const whereStub = returnsNext([
      Promise.resolve([{ id: 1, name: 'Test Event' }]), // event exists
      Promise.resolve([{ id: 10, eventId: 1, date: '2025-10-21' }]), // available dates
      Promise.resolve([]), // no existing votes
      Promise.resolve([{ id: 100, eventDateId: 10, personName: 'Alice' }]), // all votes after insert
    ]);

    // deno-lint-ignore no-explicit-any
    const txMock = stub(db, 'transaction', async (cb: any) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: whereStub,
          }),
        }),
        insert: () => ({
          values: () => Promise.resolve(),
        }),
      };
      // deno-lint-ignore no-explicit-any
      return await cb(tx as any);
    });

    try {
      const result = await eventService.voteEvent(eventId, personName, votes);
      assertEquals(result.id, 1);
      assertEquals(result.name, 'Test Event');
      assertEquals(result.votes.length, 1);
      assertEquals(result.votes[0].date, '2025-10-21');
      assertEquals(result.votes[0].people.includes('Alice'), true);
    } finally {
      txMock.restore();
    }
  });

  await t.step('getEventResults should return suitable dates', async () => {
    const eventId = 1;

    const whereStub = returnsNext([
      Promise.resolve([{ id: 1, name: 'Test Event' }]), // Get event
      Promise.resolve([
        { id: 10, date: '2025-10-21' },
        { id: 11, date: '2025-10-22' },
      ]), // Get dates
      Promise.resolve([
        { eventDateId: 10, personName: 'Alice' },
        { eventDateId: 10, personName: 'Bob' },
        { eventDateId: 11, personName: 'Alice' },
      ]), // Get votess
    ]);

    // deno-lint-ignore no-explicit-any
    const txMock = stub(db, 'transaction', async (cb: any) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: whereStub,
          }),
        }),
      };
      // deno-lint-ignore no-explicit-any
      return await cb(tx as any);
    });

    try {
      const result = await eventService.getEventResults(eventId);
      assertEquals(result.id, 1);
      assertEquals(result.name, 'Test Event');
      assertEquals(result.suitableDates.length, 1);
      assertEquals(result.suitableDates[0].date, '2025-10-21');
      assertEquals(result.suitableDates[0].people.length, 2);
      assertEquals(result.suitableDates[0].people.includes('Alice'), true);
      assertEquals(result.suitableDates[0].people.includes('Bob'), true);
    } finally {
      txMock.restore();
    }
  });

  await t.step(
    'getEventResults should return all dates with empty people if no votes',
    async () => {
      const eventId = 1;

      const whereStub = returnsNext([
        Promise.resolve([{ id: 1, name: 'Test Event' }]), // 1. Get event
        Promise.resolve([
          { id: 10, date: '2025-10-21' },
          { id: 11, date: '2025-10-22' },
        ]), // 2. Get dates
        Promise.resolve([]), // 3. Get votes (empty)
      ]);

      // deno-lint-ignore no-explicit-any
      const txMock = stub(db, 'transaction', async (cb: any) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: whereStub,
            }),
          }),
        };
        // deno-lint-ignore no-explicit-any
        return await cb(tx as any);
      });

      try {
        const result = await eventService.getEventResults(eventId);
        assertEquals(result.id, 1);
        assertEquals(result.name, 'Test Event');
        assertEquals(result.suitableDates.length, 2);
        assertEquals(result.suitableDates[0].people.length, 0);
        assertEquals(result.suitableDates[1].people.length, 0);
      } finally {
        txMock.restore();
      }
    },
  );

  await t.step(
    'getEventResults should return empty if no date works for everyone',
    async () => {
      const eventId = 1;

      const whereStub = returnsNext([
        Promise.resolve([{ id: 1, name: 'Test Event' }]), // Get event
        Promise.resolve([
          { id: 10, date: '2025-10-21' },
          { id: 11, date: '2025-10-22' },
        ]), // Get dates
        Promise.resolve([
          { eventDateId: 10, personName: 'Alice' },
          { eventDateId: 11, personName: 'Bob' },
        ]), // Get votes - different dates
      ]);

      // deno-lint-ignore no-explicit-any
      const txMock = stub(db, 'transaction', async (cb: any) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: whereStub,
            }),
          }),
        };
        // deno-lint-ignore no-explicit-any
        return await cb(tx as any);
      });

      try {
        const result = await eventService.getEventResults(eventId);
        assertEquals(result.suitableDates.length, 0);
      } finally {
        txMock.restore();
      }
    },
  );

  await t.step(
    'getEventResults should throw if event does not exist',
    async () => {
      // deno-lint-ignore no-explicit-any
      const txMock = stub(db, 'transaction', async (cb: any) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: () => Promise.resolve([]),
            }),
          }),
        };
        // deno-lint-ignore no-explicit-any
        return await cb(tx as any);
      });

      try {
        await assertRejects(
          () => eventService.getEventResults(999),
          Error,
          'No event with id 999 exists!',
        );
      } finally {
        txMock.restore();
      }
    },
  );
});
