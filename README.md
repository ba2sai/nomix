# Nomix — Nómina inteligente

Plataforma de nómina para empresas en Panamá: planilla quincenal, deducciones de ley (CSS, Seguro Educativo, ISR), XIII mes, vacaciones y liquidaciones, con cálculos trazables al artículo de ley que los respalda.

> **Estado:** documentación lista; la construcción empieza con el ticket `NMX-001`.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind, shadcn/ui, TanStack Query |
| Backend | Laravel (PHP 8.3+), Sanctum SPA + 2FA |
| Datos | PostgreSQL 16 con Row-Level Security, Redis + Horizon |
| Infraestructura | Docker Compose, Traefik/NGINX, Cloudflare |

## Documentación

| # | Documento | Contenido |
|---|---|---|
| 00 | [Decisiones de stack](docs/nomix/00_decisiones_stack_nomix.md) | Stack final y por qué |
| 01 | [Propuesta de modernización](docs/nomix/01_propuesta_mejora_planifacil.md) | UI/UX, lógica de negocio, seguridad |
| 02 | [Visión de producto](docs/nomix/02_vision_producto_nomix_factor_wow.md) | Diferenciadores |
| 03 | [Arquitectura Docker y seguridad](docs/nomix/03_arquitectura_docker_seguridad_nomix.md) | Despliegue, cifrado, respaldos |
| 04 | [Catálogo de reglas legales](docs/nomix/04_catalogo_reglas_legales.md) | Fuente de verdad de los cálculos |
| 05 | [Arquitectura de código y convenciones](docs/nomix/05_arquitectura_codigo_y_convenciones.md) | Estructura, motor de nómina, API, pruebas |
| 06 | [Modelo de datos del MVP](docs/nomix/06_modelo_datos_mvp.md) | Tablas, cifrado, estados |
| 07 | [Alcance del MVP y backlog](docs/nomix/07_alcance_mvp_y_backlog.md) | Hitos, tickets y plan del día 1 |

Los documentos `docs/01`–`07` son la ingeniería inversa del sistema anterior (PlaniFácil) y sirven solo como referencia funcional.

## Para los agentes

Las reglas de trabajo para Claude y Codex están en [AGENTS.md](AGENTS.md).

## Desarrollo local

Disponible a partir de `NMX-001`:

```bash
cp .env.example .env
make up
make setup
```
