import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

let connectionString = process.env.DATABASE_URL;

// If DATABASE_URL is not set or contains the placeholder '***', build from discrete DB_* env vars
if (!connectionString || connectionString.includes('***')) {
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'koc';
  const ssl = process.env.DB_SSL === 'true' ? '?sslmode=require' : '';
  connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}${ssl}`;
}

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});
