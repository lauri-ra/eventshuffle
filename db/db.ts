import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import { DB_CONFIG } from '../src/config.ts';

const { Pool } = pg;

// Create connection pool
const pool = new Pool(DB_CONFIG);

// Export drizzle instance with all schema incl relations
export const db = drizzle(pool, { schema });
