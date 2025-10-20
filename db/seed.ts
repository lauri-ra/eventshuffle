import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DB_CONFIG } from '../src/config.ts';
import { events, eventDates, eventVotes } from './schema.ts';

const { Pool } = pg;

async function seedDatabase() {
  const pool = new Pool(DB_CONFIG);
  const db = drizzle(pool);

  console.log('Seeding database with test data...');

  try {
    const [event1] = await db
      .insert(events)
      .values({
        name: "Jake's secret party",
      })
      .returning();

    const [_event2] = await db
      .insert(events)
      .values({
        name: 'Bowling night',
      })
      .returning();

    const [_event3] = await db
      .insert(events)
      .values({
        name: 'Tabletop gaming',
      })
      .returning();

    const [date1] = await db
      .insert(eventDates)
      .values({
        eventId: event1.id,
        date: '2014-01-01',
      })
      .returning();

    const [_date2] = await db
      .insert(eventDates)
      .values({
        eventId: event1.id,
        date: '2014-01-05',
      })
      .returning();

    const [_date3] = await db
      .insert(eventDates)
      .values({
        eventId: event1.id,
        date: '2014-01-12',
      })
      .returning();

    await db.insert(eventVotes).values([
      { eventDateId: date1.id, personName: 'John' },
      { eventDateId: date1.id, personName: 'Julia' },
      { eventDateId: date1.id, personName: 'Paul' },
      { eventDateId: date1.id, personName: 'Daisy' },
    ]);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeding failed!', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase().catch((err) => {
  console.error('Seed process failed!', err);
  Deno.exit(1);
});
