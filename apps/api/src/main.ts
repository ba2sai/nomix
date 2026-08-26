import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv(); // falla temprano si el entorno es inválido
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ['error', 'warn', 'log'] },
  );
  // @fastify/cookie tipa contra su propia copia de fastify (duplicación de tipos
  // en el árbol de dependencias); el cast puentea ese desajuste sin usar `any`.
  await app.register(fastifyCookie as unknown as Parameters<typeof app.register>[0]);
  app.setGlobalPrefix('api');
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`Nomix API escuchando en http://0.0.0.0:${String(env.API_PORT)}/api`);
}

void bootstrap();
