import { defineConfig } from 'drizzle-kit';
import { DB_CONFIG } from './src/config.ts';

export default defineConfig({
  schema: './db/schema.ts',
  dialect: 'postgresql',
  out: './db/migrations',
  dbCredentials: DB_CONFIG,
});
