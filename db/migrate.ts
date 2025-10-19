import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { DB_CONFIG } from '../src/config.ts';

const { Pool } = pg;

async function runMigrations() {
  const pool = new Pool(DB_CONFIG);

  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './db/migrations' });
  console.log('Migrations completed!');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed!', err);
  Deno.exit(1);
});
