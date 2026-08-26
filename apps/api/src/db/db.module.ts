import { Global, Module, type OnModuleDestroy, Inject } from '@nestjs/common';
import { createDb, type DbHandle } from './client.js';
import { loadEnv } from '../config/env.js';

export const DB = Symbol('DB_HANDLE');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): DbHandle => {
        const env = loadEnv();
        return createDb(env.DATABASE_URL);
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  async onModuleDestroy(): Promise<void> {
    await this.handle.close();
  }
}
