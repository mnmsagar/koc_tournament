import { Global, Module } from '@nestjs/common';
import { DatabaseService, DRIZZLE_DB } from './database.service';

@Global()
@Module({
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE_DB,
      useFactory: (dbService: DatabaseService) => dbService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, DRIZZLE_DB],
})
export class DatabaseModule {}
