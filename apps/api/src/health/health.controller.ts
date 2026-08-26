import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  @Get()
  async check(): Promise<{ status: string; db: string; ts: string }> {
    let db = 'down';
    try {
      await this.handle.db.execute(sql`select 1`);
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: db === 'up' ? 'ok' : 'degraded', db, ts: new Date().toISOString() };
  }
}
