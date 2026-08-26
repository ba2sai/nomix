# Nomix — Nómina inteligente

Plataforma de nómina para la República de Panamá. Monorepo TypeScript.

> **Documentación:** empieza por [`docs/README.md`](docs/README.md).
> **Arquitectura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) — lectura obligatoria antes de escribir código.
> **Base legal (fuente de verdad de todo cálculo):** [`docs/nomix/06_base_legal_panama.md`](docs/nomix/06_base_legal_panama.md).

## Requisitos

- **Node 22+** (ver `.nvmrc`) · **pnpm 9** · **Docker** (para Postgres y Redis locales)

Ninguno está instalado en el entorno donde se generó el esqueleto; instálalos antes del primer arranque:

```bash
corepack enable          # habilita pnpm que trae Node
nvm use                  # toma la versión de .nvmrc
```

## Arranque

```bash
pnpm install                     # instala todo el workspace
cp .env.example .env             # completa los secretos locales
pnpm infra:up                    # levanta postgres + redis (docker/)
pnpm db:generate && pnpm db:migrate
pnpm test                        # corre las pruebas (incluye la validación real)
pnpm dev                         # turbo: api + web + worker
```

## Estructura

```
apps/
  api/       NestJS — REST + SSE. Única autoridad de cálculo.
  web/       React + Vite — dashboard RRHH + portal del colaborador.
  worker/    BullMQ — PDF, ACH, SIPE, correo.
packages/
  payroll-engine/   ⭐ Motor puro. Sin I/O. Corre en servidor y navegador.
  rules/            Resolución de reglas por fecha de vigencia (ADR-001).
  contracts/        Esquemas Zod + tipos compartidos.
  db/               Drizzle: schema, migraciones, políticas RLS.
  ach-exporters/    (en apps/worker/src/ach) adaptadores por banco — stubs.
docker/      docker-compose, Caddyfile, init de Postgres.
docs/        Toda la documentación del proyecto.
```

## Las reglas que no se rompen (resumen — detalle en `ARCHITECTURE.md` §6)

1. Ninguna constante legal en el código: todo viene de la config versionada por fecha.
2. Las reglas se resuelven por la **fecha del período**, nunca por hoy.
3. Sin aritmética nativa sobre dinero: `Money`/`decimal.js` siempre. La regla de
   lint **rompe el build** ante un literal decimal en el motor.
4. La incidencia de conceptos se consulta, no se codifica.
5. Cada resultado persiste qué regla lo produjo.

## Estado del andamiaje

| Pieza | Estado |
|---|---|
| Monorepo (pnpm + turbo + tsconfig) | ✅ Listo |
| Docker: Postgres 16 + Redis + Caddy | ✅ Listo |
| Rol de app NOBYPASSRLS + políticas RLS | ✅ Definido |
| Regla de lint anti-decimal (ADR-010) | ✅ Configurada |
| `@nomix/payroll-engine` — CSS/SE + `Money` | ✅ Con test contra datos reales de jun-2026 |
| `@nomix/rules` — resolución temporal | ✅ Con test (12.25→13.25→14.25%) |
| `@nomix/db` — identidad, tenencia, reglas | ✅ Schema base |
| `@nomix/contracts` | ✅ Base |
| apps api/web/worker | 🟡 Stubs — pendientes de andamiaje NestJS/React/BullMQ |

> El esqueleto se creó sin Node/Docker en el entorno, así que **aún no se ha
> ejecutado `pnpm install` ni las pruebas**. El primer `pnpm install` fijará el
> `pnpm-lock.yaml`. Los tests de `payroll-engine` y `rules` están escritos para
> pasar en verde contra los números reales del asiento de junio 2026.
