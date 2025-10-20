import type { Context } from '@hono/hono';
import { HTTPException } from '@hono/hono/http-exception';
import { logger } from './logger.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

interface ErrorResponse {
  error: string;
  details?: string;
}

// Maps known error types to HTTP status codes. Defaults to 500.
function getStatusCodeForError(error: Error): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof ValidationError) return 400;
  if (error instanceof HTTPException) return error.status;
  return 500;
}

// Global error handler middleware for Hono
// Catches all errors, logs them and returns appropriate responses
export function errorHandler(error: Error, c: Context): Response {
  const statusCode = getStatusCodeForError(error);

  // Log the error with context
  logger.error(
    'Request error',
    error instanceof Error ? error : new Error(String(error)),
  );

  // Prepare error response
  const response: ErrorResponse = {
    error: error.message || 'An unexpected error occurred',
  };

  // In development include the stack trace.
  const nodeEnv = Deno.env.get('NODE_ENV');
  if (nodeEnv !== 'production') {
    response.details = error.stack;
  }

  return c.json(response, statusCode as 400 | 404 | 409 | 500);
}
