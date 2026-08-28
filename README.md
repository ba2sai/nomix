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

## Estado

| Pieza | Estado |
|---|---|
| Monorepo (pnpm + turbo + tsconfig) | ✅ Listo |
| Docker: Postgres 16 + Redis + Caddy | ✅ Listo |
| Rol de app NOBYPASSRLS + políticas RLS | ✅ Aplicadas y probadas (incluye `movimiento`) |
| Regla de lint anti-decimal (ADR-010) | ✅ Configurada |
| `@nomix/rules` — resolución temporal | ✅ Con test (12.25→13.25→14.25%) |
| `@nomix/db` — schema, 4 migraciones, RLS | ✅ Listo |
| `@nomix/contracts` | ✅ Base |
| **Catálogo de conceptos** (matriz de incidencia, ADR-002) | ✅ 32 conceptos sembrados desde la base legal |
| `@nomix/payroll-engine` — CSS/SE/RP, bases, devengo, ISR | ✅ 61 tests; cuadra al centavo contra jun-2026 |
| API: auth + RLS multi-tenant, colaboradores, planilla | ✅ Máquina de estados + movimientos del período |
| **ISR** — retención acumulativa (`ADR-014`) | ✅ Dos flujos (ordinario / gastos de representación), verificado contra 2 quincenas reales |
| Web: shell, login, wizard, planillas + movimientos | ✅ Operativo |
| XIII Mes, vacaciones, liquidaciones | ⬜ Siguiente — las bases ya salen calculadas |
| Exportadores ACH / SIPE / Formulario 03 | ⬜ SIPE y Form-03 desbloqueados; ACH pendiente |
| Roles y permisos (`GAP-005`) | ⬜ La columna `usuario_empresa.rol` existe pero no se aplica |
| `apps/worker` (BullMQ) | 🟡 Stub |

### Convenciones configurables por empresa

| Columna | Default | Por qué es configurable |
|---|---|---|
| `metodo_prorrateo` | `mitad_mensual` | La quincena se paga como `salario ÷ 2` o por días reales. El doc 05 §2 lo deja como consulta abierta y ambas prácticas existen en el mercado. |
| `horas_mensuales` | `208` | Divisor de la hora ordinaria: 208 (48 h/sem) o 192 (base legal §12.2). |

> **Sobre la honestidad del cálculo:** cada concepto del catálogo lleva su
> `confianza` (`verificado` / `verificar` / `pendiente`). Cuando una planilla usa
> un concepto sin verificar, el resultado lo declara en
> `totales.conceptosPendientes` y la UI lo marca como provisional. Hoy son 6 de
> 32, todos derivados de consultas abiertas del
> [`07_consultas_profesional_planilla.md`](docs/nomix/07_consultas_profesional_planilla.md).

### ISR — método acumulativo (`ADR-014`)

La ley no prescribe cómo retener ISR quincena a quincena (consulta A1). Nomix
recalcula el impuesto del año a la fecha en cada corte y retiene solo la
diferencia contra lo ya retenido — dos flujos paralelos (ordinario / gastos de
representación) con su propia escala, tal como exige el Formulario 03. Ningún
reembolso automático a mitad de año; sin deducciones personales capturadas
todavía (no hay campo en la ficha del colaborador). Detalle completo y
sub-decisiones declaradas en `ADR-014`.
