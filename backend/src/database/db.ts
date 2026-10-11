import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as schema from './schema';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function getPoolConfig(): PoolConfig {
  const isSsl =
    process.env.DB_SSL === 'true' ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('***')) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'koc',
    ssl: isSsl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export const pool = new Pool(getPoolConfig());

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
