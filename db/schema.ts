import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  date,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const eventDates = pgTable('event_dates', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const eventVotes = pgTable(
  'votes',
  {
    id: serial('id').primaryKey(),
    eventDateId: integer('event_date_id')
      .notNull()
      .references(() => eventDates.id, { onDelete: 'cascade' }),
    personName: varchar('person_name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return [
      // Unique constraint to make sure there is only one vote / person.
      unique().on(table.eventDateId, table.personName),
    ];
  },
);

// Define relations
export const eventsRelations = relations(events, ({ many }) => ({
  dates: many(eventDates),
}));

export const eventDatesRelations = relations(eventDates, ({ one, many }) => ({
  event: one(events, {
    fields: [eventDates.eventId],
    references: [events.id],
  }),
  votes: many(eventVotes),
}));

export const votesRelations = relations(eventVotes, ({ one }) => ({
  eventDate: one(eventDates, {
    fields: [eventVotes.eventDateId],
    references: [eventDates.id],
  }),
}));

// Define types
export type InsertEvent = InferInsertModel<typeof events>;
export type InsertEventInput = Pick<InsertEvent, 'name'>;

export type InsertEventDates = InferInsertModel<typeof eventDates>;
export type InsertEventDatesInput = Pick<InsertEventDates, 'date'>;

export type InsertVote = InferInsertModel<typeof eventVotes>;
