import { z } from 'zod';

export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(255, 'Event name too long'),
  dates: z
    .array(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    )
    .min(1, 'At least one date is required'),
});

export const addVoteSchema = z.object({
  name: z.string().min(1, 'Voter name is required').max(255, 'Name too long'),
  votes: z
    .array(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    )
    .min(1, 'At least one vote is required'),
});

export const eventIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Invalid event id, must be a positive number')
    .transform(Number),
});

// Export types for use in controllers/services
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type VoteEventInput = z.infer<typeof addVoteSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
