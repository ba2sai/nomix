# Nomix — Nómina inteligente

Plataforma de nómina para empresas en Panamá: planilla quincenal, deducciones de ley (CSS, Seguro Educativo, ISR), XIII mes, vacaciones y liquidaciones, con cálculos trazables al artículo de ley que los respalda.

> **Estado:** NMX-001 implementa el entorno local y el arranque mínimo. Los módulos de nómina, autenticación y la CI se construyen en los siguientes tickets.

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

Requiere Docker con contenedores Linux y Docker Compose v2 o superior. PHP, Composer y Node se ejecutan dentro de contenedores. Primera instalación: conexión a Internet para imágenes y dependencias.

Linux/macOS/WSL con GNU Make:

```bash
make up
make setup
```

Windows PowerShell, desde la carpeta del repositorio (no necesita Make):

```powershell
.\nomix.ps1 up
.\nomix.ps1 setup
```

`up` genera `.env` con claves aleatorias si falta, construye PHP y espera a PostgreSQL/Redis. `setup` instala los locks de Composer/npm, prepara la tabla técnica de migraciones y arranca API, frontend y Horizon. Todavía no existen migraciones de negocio ni datos semilla.

| Servicio | Dirección predeterminada |
|---|---|
| Frontend | http://localhost:5173 |
| API (estado del proceso) | http://localhost:8080/api/health |
| Correo de pruebas Mailpit | http://localhost:8025 |

Todas las publicaciones de puertos se limitan a `127.0.0.1`. El panel de Horizon permanece cerrado hasta implementar autenticación y permisos.

**Puertos ocupados:** ejecuta primero `make env` o `.\nomix.ps1 env`, edita `API_PORT`, `POSTGRES_PORT` u otros puertos en `.env`, y continúa con `up` / `setup`. Por ejemplo: `API_PORT=8082` y `POSTGRES_PORT=5433`. No cambies los puertos internos de los contenedores. El frontend usa `/api` con proxy, por lo que no necesita cambiar su URL de API.

**Comprobaciones y apagado:**

```powershell
.\nomix.ps1 lint
.\nomix.ps1 test
.\nomix.ps1 status
.\nomix.ps1 down
```

Los equivalentes son `make lint`, `make test`, `make status` y `make down`. `down` elimina los contenedores y la red del proyecto, **conservando los datos y las dependencias en volúmenes**. Para volver a iniciar, ejecuta `up` y `setup`. Ambos pueden repetirse.

`lint` comprueba Compose, Composer, formato PHP (Pint), análisis estático (PHPStan + Larastan, nivel máximo en `app/Domain`) y TypeScript. `test` ejecuta Pest (arquitectura de capas, prohibición de `float` en `Domain`, API), prueba roles y RLS contra PostgreSQL real, API directa y proxy, Redis, SMTP, Horizon y el build de React. Para formatear el backend: `docker compose run --rm --no-deps app composer format`. ESLint/Prettier/Vitest se añaden en NMX-003; CI en NMX-004.

Consulta [la guía del entorno local](docs/nomix/08_entorno_local.md) para versiones, permisos, persistencia y solución de problemas.
