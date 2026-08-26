import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { SessionStore } from './session.store.js';
import { loadEnv } from '../config/env.js';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: REDIS,
      useFactory: (): Redis => new Redis(loadEnv().REDIS_URL),
    },
    {
      provide: SessionStore,
      useFactory: (redis: Redis): SessionStore =>
        new SessionStore(redis, loadEnv().SESSION_TTL_SECONDS),
      inject: [REDIS],
    },
  ],
  exports: [AuthService, AuthGuard, SessionStore],
})
export class AuthModule {}
