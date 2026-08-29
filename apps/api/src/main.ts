import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { TAMANO_MAXIMO } from './colaborador/documento.service.js';

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
  /**
   * Subida de documentos del colaborador (ADR-022).
   *
   * El límite de tamaño se declara AQUÍ además de comprobarse en el servicio:
   * fastify corta el flujo al superarlo, así que un archivo enorme se rechaza
   * mientras llega en vez de después de haberlo cargado entero en memoria.
   * `files: 1` evita que una sola petición traiga veinte adjuntos.
   */
  await app.register(fastifyMultipart as unknown as Parameters<typeof app.register>[0], {
    limits: { fileSize: TAMANO_MAXIMO, files: 1, fields: 10 },
  });
  app.setGlobalPrefix('api');
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`Nomix API escuchando en http://0.0.0.0:${String(env.API_PORT)}/api`);
}

void bootstrap();
