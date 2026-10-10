# TO DO — Nomix

**Actualizado:** 9 de octubre de 2026.
**Objetivo del MVP:** procesar una planilla quincenal completa, con cálculos correctos, trazables y aislamiento entre empresas.

Este documento resume el avance y ordena los siguientes pasos. Los criterios completos y las dependencias de cada ticket están en el [backlog del MVP](docs/nomix/07_alcance_mvp_y_backlog.md).

## 1. Estado actual

**H0 cerrado: NMX-001 a NMX-006 están integrados en `main` desde el 9 de octubre de 2026.** El merge `a57cd5e` integró la cadena de NMX-001 a NMX-004, con el CI en verde en `f97f40f`; el merge `56527c4` integró NMX-006, con el CI en verde en `b61b06d`.

**NMX-001 implementado, probado e integrado en `main` ([PR #2](https://github.com/ba2sai/nomix/pull/2)).**

**Integración (9 de octubre de 2026):** la cadena `main` ← #2 (NMX-001) ← #1 (NMX-002) ← #3 (NMX-003) ← #4 (NMX-005) ← #5 (NMX-004) ← #7 (NMX-006) entró en `main` con los merges `a57cd5e` y `56527c4`. Como hay un único desarrollador humano, no se exige aprobación formal de otra cuenta: el responsable puede revisar y fusionar sus PRs si el CI está verde en el commit exacto y no quedan hallazgos bloqueantes. El PR de demostración #6 está cerrado sin fusionar.

**Limpieza pendiente de la etapa 0:** borrar del remoto las ramas ya integradas (`nmx-001` a `nmx-006` y `ccr-2e3f57bc-j6bsvi`), retirar los worktrees de revisión de `tmp/` y confirmar que `main` exige el check **CI / Lint y pruebas**. `desarrollo_CC` no se toca: tiene commits que no están en `main`.

- Rama: [`nmx-001-monorepo-docker`](https://github.com/ba2sai/nomix/tree/nmx-001-monorepo-docker).
- Rama de origen: `ccr-2e3f57bc-j6bsvi`.
- Commit de implementación: [`9890e7b`](https://github.com/ba2sai/nomix/commit/9890e7bab1b87c827a371519bbf2989709b9ecc6).
- Mensaje: `feat(nmx-001): incorpora monorepo y entorno Docker local`.
- Ya existe un arranque técnico; los módulos de negocio, autenticación y cálculos de nómina siguen pendientes.

**NMX-002 implementado, probado e integrado en `main` ([PR #1](https://github.com/ba2sai/nomix/pull/1)).**

- Rama: `nmx-002-backend-base`, creada desde `nmx-001-monorepo-docker` cuando NMX-001 aún no estaba integrado; entró en `main` con la cadena H0.
- Implementó: Claude. Revisa: Codex.

**NMX-003 implementado, probado y revisado técnicamente por Codex (tercera revisión, sobre `e215155`), e integrado en `main` ([PR #3](https://github.com/ba2sai/nomix/pull/3)).**

- Rama: `nmx-003-frontend-base`, encadenada sobre `nmx-002-backend-base`.
- Implementó: Claude, por indicación del dueño del producto. Revisa: Codex.

**NMX-005 implementado, probado, revisado técnicamente por Codex e integrado en `main` ([PR #4](https://github.com/ba2sai/nomix/pull/4)).**

- Rama: `nmx-005-money-value-object`, encadenada sobre `nmx-003-frontend-base`.
- Implementó: Claude. Revisa: Codex.

**NMX-004 implementado, verificado en GitHub Actions e integrado en `main` ([PR #5](https://github.com/ba2sai/nomix/pull/5)); revisado técnicamente por Codex el 8 de octubre.**

- Rama: `nmx-004-ci`, encadenada sobre `nmx-005-money-value-object` para que el CI cubra también la mutación de NMX-005.
- Implementó: Claude, por indicación del dueño del producto (en el backlog figuraba Codex). Revisa: Codex.

**NMX-006 implementado, probado, revisado técnicamente por Codex e integrado en `main` ([PR #7](https://github.com/ba2sai/nomix/pull/7)), con el CI en verde.**

- Rama: `nmx-006-parametros-legales`, encadenada sobre `nmx-004-ci`.
- Implementó: Claude. Revisa: Codex.

**NMX-010 (H1) implementado y publicado ([PR #9](https://github.com/ba2sai/nomix/pull/9)). La revisión de Codex pidió tres cambios (R1 a R3), ya corregidos, con el CI en verde sobre `7354f75`; pendiente de integración, después del PR #8.**

- Rama: `nmx-010-contratos-motor`, encadenada sobre `docs-flujo-desarrollador-unico` (PR #8).
- Implementó: Claude. Revisión técnica: Codex.

**NMX-011 (H1) implementado y probado; pendiente de publicación, revisión técnica e integración.**

- Rama: `nmx-011-cuotas-css-se-rp`, encadenada sobre `nmx-010-contratos-motor` (PR #9).
- Implementó: Claude. Revisión técnica: Codex, si está disponible.

## 2. Trabajo realizado

- [x] Analizar la documentación y ordenar el plan de desarrollo.
- [x] Mantener el stack aprobado: Laravel, React/Vite/TypeScript, PostgreSQL 16, Redis/Horizon y Docker Compose.
- [x] Delimitar NMX-001 como infraestructura y arranque mínimo; dejar la ampliación del backend/frontend en NMX-002 y NMX-003.
- [x] Crear la estructura `backend/`, `frontend/` y `docker/`, con las capas iniciales del backend.
- [x] Configurar PHP-FPM, Nginx, PostgreSQL, Redis, Horizon, frontend y Mailpit.
- [x] Implementar `/api/health` y una página React que comprueba la conexión con la API.
- [x] Fijar las dependencias en `composer.lock` y `package-lock.json`.
- [x] Separar los roles de PostgreSQL para administración, migraciones y aplicación; el rol de aplicación no tiene `BYPASSRLS` ni permisos de creación de tablas.
- [x] Generar claves locales aleatorias y excluir `.env`, dependencias, cachés y archivos de compilación de Git.
- [x] Añadir `Makefile` y `nomix.ps1` para ejecutar el entorno en Windows sin instalar Make.
- [x] Documentar instalación, puertos, persistencia y diagnóstico en la [guía del entorno local](docs/nomix/08_entorno_local.md).
- [x] Crear el commit y hacer push de NMX-001 al remoto `nomix`.

## 3. Validaciones realizadas

- [x] Construcción de la imagen PHP e instalación de dependencias.
- [x] Comprobaciones de Compose, Composer, sintaxis PHP, `strict_types` y TypeScript.
- [x] Pruebas de lectura y escritura entre empresas A/B sobre PostgreSQL real.
- [x] Verificación de que el contexto de empresa no persiste tras finalizar la transacción.
- [x] Rechazo de creación de tablas, desactivación de RLS y `TRUNCATE` desde el rol de aplicación.
- [x] Respuesta JSON de la API, acceso mediante el proxy de Vite, Redis y SMTP de Mailpit.
- [x] Horizon en ejecución y rechazo de acceso al panel sin autorización.
- [x] Dos pruebas HTTP del frontend y compilación de React.
- [x] Apagado y reinicio conservando los cinco volúmenes y las claves locales.
- [x] Apagado ordenado de Horizon con `SIGTERM` y código de salida 0.

Las operaciones de lint y pruebas se ejecutaron con PowerShell. El Makefile se comprobó con `make --dry-run` dentro de la imagen PHP; GNU Make no está instalado en el host. ESLint/Prettier/Vitest se incorporan en NMX-003.

### NMX-002 — Base del backend (7 de octubre de 2026)

**Implementación**

- [x] Dependencias de desarrollo fijadas en `composer.lock`: Pest 5.3 (PHPUnit 13.4), `pest-plugin-laravel`, Pint 1.32 y Larastan 3.13. Todas compatibles con PHP 8.5 y Laravel 13 sin forzar versiones.
- [x] Pint (`pint.json`): preset `laravel` y `declare_strict_types`. Se aplicó a `bootstrap/providers.php` y `tests/Infrastructure/smoke.php` (solo formato).
- [x] PHPStan nivel 8 en el backend (`phpstan.neon`) y nivel `max` en `app/Domain` sin Larastan (`phpstan-domain.neon`).
- [x] Pest con suites `Architecture`, `Unit`, `Feature` y `Legal` (`phpunit.xml`, `tests/Pest.php`, `tests/TestCase.php`).
- [x] Pruebas de arquitectura: `Domain` sin Laravel/Carbon/otras capas, sin helpers globales ni fecha del sistema, sin código de depuración; `Application` no usa `Http`; `Http` no usa `Infrastructure`; `strict_types` en todo `App`.
- [x] Prohibición de `float` en `Domain` mediante `FloatUsageScanner` (tipos, casts, literales, `floatval`/`doubleval`), con 18 casos propios positivos y negativos.
- [x] Prueba de `GET /api/health` con Pest.
- [x] Primera clase de dominio: `App\Domain\Shared\DomainException`, base de las excepciones de negocio (la usará NMX-006 para "parámetro sin vigencia").
- [x] `composer lint` = Pint + PHPStan ×2; `composer test` = Pest; `composer format` = Pint. `make test` / `nomix.ps1 test` ejecutan Pest antes de `smoke.php`.
- [x] Retirado `tests/Infrastructure/lint.php` (lo cubren Pint y PHPStan). `smoke.php` se mantiene; su migración a Pest corresponde a NMX-022.
- [x] `backend/.env.testing` versionado y vacío, con `<server>` + `<env force>` en `phpunit.xml`. Así las pruebas no buscan un `.env` del backend, que no existe en el contenedor, y no heredan `APP_ENV=local`.
- [x] Documentación: `README.md` y `docs/nomix/08_entorno_local.md` (sección "Calidad del backend").

**Pruebas**

- [x] `.\nomix.ps1 lint`: Compose, Composer, Pint (18 archivos), PHPStan nivel 8 y `max` sin errores, TypeScript. Código de salida 0.
- [x] `.\nomix.ps1 test`: Pest 26 pruebas (86 aserciones), roles/RLS en PostgreSQL real, API, proxy, Redis, SMTP, Horizon, pruebas HTTP y build del frontend. Código de salida 0.
- [x] Criterio de aceptación verificado a mano: al agregar en `Domain` una clase con `use Illuminate\Support\Str`, falla `Domain no depende de Laravel…` ("Expecting 'App\Domain' not to use 'Illuminate'"). Al agregar una con `float` y `0.0975`, falla `Domain no usa float` e indica archivo y línea. Los archivos se eliminaron después.
- [ ] La prueba negativa no quedó automatizada: generar archivos dentro de `app/Domain` durante la suite es frágil (montaje compartido con el host y restos si la ejecución se interrumpe). El detector de `float` sí tiene pruebas con fragmentos de código.

**Publicación, revisión e integración**

- [x] Commit `7bbb32a` y push de `nmx-002-backend-base` al remoto `nomix`.
- [x] PR [#1](https://github.com/ba2sai/nomix/pull/1) con la plantilla, contra `nmx-001-monorepo-docker`.
- [x] Revisión técnica de Codex, CI en verde e integración en `main` con la cadena H0 (merge `a57cd5e`, 9 de octubre de 2026).

**Notas para tickets siguientes**

- Pruebas de mutación: resuelto en NMX-005 con Pest Mutate (Infection 0.35 ya no admite Pest).
- Driver de cobertura: PCOV 1.0.12 añadido a la imagen PHP en NMX-005.
- Los archivos de prueba de Pest quedan fuera de PHPStan por sus APIs dinámicas. Si se quiere analizarlos, evaluar un plugin de PHPStan para Pest compatible con Pest 5.

### NMX-003 — Base del frontend (7 de octubre de 2026)

Por indicación del dueño del producto, lo implementó Claude (en el backlog figuraba Codex). Por tanto, la revisión cruzada la hace Codex.

**Implementación**

- [x] Rama `nmx-003-frontend-base`, encadenada sobre `nmx-002-backend-base` para no generar conflictos en `Makefile`, `nomix.ps1`, `README.md` y `TODO.md`.
- [x] React 19.3 en lugar de 18: React Router 8 lo exige. Registrado como decisión D-13 tras la revisión (ver abajo).
- [x] Dependencias fijadas en `package-lock.json` (0 vulnerabilidades): Tailwind CSS 4.3 (plugin de Vite), React Router 8.4, TanStack Query 5.104, ESLint 10 + typescript-eslint 8 (`strictTypeChecked`), Prettier 3.9 con orden de clases de Tailwind, Vitest 5 + Testing Library + jsdom.
- [x] shadcn/ui: `components.json`, `cn()` y componentes Button, Card y Badge en `src/components/ui`, adaptados a React 19.
- [x] Layout: sidebar (fija en escritorio, panel desplegable en móvil), header con título de la ruta y área de contenido. Página 404. Los módulos futuros aparecen como "Pronto", sin enlace.
- [x] Modo claro y oscuro: tokens en `styles.css`, preferencia en `localStorage` o del sistema, y script en `index.html` contra el destello inicial.
- [x] La página de inicio muestra el estado de `/api/health` con TanStack Query, valida la forma de la respuesta y ofrece "Reintentar" ante error.
- [x] Scripts: `lint` (ESLint sin avisos + Prettier), `typecheck`, `test` (Vitest), `test:integration` (las pruebas Node de NMX-001, ahora en `tests/integration/`), `format`.
- [x] `make lint`/`test` y `nomix.ps1` ejecutan typecheck, Vitest y las pruebas de integración.
- [x] Documentación: `README.md` y sección "Frontend (NMX-003)" en `docs/nomix/08_entorno_local.md`.

**Pruebas**

- [x] `npm run build`, `npm run lint`, `npm run typecheck` y `npm test` (15 pruebas en 4 archivos) pasan.
- [x] Revisión visual en Chrome: modo claro, modo oscuro, vista móvil de 375 px con menú abierto y estado "Conexión establecida". Consola sin errores ni avisos.
- [x] Al final de la revisión se borró la preferencia de tema guardada en el navegador.

**Publicación, revisión e integración**

- [x] Commit `3e09b72` en `nmx-003-frontend-base`.
- [x] Primera revisión cruzada de Codex sobre `3e09b72` (local, `tmp/nmx-003-review.md`): cambios solicitados con 3 hallazgos P2.
- [x] Correcciones aplicadas (ver "Ronda de revisión 1").
- [x] Segunda revisión de Codex sobre `925bb9f` (`tmp/nmx-003-review-925bb9f.md`): los 3 hallazgos anteriores quedaron resueltos y hay 1 nuevo P2.
- [x] Corrección aplicada (ver "Ronda de revisión 2").
- [x] Tercera revisión de Codex sobre `e215155`: aprobado.
- [x] Push y [PR #3](https://github.com/ba2sai/nomix/pull/3) contra `nmx-002-backend-base`.
- [x] Integrado en `main` con la cadena H0 (merge `a57cd5e`), con el CI en verde.

**Ronda de revisión 1 (Codex)**

| Hallazgo | Resolución |
|---|---|
| P2: `npm run lint` falla tras un checkout en Windows con `core.autocrlf=true` (Prettier exige LF y Git entregaba CRLF) | `.gitattributes` pasa a `* text=auto eol=lf`. Verificado con un worktree nuevo en esta máquina, que tiene `autocrlf=true`. |
| P2: el menú móvil no movía ni contenía el foco, no cerraba con Escape ni devolvía el foco | Nuevo `Sheet` de shadcn sobre `@radix-ui/react-dialog` 1.2. El botón del header es su `SheetTrigger`. 4 pruebas nuevas de teclado: foco inicial y contenido con Tab/Shift+Tab, fondo inerte, Escape, botón Cerrar y cierre al navegar. Revisado también en Chrome. |
| P2: React 19 contradecía el stack aceptado (D-02 decía React 18) | El dueño del producto aprobó React 19. Se registró como D-13 en `00_decisiones_stack_nomix.md` y se actualizaron el resumen y D-02. |

Además, se eliminó un aviso de Vite: `vitest.config.ts` importa `./vite.config.ts` con extensión, como pedirá el cargador nativo de configuración.

**Ronda de revisión 2 (Codex)**

| Hallazgo | Resolución |
|---|---|
| P2: al ampliar a escritorio (≥ 768 px) con el menú abierto, `md:hidden` ocultaba el panel pero el diálogo seguía abierto en modo modal: fondo sin punteros ni scroll y fuera del árbol de accesibilidad | Nuevo hook `useOnMediaQueryMatch`: `AppLayout` escucha `(min-width: 768px)` y cierra el menú al entrar en escritorio, y cancela la suscripción al desmontarse. Se cierra desde el listener, sin efectos que observen el estado. 2 pruebas nuevas con un simulador de `matchMedia`: cierre, liberación de punteros, scroll y accesibilidad, sin reapertura al volver a móvil, y limpieza de la suscripción. Ambas fallan si se quita el hook. En Chrome, al ampliar un iframe de 375 a 1024 px, se libera el fondo. |

Lección: en Windows, Vite dentro de Docker no detecta los cambios sin `VITE_USE_POLLING=true`. Antes de revisar en el navegador hay que reiniciar `frontend` o activar el polling.

**Notas para tickets siguientes**

- Los tipos de la API se generarán desde OpenAPI (`openapi-typescript`) cuando exista el contrato. Hoy `health` se valida a mano.
- React Hook Form + Zod y Playwright se incorporan con el primer formulario (NMX-026) y con H3, respectivamente.

### NMX-005 — Money y PayPeriod (7 de octubre de 2026)

**Implementación**

- [x] Rama `nmx-005-money-value-object`, encadenada sobre `nmx-003-frontend-base`.
- [x] `brick/math` 1.0. `Money`: creación desde string decimal o entero (rechaza notación científica, comas y `float`), `plus`, `minus`, `multipliedBy` exactas, `dividedBy` y `round` según `RoundingPolicy`, comparaciones y serialización a string de 2 decimales que exige redondeo previo.
- [x] `RoundingPolicy` (RULE-080, `PENDIENTE`) sin valores por defecto en el código; modos `HALF_UP`, `HALF_EVEN`, `HALF_DOWN`, `UP` y `DOWN`. Los valores se cargarán desde `parametros_legales` en NMX-006.
- [x] `PayPeriod`: quincenas, bisemanas y meses con fechas inclusivas en medianoche UTC, `days()`, `contains()` y partida del XIII mes (RULE-030) mediante `ThirteenthMonthInstallment`.
- [x] Pruebas de mutación con Pest Mutate (`composer mutate`, incluido en `make test`), 100% exigido. PCOV 1.0.12 añadido a la imagen PHP.
- [x] Prueba de arquitectura que obliga a declarar con `mutates()` cada clase de `app/Domain` con código.
- [x] Documentación: `05` §4, criterio de NMX-005 en `07` y sección "Dominio: Money y PayPeriod" en `08`.

**Pruebas**

- [x] Criterios: `0.1 + 0.2 = 0.30` exacto; `1,234.56 × 9.75% = 120.37`; la quincena de febrero termina el 29 en 2024 y 2028; mutación con 0 mutantes vivos (144 de 144 detectados).
- [x] También se cubren los casos del catálogo RULE-001 (500.00 → 48.75) y RULE-030 (6,000.00 ÷ 12 → 500.00).
- [x] PHPStan nivel `max` en `Domain` sin errores.

**Decisiones aceptadas en la revisión** (Codex aprobó el PR sin objetarlas)

- [x] **Pest Mutate en lugar de Infection.** El backlog nombraba Infection, pero su versión 0.35 eliminó el adaptador de Pest. El criterio de fondo ("sin mutantes vivos") se cumple.
- [x] **Fechas de las partidas de RULE-030 en código** (`ThirteenthMonthInstallment::endMonth`). Son el calendario legal de la partida, no una tasa, y citan RULE-030. NMX-006 las mantuvo en código.
- [x] **`RoundingPolicy` sin valores por defecto.** Su construcción desde `parametros_legales` quedó para el primer ticket del motor que la necesite (ver NMX-006).

**Publicación, revisión e integración**

- [x] Push y [PR #4](https://github.com/ba2sai/nomix/pull/4) contra `nmx-003-frontend-base`.
- [x] Revisión cruzada de Codex: aprobado (comunicado por el dueño del producto el 7 de octubre de 2026).
- [x] Integrado en `main` con la cadena H0 (merge `a57cd5e`), con el CI en verde.

### Verificación integral de Codex (8 de octubre de 2026)

Informe: `tmp/verificacion-2026-10-08.md`. Commit verificado: `3fd649e` (`nmx-004-ci`). **Resultado: la base implementada pasa; sin fallos funcionales bloqueantes en el alcance comprobado.**

- [x] Instalación desde cero en un worktree y un proyecto Compose independientes, con claves nuevas y puertos alternativos. Todos los servicios saludables.
- [x] `make lint` y `make test` completos, con código de salida 0. Pest 131 pruebas y 314 aserciones; Vitest 20 pruebas; 2 pruebas de integración; build correcto.
- [x] Mutación: 144 mutantes, puntuación 100% y sin supervivientes. La ejecución completa registró un timeout puntual en el mutante `078f041cf79e915b` (`ThirteenthMonthInstallment.php`, línea 78); repetido de forma aislada, quedó probado sin timeout.
- [x] Cobertura de líneas de `app/Domain`: 100%. La primera medición dio 98,9% porque el filtro de la configuración base incluía además `AppServiceProvider`; con un alcance limitado a `app/Domain` marca 100%.
- [x] PostgreSQL con RLS real, Redis, Mailpit y Horizon (con un trabajo real procesado). Composer y npm sin vulnerabilidades conocidas.
- [x] Contraste independiente: `1234.56 × 0.0975 = 120.369600` y, con HALF_UP, `120.37`. Coincide con el catálogo; no convierte RULE-080 en una regla validada.
- [x] Contraste con el stack, la arquitectura, los criterios del backlog y las reglas RULE-001, RULE-030 y RULE-080. React 19 coincide con D-13.
- [x] Verificado en GitHub: el CI en verde del commit y el CI en rojo de la demostración.

**Límites que reconoce el informe:** las pruebas RLS verifican infraestructura y roles con una tabla efímera y no sustituyen las pruebas de aislamiento de los futuros endpoints de negocio. No hubo revisión visual nueva en navegador, y el flujo E2E completo de nómina sigue pendiente del hito correspondiente. RULE-080 continúa `PENDIENTE`.

**Pendiente derivado:** acotar la cobertura a `app/Domain` en la configuración de Pest cuando se exija el 100% en un paso del CI. Hoy el 100% se comprueba con la mutación, no con un umbral de cobertura.

### NMX-004 — Integración continua (8 de octubre de 2026)

**Implementación**

- [x] `.github/workflows/ci.yml`: se ejecuta en cada `pull_request` (cualquier base, por los PRs encadenados), en cada push a `main` y con `workflow_dispatch`. Cancela ejecuciones obsoletas del mismo PR.
- [x] Repite la secuencia local sobre Docker Compose: `make env` (secretos efímeros), imagen PHP con caché de GitHub Actions, PostgreSQL 16, Redis y Mailpit, y luego `make setup`, `make lint` y `make test` (incluye la mutación de NMX-005). Ante un fallo publica los registros de los servicios; siempre apaga el entorno y borra los volúmenes.
- [x] Seguridad: `permissions: contents: read`, checkout sin credenciales persistidas y acciones fijadas por SHA (`actions/checkout` v7.0.1, `docker/setup-buildx-action` v4.4.1, `docker/build-push-action` v7.4.0).
- [x] Documentación: sección "Integración continua" en `08` y `README.md`.

**Pruebas locales**

- [x] `actionlint` sin errores.
- [x] Simulación en un worktree limpio, con otro proyecto de Compose y otros puertos para no tocar el entorno de desarrollo: construcción, `setup`, `lint` y `test` en verde en 2,1 minutos.
- [x] Criterio de aceptación en local: una variable sin uso hace fallar `lint` (ESLint) y una prueba Pest fallida hace fallar `test`; ambas terminan con código distinto de cero.

**Verificación en GitHub (8 de octubre de 2026)**

- [x] Push y [PR #5](https://github.com/ba2sai/nomix/pull/5) contra `nmx-005-money-value-object`. [CI #1](https://github.com/ba2sai/nomix/actions/runs/37775752854) en **verde** en 5 min 51 s: imagen PHP, `setup`, lint, Pest (131), mutación al 100%, RLS, Horizon, Vitest, integración y build.
- [x] Demostración del criterio de aceptación: [PR #6](https://github.com/ba2sai/nomix/pull/6) (borrador, con una variable sin uso añadida a propósito). [CI #2](https://github.com/ba2sai/nomix/actions/runs/37775991435) en **rojo**: falló en el paso de lint (`'demoUnused' is assigned a value but never used`, ESLint), las pruebas no se ejecutaron y el entorno se apagó igualmente.
- [x] PR #6 cerrado sin fusionar y rama `nmx-004-ci-demo-rojo` borrada del remoto y del equipo local.
- [x] Revisión de Codex sobre `f97f40f` (`tmp/revision-pr-5.md`): aprobado, sin hallazgos bloqueantes.
- [x] Integrado en `main` con la cadena H0 (merge `a57cd5e`), con el CI en verde en `f97f40f`.
- [ ] Proteger `main` exigiendo el check **CI / Lint y pruebas** (configuración del dueño del repositorio). Codex no pudo comprobar si ya está protegida: la API respondió 403. Sigue pendiente (ver §4).

**Mejora opcional:** `docker/build-push-action` sube en cada ejecución un artefacto con el registro de construcción de Docker (sin secretos). Se desactiva con `DOCKER_BUILD_RECORD_UPLOAD: false`.

**Histórico:** los PRs #1 a #5 no ejecutaban el CI mientras el workflow solo existía en `nmx-004-ci`. Desde la integración de la cadena H0, el check corre en todos los PRs.

### NMX-006 — Parámetros legales con vigencia (8 de octubre de 2026)

**Implementación**

- [x] Rama `nmx-006-parametros-legales`, encadenada sobre `nmx-004-ci`.
- [x] Migración `parametros_legales` (tabla global, sin `empresa_id` ni RLS, según `06` §3): `EXCLUDE USING gist` sobre `(codigo, daterange(vigente_desde, vigente_hasta, '[]'))`, índice único `(codigo, vigente_desde) NULLS NOT DISTINCT` y `CHECK` de formato de `rule_id`, estados admitidos, "valor o tabla" y orden de fechas. `vigente_desde` pasa a nullable ("desde antes de lo documentado").
- [x] Dominio `App\Domain\Shared\Legal`: `LegalParameters` (parámetros vigentes a una fecha; `value()`, `table()`, `get()`, `all()`), `LegalParameter`, `LegalParameterCode` (31 códigos, cada uno cita su regla), `VerificationStatus`, `LegalParametersRepository::forDate()` y `LegalParameterException`. Sin `float`: los valores son strings decimales.
- [x] Infraestructura: `DatabaseLegalParametersRepository` y `LegalParameterRecord` (sin cast `decimal`, que pasa por `float`), enlazados en `AppServiceProvider`.
- [x] `ParametrosLegalesSeeder`: 34 filas con **todos** los valores del catálogo `04` (RULE-001 a 007, 010 a 012, 020 a 022, 030, 040, 050 a 052 y 080), con su estado y su fuente. Idempotente. `make setup` y el CI ejecutan `migrate --seed` con el rol de migraciones.
- [x] `PayPeriod::thirteenthMonthInstallments()` deja de usar un bucle `while` (commit aparte, `refactor(nmx-005)`): bajo el mutante de `next()` el bucle no terminaba y la mutación lo detectaba solo por tiempo, que es el timeout que Codex vio en su verificación. Un período dura como máximo un mes, así que toca a lo sumo la partida del inicio y la del fin.
- [x] Documentación: `04` §0.2 (el seeder refleja el catálogo), `06` (restricciones y nullable) y `08` (sección "Parámetros legales").

**Pruebas**

- [x] Criterios de aceptación: `forDate('2026-10-15')` → `0.132500`, `forDate('2027-03-01')` → `0.142500` y `forDate('2025-03-31')` → `0.122500`, más los bordes 2025-04-01, 2027-02-28 y 2029-03-01. La BD rechaza dos vigencias cruzadas (`parametros_legales_vigencia_sin_cruce`), también una abierta. Pedir un parámetro sin vigencia lanza `LegalParameterException` con el código y la fecha.
- [x] 18 pruebas contra PostgreSQL real con el rol de aplicación, revertidas por transacción (`DatabaseTransactions`; `RefreshDatabase` no sirve porque ese rol no puede crear tablas). Comprueban además que todos los códigos del enum están sembrados, las `CHECK`, la idempotencia del seeder y que ningún parámetro está `VALIDADO`.
- [x] Pruebas de dominio con mutación al 100%. Los mutantes que agotan el tiempo en la corrida completa cambian de una corrida a otra y, ejecutados uno a uno, quedan detectados sin agotar el tiempo: es carga de la máquina.
- [x] `$this->seed()` de Laravel exige Mockery, que no está instalado; las pruebas ejecutan el seeder directamente desde el contenedor.

**Decisiones aceptadas en la revisión** (Codex aprobó el PR sin hallazgos bloqueantes; las que dejan trabajo posterior lo indican)

- [x] `vigente_desde` nullable (`06` lo tenía obligatorio): el catálogo no documenta el inicio de varias tasas (p. ej. la patronal histórica de 12.25%) y poner una fecha sería inventarla.
- [x] `ISR_GASTOS_REPRESENTACION_TARIFA` vigente desde `2010-07-01`: el catálogo dice "julio de 2010"; se tomó el día 1 y queda anotado en `fuente`. La fecha exacta entra en la validación legal (§5).
- [x] RULE-007 se siembra solo como rango de referencia (`RIESGO_PROFESIONAL_TASA_MINIMA/MAXIMA`, `PARCIAL`); la tasa real es por empresa (H2). RULE-060 no se siembra: es la tabla `salarios_minimos`, pendiente de la tabla oficial. RULE-053, 054, 070 y 090 no tienen valores numéricos.
- [x] `jsonb` no conserva el orden de las claves: las tablas (`tramos`) se leen por clave, nunca por posición. Los números dentro de las tablas van como string.
- [x] El calendario de partidas del XIII mes sigue en código (`ThirteenthMonthInstallment`), como quedó abierto en NMX-005; solo se siembra `XIII_DIVISOR`.
- [x] `RoundingPolicy` (NMX-005) todavía no se construye desde `REDONDEO_POLITICA`. **Trabajo posterior:** lo hará el primer ticket del motor que la necesite. Resuelto en NMX-010 (`RoundingRule::from`).
- [x] El rol de aplicación conserva DML sobre `parametros_legales` por los privilegios por defecto. **Trabajo posterior:** revocar `INSERT/UPDATE/DELETE` a ese rol, de modo que solo el migrador cambie tasas, queda propuesto para NMX-024 o NMX-091.

**Publicación, revisión e integración**

- [x] Commits `c3ef9d9` (refactor de NMX-005) y `3da0cb3`, push y [PR #7](https://github.com/ba2sai/nomix/pull/7) contra `nmx-004-ci`. Es el primer PR que ejecuta el CI con migración y seeder: [CI #4](https://github.com/ba2sai/nomix/actions) en verde en 5 min 9 s.
- [x] Revisión de Codex sobre `b61b06d` (`tmp/revision-pr-7.md`): aprobado, sin hallazgos bloqueantes.
- [x] Integrado en `main` (merge `56527c4`), con el CI en verde en `b61b06d`.

### NMX-010 — Contratos del motor de nómina (9 de octubre de 2026)

Primer ticket de H1. Lo implementó Claude; la revisión técnica es de Codex si está disponible (AGENTS.md §5).

**Implementación**

- [x] Rama `nmx-010-contratos-motor`, encadenada sobre `docs-flujo-desarrollador-unico` (PR #8) para no chocar en `TODO.md`.
- [x] `App\Domain\Shared\Rules`:
  - `RuleTrace`: `calculated()` siempre cita su `RULE-xxx` y redondea con RULE-080; `entered()` es para montos sin regla, como una novedad.
  - `TraceInput`: entrada de tipo monto, cantidad o parámetro legal. Las entradas sensibles salen sin valor en `toArray()`.
  - `RoundingRule`: construye la política desde `REDONDEO_POLITICA` y conserva el parámetro, así que toda traza que redondea queda marcada como pendiente mientras RULE-080 lo esté.
- [x] `App\Domain\Payroll\Input`: `PayrollInput`, `EmployeeSnapshot`, `EmployerSnapshot`, `Novelty` y `NoveltyType`, `WorkShift`. La periodicidad del colaborador debe coincidir con la del período; período y fecha de pago van por separado ("mes de cuota" de RULE-002, pendiente).
- [x] `App\Domain\Payroll\Result`:
  - `LineItem`: su monto es el resultado de la traza; nunca es negativo y cabe en 2 decimales.
  - `Concept` → `Category`.
  - `PayrollResult`: totales de `planilla_colaboradores` sumados desde líneas redondeadas, avisos, `pendingParameterCodes()`, `allowsProduction()` y `toArray()`.
- [x] `Money::fitsScale()` y `Money::toDecimalString()`, para validar escalas y mostrar valores exactos en las trazas.
- [x] Pendiente heredado de H0 resuelto: `RoundingPolicy` ya se construye desde `parametros_legales` (`RoundingRule::from`).
- [x] Pruebas sin base de datos:
  - `Database\Seeders\CatalogoLegal` concentra las filas del catálogo; `ParametrosLegalesSeeder` las carga.
  - `tests/Support/LegalCatalog::forDate()` arma `LegalParameters` en memoria con esas mismas filas.
  - `tests/Support/Parameters` crea parámetros a medida.
- [x] `composer coverage` (`phpunit.domain.xml`): suite `Unit` solo sobre `app/Domain`, mínimo 100%. Incluido en `make test`, `nomix.ps1` y, por tanto, en el CI. Resuelve el pendiente derivado de la verificación de Codex.
- [x] Documentación: `05` §2.1, `06` (`concepto` y `traza`) y `08` (sección "Motor de nómina: contratos").

**Pruebas**

- [x] Pest: 350 pruebas, 777 aserciones. Las de BD de NMX-006 siguen en verde tras separar el catálogo del seeder.
- [x] Cobertura de `app/Domain`: 100%.
- [x] Mutación: 415 de 415 mutantes detectados. Se ajustaron 3 pruebas cuyos montos también cabían en 1 decimal. `PayrollResult::pendingParameterCodes()` se reescribió con `array_unique` para eliminar un mutante equivalente.
- [x] PHPStan nivel 8 y `max` en `Domain`, Pint: sin errores.

**Decisiones a validar**

- [ ] `RuleTrace` admite `ruleId` nulo solo vía `entered()`, para montos que no salen de una regla. Un cálculo legal siempre cita su regla.
- [ ] El salario del período (quincena, prorrateos) aún no tiene regla en el catálogo: preguntas 4.6 a 4.8 del cuestionario al contador. Se resolverá en NMX-016 sin inventar la regla.
- [ ] Los totales no corrigen un neto negativo; lo resolverá la prioridad de descuentos (RULE-070, NMX-015).
- [ ] La traza serializada guarda montos de líneas en claro (decisión 1 de `06` §6), pero nunca el salario base como entrada.

**Publicación, revisión e integración**

- [x] Push y [PR #9](https://github.com/ba2sai/nomix/pull/9) contra `docs-flujo-desarrollador-unico`; se reorienta a `main` cuando se integre el PR #8. CI #9 en verde en 2 min 25 s sobre `928e641`, con el paso nuevo de cobertura.
- [x] Revisión técnica de Codex sobre `e230684` (`tmp/revision-pr-9.md`): requiere cambios, con 3 hallazgos (R1 a R3). La suite existente pasaba; las pruebas independientes del revisor fallaban en 3 de 11 casos.
- [x] Hallazgos corregidos (ver "Ronda de revisión 1").
- [x] Push de las correcciones: [CI #12](https://github.com/ba2sai/nomix/actions/runs/38061280033) en verde sobre `7354f75` (3 min 8 s). El PR #8 también, con el [CI #11](https://github.com/ba2sai/nomix/actions/runs/38061277726) en verde sobre `a8bbc2d`.
- [ ] Integración por el responsable, después del PR #8.

**Ronda de revisión 1 (Codex)**

| Hallazgo | Resolución |
|---|---|
| R1 · P1: el error de validación de `EmployeeSnapshot` incluía el salario base (p. ej. `4321.675`), que podía acabar en un log | Nuevo `PayrollException::salaryNotRounded()`, sin el monto. La prueba que exigía el importe en el mensaje ahora comprueba que no aparece ni en el mensaje ni en la pila de llamadas. |
| R2 · P2: `json_encode(TraceInput)` sacaba el valor de una entrada sensible, porque `value` es público y solo `toArray()` lo ocultaba | `TraceInput` y `RuleTrace` implementan `JsonSerializable` y `__debugInfo()` con la forma de `toArray()`. Revisando los snapshots apareció el mismo problema en `EmployeeSnapshot`: `Money` es `JsonSerializable`, así que el salario salía en claro. Ahora también se serializa sin él. Pruebas con `json_encode`, `print_r` y `var_dump` de `TraceInput`, `RuleTrace`, `EmployeeSnapshot` y `PayrollInput`. |
| R3 · P2: al deduplicar por código, una versión `VALIDADO` ocultaba otra `PENDIENTE` del mismo parámetro, y la traza permitía producción | `RuleTrace` rechaza dos versiones distintas del mismo código (`RuleTraceException::conflictingParameter`), en cualquier orden y también contra el parámetro de redondeo. El mismo parámetro repetido se sigue aceptando: `LegalParameter::equals()` compara código, regla, valor o tabla, vigencia, estado y fuente. |

Además:

- Las 11 pruebas independientes de Codex quedan como regresión en `tests/Legal/PayrollContractsTest.php`. La de R3 se adaptó a la corrección elegida: espera el rechazo en vez de un resultado.
- `composer mutate` desactiva el límite de 300 s de Composer. En el entorno de Codex la mutación superó ese límite y cortó el primer `make test`, aunque en el CI pasaba.

### NMX-011 — Cuotas de CSS, SE y Riesgos Profesionales (10 de octubre de 2026)

Segundo ticket de H1: RULE-001, 002, 005, 006 y 007. Lo implementó Claude; la revisión técnica es de Codex si está disponible.

**Pruebas legales primero (AGENTS.md, flujo 6)**

- [x] Sin otro agente disponible, los casos se derivaron directamente del catálogo (`04` §1) y se publicaron en un commit propio, `e21e921`, antes de escribir las reglas. Fallaban porque las clases no existían.
- [x] `tests/Legal/SocialSecurityContributionsTest.php`: RULE-001 (500.00 → 48.75; 1,234.56 → 120.3696 → 120.37), RULE-002 (500.00 → 66.25 en octubre de 2026, 71.25 en marzo de 2027 y 61.25 en marzo de 2025), RULE-005 (500.00 → 6.25), RULE-006 (500.00 → 7.50) y RULE-007 (500.00 con tasa 2.10% → 10.50). Además, ninguna cuota habilita producción mientras el catálogo no esté `VALIDADO`.
- [x] Recalculados a mano: 500 × 0.0975 = 48.75; 1,234.56 × 0.0975 = 120.3696; 500 × 0.1325 = 66.25; 500 × 0.1425 = 71.25; 500 × 0.1225 = 61.25; 500 × 0.0125 = 6.25; 500 × 0.015 = 7.50; 500 × 0.021 = 10.50.
- [ ] RULE-005 sobre el XIII mes (500.00 → 0.00) queda como `todo`: el XIII se calcula en NMX-050.

**Implementación**

- [x] `App\Domain\Payroll\Rules`: `CssEmployeeRule` (RULE-001), `CssEmployerRule` (RULE-002), `EducationInsuranceEmployeeRule` (RULE-005), `EducationInsuranceEmployerRule` (RULE-006) y `OccupationalRiskRule` (RULE-007). Cada una devuelve un `LineItem` con su traza; comparten `RateContribution` (base gravable × tasa, redondeada con RULE-080).
- [x] La tasa sale de `parametros_legales`, salvo la de Riesgos Profesionales, que es de la empresa (`EmployerSnapshot`).
- [x] La base gravable debe ser cero o positiva y tener 2 decimales como máximo; el error no muestra el monto.
- [x] RULE-007 es `PARCIAL`: su traza incluye el rango de referencia (`RIESGO_PROFESIONAL_TASA_MINIMA` y `_MAXIMA`), así que no habilita producción. `warnings()` avisa, sin bloquear, si la tasa de la empresa queda fuera del rango.
- [x] Documentación: `08` (sección "Motor de nómina: cuotas de CSS, SE y Riesgos Profesionales").

**Pruebas**

- [x] `.\nomix.ps1 lint` y `.\nomix.ps1 test` con código de salida 0.
- [x] Pest: 413 pruebas y 956 aserciones, más 1 `todo` (RULE-005 sobre el XIII mes).
- [x] Mutación: 473 de 473 mutantes detectados (100%).
- [x] Cobertura de `app/Domain`: 100%, incluidas las 6 clases de `Payroll/Rules`.
- [x] PHPStan nivel 8 y `max` en `Domain`, y Pint: sin errores.

**Decisiones a validar**

- [ ] **La base gravable entra ya armada.** Qué conceptos la forman sigue pendiente en RULE-001 (pregunta 2 del cuestionario al contador). Lo resolverá el calculador (NMX-016) sin inventar la composición.
- [ ] **El "mes de cuota" de RULE-002** lo fija quien carga los `LegalParameters` (NMX-016). Las reglas usan la tasa vigente en esa fecha.
- [ ] **Rango de referencia de RULE-007 como aviso, no como error.** El catálogo lo da como aproximado; rechazar una tasa fuera de él sería inventar una restricción.

**Publicación, revisión e integración**

- [ ] Push y PR contra `nmx-010-contratos-motor`; se reorienta a `main` cuando se integre el PR #9.
- [ ] Revisión técnica, CI en verde e integración por el responsable.

## 4. Siguientes pasos inmediatos

**Pendientes actuales**

- [ ] **Proteger `main`:** exigir el check **CI / Lint y pruebas** antes de fusionar (configuración del dueño del repositorio).
- [ ] **Limpieza de la etapa 0:** borrar del remoto las ramas integradas y retirar los worktrees de revisión de `tmp/` (detalle en §1).
- [ ] **Validación legal:** enviar el cuestionario al contador y registrar sus respuestas en el catálogo (ver §5).
- [ ] **NMX-010 — Contratos del motor (H1):** `RuleTrace`, `LineItem`, `PayrollInput` y `PayrollResult`, con redondeo desde `parametros_legales` y cobertura del dominio al 100%. Hallazgos R1 a R3 de Codex corregidos y CI en verde; falta integrar el PR #9, después del #8 (ver §3).
- [ ] **NMX-011 — Cuotas de CSS, SE y Riesgos Profesionales:** implementado y probado; faltan publicación, revisión e integración (ver §3).
- [ ] **H1, etapa 2 (resto):** NMX-012 (tarifa de ISR) y NMX-014 (horas extra), según el [backlog](docs/nomix/07_alcance_mvp_y_backlog.md).

Cada PR se integra según [AGENTS.md](AGENTS.md): revisión técnica independiente cuando esté disponible, revisión del diff por el responsable y check **CI / Lint y pruebas** en verde en el commit exacto, sin aprobación formal de otra cuenta.

**Histórico de H0 (cerrado el 9 de octubre de 2026)**

- [x] **NMX-001 — Monorepo y Docker:** [PR #2](https://github.com/ba2sai/nomix/pull/2), integrado.
- [x] **NMX-002 — Backend:** Pint, PHPStan/Larastan y Pest; `Domain` sin Laravel ni `float`. [PR #1](https://github.com/ba2sai/nomix/pull/1), revisado e integrado.
- [x] **NMX-003 — Frontend:** Tailwind, shadcn/ui, TanStack Query, React Router, ESLint, Prettier y Vitest; sidebar, header y modos claro/oscuro. [PR #3](https://github.com/ba2sai/nomix/pull/3), revisado e integrado.
- [x] **NMX-004 — CI:** lint, pruebas, typecheck y build en GitHub Actions con PostgreSQL real. [PR #5](https://github.com/ba2sai/nomix/pull/5), revisado e integrado; la protección de `main` sigue pendiente (arriba).
- [x] **NMX-005 — Money y PayPeriod:** aritmética exacta, períodos y redondeo configurable, con pruebas de límites y mutación. [PR #4](https://github.com/ba2sai/nomix/pull/4), revisado e integrado.
- [x] **NMX-006 — Parámetros legales:** vigencias, estados de verificación, rechazo de solapamientos y errores ante parámetros ausentes. [PR #7](https://github.com/ba2sai/nomix/pull/7), revisado e integrado.

**Resultado de H0 (cumplido):** entorno reproducible, backend/frontend con herramientas de calidad, CI en verde, objetos monetarios probados y parámetros legales versionados por fecha.

## 5. Decisiones y pendientes que deben resolverse

- [ ] Conseguir un contador o abogado laboral para validar el [catálogo legal](docs/nomix/04_catalogo_reglas_legales.md). El 9 de octubre de 2026 se preparó el cuestionario "Preguntas para el contador — Nomix" (documento compartido en claude.ai): 41 preguntas y 8 valores por confirmar, con la retención de ISR como prioridad. Ninguna regla figura aún como `VALIDADO` en la documentación revisada.
- [ ] Priorizar retención de ISR, bases gravables, conversión de salario por hora, descuentos y redondeo. Las reglas pendientes deben seguir identificadas como tales.
- [ ] Documentar reglas faltantes para salario quincenal, ingreso a mitad de período, ausencias y cambios salariales dentro de una quincena, con casos de prueba y fuentes.
- [ ] Definir cómo conservar entradas históricas cifradas y presentar trazas según permisos sin guardar salario base en claro.
- [ ] Precisar la transición de planilla aprobada a pagada: mantener inmutables los cálculos y definir el registro de pago permitido.
- [ ] Completar el modelo y los tickets de ajustes, historial de parámetros por empresa y saldos/acumulados iniciales para empleados existentes.
- [ ] Elegir el primer banco ACH y conseguir su especificación antes de NMX-041.
- [ ] Definir cuenta AWS, región y dominio antes de la preparación de producción.
- [ ] Preparar históricos y casos de comparación anonimizados para el piloto, fuera del repositorio. Las pruebas del código utilizan datos ficticios.

Estas decisiones pueden gestionarse mientras avanzan H1 y H2; sus bloqueos deben resolverse antes de implementar o habilitar los comportamientos afectados.

## 6. Ruta hasta el MVP

| Orden | Hito | Entrega | Dependencia o puerta de salida |
|---|---|---|---|
| 1 | H0 · Fundación | NMX-001 a 006 | Calidad técnica y CI verificadas |
| 2 | H1 · Motor legal | NMX-010 a 018 | Reglas puras y escenarios contrastados; puede avanzar junto con H2 después de H0 |
| 2 | H2 · Empresas y colaboradores | NMX-020 a 027 | Login/2FA, roles, cifrado, auditoría y aislamiento |
| 3 | H3 · Planilla regular | NMX-030 a 036 | Crear, recalcular, explicar, revisar y aprobar; E2E completo |
| 4 | H4 · Salidas | NMX-040 a 043 | PDF, reportes, correo y ACH de un banco verificados |
| 5 | H5 · Prestaciones | NMX-050 a 053 | XIII mes, vacaciones y liquidaciones; matriz de causales revisada |
| 6 | H6 · Producción | NMX-090 a 095 | Reglas validadas, seguridad, claves, restauración de backups y piloto aprobado |

**Primera demostración funcional:** dos empresas y diez colaboradores ficticios; iniciar sesión, seleccionar empresa, registrar colaboradores, crear una quincena, editar novedades, recalcular un colaborador, inspeccionar fórmulas y aprobar sin permitir cambios posteriores.

IA, WhatsApp, biométricos, n8n, SIPE y ACH multibanco permanecen en el alcance posterior al MVP definido en el backlog.

## 7. Comandos de referencia

```powershell
.\nomix.ps1 up
.\nomix.ps1 setup
.\nomix.ps1 lint
.\nomix.ps1 test
.\nomix.ps1 status
.\nomix.ps1 down
```

Con GNU Make: `make up`, `make setup`, `make lint`, `make test`, `make status` y `make down`.

Direcciones configuradas durante la validación de esta máquina: frontend `http://localhost:5173`, API `http://localhost:8082/api/health` y Mailpit `http://localhost:8025`. PostgreSQL usa el puerto local `5433`. Los puertos alternativos se configuran en `.env`; el ejemplo conserva `8080` y `5432`.

Actualizar este documento al terminar cada ticket, registrando por separado implementación, pruebas, publicación, revisión e integración.
