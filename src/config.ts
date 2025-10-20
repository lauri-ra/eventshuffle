import 'dotenv/config';

// Helper function to enforce that env variables are set.
function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Database configuration
export const DB_CONFIG = {
  host: requireEnv('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')) || 5432,
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_NAME'),
};

// Application configuration
export const APP_CONFIG = {
  port: Number(Deno.env.get('PORT')) || 8000,
  nodeEnv: Deno.env.get('NODE_ENV') || 'development',
};
