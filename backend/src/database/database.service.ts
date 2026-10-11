import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db, pool } from './db';
import * as schema from './schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const DRIZZLE_DB = 'DRIZZLE_DB';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: NodePgDatabase<typeof schema> = db;
  public readonly pool = pool;

  async onModuleDestroy() {
    await this.pool.end();
  }
}
